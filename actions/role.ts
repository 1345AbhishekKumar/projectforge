"use server";

import { auth } from "@clerk/nextjs/server";
import * as Sentry from "@sentry/nextjs";
import { createInsforgeServer } from "@/lib/insforge-server";
import { z } from "zod";
import { orgIdSchema } from "@/lib/utils";
import { verifyAdminOrOwnerRole, verifyMembership } from "@/lib/auth-helpers";
import { logger, flushLogsAfterResponse } from "@/lib/logger";

const roleNameSchema = z.string().min(2, "Role name must be at least 2 characters").max(50);
const permissionIdsSchema = z.array(z.string().uuid());

const createRoleInputSchema = z.object({
  orgId: orgIdSchema,
  name: roleNameSchema,
  permissionIds: permissionIdsSchema,
});

const updateRoleInputSchema = z.object({
  orgId: orgIdSchema,
  roleId: z.string().uuid(),
  name: roleNameSchema,
  permissionIds: permissionIdsSchema,
});

const deleteRoleInputSchema = z.object({
  orgId: orgIdSchema,
  roleId: z.string().uuid(),
});

export async function getPermissions(): Promise<{ success: boolean; data: Record<string, unknown>[]; error?: string }> {
  try {
    const { userId } = await auth();
    if (!userId) return { success: false, error: "Unauthorized", data: [] };

    const insforge = createInsforgeServer(userId);
    const { data, error } = await insforge.database
      .from("permissions")
      .select("*")
      .order("resource", { ascending: true })
      .order("action", { ascending: true });

    if (error) {
      logger.error({ error }, "Failed to fetch permissions");
      return { success: false, error: "Failed to fetch permissions", data: [] };
    }

    return { success: true, data: data || [] };
  } catch (err) {
    logger.error({ error: err }, "Unexpected error in getPermissions Server Action");
    Sentry.captureException(err);
    return { success: false, error: "An unexpected error occurred", data: [] };
  } finally {
    flushLogsAfterResponse();
  }
}

export async function getCustomRoles(orgId: string): Promise<{ success: boolean; data: Record<string, unknown>[]; error?: string }> {
  const validated = z.object({ orgId: orgIdSchema }).safeParse({ orgId });
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
      .from("roles")
      .select(`
        id,
        name,
        created_at,
        role_permissions (
          permission_id,
          permissions (
            id,
            name,
            resource,
            action
          )
        )
      `)
      .eq("organization_id", validated.data.orgId)
      .order("name", { ascending: true });

    if (error) {
      logger.error({ error, orgId: validated.data.orgId }, "Failed to fetch custom roles");
      return { success: false, error: "Failed to fetch custom roles", data: [] };
    }

    return { success: true, data: data || [] };
  } catch (err) {
    logger.error({ error: err, orgId }, "Unexpected error in getCustomRoles Server Action");
    Sentry.captureException(err);
    return { success: false, error: "An unexpected error occurred", data: [] };
  } finally {
    flushLogsAfterResponse();
  }
}

export async function createCustomRole(orgId: string, name: string, permissionIds: string[]): Promise<{ success: boolean; roleId?: string; error?: string }> {
  const validated = createRoleInputSchema.safeParse({ orgId, name, permissionIds });
  if (!validated.success) {
    return { success: false, error: validated.error.issues[0].message };
  }

  try {
    const { userId } = await auth();
    if (!userId) return { success: false, error: "Unauthorized" };

    const insforge = createInsforgeServer(userId);
    const isAdminOrOwner = await verifyAdminOrOwnerRole(insforge, validated.data.orgId, userId);
    if (!isAdminOrOwner) return { success: false, error: "Only owners and admins can create roles." };

    // 1. Insert role
    const { data: roleData, error: roleError } = await insforge.database
      .from("roles")
      .insert([
        {
          organization_id: validated.data.orgId,
          name: validated.data.name,
        },
      ])
      .select("id")
      .single();

    if (roleError) {
      if (roleError.message?.includes("unique") || roleError.details?.includes("already exists")) {
        return { success: false, error: "A role with this name already exists in this workspace" };
      }
      logger.error({ error: roleError, orgId: validated.data.orgId, name: validated.data.name }, "Failed to create role");
      return { success: false, error: "Failed to create role" };
    }

    const roleId = roleData.id;

    // 2. Insert role permissions if any
    if (validated.data.permissionIds.length > 0) {
      const rpPayload = validated.data.permissionIds.map((pId) => ({
        role_id: roleId,
        permission_id: pId,
      }));

      const { error: rpError } = await insforge.database
        .from("role_permissions")
        .insert(rpPayload);

      if (rpError) {
        logger.error({ error: rpError, roleId }, "Failed to insert role permissions");
        // Clean up role
        await insforge.database.from("roles").delete().eq("id", roleId);
        return { success: false, error: "Failed to set permissions for this role" };
      }
    }

    return { success: true, roleId };
  } catch (err) {
    logger.error({ error: err, orgId }, "Unexpected error in createCustomRole Server Action");
    Sentry.captureException(err);
    return { success: false, error: "An unexpected error occurred" };
  } finally {
    flushLogsAfterResponse();
  }
}

