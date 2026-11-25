"use client";

/**
 * PlanUI.tsx: everything the landing section (PricingPreview) and the full page (PlansClient) share.
 * Same ticket language as the RSVP and template cards: paper gradient, notches, dashed stub.
 * The page background stays flat (#fdeadb). No dotted pattern.
 */

import { useEffect, useRef } from "react";
import Link from "next/link";
import { AnimatePresence, motion, usePresence, useReducedMotion, type Variants } from "framer-motion";
import { ArrowRight, ArrowUpRight, Check, Crown, LayoutTemplate, RefreshCw, ShieldCheck, X, Zap } from "lucide-react";
import { cn } from "@/lib/utils";

/* ========================================================================== */
/*  Constants                                                                 */
/* ========================================================================== */

export const EASE = [0.16, 1, 0.3, 1] as const;

export const TEMPLATES_HREF = "/templates";
/** Where the full plans page lives. Change if your route is different. */
export const PLANS_HREF = "/plans";
/** Change here if your plan checkout lives somewhere else (for example `/plan/${id}`). */
export const planCheckoutHref = (id: string) => `/checkout/plan/${encodeURIComponent(id)}`;

export const focusRing =
  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#1c1410] focus-visible:ring-offset-2";

/** Two notches where the dashed stub starts (stub = 3.5rem, the height of the button). */
export const TICKET_MASK =
  "radial-gradient(circle 9px at 0 calc(100% - 3.5rem), #0000 98%, #000) left / 51% 100% no-repeat, radial-gradient(circle 9px at 100% calc(100% - 3.5rem), #0000 98%, #000) right / 51% 100% no-repeat";

export const CARD_SHADOW =
  "[filter:drop-shadow(0_1px_1px_rgba(28,20,16,0.08))_drop-shadow(0_14px_20px_rgba(28,20,16,0.10))] hover:[filter:drop-shadow(0_1px_1px_rgba(28,20,16,0.10))_drop-shadow(0_22px_26px_rgba(28,20,16,0.16))]";

export const CARD_BG = "bg-gradient-to-br from-[#fffdfa] via-[#fff8f1] to-[#ffeddc]";

/* ========================================================================== */
/*  Types & helpers                                                           */
/* ========================================================================== */

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

export type Feature = { label: string; active: boolean };
export type PlanBadge = "popular" | "best" | null;

const formatter = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "PKR",
  maximumFractionDigits: 0,
});

export const money = (n: number) => formatter.format(Math.round(n));
export const priceText = (p: PlanData) => (p.price > 0 ? money(p.price) : "Free");
export const periodLabel = (days: number) => (days === 30 ? "month" : days === 365 ? "year" : `${days} days`);
export const durationLabel = (days: number) => (days === 30 ? "1 month" : days === 365 ? "1 year" : `${days} days`);
export const isPremiumPlan = (p: PlanData) => p.price > 4000 || p.name.toLowerCase().includes("premium");

export const totalTemplates = (p: PlanData) => p.maxSimpleTemplates + p.maxPremiumTemplates;
export const perTemplate = (p: PlanData) => {
  const t = totalTemplates(p);
  return p.price > 0 && t > 0 ? Math.round(p.price / t) : 0;
};

const num = (v: unknown, fallback = 0) => {
  const n = Number(v);
  return Number.isFinite(n) ? n : fallback;
};

/** Accepts camelCase or snake_case and drops anything unusable. */
export function normalizePlans(raw: unknown): PlanData[] {
  if (!Array.isArray(raw)) return [];
  const out: PlanData[] = [];
  for (const r of raw as Record<string, any>[]) {
    if (!r || typeof r.id !== "string") continue;
    out.push({
      id: r.id,
      name: typeof r.name === "string" && r.name.trim() ? r.name : "Plan",
      description: typeof r.description === "string" ? r.description : null,
      price: num(r.price),
      durationDays: num(r.durationDays ?? r.duration_days, 30),
      maxSimpleTemplates: num(r.maxSimpleTemplates ?? r.max_simple_templates),
      maxPremiumTemplates: num(r.maxPremiumTemplates ?? r.max_premium_templates),
      allowsCustomSlug: Boolean(r.allowsCustomSlug ?? r.allows_custom_slug),
    });
  }
  return out;
}

/** The perks that are not template counts (those get their own cells). */
export function perkFeatures(plan: PlanData): Feature[] {
  return [
    { label: "Real-time RSVP tracking", active: true },
    { label: "Custom URL slug", active: plan.allowsCustomSlug },
    { label: "24/7 WhatsApp support", active: true },
  ];
}

