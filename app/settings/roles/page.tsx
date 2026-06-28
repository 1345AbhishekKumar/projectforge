import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { auth } from "@clerk/nextjs/server";
import { ArrowLeft, Building2 } from "lucide-react";
import Link from "next/link";

import { OrgSwitcher } from "@/components/orgs/OrgSwitcher";
import { Sidebar } from "@/components/layout/Sidebar";
import { Navbar } from "@/components/layout/Navbar";
import { SettingsSidebar } from "@/components/layout/SettingsSidebar";
import { RolesSettingsClient } from "@/components/roles/RolesSettingsClient";
import { getCustomRoles, getPermissions } from "@/actions/role";
import { getUserOrganizations } from "@/actions/org";
import type { MembershipRole } from "@/types";

type Permission = {
  id: string;
  name: string;
  resource: string;
  action: string;
};

type CustomRole = {
  id: string;
  name: string;
  created_at: string;
  role_permissions: {
    permission_id: string;
    permissions: Permission | null;
  }[];
};


export default async function RolesPage() {
  const { userId } = await auth();
  if (!userId) {
    redirect("/sign-in");
  }



  const cookieStore = await cookies();
  const activeOrgId = cookieStore.get("active_org_id")?.value;

  let initialRoles: CustomRole[] = [];
  let allPermissions: Permission[] = [];
  let activeOrgName = "";
  let currentUserRole: MembershipRole = "MEMBER";

  if (activeOrgId) {
    const [rolesRes, permissionsRes, orgsRes] = await Promise.all([
      getCustomRoles(activeOrgId),
      getPermissions(),
      getUserOrganizations(),
    ]);

    if (rolesRes.success && rolesRes.data) {
      initialRoles = rolesRes.data as unknown as CustomRole[];
    }
    if (permissionsRes.success && permissionsRes.data) {
      allPermissions = permissionsRes.data as unknown as Permission[];
    }
    if (orgsRes.success && orgsRes.data) {
      const activeOrg = orgsRes.data.find((o) => o.id === activeOrgId);
      if (activeOrg) {
        activeOrgName = activeOrg.name;
        currentUserRole = activeOrg.role as MembershipRole;
      }
    }
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

        {/* Main Settings Body */}
        <div className="flex-1 max-w-6xl w-full mx-auto p-6 md:p-12 flex flex-col gap-6">
          <div>
            <Link
              href="/dashboard"
              className="inline-flex items-center gap-1.5 font-sans text-sm text-secondary hover:text-primary mb-6 transition-colors cursor-pointer"
            >
              <ArrowLeft className="h-4 w-4" />
              Back to Dashboard
            </Link>
          </div>

          {!activeOrgId ? (
            <div className="bg-white border-2 border-black rounded-sketchy shadow-flat-offset p-8 text-center max-w-lg mx-auto mt-8">
              <div className="w-12 h-12 rounded-full bg-accent-pink border-2 border-black flex items-center justify-center mx-auto mb-4 shadow-flat-offset-sm">
                <Building2 className="h-6 w-6" />
              </div>
              <h2 className="font-cursive text-2xl font-bold mb-2">No Active Workspace</h2>
              <p className="font-sans text-sm text-secondary mb-6">
                Please select or create an organization workspace to manage settings and roles.
              </p>
              <Link
                href="/orgs/create"
                className="inline-block bg-accent-yellow hover:bg-[#FFE680] text-primary border-2 border-black font-sans text-sm font-bold px-6 py-2.5 rounded-full shadow-flat-offset-sm active:translate-y-0.5 hover:-translate-y-0.5 transition-all cursor-pointer"
              >
                Create New Workspace
              </Link>
            </div>
          ) : (
            <div className="grid grid-cols-1 lg:grid-cols-4 gap-8 items-start">
              <div className="lg:col-span-1">
                <SettingsSidebar />
              </div>
              <div className="lg:col-span-3">
                <RolesSettingsClient
                  initialRoles={initialRoles}
                  allPermissions={allPermissions}
                  activeOrgId={activeOrgId}
                  activeOrgName={activeOrgName}
                  currentUserRole={currentUserRole}
                />
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
