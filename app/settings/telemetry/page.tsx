"use client";

import React, { useState } from "react";
import { useUser } from "@clerk/nextjs";
import { useQuery } from "@tanstack/react-query";
import {
  Activity,
  CheckCircle2,
  XCircle,
  Play,
  Send,
  RefreshCw,
  AlertTriangle,
  Server,
  Network
} from "lucide-react";

import { useOrgStore } from "@/store/orgStore";
import { Sidebar } from "@/components/layout/Sidebar";
import { OrgSwitcher } from "@/components/orgs/OrgSwitcher";
import { Navbar } from "@/components/layout/Navbar";
import { 
  publishEvent, 
  processEventQueue, 
  getEventQueueLogs 
} from "@/actions/eventBus";
import { useTranslation } from "@/lib/i18n/useTranslation";

type GatewayRequestLog = {
  id: string;
  timestamp: string;
  method: string;
  path: string;
  service: string;
  action: string;
  latency: string;
  status: number;
  traceId: string;
  success: boolean;
};

export default function TelemetryPage() {
  const { user, isLoaded } = useUser();
  const { activeOrgId } = useOrgStore();
  const { t } = useTranslation();


  const [simulating, setSimulating] = useState(false);
  const [simulationProgress, setSimulationProgress] = useState(0);
  const [gatewayLogs, setGatewayLogs] = useState<GatewayRequestLog[]>([]);
  const [publishing, setPublishing] = useState<string | null>(null);
  const [processing, setProcessing] = useState(false);
  const [simulationStats, setSimulationStats] = useState<{
    total: number;
    success: number;
    failed: number;
    avgLatency: number;
  } | null>(null);

  // Fetch Event Queue Logs
  const { data: eventLogs = [], refetch: refetchEventLogs, isLoading: loadingEvents } = useQuery({
    queryKey: ["eventQueueLogs", activeOrgId],
    queryFn: async () => {
      const res = await getEventQueueLogs();
      return res.success ? res.data : [];
    },
    enabled: !!activeOrgId,
  });

  const triggerLoadTest = async () => {
    if (simulating) return;
    setSimulating(true);
    setSimulationProgress(0);
    setSimulationStats(null);

    const endpoints = [
      { path: "auth/login", service: "auth", action: "login" },
      { path: "orgs/fetch", service: "orgs", action: "fetch" },
      { path: "projects/list", service: "projects", action: "list" },
      { path: "workflows/status", service: "workflows", action: "status" },
      { path: "gateway/default", service: "gateway", action: "default" }
    ];

    const logs: GatewayRequestLog[] = [];
    const totalRequests = 55;
    let completedRequests = 0;
    let successCount = 0;
    let failedCount = 0;
    let totalLatencySum = 0;

    // Run batches to avoid overloading the browser
    const batchSize = 10;
    const requestPromises: (() => Promise<void>)[] = Array.from({ length: totalRequests }).map((_, index) => {
      return async () => {
        const endpoint = endpoints[index % endpoints.length];
        const isErrorRequest = index > 0 && index % 12 === 0; // Simulate intermittent 500 error for some requests
        const method = index % 3 === 0 ? "POST" : "GET";
        const url = isErrorRequest 
          ? `/api/gateway/error-simulated/fail`
          : `/api/gateway/${endpoint.path}`;

        try {
          const start = performance.now();
          const response = await fetch(url, {
            method,
            headers: {
              "Content-Type": "application/json",
            },
            body: method === "POST" ? JSON.stringify({ index }) : undefined,
          });
          const latencyMs = performance.now() - start;
          const data = await response.json();

          const logEntry: GatewayRequestLog = {
            id: crypto.randomUUID(),
            timestamp: new Date().toLocaleTimeString(),
            method,
            path: url.replace("/api/gateway/", ""),
            service: isErrorRequest ? "error-simulated" : endpoint.service,
            action: isErrorRequest ? "fail" : endpoint.action,
            latency: `${latencyMs.toFixed(1)}ms`,
            status: response.status,
            traceId: data.traceId || crypto.randomUUID(),
            success: response.ok && data.success !== false,
          };

          if (logEntry.success) {
            successCount++;
          } else {
            failedCount++;
          }
          totalLatencySum += latencyMs;

          logs.unshift(logEntry); // Add to the top of logs list
          setGatewayLogs([...logs]);
        } catch {
          failedCount++;
          const logEntry: GatewayRequestLog = {
            id: crypto.randomUUID(),
            timestamp: new Date().toLocaleTimeString(),
            method,
            path: url.replace("/api/gateway/", ""),
            service: isErrorRequest ? "error" : endpoint.service,
            action: isErrorRequest ? "fail" : endpoint.action,
            latency: "0ms",
            status: 500,
            traceId: crypto.randomUUID(),
            success: false,
          };
          logs.unshift(logEntry);
          setGatewayLogs([...logs]);
        } finally {
          completedRequests++;
          setSimulationProgress(Math.round((completedRequests / totalRequests) * 100));
        }
      };
    });

    // Execute requests concurrently in small batches
    for (let i = 0; i < requestPromises.length; i += batchSize) {
      const batch = requestPromises.slice(i, i + batchSize);
      await Promise.all(batch.map(fn => fn()));
    }

    setSimulationStats({
      total: totalRequests,
      success: successCount,
      failed: failedCount,
      avgLatency: totalRequests > 0 ? Math.round(totalLatencySum / totalRequests) : 0,
    });
    setSimulating(false);
  };

  const handlePublishEvent = async (type: "success" | "fail") => {
    if (!activeOrgId) return;
    setPublishing(type);

    try {
      let res;
      if (type === "success") {
        res = await publishEvent("task.completed", {
          id: crypto.randomUUID(),
          title: "Complete Telemetry UI Verification",
          completedBy: user?.fullName || user?.primaryEmailAddress?.emailAddress,
          timestamp: new Date().toISOString(),
        });
      } else {
        res = await publishEvent("project.created", {
          id: crypto.randomUUID(),
          title: "Simulated Broken Microservice Sync",
          shouldFail: true, // Forces failure in processor
          timestamp: new Date().toISOString(),
        });
      }

      if (res.success) {
        await refetchEventLogs();
      } else {
        alert(res.error || "Failed to publish event");
      }
    } catch {
      alert("Error publishing event");
    } finally {
      setPublishing(null);
    }
  };

  const handleProcessQueue = async () => {
    setProcessing(true);
    try {
      const res = await processEventQueue();
      if (res.success) {
        await refetchEventLogs();
      } else {
        alert(res.error || "Failed to process queue");
      }
    } catch {
      alert("Error processing event queue");
    } finally {
      setProcessing(false);
    }
  };

  if (!isLoaded) {
    return (
      <div className="min-h-screen w-full flex items-center justify-center bg-neutral-bg bg-dot-grid text-primary">
        <span className="font-cursive text-xl animate-pulse">{t("common.loading", "Loading...")}</span>
      </div>
    );
  }

  // Filter events by status
  const pendingEvents = eventLogs.filter(e => e.status === "PENDING");
  const completedEvents = eventLogs.filter(e => e.status === "COMPLETED");
  const failedEvents = eventLogs.filter(e => e.status === "FAILED"); // DLQ

  return (
    <div className="min-h-screen w-full bg-neutral-bg bg-dot-grid text-primary flex">
      <div className="hidden md:block">
        <Sidebar />
      </div>

      <div className="flex-grow flex flex-col min-h-screen overflow-x-hidden">
        {/* Navbar */}
        <Navbar />

        {/* Mobile Org Switcher */}
        <div className="md:hidden px-6 pt-4">
          <OrgSwitcher />
        </div>

        {/* Content */}
        <div className="flex-1 max-w-7xl w-full mx-auto p-6 md:p-10 flex flex-col gap-8">
          
          {/* Main Title Banner */}
          <div className="bg-white border-2 border-black rounded-sketchy shadow-flat-offset p-6 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
            <div>
              <h1 className="font-cursive text-3xl font-bold tracking-tight mb-2 flex items-center gap-2">
                <Network className="h-8 w-8 text-tertiary" />
                {t("telemetry.title", "Distributed Telemetry & Visualizer")}
              </h1>
              <p className="font-sans text-sm text-secondary">
                {t("telemetry.desc", "Inspect API Gateway routing metrics, run concurrent load tests, and monitor transactional event bus queues.")}
              </p>
            </div>
            
            <button
              onClick={triggerLoadTest}
              disabled={simulating}
              className="flex items-center gap-2 bg-tertiary hover:bg-tertiary-hover text-white border-2 border-black font-sans text-sm font-bold px-6 py-3 rounded-full shadow-flat-offset-sm active:translate-y-0.5 hover:-translate-y-0.5 transition-all cursor-pointer disabled:opacity-40 disabled:pointer-events-none"
            >
              <Play className="h-4 w-4" />
              {simulating ? `Simulating (${simulationProgress}%)` : "Simulate Load Test"}
            </button>
          </div>

          {/* Grid Layout: Left Load Test logs, Right Event Queue */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-start">
            
            {/* Left Column: API Gateway and Tracing Logs */}
            <div className="flex flex-col gap-6">
              
              {/* Simulation Stats Widget */}
              {simulationStats && (
                <div className="bg-white border-2 border-black rounded-sketchy p-6 shadow-flat-offset flex justify-around items-center divide-x-2 divide-black/10 rotate-[-0.5deg]">
                  <div className="text-center px-4 flex-1">
                    <span className="font-cursive text-2xl font-bold text-primary">{simulationStats.total}</span>
                    <p className="font-sans text-[10px] text-secondary font-bold uppercase">{t("telemetry.totalReq", "Total Requests")}</p>
                  </div>
                  <div className="text-center px-4 flex-1">
                    <span className="font-cursive text-2xl font-bold text-accent-green bg-accent-green/20 px-2 rounded">{simulationStats.success}</span>
                    <p className="font-sans text-[10px] text-secondary font-bold uppercase">{t("telemetry.successReq", "Success")}</p>
                  </div>
                  <div className="text-center px-4 flex-1">
                    <span className="font-cursive text-2xl font-bold text-accent-pink bg-accent-pink/20 px-2 rounded">{simulationStats.failed}</span>
                    <p className="font-sans text-[10px] text-secondary font-bold uppercase">{t("telemetry.failedReq", "Failed")}</p>
                  </div>
                  <div className="text-center px-4 flex-1">
                    <span className="font-cursive text-2xl font-bold text-tertiary">{simulationStats.avgLatency}ms</span>
                    <p className="font-sans text-[10px] text-secondary font-bold uppercase">{t("telemetry.avgLatency", "Avg Latency")}</p>
                  </div>
                </div>
              )}

              {/* API Gateway Catch-all Tracer logs */}
              <div className="bg-white border-2 border-black rounded-sketchy p-6 shadow-flat-offset flex flex-col gap-4">
                <div className="flex justify-between items-center border-b-2 border-black pb-3">
                  <h3 className="font-cursive text-xl font-bold flex items-center gap-2">
                    <Server className="h-5 w-5 text-accent-blue" />
                    {t("telemetry.gatewayTraces", "API Gateway Traces")}
                  </h3>
                  <span className="font-sans text-xs text-secondary font-bold uppercase">
                    {gatewayLogs.length} logs
                  </span>
                </div>

                {simulating && (
                  <div className="w-full bg-neutral-dot border-2 border-black rounded-full h-4 overflow-hidden relative shadow-sm">
                    <div 
                      className="bg-tertiary h-full transition-all duration-300"
                      style={{ width: `${simulationProgress}%` }}
                    />
                  </div>
                )}

                {gatewayLogs.length === 0 ? (
                  <div className="py-12 text-center border-2 border-dashed border-black/15 rounded-sketchy bg-neutral-bg/30">
                    <Activity className="h-8 w-8 text-secondary/30 mx-auto mb-2 animate-pulse" />
                    <p className="font-cursive text-lg font-bold text-secondary/60">No traffic captured yet</p>
                    <p className="font-sans text-xs text-secondary/40 mt-1">Click &quot;Simulate Load Test&quot; to launch mock service calls</p>
                  </div>
                ) : (
                  <div className="flex flex-col gap-3 max-h-[500px] overflow-y-auto pr-1">
                    {gatewayLogs.map((log) => (
                      <div 
                        key={log.id} 
                        className={`p-3 border-2 border-black rounded-sketchy-sm flex flex-col gap-2 transition-all hover:translate-x-1 ${
                          log.success ? "bg-white" : "bg-accent-pink/10"
                        }`}
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            {log.success ? (
                              <CheckCircle2 className="h-4 w-4 text-accent-green" />
                            ) : (
                              <XCircle className="h-4 w-4 text-accent-pink" />
                            )}
                            <span className="font-mono text-xs font-bold px-1.5 py-0.5 border border-black bg-neutral-bg rounded">
                              {log.method}
                            </span>
                            <span className="font-sans text-xs font-bold text-primary truncate max-w-[200px] sm:max-w-xs">
                              /{log.path}
                            </span>
                          </div>
                          <span className={`font-sans text-xs font-bold ${log.success ? "text-accent-green" : "text-accent-pink"}`}>
                            HTTP {log.status}
                          </span>
                        </div>

                        <div className="flex items-center justify-between text-[11px] text-secondary font-mono">
                          <div className="flex items-center gap-2">
                            <span>Service: <strong className="text-primary">{log.service}</strong></span>
                            <span>•</span>
                            <span>Action: <strong className="text-primary">{log.action}</strong></span>
                          </div>
                          <span className="font-bold text-primary">{log.latency}</span>
                        </div>

                        <div className="border-t border-black/5 pt-1.5 flex items-center justify-between text-[10px] text-secondary font-mono">
                          <span>Trace ID: <span className="select-all text-primary">{log.traceId}</span></span>
                          <span>{log.timestamp}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

            </div>

            {/* Right Column: Outbox Queue & DLQ Monitor */}
            <div className="flex flex-col gap-6">

              <div className="bg-white border-2 border-black rounded-sketchy p-6 shadow-flat-offset flex flex-col gap-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between border-b-2 border-black pb-3 gap-2">
                  <h3 className="font-cursive text-xl font-bold flex items-center gap-2">
                    <Activity className="h-5 w-5 text-accent-yellow" />
                    {t("telemetry.eventQueue", "Event Bus Queue")}
                  </h3>
                  <div className="flex gap-2">
                    <button
                      onClick={handleProcessQueue}
                      disabled={processing || eventLogs.length === 0}
                      className="flex items-center gap-1.5 bg-accent-yellow hover:bg-[#FFE680] text-primary border-2 border-black font-sans text-xs font-bold px-3 py-1.5 rounded-full shadow-flat-offset-xs active:translate-y-0.5 hover:-translate-y-0.5 transition-all cursor-pointer disabled:opacity-40"
                    >
                      <RefreshCw className={`h-3 w-3 ${processing ? "animate-spin" : ""}`} />
                      Process Queue
                    </button>
                  </div>
                </div>

                {/* Quick Event Publisher Actions */}
                <div className="grid grid-cols-2 gap-3 bg-neutral-bg/60 border-2 border-dashed border-black/15 p-4 rounded-sketchy rotate-[0.5deg]">
                  <button
                    onClick={() => handlePublishEvent("success")}
                    disabled={publishing !== null}
                    className="flex items-center justify-center gap-1.5 bg-white hover:bg-neutral-bg text-primary border border-black font-sans text-xs font-bold py-2 px-3 rounded shadow-flat-offset-xs active:translate-y-0.5 hover:-translate-y-0.5 transition-all cursor-pointer disabled:opacity-40"
                  >
                    <Send className="h-3 w-3 text-tertiary" />
                    Publish Success
                  </button>
                  <button
                    onClick={() => handlePublishEvent("fail")}
                    disabled={publishing !== null}
                    className="flex items-center justify-center gap-1.5 bg-accent-pink/10 hover:bg-accent-pink/20 text-accent-pink border border-black font-sans text-xs font-bold py-2 px-3 rounded shadow-flat-offset-xs active:translate-y-0.5 hover:-translate-y-0.5 transition-all cursor-pointer disabled:opacity-40"
                  >
                    <AlertTriangle className="h-3 w-3 text-accent-pink" />
                    Publish Fail (DLQ)
                  </button>
                </div>

                {/* Queue Summary Grid */}
                <div className="grid grid-cols-3 gap-3">
                  <div className="border-2 border-black rounded p-2 text-center bg-white">
                    <span className="font-cursive text-xl font-bold">{pendingEvents.length}</span>
                    <p className="font-sans text-[9px] text-secondary font-semibold uppercase">Pending</p>
                  </div>
                  <div className="border-2 border-black rounded p-2 text-center bg-white">
                    <span className="font-cursive text-xl font-bold text-accent-green">{completedEvents.length}</span>
                    <p className="font-sans text-[9px] text-secondary font-semibold uppercase">Completed</p>
                  </div>
                  <div className="border-2 border-black rounded p-2 text-center bg-white">
                    <span className="font-cursive text-xl font-bold text-accent-pink">{failedEvents.length}</span>
                    <p className="font-sans text-[9px] text-secondary font-semibold uppercase">Failed (DLQ)</p>
                  </div>
                </div>

                {/* Event Logs List */}
                {loadingEvents ? (
                  <div className="py-8 text-center">
                    <RefreshCw className="h-6 w-6 text-tertiary animate-spin mx-auto" />
                  </div>
                ) : eventLogs.length === 0 ? (
                  <div className="py-8 text-center border border-black/10 rounded bg-neutral-bg/20">
                    <p className="font-cursive text-sm font-bold text-secondary/60">No Event Bus Queue Logs Available</p>
                  </div>
                ) : (
                  <div className="flex flex-col gap-2.5 max-h-[400px] overflow-y-auto pr-1">
                    {eventLogs.map((event) => {
                      const isDLQ = event.status === "FAILED";
                      const isCompleted = event.status === "COMPLETED";

                      let statusBadge = "bg-neutral-bg border border-black text-secondary";
                      if (isCompleted) statusBadge = "bg-accent-green/20 border-2 border-accent-green text-accent-green";
                      if (isDLQ) statusBadge = "bg-accent-pink/20 border-2 border-accent-pink text-accent-pink";

                      return (
                        <div 
                          key={event.id}
                          className={`p-3 border-2 border-black rounded-sketchy-sm flex flex-col gap-1.5 bg-white ${
                            isDLQ ? "border-accent-pink" : ""
                          }`}
                        >
                          <div className="flex items-center justify-between">
                            <span className="font-sans text-xs font-bold text-primary">
                              {event.event_type}
                            </span>
                            <span className={`font-sans text-[10px] font-bold px-2 py-0.5 rounded-full ${statusBadge}`}>
                              {event.status}
                            </span>
                          </div>

                          <div className="font-mono text-[10px] text-secondary bg-neutral-bg/40 p-2 border border-black/5 rounded break-all max-h-20 overflow-y-auto">
                            {JSON.stringify(event.payload)}
                          </div>

                          {event.error_log && (
                            <div className="flex items-start gap-1 bg-accent-pink/5 border border-accent-pink/20 p-2 rounded text-[10px] font-mono text-accent-pink leading-normal">
                              <AlertTriangle className="h-3 w-3 flex-shrink-0 mt-0.5" />
                              <span>
                                <strong>DLQ Error:</strong> {event.error_log}
                              </span>
                            </div>
                          )}

                          <div className="flex items-center justify-between text-[9px] text-secondary font-mono border-t border-black/5 pt-1 mt-0.5">
                            <span>Attempts: <strong className="text-primary">{event.attempts}/3</strong></span>
                            <span>{new Date(event.created_at).toLocaleString()}</span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

            </div>

          </div>

        </div>
      </div>
    </div>
  );
}
