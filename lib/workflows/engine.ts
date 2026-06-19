import * as Sentry from "@sentry/nextjs";
import { z } from "zod";
import { createInsforgeServer } from "../insforge-server";
import { logger } from "../logger";
import { isTriggerActive } from "./cache";
import { createNotification } from "@/actions/notification";

// Simple validation schemas for workflow actions
const taskUpdateSchema = z.object({
  status: z.enum(["TODO", "IN_PROGRESS", "DONE"]).optional(),
  priority: z.enum(["LOW", "MEDIUM", "HIGH", "URGENT"]).optional(),
  assignee_id: z.string().nullable().optional(),
  due_date: z.string().nullable().optional(),
});

const taskCreateSchema = z.object({
  title: z.string().min(3).max(100),
  description: z.string().max(500).nullable().optional(),
  status: z.enum(["TODO", "IN_PROGRESS", "DONE"]).optional(),
  priority: z.enum(["LOW", "MEDIUM", "HIGH", "URGENT"]).optional(),
  assignee_id: z.string().nullable().optional(),
  due_date: z.string().nullable().optional(),
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

  if (action.type === "update_task") {
    const taskId = (taskObj?.id || payloadObj?.id) as string | undefined;
    if (!taskId) {
      logger.warn({ action, payload }, "update_task action skipped: taskId not found in payload");
      return;
    }

    const validated = taskUpdateSchema.safeParse(action.data);
    if (!validated.success) {
      logger.error({ errors: validated.error.issues, data: action.data }, "Invalid update_task action data");
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

  } else if (action.type === "create_task") {
    const projectId = (taskObj?.project_id || payloadObj?.project_id) as string | undefined;
    if (!projectId) {
      logger.warn({ action, payload }, "create_task action skipped: projectId not found in payload");
      return;
    }

    const validated = taskCreateSchema.safeParse(action.data);
    if (!validated.success) {
      logger.error({ errors: validated.error.issues, data: action.data }, "Invalid create_task action data");
      return;
    }

    const taskData: Record<string, unknown> = {
      ...validated.data,
      project_id: projectId,
      organization_id: orgId,
      status: validated.data.status || "TODO",
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

  } else if (action.type === "create_notification") {
    const actionData = action.data as Record<string, unknown> | null | undefined;
    let targetUserId = actionData?.user_id as string | undefined;
    if (targetUserId === "assignee") {
      targetUserId = (taskObj?.assignee_id || payloadObj?.assignee_id) as string | undefined;
    }

    if (!targetUserId) {
      logger.warn({ action, payload }, "create_notification skipped: target user_id not resolved");
      return;
    }

    const content = (actionData?.content || "Workflow notification triggered.") as string;
    await createNotification(targetUserId, content, "GENERAL");
  } else {
    logger.warn({ actionType: action.type }, "Unsupported workflow action type");
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
