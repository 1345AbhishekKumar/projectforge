"use server";

import { auth } from "@clerk/nextjs/server";
import { revalidatePath } from "next/cache";
import { createInsforgeServer } from "@/lib/insforge-server";
import { z } from "zod";
import { orgIdSchema } from "@/lib/utils";
import { verifyMembership, verifyAdminOrOwnerRole } from "@/lib/auth-helpers";
import { logger, flushLogsAfterResponse } from "@/lib/logger";
import * as Sentry from "@sentry/nextjs";
import { invalidateTriggerCache } from "@/lib/workflows/cache";

const workflowInputSchema = z.object({
  orgId: orgIdSchema,
  name: z.string().min(3).max(100),
  trigger: z.string().min(1),
  conditions: z.record(z.string(), z.unknown()),
  actions: z.array(
    z.object({
      type: z.string().min(1),
      data: z.record(z.string(), z.unknown()),
    })
  ),
});

const updateWorkflowInputSchema = z.object({
  id: z.string().uuid(),
  orgId: orgIdSchema,
  name: z.string().min(3).max(100).optional(),
  trigger: z.string().min(1).optional(),
  conditions: z.record(z.string(), z.unknown()).optional(),
  actions: z.array(
    z.object({
      type: z.string().min(1),
      data: z.record(z.string(), z.unknown()),
    })
  ).optional(),
  enabled: z.boolean().optional(),
});

export async function createWorkflow(
  orgId: string,
  name: string,
  trigger: string,
  conditions: Record<string, unknown> = {},
  actions: { type: string; data: Record<string, unknown> }[] = []
): Promise<{ success: boolean; data?: { workflowId: string }; error?: string }> {
  const validated = workflowInputSchema.safeParse({ orgId, name, trigger, conditions, actions });
  if (!validated.success) {
    return { success: false, error: validated.error.issues[0].message };
  }

  try {
    const { userId } = await auth();
    if (!userId) return { success: false, error: "Unauthorized" };

    const insforge = createInsforgeServer(userId);

    // Only OWNER or ADMIN can create workflows
    const isAuthorized = await verifyAdminOrOwnerRole(insforge, validated.data.orgId, userId);
    if (!isAuthorized) {
      return { success: false, error: "Only admins or owners can create workflows" };
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
          enabled: true,
        },
      ])
      .select("id")
      .single();

    if (error || !workflow) {
      logger.error({ error, orgId }, "Failed to create workflow");
      return { success: false, error: "Failed to create workflow" };
    }

    // Invalidate the cache to ensure trigger is re-read on the next trigger event
    invalidateTriggerCache(validated.data.orgId);

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
    enabled?: boolean;
  }
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
    const isAuthorized = await verifyAdminOrOwnerRole(insforge, validated.data.orgId, userId);
    if (!isAuthorized) {
      return { success: false, error: "Only admins or owners can update workflows" };
    }

    const updatePayload: Record<string, unknown> = {};
    if (validated.data.name !== undefined) updatePayload.name = validated.data.name;
    if (validated.data.trigger !== undefined) updatePayload.trigger = validated.data.trigger;
    if (validated.data.conditions !== undefined) updatePayload.conditions = validated.data.conditions;
    if (validated.data.actions !== undefined) updatePayload.actions = validated.data.actions;
    if (validated.data.enabled !== undefined) updatePayload.enabled = validated.data.enabled;

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

    revalidatePath("/workflows");
    return { success: true };
  } catch (error) {
    logger.error({ error, id }, "updateWorkflow unexpected error");
    Sentry.captureException(error);
    return { success: false, error: "An unexpected error occurred" };
  } finally {
    flushLogsAfterResponse();
  }
}

export async function deleteWorkflow(
  id: string,
  orgId: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const { userId } = await auth();
    if (!userId) return { success: false, error: "Unauthorized" };

    const insforge = createInsforgeServer(userId);

    const isAuthorized = await verifyAdminOrOwnerRole(insforge, orgId, userId);
    if (!isAuthorized) {
      return { success: false, error: "Only admins or owners can delete workflows" };
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

export async function getWorkflows(
  orgId: string
): Promise<{ success: boolean; data: any[]; error?: string }> {
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

    return { success: true, data: data || [] };
  } catch (error) {
    logger.error({ error, orgId }, "getWorkflows unexpected error");
    Sentry.captureException(error);
    return { success: false, error: "An unexpected error occurred", data: [] };
  } finally {
    flushLogsAfterResponse();
  }
}
