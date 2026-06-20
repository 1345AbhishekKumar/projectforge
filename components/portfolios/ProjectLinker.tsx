"use client";

import { useState } from "react";
import { Loader2, Plus, X } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { getUnassignedProjects, linkProjectsToProgram } from "@/actions/program";

type Props = {
  isOpen: boolean;
  onClose: () => void;
  orgId: string;
  programId: string;
  onSuccess: () => void;
};

export function ProjectLinker({ isOpen, onClose, orgId, programId, onSuccess }: Props) {
  const [loading, setLoading] = useState(false);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [error, setError] = useState("");

  const { data: unassignedProjects = [], refetch } = useQuery({
    queryKey: ["unassignedProjects", orgId, programId],
    queryFn: async () => {
      const result = await getUnassignedProjects(orgId);
      if (!result.success) throw new Error(result.error || "Failed to load unassigned projects");
      return result.data || [];
    },
    enabled: isOpen && !!orgId,
  });

  if (!isOpen) return null;

  const handleClose = () => {
    setSelectedIds([]);
    setError("");
    onClose();
  };

  const toggleSelect = (id: string) => {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    );
  };

  async function handleLink() {
    if (selectedIds.length === 0) {
      setError("Please select at least one project to link.");
      return;
    }

    setError("");
    setLoading(true);

    try {
      const result = await linkProjectsToProgram(orgId, programId, selectedIds);
      if (result.success) {
        setSelectedIds([]);
        await refetch();
        onSuccess();
        onClose();
      } else {
        setError(result.error || "Failed to link projects");
      }
    } catch {
      setError("An unexpected error occurred");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-white border-2 border-black rounded-sketchy shadow-flat-offset p-6 md:p-8 max-w-md w-full relative rotate-[-0.5deg] animate-in fade-in zoom-in duration-200">
        
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
          <h2 className="font-cursive text-2xl font-bold">Link Projects</h2>
        </div>

        <p className="font-sans text-xs text-secondary mb-6 leading-relaxed">
          Select projects from the organization workspace to coordinate under this program. A project can only belong to one program at a time.
        </p>

        {error && (
          <div className="bg-accent-pink border-2 border-black rounded-sketchy-sm p-3 mb-4 text-xs font-semibold">
            {error}
          </div>
        )}

        {unassignedProjects.length === 0 ? (
          <div className="text-center py-6 border-2 border-dashed border-black/25 rounded-sketchy-sm bg-neutral-bg/30">
            <p className="font-sans text-sm text-secondary italic">
              All projects are already linked to programs.
            </p>
          </div>
        ) : (
          <div className="max-h-60 overflow-y-auto border-2 border-black rounded-sketchy-sm p-3 flex flex-col gap-2 bg-neutral-bg/10 mb-6">
            {unassignedProjects.map((p) => {
              const isSelected = selectedIds.includes(p.id);
              return (
                <div
                  key={p.id}
                  onClick={() => toggleSelect(p.id)}
                  className={`flex items-center gap-3 p-2.5 border border-black/10 rounded cursor-pointer transition-colors ${
                    isSelected ? "bg-accent-yellow/30 border-black" : "hover:bg-neutral-bg/50"
                  }`}
                >
                  <input
                    type="checkbox"
                    checked={isSelected}
                    readOnly
                    className="w-4.5 h-4.5 border-2 border-black rounded-sm bg-white cursor-pointer"
                  />
                  <span className="font-sans text-sm font-semibold text-primary">
                    {p.name}
                  </span>
                </div>
              );
            })}
          </div>
        )}

        {unassignedProjects.length > 0 && (
          <button
            onClick={handleLink}
            disabled={loading}
            className="w-full py-2.5 bg-tertiary hover:bg-tertiary-hover text-white font-sans text-sm font-bold border-2 border-black rounded-full shadow-flat-offset-sm active:translate-y-0.5 hover:-translate-y-0.5 transition-all disabled:opacity-40 disabled:pointer-events-none cursor-pointer"
          >
            {loading ? (
              <span className="flex items-center justify-center gap-2">
                <Loader2 className="h-4 w-4 animate-spin" />
                Linking projects…
              </span>
            ) : (
              `Link Selected Project${selectedIds.length > 1 ? "s" : ""}`
            )}
          </button>
        )}
      </div>
    </div>
  );
}
