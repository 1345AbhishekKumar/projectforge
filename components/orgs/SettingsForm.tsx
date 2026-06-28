"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2, Trash2, ShieldAlert } from "lucide-react";
import { MemberList } from "@/components/orgs/MemberList";
import { InviteModal } from "@/components/orgs/InviteModal";
import { NotificationPreferences } from "@/components/notifications/NotificationPreferences";
import { useToastStore } from "@/store/toastStore";
import {
  updateMemberRole,
  removeMember,
  getOrganizationMembers,
  type MemberListItem
} from "@/actions/membership";
import {
  inviteMember,
  cancelInvitation,
  getOrganizationInvitations,
  type OrgInvitationItem
} from "@/actions/invitation";
import { deleteOrganization } from "@/actions/org";
import type { MembershipRole } from "@/types";

type Props = {
  initialMembers: MemberListItem[];
  initialInvitations: OrgInvitationItem[];
  initialCustomRoles: { id: string; name: string }[];
  activeOrgId: string;
  activeOrgName: string;
  currentUserId: string;
  currentUserRole: MembershipRole;
};

export function SettingsForm({
  initialMembers,
  initialInvitations,
  initialCustomRoles,
  activeOrgId,
  activeOrgName,
  currentUserId,
  currentUserRole
}: Props) {
  const router = useRouter();
  const [members, setMembers] = useState<MemberListItem[]>(initialMembers);
  const [invitations, setInvitations] = useState<OrgInvitationItem[]>(initialInvitations);
  const [cancelingId, setCancelingId] = useState<string | null>(null);
  const [dissolving, setDissolving] = useState(false);
  
  const { showToast: showBanner } = useToastStore();

  async function handleInvite(email: string, role: "ADMIN" | "MEMBER") {
    const res = await inviteMember(activeOrgId, email, role);
    if (res.success) {
      showBanner("success", "Invitation sent successfully!");
      // Reload invitations list
      const invitesRes = await getOrganizationInvitations(activeOrgId);
      if (invitesRes.success) setInvitations(invitesRes.data);
    } else {
      showBanner("error", res.error || "Failed to send invitation");
    }
    return res;
  }

  async function handleUpdateRole(membershipId: string, newRole: string) {
    const res = await updateMemberRole(membershipId, activeOrgId, newRole);
    if (res.success) {
      showBanner("success", "Role updated successfully!");
      // Optimistic update — no refetch needed, we know exactly what changed
      const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
      const isCustomRole = UUID_REGEX.test(newRole);
      setMembers((prev) =>
        prev.map((m) =>
          m.id === membershipId
            ? {
                ...m,
                // Custom role: keep base role as MEMBER, set customRoleId to UUID
                // Default role: clear customRoleId, update role to ADMIN/MEMBER
                role: isCustomRole ? "MEMBER" : (newRole as MembershipRole),
                customRoleId: isCustomRole ? newRole : null,
                customRoleName: null, // derived from customRoles prop in MemberList
              }
            : m
        )
      );
    } else {
      showBanner("error", res.error || "Failed to update role");
    }
  }
  async function handleRemoveMember(membershipId: string) {

    const res = await removeMember(membershipId, activeOrgId);
    if (res.success) {
      showBanner("success", "Member removed from workspace.");
      // Reload members
      const membersRes = await getOrganizationMembers(activeOrgId);
      if (membersRes.success) setMembers(membersRes.data);
    } else {
      showBanner("error", res.error || "Failed to remove member");
    }
  }

  async function handleCancelInvitation(invitationId: string) {
    if (!confirm("Are you sure you want to cancel this pending invitation?")) return;
    setCancelingId(invitationId);
    try {
      const res = await cancelInvitation(invitationId, activeOrgId);
      if (res.success) {
        showBanner("success", "Invitation canceled.");
        // Reload invitations list
        const invitesRes = await getOrganizationInvitations(activeOrgId);
        if (invitesRes.success) setInvitations(invitesRes.data);
      } else {
        showBanner("error", res.error || "Failed to cancel invitation");
      }
    } finally {
      setCancelingId(null);
    }
  }

  async function handleDissolveOrg() {
    const confirmText = `dissolve ${activeOrgName}`;
    const typed = prompt(
      `Warning: This action is permanent and will delete all projects, tasks, comments, and memberships in this workspace.\n\nType "${confirmText}" to confirm:`
    );
    if (typed !== confirmText) {
      showBanner("error", "Workspace dissolution canceled. Confirmation text did not match.");
      return;
    }

    setDissolving(true);
    try {
      const res = await deleteOrganization(activeOrgId);
      if (res.success) {
        showBanner("success", "Workspace dissolved successfully.");
        router.push("/dashboard");
      } else {
        showBanner("error", res.error || "Failed to dissolve workspace");
      }
    } catch {
      showBanner("error", "An unexpected error occurred");
    } finally {
      setDissolving(false);
    }
  }

  const isOwnerOrAdmin = currentUserRole === "OWNER" || currentUserRole === "ADMIN";

  return (
    <div className="flex flex-col gap-8">
      {/* Toast Notification Banner handled globally */}

      {/* Header info card */}
      <div className="bg-white border-2 border-black rounded-sketchy shadow-flat-offset p-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="font-cursive text-3xl font-bold mb-1">
            Workspace Settings: <span className="underline decoration-tertiary decoration-2">{activeOrgName}</span>
          </h1>
          <p className="font-sans text-xs text-secondary">
            Organization ID: <code className="bg-neutral-bg px-1 py-0.5 rounded border border-black/10">{activeOrgId}</code>
          </p>
        </div>
        <div className="flex items-center gap-2 self-start sm:self-center">
          <span className="font-sans text-xs text-secondary font-semibold">Your Role:</span>
          <span className="bg-accent-purple text-white border-2 border-black text-[10px] font-bold px-2 py-0.5 rounded-full uppercase">
            {currentUserRole}
          </span>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-start">
        {/* Members List (Left panel) */}
        <div className="lg:col-span-2 flex flex-col gap-8">
          <MemberList
            members={members}
            customRoles={initialCustomRoles}
            currentUserId={currentUserId}
            currentUserRole={currentUserRole}
            onUpdateRole={handleUpdateRole}
            onRemoveMember={handleRemoveMember}
          />

          {/* Pending Invitations list */}
          <div className="bg-white border-2 border-black rounded-sketchy shadow-flat-offset p-6 md:p-8">
            <h2 className="font-cursive text-2xl font-bold mb-4">Pending & Sent Invitations</h2>
            <p className="font-sans text-xs text-secondary mb-6">
              Invitations sent to collaborators who haven&apos;t accepted yet.
            </p>

            {invitations.length === 0 ? (
              <div className="border-2 border-dashed border-black/20 rounded-sketchy-sm p-6 text-center text-secondary/60 text-sm font-sans">
                No pending invitations.
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left font-sans text-sm border-collapse">
                  <thead>
                    <tr className="border-b-2 border-black">
                      <th className="py-3 px-4 font-bold text-xs uppercase text-secondary">Email</th>
                      <th className="py-3 px-4 font-bold text-xs uppercase text-secondary">Role</th>
                      <th className="py-3 px-4 font-bold text-xs uppercase text-secondary">Invited By</th>
                      <th className="py-3 px-4 font-bold text-xs uppercase text-secondary">Status</th>
                      {isOwnerOrAdmin && (
                        <th className="py-3 px-4 font-bold text-xs uppercase text-secondary text-right">Actions</th>
                      )}
                    </tr>
                  </thead>
                  <tbody>
                    {invitations.map((invite) => (
                      <tr key={invite.id} className="border-b border-black/10 hover:bg-neutral-bg/50">
                        <td className="py-4 px-4 font-semibold">{invite.email}</td>
                        <td className="py-4 px-4 uppercase text-xs font-bold">{invite.role}</td>
                        <td className="py-4 px-4 text-xs text-secondary">{invite.invitedByName}</td>
                        <td className="py-4 px-4">
                          <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full inline-block border-2 border-black ${
                            invite.status === "PENDING" ? "bg-accent-yellow" :
                            invite.status === "ACCEPTED" ? "bg-accent-green" : "bg-accent-pink"
                          }`}>
                            {invite.status}
                          </span>
                        </td>
                        {isOwnerOrAdmin && (
                          <td className="py-4 px-4 text-right">
                            {invite.status === "PENDING" && (
                              <button
                                onClick={() => handleCancelInvitation(invite.id)}
                                disabled={cancelingId === invite.id}
                                className="inline-flex items-center justify-center gap-1.5 bg-accent-pink hover:bg-[#FFB2B2] text-primary border-2 border-black font-sans text-xs font-bold px-3 py-1.5 rounded-full shadow-flat-offset-sm active:translate-y-0.5 hover:-translate-y-0.5 transition-all disabled:opacity-40 disabled:pointer-events-none cursor-pointer animate-none"
                              >
                                {cancelingId === invite.id ? (
                                  <Loader2 className="h-3 w-3 animate-spin" />
                                ) : (
                                  "Cancel"
                                )}
                              </button>
                            )}
                          </td>
                        )}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>

        {/* Invite panel (Right panel) - only shown to owners & admins */}
          {isOwnerOrAdmin && (
            <div className="lg:col-span-1">
              <InviteModal onInvite={handleInvite} />
            </div>
          )}
        </div>

      {/* Notification Preferences */}
      <NotificationPreferences />

      {/* Danger Zone: Dissolve Organization (restricted to Owner) */}
      {currentUserRole === "OWNER" && (
        <div className="bg-red-50 border-2 border-red-600 rounded-sketchy shadow-flat-offset p-6 md:p-8 flex flex-col md:flex-row items-start md:items-center justify-between gap-6 mt-4">
          <div className="flex gap-4 items-start">
            <div className="p-3 bg-red-100 rounded-full border-2 border-red-600 text-red-600">
              <ShieldAlert className="h-6 w-6" />
            </div>
            <div>
              <h3 className="font-cursive text-2xl font-bold text-red-700 mb-1">Danger Zone</h3>
              <p className="font-sans text-sm text-red-600 max-w-xl">
                Dissolving this workspace is permanent. It will immediately delete all projects, tasks, boards, sprint calendars, attachments, comments, and members. This action cannot be undone.
              </p>
            </div>
          </div>
          <button
            onClick={handleDissolveOrg}
            disabled={dissolving}
            className="flex items-center gap-2 bg-red-600 hover:bg-red-700 text-white border-2 border-black font-sans text-sm font-bold px-6 py-3 rounded-full shadow-flat-offset-sm active:translate-y-0.5 hover:-translate-y-0.5 transition-all disabled:opacity-40 disabled:pointer-events-none cursor-pointer whitespace-nowrap"
          >
            {dissolving ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Trash2 className="h-4.5 w-4.5" />
            )}
            Dissolve Workspace
          </button>
        </div>
      )}
    </div>
  );
}
