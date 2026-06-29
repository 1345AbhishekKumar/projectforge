"use client";

import { useState, useTransition } from "react";
import { Zap, Play, CheckSquare, ArrowRight, Save, Network, LayoutGrid, Info } from "lucide-react";
import { updateWorkflow } from "@/actions/workflow";
import { WorkflowDependencyGraph } from "./WorkflowDependencyGraph";

type ActionData = Record<string, unknown>;
type WorkflowAction = { type: string; data: ActionData };

type WorkflowData = {
  id: string;
  name: string;
  category?: string;
  trigger: string;
  enabled: boolean;
  conditions?: Record<string, unknown>;
  actions?: WorkflowAction[];
};

type ProjectSummary = { id: string; name: string };
type MemberSummary = { user_id: string; full_name: string | null; email: string };

type Props = {
  workflow: WorkflowData;
  orgId: string;
  projects: ProjectSummary[];
  members: MemberSummary[];
  allWorkflows: WorkflowData[];
};

export function WorkflowBuilder({ workflow, orgId, projects, members, allWorkflows }: Props) {
  const [activeTab, setActiveTab] = useState<"builder" | "dependency">("builder");
  const [selectedNode, setSelectedNode] = useState<"trigger" | "conditions" | "action">("trigger");

  // Local editable states
  const [name] = useState(workflow.name);
  const [category] = useState(workflow.category || "General");
  const [trigger, setTrigger] = useState(workflow.trigger);
  const [enabled, setEnabled] = useState(workflow.enabled);
  const [conditions, setConditions] = useState<Record<string, unknown>>(workflow.conditions || {});
  const [actions, setActions] = useState<WorkflowAction[]>(workflow.actions || []);

  const [saving, startTransition] = useTransition();
  const [savedSuccess, setSavedSuccess] = useState(false);

  const handleSave = () => {
    startTransition(async () => {
      const res = await updateWorkflow(workflow.id, orgId, {
        name,
        category,
        trigger,
        enabled,
        conditions,
        actions,
      });

      if (res.success) {
        setSavedSuccess(true);
        setTimeout(() => setSavedSuccess(false), 2000);
      }
    });
  };

  const handleActionLabelChange = (val: string) => {
    setActions((prev) =>
      prev.map((act, i) => {
        if (i === 0) {
          return { ...act, data: { ...act.data, label: val } };
        }
        return act;
      }),
    );
  };

  const handleActionDataChange = (key: string, val: string) => {
    setActions((prev) =>
      prev.map((act, i) => {
        if (i === 0) {
          return { ...act, data: { ...act.data, [key]: val } };
        }
        return act;
      }),
    );
  };

  const activeAction = actions[0] || { type: "notify_assignee", data: { label: "" } };

  return (
    <div className="flex flex-col gap-6 animate-in fade-in duration-200">
      {/* Top Toolbar */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between border-b-2 border-black pb-4 gap-4">
        <div>
          <h2 className="font-cursive text-2xl font-bold flex items-center gap-2">
            <LayoutGrid className="h-6 w-6 text-primary" />
            <span>Configure Workflow</span>
          </h2>
          <span className="font-mono text-[10px] text-secondary">Workflow ID: {workflow.id}</span>
        </div>

        {/* Toolbar Controls */}
        <div className="flex items-center gap-3 w-full sm:w-auto justify-end">
          <button
            onClick={() => setActiveTab(activeTab === "builder" ? "dependency" : "builder")}
            className="flex items-center gap-1.5 px-4 py-2 bg-white hover:bg-neutral-bg border-2 border-black rounded-full font-sans text-xs font-bold shadow-flat-offset-xs active:translate-y-0.5 transition-all cursor-pointer"
          >
            {activeTab === "builder" ? (
              <>
                <Network className="h-4 w-4" /> Dependency Graph
              </>
            ) : (
              <>
                <LayoutGrid className="h-4 w-4" /> Visual Canvas
              </>
            )}
          </button>

          <button
            onClick={handleSave}
            disabled={saving}
            className="flex items-center gap-1.5 px-5 py-2 bg-tertiary hover:bg-tertiary-hover text-white border-2 border-black rounded-full font-sans text-xs font-bold shadow-flat-offset-sm hover:-translate-y-0.5 active:translate-y-0.5 transition-all cursor-pointer disabled:opacity-40"
          >
            {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
            <span>{savedSuccess ? "Saved!" : "Save Changes"}</span>
          </button>
        </div>
      </div>

      {activeTab === "dependency" ? (
        <WorkflowDependencyGraph workflows={allWorkflows} />
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 min-h-[500px]">
          {/* Visual Canvas Block (Middle column) */}
          <div className="bg-neutral-bg bg-dot-grid border-2 border-black rounded-sketchy p-6 flex flex-col items-center justify-center relative lg:col-span-2 shadow-inner overflow-hidden min-h-[450px]">
            {/* Legend banner */}
            <span className="absolute top-4 left-4 font-sans text-[9px] font-bold bg-white border border-black/20 rounded px-2 py-0.5 select-none">
              Canvas (Interactive Elements)
            </span>

            {/* Nodes Stack */}
            <div className="flex flex-col items-center gap-6 z-10 w-full max-w-sm">
              {/* Trigger Node */}
              <button
                onClick={() => setSelectedNode("trigger")}
                className={`w-full p-4 border-2 border-black rounded-sketchy shadow-flat-offset-xs hover:-translate-y-0.5 transition-transform text-left bg-white relative cursor-pointer ${
                  selectedNode === "trigger" ? "ring-2 ring-tertiary" : ""
                }`}
              >
                <div className="absolute top-3 right-3 text-emerald-600">
                  <Zap className="h-4 w-4 fill-emerald-600/10" />
                </div>
                <span className="font-mono text-[9px] font-bold uppercase text-secondary">
                  TRIGGER
                </span>
                <h5 className="font-sans text-xs font-bold mt-1">Event: {trigger}</h5>
              </button>

              <ArrowRight className="h-4.5 w-4.5 rotate-90 text-primary" />

              {/* Conditions Node */}
              <button
                onClick={() => setSelectedNode("conditions")}
                className={`w-full p-4 border-2 border-black rounded-sketchy shadow-flat-offset-xs hover:-translate-y-0.5 transition-transform text-left bg-white relative cursor-pointer ${
                  selectedNode === "conditions" ? "ring-2 ring-tertiary" : ""
                }`}
              >
                <div className="absolute top-3 right-3 text-accent-yellow">
                  <CheckSquare className="h-4 w-4" />
                </div>
                <span className="font-mono text-[9px] font-bold uppercase text-secondary">
                  CONDITIONS
                </span>
                <h5 className="font-sans text-xs font-bold mt-1">
                  {Object.keys(conditions).length === 0
                    ? "Runs on all events"
                    : `Project ID = ${conditions.project_id ? "Scoped Project" : "Global"}`}
                </h5>
              </button>

              <ArrowRight className="h-4.5 w-4.5 rotate-90 text-primary" />

              {/* Action Node */}
              <button
                onClick={() => setSelectedNode("action")}
                className={`w-full p-4 border-2 border-black rounded-sketchy shadow-flat-offset-xs hover:-translate-y-0.5 transition-transform text-left bg-white relative cursor-pointer ${
                  selectedNode === "action" ? "ring-2 ring-tertiary" : ""
                }`}
              >
                <div className="absolute top-3 right-3 text-accent-blue">
                  <Play className="h-4 w-4" />
                </div>
                <span className="font-mono text-[9px] font-bold uppercase text-secondary">
                  ACTION
                </span>
                <h5 className="font-sans text-xs font-bold mt-1">Execute: {activeAction.type}</h5>
              </button>

              <ArrowRight className="h-4.5 w-4.5 rotate-90 text-primary" />

              {/* End Node */}
              <div className="w-20 h-10 border-2 border-dashed border-black rounded-full bg-neutral-bg flex items-center justify-center font-cursive text-xs font-bold select-none rotate-[-1deg]">
                End Run
              </div>
            </div>
          </div>

          {/* Configuration Form Panel (Right column) */}
          <div className="bg-white border-2 border-black rounded-sketchy p-6 shadow-flat-offset flex flex-col gap-6 rotate-[0.5deg]">
            <h4 className="font-cursive text-lg font-bold border-b border-black/10 pb-2">
              Node Configuration
            </h4>

            {selectedNode === "trigger" && (
              <div className="flex flex-col gap-4 animate-in fade-in duration-100">
                <span className="font-mono text-[9px] font-bold uppercase text-emerald-700 bg-accent-green/30 px-2 py-0.5 rounded w-fit border border-black/10">
                  Trigger Settings
                </span>
                <div>
                  <label className="font-sans text-xs font-semibold mb-1 block">
                    Trigger Event
                  </label>
                  <select
                    value={trigger}
                    onChange={(e) => setTrigger(e.target.value)}
                    className="w-full px-3 py-2 border-2 border-black rounded-sketchy-sm font-sans text-xs bg-white cursor-pointer"
                  >
                    <option value="task.created">When Task Created</option>
                    <option value="task.status_changed">When Status Changes</option>
                    <option value="task.completed">When Task Completed</option>
                    <option value="task.assigned">When Task Assigned</option>
                    <option value="sprint.ended">When Sprint Ends</option>
                  </select>
                </div>
              </div>
            )}

            {selectedNode === "conditions" && (
              <div className="flex flex-col gap-4 animate-in fade-in duration-100">
                <span className="font-mono text-[9px] font-bold uppercase text-amber-700 bg-accent-yellow/40 px-2 py-0.5 rounded w-fit border border-black/10">
                  Conditions Filters
                </span>
                <div>
                  <label className="font-sans text-xs font-semibold mb-1 block">
                    Project Scope
                  </label>
                  <select
                    value={conditions.project_id || ""}
                    onChange={(e) =>
                      setConditions(e.target.value ? { project_id: e.target.value } : {})
                    }
                    className="w-full px-3 py-2 border-2 border-black rounded-sketchy-sm font-sans text-xs bg-white cursor-pointer"
                  >
                    <option value="">All Projects (Global Scope)</option>
                    {projects.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            )}

            {selectedNode === "action" && (
              <div className="flex flex-col gap-4 animate-in fade-in duration-100">
                <span className="font-mono text-[9px] font-bold uppercase text-blue-700 bg-accent-blue/30 px-2 py-0.5 rounded w-fit border border-black/10">
                  Action outcome
                </span>
                <div>
                  <label className="font-sans text-xs font-semibold mb-1 block">Action Type</label>
                  <input
                    type="text"
                    disabled
                    value={activeAction.type}
                    className="w-full px-3 py-2 border-2 border-black rounded-sketchy-sm font-sans text-xs bg-neutral-bg/30 text-secondary"
                  />
                </div>

                {activeAction.type === "assign_to_user" && (
                  <div>
                    <label className="font-sans text-xs font-semibold mb-1 block">Assignee</label>
                    <select
                      value={activeAction.data?.label || ""}
                      onChange={(e) => handleActionLabelChange(e.target.value)}
                      className="w-full px-3 py-2 border-2 border-black rounded-sketchy-sm font-sans text-xs bg-white cursor-pointer"
                    >
                      <option value="org_owner">Organization Owner</option>
                      {members.map((m) => (
                        <option key={m.userId} value={m.userId}>
                          {m.name}
                        </option>
                      ))}
                    </select>
                  </div>
                )}

                {activeAction.type === "set_status" && (
                  <div>
                    <label className="font-sans text-xs font-semibold mb-1 block">
                      Target Status
                    </label>
                    <select
                      value={activeAction.data?.label || ""}
                      onChange={(e) => handleActionLabelChange(e.target.value)}
                      className="w-full px-3 py-2 border-2 border-black rounded-sketchy-sm font-sans text-xs bg-white cursor-pointer"
                    >
                      <option value="TODO">TODO</option>
                      <option value="IN_PROGRESS">IN_PROGRESS</option>
                      <option value="DONE">DONE</option>
                    </select>
                  </div>
                )}

                {(activeAction.type === "create_task" ||
                  activeAction.type === "notify_assignee") && (
                  <div>
                    <label className="font-sans text-xs font-semibold mb-1 block">
                      Parameter Input
                    </label>
                    <textarea
                      value={activeAction.data?.label || ""}
                      onChange={(e) => handleActionLabelChange(e.target.value)}
                      rows={2}
                      className="w-full px-3 py-2 border-2 border-black rounded-sketchy-sm font-sans text-xs bg-white"
                    />
                  </div>
                )}

                {activeAction.type === "ai_action" && (
                  <div className="flex flex-col gap-4">
                    <div>
                      <label className="font-sans text-xs font-semibold mb-1 block">
                        AI Prompt (Instruction)
                      </label>
                      <textarea
                        value={(activeAction.data?.prompt as string) || ""}
                        onChange={(e) => handleActionDataChange("prompt", e.target.value)}
                        rows={3}
                        className="w-full px-3 py-2 border-2 border-black rounded-sketchy-sm font-sans text-xs bg-white"
                      />
                    </div>

                    <div>
                      <label className="font-sans text-xs font-semibold mb-1 block">
                        AI Output Destination
                      </label>
                      <select
                        value={(activeAction.data?.output_type as string) || "comment"}
                        onChange={(e) => handleActionDataChange("output_type", e.target.value)}
                        className="w-full px-3 py-2 border-2 border-black rounded-sketchy-sm font-sans text-xs bg-white cursor-pointer"
                      >
                        <option value="comment">Add as Task Comment</option>
                        <option value="subtasks">Generate & Add Subtasks</option>
                        <option value="description">Update Task Description</option>
                      </select>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* General Properties Card */}
            <div className="border-t border-black/10 pt-4 flex flex-col gap-3 mt-auto">
              <label className="flex items-center gap-2 cursor-pointer select-none text-xs font-semibold">
                <input
                  type="checkbox"
                  checked={enabled}
                  onChange={(e) => setEnabled(e.target.checked)}
                  className="w-4 h-4 border-2 border-black rounded-sm cursor-pointer"
                />
                <span>Enable Automation Trigger</span>
              </label>

              <div className="bg-[#FFF2B2]/20 border border-black/10 p-3 rounded text-[10px] font-sans text-secondary flex gap-2">
                <Info className="h-4 w-4 shrink-0 text-primary" />
                <span>
                  Saving updates automatically registers a new locked version in version control.
                </span>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function Loader2(props: React.ComponentProps<typeof Network>) {
  return <Network {...props} className={(props.className || "") + " animate-spin"} />;
}
