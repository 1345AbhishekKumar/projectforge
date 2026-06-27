import { Webhook } from "svix";
import { headers } from "next/headers";
import { NextRequest } from "next/server";
import { WebhookEvent } from "@clerk/nextjs/server";
import { createInsforgeServer } from "@/lib/insforge-server";
import { logger, flushLogsAfterResponse } from "@/lib/logger";
import * as Sentry from "@sentry/nextjs";

export async function POST(req: NextRequest) {
  try {
    logger.info("Webhook endpoint hit");

    const WEBHOOK_SECRET = process.env.CLERK_WEBHOOK_SECRET;

    if (!WEBHOOK_SECRET) {
      const error = "CLERK_WEBHOOK_SECRET is not set in environment variables";
      logger.error(error);
      return new Response(error, { status: 500 });
    }

    // Get headers
    const headerPayload = await headers();
    const svix_id = headerPayload.get("svix-id");
    const svix_timestamp = headerPayload.get("svix-timestamp");
    const svix_signature = headerPayload.get("svix-signature");

    logger.info(
      {
        svixId: svix_id ? "present" : "missing",
        svixTimestamp: svix_timestamp ? "present" : "missing",
        svixSignature: svix_signature ? "present" : "missing",
      },
      "Received webhook headers",
    );

    // If there are no headers, error out
    if (!svix_id || !svix_timestamp || !svix_signature) {
      return new Response("Error occurred -- no svix headers", {
        status: 400,
      });
    }

    // Get the body
    const body = await req.text();
    let payload;
    try {
      payload = JSON.parse(body);
    } catch (err) {
      logger.error({ err }, "Failed to parse webhook JSON body");
      Sentry.captureException(err);
      return new Response("Invalid JSON", { status: 400 });
    }

    logger.info(
      {
        type: payload.type,
        userId: payload.data?.id,
        email: payload.data?.email_addresses?.[0]?.email_address,
        object: payload.data?.object,
      },
      "Webhook payload received",
    );

    // Create a new Svix instance with the secret
    const wh = new Webhook(WEBHOOK_SECRET);

    let evt: WebhookEvent;

    // Verify the payload with the headers
    try {
      evt = wh.verify(body, {
        "svix-id": svix_id,
        "svix-timestamp": svix_timestamp,
        "svix-signature": svix_signature,
      }) as WebhookEvent;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : "Unknown error";
      logger.error(
        {
          error: errorMessage,
          svixId: svix_id,
          svixTimestamp: svix_timestamp,
          svixSignature: svix_signature ? "present" : "missing",
        },
        "Error verifying webhook",
      );
      Sentry.captureException(err);
      return new Response(`Error verifying webhook: ${errorMessage}`, {
        status: 400,
      });
    }

    const eventType = evt.type;
    const eventUserId = (evt.data as { id?: string })?.id;

    if (!eventUserId) {
      logger.error({ eventType }, "Missing user ID in webhook event data");
      return new Response("Error occurred -- missing user ID", { status: 400 });
    }

    // Pass eventUserId as RLS context, so that profiles operations execute under this user's RLS policy.
    const insforge = createInsforgeServer(eventUserId);

    if (eventType === "user.created") {
      logger.info({ userId: eventUserId }, "Processing user.created event");

      const { id, email_addresses, first_name, last_name, image_url } = evt.data;
      const email = email_addresses?.[0]?.email_address;
      const fullName = `${first_name ?? ""} ${last_name ?? ""}`.trim() || null;

      logger.info(
        {
          id,
          email,
          fullName,
          hasImage: !!image_url,
        },
        "Extracted user data",
      );

      if (!id || !email) {
        const errorMessage = "Missing required user data in webhook payload";
        logger.error({ id, hasEmail: !!email }, errorMessage);
        return new Response(errorMessage, { status: 400 });
      }

      try {
        const { error } = await insforge.database.from("profiles").insert([
          {
            id,
            email,
            full_name: fullName,
            avatar_url: image_url || null,
          },
        ]);

        if (error) {
          if (
            error.message?.includes("duplicate") ||
            error.message?.includes("unique") ||
            error.code === "23505"
          ) {
            logger.info(
              { userId: id, email },
              "Profile already exists, ignoring duplicate/unique constraint error",
            );
          } else {
            logger.error({ error }, "Failed to create profile in InsForge");
            return new Response(`Error creating user: ${error.message}`, { status: 500 });
          }
        } else {
          logger.info({ userId: id }, "Successfully created user profile in InsForge database");
        }

        // JIT Provisioning for Enterprise SSO users
        const emailDomain = email.split("@")[1]?.toLowerCase();
        const publicDomains = [
          "gmail.com",
          "yahoo.com",
          "outlook.com",
          "hotmail.com",
          "live.com",
          "aol.com",
          "icloud.com",
        ];

        if (emailDomain && !publicDomains.includes(emailDomain)) {
          logger.info({ userId: id, emailDomain }, "Processing corporate domain JIT provisioning");
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
            logger.info(
              { userId: id, orgId: targetOrgId },
              "Matching organization found, auto-joining as MEMBER",
            );
            // 2. Link user as MEMBER
            const { error: memberError } = await insforge.database.from("memberships").insert([
              {
                organization_id: targetOrgId,
                user_id: id,
                role: "MEMBER",
              },
            ]);

            if (memberError) {
              logger.error(
                { error: memberError, userId: id, orgId: targetOrgId },
                "Failed to auto-join user to organization",
              );
            }
          } else {
            logger.info(
              { userId: id, emailDomain },
              "No matching organization found, auto-creating workspace",
            );
            // 3. Auto-create organization
            const orgName = `${domainPrefix.charAt(0).toUpperCase()}${domainPrefix.slice(1)} Workspace`;
            const { data: newOrg, error: createOrgError } = await insforge.database
              .from("organizations")
              .insert([{ name: orgName, slug: domainPrefix }])
              .select("id")
              .single();

            let createdOrg = newOrg;

            if (
              createOrgError &&
              (createOrgError.message?.includes("duplicate") ||
                createOrgError.message?.includes("unique"))
            ) {
              // Slug taken, fallback to full domain slug
              const fallbackSlug = emailDomain.replace(/\./g, "-");
              logger.info(
                { userId: id, fallbackSlug },
                "Workspace slug already taken, falling back to full domain slug",
              );
              const { data: fallbackOrg, error: fallbackError } = await insforge.database
                .from("organizations")
                .insert([{ name: orgName, slug: fallbackSlug }])
                .select("id")
                .single();

              if (fallbackError) {
                logger.error(
                  { error: fallbackError, userId: id },
                  "Failed to create fallback organization",
                );
              } else {
                createdOrg = fallbackOrg;
              }
            } else if (createOrgError) {
              logger.error(
                { error: createOrgError, userId: id },
                "Failed to auto-create organization",
              );
            }

            if (createdOrg?.id) {
              logger.info(
                { userId: id, orgId: createdOrg.id },
                "Successfully created organization, assigning OWNER role",
              );
              const { error: ownerError } = await insforge.database.from("memberships").insert([
                {
                  organization_id: createdOrg.id,
                  user_id: id,
                  role: "OWNER",
                },
              ]);

              if (ownerError) {
                logger.error(
                  { error: ownerError, userId: id, orgId: createdOrg.id },
                  "Failed to assign OWNER role for auto-created organization",
                );
              }
            }
          }
        } else {
          logger.info(
            { userId: id, emailDomain },
            "Skipped JIT provisioning for public or empty email domain",
          );
        }
      } catch (error) {
        logger.error({ error }, "Unexpected error creating profile in database");
        Sentry.captureException(error);
        return new Response("Internal Server Error", { status: 500 });
      }
    }

    if (eventType === "user.updated") {
      logger.info({ userId: eventUserId }, "Processing user.updated event");

      const { id, email_addresses, first_name, last_name, image_url } = evt.data;
      const email = email_addresses?.[0]?.email_address;
      const fullName = `${first_name ?? ""} ${last_name ?? ""}`.trim() || null;

      try {
        const { error } = await insforge.database
          .from("profiles")
          .update({
            email,
            full_name: fullName,
            avatar_url: image_url || null,
            updated_at: new Date().toISOString(),
          })
          .eq("id", id);

        if (error) {
          logger.error({ error }, "Failed to update profile in InsForge");
          return new Response("DB update failed", { status: 500 });
        }

        logger.info({ userId: id }, "Successfully updated user profile in InsForge database");
      } catch (error) {
        logger.error({ error }, "Unexpected error updating profile in database");
        Sentry.captureException(error);
        return new Response("Internal Server Error", { status: 500 });
      }
    }

    if (eventType === "user.deleted") {
      logger.info({ userId: eventUserId }, "Processing user.deleted event");
      const { id } = evt.data;

      try {
        const { error } = await insforge.database.from("profiles").delete().eq("id", id);

        if (error) {
          logger.error({ error }, "Failed to delete profile from InsForge");
          return new Response("DB delete failed", { status: 500 });
        }

        logger.info({ userId: id }, "Successfully deleted user profile from InsForge database");
      } catch (error) {
        logger.error({ error }, "Unexpected error deleting profile in database");
        Sentry.captureException(error);
        return new Response("Internal Server Error", { status: 500 });
      }
    }

    return new Response("OK", { status: 200 });
  } finally {
    flushLogsAfterResponse();
  }
}
