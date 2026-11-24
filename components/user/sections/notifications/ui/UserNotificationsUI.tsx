"use client";

import * as React from "react";
import { useEffect, useRef, useState } from "react";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { format, formatDistanceToNow } from "date-fns";
import { EASE, HEADING, Shimmer, cn } from "@/components/user/sections/dashboard/ui/DashboardUI";
import { FOCUS } from "@/components/user/navigation/UserSidebar";
import { Trash2 } from "lucide-react";
export { EASE };

/* ========================================================================== */
/*  Types + helpers                                                           */
/* ========================================================================== */

export type UserNotification = {
  id: string;
  title: string;
  message: string;
  is_read: boolean;
  created_at: string;
};

export type NotificationKind = "billing" | "invitation" | "account" | "system";

/** The table has no type column, so the kind is read from the text. */
export function resolveKind(title: string, message: string): NotificationKind {
  const t = `${title} ${message}`.toLowerCase();
  if (/(order|payment|paid|plan|subscription|purchase|receipt|refund)/.test(t)) return "billing";
  if (/(invitation|rsvp|guest|publish|event|template)/.test(t)) return "invitation";
  if (/(account|password|profile|login|email|phone|security)/.test(t)) return "account";
  return "system";
}

/* ========================================================================== */
/*  Design tokens (same language as billing + settings)                       */
/* ========================================================================== */

export const PAPER = "bg-gradient-to-br from-[#fffdfa] via-[#fff8f1] to-[#ffeddc]";
export const SURFACE =
  "bg-white ring-1 ring-black/[0.06] shadow-[0_1px_2px_rgba(28,20,16,0.04),0_12px_28px_-18px_rgba(28,20,16,0.22)]";

