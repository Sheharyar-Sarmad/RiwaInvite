import type { Metadata } from "next";

// --- Sections ---
import { HomeHero } from "@/components/public/sections/home/HomeHero";
import { WhyRiwainvite } from "@/components/public/sections/home/WhyRiwainvite";
import { TemplatesMarquee } from "@/components/public/sections/home/TemplatesMarquee";
import HowItWorks from "@/components/public/sections/home/HowItWorks";
import { PricingPreview } from "@/components/public/sections/home/PricingPreview";
import { FAQ } from "@/components/public/sections/home/FAQ";
import { CinematicShowcase } from "@/components/public/sections/home/CinematicShowcase";
import settings from "@/config/settings_config";

const config = settings();

export const metadata: Metadata = {
  metadataBase: new URL(config.appUrl),
  title: {
    default: "Riwainvite | Premium Digital Invitations",
    template: "%s · Riwainvite",
  },
  description:
    "Create, send, and track beautiful event invitations. Design, customize, and watch RSVPs roll in.",
  openGraph: {
    title: "Riwainvite | Premium Digital Invitations",
    description: "Create, send, and track beautiful event invitations.",
    url: config.appUrl,
    siteName: "Riwainvite",
    images: [
      {
        url: "/og-home-image.jpg",
        width: 1200,
        height: 630,
        alt: "Riwainvite 3D Envelope Logo",
      },
    ],
    locale: "en_US",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "Riwainvite | Premium Digital Invitations",
    description: "Create, send, and track beautiful event invitations.",
    images: ["/og-home-image.jpg"],
  },
};

export default function HomePage() {
  return (
    <main className="flex min-h-screen w-full flex-col overflow-x-clip bg-[#fffafb]">
      <HomeHero />
      <WhyRiwainvite />
      <TemplatesMarquee />
      <CinematicShowcase />

      <HowItWorks />

      <PricingPreview />
      <FAQ />
    </main>
  );
}
