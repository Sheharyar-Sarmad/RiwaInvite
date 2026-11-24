"use client";

import * as React from "react";
import Link from "next/link";
import Image from "next/image";
import { animate, motion, useReducedMotion } from "framer-motion";

import { FOCUS } from "@/components/user/navigation/UserSidebar";
import {
  BTN,
  EASE,
  HEADING,
  Shimmer,
  Tip,
  cn,
  fmtDate,
  money,
} from "@/components/user/sections/dashboard/ui/DashboardUI";
import type {
  ActiveSubscription,
  BillingOrder,
  CatalogPlan,
  PlansContext,
  SinglePurchaseItem,
} from "@/lib/types/billing";

/* ========================================================================== */
/*  Design tokens (same language as the RSVP ticket)                          */
/*  Warm paper gradients, ink for emphasis, orange for brand actions,         */
/*  perforated stubs, one mark per unit, colour only where it carries meaning */
/* ========================================================================== */

export const SURFACE =
  "bg-white ring-1 ring-black/[0.06] shadow-[0_1px_2px_rgba(28,20,16,0.04),0_12px_28px_-18px_rgba(28,20,16,0.22)]";
export const HAIRLINE = "border-black/[0.08]";

/** Warm paper used on every ticket. */
const PAPER = "bg-gradient-to-br from-[#fffdfa] via-[#fff8f1] to-[#ffeddc]";

/** Layered drop shadow that survives the notch mask (applied on the wrapper). */
const TICKET_LIFT =
  "transition-transform duration-300 [filter:drop-shadow(0_1px_1px_rgba(28,20,16,0.08))_drop-shadow(0_14px_20px_rgba(28,20,16,0.10))] hover:-translate-y-1 hover:[filter:drop-shadow(0_1px_1px_rgba(28,20,16,0.10))_drop-shadow(0_22px_26px_rgba(28,20,16,0.16))]";

export const ART = {
  banner: "/home_hero_bg.png",
  empty: "/why-rsvp.png",
  noOrders: "/why-slugs.png",
} as const;

/** Routes. Adjust here if your app differs. */
export const BILLING_ROUTES = {
  checkout: (planId: string) =>
    `/checkout?itemType=plan&itemId=${encodeURIComponent(planId)}`,
  library: "/dashboard/library",
  browse: "/templates",
} as const;

export const plural = (n: number, one: string, many = `${one}s`) =>
  `${n} ${n === 1 ? one : many}`;

/** Share of `part` in `total`, clamped to 0..100. */
export const pctOf = (part: number, total: number) =>
  total > 0 ? Math.min(100, Math.max(0, Math.round((part / total) * 100))) : 0;

/** How far through its period a subscription is, 0..100. */
export function periodProgress(startsAt: string, expiresAt: string): number {
  const s = new Date(startsAt).getTime();
  const e = new Date(expiresAt).getTime();
  if (!(e > s)) return 0;
  return Math.min(100, Math.max(0, Math.round(((Date.now() - s) / (e - s)) * 100)));
}

/** Notches cut into both sides at the perforation. `footer` is the stub height. */
const ticketMask = (footer: string) =>
  `radial-gradient(circle 9px at 0 calc(100% - ${footer}), #0000 97%, #000) left / 51% 100% no-repeat, radial-gradient(circle 9px at 100% calc(100% - ${footer}), #0000 97%, #000) right / 51% 100% no-repeat`;

const TICKET_MASK = ticketMask("4.5rem");
const SINGLE_MASK = ticketMask("3.75rem");

/** Soft light sweep on hover. Parent needs `group/card` and `relative overflow-hidden`. */
function Sheen() {
  return (
    <span
      aria-hidden
      className="pointer-events-none absolute inset-y-0 -left-1/2 z-10 w-1/2 -skew-x-12 bg-gradient-to-r from-transparent via-white/60 to-transparent opacity-0 transition-all duration-700 group-hover/card:left-full group-hover/card:opacity-100"
    />
  );
}

/* ========================================================================== */
/*  Icons: outline + soft 14% tint on a 24px grid                             */
/* ========================================================================== */

type IconProps = React.SVGProps<SVGSVGElement>;
type IconType = (p: IconProps) => React.ReactElement;
const TINT = { fill: "currentColor", fillOpacity: 0.14, stroke: "none" } as const;

function Svg({ children, ...props }: IconProps) {
  return (
    <svg
      viewBox="0 0 24 24"
      width="1em"
      height="1em"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.75}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      focusable="false"
      {...props}
    >
      {children}
    </svg>
  );
}

