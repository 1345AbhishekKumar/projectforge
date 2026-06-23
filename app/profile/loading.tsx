import React from "react";

export default function ProfileLoading() {
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

          {/* Profile Form Card Wrapper Skeleton */}
          <div className="bg-white border-2 border-black rounded-sketchy shadow-flat-offset p-6 md:p-8 max-w-2xl w-full mx-auto relative rotate-[-0.5deg] animate-pulse flex flex-col gap-6">
            <div className="flex items-center gap-4">
              <div className="w-20 h-20 bg-neutral-dot border-2 border-black rounded-full" />
              <div className="flex flex-col gap-2">
                <div className="h-5 bg-neutral-dot border border-black/10 rounded w-32" />
                <div className="h-3 bg-neutral-dot border border-black/10 rounded w-48" />
              </div>
            </div>

            <div className="border-t border-black/10 my-2" />

            <div className="flex flex-col gap-4">
              <div className="flex flex-col gap-2">
                <div className="h-3.5 bg-neutral-dot border border-black/10 rounded w-24" />
                <div className="h-10 bg-neutral-dot border-2 border-black rounded-sketchy-sm w-full" />
              </div>

              <div className="flex flex-col gap-2">
                <div className="h-3.5 bg-neutral-dot border border-black/10 rounded w-24" />
                <div className="h-10 bg-neutral-dot border-2 border-black rounded-sketchy-sm w-full" />
              </div>

              <div className="flex flex-col gap-2">
                <div className="h-3.5 bg-neutral-dot border border-black/10 rounded w-32" />
                <div className="h-10 bg-neutral-dot border-2 border-black rounded-sketchy-sm w-full" />
              </div>

              <div className="h-12 bg-neutral-dot border-2 border-black rounded-full w-full mt-4" />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