/** Soft light sweep on hover. Parent needs `group/card` and `relative overflow-hidden`. */
export function Sheen() {
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

export type IconProps = React.SVGProps<SVGSVGElement>;
export type IconType = (p: IconProps) => React.ReactElement;
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

export const IcBell = (p: IconProps) => (
  <Svg {...p}>
    <path d="M6 16.5V11a6 6 0 0 1 12 0v5.5l1.5 2h-15L6 16.5z" {...TINT} />
    <path d="M6 16.5V11a6 6 0 0 1 12 0v5.5l1.5 2h-15L6 16.5z" />
    <path d="M10 21h4" />
  </Svg>
);
export const IcBellOff = (p: IconProps) => (
  <Svg {...p}>
    <path d="M6 16.5V11a6 6 0 0 1 9.4-4.9M18 11v5.5l1.5 2H8" />
    <path d="M10 21h4" />
    <path d="M4 4l16 16" />
  </Svg>
);
export const IcReceipt = (p: IconProps) => (
  <Svg {...p}>
    <path d="M6 3.5h12v17l-2.5-1.7-2 1.7-1.5-1.7-1.5 1.7-2-1.7L6 20.5v-17z" {...TINT} />
    <path d="M6 3.5h12v17l-2.5-1.7-2 1.7-1.5-1.7-1.5 1.7-2-1.7L6 20.5v-17z" />
    <path d="M9 8.5h6M9 12h6" />
  </Svg>
);
export const IcEnvelope = (p: IconProps) => (
  <Svg {...p}>
    <rect x="3" y="5.5" width="18" height="13" rx="3.2" {...TINT} />
    <rect x="3" y="5.5" width="18" height="13" rx="3.2" />
    <path d="M3.8 8l8.2 6 8.2-6" />
  </Svg>
);
export const IcUser = (p: IconProps) => (
  <Svg {...p}>
    <circle cx="12" cy="8.5" r="3.8" {...TINT} />
    <circle cx="12" cy="8.5" r="3.8" />
    <path d="M4.5 20c.6-3.6 3.5-5.6 7.5-5.6s6.9 2 7.5 5.6" />
  </Svg>
);
export const IcCheck = (p: IconProps) => (
  <Svg strokeWidth={2.4} {...p}>
    <path d="M5 12.5l4.5 4.5L19 7.5" />
  </Svg>
);
export const IcCheckAll = (p: IconProps) => (
  <Svg strokeWidth={2.2} {...p}>
    <path d="M2.5 12.5l4.5 4.5L15 8.5" />
    <path d="M10.5 16.5l1 .9L21 8" />
  </Svg>
);

/** Black outline trash. Defaults to ink; pass a `text-*` class to override. */
export const IcTrash = ({ className, ...rest }: IconProps) => (
 <Trash2 size={12} strokeWidth={1} className="text-[#1c1410]" />
);
export const IcSearch = (p: IconProps) => (
  <Svg {...p}>
    <circle cx="11" cy="11" r="6.5" {...TINT} />
    <circle cx="11" cy="11" r="6.5" />
    <path d="M16 16l4.5 4.5" />
  </Svg>
);
export const IcX = (p: IconProps) => (
  <Svg strokeWidth={2} {...p}>
    <path d="M6 6l12 12M18 6L6 18" />
  </Svg>
);
export const IcChevronUp = (p: IconProps) => (
  <Svg strokeWidth={2} {...p}>
    <path d="M6 14.5l6-6 6 6" />
  </Svg>
);
export const IcChevronDown = (p: IconProps) => (
  <Svg strokeWidth={2} {...p}>
    <path d="M6 9.5l6 6 6-6" />
  </Svg>
);
export const IcChevronRight = (p: IconProps) => (
  <Svg strokeWidth={2} {...p}>
    <path d="M9.5 6l6 6-6 6" />
  </Svg>
);
export const IcClock = (p: IconProps) => (
  <Svg {...p}>
    <circle cx="12" cy="12" r="8.5" {...TINT} />
    <circle cx="12" cy="12" r="8.5" />
    <path d="M12 7.6V12l3 1.9" />
  </Svg>
);
export const IcCopy = (p: IconProps) => (
  <Svg {...p}>
    <rect x="8.5" y="8.5" width="11" height="11" rx="2.6" {...TINT} />
    <rect x="8.5" y="8.5" width="11" height="11" rx="2.6" />
    <path d="M15.5 8.5V6.6a2.1 2.1 0 0 0-2.1-2.1H6.6a2.1 2.1 0 0 0-2.1 2.1v6.8a2.1 2.1 0 0 0 2.1 2.1h1.9" />
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
export const IcSpinner = (p: IconProps) => (
  <Svg strokeWidth={2.2} {...p}>
    <path d="M12 3.5a8.5 8.5 0 1 0 8.5 8.5" />
  </Svg>
);

/* ========================================================================== */
/*  Kind tones: black icons, one small dot of colour that carries meaning     */
/* ========================================================================== */

export const KIND_TONES: Record<
  NotificationKind,
  { label: string; Icon: IconType; dot: string; bar: string }
> = {
  billing: { label: "Billing", Icon: IcReceipt, dot: "bg-emerald-500", bar: "bg-emerald-500" },
  invitation: { label: "Invitation", Icon: IcEnvelope, dot: "bg-amber-500", bar: "bg-amber-500" },
  account: { label: "Account", Icon: IcUser, dot: "bg-sky-500", bar: "bg-sky-500" },
  system: { label: "System", Icon: IcBell, dot: "bg-stone-400", bar: "bg-stone-400" },
};

/* ========================================================================== */
/*  Header (same pattern as the billing + settings hero)                      */
/* ========================================================================== */

export function NotificationsHeader({
  title,
  subtitle,
  actions,
  children,
}: {
  title: string;
  subtitle: string;
  actions?: React.ReactNode;
  children?: React.ReactNode;
}) {
  return (
    <motion.header
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.6, ease: EASE }}
      className="relative rounded-2xl ring-1 ring-black/[0.06] shadow-[0_1px_2px_rgba(28,20,16,0.04),0_12px_28px_-18px_rgba(28,20,16,0.22)] sm:rounded-3xl"
    >
      <div aria-hidden className="absolute inset-0 overflow-hidden rounded-[inherit]">
        <div
          className="absolute inset-0"
          style={{
            backgroundImage: "url(/home_hero_bg.png)",
            backgroundSize: "cover",
            backgroundPosition: "70% center",
          }}
        />
        <div className="absolute inset-0 bg-gradient-to-b from-[#fff8f2]/95 via-[#fff8f2]/70 to-[#fff8f2]/30 sm:bg-gradient-to-r sm:from-[#fff8f2]/95 sm:via-[#fff8f2]/65 sm:to-[#fff8f2]/10" />
      </div>

      <div className="relative z-10 flex flex-col gap-4 p-4 sm:flex-row sm:items-end sm:justify-between sm:gap-6 sm:p-7">
        <div className="min-w-0">
          <h1
            className={cn(
              HEADING,
              "text-[26px] leading-8 tracking-[-0.025em] text-[#1c1410] sm:text-4xl sm:leading-10",
            )}
          >
            {title}
          </h1>
          <p className="mt-1 max-w-xl text-[13px] font-medium leading-5 text-stone-600 sm:text-sm">{subtitle}</p>
          {children && <div className="mt-3 flex flex-wrap items-center gap-2">{children}</div>}
        </div>
        {actions && (
          <div className="flex flex-wrap gap-1.5 rounded-xl bg-white/80 p-1.5 shadow-sm ring-1 ring-white/80 backdrop-blur-md sm:shrink-0">
            {actions}
          </div>
        )}
      </div>
    </motion.header>
  );
}

