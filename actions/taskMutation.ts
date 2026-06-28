"use server";

import { auth } from "@clerk/nextjs/server";
import { revalidatePath } from "next/cache";
import { after } from "next/server";
import { createInsforgeServer } from "@/lib/insforge-server";
import { z } from "zod";
import type { TaskStatus, TaskPriority } from "@/types";
import { logActivity } from "@/actions/activity";
import { orgIdSchema, projectIdSchema, taskIdSchema } from "@/lib/utils";
import { verifyMembership, verifyPermission } from "@/lib/auth-helpers";
import { logger, flushLogsAfterResponse } from "@/lib/logger";
import * as Sentry from "@sentry/nextjs";
import { triggerWorkflowEvent } from "@/lib/workflows/engine";

const updateTaskInputSchema = z.object({
  taskId: taskIdSchema,
  projectId: projectIdSchema,
  orgId: orgIdSchema,
  updates: z.object({
    title: z.string().min(3, "Title must be at least 3 characters").max(100).optional(),
    description: z.string().max(500).nullable().optional(),
    // Delivery status: always TODO | IN_PROGRESS | DONE
    status: z.enum(["TODO", "IN_PROGRESS", "DONE"]).optional(),
    // Board workflow stage: project-specific
    stage: z.string().min(1).nullable().optional(),
    priority: z.enum(["LOW", "MEDIUM", "HIGH", "URGENT"]).optional(),
    assignee_id: z.string().nullable().optional(),
    due_date: z.string().nullable().optional(),
    sprint_id: z.string().uuid().nullable().optional(),
    board_index: z.number().int().min(0).optional(),
    label_ids: z.array(z.string().uuid()).nullable().optional(),
  }),
});

const deleteTaskInputSchema = z.object({
  taskId: taskIdSchema,
  projectId: projectIdSchema,
  orgId: orgIdSchema,
});

const reorderTasksInputSchema = z.object({
  projectId: projectIdSchema,
  orgId: orgIdSchema,
  taskUpdates: z.array(
    z.object({
      id: taskIdSchema,
      // Board stage for drag-drop column changes
      stage: z.string().min(1).nullable().optional(),
      status: z.enum(["TODO", "IN_PROGRESS", "DONE"]).optional(),
      board_index: z.number().int().min(0),
    })
  ),
});

