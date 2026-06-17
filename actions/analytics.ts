"use server";

import { auth } from "@clerk/nextjs/server";
import { createInsforgeServer } from "@/lib/insforge-server";
import { orgIdSchema } from "@/lib/utils";
import { verifyMembership, getOrganizationMemberships } from "@/lib/auth-helpers";
import { logger } from "@/lib/logger";


export type MemberWorkload = {
  userId: string | null;
  name: string;
  email: string;
  avatarUrl: string | null;
  total: number;
  completed: number;
  overdue: number;
};

export type AnalyticsData = {
  totalProjects: number;
  activeProjects: number;
  completedProjects: number;
  totalTasks: number;
  completedTasks: number;
  overdueTasks: number;
  totalMembers: number;
  workload: MemberWorkload[];
  trend: { date: string; count: number }[];
};

export async function getAnalyticsData(
  orgId: string
): Promise<{ success: boolean; data?: AnalyticsData; error?: string }> {
  try {
    const validated = orgIdSchema.safeParse(orgId);
    if (!validated.success) {
      return { success: false, error: validated.error.issues[0].message };
    }

    const { userId } = await auth();
    if (!userId) return { success: false, error: "Unauthorized" };

    const insforge = createInsforgeServer(userId);

    const isMember = await verifyMembership(insforge, validated.data, userId);
    if (!isMember) {
      return { success: false, error: "Not a member of this workspace" };
    }

    // 1. Fetch projects
    const { data: projects, error: projectsError } = await insforge.database
      .from("projects")
      .select("status")
      .eq("organization_id", orgId);

    if (projectsError) {
      logger.error({ error: projectsError }, "Failed to fetch projects for analytics");
      return { success: false, error: "Failed to fetch project metrics" };
    }

    // 2. Fetch tasks
    const { data: tasks, error: tasksError } = await insforge.database
      .from("tasks")
      .select("id, status, assignee_id, due_date")
      .eq("organization_id", orgId);

    if (tasksError) {
      logger.error({ error: tasksError }, "Failed to fetch tasks for analytics");
      return { success: false, error: "Failed to fetch task metrics" };
    }

    // 3. Fetch memberships & profiles
    const { data: memberships, error: membershipsError } = await getOrganizationMemberships(insforge, orgId);

    if (membershipsError) {
      logger.error({ error: membershipsError }, "Failed to fetch members for analytics");
      return { success: false, error: "Failed to fetch membership metrics" };
    }

    // 4. Fetch completed task activities in last 7 days
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

    const { data: completions, error: activitiesError } = await insforge.database
      .from("activities")
      .select("created_at")
      .eq("organization_id", orgId)
      .eq("action_type", "TASK_COMPLETED")
      .gte("created_at", sevenDaysAgo.toISOString());

    if (activitiesError) {
      logger.error({ error: activitiesError }, "Failed to fetch completion trend activities");
      // Fallback but don't crash the whole analytics query
    }

    // --- Calculations ---

    const totalProjects = projects.length;
    const activeProjects = projects.filter((p) => p.status === "ACTIVE").length;
    const completedProjects = projects.filter((p) => p.status === "COMPLETED").length;

    const totalTasks = tasks.length;
    const completedTasks = tasks.filter((t) => t.status === "DONE").length;
    const overdueTasks = tasks.filter(
      (t) => t.status !== "DONE" && t.due_date && new Date(t.due_date) < new Date()
    ).length;

    const totalMembers = memberships.length;

    // --- Workload Breakdown ---
    const workloadMap = new Map<string, MemberWorkload>();

    // Initialize map with all organization members
    memberships.forEach((m: {
      user_id: string;
      profiles: {
        full_name: string | null;
        email: string;
        avatar_url: string | null;
      } | null;
    }) => {
      const prof = m.profiles || { full_name: null, email: "", avatar_url: null };
      workloadMap.set(m.user_id, {
        userId: m.user_id,
        name: prof.full_name || "Unknown Member",
        email: prof.email || "",
        avatarUrl: prof.avatar_url || null,
        total: 0,
        completed: 0,
        overdue: 0,
      });
    });

    let unassignedTotal = 0;
    let unassignedCompleted = 0;
    let unassignedOverdue = 0;

    // Distribute task counts
    tasks.forEach((t) => {
      const isOverdue = t.status !== "DONE" && t.due_date && new Date(t.due_date) < new Date();
      if (t.assignee_id && workloadMap.has(t.assignee_id)) {
        const stats = workloadMap.get(t.assignee_id)!;
        stats.total += 1;
        if (t.status === "DONE") stats.completed += 1;
        if (isOverdue) stats.overdue += 1;
      } else {
        unassignedTotal += 1;
        if (t.status === "DONE") unassignedCompleted += 1;
        if (isOverdue) unassignedOverdue += 1;
      }
    });

    const workloadList = Array.from(workloadMap.values());
    if (unassignedTotal > 0) {
      workloadList.push({
        userId: null,
        name: "Unassigned",
        email: "",
        avatarUrl: null,
        total: unassignedTotal,
        completed: unassignedCompleted,
        overdue: unassignedOverdue,
      });
    }

    // --- Trend Compilation (Last 7 Days) ---
    const trend: { date: string; count: number }[] = [];
    for (let i = 6; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      const dateString = d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
      
      const count = (completions || []).filter((c) => {
        const compDate = new Date(c.created_at);
        return compDate.toDateString() === d.toDateString();
      }).length;
      
      trend.push({ date: dateString, count });
    }

    return {
      success: true,
      data: {
        totalProjects,
        activeProjects,
        completedProjects,
        totalTasks,
        completedTasks,
        overdueTasks,
        totalMembers,
        workload: workloadList,
        trend,
      },
    };
  } catch (err) {
    logger.error({ error: err }, "Unexpected error in getAnalyticsData");
    return { success: false, error: "An unexpected error occurred" };
  }
}
