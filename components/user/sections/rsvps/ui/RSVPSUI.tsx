"use client";

import * as React from "react";
import Image from "next/image";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";

import { FOCUS } from "@/components/user/navigation/UserSidebar";
import {
  BTN,
  EASE,
  HEADING,
  Shimmer,
  cn,
  fmtDate,
} from "@/components/user/sections/dashboard/ui/DashboardUI";
import { AceternitySelect } from "@/components/ui/aceternity-select";

/* ========================================================================== */
/*  Design tokens                                                             */
/*  Same rules as the library page: solid white surfaces with a hairline      */
/*  ring, orange for brand actions, ink for selection, and colour only where  */
/*  it carries meaning (accepted / declined / pending). No tinted boxes.      */
/* ========================================================================== */

export const SURFACE =
  "bg-white ring-1 ring-black/[0.06] shadow-[0_1px_2px_rgba(28,20,16,0.04),0_12px_28px_-18px_rgba(28,20,16,0.22)]";
export const HAIRLINE = "border-black/[0.08]";

export const ART = {
  banner: "/home_hero_bg.png",
  empty: "/why-rsvp.png",
  noMatch: "/why-slugs.png",
  steps: ["/how-step-1.png", "/how-step-2.png", "/how-step-3.png", "/how-step-4.png"],
} as const;

/* ========================================================================== */
/*  Types                                                                     */
/* ========================================================================== */

export type AttendanceStatus = "pending" | "accepted" | "declined";
export type StatusFilterValue = "all" | AttendanceStatus;
export type GuestSort = "recent" | "name" | "seats";

export type InvitationSummary = {
  invitation_id: string;
  title: string;
  event_date: string;
  /** Optional "HH:mm" or ISO string. If missing, the time is read from event_date when it has one. */
  event_time?: string;
  invitation_status: string;
  total_guests: number;
  accepted: number;
  declined: number;
  pending: number;
  total_seats: number;
};

export type Guest = {
  id: string;
  guest_name: string;
  attendance_status: AttendanceStatus;
  number_of_guests: number;
  comment: string;
  created_at: string;
};

export type GuestPayload = {
  guest_name: string;
  attendance_status: AttendanceStatus;
  number_of_guests: number;
  comment?: string;
};

export type InvitationDetail = {
  invitation: { id: string; title: string; event_date: string };
  guests: Guest[];
};

export const STATUS_LABEL: Record<AttendanceStatus, string> = {
  pending: "Pending",
  accepted: "Accepted",
  declined: "Declined",
};

const STATUS_OPTIONS = [
  { label: "Pending", value: "pending" },
  { label: "Accepted", value: "accepted" },
  { label: "Declined", value: "declined" },
];

const STATUS_PILL: Record<AttendanceStatus, string> = {
  accepted: "bg-emerald-50 text-emerald-700 ring-emerald-600/20",
  declined: "bg-rose-50 text-rose-700 ring-rose-600/20",
  pending: "bg-amber-50 text-amber-700 ring-amber-600/20",
};
const STATUS_DOT: Record<AttendanceStatus, string> = {
  accepted: "bg-emerald-500",
  declined: "bg-rose-500",
  pending: "bg-amber-500",
};

/* ========================================================================== */
/*  Icon set: outline + soft 14% tint, 24px grid (same construction as the    */
/*  library icons)                                                            */
/* ========================================================================== */

type IconProps = React.SVGProps<SVGSVGElement>;
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

export const IcUsers = (p: IconProps) => (
  <Svg {...p}>
    <circle cx="9" cy="8.5" r="3.2" {...TINT} />
    <circle cx="9" cy="8.5" r="3.2" />
    <path d="M3 19.5c0-3.2 2.6-5.3 6-5.3s6 2.1 6 5.3" />
    <path d="M15.6 5.7a3 3 0 0 1 0 5.6M18 14.6c1.7.7 3 2.2 3 4.9" />
  </Svg>
);
export const IcCheckCircle = (p: IconProps) => (
  <Svg {...p}>
    <circle cx="12" cy="12" r="8.5" {...TINT} />
    <circle cx="12" cy="12" r="8.5" />
    <path d="M8.2 12.4l2.5 2.5 5-5.3" />
  </Svg>
);
export const IcHourglass = (p: IconProps) => (
  <Svg {...p}>
    <path d="M7.5 3.5h9v3.8L12 12l4.5 4.7v3.8h-9v-3.8L12 12 7.5 7.3V3.5z" {...TINT} />
    <path d="M6 3.5h12M6 20.5h12M7.5 3.5v3.8L12 12l-4.5 4.7v3.8M16.5 3.5v3.8L12 12l4.5 4.7v3.8" />
  </Svg>
);
export const IcTrend = (p: IconProps) => (
  <Svg {...p}>
    <path d="M3.5 18.5h17" />
    <path d="M4.5 15.5l5-5 3.5 3.5 6.5-7" />
    <path d="M15 7h4.5v4.5" />
  </Svg>
);
export const IcCalendar = (p: IconProps) => (
  <Svg {...p}>
    <rect x="3.5" y="5" width="17" height="15.5" rx="3.2" {...TINT} />
    <rect x="3.5" y="5" width="17" height="15.5" rx="3.2" />
    <path d="M3.5 10h17M8 3.2v3.6M16 3.2v3.6" />
    <circle cx="8.5" cy="14" r=".9" fill="currentColor" stroke="none" />
    <circle cx="12" cy="14" r=".9" fill="currentColor" stroke="none" />
    <circle cx="15.5" cy="14" r=".9" fill="currentColor" stroke="none" />
  </Svg>
);
export const IcClock = (p: IconProps) => (
  <Svg {...p}>
    <circle cx="12" cy="12" r="8.5" {...TINT} />
    <circle cx="12" cy="12" r="8.5" />
    <path d="M12 7.5V12l3 2" />
  </Svg>
);
export const IcSearch = (p: IconProps) => (
  <Svg {...p}>
    <circle cx="11" cy="11" r="6.5" {...TINT} />
    <circle cx="11" cy="11" r="6.5" />
    <path d="M16.2 16.2l4.3 4.3" />
  </Svg>
);
export const IcClose = (p: IconProps) => (
  <Svg strokeWidth={2} {...p}>
    <path d="M6 6l12 12M18 6L6 18" />
  </Svg>
);
export const IcPlus = (p: IconProps) => (
  <Svg strokeWidth={2.25} {...p}>
    <path d="M12 5v14M5 12h14" />
  </Svg>
);
export const IcArrowUpRight = (p: IconProps) => (
  <Svg strokeWidth={2} {...p}>
    <path d="M7 17L17 7M8.5 7H17v8.5" />
  </Svg>
);
export const IcArrowLeft = (p: IconProps) => (
  <Svg strokeWidth={2} {...p}>
    <path d="M19 12H5M11 6l-6 6 6 6" />
  </Svg>
);
export const IcChevronLeft = (p: IconProps) => (
  <Svg strokeWidth={2} {...p}>
    <path d="M14.5 6l-6 6 6 6" />
  </Svg>
);
export const IcChevronRight = (p: IconProps) => (
  <Svg strokeWidth={2} {...p}>
    <path d="M9.5 6l6 6-6 6" />
  </Svg>
);
export const IcChevronDown = (p: IconProps) => (
  <Svg strokeWidth={2} {...p}>
    <path d="M6 9.5l6 6 6-6" />
  </Svg>
);
export const IcDownload = (p: IconProps) => (
  <Svg {...p}>
    <path d="M12 4v11M7.5 10.5L12 15l4.5-4.5M5 19.5h14" />
  </Svg>
);
export const IcPencil = (p: IconProps) => (
  <Svg {...p}>
    <path d="M4.5 19.5l1-4L16 5a2.1 2.1 0 0 1 3 3L8.5 18.5l-4 1z" {...TINT} />
    <path d="M4.5 19.5l1-4L16 5a2.1 2.1 0 0 1 3 3L8.5 18.5l-4 1zM14 7l3 3" />
  </Svg>
);
export const IcTrash = (p: IconProps) => (
  <Svg {...p}>
    <path d="M6.5 7l.8 12c0 .6.5 1 1.1 1h7.2c.6 0 1.1-.4 1.1-1l.8-12z" {...TINT} />
    <path d="M4.5 7h15M9.5 7V4.8c0-.4.4-.8.8-.8h3.4c.4 0 .8.4.8.8V7M6.5 7l.8 12c0 .6.5 1 1.1 1h7.2c.6 0 1.1-.4 1.1-1l.8-12M10 11v5M14 11v5" />
  </Svg>
);
export const IcFile = (p: IconProps) => (
  <Svg {...p}>
    <path d="M7 3.5h7l4 4V19a1.5 1.5 0 0 1-1.5 1.5h-9A1.5 1.5 0 0 1 6 19V5a1.5 1.5 0 0 1 1-1.5z" {...TINT} />
    <path d="M7 3.5h7l4 4V19a1.5 1.5 0 0 1-1.5 1.5h-9A1.5 1.5 0 0 1 6 19V5a1.5 1.5 0 0 1 1-1.5zM14 3.5V8h4M9 13h6M9 16.5h4" />
  </Svg>
);
export const IcTable = (p: IconProps) => (
  <Svg {...p}>
    <rect x="3.5" y="4.5" width="17" height="15" rx="2.6" {...TINT} />
    <rect x="3.5" y="4.5" width="17" height="15" rx="2.6" />
    <path d="M3.5 9.5h17M3.5 14.5h17M9.5 4.5v15" />
  </Svg>
);
export const IcHelp = (p: IconProps) => (
  <Svg {...p}>
    <circle cx="12" cy="12" r="8.5" {...TINT} />
    <circle cx="12" cy="12" r="8.5" />
    <path d="M9.6 9.7a2.5 2.5 0 1 1 3.4 2.3c-.7.3-1 .8-1 1.5" />
    <circle cx="12" cy="16.6" r=".9" fill="currentColor" stroke="none" />
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
export const IcRefresh = (p: IconProps) => (
  <Svg {...p}>
    <path d="M19 8a7.5 7.5 0 0 0-13-1.5L4.5 8.5M4.5 4v4.5H9M5 16a7.5 7.5 0 0 0 13 1.5l1.5-2M19.5 20v-4.5H15" />
  </Svg>
);
export const IcSpinner = (p: IconProps) => (
  <Svg strokeWidth={2.25} {...p}>
    <path d="M12 3.5a8.5 8.5 0 1 0 8.5 8.5" />
  </Svg>
);
export const IcCheck = (p: IconProps) => (
  <Svg strokeWidth={2.4} {...p}>
    <path d="M5 12.5l4.5 4.5L19 7.5" />
  </Svg>
);
export const IcSparkle = (p: IconProps) => (
  <Svg {...p}>
    <path d="M10.5 4c.7 4.4 2.9 6.6 7.3 7.3-4.4.7-6.6 2.9-7.3 7.3-.7-4.4-2.9-6.6-7.3-7.3C7.6 10.6 9.8 8.4 10.5 4z" {...TINT} />
    <path d="M10.5 4c.7 4.4 2.9 6.6 7.3 7.3-4.4.7-6.6 2.9-7.3 7.3-.7-4.4-2.9-6.6-7.3-7.3C7.6 10.6 9.8 8.4 10.5 4z" />
    <path d="M19 3.5v3M17.5 5h3" />
  </Svg>
);
export const IcSend = (p: IconProps) => (
  <Svg {...p}>
    <path d="M20.5 3.5l-17 7 6.5 2.5 2.5 6.5 8-16z" {...TINT} />
    <path d="M20.5 3.5l-17 7 6.5 2.5 2.5 6.5 8-16zM10 13l4.5-4.5" />
  </Svg>
);

/* ========================================================================== */
/*  Hooks                                                                     */
/* ========================================================================== */

const FOCUSABLE =
  'a[href],button:not([disabled]),input:not([disabled]),textarea:not([disabled]),select:not([disabled]),[tabindex]:not([tabindex="-1"])';

/** Escape to close, scroll lock, Tab trap, focus restore. Re-runs only when `open` changes. */
function useModalBehavior(
  open: boolean,
  onClose: () => void,
  locked: boolean,
  containerRef: React.RefObject<HTMLElement | null>,
) {
  const closeRef = React.useRef(onClose);
  const lockedRef = React.useRef(locked);
  closeRef.current = onClose;
  lockedRef.current = locked;

  React.useEffect(() => {
    if (!open) return;
    const previouslyFocused = document.activeElement as HTMLElement | null;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape" && !lockedRef.current) {
        closeRef.current();
        return;
      }
      if (e.key !== "Tab") return;
      const root = containerRef.current;
      if (!root) return;
      const items = root.querySelectorAll<HTMLElement>(FOCUSABLE);
      if (items.length === 0) return;
      const first = items[0];
      const last = items[items.length - 1];
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
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = previousOverflow;
      previouslyFocused?.focus?.();
    };
  }, [open, containerRef]);
}

