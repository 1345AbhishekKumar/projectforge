"use client";

import React, { useState, useEffect, useCallback } from "react";
import { Loader2, BarChart2 } from "lucide-react";

import { WorkspacePageLayout } from "@/components/layout/WorkspacePageLayout";
import { NoWorkspacePlaceholder } from "@/components/layout/NoWorkspacePlaceholder";
import { getAnalyticsData, type AnalyticsData } from "@/actions/analytics";
import { StatsGrid } from "@/components/analytics/StatsGrid";
import { WorkloadBreakdown } from "@/components/analytics/WorkloadBreakdown";
import { CompletionTrend } from "@/components/analytics/CompletionTrend";

import { useOrgStore } from "@/store/orgStore";

export default function AnalyticsPage() {
  const { activeOrgId } = useOrgStore();
  const [analytics, setAnalytics] = useState<AnalyticsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

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





  return (
    <WorkspacePageLayout>
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
          <NoWorkspacePlaceholder
            icon={
              <div className="w-16 h-16 rounded-full bg-accent-yellow border-2 border-black flex items-center justify-center mx-auto mb-4 rotate-[1.5deg] shadow-flat-offset-sm">
                <BarChart2 className="h-8 w-8 text-primary" />
              </div>
            }
            title="No Workspace Selected"
            description="Please create or select an organization workspace in the switcher dropdown to view analytics."
          />
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
    </WorkspacePageLayout>
  );
}
