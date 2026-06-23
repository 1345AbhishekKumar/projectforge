"use client";

import React from "react";
import { Calendar } from "lucide-react";
import type { TaskPriority } from "@/types";
import type { TaskWithAssignee } from "@/actions/task";
import { UserAvatar } from "@/components/ui/UserAvatar";
import { PriorityBadge } from "@/components/ui/PriorityBadge";

type Props = {
  task: TaskWithAssignee;
  onClick: () => void;
  onStatusToggle: (task: TaskWithAssignee) => void;
};

export function TaskRow({ task, onClick, onStatusToggle }: Props) {
  const isOverdue = task.due_date && new Date(task.due_date) < new Date() && task.status !== "DONE";



  const statusChecked = task.status === "DONE";

  const formattedDate = task.due_date
    ? new Date(task.due_date).toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
      })
    : null;

  return (
    <div
      className="flex items-center justify-between p-4 border-2 border-black rounded-sketchy bg-white hover:bg-neutral-bg/30 transition-all duration-200 shadow-flat-offset-sm hover:-translate-y-0.5 cursor-pointer gap-4"
      onClick={onClick}
    >
      <div className="flex items-center gap-3 min-w-0" onClick={(e) => e.stopPropagation()}>
        {/* Custom Checkbox */}
        <button
          onClick={() => onStatusToggle(task)}
          className="w-5 h-5 border-2 border-black rounded-sm flex items-center justify-center cursor-pointer transition-all active:scale-95 bg-white shrink-0"
          aria-label={statusChecked ? "Mark task as todo" : "Mark task as done"}
        >
          {statusChecked && (
            <span className="font-sans text-sm font-bold text-primary">✓</span>
          )}
        </button>

        {/* Task Title */}
        <span
          className={`font-sans text-sm font-semibold truncate ${
            statusChecked ? "line-through text-secondary/50" : "text-primary"
          }`}
        >
          {task.title}
        </span>
      </div>

      <div className="flex items-center gap-3 shrink-0" onClick={(e) => e.stopPropagation()}>
        {/* Label Badges */}
        {task.labels && task.labels.map((label) => (
          <span
            key={label.id}
            style={{ backgroundColor: label.color }}
            className="text-[9px] font-bold px-2 py-0.5 rounded-full border border-black/40 text-primary truncate max-w-[80px]"
            title={label.name}
          >
            {label.name}
          </span>
        ))}

        {/* Priority Badge */}
        <PriorityBadge priority={task.priority} size="sm" />

        {/* Due Date & Overdue Warning */}
        {formattedDate && (
          <div
            className={`flex items-center gap-1 text-[10px] px-2 py-0.5 rounded-full border-2 border-black font-sans font-semibold ${
              isOverdue
                ? "bg-accent-pink text-primary animate-pulse"
                : "bg-neutral-bg text-secondary"
            }`}
            title={isOverdue ? "Overdue task!" : "Due date"}
          >
            <Calendar className="h-3 w-3 shrink-0" />
            <span suppressHydrationWarning>{formattedDate}</span>
          </div>
        )}

        {/* Assignee Avatar/Initials */}
        <UserAvatar
          avatarUrl={task.assignee?.avatar_url}
          fullName={task.assignee?.full_name}
          email={task.assignee?.email}
          size="md"
        />
      </div>
    </div>
  );
}
