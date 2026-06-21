"use client";

import React, { useState, useEffect } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Loader2, X } from "lucide-react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";

import { upsertProjectRisk } from "@/actions/risk";
import type { Risk } from "@/types";

const riskFormSchema = z.object({
  title: z.string().trim().min(1, "Risk title is required").max(200, "Title is too long"),
  probability: z.enum(["low", "medium", "high"]),
  impact: z.enum(["low", "medium", "high"]),
  mitigationPlan: z.string().trim().max(1000, "Mitigation plan is too long").nullable().optional(),
});

type RiskFormValues = z.infer<typeof riskFormSchema>;

type Props = {
  isOpen: boolean;
  onClose: () => void;
  editingRisk: Risk | null;
  projectId: string;
  activeOrgId: string;
};

export function RiskFormModal({ isOpen, onClose, editingRisk, projectId, activeOrgId }: Props) {
  const queryClient = useQueryClient();
  const [formError, setFormError] = useState("");

  const { register, handleSubmit, formState: { errors }, reset } = useForm<RiskFormValues>({
    resolver: zodResolver(riskFormSchema),
    defaultValues: {
      title: "",
      probability: "medium",
      impact: "medium",
      mitigationPlan: "",
    },
  });

  // Prefill form when editingRisk changes
  useEffect(() => {
    if (editingRisk) {
      reset({
        title: editingRisk.title,
        probability: editingRisk.probability,
        impact: editingRisk.impact,
        mitigationPlan: editingRisk.mitigation_plan || "",
      });
    } else {
      reset({
        title: "",
        probability: "medium",
        impact: "medium",
        mitigationPlan: "",
      });
    }
  }, [editingRisk, reset]);

  const handleClose = () => {
    setFormError("");
    onClose();
  };

  const upsertMutation = useMutation({
    mutationFn: async (values: RiskFormValues) => {
      const payload = {
        id: editingRisk?.id,
        projectId,
        title: values.title,
        probability: values.probability,
        impact: values.impact,
        mitigationPlan: values.mitigationPlan || null,
      };
      const result = await upsertProjectRisk(activeOrgId, payload);
      if (!result.success) throw new Error(result.error || "Failed to save risk");
      return result.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["risks", projectId, activeOrgId] });
      onClose();
    },
    onError: (err: Error) => {
      setFormError(err.message || "An error occurred while saving");
    },
  });

  if (!isOpen) return null;

  const onSubmit = (values: RiskFormValues) => {
    setFormError("");
    upsertMutation.mutate(values);
  };

  return (
    <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-white border-2 border-black rounded-sketchy shadow-flat-offset p-6 md:p-8 max-w-md w-full relative rotate-[-0.5deg]">
        <button
          onClick={handleClose}
          className="absolute top-4 right-4 w-8 h-8 rounded-full border-2 border-black bg-white hover:bg-neutral-bg flex items-center justify-center shadow-flat-offset-sm active:translate-y-0.5 hover:-translate-y-0.5 transition-all cursor-pointer font-bold"
          aria-label="Close modal"
        >
          <X className="h-4 w-4" />
        </button>

        <div className="flex items-center gap-2 mb-4">
          <h2 className="font-cursive text-2xl font-bold">
            {editingRisk ? "Edit Project Risk" : "Log New Project Risk"}
          </h2>
        </div>

        {formError && (
          <div className="bg-accent-pink border-2 border-black rounded-sketchy-sm p-3 mb-4 text-xs font-semibold text-primary">
            {formError}
          </div>
        )}

        <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-4">
          <div>
            <label className="font-sans text-xs font-semibold mb-1 block text-primary">Risk Title / Description</label>
            <input
              type="text"
              {...register("title")}
              placeholder="e.g., Key database migration delays"
              className={`w-full px-3 py-2 border-2 border-black rounded-sketchy-sm font-sans text-sm bg-white focus:outline-none focus:ring-1 focus:ring-black text-primary ${
                errors.title ? "border-rose-500 bg-rose-50/20" : ""
              }`}
            />
            {errors.title && (
              <span className="text-xs font-mono font-bold text-rose-600 mt-1 block">
                {errors.title.message}
              </span>
            )}
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="font-sans text-xs font-semibold mb-1 block text-primary">Probability</label>
              <select
                {...register("probability")}
                className="w-full px-3 py-2 border-2 border-black rounded-sketchy-sm font-sans text-sm bg-white cursor-pointer text-primary"
              >
                <option value="low">Low</option>
                <option value="medium">Medium</option>
                <option value="high">High</option>
              </select>
            </div>

            <div>
              <label className="font-sans text-xs font-semibold mb-1 block text-primary">Impact</label>
              <select
                {...register("impact")}
                className="w-full px-3 py-2 border-2 border-black rounded-sketchy-sm font-sans text-sm bg-white cursor-pointer text-primary"
              >
                <option value="low">Low</option>
                <option value="medium">Medium</option>
                <option value="high">High</option>
              </select>
            </div>
          </div>

          <div>
            <label className="font-sans text-xs font-semibold mb-1 block text-primary">Mitigation Plan (Optional)</label>
            <textarea
              {...register("mitigationPlan")}
              placeholder="How will we address this threat if it materializes?"
              rows={3}
              className={`w-full px-3 py-2 border-2 border-black rounded-sketchy-sm font-sans text-sm bg-white focus:outline-none focus:ring-1 focus:ring-black text-primary resize-none ${
                errors.mitigationPlan ? "border-rose-500 bg-rose-50/20" : ""
              }`}
            />
            {errors.mitigationPlan && (
              <span className="text-xs font-mono font-bold text-rose-600 mt-1 block">
                {errors.mitigationPlan.message}
              </span>
            )}
          </div>

          <button
            type="submit"
            disabled={upsertMutation.isPending}
            className="w-full py-2.5 mt-2 bg-accent-yellow hover:bg-[#FFEAA3] text-primary font-sans text-sm font-bold border-2 border-black rounded-full shadow-flat-offset-sm active:translate-y-0.5 hover:-translate-y-0.5 transition-all disabled:opacity-40 cursor-pointer"
          >
            {upsertMutation.isPending ? (
              <span className="flex items-center justify-center gap-2">
                <Loader2 className="h-4 w-4 animate-spin" />
                Saving details...
              </span>
            ) : (
              editingRisk ? "Update Risk details" : "Register Risk"
            )}
          </button>
        </form>
      </div>
    </div>
  );
}
