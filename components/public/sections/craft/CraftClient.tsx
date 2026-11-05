"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import Image from "next/image";
import {
  AnimatePresence,
  motion,
  useInView,
  useMotionTemplate,
  useMotionValue,
  useMotionValueEvent,
  useReducedMotion,
  useScroll,
  useSpring,
  useTransform,
  Variants,
} from "framer-motion";
import { useLenis } from "lenis/react";
import type { LucideIcon } from "lucide-react";
import {
  ArrowRight, Sparkles, CheckCircle2, MessageSquare, PenTool, Monitor, Rocket,
  ChevronDown, Globe, Clock, RefreshCcw, CalendarHeart, Wand2, Link2, BadgeCheck, Eye,
} from "lucide-react";
import { CraftModal } from "@/components/public/models/CraftModal";

/* ------------------------------------------------------------------ */
/* Constants and helpers                                               */
/* ------------------------------------------------------------------ */
const EASE = [0.16, 1, 0.3, 1] as const;
const cn = (...c: (string | false | undefined)[]) => c.filter(Boolean).join(" ");
const focusRing =
  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-500 focus-visible:ring-offset-2 focus-visible:ring-offset-[#fff4ea]";
const primaryBtn =
  "bg-gradient-to-b from-[#fb8a3c] to-[#f97316] shadow-[0_10px_30px_-10px_rgba(249,115,22,0.8),inset_0_1px_0_rgba(255,255,255,0.3)]";
const peachPill = "bg-gradient-to-b from-[#ffe9d3] to-[#ffcfa4] ring-1 ring-orange-900/10";
/* light sweep across a button on hover */
const shine =
  "relative overflow-hidden before:absolute before:inset-y-0 before:-left-1/2 before:w-1/3 before:-skew-x-12 before:bg-white/35 before:transition-all before:duration-700 hover:before:left-[130%]";

type Service = "website" | "template";
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

const TXT: Record<Tone, { h: string; p: string; chip: string; icon: string; check: string; eyebrow: string; ghost: string; btn2: string }> = {
  dark: { h: "text-white", p: "text-slate-300", chip: "bg-[#232b57] text-orange-200", icon: "bg-orange-500 text-white", check: "text-orange-400", eyebrow: "text-orange-300", ghost: "text-[#2a3470]", btn2: "bg-[#232b57] text-white ring-1 ring-white/15 hover:bg-[#2d3770]" },
  paper: { h: "text-slate-900", p: "text-slate-700", chip: "bg-[#ffd2a6] text-orange-900", icon: "bg-orange-500 text-white", check: "text-orange-600", eyebrow: "text-orange-700", ghost: "text-[#ffbd85]", btn2: "bg-[#fff4ea] text-orange-900 ring-1 ring-orange-900/15 hover:bg-white" },
  sun: { h: "text-white", p: "text-white", chip: "bg-[#c2410c] text-white", icon: "bg-white text-orange-600", check: "text-white", eyebrow: "text-white", ghost: "text-[#fdba74]", btn2: "bg-[#11162a] text-white hover:bg-[#1b2249]" },
};

/* Headline reveal (same pattern as Why Riwainvite) */
const wordsParent: Variants = { hidden: {}, show: { transition: { staggerChildren: 0.07, delayChildren: 0.1 } } };
const wordChild: Variants = {
  hidden: { y: "115%", rotate: 4 },
  show: { y: 0, rotate: 0, transition: { duration: 0.9, ease: EASE } },
};

const EVENT_TYPES = [
  "Weddings", "Engagements", "Mehndi & Mayun", "Birthdays", "Anniversaries",
  "Baby showers", "Corporate galas", "Graduations", "Anything you imagine",
];

const SERVICES: {
  key: Service; tone: Tone; title: string; tag: string; timeline: string; image: string; blurb: string;
  features: string[]; featured: boolean; cta: string;
  chips: { icon: LucideIcon; text: string; pos: string }[];
}[] = [
  {
    key: "website",
    tone: "dark",
    title: "Crafted Website",
    tag: "Fully bespoke",
    timeline: "7–14 days",
    image: "/craft-website-card.png",
    blurb: "A one-of-a-kind website coded from scratch around your story, with custom animations, unique layouts and your own domain.",
    features: [
      "100% bespoke design & code",
      "Your own domain: purchase & DNS setup handled",
      "Advanced animations",
      "Built-in RSVP",
      "2 rounds of revisions",
    ],
    featured: true,
    cta: "Start my Crafted Website",
    chips: [
      { icon: Link2, text: "Your own domain", pos: "bottom-4 left-3 sm:bottom-6 sm:left-5" },
      { icon: CalendarHeart, text: "RSVP built in", pos: "right-3 top-1/3 sm:right-5" },
    ],
  },
  {
    key: "template",
    tone: "paper",
    title: "Crafted Template",
    tag: "Fastest route",
    timeline: "3–5 days",
    image: "/craft-template-card.png",
    blurb: "Pick a premium template and our designers reshape the colours, fonts, sections and imagery until it feels made for you.",
    features: [
      "Premium design of your choice",
      "Complete colour & font overhaul",
      "Your photos and details integrated",
      "Live preview link before launch",
      "2 rounds of revisions",
    ],
    featured: false,
    cta: "Customize a Template",
    chips: [
      { icon: Eye, text: "Live preview link", pos: "bottom-4 left-3 sm:bottom-6 sm:left-5" },
      { icon: RefreshCcw, text: "2 revisions", pos: "right-3 top-1/3 sm:right-5" },
    ],
  },
];

const PROCESS_STEPS = [
  { icon: MessageSquare, tone: "paper" as Tone, title: "The Brief", desc: "We hop on a call to understand your event, your vibe and your exact requirements." },
  { icon: PenTool, tone: "dark" as Tone, title: "The Craft", desc: "Our design team customizes a premium template or builds your bespoke site from scratch." },
  { icon: Monitor, tone: "dark" as Tone, title: "The Review", desc: "You get a live link to preview every animation, font and RSVP feature before we launch." },
  { icon: Rocket, tone: "paper" as Tone, title: "The Launch", desc: "We connect your custom domain, optimize the speed and hand over the keys." },
];

const SMALL_TILES = [
  { icon: Wand2, tone: "sun" as Tone, title: "Designed around you", desc: "Colours, fonts, sections and imagery shaped to your event." },
  { icon: Eye, tone: "dark" as Tone, title: "Live preview link", desc: "See every animation, font and feature before we launch." },
  { icon: RefreshCcw, tone: "paper" as Tone, title: "2 revision rounds", desc: "Refine everything with us before launch." },
  { icon: BadgeCheck, tone: "dark" as Tone, title: "Speed-optimized", desc: "We optimize loading speed as part of the launch." },
];

const COMPARE: { label: string; template: string | boolean; website: string | boolean }[] = [
  { label: "Pricing", template: "Quoted to your needs", website: "Quoted to your needs" },
  { label: "Typical delivery", template: "3–5 days", website: "7–14 days" },
  { label: "Design", template: "Premium template, heavily customized", website: "100% bespoke" },
  { label: "Custom domain", template: true, website: true },
  { label: "RSVP", template: "Discussed in your brief", website: true },
  { label: "Advanced animations", template: "Depends on the template", website: true },
  { label: "Revision rounds", template: "2", website: "2" },
];

const FAQS = [
  { q: "How much does it cost?", a: "It depends on what you need. Tell us about your event and your ideas, and we will quote you after the brief. There is no one-size-fits-all number." },
  { q: "How long does a Crafted Website take?", a: "Depending on the complexity, a fully bespoke website usually takes 7–14 days from start to finish. Crafted templates are usually delivered in 3–5 days." },
  { q: "Do I need to buy my own domain?", a: "No, our team will handle the entire domain purchasing and DNS setup process for you. We will just ask for your preferred name." },
  { q: "Can I request changes after it's built?", a: "Absolutely. We include 2 rounds of revisions before launch. If you need ongoing changes after the event, we can arrange that too." },
  { q: "What if I already have a template?", a: "If you bought a template from our store, we can use that as the base and heavily customize it for you at a discounted rate." },
  { q: "Is my event type supported?", a: "Yes. You describe your event in your own words, whether it's a wedding, a mehndi night, a graduation or something unusual, and we design around it." },
  { q: "What do you need from me to start?", a: "Just your event details, a rough idea of the vibe, and your preferred domain name. Photos and reference links help, but they aren't required to begin." },
];

/* ------------------------------------------------------------------ */
/* Images                                                              */
/* ------------------------------------------------------------------ */
/*
 * Reveals when scrolled into view: rounded inset opens up while the photo
 * settles from a slight zoom. It ends at exactly scale 1 with no continuous
 * movement, so the image is as sharp as the source file allows.
 */
function RevealPic({
  src, sizes, className, priority, children,
}: { src: string; sizes: string; className?: string; priority?: boolean; children?: React.ReactNode }) {
  const reduce = useReducedMotion() ?? false;
  return (
    <motion.div
      initial={reduce ? false : { clipPath: "inset(12% 8% 12% 8% round 32px)" }}
      whileInView={{ clipPath: "inset(0% 0% 0% 0% round 0px)" }}
      viewport={{ once: true, amount: 0.25 }}
      transition={{ duration: 1.1, ease: EASE }}
      className={cn("relative w-full shrink-0 overflow-hidden", className)}
    >
      <motion.div
        initial={reduce ? false : { scale: 1.15 }}
        whileInView={{ scale: 1 }}
        viewport={{ once: true, amount: 0.25 }}
        transition={{ duration: 1.6, ease: EASE }}
        className="absolute inset-0"
      >
        <Image src={src} alt="" aria-hidden fill priority={priority} quality={95} sizes={sizes} className="object-cover object-center" />
      </motion.div>
      {children}
    </motion.div>
  );
}

/* Slides up when scrolled into view */
function RiseIn({ className, delay = 0.5, children }: { className?: string; delay?: number; children: React.ReactNode }) {
  const reduce = useReducedMotion() ?? false;
  return (
    <motion.div
      initial={reduce ? false : { y: 36, opacity: 0 }}
      whileInView={{ y: 0, opacity: 1 }}
      viewport={{ once: true, amount: 0.4 }}
      transition={{ duration: 0.8, ease: EASE, delay }}
      className={className}
    >
      {children}
    </motion.div>
  );
}

/* Chip that pops in on scroll, then floats while visible */
function Float({ className, delay = 0, reduce, children }: { className?: string; delay?: number; reduce: boolean; children: React.ReactNode }) {
  const ref = useRef<HTMLDivElement>(null);
  const inView = useInView(ref, { amount: 0.5 });
  return (
    <motion.div
      ref={ref}
      initial={reduce ? false : { opacity: 0, scale: 0.7, y: 14 }}
      whileInView={{ opacity: 1, scale: 1, y: 0 }}
      viewport={{ once: true, amount: 0.5 }}
      transition={{ duration: 0.6, ease: EASE, delay: 0.5 + delay * 0.25 }}
      className={cn("absolute z-10", className)}
    >
      <motion.div
        animate={inView && !reduce ? { y: [0, -8, 0] } : { y: 0 }}
        transition={inView && !reduce ? { duration: 4.5, repeat: Infinity, ease: "easeInOut", delay } : { duration: 0.3 }}
      >
        {children}
      </motion.div>
    </motion.div>
  );
}

/* Optional hero video. Falls back to the still image if it can't play. */
function HeroVideo({ reduce }: { reduce: boolean }) {
  const ref = useRef<HTMLVideoElement>(null);
  const [ready, setReady] = useState(false);
  const [bad, setBad] = useState(false);

  useEffect(() => {
    const v = ref.current;
    if (!v || reduce || bad) return;
    const io = new IntersectionObserver(
      ([e]) => { if (e.isIntersecting) v.play().catch(() => {}); else v.pause(); },
      { threshold: 0.3 }
    );
    io.observe(v);
    return () => io.disconnect();
  }, [reduce, bad]);

  if (reduce || bad) return null;
  return (
    <video
      ref={ref}
      muted
      loop
      playsInline
      preload="metadata"
      aria-hidden
      onCanPlay={() => setReady(true)}
      className={cn("absolute inset-0 h-full w-full object-cover transition-opacity duration-700", ready ? "opacity-100" : "opacity-0")}
    >
      <source src="/craft-bg-video.mp4" type="video/mp4" onError={() => setBad(true)} />
    </video>
  );
}

/* ------------------------------------------------------------------ */
/* Card shell: entrance, optional 3D tilt, cursor light                */
/* ------------------------------------------------------------------ */
function Card({
  tone, className, pad = "p-5 sm:p-7 lg:p-9", delay = 0, max = 4, tilt = true, children,
}: {
  tone: Tone; className?: string; pad?: string; delay?: number; max?: number; tilt?: boolean; children: React.ReactNode;
}) {
  const reduce = useReducedMotion() ?? false;

  const px = useMotionValue(0);
  const py = useMotionValue(0);
  const sx = useSpring(px, { stiffness: 140, damping: 22 });
  const sy = useSpring(py, { stiffness: 140, damping: 22 });
  const rotateY = useTransform(sx, [-0.5, 0.5], [-max, max]);
  const rotateX = useTransform(sy, [-0.5, 0.5], [max, -max]);

  const gx = useMotionValue(-400);
  const gy = useMotionValue(-400);
  const light = useMotionTemplate`radial-gradient(360px circle at ${gx}px ${gy}px, ${LIGHT[tone]}, transparent 70%)`;

  const onMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (e.pointerType === "touch") return;
    const r = e.currentTarget.getBoundingClientRect();
    const nx = (e.clientX - r.left) / r.width;
    const ny = (e.clientY - r.top) / r.height;
    if (tilt) { px.set(nx - 0.5); py.set(ny - 0.5); }
    gx.set(nx * r.width);
    gy.set(ny * r.height);
  };
  const onLeave = () => { px.set(0); py.set(0); gx.set(-400); gy.set(-400); };

  return (
    <motion.div
      initial={reduce ? false : { opacity: 0, y: 40, scale: 0.97 }}
      whileInView={{ opacity: 1, y: 0, scale: 1 }}
      whileHover={reduce ? undefined : { y: -4 }}
      viewport={{ once: true, amount: 0.1 }}
      transition={{ duration: 0.8, delay, ease: EASE }}
      onPointerMove={reduce ? undefined : onMove}
      onPointerLeave={onLeave}
      style={{
        backgroundImage: BG[tone],
        ...(reduce || !tilt ? {} : { rotateX, rotateY, transformPerspective: 1400 }),
      }}
      className={cn("group relative flex min-w-0 flex-col overflow-hidden border transition-shadow duration-500", pad, SHELL[tone], className)}
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

/* ------------------------------------------------------------------ */
/* Small pieces                                                        */
/* ------------------------------------------------------------------ */
function SectionHead({ eyebrow, title, sub }: { eyebrow: string; title: string; sub?: string }) {
  const reduce = useReducedMotion() ?? false;
  return (
    <motion.div
      initial={reduce ? false : { opacity: 0, y: 24 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-60px" }}
      transition={{ duration: 0.8, ease: EASE }}
      className="mb-10 text-center sm:mb-14"
    >
      <span className={cn("inline-flex items-center gap-2 rounded-full px-4 py-1.5 text-xs font-bold uppercase tracking-[0.22em] text-orange-800", peachPill)}>
        <Sparkles className="h-3.5 w-3.5 text-orange-600" /> {eyebrow}
      </span>
      <h2 className="mt-4 font-[family-name:var(--font-display)] text-[2rem] font-extrabold leading-[1.05] tracking-tighter text-slate-900 sm:text-5xl lg:text-6xl">
        {title}
      </h2>
      {sub && <p className="mx-auto mt-4 max-w-xl text-base font-medium text-slate-600">{sub}</p>}
    </motion.div>
  );
}

const HEADLINE = [
  { words: ["Crafted."], accent: false },
  { words: ["Just", "for", "you."], accent: true },
];

function Headline({ reduce }: { reduce: boolean }) {
  return (
    <motion.h1
      aria-label="Crafted. Just for you."
      variants={wordsParent}
      initial={reduce ? "show" : "hidden"}
      whileInView="show"
      viewport={{ once: true }}
      className="font-[family-name:var(--font-display)] text-[2rem] font-extrabold leading-[1.04] tracking-tighter text-slate-900 sm:text-6xl lg:text-7xl xl:text-[5.5rem]"
    >
      {HEADLINE.map((line, li) => (
        <span key={li} className="block">
          {line.words.map((w, i) => (
            <span key={i} className="mr-[0.25em] inline-block overflow-hidden pb-[0.14em] align-bottom">
              <motion.span
                aria-hidden
                variants={wordChild}
                className={cn("inline-block origin-bottom-left", line.accent && "bg-gradient-to-r from-[#f97316] to-amber-500 bg-clip-text text-transparent")}
              >
                {w}
              </motion.span>
            </span>
          ))}
        </span>
      ))}
    </motion.h1>
  );
}

function FaqItem({ q, a }: { q: string; a: string }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="border-b border-orange-900/15 last:border-0">
      <button
        onClick={() => setOpen(!open)}
        aria-expanded={open}
        className={`flex w-full items-center justify-between gap-4 py-5 text-left sm:py-6 ${focusRing}`}
      >
        <span className="font-[family-name:var(--font-display)] text-base font-bold text-slate-900 sm:text-lg">{q}</span>
        <span className={cn("flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-orange-500 text-white transition-transform duration-300", open && "rotate-180")}>
          <ChevronDown className="h-4 w-4" />
        </span>
      </button>
      <motion.div initial={false} animate={{ height: open ? "auto" : 0 }} transition={{ duration: 0.35, ease: EASE }} className="overflow-hidden">
        <p className="pb-5 text-sm font-medium leading-relaxed text-slate-700 sm:pb-6 sm:text-base">{a}</p>
      </motion.div>
    </div>
  );
}

function Cell({ v, tone }: { v: string | boolean; tone: "tpl" | "web" }) {
  if (v === true) return <CheckCircle2 className="h-5 w-5 text-orange-400" />;
  if (v === false) return <span className="text-slate-500">–</span>;
  return <span className={tone === "web" ? "font-bold text-white" : "font-medium text-slate-200"}>{v}</span>;
}

/* Scrolls only while it is on screen */
function Marquee({ reduce }: { reduce: boolean }) {
  const ref = useRef<HTMLDivElement>(null);
  const inView = useInView(ref);
  const items = [...EVENT_TYPES, ...EVENT_TYPES];
  const mask = "linear-gradient(90deg, transparent, #000 8%, #000 92%, transparent)";
  return (
    <div ref={ref} className="overflow-hidden py-2" style={{ maskImage: mask, WebkitMaskImage: mask }}>
      <motion.div
        className="flex w-max"
        animate={inView && !reduce ? { x: ["0%", "-50%"] } : { x: "0%" }}
        transition={inView && !reduce ? { duration: 38, ease: "linear", repeat: Infinity } : { duration: 0 }}
      >
        {items.map((t, i) => (
          <span key={i} className={cn("mr-3 inline-flex items-center gap-2 whitespace-nowrap rounded-full px-5 py-2.5 text-sm font-bold text-orange-900", peachPill)}>
            <Sparkles className="h-3.5 w-3.5 text-orange-600" /> {t}
          </span>
        ))}
      </motion.div>
    </div>
  );
}

function useTyped(text: string, start: boolean, reduce: boolean, speed = 110) {
  const [n, setN] = useState(0);
  useEffect(() => {
    if (!start || reduce) return;
    let i = 0;
    const id = setInterval(() => {
      i += 1;
      setN(i);
      if (i >= text.length) clearInterval(id);
    }, speed);
    return () => clearInterval(id);
  }, [start, reduce, text, speed]);
  return reduce ? text : text.slice(0, n);
}

/* ------------------------------------------------------------------ */
/* Service card                                                        */
/* ------------------------------------------------------------------ */
function ServiceCard({
  s, index, onOpen, onJump, reduce,
}: { s: (typeof SERVICES)[number]; index: number; onOpen: (k: Service) => void; onJump: (id: string) => void; reduce: boolean }) {
  const t = TXT[s.tone];
  const flip = index % 2 === 1;
  return (
    <Card tone={s.tone} max={2} pad="p-4 sm:p-6 lg:p-8" className="rounded-[1.75rem] sm:rounded-[2.5rem]">
      <div className="grid gap-6 lg:grid-cols-12 lg:gap-10">
        <div className={cn("flex lg:col-span-7", flip && "lg:order-2")}>
          <RevealPic
            src={s.image}
            sizes="(min-width:1024px) 1000px, 100vw"
            className="aspect-[16/11] rounded-[1.25rem] shadow-[0_24px_50px_-20px_rgba(0,0,0,0.55)] ring-1 ring-black/10 sm:aspect-[16/10] sm:rounded-[1.75rem] lg:aspect-auto lg:min-h-[560px]"
          >
            {s.featured && (
              <RiseIn delay={0.7} className="absolute left-3 top-3 z-10 sm:left-5 sm:top-5">
                <span className="inline-flex items-center gap-1.5 rounded-full bg-orange-500 px-3.5 py-1.5 text-[11px] font-bold text-white shadow-lg sm:text-xs">
                  <Sparkles className="h-3.5 w-3.5" /> Most Popular
                </span>
              </RiseIn>
            )}
            {s.chips.map((c, i) => (
              <Float key={c.text} reduce={reduce} delay={i * 1.2} className={c.pos}>
                <span className={cn("flex items-center gap-2 rounded-full px-3.5 py-2 text-[11px] font-bold shadow-xl sm:text-xs", i % 2 === 0 ? "bg-[#11162a] text-white" : "bg-orange-500 text-white")}>
                  <c.icon className="h-3.5 w-3.5" /> {c.text}
                </span>
              </Float>
            ))}
          </RevealPic>
        </div>

        <div className="relative flex flex-col justify-center lg:col-span-5">
          <span aria-hidden className={cn("pointer-events-none absolute -right-1 -top-6 select-none font-[family-name:var(--font-display)] text-[7rem] font-extrabold leading-none sm:text-[9rem]", t.ghost)}>
            0{index + 1}
          </span>

          <span className={cn("relative text-xs font-bold uppercase tracking-[0.22em]", t.eyebrow)}>{s.tag}</span>
          <h3 className={cn("relative mt-2 font-[family-name:var(--font-display)] text-3xl font-extrabold tracking-tight sm:text-4xl xl:text-5xl", t.h)}>
            {s.title}
          </h3>

          <div className="relative mt-5 flex flex-wrap gap-2.5">
            <span className={cn("inline-flex items-center gap-2 rounded-full px-4 py-2 text-sm font-bold", t.chip)}>
              <Wand2 className="h-4 w-4" /> Priced to your needs
            </span>
            <span className={cn("inline-flex items-center gap-2 rounded-full px-4 py-2 text-sm font-bold", t.chip)}>
              <Clock className="h-4 w-4" /> {s.timeline}
            </span>
          </div>

          <p className={cn("relative mt-5 text-base font-medium leading-relaxed", t.p)}>{s.blurb}</p>

          <ul className={cn("relative mt-6 space-y-3 text-sm font-semibold sm:text-[15px]", t.h)}>
            {s.features.map((f, i) => (
              <motion.li
                key={f}
                initial={reduce ? false : { opacity: 0, x: flip ? -16 : 16 }}
                whileInView={{ opacity: 1, x: 0 }}
                viewport={{ once: true, amount: 0.6 }}
                transition={{ duration: 0.6, ease: EASE, delay: 0.1 + i * 0.07 }}
                className="flex items-start gap-3"
              >
                <CheckCircle2 className={cn("mt-0.5 h-5 w-5 shrink-0", t.check)} /> {f}
              </motion.li>
            ))}
          </ul>

          <motion.div
            initial={reduce ? false : { opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, amount: 0.6 }}
            transition={{ duration: 0.7, ease: EASE, delay: 0.5 }}
            className="relative mt-8 flex flex-col gap-3 sm:flex-row"
          >
            <button
              type="button"
              onClick={() => onOpen(s.key)}
              className={cn(shine, primaryBtn, "inline-flex items-center justify-center gap-2 rounded-xl px-7 py-4 text-base font-bold text-white transition-transform hover:scale-[1.03] active:scale-[0.98]", focusRing)}
            >
              {s.cta} <ArrowRight className="h-5 w-5" />
            </button>
            <button
              type="button"
              onClick={() => onJump("process")}
              className={cn("inline-flex items-center justify-center rounded-xl px-6 py-4 text-base font-bold transition-colors", t.btn2, focusRing)}
            >
              See how it works
            </button>
          </motion.div>
        </div>
      </div>
    </Card>
  );
}

/* ------------------------------------------------------------------ */
/* Process step: scroll-drawn line to the next step                    */
/* ------------------------------------------------------------------ */
function Step({ step, i, last, reduce }: { step: (typeof PROCESS_STEPS)[number]; i: number; last: boolean; reduce: boolean }) {
  const ref = useRef<HTMLLIElement>(null);
  const { scrollYProgress } = useScroll({ target: ref, offset: ["start 70%", "end 45%"] });
  const fill = useSpring(scrollYProgress, { stiffness: 120, damping: 30, mass: 0.3 });
  const t = TXT[step.tone];

  return (
    <li ref={ref} className="relative pl-[4.25rem]">
      {!last && (
        <>
          <span aria-hidden className="absolute bottom-[-1.25rem] left-[22px] top-12 w-1 rounded-full bg-[#ffbd85]" />
          <motion.span
            aria-hidden
            style={{ scaleY: reduce ? 1 : fill }}
            className="absolute bottom-[-1.25rem] left-[22px] top-12 w-1 origin-top rounded-full bg-gradient-to-b from-orange-500 to-amber-400"
          />
        </>
      )}
      <motion.span
        initial={reduce ? false : { scale: 0.7, backgroundColor: "#ffd2a6", color: "#9a3412" }}
        whileInView={{ scale: 1, backgroundColor: "#f97316", color: "#ffffff" }}
        viewport={{ once: true, amount: 0.8 }}
        transition={{ duration: 0.6, ease: EASE }}
        className="absolute left-0 top-0 z-10 flex h-12 w-12 items-center justify-center rounded-full text-sm font-extrabold shadow-lg ring-4 ring-[#fff4ea]"
      >
        0{i + 1}
      </motion.span>

      <Card tone={step.tone} max={4} pad="p-5 sm:p-6" className="rounded-[1.5rem]">
        <div className="flex items-start gap-4">
          <div className={cn("flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl shadow-lg transition-transform duration-500 group-hover:-rotate-6 group-hover:scale-110", t.icon)}>
            <step.icon className="h-5 w-5" />
          </div>
          <div>
            <h4 className={cn("font-[family-name:var(--font-display)] text-xl font-bold", t.h)}>{step.title}</h4>
            <p className={cn("mt-1.5 text-sm font-medium leading-relaxed sm:text-[15px]", t.p)}>{step.desc}</p>
          </div>
        </div>
      </Card>
    </li>
  );
}

/* ------------------------------------------------------------------ */
/* "Everything handled" tiles                                          */
/* ------------------------------------------------------------------ */
function DomainTile({ reduce }: { reduce: boolean }) {
  const ref = useRef<HTMLDivElement>(null);
  const inView = useInView(ref, { once: true, amount: 0.5 });
  const typed = useTyped("yourname", inView, reduce);
  const live = reduce || typed.length === 8;

  return (
    <Card tone="dark" max={3} pad="p-4 sm:p-6 lg:p-8" className="rounded-[1.75rem] sm:rounded-[2rem] lg:col-span-7">
      <div ref={ref} className="flex flex-1 flex-col gap-5">
        <div className="flex items-start gap-4">
          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-orange-500 text-white shadow-lg transition-transform duration-500 group-hover:rotate-6 group-hover:scale-110">
            <Link2 className="h-6 w-6" />
          </div>
          <div>
            <h4 className="font-[family-name:var(--font-display)] text-xl font-bold text-white sm:text-2xl">Your own domain</h4>
            <p className="mt-1 text-sm font-medium leading-relaxed text-slate-300 sm:text-[15px]">
              Tell us the name you want. We handle the purchase and DNS setup.
            </p>
          </div>
        </div>
        <RevealPic
          src="/why-slugs.png"
          sizes="(min-width:1024px) 900px, 100vw"
          className="mt-auto aspect-[16/9] rounded-2xl shadow-[0_20px_50px_-20px_rgba(0,0,0,0.7)] ring-1 ring-white/10 sm:aspect-[2/1]"
        >
          <div className="absolute inset-x-3 bottom-3 z-10 flex items-center gap-1 rounded-xl bg-[#11162a] px-3.5 py-3 font-mono text-xs shadow-xl ring-1 ring-white/10 sm:inset-x-5 sm:bottom-5 sm:text-sm">
            <Globe className="mr-1.5 h-4 w-4 shrink-0 text-orange-400" />
            <span className="font-bold text-white">{typed}</span>
            <span className="text-slate-400">.com</span>
            {!live && <span className="h-4 w-px animate-pulse bg-orange-400" />}
            <AnimatePresence>
              {live && (
                <motion.span
                  initial={reduce ? false : { opacity: 0, scale: 0.6 }}
                  animate={{ opacity: 1, scale: 1 }}
                  className="ml-auto shrink-0 rounded-full bg-emerald-500/20 px-2.5 py-1 font-sans text-[10.5px] font-bold text-emerald-300"
                >
                  Live
                </motion.span>
              )}
            </AnimatePresence>
          </div>
          <span className="absolute right-3 top-3 z-10 rounded-full bg-[#11162a] px-3 py-1 text-[10px] font-bold uppercase tracking-wider text-slate-300 sm:right-5 sm:top-5">
            Example
          </span>
        </RevealPic>
      </div>
    </Card>
  );
}

function RsvpTile() {
  return (
    <Card tone="paper" max={3} pad="p-4 sm:p-6 lg:p-8" className="rounded-[1.75rem] sm:rounded-[2rem] lg:col-span-5">
      <div className="flex flex-1 flex-col gap-5">
        <div className="flex items-start gap-4">
          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-orange-500 text-white shadow-lg transition-transform duration-500 group-hover:rotate-6 group-hover:scale-110">
            <CalendarHeart className="h-6 w-6" />
          </div>
          <div>
            <h4 className="font-[family-name:var(--font-display)] text-xl font-bold text-slate-900 sm:text-2xl">RSVP built in</h4>
            <p className="mt-1 text-sm font-medium leading-relaxed text-slate-700 sm:text-[15px]">
              Guests respond right from the site, no spreadsheets to chase.
            </p>
          </div>
        </div>
        <RevealPic
          src="/why-rsvp.png"
          sizes="(min-width:1024px) 700px, 100vw"
          className="mt-auto aspect-[4/3] rounded-2xl shadow-[0_18px_40px_-20px_rgba(154,52,18,0.55)] ring-1 ring-orange-900/10"
        />
      </div>
    </Card>
  );
}

/* ------------------------------------------------------------------ */
/* Main                                                                */
/* ------------------------------------------------------------------ */
export function CraftClient() {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [initialService, setInitialService] = useState<Service | null>(null);
  const [showBar, setShowBar] = useState(false);
  const reduce = useReducedMotion() ?? false;
  const lenis = useLenis();
  const rootRef = useRef<HTMLDivElement>(null);
  const raf = useRef(0);

  const { scrollY, scrollYProgress } = useScroll();
  const progress = useSpring(scrollYProgress, { stiffness: 120, damping: 28, mass: 0.3 });
  useMotionValueEvent(scrollY, "change", (v) => setShowBar(v > 480));

  const openModal = (service: Service | null = null) => {
    setInitialService(service);
    setIsModalOpen(true);
  };

  const jump = (id: string) => {
    if (lenis) lenis.scrollTo(`#${id}`, { offset: -80 });
    else document.getElementById(id)?.scrollIntoView({ behavior: "smooth" });
  };

  /* Cursor-reactive dot grid, one update per frame */
  const onMove = useCallback((e: React.PointerEvent) => {
    if (e.pointerType === "touch") return;
    const { clientX: x, clientY: y } = e;
    cancelAnimationFrame(raf.current);
    raf.current = requestAnimationFrame(() => {
      rootRef.current?.style.setProperty("--mx", `${x}px`);
      rootRef.current?.style.setProperty("--my", `${y}px`);
    });
  }, []);
  useEffect(() => () => cancelAnimationFrame(raf.current), []);

  const mask = "radial-gradient(230px circle at var(--mx,-999px) var(--my,-999px), #000 0%, transparent 100%)";

  return (
    <div
      ref={rootRef}
      onPointerMove={onMove}
      className="relative isolate min-h-screen w-full overflow-x-clip pb-24 font-[family-name:var(--font-body)] text-slate-900 md:pb-0"
    >
      {/* Scroll progress */}
      {!reduce && (
        <motion.div
          aria-hidden
          style={{ scaleX: progress }}
          className="fixed inset-x-0 top-0 z-50 h-1 origin-left bg-gradient-to-r from-[#f97316] via-orange-400 to-amber-400"
        />
      )}

      {/* ===================== DOTTED BACKGROUND (unchanged) ===================== */}
      <div aria-hidden className="pointer-events-none fixed inset-0 -z-10 overflow-hidden">
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

      {/* ============================ HERO ============================ */}
      <section className="mx-auto grid min-h-[calc(100svh-5rem)] w-full max-w-7xl items-center gap-6 px-4 pb-6 pt-6 sm:gap-10 sm:px-6 sm:pb-10 sm:pt-28 lg:min-h-[max(620px,calc(100svh-5.5rem))] lg:grid-cols-12 lg:gap-12 lg:px-8 lg:pb-12 lg:pt-28">
        <div className="text-center lg:col-span-7 lg:text-left">
          <motion.span
            initial={{ opacity: 0, scale: 0.92 }} animate={{ opacity: 1, scale: 1 }}
            className={cn("mb-3 inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-[11px] font-bold text-orange-700 shadow-sm sm:mb-5 sm:gap-2 sm:px-4 sm:py-2 sm:text-sm", peachPill)}
          >
            <Sparkles className="h-3.5 w-3.5 sm:h-4 sm:w-4" /> The Crafted Collection
          </motion.span>

          <Headline reduce={reduce} />

          <motion.p
            initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.5, duration: 0.8 }}
            className="mx-auto mt-3 max-w-md text-[13px] font-medium leading-relaxed text-slate-600 sm:mt-6 sm:max-w-xl sm:text-xl lg:mx-0"
          >
            Work directly with our design team. A fully bespoke website or a heavily customized template, built exactly how you envision it, on your own domain.
          </motion.p>

          <motion.div
            initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.65, duration: 0.8 }}
            className="mt-4 flex flex-row items-stretch justify-center gap-2 sm:mt-8 sm:items-center sm:gap-4 lg:justify-start"
          >
            <button onClick={() => openModal(null)} className={cn(shine, primaryBtn, "inline-flex flex-1 items-center justify-center gap-1.5 whitespace-nowrap rounded-xl px-3 py-2.5 text-xs font-bold text-white transition-transform hover:scale-[1.03] active:scale-[0.98] sm:flex-none sm:gap-2 sm:px-8 sm:py-4 sm:text-base", focusRing)}>
              Start Your Project <ArrowRight className="h-3.5 w-3.5 sm:h-5 sm:w-5" />
            </button>
            <button onClick={() => jump("crafts")} className={cn("inline-flex flex-1 items-center justify-center whitespace-nowrap rounded-xl px-3 py-2.5 text-xs font-bold text-orange-900 transition-transform hover:scale-[1.02] sm:flex-none sm:px-8 sm:py-4 sm:text-base", peachPill, focusRing)}>
              Explore the two crafts
            </button>
          </motion.div>

          <motion.ul
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.9 }}
            className="mt-4 flex flex-wrap justify-center gap-x-4 gap-y-1.5 text-[11px] font-semibold text-slate-700 sm:mt-9 sm:gap-x-7 sm:gap-y-3 sm:text-sm lg:justify-start"
          >
            <li className="flex items-center gap-1.5 sm:gap-2"><Clock className="h-3.5 w-3.5 text-orange-600 sm:h-4 sm:w-4" /> Delivered in 3–14 days</li>
            <li className="flex items-center gap-1.5 sm:gap-2"><Globe className="h-3.5 w-3.5 text-orange-600 sm:h-4 sm:w-4" /> Domain setup handled</li>
            <li className="flex items-center gap-1.5 sm:gap-2"><RefreshCcw className="h-3.5 w-3.5 text-orange-600 sm:h-4 sm:w-4" /> 2 rounds of revisions</li>
          </motion.ul>
        </div>

        <div className="mx-auto mt-1 w-full max-w-xl sm:mt-0 lg:col-span-5 lg:max-w-none lg:self-stretch">
          <Card tone="sun" max={5} pad="p-2.5 sm:p-4" className="rounded-[1.5rem] sm:rounded-[2.5rem] lg:h-full">
            <RevealPic
              src="/craft-hero-scene.png"
              priority
              sizes="(min-width:1024px) 900px, 100vw"
              className="aspect-[16/10] rounded-[1.15rem] shadow-[0_24px_50px_-20px_rgba(120,40,0,0.6)] ring-1 ring-white/40 sm:aspect-[4/3] sm:rounded-[2rem] lg:aspect-auto lg:h-full"
            >
              <HeroVideo reduce={reduce} />
              <Float reduce={reduce} className="left-2.5 top-2.5 sm:left-5 sm:top-5">
                <span className="flex items-center gap-2 rounded-full bg-[#11162a] px-3 py-1.5 text-[10px] font-bold text-white shadow-xl sm:px-3.5 sm:py-2 sm:text-xs">
                  <Link2 className="h-3 w-3 text-orange-400 sm:h-3.5 sm:w-3.5" /> Your own domain
                </span>
              </Float>
              <Float reduce={reduce} delay={1} className="bottom-3 left-2.5 sm:bottom-6 sm:left-5">
                <span className="flex items-center gap-2 rounded-full bg-orange-500 px-3 py-1.5 text-[10px] font-bold text-white shadow-xl sm:px-3.5 sm:py-2 sm:text-xs">
                  <CalendarHeart className="h-3 w-3 sm:h-3.5 sm:w-3.5" /> RSVP built in
                </span>
              </Float>
              <Float reduce={reduce} delay={2} className="right-2.5 top-1/2 sm:right-5">
                <span className={cn("flex items-center gap-2 rounded-full px-3 py-1.5 text-[10px] font-bold text-orange-900 shadow-xl sm:px-3.5 sm:py-2 sm:text-xs", peachPill)}>
                  <RefreshCcw className="h-3 w-3 text-orange-600 sm:h-3.5 sm:w-3.5" /> 2 revisions
                </span>
              </Float>
            </RevealPic>
          </Card>
        </div>
      </section>

      {/* ========================== EVENT TYPES ========================== */}
      <section aria-label="Events we design for" className="pb-6 pt-4 sm:pb-10 sm:pt-6">
        <Marquee reduce={reduce} />
      </section>

      {/* ========================== THE TWO CRAFTS ========================== */}
      <section id="crafts" className="scroll-mt-20 px-4 py-16 sm:px-6 sm:py-24 lg:px-8">
        <div className="mx-auto max-w-7xl">
          <SectionHead
            eyebrow="Choose your craft"
            title="Two ways to stand out"
            sub="Every project is priced according to what you need. Pick the one that fits and tell us about your event."
          />
          <div className="flex flex-col gap-8 sm:gap-10">
            {SERVICES.map((s, i) => (
              <ServiceCard key={s.key} s={s} index={i} onOpen={openModal} onJump={jump} reduce={reduce} />
            ))}
          </div>
        </div>
      </section>

      {/* ========================== COMPARE ========================== */}
      <section className="px-4 pb-16 sm:px-6 sm:pb-24 lg:px-8">
        <div className="mx-auto max-w-5xl">
          <Card tone="dark" max={1.5} pad="p-5 sm:p-8 lg:p-10" className="rounded-[1.75rem] sm:rounded-[2.5rem]">
            <h3 className="mb-6 font-[family-name:var(--font-display)] text-2xl font-extrabold text-white sm:text-3xl">Side by side</h3>
            <div className="hidden grid-cols-[1.1fr_1fr_1fr] gap-4 border-b border-white/10 pb-3 text-sm font-bold sm:grid">
              <span className="text-slate-400">Compare</span>
              <span className="text-white">Crafted Template</span>
              <span className="text-orange-300">Crafted Website</span>
            </div>
            {COMPARE.map((r, i) => (
              <motion.div
                key={r.label}
                initial={reduce ? false : { opacity: 0, x: -14 }}
                whileInView={{ opacity: 1, x: 0 }}
                viewport={{ once: true, amount: 0.5 }}
                transition={{ duration: 0.5, ease: EASE, delay: i * 0.05 }}
                className="grid grid-cols-2 gap-x-4 gap-y-2 border-b border-white/10 py-4 text-sm last:border-0 sm:grid-cols-[1.1fr_1fr_1fr] sm:items-center"
              >
                <span className="col-span-2 font-bold text-orange-200 sm:col-span-1 sm:text-slate-100">{r.label}</span>
                <span className="flex flex-col gap-1 sm:block">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 sm:hidden">Template</span>
                  <Cell v={r.template} tone="tpl" />
                </span>
                <span className="flex flex-col gap-1 sm:block">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-orange-300 sm:hidden">Website</span>
                  <Cell v={r.website} tone="web" />
                </span>
              </motion.div>
            ))}
          </Card>
        </div>
      </section>

      {/* ========================== PROCESS ========================== */}
      <section id="process" className="scroll-mt-20 px-4 py-16 sm:px-6 sm:py-24 lg:px-8">
        <div className="mx-auto max-w-7xl">
          <SectionHead eyebrow="The process" title="How we craft it." sub="A seamless journey from your vision to the final launch." />
          <div className="grid gap-8 lg:grid-cols-12 lg:items-start lg:gap-10">
            <div className="lg:sticky lg:top-24 lg:col-span-5">
              <Card tone="sun" tilt={false} pad="p-3 sm:p-4" className="rounded-[1.75rem] sm:rounded-[2.5rem]">
                <RevealPic
                  src="/craft-process-studio.png"
                  sizes="(min-width:1024px) 960px, 100vw"
                  className="aspect-[4/5] rounded-[1.25rem] shadow-[0_24px_50px_-20px_rgba(120,40,0,0.6)] ring-1 ring-white/40 sm:rounded-[1.75rem]"
                >
                  <RiseIn className="absolute inset-x-3 bottom-3 z-10 sm:inset-x-4 sm:bottom-4">
                    <div className="rounded-2xl bg-[#11162a] p-4 shadow-2xl">
                      <p className="font-[family-name:var(--font-display)] text-lg font-bold text-white">We work directly with you</p>
                      <p className="mt-1 text-sm font-medium text-slate-300">From the first call to the final launch.</p>
                    </div>
                  </RiseIn>
                </RevealPic>
              </Card>
            </div>

            <ol className="space-y-5 lg:col-span-7">
              {PROCESS_STEPS.map((step, i) => (
                <Step key={step.title} step={step} i={i} last={i === PROCESS_STEPS.length - 1} reduce={reduce} />
              ))}
            </ol>
          </div>
        </div>
      </section>

      {/* ========================== INCLUDED ========================== */}
      <section className="px-4 py-16 sm:px-6 sm:py-24 lg:px-8">
        <div className="mx-auto max-w-7xl">
          <SectionHead eyebrow="What you get" title="Everything handled." />
          <div className="grid gap-5 lg:grid-cols-12 lg:gap-6">
            <DomainTile reduce={reduce} />
            <RsvpTile />
            {SMALL_TILES.map((it, i) => {
              const t = TXT[it.tone];
              return (
                <Card key={it.title} tone={it.tone} delay={i * 0.07} max={6} pad="p-6 sm:p-7" className="rounded-[1.75rem] lg:col-span-3">
                  <div className={cn("mb-5 flex h-12 w-12 items-center justify-center rounded-2xl shadow-lg transition-transform duration-500 group-hover:rotate-6 group-hover:scale-110", t.icon)}>
                    <it.icon className="h-6 w-6" />
                  </div>
                  <h4 className={cn("mb-2 font-[family-name:var(--font-display)] text-xl font-bold", t.h)}>{it.title}</h4>
                  <p className={cn("text-sm font-medium leading-relaxed sm:text-[15px]", t.p)}>{it.desc}</p>
                </Card>
              );
            })}
          </div>
        </div>
      </section>

      {/* ========================== FAQ ========================== */}
      <section className="px-4 py-16 sm:px-6 sm:py-24 lg:px-8">
        <div className="mx-auto max-w-3xl">
          <SectionHead eyebrow="FAQ" title="Questions?" />
          <Card tone="paper" max={1.5} pad="px-5 py-1 sm:px-9" className="rounded-[1.75rem] sm:rounded-[2.5rem]">
            {FAQS.map((f) => <FaqItem key={f.q} q={f.q} a={f.a} />)}
          </Card>
        </div>
      </section>

      {/* ========================== FINAL CTA ========================== */}
      <section className="px-4 pb-20 pt-6 sm:px-6 sm:pb-32 lg:px-8">
        <div className="mx-auto max-w-6xl">
          <Card tone="sun" tilt={false} pad="p-4 sm:p-6 lg:p-8" className="rounded-[1.75rem] sm:rounded-[2.5rem]">
            <div className="grid items-center gap-6 md:grid-cols-2 md:gap-10">
              <div className="px-1 text-center md:px-4 md:text-left">
                <h2 className="font-[family-name:var(--font-display)] text-[2.2rem] font-extrabold leading-[1.05] tracking-tighter sm:text-5xl lg:text-6xl">
                  Ready to stand out?
                </h2>
                <p className="mx-auto mt-4 max-w-md text-base font-semibold text-white sm:text-lg md:mx-0">
                  Let&apos;s build something your guests will never forget.
                </p>
                <button
                  onClick={() => openModal(null)}
                  className={cn(shine, "mt-8 inline-flex items-center justify-center gap-2 rounded-xl bg-white px-9 py-4 text-base font-bold text-orange-600 shadow-xl transition-transform hover:scale-[1.03] active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white focus-visible:ring-offset-2 focus-visible:ring-offset-orange-500")}
                >
                  Start Your Project <ArrowRight className="h-5 w-5" />
                </button>
                <p className="mt-4 text-sm font-semibold text-white">Share your idea and it goes straight to our team on WhatsApp.</p>
              </div>
              <RevealPic
                src="/craft-cta-celebration.png"
                sizes="(min-width:768px) 900px, 100vw"
                className="aspect-[4/3] rounded-[1.25rem] shadow-[0_24px_50px_-20px_rgba(120,40,0,0.6)] ring-1 ring-white/40 sm:rounded-[1.75rem]"
              />
            </div>
          </Card>
        </div>
      </section>

      {/* Mobile CTA bar: appears after the hero */}
      <AnimatePresence>
        {showBar && !isModalOpen && (
          <motion.div
            initial={{ y: 90, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: 90, opacity: 0 }}
            transition={{ duration: 0.4, ease: EASE }}
            className="fixed inset-x-4 bottom-4 z-40 md:hidden"
          >
            <button onClick={() => openModal(null)} className={cn(shine, primaryBtn, "flex w-full items-center justify-center gap-2 rounded-2xl py-4 text-sm font-bold text-white", focusRing)}>
              Start Your Project <ArrowRight className="h-4 w-4" />
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      <CraftModal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} initialService={initialService} />
    </div>
  );
}