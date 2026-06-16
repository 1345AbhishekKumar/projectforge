"use client";

import { useState, useEffect } from "react";
import { Loader2, Plus, X } from "lucide-react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import type { TaskStatus, TaskPriority, Label } from "@/types";
import type { MemberListItem } from "@/actions/membership";
import { getLabels, createLabel } from "@/actions/label";

const createTaskSchema = z.object({
  title: z
    .string()
    .trim()
    .min(3, "Task title must be at least 3 characters")
    .max(100, "Task title must be at most 100 characters"),
  description: z.string().trim().max(500, "Description must be at most 500 characters").optional(),
  priority: z.enum(["LOW", "MEDIUM", "HIGH", "URGENT"]),
  status: z.enum(["TODO", "IN_PROGRESS", "DONE"]),
  assigneeId: z.string().optional(),
  dueDate: z.string().optional(),
});

type CreateTaskInput = z.infer<typeof createTaskSchema>;

type Props = {
  isOpen: boolean;
  onClose: () => void;
  members: MemberListItem[];
  orgId: string;
  onCreate: (
    title: string,
    description: string | null,
    status: TaskStatus,
    priority: TaskPriority,
    assigneeId: string | null,
    dueDate: string | null,
    labelIds: string[]
  ) => Promise<{ success: boolean; error?: string }>;
  defaultStatus?: TaskStatus;
};

const labelColors = [
  "#FFF2B2", // Muted Yellow
  "#FFD2D2", // Muted Pink
  "#D0E1FD", // Muted Blue
  "#D4EDDA", // Muted Green
  "#EEF2FF", // Muted Purple
  "#FF7F50", // Coral/Orange
];

