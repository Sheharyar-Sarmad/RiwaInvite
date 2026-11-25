"use client";

/**
 * components/public/invitation/PublicInvitationUI.tsx
 * Presentational pieces for the guest-facing invitation page.
 *
 *  - ActionBar: floating shortcut bar (Details · Memories · Wishes · RSVP · Music).
 *  - Sheet: one accessible modal/bottom-sheet primitive (focus trap, Esc, drag-to-dismiss, scroll lock).
 *  - MemoriesSheet: every photo and video in a filterable grid that opens the lightbox.
 *  - WishesSheet: read all wishes and leave one, without leaving the page.
 *  - DetailsSheet: date, time, venue, countdown, calendar, directions, share.
 *
 * Surfaces sit on the invitation's own background (no pure white panels).
 */

import * as React from "react";
import { AnimatePresence, motion, useDragControls, useReducedMotion, useScroll, useSpring } from "framer-motion";
import {
  CalendarDays,
  CalendarPlus,
  Check,
  ChevronLeft,
  ChevronRight,
  Heart,
  Images,
  Loader2,
  MapPin,
  MessageCircle,
  Minus,
  Music,
  Play,
  Plus,
  RefreshCw,
  Send,
  Share2,
  VolumeX,
  X,
} from "lucide-react";

export const cn = (...c: (string | false | null | undefined)[]) => c.filter(Boolean).join(" ");

type Rec = Record<string, any>;

const EASE = [0.22, 1, 0.36, 1] as const;

/** Soft tinted surface used instead of white cards (light pages). */
const TILE_LIGHT = "bg-[#2a1002]/[0.05] ring-1 ring-[#2a1002]/10";
const TILE_DARK = "bg-white/10 ring-1 ring-white/10";

/* ========================================================================== */
/*  Scroll animations (same ids as the editor)                                */
/* ========================================================================== */

export type AnimId = "none" | "fade" | "fade-up" | "fade-down" | "slide-left" | "slide-right" | "zoom" | "blur";
export type AnimCfg = { type: AnimId; duration: number; delay: number };

const ANIM_FROM: Record<AnimId, Rec> = {
  none: {},
  fade: { opacity: 0 },
  "fade-up": { opacity: 0, y: 36 },
  "fade-down": { opacity: 0, y: -36 },
  "slide-left": { opacity: 0, x: -64 },
  "slide-right": { opacity: 0, x: 64 },
  zoom: { opacity: 0, scale: 0.85 },
  blur: { opacity: 0, filter: "blur(12px)" },
};

export function readAnim(content: Rec | undefined): AnimCfg {
  const a = (content?._anim ?? {}) as Rec;
  const type = (typeof a.type === "string" && a.type in ANIM_FROM ? a.type : "none") as AnimId;
  const num = (v: unknown, f: number, lo: number, hi: number) =>
    typeof v === "number" && Number.isFinite(v) ? Math.min(hi, Math.max(lo, v)) : f;
  return { type, duration: num(a.duration, 0.7, 0.2, 2), delay: num(a.delay, 0, 0, 2) };
}

/** Plays once when the item scrolls into view. `replayKey` restarts it (used when the intro closes). */
export function Reveal({
  anim,
  replayKey,
  reduce,
  children,
}: {
  anim: AnimCfg;
  replayKey: number;
  reduce: boolean;
  children: React.ReactNode;
}) {
  if (anim.type === "none" || reduce) return <>{children}</>;
  const from = ANIM_FROM[anim.type];
  const to: Rec = {};
  for (const k of Object.keys(from)) to[k] = k === "opacity" || k === "scale" ? 1 : k === "filter" ? "blur(0px)" : 0;
  return (
    <motion.div
      key={`${anim.type}-${anim.duration}-${anim.delay}-${replayKey}`}
      initial={from}
      whileInView={to}
      viewport={{ once: true, amount: 0.15 }}
      transition={{ duration: anim.duration, delay: anim.delay, ease: EASE }}
    >
      {children}
    </motion.div>
  );
}

/* ========================================================================== */
/*  Intro gate: shows the invitation's assets loading, then "Open"            */
/* ========================================================================== */

export function IntroGate({
  names,
  coverUrl,
  previews,
  loaded,
  progress,
  ready,
  hasMusic,
  dark,
  bg,
  onOpen,
}: {
  names: string;
  coverUrl: string;
  previews: string[];
  loaded: string[];
  progress: number;
  ready: boolean;
  hasMusic: boolean;
  dark: boolean;
  bg: string;
  onOpen: () => void;
}) {
  const [coverOk, setCoverOk] = React.useState(false);
  const ink = dark ? "text-white" : "text-[#2a1002]";
  const soft = dark ? "text-white/60" : "text-stone-600";
  const pct = Math.round(progress * 100);

  // The cover is server-rendered and usually already cached (it is preloaded), so it can finish
  // loading before React attaches onLoad. We therefore also trust the preload list and the
  // element's own `complete` flag, otherwise the image stays at opacity-0 forever.
  const coverShown = coverOk || (!!coverUrl && loaded.includes(coverUrl));

  return (
    <motion.div
      role="dialog"
      aria-label="Your invitation"
      className="fixed inset-0 z-[100] flex flex-col items-center justify-center overflow-hidden px-6 text-center"
      style={{ background: bg }}
      initial={{ clipPath: "circle(150% at 50% 50%)" }}
      animate={{ clipPath: "circle(150% at 50% 50%)" }}
      exit={{ clipPath: "circle(0% at 50% 88%)" }}
      transition={{ duration: 0.95, ease: [0.76, 0, 0.24, 1] }}
    >
      <div className="relative z-10 flex w-full max-w-sm flex-col items-center gap-6">
        <div className="relative h-72 w-56 overflow-hidden rounded-t-full bg-[#2a1002]/[0.06] shadow-lg ring-1 ring-black/10">
          {coverUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              ref={(el) => {
                if (el && el.complete && el.naturalWidth > 0) setCoverOk(true);
              }}
              src={coverUrl}
              alt=""
              onLoad={() => setCoverOk(true)}
              className={cn("size-full object-cover transition-opacity duration-500", coverShown ? "opacity-100" : "opacity-0")}
            />
          ) : (
            <div className="grid size-full place-items-center text-orange-500">
              <Heart className="size-10" />
            </div>
          )}
        </div>

        <div className="space-y-1">
          <p className={cn("text-[11px] font-semibold uppercase tracking-[0.3em]", soft)}>You are invited</p>
          {names && (
            <motion.h1
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.2, duration: 0.6 }}
              className={cn("text-3xl font-semibold leading-tight", ink)}
              style={{ fontFamily: "Georgia, serif" }}
            >
              {names}
            </motion.h1>
          )}
        </div>

        {previews.length > 1 && (
          <ul aria-label="Photos loading" className="flex justify-center gap-1.5">
            {previews.slice(0, 6).map((u) => {
              const on = loaded.includes(u);
              return (
                <li
                  key={u}
                  className={cn(
                    "size-9 overflow-hidden rounded-lg ring-1 ring-black/10 transition-all duration-500",
                    on ? "scale-100 opacity-100" : "scale-90 animate-pulse bg-stone-300/60 opacity-60",
                  )}
                >
                  {on && (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={u} alt="" className="size-full object-cover" />
                  )}
                </li>
              );
            })}
          </ul>
        )}

        <div className="w-full space-y-3">
          <div
            role="progressbar"
            aria-valuemin={0}
            aria-valuemax={100}
            aria-valuenow={pct}
            className={cn("h-1 w-full overflow-hidden rounded-full", dark ? "bg-white/15" : "bg-black/10")}
          >
            <div className="h-full rounded-full bg-orange-500 transition-[width] duration-300" style={{ width: `${pct}%` }} />
          </div>
          <button
            type="button"
            onClick={onOpen}
            disabled={!ready}
            className="flex h-12 w-full items-center justify-center gap-2 rounded-full bg-orange-500 text-sm font-semibold text-white shadow-md transition hover:bg-orange-600 active:scale-[0.98] disabled:bg-stone-400/70"
          >
            {ready ? (
              <>
                {hasMusic && <Music className="size-4" />} Open invitation
              </>
            ) : (
              <>
                <Loader2 className="size-4 animate-spin" /> Preparing {pct}%
              </>
            )}
          </button>
          {hasMusic && ready && <p className={cn("text-xs", soft)}>Best with sound on</p>}
        </div>
      </div>
    </motion.div>
  );
}

