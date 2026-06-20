"use client";

import React, { useState } from "react";
import { Plus, Edit2, Trash2, Shield, XCircle, Loader2 } from "lucide-react";
import { RoleFormModal } from "./RoleFormModal";
import { createCustomRole, updateCustomRole, deleteCustomRole } from "@/actions/role";
import type { MembershipRole } from "@/types";

type Permission = {
  id: string;
  name: string;
  resource: string;
  action: string;
};

type CustomRole = {
  id: string;
  name: string;
  created_at: string;
  role_permissions: {
    permission_id: string;
    permissions: Permission | null;
  }[];
};

type Props = {
  initialRoles: CustomRole[];
  allPermissions: Permission[];
  activeOrgId: string;
  activeOrgName: string;
  currentUserRole: MembershipRole;
};

export function RolesSettingsClient({
  initialRoles,
  allPermissions,
  activeOrgId,
  activeOrgName,
  currentUserRole,
}: Props) {
  const [roles, setRoles] = useState<CustomRole[]>(initialRoles);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalMode, setModalMode] = useState<"create" | "edit">("create");
  const [selectedRole, setSelectedRole] = useState<CustomRole | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [banner, setBanner] = useState<{ type: "success" | "error"; text: string } | null>(null);

  const showBanner = (type: "success" | "error", text: string) => {
    setBanner({ type, text });
    setTimeout(() => setBanner(null), 4000);
  };

  const isOwnerOrAdmin = currentUserRole === "OWNER" || currentUserRole === "ADMIN";

  const handleOpenCreate = () => {
    if (!isOwnerOrAdmin) return;
    setModalMode("create");
    setSelectedRole(null);
    setIsModalOpen(true);
  };

  const handleOpenEdit = (role: CustomRole) => {
    if (!isOwnerOrAdmin) return;
    setModalMode("edit");
    setSelectedRole(role);
    setIsModalOpen(true);
  };

  const handleDeleteRole = async (roleId: string, roleName: string) => {
    if (!isOwnerOrAdmin) return;
    if (!confirm(`Are you sure you want to delete the role "${roleName}"? Any users assigned to this role will fallback to default permissions.`)) {
      return;
    }

    setDeletingId(roleId);
    try {
      const res = await deleteCustomRole(activeOrgId, roleId);
      if (res.success) {
        showBanner("success", `Role "${roleName}" deleted successfully.`);
        setRoles((prev) => prev.filter((r) => r.id !== roleId));
      } else {
        showBanner("error", res.error || "Failed to delete role");
      }
    } catch {
      showBanner("error", "An unexpected error occurred");
    } finally {
      setDeletingId(null);
    }
  };

  const handleFormSubmit = async (name: string, permissionIds: string[]) => {
    if (modalMode === "create") {
      const res = await createCustomRole(activeOrgId, name, permissionIds);
      if (res.success && res.roleId) {
        showBanner("success", `Role "${name}" created successfully.`);
        // Construct the new role object locally to avoid refetching
        const newRole: CustomRole = {
          id: res.roleId,
          name,
          created_at: new Date().toISOString(),
          role_permissions: permissionIds.map((pId) => {
            const matchedPerm = allPermissions.find((p) => p.id === pId) || null;
            return {
              permission_id: pId,
              permissions: matchedPerm,
            };
          }),
        };
        setRoles((prev) => [...prev, newRole].sort((a, b) => a.name.localeCompare(b.name)));
        return true;
      } else {
        showBanner("error", res.error || "Failed to create role");
        return false;
      }
    } else {
      if (!selectedRole) return false;
      const res = await updateCustomRole(activeOrgId, selectedRole.id, name, permissionIds);
      if (res.success) {
        showBanner("success", `Role "${name}" updated successfully.`);
        setRoles((prev) =>
          prev
            .map((r) =>
              r.id === selectedRole.id
                ? {
                    ...r,
                    name,
                    role_permissions: permissionIds.map((pId) => {
                      const matchedPerm = allPermissions.find((p) => p.id === pId) || null;
                      return {
                        permission_id: pId,
                        permissions: matchedPerm,
                      };
                    }),
                  }
                : r
            )
            .sort((a, b) => a.name.localeCompare(b.name))
        );
        return true;
      } else {
        showBanner("error", res.error || "Failed to update role");
        return false;
      }
    }
  };

  return (
    <div className="flex flex-col gap-8">
      {/* Toast Notification Banner */}
      {banner && (
        <div
          role="alert"
          className={`fixed top-4 right-4 z-[300] max-w-md border-2 border-black rounded-sketchy p-4 shadow-flat-offset transition-all transform ${
            banner.type === "success" ? "bg-accent-green" : "bg-accent-pink"
          }`}
        >
          <div className="flex items-center gap-2 font-sans font-bold text-sm">
            {banner.type === "error" && <XCircle className="h-5 w-5" />}
            {banner.text}
          </div>
        </div>
      )}

      {/* Header Info Card */}
      <div className="bg-white border-2 border-black rounded-sketchy shadow-flat-offset p-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="font-cursive text-3xl font-bold mb-1">
            Custom Roles & Permissions: <span className="underline decoration-tertiary decoration-2">{activeOrgName}</span>
          </h1>
          <p className="font-sans text-xs text-secondary">
            Manage fine-grained custom roles and permissions for this organization workspace.
          </p>
        </div>
        {isOwnerOrAdmin && (
          <button
            onClick={handleOpenCreate}
            className="flex items-center gap-1.5 bg-accent-yellow hover:bg-[#FFE680] text-primary border-2 border-black font-sans text-xs font-bold px-4 py-2.5 rounded-full shadow-flat-offset-sm active:translate-y-0.5 hover:-translate-y-0.5 transition-all cursor-pointer whitespace-nowrap self-start sm:self-center"
          >
            <Plus className="h-4 w-4" />
            Create Custom Role
          </button>
        )}
      </div>

      {/* Roles List Card */}
      <div className="bg-white border-2 border-black rounded-sketchy shadow-flat-offset p-6 md:p-8 flex flex-col gap-6">
        <div className="flex items-center gap-2">
          <Shield className="h-5 w-5 text-tertiary" />
          <h2 className="font-cursive text-2xl font-bold">Workspace Custom Roles</h2>
        </div>

        {roles.length === 0 ? (
          <div className="border-2 border-dashed border-black/20 rounded-sketchy p-8 text-center text-secondary/60 text-sm font-sans flex flex-col items-center gap-2">
            <span>No custom roles configured in this workspace yet.</span>
            {isOwnerOrAdmin && (
              <button
                onClick={handleOpenCreate}
                className="mt-2 text-tertiary font-bold hover:underline cursor-pointer"
              >
                Create the first custom role
              </button>
            )}
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {roles.map((role) => {
              const permCount = role.role_permissions.length;
              const permText = role.role_permissions
                .map((rp) => rp.permissions)
                .filter((p): p is Permission => !!p)
                .map((p) => `${p.resource}:${p.action}`)
                .join(", ");

              return (
                <div
                  key={role.id}
                  className="border-2 border-black rounded-sketchy p-5 bg-white shadow-flat-offset-sm hover:-translate-y-0.5 transition-transform flex flex-col justify-between gap-4"
                >
                  <div className="flex flex-col gap-1.5">
                    <div className="flex items-center justify-between">
                      <span className="font-cursive text-xl font-bold text-primary">{role.name}</span>
                      <span className="bg-accent-blue/40 border border-black/25 text-[10px] font-bold px-2 py-0.5 rounded-full uppercase">
                        {permCount} {permCount === 1 ? "Permission" : "Permissions"}
                      </span>
                    </div>
                    <div className="font-sans text-xs text-secondary/80 line-clamp-2 min-h-[2rem]">
                      {permCount > 0 ? (
                        <span>Allowed Actions: {permText}</span>
                      ) : (
                        <span className="italic text-secondary/50">No permissions assigned (Implicit Read-Only)</span>
                      )}
                    </div>
                  </div>

                  {isOwnerOrAdmin && (
                    <div className="flex justify-end gap-2 border-t border-black/10 pt-3">
                      <button
                        onClick={() => handleOpenEdit(role)}
                        disabled={deletingId === role.id}
                        className="inline-flex items-center justify-center p-1.5 border border-black/30 rounded-full hover:bg-neutral-bg cursor-pointer transition-colors shadow-flat-offset-xs active:translate-y-0.5"
                        title="Edit permissions"
                      >
                        <Edit2 className="h-3.5 w-3.5 text-secondary" />
                      </button>
                      <button
                        onClick={() => handleDeleteRole(role.id, role.name)}
                        disabled={deletingId === role.id}
                        className="inline-flex items-center justify-center p-1.5 border border-black/30 rounded-full hover:bg-accent-pink cursor-pointer transition-colors shadow-flat-offset-xs active:translate-y-0.5 disabled:opacity-40"
                        title="Delete custom role"
                      >
                        {deletingId === role.id ? (
                          <Loader2 className="h-3.5 w-3.5 animate-spin text-secondary" />
                        ) : (
                          <Trash2 className="h-3.5 w-3.5 text-secondary hover:text-red-700" />
                        )}
                      </button>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Role Form Modal */}
      <RoleFormModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onSubmit={handleFormSubmit}
        allPermissions={allPermissions}
        initialRoleName={selectedRole?.name || ""}
        initialPermissionIds={selectedRole?.role_permissions.map((rp) => rp.permission_id) || []}
        mode={modalMode}
      />
    </div>
  );
}
