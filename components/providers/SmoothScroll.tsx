"use client";
import { ReactLenis } from "lenis/react";
import { usePathname } from "next/navigation";

export function SmoothScroll({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  if (pathname.startsWith("/admin")) return <>{children}</>;
  return <ReactLenis root options={{ lerp: 0.09, smoothWheel: true }}>{children}</ReactLenis>;
}