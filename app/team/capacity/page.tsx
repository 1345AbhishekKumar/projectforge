"use client";

import React, { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { useUser } from "@clerk/nextjs";
import { Loader2, Users, Edit2, AlertCircle } from "lucide-react";
import Image from "next/image";

import { Sidebar } from "@/components/layout/Sidebar";
import { Navbar } from "@/components/layout/Navbar";
import { CapacityAllocationChart } from "@/components/reports/CapacityAllocationChart";
import { EditAllocationModal } from "@/components/team/EditAllocationModal";
import { getResourceAllocations } from "@/actions/resourceAllocation";
import type { Project } from "@/types";
import type { CapacityData } from "@/actions/resourceAllocation";

import { useOrgStore } from "@/store/orgStore";

export default function CapacityPlannerPage() {
  const router = useRouter();
  const { user, isLoaded } = useUser();

  const { activeOrgId } = useOrgStore();
  const [capacity, setCapacity] = useState<CapacityData[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [toastMessage, setToastMessage] = useState("");
  const [toastWarning, setToastWarning] = useState(false);

  // Modal State
  const [editingMember, setEditingMember] = useState<{
    userId: string;
    name: string;
    allocations: CapacityData["allocations"];
  } | null>(null);

  const loadPlannerData = useCallback(async () => {
    if (!activeOrgId) {
      setLoading(false);
      return;
    }

    setLoading(true);
    setError("");

    try {
      const result = await getResourceAllocations(activeOrgId);
      if (result.success && result.data) {
        setCapacity(result.data.capacity);
        setProjects(result.data.projects);
      } else {
        setError(result.error || "Failed to load capacity planner data.");
      }
    } catch {
      setError("An unexpected error occurred.");
    } finally {
      setLoading(false);
    }
  }, [activeOrgId]);

  useEffect(() => {
    const timer = setTimeout(() => {
      loadPlannerData();
    }, 0);
    return () => clearTimeout(timer);
  }, [loadPlannerData]);

  // Determine current user's role
  const currentUserCapacity = capacity.find((c) => c.userId === user?.id);
  const isAdminOrOwner = currentUserCapacity?.role === "OWNER" || currentUserCapacity?.role === "ADMIN";

  const triggerToast = (message: string, isWarning = false) => {
    setToastMessage(message);
    setToastWarning(isWarning);
    setTimeout(() => {
      setToastMessage("");
    }, 5000);
  };

  const handleModalSuccess = (warning?: string) => {
    setEditingMember(null);
    loadPlannerData();
    if (warning) {
      triggerToast(warning, true);
    } else {
      triggerToast("Resource allocations updated successfully!");
    }
  };

  if (!isLoaded) {
    return (
      <div className="min-h-screen w-full flex items-center justify-center bg-neutral-bg bg-dot-grid text-primary">
        <span className="font-cursive text-xl animate-pulse">Loading capacity planner...</span>
      </div>
    );
  }

  return (
    <div className="min-h-screen w-full bg-neutral-bg bg-dot-grid text-primary flex">
      {/* Sidebar - Desktop only */}
      <div className="hidden md:block">
        <Sidebar />
      </div>

      <div className="flex-grow flex flex-col min-h-screen overflow-x-hidden">
        {/* Navbar */}
        <Navbar />

        {/* Toast Warning/Success Banner */}
        {toastMessage && (
          <div
            className={`fixed top-4 right-4 z-[100] max-w-md border-2 border-black rounded-sketchy p-4 shadow-flat-offset transition-all transform animate-bounce ${
              toastWarning ? "bg-accent-pink text-primary" : "bg-accent-green text-primary"
            }`}
          >
            <div className="flex items-center gap-2">
              <AlertCircle className="h-5 w-5 shrink-0" />
              <span className="font-sans text-xs font-bold">{toastMessage}</span>
            </div>
          </div>
        )}

        {/* Main Body */}
        <div className="flex-1 max-w-6xl w-full mx-auto p-6 md:p-12 flex flex-col gap-8">
          {/* Header */}
          <div className="flex flex-col gap-4">
            <div className="flex flex-wrap items-center gap-4 justify-between">
              <div>
                <h1 className="font-cursive text-4xl font-bold mb-2 flex items-center gap-2">
                  <Users className="h-8 w-8 text-tertiary" />
                  Capacity Planner
                </h1>
                <p className="font-sans text-sm text-secondary">
                  Allocate resources across projects and monitor team capacity.
                </p>
              </div>
            </div>

            {/* Sub-Navigation tabs */}
            <div className="flex border-b-2 border-black mt-2">
              <button
                onClick={() => router.push("/team")}
                className="px-6 py-2.5 text-sm font-bold font-cursive hover:bg-neutral-bg border-b-2 border-transparent transition-all cursor-pointer"
              >
                Team Directory
              </button>
              <button
                className="px-6 py-2.5 text-sm font-bold font-cursive bg-accent-yellow border-2 border-black border-b-0 rounded-t-lg shadow-[0_-2px_0_rgba(0,0,0,1)] -mb-[2px] transition-all"
              >
                Capacity Planner
              </button>
            </div>
          </div>

          {/* Page Content */}
          {!activeOrgId ? (
            <div className="bg-white border-2 border-black rounded-sketchy shadow-flat-offset p-8 md:p-12 text-center max-w-lg mx-auto">
              <div className="w-16 h-16 rounded-full bg-accent-yellow border-2 border-black flex items-center justify-center mx-auto mb-4 rotate-[1.5deg] shadow-flat-offset-sm">
                <Users className="h-8 w-8 text-primary" />
              </div>
              <h3 className="font-cursive text-2xl font-bold mb-2">No Workspace Selected</h3>
              <p className="font-sans text-sm text-secondary mb-6 leading-relaxed">
                Please select or create an organization workspace to access the capacity planner.
              </p>
            </div>
          ) : loading ? (
            <div className="bg-white border-2 border-black rounded-sketchy shadow-flat-offset p-12 flex items-center justify-center">
              <Loader2 className="h-8 w-8 animate-spin text-tertiary mr-3" />
              <span className="font-cursive text-xl">Loading capacity data...</span>
            </div>
          ) : error ? (
            <div className="bg-accent-pink border-2 border-black rounded-sketchy shadow-flat-offset p-8 text-center max-w-lg mx-auto">
              <h2 className="font-cursive text-2xl font-bold mb-2">Something went wrong</h2>
              <p className="font-sans text-sm text-secondary">{error}</p>
            </div>
          ) : (
            <div className="flex flex-col gap-8">
              {/* Capacity Overview Visuals */}
              <CapacityAllocationChart capacityData={capacity} showCost={isAdminOrOwner} />

              {/* Members Allocations Detail Grid */}
              <div className="bg-white border-2 border-black rounded-sketchy p-6 shadow-flat-offset rotate-[0.5deg]">
                <h3 className="font-cursive text-2xl font-bold mb-4">Member Allocations</h3>
                
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="border-b-2 border-black font-cursive text-sm font-bold text-secondary/80">
                        <th className="pb-3 pr-4">Team Member</th>
                        <th className="pb-3 px-4">Role</th>
                        <th className="pb-3 px-4">Allocated Projects</th>
                        <th className="pb-3 px-4">Total Allocation</th>
                        {isAdminOrOwner && <th className="pb-3 pl-4 text-right">Actions</th>}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-black/10 font-sans text-xs">
                      {capacity.map((member) => {
                        const isOver = member.totalAllocatedPercentage > 100;
                        return (
                          <tr key={member.userId} className="hover:bg-neutral-bg/20">
                            {/* Member info */}
                            <td className="py-4 pr-4">
                              <div className="flex items-center gap-3">
                                {member.avatarUrl ? (
                                  <Image
                                    src={member.avatarUrl}
                                    alt={member.name}
                                    width={32}
                                    height={32}
                                    className="w-8 h-8 rounded-full border border-black object-cover"
                                  />
                                ) : (
                                  <div className="w-8 h-8 rounded-full border border-black bg-neutral-bg flex items-center justify-center font-cursive font-bold text-secondary text-xs">
                                    {member.name.slice(0, 2).toUpperCase()}
                                  </div>
                                )}
                                <div className="min-w-0">
                                  <span className="font-cursive text-base font-bold block truncate text-primary">
                                    {member.name}
                                  </span>
                                  <span className="text-[10px] text-secondary/60 block truncate">
                                    {member.email}
                                  </span>
                                </div>
                              </div>
                            </td>
                            
                            {/* Role */}
                            <td className="py-4 px-4 font-semibold text-secondary capitalize">
                              {member.role.toLowerCase()}
                            </td>

                            {/* Allocated Projects */}
                            <td className="py-4 px-4">
                              {member.allocations.length === 0 ? (
                                <span className="text-secondary/40 italic">No project allocations</span>
                              ) : (
                                <div className="flex flex-wrap gap-1.5 max-w-xs">
                                  {member.allocations.map((alloc) => (
                                    <span
                                      key={alloc.projectId}
                                      className="inline-flex items-center bg-accent-blue/30 border border-black/20 rounded px-1.5 py-0.5 text-[10px] font-semibold text-secondary"
                                    >
                                      {alloc.projectName} ({alloc.percentage}%)
                                    </span>
                                  ))}
                                </div>
                              )}
                            </td>

                            {/* Total Allocation */}
                            <td className="py-4 px-4">
                              <div className="flex items-center gap-3">
                                <div className="w-24 h-3.5 border border-black rounded bg-neutral-bg overflow-hidden relative shadow-sm shrink-0">
                                  <div
                                    className={`h-full border-r border-black/30 last:border-r-0 ${
                                      isOver ? "bg-accent-pink" : "bg-accent-green"
                                    }`}
                                    style={{ width: `${Math.min(100, member.totalAllocatedPercentage)}%` }}
                                  />
                                </div>
                                <span
                                  className={`font-bold text-[11px] ${
                                    isOver ? "text-accent-pink font-black" : "text-primary"
                                  }`}
                                >
                                  {member.totalAllocatedPercentage}%
                                </span>
                              </div>
                            </td>

                            {/* Action edits */}
                            {isAdminOrOwner && (
                              <td className="py-4 pl-4 text-right">
                                <button
                                  onClick={() =>
                                    setEditingMember({
                                      userId: member.userId,
                                      name: member.name,
                                      allocations: member.allocations,
                                    })
                                  }
                                  className="inline-flex items-center gap-1 bg-white hover:bg-neutral-bg border border-black px-2.5 py-1.5 rounded shadow-flat-offset-xs text-[10px] font-bold active:translate-y-0.5 transition-all cursor-pointer"
                                >
                                  <Edit2 className="h-3 w-3" />
                                  Edit Allocations
                                </button>
                              </td>
                            )}
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Edit Allocation Modal Modal */}
              {editingMember && (
                <EditAllocationModal
                  isOpen={!!editingMember}
                  onClose={() => setEditingMember(null)}
                  orgId={activeOrgId}
                  userId={editingMember.userId}
                  userName={editingMember.name}
                  userAllocations={editingMember.allocations}
                  allProjects={projects}
                  onSuccess={handleModalSuccess}
                />
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
