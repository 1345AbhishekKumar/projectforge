"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useUser, useAuth } from "@clerk/nextjs";
import { LogOut, User as UserIcon, Plus, FolderKanban, Loader2, Info } from "lucide-react";

import { OrgSwitcher } from "@/components/orgs/OrgSwitcher";
import { NotificationBell } from "@/components/notifications/NotificationBell";
import { CreateProjectModal } from "@/components/projects/CreateProjectModal";
import { ProjectCard } from "@/components/projects/ProjectCard";
import { Sidebar } from "@/components/layout/Sidebar";
import { getUserProjects, createProject } from "@/actions/project";
import type { Project, ProjectStatus } from "@/types";

import { useOrgStore } from "@/store/orgStore";
import { useProjectStore } from "@/store/projectStore";

export default function ProjectsDirectoryPage() {
  const router = useRouter();
  const { user, isLoaded } = useUser();
  const { signOut } = useAuth();

  const { activeOrgId, activeOrgName } = useOrgStore();
  const { isCreateModalOpen: isModalOpen, openCreateModal, closeCreateModal } = useProjectStore();
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const handleSignOut = async () => {
    await signOut();
    router.push("/sign-in");
  };

  // Fetch projects when activeOrgId changes
  useEffect(() => {
    if (!activeOrgId) {
      const timer = setTimeout(() => {
        setProjects([]);
        setLoading(false);
      }, 0);
      return () => clearTimeout(timer);
    }

    async function loadProjects() {
      setLoading(true);
      setError("");
      const result = await getUserProjects(activeOrgId!);
      if (result.success && result.data) {
        setProjects(result.data);
      } else {
        setError(result.error || "Failed to load projects");
      }
      setLoading(false);
    }

    loadProjects();
  }, [activeOrgId]);

  // Create project callback passed to modal
  async function handleCreateProject(name: string, description: string | null, status: ProjectStatus) {
    if (!activeOrgId) return { success: false, error: "No active workspace selected" };
    const res = await createProject(name, description, status, activeOrgId);
    if (res.success) {
      // Reload projects list
      const projectsRes = await getUserProjects(activeOrgId);
      if (projectsRes.success && projectsRes.data) setProjects(projectsRes.data);
    }
    return res;
  }

  if (!isLoaded) {
    return (
      <div className="min-h-screen w-full flex items-center justify-center bg-neutral-bg bg-dot-grid text-primary">
        <span className="font-cursive text-xl animate-pulse">Loading directory...</span>
      </div>
    );
  }

  // Filter projects by status
  const planningProjects = projects.filter((p) => p.status === "PLANNING");
  const activeProjects = projects.filter((p) => p.status === "ACTIVE");
  const completedProjects = projects.filter((p) => p.status === "COMPLETED");
  const archivedProjects = projects.filter((p) => p.status === "ARCHIVED");

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

      {/* Main Container */}
      <div className="flex-1 max-w-6xl w-full mx-auto p-6 md:p-12 flex flex-col gap-8">
        {!activeOrgId ? (
          <div className="bg-white border-2 border-black rounded-sketchy shadow-flat-offset p-8 text-center max-w-lg mx-auto mt-8">
            <div className="w-12 h-12 rounded-full bg-accent-pink border-2 border-black flex items-center justify-center mx-auto mb-4 shadow-flat-offset-sm">
              <FolderKanban className="h-6 w-6" />
            </div>
            <h2 className="font-cursive text-2xl font-bold mb-2">No Active Workspace</h2>
            <p className="font-sans text-sm text-secondary mb-6">
              Please select or create an organization workspace to view and manage team projects directory.
            </p>
            <button
              onClick={() => router.push("/orgs/create")}
              className="bg-accent-yellow hover:bg-[#FFE680] text-primary border-2 border-black font-sans text-sm font-bold px-6 py-2.5 rounded-full shadow-flat-offset-sm active:translate-y-0.5 hover:-translate-y-0.5 transition-all cursor-pointer"
            >
              Create New Workspace
            </button>
          </div>
        ) : (
          <div className="flex flex-col gap-6">
            {/* Header / Actions Section */}
            <div className="bg-white border-2 border-black rounded-sketchy shadow-flat-offset p-6 flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div>
                <h1 className="font-cursive text-3xl font-bold mb-1">
                  Projects Directory: <span className="underline decoration-tertiary decoration-2">{activeOrgName}</span>
                </h1>
                <p className="font-sans text-xs text-secondary">
                  Manage active project backlogs and plan upcoming tasks.
                </p>
              </div>
              <button
                onClick={openCreateModal}
                className="flex items-center justify-center gap-1.5 self-start md:self-center bg-tertiary hover:bg-tertiary-hover text-white border-2 border-black font-sans text-xs font-bold px-4 py-2.5 rounded-full shadow-flat-offset-sm active:translate-y-0.5 hover:-translate-y-0.5 transition-all cursor-pointer"
              >
                <Plus className="h-4 w-4" />
                New Project
              </button>
            </div>

            {error && (
              <div className="bg-accent-pink border-2 border-black rounded-sketchy-sm p-4 text-center">
                <p className="font-sans text-sm font-semibold">{error}</p>
              </div>
            )}

            {loading ? (
              <div className="bg-white border-2 border-black rounded-sketchy shadow-flat-offset p-12 flex items-center justify-center">
                <Loader2 className="h-8 w-8 animate-spin text-tertiary mr-3" />
                <span className="font-cursive text-xl">Loading project boards...</span>
              </div>
            ) : projects.length === 0 ? (
              <div className="bg-white border-2 border-black rounded-sketchy shadow-flat-offset p-12 text-center max-w-md mx-auto mt-4">
                <div className="w-16 h-16 rounded-full bg-accent-yellow border-2 border-black flex items-center justify-center mx-auto mb-4 rotate-[2deg] shadow-flat-offset-sm">
                  <FolderKanban className="h-8 w-8 text-primary" />
                </div>
                <h3 className="font-cursive text-2xl font-bold mb-2">Empty Whiteboard</h3>
                <p className="font-sans text-sm text-secondary mb-6">
                  No projects have been deployed to this workspace yet. Let&apos;s outline the first project scope!
                </p>
                <button
                  onClick={openCreateModal}
                  className="bg-accent-yellow hover:bg-[#FFE680] text-primary border-2 border-black font-sans text-xs font-bold px-5 py-2 rounded-full shadow-flat-offset-sm active:translate-y-0.5 hover:-translate-y-0.5 transition-all cursor-pointer"
                >
                  Create First Project
                </button>
              </div>
            ) : (
              <div className="flex flex-col gap-8">
                {/* Active Column Sections */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                  {/* Planning Projects */}
                  <div className="bg-white border-2 border-black rounded-sketchy p-5 shadow-flat-offset-sm flex flex-col gap-4">
                    <div className="flex items-center justify-between border-b border-black pb-2">
                      <h2 className="font-cursive text-xl font-bold">Planning</h2>
                      <span className="bg-accent-yellow border border-black/20 text-[10px] font-bold px-2 py-0.5 rounded-full">
                        {planningProjects.length}
                      </span>
                    </div>
                    {planningProjects.length === 0 ? (
                      <p className="font-sans text-xs text-secondary/70 italic text-center py-6">No planning boards</p>
                    ) : (
                      <div className="flex flex-col gap-4">
                        {planningProjects.map((p) => (
                          <ProjectCard key={p.id} project={p} />
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Active Projects */}
                  <div className="bg-white border-2 border-black rounded-sketchy p-5 shadow-flat-offset-sm flex flex-col gap-4">
                    <div className="flex items-center justify-between border-b border-black pb-2">
                      <h2 className="font-cursive text-xl font-bold">Active</h2>
                      <span className="bg-accent-blue border border-black/20 text-[10px] font-bold px-2 py-0.5 rounded-full">
                        {activeProjects.length}
                      </span>
                    </div>
                    {activeProjects.length === 0 ? (
                      <p className="font-sans text-xs text-secondary/70 italic text-center py-6">No active boards</p>
                    ) : (
                      <div className="flex flex-col gap-4">
                        {activeProjects.map((p) => (
                          <ProjectCard key={p.id} project={p} />
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Completed Projects */}
                  <div className="bg-white border-2 border-black rounded-sketchy p-5 shadow-flat-offset-sm flex flex-col gap-4">
                    <div className="flex items-center justify-between border-b border-black pb-2">
                      <h2 className="font-cursive text-xl font-bold">Completed</h2>
                      <span className="bg-accent-green border border-black/20 text-[10px] font-bold px-2 py-0.5 rounded-full">
                        {completedProjects.length}
                      </span>
                    </div>
                    {completedProjects.length === 0 ? (
                      <p className="font-sans text-xs text-secondary/70 italic text-center py-6">No completed boards</p>
                    ) : (
                      <div className="flex flex-col gap-4">
                        {completedProjects.map((p) => (
                          <ProjectCard key={p.id} project={p} />
                        ))}
                      </div>
                    )}
                  </div>
                </div>

                {/* Archived Section */}
                {archivedProjects.length > 0 && (
                  <div className="bg-white/40 border-2 border-black border-dashed rounded-sketchy p-5">
                    <div className="flex items-center gap-2 border-b border-black/10 pb-2 mb-4">
                      <Info className="h-4 w-4 text-secondary/80" />
                      <h2 className="font-cursive text-lg font-bold text-secondary">Archived Projects</h2>
                      <span className="bg-neutral-bg border border-black/10 text-secondary/70 text-[10px] font-bold px-2 py-0.5 rounded-full ml-auto">
                        {archivedProjects.length}
                      </span>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
                      {archivedProjects.map((p) => (
                        <ProjectCard key={p.id} project={p} />
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Project Creation Overlay Modal */}
      <CreateProjectModal
        isOpen={isModalOpen}
        onClose={closeCreateModal}
        onCreate={handleCreateProject}
      />
      </div>
    </div>
  );
}
