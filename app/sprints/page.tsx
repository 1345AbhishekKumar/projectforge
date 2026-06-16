"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useUser, useAuth } from "@clerk/nextjs";
import { LogOut, User as UserIcon, Calendar, Loader2, Plus, Play, CheckCircle2 } from "lucide-react";

import { OrgSwitcher } from "@/components/orgs/OrgSwitcher";
import { NotificationBell } from "@/components/notifications/NotificationBell";
import { Sidebar } from "@/components/layout/Sidebar";
import { TaskDetailsSheet } from "@/components/tasks/TaskDetailsSheet";
import { getOrganizationMembers, type MemberListItem } from "@/actions/membership";
import { getSprints, createSprint, updateSprintStatus } from "@/actions/sprint";
import { getOrganizationTasks, updateTask, deleteTask, type TaskWithAssignee } from "@/actions/task";
import type { Sprint, SprintStatus, TaskStatus, TaskPriority } from "@/types";

import { useOrgStore } from "@/store/orgStore";
import { useTaskStore } from "@/store/taskStore";
import { useSprintStore } from "@/store/sprintStore";

export default function SprintsPage() {
  const router = useRouter();
  const { user, isLoaded } = useUser();
  const { signOut } = useAuth();

  const { activeOrgId, activeOrgName, userRole } = useOrgStore();
  const { selectedTask, isDetailsOpen, openDetails, closeDetails } = useTaskStore();
  const { isCreateModalOpen: isModalOpen, openCreateModal, closeCreateModal, actionLoadingId, setActionLoadingId } = useSprintStore();
  
  const [sprints, setSprints] = useState<Sprint[]>([]);
  const [tasks, setTasks] = useState<TaskWithAssignee[]>([]);
  const [members, setMembers] = useState<MemberListItem[]>([]);
  
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  
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

  // Fetch workspace data (sprints, tasks, members, and org details) when activeOrgId changes
  useEffect(() => {
    if (!activeOrgId) {
      const timer = setTimeout(() => {
        setSprints([]);
        setTasks([]);
        setMembers([]);
        setLoading(false);
      }, 0);
      return () => clearTimeout(timer);
    }

    async function loadWorkspaceData() {
      setLoading(true);
      setError("");

      try {
        const [sprintsRes, tasksRes, membersRes] = await Promise.all([
          getSprints(activeOrgId!),
          getOrganizationTasks(activeOrgId!),
          getOrganizationMembers(activeOrgId!)
        ]);

        if (sprintsRes.success && sprintsRes.data) setSprints(sprintsRes.data);
        if (tasksRes.success && tasksRes.data) setTasks(tasksRes.data);
        if (membersRes.success && membersRes.data) setMembers(membersRes.data);

        if (!sprintsRes.success || !tasksRes.success || !membersRes.success) {
          setError("Failed to load workspace sprint data");
        }
      } catch {
        setError("An unexpected error occurred loading data");
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

    if (!newSprintName || newSprintName.length < 3) {
      setModalError("Sprint name must be at least 3 characters");
      return;
    }
    if (!newSprintStart || !newSprintEnd) {
      setModalError("Please select start and end dates");
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
    
    // Find task to get its projectId
    const task = tasks.find(t => t.id === taskId);
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

    const task = tasks.find(t => t.id === taskId);
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

  if (!isLoaded) {
    return (
      <div className="min-h-screen w-full flex items-center justify-center bg-neutral-bg bg-dot-grid text-primary">
        <span className="font-cursive text-xl animate-pulse">Loading directory...</span>
      </div>
    );
  }

  // Filter sprints by status
  const activeSprints = sprints.filter(s => s.status === "ACTIVE");
  const plannedSprints = sprints.filter(s => s.status === "PLANNED");
  const completedSprints = sprints.filter(s => s.status === "COMPLETED" || s.status === "CANCELLED");

  // Get unassigned tasks (backlog)
  const backlogTasks = tasks.filter(t => !t.sprint_id);

  // Group sprints by status sections
  const isAuthorized = userRole === "OWNER" || userRole === "ADMIN";

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

        {/* Main Content Container */}
        <div className="flex-1 max-w-6xl w-full mx-auto p-6 md:p-12 flex flex-col gap-8">
          {!activeOrgId ? (
            <div className="bg-white border-2 border-black rounded-sketchy shadow-flat-offset p-8 text-center max-w-lg mx-auto mt-8">
              <div className="w-12 h-12 rounded-full bg-accent-pink border-2 border-black flex items-center justify-center mx-auto mb-4 shadow-flat-offset-sm">
                <Calendar className="h-6 w-6" />
              </div>
              <h2 className="font-cursive text-2xl font-bold mb-2">No Active Workspace</h2>
              <p className="font-sans text-sm text-secondary mb-6">
                Please select or create an organization workspace to view and manage team sprint iterations.
              </p>
              <button
                onClick={() => router.push("/orgs/create")}
                className="bg-accent-yellow hover:bg-[#FFE680] text-primary border-2 border-black font-sans text-sm font-bold px-6 py-2.5 rounded-full shadow-flat-offset-sm active:translate-y-0.5 hover:-translate-y-0.5 transition-all cursor-pointer"
              >
                Create New Workspace
              </button>
            </div>
          ) : (
            <div className="flex flex-col gap-6">
              {/* Header Action Section */}
              <div className="bg-white border-2 border-black rounded-sketchy shadow-flat-offset p-6 flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                  <h1 className="font-cursive text-3xl font-bold mb-1">
                    Sprint Planner: <span className="underline decoration-tertiary decoration-2">{activeOrgName}</span>
                  </h1>
                  <p className="font-sans text-xs text-secondary">
                    Plan time-boxed sprint iterations, set targets, and scope task velocity.
                  </p>
                </div>
                {isAuthorized && (
                  <button
                    onClick={openCreateModal}
                    className="flex items-center justify-center gap-1.5 self-start md:self-center bg-tertiary hover:bg-tertiary-hover text-white border-2 border-black font-sans text-xs font-bold px-4 py-2.5 rounded-full shadow-flat-offset-sm active:translate-y-0.5 hover:-translate-y-0.5 transition-all cursor-pointer"
                  >
                    <Plus className="h-4 w-4" />
                    New Sprint
                  </button>
                )}
              </div>

              {error && (
                <div className="bg-accent-pink border-2 border-black rounded-sketchy-sm p-4 text-center">
                  <p className="font-sans text-sm font-semibold">{error}</p>
                </div>
              )}

              {loading ? (
                <div className="bg-white border-2 border-black rounded-sketchy shadow-flat-offset p-12 flex items-center justify-center">
                  <Loader2 className="h-8 w-8 animate-spin text-tertiary mr-3" />
                  <span className="font-cursive text-xl">Loading sprints...</span>
                </div>
              ) : (
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-start">
                  
                  {/* Left & Middle Column: Sprints List */}
                  <div className="lg:col-span-2 flex flex-col gap-8">
                    
                    {/* Active Sprint Section */}
                    <div className="bg-white border-2 border-black rounded-sketchy p-6 shadow-flat-offset-sm flex flex-col gap-4">
                      <div className="flex items-center justify-between border-b-2 border-black pb-2">
                        <h2 className="font-cursive text-2xl font-bold">Active Sprint</h2>
                        <span className="bg-accent-green border-2 border-black text-[10px] font-bold px-2 py-0.5 rounded-full uppercase">
                          {activeSprints.length} Active
                        </span>
                      </div>
                      
                      {activeSprints.length === 0 ? (
                        <div className="text-center py-8 bg-neutral-bg/30 border-2 border-dashed border-black/10 rounded-sketchy-sm">
                          <p className="font-sans text-sm text-secondary italic">No active sprint is running right now.</p>
                        </div>
                      ) : (
                        <div className="flex flex-col gap-4">
                          {activeSprints.map((sprint) => {
                            const sprintTasks = tasks.filter(t => t.sprint_id === sprint.id);
                            const completedTasksCount = sprintTasks.filter(t => t.status === "DONE").length;
                            
                            return (
                              <div key={sprint.id} className="border-2 border-black rounded-sketchy-sm p-4 bg-accent-blue/10 flex flex-col gap-3">
                                <div className="flex items-start justify-between gap-4">
                                  <div>
                                    <h3 className="font-cursive text-xl font-bold">{sprint.name}</h3>
                                    {sprint.goal && <p className="font-sans text-xs text-secondary mb-1">Goal: {sprint.goal}</p>}
                                    <p className="font-sans text-[10px] text-secondary/70">
                                      Timeline: {new Date(sprint.start_date).toLocaleDateString()} - {new Date(sprint.end_date).toLocaleDateString()}
                                    </p>
                                  </div>
                                  
                                  {isAuthorized && (
                                    <button
                                      onClick={() => handleStatusTransition(sprint.id, "COMPLETED")}
                                      disabled={actionLoadingId === sprint.id}
                                      className="flex items-center gap-1 py-1 px-3 bg-accent-green hover:bg-[#B5E6C0] text-primary border-2 border-black rounded-full font-sans text-[10px] font-bold shadow-flat-offset-xs active:translate-y-0.5 hover:-translate-y-0.5 transition-all cursor-pointer disabled:opacity-40"
                                    >
                                      {actionLoadingId === sprint.id ? (
                                        <Loader2 className="h-3.5 w-3.5 animate-spin" />
                                      ) : (
                                        <CheckCircle2 className="h-3.5 w-3.5" />
                                      )}
                                      Complete Sprint
                                    </button>
                                  )}
                                </div>

                                {/* Progress Bar */}
                                <div className="flex flex-col gap-1">
                                  <div className="flex items-center justify-between text-[10px] font-bold">
                                    <span>Task Progress</span>
                                    <span>{completedTasksCount} / {sprintTasks.length} Done</span>
                                  </div>
                                  <div className="w-full bg-neutral-dot border-2 border-black rounded-full h-3 overflow-hidden relative">
                                    <div
                                      className="bg-accent-green h-full border-r-2 border-black transition-all duration-300"
                                      style={{ width: `${sprintTasks.length ? (completedTasksCount / sprintTasks.length) * 100 : 0}%` }}
                                    />
                                  </div>
                                </div>

                                {/* Task list in active sprint */}
                                <div className="flex flex-col gap-2 mt-2">
                                  <label className="font-sans text-[10px] font-bold text-secondary uppercase">Tasks</label>
                                  {sprintTasks.length === 0 ? (
                                    <p className="font-sans text-xs text-secondary/60 italic">No tasks assigned to this active sprint.</p>
                                  ) : (
                                    <div className="flex flex-col gap-1.5 max-h-48 overflow-y-auto pr-1">
                                      {sprintTasks.map((task) => (
                                        <div
                                          key={task.id}
                                          onClick={() => {
                                            openDetails(task);
                                          }}
                                          className="flex items-center justify-between p-2.5 border border-black/20 rounded-sketchy-sm bg-white hover:bg-neutral-bg/30 transition-all cursor-pointer shadow-flat-offset-xs hover:-translate-y-0.5 active:translate-y-0"
                                        >
                                          <span className="font-sans text-xs font-bold truncate flex-1">{task.title}</span>
                                          <div className="flex items-center gap-1.5 flex-shrink-0">
                                            {task.assignee ? (
                                              <div className="w-5 h-5 rounded-full border border-black flex items-center justify-center bg-accent-blue text-[8px] font-bold overflow-hidden" title={task.assignee.full_name || "Assignee"}>
                                                {task.assignee.avatar_url ? (
                                                  /* eslint-disable-next-line @next/next/no-img-element */
                                                  <img src={task.assignee.avatar_url} alt="avatar" className="w-full h-full object-cover" />
                                                ) : (
                                                  task.assignee.full_name?.substring(0, 2) || "U"
                                                )}
                                              </div>
                                            ) : (
                                              <div className="w-5 h-5 rounded-full border border-black/20 flex items-center justify-center bg-white text-[8px]" title="Unassigned">👤</div>
                                            )}
                                            <span className={`text-[8px] font-bold px-1.5 py-0.5 rounded border border-black ${
                                              task.status === "DONE" ? "bg-accent-green" : task.status === "IN_PROGRESS" ? "bg-accent-blue" : "bg-white"
                                            }`}>{task.status}</span>
                                          </div>
                                        </div>
                                      ))}
                                    </div>
                                  )}
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </div>

                    {/* Planned Sprints Section */}
                    <div className="bg-white border-2 border-black rounded-sketchy p-6 shadow-flat-offset-sm flex flex-col gap-4">
                      <div className="flex items-center justify-between border-b-2 border-black pb-2">
                        <h2 className="font-cursive text-2xl font-bold">Planned Sprints</h2>
                        <span className="bg-accent-yellow border-2 border-black text-[10px] font-bold px-2 py-0.5 rounded-full uppercase">
                          {plannedSprints.length} Planned
                        </span>
                      </div>

                      {plannedSprints.length === 0 ? (
                        <div className="text-center py-8 bg-neutral-bg/30 border-2 border-dashed border-black/10 rounded-sketchy-sm">
                          <p className="font-sans text-sm text-secondary italic">No planned sprints yet.</p>
                        </div>
                      ) : (
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          {plannedSprints.map((sprint) => {
                            const sprintTasks = tasks.filter(t => t.sprint_id === sprint.id);
                            
                            return (
                              <div key={sprint.id} className="border-2 border-black rounded-sketchy-sm p-4 bg-accent-yellow/5 flex flex-col gap-3 hover:rotate-[0.5deg] transition-all">
                                <div className="flex items-start justify-between gap-2">
                                  <div>
                                    <h3 className="font-cursive text-lg font-bold">{sprint.name}</h3>
                                    {sprint.goal && <p className="font-sans text-xs text-secondary/80 line-clamp-1">Goal: {sprint.goal}</p>}
                                    <p className="font-sans text-[10px] text-secondary/60">
                                      Timeline: {new Date(sprint.start_date).toLocaleDateString()} - {new Date(sprint.end_date).toLocaleDateString()}
                                    </p>
                                  </div>
                                  
                                  {isAuthorized && (
                                    <button
                                      onClick={() => handleStatusTransition(sprint.id, "ACTIVE")}
                                      disabled={actionLoadingId === sprint.id}
                                      className="flex items-center gap-1 py-1 px-2.5 bg-accent-yellow hover:bg-[#FFE680] text-primary border-2 border-black rounded-full font-sans text-[9px] font-bold shadow-flat-offset-xs active:translate-y-0.5 hover:-translate-y-0.5 transition-all cursor-pointer disabled:opacity-40 flex-shrink-0"
                                      title="Start Sprint"
                                    >
                                      {actionLoadingId === sprint.id ? (
                                        <Loader2 className="h-3 w-3 animate-spin" />
                                      ) : (
                                        <Play className="h-3 w-3 fill-current" />
                                      )}
                                      Start
                                    </button>
                                  )}
                                </div>

                                <div className="border-t border-black/10 pt-2 flex flex-col gap-2">
                                  <div className="flex justify-between items-center text-[10px] font-bold">
                                    <span>Scope: {sprintTasks.length} tasks</span>
                                  </div>

                                  {/* List tasks inside planned sprint */}
                                  <div className="flex flex-col gap-1 max-h-32 overflow-y-auto pr-1">
                                    {sprintTasks.map(task => (
                                      <div
                                        key={task.id}
                                        onClick={() => {
                                          openDetails(task);
                                        }}
                                        className="flex items-center justify-between p-2 border border-black/10 bg-white hover:bg-neutral-bg/30 text-secondary hover:text-primary rounded cursor-pointer transition-all gap-2 truncate"
                                      >
                                        <span className="font-sans text-[11px] truncate flex-1">{task.title}</span>
                                        <button
                                          onClick={(e) => {
                                            e.stopPropagation();
                                            handleAssignTaskToSprint(task.id, null);
                                          }}
                                          className="text-[9px] text-secondary hover:text-accent-pink hover:font-bold bg-neutral-bg hover:bg-white border border-black/10 rounded px-1 flex-shrink-0 cursor-pointer"
                                          title="Remove from Sprint"
                                        >
                                          Remove
                                        </button>
                                      </div>
                                    ))}
                                  </div>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </div>

                    {/* Completed Sprints Section */}
                    {completedSprints.length > 0 && (
                      <div className="bg-white/40 border-2 border-black border-dashed rounded-sketchy p-6 flex flex-col gap-4">
                        <div className="flex items-center justify-between border-b border-black/10 pb-2">
                          <h2 className="font-cursive text-xl font-bold text-secondary">Completed Sprints</h2>
                          <span className="bg-neutral-bg border border-black/10 text-secondary text-[10px] font-bold px-2 py-0.5 rounded-full ml-auto">
                            {completedSprints.length} Completed
                          </span>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          {completedSprints.map((sprint) => {
                            const sprintTasks = tasks.filter(t => t.sprint_id === sprint.id);
                            return (
                              <div key={sprint.id} className="border border-black/20 bg-white opacity-75 rounded-sketchy-sm p-4 flex flex-col gap-2">
                                <h3 className="font-cursive text-lg font-bold text-secondary flex items-center gap-1.5">
                                  {sprint.name} 
                                  <span className={`text-[8px] px-1.5 py-0.2 border rounded-full font-bold ${
                                    sprint.status === "COMPLETED" ? "bg-accent-green border-black/20" : "bg-neutral-bg border-black/10"
                                  }`}>{sprint.status.toLowerCase()}</span>
                                </h3>
                                <p className="font-sans text-[10px] text-secondary/60">
                                  Timeline: {new Date(sprint.start_date).toLocaleDateString()} - {new Date(sprint.end_date).toLocaleDateString()}
                                </p>
                                <span className="font-sans text-[10px] font-bold text-secondary">
                                  Completed {sprintTasks.filter(t => t.status === "DONE").length} / {sprintTasks.length} tasks
                                </span>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Right Column: Backlog Section */}
                  <div className="bg-white border-2 border-black rounded-sketchy p-6 shadow-flat-offset-sm flex flex-col gap-4">
                    <div className="flex items-center justify-between border-b-2 border-black pb-2">
                      <h2 className="font-cursive text-2xl font-bold">Workspace Backlog</h2>
                      <span className="bg-accent-yellow border-2 border-black text-[10px] font-bold px-2 py-0.5 rounded-full">
                        {backlogTasks.length} Tasks
                      </span>
                    </div>

                    <p className="font-sans text-xs text-secondary leading-relaxed">
                      Tasks not assigned to any sprint iteration. Drag or assign them to plan them into a sprint.
                    </p>

                    {backlogTasks.length === 0 ? (
                      <div className="text-center py-8 bg-neutral-bg/30 border border-dashed border-black/10 rounded-sketchy-sm">
                        <p className="font-sans text-xs text-secondary italic">No unassigned tasks found.</p>
                      </div>
                    ) : (
                      <div className="flex flex-col gap-3 max-h-[500px] overflow-y-auto pr-1">
                        {backlogTasks.map((task) => (
                          <div
                            key={task.id}
                            onClick={() => {
                              openDetails(task);
                            }}
                            className="bg-accent-yellow/15 hover:bg-accent-yellow/25 border-2 border-black rounded-sketchy-sm p-3 shadow-flat-offset-xs hover:-translate-y-0.5 active:translate-y-0 transition-all cursor-pointer flex flex-col gap-2"
                          >
                            <span className="font-sans text-xs font-bold line-clamp-2">{task.title}</span>
                            
                            <div className="flex items-center justify-between gap-2 border-t border-black/10 pt-2 mt-1">
                              {/* Assignee Avatar */}
                              {task.assignee ? (
                                <div className="w-5 h-5 rounded-full border border-black flex items-center justify-center bg-accent-blue text-[8px] font-bold overflow-hidden" title={task.assignee.full_name || "Assignee"}>
                                  {task.assignee.avatar_url ? (
                                    /* eslint-disable-next-line @next/next/no-img-element */
                                    <img src={task.assignee.avatar_url} alt="avatar" className="w-full h-full object-cover" />
                                  ) : (
                                    task.assignee.full_name?.substring(0, 2) || "U"
                                  )}
                                </div>
                              ) : (
                                <div className="w-5 h-5 rounded-full border border-black/20 flex items-center justify-center bg-white text-[8px]" title="Unassigned">👤</div>
                              )}
                              
                              {/* Sprint quick selector */}
                              <select
                                value=""
                                onClick={(e) => e.stopPropagation()}
                                onChange={(e) => {
                                  if (e.target.value) {
                                    handleAssignTaskToSprint(task.id, e.target.value);
                                  }
                                }}
                                className="font-sans text-[10px] bg-white border border-black/35 rounded px-1.5 py-0.5 cursor-pointer max-w-[120px] focus:outline-none"
                              >
                                <option value="">Assign Sprint...</option>
                                {plannedSprints.map(s => (
                                  <option key={s.id} value={s.id}>{s.name}</option>
                                ))}
                                {activeSprints.map(s => (
                                  <option key={s.id} value={s.id}>{s.name} (active)</option>
                                ))}
                              </select>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Create Sprint Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black/45 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div 
            className="bg-white border-2 border-black rounded-sketchy shadow-flat-offset p-6 md:p-8 max-w-md w-full relative rotate-[0.5deg] animate-in zoom-in-95 duration-150"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="mb-4">
              <h2 className="font-cursive text-3xl font-bold mb-1">New Sprint</h2>
              <p className="font-sans text-xs text-secondary">Create a new time-boxed sprint. Sprints cannot overlap.</p>
            </div>

            {modalError && (
              <div className="bg-accent-pink border-2 border-black rounded-sketchy-sm p-3 text-xs font-semibold mb-4">
                {modalError}
              </div>
            )}

            <form onSubmit={handleCreateSprint} className="flex flex-col gap-4">
              <div>
                <label className="font-sans text-xs font-semibold mb-1 block">Sprint Name</label>
                <input
                  type="text"
                  value={newSprintName}
                  onChange={(e) => setNewSprintName(e.target.value)}
                  placeholder="e.g. Q3 Sprint 1"
                  required
                  className="w-full px-3 py-2 border-2 border-black rounded-sketchy-sm font-sans text-sm bg-white placeholder:text-secondary/40 focus:outline-none focus:ring-2 focus:ring-tertiary shadow-flat-offset-xs"
                />
              </div>

              <div>
                <label className="font-sans text-xs font-semibold mb-1 block">Sprint Goal (Optional)</label>
                <textarea
                  value={newSprintGoal}
                  onChange={(e) => setNewSprintGoal(e.target.value)}
                  placeholder="What are we delivering this sprint?"
                  rows={2}
                  maxLength={500}
                  className="w-full px-3 py-2 border-2 border-black rounded-sketchy-sm font-sans text-sm bg-white placeholder:text-secondary/40 focus:outline-none focus:ring-2 focus:ring-tertiary shadow-flat-offset-xs resize-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="font-sans text-xs font-semibold mb-1 block">Start Date</label>
                  <input
                    type="date"
                    value={newSprintStart}
                    onChange={(e) => setNewSprintStart(e.target.value)}
                    required
                    className="w-full px-3 py-2 border-2 border-black rounded-sketchy-sm font-sans text-sm bg-white focus:outline-none focus:ring-2 focus:ring-tertiary shadow-flat-offset-xs cursor-pointer"
                  />
                </div>

                <div>
                  <label className="font-sans text-xs font-semibold mb-1 block">End Date</label>
                  <input
                    type="date"
                    value={newSprintEnd}
                    onChange={(e) => setNewSprintEnd(e.target.value)}
                    required
                    className="w-full px-3 py-2 border-2 border-black rounded-sketchy-sm font-sans text-sm bg-white focus:outline-none focus:ring-2 focus:ring-tertiary shadow-flat-offset-xs cursor-pointer"
                  />
                </div>
              </div>

              <div className="flex gap-3 mt-4">
                <button
                  type="button"
                  onClick={closeCreateModal}
                  disabled={creating}
                  className="w-1/2 py-2 border-2 border-black rounded-full font-sans text-xs font-bold hover:bg-neutral-bg shadow-flat-offset-sm active:translate-y-0.5 hover:-translate-y-0.5 transition-all cursor-pointer disabled:opacity-40"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={creating}
                  className="w-1/2 py-2 bg-tertiary hover:bg-tertiary-hover text-white border-2 border-black rounded-full font-sans text-xs font-bold shadow-flat-offset-sm active:translate-y-0.5 hover:-translate-y-0.5 transition-all cursor-pointer disabled:opacity-40 flex items-center justify-center gap-1.5"
                >
                  {creating && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
                  Create Sprint
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Task Details Sheet Drawer */}
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
  );
}
