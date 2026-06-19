"use client";

import { useState, useTransition } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import {
  Loader2,
  Plus,
  Trash2,
  Zap,
  ToggleLeft,
  ToggleRight,
  ChevronDown,
  ChevronUp,
  AlertTriangle,
  CheckCircle2,
} from "lucide-react";
import { createWorkflow, deleteWorkflow, updateWorkflow } from "@/actions/workflow";

/* ─── Supported trigger / action option lists ───────────────────────────── */
export const TRIGGER_OPTIONS = [
  { value: "task.created", label: "When Task Created" },
  { value: "task.status_changed", label: "When Status Changes" },
  { value: "task.completed", label: "When Task Completed" },
  { value: "task.assigned", label: "When Task Assigned" },
  { value: "sprint.ended", label: "When Sprint Ends" },
] as const;

export const ACTION_TYPE_OPTIONS = [
  { value: "assign_to_user", label: "Assign to Team Lead" },
  { value: "notify_assignee", label: "Notify Assignee" },
  { value: "create_task", label: "Create Review Task" },
  { value: "set_status", label: "Set Task Status" },
  { value: "archive_task", label: "Archive Task" },
] as const;

/* ─── Local DB row shape ─────────────────────────────────────────────────── */
export type WorkflowRow = {
  id: string;
  name: string;
  trigger: string;
  conditions: Record<string, unknown>;
  actions: { type: string; data: Record<string, unknown> }[];
  enabled: boolean;
  created_at: string;
};

/* ─── Form schema ────────────────────────────────────────────────────────── */
const workflowFormSchema = z.object({
  name: z.string().trim().min(3, "Name must be ≥ 3 characters").max(100, "Name too long"),
  trigger: z.string().min(1, "Select a trigger"),
  actionType: z.string().min(1, "Select an action"),
  actionLabel: z.string().trim().max(100).optional(),
});

type WorkflowFormInput = z.infer<typeof workflowFormSchema>;

/* ─── Props ──────────────────────────────────────────────────────────────── */
type Props = {
  initialWorkflows: WorkflowRow[];
  orgId: string;
  isAdminOrOwner: boolean;
};

