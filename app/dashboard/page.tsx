"use client";

import { useUser, useAuth } from "@clerk/nextjs";
import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { LogOut, User as UserIcon, LayoutDashboard, Settings, BookOpen } from "lucide-react";
import { OrgSwitcher } from "@/components/orgs/OrgSwitcher";
import { syncProfile } from "@/actions/profile";

export default function DashboardPage() {
  const { user, isLoaded } = useUser();
  const { signOut } = useAuth();
  const router = useRouter();

  const handleSignOut = async () => {
    await signOut();
    router.push("/sign-in");
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
    <main className="min-h-screen w-full bg-neutral-bg bg-dot-grid text-primary flex flex-col">
      {/* Navbar */}
      <header className="w-full bg-white border-b-2 border-black px-6 py-3 flex items-center justify-between sticky top-0 z-50">
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-full bg-tertiary border-2 border-primary flex items-center justify-center font-cursive text-white text-lg font-bold shadow-flat-offset-sm">
              P
            </div>
            <span className="font-cursive text-2xl font-bold tracking-tight">ProjectForge</span>
          </div>

          <div className="hidden md:block border-l-2 border-black h-6 mx-1" />
          <div className="hidden md:block">
            <OrgSwitcher />
          </div>
        </div>

        <div className="flex items-center gap-4">
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

      {/* Main Content */}
      <div className="flex-1 max-w-6xl w-full mx-auto p-6 md:p-12 flex flex-col gap-8">
        <div className="bg-white border-2 border-black rounded-sketchy shadow-flat-offset p-8">
          <h1 className="font-cursive text-4xl font-bold mb-2">
            Hey, {user?.firstName || "Collaborator"}! 👋
          </h1>
          <p className="font-sans text-sm text-secondary mb-6">
            Welcome to your intelligent whiteboard workspace. Here is a snapshot of your execution board.
          </p>

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
            <div className="bg-accent-blue border-2 border-black rounded-sketchy-sm p-6 shadow-flat-offset-sm rotate-[1.2deg] hover:rotate-0 transition-transform duration-200">
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
    </main>
  );
}
