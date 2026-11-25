import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { CheckoutFailClient } from "@/components/user/sections/checkout/CheckoutFailClient";
import settings from "@/config/settings_config";
import { Suspense } from "react";

const config = settings();

export const metadata: Metadata = {
  metadataBase: new URL(config.appUrl),
  title: {
    default: "Payment Failed | Riwainvite",
    template: "%s · Riwainvite",
  },
  description:
    "Your payment could not be completed or was cancelled. No money was deducted. Please try again or contact our support team for assistance.",
  keywords: [
    "payment failed",
    "checkout cancelled",
    "retry payment",
    "Riwainvite payment error",
    "JazzCash payment failed",
    "secure checkout error",
  ],
  authors: [{ name: "Riwainvite", url: config.appUrl }],
  creator: "Riwainvite",
  publisher: "Riwainvite",
  alternates: {
    canonical: "/checkout/fail",
  },
  robots: {
    index: false, // Absolutely never index error/fail pages
    follow: false,
    googleBot: {
      index: false,
      follow: false,
    },
  },
  openGraph: {
    title: "Payment Failed | Riwainvite",
    description:
      "Your transaction was not completed or was cancelled. No money was deducted. Please try again.",
    url: `${config.appUrl}/checkout/fail`,
    siteName: "Riwainvite",
    images: [
      {
        url: "/og-checkout-fail-image.png",
        width: 1200,
        height: 630,
        alt: "Riwainvite Payment Failed",
        type: "image/png",
      },
    ],
    locale: "en_US",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "Payment Failed | Riwainvite",
    description:
      "Your transaction was not completed or was cancelled. No money was deducted. Please try again.",
    images: ["/og-checkout-fail-image.png"],
    creator: "@riwainvite",
  },
  applicationName: "Riwainvite",
  appleWebApp: {
    capable: true,
    title: "Payment Failed | Riwainvite",
    statusBarStyle: "default",
  },
  formatDetection: {
    telephone: false,
  },
};

type FailSearchParams = Promise<{ orderId?: string }>;

async function FailContent({ searchParams }: { searchParams: FailSearchParams }) {
  const { orderId } = await searchParams;

  if (!orderId) {
    redirect("/");
  }

  return <CheckoutFailClient orderId={orderId} />;
}

export default function FailPage({ searchParams }: { searchParams: FailSearchParams }) {
  return (
    <Suspense fallback={<div className="min-h-[60vh]" aria-busy="true" />}>
      <FailContent searchParams={searchParams} />
    </Suspense>
  );
}