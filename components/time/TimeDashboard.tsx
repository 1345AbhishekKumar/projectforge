"use client";

import React, { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { getActiveTimer, getUserTimeEntries } from "@/actions/timeEntry";
import { getOrganizationTasks } from "@/actions/task";
import { ActiveTimerCard } from "./ActiveTimerCard";
import { ManualTimeEntryModal } from "./ManualTimeEntryModal";
import { TimeEntryList } from "./TimeEntryList";
import { Loader2, Plus, Download, Clock } from "lucide-react";

type Props = {
  orgId: string;
  currentUserId: string;
  isAdminOrOwner: boolean;
};

export function TimeDashboard({ orgId, currentUserId, isAdminOrOwner }: Props) {
  const queryClient = useQueryClient();
  const [isManualModalOpen, setIsManualModalOpen] = useState(false);

  // 1. Fetch active timer
  const { data: activeTimer, isLoading: loadingTimer } = useQuery({
    queryKey: ["activeTimer"],
    queryFn: async () => {
      const res = await getActiveTimer();
      if (!res.success) throw new Error(res.error || "Failed to fetch active timer");
      return res.data;
    },
  });

  // 2. Fetch recent time entries
  const { data: timeEntries = [], isLoading: loadingEntries } = useQuery({
    queryKey: ["timeEntries", orgId],
    queryFn: async () => {
      const res = await getUserTimeEntries(orgId);
      if (!res.success) throw new Error(res.error || "Failed to fetch time entries");
      return res.data;
    },
  });

  // 3. Fetch org tasks for manual logger selection
  const { data: orgTasks = [] } = useQuery({
    queryKey: ["orgTasks", orgId],
    queryFn: async () => {
      const res = await getOrganizationTasks(orgId);
      if (!res.success) throw new Error(res.error || "Failed to fetch tasks");
      return res.data.map((t) => ({ id: t.id, title: t.title }));
    },
    enabled: isManualModalOpen, // Only fetch when manual logger modal opens
  });

  const handleTimerStop = () => {
    queryClient.invalidateQueries({ queryKey: ["activeTimer"] });
    queryClient.invalidateQueries({ queryKey: ["timeEntries", orgId] });
  };

  const handleManualEntrySuccess = () => {
    queryClient.invalidateQueries({ queryKey: ["timeEntries", orgId] });
  };

  const handleDeleteSuccess = () => {
    queryClient.invalidateQueries({ queryKey: ["timeEntries", orgId] });
  };

  const isLoading = loadingTimer || loadingEntries;

  return (
    <div className="flex flex-col gap-6">
      {/* Active Timer Card (If one runs) */}
      {activeTimer && (
        <ActiveTimerCard activeTimer={activeTimer} onStopSuccess={handleTimerStop} />
      )}

      {/* Action Header Card */}
      <div className="bg-white border-2 border-black rounded-sketchy shadow-flat-offset p-6 flex flex-col sm:flex-row items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="p-2.5 bg-accent-blue/30 border-2 border-black rounded-full">
            <Clock className="h-6 w-6 text-primary" />
          </div>
          <div>
            <h3 className="font-cursive text-2xl font-bold">Track Your Effort</h3>
            <p className="font-sans text-xs text-secondary">
              Start/stop automatic timers from task specifications, or log hours manually below.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3 w-full sm:w-auto">
          {isAdminOrOwner && (
            <a
              href={`/api/time/export?orgId=${orgId}`}
              className="flex-1 sm:flex-initial inline-flex items-center justify-center gap-2 bg-white hover:bg-neutral-bg text-primary border-2 border-black font-sans text-xs font-bold px-4 py-2.5 rounded-full shadow-flat-offset-xs active:translate-y-0.5 hover:-translate-y-0.5 transition-all cursor-pointer whitespace-nowrap"
            >
              <Download className="h-4 w-4" />
              Export CSV
            </a>
          )}
          <button
            onClick={() => setIsManualModalOpen(true)}
            className="flex-1 sm:flex-initial inline-flex items-center justify-center gap-2 bg-accent-yellow hover:bg-[#FFE680] text-primary border-2 border-black font-sans text-xs font-bold px-4 py-2.5 rounded-full shadow-flat-offset-xs active:translate-y-0.5 hover:-translate-y-0.5 transition-all cursor-pointer whitespace-nowrap"
          >
            <Plus className="h-4 w-4" />
            Log Hours Manually
          </button>
        </div>
      </div>

      {/* Main content list */}
      {isLoading ? (
        <div className="bg-white border-2 border-black rounded-sketchy shadow-flat-offset p-12 flex items-center justify-center min-h-[300px]">
          <div className="flex flex-col items-center gap-3">
            <Loader2 className="h-8 w-8 animate-spin text-tertiary" />
            <span className="font-cursive text-lg font-bold">Loading logs...</span>
          </div>
        </div>
      ) : (
        <TimeEntryList
          logs={timeEntries}
          orgId={orgId}
          currentUserId={currentUserId}
          onDeleteSuccess={handleDeleteSuccess}
        />
      )}

      {/* Manual log modal */}
      <ManualTimeEntryModal
        isOpen={isManualModalOpen}
        onClose={() => setIsManualModalOpen(false)}
        orgId={orgId}
        tasks={orgTasks}
        onSuccess={handleManualEntrySuccess}
      />
    </div>
  );
}
