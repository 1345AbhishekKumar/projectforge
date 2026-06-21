"use server";

import { auth } from "@clerk/nextjs/server";
import { revalidatePath } from "next/cache";
import { createInsforgeServer } from "@/lib/insforge-server";
import { verifyAdminOrOwnerRole } from "@/lib/auth-helpers";
import { writeAuditLog } from "@/lib/audit";
import { logger, flushLogsAfterResponse } from "@/lib/logger";
import * as Sentry from "@sentry/nextjs";
import { z } from "zod";

const settingsSchema = z.object({
  orgId: z.string().uuid("Invalid organization ID"),
});

const updateSettingsSchema = z.object({
  orgId: z.string().uuid("Invalid organization ID"),
  retentionDays: z.number().int().min(1, "Retention days must be at least 1").nullable(),
});

/**
 * Fetches the data retention settings (retention_days) for an organization.
 */
export async function getComplianceSettings(
  orgId: string
): Promise<{ success: boolean; data?: { retentionDays: number | null }; error?: string }> {
  try {
    const { userId } = await auth();
    if (!userId) return { success: false, error: "Unauthorized" };

    const validated = settingsSchema.safeParse({ orgId });
    if (!validated.success) {
      return { success: false, error: validated.error.issues[0].message };
    }

    const insforge = createInsforgeServer(userId);
    const isAdmin = await verifyAdminOrOwnerRole(insforge, orgId, userId);
    if (!isAdmin) {
      return { success: false, error: "Access denied: Compliance settings are restricted to administrators" };
    }

    const { data, error } = await insforge.database
      .from("organizations")
      .select("retention_days")
      .eq("id", orgId)
      .maybeSingle();

    if (error || !data) {
      logger.error({ error, orgId }, "Failed to fetch organization compliance settings");
      return { success: false, error: "Failed to load compliance settings" };
    }

    return { success: true, data: { retentionDays: data.retention_days } };
  } catch (err) {
    logger.error({ error: err, orgId }, "Unexpected error in getComplianceSettings");
    Sentry.captureException(err);
    return { success: false, error: "An unexpected error occurred" };
  } finally {
    flushLogsAfterResponse();
  }
}

/**
 * Updates the data retention settings for an organization.
 */
export async function updateComplianceSettings(
  orgId: string,
  retentionDays: number | null
): Promise<{ success: boolean; error?: string }> {
  try {
    const { userId } = await auth();
    if (!userId) return { success: false, error: "Unauthorized" };

    const validated = updateSettingsSchema.safeParse({ orgId, retentionDays });
    if (!validated.success) {
      return { success: false, error: validated.error.issues[0].message };
    }

    const insforge = createInsforgeServer(userId);
    const isAdmin = await verifyAdminOrOwnerRole(insforge, orgId, userId);
    if (!isAdmin) {
      return { success: false, error: "Unauthorized: Compliance settings are restricted to administrators" };
    }

    const { error } = await insforge.database
      .from("organizations")
      .update({ retention_days: validated.data.retentionDays })
      .eq("id", orgId);

    if (error) {
      logger.error({ error, orgId }, "Failed to update compliance settings");
      return { success: false, error: "Failed to update compliance settings" };
    }

    // Log this change in the audit logs
    writeAuditLog(orgId, userId, "compliance.settings_updated", "compliance", orgId, {
      retentionDays: validated.data.retentionDays,
    });

    revalidatePath("/settings/compliance");
    return { success: true };
  } catch (err) {
    logger.error({ error: err, orgId }, "Unexpected error in updateComplianceSettings");
    Sentry.captureException(err);
    return { success: false, error: "An unexpected error occurred" };
  } finally {
    flushLogsAfterResponse();
  }
}

/**
 * Permanently deletes tasks and activities older than the organization's retention policy.
 */
