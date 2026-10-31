"use client";

import { useRef, useState, useEffect, useCallback } from "react";
import Image from "next/image";
import {
  AnimatePresence,
  motion,
  useInView,
  useMotionTemplate,
  useMotionValue,
  useReducedMotion,
  useSpring,
  useTransform,
  Variants,
} from "framer-motion";

/* ------------------------------------------------------------------ */
/* Constants and helpers                                               */
/* ------------------------------------------------------------------ */
const EASE = [0.16, 1, 0.3, 1] as const;
const MAX_TILT = 3; // degrees: keep it subtle
const cn = (...c: (string | false | undefined)[]) => c.filter(Boolean).join(" ");

/*
 * Headline reveal. The heading itself is observed (it is never clipped).
 * Observing the words would fail: they start below an overflow-hidden mask,
 * so the browser would report them as never visible.
 */
const wordsParent: Variants = {
  hidden: {},
  show: { transition: { staggerChildren: 0.07, delayChildren: 0.1 } },
};
const wordChild: Variants = {
  hidden: { y: "115%", rotate: 4 },
  show: { y: 0, rotate: 0, transition: { duration: 0.9, ease: EASE } },
};

/* ------------------------------------------------------------------ */
/* Story clock: restarts from the beginning whenever it enters view    */
/* ------------------------------------------------------------------ */
function useLoop(max: number, ms: number) {
  const ref = useRef<HTMLDivElement>(null);
  const inView = useInView(ref, { amount: 0.5 });
  const reduce = useReducedMotion() ?? false;
  const [n, setN] = useState(0);

  useEffect(() => {
    setN(0);
    if (!inView || reduce) return;
    const id = setInterval(() => setN((v) => v + 1), ms);
    return () => clearInterval(id);
  }, [inView, reduce, ms]);

  return { ref, t: reduce ? max - 1 : n % max, cycle: Math.floor(n / max), reduce };
}

