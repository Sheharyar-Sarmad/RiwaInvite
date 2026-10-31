"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import {
  AnimatePresence,
  motion,
  MotionValue,
  useInView,
  useMotionValue,
  useReducedMotion,
  useScroll,
  useSpring,
  useTransform,
} from "framer-motion";
import { ArrowRight, Check, LayoutTemplate, Link2, Sparkles } from "lucide-react";

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
/* Story: the life of one invitation, told in four chapters            */
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

  // Wait for the entrance to finish before the story starts moving.
  useEffect(() => {
    if (reduce) return;
    const t = setTimeout(() => setStarted(true), STORY_START_MS);
    return () => clearTimeout(t);
  }, [reduce]);

  // One timeout per chapter. Depending on `i` means a manual pick restarts the clock.
  useEffect(() => {
    if (reduce || !started) return;
    const t = setTimeout(() => setI((v) => (v + 1) % CHAPTERS.length), CHAPTER_MS);
    return () => clearTimeout(t);
  }, [i, started, reduce]);

  return (
    <div className="mt-8 w-full max-w-md sm:mt-10">
      <div className="grid grid-cols-4 gap-2" role="group" aria-label="Invitation journey">
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
                  "mb-1.5 block text-[11px] font-semibold transition-colors duration-500 sm:text-xs",
                  active ? "text-gray-900" : done ? "text-orange-600" : "text-gray-400 hover:text-gray-600"
                )}
              >
                {c.key}
              </span>
              <span className="block h-[3px] overflow-hidden rounded-full bg-orange-200/70">
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
      <div className="mt-3 h-6 text-center" aria-live="polite">
        <AnimatePresence mode="wait">
          <motion.p
            key={i}
            initial={reduce ? false : { opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.35, ease: EASE }}
            className="font-[family-name:var(--font-body)] text-sm font-medium text-gray-700"
          >
            {CHAPTERS[i].line}
          </motion.p>
        </AnimatePresence>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Headline: each word rises out of a mask                             */
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
/* Scattered flower patches for mobile + tablet                        */
/* (the full photo hides its flowers at the edges on narrow screens)   */
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
      {/* keep the copy readable above the flowers */}
      <div
        className="absolute inset-0"
        style={{ background: "radial-gradient(58% 46% at 50% 50%, rgba(255,250,251,0.82), transparent 78%)" }}
      />
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Gold confetti drifting down                                         */
/* ------------------------------------------------------------------ */
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

/** True when the viewport is at least `px` wide. Starts false, so SSR and small screens never render it. */
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
/* Floating feature chips (wide screens only): real product selling    */
/* points, in the same words used further down the page                */
/* ------------------------------------------------------------------ */
type ChipSpec = {
  id: string;
  pos: string;
  depth: number; // px of cursor parallax
  delay: number; // entrance delay
  float: number; // seconds per float cycle
  icon: React.ComponentType<{ className?: string }>;
  tone: string; // icon bubble colours
  title: string;
  sub: string;
};

const CHIPS: ChipSpec[] = [
  {
    id: "rsvp",
    pos: "left-[5%] top-[26%]",
    depth: 22,
    delay: 2.2,
    float: 7,
    icon: Check,
    tone: "bg-emerald-500/15 text-emerald-600",
    title: "Real-time RSVPs",
    sub: "Replies arrive the moment guests respond",
  },
  {
    id: "builder",
    pos: "right-[4%] top-[30%]",
    depth: 32,
    delay: 2.4,
    float: 8.5,
    icon: LayoutTemplate,
    tone: "bg-orange-500/15 text-orange-600",
    title: "No-code builder",
    sub: "Drag, drop, done",
  },
  {
    id: "slugs",
    pos: "left-[7%] bottom-[20%]",
    depth: 16,
    delay: 2.6,
    float: 6.5,
    icon: Link2,
    tone: "bg-sky-500/15 text-sky-600",
    title: "Custom slugs",
    sub: "Branded links guests remember",
  },
  {
    id: "ai",
    pos: "right-[6%] bottom-[18%]",
    depth: 26,
    delay: 2.8,
    float: 7.5,
    icon: Sparkles,
    tone: "bg-violet-500/15 text-violet-600",
    title: "Riwa AI",
    sub: "Start from a mood, not a blank page",
  },
];

