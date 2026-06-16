"use client";

import React, { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { useUser, useAuth } from "@clerk/nextjs";
import { LogOut, User as UserIcon, Loader2, BarChart2 } from "lucide-react";

import { OrgSwitcher } from "@/components/orgs/OrgSwitcher";
import { NotificationBell } from "@/components/notifications/NotificationBell";
import { Sidebar } from "@/components/layout/Sidebar";
import { getAnalyticsData, type AnalyticsData } from "@/actions/analytics";
import { StatsGrid } from "@/components/analytics/StatsGrid";
import { WorkloadBreakdown } from "@/components/analytics/WorkloadBreakdown";
import { CompletionTrend } from "@/components/analytics/CompletionTrend";

function getActiveOrgId(): string | null {
  if (typeof document === "undefined") return null;
  const cookies = document.cookie.split(";");
  for (const cookie of cookies) {
    const [name, val] = cookie.trim().split("=");
    if (name === "active_org_id") return val;
  }
  return null;
}

export default function AnalyticsPage() {
  const router = useRouter();
  const { user, isLoaded } = useUser();
  const { signOut } = useAuth();

  const initialOrgId = getActiveOrgId();
  const [activeOrgId, setActiveOrgId] = useState<string | null>(initialOrgId);
  const [analytics, setAnalytics] = useState<AnalyticsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const handleSignOut = async () => {
    await signOut();
    router.push("/sign-in");
  };

  // Fetch analytics data
  const loadAnalytics = useCallback(async () => {
    if (!activeOrgId) {
      setLoading(false);
      return;
    }

    setLoading(true);
    setError("");

    const result = await getAnalyticsData(activeOrgId);
    if (result.success && result.data) {
      setAnalytics(result.data);
    } else {
      setError(result.error || "Failed to retrieve analytics metrics.");
    }
    setLoading(false);
  }, [activeOrgId]);

  // Load on mount and active workspace change
  useEffect(() => {
    const timer = setTimeout(() => {
      loadAnalytics();
    }, 0);
    return () => clearTimeout(timer);
  }, [loadAnalytics]);

  // Handle workspace switcher updates
  const handleRefreshState = useCallback(() => {
    const orgId = getActiveOrgId();
    if (orgId !== activeOrgId) {
      setActiveOrgId(orgId);
    }
  }, [activeOrgId]);

  // Listen for cookie updates from switcher
  useEffect(() => {
    const interval = setInterval(handleRefreshState, 1000);
    return () => clearInterval(interval);
  }, [handleRefreshState]);

  if (!isLoaded) {
    return (
      <div className="min-h-screen w-full flex items-center justify-center bg-neutral-bg bg-dot-grid text-primary">
        <span className="font-cursive text-xl animate-pulse">Loading analytics...</span>
      </div>
    );
  }

  return (
    <div className="min-h-screen w-full bg-neutral-bg bg-dot-grid text-primary flex">
      {/* Sidebar - Desktop only */}
      <div className="hidden md:block">
        <Sidebar />
      </div>

      <div className="flex-grow flex flex-col min-h-screen overflow-x-hidden">
        {/* Navbar */}
        <header className="w-full bg-white border-b-2 border-black px-6 py-3 flex items-center justify-between sticky top-0 z-50">
          <div className="flex items-center gap-4">
            {/* Brand Logo - Mobile only */}
            <div className="flex md:hidden items-center gap-2">
              <div className="w-8 h-8 rounded-full bg-tertiary border-2 border-primary flex items-center justify-center font-cursive text-white text-lg font-bold shadow-flat-offset-sm">
                P
              </div>
              <span className="font-cursive text-2xl font-bold tracking-tight">ProjectForge</span>
            </div>

            {/* Org Switcher - Mobile only */}
            <div className="md:hidden">
              <OrgSwitcher />
            </div>
          </div>

          <div className="flex items-center gap-4">
            <NotificationBell />

            <div className="hidden sm:flex items-center gap-2 border-2 border-black rounded-full px-3 py-1 bg-neutral-bg">
              <UserIcon className="h-4 w-4 text-secondary" />
              <span className="font-sans text-xs font-semibold text-secondary">
                {user?.primaryEmailAddress?.emailAddress}
              </span>
            </div>

            <button
              onClick={handleSignOut}
              className="flex items-center gap-2 bg-accent-pink hover:bg-[#FFB2B2] text-primary border-2 border-black font-sans text-xs font-bold px-4 py-2 rounded-full shadow-flat-offset-sm active:translate-y-0.5 hover:-translate-y-0.5 transition-all cursor-pointer"
            >
              <LogOut className="h-3.5 w-3.5" />
              Sign Out
            </button>
          </div>
        </header>

        {/* Mobile Org Switcher */}
        <div className="md:hidden px-6 pt-4">
          <OrgSwitcher />
        </div>

        {/* Main Details Body */}
        <div className="flex-1 max-w-6xl w-full mx-auto p-6 md:p-12 flex flex-col gap-8">
          <div>
            <h1 className="font-cursive text-4xl font-bold mb-2 flex items-center gap-2">
              <BarChart2 className="h-8 w-8 text-tertiary" /> Workspace Analytics
            </h1>
            <p className="font-sans text-sm text-secondary">
              Real-time snapshot of organizational boards, execution progress, and team workloads.
            </p>
          </div>

          {!activeOrgId ? (
            <div className="bg-white border-2 border-black rounded-sketchy shadow-flat-offset p-8 md:p-12 text-center max-w-lg mx-auto">
              <div className="w-16 h-16 rounded-full bg-accent-yellow border-2 border-black flex items-center justify-center mx-auto mb-4 rotate-[1.5deg] shadow-flat-offset-sm">
                <BarChart2 className="h-8 w-8 text-primary" />
              </div>
              <h3 className="font-cursive text-2xl font-bold mb-2">No Workspace Selected</h3>
              <p className="font-sans text-sm text-secondary mb-6 leading-relaxed">
                Please create or select an organization workspace in the switcher dropdown to view analytics.
              </p>
            </div>
          ) : loading ? (
            <div className="bg-white border-2 border-black rounded-sketchy shadow-flat-offset p-12 flex items-center justify-center">
              <Loader2 className="h-8 w-8 animate-spin text-tertiary mr-3" />
              <span className="font-cursive text-xl">Loading metrics...</span>
            </div>
          ) : error || !analytics ? (
            <div className="bg-accent-pink border-2 border-black rounded-sketchy shadow-flat-offset p-8 text-center max-w-lg mx-auto">
              <h2 className="font-cursive text-2xl font-bold mb-2">Access Restrained</h2>
              <p className="font-sans text-sm text-secondary mb-6">{error}</p>
            </div>
          ) : (
            <div className="flex flex-col gap-8">
              {/* Core metrics grid */}
              <StatsGrid
                totalProjects={analytics.totalProjects}
                activeProjects={analytics.activeProjects}
                completedProjects={analytics.completedProjects}
                totalTasks={analytics.totalTasks}
                completedTasks={analytics.completedTasks}
                overdueTasks={analytics.overdueTasks}
                totalMembers={analytics.totalMembers}
              />

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-start">
                {/* Custom SVG Trend Chart */}
                <CompletionTrend trend={analytics.trend} />

                {/* Workload Breakdown Segment */}
                <WorkloadBreakdown workload={analytics.workload} />
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
