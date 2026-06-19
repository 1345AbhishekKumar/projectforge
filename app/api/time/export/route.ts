import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { createInsforgeServer } from "@/lib/insforge-server";
import { verifyAdminOrOwnerRole } from "@/lib/auth-helpers";
import { logger } from "@/lib/logger";
import * as Sentry from "@sentry/nextjs";
import { z } from "zod";
import { orgIdSchema } from "@/lib/utils";

const querySchema = z.object({
  orgId: orgIdSchema,
  from: z.string().datetime().optional(),
  to: z.string().datetime().optional(),
  targetUserId: z.string().optional(),
});

function formatDuration(seconds: number | null): string {
  if (!seconds) return "0";
  return (seconds / 60).toFixed(1);
}

export async function GET(req: NextRequest) {
  try {
    const url = new URL(req.url);
    const params = Object.fromEntries(url.searchParams.entries());

    const validated = querySchema.safeParse(params);
    if (!validated.success) {
      return NextResponse.json(
        { success: false, error: validated.error.issues[0].message },
        { status: 400 }
      );
    }

    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
    }

    const insforge = createInsforgeServer(userId);

    const isAdminOrOwner = await verifyAdminOrOwnerRole(insforge, validated.data.orgId, userId);
    if (!isAdminOrOwner) {
      return NextResponse.json(
        { success: false, error: "Only admins and owners can export time reports" },
        { status: 403 }
      );
    }

    let query = insforge.database
      .from("time_entries")
      .select(`id, user_id, start_time, end_time, duration, description, tasks!inner(title, organization_id)`)
      .eq("tasks.organization_id", validated.data.orgId)
      .order("start_time", { ascending: false });

    if (validated.data.targetUserId) {
      query = query.eq("user_id", validated.data.targetUserId);
    }
    if (validated.data.from) {
      query = query.gte("start_time", validated.data.from);
    }
    if (validated.data.to) {
      query = query.lte("start_time", validated.data.to);
    }

    const { data, error } = await query;

    if (error) {
      logger.error({ error, orgId: validated.data.orgId }, "Failed to export time entries");
      return NextResponse.json(
        { success: false, error: "Failed to export time entries" },
        { status: 500 }
      );
    }

    const rows = (data ?? []) as Array<Record<string, unknown>>;

    const csvLines: string[] = [
      "Task ID,Task Title,User ID,Start Time,End Time,Duration (mins)",
      ...rows.map((row) => {
        const taskTitle = ((row.tasks as Record<string, unknown>)?.title as string) ?? "";
        const cols = [
          row.task_id as string,
          `"${taskTitle.replace(/"/g, '""')}"`,
          row.user_id as string,
          row.start_time as string,
          row.end_time ? (row.end_time as string) : "",
          formatDuration(row.duration as number | null),
        ];
        return cols.join(",");
      }),
    ];

    const csv = csvLines.join("\n");

    return new NextResponse(csv, {
      status: 200,
      headers: {
        "Content-Type": "text/csv",
        "Content-Disposition": `attachment; filename="time-report-${validated.data.orgId}.csv"`,
      },
    });
  } catch (err) {
    logger.error({ error: err }, "Unexpected error in time export route");
    Sentry.captureException(err);
    return NextResponse.json({ success: false, error: "Internal server error" }, { status: 500 });
  }
}
