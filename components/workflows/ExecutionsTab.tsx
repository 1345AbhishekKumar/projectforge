"use client";

import { useState } from "react";
import Link from "next/link";
import { ArrowRight, RefreshCw, PlayCircle, ShieldCheck, AlertTriangle } from "lucide-react";

export type ExecutionRow = {
  id: string;
  status: "RUNNING" | "QUEUED" | "COMPLETED" | "CANCELLED" | "FAILED";
  started_at: string;
  finished_at: string | null;
  duration: number | null;
  trigger_event: string;
  triggered_by: string | null;
  workflows: {
    name: string;
    category: string;
  };
};

type Props = {
  initialExecutions: ExecutionRow[];
  orgId: string;
};

export function ExecutionsTab({ initialExecutions }: Props) {
  const [executions] = useState<ExecutionRow[]>(initialExecutions);
  const [filterStatus, setFilterStatus] = useState<string>("ALL");

  const filtered = executions.filter((exec) => {
    if (filterStatus === "ALL") return true;
    return exec.status === filterStatus;
  });

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "COMPLETED":
        return (
          <span className="flex items-center gap-1.5 px-2.5 py-0.5 border-2 border-black rounded-full text-[10px] font-bold bg-accent-green text-emerald-800">
            <ShieldCheck className="h-3 w-3" /> SUCCESS
          </span>
        );
      case "FAILED":
        return (
          <span className="flex items-center gap-1.5 px-2.5 py-0.5 border-2 border-black rounded-full text-[10px] font-bold bg-accent-pink text-rose-800 animate-pulse">
            <AlertTriangle className="h-3 w-3" /> FAILED
          </span>
        );
      case "RUNNING":
        return (
          <span className="flex items-center gap-1.5 px-2.5 py-0.5 border-2 border-black rounded-full text-[10px] font-bold bg-accent-blue text-primary">
            <RefreshCw className="h-3 w-3 animate-spin" /> RUNNING
          </span>
        );
      default:
        return (
          <span className="flex items-center gap-1.5 px-2.5 py-0.5 border-2 border-black rounded-full text-[10px] font-bold bg-neutral-bg text-secondary">
            <PlayCircle className="h-3 w-3" /> {status}
          </span>
        );
    }
  };

  return (
    <div className="flex flex-col gap-6 animate-in fade-in duration-200">
      {/* Filtering Header */}
      <div className="flex items-center justify-between border-b-2 border-black pb-3">
        <div>
          <h4 className="font-cursive text-xl font-bold">Workflow Executions Log</h4>
          <p className="font-sans text-xs text-secondary mt-0.5">
            Audit trail of all event-driven executions
          </p>
        </div>

        {/* Status Dropdown */}
        <select
          value={filterStatus}
          onChange={(e) => setFilterStatus(e.target.value)}
          className="px-3 py-1.5 border-2 border-black rounded-full font-sans text-xs font-bold bg-white cursor-pointer shadow-flat-offset-xs"
        >
          <option value="ALL">All Run Statuses</option>
          <option value="COMPLETED">Success</option>
          <option value="FAILED">Failed</option>
          <option value="RUNNING">Running</option>
          <option value="QUEUED">Queued</option>
        </select>
      </div>

      {/* Execution List table */}
      {filtered.length === 0 ? (
        <div className="border-2 border-dashed border-black/20 rounded-sketchy p-10 text-center bg-white rotate-[0.5deg]">
          <PlayCircle className="h-10 w-10 text-secondary/30 mx-auto mb-3" />
          <p className="font-cursive text-lg text-secondary/50">No executions found</p>
          <p className="font-sans text-xs text-secondary/40 mt-1">
            There are no matching run log trails recorded.
          </p>
        </div>
      ) : (
        <div className="bg-white border-2 border-black rounded-sketchy shadow-flat-offset overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left font-sans text-xs border-collapse">
              <thead>
                <tr className="bg-neutral-bg/60 border-b-2 border-black font-semibold text-secondary">
                  <th className="px-5 py-3">Run ID / Workflow</th>
                  <th className="px-5 py-3">Trigger Event</th>
                  <th className="px-5 py-3">Started At</th>
                  <th className="px-5 py-3">Duration</th>
                  <th className="px-5 py-3">Status</th>
                  <th className="px-5 py-3 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-black/10">
                {filtered.map((exec) => {
                  const wfName = exec.workflows?.name || "Deleted Workflow";
                  const startStr = new Date(exec.started_at).toLocaleString();

                  return (
                    <tr key={exec.id} className="hover:bg-neutral-bg/30 transition-colors">
                      <td className="px-5 py-4">
                        <div className="flex flex-col">
                          <span className="font-bold text-primary truncate max-w-[200px]">
                            {wfName}
                          </span>
                          <span className="font-mono text-[9px] text-secondary/60 mt-0.5">
                            {exec.id}
                          </span>
                        </div>
                      </td>
                      <td className="px-5 py-4 font-mono text-[10px] text-secondary">
                        {exec.trigger_event}
                      </td>
                      <td className="px-5 py-4 text-secondary">{startStr}</td>
                      <td className="px-5 py-4 font-mono font-bold text-secondary">
                        {exec.duration ? `${exec.duration} ms` : "—"}
                      </td>
                      <td className="px-5 py-4">{getStatusBadge(exec.status)}</td>
                      <td className="px-5 py-4 text-right">
                        <Link
                          href={`/workflows/executions/${exec.id}`}
                          className="inline-flex items-center gap-1.5 px-3 py-1 bg-white hover:bg-neutral-bg border-2 border-black rounded-full font-sans text-[10px] font-bold shadow-flat-offset-xs active:translate-y-0.5 transition-all"
                        >
                          Trace <ArrowRight className="h-3 w-3" />
                        </Link>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
