"use client";

import React, { useState } from "react";

interface HeroNavProps {
  isDarkMode: boolean;
  setIsDarkMode: (val: boolean) => void;
}

export default function HeroNav({ isDarkMode, setIsDarkMode }: HeroNavProps) {
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  return (
    <>
      {/* Floating Glass Pill Navigation Bar */}
      <header className="floating-nav fixed top-0 left-0 w-full z-sticky px-4 pt-6 opacity-0 pointer-events-none">
        <nav
          className={`max-w-4xl mx-auto pointer-events-auto backdrop-blur-xl border-2 px-6 py-3 flex items-center justify-between transition-all duration-300 rounded-full ${
            isDarkMode
              ? "bg-black/75 border-white text-white shadow-[4px_4px_0px_0px_rgba(255,255,255,0.15)]"
              : "bg-white/75 border-primary text-primary shadow-flat-offset"
          }`}
        >
          {/* Logo */}
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-full bg-tertiary border-2 border-primary flex items-center justify-center font-cursive text-white text-lg font-bold shadow-flat-offset-sm">
              P
            </div>
            <span
              className={`font-cursive text-2xl font-bold tracking-tight ${
                isDarkMode ? "text-white" : "text-primary"
              }`}
            >
              ProjectForge
            </span>
          </div>

          {/* Desktop Nav Links */}
          <div className="hidden md:flex items-center gap-6">
            {["Product", "Features", "Pricing", "Enterprise"].map((link) => (
              <a
                key={link}
                href={`#${link.toLowerCase()}`}
                className={`font-sans text-sm font-semibold transition-colors duration-200 relative group focus-visible:ring-2 focus-visible:ring-tertiary focus-visible:outline-none rounded px-1.5 py-0.5 ${
                  isDarkMode ? "text-white/75 hover:text-white" : "text-secondary hover:text-primary"
                }`}
              >
                {link}
                <span className="absolute bottom-[-4px] left-0 w-0 h-0.5 bg-tertiary transition-all duration-300 group-hover:w-full"></span>
              </a>
            ))}
          </div>

          {/* Action CTAs & Theme Switcher */}
          <div className="flex items-center gap-4">
            {/* Sketchy Theme Switcher Toggle */}
            <button
              onClick={() => setIsDarkMode(!isDarkMode)}
              className={`w-14 h-8 rounded-full border-2 transition-all duration-300 flex items-center px-1 cursor-pointer active:scale-95 shadow-flat-offset-sm focus-visible:ring-2 focus-visible:ring-tertiary focus-visible:outline-none ${
                isDarkMode
                  ? "bg-zinc-950 border-white shadow-[2px_2px_0px_0px_rgba(255,255,255,0.2)]"
                  : "bg-white border-primary"
              }`}
              aria-label="Toggle theme"
            >
              <div
                className={`w-5 h-5 rounded-full flex items-center justify-center transition-all duration-300 ${
                  isDarkMode
                    ? "translate-x-6 bg-white text-zinc-950"
                    : "translate-x-0 bg-primary text-white"
                }`}
              >
                {isDarkMode ? "🌙" : "☀️"}
              </div>
            </button>

            <button
              className={`hidden sm:inline-block font-sans text-sm font-semibold transition-colors duration-200 focus-visible:ring-2 focus-visible:ring-tertiary focus-visible:outline-none rounded px-1.5 py-0.5 ${
                isDarkMode ? "text-white/80 hover:text-white" : "text-secondary hover:text-primary"
              }`}
            >
              Sign In
            </button>

            {/* Primary Action */}
            <button
              className={`relative group bg-tertiary text-white border-2 font-sans text-sm font-bold px-4 py-1.5 rounded-full hover:bg-tertiary-hover active:scale-[0.97] transition-all focus-visible:ring-2 focus-visible:ring-tertiary focus-visible:outline-none cursor-pointer ${
                isDarkMode
                  ? "border-white shadow-[2px_2px_0px_0px_rgba(255,255,255,0.2)]"
                  : "border-primary shadow-flat-offset-sm"
              }`}
            >
              Try It Free
            </button>

            {/* Mobile Menu Toggle (Morphing Hamburger) */}
            <button
              onClick={() => setIsMenuOpen(!isMenuOpen)}
              className={`md:hidden flex flex-col justify-center items-center w-8 h-8 rounded-full border-2 p-1 cursor-pointer active:scale-95 focus-visible:ring-2 focus-visible:ring-tertiary focus-visible:outline-none ${
                isDarkMode ? "border-white bg-zinc-900" : "border-primary bg-white/50"
              }`}
              aria-label="Toggle Navigation"
            >
              <span
                className={`w-4 h-0.5 transition-all duration-300 ${
                  isDarkMode ? "bg-white" : "bg-primary"
                } ${isMenuOpen ? "rotate-45 translate-y-[3px]" : "mb-1"}`}
              ></span>
              <span
                className={`w-4 h-0.5 transition-all duration-300 ${
                  isDarkMode ? "bg-white" : "bg-primary"
                } ${isMenuOpen ? "-rotate-45 translate-y-[-2px]" : ""}`}
              ></span>
            </button>
          </div>
        </nav>
      </header>

      {/* Screen-Filling Mobile Glass Overlay */}
      <div
        className={`fixed inset-0 z-overlay bg-black/90 backdrop-blur-2xl flex flex-col items-center justify-center transition-all duration-500 md:hidden ${
          isMenuOpen ? "opacity-100 pointer-events-auto" : "opacity-0 pointer-events-none"
        }`}
      >
        {/* Close button inside overlay */}
        <button
          onClick={() => setIsMenuOpen(false)}
          className="absolute top-8 right-6 w-10 h-10 rounded-full border-2 border-white bg-white/10 flex items-center justify-center text-white text-xl cursor-pointer"
        >
          ✕
        </button>

        {/* Staggered Mask Reveal Links */}
        <div className="flex flex-col items-center gap-8 text-center">
          {["Product", "Features", "Pricing", "Enterprise"].map((link, idx) => (
            <a
              key={link}
              href={`#${link.toLowerCase()}`}
              onClick={() => setIsMenuOpen(false)}
              style={{ transitionDelay: `${idx * 75}ms` }}
              className={`font-cursive text-4xl text-white font-bold tracking-wider transition-all duration-500 transform ${
                isMenuOpen ? "translate-y-0 opacity-100" : "translate-y-12 opacity-0"
              }`}
            >
              {link}
            </a>
          ))}
          <div
            className={`flex flex-col gap-4 mt-8 transition-all duration-500 transform ${
              isMenuOpen ? "translate-y-0 opacity-100" : "translate-y-12 opacity-0"
            }`}
            style={{ transitionDelay: "300ms" }}
          >
            <button className="text-white/60 text-lg font-semibold hover:text-white">Sign In</button>
            <button className="bg-tertiary text-white border-2 border-white font-sans text-lg font-bold px-8 py-3 rounded-full shadow-[4px_4px_0px_0px_#ffffff]">
              Get Started Free
            </button>
          </div>
        </div>
      </div>
    </>
  );
}
