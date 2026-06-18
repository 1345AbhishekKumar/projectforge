"use server";

import { auth } from "@clerk/nextjs/server";
import { createInsforgeServer } from "@/lib/insforge-server";
import { z } from "zod";
import type { SearchResult } from "@/types";
import { verifyMembership, getOrganizationMemberships } from "@/lib/auth-helpers";
import { logger, flushLogsAfterResponse } from "@/lib/logger";

const searchSchema = z.object({
  query: z
    .string()
    .min(1, "Search query cannot be empty")
    .max(100, "Search query too long"),
  orgId: z.string().uuid("Invalid organization ID"),
});


export async function globalSearch(
  query: string,
  orgId: string
): Promise<{ success: boolean; data?: SearchResult; error?: string }> {
  const validated = searchSchema.safeParse({ query, orgId });
  if (!validated.success) {
    return { success: false, error: validated.error.issues[0].message };
  }

  try {
    const { userId } = await auth();
    if (!userId) return { success: false, error: "Unauthorized" };

    const insforge = createInsforgeServer(userId);

    const isMember = await verifyMembership(insforge, validated.data.orgId, userId);
    if (!isMember) {
      return { success: false, error: "Not a member of this workspace" };
    }

    const searchTerm = validated.data.query.trim();

    const [projectsRes, tasksRes, membersRes] = await Promise.all([
      // 1. Projects: match name ILIKE
      insforge.database
        .from("projects")
        .select("id, name, description, status")
        .eq("organization_id", orgId)
        .ilike("name", `%${searchTerm}%`)
        .limit(10),

      // 2. Tasks: match title/description using textSearch
      insforge.database
        .from("tasks")
        .select("id, project_id, title, description, status, priority")
        .eq("organization_id", orgId)
        .textSearch("title", searchTerm, { type: "plain" })
        .limit(10),

      // 3. Members: fetch all for org, filter in-process by name/email
      getOrganizationMemberships(insforge, orgId, 50),
    ]);

    if (projectsRes.error) {
      logger.error({ error: projectsRes.error }, "Search projects error");
      return { success: false, error: "Failed to search projects" };
    }

    if (tasksRes.error) {
      logger.error({ error: tasksRes.error }, "Search tasks error");
      return { success: false, error: "Failed to search tasks" };
    }

    if (membersRes.error) {
      logger.error({ error: membersRes.error }, "Search members error");
      return { success: false, error: "Failed to search members" };
    }

    type RawMembership = {
      user_id: string;
      role: string;
      profiles: { full_name: string | null; avatar_url: string | null; email: string }[] | null;
    };

    // Filter members by query against name and email
    const lowerQuery = searchTerm.toLowerCase();
    const filteredMembers = (membersRes.data as unknown as RawMembership[] || [])
      .filter((m) => {
        const profile = m.profiles && m.profiles.length > 0 ? m.profiles[0] : null;
        const name = profile?.full_name?.toLowerCase() || "";
        const email = profile?.email?.toLowerCase() || "";
        return name.includes(lowerQuery) || email.includes(lowerQuery);
      })
      .map((m) => {
        const profile = m.profiles && m.profiles.length > 0 ? m.profiles[0] : null;
        return {
          user_id: m.user_id,
          full_name: profile?.full_name ?? null,
          avatar_url: profile?.avatar_url ?? null,
          role: m.role as "OWNER" | "ADMIN" | "MEMBER",
        };
      })
      .slice(0, 10);

    return {
      success: true,
      data: {
        projects: projectsRes.data || [],
        tasks: tasksRes.data || [],
        members: filteredMembers,
      },
    };
  } catch (err) {
    logger.error({ error: err }, "Unexpected error in globalSearch");
    return { success: false, error: "An unexpected error occurred" };
  } finally {
    flushLogsAfterResponse();
  }
}
