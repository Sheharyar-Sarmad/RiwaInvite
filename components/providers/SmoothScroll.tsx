"use client";

import { ReactLenis } from "lenis/react";

// Place at: src/components/providers/smooth-scroll.tsx
export function SmoothScroll({ children }: { children: React.ReactNode }) {
  return (
    <ReactLenis
      root
      options={{
        lerp: 0.085,
        smoothWheel: true,
        wheelMultiplier: 0.95,
        touchMultiplier: 1.4,
      }}
    >
      {children}
    </ReactLenis>
  );
}