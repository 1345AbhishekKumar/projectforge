"use client";

import React, { useEffect, useState, useCallback } from "react";
import Image from "next/image";
import { useOrgStore } from "@/store/orgStore";
import { getReportingData, exportReportCSV } from "@/actions/report";
import { Loader2, Download, ShieldAlert, Award, Compass, TrendingUp, BarChart2 } from "lucide-react";

interface ReportingData {
  productivity: {
    name: string;
    completedCount: number;
  }[];
  projectHealth: {
    projectId: string;
    name: string;
    score: number;
    status: string;
    riskFactors: string[];
  }[];
  sprintVelocity: {
    sprintId: string;
    name: string;
    completedCount: number;
  }[];
  taskCompletionRate: {
    createdCount: number;
    completedCount: number;
    rate: number;
  };
  workload: {
    userId: string;
    name: string;
    avatarUrl: string | null;
    totalTasks: number;
    overdueTasks: number;
    totalEstimatedHours: number;
    capacityUtilization: number;
  }[];
}

export default function ReportsPage() {
  const orgId = useOrgStore((s) => s.activeOrgId);
  const [mounted, setMounted] = useState(false);
  const [activeTab, setActiveTab] = useState<"productivity" | "health" | "velocity" | "completion" | "workload">("productivity");
  const [data, setData] = useState<ReportingData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  
  // Time range selection
  const [timeRange, setTimeRange] = useState<"7" | "30" | "all">("30");

  useEffect(() => {
    const timer = setTimeout(() => {
      setMounted(true);
    }, 0);
    return () => clearTimeout(timer);
  }, []);

  const loadData = useCallback(async () => {
    if (!orgId) return;
    setLoading(true);
    setError("");
    
    let startDate: string | undefined;
    const now = new Date();
    if (timeRange === "7") {
      startDate = new Date(now.setDate(now.getDate() - 7)).toISOString();
    } else if (timeRange === "30") {
      startDate = new Date(now.setDate(now.getDate() - 30)).toISOString();
    }

    const res = await getReportingData(orgId, startDate);
    if (res.success && res.data) {
      setData(res.data as unknown as ReportingData);
    } else {
      setError(res.error || "Failed to load reports");
    }
    setLoading(false);
  }, [orgId, timeRange]);

  useEffect(() => {
    let active = true;
    Promise.resolve().then(() => {
      if (active) {
        loadData();
      }
    });
    return () => {
      active = false;
    };
  }, [loadData]);

  const handleExport = async () => {
    if (!orgId) return;
    const res = await exportReportCSV(orgId);
    if (res.success && res.data) {
      const blob = new Blob([res.data], { type: "text/csv;charset=utf-8;" });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.setAttribute("href", url);
      link.setAttribute("download", `ProjectForge_Report_${new Date().toISOString().slice(0, 10)}.csv`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    }
  };

  if (!mounted) {
    return (
      <div className="p-6 max-w-6xl mx-auto font-sans bg-neutral-bg/10 min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-tertiary" />
      </div>
    );
  }

  if (!orgId) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px] font-cursive p-6">
        <div className="text-center p-8 border-2 border-black border-dashed rounded-sketchy bg-white max-w-sm shadow-flat-offset-sm">
          <p className="text-xl font-bold">Please select an organization to view reports</p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 max-w-6xl mx-auto font-sans bg-neutral-bg/10 min-h-screen">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
        <div>
          <h1 className="text-3xl font-bold font-cursive">Reports &amp; Analytics</h1>
          <p className="text-secondary/70 text-xs">Visualize team productivity, capacity planner, and project health</p>
        </div>

        <div className="flex items-center gap-2">
          {/* Time range switcher */}
          <div className="flex border-2 border-black rounded-full overflow-hidden bg-white shadow-sm text-xs font-semibold">
            <button
              onClick={() => setTimeRange("7")}
              className={`px-3 py-1.5 transition-all ${
                timeRange === "7" ? "bg-accent-yellow text-primary" : "hover:bg-neutral-bg"
              }`}
            >
              7 Days
            </button>
            <button
              onClick={() => setTimeRange("30")}
              className={`px-3 py-1.5 border-l-2 border-black transition-all ${
                timeRange === "30" ? "bg-accent-yellow text-primary" : "hover:bg-neutral-bg"
              }`}
            >
              30 Days
            </button>
            <button
              onClick={() => setTimeRange("all")}
              className={`px-3 py-1.5 border-l-2 border-black transition-all ${
                timeRange === "all" ? "bg-accent-yellow text-primary" : "hover:bg-neutral-bg"
              }`}
            >
              All Time
            </button>
          </div>

          <button
            onClick={handleExport}
            className="flex items-center gap-1.5 px-4 py-2 border-2 border-black rounded-full bg-accent-green font-bold text-xs shadow-flat-offset-sm hover:translate-x-[1px] hover:translate-y-[1px] hover:shadow-flat-offset-xs transition-all"
          >
            <Download className="h-3.5 w-3.5" />
            Export CSV
          </button>
        </div>
      </div>

      {/* Navigation tabs */}
      <div className="flex border-b-2 border-black mb-6 overflow-x-auto gap-2">
        {(["productivity", "health", "velocity", "completion", "workload"] as const).map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`px-4 py-2 text-xs font-bold border-t-2 border-x-2 border-black rounded-t-sketchy transition-all capitalize -mb-[2px] ${
              activeTab === tab
                ? "bg-white border-b-white z-10 scale-105"
                : "bg-neutral-bg/40 text-secondary border-b-black hover:bg-neutral-bg/60"
            }`}
          >
            {tab === "completion" ? "Completion Rate" : tab === "velocity" ? "Sprint Velocity" : tab}
          </button>
        ))}
      </div>

      {/* Loading state */}
      {loading && (
        <div className="flex items-center justify-center min-h-[300px]">
          <Loader2 className="h-8 w-8 animate-spin text-tertiary" />
        </div>
      )}

      {/* Error state */}
      {error && (
        <div className="p-4 border-2 border-black rounded-sketchy bg-accent-pink/20 text-center font-bold text-accent-pink">
          {error}
        </div>
      )}

      {/* Data views */}
      {!loading && !error && data && (
        <div className="bg-white border-2 border-black rounded-sketchy p-6 shadow-flat-offset">
          {/* Tab 1: Productivity */}
          {activeTab === "productivity" && (
            <div>
              <h2 className="text-xl font-bold font-cursive mb-4 flex items-center gap-2">
                <Award className="h-5 w-5 text-accent-purple" />
                Team Productivity (Tasks Completed)
              </h2>
              {data.productivity.length === 0 ? (
                <p className="text-secondary/60 italic text-sm text-center py-8">No tasks completed in this time range.</p>
              ) : (
                <div className="flex flex-col gap-4">
                  {data.productivity.map((prod: { name: string; completedCount: number }) => {
                    const maxVal = Math.max(...data.productivity.map((p: { name: string; completedCount: number }) => p.completedCount), 1);
                    const percentage = Math.round((prod.completedCount / maxVal) * 100);
                    return (
                      <div key={prod.name} className="flex flex-col gap-1">
                        <div className="flex justify-between text-xs font-semibold">
                          <span>{prod.name}</span>
                          <span className="font-bold">{prod.completedCount} tasks</span>
                        </div>
                        {/* Custom sketchy styled bar */}
                        <div className="w-full h-5 border-2 border-black rounded bg-neutral-bg overflow-hidden relative shadow-sm">
                          <div
                            className="h-full bg-accent-purple border-r-2 border-black"
                            style={{ width: `${percentage}%` }}
                          />
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {/* Tab 2: Project Health */}
          {activeTab === "health" && (
            <div>
              <h2 className="text-xl font-bold font-cursive mb-6 flex items-center gap-2">
                <ShieldAlert className="h-5 w-5 text-accent-pink" />
                Project Health Indexes
              </h2>
              {data.projectHealth.length === 0 ? (
                <p className="text-secondary/60 italic text-sm text-center py-8">No projects in this organization.</p>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {data.projectHealth.map((ph: { projectId: string; name: string; score: number; status: string; riskFactors: string[] }) => (
                    <div
                      key={ph.projectId}
                      className="border-2 border-black rounded-sketchy p-4 flex gap-4 items-start shadow-flat-offset-sm bg-white"
                    >
                      {/* Whiteboard styled circular gauge */}
                      <div className="relative shrink-0 w-16 h-16 flex items-center justify-center">
                        <svg className="w-full h-full transform -rotate-90" viewBox="0 0 36 36">
                          <circle cx="18" cy="18" r="16" fill="none" stroke="#E5E5E5" strokeWidth="2.5" />
                          <circle
                            cx="18"
                            cy="18"
                            r="16"
                            fill="none"
                            stroke={ph.status === "GREEN" ? "#D4EDDA" : ph.status === "YELLOW" ? "#FFF2B2" : "#FFD2D2"}
                            strokeWidth="3.5"
                            strokeDasharray={`${ph.score}, 100`}
                            className="transition-all"
                          />
                        </svg>
                        <span className="absolute text-xs font-black font-sans">{ph.score}%</span>
                      </div>

                      <div className="flex-1 min-w-0">
                        <span className="font-cursive text-lg font-bold block truncate">{ph.name}</span>
                        <span
                          className={`inline-block px-2 py-0.5 rounded text-[10px] font-bold border border-black/30 font-sans mt-1 ${
                            ph.status === "GREEN" ? "bg-accent-green" : ph.status === "YELLOW" ? "bg-accent-yellow" : "bg-accent-pink"
                          }`}
                        >
                          Status: {ph.status}
                        </span>

                        {ph.riskFactors.length > 0 ? (
                          <div className="mt-3">
                            <span className="text-[10px] font-bold text-secondary">Risk Factors:</span>
                            <ul className="list-disc pl-4 text-[10px] text-secondary/80 flex flex-col gap-0.5 mt-1">
                              {ph.riskFactors.map((rf: string, idx: number) => (
                                <li key={idx}>{rf}</li>
                              ))}
                            </ul>
                          </div>
                        ) : (
                          <p className="text-[10px] text-accent-green font-bold mt-3">✓ Project is healthy</p>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Tab 3: Sprint Velocity */}
          {activeTab === "velocity" && (
            <div>
              <h2 className="text-xl font-bold font-cursive mb-4 flex items-center gap-2">
                <Compass className="h-5 w-5 text-accent-blue" />
                Sprint Velocity (Completed Tasks per Sprint)
              </h2>
              {data.sprintVelocity.length === 0 ? (
                <p className="text-secondary/60 italic text-sm text-center py-8">No completed sprints found.</p>
              ) : (
                <div className="flex flex-col gap-4">
                  {data.sprintVelocity.map((sv: { sprintId: string; name: string; completedCount: number }) => {
                    const maxVal = Math.max(...data.sprintVelocity.map((s: { sprintId: string; name: string; completedCount: number }) => s.completedCount), 1);
                    const percentage = Math.round((sv.completedCount / maxVal) * 100);
                    return (
                      <div key={sv.sprintId} className="flex flex-col gap-1">
                        <div className="flex justify-between text-xs font-semibold">
                          <span>{sv.name}</span>
                          <span className="font-bold">{sv.completedCount} tasks completed</span>
                        </div>
                        <div className="w-full h-5 border-2 border-black rounded bg-neutral-bg overflow-hidden relative shadow-sm">
                          <div
                            className="h-full bg-accent-blue border-r-2 border-black"
                            style={{ width: `${percentage}%` }}
                          />
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {/* Tab 4: Completion Rate */}
          {activeTab === "completion" && (
            <div className="flex flex-col md:flex-row items-center gap-10">
              <div className="flex-1">
                <h2 className="text-xl font-bold font-cursive mb-4 flex items-center gap-2">
                  <TrendingUp className="h-5 w-5 text-accent-green" />
                  Task Completion Rate
                </h2>
                <div className="flex flex-col gap-3 font-sans text-sm">
                  <div className="flex justify-between border-b border-black/10 py-1.5">
                    <span className="text-secondary">Tasks Created:</span>
                    <span className="font-bold">{data.taskCompletionRate.createdCount}</span>
                  </div>
                  <div className="flex justify-between border-b border-black/10 py-1.5">
                    <span className="text-secondary">Tasks Completed:</span>
                    <span className="font-bold text-accent-green">{data.taskCompletionRate.completedCount}</span>
                  </div>
                  <div className="flex justify-between py-1.5 text-base">
                    <span className="font-bold text-primary">Completion Efficiency:</span>
                    <span className="font-black text-accent-purple">{data.taskCompletionRate.rate}%</span>
                  </div>
                </div>
              </div>

              {/* Whiteboard styled circular speedometer */}
              <div className="relative w-44 h-44 flex items-center justify-center shrink-0 border-2 border-black rounded-full bg-neutral-bg/20 shadow-md">
                <svg className="w-full h-full transform -rotate-90" viewBox="0 0 36 36">
                  <circle cx="18" cy="18" r="16" fill="none" stroke="#E5E5E5" strokeWidth="2.5" />
                  <circle
                    cx="18"
                    cy="18"
                    r="16"
                    fill="none"
                    stroke="#00a099"
                    strokeWidth="3.5"
                    strokeDasharray={`${data.taskCompletionRate.rate}, 100`}
                    className="transition-all"
                  />
                </svg>
                <div className="absolute text-center">
                  <span className="text-3xl font-black font-sans">{data.taskCompletionRate.rate}%</span>
                  <span className="block text-[8px] font-bold text-secondary uppercase tracking-wider mt-0.5">efficiency</span>
                </div>
              </div>
            </div>
          )}

          {/* Tab 5: Workload Planner */}
          {activeTab === "workload" && (
            <div>
              <h2 className="text-xl font-bold font-cursive mb-6 flex items-center gap-2">
                <BarChart2 className="h-5 w-5 text-accent-yellow" />
                Capacity utilization &amp; Workload Planner
              </h2>
              {data.workload.length === 0 ? (
                <p className="text-secondary/60 italic text-sm text-center py-8">No members in this organization.</p>
              ) : (
                <div className="flex flex-col gap-6">
                  {data.workload.map((w: { userId: string; name: string; avatarUrl: string | null; totalTasks: number; overdueTasks: number; totalEstimatedHours: number; capacityUtilization: number }) => {
                    const capColor = w.capacityUtilization > 100
                      ? "bg-accent-pink"
                      : w.capacityUtilization > 80
                      ? "bg-accent-yellow"
                      : "bg-accent-green";

                    return (
                      <div
                        key={w.userId}
                        className="border-2 border-black rounded-sketchy p-4 flex flex-col md:flex-row md:items-center justify-between gap-4 shadow-flat-offset-sm"
                      >
                        <div className="flex items-center gap-3">
                          {w.avatarUrl ? (
                            <Image
                              src={w.avatarUrl}
                              alt={w.name}
                              width={40}
                              height={40}
                              className="w-10 h-10 rounded-full border-2 border-black object-cover"
                            />
                          ) : (
                            <div className="w-10 h-10 rounded-full border-2 border-black bg-neutral-bg flex items-center justify-center font-cursive font-bold text-secondary text-sm">
                              {w.name.slice(0, 2).toUpperCase()}
                            </div>
                          )}
                          <div>
                            <span className="font-cursive text-lg font-bold block">{w.name}</span>
                            <div className="flex items-center gap-2 text-[10px] text-secondary/70 mt-0.5">
                              <span>Active Tasks: <strong className="text-primary">{w.totalTasks}</strong></span>
                              <span>•</span>
                              <span>Overdue: <strong className="text-accent-pink">{w.overdueTasks}</strong></span>
                            </div>
                          </div>
                        </div>

                        {/* Capacity Planner utilization gauge */}
                        <div className="flex-1 md:max-w-xs flex flex-col gap-1">
                          <div className="flex justify-between text-[10px] font-bold">
                            <span>Capacity Utilization:</span>
                            <span className={w.capacityUtilization > 100 ? "text-accent-pink font-extrabold" : ""}>
                              {w.totalEstimatedHours}h / 40h ({w.capacityUtilization}%)
                            </span>
                          </div>
                          <div className="w-full h-3 border border-black rounded bg-neutral-bg overflow-hidden relative shadow-sm">
                            <div
                              className={`h-full border-r border-black ${capColor}`}
                              style={{ width: `${Math.min(w.capacityUtilization, 100)}%` }}
                            />
                          </div>
                          {w.capacityUtilization > 100 && (
                            <span className="text-[9px] text-accent-pink font-bold">⚠️ Over capacity warning!</span>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
