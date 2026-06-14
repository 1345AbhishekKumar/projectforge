"use client";

import React from "react";

export interface AccordionItem {
  id: string;
  num: string;
  title: string;
  pillKeyword: string;
  bgKeyword: string;
  description: string;
  color: string;
}

interface ShowcaseAccordionItemProps {
  item: AccordionItem;
  isCurrentHovered: boolean;
  isAnyHovered: boolean;
  isDarkMode: boolean;
  onMouseEnter: () => void;
  onMouseLeave: () => void;
  onClick: () => void;
}

export default function ShowcaseAccordionItem({
  item,
  isCurrentHovered,
  isAnyHovered,
  isDarkMode,
  onMouseEnter,
  onMouseLeave,
  onClick,
}: ShowcaseAccordionItemProps) {
  // Determine width class: if hovered, expand. If someone else is hovered, shrink. Otherwise neutral split.
  let widthClass = "md:w-1/3";
  if (isAnyHovered) {
    widthClass = isCurrentHovered ? "md:w-[50%]" : "md:w-[25%]";
  }

  // In dark mode, follow BentoFeatures style: bg-zinc-900 border-white text-white shadow-[4px_4px_0px_0px_rgba(255,255,255,0.2)]
  const cardBgClass = isDarkMode
    ? "bg-zinc-900 border-white text-white shadow-[4px_4px_0px_0px_rgba(255,255,255,0.2)]"
    : `${item.color} border-black text-black shadow-flat-offset`;

  return (
    <div
      className={`relative overflow-hidden rounded-sketchy border-2 flex flex-col justify-between p-8 transition-[width,background-color,border-color,box-shadow] duration-500 ease-[cubic-bezier(0.23,1,0.32,1)] showcase-reveal cursor-pointer group min-h-[360px] md:min-h-0 ${cardBgClass} ${widthClass}`}
      onMouseEnter={onMouseEnter}
      onMouseLeave={onMouseLeave}
      onClick={onClick}
      role="button"
      tabIndex={0}
      aria-expanded={isCurrentHovered}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          onClick();
        }
      }}
    >
      {/* Background Image with grayscale blend filter */}
      <div className="absolute inset-0 opacity-10 dark:opacity-5 group-hover:opacity-25 dark:group-hover:opacity-15 transition-opacity duration-500 pointer-events-none">
        <div
          className="accordion-bg-img absolute inset-0 bg-cover bg-center transition-transform duration-700 ease-out"
          style={{
            backgroundImage: `url('https://picsum.photos/seed/${item.bgKeyword}/800/600')`,
          }}
        />
      </div>

      {/* Header block inside panel */}
      <div className="relative z-10 flex items-start justify-between w-full">
        <span
          className={`text-sm font-mono font-bold tracking-widest transition-colors duration-300 ${
            isDarkMode ? "text-zinc-400" : "text-slate-800"
          }`}
        >
          {item.num}
        </span>

        {/* Horizontal Accordion indicator */}
        <span
          className={`text-xs font-mono font-bold uppercase tracking-wider opacity-0 group-hover:opacity-100 transition-all duration-300 ${
            isDarkMode ? "text-[#00a099]" : "text-black"
          }`}
        >
          Explore Phase &rarr;
        </span>
      </div>

      {/* Typography block */}
      <div className="relative z-10 mt-auto">
        <h3
          className={`font-cursive text-4xl font-bold tracking-tight mb-3 transition-transform duration-300 ${
            isDarkMode ? "text-[#FAF9F6]" : "text-slate-900"
          }`}
        >
          {item.title}
        </h3>

        {/* Collapsible details depending on width */}
        <div
          className={`transition-all duration-500 overflow-hidden ${
            isCurrentHovered
              ? "max-h-[150px] opacity-100 mt-2"
              : "max-h-0 md:max-h-0 opacity-0 md:opacity-0"
          }`}
        >
          <p
            className={`text-sm font-sans leading-relaxed max-w-[42ch] transition-colors duration-300 ${
              isDarkMode ? "text-zinc-400" : "text-slate-900"
            }`}
          >
            {item.description}
          </p>
        </div>

        {/* Indicator text for desktop screen sizes when collapsed */}
        <p
          className={`hidden md:block text-xs font-mono font-bold mt-1 transition-opacity duration-300 ${
            isCurrentHovered
              ? "opacity-0"
              : isDarkMode
              ? "text-zinc-500"
              : "text-slate-700"
          }`}
        >
          Hover to view details
        </p>
      </div>
    </div>
  );
}
