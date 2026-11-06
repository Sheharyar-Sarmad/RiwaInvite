"use client";

import { useRef, useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  motion,
  useReducedMotion,
  useMotionValue,
  useSpring,
  useTransform,
  useMotionTemplate,
  type Variants,
} from "framer-motion";
import { ArrowRight, Copy, Check, ShieldCheck, Sparkles } from "lucide-react";

const CONFETTI_COLORS = ["#f97316", "#fb923c", "#fbbf24", "#10b981", "#34d399", "#ffffff"];

const list: Variants = {
  hidden: {},
  show: { transition: { staggerChildren: 0.1, delayChildren: 0.35 } },
};
const rise: Variants = {
  hidden: { opacity: 0, y: 22, filter: "blur(6px)" },
  show: {
    opacity: 1,
    y: 0,
    filter: "blur(0px)",
    transition: { duration: 0.7, ease: [0.16, 1, 0.3, 1] },
  },
};

export function CheckoutSuccessClient({ orderId }: { orderId: string }) {
  const reduce = useReducedMotion() ?? false;
  const sectionRef = useRef<HTMLDivElement>(null);
  const raf = useRef(0);
  const [copied, setCopied] = useState(false);

  // gentle 3D tilt
  const tiltX = useMotionValue(0);
  const tiltY = useMotionValue(0);
  const sx = useSpring(tiltX, { stiffness: 110, damping: 16, mass: 0.6 });
  const sy = useSpring(tiltY, { stiffness: 110, damping: 16, mass: 0.6 });
  const rotateY = useTransform(sx, [-0.5, 0.5], [-4, 4]);
  const rotateX = useTransform(sy, [-0.5, 0.5], [3, -3]);
  const glareX = useTransform(sx, [-0.5, 0.5], [0, 100]);
  const glareY = useTransform(sy, [-0.5, 0.5], [0, 100]);
  const glare = useMotionTemplate`radial-gradient(360px circle at ${glareX}% ${glareY}%, rgba(255,255,255,0.7), transparent 65%)`;
  const bgX = useTransform(sx, [-0.5, 0.5], [30, -30]);
  const bgY = useTransform(sy, [-0.5, 0.5], [20, -20]);

  const onMove = useCallback(
    (e: React.PointerEvent) => {
      if (e.pointerType === "touch") return;
      const { clientX: x, clientY: y } = e;
      cancelAnimationFrame(raf.current);
      raf.current = requestAnimationFrame(() => {
        sectionRef.current?.style.setProperty("--mx", `${x}px`);
        sectionRef.current?.style.setProperty("--my", `${y}px`);
        if (!reduce) {
          tiltX.set(x / window.innerWidth - 0.5);
          tiltY.set(y / window.innerHeight - 0.5);
        }
      });
    },
    [reduce, tiltX, tiltY]
  );
  const onLeave = useCallback(() => {
    tiltX.set(0);
    tiltY.set(0);
  }, [tiltX, tiltY]);
  useEffect(() => () => cancelAnimationFrame(raf.current), []);

  const mask =
    "radial-gradient(260px circle at var(--mx,-999px) var(--my,-999px), #000 0%, transparent 100%)";

  // Deterministic confetti burst (no Math.random during render)
  const confetti = useMemo(
    () =>
      Array.from({ length: 44 }, (_, i) => {
        const angle = (i / 44) * Math.PI * 2 + (i % 3) * 0.2;
        const dist = 180 + ((i * 53) % 260);
        return {
          x: Math.cos(angle) * dist,
          y: Math.sin(angle) * dist - 90,
          rot: ((i * 97) % 720) - 360,
          size: 6 + (i % 4) * 2,
          color: CONFETTI_COLORS[i % CONFETTI_COLORS.length],
          round: i % 3 === 0,
          delay: (i % 6) * 0.02,
        };
      }),
    []
  );

  const copyId = async () => {
    try {
      await navigator.clipboard.writeText(orderId);
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    } catch {
      /* clipboard unavailable */
    }
  };

  const shortId = orderId.length > 18 ? `${orderId.slice(0, 8)}…${orderId.slice(-6)}` : orderId;

  return (
    <div
      ref={sectionRef}
      onPointerMove={onMove}
      onPointerLeave={onLeave}
      className="relative isolate flex min-h-screen w-full items-center justify-center overflow-hidden bg-[#fdeadb] px-4 py-12 font-[family-name:var(--font-body)]"
    >
      {/* ================= BACKGROUND ================= */}
      <div aria-hidden className="pointer-events-none absolute inset-0 -z-10">
        <div className="absolute inset-0 bg-gradient-to-b from-[#fff4ea] via-[#fde3cc] to-[#fbc9a0]" />

        <motion.div style={{ x: bgX, y: bgY }} className="absolute inset-0">
          <motion.div
            animate={reduce ? undefined : { x: [0, 80, 0], y: [0, 40, 0], scale: [1, 1.15, 1] }}
            transition={{ duration: 18, repeat: Infinity, ease: "easeInOut" }}
            className="absolute -left-32 top-0 h-[460px] w-[460px] rounded-full bg-orange-400/35 blur-[120px]"
          />
          <motion.div
            animate={reduce ? undefined : { x: [0, -70, 0], y: [0, -50, 0], scale: [1, 1.2, 1] }}
            transition={{ duration: 22, repeat: Infinity, ease: "easeInOut" }}
            className="absolute -right-32 bottom-0 h-[480px] w-[480px] rounded-full bg-amber-400/35 blur-[120px]"
          />
          {/* emerald glow = "success" tint */}
          <motion.div
            animate={reduce ? undefined : { scale: [1, 1.2, 1], opacity: [0.5, 0.8, 0.5] }}
            transition={{ duration: 6, repeat: Infinity, ease: "easeInOut" }}
            className="absolute left-1/2 top-1/3 h-[380px] w-[380px] -translate-x-1/2 rounded-full bg-emerald-300/30 blur-[110px]"
          />
        </motion.div>

        {/* 3D grid floor */}
        <div
          className="absolute inset-x-0 bottom-0 h-[55%] overflow-hidden"
          style={{
            perspective: "500px",
            maskImage: "linear-gradient(to top, #000 10%, transparent 95%)",
            WebkitMaskImage: "linear-gradient(to top, #000 10%, transparent 95%)",
          }}
        >
          <motion.div
            className="absolute -inset-x-[50%] bottom-0 h-[200%] origin-bottom"
            style={{
              transform: "rotateX(68deg)",
              backgroundImage:
                "linear-gradient(rgba(234,88,12,0.35) 1.5px, transparent 1.5px), linear-gradient(90deg, rgba(234,88,12,0.35) 1.5px, transparent 1.5px)",
              backgroundSize: "64px 64px",
            }}
            animate={reduce ? undefined : { backgroundPositionY: ["0px", "64px"] }}
            transition={{ duration: 3, repeat: Infinity, ease: "linear" }}
          />
        </div>

        {/* dot grid + cursor reveal */}
        <div
          className="absolute inset-0"
          style={{
            backgroundImage: "radial-gradient(circle, rgba(194,65,12,0.18) 1.5px, transparent 1.5px)",
            backgroundSize: "24px 24px",
          }}
        />
        <div
          className="absolute inset-0"
          style={{
            backgroundImage: "radial-gradient(circle, rgba(234,88,12,0.95) 2px, transparent 2px)",
            backgroundSize: "24px 24px",
            maskImage: mask,
            WebkitMaskImage: mask,
          }}
        />

        {/* floating glass cubes */}
        {!reduce &&
          [
            { l: "8%", t: "20%", s: 56, d: 16, r: 0 },
            { l: "87%", t: "26%", s: 76, d: 20, r: 1.2 },
            { l: "13%", t: "70%", s: 44, d: 14, r: 2.4 },
            { l: "82%", t: "72%", s: 52, d: 18, r: 0.6 },
          ].map((c, i) => (
            <motion.div
              key={i}
              className="absolute hidden md:block"
              style={{ left: c.l, top: c.t, width: c.s, height: c.s, perspective: 700 }}
              animate={{ y: [0, -24, 0] }}
              transition={{ duration: c.d * 0.45, repeat: Infinity, ease: "easeInOut", delay: c.r }}
            >
              <motion.div
                className="relative h-full w-full"
                style={{ transformStyle: "preserve-3d" }}
                animate={{ rotateX: [0, 360], rotateY: [0, 360] }}
                transition={{ duration: c.d, repeat: Infinity, ease: "linear" }}
              >
                {["rotateY(0deg)", "rotateY(90deg)", "rotateY(180deg)", "rotateY(270deg)", "rotateX(90deg)", "rotateX(-90deg)"].map(
                  (t, f) => (
                    <span
                      key={f}
                      className="absolute inset-0 rounded-md border border-white/70 bg-gradient-to-br from-orange-200/70 via-orange-400/40 to-amber-300/60 shadow-[inset_0_0_18px_rgba(255,255,255,0.5)]"
                      style={{ transform: `${t} translateZ(${c.s / 2}px)` }}
                    />
                  )
                )}
              </motion.div>
            </motion.div>
          ))}

        <div
          className="absolute inset-0 opacity-[0.06] mix-blend-multiply"
          style={{
            backgroundImage:
              "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='160' height='160'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='.9' numOctaves='2'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E\")",
          }}
        />
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,transparent_55%,rgba(154,52,18,0.18)_100%)]" />
      </div>

      {/* ================= CARD ================= */}
      <div className="relative z-10 w-full max-w-md" style={{ perspective: 1400 }}>
        <motion.div
          aria-hidden
          className="pointer-events-none absolute inset-x-8 -bottom-10 h-14 rounded-[50%] bg-emerald-900/20 blur-2xl"
        />

        <motion.div
          initial={{ opacity: 0, y: 50, rotateX: 16, scale: 0.94 }}
          animate={{ opacity: 1, y: 0, rotateX: 0, scale: 1 }}
          transition={{ duration: 1, ease: [0.16, 1, 0.3, 1] }}
        >
          <motion.div
            variants={list}
            initial="hidden"
            animate="show"
            style={{ rotateX, rotateY, transformStyle: "preserve-3d" }}
            className="relative rounded-[2rem] p-10 text-center"
          >
            {/* glass layer with animated emerald→orange edge */}
            <div
              aria-hidden
              className="pointer-events-none absolute inset-0 overflow-hidden rounded-[2rem] shadow-[0_40px_80px_-30px_rgba(16,185,129,0.55)]"
            >
              <motion.div
                className="absolute -inset-[60%]"
                style={{
                  background:
                    "conic-gradient(from 0deg, transparent 0 55%, rgba(52,211,153,0.9) 68%, rgba(251,146,60,0.95) 80%, transparent 92%)",
                }}
                animate={reduce ? undefined : { rotate: 360 }}
                transition={{ duration: 7, repeat: Infinity, ease: "linear" }}
              />
              <div className="absolute inset-[1.5px] rounded-[calc(2rem-1.5px)] border border-white/60 bg-white/85 backdrop-blur-2xl" />
              <motion.div
                className="absolute inset-[1.5px] rounded-[calc(2rem-1.5px)] mix-blend-soft-light"
                style={{ background: glare }}
              />
            </div>

            {/* success badge + confetti */}
            <motion.div
              variants={rise}
              className="relative mx-auto mb-7 flex h-28 w-28 items-center justify-center"
              style={{ transform: "translateZ(50px)" }}
            >
              {/* expanding rings */}
              {!reduce &&
                [0, 1].map((i) => (
                  <motion.span
                    key={i}
                    className="pointer-events-none absolute inset-0 rounded-full border-2 border-emerald-400/60"
                    initial={{ scale: 0.8, opacity: 0 }}
                    animate={{ scale: [0.8, 1.9], opacity: [0.7, 0] }}
                    transition={{ duration: 2.4, repeat: Infinity, delay: 0.9 + i * 1.2, ease: "easeOut" }}
                  />
                ))}

              {/* confetti burst (once) */}
              {!reduce &&
                confetti.map((c, i) => (
                  <motion.span
                    key={i}
                    className="pointer-events-none absolute left-1/2 top-1/2"
                    style={{
                      width: c.size,
                      height: c.round ? c.size : c.size * 0.5,
                      marginLeft: -c.size / 2,
                      marginTop: -c.size / 2,
                      background: c.color,
                      borderRadius: c.round ? "9999px" : "2px",
                    }}
                    initial={{ x: 0, y: 0, opacity: 0, scale: 0.4, rotate: 0 }}
                    animate={{
                      x: c.x,
                      y: [0, c.y, c.y + 220],
                      opacity: [0, 1, 1, 0],
                      scale: 1,
                      rotate: c.rot,
                    }}
                    transition={{ duration: 2.4, delay: 0.7 + c.delay, ease: "easeOut" }}
                  />
                ))}

              {/* badge */}
              <motion.div
                initial={{ scale: 0, rotate: -90 }}
                animate={{ scale: 1, rotate: 0 }}
                transition={{ type: "spring", stiffness: 180, damping: 14, delay: 0.3 }}
                className="relative flex h-24 w-24 items-center justify-center rounded-full bg-gradient-to-br from-emerald-300 to-emerald-600 shadow-[0_20px_40px_-10px_rgba(16,185,129,0.8),inset_0_2px_4px_rgba(255,255,255,0.6)]"
              >
                <svg viewBox="0 0 52 52" className="h-12 w-12" fill="none">
                  <motion.path
                    d="M14 27 L23 36 L39 17"
                    stroke="white"
                    strokeWidth="5"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    initial={{ pathLength: 0 }}
                    animate={{ pathLength: 1 }}
                    transition={{ duration: 0.6, delay: 0.85, ease: "easeOut" }}
                  />
                </svg>
              </motion.div>
            </motion.div>

            <motion.span
              variants={rise}
              className="relative mb-3 inline-flex items-center gap-2 rounded-full border border-emerald-200 bg-white/90 px-4 py-1.5 text-xs font-semibold text-emerald-600 shadow-sm"
              style={{ transform: "translateZ(30px)" }}
            >
              <Sparkles className="h-3.5 w-3.5" /> Order confirmed
            </motion.span>

            <motion.h1
              variants={rise}
              className="relative mb-3 font-[family-name:var(--font-display)] text-3xl font-extrabold text-gray-900 sm:text-4xl"
              style={{ transform: "translateZ(40px)" }}
            >
              Payment successful
            </motion.h1>

            <motion.p variants={rise} className="relative mx-auto mb-6 max-w-xs text-sm font-medium text-gray-600">
              We verified your payment. Your template or plan is unlocked and ready to use.
            </motion.p>

            {/* order id */}
            {orderId && (
              <motion.div
                variants={rise}
                className="relative mb-8 flex items-center justify-between gap-3 rounded-2xl border border-dashed border-orange-200 bg-white/70 px-4 py-3 text-left"
              >
                <div className="min-w-0">
                  <p className="text-xs font-semibold text-gray-500">Order ID</p>
                  <p className="truncate font-mono text-sm font-bold text-gray-900">{shortId}</p>
                </div>
                <button
                  type="button"
                  onClick={copyId}
                  aria-label="Copy order ID"
                  className="flex shrink-0 items-center gap-1.5 rounded-lg border border-orange-200 bg-white px-3 py-1.5 text-xs font-bold text-orange-600 transition-colors hover:bg-orange-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-orange-300"
                >
                  {copied ? <Check className="h-3.5 w-3.5 text-emerald-500" /> : <Copy className="h-3.5 w-3.5" />}
                  {copied ? "Copied" : "Copy"}
                </button>
              </motion.div>
            )}

            {/* CTA (flat + on top so it is always clickable) */}
            <motion.div variants={rise} className="relative z-20">
              <Link
                href="/dashboard"
                className="group relative flex w-full items-center justify-center gap-2 overflow-hidden rounded-xl bg-gradient-to-b from-gray-800 to-gray-950 py-4 font-bold text-white shadow-[0_18px_40px_-14px_rgba(0,0,0,0.6),inset_0_1px_0_rgba(255,255,255,0.2)] transition-transform hover:-translate-y-0.5 hover:scale-[1.02] active:scale-[0.97] focus:outline-none focus-visible:ring-4 focus-visible:ring-orange-300"
              >
                {!reduce && (
                  <motion.span
                    aria-hidden
                    className="pointer-events-none absolute inset-y-0 -left-1/3 w-1/3 -skew-x-12 bg-gradient-to-r from-transparent via-white/25 to-transparent"
                    animate={{ x: ["0%", "450%"] }}
                    transition={{ duration: 2.2, repeat: Infinity, repeatDelay: 1.8, ease: "easeInOut" }}
                  />
                )}
                <span className="relative">Go to dashboard</span>
                <ArrowRight className="relative h-5 w-5 transition-transform group-hover:translate-x-1.5" />
              </Link>
            </motion.div>

            <motion.p
              variants={rise}
              className="relative mt-5 flex items-center justify-center gap-1.5 text-xs font-medium text-gray-500"
            >
              <ShieldCheck className="h-3.5 w-3.5 text-emerald-500" /> Verified by JazzCash
            </motion.p>
          </motion.div>
        </motion.div>
      </div>
    </div>
  );
}