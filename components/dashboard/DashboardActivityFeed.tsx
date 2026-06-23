"use client";

import { useQuery } from "@tanstack/react-query";
import { useTranslation } from "@/lib/i18n/useTranslation";
import { getOrganizationActivities } from "@/actions/activity";
import type { ActivityWithActor } from "@/actions/activity";
import { User, ClipboardList, CheckCircle2, UserPlus, FolderKanban } from "lucide-react";
import Image from "next/image";

interface Props {
  orgId: string;
}

export function DashboardActivityFeed({ orgId }: Props) {
  const { t } = useTranslation();

  // Fetch recent organization activities
  const { data: activities = [], isLoading } = useQuery({
    queryKey: ["orgActivities", orgId],
    queryFn: async () => {
      const res = await getOrganizationActivities(orgId, 1, 6);
      if (!res.success) throw new Error(res.error || "Failed to fetch activities");
      return res.data;
    },
  });

  const getRelativeTime = (isoString: string) => {
    const now = new Date();
    const date = new Date(isoString);
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMins / 60);
    const diffDays = Math.floor(diffHours / 24);

    if (diffMins < 1) return t("activity.time.justNow", "Just now");
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    return `${diffDays}d ago`;
  };

  const getActivityIcon = (type: string) => {
    switch (type) {
      case "TASK_CREATED":
        return <ClipboardList className="h-4 w-4 text-primary" />;
      case "TASK_COMPLETED":
        return <CheckCircle2 className="h-4 w-4 text-primary" />;
      case "MEMBER_INVITED":
      case "MEMBER_JOINED":
        return <UserPlus className="h-4 w-4 text-primary" />;
      case "PROJECT_CREATED":
      case "PROJECT_COMPLETED":
        return <FolderKanban className="h-4 w-4 text-primary" />;
      default:
        return <User className="h-4 w-4 text-primary" />;
    }
  };

  const getActivityText = (activity: ActivityWithActor) => {
    const name = activity.actor?.full_name || activity.actor?.email || "Someone";
    const meta = activity.metadata || {};

    switch (activity.action_type) {
      case "TASK_CREATED":
        return (
          <span>
            <strong className="font-bold">{name}</strong> {t("activity.taskCreated", "created task")}{" "}
            <span className="italic">&quot;{meta.taskTitle || "untitled"}&quot;</span>
          </span>
        );
      case "TASK_COMPLETED":
        return (
          <span>
            <strong className="font-bold">{name}</strong> {t("activity.taskCompleted", "completed task")}{" "}
            <span className="italic">&quot;{meta.taskTitle || "untitled"}&quot;</span>
          </span>
        );
      case "PROJECT_CREATED":
        return (
          <span>
            <strong className="font-bold">{name}</strong> {t("activity.projectCreated", "created project")}{" "}
            <strong className="font-bold">&quot;{meta.projectName || "untitled"}&quot;</strong>
          </span>
        );
      case "MEMBER_INVITED":
        return (
          <span>
            <strong className="font-bold">{name}</strong> {t("activity.memberInvited", "invited member")}{" "}
            <span className="underline">{meta.inviteeEmail || "email"}</span>
          </span>
        );
      default:
        return (
          <span>
            <strong className="font-bold">{name}</strong> {activity.action_type.toLowerCase().replace(/_/g, " ")}
          </span>
        );
    }
  };

  if (isLoading) {
    return (
      <div className="bg-white border-2 border-black rounded-sketchy shadow-flat-offset p-6 flex flex-col gap-4">
        <h2 className="font-cursive text-2xl font-bold border-b-2 border-black pb-2">
          ⚡ {t("dashboard.activity.title", "Recent Activity")}
        </h2>
        <div className="flex flex-col gap-4">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="flex gap-3 items-center">
              <div className="h-8 w-8 rounded-full bg-neutral-bg border border-black animate-pulse" />
              <div className="flex-1 flex flex-col gap-1.5">
                <div className="h-4 w-3/4 bg-neutral-bg border border-black rounded animate-pulse" />
                <div className="h-3 w-1/4 bg-neutral-bg border border-black rounded animate-pulse" />
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white border-2 border-black rounded-sketchy shadow-flat-offset p-6 flex flex-col gap-4 relative">
      <h2 className="font-cursive text-2xl font-bold text-primary border-b-2 border-black pb-2">
        ⚡ {t("dashboard.activity.title", "Recent Activity")}
      </h2>

      {activities.length === 0 ? (
        <div className="py-8 text-center bg-neutral-bg/20 border-2 border-dashed border-black/20 rounded-sketchy p-6">
          <p className="font-cursive text-lg text-secondary">
            {t("dashboard.activity.empty", "No recent activity recorded yet. Time to start coding! 💻")}
          </p>
        </div>
      ) : (
        <div className="relative pl-6 border-l-2 border-dashed border-black/20 flex flex-col gap-5 py-2">
          {activities.map((activity: ActivityWithActor) => {
            const avatar = activity.actor?.avatar_url;

            return (
              <div key={activity.id} className="relative flex gap-3 items-start group">
                {/* Timeline node icon */}
                <div className="absolute -left-[35px] top-0.5 w-6 h-6 rounded-full border-2 border-black bg-white flex items-center justify-center shadow-flat-offset-xs group-hover:scale-105 transition-transform shrink-0">
                  {getActivityIcon(activity.action_type)}
                </div>

                {/* Actor Avatar */}
                {avatar ? (
                  <div className="relative h-7 w-7 rounded-full border border-black overflow-hidden shrink-0">
                    <Image
                      src={avatar}
                      width={28}
                      height={28}
                      alt={activity.actor?.full_name || "avatar"}
                      className="object-cover"
                    />
                  </div>
                ) : (
                  <div className="h-7 w-7 rounded-full border border-black bg-accent-blue/30 flex items-center justify-center text-[10px] font-bold font-cursive shrink-0">
                    {activity.actor?.full_name ? activity.actor.full_name.charAt(0) : "?"}
                  </div>
                )}

                {/* Activity details */}
                <div className="flex-1 flex flex-col">
                  <p className="font-sans text-xs text-primary leading-normal">
                    {getActivityText(activity)}
                  </p>
                  <span className="font-sans text-[10px] text-secondary mt-0.5">
                    {getRelativeTime(activity.created_at)}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
