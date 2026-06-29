"use client";

import { useState, useTransition } from "react";
import { Settings, Loader2, RefreshCw } from "lucide-react";
import { updateWorkflowPermissions } from "@/actions/workflowPermissions";
import { forcePayloadRetentionCleanup } from "@/actions/workflowExecution";

type WorkflowPermission = {
  role_name: string;
  can_create?: boolean;
  can_publish?: boolean;
  can_disable?: boolean;
  can_retry?: boolean;
  can_delete?: boolean;
  can_execute?: boolean;
  can_view_logs?: boolean;
};

type Props = {
  orgId: string;
  initialPermissions: WorkflowPermission[];
  canEdit: boolean;
};

const RETENTION_OPTIONS = [
  { value: "0", label: "Delete Immediately on Completion" },
  { value: "7", label: "Keep for 7 Days" },
  { value: "15", label: "Keep for 15 Days" },
  { value: "30", label: "Keep for 30 Days (Recommended)" },
  { value: "999", label: "Keep Payloads Forever (Caution)" },
] as const;

export function SettingsTab({ orgId, initialPermissions, canEdit }: Props) {
  const [retentionDays, setRetentionDays] = useState("30");
  const [retryPolicy, setRetryPolicy] = useState("3");
  const [timeout, setTimeoutVal] = useState("30");
  const [cleaning, setCleaning] = useState(false);
  const [cleanedCount, setCleanedCount] = useState<number | null>(null);

  const [permissions, setPermissions] = useState<WorkflowPermission[]>(initialPermissions);
  const [savingPermissionRole, setSavingPermissionRole] = useState<string | null>(null);
  const [, startTransition] = useTransition();

  const handleRunCleanup = async () => {
    if (
      !confirm(
        "Run payload snapshot retention cleanup now? This clears older payloads for completed executions.",
      )
    )
      return;
    setCleaning(true);
    setCleanedCount(null);
    try {
      const res = await forcePayloadRetentionCleanup(orgId, Number(retentionDays));
      if (res.success) {
        setCleanedCount(res.deletedCount);
      } else {
        alert(`Failed to clean payloads: ${res.error}`);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setCleaning(false);
    }
  };

  const handlePermissionChange = (roleName: string, key: string, val: boolean) => {
    if (!canEdit) return;
    setPermissions((prev) =>
      prev.map((p) => {
        if (p.role_name === roleName) {
          return { ...p, [key]: val };
        }
        return p;
      }),
    );

    // Save changes
    const rolePermission = permissions.find((p) => p.role_name === roleName);
    if (!rolePermission) return;

    const updatedPayload = {
      ...rolePermission,
      [key]: val,
    };

    setSavingPermissionRole(roleName);
    startTransition(async () => {
      await updateWorkflowPermissions(orgId, roleName, updatedPayload);
      setSavingPermissionRole(null);
    });
  };

  return (
    <div className="flex flex-col gap-8 animate-in fade-in duration-200">
      {/* Header */}
      <div className="border-b-2 border-black pb-3 flex items-center gap-2">
        <Settings className="h-5 w-5" />
        <div>
          <h4 className="font-cursive text-xl font-bold">Automation Configuration</h4>
          <p className="font-sans text-xs text-secondary mt-0.5">
            Manage execution retries, data retention, and granular role permissions
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Left Side: General Execution settings */}
        <div className="bg-white border-2 border-black rounded-sketchy p-6 shadow-flat-offset flex flex-col gap-6">
          <h5 className="font-cursive text-lg font-bold border-b border-black/10 pb-2">
            Execution Settings
          </h5>

          {/* Retention Option */}
          <div className="flex flex-col gap-1.5">
            <label className="font-sans text-xs font-semibold">Payload Snapshot Retention</label>
            <select
              value={retentionDays}
              onChange={(e) => setRetentionDays(e.target.value)}
              disabled={!canEdit}
              className="w-full px-3 py-2 border-2 border-black rounded-sketchy-sm font-sans text-xs bg-white cursor-pointer"
            >
              {RETENTION_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
            <p className="font-sans text-[10px] text-secondary/70">
              Limits DB storage growth. Automatically purges parameters and metadata snapshots of
              successful runs.
            </p>
          </div>

          {/* Execution Timeout */}
          <div className="flex flex-col gap-1.5">
            <label className="font-sans text-xs font-semibold">
              Step Timeout Timeout (Seconds)
            </label>
            <input
              type="number"
              value={timeout}
              onChange={(e) => setTimeoutVal(e.target.value)}
              disabled={!canEdit}
              className="w-full px-3 py-2 border-2 border-black rounded-sketchy-sm font-sans text-xs"
            />
          </div>

          {/* Action Retries */}
          <div className="flex flex-col gap-1.5">
            <label className="font-sans text-xs font-semibold">Max Retry Attempts</label>
            <select
              value={retryPolicy}
              onChange={(e) => setRetryPolicy(e.target.value)}
              disabled={!canEdit}
              className="w-full px-3 py-2 border-2 border-black rounded-sketchy-sm font-sans text-xs bg-white cursor-pointer"
            >
              <option value="1">1 Attempt (No Retries)</option>
              <option value="2">2 Attempts (1 Retry)</option>
              <option value="3">3 Attempts (2 Retries - Default)</option>
              <option value="4">4 Attempts (3 Retries)</option>
            </select>
          </div>

          {/* Manual purge trigger */}
          {canEdit && (
            <div className="border-t border-black/10 pt-4 flex items-center justify-between gap-4 mt-2">
              <div className="flex flex-col gap-0.5">
                <span className="font-sans text-xs font-bold text-primary">
                  Force Payload Retention Purge
                </span>
                <span className="font-sans text-[10px] text-secondary/70">
                  Deletes successful payloads immediately.
                </span>
              </div>
              <button
                onClick={handleRunCleanup}
                disabled={cleaning}
                className="flex items-center gap-1.5 px-4 py-2 bg-accent-pink hover:bg-red-200 border-2 border-black rounded-full font-sans text-xs font-bold shadow-flat-offset-xs active:translate-y-0.5 transition-all cursor-pointer disabled:opacity-40"
              >
                {cleaning ? (
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                ) : (
                  <RefreshCw className="h-3.5 w-3.5" />
                )}
                <span>Clean Now</span>
              </button>
            </div>
          )}

          {cleanedCount !== null && (
            <div className="bg-accent-green/20 border border-black/10 p-3 rounded text-center font-sans text-xs font-bold text-emerald-800 animate-in fade-in duration-100">
              Successfully cleared snapshots for {cleanedCount} completed execution runs.
            </div>
          )}
        </div>

        {/* Right Side: Granular permissions matrix */}
        <div className="bg-white border-2 border-black rounded-sketchy p-6 shadow-flat-offset rotate-[-0.5deg] flex flex-col gap-6">
          <div className="flex items-center justify-between border-b border-black/10 pb-2">
            <h5 className="font-cursive text-lg font-bold">Role Permissions Matrix</h5>
            {savingPermissionRole && (
              <span className="font-sans text-[10px] text-tertiary flex items-center gap-1">
                <Loader2 className="h-3 w-3 animate-spin" /> Saving changes...
              </span>
            )}
          </div>

          <div className="flex flex-col gap-4">
            {permissions.map((perm) => (
              <div
                key={perm.id || perm.role_name}
                className="border-2 border-black rounded-sketchy-sm p-4 bg-neutral-bg/25 flex flex-col gap-3"
              >
                <div className="flex justify-between items-center">
                  <span className="font-cursive text-sm font-bold bg-white border border-black/20 rounded px-2.5 py-0.5">
                    {perm.role_name}
                  </span>
                </div>

                <div className="grid grid-cols-2 gap-x-6 gap-y-2 text-xs font-sans">
                  {/* Create */}
                  <label className="flex items-center gap-2 cursor-pointer select-none">
                    <input
                      type="checkbox"
                      checked={perm.can_create}
                      disabled={!canEdit || perm.role_name === "OWNER"}
                      onChange={(e) =>
                        handlePermissionChange(perm.role_name, "can_create", e.target.checked)
                      }
                      className="w-4 h-4 border-2 border-black rounded-sm cursor-pointer"
                    />
                    <span>Can Create</span>
                  </label>

                  {/* Publish */}
                  <label className="flex items-center gap-2 cursor-pointer select-none">
                    <input
                      type="checkbox"
                      checked={perm.can_publish}
                      disabled={!canEdit || perm.role_name === "OWNER"}
                      onChange={(e) =>
                        handlePermissionChange(perm.role_name, "can_publish", e.target.checked)
                      }
                      className="w-4 h-4 border-2 border-black rounded-sm cursor-pointer"
                    />
                    <span>Can Publish</span>
                  </label>

                  {/* Disable */}
                  <label className="flex items-center gap-2 cursor-pointer select-none">
                    <input
                      type="checkbox"
                      checked={perm.can_disable}
                      disabled={!canEdit || perm.role_name === "OWNER"}
                      onChange={(e) =>
                        handlePermissionChange(perm.role_name, "can_disable", e.target.checked)
                      }
                      className="w-4 h-4 border-2 border-black rounded-sm cursor-pointer"
                    />
                    <span>Can Disable</span>
                  </label>

                  {/* Retry */}
                  <label className="flex items-center gap-2 cursor-pointer select-none">
                    <input
                      type="checkbox"
                      checked={perm.can_retry}
                      disabled={!canEdit || perm.role_name === "OWNER"}
                      onChange={(e) =>
                        handlePermissionChange(perm.role_name, "can_retry", e.target.checked)
                      }
                      className="w-4 h-4 border-2 border-black rounded-sm cursor-pointer"
                    />
                    <span>Can Retry Run</span>
                  </label>

                  {/* Delete */}
                  <label className="flex items-center gap-2 cursor-pointer select-none">
                    <input
                      type="checkbox"
                      checked={perm.can_delete}
                      disabled={!canEdit || perm.role_name === "OWNER"}
                      onChange={(e) =>
                        handlePermissionChange(perm.role_name, "can_delete", e.target.checked)
                      }
                      className="w-4 h-4 border-2 border-black rounded-sm cursor-pointer"
                    />
                    <span>Can Delete</span>
                  </label>

                  {/* View Logs */}
                  <label className="flex items-center gap-2 cursor-pointer select-none">
                    <input
                      type="checkbox"
                      checked={perm.can_view_logs}
                      disabled={!canEdit || perm.role_name === "OWNER"}
                      onChange={(e) =>
                        handlePermissionChange(perm.role_name, "can_view_logs", e.target.checked)
                      }
                      className="w-4 h-4 border-2 border-black rounded-sm cursor-pointer"
                    />
                    <span>Can View Logs</span>
                  </label>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
