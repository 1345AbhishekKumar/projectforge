"use client";

import { useState } from "react";
import { Loader2, FolderPlus, X } from "lucide-react";
import type { ProjectStatus } from "@/types";

type Props = {
  isOpen: boolean;
  onClose: () => void;
  onCreate: (name: string, description: string | null, status: ProjectStatus) => Promise<{ success: boolean; error?: string }>;
};

export function CreateProjectModal({ isOpen, onClose, onCreate }: Props) {
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [status, setStatus] = useState<ProjectStatus>("PLANNING");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  if (!isOpen) return null;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!name || name.length < 3) {
      setError("Project name must be at least 3 characters");
      return;
    }

    setError("");
    setLoading(true);

    try {
      const result = await onCreate(name, description || null, status);
      if (result.success) {
        setName("");
        setDescription("");
        setStatus("PLANNING");
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
    <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-white border-2 border-black rounded-sketchy shadow-flat-offset p-6 md:p-8 max-w-md w-full relative rotate-[0.5deg] animate-in fade-in zoom-in duration-200">
        
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 w-8 h-8 rounded-full border-2 border-black bg-white hover:bg-neutral-bg flex items-center justify-center shadow-flat-offset-sm active:translate-y-0.5 hover:-translate-y-0.5 transition-all cursor-pointer font-bold"
          aria-label="Close modal"
        >
          <X className="h-4 w-4" />
        </button>

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

        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <div>
            <label className="font-sans text-xs font-semibold mb-1 block">
              Project Name
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g., Q3 Mobile app refactor"
              required
              minLength={3}
              maxLength={50}
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
              placeholder="What is the objective or timeline of this project?"
              maxLength={250}
              rows={3}
              className="w-full px-3 py-2 border-2 border-black rounded-sketchy-sm font-sans text-sm bg-white placeholder:text-secondary/40 focus:outline-none focus:ring-2 focus:ring-tertiary transition-shadow resize-none"
            />
          </div>

          <div>
            <label className="font-sans text-xs font-semibold mb-1 block">
              Status Column
            </label>
            <select
              value={status}
              onChange={(e) => setStatus(e.target.value as ProjectStatus)}
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
            disabled={loading || !name}
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
      </div>
    </div>
  );
}
