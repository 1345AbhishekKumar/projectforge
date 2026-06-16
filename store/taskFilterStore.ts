import { create } from "zustand";
import { type FiltersState, initialFilters } from "@/components/tasks/TaskFilters";

type TaskFilterStore = {
  filtersByProject: Record<string, FiltersState>;
  activeViewByProject: Record<string, string>;
  setFilters: (projectId: string, filters: FiltersState) => void;
  setActiveView: (projectId: string, viewName: string) => void;
  clearFilters: (projectId: string) => void;
};

export const useTaskFilterStore = create<TaskFilterStore>((set) => ({
  filtersByProject: {},
  activeViewByProject: {},
  setFilters: (projectId, filters) => set((state) => ({
    filtersByProject: {
      ...state.filtersByProject,
      [projectId]: filters
    }
  })),
  setActiveView: (projectId, viewName) => set((state) => ({
    activeViewByProject: {
      ...state.activeViewByProject,
      [projectId]: viewName
    }
  })),
  clearFilters: (projectId) => set((state) => ({
    filtersByProject: {
      ...state.filtersByProject,
      [projectId]: initialFilters
    },
    activeViewByProject: {
      ...state.activeViewByProject,
      [projectId]: ""
    }
  })),
}));
