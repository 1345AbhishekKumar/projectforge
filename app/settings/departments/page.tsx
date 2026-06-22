"use client";

import React, { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useUser } from "@clerk/nextjs";
import { Network, Plus } from "lucide-react";

import { useOrgStore } from "@/store/orgStore";
import { Sidebar } from "@/components/layout/Sidebar";
import { OrgSwitcher } from "@/components/orgs/OrgSwitcher";
import { Navbar } from "@/components/layout/Navbar";
import { DepartmentTree } from "@/components/departments/DepartmentTree";
import { DepartmentForm } from "@/components/departments/DepartmentForm";
import { MemberAssignment } from "@/components/departments/MemberAssignment";

import {
  getDepartments,
  createDepartment,
  updateDepartment,
  deleteDepartment,
  assignMemberToDepartment,
} from "@/actions/department";
import { getOrganizationMembers } from "@/actions/membership";
import { getCustomRoles } from "@/actions/role";

type Department = {
  id: string;
  name: string;
  parent_department_id: string | null;
  manager_id: string | null;
};

export default function DepartmentsSettingsPage() {
  const { user, isLoaded } = useUser();
  const queryClient = useQueryClient();
  const { activeOrgId } = useOrgStore();

  const [editingDept, setEditingDept] = useState<Department | null>(null);

  // Queries
  const { data: departments = [], isLoading: isDeptsLoading } = useQuery({
    queryKey: ["departments", activeOrgId],
    queryFn: async () => {
      if (!activeOrgId) return [];
      const res = await getDepartments(activeOrgId);
      if (!res.success) throw new Error(res.error || "Failed to load departments");
      return (res.data as Department[]) || [];
    },
    enabled: !!activeOrgId,
  });

  const { data: members = [], isLoading: isMembersLoading } = useQuery({
    queryKey: ["members", activeOrgId],
    queryFn: async () => {
      if (!activeOrgId) return [];
      const res = await getOrganizationMembers(activeOrgId);
      if (!res.success) throw new Error(res.error || "Failed to load members");
      return res.data || [];
    },
    enabled: !!activeOrgId,
  });

  const { data: customRoles = [], isLoading: isRolesLoading } = useQuery({
    queryKey: ["customRoles", activeOrgId],
    queryFn: async () => {
      if (!activeOrgId) return [];
      const res = await getCustomRoles(activeOrgId);
      if (!res.success) throw new Error(res.error || "Failed to load custom roles");
      return (res.data as { id: string; name: string }[]) || [];
    },
    enabled: !!activeOrgId,
  });

  const handleCreate = async (name: string, parentId: string | null, managerId: string | null) => {
    if (!activeOrgId) return { success: false, error: "No active organization selected" };
    return createDepartment(activeOrgId, name, parentId, managerId);
  };

  const handleUpdate = async (id: string, name: string, parentId: string | null, managerId: string | null) => {
    if (!activeOrgId) return { success: false, error: "No active organization selected" };
    return updateDepartment(activeOrgId, id, name, parentId, managerId);
  };

  const handleDelete = async (id: string) => {
    if (!activeOrgId) return;
    if (
      !confirm(
        "Are you sure you want to delete this department? Child departments will be unparented, and assigned members and projects will be reset to unassigned."
      )
    )
      return;

    try {
      const res = await deleteDepartment(activeOrgId, id);
      if (res.success) {
        if (editingDept?.id === id) {
          setEditingDept(null);
        }
        queryClient.invalidateQueries({ queryKey: ["departments", activeOrgId] });
        queryClient.invalidateQueries({ queryKey: ["members", activeOrgId] });
      } else {
        alert(res.error || "Failed to delete department");
      }
    } catch (err) {
      alert(err instanceof Error ? err.message : "An error occurred");
    }
  };

  const handleAssign = async (membershipId: string, departmentId: string | null) => {
    if (!activeOrgId) return { success: false, error: "No active organization selected" };
    const res = await assignMemberToDepartment(activeOrgId, membershipId, departmentId);
    if (res.success) {
      queryClient.invalidateQueries({ queryKey: ["members", activeOrgId] });
      queryClient.invalidateQueries({ queryKey: ["departments", activeOrgId] });
    }
    return res;
  };

  const handleSuccess = () => {
    setEditingDept(null);
    queryClient.invalidateQueries({ queryKey: ["departments", activeOrgId] });
    queryClient.invalidateQueries({ queryKey: ["members", activeOrgId] });
  };

  if (!isLoaded || isDeptsLoading || isMembersLoading || isRolesLoading) {
    return (
      <div className="min-h-screen w-full flex items-center justify-center bg-neutral-bg bg-dot-grid text-primary">
        <span className="font-cursive text-xl animate-pulse">Loading departments whiteboard...</span>
      </div>
    );
  }

  const currentUserMember = members.find((m) => m.userId === user?.id);
  const isAdminOrOwner = currentUserMember?.role === "OWNER" || currentUserMember?.role === "ADMIN";

  if (!isAdminOrOwner) {
    return (
      <div className="min-h-screen w-full bg-neutral-bg bg-dot-grid text-primary flex">
      <div className="hidden md:block">
        <Sidebar />
      </div>
      <div className="flex-grow flex items-center justify-center p-6">
        <div className="bg-accent-pink border-2 border-black rounded-sketchy p-8 text-center max-w-lg shadow-flat-offset">
          <h2 className="font-cursive text-2xl font-bold mb-2">Access Restrained</h2>
          <p className="font-sans text-sm text-secondary">
            Only workspace administrators or owners can access organizational settings.
          </p>
        </div>
      </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen w-full bg-neutral-bg bg-dot-grid text-primary flex">
      <div className="hidden md:block">
        <Sidebar />
      </div>

      <div className="flex-grow flex flex-col min-h-screen overflow-x-hidden">
        {/* Navbar */}
        <Navbar />

        {/* Mobile Org Switcher */}
        <div className="md:hidden px-6 pt-4">
          <OrgSwitcher />
        </div>

        {/* Content */}
        <div className="flex-1 max-w-6xl w-full mx-auto p-6 md:p-12 flex flex-col gap-8">
          <div className="bg-white border-2 border-black rounded-sketchy shadow-flat-offset p-6">
            <div className="flex items-center gap-3 mb-2">
              <Network className="h-8 w-8 text-accent-blue shrink-0" />
              <h1 className="font-cursive text-3xl font-bold tracking-tight">Organization Hierarchies</h1>
            </div>
            <p className="font-sans text-sm text-secondary">
              Define recursive departments, designate department managers, and assign members to establish scoped permission boundaries.
            </p>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
            {/* Tree View (Left/Main Column) */}
            <div className="lg:col-span-8 flex flex-col gap-6">
              <div className="bg-white border-2 border-black rounded-sketchy shadow-flat-offset p-6">
                <h2 className="font-cursive text-2xl font-bold mb-4">Department Structure</h2>
                <DepartmentTree
                  departments={departments}
                  members={members}
                  onEdit={setEditingDept}
                  onDelete={handleDelete}
                />
              </div>

              <div className="bg-white border-2 border-black rounded-sketchy shadow-flat-offset p-6">
                <h2 className="font-cursive text-2xl font-bold mb-4">Member Department Assignments</h2>
                <MemberAssignment
                  departments={departments}
                  members={members}
                  customRoles={customRoles}
                  onAssign={handleAssign}
                />
              </div>
            </div>

            {/* Creation/Edit Form (Right Column) */}
            <div className="lg:col-span-4 bg-white border-2 border-black rounded-sketchy shadow-flat-offset p-6">
              <h2 className="font-cursive text-2xl font-bold mb-4 flex items-center gap-2">
                <Plus className="h-5 w-5" />
                {editingDept ? "Edit Department" : "New Department"}
              </h2>
              <DepartmentForm
                key={editingDept ? editingDept.id : "new-department"}
                orgId={activeOrgId || ""}
                members={members}
                departments={departments}
                editingDept={editingDept}
                onSuccess={handleSuccess}
                onCancelEdit={() => setEditingDept(null)}
                onCreate={handleCreate}
                onUpdate={handleUpdate}
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
