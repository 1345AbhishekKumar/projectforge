import { describe, it, expect, mock, beforeAll } from "bun:test";
import type * as SeeddataAction from "../actions/seeddata";

// Mock Clerk authentication
mock.module("@clerk/nextjs/server", () => ({
  auth: () => Promise.resolve({ userId: "mock-seeder-user" }),
}));

// Mock Next.js cache
mock.module("next/cache", () => ({
  revalidatePath: () => {},
  revalidateTag: () => {},
}));

// 2. Mock database responses
const mockDbQuery = {
  select: () => mockDbQuery,
  insert: () => mockDbQuery,
  upsert: () => mockDbQuery,
  delete: () => mockDbQuery,
  eq: () => mockDbQuery,
  then: (resolve: (value: { data: unknown[]; error: unknown }) => void) => {
    resolve({ data: [{ id: "mock-id-1" }, { id: "mock-id-2" }], error: null });
  },
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
}));

mock.module("@sentry/nextjs", () => ({
  captureException: () => {},
}));

mock.module("@/lib/logger", () => ({
  logger: {
    info: () => {},
    error: (...args: unknown[]) => console.error("Logged Error:", ...args),
    warn: (...args: unknown[]) => console.warn("Logged Warn:", ...args),
    debug: () => {},
  },
  flushLogsAfterResponse: () => {},
}));

describe("Database Seeding Server Action", () => {
  let seeddataAction: typeof SeeddataAction;

  beforeAll(async () => {
    seeddataAction = await import("../actions/seeddata");
  });

  it("should successfully seed the database", async () => {
    const res = await seeddataAction.seedData("00000000-0000-0000-0000-000000000000");
    if (!res.success) {
      console.log("SeedData failed with error:", res.error);
    }
    expect(res.success).toBe(true);
  });

  it("should fail validation with invalid orgId", async () => {
    const res = await seeddataAction.seedData("invalid-uuid");
    expect(res.success).toBe(false);
    expect(res.error).toBeDefined();
  });
});