/* ========================================================================== */
/*  Music toggle (standalone version, the ActionBar has its own)              */
/* ========================================================================== */

function Equalizer() {
  return (
    <span aria-hidden className="flex h-4 items-end gap-[3px]">
      {[0, 1, 2, 3].map((i) => (
        <motion.span
          key={i}
          className="w-[3px] rounded-full bg-orange-500"
          animate={{ height: ["30%", "100%", "45%", "85%", "30%"] }}
          transition={{ duration: 1.1, repeat: Infinity, delay: i * 0.15, ease: "easeInOut" }}
          style={{ height: "30%" }}
        />
      ))}
    </span>
  );
}

export function MusicButton({ on, onToggle }: { on: boolean; onToggle: () => void }) {
  return (
    <button
      type="button"
      onClick={onToggle}
      aria-pressed={on}
      aria-label={on ? "Pause music" : "Play music"}
      className="fixed bottom-4 right-4 z-50 flex size-12 items-center justify-center rounded-full bg-neutral-900 text-white shadow-lg ring-1 ring-white/10 transition hover:bg-neutral-800 active:scale-95"
      style={{ marginBottom: "env(safe-area-inset-bottom)" }}
    >
      {on ? <Equalizer /> : <VolumeX className="size-5" />}
    </button>
  );
}

/* ========================================================================== */
/*  Countdown                                                                 */
/* ========================================================================== */

function parseLocal(date: string, time: string): Date | null {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) return null;
  const t = /^\d{2}:\d{2}$/.test(time) ? time : "00:00";
  const d = new Date(`${date}T${t}:00`);
  return Number.isNaN(d.getTime()) ? null : d;
}

function FlipNum({ value }: { value: string }) {
  return (
    <div className="relative h-8 overflow-hidden text-2xl font-semibold leading-8 tabular-nums">
      <AnimatePresence mode="popLayout" initial={false}>
        <motion.span
          key={value}
          className="block"
          initial={{ y: "100%", opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: "-100%", opacity: 0 }}
          transition={{ duration: 0.35, ease: "easeOut" }}
        >
          {value}
        </motion.span>
      </AnimatePresence>
    </div>
  );
}

export function Countdown({ date, time, dark }: { date: string; time: string; dark: boolean }) {
  const target = React.useMemo(() => parseLocal(date, time), [date, time]);
  const [now, setNow] = React.useState<number | null>(null);

  React.useEffect(() => {
    setNow(Date.now());
    const id = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(id);
  }, []);

  if (!target || now === null) return null;
  const diff = target.getTime() - now;
  if (diff <= 0) return null;

  const s = Math.floor(diff / 1000);
  const parts: [number, string][] = [
    [Math.floor(s / 86400), "Days"],
    [Math.floor((s % 86400) / 3600), "Hours"],
    [Math.floor((s % 3600) / 60), "Min"],
    [s % 60, "Sec"],
  ];
  return (
    <div className="grid grid-cols-4 gap-2" role="timer" aria-label="Time until the event">
      {parts.map(([n, l]) => (
        <div
          key={l}
          className={cn("rounded-2xl px-2 py-3 text-center", dark ? cn(TILE_DARK, "text-white") : cn(TILE_LIGHT, "text-[#2a1002]"))}
        >
          <FlipNum value={String(n).padStart(2, "0")} />
          <div className={cn("text-[10px] font-semibold uppercase tracking-wider", dark ? "text-white/60" : "text-stone-500")}>{l}</div>
        </div>
      ))}
    </div>
  );
}

/* ========================================================================== */
/*  Calendar / directions / share                                             */
/* ========================================================================== */

const icsEsc = (s: string) => s.replace(/\\/g, "\\\\").replace(/([,;])/g, "\\$1").replace(/\r?\n/g, "\\n");
const icsStamp = (d: Date) =>
  `${d.getFullYear()}${String(d.getMonth() + 1).padStart(2, "0")}${String(d.getDate()).padStart(2, "0")}T${String(d.getHours()).padStart(2, "0")}${String(d.getMinutes()).padStart(2, "0")}00`;

function downloadIcs(o: { title: string; date: string; time: string; location: string }) {
  const start = parseLocal(o.date, o.time);
  if (!start) return;
  const hasTime = /^\d{2}:\d{2}$/.test(o.time);
  const end = new Date(start.getTime() + 3 * 3600_000);
  const day = (d: Date) => icsStamp(d).slice(0, 8);
  const lines = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//RiwaInvite//EN",
    "BEGIN:VEVENT",
    `UID:${Date.now()}@riwainvite`,
    `DTSTAMP:${new Date().toISOString().replace(/[-:]/g, "").slice(0, 15)}Z`,
    hasTime ? `DTSTART:${icsStamp(start)}` : `DTSTART;VALUE=DATE:${day(start)}`,
    hasTime ? `DTEND:${icsStamp(end)}` : `DTEND;VALUE=DATE:${day(new Date(start.getTime() + 86400_000))}`,
    `SUMMARY:${icsEsc(o.title)}`,
    o.location ? `LOCATION:${icsEsc(o.location)}` : "",
    "END:VEVENT",
    "END:VCALENDAR",
  ].filter(Boolean);
  const blob = new Blob([lines.join("\r\n")], { type: "text/calendar;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = "invitation.ics";
  document.body.appendChild(a);
  a.click();
  a.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 1000);
}

