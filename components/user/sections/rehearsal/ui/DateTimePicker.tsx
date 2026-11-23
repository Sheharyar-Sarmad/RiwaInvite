"use client";

/**
 * components/user/sections/rehearsal/ui/DateTimePicker.tsx
 *
 * Custom event date + time pickers that replace the native <input type="date|time">.
 *
 *  - Value formats are unchanged: date = "YYYY-MM-DD", time = "HH:mm" (24h),
 *    so `design.details` and the AI route keep working as they are.
 *  - Desktop: anchored popover that flips above the field when there is no room below.
 *  - Phone (< 640px): bottom sheet with 44px touch targets.
 *  - Calendar: day / month / year views, quick picks, countdown, full keyboard support
 *    (arrows, PageUp/PageDown, Enter, Esc).
 *  - Time: 12-hour wheels (hour, minute, AM/PM), preset times, "Now".
 *  - Every scroll area carries `data-lenis-prevent`. Motion respects prefers-reduced-motion.
 */

import * as React from "react";
import { createPortal } from "react-dom";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { CalendarDays, ChevronDown, ChevronLeft, ChevronRight, Clock, X } from "lucide-react";
import { cn } from "@/components/user/sections/dashboard/ui/DashboardUI";
import { FOCUS } from "@/components/user/navigation/UserSidebar";

/* ========================================================================== */
/*  Date / time helpers                                                       */
/* ========================================================================== */

type YMD = { y: number; m: number; d: number }; // m is 1-12
type HM = { h: number; m: number }; // h is 0-23

const pad = (n: number) => String(n).padStart(2, "0");
const toISO = (v: YMD) => `${v.y}-${pad(v.m)}-${pad(v.d)}`;
const fromDate = (d: Date): YMD => ({ y: d.getFullYear(), m: d.getMonth() + 1, d: d.getDate() });
const today = (): YMD => fromDate(new Date());
const addDays = (v: YMD, n: number): YMD => fromDate(new Date(v.y, v.m - 1, v.d + n));

/** Parses "YYYY-MM-DD" and rejects impossible dates such as 2026-02-31. */
function parseISO(v: string): YMD | null {
  const x = /^(\d{4})-(\d{2})-(\d{2})$/.exec(v);
  if (!x) return null;
  const y = Number(x[1]);
  const m = Number(x[2]);
  const d = Number(x[3]);
  const dt = new Date(y, m - 1, d);
  if (dt.getFullYear() !== y || dt.getMonth() !== m - 1 || dt.getDate() !== d) return null;
  return { y, m, d };
}

/** Adds months and clamps the day (31 Jan + 1 month = 28/29 Feb). */
function addMonths(v: YMD, n: number): YMD {
  const first = new Date(v.y, v.m - 1 + n, 1);
  const last = new Date(first.getFullYear(), first.getMonth() + 1, 0).getDate();
  return { y: first.getFullYear(), m: first.getMonth() + 1, d: Math.min(v.d, last) };
}

const dayDiff = (a: YMD, b: YMD) =>
  Math.round((Date.UTC(b.y, b.m - 1, b.d) - Date.UTC(a.y, a.m - 1, a.d)) / 86_400_000);

/** Next given weekday (0 = Sunday) strictly after `from`. */
function nextWeekday(from: YMD, weekday: number): YMD {
  const cur = new Date(from.y, from.m - 1, from.d).getDay();
  return addDays(from, ((weekday - cur + 7) % 7) || 7);
}

const longDate = (v: YMD) =>
  new Date(v.y, v.m - 1, v.d).toLocaleDateString("en-US", {
    weekday: "short",
    day: "numeric",
    month: "long",
    year: "numeric",
  });

const shortDate = (v: YMD) =>
  new Date(v.y, v.m - 1, v.d).toLocaleDateString("en-US", { day: "numeric", month: "short", year: "numeric" });

function parseTime(v: string): HM | null {
  const x = /^(\d{2}):(\d{2})$/.exec(v);
  if (!x) return null;
  const h = Number(x[1]);
  const m = Number(x[2]);
  return h < 24 && m < 60 ? { h, m } : null;
}

const toHHmm = (t: HM) => `${pad(t.h)}:${pad(t.m)}`;
const h12Of = (h: number) => (h % 12 === 0 ? 12 : h % 12);
const to24 = (h12: number, pm: boolean) => (h12 % 12) + (pm ? 12 : 0);
const fmt12 = (t: HM) => `${pad(h12Of(t.h))}:${pad(t.m)} ${t.h >= 12 ? "PM" : "AM"}`;

