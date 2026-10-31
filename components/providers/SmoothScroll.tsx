"use client";

import { useEffect, useMemo } from "react";
import { usePathname } from "next/navigation";
import { useReducedMotion } from "framer-motion";
import { ReactLenis, useLenis } from "lenis/react";

/**
 * While one of these is on the page, scroll is meant to be locked (a modal is open),
 * so the self-heal below leaves it alone. Add data-scroll-lock to any other
 * scroll-locking UI (mobile menu, lightbox) that doesn't use aria-modal.
 */
const LOCK_SELECTOR = '[aria-modal="true"], [data-scroll-lock]';

/**
 * Keeps Lenis honest. Handles the usual reasons smooth scrolling "just stops":
 *  1. Lenis left in the stopped state, or body overflow left on "hidden",
 *     after a modal closes (or its exit animation hangs).
 *  2. Page height changing (API content, images, route changes) without Lenis re-measuring.
 */
function LenisGuard() {
  const lenis = useLenis();
  const pathname = usePathname();

  // Re-measure on route change and whenever the document's height changes.
  useEffect(() => {
    if (!lenis) return;

    let frame = 0;
    const resize = () => {
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(() => lenis.resize());
    };

    const observer = new ResizeObserver(resize);
    observer.observe(document.body);
    window.addEventListener("load", resize);
    resize();

    return () => {
      cancelAnimationFrame(frame);
      observer.disconnect();
      window.removeEventListener("load", resize);
    };
  }, [lenis, pathname]);

  // Self-heal: if the person scrolls while nothing should be locking the page, unlock it.
  // Runs in the capture phase, so it fires before Lenis handles the same wheel event.
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

  // Stable reference: a new options object on every render makes Lenis rebuild itself,
  // which resets its scroll state (a common cause of it freezing after navigation).
  const options = useMemo(
    () => ({
      lerp: 0.08, // was 0.09: a touch softer, still responsive
      wheelMultiplier: 0.85, // a little less distance per wheel tick
      smoothWheel: !reduce, // native scrolling when reduced motion is on
    }),
    [reduce],
  );

  // Let AdminShell handle its own internal scroll, bypass global Lenis
  if (pathname?.startsWith("/admin")) return <>{children}</>;

  return (
    <ReactLenis root options={options}>
      <LenisGuard />
      {children}
    </ReactLenis>
  );
}