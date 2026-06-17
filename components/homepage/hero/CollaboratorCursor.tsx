"use client";

import React from "react";

interface CollaboratorCursorProps {
  cursorRef: React.RefObject<HTMLDivElement | null>;
  name: string;
  color: string;
  bgClass: string;
}

export default function CollaboratorCursor({
  cursorRef,
  name,
  color,
  bgClass,
}: CollaboratorCursorProps) {
  return (
    <div
      ref={cursorRef}
      className="absolute z-dropdown pointer-events-none flex flex-col items-start"
    >
      {/* Pointer icon */}
      <svg width="14" height="18" viewBox="0 0 14 18" fill="none" xmlns="http://www.w3.org/2000/svg">
        <path
          d="M0 0V15.6L4.5 11.5L9.6 17.5L12.5 15.1L7.5 9.2L13.1 8L0 0Z"
          fill={color}
          stroke="black"
          strokeWidth="1.5"
          strokeLinejoin="round"
        />
      </svg>
      {/* Username pill */}
      <div
        className={`border px-1.5 py-0.5 rounded text-[8px] sm:text-[10px] font-sans font-bold text-white mt-0.5 ml-2 ${bgClass} border-primary shadow-flat-offset-sm`}
      >
        {name}
      </div>
    </div>
  );
}
