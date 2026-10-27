import type { Metadata, Viewport } from "next";
import { Bricolage_Grotesque, Geist } from "next/font/google";
import "./globals.css";
import settings from "@/config/settings_config";
import { Toaster } from "@/components/ui/toast";
import { SmoothScroll } from "@/components/providers/SmoothScroll";

// Display: characterful grotesque with optical sizing, for headings and brand moments
const display = Bricolage_Grotesque({
  subsets: ["latin"],
  display: "swap",
  variable: "--font-display",
  axes: ["opsz"],
});

// Body/UI: crisp, modern product sans
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
    apple: "/logo.png", // iOS home screen
  },
  openGraph: {
    title: "Riwainvite",
    description: "Create, send, and track beautiful event invitations.",
    images: [{ url: "/logo.png" }], // optional: link previews on WhatsApp, X and others
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
        className="flex min-h-full flex-col bg-background font-[family-name:var(--font-body)] text-foreground selection:bg-orange-500/25 selection:text-orange-900"
      >
        <SmoothScroll>{children}</SmoothScroll>
        <Toaster />
      </body>
    </html>
  );
}