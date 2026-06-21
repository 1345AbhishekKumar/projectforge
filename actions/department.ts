"use server";

import * as Sentry from "@sentry/nextjs";
import { auth } from "@clerk/nextjs/server";
import { after } from "next/server";
import { revalidatePath } from "next/cache";
import { createInsforgeServer } from "@/lib/insforge-server";
import { writeAuditLog } from "@/lib/audit";
import { z } from "zod";
import { orgIdSchema } from "@/lib/utils";
import { verifyAdminOrOwnerRole, verifyMembership, isChildDepartment } from "@/lib/auth-helpers";
import { logger, flushLogsAfterResponse } from "@/lib/logger";

const departmentNameSchema = z.string().trim().min(2, "Department name must be at least 2 characters").max(50);

const createDeptInputSchema = z.object({
  orgId: orgIdSchema,
  name: departmentNameSchema,
  parentDepartmentId: z.string().uuid().nullable().optional(),
  managerId: z.string().nullable().optional(),
});

const updateDeptInputSchema = z.object({
  orgId: orgIdSchema,
  id: z.string().uuid(),
  name: departmentNameSchema,
  parentDepartmentId: z.string().uuid().nullable().optional(),
  managerId: z.string().nullable().optional(),
});

const deleteDeptInputSchema = z.object({
  orgId: orgIdSchema,
  id: z.string().uuid(),
});

const assignMemberInputSchema = z.object({
  orgId: orgIdSchema,
  membershipId: z.string().uuid(),
  departmentId: z.string().uuid().nullable().optional(),
});

export async function getDepartments(
  orgId: string
): Promise<{ success: boolean; data: Record<string, unknown>[]; error?: string }> {
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
      .from("departments")
      .select("*")
      .eq("organization_id", validated.data.orgId)
      .order("name", { ascending: true });

    if (error) {
      logger.error({ error, orgId: validated.data.orgId }, "Failed to fetch departments");
      return { success: false, error: "Failed to fetch departments", data: [] };
    }

    return { success: true, data: data || [] };
  } catch (err) {
    logger.error({ error: err, orgId }, "Unexpected error in getDepartments");
    Sentry.captureException(err);
    return { success: false, error: "An unexpected error occurred", data: [] };
  } finally {
    flushLogsAfterResponse();
  }
}

export async function createDepartment(
  orgId: string,
  name: string,
  parentDepartmentId: string | null = null,
  managerId: string | null = null
): Promise<{ success: boolean; id?: string; error?: string }> {
  const validated = createDeptInputSchema.safeParse({ orgId, name, parentDepartmentId, managerId });
  if (!validated.success) {
    return { success: false, error: validated.error.issues[0].message };
  }

  try {
    const { userId } = await auth();
    if (!userId) return { success: false, error: "Unauthorized" };

    const insforge = createInsforgeServer(userId);
    const isAdminOrOwner = await verifyAdminOrOwnerRole(insforge, validated.data.orgId, userId);
    if (!isAdminOrOwner) return { success: false, error: "Only owners and admins can create departments" };

    // Verify parent belongs to same org if provided
    if (validated.data.parentDepartmentId) {
      const { data: parent } = await insforge.database
        .from("departments")
        .select("id")
        .eq("id", validated.data.parentDepartmentId)
        .eq("organization_id", validated.data.orgId)
        .maybeSingle();

      if (!parent) return { success: false, error: "Parent department not found in this organization" };
    }

    const { data: dept, error } = await insforge.database
      .from("departments")
      .insert([
        {
          organization_id: validated.data.orgId,
          name: validated.data.name,
          parent_department_id: validated.data.parentDepartmentId || null,
          manager_id: validated.data.managerId || null,
        },
      ])
      .select("id")
      .single();

    if (error || !dept) {
      logger.error({ error, orgId: validated.data.orgId, name: validated.data.name }, "Failed to create department");
      return { success: false, error: "Failed to create department" };
    }

    after(() =>
      writeAuditLog(
        validated.data.orgId,
        userId,
        "department.created",
        "department",
        dept.id,
        { name: validated.data.name }
      )
    );

    revalidatePath("/settings/departments");
    revalidatePath("/reports/enterprise");
    return { success: true, id: dept.id };
  } catch (err) {
    logger.error({ error: err, orgId }, "Unexpected error in createDepartment");
    Sentry.captureException(err);
    return { success: false, error: "An unexpected error occurred" };
  } finally {
    flushLogsAfterResponse();
  }
}