export function ActionDock({
  title,
  date,
  time,
  venue,
  address,
  dark,
}: {
  title: string;
  date: string;
  time: string;
  venue: string;
  address: string;
  dark: boolean;
}) {
  const [copied, setCopied] = React.useState(false);
  const place = [venue, address].filter(Boolean).join(", ");
  const canCal = !!parseLocal(date, time);

  const share = async () => {
    const url = window.location.href;
    try {
      if (navigator.share) {
        await navigator.share({ title, url });
        return;
      }
      await navigator.clipboard.writeText(url);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1800);
    } catch {
      /* the user closed the share sheet */
    }
  };

  const btn = cn(
    "flex h-12 min-w-0 flex-1 items-center justify-center gap-2 rounded-full px-4 text-sm font-semibold transition active:scale-[0.98]",
    dark ? "bg-white/10 text-white ring-1 ring-white/15 hover:bg-white/15" : cn(TILE_LIGHT, "text-[#2a1002] hover:ring-orange-400/60"),
  );

  return (
    <div className="flex flex-wrap gap-2">
      {canCal && (
        <button type="button" className={btn} onClick={() => downloadIcs({ title, date, time, location: place })}>
          <CalendarPlus className="size-4 shrink-0" /> Add to calendar
        </button>
      )}
      {place && (
        <a
          className={btn}
          target="_blank"
          rel="noopener noreferrer"
          href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(place)}`}
        >
          <MapPin className="size-4 shrink-0" /> Directions
        </a>
      )}
      <button type="button" className={btn} onClick={() => void share()}>
        {copied ? <Check className="size-4 shrink-0" /> : <Share2 className="size-4 shrink-0" />}
        {copied ? "Link copied" : "Share"}
      </button>
    </div>
  );
}

/* ========================================================================== */
/*  Sheet: the one modal / bottom-sheet used by every panel                   */
/* ========================================================================== */

const FOCUSABLE = 'a[href],button:not([disabled]),textarea,input,select,[tabindex]:not([tabindex="-1"])';

export function Sheet({
  open,
  onClose,
  label,
  dark,
  title,
  subtitle,
  icon,
  hero,
  footer,
  inert = false,
  children,
}: {
  open: boolean;
  onClose: () => void;
  /** Accessible name of the dialog. */
  label: string;
  dark: boolean;
  title?: string;
  subtitle?: string;
  icon?: React.ReactNode;
  /** Replaces the default header (e.g. the RSVP header). The close button is always rendered. */
  hero?: React.ReactNode;
  /** Pinned below the scrolling body (composers, primary actions). */
  footer?: React.ReactNode;
  /** True while something sits on top (the lightbox): ignore keys and hide from assistive tech. */
  inert?: boolean;
  children: React.ReactNode;
}) {
  const reduce = !!useReducedMotion();
  const dialogRef = React.useRef<HTMLDivElement>(null);
  const controls = useDragControls();
  const closeRef = React.useRef(onClose);
  const inertRef = React.useRef(inert);
  closeRef.current = onClose;
  inertRef.current = inert;

  React.useEffect(() => {
    if (!open) return;
    const returnTo = document.activeElement as HTMLElement | null;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const focusTimer = window.setTimeout(() => dialogRef.current?.focus({ preventScroll: true }), 60);

    const key = (e: KeyboardEvent) => {
      if (inertRef.current) return;
      if (e.key === "Escape") {
        closeRef.current();
        return;
      }
      if (e.key !== "Tab") return;
      const root = dialogRef.current;
      if (!root) return;
      const items = Array.from(root.querySelectorAll<HTMLElement>(FOCUSABLE)).filter((el) => el.offsetParent !== null);
      if (!items.length) return;
      const first = items[0];
      const last = items[items.length - 1];
      const active = document.activeElement;
      if (e.shiftKey && (active === first || active === root)) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && active === last) {
        e.preventDefault();
        first.focus();
      }
    };
    window.addEventListener("keydown", key);
    return () => {
      window.clearTimeout(focusTimer);
      window.removeEventListener("keydown", key);
      document.body.style.overflow = prev;
      returnTo?.focus?.({ preventScroll: true });
    };
  }, [open]);

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          key="sheet"
          aria-hidden={inert || undefined}
          className="fixed inset-0 z-[110] flex items-end justify-center sm:items-center sm:p-6"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.25 }}
        >
          <button type="button" tabIndex={-1} aria-label="Close" onClick={onClose} className="absolute inset-0 bg-black/50" />

          <motion.div
            ref={dialogRef}
            role="dialog"
            aria-modal="true"
            aria-label={label}
            tabIndex={-1}
            className={cn(
              "relative flex max-h-[92dvh] w-full flex-col overflow-hidden rounded-t-[28px] shadow-xl outline-none sm:max-h-[86dvh] sm:max-w-md sm:rounded-[28px]",
              dark ? "bg-neutral-900 text-white ring-1 ring-white/10" : "bg-[#fff4e8] text-[#2a1002]",
            )}
            initial={reduce ? { opacity: 0 } : { y: "100%" }}
            animate={reduce ? { opacity: 1 } : { y: 0 }}
            exit={reduce ? { opacity: 0 } : { y: "100%" }}
            transition={reduce ? { duration: 0.15 } : { type: "spring", damping: 32, stiffness: 320 }}
            drag={reduce ? false : "y"}
            dragControls={controls}
            dragListener={false}
            dragConstraints={{ top: 0, bottom: 0 }}
            dragElastic={{ top: 0, bottom: 0.6 }}
            onDragEnd={(_, info) => {
              if (info.offset.y > 110 || info.velocity.y > 700) onClose();
            }}
          >
            {/* drag handle: phones only */}
            <div
              onPointerDown={(e) => controls.start(e)}
              className="absolute inset-x-0 top-0 z-20 flex h-7 cursor-grab touch-none justify-center pt-2.5 sm:hidden"
              aria-hidden
            >
              <span className={cn("h-1 w-10 rounded-full", hero ? "bg-white/50" : dark ? "bg-white/25" : "bg-black/15")} />
            </div>

            <button
              type="button"
              onClick={onClose}
              aria-label="Close"
              className={cn(
                "absolute right-3 top-3 z-20 grid size-10 place-items-center rounded-full transition active:scale-95",
                hero ? "bg-white/20 text-white hover:bg-white/30" : dark ? "bg-white/10 hover:bg-white/20" : "bg-black/[0.05] hover:bg-black/10",
              )}
            >
              <X className="size-5" />
            </button>

            {hero ?? (
              <header className={cn("shrink-0 border-b px-5 pb-4 pt-7 pr-16", dark ? "border-white/10" : "border-black/[0.08]")}>
                <div className="flex items-center gap-3">
                  {icon && <span className={cn("grid size-11 shrink-0 place-items-center rounded-2xl", dark ? "bg-orange-500/20 text-orange-300" : "bg-orange-500/10 text-orange-600")}>{icon}</span>}
                  <div className="min-w-0">
                    <h2 className="truncate text-xl font-semibold leading-tight" style={{ fontFamily: "Georgia, serif" }}>
                      {title}
                    </h2>
                    {subtitle && <p className={cn("truncate text-sm", dark ? "text-white/60" : "text-stone-500")}>{subtitle}</p>}
                  </div>
                </div>
              </header>
            )}

            <div data-lenis-prevent className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-5 py-5">
              {children}
            </div>

            {footer && (
              <div
                className={cn("shrink-0 border-t px-5 pt-3", dark ? "border-white/10 bg-neutral-900" : "border-black/[0.08] bg-[#fff4e8]")}
                style={{ paddingBottom: "max(1rem, env(safe-area-inset-bottom))" }}
              >
                {footer}
              </div>
            )}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

/* ========================================================================== */
/*  RSVP                                                                      */
/* ========================================================================== */

type Reply = "attending" | "maybe" | "declined";
const REPLIES: { v: Reply; label: string }[] = [
  { v: "attending", label: "I’ll be there" },
  { v: "maybe", label: "Maybe" },
  { v: "declined", label: "Can’t make it" },
];

export function RsvpForm({
  slug,
  dark,
  onSent,
  flat,
  onClose,
  onWish,
}: {
  slug: string;
  dark: boolean;
  onSent?: () => void;
  flat?: boolean;
  onClose?: () => void;
  /** Shown after a reply is sent: jumps to the wishes panel. */
  onWish?: () => void;
}) {
  const storeKey = `riwa:rsvp:${slug}`;
  const [name, setName] = React.useState("");
  const [status, setStatus] = React.useState<Reply>("attending");
  const [count, setCount] = React.useState(1);
  const [comment, setComment] = React.useState("");
  const [busy, setBusy] = React.useState(false);
  const [error, setError] = React.useState("");
  const [done, setDone] = React.useState<{ name: string; status: Reply } | null>(null);

  React.useEffect(() => {
    try {
      const raw = localStorage.getItem(storeKey);
      if (raw) {
        const v = JSON.parse(raw);
        if (v && typeof v.name === "string" && REPLIES.some((r) => r.v === v.status)) setDone(v);
      }
    } catch {
      /* storage can be blocked */
    }
  }, [storeKey]);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (busy) return;
    if (name.trim().length < 2) {
      setError("Please enter your name.");
      return;
    }
    setBusy(true);
    setError("");
    try {
      const res = await fetch(`/api/v1/public/invitation/${encodeURIComponent(slug)}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          guest_name: name.trim(),
          attendance_status: status,
          number_of_guests: status === "declined" ? 1 : count,
          comment: comment.trim(),
        }),
      });
      const json = await res.json().catch(() => null);
      if (!res.ok) {
        setError(json?.error?.message || json?.message || "We couldn’t send your reply. Please try again.");
        return;
      }
      const v = { name: name.trim(), status };
      setDone(v);
      onSent?.();
      try {
        localStorage.setItem(storeKey, JSON.stringify(v));
      } catch {
        /* ignore */
      }
    } catch {
      setError("We couldn’t reach the server. Check your connection and try again.");
    } finally {
      setBusy(false);
    }
  };

  const card = flat
    ? cn(dark ? "text-white" : "text-[#2a1002]")
    : cn("rounded-3xl p-5 sm:p-6", dark ? cn(TILE_DARK, "text-white") : cn(TILE_LIGHT, "text-[#2a1002]"));
  const field = cn(
    "w-full rounded-xl border px-3.5 text-sm outline-none transition focus:ring-2 focus:ring-orange-500/40",
    dark ? "border-white/15 bg-white/5 text-white placeholder:text-white/40" : "border-[#2a1002]/15 bg-[#2a1002]/[0.03] text-[#2a1002] placeholder:text-[#2a1002]/40",
  );

  if (done) {
    return (
      <div className={cn(card, "text-center")}>
        <motion.div
          initial={{ scale: 0.4, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ type: "spring", damping: 14, stiffness: 220 }}
          className="mx-auto mb-3 grid size-14 place-items-center rounded-full bg-emerald-500 text-white"
        >
          <Check className="size-7" />
        </motion.div>
        <h2 className="text-xl font-semibold" style={{ fontFamily: "Georgia, serif" }}>Thank you, {done.name}!</h2>
        <p className={cn("mt-1 text-sm", dark ? "text-white/70" : "text-stone-600")}>
          {done.status === "attending" ? "We can’t wait to celebrate with you." : done.status === "maybe" ? "We’ve noted that you might come." : "We’ll miss you."}
        </p>

        {onWish && (
          <button
            type="button"
            onClick={onWish}
            className="mx-auto mt-5 flex h-12 w-full items-center justify-center gap-2 rounded-full bg-orange-500 px-6 text-sm font-semibold text-white shadow-md transition hover:bg-orange-600 active:scale-[0.98]"
          >
            <MessageCircle className="size-4" /> Leave a wish for the hosts
          </button>
        )}
        {onClose && (
          <button
            type="button"
            onClick={onClose}
            className={cn("mx-auto mt-2 flex h-11 items-center justify-center rounded-full px-8 text-sm font-semibold transition", dark ? "text-white/70 hover:text-white" : "text-stone-600 hover:text-stone-900")}
          >
            Close
          </button>
        )}
        <button type="button" onClick={() => setDone(null)} className="mt-1 text-xs font-semibold text-orange-600 underline underline-offset-2">
          Change my reply
        </button>
      </div>
    );
  }

  return (
    <form onSubmit={submit} className={cn(card, "space-y-4")} noValidate>
      <div>
        <h2 className="text-lg font-semibold" style={{ fontFamily: "Georgia, serif" }}>Will you join us?</h2>
        <p className={cn("text-sm", dark ? "text-white/70" : "text-stone-600")}>Let the hosts know in a few seconds.</p>
      </div>

      <input
        className={cn(field, "h-12")}
        placeholder="Your name"
        aria-label="Your name"
        value={name}
        maxLength={100}
        onChange={(e) => {
          setName(e.target.value);
          if (error) setError("");
        }}
        autoComplete="name"
      />

      <div className={cn("grid grid-cols-3 gap-1 rounded-xl p-1", dark ? "bg-white/10" : "bg-[#2a1002]/[0.06]")} role="radiogroup" aria-label="Your reply">
        {REPLIES.map((r) => (
          <button
            key={r.v}
            type="button"
            role="radio"
            aria-checked={status === r.v}
            onClick={() => setStatus(r.v)}
            className={cn(
              "h-10 rounded-lg px-1 text-xs font-semibold transition",
              status === r.v ? "bg-orange-500 text-white shadow-sm" : dark ? "text-white/70 hover:text-white" : "text-stone-600 hover:text-stone-900",
            )}
          >
            {r.label}
          </button>
        ))}
      </div>

      <AnimatePresence initial={false}>
        {status !== "declined" && (
          <motion.div
            key="count"
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="overflow-hidden"
          >
            <div className="flex items-center justify-between gap-3">
              <span className="text-sm font-medium">How many of you?</span>
              <div className="flex items-center gap-2">
                <button type="button" aria-label="Fewer guests" onClick={() => setCount((n) => Math.max(1, n - 1))} className={cn("grid size-10 place-items-center rounded-full ring-1", dark ? "ring-white/20" : "ring-[#2a1002]/15")}>
                  <Minus className="size-4" />
                </button>
                <span className="w-6 text-center text-base font-semibold tabular-nums" aria-live="polite">{count}</span>
                <button type="button" aria-label="More guests" onClick={() => setCount((n) => Math.min(10, n + 1))} className={cn("grid size-10 place-items-center rounded-full ring-1", dark ? "ring-white/20" : "ring-[#2a1002]/15")}>
                  <Plus className="size-4" />
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <textarea className={cn(field, "py-3 leading-relaxed")} rows={3} maxLength={500} placeholder="A message for the hosts (optional)" aria-label="Message" value={comment} onChange={(e) => setComment(e.target.value)} />

      {error && <p role="alert" className="text-sm font-medium text-red-600">{error}</p>}

      <button type="submit" disabled={busy} className="flex h-12 w-full items-center justify-center gap-2 rounded-full bg-orange-500 text-sm font-semibold text-white shadow-md transition hover:bg-orange-600 active:scale-[0.98] disabled:opacity-70">
        {busy && <Loader2 className="size-4 animate-spin" />} Send my reply
      </button>
    </form>
  );
}

export function RsvpModal({
  open,
  onClose,
  slug,
  names,
  dark,
  onSent,
  onWish,
  inert,
}: {
  open: boolean;
  onClose: () => void;
  slug: string;
  names: string;
  dark: boolean;
  onSent: () => void;
  onWish?: () => void;
  inert?: boolean;
}) {
  return (
    <Sheet
      open={open}
      onClose={onClose}
      label="RSVP"
      dark={dark}
      inert={inert}
      hero={
        <div className="shrink-0 bg-orange-500 px-6 pb-6 pt-9 text-white">
          <p className="text-[11px] font-semibold uppercase tracking-[0.3em] text-white/80">RSVP</p>
          <h2 className="mt-1 pr-10 text-2xl font-semibold" style={{ fontFamily: "Georgia, serif" }}>{names || "You’re invited"}</h2>
        </div>
      }
    >
      <RsvpForm slug={slug} dark={dark} flat onSent={onSent} onClose={onClose} onWish={onWish} />
    </Sheet>
  );
}

/* ========================================================================== */
/*  Not found / ended                                                         */
/* ========================================================================== */

export function InvitationNotice({ kind }: { kind: "missing" | "expired" }) {
  return (
    <main className="grid min-h-dvh place-items-center bg-[#fff4e8] px-6 text-center text-[#2a1002]">
      <div className="max-w-sm space-y-3">
        <div className="mx-auto grid size-14 place-items-center rounded-full bg-orange-100 text-orange-600">
          <Heart className="size-6" />
        </div>
        <h1 className="text-2xl font-semibold" style={{ fontFamily: "Georgia, serif" }}>
          {kind === "expired" ? "This celebration has ended" : "Invitation not found"}
        </h1>
        <p className="text-sm text-stone-600">
          {kind === "expired"
            ? "This invitation is no longer open. Thank you for being part of the day."
            : "The link may be mistyped, or the host hasn’t published it yet. Please check it with the person who invited you."}
        </p>
      </div>
    </main>
  );
}

/* ========================================================================== */
/*  Wishes: shared hook, list and composer                                    */
/* ========================================================================== */

type Wish = { id: string; name: string; comment: string; created_at: string };

const WISHER_KEY = "riwa:wisher";

const AVATAR_LIGHT = [
  "bg-orange-100 text-orange-700",
  "bg-amber-100 text-amber-700",
  "bg-rose-100 text-rose-700",
  "bg-emerald-100 text-emerald-700",
  "bg-sky-100 text-sky-700",
  "bg-violet-100 text-violet-700",
];
const AVATAR_DARK = [
  "bg-orange-400/20 text-orange-200",
  "bg-amber-400/20 text-amber-200",
  "bg-rose-400/20 text-rose-200",
  "bg-emerald-400/20 text-emerald-200",
  "bg-sky-400/20 text-sky-200",
  "bg-violet-400/20 text-violet-200",
];

function hashStr(s: string) {
  let h = 0;
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) >>> 0;
  return h;
}

