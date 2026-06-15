"use client";

import React from "react";
import Image from "next/image";
import { Calendar, User } from "lucide-react";
import type { TaskPriority } from "@/types";
import type { TaskWithAssignee } from "@/actions/task";

type Props = {
  task: TaskWithAssignee;
  onClick: () => void;
  onStatusToggle: (task: TaskWithAssignee) => void;
};

export function TaskRow({ task, onClick, onStatusToggle }: Props) {
  const isOverdue = task.due_date && new Date(task.due_date) < new Date() && task.status !== "DONE";

  const priorityColors: Record<TaskPriority, string> = {
    LOW: "bg-white border border-black/20 text-secondary",
    MEDIUM: "bg-accent-blue/40 border-2 border-black text-primary",
    HIGH: "bg-accent-yellow border-2 border-black text-primary",
    URGENT: "bg-accent-pink border-2 border-black text-primary font-bold",
  };

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
        {/* Priority Badge */}
        <span className={`text-[9px] font-bold px-2 py-0.5 rounded-full uppercase ${priorityColors[task.priority]}`}>
          {task.priority}
        </span>

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
            <span>{formattedDate}</span>
          </div>
        )}

        {/* Assignee Avatar/Initials */}
        <div className="w-7 h-7 rounded-full border-2 border-black bg-white flex items-center justify-center overflow-hidden shrink-0 relative">
          {task.assignee ? (
            task.assignee.avatar_url ? (
              <Image
                src={task.assignee.avatar_url}
                alt={task.assignee.full_name || "Assignee"}
                width={28}
                height={28}
                unoptimized
                className="w-full h-full object-cover"
              />
            ) : (
              <span className="font-cursive font-bold text-xs text-primary">
                {(task.assignee.full_name || task.assignee.email).charAt(0).toUpperCase()}
              </span>
            )
          ) : (
            <User className="h-3.5 w-3.5 text-secondary/50" />
          )}
        </div>
      </div>
    </div>
  );
}
