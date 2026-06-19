"use client";

import React from "react";
import { Plus, ClipboardList, Loader2 } from "lucide-react";
import { TaskFilters, type FiltersState } from "@/components/tasks/TaskFilters";
import { TaskList } from "@/components/tasks/TaskList";
import type { Label, SavedView, TaskStatus } from "@/types";
import type { TaskWithAssignee } from "@/actions/task";
import type { MemberListItem } from "@/actions/membership";

interface BacklogTabProps {
  members: MemberListItem[];
  labels: Label[];
  savedViews: SavedView[];
  activeFilters: FiltersState;
  activeViewName: string;
  loadingTasks: boolean;
  filteredTasks: TaskWithAssignee[];
  onFiltersChange: (filters: FiltersState) => void;
  onSaveView: (name: string) => Promise<{ success: boolean; error?: string }>;
  onDeleteView: (viewId: string) => Promise<{ success: boolean; error?: string }>;
  onClearFilters: () => void;
  openCreateModal: (status: TaskStatus) => void;
  openDetails: (task: TaskWithAssignee) => void;
  handleStatusToggle: (task: TaskWithAssignee) => void;
}

export function BacklogTab({
  members,
  labels,
  savedViews,
  activeFilters,
  activeViewName,
  loadingTasks,
  filteredTasks,
  onFiltersChange,
  onSaveView,
  onDeleteView,
  onClearFilters,
  openCreateModal,
  openDetails,
  handleStatusToggle,
}: BacklogTabProps) {
  return (
    <div className="flex flex-col gap-6">
      {/* Toolbar */}
      <div className="flex flex-col gap-4">
        <div className="flex items-center justify-between">
          <h2 className="font-cursive text-2xl font-bold">Project Backlog</h2>
          <button
            onClick={() => openCreateModal("TODO")}
            className="flex items-center justify-center gap-1.5 bg-accent-yellow hover:bg-[#FFE680] text-primary border-2 border-black font-sans text-xs font-bold px-4 py-2 rounded-full shadow-flat-offset-sm active:translate-y-0.5 hover:-translate-y-0.5 transition-all cursor-pointer"
          >
            <Plus className="h-4 w-4" />
            Create Task
          </button>
        </div>

        <TaskFilters
          members={members}
          labels={labels}
          savedViews={savedViews}
          activeFilters={activeFilters}
          onFiltersChange={onFiltersChange}
          onSaveView={onSaveView}
          onDeleteView={onDeleteView}
          activeViewName={activeViewName}
          onClearViewName={onClearFilters}
        />
      </div>

      {loadingTasks ? (
        <div className="bg-white border-2 border-black rounded-sketchy shadow-flat-offset p-12 flex items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-tertiary mr-3" />
          <span className="font-cursive text-xl">Loading backlog...</span>
        </div>
      ) : filteredTasks.length === 0 ? (
        <div className="bg-white border-2 border-black rounded-sketchy shadow-flat-offset p-8 md:p-12 text-center max-w-lg mx-auto">
          <div className="w-16 h-16 rounded-full bg-accent-yellow border-2 border-black flex items-center justify-center mx-auto mb-4 rotate-[1.5deg] shadow-flat-offset-sm">
            <ClipboardList className="h-8 w-8 text-primary" />
          </div>
          <h3 className="font-cursive text-2xl font-bold mb-2">No Tasks Match Filters</h3>
          <p className="font-sans text-sm text-secondary mb-6 leading-relaxed">
            We couldn&apos;t find any tasks mapping to your current filter specification. Try clearing filters or creating a task.
          </p>
          <button
            onClick={onClearFilters}
            className="bg-accent-yellow hover:bg-[#FFE680] text-primary border-2 border-black font-sans text-xs font-bold px-5 py-2 rounded-full shadow-flat-offset-sm active:translate-y-0.5 hover:-translate-y-0.5 transition-all cursor-pointer"
          >
            Clear Filters
          </button>
        </div>
      ) : (
        <TaskList
          tasks={filteredTasks}
          onTaskClick={openDetails}
          onStatusToggle={handleStatusToggle}
        />
      )}
    </div>
  );
}
