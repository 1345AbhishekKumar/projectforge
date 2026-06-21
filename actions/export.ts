"use server";

import { auth } from "@clerk/nextjs/server";
import { createInsforgeServer } from "@/lib/insforge-server";
import { verifyMembership, verifyAdminOrOwnerRole } from "@/lib/auth-helpers";
import { getReportingData } from "./report";
import { logger, flushLogsAfterResponse } from "@/lib/logger";
import * as Sentry from "@sentry/nextjs";
import crypto from "crypto";
import { z } from "zod";

export interface ProjectExportRow {
  name: string;
  description: string;
  status: string;
  created_at: string;
  tasks_count: number;
}
export interface TaskExportRow {
  project_name: string;
  title: string;
  description: string;
  status: string;
  priority: string;
  assignee_name: string;
  assignee_email: string;
  due_date: string;
  estimated_hours: number;
  sprint_name: string;
  created_at: string;
}
export interface AuditLogExportRow {
  created_at: string;
  actor: string;
  action: string;
  entity_type: string;
  entity_id: string;
  metadata: string;
}
export interface ProductivityItem {
  name: string;
  completedCount: number;
}
export interface ProjectHealthItem {
  name: string;
  score: number;
  status: string;
  riskFactors: string[];
}
export interface WorkloadItem {
  name: string;
  totalTasks: number;
  overdueTasks: number;
  totalEstimatedHours: number;
  capacityUtilization: number;
}
export type ExportDataRow = ProjectExportRow | TaskExportRow | AuditLogExportRow | Record<string, unknown>;

const exportSchema = z.object({
  orgId: z.string().uuid("Invalid organization ID"),
  type: z.enum(["projects", "tasks", "reports", "audit_logs"]),
  format: z.enum(["csv", "excel", "pdf"]),
});

function calculateHMAC(data: string): string {
  const secret = process.env.DATA_EXPORT_SECRET || "projectforge-default-hmac-salt-key-2026";
  const hmac = crypto.createHmac("sha256", secret);
  hmac.update(data);
  return hmac.digest("hex");
}

