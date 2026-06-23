"use client";

import React, { useState } from "react";
import { Loader2 } from "lucide-react";
import { z } from "zod";
import { BaseModal } from "@/components/ui/BaseModal";

type Permission = {
  id: string;
  name: string;
  resource: string;
  action: string;
};

type Props = {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (name: string, permissionIds: string[]) => Promise<boolean>;
  allPermissions: Permission[];
  initialRoleName?: string;
  initialPermissionIds?: string[];
  mode: "create" | "edit";
};

const roleNameSchema = z.string().min(2, "Role name must be at least 2 characters").max(50, "Role name must be under 50 characters");

export function RoleFormModal({
  isOpen,
  onClose,
  onSubmit,
  allPermissions,
  initialRoleName = "",
  initialPermissionIds = [],
  mode,
}: Props) {
  const [name, setName] = useState(initialRoleName);
  const [selectedPermissionIds, setSelectedPermissionIds] = useState<string[]>(initialPermissionIds);
  const [validationError, setValidationError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  if (!isOpen) return null;

  // Group permissions by resource
  const groupedPermissions = allPermissions.reduce((acc, perm) => {
    if (!acc[perm.resource]) {
      acc[perm.resource] = [];
    }
    acc[perm.resource].push(perm);
    return acc;
  }, {} as Record<string, Permission[]>);

  const handleTogglePermission = (id: string) => {
    setSelectedPermissionIds((prev) =>
      prev.includes(id) ? prev.filter((pId) => pId !== id) : [...prev, id]
    );
  };

  const handleToggleResourceAll = (resource: string, perms: Permission[]) => {
    const permIds = perms.map((p) => p.id);
    const allSelected = permIds.every((id) => selectedPermissionIds.includes(id));

    if (allSelected) {
      // Uncheck all for this resource
      setSelectedPermissionIds((prev) => prev.filter((id) => !permIds.includes(id)));
    } else {
      // Check all for this resource
      setSelectedPermissionIds((prev) => {
        const unique = new Set([...prev, ...permIds]);
        return Array.from(unique);
      });
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setValidationError(null);

    const result = roleNameSchema.safeParse(name.trim());
    if (!result.success) {
      setValidationError(result.error.issues[0].message);
      return;
    }

    setIsSubmitting(true);
    try {
      const success = await onSubmit(result.data, selectedPermissionIds);
      if (success) {
        onClose();
      }
    } catch {
      setValidationError("Failed to save role");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <BaseModal
      key={`${mode}-${initialRoleName}`}
      isOpen={isOpen}
      onClose={onClose}
      maxWidth="max-w-2xl"
      rotation="rotate-[0.5deg]"
      className="max-h-[90vh] flex flex-col overflow-hidden"
    >
      <h2 className="font-cursive text-3xl font-bold mb-4">
        {mode === "create" ? "Create Custom Role" : "Edit Custom Role"}
      </h2>

        <form onSubmit={handleSubmit} className="flex-1 flex flex-col gap-6 overflow-hidden">
          {/* Role Name */}
          <div className="flex flex-col gap-1.5">
            <label className="font-sans text-xs font-bold text-secondary uppercase">Role Name</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Lead Developer, Auditor"
              className="w-full px-3 py-2 border-2 border-black rounded-sketchy-sm font-sans text-sm bg-white focus:outline-none focus:ring-2 focus:ring-tertiary transition-shadow"
              disabled={isSubmitting}
              required
            />
            {validationError && (
              <span className="font-sans text-xs text-red-600 font-semibold">{validationError}</span>
            )}
          </div>

          {/* Permissions Selector */}
          <div className="flex-1 flex flex-col gap-2 overflow-hidden">
            <label className="font-sans text-xs font-bold text-secondary uppercase">Permissions</label>
            <p className="font-sans text-xs text-secondary/70 -mt-1">
              Select which capabilities are allowed for this custom role.
            </p>

            <div className="flex-1 overflow-y-auto border-2 border-black rounded-sketchy-sm p-4 bg-neutral-bg/20 flex flex-col gap-6 pr-2">
              {Object.entries(groupedPermissions).map(([resource, perms]) => {
                const resourcePermIds = perms.map((p) => p.id);
                const allSelected = resourcePermIds.every((id) => selectedPermissionIds.includes(id));

                return (
                  <div key={resource} className="border-b border-black/10 pb-4 last:border-b-0 last:pb-0">
                    <div className="flex items-center justify-between mb-3">
                      <span className="font-cursive text-xl font-bold capitalize text-primary">
                        {resource} Management
                      </span>
                      <button
                        type="button"
                        onClick={() => handleToggleResourceAll(resource, perms)}
                        className="font-sans text-[10px] font-bold uppercase px-2.5 py-1 border border-black rounded bg-white hover:bg-neutral-bg cursor-pointer transition-colors shadow-flat-offset-xs"
                      >
                        {allSelected ? "Deselect All" : "Select All"}
                      </button>
                    </div>

                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                      {perms.map((perm) => {
                        const isChecked = selectedPermissionIds.includes(perm.id);
                        return (
                          <label
                            key={perm.id}
                            className={`flex items-center gap-2 p-2 border-2 border-black rounded bg-white cursor-pointer select-none transition-all shadow-flat-offset-xs active:translate-y-0.5 ${
                              isChecked ? "bg-accent-yellow/20" : "hover:bg-neutral-bg/40"
                            }`}
                          >
                            <input
                              type="checkbox"
                              checked={isChecked}
                              onChange={() => handleTogglePermission(perm.id)}
                              className="w-4 h-4 border-2 border-black rounded-sm accent-primary cursor-pointer"
                            />
                            <span className="font-sans text-xs font-semibold capitalize text-secondary">
                              {perm.action}
                            </span>
                          </label>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Action buttons */}
          <div className="flex justify-end gap-3 pt-2 border-t border-black/10">
            <button
              type="button"
              onClick={onClose}
              className="px-5 py-2 border-2 border-black rounded-full bg-white hover:bg-neutral-bg font-sans text-xs font-bold shadow-flat-offset-sm active:translate-y-0.5 transition-all cursor-pointer"
              disabled={isSubmitting}
            >
              Cancel
            </button>
            <button
              type="submit"
              className="flex items-center gap-1.5 px-6 py-2 bg-tertiary hover:bg-tertiary-hover text-white border-2 border-black rounded-full font-sans text-xs font-bold shadow-flat-offset-sm active:translate-y-0.5 transition-all cursor-pointer"
              disabled={isSubmitting}
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="h-3 w-3 animate-spin" />
                  Saving...
                </>
              ) : (
                "Save Role"
              )}
            </button>
          </div>
        </form>
    </BaseModal>
  );
}
