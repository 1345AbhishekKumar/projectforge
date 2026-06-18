"use server";

import { auth } from "@clerk/nextjs/server";
import { createInsforgeServer } from "@/lib/insforge-server";
import { z } from "zod";
import type { Notification, NotificationType, NotificationPreference } from "@/types";
import { orgIdSchema, notificationIdSchema } from "@/lib/utils";
import { verifyMembership } from "@/lib/auth-helpers";
import { logger, flushLogsAfterResponse } from "@/lib/logger";

const ALL_NOTIFICATION_TYPES: NotificationType[] = [
  "GENERAL",
  "TASK_OVERDUE",
  "SPRINT_STARTED",
  "SPRINT_ENDED",
  "MEMBER_INVITED",
  "PROJECT_COMPLETED",
];

const preferenceSchema = z.object({
  type: z.enum([
    "GENERAL",
    "TASK_OVERDUE",
    "SPRINT_STARTED",
    "SPRINT_ENDED",
    "MEMBER_INVITED",
    "PROJECT_COMPLETED",
  ]),
  inApp: z.boolean(),
  email: z.boolean(),
});

const checkOverdueTasksInputSchema = z.object({
  orgId: orgIdSchema,
});

const markNotificationReadInputSchema = z.object({
  notificationId: notificationIdSchema,
});

