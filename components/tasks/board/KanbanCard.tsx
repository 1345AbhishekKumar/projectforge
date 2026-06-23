"use client";

import React from "react";
import { Calendar } from "lucide-react";
import type { TaskWithAssignee } from "@/actions/task";
import type { Sprint, TaskStatus } from "@/types";
import { UserAvatar } from "@/components/ui/UserAvatar";
import { PriorityBadge } from "@/components/ui/PriorityBadge";

type Props = {
  task: TaskWithAssignee;
  sprints: Sprint[];
  draggedTaskId: string | null;
  priorityColors: Record<string, string>;
  priorityStickyColors: Record<string, string>;
  getRotation: (id: string) => string;
  handleDragStart: (e: React.DragEvent, taskId: string) => void;
  handleDragEnd: () => void;
  handleDrop: (e: React.DragEvent, status: TaskStatus, targetTaskId?: string) => void;
  openDetails: (task: TaskWithAssignee) => void;
  colStatus: TaskStatus;
};

// Dummy helper so React dragover doesn't trigger card reordering conflicts
const handleDragOverCard = (e: React.DragEvent) => {
  e.preventDefault();
};

export const KanbanCard = React.memo(function KanbanCard({
  task,
  sprints,
  draggedTaskId,
  priorityColors,
  priorityStickyColors,
  getRotation,
  handleDragStart,
  handleDragEnd,
  handleDrop,
  openDetails,
  colStatus,
}: Props) {
  const isOverdue = task.due_date && new Date(task.due_date) < new Date() && task.status !== "DONE";
  const formattedDate = task.due_date
    ? new Date(task.due_date).toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
      })
    : null;

  // Verify if task belongs to a completed sprint
  const isLocked = task.sprint_id && sprints.find((s) => s.id === task.sprint_id)?.status === "COMPLETED";

  return (
    <div
      draggable={!isLocked}
      onDragStart={(e) => handleDragStart(e, task.id)}
      onDragEnd={handleDragEnd}
      onDragOver={handleDragOverCard}
      onDrop={(e) => handleDrop(e, colStatus, task.id)}
      onClick={() => openDetails(task)}
      style={{ transform: getRotation(task.id) }}
      className={`p-5 border-2 border-black rounded-sketchy-sm cursor-grab active:cursor-grabbing transition-all duration-150 select-none relative ${
        priorityStickyColors[task.priority]
      } ${draggedTaskId === task.id ? "opacity-30 border-dashed border-black/40 scale-95" : ""}`}
    >
      {/* Locked Badge */}
      {isLocked && (
        <div className="absolute top-2 right-2 bg-neutral-bg border border-black/20 rounded-full p-1" title="Sprint completed - locked">
          <span className="text-[8px] font-bold text-secondary">🔒</span>
        </div>
      )}

      {/* Label Badges */}
      {task.labels && task.labels.length > 0 && (
        <div className="flex flex-wrap gap-1 mb-2">
          {task.labels.map((label) => (
            <span
              key={label.id}
              style={{ backgroundColor: label.color }}
              className="text-[8px] font-bold px-1.5 py-0.5 rounded-full border border-black/30 text-primary truncate max-w-[70px]"
              title={label.name}
            >
              {label.name}
            </span>
          ))}
        </div>
      )}

      {/* Task Title */}
      <h4 className={`font-sans font-bold text-sm leading-tight mb-2 tracking-tight ${
        task.status === "DONE" ? "line-through text-secondary/50" : ""
      }`}>
        {task.title}
      </h4>

      {/* Description Snippet */}
      {task.description && (
        <p className="font-sans text-xs text-secondary/80 line-clamp-2 mb-3 leading-snug">
          {task.description}
        </p>
      )}

      {/* Footer Meta Row */}
      <div className="flex items-center justify-between mt-auto pt-3 border-t border-black/10 gap-2">
        <div className="flex items-center gap-1.5 flex-wrap">
          {/* Priority Badge */}
          <PriorityBadge priority={task.priority} size="xs" />

          {/* Due Date Indicator */}
          {formattedDate && (
            <span 
              suppressHydrationWarning
              className={`flex items-center gap-0.5 text-[9px] px-1.5 py-0.5 rounded-full border border-black font-sans font-bold ${
                isOverdue
                  ? "bg-accent-pink text-primary animate-pulse"
                  : "bg-white text-secondary"
              }`}
            >
              <Calendar className="h-2.5 w-2.5 shrink-0" />
              {formattedDate}
            </span>
          )}
        </div>

        {/* Assignee Avatar */}
        <UserAvatar
          avatarUrl={task.assignee?.avatar_url}
          fullName={task.assignee?.full_name}
          email={task.assignee?.email}
          size="sm"
        />
      </div>
    </div>
  );
});
