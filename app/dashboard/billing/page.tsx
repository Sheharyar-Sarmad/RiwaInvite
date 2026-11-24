// app/dashboard/billing/page.tsx
import type { Metadata } from "next";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import {BillingClient} from "@/components/user/sections/billing/BillingClient";
import settings from "@/config/settings_config";
import { getUserServerSide } from "@/lib/server/getUser";

// Absolute base URL so social crawlers can resolve the OG image and page URL.
const baseUrl = (settings().appUrl || "https://riwainvite.com").replace(/\/$/, "");
const pageUrl = `${baseUrl}/dashboard/billing`;
const ogImage = `/og-user-billing.png`;

export const metadata: Metadata =
 {
  title: "Billing | Riwainvite",
  description:
    "See your current plan, payment history and lifetime spend, and manage your Riwainvite subscription.",

  // User dashboards should NOT be indexed for privacy
  robots: {
    index: false,
    follow: false,
    googleBot: { index: false, follow: false },
  },

  openGraph: {
    title: "Riwainvite Billing",
    description:
      "Your plan, orders and payment history in one place.",
    url: pageUrl,
    siteName: "Riwainvite",
    images: [{ url: ogImage, width: 1200, height: 630, alt: "Riwainvite Billing" }],
    locale: "en_US",
    type: "website",
  },

  twitter: {
    card: "summary_large_image",
    title: "Riwainvite Billing",
    description:
      "Your plan, orders and payment history in one place.",
    images: [ogImage],
  },

  icons: {
    icon: "/logo.png",
    shortcut: "/logo.png",
    apple: "/logo.png",
  },
};

export default async function BillingPage() {
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
  return <BillingClient user={user} />;
}