"use server";

import { auth } from "@clerk/nextjs/server";
import { after } from "next/server";
import { revalidatePath } from "next/cache";
import { createInsforgeServer } from "@/lib/insforge-server";
import { writeAuditLog } from "@/lib/audit";
import { logger, flushLogsAfterResponse } from "@/lib/logger";
import * as Sentry from "@sentry/nextjs";
import { z } from "zod";
import { orgIdSchema, taskIdSchema, uuidSchema, DEFAULT_PAGE_SIZE } from "@/lib/utils";

// ─── Zod Schemas ─────────────────────────────────────────────────────────────

const startTimerSchema = z.object({
  taskId: taskIdSchema,
  orgId: orgIdSchema,
});

const stopTimerSchema = z.object({
  entryId: uuidSchema,
});

const manualEntrySchema = z
  .object({
    taskId: taskIdSchema,
    orgId: orgIdSchema,
    startTime: z.string().datetime({ message: "Invalid start time" }),
    endTime: z.string().datetime({ message: "Invalid end time" }),
    description: z.string().max(500).optional(),
  })
  .refine(
    (data) => new Date(data.startTime) < new Date(data.endTime),
    { message: "Start time must be before end time", path: ["startTime"] }
  )
  .refine(
    (data) => new Date(data.endTime) <= new Date(),
    { message: "End time cannot be in the future", path: ["endTime"] }
  )
  .refine(
    (data) => new Date(data.startTime) <= new Date(),
    { message: "Start time cannot be in the future", path: ["startTime"] }
  );

const deleteEntrySchema = z.object({ entryId: uuidSchema });

const getUserEntriesSchema = z.object({
  orgId: orgIdSchema,
  from: z.string().datetime().optional(),
  to: z.string().datetime().optional(),
  targetUserId: z.string().optional(),
});

// ─── Start Timer ─────────────────────────────────────────────────────────────

export async function startTimer(
  taskId: string,
  orgId: string
): Promise<{ success: boolean; data?: { entryId: string }; error?: string }> {
  const validated = startTimerSchema.safeParse({ taskId, orgId });
  if (!validated.success) return { success: false, error: validated.error.issues[0].message };

  try {
    const { userId } = await auth();
    if (!userId) return { success: false, error: "Unauthorized" };

    const insforge = createInsforgeServer(userId);

    // Guard: only one active timer per user
    const { data: existing } = await insforge.database
      .from("time_entries")
      .select("id, task_id")
      .eq("user_id", userId)
      .is("end_time", null)
      .maybeSingle();

    if (existing) {
      return {
        success: false,
        error: "You already have an active timer running. Stop it first.",
      };
    }

    const { data: entry, error } = await insforge.database
      .from("time_entries")
      .insert([
        {
          task_id: validated.data.taskId,
          user_id: userId,
          start_time: new Date().toISOString(),
          end_time: null,
          duration: null,
        },
      ])
      .select("id")
      .single();

    if (error || !entry) {
      logger.error({ error, taskId }, "Failed to start timer");
      return { success: false, error: "Failed to start timer" };
    }

    revalidatePath("/time");
    return { success: true, data: { entryId: entry.id } };
  } catch (err) {
    logger.error({ error: err, taskId }, "Unexpected error in startTimer");
    Sentry.captureException(err);
    return { success: false, error: "An unexpected error occurred" };
  } finally {
    flushLogsAfterResponse();
  }
}

// ─── Stop Timer ──────────────────────────────────────────────────────────────

export async function stopTimer(
  entryId: string
): Promise<{ success: boolean; data?: { duration: number }; error?: string }> {
  const validated = stopTimerSchema.safeParse({ entryId });
  if (!validated.success) return { success: false, error: validated.error.issues[0].message };

  try {
    const { userId } = await auth();
    if (!userId) return { success: false, error: "Unauthorized" };

    const insforge = createInsforgeServer(userId);

    const { data: entry } = await insforge.database
      .from("time_entries")
      .select("id, start_time, user_id")
      .eq("id", validated.data.entryId)
      .eq("user_id", userId)
      .is("end_time", null)
      .maybeSingle();

    if (!entry) return { success: false, error: "No active timer found with that ID." };

    const endTime = new Date();
    const startTime = new Date(entry.start_time);
    const duration = Math.floor((endTime.getTime() - startTime.getTime()) / 1000);

    const { error } = await insforge.database
      .from("time_entries")
      .update({ end_time: endTime.toISOString(), duration })
      .eq("id", validated.data.entryId)
      .eq("user_id", userId);

    if (error) {
      logger.error({ error, entryId }, "Failed to stop timer");
      return { success: false, error: "Failed to stop timer" };
    }

    revalidatePath("/time");
    return { success: true, data: { duration } };
  } catch (err) {
    logger.error({ error: err, entryId }, "Unexpected error in stopTimer");
    Sentry.captureException(err);
    return { success: false, error: "An unexpected error occurred" };
  } finally {
    flushLogsAfterResponse();
  }
}

