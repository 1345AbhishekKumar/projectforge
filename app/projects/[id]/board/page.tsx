"use client";

import React from "react";
import { ArrowLeft, Loader2, Archive, LogOut, FolderKanban } from "lucide-react";
import { OrgSwitcher } from "@/components/orgs/OrgSwitcher";
import { NotificationBell } from "@/components/notifications/NotificationBell";
import { TaskFilters } from "@/components/tasks/TaskFilters";
import { CreateTaskModal } from "@/components/tasks/CreateTaskModal";
import { TaskDetailsSheet } from "@/components/tasks/TaskDetailsSheet";
import { Sidebar } from "@/components/layout/Sidebar";
import { KanbanColumn } from "@/components/tasks/board/KanbanColumn";
import { KanbanCard } from "@/components/tasks/board/KanbanCard";
import { useKanbanBoard } from "./useKanbanBoard";
import type { ProjectStatus, TaskStatus, TaskPriority } from "@/types";

type Props = {
  params: Promise<{ id: string }>;
};

const priorityStickyColors: Record<TaskPriority, string> = {
  LOW: "bg-[#D0E1FD] hover:bg-[#C2D8FC] text-primary shadow-sm",
  MEDIUM: "bg-[#D4EDDA] hover:bg-[#C6E9CE] text-primary shadow-sm",
  HIGH: "bg-[#FFF2B2] hover:bg-[#FFEAA3] text-primary shadow-sm",
  URGENT: "bg-[#FFD2D2] hover:bg-[#FFC4C4] text-primary shadow-sm font-semibold",
};

const priorityColors: Record<TaskPriority, string> = {
  LOW: "bg-white/80 border border-black/20 text-secondary",
  MEDIUM: "bg-white border-2 border-black text-primary",
  HIGH: "bg-white border-2 border-black text-primary font-medium",
  URGENT: "bg-white border-2 border-black text-primary font-bold animate-pulse",
};

const statusColors: Record<ProjectStatus, string> = {
  PLANNING: "bg-accent-yellow border-2 border-black",
  ACTIVE: "bg-accent-blue border-2 border-black",
  COMPLETED: "bg-accent-green border-2 border-black",
  ARCHIVED: "bg-neutral-bg border border-black/10 opacity-60",
};

