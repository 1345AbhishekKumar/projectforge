"use server";

import * as Sentry from "@sentry/nextjs";
import { auth } from "@clerk/nextjs/server";
import { revalidatePath } from "next/cache";
import { createInsforgeServer } from "@/lib/insforge-server";
import { z } from "zod";
import type { Project, ProjectStatus } from "@/types";
import { logActivity } from "@/actions/activity";
import { createNotification } from "@/actions/notification";
import { orgIdSchema, projectIdSchema } from "@/lib/utils";
import { verifyMembership, verifyAdminOrOwnerRole } from "@/lib/auth-helpers";
import { logger, flushLogsAfterResponse } from "@/lib/logger";

const projectSchema = z.object({
  name: z.string().min(3, "Name must be at least 3 characters").max(50),
  description: z.string().max(250).nullable().optional(),
  status: z.enum(["PLANNING", "ACTIVE", "COMPLETED", "ARCHIVED"]),
  custom_statuses: z
    .array(z.string().trim().min(1, "Status cannot be empty").max(30))
    .min(2, "Must specify at least 2 statuses")
    .max(10, "Cannot specify more than 10 statuses")
    .refine((items) => new Set(items).size === items.length, {
      message: "Statuses must be unique",
    })
    .nullable()
    .optional(),
});

const createProjectInputSchema = projectSchema.extend({
  orgId: orgIdSchema,
});

const getUserProjectsInputSchema = z.object({
  orgId: orgIdSchema,
});

const getProjectDetailsInputSchema = z.object({
  projectId: projectIdSchema,
  orgId: orgIdSchema,
});

const updateProjectInputSchema = projectSchema.extend({
  projectId: projectIdSchema,
  orgId: orgIdSchema,
});

const archiveProjectInputSchema = z.object({
  projectId: projectIdSchema,
  orgId: orgIdSchema,
});

export async function createProject(
  name: string,
  description: string | null,
  status: ProjectStatus,
  orgId: string,
  customStatuses: string[] | null = null
): Promise<{ success: boolean; data?: { projectId: string }; error?: string }> {
  const validated = createProjectInputSchema.safeParse({ name, description, status, orgId, custom_statuses: customStatuses });
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

    const { data: project, error } = await insforge.database
      .from("projects")
      .insert([
        {
          name: validated.data.name,
          description: validated.data.description || null,
          status: validated.data.status,
          organization_id: validated.data.orgId,
          custom_statuses: validated.data.custom_statuses || null,
        },
      ])
      .select("id")
      .single();

    if (error) {
      logger.error({ error, orgId: validated.data.orgId, name: validated.data.name }, "Failed to create project");
      return { success: false, error: "Failed to create project" };
    }

    await logActivity(validated.data.orgId, project.id, userId, "PROJECT_CREATED", {
      projectName: validated.data.name,
    });

    revalidatePath("/projects");
    return { success: true, data: { projectId: project.id } };
  } catch (err) {
    logger.error({ error: err, orgId, name }, "Unexpected error in createProject Server Action");
    Sentry.captureException(err);
    return { success: false, error: "An unexpected error occurred" };
  } finally {
    flushLogsAfterResponse();
  }
}

export async function getUserProjects(
  orgId: string
): Promise<{ success: boolean; data: Project[]; error?: string }> {
  const validated = getUserProjectsInputSchema.safeParse({ orgId });
  if (!validated.success) {
    return { success: false, error: validated.error.issues[0].message, data: [] };
  }

  try {
    const { userId } = await auth();
    if (!userId) return { success: false, error: "Unauthorized", data: [] };

    const insforge = createInsforgeServer(userId);

    const isMember = await verifyMembership(insforge, validated.data.orgId, userId);
    if (!isMember) {
      return { success: false, error: "Not a member of this workspace", data: [] };
    }

    const { data, error } = await insforge.database
      .from("projects")
      .select("*")
      .eq("organization_id", validated.data.orgId)
      .order("updated_at", { ascending: false });

    if (error) {
      logger.error({ error, orgId: validated.data.orgId }, "Failed to fetch user projects");
      return { success: false, error: "Failed to fetch projects", data: [] };
    }

    return { success: true, data: data as Project[] };
  } catch (err) {
    logger.error({ error: err, orgId }, "Unexpected error in getUserProjects Server Action");
    Sentry.captureException(err);
    return { success: false, error: "An unexpected error occurred", data: [] };
  } finally {
    flushLogsAfterResponse();
  }
}

