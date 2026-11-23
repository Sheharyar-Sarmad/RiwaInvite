// app/dashboard/rehearsal/page.tsx
import type { Metadata } from "next";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { RehearsalStudioClient } from "@/components/user/sections/rehearsal/RehearsalStudioClient";
import settings from "@/config/settings_config";
import { getUserServerSide } from "@/lib/server/getUser";

// Absolute base URL so social crawlers can resolve the OG image and page URL.
const baseUrl = (settings().appUrl || "https://riwainvite.com").replace(
  /\/$/,
  "",
);
const pageUrl = `${baseUrl}/dashboard/rehearsal`;
const ogImage = `/og-user-rehearsal.png`;

/*  Exceptional SEO & Social Metadata */
export const metadata: Metadata = {
  title: "Rehearsal Studio | Riwainvite",
  description:
    "Customize any invitation template before you buy. Edit colors, fonts, layout, and wording — all changes saved automatically.",

  // User Dashboards should NOT be indexed by Google for privacy
  robots: {
    index: false,
    follow: false,
    googleBot: {
      index: false,
      follow: false,
    },
  },

  // Social Media Sharing (WhatsApp, Facebook, LinkedIn, etc.)
  openGraph: {
    title: "Riwainvite Rehearsal Studio",
    description:
      "Try before you buy — customize templates with AI-powered design suggestions, live preview, and auto-save drafts.",
    url: pageUrl,
    siteName: "Riwainvite",
    images: [
      {
        url: ogImage,
        width: 1200,
        height: 630,
        alt: "Riwainvite Rehearsal Studio",
      },
    ],
    locale: "en_US",
    type: "website",
  },

  // Twitter (X) Sharing
  twitter: {
    card: "summary_large_image",
    title: "Riwainvite Rehearsal Studio",
    description:
      "Try before you buy — customize templates with AI-powered design suggestions, live preview, and auto-save drafts.",
    images: [ogImage],
  },

  // Browser Tab Icon (Favicon)
  icons: {
    icon: "/logo.png",
    shortcut: "/logo.png",
    apple: "/logo.png",
  },
};

export default async function RehearsalPage() {
  const h = await headers();

  // 1. Read headers injected by proxy.ts.
  //    Auth is enforced by the proxy, so this page does not redirect itself.
  const id = h.get("x-user-id") ?? "";
  const email = h.get("x-user-email") ?? "";
  const first_name =
    h.get("x-user-first-name") || h.get("x-user-name") || "User";

  // 2. Protect the route — if proxy didn't inject identity, user isn't authenticated
  if (!id || !email) redirect("/login");

  // 3. Fetch the full user record via the Axios-based server helper
  const dbUser = await getUserServerSide(id);

  // 4. Build the final user object (fallback to headers if the API fails)
  const user = {
    id,
    email: dbUser?.email || email,
    first_name: dbUser?.first_name || first_name,
    last_name: dbUser?.last_name || "",
    phone_number: dbUser?.phone_number || "",
    created_at: dbUser?.created_at || undefined,
  };

  // 5. Render the Client Component with the data
  return <RehearsalStudioClient user={user} />;
}