export const IcWallet = (p: IconProps) => (
  <Svg {...p}>
    <rect x="3" y="6" width="18" height="13.5" rx="3.2" {...TINT} />
    <rect x="3" y="6" width="18" height="13.5" rx="3.2" />
    <path d="M6.5 6l8.6-2.6a1.4 1.4 0 0 1 1.8 1.3V6" />
    <rect x="14" y="11.6" width="7" height="4.4" rx="2.2" />
    <circle cx="17.2" cy="13.8" r=".85" fill="currentColor" stroke="none" />
  </Svg>
);
export const IcCrown = (p: IconProps) => (
  <Svg {...p}>
    <path d="M3.5 8.5l4.2 3.6L12 5l4.3 7.1 4.2-3.6-1.6 9.4H5.1L3.5 8.5z" {...TINT} />
    <path d="M3.5 8.5l4.2 3.6L12 5l4.3 7.1 4.2-3.6-1.6 9.4H5.1L3.5 8.5z" />
    <path d="M5.8 21h12.4" />
  </Svg>
);
export const IcEnvelope = (p: IconProps) => (
  <Svg {...p}>
    <rect x="3" y="5.5" width="18" height="13" rx="3.2" {...TINT} />
    <rect x="3" y="5.5" width="18" height="13" rx="3.2" />
    <path d="M3.8 8l8.2 6 8.2-6" />
  </Svg>
);
export const IcLink = (p: IconProps) => (
  <Svg {...p}>
    <rect x="3.6" y="12.2" width="10.4" height="5.6" rx="2.8" transform="rotate(-45 8.8 15)" {...TINT} />
    <rect x="10" y="6.2" width="10.4" height="5.6" rx="2.8" transform="rotate(-45 15.2 9)" {...TINT} />
    <rect x="3.6" y="12.2" width="10.4" height="5.6" rx="2.8" transform="rotate(-45 8.8 15)" />
    <rect x="10" y="6.2" width="10.4" height="5.6" rx="2.8" transform="rotate(-45 15.2 9)" />
  </Svg>
);
export const IcCalendar = (p: IconProps) => (
  <Svg {...p}>
    <rect x="3.5" y="5" width="17" height="15.5" rx="3.2" {...TINT} />
    <rect x="3.5" y="5" width="17" height="15.5" rx="3.2" />
    <path d="M3.5 10h17M8 3.2v3.6M16 3.2v3.6" />
  </Svg>
);
export const IcReceipt = (p: IconProps) => (
  <Svg {...p}>
    <path d="M6 3.5h12v17l-2.5-1.7-2 1.7-1.5-1.7-1.5 1.7-2-1.7L6 20.5v-17z" {...TINT} />
    <path d="M6 3.5h12v17l-2.5-1.7-2 1.7-1.5-1.7-1.5 1.7-2-1.7L6 20.5v-17z" />
    <path d="M9 8.5h6M9 12h6" />
  </Svg>
);
export const IcCheck = (p: IconProps) => (
  <Svg strokeWidth={2.4} {...p}>
    <path d="M5 12.5l4.5 4.5L19 7.5" />
  </Svg>
);
export const IcArrowUpRight = (p: IconProps) => (
  <Svg strokeWidth={2} {...p}>
    <path d="M7 17L17 7M8.5 7H17v8.5" />
  </Svg>
);
export const IcSparkle = (p: IconProps) => (
  <Svg {...p}>
    <path d="M10.5 4c.7 4.4 2.9 6.6 7.3 7.3-4.4.7-6.6 2.9-7.3 7.3-.7-4.4-2.9-6.6-7.3-7.3C7.6 10.6 9.8 8.4 10.5 4z" {...TINT} />
    <path d="M10.5 4c.7 4.4 2.9 6.6 7.3 7.3-4.4.7-6.6 2.9-7.3 7.3-.7-4.4-2.9-6.6-7.3-7.3C7.6 10.6 9.8 8.4 10.5 4z" />
    <path d="M19 3.5v3M17.5 5h3" />
  </Svg>
);
export const IcLock = (p: IconProps) => (
  <Svg {...p}>
    <rect x="4.5" y="10.5" width="15" height="10" rx="2.8" {...TINT} />
    <rect x="4.5" y="10.5" width="15" height="10" rx="2.8" />
    <path d="M8 10.5V8a4 4 0 0 1 8 0v2.5" />
  </Svg>
);
export const IcImageOff = (p: IconProps) => (
  <Svg {...p}>
    <rect x="3.5" y="4.5" width="17" height="15" rx="3.2" {...TINT} />
    <rect x="3.5" y="4.5" width="17" height="15" rx="3.2" />
    <circle cx="9" cy="10" r="1.7" />
    <path d="M3.5 17l5-4.5 4 3.5 3-2.5 5 4" />
    <path d="M4.5 3.5l15 17" />
  </Svg>
);
export const IcAlert = (p: IconProps) => (
  <Svg {...p}>
    <circle cx="12" cy="12" r="8.5" {...TINT} />
    <circle cx="12" cy="12" r="8.5" />
    <path d="M12 7.8v5" />
    <circle cx="12" cy="16.2" r=".9" fill="currentColor" stroke="none" />
  </Svg>
);
export const IcInfo = (p: IconProps) => (
  <Svg {...p}>
    <circle cx="12" cy="12" r="8.5" {...TINT} />
    <circle cx="12" cy="12" r="8.5" />
    <path d="M12 11.2v5" />
    <circle cx="12" cy="7.9" r=".9" fill="currentColor" stroke="none" />
  </Svg>
);
export const IcTrend = (p: IconProps) => (
  <Svg {...p}>
    <path d="M3.5 18.5h17" />
    <path d="M4.5 15.5l5-5 3.5 3.5 6.5-7" />
    <path d="M15 7h4.5v4.5" />
  </Svg>
);
export const IcClock = (p: IconProps) => (
  <Svg {...p}>
    <circle cx="12" cy="12" r="8.5" {...TINT} />
    <circle cx="12" cy="12" r="8.5" />
    <path d="M12 7.6V12l3 1.9" />
  </Svg>
);
export const IcRefresh = (p: IconProps) => (
  <Svg {...p}>
    <path d="M19.5 11A7.5 7.5 0 0 0 6.3 6.6L4.5 8.5" />
    <path d="M4.5 4v4.5H9" />
    <path d="M4.5 13A7.5 7.5 0 0 0 17.7 17.4l1.8-1.9" />
    <path d="M19.5 20v-4.5H15" />
  </Svg>
);
export const IcCopy = (p: IconProps) => (
  <Svg {...p}>
    <rect x="8.5" y="8.5" width="11" height="11" rx="2.6" {...TINT} />
    <rect x="8.5" y="8.5" width="11" height="11" rx="2.6" />
    <path d="M15.5 8.5V6.6a2.1 2.1 0 0 0-2.1-2.1H6.6a2.1 2.1 0 0 0-2.1 2.1v6.8a2.1 2.1 0 0 0 2.1 2.1h1.9" />
  </Svg>
);

/* ========================================================================== */
/*  Marks: one dot per unit (template, seat), same idea as RSVP guest marks   */
/* ========================================================================== */

const MAX_DOTS = 10;

function Dots({
  count,
  filledClass,
  className,
}: {
  count: number;
  filledClass: string;
  className?: string;
}) {
  const shown = Math.min(count, MAX_DOTS);
  const extra = Math.max(0, count - MAX_DOTS);
  return (
    <span aria-hidden className={cn("inline-flex flex-wrap items-center gap-1", className)}>
      {Array.from({ length: shown }).map((_, i) => (
        <span key={i} className={cn("size-2 rounded-full", filledClass)} />
      ))}
      {extra > 0 && <span className="ml-0.5 text-[10px] font-bold tabular-nums text-[#1c1410]/60">+{extra}</span>}
    </span>
  );
}

/* ========================================================================== */
/*  Header                                                                    */
/* ========================================================================== */

export function BillingHeader({
  title,
  subtitle,
  actions,
}: {
  title: React.ReactNode;
  subtitle: string;
  actions?: React.ReactNode;
}) {
  return (
    <header
      className={cn(
        "relative z-30 rounded-2xl p-4 sm:rounded-3xl sm:p-7",
        "ring-1 ring-black/[0.06] shadow-[0_1px_2px_rgba(28,20,16,0.04),0_12px_28px_-18px_rgba(28,20,16,0.22)]",
      )}
    >
      <div
        aria-hidden
        className="absolute inset-0 overflow-hidden rounded-[inherit]"
        style={{
          backgroundImage: `url(${ART.banner})`,
          backgroundSize: "cover",
          backgroundPosition: "70% center",
        }}
      >
        <div className="absolute inset-0 bg-gradient-to-b from-[#fff8f2]/95 via-[#fff8f2]/70 to-[#fff8f2]/30 sm:bg-gradient-to-r sm:from-[#fff8f2]/95 sm:via-[#fff8f2]/65 sm:to-[#fff8f2]/10" />
      </div>
      <div className="relative z-10 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between sm:gap-6">
        <div className="min-w-0">
          <h1
            className={cn(
              HEADING,
              "break-words text-[26px] leading-8 tracking-[-0.025em] text-[#1c1410] sm:text-4xl sm:leading-10",
            )}
          >
            {title}
          </h1>
          <p className="mt-1 min-h-5 max-w-xl text-[13px] font-medium leading-5 text-stone-600 sm:text-sm">
            {subtitle}
          </p>
        </div>
        {actions && (
          <div className="flex flex-wrap gap-1.5 rounded-xl bg-white/70 p-1.5 shadow-sm ring-1 ring-white/80 backdrop-blur-md sm:shrink-0">
            {actions}
          </div>
        )}
      </div>
    </header>
  );
}

export const SECONDARY_BTN =
  "inline-flex h-9 items-center justify-center gap-1.5 rounded-lg bg-neutral-900 px-3 text-[13px] font-semibold text-white shadow-sm ring-1 ring-black/10 transition-colors hover:bg-neutral-800 active:scale-[0.98] sm:px-4 sm:text-sm";
export const GHOST_BTN =
  "inline-flex h-9 items-center justify-center gap-1.5 rounded-lg bg-white px-3 text-[13px] font-semibold text-[#1c1410] ring-1 ring-black/[0.08] transition-colors hover:bg-stone-50 active:scale-[0.98] sm:px-4 sm:text-sm";

/** Header action: re-fetch billing + plans. Spins while loading. */
export function RefreshButton({ onClick, busy }: { onClick: () => void; busy: boolean }) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={busy}
      aria-label="Refresh billing"
      className={cn(GHOST_BTN, "disabled:cursor-wait disabled:opacity-70", FOCUS)}
    >
      <IcRefresh className={cn("size-4 text-stone-500", busy && "animate-spin motion-reduce:animate-none")} />
      <span className="hidden sm:inline">{busy ? "Refreshing" : "Refresh"}</span>
    </button>
  );
}

