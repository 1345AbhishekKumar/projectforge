import { describe, it, expect, mock, beforeAll, afterEach } from "bun:test";
import type * as ProgramActions from "../actions/program";

// 1. Mock Clerk authentication
let mockUserId = "mock-user-admin";
mock.module("@clerk/nextjs/server", () => ({
  auth: () => Promise.resolve({ userId: mockUserId }),
}));

// 2. Mock Next.js cache and server functions
mock.module("next/cache", () => ({
  revalidatePath: () => {},
  revalidateTag: () => {},
}));

mock.module("next/server", () => ({
  after: (cb: () => unknown) => {
    try {
      cb();
    } catch {}
  },
}));

// 3. Mock database states and query returns
const ORG_ID = "1a2b3c4d-5e6f-4a0f-8b1c-2d3e4f5a6b7c";
const PORTFOLIO_ID = "e2d1c0b9-a8f7-4e6e-bd5c-4b3a2f1e0d9c";
const PROGRAM_ID = "a1b2c3d4-e5f6-47a8-9b0c-1d2e3f4a5b6c";
const PROJECT_ID = "b2c3d4e5-f6a7-48b9-ac0d-1e2f3a4b5c6d";

let mockRole: "ADMIN" | "MEMBER" | "OWNER" = "ADMIN";
let mockDeleteCalledWithProjectIds: string[] = [];
let mockInsertCalledWithInserts: { program_id: string; project_id: string }[] = [];

const mockDbQuery = {
  select: (_columns?: string) => {
    return mockDbQuery;
  },
  insert: (payload: unknown) => {
    if (Array.isArray(payload)) {
      mockInsertCalledWithInserts = payload as { program_id: string; project_id: string }[];
    }
    return mockDbQuery;
  },
  update: () => mockDbQuery,
  delete: () => mockDbQuery,
  eq: () => mockDbQuery,
  in: (column: string, values: string[]) => {
    if (column === "project_id") {
      mockDeleteCalledWithProjectIds = values;
    }
    return mockDbQuery;
  },
  maybeSingle: () => {
    // If checking membership
    return Promise.resolve({
      data: { id: "membership-123", role: mockRole },
      error: null,
    });
  },
  single: () => {
    return Promise.resolve({
      data: { id: "program-123" },
      error: null,
    });
  },
  then: (resolve: (value: { data: unknown; error: unknown }) => void) => {
    resolve({ data: [], error: null });
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
  verifyAdminOrOwnerRole: (_insforge: unknown, _orgId?: string, _userId?: string) => {
    return Promise.resolve(mockRole === "ADMIN" || mockRole === "OWNER");
  },
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

describe("Feature 4.2: Program Management Verification", () => {
  let programActions: typeof ProgramActions;

  beforeAll(async () => {
    programActions = await import("../actions/program");
  });

  afterEach(() => {
    mockUserId = "mock-user-admin";
    mockRole = "ADMIN";
    mockDeleteCalledWithProjectIds = [];
    mockInsertCalledWithInserts = [];
  });

  describe("Program Association (Linking Projects)", () => {
    it("should successfully link projects to a program when user is Admin/Owner", async () => {
      mockRole = "ADMIN";
      const res = await programActions.linkProjectsToProgram(ORG_ID, PROGRAM_ID, [PROJECT_ID]);
      expect(res.success).toBe(true);
      expect(mockInsertCalledWithInserts).toEqual([
        { program_id: PROGRAM_ID, project_id: PROJECT_ID },
      ]);
    });

    it("should fail linking projects if user is a normal Member", async () => {
      mockRole = "MEMBER";
      const res = await programActions.linkProjectsToProgram(ORG_ID, PROGRAM_ID, [PROJECT_ID]);
      expect(res.success).toBe(false);
      expect(res.error).toBe("Only owners and admins can link projects to programs.");
    });

    it("should enforce the business rule that a project belongs to at most one program by deleting prior links", async () => {
      mockRole = "ADMIN";
      // Link project to a program. It should delete prior records for this project ID first.
      const res = await programActions.linkProjectsToProgram(ORG_ID, PROGRAM_ID, [PROJECT_ID]);
      expect(res.success).toBe(true);
      expect(mockDeleteCalledWithProjectIds).toContain(PROJECT_ID);
    });
  });

  describe("Manager Assignment & Write Permissions", () => {
    it("should successfully create a program and assign a manager if user is Admin", async () => {
      mockRole = "ADMIN";
      const res = await programActions.createProgram(ORG_ID, PORTFOLIO_ID, "New Program", "manager-user-id");
      expect(res.success).toBe(true);
      expect(res.data).toBeDefined();
    });

    it("should fail creating a program if user is a Member", async () => {
      mockRole = "MEMBER";
      const res = await programActions.createProgram(ORG_ID, PORTFOLIO_ID, "New Program", "manager-user-id");
      expect(res.success).toBe(false);
      expect(res.error).toBe("Only owners and admins can create programs.");
    });

    it("should allow Admin to update program settings (manager and status)", async () => {
      mockRole = "ADMIN";
      const res = await programActions.updateProgram(ORG_ID, PROGRAM_ID, "Updated Program Name", "new-manager-id", "ACTIVE");
      expect(res.success).toBe(true);
    });

    it("should block Member from updating program settings", async () => {
      mockRole = "MEMBER";
      const res = await programActions.updateProgram(ORG_ID, PROGRAM_ID, "Updated Program Name", "new-manager-id", "ACTIVE");
      expect(res.success).toBe(false);
      expect(res.error).toBe("Only owners and admins can update programs.");
    });
  });
});
