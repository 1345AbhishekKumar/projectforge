"use server";

import { auth } from "@clerk/nextjs/server";
import { createInsforgeServer } from "@/lib/insforge-server";
import { z } from "zod";
import type { TeamMember } from "@/types";
import { verifyMembership, getOrganizationMemberships } from "@/lib/auth-helpers";
import { logger, flushLogsAfterResponse } from "@/lib/logger";
import * as Sentry from "@sentry/nextjs";

const teamSchema = z.object({
  orgId: z.string().uuid("Invalid organization ID"),
});


export async function getTeamDirectory(
  orgId: string
): Promise<{ success: boolean; data?: TeamMember[]; error?: string }> {
  try {
    const { userId } = await auth();
    if (!userId) return { success: false, error: "Unauthorized" };

    const validated = teamSchema.safeParse({ orgId });
    if (!validated.success) {
      return { success: false, error: validated.error.issues[0].message };
    }

    const insforge = createInsforgeServer(userId);

    const isMember = await verifyMembership(insforge, orgId, userId);
    if (!isMember) {
      return { success: false, error: "Not a member of this workspace" };
    }

    // Fetch all memberships with profile data using helper
    const { data: memberships, error: membershipsError } = await getOrganizationMemberships(insforge, orgId);

    if (membershipsError) {
      logger.error({ error: membershipsError }, "Failed to fetch team memberships");
      return { success: false, error: "Failed to fetch team members" };
    }

    // Fetch all non-done tasks scoped to this org for workload computation
    const { data: tasks, error: tasksError } = await insforge.database
      .from("tasks")
      .select("id, assignee_id, project_id, status")
      .eq("organization_id", orgId)
      .neq("status", "DONE");

    if (tasksError) {
      logger.error({ error: tasksError }, "Failed to fetch tasks for team directory");
      return { success: false, error: "Failed to fetch task workloads" };
    }

    type RawMembership = {
      user_id: string;
      role: string;
      profiles: { full_name: string | null; avatar_url: string | null; email: string }[] | null;
    };

    type RawTask = {
      id: string;
      assignee_id: string | null;
      project_id: string;
      status: string;
    };

    const taskList = (tasks as RawTask[]) || [];

    // Build per-member workload stats
    const teamMembers: TeamMember[] = (memberships as unknown as RawMembership[] || []).map((m) => {
      const memberTasks = taskList.filter((t) => t.assignee_id === m.user_id);
      const activeProjectIds = new Set(memberTasks.map((t) => t.project_id));
      const profile = m.profiles && m.profiles.length > 0 ? m.profiles[0] : null;

      return {
        user_id: m.user_id,
        full_name: profile?.full_name ?? null,
        avatar_url: profile?.avatar_url ?? null,
        email: profile?.email ?? "",
        role: m.role as "OWNER" | "ADMIN" | "MEMBER",
        assigned_task_count: memberTasks.length,
        active_project_count: activeProjectIds.size,
      };
    });

    // Sort: OWNER first, then ADMIN, then MEMBER — then by assigned tasks desc
    const roleOrder: Record<string, number> = { OWNER: 0, ADMIN: 1, MEMBER: 2 };
    teamMembers.sort((a, b) => {
      const roleDiff = (roleOrder[a.role] ?? 3) - (roleOrder[b.role] ?? 3);
      if (roleDiff !== 0) return roleDiff;
      return b.assigned_task_count - a.assigned_task_count;
    });

    return { success: true, data: teamMembers };
  } catch (err) {
    logger.error({ error: err }, "Unexpected error in getTeamDirectory");
    Sentry.captureException(err);
    return { success: false, error: "An unexpected error occurred" };
  } finally {
    flushLogsAfterResponse();
  }
}
