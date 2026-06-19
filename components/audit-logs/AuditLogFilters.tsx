"use client";

import React from "react";
import type { MemberListItem } from "@/actions/membership";
import type { AuditLogFilters as FiltersState } from "@/actions/auditLog";
import { Filter, X } from "lucide-react";

type Props = {
  members: MemberListItem[];
  filters: FiltersState;
  onChange: (filters: FiltersState) => void;
  onClear: () => void;
};

const ACTION_TYPES = [
  { value: "project.deleted", label: "Project Deleted" },
  { value: "role.updated", label: "Role Updated" },
  { value: "member.removed", label: "Member Removed" },
  { value: "workflow.created", label: "Workflow Created" },
  { value: "workflow.updated", label: "Workflow Updated" },
  { value: "workflow.deleted", label: "Workflow Deleted" },
  { value: "time_entry.deleted", label: "Time Entry Deleted" },
];

const ENTITY_TYPES = [
  { value: "project", label: "Project" },
  { value: "membership", label: "Membership" },
  { value: "workflow", label: "Workflow" },
  { value: "time_entry", label: "Time Entry" },
];

export function AuditLogFilters({ members, filters, onChange, onClear }: Props) {
  const hasActiveFilters =
    !!filters.actorId ||
    !!filters.action ||
    !!filters.entityType ||
    !!filters.from ||
    !!filters.to;

  const handleChange = (key: keyof FiltersState, value: string | undefined) => {
    onChange({
      ...filters,
      [key]: value || undefined,
    });
  };

  return (
    <div className="bg-white border-2 border-black rounded-sketchy p-6 shadow-flat-offset-sm flex flex-col gap-4">
      <div className="flex items-center gap-2 border-b border-black/10 pb-3">
        <Filter className="h-4 w-4" />
        <h3 className="font-cursive text-xl font-bold">Filter Audit Logs</h3>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
        {/* Actor Filter */}
        <div>
          <label className="font-sans text-xs font-semibold mb-1 block">Actor</label>
          <select
            value={filters.actorId || ""}
            onChange={(e) => handleChange("actorId", e.target.value)}
            className="w-full px-3 py-2 border-2 border-black rounded-sketchy-sm font-sans text-sm bg-white focus:outline-none focus:ring-2 focus:ring-tertiary cursor-pointer"
          >
            <option value="">All Actors</option>
            {members.map((member) => (
              <option key={member.id} value={member.userId}>
                {member.name}
              </option>
            ))}
          </select>
        </div>

        {/* Action Type Filter */}
        <div>
          <label className="font-sans text-xs font-semibold mb-1 block">Action verb</label>
          <select
            value={filters.action || ""}
            onChange={(e) => handleChange("action", e.target.value)}
            className="w-full px-3 py-2 border-2 border-black rounded-sketchy-sm font-sans text-sm bg-white focus:outline-none focus:ring-2 focus:ring-tertiary cursor-pointer"
          >
            <option value="">All Actions</option>
            {ACTION_TYPES.map((act) => (
              <option key={act.value} value={act.value}>
                {act.label}
              </option>
            ))}
          </select>
        </div>

        {/* Entity Type Filter */}
        <div>
          <label className="font-sans text-xs font-semibold mb-1 block">Entity type</label>
          <select
            value={filters.entityType || ""}
            onChange={(e) => handleChange("entityType", e.target.value)}
            className="w-full px-3 py-2 border-2 border-black rounded-sketchy-sm font-sans text-sm bg-white focus:outline-none focus:ring-2 focus:ring-tertiary cursor-pointer"
          >
            <option value="">All Entities</option>
            {ENTITY_TYPES.map((ent) => (
              <option key={ent.value} value={ent.value}>
                {ent.label}
              </option>
            ))}
          </select>
        </div>

        {/* Date From */}
        <div>
          <label className="font-sans text-xs font-semibold mb-1 block">From Date</label>
          <input
            type="date"
            value={filters.from ? filters.from.split("T")[0] : ""}
            onChange={(e) =>
              handleChange(
                "from",
                e.target.value ? new Date(e.target.value).toISOString() : undefined
              )
            }
            className="w-full px-3 py-2 border-2 border-black rounded-sketchy-sm font-sans text-sm bg-white focus:outline-none focus:ring-2 focus:ring-tertiary cursor-pointer"
          />
        </div>

        {/* Date To */}
        <div>
          <label className="font-sans text-xs font-semibold mb-1 block">To Date</label>
          <input
            type="date"
            value={filters.to ? filters.to.split("T")[0] : ""}
            onChange={(e) =>
              handleChange(
                "to",
                e.target.value
                  ? new Date(e.target.value + "T23:59:59.999Z").toISOString()
                  : undefined
              )
            }
            className="w-full px-3 py-2 border-2 border-black rounded-sketchy-sm font-sans text-sm bg-white focus:outline-none focus:ring-2 focus:ring-tertiary cursor-pointer"
          />
        </div>
      </div>

      {hasActiveFilters && (
        <div className="flex justify-end mt-2">
          <button
            onClick={onClear}
            className="inline-flex items-center gap-1 bg-accent-pink hover:bg-[#FFB2B2] text-primary border-2 border-black font-sans text-xs font-bold px-3 py-1.5 rounded-full shadow-flat-offset-xs active:translate-y-0.5 hover:-translate-y-0.5 transition-all cursor-pointer"
          >
            <X className="h-3 w-3" />
            Clear Filters
          </button>
        </div>
      )}
    </div>
  );
}
