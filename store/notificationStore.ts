import { create } from "zustand";

type NotificationStore = {
  isOpen: boolean;
  setIsOpen: (isOpen: boolean) => void;
};

export const useNotificationStore = create<NotificationStore>((set) => ({
  isOpen: false,
  setIsOpen: (isOpen) => set({ isOpen }),
}));
