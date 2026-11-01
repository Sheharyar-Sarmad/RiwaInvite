"use client";

import { useRef, useCallback } from "react";
import Link from "next/link";
import { motion, useReducedMotion } from "framer-motion";
import { ArrowRight } from "lucide-react";

const EASE = [0.16, 1, 0.3, 1] as const;

export function EthosCta() {
  const reduce = useReducedMotion() ?? false;

  // --- Interactive Background Logic (From WhyRiwainvite) ---
  const sectionRef = useRef<HTMLElement>(null);
  const raf = useRef(0);

  const onMove = useCallback((e: React.PointerEvent) => {
    if (e.pointerType === "touch") return;
    const { clientX: x, clientY: y } = e;
    cancelAnimationFrame(raf.current);
    raf.current = requestAnimationFrame(() => {
      sectionRef.current?.style.setProperty("--mx", `${x}px`);
      sectionRef.current?.style.setProperty("--my", `${y}px`);
    });
  }, []);

  const mask = "radial-gradient(230px circle at var(--mx,-999px) var(--my,-999px), #000 0%, transparent 100%)";

  return (
    <section
      ref={sectionRef}
      onPointerMove={onMove}
      className="relative isolate w-full overflow-hidden bg-[#fdeadb] py-24 sm:py-32"
    >
      {/* 1. EXACT WHYRIWAINVITE INTERACTIVE BACKGROUND */}
      <div aria-hidden className="pointer-events-none absolute inset-0 -z-10">
        {/* Base gradient */}
        <div className="absolute inset-0 bg-gradient-to-b from-[#fbdcc0] via-[#fff4ea] to-[#fdeadb]" />
        
        {/* Floating ambient light orbs */}
        <motion.div
          animate={reduce ? undefined : { x: [0, -60, 0], y: [0, 30, 0] }}
          transition={{ duration: 18, repeat: Infinity, ease: "easeInOut" }}
          className="absolute -right-32 top-10 h-[420px] w-[420px] rounded-full bg-orange-300/30 blur-[120px]"
        />
        <motion.div
          animate={reduce ? undefined : { x: [0, 50, 0], y: [0, -40, 0] }}
          transition={{ duration: 22, repeat: Infinity, ease: "easeInOut" }}
          className="absolute -left-32 bottom-0 h-[420px] w-[420px] rounded-full bg-amber-300/30 blur-[120px]"
        />

        {/* Static Base Dots */}
        <div
          className="absolute inset-0"
          style={{ 
            backgroundImage: "radial-gradient(circle, rgba(194,65,12,0.2) 1.5px, transparent 1.5px)", 
            backgroundSize: "24px 24px" 
          }}
        />
        
        {/* Interactive Spotlight Dots */}
        <div
          className="absolute inset-0"
          style={{
            backgroundImage: "radial-gradient(circle, rgba(234,88,12,0.95) 2px, transparent 2px)",
            backgroundSize: "24px 24px",
            maskImage: mask,
            WebkitMaskImage: mask,
          }}
        />
      </div>

      <div className="relative z-10 mx-auto w-full max-w-5xl px-4 text-center sm:px-6 lg:px-12">
        <motion.div
          initial={reduce ? false : { opacity: 0, y: 40 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-100px" }}
          transition={{ duration: 0.8, ease: EASE }}
          className="flex flex-col items-center"
        >
          <h2 className="mb-6 font-[family-name:var(--font-display)] text-4xl font-bold leading-[1.1] tracking-tight text-gray-900 sm:text-5xl md:text-6xl lg:text-7xl">
            Join the{" "}
            <span className="bg-gradient-to-r from-[#f97316] to-amber-500 bg-clip-text text-transparent">
              paperless
            </span>{" "}
            revolution.
          </h2>

          <p className="mb-10 max-w-2xl font-[family-name:var(--font-body)] text-lg font-medium leading-relaxed text-gray-700 sm:text-xl">
            Create an invitation that leaves a mark, not a carbon footprint. 
            Design for free, publish in minutes, and track every RSVP in real-time.
          </p>

          <div className="flex flex-col items-center gap-4 sm:flex-row">
            <Link
              href="/register"
              className="group inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-xl bg-[#f97316] px-8 py-4 font-[family-name:var(--font-display)] text-base font-bold text-white shadow-[0_10px_40px_-10px_rgba(249,115,22,0.6)] transition-all duration-300 hover:scale-[1.02] hover:bg-[#ea580c] hover:shadow-[0_15px_50px_-10px_rgba(249,115,22,0.8)]"
            >
              Start Designing — Free
              <ArrowRight className="h-5 w-5 transition-transform group-hover:translate-x-1" />
            </Link>
            
            <Link
              href="/templates"
              className="inline-flex items-center justify-center whitespace-nowrap rounded-xl border border-gray-200 bg-white/70 px-8 py-4 font-[family-name:var(--font-display)] text-base font-bold text-gray-900 shadow-sm backdrop-blur-md transition-all duration-300 hover:bg-gray-50 hover:border-gray-300"
            >
              Explore Templates
            </Link>
          </div>
        </motion.div>
      </div>
    </section>
  );
}