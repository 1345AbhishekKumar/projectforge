"use server";

import { auth } from "@clerk/nextjs/server";
import { revalidatePath } from "next/cache";
import { createInsforgeServer } from "@/lib/insforge-server";
import { z } from "zod";
import type { Project, ProjectStatus } from "@/types";
import { logActivity } from "@/actions/activity";
import { createNotification } from "@/actions/notification";

const projectSchema = z.object({
  name: z.string().min(3, "Name must be at least 3 characters").max(50),
  description: z.string().max(250).nullable().optional(),
  status: z.enum(["PLANNING", "ACTIVE", "COMPLETED", "ARCHIVED"]),
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

export async function createProject(
  name: string,
  description: string | null,
  status: ProjectStatus,
  orgId: string
): Promise<{ success: boolean; data?: { projectId: string }; error?: string }> {
  try {
    const { userId } = await auth();
    if (!userId) return { success: false, error: "Unauthorized" };

    const validated = projectSchema.safeParse({ name, description, status });
    if (!validated.success) {
      return { success: false, error: validated.error.issues[0].message };
    }

    const insforge = createInsforgeServer();

    const isMember = await verifyMembership(insforge, orgId, userId);
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
          organization_id: orgId,
        },
      ])
      .select("id")
      .single();

    if (error) {
      return { success: false, error: "Failed to create project" };
    }

    await logActivity(orgId, project.id, userId, "PROJECT_CREATED", {
      projectName: validated.data.name,
    });

    revalidatePath("/projects");
    return { success: true, data: { projectId: project.id } };
  } catch {
    return { success: false, error: "An unexpected error occurred" };
  }
}

export async function getUserProjects(
  orgId: string
): Promise<{ success: boolean; data: Project[]; error?: string }> {
  try {
    const { userId } = await auth();
    if (!userId) return { success: false, error: "Unauthorized", data: [] };

    const insforge = createInsforgeServer();

    const isMember = await verifyMembership(insforge, orgId, userId);
    if (!isMember) {
      return { success: false, error: "Not a member of this workspace", data: [] };
    }

    const { data, error } = await insforge.database
      .from("projects")
      .select("*")
      .eq("organization_id", orgId)
      .order("updated_at", { ascending: false });

    if (error) {
      return { success: false, error: "Failed to fetch projects", data: [] };
    }

    return { success: true, data: data as Project[] };
  } catch {
    return { success: false, error: "An unexpected error occurred", data: [] };
  }
}

export async function getProjectDetails(
  projectId: string,
  orgId: string
): Promise<{ success: boolean; data?: Project; error?: string }> {
  try {
    const { userId } = await auth();
    if (!userId) return { success: false, error: "Unauthorized" };

    const insforge = createInsforgeServer();

    const isMember = await verifyMembership(insforge, orgId, userId);
    if (!isMember) {
      return { success: false, error: "Not a member of this workspace" };
    }

    const { data, error } = await insforge.database
      .from("projects")
      .select("*")
      .eq("id", projectId)
      .eq("organization_id", orgId)
      .maybeSingle();

    if (error || !data) {
      return { success: false, error: "Project not found" };
    }

    return { success: true, data: data as Project };
  } catch {
    return { success: false, error: "An unexpected error occurred" };
  }
}

export async function updateProject(
  projectId: string,
  name: string,
  description: string | null,
  status: ProjectStatus,
  orgId: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const { userId } = await auth();
    if (!userId) return { success: false, error: "Unauthorized" };

    const validated = projectSchema.safeParse({ name, description, status });
    if (!validated.success) {
      return { success: false, error: validated.error.issues[0].message };
    }

    const insforge = createInsforgeServer();

    const isMember = await verifyMembership(insforge, orgId, userId);
    if (!isMember) {
      return { success: false, error: "Not a member of this workspace" };
    }

    const { error } = await insforge.database
      .from("projects")
      .update({
        name: validated.data.name,
        description: validated.data.description || null,
        status: validated.data.status,
        updated_at: new Date().toISOString(),
      })
      .eq("id", projectId)
      .eq("organization_id", orgId);

    if (error) {
      return { success: false, error: "Failed to update project" };
    }

    // If the project was just marked as COMPLETED, notify all org members
    if (validated.data.status === "COMPLETED") {
      const { data: memberRows } = await insforge.database
        .from("memberships")
        .select("user_id")
        .eq("organization_id", orgId);

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
    revalidatePath(`/projects/${projectId}`);
    return { success: true };
  } catch {
    return { success: false, error: "An unexpected error occurred" };
  }
}

export async function archiveProject(
  projectId: string,
  orgId: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const { userId } = await auth();
    if (!userId) return { success: false, error: "Unauthorized" };

    const insforge = createInsforgeServer();

    const isMember = await verifyMembership(insforge, orgId, userId);
    if (!isMember) {
      return { success: false, error: "Not a member of this workspace" };
    }

    const { data: projData } = await insforge.database
      .from("projects")
      .select("name")
      .eq("id", projectId)
      .single();
    const projectName = projData?.name || "Unknown Project";

    const { error } = await insforge.database
      .from("projects")
      .update({
        status: "ARCHIVED",
        updated_at: new Date().toISOString(),
      })
      .eq("id", projectId)
      .eq("organization_id", orgId);

    if (error) {
      return { success: false, error: "Failed to archive project" };
    }

    await logActivity(orgId, projectId, userId, "PROJECT_ARCHIVED", {
      projectName,
    });

    revalidatePath("/projects");
    revalidatePath(`/projects/${projectId}`);
    return { success: true };
  } catch {
    return { success: false, error: "An unexpected error occurred" };
  }
}