// ─── Create Manual Entry ─────────────────────────────────────────────────────

export async function createManualEntry(
  taskId: string,
  orgId: string,
  startTime: string,
  endTime: string,
  description?: string
): Promise<{ success: boolean; data?: { entryId: string }; error?: string }> {
  const validated = manualEntrySchema.safeParse({ taskId, orgId, startTime, endTime, description });
  if (!validated.success) return { success: false, error: validated.error.issues[0].message };

  try {
    const { userId } = await auth();
    if (!userId) return { success: false, error: "Unauthorized" };

    const insforge = createInsforgeServer(userId);

    const start = new Date(validated.data.startTime);
    const end = new Date(validated.data.endTime);
    const duration = Math.floor((end.getTime() - start.getTime()) / 1000);

    const { data: entry, error } = await insforge.database
      .from("time_entries")
      .insert([
        {
          task_id: validated.data.taskId,
          user_id: userId,
          start_time: validated.data.startTime,
          end_time: validated.data.endTime,
          duration,
          description: validated.data.description ?? null,
        },
      ])
      .select("id")
      .single();

    if (error || !entry) {
      logger.error({ error, taskId }, "Failed to create manual time entry");
      return { success: false, error: "Failed to create time entry" };
    }

    revalidatePath("/time");
    return { success: true, data: { entryId: entry.id } };
  } catch (err) {
    logger.error({ error: err, taskId }, "Unexpected error in createManualEntry");
    Sentry.captureException(err);
    return { success: false, error: "An unexpected error occurred" };
  } finally {
    flushLogsAfterResponse();
  }
}

// ─── Get Task Time Entries ────────────────────────────────────────────────────

export async function getTaskTimeEntries(taskId: string): Promise<{
  success: boolean;
  data: Array<{
    id: string;
    user_id: string;
    start_time: string;
    end_time: string | null;
    duration: number | null;
    description: string | null;
    created_at: string;
  }>;
  error?: string;
}> {
  const validated = taskIdSchema.safeParse(taskId);
  if (!validated.success) return { success: false, data: [], error: "Invalid task ID" };

  try {
    const { userId } = await auth();
    if (!userId) return { success: false, data: [], error: "Unauthorized" };

    const insforge = createInsforgeServer(userId);

    const { data, error } = await insforge.database
      .from("time_entries")
      .select("id, user_id, start_time, end_time, duration, description, created_at")
      .eq("task_id", validated.data)
      .order("start_time", { ascending: false });

    if (error) {
      logger.error({ error, taskId }, "Failed to fetch task time entries");
      return { success: false, data: [], error: "Failed to fetch time entries" };
    }

    return { success: true, data: data ?? [] };
  } catch (err) {
    logger.error({ error: err, taskId }, "Unexpected error in getTaskTimeEntries");
    Sentry.captureException(err);
    return { success: false, data: [], error: "An unexpected error occurred" };
  } finally {
    flushLogsAfterResponse();
  }
}

// ─── Get Active Timer ─────────────────────────────────────────────────────────

export async function getActiveTimer(): Promise<{
  success: boolean;
  data: { id: string; task_id: string; start_time: string } | null;
  error?: string;
}> {
  try {
    const { userId } = await auth();
    if (!userId) return { success: false, data: null, error: "Unauthorized" };

    const insforge = createInsforgeServer(userId);

    const { data, error } = await insforge.database
      .from("time_entries")
      .select("id, task_id, start_time")
      .eq("user_id", userId)
      .is("end_time", null)
      .maybeSingle();

    if (error) {
      logger.error({ error }, "Failed to fetch active timer");
      return { success: false, data: null, error: "Failed to fetch active timer" };
    }

    return { success: true, data: data ?? null };
  } catch (err) {
    logger.error({ error: err }, "Unexpected error in getActiveTimer");
    Sentry.captureException(err);
    return { success: false, data: null, error: "An unexpected error occurred" };
  } finally {
    flushLogsAfterResponse();
  }
}

// ─── Delete Time Entry ────────────────────────────────────────────────────────

