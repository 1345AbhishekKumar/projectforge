"use server";

import { auth } from "@clerk/nextjs/server";
import { revalidatePath } from "next/cache";
import { createInsforgeServer } from "@/lib/insforge-server";
import { z } from "zod";
import { logActivity } from "@/actions/activity";
import { createNotification } from "@/actions/notification";
import { orgIdSchema } from "@/lib/utils";
import { verifyAdminOrOwnerRole, verifyMembership } from "@/lib/auth-helpers";

const inviteSchema = z.object({
  orgId: orgIdSchema,
  email: z.string().email("Invalid email format"),
  role: z.enum(["ADMIN", "MEMBER"]),
});

const invitationIdSchema = z.string().uuid("Invalid invitation ID");

export type PendingInvitation = {
  id: string;
  organizationId: string;
  orgName: string;
  email: string;
  role: string;
  invitedBy: string;
  invitedByName: string;
  createdAt: string;
};

export type OrgInvitationItem = {
  id: string;
  email: string;
  role: string;
  status: string;
  createdAt: string;
  invitedByName: string;
};

interface InvitationQueryRow {
  id: string;
  organization_id: string;
  email: string;
  role: string;
  invited_by: string;
  created_at: string;
  organizations: { name: string } | { name: string }[] | null;
  invited_by_profile: { full_name: string | null } | { full_name: string | null }[] | null;
}

interface OrgInvitationQueryRow {
  id: string;
  email: string;
  role: string;
  status: string;
  created_at: string;
  invited_by: string;
  invited_by_profile: { full_name: string | null } | { full_name: string | null }[] | null;
}

// 1. Invite a member (inserts into invitations)
export async function inviteMember(
  orgId: string,
  email: string,
  role: "ADMIN" | "MEMBER"
): Promise<{ success: boolean; error?: string }> {
  const validated = inviteSchema.safeParse({ orgId, email, role });
  if (!validated.success) {
    return { success: false, error: validated.error.issues[0].message };
  }

  try {
    const { userId } = await auth();
    if (!userId) return { success: false, error: "Unauthorized" };

    const insforge = createInsforgeServer(userId);

    // Requester must be admin or owner
    const isAdminOrOwner = await verifyAdminOrOwnerRole(insforge, validated.data.orgId, userId);
    if (!isAdminOrOwner) {
      return { success: false, error: "Only owners and admins can invite members." };
    }

    // Check if user is already a member
    // Find profile first
    const { data: inviteeProfile } = await insforge.database
      .from("profiles")
      .select("id, full_name")
      .eq("email", validated.data.email)
      .maybeSingle();

    if (inviteeProfile) {
      const { data: existingMember } = await insforge.database
        .from("memberships")
        .select("id")
        .eq("organization_id", validated.data.orgId)
        .eq("user_id", inviteeProfile.id)
        .maybeSingle();

      if (existingMember) {
        return { success: false, error: "User is already a member of this workspace." };
      }
    }

    // Insert into invitations table
    const { error: insertError } = await insforge.database
      .from("invitations")
      .insert([
        {
          organization_id: validated.data.orgId,
          email: validated.data.email,
          role: validated.data.role,
          invited_by: userId,
          status: "PENDING",
        },
      ]);

    if (insertError) {
      if (insertError.code === "23505") { // unique violation
        return { success: false, error: "An invitation is already pending for this email address." };
      }
      return { success: false, error: "Failed to create invitation." };
    }

    // If profile exists, notify them on ProjectForge
    if (inviteeProfile) {
      const { data: orgRow } = await insforge.database
        .from("organizations")
        .select("name")
        .eq("id", validated.data.orgId)
        .maybeSingle();

      const orgName = orgRow?.name || "a workspace";
      await createNotification(
        inviteeProfile.id,
        `🎉 You have been invited to join "${orgName}" as ${validated.data.role}.`,
        "MEMBER_INVITED"
      );
    }

    revalidatePath("/organizations/settings");
    return { success: true };
  } catch (error) {
    console.error("inviteMember error:", error);
    return { success: false, error: "An unexpected error occurred" };
  }
}