export const INK_BTN =
  "inline-flex h-9 items-center justify-center gap-1.5 rounded-lg bg-[#1c1410] px-3 text-[13px] font-semibold text-white shadow-sm ring-1 ring-black/10 transition-colors hover:bg-neutral-800 active:scale-[0.98] disabled:opacity-60 sm:px-4 sm:text-sm";
export const GHOST_BTN =
  "inline-flex h-9 items-center justify-center gap-1.5 rounded-lg bg-white px-3 text-[13px] font-semibold text-[#1c1410] ring-1 ring-black/[0.08] transition-colors hover:bg-stone-50 active:scale-[0.98] disabled:opacity-60 sm:px-4 sm:text-sm";
export const DANGER_GHOST_BTN =
  "inline-flex h-9 items-center justify-center gap-1.5 rounded-lg bg-white px-3 text-[13px] font-semibold text-rose-600 ring-1 ring-rose-200 transition-colors hover:bg-rose-50 active:scale-[0.98] sm:px-4 sm:text-sm";

/* ========================================================================== */
/*  Chip, live badge, read progress, kind pill                                */
/* ========================================================================== */

export function Chip({ children, icon: Icon }: { children: React.ReactNode; icon?: IconType }) {
  return (
    <span className="inline-flex h-6 shrink-0 items-center gap-1.5 rounded-full bg-white/80 px-2.5 text-[11px] font-semibold text-stone-700 ring-1 ring-inset ring-black/[0.08] backdrop-blur">
      {Icon && <Icon className="size-3.5" />}
      {children}
    </span>
  );
}

export type LiveState = "connecting" | "live" | "offline";

export function LiveBadge({ state }: { state: LiveState }) {
  const reduce = useReducedMotion();
  const meta = {
    live: { dot: "bg-emerald-500", ping: true, label: "Live" },
    connecting: { dot: "bg-amber-400", ping: false, label: "Connecting" },
    offline: { dot: "bg-stone-300", ping: false, label: "Offline" },
  }[state];
  return (
    <span
      title="Real-time updates"
      className="inline-flex h-8 items-center gap-2 rounded-full bg-white px-3 text-xs font-semibold text-stone-600 ring-1 ring-black/[0.08]"
    >
      <span aria-hidden className="relative flex size-2">
        {meta.ping && !reduce && (
          <span className="absolute inline-flex size-full animate-ping rounded-full bg-emerald-400 opacity-60" />
        )}
        <span className={cn("relative inline-flex size-2 rounded-full", meta.dot)} />
      </span>
      {meta.label}
    </span>
  );
}