function initials(name: string) {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  const a = parts[0]?.[0] ?? "?";
  const b = parts.length > 1 ? parts[parts.length - 1][0] : "";
  return (a + b).toUpperCase();
}

function timeAgo(iso: string): string {
  const t = Date.parse(iso);
  if (!Number.isFinite(t)) return "";
  const diff = Math.round((t - Date.now()) / 1000);
  const abs = Math.abs(diff);
  const rtf = new Intl.RelativeTimeFormat(undefined, { numeric: "auto" });
  if (abs < 60) return "just now";
  if (abs < 3600) return rtf.format(Math.round(diff / 60), "minute");
  if (abs < 86400) return rtf.format(Math.round(diff / 3600), "hour");
  if (abs < 2_592_000) return rtf.format(Math.round(diff / 86400), "day");
  return new Date(t).toLocaleDateString(undefined, { day: "numeric", month: "short", year: "numeric" });
}

function useWishes(slug: string, refreshKey: number, active: boolean, onPosted?: () => void) {
  const api = `/api/v1/public/invitation/${encodeURIComponent(slug)}`;
  const [wishes, setWishes] = React.useState<Wish[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [failed, setFailed] = React.useState(false);
  const [tick, setTick] = React.useState(0);

  React.useEffect(() => {
    if (!active) return;
    let off = false;
    setLoading(true);
    fetch(`${api}/wishes`, { cache: "no-store" })
      .then((r) => (r.ok ? r.json() : Promise.reject(new Error("bad status"))))
      .then((j) => {
        if (off) return;
        const list: Wish[] = Array.isArray(j?.data) ? j.data : [];
        setWishes([...list].sort((a, b) => (Date.parse(b.created_at) || 0) - (Date.parse(a.created_at) || 0)));
        setFailed(false);
      })
      .catch(() => !off && setFailed(true))
      .finally(() => !off && setLoading(false));
    return () => {
      off = true;
    };
  }, [api, refreshKey, tick, active]);

  /** Resolves to an error message, or null on success. */
  const post = React.useCallback(
    async (name: string, text: string): Promise<string | null> => {
      try {
        const res = await fetch(api, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ guest_name: name, attendance_status: "pending", number_of_guests: 1, comment: text }),
        });
        const json = await res.json().catch(() => null);
        if (!res.ok) return json?.error?.message || json?.message || "We couldn’t post your message. Please try again.";
        setWishes((w) => [{ id: `local-${Date.now()}`, name, comment: text, created_at: new Date().toISOString() }, ...w]);
        if (onPosted) onPosted();
        else setTick((n) => n + 1);
        return null;
      } catch {
        return "We couldn’t reach the server. Please try again.";
      }
    },
    [api, onPosted],
  );

  return { wishes, loading, failed, retry: () => setTick((n) => n + 1), post };
}

