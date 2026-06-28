"use client";

import React, { useState, useEffect } from "react";
import { Loader2, Users, Edit2 } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { useUser } from "@clerk/nextjs";
import Image from "next/image";

import { WorkspacePageLayout } from "@/components/layout/WorkspacePageLayout";
import { NoWorkspacePlaceholder } from "@/components/layout/NoWorkspacePlaceholder";
import { HeaderBar } from "@/components/layout/HeaderBar";
import { TeamDirectory } from "@/components/team/TeamDirectory";
import { CapacityAllocationChart } from "@/components/reports/CapacityAllocationChart";
import { EditAllocationModal } from "@/components/team/EditAllocationModal";

import { getTeamDirectory } from "@/actions/team";
import { getResourceAllocations } from "@/actions/resourceAllocation";
import type { TeamMember } from "@/types";
import type { CapacityData } from "@/actions/resourceAllocation";

import { useOrgStore } from "@/store/orgStore";
import { useToastStore } from "@/store/toastStore";

export default function TeamPage() {
  const { user } = useUser();
  const { activeOrgId } = useOrgStore();
  const { showToast } = useToastStore();

  const [activeTab, setActiveTab] = useState<"directory" | "capacity">("directory");
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  // Modal State for Capacity edit
  const [editingMember, setEditingMember] = useState<{
    userId: string;
    name: string;
    allocations: CapacityData["allocations"];
  } | null>(null);

  // Sync tab option from URL search query if exists
  useEffect(() => {
    if (typeof window !== "undefined") {
      const params = new URLSearchParams(window.location.search);
      if (params.get("tab") === "capacity") {
        const timer = setTimeout(() => {
          setActiveTab("capacity");
        }, 0);
        return () => clearTimeout(timer);
      }
    }
  }, []);

  // Query: Team Directory members list
  const { data: members = [], isLoading: loading, error: queryError } = useQuery<TeamMember[]>({
    queryKey: ["teamDirectory", activeOrgId],
    queryFn: async () => {
      if (!activeOrgId) return [];
      const result = await getTeamDirectory(activeOrgId);
      if (!result.success) {
        throw new Error(result.error || "Failed to load team directory.");
      }
      return result.data || [];
    },
    enabled: !!activeOrgId && activeTab === "directory",
  });

  // Query: Capacity Planner allocations
  const { data: capacityData, isLoading: loadingCapacity, refetch: refetchCapacity } = useQuery({
    queryKey: ["capacityPlanner", activeOrgId],
    queryFn: async () => {
      if (!activeOrgId) return null;
      const res = await getResourceAllocations(activeOrgId);
      if (!res.success) {
        throw new Error(res.error || "Failed to load capacity planner data.");
      }
      return res.data;
    },
    enabled: !!activeOrgId && activeTab === "capacity",
  });

  const error = queryError instanceof Error ? queryError.message : "";

  const handleModalSuccess = (warning?: string) => {
    setEditingMember(null);
    refetchCapacity();
    if (warning) {
      showToast("error", warning);
    } else {
      showToast("success", "Resource allocations updated successfully!");
    }
  };

  return (
    <WorkspacePageLayout>
      <div className="flex-1 max-w-6xl w-full mx-auto p-6 md:p-12 flex flex-col gap-8">
        <HeaderBar
          title="Team Directory"
          description="All members of this workspace and their current workloads."
          icon={<Users className="h-8 w-8 text-tertiary" />}
        />

        {/* Sub-Navigation tabs */}
        <div className="flex border-b-2 border-black -mt-4">
          <button
            onClick={() => setActiveTab("directory")}
            className={`px-6 py-2.5 text-sm font-bold font-cursive transition-all cursor-pointer ${
              activeTab === "directory"
                ? "bg-accent-yellow border-2 border-black border-b-0 rounded-t-lg shadow-[0_-2px_0_rgba(0,0,0,1)] -mb-[2px]"
                : "hover:bg-neutral-bg border-b-2 border-transparent"
            }`}
          >
            Team Directory
          </button>
          <button
            onClick={() => setActiveTab("capacity")}
            className={`px-6 py-2.5 text-sm font-bold font-cursive transition-all cursor-pointer ${
              activeTab === "capacity"
                ? "bg-accent-yellow border-2 border-black border-b-0 rounded-t-lg shadow-[0_-2px_0_rgba(0,0,0,1)] -mb-[2px]"
                : "hover:bg-neutral-bg border-b-2 border-transparent"
            }`}
          >
            Capacity Planner
          </button>
        </div>

        {/* No workspace selected */}
        {!mounted ? (
          <div className="bg-white border-2 border-black rounded-sketchy shadow-flat-offset p-12 flex items-center justify-center">
            <Loader2 className="h-8 w-8 animate-spin text-tertiary mr-3" />
            <span className="font-cursive text-xl">Loading team...</span>
          </div>
        ) : !activeOrgId ? (
          <NoWorkspacePlaceholder
            title="No Workspace Selected"
            description="Please create or select an organization workspace to view the team directory."
            icon={
              <div className="w-16 h-16 rounded-full bg-accent-yellow border-2 border-black flex items-center justify-center mx-auto mb-4 rotate-[1.5deg] shadow-flat-offset-sm">
                <Users className="h-8 w-8 text-primary" />
              </div>
            }
          />
        ) : activeTab === "directory" ? (
          loading ? (
            <div className="bg-white border-2 border-black rounded-sketchy shadow-flat-offset p-12 flex items-center justify-center">
              <Loader2 className="h-8 w-8 animate-spin text-tertiary mr-3" />
              <span className="font-cursive text-xl">Loading team...</span>
            </div>
          ) : error ? (
            <div className="bg-accent-pink border-2 border-black rounded-sketchy shadow-flat-offset p-8 text-center max-w-lg mx-auto">
              <h2 className="font-cursive text-2xl font-bold mb-2">Something went wrong</h2>
              <p className="font-sans text-sm text-secondary">{error}</p>
            </div>
          ) : (
            <>
              {/* Member count badge */}
              <div className="flex items-center gap-3">
                <span className="bg-accent-blue border-2 border-black rounded-full px-4 py-1.5 font-sans text-xs font-bold shadow-flat-offset-sm">
                  {members.length} {members.length === 1 ? "Member" : "Members"}
                </span>
              </div>
              <TeamDirectory members={members} />
            </>
          )
        ) : (
          <>
            {loadingCapacity ? (
              <div className="bg-white border-2 border-black rounded-sketchy shadow-flat-offset p-12 flex items-center justify-center">
                <Loader2 className="h-8 w-8 animate-spin text-tertiary mr-3" />
                <span className="font-cursive text-xl">Loading capacity data...</span>
              </div>
            ) : !capacityData ? (
              <div className="bg-accent-pink border-2 border-black rounded-sketchy shadow-flat-offset p-8 text-center max-w-lg mx-auto">
                <h2 className="font-cursive text-2xl font-bold mb-2">Something went wrong</h2>
                <p className="font-sans text-sm text-secondary">Failed to load capacity planner data.</p>
              </div>
            ) : (
              <div className="flex flex-col gap-8">
                {/* Capacity Overview Visuals */}
                <CapacityAllocationChart 
                  capacityData={capacityData.capacity} 
                  showCost={capacityData.capacity.find((c) => c.userId === user?.id)?.role === "OWNER" || capacityData.capacity.find((c) => c.userId === user?.id)?.role === "ADMIN"} 
                />

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
                          {(capacityData.capacity.find((c) => c.userId === user?.id)?.role === "OWNER" || capacityData.capacity.find((c) => c.userId === user?.id)?.role === "ADMIN") && <th className="pb-3 pl-4 text-right">Actions</th>}
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-black/10 font-sans text-xs">
                        {capacityData.capacity.map((member) => {
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
                                  <div className="flex flex-wrap gap-1.5 max-w-md">
                                    {member.allocations.map((alloc) => (
                                      <span
                                        key={alloc.projectId}
                                        className="bg-neutral-bg border border-black rounded px-1.5 py-0.5 text-[10px] font-medium text-primary"
                                      >
                                        {alloc.projectName}: <strong className="font-bold">{alloc.percentage}%</strong>
                                      </span>
                                    ))}
                                  </div>
                                )}
                              </td>

                              {/* Total Allocation */}
                              <td className="py-4 px-4">
                                <span
                                  className={`inline-flex items-center px-2 py-0.5 rounded-full border font-bold text-[10px] ${
                                    isOver
                                      ? "bg-accent-pink/30 border-accent-pink text-primary"
                                      : member.totalAllocatedPercentage === 100
                                      ? "bg-accent-green/30 border-accent-green text-primary"
                                      : "bg-accent-blue/30 border-accent-blue text-primary"
                                  }`}
                                >
                                  {member.totalAllocatedPercentage}%
                                </span>
                              </td>

                              {/* Actions */}
                              {(capacityData.capacity.find((c) => c.userId === user?.id)?.role === "OWNER" || capacityData.capacity.find((c) => c.userId === user?.id)?.role === "ADMIN") && (
                                <td className="py-4 pl-4 text-right">
                                  <button
                                    onClick={() =>
                                      setEditingMember({
                                        userId: member.userId,
                                        name: member.name,
                                        allocations: member.allocations,
                                      })
                                    }
                                    className="p-1 hover:bg-neutral-bg rounded border border-transparent hover:border-black transition-all cursor-pointer inline-flex items-center justify-center"
                                    title="Edit allocations"
                                  >
                                    <Edit2 className="h-4 w-4" />
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
              </div>
            )}
            
            {editingMember && (
              <EditAllocationModal
                isOpen={!!editingMember}
                userId={editingMember.userId}
                userName={editingMember.name}
                userAllocations={editingMember.allocations}
                allProjects={capacityData?.projects || []}
                orgId={activeOrgId || ""}
                onClose={() => setEditingMember(null)}
                onSuccess={handleModalSuccess}
              />
            )}
          </>
        )}
      </div>
    </WorkspacePageLayout>
  );
}
