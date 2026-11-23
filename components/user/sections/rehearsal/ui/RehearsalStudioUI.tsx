"use client";

/**
 * components/user/sections/rehearsal/ui/RehearsalStudioUI.tsx
 *
 * Rehearsal-specific UI. Visual language mirrors LibraryUI: solid white
 * surfaces, hairline rings, orange for brand actions, ink for selection.
 *
 * Contains: save badge, guide banner, stats + filters, drafts strip,
 * template picker, AI panel (Ideas + Auto-builder), delete-draft modal.
 *
 * Moved out of this file:
 *   - RehearsalTopBar (+ Create invitation dialog)  -> ./RehearsalTopBar
 *   - GuideModal                                    -> ./GuideModal
 *   - RehearsalTemplateCard / PickerThumb           -> ./TemplateCard
 *   - date and time pickers                         -> ./DateTimePicker
 *
 * Every scrollable area carries `data-lenis-prevent` so Lenis smooth scroll
 * never blocks wheel / touch scrolling inside panels and modals.
 *
 * ⚠ Verify this import path against your repo:
 *   "@/components/user/sections/library/ui/LibraryUI"
 */

import * as React from "react";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import {
  AlertTriangle,
  BadgeCheck,
  Bot,
  BookOpen,
  Check,
  Copy,
  HelpCircle,
  LayoutGrid,
  Loader2,
  Lock,
  MessageCircle,
  PenTool,
  Play,
  Save,
  Send,
  Trash2,
  Undo2,
  Users,
  X,
  type LucideIcon,
} from "lucide-react";
import { FOCUS } from "@/components/user/navigation/UserSidebar";
import { BTN, EASE, ErrorCard, HEADING, cn } from "@/components/user/sections/dashboard/ui/DashboardUI";
import {
  GRID_CLASS,
  GridSkeleton,
  IcImageOff,
  SURFACE,
} from "@/components/user/sections/library/ui/LibraryUI";
import type { AiSuggestion, EditorBarApi } from "./RehearsalEditor";
import { EventDateTimeFields } from "./DateTimePicker";
import { RehearsalTemplateCard } from "./TemplateCard";

/* ========================================================================== */
/*  Types                                                                     */
/* ========================================================================== */

export type SaveState = "idle" | "dirty" | "saving" | "saved" | "error";
export type AiMode = "ideas" | "builder";
export type OwnershipTab = "all" | "owned" | "unowned";

export type ChatMessage = {
  id: string;
  role: "user" | "assistant";
  text: string;
  suggestions?: AiSuggestion[];
  /** Builder mode: how many things the AI changed. */
  applied?: number;
  error?: boolean;
};

export type BuilderValues = {
  bride: string;
  groom: string;
  date: string;
  time: string;
  venue: string;
  address: string;
};

export type PublicTemplate = {
  id: string;
  name: string;
  description: string;
  category_name: string;
  thumbnail_url: string;
  is_premium: boolean;
  price: number;
  /** true when the user bought it (from the library API). */
  owned?: boolean;
  /** true when the purchase includes a custom invitation link (from the library API). */
  has_custom_slug?: boolean;
};

/** A rehearsal the user already started (read from this device). */
export type DraftSummary = {
  templateId: string;
  name: string;
  thumb: string;
  updatedAt: number;
  unsynced: boolean;
  owned?: boolean;
};

export type BuilderBarApi = EditorBarApi;

const HAIRLINE = "border-black/[0.08]";
const ICON_BTN =
  "flex size-8 shrink-0 items-center justify-center rounded-lg text-stone-500 transition hover:bg-orange-50 hover:text-orange-600 active:scale-95 disabled:pointer-events-none disabled:opacity-30 sm:size-9";

function timeAgo(ts: number): string {
  const s = Math.max(0, Math.round((Date.now() - ts) / 1000));
  if (s < 60) return "just now";
  const m = Math.round(s / 60);
  if (m < 60) return `${m} min ago`;
  const h = Math.round(m / 60);
  if (h < 24) return `${h} hr ago`;
  const d = Math.round(h / 24);
  return `${d} day${d === 1 ? "" : "s"} ago`;
}

/* ========================================================================== */
/*  Asset tracker                                                             */
/*  Collects Cloudinary URLs uploaded during this session so the save API     */
/*  can record them. Cleanup happens server-side when the draft is deleted.   */
/* ========================================================================== */

export function useAssetTracker(max = 100) {
  const urlsRef = React.useRef<string[]>([]);
  const [count, setCount] = React.useState(0);

  const track = React.useCallback(
    (url: string) => {
      if (typeof url !== "string" || !url.startsWith("https://")) return;
      if (urlsRef.current.includes(url)) return;
      urlsRef.current = [...urlsRef.current, url].slice(-max);
      setCount(urlsRef.current.length);
    },
    [max],
  );

  const reset = React.useCallback(
    (urls: string[]) => {
      urlsRef.current = Array.from(new Set(urls.filter((u) => typeof u === "string"))).slice(-max);
      setCount(urlsRef.current.length);
    },
    [max],
  );

  return { urlsRef, count, track, reset };
}

export function AssetTracker({ count }: { count: number }) {
  return (
    <span className="sr-only" role="status" aria-live="polite">
      {count} uploaded {count === 1 ? "asset" : "assets"} in this draft
    </span>
  );
}

