import pino from "pino";
import { SeverityNumber } from "@opentelemetry/api-logs";
import { loggerProvider } from "@/instrumentation";
import { after } from "next/server";

const rawPino = pino({
  level: process.env.LOG_LEVEL || "info",
  formatters: {
    level: (label) => {
      return { level: label.toUpperCase() };
    },
  },
  timestamp: pino.stdTimeFunctions.isoTime,
  transport:
    process.env.NODE_ENV === "development"
      ? {
          target: "pino-pretty",
          options: {
            colorize: true,
          },
        }
      : undefined,
});

const otelLogger = loggerProvider.getLogger("my-nextjs-app");

const getSeverityNumber = (level: string): SeverityNumber => {
  switch (level.toLowerCase()) {
    case "trace":
      return SeverityNumber.TRACE;
    case "debug":
      return SeverityNumber.DEBUG;
    case "info":
      return SeverityNumber.INFO;
    case "warn":
      return SeverityNumber.WARN;
    case "error":
      return SeverityNumber.ERROR;
    case "fatal":
      return SeverityNumber.FATAL;
    default:
      return SeverityNumber.INFO;
  }
};

function createLogFn(level: string, rawPinoFn: pino.LogFn): pino.LogFn {
  return ((objOrMsg: unknown, msg?: string, ...args: unknown[]) => {
    // 1. Log via raw Pino (console output)
    rawPinoFn(objOrMsg as Record<string, unknown>, msg, ...args);

    // 2. Emit via OpenTelemetry
    try {
      let body = "";
      let attributes: Record<string, unknown> = {};

      if (typeof objOrMsg === "string") {
        body = objOrMsg;
        if (args && args.length > 0) {
          attributes["args"] = args;
        }
      } else if (objOrMsg && typeof objOrMsg === "object") {
        const obj = objOrMsg as Record<string, unknown>;
        body = msg || (obj["msg"] as string) || (obj["message"] as string) || "Log entry";
        attributes = { ...obj };
        if (args && args.length > 0) {
          attributes["args"] = args;
        }
        // Avoid duplicate/redundant properties in attributes
        delete attributes["msg"];
        delete attributes["message"];
      }

      const errorVal = attributes["error"];
      if (errorVal instanceof Error) {
        attributes["error.type"] = errorVal.name;
        attributes["error.message"] = errorVal.message;
        attributes["error.stack"] = errorVal.stack;
        delete attributes["error"];
      }

      otelLogger.emit({
        body,
        severityNumber: getSeverityNumber(level),
        attributes: attributes as never,
      });
    } catch {
      // Prevent logging failures from throwing exceptions in application runtime
    }
  }) as pino.LogFn;
}

// Wrap logger methods to preserve the exact same Pino logger interface
export const logger = {
  trace: createLogFn("trace", rawPino.trace.bind(rawPino)),
  debug: createLogFn("debug", rawPino.debug.bind(rawPino)),
  info: createLogFn("info", rawPino.info.bind(rawPino)),
  warn: createLogFn("warn", rawPino.warn.bind(rawPino)),
  error: createLogFn("error", rawPino.error.bind(rawPino)),
  fatal: createLogFn("fatal", rawPino.fatal.bind(rawPino)),
};

// Safe helper to invoke after() and force flush logs in Next.js Server Components, API routes or Server Actions
export function flushLogsAfterResponse() {
  try {
    after(async () => {
      await loggerProvider.forceFlush();
    });
  } catch {
    // Fail silently if called outside a Next.js request lifecycle
  }
}

