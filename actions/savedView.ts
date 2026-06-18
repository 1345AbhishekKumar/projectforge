"use server";

import { auth } from "@clerk/nextjs/server";
import { createInsforgeServer } from "@/lib/insforge-server";
import { z } from "zod";
import type { SavedView } from "@/types";
import { orgIdSchema, viewIdSchema } from "@/lib/utils";
import { verifyMembership } from "@/lib/auth-helpers";
import { logger, flushLogsAfterResponse } from "@/lib/logger";

const savedViewSchema = z.object({
  name: z.string().min(3, "Saved view name must be at least 3 characters").max(50),
  filters: z.record(z.string(), z.any()),
});

const getSavedViewsInputSchema = z.object({
  orgId: orgIdSchema,
});

const createSavedViewInputSchema = savedViewSchema.extend({
  orgId: orgIdSchema,
});

const deleteSavedViewInputSchema = z.object({
  viewId: viewIdSchema,
  orgId: orgIdSchema,
});


export async function getSavedViews(orgId: string): Promise<{ success: boolean; data: SavedView[]; error?: string }> {
  const validated = getSavedViewsInputSchema.safeParse({ orgId });
  if (!validated.success) {
    return { success: false, error: validated.error.issues[0].message, data: [] };
  }

  try {
    const { userId } = await auth();
    if (!userId) return { success: false, error: "Unauthorized", data: [] };

    const insforge = createInsforgeServer(userId);
    const isMember = await verifyMembership(insforge, validated.data.orgId, userId);
    if (!isMember) return { success: false, error: "Not a member of this workspace", data: [] };

    const { data, error } = await insforge.database
      .from("saved_views")
      .select("*")
      .eq("organization_id", validated.data.orgId)
      .eq("user_id", userId)
      .order("created_at", { ascending: false });

    if (error) {
      logger.error({ error, orgId: validated.data.orgId }, "Failed to fetch saved views");
      return { success: false, error: "Failed to fetch saved views", data: [] };
    }

    return { success: true, data: data || [] };
  } catch (err) {
    logger.error({ error: err, orgId }, "Unexpected error in getSavedViews Server Action");
    return { success: false, error: "An unexpected error occurred", data: [] };
  } finally {
    flushLogsAfterResponse();
  }
}

export async function createSavedView(orgId: string, name: string, filters: SavedView["filters"]): Promise<{ success: boolean; data?: SavedView; error?: string }> {
  const validated = createSavedViewInputSchema.safeParse({ orgId, name, filters });
  if (!validated.success) {
    return { success: false, error: validated.error.issues[0].message };
  }

  try {
    const { userId } = await auth();
    if (!userId) return { success: false, error: "Unauthorized" };

    const insforge = createInsforgeServer(userId);
    const isMember = await verifyMembership(insforge, validated.data.orgId, userId);
    if (!isMember) return { success: false, error: "Not a member of this workspace" };

    const { data, error } = await insforge.database
      .from("saved_views")
      .insert([
        {
          user_id: userId,
          organization_id: validated.data.orgId,
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
      logger.error({ error, orgId: validated.data.orgId, name: validated.data.name }, "Failed to create saved view");
      return { success: false, error: "Failed to create saved view" };
    }

    return { success: true, data };
  } catch (err) {
    logger.error({ error: err, orgId, name }, "Unexpected error in createSavedView Server Action");
    return { success: false, error: "An unexpected error occurred" };
  } finally {
    flushLogsAfterResponse();
  }
}

export async function deleteSavedView(viewId: string, orgId: string): Promise<{ success: boolean; error?: string }> {
  const validated = deleteSavedViewInputSchema.safeParse({ viewId, orgId });
  if (!validated.success) {
    return { success: false, error: validated.error.issues[0].message };
  }

  try {
    const { userId } = await auth();
    if (!userId) return { success: false, error: "Unauthorized" };

    const insforge = createInsforgeServer(userId);
    const isMember = await verifyMembership(insforge, validated.data.orgId, userId);
    if (!isMember) return { success: false, error: "Not a member of this workspace" };

    const { error } = await insforge.database
      .from("saved_views")
      .delete()
      .eq("id", validated.data.viewId)
      .eq("organization_id", validated.data.orgId)
      .eq("user_id", userId);

    if (error) {
      logger.error({ error, viewId: validated.data.viewId, orgId: validated.data.orgId }, "Failed to delete saved view");
      return { success: false, error: "Failed to delete saved view" };
    }

    return { success: true };
  } catch (err) {
    logger.error({ error: err, viewId, orgId }, "Unexpected error in deleteSavedView Server Action");
    return { success: false, error: "An unexpected error occurred" };
  } finally {
    flushLogsAfterResponse();
  }
}

const updateSavedViewInputSchema = z.object({
  viewId: viewIdSchema,
  orgId: orgIdSchema,
  name: z.string().min(3, "Saved view name must be at least 3 characters").max(50),
  filters: z.record(z.string(), z.any()),
});

export async function updateSavedView(
  viewId: string,
  orgId: string,
  name: string,
  filters: SavedView["filters"]
): Promise<{ success: boolean; data?: SavedView; error?: string }> {
  const validated = updateSavedViewInputSchema.safeParse({ viewId, orgId, name, filters });
  if (!validated.success) {
    return { success: false, error: validated.error.issues[0].message };
  }

  try {
    const { userId } = await auth();
    if (!userId) return { success: false, error: "Unauthorized" };

    const insforge = createInsforgeServer(userId);
    const isMember = await verifyMembership(insforge, validated.data.orgId, userId);
    if (!isMember) return { success: false, error: "Not a member of this workspace" };

    const { data, error } = await insforge.database
      .from("saved_views")
      .update({
        name: validated.data.name,
        filters: validated.data.filters,
      })
      .eq("id", validated.data.viewId)
      .eq("organization_id", validated.data.orgId)
      .eq("user_id", userId)
      .select("*")
      .single();

    if (error) {
      if (error.message?.includes("unique") || error.details?.includes("already exists")) {
        return { success: false, error: "A saved view with this name already exists in this workspace" };
      }
      logger.error({ error, viewId: validated.data.viewId, orgId: validated.data.orgId }, "Failed to update saved view");
      return { success: false, error: "Failed to update saved view" };
    }

    return { success: true, data };
  } catch (err) {
    logger.error({ error: err, viewId, orgId, name }, "Unexpected error in updateSavedView Server Action");
    return { success: false, error: "An unexpected error occurred" };
  } finally {
    flushLogsAfterResponse();
  }
}

