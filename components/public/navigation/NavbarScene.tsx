"use client";

import dynamic from "next/dynamic";
import { useEffect, useRef, useState } from "react";

/**
 * Premium Navbar Backdrop (loader/wrapper)
 * The Three.js / R3F code lives in NavbarSceneCanvas and is only downloaded
 * after the navbar is in view AND the browser is idle, so it never competes
 * with first paint / LCP. Until then the navbar shows the same masked, transparent
 * layer it always had (just without particles).
 */
const NavbarSceneCanvas = dynamic(
  () => import("./NavbarSceneCanvas").then((m) => m.NavbarSceneCanvas),
  { ssr: false },
);

export function NavbarScene({ paused = false }: { paused?: boolean }) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [load, setLoad] = useState(false); // download + mount the 3D scene (once)
  const [inView, setInView] = useState(false);
  const [tabHidden, setTabHidden] = useState(false);
  const [reduceMotion, setReduceMotion] = useState(false);
  const [ready, setReady] = useState(false);

  // Check for reduced motion preference
  useEffect(() => {
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    const sync = () => setReduceMotion(mq.matches);
    sync();
    mq.addEventListener("change", sync);
    return () => mq.removeEventListener("change", sync);
  }, []);

  // Stop rendering if the tab is hidden (performance saver)
  useEffect(() => {
    const onVis = () => setTabHidden(document.hidden);
    onVis();
    document.addEventListener("visibilitychange", onVis);
    return () => document.removeEventListener("visibilitychange", onVis);
  }, []);

  // Visibility-based activation: load once when first visible (during idle time),
  // and pause rendering whenever the navbar is scrolled out of view.
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;

    let scheduled = false;
    let idleId = 0;
    let timeoutId = 0;

    const arm = () => {
      if (scheduled) return;
      scheduled = true;
      const start = () => setLoad(true);
      if (typeof window.requestIdleCallback === "function") {
        idleId = window.requestIdleCallback(start, { timeout: 2000 });
      } else {
        timeoutId = window.setTimeout(start, 300);
      }
    };

    const io = new IntersectionObserver(
      ([entry]) => {
        setInView(entry.isIntersecting);
        if (entry.isIntersecting) arm();
      },
      { rootMargin: "100px" },
    );
    io.observe(el);

    return () => {
      io.disconnect();
      if (idleId && typeof window.cancelIdleCallback === "function") window.cancelIdleCallback(idleId);
      if (timeoutId) window.clearTimeout(timeoutId);
    };
  }, []);

  // Fade out the edges so it blends perfectly with the navbar
  const fade = "linear-gradient(to right, transparent, black 10%, black 90%, transparent)";

  const frameloop: "always" | "demand" | "never" =
    paused || tabHidden || !inView ? "never" : reduceMotion ? "demand" : "always";

  return (
    <div
      ref={containerRef}
      aria-hidden
      className="pointer-events-none absolute inset-0 -z-10 overflow-hidden"
      style={{ maskImage: fade, WebkitMaskImage: fade }}
    >
      {load && (
        <div
          className="absolute inset-0"
          style={{ opacity: ready ? 1 : 0, transition: "opacity 400ms ease" }}
        >
          <NavbarSceneCanvas frameloop={frameloop} onReady={() => setReady(true)} />
        </div>
      )}
    </div>
  );
}