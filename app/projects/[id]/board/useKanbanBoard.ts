"use client";

import React, { useState, useEffect, useCallback, use } from "react";
import { useRouter } from "next/navigation";
import { useUser, useAuth } from "@clerk/nextjs";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";

import { getProjectDetails, updateProject, archiveProject } from "@/actions/project";
import { getOrganizationMembers, type MemberListItem } from "@/actions/membership";
import { createTask, getProjectTasks, type TaskWithAssignee } from "@/actions/task";
import { updateTask, deleteTask, reorderTasks } from "@/actions/taskMutation";
import { getSprints } from "@/actions/sprint";
import { getLabels } from "@/actions/label";
import { getSavedViews, createSavedView, deleteSavedView } from "@/actions/savedView";
import { useOrgStore } from "@/store/orgStore";
import { useTaskStore } from "@/store/taskStore";
import { useTaskFilterStore } from "@/store/taskFilterStore";
import { initialFilters } from "@/components/tasks/TaskFilters";
import type { Project, ProjectStatus, TaskStatus, TaskPriority, Sprint, Label, SavedView } from "@/types";

type HookParams = {
  params: Promise<{ id: string }>;
};

export function useKanbanBoard({ params }: HookParams) {
  const router = useRouter();
  const { id: projectId } = use(params);
  const { user, isLoaded } = useUser();
  const { signOut } = useAuth();
  const queryClient = useQueryClient();

  const { activeOrgId } = useOrgStore();
  const {
    selectedTask,
    isDetailsOpen,
    isCreateModalOpen: isCreateTaskModalOpen,
    preselectedStatus,
    openDetails,
    closeDetails,
    openCreateModal,
    closeCreateModal,
  } = useTaskStore();

  const { filtersByProject, activeViewByProject, setFilters, setActiveView, clearFilters } = useTaskFilterStore();
  const activeFilters = filtersByProject[projectId] || initialFilters;
  const activeViewName = activeViewByProject[projectId] || "";

  // React-Query Queries
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

  const { data: tasksData = [] } = useQuery<TaskWithAssignee[]>({
    queryKey: ["tasks", projectId, activeOrgId],
    queryFn: async () => {
      if (!activeOrgId || !projectId) return [];
      const result = await getProjectTasks(projectId, activeOrgId);
      if (!result.success) throw new Error(result.error || "Failed to load tasks");
      return result.data || [];
    },
    enabled: !!activeOrgId && !!projectId,
  });

  const { data: members = [] } = useQuery<MemberListItem[]>({
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

  // Local state for tasks (synced with React-Query) for immediate optimistic updates
  const [prevTasksData, setPrevTasksData] = useState<TaskWithAssignee[]>(tasksData);
  const [tasks, setTasks] = useState<TaskWithAssignee[]>(tasksData);

  if (tasksData !== prevTasksData) {
    setPrevTasksData(tasksData);
    setTasks(tasksData);
  }

  const [draggedTaskId, setDraggedTaskId] = useState<string | null>(null);
  const [dragOverCounters, setDragOverCounters] = useState<Record<string, number>>({});

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
    mutationFn: async ({ title, description, status, priority, assigneeId, dueDate, labelIds, stage }: {
      title: string;
      description: string | null;
      status: TaskStatus;
      priority: TaskPriority;
      assigneeId: string | null;
      dueDate: string | null;
      labelIds: string[];
      stage?: string | null;
    }) => {
      const result = await createTask(projectId, activeOrgId!, title, description, status, priority, assigneeId, dueDate, null, labelIds, stage);
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

  const reorderTasksMutation = useMutation({
    mutationFn: async (payload: Parameters<typeof reorderTasks>[2]) => {
      const result = await reorderTasks(projectId, activeOrgId!, payload);
      if (!result.success) throw new Error(result.error || "Failed to save board reordering");
      return result;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["tasks", projectId, activeOrgId] });
    },
    onError: (err) => {
      alert(err.message);
      queryClient.invalidateQueries({ queryKey: ["tasks", projectId, activeOrgId] });
    }
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

  const handleSignOut = async () => {
    await signOut();
    router.push("/sign-in");
  };

  // Redirect to projects directory if activeOrgId changes
  const initialOrgIdRef = React.useRef(activeOrgId);
  useEffect(() => {
    if (activeOrgId !== initialOrgIdRef.current) {
      router.push("/projects");
    }
  }, [activeOrgId, router]);

  // Handle project status update dropdown
  const handleStatusChange = useCallback(async (newStatus: ProjectStatus) => {
    try {
      await updateProjectMutation.mutateAsync(newStatus);
    } catch (e) {
      const err = e instanceof Error ? e.message : "Failed to update status";
      alert(err);
    }
  }, [updateProjectMutation]);

  // Handle project archiving
  const handleArchive = useCallback(async () => {
    if (!confirm("Are you sure you want to archive this project board?")) return;
    try {
      await archiveProjectMutation.mutateAsync();
    } catch (e) {
      const err = e instanceof Error ? e.message : "Failed to archive project";
      alert(err);
    }
  }, [archiveProjectMutation]);

  const handleCreateTask = useCallback(async (
    title: string,
    description: string | null,
    status: TaskStatus,
    priority: TaskPriority,
    assigneeId: string | null,
    dueDate: string | null,
    labelIds: string[] = [],
    stage: string | null = null
  ) => {
    try {
      const isCustom = project?.custom_statuses && project.custom_statuses.length > 0;
      let finalStatus = status;
      let finalStage = stage;
      
      if (isCustom && project?.custom_statuses?.includes(status)) {
        finalStatus = "TODO";
        finalStage = status;
      }

      return await createTaskMutation.mutateAsync({
        title,
        description,
        status: finalStatus,
        priority,
        assigneeId,
        dueDate,
        labelIds,
        stage: finalStage,
      });
    } catch (e) {
      const err = e instanceof Error ? e.message : "An error occurred";
      return { success: false, error: err };
    }
  }, [createTaskMutation, project]);

  const handleUpdateTask = useCallback(async (
    taskId: string,
    updates: Parameters<typeof updateTask>[3]
  ) => {
    try {
      return await updateTaskMutation.mutateAsync({ taskId, updates });
    } catch (e) {
      const err = e instanceof Error ? e.message : "An error occurred";
      return { success: false, error: err };
    }
  }, [updateTaskMutation]);

  // Saved Views Actions
  const handleSaveView = useCallback(async (name: string) => {
    try {
      return await createSavedViewMutation.mutateAsync(name);
    } catch (e) {
      const err = e instanceof Error ? e.message : "An error occurred";
      return { success: false, error: err };
    }
  }, [createSavedViewMutation]);

  const handleDeleteView = useCallback(async (viewId: string) => {
    try {
      return await deleteSavedViewMutation.mutateAsync(viewId);
    } catch (e) {
      const err = e instanceof Error ? e.message : "An error occurred";
      return { success: false, error: err };
    }
  }, [deleteSavedViewMutation]);

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

  const handleDeleteTask = useCallback(async (taskId: string) => {
    try {
      return await deleteTaskMutation.mutateAsync(taskId);
    } catch (e) {
      const err = e instanceof Error ? e.message : "An error occurred";
      return { success: false, error: err };
    }
  }, [deleteTaskMutation]);

  // Drag and Drop Event Handlers
  const handleDragStart = useCallback((e: React.DragEvent, taskId: string) => {
    setDraggedTaskId(taskId);
    e.dataTransfer.setData("text/plain", taskId);
    e.dataTransfer.effectAllowed = "move";
  }, []);

  const handleDragEnd = useCallback(() => {
    setDraggedTaskId(null);
    setDragOverCounters({});
  }, []);

  const handleDragOverColumn = useCallback((e: React.DragEvent) => {
    e.preventDefault();
  }, []);

  const handleDragEnterColumn = useCallback((e: React.DragEvent, status: TaskStatus) => {
    e.preventDefault();
    setDragOverCounters((prev) => ({
      ...prev,
      [status]: (prev[status] || 0) + 1,
    }));
  }, []);

  const handleDragLeaveColumn = useCallback((e: React.DragEvent, status: TaskStatus) => {
    e.preventDefault();
    setDragOverCounters((prev) => ({
      ...prev,
      [status]: Math.max(0, (prev[status] || 0) - 1),
    }));
  }, []);

  const handleDrop = useCallback(async (e: React.DragEvent, targetStatus: TaskStatus, targetTaskId?: string) => {
    e.preventDefault();
    const taskId = e.dataTransfer.getData("text/plain") || draggedTaskId;
    if (!taskId) return;

    setDragOverCounters({});

    const draggedTask = tasks.find((t) => t.id === taskId);
    if (!draggedTask) return;

    const isCustom = project?.custom_statuses && project.custom_statuses.length > 0;

    let newTasks = [...tasks];
    
    const targetColumnTasks = newTasks
      .filter((t) => {
        if (isCustom) {
          return t.stage === targetStatus && t.id !== taskId;
        }
        return t.status === targetStatus && t.id !== taskId;
      })
      .sort((a, b) => (a.board_index ?? 0) - (b.board_index ?? 0));

    let targetIndex = targetColumnTasks.length;
    if (targetTaskId) {
      const idx = targetColumnTasks.findIndex((t) => t.id === targetTaskId);
      if (idx !== -1) {
        targetIndex = idx;
      }
    }

    const updatedDraggedTask = {
      ...draggedTask,
      [isCustom ? "stage" : "status"]: targetStatus,
    };
    targetColumnTasks.splice(targetIndex, 0, updatedDraggedTask);

    const reindexedTargetColumn = targetColumnTasks.map((t, idx) => ({
      ...t,
      board_index: idx,
    }));

    newTasks = newTasks.map((t) => {
      if (t.id === taskId) {
        return {
          ...t,
          [isCustom ? "stage" : "status"]: targetStatus,
          board_index: targetIndex,
        };
      }
      const reindexed = reindexedTargetColumn.find((rt) => rt.id === t.id);
      if (reindexed) return reindexed;
      return t;
    });

    const draggedTaskVal = isCustom ? draggedTask.stage : draggedTask.status;

    if (draggedTaskVal !== targetStatus) {
      const sourceColumnTasks = newTasks
        .filter((t) => {
          if (isCustom) {
            return t.stage === draggedTaskVal && t.id !== taskId;
          }
          return t.status === draggedTaskVal && t.id !== taskId;
        })
        .sort((a, b) => (a.board_index ?? 0) - (b.board_index ?? 0))
        .map((t, idx) => ({
          ...t,
          board_index: idx,
        }));

      newTasks = newTasks.map((t) => {
        const reindexed = sourceColumnTasks.find((st) => st.id === t.id);
        if (reindexed) return reindexed;
        return t;
      });

      // Optimistically set the state
      setTasks(newTasks);

      // Create payload only with changed items to minimize database writes
      const changedTasks = [...reindexedTargetColumn, ...sourceColumnTasks];
      const reorderPayload = changedTasks
        .filter((t) => {
          const original = tasks.find((ot) => ot.id === t.id);
          if (!original) return true;
          if (isCustom) {
            return original.stage !== t.stage || original.board_index !== t.board_index;
          }
          return original.status !== t.status || original.board_index !== t.board_index;
        })
        .map((t) => ({
          id: t.id,
          stage: isCustom ? t.stage : undefined,
          status: isCustom ? undefined : t.status,
          board_index: t.board_index,
        }));

      if (reorderPayload.length > 0) {
        reorderTasksMutation.mutate(reorderPayload);
      }
    } else {
      // Optimistically set the state
      setTasks(newTasks);

      // Same status reorder: only reindexedTargetColumn tasks can be affected
      const reorderPayload = reindexedTargetColumn
        .filter((t) => {
          const original = tasks.find((ot) => ot.id === t.id);
          if (!original) return true;
          return original.board_index !== t.board_index;
        })
        .map((t) => ({
          id: t.id,
          stage: isCustom ? targetStatus : undefined,
          status: isCustom ? undefined : targetStatus,
          board_index: t.board_index,
        }));

      if (reorderPayload.length > 0) {
        reorderTasksMutation.mutate(reorderPayload);
      }
    }
  }, [tasks, draggedTaskId, reorderTasksMutation, project]);

  const openCreateTaskAtStatus = useCallback((status: TaskStatus) => {
    openCreateModal(status);
  }, [openCreateModal]);

  const getRotation = useCallback((id: string) => {
    let hash = 0;
    for (let i = 0; i < id.length; i++) {
      hash = id.charCodeAt(i) + ((hash << 5) - hash);
    }
    const degs = (hash % 25) / 10;
    const clamped = Math.max(-1.5, Math.min(1.5, degs));
    return `rotate(${clamped}deg)`;
  }, []);

  // State calculations & aliases
  const loading = isProjectLoading || updateProjectMutation.isPending || archiveProjectMutation.isPending;
  const updatingStatus = updateProjectMutation.isPending;
  const archiving = archiveProjectMutation.isPending;
  const error = projectError ? (projectError as Error).message : "";
  const syncing = reorderTasksMutation.isPending;

  return {
    projectId,
    project,
    members,
    sprints,
    loading,
    updatingStatus,
    archiving,
    error,
    tasks,
    syncing,
    labels,
    savedViews,
    activeFilters,
    activeViewName,
    setFilters,
    setActiveView,
    clearFilters,
    draggedTaskId,
    dragOverCounters,
    isCreateTaskModalOpen,
    preselectedStatus,
    selectedTask,
    isDetailsOpen,
    handleSignOut,
    handleStatusChange,
    handleArchive,
    handleCreateTask,
    handleUpdateTask,
    handleDeleteTask,
    handleSaveView,
    handleDeleteView,
    filteredTasks,
    handleDragStart,
    handleDragEnd,
    handleDragOverColumn,
    handleDragEnterColumn,
    handleDragLeaveColumn,
    handleDrop,
    getRotation,
    openCreateTaskAtStatus,
    closeCreateModal,
    openDetails,
    closeDetails,
    isLoaded,
    user,
    activeOrgId,
  };
}
