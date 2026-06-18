"use server";

import { auth } from "@clerk/nextjs/server";
import * as Sentry from "@sentry/nextjs";
import { revalidatePath } from "next/cache";
import { createInsforgeServer } from "@/lib/insforge-server";
import { z } from "zod";
import type { CommentWithUser } from "@/types";
import { logActivity } from "@/actions/activity";
import { orgIdSchema, projectIdSchema, taskIdSchema, uuidSchema } from "@/lib/utils";
import { verifyMembership } from "@/lib/auth-helpers";
import { createNotification } from "@/actions/notification";
import { logger, flushLogsAfterResponse } from "@/lib/logger";

const createCommentInputSchema = z.object({
  taskId: taskIdSchema,
  projectId: projectIdSchema,
  orgId: orgIdSchema,
  content: z.string().min(1, "Comment content cannot be empty").max(1000, "Comment must not exceed 1000 characters"),
});

const getTaskCommentsInputSchema = z.object({
  taskId: taskIdSchema,
  orgId: orgIdSchema,
});


export async function createComment(
  taskId: string,
  projectId: string,
  orgId: string,
  content: string
): Promise<{ success: boolean; error?: string }> {
  const validated = createCommentInputSchema.safeParse({ taskId, projectId, orgId, content });
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

    // Insert comment
    const { error: commentError } = await insforge.database
      .from("comments")
      .insert([
        {
          task_id: validated.data.taskId,
          user_id: userId,
          content: validated.data.content,
        },
      ]);

    if (commentError) {
      logger.error({ error: commentError, taskId: validated.data.taskId }, "Failed to post comment");
      return { success: false, error: "Failed to post comment" };
    }

    // Get task details for notification trigger
    const { data: task } = await insforge.database
      .from("tasks")
      .select("title, assignee_id")
      .eq("id", validated.data.taskId)
      .single();

    if (task && task.assignee_id && task.assignee_id !== userId) {
      // Get commenter's name
      const { data: profile } = await insforge.database
        .from("profiles")
        .select("full_name")
        .eq("id", userId)
        .single();

      const name = profile?.full_name || "A member";
      
      // Trigger notification record in DB via createNotification service layer
      await createNotification(
        task.assignee_id,
        `${name} commented on your assigned task "${task.title}"`,
        "GENERAL"
      );
    }

    await logActivity(validated.data.orgId, validated.data.projectId, userId, "COMMENT_ADDED", {
      taskId: validated.data.taskId,
      taskTitle: task?.title || "Unknown Task",
      snippet: validated.data.content.length > 60 
        ? validated.data.content.substring(0, 60) + "..." 
        : validated.data.content,
    });

    revalidatePath(`/projects/${validated.data.projectId}`);
    return { success: true };
  } catch (err) {
    logger.error({ error: err, taskId }, "Unexpected error in createComment Server Action");
    Sentry.captureException(err);
    return { success: false, error: "An unexpected error occurred" };
  } finally {
    flushLogsAfterResponse();
  }
}

export async function getTaskComments(
  taskId: string,
  orgId: string
): Promise<{ success: boolean; data: CommentWithUser[]; error?: string }> {
  const validated = getTaskCommentsInputSchema.safeParse({ taskId, orgId });
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
      .from("comments")
      .select(`
        *,
        user:profiles(id, full_name, email, avatar_url)
      `)
      .eq("task_id", validated.data.taskId)
      .order("created_at", { ascending: true });

    if (error) {
      logger.error({ error, taskId: validated.data.taskId }, "Failed to fetch comments");
      return { success: false, error: "Failed to fetch comments", data: [] };
    }

    return { success: true, data: data as unknown as CommentWithUser[] };
  } catch (err) {
    logger.error({ error: err, taskId }, "Unexpected error in getTaskComments Server Action");
    Sentry.captureException(err);
    return { success: false, error: "An unexpected error occurred", data: [] };
  } finally {
    flushLogsAfterResponse();
  }
}

const updateCommentInputSchema = z.object({
  commentId: uuidSchema,
  content: z.string().min(1, "Comment content cannot be empty").max(1000, "Comment must not exceed 1000 characters"),
});

const deleteCommentInputSchema = z.object({
  commentId: uuidSchema,
});

export async function updateComment(
  commentId: string,
  content: string
): Promise<{ success: boolean; error?: string }> {
  const validated = updateCommentInputSchema.safeParse({ commentId, content });
  if (!validated.success) {
    return { success: false, error: validated.error.issues[0].message };
  }

  try {
    const { userId } = await auth();
    if (!userId) return { success: false, error: "Unauthorized" };

    const insforge = createInsforgeServer(userId);

    // Verify comment ownership
    const { data: comment } = await insforge.database
      .from("comments")
      .select("user_id")
      .eq("id", validated.data.commentId)
      .maybeSingle();

    if (!comment) {
      return { success: false, error: "Comment not found" };
    }

    if (comment.user_id !== userId) {
      return { success: false, error: "You can only edit your own comments" };
    }

    const { error } = await insforge.database
      .from("comments")
      .update({
        content: validated.data.content,
        updated_at: new Date().toISOString(),
      })
      .eq("id", validated.data.commentId);

    if (error) {
      logger.error({ error, commentId: validated.data.commentId }, "Failed to update comment");
      return { success: false, error: "Failed to update comment" };
    }

    return { success: true };
  } catch (err) {
    logger.error({ error: err, commentId }, "Unexpected error in updateComment Server Action");
    Sentry.captureException(err);
    return { success: false, error: "An unexpected error occurred" };
  } finally {
    flushLogsAfterResponse();
  }
}

export async function deleteComment(
  commentId: string
): Promise<{ success: boolean; error?: string }> {
  const validated = deleteCommentInputSchema.safeParse({ commentId });
  if (!validated.success) {
    return { success: false, error: validated.error.issues[0].message };
  }

  try {
    const { userId } = await auth();
    if (!userId) return { success: false, error: "Unauthorized" };

    const insforge = createInsforgeServer(userId);

    // Verify comment ownership
    const { data: comment } = await insforge.database
      .from("comments")
      .select("user_id")
      .eq("id", validated.data.commentId)
      .maybeSingle();

    if (!comment) {
      return { success: false, error: "Comment not found" };
    }

    if (comment.user_id !== userId) {
      return { success: false, error: "You can only delete your own comments" };
    }

    const { error } = await insforge.database
      .from("comments")
      .delete()
      .eq("id", validated.data.commentId);

    if (error) {
      logger.error({ error, commentId: validated.data.commentId }, "Failed to delete comment");
      return { success: false, error: "Failed to delete comment" };
    }

    return { success: true };
  } catch (err) {
    logger.error({ error: err, commentId }, "Unexpected error in deleteComment Server Action");
    Sentry.captureException(err);
    return { success: false, error: "An unexpected error occurred" };
  } finally {
    flushLogsAfterResponse();
  }
}

