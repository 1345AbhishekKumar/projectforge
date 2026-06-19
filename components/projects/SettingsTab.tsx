"use client";

import { useState } from "react";
import { Loader2, Plus, Trash2, CheckCircle2, AlertTriangle } from "lucide-react";
import { useForm, useFieldArray, useWatch } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import type { Project, ProjectStatus } from "@/types";
import { updateProject } from "@/actions/project";

const settingsSchema = z.object({
  name: z
    .string()
    .trim()
    .min(3, "Project name must be at least 3 characters")
    .max(50, "Project name must be at most 50 characters"),
  description: z
    .string()
    .trim()
    .max(250, "Description must be at most 250 characters")
    .optional()
    .nullable(),
  status: z.enum(["PLANNING", "ACTIVE", "COMPLETED", "ARCHIVED"]),
  useCustomStatuses: z.boolean(),
  custom_statuses: z
    .array(
      z.object({
        value: z
          .string()
          .trim()
          .min(1, "Status name cannot be empty")
          .max(30, "Max 30 characters"),
      })
    )
    .min(2, "Must specify at least 2 statuses")
    .max(10, "Cannot specify more than 10 statuses"),
}).refine(
  (data) => {
    if (!data.useCustomStatuses) return true;
    const values = data.custom_statuses.map((s) => s.value.toLowerCase());
    return new Set(values).size === values.length;
  },
  {
    message: "Statuses must be unique",
    path: ["custom_statuses"],
  }
);

type SettingsInput = z.infer<typeof settingsSchema>;

type Props = {
  project: Project;
  orgId: string;
};

