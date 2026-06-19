"use server";

import { auth } from "@clerk/nextjs/server";
import { createInsforgeServer } from "@/lib/insforge-server";
import { verifyMembership } from "@/lib/auth-helpers";
import { logger, flushLogsAfterResponse } from "@/lib/logger";
import * as Sentry from "@sentry/nextjs";
import { z } from "zod";
import type { Task, Sprint } from "@/types";

const reportInputSchema = z.object({
  orgId: z.string().uuid("Invalid organization ID"),
  startDate: z.string().optional(),
  endDate: z.string().optional(),
});

export async function getReportingData(
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
    if (!isMember) return { success: false, error: "Not a member of this workspace" };

    // Fetch projects, tasks, sprints, task dependencies, profiles, and memberships
    const [projectsRes, tasksRes, sprintsRes, dependenciesRes, membershipsRes] = await Promise.all([
      insforge.database.from("projects").select("id, name, status").eq("organization_id", validated.data.orgId),
      insforge.database.from("tasks").select("*").eq("organization_id", validated.data.orgId),
      insforge.database.from("sprints").select("*").eq("organization_id", validated.data.orgId),
      insforge.database.from("task_dependencies").select("*"),
      insforge.database.from("memberships").select(`
        user_id,
        role,
        profiles(id, full_name, email, avatar_url)
      `).eq("organization_id", validated.data.orgId)
    ]);

    if (projectsRes.error || tasksRes.error || sprintsRes.error || dependenciesRes.error || membershipsRes.error) {
      logger.error({
        projectsErr: projectsRes.error,
        tasksErr: tasksRes.error,
        sprintsErr: sprintsRes.error,
        depErr: dependenciesRes.error,
        membersErr: membershipsRes.error
      }, "Error fetching data for reporting");
      return { success: false, error: "Failed to compile reporting data" };
    }

    interface RawMembership {
      user_id: string;
      role: string;
      profiles: {
        id: string;
        full_name: string | null;
        email: string;
        avatar_url: string | null;
      }[] | null;
    }

    const projects = (projectsRes.data || []) as { id: string; name: string; status: string }[];
    const tasks = (tasksRes.data || []) as Task[];
    const sprints = (sprintsRes.data || []) as Sprint[];
    const rawMemberships = (membershipsRes.data || []) as unknown as RawMembership[];

    const start = validated.data.startDate ? new Date(validated.data.startDate) : null;
    const end = validated.data.endDate ? new Date(validated.data.endDate) : null;

    const filteredTasks = tasks.filter((t: Task) => {
      const createdAt = new Date(t.created_at);
      if (start && createdAt < start) return false;
      if (end && createdAt > end) return false;
      return true;
    });

    const productivityMap: Record<string, { name: string; completedCount: number }> = {};
    
    type MemberProfile = {
      id: string;
      full_name: string | null;
      email: string;
      avatar_url: string | null;
    };
    rawMemberships.forEach((m: RawMembership) => {
      const profile = m.profiles && m.profiles.length > 0 ? m.profiles[0] as MemberProfile : null;
      if (profile) {
        productivityMap[profile.id] = {
          name: profile.full_name || profile.email || "Unknown User",
          completedCount: 0,
        };
      }
    });

    tasks.forEach((t: Task) => {
      if (t.status === "DONE" && t.assignee_id && productivityMap[t.assignee_id]) {
        if (t.updated_at) {
          const completedAt = new Date(t.updated_at);
          if (start && completedAt < start) return;
          if (end && completedAt > end) return;
        }
        productivityMap[t.assignee_id].completedCount++;
      }
    });

    const productivity = Object.values(productivityMap);

    const projectHealth = projects.map((p: { id: string; name: string; status: string }) => {
      const projectTasks = tasks.filter((t: Task) => t.project_id === p.id);
      if (projectTasks.length === 0) {
        return { projectId: p.id, name: p.name, score: 100, status: "GREEN", riskFactors: [] as string[] };
      }

      let score = 100;
      const riskFactors: string[] = [];

      const now = new Date();
      const overdueTasks = projectTasks.filter((t: Task) => t.status !== "DONE" && t.due_date && new Date(t.due_date) < now);
      if (overdueTasks.length > 0) {
        score -= overdueTasks.length * 10;
        riskFactors.push(`${overdueTasks.length} overdue task(s)`);
      }

      const projectTaskIds = projectTasks.map((t: Task) => t.id);
      const projectDeps = (dependenciesRes.data || []).filter((d: { source_task_id: string; target_task_id: string }) => 
        projectTaskIds.includes(d.target_task_id)
      );

      let blockedCount = 0;
      projectDeps.forEach((dep: { source_task_id: string; target_task_id: string }) => {
        const targetTask = projectTasks.find((t: Task) => t.id === dep.target_task_id);
        const sourceTask = tasks.find((t: Task) => t.id === dep.source_task_id);

        if (targetTask && targetTask.status !== "DONE" && sourceTask && sourceTask.status !== "DONE") {
          blockedCount++;
        }
      });

      if (blockedCount > 0) {
        score -= blockedCount * 15;
        riskFactors.push(`${blockedCount} unresolved blocked task(s)`);
      }

      const highTodo = projectTasks.filter((t: Task) => t.status === "TODO" && (t.priority === "HIGH" || t.priority === "URGENT"));
      if (highTodo.length > 0) {
        score -= highTodo.length * 5;
        riskFactors.push(`${highTodo.length} high/urgent priority task(s) still in TODO`);
      }

      score = Math.max(0, score);
      let status = "GREEN";
      if (score < 50) status = "RED";
      else if (score <= 80) status = "YELLOW";

      return {
        projectId: p.id,
        name: p.name,
        score,
        status,
        riskFactors,
      };
    });

    const completedSprints = sprints.filter((s: Sprint) => s.status === "COMPLETED");
    const sprintVelocity = completedSprints.map((s: Sprint) => {
      const sprintTasks = tasks.filter((t: Task) => t.sprint_id === s.id);
      const completedCount = sprintTasks.filter((t: Task) => t.status === "DONE").length;
      return {
        sprintId: s.id,
        name: s.name,
        completedCount,
      };
    });

    const createdCount = filteredTasks.length;
    const completedCount = filteredTasks.filter((t: Task) => t.status === "DONE").length;
    const completionRate = createdCount > 0 ? Math.round((completedCount / createdCount) * 100) : 0;

    const activeSprint = sprints.find((s: Sprint) => s.status === "ACTIVE");
    const workload = rawMemberships.map((m: RawMembership) => {
      const profile = m.profiles && m.profiles.length > 0 ? m.profiles[0] as MemberProfile : null;
      if (!profile) return null;

      const userTasks = tasks.filter((t: Task) => {
        if (t.assignee_id !== profile.id) return false;
        if (activeSprint) {
          return t.sprint_id === activeSprint.id;
        } else {
          return t.status !== "DONE";
        }
      });

      const totalTasks = userTasks.length;
      const overdueTasks = userTasks.filter((t: Task) => {
        const now = new Date();
        return t.status !== "DONE" && t.due_date && new Date(t.due_date) < now;
      }).length;

      const totalEstimatedHours = userTasks.reduce((acc: number, t: Task) => {
        const est = t.estimated_hours !== null && t.estimated_hours !== undefined ? t.estimated_hours : 8;
        return acc + est;
      }, 0);

      const capacityUtilization = Math.round((totalEstimatedHours / 40) * 100);

      return {
        userId: profile.id,
        name: profile.full_name || profile.email || "Unknown User",
        avatarUrl: profile.avatar_url,
        totalTasks,
        overdueTasks,
        totalEstimatedHours,
        capacityUtilization,
      };
    }).filter((item): item is NonNullable<typeof item> => item !== null);

    return {
      success: true,
      data: {
        productivity,
        projectHealth,
        sprintVelocity,
        taskCompletionRate: {
          createdCount,
          completedCount,
          rate: completionRate,
        },
        workload,
      },
    };
  } catch (err) {
    logger.error({ error: err, orgId }, "Unexpected error in getReportingData Server Action");
    Sentry.captureException(err);
    return { success: false, error: "An unexpected error occurred" };
  } finally {
    flushLogsAfterResponse();
  }
}

