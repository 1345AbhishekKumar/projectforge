"use client";

import { useState } from "react";
import Image from "next/image";
import { Loader2, Trash2, ChevronDown } from "lucide-react";
import type { MemberListItem } from "@/actions/membership";
import type { MembershipRole } from "@/types";

type CustomRole = {
  id: string;
  name: string;
};

type Props = {
  members: MemberListItem[];
  customRoles: CustomRole[];
  currentUserId: string;
  currentUserRole: MembershipRole;
  onUpdateRole: (membershipId: string, newRole: string) => Promise<void>;
  onRemoveMember: (membershipId: string) => Promise<void>;
};

const DEFAULT_ROLE_BADGE: Record<string, string> = {
  OWNER: "bg-accent-purple text-white border-2 border-black",
  ADMIN: "bg-accent-blue text-primary border-2 border-black",
  MEMBER: "bg-accent-green text-primary border-2 border-black",
};

function RoleBadge({ role, customRoleName }: { role: string; customRoleName: string | null }) {
  if (customRoleName) {
    return (
      <span className="text-[10px] font-bold px-2 py-0.5 rounded-full inline-block bg-accent-yellow text-primary border-2 border-black">
        {customRoleName}
      </span>
    );
  }
  const style =
    DEFAULT_ROLE_BADGE[role.toUpperCase()] ??
    "bg-neutral-bg text-primary border-2 border-black";
  return (
    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full inline-block ${style}`}>
      {role}
    </span>
  );
}

export function MemberList({
  members,
  customRoles,
  currentUserId,
  currentUserRole,
  onUpdateRole,
  onRemoveMember,
}: Props) {
  const [updatingId, setUpdatingId] = useState<string | null>(null);
  const [removingId, setRemovingId] = useState<string | null>(null);

  const isOwnerOrAdmin = currentUserRole === "OWNER" || currentUserRole === "ADMIN";

  async function handleRoleChange(membershipId: string, newRole: string) {
    setUpdatingId(membershipId);
    try {
      await onUpdateRole(membershipId, newRole);
    } finally {
      setUpdatingId(null);
    }
  }

  async function handleRemove(membershipId: string) {
    if (!confirm("Are you sure you want to remove this member?")) return;
    setRemovingId(membershipId);
    try {
      await onRemoveMember(membershipId);
    } finally {
      setRemovingId(null);
    }
  }

  return (
    <div className="bg-white border-2 border-black rounded-sketchy shadow-flat-offset p-6 md:p-8">
      <h2 className="font-cursive text-2xl font-bold mb-1">Workspace Members</h2>
      <p className="font-sans text-xs text-secondary mb-6">
        View and manage role permissions for collaborators in this workspace.
        {customRoles.length > 0 && (
          <span className="ml-1 text-tertiary font-semibold">
            {customRoles.length} custom{" "}
            {customRoles.length === 1 ? "role" : "roles"} available.
          </span>
        )}
      </p>

      <div className="overflow-x-auto">
        <table className="w-full text-left font-sans text-sm border-collapse">
          <thead>
            <tr className="border-b-2 border-black">
              <th className="py-3 px-4 font-bold text-xs uppercase text-secondary">Member</th>
              <th className="py-3 px-4 font-bold text-xs uppercase text-secondary">Role</th>
              {isOwnerOrAdmin && (
                <th className="py-3 px-4 font-bold text-xs uppercase text-secondary text-right">
                  Actions
                </th>
              )}
            </tr>
          </thead>
          <tbody>
            {members.map((member) => {
              const isSelf = member.userId === currentUserId;
              const isTargetOwner = member.role === "OWNER";
              const isTargetAdmin = member.role === "ADMIN" && !member.customRoleId;

              // Resolve custom role name from the prop list (avoids DB join dependency)
              const resolvedCustomRole = member.customRoleId
                ? (customRoles.find((cr) => cr.id === member.customRoleId) ?? null)
                : null;

              // Authorization rules:

              // - Cannot modify OWNER
              // - ADMIN cannot modify other ADMINs or OWNER
              // - Cannot modify self
              const canModify =
                isOwnerOrAdmin &&
                !isTargetOwner &&
                !isSelf &&
                !(currentUserRole === "ADMIN" && isTargetAdmin);

              // The dropdown value: UUID if custom role active, else "ADMIN"/"MEMBER"
              const dropdownValue = member.customRoleId ?? member.role;

              return (
                <tr key={member.id} className="border-b border-black/10 hover:bg-neutral-bg/50">
                  {/* Member info */}
                  <td className="py-4 px-4">
                    <div className="flex items-center gap-3">
                      {member.avatarUrl ? (
                        <Image
                          src={member.avatarUrl}
                          alt={member.name}
                          width={32}
                          height={32}
                          className="w-8 h-8 rounded-full border-2 border-black object-cover"
                        />
                      ) : (
                        <div className="w-8 h-8 rounded-full bg-accent-yellow border-2 border-black flex items-center justify-center font-cursive font-bold text-xs">
                          {member.name.charAt(0)}
                        </div>
                      )}
                      <div>
                        <span className="font-semibold block text-sm">
                          {member.name}{" "}
                          {isSelf && (
                            <span className="text-secondary/70 font-normal text-xs">(you)</span>
                          )}
                        </span>
                        <span className="text-xs text-secondary block">{member.email}</span>
                      </div>
                    </div>
                  </td>

                  {/* Role selector or badge */}
                  <td className="py-4 px-4">
                    {canModify ? (
                      <div className="flex items-center gap-2">
                        <div className="relative">
                          <select
                            value={dropdownValue}
                            disabled={updatingId === member.id}
                            onChange={(e) => handleRoleChange(member.id, e.target.value)}
                            className="appearance-none bg-white border-2 border-black rounded-full pl-3 pr-7 py-1 font-sans text-xs font-bold shadow-flat-offset-sm focus:outline-none focus:ring-2 focus:ring-tertiary transition-all cursor-pointer disabled:opacity-50"
                          >
                            <optgroup label="Default Roles">
                              <option value="MEMBER">MEMBER</option>
                              <option value="ADMIN">ADMIN</option>
                            </optgroup>

                            {customRoles.length > 0 && (
                              <optgroup label="Custom Roles">
                                {customRoles.map((cr) => (
                                  <option key={cr.id} value={cr.id}>
                                    {cr.name}
                                  </option>
                                ))}
                              </optgroup>
                            )}
                          </select>
                          <ChevronDown className="pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 h-3 w-3 text-secondary" />
                        </div>
                        {updatingId === member.id && (
                          <Loader2 className="h-3 w-3 animate-spin text-secondary" />
                        )}
                      </div>
                    ) : (
                      <RoleBadge role={member.role} customRoleName={resolvedCustomRole?.name ?? null} />
                    )}
                  </td>

                  {/* Remove action */}
                  {isOwnerOrAdmin && (
                    <td className="py-4 px-4 text-right">
                      {canModify && (
                        <button
                          onClick={() => handleRemove(member.id)}
                          disabled={removingId === member.id}
                          className="inline-flex items-center justify-center gap-1.5 bg-accent-pink hover:bg-[#FFB2B2] text-primary border-2 border-black font-sans text-xs font-bold px-3 py-1.5 rounded-full shadow-flat-offset-sm active:translate-y-0.5 hover:-translate-y-0.5 transition-all disabled:opacity-40 disabled:pointer-events-none cursor-pointer"
                          title="Remove Member"
                        >
                          {removingId === member.id ? (
                            <Loader2 className="h-3 w-3 animate-spin" />
                          ) : (
                            <Trash2 className="h-3.5 w-3.5" />
                          )}
                          Remove
                        </button>
                      )}
                    </td>
                  )}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
