"use client";

import React, { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Loader2, ArrowLeft, ArrowRight } from "lucide-react";

import { getAuditLogs } from "@/actions/auditLog";

type Props = {
  activeOrgId: string;
};

export function AuditLogsTable({ activeOrgId }: Props) {
  const [activePage, setActivePage] = useState(0);
  const [actorId, setActorId] = useState("");
  const [action, setAction] = useState("");
  const [entityType, setEntityType] = useState("");
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");

  // Build filter object for getAuditLogs
  const filters: Record<string, string> = {};
  if (actorId) filters.actorId = actorId;
  if (action) filters.action = action;
  if (entityType) filters.entityType = entityType;
  if (fromDate) filters.from = new Date(fromDate + "T00:00:00.000Z").toISOString();
  if (toDate) filters.to = new Date(toDate + "T23:59:59.999Z").toISOString();

  const { data: auditLogsData = null, isLoading: isLogsLoading, error: logsError } = useQuery({
    queryKey: ["auditLogs", activeOrgId, activePage, filters],
    queryFn: async () => {
      const res = await getAuditLogs(activeOrgId, activePage, filters);
      if (!res.success) throw new Error(res.error || "Failed to load audit logs");
      return res;
    },
    enabled: !!activeOrgId,
  });

  const totalCount = auditLogsData?.totalCount || 0;
  const totalPages = Math.ceil(totalCount / 15);
  const auditLogs = auditLogsData?.data || [];

  const handleFilterChange = (setter: React.Dispatch<React.SetStateAction<string>>, value: string) => {
    setter(value);
    setActivePage(0); // Reset page on filter change
  };

  return (
    <div className="bg-white border-2 border-black rounded-sketchy shadow-flat-offset p-6">
      <h2 className="font-cursive text-2xl font-bold mb-4 text-primary">Immutable Audit Logs Trail</h2>

      {/* Filter controls */}
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 mb-6 bg-neutral-bg border border-black p-4 rounded-sketchy-sm">
        <div>
          <label className="font-sans text-[10px] font-bold text-secondary uppercase block mb-1 text-primary">Actor ID</label>
          <input
            type="text"
            placeholder="Filter by actor ID"
            value={actorId}
            onChange={(e) => handleFilterChange(setActorId, e.target.value)}
            className="w-full px-2.5 py-1.5 border border-black bg-white rounded font-sans text-xs text-primary"
          />
        </div>
        <div>
          <label className="font-sans text-[10px] font-bold text-secondary uppercase block mb-1 text-primary">Action Type</label>
          <input
            type="text"
            placeholder="e.g. risk.created"
            value={action}
            onChange={(e) => handleFilterChange(setAction, e.target.value)}
            className="w-full px-2.5 py-1.5 border border-black bg-white rounded font-sans text-xs text-primary"
          />
        </div>
        <div>
          <label className="font-sans text-[10px] font-bold text-secondary uppercase block mb-1 text-primary">Entity Type</label>
          <input
            type="text"
            placeholder="e.g. risk"
            value={entityType}
            onChange={(e) => handleFilterChange(setEntityType, e.target.value)}
            className="w-full px-2.5 py-1.5 border border-black bg-white rounded font-sans text-xs text-primary"
          />
        </div>
        <div>
          <label className="font-sans text-[10px] font-bold text-secondary uppercase block mb-1 text-primary">From Date</label>
          <input
            type="date"
            value={fromDate}
            onChange={(e) => handleFilterChange(setFromDate, e.target.value)}
            className="w-full px-2.5 py-1 border border-black bg-white rounded font-sans text-xs text-primary bg-white cursor-pointer"
          />
        </div>
        <div className="col-span-2 sm:col-span-1">
          <label className="font-sans text-[10px] font-bold text-secondary uppercase block mb-1 text-primary">To Date</label>
          <input
            type="date"
            value={toDate}
            onChange={(e) => handleFilterChange(setToDate, e.target.value)}
            className="w-full px-2.5 py-1 border border-black bg-white rounded font-sans text-xs text-primary bg-white cursor-pointer"
          />
        </div>
      </div>

      {/* logs table */}
      {isLogsLoading ? (
        <div className="flex items-center justify-center p-12">
          <Loader2 className="h-8 w-8 animate-spin text-accent-pink" />
        </div>
      ) : logsError ? (
        <div className="border border-black p-4 bg-accent-pink/15 text-center rounded text-xs font-semibold text-primary">
          Failed to load audit logs trail
        </div>
      ) : auditLogs.length === 0 ? (
        <div className="border border-black border-dashed p-8 text-center rounded text-secondary font-cursive">
          No ledger logs found matching target filters.
        </div>
      ) : (
        <div className="flex flex-col gap-4">
          <div className="overflow-x-auto">
            <table className="w-full border-collapse font-sans text-xs">
              <thead>
                <tr className="border-b-2 border-black bg-neutral-bg text-left font-bold text-secondary uppercase">
                  <th className="p-2.5 border-r border-black text-primary">Timestamp (UTC)</th>
                  <th className="p-2.5 border-r border-black text-primary">Actor ID</th>
                  <th className="p-2.5 border-r border-black text-primary">Action</th>
                  <th className="p-2.5 border-r border-black text-primary">Entity Type</th>
                  <th className="p-2.5 border-r border-black text-primary">Entity ID</th>
                  <th className="p-2.5 text-primary">Metadata</th>
                </tr>
              </thead>
              <tbody>
                {auditLogs.map((log) => (
                  <tr key={log.id} className="border-b border-black/10 hover:bg-neutral-bg/25">
                    <td className="p-2.5 border-r border-black/10 font-mono text-secondary whitespace-nowrap" suppressHydrationWarning>
                      {new Date(log.created_at).toISOString().replace("T", " ").substring(0, 19)}
                    </td>
                    <td className="p-2.5 border-r border-black/10 font-mono text-secondary truncate max-w-[120px]" title={log.actor_id || "system"}>
                      {log.actor_id || "system"}
                    </td>
                    <td className="p-2.5 border-r border-black/10 font-bold text-primary">{log.action}</td>
                    <td className="p-2.5 border-r border-black/10 font-semibold text-secondary uppercase">{log.entity_type}</td>
                    <td className="p-2.5 border-r border-black/10 font-mono text-secondary truncate max-w-[120px]" title={log.entity_id}>
                      {log.entity_id}
                    </td>
                    <td className="p-2.5 font-mono text-[10px] text-secondary/80 max-w-sm truncate" title={JSON.stringify(log.metadata || {})}>
                      {JSON.stringify(log.metadata || {})}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex justify-between items-center mt-2 font-sans">
              <span className="text-[11px] font-bold text-secondary">
                Showing Page {activePage + 1} of {totalPages} ({totalCount} total log records)
              </span>
              <div className="flex gap-2">
                <button
                  onClick={() => setActivePage((p) => Math.max(0, p - 1))}
                  disabled={activePage === 0}
                  className="p-1 border border-black bg-white hover:bg-neutral-bg rounded shadow-flat-offset-sm active:translate-y-0.5 transition-all disabled:opacity-40 disabled:pointer-events-none cursor-pointer text-primary"
                >
                  <ArrowLeft className="h-4 w-4" />
                </button>
                <button
                  onClick={() => setActivePage((p) => Math.min(totalPages - 1, p + 1))}
                  disabled={activePage >= totalPages - 1}
                  className="p-1 border border-black bg-white hover:bg-neutral-bg rounded shadow-flat-offset-sm active:translate-y-0.5 transition-all disabled:opacity-40 disabled:pointer-events-none cursor-pointer text-primary"
                >
                  <ArrowRight className="h-4 w-4" />
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
