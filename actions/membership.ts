"use server";

import { auth } from "@clerk/nextjs/server";
import { revalidatePath } from "next/cache";
import { createInsforgeServer } from "@/lib/insforge-server";
import { z } from "zod";
import type { MembershipRole } from "@/types";
import { logActivity } from "@/actions/activity";
import { createNotification } from "@/actions/notification";
import { orgIdSchema, membershipIdSchema } from "@/lib/utils";

const inviteSchema = z.object({
  email: z.string().email("Invalid email format"),
  role: z.enum(["ADMIN", "MEMBER"]),
});

const getOrganizationMembersInputSchema = z.object({
  orgId: orgIdSchema,
});

const inviteMemberInputSchema = inviteSchema.extend({
  orgId: orgIdSchema,
});

const updateMemberRoleInputSchema = z.object({
  membershipId: membershipIdSchema,
  orgId: orgIdSchema,
  newRole: z.enum(["ADMIN", "MEMBER"]),
});

const removeMemberInputSchema = z.object({
  membershipId: membershipIdSchema,
  orgId: orgIdSchema,
});

export type MemberListItem = {
  id: string;
  userId: string;
  role: MembershipRole;
  createdAt: string;
  name: string;
  email: string;
  avatarUrl: string | null;
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

    const insforge = createInsforgeServer();

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

    // Fetch members with profiles joined
    const { data, error } = await insforge.database
      .from("memberships")
      .select(`
        id,
        role,
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
      return { success: false, error: "Failed to fetch members", data: [] };
    }

    const members: MemberListItem[] = (data || []).map((m) => {
      const profile = Array.isArray(m.profiles) ? m.profiles[0] : m.profiles;
      return {
        id: m.id,
        userId: m.user_id,
        role: m.role as MembershipRole,
        createdAt: m.created_at,
        name: profile?.full_name || "Unknown Member",
        email: profile?.email || "",
        avatarUrl: profile?.avatar_url || null,
      };
    });

    return { success: true, data: members };
  } catch {
    return { success: false, error: "An unexpected error occurred", data: [] };
  }
}

export async function inviteMember(
  orgId: string,
  email: string,
  role: "ADMIN" | "MEMBER"
): Promise<{ success: boolean; error?: string }> {
  const validated = inviteMemberInputSchema.safeParse({ orgId, email, role });
  if (!validated.success) {
    return { success: false, error: validated.error.issues[0].message };
  }

  try {
    const { userId } = await auth();
    if (!userId) return { success: false, error: "Unauthorized" };

    const insforge = createInsforgeServer();

    // Check requester role (must be OWNER or ADMIN)
    const { data: requester } = await insforge.database
      .from("memberships")
      .select("role")
      .eq("organization_id", validated.data.orgId)
      .eq("user_id", userId)
      .maybeSingle();

    if (!requester || (requester.role !== "OWNER" && requester.role !== "ADMIN")) {
      return { success: false, error: "Only owners and admins can invite members." };
    }

    // Check if invitee profile exists
    const { data: inviteeProfile } = await insforge.database
      .from("profiles")
      .select("id, full_name")
      .eq("email", validated.data.email)
      .maybeSingle();

    if (!inviteeProfile) {
      return {
        success: false,
        error: "This user is not registered on ProjectForge. They must sign up first.",
      };
    }

    // Check if target user is already a member
    const { data: existingMember } = await insforge.database
      .from("memberships")
      .select("id")
      .eq("organization_id", validated.data.orgId)
      .eq("user_id", inviteeProfile.id)
      .maybeSingle();

    if (existingMember) {
      return { success: false, error: "User is already a member of this workspace." };
    }

    // Insert new membership
    const { error: insertError } = await insforge.database
      .from("memberships")
      .insert([
        {
          organization_id: validated.data.orgId,
          user_id: inviteeProfile.id,
          role: validated.data.role,
        },
      ]);

    if (insertError) {
      return { success: false, error: "Failed to add member." };
    }

    await logActivity(validated.data.orgId, null, userId, "MEMBER_JOINED", {
      joinedUserId: inviteeProfile.id,
      joinedUserName: inviteeProfile.full_name || "Unknown Member",
      joinedUserEmail: validated.data.email,
    });

    // Notify the invited user
    const { data: orgRow } = await insforge.database
      .from("organizations")
      .select("name")
      .eq("id", validated.data.orgId)
      .maybeSingle();

    const orgName = orgRow?.name || "your workspace";
    await createNotification(
      inviteeProfile.id,
      `🎉 You've been added to "${orgName}" as ${validated.data.role}.`,
      "MEMBER_INVITED"
    );

    revalidatePath("/organizations/settings");
    revalidatePath("/dashboard");
    return { success: true };
  } catch {
    return { success: false, error: "An unexpected error occurred" };
  }
}

export async function updateMemberRole(
  membershipId: string,
  orgId: string,
  newRole: "ADMIN" | "MEMBER"
): Promise<{ success: boolean; error?: string }> {
  const validated = updateMemberRoleInputSchema.safeParse({ membershipId, orgId, newRole });
  if (!validated.success) {
    return { success: false, error: validated.error.issues[0].message };
  }

  try {
    const { userId } = await auth();
    if (!userId) return { success: false, error: "Unauthorized" };

    const insforge = createInsforgeServer();

    // Check requester role
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

    // Perform update
    const { error } = await insforge.database
      .from("memberships")
      .update({ role: validated.data.newRole })
      .eq("id", validated.data.membershipId)
      .eq("organization_id", validated.data.orgId);

    if (error) {
      return { success: false, error: "Failed to update role." };
    }

    revalidatePath("/organizations/settings");
    revalidatePath("/dashboard");
    return { success: true };
  } catch {
    return { success: false, error: "An unexpected error occurred" };
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

    const insforge = createInsforgeServer();

    // Check requester role
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
      return { success: false, error: "Failed to remove member." };
    }

    revalidatePath("/organizations/settings");
    revalidatePath("/dashboard");
    return { success: true };
  } catch {
    return { success: false, error: "An unexpected error occurred" };
  }
}
