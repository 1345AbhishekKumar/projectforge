"use client";

import React, { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { useUser, useAuth } from "@clerk/nextjs";

import { getProjectDetails, updateProject, archiveProject } from "@/actions/project";
import { getOrganizationMembers, type MemberListItem } from "@/actions/membership";
import { createTask, getProjectTasks, type TaskWithAssignee } from "@/actions/task";
import { updateTask, deleteTask } from "@/actions/taskMutation";
import { getSprints } from "@/actions/sprint";
import { getLabels } from "@/actions/label";
import { getSavedViews, createSavedView, deleteSavedView } from "@/actions/savedView";
import { initialFilters } from "@/components/tasks/TaskFilters";

import { useOrgStore } from "@/store/orgStore";
import { useTaskStore } from "@/store/taskStore";
import { useTaskFilterStore } from "@/store/taskFilterStore";
import type { Project, ProjectStatus, TaskStatus, TaskPriority, Sprint, Label, SavedView } from "@/types";

export function useProjectDetails(projectId: string) {
  const router = useRouter();
  const { user, isLoaded } = useUser();
  const { signOut } = useAuth();
  const queryClient = useQueryClient();

  const { activeOrgId } = useOrgStore();
  const {
    selectedTask,
    isDetailsOpen,
    isCreateModalOpen: isCreateTaskModalOpen,
    openDetails,
    closeDetails,
    openCreateModal,
    closeCreateModal
  } = useTaskStore();

  const { filtersByProject, activeViewByProject, setFilters, setActiveView, clearFilters } = useTaskFilterStore();
  const activeFilters = filtersByProject[projectId] || initialFilters;
  const activeViewName = activeViewByProject[projectId] || "";

  const handleSignOut = async () => {
    await signOut();
    router.push("/sign-in");
  };

  // Queries
  const { data: project = null, isLoading: isProjectLoading, error: projectError } = useQuery<Project | null>({
    queryKey: ["project", projectId, activeOrgId],
    queryFn: async () => {
      if (!activeOrgId || !projectId) return null;
      const result = await getProjectDetails(projectId, activeOrgId);
      if (!result.success) throw new Error(result.error || "Project not found");
      return result.data || null;
    },
    enabled: !!activeOrgId && !!projectId,
  });

  const { data: tasks = [], isLoading: isTasksLoading } = useQuery<TaskWithAssignee[]>({
    queryKey: ["tasks", projectId, activeOrgId],
    queryFn: async () => {
      if (!activeOrgId || !projectId) return [];
      const result = await getProjectTasks(projectId, activeOrgId);
      if (!result.success) throw new Error(result.error || "Failed to load tasks");
      return result.data || [];
    },
    enabled: !!activeOrgId && !!projectId,
  });

  const { data: members = [], isLoading: isMembersLoading } = useQuery<MemberListItem[]>({
    queryKey: ["members", activeOrgId],
    queryFn: async () => {
      if (!activeOrgId) return [];
      const result = await getOrganizationMembers(activeOrgId);
      if (!result.success) throw new Error(result.error || "Failed to load members");
      return result.data || [];
    },
    enabled: !!activeOrgId,
  });

  const { data: sprints = [] } = useQuery<Sprint[]>({
    queryKey: ["sprints", activeOrgId],
    queryFn: async () => {
      if (!activeOrgId) return [];
      const result = await getSprints(activeOrgId);
      if (!result.success) throw new Error(result.error || "Failed to load sprints");
      return result.data || [];
    },
    enabled: !!activeOrgId,
  });

  const { data: labels = [] } = useQuery<Label[]>({
    queryKey: ["labels", activeOrgId],
    queryFn: async () => {
      if (!activeOrgId) return [];
      const result = await getLabels(activeOrgId);
      if (!result.success) throw new Error(result.error || "Failed to load labels");
      return result.data || [];
    },
    enabled: !!activeOrgId,
  });

  const { data: savedViews = [] } = useQuery<SavedView[]>({
    queryKey: ["savedViews", activeOrgId],
    queryFn: async () => {
      if (!activeOrgId) return [];
      const result = await getSavedViews(activeOrgId);
      if (!result.success) throw new Error(result.error || "Failed to load saved views");
      return result.data || [];
    },
    enabled: !!activeOrgId,
  });

  // Mutations
  const updateProjectMutation = useMutation({
    mutationFn: async (newStatus: ProjectStatus) => {
      if (!project) throw new Error("No active project");
      const result = await updateProject(project.id, project.name, project.description, newStatus, activeOrgId!);
      if (!result.success) throw new Error(result.error || "Failed to update project status");
      return result;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["project", projectId, activeOrgId] });
    },
  });

  const archiveProjectMutation = useMutation({
    mutationFn: async () => {
      if (!project) throw new Error("No active project");
      const result = await archiveProject(project.id, activeOrgId!);
      if (!result.success) throw new Error(result.error || "Failed to archive project");
      return result;
    },
    onSuccess: () => {
      router.push("/projects");
    },
  });

  const createTaskMutation = useMutation({
    mutationFn: async ({ title, description, status, priority, assigneeId, dueDate, labelIds }: {
      title: string;
      description: string | null;
      status: TaskStatus;
      priority: TaskPriority;
      assigneeId: string | null;
      dueDate: string | null;
      labelIds: string[];
    }) => {
      const result = await createTask(projectId, activeOrgId!, title, description, status, priority, assigneeId, dueDate, null, labelIds);
      if (!result.success) throw new Error(result.error || "Failed to create task");
      return result;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["tasks", projectId, activeOrgId] });
    },
  });

  const updateTaskMutation = useMutation({
    mutationFn: async ({ taskId, updates }: {
      taskId: string;
      updates: Parameters<typeof updateTask>[3];
    }) => {
      const result = await updateTask(taskId, projectId, activeOrgId!, updates);
      if (!result.success) throw new Error(result.error || "Failed to update task");
      return result;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["tasks", projectId, activeOrgId] });
    },
  });

  const deleteTaskMutation = useMutation({
    mutationFn: async (taskId: string) => {
      const result = await deleteTask(taskId, projectId, activeOrgId!);
      if (!result.success) throw new Error(result.error || "Failed to delete task");
      return result;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["tasks", projectId, activeOrgId] });
    },
  });

  const createSavedViewMutation = useMutation({
    mutationFn: async (name: string) => {
      const result = await createSavedView(activeOrgId!, name, activeFilters);
      if (!result.success) throw new Error(result.error || "Failed to create saved view");
      return result;
    },
    onSuccess: (res, name) => {
      queryClient.invalidateQueries({ queryKey: ["savedViews", activeOrgId] });
      setActiveView(projectId, name);
    },
  });

  const deleteSavedViewMutation = useMutation({
    mutationFn: async (viewId: string) => {
      const result = await deleteSavedView(viewId, activeOrgId!);
      if (!result.success) throw new Error(result.error || "Failed to delete saved view");
      return result;
    },
    onSuccess: (res, viewId) => {
      queryClient.invalidateQueries({ queryKey: ["savedViews", activeOrgId] });
      if (activeViewName && savedViews.find((v) => v.id === viewId)?.name === activeViewName) {
        setActiveView(projectId, "");
      }
    },
  });

  // State Aliases to preserve downstream rendering without rewriting JSX
  const loading = isProjectLoading;
  const loadingTasks = isTasksLoading;
  const loadingMembers = isMembersLoading;
  const error = projectError ? (projectError as Error).message : "";
  const updatingStatus = updateProjectMutation.isPending;
  const archiving = archiveProjectMutation.isPending;

  const [activeTab, setActiveTab] = useState<"backlog" | "members" | "settings">("backlog");

  // Synchronize tab from URL search parameters on mount
  useEffect(() => {
    if (typeof window !== "undefined") {
      const params = new URLSearchParams(window.location.search);
      const tab = params.get("tab");
      if (tab === "members" || tab === "backlog" || tab === "settings") {
        const timer = setTimeout(() => {
          setActiveTab(tab as "backlog" | "members" | "settings");
        }, 0);
        return () => clearTimeout(timer);
      }
    }
  }, []);

  // Redirect to projects directory if activeOrgId changes
  const initialOrgIdRef = React.useRef(activeOrgId);
  useEffect(() => {
    if (activeOrgId !== initialOrgIdRef.current) {
      router.push("/projects");
    }
  }, [activeOrgId, router]);

  // Handle project status update dropdown
  async function handleStatusChange(newStatus: ProjectStatus) {
    if (!project || !activeOrgId) return;
    try {
      await updateProjectMutation.mutateAsync(newStatus);
    } catch (e) {
      const err = e instanceof Error ? e.message : "Failed to update project status";
      alert(err);
    }
  }

  // Handle project archiving
  async function handleArchive() {
    if (!project || !activeOrgId) return;
    if (!confirm("Are you sure you want to archive this project board?")) return;
    try {
      await archiveProjectMutation.mutateAsync();
    } catch (e) {
      const err = e instanceof Error ? e.message : "Failed to archive project";
      alert(err);
    }
  }

  // Task Handlers
  async function handleCreateTask(
    title: string,
    description: string | null,
    status: TaskStatus,
    priority: TaskPriority,
    assigneeId: string | null,
    dueDate: string | null,
    labelIds: string[] = []
  ) {
    if (!activeOrgId || !projectId) return { success: false, error: "Missing context" };
    try {
      const res = await createTaskMutation.mutateAsync({
        title,
        description,
        status,
        priority,
        assigneeId,
        dueDate,
        labelIds,
      });
      return res;
    } catch (e) {
      const err = e instanceof Error ? e.message : "An error occurred";
      return { success: false, error: err };
    }
  }

  async function handleUpdateTask(
    taskId: string,
    updates: {
      title?: string;
      description?: string | null;
      status?: TaskStatus;
      priority?: TaskPriority;
      assignee_id?: string | null;
      due_date?: string | null;
      sprint_id?: string | null;
      label_ids?: string[] | null;
    }
  ) {
    if (!activeOrgId || !projectId) return { success: false, error: "Missing context" };
    try {
      const res = await updateTaskMutation.mutateAsync({
        taskId,
        updates,
      });
      return res;
    } catch (e) {
      const err = e instanceof Error ? e.message : "An error occurred";
      return { success: false, error: err };
    }
  }

  // Saved Views Actions
  const handleSaveView = async (name: string) => {
    if (!activeOrgId) return { success: false, error: "No active workspace" };
    try {
      const res = await createSavedViewMutation.mutateAsync(name);
      return res;
    } catch (e) {
      const err = e instanceof Error ? e.message : "An error occurred";
      return { success: false, error: err };
    }
  };

  const handleDeleteView = async (viewId: string) => {
    if (!activeOrgId) return { success: false, error: "No active workspace" };
    try {
      const res = await deleteSavedViewMutation.mutateAsync(viewId);
      return res;
    } catch (e) {
      const err = e instanceof Error ? e.message : "An error occurred";
      return { success: false, error: err };
    }
  };

  // Apply filters client-side
  const filteredTasks = tasks.filter((task) => {
    if (activeFilters.priorities.length > 0 && !activeFilters.priorities.includes(task.priority)) {
      return false;
    }
    if (activeFilters.statuses.length > 0 && !activeFilters.statuses.includes(task.status)) {
      return false;
    }
    if (activeFilters.assigneeIds.length > 0) {
      if (!activeFilters.assigneeIds.includes(task.assignee_id)) {
        return false;
      }
    }
    if (activeFilters.labelIds.length > 0) {
      if (!task.labels || task.labels.length === 0) return false;
      const taskLabelIds = task.labels.map((l) => l.id);
      const hasMatchingLabel = activeFilters.labelIds.some((id) => taskLabelIds.includes(id));
      if (!hasMatchingLabel) return false;
    }
    return true;
  });

  async function handleDeleteTask(taskId: string) {
    if (!activeOrgId || !projectId) return { success: false, error: "Missing context" };
    try {
      const res = await deleteTaskMutation.mutateAsync(taskId);
      return res;
    } catch (e) {
      const err = e instanceof Error ? e.message : "An error occurred";
      return { success: false, error: err };
    }
  }

  async function handleStatusToggle(task: TaskWithAssignee) {
    if (!activeOrgId || !projectId) return;
    const allowedStatuses = project?.custom_statuses || ["TODO", "IN_PROGRESS", "DONE"];
    const backlogStatus = allowedStatuses[0];
    const completedStatus = allowedStatuses[allowedStatuses.length - 1];
    const newStatus: TaskStatus = task.status === completedStatus ? backlogStatus : completedStatus;
    try {
      await updateTaskMutation.mutateAsync({
        taskId: task.id,
        updates: { status: newStatus },
      });
    } catch (e) {
      const err = e instanceof Error ? e.message : "Failed to toggle status";
      alert(err);
    }
  }

  return {
    router,
    user,
    isLoaded,
    activeOrgId,
    selectedTask,
    isDetailsOpen,
    isCreateTaskModalOpen,
    openDetails,
    closeDetails,
    openCreateModal,
    closeCreateModal,
    activeFilters,
    activeViewName,
    setFilters,
    setActiveView,
    clearFilters,
    project,
    tasks,
    members,
    sprints,
    labels,
    savedViews,
    loading,
    loadingTasks,
    loadingMembers,
    error,
    updatingStatus,
    archiving,
    activeTab,
    setActiveTab,
    handleStatusChange,
    handleArchive,
    handleCreateTask,
    handleUpdateTask,
    handleSaveView,
    handleDeleteView,
    filteredTasks,
    handleDeleteTask,
    handleStatusToggle,
    handleSignOut,
  };
}