export function allFeatures(plan: PlanData): Feature[] {
  return [
    { label: `${plan.maxSimpleTemplates} standard templates`, active: true },
    { label: `${plan.maxPremiumTemplates} premium templates`, active: true },
    ...perkFeatures(plan),
    { label: "AI Design Studio access", active: true },
  ];
}

/* ========================================================================== */
/*  Motion                                                                    */
/* ========================================================================== */

export const listVariants: Variants = {
  hidden: { opacity: 0 },
  show: { opacity: 1, transition: { staggerChildren: 0.09 } },
};

export const itemVariants: Variants = {
  hidden: { opacity: 0, y: 20 },
  show: { opacity: 1, y: 0, transition: { duration: 0.6, ease: EASE } },
};

/* ========================================================================== */
/*  Small pieces                                                              */
/* ========================================================================== */

export function FeatureMark({ active }: { active: boolean }) {
  return active ? (
    <span className="mt-0.5 flex size-5 shrink-0 items-center justify-center rounded-full bg-[#1c1410] text-white">
      <Check className="size-3" strokeWidth={3} />
      <span className="sr-only">Included</span>
    </span>
  ) : (
    <span aria-hidden className="mt-0.5 size-5 shrink-0 rounded-full border-[1.5px] border-dashed border-stone-300" />
  );
}

export function FeatureList({ features, className }: { features: Feature[]; className?: string }) {
  return (
    <ul className={cn("space-y-3.5", className)}>
      {features.map((f) => (
        <li
          key={f.label}
          className={cn(
            "flex items-start gap-3 font-[family-name:var(--font-body)] text-sm",
            f.active ? "font-medium text-[#1c1410]" : "text-stone-400 line-through",
          )}
        >
          <FeatureMark active={f.active} />
          {f.label}
          {!f.active && <span className="sr-only"> (not included)</span>}
        </li>
      ))}
    </ul>
  );
}

function Meta({ value, label }: { value: string | number; label: string }) {
  return (
    <div className="rounded-xl border border-[#1c1410]/10 bg-white/55 px-3.5 py-2.5">
      <p className="font-[family-name:var(--font-display)] text-xl font-bold leading-6 tabular-nums text-[#1c1410]">{value}</p>
      <p className="mt-0.5 text-xs text-stone-500">{label}</p>
    </div>
  );
}

function IconTile({ premium, size = "md" }: { premium: boolean; size?: "md" | "lg" }) {
  const Icon = premium ? Crown : Zap;
  return (
    <div
      aria-hidden
      className={cn(
        "flex shrink-0 items-center justify-center rounded-xl bg-[#1c1410] text-white shadow-[inset_0_1px_0_rgba(255,255,255,0.14)]",
        size === "lg" ? "size-14" : "size-12",
      )}
    >
      <Icon className={size === "lg" ? "size-6" : "size-5"} />
    </div>
  );
}

/* ========================================================================== */
/*  Plan ticket                                                               */
/* ========================================================================== */

