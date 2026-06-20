/* eslint-disable @typescript-eslint/no-unused-vars */
import { describe, it, expect, mock, beforeAll } from "bun:test";
import type * as ProjectActions from "../actions/project";
import type * as TaskMutationActions from "../actions/taskMutation";

// Mock Clerk authentication
mock.module("@clerk/nextjs/server", () => ({
  auth: () => Promise.resolve({ userId: "mock-user-789" }),
}));

// Mock Next.js cache and server functions
mock.module("next/cache", () => ({
  revalidatePath: () => {},
  revalidateTag: () => {},
}));

mock.module("next/server", () => ({
  after: (cb: () => unknown) => {
    try {
      cb();
    } catch (e) {
      console.warn("Ignored error inside after() mock callback:", e);
    }
  },
}));

const ORG_ID = "1a2b3c4d-5e6f-4a0f-8b1c-2d3e4f5a6b7c";
const PROJECT_ID = "9e8d7c6b-5a4f-4b0e-9c8d-7e6f5a4b3c2d";
const TEMPLATE_ID = "e2d1c0b9-a8f7-4e6e-bd5c-4b3a2f1e0d9c";

const TASK_DNS_ID = "a1b2c3d4-e5f6-47a8-9b0c-1d2e3f4a5b6c";
const TASK_DB_ID = "b2c3d4e5-f6a7-48b9-ac0d-1e2f3a4b5c6d";
const TASK_UI_ID = "c3d4e5f6-a7b8-49c9-bd0e-1f2a3b4c5d6e";
const TASK_LAUNCH_ID = "d4e5f6a7-b8c9-4ad0-be0f-1f2a3b4c5d6e";

// Setup mock state for database queries
const mockProjectTemplates = [
  {
    id: TEMPLATE_ID,
    name: "Website Launch",
    description: "Mock Launch Template",
    tasks_schema: {
      custom_statuses: ["PLANNING", "DEVELOPMENT", "REVIEW", "LAUNCHED"],
      tasks: [
        {
          key: "DNS",
          title: "Configure Webserver & Domain",
          description: "Configure DNS records",
          status: "PLANNING",
          priority: "HIGH",
          assignee_role: "OWNER",
        },
        {
          key: "DB",
          title: "Configure Database & RLS",
          description: "Scaffold schema",
          status: "DEVELOPMENT",
          priority: "URGENT",
          assignee_role: "ADMIN",
        },
        {
          key: "UI",
          title: "Develop Core UI Features",
          description: "Develop landing pages",
          status: "DEVELOPMENT",
          priority: "HIGH",
          assignee_role: "MEMBER",
          dependencies: ["DNS"],
        },
        {
          key: "LAUNCH",
          title: "Execute Final Launch & Verification",
          description: "Verify all endpoints",
          status: "REVIEW",
          priority: "HIGH",
          assignee_role: "OWNER",
          dependencies: ["DB", "UI"],
        },
      ],
    },
  },
];

const mockTasks = [
  {
    id: TASK_DNS_ID,
    project_id: PROJECT_ID,
    organization_id: ORG_ID,
    title: "Configure Webserver & Domain",
    status: "PLANNING",
    priority: "HIGH",
  },
  {
    id: TASK_DB_ID,
    project_id: PROJECT_ID,
    organization_id: ORG_ID,
    title: "Configure Database & RLS",
    status: "DEVELOPMENT",
    priority: "URGENT",
  },
  {
    id: TASK_UI_ID,
    project_id: PROJECT_ID,
    organization_id: ORG_ID,
    title: "Develop Core UI Features",
    status: "DEVELOPMENT",
    priority: "HIGH",
  },
  {
    id: TASK_LAUNCH_ID,
    project_id: PROJECT_ID,
    organization_id: ORG_ID,
    title: "Execute Final Launch & Verification",
    status: "REVIEW",
    priority: "HIGH",
  },
];

const mockDependencies = [
  {
    id: "dep-1",
    source_task_id: TASK_DNS_ID,
    target_task_id: TASK_UI_ID,
    dependency_type: "BLOCKS",
  },
  {
    id: "dep-2",
    source_task_id: TASK_DB_ID,
    target_task_id: TASK_LAUNCH_ID,
    dependency_type: "BLOCKS",
  },
  {
    id: "dep-3",
    source_task_id: TASK_UI_ID,
    target_task_id: TASK_LAUNCH_ID,
    dependency_type: "BLOCKS",
  },
];

// Mock database client
class MockDbQuery {
  table: string;
  criteria: Record<string, unknown> = {};
  insertData: unknown = null;
  updateData: unknown = null;

  constructor(table: string) {
    this.table = table;
  }

  select(_cols: string) {
    return this;
  }

  insert(data: unknown) {
    this.insertData = data;
    return this;
  }

  update(data: unknown) {
    this.updateData = data;
    return this;
  }

  delete() {
    return this;
  }

  eq(col: string, val: unknown) {
    this.criteria[col] = val;
    return this;
  }

  neq(_col: string, _val: unknown) {
    return this;
  }

  in(col: string, vals: unknown) {
    this.criteria[col] = vals;
    return this;
  }

  order(_col: string, _opts?: unknown) {
    return this;
  }

