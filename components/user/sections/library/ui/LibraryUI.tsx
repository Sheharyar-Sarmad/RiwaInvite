"use client";

import * as React from "react";
import Link from "next/link";
import Image from "next/image";
import { createPortal } from "react-dom";
import { AnimatePresence, motion, useDragControls } from "framer-motion";
import { FOCUS } from "@/components/user/navigation/UserSidebar";
import {
  BTN,
  EASE,
  HEADING,
  Shimmer,
  StatusChip,
  Tip,
  cn,
  fmtDate,
  money,
} from "@/components/user/sections/dashboard/ui/DashboardUI";
import type { LibraryItem, LibraryMeta } from "@/lib/types/library";
import { AceternitySelect } from "@/components/ui/aceternity-select";

/* ========================================================================== */
/*  Design tokens                                                             */
/*  One rule: orange is for brand actions, ink is for selection, and colour   */
/*  appears only where it means something (premium, used, category dot).      */
/*  Surfaces are solid white with a hairline ring and a soft neutral shadow,  */
/*  so they sit cleanly on the peach page background.                         */
/* ========================================================================== */

/** Solid surface: hairline ring + layered neutral shadow. */
export const SURFACE =
  "bg-white ring-1 ring-black/[0.06] shadow-[0_1px_2px_rgba(28,20,16,0.04),0_12px_28px_-18px_rgba(28,20,16,0.22)]";

const HAIRLINE = "border-black/[0.08]";

/** Category dot colours. The same category name always gets the same one. */
const CATEGORY_DOTS = [
  "bg-orange-500",
  "bg-emerald-500",
  "bg-sky-500",
  "bg-rose-500",
  "bg-amber-500",
  "bg-violet-500",
] as const;

function categoryDot(name: string) {
  let h = 0;
  for (let i = 0; i < name.length; i++) h = (h * 31 + name.charCodeAt(i)) >>> 0;
  return CATEGORY_DOTS[h % CATEGORY_DOTS.length];
}

/* ========================================================================== */
/*  Icon set                                                                  */
/*  Drawn in-house on a 24px grid. Each icon is an outline (currentColor)     */
/*  over a soft 14% tint of the same colour.                                  */
/* ========================================================================== */

type IconProps = React.SVGProps<SVGSVGElement>;

const TINT = {
  fill: "currentColor",
  fillOpacity: 0.14,
  stroke: "none",
} as const;

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

/** Stack of template "books", one leaning. */
export const IcLibrary = (p: IconProps) => (
  <Svg {...p}>
    <rect x="3.5" y="4" width="4.6" height="16" rx="1.3" {...TINT} />
    <rect x="9.6" y="4" width="4.6" height="16" rx="1.3" {...TINT} />
    <rect
      x="15.6"
      y="5"
      width="4.6"
      height="15.2"
      rx="1.3"
      transform="rotate(-13 17.9 12.6)"
      {...TINT}
    />
    <rect x="3.5" y="4" width="4.6" height="16" rx="1.3" />
    <rect x="9.6" y="4" width="4.6" height="16" rx="1.3" />
    <rect
      x="15.6"
      y="5"
      width="4.6"
      height="15.2"
      rx="1.3"
      transform="rotate(-13 17.9 12.6)"
    />
    <path d="M3.5 8.6h4.6M9.6 8.6h4.6" />
  </Svg>
);

export const IcCrown = (p: IconProps) => (
  <Svg {...p}>
    <path
      d="M3.5 8.5l4.2 3.6L12 5l4.3 7.1 4.2-3.6-1.6 9.4H5.1L3.5 8.5z"
      {...TINT}
    />
    <path d="M3.5 8.5l4.2 3.6L12 5l4.3 7.1 4.2-3.6-1.6 9.4H5.1L3.5 8.5z" />
    <path d="M5.8 21h12.4" />
    <circle cx="3.5" cy="8.5" r="1" fill="currentColor" stroke="none" />
    <circle cx="12" cy="5" r="1" fill="currentColor" stroke="none" />
    <circle cx="20.5" cy="8.5" r="1" fill="currentColor" stroke="none" />
  </Svg>
);

/** Sealed invitation envelope. */
export const IcEnvelope = (p: IconProps) => (
  <Svg {...p}>
    <rect x="3" y="5.5" width="18" height="13" rx="3.2" {...TINT} />
    <rect x="3" y="5.5" width="18" height="13" rx="3.2" />
    <path d="M3.8 8l8.2 6 8.2-6" />
    <circle cx="12" cy="14" r="1.3" fill="currentColor" stroke="none" />
  </Svg>
);

