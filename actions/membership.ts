"use server";

import * as Sentry from "@sentry/nextjs";
import { auth } from "@clerk/nextjs/server";
import { after } from "next/server";
import { revalidatePath } from "next/cache";
import { createInsforgeServer } from "@/lib/insforge-server";
import { writeAuditLog } from "@/lib/audit";
import { z } from "zod";
import type { MembershipRole } from "@/types";
import { orgIdSchema, membershipIdSchema } from "@/lib/utils";
import { logger, flushLogsAfterResponse } from "@/lib/logger";
import { getManagedDepartmentId } from "@/lib/auth-helpers";


const getOrganizationMembersInputSchema = z.object({
  orgId: orgIdSchema,
});

const updateMemberRoleInputSchema = z.object({
  membershipId: membershipIdSchema,
  orgId: orgIdSchema,
  newRole: z.string().min(2).max(50),
});

const removeMemberInputSchema = z.object({
  membershipId: membershipIdSchema,
  orgId: orgIdSchema,
});

export type MemberListItem = {
  id: string;
  userId: string;
  role: MembershipRole;
  customRoleId: string | null;
  customRoleName: string | null;
  createdAt: string;
  name: string;
  email: string;
  avatarUrl: string | null;
  departmentId?: string | null;
};

export async function getOrganizationMembers(
  orgId: string
): Promise<{ success: boolean; data: MemberListItem[]; error?: string }> {
  const validated = getOrganizationMembersInputSchema.safeParse({ orgId });
  if (!validated.success) {
    return { success: false, error: validated.error.issues[0].message, data: [] };
  }

  try {
    const { userId } = await auth();
    if (!userId) return { success: false, error: "Unauthorized", data: [] };

    const insforge = createInsforgeServer(userId);

    // Verify requester is a member of the organization
    const { data: requesterMember } = await insforge.database
      .from("memberships")
      .select("id")
      .eq("organization_id", validated.data.orgId)
      .eq("user_id", userId)
      .maybeSingle();

    if (!requesterMember) {
      return { success: false, error: "Not a member of this organization", data: [] };
    }

    // Fetch members with profiles, custom_role_id and department_id joined
    const { data, error } = await insforge.database
      .from("memberships")
      .select(`
        id,
        role,
        custom_role_id,
        department_id,
        created_at,
        user_id,
        profiles (
          id,
          full_name,
          email,
          avatar_url
        )
      `)
      .eq("organization_id", validated.data.orgId);

    if (error) {
      logger.error({ error, orgId: validated.data.orgId }, "Failed to fetch organization members");
      return { success: false, error: "Failed to fetch members", data: [] };
    }

    let filteredData = data || [];
    const managedDeptId = await getManagedDepartmentId(insforge, validated.data.orgId, userId);

    if (managedDeptId && filteredData.length > 0) {
      const { data: depts } = await insforge.database
        .from("departments")
        .select("id, parent_department_id")
        .eq("organization_id", validated.data.orgId);

      const childDeptIds = new Set<string>();
      if (depts) {
        const deptChildrenMap = new Map<string, string[]>();
        depts.forEach((d) => {
          if (d.parent_department_id) {
            if (!deptChildrenMap.has(d.parent_department_id)) {
              deptChildrenMap.set(d.parent_department_id, []);
            }
            deptChildrenMap.get(d.parent_department_id)!.push(d.id);
          }
        });

        const collectDeptIds = (deptId: string) => {
          childDeptIds.add(deptId);
          const children = deptChildrenMap.get(deptId) || [];
          children.forEach(collectDeptIds);
        };

        collectDeptIds(managedDeptId);
      }

      filteredData = filteredData.filter((m) => m.department_id && childDeptIds.has(m.department_id));
    }

    const members: MemberListItem[] = filteredData.map((m) => {
      const profile = Array.isArray(m.profiles) ? m.profiles[0] : m.profiles;
      return {
        id: m.id,
        userId: m.user_id,
        role: m.role as MembershipRole,
        customRoleId: (m as Record<string, unknown>).custom_role_id as string | null,
        customRoleName: null, // derived client-side from customRoles prop
        createdAt: m.created_at,
        name: profile?.full_name || "Unknown Member",
        email: profile?.email || "",
        avatarUrl: profile?.avatar_url || null,
        departmentId: m.department_id,
      };
    });

    return { success: true, data: members };
  } catch (err) {
    logger.error({ error: err, orgId }, "Unexpected error in getOrganizationMembers Server Action");
    Sentry.captureException(err);
    return { success: false, error: "An unexpected error occurred", data: [] };
  } finally {
    flushLogsAfterResponse();
  }
}



