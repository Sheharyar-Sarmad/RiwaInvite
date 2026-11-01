import type { Metadata, Viewport } from "next";
import { EthosHero } from "@/components/public/sections/ethos/EthosHero";
import { ThePaperProblem } from "@/components/public/sections/ethos/ThePaperProblem";
import { TheEnvironmentalImpact } from "@/components/public/sections/ethos/TheEnvironmentalImpact";
import TheDigitalCanvas from "@/components/public/sections/ethos/TheDigitalCanvas";
import { TheGuestConnection } from "@/components/public/sections/ethos/TheGuestConnection";
import { EthosCta } from "@/components/public/sections/ethos/EthosCta";
import { settings } from "@/config/settings_config";

const appUrl = settings().appUrl;

export const metadata: Metadata = {
  metadataBase: new URL(appUrl),
  title: "Our Ethos | The Paperless Revolution",
  description:
    "Discover why Riwainvite is replacing traditional paper invitations. Save the environment, save money, and upgrade to a living, interactive digital experience.",
  keywords: [
    "paperless invitations",
    "digital invitations",
    "eco-friendly events",
    "Riwainvite",
    "sustainable weddings",
    "digital invitation platform",
    "paperless revolution",
  ],
  authors: [{ name: "Riwainvite", url: appUrl }],
  creator: "Riwainvite",
  publisher: "Riwainvite",
  applicationName: "Riwainvite",
  alternates: {
    canonical: "/ethos",
  },
  openGraph: {
    title: "Our Ethos | The Paperless Revolution | Riwainvite",
    description:
      "Discover why Riwainvite is replacing traditional paper invitations. Save the environment, save money, and upgrade to a living, interactive digital experience.",
    url: `${appUrl}/ethos`,
    siteName: "Riwainvite",
    images: [
      {
        url: "/og-ethos-image.png",
        width: 1200,
        height: 630,
        alt: "Riwainvite Ethos — The Paperless Revolution",
        type: "image/png",
      },
    ],
    locale: "en_US",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "Our Ethos | The Paperless Revolution | Riwainvite",
    description:
      "Discover why Riwainvite is replacing traditional paper invitations. Save the environment, save money, and upgrade to a living, interactive digital experience.",
    images: ["/og-ethos-image.png"],
    creator: "@riwainvite",
    site: "@riwainvite",
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-video-preview": -1,
      "max-image-preview": "large",
      "max-snippet": -1,
    },
  },
  category: "technology",
  appleWebApp: {
    capable: true,
    title: "Riwainvite",
    statusBarStyle: "default",
  },
  formatDetection: {
    telephone: false,
  },
};

export const viewport: Viewport = {
  themeColor: "#fdeadb",
};

// // A very subtle, minimal separator for when colors clash or match too closely
// function SectionSeparator() {
//   return (
//     <div className="relative flex w-full items-center justify-center py-4 sm:py-8">
//       <div className="h-px w-full max-w-5xl bg-gradient-to-r from-transparent via-orange-500/20 to-transparent" />
//       <div className="absolute h-1.5 w-1.5 rounded-full bg-[#f97316]/60 shadow-[0_0_10px_rgba(249,115,22,0.5)]" />
//     </div>
//   );
// }

export default function EthosPage() {
  return (
    <main className="w-full bg-[#fffafb]">
      <EthosHero />
      
      <ThePaperProblem />
      
      <TheEnvironmentalImpact />
      
      <TheDigitalCanvas />
      
      {/* <SectionSeparator /> */}
      
      <TheGuestConnection />
      
      {/* <SectionSeparator /> */}
      
      <EthosCta />
    </main>
  );
}