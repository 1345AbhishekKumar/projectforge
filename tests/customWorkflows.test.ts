import { test, expect, mock, beforeEach, afterEach } from "bun:test";
import { createTask } from "../actions/task";
import { updateTask } from "../actions/taskMutation";
import { updateProject } from "../actions/project";

// ─────────────────────────────────────────────────────────────────────────────
// Module Mocking
// ─────────────────────────────────────────────────────────────────────────────

mock.module("@clerk/nextjs/server", () => {
  return {
    auth: () => Promise.resolve({ userId: "user_123" }),
  };
});

mock.module("next/cache", () => {
  return {
    revalidatePath: () => {},
  };
});

mock.module("next/server", () => {
  return {
    after: (fn: () => any) => fn(),
  };
});

mock.module("@/lib/auth-helpers", () => {
  return {
    verifyMembership: () => Promise.resolve(true),
    verifyAdminOrOwnerRole: () => Promise.resolve(true),
  };
});

mock.module("@/actions/activity", () => {
  return {
    logActivity: () => Promise.resolve({ success: true }),
  };
});

mock.module("@/actions/notification", () => {
  return {
    createNotification: () => Promise.resolve({ success: true }),
  };
});

mock.module("@sentry/nextjs", () => {
  return {
    captureException: () => {},
  };
});

mock.module("@/lib/logger", () => {
  return {
    logger: {
      info: () => {},
      warn: () => {},
      error: (obj: any, msg?: string) => console.log("LOG ERROR:", obj, msg),
      debug: () => {},
      trace: () => {},
      fatal: () => {},
    },
    flushLogsAfterResponse: () => {},
  };
});

mock.module("@/lib/workflows/engine", () => {
  return {
    triggerWorkflowEvent: () => Promise.resolve(),
  };
});

// ─────────────────────────────────────────────────────────────────────────────
// Database Mocking
// ─────────────────────────────────────────────────────────────────────────────

let mockProjects: any[] = [];
let mockTasks: any[] = [];
let mockMemberships: any[] = [];
let mockProfiles: any[] = [];
let dbTriggerShouldError = false;
let dbTriggerErrorMessage = "";

class MockQueryBuilder {
  private tableName: string;
  private filters: { col: string; val: unknown }[] = [];

  constructor(tableName: string) {
    this.tableName = tableName;
  }

  select(columns?: string) {
    return this;
  }

  eq(col: string, val: unknown) {
    this.filters.push({ col, val });
    return this;
  }

  neq(col: string, val: unknown) {
    return this;
  }

  limit(num: number) {
    return this;
  }

  order(column: string, options?: { ascending: boolean }) {
    return this;
  }

  maybeSingle() {
    return this.executeSingle();
  }

  single() {
    return this.executeSingle();
  }

  private execute() {
    let data: unknown[] = [];
    if (this.tableName === "projects") {
      data = mockProjects;
    } else if (this.tableName === "tasks") {
      data = mockTasks;
    } else if (this.tableName === "memberships") {
      data = mockMemberships;
    } else if (this.tableName === "profiles") {
      data = mockProfiles;
    }

    // Apply filters
    for (const f of this.filters) {
      data = data.filter((row) => {
        const r = row as Record<string, unknown>;
        return r[f.col] === f.val;
      });
    }

    return { data, error: null };
  }

  private executeSingle() {
    const { data } = this.execute();
    if (data.length === 0) {
      return { data: null, error: { message: "Not found" } };
    }
    return { data: data[0], error: null };
  }

  then(onfulfilled?: (value: any) => any) {
    const res = this.execute();
    if (onfulfilled) {
      return Promise.resolve(res).then(onfulfilled);
    }
    return Promise.resolve(res);
  }
}

