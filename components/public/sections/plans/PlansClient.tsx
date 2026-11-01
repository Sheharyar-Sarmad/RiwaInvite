"use client";

import { ReactNode, useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import {
  AnimatePresence,
  animate,
  motion,
  useInView,
  useMotionTemplate,
  useMotionValue,
  usePresence,
  useReducedMotion,
  useScroll,
  useSpring,
  useTransform,
  Variants,
} from "framer-motion";
import {
  ArrowRight,
  Check,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Crown,
  LayoutTemplate,
  Minus,
  RefreshCw,
  Search,
  ShieldCheck,
  Sparkles,
  Star,
  X,
  Zap,
} from "lucide-react";
import { apiClient } from "@/lib/api/api_base";
// Your original select, used as-is. Adjust the path to wherever it lives.
import { AceternitySelect } from "@/components/ui/aceternity-select";

/* -------------------------------------------------------------------------- */
/*  Constants & helpers                                                       */
/* -------------------------------------------------------------------------- */

const EASE = [0.16, 1, 0.3, 1] as const;
const POPULAR_INDEX = 1;
const TEMPLATES_HREF = "/templates";
const planCheckoutHref = (planId: string) => `/checkout/plan/${planId}`;

const focusRing =
  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-500 focus-visible:ring-offset-2";

const primaryBtn =
  "bg-gradient-to-b from-[#fb8a3c] to-[#f97316] shadow-[0_10px_30px_-10px_rgba(249,115,22,0.8),inset_0_1px_0_rgba(255,255,255,0.3)]";

const formatter = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "PKR",
  maximumFractionDigits: 0,
});

export type PlanData = {
  id: string;
  name: string;
  description: string | null;
  price: number;
  durationDays: number;
  maxSimpleTemplates: number;
  maxPremiumTemplates: number;
  allowsCustomSlug: boolean;
};

type Feature = { label: string; active: boolean };

const periodLabel = (days: number) => (days === 30 ? "month" : days === 365 ? "year" : `${days} days`);
const durationLabel = (days: number) => (days === 30 ? "1 month" : days === 365 ? "1 year" : `${days} days`);
const isPremiumPlan = (p: PlanData) => p.price > 4000 || p.name.toLowerCase().includes("premium");
const totalTemplates = (p: PlanData) => p.maxSimpleTemplates + p.maxPremiumTemplates;
const perTemplate = (p: PlanData) => {
  const total = totalTemplates(p);
  return p.price > 0 && total > 0 ? Math.round(p.price / total) : 0;
};
const perDay = (p: PlanData) => (p.price > 0 && p.durationDays > 0 ? Math.round(p.price / p.durationDays) : 0);

/** Pushes an element toward the viewer inside a preserve-3d parent. */
const z = (n: number): React.CSSProperties => ({ transform: `translateZ(${n}px)` });
const preserve3d = { transformStyle: "preserve-3d" as const };

function buildFeatures(plan: PlanData, extended = false): Feature[] {
  const features: Feature[] = [
    { label: `${plan.maxSimpleTemplates} standard templates`, active: true },
    { label: `${plan.maxPremiumTemplates} premium templates`, active: true },
    { label: "Real-time RSVP tracking", active: true },
    { label: "Custom URL slug", active: plan.allowsCustomSlug },
    { label: "24/7 WhatsApp support", active: true },
  ];
  if (extended) features.push({ label: "AI Design Studio access", active: true });
  return features;
}

/* -------------------------------------------------------------------------- */
/*  Motion variants                                                           */
/* -------------------------------------------------------------------------- */

const containerVariants: Variants = {
  hidden: { opacity: 0 },
  show: { opacity: 1, transition: { staggerChildren: 0.14 } },
};

const itemVariants: Variants = {
  hidden: { opacity: 0, y: 32, filter: "blur(10px)" },
  show: { opacity: 1, y: 0, filter: "blur(0px)", transition: { duration: 0.8, ease: EASE } },
};

/** The three plan cards enter one after another with a long, deliberate stagger. */
const cardsContainer: Variants = {
  hidden: {},
  show: { transition: { staggerChildren: 0.2, delayChildren: 0.15 } },
};

/** Cards tip up from the page like panels being raised. */
const cardVariants: Variants = {
  hidden: { opacity: 0, y: 110, rotateX: -38, scale: 0.9, filter: "blur(12px)" },
  show: {
    opacity: 1,
    y: 0,
    rotateX: 0,
    scale: 1,
    filter: "blur(0px)",
    transition: { type: "spring", stiffness: 70, damping: 16, mass: 1.1 },
  },
};

const wordsParent: Variants = {
  hidden: {},
  show: { transition: { staggerChildren: 0.07, delayChildren: 0.1 } },
};

const wordChild: Variants = {
  hidden: { y: "115%", rotate: 4 },
  show: { y: 0, rotate: 0, transition: { duration: 0.9, ease: EASE } },
};

const listVariants: Variants = {
  hidden: {},
  show: { transition: { staggerChildren: 0.06 } },
};

const dirItemVariants: Variants = {
  hidden: { opacity: 0, y: 28, rotateX: -18, scale: 0.95 },
  show: { opacity: 1, y: 0, rotateX: 0, scale: 1, transition: { type: "spring", stiffness: 140, damping: 17 } },
};

const popVariants: Variants = {
  hidden: { opacity: 0, scale: 0.6, y: 14 },
  show: { opacity: 1, scale: 1, y: 0, transition: { type: "spring", stiffness: 260, damping: 15 } },
};

/* -------------------------------------------------------------------------- */
/*  Hooks                                                                     */
/* -------------------------------------------------------------------------- */

/** Pointer-driven 3D tilt with a cursor-following orange glow. */
function useTilt(max: number, reduce: boolean) {
  const px = useMotionValue(0);
  const py = useMotionValue(0);
  const sx = useSpring(px, { stiffness: 150, damping: 20 });
  const sy = useSpring(py, { stiffness: 150, damping: 20 });
  const rotateY = useTransform(sx, [-0.5, 0.5], [-max, max]);
  const rotateX = useTransform(sy, [-0.5, 0.5], [max, -max]);
  const gx = useMotionValue(-400);
  const gy = useMotionValue(-400);
  const glow = useMotionTemplate`radial-gradient(320px circle at ${gx}px ${gy}px, rgba(249,115,22,0.16), transparent 70%)`;
  const sheen = useMotionTemplate`radial-gradient(180px circle at ${gx}px ${gy}px, rgba(255,255,255,0.7), transparent 70%)`;

  const onPointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (e.pointerType === "touch") return;
    const r = e.currentTarget.getBoundingClientRect();
    const nx = (e.clientX - r.left) / r.width;
    const ny = (e.clientY - r.top) / r.height;
    px.set(nx - 0.5);
    py.set(ny - 0.5);
    gx.set(nx * r.width);
    gy.set(ny * r.height);
  };
  const onPointerLeave = () => {
    px.set(0);
    py.set(0);
    gx.set(-400);
    gy.set(-400);
  };

  return {
    glow,
    sheen,
    handlers: reduce ? {} : { onPointerMove, onPointerLeave },
    style: reduce ? {} : { rotateX, rotateY, transformPerspective: 1400, transformStyle: "preserve-3d" as const },
  };
}

function useModalBehavior(active: boolean, onClose: () => void) {
  useEffect(() => {
    if (!active) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = prev;
      window.removeEventListener("keydown", onKey);
    };
  }, [active, onClose]);
}

/* -------------------------------------------------------------------------- */
/*  Small building blocks                                                     */
/* -------------------------------------------------------------------------- */

/** Counts a number up when it scrolls into view. */
function CountUp({
  value,
  reduce,
  format = (n: number) => Math.round(n).toLocaleString(),
  delay = 0,
  duration = 1.4,
}: {
  value: number;
  reduce: boolean;
  format?: (n: number) => string;
  delay?: number;
  duration?: number;
}) {
  const ref = useRef<HTMLSpanElement>(null);
  const inView = useInView(ref, { once: true, margin: "-40px" });
  const mv = useMotionValue(reduce ? value : 0);
  const text = useTransform(mv, (v) => format(v));

  useEffect(() => {
    if (reduce) {
      mv.set(value);
      return;
    }
    if (!inView) return;
    const controls = animate(mv, value, { duration, delay, ease: EASE });
    return () => controls.stop();
  }, [inView, value, reduce, mv, duration, delay]);

  return (
    <motion.span ref={ref} className="tabular-nums">
      {text}
    </motion.span>
  );
}

function Price({ value, reduce, delay = 0 }: { value: number; reduce: boolean; delay?: number }) {
  return (
    <CountUp
      value={value}
      reduce={reduce}
      delay={delay}
      format={(v) => (value > 0 ? formatter.format(Math.round(v)) : "Free")}
    />
  );
}