/** Slim progress pill: how much of the inbox has been read. */
export function ReadProgress({ read, total }: { read: number; total: number }) {
  const pct = total > 0 ? Math.round((read / total) * 100) : 0;
  return (
    <span
      title={`${read} of ${total} read`}
      className="inline-flex h-6 shrink-0 items-center gap-2 rounded-full bg-white/80 pl-2.5 pr-3 text-[11px] font-semibold tabular-nums text-stone-700 ring-1 ring-inset ring-black/[0.08] backdrop-blur"
    >
      <span className="relative h-1.5 w-14 overflow-hidden rounded-full bg-stone-200">
        <motion.span
          initial={false}
          animate={{ width: `${pct}%` }}
          transition={{ type: "spring", stiffness: 200, damping: 26 }}
          className="absolute inset-y-0 left-0 rounded-full bg-emerald-500"
        />
      </span>
      {pct}% read
    </span>
  );
}

/** Tiny label shown beside a row title on wider screens. */
export function KindPill({ kind }: { kind: NotificationKind }) {
  const tone = KIND_TONES[kind];
  return (
    <span className="hidden shrink-0 items-center gap-1 rounded-full bg-stone-50 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-stone-500 ring-1 ring-inset ring-black/[0.06] sm:inline-flex">
      <span className={cn("size-1 rounded-full", tone.dot)} />
      {tone.label}
    </span>
  );
}

/* ========================================================================== */
/*  Search highlight                                                          */
/* ========================================================================== */

export function Highlight({ text, query }: { text: string; query: string }) {
  const q = query.trim();
  if (!q) return <>{text}</>;
  const safe = q.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const parts = text.split(new RegExp(`(${safe})`, "ig"));
  return (
    <>
      {parts.map((p, i) =>
        p.toLowerCase() === q.toLowerCase() ? (
          <mark key={i} className="rounded bg-amber-200/70 px-0.5 text-inherit">
            {p}
          </mark>
        ) : (
          <span key={i}>{p}</span>
        ),
      )}
    </>
  );
}

/* ========================================================================== */
/*  Skeleton + empty state                                                    */
/* ========================================================================== */

export function NotificationRowSkeleton({ i = 0 }: { i?: number }) {
  return (
    <div
      className="flex gap-4 border-b border-black/[0.06] px-4 py-4 last:border-0 sm:px-5"
      style={{ opacity: 1 - i * 0.14 }}
      aria-hidden
    >
      <Shimmer className="size-11 shrink-0 rounded-xl" />
      <div className="flex-1 space-y-2.5 pt-1">
        <div className="flex items-center justify-between gap-6">
          <Shimmer className="h-4 w-1/3 rounded-md" />
          <Shimmer className="h-3 w-14 rounded-md" />
        </div>
        <Shimmer className="h-3.5 w-3/4 rounded-md" />
      </div>
    </div>
  );
}

export function EmptyState({
  filtered,
  unreadOnly,
  onClear,
}: {
  filtered: boolean;
  unreadOnly: boolean;
  onClear: () => void;
}) {
  const reduce = useReducedMotion();
  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, ease: EASE }}
      className={cn("flex flex-col items-center px-6 py-20 text-center", PAPER)}
    >
      <motion.div
        animate={reduce ? undefined : { y: [0, -5, 0] }}
        transition={{ duration: 3.2, repeat: Infinity, ease: "easeInOut" }}
        className="mb-5 grid size-16 place-items-center rounded-2xl bg-white text-[#1c1410] shadow-sm ring-1 ring-black/[0.08]"
      >
        {filtered ? <IcSearch className="size-7" /> : <IcBellOff className="size-7" />}
      </motion.div>
      <p className={cn(HEADING, "text-lg tracking-[-0.01em] text-[#1c1410]")}>
        {filtered ? "No matches" : unreadOnly ? "No unread notifications" : "You’re all caught up"}
      </p>
      <p className="mt-1 max-w-xs text-sm text-stone-600">
        {filtered
          ? "Try a different search or clear the filters."
          : "Payments, plan updates and guest activity will show up here as they happen."}
      </p>
      {filtered && (
        <button type="button" onClick={onClear} className={cn(GHOST_BTN, "mt-5", FOCUS)}>
          Clear filters
        </button>
      )}
    </motion.div>
  );
}