function WishComposer({
  dark,
  post,
  rows = 2,
}: {
  dark: boolean;
  post: (name: string, text: string) => Promise<string | null>;
  rows?: number;
}) {
  const [name, setName] = React.useState("");
  const [text, setText] = React.useState("");
  const [busy, setBusy] = React.useState(false);
  const [error, setError] = React.useState("");
  const [sent, setSent] = React.useState(false);

  React.useEffect(() => {
    try {
      const v = localStorage.getItem(WISHER_KEY);
      if (v) setName(v);
    } catch {
      /* storage can be blocked */
    }
  }, []);

  const field = cn(
    "w-full rounded-xl border px-3.5 text-sm outline-none transition focus:ring-2 focus:ring-orange-500/40",
    dark ? "border-white/15 bg-white/5 text-white placeholder:text-white/40" : "border-[#2a1002]/15 bg-[#2a1002]/[0.03] text-[#2a1002] placeholder:text-[#2a1002]/40",
  );

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (busy) return;
    if (name.trim().length < 2 || text.trim().length < 2) {
      setError("Add your name and a short message.");
      return;
    }
    setBusy(true);
    setError("");
    const err = await post(name.trim(), text.trim());
    setBusy(false);
    if (err) {
      setError(err);
      return;
    }
    try {
      localStorage.setItem(WISHER_KEY, name.trim());
    } catch {
      /* ignore */
    }
    setText("");
    setSent(true);
    window.setTimeout(() => setSent(false), 2400);
  };

  return (
    <form onSubmit={submit} className="space-y-2" noValidate>
      <input className={cn(field, "h-11")} placeholder="Your name" aria-label="Your name" maxLength={100} value={name} autoComplete="name" onChange={(e) => { setName(e.target.value); if (error) setError(""); }} />
      <textarea className={cn(field, "resize-none py-3 leading-relaxed")} rows={rows} maxLength={500} placeholder="Write a message for the hosts…" aria-label="Message" value={text} onChange={(e) => { setText(e.target.value); if (error) setError(""); }} />
      {error && <p role="alert" className="text-sm font-medium text-red-600">{error}</p>}
      <div className="flex items-center gap-3">
        <span className={cn("text-xs tabular-nums", dark ? "text-white/40" : "text-stone-500")}>{text.length}/500</span>
        <button
          type="submit"
          disabled={busy}
          className={cn(
            "ml-auto flex h-11 items-center justify-center gap-2 rounded-full px-6 text-sm font-semibold text-white transition active:scale-[0.98] disabled:opacity-70",
            sent ? "bg-emerald-500" : "bg-orange-500 hover:bg-orange-600",
          )}
        >
          {busy ? <Loader2 className="size-4 animate-spin" /> : sent ? <Check className="size-4" /> : <Send className="size-4" />}
          {sent ? "Message posted" : "Post message"}
        </button>
      </div>
    </form>
  );
}

