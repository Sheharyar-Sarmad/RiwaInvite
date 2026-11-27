import type { Metadata, Viewport } from "next";
import { Bricolage_Grotesque, Geist } from "next/font/google";
import "./globals.css";
import settings from "@/config/settings_config";
import { Toaster } from "@/components/ui/toast";
import { SmoothScroll } from "@/components/providers/SmoothScroll";
import { PublicShell } from "@/components/public/sections/PublicShell";
import { CustomCursor } from "@/components/providers/CustomCursor";
import { Suspense } from "react";
import { SpeedInsights } from "@vercel/speed-insights/next";

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
        <Suspense fallback={null}>
          <SmoothScroll>
            <PublicShell>{children}</PublicShell>
          </SmoothScroll>
        </Suspense>

        <Suspense fallback={null}>
          <CustomCursor />
        </Suspense>
        <Toaster />
        <SpeedInsights />
      </body>
    </html>
  );
}