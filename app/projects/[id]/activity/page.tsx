"use client";

import React, { useState, useEffect, useCallback, use } from "react";
import { useRouter } from "next/navigation";
import { useUser, useAuth } from "@clerk/nextjs";
import { 
  ArrowLeft, 
  User as UserIcon, 
  Loader2, 
  Calendar, 
  Users, 
  ClipboardList, 
  LogOut, 
  FolderKanban,
  Activity
} from "lucide-react";

import { OrgSwitcher } from "@/components/orgs/OrgSwitcher";
import { NotificationBell } from "@/components/notifications/NotificationBell";
import { getProjectDetails } from "@/actions/project";
import { getProjectActivities, type ActivityWithActor } from "@/actions/activity";
import { Sidebar } from "@/components/layout/Sidebar";
import { ActivityFeed } from "@/components/activities/ActivityFeed";
import type { Project, ProjectStatus } from "@/types";

type Props = {
  params: Promise<{ id: string }>;
};

import { useOrgStore } from "@/store/orgStore";

export default function ProjectActivityPage({ params }: Props) {
  const router = useRouter();
  const { id: projectId } = use(params);
  const { user, isLoaded } = useUser();
  const { signOut } = useAuth();

  const { activeOrgId } = useOrgStore();
  const [project, setProject] = useState<Project | null>(null);
  const [activities, setActivities] = useState<ActivityWithActor[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingActivities, setLoadingActivities] = useState(true);
  const [error, setError] = useState("");

  const handleSignOut = async () => {
    await signOut();
    router.push("/sign-in");
  };

  // Fetch project details
  useEffect(() => {
    if (!activeOrgId || !projectId) return;

    async function loadProjectDetails() {
      setLoading(true);
      setError("");
      
      const result = await getProjectDetails(projectId, activeOrgId!);
      if (result.success && result.data) {
        setProject(result.data);
      } else {
        setError(result.error || "Project not found or unauthorized access.");
      }
      
      setLoading(false);
    }

    loadProjectDetails();
  }, [projectId, activeOrgId]);

  // Load activities callback
  const loadActivities = useCallback(async () => {
    if (!activeOrgId || !projectId) return;
    setLoadingActivities(true);
    const result = await getProjectActivities(projectId, activeOrgId, 1, 20);
    if (result.success) {
      setActivities(result.data);
    }
    setLoadingActivities(false);
  }, [projectId, activeOrgId]);

  // Fetch activities
  useEffect(() => {
    const timer = setTimeout(() => {
      loadActivities();
    }, 0);
    return () => clearTimeout(timer);
  }, [loadActivities]);

  // Redirect to projects directory if activeOrgId changes
  const initialOrgIdRef = React.useRef(activeOrgId);
  useEffect(() => {
    if (activeOrgId !== initialOrgIdRef.current) {
      router.push("/projects");
    }
  }, [activeOrgId, router]);

  if (!isLoaded) {
    return (
      <div className="min-h-screen w-full flex items-center justify-center bg-neutral-bg bg-dot-grid text-primary">
        <span className="font-cursive text-xl animate-pulse">Loading board details...</span>
      </div>
    );
  }

  const statusColors: Record<ProjectStatus, string> = {
    PLANNING: "bg-accent-yellow border-2 border-black",
    ACTIVE: "bg-accent-blue border-2 border-black",
    COMPLETED: "bg-accent-green border-2 border-black",
    ARCHIVED: "bg-neutral-bg border border-black/10 opacity-60",
  };

  const statusBadgeColor = project ? statusColors[project.status] : "";

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
              <span className="font-sans text-xs font-semibold text-secondary">
                {user?.primaryEmailAddress?.emailAddress}
              </span>
            </div>

            <button
              onClick={handleSignOut}
              className="flex items-center gap-2 bg-accent-pink hover:bg-[#FFB2B2] text-primary border-2 border-black font-sans text-xs font-bold px-4 py-2 rounded-full shadow-flat-offset-sm active:translate-y-0.5 hover:-translate-y-0.5 transition-all cursor-pointer"
            >
              <LogOut className="h-3.5 w-3.5" />
              Sign Out
            </button>
          </div>
        </header>

        {/* Mobile Org Switcher */}
        <div className="md:hidden px-6 pt-4">
          <OrgSwitcher />
        </div>

        {/* Main Details Body */}
        <div className="flex-1 max-w-6xl w-full mx-auto p-6 md:p-12 flex flex-col gap-6">
          <div>
            <button
              onClick={() => router.push("/projects")}
              className="flex items-center gap-1.5 font-sans text-sm text-secondary hover:text-primary mb-6 transition-colors cursor-pointer"
            >
              <ArrowLeft className="h-4 w-4" />
              Back to Directory
            </button>
          </div>

          {loading ? (
            <div className="bg-white border-2 border-black rounded-sketchy shadow-flat-offset p-12 flex items-center justify-center">
              <Loader2 className="h-8 w-8 animate-spin text-tertiary mr-3" />
              <span className="font-cursive text-xl">Loading project feed...</span>
            </div>
          ) : error || !project ? (
            <div className="bg-accent-pink border-2 border-black rounded-sketchy shadow-flat-offset p-8 text-center max-w-lg mx-auto">
              <h2 className="font-cursive text-2xl font-bold mb-2">Access Restrained</h2>
              <p className="font-sans text-sm text-secondary mb-6">
                {error || "We couldn't retrieve this board's coordinates."}
              </p>
              <button
                onClick={() => router.push("/projects")}
                className="bg-white hover:bg-neutral-bg text-primary border-2 border-black font-sans text-xs font-bold px-6 py-2 rounded-full shadow-flat-offset-sm active:translate-y-0.5 hover:-translate-y-0.5 transition-all cursor-pointer"
              >
                Back to Projects
              </button>
            </div>
          ) : (
            <div className="flex flex-col gap-8">
              
              {/* Project Title Card */}
              <div className="bg-white border-2 border-black rounded-sketchy shadow-flat-offset p-6 flex flex-col md:flex-row md:items-center justify-between gap-6">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-3 mb-2 flex-wrap">
                    <h1 className="font-cursive text-3xl font-bold tracking-tight truncate">
                      {project.name}
                    </h1>
                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full uppercase ${statusBadgeColor}`}>
                      {project.status}
                    </span>
                  </div>
                  <p className="font-sans text-sm text-secondary leading-relaxed">
                    {project.description || "No description provided for this project whiteboard board."}
                  </p>
                  <div className="flex items-center gap-2 mt-4 text-[10px] text-secondary/60 font-sans" suppressHydrationWarning>
                    <Calendar className="h-3.5 w-3.5" />
                    <span>Created: {new Date(project.created_at).toLocaleDateString()}</span>
                    <span>•</span>
                    <span>Updated: {new Date(project.updated_at).toLocaleDateString()}</span>
                  </div>
                </div>
              </div>

              {/* Tabs Container */}
              <div className="flex flex-col gap-4">
                {/* Tab Headers */}
                <div className="flex border-b-2 border-black gap-2">
                  <button
                    onClick={() => router.push(`/projects/${projectId}`)}
                    className="px-6 py-2.5 text-sm font-bold font-cursive transition-all -mb-0.5 cursor-pointer border-b-2 border-transparent hover:bg-neutral-bg/50 text-secondary"
                  >
                    <span className="flex items-center gap-2">
                      <ClipboardList className="h-4 w-4" />
                      Backlog
                    </span>
                  </button>
                  <button
                    onClick={() => router.push(`/projects/${projectId}/board`)}
                    className="px-6 py-2.5 text-sm font-bold font-cursive transition-all -mb-0.5 cursor-pointer border-b-2 border-transparent hover:bg-neutral-bg/50 text-secondary"
                  >
                    <span className="flex items-center gap-2">
                      <FolderKanban className="h-4 w-4" />
                      Board
                    </span>
                  </button>
                  <button
                    onClick={() => router.push(`/projects/${projectId}?tab=members`)}
                    className="px-6 py-2.5 text-sm font-bold font-cursive transition-all -mb-0.5 cursor-pointer border-b-2 border-transparent hover:bg-neutral-bg/50 text-secondary"
                  >
                    <span className="flex items-center gap-2">
                      <Users className="h-4 w-4" />
                      Members
                    </span>
                  </button>
                  <button
                    disabled
                    className="px-6 py-2.5 text-sm font-bold font-cursive transition-all -mb-0.5 cursor-default bg-accent-yellow border-2 border-black border-b-0 rounded-t-lg shadow-[0_-2px_0_rgba(0,0,0,1)] text-primary"
                  >
                    <span className="flex items-center gap-2">
                      <Activity className="h-4 w-4" />
                      Activity
                    </span>
                  </button>
                </div>

                {/* Tab Content Body */}
                <div className="mt-4">
                  {loadingActivities ? (
                    <div className="bg-white border-2 border-black rounded-sketchy shadow-flat-offset p-12 flex items-center justify-center">
                      <Loader2 className="h-8 w-8 animate-spin text-tertiary mr-3" />
                      <span className="font-cursive text-xl">Loading activities...</span>
                    </div>
                  ) : (
                    <ActivityFeed 
                      projectId={projectId}
                      orgId={activeOrgId!}
                      initialActivities={activities}
                    />
                  )}
                </div>
              </div>

            </div>
          )}
        </div>
      </div>
    </div>
  );
}
