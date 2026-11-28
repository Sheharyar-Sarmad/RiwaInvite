"use client";

import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
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
  useSpring,
  useTransform,
  Variants,
} from "framer-motion";
import { Check, Sparkles, ShieldCheck, X, ArrowRight, ArrowUpRight, Zap, Crown } from "lucide-react";
import { apiClient } from "@/lib/api/api_base";

/* -------------------------------------------------------------------------- */
/*  Constants, types, helpers                                                 */
/* -------------------------------------------------------------------------- */

const EASE = [0.16, 1, 0.3, 1] as const;
const MAX_TILT = 4; // degrees: keep it subtle

const focusRing =
  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-500 focus-visible:ring-offset-2";

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

const periodLabel = (days: number) =>
  days === 30 ? "month" : days === 365 ? "year" : `${days} days`;

const durationLabel = (days: number) =>
  days === 30 ? "1 month" : days === 365 ? "1 year" : days === 1 ? "1 day" : `${days} days`;

const isPremiumPlan = (p: PlanData) =>
  p.price > 4000 || p.name.toLowerCase().includes("premium");

const perTemplate = (p: PlanData) => {
  const total = p.maxSimpleTemplates + p.maxPremiumTemplates;
  return total > 0 ? p.price / total : null;
};

const plural = (n: number, one: string, many: string) => `${n} ${n === 1 ? one : many}`;

/** Full list, used by the modal. */
function buildFeatures(plan: PlanData, extended = false): Feature[] {
  const features: Feature[] = [
    { label: plural(plan.maxSimpleTemplates, "standard template", "standard templates"), active: true },
    { label: plural(plan.maxPremiumTemplates, "premium template", "premium templates"), active: true },
    { label: "Real-time RSVP tracking", active: true },
    { label: "Custom URL slug", active: plan.allowsCustomSlug },
    { label: "24/7 WhatsApp support", active: true },
  ];
  if (extended) features.push({ label: "AI Design Studio access", active: true });
  return features;
}

/** Short list, used on the cards (template counts live in the stat boxes). */
const cardFeatures = (plan: PlanData): Feature[] => [
  { label: "Real-time RSVP tracking", active: true },
  { label: "Custom URL slug", active: plan.allowsCustomSlug },
  { label: "24/7 WhatsApp support", active: true },
];

const containerVariants: Variants = {
  hidden: { opacity: 0 },
  show: { opacity: 1, transition: { staggerChildren: 0.14 } },
};

const itemVariants: Variants = {
  hidden: { opacity: 0, y: 32, filter: "blur(10px)" },
  show: { opacity: 1, y: 0, filter: "blur(0px)", transition: { duration: 0.8, ease: EASE } },
};

/* -------------------------------------------------------------------------- */
/*  Motion primitives                                                         */
/* -------------------------------------------------------------------------- */

/** Number that counts up once it scrolls into view. */
function CountUp({
  value,
  reduce,
  format,
  delay = 0,
}: {
  value: number;
  reduce: boolean;
  format: (v: number) => string;
  delay?: number;
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
    const controls = animate(mv, value, { duration: 1.4, ease: EASE, delay });
    return () => controls.stop();
  }, [inView, value, reduce, mv, delay]);

  return (
    <motion.span ref={ref} className="tabular-nums">
      {text}
    </motion.span>
  );
}

/** Price that counts up once it scrolls into view. */
function Price({ value, reduce }: { value: number; reduce: boolean }) {
  return (
    <CountUp
      value={value}
      reduce={reduce}
      format={(v) => (value > 0 ? formatter.format(Math.round(v)) : "Free")}
    />
  );
}

/*
 * The heading itself is observed (it is never clipped). Observing the words
 * would fail: they start below an overflow-hidden mask, so the browser reports
 * them as never visible and the animation would never start.
 */
const wordsParent: Variants = {
  hidden: {},
  show: { transition: { staggerChildren: 0.07, delayChildren: 0.1 } },
};

