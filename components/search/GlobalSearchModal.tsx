"use client";

import React, { useState, useEffect, useRef, useCallback } from "react";
import { useRouter } from "next/navigation";
import { Search, X, Loader2, FolderKanban, CheckSquare, User as UserIcon } from "lucide-react";
import { globalSearch } from "@/actions/search";
import { useSearchStore } from "@/store/searchStore";
import type { SearchResult, SearchResultProject, SearchResultTask, SearchResultMember } from "@/types";

function getActiveOrgId(): string | null {
  if (typeof document === "undefined") return null;
  const cookies = document.cookie.split(";");
  for (const cookie of cookies) {
    const [name, val] = cookie.trim().split("=");
    if (name === "active_org_id") return decodeURIComponent(val);
  }
  return null;
}

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
  PLANNING: "bg-accent-yellow border border-black/30",
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
  | { kind: "member"; data: SearchResultMember };

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

  // Flatten results for keyboard navigation
  const flatResults: FlatResult[] = results
    ? [
        ...(results.projects.map((p) => ({ kind: "project" as const, data: p }))),
        ...(results.tasks.map((t) => ({ kind: "task" as const, data: t }))),
        ...(results.members.map((m) => ({ kind: "member" as const, data: m }))),
      ]
    : [];

  // Focus input when modal opens
  useEffect(() => {
    if (isOpen) {
      setTimeout(() => inputRef.current?.focus(), 50);
    } else {
      setQuery("");
      setResults(null);
      setError("");
      setSelectedIndex(0);
    }
  }, [isOpen]);

  // Keyboard shortcut: Cmd/Ctrl+K to open
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
    const orgId = getActiveOrgId();
    if (!orgId || !q.trim()) {
      setResults(null);
      return;
    }

    setLoading(true);
    setError("");

    const res = await globalSearch(q.trim(), orgId);
    if (res.success && res.data) {
      setResults(res.data);
      setSelectedIndex(0);
    } else {
      setError(res.error || "Search failed");
    }

    setLoading(false);
  }, []);

  // Debounce input at 300ms
  const handleQueryChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setQuery(val);

    if (debounceRef.current) clearTimeout(debounceRef.current);

    if (!val.trim()) {
      setResults(null);
      setLoading(false);
      return;
    }

    setLoading(true);
    debounceRef.current = setTimeout(() => {
      runSearch(val);
    }, 300);
  };

  // Keyboard navigation within results
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
    }
    // Members: no dedicated profile page in V2 — no navigation
  };

  const hasResults =
    results &&
    (results.projects.length > 0 || results.tasks.length > 0 || results.members.length > 0);

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
        {/* Search Input */}
        <div className="flex items-center gap-3 px-4 border-b-2 border-black">
          <Search className="h-4 w-4 text-secondary shrink-0" />
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={handleQueryChange}
            onKeyDown={handleKeyDown}
            placeholder="Search projects, tasks, or members..."
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

        {/* Results panel */}
        <div className="max-h-[420px] overflow-y-auto">
          {/* Error state */}
          {error && (
            <div className="px-4 py-6 text-center">
              <p className="font-sans text-sm text-accent-pink font-semibold">{error}</p>
            </div>
          )}

          {/* Empty state — query with no results */}
          {!loading && !error && query.trim() && results && !hasResults && (
            <div className="px-4 py-8 text-center">
              <div className="w-12 h-12 rounded-full bg-accent-yellow border-2 border-black flex items-center justify-center mx-auto mb-3 rotate-[1.5deg] shadow-flat-offset-sm">
                <Search className="h-5 w-5 text-primary" />
              </div>
              <p className="font-cursive text-lg font-bold mb-1">No results</p>
              <p className="font-sans text-xs text-secondary/70">
                No matches for <span className="font-semibold">&quot;{query}&quot;</span>
              </p>
            </div>
          )}

          {/* Initial empty state */}
          {!query.trim() && !results && (
            <div className="px-4 py-8 text-center">
              <p className="font-sans text-xs text-secondary/60">
                Start typing to search across your workspace
              </p>
            </div>
          )}

          {/* Projects section */}
          {results && results.projects.length > 0 && (
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

          {/* Tasks section */}
          {results && results.tasks.length > 0 && (
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

          {/* Members section */}
          {results && results.members.length > 0 && (
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
                    <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold font-sans border border-black/20 ${ROLE_COLORS[member.role] || "bg-neutral-bg"}`}>
                      {member.role}
                    </span>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Footer hint */}
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
