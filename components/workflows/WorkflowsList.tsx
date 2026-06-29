"use client";

import { useState } from "react";
import {
  Search,
  Folder,
  Trash2,
  ToggleLeft,
  ToggleRight,
  Loader2,
  ArrowRight,
  Pencil,
  Plus,
} from "lucide-react";
import Link from "next/link";
import { deleteWorkflow, updateWorkflow } from "@/actions/workflow";
import {
  createWorkflowCategory,
  updateWorkflowCategory,
  deleteWorkflowCategory,
} from "@/actions/workflowCategory";

export type WorkflowRow = {
  id: string;
  name: string;
  trigger: string;
  conditions: Record<string, unknown>;
  actions: { type: string; data: Record<string, unknown> }[];
  enabled: boolean;
  category: string;
  status: "DRAFT" | "ACTIVE" | "ARCHIVED";
  created_at: string;
};

type Props = {
  initialWorkflows: WorkflowRow[];
  initialCategories: string[];
  orgId: string;
  canEdit: boolean;
};

export function WorkflowsList({ initialWorkflows, initialCategories, orgId, canEdit }: Props) {
  const [workflows, setWorkflows] = useState<WorkflowRow[]>(initialWorkflows);
  const [categories, setCategories] = useState<string[]>(initialCategories);
  const [selectedCategory, setSelectedCategory] = useState<string>(
    initialCategories.find((c) => c.toLowerCase() === "engineering") ||
      initialCategories[0] ||
      "General",
  );
  const [searchQuery, setSearchQuery] = useState("");
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [togglingId, setTogglingId] = useState<string | null>(null);

  // Category management states
  const [isAddingCategory, setIsAddingCategory] = useState(false);
  const [newCategoryName, setNewCategoryName] = useState("");
  const [isEditingCategory, setIsEditingCategory] = useState(false);
  const [renameCategoryName, setRenameCategoryName] = useState("");

  const handleAddCategory = () => {
    setIsAddingCategory(true);
    setNewCategoryName("");
  };

  const handleSaveNewCategory = async (e: React.FormEvent) => {
    e.preventDefault();
    const name = newCategoryName.trim();
    if (!name) return;

    const res = await createWorkflowCategory(orgId, name);
    if (res.success) {
      setCategories((prev) => [...prev, name]);
      setSelectedCategory(name);
      setIsAddingCategory(false);
    } else {
      alert(res.error || "Failed to create category folder");
    }
  };

  const handleSaveRenameCategory = async (e: React.FormEvent, oldName: string) => {
    e.preventDefault();
    const newName = renameCategoryName.trim();
    if (!newName || newName === oldName) {
      setIsEditingCategory(false);
      return;
    }

    const res = await updateWorkflowCategory(orgId, oldName, newName);
    if (res.success) {
      setCategories((prev) => prev.map((c) => (c === oldName ? newName : c)));
      setWorkflows((prev) =>
        prev.map((w) => (w.category === oldName ? { ...w, category: newName } : w)),
      );
      if (selectedCategory === oldName) {
        setSelectedCategory(newName);
      }
      setIsEditingCategory(false);
    } else {
      alert(res.error || "Failed to rename category folder");
    }
  };

  const handleDeleteCategory = async (name: string) => {
    if (name.toLowerCase() === "general") {
      alert("The 'General' category folder cannot be deleted.");
      return;
    }
    if (
      !confirm(
        `Are you sure you want to delete the category folder '${name}'? Workflows in this folder will be moved to 'General'.`,
      )
    ) {
      return;
    }

    const res = await deleteWorkflowCategory(orgId, name);
    if (res.success) {
      setCategories((prev) => prev.filter((c) => c !== name));
      setWorkflows((prev) =>
        prev.map((w) => (w.category === name ? { ...w, category: "General" } : w)),
      );
      if (selectedCategory === name) {
        setSelectedCategory("General");
      }
    } else {
      alert(res.error || "Failed to delete category folder");
    }
  };

  // Filtered workflows based on folder and search query
  const filteredWorkflows = workflows.filter((wf) => {
    const matchesSearch =
      wf.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      wf.trigger.toLowerCase().includes(searchQuery.toLowerCase());

    if (selectedCategory === "Archived") {
      return wf.status === "ARCHIVED" && matchesSearch;
    }

    return (
      wf.status !== "ARCHIVED" &&
      wf.category?.toLowerCase() === selectedCategory.toLowerCase() &&
      matchesSearch
    );
  });

  async function handleToggle(wf: WorkflowRow) {
    if (!canEdit) return;
    setTogglingId(wf.id);
    try {
      const res = await updateWorkflow(wf.id, orgId, { enabled: !wf.enabled });
      if (res.success) {
        setWorkflows((prev) =>
          prev.map((w) => (w.id === wf.id ? { ...w, enabled: !wf.enabled } : w)),
        );
      }
    } finally {
      setTogglingId(null);
    }
  }

  async function handleDeleteOrArchive(wf: WorkflowRow) {
    if (!canEdit) return;

    if (wf.status === "ARCHIVED") {
      // Hard delete from DB
      if (!confirm("Permanently delete this archived workflow? This cannot be undone.")) return;
      setDeletingId(wf.id);
      try {
        const res = await deleteWorkflow(wf.id, orgId);
        if (res.success) {
          setWorkflows((prev) => prev.filter((w) => w.id !== wf.id));
        }
      } finally {
        setDeletingId(null);
      }
    } else {
      // Archive (soft delete)
      if (!confirm("Move this workflow to Archived?")) return;
      setDeletingId(wf.id);
      try {
        const res = await updateWorkflow(wf.id, orgId, { status: "ARCHIVED", enabled: false });
        if (res.success) {
          setWorkflows((prev) =>
            prev.map((w) => (w.id === wf.id ? { ...w, status: "ARCHIVED", enabled: false } : w)),
          );
        }
      } finally {
        setDeletingId(null);
      }
    }
  }

  return (
    <div className="flex flex-col gap-6 animate-in fade-in duration-200">
      {/* Category Folders Navigation */}
      <div className="flex flex-wrap border-b-2 border-black gap-2">
        {[...categories.filter((c) => c !== "Archived"), "Archived"].map((cat) => {
          const isActive = selectedCategory === cat;
          const count = workflows.filter((w) =>
            cat === "Archived"
              ? w.status === "ARCHIVED"
              : w.status !== "ARCHIVED" && w.category?.toLowerCase() === cat.toLowerCase(),
          ).length;

          return (
            <div
              key={cat}
              onClick={() => {
                if (!isEditingCategory) setSelectedCategory(cat);
              }}
              className={`flex items-center gap-2 px-5 py-2.5 font-cursive text-sm font-bold border-2 border-black border-b-0 rounded-t-lg transition-all relative -mb-[2px] cursor-pointer select-none ${
                isActive
                  ? "bg-accent-yellow shadow-[0_-2px_0_rgba(0,0,0,1)] z-10"
                  : "bg-white hover:bg-neutral-bg text-secondary"
              }`}
            >
              <Folder
                className={`h-4 w-4 ${isActive ? "text-primary fill-primary/10" : "text-secondary"}`}
              />

              {isActive && isEditingCategory && cat !== "Archived" ? (
                <form
                  onSubmit={(e) => handleSaveRenameCategory(e, cat)}
                  onClick={(e) => e.stopPropagation()}
                  className="flex items-center gap-1.5"
                >
                  <input
                    type="text"
                    autoFocus
                    value={renameCategoryName}
                    onChange={(e) => setRenameCategoryName(e.target.value)}
                    className="font-sans text-xs border border-black px-1.5 py-0.5 w-24 bg-white rounded-sm"
                  />
                  <button
                    type="submit"
                    className="text-emerald-700 hover:text-emerald-800 font-sans text-xs font-bold shrink-0 cursor-pointer"
                  >
                    ✓
                  </button>
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      setIsEditingCategory(false);
                    }}
                    className="text-rose-700 hover:text-rose-800 font-sans text-xs font-bold shrink-0 cursor-pointer"
                  >
                    ✗
                  </button>
                </form>
              ) : (
                <div className="flex items-center gap-2">
                  <span>{cat}</span>
                  {isActive && cat !== "Archived" && canEdit && (
                    <div className="flex items-center gap-1.5 ml-1 border-l border-black/20 pl-1.5">
                      <Pencil
                        className="h-3 w-3 text-secondary hover:text-primary transition-transform cursor-pointer"
                        title="Rename folder"
                        onClick={(e) => {
                          e.stopPropagation();
                          setRenameCategoryName(cat);
                          setIsEditingCategory(true);
                        }}
                      />
                      {cat.toLowerCase() !== "general" && (
                        <Trash2
                          className="h-3 w-3 text-secondary hover:text-rose-600 transition-transform cursor-pointer"
                          title="Delete folder"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleDeleteCategory(cat);
                          }}
                        />
                      )}
                    </div>
                  )}
                </div>
              )}

              <span className="font-sans text-[10px] bg-neutral-bg border border-black/20 rounded-full px-1.5 py-0.2 select-none ml-1">
                {count}
              </span>
            </div>
          );
        })}

        {/* Add Folder Button/Input */}
        {canEdit && (
          <div className="relative -mb-[2px] flex items-center">
            {isAddingCategory ? (
              <form
                onSubmit={handleSaveNewCategory}
                className="flex items-center gap-1.5 px-3 py-1.5 border-2 border-black border-b-0 rounded-t-lg bg-white"
              >
                <input
                  type="text"
                  autoFocus
                  placeholder="New folder..."
                  value={newCategoryName}
                  onChange={(e) => setNewCategoryName(e.target.value)}
                  className="font-sans text-xs border border-black px-1.5 py-0.5 w-24 bg-white rounded-sm"
                />
                <button
                  type="submit"
                  className="text-emerald-700 hover:text-emerald-800 font-sans text-xs font-bold shrink-0 cursor-pointer"
                >
                  ✓
                </button>
                <button
                  type="button"
                  onClick={() => setIsAddingCategory(false)}
                  className="text-rose-700 hover:text-rose-800 font-sans text-xs font-bold shrink-0 cursor-pointer"
                >
                  ✗
                </button>
              </form>
            ) : (
              <button
                onClick={handleAddCategory}
                className="flex items-center gap-1 px-4 py-2 font-cursive text-sm font-bold border-2 border-black border-b-0 rounded-t-lg bg-neutral-bg hover:bg-neutral-bg/85 cursor-pointer text-secondary transition-all"
                title="Add new category folder"
              >
                <Plus className="h-3.5 w-3.5" />
                <span>Add Folder</span>
              </button>
            )}
          </div>
        )}
      </div>

      {/* Search & Actions Bar */}
      <div className="flex flex-col sm:flex-row items-center gap-4">
        {/* Search */}
        <div className="relative flex-1 w-full">
          <Search className="absolute left-3.5 top-3 h-4.5 w-4.5 text-secondary/40" />
          <input
            type="text"
            placeholder="Search workflows by name or event..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 border-2 border-black rounded-sketchy-sm font-sans text-xs bg-white focus:outline-none focus:ring-2 focus:ring-tertiary focus:bg-white transition-all shadow-sm"
          />
        </div>
      </div>

      {/* Grid of Workflows */}
      {filteredWorkflows.length === 0 ? (
        <div className="border-2 border-dashed border-black/20 rounded-sketchy p-12 text-center bg-white rotate-[-0.5deg]">
          <Folder className="h-10 w-10 text-secondary/30 mx-auto mb-3" />
          <p className="font-cursive text-lg text-secondary/60">Folder is empty</p>
          <p className="font-sans text-xs text-secondary/40 mt-1">
            No workflows match the selected category filters.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {filteredWorkflows.map((wf) => {
            const projectId = wf.conditions?.project_id as string | undefined;
            const projName = projectId
              ? projects.find((p) => p.id === projectId)?.name || "Project"
              : "All Projects";

            return (
              <div
                key={wf.id}
                className={`bg-white border-2 border-black rounded-sketchy p-5 shadow-flat-offset-xs flex flex-col justify-between gap-4 transition-all relative ${
                  !wf.enabled ? "opacity-60 bg-neutral-bg/30" : ""
                }`}
              >
                <div>
                  {/* Category & Status badges */}
                  <div className="flex items-center justify-between mb-2">
                    <span className="font-mono text-[9px] uppercase font-bold bg-accent-blue/30 border border-black/20 rounded-full px-2 py-0.5">
                      {wf.category || "General"}
                    </span>
                    <span
                      className={`font-mono text-[9px] uppercase font-bold border border-black/20 rounded-full px-2 py-0.5 ${
                        wf.enabled ? "bg-accent-green" : "bg-neutral-bg"
                      }`}
                    >
                      {wf.enabled ? "Active" : "Disabled"}
                    </span>
                  </div>

                  {/* Title & Trigger */}
                  <h4 className="font-sans text-sm font-bold text-primary mb-1 line-clamp-1">
                    {wf.name}
                  </h4>
                  <p className="font-sans text-xs text-secondary line-clamp-2 mb-2">
                    Scope: <strong className="text-primary">{projName}</strong> <br />
                    When:{" "}
                    <code className="bg-neutral-bg text-[10px] border border-black/10 px-1 py-0.5 rounded font-bold font-mono">
                      {wf.trigger}
                    </code>
                  </p>
                </div>

                {/* Actions Row */}
                <div className="flex items-center justify-between border-t border-black/10 pt-3 mt-1">
                  <div className="flex items-center gap-3">
                    {/* Toggle */}
                    {canEdit && wf.status !== "ARCHIVED" && (
                      <button
                        onClick={() => handleToggle(wf)}
                        disabled={togglingId === wf.id}
                        className="cursor-pointer text-secondary hover:text-primary transition-colors disabled:opacity-40"
                        title={wf.enabled ? "Disable workflow" : "Enable workflow"}
                      >
                        {togglingId === wf.id ? (
                          <Loader2 className="h-4.5 w-4.5 animate-spin" />
                        ) : wf.enabled ? (
                          <ToggleRight className="h-5 w-5 text-emerald-600" />
                        ) : (
                          <ToggleLeft className="h-5 w-5" />
                        )}
                      </button>
                    )}

                    {/* Delete */}
                    {canEdit && (
                      <button
                        onClick={() => handleDeleteOrArchive(wf)}
                        disabled={deletingId === wf.id}
                        className="cursor-pointer text-secondary hover:text-rose-600 transition-colors disabled:opacity-40"
                        title={wf.status === "ARCHIVED" ? "Delete permanently" : "Archive workflow"}
                      >
                        {deletingId === wf.id ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          <Trash2 className="h-4 w-4" />
                        )}
                      </button>
                    )}
                  </div>

                  {/* Configure Link */}
                  <Link
                    href={`/workflows/${wf.id}/builder`}
                    className="flex items-center gap-1 font-sans text-xs font-bold text-tertiary hover:text-tertiary-hover group transition-colors"
                  >
                    <span>Configure</span>
                    <ArrowRight className="h-3 w-3 group-hover:translate-x-0.5 transition-transform" />
                  </Link>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
