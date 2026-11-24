import type { Metadata } from "next";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { SettingsClient } from "@/components/user/sections/settings/SettingsClient";
import settings from "@/config/settings_config";
import { getUserServerSide } from "@/lib/server/getUser";

const baseUrl = (settings().appUrl || "https://riwainvite.com").replace(/\/$/, "");
const pageUrl = `${baseUrl}/dashboard/settings`;
const ogImage = `/og-user-settings.png`;

export const metadata: Metadata = {
  title: "Settings | Riwainvite",
  description:
    "Update your profile, contact details and password for your Riwainvite account.",

  // User dashboards should NOT be indexed for privacy
  robots: {
    index: false,
    follow: false,
    googleBot: { index: false, follow: false },
  },

  openGraph: {
    title: "Riwainvite Settings",
    description: "Manage your profile and account security in one place.",
    url: pageUrl,
    siteName: "Riwainvite",
    images: [{ url: ogImage, width: 1200, height: 630, alt: "Riwainvite Settings" }],
    locale: "en_US",
    type: "website",
  },

  twitter: {
    card: "summary_large_image",
    title: "Riwainvite Settings",
    description: "Manage your profile and account security in one place.",
    images: [ogImage],
  },

  icons: {
    icon: "/logo.png",
    shortcut: "/logo.png",
    apple: "/logo.png",
  },
};

export default async function SettingsPage() {
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
  return <SettingsClient user={user} />;
}