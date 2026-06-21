"use client";

import React, { useEffect, useState, useCallback } from "react";
import { useOrgStore } from "@/store/orgStore";
import { getEnterpriseReportingData, exportEnterpriseReportCSV } from "@/actions/enterpriseReport";
import { EnterpriseReportBuilder } from "@/components/reports/EnterpriseReportBuilder";
import { CapacityAllocationChart } from "@/components/reports/CapacityAllocationChart";
import { DepartmentProductivityView } from "@/components/reports/DepartmentProductivityView";
import { Loader2, Download } from "lucide-react";

type ReportType = "portfolios" | "programs" | "departments" | "capacity";

type Filters = {
  reportType: ReportType;
  showCost: boolean;
  selectedId: string;
  startDate: string;
  endDate: string;
};

type PortfolioData = {
  id: string;
  name: string;
  description: string | null;
  owner_id: string;
  status: string;
  progress: number;
  health: string;
  cost: number;
};

type ProgramData = {
  id: string;
  name: string;
  manager_id: string | null;
  status: string;
  progress: number;
  health: string;
  cost: number;
};

type DepartmentData = {
  id: string;
  name: string;
  parentDepartmentId: string | null;
  totalTasks: number;
  completedTasks: number;
  completionRate: number;
  cost: number;
};

type CapacityData = {
  userId: string;
  name: string;
  email: string;
  avatarUrl: string | null;
  role: string;
  totalAllocatedPercentage: number;
  allocatedWeeklyCost: number;
  allocations: {
    projectId: string;
    projectName: string;
    percentage: number;
  }[];
};

type EnterpriseReportingData = {
  portfolios: PortfolioData[];
  programs: ProgramData[];
  departments: DepartmentData[];
  capacity: CapacityData[];
};

