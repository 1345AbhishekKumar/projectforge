import { describe, it, expect, mock, beforeAll } from "bun:test";
import type * as SearchActions from "../actions/search";
import type * as ReportActions from "../actions/report";

// 1. Mock Clerk authentication
mock.module("@clerk/nextjs/server", () => ({
  auth: () => Promise.resolve({ userId: "mock-user-456" }),
}));

// 2. Mock database responses
const mockDbQuery = {
  select: () => mockDbQuery,
  insert: () => mockDbQuery,
  delete: () => mockDbQuery,
  eq: () => mockDbQuery,
  neq: () => mockDbQuery,
  in: () => mockDbQuery,
  ilike: () => mockDbQuery,
  or: () => mockDbQuery,
  order: () => mockDbQuery,
  range: () => mockDbQuery,
  textSearch: () => mockDbQuery,
  limit: () => mockDbQuery,
  gte: () => mockDbQuery,
  lte: () => mockDbQuery,
  single: () => Promise.resolve({ data: { id: "item-123" }, error: null }),
  maybeSingle: () => Promise.resolve({ data: { id: "membership-123" }, error: null }),
  then: (resolve: (value: { data: unknown[]; error: unknown }) => void) => {
    // Return empty arrays or mock structures for general calls
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

describe("Advanced Search & Reporting Server Actions", () => {
  let searchActions: typeof SearchActions;
  let reportActions: typeof ReportActions;

  beforeAll(async () => {
    searchActions = await import("../actions/search");
    reportActions = await import("../actions/report");
  });

  describe("Search Actions", () => {
    it("should successfully run advanced search", async () => {
      const res = await searchActions.advancedSearch("Setup", {}, "00000000-0000-0000-0000-000000000000");
      expect(res.success).toBe(true);
      expect(res.data).toBeDefined();
      expect(res.data?.projects).toEqual([]);
      expect(res.data?.tasks).toEqual([]);
      expect(res.data?.comments).toEqual([]);
    });

    it("should successfully save a search query", async () => {
      const res = await searchActions.saveSearch("My Search", "Setup", {}, "00000000-0000-0000-0000-000000000000");
      expect(res.success).toBe(true);
    });
  });

  describe("Reporting Actions", () => {
    it("should successfully compile reporting data", async () => {
      const res = await reportActions.getReportingData("00000000-0000-0000-0000-000000000000");
      expect(res.success).toBe(true);
      expect(res.data).toBeDefined();
      expect(res.data?.productivity).toEqual([]);
      expect(res.data?.projectHealth).toEqual([]);
      expect(res.data?.workload).toEqual([]);
    });

    it("should successfully export reporting CSV", async () => {
      const res = await reportActions.exportReportCSV("00000000-0000-0000-0000-000000000000");
      expect(res.success).toBe(true);
      expect(res.data).toContain("ProjectForge");
    });
  });
});
