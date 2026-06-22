import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { logger } from "@/lib/logger";
import * as Sentry from "@sentry/nextjs";

export async function GET(req: NextRequest, { params }: { params: Promise<{ path?: string[] }> }) {
  return handleGatewayRequest(req, await params);
}

export async function POST(req: NextRequest, { params }: { params: Promise<{ path?: string[] }> }) {
  return handleGatewayRequest(req, await params);
}

async function handleGatewayRequest(req: NextRequest, params: { path?: string[] }) {
  const startTime = performance.now();
  const pathSegments = params.path || [];
  const service = pathSegments[0] || "gateway";
  const action = pathSegments[1] || "default";

  const { userId } = await auth();
  const traceId = crypto.randomUUID();

  logger.info({
    traceId,
    service,
    action,
    userId: userId || "anonymous",
    method: req.method,
  }, "API Gateway received request");

  try {
    // Simulate slight backend latency
    await new Promise((resolve) => setTimeout(resolve, Math.random() * 40 + 10));

    let responseData: unknown = {};

    switch (service) {
      case "auth":
        responseData = {
          message: `AuthService successfully processed ${action}`,
          userId: userId || "anonymous",
          authenticated: !!userId,
        };
        break;
      case "orgs":
        responseData = {
          message: `OrgService successfully processed ${action}`,
          organizationId: crypto.randomUUID(),
          slug: "acme-corp",
          name: "Acme Corporation",
        };
        break;
      case "projects":
        responseData = {
          message: `ProjectService successfully processed ${action}`,
          projects: [
            { id: crypto.randomUUID(), name: "Website Launch", status: "ACTIVE" },
            { id: crypto.randomUUID(), name: "Mobile App Development", status: "PLANNING" },
          ],
        };
        break;
      case "workflows":
        responseData = {
          message: `WorkflowService successfully processed ${action}`,
          workflowsCount: 12,
          enabled: true,
        };
        break;
      default:
        responseData = {
          message: "API Gateway Default Handler",
          path: pathSegments.join("/"),
        };
    }

    const latency = `${(performance.now() - startTime).toFixed(1)}ms`;

    logger.info({
      traceId,
      service,
      action,
      latency,
      status: 200,
    }, "API Gateway request processed successfully");

    return NextResponse.json({
      success: true,
      service: `${service.charAt(0).toUpperCase()}${service.slice(1)}Service`,
      action,
      latency,
      traceId,
      data: responseData,
    });
  } catch (error) {
    const latency = `${(performance.now() - startTime).toFixed(1)}ms`;
    logger.error({
      traceId,
      service,
      action,
      error,
      latency,
      status: 500,
    }, "API Gateway encountered error");

    Sentry.captureException(error);

    return NextResponse.json(
      {
        success: false,
        error: "Gateway failed to route request",
        latency,
        traceId,
      },
      { status: 500 }
    );
  }
}