function FloatingChip({
  chip,
  px,
  py,
  reduce,
}: {
  chip: ChipSpec;
  px: MotionValue<number>;
  py: MotionValue<number>;
  reduce: boolean;
}) {
  const Icon = chip.icon;
  const x = useTransform(px, [-0.5, 0.5], [chip.depth, -chip.depth]);
  const y = useTransform(py, [-0.5, 0.5], [chip.depth, -chip.depth]);

  return (
    <motion.div
      aria-hidden
      style={reduce ? undefined : { x, y }}
      className={cn("pointer-events-none absolute z-[5]", chip.pos)}
    >
      <motion.div
        initial={reduce ? false : { opacity: 0, scale: 0.9, y: 24 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        transition={{ duration: 1, ease: EASE, delay: chip.delay }}
      >
        <motion.div
          animate={reduce ? undefined : { y: [0, -10, 0] }}
          transition={{ duration: chip.float, repeat: Infinity, ease: "easeInOut" }}
          className="flex max-w-[15rem] items-center gap-3 rounded-2xl border border-white/70 bg-white/70 px-4 py-3 shadow-[0_20px_40px_-20px_rgba(154,52,18,0.4)] backdrop-blur-xl"
        >
          <span className={cn("flex h-9 w-9 shrink-0 items-center justify-center rounded-full", chip.tone)}>
            <Icon className="h-4 w-4" />
          </span>
          <span className="text-left">
            <span className="block text-sm font-bold text-gray-900">{chip.title}</span>
            <span className="block text-xs font-medium leading-snug text-gray-500">{chip.sub}</span>
          </span>
        </motion.div>
      </motion.div>
    </motion.div>
  );
}

/* ------------------------------------------------------------------ */
/* Call-to-action buttons                                              */
/* ------------------------------------------------------------------ */
function PrimaryButton({ reduce }: { reduce: boolean }) {
  return (
    <motion.div
      whileHover={reduce ? undefined : { scale: 1.03 }}
      whileTap={{ scale: 0.97 }}
      className="flex flex-1 sm:flex-none"
    >
      <Link
        href="/register"
        className={cn(
          "group relative flex w-full cursor-pointer items-center justify-center gap-2 overflow-hidden whitespace-nowrap rounded-xl bg-[#2a2a2a] px-5 py-2.5 text-center font-[family-name:var(--font-display)] text-sm font-bold text-white shadow-[0_12px_30px_-12px_rgba(0,0,0,0.6)] transition-colors duration-300 hover:bg-[#3a3a3a] sm:px-7 sm:py-3 sm:text-base",
          focusRing
        )}
      >
        {!reduce && (
          <motion.span
            aria-hidden
            className="absolute inset-y-0 w-12 -skew-x-12 bg-white/20 blur-md"
            initial={{ x: "-300%" }}
            animate={{ x: "900%" }}
            transition={{ duration: 1.6, ease: "easeInOut", repeat: Infinity, repeatDelay: 3.2, delay: 3 }}
          />
        )}
        <span className="relative">Start Designing</span>
        <ArrowRight className="relative h-4 w-4 transition-transform duration-300 group-hover:translate-x-1 sm:h-5 sm:w-5" />
      </Link>
    </motion.div>
  );
}

function SecondaryButton({ reduce }: { reduce: boolean }) {
  return (
    <motion.div
      whileHover={reduce ? undefined : { scale: 1.03 }}
      whileTap={{ scale: 0.97 }}
      className="flex flex-1 sm:flex-none"
    >
      <Link
        href="/templates"
        className={cn(
          "flex w-full cursor-pointer items-center justify-center whitespace-nowrap rounded-xl border border-gray-200 bg-white/90 px-5 py-2.5 text-center font-[family-name:var(--font-display)] text-sm font-bold text-gray-900 shadow-sm backdrop-blur transition-colors duration-300 hover:border-orange-200 hover:bg-white sm:px-7 sm:py-3 sm:text-base",
          focusRing
        )}
      >
        Explore Templates
      </Link>
    </motion.div>
  );
}

/* ------------------------------------------------------------------ */
/* Hero                                                                */
/* ------------------------------------------------------------------ */
export function HomeHero() {
  const reduce = useReducedMotion() ?? false;
  const sectionRef = useRef<HTMLElement>(null);
  const inView = useInView(sectionRef, { amount: 0.1 });
  const wide = useMinWidth(1400);

  // Cursor parallax (normalised -0.5..0.5), smoothed with springs.
  const mx = useMotionValue(0);
  const my = useMotionValue(0);
  const px = useSpring(mx, { stiffness: 70, damping: 20 });
  const py = useSpring(my, { stiffness: 70, damping: 20 });
  const bgX = useTransform(px, [-0.5, 0.5], [10, -10]);
  const bgY = useTransform(py, [-0.5, 0.5], [8, -8]);

  // Scroll-linked exit: copy drifts up and softens, photo moves slower.
  const { scrollYProgress } = useScroll({ target: sectionRef, offset: ["start start", "end start"] });
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
      className="relative flex min-h-[100dvh] w-full items-center justify-center overflow-hidden bg-[#fffafb]"
    >
      {/* Desktop: the full photograph, with cursor and scroll parallax */}
      <motion.div
        aria-hidden
        style={reduce ? undefined : { x: bgX, y: bgY }}
        className="absolute inset-0 z-0 hidden lg:block"
      >
        <motion.div style={reduce ? undefined : { y: photoY }} className="absolute inset-0">
          <motion.div
            initial={reduce ? { opacity: 0 } : { scale: 1.2, opacity: 0, filter: "blur(10px)" }}
            animate={
              reduce
                ? { opacity: 1 }
                : { scale: [1.1, 1.15, 1.1], opacity: 1, filter: "blur(0px)" }
            }
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
            <Image
              src="/home_hero_bg.png"
              alt=""
              fill
              priority
              sizes="100vw"
              quality={90}
              className="object-cover object-center"
            />
          </motion.div>
        </motion.div>
      </motion.div>

      {/* Mobile + tablet: scattered flower patches */}
      <ScatterBackground reduce={reduce} />

      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 z-0 bg-gradient-to-b from-white/20 via-transparent to-[#fffafb]"
      />

      {/* Only animate the ambient layers while the hero is on screen */}
      {!reduce && inView && <Confetti />}
      {wide &&
        CHIPS.map((chip) => <FloatingChip key={chip.id} chip={chip} px={px} py={py} reduce={reduce} />)}

      <motion.div
        style={reduce ? undefined : { y: contentY, opacity: contentOpacity }}
        className="relative z-10 mx-auto flex max-w-5xl flex-col items-center px-4 pb-16 pt-24 text-center sm:px-6 sm:pb-20 lg:px-8"
      >
        {/* Badge */}
        <motion.div
          custom={0.5}
          variants={rise}
          initial={reduce ? false : "hidden"}
          animate="visible"
          className="mb-7 inline-flex items-center gap-2 rounded-full border border-orange-200/70 bg-white/60 px-4 py-1.5 shadow-sm backdrop-blur-md"
        >
          <span className="relative flex h-1.5 w-1.5">
            {!reduce && (
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-orange-400 opacity-75" />
            )}
            <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-orange-500" />
          </span>
          <span className="font-[family-name:var(--font-display)] text-[11px] font-bold tracking-wide text-gray-800 sm:text-xs">
            The new standard in digital invitations
          </span>
        </motion.div>

        {/* Headline */}
        <h1 className="mb-6 max-w-4xl font-[family-name:var(--font-display)] text-5xl font-bold leading-[1.05] tracking-tight text-gray-900 sm:text-6xl md:text-7xl lg:text-[5.5rem]">
          <Words text="Create Invitations that" start={0.7} reduce={reduce} />
          <br className="hidden sm:block" />
          <Words text="Leave a Mark." start={1.15} reduce={reduce} shimmer />
        </h1>

        {/* Subheadline */}
        <motion.p
          custom={1.5}
          variants={rise}
          initial={reduce ? false : "hidden"}
          animate="visible"
          className="mb-8 max-w-2xl font-[family-name:var(--font-body)] text-base font-medium leading-relaxed text-gray-700 sm:text-lg md:text-xl"
        >
          Design, customize, and track beautiful digital event invitations. Whether it&apos;s a wedding or a corporate
          gala, try our builder for free.
        </motion.p>

        {/* Buttons: always on one row */}
        <motion.div
          custom={1.7}
          variants={rise}
          initial={reduce ? false : "hidden"}
          animate="visible"
          className="flex w-full max-w-sm flex-nowrap items-center justify-center gap-3 sm:max-w-none"
        >
          <PrimaryButton reduce={reduce} />
          <SecondaryButton reduce={reduce} />
        </motion.div>

        {/* Story */}
        <motion.div
          custom={1.95}
          variants={rise}
          initial={reduce ? false : "hidden"}
          animate="visible"
          className="flex w-full justify-center"
        >
          <Story reduce={reduce} />
        </motion.div>
      </motion.div>

      {/* Scroll cue (hidden on short screens so it never crowds the copy) */}
      {!reduce && (
        <motion.div
          aria-hidden
          style={{ opacity: cueOpacity }}
          className="pointer-events-none absolute bottom-5 left-1/2 z-10 hidden -translate-x-1/2 sm:block [@media(max-height:780px)]:hidden"
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