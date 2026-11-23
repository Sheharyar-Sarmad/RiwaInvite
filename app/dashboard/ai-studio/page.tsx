// app/dashboard/ai-studio/page.tsx
import type { Metadata } from "next";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { AiStudioClient } from "@/components/user/sections/ai-studio/AiStudioClient";
import settings from "@/config/settings_config";
import { getUserServerSide } from "@/lib/server/getUser";

// Absolute base URL so social crawlers can resolve the OG image and page URL.
const baseUrl = (settings().appUrl || "https://riwainvite.com").replace(/\/$/, "");
const pageUrl = `${baseUrl}/dashboard/ai-studio`;
const ogImage = `/og-user-ai-studio.png`;

export const metadata: Metadata = {
  title: "AI Studio | Riwainvite",
  description:
    "Ask questions about your invitations, guests, RSVPs, orders and plan, and get quick help using Riwainvite.",

  // User dashboards should NOT be indexed for privacy
  robots: {
    index: false,
    follow: false,
    googleBot: { index: false, follow: false },
  },

  openGraph: {
    title: "Riwainvite AI Studio",
    description:
      "Your account assistant: check guest replies, orders, plans and invitation status in plain words.",
    url: pageUrl,
    siteName: "Riwainvite",
    images: [{ url: ogImage, width: 1200, height: 630, alt: "Riwainvite AI Studio" }],
    locale: "en_US",
    type: "website",
  },

  twitter: {
    card: "summary_large_image",
    title: "Riwainvite AI Studio",
    description:
      "Your account assistant: check guest replies, orders, plans and invitation status in plain words.",
    images: [ogImage],
  },

  icons: {
    icon: "/logo.png",
    shortcut: "/logo.png",
    apple: "/logo.png",
  },
};

export default async function AiStudioPage() {
  const h = await headers();

  // 1. Identity headers injected by proxy.ts (auth is enforced by the proxy).
  const id = h.get("x-user-id") ?? "";
  const email = h.get("x-user-email") ?? "";
  const first_name = h.get("x-user-first-name") || h.get("x-user-name") || "User";

  // 2. No identity means not authenticated.
  if (!id || !email) redirect("/login");

  // 3. Full user record (fallback to headers if the lookup fails).
  const dbUser = await getUserServerSide(id);

  const user = {
    id,
    email: dbUser?.email || email,
    first_name: dbUser?.first_name || first_name,
    last_name: dbUser?.last_name || "",
    phone_number: dbUser?.phone_number || "",
    created_at: dbUser?.created_at || undefined,
  };

  // 4. Render the client component.
  return <AiStudioClient user={user} />;
}