export function useDebouncedValue<T>(value: T, delay = 250) {
  const [debounced, setDebounced] = React.useState(value);
  React.useEffect(() => {
    const id = window.setTimeout(() => setDebounced(value), delay);
    return () => window.clearTimeout(id);
  }, [value, delay]);
  return debounced;
}

/* ========================================================================== */
/*  Page header                                                               */
/*  Hero image softened from the left, actions on a frosted tray. The image   */
/*  layer clips itself, so dropdowns in the tray are never cut off.           */
/* ========================================================================== */

export const SECONDARY_BTN =
  "inline-flex h-9 items-center justify-center gap-1.5 rounded-lg bg-neutral-900 px-3 text-[13px] font-semibold text-white shadow-sm ring-1 ring-black/10 transition-colors hover:bg-neutral-800 active:scale-[0.98] disabled:pointer-events-none disabled:opacity-50 sm:px-4 sm:text-sm";
export const GHOST_BTN =
  "inline-flex h-9 items-center justify-center gap-1.5 rounded-lg bg-white px-3 text-[13px] font-semibold text-[#1c1410] ring-1 ring-black/[0.08] transition-colors hover:bg-stone-50 active:scale-[0.98] sm:px-4 sm:text-sm";
export const PRIMARY_BTN = "h-9 rounded-lg px-3 text-[13px] shadow-sm sm:px-4 sm:text-sm";

export function PageHeader({
  title,
  subtitle,
  actions,
  back,
}: {
  title: React.ReactNode;
  subtitle: string;
  actions?: React.ReactNode;
  back?: { label: string; onClick: () => void };
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

      <div className="relative z-10">
        {back && (
          <button
            type="button"
            onClick={back.onClick}
            className={cn(
              "-ml-1 mb-3 inline-flex items-center gap-1.5 rounded-md px-1 py-0.5 text-[13px] font-semibold text-stone-600 transition-colors hover:text-[#1c1410]",
              FOCUS,
            )}
          >
            <IcArrowLeft className="size-4" />
            {back.label}
          </button>
        )}
        <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between sm:gap-6">
          <div className="min-w-0">
            <h1
              className={cn(
                HEADING,
                "break-words text-[26px] leading-8 tracking-[-0.025em] text-[#1c1410] sm:text-4xl sm:leading-10",
              )}
            >
              {title}
            </h1>
            <p className="mt-1 h-5 max-w-xl truncate text-[13px] font-medium leading-5 text-stone-600 sm:text-sm">
              {subtitle}
            </p>
          </div>
          {actions && (
            <div className="flex flex-wrap gap-1.5 rounded-xl bg-white/70 p-1.5 shadow-sm ring-1 ring-white/80 backdrop-blur-md sm:shrink-0">
              {actions}
            </div>
          )}
        </div>
      </div>
    </header>
  );
}

/* ========================================================================== */
/*  Stat strip                                                                */
/*  One panel split by hairlines. Fixed cell height, so the skeleton and the  */
/*  real thing are identical and every number sits on the same baseline.      */
/* ========================================================================== */

const STRIP = cn(
  "grid grid-cols-2 gap-px overflow-hidden rounded-2xl bg-black/[0.07] lg:grid-cols-4",
  "ring-1 ring-black/[0.06] shadow-[0_1px_2px_rgba(28,20,16,0.04),0_12px_28px_-18px_rgba(28,20,16,0.22)]",
);
const CELL =
  "relative flex h-[5.75rem] flex-col justify-between bg-white p-3 sm:h-[6.75rem] sm:p-4";

export type Stat = {
  label: string;
  icon: (p: IconProps) => React.ReactElement;
  iconClass: string;
  value: number;
  suffix?: string;
  hint: string;
  /** 0 to 100. Draws a thin progress line on the cell's bottom edge. */
  progress?: number;
  progressLabel?: string;
};

function CountUp({ value }: { value: number }) {
  const [n, setN] = React.useState(0);
  const from = React.useRef(0);

  React.useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      setN(value);
      from.current = value;
      return;
    }
    const start = performance.now();
    const base = from.current;
    let raf = 0;
    const tick = (t: number) => {
      const p = Math.min(1, (t - start) / 600);
      const eased = 1 - Math.pow(1 - p, 3);
      setN(Math.round(base + (value - base) * eased));
      if (p < 1) raf = requestAnimationFrame(tick);
      else from.current = value;
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [value]);

  return <>{n}</>;
}

