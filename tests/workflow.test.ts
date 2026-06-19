import { test, expect, mock } from "bun:test";
import { matchConditions, triggerWorkflowEvent } from "../lib/workflows/engine";
import { clearTriggerCache, isTriggerActive } from "../lib/workflows/cache";

// ─────────────────────────────────────────────────────────────────────────────
// Mocking createInsforgeServer using a robust MockQueryBuilder
// ─────────────────────────────────────────────────────────────────────────────
interface MockWorkflow {
  id: string;
  organization_id: string;
  name: string;
  trigger: string;
  conditions: Record<string, unknown>;
  actions: { type: string; data: Record<string, unknown> }[];
  enabled: boolean;
}

interface MockTask {
  id: string;
  project_id: string;
  organization_id: string;
  title: string;
  status: string;
  priority: string;
  assignee_id?: string | null;
}

interface MockActivity {
  organization_id: string;
  project_id: string | null;
  user_id: string;
  action_type: string;
  metadata: Record<string, unknown>;
}

interface MockNotification {
  user_id: string;
  content: string;
  type: string;
  is_read: boolean;
}

let mockWorkflows: MockWorkflow[] = [];
let mockTasks: MockTask[] = [];
let mockActivities: MockActivity[] = [];
const mockNotifications: MockNotification[] = [];

class MockQueryBuilder {
  private tableName: string;
  private filters: { col: string; val: unknown }[] = [];

  constructor(tableName: string) {
    this.tableName = tableName;
  }

  select(_columns: string) {
    return this;
  }

  eq(col: string, val: unknown) {
    this.filters.push({ col, val });
    return this;
  }

  neq(_col: string, _val: unknown) {
    return this;
  }

  limit(_num: number) {
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
    if (this.tableName === "workflows") {
      data = mockWorkflows;
    } else if (this.tableName === "tasks") {
      data = mockTasks;
    } else if (this.tableName === "memberships") {
      data = [{ id: "mem_1", user_id: "owner_123", role: "OWNER", organization_id: "org_123" }];
    } else if (this.tableName === "profiles") {
      data = [{ id: "owner_123", full_name: "Owner User" }];
    }

    // Apply filters
    for (const f of this.filters) {
      data = data.filter((row) => {
        const r = row as Record<string, unknown>;
        const camelCol = f.col.replace(/_([a-z])/g, (g: string) => g[1].toUpperCase());
        const rowVal = r[f.col] !== undefined ? r[f.col] : r[camelCol];
        return rowVal === f.val;
      });
    }

    return { data, error: null };
  }

  private executeSingle() {
    const { data } = this.execute();
    return { data: data[0] || null, error: null };
  }

  then(onfulfilled?: (value: unknown) => unknown) {
    const res = this.execute();
    if (onfulfilled) {
      return Promise.resolve(res).then(onfulfilled);
    }
    return Promise.resolve(res);
  }
}

mock.module("../lib/insforge-server", () => {
  return {
    createInsforgeServer: (_userId?: string) => {
      return {
        database: {
          from: (tableName: string) => {
            return {
              select: (_columns: string) => {
                return new MockQueryBuilder(tableName);
              },
              insert: (rows: Record<string, unknown>[]) => {
                if (tableName === "activities") {
                  mockActivities.push(...(rows as unknown as MockActivity[]));
                } else if (tableName === "tasks") {
                  const inserted = rows.map((r) => ({ id: `task_${Date.now()}`, ...r })) as unknown as MockTask[];
                  mockTasks.push(...inserted);
                  return {
                    select: (_cols: string) => ({
                      single: () => ({ data: inserted[0], error: null }),
                    }),
                  };
                } else if (tableName === "notifications") {
                  mockNotifications.push(...(rows as unknown as MockNotification[]));
                }
                return {
                  select: (_cols: string) => ({
                    single: () => ({ data: rows[0], error: null }),
                  }),
                  then: (resolve: (val: unknown) => void) => resolve({ error: null }),
                };
              },
              update: (payload: Record<string, unknown>) => {
                return {
                  eq: (col: string, val: unknown) => ({
                    eq: (_col2: string, _val2: unknown) => {
                      if (tableName === "tasks") {
                        mockTasks = mockTasks.map((t) => (t.id === val ? { ...t, ...payload } : t));
                        const updated = mockTasks.find((t) => t.id === val);
                        return {
                          select: (_cols: string) => ({
                            single: () => ({ data: updated, error: null }),
                          }),
                        };
                      }
                      return {
                        select: (_cols: string) => ({
                          single: () => ({ data: null, error: null }),
                        }),
                      };
                    },
                  }),
                };
              },
            };
          },
        },
      };
    }
  };
});

