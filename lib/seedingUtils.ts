import { logger } from "@/lib/logger";
import { createInsforgeServer } from "@/lib/insforge-server";

export function getRandomProjectName(index: number): string {
  const names = [
    "Enterprise Dashboard Revival",
    "Cloud Architecture Migration",
    "AI Automated PM Assistant",
    "Interactive Kanban Whiteboard",
    "Time Logging Engine",
    "Advanced Reporting Analytics",
    "SSO Auth Integration",
    "Notification Hub Upgrade",
    "Sentry Crash Optimization",
    "Zod Validation Shield",
    "Socket.IO Presence Hub",
    "Whiteboard Layout Polish",
    "Team Directory Search",
    "PostHog Event Tracking",
    "Compliance Audit Logging",
    "E2E Playwright Pipeline",
    "Vercel Deployment Scripts",
    "Upstash Redis Rate-Limiter",
    "File Upload Attachments",
    "Row-Level Security Shields",
  ];
  return `${names[index % names.length]} (${index + 1})`;
}

export function getRandomTaskTitle(index: number): string {
  const titles = [
    "Scaffold database layout",
    "Configure Clerk middleware",
    "Design sketchy navbar shell",
    "Implement Zod schema checks",
    "Deploy posthog client instance",
    "Configure Sentry DSN variables",
    "Hook up socket client listener",
    "Set up Upstash Redis config",
    "Implement file size checking",
    "Define audit logging trigger",
    "Validate custom status pipelines",
    "Write e2e test suite validations",
    "Refactor monolithic task drawer",
    "Write reporting data aggregation",
    "Verify project template blockers",
    "Add transition control triggers",
    "Optimize dashboard charts render",
    "Design sticky note priorities",
    "Set up sprint backlog assigner",
    "Polish whiteboard dot grid CSS",
  ];
  return `${titles[index % titles.length]} (${index + 1})`;
}

export function getTaskStatusAndSprint(
  projStatus: string,
  customStatuses: string[] | null,
  taskIndex: number,
  insertedSprints: { id: string }[]
): { status: string; sprintId: string | null } {
  const allowedStatuses = customStatuses || ["TODO", "IN_PROGRESS", "DONE"];
  let status = allowedStatuses[0];
  let sprintId: string | null = null;

  if (projStatus === "COMPLETED") {
    status = allowedStatuses.includes("DONE") ? "DONE" : allowedStatuses[allowedStatuses.length - 1];
    if (insertedSprints.length > 0) {
      // Assign to completed sprints (sprints 0 to 29)
      sprintId = insertedSprints[taskIndex % Math.min(30, insertedSprints.length)].id;
    }
  } else if (projStatus === "PLANNING") {
    status = taskIndex % 5 === 0 && allowedStatuses.includes("IN_PROGRESS")
      ? "IN_PROGRESS"
      : allowedStatuses[0];
    if (status === "IN_PROGRESS" && insertedSprints.length > 30) {
      sprintId = insertedSprints[30].id; // Active
    } else if (insertedSprints.length > 31 && taskIndex % 3 === 0) {
      sprintId = insertedSprints[31 + (taskIndex % (insertedSprints.length - 31))].id; // Future sprints
    }
  } else if (projStatus === "ARCHIVED") {
    status = taskIndex % 2 === 0
      ? (allowedStatuses.includes("DONE") ? "DONE" : allowedStatuses[allowedStatuses.length - 1])
      : allowedStatuses[0];
  } else {
    // ACTIVE project
    // 25 DONE, 15 IN_PROGRESS, 15 TODO
    if (taskIndex < 25) {
      status = allowedStatuses.includes("DONE") ? "DONE" : allowedStatuses[allowedStatuses.length - 1];
      if (insertedSprints.length > 0) {
        sprintId = insertedSprints[taskIndex % Math.min(30, insertedSprints.length)].id; // Completed sprints
      }
    } else if (taskIndex < 40) {
      status = allowedStatuses.includes("IN_PROGRESS") ? "IN_PROGRESS" : allowedStatuses[Math.floor(allowedStatuses.length / 2)];
      if (insertedSprints.length > 30) {
        sprintId = insertedSprints[30].id; // Active sprint
      }
    } else {
      status = allowedStatuses[0]; // TODO
      if (insertedSprints.length > 31 && taskIndex % 2 === 0) {
        sprintId = insertedSprints[31 + (taskIndex % (insertedSprints.length - 31))].id; // Planned sprints
      }
    }
  }

  return { status, sprintId };
}

export async function batchInsert<T, R = { id: string } & Record<string, unknown>>(
  insforge: ReturnType<typeof createInsforgeServer>,
  table: string,
  items: T[],
  selectQuery: string = "id",
  batchSize: number = 500
): Promise<{ success: boolean; data?: R[]; error?: unknown }> {
  const results: R[] = [];
  for (let i = 0; i < items.length; i += batchSize) {
    const chunk = items.slice(i, i + batchSize);
    const { data, error } = await insforge.database
      .from(table)
      .insert(chunk)
      .select(selectQuery);

    if (error) {
      logger.error({ error, table, chunkLength: chunk.length, index: i }, `Failed chunk insert in ${table}`);
      return { success: false, error };
    }
    if (data) {
      results.push(...(data as R[]));
    }
  }
  return { success: true, data: results };
}

export function getWorkflowsToInsert(orgId: string) {
  return Array.from({ length: 25 }, (_, i) => {
    const idx = i + 1;
    let trigger = "task.updated";
    let conditions: Record<string, unknown> = {};
    let actions: unknown[] = [];
    let name = "";

    if (i % 4 === 0) {
      trigger = "task.created";
      conditions = { priority: "URGENT" };
      actions = [{
        type: "create_notification",
        data: { user_id: "assignee", content: `Urgent task was created! Please prioritize immediately. #${idx}` }
      }];
      name = `Notify assignee on Urgent Task #${idx}`;
    } else if (i % 4 === 1) {
      trigger = "task.updated";
      conditions = { status: "TESTING" };
      actions = [{
        type: "update_task",
        data: { assignee_id: "org_owner" }
      }];
      name = `Reassign to Owner on TESTING status #${idx}`;
    } else if (i % 4 === 2) {
      trigger = "task.updated";
      conditions = { status: "DONE" };
      actions = [{
        type: "create_notification",
        data: { user_id: "assignee", content: `Great job! Task has been marked as DONE. #${idx}` }
      }];
      name = `Notify assignee on completion #${idx}`;
    } else {
      trigger = "task.created";
      conditions = { priority: "LOW" };
      actions = [{
        type: "update_task",
        data: { priority: "MEDIUM" }
      }];
      name = `Auto-escalate Low priority to Medium #${idx}`;
    }

    return {
      organization_id: orgId,
      name,
      trigger,
      conditions,
      actions,
      enabled: true,
    };
  });
}
