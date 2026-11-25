"use client";

import { usePathname } from "next/navigation";
import { Navbar } from "@/components/public/navigation/Navbar";
import { Footer } from "@/components/public/navigation/Footer";

// Pages that render their own full-screen layout (no public Navbar/Footer)
const BARE_ROUTES = ["/admin", "/dashboard", "/login", "/register", "/invite"];

export function PublicShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname() ?? "";

  const isBare = BARE_ROUTES.some(
    (route) => pathname === route || pathname.startsWith(`${route}/`),
  );

  if (isBare) return <>{children}</>;

  return (
    <div className="flex min-h-screen flex-col">
      <Navbar />
      <main className="flex-1 pt-20">{children}</main>
      <Footer />
    </div>
  );
}