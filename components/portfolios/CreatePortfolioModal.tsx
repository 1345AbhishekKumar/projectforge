"use client";

import { useState } from "react";
import { Loader2, Briefcase, X } from "lucide-react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { createPortfolio } from "@/actions/portfolio";

const portfolioSchema = z.object({
  name: z
    .string()
    .trim()
    .min(3, "Portfolio name must be at least 3 characters")
    .max(50, "Portfolio name must be at most 50 characters"),
  description: z.string().trim().max(250, "Description must be at most 250 characters").optional(),
});

type PortfolioInput = z.infer<typeof portfolioSchema>;

type Props = {
  isOpen: boolean;
  onClose: () => void;
  orgId: string;
  onSuccess: () => void;
};

export function CreatePortfolioModal({ isOpen, onClose, orgId, onSuccess }: Props) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const {
    register,
    handleSubmit,
    formState: { errors },
    reset,
  } = useForm<PortfolioInput>({
    resolver: zodResolver(portfolioSchema),
    mode: "onBlur",
    defaultValues: {
      name: "",
      description: "",
    },
  });

  if (!isOpen) return null;

  const handleClose = () => {
    reset();
    setError("");
    onClose();
  };

  async function onSubmit(data: PortfolioInput) {
    setError("");
    setLoading(true);

    try {
      const result = await createPortfolio(orgId, data.name, data.description || null);
      if (result.success) {
        reset();
        onSuccess();
        onClose();
      } else {
        setError(result.error || "Failed to create portfolio");
      }
    } catch {
      setError("An unexpected error occurred");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-white border-2 border-black rounded-sketchy shadow-flat-offset p-6 md:p-8 max-w-md w-full relative rotate-[0.5deg] animate-in fade-in zoom-in duration-200">
        
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
            <Briefcase className="h-4.5 w-4.5 text-tertiary" />
          </div>
          <h2 className="font-cursive text-2xl font-bold">New Portfolio</h2>
        </div>

        <p className="font-sans text-xs text-secondary mb-6 leading-relaxed">
          Create a new strategic portfolio to group enterprise projects and programs together.
        </p>

        {error && (
          <div className="bg-accent-pink border-2 border-black rounded-sketchy-sm p-3 mb-4 text-xs font-semibold">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-4">
          <div>
            <label className="font-sans text-xs font-semibold mb-1 block">
              Portfolio Name
            </label>
            <input
              type="text"
              {...register("name")}
              placeholder="e.g., AI Transformation"
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
              placeholder="What strategic initiatives fall under this portfolio?"
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

          <button
            type="submit"
            disabled={loading}
            className="w-full py-2.5 mt-2 bg-tertiary hover:bg-tertiary-hover text-white font-sans text-sm font-bold border-2 border-black rounded-full shadow-flat-offset-sm active:translate-y-0.5 hover:-translate-y-0.5 transition-all disabled:opacity-40 disabled:pointer-events-none cursor-pointer"
          >
            {loading ? (
              <span className="flex items-center justify-center gap-2">
                <Loader2 className="h-4 w-4 animate-spin" />
                Creating portfolio…
              </span>
            ) : (
              "Create Portfolio"
            )}
          </button>
        </form>
      </div>
    </div>
  );
}