export default function EnterpriseReportsPage() {
  const orgId = useOrgStore((s) => s.activeOrgId);
  const [mounted, setMounted] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [data, setData] = useState<EnterpriseReportingData | null>(null);

  const [filters, setFilters] = useState<Filters>({
    reportType: "portfolios",
    showCost: true,
    selectedId: "all",
    startDate: "",
    endDate: "",
  });

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

    const res = await getEnterpriseReportingData(
      orgId,
      filters.startDate || undefined,
      filters.endDate || undefined
    );

    if (res.success && res.data) {
      setData(res.data as unknown as EnterpriseReportingData);
    } else {
      setError(res.error || "Failed to load enterprise reporting data");
    }
    setLoading(false);
  }, [orgId, filters.startDate, filters.endDate]);

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
    const res = await exportEnterpriseReportCSV(orgId);
    if (res.success && res.data) {
      const blob = new Blob([res.data], { type: "text/csv;charset=utf-8;" });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.setAttribute("href", url);
      link.setAttribute("download", `ProjectForge_Enterprise_Report_${new Date().toISOString().slice(0, 10)}.csv`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    }
  };

  if (!mounted) {
    return (
      <div className="p-6 max-w-6xl mx-auto font-sans min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-tertiary" />
      </div>
    );
  }

  if (!orgId) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px] font-cursive p-6">
        <div className="text-center p-8 border-2 border-black border-dashed rounded-sketchy bg-white max-w-sm shadow-flat-offset-sm">
          <p className="text-xl font-bold">Please select an organization to view enterprise reports</p>
        </div>
      </div>
    );
  }

  const portfoliosList = data?.portfolios?.map((p) => ({ id: p.id, name: p.name })) || [];
  const programsList = data?.programs?.map((p) => ({ id: p.id, name: p.name })) || [];
  const departmentsList = data?.departments?.map((d) => ({ id: d.id, name: d.name })) || [];

  // Client-side filtering for selected portfolio, program, or department
  const getFilteredPortfolios = () => {
    if (filters.selectedId === "all") return data?.portfolios || [];
    return data?.portfolios?.filter((p) => p.id === filters.selectedId) || [];
  };

  const getFilteredPrograms = () => {
    if (filters.selectedId === "all") return data?.programs || [];
    return data?.programs?.filter((p) => p.id === filters.selectedId) || [];
  };

  const getFilteredDepartments = () => {
    if (filters.selectedId === "all") return data?.departments || [];
    return data?.departments?.filter((d) => d.id === filters.selectedId) || [];
  };

  return (
    <div className="p-6 max-w-6xl mx-auto font-sans bg-neutral-bg/10 min-h-screen">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
        <div>
          <h1 className="text-3xl font-bold font-cursive">Enterprise Reporting</h1>
          <p className="text-secondary/70 text-xs">Executive summary rollups, cost center calculations, and department metrics</p>
        </div>

        <button
          onClick={handleExport}
          className="flex items-center justify-center gap-1.5 px-4 py-2 border-2 border-black rounded-full bg-accent-green font-bold text-xs shadow-flat-offset-sm hover:translate-x-[1px] hover:translate-y-[1px] hover:shadow-flat-offset-xs transition-all w-fit"
        >
          <Download className="h-3.5 w-3.5" />
          Export Executive Report
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Filters Panel */}
        <div className="lg:col-span-1">
          <EnterpriseReportBuilder
            filters={filters}
            onChange={setFilters}
            portfolios={portfoliosList}
            programs={programsList}
            departments={departmentsList}
          />
        </div>

        {/* Content Panel */}
        <div className="lg:col-span-2 flex flex-col gap-6">
          {loading && (
            <div className="flex items-center justify-center min-h-[300px] border-2 border-black border-dashed rounded-sketchy bg-white">
              <Loader2 className="h-8 w-8 animate-spin text-tertiary" />
            </div>
          )}

          {error && (
            <div className="p-4 border-2 border-black rounded-sketchy bg-accent-pink/20 text-center font-bold text-accent-pink">
              {error}
            </div>
          )}

          {!loading && !error && data && (
            <>
              {/* Portfolio View */}
              {filters.reportType === "portfolios" && (
                <div className="flex flex-col gap-4">
                  {getFilteredPortfolios().length === 0 ? (
                    <div className="p-8 text-center border-2 border-black border-dashed rounded-sketchy bg-white text-secondary/60 italic text-sm">
                      No matching portfolios found.
                    </div>
                  ) : (
                    getFilteredPortfolios().map((p) => (
                      <div key={p.id} className="bg-white border-2 border-black rounded-sketchy p-5 shadow-flat-offset flex flex-col gap-4">
                        <div className="flex justify-between items-start gap-4">
                          <div>
                            <h3 className="text-xl font-bold font-cursive">{p.name}</h3>
                            <p className="text-secondary/70 text-xs mt-1">{p.description || "No description provided."}</p>
                          </div>
                          <span className={`px-2 py-0.5 border border-black/30 rounded text-[10px] font-bold ${
                            p.health === "ON_TRACK" ? "bg-accent-green" : p.health === "AT_RISK" ? "bg-accent-yellow" : "bg-accent-pink"
                          }`}>
                            Health: {p.health.replace("_", " ")}
                          </span>
                        </div>

                        <div className="flex flex-col gap-1 mt-2">
                          <div className="flex justify-between text-xs font-semibold">
                            <span>Aggregate Progress</span>
                            <span>{p.progress}%</span>
                          </div>
                          <div className="w-full h-4 border border-black rounded bg-neutral-bg overflow-hidden relative shadow-sm">
                            <div className="h-full bg-accent-blue border-r border-black" style={{ width: `${p.progress}%` }} />
                          </div>
                        </div>

                        {filters.showCost && (
                          <div className="border-t border-black/10 pt-3 flex justify-between items-center mt-2">
                            <span className="text-[10px] font-bold text-secondary uppercase tracking-wider">Total Estimated Cost</span>
                            <span className="text-base font-black text-primary">${p.cost.toLocaleString()}</span>
                          </div>
                        )}
                      </div>
                    ))
                  )}
                </div>
              )}

              {/* Program View */}
              {filters.reportType === "programs" && (
                <div className="flex flex-col gap-4">
                  {getFilteredPrograms().length === 0 ? (
                    <div className="p-8 text-center border-2 border-black border-dashed rounded-sketchy bg-white text-secondary/60 italic text-sm">
                      No matching programs found.
                    </div>
                  ) : (
                    getFilteredPrograms().map((p) => (
                      <div key={p.id} className="bg-white border-2 border-black rounded-sketchy p-5 shadow-flat-offset flex flex-col gap-4">
                        <div className="flex justify-between items-start gap-4">
                          <div>
                            <h3 className="text-xl font-bold font-cursive">{p.name}</h3>
                            <span className="text-[10px] text-secondary/60">Manager ID: {p.manager_id || "Unassigned"}</span>
                          </div>
                          <span className={`px-2 py-0.5 border border-black/30 rounded text-[10px] font-bold ${
                            p.health === "ON_TRACK" ? "bg-accent-green" : p.health === "AT_RISK" ? "bg-accent-yellow" : "bg-accent-pink"
                          }`}>
                            Health: {p.health.replace("_", " ")}
                          </span>
                        </div>

                        <div className="flex flex-col gap-1 mt-2">
                          <div className="flex justify-between text-xs font-semibold">
                            <span>Program Progress</span>
                            <span>{p.progress}%</span>
                          </div>
                          <div className="w-full h-4 border border-black rounded bg-neutral-bg overflow-hidden relative shadow-sm">
                            <div className="h-full bg-accent-blue border-r border-black" style={{ width: `${p.progress}%` }} />
                          </div>
                        </div>

                        {filters.showCost && (
                          <div className="border-t border-black/10 pt-3 flex justify-between items-center mt-2">
                            <span className="text-[10px] font-bold text-secondary uppercase tracking-wider">Total Program Cost</span>
                            <span className="text-base font-black text-primary">${p.cost.toLocaleString()}</span>
                          </div>
                        )}
                      </div>
                    ))
                  )}
                </div>
              )}

              {/* Department View */}
              {filters.reportType === "departments" && (
                <DepartmentProductivityView
                  departmentsData={getFilteredDepartments()}
                  showCost={filters.showCost}
                />
              )}

              {/* Capacity View */}
              {filters.reportType === "capacity" && (
                <CapacityAllocationChart
                  capacityData={data.capacity}
                  showCost={filters.showCost}
                />
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
