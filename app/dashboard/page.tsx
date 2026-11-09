import type { Metadata } from "next";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { UserDashboardClient } from "@/components/user/sections/dashboard/UserDashboardClient";
import settings from "@/config/settings_config";
import { getUserServerSide } from "@/lib/server/getUser";

/*  Exceptional SEO & Social Metadata */
export const metadata: Metadata = {
  title: "Dashboard | Riwainvite",
  description:
    "Manage your invitations, track real-time RSVPs, and view your event analytics all in one place.",
  
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
    title: "Your Riwainvite Dashboard",
    description:
      "Track real-time RSVPs, manage your custom URLs, and view your event analytics.",
    url: `${settings().appUrl || "riwainvite.com"}/dashboard`,
    siteName: "Riwainvite",
    images: [
      {
        url: "/og-user-dashboard-image.png", 
        width: 1200,
        height: 630,
        alt: "Riwainvite User Dashboard",
      },
    ],
    locale: "en_US",
    type: "website",
  },

  // Twitter (X) Sharing
  twitter: {
    card: "summary_large_image",
    title: "Your Riwainvite Dashboard",
    description:
      "Track real-time RSVPs, manage your custom URLs, and view your event analytics.",
    images: ["/og-user-dashboard-image.png"],
  },

  // Browser Tab Icon (Favicon)
  icons: {
    icon: "/logo.png",
    shortcut: "/logo.png",
    apple: "/logo.png",
  },
};

export default async function DashboardPage() {
  const h = await headers();

  // 1. Extract headers injected by your proxy.ts middleware
  const id = h.get("x-user-id");
  const email = h.get("x-user-email");
  const first_name = h.get("x-user-first-name") || h.get("x-user-name") || "User";

  // 2. Protect the route
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
  return <UserDashboardClient user={user} />;
}