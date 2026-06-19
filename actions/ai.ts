"use server";

import OpenAI from "openai";
import { auth } from "@clerk/nextjs/server";
import { createInsforgeServer } from "@/lib/insforge-server";
import { z } from "zod";
import { verifyMembership } from "@/lib/auth-helpers";
import { logger } from "@/lib/logger";
import * as Sentry from "@sentry/nextjs";

type InsforgeClient = ReturnType<typeof createInsforgeServer>;

interface TaskSummary {
  title: string;
  status: string;
  priority: string;
  due_date: string | null;
}

interface SprintSummary {
  name: string;
  goal?: string | null;
  end_date: string;
}

interface TaskDependencyInfo {
  id: string | number;
  source_task: {
    id: string;
    title: string;
    status: string;
    project_id: string;
  } | null;
  target_task: {
    id: string;
    title: string;
    status: string;
    project_id: string;
  } | null;
}

const openai = new OpenAI({
  apiKey: process.env.NVIDIA_API_KEY || "",
  baseURL: process.env.NVIDIA_API_BASE_URL || "https://integrate.api.nvidia.com/v1",
});

/**
 * Checks and increments the daily AI usage quota for a user in an organization.
 * Maximum 10 requests per day.
 */
async function checkAndIncrementQuota(
  insforge: InsforgeClient,
  orgId: string,
  userId: string,
  actionType: string
): Promise<{ allowed: boolean; error?: string }> {
  try {
    const today = new Date().toISOString().split("T")[0]; // YYYY-MM-DD
    
    // Count records for this user in this org today
    const { data, error } = await insforge.database
      .from("ai_usages")
      .select("id")
      .eq("organization_id", orgId)
      .eq("user_id", userId)
      .gte("created_at", `${today}T00:00:00.000Z`)
      .lte("created_at", `${today}T23:59:59.999Z`);

    if (error) {
      logger.error({ error, orgId, userId }, "Failed to query AI usages");
      return { allowed: false, error: "Database error verifying quota" };
    }

    const currentCount = data?.length || 0;
    if (currentCount >= 10) {
      return { allowed: false, error: "AI assistant quota reached for today (max 10 queries)" };
    }

    // Insert record
    const { error: insertError } = await insforge.database
      .from("ai_usages")
      .insert([
        {
          organization_id: orgId,
          user_id: userId,
          action_type: actionType,
        },
      ]);

    if (insertError) {
      logger.error({ error: insertError, orgId, userId }, "Failed to increment AI usage");
      return { allowed: false, error: "Database error incrementing quota" };
    }

    return { allowed: true };
  } catch (err) {
    logger.error(err, "Error checking and incrementing quota");
    return { allowed: false, error: "Unexpected quota check error" };
  }
}

/**
 * Summarize a project board: active sprint status, risks, and milestones.
 */
export async function summarizeProjectAction(
  projectId: string,
  orgId: string
): Promise<{ success: boolean; data?: string; reasoning?: string; error?: string }> {
  try {
    const { userId } = await auth();
    if (!userId) return { success: false, error: "Unauthorized" };

    const insforge = createInsforgeServer(userId);
    const isMember = await verifyMembership(insforge, orgId, userId);
    if (!isMember) return { success: false, error: "Not a member of this workspace" };

    if (!process.env.NVIDIA_API_KEY) {
      return { success: false, error: "NVIDIA API Key not configured" };
    }

    const quota = await checkAndIncrementQuota(insforge, orgId, userId, "PROJECT_SUMMARY");
    if (!quota.allowed) return { success: false, error: quota.error };

    // Fetch Project Details
    const { data: project } = await insforge.database
      .from("projects")
      .select("*")
      .eq("id", projectId)
      .eq("organization_id", orgId)
      .single();

    if (!project) return { success: false, error: "Project not found" };

    // Fetch active sprints
    const { data: sprints } = await insforge.database
      .from("sprints")
      .select("*")
      .eq("organization_id", orgId)
      .eq("status", "ACTIVE");

    // Fetch project tasks
    const { data: tasks } = await insforge.database
      .from("tasks")
      .select("title, status, priority, due_date")
      .eq("project_id", projectId)
      .eq("organization_id", orgId);

    const taskListSummary = (tasks || [])
      .map((t: TaskSummary) => `- [${t.status}] ${t.title} (Priority: ${t.priority}, Due: ${t.due_date || "None"})`)
      .join("\n");

    const sprintsSummary = (sprints || [])
      .map((s: SprintSummary) => `- Sprint Name: ${s.name}, Goal: ${s.goal || "None"}, End Date: ${s.end_date}`)
      .join("\n");

    const prompt = `
You are a project manager assistant. Summarize the following project details.
Project Name: ${project.name}
Description: ${project.description || "None"}
Active Sprints:
${sprintsSummary || "No active sprints"}

Tasks:
${taskListSummary || "No tasks configured"}

Please provide a clean Markdown summary highlighting:
1. Current Project Status & Milestones.
2. Active Sprint status and priorities.
3. Bottlenecks, potential risks, and recommendations.
    `;

    const completion = await openai.chat.completions.create({
      model: "openai/gpt-oss-120b",
      messages: [{ role: "user", content: prompt }],
      temperature: 0.7,
      max_tokens: 1000,
    });

    const reasoning = (completion.choices[0]?.message as { reasoning_content?: string })?.reasoning_content || "";
    const content = completion.choices[0]?.message?.content || "Could not generate summary.";

    return { success: true, data: content, reasoning };
  } catch (err) {
    logger.error(err, "Failed to summarize project");
    Sentry.captureException(err);
    return { success: false, error: "Failed to summarize project" };
  }
}

