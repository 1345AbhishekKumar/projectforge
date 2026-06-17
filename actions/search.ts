"use server";

import { auth } from "@clerk/nextjs/server";
import { createInsforgeServer } from "@/lib/insforge-server";
import { z } from "zod";
import type { SearchResult } from "@/types";
import { verifyMembership, getOrganizationMemberships } from "@/lib/auth-helpers";

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
      console.error("Search projects error:", projectsRes.error);
      return { success: false, error: "Failed to search projects" };
    }

    if (tasksRes.error) {
      console.error("Search tasks error:", tasksRes.error);
      return { success: false, error: "Failed to search tasks" };
    }

    if (membersRes.error) {
      console.error("Search members error:", membersRes.error);
      return { success: false, error: "Failed to search members" };
    }

    type RawMembership = {
      user_id: string;
      role: string;
      profiles: { full_name: string | null; avatar_url: string | null; email: string } | null;
    };

    // Filter members by query against name and email
    const lowerQuery = searchTerm.toLowerCase();
    const filteredMembers = (membersRes.data as RawMembership[] || [])
      .filter((m) => {
        const name = m.profiles?.full_name?.toLowerCase() || "";
        const email = m.profiles?.email?.toLowerCase() || "";
        return name.includes(lowerQuery) || email.includes(lowerQuery);
      })
      .map((m) => ({
        user_id: m.user_id,
        full_name: m.profiles?.full_name ?? null,
        avatar_url: m.profiles?.avatar_url ?? null,
        role: m.role as "OWNER" | "ADMIN" | "MEMBER",
      }))
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
    console.error("Unexpected error in globalSearch:", err);
    return { success: false, error: "An unexpected error occurred" };
  }
}
