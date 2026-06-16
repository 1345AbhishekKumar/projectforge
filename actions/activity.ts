"use server";

import { auth } from "@clerk/nextjs/server";
import { revalidatePath } from "next/cache";
import { createInsforgeServer } from "@/lib/insforge-server";
import { z } from "zod";
import { orgIdSchema, projectIdSchema } from "@/lib/utils";
import { verifyMembership } from "@/lib/auth-helpers";

const logActivityInputSchema = z.object({
  orgId: orgIdSchema,
  projectId: projectIdSchema.nullable(),
  userId: z.string().min(1),
  actionType: z.string().min(1),
  metadata: z.record(z.any()),
});


export async function logActivity(
  orgId: string,
  projectId: string | null,
  userId: string,
  actionType: string,
  metadata: Record<string, unknown> = {}
): Promise<{ success: boolean; error?: string }> {
  try {
    const validated = logActivityInputSchema.safeParse({ orgId, projectId, userId, actionType, metadata });
    if (!validated.success) {
      return { success: false, error: validated.error.issues[0].message };
    }

    const insforge = createInsforgeServer();
    const { error } = await insforge.database
      .from("activities")
      .insert([
        {
          organization_id: orgId,
          project_id: projectId,
          user_id: userId,
          action_type: actionType,
          metadata,
        },
      ]);

    if (error) {
      console.error("Failed to insert activity:", error);
      return { success: false, error: "Failed to insert activity log" };
    }

    if (projectId) {
      revalidatePath(`/projects/${projectId}/activity`);
    }
    return { success: true };
  } catch (err) {
    console.error("Failed to log activity:", err);
    return { success: false, error: "An unexpected error occurred" };
  }
}

export type ActivityWithActor = {
  id: string;
  organization_id: string;
  project_id: string | null;
  user_id: string | null;
  action_type: string;
  metadata: Record<string, unknown>;
  created_at: string;
  actor: {
    id: string;
    full_name: string | null;
    email: string;
    avatar_url: string | null;
  } | null;
};

const getProjectActivitiesInputSchema = z.object({
  projectId: projectIdSchema,
  orgId: orgIdSchema,
  page: z.number().int().min(1),
  limit: z.number().int().min(1),
});

export async function getProjectActivities(
  projectId: string,
  orgId: string,
  page: number = 1,
  limit: number = 20
): Promise<{ success: boolean; data: ActivityWithActor[]; error?: string }> {
  try {
    const validated = getProjectActivitiesInputSchema.safeParse({ projectId, orgId, page, limit });
    if (!validated.success) {
      return { success: false, error: validated.error.issues[0].message, data: [] };
    }

    const { userId } = await auth();
    if (!userId) return { success: false, error: "Unauthorized", data: [] };

    const insforge = createInsforgeServer();

    const isMember = await verifyMembership(insforge, validated.data.orgId, userId);
    if (!isMember) {
      return { success: false, error: "Not a member of this workspace", data: [] };
    }

    const from = (validated.data.page - 1) * validated.data.limit;
    const to = from + validated.data.limit - 1;

    const { data, error } = await insforge.database
      .from("activities")
      .select(`
        *,
        actor:profiles(id, full_name, email, avatar_url)
      `)
      .eq("project_id", validated.data.projectId)
      .eq("organization_id", validated.data.orgId)
      .order("created_at", { ascending: false })
      .range(from, to);

    if (error) {
      console.error("Failed to fetch activities:", error);
      return { success: false, error: "Failed to fetch activities", data: [] };
    }

    return { success: true, data: data as unknown as ActivityWithActor[] };
  } catch (err) {
    console.error("Error fetching activities:", err);
    return { success: false, error: "An unexpected error occurred", data: [] };
  }
}
