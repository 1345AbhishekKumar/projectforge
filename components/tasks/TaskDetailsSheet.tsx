"use client";

import React, { useState, useEffect } from "react";
import Image from "next/image";
import { X, Trash2, Loader2, Paperclip, Send, Download, File as FileIcon } from "lucide-react";
import type { TaskStatus, TaskPriority } from "@/types";
import type { TaskWithAssignee } from "@/actions/task";
import type { MemberListItem } from "@/actions/membership";
import { createComment, getTaskComments } from "@/actions/comment";
import { createAttachment, getTaskAttachments, deleteAttachment } from "@/actions/attachment";
import { insforge } from "@/lib/insforge-client";
import type { CommentWithUser, AttachmentWithUser, Sprint, Label } from "@/types";
import { getLabels, createLabel } from "@/actions/label";

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
};

export function TaskDetailsSheet({ task: propTask, isOpen, onClose, members, sprints = [], onUpdate, onDelete }: Props) {
  const task = propTask;
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [status, setStatus] = useState<TaskStatus>("TODO");
  const [priority, setPriority] = useState<TaskPriority>("MEDIUM");
  const [assigneeId, setAssigneeId] = useState("");
  const [dueDate, setDueDate] = useState("");
  const [sprintId, setSprintId] = useState("");
  
  // Label states
  const [labels, setLabels] = useState<Label[]>([]);
  const [selectedLabelIds, setSelectedLabelIds] = useState<string[]>([]);
  const [showLabelCreator, setShowLabelCreator] = useState(false);
  const [newLabelName, setNewLabelName] = useState("");
  const [newLabelColor, setNewLabelColor] = useState("#FFF2B2");
  const [creatingLabel, setCreatingLabel] = useState(false);
  
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState("");

  const [activeTab, setActiveTab] = useState<"details" | "comments">("details");
  const [newComment, setNewComment] = useState("");
  const [postingComment, setPostingComment] = useState(false);
  const [comments, setComments] = useState<CommentWithUser[]>([]);
  const [attachments, setAttachments] = useState<AttachmentWithUser[]>([]);
  const [loadingComments, setLoadingComments] = useState(false);
  const [loadingAttachments, setLoadingAttachments] = useState(false);
  
  const [uploadProgress, setUploadProgress] = useState(0);
  const [uploadingFile, setUploadingFile] = useState(false);
  const [commentError, setCommentError] = useState("");
  const [uploadError, setUploadError] = useState("");

  function formatBytes(bytes: number, decimals = 2) {
    if (!+bytes) return "0 Bytes";
    const k = 1024;
    const dm = decimals < 0 ? 0 : decimals;
    const sizes = ["Bytes", "KB", "MB", "GB", "TB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return `${parseFloat((bytes / Math.pow(k, i)).toFixed(dm))} ${sizes[i]}`;
  }

  // Load comments and attachments on task change
  useEffect(() => {
    if (!isOpen || !task) return;

    const loadData = async () => {
      setLoadingComments(true);
      setLoadingAttachments(true);
      try {
        const [commentsRes, attachmentsRes] = await Promise.all([
          getTaskComments(task.id, task.organization_id),
          getTaskAttachments(task.id, task.organization_id)
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

  async function handlePostComment(e: React.FormEvent) {
    e.preventDefault();
    if (!newComment.trim() || !task) return;

    setCommentError("");
    setPostingComment(true);

    try {
      const res = await createComment(task.id, task.project_id, task.organization_id, newComment.trim());
      if (res.success) {
        setNewComment("");
        const commentsRes = await getTaskComments(task.id, task.organization_id);
        if (commentsRes.success) {
          setComments(commentsRes.data);
        }
      } else {
        setCommentError(res.error || "Failed to post comment");
      }
    } catch {
      setCommentError("An unexpected error occurred");
    } finally {
      setPostingComment(false);
    }
  }

  async function handleFileUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file || !task) return;

    setUploadError("");
    setUploadingFile(true);
    setUploadProgress(0);

    try {
      if (file.size > 20 * 1024 * 1024) {
        setUploadError("File size exceeds 20MB limit");
        setUploadingFile(false);
        return;
      }

      const blockedExtensions = [".exe", ".bat", ".cmd", ".sh", ".js", ".vbs", ".scr", ".msi", ".com"];
      const fileNameLower = file.name.toLowerCase();
      const isBlocked = blockedExtensions.some(ext => fileNameLower.endsWith(ext));
      if (isBlocked) {
        setUploadError("Dangerous file types (scripts/executables) are blocked");
        setUploadingFile(false);
        return;
      }

      setUploadProgress(10);
      const interval = setInterval(() => {
        setUploadProgress(prev => {
          if (prev >= 90) {
            clearInterval(interval);
            return 90;
          }
          return prev + 10;
        });
      }, 150);

      const storagePath = `${task.organization_id}/${task.project_id}/${task.id}/${Date.now()}-${file.name}`;
      const { data, error } = await insforge.storage
        .from("attachments")
        .upload(storagePath, file);

      clearInterval(interval);

      if (error || !data) {
        setUploadError(error?.message || "Failed to upload file to storage");
        setUploadingFile(false);
        return;
      }

      setUploadProgress(100);

      const res = await createAttachment(
        task.id,
        task.project_id,
        task.organization_id,
        file.name,
        file.size,
        data.url,
        data.key
      );

      if (res.success) {
        const attachmentsRes = await getTaskAttachments(task.id, task.organization_id);
        if (attachmentsRes.success) {
          setAttachments(attachmentsRes.data);
        }
      } else {
        setUploadError(res.error || "Failed to save file metadata");
      }
    } catch {
      setUploadError("An unexpected error occurred");
    } finally {
      setUploadingFile(false);
      setTimeout(() => setUploadProgress(0), 1000);
    }
  }

  async function handleFileDelete(attachmentId: string) {
    if (!task || !confirm("Are you sure you want to delete this attachment?")) return;

    setUploadError("");
    try {
      const res = await deleteAttachment(attachmentId, task.organization_id, task.project_id);
      if (res.success) {
        const attachmentsRes = await getTaskAttachments(task.id, task.organization_id);
        if (attachmentsRes.success) {
          setAttachments(attachmentsRes.data);
        }
      } else {
        setUploadError(res.error || "Failed to delete attachment");
      }
    } catch {
      setUploadError("An unexpected error occurred");
    }
  }

  // Sync state with selected task
  useEffect(() => {
    if (!task) return;

    const timer = setTimeout(() => {
      setTitle(task.title || "");
      setDescription(task.description || "");
      setStatus(task.status || "TODO");
      setPriority(task.priority || "MEDIUM");
      setAssigneeId(task.assignee_id || "");
      setSprintId(task.sprint_id || "");
      setSelectedLabelIds(task.labels?.map((l: Label) => l.id) || []);
      
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
    if (!task) return;
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
          <form onSubmit={handleSave} className="flex flex-col gap-5 flex-1">
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
                Sprint (Optional)
              </label>
              {(() => {
                const currentSprint = sprints.find(s => s.id === task.sprint_id);
                const isSprintCompleted = currentSprint?.status === "COMPLETED";
                if (isSprintCompleted) {
                  return (
                    <div className="w-full px-3 py-2 border-2 border-black rounded-sketchy-sm font-sans text-sm bg-neutral-bg flex items-center justify-between shadow-flat-offset-sm">
                      <span className="font-bold text-primary">{currentSprint?.name}</span>
                      <span className="bg-accent-green border-2 border-black text-[9px] font-bold px-2 py-0.5 rounded-full uppercase">Locked (Completed)</span>
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
                      .filter(s => s.status !== "COMPLETED" && s.status !== "CANCELLED")
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
              <label className="font-sans text-xs font-semibold mb-1 block">
                Due Date (Optional)
              </label>
              <input
                type="date"
                value={dueDate}
                onChange={(e) => setDueDate(e.target.value)}
                className="w-full px-3 py-2 border-2 border-black rounded-sketchy-sm font-sans text-sm bg-white focus:outline-none focus:ring-2 focus:ring-tertiary transition-shadow cursor-pointer shadow-flat-offset-sm"
              />
            </div>

            {/* Labels Selection */}
            <div>
              <label className="font-sans text-xs font-semibold mb-1 block">
                Labels
              </label>
              
              <div className="flex flex-wrap gap-1.5 mb-2">
                {selectedLabelIds.map(id => {
                  const label = labels.find(l => l.id === id);
                  if (!label) return null;
                  return (
                    <span
                      key={label.id}
                      style={{ backgroundColor: label.color }}
                      className="text-[9px] font-bold px-2 py-0.5 rounded-full border border-black/40 text-primary flex items-center gap-1 select-none"
                    >
                      {label.name}
                      <button
                        type="button"
                        onClick={() => setSelectedLabelIds(prev => prev.filter(lid => lid !== label.id))}
                        className="hover:text-red-500 font-bold"
                      >
                        ×
                      </button>
                    </span>
                  );
                })}
                {selectedLabelIds.length === 0 && (
                  <span className="text-[10px] text-secondary/60 italic">No labels selected</span>
                )}
              </div>

              {/* List of selectables */}
              <div className="border-2 border-black rounded-sketchy-sm p-2 bg-neutral-bg/25 max-h-32 overflow-y-auto flex flex-col gap-1">
                {labels.map((label) => {
                  const isChecked = selectedLabelIds.includes(label.id);
                  return (
                    <button
                      type="button"
                      key={label.id}
                      onClick={() => {
                        setSelectedLabelIds(prev =>
                          isChecked ? prev.filter(id => id !== label.id) : [...prev, label.id]
                        );
                      }}
                      className="flex items-center justify-between text-left px-2 py-1 hover:bg-neutral-bg/50 rounded text-xs font-sans font-semibold cursor-pointer"
                    >
                      <div className="flex items-center gap-2">
                        <span className="w-2.5 h-2.5 rounded-full border border-black/30" style={{ backgroundColor: label.color }} />
                        <span>{label.name}</span>
                      </div>
                      {isChecked && <span className="text-tertiary font-bold">✓</span>}
                    </button>
                  );
                })}

                <button
                  type="button"
                  onClick={() => setShowLabelCreator(!showLabelCreator)}
                  className="text-left px-2 py-1 text-[10px] font-bold text-tertiary hover:underline cursor-pointer border-t border-black/5 mt-1 pt-1.5"
                >
                  {showLabelCreator ? "Cancel new label" : "+ Create new label"}
                </button>
              </div>
            </div>

            {/* Inline Label Creator */}
            {showLabelCreator && (
              <div className="border-2 border-black rounded-sketchy bg-[#FFF2B2]/10 p-3 flex flex-col gap-2.5">
                <span className="font-cursive text-sm font-bold">New Workspace Label</span>
                <div className="flex gap-2">
                  <input
                    type="text"
                    placeholder="Label name (e.g. Bug)"
                    value={newLabelName}
                    onChange={(e) => setNewLabelName(e.target.value)}
                    className="flex-grow px-2 py-1 border-2 border-black rounded-sketchy-sm font-sans text-xs bg-white focus:outline-none focus:ring-2 focus:ring-tertiary"
                  />
                  <button
                    type="button"
                    disabled={creatingLabel || !newLabelName.trim()}
                    onClick={async () => {
                      if (!newLabelName.trim()) return;
                      setCreatingLabel(true);
                      const res = await createLabel(task.organization_id, newLabelName.trim(), newLabelColor);
                      setCreatingLabel(false);
                      if (res.success && res.data) {
                        setLabels(prev => [...prev, res.data!]);
                        setSelectedLabelIds(prev => [...prev, res.data!.id]);
                        setNewLabelName("");
                        setShowLabelCreator(false);
                      } else {
                        alert(res.error || "Failed to create label");
                      }
                    }}
                    className="px-3 py-1 bg-tertiary hover:bg-tertiary-hover text-white font-sans text-xs font-bold border-2 border-black rounded-full shadow-flat-offset-sm active:translate-y-0.5 hover:-translate-y-0.5 transition-all cursor-pointer disabled:opacity-40"
                  >
                    Create
                  </button>
                </div>
                <div className="flex items-center gap-1.5 flex-wrap">
                  <span className="text-[10px] font-bold font-sans text-secondary">Color:</span>
                  {["#FFF2B2", "#FFD2D2", "#D0E1FD", "#D4EDDA", "#EEF2FF", "#FF7F50"].map((color) => (
                    <button
                      type="button"
                      key={color}
                      onClick={() => setNewLabelColor(color)}
                      style={{ backgroundColor: color }}
                      className={`w-4 h-4 rounded-full border border-black/40 cursor-pointer transition-all ${
                        newLabelColor === color ? "ring-2 ring-black scale-110" : "hover:scale-105"
                      }`}
                    />
                  ))}
                </div>
              </div>
            )}

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
        )}

        {/* Tab 2: Comments & Files */}
        {activeTab === "comments" && (
          <div className="flex flex-col gap-6 flex-1 overflow-y-auto pr-1">
            {/* Attachments Section */}
            <div className="flex flex-col gap-4">
              <h3 className="font-cursive text-xl font-bold">Attachments</h3>
              
              {/* Drag & Drop Zone */}
              <label className="border-2 border-dashed border-black rounded-sketchy p-6 text-center hover:bg-neutral-bg/30 transition-all cursor-pointer block relative">
                <input
                  type="file"
                  onChange={handleFileUpload}
                  className="hidden"
                  disabled={uploadingFile}
                />
                <div className="flex flex-col items-center gap-2">
                  <Paperclip className="h-8 w-8 text-secondary" />
                  <span className="font-sans text-sm font-bold">Click to attach file</span>
                  <span className="font-sans text-xs text-secondary/70">Max size 20MB. Scripts are blocked.</span>
                </div>
              </label>

              {/* Progress Bar */}
              {uploadingFile && (
                <div className="w-full bg-neutral-dot border-2 border-black rounded-full h-4 overflow-hidden relative">
                  <div
                    className="bg-tertiary h-full transition-all duration-300 border-r-2 border-black"
                    style={{ width: `${uploadProgress}%` }}
                  />
                  <span className="absolute inset-0 flex items-center justify-center font-sans text-[10px] font-bold text-primary">
                    Uploading... {uploadProgress}%
                  </span>
                </div>
              )}

              {uploadError && (
                <div className="bg-accent-pink border-2 border-black rounded-sketchy-sm p-3 text-xs font-semibold">
                  {uploadError}
                </div>
              )}

              {/* Attachments List */}
              {loadingAttachments ? (
                <div className="flex items-center justify-center p-4">
                  <Loader2 className="h-6 w-6 animate-spin text-tertiary" />
                </div>
              ) : attachments.length === 0 ? (
                <p className="font-sans text-xs text-secondary/60 italic">No attachments uploaded yet.</p>
              ) : (
                <div className="flex flex-col gap-2">
                  {attachments.map((file) => (
                    <div
                      key={file.id}
                      className="flex items-center justify-between p-3 border-2 border-black rounded-sketchy bg-white shadow-flat-offset-sm gap-2"
                    >
                      <div className="flex items-center gap-2 overflow-hidden">
                        <FileIcon className="h-5 w-5 text-tertiary flex-shrink-0" />
                        <div className="flex flex-col overflow-hidden">
                          <span className="font-sans text-xs font-bold truncate">{file.file_name}</span>
                          <span className="font-sans text-[10px] text-secondary">
                            {formatBytes(file.file_size)} • by {file.user?.full_name || "Member"}
                          </span>
                        </div>
                      </div>
                      <div className="flex items-center gap-2 flex-shrink-0">
                        <a
                          href={file.file_url}
                          download={file.file_name}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="p-1 border-2 border-black rounded-full hover:bg-neutral-bg flex items-center justify-center shadow-flat-offset-xs active:translate-y-0.5 transition-all"
                          title="Download file"
                        >
                          <Download className="h-3 w-3" />
                        </a>
                        <button
                          type="button"
                          onClick={() => handleFileDelete(file.id)}
                          className="p-1 border-2 border-black rounded-full hover:bg-accent-pink flex items-center justify-center shadow-flat-offset-xs active:translate-y-0.5 transition-all text-secondary hover:text-primary cursor-pointer"
                          title="Delete file"
                        >
                          <Trash2 className="h-3 w-3" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Comments Section */}
            <div className="flex flex-col gap-4 mt-4 pt-6 border-t border-black/10">
              <h3 className="font-cursive text-xl font-bold">Comments</h3>

              {/* Comments List */}
              {loadingComments ? (
                <div className="flex items-center justify-center p-4">
                  <Loader2 className="h-6 w-6 animate-spin text-tertiary" />
                </div>
              ) : comments.length === 0 ? (
                <p className="font-sans text-xs text-secondary/60 italic">No comments posted yet.</p>
              ) : (
                <div className="flex flex-col gap-4 max-h-[300px] overflow-y-auto pr-1">
                  {comments.map((comment) => (
                    <div
                      key={comment.id}
                      className="bg-white border-2 border-black rounded-sketchy p-4 shadow-flat-offset-sm relative"
                    >
                      <div className="flex items-center gap-2 mb-2">
                        {comment.user?.avatar_url ? (
                          <Image
                            src={comment.user.avatar_url}
                            alt={comment.user.full_name || "User"}
                            width={24}
                            height={24}
                            className="rounded-full border border-black"
                          />
                        ) : (
                          <div className="w-6 h-6 rounded-full bg-accent-blue border border-black flex items-center justify-center font-sans text-[10px] font-bold text-primary uppercase">
                            {comment.user?.full_name?.substring(0, 2) || "ME"}
                          </div>
                        )}
                        <span className="font-sans text-xs font-bold">
                          {comment.user?.full_name || "Member"}
                        </span>
                        <span className="font-sans text-[10px] text-secondary ml-auto">
                          {new Date(comment.created_at).toLocaleString()}
                        </span>
                      </div>
                      <p className="font-sans text-xs text-primary whitespace-pre-wrap">
                        {comment.content}
                      </p>
                    </div>
                  ))}
                </div>
              )}

              {/* New Comment Input */}
              {commentError && (
                <div className="bg-accent-pink border-2 border-black rounded-sketchy-sm p-3 text-xs font-semibold">
                  {commentError}
                </div>
              )}
              
              <form onSubmit={handlePostComment} className="flex gap-2 items-start mt-2">
                <textarea
                  value={newComment}
                  onChange={(e) => setNewComment(e.target.value)}
                  placeholder="Type a comment..."
                  maxLength={1000}
                  rows={2}
                  className="flex-1 px-3 py-2 border-2 border-black rounded-sketchy-sm font-sans text-xs bg-white placeholder:text-secondary/40 focus:outline-none focus:ring-2 focus:ring-tertiary resize-none"
                />
                <button
                  type="submit"
                  disabled={postingComment || !newComment.trim()}
                  className="p-3 bg-tertiary hover:bg-tertiary-hover text-white border-2 border-black rounded-full font-sans text-xs font-bold shadow-flat-offset-sm active:translate-y-0.5 hover:-translate-y-0.5 transition-all disabled:opacity-40 disabled:pointer-events-none cursor-pointer flex-shrink-0"
                >
                  {postingComment ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Send className="h-4 w-4" />
                  )}
                </button>
              </form>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
