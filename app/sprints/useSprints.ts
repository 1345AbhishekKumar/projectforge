"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useUser, useAuth } from "@clerk/nextjs";
import { useOrgStore } from "@/store/orgStore";
import { useSprintStore } from "@/store/sprintStore";
import { useTaskStore } from "@/store/taskStore";
import { getOrganizationMembers, type MemberListItem } from "@/actions/membership";
import { getUserOrganizations } from "@/actions/org";
import { getSprints, createSprint, updateSprintStatus } from "@/actions/sprint";
import { getOrganizationTasks, updateTask, deleteTask, type TaskWithAssignee } from "@/actions/task";
import type { Sprint, SprintStatus, TaskStatus, TaskPriority } from "@/types";

function getActiveOrgId(): string | null {
  if (typeof document === "undefined") return null;
  const match = document.cookie.match(/active_org_id=([^;]+)/);
  return match ? match[1] : null;
}

export function useSprints() {
  const router = useRouter();
  const { user, isLoaded } = useUser();
  const { signOut } = useAuth();

  const { activeOrgId, setActiveOrgId } = useOrgStore();
  const { isCreateModalOpen: isModalOpen, actionLoadingId, openCreateModal, closeCreateModal, setActionLoadingId } = useSprintStore();
  const { selectedTask, isDetailsOpen, openDetails, closeDetails } = useTaskStore();

  const [activeOrgName, setActiveOrgName] = useState<string>("");
  const [userRole, setUserRole] = useState<string>("MEMBER");
  
  const [sprints, setSprints] = useState<Sprint[]>([]);
  const [tasks, setTasks] = useState<TaskWithAssignee[]>([]);
  const [members, setMembers] = useState<MemberListItem[]>([]);
  
  const [loading, setLoading] = useState(!!activeOrgId);
  const [error, setError] = useState("");
  
  // Modal states
  const [newSprintName, setNewSprintName] = useState("");
  const [newSprintGoal, setNewSprintGoal] = useState("");
  const [newSprintStart, setNewSprintStart] = useState("");
  const [newSprintEnd, setNewSprintEnd] = useState("");
  const [modalError, setModalError] = useState("");
  const [creating, setCreating] = useState(false);

  // Sync activeOrgId from cookie if store is empty on init
  useEffect(() => {
    if (!activeOrgId) {
      const cookieOrgId = getActiveOrgId();
      if (cookieOrgId) {
        setActiveOrgId(cookieOrgId);
      }
    }
  }, [activeOrgId, setActiveOrgId]);

  const handleSignOut = async () => {
    await signOut();
    router.push("/sign-in");
  };

  // Fetch workspace data when activeOrgId changes
  useEffect(() => {
    if (!activeOrgId) {
      const timer = setTimeout(() => {
        setSprints([]);
        setTasks([]);
        setMembers([]);
        setActiveOrgName("");
        setUserRole("MEMBER");
        setLoading(false);
      }, 0);
      return () => clearTimeout(timer);
    }

    async function loadWorkspaceData() {
      setLoading(true);
      setError("");

      try {
        const [sprintsRes, tasksRes, membersRes, orgsRes] = await Promise.all([
          getSprints(activeOrgId!),
          getOrganizationTasks(activeOrgId!),
          getOrganizationMembers(activeOrgId!),
          getUserOrganizations(),
        ]);

        if (sprintsRes.success) setSprints(sprintsRes.data);
        if (tasksRes.success) setTasks(tasksRes.data);
        if (membersRes.success) setMembers(membersRes.data);

        if (orgsRes.success) {
          const currentOrg = orgsRes.data.find((o) => o.id === activeOrgId);
          if (currentOrg) {
            setActiveOrgName(currentOrg.name);
            setUserRole(currentOrg.role);
          }
        }

        if (!sprintsRes.success || !tasksRes.success || !membersRes.success) {
          setError("Failed to fetch complete workspace sprint iteration data.");
        }
      } catch {
        setError("An error occurred connecting to the service backend.");
      } finally {
        setLoading(false);
      }
    }

    loadWorkspaceData();
  }, [activeOrgId]);

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

      const res = await createSprint(
        activeOrgId,
        newSprintName,
        newSprintGoal || null,
        formattedStart,
        formattedEnd
      );

      if (res.success) {
        closeCreateModal();
        setNewSprintName("");
        setNewSprintGoal("");
        setNewSprintStart("");
        setNewSprintEnd("");
        
        // Reload Sprints list
        const sprintsRes = await getSprints(activeOrgId);
        if (sprintsRes.success) setSprints(sprintsRes.data);
      } else {
        setModalError(res.error || "Failed to create sprint");
      }
    } catch {
      setModalError("An unexpected error occurred");
    } finally {
      setCreating(false);
    }
  }

  // Update sprint status action handler (start/complete)
  async function handleStatusTransition(sprintId: string, status: SprintStatus) {
    if (!activeOrgId) return;
    
    setActionLoadingId(sprintId);
    try {
      const res = await updateSprintStatus(activeOrgId, sprintId, status);
      if (res.success) {
        // Refresh data
        const sprintsRes = await getSprints(activeOrgId);
        if (sprintsRes.success) setSprints(sprintsRes.data);
      } else {
        alert(res.error || `Failed to transition sprint status to ${status}`);
      }
    } catch {
      alert("An unexpected error occurred updating status");
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

    const res = await updateTask(taskId, task.project_id, activeOrgId, updates);
    if (res.success) {
      const tasksRes = await getOrganizationTasks(activeOrgId);
      if (tasksRes.success) setTasks(tasksRes.data);
    }
    return res;
  }

  // Task inline delete handler
  async function handleDeleteTask(taskId: string) {
    if (!activeOrgId) return { success: false, error: "Missing context" };

    const task = tasks.find((t) => t.id === taskId);
    if (!task) return { success: false, error: "Task not found" };

    const res = await deleteTask(taskId, task.project_id, activeOrgId);
    if (res.success) {
      const tasksRes = await getOrganizationTasks(activeOrgId);
      if (tasksRes.success) setTasks(tasksRes.data);
    }
    return res;
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
