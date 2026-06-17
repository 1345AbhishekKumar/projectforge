"use client";

import React, { useRef } from "react";
import gsap from "gsap";
import { useGSAP } from "@gsap/react";
import BentoTerminal from "./bento/BentoTerminal";
import BentoTaskQueue from "./bento/BentoTaskQueue";
import BentoHighlight from "./bento/BentoHighlight";

export default function BentoFeatures() {
  const containerRef = useRef<HTMLDivElement>(null);

  // GSAP animations for entrance and scroll triggers
  useGSAP(() => {
    // Fade in grid items sequentially on scroll
    gsap.fromTo(
      ".bento-card",
      { opacity: 0, y: 40 },
      {
        opacity: 1,
        y: 0,
        duration: 0.8,
        stagger: 0.1,
        ease: "power3.out",
        scrollTrigger: {
          trigger: containerRef.current,
          start: "top 80%",
          toggleActions: "play none none none",
        },
      }
    );
  }, { scope: containerRef });

  return (
    <section
      ref={containerRef}
      className="py-24 md:py-32 px-6 max-w-7xl mx-auto w-full border-t-2 relative z-10 transition-colors duration-300 border-black"
      id="features"
    >
      {/* Title block with generous layout and asymmetric margins */}
      <div className="mb-16 md:mb-24 flex flex-col md:flex-row md:items-end justify-between gap-8 animate-fade-in">
        <div className="max-w-3xl">
          <h2 className="font-cursive text-4xl md:text-5xl font-bold tracking-tight leading-tight text-wrap-balance mb-6 transition-colors duration-300 text-slate-900">
            A collaborative workspace that acts as your team’s shared engine.
          </h2>
          <p className="text-base font-sans leading-relaxed max-w-[60ch] transition-colors duration-300 text-slate-655">
            Ditch separate tabs for chat, tasks, and drawings. Forge brings real-time terminal
            executions, dynamic task flows, and spatial whiteboards into one coherent, hand-drawn
            environment.
          </p>
        </div>

        {/* Floating status display - design system outline & flat offset shadow */}
        <div className="flex items-center gap-3 border-2 py-2.5 px-5 rounded-full transition-all duration-300 bg-white border-black shadow-flat-offset-sm">
          <span className="relative flex h-3 w-3">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#00a099] opacity-75"></span>
            <span className="relative inline-flex rounded-full h-3 w-3 bg-[#00a099]"></span>
          </span>
          <span className="text-xs font-mono font-bold uppercase tracking-wider transition-colors duration-300 text-slate-700">
            Cluster online: 14 agents syncing
          </span>
        </div>
      </div>

      {/* Bento Grid layout with dense column/row interlocking matching the design system */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-8 grid-flow-dense">
        {/* Card 1: Command Input (col-span 2, row-span 1) */}
        <div className="bento-card md:col-span-2 border-2 rounded-sketchy p-8 md:p-10 flex flex-col justify-between overflow-hidden group min-h-[340px] transition-all duration-300 bg-white border-black shadow-flat-offset">
          <div>
            <div className="flex items-center justify-between mb-6">
              <span className="text-xs font-mono font-bold tracking-wider uppercase px-3.5 py-1 rounded-full border transition-colors duration-300 bg-black text-white border-black">
                Interactive Shell
              </span>
              <div className="flex gap-1.5">
                <span className="w-3 h-3 rounded-full bg-black"></span>
                <span className="w-3 h-3 rounded-full bg-black"></span>
                <span className="w-3 h-3 rounded-full bg-black"></span>
              </div>
            </div>
            <h3 className="font-cursive text-3xl font-bold tracking-tight mb-3 transition-colors duration-300 text-slate-900">
              Trigger pipelines directly from context
            </h3>
            <p className="text-sm max-w-[50ch] mb-6 transition-colors duration-300 text-slate-655">
              No need to leave your browser layout. Run deployments, invite users, and sync
              environments using inline CLI commands directly within your project board.
            </p>
          </div>

          <BentoTerminal />
        </div>

        {/* Card 2: Intelligent Task List (col-span 1, row-span 2) */}
        <BentoTaskQueue />

        {/* Card 3: Live Status/Metrics (col-span 1, row-span 1) */}
        <div className="bento-card md:col-span-1 border-2 rounded-sketchy p-8 shadow-flat-offset flex flex-col justify-between min-h-[240px] transition-all duration-300 bg-white border-black shadow-flat-offset">
          <div>
            <div className="flex items-center justify-between mb-4">
              <span className="text-xs font-mono font-bold tracking-wider uppercase transition-colors duration-300 text-slate-700">
                Performance Index
              </span>
              <span className="relative flex h-2.5 w-2.5">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#00a099] opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-[#00a099]"></span>
              </span>
            </div>

            <div className="font-mono text-5xl font-bold tracking-tight transition-colors duration-300 text-slate-900 tabular-nums">
              94.2%
            </div>
          </div>

          <div className="border-t-2 pt-4 mt-4 text-xs flex items-center justify-between font-mono font-bold transition-colors duration-300 border-black text-slate-655">
            <span>Weekly productivity index</span>
            <span className="text-[#00a099] flex items-center gap-0.5">
              +4.8%
              <svg
                className="w-3.5 h-3.5"
                fill="none"
                stroke="currentColor"
                strokeWidth="2.5"
                viewBox="0 0 24 24"
                aria-hidden="true"
              >
                <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 19.5l15-15m0 0H8.25m11.25 0v11.25" />
              </svg>
            </span>
          </div>
        </div>

        {/* Card 4: Contextual UI Focus (col-span 1, row-span 1) */}
        <BentoHighlight />

        {/* Card 5: Infinite Marquee Data Stream (col-span 3, row-span 1) */}
        <div className="bento-card md:col-span-3 border-2 rounded-sketchy-lg p-8 flex flex-col justify-between overflow-hidden transition-all duration-300 bg-white border-black shadow-flat-offset">
          <div className="flex items-center justify-between mb-6 animate-fade-in">
            <div>
              <h3 className="font-cursive text-3xl font-bold tracking-tight transition-colors duration-300 text-slate-900">
                Collaborative Stream
              </h3>
              <p className="text-xs transition-colors duration-300 text-slate-500">
                Live activity feed synchronized across team clusters
              </p>
            </div>
            <div className="h-3 w-3 rounded-full bg-[#00a099] animate-ping border border-black"></div>
          </div>

          {/* Marquee Wrapper */}
          <div className="relative w-full overflow-hidden py-3 select-none border-t-2 border-b-2 transition-colors duration-300 border-black">
            <div className="animate-marquee whitespace-nowrap flex gap-12 text-sm font-mono transition-colors duration-300 text-slate-800">
              <span className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-[#6366F1] border border-black"></span>
                Priya pushed 3 commits to{" "}
                <strong className="transition-colors duration-300 underline decoration-2 text-slate-955 decoration-black">
                  main
                </strong>
              </span>
              <span className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-[#00a099] border border-black"></span>
                Jordan resolved Issue{" "}
                <strong className="transition-colors duration-300 underline decoration-2 text-slate-955 decoration-black">
                  #98
                </strong>{" "}
                — callback latency
              </span>
              <span className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-amber-400 border border-black"></span>
                Devin deployed build{" "}
                <strong className="transition-colors duration-300 underline decoration-2 text-slate-955 decoration-black">
                  v1.4.2-staging
                </strong>
              </span>
              <span className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-rose-455 border border-black"></span>
                You added{" "}
                <strong className="transition-colors duration-300 underline decoration-2 text-slate-955 decoration-black">
                  BentoFeatures.tsx
                </strong>
              </span>
              <span className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-[#FF7F50] border border-black"></span>
                Jordan started a board session
              </span>

              {/* Duplicate list for infinite loop */}
              <span className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-[#6366F1] border border-black"></span>
                Priya pushed 3 commits to{" "}
                <strong className="transition-colors duration-300 underline decoration-2 text-slate-955 decoration-black">
                  main
                </strong>
              </span>
              <span className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-[#00a099] border border-black"></span>
                Jordan resolved Issue{" "}
                <strong className="transition-colors duration-300 underline decoration-2 text-slate-955 decoration-black">
                  #98
                </strong>{" "}
                — callback latency
              </span>
              <span className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-amber-400 border border-black"></span>
                Devin deployed build{" "}
                <strong className="transition-colors duration-300 underline decoration-2 text-slate-955 decoration-black">
                  v1.4.2-staging
                </strong>
              </span>
              <span className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-rose-455 border border-black"></span>
                You added{" "}
                <strong className="transition-colors duration-300 underline decoration-2 text-slate-955 decoration-black">
                  BentoFeatures.tsx
                </strong>
              </span>
              <span className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-[#FF7F50] border border-black"></span>
                Jordan started a board session
              </span>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
