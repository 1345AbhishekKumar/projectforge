"use server";

import { auth } from "@clerk/nextjs/server";
import { revalidatePath } from "next/cache";
import { createInsforgeServer } from "@/lib/insforge-server";
import type { AttachmentWithUser } from "@/types";

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
  try {
    const { userId } = await auth();
    if (!userId) return { success: false, error: "Unauthorized" };

    const insforge = createInsforgeServer();

    const isMember = await verifyMembership(insforge, orgId, userId);
    if (!isMember) {
      return { success: false, error: "Not a member of this workspace" };
    }

    const { error } = await insforge.database
      .from("attachments")
      .insert([
        {
          task_id: taskId,
          user_id: userId,
          file_name: fileName,
          file_size: fileSize,
          file_url: fileUrl,
          storage_path: storagePath,
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
  try {
    const { userId } = await auth();
    if (!userId) return { success: false, error: "Unauthorized", data: [] };

    const insforge = createInsforgeServer();

    const isMember = await verifyMembership(insforge, orgId, userId);
    if (!isMember) {
      return { success: false, error: "Not a member of this workspace", data: [] };
    }

    const { data, error } = await insforge.database
      .from("attachments")
      .select(`
        *,
        user:profiles(id, full_name, email, avatar_url)
      `)
      .eq("task_id", taskId)
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
  try {
    const { userId } = await auth();
    if (!userId) return { success: false, error: "Unauthorized" };

    const insforge = createInsforgeServer();

    const isMember = await verifyMembership(insforge, orgId, userId);
    if (!isMember) {
      return { success: false, error: "Not a member of this workspace" };
    }

    // Get attachment file details
    const { data: attachment, error: fetchError } = await insforge.database
      .from("attachments")
      .select("storage_path")
      .eq("id", attachmentId)
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
      .eq("id", attachmentId);

    if (dbError) {
      return { success: false, error: "Failed to delete attachment metadata" };
    }

    revalidatePath(`/projects/${projectId}`);
    return { success: true };
  } catch {
    return { success: false, error: "An unexpected error occurred" };
  }
}
