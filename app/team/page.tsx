"use client";

import React, { useState, useEffect, useCallback } from "react";
import { Loader2, Users } from "lucide-react";

import { Navbar } from "@/components/layout/Navbar";
import { Sidebar } from "@/components/layout/Sidebar";
import { TeamDirectory } from "@/components/team/TeamDirectory";
import { getTeamDirectory } from "@/actions/team";
import type { TeamMember } from "@/types";

import { useOrgStore } from "@/store/orgStore";

export default function TeamPage() {
  const { activeOrgId } = useOrgStore();
  const [members, setMembers] = useState<TeamMember[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const loadTeam = useCallback(async () => {
    if (!activeOrgId) {
      setLoading(false);
      return;
    }

    setLoading(true);
    setError("");

    const result = await getTeamDirectory(activeOrgId);
    if (result.success && result.data) {
      setMembers(result.data);
    } else {
      setError(result.error || "Failed to load team directory.");
    }
    setLoading(false);
  }, [activeOrgId]);

  useEffect(() => {
    const timer = setTimeout(() => {
      loadTeam();
    }, 0);
    return () => clearTimeout(timer);
  }, [loadTeam]);





  return (
    <div className="min-h-screen w-full bg-neutral-bg bg-dot-grid text-primary flex">
      {/* Sidebar - Desktop only */}
      <div className="hidden md:block">
        <Sidebar />
      </div>

      <div className="flex-grow flex flex-col min-h-screen overflow-x-hidden">
        {/* Navbar */}
        <Navbar />

        {/* Main Body */}
        <div className="flex-1 max-w-6xl w-full mx-auto p-6 md:p-12 flex flex-col gap-8">
          {/* Page header */}
          <div>
            <h1 className="font-cursive text-4xl font-bold mb-2 flex items-center gap-2">
              <Users className="h-8 w-8 text-tertiary" />
              Team Directory
            </h1>
            <p className="font-sans text-sm text-secondary">
              All members of this workspace and their current workloads.
            </p>
          </div>

          {/* No workspace selected */}
          {!activeOrgId ? (
            <div className="bg-white border-2 border-black rounded-sketchy shadow-flat-offset p-8 md:p-12 text-center max-w-lg mx-auto">
              <div className="w-16 h-16 rounded-full bg-accent-yellow border-2 border-black flex items-center justify-center mx-auto mb-4 rotate-[1.5deg] shadow-flat-offset-sm">
                <Users className="h-8 w-8 text-primary" />
              </div>
              <h3 className="font-cursive text-2xl font-bold mb-2">No Workspace Selected</h3>
              <p className="font-sans text-sm text-secondary mb-6 leading-relaxed">
                Please create or select an organization workspace to view the team directory.
              </p>
            </div>
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
      </div>
    </div>
  );
}
