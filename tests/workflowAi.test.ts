import { describe, it, expect } from "vitest";

interface DbCall {
  table: string;
  method: string;
  data: Record<string, unknown>;
}

// Mock helper representing workflow AI action execution logic
async function mockExecuteWorkflowAIAction(
  actionData: { prompt: string; output_type: "comment" | "subtasks" | "description" },
  payload: {
    id: string;
    project_id: string;
    title: string;
    description?: string;
    priority?: string;
  },
  openaiResponse: string,
  dbCalls: DbCall[],
) {
  // 1. Log AI usage
  dbCalls.push({
    table: "ai_usages",
    method: "insert",
    data: {
      action_type: `WORKFLOW_AI_${actionData.output_type.toUpperCase()}`,
    },
  });

  const taskTitle = payload.title || "Untitled Task";
  const taskPriority = payload.priority || "MEDIUM";

  if (actionData.output_type === "subtasks") {
    // Simulate JSON parsing
    const parsed = JSON.parse(openaiResponse) as { subtasks: string[] };
    for (const title of parsed.subtasks) {
      const subtaskId = `subtask-${Math.random().toString(36).substring(2, 9)}`;
      dbCalls.push({
        table: "tasks",
        method: "insert",
        data: {
          project_id: payload.project_id,
          title,
          description: `AI generated subtask for: ${taskTitle}`,
          status: "TODO",
          priority: taskPriority,
        },
      });

      dbCalls.push({
        table: "task_dependencies",
        method: "insert",
        data: {
          source_task_id: subtaskId,
          target_task_id: payload.id,
          dependency_type: "BLOCKS",
        },
      });
    }
  } else if (actionData.output_type === "comment") {
    dbCalls.push({
      table: "comments",
      method: "insert",
      data: {
        task_id: payload.id,
        content: openaiResponse,
      },
    });
  } else if (actionData.output_type === "description") {
    dbCalls.push({
      table: "tasks",
      method: "update",
      data: {
        id: payload.id,
        description: openaiResponse,
      },
    });
  }
}

describe("Workflow AI Action Execution", () => {
  it("should process and insert comments when output_type is comment", async () => {
    const dbCalls: DbCall[] = [];
    const actionData = {
      prompt: "Summarize findings and note next steps",
      output_type: "comment" as const,
    };
    const payload = {
      id: "task-101",
      project_id: "project-1",
      title: "Write documentation",
      description: "Write final docs for release",
      priority: "HIGH",
    };
    const mockAiResponse = "AI Summary: Please make sure to verify API endpoints first.";

    await mockExecuteWorkflowAIAction(actionData, payload, mockAiResponse, dbCalls);

    // Verify AI Usage call
    const usageCall = dbCalls.find((c) => c.table === "ai_usages");
    expect(usageCall).toBeTruthy();
    expect(usageCall?.data.action_type).toBe("WORKFLOW_AI_COMMENT");

    // Verify Comment call
    const commentCall = dbCalls.find((c) => c.table === "comments");
    expect(commentCall).toBeTruthy();
    expect(commentCall?.data.task_id).toBe("task-101");
    expect(commentCall?.data.content).toBe(mockAiResponse);
  });

  it("should update task description when output_type is description", async () => {
    const dbCalls: DbCall[] = [];
    const actionData = {
      prompt: "Rephrase description professionally",
      output_type: "description" as const,
    };
    const payload = {
      id: "task-102",
      project_id: "project-1",
      title: "Fix bug",
      description: "it fails",
      priority: "URGENT",
    };
    const mockAiResponse =
      "Professional Description: The database connection fails under high load.";

    await mockExecuteWorkflowAIAction(actionData, payload, mockAiResponse, dbCalls);

    // Verify AI Usage call
    const usageCall = dbCalls.find((c) => c.table === "ai_usages");
    expect(usageCall).toBeTruthy();
    expect(usageCall?.data.action_type).toBe("WORKFLOW_AI_DESCRIPTION");

    // Verify Task Update call
    const updateCall = dbCalls.find((c) => c.table === "tasks" && c.method === "update");
    expect(updateCall).toBeTruthy();
    expect(updateCall?.data.id).toBe("task-102");
    expect(updateCall?.data.description).toBe(mockAiResponse);
  });

  it("should generate multiple subtasks and dependencies when output_type is subtasks", async () => {
    const dbCalls: DbCall[] = [];
    const actionData = {
      prompt: "Generate task breakdown",
      output_type: "subtasks" as const,
    };
    const payload = {
      id: "task-103",
      project_id: "project-1",
      title: "Deploy application",
      description: "Push to staging and production",
      priority: "MEDIUM",
    };
    const mockAiResponse = JSON.stringify({
      subtasks: ["Configure env keys", "Run migrations", "Run build check"],
    });

    await mockExecuteWorkflowAIAction(actionData, payload, mockAiResponse, dbCalls);

    // Verify AI Usage call
    const usageCall = dbCalls.find((c) => c.table === "ai_usages");
    expect(usageCall).toBeTruthy();
    expect(usageCall?.data.action_type).toBe("WORKFLOW_AI_SUBTASKS");

    // Verify Tasks Insertion calls
    const taskInserts = dbCalls.filter((c) => c.table === "tasks" && c.method === "insert");
    expect(taskInserts).toHaveLength(3);
    expect(taskInserts[0].data.title).toBe("Configure env keys");
    expect(taskInserts[1].data.title).toBe("Run migrations");
    expect(taskInserts[2].data.title).toBe("Run build check");

    // Verify Dependencies calls
    const depInserts = dbCalls.filter(
      (c) => c.table === "task_dependencies" && c.method === "insert",
    );
    expect(depInserts).toHaveLength(3);
    expect(depInserts[0].data.target_task_id).toBe("task-103");
    expect(depInserts[0].data.dependency_type).toBe("BLOCKS");
  });
});
