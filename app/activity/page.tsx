import { auth } from "@clerk/nextjs/server";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import { ArrowLeft, Activity, Calendar } from "lucide-react";

import { getOrganizationActivities, type ActivityWithActor } from "@/actions/activity";
import { OrgSwitcher } from "@/components/orgs/OrgSwitcher";
import { Sidebar } from "@/components/layout/Sidebar";
import { Navbar } from "@/components/layout/Navbar";

export default async function ActivityPage() {
  const { userId } = await auth();
  if (!userId) {
    redirect("/sign-in");
  }

  const cookieStore = await cookies();
  const activeOrgId = cookieStore.get("active_org_id")?.value;

  let activities: ActivityWithActor[] = [];
  let errorMsg = "";

  if (activeOrgId) {
    const res = await getOrganizationActivities(activeOrgId, 1, 50);
    if (res.success) {
      activities = res.data;
    } else {
      errorMsg = res.error || "Failed to load activities";
    }
  }

  const formatMetadata = (activity: ActivityWithActor) => {
    const { action_type, metadata } = activity;
    const actorName = activity.actor?.full_name || "Someone";

    switch (action_type) {
      case "MEMBER_JOINED":
        return `${actorName} joined the workspace.`;
      case "TASK_COMPLETED":
        return `${actorName} completed task "${metadata?.taskTitle || "Untitled Task"}".`;
      case "TASK_CREATED":
        return `${actorName} created task "${metadata?.taskTitle || "Untitled Task"}".`;
      case "TASK_ASSIGNED":
        return `${actorName} assigned "${metadata?.taskTitle || "Untitled Task"}" to ${metadata?.assigneeName || "collaborator"}.`;
      case "TASK_STATUS_UPDATED":
        return `${actorName} moved "${metadata?.taskTitle || "Untitled Task"}" from ${metadata?.fromStatus || "backlog"} to ${metadata?.toStatus || "in progress"}.`;
      case "SPRINT_STARTED":
        return `${actorName} started sprint "${metadata?.sprintName || "Sprint"}".`;
      case "PROJECT_CREATED":
        return `${actorName} created project "${metadata?.projectName || "Untitled Project"}".`;
      default:
        return `${actorName} performed action: ${action_type.replace(/_/g, " ").toLowerCase()}`;
    }
  };

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
              Back to Dashboard
            </Link>
          </div>

          <div className="bg-white border-2 border-black rounded-sketchy shadow-flat-offset p-6 flex items-center gap-3 mb-4">
            <div className="w-10 h-10 rounded-full bg-accent-yellow border-2 border-black flex items-center justify-center shadow-flat-offset-sm">
              <Activity className="h-5 w-5" />
            </div>
            <div>
              <h1 className="font-cursive text-3xl font-bold">Activity Feed</h1>
              <p className="font-sans text-xs text-secondary">
                See what has been happening in this organization workspace.
              </p>
            </div>
          </div>

          {!activeOrgId ? (
            <div className="bg-white border-2 border-black rounded-sketchy shadow-flat-offset p-8 text-center max-w-lg mx-auto mt-8">
              <h2 className="font-cursive text-2xl font-bold mb-2">No Active Workspace</h2>
              <p className="font-sans text-sm text-secondary mb-6">
                Please select or create an organization workspace to view the activity feed.
              </p>
            </div>
          ) : errorMsg ? (
            <div className="bg-accent-pink border-2 border-black rounded-sketchy-sm p-4 text-center">
              <p className="font-sans text-sm font-semibold">{errorMsg}</p>
            </div>
          ) : activities.length === 0 ? (
            <div className="bg-white border-2 border-black rounded-sketchy shadow-flat-offset p-12 text-center text-secondary/60 text-sm font-sans">
              No activity logged in this workspace yet.
            </div>
          ) : (
            <div className="flex flex-col gap-4">
              {activities.map((item) => (
                <div
                  key={item.id}
                  className="bg-white border-2 border-black rounded-sketchy-sm p-4 shadow-flat-offset-sm flex items-start gap-4 hover:-translate-y-0.5 transition-transform"
                >
                  {item.actor?.avatar_url ? (
                    <Image
                      src={item.actor.avatar_url}
                      alt={item.actor.full_name || "User"}
                      width={36}
                      height={36}
                      className="w-9 h-9 rounded-full border-2 border-black object-cover shrink-0"
                    />
                  ) : (
                    <div className="w-9 h-9 rounded-full bg-accent-blue border-2 border-black flex items-center justify-center font-cursive font-bold text-sm shrink-0">
                      {(item.actor?.full_name || "S").charAt(0)}
                    </div>
                  )}

                  <div className="flex-1 min-w-0">
                    <p className="font-sans text-sm font-semibold text-primary break-words leading-relaxed">
                      {formatMetadata(item)}
                    </p>
                    <div className="flex items-center gap-4 mt-2 text-[10px] text-secondary/70">
                      <span className="flex items-center gap-1" suppressHydrationWarning>
                        <Calendar className="h-3 w-3" />
                        {new Date(item.created_at).toLocaleString()}
                      </span>
                      {item.project_id && (
                        <span className="flex items-center gap-1 border border-black/10 bg-neutral-bg px-1.5 py-0.5 rounded text-[8px] font-bold">
                          PROJECT EVENT
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
