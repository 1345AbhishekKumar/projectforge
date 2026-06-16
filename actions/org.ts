"use server";

import { auth } from "@clerk/nextjs/server";
import { cookies } from "next/headers";
import { revalidatePath } from "next/cache";
import { createInsforgeServer } from "@/lib/insforge-server";
import { z } from "zod";
import type { OrganizationWithRole } from "@/types";
import { orgIdSchema } from "@/lib/utils";

const createOrgSchema = z.object({
  name: z.string().min(3, "Name must be at least 3 characters").max(50),
  slug: z
    .string()
    .min(3, "Slug must be at least 3 characters")
    .max(40)
    .regex(
      /^[a-z0-9]+(?:-[a-z0-9]+)*$/,
      "Slug must be lowercase alphanumeric with hyphens"
    ),
});

const setActiveOrganizationInputSchema = z.object({
  orgId: orgIdSchema,
});

export async function createOrganization(
  name: string,
  slug: string
): Promise<{ success: boolean; data?: { orgId: string }; error?: string }> {
  try {
    const { userId } = await auth();
    if (!userId) return { success: false, error: "Unauthorized" };

    const validated = createOrgSchema.safeParse({ name, slug });
    if (!validated.success) {
      return { success: false, error: validated.error.issues[0].message };
    }

    const insforge = createInsforgeServer();

    const { data: org, error: orgError } = await insforge.database
      .from("organizations")
      .insert([{ name: validated.data.name, slug: validated.data.slug }])
      .select("id")
      .single();

    if (orgError) {
      if (orgError.message?.includes("duplicate") || orgError.message?.includes("unique")) {
        return { success: false, error: "This slug is already taken" };
      }
      return { success: false, error: "Failed to create organization" };
    }

    const { error: memberError } = await insforge.database
      .from("memberships")
      .insert([
        {
          organization_id: org.id,
          user_id: userId,
          role: "OWNER",
        },
      ]);

    if (memberError) {
      return { success: false, error: "Failed to assign ownership" };
    }

    const cookieStore = await cookies();
    cookieStore.set("active_org_id", org.id, {
      path: "/",
      maxAge: 60 * 60 * 24 * 365,
      httpOnly: false,
      sameSite: "lax",
    });

    revalidatePath("/dashboard");
    return { success: true, data: { orgId: org.id } };
  } catch {
    return { success: false, error: "An unexpected error occurred" };
  }
}

export async function checkSlugAvailability(
  slug: string
): Promise<{ available: boolean }> {
  try {
    const slugSchema = z
      .string()
      .min(3)
      .max(40)
      .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/);
    const validated = slugSchema.safeParse(slug);
    if (!validated.success) return { available: false };

    const insforge = createInsforgeServer();
    const { data } = await insforge.database
      .from("organizations")
      .select("id")
      .eq("slug", validated.data)
      .maybeSingle();

    return { available: !data };
  } catch {
    return { available: false };
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

    const insforge = createInsforgeServer();
    const { data, error } = await insforge.database
      .from("memberships")
      .select("role, organizations(id, name, slug, created_at, updated_at)")
      .eq("user_id", userId);

    if (error) {
      return { success: false, error: "Failed to fetch organizations", data: [] };
    }

    const orgs: OrganizationWithRole[] = (data || []).map(
      (m: Record<string, unknown>) => ({
        ...(m.organizations as Record<string, unknown>),
        role: m.role as string,
      })
    ) as OrganizationWithRole[];

    return { success: true, data: orgs };
  } catch {
    return { success: false, error: "An unexpected error occurred", data: [] };
  }
}

export async function setActiveOrganization(
  orgId: string
): Promise<{ success: boolean; error?: string }> {
  const validated = setActiveOrganizationInputSchema.safeParse({ orgId });
  if (!validated.success) {
    return { success: false, error: validated.error.issues[0].message };
  }

  try {
    const { userId } = await auth();
    if (!userId) return { success: false, error: "Unauthorized" };

    const insforge = createInsforgeServer();
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
  } catch {
    return { success: false, error: "An unexpected error occurred" };
  }
}
