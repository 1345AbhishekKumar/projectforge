"use client";

import { useState, useEffect } from "react";
import { Plus, Briefcase, Loader2 } from "lucide-react";
import { useRouter } from "next/navigation";

import { OrgSwitcher } from "@/components/orgs/OrgSwitcher";
import { Navbar } from "@/components/layout/Navbar";
import { CreatePortfolioModal } from "@/components/portfolios/CreatePortfolioModal";
import { Sidebar } from "@/components/layout/Sidebar";
import { getPortfolios } from "@/actions/portfolio";
import type { Portfolio } from "@/types";
import type { PortfolioRollupData } from "@/lib/portfolio-utils";
import { useOrgStore } from "@/store/orgStore";

export default function PortfoliosDirectoryPage() {
  const router = useRouter();

  const { activeOrgId, activeOrgName, userRole } = useOrgStore();
  const [portfolios, setPortfolios] = useState<(Portfolio & PortfolioRollupData)[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [isModalOpen, setIsModalOpen] = useState(false);

  const [reloadTrigger, setReloadTrigger] = useState(0);
  const loadPortfolios = () => setReloadTrigger((prev) => prev + 1);

  useEffect(() => {
    if (!activeOrgId) {
      Promise.resolve().then(() => {
        setPortfolios([]);
        setLoading(false);
      });
      return;
    }

    let isMounted = true;
    async function fetchData() {
      // Defer state updates to avoid synchronous setState warning
      await Promise.resolve();
      if (!isMounted) return;

      setLoading(true);
      setError("");
      try {
        const result = await getPortfolios(activeOrgId);
        if (isMounted) {
          if (result.success && result.data) {
            setPortfolios(result.data);
          } else {
            setError(result.error || "Failed to load portfolios");
          }
        }
      } catch {
        if (isMounted) {
          setError("An error occurred loading portfolios");
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
  }, [activeOrgId, reloadTrigger]);

  const canManage = userRole === "OWNER" || userRole === "ADMIN";



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

        {/* Content Body */}
        <main className="flex-grow p-6 md:p-8 max-w-7xl w-full mx-auto flex flex-col gap-8">
          
          {/* Header Card */}
          <div className="bg-white border-2 border-black rounded-sketchy shadow-flat-offset p-6 flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="flex items-start gap-4">
              <div className="w-12 h-12 rounded-full bg-accent-yellow border-2 border-black flex items-center justify-center shadow-flat-offset-sm flex-shrink-0 mt-1">
                <Briefcase className="h-6 w-6 text-primary" />
              </div>
              <div>
                <h1 className="font-cursive text-3xl font-bold">Strategic Portfolios</h1>
                <p className="font-sans text-xs text-secondary mt-1">
                  Workspace: <span className="font-bold underline text-primary">{activeOrgName || "None selected"}</span>
                </p>
                <p className="font-sans text-xs text-secondary/80 mt-0.5">
                  Organize and monitor high-level programs and project metrics under unified strategic goals.
                </p>
              </div>
            </div>

            {canManage && activeOrgId && (
              <button
                onClick={() => setIsModalOpen(true)}
                className="flex items-center justify-center gap-2 bg-tertiary hover:bg-tertiary-hover text-white font-sans text-sm font-bold border-2 border-black rounded-full px-5 py-2.5 shadow-flat-offset-sm active:translate-y-0.5 hover:-translate-y-0.5 transition-all cursor-pointer"
              >
                <Plus className="h-4.5 w-4.5" />
                New Portfolio
              </button>
            )}
          </div>

          {!activeOrgId ? (
            <div className="bg-white border-2 border-black rounded-sketchy shadow-flat-offset p-8 text-center max-w-lg mx-auto mt-12">
              <p className="font-cursive text-xl font-bold mb-2">No Active Workspace</p>
              <p className="font-sans text-sm text-secondary mb-4">
                Please select or create an organization workspace to view strategic portfolios.
              </p>
              <OrgSwitcher />
            </div>
          ) : loading ? (
            <div className="flex-grow flex items-center justify-center py-12">
              <div className="flex flex-col items-center gap-2">
                <Loader2 className="h-8 w-8 animate-spin text-tertiary" />
                <span className="font-cursive text-lg">Loading portfolios...</span>
              </div>
            </div>
          ) : error ? (
            <div className="bg-accent-pink border-2 border-black rounded-sketchy p-6 text-center max-w-md mx-auto mt-6">
              <span className="font-cursive text-lg font-bold block mb-1">Failed to load portfolios</span>
              <p className="font-sans text-xs text-secondary mb-4">{error}</p>
              <button
                onClick={loadPortfolios}
                className="px-4 py-2 bg-white border-2 border-black rounded-full text-xs font-bold shadow-flat-offset-sm hover:-translate-y-0.5 active:translate-y-0.5 transition-all"
              >
                Retry
              </button>
            </div>
          ) : portfolios.length === 0 ? (
            <div className="bg-white border-2 border-black rounded-sketchy shadow-flat-offset p-8 md:p-12 text-center max-w-lg mx-auto mt-12">
              <Briefcase className="h-12 w-12 text-secondary/40 mx-auto mb-4" />
              <p className="font-cursive text-xl font-bold mb-2">No Portfolios Found</p>
              <p className="font-sans text-sm text-secondary mb-6">
                Strategic portfolios group your programs and projects to track overall progress and health.
              </p>
              {canManage ? (
                <button
                  onClick={() => setIsModalOpen(true)}
                  className="bg-accent-yellow hover:bg-[#FFE680] text-primary border-2 border-black font-sans text-sm font-bold px-6 py-2.5 rounded-full shadow-flat-offset-sm active:translate-y-0.5 hover:-translate-y-0.5 transition-all cursor-pointer"
                >
                  Create Your First Portfolio
                </button>
              ) : (
                <p className="font-sans text-xs text-secondary/60 italic">
                  Contact your workspace administrator to set up portfolios.
                </p>
              )}
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {portfolios.map((portfolio, index) => {
                const rotation = index % 3 === 0 ? "rotate-[-0.5deg]" : index % 3 === 1 ? "rotate-[0.5deg]" : "rotate-[-1deg]";
                
                const healthColors = {
                  ON_TRACK: "bg-accent-green text-primary border-black",
                  AT_RISK: "bg-accent-yellow text-primary border-black",
                  OFF_TRACK: "bg-accent-pink text-primary border-black",
                };

                return (
                  <div
                    key={portfolio.id}
                    onClick={() => router.push(`/portfolios/${portfolio.id}`)}
                    className={`bg-white border-2 border-black rounded-sketchy p-5 shadow-flat-offset-sm hover:-translate-y-1 hover:rotate-1 hover:shadow-flat-offset active:translate-y-0.5 active:rotate-0 transition-all duration-200 cursor-pointer flex flex-col gap-4 ${rotation}`}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <h3 className="font-cursive text-xl font-bold truncate pr-2">
                        {portfolio.name}
                      </h3>
                      <span className={`text-[10px] font-sans font-bold border-2 px-2.5 py-0.5 rounded-full uppercase ${healthColors[portfolio.health]}`}>
                        {portfolio.health.replace("_", " ")}
                      </span>
                    </div>

                    <p className="font-sans text-xs text-secondary/80 line-clamp-2 min-h-[2rem]">
                      {portfolio.description || "No description provided."}
                    </p>

                    <div className="border-t border-black/10 pt-3 mt-1 flex flex-col gap-2.5">
                      {/* Progress Segment */}
                      <div>
                        <div className="flex items-center justify-between font-sans text-[10px] font-bold text-secondary mb-1">
                          <span>ROLLUP PROGRESS</span>
                          <span>{portfolio.progress}%</span>
                        </div>
                        <div className="w-full bg-neutral-dot border border-black rounded-full h-3 overflow-hidden relative">
                          <div
                            className="bg-tertiary h-full border-r border-black/20 transition-all duration-300"
                            style={{ width: `${portfolio.progress}%` }}
                          />
                        </div>
                      </div>

                      <div className="flex items-center justify-between text-[10px] font-mono font-semibold text-secondary/70">
                        <span>PROGRAMS: {portfolio.programs.length}</span>
                        <span className="uppercase text-[9px] px-1.5 py-0.2 bg-neutral-bg border border-black/10 rounded">
                          {portfolio.status}
                        </span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </main>
      </div>

      {activeOrgId && (
        <CreatePortfolioModal
          isOpen={isModalOpen}
          onClose={() => setIsModalOpen(false)}
          orgId={activeOrgId}
          onSuccess={loadPortfolios}
        />
      )}
    </div>
  );
}