export async function deleteTimeEntry(
  entryId: string,
  orgId: string
): Promise<{ success: boolean; error?: string }> {
  const validated = deleteEntrySchema.safeParse({ entryId });
  if (!validated.success) return { success: false, error: validated.error.issues[0].message };

  try {
    const { userId } = await auth();
    if (!userId) return { success: false, error: "Unauthorized" };

    const insforge = createInsforgeServer(userId);

    const { error } = await insforge.database
      .from("time_entries")
      .delete()
      .eq("id", validated.data.entryId);

    if (error) {
      logger.error({ error, entryId }, "Failed to delete time entry");
      return { success: false, error: "Failed to delete time entry" };
    }

    after(() =>
      writeAuditLog(orgId, userId, "time_entry.deleted", "time_entry", entryId, {})
    );

    revalidatePath("/time");
    return { success: true };
  } catch (err) {
    logger.error({ error: err, entryId }, "Unexpected error in deleteTimeEntry");
    Sentry.captureException(err);
    return { success: false, error: "An unexpected error occurred" };
  } finally {
    flushLogsAfterResponse();
  }
}

// ─── Get User Time Entries (for /time dashboard) ──────────────────────────────

export async function getUserTimeEntries(
  orgId: string,
  from?: string,
  to?: string,
  targetUserId?: string
): Promise<{
  success: boolean;
  data: Array<{
    id: string;
    task_id: string;
    task_title: string;
    user_id: string;
    start_time: string;
    end_time: string | null;
    duration: number | null;
    description: string | null;
    created_at: string;
  }>;
  error?: string;
}> {
  const validated = getUserEntriesSchema.safeParse({ orgId, from, to, targetUserId });
  if (!validated.success) return { success: false, data: [], error: validated.error.issues[0].message };

  try {
    const { userId } = await auth();
    if (!userId) return { success: false, data: [], error: "Unauthorized" };

    const insforge = createInsforgeServer(userId);

    // Determine whose entries to load
    const filterUserId = validated.data.targetUserId ?? userId;

    let query = insforge.database
      .from("time_entries")
      .select(
        `id, task_id, user_id, start_time, end_time, duration, description, created_at,
         tasks!inner(title, organization_id)`
      )
      .eq("tasks.organization_id", validated.data.orgId)
      .eq("user_id", filterUserId)
      .order("start_time", { ascending: false })
      .limit(DEFAULT_PAGE_SIZE);

    if (validated.data.from) {
      query = query.gte("start_time", validated.data.from);
    }
    if (validated.data.to) {
      query = query.lte("start_time", validated.data.to);
    }

    const { data, error } = await query;

    if (error) {
      logger.error({ error, orgId }, "Failed to fetch user time entries");
      return { success: false, data: [], error: "Failed to fetch time entries" };
    }

    const mapped = (data ?? []).map((row: Record<string, unknown>) => ({
      id: row.id as string,
      task_id: row.task_id as string,
      task_title: ((row.tasks as Record<string, unknown>)?.title as string) ?? "Unknown Task",
      user_id: row.user_id as string,
      start_time: row.start_time as string,
      end_time: row.end_time as string | null,
      duration: row.duration as number | null,
      description: row.description as string | null,
      created_at: row.created_at as string,
    }));

    return { success: true, data: mapped };
  } catch (err) {
    logger.error({ error: err, orgId }, "Unexpected error in getUserTimeEntries");
    Sentry.captureException(err);
    return { success: false, data: [], error: "An unexpected error occurred" };
  } finally {
    flushLogsAfterResponse();
  }
}

// ─── Get Task Total Time ──────────────────────────────────────────────────────

export async function getTaskTotalTime(
  taskId: string
): Promise<{ success: boolean; totalSeconds: number; error?: string }> {
  const validated = taskIdSchema.safeParse(taskId);
  if (!validated.success) return { success: false, totalSeconds: 0, error: "Invalid task ID" };

  try {
    const { userId } = await auth();
    if (!userId) return { success: false, totalSeconds: 0, error: "Unauthorized" };

    const insforge = createInsforgeServer(userId);

    const { data, error } = await insforge.database
      .from("time_entries")
      .select("duration")
      .eq("task_id", validated.data)
      .not("duration", "is", null);

    if (error) {
      logger.error({ error, taskId }, "Failed to fetch task total time");
      return { success: false, totalSeconds: 0, error: "Failed to fetch total time" };
    }

    const total = (data ?? []).reduce(
      (sum: number, row: { duration: number | null }) => sum + (row.duration ?? 0),
      0
    );

    return { success: true, totalSeconds: total };
  } catch (err) {
    logger.error({ error: err, taskId }, "Unexpected error in getTaskTotalTime");
    Sentry.captureException(err);
    return { success: false, totalSeconds: 0, error: "An unexpected error occurred" };
  } finally {
    flushLogsAfterResponse();
  }
}
