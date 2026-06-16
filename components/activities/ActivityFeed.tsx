"use client";

import { useState, useTransition } from "react";
import Image from "next/image";
import { 
  Plus, 
  Archive, 
  ClipboardList, 
  UserPlus, 
  UserMinus, 
  Check, 
  ArrowRightLeft, 
  MessageSquare, 
  Users, 
  ArrowRight,
  User as UserIcon,
  Loader2
} from "lucide-react";
import { getProjectActivities, type ActivityWithActor } from "@/actions/activity";

type Props = {
  projectId: string;
  orgId: string;
  initialActivities: ActivityWithActor[];
};

function formatRelativeTime(dateStr: string): string {
  const now = new Date();
  const date = new Date(dateStr);
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMins / 60);
  const diffDays = Math.floor(diffHours / 24);

  if (diffMins < 1) return "just now";
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays === 1) return "yesterday";
  return `${diffDays}d ago`;
}

export function ActivityFeed({ projectId, orgId, initialActivities }: Props) {
  const [activities, setActivities] = useState<ActivityWithActor[]>(initialActivities);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(initialActivities.length === 20);
  const [isPending, startTransition] = useTransition();

  const handleLoadMore = () => {
    if (isPending) return;

    startTransition(async () => {
      const nextPage = page + 1;
      const result = await getProjectActivities(projectId, orgId, nextPage, 20);
      if (result.success && result.data) {
        if (result.data.length < 20) {
          setHasMore(false);
        }
        setActivities((prev) => [...prev, ...result.data]);
        setPage(nextPage);
      } else {
        alert(result.error || "Failed to load more activities");
      }
    });
  };

  const getEventConfig = (actionType: string) => {
    switch (actionType) {
      case "PROJECT_CREATED":
        return {
          icon: Plus,
          iconBg: "bg-[#D4EDDA]", // Muted Green
          textColor: "text-[#155724]",
          badgeText: "Project Created",
        };
      case "PROJECT_ARCHIVED":
        return {
          icon: Archive,
          iconBg: "bg-[#FFD2D2]", // Muted Pink
          textColor: "text-[#721C24]",
          badgeText: "Project Archived",
        };
      case "TASK_CREATED":
        return {
          icon: ClipboardList,
          iconBg: "bg-[#FFF2B2]", // Muted Yellow
          textColor: "text-[#856404]",
          badgeText: "Task Created",
        };
      case "TASK_ASSIGNED":
        return {
          icon: UserPlus,
          iconBg: "bg-[#D0E1FD]", // Muted Blue
          textColor: "text-[#004085]",
          badgeText: "Task Assigned",
        };
      case "TASK_UNASSIGNED":
        return {
          icon: UserMinus,
          iconBg: "bg-[#EEF2FF]", // Indigo Light
          textColor: "text-[#3730A3]",
          badgeText: "Task Unassigned",
        };
      case "TASK_COMPLETED":
        return {
          icon: Check,
          iconBg: "bg-[#D4EDDA]", // Muted Green
          textColor: "text-[#155724]",
          badgeText: "Task Completed",
        };
      case "TASK_STATUS_UPDATED":
        return {
          icon: ArrowRightLeft,
          iconBg: "bg-[#EEF2FF]", // Indigo Light
          textColor: "text-[#3730A3]",
          badgeText: "Status Updated",
        };
      case "COMMENT_ADDED":
        return {
          icon: MessageSquare,
          iconBg: "bg-[#FFF2B2]", // Muted Yellow
          textColor: "text-[#856404]",
          badgeText: "Comment Added",
        };
      case "MEMBER_JOINED":
        return {
          icon: Users,
          iconBg: "bg-[#D4EDDA]", // Muted Green
          textColor: "text-[#155724]",
          badgeText: "Member Joined",
        };
      default:
        return {
          icon: ClipboardList,
          iconBg: "bg-neutral-bg",
          textColor: "text-secondary",
          badgeText: "Activity Logged",
        };
    }
  };

  const renderEventDetails = (activity: ActivityWithActor) => {
    const { action_type } = activity;
    const metadata = activity.metadata as Record<string, string | null | undefined>;

    switch (action_type) {
      case "PROJECT_CREATED":
        return (
          <p className="font-sans text-sm text-secondary">
            created project <span className="font-bold text-primary font-cursive text-base">&quot;{metadata.projectName}&quot;</span>
          </p>
        );
      case "PROJECT_ARCHIVED":
        return (
          <p className="font-sans text-sm text-secondary">
            archived project <span className="font-bold text-primary font-cursive text-base">&quot;{metadata.projectName}&quot;</span>
          </p>
        );
      case "TASK_CREATED":
        return (
          <p className="font-sans text-sm text-secondary">
            created task <span className="font-bold text-primary">&quot;{metadata.taskTitle}&quot;</span>
            {metadata.priority && (
              <span className="ml-2 inline-block text-[10px] font-bold px-1.5 py-0.5 rounded border border-black uppercase bg-white">
                {metadata.priority}
              </span>
            )}
          </p>
        );
      case "TASK_ASSIGNED":
        return (
          <p className="font-sans text-sm text-secondary flex items-center gap-1.5 flex-wrap">
            <span>assigned task</span>
            <span className="font-bold text-primary">&quot;{metadata.taskTitle}&quot;</span>
            <span>to</span>
            <span className="inline-flex items-center gap-1 bg-accent-blue/40 border border-black/20 rounded-full px-2 py-0.5 text-xs font-bold font-sans">
              {metadata.assigneeName}
            </span>
          </p>
        );
      case "TASK_UNASSIGNED":
        return (
          <p className="font-sans text-sm text-secondary">
            unassigned task <span className="font-bold text-primary">&quot;{metadata.taskTitle}&quot;</span>
          </p>
        );
      case "TASK_COMPLETED":
        return (
          <p className="font-sans text-sm text-secondary">
            completed task <span className="font-bold text-primary line-through text-secondary/60">&quot;{metadata.taskTitle}&quot;</span> 🎉
          </p>
        );
      case "TASK_STATUS_UPDATED":
        return (
          <p className="font-sans text-sm text-secondary flex items-center gap-1.5 flex-wrap">
            <span>moved task</span>
            <span className="font-bold text-primary">&quot;{metadata.taskTitle}&quot;</span>
            <span>from</span>
            <span className="bg-neutral-bg border border-black/10 px-1.5 py-0.5 rounded text-xs font-bold font-sans uppercase">
              {metadata.fromStatus}
            </span>
            <ArrowRight className="h-3 w-3 text-secondary" />
            <span className="bg-accent-yellow/40 border border-black/20 px-1.5 py-0.5 rounded text-xs font-bold font-sans uppercase">
              {metadata.toStatus}
            </span>
          </p>
        );
      case "COMMENT_ADDED":
        return (
          <div className="flex flex-col gap-2">
            <p className="font-sans text-sm text-secondary">
              commented on task <span className="font-bold text-primary">&quot;{metadata.taskTitle}&quot;</span>:
            </p>
            <div className="bg-[#FFF2B2] border-2 border-black rounded-sketchy-sm p-3 relative shadow-flat-offset-sm max-w-lg italic font-sans text-xs text-secondary/90 rotate-[0.5deg]">
              &quot;{metadata.snippet}&quot;
            </div>
          </div>
        );
      case "MEMBER_JOINED":
        return (
          <p className="font-sans text-sm text-secondary">
            invited <span className="font-bold text-primary font-cursive text-base">{metadata.joinedUserName}</span> ({metadata.joinedUserEmail}) to join the organization workspace
          </p>
        );
      default:
        return (
          <p className="font-sans text-sm text-secondary">
            performed an event: {JSON.stringify(metadata)}
          </p>
        );
    }
  };

  if (activities.length === 0) {
    return (
      <div className="bg-white border-2 border-black rounded-sketchy shadow-flat-offset p-8 md:p-12 text-center max-w-lg mx-auto mt-4">
        <div className="w-16 h-16 rounded-full bg-accent-yellow border-2 border-black flex items-center justify-center mx-auto mb-4 rotate-[1.5deg] shadow-flat-offset-sm">
          <ClipboardList className="h-8 w-8 text-primary" />
        </div>
        <h3 className="font-cursive text-2xl font-bold mb-2">No Activities Logged</h3>
        <p className="font-sans text-sm text-secondary leading-relaxed">
          There are no registered events recorded on this project yet. Start by creating tasks or inviting members!
        </p>
      </div>
    );
  }

  // Group activities by date
  const dateGroups: Record<string, ActivityWithActor[]> = {};
  activities.forEach((activity) => {
    const dateStr = new Date(activity.created_at).toLocaleDateString("en-US", {
      weekday: "long",
      year: "numeric",
      month: "long",
      day: "numeric",
    });
    if (!dateGroups[dateStr]) {
      dateGroups[dateStr] = [];
    }
    dateGroups[dateStr].push(activity);
  });

  return (
    <div className="relative flex flex-col gap-8">
      {/* Timeline line */}
      <div className="absolute left-8 top-0 bottom-0 w-0.5 border-l-2 border-dashed border-black/20 z-0" />

      {Object.entries(dateGroups).map(([dateLabel, groupItems]) => (
        <div key={dateLabel} className="relative flex flex-col gap-4 z-10">
          {/* Date separator badge */}
          <div className="relative pl-14">
            <span className="bg-accent-yellow border-2 border-black rounded-full px-3 py-1 font-cursive text-sm font-bold shadow-flat-offset-sm inline-block rotate-[-0.5deg]">
              {dateLabel}
            </span>
          </div>

          <div className="flex flex-col gap-4">
            {groupItems.map((activity) => {
              const config = getEventConfig(activity.action_type);
              const EventIcon = config.icon;
              const actorName = activity.actor?.full_name || activity.actor?.email || "System/Unknown";

              return (
                <div key={activity.id} className="relative pl-16 flex items-start group">
                  {/* Timeline icon badge */}
                  <div className={`absolute left-4 top-2.5 w-9 h-9 rounded-full border-2 border-black flex items-center justify-center ${config.iconBg} shadow-flat-offset-sm transition-all group-hover:scale-105 group-hover:shadow-flat-offset active:scale-95`}>
                    <EventIcon className="h-4 w-4 text-primary" />
                  </div>

                  {/* Activity Detail Card */}
                  <div className="bg-white border-2 border-black rounded-sketchy p-4 shadow-flat-offset-sm hover:-translate-y-0.5 hover:shadow-flat-offset transition-all duration-200 w-full flex flex-col gap-2">
                    <div className="flex items-center justify-between gap-4 flex-wrap">
                      <div className="flex items-center gap-2">
                        {/* Actor Avatar */}
                        <div className="w-6 h-6 rounded-full border border-black bg-neutral-bg flex items-center justify-center overflow-hidden relative shadow-sm shrink-0">
                          {activity.actor?.avatar_url ? (
                            <Image
                              src={activity.actor.avatar_url}
                              alt={actorName}
                              width={24}
                              height={24}
                              className="w-full h-full object-cover"
                            />
                          ) : (
                            <UserIcon className="h-3 w-3 text-secondary/40" />
                          )}
                        </div>

                        {/* Actor Name + Action Title */}
                        <span className="font-cursive text-base font-bold text-primary">
                          {actorName}
                        </span>

                        <span className={`text-[9px] font-bold px-1.5 py-0.2 rounded border border-black/20 uppercase font-sans ${config.iconBg} ${config.textColor}`}>
                          {config.badgeText}
                        </span>
                      </div>

                      {/* Timestamp */}
                      <span className="text-xs text-secondary/60 font-sans font-medium shrink-0">
                        {formatRelativeTime(activity.created_at)}
                      </span>
                    </div>

                    {/* Action Specific details body */}
                    <div className="pl-8 border-l border-black/5 py-1">
                      {renderEventDetails(activity)}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      ))}

      {/* Pagination Load More control */}
      {hasMore && (
        <div className="flex justify-center mt-6 pl-14 relative z-10">
          <button
            onClick={handleLoadMore}
            disabled={isPending}
            className="flex items-center gap-2 bg-white hover:bg-neutral-bg text-primary border-2 border-black font-sans text-xs font-bold px-6 py-2.5 rounded-full shadow-flat-offset-sm active:translate-y-0.5 hover:-translate-y-0.5 transition-all cursor-pointer disabled:opacity-50"
          >
            {isPending ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin text-tertiary" />
                Loading...
              </>
            ) : (
              "Load More Activities"
            )}
          </button>
        </div>
      )}
    </div>
  );
}
