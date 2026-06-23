"use client";

import React, { useState } from "react";
import { useUser } from "@clerk/nextjs";
import { useQuery } from "@tanstack/react-query";
import { 
  Download, 
  FolderKanban, 
  ListTodo, 
  BarChart4, 
  History, 
  ShieldCheck, 
  FileSpreadsheet, 
  FileText
} from "lucide-react";

import { useOrgStore } from "@/store/orgStore";
import { Sidebar } from "@/components/layout/Sidebar";
import { OrgSwitcher } from "@/components/orgs/OrgSwitcher";
import { Navbar } from "@/components/layout/Navbar";
import { getOrganizationMembers } from "@/actions/membership";
import { exportDataAction } from "@/actions/export";
import { useTranslation } from "@/lib/i18n/useTranslation";
import { useToastStore } from "@/store/toastStore";

export default function ExportCenterPage() {
  const { user, isLoaded } = useUser();
  const { activeOrgId } = useOrgStore();
  const { t } = useTranslation();

  const [exporting, setExporting] = useState<string | null>(null);
  const [integrityHash, setIntegrityHash] = useState<string>("");
  const [hashEntity, setHashEntity] = useState<string>("");

  const { showToast: showBanner } = useToastStore();

  const { data: members = [] } = useQuery({
    queryKey: ["members", activeOrgId],
    queryFn: async () => {
      if (!activeOrgId) return [];
      const res = await getOrganizationMembers(activeOrgId);
      return res.data || [];
    },
    enabled: !!activeOrgId,
  });

  const triggerDownload = (content: string, filename: string, mimeType: string) => {
    const blob = new Blob([content], { type: mimeType });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", filename);
    link.style.visibility = "hidden";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleExport = async (type: "projects" | "tasks" | "reports" | "audit_logs", format: "csv" | "excel" | "pdf") => {
    if (!activeOrgId) return;

    if (format === "pdf") {
      // PDF is handled by print layout in a new tab
      window.open(`/settings/export/print?type=${type}&orgId=${activeOrgId}`, "_blank");
      return;
    }

    const exportKey = `${type}-${format}`;
    setExporting(exportKey);
    try {
      const res = await exportDataAction(activeOrgId, type, format);
      if (res.success && res.data) {
        const mime = format === "csv" ? "text/csv;charset=utf-8;" : "application/vnd.ms-excel;charset=utf-8;";
        triggerDownload(res.data as string, res.filename || `export.${format}`, mime);
        if (res.hash) {
          setIntegrityHash(res.hash);
          setHashEntity(type.replace("_", " ").toUpperCase());
        }
        showBanner("success", t("export.success", "Data exported successfully."));
      } else {
        showBanner("error", res.error || t("common.error", "Failed to export data"));
      }
    } catch (err) {
      showBanner("error", err instanceof Error ? err.message : t("common.error", "An error occurred"));
    } finally {
      setExporting(null);
    }
  };

  if (!isLoaded) {
    return (
      <div className="min-h-screen w-full flex items-center justify-center bg-neutral-bg bg-dot-grid text-primary">
        <span className="font-cursive text-xl animate-pulse">{t("common.loading", "Loading...")}</span>
      </div>
    );
  }

  const currentUserMember = members.find((m) => m.userId === user?.id);
  const isAdminOrOwner = currentUserMember?.role === "OWNER" || currentUserMember?.role === "ADMIN";

  const cards = [
    {
      id: "projects",
      title: t("export.projectsCard", "Projects List"),
      desc: t("export.projectsDesc", "Export a list of all projects, including statuses and metadata."),
      icon: <FolderKanban className="h-6 w-6 text-accent-blue" />,
      allowed: true,
    },
    {
      id: "tasks",
      title: t("export.tasksCard", "Tasks List"),
      desc: t("export.tasksDesc", "Export all workspace tasks with priority, status, estimates, and assignees."),
      icon: <ListTodo className="h-6 w-6 text-accent-yellow" />,
      allowed: true,
    },
    {
      id: "reports",
      title: t("export.reportsCard", "Analytics & Reports"),
      desc: t("export.reportsDesc", "Export workload capacity, health scores, and sprint velocities."),
      icon: <BarChart4 className="h-6 w-6 text-accent-green" />,
      allowed: true,
    },
    {
      id: "audit_logs",
      title: t("export.auditLogsCard", "Audit Trails Log"),
      desc: t("export.auditLogsDesc", "Export organization-wide immutable audit trail logs."),
      icon: <History className="h-6 w-6 text-accent-pink" />,
      allowed: isAdminOrOwner,
    },
  ] as const;

  return (
    <div className="min-h-screen w-full bg-neutral-bg bg-dot-grid text-primary flex">


      <div className="hidden md:block">
        <Sidebar />
      </div>

      <div className="flex-grow flex flex-col min-h-screen overflow-x-hidden">
        {/* Navbar */}
        <Navbar />

        {/* Mobile Org Switcher */}
        <div className="md:hidden px-6 pt-4">
          <OrgSwitcher />
        </div>

        {/* Content */}
        <div className="flex-1 max-w-5xl w-full mx-auto p-6 md:p-12 flex flex-col gap-8">
          <div className="bg-white border-2 border-black rounded-sketchy shadow-flat-offset p-6">
            <h1 className="font-cursive text-3xl font-bold tracking-tight mb-2">
              {t("export.title", "Data Export Center")}
            </h1>
            <p className="font-sans text-sm text-secondary">
              {t("export.description", "Export organizational records, project tasks, and audit logs in multiple secure formats.")}
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            {cards.map((card) => {
              if (!card.allowed) return null;

              return (
                <div 
                  key={card.id} 
                  className="bg-white border-2 border-black rounded-sketchy shadow-flat-offset p-6 flex flex-col justify-between gap-4"
                >
                  <div>
                    <div className="flex items-center gap-3 mb-2">
                      <div className="w-10 h-10 border-2 border-black rounded-full flex items-center justify-center bg-white shadow-flat-offset-xs">
                        {card.icon}
                      </div>
                      <h2 className="font-cursive text-xl font-bold">{card.title}</h2>
                    </div>
                    <p className="font-sans text-xs text-secondary leading-relaxed">
                      {card.desc}
                    </p>
                  </div>

                  <div className="grid grid-cols-3 gap-2.5 mt-2">
                    <button
                      onClick={() => handleExport(card.id, "csv")}
                      disabled={exporting !== null}
                      className="py-2 bg-white hover:bg-neutral-bg border-2 border-black rounded-full font-sans text-xs font-bold shadow-flat-offset-xs active:scale-[0.97] hover:-translate-y-0.5 transition-[transform,background-color,box-shadow,color] duration-150 cursor-pointer flex items-center justify-center gap-1 disabled:opacity-40"
                    >
                      <Download className="h-3.5 w-3.5" />
                      {exporting === `${card.id}-csv` ? "..." : "CSV"}
                    </button>

                    <button
                      onClick={() => handleExport(card.id, "excel")}
                      disabled={exporting !== null}
                      className="py-2 bg-white hover:bg-neutral-bg border-2 border-black rounded-full font-sans text-xs font-bold shadow-flat-offset-xs active:scale-[0.97] hover:-translate-y-0.5 transition-[transform,background-color,box-shadow,color] duration-150 cursor-pointer flex items-center justify-center gap-1 disabled:opacity-40"
                    >
                      <FileSpreadsheet className="h-3.5 w-3.5" />
                      {exporting === `${card.id}-excel` ? "..." : "Excel"}
                    </button>

                    <button
                      onClick={() => handleExport(card.id, "pdf")}
                      className="py-2 bg-accent-pink hover:bg-accent-pink/80 border-2 border-black rounded-full font-sans text-xs font-bold shadow-flat-offset-xs active:scale-[0.97] hover:-translate-y-0.5 transition-[transform,background-color,box-shadow,color] duration-150 cursor-pointer flex items-center justify-center gap-1"
                    >
                      <FileText className="h-3.5 w-3.5" />
                      PDF
                    </button>
                  </div>
                </div>
              );
            })}
          </div>

          {integrityHash && (
            <div className="bg-accent-yellow/10 border-2 border-black rounded-sketchy p-6 shadow-flat-offset flex flex-col gap-3 relative rotate-[0.5deg]">
              <div className="flex items-center gap-2 text-primary">
                <ShieldCheck className="h-6 w-6 text-accent-green" />
                <h3 className="font-cursive text-xl font-bold">
                  {t("export.tamperProof", "Tamper-Proof Verification")} ({hashEntity})
                </h3>
              </div>
              <p className="font-sans text-xs text-secondary leading-relaxed">
                {t("export.verifyDesc", "Verify the integrity signature below to guarantee the exported audit logs have not been tampered with.")}
              </p>
              <div className="bg-white border-2 border-black p-3 rounded-sketchy-sm font-mono text-[10px] select-all break-all shadow-flat-offset-sm">
                <span className="font-sans font-bold text-primary mr-2">SHA-256 HMAC:</span>
                {integrityHash}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
