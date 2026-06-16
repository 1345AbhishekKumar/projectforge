"use server";

import { auth } from "@clerk/nextjs/server";
import { revalidatePath } from "next/cache";
import { createInsforgeServer } from "@/lib/insforge-server";
import type { AttachmentWithUser } from "@/types";
import { z } from "zod";
import { orgIdSchema, projectIdSchema, taskIdSchema, attachmentIdSchema } from "@/lib/utils";

const createAttachmentSchema = z.object({
  taskId: taskIdSchema,
  projectId: projectIdSchema,
  orgId: orgIdSchema,
  fileName: z.string().min(1).max(255),
  fileSize: z.number().positive().max(20971520),
  fileUrl: z.string().url("Invalid file URL"),
  storagePath: z.string().min(1),
});

const getTaskAttachmentsSchema = z.object({
  taskId: taskIdSchema,
  orgId: orgIdSchema,
});

const deleteAttachmentSchema = z.object({
  attachmentId: attachmentIdSchema,
  orgId: orgIdSchema,
  projectId: projectIdSchema,
});

// Helper to verify if user is member of organization
async function verifyMembership(insforge: ReturnType<typeof createInsforgeServer>, orgId: string, userId: string): Promise<boolean> {
  const { data } = await insforge.database
    .from("memberships")
    .select("id")
    .eq("organization_id", orgId)
    .eq("user_id", userId)
    .maybeSingle();
  return !!data;
}

export async function createAttachment(
  taskId: string,
  projectId: string,
  orgId: string,
  fileName: string,
  fileSize: number,
  fileUrl: string,
  storagePath: string
): Promise<{ success: boolean; error?: string }> {
  const validated = createAttachmentSchema.safeParse({
    taskId,
    projectId,
    orgId,
    fileName,
    fileSize,
    fileUrl,
    storagePath,
  });
  if (!validated.success) {
    return { success: false, error: validated.error.issues[0].message };
  }
  try {
    const { userId } = await auth();
    if (!userId) return { success: false, error: "Unauthorized" };

    const insforge = createInsforgeServer();

    const isMember = await verifyMembership(insforge, validated.data.orgId, userId);
    if (!isMember) {
      return { success: false, error: "Not a member of this workspace" };
    }

    const { error } = await insforge.database
      .from("attachments")
      .insert([
        {
          task_id: validated.data.taskId,
          user_id: userId,
          file_name: validated.data.fileName,
          file_size: validated.data.fileSize,
          file_url: validated.data.fileUrl,
          storage_path: validated.data.storagePath,
        },
      ]);

    if (error) {
      return { success: false, error: "Failed to save attachment metadata" };
    }

    revalidatePath(`/projects/${projectId}`);
    return { success: true };
  } catch {
    return { success: false, error: "An unexpected error occurred" };
  }
}

export async function getTaskAttachments(
  taskId: string,
  orgId: string
): Promise<{ success: boolean; data: AttachmentWithUser[]; error?: string }> {
  const validated = getTaskAttachmentsSchema.safeParse({ taskId, orgId });
  if (!validated.success) {
    return { success: false, error: validated.error.issues[0].message, data: [] };
  }

  try {
    const { userId } = await auth();
    if (!userId) return { success: false, error: "Unauthorized", data: [] };

    const insforge = createInsforgeServer();

    const isMember = await verifyMembership(insforge, validated.data.orgId, userId);
    if (!isMember) {
      return { success: false, error: "Not a member of this workspace", data: [] };
    }

    const { data, error } = await insforge.database
      .from("attachments")
      .select(`
        *,
        user:profiles(id, full_name, email, avatar_url)
      `)
      .eq("task_id", validated.data.taskId)
      .order("created_at", { ascending: false });

    if (error) {
      return { success: false, error: "Failed to fetch attachments", data: [] };
    }

    return { success: true, data: data as unknown as AttachmentWithUser[] };
  } catch {
    return { success: false, error: "An unexpected error occurred", data: [] };
  }
}

export async function deleteAttachment(
  attachmentId: string,
  orgId: string,
  projectId: string
): Promise<{ success: boolean; error?: string }> {
  const validated = deleteAttachmentSchema.safeParse({ attachmentId, orgId, projectId });
  if (!validated.success) {
    return { success: false, error: validated.error.issues[0].message };
  }

  try {
    const { userId } = await auth();
    if (!userId) return { success: false, error: "Unauthorized" };

    const insforge = createInsforgeServer();

    const isMember = await verifyMembership(insforge, validated.data.orgId, userId);
    if (!isMember) {
      return { success: false, error: "Not a member of this workspace" };
    }

    // Get attachment file details
    const { data: attachment, error: fetchError } = await insforge.database
      .from("attachments")
      .select("storage_path")
      .eq("id", validated.data.attachmentId)
      .single();

    if (fetchError || !attachment) {
      return { success: false, error: "Attachment not found" };
    }

    // Remove file object from storage bucket
    const { error: storageError } = await insforge.storage
      .from("attachments")
      .remove(attachment.storage_path);

    if (storageError) {
      return { success: false, error: "Failed to delete file from storage" };
    }

    // Delete attachment database record
    const { error: dbError } = await insforge.database
      .from("attachments")
      .delete()
      .eq("id", validated.data.attachmentId);

    if (dbError) {
      return { success: false, error: "Failed to delete attachment metadata" };
    }

    revalidatePath(`/projects/${projectId}`);
    return { success: true };
  } catch {
    return { success: false, error: "An unexpected error occurred" };
  }
}
