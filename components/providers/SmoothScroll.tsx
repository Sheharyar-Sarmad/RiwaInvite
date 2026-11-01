"use client";

import { useEffect, useMemo } from "react";
import { usePathname } from "next/navigation";
import { useReducedMotion } from "framer-motion";
import { ReactLenis, useLenis } from "lenis/react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";

if (typeof window !== "undefined") {
  gsap.registerPlugin(ScrollTrigger);
  // Prevents ScrollTrigger from refreshing on mobile URL bar resize
  ScrollTrigger.config({ ignoreMobileResize: true }); 
}

const LOCK_SELECTOR = '[aria-modal="true"], [data-scroll-lock]';

function LenisGuard() {
  const lenis = useLenis();
  const pathname = usePathname();

  // Sync Lenis with GSAP ScrollTrigger
  useEffect(() => {
    if (!lenis) return;

    lenis.on("scroll", ScrollTrigger.update);

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
        ScrollTrigger.refresh();
      });
    };

    window.addEventListener("resize", resize);
    resize();

    return () => {
      cancelAnimationFrame(frame);
      window.removeEventListener("resize", resize);
    };
  }, [lenis, pathname]);

  // Self-heal (Fixes Brave Shields occasionally blocking the scroll)
  useEffect(() => {
    if (!lenis) return;

    const heal = () => {
      // If a modal is open, don't interfere
      if (document.querySelector(LOCK_SELECTOR)) return;
      
      // Force Lenis to restart if it got stuck
      if (lenis.isStopped) lenis.start();
      
      // Ensure body overflow is clean
      if (document.body.style.overflow === "hidden") {
        document.body.style.overflow = "";
      }
    };

    // Capture wheel events to self-heal as soon as the user tries to scroll
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
      lerp: 0.1, 
      wheelMultiplier: 1, 
      touchMultiplier: 1.5, 
      smoothWheel: !reduce,
      // Add this to handle Brave's aggressive event handling
      syncTouch: true, 
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