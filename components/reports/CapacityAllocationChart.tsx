"use client";

import React from "react";
import Image from "next/image";

type Props = {
  capacityData: {
    userId: string;
    name: string;
    email: string;
    avatarUrl: string | null;
    role: string;
    totalAllocatedPercentage: number;
    allocatedWeeklyCost: number;
    allocations: {
      projectId: string;
      projectName: string;
      percentage: number;
    }[];
  }[];
  showCost: boolean;
};

export function CapacityAllocationChart({ capacityData, showCost }: Props) {
  if (capacityData.length === 0) {
    return (
      <div className="p-8 text-center border-2 border-black border-dashed rounded-sketchy bg-white text-secondary/60 italic text-sm">
        No resource allocations found in this workspace.
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="bg-white border-2 border-black rounded-sketchy p-6 shadow-flat-offset rotate-[-0.5deg]">
        <h3 className="text-xl font-bold font-cursive mb-4">Resource Allocation Overview</h3>
        <p className="text-secondary/70 text-xs mb-6">
          Monitor your team members&apos; active allocations across different projects and track weekly resource costs.
        </p>

        <div className="flex flex-col gap-6">
          {capacityData.map((cap) => {
            const isOverCapacity = cap.totalAllocatedPercentage > 100;
            const remaining = Math.max(0, 100 - cap.totalAllocatedPercentage);

            return (
              <div
                key={cap.userId}
                className="border-2 border-black rounded-sketchy p-5 flex flex-col md:flex-row md:items-center justify-between gap-6 shadow-flat-offset-sm hover:-translate-y-0.5 transition-transform bg-white"
              >
                {/* User Profile */}
                <div className="flex items-center gap-3 shrink-0 md:w-48">
                  {cap.avatarUrl ? (
                    <Image
                      src={cap.avatarUrl}
                      alt={cap.name}
                      width={40}
                      height={40}
                      className="w-10 h-10 rounded-full border-2 border-black object-cover"
                    />
                  ) : (
                    <div className="w-10 h-10 rounded-full border-2 border-black bg-neutral-bg flex items-center justify-center font-cursive font-bold text-secondary text-sm">
                      {cap.name.slice(0, 2).toUpperCase()}
                    </div>
                  )}
                  <div className="min-w-0">
                    <span className="font-cursive text-lg font-bold block truncate">{cap.name}</span>
                    <span className="text-[10px] text-secondary/70 capitalize">{cap.role.toLowerCase()}</span>
                  </div>
                </div>

                {/* Stacked Allocation Progress Bar */}
                <div className="flex-1 flex flex-col gap-1.5">
                  <div className="flex justify-between text-xs font-bold">
                    <span>Active Allocations</span>
                    <span className={isOverCapacity ? "text-accent-pink font-black" : ""}>
                      {cap.totalAllocatedPercentage}% allocated
                    </span>
                  </div>

                  {/* Multi-project stacked progress bar */}
                  <div className="w-full h-6 border-2 border-black rounded bg-neutral-bg overflow-hidden relative shadow-sm flex">
                    {cap.allocations.map((alloc, idx) => {
                      // Alternate pastel colors for different segments
                      const bgColors = ["bg-accent-blue", "bg-accent-purple", "bg-accent-yellow", "bg-accent-pink"];
                      const segmentBg = isOverCapacity ? "bg-accent-pink" : bgColors[idx % bgColors.length];

                      return (
                        <div
                          key={alloc.projectId}
                          className={`h-full border-r-2 border-black/30 last:border-r-0 ${segmentBg}`}
                          style={{ width: `${alloc.percentage}%` }}
                          title={`${alloc.projectName}: ${alloc.percentage}%`}
                        />
                      );
                    })}
                    {remaining > 0 && cap.allocations.length > 0 && (
                      <div className="h-full bg-neutral-bg" style={{ width: `${remaining}%` }} />
                    )}
                    {cap.allocations.length === 0 && (
                      <div className="w-full h-full bg-neutral-bg/60 flex items-center justify-center text-[10px] italic text-secondary/50">
                        Unallocated (0%)
                      </div>
                    )}
                  </div>

                  {/* Allocation Details */}
                  {cap.allocations.length > 0 && (
                    <div className="flex flex-wrap gap-2 mt-1">
                      {cap.allocations.map((alloc, idx) => {
                        const dotColors = ["bg-accent-blue", "bg-accent-purple", "bg-accent-yellow", "bg-accent-pink"];
                        const dotBg = dotColors[idx % dotColors.length];
                        return (
                          <div
                            key={alloc.projectId}
                            className="flex items-center gap-1 bg-neutral-bg/50 border border-black/20 rounded px-1.5 py-0.5 text-[9px] font-semibold text-secondary"
                          >
                            <span className={`w-1.5 h-1.5 rounded-full ${dotBg} border border-black/30`} />
                            <span>{alloc.projectName} ({alloc.percentage}%)</span>
                          </div>
                        );
                      })}
                    </div>
                  )}

                  {isOverCapacity && (
                    <span className="text-[10px] text-accent-pink font-bold flex items-center gap-1 mt-1 animate-pulse">
                      ⚠️ Over capacity warning (exceeds 100%)!
                    </span>
                  )}
                </div>

                {/* Costs & Financials */}
                {showCost && (
                  <div className="shrink-0 flex flex-col items-end md:w-32 border-l border-black/10 pl-6">
                    <span className="text-[10px] font-bold text-secondary uppercase tracking-wider">Weekly Cost</span>
                    <span className="text-xl font-black text-primary font-sans mt-0.5">
                      ${cap.allocatedWeeklyCost.toLocaleString()}
                    </span>
                    <span className="text-[9px] text-secondary/60">Estimated rate</span>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
