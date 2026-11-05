"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import {
  AnimatePresence,
  motion,
  MotionValue,
  useInView,
  useMotionTemplate,
  useMotionValue,
  useReducedMotion,
  useScroll,
  useSpring,
  useTransform,
} from "framer-motion";

/* ------------------------------------------------------------------ */
/* 1. CUSTOM ICONS                                                    */
/* ------------------------------------------------------------------ */
type IconProps = { className?: string };
const part = "origin-center [transform-box:fill-box]";

function CanvasIcon({ className }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="none" className={className} aria-hidden>
      <rect
        x="5" y="2" width="14" height="14" rx="3.2"
        stroke="currentColor" strokeWidth="1.5" opacity="0.5"
        className={`${part} transition-transform duration-500 ease-out group-hover:-translate-y-[1.5px] group-hover:-rotate-6`}
      />
      <rect
        x="3.5" y="6.5" width="17" height="15" rx="3.2"
        stroke="currentColor" strokeWidth="1.6" fill="currentColor" fillOpacity="0.18"
        className={`${part} transition-transform duration-500 ease-out group-hover:translate-y-[1px] group-hover:rotate-3`}
      />
      <path
        d="M12 10.2c.35 2 1.1 2.75 3.1 3.1-2 .35-2.75 1.1-3.1 3.1-.35-2-1.1-2.75-3.1-3.1 2-.35 2.75-1.1 3.1-3.1Z"
        fill="currentColor"
        className={`${part} transition-transform duration-700 ease-[cubic-bezier(0.16,1,0.3,1)] group-hover:rotate-[180deg] group-hover:scale-[1.35]`}
      />
    </svg>
  );
}

function CraftIcon({ className }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="none" className={className} aria-hidden>
      <g className={`${part} transition-transform duration-700 ease-[cubic-bezier(0.16,1,0.3,1)] group-hover:rotate-90`}>
        <path d="M12 2.5 21.5 12 12 21.5 2.5 12 12 2.5Z" stroke="currentColor" strokeWidth="1.6" strokeLinejoin="round" />
        <path d="M12 2.5V8M12 16v5.5M2.5 12H8M16 12h5.5" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" opacity="0.6" />
      </g>
      <path
        d="M12 8.2 15.8 12 12 15.8 8.2 12 12 8.2Z" fill="currentColor"
        className={`${part} transition-transform duration-500 ease-out group-hover:scale-[1.3] group-hover:-rotate-90`}
      />
    </svg>
  );
}

function SwapArrow({ className }: IconProps) {
  const arrow = (
    <svg viewBox="0 0 24 24" fill="none" className="h-full w-full" aria-hidden>
      <path d="M4 12h15M13.5 6l6 6-6 6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
  return (
    <span className={`relative inline-block overflow-hidden ${className ?? ""}`} aria-hidden>
      <span className="absolute inset-0 transition-transform duration-500 ease-[cubic-bezier(0.16,1,0.3,1)] group-hover:translate-x-[140%]">
        {arrow}
      </span>
      <span className="absolute inset-0 -translate-x-[140%] transition-transform duration-500 delay-75 ease-[cubic-bezier(0.16,1,0.3,1)] group-hover:translate-x-0">
        {arrow}
      </span>
    </span>
  );
}

function RsvpIcon({ className }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="none" className={className} aria-hidden>
      <rect x="3" y="5" width="18" height="14" rx="3.5" stroke="currentColor" strokeWidth="1.6" />
      <path d="m3.8 7.5 7.1 5.2a1.9 1.9 0 0 0 2.2 0l7.1-5.2" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" opacity="0.55" />
      <circle cx="18.5" cy="17.5" r="4" fill="currentColor" />
      <path d="m16.7 17.6 1.3 1.3 2.3-2.5" stroke="#fff" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}
function BuilderIcon({ className }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="none" className={className} aria-hidden>
      <rect x="3" y="3.5" width="18" height="6" rx="2" stroke="currentColor" strokeWidth="1.6" />
      <rect x="3" y="12.5" width="8" height="8" rx="2" stroke="currentColor" strokeWidth="1.6" opacity="0.55" />
      <path d="M15 13.2v7.6l2.2-2 1.6 3 1.4-.8-1.6-2.9 3 .1L15 13.2Z" fill="currentColor" />
    </svg>
  );
}
function SlugIcon({ className }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="none" className={className} aria-hidden>
      <path d="M10.5 13.5a4 4 0 0 0 5.7 0l3-3a4 4 0 0 0-5.7-5.7l-1 1" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" />
      <path d="M13.5 10.5a4 4 0 0 0-5.7 0l-3 3a4 4 0 0 0 5.7 5.7l1-1" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" opacity="0.55" />
    </svg>
  );
}
function AiIcon({ className }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="none" className={className} aria-hidden>
      <path d="M10 4c.6 3.8 2.2 5.4 6 6-3.8.6-5.4 2.2-6 6-.6-3.8-2.2-5.4-6-6 3.8-.6 5.4-2.2 6-6Z" fill="currentColor" />
      <path d="M18.5 14.5c.3 1.7 1 2.4 2.7 2.7-1.7.3-2.4 1-2.7 2.7-.3-1.7-1-2.4-2.7-2.7 1.7-.3 2.4-1 2.7-2.7Z" fill="currentColor" opacity="0.6" />
      <circle cx="18" cy="5" r="1.2" fill="currentColor" opacity="0.5" />
    </svg>
  );
}

