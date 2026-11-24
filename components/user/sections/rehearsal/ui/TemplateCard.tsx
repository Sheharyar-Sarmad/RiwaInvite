"use client";

/**
 * components/user/sections/rehearsal/ui/TemplateCard.tsx
 *
 * Ticket-style template card (same language as the Billing cards):
 * paper gradient, perforated stub, notches, sheen, layered lift.
 *
 *  - Owned (bought or via plan): "Create invitation" / "Update invitation"
 *    + an icon button for "Rehearse" / "Update draft".
 *  - Locked + plan: "Use plan" (two taps), "N left" hint, "or buy it".
 *  - Locked, no plan: "Unlock" (checkout) + "Try free" icon button.
 */

import * as React from "react";
import Link from "next/link";
import { ArrowUpRight, BadgeCheck, Check, Loader2, Lock, PenTool, Ticket } from "lucide-react";
import { BTN, HEADING, cn, money } from "@/components/user/sections/dashboard/ui/DashboardUI";
import { FOCUS } from "@/components/user/navigation/UserSidebar";
import { IcCrown, IcImageOff, LIBRARY_ROUTES } from "@/components/user/sections/library/ui/LibraryUI";
import type { PublicTemplate } from "./RehearsalStudioUI";

/* ========================================================================== */
/*  Ticket tokens (mirrors BillingUI)                                         */
/* ========================================================================== */

const PAPER = "bg-gradient-to-br from-[#fffdfa] via-[#fff8f1] to-[#ffeddc]";

/** Layered drop shadow that survives the notch mask (lives on the wrapper). */
const TICKET_LIFT =
  "transition-transform duration-300 motion-reduce:transition-none [filter:drop-shadow(0_1px_1px_rgba(28,20,16,0.08))_drop-shadow(0_14px_20px_rgba(28,20,16,0.10))] hover:-translate-y-1 hover:[filter:drop-shadow(0_1px_1px_rgba(28,20,16,0.10))_drop-shadow(0_22px_26px_rgba(28,20,16,0.16))]";

const STUB_H = "4.5rem";
const TICKET_MASK = `radial-gradient(circle 9px at 0 calc(100% - ${STUB_H}), #0000 97%, #000) left / 51% 100% no-repeat, radial-gradient(circle 9px at 100% calc(100% - ${STUB_H}), #0000 97%, #000) right / 51% 100% no-repeat`;

function Sheen() {
  return (
    <span
      aria-hidden
      className="pointer-events-none absolute inset-y-0 -left-1/2 z-10 w-1/2 -skew-x-12 bg-gradient-to-r from-transparent via-white/60 to-transparent opacity-0 transition-all duration-700 group-hover/card:left-full group-hover/card:opacity-100 motion-reduce:hidden"
    />
  );
}

/* ========================================================================== */
/*  Image helpers                                                             */
/* ========================================================================== */

export function resolveThumb(src: string): string {
  const s = src.trim();
  if (!s) return "";
  if (/^(https?:|data:|blob:)/i.test(s)) return s;
  if (s.startsWith("//")) return `https:${s}`;
  return s.startsWith("/") ? s : `/${s}`;
}

function Thumb({ src, soft }: { src: string; soft: boolean }) {
  const url = resolveThumb(src);
  const ref = React.useRef<HTMLImageElement>(null);
  const [state, setState] = React.useState<"loading" | "ok" | "failed">(url ? "loading" : "failed");

  React.useEffect(() => {
    if (!url) {
      setState("failed");
      return;
    }
    const img = ref.current;
    setState(img?.complete && img.naturalWidth > 0 ? "ok" : "loading");
  }, [url]);

  if (!url || state === "failed") {
    return (
      <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 bg-gradient-to-br from-stone-100 to-stone-200 text-stone-400">
        <IcImageOff className="size-7 sm:size-8" />
        <span className="text-[11px] font-semibold">No preview yet</span>
      </div>
    );
  }

  return (
    <>
      {state === "loading" && <div aria-hidden className="absolute inset-0 animate-pulse bg-stone-200/70 motion-reduce:animate-none" />}
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        key={url}
        ref={ref}
        src={url}
        alt=""
        loading="lazy"
        decoding="async"
        referrerPolicy="no-referrer"
        onLoad={() => setState("ok")}
        onError={() => setState("failed")}
        className={cn(
          "absolute inset-0 size-full object-cover transition duration-700 ease-out motion-reduce:transition-none",
          soft
            ? "scale-105 blur-[3px] saturate-[0.8] group-hover/card:scale-100 group-hover/card:blur-0 group-hover/card:saturate-100 group-focus-within/card:scale-100 group-focus-within/card:blur-0 group-focus-within/card:saturate-100"
            : "group-hover/card:scale-[1.03]",
        )}
      />
    </>
  );
}

