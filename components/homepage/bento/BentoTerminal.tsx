"use client";

import React, { useState, useEffect } from "react";

const COMMAND_TEMPLATES = [
  "projectforge setup-pipeline --env staging",
  "projectforge invite --team core-eng --role lead",
  "projectforge audit-security --scope auth-flow",
];

export default function BentoTerminal() {
  const [commandText, setCommandText] = useState("");
  const [commandIndex, setCommandIndex] = useState(0);
  const [isTyping, setIsTyping] = useState(true);
  const [showShimmer, setShowShimmer] = useState(false);

  // Typewriter Loop
  useEffect(() => {
    let timer: NodeJS.Timeout;
    const currentFullStr = COMMAND_TEMPLATES[commandIndex];

    if (isTyping) {
      if (commandText.length < currentFullStr.length) {
        timer = setTimeout(() => {
          setCommandText(currentFullStr.substring(0, commandText.length + 1));
        }, 65);
      } else {
        timer = setTimeout(() => {
          setIsTyping(false);
          setShowShimmer(true);
          setTimeout(() => {
            setShowShimmer(false);
            setCommandText("");
            setCommandIndex((prev) => (prev + 1) % COMMAND_TEMPLATES.length);
            setIsTyping(true);
          }, 2000);
        }, 1500);
      }
    }

    return () => clearTimeout(timer);
  }, [commandText, isTyping, commandIndex]);

  return (
    <div
      className="bg-black text-zinc-100 rounded-lg p-5 border-2 transition-[border-color,background-color] duration-300 font-mono text-sm overflow-hidden relative border-black"
    >
      <div className="flex items-center gap-2 text-zinc-500 mb-3 border-b border-zinc-800 pb-2">
        <span className="text-xs">projectforge-cli</span>
      </div>

      <div className="flex items-center gap-1.5">
        <span className="text-tertiary">$</span>
        <span className="min-h-[20px] inline-block">{commandText}</span>
        <span className="animate-pulse w-1.5 h-4 bg-tertiary inline-block align-middle"></span>
      </div>

      {/* Shimmering Processing Bar */}
      {showShimmer && (
        <div className="mt-4 space-y-2.5">
          <div className="flex items-center justify-between text-xs text-zinc-400">
            <span>Running pipeline…</span>
            <span className="text-tertiary">92%</span>
          </div>
          <div className="h-2 w-full bg-zinc-900 border border-zinc-800 rounded-full overflow-hidden relative">
            <div className="absolute top-0 left-0 h-full w-[92%] bg-tertiary rounded-full animate-pulse"></div>
          </div>
        </div>
      )}
    </div>
  );
}
