"use client";

import React, { useState, useEffect } from "react";
import { Play, Square, Loader2 } from "lucide-react";
import { stopTimer } from "@/actions/timeEntry";

type Props = {
  activeTimer: { id: string; task_id: string; task_title?: string; start_time: string };
  onStopSuccess: () => void;
};

export function ActiveTimerCard({ activeTimer, onStopSuccess }: Props) {
  const [elapsed, setElapsed] = useState(0);
  const [stopping, setStopping] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    const startTime = new Date(activeTimer.start_time).getTime();

    const updateTimer = () => {
      const now = new Date().getTime();
      const diffSeconds = Math.max(0, Math.floor((now - startTime) / 1000));
      setElapsed(diffSeconds);
    };

    updateTimer();
    const interval = setInterval(updateTimer, 1000);

    return () => clearInterval(interval);
  }, [activeTimer.start_time]);

  const formatElapsed = (totalSeconds: number) => {
    const hrs = Math.floor(totalSeconds / 3600);
    const mins = Math.floor((totalSeconds % 3600) / 60);
    const secs = totalSeconds % 60;
    return [
      hrs.toString().padStart(2, "0"),
      mins.toString().padStart(2, "0"),
      secs.toString().padStart(2, "0"),
    ].join(":");
  };

  const handleStopClick = async () => {
    setError("");
    setStopping(true);
    try {
      const res = await stopTimer(activeTimer.id);
      if (res.success) {
        onStopSuccess();
      } else {
        setError(res.error || "Failed to stop timer");
      }
    } catch {
      setError("An unexpected error occurred");
    } finally {
      setStopping(false);
    }
  };

  return (
    <div className="bg-accent-yellow border-2 border-black rounded-sketchy p-6 shadow-flat-offset flex flex-col sm:flex-row items-center justify-between gap-4 rotate-[-0.5deg]">
      <div className="flex items-center gap-4">
        <div className="w-12 h-12 rounded-full bg-tertiary border-2 border-black flex items-center justify-center text-white shadow-flat-offset-sm animate-pulse">
          <Play className="h-5 w-5 fill-current" />
        </div>
        <div>
          <h3 className="font-cursive text-xl font-bold mb-0.5">Live Timer Running</h3>
          <p className="font-sans text-sm font-semibold text-secondary">
            Tracking: <span className="underline decoration-black decoration-1">{activeTimer.task_title || "Task ID: " + activeTimer.task_id}</span>
          </p>
        </div>
      </div>

      <div className="flex items-center gap-6">
        <div className="font-mono text-3xl font-bold bg-white border-2 border-black rounded px-4 py-2 shadow-flat-offset-xs">
          {formatElapsed(elapsed)}
        </div>

        <button
          onClick={handleStopClick}
          disabled={stopping}
          className="flex items-center gap-2 bg-accent-pink hover:bg-[#FFB2B2] text-primary border-2 border-black font-sans text-sm font-bold px-6 py-2.5 rounded-full shadow-flat-offset-sm active:translate-y-0.5 hover:-translate-y-0.5 transition-all disabled:opacity-40 disabled:pointer-events-none cursor-pointer whitespace-nowrap"
        >
          {stopping ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Square className="h-4 w-4 fill-current text-primary" />
          )}
          Stop Timer
        </button>
      </div>

      {error && (
        <div className="w-full text-xs font-mono font-bold text-rose-600 mt-2 block sm:hidden">
          {error}
        </div>
      )}
    </div>
  );
}
