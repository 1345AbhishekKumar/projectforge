"use client";

import React from "react";

interface PricingCardProps {
  onDeploy: () => void;
}

export default function PricingCard({ onDeploy }: PricingCardProps) {
  return (
    <div className="md:col-span-5 cta-reveal">
      <div
        className="border-2 rounded-sketchy-lg p-8 md:p-10 flex flex-col justify-between min-h-[480px] transition-all duration-300 bg-[#D0E1FD] text-black border-black shadow-flat-offset"
      >
        <div>
          <div className="flex items-center justify-between mb-8">
            <div>
              <span
                className="text-xs font-mono font-bold tracking-widest uppercase transition-colors duration-300 text-slate-700"
              >
                Pricing Tier
              </span>
              <h3 className="font-cursive text-3xl font-bold tracking-tight mt-1">Pro Cluster</h3>
            </div>

            {/* Visual Accent Badge */}
            <span
              className="text-[10px] font-mono font-bold px-2.5 py-1 rounded-full border transition-all duration-300 bg-white text-black border-black shadow-flat-offset-sm"
            >
              Popular
            </span>
          </div>

          {/* Pricing Math */}
          <div className="flex items-baseline gap-1.5 mb-8">
            <span className="text-5xl font-bold tracking-tight font-mono">$19</span>
            <span
              className="text-sm font-mono transition-colors duration-300 text-slate-700"
            >
              /&nbsp;mo
            </span>
          </div>

          {/* Features List */}
          <ul className="space-y-4 mb-10 text-sm font-bold">
            <li className="flex items-start gap-3">
              <svg
                className="w-4 h-4 mt-0.5 flex-shrink-0 text-slate-900"
                fill="none"
                stroke="currentColor"
                strokeWidth="3"
                viewBox="0 0 24 24"
                aria-hidden="true"
              >
                <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
              </svg>
              <span>Up to 15 active workspace boards</span>
            </li>
            <li className="flex items-start gap-3">
              <svg
                className="w-4 h-4 mt-0.5 flex-shrink-0 text-slate-900"
                fill="none"
                stroke="currentColor"
                strokeWidth="3"
                viewBox="0 0 24 24"
                aria-hidden="true"
              >
                <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
              </svg>
              <span>GSAP-puppet timeline automation</span>
            </li>
            <li className="flex items-start gap-3">
              <svg
                className="w-4 h-4 mt-0.5 flex-shrink-0 text-slate-900"
                fill="none"
                stroke="currentColor"
                strokeWidth="3"
                viewBox="0 0 24 24"
                aria-hidden="true"
              >
                <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
              </svg>
              <span>Infinite shell pipeline commands</span>
            </li>
            <li className="flex items-start gap-3">
              <svg
                className="w-4 h-4 mt-0.5 flex-shrink-0 text-slate-900"
                fill="none"
                stroke="currentColor"
                strokeWidth="3"
                viewBox="0 0 24 24"
                aria-hidden="true"
              >
                <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
              </svg>
              <span>Dedicated support cluster nodes</span>
            </li>
          </ul>
        </div>

        {/* Primary Action Button */}
        <button
          onClick={onDeploy}
          className="w-full py-3.5 rounded-full font-mono text-sm font-bold bg-[#00a099] border-2 hover:bg-[#008B8B] text-white transition-all duration-150 ease-out active:scale-[0.97] cursor-pointer border-black shadow-flat-offset-sm"
        >
          Deploy Pro Cluster
        </button>
      </div>
    </div>
  );
}
