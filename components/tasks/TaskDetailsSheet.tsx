"use client";

import React, { useState, useEffect } from "react";
import { X, Trash2, Loader2 } from "lucide-react";
import type { TaskStatus, TaskPriority } from "@/types";
import type { TaskWithAssignee } from "@/actions/task";
import type { MemberListItem } from "@/actions/membership";
import { getTaskComments } from "@/actions/comment";
import { getTaskAttachments } from "@/actions/attachment";
import type { CommentWithUser, AttachmentWithUser, Sprint, Label } from "@/types";
import { getLabels } from "@/actions/label";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { TaskComments } from "./details/TaskComments";
import { TaskAttachments } from "./details/TaskAttachments";
import { TaskLabelSelector } from "./details/TaskLabelSelector";
import { TaskTimeSection } from "./details/TaskTimeSection";

const taskDetailsSchema = z.object({
  title: z
    .string()
    .trim()
    .min(3, "Title must be at least 3 characters")
    .max(100, "Title must be at most 100 characters"),
  description: z.string().trim().max(500, "Description must be at most 500 characters").optional(),
  status: z.string().min(1, "Status is required"),
  priority: z.enum(["LOW", "MEDIUM", "HIGH", "URGENT"]),
  assigneeId: z.string().optional(),
  dueDate: z.string().optional(),
});

type TaskDetailsInput = z.infer<typeof taskDetailsSchema>;

type Props = {
  task: TaskWithAssignee | null;
  isOpen: boolean;
  onClose: () => void;
  members: MemberListItem[];
  sprints: Sprint[];
  onUpdate: (
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
  ) => Promise<{ success: boolean; error?: string }>;
  onDelete: (taskId: string) => Promise<{ success: boolean; error?: string }>;
  customStatuses?: string[] | null;
};

