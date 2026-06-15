"use client";

import { useState, useEffect, useRef } from "react";
import { Bell } from "lucide-react";
import {
  getNotifications,
  markNotificationRead,
  markAllNotificationsRead,
  deleteOldNotifications,
} from "@/actions/notification";
import type { Notification } from "@/types";

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

function groupNotificationsByDate(notifications: Notification[]): Record<string, Notification[]> {
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

export function NotificationBell() {
  const [open, setOpen] = useState(false);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(false);
  const [markingAll, setMarkingAll] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const unreadCount = notifications.filter((n) => !n.is_read).length;

  async function fetchNotifications() {
    setLoading(true);
    const result = await getNotifications();
    if (result.success) setNotifications(result.data);
    setLoading(false);
  }

  // Initial fetch — async IIFE keeps setState out of the synchronous effect body
  useEffect(() => {
    let active = true;
    (async () => {
      setLoading(true);
      const result = await getNotifications();
      if (active) {
        if (result.success) setNotifications(result.data);
        setLoading(false);
      }
    })();
    return () => { active = false; };
  }, []);

  // Close on outside click
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    if (open) document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [open]);

  const handleToggleOpen = async () => {
    const next = !open;
    setOpen(next);
    if (next) {
      // Cleanup old notifications fire-and-forget
      deleteOldNotifications();
      await fetchNotifications();
    }
  };

  const handleMarkRead = async (id: string) => {
    const notification = notifications.find((n) => n.id === id);
    if (!notification || notification.is_read) return;

    // Optimistic update
    setNotifications((prev) =>
      prev.map((n) => (n.id === id ? { ...n, is_read: true } : n))
    );
    await markNotificationRead(id);
  };

  const handleMarkAllRead = async () => {
    if (unreadCount === 0) return;
    setMarkingAll(true);
    // Optimistic update
    setNotifications((prev) => prev.map((n) => ({ ...n, is_read: true })));
    await markAllNotificationsRead();
    setMarkingAll(false);
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
        <div className="absolute right-0 top-full mt-2 w-80 bg-white border-2 border-black rounded-sketchy shadow-flat-offset z-[100] overflow-hidden">
          {/* Header */}
          <div className="flex items-center justify-between px-4 py-3 border-b-2 border-black">
            <span className="font-cursive text-xl font-bold text-primary">Notifications</span>
            {unreadCount > 0 && (
              <button
                onClick={handleMarkAllRead}
                disabled={markingAll}
                className="font-sans text-xs font-semibold text-tertiary hover:text-tertiary-hover underline underline-offset-2 disabled:opacity-40 transition-colors"
              >
                {markingAll ? "Marking..." : "Mark all as read"}
              </button>
            )}
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
                <p className="font-sans text-sm font-semibold text-primary">You&apos;re all caught up!</p>
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

                  {items.map((notification) => (
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
                        <p className="font-sans text-xs text-secondary mt-0.5">
                          {formatRelativeTime(notification.created_at)}
                        </p>
                      </div>
                    </button>
                  ))}
                </div>
              ))}
          </div>
        </div>
      )}
    </div>
  );
}
