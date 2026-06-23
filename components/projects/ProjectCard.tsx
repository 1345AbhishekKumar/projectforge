"use client";

import { FolderOpen, Calendar } from "lucide-react";
import type { Project, ProjectStatus } from "@/types";
import { PrefetchLink } from "@/components/shared/PrefetchLink";
import { useOrgStore } from "@/store/orgStore";
import { getProjectDetails } from "@/actions/project";
import { getProjectTasks } from "@/actions/task";

type Props = {
  project: Project;
};

export function ProjectCard({ project }: Props) {
  const { activeOrgId } = useOrgStore();

  const statusColors: Record<ProjectStatus, string> = {
    PLANNING: "bg-accent-yellow border-2 border-black",
    ACTIVE: "bg-accent-blue border-2 border-black",
    COMPLETED: "bg-accent-green border-2 border-black",
    ARCHIVED: "bg-white border-2 border-black opacity-60",
  };

  const statusBadgeColors: Record<ProjectStatus, string> = {
    PLANNING: "bg-white/70 text-primary border border-black/20",
    ACTIVE: "bg-white/70 text-primary border border-black/20",
    COMPLETED: "bg-white/70 text-primary border border-black/20",
    ARCHIVED: "bg-neutral-bg text-secondary border border-black/10",
  };

  const cardBgColor = statusColors[project.status] || "bg-white border-2 border-black";
  const badgeBgColor = statusBadgeColors[project.status] || "bg-neutral-bg text-primary";

  const formattedDate = new Date(project.created_at).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });

  const prefetchQueries = activeOrgId
    ? [
        {
          queryKey: ["project", project.id, activeOrgId],
          queryFn: () => getProjectDetails(project.id, activeOrgId),
        },
        {
          queryKey: ["tasks", project.id, activeOrgId],
          queryFn: () => getProjectTasks(project.id, activeOrgId),
        },
      ]
    : [];

  return (
    <PrefetchLink
      href={`/projects/${project.id}`}
      prefetchQueries={prefetchQueries}
      className={`block w-full ${cardBgColor} rounded-sketchy p-5 shadow-flat-offset-sm hover:-translate-y-1 hover:rotate-1 hover:shadow-flat-offset active:translate-y-0.5 active:rotate-0 transition-all duration-200 cursor-pointer`}
    >
      <div className="flex flex-col h-full gap-3">
        {/* Card Header */}
        <div className="flex items-start justify-between gap-2">
          <div className="flex items-center gap-2">
            <FolderOpen className="h-4 w-4 shrink-0 text-primary" />
            <h3 className="font-cursive text-xl font-bold leading-tight line-clamp-1">
              {project.name}
            </h3>
          </div>
          <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full uppercase shrink-0 ${badgeBgColor}`}>
            {project.status}
          </span>
        </div>

        {/* Card Body */}
        <p className="font-sans text-xs text-secondary leading-relaxed line-clamp-3 min-h-[54px]">
          {project.description || "No description provided. Define tasks and scopes for this whiteboard board."}
        </p>

        {/* Divider */}
        <div className="border-t border-black/10 my-1" />

        {/* Card Footer */}
        <div className="flex items-center justify-between text-[10px] text-secondary/60 font-sans mt-auto">
          <div className="flex items-center gap-1">
            <Calendar className="h-3 w-3" />
            <span suppressHydrationWarning>{formattedDate}</span>
          </div>
          <span className="font-bold underline decoration-tertiary decoration-2">Open Board →</span>
        </div>
      </div>
    </PrefetchLink>
  );
}
