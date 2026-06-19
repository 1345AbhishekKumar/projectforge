"use client";

import React, { useState } from "react";
import type { AuditLog } from "@/actions/auditLog";
import type { MemberListItem } from "@/actions/membership";
import { ChevronDown, ChevronUp, Eye, FileJson } from "lucide-react";

type Props = {
  logs: AuditLog[];
  members: MemberListItem[];
  page: number;
  totalCount: number;
  pageSize: number;
  onPageChange: (newPage: number) => void;
};

export function AuditLogsTable({
  logs,
  members,
  page,
  totalCount,
  pageSize,
  onPageChange,
}: Props) {
  const [expandedLogId, setExpandedLogId] = useState<string | null>(null);

  const getActorName = (actorId: string | null) => {
    if (!actorId) return "System";
    const member = members.find((m) => m.userId === actorId);
    return member ? member.name : actorId;
  };

  const formatAction = (action: string) => {
    return action
      .replace(/_/g, " ")
      .replace(/\./g, " ")
      .replace(/\b\w/g, (c) => c.toUpperCase());
  };

  const formatTimestamp = (dateStr: string) => {
    const d = new Date(dateStr);
    return d.toLocaleString("en-US", {
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
    });
  };

  const totalPages = Math.ceil(totalCount / pageSize);
  const showPagination = totalPages > 1;

  const toggleExpand = (logId: string) => {
    setExpandedLogId(expandedLogId === logId ? null : logId);
  };

  return (
    <div className="bg-white border-2 border-black rounded-sketchy shadow-flat-offset p-6 flex flex-col gap-6">
      <div className="flex items-center justify-between border-b border-black/10 pb-3">
        <h2 className="font-cursive text-2xl font-bold">Audit History</h2>
        <span className="bg-neutral-bg border border-black/20 text-xs font-semibold px-2.5 py-1 rounded-full">
          Total Logs: {totalCount}
        </span>
      </div>

      {logs.length === 0 ? (
        <div className="border-2 border-dashed border-black/20 rounded-sketchy-sm p-12 text-center text-secondary/60 font-sans">
          No audit logs recorded for the selected filters.
        </div>
      ) : (
        <div className="flex flex-col gap-4">
          <div className="overflow-x-auto">
            <table className="w-full text-left font-sans text-sm border-collapse">
              <thead>
                <tr className="border-b-2 border-black text-secondary/80">
                  <th className="py-3 px-4 font-bold text-xs uppercase">Timestamp</th>
                  <th className="py-3 px-4 font-bold text-xs uppercase">Actor</th>
                  <th className="py-3 px-4 font-bold text-xs uppercase">Action Verb</th>
                  <th className="py-3 px-4 font-bold text-xs uppercase">Entity</th>
                  <th className="py-3 px-4 font-bold text-xs uppercase text-right">Details</th>
                </tr>
              </thead>
              <tbody>
                {logs.map((log) => {
                  const isExpanded = expandedLogId === log.id;
                  return (
                    <React.Fragment key={log.id}>
                      <tr className="border-b border-black/10 hover:bg-neutral-bg/30 transition-colors">
                        <td className="py-3.5 px-4 font-mono text-xs text-secondary/80">
                          {formatTimestamp(log.created_at)}
                        </td>
                        <td className="py-3.5 px-4 font-semibold text-primary">
                          {getActorName(log.actor_id)}
                        </td>
                        <td className="py-3.5 px-4">
                          <span className="bg-accent-blue/30 border border-black/10 px-2 py-0.5 rounded text-xs font-bold font-mono">
                            {formatAction(log.action)}
                          </span>
                        </td>
                        <td className="py-3.5 px-4 capitalize font-medium text-secondary">
                          {log.entity_type}
                        </td>
                        <td className="py-3.5 px-4 text-right">
                          <button
                            onClick={() => toggleExpand(log.id)}
                            className="inline-flex items-center gap-1 bg-white hover:bg-neutral-bg text-primary border border-black/20 hover:border-black font-sans text-xs font-bold px-2 py-1 rounded shadow-sm hover:shadow active:translate-y-0.5 transition-all cursor-pointer"
                          >
                            <FileJson className="h-3.5 w-3.5" />
                            {isExpanded ? "Hide" : "Show"}
                            {isExpanded ? (
                              <ChevronUp className="h-3 w-3" />
                            ) : (
                              <ChevronDown className="h-3 w-3" />
                            )}
                          </button>
                        </td>
                      </tr>

                      {/* Expandable JSON details */}
                      {isExpanded && (
                        <tr>
                          <td colSpan={5} className="py-4 px-4 bg-neutral-bg/40 border-b border-black/10">
                            <div className="bg-[#FFF2B2]/10 border-2 border-black/30 rounded-sketchy-sm p-4 rotate-[0.2deg] shadow-sm flex flex-col gap-2">
                              <div className="flex items-center gap-1.5 text-xs font-bold text-secondary border-b border-black/5 pb-2">
                                <Eye className="h-3.5 w-3.5" />
                                <span>Entity Details: {log.entity_type} ({log.entity_id})</span>
                              </div>
                              <pre className="font-mono text-xs text-secondary overflow-x-auto max-w-full p-2 bg-white rounded border border-black/5 leading-relaxed">
                                {JSON.stringify(log.metadata, null, 2)}
                              </pre>
                            </div>
                          </td>
                        </tr>
                      )}
                    </React.Fragment>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          {showPagination && (
            <div className="flex items-center justify-between border-t border-black/10 pt-4">
              <span className="font-sans text-xs text-secondary">
                Page {page + 1} of {totalPages}
              </span>
              <div className="flex gap-2">
                <button
                  disabled={page === 0}
                  onClick={() => onPageChange(page - 1)}
                  className="bg-white border-2 border-black rounded-full px-4 py-1.5 font-sans text-xs font-bold shadow-flat-offset-xs hover:-translate-y-0.5 active:translate-y-0.5 transition-all disabled:opacity-40 disabled:pointer-events-none cursor-pointer"
                >
                  Previous
                </button>
                <button
                  disabled={page >= totalPages - 1}
                  onClick={() => onPageChange(page + 1)}
                  className="bg-white border-2 border-black rounded-full px-4 py-1.5 font-sans text-xs font-bold shadow-flat-offset-xs hover:-translate-y-0.5 active:translate-y-0.5 transition-all disabled:opacity-40 disabled:pointer-events-none cursor-pointer"
                >
                  Next
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