/* ========================================================================== */
/*  Scroll reveal                                                             */
/* ========================================================================== */

function useReveal<T extends HTMLElement>() {
  const ref = React.useRef<T>(null);
  const [shown, setShown] = React.useState(false);

  React.useEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (typeof IntersectionObserver === "undefined" || window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      setShown(true);
      return;
    }
    const io = new IntersectionObserver(
      (entries) => {
        if (entries.some((e) => e.isIntersecting)) {
          setShown(true);
          io.disconnect();
        }
      },
      { threshold: 0.12, rootMargin: "0px 0px -32px 0px" },
    );
    io.observe(el);
    return () => io.disconnect();
  }, []);

  return { ref, shown };
}

/* ========================================================================== */
/*  Card                                                                      */
/* ========================================================================== */

const THUMB_RATIO = "aspect-[16/10] sm:aspect-[5/4]";
const MAIN =
  "inline-flex h-11 min-w-0 flex-1 items-center justify-center gap-1.5 whitespace-nowrap rounded-xl px-3 text-[13px] font-semibold transition active:scale-[0.98]";
const SIDE =
  "inline-flex size-11 shrink-0 items-center justify-center rounded-xl border border-black/[0.08] bg-white text-stone-600 transition hover:border-orange-300 hover:text-orange-600 active:scale-95";
const ARM_MS = 4000;

export type PlanSlot = {
  /** Unlocks of this template's kind that the plan still has. */
  left: number;
  kind: "simple" | "premium";
};

