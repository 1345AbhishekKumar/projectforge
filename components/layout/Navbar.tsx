"use client";

import { useUser, useAuth } from "@clerk/nextjs";
import { useRouter } from "next/navigation";
import { LogOut, User as UserIcon } from "lucide-react";
import { OrgSwitcher } from "@/components/orgs/OrgSwitcher";
import { NotificationBell } from "@/components/notifications/NotificationBell";

export function Navbar() {
  const { user, isLoaded } = useUser();
  const { signOut } = useAuth();
  const router = useRouter();

  const handleSignOut = async () => {
    await signOut();
    router.push("/sign-in");
  };

  if (!isLoaded) {
    return (
      <header className="w-full bg-white border-b-2 border-black px-6 py-3 flex items-center justify-between sticky top-0 z-50 min-h-[66px]">
        {/* Loading placeholder to match height and prevent layout shift */}
      </header>
    );
  }

  return (
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

        {user && (
          <div className="hidden sm:flex items-center gap-2 border-2 border-black rounded-full px-3 py-1 bg-neutral-bg">
            <UserIcon className="h-4 w-4 text-secondary" />
            <span className="font-sans text-xs font-semibold text-secondary">
              {user.primaryEmailAddress?.emailAddress}
            </span>
          </div>
        )}

        <button
          onClick={handleSignOut}
          className="flex items-center gap-2 bg-accent-pink hover:bg-accent-pink/80 text-primary border-2 border-black font-sans text-xs font-bold px-4 py-2 rounded-full shadow-flat-offset-sm active:scale-[0.97] hover:-translate-y-0.5 transition-[transform,background-color,box-shadow,color] duration-150 cursor-pointer animate-none"
        >
          <LogOut className="h-3.5 w-3.5" />
          Sign Out
        </button>
      </div>
    </header>
  );
}