// ─────────────────────────────────────────────────────────────────────────────
// Tests
// ─────────────────────────────────────────────────────────────────────────────

test("Condition Matching works correctly", () => {
  expect(matchConditions({ status: "DONE" }, { status: "DONE" })).toBe(true);
  expect(matchConditions({ status: "TODO" }, { status: "DONE" })).toBe(false);
  expect(matchConditions({ task: { status: "DONE" } }, { status: "DONE" })).toBe(true);
  expect(matchConditions({ task: { status: "TODO" } }, { status: "DONE" })).toBe(false);
  expect(matchConditions({ status: "DONE" }, {})).toBe(true);
  expect(matchConditions({ status: "DONE" }, null)).toBe(true);
});

test("Trigger Cache registers active triggers properly", async () => {
  clearTriggerCache();
  mockWorkflows = [
    { id: "wf_c_1", organization_id: "org_123", name: "Create Auto", trigger: "task.created", enabled: true, conditions: {}, actions: [] },
    { id: "wf_c_2", organization_id: "org_123", name: "Complete Auto", trigger: "task.completed", enabled: true, conditions: {}, actions: [] },
    { id: "wf_c_3", organization_id: "org_123", name: "Update Auto", trigger: "task.updated", enabled: false, conditions: {}, actions: [] },
  ];

  expect(await isTriggerActive("org_123", "task.created", "user_123")).toBe(true);
  expect(await isTriggerActive("org_123", "task.updated", "user_123")).toBe(false);
  expect(await isTriggerActive("org_123", "task.completed", "user_123")).toBe(true);
});

test("Engine processes events and respects loop prevention", async () => {
  clearTriggerCache();
  mockWorkflows = [
    {
      id: "wf_1",
      organization_id: "org_123",
      name: "Auto Assign Task",
      trigger: "task.created",
      conditions: {},
      actions: [
        {
          type: "update_task",
          data: { assignee_id: "org_owner" }
        }
      ],
      enabled: true
    }
  ];

  mockTasks = [
    {
      id: "task_abc",
      project_id: "proj_123",
      organization_id: "org_123",
      title: "New Task",
      status: "TODO",
      priority: "MEDIUM",
      assignee_id: null
    }
  ];

  await triggerWorkflowEvent(
    "task.created",
    { task: mockTasks[0] },
    { userId: "user_123", orgId: "org_123" }
  );

  expect(mockTasks[0].assignee_id).toBe("owner_123");

  // Ping-pong status update loop
  clearTriggerCache();
  mockWorkflows = [
    {
      id: "wf_loop_1",
      organization_id: "org_123",
      name: "Ping-Pong Status 1",
      trigger: "task.updated",
      conditions: { status: "DONE" },
      actions: [
        {
          type: "update_task",
          data: { status: "IN_PROGRESS" }
        }
      ],
      enabled: true
    },
    {
      id: "wf_loop_2",
      organization_id: "org_123",
      name: "Ping-Pong Status 2",
      trigger: "task.updated",
      conditions: { status: "IN_PROGRESS" },
      actions: [
        {
          type: "update_task",
          data: { status: "DONE" }
        }
      ],
      enabled: true
    }
  ];

  mockTasks = [
    {
      id: "task_loop",
      project_id: "proj_123",
      organization_id: "org_123",
      title: "Loop Task",
      status: "DONE",
      priority: "MEDIUM"
    }
  ];

  mockActivities = [];

  await triggerWorkflowEvent(
    "task.updated",
    { task: mockTasks[0] },
    { userId: "user_123", orgId: "org_123" }
  );

  expect(mockActivities.length).toBeGreaterThan(0);
  expect(mockActivities[0].action_type).toBe("WORKFLOW_LOOP_ABORTED");
});
