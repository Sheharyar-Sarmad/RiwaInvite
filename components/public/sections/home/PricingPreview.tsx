"use client";

import { useCallback, useEffect, useRef, useState } from "react";
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
import { Check, Sparkles, ShieldCheck, X, ArrowRight, Zap, Crown, Star } from "lucide-react";
import { apiClient } from "@/lib/api/api_base";

/* -------------------------------------------------------------------------- */
/*  Constants, types, helpers                                                 */
/* -------------------------------------------------------------------------- */

const EASE = [0.16, 1, 0.3, 1] as const;
const POPULAR_INDEX = 1;
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

const isPremiumPlan = (p: PlanData) =>
  p.price > 4000 || p.name.toLowerCase().includes("premium");

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

/** Price that counts up once it scrolls into view. */
function Price({ value, reduce }: { value: number; reduce: boolean }) {
  const ref = useRef<HTMLSpanElement>(null);
  const inView = useInView(ref, { once: true, margin: "-40px" });
  const mv = useMotionValue(reduce ? value : 0);
  const text = useTransform(mv, (v) => (value > 0 ? formatter.format(Math.round(v)) : "Free"));

  useEffect(() => {
    if (reduce) {
      mv.set(value);
      return;
    }
    if (!inView) return;
    const controls = animate(mv, value, { duration: 1.4, ease: EASE });
    return () => controls.stop();
  }, [inView, value, reduce, mv]);

  return (
    <motion.span ref={ref} className="tabular-nums">
      {text}
    </motion.span>
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

/** Check that draws itself in. */
function AnimatedCheck({ active, tone }: { active: boolean; tone: "light" | "dark" }) {
  const bg = active
    ? tone === "dark"
      ? "bg-orange-500/10 text-[#f97316]"
      : "bg-orange-100 text-[#f97316]"
    : tone === "dark"
    ? "bg-white/5 text-neutral-600"
    : "bg-gray-100 text-gray-400";
  return (
    <span className={`mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full ${bg}`}>
      <Check className="h-3 w-3" strokeWidth={3} />
    </span>
  );
}

/* -------------------------------------------------------------------------- */
/*  Plan card                                                                 */
/* -------------------------------------------------------------------------- */

function PlanCard({
  plan,
  popular,
  reduce,
  onSelect,
}: {
  plan: PlanData;
  popular: boolean;
  reduce: boolean;
  onSelect: () => void;
}) {
  const premium = isPremiumPlan(plan);

  // Tilt (subtle) and a cursor-following light.
  const px = useMotionValue(0);
  const py = useMotionValue(0);
  const sx = useSpring(px, { stiffness: 140, damping: 22 });
  const sy = useSpring(py, { stiffness: 140, damping: 22 });
  const rotateY = useTransform(sx, [-0.5, 0.5], [-MAX_TILT, MAX_TILT]);
  const rotateX = useTransform(sy, [-0.5, 0.5], [MAX_TILT, -MAX_TILT]);

  const gx = useMotionValue(-400);
  const gy = useMotionValue(-400);
  const glow = useMotionTemplate`radial-gradient(300px circle at ${gx}px ${gy}px, rgba(249,115,22,0.14), transparent 70%)`;
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

  return (
    // Plain wrapper owns the static offset so it can't clash with motion transforms.
    <div className={popular ? "z-10 md:-translate-y-4" : ""}>
      <motion.div variants={itemVariants} className="h-full">
        <motion.div
          onPointerMove={reduce ? undefined : handleMove}
          onPointerLeave={handleLeave}
          whileHover={reduce ? undefined : { y: -6 }}
          transition={{ type: "spring", stiffness: 260, damping: 22 }}
          style={reduce ? undefined : { rotateX, rotateY, transformPerspective: 1400 }}
          className={`group relative h-full overflow-hidden rounded-[2rem] p-px transition-[background-color,box-shadow] duration-500 ${
            popular
              ? "bg-orange-200/40 shadow-[0_30px_70px_-25px_rgba(249,115,22,0.55)]"
              : "bg-black/5 shadow-[0_10px_40px_-20px_rgba(0,0,0,0.25)] hover:bg-orange-300/60 hover:shadow-[0_30px_60px_-25px_rgba(249,115,22,0.4)]"
          }`}
        >
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
            className={`relative flex h-full flex-col overflow-hidden rounded-[calc(2rem-1px)] p-8 backdrop-blur-xl ${
              popular ? "bg-white/95" : "bg-white/70"
            }`}
          >
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

            {/* Header */}
            <div className="relative mb-6 flex flex-col items-start">
              <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-orange-50 to-orange-100 text-[#f97316] shadow-[inset_0_1px_0_rgba(255,255,255,0.8)] ring-1 ring-orange-200/60 transition-transform duration-500 group-hover:-rotate-6 group-hover:scale-110">
                {premium ? <Crown className="h-6 w-6" /> : <Zap className="h-6 w-6" />}
              </div>
              <h3 className="font-[family-name:var(--font-display)] text-2xl font-bold text-gray-900">
                {plan.name}
              </h3>
              <p className="mt-2 line-clamp-2 min-h-[40px] font-[family-name:var(--font-body)] text-sm text-gray-500">
                {plan.description || "Perfect for your event needs."}
              </p>
            </div>

            {/* Price */}
            <div className="relative mb-8 flex items-baseline gap-2 border-b border-black/5 pb-8">
              <span className="font-[family-name:var(--font-display)] text-5xl font-bold tracking-tight text-gray-900">
                <Price value={plan.price} reduce={reduce} />
              </span>
              <span className="text-sm font-medium text-gray-500">/ {periodLabel(plan.durationDays)}</span>
            </div>

            {/* Features */}
            <ul className="relative mb-8 flex-1 space-y-4">
              {buildFeatures(plan).map((feat, i) => (
                <motion.li
                  key={feat.label}
                  initial={reduce ? false : { opacity: 0, x: -12 }}
                  whileInView={{ opacity: 1, x: 0 }}
                  viewport={{ once: true, margin: "-20px" }}
                  transition={{ delay: 0.3 + i * 0.07, duration: 0.5, ease: EASE }}
                  className={`flex items-start gap-3 font-[family-name:var(--font-body)] text-sm ${
                    feat.active ? "font-medium text-gray-700" : "text-gray-400 line-through"
                  }`}
                >
                  <AnimatedCheck active={feat.active} tone="light" />
                  {feat.label}
                </motion.li>
              ))}
            </ul>

            {/* CTA */}
            <motion.button
              type="button"
              onClick={onSelect}
              whileHover={reduce ? undefined : { scale: 1.02 }}
              whileTap={{ scale: 0.97 }}
              className={`group/btn relative flex w-full cursor-pointer items-center justify-center gap-2 overflow-hidden rounded-xl px-6 py-3.5 font-[family-name:var(--font-display)] text-sm font-bold text-white transition-colors duration-300 ${focusRing} ${
                popular
                  ? "bg-gradient-to-b from-[#fb8a3c] to-[#f97316] shadow-[0_10px_30px_-10px_rgba(249,115,22,0.8),inset_0_1px_0_rgba(255,255,255,0.3)]"
                  : "bg-[#2a2a2a] shadow-lg hover:bg-[#3a3a3a]"
              }`}
            >
              {popular && !reduce && (
                <motion.span
                  aria-hidden
                  className="absolute inset-y-0 w-12 -skew-x-12 bg-white/30 blur-md"
                  initial={{ x: "-300%" }}
                  animate={{ x: "1000%" }}
                  transition={{ duration: 1.5, ease: "easeInOut", repeat: Infinity, repeatDelay: 2.8 }}
                />
              )}
              <span className="relative">Choose {plan.name}</span>
              <ArrowRight className="relative h-4 w-4 transition-transform duration-300 group-hover/btn:translate-x-1" />
            </motion.button>
          </div>
        </motion.div>
      </motion.div>
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/*  Plan modal                                                                */
/* -------------------------------------------------------------------------- */

function PlanModalContent({ plan, onClose }: { plan: PlanData; onClose: () => void }) {
  const reduce = useReducedMotion() ?? false;
  const closeRef = useRef<HTMLButtonElement>(null);
  const [isPresent, safeToRemove] = usePresence();

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

        <motion.div
          variants={containerVariants}
          initial="hidden"
          animate="show"
          className="relative p-8 sm:p-10"
        >
          <motion.div variants={itemVariants} className="mb-8 flex flex-col items-center text-center">
            <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-white/5 shadow-sm ring-1 ring-white/10">
              <Crown className="h-8 w-8 text-[#f97316]" />
            </div>
            <h3 className="font-[family-name:var(--font-display)] text-3xl font-bold text-white">{plan.name}</h3>
            <p className="mt-2 text-sm text-neutral-400">
              {plan.description || "Everything you need to create unforgettable events."}
            </p>
          </motion.div>

          <motion.div variants={itemVariants} className="mb-8 flex items-baseline justify-center gap-2">
            <span className="font-[family-name:var(--font-display)] text-5xl font-bold text-white">
              <Price value={plan.price} reduce={reduce} />
            </span>
            <span className="text-sm font-medium text-neutral-500">/ {periodLabel(plan.durationDays)}</span>
          </motion.div>

          <motion.div variants={itemVariants} className="mb-8 rounded-2xl border border-white/5 bg-white/[0.02] p-6">
            <h4 className="mb-4 text-sm font-semibold text-neutral-300">What&apos;s included</h4>
            <ul className="space-y-3.5">
              {buildFeatures(plan, true).map((feat) => (
                <li
                  key={feat.label}
                  className={`flex items-start gap-3 font-[family-name:var(--font-body)] text-sm ${
                    feat.active ? "text-neutral-300" : "text-neutral-600 line-through"
                  }`}
                >
                  <AnimatedCheck active={feat.active} tone="dark" />
                  {feat.label}
                </li>
              ))}
            </ul>
          </motion.div>

          <motion.div variants={itemVariants}>
            <Link
              href={`/plan/${plan.id}`}
              className="group relative flex w-full items-center justify-center gap-2 overflow-hidden rounded-xl bg-gradient-to-b from-[#fb8a3c] to-[#f97316] px-6 py-4 font-[family-name:var(--font-display)] text-base font-bold text-white shadow-[0_10px_30px_-10px_rgba(249,115,22,0.8),inset_0_1px_0_rgba(255,255,255,0.3)] transition-transform duration-300 hover:scale-[1.02] active:scale-[0.99] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-300"
            >
              {!reduce && (
                <motion.span
                  aria-hidden
                  className="absolute inset-y-0 w-14 -skew-x-12 bg-white/30 blur-md"
                  initial={{ x: "-300%" }}
                  animate={{ x: "900%" }}
                  transition={{ duration: 1.5, ease: "easeInOut", repeat: Infinity, repeatDelay: 2.5 }}
                />
              )}
              <span className="relative">Continue to checkout</span>
              <ArrowRight className="relative h-4 w-4 transition-transform group-hover:translate-x-1" />
            </Link>

            <p className="mt-4 flex items-center justify-center gap-2 text-xs font-medium text-neutral-500">
              <ShieldCheck className="h-4 w-4 text-emerald-500" />
              Secure checkout. No refunds.
            </p>
          </motion.div>
        </motion.div>
      </motion.div>
    </motion.div>
  );
}

function PlanPreviewModal({ plan, onClose }: { plan: PlanData | null; onClose: () => void }) {
  // Mounted per plan so exit animations run and state resets on its own.
  return (
    <AnimatePresence>
      {plan && <PlanModalContent key={plan.id} plan={plan} onClose={onClose} />}
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
          <div key={i} className="relative h-[520px] overflow-hidden rounded-[2rem] bg-white/60">
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
        className="relative isolate w-full overflow-hidden bg-[#fdeadb] py-24 sm:py-32"
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
          <div className="mx-auto mb-16 max-w-3xl text-center">
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
            {plans.map((plan, index) => (
              <PlanCard
                key={plan.id}
                plan={plan}
                popular={index === POPULAR_INDEX}
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
            className="mt-16 flex items-center justify-center gap-2 text-sm font-medium text-gray-600"
          >
            <ShieldCheck className="h-4 w-4 text-emerald-600" />
            Secure checkout. All purchases are final. No refunds.
          </motion.p>
        </div>
      </section>

      <PlanPreviewModal plan={selectedPlan} onClose={closeModal} />
    </>
  );
}