const MONTHS = Array.from({ length: 12 }, (_, i) =>
  new Date(2000, i, 1).toLocaleDateString("en-US", { month: "long" }),
);
const WEEKDAYS = ["Su", "Mo", "Tu", "We", "Th", "Fr", "Sa"] as const;

/* ========================================================================== */
/*  Layer: popover on desktop, bottom sheet on phones                         */
/* ========================================================================== */

function useMediaQuery(query: string) {
  const [match, setMatch] = React.useState(false);
  React.useEffect(() => {
    const m = window.matchMedia(query);
    const on = () => setMatch(m.matches);
    on();
    m.addEventListener("change", on);
    return () => m.removeEventListener("change", on);
  }, [query]);
  return match;
}

type Anchor = { top: number; bottom: number; left: number; width: number };

function Layer({
  open,
  onClose,
  anchorRef,
  title,
  icon: Icon,
  width = 340,
  children,
}: {
  open: boolean;
  onClose: () => void;
  anchorRef: React.RefObject<HTMLElement | null>;
  title: string;
  icon: React.ComponentType<{ className?: string }>;
  width?: number;
  children: React.ReactNode;
}) {
  const reduce = !!useReducedMotion();
  const sheet = useMediaQuery("(max-width: 639px)");
  const [mounted, setMounted] = React.useState(false);
  const [anchor, setAnchor] = React.useState<Anchor | null>(null);
  const ref = React.useRef<HTMLDivElement>(null);

  React.useEffect(() => setMounted(true), []);

  /* keep the popover glued to its field while the page scrolls or resizes */
  React.useEffect(() => {
    if (!open) return;
    const measure = () => {
      const r = anchorRef.current?.getBoundingClientRect();
      if (!r) return;
      setAnchor((prev) =>
        prev && prev.top === r.top && prev.bottom === r.bottom && prev.left === r.left && prev.width === r.width
          ? prev
          : { top: r.top, bottom: r.bottom, left: r.left, width: r.width },
      );
    };
    measure();
    window.addEventListener("resize", measure);
    window.addEventListener("scroll", measure, true);
    return () => {
      window.removeEventListener("resize", measure);
      window.removeEventListener("scroll", measure, true);
    };
  }, [open, anchorRef]);

  /* outside click, Esc, and keep editor shortcuts (Delete, Ctrl+Z...) from firing underneath */
  React.useEffect(() => {
    if (!open) return;
    const onDown = (e: PointerEvent) => {
      const t = e.target as Node;
      if (ref.current?.contains(t) || anchorRef.current?.contains(t)) return;
      onClose();
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.stopPropagation();
        anchorRef.current?.focus();
        onClose();
        return;
      }
      const inside = ref.current?.contains(e.target as Node);
      if (inside && (e.key === "Delete" || e.key === "Backspace" || e.ctrlKey || e.metaKey)) e.stopPropagation();
    };
    document.addEventListener("pointerdown", onDown, true);
    window.addEventListener("keydown", onKey, true);
    return () => {
      document.removeEventListener("pointerdown", onDown, true);
      window.removeEventListener("keydown", onKey, true);
    };
  }, [open, onClose, anchorRef]);

  React.useEffect(() => {
    if (open) window.setTimeout(() => ref.current?.focus({ preventScroll: true }), 30);
  }, [open]);

  if (!mounted) return null;

  const vw = typeof window === "undefined" ? 1024 : window.innerWidth;
  const vh = typeof window === "undefined" ? 768 : window.innerHeight;
  const w = Math.min(width, vw - 16);
  const popStyle: React.CSSProperties = {};
  if (anchor) {
    popStyle.left = Math.min(Math.max(8, anchor.left), vw - w - 8);
    popStyle.width = w;
    const below = vh - anchor.bottom - 12;
    const above = anchor.top - 12;
    if (below < 440 && above > below) {
      popStyle.bottom = vh - anchor.top + 8;
      popStyle.maxHeight = Math.max(300, above);
    } else {
      popStyle.top = anchor.bottom + 8;
      popStyle.maxHeight = Math.max(300, below);
    }
  }

  const shell =
    "z-[120] overflow-hidden bg-white text-[#2a1002] shadow-[0_24px_60px_-18px_rgba(28,20,16,0.45)] ring-1 ring-black/[0.08] outline-none";

  return createPortal(
    <AnimatePresence>
      {open && sheet && (
        <div key="sheet" className="fixed inset-0 z-[120] flex items-end">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: reduce ? 0 : 0.18 }}
            className="absolute inset-0 bg-stone-950/45 backdrop-blur-sm"
          />
          <motion.div
            ref={ref}
            role="dialog"
            aria-modal="true"
            aria-label={title}
            tabIndex={-1}
            initial={reduce ? false : { y: "100%" }}
            animate={{ y: 0 }}
            exit={reduce ? undefined : { y: "100%" }}
            transition={{ type: "spring", damping: 34, stiffness: 380 }}
            className={cn(shell, "relative flex max-h-[90dvh] w-full flex-col rounded-t-3xl")}
          >
            <div className="flex items-center justify-between px-4 pb-1 pt-3">
              <span className="flex items-center gap-2 text-sm font-bold">
                <span className="flex size-8 items-center justify-center rounded-lg bg-orange-100 text-orange-600">
                  <Icon className="size-4" />
                </span>
                {title}
              </span>
              <button
                type="button"
                onClick={onClose}
                aria-label="Close"
                className={cn("flex size-11 items-center justify-center rounded-xl text-stone-500 hover:bg-stone-100", FOCUS)}
              >
                <X className="size-5" />
              </button>
            </div>
            <div
              data-lenis-prevent
              className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-3 pb-[max(1rem,env(safe-area-inset-bottom))]"
            >
              {children}
            </div>
          </motion.div>
        </div>
      )}
      {open && !sheet && anchor && (
        <motion.div
          key="popover"
          ref={ref}
          role="dialog"
          aria-label={title}
          tabIndex={-1}
          initial={reduce ? false : { opacity: 0, y: -6, scale: 0.98 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={reduce ? undefined : { opacity: 0, y: -6, scale: 0.98 }}
          transition={{ duration: 0.16, ease: "easeOut" }}
          style={popStyle}
          className={cn(shell, "fixed overflow-y-auto overscroll-contain rounded-2xl p-3")}
          data-lenis-prevent
        >
          {children}
        </motion.div>
      )}
    </AnimatePresence>,
    document.body,
  );
}