export async function exportDataAction(
  orgId: string,
  type: "projects" | "tasks" | "reports" | "audit_logs",
  format: "csv" | "excel" | "pdf"
): Promise<{ success: boolean; data?: string | ExportDataRow[]; hash?: string; filename?: string; error?: string }> {
  try {
    const { userId } = await auth();
    if (!userId) return { success: false, error: "Unauthorized" };

    const validated = exportSchema.safeParse({ orgId, type, format });
    if (!validated.success) {
      return { success: false, error: validated.error.issues[0].message };
    }

    const insforge = createInsforgeServer(userId);

    // Enforce role checks. Audit logs require ADMIN/OWNER, other things require MEMBERSHIP.
    if (type === "audit_logs") {
      const isAdmin = await verifyAdminOrOwnerRole(insforge, orgId, userId);
      if (!isAdmin) {
        return { success: false, error: "Access denied: Audit logs can only be exported by administrators." };
      }
    } else {
      const isMember = await verifyMembership(insforge, orgId, userId);
      if (!isMember) {
        return { success: false, error: "Access denied: You must be a member of this workspace to export data." };
      }
    }

    let rawData: ExportDataRow[] = [];
    let csvHeader = "";
    let contentStringForHash = "";
    let filename = `${type}_export_${new Date().toISOString().split("T")[0]}`;

    if (type === "projects") {
      const [projectsRes, tasksRes] = await Promise.all([
        insforge.database
          .from("projects")
          .select("id, name, description, status, created_at")
          .eq("organization_id", orgId)
          .order("created_at", { ascending: false }),
        insforge.database.from("tasks").select("project_id").eq("organization_id", orgId),
      ]);

      if (projectsRes.error) {
        logger.error({ error: projectsRes.error }, "Error fetching projects for export");
        return { success: false, error: "Failed to fetch projects data" };
      }

      const projects = projectsRes.data || [];
      const tasks = tasksRes.data || [];

      // Compute tasks count per project
      const taskCountMap = new Map<string, number>();
      tasks.forEach((t) => {
        taskCountMap.set(t.project_id, (taskCountMap.get(t.project_id) || 0) + 1);
      });

      rawData = projects.map((p) => ({
        name: p.name,
        description: p.description || "",
        status: p.status,
        created_at: p.created_at,
        tasks_count: taskCountMap.get(p.id) || 0,
      }));

      csvHeader = "Project Name,Description,Status,Created At,Tasks Count\n";
      contentStringForHash = JSON.stringify(rawData);
      filename += ".csv";
    } else if (type === "tasks") {
      const [tasksRes, projectsRes, sprintsRes, membershipsRes] = await Promise.all([
        insforge.database
          .from("tasks")
          .select("id, title, description, status, priority, due_date, estimated_hours, created_at, project_id, assignee_id, sprint_id")
          .eq("organization_id", orgId)
          .order("created_at", { ascending: false }),
        insforge.database.from("projects").select("id, name").eq("organization_id", orgId),
        insforge.database.from("sprints").select("id, name").eq("organization_id", orgId),
        insforge.database
          .from("memberships")
          .select("user_id, profiles(full_name, email)")
          .eq("organization_id", orgId),
      ]);

      if (tasksRes.error) {
        logger.error({ error: tasksRes.error }, "Error fetching tasks for export");
        return { success: false, error: "Failed to fetch tasks data" };
      }

      const tasks = tasksRes.data || [];
      const projects = projectsRes.data || [];
      const sprints = sprintsRes.data || [];
      const memberships = membershipsRes.data || [];

      const projectMap = new Map(projects.map((p) => [p.id, p.name]));
      const sprintMap = new Map(sprints.map((s) => [s.id, s.name]));

      interface RawMembership {
        user_id: string;
        profiles: { full_name: string | null; email: string }[] | null;
      }
      const memberMap = new Map<string, { name: string; email: string }>();
      (memberships as unknown as RawMembership[]).forEach((m) => {
        const profile = m.profiles && m.profiles.length > 0 ? m.profiles[0] : null;
        if (profile) {
          memberMap.set(m.user_id, {
            name: profile.full_name || "Unknown Member",
            email: profile.email,
          });
        }
      });

      rawData = tasks.map((t) => {
        const member = t.assignee_id ? memberMap.get(t.assignee_id) : null;
        return {
          project_name: projectMap.get(t.project_id) || "Unknown Project",
          title: t.title,
          description: t.description || "",
          status: t.status,
          priority: t.priority,
          assignee_name: member?.name || "Unassigned",
          assignee_email: member?.email || "N/A",
          due_date: t.due_date || "No due date",
          estimated_hours: t.estimated_hours ?? 8,
          sprint_name: t.sprint_id ? sprintMap.get(t.sprint_id) || "Backlog" : "Backlog",
          created_at: t.created_at,
        };
      });

      csvHeader = "Project Name,Task Title,Description,Status,Priority,Assignee Name,Assignee Email,Due Date,Estimated Hours,Sprint Name,Created At\n";
      contentStringForHash = JSON.stringify(rawData);
      filename += ".csv";
    } else if (type === "reports") {
      const reportingRes = await getReportingData(orgId);
      if (!reportingRes.success || !reportingRes.data) {
        return { success: false, error: reportingRes.error || "Failed to retrieve reporting data" };
      }

      rawData = [reportingRes.data];
      contentStringForHash = JSON.stringify(reportingRes.data);
      filename += ".csv";
    } else if (type === "audit_logs") {
      const { data: logs, error: logsError } = await insforge.database
        .from("audit_logs")
        .select(`
          id,
          action,
          entity_type,
          entity_id,
          metadata,
          created_at,
          actor_id
        `)
        .eq("organization_id", orgId)
        .order("created_at", { ascending: false });

      if (logsError) {
        logger.error({ error: logsError }, "Error fetching audit logs for export");
        return { success: false, error: "Failed to fetch audit logs" };
      }

      // Fetch actor profiles to resolve emails
      const { data: memberships } = await insforge.database
        .from("memberships")
        .select("user_id, profiles(full_name, email)")
        .eq("organization_id", orgId);

      interface RawMembership {
        user_id: string;
        profiles: { full_name: string | null; email: string }[] | null;
      }
      const actorMap = new Map<string, string>();
      (memberships as unknown as RawMembership[]).forEach((m) => {
        const profile = m.profiles && m.profiles.length > 0 ? m.profiles[0] : null;
        if (profile) {
          actorMap.set(m.user_id, profile.full_name || profile.email);
        }
      });

      rawData = (logs || []).map((log) => ({
        created_at: log.created_at,
        actor: log.actor_id ? actorMap.get(log.actor_id) || log.actor_id : "System",
        action: log.action,
        entity_type: log.entity_type,
        entity_id: log.entity_id,
        metadata: JSON.stringify(log.metadata || {}),
      }));

      csvHeader = "Time (UTC),Actor,Action,Entity Type,Entity ID,Metadata (JSON)\n";
      contentStringForHash = JSON.stringify(rawData);
      filename += ".csv";
    }

    const hash = calculateHMAC(contentStringForHash);

    if (format === "pdf") {
      // PDF is handled client-side via print layout. We return raw data + hash so client can render it.
      return { success: true, data: rawData, hash, filename: filename.replace(".csv", ".pdf") };
    }

    let stringResult = "";

    if (format === "csv") {
      stringResult += csvHeader;
      if (type === "projects") {
        (rawData as ProjectExportRow[]).forEach((p) => {
          stringResult += `"${p.name.replace(/"/g, '""')}","${p.description.replace(/"/g, '""')}","${p.status}","${p.created_at}",${p.tasks_count}\n`;
        });
      } else if (type === "tasks") {
        (rawData as TaskExportRow[]).forEach((t) => {
          stringResult += `"${t.project_name.replace(/"/g, '""')}","${t.title.replace(/"/g, '""')}","${t.description.replace(/"/g, '""')}","${t.status}","${t.priority}","${t.assignee_name.replace(/"/g, '""')}","${t.assignee_email}","${t.due_date}",${t.estimated_hours},"${t.sprint_name.replace(/"/g, '""')}","${t.created_at}"\n`;
        });
      } else if (type === "reports") {
        const { productivity, projectHealth, workload } = rawData[0] as {
          productivity: ProductivityItem[];
          projectHealth: ProjectHealthItem[];
          workload: WorkloadItem[];
        };
        stringResult += "\n--- TEAM PRODUCTIVITY ---\nMember,Completed Tasks\n";
        productivity.forEach((p: ProductivityItem) => {
          stringResult += `"${p.name.replace(/"/g, '""')}",${p.completedCount}\n`;
        });
        stringResult += "\n--- PROJECT HEALTH ---\nProject Name,Health Score,Status,Risk Factors\n";
        projectHealth.forEach((ph: ProjectHealthItem) => {
          stringResult += `"${ph.name.replace(/"/g, '""')}",${ph.score}%,${ph.status},"${ph.riskFactors.join("; ").replace(/"/g, '""')}"\n`;
        });
        stringResult += "\n--- TEAM CAPACITY ---\nMember,Active Tasks,Overdue Tasks,Estimated Hours,Utilization (%)\n";
        workload.forEach((w: WorkloadItem) => {
          stringResult += `"${w.name.replace(/"/g, '""')}",${w.totalTasks},${w.overdueTasks},${w.totalEstimatedHours},${w.capacityUtilization}%\n`;
        });
      } else if (type === "audit_logs") {
        (rawData as AuditLogExportRow[]).forEach((log) => {
          stringResult += `"${log.created_at}","${log.actor.replace(/"/g, '""')}","${log.action}","${log.entity_type}","${log.entity_id}","${log.metadata.replace(/"/g, '""')}"\n`;
        });
        // Append Integrity Hash to the bottom of the CSV to guarantee tamper-proof audit trails!
        stringResult += `\nINTEGRITY_VERIFICATION_HASH,${hash}\n`;
      }
    } else if (format === "excel") {
      filename = filename.replace(".csv", ".xls");
      let tableRows = "";

      if (type === "projects") {
        tableRows += `<tr><th>Project Name</th><th>Description</th><th>Status</th><th>Created At</th><th>Tasks Count</th></tr>`;
        (rawData as ProjectExportRow[]).forEach((p) => {
          tableRows += `<tr><td>${p.name}</td><td>${p.description}</td><td>${p.status}</td><td>${p.created_at}</td><td>${p.tasks_count}</td></tr>`;
        });
      } else if (type === "tasks") {
        tableRows += `<tr><th>Project Name</th><th>Task Title</th><th>Description</th><th>Status</th><th>Priority</th><th>Assignee Name</th><th>Assignee Email</th><th>Due Date</th><th>Estimated Hours</th><th>Sprint Name</th><th>Created At</th></tr>`;
        (rawData as TaskExportRow[]).forEach((t) => {
          tableRows += `<tr><td>${t.project_name}</td><td>${t.title}</td><td>${t.description}</td><td>${t.status}</td><td>${t.priority}</td><td>${t.assignee_name}</td><td>${t.assignee_email}</td><td>${t.due_date}</td><td>${t.estimated_hours}</td><td>${t.sprint_name}</td><td>${t.created_at}</td></tr>`;
        });
      } else if (type === "reports") {
        const { productivity, projectHealth, workload } = rawData[0] as {
          productivity: ProductivityItem[];
          projectHealth: ProjectHealthItem[];
          workload: WorkloadItem[];
        };
        tableRows += `<tr><th colspan="5" style="background:#FAF2A3;font-size:16px;">TEAM PRODUCTIVITY</th></tr>`;
        tableRows += `<tr><th>Member</th><th colspan="4">Completed Tasks</th></tr>`;
        productivity.forEach((p: ProductivityItem) => {
          tableRows += `<tr><td>${p.name}</td><td colspan="4">${p.completedCount}</td></tr>`;
        });
        tableRows += `<tr><td colspan="5"></td></tr>`;
        tableRows += `<tr><th colspan="5" style="background:#FAF2A3;font-size:16px;">PROJECT HEALTH</th></tr>`;
        tableRows += `<tr><th>Project Name</th><th>Health Score</th><th>Status</th><th colspan="2">Risk Factors</th></tr>`;
        projectHealth.forEach((ph: ProjectHealthItem) => {
          tableRows += `<tr><td>${ph.name}</td><td>${ph.score}%</td><td>${ph.status}</td><td colspan="2">${ph.riskFactors.join("; ")}</td></tr>`;
        });
        tableRows += `<tr><td colspan="5"></td></tr>`;
        tableRows += `<tr><th colspan="5" style="background:#FAF2A3;font-size:16px;">TEAM CAPACITY</th></tr>`;
        tableRows += `<tr><th>Member</th><th>Active Tasks</th><th>Overdue Tasks</th><th>Estimated Hours</th><th>Utilization (%)</th></tr>`;
        workload.forEach((w: WorkloadItem) => {
          tableRows += `<tr><td>${w.name}</td><td>${w.totalTasks}</td><td>${w.overdueTasks}</td><td>${w.totalEstimatedHours}</td><td>${w.capacityUtilization}%</td></tr>`;
        });
      } else if (type === "audit_logs") {
        tableRows += `<tr><th>Time (UTC)</th><th>Actor</th><th>Action</th><th>Entity Type</th><th>Entity ID</th><th>Metadata (JSON)</th></tr>`;
        (rawData as AuditLogExportRow[]).forEach((log) => {
          tableRows += `<tr><td>${log.created_at}</td><td>${log.actor}</td><td>${log.action}</td><td>${log.entity_type}</td><td>${log.entity_id}</td><td>${log.metadata}</td></tr>`;
        });
        // Append Integrity Hash row to the spreadsheet!
        tableRows += `<tr><td colspan="6"></td></tr>`;
        tableRows += `<tr><th colspan="2" style="background:#FFC0CB;">INTEGRITY VERIFICATION SIGNATURE</th><td colspan="4" style="font-family:monospace;font-weight:bold;">${hash}</td></tr>`;
      }

      stringResult = `
        <html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:x="urn:schemas-microsoft-com:office:excel" xmlns="http://www.w3.org/TR/REC-html40">
        <head>
          <meta charset="utf-8" />
          <!--[if gte mso 9]>
          <xml>
            <x:ExcelWorkbook>
              <x:ExcelWorksheets>
                <x:ExcelWorksheet>
                  <x:Name>${type.replace("_", " ").toUpperCase()}</x:Name>
                  <x:WorksheetOptions>
                    <x:DisplayGridlines/>
                  </x:WorksheetOptions>
                </x:ExcelWorksheet>
              </x:ExcelWorksheets>
            </x:ExcelWorkbook>
          </xml>
          <![endif]-->
          <style>
            table { border-collapse: collapse; }
            th { border: 2px solid #000000; padding: 6px; font-weight: bold; background: #E5E5E5; }
            td { border: 1px solid #CCCCCC; padding: 6px; }
          </style>
        </head>
        <body>
          <h2>ProjectForge ${type.replace("_", " ").toUpperCase()} Export</h2>
          <p>Exported: ${new Date().toISOString()}</p>
          <table>
            ${tableRows}
          </table>
        </body>
        </html>
      `;
    }

    return { success: true, data: stringResult, hash, filename };
  } catch (err) {
    logger.error({ error: err, orgId, type, format }, "Unexpected error in exportDataAction");
    Sentry.captureException(err);
    return { success: false, error: "An unexpected error occurred during export" };
  } finally {
    flushLogsAfterResponse();
  }
}
