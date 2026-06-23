"use client";

import React from "react";
import { CheckCircle2, Loader2, Play } from "lucide-react";
import { UserAvatar } from "@/components/ui/UserAvatar";
import type { Sprint, SprintStatus } from "@/types";
import type { TaskWithAssignee } from "@/actions/task";

type Props = {
  title: string;
  sprintType: "ACTIVE" | "PLANNED" | "COMPLETED";
  sprintsCount: number;
  sprintsList: Sprint[];
  tasks: TaskWithAssignee[];
  isAuthorized: boolean;
  actionLoadingId: string | null;
  handleStatusTransition: (sprintId: string, status: SprintStatus) => void;
  handleAssignTaskToSprint?: (taskId: string, targetSprintId: string | null) => void;
  openDetails: (task: TaskWithAssignee) => void;
};

export function SprintColumn({
  title,
  sprintType,
  sprintsCount,
  sprintsList,
  tasks,
  isAuthorized,
  actionLoadingId,
  handleStatusTransition,
  handleAssignTaskToSprint,
  openDetails,
}: Props) {
  return (
    <div
      className={`bg-white border-2 border-black rounded-sketchy p-6 shadow-flat-offset-sm flex flex-col gap-4 ${
        sprintType === "COMPLETED" ? "bg-white/40 border-dashed" : ""
      }`}
    >
      <div className={`flex items-center justify-between border-b pb-2 ${sprintType === "COMPLETED" ? "border-black/10 pb-2 mb-1" : "border-black"}`}>
        <h2 className={`font-cursive text-2xl font-bold ${sprintType === "COMPLETED" ? "text-secondary" : ""}`}>{title}</h2>
        <span
          className={`border-2 border-black text-[10px] font-bold px-2 py-0.5 rounded-full uppercase ${
            sprintType === "ACTIVE"
              ? "bg-accent-green"
              : sprintType === "PLANNED"
              ? "bg-accent-yellow"
              : "bg-neutral-bg text-secondary border-black/10"
          }`}
        >
          {sprintsCount} {sprintType.toLowerCase()}
        </span>
      </div>

      {sprintsCount === 0 ? (
        <div className="text-center py-8 bg-neutral-bg/30 border-2 border-dashed border-black/10 rounded-sketchy-sm">
          <p className="font-sans text-sm text-secondary italic">
            {sprintType === "ACTIVE"
              ? "No active sprint is running right now."
              : sprintType === "PLANNED"
              ? "No planned sprints yet."
              : "No completed sprints yet."}
          </p>
        </div>
      ) : (
        <div className={`flex flex-col gap-4 ${sprintType === "PLANNED" || sprintType === "COMPLETED" ? "grid grid-cols-1 md:grid-cols-2 gap-4" : ""}`}>
          {sprintsList.map((sprint) => {
            const sprintTasks = tasks.filter((t) => t.sprint_id === sprint.id);
            const completedTasksCount = sprintTasks.filter((t) => t.status === "DONE").length;

            if (sprintType === "ACTIVE") {
              return (
                <div key={sprint.id} className="border-2 border-black rounded-sketchy-sm p-4 bg-accent-blue/10 flex flex-col gap-3">
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <h3 className="font-cursive text-xl font-bold">{sprint.name}</h3>
                      {sprint.goal && <p className="font-sans text-xs text-secondary mb-1">Goal: {sprint.goal}</p>}
                       <p className="font-sans text-[10px] text-secondary/70" suppressHydrationWarning>
                        Timeline: {new Date(sprint.start_date).toLocaleDateString()} - {new Date(sprint.end_date).toLocaleDateString()}
                      </p>
                    </div>

                    {isAuthorized && (
                      <button
                        onClick={() => handleStatusTransition(sprint.id, "COMPLETED")}
                        disabled={actionLoadingId === sprint.id}
                        className="flex items-center gap-1 py-1 px-3 bg-accent-green hover:bg-[#B5E6C0] text-primary border-2 border-black rounded-full font-sans text-[10px] font-bold shadow-flat-offset-xs active:translate-y-0.5 hover:-translate-y-0.5 transition-all cursor-pointer disabled:opacity-40"
                      >
                        {actionLoadingId === sprint.id ? (
                          <Loader2 className="h-3.5 w-3.5 animate-spin" />
                        ) : (
                          <CheckCircle2 className="h-3.5 w-3.5" />
                        )}
                        Complete Sprint
                      </button>
                    )}
                  </div>

                  {/* Progress Bar */}
                  <div className="flex flex-col gap-1">
                    <div className="flex items-center justify-between text-[10px] font-bold">
                      <span>Task Progress</span>
                      <span>{completedTasksCount} / {sprintTasks.length} Done</span>
                    </div>
                    <div className="w-full bg-neutral-dot border-2 border-black rounded-full h-3 overflow-hidden relative">
                      <div
                        className="bg-accent-green h-full border-r-2 border-black transition-all duration-300"
                        style={{ width: `${sprintTasks.length ? (completedTasksCount / sprintTasks.length) * 100 : 0}%` }}
                      />
                    </div>
                  </div>

                  {/* Task list in active sprint */}
                  <div className="flex flex-col gap-2 mt-2">
                    <label className="font-sans text-[10px] font-bold text-secondary uppercase">Tasks</label>
                    {sprintTasks.length === 0 ? (
                      <p className="font-sans text-xs text-secondary/60 italic">No tasks assigned to this active sprint.</p>
                    ) : (
                      <div className="flex flex-col gap-1.5 max-h-48 overflow-y-auto pr-1">
                        {sprintTasks.map((task) => (
                          <div
                            key={task.id}
                            onClick={() => openDetails(task)}
                            className="flex items-center justify-between p-2.5 border border-black/20 rounded-sketchy-sm bg-white hover:bg-neutral-bg/30 transition-all cursor-pointer shadow-flat-offset-xs hover:-translate-y-0.5 active:translate-y-0"
                          >
                            <span className="font-sans text-xs font-bold truncate flex-1">{task.title}</span>
                            <div className="flex items-center gap-1.5 flex-shrink-0">
                              <UserAvatar
                                avatarUrl={task.assignee?.avatar_url}
                                fullName={task.assignee?.full_name}
                                email={task.assignee?.email}
                                size="xs"
                                className="border border-black"
                              />
                              <span className={`text-[8px] font-bold px-1.5 py-0.5 rounded border border-black ${
                                task.status === "DONE" ? "bg-accent-green" : task.status === "IN_PROGRESS" ? "bg-accent-blue" : "bg-white"
                              }`}>{task.status}</span>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              );
            }

            if (sprintType === "PLANNED") {
              return (
                <div key={sprint.id} className="border-2 border-black rounded-sketchy-sm p-4 bg-accent-yellow/5 flex flex-col gap-3 hover:rotate-[0.5deg] transition-all">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <h3 className="font-cursive text-lg font-bold">{sprint.name}</h3>
                      {sprint.goal && <p className="font-sans text-xs text-secondary/80 line-clamp-1">Goal: {sprint.goal}</p>}
                       <p className="font-sans text-[10px] text-secondary/60" suppressHydrationWarning>
                        Timeline: {new Date(sprint.start_date).toLocaleDateString()} - {new Date(sprint.end_date).toLocaleDateString()}
                      </p>
                    </div>

                    {isAuthorized && (
                      <button
                        onClick={() => handleStatusTransition(sprint.id, "ACTIVE")}
                        disabled={actionLoadingId === sprint.id}
                        className="flex items-center gap-1 py-1 px-2.5 bg-accent-yellow hover:bg-[#FFE680] text-primary border-2 border-black rounded-full font-sans text-[9px] font-bold shadow-flat-offset-xs active:translate-y-0.5 hover:-translate-y-0.5 transition-all cursor-pointer disabled:opacity-40 flex-shrink-0"
                        title="Start Sprint"
                      >
                        {actionLoadingId === sprint.id ? (
                          <Loader2 className="h-3 w-3 animate-spin" />
                        ) : (
                          <Play className="h-3 w-3 fill-current" />
                        )}
                        Start
                      </button>
                    )}
                  </div>

                  <div className="border-t border-black/10 pt-2 flex flex-col gap-2">
                    <div className="flex justify-between items-center text-[10px] font-bold">
                      <span>Scope: {sprintTasks.length} tasks</span>
                    </div>

                    {/* List tasks inside planned sprint */}
                    <div className="flex flex-col gap-1 max-h-32 overflow-y-auto pr-1">
                      {sprintTasks.map((task) => (
                        <div
                          key={task.id}
                          onClick={() => openDetails(task)}
                          className="flex items-center justify-between p-2 border border-black/10 bg-white hover:bg-neutral-bg/30 text-secondary hover:text-primary rounded cursor-pointer transition-all gap-2 truncate"
                        >
                          <span className="font-sans text-[11px] truncate flex-1">{task.title}</span>
                          {handleAssignTaskToSprint && (
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                handleAssignTaskToSprint(task.id, null);
                              }}
                              className="text-[9px] text-secondary hover:text-accent-pink hover:font-bold bg-neutral-bg hover:bg-white border border-black/10 rounded px-1 flex-shrink-0 cursor-pointer"
                              title="Remove from Sprint"
                            >
                              Remove
                            </button>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              );
            }

            // Completed Sprints
            return (
              <div key={sprint.id} className="border border-black/20 bg-white opacity-75 rounded-sketchy-sm p-4 flex flex-col gap-2">
                <h3 className="font-cursive text-lg font-bold text-secondary flex items-center gap-1.5">
                  {sprint.name}
                  <span
                    className={`text-[8px] px-1.5 py-0.2 border rounded-full font-bold ${
                      sprint.status === "COMPLETED" ? "bg-accent-green border-black/20" : "bg-neutral-bg border-black/10"
                    }`}
                  >
                    {sprint.status.toLowerCase()}
                  </span>
                </h3>
                 <p className="font-sans text-[10px] text-secondary/60" suppressHydrationWarning>
                  Timeline: {new Date(sprint.start_date).toLocaleDateString()} - {new Date(sprint.end_date).toLocaleDateString()}
                </p>
                <span className="font-sans text-[10px] font-bold text-secondary">
                  Completed {sprintTasks.filter((t) => t.status === "DONE").length} / {sprintTasks.length} tasks
                </span>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
