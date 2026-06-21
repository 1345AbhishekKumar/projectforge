"use client";

import React, { useState } from "react";
import { X, Plus, Trash2, Loader2, AlertTriangle } from "lucide-react";
import { upsertResourceAllocation } from "@/actions/resourceAllocation";
import type { Project } from "@/types";

type Props = {
  isOpen: boolean;
  onClose: () => void;
  orgId: string;
  userId: string;
  userName: string;
  userAllocations: {
    id: string;
    projectId: string;
    projectName: string;
    percentage: number;
  }[];
  allProjects: Project[];
  onSuccess: (warning?: string) => void;
};

export function EditAllocationModal({
  isOpen,
  onClose,
  orgId,
  userId,
  userName,
  userAllocations,
  allProjects,
  onSuccess,
}: Props) {
  const [selectedProjectId, setSelectedProjectId] = useState("");
  const [newPercentage, setNewPercentage] = useState<number>(50);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  if (!isOpen) return null;

  // Filter projects to only show ones the user is not yet allocated to
  const availableProjects = allProjects.filter(
    (p) => !userAllocations.some((a) => a.projectId === p.id)
  );

  const totalAllocation = userAllocations.reduce((sum, a) => sum + a.percentage, 0);

  const handleAddAllocation = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedProjectId) {
      setError("Please select a project to allocate.");
      return;
    }
    if (newPercentage <= 0 || newPercentage > 100) {
      setError("Allocation percentage must be between 1% and 100%.");
      return;
    }

    setSubmitting(true);
    setError("");

    try {
      const res = await upsertResourceAllocation(orgId, userId, selectedProjectId, newPercentage);
      if (res.success) {
        setSelectedProjectId("");
        setNewPercentage(50);
        onSuccess(res.warning);
      } else {
        setError(res.error || "Failed to add allocation.");
      }
    } catch {
      setError("An unexpected error occurred.");
    } finally {
      setSubmitting(false);
    }
  };

  const handleUpdatePercentage = async (projectId: string, percentage: number) => {
    if (percentage < 0 || percentage > 100) return;
    
    setSubmitting(true);
    setError("");

    try {
      const res = await upsertResourceAllocation(orgId, userId, projectId, percentage);
      if (res.success) {
        onSuccess(res.warning);
      } else {
        setError(res.error || "Failed to update allocation.");
      }
    } catch {
      setError("An unexpected error occurred.");
    } finally {
      setSubmitting(false);
    }
  };

  const handleRemoveAllocation = async (projectId: string) => {
    setSubmitting(true);
    setError("");

    try {
      // Upserting 0 percentage deletes the allocation
      const res = await upsertResourceAllocation(orgId, userId, projectId, 0);
      if (res.success) {
        onSuccess(res.warning);
      } else {
        setError(res.error || "Failed to remove allocation.");
      }
    } catch {
      setError("An unexpected error occurred.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-white border-2 border-black rounded-sketchy shadow-flat-offset p-6 md:p-8 max-w-md w-full relative rotate-[0.5deg] max-h-[90vh] flex flex-col gap-5 overflow-y-auto">
        {/* Header */}
        <div className="flex justify-between items-center border-b-2 border-black pb-3">
          <div>
            <h3 className="font-cursive text-2xl font-bold">Manage Allocations</h3>
            <p className="text-secondary/70 text-xs font-semibold">Editing: {userName}</p>
          </div>
          <button
            onClick={onClose}
            className="p-1 border-2 border-black rounded-full hover:bg-neutral-bg transition-colors"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {error && (
          <div className="p-3 border-2 border-black rounded-sketchy-sm bg-accent-pink/15 text-accent-pink font-sans text-xs font-semibold">
            {error}
          </div>
        )}

        {/* Current Allocations */}
        <div className="flex flex-col gap-3">
          <label className="font-cursive text-lg font-bold">Active Allocations ({totalAllocation}%)</label>
          {userAllocations.length === 0 ? (
            <p className="text-secondary/50 text-xs italic bg-neutral-bg/30 border border-black/10 rounded-sketchy-sm p-4 text-center">
              Currently unallocated to any active project.
            </p>
          ) : (
            <div className="flex flex-col gap-2">
              {userAllocations.map((alloc) => (
                <div
                  key={alloc.id}
                  className="flex items-center justify-between border-2 border-black rounded-sketchy-sm p-3 bg-white hover:bg-neutral-bg/20"
                >
                  <span className="font-cursive text-sm font-bold truncate max-w-[160px]">
                    {alloc.projectName}
                  </span>
                  <div className="flex items-center gap-2">
                    <input
                      type="number"
                      value={alloc.percentage}
                      onChange={(e) => handleUpdatePercentage(alloc.projectId, parseInt(e.target.value) || 0)}
                      disabled={submitting}
                      className="w-16 px-2 py-1 border-2 border-black rounded-sm font-sans text-xs font-bold text-center bg-white"
                      min="1"
                      max="100"
                    />
                    <span className="font-sans text-xs font-bold">%</span>
                    <button
                      onClick={() => handleRemoveAllocation(alloc.projectId)}
                      disabled={submitting}
                      className="p-1.5 border border-black rounded bg-accent-pink hover:bg-opacity-80 transition-colors"
                      title="Remove Allocation"
                    >
                      <Trash2 className="h-3 w-3 text-primary" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}

          {totalAllocation > 100 && (
            <div className="flex items-start gap-2 p-3 border-2 border-black rounded-sketchy-sm bg-accent-pink/10 text-accent-pink animate-pulse mt-1">
              <AlertTriangle className="h-4 w-4 shrink-0 mt-0.5" />
              <span className="text-[10px] font-bold">
                User exceeds 100% capacity! Total allocation is {totalAllocation}%.
              </span>
            </div>
          )}
        </div>

        {/* Allocate to Project Form */}
        {availableProjects.length > 0 ? (
          <form onSubmit={handleAddAllocation} className="border-t-2 border-black pt-4 flex flex-col gap-3">
            <label className="font-cursive text-lg font-bold">Allocate to Project</label>
            <div className="flex flex-col gap-2">
              <select
                value={selectedProjectId}
                onChange={(e) => setSelectedProjectId(e.target.value)}
                disabled={submitting}
                className="w-full px-3 py-2 border-2 border-black rounded-sketchy-sm font-sans text-xs font-bold bg-white focus:outline-none focus:ring-2 focus:ring-tertiary cursor-pointer"
              >
                <option value="">Select a project...</option>
                {availableProjects.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name}
                  </option>
                ))}
              </select>
              
              <div className="flex items-center gap-3">
                <div className="flex-1 flex items-center gap-2">
                  <span className="font-sans text-xs font-semibold text-secondary">Allocation:</span>
                  <input
                    type="number"
                    value={newPercentage}
                    onChange={(e) => setNewPercentage(parseInt(e.target.value) || 0)}
                    disabled={submitting}
                    className="w-16 px-2 py-1.5 border-2 border-black rounded-sm font-sans text-xs font-bold text-center bg-white"
                    min="1"
                    max="100"
                  />
                  <span className="font-sans text-xs font-bold">%</span>
                </div>

                <button
                  type="submit"
                  disabled={submitting || !selectedProjectId}
                  className="flex items-center gap-1.5 px-4 py-2 bg-accent-yellow hover:bg-[#FFE680] text-primary border-2 border-black rounded-full font-sans text-xs font-bold shadow-flat-offset-sm active:translate-y-0.5 transition-all disabled:opacity-40 disabled:pointer-events-none cursor-pointer"
                >
                  {submitting ? (
                    <Loader2 className="h-3 w-3 animate-spin" />
                  ) : (
                    <Plus className="h-3.5 w-3.5" />
                  )}
                  Allocate
                </button>
              </div>
            </div>
          </form>
        ) : (
          userAllocations.length > 0 && (
            <div className="border-t-2 border-black pt-4 text-center">
              <p className="text-secondary/60 text-xs italic">All active projects have been allocated.</p>
            </div>
          )
        )}
      </div>
    </div>
  );
}
