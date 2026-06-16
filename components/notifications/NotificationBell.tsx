"use client";

import { useState, useEffect, useRef } from "react";
import { Bell, Loader2, RefreshCw } from "lucide-react";
import {
  deleteOldNotifications,
  checkOverdueTasks,
  getNotifications,
  markNotificationRead,
  markAllNotificationsRead,
} from "@/actions/notification";
import type { Notification, NotificationType } from "@/types";
import { useOrgStore } from "@/store/orgStore";
import { useNotificationStore } from "@/store/notificationStore";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";

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

function getDateGroupLabel(dateStr: string): string {
  const now = new Date();
  const date = new Date(dateStr);
  const nowDay = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const targetDay = new Date(date.getFullYear(), date.getMonth(), date.getDate());
  const diffDays = Math.floor((nowDay.getTime() - targetDay.getTime()) / 86400000);

  if (diffDays === 0) return "Today";
  if (diffDays === 1) return "Yesterday";
  return "Earlier";
}

function groupNotificationsByDate(
  notifications: Notification[]
): Record<string, Notification[]> {
  const groups: Record<string, Notification[]> = {};
  const order = ["Today", "Yesterday", "Earlier"];

  for (const n of notifications) {
    const label = getDateGroupLabel(n.created_at);
    if (!groups[label]) groups[label] = [];
    groups[label].push(n);
  }

  const ordered: Record<string, Notification[]> = {};
  for (const key of order) {
    if (groups[key]) ordered[key] = groups[key];
  }
  return ordered;
}

const TYPE_BADGE: Record<
  NotificationType,
  { label: string; className: string }
> = {
  GENERAL: { label: "General", className: "bg-neutral-bg border border-black/20 text-secondary" },
  TASK_OVERDUE: { label: "Overdue", className: "bg-accent-pink border border-black/30 text-primary" },
  SPRINT_STARTED: { label: "Sprint ▶", className: "bg-accent-blue border border-black/30 text-primary" },
  SPRINT_ENDED: { label: "Sprint ✓", className: "bg-accent-green border border-black/30 text-primary" },
  MEMBER_INVITED: { label: "Invited", className: "bg-accent-purple text-white border border-black/30" },
  PROJECT_COMPLETED: { label: "Project ✓", className: "bg-accent-yellow border border-black/30 text-primary" },
};

