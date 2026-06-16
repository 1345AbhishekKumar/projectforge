"use client";

import React, { useState, useEffect, useCallback, use } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { useUser, useAuth } from "@clerk/nextjs";
import { 
  ArrowLeft, 
  User as UserIcon, 
  Loader2, 
  Archive, 
  Calendar, 
  Users, 
  ClipboardList, 
  LogOut, 
  Plus,
  FolderKanban,
  CheckCircle2
} from "lucide-react";

import { OrgSwitcher } from "@/components/orgs/OrgSwitcher";
import { NotificationBell } from "@/components/notifications/NotificationBell";
import { getProjectDetails, updateProject, archiveProject } from "@/actions/project";
import { getOrganizationMembers, type MemberListItem } from "@/actions/membership";
import { createTask, getProjectTasks, updateTask, deleteTask, reorderTasks, type TaskWithAssignee } from "@/actions/task";
import { getSprints } from "@/actions/sprint";
import { CreateTaskModal } from "@/components/tasks/CreateTaskModal";
import { TaskDetailsSheet } from "@/components/tasks/TaskDetailsSheet";
import { Sidebar } from "@/components/layout/Sidebar";
import type { Project, ProjectStatus, TaskStatus, TaskPriority, Sprint } from "@/types";

type Props = {
  params: Promise<{ id: string }>;
};

function getActiveOrgId(): string | null {
  if (typeof document === "undefined") return null;
  const match = document.cookie.match(/active_org_id=([^;]+)/);
  return match ? match[1] : null;
}