mock.module("../lib/insforge-server", () => {
  return {
    createInsforgeServer: (userId?: string) => {
      return {
        database: {
          from: (tableName: string) => {
            return {
              select: (columns?: string) => {
                return new MockQueryBuilder(tableName);
              },
              insert: (rows: Record<string, unknown>[]) => {
                if (tableName === "tasks") {
                  const inserted = rows.map((r) => ({
                    id: r.id || crypto.randomUUID(),
                    ...r,
                  }));
                  mockTasks.push(...inserted);
                  return {
                    select: () => ({
                      single: () => ({ data: inserted[0], error: null }),
                    }),
                    then: (resolve: (val: any) => void) => resolve({ data: inserted, error: null }),
                  };
                }
                return {
                  select: () => ({
                    single: () => ({ data: rows[0], error: null }),
                  }),
                  then: (resolve: (val: any) => void) => resolve({ data: rows, error: null }),
                };
              },
              update: (payload: Record<string, unknown>) => {
                if (tableName === "tasks" && dbTriggerShouldError) {
                  const errorRes = {
                    select: () => ({
                      single: () => ({ data: null, error: { message: dbTriggerErrorMessage } }),
                    }),
                    then: (resolve: (val: any) => void) => resolve({ error: { message: dbTriggerErrorMessage }, data: null }),
                  };
                  return {
                    eq: (col1: string, val1: unknown) => ({
                      eq: (col2: string, val2: unknown) => errorRes,
                      select: () => errorRes,
                      then: (resolve: any) => resolve(errorRes),
                    }),
                  };
                }

                return {
                  eq: (col1: string, val1: unknown) => {
                    const updateMatching = (col2?: string, val2?: unknown) => {
                      let updated: any = null;
                      if (tableName === "tasks") {
                        mockTasks = mockTasks.map((t) => {
                          const match1 = t[col1] === val1;
                          const match2 = col2 ? t[col2] === val2 : true;
                          return match1 && match2 ? { ...t, ...payload } : t;
                        });
                        updated = mockTasks.find((t) => {
                          const match1 = t[col1] === val1;
                          const match2 = col2 ? t[col2] === val2 : true;
                          return match1 && match2;
                        });
                      } else if (tableName === "projects") {
                        mockProjects = mockProjects.map((p) => {
                          const match1 = p[col1] === val1;
                          const match2 = col2 ? p[col2] === val2 : true;
                          return match1 && match2 ? { ...p, ...payload } : p;
                        });
                        updated = mockProjects.find((p) => {
                          const match1 = p[col1] === val1;
                          const match2 = col2 ? p[col2] === val2 : true;
                          return match1 && match2;
                        });
                      }

                      const res = {
                        select: () => ({
                          single: () => ({ data: updated || null, error: updated ? null : { message: "Record not found" } }),
                        }),
                        then: (resolve: (val: any) => void) => resolve({ error: null, data: updated }),
                      };
                      return res;
                    };

                    return {
                      eq: (col2: string, val2: unknown) => updateMatching(col2, val2),
                      select: () => updateMatching(),
                      then: (resolve: any) => resolve(updateMatching()),
                    };
                  },
                };
              },
            };
          },
        },
      };
    },
  };
});

// ─────────────────────────────────────────────────────────────────────────────
// Test Suite Setup
// ─────────────────────────────────────────────────────────────────────────────

const PROJ_ID = "6ba7b810-9dad-11d1-80b4-00c04fd430c8";
const ORG_ID = "f47ac10b-58cc-4372-a567-0e02b2c3d479";
const TASK_ID = "550e8400-e29b-41d4-a716-446655440000";

beforeEach(() => {
  globalThis.activeTestFile = "custom";
  mockProjects = [];
  mockTasks = [];
  mockMemberships = [
    { id: "mem_1", user_id: "owner_123", role: "OWNER", organization_id: "org_123" },
    { id: "mem_2", user_id: "owner_123", role: "OWNER", organization_id: ORG_ID }
  ];
  mockProfiles = [{ id: "owner_123", full_name: "Owner User" }];
  dbTriggerShouldError = false;
  dbTriggerErrorMessage = "";
});

afterEach(() => {
  globalThis.activeTestFile = undefined;
});

// ─────────────────────────────────────────────────────────────────────────────
// Tests
// ─────────────────────────────────────────────────────────────────────────────

test("createTask enforces project-scoped custom status lists", async () => {
  // Set up project with custom statuses: ['Draft', 'Review', 'Approved']
  mockProjects.push({
    id: PROJ_ID,
    organization_id: ORG_ID,
    name: "Custom Workflow Project",
    status: "ACTIVE",
    custom_statuses: ["Draft", "Review", "Approved"],
  });

  // 1. Task creation with allowed custom status should succeed
  const resSuccess = await createTask(
    PROJ_ID,
    ORG_ID,
    "Task 1",
    "Description 1",
    "Draft", // allowed
    "MEDIUM",
    null,
    null
  );
  if (!resSuccess.success) {
    console.log("createTask Success Case Error:", resSuccess.error);
  }
  expect(resSuccess.success).toBe(true);

  // 2. Task creation with invalid status should fail
  const resFail = await createTask(
    PROJ_ID,
    ORG_ID,
    "Task 2",
    "Description 2",
    "TODO", // not in the allowed custom statuses
    "MEDIUM",
    null,
    null
  );
  expect(resFail.success).toBe(false);
  expect(resFail.error).toContain("Invalid status");
});