export function SectionHeading({
  id,
  title,
  hint,
  aside,
}: {
  id: string;
  title: string;
  hint?: string;
  aside?: React.ReactNode;
}) {
  return (
    <div className="mb-3 flex items-end justify-between gap-3 sm:mb-4">
      <div className="min-w-0">
        <h2 id={id} className={cn(HEADING, "text-lg tracking-[-0.015em] text-[#1c1410] sm:text-xl")}>
          {title}
        </h2>
        {hint && <p className="mt-0.5 text-xs text-stone-500 sm:text-[13px]">{hint}</p>}
      </div>
      {aside}
    </div>
  );
}

/* ========================================================================== */
/*  Pills + chips                                                             */
/* ========================================================================== */

const PILL =
  "inline-flex h-6 shrink-0 items-center gap-1.5 rounded-full px-2.5 text-xs font-semibold ring-1 ring-inset";

const STATUS_TONE: Record<string, { pill: string; dot: string; label: string }> = {
  active: { pill: "bg-emerald-50 text-emerald-700 ring-emerald-600/20", dot: "bg-emerald-500", label: "Active" },
  completed: { pill: "bg-emerald-50 text-emerald-700 ring-emerald-600/20", dot: "bg-emerald-500", label: "Completed" },
  pending: { pill: "bg-amber-50 text-amber-700 ring-amber-600/20", dot: "bg-amber-500", label: "Pending" },
  past_due: { pill: "bg-amber-50 text-amber-700 ring-amber-600/20", dot: "bg-amber-500", label: "Past due" },
  failed: { pill: "bg-rose-50 text-rose-700 ring-rose-600/20", dot: "bg-rose-500", label: "Failed" },
  canceled: { pill: "bg-stone-100 text-stone-600 ring-stone-500/20", dot: "bg-stone-400", label: "Canceled" },
  expired: { pill: "bg-stone-100 text-stone-600 ring-stone-500/20", dot: "bg-stone-400", label: "Expired" },
};
const NEUTRAL_TONE = { pill: "bg-stone-100 text-stone-600 ring-stone-500/20", dot: "bg-stone-400" };

export function StatusPill({ status }: { status: string }) {
  const known = STATUS_TONE[status];
  const tone = known ?? NEUTRAL_TONE;
  const label = known?.label ?? (status ? status[0].toUpperCase() + status.slice(1) : "Unknown");
  const live = status === "active";
  const reduce = useReducedMotion();
  return (
    <span className={cn(PILL, tone.pill)}>
      <span aria-hidden className="relative flex size-1.5">
        {live && !reduce && (
          <span className={cn("absolute inline-flex size-full animate-ping rounded-full opacity-60", tone.dot)} />
        )}
        <span className={cn("relative inline-flex size-1.5 rounded-full", tone.dot)} />
      </span>
      {label}
    </span>
  );
}

export function Chip({
  icon: Icon,
  children,
  tone = "neutral",
}: {
  icon?: IconType;
  children: React.ReactNode;
  tone?: "neutral" | "orange" | "ink" | "amber" | "emerald";
}) {
  const tones = {
    neutral: "bg-stone-100 text-stone-700 ring-black/[0.05]",
    orange: "bg-orange-50 text-orange-700 ring-orange-600/20",
    amber: "bg-amber-50 text-amber-700 ring-amber-600/20",
    emerald: "bg-emerald-50 text-emerald-700 ring-emerald-600/20",
    ink: "bg-[#1c1410] text-white ring-white/10",
  } as const;
  return (
    <span className={cn("inline-flex h-6 shrink-0 items-center gap-1.5 rounded-full px-2.5 text-[11px] font-semibold ring-1 ring-inset", tones[tone])}>
      {Icon && <Icon className="size-3.5" />}
      {children}
    </span>
  );
}

/* ========================================================================== */
/*  Notices                                                                   */
/* ========================================================================== */

const NOTICE_TONES = {
  amber: "border-amber-200 bg-amber-50 text-amber-800",
  stone: "border-black/[0.08] bg-white text-stone-700",
  rose: "border-rose-200 bg-rose-50 text-rose-800",
} as const;

export function Notice({
  tone = "amber",
  icon: Icon = IcAlert,
  children,
  action,
}: {
  tone?: keyof typeof NOTICE_TONES;
  icon?: IconType;
  children: React.ReactNode;
  action?: React.ReactNode;
}) {
  return (
    <div
      role="status"
      className={cn("flex flex-wrap items-center gap-x-3 gap-y-2 rounded-xl border px-4 py-3 text-sm", NOTICE_TONES[tone])}
    >
      <Icon className="size-4 shrink-0" />
      <span className="min-w-0 flex-1 font-medium">{children}</span>
      {action}
    </div>
  );
}

export function PendingNotice() {
  return <Notice>A plan payment is still pending. It expires in about 15 minutes if you don’t finish it.</Notice>;
}

export function ExpiryNotice({ days, expiresAt }: { days: number; expiresAt: string }) {
  return (
    <Notice icon={IcClock}>
      {days <= 1 ? "Your plan ends today." : `Your plan ends in ${plural(days, "day")}.`} Plans don’t renew by themselves.
      You can buy again once it ends on {fmtDate(expiresAt)}.
    </Notice>
  );
}

export function StaleNotice({ onRetry }: { onRetry: () => void }) {
  return (
    <Notice
      tone="stone"
      icon={IcInfo}
      action={
        <button type="button" onClick={onRetry} className={cn("text-[13px] font-semibold text-orange-700 hover:underline", FOCUS)}>
          Try again
        </button>
      }
    >
      Couldn’t refresh just now. You’re seeing the last data we loaded.
    </Notice>
  );
}

/* ========================================================================== */
/*  Spend strip: three paper cards, tinted icon badge, giant numeral          */
/* ========================================================================== */

const STRIP = "grid grid-cols-1 gap-3 sm:grid-cols-3 sm:gap-4";
const CELL_H = "h-[6.5rem] sm:h-[8rem]";

export type SpendStat = {
  label: string;
  icon: IconType;
  iconClass: string;
  amount: number;
  hint: string;
  /** 0 to 100 share of lifetime spend. */
  share?: number;
};

/** Icon colour class → matching soft badge background. */
const BADGE_BG: Record<string, string> = {
  "text-orange-500": "bg-orange-100",
  "text-emerald-500": "bg-emerald-100",
  "text-amber-500": "bg-amber-100",
};
const BAR_BG: Record<string, string> = {
  "text-orange-500": "bg-orange-500",
  "text-emerald-500": "bg-emerald-500",
  "text-amber-500": "bg-amber-500",
};

/** Counts up once per value change. Skipped entirely for reduced motion. */
function AnimatedMoney({ value }: { value: number }) {
  const reduce = useReducedMotion();
  const [shown, setShown] = React.useState(reduce ? value : 0);
  const from = React.useRef(reduce ? value : 0);

  React.useEffect(() => {
    if (reduce) {
      setShown(value);
      from.current = value;
      return;
    }
    const controls = animate(from.current, value, {
      duration: 0.9,
      ease: EASE,
      onUpdate: (v) => setShown(Math.round(v)),
      onComplete: () => {
        setShown(value);
        from.current = value;
      },
    });
    return () => controls.stop();
  }, [value, reduce]);

  return <>{money(shown)}</>;
}

