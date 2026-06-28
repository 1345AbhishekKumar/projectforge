import * as Sentry from "@sentry/nextjs";
import { z } from "zod";
import { createInsforgeServer } from "../insforge-server";
import { logger } from "../logger";
import { isTriggerActive } from "./cache";
import { createNotification } from "@/actions/notification";

// Simple validation schemas for workflow actions
const taskUpdateSchema = z.object({
  status: z.string().min(1).optional(),
  priority: z.enum(["LOW", "MEDIUM", "HIGH", "URGENT"]).optional(),
  assignee_id: z.string().nullable().optional(),
  due_date: z.string().nullable().optional(),
});

const taskCreateSchema = z.object({
  title: z.string().min(3).max(100),
  description: z.string().max(500).nullable().optional(),
  status: z.string().min(1).optional(),
  priority: z.enum(["LOW", "MEDIUM", "HIGH", "URGENT"]).optional(),
  assignee_id: z.string().nullable().optional(),
  due_date: z.string().nullable().optional(),
});

const approvalActionSchema = z.object({
  steps: z.array(z.object({
    role: z.string().min(1),
  })).min(1),
  target_status: z.string().min(1),
});

type WorkflowContext = {
  depth: number;
  executedIds: string[];
};

type SessionContext = {
  userId: string;
  orgId: string;
};

/**
 * Checks if the conditions JSON matches the current event payload.
 */
export function matchConditions(payload: unknown, conditions: unknown): boolean {
  if (!conditions || typeof conditions !== "object" || Object.keys(conditions).length === 0) {
    return true;
  }

  const condObj = conditions as Record<string, unknown>;
  const payloadObj = payload as Record<string, unknown> | null | undefined;
  const taskObj = payloadObj?.task as Record<string, unknown> | null | undefined;

  for (const [key, expectedValue] of Object.entries(condObj)) {
    // Check direct property or property nested inside a 'task' object
    const actualValue = payloadObj?.[key] !== undefined ? payloadObj[key] : taskObj?.[key];

    if (actualValue !== expectedValue) {
      return false;
    }
  }

  return true;
}

/**
 * Executes a single workflow action on the database.
 */
