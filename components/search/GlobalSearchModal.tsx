"use client";

import React, { useState, useEffect, useRef, useCallback } from "react";
import { useRouter } from "next/navigation";
import {
  Search,
  X,
  Loader2,
  FolderKanban,
  CheckSquare,
  User as UserIcon,
  MessageSquare,
  Paperclip,
  Activity,
  Filter,
  Save,
  Trash2,
  Bookmark,
} from "lucide-react";
import { advancedSearch, saveSearch, getSavedSearches, deleteSavedSearch } from "@/actions/search";
import { useSearchStore } from "@/store/searchStore";
import type {
  SearchResult,
  SearchResultProject,
  SearchResultTask,
  SearchResultMember,
  SearchResultComment,
  SearchResultAttachment,
  SearchResultActivity,
  SavedSearch,
} from "@/types";
import { useOrgStore } from "@/store/orgStore";
import { SearchFiltersPanel } from "./SearchFiltersPanel";

function AvatarFallback({ name, avatarUrl }: { name: string | null; avatarUrl: string | null }) {
  const initials = name
    ? name
        .split(" ")
        .map((n) => n[0])
        .slice(0, 2)
        .join("")
        .toUpperCase()
    : "?";

  if (avatarUrl) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={avatarUrl}
        alt={name || "Member"}
        className="w-full h-full object-cover"
      />
    );
  }

  return (
    <span className="font-cursive text-xs font-bold text-secondary">{initials}</span>
  );
}

const STATUS_COLORS: Record<string, string> = {
  TODO: "bg-neutral-bg border border-black/20",
  IN_PROGRESS: "bg-accent-blue border border-black/30",
  DONE: "bg-accent-green border border-black/30",
  PLANNING: "bg-neutral-bg border border-black/20",
  ACTIVE: "bg-accent-blue border border-black/30",
  COMPLETED: "bg-accent-green border border-black/30",
  ARCHIVED: "bg-neutral-bg border border-black/20",
};

const ROLE_COLORS: Record<string, string> = {
  OWNER: "bg-accent-purple text-white",
  ADMIN: "bg-accent-blue text-primary",
  MEMBER: "bg-accent-green text-primary",
};

type FlatResult =
  | { kind: "project"; data: SearchResultProject }
  | { kind: "task"; data: SearchResultTask }
  | { kind: "member"; data: SearchResultMember }
  | { kind: "comment"; data: SearchResultComment }
  | { kind: "attachment"; data: SearchResultAttachment }
  | { kind: "activity"; data: SearchResultActivity };