export async function runDataRetentionCleanup(
  orgId: string
): Promise<{ success: boolean; data?: { deletedTasks: number; deletedActivities: number }; error?: string }> {
  try {
    const { userId } = await auth();
    if (!userId) return { success: false, error: "Unauthorized" };

    const validated = settingsSchema.safeParse({ orgId });
    if (!validated.success) {
      return { success: false, error: validated.error.issues[0].message };
    }

    const insforge = createInsforgeServer(userId);
    const isAdmin = await verifyAdminOrOwnerRole(insforge, orgId, userId);
    if (!isAdmin) {
      return { success: false, error: "Unauthorized: Deletion cleanup is restricted to administrators" };
    }

    // Fetch the retention policy setting
    const { data: orgData, error: orgError } = await insforge.database
      .from("organizations")
      .select("retention_days")
      .eq("id", orgId)
      .maybeSingle();

    if (orgError || !orgData || orgData.retention_days === null || orgData.retention_days === undefined) {
      return { success: false, error: "Data retention policy is not set or enabled for this organization" };
    }

    const days = orgData.retention_days;
    const cutoffDate = new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString();

    // Fetch projects of this organization
    const { data: projects, error: projectsError } = await insforge.database
      .from("projects")
      .select("id")
      .eq("organization_id", orgId);

    if (projectsError) {
      logger.error({ error: projectsError, orgId }, "Error fetching projects for cleanup");
      return { success: false, error: "Failed to run data retention cleanup" };
    }

    const projectIds = projects?.map((p) => p.id) || [];
    let deletedTasks = 0;

    // Delete tasks older than cutoff
    if (projectIds.length > 0) {
      const { data: tasksDeleted, error: tasksError } = await insforge.database
        .from("tasks")
        .delete()
        .in("project_id", projectIds)
        .lt("created_at", cutoffDate)
        .select("id");

      if (tasksError) {
        logger.error({ error: tasksError, orgId }, "Failed to delete tasks in cleanup");
        return { success: false, error: "Failed to run tasks retention cleanup" };
      }
      deletedTasks = tasksDeleted?.length || 0;
    }

    // Delete activity logs older than cutoff
    const { data: activitiesDeleted, error: activitiesError } = await insforge.database
      .from("activities")
      .delete()
      .eq("organization_id", orgId)
      .lt("created_at", cutoffDate)
      .select("id");

    if (activitiesError) {
      logger.error({ error: activitiesError, orgId }, "Failed to delete activities in cleanup");
      return { success: false, error: "Failed to run activities retention cleanup" };
    }
    const deletedActivities = activitiesDeleted?.length || 0;

    // Log the retention execution in the audit trail
    writeAuditLog(orgId, userId, "compliance.retention_cleanup", "compliance", orgId, {
      deletedTasks,
      deletedActivities,
      cutoffDate,
      retentionDays: days,
    });

    return {
      success: true,
      data: {
        deletedTasks,
        deletedActivities,
      },
    };
  } catch (err) {
    logger.error({ error: err, orgId }, "Unexpected error in runDataRetentionCleanup");
    Sentry.captureException(err);
    return { success: false, error: "An unexpected error occurred" };
  } finally {
    flushLogsAfterResponse();
  }
}

/**
 * Exports organization audit trails to CSV format.
 */