/* ========================================================================== */
/*  Detail modal                                                              */
/* ========================================================================== */

export function NotificationModal({
  notification,
  onClose,
  onPrev,
  onNext,
  position,
  onDelete,
}: {
  notification: UserNotification;
  onClose: () => void;
  onPrev?: () => void;
  onNext?: () => void;
  position?: { index: number; total: number };
  onDelete?: (id: string) => void;
}) {
  const kind = resolveKind(notification.title, notification.message);
  const tone = KIND_TONES[kind];
  const { Icon } = tone;
  const [copiedId, setCopiedId] = useState(false);
  const [copiedMsg, setCopiedMsg] = useState(false);
  const closeRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
      else if ((e.key === "ArrowDown" || e.key === "j") && onNext) {
        e.preventDefault();
        onNext();
      } else if ((e.key === "ArrowUp" || e.key === "k") && onPrev) {
        e.preventDefault();
        onPrev();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose, onNext, onPrev]);

  useEffect(() => {
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    closeRef.current?.focus();
    return () => {
      document.body.style.overflow = prev;
    };
  }, []);

  const copy = async (text: string, set: (v: boolean) => void) => {
    try {
      await navigator.clipboard.writeText(text);
      set(true);
      setTimeout(() => set(false), 1600);
    } catch {
      /* clipboard blocked */
    }
  };

  const created = new Date(notification.created_at);

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center p-0 sm:items-center sm:p-6">
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.2 }}
        onClick={onClose}
        className="absolute inset-0 cursor-pointer bg-[#1c1410]/50 backdrop-blur-md"
        aria-hidden
      />

      <motion.div
        role="dialog"
        aria-modal="true"
        aria-labelledby="notification-title"
        initial={{ opacity: 0, y: 40, scale: 0.97 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: 24, scale: 0.97 }}
        transition={{ type: "spring", stiffness: 380, damping: 32 }}
        className={cn(
          "relative z-10 w-full max-w-lg overflow-hidden rounded-t-[2rem] border border-black/[0.07] shadow-[0_40px_120px_-20px_rgba(28,20,16,0.45)] sm:rounded-[2rem]",
          PAPER,
        )}
      >
        {/* tone glow */}
        <div
          aria-hidden
          className={cn(
            "pointer-events-none absolute -right-20 -top-24 size-64 rounded-full opacity-[0.18] blur-3xl",
            tone.bar,
          )}
        />

        <div className="relative p-5 sm:p-8">
          <div className="mb-6 flex items-start justify-between gap-3">
            <div className="flex items-center gap-3.5">
              <motion.div
                initial={{ scale: 0.6, rotate: -12, opacity: 0 }}
                animate={{ scale: 1, rotate: 0, opacity: 1 }}
                transition={{ type: "spring", stiffness: 420, damping: 18, delay: 0.08 }}
                className="grid size-14 place-items-center rounded-2xl bg-white text-[#1c1410] shadow-sm ring-1 ring-black/[0.08]"
              >
                <Icon className="size-7" />
              </motion.div>
              <div className="flex flex-col gap-1.5">
                <span className="inline-flex w-fit items-center gap-1.5 rounded-full bg-white px-2.5 py-1 text-xs font-semibold text-[#1c1410] ring-1 ring-black/[0.08]">
                  <span className={cn("size-1.5 rounded-full", tone.dot)} />
                  {tone.label}
                </span>
                {position && (
                  <span className="text-xs font-medium tabular-nums text-stone-500">
                    {position.index + 1} of {position.total}
                  </span>
                )}
              </div>
            </div>

            <div className="flex items-center gap-1.5">
              {(onPrev || onNext) && (
                <div className="mr-1 flex overflow-hidden rounded-full bg-white shadow-sm ring-1 ring-black/[0.08]">
                  <button
                    type="button"
                    onClick={onPrev}
                    disabled={!onPrev}
                    aria-label="Previous notification"
                    className={cn(
                      "p-2 text-stone-500 transition-colors hover:bg-stone-50 hover:text-[#1c1410] disabled:cursor-not-allowed disabled:opacity-30",
                      FOCUS,
                    )}
                  >
                    <IcChevronUp className="size-4" />
                  </button>
                  <div className="my-1.5 w-px bg-black/10" />
                  <button
                    type="button"
                    onClick={onNext}
                    disabled={!onNext}
                    aria-label="Next notification"
                    className={cn(
                      "p-2 text-stone-500 transition-colors hover:bg-stone-50 hover:text-[#1c1410] disabled:cursor-not-allowed disabled:opacity-30",
                      FOCUS,
                    )}
                  >
                    <IcChevronDown className="size-4" />
                  </button>
                </div>
              )}
              <button
                ref={closeRef}
                type="button"
                onClick={onClose}
                aria-label="Close"
                className={cn(
                  "rounded-full bg-white p-2 text-stone-500 shadow-sm ring-1 ring-black/[0.08] transition-all hover:rotate-90 hover:text-[#1c1410]",
                  FOCUS,
                )}
              >
                <IcX className="size-4" />
              </button>
            </div>
          </div>

          <AnimatePresence mode="wait" initial={false}>
            <motion.div
              key={notification.id}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -6 }}
              transition={{ duration: 0.18 }}
            >
              <h2
                id="notification-title"
                className={cn(HEADING, "mb-2 text-2xl leading-tight tracking-[-0.02em] text-[#1c1410]")}
              >
                {notification.title}
              </h2>

              <div className="mb-5 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs font-medium text-stone-500">
                <span className="inline-flex items-center gap-1.5">
                  <IcClock className="size-3.5" />
                  {format(created, "MMM d, yyyy 'at' h:mm a")}
                </span>
                <span aria-hidden className="text-stone-300">
                  •
                </span>
                <span>{formatDistanceToNow(created, { addSuffix: true })}</span>
              </div>

              <div className="group/msg relative overflow-hidden rounded-2xl bg-white p-5 ring-1 ring-black/[0.06]">
                <div className={cn("absolute inset-y-0 left-0 w-1", tone.bar)} />
                <button
                  type="button"
                  onClick={() => copy(notification.message, setCopiedMsg)}
                  aria-label="Copy message"
                  title="Copy message"
                  className={cn(
                    "absolute right-3 top-3 rounded-full bg-white p-1.5 text-stone-400 opacity-0 shadow-sm ring-1 ring-black/[0.08] transition-all hover:text-[#1c1410] focus-visible:opacity-100 group-hover/msg:opacity-100",
                    FOCUS,
                  )}
                >
                  {copiedMsg ? <IcCheck className="size-3.5 text-emerald-600" /> : <IcCopy className="size-3.5" />}
                </button>
                <p className="max-h-64 overflow-y-auto whitespace-pre-wrap pl-2 pr-6 text-[15px] leading-relaxed text-stone-700">
                  {notification.message}
                </p>
              </div>
            </motion.div>
          </AnimatePresence>

          <div className="mt-5 flex items-center justify-between rounded-xl bg-white/70 px-4 py-3 ring-1 ring-black/[0.06]">
            <div className="flex items-center gap-2">
              <IcCheck className={cn("size-4", notification.is_read ? "text-emerald-600" : "text-stone-300")} />
              <span className="text-sm font-semibold text-stone-700">{notification.is_read ? "Read" : "Unread"}</span>
            </div>
            <button
              type="button"
              onClick={() => copy(notification.id, setCopiedId)}
              aria-label="Copy notification ID"
              className={cn(
                "group inline-flex items-center gap-1.5 rounded-md bg-white px-2 py-1 font-mono text-[11px] text-stone-500 ring-1 ring-black/[0.08] transition-colors hover:text-[#1c1410]",
                FOCUS,
              )}
            >
              {notification.id.split("-")[0]}
              {copiedId ? <IcCheck className="size-3 text-emerald-600" /> : <IcCopy className="size-3" />}
            </button>
          </div>

          <div className="mt-5 flex gap-3">
            {onDelete && (
              <button
                type="button"
                onClick={() => onDelete(notification.id)}
                title="Delete notification"
                aria-label="Delete notification"
                className={cn(
                  "flex items-center justify-center rounded-xl bg-white px-4 ring-1 ring-rose-200 transition-colors hover:bg-rose-50",
                  FOCUS,
                )}
              >
                <IcTrash className="size-5" />
              </button>
            )}
            <button
              type="button"
              onClick={onClose}
              className={cn(
                HEADING,
                "flex-1 rounded-xl bg-[#1c1410] py-3.5 text-sm text-white shadow-lg shadow-black/20 transition-all hover:-translate-y-0.5 hover:bg-neutral-800 active:translate-y-0",
                FOCUS,
              )}
            >
              Done
            </button>
          </div>

          {(onPrev || onNext) && (
            <p className="mt-3 hidden text-center text-[11px] text-stone-500 sm:block">
              Use <kbd className="rounded bg-white px-1 font-mono ring-1 ring-black/10">↑</kbd>{" "}
              <kbd className="rounded bg-white px-1 font-mono ring-1 ring-black/10">↓</kbd> to browse,{" "}
              <kbd className="rounded bg-white px-1 font-mono ring-1 ring-black/10">Esc</kbd> to close
            </p>
          )}
        </div>
      </motion.div>
    </div>
  );
}

