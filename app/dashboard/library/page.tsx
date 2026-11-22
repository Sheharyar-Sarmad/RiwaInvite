// app/dashboard/library/page.tsx
import type { Metadata } from "next";
import { headers } from "next/headers";
import {
  UserLibraryClient,
  type LibraryUser,
} from "@/components/user/sections/library/UserLibraryClient";
import settings from "@/config/settings_config";
import { getUserServerSide } from "@/lib/server/getUser";

// Absolute base URL so social crawlers can resolve the OG image and page URL.
const baseUrl = (settings().appUrl || "https://riwainvite.com").replace(
  /\/$/,
  "",
);
const pageUrl = `${baseUrl}/dashboard/library`;
const ogImage = `/og-user-library.png`;

/*  Exceptional SEO & Social Metadata */
export const metadata: Metadata = {
  title: "My Library | Riwainvite",
  description:
    "Every template you own, in one place. Browse your purchased and free invitations, check custom URLs, and start creating.",

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
    title: "Your Riwainvite Library",
    description:
      "All your owned invitation templates — premium, free, and custom URLs — ready to turn into your next event.",
    url: pageUrl,
    siteName: "Riwainvite",
    images: [
      {
        url: ogImage,
        width: 1200,
        height: 630,
        alt: "Riwainvite User Library",
      },
    ],
    locale: "en_US",
    type: "website",
  },

  // Twitter (X) Sharing
  twitter: {
    card: "summary_large_image",
    title: "Your Riwainvite Library",
    description:
      "All your owned invitation templates — premium, free, and custom URLs — ready to turn into your next event.",
    images: [ogImage],
  },

  // Browser Tab Icon (Favicon)
  icons: {
    icon: "/logo.png",
    shortcut: "/logo.png",
    apple: "/logo.png",
  },
};

export default async function LibraryPage() {
  const h = await headers();

  // 1. Read headers injected by proxy.ts.
  //    Auth is enforced by the proxy, so this page does not redirect itself.
  const id = h.get("x-user-id") ?? "";
  const email = h.get("x-user-email") ?? "";
  const first_name =
    h.get("x-user-first-name") || h.get("x-user-name") || "User";

  // 2. Fetch the full user record via the Axios-based server helper
  const dbUser = id ? await getUserServerSide(id) : null;

  // 3. Build the final user object (fallback to headers if the API fails)
  const user: LibraryUser = {
    id,
    email: dbUser?.email || email,
    first_name: dbUser?.first_name || first_name,
    last_name: dbUser?.last_name || "",
    phone_number: dbUser?.phone_number || "",
    created_at: dbUser?.created_at || undefined,
  };

  // 4. Render the Client Component with the data
  return <UserLibraryClient user={user} />;
}