export async function updateTask(
  taskId: string,
  projectId: string,
  orgId: string,
  updates: {
    title?: string;
    description?: string | null;
    status?: TaskStatus;
    /** Board workflow stage — project-specific */
    stage?: string | null;
    priority?: TaskPriority;
    assignee_id?: string | null;
    due_date?: string | null;
    sprint_id?: string | null;
    board_index?: number;
    label_ids?: string[] | null;
  }
): Promise<{ success: boolean; error?: string }> {
  const validated = updateTaskInputSchema.safeParse({ taskId, projectId, orgId, updates });
  if (!validated.success) {
    console.error("updateTask validation failed:", validated.error.issues);
    return { success: false, error: validated.error.issues[0].message };
  }

  try {
    const { userId } = await auth();
    if (!userId) return { success: false, error: "Unauthorized" };

    const insforge = createInsforgeServer(userId);

    const isAllowed = await verifyPermission(insforge, validated.data.orgId, userId, "tasks", "update");
    if (!isAllowed) {
      return { success: false, error: "You do not have permission to update tasks in this workspace." };
    }

    if (validated.data.updates.assignee_id) {
      const isAssigneeMember = await verifyMembership(insforge, validated.data.orgId, validated.data.updates.assignee_id);
      if (!isAssigneeMember) {
        return { success: false, error: "Assignee is not a member of this workspace" };
      }
    }

    // Retrieve existing task details to check for sprint locking
    const { data: currentTask, error: fetchError } = await insforge.database
      .from("tasks")
      .select("title, assignee_id, status, sprint_id")
      .eq("id", validated.data.taskId)
      .eq("organization_id", validated.data.orgId)
      .single();

    if (fetchError || !currentTask) {
      logger.error({ error: fetchError, taskId: validated.data.taskId }, "Task not found for updating");
      return { success: false, error: "Task not found" };
    }

    // Validate stage change against project's custom_statuses (if stage is changing)
    if (validated.data.updates.stage !== undefined) {
      const { data: projectData, error: projectError } = await insforge.database
        .from("projects")
        .select("custom_statuses")
        .eq("id", validated.data.projectId)
        .eq("organization_id", validated.data.orgId)
        .single();

      if (projectError || !projectData) {
        logger.error({ error: projectError, projectId: validated.data.projectId }, "Project not found for stage validation");
        return { success: false, error: "Failed to validate board stage" };
      }

      if (validated.data.updates.stage !== null && projectData.custom_statuses) {
        const newStage = validated.data.updates.stage;
        if (!projectData.custom_statuses.includes(newStage)) {
          return { success: false, error: `Invalid board stage "${newStage}". Must be one of: ${projectData.custom_statuses.join(", ")}` };
        }

        // Check task approval lock when moving stage
        const { data: pendingApprovals } = await insforge.database
          .from("task_approvals")
          .select("id")
          .eq("task_id", validated.data.taskId)
          .eq("status", "PENDING");

        if (pendingApprovals && pendingApprovals.length > 0) {
          const firstStage = projectData.custom_statuses[0];
          if (newStage === firstStage) {
            // Reverting to first stage cancels pending approvals
            await insforge.database
              .from("task_approvals")
              .update({ status: "REJECTED", updated_at: new Date().toISOString() })
              .eq("task_id", validated.data.taskId)
              .in("status", ["PENDING", "QUEUED"]);
          } else {
            return { success: false, error: "Cannot update board stage: this task is locked pending approval." };
          }
        }

        // Check task dependency blocking if moving to the last stage
        const lastStage = projectData.custom_statuses[projectData.custom_statuses.length - 1];
        if (newStage === lastStage) {
          const { data: blockers, error: blockersError } = await insforge.database
            .from("task_dependencies")
            .select(`source_task:tasks!source_task_id(id, title, status)`)
            .eq("target_task_id", validated.data.taskId);

          if (blockersError) {
            logger.error({ blockersError, taskId: validated.data.taskId }, "Failed to fetch task blockers");
            return { success: false, error: "Failed to validate task dependencies" };
          }

          interface BlockerRow {
            source_task: { id: string; title: string; status: string } | null;
          }

          const activeBlockers = ((blockers as unknown as BlockerRow[]) || [])
            .map((b) => b.source_task)
            .filter((t): t is { id: string; title: string; status: string } => !!t && t.status !== "DONE");

          if (activeBlockers.length > 0) {
            const blockerNames = activeBlockers.map((b) => `"${b.title}"`).join(", ");
            return { success: false, error: `Cannot complete task because it is blocked by: ${blockerNames}` };
          }
        }
      }
    }

    // Enforce Completed Sprint Lock constraints on sprint_id changes
    if (validated.data.updates.sprint_id !== undefined && validated.data.updates.sprint_id !== currentTask.sprint_id) {
      // 1. Verify that the task is not currently inside a completed sprint
      if (currentTask.sprint_id) {
        const { data: oldSprint } = await insforge.database
          .from("sprints")
          .select("status")
          .eq("id", currentTask.sprint_id)
          .eq("organization_id", validated.data.orgId)
          .single();

        if (oldSprint && oldSprint.status === "COMPLETED") {
          return { success: false, error: "Cannot move task out of a completed sprint." };
        }
      }

      // 2. Verify that the target sprint is not completed
      if (validated.data.updates.sprint_id) {
        const { data: newSprint } = await insforge.database
          .from("sprints")
          .select("status")
          .eq("id", validated.data.updates.sprint_id)
          .eq("organization_id", validated.data.orgId)
          .single();

        if (newSprint && newSprint.status === "COMPLETED") {
          return { success: false, error: "Cannot assign task to a completed sprint." };
        }
      }
    }

    if (validated.data.updates.label_ids !== undefined) {
      // First delete existing mappings for this task
      const { error: deleteError } = await insforge.database
        .from("task_label_mappings")
        .delete()
        .eq("task_id", validated.data.taskId);

      if (deleteError) {
        logger.error({ error: deleteError, taskId: validated.data.taskId }, "Failed to delete task label mappings");
        return { success: false, error: "Failed to update task labels" };
      }

      // Then insert new mappings if any
      if (validated.data.updates.label_ids && validated.data.updates.label_ids.length > 0) {
        const mappings = validated.data.updates.label_ids.map((labelId) => ({
          task_id: validated.data.taskId,
          label_id: labelId,
        }));
        const { error: insertError } = await insforge.database
          .from("task_label_mappings")
          .insert(mappings);

        if (insertError) {
          logger.error({ error: insertError, taskId: validated.data.taskId }, "Failed to insert task label mappings");
          return { success: false, error: "Failed to update task labels" };
        }
      }
    }

    const updatePayload: Record<string, unknown> = {
      updated_at: new Date().toISOString(),
    };

    if (validated.data.updates.title !== undefined) {
      updatePayload.title = validated.data.updates.title;
    }
    if (validated.data.updates.description !== undefined) {
      updatePayload.description = validated.data.updates.description;
    }
    if (validated.data.updates.status !== undefined) {
      updatePayload.status = validated.data.updates.status;
    }
    if (validated.data.updates.stage !== undefined) {
      updatePayload.stage = validated.data.updates.stage;
    }
    if (validated.data.updates.priority !== undefined) {
      updatePayload.priority = validated.data.updates.priority;
    }
    if (validated.data.updates.assignee_id !== undefined) {
      updatePayload.assignee_id = validated.data.updates.assignee_id;
    }
    if (validated.data.updates.due_date !== undefined) {
      updatePayload.due_date = validated.data.updates.due_date;
    }
    if (validated.data.updates.sprint_id !== undefined) {
      updatePayload.sprint_id = validated.data.updates.sprint_id;
    }
    if (validated.data.updates.board_index !== undefined) {
      updatePayload.board_index = validated.data.updates.board_index;
    }

    const { data: updatedTask, error } = await insforge.database
      .from("tasks")
      .update(updatePayload)
      .eq("id", validated.data.taskId)
      .eq("organization_id", validated.data.orgId)
      .select("*")
      .single();

    if (error || !updatedTask) {
      logger.error({ error, taskId: validated.data.taskId }, "Failed to update task record");
      if (error && error.message && (error.message.includes("Transition") || error.message.includes("status"))) {
        return { success: false, error: error.message };
      }
      return { success: false, error: "Failed to update task" };
    }

    const taskTitle = validated.data.updates.title || currentTask.title;

    if (validated.data.updates.status === "DONE" && currentTask.status !== "DONE") {
      await logActivity(validated.data.orgId, validated.data.projectId, userId, "TASK_COMPLETED", {
        taskId: validated.data.taskId,
        taskTitle,
      });
    }

    after(async () => {
      try {
        await triggerWorkflowEvent(
          "task.updated",
          { task: updatedTask },
          { userId, orgId: validated.data.orgId }
        );

        if (validated.data.updates.status === "DONE" && currentTask.status !== "DONE") {
          await triggerWorkflowEvent(
            "task.completed",
            { task: updatedTask },
            { userId, orgId: validated.data.orgId }
          );
        }
      } catch (err) {
        logger.error({ error: err }, "Failed to trigger workflows on task update");
      }
    });

    if (validated.data.updates.assignee_id !== undefined && validated.data.updates.assignee_id !== currentTask.assignee_id) {
      if (validated.data.updates.assignee_id) {
        const { data: profile } = await insforge.database
          .from("profiles")
          .select("full_name")
          .eq("id", validated.data.updates.assignee_id)
          .single();
        const assigneeName = profile?.full_name || "Unknown User";

        await logActivity(validated.data.orgId, validated.data.projectId, userId, "TASK_ASSIGNED", {
          taskId: validated.data.taskId,
          taskTitle,
          assigneeId: validated.data.updates.assignee_id,
          assigneeName,
        });
      } else {
        await logActivity(validated.data.orgId, validated.data.projectId, userId, "TASK_UNASSIGNED", {
          taskId: validated.data.taskId,
          taskTitle,
        });
      }
    }

    revalidatePath(`/projects/${validated.data.projectId}`);
    return { success: true };
  } catch (err) {
    logger.error({ error: err, taskId }, "Unexpected error in updateTask Server Action");
    Sentry.captureException(err);
    return { success: false, error: "An unexpected error occurred" };
  } finally {
    flushLogsAfterResponse();
  }
}