function MaskedWords({
  id,
  words,
  gradientFrom,
  reduce,
}: {
  id?: string;
  words: string[];
  gradientFrom: number;
  reduce: boolean;
}) {
  return (
    <motion.h2
      id={id}
      aria-label={words.join(" ")}
      variants={wordsParent}
      initial={reduce ? "show" : "hidden"}
      whileInView="show"
      viewport={{ once: true, margin: "-80px" }}
      className="font-[family-name:var(--font-display)] text-4xl font-bold leading-[1.1] tracking-tight text-gray-900 sm:text-5xl lg:text-6xl"
    >
      {words.map((w, i) => (
        <span key={i} className="mr-[0.25em] inline-block overflow-hidden pb-[0.12em] align-bottom">
          <motion.span
            aria-hidden
            variants={wordChild}
            className={`inline-block origin-bottom-left ${
              i >= gradientFrom ? "bg-gradient-to-r from-[#f97316] via-amber-500 to-[#f97316] bg-clip-text text-transparent" : ""
            }`}
          >
            {w}
          </motion.span>
        </span>
      ))}
    </motion.h2>
  );
}

function AnimatedCheck({ active, tone, delay = 0 }: { active: boolean; tone: "light" | "dark"; delay?: number }) {
  const bg = active
    ? tone === "dark"
      ? "bg-orange-500/10 text-[#f97316]"
      : "bg-orange-100 text-[#f97316]"
    : tone === "dark"
    ? "bg-white/5 text-neutral-600"
    : "bg-gray-100 text-gray-400";
  return (
    <motion.span
      initial={{ scale: 0 }}
      whileInView={{ scale: 1 }}
      viewport={{ once: true }}
      transition={{ type: "spring", stiffness: 420, damping: 16, delay }}
      className={`mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full ${bg}`}
    >
      {active ? <Check className="h-3 w-3" strokeWidth={3} /> : <X className="h-3 w-3" strokeWidth={3} />}
    </motion.span>
  );
}

function ShineSweep({ width = "w-12", delay = 2.8 }: { width?: string; delay?: number }) {
  return (
    <motion.span
      aria-hidden
      className={`absolute inset-y-0 ${width} -skew-x-12 bg-white/30 blur-md`}
      initial={{ x: "-300%" }}
      animate={{ x: "1000%" }}
      transition={{ duration: 1.5, ease: "easeInOut", repeat: Infinity, repeatDelay: delay }}
    />
  );
}

/** "About PKR 33 per template · PKR 100 / day": makes the price feel concrete. */
function ValueLine({ plan, tone = "light" }: { plan: PlanData; tone?: "light" | "dark" }) {
  const pt = perTemplate(plan);
  const pd = perDay(plan);
  if (!pt && !pd) return null;
  const strong = tone === "dark" ? "text-white" : "text-gray-800";
  return (
    <p className={`text-xs font-medium ${tone === "dark" ? "text-neutral-400" : "text-gray-500"}`}>
      {pt > 0 && (
        <>
          About <b className={strong}>{formatter.format(pt)}</b> per template
        </>
      )}
      {pt > 0 && pd > 0 && " · "}
      {pd > 0 && (
        <>
          <b className={strong}>{formatter.format(pd)}</b> / day
        </>
      )}
    </p>
  );
}

/** Tiny dots drifting upward behind the section. Purely decorative. */
function FloatingSparks({ reduce }: { reduce: boolean }) {
  const sparks = useMemo(
    () =>
      Array.from({ length: 14 }, (_, i) => ({
        left: `${(i * 37 + 11) % 97}%`,
        top: `${(i * 53 + 7) % 90}%`,
        size: 3 + (i % 3) * 2,
        dur: 9 + (i % 5) * 2.5,
        delay: (i % 7) * 0.8,
      })),
    [],
  );
  if (reduce) return null;
  return (
    <>
      {sparks.map((s, i) => (
        <motion.span
          key={i}
          aria-hidden
          className="absolute rounded-full bg-orange-400/60"
          style={{ left: s.left, top: s.top, width: s.size, height: s.size }}
          animate={{ y: [0, -60, 0], opacity: [0, 0.9, 0], scale: [0.6, 1.2, 0.6] }}
          transition={{ duration: s.dur, delay: s.delay, repeat: Infinity, ease: "easeInOut" }}
        />
      ))}
    </>
  );
}

