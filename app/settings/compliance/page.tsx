"use client";

import React, { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useUser } from "@clerk/nextjs";
import { Shield, Download, RefreshCw, Trash2, Calendar, AlertTriangle } from "lucide-react";

import { getComplianceSettings, updateComplianceSettings, runDataRetentionCleanup, exportAuditLogsCSV, exportProjectRisksCSV } from "@/actions/compliance";
import { getOrganizationMembers } from "@/actions/membership";
import { useOrgStore } from "@/store/orgStore";
import { Sidebar } from "@/components/layout/Sidebar";
import { NotificationBell } from "@/components/notifications/NotificationBell";
import { OrgSwitcher } from "@/components/orgs/OrgSwitcher";
import { AuditLogsTable } from "@/components/compliance/AuditLogsTable";

export default function ComplianceCenterPage() {
  const { user, isLoaded } = useUser();
  const queryClient = useQueryClient();
  const { activeOrgId } = useOrgStore();

  const [retentionDaysInput, setRetentionDaysInput] = useState<string>("");
  const [isUpdatingSettings, setIsUpdatingSettings] = useState(false);
  const [isRunningCleanup, setIsRunningCleanup] = useState(false);
  const [cleanupMessage, setCleanupMessage] = useState("");

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
        alert("Retention period must be a valid number of days (at least 1 day)");
        return;
      }
      const res = await updateComplianceSettings(activeOrgId, parsedDays);
      if (res.success) {
        alert("Compliance policy updated successfully.");
        queryClient.invalidateQueries({ queryKey: ["complianceSettings", activeOrgId] });
      } else {
        alert(res.error || "Failed to update compliance settings");
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : "An error occurred";
      alert(msg);
    } finally {
      setIsUpdatingSettings(false);
    }
  };

  const handleRunCleanup = async () => {
    if (!activeOrgId) return;
    if (!confirm("Are you sure you want to run the retention policy cleanup? All tasks and activity records older than the policy duration will be permanently deleted!")) return;
    setIsRunningCleanup(true);
    setCleanupMessage("");
    try {
      const res = await runDataRetentionCleanup(activeOrgId);
      if (res.success && res.data) {
        setCleanupMessage(
          `Cleanup completed! Deleted ${res.data.deletedTasks} tasks and ${res.data.deletedActivities} activities.`
        );
        queryClient.invalidateQueries({ queryKey: ["auditLogs", activeOrgId] });
      } else {
        alert(res.error || "Failed to run cleanup");
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : "An error occurred";
      alert(msg);
    } finally {
      setIsRunningCleanup(false);
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
      } else {
        alert(res.error || "Failed to export audit trail");
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : "An error occurred";
      alert(msg);
    }
  };

  const handleExportRisks = async () => {
    if (!activeOrgId) return;
    try {
      const res = await exportProjectRisksCSV(activeOrgId);
      if (res.success && res.data) {
        triggerDownload(res.data, `project_risks_${activeOrgId}.csv`);
      } else {
        alert(res.error || "Failed to export risks register");
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : "An error occurred";
      alert(msg);
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
      <div className="min-h-screen w-full bg-neutral-bg bg-dot-grid text-primary flex">
        <Sidebar />
        <div className="flex-grow flex items-center justify-center p-6">
          <div className="bg-accent-pink border-2 border-black rounded-sketchy p-8 text-center max-w-lg shadow-flat-offset">
            <h2 className="font-cursive text-2xl font-bold mb-2">Access Restrained</h2>
            <p className="font-sans text-sm text-secondary">
              Only workspace administrators or owners can access the Compliance and Governance Center.
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen w-full bg-neutral-bg bg-dot-grid text-primary flex">
      <Sidebar />

      <div className="flex-grow flex flex-col min-h-screen overflow-x-hidden">
        {/* Header */}
        <header className="border-b-2 border-black bg-white px-6 py-4 flex items-center justify-between sticky top-0 z-40 shadow-flat-offset-sm">
          <OrgSwitcher />
          <div className="flex items-center gap-4">
            <NotificationBell />
            <div className="hidden sm:flex items-center gap-2 border-2 border-black rounded-full px-3 py-1 bg-neutral-bg text-xs font-semibold text-secondary">
              {user?.primaryEmailAddress?.emailAddress}
            </div>
          </div>
        </header>

        {/* Content */}
        <div className="flex-1 max-w-6xl w-full mx-auto p-6 md:p-12 flex flex-col gap-8">
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
                  {isUpdatingSettings ? "Updating Policy..." : "Save Policy Settings"}
                </button>
              </form>
            </div>

            {/* Cleanup & Export actions */}
            <div className="md:col-span-6 bg-white border-2 border-black rounded-sketchy shadow-flat-offset p-6 flex flex-col gap-6">
              <div>
                <h2 className="font-cursive text-xl font-bold mb-2 flex items-center gap-2 text-primary">
                  <Trash2 className="h-5 w-5 text-accent-pink" />
                  Policy Cleanup Job
                </h2>
                <p className="font-sans text-xs text-secondary mb-4">
                  Manually trigger the workspace retention cleanup process based on the configured policy duration.
                </p>

                <button
                  onClick={handleRunCleanup}
                  disabled={isRunningCleanup || !complianceSettings?.retentionDays}
                  className="w-full py-2 bg-white hover:bg-neutral-bg text-primary border-2 border-black rounded-full font-sans text-xs font-bold shadow-flat-offset-sm active:translate-y-0.5 hover:-translate-y-0.5 transition-all cursor-pointer disabled:opacity-40 disabled:pointer-events-none"
                >
                  {isRunningCleanup ? (
                    <span className="flex items-center justify-center gap-2">
                      <RefreshCw className="h-3.5 w-3.5 animate-spin" /> Running Cleanup...
                    </span>
                  ) : (
                    "Trigger Cleanup Now"
                  )}
                </button>
                {cleanupMessage && (
                  <p className="mt-2 text-xs font-semibold text-emerald-700 bg-emerald-50 border border-emerald-500 rounded p-2 text-center animate-fade-in">
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
                    className="py-2 bg-accent-yellow hover:bg-[#FFEAA3] text-primary border-2 border-black rounded-full font-sans text-[11px] font-bold shadow-flat-offset-sm active:translate-y-0.5 hover:-translate-y-0.5 transition-all cursor-pointer flex items-center justify-center gap-1"
                  >
                    <Download className="h-3 w-3" /> Audit Trail CSV
                  </button>
                  <button
                    onClick={handleExportRisks}
                    className="py-2 bg-accent-yellow hover:bg-[#FFEAA3] text-primary border-2 border-black rounded-full font-sans text-[11px] font-bold shadow-flat-offset-sm active:translate-y-0.5 hover:-translate-y-0.5 transition-all cursor-pointer flex items-center justify-center gap-1"
                  >
                    <Download className="h-3 w-3" /> Risks Register CSV
                  </button>
                </div>
              </div>
            </div>
          </div>

          {activeOrgId && <AuditLogsTable activeOrgId={activeOrgId} />}
        </div>
      </div>
    </div>
  );
}
