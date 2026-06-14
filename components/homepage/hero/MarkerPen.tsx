"use client";

import React, { useState, useEffect } from "react";

export default function MarkerPen() {
  // 3D Marker Pen State: 'writing', 'docked', or 'reactive'
  const [penState, setPenState] = useState<"writing" | "docked" | "reactive">("writing");

  // Trigger auto-demo sequence for the 3D Pen
  useEffect(() => {
    const timer = setTimeout(() => {
      setPenState("reactive"); // Go directly to reactive after writing sequence
    }, 5500);
    return () => clearTimeout(timer);
  }, []);

  return (
    <div className="pen-tray-container absolute top-28 left-8 z-50 pointer-events-auto">
      {/* The 3D Pen */}
      <div className={`pen-wrapper state-${penState}`} id="penWrapper">
        <svg className="marker-pen" viewBox="0 0 64 170" width="64" height="170">
          <defs>
            {/* Teal body gradient (matte plastic) */}
            <linearGradient id="bodyGrad" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor="#1A8A7D" />
              <stop offset="35%" stopColor="#2BB7A8" />
              <stop offset="70%" stopColor="#3DD4C5" />
              <stop offset="100%" stopColor="#2BB7A8" />
            </linearGradient>

            {/* Cap gradient (dark ink color) */}
            <linearGradient id="capGrad" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor="#1A1A1C" />
              <stop offset="40%" stopColor="#2B2B2E" />
              <stop offset="75%" stopColor="#3A3A3E" />
              <stop offset="100%" stopColor="#2B2B2E" />
            </linearGradient>

            {/* Highlight streak for matte plastic feel */}
            <linearGradient id="highlightGrad" x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stopColor="white" stopOpacity={0.35} />
              <stop offset="100%" stopColor="white" stopOpacity={0} />
            </linearGradient>

            {/* Tip gradient */}
            <linearGradient id="tipGrad" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor="#1A1A1C" />
              <stop offset="50%" stopColor="#2B2B2E" />
              <stop offset="100%" stopColor="#1A1A1C" />
            </linearGradient>
          </defs>

          {/* Ground shadow (soft, short) */}
          <ellipse cx="32" cy="162" rx="20" ry="5" fill="#2B2B2E" opacity="0.15" />

          {/* === CAP (top) === */}
          <rect x="14" y="10" width="36" height="42" rx="6" fill="url(#capGrad)" />
          <rect x="20" y="12" width="5" height="38" rx="2.5" fill="url(#highlightGrad)" />
          <rect x="14" y="48" width="36" height="4" rx="2" fill="#1A1A1C" opacity="0.6" />
          <path d="M 44,14 L 52,14 L 52,46 Q 52,50 48,50 L 44,50 Z" fill="#1A1A1C" />
          <path d="M 46,16 L 50,16 L 50,44 Q 50,47 47,47 L 46,47 Z" fill="#3A3A3E" opacity="0.4" />

          {/* === BODY (middle) === */}
          <rect x="16" y="52" width="32" height="90" rx="4" fill="url(#bodyGrad)" />
          <rect x="22" y="54" width="6" height="86" rx="3" fill="url(#highlightGrad)" />
          <rect x="42" y="54" width="4" height="86" rx="2" fill="#1A8A7D" opacity="0.3" />
          <rect x="16" y="52" width="32" height="3" rx="1.5" fill="#1A8A7D" opacity="0.5" />

          {/* === TIP (bottom cone) === */}
          <path d="M 18,142 L 46,142 L 32,168 Z" fill="url(#tipGrad)" />
          <path d="M 26,142 L 32,142 L 32,162 Z" fill="white" opacity="0.15" />
          <circle cx="32" cy="166" r="1.5" fill="#FAFAF9" opacity="0.4" />
        </svg>
      </div>
    </div>
  );
}