export function SettingsTab({ project, orgId }: Props) {
  const [loading, setLoading] = useState(false);
  const [successMsg, setSuccessMsg] = useState("");
  const [errorMsg, setErrorMsg] = useState("");

  const initialStatuses = project.custom_statuses
    ? project.custom_statuses.map((s) => ({ value: s }))
    : [
        { value: "TODO" },
        { value: "IN_PROGRESS" },
        { value: "DONE" },
      ];

  const {
    register,
    handleSubmit,
    control,
    formState: { errors },
  } = useForm<SettingsInput>({
    resolver: zodResolver(settingsSchema),
    mode: "onBlur",
    defaultValues: {
      name: project.name,
      description: project.description || "",
      status: project.status,
      useCustomStatuses: !!project.custom_statuses,
      custom_statuses: initialStatuses,
    },
  });

  const { fields, append, remove } = useFieldArray({
    control,
    name: "custom_statuses",
  });

  const useCustomStatuses = useWatch({
    control,
    name: "useCustomStatuses",
  });

  async function onSubmit(data: SettingsInput) {
    setLoading(true);
    setSuccessMsg("");
    setErrorMsg("");

    const customStatusesPayload = data.useCustomStatuses
      ? data.custom_statuses.map((s) => s.value.trim())
      : null;

    try {
      const result = await updateProject(
        project.id,
        data.name,
        data.description || null,
        data.status as ProjectStatus,
        orgId,
        customStatusesPayload
      );

      if (result.success) {
        setSuccessMsg("Project settings successfully saved!");
        // Clear message after 3 seconds
        setTimeout(() => setSuccessMsg(""), 3000);
      } else {
        setErrorMsg(result.error || "Failed to update project settings");
      }
    } catch {
      setErrorMsg("An unexpected error occurred while saving project settings");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex flex-col gap-6 max-w-2xl mx-auto">
      <div className="bg-white border-2 border-black rounded-sketchy shadow-flat-offset p-6 md:p-8 relative rotate-[-0.5deg]">
        <h2 className="font-cursive text-2xl font-bold mb-4">Project Parameters</h2>
        <p className="font-sans text-xs text-secondary mb-6 leading-relaxed">
          Configure name, lifecycle stage, and custom board columns for this project.
        </p>

        {successMsg && (
          <div className="bg-[#D4EDDA] border-2 border-black rounded-sketchy-sm p-4 mb-6 flex items-center gap-2 text-sm font-bold text-[#155724] animate-in fade-in slide-in-from-top-2 duration-200">
            <CheckCircle2 className="h-5 w-5 shrink-0 text-[#155724]" />
            <span>{successMsg}</span>
          </div>
        )}

        {errorMsg && (
          <div className="bg-[#FFD2D2] border-2 border-black rounded-sketchy-sm p-4 mb-6 flex items-start gap-2 text-sm font-bold text-rose-800 animate-in fade-in slide-in-from-top-2 duration-200">
            <AlertTriangle className="h-5 w-5 shrink-0 text-rose-800 mt-0.5" />
            <span>{errorMsg}</span>
          </div>
        )}

        <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-5">
          {/* Project Name */}
          <div>
            <label className="font-sans text-xs font-semibold mb-1 block">
              Scope Name
            </label>
            <input
              type="text"
              {...register("name")}
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

          {/* Description */}
          <div>
            <label className="font-sans text-xs font-semibold mb-1 block">
              Objective (Optional)
            </label>
            <textarea
              {...register("description")}
              rows={3}
              className={`w-full px-3 py-2 border-2 border-black rounded-sketchy-sm font-sans text-sm bg-white focus:outline-none focus:ring-2 focus:ring-tertiary transition-shadow resize-none ${
                errors.description ? "border-rose-500 bg-rose-50/20" : ""
              }`}
            />
            {errors.description && (
              <span className="text-xs font-mono font-bold text-rose-600 mt-1 block">
                {errors.description.message}
              </span>
            )}
          </div>

          {/* Status Select */}
          <div>
            <label className="font-sans text-xs font-semibold mb-1 block">
              Lifecycle Stage
            </label>
            <select
              {...register("status")}
              className="w-full px-3 py-2 border-2 border-black rounded-sketchy-sm font-sans text-sm bg-white focus:outline-none focus:ring-2 focus:ring-tertiary transition-shadow cursor-pointer"
            >
              <option value="PLANNING">PLANNING (Backlog design)</option>
              <option value="ACTIVE">ACTIVE (In flight)</option>
              <option value="COMPLETED">COMPLETED (Shipped)</option>
              <option value="ARCHIVED">ARCHIVED (Historical)</option>
            </select>
          </div>

          <hr className="border-black/10 my-2" />

          {/* Custom Status Switch */}
          <div className="flex items-center justify-between gap-4">
            <div>
              <label className="font-sans text-sm font-bold block">
                Customize Board Workflows
              </label>
              <span className="font-sans text-xs text-secondary/70">
                Replace standard TODO / IN_PROGRESS / DONE with your own progress columns.
              </span>
            </div>
            <input
              type="checkbox"
              {...register("useCustomStatuses")}
              className="w-5 h-5 border-2 border-black rounded-sm bg-white text-tertiary focus:ring-tertiary cursor-pointer"
            />
          </div>

          {/* Custom Statuses List */}
          {useCustomStatuses && (
            <div className="flex flex-col gap-3 pl-4 border-l-2 border-dashed border-black/20 animate-in fade-in duration-200">
              <label className="font-sans text-xs font-semibold">
                Board Columns (2 to 10 columns)
              </label>
              <div className="flex flex-col gap-2">
                {fields.map((field, index) => (
                  <div key={field.id} className="flex items-center gap-2">
                    <span className="font-mono text-xs font-bold w-6 text-secondary/40">
                      #{index + 1}
                    </span>
                    <input
                      type="text"
                      {...register(`custom_statuses.${index}.value` as const)}
                      placeholder={`Column name ${index + 1}`}
                      className={`flex-1 px-3 py-1.5 border-2 border-black rounded-sketchy-sm font-sans text-xs bg-white focus:outline-none focus:ring-2 focus:ring-tertiary transition-shadow ${
                        errors.custom_statuses?.[index]?.value ? "border-rose-500 bg-rose-50/20" : ""
                      }`}
                    />
                    <button
                      type="button"
                      disabled={fields.length <= 2}
                      onClick={() => remove(index)}
                      className="p-1.5 rounded-full border-2 border-black bg-white hover:bg-accent-pink disabled:opacity-40 disabled:hover:bg-white transition-all shadow-flat-offset-xs active:translate-y-0.5 hover:-translate-y-0.5 cursor-pointer disabled:pointer-events-none"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                ))}
              </div>

              {errors.custom_statuses && !errors.custom_statuses.root && (
                <span className="text-xs font-mono font-bold text-rose-600">
                  {errors.custom_statuses.message}
                </span>
              )}

              {fields.length < 10 && (
                <button
                  type="button"
                  onClick={() => append({ value: "" })}
                  className="self-start flex items-center gap-1.5 px-3 py-1 border-2 border-black rounded-full bg-white hover:bg-neutral-bg text-xs font-bold font-sans shadow-flat-offset-xs transition-all active:translate-y-0.5 hover:-translate-y-0.5 cursor-pointer mt-1"
                >
                  <Plus className="h-3.5 w-3.5" /> Add Status Column
                </button>
              )}
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full py-2.5 mt-4 bg-tertiary hover:bg-tertiary-hover text-white font-sans text-sm font-bold border-2 border-black rounded-full shadow-flat-offset-sm active:translate-y-0.5 hover:-translate-y-0.5 transition-all disabled:opacity-40 disabled:pointer-events-none cursor-pointer"
          >
            {loading ? (
              <span className="flex items-center justify-center gap-2">
                <Loader2 className="h-4 w-4 animate-spin" />
                Saving settings…
              </span>
            ) : (
              "Save Settings"
            )}
          </button>
        </form>
      </div>
    </div>
  );
}
