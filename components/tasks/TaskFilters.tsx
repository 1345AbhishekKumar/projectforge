"use client";

import React, { useState, useEffect, useRef } from "react";
import { Filter, ChevronDown, Check, Save, Trash2, X } from "lucide-react";
import type { TaskPriority, TaskStatus, Label, SavedView } from "@/types";
import type { MemberListItem } from "@/actions/membership";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";

const savedViewSchema = z.object({
  name: z
    .string()
    .trim()
    .min(3, "View name must be at least 3 characters")
    .max(50, "View name must be at most 50 characters"),
});

type SavedViewInput = z.infer<typeof savedViewSchema>;

export type FiltersState = {
  priorities: TaskPriority[];
  statuses: TaskStatus[];
  assigneeIds: (string | null)[];
  labelIds: string[];
};

export const initialFilters: FiltersState = {
  priorities: [],
  statuses: [],
  assigneeIds: [],
  labelIds: [],
};

type Props = {
  members: MemberListItem[];
  labels: Label[];
  savedViews: SavedView[];
  activeFilters: FiltersState;
  onFiltersChange: (filters: FiltersState) => void;
  onSaveView: (name: string) => Promise<{ success: boolean; error?: string }>;
  onDeleteView: (viewId: string) => Promise<{ success: boolean; error?: string }>;
  activeViewName?: string;
  onClearViewName?: () => void;
};

