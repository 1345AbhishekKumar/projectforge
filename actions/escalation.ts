"use server";

import { auth } from "@clerk/nextjs/server";
import { createInsforgeServer } from "@/lib/insforge-server";
import { logger, flushLogsAfterResponse } from "@/lib/logger";
import { triggerWorkflowEvent } from "@/lib/workflows/engine";
import * as Sentry from "@sentry/nextjs";
import { createNotification } from "@/actions/notification";

/**
 * Checks all tasks in the database and triggers the 'task.overdue' workflow event for overdue ones.
 * Also escalates tasks overdue by >24 hours to department supervisors (managers) or org owner/admin.
 */
export async function checkAndEscalateOverdueTasks(): Promise<{ success: boolean; count: number; error?: string }> {
  try {
    const { userId } = await auth();
    
    // We pass userId (or a fallback like "system") to initialize the server client
    const insforge = createInsforgeServer(userId || "system");

    const now = new Date().toISOString();
    const cutoff24h = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();

    // Fetch all tasks with due dates in the past
    const { data: tasks, error: tasksError } = await insforge.database
      .from("tasks")
      .select("*")
      .not("due_date", "is", null)
      .lt("due_date", now);

    if (tasksError) {
      logger.error({ error: tasksError }, "Failed to fetch overdue tasks for escalation");
      return { success: false, error: "Failed to fetch overdue tasks", count: 0 };
    }

    if (!tasks || tasks.length === 0) {
      return { success: true, count: 0 };
    }

    // Fetch recent TASK_ESCALATION notifications to deduplicate
    const { data: recentNotifs } = await insforge.database
      .from("notifications")
      .select("content")
      .eq("type", "TASK_ESCALATION")
      .gte("created_at", cutoff24h);

    const alreadyEscalatedTaskIds = new Set<string>();
    for (const n of recentNotifs || []) {
      const match = n.content.match(/\[([a-f0-9-]{36})\]/);
      if (match) alreadyEscalatedTaskIds.add(match[1]);
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

      // Determine an acting user ID for RLS context
      const { data: owner } = await insforge.database
        .from("memberships")
        .select("user_id")
        .eq("organization_id", task.organization_id)
        .eq("role", "OWNER")
        .limit(1)
        .maybeSingle();

      const actingUserId = owner?.user_id || task.assignee_id || userId || "system";

      // 1. Trigger the workflow event (for any overdue task)
      await triggerWorkflowEvent(
        "task.overdue",
        { task },
        { userId: actingUserId, orgId: task.organization_id }
      );

      // 2. Supervisor Escalation (only if overdue by > 24 hours and not already escalated recently)
      if (task.due_date && task.due_date < cutoff24h && !alreadyEscalatedTaskIds.has(task.id)) {
        // Resolve Assignee name
        let assigneeName = "Unassigned";
        if (task.assignee_id) {
          const { data: profile } = await insforge.database
            .from("profiles")
            .select("full_name, email")
            .eq("id", task.assignee_id)
            .maybeSingle();
          if (profile) {
            assigneeName = profile.full_name || profile.email;
          }
        }

        // Find Supervisor (manager of the assignee's department, or parent departments)
        let supervisorId: string | null = null;
        if (task.assignee_id) {
          const { data: membership } = await insforge.database
            .from("memberships")
            .select("department_id")
            .eq("organization_id", task.organization_id)
            .eq("user_id", task.assignee_id)
            .maybeSingle();

          if (membership && membership.department_id) {
            let currentDeptId: string | null = membership.department_id;
            const visited = new Set<string>();

            while (currentDeptId && !visited.has(currentDeptId)) {
              visited.add(currentDeptId);
              const { data: dept } = await insforge.database
                .from("departments")
                .select("parent_department_id, manager_id")
                .eq("id", currentDeptId)
                .maybeSingle();

              if (!dept) break;
              if (dept.manager_id) {
                supervisorId = dept.manager_id;
                break;
              }
              currentDeptId = dept.parent_department_id;
            }
          }
        }

        const escalationContent = `🚨 Escalation: Task "[${task.id}]${task.title}" assigned to ${assigneeName} is overdue by more than 24 hours.`;

        if (supervisorId) {
          await createNotification(supervisorId, escalationContent, "TASK_ESCALATION");
        } else {
          // Fallback: Notify organization OWNER and ADMINs
          const { data: admins } = await insforge.database
            .from("memberships")
            .select("user_id")
            .eq("organization_id", task.organization_id)
            .in("role", ["OWNER", "ADMIN"]);

          if (admins && admins.length > 0) {
            for (const admin of admins) {
              await createNotification(admin.user_id, escalationContent, "TASK_ESCALATION");
            }
          }
        }
      }

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