export async function getProjectDetails(
  projectId: string,
  orgId: string
): Promise<{ success: boolean; data?: Project; error?: string }> {
  const validated = getProjectDetailsInputSchema.safeParse({ projectId, orgId });
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

    const { data, error } = await insforge.database
      .from("projects")
      .select("*")
      .eq("id", validated.data.projectId)
      .eq("organization_id", validated.data.orgId)
      .maybeSingle();

    if (error || !data) {
      logger.error({ error, projectId: validated.data.projectId }, "Project not found in database query");
      return { success: false, error: "Project not found" };
    }

    return { success: true, data: data as Project };
  } catch (err) {
    logger.error({ error: err, projectId, orgId }, "Unexpected error in getProjectDetails Server Action");
    Sentry.captureException(err);
    return { success: false, error: "An unexpected error occurred" };
  } finally {
    flushLogsAfterResponse();
  }
}

export async function updateProject(
  projectId: string,
  name: string,
  description: string | null,
  status: ProjectStatus,
  orgId: string,
  customStatuses?: string[] | null
): Promise<{ success: boolean; error?: string }> {
  const validated = updateProjectInputSchema.safeParse({
    projectId,
    name,
    description,
    status,
    orgId,
    custom_statuses: customStatuses === undefined ? undefined : customStatuses,
  });
  if (!validated.success) {
    return { success: false, error: validated.error.issues[0].message };
  }

  try {
    const { userId } = await auth();
    if (!userId) return { success: false, error: "Unauthorized" };

    const insforge = createInsforgeServer(userId);

    const isAdminOrOwner = await verifyAdminOrOwnerRole(insforge, validated.data.orgId, userId);
    if (!isAdminOrOwner) {
      return { success: false, error: "Only owners and admins can update projects." };
    }

    // Task conflict guard if custom_statuses is updated/cleared
    if (validated.data.custom_statuses !== undefined) {
      const allowedStatuses = validated.data.custom_statuses || ["TODO", "IN_PROGRESS", "DONE"];
      
      const { data: tasks, error: tasksError } = await insforge.database
        .from("tasks")
        .select("id, title, status")
        .eq("project_id", validated.data.projectId);

      if (tasksError) {
        logger.error({ error: tasksError, projectId: validated.data.projectId }, "Failed to fetch project tasks for custom statuses validation");
        return { success: false, error: "Failed to validate tasks against custom statuses" };
      }

      const invalidTasks = tasks?.filter((t) => !allowedStatuses.includes(t.status)) || [];
      if (invalidTasks.length > 0) {
        const taskList = invalidTasks.slice(0, 3).map(t => `"${t.title}" (${t.status})`).join(", ");
        const suffix = invalidTasks.length > 3 ? ` and ${invalidTasks.length - 3} more` : "";
        return {
          success: false,
          error: `Cannot update workflow: some tasks have statuses not in the new list. Check tasks: ${taskList}${suffix}. Please update them first.`
        };
      }
    }

    const updatePayload: Record<string, any> = {
      name: validated.data.name,
      description: validated.data.description || null,
      status: validated.data.status,
      updated_at: new Date().toISOString(),
    };

    if (validated.data.custom_statuses !== undefined) {
      updatePayload.custom_statuses = validated.data.custom_statuses;
    }

    const { error } = await insforge.database
      .from("projects")
      .update(updatePayload)
      .eq("id", validated.data.projectId)
      .eq("organization_id", validated.data.orgId);

    if (error) {
      logger.error({ error, projectId: validated.data.projectId }, "Failed to update project details");
      return { success: false, error: "Failed to update project" };
    }

    // If the project was just marked as COMPLETED, notify all org members
    if (validated.data.status === "COMPLETED") {
      const { data: memberRows } = await insforge.database
        .from("memberships")
        .select("user_id")
        .eq("organization_id", validated.data.orgId);

      if (memberRows) {
        await Promise.all(
          memberRows.map((m: { user_id: string }) =>
            createNotification(
              m.user_id,
              `🌟 Project "${validated.data.name}" has been marked as Completed.`,
              "PROJECT_COMPLETED"
            )
          )
        );
      }
    }

    revalidatePath("/projects");
    revalidatePath(`/projects/${validated.data.projectId}`);
    return { success: true };
  } catch (err) {
    logger.error({ error: err, projectId }, "Unexpected error in updateProject Server Action");
    Sentry.captureException(err);
    return { success: false, error: "An unexpected error occurred" };
  } finally {
    flushLogsAfterResponse();
  }
}