/** Two chain links, end to end. */
export const IcLink = (p: IconProps) => (
  <Svg {...p}>
    <rect
      x="3.6"
      y="12.2"
      width="10.4"
      height="5.6"
      rx="2.8"
      transform="rotate(-45 8.8 15)"
      {...TINT}
    />
    <rect
      x="10"
      y="6.2"
      width="10.4"
      height="5.6"
      rx="2.8"
      transform="rotate(-45 15.2 9)"
      {...TINT}
    />
    <rect
      x="3.6"
      y="12.2"
      width="10.4"
      height="5.6"
      rx="2.8"
      transform="rotate(-45 8.8 15)"
    />
    <rect
      x="10"
      y="6.2"
      width="10.4"
      height="5.6"
      rx="2.8"
      transform="rotate(-45 15.2 9)"
    />
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

export const IcEye = (p: IconProps) => (
  <Svg {...p}>
    <path
      d="M2.5 12s3.6-6.5 9.5-6.5 9.5 6.5 9.5 6.5-3.6 6.5-9.5 6.5S2.5 12 2.5 12z"
      {...TINT}
    />
    <path d="M2.5 12s3.6-6.5 9.5-6.5 9.5 6.5 9.5 6.5-3.6 6.5-9.5 6.5S2.5 12 2.5 12z" />
    <circle cx="12" cy="12" r="3" />
    <circle cx="12" cy="12" r="1" fill="currentColor" stroke="none" />
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

export const IcWallet = (p: IconProps) => (
  <Svg {...p}>
    <rect x="3" y="6" width="18" height="13.5" rx="3.2" {...TINT} />
    <rect x="3" y="6" width="18" height="13.5" rx="3.2" />
    <path d="M6.5 6l8.6-2.6a1.4 1.4 0 0 1 1.8 1.3V6" />
    <rect x="14" y="11.6" width="7" height="4.4" rx="2.2" />
    <circle cx="17.2" cy="13.8" r=".85" fill="currentColor" stroke="none" />
  </Svg>
);

export const IcCheck = (p: IconProps) => (
  <Svg strokeWidth={2.4} {...p}>
    <path d="M5 12.5l4.5 4.5L19 7.5" />
  </Svg>
);

/** Four-point spark with a small companion. */
export const IcSparkle = (p: IconProps) => (
  <Svg {...p}>
    <path
      d="M10.5 4c.7 4.4 2.9 6.6 7.3 7.3-4.4.7-6.6 2.9-7.3 7.3-.7-4.4-2.9-6.6-7.3-7.3C7.6 10.6 9.8 8.4 10.5 4z"
      {...TINT}
    />
    <path d="M10.5 4c.7 4.4 2.9 6.6 7.3 7.3-4.4.7-6.6 2.9-7.3 7.3-.7-4.4-2.9-6.6-7.3-7.3C7.6 10.6 9.8 8.4 10.5 4z" />
    <path d="M19 3.5v3M17.5 5h3" />
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

export const IcChevronsUpDown = (p: IconProps) => (
  <Svg strokeWidth={2} {...p}>
    <path d="M8 9.5l4-4 4 4M8 14.5l4 4 4-4" />
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

export const IcReceipt = (p: IconProps) => (
  <Svg {...p}>
    <path
      d="M6 3.5h12v17l-2.5-1.7-2 1.7-1.5-1.7-1.5 1.7-2-1.7L6 20.5v-17z"
      {...TINT}
    />
    <path d="M6 3.5h12v17l-2.5-1.7-2 1.7-1.5-1.7-1.5 1.7-2-1.7L6 20.5v-17z" />
    <path d="M9 8.5h6M9 12h6" />
  </Svg>
);

/* ========================================================================== */
/*  Routes (change these if your app uses different paths)                    */
/* ========================================================================== */

export const LIBRARY_ROUTES = {
  /** Start a new invitation from an owned template. */
  create: (templateId: string) =>
    `/dashboard/invitations?template=${encodeURIComponent(templateId)}`,
  invitations: "/dashboard/invitations",
  browse: "/templates",
} as const;

/* ========================================================================== */
/*  Small hooks                                                               */
/* ========================================================================== */

export function useDebouncedValue<T>(value: T, delay = 350) {
  const [debounced, setDebounced] = React.useState(value);
  React.useEffect(() => {
    const id = window.setTimeout(() => setDebounced(value), delay);
    return () => window.clearTimeout(id);
  }, [value, delay]);
  return debounced;
}

/* ========================================================================== */
/*  Toolbar controls                                                          */
/* ========================================================================== */

export function SearchField({
  value,
  onChange,
  placeholder = "Search by template or category",
  className,
}: {
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  className?: string;
}) {
  const inputRef = React.useRef<HTMLInputElement>(null);

  // Press "/" anywhere on the page to jump into search.
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
      <span className="sr-only">Search your library</span>
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

export type SegmentOption<T extends string> = {
  value: T;
  label: string;
  count?: number;
};

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
                  active
                    ? "bg-neutral-900 text-white"
                    : "bg-black/[0.06] text-stone-500",
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
  // AceternitySelect works with strings, so map in and back out to keep T (e.g. the numeric page size).
  const opts = React.useMemo(
    () => options.map((o) => ({ label: o.label, value: String(o.value) })),
    [options],
  );

  return (
    <div
      role="group"
      aria-label={label}
      className={cn("relative block", className)}
    >
      <AceternitySelect
        value={String(value)}
        options={opts}
        onChange={(raw) => {
          const match = options.find((o) => String(o.value) === raw);
          if (match) onChange(match.value);
        }}
        className={cn(
          // Size and theme the trigger button from outside, without editing the component.
          "[&>button]:h-10 [&>button]:rounded-xl [&>button]:border-black/[0.08] [&>button]:bg-white [&>button]:px-3 [&>button]:py-0 [&>button]:text-[13px] [&>button]:font-semibold [&>button]:text-[#1c1410] [&>button]:shadow-[0_1px_2px_rgba(28,20,16,0.04)]",
          "hover:[&>button]:border-black/20 sm:[&>button]:h-11 sm:[&>button]:text-sm",
        )}
      />
    </div>
  );
}

/* ========================================================================== */
/*  Active filter chips                                                       */
/* ========================================================================== */

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
          <span className="max-w-[10rem] truncate sm:max-w-[12rem]">
            {c.label}
          </span>
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
/*  Thumbnail                                                                 */
/* ========================================================================== */

function Thumb({
  src,
  className,
  sizes,
}: {
  src: string;
  className?: string;
  sizes: string;
}) {
  const [failed, setFailed] = React.useState(false);
  const [loaded, setLoaded] = React.useState(false);
  React.useEffect(() => {
    setFailed(false);
    setLoaded(false);
  }, [src]);

  if (failed || !src) {
    return (
      <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 bg-stone-100 text-stone-400">
        <IcImageOff className="size-7 sm:size-8" />
        <span className="text-[11px] font-semibold">No preview</span>
      </div>
    );
  }
  // Fades in once loaded, so previews never pop in half-drawn.
  return (
    <div
      className={cn(
        "absolute inset-0 transition-opacity duration-500",
        loaded ? "opacity-100" : "opacity-0",
      )}
    >
      <Image
        src={src}
        alt=""
        fill
        unoptimized
        sizes={sizes}
        onLoad={() => setLoaded(true)}
        onError={() => setFailed(true)}
        className={cn("object-cover", className)}
      />
    </div>
  );
}

/* ========================================================================== */
/*  Badges                                                                    */
/* ========================================================================== */

const BADGE =
  "inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 text-[10px] font-semibold shadow-sm backdrop-blur-md sm:px-2.5 sm:py-1 sm:text-[11px]";

/** Dark "Pro"-style pill: same family as the dark secondary button. */
function PremiumBadge() {
  return (
    <span
      className={cn(
        BADGE,
        "bg-neutral-900/90 text-amber-200 ring-1 ring-white/10",
      )}
    >
      <IcCrown className="size-3 sm:size-3.5" /> Premium
    </span>
  );
}

function UsageBadge({ count }: { count: number }) {
  return (
    <span
      className={cn(
        BADGE,
        "bg-white/90 text-[#1c1410] ring-1 ring-black/[0.06]",
      )}
    >
      <span
        aria-hidden
        className={cn(
          "size-1.5 rounded-full",
          count > 0 ? "bg-emerald-500" : "bg-orange-500",
        )}
      />
      {count > 0 ? `Used in ${count}` : "Ready to use"}
    </span>
  );
}

const acquisitionLabel = (a: LibraryItem["acquisition"]) =>
  a === "purchase" ? "Purchased" : "Included in your plan";

/* ========================================================================== */
/*  Card layout constants                                                     */
/*  The real card and its skeleton share these, so loading never shifts.      */
/*  Mobile uses a wide, short preview (16/10) and tighter spacing; from the   */
/*  sm breakpoint up it returns to the roomier 5/4 preview.                      */
/* ========================================================================== */

const CARD_SHELL = cn("overflow-hidden rounded-2xl", SURFACE);
const CARD_THUMB = "aspect-[16/10] sm:aspect-[5/4]";
const CARD_BODY = "flex flex-1 flex-col gap-2.5 p-3 sm:gap-3 sm:p-4";
const CARD_TEXT = "flex flex-col gap-1";
const CARD_DESC = "h-8 leading-4 sm:h-10 sm:leading-5";
const CARD_ACTIONS = "mt-auto flex h-9 items-center gap-2 sm:h-10";

/* ========================================================================== */
/*  Template card                                                             */
/* ========================================================================== */

/* Ticket tokens (same as the Rehearsal, Billing and Invitation cards) */
const TICKET_PAPER =
  "bg-gradient-to-br from-[#fffdfa] via-[#fff8f1] to-[#ffeddc]";
const TICKET_LIFT_FX =
  "transition-transform duration-300 motion-reduce:transition-none [filter:drop-shadow(0_1px_1px_rgba(28,20,16,0.08))_drop-shadow(0_14px_20px_rgba(28,20,16,0.10))] hover:-translate-y-1 hover:[filter:drop-shadow(0_1px_1px_rgba(28,20,16,0.10))_drop-shadow(0_22px_26px_rgba(28,20,16,0.16))]";
const TICKET_STUB_H = "4.5rem";
const TICKET_MASK_FX = `radial-gradient(circle 9px at 0 calc(100% - ${TICKET_STUB_H}), #0000 97%, #000) left / 51% 100% no-repeat, radial-gradient(circle 9px at 100% calc(100% - ${TICKET_STUB_H}), #0000 97%, #000) right / 51% 100% no-repeat`;

function TicketSheen() {
  return (
    <span
      aria-hidden
      className="pointer-events-none absolute inset-y-0 -left-1/2 z-10 w-1/2 -skew-x-12 bg-gradient-to-r from-transparent via-white/60 to-transparent opacity-0 transition-all duration-700 group-hover/card:left-full group-hover/card:opacity-100 motion-reduce:hidden"
    />
  );
}

export function TemplateCard({
  item,
  index,
  onOpen,
}: {
  item: LibraryItem;
  index: number;
  onOpen: (item: LibraryItem) => void;
}) {
  const archived = item.status === "archived";
  const dot = categoryDot(item.category_name || "");
  const viaPlan = item.acquisition !== "purchase";

  return (
    <motion.li
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{
        duration: 0.4,
        delay: Math.min(index, 8) * 0.035,
        ease: EASE,
      }}
      className="min-w-0"
    >
      <div className={cn("group/card h-full", TICKET_LIFT_FX)}>
        <article
          style={{ WebkitMask: TICKET_MASK_FX, mask: TICKET_MASK_FX }}
          className={cn(
            "relative flex h-full flex-col overflow-hidden rounded-2xl border",
            TICKET_PAPER,
            viaPlan ? "border-[#1c1410]/40" : "border-black/[0.07]",
          )}
        >
          <TicketSheen />
          {viaPlan && (
            <span
              aria-hidden
              className="absolute inset-x-0 top-0 z-20 h-1 bg-[#1c1410]"
            />
          )}

          <button
            type="button"
            onClick={() => onOpen(item)}
            aria-label={`Preview ${item.name}`}
            className={cn(
              "relative block w-full overflow-hidden bg-stone-100 text-left",
              CARD_THUMB,
              FOCUS,
            )}
          >
            <Thumb
              src={item.thumbnail_url}
              sizes="(min-width: 1280px) 22vw, (min-width: 1024px) 30vw, (min-width: 480px) 45vw, 92vw"
              className={cn(
                "transition-transform duration-700 ease-out group-hover/card:scale-[1.03]",
                archived && "grayscale-[0.6]",
              )}
            />
            <div
              aria-hidden
              className="pointer-events-none absolute inset-0 ring-1 ring-inset ring-black/[0.05]"
            />
            <div
              aria-hidden
              className="pointer-events-none absolute inset-x-0 bottom-0 h-1/3 bg-gradient-to-t from-black/35 to-transparent opacity-0 transition-opacity duration-300 group-hover/card:opacity-100"
            />
            {item.is_premium && (
              <div className="absolute left-2 top-3 sm:left-3">
                <PremiumBadge />
              </div>
            )}
            <div className="absolute right-2 top-3 sm:right-3">
              <UsageBadge count={item.invitation_count} />
            </div>
            <span className="absolute inset-x-3 bottom-3 flex translate-y-1 items-center justify-center gap-1.5 rounded-lg bg-white/95 py-2 text-xs font-semibold text-[#1c1410] opacity-0 shadow-md transition-all duration-300 group-hover/card:translate-y-0 group-hover/card:opacity-100 group-focus-within/card:translate-y-0 group-focus-within/card:opacity-100 max-sm:hidden">
              <IcEye className="size-4" /> Quick preview
            </span>
          </button>

          <div className="flex flex-1 flex-col gap-1 p-3 sm:p-4">
            <p className="flex h-4 items-center gap-1.5 text-[11px] font-semibold uppercase leading-4 tracking-[0.12em] text-stone-500">
              <span
                aria-hidden
                className={cn("size-1.5 shrink-0 rounded-full", dot)}
              />
              <span className="truncate">{item.category_name}</span>
            </p>
            <h3
              className={cn(
                HEADING,
                "h-6 truncate text-[15px] leading-6 tracking-[-0.01em] text-[#1c1410] sm:text-base",
              )}
              title={item.name}
            >
              {item.name}
            </h3>
            <p className="line-clamp-2 h-8 text-xs leading-4 text-stone-500 sm:h-10 sm:leading-5">
              {item.description || "No description added for this template."}
            </p>

            <div className="mt-auto flex h-5 items-center gap-3 overflow-hidden whitespace-nowrap pt-1 text-[11px] leading-4 text-stone-500">
              {viaPlan ? (
                <span className="inline-flex items-center gap-1 font-semibold text-[#1c1410]">
                  <IcWallet className="size-3.5 shrink-0 text-stone-400" />{" "}
                  Unlocked with your plan
                </span>
              ) : (
                <span className="inline-flex items-center gap-1 font-semibold tabular-nums text-stone-700">
                  <IcWallet className="size-3.5 shrink-0 text-stone-400" />
                  {item.price_paid > 0 ? money(item.price_paid) : "No charge"}
                </span>
              )}
              {item.has_custom_slug ? (
                <span
                  className="inline-flex items-center gap-1 font-semibold text-orange-600"
                  title="Custom link unlocked"
                >
                  <IcLink className="size-3.5 shrink-0" /> Custom link
                </span>
              ) : (
                !viaPlan && <span className="truncate">Purchased</span>
              )}
            </div>
          </div>

          {/* perforated stub */}
          <div
            className="flex shrink-0 items-center gap-2 border-t border-dashed border-[#1c1410]/25 px-3 sm:px-4"
            style={{ height: TICKET_STUB_H }}
          >
            {archived ? (
              <span className="flex h-11 flex-1 items-center justify-center rounded-xl border border-black/[0.08] bg-stone-50 text-xs font-semibold text-stone-500">
                No longer available
              </span>
            ) : (
              <Tip label="Create an invitation from this template" side="top">
                <Link
                  href={LIBRARY_ROUTES.create(item.id)}
                  className={cn(
                    BTN,
                    "h-11 flex-1 whitespace-nowrap rounded-xl px-3 text-[13px]",
                    FOCUS,
                  )}
                >
                  Use template <IcArrowUpRight className="size-3.5 shrink-0" />
                </Link>
              </Tip>
            )}
            <Tip label="See full details" side="top">
              <button
                type="button"
                onClick={() => onOpen(item)}
                aria-label={`Details for ${item.name}`}
                className={cn(
                  "flex size-11 shrink-0 items-center justify-center rounded-xl border bg-white text-stone-600 transition hover:border-orange-300 hover:text-orange-600 active:scale-95",
                  HAIRLINE,
                  FOCUS,
                )}
              >
                <IcEye className="size-[18px]" />
              </button>
            </Tip>
          </div>
        </article>
      </div>
    </motion.li>
  );
}

/* ========================================================================== */
/*  Grid, "browse more" tile, skeleton                                        */
/* ========================================================================== */

export const GRID_CLASS =
  "grid grid-cols-1 gap-3 min-[480px]:grid-cols-2 sm:gap-4 lg:grid-cols-3 xl:grid-cols-4";

/** Dashed end-of-list tile: fills the empty space and gives a next step. */
function BrowseTile({ index }: { index: number }) {
  return (
    <motion.li
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{
        duration: 0.4,
        delay: Math.min(index, 8) * 0.035,
        ease: EASE,
      }}
      className="min-w-0"
    >
      <Link
        href={LIBRARY_ROUTES.browse}
        className={cn(
          "group/tile flex h-full min-h-[9rem] flex-col items-center justify-center gap-2.5 rounded-2xl border border-dashed border-orange-300/80 bg-white/40 p-5 text-center transition-colors hover:border-orange-400 hover:bg-white/70 sm:min-h-[14rem]",
          FOCUS,
        )}
      >
        <span className="flex size-10 items-center justify-center rounded-full bg-white text-orange-600 shadow-sm ring-1 ring-black/[0.06] transition-transform group-hover/tile:scale-105">
          <IcPlus className="size-[18px]" />
        </span>
        <span>
          <span className="block text-sm font-semibold text-[#1c1410]">
            Find your next design
          </span>
          <span className="mt-0.5 block text-xs text-stone-500">
            Browse all templates
          </span>
        </span>
      </Link>
    </motion.li>
  );
}

export function TemplateGrid({
  items,
  onOpen,
  showBrowseTile = false,
}: {
  items: LibraryItem[];
  onOpen: (item: LibraryItem) => void;
  /** Adds the dashed "browse more" tile after the last card. */
  showBrowseTile?: boolean;
}) {
  return (
    <ul className={GRID_CLASS}>
      {items.map((item, i) => (
        <TemplateCard key={item.id} item={item} index={i} onOpen={onOpen} />
      ))}
      {showBrowseTile && <BrowseTile index={items.length} />}
    </ul>
  );
}

/** Same shell, same image ratio, same body blocks as TemplateCard. */
export function GridSkeleton({ count = 12 }: { count?: number }) {
  return (
    <>
      <ul className={GRID_CLASS} aria-hidden>
        {Array.from({ length: count }).map((_, i) => (
          <li key={i} className="min-w-0">
            <div className={cn(CARD_SHELL, "flex h-full flex-col")}>
              <Shimmer className={cn("w-full rounded-none", CARD_THUMB)} />
              <div className={CARD_BODY}>
                <div className={CARD_TEXT}>
                  <Shimmer className="h-4 w-1/3 rounded-md" />
                  <Shimmer className="h-6 w-3/4 rounded-md" />
                  <Shimmer className={cn("w-full rounded-md", CARD_DESC)} />
                </div>
                <Shimmer className="h-4 w-2/3 rounded-md" />
                <div className={CARD_ACTIONS}>
                  <Shimmer className="h-full flex-1 rounded-xl" />
                  <Shimmer className="size-9 shrink-0 rounded-xl sm:size-10" />
                </div>
              </div>
            </div>
          </li>
        ))}
      </ul>
      {/* Reserves the pagination row so it doesn't push content when it arrives. */}
      <div className="h-9" aria-hidden />
    </>
  );
}

/* ========================================================================== */
/*  Pagination                                                                */
/* ========================================================================== */

function pageWindow(
  page: number,
  total: number,
): (number | "gap-l" | "gap-r")[] {
  if (total <= 7) return Array.from({ length: total }, (_, i) => i + 1);
  const keep = new Set<number>([1, total, page - 1, page, page + 1]);
  const sorted = [...keep]
    .filter((n) => n >= 1 && n <= total)
    .sort((a, b) => a - b);
  const out: (number | "gap-l" | "gap-r")[] = [];
  sorted.forEach((n, i) => {
    const prev = sorted[i - 1];
    if (prev !== undefined && n - prev > 1)
      out.push(i < sorted.length / 2 ? "gap-l" : "gap-r");
    out.push(n);
  });
  return out;
}

export function Pagination({
  meta,
  shown,
  onPage,
  busy,
}: {
  meta: LibraryMeta;
  shown: number;
  onPage: (p: number) => void;
  busy?: boolean;
}) {
  const { page, limit, total, total_pages } = meta;
  if (total === 0) return null;

  const from = (page - 1) * limit + 1;
  const to = from + shown - 1;
  const pages = pageWindow(page, total_pages);

  const step = cn(
    "flex size-9 items-center justify-center rounded-lg border bg-white text-stone-600 transition hover:border-black/20 hover:bg-stone-50 hover:text-[#1c1410] active:scale-95 disabled:pointer-events-none disabled:opacity-40",
    HAIRLINE,
  );

  return (
    <nav
      aria-label="Library pages"
      className="flex min-h-9 flex-col items-center justify-between gap-3 sm:flex-row"
    >
      <p className="text-xs font-medium text-stone-500" aria-live="polite">
        Showing{" "}
        <span className="font-semibold tabular-nums text-[#1c1410]">
          {from}–{to}
        </span>{" "}
        of{" "}
        <span className="font-semibold tabular-nums text-[#1c1410]">
          {total}
        </span>{" "}
        template{total === 1 ? "" : "s"}
      </p>

      {total_pages > 1 && (
        <div className="flex items-center gap-1.5">
          <button
            type="button"
            onClick={() => onPage(page - 1)}
            disabled={page <= 1 || busy}
            aria-label="Previous page"
            className={cn(step, FOCUS)}
          >
            <IcChevronLeft className="size-4" />
          </button>

          {pages.map((p) =>
            typeof p === "string" ? (
              <span
                key={p}
                aria-hidden
                className="w-5 text-center text-sm text-stone-400"
              >
                …
              </span>
            ) : (
              <button
                key={p}
                type="button"
                onClick={() => onPage(p)}
                disabled={busy}
                aria-label={`Page ${p}`}
                aria-current={p === page ? "page" : undefined}
                className={cn(
                  "h-9 min-w-9 rounded-lg px-2 text-sm font-semibold tabular-nums transition active:scale-95",
                  p === page
                    ? "bg-neutral-900 text-white shadow-sm"
                    : cn(
                        "border bg-white text-stone-600 hover:border-black/20 hover:bg-stone-50 hover:text-[#1c1410]",
                        HAIRLINE,
                      ),
                  FOCUS,
                )}
              >
                {p}
              </button>
            ),
          )}

          <button
            type="button"
            onClick={() => onPage(page + 1)}
            disabled={page >= total_pages || busy}
            aria-label="Next page"
            className={cn(step, FOCUS)}
          >
            <IcChevronRight className="size-4" />
          </button>
        </div>
      )}
    </nav>
  );
}

/* ========================================================================== */
/*  Detail sheet                                                              */
/*  Layout: [drag handle] / [scrolling body] / [pinned action bar].           */
/*  Only the handle starts the swipe-to-close drag; the body is a plain       */
/*  native scroller, so touch scrolling works on mobile. The data-lenis-*     */
/*  attributes and stopPropagation keep global smooth-scroll libraries from   */
/*  swallowing the gesture.                                                   */
/* ========================================================================== */

function DetailRow({
  icon: Icon,
  label,
  children,
}: {
  icon: React.ElementType;
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex items-center gap-2 py-2 text-[13px]">
      <dt className="flex shrink-0 items-center gap-2 text-stone-500">
        <Icon className="size-4 text-stone-400" />
        {label}
      </dt>
      <span
        aria-hidden
        className="min-w-4 flex-1 border-b border-dotted border-black/15"
      />
      <dd className="min-w-0 shrink-0 text-right font-semibold text-[#1c1410]">
        {children}
      </dd>
    </div>
  );
}

export function TemplateSheet({
  item,
  onClose,
}: {
  item: LibraryItem | null;
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

  const archived = item?.status === "archived";
  const dot = categoryDot(item?.category_name || "");

  return createPortal(
    <AnimatePresence>
      {item && (
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
            aria-labelledby="template-title"
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
            className="relative flex max-h-[88dvh] w-full flex-col overflow-hidden rounded-t-3xl bg-white text-[#1c1410] shadow-2xl ring-1 ring-black/[0.06] sm:max-h-[90dvh] sm:max-w-3xl sm:rounded-3xl"
          >
            {/* drag handle: the only thing that starts the swipe-down */}
            <div
              onPointerDown={(e) => controls.start(e)}
              className="flex h-6 shrink-0 cursor-grab touch-none items-center justify-center sm:hidden"
              aria-hidden
            >
              <span className="h-1.5 w-10 rounded-full bg-stone-300" />
            </div>

            {/* scrolling body */}
            <div
              data-lenis-prevent
              data-lenis-prevent-touch
              data-lenis-prevent-wheel
              onWheel={(e) => e.stopPropagation()}
              onTouchMove={(e) => e.stopPropagation()}
              style={{ touchAction: "pan-y", WebkitOverflowScrolling: "touch" }}
              className="min-h-0 flex-1 overflow-y-auto overscroll-contain"
            >
              <div className="grid gap-0 sm:grid-cols-[minmax(0,5fr)_minmax(0,6fr)]">
                {/* ---- preview ---- */}
                <div className="relative bg-gradient-to-br from-orange-50 via-stone-50 to-amber-50 p-3 sm:p-5">
                  <div className="relative mx-auto aspect-[4/5] w-full max-w-[9.5rem] overflow-hidden rounded-2xl bg-white shadow-[0_18px_40px_-18px_rgba(28,20,16,0.4)] ring-1 ring-black/[0.06] min-[400px]:max-w-[11rem] sm:max-w-none">
                    <Thumb
                      src={item.thumbnail_url}
                      sizes="(min-width: 640px) 320px, 50vw"
                    />
                    {item.is_premium && (
                      <div className="absolute left-2 top-2 sm:left-3 sm:top-3">
                        <PremiumBadge />
                      </div>
                    )}
                  </div>
                </div>

                {/* ---- details ---- */}
                <div className="flex min-w-0 flex-col p-4 sm:p-6">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-[0.06em] text-stone-500">
                        <span
                          aria-hidden
                          className={cn("size-1.5 shrink-0 rounded-full", dot)}
                        />
                        <span className="truncate">{item.category_name}</span>
                      </p>
                      <h2
                        id="template-title"
                        className={cn(
                          HEADING,
                          "mt-1 text-xl leading-tight tracking-[-0.02em] sm:text-2xl",
                        )}
                      >
                        {item.name}
                      </h2>
                    </div>
                    <Tip label="Close" hint="Esc" side="left">
                      <button
                        ref={closeRef}
                        type="button"
                        onClick={onClose}
                        aria-label="Close"
                        className={cn(
                          "flex size-8 shrink-0 items-center justify-center rounded-full bg-stone-100 text-stone-600 transition hover:bg-stone-200 hover:text-[#1c1410] active:scale-95 sm:size-9",
                          FOCUS,
                        )}
                      >
                        <IcClose className="size-4" />
                      </button>
                    </Tip>
                  </div>

                  <p className="mt-2 text-[13px] leading-relaxed text-stone-600 sm:mt-3 sm:text-sm">
                    {item.description ||
                      "No description added for this template."}
                  </p>

                  <dl className="mt-3 divide-y divide-black/[0.06] border-t border-black/[0.06] sm:mt-4">
                    <DetailRow icon={IcReceipt} label="How you got it">
                      {acquisitionLabel(item.acquisition)}
                    </DetailRow>
                    <DetailRow icon={IcWallet} label="Price paid">
                      {item.price_paid > 0 ? (
                        <span className="tabular-nums">
                          {money(item.price_paid)}
                        </span>
                      ) : (
                        "No charge"
                      )}
                    </DetailRow>
                    <DetailRow icon={IcCalendar} label="Added">
                      {fmtDate(item.purchased_at)}
                    </DetailRow>
                    <DetailRow icon={IcEnvelope} label="Invitations">
                      <span className="tabular-nums">
                        {item.invitation_count > 0
                          ? `${item.invitation_count} created`
                          : "None yet"}
                      </span>
                    </DetailRow>
                    <DetailRow icon={IcLink} label="Custom link">
                      {item.has_custom_slug ? (
                        <span className="text-emerald-600">Unlocked</span>
                      ) : item.allows_custom_slug ? (
                        <span className="tabular-nums">
                          Available, {money(item.custom_slug_price)}
                        </span>
                      ) : (
                        <span className="text-stone-400">Not supported</span>
                      )}
                    </DetailRow>
                    {item.status !== "published" && (
                      <DetailRow icon={IcEye} label="Status">
                        <StatusChip status={item.status} />
                      </DetailRow>
                    )}
                  </dl>
                </div>
              </div>
            </div>

            {/* pinned action bar: always reachable, never scrolls away */}
            <div className="shrink-0 border-t border-black/[0.06] bg-white p-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] sm:px-6 sm:py-4">
              {archived ? (
                <p className="rounded-xl border border-black/[0.08] bg-stone-50 px-4 py-2.5 text-center text-sm font-medium text-stone-600">
                  This template was retired and can’t start new invitations.
                </p>
              ) : (
                <div className="flex flex-col gap-2 sm:flex-row-reverse">
                  <Link
                    href={LIBRARY_ROUTES.create(item.id)}
                    onClick={onClose}
                    className={cn(
                      BTN,
                      "w-full rounded-xl py-2.5 text-sm font-bold sm:flex-1 sm:py-3",
                      FOCUS,
                    )}
                  >
                    Use this template <IcArrowUpRight className="size-4" />
                  </Link>
                  {item.invitation_count > 0 && (
                    <Link
                      href={LIBRARY_ROUTES.invitations}
                      onClick={onClose}
                      className={cn(
                        "flex w-full items-center justify-center rounded-xl border bg-white py-2 text-sm font-semibold text-[#1c1410] transition-colors hover:border-black/20 hover:bg-stone-50 sm:flex-1 sm:py-3",
                        HAIRLINE,
                        FOCUS,
                      )}
                    >
                      View my invitations
                    </Link>
                  )}
                </div>
              )}
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>,
    document.body,
  );
}
