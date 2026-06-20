import { createInsforgeServer } from "./insforge-server";
import type { PortfolioStatus, ProgramStatus } from "@/types";

export type ProjectProgressData = {
  id: string;
  name: string;
  status: string;
  progress: number;
  health: "ON_TRACK" | "AT_RISK" | "OFF_TRACK";
  overdueTaskCount: number;
  totalTaskCount: number;
  completedTaskCount: number;
};

export type ProgramRollupData = {
  id: string;
  name: string;
  status: ProgramStatus;
  progress: number;
  health: "ON_TRACK" | "AT_RISK" | "OFF_TRACK";
  projects: ProjectProgressData[];
};

export type PortfolioRollupData = {
  id: string;
  name: string;
  status: PortfolioStatus;
  progress: number;
  health: "ON_TRACK" | "AT_RISK" | "OFF_TRACK";
  programs: ProgramRollupData[];
};

/**
 * Calculates metrics and health for a single project.
 */
export async function getProjectMetrics(
  insforge: ReturnType<typeof createInsforgeServer>,
  projectId: string
): Promise<ProjectProgressData> {
  const { data: project } = await insforge.database
    .from("projects")
    .select("name, status")
    .eq("id", projectId)
    .single();

  const { data: tasks } = await insforge.database
    .from("tasks")
    .select("id, status, due_date")
    .eq("project_id", projectId);

  const total = tasks?.length || 0;
  const completed = tasks?.filter((t) => t.status === "DONE").length || 0;
  const progress = total > 0 ? Math.round((completed / total) * 100) : 0;

  const now = new Date();
  const overdueTasks = tasks?.filter((t) => {
    if (t.status === "DONE" || !t.due_date) return false;
    return new Date(t.due_date) < now;
  }) || [];
  const overdueCount = overdueTasks.length;

  const overdueRatio = total > 0 ? overdueCount / total : 0;

  let health: "ON_TRACK" | "AT_RISK" | "OFF_TRACK" = "ON_TRACK";
  if (overdueRatio > 0.5) {
    health = "OFF_TRACK";
  } else if (overdueRatio > 0.2 || overdueCount > 0) {
    health = "AT_RISK";
  }

  return {
    id: projectId,
    name: project?.name || "Unknown Project",
    status: project?.status || "PLANNING",
    progress,
    health,
    overdueTaskCount: overdueCount,
    totalTaskCount: total,
    completedTaskCount: completed,
  };
}

/**
 * Aggregates metrics and health for a program.
 */
export async function getProgramMetrics(
  insforge: ReturnType<typeof createInsforgeServer>,
  programId: string
): Promise<ProgramRollupData> {
  const { data: program } = await insforge.database
    .from("programs")
    .select("name, status")
    .eq("id", programId)
    .single();

  const { data: programProjects } = await insforge.database
    .from("program_projects")
    .select("project_id")
    .eq("program_id", programId);

  const projectIds = programProjects?.map((pp) => pp.project_id) || [];
  const projectsData: ProjectProgressData[] = [];

  for (const id of projectIds) {
    const pMetrics = await getProjectMetrics(insforge, id);
    projectsData.push(pMetrics);
  }

  const projectCount = projectsData.length;
  const progressSum = projectsData.reduce((acc, p) => acc + p.progress, 0);
  const progress = projectCount > 0 ? Math.round(progressSum / projectCount) : 0;

  let health: "ON_TRACK" | "AT_RISK" | "OFF_TRACK" = "ON_TRACK";
  if (projectsData.some((p) => p.health === "OFF_TRACK")) {
    health = "OFF_TRACK";
  } else if (projectsData.some((p) => p.health === "AT_RISK")) {
    health = "AT_RISK";
  }

  return {
    id: programId,
    name: program?.name || "Unknown Program",
    status: program?.status || "ACTIVE",
    progress,
    health,
    projects: projectsData,
  };
}

/**
 * Aggregates metrics and health for a portfolio.
 */
export async function getPortfolioMetrics(
  insforge: ReturnType<typeof createInsforgeServer>,
  portfolioId: string
): Promise<PortfolioRollupData> {
  const { data: portfolio } = await insforge.database
    .from("portfolios")
    .select("name, status")
    .eq("id", portfolioId)
    .single();

  const { data: programs } = await insforge.database
    .from("programs")
    .select("id")
    .eq("portfolio_id", portfolioId);

  const programsData: ProgramRollupData[] = [];
  const programIds = programs?.map((p) => p.id) || [];

  for (const id of programIds) {
    const pMetrics = await getProgramMetrics(insforge, id);
    programsData.push(pMetrics);
  }

  const programCount = programsData.length;
  const progressSum = programsData.reduce((acc, p) => acc + p.progress, 0);
  const progress = programCount > 0 ? Math.round(progressSum / programCount) : 0;

  let health: "ON_TRACK" | "AT_RISK" | "OFF_TRACK" = "ON_TRACK";
  if (programsData.some((p) => p.health === "OFF_TRACK")) {
    health = "OFF_TRACK";
  } else if (programsData.some((p) => p.health === "AT_RISK")) {
    health = "AT_RISK";
  }

  return {
    id: portfolioId,
    name: portfolio?.name || "Unknown Portfolio",
    status: portfolio?.status || "ACTIVE",
    progress,
    health,
    programs: programsData,
  };
}
