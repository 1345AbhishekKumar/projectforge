import { auth } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import Link from "next/link";

import { createInsforgeServer } from "@/lib/insforge-server";
import { OrgSwitcher } from "@/components/orgs/OrgSwitcher";
import { Sidebar } from "@/components/layout/Sidebar";
import { Navbar } from "@/components/layout/Navbar";
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
        <Navbar />

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
