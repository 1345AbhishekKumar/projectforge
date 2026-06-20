import { describe, it, expect, mock, beforeAll } from "bun:test";
import type * as AiActions from "../actions/ai";

// Define mocks BEFORE importing actions/ai
mock.module("@clerk/nextjs/server", () => ({
  auth: () => Promise.resolve({ userId: "mock-user-123" }),
}));

const mockDbQuery = {
  select: () => mockDbQuery,
  insert: () => mockDbQuery,
  eq: () => mockDbQuery,
  neq: () => mockDbQuery,
  gte: () => mockDbQuery,
  lte: () => mockDbQuery,
  lt: () => mockDbQuery,
  single: () => Promise.resolve({ data: { id: "mock-id-123", name: "Mock Project" }, error: null }),
  then: (resolve: (value: { data: unknown[]; error: unknown }) => void) => resolve({ data: [], error: null }),
};

mock.module("@/lib/insforge-server", () => ({
  createInsforgeServer: () => ({
    database: {
      from: () => mockDbQuery,
    },
  }),
}));

mock.module("@/lib/auth-helpers", () => ({
  verifyMembership: () => Promise.resolve(true),
  verifyAdminOrOwnerRole: () => Promise.resolve(true),
  getOrganizationMemberships: () => Promise.resolve({ data: [], error: null }),
}));

mock.module("@sentry/nextjs", () => ({
  captureException: () => {},
}));

mock.module("@/lib/logger", () => ({
  logger: {
    info: () => {},
    error: () => {},
    warn: () => {},
    debug: () => {},
  },
  flushLogsAfterResponse: () => {},
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
