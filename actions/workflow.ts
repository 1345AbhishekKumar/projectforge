"use server";

import { auth } from "@clerk/nextjs/server";
import { after } from "next/server";
import { revalidatePath } from "next/cache";
import { createInsforgeServer } from "@/lib/insforge-server";
import { writeAuditLog } from "@/lib/audit";
import { z } from "zod";
import { orgIdSchema } from "@/lib/utils";
import { verifyMembership, verifyPermission } from "@/lib/auth-helpers";
import { logger, flushLogsAfterResponse } from "@/lib/logger";
import * as Sentry from "@sentry/nextjs";
import { invalidateTriggerCache } from "@/lib/workflows/cache";

const workflowInputSchema = z.object({
  orgId: orgIdSchema,
  name: z.string().min(3).max(100),
  trigger: z.string().min(1),
  category: z.string().optional().default("General"),
  conditions: z.record(z.string(), z.unknown()),
  actions: z.array(
    z.object({
      type: z.string().min(1),
      data: z.record(z.string(), z.unknown()),
    }),
  ),
});

const updateWorkflowInputSchema = z.object({
  id: z.string().uuid(),
  orgId: orgIdSchema,
  name: z.string().min(3).max(100).optional(),
  trigger: z.string().min(1).optional(),
  category: z.string().optional(),
  status: z.enum(["DRAFT", "ACTIVE", "ARCHIVED"]).optional(),
  conditions: z.record(z.string(), z.unknown()).optional(),
  actions: z
    .array(
      z.object({
        type: z.string().min(1),
        data: z.record(z.string(), z.unknown()),
      }),
    )
    .optional(),
  enabled: z.boolean().optional(),
});

export async function createWorkflow(
  orgId: string,
  name: string,
  trigger: string,
  conditions: Record<string, unknown> = {},
  actions: { type: string; data: Record<string, unknown> }[] = [],
  category: string = "General",
): Promise<{ success: boolean; data?: { workflowId: string }; error?: string }> {
  const validated = workflowInputSchema.safeParse({
    orgId,
    name,
    trigger,
    conditions,
    actions,
    category,
  });
  if (!validated.success) {
    return { success: false, error: validated.error.issues[0].message };
  }

  try {
    const { userId } = await auth();
    if (!userId) return { success: false, error: "Unauthorized" };

    const insforge = createInsforgeServer(userId);

    // Only OWNER or ADMIN can create workflows
    const isAuthorized = await verifyPermission(
      insforge,
      validated.data.orgId,
      userId,
      "workflows",
      "create",
    );
    if (!isAuthorized) {
      return {
        success: false,
        error: "Only users with workflow creation permissions can create workflows",
      };
    }

    const { data: workflow, error } = await insforge.database
      .from("workflows")
      .insert([
        {
          organization_id: validated.data.orgId,
          name: validated.data.name,
          trigger: validated.data.trigger,
          conditions: validated.data.conditions,
          actions: validated.data.actions,
          category: validated.data.category,
          enabled: true,
          status: "ACTIVE",
        },
      ])
      .select("id")
      .single();

    if (error || !workflow) {
      logger.error({ error, orgId }, "Failed to create workflow");
      return { success: false, error: "Failed to create workflow" };
    }

    // Auto-create Version 1
    const { data: version, error: verError } = await insforge.database
      .from("workflow_versions")
      .insert([
        {
          organization_id: validated.data.orgId,
          workflow_id: workflow.id,
          version_number: 1,
          trigger: validated.data.trigger,
          conditions: validated.data.conditions,
          actions: validated.data.actions,
          created_by: userId,
        },
      ])
      .select("id")
      .single();

    if (!verError && version) {
      await insforge.database
        .from("workflows")
        .update({ active_version_id: version.id })
        .eq("id", workflow.id);
    }

    // Invalidate the cache to ensure trigger is re-read on the next trigger event
    invalidateTriggerCache(validated.data.orgId);

    after(() =>
      writeAuditLog(validated.data.orgId, userId, "workflow.created", "workflow", workflow.id, {
        name: validated.data.name,
        trigger: validated.data.trigger,
      }),
    );

    revalidatePath("/workflows");
    return { success: true, data: { workflowId: workflow.id } };
  } catch (error) {
    logger.error({ error, orgId }, "createWorkflow unexpected error");
    Sentry.captureException(error);
    return { success: false, error: "An unexpected error occurred" };
  } finally {
    flushLogsAfterResponse();
  }
}

