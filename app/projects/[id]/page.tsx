"use client";

import React, { useState, useEffect, useCallback, use } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { useUser, useAuth } from "@clerk/nextjs";
import { ArrowLeft, User as UserIcon, Loader2, Archive, Calendar, Users, ClipboardList, LogOut, Plus } from "lucide-react";

import { OrgSwitcher } from "@/components/orgs/OrgSwitcher";
import { NotificationBell } from "@/components/notifications/NotificationBell";
import { getProjectDetails, updateProject, archiveProject } from "@/actions/project";
import { getOrganizationMembers, type MemberListItem } from "@/actions/membership";
import { createTask, getProjectTasks, updateTask, deleteTask, type TaskWithAssignee } from "@/actions/task";
import { CreateTaskModal } from "@/components/tasks/CreateTaskModal";
import { TaskList } from "@/components/tasks/TaskList";
import { TaskDetailsSheet } from "@/components/tasks/TaskDetailsSheet";
import type { Project, ProjectStatus, TaskStatus, TaskPriority } from "@/types";


type Props = {
  params: Promise<{ id: string }>;
};

function getActiveOrgId(): string | null {
  if (typeof document === "undefined") return null;
  const match = document.cookie.match(/active_org_id=([^;]+)/);
  return match ? match[1] : null;
}

export default function ProjectDetailsPage({ params }: Props) {
  const router = useRouter();
  const { id: projectId } = use(params);
  const { user, isLoaded } = useUser();
  const { signOut } = useAuth();

  const initialOrgId = getActiveOrgId();
  const [activeOrgId, setActiveOrgId] = useState<string | null>(initialOrgId);
  const [project, setProject] = useState<Project | null>(null);
  const [members, setMembers] = useState<MemberListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingMembers, setLoadingMembers] = useState(false);
  const [updatingStatus, setUpdatingStatus] = useState(false);
  const [archiving, setArchiving] = useState(false);
  const [error, setError] = useState("");
  const [activeTab, setActiveTab] = useState<"backlog" | "members">("backlog");

  // Task states
  const [tasks, setTasks] = useState<TaskWithAssignee[]>([]);
  const [loadingTasks, setLoadingTasks] = useState(false);
  const [isCreateTaskModalOpen, setIsCreateTaskModalOpen] = useState(false);
  const [selectedTask, setSelectedTask] = useState<TaskWithAssignee | null>(null);
  const [isDetailsOpen, setIsDetailsOpen] = useState(false);

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
    setLoadingTasks(true);
    const result = await getProjectTasks(projectId, activeOrgId);
    if (result.success) {
      setTasks(result.data);
    }
    setLoadingTasks(false);
  }, [projectId, activeOrgId]);

  // Fetch tasks on org/project change
  useEffect(() => {
    const timer = setTimeout(() => {
      loadTasks();
    }, 0);
    return () => clearTimeout(timer);
  }, [loadTasks]);

  // Fetch organization members
  useEffect(() => {
    if (!activeOrgId) return;

    async function loadMembers() {
      setLoadingMembers(true);
      const result = await getOrganizationMembers(activeOrgId!);
      if (result.success) {
        setMembers(result.data);
      }
      setLoadingMembers(false);
    }

    loadMembers();
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

  async function handleStatusToggle(task: TaskWithAssignee) {
    if (!activeOrgId || !projectId) return;
    const newStatus: TaskStatus = task.status === "DONE" ? "TODO" : "DONE";
    const res = await updateTask(task.id, projectId, activeOrgId, { status: newStatus });
    if (res.success) {
      loadTasks();
    } else {
      alert(res.error || "Failed to toggle status");
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
    <main className="min-h-screen w-full bg-neutral-bg bg-dot-grid text-primary flex flex-col">
      {/* Navbar */}
      <header className="w-full bg-white border-b-2 border-black px-6 py-3 flex items-center justify-between sticky top-0 z-50">
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2 cursor-pointer" onClick={() => router.push("/dashboard")}>
            <div className="w-8 h-8 rounded-full bg-tertiary border-2 border-primary flex items-center justify-center font-cursive text-white text-lg font-bold shadow-flat-offset-sm">
              P
            </div>
            <span className="font-cursive text-2xl font-bold tracking-tight">ProjectForge</span>
          </div>

          <div className="hidden md:block border-l-2 border-black h-6 mx-1" />
          <div className="hidden md:block">
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
              </div>

              {/* Tab Content Body */}
              <div className="mt-2">
                
                {/* Backlog Tab Content */}
                {activeTab === "backlog" && (
                  <div className="flex flex-col gap-6">
                    {/* Toolbar */}
                    <div className="flex items-center justify-between">
                      <h2 className="font-cursive text-2xl font-bold">Project Backlog</h2>
                      <button
                        onClick={() => setIsCreateTaskModalOpen(true)}
                        className="flex items-center justify-center gap-1.5 bg-accent-yellow hover:bg-[#FFE680] text-primary border-2 border-black font-sans text-xs font-bold px-4 py-2 rounded-full shadow-flat-offset-sm active:translate-y-0.5 hover:-translate-y-0.5 transition-all cursor-pointer"
                      >
                        <Plus className="h-4 w-4" />
                        Create Task
                      </button>
                    </div>

                    {loadingTasks ? (
                      <div className="bg-white border-2 border-black rounded-sketchy shadow-flat-offset p-12 flex items-center justify-center">
                        <Loader2 className="h-8 w-8 animate-spin text-tertiary mr-3" />
                        <span className="font-cursive text-xl">Loading backlog...</span>
                      </div>
                    ) : tasks.length === 0 ? (
                      <div className="bg-white border-2 border-black rounded-sketchy shadow-flat-offset p-8 md:p-12 text-center max-w-lg mx-auto">
                        <div className="w-16 h-16 rounded-full bg-accent-yellow border-2 border-black flex items-center justify-center mx-auto mb-4 rotate-[1.5deg] shadow-flat-offset-sm">
                          <ClipboardList className="h-8 w-8 text-primary" />
                        </div>
                        <h3 className="font-cursive text-2xl font-bold mb-2">Backlog Empty</h3>
                        <p className="font-sans text-sm text-secondary mb-6 leading-relaxed">
                          No tasks have been mapped to this project scope yet. Let&apos;s map the first task!
                        </p>
                        <button
                          onClick={() => setIsCreateTaskModalOpen(true)}
                          className="bg-accent-yellow hover:bg-[#FFE680] text-primary border-2 border-black font-sans text-xs font-bold px-5 py-2 rounded-full shadow-flat-offset-sm active:translate-y-0.5 hover:-translate-y-0.5 transition-all cursor-pointer"
                        >
                          Create First Task
                        </button>
                      </div>
                    ) : (
                      <TaskList
                        tasks={tasks}
                        onTaskClick={(task) => {
                          setSelectedTask(task);
                          setIsDetailsOpen(true);
                        }}
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
        onClose={() => setIsCreateTaskModalOpen(false)}
        members={members}
        onCreate={handleCreateTask}
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
        onUpdate={handleUpdateTask}
        onDelete={handleDeleteTask}
      />
    </main>
  );
}
