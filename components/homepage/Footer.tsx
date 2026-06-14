"use client";

import Link from "next/link";

/* 
<design_plan>
1. Integrating isDarkMode prop into Footer:
   - Brand Header: Cursive font, colors toggle (isDarkMode ? text-[#FAF9F6] : text-slate-900).
   - Divider: isDarkMode ? border-t-2 border-white : border-t-2 border-black.
   - Links: isDarkMode ? text-zinc-300 : text-slate-700. Hover colors stay teal.
</design_plan>
*/

interface FooterProps {
  isDarkMode: boolean;
}

export default function Footer({ isDarkMode }: FooterProps) {
  return (
    <footer 
      className={`py-16 md:py-20 px-6 relative z-10 w-full border-t-2 transition-colors duration-300 ${
        isDarkMode ? "bg-zinc-950 border-white text-zinc-400" : "bg-white border-black text-slate-650"
      }`}
      role="contentinfo"
    >
      <div className="max-w-7xl mx-auto grid grid-cols-1 md:grid-cols-12 gap-12 animate-fade-in">
        
        {/* Left Side: Brand info (col-span 5) */}
        <div className="md:col-span-5 flex flex-col justify-between gap-6">
          <div>
            <h3 className={`font-cursive text-3xl font-bold tracking-tight mb-3 transition-colors duration-300 ${
              isDarkMode ? "text-[#FAF9F6]" : "text-slate-900"
            }`}>
              ProjectForge
            </h3>
            <p className="text-sm font-sans leading-relaxed max-w-[35ch]">
              A collaborative, whiteboard-inspired work operating system for engineering teams.
            </p>
          </div>
          
          <blockquote className={`text-xs italic font-sans transition-colors duration-300 ${
            isDarkMode ? "text-zinc-500" : "text-slate-600"
          }`}>
            &ldquo;Build together, deploy together.&rdquo;
          </blockquote>

          <div className={`text-xs font-mono mt-6 md:mt-0 transition-colors duration-300 ${
            isDarkMode ? "text-zinc-650" : "text-slate-500"
          }`}>
            &copy;&nbsp;{new Date().getFullYear()} ProjectForge Inc. All rights reserved.
          </div>
        </div>

        {/* Right Side: Links (col-span 7) */}
        <div className="md:col-span-7 grid grid-cols-2 sm:grid-cols-3 gap-8">
          
          {/* Column 1 */}
          <div className="flex flex-col gap-4">
            <h4 className={`text-xs font-mono font-bold uppercase tracking-wider transition-colors duration-300 ${
              isDarkMode ? "text-zinc-400" : "text-slate-500"
            }`}>
              Product
            </h4>
            <ul className="flex flex-col gap-2.5 text-sm font-bold">
              <li>
                <Link 
                  href="#features" 
                  className={`transition-colors duration-150 hover:text-[#00a099] ${
                    isDarkMode ? "text-zinc-300" : "text-slate-700"
                  }`}
                >
                  Features
                </Link>
              </li>
              <li>
                <Link 
                  href="#how-it-works" 
                  className={`transition-colors duration-150 hover:text-[#00a099] ${
                    isDarkMode ? "text-zinc-300" : "text-slate-700"
                  }`}
                >
                  How it works
                </Link>
              </li>
              <li>
                <Link 
                  href="#pricing" 
                  className={`transition-colors duration-150 hover:text-[#00a099] ${
                    isDarkMode ? "text-zinc-300" : "text-slate-700"
                  }`}
                >
                  Pricing
                </Link>
              </li>
            </ul>
          </div>

          {/* Column 2 */}
          <div className="flex flex-col gap-4">
            <h4 className={`text-xs font-mono font-bold uppercase tracking-wider transition-colors duration-300 ${
              isDarkMode ? "text-zinc-400" : "text-slate-500"
            }`}>
              Resources
            </h4>
            <ul className="flex flex-col gap-2.5 text-sm font-bold">
              <li>
                <Link 
                  href="/docs" 
                  className={`transition-colors duration-150 hover:text-[#00a099] ${
                    isDarkMode ? "text-zinc-300" : "text-slate-700"
                  }`}
                >
                  Documentation
                </Link>
              </li>
              <li>
                <Link 
                  href="/status" 
                  className={`transition-colors duration-150 hover:text-[#00a099] text-xs flex items-center gap-1.5 ${
                    isDarkMode ? "text-zinc-300" : "text-slate-700"
                  }`}
                >
                  System Status
                  <span className={`w-1.5 h-1.5 rounded-full bg-emerald-500 border ${
                    isDarkMode ? "border-white" : "border-black"
                  }`} aria-label="Systems active badge" />
                </Link>
              </li>
              <li>
                <Link 
                  href="/glossary" 
                  className={`transition-colors duration-150 hover:text-[#00a099] ${
                    isDarkMode ? "text-zinc-300" : "text-slate-700"
                  }`}
                >
                  Glossary
                </Link>
              </li>
            </ul>
          </div>

          {/* Column 3 */}
          <div className="flex flex-col gap-4 col-span-2 sm:col-span-1">
            <h4 className={`text-xs font-mono font-bold uppercase tracking-wider transition-colors duration-300 ${
              isDarkMode ? "text-zinc-400" : "text-slate-500"
            }`}>
              Company
            </h4>
            <ul className="flex flex-col gap-2.5 text-sm font-bold">
              <li>
                <Link 
                  href="/about" 
                  className={`transition-colors duration-150 hover:text-[#00a099] ${
                    isDarkMode ? "text-zinc-300" : "text-slate-700"
                  }`}
                >
                  About
                </Link>
              </li>
              <li>
                <Link 
                  href="/blog" 
                  className={`transition-colors duration-150 hover:text-[#00a099] ${
                    isDarkMode ? "text-zinc-300" : "text-slate-700"
                  }`}
                >
                  Blog
                </Link>
              </li>
              <li>
                <Link 
                  href="/contact" 
                  className={`transition-colors duration-150 hover:text-[#00a099] ${
                    isDarkMode ? "text-zinc-300" : "text-slate-700"
                  }`}
                >
                  Contact
                </Link>
              </li>
            </ul>
          </div>

        </div>

      </div>
    </footer>
  );
}
