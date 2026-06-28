"use client";

// 1. External imports
import { useState, useEffect, useRef } from "react";
import { useUser, useAuth } from "@clerk/nextjs";
import { useRouter } from "next/navigation";
import { LogOut, User as UserIcon, Settings, Building2 } from "lucide-react";

// 2. Internal imports
import { OrgSwitcher } from "@/components/orgs/OrgSwitcher";
import { NotificationBell } from "@/components/notifications/NotificationBell";
import { SearchTrigger } from "@/components/search/SearchTrigger";
import { useTranslation } from "@/lib/i18n/useTranslation";

export function Navbar() {
  const { user, isLoaded } = useUser();
  const { signOut } = useAuth();
  const router = useRouter();
  const { t } = useTranslation();

  const [settingsOpen, setSettingsOpen] = useState(false);
  const settingsDropdownRef = useRef<HTMLDivElement>(null);

  const handleSignOut = async () => {
    await signOut();
    router.push("/sign-in");
  };

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (settingsDropdownRef.current && !settingsDropdownRef.current.contains(e.target as Node)) {
        setSettingsOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

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
        <SearchTrigger />
        <NotificationBell />

        {user && (
          <div className="relative" ref={settingsDropdownRef}>
            <button
              onClick={() => setSettingsOpen(!settingsOpen)}
              aria-label="Settings"
              className="relative p-2 rounded-full border-2 border-black bg-white hover:bg-neutral-bg shadow-flat-offset-sm transition-all duration-200 hover:-translate-y-0.5 active:translate-y-0 cursor-pointer flex items-center justify-center"
            >
              <Settings className={`h-5 w-5 text-primary transition-transform duration-300 ${settingsOpen ? "rotate-90" : "hover:rotate-45"}`} />
            </button>

            {settingsOpen && (
              <div className="absolute right-0 top-full mt-2 w-48 bg-white border-2 border-black rounded-sketchy-sm shadow-flat-offset z-50 overflow-hidden">
                <div className="p-2 flex flex-col gap-1">
                  <button
                    onClick={() => {
                      setSettingsOpen(false);
                      router.push("/profile");
                    }}
                    className="w-full flex items-center gap-2 px-3 py-2 rounded-md font-sans text-sm text-secondary hover:text-primary hover:bg-neutral-bg transition-colors cursor-pointer text-left"
                  >
                    <UserIcon className="h-4 w-4" />
                    <span>{t("sidebar.profile", "Profile Settings")}</span>
                  </button>

                  <button
                    onClick={() => {
                      setSettingsOpen(false);
                      router.push("/organizations/settings");
                    }}
                    className="w-full flex items-center gap-2 px-3 py-2 rounded-md font-sans text-sm text-secondary hover:text-primary hover:bg-neutral-bg transition-colors cursor-pointer text-left"
                  >
                    <Building2 className="h-4 w-4" />
                    <span>{t("sidebar.workspace", "Workspace Settings")}</span>
                  </button>

                  <button
                    onClick={() => {
                      setSettingsOpen(false);
                      handleSignOut();
                    }}
                    className="w-full flex items-center gap-2 px-3 py-2 rounded-md font-sans text-sm text-secondary hover:text-primary hover:bg-accent-pink/30 transition-colors cursor-pointer text-left border-t border-black/10 mt-1 pt-2"
                  >
                    <LogOut className="h-4 w-4" />
                    <span>Sign Out</span>
                  </button>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </header>
  );
}
