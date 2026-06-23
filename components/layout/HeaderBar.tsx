"use client";

import React from "react";

interface HeaderBarProps {
  title: React.ReactNode;
  description?: string;
  action?: React.ReactNode;
  icon?: React.ReactNode;
  className?: string;
}

export function HeaderBar({
  title,
  description,
  action,
  icon,
  className = "",
}: HeaderBarProps) {
  return (
    <div className={`bg-white border-2 border-black rounded-sketchy shadow-flat-offset p-6 flex flex-col md:flex-row md:items-center justify-between gap-4 ${className}`}>
      <div className="flex items-start gap-3">
        {icon && <div className="shrink-0">{icon}</div>}
        <div>
          <h1 className="font-cursive text-3xl font-bold mb-1 flex items-center gap-2">
            {title}
          </h1>
          {description && (
            <p className="font-sans text-xs text-secondary">
              {description}
            </p>
          )}
        </div>
      </div>
      {action && <div className="flex-shrink-0 self-start md:self-center">{action}</div>}
    </div>
  );
}
