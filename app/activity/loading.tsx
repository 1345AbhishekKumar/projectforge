import React from "react";

export default function ActivityLoading() {
  return (
    <div className="min-h-screen w-full bg-neutral-bg bg-dot-grid text-primary flex">
      {/* Sidebar Placeholder */}
      <div className="hidden md:block w-64 bg-white border-r-2 border-black h-screen sticky top-0" />

      <div className="flex-grow flex flex-col min-h-screen overflow-x-hidden">
        {/* Navbar Placeholder */}
        <div className="w-full bg-white border-b-2 border-black h-16 sticky top-0 z-50" />

        {/* Main Body */}
        <div className="flex-1 max-w-4xl w-full mx-auto p-6 md:p-12 flex flex-col gap-8">
          {/* Header Skeleton */}
          <div className="animate-pulse flex flex-col gap-2">
            <div className="h-8 bg-neutral-dot border border-black/10 rounded w-48" />
            <div className="h-4 bg-neutral-dot border border-black/10 rounded w-96" />
          </div>

          {/* Activity Feed Skeleton */}
          <div className="flex flex-col gap-4">
            {Array.from({ length: 6 }).map((_, i) => (
              <div
                key={i}
                className="bg-white border-2 border-black rounded-sketchy-sm p-4 shadow-flat-offset-sm flex items-start gap-4 animate-pulse"
              >
                {/* User avatar / icon placeholder */}
                <div className="w-9 h-9 rounded-full bg-neutral-dot border-2 border-black flex-shrink-0" />

                {/* Details */}
                <div className="flex-grow flex flex-col gap-2.5">
                  <div className="flex items-center gap-2">
                    <div className="h-4 bg-neutral-dot border border-black/10 rounded w-32" />
                    <div className="h-3.5 bg-neutral-dot border border-black/10 rounded w-20" />
                  </div>
                  <div className="h-3 bg-neutral-dot border border-black/10 rounded w-2/3" />
                  <div className="h-2.5 bg-neutral-dot border border-black/10 rounded w-16" />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
