"use server";

import { auth } from "@clerk/nextjs/server";
import { createInsforgeServer } from "@/lib/insforge-server";
import { z } from "zod";
import type { Label } from "@/types";
import { orgIdSchema, labelIdSchema } from "@/lib/utils";
import { verifyMembership, verifyAdminOrOwnerRole } from "@/lib/auth-helpers";
import { logger, flushLogsAfterResponse } from "@/lib/logger";

const labelSchema = z.object({
  name: z.string().min(2, "Label name must be at least 2 characters").max(30),
  color: z.string().regex(/^#[0-9A-Fa-f]{6}$/, "Must be a valid hex color"),
});

const getLabelsInputSchema = z.object({
  orgId: orgIdSchema,
});

const createLabelInputSchema = labelSchema.extend({
  orgId: orgIdSchema,
});

const deleteLabelInputSchema = z.object({
  labelId: labelIdSchema,
  orgId: orgIdSchema,
});


export async function getLabels(orgId: string): Promise<{ success: boolean; data: Label[]; error?: string }> {
  const validated = getLabelsInputSchema.safeParse({ orgId });
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
      .from("labels")
      .select("*")
      .eq("organization_id", validated.data.orgId)
      .order("name", { ascending: true });

    if (error) {
      logger.error({ error, orgId: validated.data.orgId }, "Failed to fetch labels");
      return { success: false, error: "Failed to fetch labels", data: [] };
    }

    return { success: true, data: data || [] };
  } catch (err) {
    logger.error({ error: err, orgId }, "Unexpected error in getLabels Server Action");
    return { success: false, error: "An unexpected error occurred", data: [] };
  } finally {
    flushLogsAfterResponse();
  }
}

export async function createLabel(orgId: string, name: string, color: string): Promise<{ success: boolean; data?: Label; error?: string }> {
  const validated = createLabelInputSchema.safeParse({ orgId, name, color });
  if (!validated.success) {
    return { success: false, error: validated.error.issues[0].message };
  }

  try {
    const { userId } = await auth();
    if (!userId) return { success: false, error: "Unauthorized" };

    const insforge = createInsforgeServer(userId);
    const isAdminOrOwner = await verifyAdminOrOwnerRole(insforge, validated.data.orgId, userId);
    if (!isAdminOrOwner) return { success: false, error: "Only owners and admins can create labels." };

    const { data, error } = await insforge.database
      .from("labels")
      .insert([
        {
          organization_id: validated.data.orgId,
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
      logger.error({ error, orgId: validated.data.orgId, name: validated.data.name }, "Failed to create label");
      return { success: false, error: "Failed to create label" };
    }

    return { success: true, data };
  } catch (err) {
    logger.error({ error: err, orgId, name }, "Unexpected error in createLabel Server Action");
    return { success: false, error: "An unexpected error occurred" };
  } finally {
    flushLogsAfterResponse();
  }
}

export async function deleteLabel(labelId: string, orgId: string): Promise<{ success: boolean; error?: string }> {
  const validated = deleteLabelInputSchema.safeParse({ labelId, orgId });
  if (!validated.success) {
    return { success: false, error: validated.error.issues[0].message };
  }

  try {
    const { userId } = await auth();
    if (!userId) return { success: false, error: "Unauthorized" };

    const insforge = createInsforgeServer(userId);
    const isAdminOrOwner = await verifyAdminOrOwnerRole(insforge, validated.data.orgId, userId);
    if (!isAdminOrOwner) return { success: false, error: "Only owners and admins can delete labels." };

    const { error } = await insforge.database
      .from("labels")
      .delete()
      .eq("id", validated.data.labelId)
      .eq("organization_id", validated.data.orgId);

    if (error) {
      logger.error({ error, labelId: validated.data.labelId, orgId: validated.data.orgId }, "Failed to delete label");
      return { success: false, error: "Failed to delete label" };
    }

    return { success: true };
  } catch (err) {
    logger.error({ error: err, labelId, orgId }, "Unexpected error in deleteLabel Server Action");
    return { success: false, error: "An unexpected error occurred" };
  } finally {
    flushLogsAfterResponse();
  }
}

const updateLabelInputSchema = z.object({
  labelId: labelIdSchema,
  orgId: orgIdSchema,
  name: z.string().min(2, "Label name must be at least 2 characters").max(30),
  color: z.string().regex(/^#[0-9A-Fa-f]{6}$/, "Must be a valid hex color"),
});

export async function updateLabel(
  labelId: string,
  orgId: string,
  name: string,
  color: string
): Promise<{ success: boolean; data?: Label; error?: string }> {
  const validated = updateLabelInputSchema.safeParse({ labelId, orgId, name, color });
  if (!validated.success) {
    return { success: false, error: validated.error.issues[0].message };
  }

  try {
    const { userId } = await auth();
    if (!userId) return { success: false, error: "Unauthorized" };

    const insforge = createInsforgeServer(userId);
    const isAdminOrOwner = await verifyAdminOrOwnerRole(insforge, validated.data.orgId, userId);
    if (!isAdminOrOwner) return { success: false, error: "Only owners and admins can update labels." };

    const { data, error } = await insforge.database
      .from("labels")
      .update({
        name: validated.data.name,
        color: validated.data.color,
      })
      .eq("id", validated.data.labelId)
      .eq("organization_id", validated.data.orgId)
      .select("*")
      .single();

    if (error) {
      if (error.message?.includes("unique") || error.details?.includes("already exists")) {
        return { success: false, error: "A label with this name already exists in this workspace" };
      }
      logger.error({ error, labelId: validated.data.labelId, orgId: validated.data.orgId }, "Failed to update label");
      return { success: false, error: "Failed to update label" };
    }

    return { success: true, data };
  } catch (err) {
    logger.error({ error: err, labelId, orgId, name }, "Unexpected error in updateLabel Server Action");
    return { success: false, error: "An unexpected error occurred" };
  } finally {
    flushLogsAfterResponse();
  }
}

