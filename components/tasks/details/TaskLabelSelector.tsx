"use client";

import React, { useState } from "react";
import { createLabel } from "@/actions/label";
import type { Label } from "@/types";

type Props = {
  orgId: string;
  selectedLabelIds: string[];
  setSelectedLabelIds: React.Dispatch<React.SetStateAction<string[]>>;
  labels: Label[];
  setLabels: React.Dispatch<React.SetStateAction<Label[]>>;
};

export function TaskLabelSelector({
  orgId,
  selectedLabelIds,
  setSelectedLabelIds,
  labels,
  setLabels,
}: Props) {
  const [showLabelCreator, setShowLabelCreator] = useState(false);
  const [newLabelName, setNewLabelName] = useState("");
  const [newLabelColor, setNewLabelColor] = useState("#FFF2B2");
  const [creatingLabel, setCreatingLabel] = useState(false);

  return (
    <div>
      <label className="font-sans text-xs font-semibold mb-1 block">Labels</label>

      {/* Selected labels list */}
      <div className="flex flex-wrap gap-1.5 mb-2">
        {selectedLabelIds.map((id) => {
          const label = labels.find((l) => l.id === id);
          if (!label) return null;
          return (
            <span
              key={label.id}
              style={{ backgroundColor: label.color }}
              className="text-[9px] font-bold px-2 py-0.5 rounded-full border border-black/40 text-primary flex items-center gap-1 select-none"
            >
              {label.name}
              <button
                type="button"
                onClick={() => setSelectedLabelIds((prev) => prev.filter((lid) => lid !== label.id))}
                className="hover:text-red-500 font-bold"
              >
                ×
              </button>
            </span>
          );
        })}
        {selectedLabelIds.length === 0 && (
          <span className="text-[10px] text-secondary/60 italic">No labels selected</span>
        )}
      </div>

      {/* List of selectables */}
      <div className="border-2 border-black rounded-sketchy-sm p-2 bg-neutral-bg/25 max-h-32 overflow-y-auto flex flex-col gap-1">
        {labels.map((label) => {
          const isChecked = selectedLabelIds.includes(label.id);
          return (
            <button
              type="button"
              key={label.id}
              onClick={() => {
                setSelectedLabelIds((prev) =>
                  isChecked ? prev.filter((id) => id !== label.id) : [...prev, label.id]
                );
              }}
              className="flex items-center justify-between text-left px-2 py-1 hover:bg-neutral-bg/50 rounded text-xs font-sans font-semibold cursor-pointer"
            >
              <div className="flex items-center gap-2">
                <span
                  className="w-2.5 h-2.5 rounded-full border border-black/30"
                  style={{ backgroundColor: label.color }}
                />
                <span>{label.name}</span>
              </div>
              {isChecked && <span className="text-tertiary font-bold">✓</span>}
            </button>
          );
        })}

        <button
          type="button"
          onClick={() => setShowLabelCreator(!showLabelCreator)}
          className="text-left px-2 py-1 text-[10px] font-bold text-tertiary hover:underline cursor-pointer border-t border-black/5 mt-1 pt-1.5"
        >
          {showLabelCreator ? "Cancel new label" : "+ Create new label"}
        </button>
      </div>

      {/* Inline Label Creator */}
      {showLabelCreator && (
        <div className="border-2 border-black rounded-sketchy bg-[#FFF2B2]/10 p-3 mt-2 flex flex-col gap-2.5">
          <span className="font-cursive text-sm font-bold">New Workspace Label</span>
          <div className="flex gap-2">
            <input
              type="text"
              placeholder="Label name (e.g. Bug)"
              value={newLabelName}
              onChange={(e) => setNewLabelName(e.target.value)}
              className="flex-grow px-2 py-1 border-2 border-black rounded-sketchy-sm font-sans text-xs bg-white focus:outline-none focus:ring-2 focus:ring-tertiary"
            />
            <button
              type="button"
              disabled={creatingLabel || !newLabelName.trim()}
              onClick={async () => {
                if (!newLabelName.trim()) return;
                setCreatingLabel(true);
                const res = await createLabel(orgId, newLabelName.trim(), newLabelColor);
                setCreatingLabel(false);
                if (res.success && res.data) {
                  setLabels((prev) => [...prev, res.data!]);
                  setSelectedLabelIds((prev) => [...prev, res.data!.id]);
                  setNewLabelName("");
                  setShowLabelCreator(false);
                } else {
                  alert(res.error || "Failed to create label");
                }
              }}
              className="px-3 py-1 bg-tertiary hover:bg-tertiary-hover text-white font-sans text-xs font-bold border-2 border-black rounded-full shadow-flat-offset-sm active:translate-y-0.5 hover:-translate-y-0.5 transition-all cursor-pointer disabled:opacity-40"
            >
              Create
            </button>
          </div>
          <div className="flex items-center gap-1.5 flex-wrap">
            <span className="text-[10px] font-bold font-sans text-secondary">Color:</span>
            {["#FFF2B2", "#FFD2D2", "#D0E1FD", "#D4EDDA", "#EEF2FF", "#FF7F50"].map((color) => (
              <button
                type="button"
                key={color}
                onClick={() => setNewLabelColor(color)}
                style={{ backgroundColor: color }}
                className={`w-4 h-4 rounded-full border border-black/40 cursor-pointer transition-all ${
                  newLabelColor === color ? "ring-2 ring-black scale-110" : "hover:scale-105"
                }`}
              />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
