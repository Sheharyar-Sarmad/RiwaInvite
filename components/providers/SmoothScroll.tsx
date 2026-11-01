"use client";

import { useEffect, useMemo } from "react";
import { usePathname } from "next/navigation";
import { useReducedMotion } from "framer-motion";
import { ReactLenis, useLenis } from "lenis/react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";

if (typeof window !== "undefined") {
  gsap.registerPlugin(ScrollTrigger);
}

const LOCK_SELECTOR = '[aria-modal="true"], [data-scroll-lock]';

function LenisGuard() {
  const lenis = useLenis();
  const pathname = usePathname();

  // Sync Lenis with GSAP ScrollTrigger
  useEffect(() => {
    if (!lenis) return;

    // 1. Tell ScrollTrigger to update when Lenis scrolls
    lenis.on("scroll", ScrollTrigger.update);

    // 2. Tell GSAP to drive Lenis's raf loop
    const updateTicker = (time: number) => {
      lenis.raf(time * 1000);
    };
    gsap.ticker.add(updateTicker);
    gsap.ticker.lagSmoothing(0);

    return () => {
      lenis.off("scroll", ScrollTrigger.update);
      gsap.ticker.remove(updateTicker);
    };
  }, [lenis]);

  // Re-measure on route change
  useEffect(() => {
    if (!lenis) return;

    let frame = 0;
    const resize = () => {
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(() => {
        lenis.resize();
        ScrollTrigger.refresh(); // Tell GSAP to recalculate pin distances
      });
    };

    // We only listen to window resize, NOT ResizeObserver on body
    // (ResizeObserver on body conflicts with GSAP pin-spacers)
    window.addEventListener("resize", resize);
    resize();

    return () => {
      cancelAnimationFrame(frame);
      window.removeEventListener("resize", resize);
    };
  }, [lenis, pathname]);

  // Self-heal
  useEffect(() => {
    if (!lenis) return;

    const heal = () => {
      if (document.querySelector(LOCK_SELECTOR)) return;
      if (lenis.isStopped) lenis.start();
      if (document.body.style.overflow === "hidden") document.body.style.overflow = "";
    };

    window.addEventListener("wheel", heal, { passive: true, capture: true });
    return () => window.removeEventListener("wheel", heal, { capture: true });
  }, [lenis]);

  return null;
}

export function SmoothScroll({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const reduce = !!useReducedMotion();

  const options = useMemo(
    () => ({
      lerp: 0.08,
      wheelMultiplier: 0.85,
      smoothWheel: !reduce,
    }),
    [reduce],
  );

  if (pathname?.startsWith("/admin")) return <>{children}</>;

  return (
    <ReactLenis root options={options}>
      <LenisGuard />
      {children}
    </ReactLenis>
  );
}