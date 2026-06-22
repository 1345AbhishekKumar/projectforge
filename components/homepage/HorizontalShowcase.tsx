"use client";

import { useRef, useState } from "react";
import gsap from "gsap";
import { useGSAP } from "@gsap/react";
import { ScrollTrigger } from "gsap/ScrollTrigger";

gsap.registerPlugin(ScrollTrigger);
import ShowcaseAccordionItem, { AccordionItem } from "./showcase/ShowcaseAccordionItem";

const SHOWCASE_ITEMS: AccordionItem[] = [
  {
    id: "ideate",
    num: "01",
    title: "Ideate",
    pillKeyword: "sketch",
    bgKeyword: "whiteboard",
    description: "Map raw ideas, architectural blueprints, and flow charts on a latency-free vector whiteboard canvas.",
    color: "bg-accent-yellow", // Yellow
  },
  {
    id: "orchestrate",
    num: "02",
    title: "Orchestrate",
    pillKeyword: "team",
    bgKeyword: "collaboration",
    description: "Align sprints and dependencies. Watch task lists prioritize themselves automatically as code gets committed.",
    color: "bg-accent-pink", // Pink
  },
  {
    id: "build",
    num: "03",
    title: "Build",
    pillKeyword: "code",
    bgKeyword: "developer",
    description: "Compile and deploy. Run live serverless deployments and integration pipelines directly from your collaborative workspace.",
    color: "bg-accent-blue", // Blue
  },
];

export default function HorizontalShowcase() {
  const containerRef = useRef<HTMLDivElement>(null);
  const itemsContainerRef = useRef<HTMLDivElement>(null);
  const [hoveredIdx, setHoveredIdx] = useState<number | null>(null);

  // GSAP: Scale image into view and fade-out surrounding text on scroll
  useGSAP(() => {
    // Reveal text block with stagger
    gsap.fromTo(
      ".showcase-reveal",
      { opacity: 0, y: 30 },
      {
        opacity: 1,
        y: 0,
        duration: 0.8,
        stagger: 0.12,
        ease: "power3.out",
        scrollTrigger: {
          trigger: containerRef.current,
          start: "top 75%",
        },
      }
    );

    // Parallax scaling for images inside accordion slots
    gsap.fromTo(
      ".accordion-bg-img",
      { scale: 1.15, filter: "grayscale(100%) contrast(120%)" },
      {
        scale: 1.0,
        filter: "grayscale(100%) contrast(100%)",
        ease: "none",
        scrollTrigger: {
          trigger: itemsContainerRef.current,
          start: "top bottom",
          end: "bottom top",
          scrub: true,
        },
      }
    );
  }, { scope: containerRef });

  return (
    <section 
      ref={containerRef}
      className="py-24 md:py-32 px-6 max-w-7xl mx-auto w-full relative z-10 overflow-hidden"
      id="how-it-works"
    >
      {/* Title block with editorial typography containing inline header pills */}
      <div className="mb-16 md:mb-20 max-w-4xl showcase-reveal">
        <h2 className="font-cursive text-4xl md:text-6xl font-bold tracking-tight leading-tight text-wrap-balance mb-6 transition-colors duration-300 text-slate-900">
          Construct, align, and ship{" "}
          <span 
            className="inline-block w-16 md:w-24 h-7 md:h-10 rounded-full align-middle bg-cover bg-center mx-1.5 md:mx-2 border-2 transition-[transform,box-shadow] duration-300 border-black shadow-flat-offset-sm hover:scale-105 hover:rotate-2 cursor-pointer"
            style={{ backgroundImage: `url('https://picsum.photos/seed/forge-pill1/150/80')` }}
            role="img"
            aria-label="Sketch preview icon"
          />{" "}
          without switching contexts or{" "}
          <span 
            className="inline-block w-16 md:w-24 h-7 md:h-10 rounded-full align-middle bg-cover bg-center mx-1.5 md:mx-2 border-2 transition-[transform,box-shadow] duration-300 border-black shadow-flat-offset-sm hover:scale-105 hover:rotate-2 cursor-pointer"
            style={{ backgroundImage: `url('https://picsum.photos/seed/forge-pill2/150/80')` }}
            role="img"
            aria-label="Workflow preview icon"
          />{" "}
          losing momentum.
        </h2>
        <p className="text-base font-sans leading-relaxed max-w-[65ch] transition-colors duration-300 text-slate-655">
          The three foundational stages of ProjectForge combined into a unified workflow model. Click or hover on a phase to explore details.
        </p>
      </div>

      {/* Accordion Container. Responsive: Flex column on mobile, Row on desktop */}
      <div 
        ref={itemsContainerRef}
        className="flex flex-col md:flex-row gap-6 h-auto md:h-[500px] w-full items-stretch relative"
      >
        {SHOWCASE_ITEMS.map((item, idx) => (
          <ShowcaseAccordionItem
            key={item.id}
            item={item}
            isCurrentHovered={hoveredIdx === idx}
            isAnyHovered={hoveredIdx !== null}
            onMouseEnter={() => setHoveredIdx(idx)}
            onMouseLeave={() => setHoveredIdx(null)}
            onClick={() => setHoveredIdx(idx === hoveredIdx ? null : idx)}
          />
        ))}
      </div>
    </section>
  );
}
