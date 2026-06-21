"use server";

import { auth } from "@clerk/nextjs/server";
import { createInsforgeServer } from "@/lib/insforge-server";
import { verifyMembership } from "@/lib/auth-helpers";
import { logger, flushLogsAfterResponse } from "@/lib/logger";
import * as Sentry from "@sentry/nextjs";
import { z } from "zod";
import type { Task } from "@/types";
import { getPortfolioMetrics, getProgramMetrics } from "@/lib/portfolio-utils";

const reportInputSchema = z.object({
  orgId: z.string().uuid("Invalid organization ID"),
  startDate: z.string().optional(),
  endDate: z.string().optional(),
});

type RoleRate = 150 | 125 | 100 | 75;

type Profile = {
  id: string;
  full_name: string | null;
  email: string;
  avatar_url: string | null;
};

type RawMembership = {
  user_id: string;
  role: string;
  profiles: Profile | Profile[] | null;
};

type ResourceAllocation = {
  id: string;
  user_id: string;
  project_id: string;
  allocation_percentage: number;
  created_at: string;
};

type PortfolioReportData = {
  id: string;
  name: string;
  status: string;
  progress: number;
  health: string;
  cost: number;
};

type ProgramReportData = {
  id: string;
  name: string;
  status: string;
  progress: number;
  health: string;
  cost: number;
};

type DepartmentReportData = {
  id: string;
  name: string;
  parentDepartmentId: string | null;
  totalTasks: number;
  completedTasks: number;
  completionRate: number;
  cost: number;
};

type CapacityReportData = {
  userId: string;
  name: string;
  email: string;
  avatarUrl: string | null;
  role: string;
  totalAllocatedPercentage: number;
  allocatedWeeklyCost: number;
  allocations: {
    projectId: string;
    projectName: string;
    percentage: number;
  }[];
};

// Helper to determine role-based hourly rate
function getHourlyRate(role: string | null): RoleRate {
  if (!role) return 75;
  const normalized = role.toUpperCase();
  if (normalized === "OWNER" || normalized === "ADMIN") return 150;
  if (normalized === "MANAGER" || normalized === "LEAD") return 125;
  if (normalized === "MEMBER" || normalized === "CONTRIBUTOR") return 100;
  return 75;
}

