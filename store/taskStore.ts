import { create } from "zustand";
import type { TaskStatus } from "@/types";
import type { TaskWithAssignee } from "@/actions/task";

type TaskStore = {
  selectedTask: TaskWithAssignee | null;
  isDetailsOpen: boolean;
  isCreateModalOpen: boolean;
  preselectedStatus: TaskStatus;
  setSelectedTask: (task: TaskWithAssignee | null) => void;
  openDetails: (task: TaskWithAssignee) => void;
  closeDetails: () => void;
  openCreateModal: (status?: TaskStatus) => void;
  closeCreateModal: () => void;
};

export const useTaskStore = create<TaskStore>((set) => ({
  selectedTask: null,
  isDetailsOpen: false,
  isCreateModalOpen: false,
  preselectedStatus: "TODO",
  setSelectedTask: (task) => set({ selectedTask: task }),
  openDetails: (task) => set({ selectedTask: task, isDetailsOpen: true }),
  closeDetails: () => set({ selectedTask: null, isDetailsOpen: false }),
  openCreateModal: (status) => set({ isCreateModalOpen: true, preselectedStatus: status || "TODO" }),
  closeCreateModal: () => set({ isCreateModalOpen: false }),
}));