/* ========================================================================== */
/*  Field shell (the button you see in the form)                              */
/* ========================================================================== */

type Variant = "default" | "compact";

function PickerField({
  icon: Icon,
  title,
  display,
  placeholder,
  ariaLabel,
  variant = "default",
  className,
  width,
  children,
}: {
  icon: React.ComponentType<{ className?: string }>;
  title: string;
  display: string | null;
  placeholder: string;
  ariaLabel: string;
  variant?: Variant;
  className?: string;
  width?: number;
  children: (close: () => void) => React.ReactNode;
}) {
  const [open, setOpen] = React.useState(false);
  const btn = React.useRef<HTMLButtonElement>(null);
  const dismiss = React.useCallback(() => setOpen(false), []);
  const done = React.useCallback(() => {
    setOpen(false);
    btn.current?.focus();
  }, []);

  return (
    <>
      <button
        ref={btn}
        type="button"
        aria-label={`${ariaLabel}: ${display ?? "not set"}`}
        aria-haspopup="dialog"
        aria-expanded={open}
        data-open={open}
        onClick={() => setOpen((o) => !o)}
        className={cn(
          "group flex w-full min-w-0 items-center gap-2 rounded-xl border border-black/[0.1] bg-white px-3 text-left shadow-sm outline-none transition",
          "hover:border-orange-300 focus-visible:border-orange-500 focus-visible:ring-2 focus-visible:ring-orange-500/30",
          "data-[open=true]:border-orange-500 data-[open=true]:ring-2 data-[open=true]:ring-orange-500/20",
          variant === "compact" ? "h-10 text-[13px]" : "h-11 text-sm",
          className,
        )}
      >
        <Icon className="size-4 shrink-0 text-orange-500" />
        <span className={cn("min-w-0 flex-1 truncate font-medium", display ? "text-[#2a1002]" : "text-stone-400")}>
          {display ?? placeholder}
        </span>
        <ChevronDown
          className={cn("size-4 shrink-0 text-stone-400 transition-transform motion-reduce:transition-none", open && "rotate-180")}
        />
      </button>
      <Layer open={open} onClose={dismiss} anchorRef={btn} title={title} icon={Icon} width={width}>
        {children(done)}
      </Layer>
    </>
  );
}

