"use client";

import { useState } from "react";
import Hero from "@/components/homepage/Hero";
import BentoFeatures from "@/components/homepage/BentoFeatures";
import HorizontalShowcase from "@/components/homepage/HorizontalShowcase";
import PricingCTA from "@/components/homepage/PricingCTA";
import Footer from "@/components/homepage/Footer";

export default function Home() {
  const [isDarkMode, setIsDarkMode] = useState(false);

  return (
    <main className={`overflow-x-hidden w-full max-w-full flex flex-col min-h-screen transition-colors duration-300 ${
      isDarkMode ? "bg-[#090C0C] text-[#FAF9F6]" : "bg-[#FAF9F6] text-primary"
    }`}>
      <Hero isDarkMode={isDarkMode} setIsDarkMode={setIsDarkMode} />
      <BentoFeatures isDarkMode={isDarkMode} />
      <HorizontalShowcase isDarkMode={isDarkMode} />
      <PricingCTA isDarkMode={isDarkMode} />
      <Footer isDarkMode={isDarkMode} />
    </main>
  );
}