export async function exportReportCSV(orgId: string): Promise<{ success: boolean; data?: string; error?: string }> {
  try {
    const res = await getReportingData(orgId);
    if (!res.success || !res.data) {
      return { success: false, error: res.error || "Failed to retrieve reporting data" };
    }

    const { productivity, projectHealth, workload } = res.data;

    let csvContent = "ProjectForge Organization Report\n\n";

    csvContent += "TEAM PRODUCTIVITY\n";
    csvContent += "Member Name,Completed Tasks Count\n";
    productivity.forEach((p: { name: string; completedCount: number }) => {
      csvContent += `"${p.name.replace(/"/g, '""')}",${p.completedCount}\n`;
    });
    csvContent += "\n";

    csvContent += "PROJECT HEALTH SCORES\n";
    csvContent += "Project Name,Health Score,Status,Risk Factors\n";
    projectHealth.forEach((ph: { name: string; score: number; status: string; riskFactors: string[] }) => {
      const risks = ph.riskFactors.join("; ");
      csvContent += `"${ph.name.replace(/"/g, '""')}",${ph.score}%,${ph.status},"${risks.replace(/"/g, '""')}"\n`;
    });
    csvContent += "\n";

    csvContent += "TEAM CAPACITY & WORKLOAD\n";
    csvContent += "Member Name,Active Tasks,Overdue Tasks,Estimated Hours,Capacity Utilization (%)\n";
    workload.forEach((w: { name: string; totalTasks: number; overdueTasks: number; totalEstimatedHours: number; capacityUtilization: number }) => {
      csvContent += `"${w.name.replace(/"/g, '""')}",${w.totalTasks},${w.overdueTasks},${w.totalEstimatedHours},${w.capacityUtilization}%\n`;
    });

    return { success: true, data: csvContent };
  } catch (err) {
    logger.error({ error: err, orgId }, "Unexpected error in exportReportCSV");
    Sentry.captureException(err);
    return { success: false, error: "An unexpected error occurred" };
  } finally {
    flushLogsAfterResponse();
  }
}