test("updateTask validates linear transition rules at application layer", async () => {
  mockProjects.push({
    id: PROJ_ID,
    organization_id: ORG_ID,
    name: "Custom Workflow Project",
    status: "ACTIVE",
    custom_statuses: ["Draft", "Review", "Approved", "Published"],
  });

  mockTasks.push({
    id: TASK_ID,
    project_id: PROJ_ID,
    organization_id: ORG_ID,
    title: "Transition Task",
    status: "Review", // index 1
    priority: "MEDIUM",
    assignee_id: null,
    sprint_id: null,
  });

  // 1. Valid transition forward by 1 step (Review -> Approved) should succeed
  const resForward = await updateTask(TASK_ID, PROJ_ID, ORG_ID, { status: "Approved" });
  if (!resForward.success) {
    console.log("updateTask Forward Error:", resForward.error);
  }
  expect(resForward.success).toBe(true);
  expect(mockTasks[0].status).toBe("Approved");

  // 2. Valid transition resetting to index 0 (Approved -> Draft) should succeed
  const resReset = await updateTask(TASK_ID, PROJ_ID, ORG_ID, { status: "Draft" });
  expect(resReset.success).toBe(true);
  expect(mockTasks[0].status).toBe("Draft");

  // 3. Invalid transition jumping by 2 steps (Draft -> Approved) should fail
  const resJump = await updateTask(TASK_ID, PROJ_ID, ORG_ID, { status: "Approved" });
  expect(resJump.success).toBe(false);
  expect(resJump.error).toContain("Invalid status transition");
  expect(mockTasks[0].status).toBe("Draft"); // should remain unchanged

  // Move task to Review (valid forward 1) for the next test
  await updateTask(TASK_ID, PROJ_ID, ORG_ID, { status: "Review" });

  // 4. Invalid transition backward to an index other than 0 (Approved -> Review)
  // Let's set status to Approved first (index 2)
  await updateTask(TASK_ID, PROJ_ID, ORG_ID, { status: "Approved" });
  // Now try to move it back to Review (index 1) which is backward but not reset to 0
  const resBack = await updateTask(TASK_ID, PROJ_ID, ORG_ID, { status: "Review" });
  expect(resBack.success).toBe(false);
  expect(resBack.error).toContain("Invalid status transition");
  expect(mockTasks[0].status).toBe("Approved"); // should remain Approved
});

test("updateTask handles database-level trigger transition exceptions", async () => {
  mockProjects.push({
    id: PROJ_ID,
    organization_id: ORG_ID,
    name: "Custom Workflow Project",
    status: "ACTIVE",
    custom_statuses: ["Draft", "Review", "Approved"],
  });

  mockTasks.push({
    id: TASK_ID,
    project_id: PROJ_ID,
    organization_id: ORG_ID,
    title: "Transition Task",
    status: "Draft",
    priority: "MEDIUM",
    assignee_id: null,
    sprint_id: null,
  });

  // Enable DB trigger error simulation
  dbTriggerShouldError = true;
  dbTriggerErrorMessage = 'Transition from "Draft" to "Review" is not allowed.';

  // Attempt the update. Even if app-level checks are somehow bypassed, the DB error is caught
  const res = await updateTask(TASK_ID, PROJ_ID, ORG_ID, { status: "Review" });
  expect(res.success).toBe(false);
  expect(res.error).toBe('Transition from "Draft" to "Review" is not allowed.');
});

test("updateProject guards against workflow updates that leave tasks in incompatible states", async () => {
  mockProjects.push({
    id: PROJ_ID,
    organization_id: ORG_ID,
    name: "Custom Workflow Project",
    status: "ACTIVE",
    custom_statuses: ["Draft", "Review", "Approved"],
  });

  // Task in Review state
  mockTasks.push({
    id: TASK_ID,
    project_id: PROJ_ID,
    organization_id: ORG_ID,
    title: "Task in Review",
    status: "Review",
    priority: "MEDIUM",
    assignee_id: null,
    sprint_id: null,
  });

  // 1. Attempting to update project workflows to ['Draft', 'Approved'] (omitting Review) should fail
  const resFail = await updateProject(
    PROJ_ID,
    "Updated Project Name",
    "Description",
    "ACTIVE",
    ORG_ID,
    ["Draft", "Approved"]
  );
  if (resFail.success) {
    console.log("updateProject Fail Case unexpected success");
  } else {
    console.log("updateProject Fail Case Error:", resFail.error);
  }
  expect(resFail.success).toBe(false);
  expect(resFail.error).toContain("Cannot update workflow: some tasks have statuses not in the new list");

  // 2. Attempting to update project workflows to ['Draft', 'Review', 'Approved', 'Published'] (including Review) should succeed
  const resSuccess = await updateProject(
    PROJ_ID,
    "Updated Project Name",
    "Description",
    "ACTIVE",
    ORG_ID,
    ["Draft", "Review", "Approved", "Published"]
  );
  if (!resSuccess.success) {
    console.log("updateProject Success Case Error:", resSuccess.error);
  }
  expect(resSuccess.success).toBe(true);
});
