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

/** Anything matching these scrolls natively and is ignored by Lenis. */
const LENIS_PREVENT_SELECTOR = [
  "[data-lenis-prevent]",
  '[role="dialog"]',
  '[role="alertdialog"]',
  '[aria-modal="true"]',
  "[data-radix-popper-content-wrapper]",
  "[data-radix-scroll-area-viewport]",
].join(", ");

/** Used to decide whether a body scroll lock is legitimate (a modal is open). */
const MODAL_SELECTOR = '[role="dialog"], [role="alertdialog"], [aria-modal="true"], [data-scroll-lock]';

const LENIS_CLASSES = ["lenis", "lenis-smooth", "lenis-stopped", "lenis-scrolling"];

/**
 * Admin routes run without Lenis, so nothing there cleans up a stuck scroll lock.
 * This guard removes leftover Lenis classes and any orphaned `overflow: hidden`
 * on <html>/<body> whenever no modal is open. It never touches modal code.
 */
function AdminScrollGuard() {
  useEffect(() => {
    const html = document.documentElement;
    const body = document.body;
    let raf = 0;

    const heal = () => {
      // Leftovers from a Lenis instance that ran on a previous route / hot reload
      LENIS_CLASSES.forEach((c) => {
        html.classList.remove(c);
        body.classList.remove(c);
      });

      if (document.querySelector(MODAL_SELECTOR)) return; // a modal legitimately owns the lock

      if (body.style.overflow === "hidden") body.style.overflow = "";
      if (html.style.overflow === "hidden") html.style.overflow = "";
    };

    const schedule = () => {
      cancelAnimationFrame(raf);
      raf = requestAnimationFrame(heal);
    };

    heal();

    const observer = new MutationObserver(schedule);
    observer.observe(body, { attributes: true, attributeFilter: ["style", "class"], childList: true, subtree: true });
    observer.observe(html, { attributes: true, attributeFilter: ["style", "class"] });

    return () => {
      cancelAnimationFrame(raf);
      observer.disconnect();
    };
  }, []);

  return null;
}

/**
 * Custom Event: 'lenis:lock' to stop scrolling, 'lenis:unlock' to resume.
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

    refresh();
    window.addEventListener("resize", refresh);

    resizeObserverRef.current = new ResizeObserver(() => refresh());
    resizeObserverRef.current.observe(document.body);

    return () => {
      cancelAnimationFrame(rafId);
      window.removeEventListener("resize", refresh);
      resizeObserverRef.current?.disconnect();
    };
  }, [lenis, pathname]);

  // 3. Self-healing scroll lock
  useEffect(() => {
    if (!lenis) return;

    const handleLock = () => {
      if (!lenis.isStopped) lenis.stop();
    };
    const handleUnlock = () => {
      if (lenis.isStopped) lenis.start();
    };

    window.addEventListener("lenis:lock", handleLock);
    window.addEventListener("lenis:unlock", handleUnlock);

    const cleanupOverflow = () => {
      if (document.body.style.overflow === "hidden" && !document.querySelector(MODAL_SELECTOR)) {
        document.body.style.overflow = "";
        handleUnlock();
      }
    };

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

  const options = useMemo(
    () => ({
      lerp: 0.08,
      wheelMultiplier: 0.9,
      touchMultiplier: 1.5,
      smoothWheel: !reduce,
      syncTouch: true,
      // Native scrolling inside any modal / dialog / marked container
      prevent: (node: HTMLElement) => !!node.closest(LENIS_PREVENT_SELECTOR),
    }),
    [reduce],
  );

  // Admin panel: no Lenis, but keep native scrolling healthy
  if (pathname?.startsWith("/admin")) {
    return (
      <>
        <AdminScrollGuard />
        {children}
      </>
    );
  }

  return (
    <ReactLenis root options={options}>
      <LenisManager />
      {children}
    </ReactLenis>
  );
}