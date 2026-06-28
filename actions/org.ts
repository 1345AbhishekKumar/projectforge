"use server";

import * as Sentry from "@sentry/nextjs";
import { auth } from "@clerk/nextjs/server";
import { cookies } from "next/headers";
import { revalidatePath, cacheLife, cacheTag, revalidateTag } from "next/cache";
import { createInsforgeServer } from "@/lib/insforge-server";
import { z } from "zod";
import type { OrganizationWithRole } from "@/types";
import { orgIdSchema } from "@/lib/utils";
import { logger, flushLogsAfterResponse } from "@/lib/logger";
import { syncProfile } from "@/actions/profile";

const createOrgSchema = z.object({
  name: z.string().min(3, "Name must be at least 3 characters").max(50),
  slug: z
    .string()
    .min(3, "Slug must be at least 3 characters")
    .max(40)
    .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, "Slug must be lowercase alphanumeric with hyphens"),
});

const setActiveOrganizationInputSchema = z.object({
  orgId: orgIdSchema,
});

async function fetchUserOrganizationsCached(userId: string): Promise<OrganizationWithRole[]> {
  "use cache";
  cacheTag(`user-orgs-${userId}`);
  cacheLife("hours");

  const insforge = createInsforgeServer(userId);
  const { data, error } = await insforge.database
    .from("memberships")
    .select("role, organizations(id, name, slug, created_at, updated_at)")
    .eq("user_id", userId);

  if (error) {
    throw error;
  }

  return (data || []).map((m: Record<string, unknown>) => ({
    ...(m.organizations as Record<string, unknown>),
    role: m.role as string,
  })) as OrganizationWithRole[];
}

export async function createOrganization(
  name: string,
  slug: string,
): Promise<{ success: boolean; data?: { orgId: string }; error?: string }> {
  try {
    const { userId } = await auth();
    if (!userId) return { success: false, error: "Unauthorized" };

    // Ensure user profile is synced first to satisfy memberships foreign key constraint
    const syncRes = await syncProfile(true);
    if (!syncRes.success) {
      logger.error(
        { error: syncRes.error, userId },
        "Profile sync failed before creating organization",
      );
      return { success: false, error: "Failed to create organization: user profile not found" };
    }

    const validated = createOrgSchema.safeParse({ name, slug });
    if (!validated.success) {
      return { success: false, error: validated.error.issues[0].message };
    }

    const insforge = createInsforgeServer(userId);

    const { data: org, error: orgError } = await insforge.database
      .from("organizations")
      .insert([{ name: validated.data.name, slug: validated.data.slug }])
      .select("id")
      .single();

    if (orgError) {
      if (orgError.message?.includes("duplicate") || orgError.message?.includes("unique")) {
        return { success: false, error: "This slug is already taken" };
      }
      logger.error(
        { error: orgError, name: validated.data.name, slug: validated.data.slug },
        "Failed to create organization in database",
      );
      return { success: false, error: "Failed to create organization" };
    }

    const { error: memberError } = await insforge.database.from("memberships").insert([
      {
        organization_id: org.id,
        user_id: userId,
        role: "OWNER",
      },
    ]);

    if (memberError) {
      logger.error(
        { error: memberError, orgId: org.id },
        "Failed to assign ownership for new organization",
      );
      return { success: false, error: "Failed to assign ownership" };
    }

    const cookieStore = await cookies();
    cookieStore.set("active_org_id", org.id, {
      path: "/",
      maxAge: 60 * 60 * 24 * 365,
      httpOnly: false,
      sameSite: "lax",
    });

    revalidateTag(`user-orgs-${userId}`, "hours");
    revalidatePath("/dashboard");
    return { success: true, data: { orgId: org.id } };
  } catch (err) {
    logger.error(
      { error: err, name, slug },
      "Unexpected error in createOrganization Server Action",
    );
    Sentry.captureException(err);
    return { success: false, error: "An unexpected error occurred" };
  } finally {
    flushLogsAfterResponse();
  }
}