export async function updateDepartment(
  orgId: string,
  id: string,
  name: string,
  parentDepartmentId: string | null = null,
  managerId: string | null = null
): Promise<{ success: boolean; error?: string }> {
  const validated = updateDeptInputSchema.safeParse({ orgId, id, name, parentDepartmentId, managerId });
  if (!validated.success) {
    return { success: false, error: validated.error.issues[0].message };
  }

  try {
    const { userId } = await auth();
    if (!userId) return { success: false, error: "Unauthorized" };

    const insforge = createInsforgeServer(userId);
    const isAdminOrOwner = await verifyAdminOrOwnerRole(insforge, validated.data.orgId, userId);
    if (!isAdminOrOwner) return { success: false, error: "Only owners and admins can update departments" };

    // Prevent cycles
    if (validated.data.parentDepartmentId) {
      if (validated.data.parentDepartmentId === validated.data.id) {
        return { success: false, error: "A department cannot be its own parent" };
      }

      const isDescendant = await isChildDepartment(
        insforge,
        validated.data.orgId,
        validated.data.parentDepartmentId,
        validated.data.id
      );

      if (isDescendant) {
        return { success: false, error: "A department cannot have one of its child departments as its parent" };
      }
    }

    const { error } = await insforge.database
      .from("departments")
      .update({
        name: validated.data.name,
        parent_department_id: validated.data.parentDepartmentId || null,
        manager_id: validated.data.managerId || null,
      })
      .eq("id", validated.data.id)
      .eq("organization_id", validated.data.orgId);

    if (error) {
      logger.error({ error, id: validated.data.id }, "Failed to update department");
      return { success: false, error: "Failed to update department" };
    }

    after(() =>
      writeAuditLog(
        validated.data.orgId,
        userId,
        "department.updated",
        "department",
        validated.data.id,
        { name: validated.data.name }
      )
    );

    revalidatePath("/settings/departments");
    revalidatePath("/reports/enterprise");
    return { success: true };
  } catch (err) {
    logger.error({ error: err, orgId, id }, "Unexpected error in updateDepartment");
    Sentry.captureException(err);
    return { success: false, error: "An unexpected error occurred" };
  } finally {
    flushLogsAfterResponse();
  }
}

export async function deleteDepartment(
  orgId: string,
  id: string
): Promise<{ success: boolean; error?: string }> {
  const validated = deleteDeptInputSchema.safeParse({ orgId, id });
  if (!validated.success) {
    return { success: false, error: validated.error.issues[0].message };
  }

  try {
    const { userId } = await auth();
    if (!userId) return { success: false, error: "Unauthorized" };

    const insforge = createInsforgeServer(userId);
    const isAdminOrOwner = await verifyAdminOrOwnerRole(insforge, validated.data.orgId, userId);
    if (!isAdminOrOwner) return { success: false, error: "Only owners and admins can delete departments" };

    // Reset parent departments for child departments
    await insforge.database
      .from("departments")
      .update({ parent_department_id: null })
      .eq("parent_department_id", validated.data.id)
      .eq("organization_id", validated.data.orgId);

    // Reset departments on memberships
    await insforge.database
      .from("memberships")
      .update({ department_id: null })
      .eq("department_id", validated.data.id)
      .eq("organization_id", validated.data.orgId);

    // Reset departments on projects
    await insforge.database
      .from("projects")
      .update({ department_id: null })
      .eq("department_id", validated.data.id)
      .eq("organization_id", validated.data.orgId);

    const { error } = await insforge.database
      .from("departments")
      .delete()
      .eq("id", validated.data.id)
      .eq("organization_id", validated.data.orgId);

    if (error) {
      logger.error({ error, id: validated.data.id }, "Failed to delete department");
      return { success: false, error: "Failed to delete department" };
    }

    after(() =>
      writeAuditLog(
        validated.data.orgId,
        userId,
        "department.deleted",
        "department",
        validated.data.id,
        {}
      )
    );

    revalidatePath("/settings/departments");
    revalidatePath("/reports/enterprise");
    return { success: true };
  } catch (err) {
    logger.error({ error: err, orgId, id }, "Unexpected error in deleteDepartment");
    Sentry.captureException(err);
    return { success: false, error: "An unexpected error occurred" };
  } finally {
    flushLogsAfterResponse();
  }
}

export async function assignMemberToDepartment(
  orgId: string,
  membershipId: string,
  departmentId: string | null = null
): Promise<{ success: boolean; error?: string }> {
  const validated = assignMemberInputSchema.safeParse({ orgId, membershipId, departmentId });
  if (!validated.success) {
    return { success: false, error: validated.error.issues[0].message };
  }

  try {
    const { userId } = await auth();
    if (!userId) return { success: false, error: "Unauthorized" };

    const insforge = createInsforgeServer(userId);
    const isAdminOrOwner = await verifyAdminOrOwnerRole(insforge, validated.data.orgId, userId);
    if (!isAdminOrOwner) return { success: false, error: "Only owners and admins can assign members to departments" };

    // Validate department exists in same org
    if (validated.data.departmentId) {
      const { data: dept } = await insforge.database
        .from("departments")
        .select("id")
        .eq("id", validated.data.departmentId)
        .eq("organization_id", validated.data.orgId)
        .maybeSingle();

      if (!dept) return { success: false, error: "Department not found in this organization" };
    }

    const { error } = await insforge.database
      .from("memberships")
      .update({ department_id: validated.data.departmentId || null })
      .eq("id", validated.data.membershipId)
      .eq("organization_id", validated.data.orgId);

    if (error) {
      logger.error({ error, membershipId: validated.data.membershipId }, "Failed to assign member to department");
      return { success: false, error: "Failed to assign member to department" };
    }

    revalidatePath("/settings/departments");
    revalidatePath("/reports/enterprise");
    return { success: true };
  } catch (err) {
    logger.error({ error: err, orgId, membershipId }, "Unexpected error in assignMemberToDepartment");
    Sentry.captureException(err);
    return { success: false, error: "An unexpected error occurred" };
  } finally {
    flushLogsAfterResponse();
  }
}
