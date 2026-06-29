"use client";

import { ArrowRight, Info, AlertTriangle, Network } from "lucide-react";

type WorkflowNode = {
  id: string;
  name: string;
  trigger: string;
  actions?: Array<{ type: string; data: Record<string, unknown> }>;
  enabled: boolean;
};

type Props = {
  workflows: WorkflowNode[];
};

export function WorkflowDependencyGraph({ workflows }: Props) {
  // Build a static analysis of connections/chains
  // Connection rules:
  // - If Workflow A triggers B (e.g. A's action type is set_status or create_task, and B's trigger is task.completed or task.created)
  const connections: Array<{ from: string; to: string; reason: string }> = [];

  workflows.forEach((wfA) => {
    const wfActions = wfA.actions || [];
    wfActions.forEach((act) => {
      // Check if action could trigger another workflow
      workflows.forEach((wfB) => {
        if (wfA.id === wfB.id) return; // Ignore self

        let isLinked = false;
        let reason = "";

        if (act.type === "set_status" || act.type === "archive_task") {
          if (wfB.trigger === "task.status_changed" || wfB.trigger === "task.completed") {
            isLinked = true;
            reason = "Updates task status";
          }
        } else if (act.type === "create_task") {
          if (wfB.trigger === "task.created") {
            isLinked = true;
            reason = "Creates new task";
          }
        }

        if (isLinked) {
          connections.push({
            from: wfA.name,
            to: wfB.name,
            reason,
          });
        }
      });
    });
  });

  // Simple cycle/loop detection (direct circular dependencies)
  const loops: string[] = [];
  connections.forEach((conn1) => {
    connections.forEach((conn2) => {
      if (conn1.from === conn2.to && conn1.to === conn2.from && !loops.includes(conn1.from)) {
        loops.push(conn1.from);
      }
    });
  });

  return (
    <div className="flex flex-col gap-6 animate-in fade-in duration-150">
      <div className="flex items-center gap-2 border-b border-black/10 pb-2">
        <Network className="h-5 w-5 text-tertiary" />
        <div>
          <h4 className="font-cursive text-lg font-bold">Workspace Dependency Chains</h4>
          <p className="font-sans text-[11px] text-secondary">
            Visualizes how workflows trigger other workflows based on action side-effects
          </p>
        </div>
      </div>

      {/* Warnings Panel */}
      {loops.length > 0 && (
        <div className="bg-accent-pink/20 border-2 border-black rounded-sketchy p-4 flex gap-3 text-rose-800 font-sans text-xs">
          <AlertTriangle className="h-5 w-5 text-rose-600 shrink-0" />
          <div className="flex flex-col gap-1">
            <span className="font-bold">Infinite Loop Warning Detected!</span>
            <span>
              The following workflows have direct circular trigger dependencies which can abort
              executions at run-time:
            </span>
            <ul className="list-disc pl-4 font-mono text-[10px] mt-1">
              {loops.map((name, i) => (
                <li key={i}>{name}</li>
              ))}
            </ul>
          </div>
        </div>
      )}

      {/* Dependency Links List */}
      <div className="flex flex-col gap-4">
        {connections.length === 0 ? (
          <div className="border border-black/10 rounded p-6 text-center bg-neutral-bg/25 font-sans text-xs text-secondary/60">
            No pipeline dependencies or triggers link these workflows. All automations execute
            independently.
          </div>
        ) : (
          <div className="flex flex-col gap-3">
            {connections.map((conn, idx) => (
              <div
                key={idx}
                className="flex flex-col sm:flex-row sm:items-center justify-between border-2 border-black rounded-sketchy-sm p-4 bg-white shadow-sm hover:translate-x-0.5 transition-transform"
              >
                <div className="flex items-center gap-3 font-sans text-xs">
                  <div className="flex flex-col">
                    <span className="font-bold text-primary">{conn.from}</span>
                    <span className="font-mono text-[9px] text-secondary/60">Source Workflow</span>
                  </div>

                  <div className="flex flex-col items-center px-4">
                    <span className="font-mono text-[9px] bg-accent-yellow border border-black/10 px-1.5 py-0.5 rounded text-secondary whitespace-nowrap">
                      {conn.reason}
                    </span>
                    <ArrowRight className="h-4.5 w-4.5 mt-1 text-secondary/40" />
                  </div>

                  <div className="flex flex-col">
                    <span className="font-bold text-primary">{conn.to}</span>
                    <span className="font-mono text-[9px] text-secondary/60">Target Workflow</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="bg-[#FFF2B2]/20 border border-black/10 p-3 rounded text-[11px] font-sans text-secondary flex gap-2 rotate-[0.5deg]">
        <Info className="h-4.5 w-4.5 shrink-0 text-primary" />
        <span>
          Workflow pipelines are traced automatically by matching state-changing actions (like
          modifying status) against active triggers. Keep pipelines linear to prevent performance
          latency.
        </span>
      </div>
    </div>
  );
}
