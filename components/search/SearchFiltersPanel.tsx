"use client";

import React, { useEffect, useState } from "react";
import { getUserProjects } from "@/actions/project";
import { getOrganizationMembers } from "@/actions/membership";
import type { Project, MemberListItem } from "@/types";

interface SearchFiltersPanelProps {
  orgId: string;
  projectIds: string[];
  setProjectIds: (ids: string[]) => void;
  statuses: string[];
  setStatuses: (statuses: string[]) => void;
  priorities: string[];
  setPriorities: (priorities: string[]) => void;
  assignees: string[];
  setAssignees: (assignees: string[]) => void;
  dateStart: string;
  setDateStart: (date: string) => void;
  dateEnd: string;
  setDateEnd: (date: string) => void;
}

const STATUS_OPTIONS = ["TODO", "IN_PROGRESS", "DONE"];
const PRIORITY_OPTIONS = ["LOW", "MEDIUM", "HIGH", "URGENT"];

export function SearchFiltersPanel({
  orgId,
  projectIds,
  setProjectIds,
  statuses,
  setStatuses,
  priorities,
  setPriorities,
  assignees,
  setAssignees,
  dateStart,
  setDateStart,
  dateEnd,
  setDateEnd,
}: SearchFiltersPanelProps) {
  const [projects, setProjects] = useState<Project[]>([]);
  const [members, setMembers] = useState<MemberListItem[]>([]);

  useEffect(() => {
    async function loadFilterData() {
      if (!orgId) return;
      const [projRes, memRes] = await Promise.all([
        getUserProjects(orgId),
        getOrganizationMembers(orgId),
      ]);
      if (projRes.success && projRes.data) {
        setProjects(projRes.data);
      }
      if (memRes.success && memRes.data) {
        setMembers(memRes.data);
      }
    }
    loadFilterData();
  }, [orgId]);

  const toggleProject = (id: string) => {
    if (projectIds.includes(id)) {
      setProjectIds(projectIds.filter((pId) => pId !== id));
    } else {
      setProjectIds([...projectIds, id]);
    }
  };

  const toggleStatus = (status: string) => {
    if (statuses.includes(status)) {
      setStatuses(statuses.filter((s) => s !== status));
    } else {
      setStatuses([...statuses, status]);
    }
  };

  const togglePriority = (priority: string) => {
    if (priorities.includes(priority)) {
      setPriorities(priorities.filter((p) => p !== priority));
    } else {
      setPriorities([...priorities, priority]);
    }
  };

  const toggleAssignee = (userId: string) => {
    if (assignees.includes(userId)) {
      setAssignees(assignees.filter((uId) => uId !== userId));
    } else {
      setAssignees([...assignees, userId]);
    }
  };

  return (
    <div className="p-4 border-b-2 border-black bg-neutral-bg/30 grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4 text-xs font-sans">
      {/* Projects selection */}
      <div className="flex flex-col gap-1.5">
        <span className="font-bold text-secondary">Filter by Project:</span>
        <div className="max-h-24 overflow-y-auto border border-black/10 rounded p-1.5 bg-white flex flex-col gap-1">
          {projects.length === 0 ? (
            <span className="text-secondary/50 italic">No projects found</span>
          ) : (
            projects.map((p) => (
              <label key={p.id} className="flex items-center gap-1.5 cursor-pointer">
                <input
                  type="checkbox"
                  checked={projectIds.includes(p.id)}
                  onChange={() => toggleProject(p.id)}
                  className="rounded border-black accent-tertiary"
                />
                <span className="truncate">{p.name}</span>
              </label>
            ))
          )}
        </div>
      </div>

      {/* Statuses selection */}
      <div className="flex flex-col gap-1.5">
        <span className="font-bold text-secondary">Filter by Status:</span>
        <div className="flex flex-wrap gap-1">
          {STATUS_OPTIONS.map((status) => {
            const active = statuses.includes(status);
            return (
              <button
                key={status}
                onClick={() => toggleStatus(status)}
                className={`px-2 py-0.5 rounded-full border border-black text-[10px] font-bold transition-all ${
                  active ? "bg-accent-blue text-primary font-black" : "bg-white text-secondary"
                }`}
              >
                {status.replace("_", " ")}
              </button>
            );
          })}
        </div>
      </div>

      {/* Priorities selection */}
      <div className="flex flex-col gap-1.5">
        <span className="font-bold text-secondary">Filter by Priority:</span>
        <div className="flex flex-wrap gap-1">
          {PRIORITY_OPTIONS.map((priority) => {
            const active = priorities.includes(priority);
            return (
              <button
                key={priority}
                onClick={() => togglePriority(priority)}
                className={`px-2 py-0.5 rounded-full border border-black text-[10px] font-bold transition-all ${
                  active ? "bg-accent-yellow text-primary font-black" : "bg-white text-secondary"
                }`}
              >
                {priority}
              </button>
            );
          })}
        </div>
      </div>

      {/* Assignees selection */}
      <div className="flex flex-col gap-1.5">
        <span className="font-bold text-secondary">Filter by Assignee:</span>
        <div className="max-h-24 overflow-y-auto border border-black/10 rounded p-1.5 bg-white flex flex-col gap-1">
          {members.length === 0 ? (
            <span className="text-secondary/50 italic">No members found</span>
          ) : (
            members.map((m) => (
              <label key={m.userId} className="flex items-center gap-1.5 cursor-pointer">
                <input
                  type="checkbox"
                  checked={assignees.includes(m.userId)}
                  onChange={() => toggleAssignee(m.userId)}
                  className="rounded border-black accent-tertiary"
                />
                <span className="truncate">{m.name}</span>
              </label>
            ))
          )}
        </div>
      </div>

      {/* Date Range selectors */}
      <div className="flex flex-col gap-1.5 sm:col-span-2">
        <span className="font-bold text-secondary">Filter by Creation Date:</span>
        <div className="flex items-center gap-2">
          <input
            type="date"
            value={dateStart}
            onChange={(e) => setDateStart(e.target.value)}
            className="border-2 border-black rounded px-2 py-1 bg-white focus:outline-none w-full max-w-[150px]"
          />
          <span className="text-secondary/60">to</span>
          <input
            type="date"
            value={dateEnd}
            onChange={(e) => setDateEnd(e.target.value)}
            className="border-2 border-black rounded px-2 py-1 bg-white focus:outline-none w-full max-w-[150px]"
          />
          {(dateStart || dateEnd) && (
            <button
              onClick={() => {
                setDateStart("");
                setDateEnd("");
              }}
              className="text-[10px] text-accent-pink hover:underline"
            >
              Clear dates
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