export function SpendStrip({ stats }: { stats: SpendStat[] }) {
  return (
    <dl className={STRIP}>
      {stats.map((s, i) => (
        <motion.div
          key={s.label}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: i * 0.05, ease: EASE }}
          className={cn("group/card min-w-0", TICKET_LIFT)}
        >
          <div
            className={cn(
              "relative flex flex-col justify-between overflow-hidden rounded-2xl border border-black/[0.07] p-3.5 sm:p-4",
              PAPER,
              CELL_H,
            )}
          >
            <Sheen />
            <dt className="flex items-center gap-2">
              <span
                aria-hidden
                className={cn("flex size-7 shrink-0 items-center justify-center rounded-lg", BADGE_BG[s.iconClass] ?? "bg-stone-100")}
              >
                <s.icon className={cn("size-4", s.iconClass)} />
              </span>
              <span className="truncate text-[11px] font-semibold uppercase tracking-[0.12em] text-stone-500">
                {s.label}
              </span>
              {s.share !== undefined && (
                <span className="ml-auto text-[11px] font-bold tabular-nums text-[#1c1410]/60">{s.share}%</span>
              )}
            </dt>
            <dd className="min-w-0">
              <p className={cn(HEADING, "truncate text-[28px] leading-8 tracking-[-0.04em] tabular-nums text-[#1c1410] sm:text-[34px] sm:leading-9")}>
                <AnimatedMoney value={s.amount} />
              </p>
              <p className="mt-0.5 h-4 truncate text-[11px] leading-4 text-stone-500 sm:text-xs">{s.hint}</p>
            </dd>
            {s.share !== undefined && (
              <div
                className="absolute inset-x-0 bottom-0 h-[3px] bg-black/[0.05]"
                role="progressbar"
                aria-label={`${s.label} share of lifetime spend`}
                aria-valuemin={0}
                aria-valuemax={100}
                aria-valuenow={s.share}
              >
                <div
                  className={cn("h-full transition-[width] duration-700 ease-out", BAR_BG[s.iconClass] ?? "bg-orange-500")}
                  style={{ width: `${s.share}%` }}
                />
              </div>
            )}
          </div>
        </motion.div>
      ))}
    </dl>
  );
}

/** One bar showing where completed payments went. Colours match the strip icons. */
export function SpendSplit({ subscription, single }: { subscription: number; single: number }) {
  const total = subscription + single;
  const subPct = pctOf(subscription, total);
  const singlePct = total > 0 ? 100 - subPct : 0;
  return (
    <div className={cn("mt-3 rounded-2xl p-3 sm:mt-4 sm:p-4", SURFACE)}>
      <div className="flex items-center justify-between gap-3">
        <p className="text-xs font-semibold text-stone-500">Where your money went</p>
        <p className={cn(HEADING, "text-sm tabular-nums text-[#1c1410]")}>{total > 0 ? money(total) : "Nothing yet"}</p>
      </div>
      <div
        className="mt-2.5 flex h-3 gap-0.5 overflow-hidden rounded-full bg-stone-100"
        role="img"
        aria-label={
          total > 0
            ? `Subscriptions ${subPct} percent, purchased singly ${singlePct} percent`
            : "No completed payments yet"
        }
      >
        <div className="h-full rounded-full bg-emerald-500 transition-[width] duration-700 ease-out" style={{ width: `${subPct}%` }} />
        <div className="h-full rounded-full bg-amber-500 transition-[width] duration-700 ease-out" style={{ width: `${singlePct}%` }} />
      </div>
      <ul className="mt-2.5 flex flex-wrap gap-x-5 gap-y-1 text-xs text-stone-600">
        <li className="inline-flex items-center gap-1.5">
          <span aria-hidden className="size-2 rounded-full bg-emerald-500" />
          Subscriptions <span className="font-semibold tabular-nums text-[#1c1410]">{money(subscription)}</span>
        </li>
        <li className="inline-flex items-center gap-1.5">
          <span aria-hidden className="size-2 rounded-full bg-amber-500" />
          Purchased singly <span className="font-semibold tabular-nums text-[#1c1410]">{money(single)}</span>
        </li>
      </ul>
    </div>
  );
}

export function SpendStripSkeleton() {
  return (
    <div className={STRIP} aria-hidden>
      {[0, 1, 2].map((i) => (
        <div
          key={i}
          className={cn("flex flex-col justify-between rounded-2xl border border-black/[0.07] p-3.5 sm:p-4", PAPER, CELL_H)}
        >
          <Shimmer className="h-7 w-32 rounded-md" />
          <div>
            <Shimmer className="h-8 w-28 rounded-md" />
            <Shimmer className="mt-1 h-4 w-36 rounded-md" />
          </div>
        </div>
      ))}
    </div>
  );
}

/* ========================================================================== */
/*  Current plan                                                              */
/*  Ticket-style: dark date stub with the days left, details on the right.    */
/*  Usage is shown as one pip per template, like guest marks on the RSVP card */
/* ========================================================================== */

function UsageBar({
  label,
  icon: Icon,
  used,
  max,
  remaining,
  barClass,
  trackClass,
}: {
  label: string;
  icon: IconType;
  used: number;
  max: number;
  remaining: number;
  barClass: string;
  trackClass: string;
}) {
  const included = max > 0;
  const pct = pctOf(used, max);
  const exhausted = included && remaining === 0;
  const low = included && !exhausted && pct >= 80;
  const fill = exhausted ? "bg-rose-500" : low ? "bg-amber-500" : barClass;
  const segmented = included && max <= 20;

  return (
    <div>
      <div className="flex items-baseline justify-between gap-3 text-[13px]">
        <span className="inline-flex items-center gap-1.5 font-semibold text-[#1c1410]">
          <Icon className="size-4 text-stone-400" />
          {label}
        </span>
        <span className="tabular-nums text-stone-500">
          <span className={cn(HEADING, "text-lg text-[#1c1410]")}>{used}</span> / {max}
        </span>
      </div>
      <div
        role="progressbar"
        aria-label={`${label} templates used`}
        aria-valuemin={0}
        aria-valuemax={max}
        aria-valuenow={Math.min(used, max)}
        className={cn("mt-2", segmented ? "flex gap-1" : cn("h-2 overflow-hidden rounded-full", trackClass))}
      >
        {segmented ? (
          Array.from({ length: max }).map((_, i) => (
            <span
              key={i}
              className={cn(
                "h-2.5 flex-1 rounded-full transition-colors duration-500",
                i < used ? fill : trackClass,
              )}
              style={{ transitionDelay: `${Math.min(i, 12) * 30}ms` }}
            />
          ))
        ) : (
          <div
            className={cn("h-full rounded-full transition-[width] duration-700 ease-out", fill)}
            style={{ width: `${pct}%` }}
          />
        )}
      </div>
      <p
        className={cn(
          "mt-1.5 text-xs tabular-nums",
          exhausted ? "font-semibold text-rose-600" : low ? "font-semibold text-amber-700" : "text-stone-500",
        )}
      >
        {!included ? "Not part of this plan" : exhausted ? "None left this period" : low ? `Only ${remaining} left` : `${remaining} left`}
      </p>
    </div>
  );
}

const PLAN_SHELL = cn("overflow-hidden rounded-2xl", SURFACE);

