"use client";

import React from "react";
import { usePathname } from "next/navigation";
import Link from "next/link";
import {
  LayoutDashboard,
  FolderKanban,
  Calendar,
  Users,
  Briefcase,
} from "lucide-react";
import { OrgSwitcher } from "@/components/orgs/OrgSwitcher";
import { GlobalSearchModal } from "@/components/search/GlobalSearchModal";
import { useTranslation } from "@/lib/i18n/useTranslation";
import { useOrgStore } from "@/store/orgStore";
import { PrefetchLink } from "@/components/shared/PrefetchLink";

// Import server action queries for prefetching
import { getUserProjects } from "@/actions/project";
import { getSprints } from "@/actions/sprint";
import { getOrganizationTasks } from "@/actions/task";
import { getOrganizationMembers } from "@/actions/membership";
import { getTeamDirectory } from "@/actions/team";
import { getActiveTimer, getUserTimeEntries } from "@/actions/timeEntry";

type SidebarLinkProps = {
  href: string;
  label: string;
  icon: React.ReactNode;
  isActive: boolean;
  accentColor: string;
  prefetchQueries?: Array<{
    queryKey: unknown[];
    queryFn: () => Promise<unknown>;
    staleTime?: number;
  }>;
};

function SidebarLink({ href, label, icon, isActive, accentColor, prefetchQueries }: SidebarLinkProps) {
  const className = `w-full text-left flex items-center gap-3 px-4 py-2.5 border-2 border-black font-sans text-sm font-bold shadow-flat-offset-sm transition-[transform,background-color,box-shadow] duration-200 active:scale-[0.97] cursor-pointer ${
    isActive
      ? `${accentColor} rotate-[-1deg] translate-y-0.5 shadow-none`
      : "bg-white hover:bg-neutral-bg hover:rotate-[0.5deg] hover:-translate-y-0.5"
  }`;

  if (prefetchQueries && prefetchQueries.length > 0) {
    return (
      <PrefetchLink href={href} prefetchQueries={prefetchQueries} className={className}>
        <span className="flex-shrink-0">{icon}</span>
        <span className="truncate">{label}</span>
      </PrefetchLink>
    );
  }

  return (
    <Link href={href} className={className}>
      <span className="flex-shrink-0">{icon}</span>
      <span className="truncate">{label}</span>
    </Link>
  );
}

export function Sidebar() {
  const pathname = usePathname();
  const { t } = useTranslation();
  const { activeOrgId } = useOrgStore();

  const getPrefetchQueries = (href: string) => {
    if (!activeOrgId) return undefined;

    switch (href) {
      case "/projects":
        return [
          {
            queryKey: ["projects", activeOrgId],
            queryFn: async () => { const r = await getUserProjects(activeOrgId); return r.data ?? []; },
          },
        ];
      case "/sprints":
        return [
          {
            queryKey: ["sprints", activeOrgId],
            queryFn: async () => { const r = await getSprints(activeOrgId); return r.data ?? []; },
          },
          {
            queryKey: ["orgTasks", activeOrgId],
            queryFn: async () => { const r = await getOrganizationTasks(activeOrgId); return r.data ?? []; },
          },
          {
            queryKey: ["members", activeOrgId],
            queryFn: async () => { const r = await getOrganizationMembers(activeOrgId); return r.data ?? []; },
          },
        ];
      case "/team":
        return [
          {
            queryKey: ["teamDirectory", activeOrgId],
            queryFn: async () => { const r = await getTeamDirectory(activeOrgId); return r.data ?? []; },
          },
        ];
      case "/time":
        return [
          {
            queryKey: ["activeTimer"],
            queryFn: async () => { const r = await getActiveTimer(); return r.data ?? null; },
          },
          {
            queryKey: ["timeEntries", activeOrgId],
            queryFn: async () => { const r = await getUserTimeEntries(activeOrgId); return r.data ?? []; },
          },
        ];
      default:
        return undefined;
    }
  };

  const links = [
    { href: "/dashboard", label: t("sidebar.dashboard", "Dashboard"), icon: <LayoutDashboard className="h-4 w-4" />, accent: "bg-accent-yellow" },
    { href: "/portfolios", label: t("sidebar.portfolios", "Portfolios"), icon: <Briefcase className="h-4 w-4" />, accent: "bg-accent-yellow" },
    { href: "/projects", label: t("sidebar.projects", "Projects Directory"), icon: <FolderKanban className="h-4 w-4" />, accent: "bg-accent-blue" },
    { href: "/sprints", label: t("sidebar.sprints", "Sprints"), icon: <Calendar className="h-4 w-4" />, accent: "bg-accent-pink" },
    { href: "/team", label: t("sidebar.team", "Team Directory"), icon: <Users className="h-4 w-4" />, accent: "bg-accent-green" },
  ];

  return (
    <>
      {/* Global search modal — rendered here so it's always in the tree */}
      <GlobalSearchModal />

      <aside className="w-64 bg-white border-r-2 border-black flex flex-col h-screen sticky top-0 z-40 p-6 gap-6">
        {/* Brand logo */}
        <Link
          href="/dashboard"
          className="flex items-center gap-2 cursor-pointer border-2 border-black p-3 bg-accent-yellow rounded-sketchy shadow-flat-offset-sm hover:-translate-y-0.5 active:scale-[0.97] transition-[transform,box-shadow] duration-200"
        >
          <div className="w-8 h-8 rounded-full bg-tertiary border-2 border-primary flex items-center justify-center font-cursive text-white text-lg font-bold">
            P
          </div>
          <span className="font-cursive text-2xl font-bold tracking-tight">ProjectForge</span>
        </Link>

        {/* Org Switcher */}
        <div className="border-b border-black/10 pb-4">
          <label className="font-sans text-[10px] font-bold text-secondary uppercase mb-2 block">{t("sidebar.workspace", "Workspace")}</label>
          <OrgSwitcher />
        </div>

        {/* Nav links */}
        <nav className="flex flex-col gap-3.5 flex-grow overflow-y-auto pr-1">
          <label className="font-sans text-[10px] font-bold text-secondary uppercase block">{t("sidebar.navigation", "Navigation")}</label>
          {links.map((link) => (
            <SidebarLink
              key={link.href}
              href={link.href}
              label={link.label}
              icon={link.icon}
              isActive={pathname === link.href || pathname.startsWith(link.href + "/")}
              accentColor={link.accent}
              prefetchQueries={getPrefetchQueries(link.href)}
            />
          ))}
        </nav>

        {/* Sidebar Footer */}
        <div className="border-t border-black/10 pt-4 flex flex-col gap-2">
          <div className="bg-neutral-bg border border-black/10 p-2.5 rounded-sketchy-sm text-center">
            <span className="font-cursive text-xs font-bold text-secondary">Intelligent Work OS</span>
          </div>
        </div>
      </aside>
    </>
  );
}
