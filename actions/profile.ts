"use server";

import * as Sentry from "@sentry/nextjs";
import { auth, currentUser } from "@clerk/nextjs/server";
import { cookies } from "next/headers";
import { createInsforgeServer } from "@/lib/insforge-server";
import { z } from "zod";
import { logger, flushLogsAfterResponse } from "@/lib/logger";

/**
 * Ensures the current Clerk user has a matching row in InsForge `profiles`.
 * Call this on first dashboard load as a fallback for users who signed up
 * before the webhook was active, or if the webhook delivery failed.
 */
export async function syncProfile(): Promise<{
  success: boolean;
  error?: string;
}> {
  try {
    const { userId } = await auth();
    if (!userId) return { success: false, error: "Unauthorized" };

    const insforge = createInsforgeServer(userId);

    // Check if profile already exists
    const { data: existing } = await insforge.database
      .from("profiles")
      .select("id")
      .eq("id", userId)
      .maybeSingle();

    if (existing) return { success: true };

    // Profile missing — pull from Clerk and insert
    const user = await currentUser();
    if (!user) return { success: false, error: "Clerk user not found" };

    const fullName =
      `${user.firstName ?? ""} ${user.lastName ?? ""}`.trim() || null;

    const { error } = await insforge.database.from("profiles").insert([
      {
        id: userId,
        email: user.emailAddresses[0]?.emailAddress ?? "",
        full_name: fullName,
        avatar_url: user.imageUrl || null,
      },
    ]);

    if (error) {
      // Unique constraint = another process already inserted (race condition)
      if (error.message?.includes("duplicate") || error.message?.includes("unique")) {
        return { success: true };
      }
      logger.error({ error, userId }, "Failed to sync profiles in database");
      return { success: false, error: "Failed to sync profile" };
    }

    return { success: true };
  } catch (err) {
    logger.error({ error: err }, "Unexpected error in syncProfile Server Action");
    Sentry.captureException(err);
    return { success: false, error: "An unexpected error occurred" };
  } finally {
    flushLogsAfterResponse();
  }
}

const updateProfileSchema = z.object({
  fullName: z.string().min(2, "Full name must be at least 2 characters").max(50),
  avatarUrl: z.string().url("Invalid avatar URL").nullable().optional().or(z.literal("")),
  locale: z.enum(["en", "es", "fr", "de", "ja"]).default("en"),
});

export async function updateProfile(
  fullName: string,
  avatarUrl?: string | null,
  locale?: string
): Promise<{ success: boolean; error?: string }> {
  let userId: string | null = null;
  try {
    const authRes = await auth();
    userId = authRes.userId;
    if (!userId) return { success: false, error: "Unauthorized" };

    const validated = updateProfileSchema.safeParse({ fullName, avatarUrl, locale });
    if (!validated.success) {
      return { success: false, error: validated.error.issues[0].message };
    }

    const insforge = createInsforgeServer(userId);

    const { error } = await insforge.database
      .from("profiles")
      .update({
        full_name: validated.data.fullName,
        avatar_url: validated.data.avatarUrl || null,
        locale: validated.data.locale,
        updated_at: new Date().toISOString(),
      })
      .eq("id", userId);

    if (error) {
      logger.error({ error, userId }, "Failed to update profile in database");
      return { success: false, error: "Failed to update profile" };
    }

    const cookieStore = await cookies();
    cookieStore.set("locale", validated.data.locale, {
      path: "/",
      maxAge: 60 * 60 * 24 * 365,
      httpOnly: false,
      sameSite: "lax",
    });

    return { success: true };
  } catch (err) {
    logger.error({ error: err, userId }, "Unexpected error in updateProfile Server Action");
    Sentry.captureException(err);
    return { success: false, error: "An unexpected error occurred" };
  } finally {
    flushLogsAfterResponse();
  }
}