export function CurrentPlanCard({ sub }: { sub: ActiveSubscription }) {
  const days = sub.daysRemaining;
  const urgent = days <= 7;
  const elapsed = periodProgress(sub.starts_at, sub.expires_at);

  return (
    <article
      className={cn(PLAN_SHELL, "group/card relative grid sm:grid-cols-[11rem_minmax(0,1fr)]")}
      aria-labelledby="current-plan-name"
    >
      <Sheen />
      {/* stub */}
      <div className="relative flex flex-row items-center justify-between gap-3 overflow-hidden bg-[#1c1410] p-4 pb-5 text-white sm:flex-col sm:items-start sm:justify-between sm:p-5 sm:pb-6">
        <div
          aria-hidden
          className={cn(
            "pointer-events-none absolute -right-10 -top-10 size-36 rounded-full blur-2xl",
            urgent ? "bg-amber-400/25" : "bg-orange-500/25",
          )}
        />
        <p className="relative text-[10px] font-semibold uppercase tracking-[0.16em] text-white/50">Time left</p>
        <div className="relative flex items-baseline gap-2 sm:block">
          <p className={cn(HEADING, "text-[52px] leading-[48px] tabular-nums tracking-[-0.05em]", urgent && "text-amber-300")}>
            {days}
          </p>
          <p className="text-xs font-semibold uppercase tracking-[0.12em] text-white/60 sm:mt-1.5">
            {days === 1 ? "day" : "days"} left
          </p>
        </div>
        <p className="relative hidden text-[11px] leading-4 text-white/50 sm:block">Since {fmtDate(sub.starts_at)}</p>
        <div
          className="absolute inset-x-0 bottom-0 h-[3px] bg-white/15"
          role="progressbar"
          aria-label="Share of the plan period already used"
          aria-valuemin={0}
          aria-valuemax={100}
          aria-valuenow={elapsed}
        >
          <div
            className={cn("h-full transition-[width] duration-700 ease-out", urgent ? "bg-amber-300" : "bg-orange-400")}
            style={{ width: `${elapsed}%` }}
          />
        </div>
      </div>

      {/* body */}
      <div className={cn("min-w-0 p-4 sm:border-l sm:border-dashed sm:border-[#1c1410]/20 sm:p-6", PAPER)}>
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-stone-500">Current plan</p>
            <h3 id="current-plan-name" className={cn(HEADING, "mt-0.5 truncate text-2xl leading-8 tracking-[-0.02em] text-[#1c1410]")}>
              {sub.plan_name}
            </h3>
          </div>
          <div className="flex items-center gap-2.5">
            <StatusPill status={sub.status} />
            <span className={cn(HEADING, "text-xl tabular-nums tracking-[-0.02em] text-[#1c1410]")}>{money(sub.price)}</span>
          </div>
        </div>

        <p className="mt-1 text-[13px] text-stone-600">
          Expires {fmtDate(sub.expires_at)} · {plural(days, "day")} left · {elapsed}% of the period used
        </p>

        <div className="mt-5 border-t border-dashed border-[#1c1410]/20 pt-4">
          <p className="text-xs font-semibold text-stone-500">Invitations created this period</p>
          <div className="mt-3 grid gap-5 sm:grid-cols-2">
            <UsageBar
              label="Simple"
              icon={IcEnvelope}
              used={sub.usage.simpleUsed}
              max={sub.allowances.simple}
              remaining={sub.usage.simpleRemaining}
              barClass="bg-orange-500"
              trackClass="bg-orange-100"
            />
            <UsageBar
              label="Premium"
              icon={IcCrown}
              used={sub.usage.premiumUsed}
              max={sub.allowances.premium}
              remaining={sub.usage.premiumRemaining}
              barClass="bg-amber-500"
              trackClass="bg-amber-100"
            />
          </div>
        </div>

        <div className="mt-4 flex flex-wrap items-center gap-2">
          {sub.allowances.allowsCustomSlug ? (
            <Chip icon={IcLink} tone="orange">Custom link included</Chip>
          ) : (
            <Chip icon={IcLock}>No custom link</Chip>
          )}
          <Chip icon={IcRefresh}>Renews by purchase</Chip>
        </div>
      </div>
    </article>
  );
}

export function CurrentPlanSkeleton() {
  return (
    <div className={cn(PLAN_SHELL, "grid sm:grid-cols-[11rem_minmax(0,1fr)]")} aria-hidden>
      <div className="flex flex-row items-center justify-between gap-3 bg-[#1c1410]/90 p-4 sm:flex-col sm:items-start sm:justify-between sm:p-5">
        <Shimmer className="h-3 w-16 rounded-md opacity-30" />
        <Shimmer className="h-12 w-16 rounded-md opacity-30" />
        <Shimmer className="hidden h-4 w-24 rounded-md opacity-30 sm:block" />
      </div>
      <div className="p-4 sm:p-6">
        <div className="flex items-start justify-between gap-3">
          <div>
            <Shimmer className="h-3 w-20 rounded-md" />
            <Shimmer className="mt-1.5 h-8 w-44 rounded-md" />
          </div>
          <Shimmer className="h-6 w-28 rounded-full" />
        </div>
        <Shimmer className="mt-2 h-4 w-60 rounded-md" />
        <div className="mt-5 border-t border-black/[0.06] pt-4">
          <Shimmer className="h-4 w-48 rounded-md" />
          <div className="mt-3 grid gap-5 sm:grid-cols-2">
            {[0, 1].map((i) => (
              <div key={i}>
                <Shimmer className="h-5 w-full rounded-md" />
                <Shimmer className="mt-2 h-2.5 w-full rounded-full" />
                <Shimmer className="mt-1.5 h-4 w-16 rounded-md" />
              </div>
            ))}
          </div>
        </div>
        <Shimmer className="mt-4 h-6 w-36 rounded-full" />
      </div>
    </div>
  );
}

export function NoPlanCard({
  lastPlanName,
  lastExpiresAt,
  onViewPlans,
}: {
  lastPlanName?: string;
  lastExpiresAt?: string;
  onViewPlans: () => void;
}) {
  const expired = Boolean(lastPlanName && lastExpiresAt);
  return (
    <article className={cn(PLAN_SHELL, PAPER, "flex flex-col items-center gap-4 p-6 text-center sm:flex-row sm:gap-6 sm:p-8 sm:text-left")}>
      <div className="relative h-24 w-24 shrink-0 overflow-hidden rounded-2xl bg-gradient-to-br from-orange-50 via-amber-50 to-rose-50 ring-1 ring-black/[0.05]">
        <Image src={ART.empty} alt="" fill unoptimized sizes="96px" className="object-cover" />
      </div>
      <div className="min-w-0 flex-1">
        <h3 className={cn(HEADING, "text-lg tracking-[-0.01em] text-[#1c1410] sm:text-xl")}>
          {expired ? `Your ${lastPlanName} plan ended on ${fmtDate(lastExpiresAt as string)}` : "You don’t have an active plan"}
        </h3>
        <p className="mt-1 text-sm text-stone-600">
          {expired
            ? "Buy a plan again to keep creating invitations from plan templates. Templates you bought singly stay yours."
            : "Pick a plan for a set of templates each period, or buy templates one at a time."}
        </p>
      </div>
      <div className="flex shrink-0 flex-col gap-2 sm:items-stretch">
        <button type="button" onClick={onViewPlans} className={cn(BTN, "h-10 rounded-xl px-5 text-sm", FOCUS)}>
          {expired ? "Buy a plan again" : "See popular plans"} <IcArrowUpRight className="size-4" />
        </button>
        <Link href={BILLING_ROUTES.browse} className={cn(GHOST_BTN, "h-10 rounded-xl", FOCUS)}>
          Browse templates
        </Link>
      </div>
    </article>
  );
}

/* ========================================================================== */
/*  Plans grid: perforated ticket per plan (same mask as the RSVP ticket)     */
/*  Only the three most-bought plans are shown.                               */
/* ========================================================================== */

export const GRID_CLASS = "grid grid-cols-1 gap-3 min-[560px]:grid-cols-2 sm:gap-4 xl:grid-cols-3";

export function blockCopy(reason: PlansContext["block_reason"], expiresAt?: string): string {
  if (reason === "SUBSCRIPTION_ACTIVE") {
    return `You already have an active plan until ${expiresAt ? fmtDate(expiresAt) : "it expires"}. One subscription at a time.`;
  }
  if (reason === "PLAN_ORDER_PENDING") {
    return "Finish or wait out your pending plan payment (15 min) first.";
  }
  return "Plans can’t be purchased right now.";
}

/** One explanation above the grid, so every card doesn’t need its own tooltip. */
export function PlansNotice({ context }: { context: PlansContext }) {
  if (context.can_purchase) return null;
  if (context.block_reason === "PLAN_ORDER_PENDING") return <PendingNotice />;
  return (
    <Notice tone="stone" icon={IcInfo}>
      {blockCopy(context.block_reason, context.active?.expires_at)}
    </Notice>
  );
}

