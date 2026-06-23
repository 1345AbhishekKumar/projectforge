import React from "react";

export default function TimeLoading() {
  return (
    <div className="min-h-screen w-full bg-neutral-bg bg-dot-grid text-primary flex">
      {/* Sidebar Placeholder */}
      <div className="hidden md:block w-64 bg-white border-r-2 border-black h-screen sticky top-0" />

      <div className="flex-grow flex flex-col min-h-screen overflow-x-hidden">
        {/* Navbar Placeholder */}
        <div className="w-full bg-white border-b-2 border-black h-16 sticky top-0 z-50" />

        {/* Main Body */}
        <div className="flex-1 max-w-6xl w-full mx-auto p-6 md:p-12 flex flex-col gap-8">
          {/* Header Skeleton */}
          <div className="animate-pulse flex flex-col gap-2">
            <div className="h-8 bg-neutral-dot border border-black/10 rounded w-48" />
            <div className="h-4 bg-neutral-dot border border-black/10 rounded w-96" />
          </div>

          {/* Active Timer Box Skeleton */}
          <div className="bg-white border-2 border-black rounded-sketchy shadow-flat-offset p-6 flex flex-col md:flex-row items-center justify-between gap-4 animate-pulse">
            <div className="flex items-center gap-4 w-full md:w-auto">
              <div className="w-12 h-12 bg-neutral-dot border border-black/10 rounded-full" />
              <div className="flex flex-col gap-2 flex-grow">
                <div className="h-4 bg-neutral-dot border border-black/10 rounded w-32" />
                <div className="h-3 bg-neutral-dot border border-black/10 rounded w-48" />
              </div>
            </div>
            <div className="flex items-center gap-3 w-full md:w-auto justify-end">
              <div className="w-24 h-10 bg-neutral-dot border-2 border-black rounded-full" />
              <div className="w-28 h-10 bg-neutral-dot border-2 border-black rounded-full" />
            </div>
          </div>

          {/* Split Content (Manual log + History) */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* Left Form Skeleton */}
            <div className="bg-white border-2 border-black rounded-sketchy p-6 shadow-flat-offset-sm flex flex-col gap-4 animate-pulse">
              <div className="h-6 bg-neutral-dot border border-black/10 rounded w-32" />
              <div className="h-10 bg-neutral-dot border-2 border-black rounded-sketchy-sm w-full" />
              <div className="grid grid-cols-2 gap-4">
                <div className="h-10 bg-neutral-dot border-2 border-black rounded-sketchy-sm w-full" />
                <div className="h-10 bg-neutral-dot border-2 border-black rounded-sketchy-sm w-full" />
              </div>
              <div className="h-16 bg-neutral-dot border-2 border-black rounded-sketchy-sm w-full" />
              <div className="h-10 bg-neutral-dot border-2 border-black rounded-full w-full mt-2" />
            </div>

            {/* Right List Skeleton */}
            <div className="lg:col-span-2 bg-white border-2 border-black rounded-sketchy p-6 shadow-flat-offset flex flex-col gap-4 animate-pulse">
              <div className="flex items-center justify-between border-b border-black/10 pb-3">
                <div className="h-6 bg-neutral-dot border border-black/10 rounded w-36" />
                <div className="h-6 bg-neutral-dot border border-black/10 rounded w-24" />
              </div>
              <div className="flex flex-col gap-3">
                {Array.from({ length: 4 }).map((_, i) => (
                  <div
                    key={i}
                    className="flex items-center justify-between p-3 border-2 border-black rounded-sketchy bg-white/50"
                  >
                    <div className="flex flex-col gap-2">
                      <div className="h-4 bg-neutral-dot border border-black/10 rounded w-48" />
                      <div className="h-3 bg-neutral-dot border border-black/10 rounded w-32" />
                    </div>
                    <div className="flex items-center gap-3">
                      <div className="w-16 h-4 bg-neutral-dot border border-black/10 rounded" />
                      <div className="w-6 h-6 bg-neutral-dot border border-black/10 rounded" />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