/* ------------------------------------------------------------------ */
/* Image that always fits: fixed ratio box + fill, rounded corners     */
/* ------------------------------------------------------------------ */
function Pic({
  src,
  fit = "cover",
  sizes,
  className,
  children,
}: {
  src: string;
  fit?: "cover" | "contain";
  sizes: string;
  className?: string;
  children?: React.ReactNode;
}) {
  return (
    <div className={cn("relative w-full shrink-0 overflow-hidden", className)}>
      <Image
        src={src}
        alt=""
        aria-hidden
        fill
        sizes={sizes}
        className={cn(
          fit === "cover" ? "object-cover" : "object-contain",
          "transition-transform duration-700 group-hover:scale-[1.04]"
        )}
      />
      {children}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Card shell: entrance, gentle tilt, cursor light                     */
/* ------------------------------------------------------------------ */
type Tone = "dark" | "paper" | "sun";

const BG: Record<Tone, string> = {
  dark:
    "radial-gradient(90% 70% at 100% 0%, rgba(249,115,22,0.28), transparent 60%), radial-gradient(70% 60% at 0% 100%, rgba(99,102,241,0.25), transparent 60%), linear-gradient(160deg, #1b2249 0%, #0a0e1f 100%)",
  paper:
    "radial-gradient(80% 60% at 0% 0%, rgba(255,255,255,0.55), transparent 60%), radial-gradient(70% 60% at 100% 100%, rgba(249,115,22,0.28), transparent 60%), linear-gradient(160deg, #ffe9d3 0%, #ffcfa4 100%)",
  sun:
    "radial-gradient(70% 60% at 100% 0%, rgba(255,255,255,0.38), transparent 60%), radial-gradient(60% 60% at 0% 100%, rgba(190,60,0,0.38), transparent 60%), linear-gradient(135deg, #f97316 0%, #fb923c 60%, #fbbf24 100%)",
};

const SHELL: Record<Tone, string> = {
  dark: "text-slate-50 border-white/10 shadow-[0_24px_50px_-26px_rgba(10,14,31,0.9)] hover:shadow-[0_34px_60px_-26px_rgba(249,115,22,0.45)]",
  paper: "text-slate-900 border-orange-900/10 shadow-[0_18px_40px_-26px_rgba(154,52,18,0.5)] hover:shadow-[0_30px_55px_-26px_rgba(154,52,18,0.55)]",
  sun: "text-white border-white/30 shadow-[0_24px_50px_-26px_rgba(234,88,12,0.85)] hover:shadow-[0_34px_60px_-26px_rgba(234,88,12,0.95)]",
};

const LIGHT: Record<Tone, string> = {
  dark: "rgba(251,146,60,0.2)",
  paper: "rgba(255,255,255,0.6)",
  sun: "rgba(255,255,255,0.32)",
};

function Card({
  tone,
  className,
  delay = 0,
  children,
}: {
  tone: Tone;
  className?: string;
  delay?: number;
  children: React.ReactNode;
}) {
  const reduce = useReducedMotion() ?? false;

  const px = useMotionValue(0);
  const py = useMotionValue(0);
  const sx = useSpring(px, { stiffness: 140, damping: 22 });
  const sy = useSpring(py, { stiffness: 140, damping: 22 });
  const rotateY = useTransform(sx, [-0.5, 0.5], [-MAX_TILT, MAX_TILT]);
  const rotateX = useTransform(sy, [-0.5, 0.5], [MAX_TILT, -MAX_TILT]);

  const gx = useMotionValue(-400);
  const gy = useMotionValue(-400);
  const light = useMotionTemplate`radial-gradient(320px circle at ${gx}px ${gy}px, ${LIGHT[tone]}, transparent 70%)`;

  const onMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (e.pointerType === "touch") return;
    const r = e.currentTarget.getBoundingClientRect();
    const nx = (e.clientX - r.left) / r.width;
    const ny = (e.clientY - r.top) / r.height;
    px.set(nx - 0.5);
    py.set(ny - 0.5);
    gx.set(nx * r.width);
    gy.set(ny * r.height);
  };

  const onLeave = () => {
    px.set(0);
    py.set(0);
    gx.set(-400);
    gy.set(-400);
  };

  return (
    <motion.div
      initial={reduce ? false : { opacity: 0, y: 32, scale: 0.97 }}
      whileInView={{ opacity: 1, y: 0, scale: 1 }}
      whileHover={reduce ? undefined : { y: -4 }}
      viewport={{ once: true, amount: 0.1 }}
      transition={{ duration: 0.8, delay, ease: EASE }}
      onPointerMove={reduce ? undefined : onMove}
      onPointerLeave={onLeave}
      style={{
        backgroundImage: BG[tone],
        ...(reduce ? {} : { rotateX, rotateY, transformPerspective: 1400 }),
      }}
      className={cn(
        "group relative flex min-w-0 flex-col overflow-hidden border p-5 transition-shadow duration-500 sm:p-6 lg:p-7",
        SHELL[tone],
        className
      )}
    >
      <div aria-hidden className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-white/60 to-transparent" />
      <motion.div
        aria-hidden
        style={{ background: light }}
        className="pointer-events-none absolute inset-0 rounded-[inherit] opacity-0 transition-opacity duration-300 group-hover:opacity-100"
      />
      <div className="relative flex min-w-0 flex-1 flex-col">{children}</div>
    </motion.div>
  );
}

function Title({ title, body, tone }: { title: string; body: string; tone: Tone }) {
  return (
    <div>
      <motion.span
        initial={{ width: 0 }}
        whileInView={{ width: 32 }}
        viewport={{ once: true }}
        transition={{ duration: 0.8, delay: 0.3, ease: EASE }}
        className={cn(
          "mb-3 block h-1 rounded-full",
          tone === "dark" ? "bg-orange-400" : tone === "sun" ? "bg-white" : "bg-orange-500"
        )}
      />
      <h3 className="font-[family-name:var(--font-display)] text-lg font-bold tracking-tight sm:text-xl xl:text-2xl">
        {title}
      </h3>
      <p
        className={cn(
          "mt-1 max-w-sm text-sm font-medium leading-relaxed",
          tone === "dark" ? "text-slate-300" : tone === "sun" ? "text-white/90" : "text-slate-700"
        )}
      >
        {body}
      </p>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* 1. Support: WhatsApp team + AI assistant chat                       */
/* ------------------------------------------------------------------ */
type Msg = { from: "me" | "bot"; text: string };
const CHATS: Record<"ai" | "team", Msg[]> = {
  ai: [
    { from: "me", text: "Warm, golden wedding invite please" },
    { from: "bot", text: "Done. Gold script and blush florals. Like it?" },
    { from: "me", text: "Love it! Add a countdown" },
    { from: "bot", text: "Added a countdown to your big day." },
  ],
  team: [
    { from: "bot", text: "Welcome! Need help picking a template?" },
    { from: "me", text: "Yes please, a wedding one!" },
    { from: "bot", text: "Sending you 3 favourites now." },
  ],
};

function SupportStory() {
  const { ref, t, cycle, reduce } = useLoop(9, 1100);
  const [picked, setPicked] = useState<null | "ai" | "team">(null);
  const tab = picked ?? (cycle % 2 === 0 ? "ai" : "team");
  const msgs = CHATS[tab];
  const shown = Math.min(t, msgs.length);
  const typing = !reduce && t < msgs.length && msgs[t].from === "bot";

  return (
    <div
      ref={ref}
      className="w-full max-w-[380px] overflow-hidden rounded-3xl border border-white/10 bg-white/[0.05] shadow-[0_24px_50px_-20px_rgba(0,0,0,0.7)] backdrop-blur-md"
    >
      <div role="tablist" aria-label="Support channel" className="relative flex gap-1 p-1.5">
        {(
          [
            { id: "ai", label: "AI assistant", on: "bg-orange-500 shadow-orange-500/30" },
            { id: "team", label: "WhatsApp team", on: "bg-emerald-500 shadow-emerald-500/30" },
          ] as const
        ).map(({ id, label, on }) => (
          <button
            key={id}
            type="button"
            role="tab"
            aria-selected={tab === id}
            onClick={() => setPicked(id)}
            className={cn(
              "flex-1 cursor-pointer truncate rounded-2xl px-2 py-2 text-[11px] font-bold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-400 sm:px-3 sm:text-xs",
              tab === id ? `${on} text-white shadow-lg` : "text-slate-300/70 hover:text-white"
            )}
          >
            {label}
          </button>
        ))}
      </div>

      <div className="flex min-h-[190px] flex-col justify-end gap-2 px-3 pb-3.5 pt-2">
        <AnimatePresence initial={false}>
          {msgs.slice(0, shown).map((m, i) => (
            <motion.div
              key={`${tab}-${i}`}
              initial={reduce ? false : { opacity: 0, y: 12, scale: 0.96 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              transition={{ duration: 0.35, ease: EASE }}
              className={cn(
                "max-w-[88%] rounded-2xl px-3 py-2 text-[12.5px] leading-snug",
                m.from === "me"
                  ? cn("ml-auto rounded-tr-sm text-white", tab === "ai" ? "bg-orange-500" : "bg-emerald-500")
                  : "rounded-tl-sm bg-white/10 text-slate-50"
              )}
            >
              {m.text}
            </motion.div>
          ))}
        </AnimatePresence>
        {typing && (
          <div className="flex w-fit items-center gap-1 rounded-2xl rounded-tl-sm bg-white/10 px-3 py-2.5">
            {[0, 1, 2].map((d) => (
              <motion.span
                key={d}
                className="h-1.5 w-1.5 rounded-full bg-slate-300"
                animate={{ y: [0, -4, 0] }}
                transition={{ duration: 0.7, repeat: Infinity, delay: d * 0.12 }}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* 2. RSVPs: guests reply one by one                                   */
/* ------------------------------------------------------------------ */
const RSVP_EVENTS = ["Ayesha accepted", "Bilal and family are in", "Sana added 2 guests", "Hamza is coming"];

function RsvpStory() {
  const { ref, t, reduce } = useLoop(RSVP_EVENTS.length, 2200);
  return (
    <div ref={ref} className="mt-5">
      <Pic
        src="/why-rsvp.png"
        sizes="(max-width: 640px) 90vw, (max-width: 1024px) 45vw, 420px"
        className="aspect-[4/3] rounded-2xl shadow-[0_18px_40px_-20px_rgba(154,52,18,0.55)] ring-1 ring-orange-900/10"
      >
        <div className="absolute left-2.5 top-2.5 z-10 flex items-center gap-2 rounded-full bg-slate-900/90 px-3 py-1.5 text-[11px] font-bold text-white shadow-lg backdrop-blur">
          <span className="relative flex h-2 w-2">
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75" />
            <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-400" />
          </span>
          <span className="tabular-nums">{128 + t}</span> confirmed
        </div>
        <AnimatePresence mode="wait">
          <motion.div
            key={t}
            initial={reduce ? false : { opacity: 0, y: 14, scale: 0.92 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.4, ease: EASE }}
            className="absolute inset-x-2.5 bottom-2.5 z-10 w-fit max-w-[calc(100%-1.25rem)] rounded-xl bg-white/95 px-3.5 py-2 text-xs font-bold text-slate-900 shadow-xl"
          >
            {RSVP_EVENTS[t]}
          </motion.div>
        </AnimatePresence>
      </Pic>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* 3. Builder: a block is dragged onto the canvas                      */
/* ------------------------------------------------------------------ */
function Cursor({ className }: { className?: string }) {
  return (
    <svg aria-hidden viewBox="0 0 16 16" className={className}>
      <path d="M2 1l11 5.2-4.6 1.4L6.9 13z" fill="#fff" stroke="#0f172a" strokeWidth="1.2" strokeLinejoin="round" />
    </svg>
  );
}

function BuilderStory() {
  const reduce = useReducedMotion() ?? false;
  const ref = useRef<HTMLDivElement>(null);
  const inView = useInView(ref, { amount: 0.3 });

  return (
    <div ref={ref} className="mt-5">
      <Pic
        src="/why-builder.png"
        sizes="(max-width: 640px) 90vw, (max-width: 1024px) 45vw, 400px"
        className="aspect-[16/10] rounded-2xl shadow-[0_20px_50px_-15px_rgba(249,115,22,0.5)] ring-1 ring-white/10"
      >
        {/* Only runs while visible, so it isn't animating off-screen */}
        {!reduce && inView && (
          <motion.div
            aria-hidden
            className="absolute left-3 top-4 rounded-lg bg-orange-500 px-3 py-1.5 text-[11px] font-bold text-white shadow-xl shadow-orange-500/40"
            animate={{
              x: [0, 90, 90, 90, 0],
              y: [0, 34, 34, 34, 0],
              scale: [1, 1.08, 1, 1, 1],
              opacity: [0, 1, 1, 0, 0],
              rotate: [-6, 3, 0, 0, -6],
            }}
            transition={{ duration: 5, repeat: Infinity, ease: "easeInOut", times: [0, 0.35, 0.5, 0.8, 1] }}
          >
            Countdown
            <Cursor className="absolute -bottom-3 -right-3 h-4 w-4" />
          </motion.div>
        )}
      </Pic>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* 4. AI mood: type a mood, ideas pop in                               */
/* ------------------------------------------------------------------ */
const MOODS = [
  { text: "Romantic gold and blush", chips: ["Blush + gold", "Script font", "Soft florals"] },
  { text: "Playful birthday vibes", chips: ["Bright coral", "Bold font", "Confetti"] },
  { text: "Elegant corporate gala", chips: ["Navy + amber", "Serif font", "Clean lines"] },
];

function AiMoodStory() {
  const { ref, t, cycle, reduce } = useLoop(40, 90);
  const mood = MOODS[cycle % MOODS.length];
  const typed = reduce ? mood.text : mood.text.slice(0, Math.min(t, mood.text.length));
  const showChips = reduce || t >= mood.text.length + 2;

  return (
    <div ref={ref} className="absolute inset-x-2.5 bottom-2.5 z-10 sm:inset-x-4 sm:bottom-4">
      <div className="rounded-2xl border border-white/50 bg-slate-900/90 p-2.5 shadow-2xl backdrop-blur-md sm:p-3">
        <div className="flex items-center gap-2 text-[12px] font-semibold text-white">
          <span className="truncate">{typed}</span>
          <span className="h-3.5 w-px shrink-0 animate-pulse bg-orange-300" />
        </div>
        <div className="mt-2 flex min-h-[26px] flex-wrap gap-1.5">
          <AnimatePresence>
            {showChips &&
              mood.chips.map((c, i) => (
                <motion.span
                  key={`${cycle}-${c}`}
                  initial={reduce ? false : { opacity: 0, scale: 0.7, y: 6 }}
                  animate={{ opacity: 1, scale: 1, y: 0 }}
                  transition={{ delay: i * 0.12, duration: 0.35, ease: EASE }}
                  className="rounded-full bg-orange-500 px-2.5 py-1 text-[10.5px] font-bold text-white"
                >
                  {c}
                </motion.span>
              ))}
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* 5. Slugs: a link is typed, goes live, gets shared                   */
/* ------------------------------------------------------------------ */
const SLUGS = ["sara-and-ahmed", "eid-brunch-26", "tech-summit-26"];

function SlugStory() {
  const { ref, t, cycle, reduce } = useLoop(34, 110);
  const slug = SLUGS[cycle % SLUGS.length];
  const typed = reduce ? slug : slug.slice(0, Math.min(t, slug.length));
  const live = reduce || t >= slug.length + 3;
  const shared = !reduce && t >= slug.length + 12;

  return (
    <div ref={ref} className="mt-5">
      <Pic
        src="/why-slugs.png"
        sizes="(max-width: 640px) 90vw, (max-width: 1024px) 45vw, 480px"
        className="aspect-[16/9] rounded-2xl shadow-xl shadow-orange-900/20 ring-1 ring-orange-900/10 sm:aspect-[2/1]"
      >
        <div className="absolute inset-x-2.5 bottom-2.5 flex items-center gap-1 rounded-xl bg-[#11162a]/95 px-3 py-2.5 font-mono text-[11px] shadow-xl ring-1 ring-white/10 backdrop-blur sm:inset-x-4 sm:bottom-4 sm:text-xs">
          <span className="hidden shrink-0 text-slate-400 min-[380px]:inline">riwainvite.com/invite/</span>
          <span className="truncate font-bold text-white">{typed}</span>
          <span className="h-3.5 w-px shrink-0 animate-pulse bg-orange-400" />
          <AnimatePresence mode="wait">
            {live && (
              <motion.span
                key={shared ? "shared" : "live"}
                initial={reduce ? false : { opacity: 0, scale: 0.6 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.6 }}
                className={cn(
                  "ml-auto shrink-0 rounded-full px-2.5 py-1 font-sans text-[10.5px] font-bold",
                  shared ? "bg-orange-500 text-white" : "bg-emerald-500/20 text-emerald-300"
                )}
              >
                {shared ? "Shared" : "Live"}
              </motion.span>
            )}
          </AnimatePresence>
        </div>
      </Pic>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* 6. Plans: the event grows, the plan follows (no prices)             */
/* ------------------------------------------------------------------ */
function PlansStory() {
  const { ref, t, reduce } = useLoop(2, 2600);
  const pro = t === 1;

  return (
    <div ref={ref} className="mt-5 space-y-3.5">
      <div className="relative grid grid-cols-2 gap-1 rounded-2xl bg-white/5 p-1 ring-1 ring-white/10">
        {(["Basic", "Pro"] as const).map((p) => {
          const active = (p === "Pro") === pro;
          return (
            <div key={p} className="relative rounded-xl px-2 py-2.5 text-center sm:px-4">
              {active && (
                <motion.div
                  layoutId="plan-pill"
                  transition={{ type: "spring", stiffness: 300, damping: 28 }}
                  className="absolute inset-0 rounded-xl bg-gradient-to-br from-orange-500 to-amber-400 shadow-lg shadow-orange-500/30"
                />
              )}
              <p className={cn("relative text-sm font-bold", active ? "text-white" : "text-slate-300")}>{p}</p>
              <p className={cn("relative text-[11px] leading-tight", active ? "text-white/90" : "text-slate-400")}>
                {p === "Basic" ? "For small gatherings" : "For bigger celebrations"}
              </p>
            </div>
          );
        })}
      </div>
      <div>
        <div className="mb-1.5 flex justify-between gap-2 text-[11px] font-semibold text-slate-300">
          <span>Your guest list</span>
          <span className="text-orange-300">{pro ? "Big celebration" : "Cosy gathering"}</span>
        </div>
        <div className="h-2 overflow-hidden rounded-full bg-white/10">
          <motion.div
            className="h-full rounded-full bg-gradient-to-r from-orange-400 to-amber-300"
            animate={{ width: pro ? "88%" : "32%" }}
            transition={reduce ? { duration: 0 } : { duration: 1.1, ease: EASE }}
          />
        </div>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* 7. Suggestions: colours and wording get refreshed                   */
/* ------------------------------------------------------------------ */
const PALETTES = [
  ["#fda4af", "#fb923c", "#fbbf24", "#fde68a", "#86efac"],
  ["#f97316", "#facc15", "#fb7185", "#38bdf8", "#a78bfa"],
  ["#1e3a8a", "#f59e0b", "#fef3c7", "#64748b", "#0f172a"],
];
const BEFORE = "Join us for our wedding";
const AFTER = "Together with our families, we joyfully invite you to celebrate our wedding";

function SuggestStory() {
  const { ref, t, cycle, reduce } = useLoop(46, 90);
  const palette = PALETTES[cycle % PALETTES.length];
  const typed = reduce ? AFTER : AFTER.slice(0, Math.min(t * 3, AFTER.length));
  const frame = "aspect-[16/10] rounded-2xl shadow-xl shadow-orange-900/25 ring-1 ring-orange-900/10";

  return (
    <div ref={ref} className="grid min-w-0 grid-cols-1 gap-4 sm:grid-cols-2">
      <Pic src="/why-ai-colors.png" sizes="(max-width: 640px) 90vw, (max-width: 1024px) 45vw, 380px" className={frame}>
        <div className="absolute inset-x-2.5 bottom-2.5 flex items-center gap-2 rounded-xl bg-slate-900/90 px-3 py-2 backdrop-blur">
          <span className="text-[11px] font-semibold text-slate-300">Palette</span>
          <div className="ml-auto flex gap-1.5">
            {palette.map((c, i) => (
              <motion.span
                key={`${cycle}-${i}`}
                initial={reduce ? false : { scale: 0, rotate: -30 }}
                animate={{ scale: 1, rotate: 0 }}
                transition={{ delay: i * 0.08, type: "spring", stiffness: 380, damping: 18 }}
                className="h-5 w-5 rounded-full ring-2 ring-white/70"
                style={{ backgroundColor: c }}
              />
            ))}
          </div>
        </div>
      </Pic>
      <Pic src="/why-ai-words.png" sizes="(max-width: 640px) 90vw, (max-width: 1024px) 45vw, 380px" className={frame}>
        <div className="absolute inset-x-2.5 bottom-2.5 rounded-xl bg-slate-900/90 px-3 py-2 backdrop-blur">
          <p className="truncate text-[10.5px] text-slate-400 line-through">{BEFORE}</p>
          <p className="mt-0.5 min-h-[30px] text-[11px] font-semibold leading-snug text-white">
            {typed}
            <span className="ml-0.5 inline-block h-3 w-px animate-pulse bg-orange-300 align-middle" />
          </p>
        </div>
      </Pic>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Section header                                                      */
/* ------------------------------------------------------------------ */
const HEADLINE_LINES = [
  { words: ["Everything", "you", "need"], accent: false },
  { words: ["to", "create", "magic."], accent: true },
];

function Headline({ reduce }: { reduce: boolean }) {
  return (
    <motion.h2
      id="why-riwainvite-heading"
      aria-label="Everything you need to create magic."
      variants={wordsParent}
      initial={reduce ? "show" : "hidden"}
      whileInView="show"
      viewport={{ once: true, margin: "-80px" }}
      className="font-[family-name:var(--font-display)] text-[2rem] font-extrabold leading-[1.05] tracking-tighter text-slate-900 sm:text-5xl lg:col-span-8 lg:text-6xl"
    >
      {HEADLINE_LINES.map((line, li) => (
        <span key={li} className="block">
          {line.words.map((w, i) => (
            <span key={i} className="mr-[0.25em] inline-block overflow-hidden pb-[0.12em] align-bottom">
              <motion.span
                aria-hidden
                variants={wordChild}
                className={cn(
                  "inline-block origin-bottom-left",
                  line.accent && "bg-gradient-to-r from-[#f97316] to-amber-500 bg-clip-text text-transparent"
                )}
              >
                {w}
              </motion.span>
            </span>
          ))}
        </span>
      ))}
    </motion.h2>
  );
}

/* ------------------------------------------------------------------ */
/* Section                                                             */
/* ------------------------------------------------------------------ */
export function WhyRiwainvite() {
  const reduce = useReducedMotion() ?? false;
  const sectionRef = useRef<HTMLElement>(null);
  const raf = useRef(0);

  // Cursor-reactive dot grid, throttled to one update per frame.
  const onMove = useCallback((e: React.PointerEvent) => {
    if (e.pointerType === "touch") return;
    const { clientX: x, clientY: y } = e;
    cancelAnimationFrame(raf.current);
    raf.current = requestAnimationFrame(() => {
      sectionRef.current?.style.setProperty("--mx", `${x}px`);
      sectionRef.current?.style.setProperty("--my", `${y}px`);
    });
  }, []);

  useEffect(() => () => cancelAnimationFrame(raf.current), []);

  const mask = "radial-gradient(230px circle at var(--mx,-999px) var(--my,-999px), #000 0%, transparent 100%)";

  return (
    <section
      id="why-riwainvite"
      ref={sectionRef}
      onPointerMove={onMove}
      aria-labelledby="why-riwainvite-heading"
      className="relative isolate w-full overflow-hidden bg-[#fdeadb] py-12 font-[family-name:var(--font-body)] sm:py-16 lg:py-20"
    >
      <div aria-hidden className="pointer-events-none absolute inset-0 -z-10">
        <div className="absolute inset-0 bg-gradient-to-b from-[#fff4ea] to-[#fbdcc0]" />
        <motion.div
          animate={reduce ? undefined : { x: [0, 60, 0], y: [0, 30, 0] }}
          transition={{ duration: 18, repeat: Infinity, ease: "easeInOut" }}
          className="absolute -left-32 top-10 h-[420px] w-[420px] rounded-full bg-orange-300/30 blur-[120px]"
        />
        <motion.div
          animate={reduce ? undefined : { x: [0, -50, 0], y: [0, -40, 0] }}
          transition={{ duration: 22, repeat: Infinity, ease: "easeInOut" }}
          className="absolute -right-32 bottom-0 h-[420px] w-[420px] rounded-full bg-amber-300/30 blur-[120px]"
        />
        <div
          className="absolute inset-0"
          style={{ backgroundImage: "radial-gradient(circle, rgba(194,65,12,0.2) 1.5px, transparent 1.5px)", backgroundSize: "24px 24px" }}
        />
        <div
          className="absolute inset-0"
          style={{
            backgroundImage: "radial-gradient(circle, rgba(234,88,12,0.95) 2px, transparent 2px)",
            backgroundSize: "24px 24px",
            maskImage: mask,
            WebkitMaskImage: mask,
          }}
        />
      </div>

      <div className="mx-auto w-full max-w-7xl px-4 sm:px-6 lg:px-8">
        <header className="mb-8 grid items-end gap-4 sm:mb-10 lg:grid-cols-12 lg:gap-6">
          <Headline reduce={reduce} />
          <motion.p
            initial={reduce ? false : { opacity: 0, y: 16, filter: "blur(6px)" }}
            whileInView={{ opacity: 1, y: 0, filter: "blur(0px)" }}
            viewport={{ once: true, margin: "-80px" }}
            transition={{ duration: 0.8, delay: 0.5, ease: EASE }}
            className="max-w-sm text-base font-medium text-slate-600 lg:col-span-4 lg:justify-self-end"
          >
            Templates, RSVPs and a team that answers. All in one place.
          </motion.p>
        </header>

        {/* mobile: 1 col · tablet: 6 col · desktop: 12 col */}
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-6 lg:grid-cols-12 lg:gap-5">
          {/* Support */}
          <Card tone="dark" className="rounded-[1.75rem] sm:col-span-6 lg:col-span-7">
            <div className="flex flex-1 flex-col gap-5 lg:flex-row lg:items-center">
              <div className="flex-1">
                <Title
                  tone="dark"
                  title="Support that never sleeps"
                  body="Real people on WhatsApp. After you log in or register, an AI assistant answers in seconds."
                />
                <p className="mt-4 inline-block rounded-full border border-orange-300/20 bg-orange-400/10 px-3 py-1.5 text-xs font-semibold text-orange-200">
                  AI assistant unlocks after login
                </p>
              </div>
              <div className="flex flex-1 justify-center lg:justify-end">
                <SupportStory />
              </div>
            </div>
          </Card>

          {/* RSVPs */}
          <Card tone="paper" delay={0.08} className="rounded-3xl sm:col-span-3 lg:col-span-5">
            <Title tone="paper" title="Real-time RSVPs" body="Watch replies roll in the moment guests respond." />
            <RsvpStory />
          </Card>

          {/* Builder */}
          <Card tone="dark" className="rounded-3xl sm:col-span-3 lg:col-span-4">
            <Title tone="dark" title="No-code builder" body="Drag, drop, done. Every pixel yours." />
            <BuilderStory />
          </Card>

          {/* AI mood */}
          <Card tone="sun" delay={0.08} className="rounded-[1.75rem] sm:col-span-6 lg:col-span-8">
            <div className="flex flex-1 flex-col gap-5 md:flex-row md:items-center">
              <div className="md:w-[38%]">
                <Title
                  tone="sun"
                  title="Start from a mood, not a blank page"
                  body="Describe the feeling you want. Riwa AI brings back colour, font and style ideas to build on."
                />
                <ul className="mt-4 space-y-1.5 text-sm font-semibold">
                  {["Ideas that match your event", "Fresh options in one click", "You choose every detail"].map((item) => (
                    <li key={item} className="flex items-center gap-2.5">
                      <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-white" />
                      {item}
                    </li>
                  ))}
                </ul>
              </div>
              <div className="relative min-w-0 flex-1">
                <Pic
                  src="/why-ai.png"
                  sizes="(max-width: 768px) 90vw, 560px"
                  className="aspect-[16/10] rounded-2xl shadow-[0_24px_50px_-20px_rgba(120,40,0,0.6)] ring-1 ring-white/40"
                >
                  <AiMoodStory />
                </Pic>
              </div>
            </div>
          </Card>

          {/* Slugs */}
          <Card tone="paper" className="rounded-3xl sm:col-span-3 lg:col-span-5">
            <Title tone="paper" title="Custom slugs" body="Branded URLs your guests will remember." />
            <SlugStory />
          </Card>

          {/* Plans */}
          <Card tone="dark" delay={0.08} className="rounded-[1.75rem] sm:col-span-3 lg:col-span-7">
            <div className="flex flex-1 flex-col gap-5 lg:flex-row lg:items-center">
              <div className="min-w-0 flex-1">
                <Title tone="dark" title="Flexible plans" body="Pay for the size of your event, not extras." />
                <PlansStory />
              </div>
              <Pic
                src="/why-plans.png"
                sizes="(max-width: 640px) 90vw, (max-width: 1024px) 45vw, 340px"
                className="aspect-[16/10] rounded-2xl ring-1 ring-white/10 lg:w-[40%]"
              />
            </div>
          </Card>

          {/* Suggestions */}
          <Card tone="paper" className="rounded-[1.75rem] sm:col-span-6 lg:col-span-12">
            <div className="grid flex-1 items-center gap-6 lg:grid-cols-[0.7fr_1.3fr] lg:gap-8">
              <Title
                tone="paper"
                title="Smart suggestions, right where you work"
                body="Stuck on colours or the perfect wording? Get fresh ideas as you build, keep the ones you love and skip the rest."
              />
              <SuggestStory />
            </div>
          </Card>
        </div>
      </div>
    </section>
  );
}