/* ------------------------------------------------------------------ */
/* Constants and helpers                                               */
/* ------------------------------------------------------------------ */
const EASE = [0.16, 1, 0.3, 1] as const;
const cn = (...c: (string | false | undefined)[]) => c.filter(Boolean).join(" ");

const focusRing =
  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-500 focus-visible:ring-offset-2";

const rise = {
  hidden: { opacity: 0, y: 24, filter: "blur(8px)" },
  visible: (d: number) => ({
    opacity: 1,
    y: 0,
    filter: "blur(0px)",
    transition: { duration: 1, ease: EASE, delay: d },
  }),
};

/* ------------------------------------------------------------------ */
/* Story                                                              */
/* ------------------------------------------------------------------ */
const CHAPTERS = [
  { key: "Design", line: "Pick a template you love." },
  { key: "Customize", line: "Make every detail yours." },
  { key: "Share", line: "Send one link to everyone." },
  { key: "Track", line: "Watch the replies arrive live." },
];
const CHAPTER_MS = 2600;
const STORY_START_MS = 2400;

function Story({ reduce }: { reduce: boolean }) {
  const [i, setI] = useState(0);
  const [started, setStarted] = useState(false);

  useEffect(() => {
    if (reduce) return;
    const t = setTimeout(() => setStarted(true), STORY_START_MS);
    return () => clearTimeout(t);
  }, [reduce]);

  useEffect(() => {
    if (reduce || !started) return;
    const t = setTimeout(() => setI((v) => (v + 1) % CHAPTERS.length), CHAPTER_MS);
    return () => clearTimeout(t);
  }, [i, started, reduce]);

  return (
    <div className="mt-8 w-full max-w-md sm:mt-14">
      <div className="grid grid-cols-4 gap-1.5 sm:gap-2" role="group" aria-label="Invitation journey">
        {CHAPTERS.map((c, n) => {
          const done = n < i;
          const active = n === i;
          return (
            <button
              key={c.key}
              type="button"
              onClick={() => setI(n)}
              aria-current={active ? "step" : undefined}
              className={cn("cursor-pointer rounded-md text-left", focusRing)}
            >
              <span
                className={cn(
                  "mb-1 block text-[10px] font-semibold transition-colors duration-500 sm:mb-1.5 sm:text-xs",
                  active ? "text-gray-900" : done ? "text-orange-600" : "text-gray-400 hover:text-gray-600",
                )}
              >
                {c.key}
              </span>
              <span className="block h-[2px] overflow-hidden rounded-full bg-orange-200/70 sm:h-[3px]">
                <motion.span
                  key={`${n}-${i}`}
                  className="block h-full rounded-full bg-gradient-to-r from-orange-500 to-amber-400"
                  initial={{ width: done || reduce ? "100%" : "0%" }}
                  animate={{ width: done || active || reduce ? "100%" : "0%" }}
                  transition={
                    active && started && !reduce
                      ? { duration: CHAPTER_MS / 1000, ease: "linear" }
                      : { duration: 0.3 }
                  }
                />
              </span>
            </button>
          );
        })}
      </div>
      <div className="mt-2 h-5 text-center sm:mt-2.5 sm:h-6" aria-live="polite">
        <AnimatePresence mode="wait">
          <motion.p
            key={i}
            initial={reduce ? false : { opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.35, ease: EASE }}
            className="font-[family-name:var(--font-body)] text-[11px] font-medium text-gray-700 sm:text-sm"
          >
            {CHAPTERS[i].line}
          </motion.p>
        </AnimatePresence>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Headline                                                           */
/* ------------------------------------------------------------------ */
function Words({
  text,
  start,
  reduce,
  shimmer = false,
}: {
  text: string;
  start: number;
  reduce: boolean;
  shimmer?: boolean;
}) {
  return (
    <>
      {text.split(" ").map((w, n) => (
        <span key={`${w}-${n}`} className="mr-[0.22em] inline-block overflow-hidden pb-[0.08em] align-bottom">
          <motion.span
            className="inline-block"
            initial={reduce ? false : { y: "110%", rotate: 4 }}
            animate={{ y: "0%", rotate: 0 }}
            transition={{ duration: 1, ease: EASE, delay: start + n * 0.09 }}
          >
            {shimmer ? (
              <motion.span
                className="inline-block bg-clip-text text-transparent"
                style={{
                  backgroundImage: "linear-gradient(90deg,#f97316 0%,#fbbf24 50%,#f97316 100%)",
                  backgroundSize: "200% 100%",
                }}
                animate={reduce ? undefined : { backgroundPosition: ["0% 50%", "200% 50%"] }}
                transition={{ duration: 5, repeat: Infinity, ease: "linear" }}
              >
                {w}
              </motion.span>
            ) : (
              w
            )}
          </motion.span>
        </span>
      ))}
    </>
  );
}

/* ------------------------------------------------------------------ */
/* Background elements                                                */
/* ------------------------------------------------------------------ */
const PATCHES = [
  { cls: "-left-16 -top-10 h-60 w-60 sm:-left-12 sm:h-96 sm:w-96", pos: "0% 20%", z: 1.6, d: 0, dur: 9 },
  { cls: "-right-20 top-[16%] h-56 w-56 sm:-right-16 sm:h-[22rem] sm:w-[22rem]", pos: "100% 45%", z: 1.7, d: 1.2, dur: 11 },
  { cls: "-left-20 bottom-[10%] h-52 w-52 sm:-left-14 sm:h-80 sm:w-80", pos: "0% 85%", z: 1.6, d: 0.6, dur: 10 },
  { cls: "-right-14 -bottom-8 h-60 w-60 sm:h-96 sm:w-96", pos: "100% 92%", z: 1.6, d: 1.8, dur: 12 },
  { cls: "left-[56%] -top-4 h-24 w-24 sm:h-36 sm:w-36", pos: "85% 5%", z: 2, d: 0.9, dur: 8 },
  { cls: "left-[8%] top-[46%] h-20 w-20 sm:h-32 sm:w-32", pos: "10% 55%", z: 2.1, d: 2.2, dur: 9 },
];

const fade = "radial-gradient(closest-side, #000 52%, transparent 100%)";

function ScatterBackground({ reduce }: { reduce: boolean }) {
  return (
    <div aria-hidden className="absolute inset-0 z-0 lg:hidden">
      <div className="absolute inset-0 bg-gradient-to-b from-[#fff1e4] via-[#fffafb] to-[#ffeede]" />
      {PATCHES.map((p, n) => (
        <motion.div
          key={n}
          initial={reduce ? false : { opacity: 0, scale: 0.85 }}
          animate={reduce ? { opacity: 1 } : { opacity: 1, scale: 1, y: [0, -12, 0], rotate: [0, 2.5, 0] }}
          transition={{
            opacity: { duration: 1.4, delay: 0.2 + n * 0.15 },
            scale: { duration: 1.4, delay: 0.2 + n * 0.15, ease: EASE },
            y: { duration: p.dur, repeat: Infinity, ease: "easeInOut", delay: p.d },
            rotate: { duration: p.dur + 2, repeat: Infinity, ease: "easeInOut", delay: p.d },
          }}
          className={cn("absolute overflow-hidden", p.cls)}
          style={{ maskImage: fade, WebkitMaskImage: fade }}
        >
          <Image
            src="/home_hero_bg.png"
            alt=""
            fill
            sizes="(max-width: 640px) 240px, 400px"
            className="object-cover"
            style={{ objectPosition: p.pos, transform: `scale(${p.z})`, transformOrigin: p.pos }}
          />
        </motion.div>
      ))}
      <div
        className="absolute inset-0"
        style={{ background: "radial-gradient(58% 46% at 50% 50%, rgba(255,250,251,0.82), transparent 78%)" }}
      />
    </div>
  );
}

const CONFETTI = [
  { x: "8%", s: 10, d: 0, t: 16 },
  { x: "19%", s: 7, d: 4, t: 19 },
  { x: "31%", s: 9, d: 8, t: 17 },
  { x: "44%", s: 6, d: 2, t: 21 },
  { x: "57%", s: 10, d: 6, t: 18 },
  { x: "68%", s: 7, d: 10, t: 20 },
  { x: "79%", s: 9, d: 3, t: 16 },
  { x: "91%", s: 8, d: 7, t: 22 },
];

function Confetti() {
  return (
    <div aria-hidden className="pointer-events-none absolute inset-0 z-[1] overflow-hidden">
      {CONFETTI.map((c, n) => (
        <motion.span
          key={n}
          className="absolute -top-6 rounded-[2px] bg-gradient-to-br from-amber-200 to-orange-400 opacity-70"
          style={{ left: c.x, width: c.s, height: c.s * 1.8 }}
          animate={{ y: ["0vh", "108vh"], rotate: [0, 360], x: [0, n % 2 ? 24 : -24, 0] }}
          transition={{ duration: c.t, repeat: Infinity, ease: "linear", delay: c.d }}
        />
      ))}
    </div>
  );
}

function useMinWidth(px: number) {
  const [match, setMatch] = useState(false);
  useEffect(() => {
    const mq = window.matchMedia(`(min-width: ${px}px)`);
    const update = () => setMatch(mq.matches);
    update();
    mq.addEventListener("change", update);
    return () => mq.removeEventListener("change", update);
  }, [px]);
  return match;
}

/* ------------------------------------------------------------------ */
/* Floating chips                                                     */
/* ------------------------------------------------------------------ */
type ChipSpec = {
  id: string;
  pos: string;
  depth: number;
  delay: number;
  float: number;
  icon: React.ComponentType<{ className?: string }>;
  tone: string;
  title: string;
  sub: string;
};

const CHIPS: ChipSpec[] = [
  { id: "rsvp", pos: "left-[1.5%] top-[20%] 2xl:left-[2.5%]", depth: 22, delay: 2.2, float: 7, icon: RsvpIcon, tone: "bg-emerald-500/15 text-emerald-600", title: "Real-time RSVPs", sub: "Replies arrive the moment guests respond" },
  { id: "builder", pos: "right-[1.5%] top-[24%] 2xl:right-[2.5%]", depth: 32, delay: 2.4, float: 8.5, icon: BuilderIcon, tone: "bg-orange-500/15 text-orange-600", title: "No-code builder", sub: "Drag, drop, done" },
  { id: "slugs", pos: "left-[2%] bottom-[18%] 2xl:left-[3.5%]", depth: 16, delay: 2.6, float: 6.5, icon: SlugIcon, tone: "bg-sky-500/15 text-sky-600", title: "Custom slugs", sub: "Branded links guests remember" },
  { id: "ai", pos: "right-[2%] bottom-[16%] 2xl:right-[3.5%]", depth: 26, delay: 2.8, float: 7.5, icon: AiIcon, tone: "bg-violet-500/15 text-violet-600", title: "Riwa AI", sub: "Start from a mood, not a blank page" },
];

function FloatingChip({ chip, px, py, reduce }: { chip: ChipSpec; px: MotionValue<number>; py: MotionValue<number>; reduce: boolean }) {
  const Icon = chip.icon;
  const x = useTransform(px, [-0.5, 0.5], [chip.depth, -chip.depth]);
  const y = useTransform(py, [-0.5, 0.5], [chip.depth, -chip.depth]);

  return (
    <motion.div aria-hidden style={reduce ? undefined : { x, y }} className={cn("pointer-events-none absolute z-[5]", chip.pos)}>
      <motion.div initial={reduce ? false : { opacity: 0, scale: 0.9, y: 24 }} animate={{ opacity: 1, scale: 1, y: 0 }} transition={{ duration: 1, ease: EASE, delay: chip.delay }}>
        <motion.div
          animate={reduce ? undefined : { y: [0, -10, 0] }}
          transition={{ duration: chip.float, repeat: Infinity, ease: "easeInOut" }}
          className="flex max-w-[15rem] items-center gap-3 rounded-2xl border border-white/70 bg-white/70 px-4 py-3 shadow-[0_20px_40px_-20px_rgba(154,52,18,0.4)] backdrop-blur-xl"
        >
          <span className={cn("flex h-10 w-10 shrink-0 items-center justify-center rounded-full", chip.tone)}>
            <Icon className="h-[22px] w-[22px]" />
          </span>
          <span className="text-left">
            <span className="block text-sm font-bold text-gray-900">{chip.title}</span>
            <span className="hidden text-xs font-medium leading-snug text-gray-500 2xl:block">{chip.sub}</span>
          </span>
        </motion.div>
      </motion.div>
    </motion.div>
  );
}

/* ------------------------------------------------------------------ */
/* 2. CTA BUTTONS                                                     */
/* ------------------------------------------------------------------ */

function useMagnet(reduce: boolean, strength = 0.28) {
  const x = useMotionValue(0);
  const y = useMotionValue(0);
  const lx = useMotionValue(0);
  const ly = useMotionValue(0);
  const sx = useSpring(x, { stiffness: 260, damping: 18, mass: 0.5 });
  const sy = useSpring(y, { stiffness: 260, damping: 18, mass: 0.5 });
  const spotlight = useMotionTemplate`radial-gradient(160px circle at ${lx}px ${ly}px, rgba(255,255,255,0.5), transparent 70%)`;

  const onPointerMove = (e: React.PointerEvent<HTMLElement>) => {
    if (reduce || e.pointerType === "touch") return;
    const r = e.currentTarget.getBoundingClientRect();
    lx.set(e.clientX - r.left);
    ly.set(e.clientY - r.top);
    x.set((e.clientX - r.left - r.width / 2) * strength);
    y.set((e.clientY - r.top - r.height / 2) * strength);
  };
  const onPointerLeave = () => {
    x.set(0);
    y.set(0);
  };
  return { sx, sy, spotlight, onPointerMove, onPointerLeave };
}

function PrimaryButton({ reduce }: { reduce: boolean }) {
  const m = useMagnet(reduce);
  return (
    <motion.div
      initial="rest"
      animate="rest"
      whileHover="hover"
      whileTap={{ scale: 0.95 }}
      style={reduce ? undefined : { x: m.sx, y: m.sy }}
      onPointerMove={m.onPointerMove}
      onPointerLeave={m.onPointerLeave}
      transition={{ type: "spring", stiffness: 400, damping: 22 }}
      className="group relative flex flex-1 sm:flex-none"
    >
      <span aria-hidden className="pointer-events-none absolute -inset-3 rounded-[1.6rem] bg-orange-400/50 opacity-0 blur-2xl transition-opacity duration-500 group-hover:opacity-100" />
      
      <Link
        href="/templates"
        className={cn(
          "relative flex w-full cursor-pointer items-center justify-between gap-2 overflow-hidden rounded-xl bg-[#f97316] p-2 shadow-[0_18px_40px_-14px_rgba(249,115,22,0.95),inset_0_1px_0_rgba(255,255,255,0.45),inset_0_-3px_0_rgba(154,52,18,0.3)] sm:min-w-[20rem] sm:rounded-2xl sm:p-3",
          focusRing,
        )}
      >
        <motion.span
          aria-hidden
          className="absolute inset-0"
          style={{
            backgroundImage: "linear-gradient(110deg,#fb8a3c 0%,#f97316 30%,#ffb347 50%,#f97316 70%,#fb8a3c 100%)",
            backgroundSize: "300% 100%",
          }}
          animate={reduce ? undefined : { backgroundPosition: ["0% 50%", "300% 50%"] }}
          transition={{ duration: 8, repeat: Infinity, ease: "linear" }}
        />
        <span aria-hidden className="absolute inset-x-0 top-0 h-1/2 bg-gradient-to-b from-white/25 to-transparent" />
        
        {!reduce && (
          <motion.span aria-hidden style={{ background: m.spotlight }} className="pointer-events-none absolute inset-0 opacity-0 transition-opacity duration-300 group-hover:opacity-100" />
        )}

        <span className="relative z-10 flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-white/20 shadow-[inset_0_1px_0_rgba(255,255,255,0.5)] ring-1 ring-white/30 backdrop-blur-sm sm:h-12 sm:w-12 sm:rounded-xl">
          <CanvasIcon className="h-5 w-5 drop-shadow-[0_1px_2px_rgba(154,52,18,0.4)] sm:h-6 sm:w-6" />
        </span>

        <span className="relative z-10 flex min-w-0 flex-1 flex-col text-left leading-tight sm:px-2">
          <span className="whitespace-nowrap font-[family-name:var(--font-display)] text-[12px] font-bold text-white sm:text-lg">
            Explore Templates
          </span>
          <span className="hidden whitespace-nowrap text-xs font-medium text-white/80 sm:block">
            Start in minutes
          </span>
        </span>

        <span className="relative z-10 hidden h-10 w-10 shrink-0 items-center justify-center rounded-full bg-white text-orange-600 shadow-[0_6px_14px_-4px_rgba(154,52,18,0.55)] transition-transform duration-500 ease-[cubic-bezier(0.16,1,0.3,1)] group-hover:scale-110 sm:flex">
          <SwapArrow className="h-5 w-5" />
        </span>
      </Link>
    </motion.div>
  );
}

function SecondaryButton({ reduce }: { reduce: boolean }) {
  const m = useMagnet(reduce, 0.22);
  return (
    <motion.div
      initial="rest"
      animate="rest"
      whileHover="hover"
      whileTap={{ scale: 0.95 }}
      style={reduce ? undefined : { x: m.sx, y: m.sy }}
      onPointerMove={m.onPointerMove}
      onPointerLeave={m.onPointerLeave}
      transition={{ type: "spring", stiffness: 400, damping: 22 }}
      className="group relative flex flex-1 sm:flex-none"
    >
      <span aria-hidden className="pointer-events-none absolute -inset-3 rounded-[1.6rem] bg-amber-400/30 opacity-0 blur-2xl transition-opacity duration-500 group-hover:opacity-100" />
      
      <span className="relative flex w-full overflow-hidden rounded-xl bg-gradient-to-b from-white/30 to-white/5 p-[1.5px] shadow-[0_18px_40px_-14px_rgba(0,0,0,0.65)] sm:min-w-[20rem] sm:rounded-2xl">
        {!reduce && (
          <motion.span
            aria-hidden
            className="absolute left-1/2 top-1/2 aspect-square w-[170%] -translate-x-1/2 -translate-y-1/2 opacity-40 transition-opacity duration-500 group-hover:opacity-100"
            style={{ background: "conic-gradient(from 0deg, transparent 0deg, transparent 240deg, #f59e0b 300deg, #fef3c7 340deg, transparent 360deg)" }}
            animate={{ rotate: 360 }}
            transition={{ duration: 3.2, repeat: Infinity, ease: "linear" }}
          />
        )}
        
        <Link
          href="/craft"
          className={cn(
            "relative flex w-full cursor-pointer items-center justify-between gap-2 overflow-hidden rounded-[0.6rem] bg-gradient-to-b from-[#303030] to-[#181818] p-2 sm:rounded-[0.9rem] sm:p-3",
            focusRing,
          )}
        >
          <span aria-hidden className="absolute inset-0 bg-[radial-gradient(120%_120%_at_0%_0%,rgba(249,115,22,0.22),transparent_55%)]" />
          
          {!reduce && (
            <motion.span
              aria-hidden
              variants={{ rest: { x: "-160%" }, hover: { x: "320%", transition: { duration: 0.9, ease: "easeInOut" } } }}
              className="absolute inset-y-0 w-14 -skew-x-12 bg-gradient-to-r from-transparent via-amber-200/40 to-transparent"
            />
          )}

          <span className="relative z-10 flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-gradient-to-br from-amber-300/25 to-orange-500/10 text-orange-400 ring-1 ring-amber-300/30 transition-[color,box-shadow] duration-500 group-hover:text-amber-200 group-hover:shadow-[0_0_24px_rgba(252,211,77,0.55)] sm:h-12 sm:w-12 sm:rounded-xl">
            <CraftIcon className="h-5 w-5 sm:h-6 sm:w-6" />
          </span>

          <span className="relative z-10 flex min-w-0 flex-1 flex-col text-left leading-tight sm:px-2">
            <span className="whitespace-nowrap font-[family-name:var(--font-display)] text-[12px] font-bold text-white sm:text-lg">
              Craft Your Vision
            </span>
            <span className="hidden whitespace-nowrap text-xs font-medium text-amber-200/80 sm:block">
              Talk to our team
            </span>
          </span>

          <span className="relative z-10 hidden h-10 w-10 shrink-0 items-center justify-center rounded-full border border-white/20 text-white/80 transition-colors duration-500 group-hover:border-amber-300/60 group-hover:text-amber-200 sm:flex">
            <SwapArrow className="h-5 w-5" />
          </span>
        </Link>
      </span>
    </motion.div>
  );
}

/* ------------------------------------------------------------------ */
/* Hero Component                                                     */
/* ------------------------------------------------------------------ */
export function HomeHero() {
  const reduce = useReducedMotion() ?? false;
  const sectionRef = useRef<HTMLElement>(null);
  const inView = useInView(sectionRef, { amount: 0.1 });
  const wide = useMinWidth(1280);

  const mx = useMotionValue(0);
  const my = useMotionValue(0);
  const px = useSpring(mx, { stiffness: 70, damping: 20 });
  const py = useSpring(my, { stiffness: 70, damping: 20 });
  const bgX = useTransform(px, [-0.5, 0.5], [10, -10]);
  const bgY = useTransform(py, [-0.5, 0.5], [8, -8]);

  const { scrollYProgress } = useScroll({
    target: sectionRef,
    offset: ["start start", "end start"],
  });
  const contentY = useTransform(scrollYProgress, [0, 1], [0, 90]);
  const contentOpacity = useTransform(scrollYProgress, [0, 0.8], [1, 0.15]);
  const photoY = useTransform(scrollYProgress, [0, 1], [0, 60]);
  const cueOpacity = useTransform(scrollYProgress, [0, 0.15], [1, 0]);

  const onPointerMove = (e: React.PointerEvent) => {
    if (reduce || e.pointerType === "touch") return;
    mx.set(e.clientX / window.innerWidth - 0.5);
    my.set(e.clientY / window.innerHeight - 0.5);
  };

  return (
    <section
      ref={sectionRef}
      onPointerMove={onPointerMove}
      className="relative flex min-h-[100svh] w-full items-center justify-center overflow-hidden bg-[#fffafb]"
    >
      <motion.div aria-hidden style={reduce ? undefined : { x: bgX, y: bgY }} className="absolute inset-0 z-0 hidden lg:block">
        <motion.div style={reduce ? undefined : { y: photoY }} className="absolute inset-0">
          <motion.div
            initial={reduce ? { opacity: 0 } : { scale: 1.2, opacity: 0, filter: "blur(10px)" }}
            animate={reduce ? { opacity: 1 } : { scale: [1.1, 1.15, 1.1], opacity: 1, filter: "blur(0px)" }}
            transition={
              reduce
                ? { duration: 1.2 }
                : {
                    scale: { duration: 30, repeat: Infinity, ease: "easeInOut" },
                    filter: { duration: 1.6, delay: 0.2, ease: EASE },
                    opacity: { duration: 1.6, delay: 0.2, ease: EASE },
                  }
            }
            className="absolute inset-0"
          >
            <Image src="/home_hero_bg.png" alt="" fill priority sizes="100vw" quality={90} className="object-cover object-center" />
          </motion.div>
        </motion.div>
      </motion.div>

      <ScatterBackground reduce={reduce} />
      <div aria-hidden className="pointer-events-none absolute inset-0 z-0 bg-gradient-to-b from-white/20 via-transparent to-[#fffafb]" />
      {!reduce && inView && <Confetti />}

      {wide && CHIPS.map((chip) => <FloatingChip key={chip.id} chip={chip} px={px} py={py} reduce={reduce} />)}

      <motion.div
        style={reduce ? undefined : { y: contentY, opacity: contentOpacity }}
        className="relative z-10 mx-auto flex max-w-5xl flex-col items-center px-4 pb-12 pt-20 text-center sm:px-6 sm:pb-24 sm:pt-28 lg:px-8"
      >
        <motion.div
          custom={0.5}
          variants={rise}
          initial={reduce ? false : "hidden"}
          animate="visible"
          className="mb-4 inline-flex items-center gap-2 rounded-full border border-orange-200/70 bg-white/60 px-3 py-1 shadow-sm backdrop-blur-md sm:mb-5 sm:px-4 sm:py-1.5"
        >
          <span className="relative flex h-1.5 w-1.5">
            {!reduce && <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-orange-400 opacity-75" />}
            <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-orange-500" />
          </span>
          <span className="font-[family-name:var(--font-display)] text-[10px] font-bold tracking-wide text-gray-800 sm:text-xs">
            The new standard in digital invitations
          </span>
        </motion.div>

        <h1 className="mb-4 max-w-4xl font-[family-name:var(--font-display)] text-[2.25rem] font-bold leading-[1.05] tracking-tight text-gray-900 sm:mb-5 sm:text-5xl md:text-6xl lg:text-[clamp(3rem,min(5.6vw,10vh),4.75rem)]">
          <Words text="Choose a masterpiece," start={0.7} reduce={reduce} />
          <br className="hidden sm:block" />
          <Words text="or craft a grand entrance." start={1.15} reduce={reduce} shimmer />
        </h1>

        <motion.p
          custom={1.5}
          variants={rise}
          initial={reduce ? false : "hidden"}
          animate="visible"
          className="mb-6 max-w-[95%] font-[family-name:var(--font-body)] text-[13px] font-medium leading-relaxed text-gray-700 sm:mb-10 sm:max-w-3xl sm:text-lg"
        >
          Browse our meticulously crafted templates to personalize in minutes, or partner with our design studio to build a 100% bespoke website for your special day.
        </motion.p>

        <motion.div
          custom={1.7}
          variants={rise}
          initial={reduce ? false : "hidden"}
          animate="visible"
          className="flex w-full max-w-sm flex-row items-center justify-center gap-3 sm:max-w-none sm:gap-5"
        >
          <PrimaryButton reduce={reduce} />
          <SecondaryButton reduce={reduce} />
        </motion.div>

        <motion.div custom={1.95} variants={rise} initial={reduce ? false : "hidden"} animate="visible" className="flex w-full justify-center">
          <Story reduce={reduce} />
        </motion.div>
      </motion.div>

      {!reduce && (
        <motion.div
          aria-hidden
          style={{ opacity: cueOpacity }}
          className="pointer-events-none absolute bottom-4 left-1/2 z-10 hidden -translate-x-1/2 sm:block [@media(max-height:860px)]:hidden"
        >
          <div className="flex h-9 w-5 justify-center rounded-full border-2 border-gray-400/60 pt-1.5">
            <motion.span
              className="h-1.5 w-1 rounded-full bg-orange-500"
              animate={{ y: [0, 12, 0], opacity: [1, 0.2, 1] }}
              transition={{ duration: 1.8, repeat: Infinity, ease: "easeInOut" }}
            />
          </div>
        </motion.div>
      )}
    </section>
  );
}