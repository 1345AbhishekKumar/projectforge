import { Webhook } from "svix";
import { headers } from "next/headers";
import { NextRequest } from "next/server";
import { WebhookEvent } from "@clerk/nextjs/server";
import { createInsforgeServer } from "@/lib/insforge-server";

export async function POST(req: NextRequest) {
  console.log("Webhook endpoint hit at:", new Date().toISOString());
  
  const WEBHOOK_SECRET = process.env.CLERK_WEBHOOK_SECRET;

  if (!WEBHOOK_SECRET) {
    const error = "CLERK_WEBHOOK_SECRET is not set in environment variables";
    console.error(error);
    return new Response(error, { status: 500 });
  }

  // Get headers
  const headerPayload = await headers();
  const svix_id = headerPayload.get("svix-id");
  const svix_timestamp = headerPayload.get("svix-timestamp");
  const svix_signature = headerPayload.get("svix-signature");

  console.log("Received webhook headers:", {
    "svix-id": svix_id ? "present" : "missing",
    "svix-timestamp": svix_timestamp ? "present" : "missing",
    "svix-signature": svix_signature ? "present" : "missing",
  });

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
    console.error("Failed to parse webhook JSON body:", err);
    return new Response("Invalid JSON", { status: 400 });
  }

  console.log("Webhook payload received:", {
    type: payload.type,
    data: {
      id: payload.data?.id,
      email: payload.data?.email_addresses?.[0]?.email_address,
      object: payload.data?.object,
    },
  });

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
    console.error("Error verifying webhook:", {
      error: errorMessage,
      headers: {
        "svix-id": svix_id,
        "svix-timestamp": svix_timestamp,
        "svix-signature": svix_signature ? "present" : "missing",
      },
    });
    return new Response(`Error verifying webhook: ${errorMessage}`, {
      status: 400,
    });
  }

  const eventType = evt.type;
  const insforge = createInsforgeServer();

  if (eventType === "user.created") {
    console.log("Processing user.created event:", JSON.stringify(evt.data, null, 2));

    const { id, email_addresses, first_name, last_name, image_url } = evt.data;
    const email = email_addresses?.[0]?.email_address;
    const fullName = `${first_name ?? ""} ${last_name ?? ""}`.trim() || null;

    console.log("Extracted user data:", {
      id,
      email,
      fullName,
      hasImage: !!image_url,
    });

    if (!id || !email) {
      const errorMessage = "Missing required user data in webhook payload";
      console.error(errorMessage, { id, hasEmail: !!email });
      return new Response(errorMessage, { status: 400 });
    }

    try {
      const { error } = await insforge.database
        .from("profiles")
        .insert([
          {
            id,
            email,
            full_name: fullName,
            avatar_url: image_url || null,
          },
        ]);

      if (error) {
        console.error("Failed to create profile in InsForge:", error);
        return new Response(`Error creating user: ${error.message}`, { status: 500 });
      }

      console.log("Successfully created user profile in InsForge database:", id);
    } catch (error) {
      console.error("Unexpected error creating profile in database:", error);
      return new Response("Internal Server Error", { status: 500 });
    }
  }

  if (eventType === "user.updated") {
    console.log("Processing user.updated event:", JSON.stringify(evt.data, null, 2));
    
    const { id, email_addresses, first_name, last_name, image_url } = evt.data;
    const email = email_addresses?.[0]?.email_address;
    const fullName = `${first_name ?? ""} ${last_name ?? ""}`.trim() || null;

    if (!id) {
      return new Response("Error occurred -- missing user ID", { status: 400 });
    }

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
        console.error("Failed to update profile in InsForge:", error);
        return new Response("DB update failed", { status: 500 });
      }

      console.log("Successfully updated user profile in InsForge database:", id);
    } catch (error) {
      console.error("Unexpected error updating profile in database:", error);
      return new Response("Internal Server Error", { status: 500 });
    }
  }

  if (eventType === "user.deleted") {
    console.log("Processing user.deleted event:", JSON.stringify(evt.data, null, 2));
    const { id } = evt.data;

    if (!id) {
      return new Response("Error occurred -- missing user ID", { status: 400 });
    }

    try {
      const { error } = await insforge.database
        .from("profiles")
        .delete()
        .eq("id", id);

      if (error) {
        console.error("Failed to delete profile from InsForge:", error);
        return new Response("DB delete failed", { status: 500 });
      }

      console.log("Successfully deleted user profile from InsForge database:", id);
    } catch (error) {
      console.error("Unexpected error deleting profile in database:", error);
      return new Response("Internal Server Error", { status: 500 });
    }
  }

  return new Response("OK", { status: 200 });
}
