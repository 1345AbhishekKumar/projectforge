import { verifyWebhook } from "@clerk/nextjs/webhooks";
import { NextRequest } from "next/server";
import { createInsforgeServer } from "@/lib/insforge-server";

export async function POST(req: NextRequest) {
  let evt;
  try {
    evt = await verifyWebhook(req);
  } catch (err) {
    console.error("Clerk webhook verification failed:", err);
    return new Response("Verification failed", { status: 400 });
  }

  const insforge = createInsforgeServer();

  if (evt.type === "user.created") {
    const { id, email_addresses, first_name, last_name, image_url } = evt.data;
    const email = email_addresses[0]?.email_address;
    const fullName = `${first_name ?? ""} ${last_name ?? ""}`.trim() || null;

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
      return new Response("DB insert failed", { status: 500 });
    }
  }

  if (evt.type === "user.updated") {
    const { id, email_addresses, first_name, last_name, image_url } = evt.data;
    const email = email_addresses[0]?.email_address;
    const fullName = `${first_name ?? ""} ${last_name ?? ""}`.trim() || null;

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
  }

  if (evt.type === "user.deleted") {
    const { id } = evt.data;
    if (id) {
      const { error } = await insforge.database
        .from("profiles")
        .delete()
        .eq("id", id);

      if (error) {
        console.error("Failed to delete profile from InsForge:", error);
      }
    }
  }

  return new Response("OK", { status: 200 });
}