export async function getEnterpriseReportingData(
  orgId: string,
  startDate?: string,
  endDate?: string
) {
  const validated = reportInputSchema.safeParse({ orgId, startDate, endDate });
  if (!validated.success) {
    return { success: false, error: validated.error.issues[0].message };
  }

  try {
    const { userId } = await auth();
    if (!userId) return { success: false, error: "Unauthorized" };

    const insforge = createInsforgeServer(userId);
    const isMember = await verifyMembership(insforge, validated.data.orgId, userId);
    if (!isMember) return { success: false, error: "Access denied: Not a member of this workspace" };

    // 1. Fetch Portfolios, Programs, Program Projects, Departments, Projects, Tasks, and Memberships
    const [
      portfoliosRes,
      programsRes,
      programProjectsRes,
      departmentsRes,
      projectsRes,
      tasksRes,
      membershipsRes
    ] = await Promise.all([
      insforge.database.from("portfolios").select("*").eq("organization_id", validated.data.orgId),
      insforge.database.from("programs").select("*"),
      insforge.database.from("program_projects").select("*"),
      insforge.database.from("departments").select("*").eq("organization_id", validated.data.orgId),
      insforge.database.from("projects").select("*").eq("organization_id", validated.data.orgId),
      insforge.database.from("tasks").select("*").eq("organization_id", validated.data.orgId),
      insforge.database.from("memberships").select(`
        user_id,
        role,
        profiles(id, full_name, email, avatar_url)
      `).eq("organization_id", validated.data.orgId)
    ]);

    if (
      portfoliosRes.error ||
      programsRes.error ||
      programProjectsRes.error ||
      departmentsRes.error ||
      projectsRes.error ||
      tasksRes.error ||
      membershipsRes.error
    ) {
      logger.error({
        portfoliosErr: portfoliosRes.error,
        programsErr: programsRes.error,
        departmentsErr: departmentsRes.error,
        projectsErr: projectsRes.error,
        tasksErr: tasksRes.error,
        membershipsErr: membershipsRes.error,
      }, "Error fetching data for enterprise reporting");
      return { success: false, error: "Failed to fetch reporting data" };
    }

    const projects = projectsRes.data || [];
    const tasks = tasksRes.data || [];
    const departments = departmentsRes.data || [];
    const memberships = (membershipsRes.data || []) as unknown as RawMembership[];
    const portfolios = portfoliosRes.data || [];
    const programs = (programsRes.data || []).filter(p => portfolios.some(port => port.id === p.portfolio_id));
    const programProjects = programProjectsRes.data || [];

    // Map user roles for hourly rates
    const userRoleMap = new Map<string, string>();
    const userProfileMap = new Map<string, { name: string; email: string; avatarUrl: string | null }>();
    memberships.forEach((m) => {
      userRoleMap.set(m.user_id, m.role);
      const profile = Array.isArray(m.profiles) ? m.profiles[0] : m.profiles;
      if (profile) {
        userProfileMap.set(m.user_id, {
          name: profile.full_name || profile.email,
          email: profile.email,
          avatarUrl: profile.avatar_url
        });
      }
    });

    // 2. Fetch resource allocations for these projects
    const projectIds = projects.map(p => p.id);
    let allocations: ResourceAllocation[] = [];
    if (projectIds.length > 0) {
      const allocationsRes = await insforge.database
        .from("resource_allocations")
        .select("*")
        .in("project_id", projectIds);
      if (!allocationsRes.error) {
        allocations = (allocationsRes.data || []) as ResourceAllocation[];
      }
    }

    // 3. Compute cost for each project (Estimated Task Cost)
    const projectCostMap = new Map<string, number>();
    projects.forEach((p) => {
      const projTasks = tasks.filter((t: Task) => t.project_id === p.id);
      const cost = projTasks.reduce((acc, t: Task) => {
        const rate = getHourlyRate(t.assignee_id ? userRoleMap.get(t.assignee_id) || null : null);
        const hours = t.estimated_hours !== null && t.estimated_hours !== undefined ? t.estimated_hours : 8;
        return acc + (hours * rate);
      }, 0);
      projectCostMap.set(p.id, cost);
    });

    // 4. Roll up Program and Portfolio metrics
    const programsData: ProgramReportData[] = [];
    for (const prog of programs) {
      const rollup = await getProgramMetrics(insforge, prog.id);
      const linkedProjIds = programProjects.filter(pp => pp.program_id === prog.id).map(pp => pp.project_id);
      const cost = linkedProjIds.reduce((acc, pid) => acc + (projectCostMap.get(pid) || 0), 0);
      programsData.push({
        id: prog.id,
        name: prog.name,
        status: prog.status,
        progress: rollup.progress,
        health: rollup.health,
        cost
      });
    }

    const portfoliosData: PortfolioReportData[] = [];
    for (const port of portfolios) {
      const rollup = await getPortfolioMetrics(insforge, port.id);
      const portProgs = programs.filter(p => p.portfolio_id === port.id);
      const linkedProjIds = programProjects
        .filter(pp => portProgs.some(prog => prog.id === pp.program_id))
        .map(pp => pp.project_id);
      const cost = linkedProjIds.reduce((acc, pid) => acc + (projectCostMap.get(pid) || 0), 0);
      portfoliosData.push({
        id: port.id,
        name: port.name,
        status: port.status,
        progress: rollup.progress,
        health: rollup.health,
        cost
      });
    }

    // 5. Roll up Department metrics recursively
    const deptProjectsMap = new Map<string, string[]>();
    projects.forEach((p) => {
      if (p.department_id) {
        if (!deptProjectsMap.has(p.department_id)) deptProjectsMap.set(p.department_id, []);
        deptProjectsMap.get(p.department_id)!.push(p.id);
      }
    });

    const deptChildrenMap = new Map<string, string[]>();
    departments.forEach((d) => {
      if (d.parent_department_id) {
        if (!deptChildrenMap.has(d.parent_department_id)) deptChildrenMap.set(d.parent_department_id, []);
        deptChildrenMap.get(d.parent_department_id)!.push(d.id);
      }
    });

    // Recursive helper to get all project IDs for a department branch
    function getDeptProjectIds(deptId: string): string[] {
      let pIds = deptProjectsMap.get(deptId) || [];
      const children = deptChildrenMap.get(deptId) || [];
      children.forEach((cId) => {
        pIds = pIds.concat(getDeptProjectIds(cId));
      });
      return pIds;
    }

    const departmentsData: DepartmentReportData[] = departments.map((d) => {
      const pIds = getDeptProjectIds(d.id);
      const deptTasks = tasks.filter((t: Task) => pIds.includes(t.project_id));
      const completedCount = deptTasks.filter((t: Task) => t.status === "DONE").length;
      const totalCount = deptTasks.length;
      const rate = totalCount > 0 ? Math.round((completedCount / totalCount) * 100) : 0;
      const cost = pIds.reduce((acc, pid) => acc + (projectCostMap.get(pid) || 0), 0);

      return {
        id: d.id,
        name: d.name,
        parentDepartmentId: d.parent_department_id,
        totalTasks: totalCount,
        completedTasks: completedCount,
        completionRate: rate,
        cost
      };
    });

    // 6. Compute Resource Capacity Allocations
    const capacityData: CapacityReportData[] = memberships.map((m) => {
      const userAllocations = allocations.filter(a => a.user_id === m.user_id);
      const totalAllocated = userAllocations.reduce((acc, a) => acc + a.allocation_percentage, 0);
      const rate = getHourlyRate(m.role);
      // Cost of allocation = (percentage/100) * 40 hrs/week * rate
      const allocatedWeeklyCost = Math.round((totalAllocated / 100) * 40 * rate);

      const allocatedProjects = userAllocations.map((a) => {
        const proj = projects.find(p => p.id === a.project_id);
        return {
          projectId: a.project_id,
          projectName: proj ? proj.name : "Unknown Project",
          percentage: a.allocation_percentage
        };
      });

      const profile = userProfileMap.get(m.user_id);

      return {
        userId: m.user_id,
        name: profile?.name || "Unknown User",
        email: profile?.email || "",
        avatarUrl: profile?.avatarUrl || null,
        role: m.role,
        totalAllocatedPercentage: totalAllocated,
        allocatedWeeklyCost,
        allocations: allocatedProjects
      };
    });

    return {
      success: true,
      data: {
        portfolios: portfoliosData,
        programs: programsData,
        departments: departmentsData,
        capacity: capacityData,
      }
    };
  } catch (err) {
    logger.error({ error: err, orgId }, "Unexpected error in getEnterpriseReportingData");
    Sentry.captureException(err);
    return { success: false, error: "An unexpected error occurred" };
  } finally {
    flushLogsAfterResponse();
  }
}