export function TaskFilters({
  members,
  labels,
  savedViews,
  activeFilters,
  onFiltersChange,
  onSaveView,
  onDeleteView,
  activeViewName,
  onClearViewName
}: Props) {
  const [openDropdown, setOpenDropdown] = useState<"priority" | "status" | "assignee" | "label" | "views" | null>(null);
  const [isSavingView, setIsSavingView] = useState(false);
  const [saveError, setSaveError] = useState("");
  const [showSaveInput, setShowSaveInput] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
    reset,
  } = useForm<SavedViewInput>({
    resolver: zodResolver(savedViewSchema),
    mode: "onBlur",
    defaultValues: {
      name: "",
    },
  });

  const containerRef = useRef<HTMLDivElement>(null);

  // Close dropdown on outside click
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setOpenDropdown(null);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const toggleDropdown = (dropdown: "priority" | "status" | "assignee" | "label" | "views") => {
    setOpenDropdown(openDropdown === dropdown ? null : dropdown);
  };

  const togglePriority = (priority: TaskPriority) => {
    const isSelected = activeFilters.priorities.includes(priority);
    const priorities = isSelected
      ? activeFilters.priorities.filter((p) => p !== priority)
      : [...activeFilters.priorities, priority];
    onFiltersChange({ ...activeFilters, priorities });
    if (onClearViewName) onClearViewName();
  };

  const toggleStatus = (status: TaskStatus) => {
    const isSelected = activeFilters.statuses.includes(status);
    const statuses = isSelected
      ? activeFilters.statuses.filter((s) => s !== status)
      : [...activeFilters.statuses, status];
    onFiltersChange({ ...activeFilters, statuses });
    if (onClearViewName) onClearViewName();
  };

  const toggleAssignee = (assigneeId: string | null) => {
    const isSelected = activeFilters.assigneeIds.includes(assigneeId);
    const assigneeIds = isSelected
      ? activeFilters.assigneeIds.filter((id) => id !== assigneeId)
      : [...activeFilters.assigneeIds, assigneeId];
    onFiltersChange({ ...activeFilters, assigneeIds });
    if (onClearViewName) onClearViewName();
  };

  const toggleLabel = (labelId: string) => {
    const isSelected = activeFilters.labelIds.includes(labelId);
    const labelIds = isSelected
      ? activeFilters.labelIds.filter((id) => id !== labelId)
      : [...activeFilters.labelIds, labelId];
    onFiltersChange({ ...activeFilters, labelIds });
    if (onClearViewName) onClearViewName();
  };

  const onSaveViewSubmit = async (data: SavedViewInput) => {
    setIsSavingView(true);
    setSaveError("");
    const res = await onSaveView(data.name);
    setIsSavingView(false);

    if (res.success) {
      reset();
      setShowSaveInput(false);
    } else {
      setSaveError(res.error || "Failed to save view");
    }
  };

  const hasActiveFilters =
    activeFilters.priorities.length > 0 ||
    activeFilters.statuses.length > 0 ||
    activeFilters.assigneeIds.length > 0 ||
    activeFilters.labelIds.length > 0;

  const handleClearAll = () => {
    onFiltersChange(initialFilters);
    if (onClearViewName) onClearViewName();
  };

  return (
    <div ref={containerRef} className="flex flex-col gap-3 w-full bg-white border-2 border-black rounded-sketchy p-4 shadow-flat-offset-sm select-none">
      <div className="flex flex-wrap items-center justify-between gap-4">
        {/* Left Side: Filter Dropdowns */}
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-1.5 text-xs font-bold font-sans uppercase text-secondary mr-1">
            <Filter className="h-3.5 w-3.5" />
            <span>Filters:</span>
          </div>

          {/* Priority Filter */}
          <div className="relative">
            <button
              onClick={() => toggleDropdown("priority")}
              className={`flex items-center gap-1.5 bg-white border-2 border-black rounded-full px-3 py-1.5 font-sans text-xs font-bold shadow-flat-offset-sm hover:-translate-y-0.5 active:translate-y-0.5 transition-all cursor-pointer ${
                activeFilters.priorities.length > 0 ? "bg-accent-yellow/20" : ""
              }`}
            >
              <span>Priority</span>
              {activeFilters.priorities.length > 0 && (
                <span className="bg-black text-white text-[9px] px-1.5 py-0.2 rounded-full font-bold">
                  {activeFilters.priorities.length}
                </span>
              )}
              <ChevronDown className="h-3 w-3" />
            </button>
            {openDropdown === "priority" && (
              <div className="absolute left-0 mt-2 w-48 bg-white border-2 border-black rounded-sketchy-sm shadow-flat-offset z-50 p-2 flex flex-col gap-1">
                {(["LOW", "MEDIUM", "HIGH", "URGENT"] as TaskPriority[]).map((p) => {
                  const isChecked = activeFilters.priorities.includes(p);
                  return (
                    <button
                      key={p}
                      onClick={() => togglePriority(p)}
                      className="w-full flex items-center justify-between px-2 py-1 text-left hover:bg-neutral-bg rounded-md text-xs font-bold font-sans cursor-pointer"
                    >
                      <span>{p}</span>
                      {isChecked && <Check className="h-3.5 w-3.5 text-tertiary" />}
                    </button>
                  );
                })}
              </div>
            )}
          </div>

          {/* Status Filter */}
          <div className="relative">
            <button
              onClick={() => toggleDropdown("status")}
              className={`flex items-center gap-1.5 bg-white border-2 border-black rounded-full px-3 py-1.5 font-sans text-xs font-bold shadow-flat-offset-sm hover:-translate-y-0.5 active:translate-y-0.5 transition-all cursor-pointer ${
                activeFilters.statuses.length > 0 ? "bg-accent-yellow/20" : ""
              }`}
            >
              <span>Status</span>
              {activeFilters.statuses.length > 0 && (
                <span className="bg-black text-white text-[9px] px-1.5 py-0.2 rounded-full font-bold">
                  {activeFilters.statuses.length}
                </span>
              )}
              <ChevronDown className="h-3 w-3" />
            </button>
            {openDropdown === "status" && (
              <div className="absolute left-0 mt-2 w-48 bg-white border-2 border-black rounded-sketchy-sm shadow-flat-offset z-50 p-2 flex flex-col gap-1">
                {(["TODO", "IN_PROGRESS", "DONE"] as TaskStatus[]).map((s) => {
                  const isChecked = activeFilters.statuses.includes(s);
                  return (
                    <button
                      key={s}
                      onClick={() => toggleStatus(s)}
                      className="w-full flex items-center justify-between px-2 py-1 text-left hover:bg-neutral-bg rounded-md text-xs font-bold font-sans cursor-pointer"
                    >
                      <span>{s === "IN_PROGRESS" ? "IN PROGRESS" : s}</span>
                      {isChecked && <Check className="h-3.5 w-3.5 text-tertiary" />}
                    </button>
                  );
                })}
              </div>
            )}
          </div>

          {/* Assignee Filter */}
          <div className="relative">
            <button
              onClick={() => toggleDropdown("assignee")}
              className={`flex items-center gap-1.5 bg-white border-2 border-black rounded-full px-3 py-1.5 font-sans text-xs font-bold shadow-flat-offset-sm hover:-translate-y-0.5 active:translate-y-0.5 transition-all cursor-pointer ${
                activeFilters.assigneeIds.length > 0 ? "bg-accent-yellow/20" : ""
              }`}
            >
              <span>Assignee</span>
              {activeFilters.assigneeIds.length > 0 && (
                <span className="bg-black text-white text-[9px] px-1.5 py-0.2 rounded-full font-bold">
                  {activeFilters.assigneeIds.length}
                </span>
              )}
              <ChevronDown className="h-3 w-3" />
            </button>
            {openDropdown === "assignee" && (
              <div className="absolute left-0 mt-2 w-56 bg-white border-2 border-black rounded-sketchy-sm shadow-flat-offset z-50 p-2 flex flex-col gap-1 max-h-60 overflow-y-auto">
                <button
                  onClick={() => toggleAssignee(null)}
                  className="w-full flex items-center justify-between px-2 py-1 text-left hover:bg-neutral-bg rounded-md text-xs font-bold font-sans cursor-pointer"
                >
                  <span>Unassigned</span>
                  {activeFilters.assigneeIds.includes(null) && <Check className="h-3.5 w-3.5 text-tertiary" />}
                </button>
                {members.map((member) => {
                  const isChecked = activeFilters.assigneeIds.includes(member.userId);
                  return (
                    <button
                      key={member.id}
                      onClick={() => toggleAssignee(member.userId)}
                      className="w-full flex items-center justify-between px-2 py-1.5 text-left hover:bg-neutral-bg rounded-md text-xs font-bold font-sans cursor-pointer gap-2"
                    >
                      <div className="flex items-center gap-2 overflow-hidden">
                        {member.avatarUrl ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img
                            src={member.avatarUrl}
                            alt={member.name}
                            className="w-4 h-4 rounded-full border border-black object-cover"
                          />
                        ) : (
                          <div className="w-4 h-4 rounded-full bg-accent-yellow border border-black flex items-center justify-center font-cursive text-[8px] font-bold">
                            {member.name.charAt(0)}
                          </div>
                        )}
                        <span className="truncate">{member.name}</span>
                      </div>
                      {isChecked && <Check className="h-3.5 w-3.5 text-tertiary flex-shrink-0" />}
                    </button>
                  );
                })}
              </div>
            )}
          </div>

          {/* Labels Filter */}
          <div className="relative">
            <button
              onClick={() => toggleDropdown("label")}
              className={`flex items-center gap-1.5 bg-white border-2 border-black rounded-full px-3 py-1.5 font-sans text-xs font-bold shadow-flat-offset-sm hover:-translate-y-0.5 active:translate-y-0.5 transition-all cursor-pointer ${
                activeFilters.labelIds.length > 0 ? "bg-accent-yellow/20" : ""
              }`}
            >
              <span>Labels</span>
              {activeFilters.labelIds.length > 0 && (
                <span className="bg-black text-white text-[9px] px-1.5 py-0.2 rounded-full font-bold">
                  {activeFilters.labelIds.length}
                </span>
              )}
              <ChevronDown className="h-3 w-3" />
            </button>
            {openDropdown === "label" && (
              <div className="absolute left-0 mt-2 w-56 bg-white border-2 border-black rounded-sketchy-sm shadow-flat-offset z-50 p-2 flex flex-col gap-1 max-h-60 overflow-y-auto">
                {labels.length === 0 ? (
                  <span className="text-[10px] text-secondary/60 italic p-2 block text-center">No labels created yet</span>
                ) : (
                  labels.map((label) => {
                    const isChecked = activeFilters.labelIds.includes(label.id);
                    return (
                      <button
                        key={label.id}
                        onClick={() => toggleLabel(label.id)}
                        className="w-full flex items-center justify-between px-2 py-1.5 text-left hover:bg-neutral-bg rounded-md text-xs font-bold font-sans cursor-pointer gap-2"
                      >
                        <div className="flex items-center gap-2 overflow-hidden">
                          <span
                            className="w-2.5 h-2.5 rounded-full border border-black/40 flex-shrink-0"
                            style={{ backgroundColor: label.color }}
                          />
                          <span className="truncate">{label.name}</span>
                        </div>
                        {isChecked && <Check className="h-3.5 w-3.5 text-tertiary flex-shrink-0" />}
                      </button>
                    );
                  })
                )}
              </div>
            )}
          </div>

          {/* Clear Button */}
          {hasActiveFilters && (
            <button
              onClick={handleClearAll}
              className="flex items-center gap-1 bg-accent-pink hover:bg-[#FFB2B2] text-primary border-2 border-black font-sans text-[10px] font-bold px-3 py-1.5 rounded-full shadow-flat-offset-sm active:translate-y-0.5 hover:-translate-y-0.5 transition-all cursor-pointer"
            >
              <X className="h-3 w-3" />
              Clear Filters
            </button>
          )}
        </div>

        {/* Right Side: Saved Views */}
        <div className="flex items-center gap-3">
          {activeViewName && (
            <div className="flex items-center gap-1 bg-accent-green/20 border border-black/25 text-primary text-[10px] font-bold px-3 py-1.5 rounded-full">
              <span>View: {activeViewName}</span>
            </div>
          )}

          {/* Saved Views Dropdown */}
          <div className="relative">
            <button
              onClick={() => toggleDropdown("views")}
              className="flex items-center gap-1.5 bg-white border-2 border-black rounded-full px-3 py-1.5 font-sans text-xs font-bold shadow-flat-offset-sm hover:-translate-y-0.5 active:translate-y-0.5 transition-all cursor-pointer"
            >
              <span>Saved Views</span>
              <ChevronDown className="h-3 w-3" />
            </button>
            {openDropdown === "views" && (
              <div className="absolute right-0 mt-2 w-64 bg-white border-2 border-black rounded-sketchy-sm shadow-flat-offset z-50 p-2 flex flex-col gap-1 max-h-60 overflow-y-auto">
                <div className="border-b border-black/10 pb-1.5 mb-1.5">
                  <button
                    onClick={() => {
                      setShowSaveInput(true);
                      setOpenDropdown(null);
                    }}
                    className="w-full flex items-center justify-center gap-1 px-2.5 py-1.5 text-xs font-bold font-sans bg-accent-yellow hover:bg-[#FFE680] border-2 border-black rounded-full shadow-flat-offset-sm active:translate-y-0.5 hover:-translate-y-0.5 transition-all cursor-pointer"
                  >
                    <Save className="h-3 w-3" />
                    Save Current Filters
                  </button>
                </div>
                {savedViews.length === 0 ? (
                  <span className="text-[10px] text-secondary/60 italic p-2 block text-center">No saved views</span>
                ) : (
                  savedViews.map((view) => (
                    <div
                      key={view.id}
                      className="w-full flex items-center justify-between hover:bg-neutral-bg rounded-md px-2 py-1 text-left gap-2 group"
                    >
                      <button
                        onClick={() => {
                          onFiltersChange(view.filters as FiltersState);
                          if (onClearViewName) onClearViewName();
                          // Load view logic: Parent component handles view name setting via key or passing
                          setOpenDropdown(null);
                          // Note: Parent component maps view name
                        }}
                        className="flex-grow text-left text-xs font-bold font-sans truncate py-1.5 cursor-pointer"
                      >
                        {view.name}
                      </button>
                      <button
                        onClick={async (e) => {
                          e.stopPropagation();
                          if (confirm(`Delete saved view "${view.name}"?`)) {
                            await onDeleteView(view.id);
                          }
                        }}
                        className="text-secondary/40 hover:text-accent-pink p-1 cursor-pointer transition-colors"
                        title="Delete saved view"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  ))
                )}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Save View Inline Modal */}
      {showSaveInput && (
        <div className="border-t border-black/10 pt-3 mt-1 flex flex-col gap-2">
          <form onSubmit={handleSubmit(onSaveViewSubmit)} className="flex flex-col gap-2">
            <div className="flex gap-2 items-center">
              <input
                type="text"
                {...register("name")}
                placeholder="Saved view name (e.g. My Tasks)"
                className={`flex-grow px-3 py-1.5 border-2 border-black rounded-sketchy-sm font-sans text-xs bg-white focus:outline-none focus:ring-2 focus:ring-tertiary ${
                  errors.name ? "border-rose-500 bg-rose-50/20" : ""
                }`}
              />
              <button
                type="submit"
                disabled={isSavingView}
                className="flex items-center gap-1 px-4 py-2 bg-tertiary hover:bg-tertiary-hover text-white font-sans text-xs font-bold border-2 border-black rounded-full shadow-flat-offset-sm active:translate-y-0.5 hover:-translate-y-0.5 transition-all cursor-pointer disabled:opacity-40"
              >
                Save View
              </button>
              <button
                type="button"
                onClick={() => {
                  setShowSaveInput(false);
                  reset();
                  setSaveError("");
                }}
                className="p-2 border-2 border-black bg-white hover:bg-neutral-bg rounded-full shadow-flat-offset-sm active:translate-y-0.5 hover:-translate-y-0.5 transition-all cursor-pointer"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            </div>
            {errors.name && (
              <span aria-live="polite" className="text-xs font-mono font-bold text-rose-600 mt-1 block">
                {errors.name.message}
              </span>
            )}
          </form>
          {saveError && (
            <span className="text-[10px] text-accent-pink font-semibold mt-1 block">
              {saveError}
            </span>
          )}
        </div>
      )}
    </div>
  );
}
