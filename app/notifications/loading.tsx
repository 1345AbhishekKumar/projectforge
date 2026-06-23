import React from "react";

export default function NotificationsLoading() {
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

          {/* Filters Box Placeholder */}
          <div className="bg-white border-2 border-black rounded-sketchy shadow-flat-offset p-4 flex flex-col gap-2 animate-pulse">
            <div className="h-4 bg-neutral-dot border border-black/10 rounded w-24" />
            <div className="flex flex-wrap gap-2 mt-2">
              <div className="w-20 h-8 bg-neutral-dot border border-black/10 rounded-full" />
              <div className="w-24 h-8 bg-neutral-dot border border-black/10 rounded-full" />
              <div className="w-20 h-8 bg-neutral-dot border border-black/10 rounded-full" />
            </div>
          </div>

          {/* Notifications List Skeleton */}
          <div className="flex flex-col gap-4">
            {Array.from({ length: 6 }).map((_, i) => (
              <div
                key={i}
                className="bg-white border-2 border-black rounded-sketchy-sm p-4 shadow-flat-offset-sm flex items-start gap-4 animate-pulse"
              >
                {/* Notification icon placeholder */}
                <div className="w-8 h-8 rounded-full bg-neutral-dot border-2 border-black flex-shrink-0" />

                {/* Details */}
                <div className="flex-grow flex flex-col gap-2">
                  <div className="h-4 bg-neutral-dot border border-black/10 rounded w-full" />
                  <div className="h-3 bg-neutral-dot border border-black/10 rounded w-1/3" />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