export function RehearsalTemplateCard({
  t,
  index,
  hasDraft,
  invitationId = null,
  onPick,
  onCreate,
  onUpdate,
  unlockHref = () => LIBRARY_ROUTES.browse,
  plan = null,
  unlocking = false,
  onUnlockWithPlan,
}: {
  t: PublicTemplate;
  index: number;
  hasDraft: boolean;
  /** Id of the invitation already made from this template, if any. */
  invitationId?: string | null;
  onPick: (id: string) => void;
  onCreate?: (templateId: string) => void;
  onUpdate?: (invitationId: string) => void;
  unlockHref?: (id: string) => string;
  /** Present when the user has a live plan. `null` means no plan. */
  plan?: PlanSlot | null;
  unlocking?: boolean;
  onUnlockWithPlan?: (id: string) => void;
}) {
  const owned = !!t.owned;
  const viaPlan = owned && !!t.via_plan;
  const { ref, shown } = useReveal<HTMLLIElement>();
  const free = t.price <= 0;

  const canUsePlan = !owned && !!plan && plan.left > 0 && !!onUnlockWithPlan;
  const planEmpty = !owned && !!plan && plan.left === 0;

  /* Two-tap confirm: spending an unlock can't be undone, so the first tap only arms the button. */
  const [armed, setArmed] = React.useState(false);
  React.useEffect(() => {
    if (!armed) return;
    const id = window.setTimeout(() => setArmed(false), ARM_MS);
    return () => window.clearTimeout(id);
  }, [armed]);
  React.useEffect(() => {
    if (owned) setArmed(false);
  }, [owned]);

  const usePlan = () => {
    if (unlocking) return;
    if (!armed) {
      setArmed(true);
      return;
    }
    setArmed(false);
    onUnlockWithPlan?.(t.id);
  };

  const hasInvitation = !!invitationId;
  const primaryLabel = hasInvitation ? "Update invitation" : "Create invitation";
  const primaryClick = () => (hasInvitation ? onUpdate?.(invitationId as string) : onCreate?.(t.id));
  const primaryEnabled = hasInvitation ? !!onUpdate : !!onCreate;

  const sideLabel = owned ? (hasDraft ? "Update draft" : "Rehearse") : hasDraft ? "Continue your draft" : "Try free";

  const unitWord = (n: number) => (n === 1 ? "unlock" : "unlocks");

  /* One fixed-height hint line so every card keeps the same shape. */
  let hint: React.ReactNode;
  if (canUsePlan && plan) {
    hint = (
      <>
        <span className="truncate tabular-nums">
          {armed
            ? `Uses 1 of your ${plan.left} ${plan.kind} ${unitWord(plan.left)}`
            : `${plan.left} ${plan.kind} ${unitWord(plan.left)} left`}
        </span>
        <Link href={unlockHref(t.id)} className={cn("shrink-0 font-semibold text-stone-600 hover:text-orange-600 hover:underline", FOCUS)}>
          or buy it
        </Link>
      </>
    );
  } else if (planEmpty && plan) {
    hint = <span className="truncate font-medium text-rose-600">No {plan.kind} unlocks left in your plan</span>;
  } else if (owned) {
    hint = (
      <span className="truncate">
        {hasInvitation ? "Invitation made" : viaPlan ? "Unlocked with your plan" : "Yours to keep"}
        {hasDraft ? " · draft in progress" : ""}
      </span>
    );
  } else {
    hint = <span className="truncate">Try it free before you buy</span>;
  }

  return (
    <li
      ref={ref}
      style={{ transitionDelay: shown ? `${Math.min(index % 6, 5) * 45}ms` : "0ms" }}
      className={cn(
        "min-w-0 transition duration-500 ease-out motion-reduce:translate-y-0 motion-reduce:opacity-100 motion-reduce:transition-none",
        shown ? "translate-y-0 opacity-100" : "translate-y-4 opacity-0",
      )}
    >
      <div className={cn("group/card h-full", TICKET_LIFT)}>
        <article
          style={{ WebkitMask: TICKET_MASK, mask: TICKET_MASK }}
          className={cn(
            "relative flex h-full flex-col overflow-hidden rounded-2xl border",
            PAPER,
            owned ? (viaPlan ? "border-[#1c1410]/40" : "border-emerald-400/70") : "border-black/[0.07]",
          )}
        >
          <Sheen />

          {/* top accent */}
          {owned && (
            <span aria-hidden className={cn("absolute inset-x-0 top-0 z-20 h-1", viaPlan ? "bg-[#1c1410]" : "bg-gradient-to-r from-emerald-500 to-emerald-400")} />
          )}

          <button
            type="button"
            onClick={() => onPick(t.id)}
            aria-label={`${owned ? "Open" : "Try"} ${t.name} in Rehearsal Studio`}
            className={cn("relative block w-full overflow-hidden bg-stone-100 text-left", THUMB_RATIO, FOCUS)}
          >
            <Thumb src={t.thumbnail_url} soft={!owned} />
            <div aria-hidden className="pointer-events-none absolute inset-0 ring-1 ring-inset ring-black/[0.05]" />

            {!owned && (
              <div
                aria-hidden
                className="pointer-events-none absolute inset-0 bg-gradient-to-t from-stone-950/55 via-stone-950/10 to-transparent transition-opacity duration-300 group-hover/card:opacity-30"
              />
            )}

            <div className="absolute left-2 top-3 flex flex-col items-start gap-1 sm:left-3">
              {owned ? (
                viaPlan ? (
                  <span className="inline-flex items-center gap-1 rounded-full bg-[#1c1410] px-2 py-0.5 text-[10px] font-bold text-white shadow-sm sm:px-2.5 sm:py-1 sm:text-[11px]">
                    <Ticket className="size-3 sm:size-3.5" /> In your plan
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1 rounded-full bg-emerald-600 px-2 py-0.5 text-[10px] font-bold text-white shadow-sm sm:px-2.5 sm:py-1 sm:text-[11px]">
                    <BadgeCheck className="size-3 sm:size-3.5" /> Purchased
                  </span>
                )
              ) : (
                <span className="inline-flex items-center gap-1 rounded-full bg-white/90 px-2 py-0.5 text-[10px] font-semibold text-stone-700 shadow-sm ring-1 ring-black/10 backdrop-blur-md sm:px-2.5 sm:py-1 sm:text-[11px]">
                  <Lock className="size-3 sm:size-3.5" /> Locked
                </span>
              )}
              {t.is_premium && (
                <span className="inline-flex items-center gap-1.5 rounded-full bg-neutral-900/90 px-2 py-0.5 text-[10px] font-semibold text-amber-200 shadow-sm ring-1 ring-white/10 backdrop-blur-md sm:px-2.5 sm:py-1 sm:text-[11px]">
                  <IcCrown className="size-3 sm:size-3.5" /> Premium
                </span>
              )}
            </div>

            {hasDraft && (
              <span className="absolute right-2 top-3 rounded-full bg-orange-500 px-2 py-0.5 text-[10px] font-bold text-white shadow-sm sm:right-3">
                In progress
              </span>
            )}

            {!owned && (
              <span className="absolute bottom-2 left-2 rounded-lg bg-neutral-900/85 px-2.5 py-1 text-xs font-bold tabular-nums text-white shadow-md ring-1 ring-white/10 backdrop-blur-md sm:bottom-3 sm:left-3">
                {free ? "Free" : money(t.price)}
              </span>
            )}
          </button>

          {/* body */}
          <div className="flex flex-1 flex-col gap-1 p-3 sm:p-4">
            <p className="truncate text-[11px] font-semibold uppercase leading-4 tracking-[0.12em] text-stone-500">
              {t.category_name || "Template"}
            </p>
            <h3 className={cn(HEADING, "h-6 truncate text-[15px] leading-6 tracking-[-0.01em] text-[#1c1410] sm:text-base")} title={t.name}>
              {t.name}
            </h3>
            <p className="line-clamp-2 h-8 text-xs leading-4 text-stone-500 sm:h-10 sm:leading-5">
              {t.description || "No description added for this template."}
            </p>
            <p className="mt-auto flex h-4 items-center justify-between gap-2 pt-1 text-[11px] leading-4 text-stone-500" aria-live="polite">
              {hint}
            </p>
          </div>

          {/* perforated stub */}
          <div className="flex shrink-0 items-center gap-2 border-t border-dashed border-[#1c1410]/25 px-3 sm:px-4" style={{ height: STUB_H }}>
            {owned ? (
              <>
                {primaryEnabled ? (
                  <button type="button" onClick={primaryClick} className={cn(BTN, MAIN, FOCUS)}>
                    {primaryLabel} <ArrowUpRight className="size-3.5 shrink-0" />
                  </button>
                ) : (
                  <Link href={LIBRARY_ROUTES.create(t.id)} className={cn(BTN, MAIN, FOCUS)}>
                    {primaryLabel} <ArrowUpRight className="size-3.5 shrink-0" />
                  </Link>
                )}
                <button type="button" onClick={() => onPick(t.id)} title={sideLabel} aria-label={`${sideLabel}: ${t.name}`} className={cn(SIDE, FOCUS)}>
                  <PenTool className="size-4" />
                </button>
              </>
            ) : canUsePlan ? (
              <>
                <button
                  type="button"
                  onClick={usePlan}
                  disabled={unlocking}
                  className={cn(
                    MAIN,
                    armed
                      ? "bg-neutral-900 text-white shadow-sm ring-1 ring-black/10 hover:bg-neutral-800"
                      : "bg-orange-500 text-white shadow-sm hover:bg-orange-600",
                    "disabled:opacity-70",
                    FOCUS,
                  )}
                >
                  {unlocking ? (
                    <Loader2 className="size-4 animate-spin motion-reduce:animate-none" />
                  ) : armed ? (
                    <Check className="size-4" />
                  ) : (
                    <Ticket className="size-4" />
                  )}
                  {unlocking ? "Unlocking…" : armed ? "Confirm, use 1" : "Use plan"}
                </button>
                <button type="button" onClick={() => onPick(t.id)} title={sideLabel} aria-label={`${sideLabel}: ${t.name}`} className={cn(SIDE, FOCUS)}>
                  <PenTool className="size-4" />
                </button>
              </>
            ) : (
              <>
                <Link
                  href={unlockHref(t.id)}
                  aria-label={`Unlock ${t.name}`}
                  className={cn(MAIN, "bg-neutral-900 text-white shadow-sm ring-1 ring-black/10 hover:bg-neutral-800", FOCUS)}
                >
                  <Lock className="size-4 text-amber-300" /> Unlock
                </Link>
                <button type="button" onClick={() => onPick(t.id)} title={sideLabel} aria-label={`${sideLabel}: ${t.name}`} className={cn(SIDE, FOCUS)}>
                  <PenTool className="size-4" />
                </button>
              </>
            )}
          </div>
        </article>
      </div>
    </li>
  );
}