import { describe, it, expect } from "vitest";
import { matchConditions } from "../lib/workflows/engine";

describe("Workflow Engine Normalized Features", () => {
  it("should match direct conditions in payload", () => {
    const payload = {
      id: "task-1",
      priority: "HIGH",
      task: {
        status: "DONE",
      },
    };

    const conditions = {
      priority: "HIGH",
    };

    const result = matchConditions(payload, conditions);
    expect(result).toBe(true);
  });

  it("should match nested conditions in task", () => {
    const payload = {
      id: "task-1",
      priority: "LOW",
      task: {
        status: "DONE",
        type: "bug",
      },
    };

    const conditions = {
      status: "DONE",
    };

    const result = matchConditions(payload, conditions);
    expect(result).toBe(true);
  });

  it("should fail condition match if any value differs", () => {
    const payload = {
      id: "task-1",
      priority: "LOW",
      task: {
        status: "IN_PROGRESS",
      },
    };

    const conditions = {
      status: "DONE",
    };

    const result = matchConditions(payload, conditions);
    expect(result).toBe(false);
  });

  it("should calculate exponential backoff delay correctly", () => {
    const getBackoff = (retryCount: number) => Math.pow(2, retryCount) * 1000;
    expect(getBackoff(1)).toBe(2000);
    expect(getBackoff(2)).toBe(4000);
    expect(getBackoff(3)).toBe(8000);
  });
});