// ─────────────────────────────────────────────────────────────────────────────
// Internal helper — used by other actions to fan-out notifications.
// Checks the target user's in_app preference before inserting.
// Never throws — logs and silently exits on failure so callers are unaffected.
// ─────────────────────────────────────────────────────────────────────────────
export async function createNotification(
  targetUserId: string,
  content: string,
  type: NotificationType
): Promise<void> {
  try {
    const insforge = createInsforgeServer(targetUserId);

    // Check in_app preference — only block if an explicit "false" row exists
    const { data: pref } = await insforge.database
      .from("notification_preferences")
      .select("in_app")
      .eq("user_id", targetUserId)
      .eq("type", type)
      .maybeSingle();

    // If preference exists and is disabled, skip insertion
    if (pref && pref.in_app === false) return;

    await insforge.database.from("notifications").insert([
      {
        user_id: targetUserId,
        content,
        type,
        is_read: false,
      },
    ]);
  } catch (err) {
    logger.error({ error: err, targetUserId, type }, "createNotification failed silently");
  } finally {
    flushLogsAfterResponse();
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Scans for tasks that are past their due date and not completed.
// Creates one TASK_OVERDUE notification per unique assignee.
// Deduplication: skips if a TASK_OVERDUE notification for the same task
// already exists within the last 24 hours (matched via content substring).
// ─────────────────────────────────────────────────────────────────────────────
export async function checkOverdueTasks(
  orgId: string
): Promise<{ success: boolean; count?: number; error?: string }> {
  const validated = checkOverdueTasksInputSchema.safeParse({ orgId });
  if (!validated.success) {
    return { success: false, error: validated.error.issues[0].message };
  }

  try {
    const { userId } = await auth();
    if (!userId) return { success: false, error: "Unauthorized" };

    const insforge = createInsforgeServer(userId);

    // Verify caller is a member
    const isMember = await verifyMembership(insforge, validated.data.orgId, userId);
    if (!isMember) return { success: false, error: "Not a member of this workspace" };

    const now = new Date().toISOString();
    const yesterday = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();

    // Find all overdue tasks with an assignee
    const { data: overdueTasks, error: tasksError } = await insforge.database
      .from("tasks")
      .select("id, title, assignee_id")
      .eq("organization_id", validated.data.orgId)
      .neq("status", "DONE")
      .lt("due_date", now)
      .not("assignee_id", "is", null);

    if (tasksError) return { success: false, error: "Failed to fetch overdue tasks" };
    if (!overdueTasks || overdueTasks.length === 0) return { success: true, count: 0 };

    // Fetch recent TASK_OVERDUE notifications to deduplicate
    const { data: recentNotifs } = await insforge.database
      .from("notifications")
      .select("content")
      .eq("type", "TASK_OVERDUE")
      .gte("created_at", yesterday);

    const alreadyNotifiedTaskIds = new Set<string>();
    for (const n of recentNotifs || []) {
      // Content contains task ID in bracket form: "[task-id]"
      const match = n.content.match(/\[([a-f0-9-]{36})\]/);
      if (match) alreadyNotifiedTaskIds.add(match[1]);
    }

    let count = 0;
    for (const task of overdueTasks as { id: string; title: string; assignee_id: string }[]) {
      if (alreadyNotifiedTaskIds.has(task.id)) continue;

      await createNotification(
        task.assignee_id,
        `⚠️ Task "[${task.id}]${task.title}" is overdue. Please update its status or due date.`,
        "TASK_OVERDUE"
      );
      count++;
    }

    return { success: true, count };
  } catch (err) {
    logger.error({ error: err }, "checkOverdueTasks error");
    return { success: false, error: "An unexpected error occurred" };
  } finally {
    flushLogsAfterResponse();
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Fetch all notifications for the current user (newest first).
// ─────────────────────────────────────────────────────────────────────────────
export async function getNotifications(): Promise<{
  success: boolean;
  data: Notification[];
  error?: string;
}> {
  try {
    const { userId } = await auth();
    if (!userId) return { success: false, error: "Unauthorized", data: [] };

    const insforge = createInsforgeServer(userId);

    const { data, error } = await insforge.database
      .from("notifications")
      .select("*")
      .eq("user_id", userId)
      .order("created_at", { ascending: false });

    if (error) {
      logger.error({ error }, "Failed to fetch notifications");
      return { success: false, error: "Failed to fetch notifications", data: [] };
    }

    return { success: true, data: (data as unknown as Notification[]) || [] };
  } catch (err) {
    logger.error({ error: err }, "Failed to get notifications");
    return { success: false, error: "An unexpected error occurred", data: [] };
  } finally {
    flushLogsAfterResponse();
  }
}

export async function markNotificationRead(
  notificationId: string
): Promise<{ success: boolean; error?: string }> {
  const validated = markNotificationReadInputSchema.safeParse({ notificationId });
  if (!validated.success) {
    return { success: false, error: validated.error.issues[0].message };
  }

  try {
    const { userId } = await auth();
    if (!userId) return { success: false, error: "Unauthorized" };

    const insforge = createInsforgeServer(userId);

    const { error } = await insforge.database
      .from("notifications")
      .update({ is_read: true })
      .eq("id", validated.data.notificationId)
      .eq("user_id", userId);

    if (error) {
      logger.error({ error, notificationId: validated.data.notificationId }, "Failed to mark notification read");
      return { success: false, error: "Failed to update notification" };
    }

    return { success: true };
  } catch (err) {
    logger.error({ error: err, notificationId }, "markNotificationRead error");
    return { success: false, error: "An unexpected error occurred" };
  } finally {
    flushLogsAfterResponse();
  }
}

export async function markAllNotificationsRead(): Promise<{
  success: boolean;
  error?: string;
}> {
  try {
    const { userId } = await auth();
    if (!userId) return { success: false, error: "Unauthorized" };

    const insforge = createInsforgeServer(userId);

    const { error } = await insforge.database
      .from("notifications")
      .update({ is_read: true })
      .eq("user_id", userId)
      .eq("is_read", false);

    if (error) {
      logger.error({ error }, "Failed to mark all notifications read");
      return { success: false, error: "Failed to update notifications" };
    }

    return { success: true };
  } catch (err) {
    logger.error({ error: err }, "markAllNotificationsRead error");
    return { success: false, error: "An unexpected error occurred" };
  } finally {
    flushLogsAfterResponse();
  }
}

export async function deleteOldNotifications(): Promise<{
  success: boolean;
  error?: string;
}> {
  try {
    const { userId } = await auth();
    if (!userId) return { success: false, error: "Unauthorized" };

    const insforge = createInsforgeServer(userId);

    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() - 30);

    const { error } = await insforge.database
      .from("notifications")
      .delete()
      .eq("user_id", userId)
      .lt("created_at", cutoff.toISOString());

    if (error) {
      logger.error({ error }, "Failed to delete old notifications");
      return { success: false, error: "Failed to delete old notifications" };
    }

    return { success: true };
  } catch (err) {
    logger.error({ error: err }, "deleteOldNotifications error");
    return { success: false, error: "An unexpected error occurred" };
  } finally {
    flushLogsAfterResponse();
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Preferences — fetch all 6 preference rows for the current user.
// Returns defaults (in_app: true, email: false) for any type with no saved row.
// ─────────────────────────────────────────────────────────────────────────────
export async function getNotificationPreferences(): Promise<{
  success: boolean;
  data?: NotificationPreference[];
  error?: string;
}> {
  try {
    const { userId } = await auth();
    if (!userId) return { success: false, error: "Unauthorized" };

    const insforge = createInsforgeServer(userId);

    const { data, error } = await insforge.database
      .from("notification_preferences")
      .select("*")
      .eq("user_id", userId);

    if (error) {
      logger.error({ error }, "Failed to fetch notification preferences");
      return { success: false, error: "Failed to fetch preferences" };
    }

    const saved = (data as NotificationPreference[]) || [];
    const savedByType = new Map(saved.map((p) => [p.type, p]));

    // Fill missing types with defaults
    const full: NotificationPreference[] = ALL_NOTIFICATION_TYPES.map((type) => {
      if (savedByType.has(type)) return savedByType.get(type)!;
      return {
        id: "",
        user_id: userId,
        type,
        in_app: true,
        email: false,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };
    });

    return { success: true, data: full };
  } catch (err) {
    logger.error({ error: err }, "getNotificationPreferences error");
    return { success: false, error: "An unexpected error occurred" };
  } finally {
    flushLogsAfterResponse();
  }
}

export async function upsertNotificationPreference(
  type: NotificationType,
  inApp: boolean,
  email: boolean
): Promise<{ success: boolean; error?: string }> {
  try {
    const { userId } = await auth();
    if (!userId) return { success: false, error: "Unauthorized" };

    const validated = preferenceSchema.safeParse({ type, inApp, email });
    if (!validated.success) {
      return { success: false, error: validated.error.issues[0].message };
    }

    const insforge = createInsforgeServer(userId);

    // Check if a row exists
    const { data: existing } = await insforge.database
      .from("notification_preferences")
      .select("id")
      .eq("user_id", userId)
      .eq("type", type)
      .maybeSingle();

    if (existing) {
      const { error } = await insforge.database
        .from("notification_preferences")
        .update({ in_app: inApp, email, updated_at: new Date().toISOString() })
        .eq("user_id", userId)
        .eq("type", type);

      if (error) {
        logger.error({ error, type }, "Failed to update notification preference");
        return { success: false, error: "Failed to update preference" };
      }
    } else {
      const { error } = await insforge.database.from("notification_preferences").insert([
        {
          user_id: userId,
          type,
          in_app: inApp,
          email,
        },
      ]);

      if (error) {
        logger.error({ error, type }, "Failed to save notification preference");
        return { success: false, error: "Failed to save preference" };
      }
    }

    return { success: true };
  } catch (err) {
    logger.error({ error: err, type }, "upsertNotificationPreference error");
    return { success: false, error: "An unexpected error occurred" };
  } finally {
    flushLogsAfterResponse();
  }
}
