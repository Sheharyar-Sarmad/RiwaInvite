import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { RegisterClient } from "@/components/public/sections/auth/RegisterClient";
import settings from "@/config/settings_config";
import type { Metadata } from "next";

const config = settings();

export const metadata: Metadata = {
  metadataBase: new URL(config.appUrl),
  title: {
    default: "Create an Account | Riwainvite",
    template: "%s · Riwainvite",
  },
  description:
    "Create your Riwainvite account to start designing unforgettable digital invitations, customizing premium templates, and managing your guest lists with ease.",
  keywords: [
    "Riwainvite register",
    "create Riwainvite account",
    "digital invitation sign up",
    "event management SaaS",
    "wedding invitation builder",
    "RSVP software",
    "premium digital invitations",
  ],
  authors: [{ name: "Riwainvite", url: config.appUrl }],
  creator: "Riwainvite",
  publisher: "Riwainvite",
  alternates: {
    canonical: "/register",
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
    title: "Create an Account | Riwainvite",
    description:
      "Join Riwainvite to design unforgettable digital invitations and manage your guest lists with ease.",
    url: `${config.appUrl}/register`,
    siteName: "Riwainvite",
    images: [
      {
        url: "/og-register-image.png",
        width: 1200,
        height: 630,
        alt: "Riwainvite Register - Create Your Masterpiece",
        type: "image/png",
      },
    ],
    locale: "en_US",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "Create an Account | Riwainvite",
    description:
      "Join Riwainvite to design unforgettable digital invitations and manage your guest lists with ease.",
    images: ["/og-register-image.png"],
    creator: "@riwainvite", // Replace with your actual Twitter/X handle
  },
  themeColor: "#fdeadb",
  category: "technology",
  applicationName: "Riwainvite",
  appleWebApp: {
    capable: true,
    title: "Riwainvite Register",
    statusBarStyle: "default",
  },
  formatDetection: {
    telephone: false,
  },
};

// 1. Make the function async
export default async function RegisterPage() {
  // 2. Await the cookies() function
  const cookieStore = await cookies();
  
  // 3. Now you can safely call .has()
  const hasSession = cookieStore.has(config.sessionCookieName);

  // Instant redirect if already logged in
  if (hasSession) {
    redirect("/dashboard");
  }

  return <RegisterClient />;
}