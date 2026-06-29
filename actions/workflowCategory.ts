"use server";

import { auth } from "@clerk/nextjs/server";
import { revalidatePath } from "next/cache";
import { createInsforgeServer } from "@/lib/insforge-server";
import { writeAuditLog } from "@/lib/audit";
import { z } from "zod";
import { orgIdSchema } from "@/lib/utils";
import { verifyMembership, verifyPermission } from "@/lib/auth-helpers";
import { logger, flushLogsAfterResponse } from "@/lib/logger";
import * as Sentry from "@sentry/nextjs";

const DEFAULT_CATEGORIES = ["Engineering", "HR", "Finance", "Marketing", "DevOps", "General"];

const categorySchema = z.object({
  orgId: orgIdSchema,
  name: z.string().trim().min(1, "Category name cannot be empty").max(50, "Category name too long"),
});

export async function getWorkflowCategories(
  orgId: string,
): Promise<{ success: boolean; data: string[]; error?: string }> {
  const validated = orgIdSchema.safeParse(orgId);
  if (!validated.success) {
    return { success: false, error: validated.error.issues[0].message, data: [] };
  }

  try {
    const { userId } = await auth();
    if (!userId) return { success: false, error: "Unauthorized", data: [] };

    const insforge = createInsforgeServer(userId);
    const isMember = await verifyMembership(insforge, validated.data, userId);
    if (!isMember) {
      return { success: false, error: "Not a member of this workspace", data: [] };
    }

    const { data, error } = await insforge.database
      .from("workflow_categories")
      .select("name")
      .eq("organization_id", validated.data)
      .order("name", { ascending: true });

    if (error) {
      logger.error({ error, orgId }, "Failed to fetch workflow categories");
      return { success: false, error: "Failed to fetch categories", data: [] };
    }

    if (!data || data.length === 0) {
      // Seed default categories for this organization
      const seedRows = DEFAULT_CATEGORIES.map((cat) => ({
        organization_id: validated.data,
        name: cat,
      }));

      const { data: inserted, error: insertError } = await insforge.database
        .from("workflow_categories")
        .insert(seedRows)
        .select("name");

      if (insertError) {
        logger.error({ insertError, orgId }, "Failed to seed default categories");
        return { success: true, data: DEFAULT_CATEGORIES }; // Fallback to memory defaults
      }

      return { success: true, data: (inserted || []).map((row) => row.name) };
    }

    return { success: true, data: data.map((row) => row.name) };
  } catch (error) {
    logger.error({ error, orgId }, "getWorkflowCategories unexpected error");
    Sentry.captureException(error);
    return { success: false, error: "An unexpected error occurred", data: [] };
  } finally {
    flushLogsAfterResponse();
  }
}

export async function createWorkflowCategory(
  orgId: string,
  name: string,
): Promise<{ success: boolean; error?: string }> {
  const validated = categorySchema.safeParse({ orgId, name });
  if (!validated.success) {
    return { success: false, error: validated.error.issues[0].message };
  }

  try {
    const { userId } = await auth();
    if (!userId) return { success: false, error: "Unauthorized" };

    const insforge = createInsforgeServer(userId);
    const isAuthorized = await verifyPermission(
      insforge,
      validated.data.orgId,
      userId,
      "workflows",
      "create",
    );
    if (!isAuthorized) {
      return { success: false, error: "Unauthorized to manage workflows" };
    }

    // Check if category already exists case-insensitively
    const { data: existing } = await insforge.database
      .from("workflow_categories")
      .select("id")
      .eq("organization_id", validated.data.orgId)
      .ilike("name", validated.data.name)
      .maybeSingle();

    if (existing) {
      return { success: false, error: "Category folder already exists" };
    }

    const { error } = await insforge.database.from("workflow_categories").insert([
      {
        organization_id: validated.data.orgId,
        name: validated.data.name,
      },
    ]);

    if (error) {
      logger.error({ error, orgId, name }, "Failed to create category");
      return { success: false, error: "Failed to create category folder" };
    }

    writeAuditLog(
      validated.data.orgId,
      userId,
      "workflow_category.created",
      "workflow_category",
      "",
      { name: validated.data.name },
    );
    revalidatePath("/workflows");
    return { success: true };
  } catch (error) {
    logger.error({ error, orgId, name }, "createWorkflowCategory unexpected error");
    Sentry.captureException(error);
    return { success: false, error: "An unexpected error occurred" };
  } finally {
    flushLogsAfterResponse();
  }
}

