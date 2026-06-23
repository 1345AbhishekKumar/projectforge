import { create } from "zustand";

type ToastType = "success" | "error";

interface ToastState {
  toast: { type: ToastType; text: string } | null;
  showToast: (type: ToastType, text: string) => void;
  hideToast: () => void;
}

let timer: NodeJS.Timeout | null = null;

export const useToastStore = create<ToastState>((set) => ({
  toast: null,
  showToast: (type, text) => {
    if (timer) clearTimeout(timer);
    set({ toast: { type, text } });
    timer = setTimeout(() => {
      set({ toast: null });
    }, 4000);
  },
  hideToast: () => {
    if (timer) clearTimeout(timer);
    set({ toast: null });
  },
}));
