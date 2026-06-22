"use server";

import * as Sentry from "@sentry/nextjs";
import { auth } from "@clerk/nextjs/server";
import { createInsforgeServer } from "@/lib/insforge-server";
import { logger, flushLogsAfterResponse } from "@/lib/logger";
import { z } from "zod";

const publishEventSchema = z.object({
  eventType: z.string().min(2).max(50),
  payload: z.record(z.unknown()),
});

export async function publishEvent(
  eventType: string,
  payload: Record<string, unknown>
): Promise<{ success: boolean; data?: { id: string }; error?: string }> {
  try {
    const authRes = await auth();
    const userId = authRes.userId;
    if (!userId) return { success: false, error: "Unauthorized" };

    const validated = publishEventSchema.safeParse({ eventType, payload });
    if (!validated.success) {
      return { success: false, error: validated.error.issues[0].message };
    }

    const insforge = createInsforgeServer(userId);

    const { data: eventRecord, error } = await insforge.database
      .from("event_queue")
      .insert([
        {
          event_type: validated.data.eventType,
          payload: validated.data.payload,
          status: "PENDING",
          attempts: 0,
        },
      ])
      .select("id")
      .single();

    if (error) {
      logger.error({ error, userId, eventType }, "Failed to publish event to queue");
      return { success: false, error: "Failed to publish event" };
    }

    return { success: true, data: { id: eventRecord.id } };
  } catch (err) {
    logger.error({ error: err, eventType }, "Unexpected error in publishEvent Action");
    Sentry.captureException(err);
    return { success: false, error: "An unexpected error occurred" };
  } finally {
    flushLogsAfterResponse();
  }
}

export async function processEventQueue(): Promise<{
  success: boolean;
  processedCount: number;
  error?: string;
}> {
  try {
    const authRes = await auth();
    const userId = authRes.userId;
    if (!userId) return { success: false, error: "Unauthorized", processedCount: 0 };

    const insforge = createInsforgeServer(userId);

    // Fetch pending events
    const { data: pendingEvents, error: fetchError } = await insforge.database
      .from("event_queue")
      .select("*")
      .eq("status", "PENDING")
      .order("created_at", { ascending: true })
      .limit(10);

    if (fetchError) {
      logger.error({ error: fetchError }, "Failed to fetch pending events");
      return { success: false, error: "Failed to query queue", processedCount: 0 };
    }

    if (!pendingEvents || pendingEvents.length === 0) {
      return { success: true, processedCount: 0 };
    }

    let processedCount = 0;

    for (const event of pendingEvents) {
      const attempts = event.attempts + 1;
      const payload = (event.payload || {}) as Record<string, unknown>;
      const shouldFail = !!payload.shouldFail;

      try {
        if (shouldFail) {
          throw new Error("Simulated consumer execution failure");
        }

        // Process event successfully (mock consumer execution)
        await insforge.database
          .from("event_queue")
          .update({
            status: "COMPLETED",
            attempts,
            processed_at: new Date().toISOString(),
            error_log: null,
          })
          .eq("id", event.id);

        processedCount++;
      } catch (consumerError) {
        const errorMsg = consumerError instanceof Error ? consumerError.message : "Unknown error";
        const newStatus = attempts >= 3 ? "FAILED" : "PENDING"; // Retries max 3 times, then goes to DLQ (FAILED)

        await insforge.database
          .from("event_queue")
          .update({
            status: newStatus,
            attempts,
            error_log: errorMsg,
            processed_at: new Date().toISOString(),
          })
          .eq("id", event.id);

        logger.warn({ eventId: event.id, newStatus, attempts, errorMsg }, "Event consumer processing failed");
        processedCount++;
      }
    }

    return { success: true, processedCount };
  } catch (err) {
    logger.error({ error: err }, "Unexpected error in processEventQueue Action");
    Sentry.captureException(err);
    return { success: false, error: "An unexpected error occurred", processedCount: 0 };
  } finally {
    flushLogsAfterResponse();
  }
}

export async function getEventQueueLogs(): Promise<{
  success: boolean;
  data: unknown[];
  error?: string;
}> {
  try {
    const authRes = await auth();
    const userId = authRes.userId;
    if (!userId) return { success: false, error: "Unauthorized", data: [] };

    const insforge = createInsforgeServer(userId);

    const { data, error } = await insforge.database
      .from("event_queue")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(30);

    if (error) {
      logger.error({ error }, "Failed to fetch event queue logs");
      return { success: false, error: "Failed to query queue logs", data: [] };
    }

    return { success: true, data: data || [] };
  } catch (err) {
    logger.error({ error: err }, "Unexpected error in getEventQueueLogs Action");
    Sentry.captureException(err);
    return { success: false, error: "An unexpected error occurred", data: [] };
  } finally {
    flushLogsAfterResponse();
  }
}
