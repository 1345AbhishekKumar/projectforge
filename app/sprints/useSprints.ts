"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useUser, useAuth } from "@clerk/nextjs";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useOrgStore } from "@/store/orgStore";
import { useSprintStore } from "@/store/sprintStore";
import { useTaskStore } from "@/store/taskStore";
import { getOrganizationMembers, type MemberListItem } from "@/actions/membership";
import { getUserOrganizations } from "@/actions/org";
import { getSprints, createSprint, updateSprintStatus } from "@/actions/sprint";
import { getOrganizationTasks, type TaskWithAssignee } from "@/actions/task";
import { updateTask, deleteTask } from "@/actions/taskMutation";
import type { Sprint, SprintStatus, TaskStatus, TaskPriority } from "@/types";


export function useSprints() {
  const router = useRouter();
  const { user, isLoaded } = useUser();
  const { signOut } = useAuth();

  const queryClient = useQueryClient();
  const { activeOrgId } = useOrgStore();
  const { isCreateModalOpen: isModalOpen, actionLoadingId, openCreateModal, closeCreateModal, setActionLoadingId } = useSprintStore();
  const { selectedTask, isDetailsOpen, openDetails, closeDetails } = useTaskStore();

  // Queries
  const { data: sprints = [], isLoading: loadingSprints, error: sprintsError } = useQuery<Sprint[]>({
    queryKey: ["sprints", activeOrgId],
    queryFn: async () => {
      if (!activeOrgId) return [];
      const res = await getSprints(activeOrgId);
      if (!res.success) throw new Error(res.error || "Failed to load sprints");
      return res.data || [];
    },
    enabled: !!activeOrgId,
  });

  const { data: tasks = [], isLoading: loadingTasks, error: tasksError } = useQuery<TaskWithAssignee[]>({
    queryKey: ["orgTasks", activeOrgId],
    queryFn: async () => {
      if (!activeOrgId) return [];
      const res = await getOrganizationTasks(activeOrgId);
      if (!res.success) throw new Error(res.error || "Failed to load tasks");
      return res.data || [];
    },
    enabled: !!activeOrgId,
  });

  const { data: members = [], isLoading: loadingMembers, error: membersError } = useQuery<MemberListItem[]>({
    queryKey: ["members", activeOrgId],
    queryFn: async () => {
      if (!activeOrgId) return [];
      const res = await getOrganizationMembers(activeOrgId);
      if (!res.success) throw new Error(res.error || "Failed to load members");
      return res.data || [];
    },
    enabled: !!activeOrgId,
  });

  const { data: orgs = [], isLoading: loadingOrgs, error: orgsError } = useQuery({
    queryKey: ["userOrgs"],
    queryFn: async () => {
      const res = await getUserOrganizations();
      if (!res.success) throw new Error(res.error || "Failed to load organizations");
      return res.data || [];
    },
  });

  const activeOrg = orgs.find((o) => o.id === activeOrgId);
  const activeOrgName = activeOrg?.name || "";
  const userRole = activeOrg?.role || "MEMBER";

  const loading = loadingSprints || loadingTasks || loadingMembers || loadingOrgs;
  const combinedError = sprintsError || tasksError || membersError || orgsError;
  const error = combinedError ? (combinedError as Error).message : "";

  // Modal states
  const [newSprintName, setNewSprintName] = useState("");
  const [newSprintGoal, setNewSprintGoal] = useState("");
  const [newSprintStart, setNewSprintStart] = useState("");
  const [newSprintEnd, setNewSprintEnd] = useState("");
  const [modalError, setModalError] = useState("");
  const [creating, setCreating] = useState(false);

  const handleSignOut = async () => {
    await signOut();
    router.push("/sign-in");
  };

  // Mutations
  const createSprintMutation = useMutation({
    mutationFn: async ({ name, goal, start, end }: { name: string; goal: string | null; start: string; end: string }) => {
      const res = await createSprint(activeOrgId!, name, goal, start, end);
      if (!res.success) throw new Error(res.error || "Failed to create sprint");
      return res;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["sprints", activeOrgId] });
    },
  });

  const updateSprintStatusMutation = useMutation({
    mutationFn: async ({ sprintId, status }: { sprintId: string; status: SprintStatus }) => {
      const res = await updateSprintStatus(activeOrgId!, sprintId, status);
      if (!res.success) throw new Error(res.error || "Failed to update sprint status");
      return res;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["sprints", activeOrgId] });
    },
  });

  const updateTaskMutation = useMutation({
    mutationFn: async ({ taskId, projectId, updates }: { taskId: string; projectId: string; updates: Parameters<typeof updateTask>[3] }) => {
      const res = await updateTask(taskId, projectId, activeOrgId!, updates);
      if (!res.success) throw new Error(res.error || "Failed to update task");
      return res;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["orgTasks", activeOrgId] });
    },
  });

  const deleteTaskMutation = useMutation({
    mutationFn: async ({ taskId, projectId }: { taskId: string; projectId: string }) => {
      const res = await deleteTask(taskId, projectId, activeOrgId!);
      if (!res.success) throw new Error(res.error || "Failed to delete task");
      return res;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["orgTasks", activeOrgId] });
    },
  });

  // Create sprint action handler
  async function handleCreateSprint(e: React.FormEvent) {
    e.preventDefault();
    if (!activeOrgId) return;

    if (new Date(newSprintStart) >= new Date(newSprintEnd)) {
      setModalError("End date must be after start date");
      return;
    }

    setModalError("");
    setCreating(true);

    try {
      const formattedStart = new Date(newSprintStart).toISOString();
      const formattedEnd = new Date(newSprintEnd).toISOString();

      await createSprintMutation.mutateAsync({
        name: newSprintName,
        goal: newSprintGoal || null,
        start: formattedStart,
        end: formattedEnd,
      });

      closeCreateModal();
      setNewSprintName("");
      setNewSprintGoal("");
      setNewSprintStart("");
      setNewSprintEnd("");
    } catch (err) {
      setModalError(err instanceof Error ? err.message : "An unexpected error occurred");
    } finally {
      setCreating(false);
    }
  }

  // Update sprint status action handler (start/complete)
  async function handleStatusTransition(sprintId: string, status: SprintStatus) {
    if (!activeOrgId) return;
    
    setActionLoadingId(sprintId);
    try {
      await updateSprintStatusMutation.mutateAsync({ sprintId, status });
    } catch (err) {
      alert(err instanceof Error ? err.message : "An unexpected error occurred updating status");
    } finally {
      setActionLoadingId(null);
    }
  }

  // Task inline update handler
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
    }
  ) {
    if (!activeOrgId) return { success: false, error: "Missing context" };
    
    const task = tasks.find((t) => t.id === taskId);
    if (!task) return { success: false, error: "Task not found" };

    try {
      const res = await updateTaskMutation.mutateAsync({
        taskId,
        projectId: task.project_id,
        updates,
      });
      return res;
    } catch (err) {
      return { success: false, error: err instanceof Error ? err.message : "An error occurred" };
    }
  }

  // Task inline delete handler
  async function handleDeleteTask(taskId: string) {
    if (!activeOrgId) return { success: false, error: "Missing context" };

    const task = tasks.find((t) => t.id === taskId);
    if (!task) return { success: false, error: "Task not found" };

    try {
      const res = await deleteTaskMutation.mutateAsync({
        taskId,
        projectId: task.project_id,
      });
      return res;
    } catch (err) {
      return { success: false, error: err instanceof Error ? err.message : "An error occurred" };
    }
  }

  // Task sprint quick assignment handler
  async function handleAssignTaskToSprint(taskId: string, targetSprintId: string | null) {
    if (!activeOrgId) return;
    
    const res = await handleUpdateTask(taskId, { sprint_id: targetSprintId });
    if (!res.success) {
      alert(res.error || "Failed to assign task to sprint");
    }
  }

  return {
    router,
    user,
    isLoaded,
    activeOrgId,
    activeOrgName,
    userRole,
    sprints,
    tasks,
    members,
    loading,
    error,
    isModalOpen,
    newSprintName,
    setNewSprintName,
    newSprintGoal,
    setNewSprintGoal,
    newSprintStart,
    setNewSprintStart,
    newSprintEnd,
    setNewSprintEnd,
    modalError,
    creating,
    actionLoadingId,
    selectedTask,
    isDetailsOpen,
    handleSignOut,
    handleCreateSprint,
    handleStatusTransition,
    handleUpdateTask,
    handleDeleteTask,
    handleAssignTaskToSprint,
    openCreateModal,
    closeCreateModal,
    openDetails,
    closeDetails,
  };
}
