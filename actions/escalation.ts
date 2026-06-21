"use server";

import { auth } from "@clerk/nextjs/server";
import { createInsforgeServer } from "@/lib/insforge-server";
import { logger, flushLogsAfterResponse } from "@/lib/logger";
import { triggerWorkflowEvent } from "@/lib/workflows/engine";
import * as Sentry from "@sentry/nextjs";

/**
 * Checks all tasks in the database and triggers the 'task.overdue' workflow event for overdue ones.
 */
export async function checkAndEscalateOverdueTasks(): Promise<{ success: boolean; count: number; error?: string }> {
  try {
    const { userId } = await auth();
    
    // We pass userId (or a fallback like "system") to initialize the server client
    const insforge = createInsforgeServer(userId || "system");

    // Fetch all tasks with due dates in the past
    const { data: tasks, error: tasksError } = await insforge.database
      .from("tasks")
      .select("*")
      .not("due_date", "is", null)
      .lt("due_date", new Date().toISOString());

    if (tasksError) {
      logger.error({ error: tasksError }, "Failed to fetch overdue tasks for escalation");
      return { success: false, error: "Failed to fetch overdue tasks", count: 0 };
    }

    if (!tasks || tasks.length === 0) {
      return { success: true, count: 0 };
    }

    let escalatedCount = 0;

    for (const task of tasks) {
      // Get the project's custom statuses to identify the completed status
      const { data: project, error: projError } = await insforge.database
        .from("projects")
        .select("custom_statuses")
        .eq("id", task.project_id)
        .single();

      if (projError || !project) {
        logger.error({ error: projError, projectId: task.project_id }, "Failed to fetch project for overdue task check");
        continue;
      }

      const allowedStatuses = project.custom_statuses || ["TODO", "IN_PROGRESS", "DONE"];
      const completedStatus = allowedStatuses[allowedStatuses.length - 1];

      // Skip completed tasks
      if (task.status === completedStatus) {
        continue;
      }

      // Determine an acting user ID for RLS context (prefer owner, then assignee, then current user)
      const { data: owner } = await insforge.database
        .from("memberships")
        .select("user_id")
        .eq("organization_id", task.organization_id)
        .eq("role", "OWNER")
        .limit(1)
        .maybeSingle();

      const actingUserId = owner?.user_id || task.assignee_id || userId || "system";

      // Trigger the workflow event
      await triggerWorkflowEvent(
        "task.overdue",
        { task },
        { userId: actingUserId, orgId: task.organization_id }
      );

      escalatedCount++;
    }

    return { success: true, count: escalatedCount };
  } catch (error) {
    logger.error({ error }, "checkAndEscalateOverdueTasks unexpected error");
    Sentry.captureException(error);
    return { success: false, error: "An unexpected error occurred", count: 0 };
  } finally {
    flushLogsAfterResponse();
  }
}
