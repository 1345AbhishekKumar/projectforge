"use server";

import { auth } from "@clerk/nextjs/server";
import { createInsforgeServer } from "@/lib/insforge-server";
import { verifyMembership } from "@/lib/auth-helpers";
import { logger, flushLogsAfterResponse } from "@/lib/logger";
import { orgIdSchema } from "@/lib/utils";
import * as Sentry from "@sentry/nextjs";

export async function getWorkflowAnalyticsSummary(orgId: string): Promise<{
  success: boolean;
  data: {
    totalWorkflows: number;
    activeWorkflows: number;
    runsToday: number;
    failedToday: number;
    averageRuntimeMs: number;
    successRate: number;
    slowestWorkflows: Array<{ name: string; avgDuration: number }>;
    failedActions: Array<{ type: string; count: number }>;
    mostUsedTriggers: Array<{ trigger: string; count: number }>;
    runsTimeline: Array<{ date: string; runs: number; failures: number }>;
  } | null;
  error?: string;
}> {
  const validatedOrg = orgIdSchema.safeParse(orgId);
  if (!validatedOrg.success) {
    return { success: false, error: validatedOrg.error.issues[0].message, data: null };
  }

  try {
    const { userId } = await auth();
    if (!userId) return { success: false, error: "Unauthorized", data: null };

    const insforge = createInsforgeServer(userId);

    const isMember = await verifyMembership(insforge, validatedOrg.data, userId);
    if (!isMember) {
      return { success: false, error: "Not a member of this workspace", data: null };
    }

    // 1. Fetch total & active workflows count
    const { data: workflows, error: wfError } = await insforge.database
      .from("workflows")
      .select("id, enabled, status")
      .eq("organization_id", validatedOrg.data);

    if (wfError) {
      logger.error({ wfError, orgId }, "Analytics: Failed to fetch workflows count");
      return { success: false, error: "Failed to fetch workflows", data: null };
    }

    const totalWorkflows = workflows?.length || 0;
    const activeWorkflows =
      workflows?.filter((w) => w.enabled && w.status !== "ARCHIVED").length || 0;

    // 2. Fetch runs from last 7 days
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

    const { data: executions, error: execError } = await insforge.database
      .from("workflow_executions")
      .select(
        `
        id,
        workflow_id,
        status,
        duration,
        trigger_event,
        created_at,
        workflows (
          name
        )
      `,
      )
      .eq("organization_id", validatedOrg.data)
      .gte("created_at", sevenDaysAgo.toISOString());

    if (execError) {
      logger.error({ execError, orgId }, "Analytics: Failed to fetch executions");
      return { success: false, error: "Failed to fetch runs history", data: null };
    }

    // Calculations
    const todayStr = new Date().toISOString().split("T")[0];
    let runsToday = 0;
    let failedToday = 0;
    let totalCompletedDuration = 0;
    let completedCount = 0;
    const totalRuns = executions?.length || 0;
    let totalFailures = 0;

    const slowestMap = new Map<string, { totalDuration: number; count: number; name: string }>();
    const triggerMap = new Map<string, number>();
    const timelineMap = new Map<string, { runs: number; failures: number }>();

    // Seed timeline for past 7 days
    for (let i = 6; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      const dateStr = d.toISOString().split("T")[0];
      timelineMap.set(dateStr, { runs: 0, failures: 0 });
    }

    if (executions) {
      for (const exec of executions) {
        const dateStr = new Date(exec.created_at).toISOString().split("T")[0];

        // Timeline grouping
        if (timelineMap.has(dateStr)) {
          const current = timelineMap.get(dateStr)!;
          current.runs += 1;
          if (exec.status === "FAILED") {
            current.failures += 1;
          }
        }

        // Today metrics
        if (dateStr === todayStr) {
          runsToday += 1;
          if (exec.status === "FAILED") {
            failedToday += 1;
          }
        }

        // Totals
        if (exec.status === "FAILED") {
          totalFailures += 1;
        }

        if (exec.status === "COMPLETED") {
          completedCount += 1;
          totalCompletedDuration += exec.duration || 0;
        }

        // Slowest grouping
        const workflowName = (exec.workflows as { name?: string } | null)?.name || exec.workflow_id;
        if (exec.status === "COMPLETED" && exec.duration) {
          const current = slowestMap.get(exec.workflow_id) || {
            totalDuration: 0,
            count: 0,
            name: workflowName,
          };
          current.totalDuration += exec.duration;
          current.count += 1;
          slowestMap.set(exec.workflow_id, current);
        }

        // Trigger mapping
        triggerMap.set(exec.trigger_event, (triggerMap.get(exec.trigger_event) || 0) + 1);
      }
    }

    // 3. Fetch failed actions/steps from steps table
    const { data: failedSteps } = await insforge.database
      .from("workflow_execution_steps")
      .select("action_type")
      .eq("status", "FAILED")
      .gte("started_at", sevenDaysAgo.toISOString())
      .limit(100);

    const actionFailMap = new Map<string, number>();
    if (failedSteps) {
      for (const step of failedSteps) {
        actionFailMap.set(step.action_type, (actionFailMap.get(step.action_type) || 0) + 1);
      }
    }

    // Formulate final analytics outputs
    const averageRuntimeMs =
      completedCount > 0 ? Math.round(totalCompletedDuration / completedCount) : 0;
    const successRate =
      totalRuns > 0 ? Math.round(((totalRuns - totalFailures) / totalRuns) * 100) : 100;

    const slowestWorkflows = Array.from(slowestMap.values())
      .map((item) => ({
        name: item.name,
        avgDuration: Math.round(item.totalDuration / item.count),
      }))
      .sort((a, b) => b.avgDuration - a.avgDuration)
      .slice(0, 5);

    const failedActions = Array.from(actionFailMap.entries())
      .map(([type, count]) => ({ type, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 5);

    const mostUsedTriggers = Array.from(triggerMap.entries())
      .map(([trigger, count]) => ({ trigger, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 5);

    const runsTimeline = Array.from(timelineMap.entries()).map(([date, val]) => ({
      date,
      runs: val.runs,
      failures: val.failures,
    }));

    return {
      success: true,
      data: {
        totalWorkflows,
        activeWorkflows,
        runsToday,
        failedToday,
        averageRuntimeMs,
        successRate,
        slowestWorkflows,
        failedActions,
        mostUsedTriggers,
        runsTimeline,
      },
    };
  } catch (error) {
    logger.error({ error, orgId }, "getWorkflowAnalyticsSummary unexpected error");
    Sentry.captureException(error);
    return { success: false, error: "An unexpected error occurred", data: null };
  } finally {
    flushLogsAfterResponse();
  }
}
