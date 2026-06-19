"use client";

import React, { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { getTaskTotalTime, getTaskTimeEntries, getActiveTimer, startTimer, stopTimer } from "@/actions/timeEntry";
import { Play, Square, Loader2, Clock } from "lucide-react";

type Props = {
  taskId: string;
  orgId: string;
};

export function TaskTimeSection({ taskId, orgId }: Props) {
  const queryClient = useQueryClient();
  const [loadingAction, setLoadingAction] = useState(false);
  const [error, setError] = useState("");

  // 1. Fetch total time
  const { data: totalData } = useQuery({
    queryKey: ["taskTimeTotal", taskId],
    queryFn: async () => {
      const res = await getTaskTotalTime(taskId);
      if (!res.success) throw new Error(res.error || "Failed to fetch total time");
      return res.totalSeconds;
    },
  });

  // 2. Fetch active timer
  const { data: activeTimer } = useQuery({
    queryKey: ["activeTimer"],
    queryFn: async () => {
      const res = await getActiveTimer();
      if (!res.success) throw new Error(res.error || "Failed to fetch active timer");
      return res.data;
    },
  });

  // 3. Fetch entries for this task
  const { data: entries = [], isLoading: loadingEntries } = useQuery({
    queryKey: ["taskTimeEntries", taskId],
    queryFn: async () => {
      const res = await getTaskTimeEntries(taskId);
      if (!res.success) throw new Error(res.error || "Failed to fetch entries");
      return res.data;
    },
  });

  const formatDuration = (seconds: number | null) => {
    if (!seconds) return "0m";
    const hrs = Math.floor(seconds / 3600);
    const mins = Math.floor((seconds % 3600) / 60);
    if (hrs > 0) return `${hrs}h ${mins}m`;
    return `${mins}m`;
  };

  const handleStartTimer = async () => {
    setError("");
    setLoadingAction(true);
    try {
      const res = await startTimer(taskId, orgId);
      if (res.success) {
        queryClient.invalidateQueries({ queryKey: ["activeTimer"] });
        queryClient.invalidateQueries({ queryKey: ["taskTimeEntries", taskId] });
      } else {
        setError(res.error || "Failed to start timer");
      }
    } catch {
      setError("An unexpected error occurred");
    } finally {
      setLoadingAction(false);
    }
  };

  const handleStopTimer = async () => {
    if (!activeTimer) return;
    setError("");
    setLoadingAction(true);
    try {
      const res = await stopTimer(activeTimer.id);
      if (res.success) {
        queryClient.invalidateQueries({ queryKey: ["activeTimer"] });
        queryClient.invalidateQueries({ queryKey: ["taskTimeTotal", taskId] });
        queryClient.invalidateQueries({ queryKey: ["taskTimeEntries", taskId] });
        queryClient.invalidateQueries({ queryKey: ["timeEntries", orgId] });
      } else {
        setError(res.error || "Failed to stop timer");
      }
    } catch {
      setError("An unexpected error occurred");
    } finally {
      setLoadingAction(false);
    }
  };

  const isCurrentTimer = activeTimer && activeTimer.task_id === taskId;
  const isTimerRunningElsewhere = activeTimer && activeTimer.task_id !== taskId;
  const totalSeconds = totalData ?? 0;

  return (
    <div className="border-2 border-black rounded-sketchy p-4 flex flex-col gap-4 bg-neutral-bg/20 mt-4">
      <div className="flex items-center justify-between border-b border-black/10 pb-2">
        <div className="flex items-center gap-1.5 font-cursive text-lg font-bold text-primary">
          <Clock className="h-4.5 w-4.5 text-secondary" />
          <span>Time Logged</span>
        </div>
        <span className="font-mono text-sm font-bold bg-white border border-black/25 px-2 py-0.5 rounded">
          Total: {formatDuration(totalSeconds)}
        </span>
      </div>

      {error && (
        <div className="text-xs font-mono font-bold text-rose-600">
          {error}
        </div>
      )}

      {/* Timer Controls */}
      <div className="flex items-center justify-between gap-3 bg-white border border-black/10 p-3 rounded-sketchy-sm">
        <div className="text-xs font-sans text-secondary">
          {isCurrentTimer ? (
            <span className="text-tertiary animate-pulse font-bold">Your timer is running on this task...</span>
          ) : isTimerRunningElsewhere ? (
            <span>Timer running on another task.</span>
          ) : (
            <span>No timer running.</span>
          )}
        </div>

        {isCurrentTimer ? (
          <button
            onClick={handleStopTimer}
            disabled={loadingAction}
            type="button"
            className="flex items-center gap-1 bg-accent-pink hover:bg-[#FFB2B2] text-primary border border-black text-xs font-bold px-3 py-1.5 rounded-full active:translate-y-0.5 transition-all disabled:opacity-40 cursor-pointer"
          >
            {loadingAction ? (
              <Loader2 className="h-3 w-3 animate-spin" />
            ) : (
              <Square className="h-3.5 w-3.5 fill-current text-primary" />
            )}
            Stop Timer
          </button>
        ) : (
          <button
            onClick={handleStartTimer}
            disabled={loadingAction || isTimerRunningElsewhere}
            type="button"
            className="flex items-center gap-1 bg-accent-green hover:bg-[#C2E9C9] text-primary border border-black text-xs font-bold px-3 py-1.5 rounded-full active:translate-y-0.5 transition-all disabled:opacity-40 cursor-pointer"
          >
            {loadingAction ? (
              <Loader2 className="h-3 w-3 animate-spin" />
            ) : (
              <Play className="h-3.5 w-3.5 fill-current text-primary" />
            )}
            Start Timer
          </button>
        )}
      </div>

      {/* Small list of entries */}
      <div className="flex flex-col gap-2">
        <span className="font-sans text-xs font-bold text-secondary">Recent Logs</span>
        {loadingEntries ? (
          <div className="flex items-center justify-center p-4">
            <Loader2 className="h-4 w-4 animate-spin text-secondary" />
          </div>
        ) : entries.length === 0 ? (
          <div className="text-center py-4 text-xs text-secondary/60 italic border border-dashed border-black/10 rounded">
            No time logged on this task.
          </div>
        ) : (
          <div className="flex flex-col gap-1.5 max-h-36 overflow-y-auto">
            {entries.slice(0, 5).map((entry) => (
              <div
                key={entry.id}
                className="flex items-center justify-between text-xs border border-black/5 bg-white p-2 rounded-sm"
              >
                <div className="font-mono text-secondary">
                  {new Date(entry.start_time).toLocaleDateString()}
                </div>
                <div className="font-semibold text-primary">
                  {entry.duration ? formatDuration(entry.duration) : "Running..."}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
