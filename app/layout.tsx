import type { Metadata, Viewport } from "next";
import { Bricolage_Grotesque, Geist } from "next/font/google";
import "./globals.css";
import settings from "@/config/settings_config";
import { Toaster } from "@/components/ui/toast";
import { SmoothScroll } from "@/components/providers/SmoothScroll";
import { PublicShell } from "@/components/user/sections/PublicShell";
import { CustomCursor } from "@/components/providers/CustomCursor";

const display = Bricolage_Grotesque({
  subsets: ["latin"],
  display: "swap",
  variable: "--font-display",
  axes: ["opsz"],
});

const body = Geist({
  subsets: ["latin"],
  display: "swap",
  variable: "--font-body",
});

const config = settings();

export const metadata: Metadata = {
  metadataBase: new URL(config.appUrl),
  title: {
    default: "Riwainvite",
    template: "%s · Riwainvite",
  },
  description: "Create, send, and track beautiful event invitations.",
  icons: {
    icon: [{ url: "/logo.png", type: "image/png" }],
    shortcut: "/logo.png",
    apple: "/logo.png",
  },
  openGraph: {
    title: "Riwainvite",
    description: "Create, send, and track beautiful event invitations.",
    images: [{ url: "/logo.png" }],
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  colorScheme: "light",
  themeColor: "#fffdfa",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="en"
      suppressHydrationWarning
      className={`${display.variable} ${body.variable} h-full antialiased`}
    >
      <body
        suppressHydrationWarning
        className="flex min-h-full flex-col bg-background font-[family-name:var(--font-body)] text-foreground selection:bg-orange-500/25 selection:text-orange-900 cursor-default"
      >
          {/* 
            2. SmoothScroll — Lenis scroll hijacking, only active on the page body.
          */}
          <SmoothScroll>
            {/* 
              3. PublicShell — conditionally renders Navbar + Footer
                 (hidden on /admin, /dashboard, /login, /register).
            */}
            <PublicShell>{children}</PublicShell>
          </SmoothScroll>

        {/* 
          4. Global UI overlays — these intentionally sit OUTSIDE AppWrapper
             so they don't flash during loading, but stay mounted for the whole app lifecycle.
             - CustomCursor: pointer-following orange dot, z-index ~9999
             - Toaster: toast notifications, z-index ~50
             Both are below AppLoader's z-[999999], so the loader wipe covers them.
        */}
        <CustomCursor />
        <Toaster />
      </body>
    </html>
  );
}