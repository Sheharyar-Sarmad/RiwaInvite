"use client";

import * as React from "react";
import Link from "next/link";
import Image from "next/image";
import useSWR from "swr";
import { createPortal } from "react-dom";
import {
  AnimatePresence,
  animate,
  motion,
  useDragControls,
  useInView,
  useMotionValue,
  useReducedMotion,
  useTransform,
} from "framer-motion";
import { Area, AreaChart, ResponsiveContainer } from "recharts";
import {
  ArrowUpRight,
  Bell,
  CalendarDays,
  Clock,
  Crown,
  Inbox,
  LayoutTemplate,
  Phone,
  Receipt,
  RefreshCw,
  ShieldCheck,
  TrendingUp,
  UserCheck,
  X,
  Mail,
  Check,
  Copy,
} from "lucide-react";
import { apiClient } from "@/lib/api/api_base";
import { FOCUS } from "@/components/user/navigation/UserSidebar";

/* ========================================================================== */
/*  Types                                                                     */
/* ========================================================================== */

export type DashboardUser = {
  id: string;
  email: string;
  first_name: string;
  last_name?: string;
  phone_number?: string;
  created_at?: string;
};
export type Overview = {
  stats: {
    totalInvitations: number;
    activeInvitations: number;
    totalRSVPs: number;
    totalGuests: number;
    rsvpsThisWeek: number;
    guestsThisWeek: number;
  };
  actionItems: { unclaimedCustomSlugs: number };
  recentInvitations: {
    id: string;
    title: string;
    status: string;
    slug: string | null;
    created_at: string;
    rsvp_count: number;
  }[];
  mostActiveInvitation: {
    id: string;
    title: string;
    rsvp_count: number;
  } | null;
  recentRSVPs: {
    guest_name: string;
    attendance_status: string;
    number_of_guests: number;
    created_at: string;
    invitation_title: string;
  }[];
  planUsage: { max_simple_templates: number; max_premium_templates: number };
};
export type Analytics = {
  rsvpTrend: { date: string; accepted: number; declined: number }[];
  guestBreakdown: { accepted: number; declined: number; pending: number };
  topInvitations: { title: string; total_rsvps: number }[];
  hourlyRSVPs: { time_of_day: string; count: number }[];
  totalPlusOnes: number;
};
export type ActivityItem = {
  id: string;
  title: string;
  message: string;
  type: "notification" | "rsvp" | "order";
  created_at: string;
};
export type Billing = {
  activeSubscription: {
    id: string;
    plan_name: string;
    price: number | string;
    status: string;
    expires_at: string;
  } | null;
  recentOrders: {
    id: string;
    provider_order_id: string;
    amount: number | string;
    order_type: string;
    status: string;
    created_at: string;
  }[];
  lifetimeSpend: number;
};

/* ========================================================================== */
/*  Constants & helpers                                                       */
/*                                                                            */
/*  Design rules for this file:                                               */
/*   - Orange is for brand actions only.                                      */
/*   - Ink (near-black) is for selection and primary text.                    */
/*   - Colour appears only where it carries meaning (status, charts).         */
/*   - Surfaces are solid, with a hairline ring and a soft neutral shadow.    */
/* ========================================================================== */

export const fetcher = (url: string) =>
  apiClient.get(url).then((r) => r.data.data);

export const EASE = [0.16, 1, 0.3, 1] as const;
export const VIEW = { once: true, amount: 0.15 } as const;
export const STICKY_TOP = "top-2 sm:top-3";

export const TOKENS = {
  cream: "#fffbf7",
  peach: "#fff7ed",
  orange: "#ea580c",
  amber: "#f59e0b",
  ember: "#dc2626",
  emerald: "#10b981",
  rose: "#e11d48",
  sand: "#fed7aa",
  text: "#1c1410",
  axis: "#78716c",
  grid: "#e8e1d8",
  stone: "#a8a29e",
  ink: "#1c1410",
} as const;

export const cn = (...c: (string | false | null | undefined)[]) =>
  c.filter(Boolean).join(" ");
export const fmtDate = (d: string) =>
  new Date(d).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
export const money = (n: number | string) =>
  `Rs ${Number(n || 0).toLocaleString()}`;
export const titleCase = (s: string) =>
  s.replace(/[-_]/g, " ").replace(/^\w/, (c) => c.toUpperCase());
export function timeAgo(d: string) {
  const s = Math.max(
    1,
    Math.floor((Date.now() - new Date(d).getTime()) / 1000),
  );
  if (s < 60) return "just now";
  const m = Math.floor(s / 60);
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  const days = Math.floor(h / 24);
  return days < 7 ? `${days}d ago` : fmtDate(d);
}

export const HEADING =
  "font-[family-name:var(--font-display)] font-extrabold tracking-[-0.02em]";
export const ORB =
  "flex shrink-0 select-none items-center justify-center rounded-full bg-gradient-to-br from-orange-400 to-orange-600 text-white shadow-sm";
