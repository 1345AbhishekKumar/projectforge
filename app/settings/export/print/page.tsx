"use client";

import React, { useEffect, useState, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { ShieldAlert, RefreshCw } from "lucide-react";
import { 
  exportDataAction,
  ProjectExportRow,
  TaskExportRow,
  AuditLogExportRow,
  ProductivityItem,
  ProjectHealthItem,
  WorkloadItem,
  ExportDataRow
} from "@/actions/export";

function PrintViewContent() {
  const searchParams = useSearchParams();
  const type = searchParams.get("type") as "projects" | "tasks" | "reports" | "audit_logs" | null;
  const orgId = searchParams.get("orgId");

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [exportData, setExportData] = useState<{ data: ExportDataRow[]; hash?: string; filename?: string } | null>(null);

  useEffect(() => {
    if (!orgId || !type) return;

    async function loadData() {
      try {
        const res = await exportDataAction(orgId!, type!, "pdf");
        if (res.success && res.data && Array.isArray(res.data)) {
          setExportData({ data: res.data, hash: res.hash, filename: res.filename });
          setLoading(false);
        } else {
          setError(res.error || "Failed to load data for print");
          setLoading(false);
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : "An unexpected error occurred");
        setLoading(false);
      }
    }

    loadData();
  }, [orgId, type]);

  // Trigger print dialog once loaded
  useEffect(() => {
    if (!loading && !error && exportData) {
      // Small timeout to allow standard browser rendering to finish
      const timer = setTimeout(() => {
        window.print();
      }, 500);
      return () => clearTimeout(timer);
    }
  }, [loading, error, exportData]);

  if (!orgId || !type) {
    return (
      <div className="min-h-screen w-full flex flex-col items-center justify-center bg-white text-black p-6 font-sans">
        <ShieldAlert className="h-12 w-12 text-red-500 mb-4" />
        <h1 className="text-xl font-bold mb-2">Export Failed</h1>
        <p className="text-sm text-gray-500">Missing query parameters (orgId, type)</p>
        <button 
          onClick={() => window.close()}
          className="mt-6 px-4 py-2 border-2 border-black rounded font-bold text-xs hover:bg-gray-100"
        >
          Close Tab
        </button>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="min-h-screen w-full flex flex-col items-center justify-center bg-white text-black p-6 font-sans">
        <RefreshCw className="h-8 w-8 animate-spin mb-2" />
        <span className="text-sm font-semibold">Compiling printable document...</span>
      </div>
    );
  }

  if (error || !exportData) {
    return (
      <div className="min-h-screen w-full flex flex-col items-center justify-center bg-white text-black p-6 font-sans">
        <ShieldAlert className="h-12 w-12 text-red-500 mb-4" />
        <h1 className="text-xl font-bold mb-2">Export Failed</h1>
        <p className="text-sm text-gray-500">{error || "Could not generate PDF view"}</p>
        <button 
          onClick={() => window.close()}
          className="mt-6 px-4 py-2 border-2 border-black rounded font-bold text-xs hover:bg-gray-100"
        >
          Close Tab
        </button>
      </div>
    );
  }

  const { data, hash } = exportData;
  const dateStr = new Date().toUTCString();

  return (
    <div className="w-full min-h-screen bg-white text-black p-8 font-sans print:p-0">
      {/* Hide close button during print */}
      <div className="mb-6 flex justify-between items-center print:hidden border-b pb-4">
        <div>
          <span className="text-xs font-bold text-gray-400 uppercase">Print Preview Mode</span>
          <p className="text-xs text-gray-500">Document triggers print automatically. If blocked, press Ctrl+P / Cmd+P.</p>
        </div>
        <button 
          onClick={() => window.close()}
          className="px-4 py-1.5 border-2 border-black rounded font-bold text-xs bg-gray-50 hover:bg-gray-100"
        >
          Close Preview
        </button>
      </div>

      {/* Printable Document Layout */}
      <div className="w-full">
        {/* Document Header */}
        <div className="border-b-4 border-black pb-4 mb-6">
          <div className="flex justify-between items-start">
            <div>
              <h1 className="text-2xl font-bold tracking-tight uppercase">
                ProjectForge Ledger Export
              </h1>
              <p className="text-xs text-gray-500 mt-1">
                Workspace ID: {orgId} &bull; Generated: {dateStr}
              </p>
            </div>
            <div className="text-right">
              <span className="px-3 py-1 border-2 border-black font-mono text-[10px] font-bold uppercase bg-gray-100 rounded">
                {type.replace("_", " ")}
              </span>
            </div>
          </div>
        </div>

        {/* Cryptographic Hash Metadata Header */}
        {hash && (
          <div className="border-2 border-black p-4 mb-6 bg-accent-yellow rounded-sketchy shadow-flat-offset-sm font-mono text-[10px] break-all leading-normal relative rotate-[0.5deg]">
            <div className="font-sans font-bold text-xs text-black mb-1 flex items-center gap-1.5">
              <span>Tamper-Proof Audit Integrity Header</span>
            </div>
            <strong>SHA-256 HMAC Signature:</strong> {hash}
            <p className="font-sans text-[9px] text-gray-400 mt-1.5">
              This signature verifies that the data below is authentic and corresponds directly to the source database logs.
            </p>
          </div>
        )}

        {/* Table Datasets */}
        <div className="w-full overflow-x-auto">
          {type === "projects" && (
            <table className="w-full text-left border-collapse border border-gray-300 text-xs">
              <thead>
                <tr className="bg-gray-100 border-b border-black">
                  <th className="p-2 border border-gray-300 font-bold uppercase">Project Name</th>
                  <th className="p-2 border border-gray-300 font-bold uppercase">Description</th>
                  <th className="p-2 border border-gray-300 font-bold uppercase">Status</th>
                  <th className="p-2 border border-gray-300 font-bold uppercase">Created At</th>
                  <th className="p-2 border border-gray-300 font-bold uppercase text-right">Tasks Count</th>
                </tr>
              </thead>
              <tbody>
                {(data as ProjectExportRow[]).map((p: ProjectExportRow, idx: number) => (
                  <tr key={idx} className="border-b border-gray-200">
                    <td className="p-2 border border-gray-300 font-semibold">{p.name}</td>
                    <td className="p-2 border border-gray-300 text-gray-600">{p.description || "N/A"}</td>
                    <td className="p-2 border border-gray-300 font-mono font-bold text-[10px]">{p.status}</td>
                    <td className="p-2 border border-gray-300">{new Date(p.created_at).toLocaleDateString()}</td>
                    <td className="p-2 border border-gray-300 text-right">{p.tasks_count}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}

          {type === "tasks" && (
            <table className="w-full text-left border-collapse border border-gray-300 text-[10px]">
              <thead>
                <tr className="bg-gray-100 border-b border-black">
                  <th className="p-2 border border-gray-300 font-bold uppercase">Project</th>
                  <th className="p-2 border border-gray-300 font-bold uppercase">Task Title</th>
                  <th className="p-2 border border-gray-300 font-bold uppercase">Description</th>
                  <th className="p-2 border border-gray-300 font-bold uppercase">Status</th>
                  <th className="p-2 border border-gray-300 font-bold uppercase">Priority</th>
                  <th className="p-2 border border-gray-300 font-bold uppercase">Assignee</th>
                  <th className="p-2 border border-gray-300 font-bold uppercase">Due Date</th>
                  <th className="p-2 border border-gray-300 font-bold uppercase">Sprint</th>
                  <th className="p-2 border border-gray-300 font-bold uppercase text-right">Est. Hours</th>
                </tr>
              </thead>
              <tbody>
                {(data as TaskExportRow[]).map((t: TaskExportRow, idx: number) => (
                  <tr key={idx} className="border-b border-gray-200">
                    <td className="p-2 border border-gray-300 font-semibold">{t.project_name}</td>
                    <td className="p-2 border border-gray-300 font-medium">{t.title}</td>
                    <td className="p-2 border border-gray-300 text-gray-600 max-w-[150px] truncate">{t.description || "N/A"}</td>
                    <td className="p-2 border border-gray-300 font-mono font-bold">{t.status}</td>
                    <td className="p-2 border border-gray-300 font-mono">{t.priority}</td>
                    <td className="p-2 border border-gray-300">
                      <div>{t.assignee_name}</div>
                      <div className="text-[8px] text-gray-400">{t.assignee_email}</div>
                    </td>
                    <td className="p-2 border border-gray-300">
                      {t.due_date !== "No due date" ? new Date(t.due_date).toLocaleDateString() : "N/A"}
                    </td>
                    <td className="p-2 border border-gray-300">{t.sprint_name}</td>
                    <td className="p-2 border border-gray-300 text-right font-mono">{t.estimated_hours}h</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}

          {type === "reports" && (
            <div className="flex flex-col gap-8">
              {/* Productivity Table */}
              <div>
                <h3 className="text-sm font-bold uppercase mb-2 bg-gray-100 p-1 border-l-4 border-black">Team Productivity</h3>
                <table className="w-full text-left border-collapse border border-gray-300 text-xs">
                  <thead>
                    <tr className="bg-gray-50 border-b border-black">
                      <th className="p-2 border border-gray-300 font-bold">Member Name</th>
                      <th className="p-2 border border-gray-300 font-bold text-right">Completed Tasks</th>
                    </tr>
                  </thead>
                  <tbody>
                    {((data[0] as Record<string, unknown>).productivity as ProductivityItem[]).map((p: ProductivityItem, idx: number) => (
                      <tr key={idx} className="border-b border-gray-200">
                        <td className="p-2 border border-gray-300">{p.name}</td>
                        <td className="p-2 border border-gray-300 text-right">{p.completedCount}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Health Table */}
              <div>
                <h3 className="text-sm font-bold uppercase mb-2 bg-gray-100 p-1 border-l-4 border-black">Project Health scores</h3>
                <table className="w-full text-left border-collapse border border-gray-300 text-xs">
                  <thead>
                    <tr className="bg-gray-50 border-b border-black">
                      <th className="p-2 border border-gray-300 font-bold">Project Name</th>
                      <th className="p-2 border border-gray-300 font-bold text-center">Score</th>
                      <th className="p-2 border border-gray-300 font-bold text-center">Status</th>
                      <th className="p-2 border border-gray-300 font-bold">Risk Factors</th>
                    </tr>
                  </thead>
                  <tbody>
                    {((data[0] as Record<string, unknown>).projectHealth as ProjectHealthItem[]).map((ph: ProjectHealthItem, idx: number) => (
                      <tr key={idx} className="border-b border-gray-200">
                        <td className="p-2 border border-gray-300 font-semibold">{ph.name}</td>
                        <td className="p-2 border border-gray-300 text-center font-mono font-bold">{ph.score}%</td>
                        <td className="p-2 border border-gray-300 text-center font-bold text-[10px]">{ph.status}</td>
                        <td className="p-2 border border-gray-300 text-gray-500 text-[10px]">
                          {ph.riskFactors.join("; ") || "No critical risk factors"}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Capacity Table */}
              <div>
                <h3 className="text-sm font-bold uppercase mb-2 bg-gray-100 p-1 border-l-4 border-black">Team Capacity & Workload</h3>
                <table className="w-full text-left border-collapse border border-gray-300 text-xs">
                  <thead>
                    <tr className="bg-gray-50 border-b border-black">
                      <th className="p-2 border border-gray-300 font-bold">Member Name</th>
                      <th className="p-2 border border-gray-300 font-bold text-right">Active Tasks</th>
                      <th className="p-2 border border-gray-300 font-bold text-right">Overdue Tasks</th>
                      <th className="p-2 border border-gray-300 font-bold text-right">Estimated Hours</th>
                      <th className="p-2 border border-gray-300 font-bold text-right">Capacity Utilization</th>
                    </tr>
                  </thead>
                  <tbody>
                    {((data[0] as Record<string, unknown>).workload as WorkloadItem[]).map((w: WorkloadItem, idx: number) => (
                      <tr key={idx} className="border-b border-gray-200">
                        <td className="p-2 border border-gray-300">{w.name}</td>
                        <td className="p-2 border border-gray-300 text-right">{w.totalTasks}</td>
                        <td className="p-2 border border-gray-300 text-right text-red-500 font-bold">{w.overdueTasks}</td>
                        <td className="p-2 border border-gray-300 text-right">{w.totalEstimatedHours}h</td>
                        <td className="p-2 border border-gray-300 text-right font-bold">{w.capacityUtilization}%</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {type === "audit_logs" && (
            <table className="w-full text-left border-collapse border border-gray-300 text-[9px] table-fixed">
              <thead>
                <tr className="bg-gray-100 border-b border-black">
                  <th className="p-2 border border-gray-300 font-bold uppercase w-[140px]">Time (UTC)</th>
                  <th className="p-2 border border-gray-300 font-bold uppercase w-[120px]">Actor</th>
                  <th className="p-2 border border-gray-300 font-bold uppercase w-[130px]">Action</th>
                  <th className="p-2 border border-gray-300 font-bold uppercase w-[80px]">Entity Type</th>
                  <th className="p-2 border border-gray-300 font-bold uppercase w-[100px]">Entity ID</th>
                  <th className="p-2 border border-gray-300 font-bold uppercase">Metadata (JSON)</th>
                </tr>
              </thead>
              <tbody>
                {(data as AuditLogExportRow[]).map((log: AuditLogExportRow, idx: number) => (
                  <tr key={idx} className="border-b border-gray-200 break-inside-avoid">
                    <td className="p-2 border border-gray-300 font-mono text-[8px]">{log.created_at}</td>
                    <td className="p-2 border border-gray-300 font-medium truncate">{log.actor}</td>
                    <td className="p-2 border border-gray-300 font-mono">{log.action}</td>
                    <td className="p-2 border border-gray-300 uppercase font-bold text-[8px] text-gray-500">{log.entity_type}</td>
                    <td className="p-2 border border-gray-300 font-mono text-[8px] truncate">{log.entity_id}</td>
                    <td className="p-2 border border-gray-300 font-mono text-[8px] break-all max-w-[200px]">
                      {log.metadata}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  );
}

export default function PrintViewPage() {
  return (
    <Suspense 
      fallback={
        <div className="min-h-screen w-full flex flex-col items-center justify-center bg-white text-black p-6 font-sans">
          <RefreshCw className="h-8 w-8 animate-spin mb-2" />
          <span className="text-sm font-semibold">Loading Suspense Boundaries...</span>
        </div>
      }
    >
      <PrintViewContent />
    </Suspense>
  );
}
