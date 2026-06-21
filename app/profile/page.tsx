import { auth } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import { ArrowLeft, User as UserIcon } from "lucide-react";
import Link from "next/link";

import { createInsforgeServer } from "@/lib/insforge-server";
import { OrgSwitcher } from "@/components/orgs/OrgSwitcher";
import { NotificationBell } from "@/components/notifications/NotificationBell";
import { Sidebar } from "@/components/layout/Sidebar";
import { ProfileForm } from "@/components/profile/ProfileForm";
import { getServerTranslation } from "@/lib/i18n/getServerTranslation";

export default async function ProfilePage() {
  const { userId } = await auth();
  if (!userId) {
    redirect("/sign-in");
  }

  const { t } = await getServerTranslation();
  const insforge = createInsforgeServer(userId);

  const { data: profile, error } = await insforge.database
    .from("profiles")
    .select("full_name, email, avatar_url, locale")
    .eq("id", userId)
    .single();

  if (error || !profile) {
    return (
      <div className="min-h-screen w-full flex items-center justify-center bg-neutral-bg bg-dot-grid text-primary">
        <span className="font-cursive text-xl">{t("common.error", "Error loading profile data. Please try again.")}</span>
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
                {profile.email}
              </span>
            </div>
          </div>
        </header>

        {/* Mobile Org Switcher */}
        <div className="md:hidden px-6 pt-4">
          <OrgSwitcher />
        </div>

        {/* Main Body */}
        <div className="flex-1 max-w-4xl w-full mx-auto p-6 md:p-12 flex flex-col gap-6">
          <div>
            <Link
              href="/dashboard"
              className="inline-flex items-center gap-1.5 font-sans text-sm text-secondary hover:text-primary mb-6 transition-colors cursor-pointer"
            >
              <ArrowLeft className="h-4 w-4" />
              {t("common.backToDashboard", "Back to Dashboard")}
            </Link>
          </div>

          <ProfileForm
            initialProfile={{
              fullName: profile.full_name,
              avatarUrl: profile.avatar_url,
              email: profile.email,
              locale: profile.locale || "en",
            }}
          />
        </div>
      </div>
    </div>
  );
}