/**
 * Suggest task breakdowns (subtasks) based on a task title and description.
 */
export async function suggestSubtasksAction(
  taskId: string,
  orgId: string,
  taskTitle: string,
  taskDescription: string
): Promise<{ success: boolean; data?: string[]; reasoning?: string; error?: string }> {
  try {
    const { userId } = await auth();
    if (!userId) return { success: false, error: "Unauthorized" };

    const insforge = createInsforgeServer(userId);
    const isMember = await verifyMembership(insforge, orgId, userId);
    if (!isMember) return { success: false, error: "Not a member of this workspace" };

    if (!process.env.NVIDIA_API_KEY) {
      return { success: false, error: "NVIDIA API Key not configured" };
    }

    const quota = await checkAndIncrementQuota(insforge, orgId, userId, "SUBTASK_SUGGESTION");
    if (!quota.allowed) return { success: false, error: quota.error };

    const prompt = `
Given the following task to execute:
Title: ${taskTitle}
Description: ${taskDescription || "No description provided."}

Return a list of suggested subtasks (4 to 8 concrete action items) to execute this task successfully.
Return ONLY a valid JSON object matching this structure:
{
  "subtasks": ["Subtask item 1", "Subtask item 2"]
}
Do not write any markdown blocks besides the JSON object.
    `;

    const completion = await openai.chat.completions.create({
      model: "openai/gpt-oss-120b",
      messages: [{ role: "user", content: prompt }],
      response_format: { type: "json_object" },
      temperature: 0.3,
      max_tokens: 400,
    });

    const reasoning = (completion.choices[0]?.message as { reasoning_content?: string })?.reasoning_content || "";
    const contentStr = completion.choices[0]?.message?.content || "{}";
    
    try {
      const subtaskSchema = z.object({
        subtasks: z.array(z.string().min(1).max(200)),
      });

      const parsed = subtaskSchema.parse(JSON.parse(contentStr));
      return { success: true, data: parsed.subtasks, reasoning };
    } catch (err) {
      logger.error({ error: err, contentStr }, "Failed to validate subtask format via Zod");
      return { success: false, error: "Model returned invalid format" };
    }
  } catch (err) {
    logger.error(err, "Failed to suggest subtasks");
    Sentry.captureException(err);
    return { success: false, error: "Failed to suggest subtasks" };
  }
}

/**
 * Import chosen subtasks, inserting them into tasks table and mapping dependencies (subtask blocks parent).
 */
