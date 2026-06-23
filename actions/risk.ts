"use server";

import { auth } from "@clerk/nextjs/server";
import { revalidatePath } from "next/cache";
import { createInsforgeServer } from "@/lib/insforge-server";
import { verifyMembership, verifyPermission } from "@/lib/auth-helpers";
import { writeAuditLog } from "@/lib/audit";
import { logger, flushLogsAfterResponse } from "@/lib/logger";
import * as Sentry from "@sentry/nextjs";
import { z } from "zod";
import type { Risk } from "@/types";

const getRisksSchema = z.object({
  orgId: z.string().uuid("Invalid organization ID"),
  projectId: z.string().uuid("Invalid project ID"),
});

import { riskSchema } from "@/lib/schemas/validation";

const upsertRiskSchema = riskSchema.extend({
  orgId: z.string().uuid("Invalid organization ID"),
  id: z.string().uuid("Invalid risk ID").optional(),
  projectId: z.string().uuid("Invalid project ID"),
});

const deleteRiskSchema = z.object({
  orgId: z.string().uuid("Invalid organization ID"),
  projectId: z.string().uuid("Invalid project ID"),
  riskId: z.string().uuid("Invalid risk ID"),
});

/**
 * Fetches all risks for a project.
 */
export async function getProjectRisks(
  orgId: string,
  projectId: string
): Promise<{ success: boolean; data?: Risk[]; error?: string }> {
  try {
    const { userId } = await auth();
    if (!userId) return { success: false, error: "Unauthorized" };

    const validated = getRisksSchema.safeParse({ orgId, projectId });
    if (!validated.success) {
      return { success: false, error: validated.error.issues[0].message };
    }

    const insforge = createInsforgeServer(userId);
    const isMember = await verifyMembership(insforge, orgId, userId);
    if (!isMember) {
      return { success: false, error: "Access denied: Not a member of this workspace" };
    }

    const { data, error } = await insforge.database
      .from("risks")
      .select("*")
      .eq("project_id", projectId)
      .order("created_at", { ascending: false });

    if (error) {
      logger.error({ error, projectId }, "Failed to fetch project risks");
      return { success: false, error: "Failed to fetch risks" };
    }

    return { success: true, data: (data ?? []) as Risk[] };
  } catch (err) {
    logger.error({ error: err, projectId }, "Unexpected error in getProjectRisks");
    Sentry.captureException(err);
    return { success: false, error: "An unexpected error occurred" };
  } finally {
    flushLogsAfterResponse();
  }
}

/**
 * Creates or updates a project risk.
 */
export async function upsertProjectRisk(
  orgId: string,
  risk: {
    id?: string;
    projectId: string;
    title: string;
    probability: "low" | "medium" | "high";
    impact: "low" | "medium" | "high";
    mitigationPlan: string | null;
  }
): Promise<{ success: boolean; data?: Risk; error?: string }> {
  try {
    const { userId } = await auth();
    if (!userId) return { success: false, error: "Unauthorized" };

    const validated = upsertRiskSchema.safeParse({ orgId, ...risk });
    if (!validated.success) {
      return { success: false, error: validated.error.issues[0].message };
    }

    const insforge = createInsforgeServer(userId);

    // Verify project update permissions
    const hasPermission = await verifyPermission(insforge, orgId, userId, "projects", "update");
    if (!hasPermission) {
      return { success: false, error: "Unauthorized: You do not have permission to manage project risks" };
    }

    const isEdit = !!validated.data.id;
    let savedRisk: Risk | null = null;

    if (isEdit) {
      const { data, error } = await insforge.database
        .from("risks")
        .update({
          title: validated.data.title,
          probability: validated.data.probability,
          impact: validated.data.impact,
          mitigation_plan: validated.data.mitigationPlan,
        })
        .eq("id", validated.data.id!)
        .eq("project_id", validated.data.projectId)
        .select()
        .maybeSingle();

      if (error || !data) {
        logger.error({ error, riskId: validated.data.id }, "Failed to update project risk");
        return { success: false, error: "Failed to save project risk" };
      }
      savedRisk = data as Risk;

      // Log in audit trail
      writeAuditLog(orgId, userId, "risk.updated", "risk", savedRisk.id, {
        title: savedRisk.title,
        probability: savedRisk.probability,
        impact: savedRisk.impact,
      });
    } else {
      const { data, error } = await insforge.database
        .from("risks")
        .insert({
          project_id: validated.data.projectId,
          title: validated.data.title,
          probability: validated.data.probability,
          impact: validated.data.impact,
          mitigation_plan: validated.data.mitigationPlan,
        })
        .select()
        .maybeSingle();

      if (error || !data) {
        logger.error({ error }, "Failed to insert project risk");
        return { success: false, error: "Failed to create project risk" };
      }
      savedRisk = data as Risk;

      // Log in audit trail
      writeAuditLog(orgId, userId, "risk.created", "risk", savedRisk.id, {
        title: savedRisk.title,
        probability: savedRisk.probability,
        impact: savedRisk.impact,
      });
    }

    revalidatePath(`/projects/${validated.data.projectId}/risks`);
    revalidatePath(`/projects/${validated.data.projectId}`);

    return { success: true, data: savedRisk };
  } catch (err) {
    logger.error({ error: err, risk }, "Unexpected error in upsertProjectRisk");
    Sentry.captureException(err);
    return { success: false, error: "An unexpected error occurred" };
  } finally {
    flushLogsAfterResponse();
  }
}

/**
 * Deletes a project risk.
 */
export async function deleteProjectRisk(
  orgId: string,
  projectId: string,
  riskId: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const { userId } = await auth();
    if (!userId) return { success: false, error: "Unauthorized" };

    const validated = deleteRiskSchema.safeParse({ orgId, projectId, riskId });
    if (!validated.success) {
      return { success: false, error: validated.error.issues[0].message };
    }

    const insforge = createInsforgeServer(userId);

    // Verify permissions
    const hasPermission = await verifyPermission(insforge, orgId, userId, "projects", "update");
    if (!hasPermission) {
      return { success: false, error: "Unauthorized: You do not have permission to delete project risks" };
    }

    // Fetch details for logging before deleting
    const { data: riskData } = await insforge.database
      .from("risks")
      .select("title")
      .eq("id", riskId)
      .maybeSingle();

    const { error } = await insforge.database
      .from("risks")
      .delete()
      .eq("id", riskId)
      .eq("project_id", projectId);

    if (error) {
      logger.error({ error, riskId }, "Failed to delete project risk");
      return { success: false, error: "Failed to resolve risk" };
    }

    // Log in audit trail
    writeAuditLog(orgId, userId, "risk.deleted", "risk", riskId, {
      title: riskData?.title || "Unknown Risk",
    });

    revalidatePath(`/projects/${projectId}/risks`);
    revalidatePath(`/projects/${projectId}`);

    return { success: true };
  } catch (err) {
    logger.error({ error: err, riskId }, "Unexpected error in deleteProjectRisk");
    Sentry.captureException(err);
    return { success: false, error: "An unexpected error occurred" };
  } finally {
    flushLogsAfterResponse();
  }
}