export async function checkSlugAvailability(slug: string): Promise<{ available: boolean }> {
  try {
    const slugSchema = z
      .string()
      .min(3)
      .max(40)
      .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/);
    const validated = slugSchema.safeParse(slug);
    if (!validated.success) return { available: false };

    const { userId } = await auth();
    const insforge = createInsforgeServer(userId || undefined);
    const { data } = await insforge.database
      .from("organizations")
      .select("id")
      .eq("slug", validated.data)
      .maybeSingle();

    return { available: !data };
  } catch (err) {
    logger.error({ error: err, slug }, "Unexpected error in checkSlugAvailability Server Action");
    Sentry.captureException(err);
    return { available: false };
  } finally {
    flushLogsAfterResponse();
  }
}

export async function getUserOrganizations(): Promise<{
  success: boolean;
  data: OrganizationWithRole[];
  error?: string;
}> {
  try {
    const { userId } = await auth();
    if (!userId) return { success: false, error: "Unauthorized", data: [] };

    const orgs = await fetchUserOrganizationsCached(userId);
    return { success: true, data: orgs };
  } catch (err) {
    logger.error({ error: err }, "Unexpected error in getUserOrganizations Server Action");
    Sentry.captureException(err);
    return { success: false, error: "Failed to fetch organizations", data: [] };
  } finally {
    flushLogsAfterResponse();
  }
}

export async function setActiveOrganization(
  orgId: string,
): Promise<{ success: boolean; error?: string }> {
  const validated = setActiveOrganizationInputSchema.safeParse({ orgId });
  if (!validated.success) {
    return { success: false, error: validated.error.issues[0].message };
  }

  try {
    const { userId } = await auth();
    if (!userId) return { success: false, error: "Unauthorized" };

    const insforge = createInsforgeServer(userId);
    const { data } = await insforge.database
      .from("memberships")
      .select("id")
      .eq("organization_id", validated.data.orgId)
      .eq("user_id", userId)
      .maybeSingle();

    if (!data) {
      return { success: false, error: "Not a member of this organization" };
    }

    const cookieStore = await cookies();
    cookieStore.set("active_org_id", validated.data.orgId, {
      path: "/",
      maxAge: 60 * 60 * 24 * 365,
      httpOnly: false,
      sameSite: "lax",
    });

    revalidatePath("/dashboard");
    return { success: true };
  } catch (err) {
    logger.error({ error: err, orgId }, "Unexpected error in setActiveOrganization Server Action");
    Sentry.captureException(err);
    return { success: false, error: "An unexpected error occurred" };
  } finally {
    flushLogsAfterResponse();
  }
}

export async function deleteOrganization(
  orgId: string,
): Promise<{ success: boolean; error?: string }> {
  const validated = setActiveOrganizationInputSchema.safeParse({ orgId });
  if (!validated.success) {
    return { success: false, error: validated.error.issues[0].message };
  }

  try {
    const { userId } = await auth();
    if (!userId) return { success: false, error: "Unauthorized" };

    const insforge = createInsforgeServer(userId);

    // Verify requester is the OWNER
    const { data: membership } = await insforge.database
      .from("memberships")
      .select("role")
      .eq("organization_id", validated.data.orgId)
      .eq("user_id", userId)
      .maybeSingle();

    if (!membership || membership.role !== "OWNER") {
      return { success: false, error: "Only the workspace owner can dissolve the organization." };
    }

    const { error } = await insforge.database
      .from("organizations")
      .delete()
      .eq("id", validated.data.orgId);

    if (error) {
      logger.error({ error, orgId: validated.data.orgId }, "Failed to dissolve organization");
      return { success: false, error: "Failed to dissolve organization" };
    }

    // Clear active organization cookie
    const cookieStore = await cookies();
    cookieStore.delete("active_org_id");

    revalidateTag(`user-orgs-${userId}`, "hours");
    revalidatePath("/dashboard");
    return { success: true };
  } catch (err) {
    logger.error({ error: err, orgId }, "Unexpected error in deleteOrganization Server Action");
    Sentry.captureException(err);
    return { success: false, error: "An unexpected error occurred" };
  } finally {
    flushLogsAfterResponse();
  }
}
