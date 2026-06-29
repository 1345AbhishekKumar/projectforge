"use server";

import { auth } from "@clerk/nextjs/server";
import { createInsforgeServer } from "@/lib/insforge-server";
import { verifyMembership } from "@/lib/auth-helpers";
import { logger, flushLogsAfterResponse } from "@/lib/logger";
import { orgIdSchema } from "@/lib/utils";
import * as Sentry from "@sentry/nextjs";
import { z } from "zod";

const runIdSchema = z.string().uuid();

export async function getWorkflowExecutions(
  orgId: string,
  limit: number = 50,
  offset: number = 0,
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
      .from("workflow_executions")
      .select(
        `
        *,
        workflows (
          name,
          category
        )
      `,
      )
      .eq("organization_id", validatedOrg.data)
      .order("created_at", { ascending: false })
      .range(offset, offset + limit - 1);

    if (error) {
      logger.error({ error, orgId }, "Failed to fetch workflow executions");
      return { success: false, error: "Failed to fetch workflow executions", data: [] };
    }

    return { success: true, data: data || [] };
  } catch (error) {
    logger.error({ error, orgId }, "getWorkflowExecutions unexpected error");
    Sentry.captureException(error);
    return { success: false, error: "An unexpected error occurred", data: [] };
  } finally {
    flushLogsAfterResponse();
  }
}

export async function getExecutionDetails(
  runId: string,
  orgId: string,
): Promise<{
  success: boolean;
  data: Record<string, unknown> | null;
  steps: Record<string, unknown>[];
  error?: string;
}> {
  const validatedRun = runIdSchema.safeParse(runId);
  const validatedOrg = orgIdSchema.safeParse(orgId);

  if (!validatedRun.success || !validatedOrg.success) {
    return { success: false, data: null, steps: [], error: "Invalid parameters" };
  }

  try {
    const { userId } = await auth();
    if (!userId) return { success: false, data: null, steps: [], error: "Unauthorized" };

    const insforge = createInsforgeServer(userId);

    const isMember = await verifyMembership(insforge, validatedOrg.data, userId);
    if (!isMember) {
      return { success: false, data: null, steps: [], error: "Not a member of this workspace" };
    }

    // 1. Fetch execution run details
    const { data: run, error: runError } = await insforge.database
      .from("workflow_executions")
      .select(
        `
        *,
        workflows (
          name,
          category
        )
      `,
      )
      .eq("id", validatedRun.data)
      .eq("organization_id", validatedOrg.data)
      .single();

    if (runError || !run) {
      logger.error({ runError, runId }, "Failed to fetch execution run details");
      return { success: false, data: null, steps: [], error: "Execution run not found" };
    }

    // 2. Fetch steps
    const { data: steps, error: stepsError } = await insforge.database
      .from("workflow_execution_steps")
      .select("*")
      .eq("execution_id", validatedRun.data)
      .order("step_number", { ascending: true });

    if (stepsError) {
      logger.error({ stepsError, runId }, "Failed to fetch execution steps");
      return { success: false, data: null, steps: [], error: "Failed to fetch execution steps" };
    }

    return { success: true, data: run, steps: steps || [] };
  } catch (error) {
    logger.error({ error, runId }, "getExecutionDetails unexpected error");
    Sentry.captureException(error);
    return { success: false, data: null, steps: [], error: "An unexpected error occurred" };
  } finally {
    flushLogsAfterResponse();
  }
}

export async function retryWorkflowExecution(
  runId: string,
  orgId: string,
): Promise<{ success: boolean; error?: string }> {
  const validatedRun = runIdSchema.safeParse(runId);
  const validatedOrg = orgIdSchema.safeParse(orgId);

  if (!validatedRun.success || !validatedOrg.success) {
    return { success: false, error: "Invalid parameters" };
  }

  try {
    const { userId } = await auth();
    if (!userId) return { success: false, error: "Unauthorized" };

    const insforge = createInsforgeServer(userId);

    // Verify permission to retry
    const { data: userRole } = await insforge.database
      .from("memberships")
      .select("role")
      .eq("organization_id", validatedOrg.data)
      .eq("user_id", userId)
      .single();

    const roleName = userRole?.role || "MEMBER";

    const { data: permission } = await insforge.database
      .from("workflow_permissions")
      .select("can_retry")
      .eq("organization_id", validatedOrg.data)
      .eq("role_name", roleName)
      .single();

    if (!permission?.can_retry) {
      return { success: false, error: "You do not have permission to retry executions" };
    }

    // Get execution to retry
    const { data: run, error: runError } = await insforge.database
      .from("workflow_executions")
      .select("*")
      .eq("id", validatedRun.data)
      .eq("organization_id", validatedOrg.data)
      .single();

    if (runError || !run) {
      return { success: false, error: "Execution run not found" };
    }

    if (run.has_payload_deleted) {
      return {
        success: false,
        error: "Cannot retry run: payload snapshot was deleted by retention policy",
      };
    }

    // Trigger engine execution using the saved payload in the background
    const { triggerWorkflowEvent } = await import("@/lib/workflows/engine");

    // Asynchronously call the engine
    triggerWorkflowEvent(run.trigger_event, run.payload_snapshot, {
      userId: run.triggered_by || userId,
      orgId: run.organization_id,
    });

    return { success: true };
  } catch (error) {
    logger.error({ error, runId }, "retryWorkflowExecution unexpected error");
    Sentry.captureException(error);
    return { success: false, error: "An unexpected error occurred" };
  } finally {
    flushLogsAfterResponse();
  }
}

export async function forcePayloadRetentionCleanup(
  orgId: string,
  days: number,
): Promise<{ success: boolean; deletedCount: number; error?: string }> {
  const validatedOrg = orgIdSchema.safeParse(orgId);
  if (!validatedOrg.success) {
    return { success: false, deletedCount: 0, error: "Invalid organization ID" };
  }

  try {
    const { userId } = await auth();
    if (!userId) return { success: false, deletedCount: 0, error: "Unauthorized" };

    const insforge = createInsforgeServer(userId);

    const isMember = await verifyMembership(insforge, validatedOrg.data, userId);
    if (!isMember) {
      return { success: false, deletedCount: 0, error: "Unauthorized access to this workspace" };
    }

    const { runPayloadRetentionCleanup } = await import("@/lib/workflows/engine");
    const { deletedCount } = await runPayloadRetentionCleanup(userId, days);

    return { success: true, deletedCount };
  } catch (error) {
    logger.error({ error, orgId }, "forcePayloadRetentionCleanup unexpected error");
    Sentry.captureException(error);
    return { success: false, deletedCount: 0, error: "An unexpected error occurred" };
  } finally {
    flushLogsAfterResponse();
  }
}