export async function updateCustomRole(orgId: string, roleId: string, name: string, permissionIds: string[]): Promise<{ success: boolean; error?: string }> {
  const validated = updateRoleInputSchema.safeParse({ orgId, roleId, name, permissionIds });
  if (!validated.success) {
    return { success: false, error: validated.error.issues[0].message };
  }

  try {
    const { userId } = await auth();
    if (!userId) return { success: false, error: "Unauthorized" };

    const insforge = createInsforgeServer(userId);
    const isAdminOrOwner = await verifyAdminOrOwnerRole(insforge, validated.data.orgId, userId);
    if (!isAdminOrOwner) return { success: false, error: "Only owners and admins can update roles." };

    // 1. Update role name
    const { error: roleError } = await insforge.database
      .from("roles")
      .update({ name: validated.data.name })
      .eq("id", validated.data.roleId)
      .eq("organization_id", validated.data.orgId);

    if (roleError) {
      logger.error({ error: roleError, roleId: validated.data.roleId }, "Failed to update role name");
      return { success: false, error: "Failed to update role" };
    }

    // 2. Delete existing permissions
    const { error: deleteError } = await insforge.database
      .from("role_permissions")
      .delete()
      .eq("role_id", validated.data.roleId);

    if (deleteError) {
      logger.error({ error: deleteError, roleId: validated.data.roleId }, "Failed to clear old permissions");
      return { success: false, error: "Failed to update role permissions" };
    }

    // 3. Insert new permissions
    if (validated.data.permissionIds.length > 0) {
      const rpPayload = validated.data.permissionIds.map((pId) => ({
        role_id: validated.data.roleId,
        permission_id: pId,
      }));

      const { error: rpError } = await insforge.database
        .from("role_permissions")
        .insert(rpPayload);

      if (rpError) {
        logger.error({ error: rpError, roleId: validated.data.roleId }, "Failed to insert new role permissions");
        return { success: false, error: "Failed to update role permissions" };
      }
    }

    return { success: true };
  } catch (err) {
    logger.error({ error: err, orgId }, "Unexpected error in updateCustomRole Server Action");
    Sentry.captureException(err);
    return { success: false, error: "An unexpected error occurred" };
  } finally {
    flushLogsAfterResponse();
  }
}

export async function deleteCustomRole(orgId: string, roleId: string): Promise<{ success: boolean; error?: string }> {
  const validated = deleteRoleInputSchema.safeParse({ orgId, roleId });
  if (!validated.success) {
    return { success: false, error: validated.error.issues[0].message };
  }

  try {
    const { userId } = await auth();
    if (!userId) return { success: false, error: "Unauthorized" };

    const insforge = createInsforgeServer(userId);
    const isAdminOrOwner = await verifyAdminOrOwnerRole(insforge, validated.data.orgId, userId);
    if (!isAdminOrOwner) return { success: false, error: "Only owners and admins can delete roles." };

    const { error } = await insforge.database
      .from("roles")
      .delete()
      .eq("id", validated.data.roleId)
      .eq("organization_id", validated.data.orgId);

    if (error) {
      logger.error({ error, roleId: validated.data.roleId }, "Failed to delete custom role");
      return { success: false, error: "Failed to delete role" };
    }

    return { success: true };
  } catch (err) {
    logger.error({ error: err, orgId }, "Unexpected error in deleteCustomRole Server Action");
    Sentry.captureException(err);
    return { success: false, error: "An unexpected error occurred" };
  } finally {
    flushLogsAfterResponse();
  }
}
