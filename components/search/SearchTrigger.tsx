"use client";

import React, { useEffect } from "react";
import { Search } from "lucide-react";
import { useSearchStore } from "@/store/searchStore";

export function SearchTrigger() {
  const { open, toggle } = useSearchStore();

  // Register Cmd/Ctrl+K shortcut
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault();
        toggle();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [toggle]);

  return (
    <button
      onClick={open}
      className="w-full text-left flex items-center gap-3 px-4 py-2.5 border-2 border-black bg-white hover:bg-neutral-bg hover:rotate-[0.5deg] hover:-translate-y-0.5 font-sans text-sm font-bold shadow-flat-offset-sm transition-all duration-200 cursor-pointer"
      aria-label="Open global search (Cmd+K)"
    >
      <Search className="h-4 w-4 shrink-0" />
      <span className="flex-1 truncate text-secondary/70 font-normal">Search...</span>
      <kbd className="hidden lg:inline-flex items-center gap-0.5 px-1.5 py-0.5 border border-black/20 rounded text-[9px] font-sans font-bold bg-neutral-bg text-secondary/60">
        ⌘K
      </kbd>
    </button>
  );
}
