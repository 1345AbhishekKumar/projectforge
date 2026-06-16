import { create } from "zustand";
import type { Notification } from "@/types";
import { getNotifications, markNotificationRead, markAllNotificationsRead } from "@/actions/notification";

type NotificationStore = {
  notifications: Notification[];
  isOpen: boolean;
  isLoading: boolean;
  setNotifications: (notifications: Notification[]) => void;
  setIsOpen: (isOpen: boolean) => void;
  setIsLoading: (isLoading: boolean) => void;
  fetchNotifications: () => Promise<void>;
  markRead: (id: string) => Promise<void>;
  markAllRead: () => Promise<void>;
};

export const useNotificationStore = create<NotificationStore>((set, get) => ({
  notifications: [],
  isOpen: false,
  isLoading: false,
  setNotifications: (notifications) => set({ notifications }),
  setIsOpen: (isOpen) => set({ isOpen }),
  setIsLoading: (isLoading) => set({ isLoading }),
  fetchNotifications: async () => {
    set({ isLoading: true });
    const result = await getNotifications();
    if (result.success && result.data) {
      set({ notifications: result.data });
    }
    set({ isLoading: false });
  },
  markRead: async (id) => {
    const { notifications } = get();
    const notification = notifications.find((n) => n.id === id);
    if (!notification || notification.is_read) return;

    set({
      notifications: notifications.map((n) =>
        n.id === id ? { ...n, is_read: true } : n
      ),
    });
    await markNotificationRead(id);
  },
  markAllRead: async () => {
    const { notifications } = get();
    const unreadCount = notifications.filter((n) => !n.is_read).length;
    if (unreadCount === 0) return;

    set({
      notifications: notifications.map((n) => ({ ...n, is_read: true })),
    });
    await markAllNotificationsRead();
  },
}));