export async function exportEnterpriseReportCSV(orgId: string): Promise<{ success: boolean; data?: string; error?: string }> {
  try {
    const res = await getEnterpriseReportingData(orgId);
    if (!res.success || !res.data) {
      return { success: false, error: res.error || "Failed to retrieve reporting data" };
    }

    const { portfolios, programs, departments, capacity } = res.data;

    let csvContent = "ProjectForge Enterprise Executive Report\n\n";

    csvContent += "PORTFOLIO SUMMARY\n";
    csvContent += "Portfolio Name,Status,Progress (%),Health,Total Estimated Cost ($)\n";
    portfolios.forEach((p) => {
      csvContent += `"${p.name.replace(/"/g, '""')}",${p.status},${p.progress}%,${p.health},$${p.cost}\n`;
    });
    csvContent += "\n";

    csvContent += "PROGRAM SUMMARY\n";
    csvContent += "Program Name,Status,Progress (%),Health,Total Estimated Cost ($)\n";
    programs.forEach((p) => {
      csvContent += `"${p.name.replace(/"/g, '""')}",${p.status},${p.progress}%,${p.health},$${p.cost}\n`;
    });
    csvContent += "\n";

    csvContent += "DEPARTMENT PERFORMANCE & COSTS\n";
    csvContent += "Department Name,Total Tasks,Completed Tasks,Completion Rate (%),Rolled Up Cost ($)\n";
    departments.forEach((d) => {
      csvContent += `"${d.name.replace(/"/g, '""')}",${d.totalTasks},${d.completedTasks},${d.completionRate}%,$${d.cost}\n`;
    });
    csvContent += "\n";

    csvContent += "RESOURCE CAPACITY & ALLOCATIONS\n";
    csvContent += "Resource Name,Role,Total Allocation (%),Weekly Allocated Cost ($),Allocations Details\n";
    capacity.forEach((c) => {
      const details = c.allocations.map((a) => `${a.projectName} (${a.percentage}%)`).join("; ");
      csvContent += `"${c.name.replace(/"/g, '""')}","${c.role}",${c.totalAllocatedPercentage}%,$${c.allocatedWeeklyCost},"${details.replace(/"/g, '""')}"\n`;
    });

    return { success: true, data: csvContent };
  } catch (err) {
    logger.error({ error: err, orgId }, "Unexpected error in exportEnterpriseReportCSV");
    Sentry.captureException(err);
    return { success: false, error: "An unexpected error occurred" };
  } finally {
    flushLogsAfterResponse();
  }
}
