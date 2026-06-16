"use server";

import { auth } from "@clerk/nextjs/server";
import { createInsforgeServer } from "@/lib/insforge-server";
import { z } from "zod";
import type { Label } from "@/types";

const labelSchema = z.object({
  name: z.string().min(2, "Label name must be at least 2 characters").max(30),
  color: z.string().regex(/^#[0-9A-Fa-f]{6}$/, "Must be a valid hex color"),
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

export async function getLabels(orgId: string): Promise<{ success: boolean; data: Label[]; error?: string }> {
  try {
    const { userId } = await auth();
    if (!userId) return { success: false, error: "Unauthorized", data: [] };

    const insforge = createInsforgeServer();
    const isMember = await verifyMembership(insforge, orgId, userId);
    if (!isMember) return { success: false, error: "Not a member of this workspace", data: [] };

    const { data, error } = await (await insforge).database
      .from("labels")
      .select("*")
      .eq("organization_id", orgId)
      .order("name", { ascending: true });

    if (error) {
      return { success: false, error: "Failed to fetch labels", data: [] };
    }

    return { success: true, data: data || [] };
  } catch {
    return { success: false, error: "An unexpected error occurred", data: [] };
  }
}

export async function createLabel(orgId: string, name: string, color: string): Promise<{ success: boolean; data?: Label; error?: string }> {
  try {
    const { userId } = await auth();
    if (!userId) return { success: false, error: "Unauthorized" };

    const validated = labelSchema.safeParse({ name, color });
    if (!validated.success) {
      return { success: false, error: validated.error.issues[0].message };
    }

    const insforge = createInsforgeServer();
    const isMember = await verifyMembership(insforge, orgId, userId);
    if (!isMember) return { success: false, error: "Not a member of this workspace" };

    const { data, error } = await (await insforge).database
      .from("labels")
      .insert([
        {
          organization_id: orgId,
          name: validated.data.name,
          color: validated.data.color,
        },
      ])
      .select("*")
      .single();

    if (error) {
      if (error.message?.includes("unique") || error.details?.includes("already exists")) {
        return { success: false, error: "A label with this name already exists in this workspace" };
      }
      return { success: false, error: "Failed to create label" };
    }

    return { success: true, data };
  } catch {
    return { success: false, error: "An unexpected error occurred" };
  }
}

export async function deleteLabel(labelId: string, orgId: string): Promise<{ success: boolean; error?: string }> {
  try {
    const { userId } = await auth();
    if (!userId) return { success: false, error: "Unauthorized" };

    const insforge = createInsforgeServer();
    const isMember = await verifyMembership(insforge, orgId, userId);
    if (!isMember) return { success: false, error: "Not a member of this workspace" };

    const { error } = await (await insforge).database
      .from("labels")
      .delete()
      .eq("id", labelId)
      .eq("organization_id", orgId);

    if (error) {
      return { success: false, error: "Failed to delete label" };
    }

    return { success: true };
  } catch {
    return { success: false, error: "An unexpected error occurred" };
  }
}