export function StatStrip({ stats }: { stats: Stat[] }) {
  return (
    <dl className={STRIP}>
      {stats.map((s) => (
        <div key={s.label} className={CELL}>
          <dt className="flex items-center gap-1.5">
            <s.icon className={cn("size-4 shrink-0", s.iconClass)} />
            <span className="truncate text-[11px] font-semibold uppercase tracking-[0.06em] text-stone-500">
              {s.label}
            </span>
          </dt>
          <dd>
            <p
              className={cn(
                HEADING,
                "text-2xl leading-7 tracking-[-0.02em] tabular-nums text-[#1c1410] sm:text-3xl sm:leading-8",
              )}
            >
              <CountUp value={s.value} />
              {s.suffix}
            </p>
            <p className="mt-0.5 h-4 truncate text-[11px] leading-4 text-stone-500 sm:text-xs">{s.hint}</p>
          </dd>
          {s.progress !== undefined && (
            <div
              className="absolute inset-x-0 bottom-0 h-[3px] bg-orange-100"
              role="progressbar"
              aria-label={s.progressLabel ?? s.label}
              aria-valuemin={0}
              aria-valuemax={100}
              aria-valuenow={s.progress}
            >
              <div
                className="h-full bg-orange-500 transition-[width] duration-700 ease-out"
                style={{ width: `${s.progress}%` }}
              />
            </div>
          )}
        </div>
      ))}
    </dl>
  );
}

export function StatStripSkeleton() {
  return (
    <div className={STRIP} aria-hidden>
      {[0, 1, 2, 3].map((i) => (
        <div key={i} className={CELL}>
          <Shimmer className="h-4 w-28 rounded-md" />
          <div>
            <Shimmer className="h-7 w-12 rounded-md sm:h-8" />
            <Shimmer className="mt-1 h-4 w-24 rounded-md" />
          </div>
        </div>
      ))}
    </div>
  );
}

/* ========================================================================== */
/*  Toolbar controls                                                          */
/* ========================================================================== */

export function SearchField({
  value,
  onChange,
  placeholder,
  label,
  className,
}: {
  value: string;
  onChange: (v: string) => void;
  placeholder: string;
  label: string;
  className?: string;
}) {
  const inputRef = React.useRef<HTMLInputElement>(null);

  // Press "/" anywhere to jump into search.
  React.useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== "/" || e.metaKey || e.ctrlKey || e.altKey) return;
      const t = e.target as HTMLElement | null;
      if (t?.closest("input,textarea,select,[contenteditable='true']")) return;
      e.preventDefault();
      inputRef.current?.focus();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  return (
    <label className={cn("relative block min-w-0 flex-1", className)}>
      <span className="sr-only">{label}</span>
      <IcSearch
        aria-hidden
        className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-stone-400 sm:left-3.5"
      />
      <input
        ref={inputRef}
        type="search"
        value={value}
        maxLength={100}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className={cn(
          "h-10 w-full rounded-xl border bg-white pl-9 pr-9 text-[13px] font-medium text-[#1c1410] placeholder:text-stone-400 sm:h-11 sm:pl-10 sm:text-sm",
          HAIRLINE,
          "shadow-[0_1px_2px_rgba(28,20,16,0.04)] transition-colors hover:border-black/20 [&::-webkit-search-cancel-button]:hidden",
          FOCUS,
        )}
      />
      {value ? (
        <button
          type="button"
          onClick={() => onChange("")}
          aria-label="Clear search"
          className={cn(
            "absolute right-1.5 top-1/2 flex size-7 -translate-y-1/2 items-center justify-center rounded-full text-stone-400 transition hover:bg-stone-100 hover:text-stone-700",
            FOCUS,
          )}
        >
          <IcClose className="size-3.5" />
        </button>
      ) : (
        <kbd
          aria-hidden
          className="pointer-events-none absolute right-3 top-1/2 hidden -translate-y-1/2 rounded-md border border-black/10 bg-stone-50 px-1.5 py-px text-[10px] font-semibold text-stone-400 md:block"
        >
          /
        </kbd>
      )}
    </label>
  );
}

export type SegmentOption<T extends string> = { value: T; label: string; count?: number };

