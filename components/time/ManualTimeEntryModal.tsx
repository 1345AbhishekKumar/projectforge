"use client";

import React, { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { X, Loader2 } from "lucide-react";
import { createManualEntry } from "@/actions/timeEntry";

const manualTimeSchema = z
  .object({
    taskId: z.string().uuid("Please select a task"),
    startTime: z.string().min(1, "Start time is required"),
    endTime: z.string().min(1, "End time is required"),
    description: z.string().max(500, "Description must be under 500 characters").optional(),
  })
  .refine(
    (data) => new Date(data.startTime) < new Date(data.endTime),
    { message: "Start time must be before end time", path: ["startTime"] }
  )
  .refine(
    (data) => new Date(data.endTime) <= new Date(),
    { message: "End time cannot be in the future", path: ["endTime"] }
  )
  .refine(
    (data) => new Date(data.startTime) <= new Date(),
    { message: "Start time cannot be in the future", path: ["startTime"] }
  );

type ManualTimeInput = z.infer<typeof manualTimeSchema>;

type Props = {
  isOpen: boolean;
  onClose: () => void;
  orgId: string;
  tasks: Array<{ id: string; title: string }>;
  onSuccess: () => void;
};

export function ManualTimeEntryModal({ isOpen, onClose, orgId, tasks, onSuccess }: Props) {
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  const {
    register,
    handleSubmit,
    formState: { errors },
    reset,
  } = useForm<ManualTimeInput>({
    resolver: zodResolver(manualTimeSchema),
    mode: "onBlur",
  });

  if (!isOpen) return null;

  const onSubmit = async (data: ManualTimeInput) => {
    setError("");
    setSubmitting(true);
    try {
      const startIso = new Date(data.startTime).toISOString();
      const endIso = new Date(data.endTime).toISOString();

      const res = await createManualEntry(data.taskId, orgId, startIso, endIso, data.description);
      if (res.success) {
        reset();
        onSuccess();
        onClose();
      } else {
        setError(res.error || "Failed to log time entry");
      }
    } catch {
      setError("An unexpected error occurred");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-[100] flex items-center justify-center p-4">
      <div className="bg-white border-2 border-black rounded-sketchy shadow-flat-offset p-6 md:p-8 max-w-md w-full relative rotate-[0.5deg]">
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 w-8 h-8 rounded-full border-2 border-black bg-white hover:bg-neutral-bg flex items-center justify-center shadow-flat-offset-sm active:translate-y-0.5 hover:-translate-y-0.5 transition-all cursor-pointer font-bold"
          type="button"
        >
          <X className="h-4 w-4" />
        </button>

        <div className="mb-6">
          <h2 className="font-cursive text-2xl font-bold mb-1">Log Time Manually</h2>
          <p className="font-sans text-xs text-secondary">
            Log hours worked directly against a task in this workspace.
          </p>
        </div>

        {error && (
          <div className="bg-accent-pink border-2 border-black rounded-sketchy-sm p-3 text-xs font-semibold mb-4">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-4">
          {/* Select Task */}
          <div>
            <label className="font-sans text-xs font-semibold mb-1 block">Select Task</label>
            <select
              {...register("taskId")}
              className={`w-full px-3 py-2 border-2 border-black rounded-sketchy-sm font-sans text-sm bg-white focus:outline-none focus:ring-2 focus:ring-tertiary cursor-pointer ${
                errors.taskId ? "border-rose-500 bg-rose-50/20" : ""
              }`}
            >
              <option value="">Choose a task...</option>
              {tasks.map((task) => (
                <option key={task.id} value={task.id}>
                  {task.title}
                </option>
              ))}
            </select>
            {errors.taskId && (
              <span className="text-xs font-mono font-bold text-rose-600 mt-1 block">
                {errors.taskId.message}
              </span>
            )}
          </div>

          {/* Start Time */}
          <div>
            <label className="font-sans text-xs font-semibold mb-1 block">Start Date & Time</label>
            <input
              type="datetime-local"
              {...register("startTime")}
              className={`w-full px-3 py-2 border-2 border-black rounded-sketchy-sm font-sans text-sm bg-white focus:outline-none focus:ring-2 focus:ring-tertiary cursor-pointer ${
                errors.startTime ? "border-rose-500 bg-rose-50/20" : ""
              }`}
            />
            {errors.startTime && (
              <span className="text-xs font-mono font-bold text-rose-600 mt-1 block">
                {errors.startTime.message}
              </span>
            )}
          </div>

          {/* End Time */}
          <div>
            <label className="font-sans text-xs font-semibold mb-1 block">End Date & Time</label>
            <input
              type="datetime-local"
              {...register("endTime")}
              className={`w-full px-3 py-2 border-2 border-black rounded-sketchy-sm font-sans text-sm bg-white focus:outline-none focus:ring-2 focus:ring-tertiary cursor-pointer ${
                errors.endTime ? "border-rose-500 bg-rose-50/20" : ""
              }`}
            />
            {errors.endTime && (
              <span className="text-xs font-mono font-bold text-rose-600 mt-1 block">
                {errors.endTime.message}
              </span>
            )}
          </div>

          {/* Description */}
          <div>
            <label className="font-sans text-xs font-semibold mb-1 block">Notes (Optional)</label>
            <textarea
              {...register("description")}
              rows={3}
              placeholder="What did you work on?"
              className={`w-full px-3 py-2 border-2 border-black rounded-sketchy-sm font-sans text-sm bg-white focus:outline-none focus:ring-2 focus:ring-tertiary resize-none ${
                errors.description ? "border-rose-500 bg-rose-50/20" : ""
              }`}
            />
            {errors.description && (
              <span className="text-xs font-mono font-bold text-rose-600 mt-1 block">
                {errors.description.message}
              </span>
            )}
          </div>

          {/* Actions */}
          <div className="flex gap-3 mt-4 pt-4 border-t border-black/10">
            <button
              onClick={onClose}
              type="button"
              className="flex-1 py-2 px-4 bg-white hover:bg-neutral-bg text-primary border-2 border-black rounded-full font-sans text-sm font-bold shadow-flat-offset-xs active:translate-y-0.5 hover:-translate-y-0.5 transition-all cursor-pointer text-center"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="flex-1 py-2 px-4 bg-tertiary hover:bg-tertiary-hover text-white border-2 border-black rounded-full font-sans text-sm font-bold shadow-flat-offset-xs active:translate-y-0.5 hover:-translate-y-0.5 transition-all disabled:opacity-40 disabled:pointer-events-none cursor-pointer"
            >
              {submitting ? (
                <span className="flex items-center justify-center gap-1.5">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Saving...
                </span>
              ) : (
                "Log Hours"
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
