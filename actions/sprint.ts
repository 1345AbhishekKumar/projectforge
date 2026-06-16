"use server";

import { auth } from "@clerk/nextjs/server";
import { revalidatePath } from "next/cache";
import { createInsforgeServer } from "@/lib/insforge-server";
import { z } from "zod";
import type { Sprint, SprintStatus } from "@/types";

const sprintSchema = z.object({
  name: z.string().min(3, "Sprint name must be at least 3 characters").max(100),
  goal: z.string().max(500).nullable().optional(),
  startDate: z.string().datetime(),
  endDate: z.string().datetime(),
});

// Helper to verify if user is Owner/Admin in organization
async function verifyAdminOrOwnerRole(
  insforge: ReturnType<typeof createInsforgeServer>,
  orgId: string,
  userId: string
): Promise<boolean> {
  const { data } = await insforge.database
    .from("memberships")
    .select("role")
    .eq("organization_id", orgId)
    .eq("user_id", userId)
    .maybeSingle();

  if (!data) return false;
  return data.role === "OWNER" || data.role === "ADMIN";
}

// Helper to check for overlap
async function checkSprintOverlap(
  insforge: ReturnType<typeof createInsforgeServer>,
  orgId: string,
  startDate: string,
  endDate: string,
  excludeSprintId?: string
): Promise<boolean> {
  let query = insforge.database
    .from("sprints")
    .select("id", { count: "exact", head: true })
    .eq("organization_id", orgId)
    .neq("status", "CANCELLED")
    .lte("start_date", endDate)
    .gte("end_date", startDate);

  if (excludeSprintId) {
    query = query.neq("id", excludeSprintId);
  }

  const { count, error } = await query;
  if (error) {
    throw new Error("Failed to check sprint overlap");
  }

  return (count || 0) > 0;
}

export async function createSprint(
  orgId: string,
  name: string,
  goal: string | null,
  startDate: string,
  endDate: string
): Promise<{ success: boolean; data?: { sprintId: string }; error?: string }> {
  try {
    const { userId } = await auth();
    if (!userId) return { success: false, error: "Unauthorized" };

    const validated = sprintSchema.safeParse({
      name,
      goal,
      startDate,
      endDate,
    });
    if (!validated.success) {
      return { success: false, error: validated.error.issues[0].message };
    }

    const insforge = createInsforgeServer();

    // Check permissions
    const isAuthorized = await verifyAdminOrOwnerRole(insforge, orgId, userId);
    if (!isAuthorized) {
      return { success: false, error: "Unauthorized: Only Admins and Owners can manage sprints." };
    }

    // Check date order
    if (new Date(startDate) > new Date(endDate)) {
      return { success: false, error: "Start date must be before or equal to end date" };
    }

    // Check overlaps
    const hasOverlap = await checkSprintOverlap(insforge, orgId, startDate, endDate);
    if (hasOverlap) {
      return { success: false, error: "Sprint dates overlap with an existing sprint." };
    }

    const { data: sprint, error } = await insforge.database
      .from("sprints")
      .insert([
        {
          organization_id: orgId,
          name: validated.data.name,
          goal: validated.data.goal || null,
          start_date: validated.data.startDate,
          end_date: validated.data.endDate,
          status: "PLANNED",
        },
      ])
      .select("id")
      .single();

    if (error) {
      return { success: false, error: "Failed to create sprint" };
    }

    revalidatePath("/sprints");
    return { success: true, data: { sprintId: sprint.id } };
  } catch (error) {
    console.error("Error creating sprint:", error);
    return { success: false, error: "An unexpected error occurred" };
  }
}

export async function getSprints(
  orgId: string
): Promise<{ success: boolean; data: Sprint[]; error?: string }> {
  try {
    const { userId } = await auth();
    if (!userId) return { success: false, error: "Unauthorized", data: [] };

    const insforge = createInsforgeServer();

    // Check membership
    const { data: membership } = await insforge.database
      .from("memberships")
      .select("id")
      .eq("organization_id", orgId)
      .eq("user_id", userId)
      .maybeSingle();

    if (!membership) {
      return { success: false, error: "Not a member of this workspace", data: [] };
    }

    const { data, error } = await insforge.database
      .from("sprints")
      .select("*")
      .eq("organization_id", orgId)
      .order("start_date", { ascending: true });

    if (error) {
      return { success: false, error: "Failed to fetch sprints", data: [] };
    }

    return { success: true, data: data as Sprint[] };
  } catch (error) {
    console.error("Error fetching sprints:", error);
    return { success: false, error: "An unexpected error occurred", data: [] };
  }
}