const NAV_BTN =
  "flex size-11 shrink-0 items-center justify-center rounded-xl text-stone-600 transition hover:bg-orange-50 hover:text-orange-600 active:scale-95 disabled:opacity-30 sm:size-9";
const CHIP =
  "inline-flex h-11 items-center rounded-full border border-black/10 bg-white px-3 text-xs font-semibold text-stone-700 transition hover:border-orange-300 hover:text-orange-600 active:scale-95 sm:h-8";
const TEXT_BTN =
  "h-11 rounded-xl px-3 text-sm font-semibold text-stone-500 transition hover:bg-stone-100 hover:text-stone-800 sm:h-9";

/* ========================================================================== */
/*  Calendar                                                                  */
/* ========================================================================== */

type CalMode = "days" | "months" | "years";

function Calendar({
  value,
  disablePast,
  onPick,
  onClear,
  onDone,
}: {
  value: string;
  disablePast: boolean;
  onPick: (iso: string) => void;
  onClear: () => void;
  onDone: () => void;
}) {
  const t = React.useMemo(today, []);
  const sel = parseISO(value);
  const start = sel ?? t;
  const [view, setView] = React.useState({ y: start.y, m: start.m });
  const [mode, setMode] = React.useState<CalMode>("days");
  const [cursor, setCursor] = React.useState<YMD>(start);
  const [yearBase, setYearBase] = React.useState(Math.floor(start.y / 12) * 12);
  const gridRef = React.useRef<HTMLDivElement>(null);
  const kbd = React.useRef(false);
  const todayISO = toISO(t);

  const cells = React.useMemo(() => {
    const lead = new Date(view.y, view.m - 1, 1).getDay();
    return Array.from({ length: 42 }, (_, i) => fromDate(new Date(view.y, view.m - 1, 1 - lead + i)));
  }, [view]);

  /* move DOM focus only after a keyboard move, never on a mouse click */
  React.useEffect(() => {
    if (!kbd.current) return;
    kbd.current = false;
    gridRef.current?.querySelector<HTMLButtonElement>(`[data-iso="${toISO(cursor)}"]`)?.focus();
  }, [cursor, view]);

  const moveCursor = (next: YMD) => {
    kbd.current = true;
    setCursor(next);
    setView({ y: next.y, m: next.m });
  };

  const onGridKey = (e: React.KeyboardEvent) => {
    const step: Record<string, () => YMD> = {
      ArrowLeft: () => addDays(cursor, -1),
      ArrowRight: () => addDays(cursor, 1),
      ArrowUp: () => addDays(cursor, -7),
      ArrowDown: () => addDays(cursor, 7),
      PageUp: () => addMonths(cursor, -1),
      PageDown: () => addMonths(cursor, 1),
    };
    const fn = step[e.key];
    if (!fn) return;
    e.preventDefault();
    moveCursor(fn());
  };

  const shift = (dir: -1 | 1) => {
    if (mode === "days") setView((v) => fromViewMonth(addMonths({ ...v, d: 1 }, dir)));
    else if (mode === "months") setView((v) => ({ ...v, y: v.y + dir }));
    else setYearBase((b) => b + dir * 12);
  };

  const pickDay = (c: YMD) => {
    setCursor(c);
    setView({ y: c.y, m: c.m });
    onPick(toISO(c));
    onDone();
  };

  const quick = (v: YMD) => {
    onPick(toISO(v));
    moveCursor(v);
    kbd.current = false;
  };

  const focusable =
    cursor.y === view.y && cursor.m === view.m ? toISO(cursor) : toISO({ y: view.y, m: view.m, d: 1 });

  const heading =
    mode === "days" ? `${MONTHS[view.m - 1] ?? ""} ${view.y}` : mode === "months" ? String(view.y) : `${yearBase} – ${yearBase + 11}`;

  const countdown = (() => {
    if (!sel) return null;
    const n = dayDiff(t, sel);
    if (n === 0) return "Today";
    return n > 0 ? `${n} day${n === 1 ? "" : "s"} to go` : `${-n} day${n === -1 ? "" : "s"} ago`;
  })();

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between gap-1">
        <button
          type="button"
          onClick={() => setMode((m) => (m === "days" ? "months" : m === "months" ? "years" : "days"))}
          aria-label="Change month or year"
          className={cn(
            "inline-flex h-11 items-center gap-1.5 rounded-xl px-2.5 text-[15px] font-bold transition hover:bg-orange-50 sm:h-9",
            FOCUS,
          )}
        >
          {heading}
          <ChevronDown className={cn("size-4 text-stone-400 transition-transform motion-reduce:transition-none", mode !== "days" && "rotate-180")} />
        </button>
        <div className="flex items-center">
          <button type="button" onClick={() => shift(-1)} aria-label="Previous" className={cn(NAV_BTN, FOCUS)}>
            <ChevronLeft className="size-5" />
          </button>
          <button type="button" onClick={() => shift(1)} aria-label="Next" className={cn(NAV_BTN, FOCUS)}>
            <ChevronRight className="size-5" />
          </button>
        </div>
      </div>

      {mode === "days" && (
        <div>
          <div className="grid grid-cols-7 pb-1">
            {WEEKDAYS.map((d) => (
              <span key={d} className="py-1 text-center text-[11px] font-semibold text-stone-400">
                {d}
              </span>
            ))}
          </div>
          <div ref={gridRef} role="grid" aria-label={heading} onKeyDown={onGridKey} className="grid grid-cols-7 gap-y-0.5">
            {cells.map((c) => {
              const id = toISO(c);
              const inMonth = c.m === view.m;
              const isSel = !!sel && id === toISO(sel);
              const isToday = id === todayISO;
              const disabled = disablePast && id < todayISO;
              return (
                <button
                  key={id}
                  type="button"
                  role="gridcell"
                  data-iso={id}
                  tabIndex={id === focusable ? 0 : -1}
                  disabled={disabled}
                  aria-selected={isSel}
                  aria-current={isToday ? "date" : undefined}
                  aria-label={longDate(c)}
                  onClick={() => pickDay(c)}
                  className={cn(
                    "mx-auto flex size-11 items-center justify-center rounded-full text-sm font-semibold tabular-nums transition sm:size-10",
                    isSel
                      ? "bg-orange-500 text-white shadow-md shadow-orange-500/30"
                      : cn(
                          "hover:bg-orange-50 hover:text-orange-700",
                          inMonth ? "text-[#2a1002]" : "text-stone-300",
                          isToday && "text-orange-600 ring-1 ring-inset ring-orange-300",
                        ),
                    disabled && "pointer-events-none opacity-30",
                    FOCUS,
                  )}
                >
                  {c.d}
                </button>
              );
            })}
          </div>
        </div>
      )}

      {mode === "months" && (
        <div className="grid grid-cols-3 gap-1.5 py-1">
          {MONTHS.map((name, i) => (
            <button
              key={name}
              type="button"
              aria-pressed={view.m === i + 1}
              onClick={() => {
                setView((v) => ({ ...v, m: i + 1 }));
                setMode("days");
              }}
              className={cn(
                "h-12 rounded-xl text-sm font-semibold transition",
                view.m === i + 1 ? "bg-orange-500 text-white shadow-md shadow-orange-500/30" : "text-stone-700 hover:bg-orange-50",
                FOCUS,
              )}
            >
              {name.slice(0, 3)}
            </button>
          ))}
        </div>
      )}

      {mode === "years" && (
        <div className="grid grid-cols-3 gap-1.5 py-1">
          {Array.from({ length: 12 }, (_, i) => yearBase + i).map((y) => (
            <button
              key={y}
              type="button"
              aria-pressed={view.y === y}
              onClick={() => {
                setView((v) => ({ ...v, y }));
                setMode("months");
              }}
              className={cn(
                "h-12 rounded-xl text-sm font-semibold tabular-nums transition",
                view.y === y ? "bg-orange-500 text-white shadow-md shadow-orange-500/30" : "text-stone-700 hover:bg-orange-50",
                FOCUS,
              )}
            >
              {y}
            </button>
          ))}
        </div>
      )}

      <div className="flex flex-wrap gap-1.5 border-t border-black/[0.06] pt-3">
        <button type="button" className={cn(CHIP, FOCUS)} onClick={() => quick(t)}>
          Today
        </button>
        <button type="button" className={cn(CHIP, FOCUS)} onClick={() => quick(nextWeekday(t, 6))}>
          Next Saturday
        </button>
        <button type="button" className={cn(CHIP, FOCUS)} onClick={() => quick(addMonths(t, 1))}>
          In 1 month
        </button>
        <button type="button" className={cn(CHIP, FOCUS)} onClick={() => quick(addMonths(t, 3))}>
          In 3 months
        </button>
      </div>

      <div className="flex items-center justify-between gap-2 pt-1">
        <p className="min-w-0 truncate text-xs font-semibold text-stone-500" aria-live="polite">
          {sel ? `${longDate(sel)} · ${countdown}` : "No date chosen"}
        </p>
        <button type="button" onClick={onClear} disabled={!sel} className={cn(TEXT_BTN, "disabled:opacity-30", FOCUS)}>
          Clear
        </button>
      </div>
    </div>
  );
}