export function Segmented<T extends string>({
  label,
  value,
  options,
  onChange,
  className,
}: {
  label: string;
  value: T;
  options: SegmentOption<T>[];
  onChange: (v: T) => void;
  className?: string;
}) {
  const gid = React.useId();
  return (
    <div
      role="radiogroup"
      aria-label={label}
      className={cn(
        "inline-flex h-10 max-w-full items-stretch overflow-x-auto rounded-xl bg-black/[0.05] p-1 [scrollbar-width:none] sm:h-11",
        className,
      )}
    >
      {options.map((o) => {
        const active = o.value === value;
        return (
          <button
            key={o.value}
            type="button"
            role="radio"
            aria-checked={active}
            onClick={() => onChange(o.value)}
            className={cn(
              "relative flex shrink-0 items-center gap-1.5 rounded-lg px-2.5 text-xs font-semibold transition-colors sm:px-3 sm:text-[13px]",
              active ? "text-[#1c1410]" : "text-stone-500 hover:text-[#1c1410]",
              FOCUS,
            )}
          >
            {active && (
              <motion.span
                layoutId={`seg-${gid}`}
                className="absolute inset-0 rounded-lg bg-white shadow-[0_1px_2px_rgba(28,20,16,0.12)] ring-1 ring-black/[0.05]"
                transition={{ type: "spring", damping: 30, stiffness: 400 }}
              />
            )}
            <span className="relative">{o.label}</span>
            {o.count !== undefined && (
              <span
                className={cn(
                  "relative rounded-full px-1.5 text-[11px] font-bold tabular-nums",
                  active ? "bg-neutral-900 text-white" : "bg-black/[0.06] text-stone-500",
                )}
              >
                {o.count}
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
}

export function SelectField<T extends string | number>({
  label,
  value,
  options,
  onChange,
  className,
}: {
  label: string;
  value: T;
  options: { value: T; label: string }[];
  onChange: (v: T) => void;
  className?: string;
}) {
  const opts = React.useMemo(
    () => options.map((o) => ({ label: o.label, value: String(o.value) })),
    [options],
  );
  return (
    <div role="group" aria-label={label} className={cn("relative block", className)}>
      <AceternitySelect
        value={String(value)}
        options={opts}
        onChange={(raw) => {
          const match = options.find((o) => String(o.value) === raw);
          if (match) onChange(match.value);
        }}
        className={cn(
          "[&>button]:h-10 [&>button]:rounded-xl [&>button]:border-black/[0.08] [&>button]:bg-white [&>button]:px-3 [&>button]:py-0 [&>button]:text-[13px] [&>button]:font-semibold [&>button]:text-[#1c1410] [&>button]:shadow-[0_1px_2px_rgba(28,20,16,0.04)]",
          "hover:[&>button]:border-black/20 sm:[&>button]:h-11 sm:[&>button]:text-sm",
        )}
      />
    </div>
  );
}

export function ActiveFilters({
  chips,
  onClearAll,
}: {
  chips: { key: string; label: string; onRemove: () => void }[];
  onClearAll: () => void;
}) {
  if (chips.length === 0) return null;
  return (
    <div className="flex flex-wrap items-center gap-1.5 sm:gap-2">
      {chips.map((c) => (
        <button
          key={c.key}
          type="button"
          onClick={c.onRemove}
          aria-label={`Remove filter: ${c.label}`}
          className={cn(
            "group/chip inline-flex items-center gap-1.5 rounded-full border bg-white py-1 pl-2.5 pr-2 text-xs font-semibold text-[#1c1410] shadow-[0_1px_2px_rgba(28,20,16,0.04)] transition hover:border-black/20 sm:pl-3",
            HAIRLINE,
            FOCUS,
          )}
        >
          <span className="max-w-[10rem] truncate sm:max-w-[12rem]">{c.label}</span>
          <IcClose className="size-3 text-stone-400 group-hover/chip:text-stone-700" />
        </button>
      ))}
      <button
        type="button"
        onClick={onClearAll}
        className={cn(
          "rounded-md px-1.5 py-1 text-xs font-semibold text-stone-500 underline-offset-2 transition hover:text-[#1c1410] hover:underline",
          FOCUS,
        )}
      >
        Clear all
      </button>
    </div>
  );
}

/* ========================================================================== */
/*  Guest status pill + avatar                                                */
/* ========================================================================== */

export function GuestStatusPill({ status }: { status: AttendanceStatus }) {
  const key: AttendanceStatus = status in STATUS_LABEL ? status : "pending";
  return (
    <span
      className={cn(
        "inline-flex h-6 items-center gap-1.5 rounded-full px-2.5 text-xs font-semibold ring-1 ring-inset",
        STATUS_PILL[key],
      )}
    >
      <span className={cn("size-1.5 rounded-full", STATUS_DOT[key])} aria-hidden />
      {STATUS_LABEL[key]}
    </span>
  );
}

export function Avatar({ name }: { name: string }) {
  const initials =
    name
      .trim()
      .split(/\s+/)
      .slice(0, 2)
      .map((w) => Array.from(w)[0] ?? "")
      .join("")
      .toUpperCase() || "?";
  return (
    <span
      aria-hidden
      className="flex size-9 shrink-0 items-center justify-center rounded-full bg-stone-100 text-xs font-semibold text-stone-600 ring-1 ring-black/[0.05]"
    >
      {initials}
    </span>
  );
}

/* ========================================================================== */
/*  Invitation ticket                                                         */
/*  A perforated ticket per invitation. Replies are told apart by shape, not  */
/*  colour. Time and countdown tick every minute. Skeleton shares the heights.*/
/* ========================================================================== */

export const GRID_CLASS =
  "grid grid-cols-1 gap-3 min-[480px]:grid-cols-2 sm:gap-4 lg:grid-cols-3 xl:grid-cols-4";

/* Replies are told apart by shape, not colour. */
const BREAKDOWN = [
  { key: "accepted", label: "Accepted" },
  { key: "declined", label: "Declined" },
  { key: "pending", label: "Pending" },
] as const;

type ReplyKey = (typeof BREAKDOWN)[number]["key"];

function Mark({ kind, className }: { kind: ReplyKey; className?: string }) {
  const base = "relative inline-block shrink-0 rounded-full";
  if (kind === "accepted") return <span aria-hidden className={cn(base, "bg-[#1c1410]", className)} />;
  if (kind === "declined")
    return (
      <span aria-hidden className={cn(base, "overflow-hidden ring-[1.5px] ring-inset ring-[#1c1410]/70", className)}>
        <span className="absolute inset-x-0 top-1/2 h-[1.5px] -translate-y-1/2 -rotate-45 bg-[#1c1410]/70" />
      </span>
    );
  return <span aria-hidden className={cn(base, "border-[1.5px] border-dashed border-stone-400", className)} />;
}

const MAX_MARKS = 18;

/** Notches cut into both sides at the perforation (footer is h-14 = 3.5rem). */
const TICKET_MASK =
  "radial-gradient(circle 9px at 0 calc(100% - 3.5rem), #0000 97%, #000) left / 51% 100% no-repeat, radial-gradient(circle 9px at 100% calc(100% - 3.5rem), #0000 97%, #000) right / 51% 100% no-repeat";

/* ------------------------------ time helpers ------------------------------ */

/** Current time, refreshed every minute. Null on the server and first paint, so there is no hydration mismatch. */
function useNow(intervalMs = 60_000) {
  const [now, setNow] = React.useState<Date | null>(null);
  React.useEffect(() => {
    setNow(new Date());
    const id = window.setInterval(() => setNow(new Date()), intervalMs);
    return () => window.clearInterval(id);
  }, [intervalMs]);
  return now;
}

/** The event's start as a Date, plus whether a real time of day is known. */
function eventStart(date: string, explicit?: string): { at: Date; hasTime: boolean } | null {
  const base = new Date(date);
  if (Number.isNaN(base.getTime())) return null;

  if (explicit) {
    const hm = explicit.match(/^(\d{1,2}):(\d{2})/);
    if (hm) {
      const at = new Date(base.getFullYear(), base.getMonth(), base.getDate(), Number(hm[1]), Number(hm[2]));
      return { at, hasTime: true };
    }
    const iso = new Date(explicit);
    if (!Number.isNaN(iso.getTime())) return { at: iso, hasTime: true };
  }

  // A date-only value parses to midnight UTC, which would show a made-up time, so treat that as "no time".
  const midnightUtc = base.getUTCHours() === 0 && base.getUTCMinutes() === 0;
  const hasTime = /T\d{2}:\d{2}/.test(date) && !midnightUtc;
  const at = hasTime ? base : new Date(base.getFullYear(), base.getMonth(), base.getDate());
  return { at, hasTime };
}

const fmtClock = (d: Date) => d.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" });

type Countdown = { label: string; tone: "live" | "soon" | "later" | "past" };

function countdown(at: Date, now: Date, hasTime: boolean): Countdown {
  const start = at.getTime();
  const t = now.getTime();
  // Without a known time the event lasts the whole day, so "today" never shows as already over.
  const end = hasTime ? start : start + 86_400_000;

  if (t >= end) return { label: "Ended", tone: "past" };
  if (t >= start) return { label: hasTime ? "Happening now" : "Today", tone: "live" };

  const mins = Math.floor((start - t) / 60_000);
  const d = Math.floor(mins / 1440);
  const h = Math.floor((mins % 1440) / 60);
  const m = mins % 60;

  if (d >= 1) {
    return {
      label: hasTime ? `${d}d ${h}h left` : `${d} ${d === 1 ? "day" : "days"} left`,
      tone: d <= 2 ? "soon" : "later",
    };
  }
  if (!hasTime) return { label: "Tomorrow", tone: "soon" };
  if (h >= 1) return { label: `${h}h ${m}m left`, tone: "soon" };
  return { label: `${Math.max(1, m)}m left`, tone: "soon" };
}

/* --------------------------------- ticket --------------------------------- */

export function InvitationRSVPCard({
  invitation,
  index,
  onClick,
}: {
  invitation: InvitationSummary;
  index: number;
  onClick: () => void;
}) {
  const { total_guests, accepted, declined, pending, total_seats } = invitation;
  const reduce = useReducedMotion();
  const now = useNow();
  const total = accepted + declined + pending;
  const rate = total ? Math.round(((accepted + declined) / total) * 100) : 0;

  const start = React.useMemo(
    () => eventStart(invitation.event_date, invitation.event_time),
    [invitation.event_date, invitation.event_time],
  );
  const month = start ? start.at.toLocaleString("en-US", { month: "short" }).toUpperCase() : "";
  const day = start ? start.at.getDate() : "–";
  const weekday = start ? start.at.toLocaleString("en-US", { weekday: "short" }).toUpperCase() : "";
  const clock = start?.hasTime ? fmtClock(start.at) : null;
  const left = start && now ? countdown(start.at, now, start.hasTime) : null;

  // One mark per guest, grouped: accepted, declined, pending.
  const marks = React.useMemo(() => {
    const all: ReplyKey[] = [
      ...Array<ReplyKey>(accepted).fill("accepted"),
      ...Array<ReplyKey>(declined).fill("declined"),
      ...Array<ReplyKey>(pending).fill("pending"),
    ];
    return { shown: all.slice(0, MAX_MARKS), extra: Math.max(0, all.length - MAX_MARKS) };
  }, [accepted, declined, pending]);

  const footerText =
    total_guests === 0 ? "Waiting for the first reply" : pending > 0 ? `${pending} still to reply` : "Everyone has replied";

  const tonePill =
    left?.tone === "live"
      ? "bg-[#1c1410] text-white"
      : left?.tone === "soon"
        ? "bg-[#1c1410]/[0.09] text-[#1c1410]"
        : "bg-[#1c1410]/[0.05] text-stone-600";

  return (
    <motion.li
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay: Math.min(index, 8) * 0.035, ease: EASE }}
      className="group/card min-w-0 transition-transform duration-300 [filter:drop-shadow(0_1px_1px_rgba(28,20,16,0.08))_drop-shadow(0_14px_20px_rgba(28,20,16,0.10))] hover:-translate-y-1 hover:[filter:drop-shadow(0_1px_1px_rgba(28,20,16,0.10))_drop-shadow(0_22px_26px_rgba(28,20,16,0.16))]"
    >
      <button
        type="button"
        onClick={onClick}
        aria-label={`Open guest list for ${invitation.title}`}
        style={{ WebkitMask: TICKET_MASK, mask: TICKET_MASK }}
        className={cn(
          "relative flex h-full w-full flex-col overflow-hidden rounded-2xl border border-black/[0.07] text-left",
          "bg-gradient-to-br from-[#fffdfa] via-[#fff8f1] to-[#ffeddc]",
          FOCUS,
        )}
      >
        {/* soft sheen on hover */}
        <span
          aria-hidden
          className="pointer-events-none absolute inset-y-0 -left-1/2 w-1/2 -skew-x-12 bg-gradient-to-r from-transparent via-white/60 to-transparent opacity-0 transition-all duration-700 group-hover/card:left-full group-hover/card:opacity-100"
        />

        <div className="flex flex-1 flex-col p-4 sm:p-5">
          {/* date stub + title + time */}
          <div className="flex items-start gap-3.5">
            <div
              aria-hidden
              className="flex h-[4.25rem] w-14 shrink-0 flex-col items-center justify-center rounded-xl bg-[#1c1410] text-white shadow-[inset_0_1px_0_rgba(255,255,255,0.14)]"
            >
              <span className="text-[9px] font-semibold leading-3 tracking-[0.16em] text-white/50">{weekday}</span>
              <span className={cn(HEADING, "text-[26px] leading-7 tabular-nums tracking-[-0.03em]")}>{day}</span>
              <span className="text-[10px] font-semibold leading-3 tracking-[0.14em] text-white/60">{month}</span>
            </div>

            <div className="min-w-0 flex-1">
              <div className="flex items-start justify-between gap-2">
                <h3
                  className={cn(HEADING, "min-w-0 truncate text-base leading-6 tracking-[-0.01em] text-[#1c1410] sm:text-[17px]")}
                  title={invitation.title}
                >
                  {invitation.title}
                </h3>
                <span className="mt-0.5 shrink-0 rounded border border-[#1c1410]/20 px-1.5 text-[10px] font-semibold uppercase leading-4 tracking-[0.1em] text-[#1c1410]/80">
                  {invitation.invitation_status}
                </span>
              </div>

              <p className="mt-0.5 truncate text-xs leading-4 text-stone-500">{fmtDate(invitation.event_date)}</p>

              <div className="mt-1.5 flex h-6 items-center gap-2">
                <span className="inline-flex items-center gap-1 text-xs font-semibold tabular-nums text-[#1c1410]">
                  <IcClock className="size-3.5 text-stone-400" />
                  {clock ?? <span className="font-medium text-stone-400">Time not set</span>}
                </span>
                {left && (
                  <span
                    className={cn(
                      "inline-flex h-5 items-center gap-1 rounded-full px-2 text-[10px] font-bold uppercase leading-none tracking-[0.06em] tabular-nums",
                      tonePill,
                    )}
                  >
                    {left.tone === "live" && (
                      <span className="relative flex size-1.5">
                        {!reduce && <span className="absolute inline-flex size-full animate-ping rounded-full bg-white/70" />}
                        <span className="relative inline-flex size-1.5 rounded-full bg-white" />
                      </span>
                    )}
                    {left.label}
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* giant numeral + reply rate */}
          <div className="mt-5 flex items-end justify-between gap-3">
            <div className="min-w-0">
              <p className={cn(HEADING, "text-[56px] leading-[52px] tabular-nums tracking-[-0.05em] text-[#1c1410]")}>
                {total_seats}
              </p>
              <p className="mt-1.5 text-xs font-semibold uppercase leading-4 tracking-[0.12em] text-stone-500">
                {total_seats === 1 ? "seat" : "seats"} confirmed
              </p>
            </div>
            <div className="pb-0.5 text-right">
              <p className={cn(HEADING, "text-xl leading-6 tabular-nums text-[#1c1410]")}>{total ? `${rate}%` : "–"}</p>
              <p className="text-[10px] font-semibold uppercase leading-4 tracking-[0.12em] text-stone-400">replied</p>
            </div>
          </div>

          {/* one mark per guest */}
          <div
            role="img"
            aria-label={`${accepted} accepted, ${declined} declined, ${pending} pending`}
            className="mt-5 flex min-h-5 flex-wrap items-center gap-1.5"
          >
            {total === 0
              ? Array.from({ length: 8 }).map((_, i) => (
                  <span key={i} aria-hidden className="size-4 rounded-full border-[1.5px] border-dashed border-stone-300/80" />
                ))
              : marks.shown.map((kind, i) => (
                  <motion.span
                    key={i}
                    className="inline-flex"
                    initial={reduce ? false : { scale: 0, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    transition={{ type: "spring", stiffness: 520, damping: 24, delay: 0.12 + i * 0.025 }}
                  >
                    <Mark kind={kind} className="size-4" />
                  </motion.span>
                ))}
            {marks.extra > 0 && (
              <span className="ml-0.5 text-xs font-bold tabular-nums text-[#1c1410]/70">+{marks.extra}</span>
            )}
          </div>

          {/* legend: the same marks, with counts */}
          <dl className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1">
            {BREAKDOWN.map((b) => (
              <div key={b.key} className="flex items-center gap-1.5 text-xs">
                <Mark kind={b.key} className="size-2.5" />
                <dd className={cn("font-bold tabular-nums", invitation[b.key] > 0 ? "text-[#1c1410]" : "text-stone-400")}>
                  {invitation[b.key]}
                </dd>
                <dt className="font-medium text-stone-500">{b.label}</dt>
              </div>
            ))}
          </dl>
        </div>

        {/* perforated stub */}
        <div className="flex h-14 shrink-0 items-center justify-between gap-3 border-t border-dashed border-[#1c1410]/25 px-4 sm:px-5">
          <span
            className={cn("truncate text-xs", pending > 0 ? "font-semibold text-[#1c1410]" : "font-medium text-stone-500")}
          >
            {footerText}
          </span>
          <span className="inline-flex shrink-0 items-center gap-2 text-xs font-semibold text-[#1c1410]">
            View guests
            <span className="flex size-8 items-center justify-center rounded-full bg-[#1c1410]/[0.06] ring-1 ring-black/[0.06] transition-all duration-300 group-hover/card:bg-[#1c1410] group-hover/card:text-white">
              <IcArrowUpRight className="size-3.5 transition-transform duration-300 group-hover/card:rotate-45" />
            </span>
          </span>
        </div>
      </button>
    </motion.li>
  );
}

/** Same blocks and heights as the ticket above, so loading never shifts the layout. */
export function InvitationGridSkeleton({ count = 6 }: { count?: number }) {
  return (
    <ul className={GRID_CLASS} aria-hidden>
      {Array.from({ length: count }).map((_, i) => (
        <li key={i} className="min-w-0">
          <div className="flex h-full flex-col overflow-hidden rounded-2xl border border-black/[0.07] bg-gradient-to-br from-[#fffdfa] to-[#fff3e8]">
            <div className="flex flex-1 flex-col p-4 sm:p-5">
              <div className="flex items-start gap-3.5">
                <Shimmer className="h-[4.25rem] w-14 shrink-0 rounded-xl" />
                <div className="min-w-0 flex-1">
                  <Shimmer className="h-6 w-3/4 rounded-md" />
                  <Shimmer className="mt-0.5 h-4 w-1/2 rounded-md" />
                  <Shimmer className="mt-1.5 h-6 w-2/3 rounded-md" />
                </div>
              </div>
              <div className="mt-5 flex items-end justify-between">
                <div>
                  <Shimmer className="h-[52px] w-16 rounded-md" />
                  <Shimmer className="mt-1.5 h-4 w-28 rounded-md" />
                </div>
                <Shimmer className="h-10 w-12 rounded-md" />
              </div>
              <Shimmer className="mt-5 h-5 w-full rounded-full" />
              <Shimmer className="mt-3 h-4 w-3/4 rounded-md" />
            </div>
            <div className="flex h-14 items-center justify-between border-t border-dashed border-black/15 px-4 sm:px-5">
              <Shimmer className="h-4 w-28 rounded-md" />
              <Shimmer className="size-8 rounded-full" />
            </div>
          </div>
        </li>
      ))}
    </ul>
  );
}

/* ========================================================================== */
/*  Guest list pieces                                                         */
/* ========================================================================== */

export const LIST_SURFACE = cn("overflow-hidden rounded-2xl", SURFACE);
export const ROW_H = "h-16";

export function IconButton({
  label,
  onClick,
  disabled,
  danger,
  children,
}: {
  label: string;
  onClick: () => void;
  disabled?: boolean;
  danger?: boolean;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      aria-label={label}
      title={label}
      className={cn(
        "flex size-9 items-center justify-center rounded-lg text-stone-500 transition-colors disabled:cursor-not-allowed disabled:opacity-40",
        danger ? "hover:bg-rose-50 hover:text-rose-600" : "hover:bg-stone-100 hover:text-[#1c1410]",
        FOCUS,
      )}
    >
      {children}
    </button>
  );
}

export function SavingBadge() {
  return (
    <span className="ml-2 inline-flex items-center gap-1 text-[11px] font-medium text-stone-400">
      <IcSpinner className="size-3 animate-spin" />
      Saving
    </span>
  );
}

export function GuestListSkeleton({ rows = 6 }: { rows?: number }) {
  return (
    <div className={LIST_SURFACE} aria-hidden>
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} className={cn("flex items-center gap-3 px-4 sm:px-5", ROW_H, i > 0 && "border-t border-black/[0.06]")}>
          <Shimmer className="size-9 shrink-0 rounded-full" />
          <div className="min-w-0 flex-1 space-y-1.5">
            <Shimmer className="h-4 w-40 rounded-md" />
            <Shimmer className="h-3 w-24 rounded-md" />
          </div>
          <Shimmer className="h-6 w-20 rounded-full" />
        </div>
      ))}
    </div>
  );
}

function pageWindow(page: number, total: number): (number | "gap-l" | "gap-r")[] {
  if (total <= 7) return Array.from({ length: total }, (_, i) => i + 1);
  const keep = new Set<number>([1, total, page - 1, page, page + 1]);
  const sorted = [...keep].filter((n) => n >= 1 && n <= total).sort((a, b) => a - b);
  const out: (number | "gap-l" | "gap-r")[] = [];
  sorted.forEach((n, i) => {
    const prev = sorted[i - 1];
    if (prev !== undefined && n - prev > 1) out.push(i < sorted.length / 2 ? "gap-l" : "gap-r");
    out.push(n);
  });
  return out;
}

export function Pagination({
  page,
  pageSize,
  total,
  shown,
  noun,
  onPage,
}: {
  page: number;
  pageSize: number;
  total: number;
  shown: number;
  noun: string;
  onPage: (p: number) => void;
}) {
  if (total === 0) return null;
  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  const from = (page - 1) * pageSize + 1;
  const to = from + shown - 1;
  const pages = pageWindow(page, totalPages);

  const step = cn(
    "flex size-9 items-center justify-center rounded-lg border bg-white text-stone-600 transition hover:border-black/20 hover:bg-stone-50 hover:text-[#1c1410] active:scale-95 disabled:pointer-events-none disabled:opacity-40",
    HAIRLINE,
  );

  return (
    <nav aria-label="Pages" className="flex min-h-9 flex-col items-center justify-between gap-3 sm:flex-row">
      <p className="text-xs font-medium text-stone-500" aria-live="polite">
        Showing{" "}
        <span className="font-semibold tabular-nums text-[#1c1410]">
          {from}–{to}
        </span>{" "}
        of <span className="font-semibold tabular-nums text-[#1c1410]">{total}</span> {noun}
        {total === 1 ? "" : "s"}
      </p>
      {totalPages > 1 && (
        <div className="flex items-center gap-1.5">
          <button type="button" onClick={() => onPage(page - 1)} disabled={page <= 1} aria-label="Previous page" className={cn(step, FOCUS)}>
            <IcChevronLeft className="size-4" />
          </button>
          {pages.map((p) =>
            typeof p === "string" ? (
              <span key={p} aria-hidden className="w-5 text-center text-sm text-stone-400">
                …
              </span>
            ) : (
              <button
                key={p}
                type="button"
                onClick={() => onPage(p)}
                aria-label={`Page ${p}`}
                aria-current={p === page ? "page" : undefined}
                className={cn(
                  "h-9 min-w-9 rounded-lg px-2 text-sm font-semibold tabular-nums transition active:scale-95",
                  p === page
                    ? "bg-neutral-900 text-white shadow-sm"
                    : cn("border bg-white text-stone-600 hover:border-black/20 hover:bg-stone-50 hover:text-[#1c1410]", HAIRLINE),
                  FOCUS,
                )}
              >
                {p}
              </button>
            ),
          )}
          <button type="button" onClick={() => onPage(page + 1)} disabled={page >= totalPages} aria-label="Next page" className={cn(step, FOCUS)}>
            <IcChevronRight className="size-4" />
          </button>
        </div>
      )}
    </nav>
  );
}

/* ========================================================================== */
/*  Inline error + toast                                                      */
/* ========================================================================== */

export function InlineError({ message, onDismiss }: { message: string; onDismiss: () => void }) {
  return (
    <div
      role="alert"
      className="flex items-center gap-3 rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700"
    >
      <IcAlert className="size-4 shrink-0" />
      <span className="flex-1 font-medium">{message}</span>
      <button type="button" onClick={onDismiss} className={cn("rounded-md font-semibold underline-offset-2 hover:underline", FOCUS)}>
        Dismiss
      </button>
    </div>
  );
}

export type ToastState = { id: number; message: string; tone: "success" | "error" } | null;

export function Toast({ toast, onDismiss }: { toast: ToastState; onDismiss: () => void }) {
  React.useEffect(() => {
    if (!toast) return;
    const t = window.setTimeout(onDismiss, 3500);
    return () => window.clearTimeout(t);
  }, [toast, onDismiss]);

  return (
    <div className="pointer-events-none fixed inset-x-0 bottom-4 z-[120] flex justify-center px-4">
      <AnimatePresence>
        {toast && (
          <motion.div
            key={toast.id}
            role="status"
            aria-live="polite"
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 16 }}
            className="pointer-events-auto flex items-center gap-2.5 rounded-xl bg-neutral-900 px-4 py-3 text-sm font-medium text-white shadow-xl"
          >
            {toast.tone === "success" ? (
              <IcCheckCircle className="size-4 shrink-0 text-emerald-400" />
            ) : (
              <IcAlert className="size-4 shrink-0 text-rose-400" />
            )}
            {toast.message}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

/* ========================================================================== */
/*  Modals                                                                    */
/* ========================================================================== */

const SHEET =
  "relative w-full overflow-hidden rounded-t-3xl bg-white text-[#1c1410] shadow-2xl ring-1 ring-black/[0.06] sm:rounded-3xl";

const fieldClass = cn(
  "w-full rounded-xl border bg-white px-3.5 text-sm font-medium text-[#1c1410]",
  HAIRLINE,
  "placeholder:font-normal placeholder:text-stone-400 transition-colors hover:border-black/20 disabled:cursor-not-allowed disabled:bg-stone-50 disabled:text-stone-500",
  FOCUS,
);
const labelClass = "mb-1.5 block text-[13px] font-semibold text-[#1c1410]";

function Backdrop({ onClick }: { onClick: () => void }) {
  return <div className="absolute inset-0 bg-stone-950/40 backdrop-blur-sm" onClick={onClick} aria-hidden />;
}

const COMMENT_MAX = 500;

export function GuestModal({
  open,
  guest,
  onClose,
  onSubmit,
}: {
  open: boolean;
  guest?: Guest | null;
  onClose: () => void;
  onSubmit: (payload: GuestPayload) => Promise<void>;
}) {
  const isEdit = Boolean(guest);
  const uid = React.useId();
  const nameRef = React.useRef<HTMLInputElement>(null);
  const dialogRef = React.useRef<HTMLDivElement>(null);

  const [name, setName] = React.useState("");
  const [status, setStatus] = React.useState<AttendanceStatus>("pending");
  const [seats, setSeats] = React.useState("1");
  const [comment, setComment] = React.useState("");
  const [submitting, setSubmitting] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [touched, setTouched] = React.useState(false);

  useModalBehavior(open, onClose, submitting, dialogRef);

  React.useEffect(() => {
    if (!open) return;
    setName(guest?.guest_name ?? "");
    setStatus(guest?.attendance_status ?? "pending");
    setSeats(String(guest?.number_of_guests ?? 1));
    setComment(guest?.comment ?? "");
    setError(null);
    setTouched(false);
    setSubmitting(false);
    const t = window.setTimeout(() => nameRef.current?.focus(), 100);
    return () => window.clearTimeout(t);
  }, [open, guest]);

  const seatsNum = Number(seats);
  const nameInvalid = name.trim().length === 0;
  const seatsInvalid = !Number.isInteger(seatsNum) || seatsNum < 1;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setTouched(true);
    setError(null);
    if (nameInvalid || seatsInvalid) return;
    setSubmitting(true);
    try {
      const trimmed = comment.trim();
      await onSubmit({
        guest_name: name.trim(),
        attendance_status: status,
        number_of_guests: seatsNum,
        // When editing, always send the comment so it can be cleared.
        ...(trimmed || isEdit ? { comment: trimmed } : {}),
      });
    } catch (err) {
      setError(err instanceof Error && err.message ? err.message : "Could not save this guest. Please try again.");
      setSubmitting(false);
    }
  }

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          className="fixed inset-0 z-[100] flex items-end justify-center sm:items-center sm:p-4"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.15 }}
        >
          <Backdrop onClick={() => !submitting && onClose()} />
          <motion.div
            ref={dialogRef}
            role="dialog"
            aria-modal="true"
            aria-labelledby={`${uid}-title`}
            className={cn(SHEET, "max-h-[92dvh] max-w-md overflow-y-auto")}
            initial={{ opacity: 0, y: 40, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 40, scale: 0.98 }}
            transition={{ type: "spring", stiffness: 380, damping: 32 }}
          >
            <div className="flex items-center justify-between border-b border-black/[0.06] px-5 py-4 sm:px-6">
              <h2 id={`${uid}-title`} className={cn(HEADING, "text-lg tracking-[-0.01em]")}>
                {isEdit ? "Edit guest" : "Add a guest"}
              </h2>
              <button
                type="button"
                onClick={onClose}
                disabled={submitting}
                aria-label="Close"
                className={cn("flex size-9 items-center justify-center rounded-full text-stone-500 transition hover:bg-stone-100 hover:text-[#1c1410] disabled:opacity-50", FOCUS)}
              >
                <IcClose className="size-4" />
              </button>
            </div>

            <form onSubmit={handleSubmit} noValidate className="space-y-4 px-5 py-5 sm:px-6">
              {error && (
                <div role="alert" className="flex items-start gap-2.5 rounded-xl border border-rose-200 bg-rose-50 px-3.5 py-3 text-sm text-rose-700">
                  <IcAlert className="mt-0.5 size-4 shrink-0" />
                  <span>{error}</span>
                </div>
              )}

              <div>
                <label htmlFor={`${uid}-name`} className={labelClass}>
                  Name
                </label>
                <input
                  id={`${uid}-name`}
                  ref={nameRef}
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  disabled={submitting}
                  placeholder="e.g. Ayesha Khan"
                  maxLength={120}
                  autoComplete="off"
                  aria-invalid={touched && nameInvalid}
                  aria-describedby={touched && nameInvalid ? `${uid}-name-err` : undefined}
                  className={cn(fieldClass, "h-11", touched && nameInvalid && "border-rose-400")}
                />
                {touched && nameInvalid && (
                  <p id={`${uid}-name-err`} className="mt-1.5 text-xs text-rose-600">
                    Enter the guest&apos;s name.
                  </p>
                )}
              </div>

              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div>
                  <span className={labelClass}>Status</span>
                  <AceternitySelect
                    value={status}
                    onChange={(val) => setStatus(val as AttendanceStatus)}
                    options={STATUS_OPTIONS}
                    disabled={submitting}
                    className="[&>button]:h-11 [&>button]:rounded-xl [&>button]:border-black/[0.08] [&>button]:text-sm [&>button]:font-medium [&>button]:text-[#1c1410]"
                  />
                </div>
                <div>
                  <label htmlFor={`${uid}-seats`} className={labelClass}>
                    Seats
                  </label>
                  <input
                    id={`${uid}-seats`}
                    type="number"
                    inputMode="numeric"
                    min={1}
                    step={1}
                    value={seats}
                    onChange={(e) => setSeats(e.target.value)}
                    disabled={submitting}
                    aria-invalid={touched && seatsInvalid}
                    aria-describedby={touched && seatsInvalid ? `${uid}-seats-err` : undefined}
                    className={cn(fieldClass, "h-11", touched && seatsInvalid && "border-rose-400")}
                  />
                  {touched && seatsInvalid && (
                    <p id={`${uid}-seats-err`} className="mt-1.5 text-xs text-rose-600">
                      Use a whole number, 1 or more.
                    </p>
                  )}
                </div>
              </div>

              <div>
                <div className="mb-1.5 flex items-baseline justify-between">
                  <label htmlFor={`${uid}-comment`} className="text-[13px] font-semibold text-[#1c1410]">
                    Note <span className="font-normal text-stone-400">(optional)</span>
                  </label>
                  <span className="text-[11px] tabular-nums text-stone-400" aria-hidden>
                    {comment.length}/{COMMENT_MAX}
                  </span>
                </div>
                <textarea
                  id={`${uid}-comment`}
                  rows={3}
                  value={comment}
                  onChange={(e) => setComment(e.target.value.slice(0, COMMENT_MAX))}
                  disabled={submitting}
                  placeholder="Dietary needs, a message for the host"
                  className={cn(fieldClass, "resize-none py-2.5")}
                />
              </div>

              <div className="flex flex-col-reverse gap-2 pt-1 sm:flex-row sm:justify-end">
                <button type="button" onClick={onClose} disabled={submitting} className={cn(GHOST_BTN, "h-11 rounded-xl px-4 disabled:opacity-50", FOCUS)}>
                  Cancel
                </button>
                <button type="submit" disabled={submitting} className={cn(BTN, "h-11 rounded-xl px-5 text-sm disabled:opacity-50", FOCUS)}>
                  {submitting && <IcSpinner className="mr-2 size-4 animate-spin" />}
                  {submitting ? "Saving…" : isEdit ? "Save changes" : "Add guest"}
                </button>
              </div>
            </form>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

export function ConfirmDialog({
  open,
  title,
  body,
  confirmLabel,
  onConfirm,
  onCancel,
}: {
  open: boolean;
  title: string;
  body: string;
  confirmLabel: string;
  onConfirm: () => void;
  onCancel: () => void;
}) {
  const uid = React.useId();
  const dialogRef = React.useRef<HTMLDivElement>(null);
  const cancelRef = React.useRef<HTMLButtonElement>(null);

  useModalBehavior(open, onCancel, false, dialogRef);

  React.useEffect(() => {
    if (!open) return;
    const t = window.setTimeout(() => cancelRef.current?.focus(), 80);
    return () => window.clearTimeout(t);
  }, [open]);

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          className="fixed inset-0 z-[110] flex items-center justify-center p-4"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.15 }}
        >
          <Backdrop onClick={onCancel} />
          <motion.div
            ref={dialogRef}
            role="alertdialog"
            aria-modal="true"
            aria-labelledby={`${uid}-title`}
            aria-describedby={`${uid}-body`}
            className={cn(SHEET, "max-w-sm rounded-3xl p-6")}
            initial={{ opacity: 0, y: 16, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 16, scale: 0.97 }}
            transition={{ type: "spring", stiffness: 420, damping: 32 }}
          >
            <h2 id={`${uid}-title`} className={cn(HEADING, "text-lg tracking-[-0.01em]")}>
              {title}
            </h2>
            <p id={`${uid}-body`} className="mt-1.5 text-sm leading-relaxed text-stone-600">
              {body}
            </p>
            <div className="mt-6 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
              <button ref={cancelRef} type="button" onClick={onCancel} className={cn(GHOST_BTN, "h-10 rounded-xl px-4", FOCUS)}>
                Cancel
              </button>
              <button
                type="button"
                onClick={onConfirm}
                className={cn("inline-flex h-10 items-center justify-center rounded-xl bg-rose-600 px-4 text-sm font-semibold text-white transition hover:bg-rose-700", FOCUS)}
              >
                {confirmLabel}
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

/* ========================================================================== */
/*  Guide                                                                     */
/*  Uses the /public/how-step-N.png artwork. Hero and text block have fixed   */
/*  heights, so nothing jumps between steps. Falls back to a plain icon panel */
/*  if an image fails to load.                                                */
/* ========================================================================== */

export type GuideStep = {
  icon: (p: IconProps) => React.ReactElement;
  title: string;
  body: string;
  image?: string;
};

/** Order matches how-step-1 to how-step-4. Edit the copy or swap images here. */
export const GUIDE_STEPS: GuideStep[] = [
  {
    icon: IcSparkle,
    title: "Create your invitation",
    body: "Pick a template from your library and start an invitation in a few clicks.",
    image: ART.steps[0],
  },
  {
    icon: IcPencil,
    title: "Make it yours",
    body: "Add your event details, wording and photos, then preview exactly what guests will see.",
    image: ART.steps[1],
  },
  {
    icon: IcSend,
    title: "Share the link",
    body: "Publish it and send the link on WhatsApp, SMS or email. Guests accept or decline and say how many seats they need.",
    image: ART.steps[2],
  },
  {
    icon: IcUsers,
    title: "Track replies here",
    body: "Every reply shows up on this page. Add guests who answered offline, fix seats, then export the list for your caterer or venue.",
    image: ART.steps[3],
  },
];

export function GuideModal({
  open,
  onClose,
  steps = GUIDE_STEPS,
}: {
  open: boolean;
  onClose: () => void;
  steps?: GuideStep[];
}) {
  const uid = React.useId();
  const dialogRef = React.useRef<HTMLDivElement>(null);
  const [index, setIndex] = React.useState(0);
  const [failed, setFailed] = React.useState<Record<number, boolean>>({});

  useModalBehavior(open, onClose, false, dialogRef);
  React.useEffect(() => {
    if (open) setIndex(0);
  }, [open]);

  const step = steps[index];
  const Icon = step.icon;
  const last = index === steps.length - 1;

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          className="fixed inset-0 z-[110] flex items-end justify-center sm:items-center sm:p-4"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.15 }}
        >
          <Backdrop onClick={onClose} />
          <motion.div
            ref={dialogRef}
            role="dialog"
            aria-modal="true"
            aria-labelledby={`${uid}-title`}
            className={cn(SHEET, "max-w-lg")}
            initial={{ opacity: 0, y: 40, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 40, scale: 0.98 }}
            transition={{ type: "spring", stiffness: 380, damping: 32 }}
          >
            <button
              type="button"
              onClick={onClose}
              aria-label="Close guide"
              className={cn("absolute right-3 top-3 z-10 flex size-9 items-center justify-center rounded-full bg-white/85 text-stone-600 shadow-sm ring-1 ring-black/[0.06] backdrop-blur transition hover:bg-white hover:text-[#1c1410]", FOCUS)}
            >
              <IcClose className="size-4" />
            </button>

            <div className="relative h-44 overflow-hidden bg-gradient-to-br from-orange-50 via-amber-50 to-rose-50 sm:h-56">
              {step.image && !failed[index] ? (
                <Image
                  key={step.image}
                  src={step.image}
                  alt=""
                  fill
                  unoptimized
                  sizes="(min-width: 640px) 512px, 100vw"
                  className="object-cover"
                  onError={() => setFailed((f) => ({ ...f, [index]: true }))}
                />
              ) : (
                <div className="flex h-full items-center justify-center">
                  <span className="flex size-16 items-center justify-center rounded-2xl bg-white text-orange-600 shadow-md ring-1 ring-black/[0.06]">
                    <Icon className="size-8" />
                  </span>
                </div>
              )}
              <div aria-hidden className="pointer-events-none absolute inset-0 ring-1 ring-inset ring-black/[0.05]" />
            </div>

            <div className="px-5 pb-5 pt-5 sm:px-6">
              <p className="text-xs font-semibold text-orange-600">
                Step {index + 1} of {steps.length}
              </p>
              <h2 id={`${uid}-title`} className={cn(HEADING, "mt-1 text-xl tracking-[-0.02em]")}>
                {step.title}
              </h2>
              <p className="mt-2 min-h-[4.5rem] text-sm leading-relaxed text-stone-600">{step.body}</p>

              <div className="mt-4 flex items-center justify-between">
                <div className="flex gap-1.5" role="tablist" aria-label="Guide steps">
                  {steps.map((s, i) => (
                    <button
                      key={s.title}
                      type="button"
                      role="tab"
                      aria-selected={i === index}
                      aria-label={`Step ${i + 1}: ${s.title}`}
                      onClick={() => setIndex(i)}
                      className={cn("h-2 rounded-full transition-all", i === index ? "w-6 bg-orange-500" : "w-2 bg-stone-300 hover:bg-stone-400", FOCUS)}
                    />
                  ))}
                </div>
                <div className="flex gap-2">
                  {index > 0 && (
                    <button type="button" onClick={() => setIndex((i) => i - 1)} className={cn(GHOST_BTN, "h-10 rounded-xl", FOCUS)}>
                      <IcChevronLeft className="size-4" /> Back
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={() => (last ? onClose() : setIndex((i) => i + 1))}
                    className={cn(BTN, "h-10 rounded-xl px-4 text-sm", FOCUS)}
                  >
                    {last ? "Got it" : "Next"}
                    {!last && <IcChevronRight className="size-4" />}
                  </button>
                </div>
              </div>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

/* ========================================================================== */
/*  Export utilities                                                          */
/*  xlsx, jspdf and jspdf-autotable load only when an export is clicked.      */
/* ========================================================================== */

const getSlug = (title: string) =>
  title.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "") || "invitation";

const isoDate = (value: string) => {
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? "" : d.toISOString().slice(0, 10);
};

const EXPORT_HEADERS = ["Guest Name", "Status", "Seats", "Comment", "RSVP Date"];

function csvCell(value: string | number, guardFormulas = true): string {
  let s = String(value ?? "");
  // Neutralise spreadsheet formula injection from guest-supplied text.
  if (guardFormulas && /^[=+\-@\t\r]/.test(s)) s = `'${s}`;
  return `"${s.replace(/"/g, '""')}"`;
}

export async function exportToCSV(invitationTitle: string, guests: Guest[]): Promise<void> {
  const rows = guests.map((g) =>
    [
      csvCell(g.guest_name),
      csvCell(STATUS_LABEL[g.attendance_status] ?? g.attendance_status, false),
      csvCell(g.number_of_guests, false),
      csvCell(g.comment ?? ""),
      csvCell(isoDate(g.created_at), false),
    ].join(","),
  );
  const csv = "\uFEFF" + [EXPORT_HEADERS.map((h) => csvCell(h, false)).join(","), ...rows].join("\r\n");
  const url = URL.createObjectURL(new Blob([csv], { type: "text/csv;charset=utf-8;" }));
  const a = document.createElement("a");
  a.href = url;
  a.download = `${getSlug(invitationTitle)}-guests.csv`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

export async function exportToExcel(invitationTitle: string, guests: Guest[]): Promise<void> {
  const XLSX = await import("xlsx");
  const data = guests.map((g) => ({
    "Guest Name": g.guest_name,
    Status: STATUS_LABEL[g.attendance_status] ?? g.attendance_status,
    Seats: g.number_of_guests,
    Comment: g.comment ?? "",
    "RSVP Date": isoDate(g.created_at),
  }));
  const worksheet = XLSX.utils.json_to_sheet(data, { header: EXPORT_HEADERS });
  worksheet["!cols"] = [{ wch: 25 }, { wch: 15 }, { wch: 10 }, { wch: 40 }, { wch: 15 }];
  worksheet["!autofilter"] = { ref: worksheet["!ref"] ?? "A1" };
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, "Guest List");
  XLSX.writeFile(workbook, `${getSlug(invitationTitle)}-guests.xlsx`);
}

export async function exportToPDF(invitationTitle: string, eventDate: string, guests: Guest[]): Promise<void> {
  const [{ jsPDF }, { default: autoTable }] = await Promise.all([import("jspdf"), import("jspdf-autotable")]);

  const doc = new jsPDF();
  const pageW = doc.internal.pageSize.getWidth();
  const pageH = doc.internal.pageSize.getHeight();
  const count = (s: AttendanceStatus) => guests.filter((g) => g.attendance_status === s).length;
  const confirmedSeats = guests
    .filter((g) => g.attendance_status === "accepted")
    .reduce((sum, g) => sum + g.number_of_guests, 0);

  doc.setFontSize(20);
  doc.setTextColor(28, 20, 16);
  doc.text(invitationTitle, 14, 22);
  doc.setFontSize(10);
  doc.setTextColor(120, 113, 108);
  doc.text(`Event date: ${fmtDate(eventDate)}`, 14, 30);
  doc.text(
    `${guests.length} guests  |  ${count("accepted")} accepted  |  ${count("declined")} declined  |  ${count("pending")} pending  |  ${confirmedSeats} seats confirmed`,
    14,
    36,
  );
  doc.text(`Generated ${new Date().toLocaleDateString()}`, 14, 42);

  autoTable(doc, {
    startY: 48,
    head: [EXPORT_HEADERS],
    body: guests.map((g) => [
      g.guest_name,
      STATUS_LABEL[g.attendance_status] ?? g.attendance_status,
      String(g.number_of_guests),
      g.comment || "-",
      isoDate(g.created_at),
    ]),
    theme: "grid",
    headStyles: { fillColor: [249, 115, 22], textColor: [255, 255, 255], fontStyle: "bold" },
    alternateRowStyles: { fillColor: [250, 250, 249] },
    styles: { fontSize: 9, cellPadding: 4 },
    columnStyles: {
      0: { cellWidth: 45 },
      1: { cellWidth: 25 },
      2: { cellWidth: 15 },
      3: { cellWidth: "auto" },
      4: { cellWidth: 25 },
    },
  });

  const pages = doc.getNumberOfPages();
  doc.setFontSize(8);
  doc.setTextColor(168, 162, 158);
  for (let i = 1; i <= pages; i++) {
    doc.setPage(i);
    doc.text(`Page ${i} of ${pages}`, pageW - 14, pageH - 8, { align: "right" });
  }
  doc.save(`${getSlug(invitationTitle)}-guests.pdf`);
}