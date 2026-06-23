"use client";

import Link from "next/link";
import { useTranslation } from "@/lib/i18n/useTranslation";
import { ArrowRight } from "lucide-react";
import type { Project } from "@/types";
import { useProjects } from "@/hooks/useProjects";
import { useTasks } from "@/hooks/useTasks";

interface Props {
  orgId: string;
}

export function ActiveProjects({ orgId }: Props) {
  const { t } = useTranslation();

  // 1. Fetch workspace projects
  const { data: projects = [], isLoading: loadingProjects } = useProjects(orgId);

  // 2. Fetch organization tasks (shared cache)
  const { data: tasks = [], isLoading: loadingTasks } = useTasks(orgId);

  const activeProjects = projects.filter((p) => p.status === "ACTIVE");

  const getProjectProgress = (projectId: string) => {
    const projectTasks = tasks.filter((t) => t.project_id === projectId);
    const total = projectTasks.length;
    if (total === 0) return 0;
    const completed = projectTasks.filter((t) => t.status === "DONE").length;
    return Math.round((completed / total) * 100);
  };

  const getStatusColor = (status: Project["status"]) => {
    switch (status) {
      case "PLANNING":
        return "bg-accent-yellow";
      case "ACTIVE":
        return "bg-accent-blue";
      case "COMPLETED":
        return "bg-accent-green";
      default:
        return "bg-neutral-dot";
    }
  };

  const isLoading = loadingProjects || loadingTasks;

  if (isLoading) {
    return (
      <div className="bg-white border-2 border-black rounded-sketchy shadow-flat-offset p-6 flex flex-col gap-4">
        <h2 className="font-cursive text-2xl font-bold border-b-2 border-black pb-2">
          🚀 {t("dashboard.activeprojects.title", "Active Projects")}
        </h2>
        <div className="flex flex-col gap-4">
          {[...Array(2)].map((_, i) => (
            <div
              key={i}
              className="h-24 bg-neutral-bg border-2 border-black rounded-sketchy-sm animate-pulse"
            />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white border-2 border-black rounded-sketchy shadow-flat-offset p-6 flex flex-col gap-4 relative">
      <div className="flex justify-between items-center border-b-2 border-black pb-2">
        <h2 className="font-cursive text-2xl font-bold text-primary">
          🚀 {t("dashboard.activeprojects.title", "Active Projects")}
        </h2>
        <span className="font-sans text-xs bg-neutral-bg border border-black px-2 py-0.5 rounded-full font-bold">
          {activeProjects.length} {t("dashboard.activeprojects.countSuffix", "Active")}
        </span>
      </div>

      {activeProjects.length === 0 ? (
        <div className="py-8 text-center bg-neutral-bg/20 border-2 border-dashed border-black/20 rounded-sketchy p-6">
          <p className="font-cursive text-lg text-secondary">
            {t("dashboard.activeprojects.empty", "No active projects. Go start one! 🏁")}
          </p>
          <Link
            href="/projects"
            className="mt-3 inline-flex items-center gap-2 bg-accent-yellow hover:bg-[#FFE680] text-primary border-2 border-black font-sans text-xs font-bold px-4 py-2.5 rounded-full shadow-flat-offset-sm active:translate-y-0.5 transition-all"
          >
            {t("dashboard.activeprojects.gotoDirectory", "Projects Directory")} <ArrowRight className="h-3 w-3" />
          </Link>
        </div>
      ) : (
        <div className="flex flex-col gap-4">
          {activeProjects.map((project) => {
            const progress = getProjectProgress(project.id);
            return (
              <div
                key={project.id}
                className="p-4 border-2 border-black rounded-sketchy bg-neutral-bg/10 hover:bg-neutral-bg/30 transition-colors duration-150 flex flex-col gap-3 relative"
              >
                <div className="flex justify-between items-start gap-4">
                  <div className="flex flex-col">
                    <div className="flex items-center gap-2">
                      <h4 className="font-sans text-base font-bold text-primary hover:underline">
                        <Link href={`/projects/${project.id}`}>{project.name}</Link>
                      </h4>
                      <span
                        className={`font-sans text-[9px] uppercase font-bold border border-black px-1.5 py-0.5 rounded-full ${getStatusColor(
                          project.status
                        )}`}
                      >
                        {project.status}
                      </span>
                    </div>
                    {project.description && (
                      <p className="font-sans text-xs text-secondary mt-1 line-clamp-1">
                        {project.description}
                      </p>
                    )}
                  </div>
                  <Link
                    href={`/projects/${project.id}/board`}
                    className="flex items-center gap-1 text-[11px] font-sans font-bold bg-white hover:bg-neutral-bg border-2 border-black rounded-full px-3 py-1 shadow-flat-offset-xs shrink-0 active:translate-y-0.5"
                  >
                    Board <ArrowRight className="h-3 w-3" />
                  </Link>
                </div>

                <div className="flex flex-col gap-1.5 mt-2">
                  <div className="flex justify-between items-center text-xs font-bold font-sans">
                    <span className="text-secondary">{t("dashboard.activeprojects.progress", "Progress")}</span>
                    <span className="text-primary">{progress}%</span>
                  </div>
                  <div className="w-full bg-neutral-dot border-2 border-black rounded-full h-4 overflow-hidden relative shadow-sm">
                    <div
                      style={{ width: `${progress}%` }}
                      className="bg-accent-green h-full border-r-2 border-black transition-all duration-300"
                    />
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
