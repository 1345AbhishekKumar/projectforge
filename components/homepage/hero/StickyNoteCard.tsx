"use client";

import React from "react";

export interface StickyNote {
  id: number;
  text: string;
  color: string;
  x: number; // percentage width
  y: number; // percentage height
  rotate: number; // degrees rotation
  status: "todo" | "doing" | "done";
  author: string;
}

interface StickyNoteCardProps {
  sticky: StickyNote;
  draggedId: number | null;
  editingId: number | null;
  isDarkMode: boolean;
  onPointerDown: (e: React.PointerEvent<HTMLDivElement>) => void;
  onPointerMove: (e: React.PointerEvent<HTMLDivElement>) => void;
  onPointerUp: (e: React.PointerEvent<HTMLDivElement>) => void;
  onDoubleClick: () => void;
  onTextChange: (text: string) => void;
  onBlur: () => void;
  onKeyDown: (e: React.KeyboardEvent<HTMLTextAreaElement>) => void;
}

export default function StickyNoteCard({
  sticky,
  draggedId,
  editingId,
  isDarkMode,
  onPointerDown,
  onPointerMove,
  onPointerUp,
  onDoubleClick,
  onTextChange,
  onBlur,
  onKeyDown,
}: StickyNoteCardProps) {
  const isDragged = draggedId === sticky.id;
  const isEditing = editingId === sticky.id;

  return (
    <div
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerUp}
      onDoubleClick={onDoubleClick}
      style={{
        left: `${sticky.x}%`,
        top: `${sticky.y}%`,
        transform: isDragged ? undefined : `rotate(${sticky.rotate}deg)`,
        touchAction: "none",
      }}
      className={`sticky-note-element sticky-note-${sticky.id} absolute p-3 w-[120px] sm:w-[135px] border-2 border-primary ${
        sticky.color
      } ${
        isDragged
          ? "z-dropdown cursor-grabbing shadow-lg"
          : isDarkMode
          ? "z-raised cursor-grab shadow-[2px_2px_0px_0px_rgba(255,255,255,0.15)]"
          : "z-raised cursor-grab shadow-flat-offset-sm hover:scale-105 hover:rotate-0"
      } transition-all duration-200 select-none`}
    >
      {/* Sticky Header with Author Name */}
      <div className="flex items-center justify-between border-b border-primary/20 pb-1 mb-1.5 text-[8px] sm:text-[10px] font-sans font-bold text-secondary">
        <span>@{sticky.author}</span>
        <span className="w-1.5 h-1.5 rounded-full bg-primary/25"></span>
      </div>

      {/* Sticky Text Body (Inline Editable on Double-Click) */}
      {isEditing ? (
        <textarea
          autoFocus
          defaultValue={sticky.text}
          onBlur={onBlur}
          onKeyDown={onKeyDown}
          onChange={(e) => onTextChange(e.target.value)}
          className="w-full bg-transparent font-cursive text-sm sm:text-base text-primary focus:outline-none resize-none border-b border-primary leading-tight font-bold"
          rows={3}
        />
      ) : (
        <p className="font-cursive text-sm sm:text-base text-primary leading-tight font-bold whitespace-pre-wrap">
          {sticky.text}
        </p>
      )}

      {/* Double Click Hint Label */}
      <div className="mt-2 text-[7px] text-right font-sans font-bold text-secondary opacity-40">
        DBL CLICK TO EDIT
      </div>
    </div>
  );
}
