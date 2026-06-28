"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

export default function CapacityPlannerPage() {
  const router = useRouter();

  useEffect(() => {
    router.replace("/team?tab=capacity");
  }, [router]);

  return (
    <div className="min-h-screen w-full flex items-center justify-center bg-neutral-bg bg-dot-grid text-primary">
      <span className="font-cursive text-xl animate-pulse">Redirecting to Team Workspace...</span>
    </div>
  );
}
