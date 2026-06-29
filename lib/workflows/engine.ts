import * as Sentry from "@sentry/nextjs";
import { z } from "zod";
import { createInsforgeServer } from "../insforge-server";
import { logger } from "../logger";
import { isTriggerActive } from "./cache";
import { createNotification } from "@/actions/notification";
import { executeWorkflowAIAction } from "./ai";

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
  steps: z
    .array(
      z.object({
        role: z.string().min(1),
      }),
    )
    .min(1),
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
  nextLoopContext: WorkflowContext,
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
      data: { assignee_id: label || "org_owner" },
    };
  } else if (action.type === "notify_assignee") {
    normalizedAction = {
      type: "create_notification",
      data: { user_id: "assignee", content: label || "Workflow notification triggered." },
    };
  } else if (action.type === "set_status") {
    normalizedAction = {
      type: "update_task",
      data: { status: label || "DONE" },
    };
  } else if (action.type === "archive_task") {
    normalizedAction = {
      type: "update_task",
      data: { status: "ARCHIVED" },
    };
  } else if (action.type === "create_task") {
    if (label && !rawActionData?.title) {
      normalizedAction = {
        type: "create_task",
        data: { title: label },
      };
    }
  }

  if (normalizedAction.type === "update_task") {
    const taskId = (taskObj?.id || payloadObj?.id) as string | undefined;
    if (!taskId) {
      logger.warn(
        { action: normalizedAction, payload },
        "update_task action skipped: taskId not found in payload",
      );
      return;
    }

    const validated = taskUpdateSchema.safeParse(normalizedAction.data);
    if (!validated.success) {
      logger.error(
        { errors: validated.error.issues, data: normalizedAction.data },
        "Invalid update_task action data",
      );
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
      logger.warn(
        { action: normalizedAction, payload },
        "create_task action skipped: projectId not found in payload",
      );
      return;
    }

    const validated = taskCreateSchema.safeParse(normalizedAction.data);
    if (!validated.success) {
      logger.error(
        { errors: validated.error.issues, data: normalizedAction.data },
        "Invalid create_task action data",
      );
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
      logger.warn(
        { action: normalizedAction, projectId, projectError },
        "create_task action skipped: project not found",
      );
      return;
    }

    const allowedStatuses = project.custom_statuses || ["TODO", "IN_PROGRESS", "DONE"];
    const targetStatus = validated.data.status || allowedStatuses[0] || "TODO";

    if (!allowedStatuses.includes(targetStatus)) {
      logger.error(
        { status: targetStatus, allowedStatuses },
        "create_task action skipped: target status not allowed for project",
      );
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

    const nextIndex =
      siblingTasks && siblingTasks.length > 0 ? (siblingTasks[0].board_index ?? 0) + 1 : 0;
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
      logger.warn(
        { action: normalizedAction, payload },
        "create_notification skipped: target user_id not resolved",
      );
      return;
    }

    const content = (actionData?.content || "Workflow notification triggered.") as string;
    await createNotification(targetUserId, content, "GENERAL");
  } else if (normalizedAction.type === "require_approval") {
    const taskId = (taskObj?.id || payloadObj?.id) as string | undefined;
    if (!taskId) {
      logger.warn(
        { action: normalizedAction, payload },
        "require_approval action skipped: taskId not found in payload",
      );
      return;
    }

    const validated = approvalActionSchema.safeParse(normalizedAction.data);
    if (!validated.success) {
      logger.error(
        { errors: validated.error.issues, data: normalizedAction.data },
        "Invalid require_approval action data",
      );
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
      logger.error(
        { error: insertError, taskId },
        "Failed to create task approvals in require_approval action",
      );
      return;
    }

    // Notify users with the first role
    const firstRole = validated.data.steps[0].role;
    const taskTitle = (taskObj?.title || payloadObj?.title || "Task") as string;
    await notifyRoleMembers(
      orgId,
      firstRole,
      `Task "${taskTitle}" requires your approval.`,
      insforge,
    );
  } else if (normalizedAction.type === "ai_action") {
    const actionData = normalizedAction.data as
      | { prompt: string; output_type: "comment" | "subtasks" | "description" }
      | null
      | undefined;
    if (!actionData?.prompt || !actionData?.output_type) {
      logger.warn({ action: normalizedAction }, "ai_action skipped: prompt or output_type missing");
      return;
    }
    await executeWorkflowAIAction(actionData, payload, session, insforge);
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
  loopContext: WorkflowContext = { depth: 0, executedIds: [] },
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
      // Resolve trigger, conditions, and actions from active version if set
      let activeConditions = workflow.conditions;
      let activeActions = workflow.actions;
      let versionId = workflow.active_version_id;

      if (versionId) {
        const { data: versionData, error: versionError } = await insforge.database
          .from("workflow_versions")
          .select("*")
          .eq("id", versionId)
          .single();
        if (!versionError && versionData) {
          activeConditions = versionData.conditions;
          activeActions = versionData.actions;
        }
      } else {
        // Fallback: If no active version is set (e.g. legacy workflow), auto-create version 1
        const { data: newVersion, error: newVerError } = await insforge.database
          .from("workflow_versions")
          .insert([
            {
              organization_id: orgId,
              workflow_id: workflow.id,
              version_number: 1,
              trigger: workflow.trigger,
              conditions: workflow.conditions,
              actions: workflow.actions,
              created_by: userId,
            },
          ])
          .select("id")
          .single();
        if (!newVerError && newVersion) {
          versionId = newVersion.id;
          await insforge.database
            .from("workflows")
            .update({ active_version_id: versionId })
            .eq("id", workflow.id);
        }
      }

      // 3. Loop prevention checks
      if (loopContext.depth >= 5) {
        logger.warn(
          { workflowId: workflow.id, triggerName, depth: loopContext.depth },
          "Workflow loop aborted: depth limit exceeded",
        );

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
        logger.warn(
          { workflowId: workflow.id, triggerName, executedIds: loopContext.executedIds },
          "Workflow loop aborted: cycle detected",
        );

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
      const isMatched = matchConditions(payload, activeConditions);
      if (!isMatched) {
        continue;
      }

      // Create workflow execution record
      const { data: execution, error: execInsertError } = await insforge.database
        .from("workflow_executions")
        .insert([
          {
            organization_id: orgId,
            workflow_id: workflow.id,
            version_id: versionId,
            status: "RUNNING",
            trigger_event: triggerName,
            triggered_by: userId,
            payload_snapshot: payload,
          },
        ])
        .select("id")
        .single();

      if (execInsertError || !execution) {
        logger.error({ execInsertError }, "Failed to create workflow execution run");
        continue;
      }

      const executionId = execution.id;
      const executionStartTime = Date.now();
      let executionStatus = "COMPLETED";
      let executionErrorMessage = null;

      // 5. Build next loop context
      const nextLoopContext: WorkflowContext = {
        depth: loopContext.depth + 1,
        executedIds: [...loopContext.executedIds, workflow.id],
      };

      // 6. Execute actions in sequence
      const actions = Array.isArray(activeActions) ? activeActions : [];
      let stepNumber = 1;

      for (const action of actions) {
        const stepStartTime = Date.now();

        // Insert step in PENDING state
        const { data: step, error: stepInsertError } = await insforge.database
          .from("workflow_execution_steps")
          .insert([
            {
              execution_id: executionId,
              step_number: stepNumber,
              action_type: action.type,
              action_data: action.data,
              status: "PENDING",
            },
          ])
          .select("id")
          .single();

        if (stepInsertError || !step) {
          logger.error({ stepInsertError }, "Failed to insert step log");
          executionStatus = "FAILED";
          executionErrorMessage = "Failed to log execution steps";
          break;
        }

        const stepId = step.id;
        let stepStatus = "COMPLETED";
        let stepErrorMsg = null;
        let retryCount = 0;
        const maxRetries = 3;

        // Try-retry loop with backoff
        while (retryCount <= maxRetries) {
          try {
            // Update step status to RUNNING or RETRYING
            await insforge.database
              .from("workflow_execution_steps")
              .update({
                status: retryCount > 0 ? "RETRYING" : "RUNNING",
                retry_count: retryCount,
              })
              .eq("id", stepId);

            await executeAction(
              action as { type: string; data: unknown },
              payload,
              session,
              insforge,
              nextLoopContext,
            );

            // Action completed successfully
            stepStatus = "COMPLETED";
            break;
          } catch (err: unknown) {
            retryCount++;
            stepErrorMsg = err instanceof Error ? err.message : "Unknown action error";
            stepStatus = "FAILED";

            if (retryCount <= maxRetries) {
              const backoffDelay = Math.pow(2, retryCount) * 1000;
              logger.warn(
                { stepId, retryCount, backoffDelay, error: stepErrorMsg },
                "Action failed, retrying...",
              );
              await new Promise((resolve) => setTimeout(resolve, backoffDelay));
            }
          }
        }

        // Update step status to final outcome
        const stepDuration = Date.now() - stepStartTime;
        await insforge.database
          .from("workflow_execution_steps")
          .update({
            status: stepStatus,
            duration: stepDuration,
            error: stepErrorMsg,
            finished_at: new Date().toISOString(),
          })
          .eq("id", stepId);

        if (stepStatus === "FAILED") {
          executionStatus = "FAILED";
          executionErrorMessage = `Step ${stepNumber} (${action.type}) failed: ${stepErrorMsg}`;
          break; // Stop execution of subsequent actions on step failure
        }

        stepNumber++;
      }

      // Finalize workflow execution run status and duration
      const totalDuration = Date.now() - executionStartTime;
      await insforge.database
        .from("workflow_executions")
        .update({
          status: executionStatus,
          duration: totalDuration,
          finished_at: new Date().toISOString(),
          error_message: executionErrorMessage,
        })
        .eq("id", executionId);
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
  insforge: ReturnType<typeof createInsforgeServer>,
): Promise<void> {
  const { data: memberships, error } = await insforge.database
    .from("memberships")
    .select(
      `
      user_id,
      role,
      custom_role_id
    `,
    )
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

  const promises = targetUserIds.map((uid) => createNotification(uid, content, "GENERAL"));
  await Promise.all(promises);
}

/**
 * Clean up execution payload snapshots older than the specified retention days.
 */
export async function runPayloadRetentionCleanup(
  userId: string,
  retentionDays: number = 30,
): Promise<{ deletedCount: number }> {
  try {
    const insforge = createInsforgeServer(userId);

    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - retentionDays);

    const { data, error } = await insforge.database
      .from("workflow_executions")
      .update({
        payload_snapshot: null,
        has_payload_deleted: true,
      })
      .eq("status", "COMPLETED")
      .lt("started_at", cutoffDate.toISOString())
      .select("id");

    if (error) {
      logger.error({ error }, "Failed to clean workflow execution payload snapshots");
      throw error;
    }

    const count = data?.length || 0;
    logger.info(
      { deletedCount: count, retentionDays },
      "Payload retention cleanup completed successfully",
    );
    return { deletedCount: count };
  } catch (err) {
    logger.error({ error: err }, "Error running payload retention cleanup");
    Sentry.captureException(err);
    return { deletedCount: 0 };
  }
}
