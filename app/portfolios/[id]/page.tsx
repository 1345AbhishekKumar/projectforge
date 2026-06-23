"use client";

import { useState, useEffect, use } from "react";
import { useRouter } from "next/navigation";
import { Plus, ArrowLeft, Layers, Loader2, Folder } from "lucide-react";

import { WorkspacePageLayout } from "@/components/layout/WorkspacePageLayout";
import { CreateProgramModal } from "@/components/portfolios/CreateProgramModal";
import { getPortfolioDetails } from "@/actions/portfolio";
import type { Portfolio } from "@/types";
import type { PortfolioRollupData } from "@/lib/portfolio-utils";
import { useOrgStore } from "@/store/orgStore";

type Props = {
  params: Promise<{ id: string }>;
};

export default function PortfolioDetailsPage({ params }: Props) {
  const router = useRouter();
  const { id: portfolioId } = use(params);
  const { activeOrgId, userRole } = useOrgStore();
  const [portfolio, setPortfolio] = useState<(Portfolio & PortfolioRollupData) | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [isModalOpen, setIsModalOpen] = useState(false);

  const [reloadTrigger, setReloadTrigger] = useState(0);
  const loadDetails = () => setReloadTrigger((prev) => prev + 1);

  useEffect(() => {
    if (!activeOrgId || !portfolioId) return;

    let isMounted = true;
    async function fetchData() {
      // Defer state updates to avoid synchronous setState warning
      await Promise.resolve();
      if (!isMounted) return;

      setLoading(true);
      setError("");
      try {
        const result = await getPortfolioDetails(activeOrgId, portfolioId);
        if (isMounted) {
          if (result.success && result.data) {
            setPortfolio(result.data);
          } else {
            setError(result.error || "Failed to load portfolio details");
          }
        }
      } catch {
        if (isMounted) {
          setError("An unexpected error occurred loading portfolio details");
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
  }, [activeOrgId, portfolioId, reloadTrigger]);

  const canManage = userRole === "OWNER" || userRole === "ADMIN";



  const healthColors = {
    ON_TRACK: "bg-accent-green text-primary border-black",
    AT_RISK: "bg-accent-yellow text-primary border-black",
    OFF_TRACK: "bg-accent-pink text-primary border-black",
  };

  return (
    <WorkspacePageLayout>
      <main className="flex-grow p-6 md:p-8 max-w-7xl w-full mx-auto flex flex-col gap-8">
          <div>
            <button
              onClick={() => router.push("/portfolios")}
              className="flex items-center gap-1.5 font-sans text-sm text-secondary hover:text-primary mb-2 transition-colors cursor-pointer"
            >
              <ArrowLeft className="h-4 w-4" />
              Back to Portfolios
            </button>
          </div>
          
          {loading ? (
            <div className="flex-grow flex items-center justify-center py-12">
              <div className="flex flex-col items-center gap-2">
                <Loader2 className="h-8 w-8 animate-spin text-tertiary" />
                <span className="font-cursive text-lg">Loading portfolio details...</span>
              </div>
            </div>
          ) : error || !portfolio ? (
            <div className="bg-accent-pink border-2 border-black rounded-sketchy p-6 text-center max-w-md mx-auto mt-6">
              <span className="font-cursive text-lg font-bold block mb-1">Failed to load details</span>
              <p className="font-sans text-xs text-secondary mb-4">{error || "Portfolio not found."}</p>
              <button
                onClick={loadDetails}
                className="px-4 py-2 bg-white border-2 border-black rounded-full text-xs font-bold shadow-flat-offset-sm hover:-translate-y-0.5 active:translate-y-0.5 transition-all"
              >
                Retry
              </button>
            </div>
          ) : (
            <>
              {/* Portfolio Header Info */}
              <div className="bg-white border-2 border-black rounded-sketchy shadow-flat-offset p-6 flex flex-col gap-6 md:flex-row md:items-center justify-between">
                <div className="flex flex-col gap-2 max-w-2xl">
                  <div className="flex items-center gap-3">
                    <span className="font-cursive text-sm text-tertiary font-bold tracking-wide uppercase">Portfolio Overview</span>
                    <span className={`text-[10px] font-sans font-bold border-2 px-2.5 py-0.5 rounded-full uppercase ${healthColors[portfolio.health]}`}>
                      {portfolio.health.replace("_", " ")}
                    </span>
                  </div>
                  <h1 className="font-cursive text-4xl font-bold">{portfolio.name}</h1>
                  <p className="font-sans text-sm text-secondary/90 leading-relaxed mt-1">
                    {portfolio.description || "No description provided for this portfolio."}
                  </p>
                </div>

                {/* Progress Rollup Summary */}
                <div className="flex flex-col gap-3 min-w-[200px] border-2 border-black p-4 rounded-sketchy-sm bg-neutral-bg/25">
                  <div className="flex items-center justify-between font-sans text-xs font-bold text-secondary">
                    <span>ROLLUP PROGRESS</span>
                    <span className="font-mono">{portfolio.progress}%</span>
                  </div>
                  <div className="w-full bg-neutral-dot border-2 border-black rounded-full h-4 overflow-hidden relative shadow-sm">
                    <div
                      className="bg-tertiary h-full border-r-2 border-black/20 transition-all duration-300"
                      style={{ width: `${portfolio.progress}%` }}
                    />
                  </div>
                  <div className="flex items-center justify-between font-mono text-[9px] font-bold text-secondary/60 mt-1 uppercase">
                    <span>Status: {portfolio.status}</span>
                    <span>Programs: {portfolio.programs.length}</span>
                  </div>
                </div>
              </div>

              {/* Programs Section */}
              <div className="flex flex-col gap-6">
                <div className="flex items-center justify-between border-b-2 border-black pb-2">
                  <h2 className="font-cursive text-2xl font-bold">Programs Coordination</h2>
                  
                  {canManage && (
                    <button
                      onClick={() => setIsModalOpen(true)}
                      className="flex items-center gap-1.5 bg-white hover:bg-neutral-bg text-primary border-2 border-black font-sans text-xs font-bold px-4 py-2 rounded-full shadow-flat-offset-xs active:translate-y-0.5 hover:-translate-y-0.5 transition-all cursor-pointer"
                    >
                      <Plus className="h-4 w-4 text-tertiary" />
                      Add Program
                    </button>
                  )}
                </div>

                {portfolio.programs.length === 0 ? (
                  <div className="bg-white border-2 border-black rounded-sketchy shadow-flat-offset p-8 text-center max-w-lg mx-auto mt-6">
                    <Layers className="h-12 w-12 text-secondary/40 mx-auto mb-4" />
                    <p className="font-cursive text-xl font-bold mb-2">No Programs Defined</p>
                    <p className="font-sans text-sm text-secondary mb-6">
                      Programs group and coordinate multiple projects under this portfolio.
                    </p>
                    {canManage ? (
                      <button
                        onClick={() => setIsModalOpen(true)}
                        className="bg-accent-yellow hover:bg-[#FFE680] text-primary border-2 border-black font-sans text-xs font-bold px-5 py-2.5 rounded-full shadow-flat-offset-sm active:translate-y-0.5 hover:-translate-y-0.5 transition-all cursor-pointer"
                      >
                        Create Your First Program
                      </button>
                    ) : (
                      <p className="font-sans text-xs text-secondary/60 italic">
                        Contact workspace owners to add programs.
                      </p>
                    )}
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                    {portfolio.programs.map((program, index) => {
                      const rotation = index % 2 === 0 ? "rotate-[0.5deg]" : "rotate-[-0.5deg]";
                      const progHealthColors = {
                        ON_TRACK: "bg-accent-green text-primary border-black",
                        AT_RISK: "bg-accent-yellow text-primary border-black",
                        OFF_TRACK: "bg-accent-pink text-primary border-black",
                      };

                      return (
                        <div
                          key={program.id}
                          onClick={() => router.push(`/programs/${program.id}`)}
                          className={`bg-white border-2 border-black rounded-sketchy p-6 shadow-flat-offset-sm hover:-translate-y-1 hover:rotate-1 hover:shadow-flat-offset active:translate-y-0.5 active:rotate-0 transition-all duration-200 cursor-pointer flex flex-col gap-4 relative ${rotation}`}
                        >
                          <div className="flex items-start justify-between gap-2">
                            <div className="flex items-center gap-2">
                              <Layers className="h-4 w-4 text-tertiary" />
                              <h3 className="font-cursive text-xl font-bold truncate max-w-[200px] sm:max-w-xs">
                                {program.name}
                              </h3>
                            </div>
                            <span className={`text-[9px] font-sans font-bold border-2 px-2 py-0.5 rounded-full uppercase ${progHealthColors[program.health]}`}>
                              {program.health.replace("_", " ")}
                            </span>
                          </div>

                          {/* Progress bar */}
                          <div className="mt-1">
                            <div className="flex items-center justify-between font-sans text-[10px] font-bold text-secondary mb-1">
                              <span>PROGRESS ROLLUP</span>
                              <span>{program.progress}%</span>
                            </div>
                            <div className="w-full bg-neutral-dot border border-black rounded-full h-3 overflow-hidden relative">
                              <div
                                className="bg-tertiary h-full border-r border-black/20 transition-all duration-300"
                                style={{ width: `${program.progress}%` }}
                              />
                            </div>
                          </div>

                          {/* Linked projects list */}
                          <div className="border-t border-black/10 pt-3 flex flex-col gap-2">
                            <span className="font-sans text-[10px] font-bold text-secondary/60 uppercase">
                              Linked Projects ({program.projects.length})
                            </span>
                            {program.projects.length === 0 ? (
                              <span className="font-sans text-xs text-secondary/40 italic">
                                No projects associated with this program.
                              </span>
                            ) : (
                              <div className="flex flex-wrap gap-2">
                                {program.projects.slice(0, 4).map((p) => (
                                  <div
                                    key={p.id}
                                    className="flex items-center gap-1 bg-neutral-bg border border-black/10 rounded px-2.5 py-1 text-[11px] font-semibold"
                                  >
                                    <Folder className="h-3 w-3 text-secondary/60" />
                                    <span>{p.name}</span>
                                    <span className="font-mono text-[9px] text-secondary/40 pl-1">
                                      ({p.progress}%)
                                    </span>
                                  </div>
                                ))}
                                {program.projects.length > 4 && (
                                  <span className="text-[10px] font-sans text-secondary/50 font-bold self-center">
                                    + {program.projects.length - 4} more
                                  </span>
                                )}
                              </div>
                            )}
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
        <CreateProgramModal
          isOpen={isModalOpen}
          onClose={() => setIsModalOpen(false)}
          orgId={activeOrgId}
          portfolioId={portfolioId}
          onSuccess={loadDetails}
        />
      )}
    </WorkspacePageLayout>
  );
}
