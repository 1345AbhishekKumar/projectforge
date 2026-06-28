"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Users, Shield, History, Network, Download, Activity, SlidersHorizontal, Zap } from "lucide-react";
import { useTranslation } from "@/lib/i18n/useTranslation";

export function SettingsSidebar() {
  const pathname = usePathname();
  const { t } = useTranslation();

  const links = [
    {
      href: "/organizations/settings",
      label: t("settings.members", "Members"),
      icon: <Users className="h-4 w-4" />,
    },
    {
      href: "/settings/departments",
      label: t("sidebar.departments", "Departments"),
      icon: <Network className="h-4 w-4" />,
    },
    {
      href: "/settings/roles",
      label: t("sidebar.roles", "Roles & Permissions"),
      icon: <Shield className="h-4 w-4" />,
    },
    {
      href: "/settings/compliance",
      label: t("sidebar.compliance", "Compliance Center"),
      icon: <Shield className="h-4 w-4" />,
    },
    {
      href: "/settings/audit-logs",
      label: t("sidebar.auditLogs", "Audit Logs"),
      icon: <History className="h-4 w-4" />,
    },
    {
      href: "/settings/export",
      label: t("export.title", "Data Export Center"),
      icon: <Download className="h-4 w-4" />,
    },
    {
      href: "/settings/telemetry",
      label: t("sidebar.telemetry", "Telemetry Visualizer"),
      icon: <Activity className="h-4 w-4" />,
    },
    {
      href: "/settings/custom-fields",
      label: t("sidebar.customFields", "Custom Fields"),
      icon: <SlidersHorizontal className="h-4 w-4" />,
    },
  ];

  return (
    <aside className="w-full bg-white border-2 border-black rounded-sketchy p-4 flex flex-col gap-2 shadow-flat-offset-sm md:sticky md:top-24">
      <span className="font-cursive text-xl font-bold border-b border-black pb-2 mb-2 block">
        {t("settings.title", "Workspace Settings")}
      </span>
      <nav className="flex flex-col gap-1.5">
        {links.map((link) => {
          const isActive = pathname === link.href;
          return (
            <Link
              key={link.href}
              href={link.href}
              className={`w-full flex items-center gap-2 px-3 py-2 rounded-md font-sans text-sm transition-all cursor-pointer ${
                isActive
                  ? "bg-neutral-bg font-bold border-l-4 border-black pl-2"
                  : "text-secondary hover:text-primary hover:bg-neutral-bg"
              }`}
            >
              {link.icon}
              <span>{link.label}</span>
            </Link>
          );
        })}
      </nav>
    </aside>
  );
}
