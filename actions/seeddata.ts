"use server";

import { auth } from "@clerk/nextjs/server";
import { revalidatePath } from "next/cache";
import { createInsforgeServer } from "@/lib/insforge-server";
import { verifyMembership } from "@/lib/auth-helpers";
import { logger, flushLogsAfterResponse } from "@/lib/logger";
import * as Sentry from "@sentry/nextjs";
import { z } from "zod";
import { orgIdSchema } from "@/lib/utils";
import {
  getRandomProjectName,
  getRandomTaskTitle,
  getTaskStatusAndSprint,
  batchInsert,
  getWorkflowsToInsert,
} from "@/lib/seedingUtils";

const seedDataInputSchema = z.object({
  orgId: orgIdSchema,
});

export async function seedData(orgId: string): Promise<{ success: boolean; error?: string }> {
  const validated = seedDataInputSchema.safeParse({ orgId });
  if (!validated.success) {
    return { success: false, error: validated.error.issues[0].message };
  }

  try {
    const { userId } = await auth();
    if (!userId) {
      return { success: false, error: "Unauthorized" };
    }

    const insforge = createInsforgeServer(userId);

    const isMember = await verifyMembership(insforge, validated.data.orgId, userId);
    if (!isMember) {
      return { success: false, error: "Not a member of this workspace" };
    }

    // 1. Ensure exactly 55 members in the pool
    const { data: memberRows, error: membersError } = await insforge.database
      .from("memberships")
      .select("user_id")
      .eq("organization_id", validated.data.orgId);

    if (membersError) {
      logger.error({ error: membersError }, "Failed to fetch members for seeding");
      return { success: false, error: "Failed to fetch membership records" };
    }

    const existingUserIds = memberRows ? memberRows.map((m) => m.user_id) : [];
    const membersPool = [...existingUserIds];
    if (!membersPool.includes(userId)) {
      membersPool.push(userId);
    }

    let idx = 1;
    while (membersPool.length < 55) {
      const mockUserId = `seeded_user_${idx}_${validated.data.orgId.slice(0, 8)}`;
      if (!membersPool.includes(mockUserId)) {
        // Upsert profile under mock user identity to satisfy RLS
        const insforgeUser = createInsforgeServer(mockUserId);
        const { error: profileError } = await insforgeUser.database.from("profiles").upsert({
          id: mockUserId,
          full_name: `Seeded Member ${idx}`,
          email: `seeded.member.${idx}.${validated.data.orgId.slice(0, 8)}@projectforge.test`,
          avatar_url: `https://api.dicebear.com/7.x/adventurer/svg?seed=member${idx}`,
        });

        if (profileError) {
          logger.error({ error: profileError, mockUserId }, "Failed to upsert profile during seeding");
        }

        // Add to membership using admin client
        const { error: membershipError } = await insforge.database.from("memberships").upsert({
          user_id: mockUserId,
          organization_id: validated.data.orgId,
          role: idx % 10 === 0 ? "ADMIN" : "MEMBER",
        }, { onConflict: "organization_id,user_id" });

        if (membershipError) {
          logger.error({ error: membershipError, mockUserId }, "Failed to upsert membership during seeding");
        } else {
          membersPool.push(mockUserId);
        }
      }
      idx++;
    }

    // 2. Insert 45 contiguously scheduled sprints
    const sprintsToInsert = Array.from({ length: 45 }, (_, i) => {
      const sprintIndex = i + 1;
      let status: "PLANNED" | "ACTIVE" | "COMPLETED" | "CANCELLED" = "COMPLETED";
      if (i < 30) status = "COMPLETED";
      else if (i === 30) status = "ACTIVE";
      else status = "PLANNED";

      const offsetDays = (i - 30) * 14;
      const start = new Date(Date.now() + (offsetDays - 5) * 24 * 60 * 60 * 1000);
      const end = new Date(start.getTime() + 13 * 24 * 60 * 60 * 1000);

      return {
        organization_id: validated.data.orgId,
        name: `Sprint ${sprintIndex}: ${
          status === "ACTIVE"
            ? "Current Delivery"
            : status === "COMPLETED"
            ? "Historical Milestones"
            : "Upcoming Iterations"
        }`,
        goal: `Sprint goal for Sprint ${sprintIndex}`,
        start_date: start.toISOString(),
        end_date: end.toISOString(),
        status,
        created_at: new Date(start.getTime() - 2 * 24 * 60 * 60 * 1000).toISOString(),
      };
    });

    const sprintResult = await batchInsert(insforge, "sprints", sprintsToInsert, "id", 100);
    if (!sprintResult.success) {
      return { success: false, error: "Failed to seed sprints: " + String((sprintResult.error as { message?: string } | null)?.message || sprintResult.error) };
    }
    const insertedSprints = (sprintResult.data || []) as { id: string; name: string; status: string; start_date: string; end_date: string }[];

    // 3. Insert/fetch task labels
    const labelsToInsert = [
      { name: "Bug", color: "#FF7F50", organization_id: validated.data.orgId },
      { name: "Feature", color: "#00a099", organization_id: validated.data.orgId },
      { name: "Security", color: "#D4EDDA", organization_id: validated.data.orgId },
      { name: "Docs", color: "#D0E1FD", organization_id: validated.data.orgId },
      { name: "Refactor", color: "#6366F1", organization_id: validated.data.orgId },
      { name: "Hotfix", color: "#FFD2D2", organization_id: validated.data.orgId },
    ];
    const labelResult = await insforge.database
      .from("labels")
      .insert(labelsToInsert)
      .select("id");
    
    let finalLabels = labelResult.data || [];
    if (labelResult.error) {
      const { data: existingLabels } = await insforge.database
        .from("labels")
        .select("id")
        .eq("organization_id", validated.data.orgId);
      if (existingLabels) {
        finalLabels = existingLabels;
      }
    }

    // 4. Insert 55 projects
    const projectsToInsert = Array.from({ length: 55 }, (_, i) => {
      let status: "PLANNING" | "ACTIVE" | "COMPLETED" | "ARCHIVED" = "ACTIVE";
      if (i < 15) status = "PLANNING";
      else if (i < 40) status = "ACTIVE";
      else if (i < 50) status = "COMPLETED";
      else status = "ARCHIVED";

      const customStatuses = i < 10 ? ["BACKLOG", "READY", "DEVELOPMENT", "TESTING", "DONE"] : null;

      return {
        organization_id: validated.data.orgId,
        name: getRandomProjectName(i),
        description: `Autogenerated test project for workspace verification. Index #${i + 1}`,
        status,
        custom_statuses: customStatuses,
        created_at: new Date(Date.now() - (55 - i) * 24 * 60 * 60 * 1000).toISOString(),
        updated_at: new Date().toISOString(),
      };
    });

    const projectResult = await batchInsert(insforge, "projects", projectsToInsert, "id, name, status, custom_statuses", 100);
    if (!projectResult.success) {
      return { success: false, error: "Failed to seed projects: " + String((projectResult.error as { message?: string } | null)?.message || projectResult.error) };
    }
    const insertedProjects = (projectResult.data || []) as { id: string; name: string; status: string; custom_statuses: string[] | null }[];

    // 5. Generate 55 tasks per project (3,025 tasks total)
    const tasksToInsert = [];
    for (const project of insertedProjects) {
      for (let taskIdx = 0; taskIdx < 55; taskIdx++) {
        const { status, sprintId } = getTaskStatusAndSprint(
          project.status,
          project.custom_statuses,
          taskIdx,
          insertedSprints
        );

        const priority: "LOW" | "MEDIUM" | "HIGH" | "URGENT" =
          taskIdx % 10 === 0 ? "URGENT" : taskIdx % 5 === 0 ? "HIGH" : taskIdx % 2 === 0 ? "MEDIUM" : "LOW";

        const assigneeId = membersPool[taskIdx % membersPool.length];

        let dueDate: string | null = null;
        if (taskIdx % 3 === 0) {
          dueDate = new Date(Date.now() - (taskIdx % 10 + 1) * 24 * 60 * 60 * 1000).toISOString();
        } else if (taskIdx % 3 === 1) {
          dueDate = new Date(Date.now() + (taskIdx % 10 + 1) * 24 * 60 * 60 * 1000).toISOString();
        }

        const estimatedHours = [2, 4, 8, 12, 16][taskIdx % 5];

        tasksToInsert.push({
          project_id: project.id,
          organization_id: validated.data.orgId,
          title: `${getRandomTaskTitle(taskIdx)} - ${project.name}`,
          description: `Autogenerated task description. Index #${taskIdx + 1} for project ${project.name}. Scoped validation and delivery focus.`,
          status,
          priority,
          assignee_id: assigneeId,
          due_date: dueDate,
          sprint_id: sprintId,
          board_index: taskIdx,
          estimated_hours: estimatedHours,
          created_at: new Date(Date.now() - (55 - taskIdx) * 24 * 60 * 60 * 1000).toISOString(),
          updated_at: new Date().toISOString(),
        });
      }
    }

    const taskResult = await batchInsert(insforge, "tasks", tasksToInsert, "id, assignee_id", 500);
    if (!taskResult.success) {
      return { success: false, error: "Failed to seed tasks: " + String((taskResult.error as { message?: string } | null)?.message || taskResult.error) };
    }
    const insertedTasks = (taskResult.data || []) as { id: string; assignee_id: string | null }[];

    // 6. Insert blocker task dependencies (5 dependencies)
    if (insertedTasks.length >= 10) {
      const dependencies = Array.from({ length: 5 }, (_, k) => ({
        source_task_id: insertedTasks[k].id,
        target_task_id: insertedTasks[k + 5].id,
        dependency_type: "BLOCKS",
      }));
      const { error: depError } = await insforge.database.from("task_dependencies").insert(dependencies);
      if (depError) {
        logger.error({ error: depError }, "Failed to seed task dependencies");
      }
    }

    // 7. Insert task label mappings
    if (finalLabels.length > 0) {
      const mappings = [];
      for (let k = 0; k < insertedTasks.length; k += 2) {
        mappings.push({
          task_id: insertedTasks[k].id,
          label_id: finalLabels[k % finalLabels.length].id,
        });
      }
      const mappingResult = await batchInsert(insforge, "task_label_mappings", mappings, "task_id", 500);
      if (!mappingResult.success) {
        logger.error({ error: mappingResult.error }, "Failed to seed label mappings");
      }
    }

    // 8. Generate 3,025 comments (commits) - 1 comment per task
    const commentsToInsert = insertedTasks.map((task, idx) => ({
      task_id: task.id,
      user_id: task.assignee_id || userId,
      content: `🚀 **commit**: implement core requirements\n\nSha: \`f8b${idx}e${(idx * 3) % 10}c\`\nAuthor: @${(task.assignee_id || userId).slice(0, 8)}`,
      created_at: new Date(Date.now() - (idx % 24) * 60 * 60 * 1000).toISOString(),
    }));

    const commentResult = await batchInsert(insforge, "comments", commentsToInsert, "id", 500);
    if (!commentResult.success) {
      logger.error({ error: commentResult.error }, "Failed to seed comments");
    }

    // 9. Insert 45 time entries (belonging to current user to satisfy RLS)
    const timeEntriesToInsert = Array.from({ length: 45 }, (_, i) => {
      const task = insertedTasks[i % insertedTasks.length];
      const start = new Date(Date.now() - (45 - i) * 12 * 60 * 60 * 1000);
      const end = i % 5 === 0 ? null : new Date(start.getTime() + (i + 1) * 3600 * 1000);
      const duration = end ? Math.floor((end.getTime() - start.getTime()) / 1000) : null;
      return {
        task_id: task.id,
        user_id: userId,
        start_time: start.toISOString(),
        end_time: end ? end.toISOString() : null,
        duration,
      };
    });

    const timeEntryResult = await batchInsert(insforge, "time_entries", timeEntriesToInsert, "id", 100);
    if (!timeEntryResult.success) {
      logger.error({ error: timeEntryResult.error }, "Failed to seed time entries");
    }

    // 10. Insert 45 audit logs
    const auditLogsToInsert = Array.from({ length: 45 }, (_, i) => {
      const project = insertedProjects[i % insertedProjects.length];
      const actorId = membersPool[i % membersPool.length];
      return {
        organization_id: validated.data.orgId,
        actor_id: actorId,
        action: i % 3 === 0 ? "task.created" : i % 3 === 1 ? "task.updated" : "project.updated",
        entity_type: i % 3 === 2 ? "project" : "task",
        entity_id: project.id,
        metadata: { details: `Seeded audit log description #${i + 1}` },
        created_at: new Date(Date.now() - i * 24 * 60 * 60 * 1000).toISOString(),
      };
    });

    const auditLogResult = await batchInsert(insforge, "audit_logs", auditLogsToInsert, "id", 100);
    if (!auditLogResult.success) {
      logger.error({ error: auditLogResult.error }, "Failed to seed audit logs");
    }

    // 11. Insert 50 activity feed entries
    const activitiesToInsert = Array.from({ length: 50 }, (_, i) => {
      const project = insertedProjects[i % insertedProjects.length];
      const actorId = membersPool[i % membersPool.length];
      return {
        organization_id: validated.data.orgId,
        project_id: project.id,
        user_id: actorId,
        action_type: i % 2 === 0 ? "TASK_CREATED" : "TASK_COMPLETED",
        metadata: { taskTitle: `Task Activity #${i + 1}`, projectName: project.name },
        created_at: new Date(Date.now() - i * 12 * 60 * 60 * 1000).toISOString(),
      };
    });

    const activityResult = await batchInsert(insforge, "activities", activitiesToInsert, "id", 100);
    if (!activityResult.success) {
      logger.error({ error: activityResult.error }, "Failed to seed activities");
    }

    // 12. Seed workflow automations
    const workflowsToInsert = getWorkflowsToInsert(validated.data.orgId);
    const workflowResult = await batchInsert(insforge, "workflows", workflowsToInsert, "id", 100);
    if (!workflowResult.success) {
      logger.error({ error: workflowResult.error }, "Failed to seed workflows");
    }

    // 12. Insert V5 objectives, key results, knowledge documents defensively
    try {
      const objectivesToInsert = Array.from({ length: 5 }, (_, i) => ({
        organization_id: validated.data.orgId,
        title: `Seeded Objective #${i + 1}`,
        owner_id: userId,
      }));
      const { data: insertedObjs, error: objError } = await insforge.database
        .from("objectives")
        .insert(objectivesToInsert)
        .select("id");

      if (!objError && insertedObjs && insertedObjs.length > 0) {
        const krs = insertedObjs.map((obj, idx) => ({
          objective_id: obj.id,
          metric: `Key Metric Target #${idx + 1}`,
          target: 100,
          current: 40 + idx * 10,
        }));
        await insforge.database.from("key_results").insert(krs);
      }
    } catch (e) {
      logger.warn({ error: e }, "Failed to seed objectives/key_results (V5 tables may not exist)");
    }

    try {
      const docsToInsert = Array.from({ length: 5 }, (_, i) => ({
        organization_id: validated.data.orgId,
        title: `Seeded Document #${i + 1}`,
        content: `# Seeded Doc #${i + 1}\nAlways write clean, sketchy whiteboard code.`,
        doc_type: i % 2 === 0 ? "policy" : "retro",
      }));
      await insforge.database.from("knowledge_documents").insert(docsToInsert);
    } catch (e) {
      logger.warn({ error: e }, "Failed to seed knowledge_documents (V5 tables may not exist)");
    }

    // 13. Revalidate paths
    revalidatePath("/dashboard");
    revalidatePath("/projects");
    revalidatePath("/sprints");
    revalidatePath("/analytics");
    revalidatePath("/team");

    return { success: true };
  } catch (error) {
    logger.error({ error }, "seedData unexpected error");
    Sentry.captureException(error);
    return { success: false, error: "An unexpected error occurred during seeding" };
  } finally {
    flushLogsAfterResponse();
  }
}