export function NotificationBell() {
  const { activeOrgId } = useOrgStore();
  const { isOpen: open, setIsOpen: setOpen } = useNotificationStore();
  const queryClient = useQueryClient();

  const { data: notifications = [], isLoading: loading } = useQuery<Notification[]>({
    queryKey: ["notifications"],
    queryFn: async () => {
      const result = await getNotifications();
      if (!result.success) throw new Error(result.error || "Failed to fetch notifications");
      return result.data || [];
    },
    staleTime: 30 * 1000,
  });

  const markReadMutation = useMutation({
    mutationFn: async (id: string) => {
      const result = await markNotificationRead(id);
      if (!result.success) throw new Error(result.error || "Failed to mark notification read");
      return result;
    },
    onMutate: async (id) => {
      await queryClient.cancelQueries({ queryKey: ["notifications"] });
      const previousNotifications = queryClient.getQueryData<Notification[]>(["notifications"]);
      if (previousNotifications) {
        queryClient.setQueryData<Notification[]>(
          ["notifications"],
          previousNotifications.map((n) => (n.id === id ? { ...n, is_read: true } : n))
        );
      }
      return { previousNotifications };
    },
    onError: (err, id, context) => {
      if (context?.previousNotifications) {
        queryClient.setQueryData(["notifications"], context.previousNotifications);
      }
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ["notifications"] });
    },
  });

  const markAllReadMutation = useMutation({
    mutationFn: async () => {
      const result = await markAllNotificationsRead();
      if (!result.success) throw new Error(result.error || "Failed to mark all notifications read");
      return result;
    },
    onMutate: async () => {
      await queryClient.cancelQueries({ queryKey: ["notifications"] });
      const previousNotifications = queryClient.getQueryData<Notification[]>(["notifications"]);
      if (previousNotifications) {
        queryClient.setQueryData<Notification[]>(
          ["notifications"],
          previousNotifications.map((n) => ({ ...n, is_read: true }))
        );
      }
      return { previousNotifications };
    },
    onError: (err, variables, context) => {
      if (context?.previousNotifications) {
        queryClient.setQueryData(["notifications"], context.previousNotifications);
      }
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ["notifications"] });
    },
  });

  const [checkingOverdue, setCheckingOverdue] = useState(false);
  const [overdueMsg, setOverdueMsg] = useState("");
  const containerRef = useRef<HTMLDivElement>(null);

  const unreadCount = notifications.filter((n) => !n.is_read).length;

  // Close on outside click
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    if (open) document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [open, setOpen]);

  const handleToggleOpen = async () => {
    const next = !open;
    setOpen(next);
    if (next) {
      deleteOldNotifications();
      queryClient.invalidateQueries({ queryKey: ["notifications"] });
    }
  };

  const handleMarkRead = async (id: string) => {
    markReadMutation.mutate(id);
  };

  const handleMarkAllRead = async () => {
    if (unreadCount === 0) return;
    markAllReadMutation.mutate();
  };

  const handleCheckOverdue = async () => {
    if (!activeOrgId) {
      setOverdueMsg("No active workspace selected.");
      return;
    }

    setCheckingOverdue(true);
    setOverdueMsg("");
    const result = await checkOverdueTasks(activeOrgId);

    if (result.success) {
      const count = result.count ?? 0;
      setOverdueMsg(
        count === 0
          ? "No new overdue tasks found."
          : `${count} overdue notification${count === 1 ? "" : "s"} sent.`
      );
      queryClient.invalidateQueries({ queryKey: ["notifications"] });
    } else {
      setOverdueMsg(result.error || "Check failed.");
    }

    setCheckingOverdue(false);
    setTimeout(() => setOverdueMsg(""), 3500);
  };

  const grouped = groupNotificationsByDate(notifications);
  const hasNotifications = notifications.length > 0;

  return (
    <div ref={containerRef} className="relative">
      {/* Bell Button */}
      <button
        onClick={handleToggleOpen}
        aria-label={`Notifications${unreadCount > 0 ? `, ${unreadCount} unread` : ""}`}
        className="relative p-2 rounded-full border-2 border-black bg-white hover:bg-neutral-bg shadow-flat-offset-sm transition-all duration-200 hover:-translate-y-0.5 active:translate-y-0"
      >
        <Bell className="h-5 w-5 text-primary" strokeWidth={2} />
        {unreadCount > 0 && (
          <span className="absolute -top-1 -right-1 min-w-[18px] h-[18px] bg-accent-pink border-2 border-black rounded-full flex items-center justify-center font-sans text-[10px] font-bold text-primary leading-none px-0.5">
            {unreadCount > 99 ? "99+" : unreadCount}
          </span>
        )}
      </button>

      {/* Dropdown Panel */}
      {open && (
        <div className="absolute right-0 top-full mt-2 w-[340px] bg-white border-2 border-black rounded-sketchy shadow-flat-offset z-[100] overflow-hidden">
          {/* Header */}
          <div className="flex items-center justify-between px-4 py-3 border-b-2 border-black">
            <span className="font-cursive text-xl font-bold text-primary">Notifications</span>
            {unreadCount > 0 && (
              <button
                onClick={handleMarkAllRead}
                disabled={markAllReadMutation.isPending}
                className="font-sans text-xs font-semibold text-tertiary hover:text-tertiary-hover underline underline-offset-2 disabled:opacity-40 transition-colors"
              >
                {markAllReadMutation.isPending ? "Marking..." : "Mark all as read"}
              </button>
            )}
          </div>

          {/* Check Overdue Tasks row */}
          <div className="px-4 py-2.5 border-b border-black/10 bg-neutral-bg/50 flex items-center justify-between gap-3">
            <span className="font-sans text-[11px] text-secondary/70 truncate">
              {overdueMsg || "Scan for past-due tasks and alert assignees"}
            </span>
            <button
              onClick={handleCheckOverdue}
              disabled={checkingOverdue}
              className="flex items-center gap-1.5 bg-white border-2 border-black rounded-full px-3 py-1 font-sans text-[11px] font-bold shadow-flat-offset-sm hover:-translate-y-0.5 active:translate-y-0 transition-all cursor-pointer disabled:opacity-40 shrink-0"
            >
              {checkingOverdue ? (
                <Loader2 className="h-3 w-3 animate-spin" />
              ) : (
                <RefreshCw className="h-3 w-3" />
              )}
              {checkingOverdue ? "Checking..." : "Check Overdue"}
            </button>
          </div>

          {/* Body */}
          <div className="max-h-80 overflow-y-auto">
            {loading && (
              <div className="px-4 py-6 text-center font-sans text-sm text-secondary animate-pulse">
                Loading...
              </div>
            )}

            {!loading && !hasNotifications && (
              <div className="px-4 py-8 text-center">
                <span className="font-cursive text-2xl block mb-1">🎉</span>
                <p className="font-sans text-sm font-semibold text-primary">
                  You&apos;re all caught up!
                </p>
                <p className="font-sans text-xs text-secondary mt-1">No notifications yet.</p>
              </div>
            )}

            {!loading &&
              hasNotifications &&
              Object.entries(grouped).map(([label, items]) => (
                <div key={label}>
                  {/* Date Group Header */}
                  <div className="px-4 py-1.5 border-b border-black/10 bg-neutral-bg/50">
                    <span className="font-cursive text-sm font-bold text-secondary">{label}</span>
                  </div>

                  {items.map((notification) => {
                    const badge = TYPE_BADGE[notification.type] ?? TYPE_BADGE.GENERAL;
                    return (
                      <button
                        key={notification.id}
                        onClick={() => handleMarkRead(notification.id)}
                        className={[
                          "w-full text-left flex items-start gap-3 px-4 py-3 border-b border-black/10 transition-colors duration-150",
                          notification.is_read
                            ? "hover:bg-neutral-bg/50"
                            : "bg-accent-yellow/20 hover:bg-accent-yellow/40",
                        ].join(" ")}
                      >
                        {/* Unread dot */}
                        <span className="mt-1.5 flex-shrink-0">
                          {!notification.is_read ? (
                            <span className="block w-2 h-2 rounded-full bg-tertiary" />
                          ) : (
                            <span className="block w-2 h-2 rounded-full bg-transparent" />
                          )}
                        </span>

                        <div className="flex-1 min-w-0">
                          <p className="font-sans text-sm text-primary leading-snug line-clamp-2">
                            {notification.content}
                          </p>
                          <div className="flex items-center gap-2 mt-1 flex-wrap">
                            {/* Type badge */}
                            <span
                              className={`inline-block px-1.5 py-0.5 rounded text-[9px] font-bold font-sans ${badge.className}`}
                            >
                              {badge.label}
                            </span>
                            <p className="font-sans text-xs text-secondary">
                              {formatRelativeTime(notification.created_at)}
                            </p>
                          </div>
                        </div>
                      </button>
                    );
                  })}
                </div>
              ))}
          </div>
        </div>
      )}
    </div>
  );
}
