"use client";

import React, { useState, useEffect } from "react";

interface BentoHighlightProps {
  isDarkMode: boolean;
}

export default function BentoHighlight({ isDarkMode }: BentoHighlightProps) {
  const [highlightWordIdx, setHighlightWordIdx] = useState(0);

  // Highlight Text Loop
  useEffect(() => {
    const interval = setInterval(() => {
      setHighlightWordIdx((prev) => (prev + 1) % 4);
    }, 2500);
    return () => clearInterval(interval);
  }, []);

  return (
    <div
      className={`bento-card md:col-span-1 border-2 rounded-sketchy p-8 shadow-flat-offset flex flex-col justify-between min-h-[240px] group transition-all duration-300 ${
        isDarkMode
          ? "bg-zinc-900 border-white shadow-[4px_4px_0px_0px_rgba(255,255,255,0.2)]"
          : "bg-white border-black shadow-flat-offset"
      }`}
    >
      <div>
        <span
          className={`text-xs font-mono font-bold tracking-wider uppercase px-3.5 py-1 rounded-full border transition-colors duration-300 ${
            isDarkMode
              ? "bg-zinc-800 text-zinc-300 border-white"
              : "bg-slate-100 text-slate-755 border-black"
          }`}
        >
          Review Assistant
        </span>
        <h3
          className={`font-cursive text-2xl font-bold tracking-tight mt-4 mb-2 transition-colors duration-300 ${
            isDarkMode ? "text-[#FAF9F6]" : "text-slate-900"
          }`}
        >
          Contextual Highlight
        </h3>
      </div>

      <div
        className={`p-4 rounded-none border text-xs leading-relaxed font-mono transition-all duration-300 ${
          isDarkMode
            ? "bg-zinc-800 border-white text-white shadow-[2px_2px_0px_0px_rgba(255,255,255,0.15)]"
            : "bg-[#FFF2B2] border-black/10 text-black shadow-[2px_3px_0px_rgba(0,0,0,1)]"
        }`}
      >
        <span
          className={
            highlightWordIdx === 0
              ? "bg-[#00a099] text-white px-1 rounded transition-colors duration-300 font-bold"
              : "transition-colors duration-300"
          }
        >
          Optimize database queries
        </span>{" "}
        to prevent latency. Ensure to{" "}
        <span
          className={
            highlightWordIdx === 1
              ? "bg-[#00a099] text-white px-1 rounded transition-colors duration-300 font-bold"
              : "transition-colors duration-300"
          }
        >
          use index keys
        </span>{" "}
        on active collections. Check for{" "}
        <span
          className={
            highlightWordIdx === 2
              ? "bg-[#00a099] text-white px-1 rounded transition-colors duration-300 font-bold"
              : "transition-colors duration-300"
          }
        >
          excessive nested joins
        </span>{" "}
        which block main server threads.{" "}
        <span
          className={
            highlightWordIdx === 3
              ? "bg-[#00a099] text-white px-1 rounded transition-colors duration-300 font-bold"
              : "transition-colors duration-300"
          }
        >
          Build successfully verified.
        </span>
      </div>
    </div>
  );
}
