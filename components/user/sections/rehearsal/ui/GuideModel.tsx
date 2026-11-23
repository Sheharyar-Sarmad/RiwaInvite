"use client";

/**
 * components/user/sections/rehearsal/ui/GuideModal.tsx
 *
 * Immersive, illustrated guide for the Rehearsal Studio.
 *
 *  - Wide two-pane layout (stacked on phones), keyboard friendly (Left/Right, Esc, Tab trap).
 *  - The visual side shows a phone frame with a REAL template screenshot
 *    (pass `previews`) and pinned callouts that point at what each step is about.
 *  - Falls back to the /public step images when no previews are available.
 *  - Every scroll area has `data-lenis-prevent`; motion respects prefers-reduced-motion.
 *
 * Replaces `GuideModal` in RehearsalStudioUI.tsx.
 */

import * as React from "react";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import {
  ArrowRight,
  Bot,
  BookOpen,
  Check,
  HelpCircle,
  LayoutTemplate,
  MousePointerClick,
  Palette,
  Rocket,
  ShieldCheck,
  Trash2,
  Users,
  X,
  type LucideIcon,
} from "lucide-react";
import { FOCUS } from "@/components/user/navigation/UserSidebar";
import { BTN, EASE, HEADING, cn } from "@/components/user/sections/dashboard/ui/DashboardUI";

/* ========================================================================== */
/*  Content                                                                   */
/* ========================================================================== */

type Callout = {
  /** Position inside the phone, in percent. */
  x: number;
  y: number;
  label: string;
};

type Step = {
  icon: LucideIcon;
  title: string;
  lead: string;
  points: string[];
  tip: string;
  /** From /public. Used as the backdrop, and in the phone when there are no template previews. */
  image: string;
  stats: { value: string; label: string }[];
  callouts: Callout[];
};

