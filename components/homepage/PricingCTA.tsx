"use client";

import React, { useState, useRef } from "react";
import gsap from "gsap";
import { useGSAP } from "@gsap/react";
import { ScrollTrigger } from "gsap/ScrollTrigger";

gsap.registerPlugin(ScrollTrigger);
import WaitlistForm from "./pricing/WaitlistForm";
import PricingCard from "./pricing/PricingCard";

export default function PricingCTA() {
  const containerRef = useRef<HTMLDivElement>(null);
  const [status, setStatus] = useState<"idle" | "loading" | "success">("idle");

  // GSAP animations on scroll
  useGSAP(() => {
    gsap.fromTo(
      ".cta-reveal",
      { opacity: 0, y: 35 },
      {
        opacity: 1,
        y: 0,
        duration: 0.8,
        stagger: 0.15,
        ease: "power3.out",
        scrollTrigger: {
          trigger: containerRef.current,
          start: "top 80%",
        },
      }
    );
  }, { scope: containerRef });

  const handleDeployPro = () => {
    setStatus("loading");
    setTimeout(() => {
      setStatus("success");
    }, 1500);
  };

  return (
    <section
      ref={containerRef}
      className="py-24 md:py-32 px-6 max-w-7xl mx-auto w-full border-t-2 relative z-10 transition-colors duration-300 border-black"
      id="pricing"
    >
      <div className="grid grid-cols-1 md:grid-cols-12 gap-12 items-start">
        {/* Left column: Waitlist & Form (col-span 7) */}
        <div className="md:col-span-7 flex flex-col justify-between min-h-[400px]">
          <div className="cta-reveal">
            <h2 className="font-cursive text-4xl md:text-5xl font-bold tracking-tight leading-tight mb-6 transition-colors duration-300 text-slate-900">
              Start building together in real-time.
            </h2>
            <p className="text-base font-sans leading-relaxed mb-8 max-w-[50ch] transition-colors duration-300 text-slate-655">
              Deploy a shared project cluster, invite your engineering team, and whiteboard workflows
              within seconds. Join the developer queue for early cluster instances.
            </p>
          </div>

          <WaitlistForm status={status} setStatus={setStatus} />
        </div>

        {/* Right column: Pro Pricing Tier (col-span 5) */}
        <PricingCard onDeploy={handleDeployPro} />
      </div>
    </section>
  );
}
