"use server";

import { auth } from "@clerk/nextjs/server";
import { revalidatePath } from "next/cache";
import { createInsforgeServer } from "@/lib/insforge-server";
import { z } from "zod";
import type { Task, TaskStatus, TaskPriority, Label } from "@/types";
import { logActivity } from "@/actions/activity";
import { orgIdSchema, projectIdSchema, taskIdSchema } from "@/lib/utils";
import { verifyMembership } from "@/lib/auth-helpers";

const taskSchema = z.object({
  title: z.string().min(3, "Title must be at least 3 characters").max(100),
  description: z.string().max(500).nullable().optional(),
  status: z.enum(["TODO", "IN_PROGRESS", "DONE"]),
  priority: z.enum(["LOW", "MEDIUM", "HIGH", "URGENT"]),
  assigneeId: z.string().nullable().optional(),
  dueDate: z.string().nullable().optional(),
  sprintId: z.string().uuid().nullable().optional(),
});

const createTaskInputSchema = taskSchema.extend({
  projectId: projectIdSchema,
  orgId: orgIdSchema,
  labelIds: z.array(z.string().uuid()).optional(),
});

const getProjectTasksInputSchema = z.object({
  projectId: projectIdSchema,
  orgId: orgIdSchema,
});

const updateTaskInputSchema = z.object({
  taskId: taskIdSchema,
  projectId: projectIdSchema,
  orgId: orgIdSchema,
  updates: z.object({
    title: z.string().min(3, "Title must be at least 3 characters").max(100).optional(),
    description: z.string().max(500).nullable().optional(),
    status: z.enum(["TODO", "IN_PROGRESS", "DONE"]).optional(),
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

const getOrganizationTasksInputSchema = z.object({
  orgId: orgIdSchema,
});

const reorderTasksInputSchema = z.object({
  projectId: projectIdSchema,
  orgId: orgIdSchema,
  taskUpdates: z.array(
    z.object({
      id: taskIdSchema,
      status: z.enum(["TODO", "IN_PROGRESS", "DONE"]),
      board_index: z.number().int().min(0),
    })
  ),
});


export async function createTask(
  projectId: string,
  orgId: string,
  title: string,
  description: string | null,
  status: TaskStatus,
  priority: TaskPriority,
  assigneeId: string | null,
  dueDate: string | null,
  sprintId: string | null = null,
  labelIds: string[] = []
): Promise<{ success: boolean; data?: { taskId: string }; error?: string }> {
  const validated = createTaskInputSchema.safeParse({
    projectId,
    orgId,
    title,
    description,
    status,
    priority,
    assigneeId,
    dueDate,
    sprintId,
    labelIds,
  });
  if (!validated.success) {
    return { success: false, error: validated.error.issues[0].message };
  }

  try {
    const { userId } = await auth();
    if (!userId) return { success: false, error: "Unauthorized" };

    const insforge = createInsforgeServer();

    const isMember = await verifyMembership(insforge, validated.data.orgId, userId);
    if (!isMember) {
      return { success: false, error: "Not a member of this workspace" };
    }

    if (validated.data.assigneeId) {
      const isAssigneeMember = await verifyMembership(insforge, validated.data.orgId, validated.data.assigneeId);
      if (!isAssigneeMember) {
        return { success: false, error: "Assignee is not a member of this workspace" };
      }
    }

    if (validated.data.sprintId) {
      const { data: targetSprint } = await insforge.database
        .from("sprints")
        .select("status")
        .eq("id", validated.data.sprintId)
        .eq("organization_id", validated.data.orgId)
        .single();
      
      if (!targetSprint) {
        return { success: false, error: "Sprint not found in this organization" };
      }
      if (targetSprint.status === "COMPLETED" || targetSprint.status === "CANCELLED") {
        return { success: false, error: "Cannot assign task to a completed or cancelled sprint" };
      }
    }

    const { data: task, error } = await insforge.database
      .from("tasks")
      .insert([
        {
          project_id: validated.data.projectId,
          organization_id: validated.data.orgId,
          title: validated.data.title,
          description: validated.data.description || null,
          status: validated.data.status,
          priority: validated.data.priority,
          assignee_id: validated.data.assigneeId || null,
          due_date: validated.data.dueDate || null,
          sprint_id: validated.data.sprintId || null,
        },
      ])
      .select("id")
      .single();

    if (error) {
      return { success: false, error: "Failed to create task" };
    }

    if (labelIds && labelIds.length > 0) {
      const mappings = labelIds.map((labelId) => ({
        task_id: task.id,
        label_id: labelId,
      }));
      const { error: mappingError } = await insforge.database
        .from("task_label_mappings")
        .insert(mappings);
      if (mappingError) {
        // Log mapping error but do not fail task creation
      }
    }

    await logActivity(validated.data.orgId, validated.data.projectId, userId, "TASK_CREATED", {
      taskId: task.id,
      taskTitle: validated.data.title,
      priority: validated.data.priority,
    });

    if (validated.data.assigneeId) {
      const { data: profile } = await insforge.database
        .from("profiles")
        .select("full_name")
        .eq("id", validated.data.assigneeId)
        .single();
      const assigneeName = profile?.full_name || "Unknown User";

      await logActivity(validated.data.orgId, validated.data.projectId, userId, "TASK_ASSIGNED", {
        taskId: task.id,
        taskTitle: validated.data.title,
        assigneeId: validated.data.assigneeId,
        assigneeName,
      });
    }

    revalidatePath(`/projects/${validated.data.projectId}`);
    return { success: true, data: { taskId: task.id } };
  } catch {
    return { success: false, error: "An unexpected error occurred" };
  }
}

export type TaskWithAssignee = Task & {
  assignee: {
    id: string;
    full_name: string | null;
    email: string;
    avatar_url: string | null;
  } | null;
  labels: Label[];
};

type DbTaskResult = Task & {
  assignee: {
    id: string;
    full_name: string | null;
    email: string;
    avatar_url: string | null;
  } | null;
  task_label_mappings: {
    label: Label | null;
  }[] | null;
};

export async function getProjectTasks(
  projectId: string,
  orgId: string
): Promise<{ success: boolean; data: TaskWithAssignee[]; error?: string }> {
  const validated = getProjectTasksInputSchema.safeParse({ projectId, orgId });
  if (!validated.success) {
    return { success: false, error: validated.error.issues[0].message, data: [] };
  }

  try {
    const { userId } = await auth();
    if (!userId) return { success: false, error: "Unauthorized", data: [] };

    const insforge = createInsforgeServer();

    const isMember = await verifyMembership(insforge, validated.data.orgId, userId);
    if (!isMember) {
      return { success: false, error: "Not a member of this workspace", data: [] };
    }

    const { data, error } = await insforge.database
      .from("tasks")
      .select(`
        *,
        assignee:profiles(id, full_name, email, avatar_url),
        task_label_mappings(label:labels(*))
      `)
      .eq("project_id", validated.data.projectId)
      .eq("organization_id", validated.data.orgId)
      .order("board_index", { ascending: true })
      .order("created_at", { ascending: false });

    if (error) {
      return { success: false, error: "Failed to fetch tasks", data: [] };
    }

    const tasksData = (data || []) as unknown as DbTaskResult[];

    const formattedTasks = tasksData.map((task) => ({
      ...task,
      labels: task.task_label_mappings?.map((m) => m.label).filter((l): l is Label => !!l) || [],
    }));

    return { success: true, data: formattedTasks as unknown as TaskWithAssignee[] };
  } catch {
    return { success: false, error: "An unexpected error occurred", data: [] };
  }
}

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

    const insforge = createInsforgeServer();

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
      return { success: false, error: "Task not found" };
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

    const { error } = await insforge.database
      .from("tasks")
      .update(updatePayload)
      .eq("id", validated.data.taskId)
      .eq("organization_id", validated.data.orgId);

    if (error) {
      return { success: false, error: "Failed to update task" };
    }

    const taskTitle = validated.data.updates.title || currentTask.title;

    if (validated.data.updates.status === "DONE" && currentTask.status !== "DONE") {
      await logActivity(validated.data.orgId, validated.data.projectId, userId, "TASK_COMPLETED", {
        taskId: validated.data.taskId,
        taskTitle,
      });
    }

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
  } catch {
    return { success: false, error: "An unexpected error occurred" };
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

    const insforge = createInsforgeServer();

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
      return { success: false, error: "Failed to delete task" };
    }

    revalidatePath(`/projects/${validated.data.projectId}`);
    return { success: true };
  } catch {
    return { success: false, error: "An unexpected error occurred" };
  }
}

export async function getOrganizationTasks(
  orgId: string
): Promise<{ success: boolean; data: TaskWithAssignee[]; error?: string }> {
  const validated = getOrganizationTasksInputSchema.safeParse({ orgId });
  if (!validated.success) {
    return { success: false, error: validated.error.issues[0].message, data: [] };
  }

  try {
    const { userId } = await auth();
    if (!userId) return { success: false, error: "Unauthorized", data: [] };

    const insforge = createInsforgeServer();

    const isMember = await verifyMembership(insforge, validated.data.orgId, userId);
    if (!isMember) {
      return { success: false, error: "Not a member of this workspace", data: [] };
    }

    const { data, error } = await insforge.database
      .from("tasks")
      .select(`
        *,
        assignee:profiles(id, full_name, email, avatar_url),
        task_label_mappings(label:labels(*))
      `)
      .eq("organization_id", validated.data.orgId)
      .order("created_at", { ascending: false });

    if (error) {
      return { success: false, error: "Failed to fetch tasks", data: [] };
    }

    const tasksData = (data || []) as unknown as DbTaskResult[];

    const formattedTasks = tasksData.map((task) => ({
      ...task,
      labels: task.task_label_mappings?.map((m) => m.label).filter((l): l is Label => !!l) || [],
    }));

    return { success: true, data: formattedTasks as unknown as TaskWithAssignee[] };
  } catch {
    return { success: false, error: "An unexpected error occurred", data: [] };
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

    const insforge = createInsforgeServer();

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
    );

    const results = await Promise.all(promises);
    const hasError = results.some((r) => r.error);

    if (hasError) {
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

    revalidatePath(`/projects/${validated.data.projectId}`);
    return { success: true };
  } catch {
    return { success: false, error: "An unexpected error occurred" };
  }
}
