"use server";

import { auth } from "@clerk/nextjs/server";
import { revalidatePath } from "next/cache";
import { createInsforgeServer } from "@/lib/insforge-server";
import { z } from "zod";
import type { Task, TaskStatus, TaskPriority } from "@/types";

const taskSchema = z.object({
  title: z.string().min(3, "Title must be at least 3 characters").max(100),
  description: z.string().max(500).nullable().optional(),
  status: z.enum(["TODO", "IN_PROGRESS", "DONE"]),
  priority: z.enum(["LOW", "MEDIUM", "HIGH", "URGENT"]),
  assigneeId: z.string().nullable().optional(),
  dueDate: z.string().nullable().optional(),
  sprintId: z.string().uuid().nullable().optional(),
});

// Helper to verify if user is member of organization
async function verifyMembership(insforge: ReturnType<typeof createInsforgeServer>, orgId: string, userId: string): Promise<boolean> {
  const { data } = await insforge.database
    .from("memberships")
    .select("id")
    .eq("organization_id", orgId)
    .eq("user_id", userId)
    .maybeSingle();
  return !!data;
}

export async function createTask(
  projectId: string,
  orgId: string,
  title: string,
  description: string | null,
  status: TaskStatus,
  priority: TaskPriority,
  assigneeId: string | null,
  dueDate: string | null,
  sprintId: string | null = null
): Promise<{ success: boolean; data?: { taskId: string }; error?: string }> {
  try {
    const { userId } = await auth();
    if (!userId) return { success: false, error: "Unauthorized" };

    const validated = taskSchema.safeParse({
      title,
      description,
      status,
      priority,
      assigneeId,
      dueDate,
      sprintId,
    });
    if (!validated.success) {
      return { success: false, error: validated.error.issues[0].message };
    }

    const insforge = createInsforgeServer();

    const isMember = await verifyMembership(insforge, orgId, userId);
    if (!isMember) {
      return { success: false, error: "Not a member of this workspace" };
    }

    if (assigneeId) {
      const isAssigneeMember = await verifyMembership(insforge, orgId, assigneeId);
      if (!isAssigneeMember) {
        return { success: false, error: "Assignee is not a member of this workspace" };
      }
    }

    if (sprintId) {
      const { data: targetSprint } = await insforge.database
        .from("sprints")
        .select("status")
        .eq("id", sprintId)
        .eq("organization_id", orgId)
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
          project_id: projectId,
          organization_id: orgId,
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

    revalidatePath(`/projects/${projectId}`);
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
};

export async function getProjectTasks(
  projectId: string,
  orgId: string
): Promise<{ success: boolean; data: TaskWithAssignee[]; error?: string }> {
  try {
    const { userId } = await auth();
    if (!userId) return { success: false, error: "Unauthorized", data: [] };

    const insforge = createInsforgeServer();

    const isMember = await verifyMembership(insforge, orgId, userId);
    if (!isMember) {
      return { success: false, error: "Not a member of this workspace", data: [] };
    }

    const { data, error } = await insforge.database
      .from("tasks")
      .select(`
        *,
        assignee:profiles(id, full_name, email, avatar_url)
      `)
      .eq("project_id", projectId)
      .eq("organization_id", orgId)
      .order("board_index", { ascending: true })
      .order("created_at", { ascending: false });

    if (error) {
      return { success: false, error: "Failed to fetch tasks", data: [] };
    }

    return { success: true, data: data as unknown as TaskWithAssignee[] };
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
  }
): Promise<{ success: boolean; error?: string }> {
  try {
    const { userId } = await auth();
    if (!userId) return { success: false, error: "Unauthorized" };

    const insforge = createInsforgeServer();

    const isMember = await verifyMembership(insforge, orgId, userId);
    if (!isMember) {
      return { success: false, error: "Not a member of this workspace" };
    }

    if (updates.assignee_id) {
      const isAssigneeMember = await verifyMembership(insforge, orgId, updates.assignee_id);
      if (!isAssigneeMember) {
        return { success: false, error: "Assignee is not a member of this workspace" };
      }
    }

    // Retrieve existing task details to check for sprint locking
    const { data: currentTask, error: fetchError } = await insforge.database
      .from("tasks")
      .select("sprint_id")
      .eq("id", taskId)
      .eq("organization_id", orgId)
      .single();

    if (fetchError || !currentTask) {
      return { success: false, error: "Task not found" };
    }

    // Enforce Completed Sprint Lock constraints on sprint_id changes
    if (updates.sprint_id !== undefined && updates.sprint_id !== currentTask.sprint_id) {
      // 1. Verify that the task is not currently inside a completed sprint
      if (currentTask.sprint_id) {
        const { data: oldSprint } = await insforge.database
          .from("sprints")
          .select("status")
          .eq("id", currentTask.sprint_id)
          .eq("organization_id", orgId)
          .single();

        if (oldSprint && oldSprint.status === "COMPLETED") {
          return { success: false, error: "Cannot move task out of a completed sprint." };
        }
      }

      // 2. Verify that the target sprint is not completed
      if (updates.sprint_id) {
        const { data: newSprint } = await insforge.database
          .from("sprints")
          .select("status")
          .eq("id", updates.sprint_id)
          .eq("organization_id", orgId)
          .single();

        if (newSprint && newSprint.status === "COMPLETED") {
          return { success: false, error: "Cannot assign task to a completed sprint." };
        }
      }
    }

    const updatePayload: Record<string, unknown> = {
      updated_at: new Date().toISOString(),
    };

    if (updates.title !== undefined) {
      if (updates.title.length < 3 || updates.title.length > 100) {
        return { success: false, error: "Title must be between 3 and 100 characters" };
      }
      updatePayload.title = updates.title;
    }
    if (updates.description !== undefined) {
      if (updates.description && updates.description.length > 500) {
        return { success: false, error: "Description must not exceed 500 characters" };
      }
      updatePayload.description = updates.description;
    }
    if (updates.status !== undefined) {
      updatePayload.status = updates.status;
    }
    if (updates.priority !== undefined) {
      updatePayload.priority = updates.priority;
    }
    if (updates.assignee_id !== undefined) {
      updatePayload.assignee_id = updates.assignee_id;
    }
    if (updates.due_date !== undefined) {
      updatePayload.due_date = updates.due_date;
    }
    if (updates.sprint_id !== undefined) {
      updatePayload.sprint_id = updates.sprint_id;
    }
    if (updates.board_index !== undefined) {
      updatePayload.board_index = updates.board_index;
    }

    const { error } = await insforge.database
      .from("tasks")
      .update(updatePayload)
      .eq("id", taskId)
      .eq("organization_id", orgId);

    if (error) {
      return { success: false, error: "Failed to update task" };
    }

    revalidatePath(`/projects/${projectId}`);
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
  try {
    const { userId } = await auth();
    if (!userId) return { success: false, error: "Unauthorized" };

    const insforge = createInsforgeServer();

    const isMember = await verifyMembership(insforge, orgId, userId);
    if (!isMember) {
      return { success: false, error: "Not a member of this workspace" };
    }

    const { error } = await insforge.database
      .from("tasks")
      .delete()
      .eq("id", taskId)
      .eq("organization_id", orgId);

    if (error) {
      return { success: false, error: "Failed to delete task" };
    }

    revalidatePath(`/projects/${projectId}`);
    return { success: true };
  } catch {
    return { success: false, error: "An unexpected error occurred" };
  }
}

export async function getOrganizationTasks(
  orgId: string
): Promise<{ success: boolean; data: TaskWithAssignee[]; error?: string }> {
  try {
    const { userId } = await auth();
    if (!userId) return { success: false, error: "Unauthorized", data: [] };

    const insforge = createInsforgeServer();

    const isMember = await verifyMembership(insforge, orgId, userId);
    if (!isMember) {
      return { success: false, error: "Not a member of this workspace", data: [] };
    }

    const { data, error } = await insforge.database
      .from("tasks")
      .select(`
        *,
        assignee:profiles(id, full_name, email, avatar_url)
      `)
      .eq("organization_id", orgId)
      .order("created_at", { ascending: false });

    if (error) {
      return { success: false, error: "Failed to fetch tasks", data: [] };
    }

    return { success: true, data: data as unknown as TaskWithAssignee[] };
  } catch {
    return { success: false, error: "An unexpected error occurred", data: [] };
  }
}

export async function reorderTasks(
  projectId: string,
  orgId: string,
  taskUpdates: { id: string; status: TaskStatus; board_index: number }[]
): Promise<{ success: boolean; error?: string }> {
  try {
    const { userId } = await auth();
    if (!userId) return { success: false, error: "Unauthorized" };

    const insforge = createInsforgeServer();

    const isMember = await verifyMembership(insforge, orgId, userId);
    if (!isMember) {
      return { success: false, error: "Not a member of this workspace" };
    }

    // Run updates in parallel
    const promises = taskUpdates.map((update) =>
      insforge.database
        .from("tasks")
        .update({
          status: update.status,
          board_index: update.board_index,
          updated_at: new Date().toISOString(),
        })
        .eq("id", update.id)
        .eq("organization_id", orgId)
    );

    const results = await Promise.all(promises);
    const hasError = results.some((r) => r.error);

    if (hasError) {
      return { success: false, error: "Failed to update some tasks ordering" };
    }

    revalidatePath(`/projects/${projectId}`);
    return { success: true };
  } catch {
    return { success: false, error: "An unexpected error occurred" };
  }
}
