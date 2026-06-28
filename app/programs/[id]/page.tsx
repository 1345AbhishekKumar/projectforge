"use client";

import { useState, useEffect, use } from "react";
import { useRouter } from "next/navigation";
import { User as UserIcon, Plus, ArrowLeft, Loader2, Folder, ShieldAlert, CheckCircle2, AlertTriangle, Unlink } from "lucide-react";

import Image from "next/image";

import { WorkspacePageLayout } from "@/components/layout/WorkspacePageLayout";
import { ProjectLinker } from "@/components/portfolios/ProjectLinker";
import { getProgramDetails, unlinkProjectFromProgram } from "@/actions/program";
import type { Program } from "@/types";
import type { ProgramRollupData } from "@/lib/portfolio-utils";
import { useOrgStore } from "@/store/orgStore";

type Props = {
  params: Promise<{ id: string }>;
};

export default function ProgramDetailsPage({ params }: Props) {
  const router = useRouter();
  const { id: programId } = use(params);
  const { activeOrgId, userRole } = useOrgStore();
  const [program, setProgram] = useState<(Program & ProgramRollupData & { portfolio_id: string; manager?: { full_name: string | null; email: string; avatar_url: string | null } | null }) | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [isLinkerOpen, setIsLinkerOpen] = useState(false);
  const [unlinkingId, setUnlinkingId] = useState<string | null>(null);

  const [reloadTrigger, setReloadTrigger] = useState(0);
  const loadDetails = () => setReloadTrigger((prev) => prev + 1);

  useEffect(() => {
    if (!activeOrgId || !programId) return;

    let isMounted = true;
    async function fetchData() {
      // Defer state updates to avoid synchronous setState warning
      await Promise.resolve();
      if (!isMounted) return;

      setLoading(true);
      setError("");
      try {
        const result = await getProgramDetails(activeOrgId!, programId);
        if (isMounted) {
          if (result.success && result.data) {
            setProgram(result.data);
          } else {
            setError(result.error || "Failed to load program details");
          }
        }
      } catch {
        if (isMounted) {
          setError("An unexpected error occurred loading program details");
        }
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    }

    fetchData();
    return () => {
      isMounted = false;
    };
  }, [activeOrgId, programId, reloadTrigger]);

  const canManage = userRole === "OWNER" || userRole === "ADMIN";

  async function handleUnlink(projectId: string) {
    if (!activeOrgId || !programId) return;
    setUnlinkingId(projectId);
    try {
      const result = await unlinkProjectFromProgram(activeOrgId, programId, projectId);
      if (result.success) {
        await loadDetails();
      } else {
        alert(result.error || "Failed to unlink project");
      }
    } catch {
      alert("An unexpected error occurred unlinking project");
    } finally {
      setUnlinkingId(null);
    }
  }



  const healthColors = {
    ON_TRACK: "bg-accent-green text-primary border-black",
    AT_RISK: "bg-accent-yellow text-primary border-black",
    OFF_TRACK: "bg-accent-pink text-primary border-black",
  };

  const healthIcons = {
    ON_TRACK: <CheckCircle2 className="h-4 w-4 text-emerald-600" />,
    AT_RISK: <AlertTriangle className="h-4 w-4 text-amber-500" />,
    OFF_TRACK: <ShieldAlert className="h-4 w-4 text-rose-500" />,
  };

  return (
    <WorkspacePageLayout>
      <main className="flex-grow p-6 md:p-8 max-w-7xl w-full mx-auto flex flex-col gap-8">
          <div>
            <button
              onClick={() => {
                if (program?.portfolio_id) {
                  router.push(`/portfolios/${program.portfolio_id}`);
                } else {
                  router.push("/portfolios");
                }
              }}
              className="flex items-center gap-1.5 font-sans text-sm text-secondary hover:text-primary mb-2 transition-colors cursor-pointer"
            >
              <ArrowLeft className="h-4 w-4" />
              Back to Portfolio
            </button>
          </div>
          
          {loading ? (
            <div className="flex-grow flex items-center justify-center py-12">
              <div className="flex flex-col items-center gap-2">
                <Loader2 className="h-8 w-8 animate-spin text-tertiary" />
                <span className="font-cursive text-lg">Loading program details...</span>
              </div>
            </div>
          ) : error || !program ? (
            <div className="bg-accent-pink border-2 border-black rounded-sketchy p-6 text-center max-w-md mx-auto mt-6">
              <span className="font-cursive text-lg font-bold block mb-1">Failed to load details</span>
              <p className="font-sans text-xs text-secondary mb-4">{error || "Program not found."}</p>
              <button
                onClick={loadDetails}
                className="px-4 py-2 bg-white border-2 border-black rounded-full text-xs font-bold shadow-flat-offset-sm hover:-translate-y-0.5 active:translate-y-0.5 transition-all"
              >
                Retry
              </button>
            </div>
          ) : (
            <>
              {/* Program Header Card */}
              <div className="bg-white border-2 border-black rounded-sketchy shadow-flat-offset p-6 flex flex-col gap-6 md:flex-row md:items-center justify-between">
                <div className="flex flex-col gap-2 max-w-2xl">
                  <div className="flex items-center gap-3">
                    <span className="font-cursive text-sm text-tertiary font-bold tracking-wide uppercase">Program Coordination</span>
                    <span className={`text-[10px] font-sans font-bold border-2 px-2.5 py-0.5 rounded-full uppercase ${healthColors[program.health]}`}>
                      {program.health.replace("_", " ")}
                    </span>
                  </div>
                  <h1 className="font-cursive text-4xl font-bold">{program.name}</h1>
                  
                  {/* Manager details */}
                  <div className="flex items-center gap-2 mt-2">
                    <span className="font-sans text-xs text-secondary/60">Manager:</span>
                    {program.manager ? (
                      <div className="flex items-center gap-2">
                        {program.manager.avatar_url ? (
                          <Image src={program.manager.avatar_url} alt={program.manager.full_name || ""} width={20} height={20} className="w-5 h-5 rounded-full border border-black object-cover" />
                        ) : (
                          <div className="w-5 h-5 rounded-full bg-accent-yellow border border-black flex items-center justify-center">
                            <UserIcon className="h-2.5 w-2.5" />
                          </div>
                        )}
                        <span className="font-sans text-xs font-bold text-primary">
                          {program.manager.full_name || "Unknown"}
                        </span>
                        <span className="font-sans text-[10px] text-secondary/60">
                          ({program.manager.email})
                        </span>
                      </div>
                    ) : (
                      <span className="font-sans text-xs italic text-secondary/50">Unassigned</span>
                    )}
                  </div>
                </div>

                {/* Progress rollup */}
                <div className="flex flex-col gap-3 min-w-[200px] border-2 border-black p-4 rounded-sketchy-sm bg-neutral-bg/25">
                  <div className="flex items-center justify-between font-sans text-xs font-bold text-secondary">
                    <span>ROLLUP PROGRESS</span>
                    <span className="font-mono">{program.progress}%</span>
                  </div>
                  <div className="w-full bg-neutral-dot border-2 border-black rounded-full h-4 overflow-hidden relative shadow-sm">
                    <div
                      className="bg-tertiary h-full border-r-2 border-black/20 transition-all duration-300"
                      style={{ width: `${program.progress}%` }}
                    />
                  </div>
                  <div className="flex items-center justify-between font-mono text-[9px] font-bold text-secondary/60 mt-1 uppercase">
                    <span>Status: {program.status}</span>
                    <span>Projects: {program.projects.length}</span>
                  </div>
                </div>
              </div>

              {/* Projects List Section */}
              <div className="flex flex-col gap-6">
                <div className="flex items-center justify-between border-b-2 border-black pb-2">
                  <h2 className="font-cursive text-2xl font-bold">Linked Projects</h2>
                  
                  {canManage && (
                    <button
                      onClick={() => setIsLinkerOpen(true)}
                      className="flex items-center gap-1.5 bg-white hover:bg-neutral-bg text-primary border-2 border-black font-sans text-xs font-bold px-4 py-2 rounded-full shadow-flat-offset-xs active:translate-y-0.5 hover:-translate-y-0.5 transition-all cursor-pointer"
                    >
                      <Plus className="h-4 w-4 text-tertiary" />
                      Link Projects
                    </button>
                  )}
                </div>

                {program.projects.length === 0 ? (
                  <div className="bg-white border-2 border-black rounded-sketchy shadow-flat-offset p-8 text-center max-w-lg mx-auto mt-6">
                    <Folder className="h-12 w-12 text-secondary/40 mx-auto mb-4" />
                    <p className="font-cursive text-xl font-bold mb-2">No Linked Projects</p>
                    <p className="font-sans text-sm text-secondary mb-6">
                      Link existing projects to start monitoring aggregated completion rates and team alignment.
                    </p>
                    {canManage ? (
                      <button
                        onClick={() => setIsLinkerOpen(true)}
                        className="bg-accent-yellow hover:bg-[#FFE680] text-primary border-2 border-black font-sans text-xs font-bold px-5 py-2.5 rounded-full shadow-flat-offset-sm active:translate-y-0.5 hover:-translate-y-0.5 transition-all cursor-pointer"
                      >
                        Link Existing Project
                      </button>
                    ) : (
                      <p className="font-sans text-xs text-secondary/60 italic">
                        Contact workspace managers to link projects.
                      </p>
                    )}
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {program.projects.map((project, index) => {
                      const rotation = index % 2 === 0 ? "rotate-[0.5deg]" : "rotate-[-0.5deg]";
                      const projStatusColors = {
                        PLANNING: "bg-accent-yellow",
                        ACTIVE: "bg-accent-blue",
                        COMPLETED: "bg-accent-green",
                        ARCHIVED: "bg-neutral-bg",
                      };

                      return (
                        <div
                          key={project.id}
                          className={`bg-white border-2 border-black rounded-sketchy p-5 shadow-flat-offset-sm flex flex-col gap-4 relative ${rotation}`}
                        >
                          <div className="flex items-start justify-between gap-4">
                            <div
                              onClick={() => router.push(`/projects/${project.id}`)}
                              className="flex items-center gap-2 cursor-pointer group"
                            >
                              <Folder className="h-4.5 w-4.5 text-secondary group-hover:text-tertiary transition-colors" />
                              <h3 className="font-cursive text-xl font-bold group-hover:underline decoration-tertiary decoration-2 truncate max-w-[160px] sm:max-w-xs">
                                {project.name}
                              </h3>
                            </div>
                            
                            {canManage && (
                              <button
                                onClick={() => handleUnlink(project.id)}
                                disabled={unlinkingId === project.id}
                                className="p-1 border border-black/10 rounded-full hover:bg-accent-pink hover:border-black cursor-pointer text-secondary/50 hover:text-rose-600 transition-colors shadow-flat-offset-xs disabled:opacity-40"
                                title="Unlink Project"
                              >
                                {unlinkingId === project.id ? (
                                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                                ) : (
                                  <Unlink className="h-3.5 w-3.5" />
                                )}
                              </button>
                            )}
                          </div>

                          <div className="flex flex-wrap items-center gap-3">
                            <span className={`text-[9px] font-sans font-bold px-2 py-0.5 rounded border border-black/10 uppercase ${projStatusColors[project.status as keyof typeof projStatusColors]}`}>
                              {project.status}
                            </span>
                            <div className="flex items-center gap-1 font-mono text-[9px] font-semibold text-secondary/70">
                              {healthIcons[project.health]}
                              <span className="uppercase">{project.health.replace("_", " ")}</span>
                            </div>
                          </div>

                          {/* Progress */}
                          <div>
                            <div className="flex items-center justify-between font-sans text-[10px] font-bold text-secondary mb-1">
                              <span>PROGRESS</span>
                              <span>{project.progress}%</span>
                            </div>
                            <div className="w-full bg-neutral-dot border border-black rounded-full h-3 overflow-hidden relative">
                              <div
                                className="bg-tertiary h-full border-r border-black/20 transition-all duration-300"
                                style={{ width: `${project.progress}%` }}
                              />
                            </div>
                          </div>

                          {/* Quick statistics */}
                          <div className="grid grid-cols-3 gap-2 border-t border-black/10 pt-3 text-center text-secondary/70 font-mono text-[10px]">
                            <div className="flex flex-col">
                              <span className="font-bold text-primary text-xs">{project.totalTaskCount}</span>
                              <span className="text-[8px] uppercase">Tasks</span>
                            </div>
                            <div className="flex flex-col border-x border-black/10">
                              <span className="font-bold text-emerald-600 text-xs">{project.completedTaskCount}</span>
                              <span className="text-[8px] uppercase">Completed</span>
                            </div>
                            <div className="flex flex-col">
                              <span className={`font-bold text-xs ${project.overdueTaskCount > 0 ? "text-rose-600 font-extrabold animate-pulse" : "text-primary"}`}>
                                {project.overdueTaskCount}
                              </span>
                              <span className="text-[8px] uppercase">Overdue</span>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </>
          )}
      </main>

      {activeOrgId && (
        <ProjectLinker
          isOpen={isLinkerOpen}
          onClose={() => setIsLinkerOpen(false)}
          orgId={activeOrgId}
          programId={programId}
          onSuccess={loadDetails}
        />
      )}
    </WorkspacePageLayout>
  );
}
