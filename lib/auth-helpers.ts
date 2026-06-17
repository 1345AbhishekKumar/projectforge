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

