import React from "react";

export default function ProjectsLoading() {
  return (
    <div className="min-h-screen w-full bg-neutral-bg bg-dot-grid text-primary flex">
      {/* Sidebar Placeholder - keeps layout alignment */}
      <div className="hidden md:block w-64 bg-white border-r-2 border-black h-screen sticky top-0" />

      <div className="flex-grow flex flex-col min-h-screen overflow-x-hidden">
        {/* Navbar Placeholder */}
        <div className="w-full bg-white border-b-2 border-black h-16 sticky top-0 z-50" />

        {/* Main Body */}
        <div className="flex-1 max-w-6xl w-full mx-auto p-6 md:p-12 flex flex-col gap-8">
          {/* Header Skeleton */}
          <div className="bg-white border-2 border-black rounded-sketchy shadow-flat-offset p-6 flex flex-col md:flex-row md:items-center justify-between gap-4 animate-pulse">
            <div className="flex flex-col gap-2">
              <div className="h-8 bg-neutral-dot border border-black/10 rounded w-48" />
              <div className="h-4 bg-neutral-dot border border-black/10 rounded w-96" />
            </div>
            <div className="w-32 h-10 bg-neutral-dot border-2 border-black rounded-full" />
          </div>

          {/* Member/Projects Count Skeleton */}
          <div className="flex items-center gap-3 animate-pulse">
            <div className="w-24 h-8 bg-neutral-dot border-2 border-black rounded-full" />
          </div>

          {/* Projects Grid Skeleton */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {Array.from({ length: 6 }).map((_, i) => (
              <div
                key={i}
                className="bg-white border-2 border-black rounded-sketchy p-5 shadow-flat-offset-sm flex flex-col gap-4 animate-pulse"
              >
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <div className="w-4 h-4 bg-neutral-dot border border-black/10 rounded-full" />
                    <div className="h-6 bg-neutral-dot border border-black/10 rounded w-28" />
                  </div>
                  <div className="w-16 h-4 bg-neutral-dot border border-black/10 rounded-full" />
                </div>
                <div className="flex flex-col gap-2 my-2">
                  <div className="h-3 bg-neutral-dot border border-black/10 rounded w-full" />
                  <div className="h-3 bg-neutral-dot border border-black/10 rounded w-5/6" />
                  <div className="h-3 bg-neutral-dot border border-black/10 rounded w-2/3" />
                </div>
                <div className="border-t border-black/10 my-1" />
                <div className="flex items-center justify-between mt-auto">
                  <div className="w-20 h-3 bg-neutral-dot border border-black/10 rounded" />
                  <div className="w-16 h-3 bg-neutral-dot border border-black/10 rounded" />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
