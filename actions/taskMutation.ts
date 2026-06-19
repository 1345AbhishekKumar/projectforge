"use server";

import { auth } from "@clerk/nextjs/server";
import { revalidatePath } from "next/cache";
import { after } from "next/server";
import { createInsforgeServer } from "@/lib/insforge-server";
import { z } from "zod";
import type { TaskStatus, TaskPriority } from "@/types";
import { logActivity } from "@/actions/activity";
import { orgIdSchema, projectIdSchema, taskIdSchema } from "@/lib/utils";
import { verifyMembership } from "@/lib/auth-helpers";
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
    status: z.string().min(1).optional(),
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
      status: z.string().min(1),
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
    return { success: false, error: validated.error.issues[0].message };
  }

  try {
    const { userId } = await auth();
    if (!userId) return { success: false, error: "Unauthorized" };

    const insforge = createInsforgeServer(userId);

    const isMember = await verifyMembership(insforge, validated.data.orgId, userId);
    if (!isMember) {
      return { success: false, error: "Not a member of this workspace" };
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

    // Validate status transition if status is changing
    if (validated.data.updates.status !== undefined && validated.data.updates.status !== currentTask.status) {
      const { data: projectData, error: projectError } = await insforge.database
        .from("projects")
        .select("custom_statuses")
        .eq("id", validated.data.projectId)
        .eq("organization_id", validated.data.orgId)
        .single();

      if (projectError || !projectData) {
        logger.error({ error: projectError, projectId: validated.data.projectId }, "Project not found for status transition validation");
        return { success: false, error: "Failed to validate status transition" };
      }

      const allowedStatuses = projectData.custom_statuses || ["TODO", "IN_PROGRESS", "DONE"];
      const newStatus = validated.data.updates.status;
      const oldStatus = currentTask.status;

      if (!allowedStatuses.includes(newStatus)) {
        return { success: false, error: `Invalid status "${newStatus}". Must be one of: ${allowedStatuses.join(", ")}` };
      }

      const oldIdx = allowedStatuses.indexOf(oldStatus);
      const newIdx = allowedStatuses.indexOf(newStatus);

      if (oldIdx !== -1) {
        // Enforce linear rule: forward 1 step or back to backlog (index 0)
        if (!(newIdx === oldIdx + 1 || newIdx === 0)) {
          return { success: false, error: `Invalid status transition from "${oldStatus}" to "${newStatus}". You can only move a task forward one column or back to the first column.` };
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

    const isMember = await verifyMembership(insforge, validated.data.orgId, userId);
    if (!isMember) {
      return { success: false, error: "Not a member of this workspace" };
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
  taskUpdates: { id: string; status: TaskStatus; board_index: number }[]
): Promise<{ success: boolean; error?: string }> {
  const validated = reorderTasksInputSchema.safeParse({ projectId, orgId, taskUpdates });
  if (!validated.success) {
    return { success: false, error: validated.error.issues[0].message };
  }

  try {
    const { userId } = await auth();
    if (!userId) return { success: false, error: "Unauthorized" };

    const insforge = createInsforgeServer(userId);

    const isMember = await verifyMembership(insforge, validated.data.orgId, userId);
    if (!isMember) {
      return { success: false, error: "Not a member of this workspace" };
    }

    // Fetch previous task states to log status transitions
    const taskIds = validated.data.taskUpdates.map((u) => u.id);
    const { data: prevTasks } = await insforge.database
      .from("tasks")
      .select("id, title, status")
      .in("id", taskIds);

    // Validate status transitions for taskUpdates
    const { data: projectData, error: projectError } = await insforge.database
      .from("projects")
      .select("custom_statuses")
      .eq("id", validated.data.projectId)
      .eq("organization_id", validated.data.orgId)
      .single();

    if (projectError || !projectData) {
      logger.error({ error: projectError, projectId: validated.data.projectId }, "Project not found for reorder status transition validation");
      return { success: false, error: "Failed to validate status transition" };
    }

    const allowedStatuses = projectData.custom_statuses || ["TODO", "IN_PROGRESS", "DONE"];
    
    if (prevTasks) {
      for (const update of validated.data.taskUpdates) {
        const prev = prevTasks.find((t) => t.id === update.id);
        if (prev && prev.status !== update.status) {
          if (!allowedStatuses.includes(update.status)) {
            return { success: false, error: `Invalid status "${update.status}". Must be one of: ${allowedStatuses.join(", ")}` };
          }
          
          const oldIdx = allowedStatuses.indexOf(prev.status);
          const newIdx = allowedStatuses.indexOf(update.status);
          
          if (oldIdx !== -1) {
            if (!(newIdx === oldIdx + 1 || newIdx === 0)) {
              return { success: false, error: `Invalid status transition for task "${prev.title}" from "${prev.status}" to "${update.status}".` };
            }
          }
        }
      }
    }

    // Run updates in parallel
    const promises = validated.data.taskUpdates.map((update) =>
      insforge.database
         .from("tasks")
        .update({
          status: update.status,
          board_index: update.board_index,
          updated_at: new Date().toISOString(),
        })
        .eq("id", update.id)
        .eq("organization_id", validated.data.orgId)
        .select("*")
        .single()
    );

    const results = await Promise.all(promises);
    const hasError = results.some((r) => r.error);

    if (hasError) {
      const errorDetails = results.filter((r) => r.error).map((r) => r.error);
      logger.error({ errorDetails, projectId: validated.data.projectId }, "Failed to update some tasks ordering");
      return { success: false, error: "Failed to update some tasks ordering" };
    }

    // Log status transitions after successful updates
    if (prevTasks) {
      for (const update of validated.data.taskUpdates) {
        const prev = prevTasks.find((t) => t.id === update.id);
        if (prev && prev.status !== update.status) {
          if (update.status === "DONE") {
            await logActivity(validated.data.orgId, validated.data.projectId, userId, "TASK_COMPLETED", {
              taskId: update.id,
              taskTitle: prev.title,
            });
          } else {
            await logActivity(validated.data.orgId, validated.data.projectId, userId, "TASK_STATUS_UPDATED", {
              taskId: update.id,
              taskTitle: prev.title,
              fromStatus: prev.status,
              toStatus: update.status,
            });
          }
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
          if (prev && prev.status !== update.status && update.status === "DONE") {
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

