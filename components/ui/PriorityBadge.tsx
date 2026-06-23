"use client";

import React from "react";
import type { TaskPriority } from "@/types";

interface PriorityBadgeProps {
  priority: TaskPriority;
  size?: "xs" | "sm" | "md";
  className?: string;
}

export function PriorityBadge({
  priority,
  size = "sm",
  className = "",
}: PriorityBadgeProps) {
  const priorityColors: Record<TaskPriority, string> = {
    LOW: "bg-white border border-black/20 text-secondary",
    MEDIUM: "bg-accent-blue/40 border-2 border-black text-primary",
    HIGH: "bg-accent-yellow border-2 border-black text-primary",
    URGENT: "bg-accent-pink border-2 border-black text-primary font-bold",
  };

  const sizeClasses = {
    xs: "text-[8px] px-1.5 py-0.5 rounded-full uppercase",
    sm: "text-[9px] font-bold px-2 py-0.5 rounded-full uppercase",
    md: "text-xs font-bold px-2.5 py-1 rounded-full uppercase",
  };

  return (
    <span className={`${priorityColors[priority]} ${sizeClasses[size]} ${className}`}>
      {priority}
    </span>
  );
}