const fromViewMonth = (v: YMD) => ({ y: v.y, m: v.m });

/* ========================================================================== */
/*  Time wheels                                                               */
/* ========================================================================== */

type WheelItem = { id: string; label: string; on: boolean; pick: () => void };

function Wheel({ label, items, scroll = true }: { label: string; items: WheelItem[]; scroll?: boolean }) {
  const ref = React.useRef<HTMLDivElement>(null);
  const reduce = !!useReducedMotion();
  const selectedId = items.find((i) => i.on)?.id;

  /* keep the chosen row centred */
  React.useEffect(() => {
    const box = ref.current;
    if (!box || !scroll) return;
    const el = box.querySelector<HTMLElement>('[data-on="true"]');
    if (!el) return;
    box.scrollTo({ top: el.offsetTop - box.clientHeight / 2 + el.clientHeight / 2, behavior: reduce ? "auto" : "smooth" });
  }, [selectedId, scroll, reduce]);

  return (
    <div className="min-w-0">
      <p className="pb-1.5 text-center text-[11px] font-semibold text-stone-400">{label}</p>
      <div
        ref={ref}
        data-lenis-prevent
        role="group"
        aria-label={label}
        className={cn(
          "relative overflow-y-auto overscroll-contain rounded-2xl bg-stone-50 px-1 ring-1 ring-black/[0.05] [scrollbar-width:none]",
          scroll
            ? "h-56 py-[90px] [mask-image:linear-gradient(to_bottom,transparent,black_26%,black_74%,transparent)]"
            : "flex h-56 flex-col justify-center gap-1",
        )}
      >
        {items.map((i) => (
          <button
            key={i.id}
            type="button"
            data-on={i.on}
            aria-pressed={i.on}
            onClick={i.pick}
            className={cn(
              "flex h-11 w-full shrink-0 items-center justify-center rounded-xl text-[15px] font-semibold tabular-nums transition",
              i.on ? "bg-orange-500 text-white shadow-md shadow-orange-500/30" : "text-stone-700 hover:bg-orange-50 hover:text-orange-700",
              FOCUS,
            )}
          >
            {i.label}
          </button>
        ))}
      </div>
    </div>
  );
}