export async function exportAuditLogsCSV(
  orgId: string
): Promise<{ success: boolean; data?: string; error?: string }> {
  try {
    const { userId } = await auth();
    if (!userId) return { success: false, error: "Unauthorized" };

    const validated = settingsSchema.safeParse({ orgId });
    if (!validated.success) {
      return { success: false, error: validated.error.issues[0].message };
    }

    const insforge = createInsforgeServer(userId);
    const isAdmin = await verifyAdminOrOwnerRole(insforge, orgId, userId);
    if (!isAdmin) {
      return { success: false, error: "Unauthorized: Exporting audit logs is restricted to administrators" };
    }

    // Fetch all logs (no limit for compliance export)
    const { data: logs, error } = await insforge.database
      .from("audit_logs")
      .select("*")
      .eq("organization_id", orgId)
      .order("created_at", { ascending: false });

    if (error) {
      logger.error({ error, orgId }, "Failed to fetch audit logs for CSV export");
      return { success: false, error: "Failed to retrieve audit trail logs" };
    }

    let csvContent = "ProjectForge Audit Trail Log Export\n";
    csvContent += `Organization ID: ${orgId}\n`;
    csvContent += `Exported At: ${new Date().toISOString()}\n\n`;
    csvContent += "Time (UTC),Actor ID,Action,Entity Type,Entity ID,Metadata (JSON)\n";

    (logs || []).forEach((log) => {
      const metadataStr = JSON.stringify(log.metadata || {}).replace(/"/g, '""');
      csvContent += `${log.created_at},${log.actor_id || "system"},${log.action},${log.entity_type},${log.entity_id},"${metadataStr}"\n`;
    });

    return { success: true, data: csvContent };
  } catch (err) {
    logger.error({ error: err, orgId }, "Unexpected error in exportAuditLogsCSV");
    Sentry.captureException(err);
    return { success: false, error: "An unexpected error occurred" };
  } finally {
    flushLogsAfterResponse();
  }
}

/**
 * Exports all project risks across the organization.
 */
export async function exportProjectRisksCSV(
  orgId: string
): Promise<{ success: boolean; data?: string; error?: string }> {
  try {
    const { userId } = await auth();
    if (!userId) return { success: false, error: "Unauthorized" };

    const validated = settingsSchema.safeParse({ orgId });
    if (!validated.success) {
      return { success: false, error: validated.error.issues[0].message };
    }

    const insforge = createInsforgeServer(userId);
    const isAdmin = await verifyAdminOrOwnerRole(insforge, orgId, userId);
    if (!isAdmin) {
      return { success: false, error: "Unauthorized: Exporting risks is restricted to administrators" };
    }

    // Fetch projects of this organization
    const { data: projects, error: projectsError } = await insforge.database
      .from("projects")
      .select("id, name")
      .eq("organization_id", orgId);

    if (projectsError) {
      logger.error({ error: projectsError, orgId }, "Error fetching projects for CSV export");
      return { success: false, error: "Failed to retrieve projects list" };
    }

    const projectIds = projects?.map((p) => p.id) || [];
    const projectMap = new Map<string, string>();
    projects?.forEach((p) => projectMap.set(p.id, p.name));

    let risks: { id: string; project_id: string; title: string; probability: string; impact: string; mitigation_plan: string | null; created_at: string }[] = [];
    if (projectIds.length > 0) {
      const { data: risksData, error: risksError } = await insforge.database
        .from("risks")
        .select("*")
        .in("project_id", projectIds)
        .order("created_at", { ascending: false });

      if (!risksError && risksData) {
        risks = risksData;
      }
    }

    let csvContent = "ProjectForge Project Risks Register Export\n";
    csvContent += `Organization ID: ${orgId}\n`;
    csvContent += `Exported At: ${new Date().toISOString()}\n\n`;
    csvContent += "Project Name,Risk Title,Probability,Impact,Mitigation Plan,Created At\n";

    risks.forEach((risk) => {
      const projectName = projectMap.get(risk.project_id) || "Unknown Project";
      const title = risk.title.replace(/"/g, '""');
      const mitigation = (risk.mitigation_plan || "").replace(/"/g, '""');
      csvContent += `"${projectName}","${title}",${risk.probability},${risk.impact},"${mitigation}",${risk.created_at}\n`;
    });

    return { success: true, data: csvContent };
  } catch (err) {
    logger.error({ error: err, orgId }, "Unexpected error in exportProjectRisksCSV");
    Sentry.captureException(err);
    return { success: false, error: "An unexpected error occurred" };
  } finally {
    flushLogsAfterResponse();
  }
}
