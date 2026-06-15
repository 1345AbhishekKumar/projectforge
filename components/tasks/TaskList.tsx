"use client";

import React from "react";
import { TaskRow } from "./TaskRow";
import type { TaskWithAssignee } from "@/actions/task";
import type { TaskStatus } from "@/types";

type Props = {
  tasks: TaskWithAssignee[];
  onTaskClick: (task: TaskWithAssignee) => void;
  onStatusToggle: (task: TaskWithAssignee) => void;
};

export function TaskList({ tasks, onTaskClick, onStatusToggle }: Props) {
  const todoTasks = tasks.filter((t) => t.status === "TODO");
  const inProgressTasks = tasks.filter((t) => t.status === "IN_PROGRESS");
  const doneTasks = tasks.filter((t) => t.status === "DONE");

  const columns: { title: string; status: TaskStatus; items: TaskWithAssignee[]; color: string }[] = [
    { title: "To Do", status: "TODO", items: todoTasks, color: "bg-accent-yellow/20" },
    { title: "In Progress", status: "IN_PROGRESS", items: inProgressTasks, color: "bg-accent-blue/20" },
    { title: "Done", status: "DONE", items: doneTasks, color: "bg-accent-green/20" },
  ];

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
      {columns.map((col) => (
        <div
          key={col.status}
          className={`bg-white border-2 border-black rounded-sketchy p-5 shadow-flat-offset-sm flex flex-col gap-4 min-h-[300px] ${col.color}`}
        >
          {/* Column Header */}
          <div className="flex items-center justify-between border-b-2 border-black pb-2 mb-1">
            <h3 className="font-cursive text-xl font-bold">{col.title}</h3>
            <span className="bg-white border-2 border-black text-[10px] font-bold px-2 py-0.5 rounded-full shadow-flat-offset-sm">
              {col.items.length}
            </span>
          </div>

          {/* Column Items */}
          <div className="flex flex-col gap-3 flex-1">
            {col.items.length === 0 ? (
              <div className="flex-1 flex items-center justify-center border-2 border-dashed border-black/10 rounded-sketchy-sm p-6 bg-white/50">
                <p className="font-sans text-xs text-secondary/70 italic text-center">
                  No tasks in this stage
                </p>
              </div>
            ) : (
              col.items.map((task) => (
                <TaskRow
                  key={task.id}
                  task={task}
                  onClick={() => onTaskClick(task)}
                  onStatusToggle={onStatusToggle}
                />
              ))
            )}
          </div>
        </div>
      ))}
    </div>
  );
}