const STEPS: Step[] = [
  {
    icon: Rocket,
    title: "Welcome to the Rehearsal Studio",
    lead: "A safe playground to try any invitation design with your own names, photos and colours, before you buy anything.",
    points: [
      "Nothing is published. Nobody else can see your rehearsal.",
      "You don’t need to know anything about code, HTML or CSS.",
      "It works on your phone, tablet and computer.",
    ],
    tip: "Templates you already bought are marked “Purchased”. You can rehearse those too.",
    image: "/home_hero_bg.png",
    stats: [
      { value: "0", label: "lines of code" },
      { value: "∞", label: "rehearsals" },
      { value: "3 sec", label: "auto-save" },
    ],
    callouts: [
      { x: 50, y: 22, label: "Your names go here" },
      { x: 50, y: 74, label: "Your photos, your colours" },
    ],
  },
  {
    icon: LayoutTemplate,
    title: "Pick a template",
    lead: "Every published template is here. Use the tabs to see what you own and what you don’t.",
    points: [
      "All: everything we offer, with a green “Purchased” badge on yours.",
      "Purchased: only the templates you already own.",
      "Not purchased: locked designs you can still try free before you decide.",
      "Tap “Rehearse” or “Try free” to open one in the editor.",
    ],
    tip: "Use the category chips and the search box to narrow the list quickly.",
    image: "/craft-template-card.png",
    stats: [
      { value: "3", label: "filter tabs" },
      { value: "Free", label: "to rehearse" },
      { value: "1 tap", label: "to start" },
    ],
    callouts: [
      { x: 28, y: 12, label: "Purchased badge" },
      { x: 62, y: 88, label: "Opens the editor" },
    ],
  },
  {
    icon: MousePointerClick,
    title: "Tap anything to change it",
    lead: "Tap any text or photo on the page. A panel opens with simple controls in plain words.",
    points: [
      "Edit the words, make them bigger or smaller, bold or italic.",
      "Pick a colour and a font style with one tap.",
      "Use the arrows to move things up or down, or delete what you don’t need.",
      "Undo and Redo are always there if you change your mind.",
    ],
    tip: "On a phone the panel slides up from the bottom. Pull it down with the arrow to see more of the page.",
    image: "/why-builder.png",
    stats: [
      { value: "100", label: "undo steps" },
      { value: "5", label: "font styles" },
      { value: "15+", label: "colour swatches" },
    ],
    callouts: [
      { x: 50, y: 30, label: "Tap to edit" },
      { x: 50, y: 62, label: "Move or delete" },
    ],
  },
  {
    icon: Users,
    title: "Add your details once",
    lead: "Type your names, date and venue one time. Every place on the page that shows them updates by itself.",
    points: [
      "Details tab: names, date, time, venue and address.",
      "Upload a cover photo, a photo gallery, music and a video.",
      "Add tab: headings, paragraphs, photos, music, video, couple names, date and venue.",
      "Photos you upload are private to you and removed if you delete the draft.",
    ],
    tip: "Your date and names appear in the right place even if you change the template later.",
    image: "/craft-process-studio.png",
    stats: [
      { value: "10 MB", label: "per photo" },
      { value: "20 MB", label: "per song" },
      { value: "60 MB", label: "per video" },
    ],
    callouts: [
      { x: 50, y: 24, label: "Names update everywhere" },
      { x: 50, y: 50, label: "Date and venue" },
    ],
  },
  {
    icon: Palette,
    title: "Style it and make it move",
    lead: "Try ready-made colour themes, then give each item a scroll animation that plays when your guest reaches it.",
    points: [
      "Look tab: one tap changes the background, headings and text colour.",
      "Pick a font style for the whole invitation in one go.",
      "Animate everything: fade up, zoom, slide or blur in, with a gentle stagger.",
      "In Edit, choose a different animation, speed and wait time for any single item.",
    ],
    tip: "Animations play once and only when the item scrolls into view. Press Preview to see exactly what guests see.",
    image: "/why-ai-colors.png",
    stats: [
      { value: "6", label: "colour themes" },
      { value: "7", label: "animations" },
      { value: "1x", label: "plays once" },
    ],
    callouts: [
      { x: 50, y: 18, label: "Fades up on scroll" },
      { x: 50, y: 80, label: "One-tap colour theme" },
    ],
  },
  {
    icon: Bot,
    title: "Let the AI help",
    lead: "Switch on Builder mode or open AI help from the top bar. It never changes anything without you seeing it.",
    points: [
      "Ideas: ask for colours, fonts or wording, then tap Apply on the ones you like.",
      "Builder mode: type your names, date and venue, then say how you want them laid out.",
      "Example: “Centre everything, big names, date and venue small in gold.”",
      "Every AI change is one step. Tap Undo in the chat to take it back.",
    ],
    tip: "Chats are not saved, and the AI only sees a short outline of your page. It never sees your photos.",
    image: "/why-ai.png",
    stats: [
      { value: "2", label: "AI modes" },
      { value: "1 tap", label: "to undo" },
      { value: "10/min", label: "fair use" },
    ],
    callouts: [
      { x: 50, y: 28, label: "Title turns gold" },
      { x: 50, y: 66, label: "Layout arranged for you" },
    ],
  },
  {
    icon: ShieldCheck,
    title: "Your work is always saved",
    lead: "You never have to worry about losing it.",
    points: [
      "Every change is saved on your device straight away, and to your account every few seconds.",
      "Refresh the page, close the tab or lose power: your work is there when you come back.",
      "The badge at the top shows “Saved”. Press Ctrl+S (or Save) to save right now.",
      "On the templates page you will see “Continue where you left off”.",
    ],
    tip: "If you are offline the badge says “Safe on this device” and we retry on our own.",
    image: "/how-step-4.png",
    stats: [
      { value: "Instant", label: "on-device backup" },
      { value: "3 sec", label: "idle auto-save" },
      { value: "30 sec", label: "max wait" },
    ],
    callouts: [{ x: 50, y: 14, label: "Saved badge" }],
  },
  {
    icon: Rocket,
    title: "Happy with it? Create your invitation",
    lead: "If you own the template, one tap turns your rehearsal into a real invitation.",
    points: [
      "Tap “Create invitation” in the top bar.",
      "Choose an automatic link, or a custom one if your template includes it.",
      "Your design is copied over and this draft is removed.",
      "Not bought yet? “Unlock” takes you to the template page.",
    ],
    tip: "Your rehearsal stays untouched until the invitation is created successfully.",
    image: "/ethos-green-tree.png",
    stats: [
      { value: "1 tap", label: "to create" },
      { value: "Auto", label: "or custom link" },
      { value: "0", label: "work lost" },
    ],
    callouts: [
      { x: 50, y: 12, label: "Create invitation" },
      { x: 50, y: 84, label: "Your link" },
    ],
  },
  {
    icon: Trash2,
    title: "Changed your mind?",
    lead: "If you decide not to buy a template, you can delete your rehearsal in one step.",
    points: [
      "Tap “Delete draft” in the editor, or the bin icon on a draft in the list.",
      "Your edits and every photo, song or video you uploaded are deleted immediately.",
      "Deleting can’t be undone, so we always ask you to confirm first.",
    ],
    tip: "Bought a template? Create your real invitation from the top bar when you’re happy.",
    image: "/ethos-green-tree.png",
    stats: [
      { value: "100%", label: "uploads removed" },
      { value: "0", label: "copies kept" },
      { value: "1", label: "confirm step" },
    ],
    callouts: [{ x: 50, y: 50, label: "Asks you to confirm" }],
  },
];

