"use client";

import { useCallback, useEffect, useRef, useState, type ReactNode } from "react";
import Image from "next/image";
import {
  motion,
  useInView,
  useMotionValue,
  useReducedMotion,
  useScroll,
  useSpring,
  useTransform,
  type Variants,
} from "framer-motion";
import { Check } from "lucide-react";

/* -------------------------------------------------------------------------- */
/*  Content                                                                   */
/* -------------------------------------------------------------------------- */

type VisualKind = "gallery" | "builder" | "publish" | "rsvp";

interface Step {
  number: string;
  headline: string;
  subheadline: string;
  body: ReactNode;
  image: string;
  alt: string;
  kind: VisualKind;
}

/** Sample copy for the step 04 notification. Swap this if you'd rather not show a name. */
const RSVP_SAMPLE_MESSAGE = "Ayesha accepted";

const SAMPLE_URL = "riwainvite.com/invite/sara-and-ahmed";

const STEPS: Step[] = [
  {
    number: "01",
    headline: "Choose your canvas.",
    subheadline: "Select your theme.",
    body: "Browse a curated collection of hand-crafted, premium designs. From golden wedding elegance to modern corporate galas, find the perfect aesthetic for your event.",
    image: "/how-step-1.png",
    alt: "A gallery of floral wedding invitation designs in gold, blush and emerald",
    kind: "gallery",
  },
  {
    number: "02",
    headline: "Make it yours.",
    subheadline: "Personalize everything.",
    body: "Upload your own photos, add your names, set the venue, and type in the event time. Want music? Upload your favorite track. The no-code builder lets you tweak every font, color, and layout without writing a single line of code.",
    image: "/how-step-2.png",
    alt: "A split-screen builder with a details form on the left and a live invitation preview on the right",
    kind: "builder",
  },
  {
    number: "03",
    headline: "Publish & share.",
    subheadline: "Claim your custom link.",
    body: (
      <>
        Unlock your design and instantly claim a branded URL like{" "}
        <span className="rounded-md bg-orange-100 px-1.5 py-0.5 font-medium text-orange-700 [overflow-wrap:anywhere]">
          {SAMPLE_URL}
        </span>
        . Send it via WhatsApp, text, or email. It looks impossibly expensive and loads in
        milliseconds on any device.
      </>
    ),
    image: "/how-step-3.png",
    alt: "A browser address bar showing a custom Riwainvite link with a Publish button",
    kind: "publish",
  },
  {
    number: "04",
    headline: "Track RSVPs live.",
    subheadline: "Watch the replies roll in.",
    body: "No more spreadsheets. Your dashboard updates in real-time as guests accept, decline, and leave heartfelt messages. Export your guest list or manage dietary requirements with one click.",
    image: "/how-step-4.png",
    alt: "An RSVP dashboard with a live feed of guest replies",
    kind: "rsvp",
  },
];

/* -------------------------------------------------------------------------- */
/*  Shared helpers (candidates for the shared motion module)                  */
/* -------------------------------------------------------------------------- */

const EASE_OUT = [0.22, 1, 0.36, 1] as const;
const MAX_TILT = 3.5;

/** JS-side media query so decorative, size-dependent elements aren't just hidden with CSS. */
function useMediaQuery(query: string): boolean {
  const [matches, setMatches] = useState(false);

  useEffect(() => {
    const mq = window.matchMedia(query);
    const update = () => setMatches(mq.matches);
    update();
    mq.addEventListener("change", update);
    return () => mq.removeEventListener("change", update);
  }, [query]);

  return matches;
}

const headingParent: Variants = {
  hidden: {},
  show: { transition: { staggerChildren: 0.07 } },
};

const headingWord: Variants = {
  hidden: { y: "110%" },
  show: { y: "0%", transition: { duration: 0.7, ease: EASE_OUT } },
};

/**
 * Masked word-by-word headline reveal. The in-view trigger lives on the parent heading
 * (never on the clipped children), so the browser always sees the trigger as visible.
 */
function RevealHeading({
  as,
  children,
  className,
}: {
  as: "h2" | "h3";
  children: string;
  className?: string;
}) {
  const reduce = useReducedMotion();
  const MotionTag = motion[as];

  return (
    <MotionTag
      className={className}
      variants={headingParent}
      initial={reduce ? "show" : "hidden"}
      whileInView="show"
      viewport={{ once: true, margin: "-80px" }}
    >
      {children.split(" ").map((word, i) => (
        <span
          key={`${word}-${i}`}
          className="mr-[0.25em] inline-block overflow-hidden pb-[0.15em] align-bottom"
        >
          <motion.span variants={headingWord} className="inline-block">
            {word}
          </motion.span>
        </span>
      ))}
    </MotionTag>
  );
}