export async function updateMemberRole(
  membershipId: string,
  orgId: string,
  newRole: string
): Promise<{ success: boolean; error?: string }> {
  const validated = updateMemberRoleInputSchema.safeParse({ membershipId, orgId, newRole });
  if (!validated.success) {
    return { success: false, error: validated.error.issues[0].message };
  }

  try {
    const { userId } = await auth();
    if (!userId) return { success: false, error: "Unauthorized" };

    const insforge = createInsforgeServer(userId);

    // Fetch requester membership
    const { data: requester } = await insforge.database
      .from("memberships")
      .select("role")
      .eq("organization_id", validated.data.orgId)
      .eq("user_id", userId)
      .maybeSingle();

    if (!requester || (requester.role !== "OWNER" && requester.role !== "ADMIN")) {
      return { success: false, error: "Only owners and admins can update roles." };
    }

    // Fetch target membership
    const { data: target } = await insforge.database
      .from("memberships")
      .select("role")
      .eq("id", validated.data.membershipId)
      .eq("organization_id", validated.data.orgId)
      .maybeSingle();

    if (!target) {
      return { success: false, error: "Member not found in this workspace." };
    }

    // Guards
    if (target.role === "OWNER") {
      return { success: false, error: "Cannot modify the owner's role." };
    }

    if (requester.role === "ADMIN" && target.role === "ADMIN") {
      return { success: false, error: "Admins cannot modify other admins." };
    }

    // Determine if newRole is a UUID (custom role) or a default role string
    const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    const isCustomRole = UUID_REGEX.test(validated.data.newRole);

    // Perform update
    const { error } = await insforge.database
      .from("memberships")
      .update(
        isCustomRole
          ? // Custom role: set FK, keep base role as MEMBER
            { custom_role_id: validated.data.newRole, role: "MEMBER" }
          : // Default role: clear custom_role_id, set role to the string
            { custom_role_id: null, role: validated.data.newRole }
      )
      .eq("id", validated.data.membershipId)
      .eq("organization_id", validated.data.orgId);

    if (error) {
      logger.error({ error, membershipId: validated.data.membershipId, newRole: validated.data.newRole }, "Failed to update member role");
      return { success: false, error: "Failed to update role." };
    }

    after(() =>
      writeAuditLog(
        validated.data.orgId,
        userId,
        "role.updated",
        "membership",
        validated.data.membershipId,
        { from: target.role, to: validated.data.newRole }
      )
    );

    revalidatePath("/organizations/settings");
    revalidatePath("/dashboard");
    return { success: true };
  } catch (err) {
    logger.error({ error: err, membershipId, newRole }, "Unexpected error in updateMemberRole Server Action");
    Sentry.captureException(err);
    return { success: false, error: "An unexpected error occurred" };
  } finally {
    flushLogsAfterResponse();
  }
}

export async function removeMember(
  membershipId: string,
  orgId: string
): Promise<{ success: boolean; error?: string }> {
  const validated = removeMemberInputSchema.safeParse({ membershipId, orgId });
  if (!validated.success) {
    return { success: false, error: validated.error.issues[0].message };
  }

  try {
    const { userId } = await auth();
    if (!userId) return { success: false, error: "Unauthorized" };

    const insforge = createInsforgeServer(userId);

    // Fetch requester membership
    const { data: requester } = await insforge.database
      .from("memberships")
      .select("role")
      .eq("organization_id", validated.data.orgId)
      .eq("user_id", userId)
      .maybeSingle();

    if (!requester || (requester.role !== "OWNER" && requester.role !== "ADMIN")) {
      return { success: false, error: "Only owners and admins can remove members." };
    }

    // Fetch target membership
    const { data: target } = await insforge.database
      .from("memberships")
      .select("role")
      .eq("id", validated.data.membershipId)
      .eq("organization_id", validated.data.orgId)
      .maybeSingle();

    if (!target) {
      return { success: false, error: "Member not found in this workspace." };
    }

    // Guards
    if (target.role === "OWNER") {
      return { success: false, error: "Cannot remove the owner." };
    }

    if (requester.role === "ADMIN" && target.role === "ADMIN") {
      return { success: false, error: "Admins cannot remove other admins." };
    }

    // Perform delete
    const { error } = await insforge.database
      .from("memberships")
      .delete()
      .eq("id", validated.data.membershipId)
      .eq("organization_id", validated.data.orgId);

    if (error) {
      logger.error({ error, membershipId: validated.data.membershipId }, "Failed to remove member");
      return { success: false, error: "Failed to remove member." };
    }

    after(() =>
      writeAuditLog(
        validated.data.orgId,
        userId,
        "member.removed",
        "membership",
        validated.data.membershipId,
        { removedRole: target.role }
      )
    );

    revalidatePath("/organizations/settings");
    revalidatePath("/dashboard");
    return { success: true };
  } catch (err) {
    logger.error({ error: err, membershipId }, "Unexpected error in removeMember Server Action");
    Sentry.captureException(err);
    return { success: false, error: "An unexpected error occurred" };
  } finally {
    flushLogsAfterResponse();
  }
}

