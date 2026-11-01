import type { Metadata } from "next";
import { PricingPreview } from "@/components/public/sections/plans/PlansClient";
import settings from "@/config/settings_config";

const config = settings();

export const metadata: Metadata = {
  metadataBase: new URL(config.appUrl),
  title: {
    default: "Plans & Pricing | Riwainvite",
    template: "%s · Riwainvite",
  },
  description:
    "Choose the perfect plan for your digital invitations. Upgrade to unlock premium templates, custom slugs, and unlimited RSVPs. Simple pricing, no hidden fees.",
  keywords: [
    "digital invitation pricing",
    "event invitation plans",
    "premium templates",
    "custom URL slug",
    "RSVP tracking",
    "Riwainvite pricing",
    "wedding invitation plans",
    "paperless invitations pricing",
  ],
  authors: [{ name: "Riwainvite", url: config.appUrl }],
  creator: "Riwainvite",
  publisher: "Riwainvite",
  alternates: {
    canonical: "/plans",
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
    title: "Plans & Pricing | Riwainvite",
    description:
      "Choose the perfect plan for your digital invitations. Upgrade to unlock premium templates, custom slugs, and unlimited RSVPs.",
    url: `${config.appUrl}/plans`,
    siteName: "Riwainvite",
    images: [
      {
        url: "/og-plans-image.png",
        width: 1200,
        height: 630,
        alt: "Riwainvite Plans and Pricing",
        type: "image/png",
      },
    ],
    locale: "en_US",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "Plans & Pricing | Riwainvite",
    description:
      "Choose the perfect plan for your digital invitations. Upgrade to unlock premium templates, custom slugs, and unlimited RSVPs.",
    images: ["/og-plans-image.png"],
    creator: "@riwainvite",
  },
  themeColor: "#fdeadb",
  category: "technology",
  applicationName: "Riwainvite",
  appleWebApp: {
    capable: true,
    title: "Riwainvite",
    statusBarStyle: "default",
  },
  formatDetection: {
    telephone: false,
  },
};

export default function PlansPage() {
  return (
    <main className="min-h-screen w-full bg-[#fdeadb]">
      <PricingPreview />
    </main>
  );
}