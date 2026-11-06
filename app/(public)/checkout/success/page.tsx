import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { CheckoutSuccessClient } from "@/components/user/sections/checkout/CheckoutSuccessClient";
import settings from "@/config/settings_config";

const config = settings();

export const metadata: Metadata = {
  metadataBase: new URL(config.appUrl),
  title: {
    default: "Payment Successful | Riwainvite",
    template: "%s · Riwainvite",
  },
  description:
    "Your payment was successfully verified. Your premium digital invitation or subscription plan is now unlocked and ready to use.",
  keywords: [
    "payment successful",
    "order confirmed",
    "Riwainvite success",
    "digital invitation unlocked",
    "JazzCash payment success",
    "checkout complete",
  ],
  authors: [{ name: "Riwainvite", url: config.appUrl }],
  creator: "Riwainvite",
  publisher: "Riwainvite",
  alternates: {
    canonical: "/checkout/success",
  },
  robots: {
    index: false, // Never index success pages
    follow: false,
    googleBot: {
      index: false,
      follow: false,
    },
  },
  openGraph: {
    title: "Payment Successful | Riwainvite",
    description:
      "Your transaction was verified. Your premium invitation is now unlocked and ready to use.",
    url: `${config.appUrl}/checkout/success`,
    siteName: "Riwainvite",
    images: [
      {
        url: "/og-checkout-success-image.png",
        width: 1200,
        height: 630,
        alt: "Riwainvite Payment Successful",
        type: "image/png",
      },
    ],
    locale: "en_US",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "Payment Successful | Riwainvite",
    description:
      "Your transaction was verified. Your premium invitation is now unlocked and ready to use.",
    images: ["/og-checkout-success-image.png"],
    creator: "@riwainvite",
  },
  applicationName: "Riwainvite",
  appleWebApp: {
    capable: true,
    title: "Success | Riwainvite",
    statusBarStyle: "default",
  },
  formatDetection: {
    telephone: false,
  },
};

// 1. Make the function async
export default async function SuccessPage({ 
  searchParams 
}: { 
  searchParams: Promise<{ orderId?: string }> 
}) {
  // 2. Await the searchParams
  const resolvedParams = await searchParams;

  if (!resolvedParams.orderId) {
    redirect("/");
  }

  return <CheckoutSuccessClient orderId={resolvedParams.orderId} />;
}