export async function updateWorkflow(
  id: string,
  orgId: string,
  updates: {
    name?: string;
    trigger?: string;
    conditions?: Record<string, unknown>;
    actions?: { type: string; data: Record<string, unknown> }[];
    category?: string;
    status?: "DRAFT" | "ACTIVE" | "ARCHIVED";
    enabled?: boolean;
  },
): Promise<{ success: boolean; error?: string }> {
  const validated = updateWorkflowInputSchema.safeParse({ id, orgId, ...updates });
  if (!validated.success) {
    return { success: false, error: validated.error.issues[0].message };
  }

  try {
    const { userId } = await auth();
    if (!userId) return { success: false, error: "Unauthorized" };

    const insforge = createInsforgeServer(userId);

    // Only OWNER or ADMIN can update workflows
    const isAuthorized = await verifyPermission(
      insforge,
      validated.data.orgId,
      userId,
      "workflows",
      "update",
    );
    if (!isAuthorized) {
      return {
        success: false,
        error: "Only users with workflow update permissions can update workflows",
      };
    }

    // Fetch existing workflow to verify if triggers/actions are changed
    const { data: existingWf, error: fetchError } = await insforge.database
      .from("workflows")
      .select("*")
      .eq("id", validated.data.id)
      .single();

    if (fetchError || !existingWf) {
      return { success: false, error: "Workflow not found" };
    }

    const updatePayload: Record<string, unknown> = {};
    if (validated.data.name !== undefined) updatePayload.name = validated.data.name;
    if (validated.data.trigger !== undefined) updatePayload.trigger = validated.data.trigger;
    if (validated.data.conditions !== undefined)
      updatePayload.conditions = validated.data.conditions;
    if (validated.data.actions !== undefined) updatePayload.actions = validated.data.actions;
    if (validated.data.category !== undefined) updatePayload.category = validated.data.category;
    if (validated.data.status !== undefined) updatePayload.status = validated.data.status;
    if (validated.data.enabled !== undefined) updatePayload.enabled = validated.data.enabled;

    // Check if configuration parameters have changed
    const configChanged =
      (validated.data.trigger !== undefined && validated.data.trigger !== existingWf.trigger) ||
      (validated.data.conditions !== undefined &&
        JSON.stringify(validated.data.conditions) !== JSON.stringify(existingWf.conditions)) ||
      (validated.data.actions !== undefined &&
        JSON.stringify(validated.data.actions) !== JSON.stringify(existingWf.actions));

    if (configChanged) {
      // Find current max version number
      const { data: versions } = await insforge.database
        .from("workflow_versions")
        .select("version_number")
        .eq("workflow_id", validated.data.id)
        .order("version_number", { ascending: false })
        .limit(1);

      const nextVersionNum = versions && versions.length > 0 ? versions[0].version_number + 1 : 1;

      // Insert new version
      const { data: newVersion, error: verError } = await insforge.database
        .from("workflow_versions")
        .insert([
          {
            organization_id: validated.data.orgId,
            workflow_id: validated.data.id,
            version_number: nextVersionNum,
            trigger: validated.data.trigger || existingWf.trigger,
            conditions: validated.data.conditions || existingWf.conditions,
            actions: validated.data.actions || existingWf.actions,
            created_by: userId,
          },
        ])
        .select("id")
        .single();

      if (!verError && newVersion) {
        updatePayload.active_version_id = newVersion.id;
      }
    }

    const { error } = await insforge.database
      .from("workflows")
      .update(updatePayload)
      .eq("id", validated.data.id)
      .eq("organization_id", validated.data.orgId);

    if (error) {
      logger.error({ error, id: validated.data.id }, "Failed to update workflow");
      return { success: false, error: "Failed to update workflow" };
    }

    invalidateTriggerCache(validated.data.orgId);

    after(() =>
      writeAuditLog(
        validated.data.orgId,
        userId,
        "workflow.updated",
        "workflow",
        validated.data.id,
        { changes: updates },
      ),
    );

    revalidatePath("/workflows");
    return { success: true };
  } catch (error) {
    logger.error({ error, id: validated.data.id }, "updateWorkflow unexpected error");
    Sentry.captureException(error);
    return { success: false, error: "An unexpected error occurred" };
  } finally {
    flushLogsAfterResponse();
  }
}

export async function deleteWorkflow(
  id: string,
  orgId: string,
): Promise<{ success: boolean; error?: string }> {
  try {
    const { userId } = await auth();
    if (!userId) return { success: false, error: "Unauthorized" };

    const insforge = createInsforgeServer(userId);

    const isAuthorized = await verifyPermission(insforge, orgId, userId, "workflows", "delete");
    if (!isAuthorized) {
      return {
        success: false,
        error: "Only users with workflow deletion permissions can delete workflows",
      };
    }

    const { error } = await insforge.database
      .from("workflows")
      .delete()
      .eq("id", id)
      .eq("organization_id", orgId);

    if (error) {
      logger.error({ error, id }, "Failed to delete workflow");
      return { success: false, error: "Failed to delete workflow" };
    }

    invalidateTriggerCache(orgId);

    after(() => writeAuditLog(orgId, userId, "workflow.deleted", "workflow", id, {}));

    revalidatePath("/workflows");
    return { success: true };
  } catch (error) {
    logger.error({ error, id }, "deleteWorkflow unexpected error");
    Sentry.captureException(error);
    return { success: false, error: "An unexpected error occurred" };
  } finally {
    flushLogsAfterResponse();
  }
}

export type Workflow = {
  id: string;
  organization_id: string;
  name: string;
  trigger: string;
  conditions: Record<string, unknown>;
  actions: { type: string; data: Record<string, unknown> }[];
  enabled: boolean;
  created_at: string;
};

export async function getWorkflows(
  orgId: string,
): Promise<{ success: boolean; data: Workflow[]; error?: string }> {
  const validated = orgIdSchema.safeParse(orgId);
  if (!validated.success) {
    return { success: false, error: validated.error.issues[0].message, data: [] };
  }

  try {
    const { userId } = await auth();
    if (!userId) return { success: false, error: "Unauthorized", data: [] };

    const insforge = createInsforgeServer(userId);

    const isMember = await verifyMembership(insforge, validated.data, userId);
    if (!isMember) {
      return { success: false, error: "Not a member of this workspace", data: [] };
    }

    const { data, error } = await insforge.database
      .from("workflows")
      .select("*")
      .eq("organization_id", validated.data)
      .order("created_at", { ascending: false });

    if (error) {
      logger.error({ error, orgId: validated.data }, "Failed to fetch workflows");
      return { success: false, error: "Failed to fetch workflows", data: [] };
    }

    return { success: true, data: (data || []) as Workflow[] };
  } catch (error) {
    logger.error({ error, orgId }, "getWorkflows unexpected error");
    Sentry.captureException(error);
    return { success: false, error: "An unexpected error occurred", data: [] };
  } finally {
    flushLogsAfterResponse();
  }
}
