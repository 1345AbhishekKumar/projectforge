"use server";

import { auth } from "@clerk/nextjs/server";
import { revalidatePath } from "next/cache";
import { createInsforgeServer } from "@/lib/insforge-server";
import { verifyMembership, verifyAdminOrOwnerRole, getOrganizationMemberships } from "@/lib/auth-helpers";
import { logger, flushLogsAfterResponse } from "@/lib/logger";
import * as Sentry from "@sentry/nextjs";
import { z } from "zod";
import type { Project, ResourceAllocation } from "@/types";

const getCapacityInputSchema = z.object({
  orgId: z.string().uuid("Invalid organization ID"),
});

const upsertAllocationSchema = z.object({
  orgId: z.string().uuid("Invalid organization ID"),
  userId: z.string().min(1, "User ID is required"),
  projectId: z.string().uuid("Invalid project ID"),
  allocationPercentage: z.number().int().min(0).max(100, "Allocation percentage must be between 0% and 100%"),
});

const deleteAllocationSchema = z.object({
  orgId: z.string().uuid("Invalid organization ID"),
  allocationId: z.string().uuid("Invalid allocation ID"),
});

export type CapacityData = {
  userId: string;
  name: string;
  email: string;
  avatarUrl: string | null;
  role: string;
  totalAllocatedPercentage: number;
  allocatedWeeklyCost: number;
  allocations: {
    id: string;
    projectId: string;
    projectName: string;
    percentage: number;
  }[];
};

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

function getHourlyRate(role: string | null): number {
  if (!role) return 75;
  const normalized = role.toUpperCase();
  if (normalized === "OWNER" || normalized === "ADMIN") return 150;
  if (normalized === "MANAGER" || normalized === "LEAD") return 125;
  if (normalized === "MEMBER" || normalized === "CONTRIBUTOR") return 100;
  return 75;
}

/**
 * Fetches all members, active projects, and allocations for the capacity planner.
 */