  async single() {
    if (this.table === "project_templates") {
      const id = this.criteria.id as string;
      const t = mockProjectTemplates.find((x) => x.id === id);
      return { data: t, error: null };
    }
    if (this.table === "projects") {
      return {
        data: {
          id: PROJECT_ID,
          name: "Website Launch Project",
          custom_statuses: ["PLANNING", "DEVELOPMENT", "REVIEW", "LAUNCHED"],
        },
        error: null,
      };
    }
    if (this.table === "tasks") {
      if (this.insertData) {
        const inserted = (Array.isArray(this.insertData) ? this.insertData[0] : this.insertData) as { title?: string } | null;
        const title = inserted?.title;
        const match = mockTasks.find((t) => t.title === title);
        return { data: match || { id: "mock-id-123" }, error: null };
      }
      const taskId = this.criteria.id as string;
      if (this.updateData) {
        const idx = mockTasks.findIndex((t) => t.id === taskId);
        if (idx !== -1) {
          mockTasks[idx] = { ...mockTasks[idx], ...(this.updateData as Record<string, unknown>) };
          return { data: mockTasks[idx], error: null };
        }
      }
      const t = mockTasks.find((x) => x.id === taskId);
      return { data: t, error: null };
    }
    if (this.table === "profiles") {
      return { data: { full_name: "Mock Assignee" }, error: null };
    }
    return { data: { id: "mock-id" }, error: null };
  }

  async maybeSingle() {
    if (this.table === "memberships") {
      return { data: { id: "membership-123" }, error: null };
    }
    return this.single();
  }

  then(onFulfilled: (value: unknown) => void, onRejected?: (reason: unknown) => void) {
    let result: unknown;
    if (this.table === "project_templates") {
      result = { data: mockProjectTemplates, error: null };
    } else if (this.table === "task_dependencies") {
      if (this.insertData) {
        result = { data: this.insertData, error: null };
      } else {
        const targetTaskId = this.criteria.target_task_id as string;
        const deps = mockDependencies.filter((d) => d.target_task_id === targetTaskId);
        const mapped = deps.map((d) => {
          const sourceTask = mockTasks.find((t) => t.id === d.source_task_id);
          return { source_task: sourceTask };
        });
        result = { data: mapped, error: null };
      }
    } else if (this.table === "memberships") {
      result = { data: [{ user_id: "user-1", role: "OWNER" }], error: null };
    } else {
      result = { data: [], error: null };
    }
    return Promise.resolve(result).then(onFulfilled, onRejected);
  }
}

mock.module("@/lib/insforge-server", () => ({
  createInsforgeServer: () => ({
    database: {
      from: (table: string) => new MockDbQuery(table),
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
    error: (...args: unknown[]) => console.error("LOGGER ERROR:", ...args),
    warn: () => {},
    debug: () => {},
  },
  flushLogsAfterResponse: () => {},
}));

describe("Feature 3.8: Dependency & Project Templates Verification", () => {
  let projectActions: typeof ProjectActions;
  let taskMutationActions: typeof TaskMutationActions;

  beforeAll(async () => {
    projectActions = await import("../actions/project");
    taskMutationActions = await import("../actions/taskMutation");
  });

  describe("Project Templates Scaffolding", () => {
    it("should successfully fetch templates", async () => {
      const res = await projectActions.getProjectTemplates();
      expect(res.success).toBe(true);
      expect(res.data).toBeDefined();
      expect(res.data?.[0]?.name).toBe("Website Launch");
    });

    it("should successfully create project from template and scaffold tasks", async () => {
      const res = await projectActions.createProject(
        "Website Launch Test",
        "Scaffolding from template",
        "PLANNING",
        ORG_ID,
        null,
        TEMPLATE_ID
      );
      console.log("createProject result:", res);
      expect(res.success).toBe(true);
      expect(res.data?.projectId).toBeDefined();
    });
  });

  describe("Task Dependency Blocking", () => {
    it("should block completion of task with unresolved blockers", async () => {
      // TASK_LAUNCH_ID is blocked by TASK_DB_ID (status: DEVELOPMENT) and TASK_UI_ID (status: DEVELOPMENT)
      const res = await taskMutationActions.updateTask(
        TASK_LAUNCH_ID,
        PROJECT_ID,
        ORG_ID,
        { status: "LAUNCHED" }
      );
      console.log("updateTask 1 result:", res);
      expect(res.success).toBe(false);
      expect(res.error).toContain("Cannot complete task because it is blocked by");
      expect(res.error).toContain("Configure Database & RLS");
      expect(res.error).toContain("Develop Core UI Features");
    });

    it("should allow completion of task once blockers are resolved", async () => {
      // Resolve blockers by setting their status to LAUNCHED (completed status)
      mockTasks[1].status = "LAUNCHED"; // task-db
      mockTasks[2].status = "LAUNCHED"; // task-ui

      const res = await taskMutationActions.updateTask(
        TASK_LAUNCH_ID,
        PROJECT_ID,
        ORG_ID,
        { status: "LAUNCHED" }
      );
      console.log("updateTask 2 result:", res);
      expect(res.success).toBe(true);
    });
  });
});
