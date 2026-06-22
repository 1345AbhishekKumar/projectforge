"use client";

import Link from "next/link";

export default function Footer() {
  return (
    <footer 
      className="py-24 md:py-32 px-6 relative z-10 w-full border-t-2 transition-colors duration-300 bg-white border-black text-secondary"
      role="contentinfo"
    >
      <div className="max-w-7xl mx-auto grid grid-cols-1 md:grid-cols-12 gap-12 animate-fade-in">
        
        {/* Left Side: Brand info (col-span 5) */}
        <div className="md:col-span-5 flex flex-col justify-between gap-6">
          <div>
            <h3 className="font-cursive text-3xl font-bold tracking-tight mb-3 transition-colors duration-300 text-primary">
              ProjectForge
            </h3>
            <p className="text-sm font-sans leading-relaxed max-w-[35ch]">
              A collaborative, whiteboard-inspired work operating system for engineering teams.
            </p>
          </div>
          
          <blockquote className="text-xs italic font-sans transition-colors duration-300 text-secondary">
            &ldquo;Build together, deploy together.&rdquo;
          </blockquote>

          <div className="text-xs font-mono mt-6 md:mt-0 transition-colors duration-300 text-secondary">
            &copy;&nbsp;{new Date().getFullYear()} ProjectForge Inc. All rights reserved.
          </div>
        </div>

        {/* Right Side: Links (col-span 7) */}
        <div className="md:col-span-7 grid grid-cols-2 sm:grid-cols-3 gap-8">
          
          {/* Column 1 */}
          <div className="flex flex-col gap-4">
            <h4 className="text-xs font-mono font-bold uppercase tracking-wider transition-colors duration-300 text-secondary">
              Product
            </h4>
            <ul className="flex flex-col gap-2.5 text-sm font-bold">
              <li>
                <Link 
                  href="#features" 
                  className="transition-colors duration-150 hover:text-tertiary-hover text-secondary"
                >
                  Features
                </Link>
              </li>
              <li>
                <Link 
                  href="#how-it-works" 
                  className="transition-colors duration-150 hover:text-tertiary-hover text-secondary"
                >
                  How it works
                </Link>
              </li>
              <li>
                <Link 
                  href="#pricing" 
                  className="transition-colors duration-150 hover:text-tertiary-hover text-secondary"
                >
                  Pricing
                </Link>
              </li>
            </ul>
          </div>

          {/* Column 2 */}
          <div className="flex flex-col gap-4">
            <h4 className="text-xs font-mono font-bold uppercase tracking-wider transition-colors duration-300 text-secondary">
              Resources
            </h4>
            <ul className="flex flex-col gap-2.5 text-sm font-bold">
              <li>
                <Link 
                  href="/docs" 
                  className="transition-colors duration-150 hover:text-tertiary-hover text-secondary"
                >
                  Documentation
                </Link>
              </li>
              <li>
                <Link 
                  href="/status" 
                  className="transition-colors duration-150 hover:text-tertiary-hover text-xs flex items-center gap-1.5 text-secondary"
                >
                  System Status
                  <span className="w-1.5 h-1.5 rounded-full bg-accent-green border border-black" aria-label="Systems active badge" />
                </Link>
              </li>
              <li>
                <Link 
                  href="/glossary" 
                  className="transition-colors duration-150 hover:text-tertiary-hover text-secondary"
                >
                  Glossary
                </Link>
              </li>
            </ul>
          </div>

          {/* Column 3 */}
          <div className="flex flex-col gap-4 col-span-2 sm:col-span-1">
            <h4 className="text-xs font-mono font-bold uppercase tracking-wider transition-colors duration-300 text-secondary">
              Company
            </h4>
            <ul className="flex flex-col gap-2.5 text-sm font-bold">
              <li>
                <Link 
                  href="/about" 
                  className="transition-colors duration-150 hover:text-tertiary-hover text-secondary"
                >
                  About
                </Link>
              </li>
              <li>
                <Link 
                  href="/blog" 
                  className="transition-colors duration-150 hover:text-tertiary-hover text-secondary"
                >
                  Blog
                </Link>
              </li>
              <li>
                <Link 
                  href="/contact" 
                  className="transition-colors duration-150 hover:text-tertiary-hover text-secondary"
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
