"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { useTranslation } from "@/lib/i18n/useTranslation";
import { updateTask } from "@/actions/taskMutation";
import { useTasks } from "@/hooks/useTasks";
import { useProjects } from "@/hooks/useProjects";
import { Check, Calendar } from "lucide-react";
import type { Task } from "@/types";

interface Props {
  orgId: string;
  userId: string;
}

export function MyTasks({ orgId, userId }: Props) {
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // 1. Fetch organization tasks
  const { data: tasks = [], isLoading: loadingTasks } = useTasks(orgId);

  // 2. Fetch projects for project name mapping
  const { data: projects = [], isLoading: loadingProjects } = useProjects(orgId);

  // 3. Mutation to complete task
  const completeTaskMutation = useMutation({
    mutationFn: async ({ taskId, projectId }: { taskId: string; projectId: string }) => {
      const res = await updateTask(taskId, projectId, orgId, { status: "DONE" });
      if (!res.success) throw new Error(res.error || "Failed to complete task");
      return res;
    },
    onSuccess: () => {
      // Invalidate related caches to update UI immediately
      queryClient.invalidateQueries({ queryKey: ["orgTasks", orgId] });
      queryClient.invalidateQueries({ queryKey: ["orgAnalytics", orgId] });
    },
    onError: (err: Error) => {
      setErrorMsg(err.message || "An error occurred");
      setTimeout(() => setErrorMsg(null), 4000);
    },
  });

  // Filter user's pending tasks
  const myPendingTasks = tasks.filter(
    (task) => task.assignee_id === userId && task.status !== "DONE"
  );

  const projectMap = new Map(projects.map((p) => [p.id, p.name]));

  // Get rotation and color based on priority
  const getStickyStyles = (priority: Task["priority"], index: number) => {
    // Deterministic rotations to make it look like scattered post-its
    const rotations = ["rotate-[-1.2deg]", "rotate-[1deg]", "rotate-[-0.8deg]", "rotate-[1.2deg]", "rotate-[-1deg]"];
    const rotation = rotations[index % rotations.length];

    let color = "bg-[#D0E1FD] hover:bg-[#C2D8FC]"; // LOW (Blue)
    if (priority === "MEDIUM") {
      color = "bg-[#D4EDDA] hover:bg-[#C6E9CE]"; // MEDIUM (Green)
    } else if (priority === "HIGH") {
      color = "bg-[#FFF2B2] hover:bg-[#FFEAA3]"; // HIGH (Yellow)
    } else if (priority === "URGENT") {
      color = "bg-[#FFD2D2] hover:bg-[#FFC4C4]"; // URGENT (Pink)
    }

    return `${rotation} ${color}`;
  };

  const isLoading = loadingTasks || loadingProjects;

  if (isLoading) {
    return (
      <div className="bg-white border-2 border-black rounded-sketchy shadow-flat-offset p-6 flex flex-col gap-4">
        <h2 className="font-cursive text-2xl font-bold border-b-2 border-black pb-2">
          📝 {t("dashboard.mytasks.title", "My Sticky Notes")}
        </h2>
        <div className="flex flex-col gap-3">
          {[...Array(3)].map((_, i) => (
            <div
              key={i}
              className="h-20 bg-neutral-bg border-2 border-black rounded-sketchy-sm animate-pulse"
            />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white border-2 border-black rounded-sketchy shadow-flat-offset p-6 flex flex-col gap-4 relative">
      <div className="flex justify-between items-center border-b-2 border-black pb-2">
        <h2 className="font-cursive text-2xl font-bold text-primary">
          📝 {t("dashboard.mytasks.title", "My Sticky Notes")}
        </h2>
        <span className="font-sans text-xs bg-neutral-bg border border-black px-2 py-0.5 rounded-full font-bold">
          {myPendingTasks.length} {t("dashboard.mytasks.countSuffix", "Pending")}
        </span>
      </div>

      {errorMsg && (
        <div className="bg-accent-pink text-primary border border-black rounded p-3 text-xs font-bold">
          ⚠️ {errorMsg}
        </div>
      )}

      {myPendingTasks.length === 0 ? (
        <div className="py-8 text-center bg-neutral-bg/20 border-2 border-dashed border-black/20 rounded-sketchy p-6">
          <p className="font-cursive text-lg text-secondary">
            {t("dashboard.mytasks.empty", "Yay! No pending tasks. Time to doodle! 🎨")}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {myPendingTasks.map((task, index) => {
            const isOverdue =
              task.due_date && new Date(task.due_date) < new Date();
            const projName = projectMap.get(task.project_id) || "Unknown Project";

            return (
              <div
                key={task.id}
                className={`p-4 border-2 border-black rounded-sketchy-sm shadow-flat-offset-sm hover:-translate-y-1 hover:shadow-flat-offset transition-all duration-200 flex flex-col justify-between min-h-[140px] ${getStickyStyles(
                  task.priority,
                  index
                )}`}
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="flex flex-col gap-1">
                    <span className="font-sans text-[10px] uppercase tracking-wider text-secondary/70 font-bold">
                      {projName}
                    </span>
                    <h4 className="font-sans text-sm font-bold text-primary leading-tight line-clamp-2">
                      {task.title}
                    </h4>
                  </div>
                  <button
                    disabled={completeTaskMutation.isPending}
                    onClick={() =>
                      completeTaskMutation.mutate({
                        taskId: task.id,
                        projectId: task.project_id,
                      })
                    }
                    className="w-6 h-6 border-2 border-black rounded-md flex items-center justify-center bg-white cursor-pointer hover:bg-neutral-bg shrink-0 active:scale-[0.9] disabled:opacity-50"
                    title={t("dashboard.mytasks.completeTooltip", "Mark as complete")}
                  >
                    <Check className="h-4 w-4 text-primary opacity-0 hover:opacity-100 transition-opacity" />
                  </button>
                </div>

                <div className="flex items-center justify-between mt-4 border-t border-black/10 pt-2">
                  <span className="font-sans text-[10px] bg-white border border-black/20 px-2 py-0.5 rounded-full font-bold">
                    {task.priority}
                  </span>
                  {task.due_date && (
                    <div
                      className={`flex items-center gap-1 font-sans text-[10px] font-bold ${
                        isOverdue
                          ? "bg-accent-pink text-primary animate-pulse border border-black rounded px-1.5 py-0.5"
                          : "text-secondary"
                      }`}
                    >
                      <Calendar className="h-3 w-3" />
                      {new Date(task.due_date).toLocaleDateString("en-US", {
                        month: "short",
                        day: "numeric",
                      })}
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