function WishList({
  wishes,
  loading,
  failed,
  retry,
  dark,
}: {
  wishes: Wish[];
  loading: boolean;
  failed: boolean;
  retry: () => void;
  dark: boolean;
}) {
  const palette = dark ? AVATAR_DARK : AVATAR_LIGHT;

  if (loading && wishes.length === 0) {
    return (
      <ul className="space-y-2.5" aria-busy="true" aria-label="Loading messages">
        {[0, 1, 2].map((i) => (
          <li key={i} className={cn("flex animate-pulse gap-3 rounded-2xl p-3.5", dark ? "bg-white/5" : "bg-[#2a1002]/[0.04]")}>
            <span className={cn("size-10 shrink-0 rounded-full", dark ? "bg-white/10" : "bg-[#2a1002]/10")} />
            <span className="flex-1 space-y-2 pt-1">
              <span className={cn("block h-3 w-1/3 rounded", dark ? "bg-white/10" : "bg-[#2a1002]/10")} />
              <span className={cn("block h-3 w-5/6 rounded", dark ? "bg-white/10" : "bg-[#2a1002]/10")} />
            </span>
          </li>
        ))}
      </ul>
    );
  }

  if (failed && wishes.length === 0) {
    return (
      <div className="py-10 text-center">
        <p className={cn("text-sm", dark ? "text-white/70" : "text-stone-600")}>We couldn’t load the messages.</p>
        <button type="button" onClick={retry} className="mx-auto mt-3 inline-flex h-10 items-center gap-2 rounded-full bg-orange-500 px-5 text-sm font-semibold text-white hover:bg-orange-600">
          <RefreshCw className="size-4" /> Try again
        </button>
      </div>
    );
  }

  if (wishes.length === 0) {
    return (
      <div className="py-10 text-center">
        <div className={cn("mx-auto mb-3 grid size-14 place-items-center rounded-full", dark ? "bg-orange-500/15 text-orange-300" : "bg-orange-500/10 text-orange-600")}>
          <Heart className="size-6" />
        </div>
        <p className="font-semibold" style={{ fontFamily: "Georgia, serif" }}>No messages yet</p>
        <p className={cn("mx-auto mt-1 max-w-[16rem] text-sm", dark ? "text-white/60" : "text-stone-500")}>Be the first to leave a few kind words for the hosts.</p>
      </div>
    );
  }

  return (
    <ul className="space-y-2.5">
      <AnimatePresence initial={false}>
        {wishes.map((w) => (
          <motion.li
            key={w.id}
            layout="position"
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.35, ease: EASE }}
            className={cn("flex gap-3 rounded-2xl p-3.5", dark ? "bg-white/5" : TILE_LIGHT)}
          >
            <span aria-hidden className={cn("grid size-10 shrink-0 place-items-center rounded-full text-sm font-semibold", palette[hashStr(w.name) % palette.length])}>
              {initials(w.name)}
            </span>
            <div className="min-w-0 flex-1">
              <div className="flex items-baseline justify-between gap-2">
                <p className="truncate text-sm font-semibold">{w.name}</p>
                <time dateTime={w.created_at} className={cn("shrink-0 text-[11px]", dark ? "text-white/40" : "text-stone-500")}>
                  {timeAgo(w.created_at)}
                </time>
              </div>
              <p className={cn("mt-0.5 whitespace-pre-wrap break-words text-sm leading-relaxed", dark ? "text-white/75" : "text-stone-700")}>{w.comment}</p>
            </div>
          </motion.li>
        ))}
      </AnimatePresence>
    </ul>
  );
}

/** Inline section at the bottom of the page. Sits on the page background, centred. */
export function Guestbook({ slug, dark, refreshKey, onPosted }: { slug: string; dark: boolean; refreshKey: number; onPosted?: () => void }) {
  const { wishes, loading, failed, retry, post } = useWishes(slug, refreshKey, true, onPosted);

  return (
    <section
      aria-label="Guest messages"
      className={cn("w-full space-y-5 px-[max(1rem,calc((100%-44rem)/2))] py-14", dark ? "text-white" : "text-[#2a1002]")}
    >
      <div className="text-center">
        <h2 className="text-2xl font-semibold" style={{ fontFamily: "Georgia, serif" }}>Wishes &amp; messages</h2>
        <p className={cn("text-sm", dark ? "text-white/60" : "text-stone-600")}>
          {wishes.length > 0 ? `${wishes.length} ${wishes.length === 1 ? "message" : "messages"} from family and friends` : "Leave a few words for the hosts"}
        </p>
      </div>
      <WishComposer dark={dark} post={post} />
      <div data-lenis-prevent className="max-h-96 overflow-y-auto overscroll-contain">
        <WishList wishes={wishes} loading={loading} failed={failed} retry={retry} dark={dark} />
      </div>
    </section>
  );
}

/** Same wishes, in a sheet: read them all and write one without leaving the page. */
export function WishesSheet({
  open,
  onClose,
  slug,
  dark,
  refreshKey,
  onPosted,
  inert,
}: {
  open: boolean;
  onClose: () => void;
  slug: string;
  dark: boolean;
  refreshKey: number;
  onPosted?: () => void;
  inert?: boolean;
}) {
  const { wishes, loading, failed, retry, post } = useWishes(slug, refreshKey, open, onPosted);

  return (
    <Sheet
      open={open}
      onClose={onClose}
      label="Wishes and messages"
      dark={dark}
      inert={inert}
      title="Wishes & messages"
      subtitle={wishes.length > 0 ? `${wishes.length} so far` : "Be the first to write"}
      icon={<MessageCircle className="size-5" />}
      footer={<WishComposer dark={dark} post={post} />}
    >
      <WishList wishes={wishes} loading={loading} failed={failed} retry={retry} dark={dark} />
    </Sheet>
  );
}

/* ========================================================================== */
/*  Gallery + lightbox (photos and videos)                                    */
/* ========================================================================== */

export type MediaItem = { type: "image" | "video"; url: string };

export function SectionTitle({ eyebrow, title, dark }: { eyebrow: string; title: string; dark: boolean }) {
  return (
    <motion.div
      className="px-4 pb-8 text-center"
      initial={{ opacity: 0, y: 24 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, amount: 0.6 }}
      transition={{ duration: 0.7, ease: EASE }}
    >
      <p className={cn("text-[11px] font-semibold uppercase tracking-[0.3em]", dark ? "text-white/60" : "text-stone-600")}>{eyebrow}</p>
      <h2 className={cn("mt-2 text-3xl font-semibold sm:text-4xl", dark ? "text-white" : "text-[#2a1002]")} style={{ fontFamily: "Georgia, serif" }}>{title}</h2>
      <span aria-hidden className="mx-auto mt-4 block h-px w-16 bg-orange-500/70" />
    </motion.div>
  );
}

const mediaSummary = (items: MediaItem[]) => {
  const photos = items.filter((m) => m.type === "image").length;
  const videos = items.length - photos;
  return [photos ? `${photos} photo${photos === 1 ? "" : "s"}` : "", videos ? `${videos} video${videos === 1 ? "" : "s"}` : ""].filter(Boolean).join(" · ");
};

/** Centred grid: a few items stay in the middle instead of leaving an empty column on the right. */
export function Gallery({ items, dark, onOpen }: { items: MediaItem[]; dark: boolean; onOpen: (i: number) => void }) {
  const reduce = !!useReducedMotion();
  if (items.length === 0) return null;
  const cols = Math.min(4, items.length);

  return (
    <section aria-label="Gallery" className="w-full py-14">
      <SectionTitle eyebrow={mediaSummary(items)} title="Our moments" dark={dark} />
      <div
        style={{ "--cols": cols } as React.CSSProperties}
        className="mx-auto flex max-w-5xl flex-wrap justify-center gap-2 px-4"
      >
        {items.map((m, i) => (
          <motion.button
            key={m.url}
            type="button"
            onClick={() => onOpen(i)}
            aria-label={`Open ${m.type} ${i + 1} of ${items.length}`}
            initial={reduce ? false : { opacity: 0, y: 28 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, amount: 0.15 }}
            transition={{ duration: 0.6, delay: (i % 4) * 0.06, ease: EASE }}
            className="group relative aspect-square w-[calc(50%-0.25rem)] max-w-[28rem] overflow-hidden rounded-xl bg-[#2a1002]/10 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-orange-500/60 md:w-[calc(100%/var(--cols)-0.5rem)]"
          >
            {m.type === "image" ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={m.url} alt="" loading="lazy" decoding="async" className="size-full object-cover transition duration-500 ease-out group-hover:scale-105" />
            ) : (
              <video src={`${m.url}#t=0.5`} muted playsInline preload="metadata" className="size-full object-cover transition duration-500 ease-out group-hover:scale-105" />
            )}
            {m.type === "video" && (
              <span aria-hidden className="absolute inset-0 grid place-items-center">
                <span className="grid size-14 place-items-center rounded-full bg-white/90 text-orange-600 shadow-lg">
                  <Play className="size-6 translate-x-0.5 fill-current" />
                </span>
              </span>
            )}
          </motion.button>
        ))}
      </div>
    </section>
  );
}

