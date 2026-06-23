"use client";

import React from "react";
import { Loader2, Users } from "lucide-react";
import { useQuery } from "@tanstack/react-query";

import { WorkspacePageLayout } from "@/components/layout/WorkspacePageLayout";
import { NoWorkspacePlaceholder } from "@/components/layout/NoWorkspacePlaceholder";
import { HeaderBar } from "@/components/layout/HeaderBar";
import { TeamDirectory } from "@/components/team/TeamDirectory";
import { getTeamDirectory } from "@/actions/team";
import type { TeamMember } from "@/types";

import { useOrgStore } from "@/store/orgStore";

export default function TeamPage() {
  const { activeOrgId } = useOrgStore();

  const { data: members = [], isLoading: loading, error: queryError } = useQuery<TeamMember[]>({
    queryKey: ["teamDirectory", activeOrgId],
    queryFn: async () => {
      if (!activeOrgId) return [];
      const result = await getTeamDirectory(activeOrgId);
      if (!result.success) {
        throw new Error(result.error || "Failed to load team directory.");
      }
      return result.data || [];
    },
    enabled: !!activeOrgId,
  });

  const error = queryError instanceof Error ? queryError.message : "";

  return (
    <WorkspacePageLayout>
      <div className="flex-1 max-w-6xl w-full mx-auto p-6 md:p-12 flex flex-col gap-8">
        <HeaderBar
          title="Team Directory"
          description="All members of this workspace and their current workloads."
          icon={<Users className="h-8 w-8 text-tertiary" />}
        />

        {/* No workspace selected */}
        {!activeOrgId ? (
          <NoWorkspacePlaceholder
            title="No Workspace Selected"
            description="Please create or select an organization workspace to view the team directory."
            icon={
              <div className="w-16 h-16 rounded-full bg-accent-yellow border-2 border-black flex items-center justify-center mx-auto mb-4 rotate-[1.5deg] shadow-flat-offset-sm">
                <Users className="h-8 w-8 text-primary" />
              </div>
            }
          />
        ) : loading ? (
          <div className="bg-white border-2 border-black rounded-sketchy shadow-flat-offset p-12 flex items-center justify-center">
            <Loader2 className="h-8 w-8 animate-spin text-tertiary mr-3" />
            <span className="font-cursive text-xl">Loading team...</span>
          </div>
        ) : error ? (
          <div className="bg-accent-pink border-2 border-black rounded-sketchy shadow-flat-offset p-8 text-center max-w-lg mx-auto">
            <h2 className="font-cursive text-2xl font-bold mb-2">Something went wrong</h2>
            <p className="font-sans text-sm text-secondary">{error}</p>
          </div>
        ) : (
          <>
            {/* Member count badge */}
            <div className="flex items-center gap-3">
              <span className="bg-accent-blue border-2 border-black rounded-full px-4 py-1.5 font-sans text-xs font-bold shadow-flat-offset-sm">
                {members.length} {members.length === 1 ? "Member" : "Members"}
              </span>
            </div>
            <TeamDirectory members={members} />
          </>
        )}
      </div>
    </WorkspacePageLayout>
  );
}