export function TaskDetailsSheet({ task: propTask, isOpen, onClose, members, sprints = [], onUpdate, onDelete, customStatuses }: Props) {
  const task = propTask;

  const {
    register: registerDetails,
    handleSubmit: handleSubmitDetails,
    formState: { errors: detailsErrors },
    reset: resetDetails,
  } = useForm<TaskDetailsInput>({
    resolver: zodResolver(taskDetailsSchema),
    mode: "onBlur",
    defaultValues: {
      title: "",
      description: "",
      status: "TODO",
      priority: "MEDIUM",
      assigneeId: "",
      dueDate: "",
    },
  });

  const [sprintId, setSprintId] = useState("");
  const [labels, setLabels] = useState<Label[]>([]);
  const [selectedLabelIds, setSelectedLabelIds] = useState<string[]>([]);
  
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState("");

  const [activeTab, setActiveTab] = useState<"details" | "comments">("details");
  const [comments, setComments] = useState<CommentWithUser[]>([]);
  const [attachments, setAttachments] = useState<AttachmentWithUser[]>([]);
  const [loadingComments, setLoadingComments] = useState(false);
  const [loadingAttachments, setLoadingAttachments] = useState(false);

  // Load comments and attachments on task change
  useEffect(() => {
    if (!isOpen || !task) return;

    const loadData = async () => {
      setLoadingComments(true);
      setLoadingAttachments(true);
      try {
        const [commentsRes, attachmentsRes] = await Promise.all([
          getTaskComments(task.id, task.organization_id),
          getTaskAttachments(task.id, task.organization_id),
        ]);
        if (commentsRes.success) setComments(commentsRes.data);
        if (attachmentsRes.success) setAttachments(attachmentsRes.data);
      } catch (err) {
        console.error(err);
      } finally {
        setLoadingComments(false);
        setLoadingAttachments(false);
      }
    };

    loadData();
  }, [task, isOpen]);

  // Fetch labels
  useEffect(() => {
    if (!isOpen || !task) return;
    const orgId = task.organization_id;
    async function loadLabels() {
      const res = await getLabels(orgId);
      if (res.success) {
        setLabels(res.data);
      }
    }
    loadLabels();
  }, [isOpen, task]);

  // Helper to format date
  const formatDateForInput = (dateStr: string | null) => {
    if (!dateStr) return "";
    const date = new Date(dateStr);
    if (isNaN(date.getTime())) return "";
    const yyyy = date.getFullYear();
    const mm = String(date.getMonth() + 1).padStart(2, "0");
    const dd = String(date.getDate()).padStart(2, "0");
    return `${yyyy}-${mm}-${dd}`;
  };

  // Sync state with selected task
  useEffect(() => {
    if (!task) return;

    const timer = setTimeout(() => {
      resetDetails({
        title: task.title || "",
        description: task.description || "",
        status: task.status || "TODO",
        priority: task.priority || "MEDIUM",
        assigneeId: task.assignee_id || "",
        dueDate: formatDateForInput(task.due_date),
      });
      setSprintId(task.sprint_id || "");
      setSelectedLabelIds(task.labels?.map((l: Label) => l.id) || []);
      setError("");
    }, 0);

    return () => clearTimeout(timer);
  }, [task, resetDetails]);

  if (!isOpen || !task) return null;

  const isOverdue = task.due_date && new Date(task.due_date) < new Date() && task.status !== "DONE";

  async function onSaveSubmit(data: TaskDetailsInput) {
    if (!task) return;

    setError("");
    setSaving(true);

    try {
      const result = await onUpdate(task.id, {
        title: data.title,
        description: data.description || null,
        status: data.status,
        priority: data.priority,
        assignee_id: data.assigneeId || null,
        due_date: data.dueDate || null,
        sprint_id: sprintId || null,
        label_ids: selectedLabelIds,
      });

      if (result.success) {
        onClose();
      } else {
        setError(result.error || "Failed to update task");
      }
    } catch {
      setError("An unexpected error occurred");
    } finally {
      setSaving(false);
    }
  }

  async function handleDeleteClick() {
    if (!task) return;
    if (!confirm("Are you sure you want to delete this task from the board backlog?")) return;

    setError("");
    setDeleting(true);

    try {
      const result = await onDelete(task.id);
      if (result.success) {
        onClose();
      } else {
        setError(result.error || "Failed to delete task");
      }
    } catch {
      setError("An unexpected error occurred");
    } finally {
      setDeleting(false);
    }
  }

  return (
    <div
      className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 flex justify-end"
      onClick={onClose}
    >
      <div
        className="bg-white border-l-2 border-black w-full max-w-lg h-full p-6 md:p-8 relative shadow-[-4px_0_0_rgba(0,0,0,1)] flex flex-col gap-6 overflow-y-auto animate-in slide-in-from-right duration-200"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 w-8 h-8 rounded-full border-2 border-black bg-white hover:bg-neutral-bg flex items-center justify-center shadow-flat-offset-sm active:translate-y-0.5 hover:-translate-y-0.5 transition-all cursor-pointer font-bold"
          aria-label="Close drawer"
        >
          <X className="h-4 w-4" />
        </button>

        {/* Drawer Header */}
        <div>
          <h2 className="font-cursive text-3xl font-bold mb-1">Task Specification</h2>
          <p className="font-sans text-xs text-secondary">
            Modify task details, manage attachments, or add comments.
          </p>
        </div>

        {/* Tabs Switcher */}
        <div className="flex border-b border-black">
          <button
            type="button"
            onClick={() => setActiveTab("details")}
            className={`px-4 py-2 font-cursive text-lg font-bold border-t-2 border-x-2 border-black rounded-t-lg -mb-[2px] transition-all cursor-pointer ${
              activeTab === "details"
                ? "bg-accent-yellow shadow-[0_-2px_0_rgba(0,0,0,1)]"
                : "bg-transparent border-transparent hover:bg-neutral-bg/50"
            }`}
          >
            Details
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("comments")}
            className={`px-4 py-2 font-cursive text-lg font-bold border-t-2 border-x-2 border-black rounded-t-lg -mb-[2px] transition-all cursor-pointer ${
              activeTab === "comments"
                ? "bg-accent-yellow shadow-[0_-2px_0_rgba(0,0,0,1)]"
                : "bg-transparent border-transparent hover:bg-neutral-bg/50"
            }`}
          >
            Comments & Files ({comments.length + attachments.length})
          </button>
        </div>

        {/* Tab 1: Details */}
        {activeTab === "details" && (
          <form onSubmit={handleSubmitDetails(onSaveSubmit)} className="flex flex-col gap-5 flex-1">
            {/* Overdue Warning Card */}
            {isOverdue && (
              <div className="bg-accent-pink border-2 border-black rounded-sketchy-sm p-4 text-center">
                <p className="font-sans text-xs font-bold text-primary">
                  ⚠️ Warning: This task&apos;s due date has passed but status is not marked as DONE.
                </p>
              </div>
            )}

            {error && (
              <div className="bg-accent-pink border-2 border-black rounded-sketchy-sm p-3 text-xs font-semibold">
                {error}
              </div>
            )}

            <div>
              <label className="font-sans text-xs font-semibold mb-1 block">Title</label>
              <input
                type="text"
                {...registerDetails("title")}
                className={`w-full px-3 py-2 border-2 border-black rounded-sketchy-sm font-sans text-sm bg-white placeholder:text-secondary/40 focus:outline-none focus:ring-2 focus:ring-tertiary transition-shadow ${
                  detailsErrors.title ? "border-rose-500 bg-rose-50/20" : ""
                }`}
              />
              {detailsErrors.title && (
                <span aria-live="polite" className="text-xs font-mono font-bold text-rose-600 mt-1 block">
                  {detailsErrors.title.message}
                </span>
              )}
            </div>

            <div>
              <label className="font-sans text-xs font-semibold mb-1 block">Description (Optional)</label>
              <textarea
                {...registerDetails("description")}
                rows={4}
                className={`w-full px-3 py-2 border-2 border-black rounded-sketchy-sm font-sans text-sm bg-white placeholder:text-secondary/40 focus:outline-none focus:ring-2 focus:ring-tertiary transition-shadow resize-none ${
                  detailsErrors.description ? "border-rose-500 bg-rose-50/20" : ""
                }`}
              />
              {detailsErrors.description && (
                <span aria-live="polite" className="text-xs font-mono font-bold text-rose-600 mt-1 block">
                  {detailsErrors.description.message}
                </span>
              )}
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="font-sans text-xs font-semibold mb-1 block">Status</label>
                <select
                  {...registerDetails("status")}
                  className="w-full px-3 py-2 border-2 border-black rounded-sketchy-sm font-sans text-sm bg-white focus:outline-none focus:ring-2 focus:ring-tertiary cursor-pointer"
                >
                  {customStatuses && customStatuses.length > 0 ? (
                    customStatuses.map((s) => (
                      <option key={s} value={s}>
                        {s.replace(/_/g, " ").replace(/\b\w/g, c => c.toUpperCase())}
                      </option>
                    ))
                  ) : (
                    <>
                      <option value="TODO">TODO</option>
                      <option value="IN_PROGRESS">IN PROGRESS</option>
                      <option value="DONE">DONE</option>
                    </>
                  )}
                </select>
              </div>

              <div>
                <label className="font-sans text-xs font-semibold mb-1 block">Priority</label>
                <select
                  {...registerDetails("priority")}
                  className="w-full px-3 py-2 border-2 border-black rounded-sketchy-sm font-sans text-sm bg-white focus:outline-none focus:ring-2 focus:ring-tertiary cursor-pointer"
                >
                  <option value="LOW">LOW</option>
                  <option value="MEDIUM">MEDIUM</option>
                  <option value="HIGH">HIGH</option>
                  <option value="URGENT">URGENT</option>
                </select>
              </div>
            </div>

            <div>
              <label className="font-sans text-xs font-semibold mb-1 block">Assignee (Optional)</label>
              <select
                {...registerDetails("assigneeId")}
                className="w-full px-3 py-2 border-2 border-black rounded-sketchy-sm font-sans text-sm bg-white focus:outline-none focus:ring-2 focus:ring-tertiary cursor-pointer"
              >
                <option value="">Unassigned</option>
                {members.map((member) => (
                  <option key={member.id} value={member.userId}>
                    {member.name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="font-sans text-xs font-semibold mb-1 block">Sprint (Optional)</label>
              {(() => {
                const currentSprint = sprints.find((s) => s.id === task.sprint_id);
                const isSprintCompleted = currentSprint?.status === "COMPLETED";
                if (isSprintCompleted) {
                  return (
                    <div className="w-full px-3 py-2 border-2 border-black rounded-sketchy-sm font-sans text-sm bg-neutral-bg flex items-center justify-between shadow-flat-offset-sm">
                      <span className="font-bold text-primary">{currentSprint?.name}</span>
                      <span className="bg-accent-green border-2 border-black text-[9px] font-bold px-2 py-0.5 rounded-full uppercase">
                        Locked (Completed)
                      </span>
                    </div>
                  );
                }
                return (
                  <select
                    value={sprintId}
                    onChange={(e) => setSprintId(e.target.value)}
                    className="w-full px-3 py-2 border-2 border-black rounded-sketchy-sm font-sans text-sm bg-white focus:outline-none focus:ring-2 focus:ring-tertiary cursor-pointer shadow-flat-offset-sm"
                  >
                    <option value="">No Sprint</option>
                    {sprints
                      .filter((s) => s.status !== "COMPLETED" && s.status !== "CANCELLED")
                      .map((sprint) => (
                        <option key={sprint.id} value={sprint.id}>
                          {sprint.name} ({sprint.status.toLowerCase()})
                        </option>
                      ))}
                  </select>
                );
              })()}
            </div>

            <div>
              <label className="font-sans text-xs font-semibold mb-1 block">Due Date (Optional)</label>
              <input
                type="date"
                {...registerDetails("dueDate")}
                className="w-full px-3 py-2 border-2 border-black rounded-sketchy-sm font-sans text-sm bg-white focus:outline-none focus:ring-2 focus:ring-tertiary transition-shadow cursor-pointer shadow-flat-offset-sm"
              />
            </div>

            <TaskLabelSelector
              orgId={task.organization_id}
              selectedLabelIds={selectedLabelIds}
              setSelectedLabelIds={setSelectedLabelIds}
              labels={labels}
              setLabels={setLabels}
            />

            <TaskTimeSection
              taskId={task.id}
              orgId={task.organization_id}
            />

            {/* Action Buttons at Bottom */}
            <div className="flex flex-col sm:flex-row gap-3 mt-auto pt-6 border-t border-black/10">
              <button
                type="button"
                onClick={handleDeleteClick}
                disabled={deleting || saving}
                className="flex items-center justify-center gap-1.5 py-2.5 px-4 bg-accent-pink hover:bg-[#FFB2B2] text-primary border-2 border-black rounded-full font-sans text-sm font-bold shadow-flat-offset-sm active:translate-y-0.5 hover:-translate-y-0.5 transition-all disabled:opacity-40 disabled:pointer-events-none cursor-pointer"
              >
                {deleting ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Trash2 className="h-4 w-4" />
                )}
                Delete Task
              </button>

              <button
                type="submit"
                disabled={saving || deleting}
                className="flex-1 py-2.5 bg-tertiary hover:bg-tertiary-hover text-white border-2 border-black rounded-full font-sans text-sm font-bold shadow-flat-offset-sm active:translate-y-0.5 hover:-translate-y-0.5 transition-all disabled:opacity-40 disabled:pointer-events-none cursor-pointer"
              >
                {saving ? (
                  <span className="flex items-center justify-center gap-2">
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Saving...
                  </span>
                ) : (
                  "Save Changes"
                )}
              </button>
            </div>
          </form>
        )}

        {/* Tab 2: Comments & Files */}
        {activeTab === "comments" && (
          <div className="flex flex-col gap-6 flex-1 overflow-y-auto pr-1">
            <TaskAttachments
              taskId={task.id}
              projectId={task.project_id}
              orgId={task.organization_id}
              attachments={attachments}
              onAttachmentsChanged={setAttachments}
              loadingAttachments={loadingAttachments}
            />

            <TaskComments
              taskId={task.id}
              projectId={task.project_id}
              orgId={task.organization_id}
              comments={comments}
              onCommentAdded={setComments}
              loadingComments={loadingComments}
            />
          </div>
        )}
      </div>
    </div>
  );
}
