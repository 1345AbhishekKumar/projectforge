"use client";

import { useUser } from "@clerk/nextjs";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { LayoutDashboard, Settings, BookOpen, CheckCircle, XCircle } from "lucide-react";
import { OrgSwitcher } from "@/components/orgs/OrgSwitcher";
import { Navbar } from "@/components/layout/Navbar";
import { Sidebar } from "@/components/layout/Sidebar";
import { syncProfile } from "@/actions/profile";
import { InvitationBanner } from "@/components/invitations/InvitationBanner";
import { useOrgStore } from "@/store/orgStore";
import { seedData } from "@/actions/seeddata";
import { useTranslation } from "@/lib/i18n/useTranslation";

export default function DashboardPage() {
  const { user, isLoaded } = useUser();
  const router = useRouter();
  const { activeOrgId } = useOrgStore();
  const { t } = useTranslation();

  const [isSeeding, setIsSeeding] = useState(false);
  const [banner, setBanner] = useState<{ type: "success" | "error"; text: string } | null>(null);

  const showBanner = (type: "success" | "error", text: string) => {
    setBanner({ type, text });
    setTimeout(() => setBanner(null), 4000);
  };

  const handleSeedData = async () => {
    if (!activeOrgId) {
      showBanner("error", "Please select or create an organization workspace first!");
      return;
    }
    setIsSeeding(true);
    try {
      const res = await seedData(activeOrgId);
      if (res.success) {
        showBanner("success", "Database seeded successfully! Reloading workspace...");
        setTimeout(() => {
          router.refresh();
        }, 1500);
      } else {
        showBanner("error", res.error || "Failed to seed database");
      }
    } catch {
      showBanner("error", "An unexpected error occurred during seeding");
    } finally {
      setIsSeeding(false);
    }
  };

  // Sync Clerk user → InsForge profiles table on first load
  useEffect(() => {
    syncProfile();
  }, []);

  if (!isLoaded) {
    return (
      <div className="min-h-screen w-full flex items-center justify-center bg-neutral-bg bg-dot-grid text-primary">
        <span className="font-cursive text-xl animate-pulse">
          {t("dashboard.loading", "Loading workspace...")}
        </span>
      </div>
    );
  }

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

      {/* Toast Notification Banner */}
      {banner && (
        <div
          role="alert"
          className={`fixed top-4 right-4 z-[100] max-w-md border-2 border-black rounded-sketchy p-4 shadow-flat-offset transition-[transform,opacity] transform ${
            banner.type === "success" ? "bg-accent-green" : "bg-accent-pink"
          }`}
        >
          <div className="flex items-center gap-2 font-sans font-bold text-sm">
            {banner.type === "success" ? (
              <CheckCircle className="h-5 w-5 text-primary" />
            ) : (
              <XCircle className="h-5 w-5 text-primary" />
            )}
            {banner.text}
          </div>
        </div>
      )}

      {/* Main Content */}
      <div className="flex-1 max-w-6xl w-full mx-auto p-6 md:p-12 flex flex-col gap-8">
        <InvitationBanner />
        <div className="bg-white border-2 border-black rounded-sketchy shadow-flat-offset p-8">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
            <div>
              <h1 className="font-cursive text-4xl font-bold mb-2">
                Hey, {user?.firstName || "Collaborator"}! 👋
              </h1>
              <p className="font-sans text-sm text-secondary">
                Welcome to your whiteboard workspace. Here is a snapshot of your execution board.
              </p>
            </div>
            <button
              onClick={handleSeedData}
              disabled={isSeeding}
              className={`flex items-center gap-2 bg-accent-yellow hover:bg-accent-yellow/80 text-primary border-2 border-black font-sans text-xs font-bold px-4 py-2.5 rounded-full shadow-flat-offset-sm active:scale-[0.97] hover:-translate-y-0.5 transition-[transform,background-color,box-shadow,color] duration-150 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed`}
            >
              🌱 {isSeeding ? "Seeding..." : "Seed Data"}
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* Widget 1: Active Workspace */}
            <div className="bg-accent-yellow border-2 border-black rounded-sketchy-sm p-6 shadow-flat-offset-sm rotate-[-1deg] hover:rotate-0 transition-transform duration-200">
              <div className="flex items-center gap-2 mb-3">
                <LayoutDashboard className="h-5 w-5" />
                <h3 className="font-cursive text-xl font-bold">Active Board</h3>
              </div>
              <p className="font-sans text-xs text-secondary leading-relaxed">
                You are currently inside the default workspace sandbox. Create or join an organization to start structuring team project backlogs.
              </p>
            </div>

            {/* Widget 2: Settings */}
            <div
              onClick={() => router.push("/organizations/settings")}
              className="bg-accent-blue border-2 border-black rounded-sketchy-sm p-6 shadow-flat-offset-sm rotate-[1.2deg] hover:rotate-0 transition-[transform,background-color,box-shadow] duration-200 cursor-pointer hover:-translate-y-0.5 active:scale-[0.97]"
            >
              <div className="flex items-center gap-2 mb-3">
                <Settings className="h-5 w-5" />
                <h3 className="font-cursive text-xl font-bold">Workspace Setup</h3>
              </div>
              <p className="font-sans text-xs text-secondary leading-relaxed">
                Authentication and session gates are fully initialized. Role allocations, member list, and tenant routing can be configured next.
              </p>
            </div>

            {/* Widget 3: Resources */}
            <div className="bg-accent-green border-2 border-black rounded-sketchy-sm p-6 shadow-flat-offset-sm rotate-[-0.5deg] hover:rotate-0 transition-transform duration-200">
              <div className="flex items-center gap-2 mb-3">
                <BookOpen className="h-5 w-5" />
                <h3 className="font-cursive text-xl font-bold">Design Tokens</h3>
              </div>
              <p className="font-sans text-xs text-secondary leading-relaxed">
                All visual parameters are derived from our sketchy system token mappings, rendering consistent paper grid canvases.
              </p>
            </div>
          </div>
        </div>
      </div>
      </div>
    </div>
  );
}
