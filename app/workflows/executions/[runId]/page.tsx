import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { auth } from "@clerk/nextjs/server";
import { Building2, ArrowLeft, History } from "lucide-react";
import Link from "next/link";

import { WorkspacePageLayout } from "@/components/layout/WorkspacePageLayout";
import { getUserOrganizations } from "@/actions/org";
import { getExecutionDetails } from "@/actions/workflowExecution";
import { getWorkflowPermissions } from "@/actions/workflowPermissions";
import type { MembershipRole } from "@/types";

// Import client tracer component
import { ExecutionTracer } from "./ExecutionTracer";

type Params = Promise<{ runId: string }>;

type Props = {
  params: Params;
};

export default async function ExecutionDetailsPage({ params }: Props) {
  const { userId } = await auth();
  if (!userId) {
    redirect("/sign-in");
  }

  const { runId } = await params;

  const cookieStore = await cookies();
  const activeOrgId = cookieStore.get("active_org_id")?.value;

  let currentUserRole: MembershipRole = "MEMBER";
  let runDetails: Record<string, unknown> | null = null;
  let steps: Record<string, unknown>[] = [];
  let permissions: Record<string, unknown>[] = [];

  if (activeOrgId) {
    const [orgsRes, runRes, permissionsRes] = await Promise.all([
      getUserOrganizations(),
      getExecutionDetails(runId, activeOrgId),
      getWorkflowPermissions(activeOrgId),
    ]);

    if (orgsRes.success && orgsRes.data) {
      const activeOrg = orgsRes.data.find((o) => o.id === activeOrgId);
      if (activeOrg) {
        currentUserRole = activeOrg.role as MembershipRole;
      }
    }

    if (runRes.success) {
      runDetails = runRes.data;
      steps = runRes.steps;
    } else {
      redirect("/workflows?tab=executions");
    }

    if (permissionsRes.success) {
      permissions = permissionsRes.data;
    }
  }

  const isOwnerOrAdmin = currentUserRole === "OWNER" || currentUserRole === "ADMIN";

  // Check if current user has retry permission
  const userPermission = permissions.find((p) => p.role_name === currentUserRole);
  const canRetry = isOwnerOrAdmin || !!userPermission?.can_retry;

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
              Please select or create an organization workspace to view details.
            </p>
          </div>
        ) : (
          <div className="flex flex-col gap-6">
            {/* Header / Back Link */}
            <div className="flex items-center justify-between border-b-2 border-black pb-4">
              <div className="flex items-center gap-3">
                <Link
                  href="/workflows?tab=executions"
                  className="p-1.5 border-2 border-black rounded-full hover:bg-neutral-bg shadow-flat-offset-xs active:translate-y-0.5 transition-all cursor-pointer"
                  title="Back to executions log"
                >
                  <ArrowLeft className="h-4 w-4" />
                </Link>
                <div>
                  <h1 className="font-cursive text-2xl font-bold flex items-center gap-2">
                    <History className="h-5 w-5" />
                    <span>Run Trace: {runDetails.workflows?.name || "Workflow"}</span>
                  </h1>
                  <span className="font-mono text-[10px] text-secondary">
                    Execution ID: {runDetails.id}
                  </span>
                </div>
              </div>
            </div>

            {/* Tracing Timeline & Payload Details */}
            <ExecutionTracer
              runDetails={runDetails}
              steps={steps}
              canRetry={canRetry}
              orgId={activeOrgId}
            />
          </div>
        )}
      </div>
    </WorkspacePageLayout>
  );
}