function QuotaRow({
  icon: Icon,
  children,
  off,
  dots,
  dotClass,
}: {
  icon: IconType;
  children: React.ReactNode;
  off?: boolean;
  dots?: number;
  dotClass?: string;
}) {
  return (
    <li className={cn("flex items-center gap-2.5 text-[13px]", off ? "text-stone-400" : "text-[#1c1410]")}>
      <span className={cn("flex size-6 shrink-0 items-center justify-center rounded-full", off ? "bg-stone-100 text-stone-400" : "bg-orange-50 text-orange-600")}>
        {off ? <IcLock className="size-3.5" /> : <Icon className="size-3.5" />}
      </span>
      <span className="min-w-0 flex-1 truncate font-medium">{children}</span>
      {!off && dots !== undefined && dots > 0 && dotClass && <Dots count={dots} filledClass={dotClass} className="hidden min-[400px]:inline-flex max-w-[6.5rem] justify-end" />}
    </li>
  );
}

export function PlanCard({
  plan,
  index,
  context,
}: {
  plan: CatalogPlan;
  index: number;
  context: PlansContext;
}) {
  const isCurrent = context.active?.plan_id === plan.id;
  const reasonId = React.useId();
  const reason = blockCopy(context.block_reason, context.active?.expires_at);
  const ranked = plan.purchases > 0;
  const best = index === 0 && ranked;
  const perDay = plan.duration_days > 0 ? plan.price / plan.duration_days : 0;

  return (
    <motion.li
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay: Math.min(index, 8) * 0.035, ease: EASE }}
      className={cn("group/card min-w-0", TICKET_LIFT)}
    >
      <div
        style={{ WebkitMask: TICKET_MASK, mask: TICKET_MASK }}
        className={cn(
          "relative flex h-full flex-col overflow-hidden rounded-2xl border",
          PAPER,
          isCurrent ? "border-orange-400" : best ? "border-amber-400/70" : "border-black/[0.07]",
        )}
      >
        <Sheen />
        {/* top accent: ink for current, amber for the best seller */}
        {(isCurrent || best) && (
          <span
            aria-hidden
            className={cn("absolute inset-x-0 top-0 h-1", isCurrent ? "bg-[#1c1410]" : "bg-gradient-to-r from-amber-400 via-orange-400 to-amber-300")}
          />
        )}

        <div className="flex flex-1 flex-col p-4 sm:p-5">
          {/* Fixed-height badge row keeps every card aligned. */}
          <div className="mb-2 flex h-6 items-center gap-1.5">
            {isCurrent && <Chip icon={IcCheck} tone="ink">Current plan</Chip>}
            {ranked && (
              <Chip icon={IcTrend} tone={best ? "amber" : "neutral"}>
                {best ? "Most bought" : `#${index + 1} most bought`}
              </Chip>
            )}
          </div>

          <h3 className={cn(HEADING, "min-w-0 truncate text-lg leading-6 tracking-[-0.01em] text-[#1c1410]")} title={plan.name}>
            {plan.name}
          </h3>
          <p className="mt-1 line-clamp-2 min-h-[2.5rem] text-xs leading-5 text-stone-500">
            {plan.description || "Everything you need to publish beautiful invitations."}
          </p>

          {/* giant price + duration stub */}
          <div className="mt-4 flex items-end justify-between gap-3">
            <div className="min-w-0">
              <p className={cn(HEADING, "truncate text-[44px] leading-[42px] tabular-nums tracking-[-0.05em] text-[#1c1410]")}>
                {money(plan.price)}
              </p>
              <p className="mt-1.5 h-4 text-[11px] text-stone-500">
                {perDay > 0 ? `About ${money(Math.round(perDay))} a day` : ""}
              </p>
            </div>
            <div className="flex h-[4.25rem] w-14 shrink-0 flex-col items-center justify-center rounded-xl bg-[#1c1410] text-white shadow-[inset_0_1px_0_rgba(255,255,255,0.14)]">
              <span className={cn(HEADING, "text-[24px] leading-7 tabular-nums tracking-[-0.03em]")}>{plan.duration_days}</span>
              <span className="text-[9px] font-semibold uppercase leading-3 tracking-[0.16em] text-white/60">days</span>
            </div>
          </div>

          <ul className="mt-5 space-y-2.5 border-t border-dashed border-[#1c1410]/15 pt-4">
            <QuotaRow icon={IcEnvelope} dots={plan.max_simple_templates} dotClass="bg-orange-500">
              {plural(plan.max_simple_templates, "simple template")}
            </QuotaRow>
            <QuotaRow icon={IcCrown} off={plan.max_premium_templates === 0} dots={plan.max_premium_templates} dotClass="bg-amber-500">
              {plan.max_premium_templates === 0 ? "No premium templates" : plural(plan.max_premium_templates, "premium template")}
            </QuotaRow>
            <QuotaRow icon={IcLink} off={!plan.allows_custom_slug}>
              {plan.allows_custom_slug ? "Custom invitation link" : "No custom link"}
            </QuotaRow>
          </ul>
        </div>

        {/* perforated stub */}
        <div className="flex h-[4.5rem] shrink-0 items-center border-t border-dashed border-[#1c1410]/25 px-4 sm:px-5">
          {context.can_purchase ? (
            <Link
              href={BILLING_ROUTES.checkout(plan.id)}
              aria-label={`Buy ${plan.name} for ${money(plan.price)}`}
              className={cn(BTN, "h-10 w-full rounded-xl text-sm", FOCUS)}
            >
              Buy plan <IcArrowUpRight className="size-4" />
            </Link>
          ) : (
            <Tip label={reason} side="top">
              <button
                type="button"
                aria-disabled="true"
                aria-describedby={reasonId}
                onClick={(e) => e.preventDefault()}
                className={cn(
                  "inline-flex h-10 w-full cursor-not-allowed items-center justify-center gap-1.5 rounded-xl bg-stone-100 text-sm font-semibold text-stone-400 ring-1 ring-black/[0.05]",
                  FOCUS,
                )}
              >
                <IcLock className="size-4" />
                {isCurrent ? "Active now" : "Unavailable"}
              </button>
            </Tip>
          )}
          {!context.can_purchase && (
            <span id={reasonId} className="sr-only">
              {reason}
            </span>
          )}
        </div>
      </div>
    </motion.li>
  );
}

export function PlansGridSkeleton({ count = 3 }: { count?: number }) {
  return (
    <ul className={GRID_CLASS} aria-hidden>
      {Array.from({ length: count }).map((_, i) => (
        <li key={i} className="min-w-0">
          <div className={cn("flex h-full flex-col overflow-hidden rounded-2xl border border-black/[0.07]", PAPER)}>
            <div className="flex flex-1 flex-col p-4 sm:p-5">
              <Shimmer className="mb-2 h-6 w-28 rounded-full" />
              <Shimmer className="h-6 w-1/2 rounded-md" />
              <Shimmer className="mt-1 h-10 w-full rounded-md" />
              <div className="mt-4 flex items-end justify-between">
                <div>
                  <Shimmer className="h-10 w-28 rounded-md" />
                  <Shimmer className="mt-1.5 h-4 w-24 rounded-md" />
                </div>
                <Shimmer className="h-[4.25rem] w-14 rounded-xl" />
              </div>
              <div className="mt-5 space-y-2.5 border-t border-dashed border-black/15 pt-4">
                {[0, 1, 2].map((r) => (
                  <div key={r} className="flex items-center gap-2.5">
                    <Shimmer className="size-6 shrink-0 rounded-full" />
                    <Shimmer className="h-4 w-3/5 rounded-md" />
                  </div>
                ))}
              </div>
            </div>
            <div className="flex h-[4.5rem] items-center border-t border-dashed border-black/15 px-4 sm:px-5">
              <Shimmer className="h-10 w-full rounded-xl" />
            </div>
          </div>
        </li>
      ))}
    </ul>
  );
}

/* ========================================================================== */
/*  Purchased singly (kept visually apart from subscriptions)                 */
/* ========================================================================== */

