"use client";

import { useCallback, useEffect, useRef } from "react";
import Image from "next/image";
import Link from "next/link";
import { motion, useReducedMotion } from "framer-motion";
import { CinematicStage } from "./CinematicStage";
import { LOGIN_SCENES } from "./LoginScenes";
import { LoginForm } from "@/components/public/forms/LoginForm";

const EASE: [number, number, number, number] = [0.76, 0, 0.24, 1];
const ENTER = 0.95; // seconds: when the form card starts
const MASK = "radial-gradient(240px circle at var(--mx,-999px) var(--my,-999px), #000 0%, transparent 100%)";

export function LoginClient() {
  const reduce = useReducedMotion() ?? false;
  const paneRef = useRef<HTMLDivElement>(null);
  const raf = useRef(0);

  const onMove = useCallback((e: React.PointerEvent<HTMLDivElement>) => {
    if (e.pointerType === "touch") return;
    const el = paneRef.current;
    if (!el) return;
    const { clientX, clientY } = e;
    cancelAnimationFrame(raf.current);
    raf.current = requestAnimationFrame(() => {
      const r = el.getBoundingClientRect();
      el.style.setProperty("--mx", `${clientX - r.left}px`);
      el.style.setProperty("--my", `${clientY - r.top}px`);
    });
  }, []);

  const onLeave = useCallback(() => {
    cancelAnimationFrame(raf.current);
    paneRef.current?.style.setProperty("--mx", "-999px");
    paneRef.current?.style.setProperty("--my", "-999px");
  }, []);

  useEffect(() => () => cancelAnimationFrame(raf.current), []);

  return (
    <div className="flex h-[100dvh] w-full overflow-hidden bg-[#fdeadb]">
      {/* LEFT: Cinematic stage (Passing LOGIN_SCENES) */}
      <CinematicStage scenes={LOGIN_SCENES} />

      {/* RIGHT: dotted background + scrolling form */}
      <div
        ref={paneRef}
        onPointerMove={onMove}
        onPointerLeave={onLeave}
        className="relative isolate h-full w-full overflow-hidden lg:w-1/2"
      >
        <motion.div
          aria-hidden
          initial={reduce ? false : { opacity: 0, scale: 1.12 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 1.8, delay: 0.5, ease: [0.16, 1, 0.3, 1] }}
          className="pointer-events-none absolute inset-0 -z-10 overflow-hidden"
        >
          <div className="absolute inset-0 bg-gradient-to-b from-[#fff4ea] to-[#fdeadb]" />
          <motion.div
            animate={reduce ? undefined : { x: [0, 60, 0], y: [0, 30, 0] }}
            transition={{ duration: 18, repeat: Infinity, ease: "easeInOut" }}
            className="absolute -right-32 top-10 h-[420px] w-[420px] rounded-full bg-orange-300/30 blur-[120px]"
          />
          <motion.div
            animate={reduce ? undefined : { x: [0, -50, 0], y: [0, -40, 0] }}
            transition={{ duration: 22, repeat: Infinity, ease: "easeInOut" }}
            className="absolute -left-32 bottom-0 h-[420px] w-[420px] rounded-full bg-amber-300/30 blur-[120px]"
          />
          <div
            className="absolute inset-0"
            style={{
              backgroundImage: "radial-gradient(circle, rgba(194,65,12,0.22) 1.5px, transparent 1.5px)",
              backgroundSize: "24px 24px",
            }}
          />
          <div
            className="absolute inset-0"
            style={{
              background: "radial-gradient(380px circle at var(--mx,-999px) var(--my,-999px), rgba(251,146,60,0.2), transparent 70%)",
            }}
          />
          <div
            className="absolute inset-0"
            style={{
              backgroundImage: "radial-gradient(circle, rgba(234,88,12,0.95) 2px, transparent 2px)",
              backgroundSize: "24px 24px",
              maskImage: MASK,
              WebkitMaskImage: MASK,
            }}
          />
          <div className="absolute inset-x-0 top-0 h-16 bg-gradient-to-b from-[#fff4ea]/70 to-transparent" />
          <div className="absolute inset-x-0 bottom-0 h-16 bg-gradient-to-t from-[#fdeadb]/70 to-transparent" />
        </motion.div>

        <div
          data-lenis-prevent
          className="h-full overflow-y-auto overscroll-contain [scrollbar-gutter:stable] [scrollbar-width:thin] [scrollbar-color:rgba(234,88,12,0.4)_transparent]"
        >
          <div className="flex min-h-full items-center justify-center px-4 py-10 sm:px-8 sm:py-14">
            <div className="w-full max-w-lg">
              <motion.div
                initial={reduce ? false : { opacity: 0, y: -18 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.8, delay: 0.6, ease: [0.16, 1, 0.3, 1] }}
                className="mb-8 flex justify-center lg:hidden"
              >
                <Link href="/" className="flex items-center gap-3">
                  <Image src="/logo.png" alt="Riwainvite" width={40} height={40} />
                  <span className="font-[family-name:var(--font-display)] text-2xl font-bold text-gray-900">
                    Riwainvite
                  </span>
                </Link>
              </motion.div>

              <LoginForm enterDelay={ENTER} />
            </div>
          </div>
        </div>

        {/* Entrance curtain */}
        {!reduce && (
          <motion.div
            aria-hidden
            initial={{ x: "0%" }}
            animate={{ x: "104%" }}
            transition={{ duration: 1.25, delay: 0.25, ease: EASE }}
            className="pointer-events-none absolute inset-0 z-30 bg-gradient-to-br from-[#fb923c] via-[#ea580c] to-[#9a3412]"
          >
            <div
              className="absolute inset-0 opacity-30"
              style={{
                backgroundImage: "radial-gradient(circle, rgba(255,255,255,0.9) 1.5px, transparent 1.5px)",
                backgroundSize: "24px 24px",
              }}
            />
            <div className="absolute inset-y-0 left-0 w-px bg-white/80 shadow-[0_0_30px_6px_rgba(255,255,255,0.7)]" />
            <div className="absolute inset-y-0 right-full w-40 bg-gradient-to-l from-orange-500/35 to-transparent" />
          </motion.div>
        )}
      </div>
    </div>
  );
}