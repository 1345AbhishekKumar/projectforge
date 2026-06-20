"use server";

import * as Sentry from "@sentry/nextjs";
import { auth } from "@clerk/nextjs/server";
import { revalidatePath } from "next/cache";
import { createInsforgeServer } from "@/lib/insforge-server";
import { z } from "zod";
import { verifyMembership, verifyAdminOrOwnerRole } from "@/lib/auth-helpers";
import { logger, flushLogsAfterResponse } from "@/lib/logger";
import { orgIdSchema } from "@/lib/utils";
import type { CustomField, CustomFieldValue } from "@/types";

// Input validation schemas
const entityTypeSchema = z.enum(["TASK", "PROJECT"]);
const fieldTypeSchema = z.enum(["TEXT", "NUMBER", "SELECT", "DATE"]);

const createCustomFieldSchema = z.object({
  orgId: orgIdSchema,
  entityType: entityTypeSchema,
  name: z.string().min(1, "Name is required").max(50, "Name must be under 50 characters"),
  fieldType: fieldTypeSchema,
  options: z.array(z.string().min(1)).nullable().optional(),
});

const updateCustomFieldSchema = z.object({
  orgId: orgIdSchema,
  fieldId: z.string().uuid(),
  name: z.string().min(1, "Name is required").max(50, "Name must be under 50 characters"),
  options: z.array(z.string().min(1)).nullable().optional(),
});

const deleteCustomFieldSchema = z.object({
  orgId: orgIdSchema,
  fieldId: z.string().uuid(),
});

const upsertValueSchema = z.object({
  orgId: orgIdSchema,
  fieldId: z.string().uuid(),
  entityId: z.string().uuid(),
  value: z.string().max(1000, "Value must be under 1000 characters"),
});

export async function createCustomField(
  orgId: string,
  entityType: "TASK" | "PROJECT",
  name: string,
  fieldType: "TEXT" | "NUMBER" | "SELECT" | "DATE",
  options: string[] | null = null
): Promise<{ success: boolean; data?: CustomField; error?: string }> {
  try {
    const validated = createCustomFieldSchema.safeParse({ orgId, entityType, name, fieldType, options });
    if (!validated.success) {
      return { success: false, error: validated.error.issues[0].message };
    }

    const { userId } = await auth();
    if (!userId) return { success: false, error: "Unauthorized" };

    const insforge = createInsforgeServer(userId);
    const hasAccess = await verifyAdminOrOwnerRole(insforge, orgId, userId);
    if (!hasAccess) {
      return { success: false, error: "Only admins and owners can manage custom fields." };
    }

    const { data, error } = await insforge.database
      .from("custom_fields")
      .insert({
        organization_id: orgId,
        entity_type: entityType,
        name,
        field_type: fieldType,
        options,
      })
      .select()
      .single();

    if (error) {
      logger.error({ error, orgId, name }, "Failed to create custom field");
      return { success: false, error: "Failed to create custom field. Name may already exist." };
    }

    revalidatePath(`/settings/custom-fields`);
    return { success: true, data };
  } catch (err) {
    logger.error(err, "Unexpected error in createCustomField");
    Sentry.captureException(err);
    return { success: false, error: "An unexpected error occurred" };
  } finally {
    flushLogsAfterResponse();
  }
}

export async function updateCustomField(
  orgId: string,
  fieldId: string,
  name: string,
  options: string[] | null = null
): Promise<{ success: boolean; data?: CustomField; error?: string }> {
  try {
    const validated = updateCustomFieldSchema.safeParse({ orgId, fieldId, name, options });
    if (!validated.success) {
      return { success: false, error: validated.error.issues[0].message };
    }

    const { userId } = await auth();
    if (!userId) return { success: false, error: "Unauthorized" };

    const insforge = createInsforgeServer(userId);
    const hasAccess = await verifyAdminOrOwnerRole(insforge, orgId, userId);
    if (!hasAccess) {
      return { success: false, error: "Only admins and owners can manage custom fields." };
    }

    const { data, error } = await insforge.database
      .from("custom_fields")
      .update({ name, options })
      .eq("id", fieldId)
      .eq("organization_id", orgId)
      .select()
      .single();

    if (error) {
      logger.error({ error, fieldId, name }, "Failed to update custom field");
      return { success: false, error: "Failed to update custom field" };
    }

    revalidatePath(`/settings/custom-fields`);
    return { success: true, data };
  } catch (err) {
    logger.error(err, "Unexpected error in updateCustomField");
    Sentry.captureException(err);
    return { success: false, error: "An unexpected error occurred" };
  } finally {
    flushLogsAfterResponse();
  }
}

