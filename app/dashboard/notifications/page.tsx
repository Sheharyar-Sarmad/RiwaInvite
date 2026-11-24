import type { Metadata } from "next";
import { headers } from "next/headers";
import { Suspense } from "react"; // ← added
import {
  UserNotificationsClient,
  type NotificationsUser,
} from "@/components/user/sections/notifications/UserNotificationsClient";
import settings from "@/config/settings_config";
import { getUserServerSide } from "@/lib/server/getUser";

const baseUrl = (settings().appUrl || "https://riwainvite.com").replace(/\/$/, "");
const pageUrl = `${baseUrl}/dashboard/notifications`;
const ogImage = `/og-user-notifications.png`;

export const metadata: Metadata = {
  title: "Notifications | Riwainvite",
  description:
    "Payments, plan updates and guest activity for your invitations, as they happen.",

  robots: {
    index: false,
    follow: false,
    googleBot: { index: false, follow: false },
  },

  openGraph: {
    title: "Riwainvite Notifications",
    description: "Everything that happens in your account, in one live feed.",
    url: pageUrl,
    siteName: "Riwainvite",
    images: [{ url: ogImage, width: 1200, height: 630, alt: "Riwainvite Notifications" }],
    locale: "en_US",
    type: "website",
  },

  twitter: {
    card: "summary_large_image",
    title: "Riwainvite Notifications",
    description: "Everything that happens in your account, in one live feed.",
    images: [ogImage],
  },

  icons: {
    icon: "/logo.png",
    shortcut: "/logo.png",
    apple: "/logo.png",
  },
};

// All dynamic access (headers + fetch) moved into a child async component
async function NotificationsContent() {
  const h = await headers();

  // Headers injected by proxy.ts (auth is enforced by the proxy).
  const id = h.get("x-user-id") ?? "";
  const email = h.get("x-user-email") ?? "";
  const first_name = h.get("x-user-first-name") || h.get("x-user-name") || "User";

  // Full user record, falling back to headers if the lookup fails.
  const dbUser = id ? await getUserServerSide(id) : null;

  const user: NotificationsUser = {
    id,
    email: dbUser?.email || email,
    first_name: dbUser?.first_name || first_name,
    last_name: dbUser?.last_name || "",
    phone_number: dbUser?.phone_number || "",
    created_at: dbUser?.created_at || undefined,
  };

  return <UserNotificationsClient user={user} />;
}

// Skeleton shown while the fetch streams in (brand: #fffafb / #f97316)
function NotificationsFallback() {
  return (
    <div className="min-h-screen bg-[#fffafb] p-6">
      <div className="mx-auto max-w-3xl space-y-4">
        <div className="h-8 w-48 animate-pulse rounded-lg bg-orange-100" />
        <div className="space-y-3">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="h-20 animate-pulse rounded-xl bg-orange-50" />
          ))}
        </div>
      </div>
    </div>
  );
}

export default function NotificationsPage() {
  return (
    <Suspense fallback={<NotificationsFallback />}>
      <NotificationsContent />
    </Suspense>
  );
}