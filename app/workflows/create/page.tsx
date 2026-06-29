import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { auth } from "@clerk/nextjs/server";
import { Building2, ShieldAlert } from "lucide-react";

import { WorkspacePageLayout } from "@/components/layout/WorkspacePageLayout";
import { getUserOrganizations } from "@/actions/org";
import { getUserProjects } from "@/actions/project";
import { getOrganizationMembers } from "@/actions/membership";
import { getWorkflowCategories } from "@/actions/workflowCategory";
import type { MembershipRole } from "@/types";

// Import client wizard component
import { WorkflowWizard } from "@/components/workflows/WorkflowWizard";

type ProjectSummary = { id: string; name: string };
type MemberSummary = { user_id: string; full_name: string | null; email: string };

export default async function CreateWorkflowPage() {
  const { userId } = await auth();
  if (!userId) {
    redirect("/sign-in");
  }

  const cookieStore = await cookies();
  const activeOrgId = cookieStore.get("active_org_id")?.value;

  let currentUserRole: MembershipRole = "MEMBER";
  let projects: ProjectSummary[] = [];
  let members: MemberSummary[] = [];
  let categories: string[] = [];

  if (activeOrgId) {
    const [orgsRes, projectsRes, membersRes, categoriesRes] = await Promise.all([
      getUserOrganizations(),
      getUserProjects(activeOrgId),
      getOrganizationMembers(activeOrgId),
      getWorkflowCategories(activeOrgId),
    ]);

    if (orgsRes.success && orgsRes.data) {
      const activeOrg = orgsRes.data.find((o) => o.id === activeOrgId);
      if (activeOrg) {
        currentUserRole = activeOrg.role as MembershipRole;
      }
    }

    if (projectsRes.success && projectsRes.data) {
      projects = projectsRes.data.map((p) => ({
        id: p.id,
        name: p.name,
      }));
    }
    if (membersRes.success && membersRes.data) {
      members = membersRes.data.map((m) => ({
        user_id: m.user_id,
        full_name: m.full_name,
        email: m.email,
      }));
    }
    if (categoriesRes.success && categoriesRes.data) {
      categories = categoriesRes.data;
    }
  }

  const isOwnerOrAdmin = currentUserRole === "OWNER" || currentUserRole === "ADMIN";

  return (
    <WorkspacePageLayout>
      <div className="flex-1 max-w-4xl w-full mx-auto p-6 md:p-12 flex flex-col gap-6">
        {!activeOrgId ? (
          <div className="bg-white border-2 border-black rounded-sketchy shadow-flat-offset p-8 text-center max-w-lg mx-auto mt-8">
            <div className="w-12 h-12 rounded-full bg-accent-pink border-2 border-black flex items-center justify-center mx-auto mb-4 shadow-flat-offset-sm">
              <Building2 className="h-6 w-6" />
            </div>
            <h2 className="font-cursive text-2xl font-bold mb-2">No Active Workspace</h2>
            <p className="font-sans text-sm text-secondary mb-6">
              Please select or create an organization workspace context.
            </p>
          </div>
        ) : !isOwnerOrAdmin ? (
          <div className="bg-white border-2 border-black rounded-sketchy shadow-flat-offset p-8 text-center max-w-lg mx-auto mt-8 rotate-[-1deg]">
            <div className="w-12 h-12 rounded-full bg-accent-pink border-2 border-black flex items-center justify-center mx-auto mb-4 shadow-flat-offset-sm">
              <ShieldAlert className="h-6 w-6" />
            </div>
            <h2 className="font-cursive text-2xl font-bold mb-2">Access Denied (403)</h2>
            <p className="font-sans text-sm text-secondary mb-6">
              Only workspace Owners and Admins have permission to create automations.
            </p>
          </div>
        ) : (
          <WorkflowWizard
            orgId={activeOrgId}
            projects={projects}
            members={members}
            categories={categories}
          />
        )}
      </div>
    </WorkspacePageLayout>
  );
}
