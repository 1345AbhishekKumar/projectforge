"use client";

import { useUser } from "@clerk/nextjs";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { ArrowRight } from "lucide-react";
import { WorkspacePageLayout } from "@/components/layout/WorkspacePageLayout";
import { NoWorkspacePlaceholder } from "@/components/layout/NoWorkspacePlaceholder";
import { syncProfile } from "@/actions/profile";
import { InvitationBanner } from "@/components/invitations/InvitationBanner";
import { useOrgStore } from "@/store/orgStore";
import { seedData } from "@/actions/seeddata";
import { useTranslation } from "@/lib/i18n/useTranslation";
import { useToastStore } from "@/store/toastStore";
import { DashboardStats } from "@/components/dashboard/DashboardStats";
import { MyTasks } from "@/components/dashboard/MyTasks";
import { ActiveProjects } from "@/components/dashboard/ActiveProjects";
import { DashboardActivityFeed } from "@/components/dashboard/DashboardActivityFeed";

export default function DashboardPage() {
  const { user, isLoaded } = useUser();
  const router = useRouter();
  const { activeOrgId } = useOrgStore();
  const { t } = useTranslation();

  const [isSeeding, setIsSeeding] = useState(false);
  const { showToast: showBanner } = useToastStore();

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
    <WorkspacePageLayout>
      {/* Main Content */}
      <div className="flex-1 max-w-6xl w-full mx-auto p-6 md:p-12 flex flex-col gap-8">
        <InvitationBanner />
        
        <div className="bg-white border-2 border-black rounded-sketchy shadow-flat-offset p-8">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6 border-b-2 border-black pb-6">
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
              className={`flex items-center gap-2 bg-accent-yellow hover:bg-[#FFE680] text-primary border-2 border-black font-sans text-xs font-bold px-4 py-2.5 rounded-full shadow-flat-offset-sm active:translate-y-0.5 hover:-translate-y-0.5 transition-all duration-150 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed`}
            >
              🌱 {isSeeding ? "Seeding..." : "Seed Data"}
            </button>
          </div>

          {!activeOrgId ? (
            <NoWorkspacePlaceholder showCreateButton />
          ) : (
            <div className="flex flex-col gap-8 mt-6">
                {/* 1. Statistics Cards */}
                <DashboardStats orgId={activeOrgId} userId={user?.id || ""} />

                {/* 2. Detailed Widgets Grid */}
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-start">
                  {/* Left Column: Tasks & Projects */}
                  <div className="lg:col-span-2 flex flex-col gap-8">
                    <MyTasks orgId={activeOrgId} userId={user?.id || ""} />
                    <ActiveProjects orgId={activeOrgId} />
                  </div>

                  {/* Right Column: Activity & Quick Actions */}
                  <div className="flex flex-col gap-8">
                    <DashboardActivityFeed orgId={activeOrgId} />

                    {/* Quick Actions panel */}
                    <div className="bg-white border-2 border-black rounded-sketchy shadow-flat-offset p-6 flex flex-col gap-4">
                      <h3 className="font-cursive text-2xl font-bold text-primary border-b-2 border-black pb-2">
                        🛠️ {t("dashboard.quickActions.title", "Quick Board Setup")}
                      </h3>
                      <div className="flex flex-col gap-3">
                        <button
                          onClick={() => router.push("/organizations/settings")}
                          className="w-full text-left font-sans text-xs font-bold p-3 border-2 border-black bg-accent-blue hover:bg-[#C2D8FC] rounded-sketchy-sm shadow-flat-offset-sm active:translate-y-0.5 hover:-translate-y-0.5 transition-all flex items-center justify-between cursor-pointer"
                        >
                          👥 {t("dashboard.quickActions.settings", "Workspace Members Settings")}
                          <ArrowRight className="h-4 w-4" />
                        </button>
                        <button
                          onClick={() => router.push("/team/capacity")}
                          className="w-full text-left font-sans text-xs font-bold p-3 border-2 border-black bg-accent-yellow hover:bg-[#FFEAA3] rounded-sketchy-sm shadow-flat-offset-sm active:translate-y-0.5 hover:-translate-y-0.5 transition-all flex items-center justify-between cursor-pointer"
                        >
                          📈 {t("dashboard.quickActions.capacity", "Resource Capacity Planner")}
                          <ArrowRight className="h-4 w-4" />
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </WorkspacePageLayout>
  );
}
