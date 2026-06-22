import { auth } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import Link from "next/link";

import { getNotifications } from "@/actions/notification";
import { OrgSwitcher } from "@/components/orgs/OrgSwitcher";
import { Sidebar } from "@/components/layout/Sidebar";
import { Navbar } from "@/components/layout/Navbar";
import { NotificationManager, type NotificationItem } from "@/components/notifications/NotificationManager";

export default async function NotificationsPage() {
  const { userId } = await auth();
  if (!userId) {
    redirect("/sign-in");
  }


  // Fetch initial notifications
  const notificationsRes = await getNotifications();
  const initialNotifications = notificationsRes.success
    ? (notificationsRes.data as unknown as NotificationItem[])
    : [];

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
        <div className="flex-1 max-w-5xl w-full mx-auto p-6 md:p-12 flex flex-col gap-6">
          <div>
            <Link
              href="/dashboard"
              className="inline-flex items-center gap-1.5 font-sans text-sm text-secondary hover:text-primary mb-6 transition-colors cursor-pointer"
            >
              <ArrowLeft className="h-4 w-4" />
              Back to Dashboard
            </Link>
          </div>

          <NotificationManager initialNotifications={initialNotifications} />
        </div>
      </div>
    </div>
  );
}
