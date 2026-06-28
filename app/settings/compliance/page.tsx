"use client";

import React, { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useUser } from "@clerk/nextjs";
import { Shield, Download, RefreshCw, Trash2, Calendar, AlertTriangle } from "lucide-react";

import { getComplianceSettings, updateComplianceSettings, runDataRetentionCleanup, exportAuditLogsCSV, exportProjectRisksCSV } from "@/actions/compliance";
import { getOrganizationMembers } from "@/actions/membership";
import { useOrgStore } from "@/store/orgStore";
import { WorkspacePageLayout } from "@/components/layout/WorkspacePageLayout";
import { SettingsSidebar } from "@/components/layout/SettingsSidebar";
import { AuditLogsViewer } from "@/components/audit-logs/AuditLogsViewer";
import { useToastStore } from "@/store/toastStore";

export default function ComplianceCenterPage() {
  const { user, isLoaded } = useUser();
  const queryClient = useQueryClient();
  const { activeOrgId } = useOrgStore();

  const [retentionDaysInput, setRetentionDaysInput] = useState<string>("");
  const [isUpdatingSettings, setIsUpdatingSettings] = useState(false);
  const [isRunningCleanup, setIsRunningCleanup] = useState(false);
  const [cleanupMessage, setCleanupMessage] = useState("");
  const [showCleanupConfirm, setShowCleanupConfirm] = useState(false);

  const { showToast: showBanner } = useToastStore();

  // Queries
  const { data: complianceSettings = null, isLoading: isSettingsLoading } = useQuery({
    queryKey: ["complianceSettings", activeOrgId],
    queryFn: async () => {
      if (!activeOrgId) return null;
      const res = await getComplianceSettings(activeOrgId);
      if (!res.success) throw new Error(res.error || "Failed to load settings");
      if (res.data) {
        setRetentionDaysInput(res.data.retentionDays ? String(res.data.retentionDays) : "");
      }
      return res.data || null;
    },
    enabled: !!activeOrgId,
  });

  const { data: members = [] } = useQuery({
    queryKey: ["members", activeOrgId],
    queryFn: async () => {
      if (!activeOrgId) return [];
      const res = await getOrganizationMembers(activeOrgId);
      return res.data || [];
    },
    enabled: !!activeOrgId,
  });

  const handleUpdateSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeOrgId) return;
    setIsUpdatingSettings(true);
    try {
      const parsedDays = retentionDaysInput ? parseInt(retentionDaysInput, 10) : null;
      if (parsedDays !== null && (isNaN(parsedDays) || parsedDays < 1)) {
        showBanner("error", "Retention period must be a valid number of days (at least 1 day)");
        return;
      }
      const res = await updateComplianceSettings(activeOrgId, parsedDays);
      if (res.success) {
        showBanner("success", "Compliance policy updated successfully.");
        queryClient.invalidateQueries({ queryKey: ["complianceSettings", activeOrgId] });
      } else {
        showBanner("error", res.error || "Failed to update compliance settings");
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : "An error occurred";
      showBanner("error", msg);
    } finally {
      setIsUpdatingSettings(false);
    }
  };

  const handleRunCleanup = async () => {
    if (!activeOrgId) return;
    setIsRunningCleanup(true);
    setCleanupMessage("");
    try {
      const res = await runDataRetentionCleanup(activeOrgId);
      if (res.success && res.data) {
        setCleanupMessage(
          `Cleanup completed! Deleted ${res.data.deletedTasks} tasks and ${res.data.deletedActivities} activities.`
        );
        showBanner("success", "Data retention cleanup executed successfully.");
        queryClient.invalidateQueries({ queryKey: ["auditLogs", activeOrgId] });
      } else {
        showBanner("error", res.error || "Failed to run cleanup");
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : "An error occurred";
      showBanner("error", msg);
    } finally {
      setIsRunningCleanup(false);
      setShowCleanupConfirm(false);
    }
  };

  const triggerDownload = (csvText: string, filename: string) => {
    const blob = new Blob([csvText], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", filename);
    link.style.visibility = "hidden";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleExportLogs = async () => {
    if (!activeOrgId) return;
    try {
      const res = await exportAuditLogsCSV(activeOrgId);
      if (res.success && res.data) {
        triggerDownload(res.data, `audit_trail_${activeOrgId}.csv`);
        showBanner("success", "Audit trail logs exported successfully.");
      } else {
        showBanner("error", res.error || "Failed to export audit trail");
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : "An error occurred";
      showBanner("error", msg);
    }
  };

  const handleExportRisks = async () => {
    if (!activeOrgId) return;
    try {
      const res = await exportProjectRisksCSV(activeOrgId);
      if (res.success && res.data) {
        triggerDownload(res.data, `project_risks_${activeOrgId}.csv`);
        showBanner("success", "Risks register exported successfully.");
      } else {
        showBanner("error", res.error || "Failed to export risks register");
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : "An error occurred";
      showBanner("error", msg);
    }
  };

  if (!isLoaded || isSettingsLoading) {
    return (
      <div className="min-h-screen w-full flex items-center justify-center bg-neutral-bg bg-dot-grid text-primary">
        <span className="font-cursive text-xl animate-pulse">Loading compliance whiteboard...</span>
      </div>
    );
  }

  const currentUserMember = members.find((m) => m.userId === user?.id);
  const isAdminOrOwner = currentUserMember?.role === "OWNER" || currentUserMember?.role === "ADMIN";

  if (!isAdminOrOwner) {
    return (
      <WorkspacePageLayout>
        <div className="flex-grow flex items-center justify-center p-6">
          <div className="bg-accent-pink border-2 border-black rounded-sketchy p-8 text-center max-w-lg shadow-flat-offset">
            <h2 className="font-cursive text-2xl font-bold mb-2">Access Restrained</h2>
            <p className="font-sans text-sm text-secondary">
              Only workspace administrators or owners can access the Compliance and Governance Center.
            </p>
          </div>
        </div>
      </WorkspacePageLayout>
    );
  }

  return (
    <WorkspacePageLayout>
      <div className="flex-1 max-w-6xl w-full mx-auto p-6 md:p-12">
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-8 items-start">
          <div className="lg:col-span-1">
            <SettingsSidebar />
          </div>
          
          <div className="lg:col-span-3 flex flex-col gap-8">
            <div className="bg-white border-2 border-black rounded-sketchy shadow-flat-offset p-6">
              <div className="flex items-center gap-3 mb-2">
                <Shield className="h-8 w-8 text-accent-pink shrink-0" />
                <h1 className="font-cursive text-3xl font-bold tracking-tight">Compliance & Governance Center</h1>
              </div>
              <p className="font-sans text-sm text-secondary">
                Configure data retention policies, audit ledger trails, and compliance exports under immutable security constraints.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-12 gap-8 items-start">
              {/* Retention Settings form */}
              <div className="md:col-span-6 bg-white border-2 border-black rounded-sketchy shadow-flat-offset p-6">
                <h2 className="font-cursive text-xl font-bold mb-4 flex items-center gap-2 text-primary">
                  <Calendar className="h-5 w-5 text-accent-pink" />
                  Data Retention Policy
                </h2>
                
                <form onSubmit={handleUpdateSettings} className="flex flex-col gap-4">
                  <div>
                    <label className="font-sans text-xs font-semibold mb-1 block text-primary">
                      Retention Period (Days)
                    </label>
                    <input
                      type="number"
                      value={retentionDaysInput}
                      onChange={(e) => setRetentionDaysInput(e.target.value)}
                      placeholder="Unlimited (keep all records)"
                      className="w-full px-3 py-2 border-2 border-black rounded-sketchy-sm font-sans text-sm bg-white focus:outline-none focus:ring-1 focus:ring-black text-primary"
                    />
                    <p className="font-sans text-[10px] text-secondary mt-1 leading-relaxed">
                      Set a policy period in days to age-out tasks and activity logs. Leave blank to retain data indefinitely.
                    </p>
                  </div>

                  <div className="bg-accent-yellow/20 border border-black p-3 rounded-sketchy-sm flex gap-2">
                    <AlertTriangle className="h-5 w-5 text-accent-yellow shrink-0" />
                    <p className="font-sans text-[10px] text-secondary leading-relaxed">
                      <strong>Warning:</strong> Updating retention settings does not automatically delete records immediately, but running cleanups will permanently delete old data.
                    </p>
                  </div>

                  <button
                    type="submit"
                    disabled={isUpdatingSettings}
                    className="w-full py-2 bg-accent-pink hover:bg-[#FFB2B2] text-primary border-2 border-black rounded-full font-sans text-xs font-bold shadow-flat-offset-sm active:translate-y-0.5 hover:-translate-y-0.5 transition-all cursor-pointer disabled:opacity-50"
                  >
                    {isUpdatingSettings ? "Updating..." : "Save Policy"}
                  </button>
                </form>
              </div>

              {/* Data Retention Cleanup Panel */}
              <div className="md:col-span-6 bg-white border-2 border-black rounded-sketchy shadow-flat-offset p-6 flex flex-col gap-6">
                <div>
                  <h2 className="font-cursive text-xl font-bold mb-4 flex items-center gap-2 text-primary">
                    <Trash2 className="h-5 w-5 text-accent-pink" />
                    Manual Retention Cleanup
                  </h2>
                {showCleanupConfirm ? (
                  <div className="flex flex-col gap-3 p-4 border-2 border-black rounded-sketchy bg-accent-pink/15">
                    <p className="font-mono text-[10px] font-bold text-center text-accent-orange leading-snug">
                      Permanently delete tasks and activities older than policy? This cannot be undone!
                    </p>
                    <div className="flex justify-center gap-4">
                      <button
                        onClick={() => setShowCleanupConfirm(false)}
                        className="px-4 py-1.5 border-2 border-black rounded-full hover:bg-neutral-bg font-sans text-xs font-bold transition-[transform,background-color] duration-150 active:scale-[0.95] cursor-pointer"
                      >
                        Cancel
                      </button>
                      <button
                        onClick={handleRunCleanup}
                        className="px-4 py-1.5 bg-accent-pink border-2 border-black rounded-full hover:bg-opacity-80 font-sans text-xs font-bold transition-[transform,background-color] duration-150 active:scale-[0.95] cursor-pointer"
                      >
                        Confirm Delete
                      </button>
                    </div>
                  </div>
                ) : (
                  <button
                    onClick={() => setShowCleanupConfirm(true)}
                    disabled={isRunningCleanup || !complianceSettings?.retentionDays}
                    className="w-full py-2 bg-white hover:bg-neutral-bg text-primary border-2 border-black rounded-full font-sans text-xs font-bold shadow-flat-offset-sm active:scale-[0.97] hover:-translate-y-0.5 transition-[transform,background-color,box-shadow,color] duration-150 cursor-pointer disabled:opacity-40 disabled:pointer-events-none"
                  >
                    {isRunningCleanup ? (
                      <span className="flex items-center justify-center gap-2">
                        <RefreshCw className="h-3.5 w-3.5 animate-spin" /> Running Cleanup...
                      </span>
                    ) : (
                      "Trigger Cleanup Now"
                    )}
                  </button>
                )}
                {cleanupMessage && (
                  <p className="mt-2 text-xs font-semibold text-emerald-800 bg-accent-green border-2 border-black rounded-sketchy-sm p-2.5 text-center animate-fade-in shadow-[2px_2px_0px_rgba(0,0,0,1)]">
                    {cleanupMessage}
                  </p>
                )}
              </div>

              <div className="border-t border-black/10 pt-4">
                <h2 className="font-cursive text-xl font-bold mb-2 flex items-center gap-2 text-primary">
                  <Download className="h-5 w-5 text-accent-pink" />
                  Compliance Reports
                </h2>
                <p className="font-sans text-xs text-secondary mb-4">
                  Export structured compliance CSV datasets. Audit logs ledger data cannot be updated or deleted.
                </p>

                <div className="grid grid-cols-2 gap-3">
                  <button
                    onClick={handleExportLogs}
                    className="py-2 bg-accent-yellow hover:bg-accent-yellow/80 text-primary border-2 border-black rounded-full font-sans text-[11px] font-bold shadow-flat-offset-sm active:scale-[0.97] hover:-translate-y-0.5 transition-[transform,background-color,box-shadow,color] duration-150 cursor-pointer flex items-center justify-center gap-1"
                  >
                    <Download className="h-3 w-3" /> Audit Trail CSV
                  </button>
                  <button
                    onClick={handleExportRisks}
                    className="py-2 bg-accent-yellow hover:bg-accent-yellow/80 text-primary border-2 border-black rounded-full font-sans text-[11px] font-bold shadow-flat-offset-sm active:scale-[0.97] hover:-translate-y-0.5 transition-[transform,background-color,box-shadow,color] duration-150 cursor-pointer flex items-center justify-center gap-1"
                  >
                    <Download className="h-3 w-3" /> Risks Register CSV
                  </button>
                </div>
              </div>
            </div>
          </div>

          {activeOrgId && <AuditLogsViewer orgId={activeOrgId} members={members} />}
            </div>
          </div>
        </div>
      </WorkspacePageLayout>
  );
}
