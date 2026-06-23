"use server";

import * as Sentry from "@sentry/nextjs";
import { auth } from "@clerk/nextjs/server";
import { after } from "next/server";
import { revalidatePath, cacheLife, cacheTag, revalidateTag } from "next/cache";
import { createInsforgeServer } from "@/lib/insforge-server";
import { writeAuditLog } from "@/lib/audit";
import { z } from "zod";
import type { Project, ProjectStatus } from "@/types";
import { logActivity } from "@/actions/activity";
import { createNotification } from "@/actions/notification";
import { orgIdSchema, projectIdSchema } from "@/lib/utils";
import { verifyMembership, verifyPermission, getManagedDepartmentId, verifyDepartmentScopeForProject } from "@/lib/auth-helpers";
import { logger, flushLogsAfterResponse } from "@/lib/logger";
import { projectSchema } from "@/lib/schemas/validation";

const createProjectInputSchema = projectSchema.extend({
  orgId: orgIdSchema,
  templateId: z.string().uuid().nullable().optional(),
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

export async function getProjectTemplates(): Promise<{ success: boolean; data?: Record<string, unknown>[]; error?: string }> {
  try {
    const { userId } = await auth();
    if (!userId) return { success: false, error: "Unauthorized" };

    const insforge = createInsforgeServer(userId);
    const { data, error } = await insforge.database
      .from("project_templates")
      .select("*")
      .order("name", { ascending: true });

    if (error) {
      logger.error({ error }, "Failed to fetch project templates");
      return { success: false, error: "Failed to fetch templates" };
    }

    return { success: true, data };
  } catch (err) {
    logger.error(err, "Unexpected error in getProjectTemplates");
    Sentry.captureException(err);
    return { success: false, error: "An unexpected error occurred" };
  } finally {
    flushLogsAfterResponse();
  }
}

export async function createProject(
  name: string,
  description: string | null,
  status: ProjectStatus,
  orgId: string,
  customStatuses: string[] | null = null,
  templateId: string | null = null,
  departmentId: string | null = null
): Promise<{ success: boolean; data?: { projectId: string }; error?: string }> {
  const validated = createProjectInputSchema.safeParse({
    name,
    description,
    status,
    orgId,
    custom_statuses: customStatuses,
    templateId,
    departmentId,
  });
  if (!validated.success) {
    console.error("createProject validation failed:", validated.error.issues);
    return { success: false, error: validated.error.issues[0].message };
  }

  try {
    const { userId } = await auth();
    if (!userId) return { success: false, error: "Unauthorized" };

    const insforge = createInsforgeServer(userId);

    const isAllowed = await verifyPermission(insforge, validated.data.orgId, userId, "projects", "create");
    if (!isAllowed) {
      return { success: false, error: "You do not have permission to create projects in this workspace." };
    }

    let finalCustomStatuses = validated.data.custom_statuses || null;
    interface TemplateTask {
      key: string;
      title: string;
      description?: string | null;
      status: string;
      priority?: "LOW" | "MEDIUM" | "HIGH" | "URGENT";
      assignee_role: string;
      dependencies?: string[];
    }
    let templateTasks: TemplateTask[] = [];

    if (validated.data.templateId) {
      const { data: template, error: templateErr } = await insforge.database
        .from("project_templates")
        .select("*")
        .eq("id", validated.data.templateId)
        .single();

      if (templateErr || !template) {
        logger.error({ templateErr, templateId: validated.data.templateId }, "Failed to find template");
        return { success: false, error: "Selected template not found" };
      }

      const schema = template.tasks_schema as {
        custom_statuses?: string[];
        tasks?: TemplateTask[];
      } | null;
      if (schema) {
        if (Array.isArray(schema.custom_statuses)) {
          finalCustomStatuses = schema.custom_statuses;
        }
        if (Array.isArray(schema.tasks)) {
          templateTasks = schema.tasks;
        }
      }
    }

    const { data: project, error } = await insforge.database
      .from("projects")
      .insert([
        {
          name: validated.data.name,
          description: validated.data.description || null,
          status: validated.data.status,
          organization_id: validated.data.orgId,
          custom_statuses: finalCustomStatuses,
          department_id: validated.data.departmentId || null,
        },
      ])
      .select("id")
      .single();

    if (error || !project) {
      logger.error({ error, orgId: validated.data.orgId, name: validated.data.name }, "Failed to create project");
      return { success: false, error: "Failed to create project" };
    }

    // Scaffold template tasks if any
    if (templateTasks.length > 0) {
      // Fetch organization membership roles to resolve default assignments
      const { data: membersList } = await insforge.database
        .from("memberships")
        .select("user_id, role")
        .eq("organization_id", validated.data.orgId);

      const roleToUserMap: Record<string, string> = {};
      if (membersList) {
        for (const member of membersList) {
          if (!roleToUserMap[member.role]) {
            roleToUserMap[member.role] = member.user_id;
          }
        }
      }

      const taskKeyToIdMap: Record<string, string> = {};

      for (const t of templateTasks) {
        const assigneeId = roleToUserMap[t.assignee_role] || userId;
        const { data: newTask, error: insertTaskErr } = await insforge.database
          .from("tasks")
          .insert([
            {
              project_id: project.id,
              organization_id: validated.data.orgId,
              title: t.title,
              description: t.description || null,
              status: t.status,
              priority: t.priority || "MEDIUM",
              assignee_id: assigneeId,
              board_index: 0,
            },
          ])
          .select("id")
          .single();

        if (insertTaskErr || !newTask) {
          logger.error({ insertTaskErr }, "Failed to scaffold template task");
          return { success: false, error: "Failed to scaffold template tasks" };
        }

        taskKeyToIdMap[t.key] = newTask.id;
      }

      // Establish dependency relationships
      for (const t of templateTasks) {
        if (t.dependencies && t.dependencies.length > 0) {
          const targetTaskId = taskKeyToIdMap[t.key];
          for (const depKey of t.dependencies) {
            const sourceTaskId = taskKeyToIdMap[depKey];
            if (sourceTaskId && targetTaskId) {
              const { error: insertDepErr } = await insforge.database
                .from("task_dependencies")
                .insert([
                  {
                    source_task_id: sourceTaskId,
                    target_task_id: targetTaskId,
                    dependency_type: "BLOCKS",
                  },
                ]);

              if (insertDepErr) {
                logger.error({ insertDepErr }, "Failed to scaffold template dependency relation");
                return { success: false, error: "Failed to link template task dependencies" };
              }
            }
          }
        }
      }
    }

    await logActivity(validated.data.orgId, project.id, userId, "PROJECT_CREATED", {
      projectName: validated.data.name,
    });

    after(() =>
      writeAuditLog(
        validated.data.orgId,
        userId,
        "project.created",
        "project",
        project.id,
        { name: validated.data.name }
      )
    );

    revalidateTag(`org-projects-${validated.data.orgId}`);
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

async function fetchUserProjectsCached(orgId: string, userId: string): Promise<Project[]> {
  "use cache";
  cacheTag(`org-projects-${orgId}`);
  cacheLife("minutes");

  const insforge = createInsforgeServer(userId);

  const { data: depts } = await insforge.database
    .from("departments")
    .select("id, parent_department_id")
    .eq("organization_id", orgId);

  const managedDeptId = await getManagedDepartmentId(insforge, orgId, userId);

  let query = insforge.database
    .from("projects")
    .select("*")
    .eq("organization_id", orgId);

  if (managedDeptId) {
    const childDeptIds = new Set<string>();
    if (depts) {
      const deptChildrenMap = new Map<string, string[]>();
      depts.forEach((d) => {
        if (d.parent_department_id) {
          if (!deptChildrenMap.has(d.parent_department_id)) {
            deptChildrenMap.set(d.parent_department_id, []);
          }
          deptChildrenMap.get(d.parent_department_id)!.push(d.id);
        }
      });

      const collectDeptIds = (deptId: string) => {
        childDeptIds.add(deptId);
        const children = deptChildrenMap.get(deptId) || [];
        children.forEach(collectDeptIds);
      };

      collectDeptIds(managedDeptId);
    }

    query = query.in("department_id", Array.from(childDeptIds));
  }

  const { data, error } = await query.order("updated_at", { ascending: false });

  if (error) {
    throw error;
  }

  return data as Project[];
}

async function fetchProjectDetailsCached(projectId: string, orgId: string, userId: string): Promise<Project> {
  "use cache";
  cacheTag(`project-${projectId}`);
  cacheLife("hours");

  const insforge = createInsforgeServer(userId);
  const { data, error } = await insforge.database
    .from("projects")
    .select("*")
    .eq("id", projectId)
    .eq("organization_id", orgId)
    .maybeSingle();

  if (error || !data) {
    throw error || new Error("Project not found");
  }

  return data as Project;
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

    const projects = await fetchUserProjectsCached(validated.data.orgId, userId);
    return { success: true, data: projects };
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

    const hasDeptAccess = await verifyDepartmentScopeForProject(insforge, validated.data.orgId, userId, validated.data.projectId);
    if (!hasDeptAccess) {
      return { success: false, error: "Access denied: Scoped to department branch" };
    }

    const data = await fetchProjectDetailsCached(validated.data.projectId, validated.data.orgId, userId);
    return { success: true, data };
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
  customStatuses?: string[] | null,
  departmentId: string | null = null
): Promise<{ success: boolean; error?: string }> {
  const validated = updateProjectInputSchema.safeParse({
    projectId,
    name,
    description,
    status,
    orgId,
    custom_statuses: customStatuses === undefined ? undefined : customStatuses,
    departmentId,
  });
  if (!validated.success) {
    return { success: false, error: validated.error.issues[0].message };
  }

  try {
    const { userId } = await auth();
    if (!userId) return { success: false, error: "Unauthorized" };

    const insforge = createInsforgeServer(userId);

    const isAllowed = await verifyPermission(insforge, validated.data.orgId, userId, "projects", "update");
    if (!isAllowed) {
      return { success: false, error: "You do not have permission to update projects in this workspace." };
    }

    const hasDeptAccess = await verifyDepartmentScopeForProject(insforge, validated.data.orgId, userId, validated.data.projectId);
    if (!hasDeptAccess) {
      return { success: false, error: "Access denied: Scoped to department branch" };
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

    const updatePayload: Record<string, unknown> = {
      name: validated.data.name,
      description: validated.data.description || null,
      status: validated.data.status,
      department_id: validated.data.departmentId || null,
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

    after(() =>
      writeAuditLog(
        validated.data.orgId,
        userId,
        "project.updated",
        "project",
        validated.data.projectId,
        { name: validated.data.name, status: validated.data.status }
      )
    );

    revalidateTag(`project-${validated.data.projectId}`);
    revalidateTag(`org-projects-${validated.data.orgId}`);
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

    const isAllowed = await verifyPermission(insforge, validated.data.orgId, userId, "projects", "delete");
    if (!isAllowed) {
      return { success: false, error: "You do not have permission to archive projects in this workspace." };
    }

    const hasDeptAccess = await verifyDepartmentScopeForProject(insforge, validated.data.orgId, userId, validated.data.projectId);
    if (!hasDeptAccess) {
      return { success: false, error: "Access denied: Scoped to department branch" };
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

    after(() =>
      writeAuditLog(
        validated.data.orgId,
        userId,
        "project.archived",
        "project",
        validated.data.projectId,
        { name: projectName }
      )
    );

    revalidateTag(`project-${validated.data.projectId}`);
    revalidateTag(`org-projects-${validated.data.orgId}`);
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

    const isAllowed = await verifyPermission(insforge, validated.data.orgId, userId, "projects", "delete");
    if (!isAllowed) {
      return { success: false, error: "You do not have permission to delete projects in this workspace." };
    }

    const hasDeptAccess = await verifyDepartmentScopeForProject(insforge, validated.data.orgId, userId, validated.data.projectId);
    if (!hasDeptAccess) {
      return { success: false, error: "Access denied: Scoped to department branch" };
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

    after(() =>
      writeAuditLog(
        validated.data.orgId,
        userId,
        "project.deleted",
        "project",
        validated.data.projectId,
        { name: projectName }
      )
    );

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

