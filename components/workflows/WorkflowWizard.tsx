"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Zap, ShieldCheck, ChevronRight, ChevronLeft, Loader2, Info } from "lucide-react";
import { createWorkflow } from "@/actions/workflow";

type CreatedWorkflow = {
  id: string;
  name: string;
  trigger: string;
  conditions: Record<string, unknown>;
  actions: { type: string; data: { label: string } }[];
  enabled: boolean;
  category: string;
  status: string;
  created_at: string;
};

export const TRIGGER_OPTIONS = [
  { value: "task.created", label: "When Task Created" },
  { value: "task.status_changed", label: "When Status Changes" },
  { value: "task.completed", label: "When Task Completed" },
  { value: "task.assigned", label: "When Task Assigned" },
  { value: "sprint.ended", label: "When Sprint Ends" },
] as const;

export const ACTION_TYPE_OPTIONS = [
  { value: "assign_to_user", label: "Assign to Lead/Member" },
  { value: "notify_assignee", label: "Notify Assignee" },
  { value: "create_task", label: "Create Review Task" },
  { value: "set_status", label: "Set Task Status" },
  { value: "archive_task", label: "Archive Task" },
  { value: "ai_action", label: "Execute AI Agent Prompt" },
] as const;

const wizardSchema = z
  .object({
    name: z.string().trim().min(3, "Name must be ≥ 3 characters").max(100, "Name too long"),
    trigger: z.string().min(1, "Select a trigger"),
    actionType: z.string().min(1, "Select an action"),
    category: z.string().min(1, "Select a folder category"),
    projectScope: z.string().optional(),
    assigneeId: z.string().optional(),
    targetStatus: z.string().optional(),
    taskTitle: z.string().optional(),
    notificationContent: z.string().optional(),
    aiPrompt: z.string().optional(),
    aiOutputType: z.string().optional(),
  })
  .superRefine((val, ctx) => {
    if (val.actionType === "assign_to_user" && !val.assigneeId) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Please select an assignee",
        path: ["assigneeId"],
      });
    }
    if (val.actionType === "set_status" && !val.targetStatus) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Please select a target status",
        path: ["targetStatus"],
      });
    }
    if (val.actionType === "create_task" && (!val.taskTitle || val.taskTitle.trim().length < 3)) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Task title must be ≥ 3 characters",
        path: ["taskTitle"],
      });
    }
    if (
      val.actionType === "notify_assignee" &&
      (!val.notificationContent || val.notificationContent.trim().length < 3)
    ) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Notification message must be ≥ 3 characters",
        path: ["notificationContent"],
      });
    }
    if (val.actionType === "ai_action") {
      if (!val.aiPrompt || val.aiPrompt.trim().length < 5) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "AI prompt must be ≥ 5 characters",
          path: ["aiPrompt"],
        });
      }
      if (!val.aiOutputType) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "Please select an output type",
          path: ["aiOutputType"],
        });
      }
    }
  });

type FormInput = z.infer<typeof wizardSchema>;

type ProjectSummary = { id: string; name: string };
type MemberSummary = { user_id: string; full_name: string | null; email: string };

type Props = {
  orgId: string;
  projects: ProjectSummary[];
  members: MemberSummary[];
  categories: string[];
  onComplete?: (newWf: CreatedWorkflow) => void;
  onCancel?: () => void;
};

