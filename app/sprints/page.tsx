"use client";

import React from "react";
import { Calendar, Loader2, Plus } from "lucide-react";
import { OrgSwitcher } from "@/components/orgs/OrgSwitcher";
import { Navbar } from "@/components/layout/Navbar";
import { Sidebar } from "@/components/layout/Sidebar";
import { TaskDetailsSheet } from "@/components/tasks/TaskDetailsSheet";
import { SprintColumn } from "@/components/tasks/sprints/SprintColumn";
import { useSprints } from "./useSprints";

export default function SprintsPage() {
  const page = useSprints();

  if (!page.isLoaded) {
    return (
      <div className="min-h-screen w-full flex items-center justify-center bg-neutral-bg bg-dot-grid text-primary">
        <span className="font-cursive text-xl animate-pulse">Loading directory...</span>
      </div>
    );
  }

  const activeSprints = page.sprints.filter((s) => s.status === "ACTIVE");
  const plannedSprints = page.sprints.filter((s) => s.status === "PLANNED");
  const completedSprints = page.sprints.filter((s) => s.status === "COMPLETED" || s.status === "CANCELLED");
  const backlogTasks = page.tasks.filter((t) => !t.sprint_id);
  const isAuthorized = page.userRole === "OWNER" || page.userRole === "ADMIN";

  return (
    <div className="min-h-screen w-full bg-neutral-bg bg-dot-grid text-primary flex">
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

        {/* Main Content Container */}
        <div className="flex-1 max-w-6xl w-full mx-auto p-6 md:p-12 flex flex-col gap-8">
          {!page.activeOrgId ? (
            <div className="bg-white border-2 border-black rounded-sketchy shadow-flat-offset p-8 text-center max-w-lg mx-auto mt-8">
              <div className="w-12 h-12 rounded-full bg-accent-pink border-2 border-black flex items-center justify-center mx-auto mb-4 shadow-flat-offset-sm">
                <Calendar className="h-6 w-6" />
              </div>
              <h2 className="font-cursive text-2xl font-bold mb-2">No Active Workspace</h2>
              <p className="font-sans text-sm text-secondary mb-6">
                Please select or create an organization workspace to view and manage team sprint iterations.
              </p>
              <button
                onClick={() => page.router.push("/orgs/create")}
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
                    Sprint Planner: <span className="underline decoration-tertiary decoration-2">{page.activeOrgName}</span>
                  </h1>
                  <p className="font-sans text-xs text-secondary">
                    Plan time-boxed sprint iterations, set targets, and scope task velocity.
                  </p>
                </div>
                {isAuthorized && (
                  <button
                    onClick={page.openCreateModal}
                    className="flex items-center justify-center gap-1.5 self-start md:self-center bg-tertiary hover:bg-tertiary-hover text-white border-2 border-black font-sans text-xs font-bold px-4 py-2.5 rounded-full shadow-flat-offset-sm active:translate-y-0.5 hover:-translate-y-0.5 transition-all cursor-pointer"
                  >
                    <Plus className="h-4 w-4" />
                    New Sprint
                  </button>
                )}
              </div>

              {page.error && (
                <div className="bg-accent-pink border-2 border-black rounded-sketchy-sm p-4 text-center">
                  <p className="font-sans text-sm font-semibold">{page.error}</p>
                </div>
              )}

              {page.loading ? (
                <div className="bg-white border-2 border-black rounded-sketchy shadow-flat-offset p-12 flex items-center justify-center">
                  <Loader2 className="h-8 w-8 animate-spin text-tertiary mr-3" />
                  <span className="font-cursive text-xl">Loading sprints...</span>
                </div>
              ) : (
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-start">
                  {/* Left & Middle Column: Sprints List */}
                  <div className="lg:col-span-2 flex flex-col gap-8">
                    <SprintColumn
                      title="Active Sprint"
                      sprintType="ACTIVE"
                      sprintsCount={activeSprints.length}
                      sprintsList={activeSprints}
                      tasks={page.tasks}
                      isAuthorized={isAuthorized}
                      actionLoadingId={page.actionLoadingId}
                      handleStatusTransition={page.handleStatusTransition}
                      openDetails={page.openDetails}
                    />

                    <SprintColumn
                      title="Planned Sprints"
                      sprintType="PLANNED"
                      sprintsCount={plannedSprints.length}
                      sprintsList={plannedSprints}
                      tasks={page.tasks}
                      isAuthorized={isAuthorized}
                      actionLoadingId={page.actionLoadingId}
                      handleStatusTransition={page.handleStatusTransition}
                      handleAssignTaskToSprint={page.handleAssignTaskToSprint}
                      openDetails={page.openDetails}
                    />

                    <SprintColumn
                      title="Completed Sprints"
                      sprintType="COMPLETED"
                      sprintsCount={completedSprints.length}
                      sprintsList={completedSprints}
                      tasks={page.tasks}
                      isAuthorized={isAuthorized}
                      actionLoadingId={page.actionLoadingId}
                      handleStatusTransition={page.handleStatusTransition}
                      openDetails={page.openDetails}
                    />
                  </div>

                  {/* Right Column: Backlog Section */}
                  <div className="bg-white border-2 border-black rounded-sketchy p-6 shadow-flat-offset-sm flex flex-col gap-4">
                    <div className="flex items-center justify-between border-b-2 border-black pb-2">
                      <h2 className="font-cursive text-2xl font-bold">Workspace Backlog</h2>
                      <span className="bg-accent-yellow border-2 border-black text-xs font-bold px-2 py-0.5 rounded-full">
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
                            onClick={() => page.openDetails(task)}
                            className="bg-accent-yellow/15 hover:bg-accent-yellow/25 border-2 border-black rounded-sketchy-sm p-3 shadow-flat-offset-xs hover:-translate-y-0.5 active:translate-y-0 transition-all cursor-pointer flex flex-col gap-2"
                          >
                            <span className="font-sans text-xs font-bold line-clamp-2">{task.title}</span>

                            <div className="flex items-center justify-between gap-2 border-t border-black/10 pt-2 mt-1">
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

                              <select
                                value=""
                                onClick={(e) => e.stopPropagation()}
                                onChange={(e) => {
                                  if (e.target.value) {
                                    page.handleAssignTaskToSprint(task.id, e.target.value);
                                  }
                                }}
                                className="font-sans text-[10px] bg-white border border-black/35 rounded px-1.5 py-0.5 cursor-pointer max-w-[120px] focus:outline-none"
                              >
                                <option value="">Assign Sprint...</option>
                                {plannedSprints.map((s) => (
                                  <option key={s.id} value={s.id}>{s.name}</option>
                                ))}
                                {activeSprints.map((s) => (
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
      {page.isModalOpen && (
        <div className="fixed inset-0 bg-black/45 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div
            className="bg-white border-2 border-black rounded-sketchy shadow-flat-offset p-6 md:p-8 max-w-md w-full relative rotate-[0.5deg] animate-in zoom-in-95 duration-150"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="mb-4">
              <h2 className="font-cursive text-3xl font-bold mb-1">New Sprint</h2>
              <p className="font-sans text-xs text-secondary">Create a new time-boxed sprint. Sprints cannot overlap.</p>
            </div>

            {page.modalError && (
              <div className="bg-accent-pink border-2 border-black rounded-sketchy-sm p-3 text-xs font-semibold mb-4">
                {page.modalError}
              </div>
            )}

            <form onSubmit={page.handleCreateSprint} className="flex flex-col gap-4">
              <div>
                <label className="font-sans text-xs font-semibold mb-1 block">Sprint Name</label>
                <input
                  type="text"
                  value={page.newSprintName}
                  onChange={(e) => page.setNewSprintName(e.target.value)}
                  placeholder="e.g. Q3 Sprint 1"
                  required
                  className="w-full px-3 py-2 border-2 border-black rounded-sketchy-sm font-sans text-sm bg-white placeholder:text-secondary/40 focus:outline-none focus:ring-2 focus:ring-tertiary shadow-flat-offset-xs"
                />
              </div>

              <div>
                <label className="font-sans text-xs font-semibold mb-1 block">Sprint Goal (Optional)</label>
                <textarea
                  value={page.newSprintGoal}
                  onChange={(e) => page.setNewSprintGoal(e.target.value)}
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
                    value={page.newSprintStart}
                    onChange={(e) => page.setNewSprintStart(e.target.value)}
                    required
                    className="w-full px-3 py-2 border-2 border-black rounded-sketchy-sm font-sans text-sm bg-white focus:outline-none focus:ring-2 focus:ring-tertiary shadow-flat-offset-xs cursor-pointer"
                  />
                </div>

                <div>
                  <label className="font-sans text-xs font-semibold mb-1 block">End Date</label>
                  <input
                    type="date"
                    value={page.newSprintEnd}
                    onChange={(e) => page.setNewSprintEnd(e.target.value)}
                    required
                    className="w-full px-3 py-2 border-2 border-black rounded-sketchy-sm font-sans text-sm bg-white focus:outline-none focus:ring-2 focus:ring-tertiary shadow-flat-offset-xs cursor-pointer"
                  />
                </div>
              </div>

              <div className="flex gap-3 mt-4">
                <button
                  type="button"
                  onClick={page.closeCreateModal}
                  disabled={page.creating}
                  className="w-1/2 py-2 border-2 border-black rounded-full font-sans text-xs font-bold hover:bg-neutral-bg shadow-flat-offset-sm active:translate-y-0.5 hover:-translate-y-0.5 transition-all cursor-pointer disabled:opacity-40"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={page.creating}
                  className="w-1/2 py-2 bg-tertiary hover:bg-tertiary-hover text-white border-2 border-black rounded-full font-sans text-xs font-bold shadow-flat-offset-sm active:translate-y-0.5 hover:-translate-y-0.5 transition-all cursor-pointer disabled:opacity-40 flex items-center justify-center gap-1.5"
                >
                  {page.creating && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
                  Create Sprint
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Task Details Sheet Drawer */}
      <TaskDetailsSheet
        task={page.selectedTask}
        isOpen={page.isDetailsOpen}
        onClose={page.closeDetails}
        members={page.members}
        sprints={page.sprints}
        onUpdate={page.handleUpdateTask}
        onDelete={page.handleDeleteTask}
      />
    </div>
  );
}
