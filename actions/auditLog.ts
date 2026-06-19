"use server";

import { auth } from "@clerk/nextjs/server";
import { createInsforgeServer } from "@/lib/insforge-server";
import { verifyAdminOrOwnerRole } from "@/lib/auth-helpers";
import { logger, flushLogsAfterResponse } from "@/lib/logger";
import * as Sentry from "@sentry/nextjs";
import { z } from "zod";
import { orgIdSchema, DEFAULT_PAGE_SIZE } from "@/lib/utils";

// ─── Zod Schemas ─────────────────────────────────────────────────────────────

const getAuditLogsSchema = z.object({
  orgId: orgIdSchema,
  page: z.number().int().min(0).default(0),
  actorId: z.string().optional(),
  action: z.string().optional(),
  entityType: z.string().optional(),
  from: z.string().datetime().optional(),
  to: z.string().datetime().optional(),
});

// ─── Types ────────────────────────────────────────────────────────────────────

export type AuditLog = {
  id: string;
  organization_id: string;
  actor_id: string | null;
  action: string;
  entity_type: string;
  entity_id: string;
  metadata: Record<string, unknown>;
  created_at: string;
};

export type AuditLogFilters = {
  actorId?: string;
  action?: string;
  entityType?: string;
  from?: string;
  to?: string;
};

// ─── Get Audit Logs (paginated, filtered) ────────────────────────────────────

export async function getAuditLogs(
  orgId: string,
  page = 0,
  filters: AuditLogFilters = {}
): Promise<{
  success: boolean;
  data: AuditLog[];
  totalCount: number;
  error?: string;
}> {
  const validated = getAuditLogsSchema.safeParse({ orgId, page, ...filters });
  if (!validated.success) {
    return {
      success: false,
      data: [],
      totalCount: 0,
      error: validated.error.issues[0].message,
    };
  }

  try {
    const { userId } = await auth();
    if (!userId) return { success: false, data: [], totalCount: 0, error: "Unauthorized" };

    const insforge = createInsforgeServer(userId);

    // Audit logs: ADMIN/OWNER only
    const isAdminOrOwner = await verifyAdminOrOwnerRole(insforge, validated.data.orgId, userId);
    if (!isAdminOrOwner) {
      return {
        success: false,
        data: [],
        totalCount: 0,
        error: "Only admins and owners can view audit logs",
      };
    }

    const offset = validated.data.page * DEFAULT_PAGE_SIZE;

    let query = insforge.database
      .from("audit_logs")
      .select("*", { count: "exact" })
      .eq("organization_id", validated.data.orgId)
      .order("created_at", { ascending: false })
      .range(offset, offset + DEFAULT_PAGE_SIZE - 1);

    if (validated.data.actorId) {
      query = query.eq("actor_id", validated.data.actorId);
    }
    if (validated.data.action) {
      query = query.eq("action", validated.data.action);
    }
    if (validated.data.entityType) {
      query = query.eq("entity_type", validated.data.entityType);
    }
    if (validated.data.from) {
      query = query.gte("created_at", validated.data.from);
    }
    if (validated.data.to) {
      query = query.lte("created_at", validated.data.to);
    }

    const { data, error, count } = await query;

    if (error) {
      logger.error({ error, orgId: validated.data.orgId }, "Failed to fetch audit logs");
      return { success: false, data: [], totalCount: 0, error: "Failed to fetch audit logs" };
    }

    return {
      success: true,
      data: (data ?? []) as AuditLog[],
      totalCount: count ?? 0,
    };
  } catch (err) {
    logger.error({ error: err, orgId }, "Unexpected error in getAuditLogs");
    Sentry.captureException(err);
    return { success: false, data: [], totalCount: 0, error: "An unexpected error occurred" };
  } finally {
    flushLogsAfterResponse();
  }
}