const wordChild: Variants = {
  hidden: { y: "115%", rotate: 4 },
  show: { y: 0, rotate: 0, transition: { duration: 0.9, ease: EASE } },
};

/** Headline whose words rise out of a mask. */
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
              i >= gradientFrom
                ? "bg-gradient-to-r from-[#f97316] via-amber-500 to-[#f97316] bg-clip-text text-transparent"
                : ""
            }`}
          >
            {w}
          </motion.span>
        </span>
      ))}
    </motion.h2>
  );
}

/* -------------------------------------------------------------------------- */
/*  Plan card                                                                 */
/* -------------------------------------------------------------------------- */

function StatBox({
  value,
  label,
  reduce,
  delay,
}: {
  value: number;
  label: string;
  reduce: boolean;
  delay: number;
}) {
  return (
    <motion.div
      whileHover={reduce ? undefined : { y: -3, scale: 1.02 }}
      transition={{ type: "spring", stiffness: 300, damping: 20 }}
      className="rounded-xl border border-orange-900/10 bg-white/60 px-3.5 py-2.5 shadow-[inset_0_1px_0_rgba(255,255,255,0.9)] transition-colors duration-300 group-hover:border-orange-300/60"
    >
      <div className="font-[family-name:var(--font-display)] text-xl font-bold leading-none text-gray-900">
        <CountUp value={value} reduce={reduce} format={(v) => String(Math.round(v))} delay={delay} />
      </div>
      <div className="mt-1 font-[family-name:var(--font-body)] text-xs text-gray-500">{label}</div>
    </motion.div>
  );
}

function PlanCard({
  plan,
  best,
  reduce,
  onSelect,
}: {
  plan: PlanData;
  best: boolean;
  reduce: boolean;
  onSelect: () => void;
}) {
  const premium = isPremiumPlan(plan);
  const each = perTemplate(plan);

  // Tilt (subtle) and a cursor-following light.
  const px = useMotionValue(0);
  const py = useMotionValue(0);
  const sx = useSpring(px, { stiffness: 140, damping: 22 });
  const sy = useSpring(py, { stiffness: 140, damping: 22 });
  const rotateY = useTransform(sx, [-0.5, 0.5], [-MAX_TILT, MAX_TILT]);
  const rotateX = useTransform(sy, [-0.5, 0.5], [MAX_TILT, -MAX_TILT]);

  const gx = useMotionValue(-400);
  const gy = useMotionValue(-400);
  const glow = useMotionTemplate`radial-gradient(320px circle at ${gx}px ${gy}px, rgba(249,115,22,0.16), transparent 70%)`;
  const sheen = useMotionTemplate`radial-gradient(180px circle at ${gx}px ${gy}px, rgba(255,255,255,0.7), transparent 70%)`;

  const handleMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (e.pointerType === "touch") return;
    const r = e.currentTarget.getBoundingClientRect();
    const nx = (e.clientX - r.left) / r.width;
    const ny = (e.clientY - r.top) / r.height;
    px.set(nx - 0.5);
    py.set(ny - 0.5);
    gx.set(nx * r.width);
    gy.set(ny * r.height);
  };

  const handleLeave = () => {
    px.set(0);
    py.set(0);
    gx.set(-400);
    gy.set(-400);
  };

  const features = cardFeatures(plan);

  return (
    <motion.div variants={itemVariants} className="h-full">
      <motion.div
        onPointerMove={reduce ? undefined : handleMove}
        onPointerLeave={handleLeave}
        whileHover={reduce ? undefined : { y: -8 }}
        transition={{ type: "spring", stiffness: 260, damping: 22 }}
        style={reduce ? undefined : { rotateX, rotateY, transformPerspective: 1400 }}
        className={`group relative h-full overflow-hidden rounded-[1.75rem] p-px transition-[background-color,box-shadow] duration-500 ${
          best
            ? "bg-orange-200/50 shadow-[0_28px_60px_-25px_rgba(249,115,22,0.55)]"
            : "bg-orange-900/10 shadow-[0_10px_40px_-22px_rgba(124,45,18,0.35)] hover:bg-orange-300/60 hover:shadow-[0_28px_55px_-25px_rgba(249,115,22,0.45)]"
        }`}
      >
        {/* Rotating light beam on the best-value card */}
        {best && (
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

        <div className="relative flex h-full flex-col overflow-hidden rounded-[calc(1.75rem-1px)] bg-gradient-to-br from-[#fffaf6] via-[#fff3e8] to-[#fde6d3] backdrop-blur-xl">
          {/* Cursor light and glossy sheen */}
          <motion.div
            aria-hidden
            style={{ background: glow }}
            className="pointer-events-none absolute inset-0 opacity-0 transition-opacity duration-300 group-hover:opacity-100"
          />
          <motion.div
            aria-hidden
            style={{ background: sheen }}
            className="pointer-events-none absolute inset-0 opacity-0 mix-blend-soft-light transition-opacity duration-300 group-hover:opacity-100"
          />

          {/* Body */}
          <div className="relative flex flex-1 flex-col p-6">
            {/* Header */}
            <div className="flex items-start gap-4">
              <motion.div
                initial={reduce ? false : { scale: 0, rotate: -30 }}
                whileInView={{ scale: 1, rotate: 0 }}
                viewport={{ once: true, margin: "-20px" }}
                transition={{ type: "spring", stiffness: 220, damping: 14, delay: 0.25 }}
                className="relative flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-neutral-900 text-white shadow-lg shadow-neutral-900/25 transition-transform duration-500 group-hover:-rotate-6 group-hover:scale-105"
              >
                {best && !reduce && (
                  <span
                    aria-hidden
                    className="absolute inset-0 animate-ping rounded-2xl bg-orange-400/30"
                  />
                )}
                {premium ? (
                  <Crown className="relative h-6 w-6 text-amber-300" />
                ) : (
                  <Zap className="relative h-6 w-6 text-orange-300" />
                )}
              </motion.div>

              <div className="min-w-0 flex-1">
                <div className="flex items-center justify-between gap-2">
                  <h3
                    title={plan.name}
                    className="truncate font-[family-name:var(--font-display)] text-xl font-bold text-gray-900"
                  >
                    {plan.name}
                  </h3>
                  {best && (
                    <span className="relative shrink-0 overflow-hidden rounded-md border border-orange-900/15 bg-white/70 px-2 py-1 text-[10px] font-bold uppercase tracking-wider text-gray-700">
                      Best value
                      {!reduce && (
                        <motion.span
                          aria-hidden
                          className="absolute inset-y-0 w-5 -skew-x-12 bg-orange-300/50 blur-[2px]"
                          initial={{ x: "-250%" }}
                          animate={{ x: "700%" }}
                          transition={{ duration: 1.3, ease: "easeInOut", repeat: Infinity, repeatDelay: 3.2 }}
                        />
                      )}
                    </span>
                  )}
                </div>
                <p className="mt-1 line-clamp-2 min-h-[2.5rem] font-[family-name:var(--font-body)] text-sm leading-5 text-gray-600">
                  {plan.description || "Perfect for your event needs."}
                </p>
              </div>
            </div>

            {/* Price */}
            <div className="mt-5 flex items-baseline justify-between gap-3">
              <span className="font-[family-name:var(--font-display)] text-4xl font-bold tracking-tight text-gray-900">
                <Price value={plan.price} reduce={reduce} />
              </span>
              <span className="text-[11px] font-bold uppercase tracking-[0.14em] text-gray-500">
                Per {periodLabel(plan.durationDays)}
              </span>
            </div>
            <p className="mt-1 min-h-[1.25rem] font-[family-name:var(--font-body)] text-sm text-gray-500">
              {each !== null && plan.price > 0 && (
                <>
                  About <span className="font-semibold text-gray-800">{formatter.format(Math.round(each))}</span> per template
                </>
              )}
            </p>

            <div className="my-4 border-t border-dashed border-orange-900/20" />

            {/* Stat boxes */}
            <div className="grid grid-cols-2 gap-3">
              <StatBox value={plan.maxSimpleTemplates} label="Standard templates" reduce={reduce} delay={0.2} />
              <StatBox value={plan.maxPremiumTemplates} label="Premium templates" reduce={reduce} delay={0.3} />
            </div>

            {/* Features */}
            <ul className="mt-5 flex-1 space-y-3">
              {features.map((feat, i) => (
                <motion.li
                  key={feat.label}
                  initial={reduce ? false : { opacity: 0, x: -14 }}
                  whileInView={{ opacity: 1, x: 0 }}
                  viewport={{ once: true, margin: "-20px" }}
                  transition={{ delay: 0.35 + i * 0.09, duration: 0.55, ease: EASE }}
                  className={`flex items-center gap-3 font-[family-name:var(--font-body)] text-sm ${
                    feat.active ? "font-medium text-gray-800" : "text-gray-400 line-through"
                  }`}
                >
                  {feat.active ? (
                    <motion.span
                      initial={reduce ? false : { scale: 0 }}
                      whileInView={{ scale: 1 }}
                      viewport={{ once: true }}
                      transition={{ type: "spring", stiffness: 380, damping: 14, delay: 0.5 + i * 0.09 }}
                      className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-neutral-900 text-white"
                    >
                      <Check className="h-3 w-3" strokeWidth={3.5} />
                    </motion.span>
                  ) : (
                    <span className="h-5 w-5 shrink-0 rounded-full border border-dashed border-gray-300" />
                  )}
                  {feat.label}
                </motion.li>
              ))}
            </ul>
          </div>

          {/* Footer (ticket divider with side notches) */}
          <div className="relative border-t border-dashed border-orange-900/20">
            <span
              aria-hidden
              className="absolute left-0 top-0 h-5 w-5 -translate-x-1/2 -translate-y-1/2 rounded-full border border-orange-900/10 bg-[#fbe3cf]"
            />
            <span
              aria-hidden
              className="absolute right-0 top-0 h-5 w-5 translate-x-1/2 -translate-y-1/2 rounded-full border border-orange-900/10 bg-[#fbe3cf]"
            />

            <motion.button
              type="button"
              onClick={onSelect}
              whileTap={{ scale: 0.98 }}
              className={`group/btn relative flex w-full cursor-pointer items-center justify-between overflow-hidden px-6 py-4 text-left font-[family-name:var(--font-display)] text-[15px] font-bold text-gray-900 ${focusRing}`}
            >
              {/* Hover sweep */}
              {!reduce && (
                <span
                  aria-hidden
                  className="pointer-events-none absolute inset-y-0 left-0 w-10 -translate-x-full -skew-x-12 bg-orange-300/40 blur-md transition-transform duration-[900ms] ease-out group-hover/btn:translate-x-[900%]"
                />
              )}
              <span className="relative">Choose {plan.name}</span>
              <span className="relative flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-orange-900/[0.07] text-gray-700 transition-all duration-300 group-hover:bg-neutral-900 group-hover:text-white group-hover/btn:scale-110">
                <ArrowUpRight className="h-4 w-4 transition-transform duration-300 group-hover:rotate-45" />
              </span>
            </motion.button>
          </div>
        </div>
      </motion.div>
    </motion.div>
  );
}

/* -------------------------------------------------------------------------- */
/*  Plan modal                                                                */
/* -------------------------------------------------------------------------- */

const rise: Variants = {
  hidden: { opacity: 0, y: 10 },
  show: { opacity: 1, y: 0, transition: { duration: 0.5, ease: EASE } },
};

const riseParent: Variants = {
  hidden: {},
  show: { transition: { staggerChildren: 0.05, delayChildren: 0.12 } },
};

function Spec({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="px-4 py-3">
      <div className="font-[family-name:var(--font-display)] text-lg font-bold leading-none text-gray-900">
        {children}
      </div>
      <div className="mt-1.5 text-xs text-gray-500">{label}</div>
    </div>
  );
}

function PlanModalContent({
  plan,
  best,
  onClose,
}: {
  plan: PlanData;
  best: boolean;
  onClose: () => void;
}) {
  const reduce = useReducedMotion() ?? false;
  const closeRef = useRef<HTMLButtonElement>(null);
  const [isPresent, safeToRemove] = usePresence();

  const premium = isPremiumPlan(plan);
  const each = perTemplate(plan);
  const features = buildFeatures(plan, true);

  // Faint spotlight that follows the cursor inside the panel.
  const mx = useMotionValue(-400);
  const my = useMotionValue(-400);
  const spot = useMotionTemplate`radial-gradient(340px circle at ${mx}px ${my}px, rgba(249,115,22,0.11), transparent 70%)`;

  const onPanelMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (reduce || e.pointerType === "touch") return;
    const r = e.currentTarget.getBoundingClientRect();
    mx.set(e.clientX - r.left);
    my.set(e.clientY - r.top);
  };

  // Lock scroll, focus the close button, close on Escape.
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

  // Safety net: if an exit animation ever hangs, release the page anyway.
  useEffect(() => {
    if (isPresent) return;
    document.body.style.overflow = "";
    const t = window.setTimeout(() => safeToRemove?.(), 450);
    return () => window.clearTimeout(t);
  }, [isPresent, safeToRemove]);

  return (
    <motion.div
      role="dialog"
      aria-modal="true"
      aria-label={`${plan.name} plan details`}
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0, transition: { duration: 0.22 } }}
      transition={{ duration: 0.22 }}
      onClick={onClose}
      className={`fixed inset-0 z-[9999] flex items-end justify-center bg-neutral-950/55 backdrop-blur-md sm:items-center sm:p-6 ${
        isPresent ? "" : "pointer-events-none"
      }`}
    >
      <motion.div
        initial={reduce ? false : { opacity: 0, y: 36, scale: 0.97 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={reduce ? undefined : { opacity: 0, y: 20, scale: 0.98, transition: { duration: 0.2, ease: EASE } }}
        transition={{ type: "spring", damping: 28, stiffness: 260 }}
        onClick={(e) => e.stopPropagation()}
        onPointerMove={onPanelMove}
        className="relative flex max-h-[94dvh] w-full max-w-[30rem] flex-col overflow-hidden rounded-t-[1.75rem] border border-orange-900/10 bg-gradient-to-br from-[#fffaf6] via-[#fff3e8] to-[#fde6d3] shadow-[0_40px_100px_-30px_rgba(124,45,18,0.55)] sm:rounded-[1.75rem]"
      >
        {/* Top hairline highlight + cursor spotlight */}
        <div
          aria-hidden
          className="pointer-events-none absolute inset-x-8 top-0 h-px bg-gradient-to-r from-transparent via-white to-transparent"
        />
        <motion.div aria-hidden style={{ background: spot }} className="pointer-events-none absolute inset-0" />

        {/* Mobile grab handle */}
        <div aria-hidden className="relative mx-auto mt-2.5 h-1 w-10 shrink-0 rounded-full bg-orange-900/15 sm:hidden" />

        <button
          ref={closeRef}
          type="button"
          onClick={onClose}
          aria-label="Close"
          className="absolute right-4 top-4 z-10 flex h-8 w-8 cursor-pointer items-center justify-center rounded-full bg-orange-900/[0.06] text-gray-600 transition-colors hover:bg-orange-900/10 hover:text-gray-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-500"
        >
          <X className="h-4 w-4" />
        </button>

        {/* Scrollable body */}
        <motion.div
          data-lenis-prevent
          variants={riseParent}
          initial={reduce ? "show" : "hidden"}
          animate="show"
          className="relative flex-1 overflow-y-auto px-6 pb-6 pt-5 sm:px-7 sm:pt-7"
        >
          {/* Header */}
          <motion.div variants={rise} className="flex items-start gap-3.5 pr-9">
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-neutral-900 text-orange-300">
              {premium ? <Crown className="h-5 w-5" /> : <Zap className="h-5 w-5" />}
            </div>
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-x-2.5 gap-y-1">
                <h3 className="font-[family-name:var(--font-display)] text-xl font-bold leading-tight text-gray-900">
                  {plan.name}
                </h3>
                {best && (
                  <span className="rounded-md border border-orange-900/15 bg-white/70 px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wider text-gray-700">
                    Best value
                  </span>
                )}
              </div>
              <p className="mt-1 font-[family-name:var(--font-body)] text-sm leading-5 text-gray-600">
                {plan.description || "Everything you need to create unforgettable events."}
              </p>
            </div>
          </motion.div>

          {/* Price */}
          <motion.div variants={rise} className="mt-7">
            <div className="flex items-end justify-between gap-4">
              <span className="font-[family-name:var(--font-display)] text-[2.75rem] font-bold leading-none tracking-tight text-gray-900">
                <Price value={plan.price} reduce={reduce} />
              </span>
              <span className="pb-1 text-[11px] font-bold uppercase tracking-[0.14em] text-gray-500">
                Per {periodLabel(plan.durationDays)}
              </span>
            </div>
            {each !== null && plan.price > 0 && (
              <p className="mt-2 font-[family-name:var(--font-body)] text-sm text-gray-500">
                About <span className="font-semibold text-gray-800">{formatter.format(Math.round(each))}</span> per template
              </p>
            )}
          </motion.div>

          <motion.div variants={rise} className="my-5 border-t border-dashed border-orange-900/20" />

          {/* Specs: one strip, not three cards */}
          <motion.div
            variants={rise}
            className="grid grid-cols-3 divide-x divide-orange-900/10 overflow-hidden rounded-xl border border-orange-900/10 bg-white/55"
          >
            <Spec label="Standard">
              <CountUp value={plan.maxSimpleTemplates} reduce={reduce} format={(v) => String(Math.round(v))} delay={0.25} />
            </Spec>
            <Spec label="Premium">
              <CountUp value={plan.maxPremiumTemplates} reduce={reduce} format={(v) => String(Math.round(v))} delay={0.35} />
            </Spec>
            <Spec label="Valid for">{durationLabel(plan.durationDays)}</Spec>
          </motion.div>

          {/* Included */}
          <motion.h4
            variants={rise}
            className="mt-6 text-[11px] font-semibold uppercase tracking-[0.14em] text-gray-500"
          >
            What&apos;s included
          </motion.h4>
          <ul className="mt-3 space-y-2.5">
            {features.map((feat) => (
              <motion.li
                key={feat.label}
                variants={rise}
                className={`flex items-center gap-3 font-[family-name:var(--font-body)] text-sm ${
                  feat.active ? "font-medium text-gray-800" : "text-gray-400 line-through"
                }`}
              >
                {feat.active ? (
                  <span className="flex h-[18px] w-[18px] shrink-0 items-center justify-center rounded-full bg-neutral-900 text-white">
                    <Check className="h-2.5 w-2.5" strokeWidth={3.5} />
                  </span>
                ) : (
                  <span className="h-[18px] w-[18px] shrink-0 rounded-full border border-dashed border-gray-300" />
                )}
                {feat.label}
              </motion.li>
            ))}
          </ul>
        </motion.div>

        {/* Pinned footer */}
        <div className="relative shrink-0 border-t border-dashed border-orange-900/20 bg-[#fff6ee]/80 px-6 pb-5 pt-4 sm:px-7">
          <Link
            href={`/plan/${plan.id}`}
            className="group relative flex h-12 w-full items-center justify-center gap-2 overflow-hidden rounded-xl bg-neutral-900 font-[family-name:var(--font-display)] text-[15px] font-semibold text-white shadow-[0_8px_20px_-10px_rgba(23,23,23,0.7)] transition-[background-color,transform] duration-200 hover:bg-neutral-800 active:scale-[0.99] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-500 focus-visible:ring-offset-2 focus-visible:ring-offset-[#fff6ee]"
          >
            {!reduce && (
              <span
                aria-hidden
                className="pointer-events-none absolute inset-y-0 left-0 w-10 -translate-x-full -skew-x-12 bg-white/15 blur-md transition-transform duration-[900ms] ease-out group-hover:translate-x-[1100%]"
              />
            )}
            <span className="relative">Continue to checkout</span>
            <ArrowRight className="relative h-4 w-4 transition-transform duration-200 group-hover:translate-x-0.5" />
          </Link>

          <p className="mt-3 flex items-center justify-center gap-1.5 text-xs text-gray-500">
            <ShieldCheck className="h-3.5 w-3.5 text-emerald-600" />
            Secure checkout. All purchases are final.
          </p>
          <p className="mt-1.5 text-center text-xs text-gray-500">
            Only need one design?{" "}
            <Link
              href="/templates"
              className="font-medium text-gray-800 underline underline-offset-4 decoration-gray-400 transition-colors hover:decoration-gray-800"
            >
              Buy a single template
            </Link>
          </p>
        </div>
      </motion.div>
    </motion.div>
  );
}

function PlanPreviewModal({
  plan,
  best,
  onClose,
}: {
  plan: PlanData | null;
  best: boolean;
  onClose: () => void;
}) {
  // Mounted per plan so exit animations run and state resets on its own.
  return (
    <AnimatePresence>
      {plan && <PlanModalContent key={plan.id} plan={plan} best={best} onClose={onClose} />}
    </AnimatePresence>
  );
}

/* -------------------------------------------------------------------------- */
/*  Loading skeleton                                                          */
/* -------------------------------------------------------------------------- */

function PricingSkeleton() {
  return (
    <section className="w-full bg-[#fdeadb] py-24 sm:py-32" aria-busy="true">
      <div className="mx-auto mb-16 flex max-w-2xl flex-col items-center gap-4 px-4">
        <div className="h-7 w-28 animate-pulse rounded-full bg-white/70" />
        <div className="h-12 w-full animate-pulse rounded-xl bg-white/70" />
      </div>
      <div className="mx-auto grid max-w-7xl grid-cols-1 gap-6 px-4 md:grid-cols-3 lg:gap-8 lg:px-12">
        {[0, 1, 2].map((i) => (
          <div key={i} className="relative h-[440px] overflow-hidden rounded-[1.75rem] bg-white/60">
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

/* -------------------------------------------------------------------------- */
/*  Section                                                                   */
/* -------------------------------------------------------------------------- */

export function PricingPreview() {
  const [plans, setPlans] = useState<PlanData[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedPlan, setSelectedPlan] = useState<PlanData | null>(null);
  const reduce = useReducedMotion() ?? false;

  const sectionRef = useRef<HTMLElement>(null);
  const raf = useRef(0);

  // Cursor-reactive dot grid, throttled to one update per frame.
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

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await apiClient.get("/public/plans");
        if (!cancelled && res.data?.status === "success") setPlans(res.data.data.plans);
      } catch (error) {
        console.error("Failed to load plans", error);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  // Best value = the lowest price per template (the first one wins a tie).
  const bestId = useMemo(() => {
    let id: string | null = null;
    let min = Infinity;
    for (const p of plans) {
      const each = perTemplate(p);
      if (each !== null && p.price > 0 && each < min) {
        min = each;
        id = p.id;
      }
    }
    return id;
  }, [plans]);

  if (loading) return <PricingSkeleton />;
  if (plans.length === 0) return null;

  const mask =
    "radial-gradient(230px circle at var(--mx,-999px) var(--my,-999px), #000 0%, transparent 100%)";

  return (
    <>
      <section
        id="pricing"
        ref={sectionRef}
        onPointerMove={onMove}
        aria-labelledby="pricing-heading"
        className="relative isolate w-full overflow-hidden bg-[#fdeadb] py-20 sm:py-28"
      >
        {/* Background: gradient, dot grid, cursor-lit dots, drifting glows */}
        <div aria-hidden className="pointer-events-none absolute inset-0 -z-10">
          <div className="absolute inset-0 bg-gradient-to-b from-[#fff4ea] to-[#fbdcc0]" />
          <motion.div
            animate={reduce ? undefined : { x: [0, 60, 0], y: [0, 30, 0] }}
            transition={{ duration: 18, repeat: Infinity, ease: "easeInOut" }}
            className="absolute -left-32 top-10 h-[420px] w-[420px] rounded-full bg-orange-300/30 blur-[120px]"
          />
          <motion.div
            animate={reduce ? undefined : { x: [0, -50, 0], y: [0, -40, 0] }}
            transition={{ duration: 22, repeat: Infinity, ease: "easeInOut" }}
            className="absolute -right-32 bottom-0 h-[420px] w-[420px] rounded-full bg-amber-300/30 blur-[120px]"
          />
          <div
            className="absolute inset-0"
            style={{
              backgroundImage: "radial-gradient(circle, rgba(194,65,12,0.2) 1.5px, transparent 1.5px)",
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
        </div>

        <div className="relative z-10 mx-auto w-full max-w-7xl px-4 sm:px-6 lg:px-12">
          {/* Header */}
          <div className="mx-auto mb-14 max-w-3xl text-center">
            <motion.span
              initial={reduce ? false : { opacity: 0, y: 16, filter: "blur(6px)" }}
              whileInView={{ opacity: 1, y: 0, filter: "blur(0px)" }}
              viewport={{ once: true, margin: "-100px" }}
              transition={{ duration: 0.7, ease: EASE }}
              className="relative mb-5 inline-flex items-center gap-2 overflow-hidden rounded-full border border-orange-200/60 bg-white/70 px-4 py-1.5 text-sm font-semibold text-orange-600 shadow-sm backdrop-blur-md"
            >
              <Sparkles className="h-3.5 w-3.5" /> Pricing
            </motion.span>

            <MaskedWords
              id="pricing-heading"
              words={["Invest", "in", "the", "perfect", "impression"]}
              gradientFrom={3}
              reduce={reduce}
            />

            <motion.p
              initial={reduce ? false : { opacity: 0, y: 16, filter: "blur(6px)" }}
              whileInView={{ opacity: 1, y: 0, filter: "blur(0px)" }}
              viewport={{ once: true, margin: "-100px" }}
              transition={{ duration: 0.8, delay: 0.45, ease: EASE }}
              className="mx-auto mt-5 max-w-2xl font-[family-name:var(--font-body)] text-base leading-relaxed text-gray-600 sm:text-lg"
            >
              Transparent pricing with no hidden fees. Choose the plan that fits your event size.
            </motion.p>
          </div>

          {/* Cards */}
          <motion.div
            initial="hidden"
            whileInView="show"
            viewport={{ once: true, margin: "-50px" }}
            variants={containerVariants}
            className="grid grid-cols-1 items-stretch gap-6 md:grid-cols-3 lg:gap-8"
          >
            {plans.map((plan) => (
              <PlanCard
                key={plan.id}
                plan={plan}
                best={plan.id === bestId}
                reduce={reduce}
                onSelect={() => setSelectedPlan(plan)}
              />
            ))}
          </motion.div>

          <motion.p
            initial={{ opacity: 0 }}
            whileInView={{ opacity: 1 }}
            viewport={{ once: true }}
            transition={{ delay: 0.8, duration: 0.8 }}
            className="mt-14 flex items-center justify-center gap-2 text-sm font-medium text-gray-600"
          >
            <ShieldCheck className="h-4 w-4 text-emerald-600" />
            Secure checkout. All purchases are final. No refunds.
          </motion.p>
        </div>
      </section>

      <PlanPreviewModal
        plan={selectedPlan}
        best={selectedPlan?.id === bestId}
        onClose={closeModal}
      />
    </>
  );
}