async function executeAction(
  action: { type: string; data: unknown },
  payload: unknown,
  session: SessionContext,
  insforge: ReturnType<typeof createInsforgeServer>,
  nextLoopContext: WorkflowContext
): Promise<void> {
  const { orgId } = session;
  const payloadObj = payload as Record<string, unknown> | null | undefined;
  const taskObj = payloadObj?.task as Record<string, unknown> | null | undefined;

  // Normalize UI action types to standard engine action types
  let normalizedAction = { ...action };
  const rawActionData = action.data as Record<string, unknown> | null | undefined;
  const label = rawActionData?.label as string | undefined;

  if (action.type === "assign_to_user") {
    normalizedAction = {
      type: "update_task",
      data: { assignee_id: label || "org_owner" }
    };
  } else if (action.type === "notify_assignee") {
    normalizedAction = {
      type: "create_notification",
      data: { user_id: "assignee", content: label || "Workflow notification triggered." }
    };
  } else if (action.type === "set_status") {
    normalizedAction = {
      type: "update_task",
      data: { status: label || "DONE" }
    };
  } else if (action.type === "archive_task") {
    normalizedAction = {
      type: "update_task",
      data: { status: "ARCHIVED" }
    };
  } else if (action.type === "create_task") {
    if (label && !rawActionData?.title) {
      normalizedAction = {
        type: "create_task",
        data: { title: label }
      };
    }
  }

  if (normalizedAction.type === "update_task") {
    const taskId = (taskObj?.id || payloadObj?.id) as string | undefined;
    if (!taskId) {
      logger.warn({ action: normalizedAction, payload }, "update_task action skipped: taskId not found in payload");
      return;
    }

    const validated = taskUpdateSchema.safeParse(normalizedAction.data);
    if (!validated.success) {
      logger.error({ errors: validated.error.issues, data: normalizedAction.data }, "Invalid update_task action data");
      return;
    }

    const updates: Record<string, unknown> = { ...validated.data };

    // Resolve OWNER if assignee_id is set to dynamic target
    if (updates.assignee_id === "org_owner") {
      const { data: owner } = await insforge.database
        .from("memberships")
        .select("user_id")
        .eq("organization_id", orgId)
        .eq("role", "OWNER")
        .limit(1)
        .maybeSingle();
      if (owner) {
        updates.assignee_id = owner.user_id;
      }
    }

    const { data: updatedTask, error } = await insforge.database
      .from("tasks")
      .update(updates)
      .eq("id", taskId)
      .eq("organization_id", orgId)
      .select("*")
      .single();

    if (error) {
      logger.error({ error, taskId, updates }, "Workflow failed to update task");
      return;
    }

    // Trigger task.updated event in the background recursively
    await triggerWorkflowEvent("task.updated", { task: updatedTask }, session, nextLoopContext);

  } else if (normalizedAction.type === "create_task") {
    const projectId = (taskObj?.project_id || payloadObj?.project_id) as string | undefined;
    if (!projectId) {
      logger.warn({ action: normalizedAction, payload }, "create_task action skipped: projectId not found in payload");
      return;
    }

    const validated = taskCreateSchema.safeParse(normalizedAction.data);
    if (!validated.success) {
      logger.error({ errors: validated.error.issues, data: normalizedAction.data }, "Invalid create_task action data");
      return;
    }

    // Fetch the project to get custom_statuses
    const { data: project, error: projectError } = await insforge.database
      .from("projects")
      .select("custom_statuses")
      .eq("id", projectId)
      .eq("organization_id", orgId)
      .single();

    if (projectError || !project) {
      logger.warn({ action: normalizedAction, projectId, projectError }, "create_task action skipped: project not found");
      return;
    }

    const allowedStatuses = project.custom_statuses || ["TODO", "IN_PROGRESS", "DONE"];
    const targetStatus = validated.data.status || allowedStatuses[0] || "TODO";

    if (!allowedStatuses.includes(targetStatus)) {
      logger.error({ status: targetStatus, allowedStatuses }, "create_task action skipped: target status not allowed for project");
      return;
    }

    const taskData: Record<string, unknown> = {
      ...validated.data,
      project_id: projectId,
      organization_id: orgId,
      status: targetStatus,
      priority: validated.data.priority || "MEDIUM",
    };

    // Resolve OWNER if assignee_id is set to dynamic target
    if (taskData.assignee_id === "org_owner") {
      const { data: owner } = await insforge.database
        .from("memberships")
        .select("user_id")
        .eq("organization_id", orgId)
        .eq("role", "OWNER")
        .limit(1)
        .maybeSingle();
      if (owner) {
        taskData.assignee_id = owner.user_id;
      }
    }

    // Get the highest board_index in the current status column to append the task at the bottom
    const { data: siblingTasks } = await insforge.database
      .from("tasks")
      .select("board_index")
      .eq("project_id", projectId)
      .eq("organization_id", orgId)
      .eq("status", taskData.status)
      .order("board_index", { ascending: false })
      .limit(1);

    const nextIndex = siblingTasks && siblingTasks.length > 0 ? (siblingTasks[0].board_index ?? 0) + 1 : 0;
    taskData.board_index = nextIndex;

    const { data: createdTask, error } = await insforge.database
      .from("tasks")
      .insert([taskData])
      .select("*")
      .single();

    if (error) {
      logger.error({ error, taskData }, "Workflow failed to create task");
      return;
    }

    // Trigger task.created event in the background recursively
    await triggerWorkflowEvent("task.created", { task: createdTask }, session, nextLoopContext);

  } else if (normalizedAction.type === "create_notification") {
    const actionData = normalizedAction.data as Record<string, unknown> | null | undefined;
    let targetUserId = actionData?.user_id as string | undefined;
    if (targetUserId === "assignee") {
      targetUserId = (taskObj?.assignee_id || payloadObj?.assignee_id) as string | undefined;
    }

    if (!targetUserId) {
      logger.warn({ action: normalizedAction, payload }, "create_notification skipped: target user_id not resolved");
      return;
    }

    const content = (actionData?.content || "Workflow notification triggered.") as string;
    await createNotification(targetUserId, content, "GENERAL");
  } else if (normalizedAction.type === "require_approval") {
    const taskId = (taskObj?.id || payloadObj?.id) as string | undefined;
    if (!taskId) {
      logger.warn({ action: normalizedAction, payload }, "require_approval action skipped: taskId not found in payload");
      return;
    }

    const validated = approvalActionSchema.safeParse(normalizedAction.data);
    if (!validated.success) {
      logger.error({ errors: validated.error.issues, data: normalizedAction.data }, "Invalid require_approval action data");
      return;
    }

    // Check if task already has approvals configured to avoid duplicate creations
    const { data: existing } = await insforge.database
      .from("task_approvals")
      .select("id")
      .eq("task_id", taskId)
      .limit(1);

    if (existing && existing.length > 0) {
      return;
    }

    const approvalRows = validated.data.steps.map((step, idx) => ({
      task_id: taskId,
      organization_id: orgId,
      role_name: step.role,
      step_number: idx + 1,
      status: idx === 0 ? "PENDING" : "QUEUED",
      target_status: validated.data.target_status,
    }));

    const { error: insertError } = await insforge.database
      .from("task_approvals")
      .insert(approvalRows);

    if (insertError) {
      logger.error({ error: insertError, taskId }, "Failed to create task approvals in require_approval action");
      return;
    }

    // Notify users with the first role
    const firstRole = validated.data.steps[0].role;
    const taskTitle = (taskObj?.title || payloadObj?.title || "Task") as string;
    await notifyRoleMembers(
      orgId,
      firstRole,
      `Task "${taskTitle}" requires your approval.`,
      insforge
    );
  } else {
    logger.warn({ actionType: normalizedAction.type }, "Unsupported workflow action type");
  }
}