const PRESETS = ["10:00", "13:00", "18:00", "19:30", "20:00"] as const;

function TimeWheels({
  value,
  step,
  onPick,
  onClear,
  onDone,
}: {
  value: string;
  step: number;
  onPick: (hhmm: string) => void;
  onClear: () => void;
  onDone: () => void;
}) {
  const cur = parseTime(value);
  const base: HM = cur ?? { h: 18, m: 0 };
  const pm = base.h >= 12;

  const set = (patch: Partial<HM>) => onPick(toHHmm({ ...base, ...patch }));

  const hours: WheelItem[] = Array.from({ length: 12 }, (_, i) => i + 1).map((h) => ({
    id: `h${h}`,
    label: pad(h),
    on: !!cur && h12Of(cur.h) === h,
    pick: () => set({ h: to24(h, pm) }),
  }));

  const minuteValues = new Set<number>();
  for (let m = 0; m < 60; m += step) minuteValues.add(m);
  if (cur) minuteValues.add(cur.m);
  const minutes: WheelItem[] = [...minuteValues]
    .sort((a, b) => a - b)
    .map((m) => ({ id: `m${m}`, label: pad(m), on: !!cur && cur.m === m, pick: () => set({ m }) }));

  const meridiem: WheelItem[] = [
    { id: "am", label: "AM", on: !!cur && !pm, pick: () => set({ h: to24(h12Of(base.h), false) }) },
    { id: "pm", label: "PM", on: !!cur && pm, pick: () => set({ h: to24(h12Of(base.h), true) }) },
  ];

  const now = () => {
    const d = new Date();
    const rounded = Math.round(d.getMinutes() / step) * step;
    const total = d.getHours() * 60 + rounded;
    onPick(toHHmm({ h: Math.floor(total / 60) % 24, m: total % 60 }));
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-center rounded-2xl bg-gradient-to-br from-orange-50 via-white to-amber-50 py-3 ring-1 ring-orange-100">
        <span className="text-3xl font-bold tabular-nums tracking-tight text-[#2a1002]" aria-live="polite">
          {cur ? fmt12(cur) : "--:-- --"}
        </span>
      </div>

      <div className="grid grid-cols-[1fr_1fr_0.8fr] gap-2">
        <Wheel label="Hour" items={hours} />
        <Wheel label="Minute" items={minutes} />
        <Wheel label="AM / PM" items={meridiem} scroll={false} />
      </div>

      <div className="flex flex-wrap gap-1.5">
        {PRESETS.map((p) => {
          const t = parseTime(p);
          if (!t) return null;
          return (
            <button key={p} type="button" className={cn(CHIP, p === value && "border-orange-400 bg-orange-50 text-orange-700", FOCUS)} onClick={() => onPick(p)}>
              {fmt12(t)}
            </button>
          );
        })}
      </div>

      <div className="flex items-center justify-between gap-2 border-t border-black/[0.06] pt-2">
        <div className="flex">
          <button type="button" onClick={onClear} disabled={!cur} className={cn(TEXT_BTN, "disabled:opacity-30", FOCUS)}>
            Clear
          </button>
          <button type="button" onClick={now} className={cn(TEXT_BTN, FOCUS)}>
            Now
          </button>
        </div>
        <button
          type="button"
          onClick={onDone}
          className={cn("h-11 rounded-xl bg-orange-500 px-6 text-sm font-bold text-white shadow-sm hover:bg-orange-600 active:scale-[0.98] sm:h-9", FOCUS)}
        >
          Done
        </button>
      </div>
    </div>
  );
}

