import type { Metadata } from "next";

// --- Sections ---
import { HomeHero } from "@/components/public/sections/home/HomeHero";
import { WhyRiwainvite } from "@/components/public/sections/home/WhyRiwainvite";
import { TemplatesMarquee } from "@/components/public/sections/home/TemplatesMarquee";
import HowItWorks from "@/components/public/sections/home/HowItWorks"; // Default import
import { PricingPreview } from "@/components/public/sections/home/PricingPreview";
import { FAQ } from "@/components/public/sections/home/FAQ"; // Named import

// Next.js 16 Guardrail: Set page-level metadata for SEO
export const metadata: Metadata = {
  title: "Riwainvite | Premium Digital Invitations",
  description:
    "Design, customize, and track beautiful digital event invitations. Whether it's a wedding or a corporate gala, try our builder for free.",
};

export default function HomePage() {
  return (
    <main className="flex min-h-screen w-full flex-col overflow-x-clip bg-[#fffafb]">
      <HomeHero />
      <WhyRiwainvite />
      <TemplatesMarquee />
      <HowItWorks />
      <PricingPreview />
      <FAQ />
    </main>
  );
}