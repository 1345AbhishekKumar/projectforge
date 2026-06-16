"use client";

import React from "react";
import { CheckCircle2, Plus } from "lucide-react";
import type { TaskStatus } from "@/types";

type Props = {
  title: string;
  status: TaskStatus;
  itemsCount: number;
  dragOverCounters: Record<TaskStatus, number>;
  handleDragOverColumn: (e: React.DragEvent) => void;
  handleDragEnterColumn: (e: React.DragEvent, status: TaskStatus) => void;
  handleDragLeaveColumn: (e: React.DragEvent, status: TaskStatus) => void;
  handleDrop: (e: React.DragEvent, status: TaskStatus, targetTaskId?: string) => void;
  openCreateTaskAtStatus: (status: TaskStatus) => void;
  children: React.ReactNode;
};

export function KanbanColumn({
  title,
  status,
  itemsCount,
  dragOverCounters,
  handleDragOverColumn,
  handleDragEnterColumn,
  handleDragLeaveColumn,
  handleDrop,
  openCreateTaskAtStatus,
  children,
}: Props) {
  const isDragOver = dragOverCounters[status] > 0;

  return (
    <div
      onDragOver={handleDragOverColumn}
      onDragEnter={(e) => handleDragEnterColumn(e, status)}
      onDragLeave={(e) => handleDragLeaveColumn(e, status)}
      onDrop={(e) => handleDrop(e, status)}
      onDoubleClick={() => openCreateTaskAtStatus(status)}
      className={`bg-white border-2 border-black rounded-sketchy p-5 shadow-flat-offset-sm flex flex-col gap-4 min-h-[500px] transition-all duration-150 relative ${
        isDragOver ? "bg-accent-yellow/10 border-dashed border-tertiary translate-y-0.5 shadow-none" : ""
      }`}
    >
      {/* Column Header */}
      <div className="flex items-center justify-between border-b-2 border-black pb-2 mb-2 select-none">
        <h3 className="font-cursive text-2xl font-bold flex items-center gap-2">
          {status === "DONE" && <CheckCircle2 className="h-5 w-5 text-accent-green" />}
          {title}
        </h3>
        <div className="flex items-center gap-2">
          <span className="bg-neutral-bg border-2 border-black text-xs font-bold px-2 py-0.5 rounded-full">
            {itemsCount}
          </span>
          <button
            onClick={(e) => {
              e.stopPropagation();
              openCreateTaskAtStatus(status);
            }}
            className="p-1 rounded-full border border-black/20 hover:border-black hover:bg-neutral-bg transition-colors"
            title={`Create task in ${title}`}
          >
            <Plus className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>

      {/* Column Cards List */}
      <div className="flex flex-col gap-4 flex-grow">
        {itemsCount === 0 ? (
          <div className="flex-grow flex flex-col items-center justify-center border-2 border-dashed border-black/10 rounded-sketchy-sm p-8 bg-neutral-bg/20 select-none">
            <p className="font-sans text-xs text-secondary/60 italic text-center">
              Drop tasks here or double-click to create
            </p>
          </div>
        ) : (
          children
        )}
      </div>
    </div>
  );
}