// 2. Get pending invitations for logged-in user
export async function getPendingInvitations(): Promise<{
  success: boolean;
  data: PendingInvitation[];
  error?: string;
}> {
  try {
    const { userId } = await auth();
    if (!userId) return { success: false, error: "Unauthorized", data: [] };

    const insforge = createInsforgeServer(userId);

    // Get current user's profile to get email
    const { data: profile, error: profileError } = await insforge.database
      .from("profiles")
      .select("email")
      .eq("id", userId)
      .single();

    if (profileError || !profile) {
      return { success: false, error: "User profile not found", data: [] };
    }

    // Get pending invitations for this email
    const { data, error } = await insforge.database
      .from("invitations")
      .select(`
        id,
        organization_id,
        email,
        role,
        invited_by,
        created_at,
        organizations ( name ),
        invited_by_profile:profiles!invitations_invited_by_fkey ( full_name )
      `)
      .eq("email", profile.email)
      .eq("status", "PENDING");

    if (error) {
      console.error("Failed to fetch pending invitations:", error);
      return { success: false, error: "Failed to fetch invitations", data: [] };
    }

    const invitations: PendingInvitation[] = ((data || []) as unknown as InvitationQueryRow[]).map((item) => {
      const org = Array.isArray(item.organizations) ? item.organizations[0] : item.organizations;
      const inviter = Array.isArray(item.invited_by_profile) ? item.invited_by_profile[0] : item.invited_by_profile;
      return {
        id: item.id,
        organizationId: item.organization_id,
        orgName: org?.name || "Unknown Organization",
        email: item.email,
        role: item.role,
        invitedBy: item.invited_by,
        invitedByName: inviter?.full_name || "Unknown User",
        createdAt: item.created_at,
      };
    });

    return { success: true, data: invitations };
  } catch (error) {
    console.error("getPendingInvitations error:", error);
    return { success: false, error: "An unexpected error occurred", data: [] };
  }
}

// 3. Accept invitation
export async function acceptInvitation(
  invitationId: string
): Promise<{ success: boolean; error?: string }> {
  const validated = invitationIdSchema.safeParse(invitationId);
  if (!validated.success) {
    return { success: false, error: validated.error.issues[0].message };
  }

  try {
    const { userId } = await auth();
    if (!userId) return { success: false, error: "Unauthorized" };

    const insforge = createInsforgeServer(userId);

    // Get profile email
    const { data: profile } = await insforge.database
      .from("profiles")
      .select("email, full_name")
      .eq("id", userId)
      .single();

    if (!profile) {
      return { success: false, error: "User profile not found" };
    }

    // Get invitation
    const { data: invitation, error: inviteError } = await insforge.database
      .from("invitations")
      .select("*")
      .eq("id", validated.data)
      .single();

    if (inviteError || !invitation) {
      return { success: false, error: "Invitation not found" };
    }

    if (invitation.status !== "PENDING") {
      return { success: false, error: `This invitation has already been ${invitation.status.toLowerCase()}.` };
    }

    if (invitation.email.toLowerCase() !== profile.email.toLowerCase()) {
      return { success: false, error: "This invitation belongs to another user email." };
    }

    // Insert membership
    const { error: memberError } = await insforge.database
      .from("memberships")
      .insert([
        {
          organization_id: invitation.organization_id,
          user_id: userId,
          role: invitation.role,
        },
      ]);

    if (memberError) {
      console.error("acceptInvitation memberError:", memberError);
      return { success: false, error: "Failed to join organization." };
    }

    // Update invitation status
    await insforge.database
      .from("invitations")
      .update({ status: "ACCEPTED", updated_at: new Date().toISOString() })
      .eq("id", invitation.id);

    // Log Activity
    await logActivity(invitation.organization_id, null, userId, "MEMBER_JOINED", {
      joinedUserId: userId,
      joinedUserName: profile.full_name || "Unknown Member",
      joinedUserEmail: profile.email,
    });

    revalidatePath("/dashboard");
    revalidatePath("/organizations/settings");
    return { success: true };
  } catch (error) {
    console.error("acceptInvitation error:", error);
    return { success: false, error: "An unexpected error occurred" };
  }
}

