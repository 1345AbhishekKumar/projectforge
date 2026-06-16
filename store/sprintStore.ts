import { create } from "zustand";

type SprintStore = {
  isCreateModalOpen: boolean;
  actionLoadingId: string | null;
  openCreateModal: () => void;
  closeCreateModal: () => void;
  setActionLoadingId: (id: string | null) => void;
};

export const useSprintStore = create<SprintStore>((set) => ({
  isCreateModalOpen: false,
  actionLoadingId: null,
  openCreateModal: () => set({ isCreateModalOpen: true }),
  closeCreateModal: () => set({ isCreateModalOpen: false }),
  setActionLoadingId: (id) => set({ actionLoadingId: id }),
}));
