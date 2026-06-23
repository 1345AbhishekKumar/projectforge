"use server";

import * as Sentry from "@sentry/nextjs";
import { auth, currentUser } from "@clerk/nextjs/server";
import { cookies } from "next/headers";
import { createInsforgeServer } from "@/lib/insforge-server";
import { z } from "zod";
import { logger, flushLogsAfterResponse } from "@/lib/logger";

/**
 * Ensures the current Clerk user has a matching row in InsForge `profiles`.
 * Call this on first dashboard load as a fallback for users who signed up
 * before the webhook was active, or if the webhook delivery failed.
 */
export async function syncProfile(): Promise<{
  success: boolean;
  error?: string;
}> {
  try {
    const { userId } = await auth();
    if (!userId) return { success: false, error: "Unauthorized" };

    const insforge = createInsforgeServer(userId);

    // Check if profile already exists
    const { data: existing } = await insforge.database
      .from("profiles")
      .select("id")
      .eq("id", userId)
      .maybeSingle();

    if (existing) return { success: true };

    // Profile missing — pull from Clerk and insert
    const user = await currentUser();
    if (!user) return { success: false, error: "Clerk user not found" };

    const fullName =
      `${user.firstName ?? ""} ${user.lastName ?? ""}`.trim() || null;

    const { error } = await insforge.database.from("profiles").insert([
      {
        id: userId,
        email: user.emailAddresses[0]?.emailAddress ?? "",
        full_name: fullName,
        avatar_url: user.imageUrl || null,
      },
    ]);

    if (error) {
      // Unique constraint = another process already inserted (race condition)
      if (error.message?.includes("duplicate") || error.message?.includes("unique")) {
        return { success: true };
      }
      logger.error({ error, userId }, "Failed to sync profiles in database");
      return { success: false, error: "Failed to sync profile" };
    }

    // JIT Provisioning fallback for Enterprise SSO users
    const email = user.emailAddresses[0]?.emailAddress ?? "";
    const emailDomain = email.split("@")[1]?.toLowerCase();
    const publicDomains = ["gmail.com", "yahoo.com", "outlook.com", "hotmail.com", "live.com", "aol.com", "icloud.com"];

    if (emailDomain && !publicDomains.includes(emailDomain)) {
      logger.info({ userId, emailDomain }, "Processing fallback JIT provisioning for corporate domain");
      const domainPrefix = emailDomain.split(".")[0];
      
      // 1. Search for existing organization by slug or name
      let { data: org } = await insforge.database
        .from("organizations")
        .select("id")
        .eq("slug", domainPrefix)
        .maybeSingle();

      if (!org) {
        const { data: orgByName } = await insforge.database
          .from("organizations")
          .select("id")
          .ilike("name", domainPrefix)
          .maybeSingle();
        org = orgByName;
      }

      const targetOrgId = org?.id;

      if (targetOrgId) {
        logger.info({ userId, orgId: targetOrgId }, "Matching organization found in fallback, auto-joining as MEMBER");
        // 2. Link user as MEMBER
        const { error: memberError } = await insforge.database
          .from("memberships")
          .insert([
            {
              organization_id: targetOrgId,
              user_id: userId,
              role: "MEMBER",
            },
          ]);

        if (memberError) {
          logger.error({ error: memberError, userId, orgId: targetOrgId }, "Fallback: Failed to auto-join user to organization");
        } else {
          // Set active_org_id cookie
          const cookieStore = await cookies();
          cookieStore.set("active_org_id", targetOrgId, {
            path: "/",
            maxAge: 60 * 60 * 24 * 365,
            httpOnly: false,
            sameSite: "lax",
          });
        }
      } else {
        logger.info({ userId, emailDomain }, "Fallback: No matching organization found, auto-creating workspace");
        // 3. Auto-create organization
        const orgName = `${domainPrefix.charAt(0).toUpperCase()}${domainPrefix.slice(1)} Workspace`;
        const { data: newOrg, error: createOrgError } = await insforge.database
          .from("organizations")
          .insert([{ name: orgName, slug: domainPrefix }])
          .select("id")
          .single();

        let createdOrg = newOrg;

        if (createOrgError && (createOrgError.message?.includes("duplicate") || createOrgError.message?.includes("unique"))) {
          // Slug taken, fallback to full domain slug
          const fallbackSlug = emailDomain.replace(/\./g, "-");
          logger.info({ userId, fallbackSlug }, "Fallback: Workspace slug already taken, falling back to full domain slug");
          const { data: fallbackOrg, error: fallbackError } = await insforge.database
            .from("organizations")
            .insert([{ name: orgName, slug: fallbackSlug }])
            .select("id")
            .single();
          
          if (fallbackError) {
            logger.error({ error: fallbackError, userId }, "Fallback: Failed to create fallback organization");
          } else {
            createdOrg = fallbackOrg;
          }
        } else if (createOrgError) {
          logger.error({ error: createOrgError, userId }, "Fallback: Failed to auto-create organization");
        }

        if (createdOrg?.id) {
          logger.info({ userId, orgId: createdOrg.id }, "Fallback: Successfully created organization, assigning OWNER role");
          const { error: ownerError } = await insforge.database
            .from("memberships")
            .insert([
              {
                organization_id: createdOrg.id,
                user_id: userId,
                role: "OWNER",
              },
            ]);

          if (ownerError) {
            logger.error({ error: ownerError, userId, orgId: createdOrg.id }, "Fallback: Failed to assign OWNER role for auto-created organization");
          } else {
            // Set active_org_id cookie
            const cookieStore = await cookies();
            cookieStore.set("active_org_id", createdOrg.id, {
              path: "/",
              maxAge: 60 * 60 * 24 * 365,
              httpOnly: false,
              sameSite: "lax",
            });
          }
        }
      }
    }

    return { success: true };
  } catch (err) {
    logger.error({ error: err }, "Unexpected error in syncProfile Server Action");
    Sentry.captureException(err);
    return { success: false, error: "An unexpected error occurred" };
  } finally {
    flushLogsAfterResponse();
  }
}

import { profileSchema as updateProfileSchema } from "@/lib/schemas/validation";

export async function updateProfile(
  fullName: string,
  avatarUrl?: string | null,
  locale?: string
): Promise<{ success: boolean; error?: string }> {
  let userId: string | null = null;
  try {
    const authRes = await auth();
    userId = authRes.userId;
    if (!userId) return { success: false, error: "Unauthorized" };

    const validated = updateProfileSchema.safeParse({ fullName, avatarUrl, locale });
    if (!validated.success) {
      return { success: false, error: validated.error.issues[0].message };
    }

    const insforge = createInsforgeServer(userId);

    const { error } = await insforge.database
      .from("profiles")
      .update({
        full_name: validated.data.fullName,
        avatar_url: validated.data.avatarUrl || null,
        locale: validated.data.locale,
        updated_at: new Date().toISOString(),
      })
      .eq("id", userId);

    if (error) {
      logger.error({ error, userId }, "Failed to update profile in database");
      return { success: false, error: "Failed to update profile" };
    }

    const cookieStore = await cookies();
    cookieStore.set("locale", validated.data.locale, {
      path: "/",
      maxAge: 60 * 60 * 24 * 365,
      httpOnly: false,
      sameSite: "lax",
    });

    return { success: true };
  } catch (err) {
    logger.error({ error: err, userId }, "Unexpected error in updateProfile Server Action");
    Sentry.captureException(err);
    return { success: false, error: "An unexpected error occurred" };
  } finally {
    flushLogsAfterResponse();
  }
}

