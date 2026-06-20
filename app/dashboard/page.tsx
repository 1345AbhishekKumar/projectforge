"use client";

import { useUser, useAuth } from "@clerk/nextjs";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { LogOut, User as UserIcon, LayoutDashboard, Settings, BookOpen, CheckCircle, XCircle } from "lucide-react";
import { OrgSwitcher } from "@/components/orgs/OrgSwitcher";
import { NotificationBell } from "@/components/notifications/NotificationBell";
import { Sidebar } from "@/components/layout/Sidebar";
import { syncProfile } from "@/actions/profile";
import { InvitationBanner } from "@/components/invitations/InvitationBanner";
import { useOrgStore } from "@/store/orgStore";
import { seedData } from "@/actions/seeddata";

export default function DashboardPage() {
  const { user, isLoaded } = useUser();
  const { signOut } = useAuth();
  const router = useRouter();
  const { activeOrgId } = useOrgStore();

  const [isSeeding, setIsSeeding] = useState(false);
  const [banner, setBanner] = useState<{ type: "success" | "error"; text: string } | null>(null);

  const handleSignOut = async () => {
    await signOut();
    router.push("/sign-in");
  };

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
        <span className="font-cursive text-xl animate-pulse">Loading workspace...</span>
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
        <header className="w-full bg-white border-b-2 border-black px-6 py-3 flex items-center justify-between sticky top-0 z-50">
          <div className="flex items-center gap-4">
            {/* Brand Logo - Mobile only */}
            <div className="flex md:hidden items-center gap-2">
              <div className="w-8 h-8 rounded-full bg-tertiary border-2 border-primary flex items-center justify-center font-cursive text-white text-lg font-bold shadow-flat-offset-sm">
                P
              </div>
              <span className="font-cursive text-2xl font-bold tracking-tight">ProjectForge</span>
            </div>

            {/* Org Switcher - Mobile only */}
            <div className="md:hidden">
              <OrgSwitcher />
            </div>
          </div>

          <div className="flex items-center gap-4">
            <NotificationBell />

            <div className="hidden sm:flex items-center gap-2 border-2 border-black rounded-full px-3 py-1 bg-neutral-bg">
              <UserIcon className="h-4 w-4 text-secondary" />
              <span className="font-sans text-xs font-semibold text-secondary">
                {user?.primaryEmailAddress?.emailAddress}
              </span>
            </div>

            <button
              onClick={handleSignOut}
              className="flex items-center gap-2 bg-accent-pink hover:bg-[#FFB2B2] text-primary border-2 border-black font-sans text-xs font-bold px-4 py-2 rounded-full shadow-flat-offset-sm active:translate-y-0.5 hover:-translate-y-0.5 transition-all cursor-pointer"
            >
              <LogOut className="h-3.5 w-3.5" />
              Sign Out
            </button>
          </div>
        </header>

        {/* Mobile Org Switcher */}
        <div className="md:hidden px-6 pt-4">
          <OrgSwitcher />
        </div>

      {/* Toast Notification Banner */}
      {banner && (
        <div
          role="alert"
          className={`fixed top-4 right-4 z-[100] max-w-md border-2 border-black rounded-sketchy p-4 shadow-flat-offset transition-all transform ${
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
                Welcome to your intelligent whiteboard workspace. Here is a snapshot of your execution board.
              </p>
            </div>
            <button
              onClick={handleSeedData}
              disabled={isSeeding}
              className={`flex items-center gap-2 bg-accent-yellow hover:bg-[#FFE680] text-primary border-2 border-black font-sans text-xs font-bold px-4 py-2.5 rounded-full shadow-flat-offset-sm active:translate-y-0.5 hover:-translate-y-0.5 transition-all cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed`}
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
              className="bg-accent-blue border-2 border-black rounded-sketchy-sm p-6 shadow-flat-offset-sm rotate-[1.2deg] hover:rotate-0 transition-all duration-200 cursor-pointer hover:-translate-y-0.5 active:translate-y-0.5"
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
