"use client";

import React, { useState } from "react";
import { Trash2, Loader2, Calendar } from "lucide-react";
import { deleteTimeEntry } from "@/actions/timeEntry";

type Props = {
  logs: Array<{
    id: string;
    task_id: string;
    task_title: string;
    user_id: string;
    start_time: string;
    end_time: string | null;
    duration: number | null;
    description: string | null;
  }>;
  orgId: string;
  currentUserId: string;
  onDeleteSuccess: () => void;
};

export function TimeEntryList({ logs, orgId, currentUserId, onDeleteSuccess }: Props) {
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [error, setError] = useState("");

  const formatDuration = (seconds: number | null) => {
    if (!seconds) return "-";
    const hrs = Math.floor(seconds / 3600);
    const mins = Math.floor((seconds % 3600) / 60);
    if (hrs > 0) return `${hrs}h ${mins}m`;
    return `${mins}m`;
  };

  const formatTimestamp = (dateStr: string) => {
    const d = new Date(dateStr);
    return d.toLocaleString("en-US", {
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const handleDelete = async (entryId: string) => {
    if (!confirm("Are you sure you want to delete this time entry?")) return;
    setError("");
    setDeletingId(entryId);
    try {
      const res = await deleteTimeEntry(entryId, orgId);
      if (res.success) {
        onDeleteSuccess();
      } else {
        setError(res.error || "Failed to delete time entry");
      }
    } catch {
      setError("An unexpected error occurred");
    } finally {
      setDeletingId(null);
    }
  };

  return (
    <div className="bg-white border-2 border-black rounded-sketchy shadow-flat-offset p-6 flex flex-col gap-6">
      <div className="flex items-center justify-between border-b border-black/10 pb-3">
        <h2 className="font-cursive text-2xl font-bold">Recent Time Entries</h2>
        {error && <span className="text-xs font-mono font-bold text-rose-600">{error}</span>}
      </div>

      {logs.length === 0 ? (
        <div className="border-2 border-dashed border-black/20 rounded-sketchy-sm p-12 text-center text-secondary/60 font-sans flex flex-col items-center gap-2">
          <Calendar className="h-8 w-8 text-secondary/40" />
          <span>No time entries logged yet. Start the timer or log manually!</span>
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-left font-sans text-sm border-collapse">
            <thead>
              <tr className="border-b-2 border-black text-secondary/80">
                <th className="py-3 px-4 font-bold text-xs uppercase">Task</th>
                <th className="py-3 px-4 font-bold text-xs uppercase">Start Time</th>
                <th className="py-3 px-4 font-bold text-xs uppercase">End Time</th>
                <th className="py-3 px-4 font-bold text-xs uppercase">Duration</th>
                <th className="py-3 px-4 font-bold text-xs uppercase">Notes</th>
                <th className="py-3 px-4 font-bold text-xs uppercase text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {logs.map((log) => {
                const isDeletable = log.user_id === currentUserId;
                return (
                  <tr key={log.id} className="border-b border-black/10 hover:bg-neutral-bg/30 transition-colors">
                    <td className="py-3.5 px-4 font-semibold text-primary max-w-[200px] truncate">
                      {log.task_title}
                    </td>
                    <td className="py-3.5 px-4 font-mono text-xs text-secondary/80">
                      {formatTimestamp(log.start_time)}
                    </td>
                    <td className="py-3.5 px-4 font-mono text-xs text-secondary/80">
                      {log.end_time ? formatTimestamp(log.end_time) : <span className="text-tertiary animate-pulse font-bold">Running...</span>}
                    </td>
                    <td className="py-3.5 px-4 font-semibold">
                      {formatDuration(log.duration)}
                    </td>
                    <td className="py-3.5 px-4 text-xs text-secondary italic max-w-[200px] truncate">
                      {log.description || "-"}
                    </td>
                    <td className="py-3.5 px-4 text-right">
                      {isDeletable && log.end_time && (
                        <button
                          onClick={() => handleDelete(log.id)}
                          disabled={deletingId === log.id}
                          className="inline-flex items-center justify-center p-2 bg-accent-pink hover:bg-[#FFB2B2] text-primary border-2 border-black rounded-full shadow-flat-offset-xs active:translate-y-0.5 hover:-translate-y-0.5 transition-all disabled:opacity-40 disabled:pointer-events-none cursor-pointer"
                          aria-label="Delete entry"
                        >
                          {deletingId === log.id ? (
                            <Loader2 className="h-3 w-3 animate-spin" />
                          ) : (
                            <Trash2 className="h-3.5 w-3.5" />
                          )}
                        </button>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
