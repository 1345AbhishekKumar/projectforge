import { NextResponse } from "next/server";
import { logger, flushLogsAfterResponse } from "@/lib/logger";
import * as Sentry from "@sentry/nextjs";

export async function GET() {
  logger.info(
    {
      path: "/api/logs-test",
      method: "GET",
      timestamp: new Date().toISOString(),
    },
    "Logs verification endpoint triggered"
  );

  logger.warn("This is a warning log message for OpenTelemetry verification");

  try {
    throw new Error("Example log error for test validation");
  } catch (error) {
    logger.error(
      { error, context: "verification test" },
      "Logs verification caught an error"
    );
    Sentry.captureException(error);
  }

  // Ensure logs are flushed before the serverless function freezes
  flushLogsAfterResponse();

  return NextResponse.json({
    success: true,
    message: "Verification logs sent successfully",
  });
}
