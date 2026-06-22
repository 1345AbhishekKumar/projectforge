import { describe, it, expect } from "vitest";

interface EventMock {
  id: string;
  event_type: string;
  payload: Record<string, unknown>;
  status: "PENDING" | "COMPLETED" | "FAILED";
  attempts: number;
  error_log?: string | null;
  processed_at?: string | null;
}

// Simulates the processEventQueue server action logic
function mockProcessEvent(event: EventMock): EventMock {
  const attempts = event.attempts + 1;
  const payload = event.payload || {};
  const shouldFail = !!payload.shouldFail;

  try {
    if (shouldFail) {
      throw new Error("Simulated consumer execution failure");
    }

    return {
      ...event,
      status: "COMPLETED",
      attempts,
      processed_at: new Date().toISOString(),
      error_log: null,
    };
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : "Unknown error";
    const newStatus = attempts >= 3 ? "FAILED" : "PENDING";

    return {
      ...event,
      status: newStatus,
      attempts,
      error_log: errorMsg,
      processed_at: new Date().toISOString(),
    };
  }
}

describe("Event Bus Retry Queue & DLQ Logic", () => {
  it("should process an event successfully on first attempt", () => {
    const event: EventMock = {
      id: "event-1",
      event_type: "task.completed",
      payload: { id: "task-123", title: "Test task" },
      status: "PENDING",
      attempts: 0,
    };

    const result = mockProcessEvent(event);

    expect(result.status).toBe("COMPLETED");
    expect(result.attempts).toBe(1);
    expect(result.error_log).toBeNull();
    expect(result.processed_at).toBeTruthy();
  });

  it("should increment attempts and remain PENDING on failure under 3 attempts", () => {
    const event: EventMock = {
      id: "event-2",
      event_type: "project.created",
      payload: { id: "proj-123", shouldFail: true },
      status: "PENDING",
      attempts: 0,
    };

    // First attempt
    let result = mockProcessEvent(event);
    expect(result.status).toBe("PENDING");
    expect(result.attempts).toBe(1);
    expect(result.error_log).toBe("Simulated consumer execution failure");

    // Second attempt
    result = mockProcessEvent(result);
    expect(result.status).toBe("PENDING");
    expect(result.attempts).toBe(2);
    expect(result.error_log).toBe("Simulated consumer execution failure");
  });

  it("should move to FAILED (DLQ) status on the third consecutive failure", () => {
    const event: EventMock = {
      id: "event-3",
      event_type: "project.created",
      payload: { id: "proj-456", shouldFail: true },
      status: "PENDING",
      attempts: 2, // Already failed twice
    };

    const result = mockProcessEvent(event);

    expect(result.status).toBe("FAILED"); // Landed in DLQ
    expect(result.attempts).toBe(3);
    expect(result.error_log).toBe("Simulated consumer execution failure");
    expect(result.processed_at).toBeTruthy();
  });
});