export async function deleteCustomField(
  orgId: string,
  fieldId: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const validated = deleteCustomFieldSchema.safeParse({ orgId, fieldId });
    if (!validated.success) {
      return { success: false, error: validated.error.issues[0].message };
    }

    const { userId } = await auth();
    if (!userId) return { success: false, error: "Unauthorized" };

    const insforge = createInsforgeServer(userId);
    const hasAccess = await verifyAdminOrOwnerRole(insforge, orgId, userId);
    if (!hasAccess) {
      return { success: false, error: "Only admins and owners can manage custom fields." };
    }

    const { error } = await insforge.database
      .from("custom_fields")
      .delete()
      .eq("id", fieldId)
      .eq("organization_id", orgId);

    if (error) {
      logger.error({ error, fieldId }, "Failed to delete custom field");
      return { success: false, error: "Failed to delete custom field" };
    }

    revalidatePath(`/settings/custom-fields`);
    return { success: true };
  } catch (err) {
    logger.error(err, "Unexpected error in deleteCustomField");
    Sentry.captureException(err);
    return { success: false, error: "An unexpected error occurred" };
  } finally {
    flushLogsAfterResponse();
  }
}

export async function getCustomFields(
  orgId: string,
  entityType: "TASK" | "PROJECT"
): Promise<{ success: boolean; data?: CustomField[]; error?: string }> {
  try {
    const { userId } = await auth();
    if (!userId) return { success: false, error: "Unauthorized" };

    const insforge = createInsforgeServer(userId);
    const isMember = await verifyMembership(insforge, orgId, userId);
    if (!isMember) return { success: false, error: "Access denied" };

    const { data, error } = await insforge.database
      .from("custom_fields")
      .select("*")
      .eq("organization_id", orgId)
      .eq("entity_type", entityType)
      .order("name", { ascending: true });

    if (error) {
      logger.error({ error, orgId, entityType }, "Failed to fetch custom fields");
      return { success: false, error: "Failed to fetch custom fields" };
    }

    return { success: true, data };
  } catch (err) {
    logger.error(err, "Unexpected error in getCustomFields");
    Sentry.captureException(err);
    return { success: false, error: "An unexpected error occurred" };
  } finally {
    flushLogsAfterResponse();
  }
}

export async function getCustomFieldValues(
  entityId: string
): Promise<{ success: boolean; data?: CustomFieldValue[]; error?: string }> {
  try {
    const { userId } = await auth();
    if (!userId) return { success: false, error: "Unauthorized" };

    const insforge = createInsforgeServer(userId);

    const { data, error } = await insforge.database
      .from("custom_field_values")
      .select("*, custom_fields(organization_id, name, field_type, options)")
      .eq("entity_id", entityId);

    if (error) {
      logger.error({ error, entityId }, "Failed to fetch custom field values");
      return { success: false, error: "Failed to fetch custom field values" };
    }

    return { success: true, data };
  } catch (err) {
    logger.error(err, "Unexpected error in getCustomFieldValues");
    Sentry.captureException(err);
    return { success: false, error: "An unexpected error occurred" };
  } finally {
    flushLogsAfterResponse();
  }
}

export async function upsertCustomFieldValue(
  orgId: string,
  fieldId: string,
  entityId: string,
  value: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const validated = upsertValueSchema.safeParse({ orgId, fieldId, entityId, value });
    if (!validated.success) {
      return { success: false, error: validated.error.issues[0].message };
    }

    const { userId } = await auth();
    if (!userId) return { success: false, error: "Unauthorized" };

    const insforge = createInsforgeServer(userId);
    const isMember = await verifyMembership(insforge, orgId, userId);
    if (!isMember) return { success: false, error: "Access denied" };

    // Load custom field type and options for validation
    const { data: field, error: fieldError } = await insforge.database
      .from("custom_fields")
      .select("field_type, options")
      .eq("id", fieldId)
      .eq("organization_id", orgId)
      .maybeSingle();

    if (fieldError || !field) {
      return { success: false, error: "Custom field not found" };
    }

    const trimmedValue = value.trim();

    // Type-specific validations
    if (field.field_type === "NUMBER") {
      if (trimmedValue !== "" && isNaN(Number(trimmedValue))) {
        return { success: false, error: "Value must be a valid number" };
      }
    } else if (field.field_type === "DATE") {
      if (trimmedValue !== "" && isNaN(Date.parse(trimmedValue))) {
        return { success: false, error: "Value must be a valid date" };
      }
    } else if (field.field_type === "SELECT") {
      if (trimmedValue !== "") {
        const allowedOptions = field.options || [];
        if (!allowedOptions.includes(trimmedValue)) {
          return { success: false, error: `Value must be one of: ${allowedOptions.join(", ")}` };
        }
      }
    }

    // Save/upsert
    const { error: upsertError } = await insforge.database
      .from("custom_field_values")
      .upsert(
        {
          custom_field_id: fieldId,
          entity_id: entityId,
          value: trimmedValue,
        },
        { onConflict: "custom_field_id,entity_id" }
      );

    if (upsertError) {
      logger.error({ error: upsertError, fieldId, entityId }, "Failed to upsert custom field value");
      return { success: false, error: "Failed to save custom field value" };
    }

    return { success: true };
  } catch (err) {
    logger.error(err, "Unexpected error in upsertCustomFieldValue");
    Sentry.captureException(err);
    return { success: false, error: "An unexpected error occurred" };
  } finally {
    flushLogsAfterResponse();
  }
}
