"use client";

import React from "react";
import { useRouter, usePathname } from "next/navigation";
import {
  LayoutDashboard,
  FolderKanban,
  Calendar,
  Users,
  Activity,
  BarChart2,
  Clock,
  History,
  Briefcase,
  Shield,
} from "lucide-react";
import { OrgSwitcher } from "@/components/orgs/OrgSwitcher";
import { SearchTrigger } from "@/components/search/SearchTrigger";
import { GlobalSearchModal } from "@/components/search/GlobalSearchModal";

type SidebarLinkProps = {
  label: string;
  icon: React.ReactNode;
  isActive: boolean;
  onClick: () => void;
  accentColor: string;
};

function SidebarLink({ label, icon, isActive, onClick, accentColor }: SidebarLinkProps) {
  return (
    <button
      onClick={onClick}
      className={`w-full text-left flex items-center gap-3 px-4 py-2.5 border-2 border-black font-sans text-sm font-bold shadow-flat-offset-sm transition-all duration-200 cursor-pointer ${
        isActive
          ? `${accentColor} rotate-[-1deg] translate-y-0.5 shadow-none`
          : "bg-white hover:bg-neutral-bg hover:rotate-[0.5deg] hover:-translate-y-0.5"
      }`}
    >
      <span className="flex-shrink-0">{icon}</span>
      <span className="truncate">{label}</span>
    </button>
  );
}

export function Sidebar() {
  const router = useRouter();
  const pathname = usePathname();

  const links = [
    { href: "/dashboard", label: "Dashboard", icon: <LayoutDashboard className="h-4 w-4" />, accent: "bg-accent-yellow" },
    { href: "/portfolios", label: "Portfolios", icon: <Briefcase className="h-4 w-4" />, accent: "bg-accent-yellow" },
    { href: "/projects", label: "Projects Directory", icon: <FolderKanban className="h-4 w-4" />, accent: "bg-accent-blue" },
    { href: "/sprints", label: "Sprints", icon: <Calendar className="h-4 w-4" />, accent: "bg-accent-pink" },
    { href: "/team", label: "Team Directory", icon: <Users className="h-4 w-4" />, accent: "bg-accent-green" },
    { href: "/team/capacity", label: "Capacity Planner", icon: <Users className="h-4 w-4" />, accent: "bg-accent-green" },
    { href: "/activity", label: "Activity Feed", icon: <Activity className="h-4 w-4" />, accent: "bg-accent-yellow" },
    { href: "/analytics", label: "Analytics", icon: <BarChart2 className="h-4 w-4" />, accent: "bg-accent-blue" },
    { href: "/time", label: "Time Tracking", icon: <Clock className="h-4 w-4" />, accent: "bg-accent-pink" },
    { href: "/settings/audit-logs", label: "Audit Logs", icon: <History className="h-4 w-4" />, accent: "bg-accent-green" },
    { href: "/settings/roles", label: "Roles & Permissions", icon: <Shield className="h-4 w-4" />, accent: "bg-accent-yellow" },
    { href: "/settings/compliance", label: "Compliance Center", icon: <Shield className="h-4 w-4" />, accent: "bg-accent-pink" },
  ];

  return (
    <>
      {/* Global search modal — rendered here so it's always in the tree */}
      <GlobalSearchModal />

      <aside className="w-64 bg-white border-r-2 border-black flex flex-col h-screen sticky top-0 z-40 p-6 gap-6">
        {/* Brand logo */}
        <div
          className="flex items-center gap-2 cursor-pointer border-2 border-black p-3 bg-accent-yellow rounded-sketchy shadow-flat-offset-sm hover:-translate-y-0.5 active:translate-y-0.5 transition-all"
          onClick={() => router.push("/dashboard")}
        >
          <div className="w-8 h-8 rounded-full bg-tertiary border-2 border-primary flex items-center justify-center font-cursive text-white text-lg font-bold">
            P
          </div>
          <span className="font-cursive text-2xl font-bold tracking-tight">ProjectForge</span>
        </div>

        {/* Org Switcher */}
        <div className="border-b border-black/10 pb-4">
          <label className="font-sans text-[10px] font-bold text-secondary uppercase mb-2 block">Workspace</label>
          <OrgSwitcher />
        </div>

        {/* Search Trigger */}
        <div>
          <label className="font-sans text-[10px] font-bold text-secondary uppercase mb-2 block">Search</label>
          <SearchTrigger />
        </div>

        {/* Nav links */}
        <nav className="flex flex-col gap-3.5 flex-grow overflow-y-auto pr-1">
          <label className="font-sans text-[10px] font-bold text-secondary uppercase block">Navigation</label>
          {links.map((link) => (
            <SidebarLink
              key={link.href}
              label={link.label}
              icon={link.icon}
              isActive={pathname === link.href || pathname.startsWith(link.href + "/")}
              onClick={() => router.push(link.href)}
              accentColor={link.accent}
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