export async function deleteTask(
  taskId: string,
  projectId: string,
  orgId: string
): Promise<{ success: boolean; error?: string }> {
  const validated = deleteTaskInputSchema.safeParse({ taskId, projectId, orgId });
  if (!validated.success) {
    return { success: false, error: validated.error.issues[0].message };
  }

  try {
    const { userId } = await auth();
    if (!userId) return { success: false, error: "Unauthorized" };

    const insforge = createInsforgeServer(userId);

    const isAllowed = await verifyPermission(insforge, validated.data.orgId, userId, "tasks", "delete");
    if (!isAllowed) {
      return { success: false, error: "You do not have permission to delete tasks in this workspace." };
    }

    const { error } = await insforge.database
      .from("tasks")
      .delete()
      .eq("id", validated.data.taskId)
      .eq("organization_id", validated.data.orgId);

    if (error) {
      logger.error({ error, taskId: validated.data.taskId }, "Failed to delete task from database");
      return { success: false, error: "Failed to delete task" };
    }

    revalidatePath(`/projects/${validated.data.projectId}`);
    return { success: true };
  } catch (err) {
    logger.error({ error: err, taskId }, "Unexpected error in deleteTask Server Action");
    Sentry.captureException(err);
    return { success: false, error: "An unexpected error occurred" };
  } finally {
    flushLogsAfterResponse();
  }
}

