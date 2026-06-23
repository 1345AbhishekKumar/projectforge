"use client";

import { useUser } from "@clerk/nextjs";
import { Plus, FolderKanban, Loader2, Info } from "lucide-react";

import { CreateProjectModal } from "@/components/projects/CreateProjectModal";
import { ProjectCard } from "@/components/projects/ProjectCard";
import { WorkspacePageLayout } from "@/components/layout/WorkspacePageLayout";
import { NoWorkspacePlaceholder } from "@/components/layout/NoWorkspacePlaceholder";
import { HeaderBar } from "@/components/layout/HeaderBar";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { getUserProjects, createProject } from "@/actions/project";
import type { Project, ProjectStatus } from "@/types";

import { useOrgStore } from "@/store/orgStore";
import { useProjectStore } from "@/store/projectStore";

export default function ProjectsDirectoryPage() {
  const { isLoaded } = useUser();
  const queryClient = useQueryClient();

  const { activeOrgId, activeOrgName } = useOrgStore();
  const { isCreateModalOpen: isModalOpen, openCreateModal, closeCreateModal } = useProjectStore();

  // Fetch projects using React Query
  const { data: projects = [], isLoading: loading, error: queryError } = useQuery<Project[]>({
    queryKey: ["projects", activeOrgId],
    queryFn: async () => {
      if (!activeOrgId) return [];
      const result = await getUserProjects(activeOrgId);
      if (!result.success) throw new Error(result.error || "Failed to load projects");
      return result.data || [];
    },
    enabled: !!activeOrgId,
  });

  const createProjectMutation = useMutation({
    mutationFn: async ({ name, description, status, templateId }: {
      name: string;
      description: string | null;
      status: ProjectStatus;
      templateId?: string;
    }) => {
      if (!activeOrgId) throw new Error("No active workspace selected");
      const res = await createProject(name, description, status, activeOrgId, null, templateId || null);
      if (!res.success) throw new Error(res.error || "Failed to create project");
      return res;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["projects", activeOrgId] });
    },
  });

  const error = queryError ? (queryError as Error).message : "";

  // Create project callback passed to modal
  async function handleCreateProject(name: string, description: string | null, status: ProjectStatus, templateId?: string) {
    try {
      const res = await createProjectMutation.mutateAsync({ name, description, status, templateId });
      return res;
    } catch (err) {
      return { success: false, error: err instanceof Error ? err.message : "An error occurred" };
    }
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
    <WorkspacePageLayout>
      {/* Main Container */}
      <div className="flex-1 max-w-6xl w-full mx-auto p-6 md:p-12 flex flex-col gap-8">
        {!activeOrgId ? (
          <NoWorkspacePlaceholder
            icon={
              <div className="w-12 h-12 rounded-full bg-accent-pink border-2 border-black flex items-center justify-center mx-auto mb-4 shadow-flat-offset-sm">
                <FolderKanban className="h-6 w-6 text-primary" />
              </div>
            }
            title="No Active Workspace"
            description="Please select or create an organization workspace to view and manage team projects directory."
            showCreateButton
          />
        ) : (
          <div className="flex flex-col gap-6">
            {/* Header / Actions Section */}
            <HeaderBar
              title={
                <>
                  Projects Directory: <span className="underline decoration-tertiary decoration-2">{activeOrgName}</span>
                </>
              }
              description="Manage active project backlogs and plan upcoming tasks."
              action={
                <button
                  onClick={openCreateModal}
                  className="flex items-center justify-center gap-1.5 bg-tertiary hover:bg-tertiary-hover text-white border-2 border-black font-sans text-xs font-bold px-4 py-2.5 rounded-full shadow-flat-offset-sm active:translate-y-0.5 hover:-translate-y-0.5 transition-all cursor-pointer"
                >
                  <Plus className="h-4 w-4" />
                  New Project
                </button>
              }
            />

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
    </WorkspacePageLayout>
  );
}