export async function updateSprint(
  orgId: string,
  sprintId: string,
  updates: {
    name?: string;
    goal?: string | null;
    startDate?: string;
    endDate?: string;
  }
): Promise<{ success: boolean; error?: string }> {
  try {
    const { userId } = await auth();
    if (!userId) return { success: false, error: "Unauthorized" };

    const insforge = createInsforgeServer();

    // Check permissions
    const isAuthorized = await verifyAdminOrOwnerRole(insforge, orgId, userId);
    if (!isAuthorized) {
      return { success: false, error: "Unauthorized: Only Admins and Owners can manage sprints." };
    }

    // Check current status - Completed sprints are locked
    const { data: existingSprint } = await insforge.database
      .from("sprints")
      .select("status, start_date, end_date")
      .eq("id", sprintId)
      .eq("organization_id", orgId)
      .single();

    if (!existingSprint) {
      return { success: false, error: "Sprint not found" };
    }

    if (existingSprint.status === "COMPLETED") {
      return { success: false, error: "Sprint is locked: Completed sprints cannot be modified." };
    }

    const updatePayload: Record<string, string | null> = {};

    if (updates.name !== undefined) {
      if (updates.name.length < 3 || updates.name.length > 100) {
        return { success: false, error: "Name must be between 3 and 100 characters" };
      }
      updatePayload.name = updates.name;
    }

    if (updates.goal !== undefined) {
      if (updates.goal && updates.goal.length > 500) {
        return { success: false, error: "Goal must not exceed 500 characters" };
      }
      updatePayload.goal = updates.goal;
    }

    const proposedStart = updates.startDate || existingSprint.start_date;
    const proposedEnd = updates.endDate || existingSprint.end_date;

    if (updates.startDate !== undefined || updates.endDate !== undefined) {
      // Validate dates order
      if (new Date(proposedStart) > new Date(proposedEnd)) {
        return { success: false, error: "Start date must be before or equal to end date" };
      }

      // Check overlaps
      const hasOverlap = await checkSprintOverlap(
        insforge,
        orgId,
        proposedStart,
        proposedEnd,
        sprintId
      );
      if (hasOverlap) {
        return { success: false, error: "Sprint dates overlap with an existing sprint." };
      }

      if (updates.startDate !== undefined) updatePayload.start_date = updates.startDate;
      if (updates.endDate !== undefined) updatePayload.end_date = updates.endDate;
    }

    const { error } = await insforge.database
      .from("sprints")
      .update(updatePayload)
      .eq("id", sprintId)
      .eq("organization_id", orgId);

    if (error) {
      return { success: false, error: "Failed to update sprint" };
    }

    revalidatePath("/sprints");
    return { success: true };
  } catch (error) {
    console.error("Error updating sprint:", error);
    return { success: false, error: "An unexpected error occurred" };
  }
}

export async function updateSprintStatus(
  orgId: string,
  sprintId: string,
  status: SprintStatus
): Promise<{ success: boolean; error?: string }> {
  try {
    const { userId } = await auth();
    if (!userId) return { success: false, error: "Unauthorized" };

    const insforge = createInsforgeServer();

    // Check permissions
    const isAuthorized = await verifyAdminOrOwnerRole(insforge, orgId, userId);
    if (!isAuthorized) {
      return { success: false, error: "Unauthorized: Only Admins and Owners can manage sprints." };
    }

    const { data: existingSprint } = await insforge.database
      .from("sprints")
      .select("status")
      .eq("id", sprintId)
      .eq("organization_id", orgId)
      .single();

    if (!existingSprint) {
      return { success: false, error: "Sprint not found" };
    }

    // Block status change if already completed
    if (existingSprint.status === "COMPLETED") {
      return { success: false, error: "Sprint is completed and locked." };
    }

    // Only one active sprint is allowed per organization
    if (status === "ACTIVE") {
      const { count } = await insforge.database
        .from("sprints")
        .select("id", { count: "exact", head: true })
        .eq("organization_id", orgId)
        .eq("status", "ACTIVE")
        .neq("id", sprintId);

      if ((count || 0) > 0) {
        return { success: false, error: "An active sprint already exists. Complete or cancel it first." };
      }
    }

    const { error } = await insforge.database
      .from("sprints")
      .update({ status })
      .eq("id", sprintId)
      .eq("organization_id", orgId);

    if (error) {
      return { success: false, error: "Failed to update sprint status" };
    }

    revalidatePath("/sprints");
    return { success: true };
  } catch (error) {
    console.error("Error updating sprint status:", error);
    return { success: false, error: "An unexpected error occurred" };
  }
}