// 4. Decline invitation
export async function declineInvitation(
  invitationId: string
): Promise<{ success: boolean; error?: string }> {
  const validated = invitationIdSchema.safeParse(invitationId);
  if (!validated.success) {
    return { success: false, error: validated.error.issues[0].message };
  }

  try {
    const { userId } = await auth();
    if (!userId) return { success: false, error: "Unauthorized" };

    const insforge = createInsforgeServer(userId);

    // Get profile email
    const { data: profile } = await insforge.database
      .from("profiles")
      .select("email")
      .eq("id", userId)
      .single();

    if (!profile) {
      return { success: false, error: "User profile not found" };
    }

    // Get invitation
    const { data: invitation, error: inviteError } = await insforge.database
      .from("invitations")
      .select("*")
      .eq("id", validated.data)
      .single();

    if (inviteError || !invitation) {
      return { success: false, error: "Invitation not found" };
    }

    if (invitation.status !== "PENDING") {
      return { success: false, error: `This invitation has already been ${invitation.status.toLowerCase()}.` };
    }

    if (invitation.email.toLowerCase() !== profile.email.toLowerCase()) {
      return { success: false, error: "This invitation belongs to another user email." };
    }

    // Update invitation status
    const { error: updateError } = await insforge.database
      .from("invitations")
      .update({ status: "DECLINED", updated_at: new Date().toISOString() })
      .eq("id", invitation.id);

    if (updateError) {
      return { success: false, error: "Failed to decline invitation." };
    }

    revalidatePath("/dashboard");
    return { success: true };
  } catch (error) {
    console.error("declineInvitation error:", error);
    return { success: false, error: "An unexpected error occurred" };
  }
}

// 5. Get organization's invitations (for workspace admins view)
export async function getOrganizationInvitations(
  orgId: string
): Promise<{ success: boolean; data: OrgInvitationItem[]; error?: string }> {
  const validated = orgIdSchema.safeParse(orgId);
  if (!validated.success) {
    return { success: false, error: validated.error.issues[0].message, data: [] };
  }

  try {
    const { userId } = await auth();
    if (!userId) return { success: false, error: "Unauthorized", data: [] };

    const insforge = createInsforgeServer(userId);

    // Requester must be member
    const isMember = await verifyMembership(insforge, validated.data, userId);
    if (!isMember) {
      return { success: false, error: "Not a member of this organization", data: [] };
    }

    const { data, error } = await insforge.database
      .from("invitations")
      .select(`
        id,
        email,
        role,
        status,
        created_at,
        invited_by,
        invited_by_profile:profiles!invitations_invited_by_fkey ( full_name )
      `)
      .eq("organization_id", validated.data)
      .order("created_at", { ascending: false });

    if (error) {
      console.error("Failed to fetch organization invitations:", error);
      return { success: false, error: "Failed to fetch invitations", data: [] };
    }

    const formatted = ((data || []) as unknown as OrgInvitationQueryRow[]).map((item) => {
      const inviter = Array.isArray(item.invited_by_profile) ? item.invited_by_profile[0] : item.invited_by_profile;
      return {
        id: item.id,
        email: item.email,
        role: item.role,
        status: item.status,
        createdAt: item.created_at,
        invitedByName: inviter?.full_name || "Unknown User",
      };
    });

    return { success: true, data: formatted };
  } catch (error) {
    console.error("getOrganizationInvitations error:", error);
    return { success: false, error: "An unexpected error occurred", data: [] };
  }
}

// 6. Cancel pending invitation
export async function cancelInvitation(
  invitationId: string,
  orgId: string
): Promise<{ success: boolean; error?: string }> {
  const validatedId = invitationIdSchema.safeParse(invitationId);
  const validatedOrg = orgIdSchema.safeParse(orgId);
  if (!validatedId.success || !validatedOrg.success) {
    return { success: false, error: "Invalid parameters" };
  }

  try {
    const { userId } = await auth();
    if (!userId) return { success: false, error: "Unauthorized" };

    const insforge = createInsforgeServer(userId);

    // Requester must be admin/owner
    const isAdminOrOwner = await verifyAdminOrOwnerRole(insforge, validatedOrg.data, userId);
    if (!isAdminOrOwner) {
      return { success: false, error: "Only owners and admins can cancel invitations." };
    }

    // Delete the invitation if it is PENDING
    const { error } = await insforge.database
      .from("invitations")
      .delete()
      .eq("id", validatedId.data)
      .eq("organization_id", validatedOrg.data)
      .eq("status", "PENDING");

    if (error) {
      console.error("cancelInvitation error:", error);
      return { success: false, error: "Failed to cancel invitation." };
    }

    revalidatePath("/organizations/settings");
    return { success: true };
  } catch (error) {
    console.error("cancelInvitation error:", error);
    return { success: false, error: "An unexpected error occurred" };
  }
}
