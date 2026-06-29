import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { auth } from "@clerk/nextjs/server";
import {
  Building2,
  ShieldAlert,
  Zap,
  LayoutDashboard,
  History,
  Sparkles,
  Settings,
} from "lucide-react";
import Link from "next/link";

import { WorkspacePageLayout } from "@/components/layout/WorkspacePageLayout";
import { getUserOrganizations } from "@/actions/org";
import { getWorkflows } from "@/actions/workflow";
import { getWorkflowExecutions } from "@/actions/workflowExecution";
import { getWorkflowAnalyticsSummary } from "@/actions/workflowAnalytics";
import { getWorkflowPermissions } from "@/actions/workflowPermissions";
import { getWorkflowCategories } from "@/actions/workflowCategory";
import type { MembershipRole } from "@/types";

// Import client tab views
import { WorkflowsDashboard } from "@/components/workflows/WorkflowsDashboard";
import { WorkflowsList } from "@/components/workflows/WorkflowsList";
import { ExecutionsTab } from "@/components/workflows/ExecutionsTab";
import { TemplatesTab } from "@/components/workflows/TemplatesTab";
import { SettingsTab } from "@/components/workflows/SettingsTab";

type SearchParams = Promise<{ tab?: string }>;

type Props = {
  searchParams: SearchParams;
};

export default async function WorkflowsPage({ searchParams }: Props) {
  const { userId } = await auth();
  if (!userId) {
    redirect("/sign-in");
  }

  const { tab = "overview" } = await searchParams;

  const cookieStore = await cookies();
  const activeOrgId = cookieStore.get("active_org_id")?.value;

  let workflows: Record<string, unknown>[] = [];
  let activeOrgName = "";
  let currentUserRole: MembershipRole = "MEMBER";
  let executions: Record<string, unknown>[] = [];
  let analytics: Record<string, unknown> | null = null;
  let permissions: Record<string, unknown>[] = [];
  let categories: string[] = [];

  if (activeOrgId) {
    const [orgsRes, workflowsRes, execRes, analyticsRes, permissionsRes, categoriesRes] =
      await Promise.all([
        getUserOrganizations(),
        getWorkflows(activeOrgId),
        getWorkflowExecutions(activeOrgId),
        getWorkflowAnalyticsSummary(activeOrgId),
        getWorkflowPermissions(activeOrgId),
        getWorkflowCategories(activeOrgId),
      ]);

    if (orgsRes.success && orgsRes.data) {
      const activeOrg = orgsRes.data.find((o) => o.id === activeOrgId);
      if (activeOrg) {
        activeOrgName = activeOrg.name;
        currentUserRole = activeOrg.role as MembershipRole;
      }
    }

    if (workflowsRes.success) workflows = workflowsRes.data;
    if (execRes.success && execRes.data) executions = execRes.data;
    if (analyticsRes.success) analytics = analyticsRes.data;
    if (permissionsRes.success) permissions = permissionsRes.data;
    if (categoriesRes.success && categoriesRes.data) categories = categoriesRes.data;
  }

  const isOwnerOrAdmin = currentUserRole === "OWNER" || currentUserRole === "ADMIN";

  // Navigation Links
  const navTabs = [
    { key: "overview", label: "Overview", icon: LayoutDashboard },
    { key: "list", label: "Workflows", icon: Zap },
    { key: "executions", label: "Executions", icon: History },
    { key: "templates", label: "Templates", icon: Sparkles },
    { key: "settings", label: "Settings", icon: Settings },
  ];

  return (
    <WorkspacePageLayout>
      <div className="flex-1 max-w-6xl w-full mx-auto p-6 md:p-12 flex flex-col gap-8">
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
              Only organization Owners and Admins have permission to manage workflows for{" "}
              <span className="font-bold">{activeOrgName}</span>.
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
            {/* Page Header */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div>
                <h1 className="font-cursive text-3xl font-bold">Automation Platform</h1>
                <p className="font-sans text-xs text-secondary mt-0.5">
                  Build, test, and manage automated workflow rules for your workspace.
                </p>
              </div>

              {/* Quick Actions */}
              <Link
                href="/workflows/create"
                className="flex items-center gap-1.5 px-5 py-2.5 bg-accent-yellow hover:bg-[#FFE680] text-primary border-2 border-black rounded-full font-sans text-xs font-bold shadow-flat-offset-sm hover:-translate-y-0.5 active:translate-y-0.5 transition-all w-fit cursor-pointer"
              >
                <Zap className="h-3.5 w-3.5 text-primary fill-primary/10" />
                <span>Create Workflow</span>
              </Link>
            </div>

            {/* Dashboard Tabs bar */}
            <div className="flex border-b-2 border-black/10 gap-2 mb-2">
              {navTabs.map((item) => {
                const isActive = tab === item.key;
                const Icon = item.icon;

                return (
                  <Link
                    key={item.key}
                    href={`/workflows?tab=${item.key}`}
                    className={`flex items-center gap-2 px-5 py-3 font-cursive text-sm font-bold border-2 border-transparent transition-all relative -mb-[2px] cursor-pointer ${
                      isActive
                        ? "border-black border-b-white bg-white rounded-t-lg shadow-[0_-2px_0_rgba(0,0,0,1)] z-10"
                        : "hover:text-primary text-secondary"
                    }`}
                  >
                    <Icon className="h-4 w-4" />
                    <span>{item.label}</span>
                  </Link>
                );
              })}
            </div>

            {/* Inner Dashboard View Card */}
            <div className="bg-white border-2 border-black rounded-sketchy shadow-flat-offset p-6 min-h-[400px]">
              {tab === "overview" && analytics && <WorkflowsDashboard analytics={analytics} />}
              {tab === "list" && (
                <WorkflowsList
                  initialWorkflows={workflows}
                  initialCategories={categories}
                  orgId={activeOrgId}
                  canEdit={isOwnerOrAdmin}
                />
              )}
              {tab === "executions" && (
                <ExecutionsTab initialExecutions={executions} orgId={activeOrgId} />
              )}
              {tab === "templates" && <TemplatesTab orgId={activeOrgId} />}
              {tab === "settings" && (
                <SettingsTab
                  orgId={activeOrgId}
                  initialPermissions={permissions}
                  canEdit={isOwnerOrAdmin}
                />
              )}
            </div>
          </div>
        )}
      </div>
    </WorkspacePageLayout>
  );
}
