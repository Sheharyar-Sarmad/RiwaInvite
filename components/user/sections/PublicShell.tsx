"use client";

import { usePathname } from "next/navigation";
import { Navbar } from "@/components/user/navigation/Navbar";
import { Footer } from "@/components/user/navigation/Footer";

export function PublicShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();

  // Define the routes that should NOT have the public Navbar/Footer
  const protectedRoutes = ["/admin", "/dashboard", "/login", "/register"];
  
  const isProtected = protectedRoutes.some((route) => pathname.startsWith(route));

  // If it's a dashboard or auth page, just return the children as-is
  if (isProtected) {
    return <>{children}</>;
  }

  // For all public pages (Landing, Templates, Plans, etc.)
  return (
    <div className="flex min-h-screen flex-col">
      <Navbar />
      {/* pt-20 pushes the content down so it's not hidden behind the fixed Navbar */}
      <main className="flex-1 pt-20">
        {children}
      </main>
      <Footer />
    </div>
  );
}