
import Hero from "@/components/homepage/Hero";
import BentoFeatures from "@/components/homepage/BentoFeatures";
import HorizontalShowcase from "@/components/homepage/HorizontalShowcase";
import PricingCTA from "@/components/homepage/PricingCTA";
import Footer from "@/components/homepage/Footer";

export default function Home() {
  return (
    <main className="overflow-x-hidden w-full max-w-full flex flex-col min-h-screen transition-colors duration-300 bg-[#FAF9F6] text-primary">
      <Hero  />
      <BentoFeatures />
      <HorizontalShowcase />
      <PricingCTA />
      <Footer />
    </main>
  );
}
