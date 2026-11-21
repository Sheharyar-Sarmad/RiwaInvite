"use client";

import * as React from "react";
import Link from "next/link";
import Image from "next/image";
import useSWR from "swr";
import { createPortal } from "react-dom";
import {
  AnimatePresence, animate, motion, useDragControls, useInView,
  useMotionValue, useReducedMotion, useSpring, useTransform,
} from "framer-motion";
import { Area, AreaChart, ResponsiveContainer } from "recharts";
import {
  ArrowUpRight, Bell, CalendarDays, Clock, Crown, Inbox, LayoutTemplate, Phone, Receipt,
  RefreshCw, ShieldCheck, Sparkles, TrendingUp, UserCheck, X,
} from "lucide-react";
import { apiClient } from "@/lib/api/api_base";
import { FOCUS } from "@/components/user/navigation/UserSidebar";

/* ========================================================================== */
/*  Types, constants, helpers                                                 */
/* ========================================================================== */

export type DashboardUser = {
  id: string; email: string; first_name: string; last_name?: string; phone_number?: string; created_at?: string;
};
export type Overview = {
  stats: { totalInvitations: number; activeInvitations: number; totalRSVPs: number; totalGuests: number; rsvpsThisWeek: number; guestsThisWeek: number };
  actionItems: { unclaimedCustomSlugs: number };
  recentInvitations: { id: string; title: string; status: string; slug: string | null; created_at: string; rsvp_count: number }[];
  mostActiveInvitation: { id: string; title: string; rsvp_count: number } | null;
  recentRSVPs: { guest_name: string; attendance_status: string; number_of_guests: number; created_at: string; invitation_title: string }[];
  planUsage: { max_simple_templates: number; max_premium_templates: number };
};
export type Analytics = {
  rsvpTrend: { date: string; accepted: number; declined: number }[];
  guestBreakdown: { accepted: number; declined: number; pending: number };
  topInvitations: { title: string; total_rsvps: number }[];
  hourlyRSVPs: { time_of_day: string; count: number }[];
  totalPlusOnes: number;
};
export type ActivityItem = { id: string; title: string; message: string; type: "notification" | "rsvp" | "order"; created_at: string };
export type Billing = {
  activeSubscription: { id: string; plan_name: string; price: number | string; status: string; expires_at: string } | null;
  recentOrders: { id: string; provider_order_id: string; amount: number | string; order_type: string; status: string; created_at: string }[];
  lifetimeSpend: number;
};

export const fetcher = (url: string) => apiClient.get(url).then((r) => r.data.data);

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
  text: "#2a1002",
  axis: "#78716c",
  grid: "#fed7aa",
  stone: "#a8a29e",
  ink: "#2a1002",
} as const;

export const cn = (...c: (string | false | null | undefined)[]) => c.filter(Boolean).join(" ");
export const fmtDate = (d: string) =>
  new Date(d).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
export const money = (n: number | string) => `Rs ${Number(n || 0).toLocaleString()}`;
export const titleCase = (s: string) => s.replace(/[-_]/g, " ").replace(/^\w/, (c) => c.toUpperCase());
export function timeAgo(d: string) {
  const s = Math.max(1, Math.floor((Date.now() - new Date(d).getTime()) / 1000));
  if (s < 60) return "just now";
  const m = Math.floor(s / 60); if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60); if (h < 24) return `${h}h ago`;
  const days = Math.floor(h / 24);
  return days < 7 ? `${days}d ago` : fmtDate(d);
}

