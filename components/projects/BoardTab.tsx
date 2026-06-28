"use client";

import React from "react";
import { Loader2 } from "lucide-react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";

import { getProjectDetails } from "@/actions/project";
import { getOrganizationMembers, type MemberListItem } from "@/actions/membership";
import { getProjectTasks, type TaskWithAssignee } from "@/actions/task";
import { updateTask, deleteTask } from "@/actions/taskMutation";
import { getSprints } from "@/actions/sprint";
import { getLabels } from "@/actions/label";
import { getSavedViews } from "@/actions/savedView";
import { useTaskStore } from "@/store/taskStore";
import { useTaskFilterStore } from "@/store/taskFilterStore";
import { TaskFilters, initialFilters } from "@/components/tasks/TaskFilters";
import { KanbanColumn } from "@/components/tasks/board/KanbanColumn";
import { KanbanCard } from "@/components/tasks/board/KanbanCard";
import { CreateTaskModal } from "@/components/tasks/CreateTaskModal";
import { TaskDetailsSheet } from "@/components/tasks/TaskDetailsSheet";
import type { TaskPriority, TaskStatus, Project, Sprint, Label, SavedView } from "@/types";

interface BoardTabProps {
  projectId: string;
  orgId: string;
}

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

export function BoardTab({ projectId, orgId }: BoardTabProps) {
  const queryClient = useQueryClient();

  const {
    selectedTask,
    isDetailsOpen,
    isCreateModalOpen: isCreateTaskModalOpen,
    preselectedStatus,
    openDetails,
    closeDetails,
    openCreateModal: openCreateTaskAtStatus,
    closeCreateModal,
  } = useTaskStore();

  const { filtersByProject, activeViewByProject, setFilters, setActiveView, clearFilters } = useTaskFilterStore();
  const activeFilters = filtersByProject[projectId] ?? initialFilters;
  const activeViewName = activeViewByProject[projectId] ?? "";

  const { data: project = null, isLoading: isProjectLoading } = useQuery<Project | null>({
    queryKey: ["project", projectId, orgId],
    queryFn: async () => {
      const result = await getProjectDetails(projectId, orgId);
      if (!result.success) throw new Error(result.error || "Project not found");
      return result.data ?? null;
    },
    enabled: !!orgId && !!projectId,
  });

  const { data: tasks = [] } = useQuery<TaskWithAssignee[]>({
    queryKey: ["tasks", projectId, orgId],
    queryFn: async () => {
      const result = await getProjectTasks(projectId, orgId);
      if (!result.success) throw new Error(result.error || "Failed to load tasks");
      return result.data ?? [];
    },
    enabled: !!orgId && !!projectId,
  });

  const { data: members = [] } = useQuery<MemberListItem[]>({
    queryKey: ["members", orgId],
    queryFn: async () => {
      const result = await getOrganizationMembers(orgId);
      return result.data ?? [];
    },
    enabled: !!orgId,
  });

  const { data: sprints = [] } = useQuery<Sprint[]>({
    queryKey: ["sprints", orgId],
    queryFn: async () => {
      const result = await getSprints(orgId);
      return result.data ?? [];
    },
    enabled: !!orgId,
  });

  const { data: labels = [] } = useQuery<Label[]>({
    queryKey: ["labels", orgId],
    queryFn: async () => {
      const result = await getLabels(orgId);
      return result.data ?? [];
    },
    enabled: !!orgId,
  });

  const { data: savedViews = [] } = useQuery<SavedView[]>({
    queryKey: ["savedViews", orgId],
    queryFn: async () => {
      const result = await getSavedViews(orgId);
      return result.data ?? [];
    },
    enabled: !!orgId,
  });

  const updateTaskMutation = useMutation({
    mutationFn: async ({ taskId, updates }: { taskId: string; updates: Parameters<typeof updateTask>[3] }) => {
      const result = await updateTask(taskId, projectId, orgId, updates);
      if (!result.success) throw new Error(result.error || "Failed to update task");
      return result;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["tasks", projectId, orgId] }),
  });

  const deleteTaskMutation = useMutation({
    mutationFn: async (taskId: string) => {
      const result = await deleteTask(taskId, projectId, orgId);
      if (!result.success) throw new Error(result.error || "Failed to delete task");
      return result;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["tasks", projectId, orgId] }),
  });

  // Client-side filtering
  const filteredTasks = tasks.filter((task) => {
    if (activeFilters.priorities.length > 0 && !activeFilters.priorities.includes(task.priority)) return false;
    if (activeFilters.statuses.length > 0 && !activeFilters.statuses.includes(task.status)) return false;
    if (activeFilters.assigneeIds.length > 0 && !activeFilters.assigneeIds.includes(task.assignee_id)) return false;
    if (activeFilters.labelIds.length > 0) {
      if (!task.labels || task.labels.length === 0) return false;
      const taskLabelIds = task.labels.map((l) => l.id);
      if (!activeFilters.labelIds.some((id) => taskLabelIds.includes(id))) return false;
    }
    return true;
  });

  const customStatuses = project?.custom_statuses;
  const columns: { title: string; status: TaskStatus }[] =
    customStatuses && customStatuses.length > 0
      ? customStatuses.map((s) => ({
          title: s.replace(/_/g, " ").toLowerCase().replace(/\b\w/g, (c) => c.toUpperCase()),
          status: s as TaskStatus,
        }))
      : [
          { title: "To Do", status: "TODO" },
          { title: "In Progress", status: "IN_PROGRESS" },
          { title: "Done", status: "DONE" },
        ];

  // Drag state
  const [draggedTaskId, setDraggedTaskId] = React.useState<string | null>(null);
  const [dragOverCounters, setDragOverCounters] = React.useState<Record<string, number>>({});

  const getRotation = (taskId: string) => {
    const hash = taskId.split("").reduce((a, c) => a + c.charCodeAt(0), 0);
    const rotations = [-1.5, -0.75, 0, 0.75, 1.5];
    const r = rotations[hash % rotations.length];
    return `rotate(${r}deg)`;
  };

  const handleDragStart = (e: React.DragEvent, taskId: string) => setDraggedTaskId(taskId);
  const handleDragEnd = () => setDraggedTaskId(null);
  const handleDragOverColumn = (e: React.DragEvent) => { e.preventDefault(); };
  const handleDragEnterColumn = (e: React.DragEvent, status: TaskStatus) => {
    e.preventDefault();
    setDragOverCounters((prev) => ({ ...prev, [status]: (prev[status] ?? 0) + 1 }));
  };
  const handleDragLeaveColumn = (e: React.DragEvent, status: TaskStatus) => {
    e.preventDefault();
    setDragOverCounters((prev) => ({ ...prev, [status]: Math.max(0, (prev[status] ?? 0) - 1) }));
  };
  const handleDrop = async (e: React.DragEvent, targetStatus: TaskStatus) => {
    e.preventDefault();
    setDragOverCounters({});
    if (!draggedTaskId) return;
    const task = tasks.find((t) => t.id === draggedTaskId);
    if (!task) return;
    
    const isCustom = customStatuses && customStatuses.length > 0;
    const draggedTaskVal = isCustom ? task.stage : task.status;
    if (draggedTaskVal === targetStatus) { setDraggedTaskId(null); return; }
    
    setDraggedTaskId(null);
    await updateTaskMutation.mutateAsync({
      taskId: draggedTaskId,
      updates: { [isCustom ? "stage" : "status"]: targetStatus }
    });
  };

  const handleUpdateTask = async (taskId: string, updates: Parameters<typeof updateTask>[3]) => {
    try {
      return await updateTaskMutation.mutateAsync({ taskId, updates });
    } catch (e) {
      return { success: false, error: e instanceof Error ? e.message : "Failed" };
    }
  };

  const handleDeleteTask = async (taskId: string) => {
    try {
      return await deleteTaskMutation.mutateAsync(taskId);
    } catch (e) {
      return { success: false, error: e instanceof Error ? e.message : "Failed" };
    }
  };

  if (isProjectLoading) {
    return (
      <div className="bg-white border-2 border-black rounded-sketchy shadow-flat-offset p-12 flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-tertiary mr-3" />
        <span className="font-cursive text-xl">Loading board...</span>
      </div>
    );
  }

  return (
    <>
      <div className="flex flex-col gap-6">
        {/* Filters */}
        <TaskFilters
          members={members}
          labels={labels}
          savedViews={savedViews}
          activeFilters={activeFilters}
          onFiltersChange={(filters) => {
            setFilters(projectId, filters);
            const matched = savedViews.find((v) => JSON.stringify(v.filters) === JSON.stringify(filters));
            setActiveView(projectId, matched ? matched.name : "");
          }}
          onSaveView={async () => ({ success: false })}
          onDeleteView={async () => ({ success: false })}
          activeViewName={activeViewName}
          onClearViewName={() => clearFilters(projectId)}
          customStatuses={customStatuses ?? undefined}
        />

        {/* Board Columns */}
        <div
          className="grid grid-cols-1 lg:grid-cols-[repeat(var(--cols),_minmax(0,_1fr))] gap-8 items-start min-h-[60vh]"
          style={{ "--cols": columns.length } as React.CSSProperties}
        >
          {columns.map((col) => {
            const colTasks = filteredTasks.filter((t) => {
              if (customStatuses && customStatuses.length > 0) {
                return t.stage === col.status;
              }
              return t.status === col.status;
            });
            return (
              <KanbanColumn
                key={col.status}
                title={col.title}
                status={col.status}
                itemsCount={colTasks.length}
                dragOverCounters={dragOverCounters}
                handleDragOverColumn={handleDragOverColumn}
                handleDragEnterColumn={handleDragEnterColumn}
                handleDragLeaveColumn={handleDragLeaveColumn}
                handleDrop={handleDrop}
                openCreateTaskAtStatus={openCreateTaskAtStatus}
              >
                {colTasks.map((task) => (
                  <KanbanCard
                    key={task.id}
                    task={task}
                    sprints={sprints}
                    draggedTaskId={draggedTaskId}
                    priorityColors={priorityColors}
                    priorityStickyColors={priorityStickyColors}
                    getRotation={getRotation}
                    handleDragStart={handleDragStart}
                    handleDragEnd={handleDragEnd}
                    handleDrop={handleDrop}
                    openDetails={openDetails}
                    colStatus={col.status}
                  />
                ))}
              </KanbanColumn>
            );
          })}
        </div>
      </div>

      <CreateTaskModal
        isOpen={isCreateTaskModalOpen}
        onClose={closeCreateModal}
        members={members}
        orgId={orgId}
        onCreate={async () => {
          // Delegate to parent hook via query invalidation
          return { success: true };
        }}
        defaultStatus={preselectedStatus}
        customStatuses={customStatuses ?? undefined}
      />

      <TaskDetailsSheet
        task={selectedTask}
        isOpen={isDetailsOpen}
        onClose={closeDetails}
        members={members}
        sprints={sprints}
        onUpdate={handleUpdateTask}
        onDelete={handleDeleteTask}
        customStatuses={customStatuses ?? undefined}
      />
    </>
  );
}
