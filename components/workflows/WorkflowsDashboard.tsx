"use client";

import { Zap, Clock, AlertOctagon, CheckCircle2, RefreshCw } from "lucide-react";

type Props = {
  analytics: {
    totalWorkflows: number;
    activeWorkflows: number;
    runsToday: number;
    failedToday: number;
    averageRuntimeMs: number;
    successRate: number;
    slowestWorkflows: Array<{ name: string; avgDuration: number }>;
    failedActions: Array<{ type: string; count: number }>;
    mostUsedTriggers: Array<{ trigger: string; count: number }>;
    runsTimeline: Array<{ date: string; runs: number; failures: number }>;
  };
};

export function WorkflowsDashboard({ analytics }: Props) {
  const maxRuns = Math.max(...analytics.runsTimeline.map((d) => d.runs), 1);

  return (
    <div className="flex flex-col gap-8 animate-in fade-in duration-200">
      {/* Metrics Row */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        {/* Total Workflows */}
        <div className="bg-white border-2 border-black rounded-sketchy p-6 shadow-flat-offset-sm relative hover:-translate-y-0.5 transition-transform">
          <div className="absolute right-4 top-4 w-10 h-10 rounded-full bg-accent-yellow border-2 border-black flex items-center justify-center">
            <Zap className="h-5 w-5 text-primary" />
          </div>
          <span className="font-sans text-xs font-semibold text-secondary uppercase tracking-wide block mb-1">
            Active Workflows
          </span>
          <h3 className="font-cursive text-3xl font-bold">
            {analytics.activeWorkflows}{" "}
            <span className="font-sans text-sm font-normal text-secondary">
              / {analytics.totalWorkflows} total
            </span>
          </h3>
        </div>

        {/* Runs Today */}
        <div className="bg-white border-2 border-black rounded-sketchy p-6 shadow-flat-offset-sm relative hover:-translate-y-0.5 transition-transform rotate-[0.5deg]">
          <div className="absolute right-4 top-4 w-10 h-10 rounded-full bg-accent-blue border-2 border-black flex items-center justify-center">
            <RefreshCw className="h-5 w-5 text-primary" />
          </div>
          <span className="font-sans text-xs font-semibold text-secondary uppercase tracking-wide block mb-1">
            Runs Today
          </span>
          <h3 className="font-cursive text-3xl font-bold">{analytics.runsToday}</h3>
        </div>

        {/* Failed Today */}
        <div className="bg-white border-2 border-black rounded-sketchy p-6 shadow-flat-offset-sm relative hover:-translate-y-0.5 transition-transform rotate-[-0.5deg]">
          <div className="absolute right-4 top-4 w-10 h-10 rounded-full bg-accent-pink border-2 border-black flex items-center justify-center">
            <AlertOctagon className="h-5 w-5 text-rose-800" />
          </div>
          <span className="font-sans text-xs font-semibold text-secondary uppercase tracking-wide block mb-1">
            Failed Today
          </span>
          <h3 className="font-cursive text-3xl font-bold text-rose-600">{analytics.failedToday}</h3>
        </div>

        {/* Success Rate */}
        <div className="bg-white border-2 border-black rounded-sketchy p-6 shadow-flat-offset-sm relative hover:-translate-y-0.5 transition-transform">
          <div className="absolute right-4 top-4 w-10 h-10 rounded-full bg-accent-green border-2 border-black flex items-center justify-center">
            <CheckCircle2 className="h-5 w-5 text-emerald-800" />
          </div>
          <span className="font-sans text-xs font-semibold text-secondary uppercase tracking-wide block mb-1">
            Avg Health Rate
          </span>
          <h3 className="font-cursive text-3xl font-bold">{analytics.successRate}%</h3>
        </div>
      </div>

      {/* Charts & Timeline Row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Timeline Bar Chart */}
        <div className="bg-white border-2 border-black rounded-sketchy p-6 shadow-flat-offset lg:col-span-2 flex flex-col gap-4">
          <div>
            <h4 className="font-cursive text-xl font-bold">Execution Activity</h4>
            <p className="font-sans text-xs text-secondary">
              Runs and failures over the past 7 days
            </p>
          </div>
          {/* SVG Bar Chart */}
          <div className="flex-1 min-h-[220px] flex items-end justify-between gap-2 pt-6 pb-2 px-4 border-b-2 border-black relative">
            {analytics.runsTimeline.map((day) => {
              const runPercent = (day.runs / maxRuns) * 80; // Scale to max 80% height
              const failPercent = day.runs > 0 ? (day.failures / day.runs) * 100 : 0;
              const dateObj = new Date(day.date);
              const label = dateObj.toLocaleDateString(undefined, { weekday: "short" });

              return (
                <div
                  key={day.date}
                  className="flex-1 flex flex-col items-center gap-2 group relative"
                >
                  {/* Tooltip */}
                  <div className="absolute bottom-full mb-2 bg-black text-white text-[10px] font-bold py-1 px-2 rounded opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-10 whitespace-nowrap">
                    {day.runs} runs ({day.failures} failed)
                  </div>
                  {/* Bar */}
                  <div
                    className="w-full bg-neutral-bg border-2 border-black rounded-t-sm relative overflow-hidden"
                    style={{ height: `${Math.max(runPercent, 10)}%` }}
                  >
                    {/* Failed portion */}
                    <div
                      className="absolute bottom-0 left-0 right-0 bg-accent-pink"
                      style={{ height: `${failPercent}%` }}
                    />
                    {/* Success portion */}
                    <div className="absolute top-0 bottom-0 left-0 right-0 bg-accent-blue/40" />
                  </div>
                  <span className="font-mono text-[10px] font-bold text-secondary">{label}</span>
                </div>
              );
            })}
          </div>
          <div className="flex gap-4 text-xs font-sans font-semibold pt-1">
            <div className="flex items-center gap-1.5">
              <div className="w-3 h-3 bg-accent-blue border border-black rounded" />
              <span>Success Runs</span>
            </div>
            <div className="flex items-center gap-1.5">
              <div className="w-3 h-3 bg-accent-pink border border-black rounded" />
              <span>Failed Runs</span>
            </div>
          </div>
        </div>

        {/* Average Runtime Speedometer */}
        <div className="bg-white border-2 border-black rounded-sketchy p-6 shadow-flat-offset flex flex-col gap-6 rotate-[0.5deg]">
          <div>
            <h4 className="font-cursive text-xl font-bold">Average Runtime</h4>
            <p className="font-sans text-xs text-secondary">
              Mean execution speed of successfully processed runs
            </p>
          </div>
          <div className="flex-1 flex flex-col items-center justify-center py-4">
            <div className="w-24 h-24 rounded-full bg-accent-yellow/20 border-2 border-black flex items-center justify-center shadow-flat-offset-sm animate-pulse">
              <Clock className="h-10 w-10 text-primary" />
            </div>
            <h2 className="font-cursive text-4xl font-bold mt-4">
              {analytics.averageRuntimeMs}{" "}
              <span className="font-sans text-lg font-normal text-secondary">ms</span>
            </h2>
            <p className="font-sans text-[11px] text-secondary mt-1">
              Excellent performance dashboard range
            </p>
          </div>
        </div>
      </div>

      {/* Details Lists Row */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
        {/* Slowest Workflows */}
        <div className="bg-white border-2 border-black rounded-sketchy p-6 shadow-flat-offset-sm flex flex-col gap-4">
          <h4 className="font-cursive text-lg font-bold">Slowest Workflows</h4>
          <div className="flex flex-col gap-2.5">
            {analytics.slowestWorkflows.length === 0 ? (
              <p className="font-sans text-xs text-secondary/50 py-4 text-center">
                No completed runs recorded
              </p>
            ) : (
              analytics.slowestWorkflows.map((item, idx) => (
                <div
                  key={idx}
                  className="flex justify-between items-center p-3 border-2 border-black rounded-sketchy-sm bg-neutral-bg/30 text-xs font-sans"
                >
                  <span className="font-bold truncate max-w-[150px]">{item.name}</span>
                  <span className="font-mono bg-accent-yellow border border-black/10 px-1.5 py-0.5 rounded text-[10px]">
                    {item.avgDuration} ms
                  </span>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Failed Actions */}
        <div className="bg-white border-2 border-black rounded-sketchy p-6 shadow-flat-offset-sm flex flex-col gap-4 rotate-[-0.5deg]">
          <h4 className="font-cursive text-lg font-bold text-rose-800">Failed Actions</h4>
          <div className="flex flex-col gap-2.5">
            {analytics.failedActions.length === 0 ? (
              <p className="font-sans text-xs text-secondary/50 py-4 text-center">
                No action failures logged
              </p>
            ) : (
              analytics.failedActions.map((item, idx) => (
                <div
                  key={idx}
                  className="flex justify-between items-center p-3 border-2 border-black rounded-sketchy-sm bg-accent-pink/15 text-xs font-sans"
                >
                  <span className="font-mono text-[10px] bg-white border border-black/10 px-1.5 py-0.5 rounded">
                    {item.type}
                  </span>
                  <span className="font-bold text-rose-600">{item.count} failures</span>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Most Used Triggers */}
        <div className="bg-white border-2 border-black rounded-sketchy p-6 shadow-flat-offset-sm flex flex-col gap-4 rotate-[0.5deg]">
          <h4 className="font-cursive text-lg font-bold">Top Triggers</h4>
          <div className="flex flex-col gap-2.5">
            {analytics.mostUsedTriggers.length === 0 ? (
              <p className="font-sans text-xs text-secondary/50 py-4 text-center">
                No trigger event runs recorded
              </p>
            ) : (
              analytics.mostUsedTriggers.map((item, idx) => (
                <div
                  key={idx}
                  className="flex justify-between items-center p-3 border-2 border-black rounded-sketchy-sm bg-neutral-bg/30 text-xs font-sans"
                >
                  <span className="font-mono text-[10px] bg-accent-blue/30 border border-black/10 px-1.5 py-0.5 rounded truncate max-w-[150px]">
                    {item.trigger}
                  </span>
                  <span className="font-bold">{item.count} runs</span>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
