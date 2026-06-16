"use server";

import { auth } from "@clerk/nextjs/server";
import { createInsforgeServer } from "@/lib/insforge-server";
import { z } from "zod";
import type { SavedView } from "@/types";

const savedViewSchema = z.object({
  name: z.string().min(3, "Saved view name must be at least 3 characters").max(50),
  filters: z.record(z.string(), z.any()),
});

async function verifyMembership(insforge: ReturnType<typeof createInsforgeServer>, orgId: string, userId: string): Promise<boolean> {
  const { data } = await (await insforge).database
    .from("memberships")
    .select("id")
    .eq("organization_id", orgId)
    .eq("user_id", userId)
    .maybeSingle();
  return !!data;
}

export async function getSavedViews(orgId: string): Promise<{ success: boolean; data: SavedView[]; error?: string }> {
  try {
    const { userId } = await auth();
    if (!userId) return { success: false, error: "Unauthorized", data: [] };

    const insforge = createInsforgeServer();
    const isMember = await verifyMembership(insforge, orgId, userId);
    if (!isMember) return { success: false, error: "Not a member of this workspace", data: [] };

    const { data, error } = await (await insforge).database
      .from("saved_views")
      .select("*")
      .eq("organization_id", orgId)
      .eq("user_id", userId)
      .order("created_at", { ascending: false });

    if (error) {
      return { success: false, error: "Failed to fetch saved views", data: [] };
    }

    return { success: true, data: data || [] };
  } catch {
    return { success: false, error: "An unexpected error occurred", data: [] };
  }
}

export async function createSavedView(orgId: string, name: string, filters: SavedView["filters"]): Promise<{ success: boolean; data?: SavedView; error?: string }> {
  try {
    const { userId } = await auth();
    if (!userId) return { success: false, error: "Unauthorized" };

    const validated = savedViewSchema.safeParse({ name, filters });
    if (!validated.success) {
      return { success: false, error: validated.error.issues[0].message };
    }

    const insforge = createInsforgeServer();
    const isMember = await verifyMembership(insforge, orgId, userId);
    if (!isMember) return { success: false, error: "Not a member of this workspace" };

    const { data, error } = await (await insforge).database
      .from("saved_views")
      .insert([
        {
          user_id: userId,
          organization_id: orgId,
          name: validated.data.name,
          filters: validated.data.filters,
        },
      ])
      .select("*")
      .single();

    if (error) {
      if (error.message?.includes("unique") || error.details?.includes("already exists")) {
        return { success: false, error: "A saved view with this name already exists in this workspace" };
      }
      return { success: false, error: "Failed to create saved view" };
    }

    return { success: true, data };
  } catch {
    return { success: false, error: "An unexpected error occurred" };
  }
}

export async function deleteSavedView(viewId: string, orgId: string): Promise<{ success: boolean; error?: string }> {
  try {
    const { userId } = await auth();
    if (!userId) return { success: false, error: "Unauthorized" };

    const insforge = createInsforgeServer();
    const isMember = await verifyMembership(insforge, orgId, userId);
    if (!isMember) return { success: false, error: "Not a member of this workspace" };

    const { error } = await (await insforge).database
      .from("saved_views")
      .delete()
      .eq("id", viewId)
      .eq("organization_id", orgId)
      .eq("user_id", userId);

    if (error) {
      return { success: false, error: "Failed to delete saved view" };
    }

    return { success: true };
  } catch {
    return { success: false, error: "An unexpected error occurred" };
  }
}
