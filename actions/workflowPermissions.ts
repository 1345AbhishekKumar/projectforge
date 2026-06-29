"use server";

import { auth } from "@clerk/nextjs/server";
import { createInsforgeServer } from "@/lib/insforge-server";
import { verifyMembership } from "@/lib/auth-helpers";
import { logger, flushLogsAfterResponse } from "@/lib/logger";
import { orgIdSchema } from "@/lib/utils";
import * as Sentry from "@sentry/nextjs";
import { z } from "zod";

const permissionsInputSchema = z.object({
  can_create: z.boolean().optional(),
  can_publish: z.boolean().optional(),
  can_disable: z.boolean().optional(),
  can_retry: z.boolean().optional(),
  can_delete: z.boolean().optional(),
  can_execute: z.boolean().optional(),
  can_view_logs: z.boolean().optional(),
});

export async function getWorkflowPermissions(
  orgId: string,
): Promise<{ success: boolean; data: Record<string, unknown>[]; error?: string }> {
  const validatedOrg = orgIdSchema.safeParse(orgId);
  if (!validatedOrg.success) {
    return { success: false, error: validatedOrg.error.issues[0].message, data: [] };
  }

  try {
    const { userId } = await auth();
    if (!userId) return { success: false, error: "Unauthorized", data: [] };

    const insforge = createInsforgeServer(userId);

    const isMember = await verifyMembership(insforge, validatedOrg.data, userId);
    if (!isMember) {
      return { success: false, error: "Not a member of this workspace", data: [] };
    }

    const { data, error } = await insforge.database
      .from("workflow_permissions")
      .select("*")
      .eq("organization_id", validatedOrg.data);

    if (error) {
      logger.error({ error, orgId }, "Failed to fetch workflow permissions");
      return { success: false, error: "Failed to fetch permissions", data: [] };
    }

    return { success: true, data: data || [] };
  } catch (error) {
    logger.error({ error, orgId }, "getWorkflowPermissions unexpected error");
    Sentry.captureException(error);
    return { success: false, error: "An unexpected error occurred", data: [] };
  } finally {
    flushLogsAfterResponse();
  }
}

export async function updateWorkflowPermissions(
  orgId: string,
  roleName: string,
  updates: z.infer<typeof permissionsInputSchema>,
): Promise<{ success: boolean; error?: string }> {
  const validatedOrg = orgIdSchema.safeParse(orgId);
  const validatedUpdates = permissionsInputSchema.safeParse(updates);

  if (!validatedOrg.success || !validatedUpdates.success) {
    return { success: false, error: "Invalid input parameters" };
  }

  try {
    const { userId } = await auth();
    if (!userId) return { success: false, error: "Unauthorized" };

    const insforge = createInsforgeServer(userId);

    // Only Owner or Admin can update permissions
    const { data: userRole } = await insforge.database
      .from("memberships")
      .select("role")
      .eq("organization_id", validatedOrg.data)
      .eq("user_id", userId)
      .single();

    const isAuthorized = userRole?.role === "OWNER" || userRole?.role === "ADMIN";
    if (!isAuthorized) {
      return { success: false, error: "Only workspace Owners or Admins can modify permissions" };
    }

    const { error } = await insforge.database.from("workflow_permissions").upsert(
      {
        organization_id: validatedOrg.data,
        role_name: roleName,
        ...validatedUpdates.data,
      },
      { onConflict: "organization_id,role_name" },
    );

    if (error) {
      logger.error({ error, orgId, roleName }, "Failed to update workflow permissions");
      return { success: false, error: "Failed to save workflow permissions" };
    }

    return { success: true };
  } catch (error) {
    logger.error({ error, orgId, roleName }, "updateWorkflowPermissions unexpected error");
    Sentry.captureException(error);
    return { success: false, error: "An unexpected error occurred" };
  } finally {
    flushLogsAfterResponse();
  }
}