export const BTN =
  "bg-gradient-to-b from-orange-500 to-orange-600 text-white transition hover:brightness-105 active:scale-[0.98] shadow-[0_1px_2px_rgba(154,52,18,0.35),inset_0_1px_0_rgba(255,255,255,0.18)] inline-flex items-center justify-center gap-2 rounded-xl px-4 py-2 text-sm font-semibold";
export const BTN_DARK =
  "bg-neutral-900 text-white ring-1 ring-black/10 transition hover:bg-neutral-800 active:scale-[0.98] shadow-sm inline-flex items-center justify-center gap-2 rounded-xl px-4 py-2 text-sm font-semibold";

/** Solid white surface: hairline ring + layered neutral shadow. */
export const SURFACE_LIGHT =
  "bg-white text-[#1c1410] ring-1 ring-black/[0.06] shadow-[0_1px_2px_rgba(28,20,16,0.04),0_12px_28px_-18px_rgba(28,20,16,0.22)]";
/** Ink surface for the one or two "feature" panels per page. */
export const SURFACE_DARK =
  "bg-[#1c1410] text-orange-50 ring-1 ring-white/10 shadow-[0_1px_2px_rgba(0,0,0,0.2),0_16px_32px_-18px_rgba(28,20,16,0.6)]";

/* ========================================================================== */
/*  Tip: hover / focus label for any button or link                           */
/* ========================================================================== */

export type TipSide = "top" | "bottom" | "left" | "right";

const TIP_ORIGIN: Record<TipSide, string> = {
  top: "translate(-50%, -100%)",
  bottom: "translate(-50%, 0)",
  left: "translate(-100%, -50%)",
  right: "translate(0, -50%)",
};
const TIP_NUDGE = {
  top: { y: 4 },
  bottom: { y: -4 },
  left: { x: 4 },
  right: { x: -4 },
} as const;

/** Wraps a single button/link. Shows a label on hover (mouse only) and on keyboard focus. */
export function Tip({
  label,
  hint,
  side = "top",
  children,
}: {
  label: string;
  hint?: string;
  side?: TipSide;
  children: React.ReactNode;
}) {
  const wrap = React.useRef<HTMLSpanElement>(null);
  const timer = React.useRef<number | undefined>(undefined);
  const [pos, setPos] = React.useState<{ x: number; y: number } | null>(null);
  const [mounted, setMounted] = React.useState(false);

  React.useEffect(() => setMounted(true), []);
  React.useEffect(() => () => window.clearTimeout(timer.current), []);

  // hide on scroll so it never floats away from its button
  React.useEffect(() => {
    if (!pos) return;
    const off = () => setPos(null);
    window.addEventListener("scroll", off, true);
    return () => window.removeEventListener("scroll", off, true);
  }, [pos]);

  const show = (delay: number) => {
    window.clearTimeout(timer.current);
    timer.current = window.setTimeout(() => {
      const el = wrap.current?.firstElementChild as HTMLElement | null;
      if (!el) return;
      const r = el.getBoundingClientRect();
      const g = 10;
      setPos(
        side === "top"
          ? { x: r.left + r.width / 2, y: r.top - g }
          : side === "bottom"
            ? { x: r.left + r.width / 2, y: r.bottom + g }
            : side === "left"
              ? { x: r.left - g, y: r.top + r.height / 2 }
              : { x: r.right + g, y: r.top + r.height / 2 },
      );
    }, delay);
  };
  const hide = () => {
    window.clearTimeout(timer.current);
    setPos(null);
  };

  return (
    <>
      {/* display:contents keeps the child's layout (grid cells, col-span, w-full) untouched */}
      <span
        ref={wrap}
        className="contents"
        onPointerEnter={(e) => e.pointerType === "mouse" && show(350)}
        onPointerLeave={hide}
        onPointerDown={hide}
        onFocus={(e) =>
          (e.target as HTMLElement).matches(":focus-visible") && show(0)
        }
        onBlur={hide}
      >
        {children}
      </span>
      {mounted &&
        createPortal(
          <AnimatePresence>
            {pos && (
              <div
                role="tooltip"
                className="pointer-events-none fixed z-[300]"
                style={{ left: pos.x, top: pos.y, transform: TIP_ORIGIN[side] }}
              >
                <motion.div
                  initial={{ opacity: 0, ...TIP_NUDGE[side] }}
                  animate={{ opacity: 1, x: 0, y: 0 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.12, ease: "easeOut" }}
                  className="flex items-center gap-2 whitespace-nowrap rounded-md bg-[#1c1410] px-2.5 py-1.5 text-xs font-medium text-orange-50 shadow-[0_4px_14px_rgba(28,20,16,0.25)] ring-1 ring-white/10"
                >
                  {label}
                  {hint && (
                    <kbd className="rounded border border-white/20 px-1 font-mono text-[10px] text-stone-300">
                      {hint}
                    </kbd>
                  )}
                </motion.div>
              </div>
            )}
          </AnimatePresence>,
          document.body,
        )}
    </>
  );
}

