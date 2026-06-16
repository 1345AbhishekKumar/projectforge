"use client";

import React, { useState, useEffect, useCallback, use } from "react";
import { useRouter } from "next/navigation";
import { useUser, useAuth } from "@clerk/nextjs";
import { getProjectDetails, updateProject, archiveProject } from "@/actions/project";
import { getOrganizationMembers, type MemberListItem } from "@/actions/membership";
import { createTask, getProjectTasks, updateTask, deleteTask, reorderTasks, type TaskWithAssignee } from "@/actions/task";
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

  const { filtersByProject, activeViewByProject, setActiveView } = useTaskFilterStore();
  const activeFilters = filtersByProject[projectId] || initialFilters;
  const activeViewName = activeViewByProject[projectId] || "";

  const [project, setProject] = useState<Project | null>(null);
  const [members, setMembers] = useState<MemberListItem[]>([]);
  const [sprints, setSprints] = useState<Sprint[]>([]);
  const [loading, setLoading] = useState(true);
  const [updatingStatus, setUpdatingStatus] = useState(false);
  const [archiving, setArchiving] = useState(false);
  const [error, setError] = useState("");

  const [tasks, setTasks] = useState<TaskWithAssignee[]>([]);
  const [syncing, setSyncing] = useState(false);

  const [labels, setLabels] = useState<Label[]>([]);
  const [savedViews, setSavedViews] = useState<SavedView[]>([]);

  const [draggedTaskId, setDraggedTaskId] = useState<string | null>(null);
  const [dragOverCounters, setDragOverCounters] = useState<Record<TaskStatus, number>>({
    TODO: 0,
    IN_PROGRESS: 0,
    DONE: 0,
  });

  const handleSignOut = async () => {
    await signOut();
    router.push("/sign-in");
  };

  // Fetch project details
  useEffect(() => {
    if (!activeOrgId || !projectId) return;

    async function loadProjectDetails() {
      setLoading(true);
      setError("");
      
      const result = await getProjectDetails(projectId, activeOrgId!);
      if (result.success && result.data) {
        setProject(result.data);
      } else {
        setError(result.error || "Project not found or unauthorized access.");
      }
      
      setLoading(false);
    }

    loadProjectDetails();
  }, [projectId, activeOrgId]);

  // Load tasks callback
  const loadTasks = useCallback(async () => {
    if (!activeOrgId || !projectId) return;
    const result = await getProjectTasks(projectId, activeOrgId);
    if (result.success) {
      setTasks(result.data);
    }
  }, [projectId, activeOrgId]);

  // Fetch tasks on org/project change
  useEffect(() => {
    const timer = setTimeout(() => {
      loadTasks();
    }, 0);
    return () => clearTimeout(timer);
  }, [loadTasks]);

  // Fetch organization members and sprints
  useEffect(() => {
    if (!activeOrgId) return;

    async function loadMembers() {
      const result = await getOrganizationMembers(activeOrgId!);
      if (result.success) {
        setMembers(result.data);
      }
    }

    async function loadSprints() {
      const result = await getSprints(activeOrgId!);
      if (result.success) {
        setSprints(result.data);
      }
    }

    loadMembers();
    loadSprints();
  }, [activeOrgId]);

  // Fetch labels and saved views when active organization changes
  useEffect(() => {
    if (!activeOrgId) return;

    async function loadFiltersData() {
      const [labelsRes, viewsRes] = await Promise.all([
        getLabels(activeOrgId!),
        getSavedViews(activeOrgId!),
      ]);
      if (labelsRes.success) {
        setLabels(labelsRes.data);
      }
      if (viewsRes.success) {
        setSavedViews(viewsRes.data);
      }
    }

    loadFiltersData();
  }, [activeOrgId]);

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

    setUpdatingStatus(true);
    const res = await updateProject(project.id, project.name, project.description, newStatus, activeOrgId);
    if (res.success) {
      setProject({
        ...project,
        status: newStatus,
        updated_at: new Date().toISOString(),
      });
    } else {
      alert(res.error || "Failed to update project status");
    }
    setUpdatingStatus(false);
  }

  // Handle project archiving
  async function handleArchive() {
    if (!project || !activeOrgId) return;
    if (!confirm("Are you sure you want to archive this project board?")) return;

    setArchiving(true);
    const res = await archiveProject(project.id, activeOrgId);
    if (res.success) {
      router.push("/projects");
    } else {
      alert(res.error || "Failed to archive project");
      setArchiving(false);
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
    const res = await createTask(projectId, activeOrgId, title, description, status, priority, assigneeId, dueDate, null, labelIds);
    if (res.success) {
      loadTasks();
    }
    return res;
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
    const res = await updateTask(taskId, projectId, activeOrgId, updates);
    if (res.success) {
      loadTasks();
    }
    return res;
  }

  // Saved Views Actions
  const handleSaveView = async (name: string) => {
    if (!activeOrgId) return { success: false, error: "No active workspace" };
    const res = await createSavedView(activeOrgId, name, activeFilters);
    if (res.success && res.data) {
      setSavedViews((prev) => [res.data!, ...prev]);
      setActiveView(projectId, name);
    }
    return res;
  };

  const handleDeleteView = async (viewId: string) => {
    if (!activeOrgId) return { success: false, error: "No active workspace" };
    const res = await deleteSavedView(viewId, activeOrgId);
    if (res.success) {
      setSavedViews((prev) => prev.filter((v) => v.id !== viewId));
      if (activeViewName && savedViews.find((v) => v.id === viewId)?.name === activeViewName) {
        setActiveView(projectId, "");
      }
    }
    return res;
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
    const res = await deleteTask(taskId, projectId, activeOrgId);
    if (res.success) {
      loadTasks();
    }
    return res;
  }

  // Drag and Drop Event Handlers
  const handleDragStart = (e: React.DragEvent, taskId: string) => {
    setDraggedTaskId(taskId);
    e.dataTransfer.setData("text/plain", taskId);
    e.dataTransfer.effectAllowed = "move";
  };

  const handleDragEnd = () => {
    setDraggedTaskId(null);
    setDragOverCounters({
      TODO: 0,
      IN_PROGRESS: 0,
      DONE: 0,
    });
  };

  const handleDragOverColumn = (e: React.DragEvent) => {
    e.preventDefault();
  };

  const handleDragEnterColumn = (e: React.DragEvent, status: TaskStatus) => {
    e.preventDefault();
    setDragOverCounters((prev) => ({
      ...prev,
      [status]: prev[status] + 1,
    }));
  };

  const handleDragLeaveColumn = (e: React.DragEvent, status: TaskStatus) => {
    e.preventDefault();
    setDragOverCounters((prev) => ({
      ...prev,
      [status]: Math.max(0, prev[status] - 1),
    }));
  };

  const handleDrop = async (e: React.DragEvent, targetStatus: TaskStatus, targetTaskId?: string) => {
    e.preventDefault();
    const taskId = e.dataTransfer.getData("text/plain") || draggedTaskId;
    if (!taskId) return;

    setDragOverCounters({
      TODO: 0,
      IN_PROGRESS: 0,
      DONE: 0,
    });

    const draggedTask = tasks.find((t) => t.id === taskId);
    if (!draggedTask) return;

    let newTasks = [...tasks];
    
    const targetColumnTasks = newTasks
      .filter((t) => t.status === targetStatus && t.id !== taskId)
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
      status: targetStatus,
    };
    targetColumnTasks.splice(targetIndex, 0, updatedDraggedTask);

    const reindexedTargetColumn = targetColumnTasks.map((t, idx) => ({
      ...t,
      board_index: idx,
    }));

    newTasks = newTasks.map((t) => {
      if (t.id === taskId) {
        return { ...t, status: targetStatus, board_index: targetIndex };
      }
      const reindexed = reindexedTargetColumn.find((rt) => rt.id === t.id);
      if (reindexed) return reindexed;
      return t;
    });

    const reorderPayload = reindexedTargetColumn.map((t) => ({
      id: t.id,
      status: targetStatus,
      board_index: t.board_index,
    }));

    if (draggedTask.status !== targetStatus) {
      const sourceColumnTasks = newTasks
        .filter((t) => t.status === draggedTask.status && t.id !== taskId)
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

      reorderPayload.push(
        ...sourceColumnTasks.map((t) => ({
          id: t.id,
          status: draggedTask.status,
          board_index: t.board_index,
        }))
      );
    }

    setTasks(newTasks);
    setSyncing(true);

    const res = await reorderTasks(projectId, activeOrgId!, reorderPayload);
    if (!res.success) {
      alert(res.error || "Failed to save board reordering");
      loadTasks();
    }
    setSyncing(false);
  };

  const openCreateTaskAtStatus = (status: TaskStatus) => {
    openCreateModal(status);
  };

  const getRotation = (id: string) => {
    let hash = 0;
    for (let i = 0; i < id.length; i++) {
      hash = id.charCodeAt(i) + ((hash << 5) - hash);
    }
    const degs = (hash % 25) / 10;
    const clamped = Math.max(-1.5, Math.min(1.5, degs));
    return `rotate(${clamped}deg)`;
  };

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
