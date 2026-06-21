"use server";

import { auth } from "@clerk/nextjs/server";
import { revalidatePath } from "next/cache";
import { after } from "next/server";
import { createInsforgeServer } from "@/lib/insforge-server";
import { logger, flushLogsAfterResponse } from "@/lib/logger";
import { createNotification } from "@/actions/notification";
import { logActivity } from "@/actions/activity";
import { triggerWorkflowEvent } from "@/lib/workflows/engine";
import * as Sentry from "@sentry/nextjs";

/**
 * Shared helper to notify all members with a specific role.
 */
async function notifyRoleMembers(
  orgId: string,
  roleName: string,
  content: string,
  insforge: ReturnType<typeof createInsforgeServer>
): Promise<void> {
  const { data: memberships, error } = await insforge.database
    .from("memberships")
    .select(`
      user_id,
      role,
      custom_role_id
    `)
    .eq("organization_id", orgId);

  if (error || !memberships) {
    logger.error({ error, orgId }, "Failed to fetch memberships for role notification");
    return;
  }

  const { data: roles } = await insforge.database
    .from("roles")
    .select("id, name")
    .eq("organization_id", orgId);

  const roleIdToName = new Map<string, string>();
  if (roles) {
    for (const r of roles) {
      roleIdToName.set(r.id, r.name);
    }
  }

  const targetUserIds: string[] = [];
  for (const m of memberships) {
    const isDefaultMatch = m.role?.toLowerCase() === roleName.toLowerCase();
    const customRoleName = m.custom_role_id ? roleIdToName.get(m.custom_role_id) : null;
    const isCustomMatch = customRoleName?.toLowerCase() === roleName.toLowerCase();

    if (isDefaultMatch || isCustomMatch) {
      targetUserIds.push(m.user_id);
    }
  }

  const promises = targetUserIds.map((uid) =>
    createNotification(uid, content, "GENERAL")
  );
  await Promise.all(promises);
}

/**
 * Approves the current step in a task's approval chain.
 */
export async function approveTaskStep(
  taskId: string,
  approvalId: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const { userId } = await auth();
    if (!userId) return { success: false, error: "Unauthorized" };

    const insforge = createInsforgeServer(userId);

    // Fetch the target approval record
    const { data: step, error: fetchError } = await insforge.database
      .from("task_approvals")
      .select("*")
      .eq("id", approvalId)
      .eq("task_id", taskId)
      .single();

    if (fetchError || !step) {
      logger.error({ error: fetchError, approvalId }, "Approval step not found");
      return { success: false, error: "Approval step not found" };
    }

    if (step.status !== "PENDING") {
      return { success: false, error: "This approval step is not currently pending" };
    }

    // Verify user has the required role
    const { data: membership } = await insforge.database
      .from("memberships")
      .select("role, custom_role_id")
      .eq("organization_id", step.organization_id)
      .eq("user_id", userId)
      .maybeSingle();

    if (!membership) {
      return { success: false, error: "You are not a member of this workspace" };
    }

    let userRole = membership.role;
    if (membership.custom_role_id) {
      const { data: customRole } = await insforge.database
        .from("roles")
        .select("name")
        .eq("id", membership.custom_role_id)
        .maybeSingle();
      if (customRole) {
        userRole = customRole.name;
      }
    }

    if (userRole.toLowerCase() !== step.role_name.toLowerCase()) {
      return { success: false, error: `Only users with the role "${step.role_name}" can approve this step.` };
    }

    // Update step to APPROVED
    const { error: updateError } = await insforge.database
      .from("task_approvals")
      .update({
        status: "APPROVED",
        approved_by: userId,
        updated_at: new Date().toISOString(),
      })
      .eq("id", approvalId);

    if (updateError) {
      logger.error({ error: updateError, approvalId }, "Failed to approve step");
      return { success: false, error: "Failed to approve step" };
    }

    // Fetch details of the task
    const { data: task, error: taskFetchError } = await insforge.database
      .from("tasks")
      .select("title, project_id, creator_id, assignee_id")
      .eq("id", taskId)
      .single();

    if (taskFetchError || !task) {
      logger.error({ error: taskFetchError, taskId }, "Task not found");
      return { success: false, error: "Task not found" };
    }

    // Check if there is a next step
    const { data: nextStep } = await insforge.database
      .from("task_approvals")
      .select("*")
      .eq("task_id", taskId)
      .eq("step_number", step.step_number + 1)
      .maybeSingle();

    if (nextStep) {
      // Transition next step to PENDING
      const { error: nextUpdateError } = await insforge.database
        .from("task_approvals")
        .update({
          status: "PENDING",
          updated_at: new Date().toISOString(),
        })
        .eq("id", nextStep.id);

      if (nextUpdateError) {
        logger.error({ error: nextUpdateError, nextStepId: nextStep.id }, "Failed to activate next step");
        return { success: false, error: "Failed to activate next step" };
      }

      // Notify users of next step
      await notifyRoleMembers(
        step.organization_id,
        nextStep.role_name,
        `Task "${task.title}" requires your approval (Step ${nextStep.step_number}).`,
        insforge
      );
    } else {
      // No next step: complete approval and unlock task by transitioning status
      const { error: taskUpdateError } = await insforge.database
        .from("tasks")
        .update({
          status: step.target_status,
          updated_at: new Date().toISOString(),
        })
        .eq("id", taskId);

      if (taskUpdateError) {
        logger.error({ error: taskUpdateError, taskId }, "Failed to finalize task status after approval");
        return { success: false, error: "Failed to update task status" };
      }

      await logActivity(step.organization_id, task.project_id, userId, "TASK_STATUS_UPDATED", {
        taskId,
        taskTitle: task.title,
        toStatus: step.target_status,
        reason: "Approval chain completed",
      });

      // Trigger workflow triggers on the updated status
      const { data: updatedTask } = await insforge.database
        .from("tasks")
        .select("*")
        .eq("id", taskId)
        .single();

      if (updatedTask) {
        after(async () => {
          try {
            await triggerWorkflowEvent(
              "task.updated",
              { task: updatedTask },
              { userId, orgId: step.organization_id }
            );
            if (step.target_status === "DONE") {
              await triggerWorkflowEvent(
                "task.completed",
                { task: updatedTask },
                { userId, orgId: step.organization_id }
              );
            }
          } catch (err) {
            logger.error({ error: err }, "Failed to trigger workflows on approval completion");
          }
        });
      }

      // Notify creator/assignee of completion
      const notifyUser = task.assignee_id || task.creator_id;
      if (notifyUser) {
        await createNotification(
          notifyUser,
          `Task "${task.title}" has been approved and moved to "${step.target_status}".`,
          "GENERAL"
        );
      }
    }

    revalidatePath(`/projects/${task.project_id}`);
    return { success: true };
  } catch (error) {
    logger.error({ error, taskId }, "approveTaskStep unexpected error");
    Sentry.captureException(error);
    return { success: false, error: "An unexpected error occurred" };
  } finally {
    flushLogsAfterResponse();
  }
}