/** Every photo and video in a sheet. Picking one opens the lightbox on top. */
export function MemoriesSheet({
  open,
  onClose,
  items,
  dark,
  onPick,
  inert,
}: {
  open: boolean;
  onClose: () => void;
  items: MediaItem[];
  dark: boolean;
  /** Receives the index in the full `items` array. */
  onPick: (i: number) => void;
  inert?: boolean;
}) {
  const [filter, setFilter] = React.useState<"all" | "image" | "video">("all");
  const photos = items.filter((m) => m.type === "image").length;
  const videos = items.length - photos;

  React.useEffect(() => {
    if (open) setFilter("all");
  }, [open]);

  const shown = items.map((m, i) => ({ m, i })).filter(({ m }) => filter === "all" || m.type === filter);
  const tabs: { v: "all" | "image" | "video"; label: string; n: number }[] = [
    { v: "all", label: "All", n: items.length },
    { v: "image", label: "Photos", n: photos },
    { v: "video", label: "Videos", n: videos },
  ];

  return (
    <Sheet
      open={open}
      onClose={onClose}
      label="Memories"
      dark={dark}
      inert={inert}
      title="Memories"
      subtitle={mediaSummary(items)}
      icon={<Images className="size-5" />}
    >
      {photos > 0 && videos > 0 && (
        <div role="tablist" aria-label="Filter memories" className={cn("mb-4 grid grid-cols-3 gap-1 rounded-xl p-1", dark ? "bg-white/10" : "bg-[#2a1002]/[0.06]")}>
          {tabs.map((t) => (
            <button
              key={t.v}
              type="button"
              role="tab"
              aria-selected={filter === t.v}
              onClick={() => setFilter(t.v)}
              className={cn(
                "h-9 rounded-lg text-xs font-semibold transition",
                filter === t.v ? "bg-orange-500 text-white shadow-sm" : dark ? "text-white/70 hover:text-white" : "text-stone-600 hover:text-stone-900",
              )}
            >
              {t.label} <span className="tabular-nums opacity-70">{t.n}</span>
            </button>
          ))}
        </div>
      )}

      {shown.length === 0 ? (
        <p className={cn("py-10 text-center text-sm", dark ? "text-white/60" : "text-stone-500")}>Nothing here yet.</p>
      ) : (
        <div className="grid grid-cols-3 gap-1.5">
          {shown.map(({ m, i }, k) => {
            const feature = filter === "all" && shown.length >= 5 && k === 0;
            return (
              <button
                key={m.url}
                type="button"
                onClick={() => onPick(i)}
                aria-label={`Open ${m.type} ${i + 1} of ${items.length}`}
                className={cn(
                  "group relative aspect-square overflow-hidden rounded-xl bg-[#2a1002]/10 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-orange-500/60",
                  feature && "col-span-2 row-span-2",
                )}
              >
                {m.type === "image" ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={m.url} alt="" loading="lazy" decoding="async" className="size-full object-cover transition duration-500 group-hover:scale-105" />
                ) : (
                  <>
                    <video src={`${m.url}#t=0.5`} muted playsInline preload="metadata" className="size-full object-cover transition duration-500 group-hover:scale-105" />
                    <span aria-hidden className="absolute inset-0 grid place-items-center bg-black/15">
                      <span className="grid size-10 place-items-center rounded-full bg-white/90 text-orange-600 shadow-md">
                        <Play className="size-4 translate-x-px fill-current" />
                      </span>
                    </span>
                  </>
                )}
              </button>
            );
          })}
        </div>
      )}
    </Sheet>
  );
}

export function Lightbox({
  items,
  index,
  onIndex,
  onClose,
  onVideo,
}: {
  items: MediaItem[];
  index: number | null;
  onIndex: (i: number) => void;
  onClose: () => void;
  onVideo?: (playing: boolean) => void;
}) {
  const [dir, setDir] = React.useState(1);
  const open = index !== null && items[index] !== undefined;
  const n = items.length;

  const go = React.useCallback(
    (d: 1 | -1) => {
      if (index === null || n < 2) return;
      setDir(d);
      onIndex((index + d + n) % n);
    },
    [index, n, onIndex],
  );

  React.useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const key = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
      else if (e.key === "ArrowRight") go(1);
      else if (e.key === "ArrowLeft") go(-1);
    };
    window.addEventListener("keydown", key);
    return () => {
      document.body.style.overflow = prev;
      window.removeEventListener("keydown", key);
    };
  }, [open, go, onClose]);

  const item = open && index !== null ? items[index] : null;
  const variants = {
    enter: (d: number) => ({ x: d * 90, opacity: 0, scale: 0.94 }),
    center: { x: 0, opacity: 1, scale: 1 },
    exit: (d: number) => ({ x: -d * 90, opacity: 0, scale: 0.94 }),
  };

  return (
    <AnimatePresence>
      {open && item && index !== null && (
        <motion.div
          key="lightbox"
          role="dialog"
          aria-modal="true"
          aria-label="Gallery viewer"
          className="fixed inset-0 z-[120] flex flex-col bg-black/95"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.3 }}
        >
          <div className="flex h-14 shrink-0 items-center justify-between px-4 text-white">
            <span className="text-sm font-semibold tabular-nums">{index + 1} / {n}</span>
            <button type="button" onClick={onClose} aria-label="Close viewer" className="grid size-11 place-items-center rounded-full bg-white/10 hover:bg-white/20">
              <X className="size-5" />
            </button>
          </div>

          <div className="relative min-h-0 flex-1 overflow-hidden">
            <AnimatePresence initial={false} custom={dir} mode="popLayout">
              <motion.div
                key={index}
                custom={dir}
                variants={variants}
                initial="enter"
                animate="center"
                exit="exit"
                transition={{ duration: 0.4, ease: EASE }}
                drag={item.type === "image" && n > 1 ? "x" : false}
                dragConstraints={{ left: 0, right: 0 }}
                dragElastic={0.3}
                onDragEnd={(_, info) => {
                  if (info.offset.x < -80) go(1);
                  else if (info.offset.x > 80) go(-1);
                }}
                className="absolute inset-0 flex items-center justify-center p-1 sm:p-6"
              >
                {item.type === "image" ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={item.url} alt="" draggable={false} className="max-h-full max-w-full select-none rounded-lg object-contain" />
                ) : (
                  <video
                    src={item.url}
                    controls
                    autoPlay
                    playsInline
                    onPlay={() => onVideo?.(true)}
                    onPause={() => onVideo?.(false)}
                    onEnded={() => onVideo?.(false)}
                    className="max-h-full max-w-full rounded-lg bg-black"
                  />
                )}
              </motion.div>
            </AnimatePresence>

            {n > 1 && (
              <>
                <button type="button" onClick={() => go(-1)} aria-label="Previous" className="absolute left-2 top-1/2 z-10 grid size-12 -translate-y-1/2 place-items-center rounded-full bg-white/10 text-white hover:bg-white/25">
                  <ChevronLeft className="size-6" />
                </button>
                <button type="button" onClick={() => go(1)} aria-label="Next" className="absolute right-2 top-1/2 z-10 grid size-12 -translate-y-1/2 place-items-center rounded-full bg-white/10 text-white hover:bg-white/25">
                  <ChevronRight className="size-6" />
                </button>
              </>
            )}
          </div>

          {n > 1 && (
            <ul data-lenis-prevent className="flex h-20 shrink-0 gap-1.5 overflow-x-auto overscroll-contain px-3 py-2.5">
              {items.map((m, i) => (
                <li key={m.url} className="shrink-0">
                  <button
                    type="button"
                    aria-label={`Show ${m.type} ${i + 1}`}
                    aria-current={i === index}
                    onClick={() => {
                      setDir(i > index ? 1 : -1);
                      onIndex(i);
                    }}
                    className={cn("relative size-14 overflow-hidden rounded-lg transition", i === index ? "ring-2 ring-orange-500" : "opacity-50 hover:opacity-90")}
                  >
                    {m.type === "image" ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={m.url} alt="" loading="lazy" className="size-full object-cover" />
                    ) : (
                      <>
                        <video src={`${m.url}#t=0.5`} muted preload="metadata" className="size-full object-cover" />
                        <Play className="absolute inset-0 m-auto size-4 fill-white text-white" />
                      </>
                    )}
                  </button>
                </li>
              ))}
            </ul>
          )}
        </motion.div>
      )}
    </AnimatePresence>
  );
}