export function PlanTicket({
  plan,
  badge = null,
  onSelect,
}: {
  plan: PlanData;
  badge?: PlanBadge;
  onSelect: () => void;
}) {
  const popular = badge === "popular";
  const pt = perTemplate(plan);

  return (
    // The plain <li> owns the hover lift and shadow so they never clash with the entrance transform.
    <li className={cn("min-w-0 transition-transform duration-300 hover:-translate-y-1", CARD_SHADOW)}>
      <motion.div variants={itemVariants} className="h-full">
        <article
          aria-label={`${plan.name} plan`}
          style={{ WebkitMask: TICKET_MASK, mask: TICKET_MASK }}
          className={cn(
            "group/card relative flex h-full flex-col overflow-hidden rounded-2xl border",
            CARD_BG,
            popular ? "border-[#1c1410]/40" : "border-black/[0.07]",
          )}
        >
          {popular && <span aria-hidden className="absolute inset-x-0 top-0 h-1 bg-[#1c1410]" />}

          <div className="flex flex-1 flex-col p-6 sm:p-7">
            {/* name */}
            <div className="flex items-start gap-3.5">
              <IconTile premium={isPremiumPlan(plan)} />
              <div className="min-w-0 flex-1">
                <div className="flex items-start justify-between gap-2">
                  <h3 className="min-w-0 truncate font-[family-name:var(--font-display)] text-xl font-bold leading-6 tracking-[-0.01em] text-[#1c1410]">
                    {plan.name}
                  </h3>
                  {badge && (
                    <span className="shrink-0 rounded border border-[#1c1410]/20 px-1.5 text-[10px] font-semibold uppercase leading-4 tracking-[0.1em] text-[#1c1410]/80">
                      {badge === "popular" ? "Most popular" : "Best value"}
                    </span>
                  )}
                </div>
                <p className="mt-1 line-clamp-2 min-h-[40px] font-[family-name:var(--font-body)] text-sm leading-5 text-stone-500">
                  {plan.description || "Perfect for your event needs."}
                </p>
              </div>
            </div>

            {/* price */}
            <div className="mt-6 border-b border-dashed border-[#1c1410]/25 pb-6">
              <div className="flex items-end justify-between gap-3">
                <p className="font-[family-name:var(--font-display)] text-[44px] font-bold leading-[44px] tabular-nums tracking-[-0.04em] text-[#1c1410]">
                  {priceText(plan)}
                </p>
                <p className="pb-0.5 text-[11px] font-semibold uppercase tracking-[0.12em] text-stone-500">
                  per {periodLabel(plan.durationDays)}
                </p>
              </div>
              <p className="mt-2 h-4 text-xs text-stone-500">
                {pt > 0 && (
                  <>
                    About <b className="font-semibold text-[#1c1410]">{money(pt)}</b> per template
                  </>
                )}
              </p>
            </div>

            {/* what you get */}
            <div className="mt-6 grid grid-cols-2 gap-2.5">
              <Meta value={plan.maxSimpleTemplates} label="Standard templates" />
              <Meta value={plan.maxPremiumTemplates} label="Premium templates" />
            </div>
            <FeatureList features={perkFeatures(plan)} className="mt-6 flex-1" />
          </div>

          {/* perforated stub = the call to action */}
          <button
            type="button"
            onClick={onSelect}
            className={cn(
              "flex h-14 w-full shrink-0 cursor-pointer items-center justify-between gap-3 border-t border-dashed px-6 text-left text-sm font-semibold transition-colors sm:px-7",
              focusRing,
              popular
                ? "border-white/25 bg-[#1c1410] text-white hover:bg-[#2c211a]"
                : "border-[#1c1410]/25 text-[#1c1410] hover:bg-[#1c1410]/[0.04]",
            )}
          >
            Choose {plan.name}
            <span
              className={cn(
                "flex size-8 items-center justify-center rounded-full ring-1 transition-all duration-300",
                popular
                  ? "bg-white/10 ring-white/20 group-hover/card:bg-white group-hover/card:text-[#1c1410]"
                  : "bg-[#1c1410]/[0.06] ring-black/[0.06] group-hover/card:bg-[#1c1410] group-hover/card:text-white",
              )}
            >
              <ArrowUpRight className="size-3.5 transition-transform duration-300 group-hover/card:rotate-45" />
            </span>
          </button>
        </article>
      </motion.div>
    </li>
  );
}

/* ========================================================================== */
/*  Plan detail modal                                                         */
/* ========================================================================== */

