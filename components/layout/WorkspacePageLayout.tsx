"use client";

import React from "react";
import { Sidebar } from "@/components/layout/Sidebar";
import { Navbar } from "@/components/layout/Navbar";
import { OrgSwitcher } from "@/components/orgs/OrgSwitcher";

interface WorkspacePageLayoutProps {
  children: React.ReactNode;
}

export function WorkspacePageLayout({ children }: WorkspacePageLayoutProps) {
  return (
    <div className="min-h-screen w-full bg-neutral-bg bg-dot-grid text-primary flex">
      {/* Sidebar - Desktop only */}
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

        {children}
      </div>
    </div>
  );
}