/* ========================================================================== */
/*  Save status                                                               */
/* ========================================================================== */

const SAVE_META: Record<SaveState, { label: string; short: string; cls: string }> = {
  idle: { label: "Draft", short: "Draft", cls: "bg-stone-100 text-stone-600 ring-black/[0.06]" },
  dirty: { label: "Unsaved changes", short: "Unsaved", cls: "bg-amber-50 text-amber-700 ring-amber-200" },
  saving: { label: "Saving…", short: "Saving", cls: "bg-orange-50 text-orange-700 ring-orange-200" },
  saved: { label: "Saved", short: "Saved", cls: "bg-emerald-50 text-emerald-700 ring-emerald-200" },
  error: { label: "Safe on this device", short: "Offline", cls: "bg-rose-50 text-rose-700 ring-rose-200" },
};

export function SaveStatusBadge({ state, savedAt }: { state: SaveState; savedAt?: number | null }) {
  const meta = SAVE_META[state];
  const time =
    state === "saved" && savedAt
      ? new Date(savedAt).toLocaleTimeString([], { hour: "numeric", minute: "2-digit" })
      : null;

  return (
    <span
      role="status"
      aria-live="polite"
      title={state === "error" ? "We couldn’t reach the server. Your work is kept on this device and will retry." : undefined}
      className={cn(
        "inline-flex h-7 items-center gap-1.5 whitespace-nowrap rounded-full px-2 text-[11px] font-semibold ring-1 sm:px-2.5",
        meta.cls,
      )}
    >
      {state === "saving" && <Loader2 className="size-3 animate-spin motion-reduce:animate-none" />}
      {state === "saved" && <Check className="size-3" />}
      {state === "dirty" && <span aria-hidden className="size-1.5 rounded-full bg-amber-500" />}
      {state === "error" && <AlertTriangle className="size-3" />}
      <span className="max-sm:hidden">{meta.label}</span>
      <span className="sm:hidden">{meta.short}</span>
      {time && <span className="font-medium tabular-nums opacity-70 max-md:hidden">{time}</span>}
    </span>
  );
}

/* ========================================================================== */
/*  Shared modal focus handling                                               */
/* ========================================================================== */

function useModalFocus(open: boolean, initial: React.RefObject<HTMLElement | null>) {
  React.useEffect(() => {
    if (!open) return;
    const prev = document.activeElement as HTMLElement | null;
    initial.current?.focus();
    return () => prev?.focus?.();
  }, [open, initial]);
}

function trapTab(e: React.KeyboardEvent, root: HTMLElement | null) {
  if (e.key !== "Tab") return;
  const nodes = root?.querySelectorAll<HTMLElement>("button:not(:disabled)");
  if (!nodes || nodes.length === 0) return;
  const first = nodes[0];
  const last = nodes[nodes.length - 1];
  if (!first || !last) return;
  if (e.shiftKey && document.activeElement === first) {
    e.preventDefault();
    last.focus();
  } else if (!e.shiftKey && document.activeElement === last) {
    e.preventDefault();
    first.focus();
  }
}

/* ========================================================================== */
/*  Delete-draft confirmation                                                 */
/* ========================================================================== */