/** Pointer tilt, capped at MAX_TILT degrees. Mouse only; touch never tilts. */
function useTilt(enabled: boolean) {
  const px = useMotionValue(0);
  const py = useMotionValue(0);
  const sx = useSpring(px, { stiffness: 150, damping: 20, mass: 0.4 });
  const sy = useSpring(py, { stiffness: 150, damping: 20, mass: 0.4 });
  const rotateY = useTransform(sx, [-0.5, 0.5], [-MAX_TILT, MAX_TILT]);
  const rotateX = useTransform(sy, [-0.5, 0.5], [MAX_TILT, -MAX_TILT]);

  const onPointerMove = (e: React.PointerEvent<HTMLElement>) => {
    if (!enabled || e.pointerType !== "mouse") return;
    const rect = e.currentTarget.getBoundingClientRect();
    px.set((e.clientX - rect.left) / rect.width - 0.5);
    py.set((e.clientY - rect.top) / rect.height - 0.5);
  };

  const onPointerLeave = () => {
    px.set(0);
    py.set(0);
  };

  return { rotateX, rotateY, onPointerMove, onPointerLeave };
}

/* -------------------------------------------------------------------------- */
/*  Step visual                                                               */
/* -------------------------------------------------------------------------- */

const imageHover: Variants = {
  rest: { scale: 1 },
  hover: { scale: 1.05, transition: { duration: 0.6, ease: EASE_OUT } },
};

const sweepHover: Variants = {
  rest: { x: "-160%", transition: { duration: 0 } },
  hover: { x: "360%", transition: { duration: 0.9, ease: "easeInOut" } },
};

function CursorOrb({ animated }: { animated: boolean }) {
  const orb = (
    <span className="relative block h-7 w-7 rounded-full bg-gradient-to-br from-orange-400 to-orange-600 shadow-[0_0_28px_10px_rgba(249,115,22,0.5)] ring-2 ring-white/90" />
  );

  if (!animated) {
    return (
      <div aria-hidden className="absolute -ml-3.5 -mt-3.5" style={{ left: "62%", top: "40%" }}>
        {orb}
      </div>
    );
  }

  return (
    <motion.div
      aria-hidden
      className="absolute -ml-3.5 -mt-3.5"
      initial={{ left: "24%", top: "30%" }}
      animate={{
        left: ["24%", "66%", "58%", "32%", "24%"],
        top: ["30%", "40%", "68%", "60%", "30%"],
      }}
      transition={{ duration: 10, ease: "easeInOut", repeat: Infinity }}
    >
      {orb}
    </motion.div>
  );
}

function LiveBadge({ pulsing }: { pulsing: boolean }) {
  return (
    <div className="absolute right-4 top-4 flex items-center gap-2 rounded-full border border-white/70 bg-white/80 px-3 py-1.5 text-sm font-semibold text-emerald-700 shadow-lg shadow-emerald-900/5 backdrop-blur-md">
      <span className="relative flex h-2.5 w-2.5" aria-hidden>
        {pulsing && (
          <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75" />
        )}
        <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-emerald-500" />
      </span>
      Live
    </div>
  );
}

function RsvpNotification({ visible, reduce }: { visible: boolean; reduce: boolean }) {
  return (
    <div aria-hidden className="absolute inset-x-4 bottom-4 flex justify-center sm:justify-start">
      <motion.div
        className="flex items-center gap-3 rounded-2xl border border-white/70 bg-white/75 py-2.5 pl-2.5 pr-5 shadow-xl shadow-orange-900/10 backdrop-blur-xl"
        initial={{ opacity: 0, y: reduce ? 0 : 40 }}
        animate={visible ? { opacity: 1, y: 0 } : { opacity: 0, y: reduce ? 0 : 40 }}
        transition={{ duration: 0.6, ease: EASE_OUT, delay: visible ? 0.5 : 0 }}
      >
        <span className="flex h-8 w-8 items-center justify-center rounded-full bg-emerald-500 text-white shadow-[0_0_16px_rgba(16,185,129,0.55)]">
          <Check className="h-4 w-4" strokeWidth={3} />
        </span>
        <span className="text-sm font-semibold text-neutral-900">{RSVP_SAMPLE_MESSAGE}</span>
      </motion.div>
    </div>
  );
}