export function WorkflowWizard({
  orgId,
  projects,
  members,
  categories,
  onComplete,
  onCancel,
}: Props) {
  const [step, setStep] = useState(1);
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  const {
    register,
    handleSubmit,
    watch,
    trigger,
    formState: { errors },
  } = useForm<FormInput>({
    resolver: zodResolver(wizardSchema),
    defaultValues: {
      name: "",
      trigger: "",
      actionType: "",
      category: categories[0] || "General",
      projectScope: "",
      assigneeId: "",
      targetStatus: "",
      taskTitle: "",
      notificationContent: "",
      aiPrompt: "",
      aiOutputType: "comment",
    },
  });

  // eslint-disable-next-line react-hooks/incompatible-library
  const watchedActionType = watch("actionType");
  const watchedProjectScope = watch("projectScope");

  const nextStep = async () => {
    let fieldsToValidate: Array<keyof FormInput> = [];
    if (step === 1) fieldsToValidate = ["trigger"];
    if (step === 2) fieldsToValidate = ["projectScope"];
    if (step === 3) {
      fieldsToValidate = ["actionType"];
      if (watchedActionType === "assign_to_user") fieldsToValidate.push("assigneeId");
      if (watchedActionType === "set_status") fieldsToValidate.push("targetStatus");
      if (watchedActionType === "create_task") fieldsToValidate.push("taskTitle");
      if (watchedActionType === "notify_assignee") fieldsToValidate.push("notificationContent");
      if (watchedActionType === "ai_action") fieldsToValidate.push("aiPrompt", "aiOutputType");
    }
    if (step === 4) fieldsToValidate = ["name", "category"];

    const isStepValid = await trigger(fieldsToValidate);
    if (isStepValid) {
      setStep((s) => Math.min(s + 1, 5));
    }
  };

  const prevStep = () => {
    setStep((s) => Math.max(s - 1, 1));
  };

  const onSubmit = (data: FormInput) => {
    const conditions: Record<string, unknown> = {};
    if (data.projectScope) {
      conditions.project_id = data.projectScope;
    }

    const actionData: Record<string, unknown> = {};
    if (data.actionType === "assign_to_user") {
      actionData.label = data.assigneeId || "org_owner";
    } else if (data.actionType === "set_status") {
      actionData.label = data.targetStatus || "DONE";
    } else if (data.actionType === "create_task") {
      actionData.label = data.taskTitle || "Review Task";
    } else if (data.actionType === "notify_assignee") {
      actionData.label = data.notificationContent || "Workflow notification triggered.";
    } else if (data.actionType === "ai_action") {
      actionData.prompt = data.aiPrompt || "";
      actionData.output_type = data.aiOutputType || "comment";
    }

    startTransition(async () => {
      const res = await createWorkflow(
        orgId,
        data.name,
        data.trigger,
        conditions,
        [{ type: data.actionType, data: actionData }],
        data.category,
      );

      if (res.success && res.data) {
        const newWf: CreatedWorkflow = {
          id: res.data.workflowId,
          name: data.name,
          trigger: data.trigger,
          conditions,
          actions: [{ type: data.actionType, data: actionData as { label: string } }],
          enabled: true,
          category: data.category,
          status: "ACTIVE",
          created_at: new Date().toISOString(),
        };
        if (onComplete) {
          onComplete(newWf);
        } else {
          router.push("/workflows?tab=list");
        }
      }
    });
  };

  return (
    <div className="bg-white border-2 border-black rounded-sketchy shadow-flat-offset p-6 max-w-2xl mx-auto animate-in zoom-in-95 duration-150">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h3 className="font-cursive text-xl font-bold">Create New Workflow Wizard</h3>
          <p className="font-sans text-xs text-secondary mt-0.5">
            Define automated event triggers step-by-step
          </p>
        </div>
        <span className="font-mono text-xs font-bold bg-accent-yellow border border-black/20 rounded px-2 py-0.5">
          Step {step} of 5
        </span>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-6">
        {/* Step 1: Trigger Selection */}
        {step === 1 && (
          <div className="flex flex-col gap-4">
            <h4 className="font-cursive text-lg font-semibold flex items-center gap-2">
              <Zap className="h-5 w-5 text-tertiary" /> Choose Workflow Trigger Event
            </h4>
            <select
              {...register("trigger")}
              className={`w-full px-3 py-2.5 border-2 border-black rounded-sketchy-sm font-sans text-sm bg-white focus:outline-none focus:ring-2 focus:ring-tertiary transition-shadow cursor-pointer ${
                errors.trigger ? "border-rose-500 bg-rose-50/10" : ""
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
        )}

        {/* Step 2: Conditions */}
        {step === 2 && (
          <div className="flex flex-col gap-4">
            <h4 className="font-cursive text-lg font-semibold flex items-center gap-2">
              <ShieldCheck className="h-5 w-5 text-emerald-600" /> Apply Condition Scope
            </h4>
            <div>
              <label className="font-sans text-xs font-semibold mb-1 block">
                Project Filter (Optional)
              </label>
              <select
                {...register("projectScope")}
                className="w-full px-3 py-2.5 border-2 border-black rounded-sketchy-sm font-sans text-sm bg-white focus:outline-none focus:ring-2 focus:ring-tertiary transition-shadow cursor-pointer"
              >
                <option value="">All Projects (Global Scope)</option>
                {projects.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name}
                  </option>
                ))}
              </select>
            </div>
            <div className="bg-[#FFF2B2]/20 border border-black/10 p-3 rounded-sketchy-sm text-xs font-sans text-secondary flex gap-2">
              <Info className="h-4.5 w-4.5 text-primary shrink-0" />
              <span>
                You can configure advanced conditional rules (Priority, Assignee) inside the visual
                builder after creation.
              </span>
            </div>
          </div>
        )}

        {/* Step 3: Actions */}
        {step === 3 && (
          <div className="flex flex-col gap-4">
            <h4 className="font-cursive text-lg font-semibold">Choose Workflow Action Outcome</h4>
            <div>
              <label className="font-sans text-xs font-semibold mb-1 block">Then Do...</label>
              <select
                {...register("actionType")}
                className={`w-full px-3 py-2.5 border-2 border-black rounded-sketchy-sm font-sans text-sm bg-white focus:outline-none focus:ring-2 focus:ring-tertiary transition-shadow cursor-pointer ${
                  errors.actionType ? "border-rose-500 bg-rose-50/10" : ""
                }`}
              >
                <option value="">— Select action type —</option>
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

            {/* Dynamic Action Fields */}
            {watchedActionType === "assign_to_user" && (
              <div>
                <label className="font-sans text-xs font-semibold mb-1 block">Assign To</label>
                <select
                  {...register("assigneeId")}
                  className="w-full px-3 py-2.5 border-2 border-black rounded-sketchy-sm font-sans text-sm bg-white focus:outline-none cursor-pointer"
                >
                  <option value="">— Select assignee —</option>
                  <option value="org_owner">Organization Owner (Dynamic)</option>
                  {members.map((m) => (
                    <option key={m.userId} value={m.userId}>
                      {m.name} ({m.email})
                    </option>
                  ))}
                </select>
                {errors.assigneeId && (
                  <span className="text-xs font-mono font-bold text-rose-600 mt-1 block">
                    {errors.assigneeId.message}
                  </span>
                )}
              </div>
            )}

            {watchedActionType === "set_status" && (
              <div>
                <label className="font-sans text-xs font-semibold mb-1 block">Target Status</label>
                <select
                  {...register("targetStatus")}
                  className="w-full px-3 py-2.5 border-2 border-black rounded-sketchy-sm font-sans text-sm bg-white focus:outline-none cursor-pointer"
                >
                  <option value="">— Select status —</option>
                  {(() => {
                    const selectedProj = projects.find((p) => p.id === watchedProjectScope);
                    const statuses = selectedProj?.custom_statuses || [
                      "TODO",
                      "IN_PROGRESS",
                      "DONE",
                    ];
                    return statuses.map((s: string) => (
                      <option key={s} value={s}>
                        {s}
                      </option>
                    ));
                  })()}
                </select>
                {errors.targetStatus && (
                  <span className="text-xs font-mono font-bold text-rose-600 mt-1 block">
                    {errors.targetStatus.message}
                  </span>
                )}
              </div>
            )}

            {watchedActionType === "create_task" && (
              <div>
                <label className="font-sans text-xs font-semibold mb-1 block">New Task Title</label>
                <input
                  {...register("taskTitle")}
                  placeholder="e.g. Review codebase and design draft"
                  className="w-full px-3 py-2 border-2 border-black rounded-sketchy-sm font-sans text-sm"
                />
                {errors.taskTitle && (
                  <span className="text-xs font-mono font-bold text-rose-600 mt-1 block">
                    {errors.taskTitle.message}
                  </span>
                )}
              </div>
            )}

            {watchedActionType === "notify_assignee" && (
              <div>
                <label className="font-sans text-xs font-semibold mb-1 block">
                  Notification Message
                </label>
                <textarea
                  {...register("notificationContent")}
                  placeholder="e.g. Please review the completed task ASAP."
                  rows={2}
                  className="w-full px-3 py-2 border-2 border-black rounded-sketchy-sm font-sans text-sm"
                />
                {errors.notificationContent && (
                  <span className="text-xs font-mono font-bold text-rose-600 mt-1 block">
                    {errors.notificationContent.message}
                  </span>
                )}
              </div>
            )}

            {watchedActionType === "ai_action" && (
              <div className="flex flex-col gap-4">
                <div>
                  <label className="font-sans text-xs font-semibold mb-1 block">
                    AI Prompt (Instruction)
                  </label>
                  <textarea
                    {...register("aiPrompt")}
                    placeholder="e.g. Summarize task findings and suggest next steps based on the description."
                    rows={3}
                    className="w-full px-3 py-2 border-2 border-black rounded-sketchy-sm font-sans text-sm"
                  />
                  {errors.aiPrompt && (
                    <span className="text-xs font-mono font-bold text-rose-600 mt-1 block">
                      {errors.aiPrompt.message}
                    </span>
                  )}
                </div>

                <div>
                  <label className="font-sans text-xs font-semibold mb-1 block">
                    AI Output Destination
                  </label>
                  <select
                    {...register("aiOutputType")}
                    className="w-full px-3 py-2.5 border-2 border-black rounded-sketchy-sm font-sans text-sm bg-white cursor-pointer"
                  >
                    <option value="comment">Add as Task Comment</option>
                    <option value="subtasks">Generate & Add Subtasks</option>
                    <option value="description">Update Task Description</option>
                  </select>
                  {errors.aiOutputType && (
                    <span className="text-xs font-mono font-bold text-rose-600 mt-1 block">
                      {errors.aiOutputType.message}
                    </span>
                  )}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Step 4: Folder Category & Name */}
        {step === 4 && (
          <div className="flex flex-col gap-4">
            <h4 className="font-cursive text-lg font-semibold">Organize & Label Workflow</h4>

            {/* Category Folder */}
            <div>
              <label className="font-sans text-xs font-semibold mb-1 block">Category Folder</label>
              <select
                {...register("category")}
                className="w-full px-3 py-2.5 border-2 border-black rounded-sketchy-sm font-sans text-sm bg-white cursor-pointer"
              >
                {categories.map((cat) => (
                  <option key={cat} value={cat}>
                    {cat}
                  </option>
                ))}
              </select>
            </div>

            {/* Workflow Name */}
            <div>
              <label className="font-sans text-xs font-semibold mb-1 block">Workflow Name</label>
              <input
                {...register("name")}
                placeholder="e.g. Auto-notify assignee on Task Status Update"
                className={`w-full px-3 py-2 border-2 border-black rounded-sketchy-sm font-sans text-sm ${
                  errors.name ? "border-rose-500" : ""
                }`}
              />
              {errors.name && (
                <span className="text-xs font-mono font-bold text-rose-600 mt-1 block">
                  {errors.name.message}
                </span>
              )}
            </div>
          </div>
        )}

        {/* Step 5: Review & Save */}
        {step === 5 && (
          <div className="flex flex-col gap-4 text-xs font-sans">
            <h4 className="font-cursive text-lg font-semibold">Review Configuration</h4>
            <div className="border-2 border-black rounded-sketchy-sm bg-neutral-bg/25 p-4 flex flex-col gap-2.5 leading-relaxed">
              <p>
                <strong>Name</strong>: {watch("name")}
              </p>
              <p>
                <strong>Category Folder</strong>: {watch("category")}
              </p>
              <p>
                <strong>Trigger</strong>:{" "}
                <code className="bg-white border border-black/10 px-1 py-0.5 rounded font-mono font-bold">
                  {watch("trigger")}
                </code>
              </p>
              <p>
                <strong>Scope Filters</strong>:{" "}
                {watch("projectScope") ? "Specific Project Scope" : "All Projects (Global)"}
              </p>
              <p>
                <strong>Action Output</strong>:{" "}
                <code className="bg-white border border-black/10 px-1 py-0.5 rounded font-mono font-bold">
                  {watch("actionType")}
                </code>
              </p>
            </div>
          </div>
        )}

        {/* Form Controls */}
        <div className="flex justify-between items-center border-t border-black/10 pt-4">
          <button
            type="button"
            onClick={() => (onCancel ? onCancel() : router.push("/workflows?tab=list"))}
            className="px-5 py-2.5 bg-white hover:bg-neutral-bg border-2 border-black rounded-full text-xs font-bold font-sans cursor-pointer shadow-flat-offset-xs"
          >
            Cancel
          </button>

          <div className="flex gap-3">
            {step > 1 && (
              <button
                type="button"
                onClick={prevStep}
                className="flex items-center gap-1 px-4 py-2 bg-white hover:bg-neutral-bg border-2 border-black rounded-full text-xs font-bold font-sans cursor-pointer shadow-flat-offset-xs active:translate-y-0.5"
              >
                <ChevronLeft className="h-4 w-4" /> Back
              </button>
            )}

            {step < 5 ? (
              <button
                type="button"
                onClick={nextStep}
                className="flex items-center gap-1 px-5 py-2.5 bg-accent-yellow hover:bg-[#FFE680] border-2 border-black rounded-full text-xs font-bold font-sans cursor-pointer shadow-flat-offset-xs hover:-translate-y-0.5 active:translate-y-0.5 transition-all"
              >
                Next <ChevronRight className="h-4 w-4" />
              </button>
            ) : (
              <button
                type="submit"
                disabled={isPending}
                className="flex items-center gap-1.5 px-6 py-2.5 bg-tertiary hover:bg-tertiary-hover text-white border-2 border-black rounded-full text-xs font-bold font-sans cursor-pointer shadow-flat-offset-sm hover:-translate-y-0.5 active:translate-y-0.5 transition-all disabled:opacity-40"
              >
                {isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <>Create & Deploy</>}
              </button>
            )}
          </div>
        </div>
      </form>
    </div>
  );
}
