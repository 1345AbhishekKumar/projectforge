"use client";

import React, { useState } from "react";
import { Sparkles, Loader2, Plus, Check } from "lucide-react";
import { suggestSubtasksAction } from "@/actions/ai";
import { createComment } from "@/actions/comment";

type Props = {
  taskId: string;
  orgId: string;
  projectId: string;
  taskTitle: string;
  taskDescription: string;
};

export function AISubtaskSuggester({ taskId, orgId, projectId, taskTitle, taskDescription }: Props) {
  const [loading, setLoading] = useState(false);
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [selected, setSelected] = useState<Record<string, boolean>>({});
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);

  const handleFetch = async () => {
    setLoading(true);
    setError("");
    setSuggestions([]);
    setSuccess(false);

    try {
      const res = await suggestSubtasksAction(taskId, orgId, taskTitle, taskDescription);
      if (res.success && res.data) {
        setSuggestions(res.data);
        const selMap: Record<string, boolean> = {};
        res.data.forEach((s) => {
          selMap[s] = true;
        });
        setSelected(selMap);
      } else {
        setError(res.error || "Failed to generate suggestions.");
      }
    } catch {
      setError("An unexpected error occurred.");
    } finally {
      setLoading(false);
    }
  };

  const handleToggle = (item: string) => {
    setSelected((prev) => ({
      ...prev,
      [item]: !prev[item],
    }));
  };

  const handleImport = async () => {
    const itemsToImport = suggestions.filter((s) => selected[s]);
    if (itemsToImport.length === 0) return;

    setLoading(true);
    try {
      // Import them as subtasks by adding comments containing subtasks or checklist
      const subtaskComment = `**AI Suggested Subtask Checklist:**\n${itemsToImport
        .map((it) => `- [ ] ${it}`)
        .join("\n")}`;

      const res = await createComment(taskId, projectId, orgId, subtaskComment);
      if (res.success) {
        setSuccess(true);
        setSuggestions([]);
      } else {
        setError(res.error || "Failed to import subtasks");
      }
    } catch {
      setError("Failed to import subtasks.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="border-2 border-black rounded-sketchy p-4 bg-[#FFF2B2]/20 flex flex-col gap-3">
      <div className="flex items-center justify-between">
        <span className="font-cursive text-sm font-bold flex items-center gap-1.5">
          <Sparkles className="h-4 w-4 text-tertiary" />
          AI Subtask Breakdown Suggestions
        </span>
        {!loading && suggestions.length === 0 && (
          <button
            type="button"
            onClick={handleFetch}
            className="flex items-center gap-1 bg-white hover:bg-neutral-bg border border-black font-sans text-[10px] font-bold px-2 py-1 rounded shadow-flat-offset-xs active:translate-y-0.2 cursor-pointer"
          >
            Suggest Subtasks
          </button>
        )}
      </div>

      {loading && (
        <div className="flex items-center justify-center gap-2 py-4">
          <Loader2 className="h-4 w-4 animate-spin text-tertiary" />
          <span className="font-cursive text-xs animate-pulse">Decomposing task...</span>
        </div>
      )}

      {error && (
        <span className="font-sans text-[10px] font-bold text-rose-600">
          ⚠️ {error}
        </span>
      )}

      {success && (
        <span className="font-sans text-[10px] font-bold text-accent-green flex items-center gap-1">
          <Check className="h-3 w-3" />
          Checklist imported successfully to comments tab!
        </span>
      )}

      {suggestions.length > 0 && (
        <div className="flex flex-col gap-2 bg-white p-3 border border-black rounded shadow-flat-offset-xs">
          <span className="font-sans text-[10px] text-secondary font-semibold block mb-1">
            Choose subtasks to import into comments tab checklist:
          </span>
          <div className="flex flex-col gap-1.5">
            {suggestions.map((item) => (
              <label key={item} className="flex items-start gap-2 text-xs font-sans cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={!!selected[item]}
                  onChange={() => handleToggle(item)}
                  className="w-3.5 h-3.5 mt-0.5 border border-black rounded bg-white text-tertiary focus:ring-tertiary"
                />
                <span className={selected[item] ? "text-primary" : "text-secondary/50 line-through"}>
                  {item}
                </span>
              </label>
            ))}
          </div>

          <div className="flex items-center gap-2 justify-end mt-3 pt-2 border-t border-black/10">
            <button
              type="button"
              onClick={() => setSuggestions([])}
              className="px-2 py-1 border border-black rounded text-[10px] hover:bg-neutral-bg cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleImport}
              className="flex items-center gap-1 bg-tertiary text-white border border-black font-sans text-[10px] font-bold px-3 py-1 rounded shadow-flat-offset-xs active:translate-y-0.2 cursor-pointer"
            >
              <Plus className="h-3 w-3" />
              Import Checklist
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
