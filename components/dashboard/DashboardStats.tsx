"use client";

import { useQuery } from "@tanstack/react-query";
import { useTranslation } from "@/lib/i18n/useTranslation";
import { getAnalyticsData } from "@/actions/analytics";
import { getSprints } from "@/actions/sprint";
import { getOrganizationTasks } from "@/actions/task";
import { LayoutDashboard, CheckSquare, Calendar, AlertCircle } from "lucide-react";

interface Props {
  orgId: string;
  userId: string;
}

export function DashboardStats({ orgId, userId }: Props) {
  const { t } = useTranslation();

  // 1. Fetch analytics overview
  const { data: analytics = null, isLoading: loadingAnalytics } = useQuery({
    queryKey: ["orgAnalytics", orgId],
    queryFn: async () => {
      const res = await getAnalyticsData(orgId);
      if (!res.success) throw new Error(res.error || "Failed to fetch analytics");
      return res.data;
    },
  });

  // 2. Fetch sprints to detect active one
  const { data: sprints = [], isLoading: loadingSprints } = useQuery({
    queryKey: ["sprints", orgId],
    queryFn: async () => {
      const res = await getSprints(orgId);
      if (!res.success) throw new Error(res.error || "Failed to fetch sprints");
      return res.data;
    },
  });

  // 3. Fetch organization tasks to count user's pending tasks
  const { data: tasks = [], isLoading: loadingTasks } = useQuery({
    queryKey: ["orgTasks", orgId],
    queryFn: async () => {
      const res = await getOrganizationTasks(orgId);
      if (!res.success) throw new Error(res.error || "Failed to fetch tasks");
      return res.data;
    },
  });

  const activeProjectsCount = analytics?.activeProjects ?? 0;
  const overdueTasksCount = analytics?.overdueTasks ?? 0;

  const myPendingTasksCount = tasks.filter(
    (task) => task.assignee_id === userId && task.status !== "DONE"
  ).length;

  const activeSprint = sprints.find((s) => s.status === "ACTIVE");

  const isLoading = loadingAnalytics || loadingSprints || loadingTasks;

  if (isLoading) {
    return (
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        {[...Array(4)].map((_, i) => (
          <div
            key={i}
            className="h-28 bg-white border-2 border-black rounded-sketchy-sm p-6 shadow-flat-offset-sm animate-pulse flex items-center justify-between"
          >
            <div className="flex flex-col gap-2">
              <div className="h-4 w-24 bg-neutral-dot rounded" />
              <div className="h-6 w-12 bg-neutral-dot rounded" />
            </div>
            <div className="h-8 w-8 bg-neutral-dot rounded-full" />
          </div>
        ))}
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
      {/* Active Projects */}
      <div className="bg-accent-blue border-2 border-black rounded-sketchy-sm p-6 shadow-flat-offset-sm rotate-[-1deg] hover:rotate-0 transition-transform duration-200 flex items-center justify-between">
        <div>
          <h3 className="font-cursive text-lg font-bold text-primary">
            {t("dashboard.stats.activeProjects", "Active Projects")}
          </h3>
          <p className="font-sans text-3xl font-bold mt-1 text-primary">
            {activeProjectsCount}
          </p>
        </div>
        <div className="p-3 bg-white/40 border border-black rounded-full">
          <LayoutDashboard className="h-6 w-6 text-primary" />
        </div>
      </div>

      {/* My Open Tasks */}
      <div className="bg-accent-yellow border-2 border-black rounded-sketchy-sm p-6 shadow-flat-offset-sm rotate-[0.8deg] hover:rotate-0 transition-transform duration-200 flex items-center justify-between">
        <div>
          <h3 className="font-cursive text-lg font-bold text-primary">
            {t("dashboard.stats.myTasks", "My Pending")}
          </h3>
          <p className="font-sans text-3xl font-bold mt-1 text-primary">
            {myPendingTasksCount}
          </p>
        </div>
        <div className="p-3 bg-white/40 border border-black rounded-full">
          <CheckSquare className="h-6 w-6 text-primary" />
        </div>
      </div>

      {/* Current Active Sprint */}
      <div className="bg-accent-green border-2 border-black rounded-sketchy-sm p-6 shadow-flat-offset-sm rotate-[-0.5deg] hover:rotate-0 transition-transform duration-200 flex items-center justify-between">
        <div>
          <h3 className="font-cursive text-lg font-bold text-primary">
            {t("dashboard.stats.activeSprint", "Active Sprint")}
          </h3>
          <p className="font-sans text-sm font-bold mt-2 text-primary truncate max-w-[150px]">
            {activeSprint ? activeSprint.name : t("dashboard.stats.noActiveSprint", "No Active Sprint")}
          </p>
        </div>
        <div className="p-3 bg-white/40 border border-black rounded-full">
          <Calendar className="h-6 w-6 text-primary" />
        </div>
      </div>

      {/* Overdue Warning */}
      <div
        className={`${
          overdueTasksCount > 0 ? "bg-accent-pink animate-pulse" : "bg-neutral-bg"
        } border-2 border-black rounded-sketchy-sm p-6 shadow-flat-offset-sm rotate-[1.2deg] hover:rotate-0 transition-transform duration-200 flex items-center justify-between`}
      >
        <div>
          <h3 className="font-cursive text-lg font-bold text-primary">
            {t("dashboard.stats.overdue", "Overdue Tasks")}
          </h3>
          <p className="font-sans text-3xl font-bold mt-1 text-primary">
            {overdueTasksCount}
          </p>
        </div>
        <div className="p-3 bg-white/40 border border-black rounded-full">
          <AlertCircle className="h-6 w-6 text-primary" />
        </div>
      </div>
    </div>
  );
}
