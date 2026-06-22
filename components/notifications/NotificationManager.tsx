"use client";

import { useState } from "react";
import { Loader2, Bell, Check, CheckSquare, Mail, MessageSquare, AlertCircle, UserPlus, Info } from "lucide-react";
import { markNotificationRead, markAllNotificationsRead } from "@/actions/notification";

export type NotificationItem = {
  id: string;
  user_id: string;
  content: string;
  type: string;
  is_read: boolean;
  created_at: string;
};

type Props = {
  initialNotifications: NotificationItem[];
};

export function NotificationManager({ initialNotifications }: Props) {
  const [notifications, setNotifications] = useState<NotificationItem[]>(initialNotifications);
  const [filter, setFilter] = useState<"ALL" | "UNREAD" | "ASSIGNED" | "INVITES" | "COMMENTS">("ALL");
  const [updatingId, setUpdatingId] = useState<string | null>(null);
  const [markingAll, setMarkingAll] = useState(false);

  async function handleMarkRead(id: string) {
    setUpdatingId(id);
    try {
      const res = await markNotificationRead(id);
      if (res.success) {
        setNotifications((prev) =>
          prev.map((n) => (n.id === id ? { ...n, is_read: true } : n))
        );
      }
    } finally {
      setUpdatingId(null);
    }
  }

  async function handleMarkAllRead() {
    setMarkingAll(true);
    try {
      const res = await markAllNotificationsRead();
      if (res.success) {
        setNotifications((prev) => prev.map((n) => ({ ...n, is_read: true })));
      }
    } finally {
      setMarkingAll(false);
    }
  }

  const filtered = notifications.filter((n) => {
    if (filter === "UNREAD") return !n.is_read;
    if (filter === "ASSIGNED") return n.type === "TASK_ASSIGNED" || n.type === "TASK_OVERDUE";
    if (filter === "INVITES") return n.type === "MEMBER_INVITED";
    if (filter === "COMMENTS") return n.type === "COMMENT_ADDED";
    return true;
  });

  const getIcon = (type: string) => {
    switch (type) {
      case "TASK_ASSIGNED":
        return <Mail className="h-4 w-4 text-accent-blue" />;
      case "TASK_OVERDUE":
        return <AlertCircle className="h-4 w-4 text-accent-pink" />;
      case "MEMBER_INVITED":
        return <UserPlus className="h-4 w-4 text-accent-purple" />;
      case "COMMENT_ADDED":
        return <MessageSquare className="h-4 w-4 text-accent-green" />;
      default:
        return <Info className="h-4 w-4 text-secondary" />;
    }
  };

  const getTypeBadge = (type: string) => {
    switch (type) {
      case "TASK_ASSIGNED":
        return "Task Assigned";
      case "TASK_OVERDUE":
        return "Task Overdue";
      case "MEMBER_INVITED":
        return "Workspace Invite";
      case "COMMENT_ADDED":
        return "New Comment";
      default:
        return "Notification";
    }
  };

  return (
    <div className="flex flex-col gap-6 max-w-4xl w-full mx-auto">
      {/* Header Info */}
      <div className="bg-white border-2 border-black rounded-sketchy shadow-flat-offset p-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-accent-pink border-2 border-black flex items-center justify-center shadow-flat-offset-sm">
            <Bell className="h-5 w-5" />
          </div>
          <div>
            <h1 className="font-cursive text-3xl font-bold">Notifications</h1>
            <p className="font-sans text-xs text-secondary">
              Keep track of updates, invitations, and assignees.
            </p>
          </div>
        </div>

        {notifications.some((n) => !n.is_read) && (
          <button
            onClick={handleMarkAllRead}
            disabled={markingAll}
            className="flex items-center gap-1.5 bg-accent-yellow hover:bg-[#FFE680] text-primary border-2 border-black font-sans text-xs font-bold px-4 py-2.5 rounded-full shadow-flat-offset-sm active:translate-y-0.5 hover:-translate-y-0.5 transition-all disabled:opacity-50 cursor-pointer"
          >
            {markingAll ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
            ) : (
              <CheckSquare className="h-3.5 w-3.5" />
            )}
            Mark All as Read
          </button>
        )}
      </div>

      {/* Tabs Filter & List */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 items-start">
        {/* Navigation Filters */}
        <div className="md:col-span-1 bg-white border-2 border-black rounded-sketchy shadow-flat-offset p-4 flex flex-col gap-2">
          <h3 className="font-cursive text-lg font-bold mb-2 border-b border-black/10 pb-1">Filters</h3>
          {[
            { id: "ALL", label: "All Notifications" },
            { id: "UNREAD", label: "Unread Only" },
            { id: "ASSIGNED", label: "Assignments" },
            { id: "INVITES", label: "Invites" },
            { id: "COMMENTS", label: "Comments" },
          ].map((tab) => {
            const isActive = filter === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setFilter(tab.id as typeof filter)}
                className={`w-full text-left font-sans text-xs font-semibold px-3 py-2 rounded-lg transition-all border-2 border-transparent ${
                  isActive
                    ? "bg-primary text-white border-black"
                    : "hover:bg-neutral-bg/60 text-secondary"
                }`}
              >
                {tab.label}
              </button>
            );
          })}
        </div>

        {/* Notifications List */}
        <div className="md:col-span-3 flex flex-col gap-4">
          {filtered.length === 0 ? (
            <div className="bg-white border-2 border-black rounded-sketchy shadow-flat-offset p-12 text-center text-secondary/60 text-sm font-sans">
              No notifications match this filter.
            </div>
          ) : (
            filtered.map((item) => (
              <div
                key={item.id}
                className={`border-2 border-black rounded-sketchy-sm p-4 shadow-flat-offset-sm transition-[background-color,opacity,box-shadow] duration-200 flex items-start gap-4 ${
                  !item.is_read ? "bg-accent-yellow/20" : "bg-white opacity-80"
                }`}
              >
                <div className="p-2 border border-black/15 bg-neutral-bg rounded-lg shrink-0">
                  {getIcon(item.type)}
                </div>

                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1 flex-wrap">
                    {!item.is_read && (
                      <span className="block w-2.5 h-2.5 rounded-full bg-tertiary border border-black shrink-0 animate-pulse" title="Unread" />
                    )}
                    <span className="text-[10px] font-bold px-1.5 py-0.5 rounded border border-black/10 bg-neutral-bg uppercase text-secondary">
                      {getTypeBadge(item.type)}
                    </span>
                    <span className="text-[10px] text-secondary/70" suppressHydrationWarning>
                      {new Date(item.created_at).toLocaleString()}
                    </span>
                  </div>

                  <p className="font-sans text-sm font-medium text-primary break-words leading-relaxed">
                    {item.content}
                  </p>
                </div>

                {!item.is_read && (
                  <button
                    onClick={() => handleMarkRead(item.id)}
                    disabled={updatingId === item.id}
                    className="p-1.5 rounded-full border border-black/20 hover:border-black hover:bg-accent-green/20 text-secondary hover:text-primary transition-all shrink-0 cursor-pointer disabled:opacity-40"
                    title="Mark as Read"
                  >
                    {updatingId === item.id ? (
                      <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    ) : (
                      <Check className="h-3.5 w-3.5" />
                    )}
                  </button>
                )}
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