export async function reorderTasks(
  projectId: string,
  orgId: string,
  taskUpdates: { id: string; stage?: string | null; status?: TaskStatus; board_index: number }[]
): Promise<{ success: boolean; error?: string }> {
  const validated = reorderTasksInputSchema.safeParse({ projectId, orgId, taskUpdates });
  if (!validated.success) {
    return { success: false, error: validated.error.issues[0].message };
  }

  try {
    const { userId } = await auth();
    if (!userId) return { success: false, error: "Unauthorized" };

    const insforge = createInsforgeServer(userId);

    const isAllowed = await verifyPermission(insforge, validated.data.orgId, userId, "tasks", "update");
    if (!isAllowed) {
      return { success: false, error: "You do not have permission to update tasks in this workspace." };
    }

    // Fetch previous task states to log stage transitions
    const taskIds = validated.data.taskUpdates.map((u) => u.id);
    const { data: prevTasks } = await insforge.database
      .from("tasks")
      .select("id, title, stage, status")
      .in("id", taskIds);

    // Validate stages against project's custom_statuses (if any stages are provided)
    const hasStageUpdates = validated.data.taskUpdates.some((u) => u.stage !== undefined && u.stage !== null);
    if (hasStageUpdates) {
      const { data: projectData, error: projectError } = await insforge.database
        .from("projects")
        .select("custom_statuses")
        .eq("id", validated.data.projectId)
        .eq("organization_id", validated.data.orgId)
        .single();

      if (projectError || !projectData) {
        logger.error({ error: projectError, projectId: validated.data.projectId }, "Project not found for reorder stage validation");
        return { success: false, error: "Failed to validate board stage" };
      }

      const allowedStages = projectData.custom_statuses;

      if (prevTasks && allowedStages) {
        for (const update of validated.data.taskUpdates) {
          if (update.stage === undefined || update.stage === null) continue;
          const prev = prevTasks.find((t) => t.id === update.id);
          if (prev && prev.stage !== update.stage) {
            if (!allowedStages.includes(update.stage)) {
              return { success: false, error: `Invalid board stage "${update.stage}". Must be one of: ${allowedStages.join(", ")}` };
            }

            // Check task approval lock
            const { data: pendingApprovals } = await insforge.database
              .from("task_approvals")
              .select("id")
              .eq("task_id", update.id)
              .eq("status", "PENDING");

            if (pendingApprovals && pendingApprovals.length > 0) {
              if (update.stage === allowedStages[0]) {
                await insforge.database
                  .from("task_approvals")
                  .update({ status: "REJECTED", updated_at: new Date().toISOString() })
                  .eq("task_id", update.id)
                  .in("status", ["PENDING", "QUEUED"]);
              } else {
                return { success: false, error: `Cannot update board stage for "${prev.title}": this task is locked pending approval.` };
              }
            }
          }
        }
      }
    }

    // Run updates in parallel — update stage + board_index
    const promises = validated.data.taskUpdates.map((update) => {
      const payload: Record<string, unknown> = {
        board_index: update.board_index,
        updated_at: new Date().toISOString(),
      };
      if (update.stage !== undefined) {
        payload.stage = update.stage;
      }
      return insforge.database
        .from("tasks")
        .update(payload)
        .eq("id", update.id)
        .eq("organization_id", validated.data.orgId)
        .select("*")
        .single();
    });

    const results = await Promise.all(promises);
    const hasError = results.some((r) => r.error);

    if (hasError) {
      const errorDetails = results.filter((r) => r.error).map((r) => r.error);
      logger.error({ errorDetails, projectId: validated.data.projectId }, "Failed to update some tasks ordering");
      return { success: false, error: "Failed to update some tasks ordering" };
    }

    // Log stage transitions after successful updates
    if (prevTasks) {
      for (const update of validated.data.taskUpdates) {
        const prev = prevTasks.find((t) => t.id === update.id);
        if (prev && update.stage !== undefined && prev.stage !== update.stage) {
          await logActivity(validated.data.orgId, validated.data.projectId, userId, "TASK_STATUS_UPDATED", {
            taskId: update.id,
            taskTitle: prev.title,
            fromStatus: prev.stage || "none",
            toStatus: update.stage || "none",
          });
        }
      }
    }

    after(async () => {
      try {
        for (let i = 0; i < validated.data.taskUpdates.length; i++) {
          const update = validated.data.taskUpdates[i];
          const updatedTask = results[i].data;
          if (!updatedTask) continue;

          await triggerWorkflowEvent(
            "task.updated",
            { task: updatedTask },
            { userId, orgId: validated.data.orgId }
          );

          const prev = prevTasks?.find((t) => t.id === update.id);
          if (prev && prev.status !== updatedTask.status && updatedTask.status === "DONE") {
            await triggerWorkflowEvent(
              "task.completed",
              { task: updatedTask },
              { userId, orgId: validated.data.orgId }
            );
          }
        }
      } catch (err) {
        logger.error({ error: err }, "Failed to trigger workflows on reorderTasks");
      }
    });

    revalidatePath(`/projects/${validated.data.projectId}`);
    return { success: true };
  } catch (err) {
    logger.error({ error: err, projectId }, "Unexpected error in reorderTasks Server Action");
    Sentry.captureException(err);
    return { success: false, error: "An unexpected error occurred" };
  } finally {
    flushLogsAfterResponse();
  }
}