/* ========================================================================== */
/*  Delete confirmation modal                                                 */
/* ========================================================================== */

export function DeleteNotificationModal({
  targetType,
  onClose,
  onConfirm,
  isDeleting,
}: {
  targetType: "single" | "all";
  onClose: () => void;
  onConfirm: () => Promise<void> | void;
  isDeleting: boolean;
}) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape" && !isDeleting) onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose, isDeleting]);

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 sm:p-6">
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={!isDeleting ? onClose : undefined}
        className={cn("absolute inset-0 bg-[#1c1410]/60 backdrop-blur-md", !isDeleting && "cursor-pointer")}
        aria-hidden
      />

      <motion.div
        role="alertdialog"
        aria-modal="true"
        aria-labelledby="delete-title"
        initial={{ opacity: 0, scale: 0.95, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 20 }}
        transition={{ type: "spring", stiffness: 400, damping: 32 }}
        className={cn(
          "relative z-10 w-full max-w-sm overflow-hidden rounded-[2rem] border border-black/[0.07] p-6 text-center shadow-2xl md:p-8",
          PAPER,
        )}
      >
        <div className="flex flex-col items-center">
          <motion.div
            initial={{ scale: 0.6, rotate: -14, opacity: 0 }}
            animate={{ scale: 1, rotate: 0, opacity: 1 }}
            transition={{ type: "spring", stiffness: 420, damping: 16, delay: 0.06 }}
            className="mb-5 grid size-16 place-items-center rounded-full bg-rose-100 shadow-inner ring-4 ring-rose-50"
          >
            <IcTrash className="size-8" />
          </motion.div>

          <h2 id="delete-title" className={cn(HEADING, "mb-2 text-xl tracking-[-0.01em] text-[#1c1410]")}>
            {targetType === "all" ? "Delete all notifications?" : "Delete notification?"}
          </h2>

          <p className="mb-6 text-sm text-stone-600">
            {targetType === "all"
              ? "This will permanently remove all your notification history. This action cannot be undone."
              : "This notification will be permanently removed. This action cannot be undone."}
          </p>

          <div className="flex w-full gap-3">
            <button
              type="button"
              onClick={onClose}
              disabled={isDeleting}
              className={cn(GHOST_BTN, "h-11 flex-1 rounded-xl", FOCUS)}
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={onConfirm}
              disabled={isDeleting}
              className={cn(
                "inline-flex h-11 flex-1 items-center justify-center gap-2 rounded-xl bg-rose-600 text-sm font-semibold text-white shadow-lg shadow-rose-600/25 transition-colors hover:bg-rose-700 disabled:cursor-not-allowed disabled:opacity-70",
                FOCUS,
              )}
            >
              {isDeleting ? (
                <IcSpinner className="size-4 animate-spin" />
              ) : (
                <IcTrash className="size-4 text-white" />
              )}
              Delete
            </button>
          </div>
        </div>
      </motion.div>
    </div>
  );
}