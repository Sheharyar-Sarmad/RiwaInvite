"use client";

import { useEffect, useMemo, useRef } from "react";
import { usePathname } from "next/navigation";
import { useReducedMotion } from "framer-motion";
import { ReactLenis, useLenis } from "lenis/react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";

if (typeof window !== "undefined") {
  gsap.registerPlugin(ScrollTrigger);
  // Prevents GSAP from recalculating on mobile URL bar resize (fixes iOS jump)
  ScrollTrigger.config({ ignoreMobileResize: true }); 
}

/**
 * Custom Event: 'lenis:lock' to stop scrolling, 'lenis:unlock' to resume.
 * This is much safer than relying on body { overflow: hidden }
 */
function LenisManager() {
  const lenis = useLenis();
  const pathname = usePathname();
  const resizeObserverRef = useRef<ResizeObserver | null>(null);

  // 1. Sync Lenis with GSAP ScrollTrigger
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

  // 2. Handle Route Changes & Dynamic Content Resizing
  useEffect(() => {
    if (!lenis) return;

    let rafId = 0;
    const refresh = () => {
      cancelAnimationFrame(rafId);
      rafId = requestAnimationFrame(() => {
        lenis.resize();
        ScrollTrigger.refresh();
      });
    };

    // Refresh on route change
    refresh();

    // Refresh on window resize
    window.addEventListener("resize", refresh);

    // Refresh when the body height changes (e.g., data loaded, accordion opened)
    resizeObserverRef.current = new ResizeObserver(() => refresh());
    resizeObserverRef.current.observe(document.body);

    return () => {
      cancelAnimationFrame(rafId);
      window.removeEventListener("resize", refresh);
      resizeObserverRef.current?.disconnect();
    };
  }, [lenis, pathname]);

  // 3. The Bulletproof Self-Healing Scroll Lock
  useEffect(() => {
    if (!lenis) return;

    const handleLock = () => {
      if (!lenis.isStopped) lenis.stop();
    };
    const handleUnlock = () => {
      if (lenis.isStopped) lenis.start();
    };

    // Listen for custom events (dispatch these when modals open/close)
    window.addEventListener("lenis:lock", handleLock);
    window.addEventListener("lenis:unlock", handleUnlock);

    // Failsafe: If React leaves body overflow hidden, but no modal exists, clean it up
    const cleanupOverflow = () => {
      if (
        document.body.style.overflow === "hidden" &&
        !document.querySelector('[role="dialog"], [aria-modal="true"], [data-scroll-lock]')
      ) {
        document.body.style.overflow = "";
        handleUnlock();
      }
    };

    // Observe DOM changes to auto-clean orphaned locks
    const observer = new MutationObserver(cleanupOverflow);
    observer.observe(document.body, { attributes: true, attributeFilter: ["style"] });

    return () => {
      window.removeEventListener("lenis:lock", handleLock);
      window.removeEventListener("lenis:unlock", handleUnlock);
      observer.disconnect();
    };
  }, [lenis]);

  return null;
}

export function SmoothScroll({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const reduce = !!useReducedMotion();

  // 50M SaaS Config: Slow, buttery lerp + optimized touch handling
  const options = useMemo(
    () => ({
      lerp: 0.08, // Buttery smooth (lower = smoother, 0.08 is perfect for SaaS)
      wheelMultiplier: 0.9, // Slightly dampened mouse wheel for control
      touchMultiplier: 1.5, // Native feel on mobile
      smoothWheel: !reduce, // Respect OS accessibility
      syncTouch: true, // CRITICAL: Stops iOS Safari momentum from fighting Lenis
    }),
    [reduce],
  );

  // Optional: Skip smooth scroll in the Admin Panel (where scrolling fast matters more)
  if (pathname?.startsWith("/admin")) return <>{children}</>;

  return (
    <ReactLenis root options={options}>
      <LenisManager />
      {children}
    </ReactLenis>
  );
}