"use server";

import { auth, currentUser } from "@clerk/nextjs/server";
import { createInsforgeServer } from "@/lib/insforge-server";

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

    const insforge = createInsforgeServer();

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
      return { success: false, error: "Failed to sync profile" };
    }

    return { success: true };
  } catch {
    return { success: false, error: "An unexpected error occurred" };
  }
}