export async function getResourceAllocations(
  orgId: string
): Promise<{ success: boolean; data?: { capacity: CapacityData[]; projects: Project[] }; error?: string }> {
  try {
    const { userId } = await auth();
    if (!userId) return { success: false, error: "Unauthorized" };

    const validated = getCapacityInputSchema.safeParse({ orgId });
    if (!validated.success) {
      return { success: false, error: validated.error.issues[0].message };
    }

    const insforge = createInsforgeServer(userId);
    const isMember = await verifyMembership(insforge, orgId, userId);
    if (!isMember) {
      return { success: false, error: "Access denied: Not a member of this workspace" };
    }

    // Fetch projects, memberships and allocations
    const [projectsRes, membershipsRes] = await Promise.all([
      insforge.database.from("projects").select("*").eq("organization_id", orgId).neq("status", "ARCHIVED"),
      getOrganizationMemberships(insforge, orgId),
    ]);

    if (projectsRes.error || membershipsRes.error) {
      logger.error(
        { projectsErr: projectsRes.error, membershipsErr: membershipsRes.error },
        "Error fetching core data for capacity planner"
      );
      return { success: false, error: "Failed to fetch planner data" };
    }

    const projects = projectsRes.data || [];
    const memberships = (membershipsRes.data || []) as unknown as RawMembership[];

    // Fetch allocations for all projects in this organization
    const projectIds = projects.map((p) => p.id);
    let allocations: ResourceAllocation[] = [];
    if (projectIds.length > 0) {
      const allocationsRes = await insforge.database
        .from("resource_allocations")
        .select("*")
        .in("project_id", projectIds);
      if (allocationsRes.error) {
        logger.error({ error: allocationsRes.error }, "Error fetching allocations");
        return { success: false, error: "Failed to fetch allocations" };
      }
      allocations = (allocationsRes.data || []) as ResourceAllocation[];
    }

    // Build user profiles quick lookup map
    const userProfileMap = new Map<string, { name: string; email: string; avatarUrl: string | null }>();
    memberships.forEach((m) => {
      const profile = Array.isArray(m.profiles) ? m.profiles[0] : m.profiles;
      if (profile) {
        userProfileMap.set(m.user_id, {
          name: profile.full_name || profile.email,
          email: profile.email,
          avatarUrl: profile.avatar_url,
        });
      }
    });

    // Formulate capacity report data
    const capacity: CapacityData[] = memberships.map((m) => {
      const userAllocations = allocations.filter((a) => a.user_id === m.user_id);
      const totalAllocated = userAllocations.reduce((acc, a) => acc + a.allocation_percentage, 0);
      const rate = getHourlyRate(m.role);
      const allocatedWeeklyCost = Math.round((totalAllocated / 100) * 40 * rate);

      const allocatedProjects = userAllocations.map((a) => {
        const proj = projects.find((p) => p.id === a.project_id);
        return {
          id: a.id,
          projectId: a.project_id,
          projectName: proj ? proj.name : "Unknown Project",
          percentage: a.allocation_percentage,
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
        allocations: allocatedProjects,
      };
    });

    return {
      success: true,
      data: {
        capacity,
        projects,
      },
    };
  } catch (err) {
    logger.error({ error: err, orgId }, "Unexpected error in getResourceAllocations");
    Sentry.captureException(err);
    return { success: false, error: "An unexpected error occurred" };
  } finally {
    flushLogsAfterResponse();
  }
}

/**
 * Upserts a project allocation percentage for a team member.
 */
export async function upsertResourceAllocation(
  orgId: string,
  targetUserId: string,
  projectId: string,
  allocationPercentage: number
): Promise<{ success: boolean; warning?: string; error?: string }> {
  try {
    const { userId: actorId } = await auth();
    if (!actorId) return { success: false, error: "Unauthorized" };

    const validated = upsertAllocationSchema.safeParse({
      orgId,
      userId: targetUserId,
      projectId,
      allocationPercentage,
    });
    if (!validated.success) {
      return { success: false, error: validated.error.issues[0].message };
    }

    const insforge = createInsforgeServer(actorId);

    // Verify actor is ADMIN or OWNER
    const isAdmin = await verifyAdminOrOwnerRole(insforge, orgId, actorId);
    if (!isAdmin) {
      return { success: false, error: "Unauthorized: Only administrators can manage capacity allocations" };
    }

    // Verify project belongs to org
    const { data: projectData, error: projectError } = await insforge.database
      .from("projects")
      .select("id")
      .eq("id", projectId)
      .eq("organization_id", orgId)
      .maybeSingle();

    if (projectError || !projectData) {
      return { success: false, error: "Project not found in this organization" };
    }

    // Verify target user is member of org
    const isTargetMember = await verifyMembership(insforge, orgId, targetUserId);
    if (!isTargetMember) {
      return { success: false, error: "Target user is not a member of this workspace" };
    }

    // If percentage is 0, delete allocation
    if (allocationPercentage === 0) {
      const { error } = await insforge.database
        .from("resource_allocations")
        .delete()
        .eq("user_id", targetUserId)
        .eq("project_id", projectId);

      if (error) {
        logger.error({ error, targetUserId, projectId }, "Error deleting allocation");
        return { success: false, error: "Failed to remove resource allocation" };
      }
    } else {
      // Check if allocation already exists
      const { data: existingAlloc, error: findError } = await insforge.database
        .from("resource_allocations")
        .select("id")
        .eq("user_id", targetUserId)
        .eq("project_id", projectId)
        .maybeSingle();

      if (findError) {
        logger.error({ error: findError }, "Error finding existing allocation");
        return { success: false, error: "Failed to save resource allocation" };
      }

      if (existingAlloc) {
        const { error } = await insforge.database
          .from("resource_allocations")
          .update({ allocation_percentage: allocationPercentage })
          .eq("id", existingAlloc.id);

        if (error) {
          logger.error({ error }, "Error updating allocation");
          return { success: false, error: "Failed to update resource allocation" };
        }
      } else {
        const { error } = await insforge.database
          .from("resource_allocations")
          .insert({
            user_id: targetUserId,
            project_id: projectId,
            allocation_percentage: allocationPercentage,
          });

        if (error) {
          logger.error({ error }, "Error inserting allocation");
          return { success: false, error: "Failed to create resource allocation" };
        }
      }
    }

    // Calculate new total allocation for target user
    const { data: userAllProjects, error: fetchAllProjError } = await insforge.database
      .from("projects")
      .select("id")
      .eq("organization_id", orgId);

    let totalAlloc = 0;
    if (!fetchAllProjError && userAllProjects && userAllProjects.length > 0) {
      const { data: allUserAlloc, error: allocErr } = await insforge.database
        .from("resource_allocations")
        .select("allocation_percentage")
        .eq("user_id", targetUserId)
        .in("project_id", userAllProjects.map((p) => p.id));

      if (!allocErr && allUserAlloc) {
        totalAlloc = allUserAlloc.reduce((acc, a) => acc + a.allocation_percentage, 0);
      }
    }

    revalidatePath("/team/capacity");
    revalidatePath("/reports/enterprise");

    if (totalAlloc > 100) {
      return {
        success: true,
        warning: `Allocation updated successfully, but user is now at ${totalAlloc}% capacity (exceeds 100%)!`,
      };
    }

    return { success: true };
  } catch (err) {
    logger.error({ error: err, targetUserId, projectId }, "Unexpected error in upsertResourceAllocation");
    Sentry.captureException(err);
    return { success: false, error: "An unexpected error occurred" };
  } finally {
    flushLogsAfterResponse();
  }
}

/**
 * Deletes a project allocation.
 */
export async function deleteResourceAllocation(
  orgId: string,
  allocationId: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const { userId: actorId } = await auth();
    if (!actorId) return { success: false, error: "Unauthorized" };

    const validated = deleteAllocationSchema.safeParse({ orgId, allocationId });
    if (!validated.success) {
      return { success: false, error: validated.error.issues[0].message };
    }

    const insforge = createInsforgeServer(actorId);

    // Verify actor is ADMIN or OWNER
    const isAdmin = await verifyAdminOrOwnerRole(insforge, orgId, actorId);
    if (!isAdmin) {
      return { success: false, error: "Unauthorized: Only administrators can manage capacity allocations" };
    }

    // Perform deletion
    const { error } = await insforge.database
      .from("resource_allocations")
      .delete()
      .eq("id", allocationId);

    if (error) {
      logger.error({ error, allocationId }, "Error deleting allocation by ID");
      return { success: false, error: "Failed to remove resource allocation" };
    }

    revalidatePath("/team/capacity");
    revalidatePath("/reports/enterprise");

    return { success: true };
  } catch (err) {
    logger.error({ error: err, allocationId }, "Unexpected error in deleteResourceAllocation");
    Sentry.captureException(err);
    return { success: false, error: "An unexpected error occurred" };
  } finally {
    flushLogsAfterResponse();
  }
}