/* ========================================================================== */
/*  Pieces                                                                    */
/* ========================================================================== */

/** Image that hides itself if the file is missing, so the gradient behind it shows. */
function SafeImage({ src, className }: { src: string; className?: string }) {
  const [failed, setFailed] = React.useState(false);
  React.useEffect(() => setFailed(false), [src]);
  if (!src || failed) return null;
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img src={src} alt="" decoding="async" referrerPolicy="no-referrer" onError={() => setFailed(true)} className={className} />
  );
}

/** Pulsing pin with a label. The label flips to the left when the pin is on the right half. */
function Pin({ c, delay, reduce }: { c: Callout; delay: number; reduce: boolean }) {
  const flip = c.x > 55;
  return (
    <motion.div
      initial={reduce ? false : { opacity: 0, scale: 0.8 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ delay: reduce ? 0 : 0.25 + delay, duration: 0.3, ease: EASE }}
      style={{ left: `${c.x}%`, top: `${c.y}%` }}
      className="absolute z-10 -translate-x-1/2 -translate-y-1/2"
    >
      <span className="relative flex size-4 items-center justify-center">
        <span aria-hidden className="absolute inline-flex size-full animate-ping rounded-full bg-orange-400/70 motion-reduce:animate-none" />
        <span className="relative size-3 rounded-full bg-orange-500 ring-2 ring-white" />
      </span>
      <span
        className={cn(
          "absolute top-1/2 hidden -translate-y-1/2 whitespace-nowrap rounded-lg bg-white px-2.5 py-1 text-[11px] font-bold text-[#2a1002] shadow-lg ring-1 ring-black/10 min-[360px]:block",
          flip ? "right-5" : "left-5",
        )}
      >
        {c.label}
      </span>
    </motion.div>
  );
}