/* ========================================================================== */
/*  Details sheet: when, where, countdown, calendar, directions, share        */
/* ========================================================================== */

export function DetailsSheet({
  open,
  onClose,
  title,
  date,
  time,
  venue,
  address,
  dark,
  inert,
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  date: string;
  time: string;
  venue: string;
  address: string;
  dark: boolean;
  inert?: boolean;
}) {
  const when = parseLocal(date, time);
  const dateText = when ? when.toLocaleDateString(undefined, { weekday: "long", day: "numeric", month: "long", year: "numeric" }) : "";
  const timeText = when && /^\d{2}:\d{2}$/.test(time) ? when.toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit" }) : "";
  const place = [venue, address].filter(Boolean).join(", ");
  const tile = cn("flex items-start gap-3 rounded-2xl p-4", dark ? "bg-white/5" : TILE_LIGHT);
  const chip = cn("grid size-10 shrink-0 place-items-center rounded-xl", dark ? "bg-orange-500/20 text-orange-300" : "bg-orange-500/10 text-orange-600");
  const soft = dark ? "text-white/60" : "text-stone-600";

  return (
    <Sheet open={open} onClose={onClose} label="Event details" dark={dark} inert={inert} title="Event details" subtitle={title} icon={<CalendarDays className="size-5" />}>
      <div className="space-y-4">
        <Countdown date={date} time={time} dark={dark} />

        {dateText && (
          <div className={tile}>
            <span className={chip}><CalendarDays className="size-5" /></span>
            <div className="min-w-0">
              <p className="font-semibold leading-snug">{dateText}</p>
              {timeText && <p className={cn("text-sm", soft)}>{timeText}</p>}
            </div>
          </div>
        )}

        {place && (
          <div className={tile}>
            <span className={chip}><MapPin className="size-5" /></span>
            <div className="min-w-0">
              {venue && <p className="font-semibold leading-snug">{venue}</p>}
              {address && <p className={cn("text-sm", soft)}>{address}</p>}
            </div>
          </div>
        )}

        <ActionDock title={title} date={date} time={time} venue={venue} address={address} dark={dark} />
      </div>
    </Sheet>
  );
}

/* ========================================================================== */
/*  Action bar: floating shortcuts that open the sheets                       */
/* ========================================================================== */

export type PanelId = "details" | "memories" | "wishes" | "rsvp";

function BarItem({
  label,
  icon,
  active,
  dark,
  onClick,
}: {
  label: string;
  icon: React.ReactNode;
  active: boolean;
  dark: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-haspopup="dialog"
      aria-expanded={active}
      className={cn(
        "flex h-12 w-[3.35rem] flex-col items-center justify-center gap-0.5 rounded-full text-[10px] font-semibold transition active:scale-95",
        dark ? "text-white/80 hover:bg-white/10 hover:text-white" : "text-stone-700 hover:bg-black/[0.05] hover:text-stone-900",
      )}
    >
      <span className="[&>svg]:size-[18px]">{icon}</span>
      {label}
    </button>
  );
}

export function ActionBar({
  visible,
  active,
  dark,
  hasDetails,
  hasMemories,
  music,
  onOpen,
}: {
  visible: boolean;
  active: PanelId | null;
  dark: boolean;
  hasDetails: boolean;
  hasMemories: boolean;
  music: { on: boolean; toggle: () => void } | null;
  onOpen: (p: PanelId) => void;
}) {
  const reduce = !!useReducedMotion();

  return (
    <AnimatePresence>
      {visible && (
        <motion.nav
          key="action-bar"
          aria-label="Invitation shortcuts"
          className="pointer-events-none fixed inset-x-0 bottom-0 z-50 flex justify-center px-3"
          style={{ paddingBottom: "max(0.75rem, env(safe-area-inset-bottom))" }}
          initial={reduce ? { opacity: 0 } : { y: 90, opacity: 0 }}
          animate={reduce ? { opacity: 1 } : { y: 0, opacity: 1 }}
          exit={reduce ? { opacity: 0 } : { y: 90, opacity: 0 }}
          transition={{ type: "spring", damping: 26, stiffness: 280, delay: 0.5 }}
        >
          <div
            className={cn(
              "pointer-events-auto flex max-w-full items-center gap-0.5 rounded-full p-1.5 shadow-lg ring-1",
              dark ? "bg-neutral-900 ring-white/10" : "bg-[#fff4e8] ring-black/10",
            )}
          >
            {hasDetails && <BarItem label="Details" icon={<CalendarDays />} active={active === "details"} dark={dark} onClick={() => onOpen("details")} />}
            {hasMemories && <BarItem label="Memories" icon={<Images />} active={active === "memories"} dark={dark} onClick={() => onOpen("memories")} />}
            <BarItem label="Wishes" icon={<MessageCircle />} active={active === "wishes"} dark={dark} onClick={() => onOpen("wishes")} />

            <button
              type="button"
              onClick={() => onOpen("rsvp")}
              aria-haspopup="dialog"
              aria-expanded={active === "rsvp"}
              className="ml-1 flex h-12 items-center gap-2 rounded-full bg-orange-500 px-5 text-sm font-semibold text-white shadow-md transition hover:bg-orange-600 active:scale-95"
            >
              <Heart className="size-4 fill-white" /> RSVP
            </button>

            {music && (
              <button
                type="button"
                onClick={music.toggle}
                aria-pressed={music.on}
                aria-label={music.on ? "Pause music" : "Play music"}
                className={cn(
                  "ml-0.5 grid size-12 shrink-0 place-items-center rounded-full transition active:scale-95",
                  dark ? "text-white/80 hover:bg-white/10" : "text-stone-700 hover:bg-black/[0.05]",
                )}
              >
                {music.on ? <Equalizer /> : <VolumeX className="size-[18px]" />}
              </button>
            )}
          </div>
        </motion.nav>
      )}
    </AnimatePresence>
  );
}

/* ========================================================================== */
/*  Scroll progress                                                           */
/* ========================================================================== */

export function ScrollProgress() {
  const { scrollYProgress } = useScroll();
  const x = useSpring(scrollYProgress, { stiffness: 120, damping: 28, mass: 0.4 });
  return <motion.div aria-hidden className="fixed inset-x-0 top-0 z-[60] h-1 origin-left bg-orange-500" style={{ scaleX: x }} />;
}