export const HEADING = "font-[family-name:var(--font-display)] font-extrabold tracking-tight";
export const ORB = "flex shrink-0 select-none items-center justify-center rounded-full bg-gradient-to-br from-orange-400 to-orange-600 text-white shadow-sm";
export const BTN = "bg-gradient-to-b from-orange-500 to-orange-600 text-white transition hover:brightness-105 active:scale-[0.98] shadow-[inset_0_1px_0_rgba(255,255,255,0.3),0_4px_12px_rgba(234,88,12,0.3)] inline-flex items-center justify-center gap-2 rounded-xl px-4 py-2 text-sm font-semibold";
export const BTN_DARK = "bg-[#2a1002] text-white transition hover:bg-[#431407] active:scale-[0.98] shadow-sm inline-flex items-center justify-center gap-2 rounded-xl px-4 py-2 text-sm font-semibold";

export function StatGrid({ children }: { children: React.ReactNode }) {
  return <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">{children}</div>;
}

/* ========================================================================== */
/*  Surface (Static gradient border — no rotating spotlight)                  */
/* ========================================================================== */

export function Surface({
  className, pad = "p-4 sm:p-5", delay = 0, children, image, variant
}: { className?: string; pad?: string; delay?: number; children: React.ReactNode; image?: string; variant?: "light" | "dark" }) {
  const reduce = useReducedMotion() ?? false;
  const isDark = variant === "dark";

  return (
    <motion.div
      initial={reduce ? false : { opacity: 0, y: 14 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={VIEW}
      transition={{ duration: 0.5, delay, ease: EASE }}
      className={cn(
        "relative min-w-0 overflow-hidden rounded-2xl p-[1.5px]",
        isDark
          ? "bg-gradient-to-br from-orange-600/50 via-orange-900/40 to-orange-600/50"
          : "bg-gradient-to-br from-orange-300/60 via-orange-200/40 to-orange-300/60",
        className,
      )}
    >
      <div
        className={cn(
          "relative h-full overflow-hidden rounded-[15px] shadow-[inset_0_1px_0_rgba(255,255,255,0.8)]",
          isDark ? "bg-[#431407] text-orange-50" : "bg-[#fffbf7] text-[#2a1002]",
          pad,
        )}
      >
        {image && (
          <>
            <Image src={image} alt="" fill className="object-cover opacity-20 mix-blend-overlay pointer-events-none" />
            <div className={cn("absolute inset-0 pointer-events-none", isDark ? "bg-gradient-to-r from-[#431407] via-[#431407]/90 to-transparent" : "bg-gradient-to-r from-[#fffbf7] via-[#fffbf7]/90 to-transparent")} />
          </>
        )}
        <div className="relative z-10 h-full flex flex-col">{children}</div>
      </div>
    </motion.div>
  );
}

/* ========================================================================== */
/*  Sparkline, CountUp, TiltCard, StatCell                                    */
/* ========================================================================== */

export function Sparkline({ data, color = TOKENS.orange, className }: { data: number[]; color?: string; className?: string }) {
  const id = React.useId().replace(/:/g, "");
  const series = (data.length > 1 ? data : [0, 0]).map((v, i) => ({ i, v }));
  return (
    <div className={cn("pointer-events-none", className)} aria-hidden>
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={series} margin={{ top: 2, right: 0, left: 0, bottom: 0 }}>
          <defs>
            <linearGradient id={id} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={color} stopOpacity={0.4} />
              <stop offset="100%" stopColor={color} stopOpacity={0} />
            </linearGradient>
          </defs>
          <Area type="monotone" dataKey="v" stroke={color} strokeWidth={2} fill={`url(#${id})`} isAnimationActive={false} />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}

export function CountUp({ value, delay = 0 }: { value: number; delay?: number }) {
  const ref = React.useRef<HTMLSpanElement>(null);
  const inView = useInView(ref, { once: true, amount: 0.4 });
  const mv = useMotionValue(0);
  const rounded = useTransform(mv, (v) => Math.round(v).toLocaleString());
  React.useEffect(() => {
    if (!inView) return;
    const c = animate(mv, value, { duration: 1.4, delay, ease: EASE });
    return () => c.stop();
  }, [value, mv, inView, delay]);
  return <motion.span ref={ref}>{rounded}</motion.span>;
}

/* 3D tilt + hover sheen. Spotlight completely removed. */
export function TiltCard({
  children, className,
}: { children: React.ReactNode; className?: string }) {
  const reduce = useReducedMotion();
  const rx = useSpring(0, { stiffness: 220, damping: 22 });
  const ry = useSpring(0, { stiffness: 220, damping: 22 });

  const onMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (reduce || e.pointerType !== "mouse") return;
    const r = e.currentTarget.getBoundingClientRect();
    const x = e.clientX - r.left;
    const y = e.clientY - r.top;
    rx.set((0.5 - y / r.height) * 8);
    ry.set((x / r.width - 0.5) * 10);
  };
  const onLeave = () => {
    rx.set(0); ry.set(0);
  };

  return (
    <motion.div
      onPointerMove={onMove}
      onPointerLeave={onLeave}
      style={{ rotateX: rx, rotateY: ry, transformPerspective: 900 }}
      whileHover={reduce ? undefined : { y: -4 }}
      transition={{ type: "spring", stiffness: 300, damping: 24 }}
      className={cn("group/tilt relative h-full will-change-transform", className)}
    >
      {children}
      {/* sheen sweep only */}
      <div aria-hidden className="pointer-events-none absolute inset-0 z-20 overflow-hidden rounded-2xl">
        <span className="absolute inset-y-0 -left-1/2 w-1/3 -skew-x-12 bg-gradient-to-r from-transparent via-white/30 to-transparent opacity-0 transition-all duration-[900ms] ease-out group-hover/tilt:translate-x-[420%] group-hover/tilt:opacity-100" />
      </div>
    </motion.div>
  );
}

export function StatCell({
  label, value, icon: Icon, hint, delta, series, accent = TOKENS.orange, variant = "light", delay = 0,
}: {
  label: string; value: string | number; icon: React.ElementType; hint?: string; delta?: string;
  series?: number[]; accent?: string; variant?: "light" | "dark"; delay?: number;
}) {
  const isDark = variant === "dark";
  const reduce = useReducedMotion();

  return (
    <TiltCard>
      <Surface variant={variant} className="h-full" pad="p-0" delay={delay}>
        <div className="relative z-10 flex flex-col p-5 pb-16 sm:pb-[4.5rem]">
          {/* top row: icon + live dot */}
          <div className="flex items-center justify-between">
            <motion.span
              animate={reduce ? undefined : { y: [0, -3, 0] }}
              transition={{ duration: 4, repeat: Infinity, ease: "easeInOut", delay }}
              className={cn(
                "flex size-11 items-center justify-center rounded-2xl ring-1 backdrop-blur-sm",
                isDark ? "bg-orange-500/20 text-orange-300 ring-orange-400/30" : "bg-gradient-to-br from-white to-orange-50 text-orange-600 ring-orange-200",
              )}
              style={{ boxShadow: `0 8px 24px -6px ${accent}80, inset 0 1px 0 rgba(255,255,255,0.5)` }}
            >
              <Icon className="size-5" strokeWidth={2} />
            </motion.span>

            {delta && (
              <span className="relative flex size-2.5">
                <span className="absolute inline-flex size-full animate-ping rounded-full bg-emerald-400 opacity-60 motion-reduce:animate-none" />
                <span className="relative inline-flex size-2.5 rounded-full bg-emerald-500" />
              </span>
            )}
          </div>

          {/* label: own line, never truncated */}
          <p className={cn(
            "mt-4 text-[10.5px] font-bold uppercase leading-tight tracking-[0.14em]",
            isDark ? "text-orange-200/70" : "text-stone-500",
          )}>
            {label}
          </p>

          {/* number: display heading font */}
          <p className={cn(
            HEADING,
            "mt-1.5 text-5xl leading-none tabular-nums sm:text-6xl",
            "bg-clip-text text-transparent bg-gradient-to-b",
            isDark ? "from-orange-50 to-amber-200" : "from-[#2a1002] to-[#9a3412]",
          )}>
            {typeof value === "number" ? <CountUp value={value} delay={delay + 0.15} /> : value}
          </p>

          {(delta || hint) && (
            <motion.div
              initial={reduce ? false : { opacity: 0, y: 6 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={VIEW}
              transition={{ duration: 0.5, delay: delay + 0.45, ease: EASE }}
              className="mt-4 text-xs font-semibold"
            >
              {delta ? (
                <span className={cn(
                  "inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 ring-1",
                  isDark ? "bg-emerald-500/15 text-emerald-300 ring-emerald-400/20" : "bg-emerald-50 text-emerald-700 ring-emerald-200",
                )}>
                  <TrendingUp className="size-3.5" /> {delta}
                </span>
              ) : (
                <span className={isDark ? "text-orange-200/60" : "text-stone-500"}>{hint}</span>
              )}
            </motion.div>
          )}
        </div>

        {/* sparkline draws in left → right */}
        {series && (
          <motion.div
            className="pointer-events-none absolute inset-x-0 bottom-0 h-14 sm:h-16"
            initial={reduce ? false : { clipPath: "inset(0 100% 0 0)" }}
            whileInView={{ clipPath: "inset(0 0% 0 0)" }}
            viewport={VIEW}
            transition={{ duration: 1.3, delay: delay + 0.3, ease: EASE }}
          >
            <Sparkline data={series} color={isDark ? TOKENS.amber : accent} className="h-full w-full" />
          </motion.div>
        )}
      </Surface>
    </TiltCard>
  );
}

/* ========================================================================== */
/*  Empty State & Loading                                                     */
/* ========================================================================== */

export function EmptyState({
  icon: Icon = Inbox, title, hint, actionLabel, href, onAction, className, children, art, dark
}: {
  icon?: React.ElementType; title: string; hint?: string; actionLabel?: string; href?: string;
  onAction?: () => void; className?: string; children?: React.ReactNode; art?: string; dark?: boolean;
}) {
  const cta = cn(BTN, "px-5 py-2.5 text-xs font-bold");

  return (
    <div
      className={cn(
        "relative flex flex-col items-center justify-center overflow-hidden rounded-2xl px-6 py-12 text-center",
        dark ? "bg-[#431407]/40" : "bg-gradient-to-br from-[#fff7ed] to-[#ffedd5]",
        className
      )}
    >
      <div aria-hidden className="pointer-events-none absolute left-1/2 top-1/2 size-72 -translate-x-1/2 -translate-y-1/2 rounded-full bg-gradient-to-tr from-orange-400/20 via-amber-400/20 to-red-400/20 blur-3xl" />

      <div className="relative z-10 mb-6">
        <motion.div
          animate={{ y: [0, -6, 0] }}
          transition={{ duration: 3.5, repeat: Infinity, ease: "easeInOut" }}
          whileHover={{ scale: 1.05, rotate: -2 }}
          className={cn(
            "relative flex items-center justify-center overflow-hidden rounded-xl ring-1",
            art
              ? "h-28 w-40 sm:h-32 sm:w-48 bg-white ring-orange-100 shadow-sm"
              : "size-14 bg-gradient-to-br from-orange-500 to-orange-600 ring-orange-400/50 shadow-md"
          )}
        >
          {art ? (
            <>
              <Image src={art} alt="" fill sizes="(max-width: 640px) 160px, 200px" className="object-cover" />
              <div className="absolute inset-0 bg-gradient-to-t from-orange-900/10 to-transparent pointer-events-none" />
            </>
          ) : (
            <Icon className={cn("size-6 text-white", dark && "text-orange-100")} strokeWidth={2} />
          )}
          <Sparkles className="absolute top-2 right-2 size-4 animate-pulse text-amber-400 motion-reduce:animate-none drop-shadow-md z-20" />
        </motion.div>
      </div>

      <div className="relative z-10">
        <p className={cn("text-base", HEADING, dark ? "text-orange-50" : "text-[#2a1002]")}>{title}</p>
        {hint && <p className={cn("mx-auto mt-1.5 max-w-[18rem] text-xs font-medium leading-relaxed", dark ? "text-orange-200/70" : "text-orange-900/70")}>{hint}</p>}
      </div>

      {actionLabel && (
        <div className="relative z-10 mt-6">
          {href ? <Link href={href} className={cta}>{actionLabel}</Link> : <button onClick={onAction} className={cta}>{actionLabel}</button>}
        </div>
      )}
      {children && <div className="relative z-10 mt-5">{children}</div>}
    </div>
  );
}

export function Shimmer({ className = "" }: { className?: string }) {
  return (
    <div className={cn("relative overflow-hidden rounded-2xl bg-orange-50 p-[1.5px]", className)}>
      <div className="relative h-full w-full overflow-hidden rounded-[14px] bg-white">
        <motion.div
          aria-hidden
          className="absolute inset-0 z-0 bg-gradient-to-r from-transparent via-orange-100/50 to-transparent"
          initial={{ x: "-100%" }}
          animate={{ x: "100%" }}
          transition={{ duration: 1.5, repeat: Infinity, ease: "linear" }}
        />
      </div>
    </div>
  );
}
export const Skeleton = Shimmer;

export function ErrorCard({ onRetry }: { onRetry: () => void }) {
  return (
    <Surface>
      <div className="flex flex-col items-center gap-3 py-10 text-center">
        <div className="flex size-11 items-center justify-center rounded-full border border-red-200 bg-red-50 text-red-600">
          <RefreshCw className="size-5" />
        </div>
        <div>
          <p className={cn("text-sm", HEADING)}>Failed to load data</p>
          <p className="mt-1 text-xs font-medium text-stone-500">Check your connection and try again.</p>
        </div>
        <button onClick={onRetry} className={cn(BTN, "mt-2 px-5 py-2")}>Retry</button>
      </div>
    </Surface>
  );
}

/* ========================================================================== */
/*  Misc Components                                                           */
/* ========================================================================== */

export function CardHead({ title, href, cta = "View all", dark }: { title: string; href?: string; cta?: string; dark?: boolean }) {
  return (
    <div className="mb-4 flex items-center justify-between gap-3">
      <h3 className={cn("truncate text-sm sm:text-base", HEADING)}>{title}</h3>
      {href && (
        <Link href={href} className={cn("rounded-md text-xs font-semibold transition", dark ? "text-orange-300 hover:text-orange-200" : "text-orange-600 hover:text-orange-700", FOCUS)}>
          {cta}
        </Link>
      )}
    </div>
  );
}

export function ChartCard({
  title, description, action, className, delay = 0, children, dark, image
}: { title: string; description?: string; action?: React.ReactNode; className?: string; delay?: number; children: React.ReactNode; dark?: boolean; image?: string }) {
  return (
    <Surface variant={dark ? "dark" : "light"} delay={delay} className={className} image={image}>
      <div className="mb-5 flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h3 className={cn("text-sm", HEADING)}>{title}</h3>
          {description && <p className="mt-1 text-[11px] font-medium text-stone-500">{description}</p>}
        </div>
        {action}
      </div>
      <div className="min-h-0 flex-1">{children}</div>
    </Surface>
  );
}

interface TipProps {
  active?: boolean;
  payload?: { name?: string; value?: number | string; color?: string; dataKey?: string | number; payload?: Record<string, unknown> }[];
  label?: string | number;
  labelFormatter?: (l: string) => string;
  valueSuffix?: string;
}
export function ChartTooltip({ active, payload, label, labelFormatter, valueSuffix = "" }: TipProps) {
  if (!active || !payload?.length) return null;
  const head = label !== undefined ? (labelFormatter ? labelFormatter(String(label)) : String(label)) : payload[0].name;
  return (
    <div className="min-w-[8rem] rounded-xl border border-orange-200 bg-white/95 px-3.5 py-2.5 text-stone-800 shadow-[0_8px_30px_rgb(0,0,0,0.08)] backdrop-blur-md">
      {head && <p className="mb-1.5 text-[11px] font-bold uppercase tracking-widest text-orange-600">{head}</p>}
      <div className="space-y-1">
        {payload.map((p, i) => (
          <p key={i} className="flex items-center gap-2 text-xs font-semibold tabular-nums">
            <span className="size-2 rounded-full" style={{ background: p.color ?? (p.payload?.fill as string) }} />
            {label !== undefined && p.name ? <span className="font-medium text-stone-500">{titleCase(String(p.name))}</span> : null}
            <span className="ml-auto pl-4 font-mono font-bold text-[#2a1002]">{Number(p.value).toLocaleString()}{valueSuffix}</span>
          </p>
        ))}
      </div>
    </div>
  );
}

const CHIP_LIGHT: Record<string, string> = {
  green: "bg-emerald-50 text-emerald-700 border-emerald-200",
  red: "bg-rose-50 text-rose-700 border-rose-200",
  amber: "bg-amber-50 text-amber-700 border-amber-200",
  orange: "bg-orange-50 text-orange-700 border-orange-200",
  stone: "bg-stone-50 text-stone-600 border-stone-200",
};
const CHIP_KIND: Record<string, string> = {
  accepted: "green", published: "green", completed: "green", active: "green", paid: "green", success: "green",
  declined: "red", failed: "red", cancelled: "red", canceled: "red", expired: "red",
  pending: "amber", processing: "amber", draft: "orange", archived: "stone",
};
export function StatusChip({ status }: { status: string }) {
  const kind = CHIP_KIND[status?.toLowerCase()] ?? "orange";
  return (
    <span className={cn("inline-flex shrink-0 items-center rounded-md border px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider", CHIP_LIGHT[kind])}>
      {titleCase(status)}
    </span>
  );
}

export type ProfileRow = { icon: React.ElementType; label: string; value: string; chip?: boolean };

export function useProfile(user: DashboardUser) {
  const { data: billing } = useSWR<Billing>("/user/dashboard/billing", fetcher);
  const { data: overview } = useSWR<Overview>("/user/dashboard/overview", fetcher);
  const sub = billing?.activeSubscription;
  const planName = sub?.plan_name || "Free Tier";
  const isFree = !!billing && !sub;
  const fullName = `${user.first_name} ${user.last_name || ""}`.trim();
  const memberSince = user.created_at
    ? new Date(user.created_at).toLocaleDateString("en-US", { month: "short", year: "numeric", timeZone: "UTC" })
    : null;
  const rows = [
    { icon: ShieldCheck, label: "Plan", value: planName, chip: true },
    memberSince && { icon: CalendarDays, label: "Member since", value: memberSince },
    overview?.planUsage && { icon: LayoutTemplate, label: "Simple templates", value: String(overview.planUsage.max_simple_templates) },
    overview?.planUsage && { icon: Crown, label: "Premium templates", value: String(overview.planUsage.max_premium_templates) },
    user.phone_number && { icon: Phone, label: "Phone", value: user.phone_number },
  ].filter(Boolean) as ProfileRow[];
  return { planName, isFree, fullName, rows };
}

export const ACTIVITY_STYLE: Record<ActivityItem["type"], { icon: React.ElementType; cls: string }> = {
  notification: { icon: Bell, cls: "bg-orange-50 text-orange-600 ring-orange-200" },
  rsvp: { icon: UserCheck, cls: "bg-emerald-50 text-emerald-600 ring-emerald-200" },
  order: { icon: Receipt, cls: "bg-amber-50 text-amber-600 ring-amber-200" },
};
const ACTIVITY_META: Record<ActivityItem["type"], { label: string; href: string; cta: string }> = {
  notification: { label: "Notification", href: "/dashboard/notifications", cta: "Open notifications" },
  rsvp: { label: "Guest reply", href: "/dashboard/rsvps", cta: "View RSVPs" },
  order: { label: "Payment", href: "/dashboard/billing", cta: "View billing" },
};

export function ActivitySheet({ item, onClose }: { item: ActivityItem | null; onClose: () => void }) {
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

  const s = item ? ACTIVITY_STYLE[item.type] ?? ACTIVITY_STYLE.notification : null;
  const m = item ? ACTIVITY_META[item.type] ?? ACTIVITY_META.notification : null;

  return createPortal(
    <AnimatePresence>
      {item && s && m && (
        <div className="fixed inset-0 z-[100] flex items-end justify-center sm:items-center sm:p-6">
          <motion.div
            key="backdrop"
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            onClick={onClose}
            className="absolute inset-0 bg-stone-900/20 backdrop-blur-sm"
          />
          <motion.div
            key="panel"
            role="dialog"
            aria-modal="true"
            aria-labelledby="activity-title"
            initial={{ opacity: 0, y: 70 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 70 }}
            transition={{ type: "spring", damping: 34, stiffness: 380 }}
            drag="y"
            dragControls={controls}
            dragListener={false}
            dragConstraints={{ top: 0, bottom: 0 }}
            dragElastic={{ top: 0, bottom: 0.6 }}
            onDragEnd={(_, info) => { if (info.offset.y > 110 || info.velocity.y > 600) onClose(); }}
            className="relative max-h-[88dvh] w-full overflow-y-auto overscroll-contain rounded-t-2xl border border-orange-100 bg-white p-5 pb-[calc(1.25rem+env(safe-area-inset-bottom))] text-[#2a1002] shadow-2xl sm:max-w-md sm:rounded-2xl sm:pb-5"
          >
            <div
              onPointerDown={(e) => controls.start(e)}
              className="-mt-2 mb-2 flex h-6 cursor-grab touch-none items-center justify-center sm:hidden"
              aria-hidden
            >
              <span className="h-1.5 w-10 rounded-full bg-orange-200" />
            </div>

            <div className="flex items-start justify-between gap-3">
              <div className="flex min-w-0 items-center gap-3">
                <span className={cn("flex size-10 shrink-0 items-center justify-center rounded-xl ring-1", s.cls)}>
                  <s.icon className="size-4" strokeWidth={1.75} />
                </span>
                <div className="min-w-0">
                  <p className="text-[11px] font-semibold uppercase tracking-wider text-orange-700">{m.label}</p>
                  <p className="flex items-center gap-1 text-xs text-stone-500"><Clock className="size-3" /> {timeAgo(item.created_at)}</p>
                </div>
              </div>
              <button
                ref={closeRef}
                onClick={onClose}
                aria-label="Close"
                className={cn("flex size-9 shrink-0 items-center justify-center rounded-full bg-stone-50 text-stone-500 transition hover:bg-stone-100 active:scale-95", FOCUS)}
              >
                <X className="size-4" />
              </button>
            </div>

            <h4 id="activity-title" className={cn("mt-4 text-xl", HEADING)}>{item.title}</h4>
            <p className="mt-2 whitespace-pre-line text-[15px] leading-relaxed text-stone-600">{item.message}</p>

            <p className="mt-4 rounded-lg border border-orange-100 bg-orange-50 px-3 py-2 font-mono text-xs text-orange-800/80">
              {new Date(item.created_at).toLocaleString("en-US", { dateStyle: "full", timeStyle: "short" })}
            </p>

            <Link href={m.href} onClick={onClose} className={cn("mt-4 flex w-full items-center justify-center gap-2 rounded-lg px-4 py-2.5 text-sm font-bold", BTN, FOCUS)}>
              {m.cta} <ArrowUpRight className="size-4" />
            </Link>
          </motion.div>
        </div>
      )}
    </AnimatePresence>,
    document.body,
  );
}