function StepVisual({ step }: { step: Step }) {
  const reduce = !!useReducedMotion();
  const ref = useRef<HTMLDivElement>(null);
  // Not `once`: looping effects mount only while the visual is on screen.
  const inView = useInView(ref, { amount: 0.35 });
  const [imageFailed, setImageFailed] = useState(false);
  const tilt = useTilt(!reduce);
  const loopsActive = inView && !reduce;

  return (
    <div ref={ref} className="relative" style={{ perspective: 1000 }}>
      <motion.div
        className="relative aspect-[4/3] overflow-hidden rounded-3xl border border-white/80 bg-gradient-to-br from-[#fff4ea] to-[#fdeadb] shadow-2xl shadow-orange-900/10"
        style={{ rotateX: tilt.rotateX, rotateY: tilt.rotateY }}
        onPointerMove={tilt.onPointerMove}
        onPointerLeave={tilt.onPointerLeave}
        initial="rest"
        whileHover="hover"
      >
        {/* Image layer. Only the gallery step scales on hover. */}
        <motion.div
          className="absolute inset-0"
          variants={step.kind === "gallery" && !reduce ? imageHover : undefined}
        >
          {!imageFailed && (
            <Image
              src={step.image}
              alt={step.alt}
              fill
              sizes="(min-width: 1024px) 560px, 100vw"
              className="object-cover"
              onError={() => setImageFailed(true)}
            />
          )}
        </motion.div>

        {/* Step 01: glass reflection sweep */}
        {step.kind === "gallery" && !reduce && (
          <motion.div
            aria-hidden
            className="pointer-events-none absolute inset-y-0 left-0 w-1/3 bg-gradient-to-r from-transparent via-white/60 to-transparent"
            style={{ skewX: -20 }}
            variants={sweepHover}
          />
        )}

        {/* Step 02: floating cursor orb */}
        {step.kind === "builder" && (inView || reduce) && <CursorOrb animated={loopsActive} />}

        {/* Step 03: live badge */}
        {step.kind === "publish" && <LiveBadge pulsing={loopsActive} />}

        {/* Step 04: RSVP notification */}
        {step.kind === "rsvp" && <RsvpNotification visible={inView} reduce={reduce} />}
      </motion.div>
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/*  Step row                                                                  */
/* -------------------------------------------------------------------------- */

function StepRow({ step, index, showNode }: { step: Step; index: number; showNode: boolean }) {
  const reversed = index % 2 === 1;

  return (
    <li className="relative grid items-center gap-8 lg:grid-cols-2 lg:gap-24">
      {showNode && (
        <span
          aria-hidden
          className="absolute left-1/2 top-1/2 -ml-2 -mt-2 h-4 w-4 rounded-full bg-white ring-4 ring-orange-400/80"
        />
      )}

      <div className={reversed ? "lg:order-2" : undefined}>
        <StepVisual step={step} />
      </div>

      <div className={reversed ? "lg:order-1 lg:text-right" : undefined}>
        <span className="bg-gradient-to-br from-orange-500 to-amber-400 bg-clip-text font-[family-name:var(--font-display)] text-6xl font-bold text-transparent">
          {step.number}
        </span>
        <RevealHeading
          as="h3"
          className="mt-3 font-[family-name:var(--font-display)] text-3xl font-bold tracking-tight text-neutral-900 sm:text-4xl"
        >
          {step.headline}
        </RevealHeading>
        <p className="mt-2 text-lg font-medium text-orange-600">{step.subheadline}</p>
        <p
          className={`mt-4 max-w-md font-[family-name:var(--font-body)] text-base leading-relaxed text-neutral-600 ${
            reversed ? "lg:ml-auto" : ""
          }`}
        >
          {step.body}
        </p>
      </div>
    </li>
  );
}

/* -------------------------------------------------------------------------- */
/*  Background                                                                */
/* -------------------------------------------------------------------------- */

const LIT_MASK =
  "radial-gradient(230px circle at var(--mx, -999px) var(--my, -999px), #000 0%, transparent 100%)";

/** A blurred glow that only drifts while `drift` is true; otherwise it is a plain static div. */
function Glow({
  drift,
  className,
  path,
  duration,
}: {
  drift: boolean;
  className: string;
  path: { x: number[]; y: number[] };
  duration: number;
}) {
  if (!drift) return <div className={className} />;
  return (
    <motion.div
      className={className}
      animate={path}
      transition={{ duration, repeat: Infinity, ease: "easeInOut" }}
    />
  );
}

/**
 * Peach gradient, dot grid, cursor-lit dots and drifting glows.
 * Reads --mx / --my from the parent section (set in HowItWorks).
 */
function DotGridBackground({
  active,
  reduce,
  lit,
}: {
  active: boolean;
  reduce: boolean;
  lit: boolean;
}) {
  const drift = active && !reduce;

  return (
    <div aria-hidden className="pointer-events-none absolute inset-0 -z-10">
      <div className="absolute inset-0 bg-gradient-to-b from-[#fff4ea] via-[#fbdcc0] to-[#fff4ea]" />
      <Glow
        drift={drift}
        duration={18}
        path={{ x: [0, 60, 0], y: [0, 30, 0] }}
        className="absolute -left-32 top-24 h-[420px] w-[420px] rounded-full bg-orange-300/30 blur-[120px]"
      />
      <Glow
        drift={drift}
        duration={22}
        path={{ x: [0, -50, 0], y: [0, -40, 0] }}
        className="absolute -right-32 bottom-32 h-[420px] w-[420px] rounded-full bg-amber-300/30 blur-[120px]"
      />
      <div
        className="absolute inset-0"
        style={{
          backgroundImage: "radial-gradient(circle, rgba(194,65,12,0.2) 1.5px, transparent 1.5px)",
          backgroundSize: "24px 24px",
        }}
      />
      {lit && (
        <div
          className="absolute inset-0"
          style={{
            backgroundImage: "radial-gradient(circle, rgba(234,88,12,0.95) 2px, transparent 2px)",
            backgroundSize: "24px 24px",
            maskImage: LIT_MASK,
            WebkitMaskImage: LIT_MASK,
          }}
        />
      )}
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/*  Section                                                                   */
/* -------------------------------------------------------------------------- */

export default function HowItWorks() {
  const reduce = !!useReducedMotion();
  const isWide = useMediaQuery("(min-width: 1024px)");
  const listRef = useRef<HTMLOListElement>(null);

  // Background: cursor-lit dots (fine pointers only) and glows that run only while on screen.
  const sectionRef = useRef<HTMLElement>(null);
  const raf = useRef(0);
  const sectionInView = useInView(sectionRef, { amount: 0.1 });
  const finePointer = useMediaQuery("(hover: hover) and (pointer: fine)");

  const setSpot = useCallback((x: string, y: string) => {
    sectionRef.current?.style.setProperty("--mx", x);
    sectionRef.current?.style.setProperty("--my", y);
  }, []);

  const onPointerMove = useCallback(
    (e: React.PointerEvent<HTMLElement>) => {
      if (e.pointerType !== "mouse") return;
      const { clientX, clientY } = e;
      cancelAnimationFrame(raf.current);
      raf.current = requestAnimationFrame(() => {
        const rect = sectionRef.current?.getBoundingClientRect();
        if (!rect) return;
        setSpot(`${clientX - rect.left}px`, `${clientY - rect.top}px`);
      });
    },
    [setSpot],
  );

  const onPointerLeave = useCallback(() => {
    cancelAnimationFrame(raf.current);
    setSpot("-999px", "-999px");
  }, [setSpot]);

  useEffect(() => () => cancelAnimationFrame(raf.current), []);

  const { scrollYProgress } = useScroll({
    target: listRef,
    offset: ["start 70%", "end 60%"],
  });
  const progress = useSpring(scrollYProgress, { stiffness: 120, damping: 28, mass: 0.4 });

  return (
    <section
      id="how-it-works"
      ref={sectionRef}
      onPointerMove={finePointer && !reduce ? onPointerMove : undefined}
      onPointerLeave={onPointerLeave}
      className="relative isolate overflow-hidden bg-[#fdeadb] py-24 sm:py-32"
    >
      <DotGridBackground active={sectionInView} reduce={reduce} lit={finePointer && !reduce} />

      <div className="relative z-10 mx-auto max-w-6xl px-6">
        <header className="mx-auto max-w-2xl text-center">
          <span className="inline-flex items-center rounded-full border border-orange-200 bg-white/70 px-4 py-1.5 text-sm font-medium text-orange-700 shadow-sm backdrop-blur-md">
            How it works
          </span>
          <RevealHeading
            as="h2"
            className="mt-6 font-[family-name:var(--font-display)] text-4xl font-bold tracking-tight text-neutral-900 sm:text-5xl"
          >
            From idea to published in minutes.
          </RevealHeading>
          <p className="mt-5 font-[family-name:var(--font-body)] text-lg leading-relaxed text-neutral-600">
            You don&apos;t need a designer or a developer. Here is exactly how Riwainvite turns your
            vision into a live, interactive invitation.
          </p>
        </header>

        <ol ref={listRef} className="relative mt-20 space-y-20 sm:space-y-28">
          {/* Center rail: wide screens only, gated in JS */}
          {isWide && (
            <>
              <span
                aria-hidden
                className="absolute bottom-0 left-1/2 top-0 w-px bg-orange-200/70"
              />
              {!reduce && (
                <motion.span
                  aria-hidden
                  className="absolute bottom-0 left-1/2 top-0 w-px origin-top bg-gradient-to-b from-orange-500 to-amber-400"
                  style={{ scaleY: progress }}
                />
              )}
            </>
          )}

          {STEPS.map((step, i) => (
            <StepRow key={step.number} step={step} index={i} showNode={isWide} />
          ))}
        </ol>
      </div>
    </section>
  );
}