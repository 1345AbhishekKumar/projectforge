"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { ArrowDownToLine, FileCode, Users, Send } from "lucide-react";
import { createWorkflow } from "@/actions/workflow";

type WorkflowActionShape = { type: string; data: { label: string } };

type Props = {
  orgId: string;
  onImportComplete?: (newWf: {
    id: string;
    name: string;
    trigger: string;
    conditions: Record<string, unknown>;
    actions: WorkflowActionShape[];
    enabled: boolean;
    category: string;
    status: string;
    created_at: string;
  }) => void;
};

const TEMPLATE_CARDS = [
  {
    name: "Auto-Notify Assignee on Assignment",
    description:
      "Sends an in-app notification to the assignee immediately when they are assigned a task.",
    category: "Task",
    trigger: "task.assigned",
    conditions: {},
    actions: [
      {
        type: "notify_assignee",
        data: { label: "You have been assigned a new task. Please review." },
      },
    ],
    icon: Users,
    color: "bg-accent-blue/15",
  },
  {
    name: "Create Code Review on Task Completed",
    description:
      "Generates a secondary 'Code Review' task in the same project when a core task changes status to DONE.",
    category: "DevOps",
    trigger: "task.completed",
    conditions: {},
    actions: [{ type: "create_task", data: { label: "Review Completed Code Merge" } }],
    icon: FileCode,
    color: "bg-accent-yellow/15",
  },
  {
    name: "Sprint Complete Report Generator",
    description:
      "Auto-notifies the organization lead or team channel with details when a sprint ends.",
    category: "Sprint",
    trigger: "sprint.ended",
    conditions: {},
    actions: [
      {
        type: "notify_assignee",
        data: { label: "Active sprint has ended. Review metrics report." },
      },
    ],
    icon: Send,
    color: "bg-accent-green/15",
  },
] as const;

export function TemplatesTab({ orgId, onImportComplete }: Props) {
  const [isPending, startTransition] = useTransition();
  const router = useRouter();

  const handleImport = (tpl: (typeof TEMPLATE_CARDS)[number]) => {
    if (!confirm(`Import template "${tpl.name}"?`)) return;

    startTransition(async () => {
      const res = await createWorkflow(
        orgId,
        tpl.name,
        tpl.trigger,
        tpl.conditions,
        tpl.actions as WorkflowActionShape[],
        tpl.category,
      );

      if (res.success && res.data) {
        const newWf = {
          id: res.data.workflowId,
          name: tpl.name,
          trigger: tpl.trigger,
          conditions: tpl.conditions,
          actions: tpl.actions as WorkflowActionShape[],
          enabled: true,
          category: tpl.category,
          status: "ACTIVE",
          created_at: new Date().toISOString(),
        };
        if (onImportComplete) {
          onImportComplete(newWf);
        } else {
          router.push("/workflows?tab=list");
        }
      }
    });
  };

  return (
    <div className="flex flex-col gap-6 animate-in fade-in duration-200">
      <div className="border-b-2 border-black pb-3">
        <h4 className="font-cursive text-xl font-bold">Automation Templates Library</h4>
        <p className="font-sans text-xs text-secondary mt-0.5">
          Deploy pre-built workflow templates with a single click
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {TEMPLATE_CARDS.map((tpl, idx) => {
          const Icon = tpl.icon;
          return (
            <div
              key={idx}
              className="bg-white border-2 border-black rounded-sketchy p-5 shadow-flat-offset-xs flex flex-col justify-between gap-4 hover:-translate-y-0.5 transition-transform"
            >
              <div>
                {/* Header */}
                <div className="flex items-center justify-between mb-3">
                  <div className={`p-2 rounded-full border border-black/10 ${tpl.color}`}>
                    <Icon className="h-5 w-5 text-primary" />
                  </div>
                  <span className="font-mono text-[9px] uppercase font-bold bg-neutral-bg border border-black/20 rounded-full px-2 py-0.5">
                    {tpl.category}
                  </span>
                </div>

                {/* Info */}
                <h5 className="font-sans text-sm font-bold mb-1">{tpl.name}</h5>
                <p className="font-sans text-xs text-secondary leading-relaxed">
                  {tpl.description}
                </p>
              </div>

              {/* Install button */}
              <button
                onClick={() => handleImport(tpl)}
                disabled={isPending}
                className="w-full flex items-center justify-center gap-1.5 py-2 bg-accent-yellow hover:bg-[#FFE680] text-primary border-2 border-black rounded-full font-sans text-xs font-bold shadow-flat-offset-xs active:translate-y-0.5 transition-all cursor-pointer disabled:opacity-40"
              >
                <ArrowDownToLine className="h-3.5 w-3.5" />
                <span>Quick Deploy</span>
              </button>
            </div>
          );
        })}
      </div>
    </div>
  );
}
