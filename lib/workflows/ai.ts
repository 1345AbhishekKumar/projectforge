import OpenAI from "openai";
import fs from "fs";
import path from "path";
import { z } from "zod";
import * as Sentry from "@sentry/nextjs";
import { createInsforgeServer } from "../insforge-server";
import { logger } from "../logger";

const getOpenaiClient = () => {
  let apiKey = "";
  let baseURL = "";

  try {
    const envPath = path.join(process.cwd(), ".env.local");
    if (fs.existsSync(envPath)) {
      const content = fs.readFileSync(envPath, "utf8");
      const lines = content.split(/\r?\n/);
      for (const line of lines) {
        const keyMatch = line.match(/^\s*NVIDIA_API_KEY\s*=\s*(.*)$/);
        if (keyMatch) {
          apiKey = keyMatch[1].trim();
          if (
            (apiKey.startsWith('"') && apiKey.endsWith('"')) ||
            (apiKey.startsWith("'") && apiKey.endsWith("'"))
          ) {
            apiKey = apiKey.slice(1, -1);
          }
        }
        const urlMatch = line.match(/^\s*NVIDIA_API_BASE_URL\s*=\s*(.*)$/);
        if (urlMatch) {
          baseURL = urlMatch[1].trim();
          if (
            (baseURL.startsWith('"') && baseURL.endsWith('"')) ||
            (baseURL.startsWith("'") && baseURL.endsWith("'"))
          ) {
            baseURL = baseURL.slice(1, -1);
          }
        }
      }
    }
  } catch (err) {
    logger.warn(err, "Failed to parse .env.local in workflow AI helper");
  }

  if (!apiKey) {
    apiKey = (process.env.NVIDIA_API_KEY || "").trim();
    if (
      (apiKey.startsWith('"') && apiKey.endsWith('"')) ||
      (apiKey.startsWith("'") && apiKey.endsWith("'"))
    ) {
      apiKey = apiKey.slice(1, -1);
    }
  }

  if (!baseURL) {
    baseURL = (process.env.NVIDIA_API_BASE_URL || "https://integrate.api.nvidia.com/v1").trim();
    if (
      (baseURL.startsWith('"') && baseURL.endsWith('"')) ||
      (baseURL.startsWith("'") && baseURL.endsWith("'"))
    ) {
      baseURL = baseURL.slice(1, -1);
    }
  }

  return new OpenAI({
    apiKey,
    baseURL,
  });
};

interface AIActionData {
  prompt: string;
  output_type: "comment" | "subtasks" | "description";
}

interface SessionContext {
  userId: string;
  orgId: string;
}

export async function executeWorkflowAIAction(
  actionData: AIActionData,
  payload: unknown,
  session: SessionContext,
  insforge: ReturnType<typeof createInsforgeServer>,
): Promise<void> {
  const { orgId, userId } = session;
  const payloadObj = payload as Record<string, unknown> | null | undefined;
  const taskObj = payloadObj?.task as Record<string, unknown> | null | undefined;

  const taskId = (taskObj?.id || payloadObj?.id) as string | undefined;
  const projectId = (taskObj?.project_id || payloadObj?.project_id) as string | undefined;

  if (!taskId || !projectId) {
    logger.warn({ taskId, projectId }, "ai_action skipped: task context not found in payload");
    return;
  }

  try {
    // 1. Insert an AI usage log for tracing
    await insforge.database.from("ai_usages").insert([
      {
        organization_id: orgId,
        user_id: userId,
        action_type: `WORKFLOW_AI_${actionData.output_type.toUpperCase()}`,
      },
    ]);

    // 2. Fetch full details of the current task to pass as context
    const { data: task } = await insforge.database
      .from("tasks")
      .select("title, description, status, priority, due_date")
      .eq("id", taskId)
      .single();

    const taskTitle = task?.title || "Untitled Task";
    const taskDesc = task?.description || "No description provided.";
    const taskStatus = task?.status || "TODO";
    const taskPriority = task?.priority || "MEDIUM";

    const systemContext = `
You are an intelligent workflow automation agent. You help orchestrate organizational tasks.
Here is the context of the current task that triggered this automation:
- Task Title: ${taskTitle}
- Task Description: ${taskDesc}
- Task Status: ${taskStatus}
- Task Priority: ${taskPriority}
    `;

    const openai = getOpenaiClient();

    if (actionData.output_type === "subtasks") {
      const completion = await openai.chat.completions.create({
        model: "openai/gpt-oss-120b",
        messages: [
          { role: "system", content: systemContext },
          {
            role: "user",
            content: `${actionData.prompt}\n\nReturn ONLY a valid JSON object matching this structure:\n{\n  "subtasks": ["Subtask 1", "Subtask 2"]\n}\nDo not include any markdown framing or extra text.`,
          },
        ],
        response_format: { type: "json_object" },
        temperature: 0.3,
        max_tokens: 600,
      });

      const contentStr = completion.choices[0]?.message?.content || "{}";
      const subtaskSchema = z.object({
        subtasks: z.array(z.string().min(1).max(200)),
      });

      const parsed = subtaskSchema.parse(JSON.parse(contentStr));

      for (const title of parsed.subtasks) {
        // Insert each subtask
        const { data: newSubtask, error: subtaskErr } = await insforge.database
          .from("tasks")
          .insert([
            {
              project_id: projectId,
              organization_id: orgId,
              title,
              description: `AI generated subtask for: ${taskTitle}`,
              status: "TODO",
              priority: taskPriority,
              board_index: 0,
            },
          ])
          .select("id")
          .single();

        if (subtaskErr || !newSubtask) {
          logger.error({ subtaskErr, title }, "Failed to create AI generated subtask");
          continue;
        }

        // Link dependency (subtask blocks parent)
        const { error: depErr } = await insforge.database.from("task_dependencies").insert([
          {
            source_task_id: newSubtask.id,
            target_task_id: taskId,
            dependency_type: "BLOCKS",
          },
        ]);

        if (depErr) {
          logger.error({ depErr }, "Failed to create dependency for AI generated subtask");
        }
      }
    } else {
      // General prompt execution for comment or description output
      const completion = await openai.chat.completions.create({
        model: "openai/gpt-oss-120b",
        messages: [
          { role: "system", content: systemContext },
          { role: "user", content: actionData.prompt },
        ],
        temperature: 0.7,
        max_tokens: 800,
      });

      const textOutput = completion.choices[0]?.message?.content?.trim() || "";
      if (!textOutput) {
        logger.warn({ taskId }, "AI generated empty output for workflow action");
        return;
      }

      if (actionData.output_type === "comment") {
        const { error: commentErr } = await insforge.database.from("comments").insert([
          {
            task_id: taskId,
            user_id: userId || "SYSTEM",
            content: textOutput,
          },
        ]);

        if (commentErr) {
          logger.error({ commentErr, taskId }, "Failed to insert AI generated workflow comment");
        }
      } else if (actionData.output_type === "description") {
        const { error: updateErr } = await insforge.database
          .from("tasks")
          .update({ description: textOutput })
          .eq("id", taskId);

        if (updateErr) {
          logger.error(
            { updateErr, taskId },
            "Failed to update task description with AI workflow output",
          );
        }
      }
    }
  } catch (err) {
    logger.error(err, "Error executing workflow AI action");
    Sentry.captureException(err);
    throw err;
  }
}
