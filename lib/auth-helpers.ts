import { createInsforgeServer } from "./insforge-server";

/**
 * Checks if a user is a member of the specified organization.
 */
export async function verifyMembership(
  insforge: ReturnType<typeof createInsforgeServer>,
  orgId: string,
  userId: string
): Promise<boolean> {
  const { data } = await insforge.database
    .from("memberships")
    .select("id")
    .eq("organization_id", orgId)
    .eq("user_id", userId)
    .maybeSingle();
  return !!data;
}

/**
 * Checks if a user has OWNER or ADMIN privileges in the specified organization.
 */
export async function verifyAdminOrOwnerRole(
  insforge: ReturnType<typeof createInsforgeServer>,
  orgId: string,
  userId: string
): Promise<boolean> {
  const { data } = await insforge.database
    .from("memberships")
    .select("role")
    .eq("organization_id", orgId)
    .eq("user_id", userId)
    .maybeSingle();

  if (!data) return false;
  return data.role === "OWNER" || data.role === "ADMIN";
}

/**
 * Fetches all memberships with their nested profiles for a given organization.
 */
export async function getOrganizationMemberships(
  insforge: ReturnType<typeof createInsforgeServer>,
  orgId: string,
  limit?: number
) {
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
}

/**
 * Verifies if a user has specific resource and action permissions.
 * Supports both custom database roles and default roles fallback.
 */
export async function verifyPermission(
  insforge: ReturnType<typeof createInsforgeServer>,
  orgId: string,
  userId: string,
  resource: string,
  action: string
): Promise<boolean> {
  // 1. Get user role
  const { data: memberData } = await insforge.database
    .from("memberships")
    .select("role")
    .eq("organization_id", orgId)
    .eq("user_id", userId)
    .maybeSingle();

  if (!memberData) return false;
  const roleName = memberData.role;

  // 2. Check for custom database role
  const { data: roleData } = await insforge.database
    .from("roles")
    .select("id")
    .eq("organization_id", orgId)
    .eq("name", roleName)
    .maybeSingle();

  if (roleData) {
    const { data: rpData } = await insforge.database
      .from("role_permissions")
      .select(`
        permission_id,
        permissions!inner (
          resource,
          action
        )
      `)
      .eq("role_id", roleData.id);

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
}


