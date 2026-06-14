"use client";

import { useRef, useState, useEffect } from "react";
import { useGSAP } from "@gsap/react";
import gsap from "gsap";
import HeroNav from "./hero/HeroNav";
import StickyNoteCard, { StickyNote } from "./hero/StickyNoteCard";
import MarkerPen from "./hero/MarkerPen";
import CollaboratorCursor from "./hero/CollaboratorCursor";
import PartnerMarquee from "./hero/PartnerMarquee";

const INITIAL_STICKIES: StickyNote[] = [
  { id: 1, text: "Draft project blueprints 🎨", color: "bg-[#FFF2B2]", x: 6, y: 26, rotate: -2, status: "todo", author: "Priya" },
  { id: 2, text: "Hook up OAuth auth webhooks", color: "bg-[#D0E1FD]", x: 6, y: 58, rotate: 1.5, status: "todo", author: "Jordan" },
  { id: 3, text: "Refactor database models ⚡", color: "bg-[#FFD2D2]", x: 39, y: 42, rotate: -1.5, status: "doing", author: "You" },
  { id: 4, text: "Install GSAP & verify motion ✨", color: "bg-[#D4EDDA]", x: 72, y: 32, rotate: 2, status: "done", author: "Priya" },
];

export default function Hero() {
  const isDarkMode = false;
  const setIsDarkMode = () => {};
  const containerRef = useRef<HTMLDivElement>(null);
  const boardRef = useRef<HTMLDivElement>(null);
  const cursorPriyaRef = useRef<HTMLDivElement>(null);
  const cursorJordanRef = useRef<HTMLDivElement>(null);
  const primaryBtnRef = useRef<HTMLButtonElement>(null);
  const secondaryBtnRef = useRef<HTMLButtonElement>(null);
  
  // Interactive Whiteboard Minimization state
  const [isBoardClosed, setIsBoardClosed] = useState(false);
  
  // Collaborative Whiteboard Mockup State
  const [stickies, setStickies] = useState<StickyNote[]>(INITIAL_STICKIES);
  
  const [editingId, setEditingId] = useState<number | null>(null);
  const [draggedId, setDraggedId] = useState<number | null>(null);
  const dragOffset = useRef({ x: 0, y: 0 });
  const lastPointerX = useRef(0);

  // Custom User Cursor coordinates and visibility
  const [userCursor, setUserCursor] = useState({ x: 0, y: 0, isVisible: false });

  // Refs for Digital Puppet Show
  const puppetTimelineRef = useRef<gsap.core.Timeline | null>(null);
  const resumeTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Digital Puppet Show timeline orchestrator
  const startPuppetShow = () => {
    if (puppetTimelineRef.current) {
      puppetTimelineRef.current.kill();
      puppetTimelineRef.current = null;
    }
    if (resumeTimeoutRef.current) {
      clearTimeout(resumeTimeoutRef.current);
      resumeTimeoutRef.current = null;
    }

    // Reset sticky note state to prevent offsets compounding
    setStickies(INITIAL_STICKIES);

    // Reset cursor visual parameters before running the timeline
    gsap.set(cursorPriyaRef.current, { left: "12%", top: "45%", scale: 1, x: 0, y: 0 });
    gsap.set(cursorJordanRef.current, { left: "80%", top: "68%", scale: 1, x: 0, y: 0 });
    gsap.set(".sticky-note-element", { clearProps: "transform,scale,rotate" });

    // Define the GSAP puppet show timeline
    const tl = gsap.timeline({
      delay: 1.5,
      onComplete: () => {
        // Wait 3.5 seconds at the end of the sequence to let the user review it
        resumeTimeoutRef.current = setTimeout(() => {
          // Animate back to initial layout smoothly before restarting the loop
          const resetTl = gsap.timeline({
            onComplete: () => {
              startPuppetShow();
            }
          });
          resetTl
            .to(".sticky-note-1", { left: "6%", top: "26%", rotate: -2, duration: 1.2, ease: "power2.inOut" }, 0)
            .to(".sticky-note-2", { left: "6%", top: "58%", rotate: 1.5, duration: 1.2, ease: "power2.inOut" }, 0)
            .to(".sticky-note-3", { left: "39%", top: "42%", rotate: -1.5, duration: 1.2, ease: "power2.inOut" }, 0)
            .to(".sticky-note-4", { left: "72%", top: "32%", rotate: 2, duration: 1.2, ease: "power2.inOut" }, 0)
            .to(cursorPriyaRef.current, { left: "12%", top: "45%", duration: 1.2, ease: "power2.inOut" }, 0)
            .to(cursorJordanRef.current, { left: "80%", top: "68%", duration: 1.2, ease: "power2.inOut" }, 0);
        }, 3500);
      }
    });

    puppetTimelineRef.current = tl;

    // scene 1: Priya moves Sticky 1 from TO DO to DOING (drops at bottom)
    tl.to(cursorPriyaRef.current, { left: "6%", top: "26%", duration: 1.2, ease: "power2.inOut" })
      .to(cursorPriyaRef.current, { scale: 0.9, duration: 0.1 })
      .to([cursorPriyaRef.current, ".sticky-note-1"], { left: "39%", top: "70%", rotate: 2, duration: 1.5, ease: "power2.inOut" })
      .to(cursorPriyaRef.current, { scale: 1, duration: 0.1 })
      .call(() => {
        setStickies(prev => prev.map(s => s.id === 1 ? { ...s, x: 39, y: 70, status: "doing", rotate: 0 } : s));
        requestAnimationFrame(() => {
          gsap.set(cursorPriyaRef.current, { clearProps: "scale" });
          gsap.set(".sticky-note-1", { clearProps: "transform,scale,rotate" });
        });
      });

    // scene 2: Jordan moves Sticky 3 from DOING to DONE (drops at bottom)
    tl.to(cursorJordanRef.current, { left: "39%", top: "42%", duration: 1.2, ease: "power2.inOut" }, "+=0.4")
      .to(cursorJordanRef.current, { scale: 0.9, duration: 0.1 })
      .to([cursorJordanRef.current, ".sticky-note-3"], { left: "72%", top: "62%", rotate: -2, duration: 1.5, ease: "power2.inOut" })
      .to(cursorJordanRef.current, { scale: 1, duration: 0.1 })
      .call(() => {
        setStickies(prev => prev.map(s => s.id === 3 ? { ...s, x: 72, y: 62, status: "done", rotate: 0 } : s));
        requestAnimationFrame(() => {
          gsap.set(cursorJordanRef.current, { clearProps: "scale" });
          gsap.set(".sticky-note-3", { clearProps: "transform,scale,rotate" });
        });
      });

    // scene 3: Priya moves Sticky 4 from DONE to TO DO (drops at top)
    tl.to(cursorPriyaRef.current, { left: "72%", top: "32%", duration: 1.2, ease: "power2.inOut" }, "+=0.4")
      .to(cursorPriyaRef.current, { scale: 0.9, duration: 0.1 })
      .to([cursorPriyaRef.current, ".sticky-note-4"], { left: "6%", top: "26%", rotate: 1.5, duration: 1.5, ease: "power2.inOut" })
      .to(cursorPriyaRef.current, { scale: 1, duration: 0.1 })
      .call(() => {
        setStickies(prev => prev.map(s => s.id === 4 ? { ...s, x: 6, y: 26, status: "todo", rotate: 0 } : s));
        requestAnimationFrame(() => {
          gsap.set(cursorPriyaRef.current, { clearProps: "scale" });
          gsap.set(".sticky-note-4", { clearProps: "transform,scale,rotate" });
        });
      });

    // scene 4: Jordan moves Sticky 2 from TO DO to DOING (drops in middle-upper)
    tl.to(cursorJordanRef.current, { left: "6%", top: "58%", duration: 1.2, ease: "power2.inOut" }, "+=0.4")
      .to(cursorJordanRef.current, { scale: 0.9, duration: 0.1 })
      .to([cursorJordanRef.current, ".sticky-note-2"], { left: "39%", top: "36%", rotate: -1.5, duration: 1.5, ease: "power2.inOut" })
      .to(cursorJordanRef.current, { scale: 1, duration: 0.1 })
      .call(() => {
        setStickies(prev => prev.map(s => s.id === 2 ? { ...s, x: 39, y: 36, status: "doing", rotate: 0 } : s));
        requestAnimationFrame(() => {
          gsap.set(cursorJordanRef.current, { clearProps: "scale" });
          gsap.set(".sticky-note-2", { clearProps: "transform,scale,rotate" });
        });
      });
  };

  // Lifecycle control for the puppet show on mount
  useEffect(() => {
    const initialDelay = setTimeout(() => {
      startPuppetShow();
    }, 2000);
    return () => {
      clearTimeout(initialDelay);
      if (puppetTimelineRef.current) puppetTimelineRef.current.kill();
      if (resumeTimeoutRef.current) clearTimeout(resumeTimeoutRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Handle Dragging Sticky Notes via Pointer Events
  const handlePointerDown = (e: React.PointerEvent<HTMLDivElement>, stickyId: number) => {
    if (editingId) return; // disable dragging while editing text
    e.preventDefault();
    setDraggedId(stickyId);

    // Stop automated puppet show immediately
    if (puppetTimelineRef.current) {
      puppetTimelineRef.current.kill();
      puppetTimelineRef.current = null;
    }
    if (resumeTimeoutRef.current) {
      clearTimeout(resumeTimeoutRef.current);
      resumeTimeoutRef.current = null;
    }
    // Smoothly return Priya & Jordan's cursors back to idle
    gsap.to(cursorPriyaRef.current, { left: "12%", top: "45%", scale: 1, duration: 0.8 });
    gsap.to(cursorJordanRef.current, { left: "80%", top: "68%", scale: 1, duration: 0.8 });
    
    const element = e.currentTarget;
    const rect = element.getBoundingClientRect();
    dragOffset.current = {
      x: e.clientX - rect.left,
      y: e.clientY - rect.top,
    };
    lastPointerX.current = e.clientX;
    element.setPointerCapture(e.pointerId);
    
    // Scale up slightly and tilt to 0 immediately on click
    gsap.to(element, {
      scale: 1.06,
      duration: 0.2,
      ease: "power2.out"
    });
  };

  const handlePointerMove = (e: React.PointerEvent<HTMLDivElement>, stickyId: number) => {
    if (draggedId !== stickyId || !boardRef.current) return;
    e.preventDefault();

    const boardRect = boardRef.current.getBoundingClientRect();
    
    // Calculate new position inside board bounds in percentages
    const xPx = e.clientX - boardRect.left - dragOffset.current.x;
    const yPx = e.clientY - boardRect.top - dragOffset.current.y;
    
    let xPercent = (xPx / boardRect.width) * 100;
    let yPercent = (yPx / boardRect.height) * 100;

    // Bounds checking (keep sticky inside the board container, preventing header overlaps)
    xPercent = Math.max(2, Math.min(xPercent, 82));
    yPercent = Math.max(25, Math.min(yPercent, 80));

    // Physics-based dynamic tilt (rotates based on dragging direction and speed)
    const dx = e.clientX - lastPointerX.current;
    lastPointerX.current = e.clientX;
    const targetRotation = Math.max(-12, Math.min(dx * 0.45, 12));

    // Update custom 'You' cursor position during drag
    setUserCursor({
      x: e.clientX - boardRect.left,
      y: e.clientY - boardRect.top,
      isVisible: true
    });

    setStickies((prev) =>
      prev.map((s) => (s.id === stickyId ? { ...s, x: xPercent, y: yPercent, rotate: targetRotation } : s))
    );
  };

  const handlePointerUp = (e: React.PointerEvent<HTMLDivElement>, stickyId: number) => {
    if (draggedId !== stickyId) return;
    setDraggedId(null);
    e.currentTarget.releasePointerCapture(e.pointerId);

    // Bounce back to original tilt curve and scale
    const defaultTilts = [0, -2, 1.5, -1.5, 2];
    const originalTilt = defaultTilts[stickyId % defaultTilts.length];
    
    gsap.to(e.currentTarget, {
      scale: 1,
      rotate: originalTilt,
      duration: 0.5,
      ease: "elastic.out(1.2, 0.5)"
    });

    setStickies((prev) =>
      prev.map((s) => {
        if (s.id === stickyId) {
          // Determine status based on s.x
          let newStatus: "todo" | "doing" | "done" = "todo";
          if (s.x >= 33 && s.x < 66) newStatus = "doing";
          else if (s.x >= 66) newStatus = "done";
          return { ...s, rotate: originalTilt, status: newStatus };
        }
        return s;
      })
    );

    // Inactivity timeout to restart the puppet show
    if (resumeTimeoutRef.current) clearTimeout(resumeTimeoutRef.current);
    resumeTimeoutRef.current = setTimeout(() => {
      startPuppetShow();
    }, 6000);
  };

  const handleDoubleClick = (id: number) => {
    setEditingId(id);
  };

  const handleTextChange = (id: number, text: string) => {
    setStickies((prev) => prev.map((s) => (s.id === id ? { ...s, text } : s)));
  };

  // GSAP Animations
  useGSAP(() => {
    if (!containerRef.current) return;

    // Set initial collaborator cursor positions dynamically to avoid React style snaps
    gsap.set(cursorPriyaRef.current, { left: "12%", top: "45%" });
    gsap.set(cursorJordanRef.current, { left: "80%", top: "68%" });

    // 1. Entrance Staggered Fades
    const tl = gsap.timeline({ defaults: { ease: "power4.out" } });

    tl.fromTo(
      ".floating-nav",
      { y: -80, opacity: 0 },
      { y: 0, opacity: 1, duration: 1.2 }
    );

    tl.fromTo(
      ".hero-eyebrow",
      { y: 20, opacity: 0 },
      { y: 0, opacity: 1, duration: 0.8 },
      "-=0.6"
    );

    tl.fromTo(
      ".hero-heading",
      { y: 30, opacity: 0 },
      { y: 0, opacity: 1, duration: 1.0 },
      "-=0.7"
    );

    tl.fromTo(
      ".hero-subtext",
      { y: 20, opacity: 0 },
      { y: 0, opacity: 1, duration: 0.8 },
      "-=0.8"
    );

    tl.fromTo(
      ".hero-ctas",
      { y: 20, opacity: 0 },
      { y: 0, opacity: 1, duration: 0.8 },
      "-=0.7"
    );

    tl.fromTo(
      ".hero-mock-board",
      { y: 40, scale: 0.95, opacity: 0 },
      { y: 0, scale: 1, opacity: 1, duration: 1.2, ease: "cubic-bezier(0.32, 0.72, 0, 1)" },
      "-=0.9"
    );

    // Dynamic spring entrance for individual sticky notes
    tl.fromTo(
      ".sticky-note-element",
      { scale: 0, opacity: 0 },
      { scale: 1, opacity: 1, duration: 0.8, stagger: 0.1, ease: "back.out(1.6)" },
      "-=0.6"
    );

    // 2. Continuous Idle Floating Animation for Sticky Notes
    gsap.to(".sticky-note-element:nth-child(odd)", {
      y: "+=6",
      duration: 3.5,
      repeat: -1,
      yoyo: true,
      ease: "sine.inOut",
    });

    gsap.to(".sticky-note-element:nth-child(even)", {
      y: "-=6",
      duration: 4,
      repeat: -1,
      yoyo: true,
      ease: "sine.inOut",
      delay: 0.5,
    });
  }, { scope: containerRef });

  // Magnetic Button Physics
  const handleButtonMouseMove = (e: React.MouseEvent<HTMLButtonElement>, btnRef: React.RefObject<HTMLButtonElement | null>) => {
    if (!btnRef.current) return;
    const btn = btnRef.current;
    const rect = btn.getBoundingClientRect();
    const x = e.clientX - rect.left - rect.width / 2;
    const y = e.clientY - rect.top - rect.height / 2;
    
    // Magnetic pull towards the cursor
    gsap.to(btn, {
      x: x * 0.2,
      y: y * 0.25,
      duration: 0.3,
      ease: "power2.out",
    });

    // Animate trailing arrow inside
    const arrow = btn.querySelector(".btn-arrow");
    if (arrow) {
      gsap.to(arrow, {
        x: x * 0.1,
        y: y * 0.1,
        scale: 1.15,
        duration: 0.3,
        ease: "power2.out",
      });
    }
  };

  const handleButtonMouseLeave = (btnRef: React.RefObject<HTMLButtonElement | null>) => {
    if (!btnRef.current) return;
    const btn = btnRef.current;
    
    // Snap back to origin
    gsap.to(btn, {
      x: 0,
      y: 0,
      duration: 0.6,
      ease: "elastic.out(1.2, 0.4)",
    });

    const arrow = btn.querySelector(".btn-arrow");
    if (arrow) {
      gsap.to(arrow, {
        x: 0,
        y: 0,
        scale: 1,
        duration: 0.6,
        ease: "elastic.out(1.2, 0.4)",
      });
    }
  };

  return (
    <div 
      ref={containerRef} 
      className={`relative w-full min-h-[100dvh] flex flex-col justify-start select-none bg-dot-grid transition-colors duration-500 overflow-x-hidden ${
        isDarkMode ? "bg-[#090C0C] text-[#FAF9F6]" : "bg-[#FAF9F6] text-primary"
      }`}
      style={{
        backgroundImage: isDarkMode 
          ? "radial-gradient(circle, rgba(255, 255, 255, 0.08) 1.5px, transparent 1.5px)" 
          : "radial-gradient(circle, var(--color-neutral-dot) 1.5px, transparent 1.5px)"
      }}
    >
      {/* Physical Paper Grain Overlay */}
      <div className="bg-grain" />
      
      <MarkerPen />
      
      <HeroNav isDarkMode={isDarkMode} setIsDarkMode={setIsDarkMode} />

      {/* Editorial Split Hero Container */}
      <main className="w-full max-w-7xl mx-auto px-6 pt-32 pb-24 md:pt-40 md:pb-32 flex-1 flex flex-col lg:flex-row items-center gap-16 lg:gap-12">
        
        {/* Left Side: Copywriting & CTAs */}
        <div className="w-full lg:w-5/12 flex flex-col items-center lg:items-start text-center lg:text-left">
          
          {/* Eyebrow Micro-Tag */}
          <div className={`hero-eyebrow opacity-0 border px-3.5 py-1.5 rounded-full text-[10px] uppercase tracking-[0.2em] font-bold shadow-flat-offset-sm mb-6 inline-block w-max ${
            isDarkMode ? "bg-zinc-900 border-white text-white shadow-[2px_2px_0px_0px_rgba(255,255,255,0.15)]" : "bg-accent-yellow border-primary text-primary"
          }`}>
            ⚡ Welcome to Workspace 2.0
          </div>
          
          {/* Headline - 2-Line Iron Rule */}
          <h1 className={`hero-heading opacity-0 font-cursive text-[3.2rem] sm:text-[4rem] md:text-[4.5rem] lg:text-[4.2rem] xl:text-[4.8rem] leading-[1.05] font-extrabold tracking-tight max-w-2xl mb-6 ${
            isDarkMode ? "text-[#FAF9F6]" : "text-primary"
          }`}>
            Work, <span className={`inline-block w-14 h-7 sm:w-16 sm:h-8 md:w-20 md:h-10 rounded-full align-middle bg-cover bg-center border-2 shadow-flat-offset-sm mx-1 cursor-pointer transform hover:scale-105 active:scale-95 transition-all ${
              isDarkMode ? "border-white shadow-[2px_2px_0px_0px_rgba(255,255,255,0.2)]" : "border-primary"
            }`} style={{ backgroundImage: "url('https://picsum.photos/seed/forge/400/200')" }}></span> together, <br />
            right now.
          </h1>
          
          {/* Subheading */}
          <p className={`hero-subtext opacity-0 font-sans text-lg md:text-xl max-w-lg mb-8 leading-relaxed ${
            isDarkMode ? "text-[#FAF9F6]/80" : "text-secondary"
          }`}>
            ProjectForge is a sketchy, whiteboard-inspired work operating system. Grab a digital sticky note, drag tasks, and coordinate sprints in real-time.
          </p>
          
          {/* CTA Buttons - Magnetic Hover & Double-Bezel Highlight */}
          <div className="hero-ctas opacity-0 flex flex-col sm:flex-row items-center gap-4 sm:gap-6 w-full sm:w-auto">
            
            {/* Primary Teal Button */}
            <button
              ref={primaryBtnRef}
              onMouseMove={(e) => handleButtonMouseMove(e, primaryBtnRef)}
              onMouseLeave={() => handleButtonMouseLeave(primaryBtnRef)}
              onClick={() => window.location.href = "/signup"}
              className={`group relative w-full sm:w-auto bg-tertiary text-white border-2 font-sans text-base font-bold px-7 py-3 rounded-full flex items-center justify-center gap-3 hover:bg-tertiary-hover active:scale-[0.97] transition-all focus-visible:ring-2 focus-visible:ring-tertiary focus-visible:outline-none cursor-pointer will-change-transform ${
                isDarkMode ? "border-white shadow-[4px_4px_0px_0px_rgba(255,255,255,0.2)]" : "border-primary shadow-flat-offset"
              }`}
            >
              Start Forging Free
              <span className="btn-arrow w-8 h-8 rounded-full bg-white/20 flex items-center justify-center text-sm font-semibold transition-transform">
                ↗
              </span>
            </button>

            {/* Secondary Outline Button */}
            <button
              ref={secondaryBtnRef}
              onMouseMove={(e) => handleButtonMouseMove(e, secondaryBtnRef)}
              onMouseLeave={() => handleButtonMouseLeave(secondaryBtnRef)}
              className={`relative w-full sm:w-auto border-2 font-sans text-base font-semibold px-6 py-3 rounded-full flex items-center justify-center active:scale-[0.97] transition-all focus-visible:ring-2 focus-visible:ring-tertiary focus-visible:outline-none cursor-pointer will-change-transform ${
                isDarkMode 
                  ? "bg-[#121212] text-white border-white shadow-[4px_4px_0px_0px_rgba(255,255,255,0.2)] hover:bg-zinc-900" 
                  : "bg-white text-primary border-primary shadow-flat-offset hover:bg-neutral-100"
              }`}
            >
              Watch Video
            </button>
          </div>

          <PartnerMarquee isDarkMode={isDarkMode} />
        </div>

        {/* Right Side: Mock Sandbox Whiteboard Board */}
        <div className="hero-mock-board opacity-0 w-full lg:w-7/12 flex justify-center transition-all duration-500">
          
          {/* Double-Bezel Nested Shell */}
          <div className={`w-full border p-2.5 rounded-[2.2rem] transition-all duration-500 ${
            isBoardClosed ? "scale-95 opacity-50" : "scale-100"
          } ${
            isDarkMode ? "bg-white/5 border-white/10" : "bg-black/5 border-primary/10"
          }`}>
            
            {/* Inner Core Content */}
            <div 
              ref={boardRef}
              onPointerMove={(e) => {
                if (!boardRef.current) return;
                const rect = boardRef.current.getBoundingClientRect();
                setUserCursor({
                  x: e.clientX - rect.left,
                  y: e.clientY - rect.top,
                  isVisible: true,
                });
              }}
              onPointerEnter={() => {
                setUserCursor((prev) => ({ ...prev, isVisible: true }));
              }}
              onPointerLeave={() => {
                setUserCursor((prev) => ({ ...prev, isVisible: false }));
              }}
              className={`w-full rounded-[calc(2.2rem-0.75rem)] border-2 bg-dot-grid relative overflow-hidden flex flex-col transition-all duration-500 custom-board-cursor ${
                isBoardClosed ? "min-h-[60px] max-h-[60px]" : "min-h-[460px] md:min-h-[500px]"
              } ${
                isDarkMode 
                  ? "border-white bg-[#121212] shadow-[4px_4px_0px_0px_rgba(255,255,255,0.15)]" 
                  : "border-primary bg-neutral-bg shadow-flat-offset"
              }`}
              style={{
                backgroundImage: isDarkMode 
                  ? "radial-gradient(circle, rgba(255, 255, 255, 0.08) 1.5px, transparent 1.5px)" 
                  : "radial-gradient(circle, var(--color-neutral-dot) 1.5px, transparent 1.5px)"
              }}
            >
              
              {/* Whiteboard Header */}
              <div className={`border-b-2 px-4 py-3 backdrop-blur-md flex items-center justify-between transition-colors duration-300 ${
                isDarkMode ? "border-white bg-black/60 text-white" : "border-primary bg-white/60 text-primary"
              }`}>
                {/* Header Dots with Hover Interactions */}
                <div className="flex items-center gap-2">
                  <button 
                    onClick={() => setIsBoardClosed(!isBoardClosed)}
                    className="w-2.5 h-2.5 rounded-full bg-red-400 border border-primary hover:scale-125 transition-transform cursor-pointer"
                    title={isBoardClosed ? "Open board" : "Minimize board"}
                  />
                  <button 
                    onClick={() => setIsBoardClosed(!isBoardClosed)}
                    className="w-2.5 h-2.5 rounded-full bg-yellow-400 border border-primary hover:scale-125 transition-transform cursor-pointer"
                  />
                  <button 
                    onClick={() => setIsBoardClosed(false)}
                    className="w-2.5 h-2.5 rounded-full bg-green-400 border border-primary hover:scale-125 transition-transform cursor-pointer"
                  />
                  <span className="font-cursive text-base font-bold ml-2">
                    ProjectForge Board {isBoardClosed && <span className="text-xs text-secondary/60 ml-2">(Minimized - Click dot to expand)</span>}
                  </span>
                </div>
                
                {/* Active Members Avatars & Counter */}
                <div className={`flex items-center gap-1.5 border px-2 py-0.5 rounded-full text-xs font-bold font-sans ${
                  isDarkMode 
                    ? "bg-zinc-900 border-white shadow-[2px_2px_0px_0px_rgba(255,255,255,0.15)]" 
                    : "bg-white border-primary shadow-flat-offset-sm"
                }`}>
                  <span className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse"></span>
                  3 Collaborating
                </div>
              </div>

              {/* Render board internals only if expanded */}
              {!isBoardClosed && (
                <>
                  {/* Whiteboard Workspace Columns Grid */}
                  <div className={`flex-1 grid grid-cols-3 divide-x-2 transition-colors duration-300 ${
                    isDarkMode ? "divide-white" : "divide-primary"
                  }`}>
                    
                    {/* Column: TO DO */}
                    <div className="p-3">
                      <div className={`font-cursive text-lg font-bold border-b pb-2 tracking-wide flex items-center justify-between ${
                        isDarkMode ? "border-white/15 text-white" : "border-primary/15 text-secondary"
                      }`}>
                        <span>TO DO</span>
                        <span className={`text-xs border px-1.5 rounded font-sans ${
                          isDarkMode ? "bg-zinc-800 border-white text-white" : "bg-accent-yellow/60 border-primary text-primary"
                        }`}>{stickies.filter((s) => s.status === "todo").length}</span>
                      </div>
                    </div>

                    {/* Column: DOING */}
                    <div className="p-3">
                      <div className={`font-cursive text-lg font-bold border-b pb-2 tracking-wide flex items-center justify-between ${
                        isDarkMode ? "border-white/15 text-white" : "border-primary/15 text-secondary"
                      }`}>
                        <span>DOING</span>
                        <span className={`text-xs border px-1.5 rounded font-sans ${
                          isDarkMode ? "bg-zinc-800 border-white text-white" : "bg-accent-pink/60 border-primary text-primary"
                        }`}>{stickies.filter((s) => s.status === "doing").length}</span>
                      </div>
                    </div>

                    {/* Column: DONE */}
                    <div className="p-3">
                      <div className={`font-cursive text-lg font-bold border-b pb-2 tracking-wide flex items-center justify-between ${
                        isDarkMode ? "border-white/15 text-white" : "border-primary/15 text-secondary"
                      }`}>
                        <span>DONE</span>
                        <span className={`text-xs border px-1.5 rounded font-sans ${
                          isDarkMode ? "bg-zinc-800 border-white text-white" : "bg-accent-green/60 border-primary text-primary"
                        }`}>{stickies.filter((s) => s.status === "done").length}</span>
                      </div>
                    </div>
                  </div>

                  {/* absolute SVGs: Arrow connecting nodes with dashoffset drawing animation */}
                  <svg className="absolute inset-0 pointer-events-none w-full h-full" xmlns="http://www.w3.org/2000/svg">
                    <path 
                      d="M 170 120 Q 230 140 280 200" 
                      fill="none" 
                      stroke={isDarkMode ? "#FF9F70" : "#FF7F50"} 
                      strokeWidth="2.5" 
                      strokeDasharray="6 6"
                      style={{
                        animation: "dash 1.5s linear infinite"
                      }}
                    />
                    {/* SVG dash animation styles */}
                    <style>{`
                      @keyframes dash {
                        to {
                          stroke-dashoffset: -24;
                        }
                      }
                    `}</style>
                    <polygon points="280,200 274,194 278,203" fill={isDarkMode ? "#FF9F70" : "#FF7F50"} stroke={isDarkMode ? "#FF9F70" : "#FF7F50"} strokeWidth="1" />
                  </svg>

                  {/* Draggable Sticky Notes rendered absolutely */}
                  {stickies.map((sticky) => (
                    <StickyNoteCard
                      key={sticky.id}
                      sticky={sticky}
                      draggedId={draggedId}
                      editingId={editingId}
                      isDarkMode={isDarkMode}
                      onPointerDown={(e) => handlePointerDown(e, sticky.id)}
                      onPointerMove={(e) => handlePointerMove(e, sticky.id)}
                      onPointerUp={(e) => handlePointerUp(e, sticky.id)}
                      onDoubleClick={() => handleDoubleClick(sticky.id)}
                      onTextChange={(val) => handleTextChange(sticky.id, val)}
                      onBlur={() => {
                        setEditingId(null);
                        if (resumeTimeoutRef.current) clearTimeout(resumeTimeoutRef.current);
                        resumeTimeoutRef.current = setTimeout(() => {
                          startPuppetShow();
                        }, 6000);
                      }}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") {
                          setEditingId(null);
                          if (resumeTimeoutRef.current) clearTimeout(resumeTimeoutRef.current);
                          resumeTimeoutRef.current = setTimeout(() => {
                            startPuppetShow();
                          }, 6000);
                        }
                      }}
                    />
                  ))}

                  {/* Custom 'You' Cursor */}
                  {userCursor.isVisible && (
                    <div 
                      style={{ 
                        left: `${userCursor.x}px`, 
                        top: `${userCursor.y}px`,
                        transform: "translate(-2px, -2px)",
                      }}
                      className="absolute z-50 pointer-events-none flex flex-col items-start"
                    >
                      {/* Pointer icon */}
                      <svg width="14" height="18" viewBox="0 0 14 18" fill="none" xmlns="http://www.w3.org/2000/svg">
                        <path d="M0 0V15.6L4.5 11.5L9.6 17.5L12.5 15.1L7.5 9.2L13.1 8L0 0Z" fill="#2BB7A8" stroke="black" strokeWidth="1.5" strokeLinejoin="round"/>
                      </svg>
                      {/* Username pill */}
                      <div className={`border px-1.5 py-0.5 rounded text-[8px] sm:text-[10px] font-sans font-bold text-white mt-0.5 ml-2 bg-tertiary ${
                        isDarkMode ? "border-white shadow-[2px_2px_0px_0px_rgba(255,255,255,0.15)]" : "border-primary shadow-flat-offset-sm"
                      }`}>
                        You
                      </div>
                    </div>
                  )}

                  {/* Collaborator Cursor Badges */}
                  <CollaboratorCursor
                    cursorRef={cursorPriyaRef}
                    isDarkMode={isDarkMode}
                    name="Priya"
                    color="#6366F1"
                    bgClass="bg-accent-purple"
                  />

                  <CollaboratorCursor
                    cursorRef={cursorJordanRef}
                    isDarkMode={isDarkMode}
                    name="Jordan"
                    color="#FF7F50"
                    bgClass="bg-accent-orange"
                  />
                </>
              )}

            </div>
          </div>
        </div>

      </main>
      
      {/* Decorative Hand-Drawn Whiteboard Marker Pen Overlay */}
      <div className={`absolute bottom-6 right-8 hidden lg:flex items-center gap-2 border px-3 py-1.5 rounded-full z-raised font-cursive text-sm font-bold ${
        isDarkMode 
          ? "bg-zinc-900 border-white text-white shadow-[4px_4px_0px_0px_rgba(255,255,255,0.15)]" 
          : "bg-white border-primary text-primary shadow-flat-offset"
      }`}>
        <span>✏️ marker: ready</span>
        <div className="w-3 h-3 bg-tertiary rounded-full border border-primary"></div>
      </div>

    </div>
  );
}
