import type { Metadata } from "next";
import { Suspense } from "react";
import { TemplateClient } from "@/components/public/sections/templates/TemplateClient";
import settings from "@/config/settings_config";

const config = settings();

export const metadata: Metadata = {
  metadataBase: new URL(config.appUrl),
  title: {
    default: "Premium Invitation Templates | Riwainvite",
    template: "%s · Riwainvite",
  },
  description:
    "Browse our entire library of premium digital event invitations. Find the perfect design for weddings, birthdays, and corporate galas. Preview any template live before you buy.",
  keywords: [
    "digital templates",
    "wedding invitations",
    "event templates",
    "premium designs",
    "paperless invitations",
    "Riwainvite templates",
    "online invitations",
    "custom invitations",
  ],
  authors: [{ name: "Riwainvite", url: config.appUrl }],
  creator: "Riwainvite",
  publisher: "Riwainvite",
  alternates: {
    canonical: "/templates",
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
    title: "Premium Invitation Templates | Riwainvite",
    description:
      "Browse our entire library of premium digital event invitations. Preview any template live before you buy.",
    url: `${config.appUrl}/templates`,
    siteName: "Riwainvite",
    images: [
      {
        url: "/og-templates-image.png", // Make sure to generate this image!
        width: 1200,
        height: 630,
        alt: "Riwainvite Template Collection",
        type: "image/png",
      },
    ],
    locale: "en_US",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "Premium Invitation Templates | Riwainvite",
    description:
      "Browse our entire library of premium digital event invitations. Preview any template live before you buy.",
    images: ["/og-templates-image.png"],
    creator: "@riwainvite", // replace with your actual Twitter/X handle
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

export default function TemplatesPage() {
  return (
    <main className="min-h-screen w-full bg-[#0a0a0a]">
      {/* 
        Suspense is required here because <TemplateClient /> uses `useSearchParams()` 
        to read the active category from the URL. 
      */}
      <Suspense 
        fallback={
          <div className="flex h-screen w-full items-center justify-center bg-[#0a0a0a]">
            <div className="h-10 w-10 animate-spin rounded-full border-4 border-orange-500 border-t-transparent" />
          </div>
        }
      >
        <TemplateClient />
      </Suspense>
    </main>
  );
}