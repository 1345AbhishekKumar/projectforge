"use client";

import React, { use } from "react";
import { ArrowLeft, Loader2, Calendar, Archive, ClipboardList, FolderKanban, Users, Activity, Settings, AlertTriangle } from "lucide-react";

import { OrgSwitcher } from "@/components/orgs/OrgSwitcher";
import { Navbar } from "@/components/layout/Navbar";
import { CreateTaskModal } from "@/components/tasks/CreateTaskModal";
import { TaskDetailsSheet } from "@/components/tasks/TaskDetailsSheet";
import { Sidebar } from "@/components/layout/Sidebar";
import { BacklogTab } from "@/components/projects/BacklogTab";
import { MembersTab } from "@/components/projects/MembersTab";
import { SettingsTab } from "@/components/projects/SettingsTab";
import { AIProjectAssistant } from "@/components/projects/AIProjectAssistant";
import { useProjectDetails } from "./useProjectDetails";
import type { ProjectStatus } from "@/types";

type Props = {
  params: Promise<{ id: string }>;
};

export default function ProjectDetailsPage({ params }: Props) {
  const { id: projectId } = use(params);

  const {
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
    hasCriticalRisk,
  } = useProjectDetails(projectId);

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

  const currentUserMember = members.find((m) => m.userId === user?.id);
  const isAdminOrOwner = currentUserMember?.role === "OWNER" || currentUserMember?.role === "ADMIN";

  return (
    <div className="min-h-screen w-full bg-neutral-bg bg-dot-grid text-primary flex">
      {/* Sidebar - Desktop only */}
      <div className="hidden md:block">
        <Sidebar />
      </div>

      <div className="flex-grow flex flex-col min-h-screen overflow-x-hidden">
        {/* Navbar */}
        <Navbar />

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
              {/* Critical Risk Warning Banner */}
              {hasCriticalRisk && (
                <div className="bg-accent-pink text-primary border-2 border-black p-4 rounded-sketchy shadow-flat-offset flex items-center gap-3 animate-pulse font-sans font-bold text-sm">
                  <AlertTriangle className="h-5 w-5 shrink-0" />
                  <span>
                    ⚠️ CRITICAL RISK WARNING: This project has active High Probability / High Impact risks. Please review the mitigations.
                  </span>
                </div>
              )}

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
                  <div className="flex items-center gap-2 mt-4 text-[10px] text-secondary/60 font-sans" suppressHydrationWarning>
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

                  {/* AI Project Assistant Tools */}
                  {activeOrgId && (
                    <AIProjectAssistant projectId={projectId} orgId={activeOrgId} />
                  )}

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
                  <button
                    onClick={() => router.push(`/projects/${projectId}/risks`)}
                    className="px-6 py-2.5 text-sm font-bold font-cursive transition-all -mb-0.5 cursor-pointer border-b-2 border-transparent hover:bg-neutral-bg/50 text-secondary"
                  >
                    <span className="flex items-center gap-2">
                      <AlertTriangle className="h-4 w-4" />
                      Risks
                    </span>
                  </button>
                  {isAdminOrOwner && (
                    <button
                      onClick={() => setActiveTab("settings")}
                      className={`px-6 py-2.5 text-sm font-bold font-cursive transition-all -mb-0.5 cursor-pointer ${
                        activeTab === "settings"
                          ? "bg-accent-blue border-2 border-black border-b-0 rounded-t-lg shadow-[0_-2px_0_rgba(0,0,0,1)]"
                          : "border-b-2 border-transparent hover:bg-neutral-bg/50 px-6 py-2.5 text-secondary"
                      }`}
                    >
                      <span className="flex items-center gap-2">
                        <Settings className="h-4 w-4" />
                        Settings
                      </span>
                    </button>
                  )}
                </div>

                {/* Tab Content Body */}
                <div className="mt-2">
                  {/* Backlog Tab Content */}
                  {activeTab === "backlog" && (
                    <BacklogTab
                      members={members}
                      labels={labels}
                      savedViews={savedViews}
                      activeFilters={activeFilters}
                      activeViewName={activeViewName}
                      loadingTasks={loadingTasks}
                      filteredTasks={filteredTasks}
                      onFiltersChange={(filters) => {
                        setFilters(projectId, filters);
                        const matchedView = savedViews.find(v => JSON.stringify(v.filters) === JSON.stringify(filters));
                        setActiveView(projectId, matchedView ? matchedView.name : "");
                      }}
                      onSaveView={handleSaveView}
                      onDeleteView={handleDeleteView}
                      onClearFilters={() => clearFilters(projectId)}
                      openCreateModal={openCreateModal}
                      openDetails={openDetails}
                      handleStatusToggle={handleStatusToggle}
                    />
                  )}

                  {/* Members Tab Content */}
                  {activeTab === "members" && (
                    <MembersTab
                      loadingMembers={loadingMembers}
                      members={members}
                      currentUserId={user?.id}
                    />
                  )}

                  {/* Settings Tab Content */}
                  {activeTab === "settings" && isAdminOrOwner && activeOrgId && (
                    <SettingsTab project={project} orgId={activeOrgId} />
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
          customStatuses={project?.custom_statuses}
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
          customStatuses={project?.custom_statuses}
        />
      </div>
    </div>
  );
}