export async function importSubtasksAction(
  parentTaskId: string,
  projectId: string,
  orgId: string,
  subtasks: string[]
): Promise<{ success: boolean; error?: string }> {
  try {
    const { userId } = await auth();
    if (!userId) return { success: false, error: "Unauthorized" };

    const insforge = createInsforgeServer(userId);
    const isMember = await verifyMembership(insforge, orgId, userId);
    if (!isMember) return { success: false, error: "Not a member of this workspace" };

    // Fetch parent task details (priority, status sequence)
    const { data: parentTask } = await insforge.database
      .from("tasks")
      .select("priority")
      .eq("id", parentTaskId)
      .eq("organization_id", orgId)
      .single();

    const parentPriority = parentTask?.priority || "MEDIUM";

    for (const subtaskTitle of subtasks) {
      // 1. Create subtask
      const { data: newSubtask, error: insertTaskErr } = await insforge.database
        .from("tasks")
        .insert([
          {
            project_id: projectId,
            organization_id: orgId,
            title: subtaskTitle,
            description: `Subtask of parent task: ${parentTaskId}`,
            status: "TODO",
            priority: parentPriority,
            board_index: 0,
          },
        ])
        .select("id")
        .single();

      if (insertTaskErr || !newSubtask) {
        logger.error({ insertTaskErr }, "Failed to insert subtask into tasks table");
        return { success: false, error: "Failed to insert subtasks" };
      }

      // 2. Create dependency (subtask blocks parent)
      const { error: insertDepErr } = await insforge.database
        .from("task_dependencies")
        .insert([
          {
            source_task_id: newSubtask.id,
            target_task_id: parentTaskId,
            dependency_type: "BLOCKS",
          },
        ]);

      if (insertDepErr) {
        logger.error({ insertDepErr }, "Failed to insert task dependency relation");
        return { success: false, error: "Failed to link task dependency" };
      }
    }

    return { success: true };
  } catch (err) {
    logger.error(err, "Failed to import subtasks");
    Sentry.captureException(err);
    return { success: false, error: "Failed to import subtasks" };
  }
}

/**
 * Detect project risks: overdue tasks, dependency loops, blocks, etc.
 */
export async function detectProjectRisksAction(
  projectId: string,
  orgId: string
): Promise<{ success: boolean; data?: string; reasoning?: string; error?: string }> {
  try {
    const { userId } = await auth();
    if (!userId) return { success: false, error: "Unauthorized" };

    const insforge = createInsforgeServer(userId);
    const isMember = await verifyMembership(insforge, orgId, userId);
    if (!isMember) return { success: false, error: "Not a member of this workspace" };

    if (!process.env.NVIDIA_API_KEY) {
      return { success: false, error: "NVIDIA API Key not configured" };
    }

    const quota = await checkAndIncrementQuota(insforge, orgId, userId, "RISK_DETECTION");
    if (!quota.allowed) return { success: false, error: quota.error };

    // Fetch overdue tasks
    const today = new Date().toISOString();
    const { data: overdueTasks } = await insforge.database
      .from("tasks")
      .select("id, title, status, priority, due_date")
      .eq("project_id", projectId)
      .eq("organization_id", orgId)
      .neq("status", "DONE")
      .lt("due_date", today);

    // Fetch dependencies linked to tasks in this project
    const { data: taskDependencies } = await insforge.database
      .from("task_dependencies")
      .select(`
        id,
        source_task:tasks!source_task_id(id, title, status, project_id),
        target_task:tasks!target_task_id(id, title, status, project_id)
      `);

    // Filter dependencies scoped to this project
    const projectDeps = (taskDependencies || []).filter((dep: TaskDependencyInfo) => {
      return (
        dep.source_task?.project_id === projectId &&
        dep.target_task?.project_id === projectId
      );
    });

    const overdueList = (overdueTasks || [])
      .map((t: TaskSummary) => `- Task: "${t.title}" (Priority: ${t.priority}, Due: ${t.due_date})`)
      .join("\n");

    const dependencyList = projectDeps
      .map((d: TaskDependencyInfo) => `- "${d.source_task?.title}" blocks "${d.target_task?.title}" (Source status: ${d.source_task?.status}, Target status: ${d.target_task?.status})`)
      .join("\n");

    const prompt = `
Analyze the following project metrics for risks:
Overdue tasks:
${overdueList || "No overdue tasks detected."}

Active task dependencies / blocks:
${dependencyList || "No active dependencies configured."}

Evaluate the information and return a project risk analysis report in clean Markdown.
Highlight:
1. High-risk bottlenecks (overdue urgent/high priority tasks).
2. Unresolved dependency chains (e.g. status DONE blocked by status TODO tasks).
3. Strategic suggestions to resolve blocks.
    `;

    const completion = await openai.chat.completions.create({
      model: "openai/gpt-oss-120b",
      messages: [{ role: "user", content: prompt }],
      temperature: 0.3,
      max_tokens: 800,
    });

    const reasoning = (completion.choices[0]?.message as { reasoning_content?: string })?.reasoning_content || "";
    const content = completion.choices[0]?.message?.content || "No risks detected.";

    return { success: true, data: content, reasoning };
  } catch (err) {
    logger.error(err, "Failed to analyze project risks");
    Sentry.captureException(err);
    return { success: false, error: "Failed to analyze project risks" };
  }
}