function trapTab(e: React.KeyboardEvent, root: HTMLElement | null) {
  if (e.key !== "Tab" || !root) return;
  const nodes = Array.from(root.querySelectorAll<HTMLElement>("button:not(:disabled)"));
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
/*  Modal                                                                     */
/* ========================================================================== */

export function GuideModal({
  open,
  onClose,
  previews = [],
}: {
  open: boolean;
  onClose: () => void;
  /** Real template screenshots (thumbnail URLs). Shown inside the phone frame. */
  previews?: string[];
}) {
  const reduce = !!useReducedMotion();
  const [step, setStep] = React.useState(0);
  const dialogRef = React.useRef<HTMLDivElement>(null);
  const nextRef = React.useRef<HTMLButtonElement>(null);
  const bodyRef = React.useRef<HTMLDivElement>(null);

  const shots = React.useMemo(() => previews.filter((p) => typeof p === "string" && p.trim() !== ""), [previews]);

  React.useEffect(() => {
    if (!open) return;
    setStep(0);
    const prev = document.activeElement as HTMLElement | null;
    const id = window.setTimeout(() => nextRef.current?.focus(), 60);
    return () => {
      window.clearTimeout(id);
      prev?.focus?.();
    };
  }, [open]);

  React.useEffect(() => {
    bodyRef.current?.scrollTo({ top: 0 });
  }, [step]);

  const s = STEPS[step] ?? STEPS[0]!;
  const last = step === STEPS.length - 1;
  const Icon = s.icon;
  const phoneImage = shots.length > 0 ? shots[step % shots.length]! : s.image;

  const onKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Escape") {
      e.stopPropagation();
      onClose();
      return;
    }
    if (e.key === "ArrowRight" && !last) setStep((n) => n + 1);
    if (e.key === "ArrowLeft" && step > 0) setStep((n) => n - 1);
    trapTab(e, dialogRef.current);
  };

  return (
    <AnimatePresence>
      {open && (
        <div className="fixed inset-0 z-[95] flex items-end justify-center sm:items-center sm:p-6">
          <motion.div
            key="guide-backdrop"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: reduce ? 0 : 0.2 }}
            onClick={onClose}
            className="absolute inset-0 bg-stone-950/60 backdrop-blur-sm"
          />
          <motion.div
            key="guide-panel"
            ref={dialogRef}
            role="dialog"
            aria-modal="true"
            aria-labelledby="guide-title"
            onKeyDown={onKeyDown}
            initial={reduce ? false : { opacity: 0, y: 40, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={reduce ? undefined : { opacity: 0, y: 40, scale: 0.98 }}
            transition={{ type: "spring", damping: 34, stiffness: 380 }}
            className="relative flex h-[min(94dvh,820px)] w-full flex-col overflow-hidden rounded-t-3xl bg-white text-[#2a1002] shadow-2xl ring-1 ring-black/[0.06] sm:max-w-6xl sm:rounded-3xl md:flex-row"
          >
            {/* ---------------- visual side ---------------- */}
            <div className="relative h-56 shrink-0 overflow-hidden bg-gradient-to-br from-orange-600 via-orange-700 to-amber-700 sm:h-64 md:h-auto md:w-[46%]">
              <AnimatePresence mode="wait" initial={false}>
                <motion.div
                  key={`bg-${step}`}
                  initial={reduce ? false : { opacity: 0, scale: 1.06 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: reduce ? 0 : 0.35 }}
                  className="absolute inset-0"
                >
                  <SafeImage src={s.image} className="absolute inset-0 size-full scale-110 object-cover opacity-60 blur-[2px]" />
                </motion.div>
              </AnimatePresence>
              <div aria-hidden className="absolute inset-0 bg-gradient-to-t from-stone-950/80 via-stone-950/30 to-stone-950/20" />

              <span className="absolute left-4 top-4 z-20 inline-flex items-center gap-1.5 rounded-full bg-white/15 px-2.5 py-1 text-[11px] font-bold text-white ring-1 ring-white/25 backdrop-blur-md sm:left-6 sm:top-6">
                <BookOpen className="size-3.5" /> Quick guide · {step + 1} of {STEPS.length}
              </span>

              {/* phone frame with a real template inside */}
              <div className="absolute inset-y-14 left-1/2 aspect-[9/18] -translate-x-1/2 sm:inset-y-16 md:inset-y-16">
                <AnimatePresence mode="wait" initial={false}>
                  <motion.div
                    key={`phone-${step}`}
                    initial={reduce ? false : { opacity: 0, y: 18, rotate: -1.5 }}
                    animate={{ opacity: 1, y: 0, rotate: 0 }}
                    exit={reduce ? undefined : { opacity: 0, y: -10 }}
                    transition={{ duration: reduce ? 0 : 0.35, ease: EASE }}
                    className="relative size-full"
                  >
                    <div className="relative size-full overflow-hidden rounded-[1.6rem] bg-stone-100 shadow-[0_30px_60px_-20px_rgba(0,0,0,0.65)] ring-[5px] ring-neutral-900">
                      <SafeImage src={phoneImage} className="absolute inset-0 size-full object-cover object-top" />
                      <span aria-hidden className="absolute left-1/2 top-1.5 h-1.5 w-10 -translate-x-1/2 rounded-full bg-neutral-900/90" />
                      <div aria-hidden className="absolute inset-0 bg-gradient-to-b from-white/10 via-transparent to-stone-950/20" />
                    </div>
                    {s.callouts.map((c, i) => (
                      <Pin key={c.label} c={c} delay={i * 0.12} reduce={reduce} />
                    ))}
                  </motion.div>
                </AnimatePresence>
              </div>
            </div>

            {/* ---------------- content side ---------------- */}
            <div className="flex min-h-0 flex-1 flex-col">
              <div className="h-1 w-full shrink-0 bg-stone-100" aria-hidden>
                <div className="h-full bg-orange-500 transition-[width] duration-300 motion-reduce:transition-none" style={{ width: `${((step + 1) / STEPS.length) * 100}%` }} />
              </div>
              <div className="flex items-center justify-end px-3 pt-2 sm:px-4">
                <button
                  type="button"
                  onClick={onClose}
                  aria-label="Close guide"
                  className={cn("flex size-11 items-center justify-center rounded-xl text-stone-500 hover:bg-stone-100", FOCUS)}
                >
                  <X className="size-5" />
                </button>
              </div>

              <div ref={bodyRef} data-lenis-prevent className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-5 pb-4 sm:px-8">
                <AnimatePresence mode="wait" initial={false}>
                  <motion.div
                    key={step}
                    initial={reduce ? false : { opacity: 0, x: 24 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={reduce ? undefined : { opacity: 0, x: -24 }}
                    transition={{ duration: reduce ? 0 : 0.22, ease: EASE }}
                  >
                    <span className="flex size-12 items-center justify-center rounded-2xl bg-orange-100 text-orange-600">
                      <Icon className="size-6" />
                    </span>
                    <h2 id="guide-title" className={cn(HEADING, "mt-3 text-2xl leading-8 tracking-[-0.02em] md:text-3xl md:leading-9")}>
                      {s.title}
                    </h2>
                    <p className="mt-2 max-w-prose text-[15px] leading-relaxed text-stone-600">{s.lead}</p>

                    <ul className="mt-4 grid grid-cols-3 gap-2">
                      {s.stats.map((x) => (
                        <li key={x.label} className="rounded-xl bg-stone-50 p-2.5 ring-1 ring-black/[0.05] sm:p-3">
                          <p className="text-base font-bold leading-5 text-[#2a1002] sm:text-lg">{x.value}</p>
                          <p className="mt-0.5 text-[10px] leading-3 text-stone-500 sm:text-xs sm:leading-4">{x.label}</p>
                        </li>
                      ))}
                    </ul>

                    <ul className="mt-5 space-y-3">
                      {s.points.map((p, i) => (
                        <motion.li
                          key={p}
                          initial={reduce ? false : { opacity: 0, y: 8 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ delay: reduce ? 0 : 0.08 + i * 0.06, duration: 0.25 }}
                          className="flex gap-3 text-sm leading-snug text-stone-700"
                        >
                          <span className="mt-0.5 flex size-5 shrink-0 items-center justify-center rounded-full bg-emerald-100 text-emerald-700">
                            <Check className="size-3.5" />
                          </span>
                          <span>{p}</span>
                        </motion.li>
                      ))}
                    </ul>

                    <div className="mt-5 flex gap-3 rounded-2xl border border-orange-100 bg-orange-50/70 p-3.5 text-[13px] leading-snug text-orange-900">
                      <HelpCircle className="mt-0.5 size-4 shrink-0 text-orange-600" />
                      <span>{s.tip}</span>
                    </div>
                  </motion.div>
                </AnimatePresence>
              </div>

              <div className="flex flex-wrap items-center justify-between gap-3 border-t border-black/[0.06] px-5 py-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] sm:px-8 sm:py-4">
                <div className="flex items-center" role="group" aria-label="Guide steps">
                  {STEPS.map((g, i) => (
                    <button
                      key={g.title}
                      type="button"
                      aria-label={`Go to step ${i + 1}: ${g.title}`}
                      aria-current={i === step}
                      onClick={() => setStep(i)}
                      className={cn("group flex h-11 items-center px-[3px]", FOCUS)}
                    >
                      <span
                        className={cn(
                          "h-2 rounded-full transition-all motion-reduce:transition-none",
                          i === step ? "w-6 bg-orange-500" : "w-2 bg-stone-300 group-hover:bg-stone-400",
                        )}
                      />
                    </button>
                  ))}
                </div>
                <div className="flex gap-2">
                  {step > 0 && (
                    <button
                      type="button"
                      onClick={() => setStep((n) => n - 1)}
                      className={cn("h-11 rounded-xl border border-black/[0.08] bg-white px-5 text-sm font-semibold hover:bg-stone-50", FOCUS)}
                    >
                      Back
                    </button>
                  )}
                  <button
                    ref={nextRef}
                    type="button"
                    onClick={() => (last ? onClose() : setStep((n) => n + 1))}
                    className={cn(BTN, "h-11 gap-2 rounded-xl px-6 text-sm", FOCUS)}
                  >
                    {last ? "Got it, let’s start" : "Next"}
                    {!last && <ArrowRight className="size-4" />}
                  </button>
                </div>
              </div>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}