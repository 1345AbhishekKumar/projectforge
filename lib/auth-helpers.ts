import { createInsforgeServer } from "./insforge-server";
import { cache } from "react";

/**
 * Checks if a user is a member of the specified organization.
 */
export const verifyMembership = cache(async (
  insforge: ReturnType<typeof createInsforgeServer>,
  orgId: string,
  userId: string
): Promise<boolean> => {
  const { data } = await insforge.database
    .from("memberships")
    .select("id")
    .eq("organization_id", orgId)
    .eq("user_id", userId)
    .maybeSingle();
  return !!data;
});

/**
 * Checks if a user has OWNER or ADMIN privileges in the specified organization.
 */
export const verifyAdminOrOwnerRole = cache(async (
  insforge: ReturnType<typeof createInsforgeServer>,
  orgId: string,
  userId: string
): Promise<boolean> => {
  const { data } = await insforge.database
    .from("memberships")
    .select("role")
    .eq("organization_id", orgId)
    .eq("user_id", userId)
    .maybeSingle();

  if (!data) return false;
  return data.role === "OWNER" || data.role === "ADMIN";
});

/**
 * Fetches all memberships with their nested profiles for a given organization.
 */
export const getOrganizationMemberships = cache(async (
  insforge: ReturnType<typeof createInsforgeServer>,
  orgId: string,
  limit?: number
) => {
  let query = insforge.database
    .from("memberships")
    .select(`
      user_id,
      role,
      profiles (
        full_name,
        avatar_url,
        email
      )
    `)
    .eq("organization_id", orgId);

  if (limit !== undefined) {
    query = query.limit(limit);
  }
  return query;
});

/**
 * Verifies if a user has specific resource and action permissions.
 * Supports both custom database roles and default roles fallback.
 */
export const verifyPermission = cache(async (
  insforge: ReturnType<typeof createInsforgeServer>,
  orgId: string,
  userId: string,
  resource: string,
  action: string
): Promise<boolean> => {
  // 1. Get user membership — include custom_role_id FK
  const { data: memberData } = await insforge.database
    .from("memberships")
    .select("role, custom_role_id")
    .eq("organization_id", orgId)
    .eq("user_id", userId)
    .maybeSingle();

  if (!memberData) return false;
  const roleName = memberData.role as string;
  const customRoleId = (memberData as Record<string, unknown>).custom_role_id as string | null;

  // 2. Check custom role by FK (UUID) — no name matching needed
  if (customRoleId) {
    const { data: rpData } = await insforge.database
      .from("role_permissions")
      .select(`
        permission_id,
        permissions!inner (
          resource,
          action
        )
      `)
      .eq("role_id", customRoleId);

    if (rpData && Array.isArray(rpData)) {
      type RPRecord = { permissions: { resource: string; action: string } | null };
      return (rpData as unknown as RPRecord[]).some((rp) => {
        const perm = rp.permissions;
        if (!perm) return false;
        return perm.resource === resource && (perm.action === action || perm.action === "all");
      });
    }
  }

  // 3. Fallback to default roles
  const normalizedRole = roleName.toUpperCase();
  if (normalizedRole === "OWNER") {
    return true;
  }

  if (normalizedRole === "ADMIN") {
    if (resource === "organization" && action === "manage") {
      return false;
    }
    return true;
  }

  if (normalizedRole === "MEMBER" || normalizedRole === "CONTRIBUTOR") {
    if (resource === "projects") {
      return ["read", "create", "update"].includes(action);
    }
    if (resource === "tasks") {
      return ["read", "create", "update", "delete"].includes(action);
    }
    if (["comments", "attachments"].includes(resource)) {
      return ["read", "create", "delete"].includes(action);
    }
    if (["sprints", "workflows", "portfolios", "programs"].includes(resource)) {
      return action === "read";
    }
    return false;
  }

  if (normalizedRole === "VIEWER" || normalizedRole === "AUDITOR") {
    return action === "read";
  }

  return false;
});

/**
 * Resolves the department ID that a user manages in an organization.
 */
export const getManagedDepartmentId = cache(async (
  insforge: ReturnType<typeof createInsforgeServer>,
  orgId: string,
  userId: string
): Promise<string | null> => {
  const { data } = await insforge.database
    .from("departments")
    .select("id")
    .eq("organization_id", orgId)
    .eq("manager_id", userId)
    .limit(1)
    .maybeSingle();
  return data?.id || null;
});

/**
 * Checks recursively if a target department is a child of a parent department.
 */
export const isChildDepartment = cache(async (
  insforge: ReturnType<typeof createInsforgeServer>,
  orgId: string,
  targetDeptId: string,
  parentDeptId: string
): Promise<boolean> => {
  if (targetDeptId === parentDeptId) return true;

  const { data: depts } = await insforge.database
    .from("departments")
    .select("id, parent_department_id")
    .eq("organization_id", orgId);

  if (!depts) return false;

  const deptMap = new Map<string, string | null>(depts.map((d) => [d.id, d.parent_department_id]));

  let currentId: string | null = targetDeptId;
  while (currentId) {
    if (currentId === parentDeptId) return true;
    currentId = deptMap.get(currentId) || null;
  }

  return false;
});

/**
 * Checks if a user has access to a project based on department hierarchy.
 * If the user manages a department, they only have access if the project belongs
 * to their managed department or any of its children.
 * If they don't manage a department, this check passes.
 */
export const verifyDepartmentScopeForProject = cache(async (
  insforge: ReturnType<typeof createInsforgeServer>,
  orgId: string,
  userId: string,
  projectId: string
): Promise<boolean> => {
  const isAdmin = await verifyAdminOrOwnerRole(insforge, orgId, userId);
  if (isAdmin) return true;

  const managedDeptId = await getManagedDepartmentId(insforge, orgId, userId);
  if (!managedDeptId) return true;

  const { data: project } = await insforge.database
    .from("projects")
    .select("department_id")
    .eq("id", projectId)
    .maybeSingle();

  if (!project || !project.department_id) return false;

  return isChildDepartment(insforge, orgId, project.department_id, managedDeptId);
});

/**
 * Checks if a user has access to a member based on department hierarchy.
 * If the user manages a department, they only have access if the member belongs
 * to their managed department or any of its children.
 * If they don't manage a department, this check passes.
 */
export const verifyDepartmentScopeForMember = cache(async (
  insforge: ReturnType<typeof createInsforgeServer>,
  orgId: string,
  userId: string,
  targetUserId: string
): Promise<boolean> => {
  const isAdmin = await verifyAdminOrOwnerRole(insforge, orgId, userId);
  if (isAdmin) return true;

  const managedDeptId = await getManagedDepartmentId(insforge, orgId, userId);
  if (!managedDeptId) return true;

  const { data: membership } = await insforge.database
    .from("memberships")
    .select("department_id")
    .eq("organization_id", orgId)
    .eq("user_id", targetUserId)
    .maybeSingle();

  if (!membership || !membership.department_id) return false;

  return isChildDepartment(insforge, orgId, membership.department_id, managedDeptId);
});