/* ========================================================================== */
/*  Public components                                                         */
/* ========================================================================== */

type FieldProps = {
  value: string;
  onChange: (v: string) => void;
  ariaLabel: string;
  placeholder?: string;
  variant?: Variant;
  className?: string;
};

/** Date field. `value` is "YYYY-MM-DD" or "". */
export function DatePickerField({
  value,
  onChange,
  ariaLabel,
  placeholder = "Pick a date",
  variant,
  className,
  disablePast = false,
}: FieldProps & { disablePast?: boolean }) {
  const parsed = parseISO(value);
  return (
    <PickerField
      icon={CalendarDays}
      title="Event date"
      display={parsed ? shortDate(parsed) : null}
      placeholder={placeholder}
      ariaLabel={ariaLabel}
      variant={variant}
      className={className}
      width={344}
    >
      {(done) => <Calendar value={value} disablePast={disablePast} onPick={onChange} onClear={() => onChange("")} onDone={done} />}
    </PickerField>
  );
}

/** Time field. `value` is "HH:mm" (24h) or "". */
export function TimePickerField({
  value,
  onChange,
  ariaLabel,
  placeholder = "Pick a time",
  variant,
  className,
  minuteStep = 5,
}: FieldProps & { minuteStep?: 1 | 5 | 10 | 15 | 30 }) {
  const parsed = parseTime(value);
  return (
    <PickerField
      icon={Clock}
      title="Event time"
      display={parsed ? fmt12(parsed) : null}
      placeholder={placeholder}
      ariaLabel={ariaLabel}
      variant={variant}
      className={className}
      width={320}
    >
      {(done) => <TimeWheels value={value} step={minuteStep} onPick={onChange} onClear={() => onChange("")} onDone={done} />}
    </PickerField>
  );
}

/** Date and time side by side. Drop-in replacement for the two native inputs. */
export function EventDateTimeFields({
  date,
  time,
  onDate,
  onTime,
  variant,
}: {
  date: string;
  time: string;
  onDate: (v: string) => void;
  onTime: (v: string) => void;
  variant?: Variant;
}) {
  return (
    <div className="grid grid-cols-2 gap-2">
      <DatePickerField ariaLabel="Event date" value={date} onChange={onDate} variant={variant} />
      <TimePickerField ariaLabel="Event time" value={time} onChange={onTime} variant={variant} />
    </div>
  );
}