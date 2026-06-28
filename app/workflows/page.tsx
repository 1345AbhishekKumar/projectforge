import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { auth } from "@clerk/nextjs/server";
import { Building2, ShieldAlert } from "lucide-react";
import Link from "next/link";

import { WorkspacePageLayout } from "@/components/layout/WorkspacePageLayout";
import { WorkflowsTab, type WorkflowRow } from "@/components/orgs/WorkflowsTab";
import { getUserOrganizations } from "@/actions/org";
import { getWorkflows } from "@/actions/workflow";
import { getUserProjects } from "@/actions/project";
import { getOrganizationMembers } from "@/actions/membership";
import type { MembershipRole } from "@/types";

export default async function WorkflowsPage() {
  const { userId } = await auth();
  if (!userId) {
    redirect("/sign-in");
  }

  const cookieStore = await cookies();
  const activeOrgId = cookieStore.get("active_org_id")?.value;

  let initialWorkflows: WorkflowRow[] = [];
  let activeOrgName = "";
  let currentUserRole: MembershipRole = "MEMBER";
  let projects: any[] = [];
  let members: any[] = [];

  if (activeOrgId) {
    const [orgsRes, workflowsRes, projectsRes, membersRes] = await Promise.all([
      getUserOrganizations(),
      getWorkflows(activeOrgId),
      getUserProjects(activeOrgId),
      getOrganizationMembers(activeOrgId),
    ]);

    if (orgsRes.success && orgsRes.data) {
      const activeOrg = orgsRes.data.find((o) => o.id === activeOrgId);
      if (activeOrg) {
        activeOrgName = activeOrg.name;
        currentUserRole = activeOrg.role as MembershipRole;
      }
    }

    if (workflowsRes.success) {
      initialWorkflows = workflowsRes.data as WorkflowRow[];
    }

    if (projectsRes.success && projectsRes.data) {
      projects = projectsRes.data;
    }

    if (membersRes.success && membersRes.data) {
      members = membersRes.data;
    }
  }

  const isOwnerOrAdmin = currentUserRole === "OWNER" || currentUserRole === "ADMIN";

  return (
    <WorkspacePageLayout>
      <div className="flex-1 max-w-6xl w-full mx-auto p-6 md:p-12 flex flex-col gap-6">
        {!activeOrgId ? (
          <div className="bg-white border-2 border-black rounded-sketchy shadow-flat-offset p-8 text-center max-w-lg mx-auto mt-8">
            <div className="w-12 h-12 rounded-full bg-accent-pink border-2 border-black flex items-center justify-center mx-auto mb-4 shadow-flat-offset-sm">
              <Building2 className="h-6 w-6" />
            </div>
            <h2 className="font-cursive text-2xl font-bold mb-2">No Active Workspace</h2>
            <p className="font-sans text-sm text-secondary mb-6">
              Please select or create an organization workspace to view workflows.
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
              Only organization Owners and Admins have permission to manage workflows for <span className="font-bold">{activeOrgName}</span>.
            </p>
            <Link
              href="/dashboard"
              className="inline-block bg-accent-yellow hover:bg-[#FFE680] text-primary border-2 border-black font-sans text-sm font-bold px-6 py-2.5 rounded-full shadow-flat-offset-sm active:translate-y-0.5 hover:-translate-y-0.5 transition-all cursor-pointer"
            >
              Go to Dashboard
            </Link>
          </div>
        ) : (
          <div className="bg-white border-2 border-black rounded-sketchy shadow-flat-offset p-6 flex flex-col gap-6">
            <WorkflowsTab
              initialWorkflows={initialWorkflows}
              orgId={activeOrgId}
              isAdminOrOwner={isOwnerOrAdmin}
              projects={projects}
              members={members}
            />
          </div>
        )}
      </div>
    </WorkspacePageLayout>
  );
}
