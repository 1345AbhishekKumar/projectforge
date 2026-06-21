"use client";

import React from "react";

type DepartmentData = {
  id: string;
  name: string;
  parentDepartmentId: string | null;
  totalTasks: number;
  completedTasks: number;
  completionRate: number;
  cost: number;
};

type Props = {
  departmentsData: DepartmentData[];
  showCost: boolean;
};

export function DepartmentProductivityView({ departmentsData, showCost }: Props) {
  if (departmentsData.length === 0) {
    return (
      <div className="p-8 text-center border-2 border-black border-dashed rounded-sketchy bg-white text-secondary/60 italic text-sm">
        No departments defined in this organization workspace.
      </div>
    );
  }

  // Build department hierarchy helper
  const getParentName = (parentId: string | null) => {
    if (!parentId) return null;
    const parent = departmentsData.find((d) => d.id === parentId);
    return parent ? parent.name : null;
  };

  return (
    <div className="flex flex-col gap-6">
      <div className="bg-white border-2 border-black rounded-sketchy p-6 shadow-flat-offset rotate-[0.5deg]">
        <h3 className="text-xl font-bold font-cursive mb-4">Department Performance &amp; Costs</h3>
        <p className="text-secondary/70 text-xs mb-6">
          Track completed tasks, efficiency metrics, and cumulative cost allocations rolled up recursively across the department tree.
        </p>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {departmentsData.map((dept) => {
            const parentName = getParentName(dept.parentDepartmentId);

            // Determine productivity status color
            let statusBg = "bg-accent-pink";
            let statusText = "Needs Focus";
            if (dept.completionRate > 80) {
              statusBg = "bg-accent-green";
              statusText = "Highly Efficient";
            } else if (dept.completionRate >= 50) {
              statusBg = "bg-accent-yellow";
              statusText = "On Track";
            }

            return (
              <div
                key={dept.id}
                className="border-2 border-black rounded-sketchy p-5 flex gap-5 items-start shadow-flat-offset-sm bg-white hover:-translate-y-0.5 transition-transform"
              >
                {/* Hand-drawn styled gauge */}
                <div className="relative shrink-0 w-20 h-20 flex items-center justify-center bg-neutral-bg/30 rounded-full border border-black/10">
                  <svg className="w-full h-full transform -rotate-90" viewBox="0 0 36 36">
                    <circle cx="18" cy="18" r="16" fill="none" stroke="#E5E5E5" strokeWidth="2.5" />
                    <circle
                      cx="18"
                      cy="18"
                      r="16"
                      fill="none"
                      stroke={dept.completionRate > 80 ? "#D4EDDA" : dept.completionRate >= 50 ? "#FFF2B2" : "#FFD2D2"}
                      strokeWidth="3.5"
                      strokeDasharray={`${dept.completionRate}, 100`}
                      className="transition-all"
                    />
                  </svg>
                  <div className="absolute text-center flex flex-col justify-center items-center">
                    <span className="text-sm font-black font-sans leading-none">{dept.completionRate}%</span>
                    <span className="text-[7px] text-secondary/60 uppercase font-bold tracking-wider mt-0.5">done</span>
                  </div>
                </div>

                {/* Details */}
                <div className="flex-1 min-w-0">
                  <span className="font-cursive text-lg font-bold block truncate leading-snug">
                    {dept.name}
                  </span>
                  {parentName && (
                    <span className="text-[9px] font-semibold text-secondary/50 block mt-0.5 uppercase tracking-wide">
                      Sub-department of: {parentName}
                    </span>
                  )}

                  <div className="flex flex-wrap gap-2 mt-3">
                    <span
                      className={`inline-block px-2 py-0.5 rounded text-[9px] font-bold border border-black/30 font-sans ${statusBg}`}
                    >
                      {statusText}
                    </span>
                    <span className="inline-block px-2 py-0.5 rounded text-[9px] font-bold border border-black/30 bg-accent-blue/30 text-secondary font-sans">
                      {dept.completedTasks} / {dept.totalTasks} Tasks
                    </span>
                  </div>

                  {showCost && (
                    <div className="mt-4 border-t border-black/10 pt-3 flex items-center justify-between">
                      <span className="text-[9px] font-bold text-secondary uppercase tracking-wider">
                        Rolled Up Cost:
                      </span>
                      <span className="text-sm font-black text-primary font-sans">
                        ${dept.cost.toLocaleString()}
                      </span>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