export function WorkflowsTab({ initialWorkflows, orgId, isAdminOrOwner }: Props) {
  const [workflows, setWorkflows] = useState<WorkflowRow[]>(initialWorkflows);
  const [showForm, setShowForm] = useState(false);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [banner, setBanner] = useState<{ type: "success" | "error"; text: string } | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [togglingId, setTogglingId] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const showBanner = (type: "success" | "error", text: string) => {
    setBanner({ type, text });
    setTimeout(() => setBanner(null), 3500);
  };

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<WorkflowFormInput>({
    resolver: zodResolver(workflowFormSchema),
    defaultValues: { name: "", trigger: "", actionType: "", actionLabel: "" },
  });

  /* ── Create ─────────────────────────────────────────────────────────── */
  async function onSubmit(data: WorkflowFormInput) {
    startTransition(async () => {
      const res = await createWorkflow(
        orgId,
        data.name,
        data.trigger,
        {},
        [{ type: data.actionType, data: { label: data.actionLabel || "" } }]
      );

      if (res.success) {
        showBanner("success", "Workflow created successfully!");
        reset();
        setShowForm(false);
        // Reload list by re-fetching (optimistic: prepend placeholder then server revalidates)
        // We re-fetch on next navigation; for now add optimistic row
        setWorkflows((prev) => [
          {
            id: res.data!.workflowId,
            name: data.name,
            trigger: data.trigger,
            conditions: {},
            actions: [{ type: data.actionType, data: { label: data.actionLabel || "" } }],
            enabled: true,
            created_at: new Date().toISOString(),
          },
          ...prev,
        ]);
      } else {
        showBanner("error", res.error || "Failed to create workflow");
      }
    });
  }

  /* ── Toggle enabled ──────────────────────────────────────────────────── */
  async function handleToggle(wf: WorkflowRow) {
    setTogglingId(wf.id);
    try {
      const res = await updateWorkflow(wf.id, orgId, { enabled: !wf.enabled });
      if (res.success) {
        setWorkflows((prev) =>
          prev.map((w) => (w.id === wf.id ? { ...w, enabled: !wf.enabled } : w))
        );
      } else {
        showBanner("error", res.error || "Failed to toggle workflow");
      }
    } finally {
      setTogglingId(null);
    }
  }

  /* ── Delete ──────────────────────────────────────────────────────────── */
  async function handleDelete(id: string) {
    if (!confirm("Delete this workflow? This cannot be undone.")) return;
    setDeletingId(id);
    try {
      const res = await deleteWorkflow(id, orgId);
      if (res.success) {
        setWorkflows((prev) => prev.filter((w) => w.id !== id));
        showBanner("success", "Workflow deleted.");
      } else {
        showBanner("error", res.error || "Failed to delete workflow");
      }
    } finally {
      setDeletingId(null);
    }
  }

  const triggerLabel = (value: string) =>
    TRIGGER_OPTIONS.find((t) => t.value === value)?.label ?? value;

  const actionLabel = (type: string) =>
    ACTION_TYPE_OPTIONS.find((a) => a.value === type)?.label ?? type;

  return (
    <div className="flex flex-col gap-6">
      {/* Banner */}
      {banner && (
        <div
          role="alert"
          className={`flex items-center gap-2 border-2 border-black rounded-sketchy p-4 text-sm font-bold animate-in fade-in slide-in-from-top-2 duration-200 ${
            banner.type === "success"
              ? "bg-[#D4EDDA] text-[#155724]"
              : "bg-[#FFD2D2] text-rose-800"
          }`}
        >
          {banner.type === "success" ? (
            <CheckCircle2 className="h-5 w-5 shrink-0" />
          ) : (
            <AlertTriangle className="h-5 w-5 shrink-0" />
          )}
          {banner.text}
        </div>
      )}

      {/* Header row */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="font-cursive text-2xl font-bold">Workflow Automations</h2>
          <p className="font-sans text-xs text-secondary mt-0.5">
            Trigger automatic actions when events happen in your workspace.
          </p>
        </div>
        {isAdminOrOwner && (
          <button
            onClick={() => setShowForm((v) => !v)}
            className="flex items-center gap-2 px-4 py-2 bg-accent-yellow border-2 border-black rounded-full font-sans text-xs font-bold shadow-flat-offset-sm hover:-translate-y-0.5 active:translate-y-0.5 transition-all cursor-pointer"
          >
            <Plus className="h-4 w-4" />
            New Workflow
          </button>
        )}
      </div>

      {/* Create form */}
      {showForm && isAdminOrOwner && (
        <div className="bg-white border-2 border-black rounded-sketchy shadow-flat-offset p-6 flex flex-col gap-4 animate-in fade-in slide-in-from-top-2 duration-200">
          <h3 className="font-cursive text-lg font-bold">Define New Workflow</h3>

          <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-4">
            {/* Name */}
            <div>
              <label className="font-sans text-xs font-semibold mb-1 block">
                Workflow Name
              </label>
              <input
                {...register("name")}
                placeholder="e.g. Auto-assign to lead on creation"
                className={`w-full px-3 py-2 border-2 border-black rounded-sketchy-sm font-sans text-sm bg-white focus:outline-none focus:ring-2 focus:ring-tertiary transition-shadow ${
                  errors.name ? "border-rose-500 bg-rose-50/20" : ""
                }`}
              />
              {errors.name && (
                <span className="text-xs font-mono font-bold text-rose-600 mt-1 block">
                  {errors.name.message}
                </span>
              )}
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {/* Trigger */}
              <div>
                <label className="font-sans text-xs font-semibold mb-1 block">
                  Trigger Event
                </label>
                <select
                  {...register("trigger")}
                  className={`w-full px-3 py-2 border-2 border-black rounded-sketchy-sm font-sans text-sm bg-white focus:outline-none focus:ring-2 focus:ring-tertiary transition-shadow cursor-pointer ${
                    errors.trigger ? "border-rose-500" : ""
                  }`}
                >
                  <option value="">— Select trigger —</option>
                  {TRIGGER_OPTIONS.map((t) => (
                    <option key={t.value} value={t.value}>
                      {t.label}
                    </option>
                  ))}
                </select>
                {errors.trigger && (
                  <span className="text-xs font-mono font-bold text-rose-600 mt-1 block">
                    {errors.trigger.message}
                  </span>
                )}
              </div>

              {/* Action type */}
              <div>
                <label className="font-sans text-xs font-semibold mb-1 block">
                  Then Do…
                </label>
                <select
                  {...register("actionType")}
                  className={`w-full px-3 py-2 border-2 border-black rounded-sketchy-sm font-sans text-sm bg-white focus:outline-none focus:ring-2 focus:ring-tertiary transition-shadow cursor-pointer ${
                    errors.actionType ? "border-rose-500" : ""
                  }`}
                >
                  <option value="">— Select action —</option>
                  {ACTION_TYPE_OPTIONS.map((a) => (
                    <option key={a.value} value={a.value}>
                      {a.label}
                    </option>
                  ))}
                </select>
                {errors.actionType && (
                  <span className="text-xs font-mono font-bold text-rose-600 mt-1 block">
                    {errors.actionType.message}
                  </span>
                )}
              </div>
            </div>

            {/* Optional label/target */}
            <div>
              <label className="font-sans text-xs font-semibold mb-1 block">
                Action Detail{" "}
                <span className="text-secondary font-normal">(optional)</span>
              </label>
              <input
                {...register("actionLabel")}
                placeholder="e.g. user ID to assign, or status to set"
                className="w-full px-3 py-2 border-2 border-black rounded-sketchy-sm font-sans text-sm bg-white focus:outline-none focus:ring-2 focus:ring-tertiary transition-shadow"
              />
            </div>

            <div className="flex gap-3 pt-1">
              <button
                type="submit"
                disabled={isPending}
                className="flex items-center gap-2 px-6 py-2 bg-tertiary hover:bg-tertiary-hover text-white border-2 border-black rounded-full font-sans text-xs font-bold shadow-flat-offset-sm hover:-translate-y-0.5 active:translate-y-0.5 transition-all disabled:opacity-40 disabled:pointer-events-none cursor-pointer"
              >
                {isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Zap className="h-4 w-4" />}
                Create Workflow
              </button>
              <button
                type="button"
                onClick={() => { setShowForm(false); reset(); }}
                className="px-5 py-2 bg-white border-2 border-black rounded-full font-sans text-xs font-bold shadow-flat-offset-xs hover:-translate-y-0.5 active:translate-y-0.5 transition-all cursor-pointer"
              >
                Cancel
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Workflow list */}
      {workflows.length === 0 ? (
        <div className="border-2 border-dashed border-black/20 rounded-sketchy p-10 text-center">
          <Zap className="h-10 w-10 text-secondary/30 mx-auto mb-3" />
          <p className="font-cursive text-xl text-secondary/50">No automations yet</p>
          <p className="font-sans text-xs text-secondary/40 mt-1">
            Create your first workflow above to automate repetitive work.
          </p>
        </div>
      ) : (
        <div className="flex flex-col gap-3">
          {workflows.map((wf) => (
            <div
              key={wf.id}
              className={`bg-white border-2 border-black rounded-sketchy shadow-flat-offset-xs transition-all ${
                !wf.enabled ? "opacity-60" : ""
              }`}
            >
              {/* Row header */}
              <div className="flex items-center gap-3 px-5 py-3.5">
                {/* Enabled badge */}
                <span
                  className={`text-[10px] font-bold px-2 py-0.5 rounded-full border-2 border-black whitespace-nowrap ${
                    wf.enabled ? "bg-accent-green" : "bg-neutral-bg text-secondary"
                  }`}
                >
                  {wf.enabled ? "ON" : "OFF"}
                </span>

                {/* Name + trigger summary */}
                <div className="flex-1 min-w-0">
                  <p className="font-sans text-sm font-bold truncate">{wf.name}</p>
                  <p className="font-sans text-xs text-secondary truncate">
                    {triggerLabel(wf.trigger)}
                    {wf.actions.length > 0 && (
                      <>
                        {" "}→{" "}
                        {wf.actions.map((a) => actionLabel(a.type)).join(", ")}
                      </>
                    )}
                  </p>
                </div>

                {/* Actions */}
                {isAdminOrOwner && (
                  <div className="flex items-center gap-2 shrink-0">
                    {/* Toggle */}
                    <button
                      onClick={() => handleToggle(wf)}
                      disabled={togglingId === wf.id}
                      title={wf.enabled ? "Disable workflow" : "Enable workflow"}
                      className="p-1.5 border-2 border-black rounded-full bg-white hover:bg-neutral-bg transition-all shadow-flat-offset-xs active:translate-y-0.5 hover:-translate-y-0.5 cursor-pointer disabled:opacity-40 disabled:pointer-events-none"
                    >
                      {togglingId === wf.id ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : wf.enabled ? (
                        <ToggleRight className="h-4 w-4 text-green-600" />
                      ) : (
                        <ToggleLeft className="h-4 w-4 text-secondary" />
                      )}
                    </button>

                    {/* Delete */}
                    <button
                      onClick={() => handleDelete(wf.id)}
                      disabled={deletingId === wf.id}
                      title="Delete workflow"
                      className="p-1.5 border-2 border-black rounded-full bg-white hover:bg-accent-pink transition-all shadow-flat-offset-xs active:translate-y-0.5 hover:-translate-y-0.5 cursor-pointer disabled:opacity-40 disabled:pointer-events-none"
                    >
                      {deletingId === wf.id ? (
                        <Loader2 className="h-3.5 w-3.5 animate-spin" />
                      ) : (
                        <Trash2 className="h-3.5 w-3.5" />
                      )}
                    </button>
                  </div>
                )}

                {/* Expand toggle */}
                <button
                  onClick={() => setExpandedId((prev) => (prev === wf.id ? null : wf.id))}
                  className="p-1 cursor-pointer text-secondary hover:text-primary transition-colors"
                >
                  {expandedId === wf.id ? (
                    <ChevronUp className="h-4 w-4" />
                  ) : (
                    <ChevronDown className="h-4 w-4" />
                  )}
                </button>
              </div>

              {/* Expanded detail */}
              {expandedId === wf.id && (
                <div className="border-t-2 border-black/10 px-5 py-4 flex flex-col gap-3 animate-in fade-in duration-150">
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs font-sans">
                    <div>
                      <span className="font-bold text-secondary uppercase tracking-wide block mb-1">
                        Trigger
                      </span>
                      <span className="bg-accent-yellow border border-black/20 rounded px-2 py-0.5 font-mono">
                        {wf.trigger}
                      </span>
                    </div>
                    <div>
                      <span className="font-bold text-secondary uppercase tracking-wide block mb-1">
                        Conditions
                      </span>
                      <span className="font-mono text-secondary/70">
                        {Object.keys(wf.conditions).length === 0
                          ? "None (always runs)"
                          : JSON.stringify(wf.conditions)}
                      </span>
                    </div>
                    <div>
                      <span className="font-bold text-secondary uppercase tracking-wide block mb-1">
                        Actions
                      </span>
                      <div className="flex flex-col gap-1">
                        {wf.actions.map((a, i) => (
                          <span
                            key={i}
                            className="bg-accent-blue/20 border border-black/20 rounded px-2 py-0.5 font-mono"
                          >
                            {a.type}
                            {a.data?.label ? `: ${a.data.label}` : ""}
                          </span>
                        ))}
                      </div>
                    </div>
                  </div>
                  <p className="font-sans text-[10px] text-secondary/40">
                    ID: {wf.id} · Created {new Date(wf.created_at).toLocaleDateString()}
                  </p>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