/**
 * Triggers the workflow execution engine for a specific event.
 */
export async function triggerWorkflowEvent(
  triggerName: string,
  payload: unknown,
  session: SessionContext,
  loopContext: WorkflowContext = { depth: 0, executedIds: [] }
): Promise<void> {
  const { orgId, userId } = session;
  const payloadObj = payload as Record<string, unknown> | null | undefined;
  const taskObj = payloadObj?.task as Record<string, unknown> | null | undefined;

  try {
    // 1. Fast path: check in-memory cache
    const active = await isTriggerActive(orgId, triggerName, userId);
    if (!active) {
      return;
    }

    // 2. Fetch matching active workflows from DB
    const insforge = createInsforgeServer(userId);
    const { data: workflows, error } = await insforge.database
      .from("workflows")
      .select("*")
      .eq("organization_id", orgId)
      .eq("trigger", triggerName)
      .eq("enabled", true);

    if (error || !workflows || workflows.length === 0) {
      return;
    }

    for (const workflow of workflows) {
      // 3. Loop prevention checks
      if (loopContext.depth >= 5) {
        logger.warn({ workflowId: workflow.id, triggerName, depth: loopContext.depth }, "Workflow loop aborted: depth limit exceeded");
        
        // Log loop warning to activities table
        const projectId = (taskObj?.project_id || payloadObj?.project_id || null) as string | null;
        await insforge.database.from("activities").insert([
          {
            organization_id: orgId,
            project_id: projectId,
            user_id: userId,
            action_type: "WORKFLOW_LOOP_ABORTED",
            metadata: {
              workflowId: workflow.id,
              workflowName: workflow.name,
              trigger: triggerName,
              reason: "Max execution depth (5) exceeded",
            },
          },
        ]);
        continue;
      }

      if (loopContext.executedIds.includes(workflow.id)) {
        logger.warn({ workflowId: workflow.id, triggerName, executedIds: loopContext.executedIds }, "Workflow loop aborted: cycle detected");

        // Log cycle warning to activities table
        const projectId = (taskObj?.project_id || payloadObj?.project_id || null) as string | null;
        await insforge.database.from("activities").insert([
          {
            organization_id: orgId,
            project_id: projectId,
            user_id: userId,
            action_type: "WORKFLOW_LOOP_ABORTED",
            metadata: {
              workflowId: workflow.id,
              workflowName: workflow.name,
              trigger: triggerName,
              reason: "Workflow execution cycle detected",
            },
          },
        ]);
        continue;
      }

      // 4. Condition Evaluation
      const isMatched = matchConditions(payload, workflow.conditions);
      if (!isMatched) {
        continue;
      }

      // 5. Build next loop context
      const nextLoopContext: WorkflowContext = {
        depth: loopContext.depth + 1,
        executedIds: [...loopContext.executedIds, workflow.id],
      };

      // 6. Execute actions in sequence
      const actions = Array.isArray(workflow.actions) ? workflow.actions : [];
      for (const action of actions) {
        await executeAction(
          action as { type: string; data: unknown },
          payload,
          session,
          insforge,
          nextLoopContext
        );
      }
    }
  } catch (err) {
    logger.error({ error: err, triggerName, orgId }, "Error executing workflow triggers");
    Sentry.captureException(err);
  }
}

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

