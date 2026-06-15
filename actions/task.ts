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
  dueDate: string | null
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