export async function updateWorkflowCategory(
  orgId: string,
  oldName: string,
  newName: string,
): Promise<{ success: boolean; error?: string }> {
  const validatedOld = categorySchema.safeParse({ orgId, name: oldName });
  const validatedNew = categorySchema.safeParse({ orgId, name: newName });
  if (!validatedOld.success || !validatedNew.success) {
    return { success: false, error: "Invalid category names" };
  }

  try {
    const { userId } = await auth();
    if (!userId) return { success: false, error: "Unauthorized" };

    const insforge = createInsforgeServer(userId);
    const isAuthorized = await verifyPermission(insforge, orgId, userId, "workflows", "update");
    if (!isAuthorized) {
      return { success: false, error: "Unauthorized to manage workflows" };
    }

    // 1. Update workflow_categories name
    const { error: catError } = await insforge.database
      .from("workflow_categories")
      .update({ name: validatedNew.data.name })
      .eq("organization_id", orgId)
      .eq("name", validatedOld.data.name);

    if (catError) {
      logger.error({ error: catError, orgId, oldName, newName }, "Failed to update category name");
      return { success: false, error: "Failed to update category name" };
    }

    // 2. Update category field on workflows
    const { error: wfError } = await insforge.database
      .from("workflows")
      .update({ category: validatedNew.data.name })
      .eq("organization_id", orgId)
      .eq("category", validatedOld.data.name);

    if (wfError) {
      logger.error({ error: wfError, orgId, oldName }, "Failed to update workflows category links");
    }

    writeAuditLog(orgId, userId, "workflow_category.updated", "workflow_category", "", {
      oldName,
      newName,
    });
    revalidatePath("/workflows");
    return { success: true };
  } catch (error) {
    logger.error({ error, orgId, oldName, newName }, "updateWorkflowCategory unexpected error");
    Sentry.captureException(error);
    return { success: false, error: "An unexpected error occurred" };
  } finally {
    flushLogsAfterResponse();
  }
}

export async function deleteWorkflowCategory(
  orgId: string,
  name: string,
): Promise<{ success: boolean; error?: string }> {
  const validated = categorySchema.safeParse({ orgId, name });
  if (!validated.success) {
    return { success: false, error: validated.error.issues[0].message };
  }

  try {
    const { userId } = await auth();
    if (!userId) return { success: false, error: "Unauthorized" };

    const insforge = createInsforgeServer(userId);
    const isAuthorized = await verifyPermission(insforge, orgId, userId, "workflows", "delete");
    if (!isAuthorized) {
      return { success: false, error: "Unauthorized to manage workflows" };
    }

    // 1. Delete from workflow_categories
    const { error: catError } = await insforge.database
      .from("workflow_categories")
      .delete()
      .eq("organization_id", orgId)
      .eq("name", validated.data.name);

    if (catError) {
      logger.error({ error: catError, orgId, name }, "Failed to delete category");
      return { success: false, error: "Failed to delete category folder" };
    }

    // 2. Update workflows in this category to General
    const { error: wfError } = await insforge.database
      .from("workflows")
      .update({ category: "General" })
      .eq("organization_id", orgId)
      .eq("category", validated.data.name);

    if (wfError) {
      logger.error(
        { error: wfError, orgId, name },
        "Failed to reassign category workflows to General",
      );
    }

    writeAuditLog(orgId, userId, "workflow_category.deleted", "workflow_category", "", {
      name: validated.data.name,
    });
    revalidatePath("/workflows");
    return { success: true };
  } catch (error) {
    logger.error({ error, orgId, name }, "deleteWorkflowCategory unexpected error");
    Sentry.captureException(error);
    return { success: false, error: "An unexpected error occurred" };
  } finally {
    flushLogsAfterResponse();
  }
}