/**
 * Rejects the current step in a task's approval chain, unlocking the task and returning to backlog.
 */
export async function rejectTaskStep(
  taskId: string,
  approvalId: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const { userId } = await auth();
    if (!userId) return { success: false, error: "Unauthorized" };

    const insforge = createInsforgeServer(userId);

    // Fetch the target approval record
    const { data: step, error: fetchError } = await insforge.database
      .from("task_approvals")
      .select("*")
      .eq("id", approvalId)
      .eq("task_id", taskId)
      .single();

    if (fetchError || !step) {
      logger.error({ error: fetchError, approvalId }, "Approval step not found");
      return { success: false, error: "Approval step not found" };
    }

    if (step.status !== "PENDING") {
      return { success: false, error: "This approval step is not currently pending" };
    }

    // Verify user has required role
    const { data: membership } = await insforge.database
      .from("memberships")
      .select("role, custom_role_id")
      .eq("organization_id", step.organization_id)
      .eq("user_id", userId)
      .maybeSingle();

    if (!membership) {
      return { success: false, error: "You are not a member of this workspace" };
    }

    let userRole = membership.role;
    if (membership.custom_role_id) {
      const { data: customRole } = await insforge.database
        .from("roles")
        .select("name")
        .eq("id", membership.custom_role_id)
        .maybeSingle();
      if (customRole) {
        userRole = customRole.name;
      }
    }

    if (userRole.toLowerCase() !== step.role_name.toLowerCase()) {
      return { success: false, error: `Only users with the role "${step.role_name}" can reject this step.` };
    }

    // Reject all active and queued steps in the chain
    const { error: rejectError } = await insforge.database
      .from("task_approvals")
      .update({
        status: "REJECTED",
        approved_by: userId,
        updated_at: new Date().toISOString(),
      })
      .eq("task_id", taskId)
      .in("status", ["PENDING", "QUEUED"]);

    if (rejectError) {
      logger.error({ error: rejectError, taskId }, "Failed to reject approval steps");
      return { success: false, error: "Failed to reject approval" };
    }

    // Get task information
    const { data: task, error: taskError } = await insforge.database
      .from("tasks")
      .select("title, project_id, creator_id, assignee_id")
      .eq("id", taskId)
      .single();

    if (taskError || !task) {
      logger.error({ error: taskError, taskId }, "Task not found during rejection");
      return { success: false, error: "Task not found" };
    }

    // Fetch project's custom statuses to find the backlog (first status)
    const { data: project } = await insforge.database
      .from("projects")
      .select("custom_statuses")
      .eq("id", task.project_id)
      .single();

    const allowedStatuses = project?.custom_statuses || ["TODO", "IN_PROGRESS", "DONE"];
    const fallbackStatus = allowedStatuses[0] || "TODO";

    // Reset task status to backlog
    const { error: taskResetError } = await insforge.database
      .from("tasks")
      .update({
        status: fallbackStatus,
        updated_at: new Date().toISOString(),
      })
      .eq("id", taskId);

    if (taskResetError) {
      logger.error({ error: taskResetError, taskId }, "Failed to reset task status after rejection");
      return { success: false, error: "Failed to reset task status" };
    }

    await logActivity(step.organization_id, task.project_id, userId, "TASK_STATUS_UPDATED", {
      taskId,
      taskTitle: task.title,
      toStatus: fallbackStatus,
      reason: `Approval rejected by ${step.role_name}`,
    });

    // Notify assignee / creator
    const notifyUser = task.assignee_id || task.creator_id;
    if (notifyUser) {
      await createNotification(
        notifyUser,
        `Task "${task.title}" was rejected during the "${step.role_name}" approval step and returned to backlog.`,
        "GENERAL"
      );
    }

    revalidatePath(`/projects/${task.project_id}`);
    return { success: true };
  } catch (error) {
    logger.error({ error, taskId }, "rejectTaskStep unexpected error");
    Sentry.captureException(error);
    return { success: false, error: "An unexpected error occurred" };
  } finally {
    flushLogsAfterResponse();
  }
}
