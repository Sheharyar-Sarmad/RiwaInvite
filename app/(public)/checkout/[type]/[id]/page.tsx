import type { Metadata } from "next";
import { CheckoutClient } from "@/components/user/sections/checkout/CheckoutClient";
import settings from "@/config/settings_config";

const config = settings();

export const metadata: Metadata = {
  metadataBase: new URL(config.appUrl),
  title: {
    default: "Secure Checkout | Riwainvite",
    template: "%s · Riwainvite",
  },
  description:
    "Review your order and securely complete your payment to unlock your premium digital invitation or subscription plan. Fast, safe, and encrypted.",
  keywords: [
    "secure checkout",
    "digital invitation payment",
    "JazzCash payment",
    "buy wedding template",
    "Riwainvite checkout",
    "premium invitations",
    "event website subscription",
  ],
  authors: [{ name: "Riwainvite", url: config.appUrl }],
  creator: "Riwainvite",
  publisher: "Riwainvite",
  alternates: {
    canonical: "/checkout",
  },
  robots: {
    index: false, // It's best practice to NO-INDEX checkout pages
    follow: false,
    googleBot: {
      index: false,
      follow: false,
    },
  },
  openGraph: {
    title: "Secure Checkout | Riwainvite",
    description:
      "Review your order and securely complete your payment to unlock your premium digital invitation.",
    url: `${config.appUrl}/checkout`,
    siteName: "Riwainvite",
    images: [
      {
        url: "/og-checkout-image.png",
        width: 1200,
        height: 630,
        alt: "Riwainvite Secure Checkout",
        type: "image/png",
      },
    ],
    locale: "en_US",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "Secure Checkout | Riwainvite",
    description:
      "Review your order and securely complete your payment to unlock your premium digital invitation.",
    images: ["/og-checkout-image.png"],
    creator: "@riwainvite",
  },
  applicationName: "Riwainvite",
  appleWebApp: {
    capable: true,
    title: "Checkout | Riwainvite",
    statusBarStyle: "default",
  },
  formatDetection: {
    telephone: false,
  },
};

export default function CheckoutPage() {
  return <CheckoutClient />;
}