/** Real numbers pulled from the plans, counting up as the section arrives. */
function StatsStrip({ plans, reduce }: { plans: PlanData[]; reduce: boolean }) {
  const lowest = Math.min(...plans.map((p) => p.price).filter((n) => n > 0), Infinity);
  const mostTemplates = Math.max(...plans.map(totalTemplates), 0);
  const stats: { icon: typeof Zap; node: ReactNode; label: string }[] = [
    {
      icon: Zap,
      node: <CountUp value={plans.length} reduce={reduce} delay={0.4} />,
      label: plans.length === 1 ? "plan to choose from" : "plans to choose from",
    },
  ];
  if (Number.isFinite(lowest)) {
    stats.push({
      icon: Sparkles,
      node: <CountUp value={lowest} reduce={reduce} delay={0.5} format={(v) => formatter.format(Math.round(v))} />,
      label: "starting price",
    });
  }
  if (mostTemplates > 0) {
    stats.push({
      icon: LayoutTemplate,
      node: <CountUp value={mostTemplates} reduce={reduce} delay={0.6} />,
      label: "templates in the top plan",
    });
  }
  return (
    <motion.ul
      variants={{ hidden: {}, show: { transition: { staggerChildren: 0.12, delayChildren: 0.9 } } }}
      initial={reduce ? "show" : "hidden"}
      whileInView="show"
      viewport={{ once: true, margin: "-60px" }}
      className="mx-auto mt-10 flex max-w-3xl flex-wrap items-stretch justify-center gap-3"
    >
      {stats.map((s) => (
        <motion.li
          key={s.label}
          variants={popVariants}
          whileHover={reduce ? undefined : { y: -4 }}
          className="flex items-center gap-3 rounded-2xl border border-orange-200/60 bg-white/70 px-4 py-3 shadow-[0_16px_36px_-22px_rgba(249,115,22,0.6)] backdrop-blur-xl"
        >
          <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-orange-50 to-orange-100 text-[#f97316] ring-1 ring-orange-200/60">
            <s.icon className="h-4 w-4" />
          </span>
          <span className="text-left leading-tight">
            <span className="block font-[family-name:var(--font-display)] text-lg font-bold text-gray-900">{s.node}</span>
            <span className="block text-[11px] font-medium text-gray-500">{s.label}</span>
          </span>
        </motion.li>
      ))}
    </motion.ul>
  );
}

/* -------------------------------------------------------------------------- */
/*  "Buy a single template" callouts                                          */
/* -------------------------------------------------------------------------- */

function TemplatesCard({ reduce }: { reduce: boolean }) {
  const tilt = useTilt(3, reduce);
  return (
    <div style={{ perspective: 1400 }}>
      <motion.div
        {...tilt.handlers}
        style={tilt.style}
        whileHover={reduce ? undefined : { y: -4 }}
        transition={{ type: "spring", stiffness: 260, damping: 22 }}
        className="group relative"
      >
        <Link
          href={TEMPLATES_HREF}
          className={`relative flex flex-col items-start gap-4 overflow-hidden rounded-3xl border border-orange-200/70 bg-white/80 p-6 text-left shadow-[0_20px_50px_-30px_rgba(249,115,22,0.5)] backdrop-blur-xl transition-colors hover:border-orange-300 hover:bg-white sm:flex-row sm:items-center sm:gap-6 sm:p-7 ${focusRing}`}
        >
          <motion.div aria-hidden style={{ background: tilt.glow }} className="pointer-events-none absolute inset-0 opacity-0 transition-opacity group-hover:opacity-100" />
          {!reduce && (
            <motion.span
              aria-hidden
              className="pointer-events-none absolute inset-y-0 w-24 -skew-x-12 bg-gradient-to-r from-transparent via-orange-200/50 to-transparent"
              initial={{ x: "-200%" }}
              whileInView={{ x: "900%" }}
              viewport={{ once: true }}
              transition={{ duration: 1.6, delay: 0.6, ease: "easeInOut" }}
            />
          )}
          <span className="relative flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-orange-50 to-orange-100 text-[#f97316] ring-1 ring-orange-200/60 transition-transform duration-500 group-hover:-rotate-6 group-hover:scale-110">
            <LayoutTemplate className="h-6 w-6" />
          </span>
          <span className="relative flex-1">
            <span className="block font-[family-name:var(--font-display)] text-lg font-bold text-gray-900">Just need one design?</span>
            <span className="mt-1 block text-sm text-gray-600">
              If you want to buy a single template, visit <span className="font-semibold text-orange-600">/templates</span> and pick
              the one you like.
            </span>
          </span>
          <span className="relative inline-flex items-center gap-2 rounded-xl bg-[#2a2a2a] px-5 py-3 text-sm font-bold text-white shadow-lg transition-colors group-hover:bg-[#f97316]">
            Browse templates
            <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
          </span>
        </Link>
      </motion.div>
    </div>
  );
}

function TemplatesCallout({
  variant = "card",
  onNavigate,
  reduce = false,
}: {
  variant?: "card" | "inline" | "dark";
  onNavigate?: () => void;
  reduce?: boolean;
}) {
  if (variant === "card") return <TemplatesCard reduce={reduce} />;

  if (variant === "inline") {
    return (
      <p className="text-sm text-gray-600">
        Only need one design?{" "}
        <Link
          href={TEMPLATES_HREF}
          onClick={onNavigate}
          className={`rounded font-semibold text-orange-600 underline decoration-orange-300 underline-offset-4 hover:decoration-orange-600 ${focusRing}`}
        >
          Buy a single template
        </Link>
      </p>
    );
  }

  return (
    <Link
      href={TEMPLATES_HREF}
      onClick={onNavigate}
      className="group mt-3 flex items-center gap-3 rounded-xl border border-white/10 bg-white/[0.03] px-4 py-3 text-left transition-colors hover:border-orange-500/40 hover:bg-white/[0.06] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-400"
    >
      <LayoutTemplate className="h-4 w-4 shrink-0 text-[#f97316]" />
      <span className="flex-1 text-xs leading-snug text-neutral-400">
        Want to buy a single template instead? <span className="font-semibold text-neutral-200">Visit /templates</span>
      </span>
      <ArrowRight className="h-4 w-4 text-neutral-500 transition-transform group-hover:translate-x-1 group-hover:text-orange-400" />
    </Link>
  );
}

function TrustBar({ reduce }: { reduce: boolean }) {
  const items = ["Secure checkout", "24/7 WhatsApp support", "Real-time RSVP tracking", "AI Design Studio access"];
  return (
    <motion.ul
      variants={{ hidden: {}, show: { transition: { staggerChildren: 0.1, delayChildren: 0.7 } } }}
      initial={reduce ? "show" : "hidden"}
      whileInView="show"
      viewport={{ once: true, margin: "-60px" }}
      className="mx-auto mt-8 flex max-w-3xl flex-wrap items-center justify-center gap-x-6 gap-y-2"
    >
      {items.map((label) => (
        <motion.li key={label} variants={popVariants} className="flex items-center gap-2 text-sm font-medium text-gray-700">
          <Check className="h-4 w-4 text-[#f97316]" strokeWidth={3} />
          {label}
        </motion.li>
      ))}
    </motion.ul>
  );
}

/* -------------------------------------------------------------------------- */
/*  Plan card (layered 3D)                                                    */
/* -------------------------------------------------------------------------- */

function PlanCard({
  plan,
  index,
  popular,
  bestValue,
  reduce,
  onSelect,
}: {
  plan: PlanData;
  index: number;
  popular: boolean;
  bestValue: boolean;
  reduce: boolean;
  onSelect: () => void;
}) {
  const premium = isPremiumPlan(plan);
  const tilt = useTilt(8, reduce);
  const priceDelay = 0.35 + index * 0.2;

  return (
    <div className={`relative ${popular ? "z-10 md:-translate-y-4" : ""}`}>
      {/* Spotlight behind the popular card */}
      {popular && !reduce && (
        <motion.div
          aria-hidden
          className="pointer-events-none absolute -inset-8 -z-10 rounded-[3.5rem] bg-gradient-to-b from-orange-400/40 via-amber-300/30 to-transparent blur-3xl"
          initial={{ opacity: 0, scale: 0.7 }}
          whileInView={{ opacity: [0, 1, 0.65, 1] }}
          animate={{ scale: 1 }}
          viewport={{ once: true }}
          transition={{ duration: 3, delay: 0.7, ease: "easeInOut" }}
        />
      )}

      {/* One-time shockwave rings when the popular card lands */}
      {popular && !reduce && (
        <>
          {[0, 0.25].map((d) => (
            <motion.span
              key={d}
              aria-hidden
              className="pointer-events-none absolute inset-0 rounded-[2rem] border-2 border-orange-400"
              initial={{ opacity: 0, scale: 1 }}
              whileInView={{ opacity: [0, 0.7, 0], scale: [1, 1.08, 1.2] }}
              viewport={{ once: true }}
              transition={{ duration: 1.4, delay: 1.1 + d, ease: "easeOut" }}
            />
          ))}
        </>
      )}

      <motion.div variants={cardVariants} style={{ transformPerspective: 1600 }} className="h-full">
        <motion.div
          animate={popular && !reduce ? { y: [0, -8, 0] } : undefined}
          transition={{ duration: 6, repeat: Infinity, ease: "easeInOut" }}
          className="h-full"
        >
          <motion.div
            {...tilt.handlers}
            style={tilt.style}
            whileHover={reduce ? undefined : { y: -6, scale: 1.012 }}
            transition={{ type: "spring", stiffness: 260, damping: 22 }}
            className="group relative h-full rounded-[2rem]"
          >
            {/* Depth shadow */}
            <div
              aria-hidden
              className={`absolute inset-0 rounded-[2rem] shadow-[0_40px_80px_-30px_rgba(249,115,22,0.55)] transition-opacity duration-500 ${
                popular ? "opacity-100" : "opacity-0 group-hover:opacity-100"
              }`}
            />
            {!popular && (
              <div aria-hidden className="absolute inset-0 rounded-[2rem] shadow-[0_10px_40px_-20px_rgba(0,0,0,0.25)]" />
            )}

            {/* Layer A: clipped surface + border (flat) */}
            <div className="pointer-events-none absolute inset-0 overflow-hidden rounded-[2rem] bg-black/5">
              {popular && (
                <motion.div
                  aria-hidden
                  className="absolute left-1/2 top-1/2 h-[300%] w-[300%]"
                  style={{
                    x: "-50%",
                    y: "-50%",
                    background:
                      "conic-gradient(from 0deg, transparent 0deg, transparent 200deg, #f97316 280deg, #fbbf24 330deg, transparent 360deg)",
                  }}
                  animate={reduce ? undefined : { rotate: 360 }}
                  transition={{ duration: 5, ease: "linear", repeat: Infinity }}
                />
              )}
              <div
                className={`absolute inset-px rounded-[calc(2rem-1px)] backdrop-blur-xl transition-colors duration-500 ${
                  popular ? "bg-white/95" : "bg-white/75 group-hover:bg-white/90"
                }`}
              />
              {/* Light sweep across the face as the card lands */}
              {!reduce && (
                <motion.span
                  aria-hidden
                  className="absolute inset-y-0 w-1/3 -skew-x-12 bg-gradient-to-r from-transparent via-white/80 to-transparent"
                  initial={{ x: "-150%" }}
                  whileInView={{ x: "450%" }}
                  viewport={{ once: true }}
                  transition={{ duration: 1.3, delay: 0.5 + index * 0.2, ease: "easeInOut" }}
                />
              )}
              <motion.div aria-hidden style={{ background: tilt.glow }} className="absolute inset-0 opacity-0 transition-opacity duration-300 group-hover:opacity-100" />
              <motion.div aria-hidden style={{ background: tilt.sheen }} className="absolute inset-0 opacity-0 mix-blend-soft-light transition-opacity duration-300 group-hover:opacity-100" />

              {popular && (
                <div className="absolute right-0 top-0 flex items-center gap-1.5 overflow-hidden rounded-bl-3xl bg-gradient-to-r from-orange-500 to-amber-500 px-4 py-2 text-xs font-bold text-white shadow-sm">
                  <Star className="h-3 w-3 fill-white" /> Most popular
                  {!reduce && (
                    <motion.span
                      aria-hidden
                      className="absolute inset-y-0 w-8 -skew-x-12 bg-white/40 blur-sm"
                      initial={{ x: "-250%" }}
                      animate={{ x: "700%" }}
                      transition={{ duration: 1.3, ease: "easeInOut", repeat: Infinity, repeatDelay: 3.5 }}
                    />
                  )}
                </div>
              )}
              {!popular && bestValue && (
                <div className="absolute right-0 top-0 rounded-bl-3xl bg-[#2a2a2a] px-4 py-2 text-xs font-bold text-white">Best value</div>
              )}
            </div>

            {/* Layer B: content at different depths */}
            <div className="relative flex h-full flex-col p-8" style={preserve3d}>
              <div className="mb-6 flex flex-col items-start" style={preserve3d}>
                <motion.div
                  initial={reduce ? false : { scale: 0, rotate: -30 }}
                  whileInView={{ scale: 1, rotate: 0 }}
                  viewport={{ once: true }}
                  transition={{ type: "spring", stiffness: 240, damping: 13, delay: 0.5 + index * 0.2 }}
                  className="mb-4"
                  style={z(52)}
                >
                  <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-orange-50 to-orange-100 text-[#f97316] shadow-[0_14px_24px_-10px_rgba(249,115,22,0.6),inset_0_1px_0_rgba(255,255,255,0.8)] ring-1 ring-orange-200/60 transition-transform duration-500 group-hover:-rotate-6 group-hover:scale-110">
                    {premium ? <Crown className="h-6 w-6" /> : <Zap className="h-6 w-6" />}
                  </div>
                </motion.div>
                <div style={z(32)}>
                  <h3 className="font-[family-name:var(--font-display)] text-2xl font-bold text-gray-900">{plan.name}</h3>
                  <p className="mt-2 line-clamp-2 min-h-[40px] font-[family-name:var(--font-body)] text-sm text-gray-500">
                    {plan.description || "Perfect for your event needs."}
                  </p>
                </div>
              </div>

              <div className="relative mb-8 pb-6" style={z(56)}>
                <div className="flex items-baseline gap-2">
                  <span className="font-[family-name:var(--font-display)] text-5xl font-bold tracking-tight text-gray-900">
                    <Price value={plan.price} reduce={reduce} delay={priceDelay} />
                  </span>
                  <span className="text-sm font-medium text-gray-500">/ {periodLabel(plan.durationDays)}</span>
                </div>
                <div className="mt-3 min-h-[16px]">
                  <ValueLine plan={plan} />
                </div>
                {/* Divider that draws itself in */}
                <motion.span
                  aria-hidden
                  initial={reduce ? false : { scaleX: 0 }}
                  whileInView={{ scaleX: 1 }}
                  viewport={{ once: true }}
                  transition={{ duration: 0.9, delay: 0.6 + index * 0.2, ease: EASE }}
                  className="absolute inset-x-0 bottom-0 h-px origin-left bg-gradient-to-r from-orange-300/70 via-black/10 to-transparent"
                />
              </div>

              <ul className="mb-8 flex-1 space-y-4" style={z(16)}>
                {buildFeatures(plan).map((feat, i) => (
                  <motion.li
                    key={feat.label}
                    initial={reduce ? false : { opacity: 0, x: -16, filter: "blur(4px)" }}
                    whileInView={{ opacity: 1, x: 0, filter: "blur(0px)" }}
                    viewport={{ once: true, margin: "-20px" }}
                    transition={{ delay: 0.6 + index * 0.2 + i * 0.08, duration: 0.55, ease: EASE }}
                    className={`flex items-start gap-3 font-[family-name:var(--font-body)] text-sm ${
                      feat.active ? "font-medium text-gray-700" : "text-gray-400 line-through"
                    }`}
                  >
                    <AnimatedCheck active={feat.active} tone="light" delay={0.7 + index * 0.2 + i * 0.08} />
                    {feat.label}
                  </motion.li>
                ))}
              </ul>

              <div style={z(40)}>
                <motion.button
                  type="button"
                  onClick={onSelect}
                  aria-label={`Choose ${plan.name} plan`}
                  initial={reduce ? false : { opacity: 0, y: 20, scale: 0.92 }}
                  whileInView={{ opacity: 1, y: 0, scale: 1 }}
                  viewport={{ once: true }}
                  transition={{ type: "spring", stiffness: 200, damping: 16, delay: 1 + index * 0.2 }}
                  whileHover={reduce ? undefined : { scale: 1.03 }}
                  whileTap={{ scale: 0.96 }}
                  className={`group/btn relative flex w-full cursor-pointer items-center justify-center gap-2 overflow-hidden rounded-xl px-6 py-3.5 font-[family-name:var(--font-display)] text-sm font-bold text-white transition-colors duration-300 ${focusRing} ${
                    popular ? primaryBtn : "bg-[#2a2a2a] shadow-lg hover:bg-[#3a3a3a]"
                  }`}
                >
                  {popular && !reduce && <ShineSweep />}
                  <span className="relative">Choose {plan.name}</span>
                  <ArrowRight className="relative h-4 w-4 transition-transform duration-300 group-hover/btn:translate-x-1" />
                </motion.button>
              </div>

              <p className="mt-3 text-center text-xs text-gray-400">Review details before you pay</p>
            </div>
          </motion.div>
        </motion.div>
      </motion.div>
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/*  Compare table                                                             */
/* -------------------------------------------------------------------------- */

function Tick({ on }: { on: boolean }) {
  return on ? (
    <span className="inline-flex h-6 w-6 items-center justify-center rounded-full bg-orange-100 text-[#f97316]">
      <Check className="h-3.5 w-3.5" strokeWidth={3} />
      <span className="sr-only">Included</span>
    </span>
  ) : (
    <span className="inline-flex h-6 w-6 items-center justify-center rounded-full bg-gray-100 text-gray-400">
      <Minus className="h-3.5 w-3.5" strokeWidth={3} />
      <span className="sr-only">Not included</span>
    </span>
  );
}

function CompareTable({ plans, popularId }: { plans: PlanData[]; popularId: string | undefined }) {
  const rows: { label: string; cell: (p: PlanData) => ReactNode }[] = [
    { label: "Price", cell: (p) => <b className="text-gray-900">{p.price > 0 ? formatter.format(p.price) : "Free"}</b> },
    { label: "Valid for", cell: (p) => durationLabel(p.durationDays) },
    { label: "Standard templates", cell: (p) => p.maxSimpleTemplates },
    { label: "Premium templates", cell: (p) => p.maxPremiumTemplates },
    { label: "Cost per template", cell: (p) => (perTemplate(p) ? formatter.format(perTemplate(p)) : "—") },
    { label: "Real-time RSVP tracking", cell: () => <Tick on /> },
    { label: "Custom URL slug", cell: (p) => <Tick on={p.allowsCustomSlug} /> },
    { label: "24/7 WhatsApp support", cell: () => <Tick on /> },
  ];

  return (
    <div className="overflow-x-auto rounded-3xl border border-orange-200/60 bg-white/80 shadow-[0_20px_50px_-30px_rgba(249,115,22,0.45)] backdrop-blur-xl">
      <table className="w-full min-w-[560px] border-collapse text-left text-sm">
        <caption className="sr-only">Plan comparison</caption>
        <thead>
          <tr className="border-b border-black/5">
            <th scope="col" className="p-4 font-medium text-gray-500">
              Compare plans
            </th>
            {plans.map((p) => (
              <th
                key={p.id}
                scope="col"
                className={`p-4 text-center font-[family-name:var(--font-display)] text-base font-bold text-gray-900 ${
                  p.id === popularId ? "bg-orange-50" : ""
                }`}
              >
                {p.name}
                {p.id === popularId && (
                  <span className="ml-2 rounded-full bg-[#f97316] px-2 py-0.5 align-middle text-[10px] font-bold text-white">Popular</span>
                )}
              </th>
            ))}
          </tr>
        </thead>
        <motion.tbody
          variants={{ hidden: {}, show: { transition: { staggerChildren: 0.05, delayChildren: 0.15 } } }}
          initial="hidden"
          animate="show"
        >
          {rows.map((row) => (
            <motion.tr
              key={row.label}
              variants={{ hidden: { opacity: 0, x: -14 }, show: { opacity: 1, x: 0, transition: { duration: 0.4, ease: EASE } } }}
              className="border-b border-black/5 transition-colors last:border-0 hover:bg-orange-50/40"
            >
              <th scope="row" className="p-4 font-medium text-gray-600">
                {row.label}
              </th>
              {plans.map((p) => (
                <td key={p.id} className={`p-4 text-center tabular-nums text-gray-700 ${p.id === popularId ? "bg-orange-50/70" : ""}`}>
                  {row.cell(p)}
                </td>
              ))}
            </motion.tr>
          ))}
        </motion.tbody>
      </table>
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/*  FAQ                                                                       */
/* -------------------------------------------------------------------------- */

const FAQ: { q: string; a: ReactNode }[] = [
  {
    q: "Can I buy just one template?",
    a: (
      <>
        Yes. If you only need a single design, visit{" "}
        <Link href={TEMPLATES_HREF} className="font-semibold text-orange-600 underline underline-offset-4">
          /templates
        </Link>{" "}
        and buy it on its own. Plans are best when you want several templates, RSVP tracking and support.
      </>
    ),
  },
  {
    q: "What do I get with a plan?",
    a: "A set number of standard and premium templates, real-time RSVP tracking, 24/7 WhatsApp support and, depending on the plan, a custom URL slug. Compare every plan side by side above.",
  },
  {
    q: "How long does my plan last?",
    a: "Each plan shows its duration next to the price, for example “/ month” or “/ year”. Pick the length that matches your event schedule.",
  },
  {
    q: "Can I get a refund?",
    a: "No. All purchases are final, so check the plan details on the checkout screen before you pay.",
  },
];

function FaqItem({ q, a, defaultOpen = false, reduce }: { q: string; a: ReactNode; defaultOpen?: boolean; reduce: boolean }) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <motion.div
      variants={{ hidden: { opacity: 0, y: 24, scale: 0.97 }, show: { opacity: 1, y: 0, scale: 1, transition: { duration: 0.6, ease: EASE } } }}
      className={`rounded-2xl border bg-white/70 backdrop-blur-xl transition-colors ${
        open ? "border-orange-300 shadow-[0_16px_40px_-24px_rgba(249,115,22,0.6)]" : "border-orange-200/60"
      }`}
    >
      <button
        type="button"
        aria-expanded={open}
        onClick={() => setOpen((o) => !o)}
        className={`flex w-full items-center justify-between gap-4 rounded-2xl px-5 py-4 text-left font-[family-name:var(--font-display)] text-base font-semibold text-gray-900 ${focusRing}`}
      >
        {q}
        <ChevronDown className={`h-5 w-5 shrink-0 text-[#f97316] transition-transform duration-300 ${open ? "rotate-180" : ""}`} />
      </button>
      <AnimatePresence initial={false}>
        {open && (
          <motion.div
            initial={reduce ? false : { height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={reduce ? undefined : { height: 0, opacity: 0 }}
            transition={{ duration: 0.3, ease: EASE }}
            className="overflow-hidden"
          >
            <div className="px-5 pb-5 text-sm leading-relaxed text-gray-600">{a}</div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}

/* -------------------------------------------------------------------------- */
/*  Directory modal (search, sort, pagination)                                */
/* -------------------------------------------------------------------------- */

const SORT_OPTIONS = [
  { label: "Price: low to high", value: "price_asc" },
  { label: "Price: high to low", value: "price_desc" },
  { label: "Newest first", value: "newest" },
];

function DirectoryCard({ plan, reduce, onPick }: { plan: PlanData; reduce: boolean; onPick: () => void }) {
  const tilt = useTilt(7, reduce);
  return (
    <motion.div variants={dirItemVariants} style={{ transformPerspective: 1200 }} className="h-full">
      <motion.div
        {...tilt.handlers}
        style={tilt.style}
        whileHover={reduce ? undefined : { y: -5 }}
        transition={{ type: "spring", stiffness: 260, damping: 22 }}
        className="group relative h-full"
      >
        <div
          aria-hidden
          className="absolute inset-0 rounded-2xl opacity-0 shadow-[0_26px_50px_-22px_rgba(249,115,22,0.5)] transition-opacity duration-300 group-hover:opacity-100"
        />
        <div className="pointer-events-none absolute inset-0 overflow-hidden rounded-2xl border border-black/5 bg-white shadow-sm transition-colors group-hover:border-orange-200">
          <motion.div aria-hidden style={{ background: tilt.glow }} className="absolute inset-0 opacity-0 transition-opacity duration-300 group-hover:opacity-100" />
        </div>

        <div className="relative flex h-full flex-col p-5" style={preserve3d}>
          <div className="flex items-center gap-3" style={z(32)}>
            <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-orange-50 text-[#f97316] ring-1 ring-orange-200/60">
              {isPremiumPlan(plan) ? <Crown className="h-4 w-4" /> : <Zap className="h-4 w-4" />}
            </span>
            <h3 className="font-[family-name:var(--font-display)] text-lg font-bold text-gray-900">{plan.name}</h3>
          </div>
          <p className="mt-3 line-clamp-2 flex-1 text-xs text-gray-500" style={z(12)}>
            {plan.description || "Perfect for your event needs."}
          </p>
          <div className="mt-3 flex flex-wrap gap-1.5 text-[11px] font-medium text-gray-600" style={z(20)}>
            <span className="rounded-full bg-gray-100 px-2 py-0.5">{plan.maxSimpleTemplates} standard</span>
            <span className="rounded-full bg-gray-100 px-2 py-0.5">{plan.maxPremiumTemplates} premium</span>
            {plan.allowsCustomSlug && <span className="rounded-full bg-orange-50 px-2 py-0.5 text-orange-700">Custom URL</span>}
          </div>
          <div className="mt-4 flex items-baseline gap-1" style={z(42)}>
            <span className="text-2xl font-bold tabular-nums text-gray-900">{formatter.format(plan.price)}</span>
            <span className="text-xs text-gray-500">/ {periodLabel(plan.durationDays)}</span>
          </div>
          <div style={z(28)}>
            <button
              type="button"
              onClick={onPick}
              className={`mt-4 w-full rounded-lg bg-orange-50 py-2.5 text-sm font-bold text-orange-600 transition-colors hover:bg-[#f97316] hover:text-white ${focusRing}`}
            >
              View details
            </button>
          </div>
        </div>
      </motion.div>
    </motion.div>
  );
}

function DirectoryModal({
  isOpen,
  onClose,
  onSelect,
}: {
  isOpen: boolean;
  onClose: () => void;
  onSelect: (plan: PlanData) => void;
}) {
  const reduce = useReducedMotion() ?? false;
  const [plans, setPlans] = useState<PlanData[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(false);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState<number | null>(null);
  const [search, setSearch] = useState("");
  const [searchInput, setSearchInput] = useState("");
  const [sort, setSort] = useState("price_asc");
  const [retry, setRetry] = useState(0);
  const searchRef = useRef<HTMLInputElement>(null);

  useModalBehavior(isOpen, onClose);

  useEffect(() => {
    if (isOpen) searchRef.current?.focus();
  }, [isOpen]);

  useEffect(() => {
    const t = setTimeout(() => {
      setSearch(searchInput.trim());
      setPage(1);
    }, 400);
    return () => clearTimeout(t);
  }, [searchInput]);

  useEffect(() => {
    if (!isOpen) return;
    let cancelled = false;
    setLoading(true);
    setError(false);
    const qs = new URLSearchParams({ page: String(page), limit: "6", search, sort });
    apiClient
      .get(`/public/plans/all?${qs.toString()}`)
      .then((res) => {
        if (cancelled) return;
        if (res.data?.status === "success") {
          setPlans(res.data.data.plans);
          setTotalPages(res.data.data.pagination.totalPages || 1);
          const t = res.data.data.pagination.total;
          setTotal(typeof t === "number" ? t : null);
        } else setError(true);
      })
      .catch(() => !cancelled && setError(true))
      .finally(() => !cancelled && setLoading(false));
    return () => {
      cancelled = true;
    };
  }, [isOpen, page, search, sort, retry]);

  const clearSearch = () => {
    setSearchInput("");
    setSearch("");
    setPage(1);
    searchRef.current?.focus();
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          role="dialog"
          aria-modal="true"
          aria-label="All plans"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/60 p-4 backdrop-blur-md sm:p-6"
          onClick={onClose}
        >
          <motion.div
            initial={reduce ? false : { opacity: 0, y: 36, scale: 0.95, rotateX: 7 }}
            animate={{ opacity: 1, y: 0, scale: 1, rotateX: 0 }}
            exit={reduce ? undefined : { opacity: 0, y: 20, scale: 0.96 }}
            transition={{ type: "spring", damping: 25, stiffness: 220 }}
            style={{ transformPerspective: 1600 }}
            onClick={(e) => e.stopPropagation()}
            data-lenis-prevent
            className="relative flex max-h-[90dvh] w-full max-w-5xl flex-col overflow-hidden rounded-3xl border border-white/20 bg-[#fdeadb] shadow-2xl"
          >
            {/* Header */}
            <div className="relative z-10 flex items-start justify-between gap-4 border-b border-black/5 bg-white/40 p-6 backdrop-blur-xl">
              <div>
                <h2 className="font-[family-name:var(--font-display)] text-2xl font-bold text-gray-900">All plans</h2>
                <p className="text-sm text-gray-600">Search, sort and pick the plan that fits your event.</p>
              </div>
              <motion.button
                type="button"
                onClick={onClose}
                aria-label="Close"
                whileHover={{ rotate: 90, scale: 1.1 }}
                whileTap={{ scale: 0.9 }}
                className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-black/5 text-gray-600 transition-colors hover:bg-black/10 hover:text-gray-900 ${focusRing}`}
              >
                <X className="h-4 w-4" />
              </motion.button>
            </div>

            {/* Controls. z-20 keeps the select's dropdown above the list. */}
            <div className="relative z-20 flex flex-col gap-3 border-b border-black/5 bg-white/40 p-4 backdrop-blur-xl sm:flex-row sm:items-stretch sm:p-6">
              <div className="relative flex-1">
                <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
                {/* type="text" (not "search") so the browser doesn't add its own ✕ */}
                <input
                  ref={searchRef}
                  type="text"
                  inputMode="search"
                  autoComplete="off"
                  aria-label="Search plans"
                  placeholder="Search plans by name…"
                  value={searchInput}
                  onChange={(e) => setSearchInput(e.target.value)}
                  className="h-full min-h-[42px] w-full rounded-xl border border-slate-200 bg-white px-10 py-2.5 text-sm outline-none transition-all focus:border-orange-400 focus:ring-2 focus:ring-orange-500/30"
                />
                <AnimatePresence>
                  {searchInput && (
                    <motion.button
                      type="button"
                      initial={{ scale: 0, opacity: 0 }}
                      animate={{ scale: 1, opacity: 1 }}
                      exit={{ scale: 0, opacity: 0 }}
                      onClick={clearSearch}
                      aria-label="Clear search"
                      className="absolute right-2.5 top-1/2 flex h-6 w-6 -translate-y-1/2 items-center justify-center rounded-full bg-gray-100 text-gray-500 hover:bg-orange-100 hover:text-orange-600"
                    >
                      <X className="h-3.5 w-3.5" />
                    </motion.button>
                  )}
                </AnimatePresence>
              </div>

              <AceternitySelect
                className="sm:w-56"
                value={sort}
                options={SORT_OPTIONS}
                onChange={(v) => {
                  setSort(v);
                  setPage(1);
                }}
              />
            </div>

            {/* List */}
            <div className="relative z-0 flex-1 overflow-y-auto bg-[#fdeadb]/50 p-4 sm:p-6" aria-live="polite" aria-busy={loading}>
              {error ? (
                <div className="flex h-48 flex-col items-center justify-center gap-3 text-center text-gray-600">
                  <p className="text-sm font-medium">We couldn&apos;t load the plans. Check your connection and try again.</p>
                  <button
                    type="button"
                    onClick={() => setRetry((n) => n + 1)}
                    className={`inline-flex items-center gap-2 rounded-full bg-[#2a2a2a] px-5 py-2 text-sm font-bold text-white hover:bg-[#f97316] ${focusRing}`}
                  >
                    <RefreshCw className="h-4 w-4" /> Try again
                  </button>
                </div>
              ) : loading ? (
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
                  {[0, 1, 2].map((i) => (
                    <div key={i} className="relative h-56 overflow-hidden rounded-2xl bg-white/70">
                      <motion.div
                        aria-hidden
                        className="absolute inset-y-0 w-1/2 bg-gradient-to-r from-transparent via-white to-transparent"
                        initial={{ x: "-100%" }}
                        animate={{ x: "300%" }}
                        transition={{ duration: 1.4, ease: "easeInOut", repeat: Infinity, delay: i * 0.15 }}
                      />
                    </div>
                  ))}
                </div>
              ) : plans.length === 0 ? (
                <div className="flex h-48 flex-col items-center justify-center gap-2 text-center text-gray-600">
                  <Search className="h-8 w-8 opacity-50" />
                  <p className="text-sm">{search ? <>No plans match &ldquo;{search}&rdquo;.</> : "No plans available right now."}</p>
                  {search && (
                    <button type="button" onClick={clearSearch} className="text-sm font-semibold text-orange-600 underline underline-offset-4">
                      Clear search
                    </button>
                  )}
                </div>
              ) : (
                <>
                  {total !== null && (
                    <p className="mb-3 text-xs font-medium text-gray-500">
                      {total} {total === 1 ? "plan" : "plans"}
                    </p>
                  )}
                  <motion.div
                    key={`${page}-${search}-${sort}`}
                    variants={listVariants}
                    initial={reduce ? "show" : "hidden"}
                    animate="show"
                    className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3"
                  >
                    {plans.map((plan) => (
                      <DirectoryCard
                        key={plan.id}
                        plan={plan}
                        reduce={reduce}
                        onPick={() => {
                          onClose();
                          onSelect(plan);
                        }}
                      />
                    ))}
                  </motion.div>
                </>
              )}
            </div>

            {/* Footer */}
            <div className="relative z-10 flex flex-col gap-3 border-t border-black/5 bg-white/50 p-4 px-6 backdrop-blur-xl sm:flex-row sm:items-center sm:justify-between">
              <TemplatesCallout variant="inline" onNavigate={onClose} />
              {totalPages > 1 && (
                <div className="flex items-center gap-3">
                  <p className="text-sm text-gray-600">
                    Page {page} of {totalPages}
                  </p>
                  <div className="flex gap-2">
                    {[
                      { label: "Previous page", icon: ChevronLeft, disabled: page === 1, go: () => setPage((p) => Math.max(1, p - 1)) },
                      { label: "Next page", icon: ChevronRight, disabled: page === totalPages, go: () => setPage((p) => Math.min(totalPages, p + 1)) },
                    ].map(({ label, icon: Icon, disabled, go }) => (
                      <motion.button
                        key={label}
                        type="button"
                        aria-label={label}
                        onClick={go}
                        disabled={disabled}
                        whileHover={disabled ? undefined : { scale: 1.1 }}
                        whileTap={disabled ? undefined : { scale: 0.92 }}
                        className={`flex h-9 w-9 items-center justify-center rounded-xl border border-slate-200 bg-white transition-colors hover:border-orange-300 hover:text-orange-600 disabled:cursor-not-allowed disabled:opacity-40 ${focusRing}`}
                      >
                        <Icon className="h-4 w-4" />
                      </motion.button>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

/* -------------------------------------------------------------------------- */
/*  Single plan detail modal                                                  */
/* -------------------------------------------------------------------------- */

function PlanModalContent({ plan, onClose }: { plan: PlanData; onClose: () => void }) {
  const reduce = useReducedMotion() ?? false;
  const closeRef = useRef<HTMLButtonElement>(null);
  const [isPresent, safeToRemove] = usePresence();

  useEffect(() => {
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    closeRef.current?.focus();
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = prev;
      window.removeEventListener("keydown", onKey);
    };
  }, [onClose]);

  useEffect(() => {
    if (isPresent) return;
    document.body.style.overflow = "";
    const t = window.setTimeout(() => safeToRemove?.(), 450);
    return () => window.clearTimeout(t);
  }, [isPresent, safeToRemove]);

  const stats = [
    { label: "Standard", value: plan.maxSimpleTemplates },
    { label: "Premium", value: plan.maxPremiumTemplates },
    { label: "Valid for", value: durationLabel(plan.durationDays) },
  ];

  const statVariants: Variants = {
    hidden: { opacity: 0, y: 16, scale: 0.9 },
    show: { opacity: 1, y: 0, scale: 1, transition: { type: "spring", stiffness: 260, damping: 17 } },
  };

  return (
    <motion.div
      role="dialog"
      aria-modal="true"
      aria-label={`${plan.name} plan details`}
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0, transition: { duration: 0.25 } }}
      transition={{ duration: 0.25 }}
      onClick={onClose}
      className={`fixed inset-0 z-[9999] flex items-center justify-center bg-black/60 p-4 backdrop-blur-xl sm:p-6 ${
        isPresent ? "" : "pointer-events-none"
      }`}
    >
      <motion.div
        initial={reduce ? false : { opacity: 0, scale: 0.95, y: 28, rotateX: 6 }}
        animate={{ opacity: 1, scale: 1, y: 0, rotateX: 0 }}
        exit={reduce ? undefined : { opacity: 0, scale: 0.97, y: 16, transition: { duration: 0.25, ease: EASE } }}
        transition={{ type: "spring", damping: 26, stiffness: 210 }}
        style={{ transformPerspective: 1400 }}
        onClick={(e) => e.stopPropagation()}
        data-lenis-prevent
        className="relative flex max-h-[92dvh] w-full max-w-lg flex-col overflow-hidden overflow-y-auto rounded-3xl border border-white/10 bg-[#0f0f11] shadow-[0_40px_120px_-20px_rgba(249,115,22,0.35)]"
      >
        <div className="pointer-events-none absolute inset-x-0 top-0 h-40 bg-gradient-to-b from-orange-500/20 to-transparent" />
        <div className="pointer-events-none absolute inset-x-10 top-0 h-px bg-gradient-to-r from-transparent via-white/30 to-transparent" />

        <motion.button
          ref={closeRef}
          type="button"
          onClick={onClose}
          aria-label="Close"
          whileHover={{ scale: 1.1, rotate: 90 }}
          whileTap={{ scale: 0.9 }}
          className="absolute right-5 top-5 z-10 flex h-8 w-8 cursor-pointer items-center justify-center rounded-full bg-white/5 text-neutral-400 transition-colors hover:bg-white/10 hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-400"
        >
          <X className="h-4 w-4" />
        </motion.button>

        <motion.div variants={containerVariants} initial="hidden" animate="show" className="relative p-8 sm:p-10">
          <motion.div variants={itemVariants} className="mb-6 flex flex-col items-center text-center">
            <motion.div
              initial={reduce ? false : { scale: 0, rotate: -40 }}
              animate={{ scale: 1, rotate: 0 }}
              transition={{ type: "spring", stiffness: 220, damping: 12, delay: 0.2 }}
              className="mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-white/5 shadow-sm ring-1 ring-white/10"
            >
              {isPremiumPlan(plan) ? <Crown className="h-8 w-8 text-[#f97316]" /> : <Zap className="h-8 w-8 text-[#f97316]" />}
            </motion.div>
            <h3 className="font-[family-name:var(--font-display)] text-3xl font-bold text-white">{plan.name}</h3>
            <p className="mt-2 text-sm text-neutral-400">{plan.description || "Everything you need to create unforgettable events."}</p>
          </motion.div>

          <motion.div variants={itemVariants} className="mb-6 flex flex-col items-center gap-2 text-center">
            <div className="flex items-baseline justify-center gap-2">
              <span className="font-[family-name:var(--font-display)] text-5xl font-bold text-white">
                <Price value={plan.price} reduce={reduce} delay={0.3} />
              </span>
              <span className="text-sm font-medium text-neutral-500">/ {periodLabel(plan.durationDays)}</span>
            </div>
            <ValueLine plan={plan} tone="dark" />
          </motion.div>

          <motion.div variants={{ hidden: {}, show: { transition: { staggerChildren: 0.08 } } }} className="mb-6 grid grid-cols-3 gap-3">
            {stats.map((s) => (
              <motion.div
                key={s.label}
                variants={statVariants}
                className="rounded-2xl border border-white/5 bg-white/[0.03] p-3 text-center"
              >
                <div className="font-[family-name:var(--font-display)] text-xl font-bold text-[#f97316]">{s.value}</div>
                <div className="mt-0.5 text-[11px] font-medium text-neutral-500">{s.label}</div>
              </motion.div>
            ))}
          </motion.div>

          <motion.div variants={itemVariants} className="mb-6 rounded-2xl border border-white/5 bg-white/[0.02] p-6">
            <h4 className="mb-4 text-sm font-semibold text-neutral-300">What&apos;s included</h4>
            <ul className="space-y-3.5">
              {buildFeatures(plan, true).map((feat, i) => (
                <li
                  key={feat.label}
                  className={`flex items-start gap-3 font-[family-name:var(--font-body)] text-sm ${
                    feat.active ? "text-neutral-300" : "text-neutral-600 line-through"
                  }`}
                >
                  <AnimatedCheck active={feat.active} tone="dark" delay={0.4 + i * 0.07} />
                  {feat.label}
                </li>
              ))}
            </ul>
          </motion.div>

          <motion.div variants={itemVariants}>
            <Link
              href={planCheckoutHref(plan.id)}
              className={`group relative flex w-full items-center justify-center gap-2 overflow-hidden rounded-xl px-6 py-4 font-[family-name:var(--font-display)] text-base font-bold text-white transition-transform duration-300 hover:scale-[1.02] active:scale-[0.99] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-300 ${primaryBtn}`}
            >
              {!reduce && <ShineSweep width="w-14" delay={2.5} />}
              <span className="relative">Continue to checkout</span>
              <ArrowRight className="relative h-4 w-4 transition-transform group-hover:translate-x-1" />
            </Link>

            <p className="mt-4 flex items-center justify-center gap-2 text-xs font-medium text-neutral-500">
              <ShieldCheck className="h-4 w-4 text-[#f97316]" />
              Secure checkout. All purchases are final.
            </p>

            <TemplatesCallout variant="dark" onNavigate={onClose} />
          </motion.div>
        </motion.div>
      </motion.div>
    </motion.div>
  );
}

function PlanPreviewModal({ plan, onClose }: { plan: PlanData | null; onClose: () => void }) {
  return <AnimatePresence>{plan && <PlanModalContent key={plan.id} plan={plan} onClose={onClose} />}</AnimatePresence>;
}

/* -------------------------------------------------------------------------- */
/*  Skeleton & error                                                          */
/* -------------------------------------------------------------------------- */

function PricingSkeleton() {
  return (
    <section className="w-full bg-[#fdeadb] py-24 sm:py-32" aria-busy="true" aria-label="Loading pricing">
      <div className="mx-auto mb-16 flex max-w-2xl flex-col items-center gap-4 px-4">
        <div className="h-7 w-28 animate-pulse rounded-full bg-white/70" />
        <div className="h-12 w-full animate-pulse rounded-xl bg-white/70" />
      </div>
      <div className="mx-auto grid max-w-7xl grid-cols-1 gap-6 px-4 md:grid-cols-3 lg:gap-8 lg:px-12">
        {[0, 1, 2].map((i) => (
          <div key={i} className="relative h-[560px] overflow-hidden rounded-[2rem] bg-white/60">
            <motion.div
              aria-hidden
              className="absolute inset-y-0 w-1/2 bg-gradient-to-r from-transparent via-white/80 to-transparent"
              initial={{ x: "-100%" }}
              animate={{ x: "300%" }}
              transition={{ duration: 1.5, ease: "easeInOut", repeat: Infinity, delay: i * 0.15 }}
            />
          </div>
        ))}
      </div>
    </section>
  );
}

function PricingError({ onRetry }: { onRetry: () => void }) {
  return (
    <section className="w-full bg-[#fdeadb] py-20" role="alert">
      <div className="mx-auto flex max-w-md flex-col items-center gap-4 px-4 text-center">
        <h2 className="font-[family-name:var(--font-display)] text-2xl font-bold text-gray-900">Pricing didn&apos;t load</h2>
        <p className="text-sm text-gray-600">Check your connection and try again. You can also buy a single template without a plan.</p>
        <div className="flex flex-wrap items-center justify-center gap-3">
          <button
            type="button"
            onClick={onRetry}
            className={`inline-flex items-center gap-2 rounded-full bg-[#2a2a2a] px-6 py-2.5 text-sm font-bold text-white hover:bg-[#f97316] ${focusRing}`}
          >
            <RefreshCw className="h-4 w-4" /> Try again
          </button>
          <Link
            href={TEMPLATES_HREF}
            className={`inline-flex items-center gap-2 rounded-full border border-orange-200 bg-white px-6 py-2.5 text-sm font-bold text-gray-700 hover:bg-orange-50 ${focusRing}`}
          >
            Browse templates
          </Link>
        </div>
      </div>
    </section>
  );
}

/* -------------------------------------------------------------------------- */
/*  Section (all hooks live here so refs are always mounted)                  */
/* -------------------------------------------------------------------------- */

function PricingSection({ plans }: { plans: PlanData[] }) {
  const reduce = useReducedMotion() ?? false;
  const [selectedPlan, setSelectedPlan] = useState<PlanData | null>(null);
  const [isDirectoryOpen, setIsDirectoryOpen] = useState(false);
  const [showCompare, setShowCompare] = useState(false);

  const sectionRef = useRef<HTMLElement>(null);
  const raf = useRef(0);
  const sectionInView = useInView(sectionRef, { amount: 0.15 });

  // Scroll-linked parallax for the background glows
  const { scrollYProgress } = useScroll({ target: sectionRef, offset: ["start end", "end start"] });
  const glowY1 = useTransform(scrollYProgress, [0, 1], [-60, 160]);
  const glowY2 = useTransform(scrollYProgress, [0, 1], [80, -140]);

  const onMove = useCallback((e: React.PointerEvent) => {
    if (e.pointerType === "touch") return;
    const { clientX: x, clientY: y } = e;
    cancelAnimationFrame(raf.current);
    raf.current = requestAnimationFrame(() => {
      sectionRef.current?.style.setProperty("--mx", `${x}px`);
      sectionRef.current?.style.setProperty("--my", `${y}px`);
    });
  }, []);

  useEffect(() => () => cancelAnimationFrame(raf.current), []);

  const closeModal = useCallback(() => setSelectedPlan(null), []);
  const closeDirectory = useCallback(() => setIsDirectoryOpen(false), []);
  const selectFromDirectory = useCallback((p: PlanData) => setSelectedPlan(p), []);

  const popularPlan = plans[POPULAR_INDEX] ?? plans[0];

  const bestValueId = useMemo(() => {
    const priced = plans.filter((p) => perTemplate(p) > 0);
    if (priced.length < 2) return undefined;
    return priced.reduce((a, b) => (perTemplate(b) < perTemplate(a) ? b : a)).id;
  }, [plans]);

  const lowestPrice = useMemo(() => Math.min(...plans.map((p) => p.price).filter((n) => n > 0), Infinity), [plans]);

  const anyOverlay = !!selectedPlan || isDirectoryOpen;
  const mask = "radial-gradient(230px circle at var(--mx,-999px) var(--my,-999px), #000 0%, transparent 100%)";

  return (
    <>
      <section
        id="pricing"
        ref={sectionRef}
        onPointerMove={onMove}
        aria-labelledby="pricing-heading"
        className="relative isolate w-full overflow-hidden bg-[#fdeadb] py-24 sm:py-32"
      >
        <div aria-hidden className="pointer-events-none absolute inset-0 -z-10">
          <div className="absolute inset-0 bg-gradient-to-b from-[#fff4ea] to-[#fbdcc0]" />
          <motion.div style={reduce ? undefined : { y: glowY1 }} className="absolute -left-32 top-10">
            <motion.div
              animate={reduce ? undefined : { x: [0, 60, 0], y: [0, 30, 0] }}
              transition={{ duration: 18, repeat: Infinity, ease: "easeInOut" }}
              className="h-[420px] w-[420px] rounded-full bg-orange-300/30 blur-[120px]"
            />
          </motion.div>
          <motion.div style={reduce ? undefined : { y: glowY2 }} className="absolute -right-32 bottom-0">
            <motion.div
              animate={reduce ? undefined : { x: [0, -50, 0], y: [0, -40, 0] }}
              transition={{ duration: 22, repeat: Infinity, ease: "easeInOut" }}
              className="h-[420px] w-[420px] rounded-full bg-amber-300/30 blur-[120px]"
            />
          </motion.div>
          <div
            className="absolute inset-0"
            style={{ backgroundImage: "radial-gradient(circle, rgba(194,65,12,0.2) 1.5px, transparent 1.5px)", backgroundSize: "24px 24px" }}
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
          <FloatingSparks reduce={reduce} />
        </div>

        <div className="relative z-10 mx-auto w-full max-w-7xl px-4 sm:px-6 lg:px-12">
          {/* Heading */}
          <div className="mx-auto mb-14 max-w-3xl text-center">
            <motion.span
              initial={reduce ? false : { opacity: 0, y: 16, scale: 0.85, filter: "blur(6px)" }}
              whileInView={{ opacity: 1, y: 0, scale: 1, filter: "blur(0px)" }}
              viewport={{ once: true, margin: "-100px" }}
              transition={{ type: "spring", stiffness: 160, damping: 16 }}
              className="relative mb-5 inline-flex items-center gap-2 overflow-hidden rounded-full border border-orange-200/60 bg-white/70 px-4 py-1.5 text-sm font-semibold text-orange-600 shadow-sm backdrop-blur-md"
            >
              <span className="relative flex h-2 w-2">
                {!reduce && <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-orange-400 opacity-75" />}
                <span className="relative inline-flex h-2 w-2 rounded-full bg-orange-500" />
              </span>
              <Sparkles className="h-3.5 w-3.5" /> Pricing
              {!reduce && (
                <motion.span
                  aria-hidden
                  className="absolute inset-y-0 w-8 -skew-x-12 bg-orange-200/60 blur-sm"
                  initial={{ x: "-300%" }}
                  animate={{ x: "700%" }}
                  transition={{ duration: 1.4, ease: "easeInOut", repeat: Infinity, repeatDelay: 4 }}
                />
              )}
            </motion.span>

            <MaskedWords id="pricing-heading" words={["Pick", "a", "plan.", "Launch", "your", "event."]} gradientFrom={3} reduce={reduce} />

            {/* Underline that draws under the headline */}
            <motion.svg
              aria-hidden
              viewBox="0 0 300 12"
              className="mx-auto mt-2 h-3 w-48 text-orange-400 sm:w-64"
              fill="none"
            >
              <motion.path
                d="M2 8 C 60 2, 120 12, 180 5 S 270 3, 298 7"
                stroke="currentColor"
                strokeWidth="3"
                strokeLinecap="round"
                initial={reduce ? false : { pathLength: 0, opacity: 0 }}
                whileInView={{ pathLength: 1, opacity: 1 }}
                viewport={{ once: true }}
                transition={{ duration: 1.1, delay: 0.9, ease: EASE }}
              />
            </motion.svg>

            <motion.p
              initial={reduce ? false : { opacity: 0, y: 16, filter: "blur(6px)" }}
              whileInView={{ opacity: 1, y: 0, filter: "blur(0px)" }}
              viewport={{ once: true, margin: "-100px" }}
              transition={{ duration: 0.8, delay: 0.45, ease: EASE }}
              className="mx-auto mt-5 max-w-2xl font-[family-name:var(--font-body)] text-base leading-relaxed text-gray-600 sm:text-lg"
            >
              Simple pricing with no hidden fees. Choose the plan that fits your event size and start building your invitations.
            </motion.p>

            <TrustBar reduce={reduce} />
            <StatsStrip plans={plans} reduce={reduce} />
          </div>

          {/* Cards */}
          <motion.div
            initial="hidden"
            whileInView="show"
            viewport={{ once: true, margin: "-50px" }}
            variants={cardsContainer}
            className="grid grid-cols-1 items-stretch gap-8 pt-4 md:grid-cols-3 lg:gap-10"
          >
            {plans.map((plan, index) => (
              <PlanCard
                key={plan.id}
                plan={plan}
                index={index}
                popular={index === POPULAR_INDEX}
                bestValue={plan.id === bestValueId}
                reduce={reduce}
                onSelect={() => setSelectedPlan(plan)}
              />
            ))}
          </motion.div>

          {/* Secondary actions */}
          <motion.div
            initial={reduce ? false : { opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: 0.4, duration: 0.6 }}
            className="mt-14 flex flex-col items-center justify-center gap-3 sm:flex-row"
          >
            <button
              type="button"
              onClick={() => setShowCompare((v) => !v)}
              aria-expanded={showCompare}
              aria-controls="plan-compare"
              className={`flex items-center gap-2 rounded-full border border-orange-200 bg-white/80 px-6 py-3 text-sm font-bold text-gray-700 shadow-sm backdrop-blur-md transition-all hover:bg-white hover:shadow-md ${focusRing}`}
            >
              {showCompare ? "Hide comparison" : "Compare plans side by side"}
              <ChevronDown className={`h-4 w-4 text-orange-500 transition-transform duration-300 ${showCompare ? "rotate-180" : ""}`} />
            </button>
            <button
              type="button"
              onClick={() => setIsDirectoryOpen(true)}
              className={`group flex items-center gap-2 rounded-full border border-orange-200 bg-white/80 px-6 py-3 text-sm font-bold text-gray-700 shadow-sm backdrop-blur-md transition-all hover:bg-white hover:shadow-md ${focusRing}`}
            >
              Browse all plans
              <ArrowRight className="h-4 w-4 text-orange-500 transition-transform group-hover:translate-x-1" />
            </button>
          </motion.div>

          <AnimatePresence initial={false}>
            {showCompare && (
              <motion.div
                id="plan-compare"
                initial={reduce ? false : { height: 0, opacity: 0 }}
                animate={{ height: "auto", opacity: 1 }}
                exit={reduce ? undefined : { height: 0, opacity: 0 }}
                transition={{ duration: 0.45, ease: EASE }}
                className="overflow-hidden"
              >
                <div className="pt-8">
                  <CompareTable plans={plans} popularId={popularPlan?.id} />
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Single template callout */}
          <motion.div
            initial={reduce ? false : { opacity: 0, y: 40, scale: 0.96 }}
            whileInView={{ opacity: 1, y: 0, scale: 1 }}
            viewport={{ once: true, margin: "-60px" }}
            transition={{ duration: 0.8, ease: EASE }}
            className="mx-auto mt-14 max-w-4xl"
          >
            <TemplatesCallout reduce={reduce} />
          </motion.div>

          {/* FAQ */}
          <div className="mx-auto mt-20 max-w-3xl">
            <motion.h3
              initial={reduce ? false : { opacity: 0, y: 20, filter: "blur(6px)" }}
              whileInView={{ opacity: 1, y: 0, filter: "blur(0px)" }}
              viewport={{ once: true, margin: "-60px" }}
              transition={{ duration: 0.7, ease: EASE }}
              className="mb-6 text-center font-[family-name:var(--font-display)] text-2xl font-bold text-gray-900 sm:text-3xl"
            >
              Questions before you buy?
            </motion.h3>
            <motion.div
              variants={{ hidden: {}, show: { transition: { staggerChildren: 0.1 } } }}
              initial={reduce ? "show" : "hidden"}
              whileInView="show"
              viewport={{ once: true, margin: "-60px" }}
              className="space-y-3"
            >
              {FAQ.map((item, i) => (
                <FaqItem key={item.q} q={item.q} a={item.a} defaultOpen={i === 0} reduce={reduce} />
              ))}
            </motion.div>
            <p className="mt-6 text-center text-sm text-gray-600">Still unsure? Message us on WhatsApp any time, we&apos;re here 24/7.</p>
          </div>

          <motion.p
            initial={{ opacity: 0 }}
            whileInView={{ opacity: 1 }}
            viewport={{ once: true }}
            transition={{ delay: 0.4, duration: 0.8 }}
            className="mt-10 flex items-center justify-center gap-2 text-sm font-medium text-gray-600"
          >
            <ShieldCheck className="h-4 w-4 text-[#f97316]" />
            Secure checkout. All purchases are final. No refunds.
          </motion.p>
        </div>
      </section>

      {/* Mobile sticky CTA */}
      <AnimatePresence>
        {sectionInView && !anyOverlay && popularPlan && (
          <motion.div
            initial={reduce ? false : { y: 90, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={reduce ? undefined : { y: 90, opacity: 0 }}
            transition={{ duration: 0.4, ease: EASE }}
            className="fixed inset-x-0 bottom-0 z-40 border-t border-orange-200/60 bg-white/90 px-4 pb-[max(0.75rem,env(safe-area-inset-bottom))] pt-3 shadow-[0_-10px_30px_-15px_rgba(0,0,0,0.25)] backdrop-blur-xl md:hidden"
          >
            <div className="mx-auto flex max-w-md items-center justify-between gap-3">
              <div className="min-w-0">
                <p className="truncate text-xs font-medium text-gray-500">
                  {Number.isFinite(lowestPrice) ? `Plans from ${formatter.format(lowestPrice)}` : "Choose your plan"}
                </p>
                <p className="truncate font-[family-name:var(--font-display)] text-sm font-bold text-gray-900">
                  {popularPlan.name} is our most popular
                </p>
              </div>
              <button
                type="button"
                onClick={() => setSelectedPlan(popularPlan)}
                className={`shrink-0 rounded-xl px-5 py-2.5 text-sm font-bold text-white ${primaryBtn} ${focusRing}`}
              >
                Get started
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <PlanPreviewModal plan={selectedPlan} onClose={closeModal} />
      <DirectoryModal isOpen={isDirectoryOpen} onClose={closeDirectory} onSelect={selectFromDirectory} />
    </>
  );
}

/* -------------------------------------------------------------------------- */
/*  Public component                                                          */
/* -------------------------------------------------------------------------- */

export function PricingPreview() {
  const [plans, setPlans] = useState<PlanData[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(false);
    (async () => {
      try {
        // Top 3 featured plans for the landing page
        const res = await apiClient.get("/public/plans/all?limit=3");
        if (cancelled) return;
        if (res.data?.status === "success") setPlans(res.data.data.plans);
        else setError(true);
      } catch (e) {
        console.error("Failed to load plans", e);
        if (!cancelled) setError(true);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [attempt]);

  if (loading) return <PricingSkeleton />;
  if (error) return <PricingError onRetry={() => setAttempt((n) => n + 1)} />;
  if (plans.length === 0) return null;

  return <PricingSection plans={plans} />;
}