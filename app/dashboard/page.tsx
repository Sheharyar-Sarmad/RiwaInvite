import type { Metadata } from "next";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { UserDashboardClient } from "@/components/user/sections/dashboard/UserDashboardClient";
import settings from "@/config/settings_config";

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

/*  Page Component                                                            */
export default async function DashboardPage() {
  const h = await headers();

  const id = h.get("x-user-id");
  const email = h.get("x-user-email");
  const first_name = h.get("x-user-first-name") || h.get("x-user-name") || "User";

  if (!id || !email) redirect("/login");

  let userRecord: any = null;

  try {
    const host = h.get("host");
    const protocol = process.env.NODE_ENV === "production" ? "https" : "http";
    const res = await fetch(
      `${protocol}://${host}/api/v1/user/dashboard/account_settings`,
      {
        headers: {
          "x-user-id": id,
          "x-user-email": email,
          "x-user-name": first_name,
        },
        cache: "no-store",
      },
    );
    if (res.ok) userRecord = (await res.json()).user;
  } catch (error) {
    console.error("Failed to fetch user settings via API:", error);
  }

  const user = {
    id,
    email: userRecord?.email || email,
    first_name: userRecord?.first_name || first_name,
    last_name: userRecord?.last_name || "",
    phone_number: userRecord?.phone_number || "",
    created_at: userRecord?.created_at || undefined, // powers "Member Since"
  };

  // NO <UserShell> here, the layout already provides it.
  return <UserDashboardClient user={user} />;
}