export function DiscardConfirmModal({
  open,
  busy,
  name,
  onCancel,
  onConfirm,
}: {
  open: boolean;
  busy: boolean;
  /** Template name, shown in the text when known. */
  name?: string;
  onCancel: () => void;
  onConfirm: () => void;
}) {
  const dialogRef = React.useRef<HTMLDivElement>(null);
  const cancelRef = React.useRef<HTMLButtonElement>(null);
  useModalFocus(open, cancelRef);

  const onKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Escape") {
      e.stopPropagation();
      if (!busy) onCancel();
      return;
    }
    trapTab(e, dialogRef.current);
  };

  return (
    <AnimatePresence>
      {open && (
        <div className="fixed inset-0 z-[90] flex items-end justify-center sm:items-center sm:p-6">
          <motion.div
            key="discard-backdrop"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            onClick={() => !busy && onCancel()}
            className="absolute inset-0 bg-stone-950/40 backdrop-blur-sm"
          />
          <motion.div
            key="discard-panel"
            ref={dialogRef}
            role="alertdialog"
            aria-modal="true"
            aria-labelledby="discard-title"
            aria-describedby="discard-desc"
            onKeyDown={onKeyDown}
            initial={{ opacity: 0, y: 40 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 40 }}
            transition={{ type: "spring", damping: 34, stiffness: 380 }}
            className="relative w-full rounded-t-3xl bg-white p-5 text-[#2a1002] shadow-2xl ring-1 ring-black/[0.06] sm:max-w-md sm:rounded-3xl sm:p-6"
          >
            <span className="flex size-11 items-center justify-center rounded-full bg-rose-50 text-rose-600 ring-1 ring-rose-100">
              <AlertTriangle className="size-5" />
            </span>
            <h2 id="discard-title" className={cn(HEADING, "mt-3 text-lg tracking-[-0.01em]")}>
              Not buying{name ? ` “${name}”` : ""}? Delete this draft
            </h2>
            <p id="discard-desc" className="mt-1.5 text-[13px] leading-relaxed text-stone-600 sm:text-sm">
              Your edits and every photo, song or video you uploaded for this rehearsal are deleted right away, from
              this device and from our servers. This can’t be undone.
            </p>
            <div className="mt-5 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
              <button
                ref={cancelRef}
                type="button"
                onClick={onCancel}
                disabled={busy}
                className={cn(
                  "h-11 rounded-xl border bg-white px-4 text-sm font-semibold text-[#2a1002] transition hover:border-black/20 hover:bg-stone-50 disabled:opacity-50",
                  HAIRLINE,
                  FOCUS,
                )}
              >
                Keep it
              </button>
              <button
                type="button"
                onClick={onConfirm}
                disabled={busy}
                className={cn(
                  "inline-flex h-11 items-center justify-center gap-2 rounded-xl bg-rose-600 px-4 text-sm font-bold text-white shadow-sm transition hover:bg-rose-700 active:scale-[0.98] disabled:opacity-60",
                  FOCUS,
                )}
              >
                {busy ? <Loader2 className="size-4 animate-spin motion-reduce:animate-none" /> : <Trash2 className="size-4" />}
                {busy ? "Deleting…" : "Yes, delete everything"}
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}

/** Prominent card on the template page that asks the user to read the guide. */
export function GuideBanner({ seen, onOpen }: { seen: boolean; onOpen: () => void }) {
  if (seen) {
    return (
      <button
        type="button"
        onClick={onOpen}
        className={cn("inline-flex items-center gap-1.5 rounded-lg px-2 py-1.5 text-xs font-semibold text-stone-500 hover:bg-orange-50 hover:text-orange-600", FOCUS)}
      >
        <HelpCircle className="size-4" /> How does this work?
      </button>
    );
  }
  return (
    <div className="flex flex-col gap-3 rounded-2xl border border-orange-200 bg-gradient-to-r from-orange-50 to-amber-50 p-4 sm:flex-row sm:items-center sm:justify-between sm:p-5">
      <div className="flex items-start gap-3">
        <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-orange-500 text-white shadow-sm">
          <BookOpen className="size-5" />
        </span>
        <div>
          <p className={cn(HEADING, "text-base leading-5 text-[#2a1002]")}>New here? Read the 2-minute guide</p>
          <p className="mt-0.5 text-[13px] leading-snug text-stone-600">
            Learn how to edit with a few taps, let the AI build your layout, add scroll animations and delete a draft
            you don’t want.
          </p>
        </div>
      </div>
      <button type="button" onClick={onOpen} className={cn(BTN, "h-10 shrink-0 rounded-xl px-5 text-sm", FOCUS)}>
        Open the guide
      </button>
    </div>
  );
}

/* ========================================================================== */
/*  AI panel: Ideas + Auto-builder                                            */
/* ========================================================================== */

const IDEA_STARTERS = [
  "Suggest a warmer colour palette",
  "Pair fonts for an elegant look",
  "Make my title stand out",
  "Improve the wording tone",
] as const;

const BUILDER_STARTERS = [
  "Centre everything and make the names big and elegant",
  "Date and venue small and gold, under the names",
  "Dark midnight look with gold headings",
  "Align everything left with a modern font",
] as const;

function TypingIndicator() {
  const reduce = useReducedMotion();
  return (
    <div
      role="status"
      aria-label="Assistant is working"
      className="flex w-fit items-center gap-1 rounded-2xl rounded-bl-md bg-stone-100 px-3.5 py-3"
    >
      {[0, 1, 2].map((i) => (
        <motion.span
          key={i}
          className="size-1.5 rounded-full bg-stone-400"
          animate={reduce ? undefined : { y: [0, -3, 0], opacity: [0.5, 1, 0.5] }}
          transition={reduce ? undefined : { duration: 0.9, repeat: Infinity, delay: i * 0.15 }}
        />
      ))}
    </div>
  );
}

function SuggestionCard({
  s,
  onCopy,
  onApply,
}: {
  s: AiSuggestion;
  onCopy: (css: string) => void;
  onApply: (s: AiSuggestion) => number;
}) {
  const [result, setResult] = React.useState<number | null>(null);
  const css = Object.entries(s.styles)
    .map(([k, v]) => `${k}: ${v};`)
    .join("\n");
  return (
    <div className="rounded-xl border border-orange-100 bg-[#fffafb] p-2.5">
      <div className="flex items-center justify-between gap-2">
        <span className="text-[11px] font-semibold uppercase tracking-[0.06em] text-orange-700">{s.target}</span>
        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={() => onCopy(css)}
            aria-label={`Copy CSS for ${s.target}`}
            className={cn("inline-flex items-center gap-1 rounded-md px-1.5 py-1 text-[11px] font-semibold text-stone-500 transition hover:bg-orange-50 hover:text-orange-600", FOCUS)}
          >
            <Copy className="size-3" /> Copy
          </button>
          <button
            type="button"
            onClick={() => setResult(onApply(s))}
            className={cn(
              "inline-flex h-7 items-center gap-1 rounded-lg px-2.5 text-[11px] font-bold transition active:scale-95",
              result && result > 0 ? "bg-emerald-100 text-emerald-700" : "bg-orange-500 text-white hover:bg-orange-600",
              FOCUS,
            )}
          >
            {result && result > 0 ? <Check className="size-3" /> : <Play className="size-3" />}
            {result === null ? "Apply" : result > 0 ? "Applied" : "Nothing to change"}
          </button>
        </div>
      </div>
      <div className="mt-1.5 flex flex-wrap gap-1">
        {Object.entries(s.styles).map(([k, v]) => (
          <code
            key={k}
            className="max-w-full truncate rounded-md bg-white px-1.5 py-0.5 text-[11px] text-stone-700 ring-1 ring-black/[0.06]"
          >
            {k}: {v}
          </code>
        ))}
      </div>
      {s.reason && <p className="mt-1.5 text-xs leading-snug text-stone-500">{s.reason}</p>}
    </div>
  );
}

const FIELD =
  "h-10 w-full rounded-lg border border-black/[0.1] bg-white px-2.5 text-[13px] text-[#2a1002] outline-none transition placeholder:text-stone-400 hover:border-orange-300 focus:border-orange-500 focus-visible:ring-2 focus-visible:ring-orange-500/30";

export function AiChatPanel({
  open,
  mode,
  onModeChange,
  messages,
  busy,
  firstName,
  getValues,
  onSend,
  onApplyValues,
  onApplySuggestion,
  onUndo,
  onClose,
  onCopyCss,
}: {
  open: boolean;
  mode: AiMode;
  onModeChange: (m: AiMode) => void;
  messages: ChatMessage[];
  busy: boolean;
  firstName: string;
  getValues: () => BuilderValues;
  onSend: (text: string, opts: { mode: AiMode; values?: BuilderValues }) => void;
  onApplyValues: (v: BuilderValues) => number;
  onApplySuggestion: (s: AiSuggestion) => number;
  onUndo: () => void;
  onClose: () => void;
  onCopyCss: (css: string) => void;
}) {
  const reduce = useReducedMotion();
  const [draft, setDraft] = React.useState("");
  const [values, setValues] = React.useState<BuilderValues>(() => ({
    bride: "", groom: "", date: "", time: "", venue: "", address: "",
  }));
  const [formOpen, setFormOpen] = React.useState(true);
  const [saved, setSaved] = React.useState(false);
  const listRef = React.useRef<HTMLDivElement>(null);
  const inputRef = React.useRef<HTMLTextAreaElement>(null);

  React.useEffect(() => {
    if (!open) return;
    const prev = document.activeElement as HTMLElement | null;
    const id = window.setTimeout(() => inputRef.current?.focus(), 80);
    return () => {
      window.clearTimeout(id);
      prev?.focus?.();
    };
  }, [open]);

  // Start the form from what is already in the design.
  React.useEffect(() => {
    if (open && mode === "builder") setValues(getValues());
  }, [open, mode, getValues]);

  React.useEffect(() => {
    listRef.current?.scrollTo({ top: listRef.current.scrollHeight, behavior: reduce ? "auto" : "smooth" });
  }, [messages, busy, reduce]);

  React.useEffect(() => {
    const el = inputRef.current;
    if (!el) return;
    el.style.height = "auto";
    el.style.height = `${Math.min(el.scrollHeight, 120)}px`;
  }, [draft]);

  const set = (k: keyof BuilderValues) => (e: React.ChangeEvent<HTMLInputElement>) => {
    setSaved(false);
    setValues((v) => ({ ...v, [k]: e.target.value }));
  };

  /** Used by the custom date and time pickers, which give back a plain string. */
  const setValue = (k: "date" | "time") => (v: string) => {
    setSaved(false);
    setValues((prev) => ({ ...prev, [k]: v }));
  };

  const send = (text: string) => {
    const t = text.trim();
    if (!t || busy) return;
    onSend(t, { mode, values: mode === "builder" ? values : undefined });
    setDraft("");
    if (mode === "builder") setFormOpen(false);
  };

  const saveValues = () => {
    onApplyValues(values);
    setSaved(true);
  };

  const starters = mode === "builder" ? BUILDER_STARTERS : IDEA_STARTERS;

  return (
    <AnimatePresence>
      {open && (
        <motion.aside
          key="ai-panel"
          role="dialog"
          aria-modal="false"
          aria-label="AI assistant"
          initial={{ x: "100%" }}
          animate={{ x: 0 }}
          exit={{ x: "100%" }}
          transition={reduce ? { duration: 0 } : { type: "spring", damping: 34, stiffness: 380 }}
          className="fixed inset-y-0 right-0 z-[80] flex h-dvh w-full flex-col bg-white text-[#2a1002] shadow-2xl ring-1 ring-black/[0.06] sm:w-[420px]"
        >
          {/* header */}
          <div className="flex h-14 shrink-0 items-center justify-between gap-2 border-b border-orange-100 bg-[#fffafb] px-3 sm:px-4">
            <div className="flex items-center gap-2">
              <span className="flex size-9 items-center justify-center rounded-xl bg-orange-500 text-white shadow-sm">
                <Bot className="size-5" />
              </span>
              <div>
                <h2 className={cn(HEADING, "text-sm leading-4")}>AI assistant</h2>
                <p className="text-[11px] leading-4 text-stone-500">Chats aren’t saved</p>
              </div>
            </div>
            <button type="button" onClick={onClose} aria-label="Close assistant" className={cn(ICON_BTN, FOCUS)}>
              <X className="size-4" />
            </button>
          </div>

          {/* mode switch */}
          <div className="shrink-0 border-b border-black/[0.06] p-2.5">
            <div role="tablist" aria-label="Assistant mode" className="relative grid grid-cols-2 gap-1 rounded-xl bg-stone-100 p-1">
              {(
                [
                  ["ideas", "Ideas", MessageCircle],
                  ["builder", "Auto-builder", PenTool],
                ] as const
              ).map(([id, label, Ic]) => (
                <button
                  key={id}
                  type="button"
                  role="tab"
                  aria-selected={mode === id}
                  onClick={() => onModeChange(id)}
                  className={cn(
                    "relative flex h-10 items-center justify-center gap-2 rounded-lg text-[13px] font-semibold transition-colors",
                    mode === id ? "text-orange-600" : "text-stone-500 hover:text-stone-800",
                    FOCUS,
                  )}
                >
                  {mode === id && (
                    <motion.span
                      layoutId="ai-mode-pill"
                      className="absolute inset-0 rounded-lg bg-white shadow-sm"
                      transition={{ type: "spring", damping: 30, stiffness: 400 }}
                    />
                  )}
                  <Ic className="relative size-4" />
                  <span className="relative">{label}</span>
                </button>
              ))}
            </div>
          </div>

          {/* scroll area */}
          <div
            ref={listRef}
            data-lenis-prevent
            role="log"
            aria-live="polite"
            aria-label="Conversation"
            className="min-h-0 flex-1 space-y-3 overflow-y-auto overscroll-contain p-3 sm:p-4"
          >
            {mode === "builder" && (
              <div className="overflow-hidden rounded-2xl border border-orange-100 bg-[#fffafb]">
                <button
                  type="button"
                  onClick={() => setFormOpen((o) => !o)}
                  aria-expanded={formOpen}
                  className={cn("flex h-12 w-full items-center justify-between gap-2 px-3.5 text-left", FOCUS)}
                >
                  <span className="flex items-center gap-2 text-sm font-bold text-[#2a1002]">
                    <Users className="size-4 text-orange-600" /> My values
                  </span>
                  <span className="text-xs font-semibold text-stone-500">{formOpen ? "Hide" : "Edit"}</span>
                </button>
                <AnimatePresence initial={false}>
                  {formOpen && (
                    <motion.div
                      initial={reduce ? false : { height: 0, opacity: 0 }}
                      animate={{ height: "auto", opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      transition={{ duration: 0.2 }}
                      className="overflow-hidden"
                    >
                      <div className="space-y-2 px-3.5 pb-3.5">
                        <p className="text-xs leading-snug text-stone-500">
                          Fill what you know. They go onto your page first, then the AI arranges them the way you ask.
                        </p>
                        <div className="grid grid-cols-2 gap-2">
                          <input aria-label="Bride name" className={FIELD} placeholder="Bride" value={values.bride} onChange={set("bride")} />
                          <input aria-label="Groom name" className={FIELD} placeholder="Groom" value={values.groom} onChange={set("groom")} />
                        </div>
                        <EventDateTimeFields
                          variant="compact"
                          date={values.date}
                          time={values.time}
                          onDate={setValue("date")}
                          onTime={setValue("time")}
                        />
                        <input aria-label="Venue name" className={FIELD} placeholder="Venue name" value={values.venue} onChange={set("venue")} />
                        <input aria-label="Venue address" className={FIELD} placeholder="Venue address" value={values.address} onChange={set("address")} />
                        <button
                          type="button"
                          onClick={saveValues}
                          className={cn(
                            "flex h-10 w-full items-center justify-center gap-2 rounded-lg border text-[13px] font-semibold transition",
                            saved
                              ? "border-emerald-200 bg-emerald-50 text-emerald-700"
                              : "border-black/10 bg-white text-stone-700 hover:border-orange-300 hover:text-orange-600",
                            FOCUS,
                          )}
                        >
                          {saved ? <Check className="size-4" /> : <Save className="size-4" />}
                          {saved ? "Added to your page" : "Add these to my page only"}
                        </button>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            )}

            {messages.length === 0 && (
              <div className="space-y-3">
                <div className="rounded-2xl rounded-bl-md bg-stone-100 px-3.5 py-2.5 text-[13px] leading-relaxed text-[#2a1002]">
                  {mode === "builder"
                    ? `Hi ${firstName}! Fill in your values above, then tell me how to arrange them. I will change your page for you, and you can undo it with one tap.`
                    : `Hi ${firstName}! Tell me about your event and I’ll suggest colours, fonts, spacing and wording. Tap Apply on any idea you like.`}
                </div>
                <div className="flex flex-wrap gap-1.5">
                  {starters.map((s) => (
                    <button
                      key={s}
                      type="button"
                      onClick={() => send(s)}
                      disabled={busy}
                      className={cn(
                        "rounded-full border bg-white px-3 py-2 text-left text-xs font-semibold text-stone-700 transition hover:border-orange-300 hover:text-orange-600 disabled:opacity-50",
                        HAIRLINE,
                        FOCUS,
                      )}
                    >
                      {s}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {messages.map((m) => (
              <motion.div
                key={m.id}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.25, ease: EASE }}
                className={cn("flex flex-col gap-2", m.role === "user" ? "items-end" : "items-start")}
              >
                <div
                  className={cn(
                    "max-w-[88%] whitespace-pre-wrap break-words rounded-2xl px-3.5 py-2.5 text-[13px] leading-relaxed",
                    m.role === "user"
                      ? "rounded-br-md bg-orange-500 text-white"
                      : m.error
                        ? "rounded-bl-md bg-rose-50 text-rose-800 ring-1 ring-rose-100"
                        : "rounded-bl-md bg-stone-100 text-[#2a1002]",
                  )}
                >
                  {m.text}
                </div>

                {typeof m.applied === "number" && (
                  <div className="flex w-full max-w-[96%] items-center justify-between gap-2 rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-2 text-xs font-semibold text-emerald-800">
                    <span className="flex items-center gap-1.5">
                      <Check className="size-4" />
                      {m.applied > 0 ? `Applied ${m.applied} change${m.applied === 1 ? "" : "s"}` : "No changes were needed"}
                    </span>
                    {m.applied > 0 && (
                      <button
                        type="button"
                        onClick={onUndo}
                        className={cn("inline-flex items-center gap-1 rounded-lg bg-white px-2.5 py-1.5 text-emerald-700 ring-1 ring-emerald-200 hover:bg-emerald-100", FOCUS)}
                      >
                        <Undo2 className="size-3.5" /> Undo
                      </button>
                    )}
                  </div>
                )}

                {m.suggestions && m.suggestions.length > 0 && (
                  <div className="w-full max-w-[96%] space-y-2">
                    {m.suggestions.map((s, i) => (
                      <SuggestionCard key={`${m.id}-${i}`} s={s} onCopy={onCopyCss} onApply={onApplySuggestion} />
                    ))}
                  </div>
                )}
              </motion.div>
            ))}

            {busy && <TypingIndicator />}
          </div>

          {/* composer */}
          <div className="shrink-0 border-t border-orange-100 bg-white p-2.5 pb-[max(0.625rem,env(safe-area-inset-bottom))] sm:p-3">
            <div className="flex items-end gap-2">
              <label className="min-w-0 flex-1">
                <span className="sr-only">Message the assistant</span>
                <textarea
                  ref={inputRef}
                  value={draft}
                  rows={1}
                  maxLength={1000}
                  onChange={(e) => setDraft(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && !e.shiftKey && !e.nativeEvent.isComposing) {
                      e.preventDefault();
                      send(draft);
                    }
                  }}
                  placeholder={mode === "builder" ? "How should I arrange your values?" : "Ask for design ideas…"}
                  className={cn(
                    "max-h-[120px] w-full resize-none rounded-xl border bg-white px-3 py-2.5 text-[13px] text-[#2a1002] placeholder:text-stone-400 sm:text-sm",
                    HAIRLINE,
                    "shadow-[0_1px_2px_rgba(28,20,16,0.04)] transition-colors hover:border-black/20",
                    FOCUS,
                  )}
                />
              </label>
              <button
                type="button"
                onClick={() => send(draft)}
                disabled={busy || draft.trim().length === 0}
                aria-label={mode === "builder" ? "Build it" : "Send message"}
                className={cn(BTN, "size-11 shrink-0 rounded-xl p-0 disabled:opacity-50", FOCUS)}
              >
                {busy ? <Loader2 className="size-4 animate-spin motion-reduce:animate-none" /> : <Send className="size-4" />}
              </button>
            </div>
            <p className="mt-1.5 flex items-center justify-between text-[10px] text-stone-400">
              <span className="flex items-center gap-1">
                <MessageCircle className="size-3" />
                {mode === "builder" ? "I edit your page. One tap undoes it." : "Ideas only. You stay in control."}
              </span>
              {draft.length > 800 && <span className="tabular-nums">{draft.length}/1000</span>}
            </p>
          </div>
        </motion.aside>
      )}
    </AnimatePresence>
  );
}

/* ========================================================================== */
/*  Drafts strip ("Continue where you left off")                              */
/* ========================================================================== */

export function DraftsStrip({
  drafts,
  onOpen,
  onDelete,
}: {
  drafts: DraftSummary[];
  onOpen: (templateId: string) => void;
  onDelete: (d: DraftSummary) => void;
}) {
  if (drafts.length === 0) return null;
  return (
    <section aria-labelledby="drafts-title" className="space-y-2.5">
      <h2 id="drafts-title" className={cn(HEADING, "text-base text-[#2a1002]")}>
        Continue where you left off
      </h2>
      <ul data-lenis-prevent-wheel className="-mx-1 flex snap-x gap-3 overflow-x-auto px-1 pb-2">
        {drafts.map((d, i) => (
          <motion.li
            key={d.templateId}
            initial={{ opacity: 0, x: 16 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.3, delay: i * 0.05, ease: EASE }}
            className="w-[16rem] shrink-0 snap-start"
          >
            <div className={cn("flex items-center gap-3 rounded-2xl p-2.5", SURFACE)}>
              <button
                type="button"
                onClick={() => onOpen(d.templateId)}
                aria-label={`Continue ${d.name}`}
                className={cn("relative size-14 shrink-0 overflow-hidden rounded-xl bg-stone-100", FOCUS)}
              >
                {d.thumb ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={d.thumb} alt="" className="size-full object-cover" />
                ) : (
                  <span className="grid size-full place-items-center text-stone-400">
                    <IcImageOff className="size-5" />
                  </span>
                )}
              </button>
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-bold text-[#2a1002]" title={d.name}>
                  {d.name}
                </p>
                <p className="flex items-center gap-1.5 text-[11px] text-stone-500">
                  <span className="truncate">
                    Edited {timeAgo(d.updatedAt)}
                    {d.unsynced ? " · on this device" : ""}
                  </span>
                </p>
                <div className="mt-1 flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => onOpen(d.templateId)}
                    className={cn("text-xs font-bold text-orange-600 hover:text-orange-700", FOCUS)}
                  >
                    Continue
                  </button>
                  {d.owned && (
                    <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-1.5 py-0.5 text-[10px] font-bold text-emerald-700 ring-1 ring-emerald-200">
                      <BadgeCheck className="size-3" /> Purchased
                    </span>
                  )}
                </div>
              </div>
              <button
                type="button"
                onClick={() => onDelete(d)}
                aria-label={`Delete draft ${d.name}`}
                title="Not buying? Delete this draft"
                className={cn("flex size-9 shrink-0 items-center justify-center rounded-lg text-stone-400 hover:bg-red-50 hover:text-red-600", FOCUS)}
              >
                <Trash2 className="size-4" />
              </button>
            </div>
          </motion.li>
        ))}
      </ul>
    </section>
  );
}

/* ========================================================================== */
/*  Stats, filters                                                            */
/* ========================================================================== */

export function StatsRow({
  total,
  owned,
  drafts,
  loadingOwned,
}: {
  total: number | null;
  owned: number;
  drafts: number;
  loadingOwned: boolean;
}) {
  const cards: { icon: LucideIcon; label: string; value: string; tone: string }[] = [
    { icon: LayoutGrid, label: "Templates to try", value: total === null ? "…" : String(total), tone: "bg-orange-100 text-orange-600" },
    { icon: BadgeCheck, label: "Purchased by you", value: loadingOwned ? "…" : String(owned), tone: "bg-emerald-100 text-emerald-600" },
    { icon: PenTool, label: "Rehearsals in progress", value: String(drafts), tone: "bg-stone-100 text-stone-600" },
  ];
  return (
    <ul className="grid grid-cols-3 gap-2 sm:gap-3">
      {cards.map((c, i) => (
        <motion.li
          key={c.label}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.35, delay: i * 0.06, ease: EASE }}
          className={cn("flex min-w-0 items-center gap-2.5 rounded-2xl p-2.5 sm:gap-3 sm:p-3.5", SURFACE)}
        >
          <span className={cn("hidden size-10 shrink-0 items-center justify-center rounded-xl min-[420px]:flex", c.tone)}>
            <c.icon className="size-5" />
          </span>
          <div className="min-w-0">
            <p className="text-lg font-bold leading-6 tabular-nums text-[#2a1002] sm:text-2xl sm:leading-7">{c.value}</p>
            <p className="truncate text-[11px] leading-4 text-stone-500 sm:text-xs">{c.label}</p>
          </div>
        </motion.li>
      ))}
    </ul>
  );
}

export function OwnershipTabs({
  value,
  ownedCount,
  onChange,
}: {
  value: OwnershipTab;
  ownedCount: number | null;
  onChange: (v: OwnershipTab) => void;
}) {
  const tabs: { id: OwnershipTab; label: string; icon: LucideIcon }[] = [
    { id: "all", label: "All", icon: LayoutGrid },
    { id: "owned", label: ownedCount === null ? "Purchased" : `Purchased (${ownedCount})`, icon: BadgeCheck },
    { id: "unowned", label: "Not purchased", icon: Lock },
  ];
  return (
    <div role="tablist" aria-label="Template filter" className="grid grid-cols-3 gap-1 rounded-xl bg-black/[0.05] p-1 sm:inline-grid sm:w-fit">
      {tabs.map((t) => (
        <button
          key={t.id}
          type="button"
          role="tab"
          aria-selected={value === t.id}
          onClick={() => onChange(t.id)}
          className={cn(
            "relative flex h-11 items-center justify-center gap-1.5 whitespace-nowrap rounded-lg px-2.5 text-xs font-semibold transition-colors sm:h-10 sm:px-4 sm:text-[13px]",
            value === t.id ? "text-orange-600" : "text-stone-500 hover:text-[#2a1002]",
            FOCUS,
          )}
        >
          {value === t.id && (
            <motion.span
              layoutId="ownership-pill"
              className="absolute inset-0 rounded-lg bg-white shadow-[0_1px_2px_rgba(28,20,16,0.12)]"
              transition={{ type: "spring", damping: 30, stiffness: 400 }}
            />
          )}
          <t.icon className="relative size-4 shrink-0" />
          <span className="relative truncate">{t.label}</span>
        </button>
      ))}
    </div>
  );
}

export function CategoryChips({
  categories,
  value,
  onChange,
}: {
  categories: string[];
  value: string;
  onChange: (v: string) => void;
}) {
  if (categories.length < 2) return null;
  const all = ["", ...categories];
  return (
    <div data-lenis-prevent-wheel className="-mx-1 flex gap-1.5 overflow-x-auto px-1 pb-1" role="group" aria-label="Category">
      {all.map((c) => (
        <button
          key={c || "all"}
          type="button"
          aria-pressed={value === c}
          onClick={() => onChange(c)}
          className={cn(
            "h-11 shrink-0 rounded-full border px-3.5 text-xs font-semibold transition sm:h-9",
            value === c
              ? "border-[#2a1002] bg-[#2a1002] text-white"
              : cn("bg-white text-stone-600 hover:border-orange-300 hover:text-orange-600", HAIRLINE),
            FOCUS,
          )}
        >
          {c || "All categories"}
        </button>
      ))}
    </div>
  );
}

/* ========================================================================== */
/*  Template picker                                                           */
/*  The card itself lives in ./TemplateCard                                   */
/* ========================================================================== */

export function TemplatePicker({
  items,
  status,
  query,
  tab,
  draftIds,
  hasMore,
  loadingMore,
  onLoadMore,
  onRetry,
  onPick,
  onCreate,
  unlockHref,
}: {
  items: PublicTemplate[];
  status: "loading" | "ready" | "error";
  query: string;
  tab: OwnershipTab;
  draftIds: Set<string>;
  hasMore: boolean;
  loadingMore: boolean;
  onLoadMore: () => void;
  onRetry: () => void;
  onPick: (id: string) => void;
  /** Optional: where "Create invitation" on an owned card goes. Defaults to the create page. */
  onCreate?: (id: string) => void;
  /** Optional: where "Unlock" goes. Defaults to the templates page. */
  unlockHref?: (id: string) => string;
}) {
  if (status === "loading") return <GridSkeleton count={8} />;
  if (status === "error") return <ErrorCard onRetry={onRetry} />;
  if (items.length === 0) {
    const none =
      tab === "owned"
        ? "You haven’t purchased a template yet."
        : tab === "unowned"
          ? "No unpurchased templates match."
          : "No templates are available yet.";
    return (
      <div className={cn("rounded-2xl p-8 text-center", SURFACE)}>
        <p className={cn(HEADING, "text-base text-[#2a1002]")}>No templates match</p>
        <p className="mt-1 text-sm text-stone-500">{query ? `Nothing matches “${query}”. Try a shorter word.` : none}</p>
        {hasMore && (
          <button
            type="button"
            onClick={onLoadMore}
            disabled={loadingMore}
            className={cn("mt-4 h-11 rounded-xl border bg-white px-5 text-sm font-semibold hover:border-orange-300 hover:text-orange-600 disabled:opacity-60", HAIRLINE, FOCUS)}
          >
            {loadingMore ? "Loading…" : "Look in more templates"}
          </button>
        )}
      </div>
    );
  }
  return (
    <div className="space-y-5">
      <ul className={GRID_CLASS}>
        {items.map((t, i) => (
          <RehearsalTemplateCard
            key={t.id}
            t={t}
            index={i}
            hasDraft={draftIds.has(t.id)}
            onPick={onPick}
            onCreate={onCreate}
            unlockHref={unlockHref}
          />
        ))}
      </ul>
      {hasMore && (
        <div className="flex justify-center">
          <button
            type="button"
            onClick={onLoadMore}
            disabled={loadingMore}
            className={cn(
              "inline-flex h-11 items-center gap-2 rounded-xl border bg-white px-6 text-sm font-semibold text-[#2a1002] transition hover:border-orange-300 hover:text-orange-600 disabled:opacity-60",
              HAIRLINE,
              FOCUS,
            )}
          >
            {loadingMore && <Loader2 className="size-4 animate-spin motion-reduce:animate-none" />}
            {loadingMore ? "Loading…" : "Show more templates"}
          </button>
        </div>
      )}
    </div>
  );
}

/* ========================================================================== */
/*  Error boundary                                                            */
/* ========================================================================== */

export class RehearsalErrorBoundary extends React.Component<{ children: React.ReactNode }, { failed: boolean }> {
  state = { failed: false };

  static getDerivedStateFromError() {
    return { failed: true };
  }

  componentDidCatch(error: Error) {
    // Name only: never log message text or user content.
    console.error("[REHEARSAL_UI_CRASH]", error.name);
  }

  render() {
    if (!this.state.failed) return this.props.children;
    return (
      <div className={cn("mx-auto max-w-md rounded-2xl p-6 text-center", SURFACE)}>
        <span className="mx-auto flex size-11 items-center justify-center rounded-full bg-rose-50 text-rose-600">
          <AlertTriangle className="size-5" />
        </span>
        <h2 className={cn(HEADING, "mt-3 text-lg text-[#2a1002]")}>The studio hit a snag</h2>
        <p className="mt-1 text-sm text-stone-500">
          Your work is kept on this device and in your last saved draft. Reload to pick up where you left off.
        </p>
        <button
          type="button"
          onClick={() => window.location.reload()}
          className={cn(BTN, "mt-4 rounded-xl px-4 py-2 text-sm", FOCUS)}
        >
          Reload studio
        </button>
      </div>
    );
  }
}