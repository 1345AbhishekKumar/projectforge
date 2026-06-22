import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { auth } from "@clerk/nextjs/server";
import { ArrowLeft, Building2, ShieldAlert } from "lucide-react";
import Link from "next/link";

import { OrgSwitcher } from "@/components/orgs/OrgSwitcher";
import { Sidebar } from "@/components/layout/Sidebar";
import { Navbar } from "@/components/layout/Navbar";
import { CustomFieldsSettings } from "@/components/orgs/CustomFieldsSettings";
import { getUserOrganizations } from "@/actions/org";
import type { MembershipRole } from "@/types";

export default async function CustomFieldsPage() {
  const { userId } = await auth();
  if (!userId) {
    redirect("/sign-in");
  }



  const cookieStore = await cookies();
  const activeOrgId = cookieStore.get("active_org_id")?.value;

  let activeOrgName = "";
  let currentUserRole: MembershipRole = "MEMBER";

  if (activeOrgId) {
    const orgsRes = await getUserOrganizations();
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
                Please select or create an organization workspace to view custom fields.
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
                Only organization Owners and Admins have permission to manage custom fields for <span className="font-bold">{activeOrgName}</span>.
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
              <div className="bg-white border-2 border-black rounded-sketchy shadow-flat-offset p-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                  <h1 className="font-cursive text-3xl font-bold mb-1">
                    Custom Fields: <span className="underline decoration-tertiary decoration-2">{activeOrgName}</span>
                  </h1>
                  <p className="font-sans text-xs text-secondary">
                    Configure custom metadata columns for tasks and projects in this workspace.
                  </p>
                </div>
              </div>

              <CustomFieldsSettings orgId={activeOrgId} />
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