export function CreateTaskModal({ isOpen, onClose, members, orgId, onCreate, defaultStatus }: Props) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  // Label states — managed outside RHF due to custom interactive picker
  const [labels, setLabels] = useState<Label[]>([]);
  const [selectedLabelIds, setSelectedLabelIds] = useState<string[]>([]);
  const [showLabelCreator, setShowLabelCreator] = useState(false);
  const [newLabelName, setNewLabelName] = useState("");
  const [newLabelColor, setNewLabelColor] = useState(labelColors[0]);
  const [creatingLabel, setCreatingLabel] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
    reset,
  } = useForm<CreateTaskInput>({
    resolver: zodResolver(createTaskSchema),
    mode: "onBlur",
    defaultValues: {
      title: "",
      description: "",
      priority: "MEDIUM",
      status: defaultStatus || "TODO",
      assigneeId: "",
      dueDate: "",
    },
  });

  // Fetch labels on open
  useEffect(() => {
    if (!isOpen || !orgId) return;
    async function loadLabels() {
      const res = await getLabels(orgId);
      if (res.success) {
        setLabels(res.data);
      }
    }
    loadLabels();
  }, [isOpen, orgId]);

  if (!isOpen) return null;

  const handleClose = () => {
    reset();
    setSelectedLabelIds([]);
    setShowLabelCreator(false);
    setNewLabelName("");
    setError("");
    onClose();
  };

  async function onSubmit(data: CreateTaskInput) {
    setError("");
    setLoading(true);

    try {
      const result = await onCreate(
        data.title,
        data.description || null,
        data.status,
        data.priority,
        data.assigneeId || null,
        data.dueDate || null,
        selectedLabelIds
      );
      if (result.success) {
        reset();
        setSelectedLabelIds([]);
        setShowLabelCreator(false);
        setNewLabelName("");
        onClose();
      } else {
        setError(result.error || "Failed to create task");
      }
    } catch {
      setError("An unexpected error occurred");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-white border-2 border-black rounded-sketchy shadow-flat-offset p-6 md:p-8 max-w-md w-full relative rotate-[0.5deg] animate-in fade-in zoom-in duration-200 overflow-y-auto max-h-[90vh]">
        
        {/* Close Button */}
        <button
          onClick={handleClose}
          className="absolute top-4 right-4 w-8 h-8 rounded-full border-2 border-black bg-white hover:bg-neutral-bg flex items-center justify-center shadow-flat-offset-sm active:translate-y-0.5 hover:-translate-y-0.5 transition-all cursor-pointer font-bold"
          aria-label="Close modal"
        >
          <X className="h-4 w-4" />
        </button>

        {/* Modal Header */}
        <div className="flex items-center gap-2.5 mb-4">
          <div className="w-8 h-8 rounded-full bg-white border-2 border-black flex items-center justify-center shadow-flat-offset-sm">
            <Plus className="h-4.5 w-4.5 text-tertiary" />
          </div>
          <h2 className="font-cursive text-2xl font-bold">Create Task</h2>
        </div>

        <p className="font-sans text-xs text-secondary mb-6 leading-relaxed">
          Map a new task on the whiteboard backlog. Define the assignee, priority, status, and deadline.
        </p>

        {error && (
          <div className="bg-accent-pink border-2 border-black rounded-sketchy-sm p-3 mb-4 text-xs font-semibold">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-4">
          <div>
            <label className="font-sans text-xs font-semibold mb-1 block">
              Task Title
            </label>
            <input
              type="text"
              {...register("title")}
              placeholder="e.g., Integrate checkout form"
              className={`w-full px-3 py-2 border-2 border-black rounded-sketchy-sm font-sans text-sm bg-white placeholder:text-secondary/40 focus:outline-none focus:ring-2 focus:ring-tertiary transition-shadow ${
                errors.title ? "border-rose-500 bg-rose-50/20" : ""
              }`}
            />
            {errors.title && (
              <span aria-live="polite" className="text-xs font-mono font-bold text-rose-600 mt-1 block">
                {errors.title.message}
              </span>
            )}
          </div>

          <div>
            <label className="font-sans text-xs font-semibold mb-1 block">
              Description (Optional)
            </label>
            <textarea
              {...register("description")}
              placeholder="Provide context or steps to complete this task"
              rows={2}
              className={`w-full px-3 py-2 border-2 border-black rounded-sketchy-sm font-sans text-sm bg-white placeholder:text-secondary/40 focus:outline-none focus:ring-2 focus:ring-tertiary transition-shadow resize-none ${
                errors.description ? "border-rose-500 bg-rose-50/20" : ""
              }`}
            />
            {errors.description && (
              <span aria-live="polite" className="text-xs font-mono font-bold text-rose-600 mt-1 block">
                {errors.description.message}
              </span>
            )}
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="font-sans text-xs font-semibold mb-1 block">
                Priority
              </label>
              <select
                {...register("priority")}
                className="w-full px-3 py-2 border-2 border-black rounded-sketchy-sm font-sans text-sm bg-white focus:outline-none focus:ring-2 focus:ring-tertiary cursor-pointer"
              >
                <option value="LOW">LOW</option>
                <option value="MEDIUM">MEDIUM</option>
                <option value="HIGH">HIGH</option>
                <option value="URGENT">URGENT</option>
              </select>
            </div>

            <div>
              <label className="font-sans text-xs font-semibold mb-1 block">
                Status
              </label>
              <select
                {...register("status")}
                className="w-full px-3 py-2 border-2 border-black rounded-sketchy-sm font-sans text-sm bg-white focus:outline-none focus:ring-2 focus:ring-tertiary cursor-pointer"
              >
                <option value="TODO">TODO</option>
                <option value="IN_PROGRESS">IN PROGRESS</option>
                <option value="DONE">DONE</option>
              </select>
            </div>
          </div>

          <div>
            <label className="font-sans text-xs font-semibold mb-1 block">
              Assignee (Optional)
            </label>
            <select
              {...register("assigneeId")}
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
                    const res = await createLabel(orgId, newLabelName.trim(), newLabelColor);
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
                {labelColors.map((color) => (
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

          <div>
            <label className="font-sans text-xs font-semibold mb-1 block">
              Due Date (Optional)
            </label>
            <input
              type="date"
              {...register("dueDate")}
              className="w-full px-3 py-2 border-2 border-black rounded-sketchy-sm font-sans text-sm bg-white focus:outline-none focus:ring-2 focus:ring-tertiary transition-shadow cursor-pointer"
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full py-2.5 mt-2 bg-tertiary hover:bg-tertiary-hover text-white font-sans text-sm font-bold border-2 border-black rounded-full shadow-flat-offset-sm active:translate-y-0.5 hover:-translate-y-0.5 transition-all disabled:opacity-40 disabled:pointer-events-none cursor-pointer"
          >
            {loading ? (
              <span className="flex items-center justify-center gap-2">
                <Loader2 className="h-4 w-4 animate-spin" />
                Creating task…
              </span>
            ) : (
              "Create Task"
            )}
          </button>
        </form>
      </div>
    </div>
  );
}
