"use client";

import Image from "next/image";
import { User as UserIcon } from "lucide-react";
import type { MemberWorkload } from "@/actions/analytics";

type Props = {
  workload: MemberWorkload[];
};

export function WorkloadBreakdown({ workload }: Props) {
  return (
    <div className="bg-white border-2 border-black rounded-sketchy p-6 shadow-flat-offset flex flex-col gap-6 rotate-[0.5deg]">
      <div>
        <h3 className="font-cursive text-2xl font-bold mb-1">Workload Distribution</h3>
        <p className="font-sans text-xs text-secondary/70">
          Task mapping breakdown and status allocations per team member
        </p>
      </div>

      <div className="flex flex-col gap-6">
        {workload.length === 0 ? (
          <div className="text-center py-6 font-cursive text-secondary">
            No team workload recorded.
          </div>
        ) : (
          workload
            .sort((a, b) => b.total - a.total) // Show members with most tasks first
            .map((member) => {
              const completedPct = member.total > 0 ? (member.completed / member.total) * 100 : 0;
              const overduePct = member.total > 0 ? (member.overdue / member.total) * 100 : 0;
              const remainingPct = 100 - completedPct - overduePct;

              return (
                <div key={member.userId || "unassigned"} className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-black/10 pb-4 last:border-0 last:pb-0">
                  {/* User Profile Info */}
                  <div className="flex items-center gap-3 md:w-1/3 shrink-0">
                    <div className="w-9 h-9 rounded-full border-2 border-black bg-neutral-bg flex items-center justify-center overflow-hidden relative shadow-sm shrink-0">
                      {member.avatarUrl ? (
                        <Image
                          src={member.avatarUrl}
                          alt={member.name}
                          width={36}
                          height={36}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <UserIcon className="h-4 w-4 text-secondary/50" />
                      )}
                    </div>
                    <div className="min-w-0">
                      <span className="font-bold text-sm block font-sans truncate">{member.name}</span>
                      {member.email && (
                        <span className="text-[10px] text-secondary/60 block font-sans truncate">{member.email}</span>
                      )}
                    </div>
                  </div>

                  {/* Task numbers stats */}
                  <div className="flex items-center gap-4 text-xs font-semibold font-sans md:w-1/4 shrink-0 md:justify-end">
                    <div className="flex flex-col items-start md:items-end">
                      <span className="text-secondary/80">
                        Tasks: <span className="text-primary font-bold">{member.total}</span>
                      </span>
                      <span className="text-[10px] text-secondary/60 font-medium">
                        {member.completed} Completed • {member.overdue} Overdue
                      </span>
                    </div>
                  </div>

                  {/* Sketchy segment progress bar */}
                  <div className="flex-grow w-full md:max-w-md">
                    {member.total > 0 ? (
                      <div className="w-full h-5 border-2 border-black rounded-full overflow-hidden bg-white flex relative shadow-sm">
                        {completedPct > 0 && (
                          <div
                            style={{ width: `${completedPct}%` }}
                            className="bg-[#D4EDDA] border-r-2 border-black h-full transition-all duration-300"
                            title={`Completed: ${member.completed} tasks (${Math.round(completedPct)}%)`}
                          />
                        )}
                        {overduePct > 0 && (
                          <div
                            style={{ width: `${overduePct}%` }}
                            className="bg-[#FFD2D2] border-r-2 border-black h-full transition-all duration-300"
                            title={`Overdue: ${member.overdue} tasks (${Math.round(overduePct)}%)`}
                          />
                        )}
                        {remainingPct > 0 && (
                          <div
                            style={{ width: `${remainingPct}%` }}
                            className="bg-[#D0E1FD] h-full transition-all duration-300"
                            title={`In progress: ${member.total - member.completed - member.overdue} tasks (${Math.round(remainingPct)}%)`}
                          />
                        )}
                      </div>
                    ) : (
                      <div className="w-full h-5 border-2 border-black border-dashed rounded-full bg-neutral-bg/20 flex items-center justify-center text-[10px] text-secondary/40 font-sans italic select-none">
                        No tasks assigned
                      </div>
                    )}
                  </div>
                </div>
              );
            })
        )}
      </div>
    </div>
  );
}
