"use client";

import { useState, useTransition } from "react";
import { ShieldCheck, AlertTriangle, RefreshCw, PlayCircle, Clock, Info } from "lucide-react";
import { retryWorkflowExecution } from "@/actions/workflowExecution";

type RunDetails = {
  id: string;
  trigger_event: string;
  started_at: string;
  has_payload_deleted?: boolean;
  payload_snapshot?: Record<string, unknown>;
};

type StepDetails = {
  id: string;
  step_number: number;
  action_type: string;
  status: string;
  duration?: number;
  error?: string;
  action_data?: Record<string, unknown>;
};

type Props = {
  runDetails: RunDetails;
  steps: StepDetails[];
  canRetry: boolean;
  orgId: string;
};

export function ExecutionTracer({ runDetails, steps, canRetry, orgId }: Props) {
  const [selectedStepIdx, setSelectedStepIdx] = useState<number | null>(null);
  const [isPending, startTransition] = useTransition();

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "COMPLETED":
        return <ShieldCheck className="h-4.5 w-4.5 text-emerald-600" />;
      case "FAILED":
        return <AlertTriangle className="h-4.5 w-4.5 text-rose-600 animate-pulse" />;
      case "RUNNING":
        return <RefreshCw className="h-4.5 w-4.5 text-tertiary animate-spin" />;
      default:
        return <PlayCircle className="h-4.5 w-4.5 text-secondary" />;
    }
  };

  const handleRetry = () => {
    if (!confirm("Re-run this execution using the saved payload?")) return;

    startTransition(async () => {
      const res = await retryWorkflowExecution(runDetails.id, orgId);
      if (res.success) {
        alert(
          "Workflow retry triggered successfully! A new run will appear in the executions list.",
        );
      } else {
        alert(`Failed to retry run: ${res.error}`);
      }
    });
  };

  const selectedStep = selectedStepIdx !== null ? steps[selectedStepIdx] : null;

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 min-h-[500px]">
      {/* Visual Timeline (Left 2 columns) */}
      <div className="bg-white border-2 border-black rounded-sketchy p-6 shadow-flat-offset lg:col-span-2 flex flex-col gap-6">
        <div>
          <h4 className="font-cursive text-xl font-bold">Execution Steps Trace</h4>
          <p className="font-sans text-xs text-secondary mt-0.5">
            Click any step to inspect action details and metadata
          </p>
        </div>

        {/* Step stack */}
        <div className="relative pl-8 border-l-2 border-dashed border-black/20 flex flex-col gap-6 pt-2">
          {/* Trigger Step (Step 0) */}
          <div className="relative">
            <div className="absolute -left-[41px] top-0 w-6 h-6 rounded-full bg-accent-yellow border-2 border-black flex items-center justify-center font-cursive text-[10px] font-bold shadow-flat-offset-xs select-none">
              T
            </div>
            <div className="flex flex-col gap-1">
              <span className="font-mono text-[9px] font-bold text-secondary uppercase">
                TRIGGER EVENT
              </span>
              <h5 className="font-sans text-xs font-bold text-primary">
                Received: {runDetails.trigger_event}
              </h5>
              <span className="font-sans text-[10px] text-secondary/60">
                Started at {new Date(runDetails.started_at).toLocaleTimeString()}
              </span>
            </div>
          </div>

          {/* Action Steps */}
          {steps.length === 0 ? (
            <div className="py-4 text-xs font-sans text-secondary/50 italic">
              No execution steps recorded.
            </div>
          ) : (
            steps.map((step, idx) => {
              const isSelected = selectedStepIdx === idx;
              return (
                <div
                  key={step.id}
                  onClick={() => setSelectedStepIdx(idx)}
                  className={`relative cursor-pointer p-4 border-2 border-black rounded-sketchy shadow-flat-offset-xs hover:-translate-y-0.5 transition-transform ${
                    isSelected ? "bg-accent-yellow/10 ring-2 ring-tertiary" : "bg-white"
                  }`}
                >
                  <div className="absolute -left-[42px] top-4 w-6 h-6 rounded-full bg-white border-2 border-black flex items-center justify-center shadow-flat-offset-xs">
                    {getStatusBadge(step.status)}
                  </div>

                  <div className="flex justify-between items-start">
                    <div className="flex flex-col gap-0.5">
                      <span className="font-mono text-[9px] font-bold text-secondary uppercase">
                        STEP {step.step_number} · {step.action_type}
                      </span>
                      <h5 className="font-sans text-xs font-bold text-primary">
                        Execute: {step.action_type}
                      </h5>
                    </div>
                    <span className="font-mono text-[10px] font-bold text-secondary">
                      {step.duration ? `${step.duration} ms` : "running"}
                    </span>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>

      {/* Parameter details panel (Right 1 column) */}
      <div className="bg-white border-2 border-black rounded-sketchy p-6 shadow-flat-offset rotate-[0.5deg] flex flex-col gap-6 justify-between">
        <div className="flex flex-col gap-6">
          <h4 className="font-cursive text-lg font-bold border-b border-black/10 pb-2">
            Parameters Inspector
          </h4>

          {/* Selected step details */}
          {selectedStep ? (
            <div className="flex flex-col gap-4 text-xs font-sans animate-in fade-in duration-100">
              <div>
                <span className="font-mono text-[9px] font-bold uppercase text-secondary">
                  Step Status
                </span>
                <div className="mt-1 font-bold flex items-center gap-1.5">
                  {getStatusBadge(selectedStep.status)}
                  <span>{selectedStep.status}</span>
                </div>
              </div>

              <div>
                <span className="font-mono text-[9px] font-bold uppercase text-secondary">
                  Action Type
                </span>
                <p className="mt-1 font-bold font-mono text-[10px]">{selectedStep.action_type}</p>
              </div>

              <div>
                <span className="font-mono text-[9px] font-bold uppercase text-secondary">
                  Parameters
                </span>
                <pre className="mt-1 bg-neutral-bg border border-black/15 p-2 rounded font-mono text-[10px] whitespace-pre-wrap overflow-x-auto max-h-32">
                  {JSON.stringify(selectedStep.action_data, null, 2)}
                </pre>
              </div>

              {selectedStep.error && (
                <div className="bg-accent-pink/20 border border-black/15 p-3 rounded text-rose-800 flex flex-col gap-1 leading-relaxed">
                  <span className="font-bold flex items-center gap-1">
                    <AlertTriangle className="h-4 w-4 shrink-0 text-rose-600" /> Error Trace:
                  </span>
                  <span className="font-mono text-[10px] break-all">{selectedStep.error}</span>
                </div>
              )}
            </div>
          ) : (
            <div className="text-xs font-sans text-secondary/60 bg-neutral-bg/25 border border-black/10 p-4 rounded text-center rotate-[-0.5deg]">
              Click any execution step on the left timeline to inspect input parameters and errors.
            </div>
          )}

          {/* Payload snapshot information */}
          <div className="border-t border-black/10 pt-4 flex flex-col gap-3">
            <span className="font-mono text-[9px] font-bold uppercase text-secondary">
              Payload Snapshot
            </span>

            {runDetails.has_payload_deleted ? (
              <div className="bg-neutral-bg border border-black/10 p-3 rounded text-[10px] font-sans text-secondary/60 leading-relaxed flex gap-2">
                <Info className="h-4 w-4 text-primary shrink-0" />
                <span>
                  The payload parameters snapshot was permanently deleted by the 30-day snapshot
                  retention policy.
                </span>
              </div>
            ) : (
              <pre className="bg-neutral-bg border border-black/15 p-2.5 rounded font-mono text-[10px] overflow-x-auto max-h-40 whitespace-pre-wrap">
                {JSON.stringify(runDetails.payload_snapshot, null, 2)}
              </pre>
            )}
          </div>
        </div>

        {/* Retry trigger controls */}
        {canRetry && (
          <div className="border-t border-black/10 pt-4 flex flex-col gap-3 mt-4">
            <button
              onClick={handleRetry}
              disabled={isPending || runDetails.has_payload_deleted}
              className="w-full flex items-center justify-center gap-1.5 py-2.5 bg-accent-yellow hover:bg-[#FFE680] text-primary border-2 border-black rounded-full font-sans text-xs font-bold shadow-flat-offset-sm active:translate-y-0.5 transition-all cursor-pointer disabled:opacity-40"
            >
              {isPending ? (
                <RefreshCw className="h-3.5 w-3.5 animate-spin" />
              ) : (
                <Clock className="h-3.5 w-3.5" />
              )}
              <span>Retry Run</span>
            </button>

            {runDetails.has_payload_deleted && (
              <span className="text-[10px] text-rose-700 text-center block">
                Cannot retry: Payload snapshot deleted
              </span>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