export default function KanbanBoardPage({ params }: Props) {
  const router = useRouter();
  const { id: projectId } = use(params);
  const { user, isLoaded } = useUser();
  const { signOut } = useAuth();

  const initialOrgId = getActiveOrgId();
  const [activeOrgId, setActiveOrgId] = useState<string | null>(initialOrgId);
  const [project, setProject] = useState<Project | null>(null);
  const [members, setMembers] = useState<MemberListItem[]>([]);
  const [sprints, setSprints] = useState<Sprint[]>([]);
  const [loading, setLoading] = useState(true);
  const [updatingStatus, setUpdatingStatus] = useState(false);
  const [archiving, setArchiving] = useState(false);
  const [error, setError] = useState("");

  // Task & Board states
  const [tasks, setTasks] = useState<TaskWithAssignee[]>([]);
  const [syncing, setSyncing] = useState(false);
  const [isCreateTaskModalOpen, setIsCreateTaskModalOpen] = useState(false);
  const [preselectedStatus, setPreselectedStatus] = useState<TaskStatus>("TODO");
  const [selectedTask, setSelectedTask] = useState<TaskWithAssignee | null>(null);
  const [isDetailsOpen, setIsDetailsOpen] = useState(false);

  // Drag and drop states
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

  // Handle workspace switcher updates
  const handleRefreshState = useCallback(() => {
    const orgId = getActiveOrgId();
    if (orgId !== activeOrgId) {
      setActiveOrgId(orgId);
      router.push("/projects"); // Force redirect to list on switcher switch
    }
  }, [activeOrgId, router]);

  // Listen for cookie updates from switcher
  useEffect(() => {
    const interval = setInterval(handleRefreshState, 1000);
    return () => clearInterval(interval);
  }, [handleRefreshState]);

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
    dueDate: string | null
  ) {
    if (!activeOrgId || !projectId) return { success: false, error: "Missing context" };
    const res = await createTask(projectId, activeOrgId, title, description, status, priority, assigneeId, dueDate);
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
    }
  ) {
    if (!activeOrgId || !projectId) return { success: false, error: "Missing context" };
    const res = await updateTask(taskId, projectId, activeOrgId, updates);
    if (res.success) {
      loadTasks();
    }
    return res;
  }

  async function handleDeleteTask(taskId: string) {
    if (!activeOrgId || !projectId) return { success: false, error: "Missing context" };
    const res = await deleteTask(taskId, projectId, activeOrgId);
    if (res.success) {
      loadTasks();
    }
    return res;
  }

  // Native HTML5 Drag and Drop Event Handlers
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

    // Reset counters immediately
    setDragOverCounters({
      TODO: 0,
      IN_PROGRESS: 0,
      DONE: 0,
    });

    const draggedTask = tasks.find((t) => t.id === taskId);
    if (!draggedTask) return;

    // Local Optimistic UI update
    let newTasks = [...tasks];
    
    // Filter tasks in the target column (excluding the dragged one)
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

    // Re-insert dragged task at target index
    const updatedDraggedTask = {
      ...draggedTask,
      status: targetStatus,
    };
    targetColumnTasks.splice(targetIndex, 0, updatedDraggedTask);

    // Re-index all tasks in the target column
    const reindexedTargetColumn = targetColumnTasks.map((t, idx) => ({
      ...t,
      board_index: idx,
    }));

    // Update global newTasks array
    newTasks = newTasks.map((t) => {
      if (t.id === taskId) {
        return { ...t, status: targetStatus, board_index: targetIndex };
      }
      const reindexed = reindexedTargetColumn.find((rt) => rt.id === t.id);
      if (reindexed) return reindexed;
      return t;
    });

    // If moved between columns, also re-index the source column tasks to keep them clean
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

    // Apply optimistic state
    setTasks(newTasks);
    setSyncing(true);

    // Persist to Server
    const res = await reorderTasks(projectId, activeOrgId!, reorderPayload);
    if (!res.success) {
      alert(res.error || "Failed to save board reordering");
      loadTasks();
    }
    setSyncing(false);
  };

  const openCreateTaskAtStatus = (status: TaskStatus) => {
    setPreselectedStatus(status);
    setIsCreateTaskModalOpen(true);
  };

  // Deterministic rotation hash for physical sticky-note aesthetic
  const getRotation = (id: string) => {
    let hash = 0;
    for (let i = 0; i < id.length; i++) {
      hash = id.charCodeAt(i) + ((hash << 5) - hash);
    }
    const degs = (hash % 25) / 10; // between -2.5 and +2.5 degrees
    const clamped = Math.max(-1.5, Math.min(1.5, degs));
    return `rotate(${clamped}deg)`;
  };

  // Map priority to sticky-note color variables
  const priorityStickyColors: Record<TaskPriority, string> = {
    LOW: "bg-[#D0E1FD] hover:bg-[#C2D8FC] text-primary shadow-sm", // Muted Blue
    MEDIUM: "bg-[#D4EDDA] hover:bg-[#C6E9CE] text-primary shadow-sm", // Muted Green
    HIGH: "bg-[#FFF2B2] hover:bg-[#FFEAA3] text-primary shadow-sm", // Muted Yellow
    URGENT: "bg-[#FFD2D2] hover:bg-[#FFC4C4] text-primary shadow-sm font-semibold", // Muted Pink
  };

  const priorityColors: Record<TaskPriority, string> = {
    LOW: "bg-white/80 border border-black/20 text-secondary",
    MEDIUM: "bg-white border-2 border-black text-primary",
    HIGH: "bg-white border-2 border-black text-primary font-medium",
    URGENT: "bg-white border-2 border-black text-primary font-bold animate-pulse",
  };

  if (!isLoaded) {
    return (
      <div className="min-h-screen w-full flex items-center justify-center bg-neutral-bg bg-dot-grid text-primary">
        <span className="font-cursive text-xl animate-pulse">Loading board details...</span>
      </div>
    );
  }

  const statusColors: Record<ProjectStatus, string> = {
    PLANNING: "bg-accent-yellow border-2 border-black",
    ACTIVE: "bg-accent-blue border-2 border-black",
    COMPLETED: "bg-accent-green border-2 border-black",
    ARCHIVED: "bg-neutral-bg border border-black/10 opacity-60",
  };

  const statusBadgeColor = project ? statusColors[project.status] : "";

  // Group columns
  const columns: { title: string; status: TaskStatus; items: TaskWithAssignee[] }[] = [
    { 
      title: "To Do", 
      status: "TODO", 
      items: tasks.filter((t) => t.status === "TODO").sort((a, b) => (a.board_index ?? 0) - (b.board_index ?? 0)) 
    },
    { 
      title: "In Progress", 
      status: "IN_PROGRESS", 
      items: tasks.filter((t) => t.status === "IN_PROGRESS").sort((a, b) => (a.board_index ?? 0) - (b.board_index ?? 0)) 
    },
    { 
      title: "Done", 
      status: "DONE", 
      items: tasks.filter((t) => t.status === "DONE").sort((a, b) => (a.board_index ?? 0) - (b.board_index ?? 0)) 
    },
  ];

  return (
    <div className="min-h-screen w-full bg-neutral-bg bg-dot-grid text-primary flex">
      {/* Sidebar - Desktop only */}
      <div className="hidden md:block">
        <Sidebar />
      </div>

      <div className="flex-grow flex flex-col min-h-screen overflow-x-hidden">
        {/* Navbar */}
        <header className="w-full bg-white border-b-2 border-black px-6 py-3 flex items-center justify-between sticky top-0 z-50">
          <div className="flex items-center gap-4">
            {/* Brand Logo - Mobile only */}
            <div className="flex md:hidden items-center gap-2">
              <div className="w-8 h-8 rounded-full bg-tertiary border-2 border-primary flex items-center justify-center font-cursive text-white text-lg font-bold shadow-flat-offset-sm">
                P
              </div>
              <span className="font-cursive text-2xl font-bold tracking-tight">ProjectForge</span>
            </div>

            {/* Org Switcher - Mobile only */}
            <div className="md:hidden">
              <OrgSwitcher />
            </div>
          </div>

          <div className="flex items-center gap-4">
            <NotificationBell />

            <div className="hidden sm:flex items-center gap-2 border-2 border-black rounded-full px-3 py-1 bg-neutral-bg">
              <UserIcon className="h-4 w-4 text-secondary" />
              <span className="font-sans text-xs font-semibold text-secondary">
                {user?.primaryEmailAddress?.emailAddress}
              </span>
            </div>

            <button
              onClick={handleSignOut}
              className="flex items-center gap-2 bg-accent-pink hover:bg-[#FFB2B2] text-primary border-2 border-black font-sans text-xs font-bold px-4 py-2 rounded-full shadow-flat-offset-sm active:translate-y-0.5 hover:-translate-y-0.5 transition-all cursor-pointer"
            >
              <LogOut className="h-3.5 w-3.5" />
              Sign Out
            </button>
          </div>
        </header>

        {/* Mobile Org Switcher */}
        <div className="md:hidden px-6 pt-4">
          <OrgSwitcher />
        </div>

        {/* Main Board Body */}
        <div className="flex-1 w-full mx-auto p-6 md:p-12 flex flex-col gap-6">
          <div>
            <button
              onClick={() => router.push("/projects")}
              className="flex items-center gap-1.5 font-sans text-sm text-secondary hover:text-primary mb-6 transition-colors cursor-pointer"
            >
              <ArrowLeft className="h-4 w-4" />
              Back to Directory
            </button>
          </div>

          {loading ? (
            <div className="bg-white border-2 border-black rounded-sketchy shadow-flat-offset p-12 flex items-center justify-center">
              <Loader2 className="h-8 w-8 animate-spin text-tertiary mr-3" />
              <span className="font-cursive text-xl">Loading project board...</span>
            </div>
          ) : error || !project ? (
            <div className="bg-accent-pink border-2 border-black rounded-sketchy shadow-flat-offset p-8 text-center max-w-lg mx-auto">
              <h2 className="font-cursive text-2xl font-bold mb-2">Access Restrained</h2>
              <p className="font-sans text-sm text-secondary mb-6">
                {error || "We couldn't retrieve this board's coordinates."}
              </p>
              <button
                onClick={() => router.push("/projects")}
                className="bg-white hover:bg-neutral-bg text-primary border-2 border-black font-sans text-xs font-bold px-6 py-2 rounded-full shadow-flat-offset-sm active:translate-y-0.5 hover:-translate-y-0.5 transition-all cursor-pointer"
              >
                Back to Projects
              </button>
            </div>
          ) : (
            <div className="flex flex-col gap-8 flex-1">
              
              {/* Project Title Card */}
              <div className="bg-white border-2 border-black rounded-sketchy shadow-flat-offset p-6 flex flex-col md:flex-row md:items-center justify-between gap-6">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-3 mb-2 flex-wrap">
                    <h1 className="font-cursive text-3xl font-bold tracking-tight truncate">
                      {project.name}
                    </h1>
                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full uppercase ${statusBadgeColor}`}>
                      {project.status}
                    </span>
                    {syncing && (
                      <span className="flex items-center gap-1 text-[10px] text-secondary/70 bg-neutral-bg border border-black/10 px-2 py-0.5 rounded-full">
                        <Loader2 className="h-3 w-3 animate-spin text-tertiary" />
                        Saving changes...
                      </span>
                    )}
                  </div>
                  <p className="font-sans text-sm text-secondary leading-relaxed">
                    {project.description || "No description provided for this project whiteboard board."}
                  </p>
                  <div className="flex items-center gap-2 mt-4 text-[10px] text-secondary/60 font-sans">
                    <Calendar className="h-3.5 w-3.5" />
                    <span>Created: {new Date(project.created_at).toLocaleDateString()}</span>
                    <span>•</span>
                    <span>Updated: {new Date(project.updated_at).toLocaleDateString()}</span>
                  </div>
                </div>

                {/* Action Controls */}
                <div className="flex items-center gap-3 self-start md:self-center shrink-0">
                  {/* Status Changer */}
                  <div className="flex items-center gap-2">
                    <select
                      value={project.status}
                      disabled={updatingStatus}
                      onChange={(e) => handleStatusChange(e.target.value as ProjectStatus)}
                      className="bg-white border-2 border-black rounded-full px-3 py-1.5 font-sans text-xs font-bold shadow-flat-offset-sm focus:outline-none transition-all cursor-pointer disabled:opacity-50"
                    >
                      <option value="PLANNING">PLANNING</option>
                      <option value="ACTIVE">ACTIVE</option>
                      <option value="COMPLETED">COMPLETED</option>
                      <option value="ARCHIVED">ARCHIVED</option>
                    </select>
                    {updatingStatus && (
                      <Loader2 className="h-4 w-4 animate-spin text-secondary" />
                    )}
                  </div>

                  {/* Archive Button */}
                  {project.status !== "ARCHIVED" && (
                    <button
                      onClick={handleArchive}
                      disabled={archiving}
                      className="flex items-center gap-1.5 bg-accent-pink hover:bg-[#FFB2B2] text-primary border-2 border-black font-sans text-xs font-bold px-3 py-2 rounded-full shadow-flat-offset-sm active:translate-y-0.5 hover:-translate-y-0.5 transition-all cursor-pointer disabled:opacity-50"
                    >
                      {archiving ? (
                        <Loader2 className="h-3.5 w-3.5 animate-spin" />
                      ) : (
                        <Archive className="h-3.5 w-3.5" />
                      )}
                      Archive
                    </button>
                  )}
                </div>
              </div>

              {/* Tabs Container */}
              <div className="flex flex-col gap-4 flex-1">
                {/* Tab Headers */}
                <div className="flex border-b-2 border-black gap-2">
                  <button
                    onClick={() => router.push(`/projects/${projectId}`)}
                    className="px-6 py-2.5 text-sm font-bold font-cursive transition-all -mb-0.5 cursor-pointer border-b-2 border-transparent hover:bg-neutral-bg/50 text-secondary"
                  >
                    <span className="flex items-center gap-2">
                      <ClipboardList className="h-4 w-4" />
                      Backlog
                    </span>
                  </button>
                  <button
                    disabled
                    className="px-6 py-2.5 text-sm font-bold font-cursive transition-all -mb-0.5 cursor-default bg-accent-yellow border-2 border-black border-b-0 rounded-t-lg shadow-[0_-2px_0_rgba(0,0,0,1)] text-primary"
                  >
                    <span className="flex items-center gap-2">
                      <FolderKanban className="h-4 w-4" />
                      Board
                    </span>
                  </button>
                  <button
                    onClick={() => router.push(`/projects/${projectId}?tab=members`)}
                    className="px-6 py-2.5 text-sm font-bold font-cursive transition-all -mb-0.5 cursor-pointer border-b-2 border-transparent hover:bg-neutral-bg/50 text-secondary"
                  >
                    <span className="flex items-center gap-2">
                      <Users className="h-4 w-4" />
                      Members
                    </span>
                  </button>
                </div>

                {/* Board Columns Grid */}
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 mt-4 items-start min-h-[60vh]">
                  {columns.map((col) => {
                    const isDragOver = dragOverCounters[col.status] > 0;
                    return (
                      <div
                        key={col.status}
                        onDragOver={handleDragOverColumn}
                        onDragEnter={(e) => handleDragEnterColumn(e, col.status)}
                        onDragLeave={(e) => handleDragLeaveColumn(e, col.status)}
                        onDrop={(e) => handleDrop(e, col.status)}
                        onDoubleClick={() => openCreateTaskAtStatus(col.status)}
                        className={`bg-white border-2 border-black rounded-sketchy p-5 shadow-flat-offset-sm flex flex-col gap-4 min-h-[500px] transition-all duration-150 relative ${
                          isDragOver 
                            ? "bg-accent-yellow/10 border-dashed border-tertiary translate-y-0.5 shadow-none" 
                            : ""
                        }`}
                      >
                        {/* Column Header */}
                        <div className="flex items-center justify-between border-b-2 border-black pb-2 mb-2 select-none">
                          <h3 className="font-cursive text-2xl font-bold flex items-center gap-2">
                            {col.status === "DONE" && <CheckCircle2 className="h-5 w-5 text-accent-green" />}
                            {col.title}
                          </h3>
                          <div className="flex items-center gap-2">
                            <span className="bg-neutral-bg border-2 border-black text-xs font-bold px-2 py-0.5 rounded-full">
                              {col.items.length}
                            </span>
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                openCreateTaskAtStatus(col.status);
                              }}
                              className="p-1 rounded-full border border-black/20 hover:border-black hover:bg-neutral-bg transition-colors"
                              title={`Create task in ${col.title}`}
                            >
                              <Plus className="h-3.5 w-3.5" />
                            </button>
                          </div>
                        </div>

                        {/* Column Cards List */}
                        <div className="flex flex-col gap-4 flex-grow">
                          {col.items.length === 0 ? (
                            <div className="flex-grow flex flex-col items-center justify-center border-2 border-dashed border-black/10 rounded-sketchy-sm p-8 bg-neutral-bg/20 select-none">
                              <p className="font-sans text-xs text-secondary/60 italic text-center">
                                Drop tasks here or double-click to create
                              </p>
                            </div>
                          ) : (
                            col.items.map((task) => {
                              const isOverdue = task.due_date && new Date(task.due_date) < new Date() && task.status !== "DONE";
                              const formattedDate = task.due_date
                                ? new Date(task.due_date).toLocaleDateString("en-US", {
                                    month: "short",
                                    day: "numeric",
                                  })
                                : null;

                              // Verify if task belongs to a completed sprint
                              const isLocked = task.sprint_id && sprints.find((s) => s.id === task.sprint_id)?.status === "COMPLETED";

                              return (
                                <div
                                  key={task.id}
                                  draggable={!isLocked}
                                  onDragStart={(e) => handleDragStart(e, task.id)}
                                  onDragEnd={handleDragEnd}
                                  onDragOver={(e) => handleDragOverCard(e)}
                                  onDrop={(e) => handleDrop(e, col.status, task.id)}
                                  onClick={() => {
                                    setSelectedTask(task);
                                    setIsDetailsOpen(true);
                                  }}
                                  style={{ transform: getRotation(task.id) }}
                                  className={`p-5 border-2 border-black rounded-sketchy-sm cursor-grab active:cursor-grabbing transition-all duration-150 select-none relative ${
                                    priorityStickyColors[task.priority]
                                  } ${draggedTaskId === task.id ? "opacity-30 border-dashed border-black/40 scale-95" : ""}`}
                                >
                                  {/* Locked Badge */}
                                  {isLocked && (
                                    <div className="absolute top-2 right-2 bg-neutral-bg border border-black/20 rounded-full p-1" title="Sprint completed - locked">
                                      <span className="text-[8px] font-bold text-secondary">🔒</span>
                                    </div>
                                  )}

                                  {/* Task Title */}
                                  <h4 className={`font-sans font-bold text-sm leading-tight mb-2 tracking-tight ${
                                    task.status === "DONE" ? "line-through text-secondary/50" : ""
                                  }`}>
                                    {task.title}
                                  </h4>

                                  {/* Description Snippet */}
                                  {task.description && (
                                    <p className="font-sans text-xs text-secondary/80 line-clamp-2 mb-3 leading-snug">
                                      {task.description}
                                    </p>
                                  )}

                                  {/* Footer Meta Row */}
                                  <div className="flex items-center justify-between mt-auto pt-3 border-t border-black/10 gap-2">
                                    <div className="flex items-center gap-1.5 flex-wrap">
                                      {/* Priority Badge */}
                                      <span className={`text-[8px] font-bold px-1.5 py-0.5 rounded-full uppercase ${priorityColors[task.priority]}`}>
                                        {task.priority}
                                      </span>

                                      {/* Due Date Indicator */}
                                      {formattedDate && (
                                        <span 
                                          className={`flex items-center gap-0.5 text-[9px] px-1.5 py-0.5 rounded-full border border-black font-sans font-bold ${
                                            isOverdue
                                              ? "bg-accent-pink text-primary animate-pulse"
                                              : "bg-white text-secondary"
                                          }`}
                                        >
                                          <Calendar className="h-2.5 w-2.5 shrink-0" />
                                          {formattedDate}
                                        </span>
                                      )}
                                    </div>

                                    {/* Assignee Avatar */}
                                    <div className="w-6.5 h-6.5 rounded-full border border-black bg-white flex items-center justify-center overflow-hidden shrink-0 relative shadow-sm">
                                      {task.assignee ? (
                                        task.assignee.avatar_url ? (
                                          <Image
                                            src={task.assignee.avatar_url}
                                            alt={task.assignee.full_name || "Assignee"}
                                            width={26}
                                            height={26}
                                            unoptimized
                                            className="w-full h-full object-cover"
                                          />
                                        ) : (
                                          <span className="font-cursive font-bold text-[10px] text-primary">
                                            {(task.assignee.full_name || task.assignee.email).charAt(0).toUpperCase()}
                                          </span>
                                        )
                                      ) : (
                                        <UserIcon className="h-3 w-3 text-secondary/40" />
                                      )}
                                    </div>
                                  </div>
                                </div>
                              );
                            })
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

            </div>
          )}
        </div>

        {/* Create Task Modal */}
        <CreateTaskModal
          isOpen={isCreateTaskModalOpen}
          onClose={() => setIsCreateTaskModalOpen(false)}
          members={members}
          onCreate={handleCreateTask}
          defaultStatus={preselectedStatus}
        />

        {/* Task Details Sheet */}
        <TaskDetailsSheet
          task={selectedTask}
          isOpen={isDetailsOpen}
          onClose={() => {
            setIsDetailsOpen(false);
            setSelectedTask(null);
          }}
          members={members}
          sprints={sprints}
          onUpdate={handleUpdateTask}
          onDelete={handleDeleteTask}
        />
      </div>
    </div>
  );
}

// Dummy helper so React dragover doesn't trigger card reordering conflicts
const handleDragOverCard = (e: React.DragEvent) => {
  e.preventDefault();
};
