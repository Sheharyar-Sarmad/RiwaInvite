import type { Metadata } from "next";
import { CraftClient } from "@/components/public/sections/craft/CraftClient";
import settings from "@/config/settings_config";

const config = settings();

export const metadata: Metadata = {
  metadataBase: new URL(config.appUrl),
  title: {
    default: "The Crafted Collection | Bespoke Event Websites & Invitations",
    template: "%s · Riwainvite",
  },
  description:
    "Work directly with our design team. We build 100% bespoke, cinematic event websites and heavily customize premium digital invitations for weddings, galas, and luxury events.",
  keywords: [
    "bespoke wedding website",
    "custom digital invitation",
    "luxury event website",
    "custom wedding domain",
    "bespoke event design",
    "custom Next.js website",
    "premium invitation templates",
    "Riwainvite Craft",
    "Riwainvite Bespoke",
  ],
  authors: [{ name: "Riwainvite Design Studio", url: config.appUrl }],
  creator: "Riwainvite",
  publisher: "Riwainvite",
  alternates: {
    canonical: "/craft",
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
  openGraph: {
    title: "The Crafted Collection | Bespoke Event Websites & Invitations",
    description:
      "Don't just send an invite. Make a statement. Partner with our design studio to build a fully bespoke website or a customized premium template.",
    url: `${config.appUrl}/craft`,
    siteName: "Riwainvite",
    images: [
      {
        url: "/og-craft-image.png",
        width: 1200,
        height: 630,
        alt: "Riwainvite Crafted Collection - Bespoke Web Design",
        type: "image/png",
      },
    ],
    locale: "en_US",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "The Crafted Collection | Bespoke Event Websites & Invitations",
    description:
      "Work directly with our design team. We build 100% bespoke websites or heavily customize premium templates for your special event.",
    images: ["/og-craft-image.png"],
    creator: "@riwainvite",
  },
  themeColor: "#fdeadb",
  category: "design",
  applicationName: "Riwainvite",
  appleWebApp: {
    capable: true,
    title: "Riwainvite Craft",
    statusBarStyle: "default",
  },
  formatDetection: {
    telephone: false,
  },
};

export default function CraftPage() {
  return (
    <main className="min-h-screen w-full bg-[#fdeadb]">
      <CraftClient />
    </main>
  );
}