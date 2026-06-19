import { createInsforgeServer } from "@/lib/insforge-server";
import { logger } from "@/lib/logger";
import * as Sentry from "@sentry/nextjs";

/**
 * Fire-and-forget audit log writer. Never throws.
 * Call via next/server's after() to avoid blocking the response.
 */
export async function writeAuditLog(
  organizationId: string,
  actorId: string | null,
  action: string,
  entityType: string,
  entityId: string,
  metadata: Record<string, unknown> = {}
): Promise<void> {
  try {
    const insforge = createInsforgeServer(actorId ?? "system");

    const { error } = await insforge.database.from("audit_logs").insert([
      {
        organization_id: organizationId,
        actor_id: actorId,
        action,
        entity_type: entityType,
        entity_id: entityId,
        metadata,
      },
    ]);

    if (error) {
      logger.error(
        { error, organizationId, actorId, action, entityType, entityId },
        "Failed to write audit log"
      );
    }
  } catch (err) {
    logger.error(
      { error: err, organizationId, actorId, action },
      "Unexpected error writing audit log"
    );
    Sentry.captureException(err);
  }
}
