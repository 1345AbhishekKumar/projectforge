import { describe, it, expect, mock, beforeAll } from "bun:test";
import type * as AiActions from "../actions/ai";

// Define mocks BEFORE importing actions/ai
mock.module("@clerk/nextjs/server", () => ({
  auth: () => Promise.resolve({ userId: "mock-user-123" }),
}));

mock.module("@/lib/insforge-server", () => ({
  createInsforgeServer: () => ({
    database: {
      from: (table: string) => ({
        select: () => ({
          eq: () => ({
            eq: () => ({
              gte: () => ({
                lte: () => Promise.resolve({ data: [], error: null }),
              }),
            }),
            single: () => Promise.resolve({ data: table === "projects" ? { name: "Mock Project" } : { custom_statuses: ["TODO", "IN_PROGRESS", "DONE"] }, error: null }),
          }),
        }),
        insert: () => Promise.resolve({ error: null }),
      }),
    },
  }),
}));

mock.module("@/lib/auth-helpers", () => ({
  verifyMembership: () => Promise.resolve(true),
}));

mock.module("openai", () => {
  return {
    default: class MockOpenAI {
      chat = {
        completions: {
          create: () => Promise.resolve({
            choices: [
              {
                message: {
                  content: JSON.stringify({ subtasks: ["Task 1", "Task 2"] }),
                  reasoning_content: "Refined reasoning steps",
                },
              },
            ],
          }),
        },
      };
    },
  };
});

describe("AI Assistant Server Actions", () => {
  let actions: typeof AiActions;

  beforeAll(async () => {
    process.env.NVIDIA_API_KEY = "mock-key";
    // Dynamically import to ensure mock took effect
    actions = await import("../actions/ai");
  });

  it("should successfully generate task breakdowns", async () => {
    const res = await actions.suggestSubtasksAction("task-123", "org-123", "Setup Database", "Initialize PostgreSQL");
    expect(res.success).toBe(true);
    expect(res.data).toEqual(["Task 1", "Task 2"]);
    expect(res.reasoning).toBe("Refined reasoning steps");
  });
});
