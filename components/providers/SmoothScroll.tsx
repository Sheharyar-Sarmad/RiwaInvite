"use client";

import { useEffect, useMemo, useSyncExternalStore } from "react";
import { usePathname } from "next/navigation";
import { ReactLenis, useLenis } from "lenis/react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";

if (typeof window !== "undefined") {
  gsap.registerPlugin(ScrollTrigger);
  // Prevents GSAP from recalculating on mobile URL bar resize (fixes iOS jump)
  ScrollTrigger.config({ ignoreMobileResize: true });
}

const LENIS_PREVENT_SELECTOR = [
  "[data-lenis-prevent]",
  '[role="dialog"]',
  '[role="alertdialog"]',
  '[aria-modal="true"]',
  "[data-radix-popper-content-wrapper]",
  "[data-radix-scroll-area-viewport]",
].join(", ");

const MODAL_SELECTOR =
  '[role="dialog"], [role="alertdialog"], [aria-modal="true"], [data-scroll-lock]';
const LENIS_CLASSES = [
  "lenis",
  "lenis-smooth",
  "lenis-stopped",
  "lenis-scrolling",
];

/* ------------------------ reduced motion (no framer) ----------------------- */

const REDUCE_QUERY = "(prefers-reduced-motion: reduce)";

function subscribeReduce(cb: () => void) {
  const mq = window.matchMedia(REDUCE_QUERY);
  mq.addEventListener("change", cb);
  return () => mq.removeEventListener("change", cb);
}
const getReduce = () => window.matchMedia(REDUCE_QUERY).matches;
const getReduceServer = () => false;

/** Replaces framer-motion's useReducedMotion so Framer isn't imported just for this. */
function useReducedMotionPref(): boolean {
  return useSyncExternalStore(subscribeReduce, getReduce, getReduceServer);
}

/* ----------------------------- scroll helpers ----------------------------- */

/** Nearest ancestor (not html/body) that has vertical overflow it can scroll. */
function findScroller(start: HTMLElement | null): HTMLElement | null {
  for (
    let el = start;
    el && el !== document.body && el !== document.documentElement;
    el = el.parentElement
  ) {
    if (el.scrollHeight <= el.clientHeight + 1) continue;
    if (/(auto|scroll|overlay)/.test(getComputedStyle(el).overflowY)) return el;
  }
  return null;
}

/** True if this element or any ancestor scroller can still move in the wheel direction. */
function canScrollFrom(start: HTMLElement | null, dy: number): boolean {
  for (
    let el = start;
    el && el !== document.body && el !== document.documentElement;
    el = el.parentElement
  ) {
    if (el.scrollHeight <= el.clientHeight + 1) continue;
    if (!/(auto|scroll|overlay)/.test(getComputedStyle(el).overflowY)) continue;
    if (
      dy < 0
        ? el.scrollTop > 0
        : el.scrollTop + el.clientHeight < el.scrollHeight - 1
    )
      return true;
  }
  return false;
}

/** Is the target inside a modal / full-screen fixed overlay? (works without any attributes) */
function inOverlay(target: HTMLElement): boolean {
  if (target.closest(LENIS_PREVENT_SELECTOR)) return true;
  for (
    let el: HTMLElement | null = target;
    el && el !== document.body;
    el = el.parentElement
  ) {
    if (getComputedStyle(el).position !== "fixed") continue;
    const r = el.getBoundingClientRect();
    if (
      r.width >= window.innerWidth * 0.95 &&
      r.height >= window.innerHeight * 0.95
    )
      return true;
  }
  return false;
}

/**
 * Runs first (window, capture phase) on every route.
 * - Nested scrollable under the cursor: hide the event from Lenis / other listeners so it scrolls natively.
 * - Inside an overlay with nothing left to scroll: block the page behind it from scrolling.
 *
 * Perf: the ancestor walk (getComputedStyle / getBoundingClientRect) used to run on every
 * wheel/touchmove event. The classification is now memoised per target for a short window,
 * so continuous scrolling over the same element does the walk once instead of per event.
 * canScrollFrom() still runs live because scrollTop changes constantly.
 */
function NestedScrollGuard() {
  useEffect(() => {
    type Info = {
      t: HTMLElement;
      ts: number;
      scroller: boolean;
      overlay: boolean | undefined;
    };
    let cache: Info | null = null;
    const TTL = 200;

    const classify = (t: HTMLElement): Info => {
      const now = performance.now();
      if (cache && cache.t === t && now - cache.ts < TTL) return cache;
      cache = {
        t,
        ts: now,
        scroller: findScroller(t) !== null,
        overlay: undefined,
      };
      return cache;
    };
    const overlayOf = (info: Info): boolean =>
      (info.overlay ??= inOverlay(info.t));

    const onWheel = (e: WheelEvent) => {
      if (e.ctrlKey || Math.abs(e.deltaY) < Math.abs(e.deltaX)) return;
      const t = e.target;
      if (!(t instanceof HTMLElement)) return;
      const info = classify(t);
      if (info.scroller) {
        e.stopImmediatePropagation(); // Lenis never sees it
        if (!canScrollFrom(t, e.deltaY) && overlayOf(info) && e.cancelable)
          e.preventDefault();
        return;
      }
      if (overlayOf(info) && e.cancelable) {
        e.stopImmediatePropagation();
        e.preventDefault();
      }
    };

    const onTouchMove = (e: TouchEvent) => {
      const t = e.target;
      if (t instanceof HTMLElement && classify(t).scroller)
        e.stopImmediatePropagation();
    };

    window.addEventListener("wheel", onWheel, {
      capture: true,
      passive: false,
    });
    window.addEventListener("touchmove", onTouchMove, {
      capture: true,
      passive: true,
    });
    return () => {
      cache = null;
      window.removeEventListener("wheel", onWheel, { capture: true });
      window.removeEventListener("touchmove", onTouchMove, { capture: true });
    };
  }, []);

  return null;
}

