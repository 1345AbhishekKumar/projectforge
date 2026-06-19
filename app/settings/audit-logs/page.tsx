import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { auth, currentUser } from "@clerk/nextjs/server";
import { ArrowLeft, Building2, ShieldAlert, User as UserIcon } from "lucide-react";
import Link from "next/link";

import { OrgSwitcher } from "@/components/orgs/OrgSwitcher";
import { NotificationBell } from "@/components/notifications/NotificationBell";
import { Sidebar } from "@/components/layout/Sidebar";
import { AuditLogsViewer } from "@/components/audit-logs/AuditLogsViewer";
import { getOrganizationMembers, type MemberListItem } from "@/actions/membership";
import { getUserOrganizations } from "@/actions/org";
import type { MembershipRole } from "@/types";

export default async function AuditLogsPage() {
  const { userId } = await auth();
  if (!userId) {
    redirect("/sign-in");
  }

  const user = await currentUser();
  const email = user?.emailAddresses[0]?.emailAddress ?? "";

  const cookieStore = await cookies();
  const activeOrgId = cookieStore.get("active_org_id")?.value;

  let initialMembers: MemberListItem[] = [];
  let activeOrgName = "";
  let currentUserRole: MembershipRole = "MEMBER";

  if (activeOrgId) {
    const [membersRes, orgsRes] = await Promise.all([
      getOrganizationMembers(activeOrgId),
      getUserOrganizations(),
    ]);

    if (membersRes.success) {
      initialMembers = membersRes.data;
    }
    if (orgsRes.success && orgsRes.data) {
      const activeOrg = orgsRes.data.find((o) => o.id === activeOrgId);
      if (activeOrg) {
        activeOrgName = activeOrg.name;
        currentUserRole = activeOrg.role as MembershipRole;
      }
    }
  }

  const isOwnerOrAdmin = currentUserRole === "OWNER" || currentUserRole === "ADMIN";

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
              <span className="font-sans text-xs font-semibold text-secondary">{email}</span>
            </div>
          </div>
        </header>

        {/* Mobile Org Switcher */}
        <div className="md:hidden px-6 pt-4">
          <OrgSwitcher />
        </div>

        {/* Main Body */}
        <div className="flex-1 max-w-6xl w-full mx-auto p-6 md:p-12 flex flex-col gap-6">
          <div>
            <Link
              href="/organizations/settings"
              className="inline-flex items-center gap-1.5 font-sans text-sm text-secondary hover:text-primary mb-6 transition-colors cursor-pointer"
            >
              <ArrowLeft className="h-4 w-4" />
              Back to Settings
            </Link>
          </div>

          {!activeOrgId ? (
            <div className="bg-white border-2 border-black rounded-sketchy shadow-flat-offset p-8 text-center max-w-lg mx-auto mt-8">
              <div className="w-12 h-12 rounded-full bg-accent-pink border-2 border-black flex items-center justify-center mx-auto mb-4 shadow-flat-offset-sm">
                <Building2 className="h-6 w-6" />
              </div>
              <h2 className="font-cursive text-2xl font-bold mb-2">No Active Workspace</h2>
              <p className="font-sans text-sm text-secondary mb-6">
                Please select or create an organization workspace to view audit logs.
              </p>
              <Link
                href="/orgs/create"
                className="inline-block bg-accent-yellow hover:bg-[#FFE680] text-primary border-2 border-black font-sans text-sm font-bold px-6 py-2.5 rounded-full shadow-flat-offset-sm active:translate-y-0.5 hover:-translate-y-0.5 transition-all cursor-pointer"
              >
                Create New Workspace
              </Link>
            </div>
          ) : !isOwnerOrAdmin ? (
            <div className="bg-white border-2 border-black rounded-sketchy shadow-flat-offset p-8 text-center max-w-lg mx-auto mt-8 rotate-[-1deg]">
              <div className="w-12 h-12 rounded-full bg-accent-pink border-2 border-black flex items-center justify-center mx-auto mb-4 shadow-flat-offset-sm">
                <ShieldAlert className="h-6 w-6" />
              </div>
              <h2 className="font-cursive text-2xl font-bold mb-2">Access Denied (403)</h2>
              <p className="font-sans text-sm text-secondary mb-6">
                Only organization Owners and Admins have permission to view the security audit logs for <span className="font-bold">{activeOrgName}</span>.
              </p>
              <Link
                href="/dashboard"
                className="inline-block bg-accent-yellow hover:bg-[#FFE680] text-primary border-2 border-black font-sans text-sm font-bold px-6 py-2.5 rounded-full shadow-flat-offset-sm active:translate-y-0.5 hover:-translate-y-0.5 transition-all cursor-pointer"
              >
                Go to Dashboard
              </Link>
            </div>
          ) : (
            <div className="flex flex-col gap-6">
              {/* Header Info */}
              <div className="bg-white border-2 border-black rounded-sketchy shadow-flat-offset p-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                  <h1 className="font-cursive text-3xl font-bold mb-1">
                    Security Audit Logs: <span className="underline decoration-tertiary decoration-2">{activeOrgName}</span>
                  </h1>
                  <p className="font-sans text-xs text-secondary">
                    View critical operations, membership changes, and workflow modifications.
                  </p>
                </div>
              </div>

              {/* Viewer component */}
              <AuditLogsViewer orgId={activeOrgId} members={initialMembers} />
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