export function SinglySummary({
  total,
  premium,
  free,
  customSlugs,
}: {
  total: number;
  premium: number;
  free: number;
  customSlugs: number;
}) {
  const items = [
    { label: "Total", value: total, icon: IcReceipt, badge: "bg-orange-100 text-orange-600" },
    { label: "Premium", value: premium, icon: IcCrown, badge: "bg-amber-100 text-amber-600" },
    { label: "Free", value: free, icon: IcSparkle, badge: "bg-emerald-100 text-emerald-600" },
    { label: "Custom links", value: customSlugs, icon: IcLink, badge: "bg-stone-100 text-stone-600" },
  ];
  return (
    <dl className="flex flex-wrap gap-2">
      {items.map((s) => (
        <div key={s.label} className={cn("flex items-center gap-2.5 rounded-xl py-1.5 pl-1.5 pr-3.5", SURFACE)}>
          <span aria-hidden className={cn("flex size-7 items-center justify-center rounded-lg", s.badge)}>
            <s.icon className="size-4" />
          </span>
          <dd className={cn(HEADING, "text-lg leading-6 tabular-nums text-[#1c1410]")}>{s.value}</dd>
          <dt className="text-xs font-medium text-stone-500">{s.label}</dt>
        </div>
      ))}
    </dl>
  );
}

function Thumb({ src, sizes }: { src: string; sizes: string }) {
  const [failed, setFailed] = React.useState(false);
  const [loaded, setLoaded] = React.useState(false);
  React.useEffect(() => {
    setFailed(false);
    setLoaded(false);
  }, [src]);

  if (failed || !src) {
    return (
      <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 bg-stone-100 text-stone-400">
        <IcImageOff className="size-7" />
        <span className="text-[11px] font-semibold">No preview</span>
      </div>
    );
  }
  return (
    <div className={cn("absolute inset-0 transition-opacity duration-500", loaded ? "opacity-100" : "opacity-0")}>
      <Image
        src={src}
        alt=""
        fill
        unoptimized
        sizes={sizes}
        onLoad={() => setLoaded(true)}
        onError={() => setFailed(true)}
        className="object-cover transition-transform duration-700 ease-out group-hover/card:scale-[1.04]"
      />
    </div>
  );
}

const SINGLE_THUMB = "aspect-[16/10] sm:aspect-[5/4]";

export function SinglePurchaseCard({ item, index }: { item: SinglePurchaseItem; index: number }) {
  return (
    <motion.li
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay: Math.min(index, 8) * 0.035, ease: EASE }}
      className={cn("group/card min-w-0", TICKET_LIFT)}
    >
      <article
        style={{ WebkitMask: SINGLE_MASK, mask: SINGLE_MASK }}
        className={cn("relative flex h-full flex-col overflow-hidden rounded-2xl border border-black/[0.07]", PAPER)}
      >
        <Sheen />
        <div className={cn("relative w-full overflow-hidden bg-stone-100", SINGLE_THUMB)}>
          <Thumb src={item.thumbnailUrl} sizes="(min-width: 1280px) 22vw, (min-width: 1024px) 30vw, (min-width: 480px) 45vw, 92vw" />
          <div aria-hidden className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/25 via-transparent to-transparent" />
          <div aria-hidden className="pointer-events-none absolute inset-0 ring-1 ring-inset ring-black/[0.05]" />
          {item.isPremium && (
            <span className="absolute left-2 top-2 inline-flex items-center gap-1.5 rounded-full bg-neutral-900/90 px-2 py-0.5 text-[10px] font-semibold text-amber-200 shadow-sm ring-1 ring-white/10 backdrop-blur-md sm:left-3 sm:top-3 sm:px-2.5 sm:py-1 sm:text-[11px]">
              <IcCrown className="size-3 sm:size-3.5" /> Premium
            </span>
          )}
          {item.hasCustomSlug && (
            <span className="absolute right-2 top-2 inline-flex size-7 items-center justify-center rounded-full bg-white/90 text-orange-600 shadow-sm ring-1 ring-black/[0.06] backdrop-blur-md sm:right-3 sm:top-3" title="Custom URL">
              <IcLink className="size-3.5" />
            </span>
          )}
        </div>

        <div className="flex flex-1 flex-col gap-2 p-3 sm:p-4">
          <h3 className={cn(HEADING, "h-6 truncate text-[15px] leading-6 tracking-[-0.01em] text-[#1c1410] sm:text-base")} title={item.name}>
            {item.name}
          </h3>
          <div className="mt-auto flex items-center justify-between gap-2">
            <p className="flex items-center gap-1.5 text-[11px] leading-4 text-stone-500">
              <IcCalendar className="size-3.5 text-stone-400" />
              Bought {fmtDate(item.purchasedAt)}
            </p>
            <span className={cn(HEADING, "text-base tabular-nums tracking-[-0.02em] text-[#1c1410]")}>
              {item.pricePaid > 0 ? money(item.pricePaid) : "Free"}
            </span>
          </div>
        </div>

        {/* perforated stub */}
        <div className="flex h-[3.75rem] shrink-0 items-center justify-between gap-3 border-t border-dashed border-[#1c1410]/25 px-3 sm:px-4">
          <Chip tone="ink">Purchased singly</Chip>
          <Link
            href={BILLING_ROUTES.library}
            className={cn("inline-flex shrink-0 items-center gap-2 text-xs font-semibold text-[#1c1410]", FOCUS)}
          >
            Use it
            <span className="flex size-8 items-center justify-center rounded-full bg-[#1c1410]/[0.06] ring-1 ring-black/[0.06] transition-all duration-300 group-hover/card:bg-[#1c1410] group-hover/card:text-white">
              <IcArrowUpRight className="size-3.5 transition-transform duration-300 group-hover/card:rotate-45" />
            </span>
          </Link>
        </div>
      </article>
    </motion.li>
  );
}

export function SinglePurchasesSkeleton({ count = 4 }: { count?: number }) {
  return (
    <ul className="grid grid-cols-1 gap-3 min-[480px]:grid-cols-2 sm:gap-4 lg:grid-cols-3 xl:grid-cols-4" aria-hidden>
      {Array.from({ length: count }).map((_, i) => (
        <li key={i} className="min-w-0">
          <div className={cn("flex h-full flex-col overflow-hidden rounded-2xl border border-black/[0.07]", PAPER)}>
            <Shimmer className={cn("w-full rounded-none", SINGLE_THUMB)} />
            <div className="flex flex-1 flex-col gap-2 p-3 sm:p-4">
              <Shimmer className="h-6 w-3/4 rounded-md" />
              <Shimmer className="mt-auto h-4 w-full rounded-md" />
            </div>
            <div className="flex h-[3.75rem] items-center justify-between border-t border-dashed border-black/15 px-3 sm:px-4">
              <Shimmer className="h-6 w-28 rounded-full" />
              <Shimmer className="size-8 rounded-full" />
            </div>
          </div>
        </li>
      ))}
    </ul>
  );
}

export function SinglePurchasesGrid({ items }: { items: SinglePurchaseItem[] }) {
  return (
    <ul className="grid grid-cols-1 gap-3 min-[480px]:grid-cols-2 sm:gap-4 lg:grid-cols-3 xl:grid-cols-4">
      {items.map((it, i) => (
        <SinglePurchaseCard key={it.id} item={it} index={i} />
      ))}
    </ul>
  );
}

/* ========================================================================== */
/*  Receipts: filter + desktop table + mobile cards                           */
/* ========================================================================== */

export type ReceiptFilter = "all" | "plan" | "template";

const FILTERS: { id: ReceiptFilter; label: string }[] = [
  { id: "all", label: "All" },
  { id: "plan", label: "Plans" },
  { id: "template", label: "Templates" },
];

