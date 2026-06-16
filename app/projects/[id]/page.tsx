"use client";

import React, { useState, useEffect, use } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { useUser, useAuth } from "@clerk/nextjs";
import { ArrowLeft, User as UserIcon, Loader2, Archive, Calendar, Users, ClipboardList, LogOut, Plus, FolderKanban, Activity } from "lucide-react";

import { OrgSwitcher } from "@/components/orgs/OrgSwitcher";
import { NotificationBell } from "@/components/notifications/NotificationBell";
import { getProjectDetails, updateProject, archiveProject } from "@/actions/project";
import { getOrganizationMembers, type MemberListItem } from "@/actions/membership";
import { createTask, getProjectTasks, updateTask, deleteTask, type TaskWithAssignee } from "@/actions/task";
import { getSprints } from "@/actions/sprint";
import { getLabels } from "@/actions/label";
import { getSavedViews, createSavedView, deleteSavedView } from "@/actions/savedView";
import { TaskFilters, initialFilters } from "@/components/tasks/TaskFilters";
import { CreateTaskModal } from "@/components/tasks/CreateTaskModal";
import { TaskList } from "@/components/tasks/TaskList";
import { TaskDetailsSheet } from "@/components/tasks/TaskDetailsSheet";
import { Sidebar } from "@/components/layout/Sidebar";
import type { Project, ProjectStatus, TaskStatus, TaskPriority, Sprint, Label, SavedView } from "@/types";


type Props = {
  params: Promise<{ id: string }>;
};

import { useOrgStore } from "@/store/orgStore";
import { useTaskStore } from "@/store/taskStore";
import { useTaskFilterStore } from "@/store/taskFilterStore";

