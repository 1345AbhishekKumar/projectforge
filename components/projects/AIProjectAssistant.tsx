"use client";

import React, { useState } from "react";
import { Sparkles, X, Loader2, RefreshCw } from "lucide-react";
import { summarizeProjectAction, detectProjectRisksAction } from "@/actions/ai";

type Props = {
  projectId: string;
  orgId: string;
};

export function AIProjectAssistant({ projectId, orgId }: Props) {
  const [isOpen, setIsOpen] = useState(false);
  const [mode, setMode] = useState<"summary" | "risks">("summary");
  const [loading, setLoading] = useState(false);
  const [content, setContent] = useState("");
  const [reasoning, setReasoning] = useState("");
  const [error, setError] = useState("");

  const handleTrigger = async (selectedMode: "summary" | "risks") => {
    setIsOpen(true);
    setMode(selectedMode);
    setLoading(true);
    setError("");
    setContent("");
    setReasoning("");

    try {
      const res = selectedMode === "summary"
        ? await summarizeProjectAction(projectId, orgId)
        : await detectProjectRisksAction(projectId, orgId);

      if (res.success) {
        setContent(res.data || "");
        setReasoning(res.reasoning || "");
      } else {
        setError(res.error || "Failed to query AI Assistant");
      }
    } catch (err) {
      setError("An unexpected error occurred.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <div className="flex items-center gap-2">
        <button
          onClick={() => handleTrigger("summary")}
          className="flex items-center gap-1.5 bg-tertiary hover:bg-tertiary-hover text-white border-2 border-black font-sans text-xs font-bold px-3 py-2 rounded-full shadow-flat-offset-sm active:translate-y-0.5 hover:-translate-y-0.5 transition-all cursor-pointer"
        >
          <Sparkles className="h-3.5 w-3.5" />
          AI Summary
        </button>

        <button
          onClick={() => handleTrigger("risks")}
          className="flex items-center gap-1.5 bg-[#FFF2B2] hover:bg-[#FFE680] text-primary border-2 border-black font-sans text-xs font-bold px-3 py-2 rounded-full shadow-flat-offset-sm active:translate-y-0.5 hover:-translate-y-0.5 transition-all cursor-pointer"
        >
          <Sparkles className="h-3.5 w-3.5 text-accent-pink" />
          AI Risks
        </button>
      </div>

      {isOpen && (
        <div
          className="fixed inset-0 bg-black/40 backdrop-blur-sm z-[100] flex items-center justify-center p-4"
          onClick={() => setIsOpen(false)}
        >
          <div
            className="bg-white border-2 border-black rounded-sketchy w-full max-w-2xl max-h-[85vh] p-6 md:p-8 relative shadow-flat-offset flex flex-col gap-4 animate-in zoom-in-95 duration-150 overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Close */}
            <button
              onClick={() => setIsOpen(false)}
              className="absolute top-4 right-4 w-8 h-8 rounded-full border-2 border-black bg-white hover:bg-neutral-bg flex items-center justify-center shadow-flat-offset-sm active:translate-y-0.5 hover:-translate-y-0.5 transition-all cursor-pointer font-bold"
            >
              <X className="h-4 w-4" />
            </button>

            <div>
              <h2 className="font-cursive text-2xl font-bold flex items-center gap-2">
                <Sparkles className="h-5 w-5 text-tertiary animate-pulse" />
                {mode === "summary" ? "AI Project Whiteboard Summary" : "AI Risk & Bottleneck Analysis"}
              </h2>
              <p className="font-sans text-xs text-secondary mt-1">
                Generated using NVIDIA GPT OSS 120B. Tracks 10 free queries per day.
              </p>
            </div>

            {/* Content Display */}
            <div className="flex-1 overflow-y-auto min-h-[250px] border-2 border-black border-dashed rounded-sketchy-sm p-4 bg-neutral-bg/30">
              {loading ? (
                <div className="h-full flex flex-col items-center justify-center gap-3 py-12">
                  <Loader2 className="h-8 w-8 animate-spin text-tertiary" />
                  <span className="font-cursive text-lg animate-pulse">Consulting the model...</span>
                </div>
              ) : error ? (
                <div className="bg-[#FFD2D2] border-2 border-black rounded-sketchy-sm p-4 text-center">
                  <p className="font-sans text-sm font-bold text-rose-800">{error}</p>
                </div>
              ) : (
                <div className="flex flex-col gap-4">
                  {reasoning && (
                    <details className="border border-black/10 rounded bg-white p-3 font-mono text-[10px] text-secondary">
                      <summary className="font-sans font-bold cursor-pointer select-none">Show AI Reasoning Process</summary>
                      <pre className="mt-2 whitespace-pre-wrap leading-relaxed">{reasoning}</pre>
                    </details>
                  )}
                  <div className="prose prose-sm font-sans text-sm leading-relaxed whitespace-pre-line text-primary">
                    {content}
                  </div>
                </div>
              )}
            </div>

            <div className="flex items-center justify-between gap-3 border-t border-black/10 pt-4">
              <button
                onClick={() => handleTrigger(mode)}
                disabled={loading}
                className="flex items-center gap-1.5 border-2 border-black px-4 py-2 rounded-full font-sans text-xs font-bold hover:bg-neutral-bg cursor-pointer shadow-flat-offset-xs active:translate-y-0.5 hover:-translate-y-0.5 transition-all disabled:opacity-50"
              >
                <RefreshCw className={`h-3.5 w-3.5 ${loading ? "animate-spin" : ""}`} />
                Regenerate
              </button>

              <button
                onClick={() => setIsOpen(false)}
                className="bg-white hover:bg-neutral-bg border-2 border-black font-sans text-xs font-bold px-5 py-2 rounded-full shadow-flat-offset-sm active:translate-y-0.5 hover:-translate-y-0.5 transition-all cursor-pointer"
              >
                Done
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