export function GlobalSearchModal() {
  const { isOpen, close } = useSearchStore();
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);

  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SearchResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [selectedIndex, setSelectedIndex] = useState(0);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Filters State
  const [showFilters, setShowFilters] = useState(false);
  const [projectIds, setProjectIds] = useState<string[]>([]);
  const [statuses, setStatuses] = useState<string[]>([]);
  const [priorities, setPriorities] = useState<string[]>([]);
  const [assignees, setAssignees] = useState<string[]>([]);
  const [dateStart, setDateStart] = useState("");
  const [dateEnd, setDateEnd] = useState("");

  // Saved Searches
  const [savedSearches, setSavedSearches] = useState<SavedSearch[]>([]);
  const [searchName, setSearchName] = useState("");
  const [saving, setSaving] = useState(false);
  const [showSavedList, setShowSavedList] = useState(false);

  const orgId = useOrgStore((s) => s.activeOrgId);

  const loadSavedSearches = useCallback(async () => {
    if (!orgId) return;
    const res = await getSavedSearches(orgId);
    if (res.success && res.data) {
      setSavedSearches(res.data);
    }
  }, [orgId]);

  useEffect(() => {
    let active = true;
    if (isOpen && orgId) {
      Promise.resolve().then(() => {
        if (active) {
          loadSavedSearches();
        }
      });
    }
    return () => {
      active = false;
    };
  }, [isOpen, orgId, loadSavedSearches]);

  const flatResults: FlatResult[] = results
    ? [
        ...(results.projects || []).map((p) => ({ kind: "project" as const, data: p })),
        ...(results.tasks || []).map((t) => ({ kind: "task" as const, data: t })),
        ...(results.members || []).map((m) => ({ kind: "member" as const, data: m })),
        ...(results.comments || []).map((c) => ({ kind: "comment" as const, data: c })),
        ...(results.attachments || []).map((a) => ({ kind: "attachment" as const, data: a })),
        ...(results.activities || []).map((act) => ({ kind: "activity" as const, data: act })),
      ]
    : [];

  useEffect(() => {
    if (isOpen) {
      setTimeout(() => inputRef.current?.focus(), 50);
    } else {
      const timer = setTimeout(() => {
        setQuery("");
        setResults(null);
        setError("");
        setSelectedIndex(0);
        setShowFilters(false);
        setProjectIds([]);
        setStatuses([]);
        setPriorities([]);
        setAssignees([]);
        setDateStart("");
        setDateEnd("");
      }, 0);
      return () => clearTimeout(timer);
    }
  }, [isOpen]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault();
        if (isOpen) close();
        else useSearchStore.getState().open();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [isOpen, close]);

  const runSearch = useCallback(async (q: string) => {
    const orgId = useOrgStore.getState().activeOrgId;
    if (!orgId) {
      setResults(null);
      return;
    }

    setLoading(true);
    setError("");

    const activeFilters = {
      projectIds: projectIds.length > 0 ? projectIds : undefined,
      statuses: statuses.length > 0 ? statuses : undefined,
      priorities: priorities.length > 0 ? priorities : undefined,
      assignees: assignees.length > 0 ? assignees : undefined,
      dateRange: dateStart || dateEnd ? {
        start: dateStart || undefined,
        end: dateEnd || undefined,
      } : undefined
    };

    const res = await advancedSearch(q.trim(), activeFilters, orgId);
    if (res.success && res.data) {
      setResults(res.data);
      setSelectedIndex(0);
    } else {
      setError(res.error || "Search failed");
    }

    setLoading(false);
  }, [projectIds, statuses, priorities, assignees, dateStart, dateEnd]);

  useEffect(() => {
    if (!isOpen || !orgId) return;

    if (debounceRef.current) clearTimeout(debounceRef.current);

    if (
      !query.trim() &&
      projectIds.length === 0 &&
      statuses.length === 0 &&
      priorities.length === 0 &&
      assignees.length === 0 &&
      !dateStart &&
      !dateEnd
    ) {
      Promise.resolve().then(() => {
        setResults(null);
        setLoading(false);
      });
      return;
    }

    Promise.resolve().then(() => {
      setLoading(true);
    });
    debounceRef.current = setTimeout(() => {
      runSearch(query);
    }, 300);

    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [query, projectIds, statuses, priorities, assignees, dateStart, dateEnd, isOpen, orgId, runSearch]);

  const handleQueryChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setQuery(e.target.value);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Escape") {
      close();
    } else if (e.key === "ArrowDown") {
      e.preventDefault();
      setSelectedIndex((i) => Math.min(i + 1, flatResults.length - 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setSelectedIndex((i) => Math.max(i - 1, 0));
    } else if (e.key === "Enter") {
      e.preventDefault();
      if (flatResults[selectedIndex]) {
        navigateTo(flatResults[selectedIndex]);
      }
    }
  };

  const navigateTo = (item: FlatResult) => {
    close();
    if (item.kind === "project") {
      router.push(`/projects/${item.data.id}`);
    } else if (item.kind === "task") {
      router.push(`/projects/${item.data.project_id}`);
    } else if (item.kind === "comment") {
      router.push(`/projects/${item.data.project_id}`);
    } else if (item.kind === "attachment") {
      router.push(`/projects/${item.data.project_id}`);
    }
  };

  const handleSaveSearch = async () => {
    if (!orgId || !searchName.trim()) return;
    setSaving(true);
    const activeFilters = {
      projectIds: projectIds.length > 0 ? projectIds : undefined,
      statuses: statuses.length > 0 ? statuses : undefined,
      priorities: priorities.length > 0 ? priorities : undefined,
      assignees: assignees.length > 0 ? assignees : undefined,
      dateRange: dateStart || dateEnd ? {
        start: dateStart || undefined,
        end: dateEnd || undefined,
      } : undefined
    };
    const res = await saveSearch(searchName.trim(), query, activeFilters, orgId);
    if (res.success) {
      setSearchName("");
      loadSavedSearches();
    } else {
      setError(res.error || "Failed to save search");
    }
    setSaving(false);
  };

  interface SearchFilters {
    projectIds?: string[];
    statuses?: string[];
    priorities?: string[];
    assignees?: string[];
    dateRange?: {
      start?: string;
      end?: string;
    };
  }

  const handleLoadSearch = (saved: SavedSearch) => {
    setQuery(saved.query_text || "");
    const f = (saved.filters || {}) as SearchFilters;
    setProjectIds(f.projectIds || []);
    setStatuses(f.statuses || []);
    setPriorities(f.priorities || []);
    setAssignees(f.assignees || []);
    setDateStart(f.dateRange?.start || "");
    setDateEnd(f.dateRange?.end || "");
    setShowFilters(true);
    setShowSavedList(false);
  };

  const handleDeleteSearch = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!orgId) return;
    const res = await deleteSavedSearch(id, orgId);
    if (res.success) {
      loadSavedSearches();
    }
  };

  const hasResults =
    results &&
    (results.projects.length > 0 ||
      results.tasks.length > 0 ||
      results.members.length > 0 ||
      results.comments.length > 0 ||
      results.attachments.length > 0 ||
      results.activities.length > 0);

  if (!isOpen) return null;

  let flatIdx = 0;

  return (
    <div
      className="fixed inset-0 bg-black/40 backdrop-blur-sm z-[400] flex items-start justify-center pt-20 px-4"
      onClick={close}
    >
      <div
        className="bg-white border-2 border-black rounded-sketchy shadow-flat-offset w-full max-w-xl overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center gap-3 px-4 border-b-2 border-black">
          <Search className="h-4 w-4 text-secondary shrink-0" />
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={handleQueryChange}
            onKeyDown={handleKeyDown}
            placeholder="Search projects, tasks, comments, files..."
            className="w-full py-3.5 font-sans text-sm bg-white focus:outline-none placeholder:text-secondary/40"
            autoComplete="off"
          />
          {loading ? (
            <Loader2 className="h-4 w-4 animate-spin text-tertiary shrink-0" />
          ) : query ? (
            <button
              onClick={() => {
                setQuery("");
                setResults(null);
                inputRef.current?.focus();
              }}
              className="p-1 rounded-full hover:bg-neutral-bg transition-colors"
              aria-label="Clear search"
            >
              <X className="h-3.5 w-3.5 text-secondary" />
            </button>
          ) : null}
        </div>

        <div className="flex items-center justify-between px-4 py-2 border-b border-black/10 bg-neutral-bg/20 text-xs font-sans">
          <div className="flex items-center gap-2">
            <button
              onClick={() => setShowFilters(!showFilters)}
              className={`flex items-center gap-1 px-2.5 py-1 rounded border-2 border-black font-semibold shadow-sm transition-all hover:bg-accent-yellow/20 ${
                showFilters ? "bg-accent-yellow/30" : "bg-white"
              }`}
            >
              <Filter className="h-3 w-3" />
              Advanced Filters
            </button>

            {savedSearches.length > 0 && (
              <button
                onClick={() => setShowSavedList(!showSavedList)}
                className={`flex items-center gap-1 px-2.5 py-1 rounded border-2 border-black font-semibold shadow-sm transition-all hover:bg-accent-blue/20 ${
                  showSavedList ? "bg-accent-blue/30" : "bg-white"
                }`}
              >
                <Bookmark className="h-3 w-3" />
                Saved ({savedSearches.length})
              </button>
            )}
          </div>

          {(query || projectIds.length > 0 || statuses.length > 0 || priorities.length > 0 || assignees.length > 0) && (
            <div className="flex items-center gap-1.5">
              <input
                type="text"
                value={searchName}
                onChange={(e) => setSearchName(e.target.value)}
                placeholder="Name search..."
                className="border border-black/30 rounded px-1.5 py-0.5 text-[10px] w-28 bg-white focus:outline-none"
              />
              <button
                onClick={handleSaveSearch}
                disabled={saving || !searchName.trim()}
                className="flex items-center gap-1 px-2 py-0.5 rounded border border-black bg-accent-green text-[10px] font-bold disabled:opacity-50"
              >
                <Save className="h-2.5 w-2.5" />
                Save
              </button>
            </div>
          )}
        </div>

        {showFilters && orgId && (
          <SearchFiltersPanel
            orgId={orgId}
            projectIds={projectIds}
            setProjectIds={setProjectIds}
            statuses={statuses}
            setStatuses={setStatuses}
            priorities={priorities}
            setPriorities={setPriorities}
            assignees={assignees}
            setAssignees={setAssignees}
            dateStart={dateStart}
            setDateStart={setDateStart}
            dateEnd={dateEnd}
            setDateEnd={setDateEnd}
          />
        )}

        {showSavedList && savedSearches.length > 0 && (
          <div className="p-3 border-b-2 border-black bg-accent-blue/10 max-h-40 overflow-y-auto flex flex-col gap-1.5 font-sans text-xs">
            <span className="font-bold text-secondary block mb-1">Your Saved Searches:</span>
            {savedSearches.map((saved) => (
              <div
                key={saved.id}
                onClick={() => handleLoadSearch(saved)}
                className="flex items-center justify-between px-2.5 py-1.5 border border-black/20 rounded bg-white hover:bg-neutral-bg cursor-pointer transition-colors"
              >
                <div className="flex flex-col">
                  <span className="font-semibold text-primary">{saved.name}</span>
                  {saved.query_text && (
                    <span className="text-[10px] text-secondary/60">Query: &quot;{saved.query_text}&quot;</span>
                  )}
                </div>
                <button
                  onClick={(e) => handleDeleteSearch(saved.id, e)}
                  className="p-1 hover:bg-accent-pink/20 rounded transition-colors text-accent-pink/80 hover:text-accent-pink"
                >
                  <Trash2 className="h-3 w-3" />
                </button>
              </div>
            ))}
          </div>
        )}

        <div className="max-h-[380px] overflow-y-auto">
          {error && (
            <div className="px-4 py-6 text-center">
              <p className="font-sans text-sm text-accent-pink font-semibold">{error}</p>
            </div>
          )}

          {!loading && !error && (query.trim() || projectIds.length > 0 || statuses.length > 0) && results && !hasResults && (
            <div className="px-4 py-8 text-center">
              <div className="w-12 h-12 rounded-full bg-accent-yellow border-2 border-black flex items-center justify-center mx-auto mb-3 rotate-[1.5deg] shadow-flat-offset-sm">
                <Search className="h-5 w-5 text-primary" />
              </div>
              <p className="font-cursive text-lg font-bold mb-1">No results</p>
              <p className="font-sans text-xs text-secondary/70">
                No matches found for your query and filters.
              </p>
            </div>
          )}

          {!query.trim() && !results && !projectIds.length && !statuses.length && (
            <div className="px-4 py-8 text-center">
              <p className="font-sans text-xs text-secondary/60">
                Start typing or apply filters to search across your workspace
              </p>
            </div>
          )}

          {results && results.projects && results.projects.length > 0 && (
            <div>
              <div className="px-4 py-1.5 border-b border-black/10 bg-neutral-bg/50 flex items-center gap-2">
                <FolderKanban className="h-3 w-3 text-secondary" />
                <span className="font-cursive text-sm font-bold text-secondary">Projects</span>
              </div>
              {results.projects.map((project) => {
                const itemIdx = flatIdx++;
                const isSelected = itemIdx === selectedIndex;
                return (
                  <button
                    key={project.id}
                    onClick={() => navigateTo({ kind: "project", data: project })}
                    onMouseEnter={() => setSelectedIndex(itemIdx)}
                    className={`w-full text-left flex items-center gap-3 px-4 py-2.5 border-b border-black/10 transition-all cursor-pointer ${
                      isSelected ? "bg-accent-yellow/30" : "hover:bg-neutral-bg/50"
                    }`}
                  >
                    <div className={`px-1.5 py-0.5 rounded text-[10px] font-bold font-sans ${STATUS_COLORS[project.status] || "bg-neutral-bg"}`}>
                      {project.status}
                    </div>
                    <div className="min-w-0">
                      <span className="font-sans text-sm font-semibold text-primary truncate block">
                        {project.name}
                      </span>
                      {project.description && (
                        <span className="font-sans text-xs text-secondary/60 truncate block">
                          {project.description}
                        </span>
                      )}
                    </div>
                  </button>
                );
              })}
            </div>
          )}

          {results && results.tasks && results.tasks.length > 0 && (
            <div>
              <div className="px-4 py-1.5 border-b border-black/10 bg-neutral-bg/50 flex items-center gap-2">
                <CheckSquare className="h-3 w-3 text-secondary" />
                <span className="font-cursive text-sm font-bold text-secondary">Tasks</span>
              </div>
              {results.tasks.map((task) => {
                const itemIdx = flatIdx++;
                const isSelected = itemIdx === selectedIndex;
                return (
                  <button
                    key={task.id}
                    onClick={() => navigateTo({ kind: "task", data: task })}
                    onMouseEnter={() => setSelectedIndex(itemIdx)}
                    className={`w-full text-left flex items-center gap-3 px-4 py-2.5 border-b border-black/10 transition-all cursor-pointer ${
                      isSelected ? "bg-accent-yellow/30" : "hover:bg-neutral-bg/50"
                    }`}
                  >
                    <div className={`px-1.5 py-0.5 rounded text-[10px] font-bold font-sans shrink-0 ${STATUS_COLORS[task.status] || "bg-neutral-bg"}`}>
                      {task.status.replace("_", " ")}
                    </div>
                    <span className="font-sans text-sm font-semibold text-primary truncate">
                      {task.title}
                    </span>
                  </button>
                );
              })}
            </div>
          )}

          {results && results.comments && results.comments.length > 0 && (
            <div>
              <div className="px-4 py-1.5 border-b border-black/10 bg-neutral-bg/50 flex items-center gap-2">
                <MessageSquare className="h-3 w-3 text-secondary" />
                <span className="font-cursive text-sm font-bold text-secondary">Comments</span>
              </div>
              {results.comments.map((comment) => {
                const itemIdx = flatIdx++;
                const isSelected = itemIdx === selectedIndex;
                return (
                  <button
                    key={comment.id}
                    onClick={() => navigateTo({ kind: "comment", data: comment })}
                    onMouseEnter={() => setSelectedIndex(itemIdx)}
                    className={`w-full text-left flex flex-col gap-1 px-4 py-2 border-b border-black/10 transition-all cursor-pointer ${
                      isSelected ? "bg-accent-yellow/30" : "hover:bg-neutral-bg/50"
                    }`}
                  >
                    <span className="font-sans text-[10px] text-secondary/60 truncate">
                      On Task: <span className="font-semibold text-primary">{comment.task_title}</span>
                    </span>
                    <p className="font-sans text-sm text-primary line-clamp-1 italic">
                      &quot;{comment.content}&quot;
                    </p>
                  </button>
                );
              })}
            </div>
          )}

          {results && results.attachments && results.attachments.length > 0 && (
            <div>
              <div className="px-4 py-1.5 border-b border-black/10 bg-neutral-bg/50 flex items-center gap-2">
                <Paperclip className="h-3 w-3 text-secondary" />
                <span className="font-cursive text-sm font-bold text-secondary">Files</span>
              </div>
              {results.attachments.map((file) => {
                const itemIdx = flatIdx++;
                const isSelected = itemIdx === selectedIndex;
                return (
                  <button
                    key={file.id}
                    onClick={() => navigateTo({ kind: "attachment", data: file })}
                    onMouseEnter={() => setSelectedIndex(itemIdx)}
                    className={`w-full text-left flex items-center justify-between gap-3 px-4 py-2.5 border-b border-black/10 transition-all cursor-pointer ${
                      isSelected ? "bg-accent-yellow/30" : "hover:bg-neutral-bg/50"
                    }`}
                  >
                    <div className="flex items-center gap-2 min-w-0">
                      <Paperclip className="h-3.5 w-3.5 text-secondary shrink-0" />
                      <span className="font-sans text-sm font-semibold text-primary truncate">
                        {file.file_name}
                      </span>
                    </div>
                    <span className="font-sans text-[10px] text-secondary/60 shrink-0">
                      Task: {file.task_title}
                    </span>
                  </button>
                );
              })}
            </div>
          )}

          {results && results.activities && results.activities.length > 0 && (
            <div>
              <div className="px-4 py-1.5 border-b border-black/10 bg-neutral-bg/50 flex items-center gap-2">
                <Activity className="h-3 w-3 text-secondary" />
                <span className="font-cursive text-sm font-bold text-secondary">Activity Logs</span>
              </div>
              {results.activities.map((act) => {
                const itemIdx = flatIdx++;
                const isSelected = itemIdx === selectedIndex;
                return (
                  <div
                    key={act.id}
                    onMouseEnter={() => setSelectedIndex(itemIdx)}
                    className={`w-full flex items-center gap-3 px-4 py-2.5 border-b border-black/10 transition-all ${
                      isSelected ? "bg-accent-yellow/30" : "hover:bg-neutral-bg/50"
                    }`}
                  >
                    <Activity className="h-3.5 w-3.5 text-secondary shrink-0" />
                    <div className="min-w-0 flex-1 flex flex-col">
                      <span className="font-sans text-xs font-semibold text-primary">
                        {act.action_type.replace(/_/g, " ")}
                      </span>
                      <span className="font-sans text-[10px] text-secondary/60 truncate">
                        Actor: {act.actor?.full_name || "System"} • {new Date(act.created_at).toLocaleDateString()}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {results && results.members && results.members.length > 0 && (
            <div>
              <div className="px-4 py-1.5 border-b border-black/10 bg-neutral-bg/50 flex items-center gap-2">
                <UserIcon className="h-3 w-3 text-secondary" />
                <span className="font-cursive text-sm font-bold text-secondary">Members</span>
              </div>
              {results.members.map((member) => {
                const itemIdx = flatIdx++;
                const isSelected = itemIdx === selectedIndex;
                return (
                  <div
                    key={member.user_id}
                    onMouseEnter={() => setSelectedIndex(itemIdx)}
                    className={`w-full flex items-center gap-3 px-4 py-2.5 border-b border-black/10 transition-all ${
                      isSelected ? "bg-accent-yellow/30" : "hover:bg-neutral-bg/50"
                    }`}
                  >
                    <div className="w-8 h-8 rounded-full border-2 border-black bg-neutral-bg flex items-center justify-center overflow-hidden shrink-0 shadow-sm">
                      <AvatarFallback name={member.full_name} avatarUrl={member.avatar_url} />
                    </div>
                    <div className="min-w-0 flex-1">
                      <span className="font-sans text-sm font-semibold text-primary truncate block">
                        {member.full_name || "Unknown Member"}
                      </span>
                    </div>
                    <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold font-sans border border-black/25 ${ROLE_COLORS[member.role] || "bg-neutral-bg"}`}>
                      {member.role}
                    </span>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        <div className="px-4 py-2 border-t border-black/10 bg-neutral-bg/50 flex items-center gap-4">
          <span className="font-sans text-[10px] text-secondary/60">
            <kbd className="px-1 py-0.5 border border-black/20 rounded text-[9px] font-sans font-bold bg-white">↑↓</kbd>{" "}
            navigate
          </span>
          <span className="font-sans text-[10px] text-secondary/60">
            <kbd className="px-1 py-0.5 border border-black/20 rounded text-[9px] font-sans font-bold bg-white">↵</kbd>{" "}
            open
          </span>
          <span className="font-sans text-[10px] text-secondary/60">
            <kbd className="px-1 py-0.5 border border-black/20 rounded text-[9px] font-sans font-bold bg-white">Esc</kbd>{" "}
            close
          </span>
        </div>
      </div>
    </div>
  );
}