function PlanModalContent({ plan, onClose }: { plan: PlanData; onClose: () => void }) {
  const reduce = useReducedMotion() ?? false;
  const closeRef = useRef<HTMLButtonElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const [isPresent, safeToRemove] = usePresence();
  const pt = perTemplate(plan);

  // lock page scroll, keep focus inside, close on Escape, give focus back when it closes
  useEffect(() => {
    const prevFocus = document.activeElement as HTMLElement | null;
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    closeRef.current?.focus();

    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        onClose();
        return;
      }
      if (e.key !== "Tab" || !panelRef.current) return;
      const f = panelRef.current.querySelectorAll<HTMLElement>("a[href], button:not([disabled])");
      if (!f.length) return;
      const first = f[0];
      const last = f[f.length - 1];
      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault();
        first.focus();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = prevOverflow;
      window.removeEventListener("keydown", onKey);
      prevFocus?.focus?.();
    };
  }, [onClose]);

  // safety net: if an exit animation ever hangs, release the page anyway
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
      exit={{ opacity: 0, transition: { duration: 0.2 } }}
      transition={{ duration: 0.2 }}
      onClick={onClose}
      className={cn(
        "fixed inset-0 z-[9999] flex items-center justify-center bg-black/55 p-4 sm:p-6",
        !isPresent && "pointer-events-none",
      )}
    >
      <motion.div
        ref={panelRef}
        initial={reduce ? false : { opacity: 0, y: 24 }}
        animate={{ opacity: 1, y: 0 }}
        exit={reduce ? undefined : { opacity: 0, y: 12, transition: { duration: 0.2, ease: EASE } }}
        transition={{ type: "spring", damping: 30, stiffness: 260 }}
        onClick={(e) => e.stopPropagation()}
        data-lenis-prevent
        className={cn(
          "relative flex max-h-[92dvh] w-full max-w-lg flex-col overflow-y-auto rounded-2xl border border-black/[0.07] text-[#1c1410] shadow-xl",
          CARD_BG,
        )}
      >
        <button
          ref={closeRef}
          type="button"
          onClick={onClose}
          aria-label="Close"
          className={cn(
            "absolute right-4 top-4 z-10 flex size-9 cursor-pointer items-center justify-center rounded-full bg-[#1c1410]/[0.06] text-[#1c1410] ring-1 ring-black/[0.06] transition-colors hover:bg-[#1c1410] hover:text-white",
            focusRing,
          )}
        >
          <X className="size-4" />
        </button>

        <div className="p-7 sm:p-9">
          <div className="flex items-start gap-4 pr-10">
            <IconTile premium={isPremiumPlan(plan)} size="lg" />
            <div className="min-w-0">
              <h3 className="font-[family-name:var(--font-display)] text-2xl font-bold leading-7 tracking-[-0.01em]">{plan.name}</h3>
              <p className="mt-1 text-sm text-stone-500">
                {plan.description || "Everything you need to create unforgettable events."}
              </p>
            </div>
          </div>

          <div className="mt-7 border-b border-dashed border-[#1c1410]/25 pb-7">
            <div className="flex items-end justify-between gap-3">
              <p className="font-[family-name:var(--font-display)] text-5xl font-bold leading-[48px] tabular-nums tracking-[-0.04em]">
                {priceText(plan)}
              </p>
              <p className="pb-0.5 text-[11px] font-semibold uppercase tracking-[0.12em] text-stone-500">
                per {periodLabel(plan.durationDays)}
              </p>
            </div>
            {pt > 0 && (
              <p className="mt-2 text-xs text-stone-500">
                About <b className="font-semibold text-[#1c1410]">{money(pt)}</b> per template
              </p>
            )}
          </div>

          <div className="mt-7 grid grid-cols-3 gap-2.5">
            <Meta value={plan.maxSimpleTemplates} label="Standard" />
            <Meta value={plan.maxPremiumTemplates} label="Premium" />
            <Meta value={durationLabel(plan.durationDays)} label="Valid for" />
          </div>

          <h4 className="mb-4 mt-7 text-xs font-semibold uppercase tracking-[0.12em] text-stone-500">What&apos;s included</h4>
          <FeatureList features={allFeatures(plan)} />
        </div>

        <div className="border-t border-dashed border-[#1c1410]/25 p-6 sm:px-9">
          <Link
            href={planCheckoutHref(plan.id)}
            className={cn(
              "group flex w-full items-center justify-center gap-2 rounded-xl bg-[#1c1410] px-6 py-3.5 font-[family-name:var(--font-display)] text-sm font-bold text-white transition-colors hover:bg-[#2c211a]",
              focusRing,
            )}
          >
            Continue to checkout
            <ArrowRight className="size-4 transition-transform group-hover:translate-x-1" />
          </Link>
          <p className="mt-4 flex items-center justify-center gap-2 text-xs font-medium text-stone-500">
            <ShieldCheck className="size-4 text-emerald-600" />
            Secure checkout. All purchases are final.
          </p>
          <p className="mt-3 text-center text-xs text-stone-500">
            Only need one design?{" "}
            <Link
              href={TEMPLATES_HREF}
              onClick={onClose}
              className={cn("rounded font-semibold text-[#1c1410] underline underline-offset-4", focusRing)}
            >
              Buy a single template
            </Link>
          </p>
        </div>
      </motion.div>
    </motion.div>
  );
}

export function PlanModal({ plan, onClose }: { plan: PlanData | null; onClose: () => void }) {
  // keyed per plan so exit animations run and state resets on its own
  return <AnimatePresence>{plan && <PlanModalContent key={plan.id} plan={plan} onClose={onClose} />}</AnimatePresence>;
}

/* ========================================================================== */
/*  Loading, error, single-template strip                                     */
/* ========================================================================== */

