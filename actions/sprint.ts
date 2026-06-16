"use server";

import { auth } from "@clerk/nextjs/server";
import { revalidatePath } from "next/cache";
import { createInsforgeServer } from "@/lib/insforge-server";
import { z } from "zod";
import type { Sprint, SprintStatus } from "@/types";
import { createNotification } from "@/actions/notification";
import { orgIdSchema, sprintIdSchema } from "@/lib/utils";
import { verifyMembership, verifyAdminOrOwnerRole } from "@/lib/auth-helpers";

const sprintSchema = z.object({
  name: z.string().min(3, "Sprint name must be at least 3 characters").max(100),
  goal: z.string().max(500).nullable().optional(),
  startDate: z.string().datetime(),
  endDate: z.string().datetime(),
});

const createSprintInputSchema = sprintSchema.extend({
  orgId: orgIdSchema,
});

const getSprintsInputSchema = z.object({
  orgId: orgIdSchema,
});

const updateSprintInputSchema = z.object({
  orgId: orgIdSchema,
  sprintId: sprintIdSchema,
  updates: sprintSchema.partial(),
});

const updateSprintStatusInputSchema = z.object({
  orgId: orgIdSchema,
  sprintId: sprintIdSchema,
  status: z.enum(["PLANNED", "ACTIVE", "COMPLETED", "CANCELLED"]),
});


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
  const validated = createSprintInputSchema.safeParse({ orgId, name, goal, startDate, endDate });
  if (!validated.success) {
    return { success: false, error: validated.error.issues[0].message };
  }

  try {
    const { userId } = await auth();
    if (!userId) return { success: false, error: "Unauthorized" };

    const insforge = createInsforgeServer();

    // Check permissions
    const isAuthorized = await verifyAdminOrOwnerRole(insforge, validated.data.orgId, userId);
    if (!isAuthorized) {
      return { success: false, error: "Unauthorized: Only Admins and Owners can manage sprints." };
    }

    // Check date order
    if (new Date(validated.data.startDate) > new Date(validated.data.endDate)) {
      return { success: false, error: "Start date must be before or equal to end date" };
    }

    // Check overlaps
    const hasOverlap = await checkSprintOverlap(insforge, validated.data.orgId, validated.data.startDate, validated.data.endDate);
    if (hasOverlap) {
      return { success: false, error: "Sprint dates overlap with an existing sprint." };
    }

    const { data: sprint, error } = await insforge.database
      .from("sprints")
      .insert([
        {
          organization_id: validated.data.orgId,
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
  const validated = getSprintsInputSchema.safeParse({ orgId });
  if (!validated.success) {
    return { success: false, error: validated.error.issues[0].message, data: [] };
  }

  try {
    const { userId } = await auth();
    if (!userId) return { success: false, error: "Unauthorized", data: [] };

    const insforge = createInsforgeServer();

    // Check membership
    const isMember = await verifyMembership(insforge, validated.data.orgId, userId);
    if (!isMember) {
      return { success: false, error: "Not a member of this workspace", data: [] };
    }

    const { data, error } = await insforge.database
      .from("sprints")
      .select("*")
      .eq("organization_id", validated.data.orgId)
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
  const validated = updateSprintInputSchema.safeParse({ orgId, sprintId, updates });
  if (!validated.success) {
    return { success: false, error: validated.error.issues[0].message };
  }

  try {
    const { userId } = await auth();
    if (!userId) return { success: false, error: "Unauthorized" };

    const insforge = createInsforgeServer();

    // Check permissions
    const isAuthorized = await verifyAdminOrOwnerRole(insforge, validated.data.orgId, userId);
    if (!isAuthorized) {
      return { success: false, error: "Unauthorized: Only Admins and Owners can manage sprints." };
    }

    // Check current status - Completed sprints are locked
    const { data: existingSprint } = await insforge.database
      .from("sprints")
      .select("status, start_date, end_date")
      .eq("id", validated.data.sprintId)
      .eq("organization_id", validated.data.orgId)
      .single();

    if (!existingSprint) {
      return { success: false, error: "Sprint not found" };
    }

    if (existingSprint.status === "COMPLETED") {
      return { success: false, error: "Sprint is locked: Completed sprints cannot be modified." };
    }

    const updatePayload: Record<string, string | null> = {};

    if (validated.data.updates.name !== undefined) {
      updatePayload.name = validated.data.updates.name;
    }

    if (validated.data.updates.goal !== undefined) {
      updatePayload.goal = validated.data.updates.goal;
    }

    const proposedStart = validated.data.updates.startDate || existingSprint.start_date;
    const proposedEnd = validated.data.updates.endDate || existingSprint.end_date;

    if (validated.data.updates.startDate !== undefined || validated.data.updates.endDate !== undefined) {
      // Validate dates order
      if (new Date(proposedStart) > new Date(proposedEnd)) {
        return { success: false, error: "Start date must be before or equal to end date" };
      }

      // Check overlaps
      const hasOverlap = await checkSprintOverlap(
        insforge,
        validated.data.orgId,
        proposedStart,
        proposedEnd,
        validated.data.sprintId
      );
      if (hasOverlap) {
        return { success: false, error: "Sprint dates overlap with an existing sprint." };
      }

      if (validated.data.updates.startDate !== undefined) updatePayload.start_date = validated.data.updates.startDate;
      if (validated.data.updates.endDate !== undefined) updatePayload.end_date = validated.data.updates.endDate;
    }

    const { error } = await insforge.database
      .from("sprints")
      .update(updatePayload)
      .eq("id", validated.data.sprintId)
      .eq("organization_id", validated.data.orgId);

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
  const validated = updateSprintStatusInputSchema.safeParse({ orgId, sprintId, status });
  if (!validated.success) {
    return { success: false, error: validated.error.issues[0].message };
  }

  try {
    const { userId } = await auth();
    if (!userId) return { success: false, error: "Unauthorized" };

    const insforge = createInsforgeServer();

    // Check permissions
    const isAuthorized = await verifyAdminOrOwnerRole(insforge, validated.data.orgId, userId);
    if (!isAuthorized) {
      return { success: false, error: "Unauthorized: Only Admins and Owners can manage sprints." };
    }

    const { data: existingSprint } = await insforge.database
      .from("sprints")
      .select("status")
      .eq("id", validated.data.sprintId)
      .eq("organization_id", validated.data.orgId)
      .single();

    if (!existingSprint) {
      return { success: false, error: "Sprint not found" };
    }

    // Block status change if already completed
    if (existingSprint.status === "COMPLETED") {
      return { success: false, error: "Sprint is completed and locked." };
    }

    // Only one active sprint is allowed per organization
    if (validated.data.status === "ACTIVE") {
      const { count } = await insforge.database
        .from("sprints")
        .select("id", { count: "exact", head: true })
        .eq("organization_id", validated.data.orgId)
        .eq("status", "ACTIVE")
        .neq("id", validated.data.sprintId);

      if ((count || 0) > 0) {
        return { success: false, error: "An active sprint already exists. Complete or cancel it first." };
      }
    }

    const { error } = await insforge.database
      .from("sprints")
      .update({ status: validated.data.status })
      .eq("id", validated.data.sprintId)
      .eq("organization_id", validated.data.orgId);

    if (error) {
      return { success: false, error: "Failed to update sprint status" };
    }

    // Fan-out notifications for all org members on sprint lifecycle events
    if (validated.data.status === "ACTIVE" || validated.data.status === "COMPLETED") {
      const { data: sprintData } = await insforge.database
        .from("sprints")
        .select("name")
        .eq("id", validated.data.sprintId)
        .single();

      const { data: memberRows } = await insforge.database
        .from("memberships")
        .select("user_id")
        .eq("organization_id", validated.data.orgId);

      if (sprintData && memberRows) {
        const notifType = validated.data.status === "ACTIVE" ? "SPRINT_STARTED" : "SPRINT_ENDED";
        const content =
          validated.data.status === "ACTIVE"
            ? `🚀 Sprint "${sprintData.name}" has started. Let's ship it!`
            : `✅ Sprint "${sprintData.name}" has been completed.`;

        await Promise.all(
          memberRows.map((m: { user_id: string }) =>
            createNotification(m.user_id, content, notifType)
          )
        );
      }
    }

    revalidatePath("/sprints");
    return { success: true };
  } catch (error) {
    console.error("Error updating sprint status:", error);
    return { success: false, error: "An unexpected error occurred" };
  }
}