export default function ProjectDetailsPage({ params }: Props) {
  const router = useRouter();
  const { id: projectId } = use(params);
  const { user, isLoaded } = useUser();
  const { signOut } = useAuth();

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

  const queryClient = useQueryClient();

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

  const [activeTab, setActiveTab] = useState<"backlog" | "members">("backlog");

  // Synchronize tab from URL search parameters on mount
  useEffect(() => {
    if (typeof window !== "undefined") {
      const params = new URLSearchParams(window.location.search);
      const tab = params.get("tab");
      if (tab === "members" || tab === "backlog") {
        const timer = setTimeout(() => {
          setActiveTab(tab as "backlog" | "members");
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
    const newStatus: TaskStatus = task.status === "DONE" ? "TODO" : "DONE";
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

      {/* Main Details Body */}
      <div className="flex-1 max-w-6xl w-full mx-auto p-6 md:p-12 flex flex-col gap-6">
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
          <div className="flex flex-col gap-8">
            
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

            {/* Tabs & Tab Content */}
            <div className="flex flex-col gap-4">
              
              {/* Tab Headers */}
              <div className="flex border-b-2 border-black gap-2">
                <button
                  onClick={() => setActiveTab("backlog")}
                  className={`px-6 py-2.5 text-sm font-bold font-cursive transition-all -mb-0.5 cursor-pointer ${
                    activeTab === "backlog"
                      ? "bg-accent-yellow border-2 border-black border-b-0 rounded-t-lg shadow-[0_-2px_0_rgba(0,0,0,1)]"
                      : "border-b-2 border-transparent hover:bg-neutral-bg/50 px-6 py-2.5 text-secondary"
                  }`}
                >
                  <span className="flex items-center gap-2">
                    <ClipboardList className="h-4 w-4" />
                    Backlog
                  </span>
                </button>
                <button
                  onClick={() => router.push(`/projects/${projectId}/board`)}
                  className="px-6 py-2.5 text-sm font-bold font-cursive transition-all -mb-0.5 cursor-pointer border-b-2 border-transparent hover:bg-neutral-bg/50 text-secondary"
                >
                  <span className="flex items-center gap-2">
                    <FolderKanban className="h-4 w-4" />
                    Board
                  </span>
                </button>
                <button
                  onClick={() => setActiveTab("members")}
                  className={`px-6 py-2.5 text-sm font-bold font-cursive transition-all -mb-0.5 cursor-pointer ${
                    activeTab === "members"
                      ? "bg-accent-yellow border-2 border-black border-b-0 rounded-t-lg shadow-[0_-2px_0_rgba(0,0,0,1)]"
                      : "border-b-2 border-transparent hover:bg-neutral-bg/50 px-6 py-2.5 text-secondary"
                  }`}
                >
                  <span className="flex items-center gap-2">
                    <Users className="h-4 w-4" />
                    Members
                  </span>
                </button>
                <button
                  onClick={() => router.push(`/projects/${projectId}/activity`)}
                  className="px-6 py-2.5 text-sm font-bold font-cursive transition-all -mb-0.5 cursor-pointer border-b-2 border-transparent hover:bg-neutral-bg/50 text-secondary"
                >
                  <span className="flex items-center gap-2">
                    <Activity className="h-4 w-4" />
                    Activity
                  </span>
                </button>
              </div>

              {/* Tab Content Body */}
              <div className="mt-2">
                
                {/* Backlog Tab Content */}
                {activeTab === "backlog" && (
                  <div className="flex flex-col gap-6">
                    {/* Toolbar */}
                    <div className="flex flex-col gap-4">
                      <div className="flex items-center justify-between">
                        <h2 className="font-cursive text-2xl font-bold">Project Backlog</h2>
                        <button
                          onClick={() => openCreateModal("TODO")}
                          className="flex items-center justify-center gap-1.5 bg-accent-yellow hover:bg-[#FFE680] text-primary border-2 border-black font-sans text-xs font-bold px-4 py-2 rounded-full shadow-flat-offset-sm active:translate-y-0.5 hover:-translate-y-0.5 transition-all cursor-pointer"
                        >
                          <Plus className="h-4 w-4" />
                          Create Task
                        </button>
                      </div>

                      <TaskFilters
                        members={members}
                        labels={labels}
                        savedViews={savedViews}
                        activeFilters={activeFilters}
                        onFiltersChange={(filters) => {
                          setFilters(projectId, filters);
                          const matchedView = savedViews.find(v => JSON.stringify(v.filters) === JSON.stringify(filters));
                          setActiveView(projectId, matchedView ? matchedView.name : "");
                        }}
                        onSaveView={handleSaveView}
                        onDeleteView={handleDeleteView}
                        activeViewName={activeViewName}
                        onClearViewName={() => setActiveView(projectId, "")}
                      />
                    </div>

                    {loadingTasks ? (
                      <div className="bg-white border-2 border-black rounded-sketchy shadow-flat-offset p-12 flex items-center justify-center">
                        <Loader2 className="h-8 w-8 animate-spin text-tertiary mr-3" />
                        <span className="font-cursive text-xl">Loading backlog...</span>
                      </div>
                    ) : filteredTasks.length === 0 ? (
                      <div className="bg-white border-2 border-black rounded-sketchy shadow-flat-offset p-8 md:p-12 text-center max-w-lg mx-auto">
                        <div className="w-16 h-16 rounded-full bg-accent-yellow border-2 border-black flex items-center justify-center mx-auto mb-4 rotate-[1.5deg] shadow-flat-offset-sm">
                          <ClipboardList className="h-8 w-8 text-primary" />
                        </div>
                        <h3 className="font-cursive text-2xl font-bold mb-2">No Tasks Match Filters</h3>
                        <p className="font-sans text-sm text-secondary mb-6 leading-relaxed">
                          We couldn&apos;t find any tasks mapping to your current filter specification. Try clearing filters or creating a task.
                        </p>
                        <button
                          onClick={() => {
                            clearFilters(projectId);
                          }}
                          className="bg-accent-yellow hover:bg-[#FFE680] text-primary border-2 border-black font-sans text-xs font-bold px-5 py-2 rounded-full shadow-flat-offset-sm active:translate-y-0.5 hover:-translate-y-0.5 transition-all cursor-pointer"
                        >
                          Clear Filters
                        </button>
                      </div>
                    ) : (
                      <TaskList
                        tasks={filteredTasks}
                        onTaskClick={openDetails}
                        onStatusToggle={handleStatusToggle}
                      />
                    )}
                  </div>
                )}

                {/* Members Tab Content */}
                {activeTab === "members" && (
                  <div className="bg-white border-2 border-black rounded-sketchy shadow-flat-offset p-6">
                    <h2 className="font-cursive text-2xl font-bold mb-2">Workspace Collaborators</h2>
                    <p className="font-sans text-xs text-secondary mb-6">
                      Members of the active workspace with permission to collaborate on this board scope.
                    </p>

                    {loadingMembers ? (
                      <div className="flex items-center justify-center py-8">
                        <Loader2 className="h-6 w-6 animate-spin text-tertiary mr-2" />
                        <span className="font-cursive text-base">Retrieving members...</span>
                      </div>
                    ) : (
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {members.map((member) => (
                          <div
                            key={member.id}
                            className="flex items-center gap-3 p-3 border-2 border-black rounded-sketchy-sm bg-neutral-bg/30 hover:bg-neutral-bg/60 transition-colors"
                          >
                            {member.avatarUrl ? (
                              <Image
                                src={member.avatarUrl}
                                alt={member.name}
                                width={36}
                                height={36}
                                className="w-9 h-9 rounded-full border-2 border-black object-cover"
                              />
                            ) : (
                              <div className="w-9 h-9 rounded-full bg-accent-yellow border-2 border-black flex items-center justify-center font-cursive font-bold text-sm">
                                {member.name.charAt(0)}
                              </div>
                            )}
                            <div>
                              <span className="font-semibold block text-sm font-sans flex items-center gap-1.5">
                                {member.name}
                                {member.userId === user?.id && (
                                  <span className="text-[10px] bg-neutral-bg border border-black/10 px-1 py-0.2 rounded text-secondary font-normal font-sans">
                                    (you)
                                  </span>
                                )}
                              </span>
                              <span className="text-xs text-secondary block font-sans">{member.email}</span>
                            </div>
                            <span className="bg-accent-blue border border-black/20 text-[9px] font-bold px-2 py-0.5 rounded-full uppercase ml-auto">
                              {member.role}
                            </span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}

              </div>
            </div>

          </div>
        )}
      </div>

      {/* Create Task Modal */}
      <CreateTaskModal
        isOpen={isCreateTaskModalOpen}
        onClose={closeCreateModal}
        members={members}
        orgId={activeOrgId || ""}
        onCreate={handleCreateTask}
      />

      {/* Task Details Sheet */}
      <TaskDetailsSheet
        task={selectedTask}
        isOpen={isDetailsOpen}
        onClose={closeDetails}
        members={members}
        sprints={sprints}
        onUpdate={handleUpdateTask}
        onDelete={handleDeleteTask}
      />
      </div>
    </div>
  );
}