/* ========================================================================== */
/*  Layout primitives                                                         */
/* ========================================================================== */

export function StatGrid({ children }: { children: React.ReactNode }) {
  return (
    <div className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
      {children}
    </div>
  );
}

export function Surface({
  className,
  pad = "p-4 sm:p-5",
  delay = 0,
  children,
  image,
  variant,
}: {
  className?: string;
  pad?: string;
  delay?: number;
  children: React.ReactNode;
  image?: string;
  variant?: "light" | "dark";
}) {
  const reduce = useReducedMotion() ?? false;
  const isDark = variant === "dark";
  return (
    <motion.div
      initial={reduce ? false : { opacity: 0, y: 10 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={VIEW}
      transition={{ duration: 0.45, delay, ease: EASE }}
      className={cn(
        "relative min-w-0 overflow-hidden rounded-2xl",
        isDark ? SURFACE_DARK : SURFACE_LIGHT,
        pad,
        className,
      )}
    >
      {image && (
        <>
          <Image
            src={image}
            alt=""
            fill
            sizes="(min-width: 1280px) 480px, 100vw"
            className="pointer-events-none object-cover opacity-20 mix-blend-overlay"
          />
          <div
            aria-hidden
            className={cn(
              "pointer-events-none absolute inset-0",
              isDark
                ? "bg-gradient-to-r from-[#1c1410] via-[#1c1410]/90 to-transparent"
                : "bg-gradient-to-r from-white via-white/90 to-transparent",
            )}
          />
        </>
      )}
      <div className="relative z-10 flex h-full flex-col">{children}</div>
    </motion.div>
  );
}

export function Sparkline({
  data,
  color = TOKENS.orange,
  className,
}: {
  data: number[];
  color?: string;
  className?: string;
}) {
  const id = React.useId().replace(/:/g, "");
  const series = (data.length > 1 ? data : [0, 0]).map((v, i) => ({ i, v }));
  return (
    <div className={cn("pointer-events-none", className)} aria-hidden>
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart
          data={series}
          margin={{ top: 2, right: 0, left: 0, bottom: 0 }}
        >
          <defs>
            <linearGradient id={id} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={color} stopOpacity={0.28} />
              <stop offset="100%" stopColor={color} stopOpacity={0} />
            </linearGradient>
          </defs>
          <Area
            type="monotone"
            dataKey="v"
            stroke={color}
            strokeWidth={1.75}
            fill={`url(#${id})`}
            isAnimationActive={false}
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}

export function CountUp({
  value,
  delay = 0,
}: {
  value: number;
  delay?: number;
}) {
  const ref = React.useRef<HTMLSpanElement>(null);
  const inView = useInView(ref, { once: true, amount: 0.4 });
  const mv = useMotionValue(0);
  const rounded = useTransform(mv, (v) => Math.round(v).toLocaleString());
  React.useEffect(() => {
    if (!inView) return;
    const c = animate(mv, value, { duration: 1.1, delay, ease: EASE });
    return () => c.stop();
  }, [value, mv, inView, delay]);
  return <motion.span ref={ref}>{rounded}</motion.span>;
}

/** Kept for compatibility. Now just a calm hover lift (no 3D tilt, no shine sweep). */
export function TiltCard({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  const reduce = useReducedMotion();
  return (
    <motion.div
      whileHover={reduce ? undefined : { y: -2 }}
      transition={{ type: "spring", stiffness: 300, damping: 26 }}
      className={cn("relative h-full", className)}
    >
      {children}
    </motion.div>
  );
}

export function StatCell({
  label,
  value,
  icon: Icon,
  hint,
  delta,
  series,
  accent = TOKENS.orange,
  variant = "light",
  delay = 0,
}: {
  label: string;
  value: string | number;
  icon: React.ElementType;
  hint?: string;
  delta?: string;
  series?: number[];
  accent?: string;
  variant?: "light" | "dark";
  delay?: number;
}) {
  const isDark = variant === "dark";
  const reduce = useReducedMotion();

  return (
    <Surface variant={variant} className="h-full" pad="p-0" delay={delay}>
      <div className="relative flex flex-col p-4 pb-12 sm:p-5 sm:pb-14">
        <p
          className={cn(
            "flex items-center gap-1.5 text-[11px] font-semibold uppercase leading-tight tracking-[0.06em]",
            isDark ? "text-stone-400" : "text-stone-500",
          )}
        >
          <Icon
            className="size-4 shrink-0"
            strokeWidth={1.75}
            style={{ color: isDark ? TOKENS.amber : accent }}
          />
          <span className="truncate">{label}</span>
        </p>

        <p
          className={cn(
            HEADING,
            "mt-2 text-3xl leading-9 tabular-nums sm:text-4xl sm:leading-10",
            isDark ? "text-orange-50" : "text-[#1c1410]",
          )}
        >
          {typeof value === "number" ? (
            <CountUp value={value} delay={delay + 0.1} />
          ) : (
            value
          )}
        </p>

        {(delta || hint) && (
          <motion.div
            initial={reduce ? false : { opacity: 0, y: 4 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={VIEW}
            transition={{ duration: 0.4, delay: delay + 0.3, ease: EASE }}
            className="mt-2 flex h-5 items-center text-xs font-medium"
          >
            {delta ? (
              <span
                className={cn(
                  "inline-flex items-center gap-1 rounded-full px-2 py-0.5 ring-1 ring-inset",
                  isDark
                    ? "bg-emerald-500/15 text-emerald-300 ring-emerald-400/20"
                    : "bg-emerald-50 text-emerald-700 ring-emerald-200",
                )}
              >
                <TrendingUp className="size-3" /> {delta}
              </span>
            ) : (
              <span className={isDark ? "text-stone-400" : "text-stone-500"}>
                {hint}
              </span>
            )}
          </motion.div>
        )}
      </div>

      {series && (
        <motion.div
          className="pointer-events-none absolute inset-x-0 bottom-0 h-10 sm:h-12"
          initial={reduce ? false : { clipPath: "inset(0 100% 0 0)" }}
          whileInView={{ clipPath: "inset(0 0% 0 0)" }}
          viewport={VIEW}
          transition={{ duration: 1, delay: delay + 0.2, ease: EASE }}
        >
          <Sparkline
            data={series}
            color={isDark ? TOKENS.amber : accent}
            className="h-full w-full"
          />
        </motion.div>
      )}
    </Surface>
  );
}

export function EmptyState({
  icon: Icon = Inbox,
  title,
  hint,
  actionLabel,
  href,
  onAction,
  className,
  children,
  art,
  dark,
}: any) {
  const cta = cn(BTN, "px-5 py-2.5 text-xs font-bold");
  return (
    <div
      className={cn(
        "flex flex-col items-center justify-center px-6 py-10 text-center sm:py-12",
        className,
      )}
    >
      <div
        className={cn(
          "relative mb-5 flex items-center justify-center overflow-hidden rounded-xl ring-1",
          art
            ? "h-24 w-36 bg-white shadow-[0_10px_24px_-12px_rgba(28,20,16,0.35)] ring-black/[0.06] sm:h-28 sm:w-44"
            : cn(
                "size-12",
                dark
                  ? "bg-white/10 ring-white/15"
                  : "bg-stone-100 ring-black/[0.06]",
              ),
        )}
      >
        {art ? (
          <Image
            src={art}
            alt=""
            fill
            sizes="(max-width: 640px) 144px, 176px"
            className="object-cover"
          />
        ) : (
          <Icon
            className={cn("size-5", dark ? "text-orange-100" : "text-stone-500")}
            strokeWidth={1.75}
          />
        )}
      </div>

      <p
        className={cn(
          "text-base",
          HEADING,
          dark ? "text-orange-50" : "text-[#1c1410]",
        )}
      >
        {title}
      </p>
      {hint && (
        <p
          className={cn(
            "mx-auto mt-1.5 max-w-[18rem] text-xs font-medium leading-relaxed",
            dark ? "text-stone-400" : "text-stone-500",
          )}
        >
          {hint}
        </p>
      )}

      {actionLabel && (
        <div className="mt-5">
          <Tip label={actionLabel} side="bottom">
            {href ? (
              <Link href={href} className={cta}>
                {actionLabel}
              </Link>
            ) : (
              <button onClick={onAction} className={cta}>
                {actionLabel}
              </button>
            )}
          </Tip>
        </div>
      )}
      {children && <div className="mt-5">{children}</div>}
    </div>
  );
}

/** Loading placeholder. Rounds itself (rounded-2xl) unless the caller passes its own `rounded-*`. */
export function Shimmer({ className = "" }: { className?: string }) {
  const ownRadius = /(^|\s)rounded/.test(className);
  return (
    <div
      aria-hidden
      className={cn(
        "relative overflow-hidden bg-stone-200/60",
        !ownRadius && "rounded-2xl",
        className,
      )}
    >
      <motion.div
        className="absolute inset-0 bg-gradient-to-r from-transparent via-white/70 to-transparent"
        initial={{ x: "-100%" }}
        animate={{ x: "100%" }}
        transition={{ duration: 1.4, repeat: Infinity, ease: "linear" }}
      />
    </div>
  );
}
export const Skeleton = Shimmer;

export function ErrorCard({ onRetry }: { onRetry: () => void }) {
  return (
    <Surface>
      <div className="flex flex-col items-center gap-3 py-10 text-center">
        <div className="flex size-11 items-center justify-center rounded-full bg-rose-50 text-rose-600 ring-1 ring-rose-200">
          <RefreshCw className="size-5" />
        </div>
        <div>
          <p className={cn("text-sm", HEADING)}>Failed to load data</p>
          <p className="mt-1 text-xs font-medium text-stone-500">
            Check your connection and try again.
          </p>
        </div>
        <Tip label="Try loading again" side="bottom">
          <button onClick={onRetry} className={cn(BTN, "mt-2 px-5 py-2")}>
            Retry
          </button>
        </Tip>
      </div>
    </Surface>
  );
}

export function CardHead({
  title,
  href,
  cta = "View all",
  tip,
  dark,
}: {
  title: string;
  href?: string;
  cta?: string;
  tip?: string;
  dark?: boolean;
}) {
  return (
    <div className="mb-4 flex items-center justify-between gap-3">
      <h3 className={cn("truncate text-sm sm:text-base", HEADING)}>{title}</h3>
      {href && (
        <Tip label={tip ?? `Open ${title.toLowerCase()}`} side="left">
          <Link
            href={href}
            className={cn(
              "rounded-md text-xs font-semibold transition",
              dark
                ? "text-orange-300 hover:text-orange-200"
                : "text-orange-600 hover:text-orange-700",
              FOCUS,
            )}
          >
            {cta}
          </Link>
        </Tip>
      )}
    </div>
  );
}

export function ChartCard({
  title,
  description,
  action,
  className,
  delay = 0,
  children,
  dark,
  image,
}: any) {
  return (
    <Surface
      variant={dark ? "dark" : "light"}
      delay={delay}
      className={className}
      image={image}
    >
      <div className="mb-5 flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h3 className={cn("text-sm", HEADING)}>{title}</h3>
          {description && (
            <p
              className={cn(
                "mt-1 text-[11px] font-medium",
                dark ? "text-stone-400" : "text-stone-500",
              )}
            >
              {description}
            </p>
          )}
        </div>
        {action}
      </div>
      <div className="min-h-0 flex-1">{children}</div>
    </Surface>
  );
}

export function ChartTooltip({
  active,
  payload,
  label,
  labelFormatter,
  valueSuffix = "",
}: any) {
  if (!active || !payload?.length) return null;
  const head =
    label !== undefined
      ? labelFormatter
        ? labelFormatter(String(label))
        : String(label)
      : payload[0].name;
  return (
    <div className="min-w-[8rem] rounded-xl bg-white px-3.5 py-2.5 text-stone-800 shadow-[0_10px_30px_-8px_rgba(28,20,16,0.25)] ring-1 ring-black/[0.08]">
      {head && (
        <p className="mb-1.5 text-[10px] font-semibold uppercase tracking-[0.08em] text-stone-500">
          {head}
        </p>
      )}
      <div className="space-y-1">
        {payload.map((p: any, i: number) => (
          <p
            key={i}
            className="flex items-center gap-2 text-xs font-medium tabular-nums"
          >
            <span
              className="size-2 rounded-full"
              style={{ background: p.color ?? (p.payload?.fill as string) }}
            />
            {label !== undefined && p.name ? (
              <span className="text-stone-500">{titleCase(String(p.name))}</span>
            ) : null}
            <span className="ml-auto pl-4 font-semibold text-[#1c1410]">
              {Number(p.value).toLocaleString()}
              {valueSuffix}
            </span>
          </p>
        ))}
      </div>
    </div>
  );
}

export function StatusChip({ status }: { status: string }) {
  const CHIP_LIGHT: Record<string, string> = {
    green: "bg-emerald-50 text-emerald-700 ring-emerald-200",
    red: "bg-rose-50 text-rose-700 ring-rose-200",
    amber: "bg-amber-50 text-amber-700 ring-amber-200",
    orange: "bg-orange-50 text-orange-700 ring-orange-200",
    stone: "bg-stone-50 text-stone-600 ring-stone-200",
  };
  const CHIP_KIND: Record<string, string> = {
    accepted: "green",
    published: "green",
    completed: "green",
    active: "green",
    paid: "green",
    success: "green",
    declined: "red",
    failed: "red",
    cancelled: "red",
    canceled: "red",
    expired: "red",
    pending: "amber",
    processing: "amber",
    draft: "orange",
    archived: "stone",
  };
  const kind = CHIP_KIND[status?.toLowerCase()] ?? "orange";
  return (
    <span
      className={cn(
        "inline-flex shrink-0 items-center rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide ring-1 ring-inset",
        CHIP_LIGHT[kind],
      )}
    >
      {titleCase(status)}
    </span>
  );
}

/* ========================================================================== */
/*  Profile data                                                              */
/* ========================================================================== */

export type ProfileRow = {
  icon: React.ElementType;
  label: string;
  value: string;
  chip?: boolean;
};

export function useProfile(user: DashboardUser) {
  const { data: billing } = useSWR<Billing>("/user/dashboard/billing", fetcher);
  const { data: overview } = useSWR<Overview>(
    "/user/dashboard/overview",
    fetcher,
  );
  const sub = billing?.activeSubscription;
  const planName = sub?.plan_name || "Free Tier";
  const isFree = !!billing && !sub;
  const fullName = `${user.first_name} ${user.last_name || ""}`.trim();
  const memberSince = user.created_at
    ? new Date(user.created_at).toLocaleDateString("en-US", {
        month: "short",
        year: "numeric",
        timeZone: "UTC",
      })
    : null;
  const rows = [
    { icon: ShieldCheck, label: "Plan", value: planName, chip: true },
    memberSince && {
      icon: CalendarDays,
      label: "Member since",
      value: memberSince,
    },
    overview?.planUsage && {
      icon: LayoutTemplate,
      label: "Simple templates",
      value: String(overview.planUsage.max_simple_templates),
    },
    overview?.planUsage && {
      icon: Crown,
      label: "Premium templates",
      value: String(overview.planUsage.max_premium_templates),
    },
    user.phone_number && {
      icon: Phone,
      label: "Phone",
      value: user.phone_number,
    },
  ].filter(Boolean) as ProfileRow[];
  return { planName, isFree, fullName, rows };
}

/* ========================================================================== */
/*  Activity sheet                                                            */
/*  [drag handle] / [scrolling body] / [pinned action]. Only the handle       */
/*  starts the swipe-to-close, so the body scrolls natively on touch.         */
/* ========================================================================== */

export const ACTIVITY_STYLE: Record<
  ActivityItem["type"],
  { icon: React.ElementType; cls: string }
> = {
  notification: {
    icon: Bell,
    cls: "bg-orange-50 text-orange-600 ring-orange-200",
  },
  rsvp: {
    icon: UserCheck,
    cls: "bg-emerald-50 text-emerald-600 ring-emerald-200",
  },
  order: { icon: Receipt, cls: "bg-amber-50 text-amber-600 ring-amber-200" },
};
const ACTIVITY_META: Record<
  ActivityItem["type"],
  { label: string; href: string; cta: string }
> = {
  notification: {
    label: "Notification",
    href: "/dashboard/notifications",
    cta: "Open notifications",
  },
  rsvp: { label: "Guest reply", href: "/dashboard/rsvps", cta: "View RSVPs" },
  order: { label: "Payment", href: "/dashboard/billing", cta: "View billing" },
};

export function ActivitySheet({
  item,
  onClose,
}: {
  item: ActivityItem | null;
  onClose: () => void;
}) {
  const [mounted, setMounted] = React.useState(false);
  const controls = useDragControls();
  const closeRef = React.useRef<HTMLButtonElement>(null);

  React.useEffect(() => setMounted(true), []);

  React.useEffect(() => {
    if (!item) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    window.addEventListener("keydown", onKey);
    closeRef.current?.focus();
    return () => {
      document.body.style.overflow = prev;
      window.removeEventListener("keydown", onKey);
    };
  }, [item, onClose]);

  if (!mounted) return null;

  const s = item
    ? (ACTIVITY_STYLE[item.type] ?? ACTIVITY_STYLE.notification)
    : null;
  const m = item
    ? (ACTIVITY_META[item.type] ?? ACTIVITY_META.notification)
    : null;

  return createPortal(
    <AnimatePresence>
      {item && s && m && (
        <div className="fixed inset-0 z-[100] flex items-end justify-center sm:items-center sm:p-6">
          <motion.div
            key="backdrop"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            onClick={onClose}
            className="absolute inset-0 bg-stone-950/40 backdrop-blur-sm"
          />
          <motion.div
            key="panel"
            role="dialog"
            aria-modal="true"
            aria-labelledby="activity-title"
            initial={{ opacity: 0, y: 70 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 70 }}
            transition={{ type: "spring", damping: 34, stiffness: 380 }}
            drag="y"
            dragControls={controls}
            dragListener={false}
            dragConstraints={{ top: 0, bottom: 0 }}
            dragElastic={{ top: 0, bottom: 0.6 }}
            onDragEnd={(_, info) => {
              if (info.offset.y > 110 || info.velocity.y > 600) onClose();
            }}
            className="relative flex max-h-[88dvh] w-full flex-col overflow-hidden rounded-t-3xl bg-white text-[#1c1410] shadow-2xl ring-1 ring-black/[0.06] sm:max-w-md sm:rounded-3xl"
          >
            <div
              onPointerDown={(e) => controls.start(e)}
              className="flex h-6 shrink-0 cursor-grab touch-none items-center justify-center sm:hidden"
              aria-hidden
            >
              <span className="h-1.5 w-10 rounded-full bg-stone-300" />
            </div>

            <div
              data-lenis-prevent
              data-lenis-prevent-touch
              data-lenis-prevent-wheel
              onWheel={(e) => e.stopPropagation()}
              onTouchMove={(e) => e.stopPropagation()}
              style={{ touchAction: "pan-y", WebkitOverflowScrolling: "touch" }}
              className="min-h-0 flex-1 overflow-y-auto overscroll-contain p-5 pt-3 sm:pt-5"
            >
              <div className="flex items-start justify-between gap-3">
                <div className="flex min-w-0 items-center gap-3">
                  <span
                    className={cn(
                      "flex size-10 shrink-0 items-center justify-center rounded-xl ring-1",
                      s.cls,
                    )}
                  >
                    <s.icon className="size-4" strokeWidth={1.75} />
                  </span>
                  <div className="min-w-0">
                    <p className="text-[11px] font-semibold uppercase tracking-[0.06em] text-stone-500">
                      {m.label}
                    </p>
                    <p className="flex items-center gap-1 text-xs text-stone-500">
                      <Clock className="size-3" /> {timeAgo(item.created_at)}
                    </p>
                  </div>
                </div>
                <Tip label="Close" hint="Esc" side="left">
                  <button
                    ref={closeRef}
                    onClick={onClose}
                    aria-label="Close"
                    className={cn(
                      "flex size-9 shrink-0 items-center justify-center rounded-full bg-stone-100 text-stone-600 transition hover:bg-stone-200 hover:text-[#1c1410] active:scale-95",
                      FOCUS,
                    )}
                  >
                    <X className="size-4" />
                  </button>
                </Tip>
              </div>

              <h4 id="activity-title" className={cn("mt-4 text-xl", HEADING)}>
                {item.title}
              </h4>
              <p className="mt-2 whitespace-pre-line text-[15px] leading-relaxed text-stone-600">
                {item.message}
              </p>

              <p className="mt-4 rounded-lg bg-stone-50 px-3 py-2 font-mono text-xs text-stone-600 ring-1 ring-black/[0.05]">
                {new Date(item.created_at).toLocaleString("en-US", {
                  dateStyle: "full",
                  timeStyle: "short",
                })}
              </p>
            </div>

            <div className="shrink-0 border-t border-black/[0.06] bg-white p-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] sm:px-5 sm:py-4">
              <Tip label={`Go to ${m.label.toLowerCase()}s`} side="top">
                <Link
                  href={m.href}
                  onClick={onClose}
                  className={cn(
                    "flex w-full items-center justify-center gap-2 rounded-xl px-4 py-2.5 text-sm font-bold",
                    BTN,
                    FOCUS,
                  )}
                >
                  {m.cta} <ArrowUpRight className="size-4" />
                </Link>
              </Tip>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>,
    document.body,
  );
}

/* ========================================================================== */
/*  Profile sheet (modal)                                                     */
/*  A membership pass: ink top, paper bottom, torn at a notched dashed line.  */
/* ========================================================================== */

const PASS_NOTCH = 172; // px from the top of the pass to the tear line

export function ProfileSheet({
  user,
  isOpen,
  onClose,
  isFree,
  fullName,
  rows,
}: {
  user: DashboardUser;
  isOpen: boolean;
  onClose: () => void;
  isFree: boolean;
  fullName: string;
  rows: ProfileRow[];
}) {
  const [mounted, setMounted] = React.useState(false);
  const [copied, setCopied] = React.useState(false);

  React.useEffect(() => setMounted(true), []);
  React.useEffect(() => {
    if (!isOpen) return;
    setCopied(false);
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    window.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = prev;
      window.removeEventListener("keydown", onKey);
    };
  }, [isOpen, onClose]);

  if (!mounted) return null;

  const memberId = user.id.replace(/-/g, "").slice(-6).toUpperCase();

  const copyEmail = async () => {
    try {
      await navigator.clipboard.writeText(user.email);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1600);
    } catch {
      /* clipboard blocked: nothing to do */
    }
  };

  // Two half-circle bites out of the left and right edges at the tear line.
  const bite = (x: string) =>
    `radial-gradient(circle 10px at ${x} ${PASS_NOTCH}px, #0000 97%, #000)`;
  const notchMask: React.CSSProperties = {
    WebkitMaskImage: `${bite("0")}, ${bite("100%")}`,
    maskImage: `${bite("0")}, ${bite("100%")}`,
    WebkitMaskComposite: "source-in",
    maskComposite: "intersect",
  };

  return createPortal(
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
          <motion.div
            key="backdrop"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            onClick={onClose}
            className="absolute inset-0 bg-stone-950/40 backdrop-blur-sm"
          />

          {/* outer wrapper carries the shadow, because a mask would clip a box-shadow */}
          <motion.div
            key="panel"
            role="dialog"
            aria-modal="true"
            aria-label="Your profile"
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 20 }}
            transition={{ type: "spring", damping: 28, stiffness: 320 }}
            className="relative flex max-h-[calc(100dvh-2rem)] w-full max-w-[320px] flex-col drop-shadow-[0_20px_32px_rgba(28,20,16,0.35)]"
          >
            <div
              data-lenis-prevent
              data-lenis-prevent-touch
              data-lenis-prevent-wheel
              onWheel={(e) => e.stopPropagation()}
              onTouchMove={(e) => e.stopPropagation()}
              className="min-h-0 flex-1 touch-pan-y overflow-y-auto overscroll-contain rounded-3xl"
            >
              <div style={notchMask} className="bg-white text-[#1c1410]">
                {/* ---------- top: ink half ---------- */}
                <div
                  className="relative flex flex-col justify-between overflow-hidden bg-[#1c1410] p-5 text-orange-50"
                  style={{ height: PASS_NOTCH }}
                >
                  <Image
                    src="/ethos-hero-bg.png"
                    alt=""
                    fill
                    sizes="400px"
                    className="pointer-events-none object-cover opacity-20 mix-blend-overlay"
                  />

                  <div className="relative flex items-start justify-between">
                    <span
                      aria-hidden
                      className="flex size-12 select-none items-center justify-center rounded-xl bg-gradient-to-br from-orange-400 to-orange-600 text-2xl font-extrabold text-white shadow-[inset_0_1px_0_rgba(255,255,255,0.3),0_8px_20px_-8px_rgba(234,88,12,0.7)]"
                    >
                      {user.first_name.charAt(0).toUpperCase()}
                    </span>
                    <Tip label="Close" hint="Esc" side="left">
                      <button
                        onClick={onClose}
                        aria-label="Close"
                        className={cn(
                          "flex size-8 items-center justify-center rounded-full bg-white/10 text-orange-100 ring-1 ring-white/15 transition hover:bg-white/20 active:scale-95",
                          FOCUS,
                        )}
                      >
                        <X className="size-4" />
                      </button>
                    </Tip>
                  </div>

                  <div className="relative min-w-0">
                    <h2 className={cn(HEADING, "truncate text-2xl leading-none")}>
                      {fullName}
                    </h2>
                    <div className="mt-2 flex items-center gap-1.5">
                      <Mail className="size-3.5 shrink-0 text-stone-400" />
                      <span className="min-w-0 truncate text-xs text-stone-300">
                        {user.email}
                      </span>
                      <Tip label={copied ? "Copied" : "Copy email"} side="top">
                        <button
                          onClick={copyEmail}
                          aria-label="Copy email address"
                          className={cn(
                            "ml-0.5 flex size-6 shrink-0 items-center justify-center rounded-md text-stone-400 transition hover:bg-white/10 hover:text-orange-50",
                            FOCUS,
                          )}
                        >
                          {copied ? (
                            <Check className="size-3.5 text-emerald-300" />
                          ) : (
                            <Copy className="size-3.5" />
                          )}
                        </button>
                      </Tip>
                    </div>
                  </div>
                </div>

                {/* ---------- bottom: paper half ---------- */}
                <div className="relative px-5 pb-5 pt-4">
                  {/* tear line, sits exactly on the notches */}
                  <div
                    aria-hidden
                    className="absolute inset-x-4 top-0 border-t-2 border-dashed border-stone-200"
                  />

                  <dl>
                    {rows.map((r) => (
                      <div
                        key={r.label}
                        className="flex items-baseline gap-2 py-1.5 text-[13px]"
                      >
                        <dt className="flex shrink-0 items-center gap-2 text-stone-500">
                          <r.icon className="size-3.5 text-stone-400" />
                          {r.label}
                        </dt>
                        <span
                          aria-hidden
                          className="min-w-4 flex-1 translate-y-[-3px] border-b border-dotted border-black/15"
                        />
                        <dd className="shrink-0">
                          {r.chip ? (
                            <span className="inline-block rounded-md bg-orange-50 px-2 py-0.5 text-xs font-bold tracking-wide text-orange-700 ring-1 ring-inset ring-orange-200">
                              {r.value}
                            </span>
                          ) : (
                            <span className="font-semibold tabular-nums">
                              {r.value}
                            </span>
                          )}
                        </dd>
                      </div>
                    ))}
                    <div className="flex items-baseline gap-2 py-1.5 text-[13px]">
                      <dt className="shrink-0 pl-[1.375rem] text-stone-500">
                        Member ID
                      </dt>
                      <span
                        aria-hidden
                        className="min-w-4 flex-1 translate-y-[-3px] border-b border-dotted border-black/15"
                      />
                      <dd className="shrink-0 font-mono text-[13px] font-semibold tracking-wider">
                        {memberId}
                      </dd>
                    </div>
                  </dl>

                  <div className="mt-3 flex flex-col gap-2">
                    {isFree && (
                      <Tip label="See what Pro includes" side="top">
                        <Link
                          href="/plans"
                          className={cn(
                            BTN,
                            "w-full rounded-xl py-2.5 text-sm font-bold",
                            FOCUS,
                          )}
                        >
                          <Crown className="size-4" /> Upgrade to Pro
                        </Link>
                      </Tip>
                    )}
                    <Tip label="Name, password, preferences" side="top">
                      <Link
                        href="/dashboard/settings"
                        onClick={onClose}
                        className={cn(
                          "flex w-full items-center justify-center rounded-xl border border-black/[0.08] bg-white py-2.5 text-sm font-semibold text-[#1c1410] transition-colors hover:border-black/20 hover:bg-stone-50",
                          FOCUS,
                        )}
                      >
                        Account settings
                      </Link>
                    </Tip>
                  </div>
                </div>
              </div>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>,
    document.body,
  );
}