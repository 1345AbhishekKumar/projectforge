import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { auth } from "@clerk/nextjs/server";
import { Building2, ShieldAlert } from "lucide-react";

import { WorkspacePageLayout } from "@/components/layout/WorkspacePageLayout";
import { getUserOrganizations } from "@/actions/org";
import { getWorkflows } from "@/actions/workflow";
import { getUserProjects } from "@/actions/project";
import { getOrganizationMembers } from "@/actions/membership";
import { createInsforgeServer } from "@/lib/insforge-server";
import type { MembershipRole } from "@/types";

// Import client editor canvas
import { WorkflowBuilder } from "@/components/workflows/WorkflowBuilder";

type Params = Promise<{ id: string }>;

type Props = {
  params: Params;
};

export default async function WorkflowBuilderPage({ params }: Props) {
  const { userId } = await auth();
  if (!userId) {
    redirect("/sign-in");
  }

  const { id } = await params;

  const cookieStore = await cookies();
  const activeOrgId = cookieStore.get("active_org_id")?.value;

  let currentUserRole: MembershipRole = "MEMBER";
  let workflow: Record<string, unknown> | null = null;
  let allWorkflows: Record<string, unknown>[] = [];
  let projects: Record<string, unknown>[] = [];
  let members: Record<string, unknown>[] = [];

  if (activeOrgId) {
    const insforge = createInsforgeServer(userId);

    // Fetch this specific workflow details
    const { data: wfData, error: wfError } = await insforge.database
      .from("workflows")
      .select("*")
      .eq("id", id)
      .eq("organization_id", activeOrgId)
      .single();

    if (wfError || !wfData) {
      redirect("/workflows?tab=list");
    }

    workflow = wfData;

    const [orgsRes, workflowsRes, projectsRes, membersRes] = await Promise.all([
      getUserOrganizations(),
      getWorkflows(activeOrgId),
      getUserProjects(activeOrgId),
      getOrganizationMembers(activeOrgId),
    ]);

    if (orgsRes.success && orgsRes.data) {
      const activeOrg = orgsRes.data.find((o) => o.id === activeOrgId);
      if (activeOrg) {
        currentUserRole = activeOrg.role as MembershipRole;
      }
    }

    if (workflowsRes.success) allWorkflows = workflowsRes.data;
    if (projectsRes.success && projectsRes.data) projects = projectsRes.data;
    if (membersRes.success && membersRes.data) members = membersRes.data;
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
              Please select or create an organization workspace to view builder.
            </p>
          </div>
        ) : !isOwnerOrAdmin ? (
          <div className="bg-white border-2 border-black rounded-sketchy shadow-flat-offset p-8 text-center max-w-lg mx-auto mt-8 rotate-[-1deg]">
            <div className="w-12 h-12 rounded-full bg-accent-pink border-2 border-black flex items-center justify-center mx-auto mb-4 shadow-flat-offset-sm">
              <ShieldAlert className="h-6 w-6" />
            </div>
            <h2 className="font-cursive text-2xl font-bold mb-2">Access Denied (403)</h2>
            <p className="font-sans text-sm text-secondary mb-6">
              Only workspace Owners and Admins have permission to edit workflow rules.
            </p>
          </div>
        ) : (
          <WorkflowBuilder
            workflow={workflow}
            orgId={activeOrgId}
            projects={projects}
            members={members}
            allWorkflows={allWorkflows}
          />
        )}
      </div>
    </WorkspacePageLayout>
  );
}
