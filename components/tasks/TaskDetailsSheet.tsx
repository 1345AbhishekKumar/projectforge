"use client";

import React, { useState, useEffect } from "react";
import { X, Trash2, Loader2 } from "lucide-react";
import type { TaskStatus, TaskPriority } from "@/types";
import type { TaskWithAssignee } from "@/actions/task";
import type { MemberListItem } from "@/actions/membership";

type Props = {
  task: TaskWithAssignee | null;
  isOpen: boolean;
  onClose: () => void;
  members: MemberListItem[];
  onUpdate: (
    taskId: string,
    updates: {
      title?: string;
      description?: string | null;
      status?: TaskStatus;
      priority?: TaskPriority;
      assignee_id?: string | null;
      due_date?: string | null;
    }
  ) => Promise<{ success: boolean; error?: string }>;
  onDelete: (taskId: string) => Promise<{ success: boolean; error?: string }>;
};

export function TaskDetailsSheet({ task, isOpen, onClose, members, onUpdate, onDelete }: Props) {
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [status, setStatus] = useState<TaskStatus>("TODO");
  const [priority, setPriority] = useState<TaskPriority>("MEDIUM");
  const [assigneeId, setAssigneeId] = useState("");
  const [dueDate, setDueDate] = useState("");
  
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState("");

  // Sync state with selected task
  useEffect(() => {
    if (!task) return;

    const timer = setTimeout(() => {
      setTitle(task.title || "");
      setDescription(task.description || "");
      setStatus(task.status || "TODO");
      setPriority(task.priority || "MEDIUM");
      setAssigneeId(task.assignee_id || "");
      
      if (task.due_date) {
        const date = new Date(task.due_date);
        const yyyy = date.getFullYear();
        const mm = String(date.getMonth() + 1).padStart(2, "0");
        const dd = String(date.getDate()).padStart(2, "0");
        setDueDate(`${yyyy}-${mm}-${dd}`);
      } else {
        setDueDate("");
      }
      setError("");
    }, 0);

    return () => clearTimeout(timer);
  }, [task]);

  if (!isOpen || !task) return null;

  const isOverdue = task.due_date && new Date(task.due_date) < new Date() && task.status !== "DONE";

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    if (!title || title.length < 3) {
      setError("Title must be at least 3 characters");
      return;
    }

    setError("");
    setSaving(true);

    try {
      const result = await onUpdate(task.id, {
        title,
        description: description || null,
        status,
        priority,
        assignee_id: assigneeId || null,
        due_date: dueDate || null,
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
            Modify task details or delete the task from the backlog scope.
          </p>
        </div>

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

        {/* Form Body */}
        <form onSubmit={handleSave} className="flex flex-col gap-5 flex-1">
          <div>
            <label className="font-sans text-xs font-semibold mb-1 block">
              Title
            </label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              required
              minLength={3}
              maxLength={100}
              className="w-full px-3 py-2 border-2 border-black rounded-sketchy-sm font-sans text-sm bg-white placeholder:text-secondary/40 focus:outline-none focus:ring-2 focus:ring-tertiary transition-shadow"
            />
          </div>

          <div>
            <label className="font-sans text-xs font-semibold mb-1 block">
              Description (Optional)
            </label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              maxLength={500}
              rows={4}
              className="w-full px-3 py-2 border-2 border-black rounded-sketchy-sm font-sans text-sm bg-white placeholder:text-secondary/40 focus:outline-none focus:ring-2 focus:ring-tertiary transition-shadow resize-none"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="font-sans text-xs font-semibold mb-1 block">
                Status
              </label>
              <select
                value={status}
                onChange={(e) => setStatus(e.target.value as TaskStatus)}
                className="w-full px-3 py-2 border-2 border-black rounded-sketchy-sm font-sans text-sm bg-white focus:outline-none focus:ring-2 focus:ring-tertiary cursor-pointer"
              >
                <option value="TODO">TODO</option>
                <option value="IN_PROGRESS">IN PROGRESS</option>
                <option value="DONE">DONE</option>
              </select>
            </div>

            <div>
              <label className="font-sans text-xs font-semibold mb-1 block">
                Priority
              </label>
              <select
                value={priority}
                onChange={(e) => setPriority(e.target.value as TaskPriority)}
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
            <label className="font-sans text-xs font-semibold mb-1 block">
              Assignee (Optional)
            </label>
            <select
              value={assigneeId}
              onChange={(e) => setAssigneeId(e.target.value)}
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
            <label className="font-sans text-xs font-semibold mb-1 block">
              Due Date (Optional)
            </label>
            <input
              type="date"
              value={dueDate}
              onChange={(e) => setDueDate(e.target.value)}
              className="w-full px-3 py-2 border-2 border-black rounded-sketchy-sm font-sans text-sm bg-white focus:outline-none focus:ring-2 focus:ring-tertiary transition-shadow cursor-pointer"
            />
          </div>

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
              disabled={saving || deleting || !title}
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
      </div>
    </div>
  );
}
