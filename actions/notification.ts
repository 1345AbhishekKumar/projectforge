"use server";

import { auth } from "@clerk/nextjs/server";
import { createInsforgeServer } from "@/lib/insforge-server";
import type { Notification } from "@/types";

export async function getNotifications(): Promise<{ success: boolean; data: Notification[]; error?: string }> {
  try {
    const { userId } = await auth();
    if (!userId) return { success: false, error: "Unauthorized", data: [] };

    const insforge = await createInsforgeServer();

    const { data, error } = await insforge.database
      .from("notifications")
      .select("*")
      .eq("user_id", userId)
      .order("created_at", { ascending: false });

    if (error) {
      return { success: false, error: "Failed to fetch notifications", data: [] };
    }

    return { success: true, data: data as unknown as Notification[] };
  } catch {
    return { success: false, error: "An unexpected error occurred", data: [] };
  }
}

export async function markNotificationRead(notificationId: string): Promise<{ success: boolean; error?: string }> {
  try {
    const { userId } = await auth();
    if (!userId) return { success: false, error: "Unauthorized" };

    const insforge = await createInsforgeServer();

    const { error } = await insforge.database
      .from("notifications")
      .update({ is_read: true })
      .eq("id", notificationId)
      .eq("user_id", userId);

    if (error) {
      return { success: false, error: "Failed to update notification" };
    }

    return { success: true };
  } catch {
    return { success: false, error: "An unexpected error occurred" };
  }
}

export async function markAllNotificationsRead(): Promise<{ success: boolean; error?: string }> {
  try {
    const { userId } = await auth();
    if (!userId) return { success: false, error: "Unauthorized" };

    const insforge = await createInsforgeServer();

    const { error } = await insforge.database
      .from("notifications")
      .update({ is_read: true })
      .eq("user_id", userId)
      .eq("is_read", false);

    if (error) {
      return { success: false, error: "Failed to update notifications" };
    }

    return { success: true };
  } catch {
    return { success: false, error: "An unexpected error occurred" };
  }
}

export async function deleteOldNotifications(): Promise<{ success: boolean; error?: string }> {
  try {
    const { userId } = await auth();
    if (!userId) return { success: false, error: "Unauthorized" };

    const insforge = await createInsforgeServer();

    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() - 30);

    const { error } = await insforge.database
      .from("notifications")
      .delete()
      .eq("user_id", userId)
      .lt("created_at", cutoff.toISOString());

    if (error) {
      return { success: false, error: "Failed to delete old notifications" };
    }

    return { success: true };
  } catch {
    return { success: false, error: "An unexpected error occurred" };
  }
}