export function ReceiptsToolbar({
  value,
  onChange,
  counts,
}: {
  value: ReceiptFilter;
  onChange: (v: ReceiptFilter) => void;
  counts: Record<ReceiptFilter, number>;
}) {
  return (
    <div role="group" aria-label="Filter receipts" className="inline-flex gap-1 rounded-xl bg-stone-100 p-1 ring-1 ring-black/[0.04]">
      {FILTERS.map((f) => {
        const on = value === f.id;
        return (
          <button
            key={f.id}
            type="button"
            aria-pressed={on}
            onClick={() => onChange(f.id)}
            className={cn(
              "inline-flex h-8 items-center gap-1.5 rounded-lg px-3 text-[13px] font-semibold transition-colors",
              on ? "bg-white text-[#1c1410] shadow-sm ring-1 ring-black/[0.06]" : "text-stone-500 hover:text-[#1c1410]",
              FOCUS,
            )}
          >
            {f.label}
            <span className={cn("tabular-nums text-xs", on ? "text-orange-600" : "text-stone-400")}>{counts[f.id]}</span>
          </button>
        );
      })}
    </div>
  );
}

const ORDER_TYPE_LABEL: Record<string, string> = { plan: "Plan", template: "Template" };
const orderTypeLabel = (t: string) => ORDER_TYPE_LABEL[t] ?? (t ? t[0].toUpperCase() + t.slice(1) : "Order");
const isDirect = (o: BillingOrder) => String(o.provider_order_id).startsWith("direct-");

const LIST_SURFACE = cn("overflow-hidden rounded-2xl", SURFACE);
const ROW_H = "h-16";

function CopyId({ value }: { value: string }) {
  const [done, setDone] = React.useState(false);
  const timer = React.useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  React.useEffect(
    () => () => {
      if (timer.current) clearTimeout(timer.current);
    },
    [],
  );
  const copy = async () => {
    try {
      await navigator.clipboard.writeText(value);
      setDone(true);
      if (timer.current) clearTimeout(timer.current);
      timer.current = setTimeout(() => setDone(false), 1600);
    } catch {
      /* clipboard blocked: nothing useful to do */
    }
  };
  return (
    <button
      type="button"
      onClick={copy}
      aria-label={done ? "Order ID copied" : `Copy order ID ${value}`}
      className={cn(
        "inline-flex size-7 shrink-0 items-center justify-center rounded-md text-stone-400 transition-colors hover:bg-stone-100 hover:text-stone-700",
        FOCUS,
      )}
    >
      {done ? <IcCheck className="size-3.5 text-emerald-600" /> : <IcCopy className="size-3.5" />}
    </button>
  );
}

function OrderRef({ order }: { order: BillingOrder }) {
  if (isDirect(order)) {
    return <span className="truncate text-[11px] text-stone-400">Added to your library</span>;
  }
  return (
    <span className="truncate font-mono text-[11px] text-stone-400" title={order.provider_order_id}>
      {order.provider_order_id}
    </span>
  );
}

function TypeBadge({ type }: { type: string }) {
  const isPlan = type === "plan";
  return (
    <span className="inline-flex items-center gap-2 text-stone-600">
      <span
        aria-hidden
        className={cn("flex size-6 items-center justify-center rounded-md", isPlan ? "bg-emerald-100 text-emerald-600" : "bg-amber-100 text-amber-600")}
      >
        {isPlan ? <IcTrend className="size-3.5" /> : <IcCrown className="size-3.5" />}
      </span>
      {orderTypeLabel(type)}
    </span>
  );
}

export function OrdersTable({ orders }: { orders: BillingOrder[] }) {
  return (
    <>
      {/* Desktop */}
      <div className={cn(LIST_SURFACE, "hidden md:block")}>
        <table className="w-full table-fixed text-left text-sm">
          <caption className="sr-only">Recent payments</caption>
          <colgroup>
            <col className="w-[36%]" />
            <col className="w-[13%]" />
            <col className="w-[15%]" />
            <col className="w-[14%]" />
            <col />
          </colgroup>
          <thead className="border-b border-dashed border-[#1c1410]/20 bg-gradient-to-r from-[#fffdfa] to-[#fff3e8] text-xs font-semibold text-stone-500">
            <tr className="h-11">
              <th scope="col" className="px-5 font-semibold">Item</th>
              <th scope="col" className="px-3 font-semibold">Type</th>
              <th scope="col" className="px-3 font-semibold">Status</th>
              <th scope="col" className="px-3 text-right font-semibold">Amount</th>
              <th scope="col" className="px-5 text-right font-semibold">Date</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-black/[0.06]">
            {orders.map((o) => (
              <tr key={o.id} className={cn("transition-colors hover:bg-[#fff8f1]", ROW_H)}>
                <td className="px-5">
                  <div className="flex items-center gap-1.5">
                    <div className="min-w-0 flex-1">
                      <p className="truncate font-semibold text-[#1c1410]" title={o.item_name}>{o.item_name}</p>
                      <div className="flex"><OrderRef order={o} /></div>
                    </div>
                    {!isDirect(o) && <CopyId value={String(o.provider_order_id)} />}
                  </div>
                </td>
                <td className="px-3"><TypeBadge type={String(o.order_type)} /></td>
                <td className="px-3"><StatusPill status={String(o.status)} /></td>
                <td className={cn(HEADING, "px-3 text-right text-base tabular-nums text-[#1c1410]")}>{money(o.amount)}</td>
                <td className="px-5 text-right text-stone-600">{fmtDate(o.created_at)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Mobile */}
      <ul className={cn(LIST_SURFACE, "divide-y divide-dashed divide-[#1c1410]/15 md:hidden")}>
        {orders.map((o) => (
          <li key={o.id} className="px-4 py-3">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <p className="truncate text-[15px] font-semibold text-[#1c1410]">{o.item_name}</p>
                <p className="text-xs text-stone-500">
                  {orderTypeLabel(String(o.order_type))} · {fmtDate(o.created_at)}
                </p>
              </div>
              <p className={cn(HEADING, "shrink-0 text-lg tabular-nums text-[#1c1410]")}>{money(o.amount)}</p>
            </div>
            <div className="mt-2 flex items-center justify-between gap-3">
              <StatusPill status={String(o.status)} />
              <div className="flex min-w-0 items-center gap-1">
                <OrderRef order={o} />
                {!isDirect(o) && <CopyId value={String(o.provider_order_id)} />}
              </div>
            </div>
          </li>
        ))}
      </ul>
    </>
  );
}

export function OrdersSkeleton({ rows = 5 }: { rows?: number }) {
  return (
    <div className={LIST_SURFACE} aria-hidden>
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} className={cn("flex items-center gap-3 px-4 sm:px-5", ROW_H, i > 0 && "border-t border-black/[0.06]")}>
          <div className="min-w-0 flex-1 space-y-1.5">
            <Shimmer className="h-4 w-48 max-w-full rounded-md" />
            <Shimmer className="h-3 w-32 rounded-md" />
          </div>
          <Shimmer className="hidden h-6 w-20 rounded-full sm:block" />
          <Shimmer className="h-5 w-16 rounded-md" />
        </div>
      ))}
    </div>
  );
}

export function FilteredEmpty({ filter, onReset }: { filter: ReceiptFilter; onReset: () => void }) {
  const what = filter === "plan" ? "plan" : "template";
  return (
    <div className={cn(LIST_SURFACE, "flex flex-col items-center gap-2 px-4 py-8 text-center")}>
      <IcReceipt className="size-6 text-stone-300" />
      <p className="text-sm font-semibold text-[#1c1410]">No {what} payments in your latest receipts</p>
      <button type="button" onClick={onReset} className={cn("text-[13px] font-semibold text-orange-700 hover:underline", FOCUS)}>
        Show all receipts
      </button>
    </div>
  );
}

export function BrowseLink({ href, children }: { href: string; children: React.ReactNode }) {
  return (
    <Link href={href} className={cn(GHOST_BTN, FOCUS)}>
      {children} <IcArrowUpRight className="size-3.5 text-orange-600" />
    </Link>
  );
}