export default function KanbanBoardPage({ params }: Props) {
  const board = useKanbanBoard({ params });

  if (!board.isLoaded) {
    return (
      <div className="min-h-screen w-full flex items-center justify-center bg-neutral-bg bg-dot-grid text-primary">
        <span className="font-cursive text-xl animate-pulse">Loading board details...</span>
      </div>
    );
  }

  const customStatuses = board.project?.custom_statuses;
  const columns: { title: string; status: TaskStatus }[] = customStatuses && customStatuses.length > 0
    ? customStatuses.map((status) => ({
        title: status.replace(/_/g, " ").replace(/\b\w/g, c => c.toUpperCase()),
        status: status,
      }))
    : [
        { title: "To Do", status: "TODO" },
        { title: "In Progress", status: "IN_PROGRESS" },
        { title: "Done", status: "DONE" },
      ];

  return (
    <div className="min-h-screen w-full bg-neutral-bg bg-dot-grid text-primary flex">
      <Sidebar />

      <div className="flex-grow flex flex-col min-h-screen overflow-x-hidden">
        {/* Navigation Header */}
        <header className="border-b-2 border-black bg-white px-6 py-4 flex items-center justify-between sticky top-0 z-40 select-none shadow-flat-offset-sm">
          <div className="flex items-center gap-4">
            <OrgSwitcher />
          </div>
          <div className="flex items-center gap-4">
            <NotificationBell />
            <button
              onClick={board.handleSignOut}
              className="flex items-center gap-2 px-3 py-1.5 border-2 border-black bg-white hover:bg-neutral-bg text-xs font-bold rounded-full shadow-flat-offset-sm active:translate-y-0.5 hover:-translate-y-0.5 transition-all cursor-pointer"
            >
              <LogOut className="h-3.5 w-3.5" />
              Sign Out
            </button>
          </div>
        </header>

        {/* Board Main Body */}
        <div className="flex-grow w-full mx-auto p-6 md:p-12 flex flex-col gap-6">
          <button
            onClick={() => board.handleSignOut}
            className="hidden" // Keeping this reference clean or we can navigate back
          />
          <div className="flex items-center gap-1.5 font-sans text-sm text-secondary hover:text-primary mb-6 transition-colors cursor-pointer" onClick={() => window.history.back()}>
            <ArrowLeft className="h-4 w-4" />
            Back to projects
          </div>

          {board.loading ? (
            <div className="flex-1 flex items-center justify-center min-h-[400px]">
              <Loader2 className="h-8 w-8 animate-spin text-tertiary" />
            </div>
          ) : board.error || !board.project ? (
            <div className="flex-1 flex flex-col items-center justify-center border-2 border-black rounded-sketchy p-12 bg-accent-pink/10 shadow-flat-offset max-w-2xl mx-auto text-center gap-4">
              <h2 className="font-cursive text-2xl font-bold">Failed to load board</h2>
              <p className="font-sans text-sm text-secondary">{board.error || "The requested project board was not found."}</p>
            </div>
          ) : (
            <div className="flex flex-col gap-8 flex-1">
              {/* Project Title Block */}
              <div className="bg-white border-2 border-black rounded-sketchy shadow-flat-offset p-6 flex flex-col md:flex-row md:items-center justify-between gap-6">
                <div>
                  <h1 className="font-cursive text-4xl font-bold mb-2 flex items-center gap-3">
                    <FolderKanban className="h-8 w-8 text-tertiary" />
                    {board.project.name}
                  </h1>
                  <p className="font-sans text-sm text-secondary max-w-xl">
                    {board.project.description || "No description provided for this project."}
                  </p>
                </div>

                <div className="flex items-center gap-3 flex-wrap">
                  {/* Status Dropdown */}
                  <div className="flex items-center gap-2">
                    <span className="font-sans text-xs font-bold text-secondary">Status:</span>
                    <select
                      value={board.project.status}
                      disabled={board.updatingStatus}
                      onChange={(e) => board.handleStatusChange(e.target.value as ProjectStatus)}
                      className={`px-3 py-1.5 font-sans text-xs font-bold border-2 border-black rounded-full cursor-pointer shadow-flat-offset-sm active:translate-y-0.5 transition-all focus:outline-none ${
                        statusColors[board.project.status]
                      }`}
                    >
                      <option value="PLANNING">Planning</option>
                      <option value="ACTIVE">Active</option>
                      <option value="COMPLETED">Completed</option>
                    </select>
                  </div>

                  {/* Archive Button */}
                  <button
                    onClick={board.handleArchive}
                    disabled={board.archiving}
                    className="flex items-center gap-1.5 py-1.5 px-3 border-2 border-black bg-white hover:bg-accent-pink rounded-full font-sans text-xs font-bold shadow-flat-offset-sm active:translate-y-0.5 hover:-translate-y-0.5 transition-all disabled:opacity-50 cursor-pointer"
                  >
                    {board.archiving ? (
                      <Loader2 className="h-3 w-3 animate-spin" />
                    ) : (
                      <Archive className="h-3 w-3" />
                    )}
                    Archive Board
                  </button>
                </div>
              </div>

              {/* Sync Loader indicator */}
              {board.syncing && (
                <div className="fixed top-18 right-6 z-50 bg-white border-2 border-black rounded-full px-4 py-2 flex items-center gap-2 shadow-flat-offset-sm animate-pulse">
                  <Loader2 className="h-4 w-4 animate-spin text-tertiary" />
                  <span className="font-sans text-xs font-bold">Syncing board...</span>
                </div>
              )}

              {/* Filters Panel & Header */}
              <div className="flex flex-col gap-4 flex-1">
                <TaskFilters
                  members={board.members}
                  labels={board.labels}
                  savedViews={board.savedViews}
                  activeFilters={board.activeFilters}
                  onFiltersChange={(filters) => {
                    board.setFilters(board.projectId, filters);
                    const matchedView = board.savedViews.find(
                      (v) => JSON.stringify(v.filters) === JSON.stringify(filters)
                    );
                    board.setActiveView(board.projectId, matchedView ? matchedView.name : "");
                  }}
                  onSaveView={board.handleSaveView}
                  onDeleteView={board.handleDeleteView}
                  activeViewName={board.activeViewName}
                  onClearViewName={() => board.clearFilters(board.projectId)}
                  customStatuses={customStatuses}
                />

                {/* Board Columns Grid */}
                <div
                  className="grid grid-cols-1 lg:grid-cols-[repeat(var(--cols),_minmax(0,_1fr))] gap-8 mt-4 items-start min-h-[60vh]"
                  style={{ "--cols": columns.length } as React.CSSProperties}
                >
                  {columns.map((col) => {
                    const colTasks = board.filteredTasks.filter((t) => t.status === col.status);
                    return (
                      <KanbanColumn
                        key={col.status}
                        title={col.title}
                        status={col.status}
                        itemsCount={colTasks.length}
                        dragOverCounters={board.dragOverCounters}
                        handleDragOverColumn={board.handleDragOverColumn}
                        handleDragEnterColumn={board.handleDragEnterColumn}
                        handleDragLeaveColumn={board.handleDragLeaveColumn}
                        handleDrop={board.handleDrop}
                        openCreateTaskAtStatus={board.openCreateTaskAtStatus}
                      >
                        {colTasks.map((task) => (
                          <KanbanCard
                            key={task.id}
                            task={task}
                            sprints={board.sprints}
                            draggedTaskId={board.draggedTaskId}
                            priorityColors={priorityColors}
                            priorityStickyColors={priorityStickyColors}
                            getRotation={board.getRotation}
                            handleDragStart={board.handleDragStart}
                            handleDragEnd={board.handleDragEnd}
                            handleDrop={board.handleDrop}
                            openDetails={board.openDetails}
                            colStatus={col.status}
                          />
                        ))}
                      </KanbanColumn>
                    );
                  })}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Create Task Modal */}
        <CreateTaskModal
          isOpen={board.isCreateTaskModalOpen}
          onClose={board.closeCreateModal}
          members={board.members}
          orgId={board.activeOrgId || ""}
          onCreate={board.handleCreateTask}
          defaultStatus={board.preselectedStatus}
          customStatuses={customStatuses}
        />

        {/* Task Details Sheet */}
        <TaskDetailsSheet
          task={board.selectedTask}
          isOpen={board.isDetailsOpen}
          onClose={board.closeDetails}
          members={board.members}
          sprints={board.sprints}
          onUpdate={board.handleUpdateTask}
          onDelete={board.handleDeleteTask}
          customStatuses={customStatuses}
        />
      </div>
    </div>
  );
}
