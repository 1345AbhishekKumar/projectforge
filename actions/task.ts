"use server";

import { auth } from "@clerk/nextjs/server";
import { revalidatePath } from "next/cache";
import { createInsforgeServer } from "@/lib/insforge-server";
import { z } from "zod";
import type { Task, TaskStatus, TaskPriority, Label } from "@/types";
import { logActivity } from "@/actions/activity";
import { orgIdSchema, projectIdSchema } from "@/lib/utils";
import { verifyMembership } from "@/lib/auth-helpers";
import { logger } from "@/lib/logger";

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

const getOrganizationTasksInputSchema = z.object({
  orgId: orgIdSchema,
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

    const insforge = createInsforgeServer(userId);

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

      if (targetSprint && targetSprint.status === "COMPLETED") {
        return { success: false, error: "Cannot create tasks inside a completed sprint." };
      }
    }

    // Get the highest board_index in the current status column to append the task at the bottom
    const { data: siblingTasks } = await insforge.database
      .from("tasks")
      .select("board_index")
      .eq("project_id", validated.data.projectId)
      .eq("organization_id", validated.data.orgId)
      .eq("status", validated.data.status)
      .order("board_index", { ascending: false })
      .limit(1);

    const nextIndex = siblingTasks && siblingTasks.length > 0 ? (siblingTasks[0].board_index ?? 0) + 1 : 0;

    const { data: task, error } = await insforge.database
      .from("tasks")
      .insert([
        {
          project_id: validated.data.projectId,
          organization_id: validated.data.orgId,
          title: validated.data.title,
          description: validated.data.description,
          status: validated.data.status,
          priority: validated.data.priority,
          assignee_id: validated.data.assigneeId,
          due_date: validated.data.dueDate,
          sprint_id: validated.data.sprintId,
          board_index: nextIndex,
        },
      ])
      .select("id")
      .single();

    if (error || !task) {
      return { success: false, error: "Failed to create task" };
    }

    // Insert label mappings if provided
    if (validated.data.labelIds && validated.data.labelIds.length > 0) {
      const mappings = validated.data.labelIds.map((labelId) => ({
        task_id: task.id,
        label_id: labelId,
      }));

      const { error: mappingError } = await insforge.database
        .from("task_label_mappings")
        .insert(mappings);

      if (mappingError) {
        logger.error({ error: mappingError }, "Failed to map labels to task");
      }
    }

    await logActivity(validated.data.orgId, validated.data.projectId, userId, "TASK_CREATED", {
      taskId: task.id,
      taskTitle: validated.data.title,
    });

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

// Deduplicated mapping helper function
function formatDbTask(task: DbTaskResult): TaskWithAssignee {
  return {
    ...task,
    labels: task.task_label_mappings?.map((m) => m.label).filter((l): l is Label => !!l) || [],
  } as unknown as TaskWithAssignee;
}

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

    const insforge = createInsforgeServer(userId);

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
    const formattedTasks = tasksData.map(formatDbTask);

    return { success: true, data: formattedTasks };
  } catch {
    return { success: false, error: "An unexpected error occurred", data: [] };
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

    const insforge = createInsforgeServer(userId);

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
    const formattedTasks = tasksData.map(formatDbTask);

    return { success: true, data: formattedTasks };
  } catch {
    return { success: false, error: "An unexpected error occurred", data: [] };
  }
}
