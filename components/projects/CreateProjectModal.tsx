"use client";

import { useState } from "react";
import { Loader2, FolderPlus } from "lucide-react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useQuery } from "@tanstack/react-query";
import type { ProjectStatus } from "@/types";
import { getProjectTemplates } from "@/actions/project";

import { projectSchema } from "@/lib/schemas/validation";
import { BaseModal } from "@/components/ui/BaseModal";

type ProjectInput = z.infer<typeof projectSchema>;

type Props = {
  isOpen: boolean;
  onClose: () => void;
  onCreate: (
    name: string,
    description: string | null,
    status: ProjectStatus,
    templateId?: string
  ) => Promise<{ success: boolean; error?: string }>;
};

export function CreateProjectModal({ isOpen, onClose, onCreate }: Props) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  interface ProjectTemplate {
    id: string;
    name: string;
    description?: string;
  }

  const { data: templates = [] } = useQuery<ProjectTemplate[]>({
    queryKey: ["projectTemplates"],
    queryFn: async () => {
      const result = await getProjectTemplates();
      if (!result.success) throw new Error(result.error || "Failed to load templates");
      return (result.data || []) as ProjectTemplate[];
    },
    enabled: isOpen,
  });

  const {
    register,
    handleSubmit,
    formState: { errors },
    reset,
  } = useForm<ProjectInput>({
    resolver: zodResolver(projectSchema),
    mode: "onBlur",
    defaultValues: {
      name: "",
      description: "",
      status: "PLANNING",
      templateId: "",
    },
  });

  if (!isOpen) return null;

  const handleClose = () => {
    reset();
    setError("");
    onClose();
  };

  async function onSubmit(data: ProjectInput) {
    setError("");
    setLoading(true);

    try {
      const result = await onCreate(data.name, data.description || null, data.status, data.templateId || undefined);
      if (result.success) {
        reset();
        onClose();
      } else {
        setError(result.error || "Failed to create project");
      }
    } catch {
      setError("An unexpected error occurred");
    } finally {
      setLoading(false);
    }
  }

  return (
    <BaseModal isOpen={isOpen} onClose={handleClose} maxWidth="max-w-md" rotation="rotate-[0.5deg]">
      {/* Modal Header */}
      <div className="flex items-center gap-2.5 mb-4">
        <div className="w-8 h-8 rounded-full bg-white border-2 border-black flex items-center justify-center shadow-flat-offset-sm">
          <FolderPlus className="h-4.5 w-4.5 text-tertiary" />
        </div>
        <h2 className="font-cursive text-2xl font-bold">New Project Scope</h2>
      </div>

      <p className="font-sans text-xs text-secondary mb-6 leading-relaxed">
        Define a new collaborative scope on the whiteboard directory. Organize your tasks under this project.
      </p>

      {error && (
        <div className="bg-accent-pink border-2 border-black rounded-sketchy-sm p-3 mb-4 text-xs font-semibold">
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-4">
        <div>
          <label className="font-sans text-xs font-semibold mb-1 block">
            Project Name
          </label>
          <input
            type="text"
            {...register("name")}
            placeholder="e.g., Q3 Mobile app refactor"
            className={`w-full px-3 py-2 border-2 border-black rounded-sketchy-sm font-sans text-sm bg-white placeholder:text-secondary/40 focus:outline-none focus:ring-2 focus:ring-tertiary transition-shadow ${
              errors.name ? "border-rose-500 bg-rose-50/20" : ""
            }`}
          />
          {errors.name && (
            <span
              aria-live="polite"
              className="text-xs font-mono font-bold text-rose-600 mt-1 block"
            >
              {errors.name.message}
            </span>
          )}
        </div>

        <div>
          <label className="font-sans text-xs font-semibold mb-1 block">
            Description (Optional)
          </label>
          <textarea
            {...register("description")}
            placeholder="What is the objective or timeline of this project?"
            rows={3}
            className={`w-full px-3 py-2 border-2 border-black rounded-sketchy-sm font-sans text-sm bg-white placeholder:text-secondary/40 focus:outline-none focus:ring-2 focus:ring-tertiary transition-shadow resize-none ${
              errors.description ? "border-rose-500 bg-rose-50/20" : ""
            }`}
          />
          {errors.description && (
            <span
              aria-live="polite"
              className="text-xs font-mono font-bold text-rose-600 mt-1 block"
            >
              {errors.description.message}
            </span>
          )}
        </div>

        <div>
          <label className="font-sans text-xs font-semibold mb-1 block">
            Project Template (Optional)
          </label>
          <select
            {...register("templateId")}
            className="w-full px-3 py-2 border-2 border-black rounded-sketchy-sm font-sans text-sm bg-white focus:outline-none focus:ring-2 focus:ring-tertiary transition-shadow cursor-pointer shadow-flat-offset-sm"
          >
            <option value="">Blank Project (No Template)</option>
            {templates.map((t) => (
              <option key={t.id} value={t.id}>
                {t.name}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="font-sans text-xs font-semibold mb-1 block">
            Status Column
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

        <button
          type="submit"
          disabled={loading}
          className="w-full py-2.5 mt-2 bg-tertiary hover:bg-tertiary-hover text-white font-sans text-sm font-bold border-2 border-black rounded-full shadow-flat-offset-sm active:translate-y-0.5 hover:-translate-y-0.5 transition-all disabled:opacity-40 disabled:pointer-events-none cursor-pointer"
        >
          {loading ? (
            <span className="flex items-center justify-center gap-2">
              <Loader2 className="h-4 w-4 animate-spin" />
              Creating project…
            </span>
          ) : (
            "Deploy Project"
          )}
        </button>
      </form>
    </BaseModal>
  );
}
