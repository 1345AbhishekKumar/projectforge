"use client";

import React from "react";

type ReportType = "portfolios" | "programs" | "departments" | "capacity";

type Filters = {
  reportType: ReportType;
  showCost: boolean;
  selectedId: string;
  startDate: string;
  endDate: string;
};

type Props = {
  filters: Filters;
  onChange: (filters: Filters) => void;
  portfolios: { id: string; name: string }[];
  programs: { id: string; name: string }[];
  departments: { id: string; name: string }[];
};

export function EnterpriseReportBuilder({
  filters,
  onChange,
  portfolios,
  programs,
  departments
}: Props) {
  const handleTypeChange = (type: ReportType) => {
    onChange({ ...filters, reportType: type, selectedId: "all" });
  };

  const handleFilterChange = <K extends keyof Filters>(key: K, value: Filters[K]) => {
    onChange({ ...filters, [key]: value });
  };

  return (
    <div className="bg-white border-2 border-black rounded-sketchy p-6 shadow-flat-offset flex flex-col gap-6 rotate-[0.5deg]">
      <div>
        <h2 className="text-xl font-bold font-cursive mb-1">Configure Enterprise Report</h2>
        <p className="text-secondary/70 text-xs">Filter and customize metrics for portfolios, programs, departments, and capacity.</p>
      </div>

      {/* Report Type Selector */}
      <div className="flex flex-col gap-2">
        <label className="text-xs font-bold text-primary uppercase tracking-wider">Report Type</label>
        <div className="flex flex-wrap gap-2">
          {(["portfolios", "programs", "departments", "capacity"] as const).map((type) => (
            <button
              key={type}
              onClick={() => handleTypeChange(type)}
              className={`px-4 py-2 border-2 border-black rounded-full font-bold text-xs shadow-flat-offset-xs transition-all active:translate-y-0.5 ${
                filters.reportType === type
                  ? "bg-accent-yellow text-primary"
                  : "bg-white hover:bg-neutral-bg text-secondary"
              }`}
            >
              {type === "portfolios"
                ? "Portfolio Summary"
                : type === "programs"
                ? "Program Summary"
                : type === "departments"
                ? "Department Performance"
                : "Resource Capacity"}
            </button>
          ))}
        </div>
      </div>

      {/* Contextual Selector based on Type */}
      {filters.reportType !== "capacity" && (
        <div className="flex flex-col gap-2">
          <label className="text-xs font-bold text-primary uppercase tracking-wider">
            Filter by {filters.reportType === "portfolios" ? "Portfolio" : filters.reportType === "programs" ? "Program" : "Department"}
          </label>
          <select
            value={filters.selectedId}
            onChange={(e) => handleFilterChange("selectedId", e.target.value)}
            className="w-full px-3 py-2.5 border-2 border-black rounded-sketchy-sm font-sans text-xs font-bold bg-white focus:outline-none focus:ring-2 focus:ring-tertiary transition-shadow cursor-pointer shadow-flat-offset-xs"
          >
            <option value="all">All {filters.reportType === "portfolios" ? "Portfolios" : filters.reportType === "programs" ? "Programs" : "Departments"}</option>
            {filters.reportType === "portfolios" &&
              portfolios.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}
                </option>
              ))}
            {filters.reportType === "programs" &&
              programs.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}
                </option>
              ))}
            {filters.reportType === "departments" &&
              departments.map((d) => (
                <option key={d.id} value={d.id}>
                  {d.name}
                </option>
              ))}
          </select>
        </div>
      )}

      {/* Date Range Inputs */}
      <div className="grid grid-cols-2 gap-4">
        <div className="flex flex-col gap-1">
          <label className="text-[10px] font-bold text-primary uppercase tracking-wider">Start Date</label>
          <input
            type="date"
            value={filters.startDate}
            onChange={(e) => handleFilterChange("startDate", e.target.value)}
            className="px-3 py-2 border-2 border-black rounded-sketchy-sm font-sans text-xs bg-white focus:outline-none focus:ring-2 focus:ring-tertiary shadow-flat-offset-xs"
          />
        </div>
        <div className="flex flex-col gap-1">
          <label className="text-[10px] font-bold text-primary uppercase tracking-wider">End Date</label>
          <input
            type="date"
            value={filters.endDate}
            onChange={(e) => handleFilterChange("endDate", e.target.value)}
            className="px-3 py-2 border-2 border-black rounded-sketchy-sm font-sans text-xs bg-white focus:outline-none focus:ring-2 focus:ring-tertiary shadow-flat-offset-xs"
          />
        </div>
      </div>

      {/* Show Cost Toggle */}
      <div className="flex items-center justify-between border-t border-black/10 pt-4 mt-2">
        <div className="flex flex-col">
          <span className="text-xs font-bold text-primary">Include Cost Metrics</span>
          <span className="text-[10px] text-secondary/60">Display financial summaries and resource cost calculations.</span>
        </div>
        <button
          onClick={() => handleFilterChange("showCost", !filters.showCost)}
          className={`w-12 h-6 border-2 border-black rounded-full p-0.5 transition-colors relative ${
            filters.showCost ? "bg-accent-green" : "bg-neutral-bg"
          }`}
        >
          <div
            className={`w-4 h-4 border-2 border-black rounded-full bg-white transition-all absolute top-[2px] ${
              filters.showCost ? "left-[24px]" : "left-[2px]"
            }`}
          />
        </button>
      </div>
    </div>
  );
}