export function TicketSkeletonGrid({ count = 3 }: { count?: number }) {
  const bar = "animate-pulse bg-[#1c1410]/[0.07] motion-reduce:animate-none";
  return (
    <ul className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3 lg:gap-8" aria-busy="true" aria-label="Loading plans">
      {Array.from({ length: count }).map((_, i) => (
        <li key={i} className="min-w-0">
          <div className={cn("flex h-[560px] flex-col overflow-hidden rounded-2xl border border-black/[0.07]", CARD_BG)}>
            <div className="flex-1 p-6 sm:p-7">
              <div className="flex items-start gap-3.5">
                <div className={cn("size-12 shrink-0 rounded-xl", bar)} />
                <div className="flex-1 space-y-2">
                  <div className={cn("h-6 w-2/3 rounded-md", bar)} />
                  <div className={cn("h-4 w-full rounded-md", bar)} />
                </div>
              </div>
              <div className={cn("mt-6 h-11 w-1/2 rounded-md", bar)} />
              <div className="mt-8 grid grid-cols-2 gap-2.5">
                <div className={cn("h-14 rounded-xl", bar)} />
                <div className={cn("h-14 rounded-xl", bar)} />
              </div>
              <div className="mt-8 space-y-4">
                {[0, 1, 2].map((k) => (
                  <div key={k} className={cn("h-5 w-5/6 rounded-md", bar)} />
                ))}
              </div>
            </div>
            <div className="flex h-14 items-center justify-between border-t border-dashed border-black/15 px-6 sm:px-7">
              <div className={cn("h-4 w-28 rounded-md", bar)} />
              <div className={cn("size-8 rounded-full", bar)} />
            </div>
          </div>
        </li>
      ))}
    </ul>
  );
}

export function PlansError({ onRetry }: { onRetry: () => void }) {
  return (
    <div
      role="alert"
      className={cn(
        "mx-auto flex max-w-md flex-col items-center gap-4 rounded-2xl border border-black/[0.07] p-8 text-center",
        CARD_BG,
      )}
    >
      <h2 className="font-[family-name:var(--font-display)] text-2xl font-bold text-[#1c1410]">Plans didn&apos;t load</h2>
      <p className="text-sm text-stone-600">Check your connection and try again. You can also buy a single template without a plan.</p>
      <div className="flex flex-wrap items-center justify-center gap-3">
        <button
          type="button"
          onClick={onRetry}
          className={cn(
            "inline-flex items-center gap-2 rounded-xl bg-[#1c1410] px-5 py-2.5 text-sm font-bold text-white transition-colors hover:bg-[#2c211a]",
            focusRing,
          )}
        >
          <RefreshCw className="size-4" /> Try again
        </button>
        <Link
          href={TEMPLATES_HREF}
          className={cn(
            "inline-flex items-center gap-2 rounded-xl border border-[#1c1410]/20 bg-white/70 px-5 py-2.5 text-sm font-bold text-[#1c1410] transition-colors hover:bg-white",
            focusRing,
          )}
        >
          Browse templates
        </Link>
      </div>
    </div>
  );
}

export function TemplatesStrip() {
  return (
    <Link
      href={TEMPLATES_HREF}
      className={cn(
        "group flex flex-col gap-5 rounded-2xl border border-black/[0.07] p-6 transition-transform duration-300 hover:-translate-y-0.5 sm:flex-row sm:items-center sm:justify-between sm:p-7",
        CARD_BG,
        CARD_SHADOW,
        focusRing,
      )}
    >
      <span className="flex items-start gap-4">
        <span
          aria-hidden
          className="flex size-12 shrink-0 items-center justify-center rounded-xl bg-[#1c1410] text-white shadow-[inset_0_1px_0_rgba(255,255,255,0.14)]"
        >
          <LayoutTemplate className="size-5" />
        </span>
        <span>
          <span className="block font-[family-name:var(--font-display)] text-lg font-bold leading-6 text-[#1c1410]">
            Just need one design?
          </span>
          <span className="mt-1 block text-sm text-stone-600">
            Skip the plan and buy a single template on its own. Pick the one you love and you&apos;re done.
          </span>
        </span>
      </span>
      <span className="inline-flex shrink-0 items-center justify-center gap-2 rounded-xl bg-[#1c1410] px-5 py-3 text-sm font-bold text-white transition-colors group-hover:bg-[#2c211a]">
        Browse templates
        <ArrowUpRight className="size-4 transition-transform duration-300 group-hover:rotate-45" />
      </span>
    </Link>
  );
}