import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { LoginClient } from "@/components/public/sections/auth/LoginClient";
import settings from "@/config/settings_config";
import type { Metadata } from "next";

const config = settings();

export const metadata: Metadata = {
  metadataBase: new URL(config.appUrl),
  title: {
    default: "Sign In | Riwainvite",
    template: "%s · Riwainvite",
  },
  description:
    "Sign in to your Riwainvite account to manage your premium digital invitations, track RSVPs in real-time, and edit your bespoke event pages.",
  keywords: [
    "Riwainvite login",
    "sign in to Riwainvite",
    "digital invitation dashboard",
    "manage event invitations",
    "RSVP tracking",
    "event page editor",
    "luxury invitation login",
  ],
  authors: [{ name: "Riwainvite", url: config.appUrl }],
  creator: "Riwainvite",
  publisher: "Riwainvite",
  alternates: {
    canonical: "/login",
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
    title: "Sign In | Riwainvite",
    description:
      "Access your dashboard to manage premium digital invitations, track RSVPs, and edit your event pages.",
    url: `${config.appUrl}/login`,
    siteName: "Riwainvite",
    images: [
      {
        url: "/og-login-image.png",
        width: 1200,
        height: 630,
        alt: "Riwainvite Login - Welcome Back",
        type: "image/png",
      },
    ],
    locale: "en_US",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "Sign In | Riwainvite",
    description:
      "Access your dashboard to manage premium digital invitations, track RSVPs, and edit your event pages.",
    images: ["/og-login-image.png"],
    creator: "@riwainvite", // Replace with your actual Twitter/X handle
  },
  themeColor: "#fdeadb",
  category: "technology",
  applicationName: "Riwainvite",
  appleWebApp: {
    capable: true,
    title: "Riwainvite Login",
    statusBarStyle: "default",
  },
  formatDetection: {
    telephone: false,
  },
};

export default async function LoginPage() {
  const cookieStore = await cookies();
  const hasSession = cookieStore.has(config.sessionCookieName);

  // Instant redirect if already logged in
  if (hasSession) {
    redirect("/dashboard");
  }

  return <LoginClient />;
}