/**
 * Admin routes run without Lenis, so nothing else cleans up a stuck scroll lock.
 * Clears leftover Lenis classes and orphaned overflow: hidden when no modal is open.
 */
function AdminScrollGuard() {
  const pathname = usePathname();

  useEffect(() => {
    const html = document.documentElement;
    const body = document.body;

    const heal = () => {
      LENIS_CLASSES.forEach((c) => {
        html.classList.remove(c);
        body.classList.remove(c);
      });
      if (document.querySelector(MODAL_SELECTOR)) return;
      if (body.style.overflow === "hidden") body.style.overflow = "";
      if (html.style.overflow === "hidden") html.style.overflow = "";
    };

    heal();

    // Only the <html>/<body> attributes are watched (no subtree), so this stays cheap.
    const observer = new MutationObserver(heal);
    observer.observe(body, {
      attributes: true,
      attributeFilter: ["style", "class"],
    });
    observer.observe(html, {
      attributes: true,
      attributeFilter: ["style", "class"],
    });
    return () => observer.disconnect();
  }, [pathname]);

  return null;
}

/* ------------------------------ Lenis manager ----------------------------- */

function LenisManager() {
  const lenis = useLenis();
  const pathname = usePathname();

  // 1. Sync Lenis with GSAP ScrollTrigger.
  //    gsap.ticker is the ONLY frame loop driving Lenis (autoRaf is disabled in the
  //    provider options), so there is no duplicate requestAnimationFrame loop.
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

  // 2. Dynamic content resizing: one observer per Lenis instance (no longer recreated
  //    on every route change). Refreshes are debounced, skipped when the body size did
  //    not actually change, and deferred while the user is actively scrolling.
  useEffect(() => {
    if (!lenis) return;

    let rafId = 0;
    let timer = 0;
    let deferrals = 0;
    let lastW = document.body.offsetWidth;
    let lastH = document.body.offsetHeight;

    const doRefresh = () => {
      cancelAnimationFrame(rafId);
      rafId = requestAnimationFrame(() => {
        lenis.resize();
        ScrollTrigger.refresh();
      });
    };

    const schedule = () => {
      window.clearTimeout(timer);
      timer = window.setTimeout(() => {
        if (lenis.isScrolling && deferrals < 20) {
          deferrals++;
          schedule();
          return;
        }
        deferrals = 0;
        doRefresh();
      }, 120);
    };

    const ro = new ResizeObserver((entries) => {
      const r = entries[0]?.contentRect;
      if (!r) return;
      const w = Math.round(r.width);
      const h = Math.round(r.height);
      if (w === lastW && h === lastH) return;
      lastW = w;
      lastH = h;
      schedule();
    });
    ro.observe(document.body);
    window.addEventListener("resize", schedule);

    return () => {
      cancelAnimationFrame(rafId);
      window.clearTimeout(timer);
      window.removeEventListener("resize", schedule);
      ro.disconnect();
    };
  }, [lenis]);

  // 2b. Route changes: refresh once per navigation (and once when Lenis becomes ready)
  useEffect(() => {
    if (!lenis) return;
    const id = requestAnimationFrame(() => {
      lenis.resize();
      ScrollTrigger.refresh();
    });
    return () => cancelAnimationFrame(id);
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
      if (
        document.body.style.overflow === "hidden" &&
        !document.querySelector(MODAL_SELECTOR)
      ) {
        document.body.style.overflow = "";
        handleUnlock();
      }
    };

    const observer = new MutationObserver(cleanupOverflow);
    observer.observe(document.body, {
      attributes: true,
      attributeFilter: ["style"],
    });

    return () => {
      window.removeEventListener("lenis:lock", handleLock);
      window.removeEventListener("lenis:unlock", handleUnlock);
      observer.disconnect();
    };
  }, [lenis]);

  return null;
}

/* --------------------------------- Provider -------------------------------- */

export function SmoothScroll({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const reduce = useReducedMotionPref();

  const options = useMemo(
    () => ({
      lerp: 0.08,
      wheelMultiplier: 0.9,
      touchMultiplier: 1.5,
      smoothWheel: !reduce,
      syncTouch: true,
      // gsap.ticker drives lenis.raf() in LenisManager; don't run a second loop.
      autoRaf: false,
      // Native scrolling inside modals, marked containers, or any nested scroller
      prevent: (node: HTMLElement) =>
        !!node.closest(LENIS_PREVENT_SELECTOR) || !!findScroller(node),
    }),
    [reduce],
  );

  // Admin panel: no Lenis, but native scrolling is kept healthy
  if (pathname?.startsWith("/admin")) {
    return (
      <>
        <NestedScrollGuard />
        <AdminScrollGuard />
        {children}
      </>
    );
  }

  return (
    <ReactLenis root options={options}>
      <NestedScrollGuard />
      <LenisManager />
      {children}
    </ReactLenis>
  );
}