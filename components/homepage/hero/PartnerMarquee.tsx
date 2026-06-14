"use client";

import React from "react";

interface PartnerMarqueeProps {
  isDarkMode: boolean;
}

export default function PartnerMarquee({ isDarkMode }: PartnerMarqueeProps) {
  return (
    <div className="hero-subtext opacity-0 mt-12 w-full pt-8 border-t border-primary/10 flex flex-col items-center lg:items-start gap-4 overflow-hidden">
      <span
        className={`text-xs uppercase tracking-[0.15em] font-semibold ${
          isDarkMode ? "text-[#FAF9F6]/40" : "text-secondary/60"
        }`}
      >
        TRUSTED BY DYNAMIC CREATIVE TEAMS
      </span>

      {/* Infinite Marquee Wrapper */}
      <div
        className="w-full overflow-hidden relative"
        style={{
          maskImage: "linear-gradient(to right, transparent, black 15%, black 85%, transparent)",
        }}
      >
        <div
          className={`animate-marquee flex gap-16 py-2 ${
            isDarkMode ? "text-[#FAF9F6]/30" : "text-secondary/40"
          }`}
        >
          {/* Marquee loop group 1 */}
          <div className="flex items-center gap-16 text-sm font-bold font-cursive whitespace-nowrap">
            <span>▲ STARK IND.</span>
            <span>● PIED PIPER</span>
            <span>■ WEBYL CORP</span>
            <span>◆ TYRELL GROUP</span>
            <span>▼ ACME CORP</span>
            <span>● WAYNE ENT</span>
          </div>
          {/* Marquee loop group 2 (duplicate for seamless wrap) */}
          <div
            className="flex items-center gap-16 text-sm font-bold font-cursive whitespace-nowrap"
            aria-hidden="true"
          >
            <span>▲ STARK IND.</span>
            <span>● PIED PIPER</span>
            <span>■ WEBYL CORP</span>
            <span>◆ TYRELL GROUP</span>
            <span>▼ ACME CORP</span>
            <span>● WAYNE ENT</span>
          </div>
        </div>
      </div>
    </div>
  );
}
