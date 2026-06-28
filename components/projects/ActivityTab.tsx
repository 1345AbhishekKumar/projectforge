"use client";

import React from "react";
import { Loader2 } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { getProjectActivities, type ActivityWithActor } from "@/actions/activity";
import { ActivityFeed } from "@/components/activities/ActivityFeed";

interface ActivityTabProps {
  projectId: string;
  orgId: string;
}

export function ActivityTab({ projectId, orgId }: ActivityTabProps) {
  const { data: activities = [], isLoading } = useQuery<ActivityWithActor[]>({
    queryKey: ["activities", projectId, orgId],
    queryFn: async () => {
      const result = await getProjectActivities(projectId, orgId, 1, 20);
      if (!result.success) throw new Error(result.error || "Failed to load activities");
      return result.data ?? [];
    },
    enabled: !!projectId && !!orgId,
  });

  if (isLoading) {
    return (
      <div className="bg-white border-2 border-black rounded-sketchy shadow-flat-offset p-12 flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-tertiary mr-3" />
        <span className="font-cursive text-xl">Loading activity feed...</span>
      </div>
    );
  }

  return (
    <ActivityFeed
      projectId={projectId}
      orgId={orgId}
      initialActivities={activities}
    />
  );
}