export async function archiveProject(
  projectId: string,
  orgId: string
): Promise<{ success: boolean; error?: string }> {
  const validated = archiveProjectInputSchema.safeParse({ projectId, orgId });
  if (!validated.success) {
    return { success: false, error: validated.error.issues[0].message };
  }

  try {
    const { userId } = await auth();
    if (!userId) return { success: false, error: "Unauthorized" };

    const insforge = createInsforgeServer(userId);

    const isAdminOrOwner = await verifyAdminOrOwnerRole(insforge, validated.data.orgId, userId);
    if (!isAdminOrOwner) {
      return { success: false, error: "Only owners and admins can archive projects." };
    }

    const { data: projData } = await insforge.database
      .from("projects")
      .select("name")
      .eq("id", validated.data.projectId)
      .single();
    const projectName = projData?.name || "Unknown Project";

    const { error } = await insforge.database
      .from("projects")
      .update({
        status: "ARCHIVED",
        updated_at: new Date().toISOString(),
      })
      .eq("id", validated.data.projectId)
      .eq("organization_id", validated.data.orgId);

    if (error) {
      logger.error({ error, projectId: validated.data.projectId }, "Failed to archive project");
      return { success: false, error: "Failed to archive project" };
    }

    await logActivity(validated.data.orgId, validated.data.projectId, userId, "PROJECT_ARCHIVED", {
      projectName,
    });

    revalidatePath("/projects");
    revalidatePath(`/projects/${validated.data.projectId}`);
    return { success: true };
  } catch (err) {
    logger.error({ error: err, projectId }, "Unexpected error in archiveProject Server Action");
    Sentry.captureException(err);
    return { success: false, error: "An unexpected error occurred" };
  } finally {
    flushLogsAfterResponse();
  }
}

const deleteProjectInputSchema = z.object({
  projectId: projectIdSchema,
  orgId: orgIdSchema,
});

export async function deleteProject(
  projectId: string,
  orgId: string
): Promise<{ success: boolean; error?: string }> {
  const validated = deleteProjectInputSchema.safeParse({ projectId, orgId });
  if (!validated.success) {
    return { success: false, error: validated.error.issues[0].message };
  }

  try {
    const { userId } = await auth();
    if (!userId) return { success: false, error: "Unauthorized" };

    const insforge = createInsforgeServer(userId);

    const isAdminOrOwner = await verifyAdminOrOwnerRole(insforge, validated.data.orgId, userId);
    if (!isAdminOrOwner) {
      return { success: false, error: "Only owners and admins can delete projects." };
    }

    // Fetch project details for logging
    const { data: projData } = await insforge.database
      .from("projects")
      .select("name")
      .eq("id", validated.data.projectId)
      .single();
    const projectName = projData?.name || "Unknown Project";

    const { error } = await insforge.database
      .from("projects")
      .delete()
      .eq("id", validated.data.projectId)
      .eq("organization_id", validated.data.orgId);

    if (error) {
      logger.error({ error, projectId: validated.data.projectId }, "Failed to delete project from database");
      return { success: false, error: "Failed to delete project" };
    }

    await logActivity(validated.data.orgId, null, userId, "PROJECT_DELETED", {
      projectName,
    });

    revalidatePath("/projects");
    return { success: true };
  } catch (err) {
    logger.error({ error: err, projectId }, "Unexpected error in deleteProject Server Action");
    Sentry.captureException(err);
    return { success: false, error: "An unexpected error occurred" };
  } finally {
    flushLogsAfterResponse();
  }
}

