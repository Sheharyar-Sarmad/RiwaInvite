"use client";

import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  type PointerEvent as ReactPointerEvent,
  type ReactNode,
} from "react";
import Image from "next/image";
import {
  motion,
  useInView,
  useMotionTemplate,
  useMotionValue,
  useReducedMotion,
  useSpring,
  useTransform,
  type Variants,
} from "framer-motion";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { Canvas, useFrame } from "@react-three/fiber";
import * as THREE from "three";
import {
  AlertTriangle,
  ArrowRight,
  CalendarX,
  Check,
  MapPin,
  RefreshCcw,
  TreePine,
  Wallet,
  XCircle,
  type LucideIcon,
} from "lucide-react";

if (typeof window !== "undefined") {
  gsap.registerPlugin(ScrollTrigger);
  ScrollTrigger.config({ ignoreMobileResize: true });
}

const EASE = [0.16, 1, 0.3, 1] as const;
const MAX_TILT = 8;
const DUST_COUNT = 100;
const DISPLAY = "font-[family-name:var(--font-display)]";
const BODY = "font-[family-name:var(--font-body)]";
const cn = (...c: (string | false | undefined | null)[]) =>
  c.filter(Boolean).join(" ");
const pad = (n: number) => String(n).padStart(2, "0");

/**
 * The section is ALWAYS pinned for exactly one screen (100svh) on every
 * device. Vertical scroll drives the cards sideways inside the pinned
 * screen, so the page itself never scrolls horizontally and the whole
 * component never moves while the cards are travelling.
 * DESKTOP only changes the layout (video left, cards right) and adds tilt.
 */
const DESKTOP_QUERY = "(min-width: 1024px)";

const SPOTLIGHT_MASK =
  "radial-gradient(230px circle at var(--mx,-999px) var(--my,-999px), #000 0%, transparent 100%)";

const GRAIN =
  "url(\"data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='180' height='180'><filter id='n'><feTurbulence type='fractalNoise' baseFrequency='0.85' numOctaves='2' stitchTiles='stitch'/><feColorMatrix values='0 0 0 0 0.45 0 0 0 0 0.2 0 0 0 0 0.05 0 0 0 0.5 0'/></filter><rect width='100%' height='100%' filter='url(%23n)'/></svg>\")";

const lineParent: Variants = {
  hidden: {},
  show: { transition: { staggerChildren: 0.12, delayChildren: 0.1 } },
};
const lineChild: Variants = {
  hidden: { y: "115%", rotate: 3 },
  show: { y: 0, rotate: 0, transition: { duration: 0.95, ease: EASE } },
};

type Tone = "dark" | "paper" | "sun";

type Flaw = {
  icon: LucideIcon;
  title: string;
  desc: string;
  fix: string;
  img: string;
  tone: Tone;
};

const FLAWS: Flaw[] = [
  {
    icon: Wallet,
    title: "The Cost of Paper",
    desc: "High-end embossed invitations, wax seals, and premium envelopes cost a fortune. And that's before you add the price of postage.",
    fix: "No printing. No postage.",
    img: "/ethos-paper-stack.png",
    tone: "paper",
  },
  {
    icon: RefreshCcw,
    title: "Zero Flexibility",
    desc: "Once the ink is on the paper, it's final. If the venue changes, the time shifts, or you misspell a name, you have to pay to reprint everything.",
    fix: "Edit anytime, instantly.",
    img: "/why-rsvp.png",
    tone: "dark",
  },
  {
    icon: CalendarX,
    title: "The Deadline Trap",
    desc: "Printers require 3-4 weeks lead time. If you're planning an event quickly, paper invitations become a logistical nightmare.",
    fix: "Live and shared in minutes.",
    img: "/why-builder.png",
    tone: "paper",
  },
  {
    icon: TreePine,
    title: "Environmental Devastation",
    desc: "The paper industry is a leading driver of deforestation. Millions of trees are cut down every year just for event invitations that end up in the trash.",
    fix: "Zero paper. Zero waste.",
    img: "/ethos-green-tree.png",
    tone: "dark",
  },
  {
    icon: MapPin,
    title: "No Updates or Maps",
    desc: "Can't find the venue? Want to add a map link? With paper, you can't. Your guests are left guessing and getting lost.",
    fix: "Map links built in.",
    img: "/why-slugs.png",
    tone: "paper",
  },
  {
    icon: AlertTriangle,
    title: "No Tracking or RSVPs",
    desc: "How many guests are actually coming? Paper invitations leave you blind. You're forced to chase people down over the phone to get a headcount.",
    fix: "Real-time RSVPs.",
    img: "/how-step-4.png",
    tone: "dark",
  },
];

const CHAPTERS = ["The reality", ...FLAWS.map((f) => f.title), "A better way"];

function Dust() {
  const geo = useRef<THREE.BufferGeometry>(null);
  const group = useRef<THREE.Group>(null);

  const { positions, speeds, phases } = useMemo(() => {
    const p = new Float32Array(DUST_COUNT * 3);
    const s = new Float32Array(DUST_COUNT);
    const ph = new Float32Array(DUST_COUNT);
    for (let i = 0; i < DUST_COUNT; i++) {
      p[i * 3] = (Math.random() - 0.5) * 16;
      p[i * 3 + 1] = (Math.random() - 0.5) * 9;
      p[i * 3 + 2] = (Math.random() - 0.5) * 6;
      s[i] = 0.08 + Math.random() * 0.2;
      ph[i] = Math.random() * Math.PI * 2;
    }
    return { positions: p, speeds: s, phases: ph };
  }, []);

  const sprite = useMemo(() => {
    const c = document.createElement("canvas");
    c.width = c.height = 64;
    const ctx = c.getContext("2d");
    if (ctx) {
      const g = ctx.createRadialGradient(32, 32, 0, 32, 32, 32);
      g.addColorStop(0, "rgba(255,255,255,1)");
      g.addColorStop(0.4, "rgba(255,255,255,0.7)");
      g.addColorStop(1, "rgba(255,255,255,0)");
      ctx.fillStyle = g;
      ctx.fillRect(0, 0, 64, 64);
    }
    return new THREE.CanvasTexture(c);
  }, []);

  useEffect(() => () => sprite.dispose(), [sprite]);

  useFrame((state, delta) => {
    const attr = geo.current?.attributes.position as
      | THREE.BufferAttribute
      | undefined;
    if (!attr) return;
    const dt = Math.min(delta, 0.05);
    const t = state.clock.elapsedTime;
    const arr = attr.array as Float32Array;
    for (let i = 0; i < DUST_COUNT; i++) {
      arr[i * 3 + 1] += speeds[i] * dt;
      arr[i * 3] += Math.sin(t * 0.45 + phases[i]) * 0.0016;
      if (arr[i * 3 + 1] > 4.6) arr[i * 3 + 1] = -4.6;
    }
    attr.needsUpdate = true;
    if (group.current) {
      group.current.rotation.y = Math.sin(t * 0.12) * 0.12;
      group.current.rotation.x = Math.cos(t * 0.1) * 0.05;
    }
  });

  return (
    <group ref={group}>
      <points>
        <bufferGeometry ref={geo}>
          <bufferAttribute attach="attributes-position" args={[positions, 3]} />
        </bufferGeometry>
        <pointsMaterial
          map={sprite}
          color="#ea580c"
          size={0.12}
          sizeAttenuation
          transparent
          opacity={0.6}
          depthWrite={false}
        />
      </points>
    </group>
  );
}

function DustField({ paused }: { paused: boolean }) {
  const ref = useRef<HTMLDivElement>(null);
  const inView = useInView(ref);
  return (
    <div
      ref={ref}
      aria-hidden
      className="pointer-events-none absolute inset-0 z-[1] opacity-70"
    >
      <Canvas
        dpr={[1, 1.5]}
        camera={{ position: [0, 0, 7], fov: 55 }}
        gl={{ alpha: true, antialias: false, powerPreference: "low-power" }}
        frameloop={inView && !paused ? "always" : "never"}
      >
        <Dust />
      </Canvas>
    </div>
  );
}

function Backdrop({ spotlight }: { spotlight: boolean }) {
  return (
    <div aria-hidden className="pointer-events-none absolute inset-0 z-0">
      <div className="absolute inset-0 bg-gradient-to-r from-[#fff4ea] via-[#fdeadb] to-[#fbdcc0]" />
      <div className="absolute -left-32 top-10 h-[420px] w-[420px] rounded-full bg-orange-300/30 blur-[120px]" />
      <div className="absolute -right-32 bottom-0 h-[420px] w-[420px] rounded-full bg-amber-300/30 blur-[120px]" />
      <div
        className="absolute inset-0"
        style={{
          backgroundImage:
            "radial-gradient(circle, rgba(194,65,12,0.2) 1.5px, transparent 1.5px)",
          backgroundSize: "24px 24px",
        }}
      />
      {spotlight && (
        <div
          className="absolute inset-0 hidden lg:block"
          style={{
            backgroundImage:
              "radial-gradient(circle, rgba(234,88,12,0.95) 2px, transparent 2px)",
            backgroundSize: "24px 24px",
            maskImage: SPOTLIGHT_MASK,
            WebkitMaskImage: SPOTLIGHT_MASK,
          }}
        />
      )}
    </div>
  );
}

const BG: Record<Tone, string> = {
  dark: "radial-gradient(90% 70% at 100% 0%, rgba(249,115,22,0.28), transparent 60%), radial-gradient(70% 60% at 0% 100%, rgba(99,102,241,0.25), transparent 60%), linear-gradient(160deg, #1b2249 0%, #0a0e1f 100%)",
  paper:
    "radial-gradient(80% 60% at 0% 0%, rgba(255,255,255,0.75), transparent 60%), radial-gradient(70% 60% at 100% 100%, rgba(249,115,22,0.22), transparent 60%), linear-gradient(160deg, rgba(255,255,255,0.5) 0%, rgba(255,207,164,0.32) 100%)",
  sun: "radial-gradient(70% 60% at 100% 0%, rgba(255,255,255,0.38), transparent 60%), radial-gradient(60% 60% at 0% 100%, rgba(190,60,0,0.38), transparent 60%), linear-gradient(135deg, #f97316 0%, #fb923c 60%, #fbbf24 100%)",
};

const SHELL: Record<Tone, string> = {
  dark: "text-slate-50 shadow-[0_30px_60px_-28px_rgba(10,14,31,0.9)] hover:shadow-[0_40px_70px_-26px_rgba(249,115,22,0.5)]",
  paper:
    "text-slate-900 shadow-[0_24px_50px_-26px_rgba(154,52,18,0.55)] hover:shadow-[0_36px_65px_-26px_rgba(154,52,18,0.6)]",
  sun: "text-white shadow-[0_30px_60px_-26px_rgba(234,88,12,0.9)] hover:shadow-[0_40px_70px_-26px_rgba(234,88,12,1)]",
};

const EDGE: Record<Tone, string> = {
  dark: "border-white/10",
  paper: "border-white/60",
  sun: "border-white/30",
};

const GLARE: Record<Tone, string> = {
  dark: "rgba(251,146,60,0.3)",
  paper: "rgba(255,255,255,0.8)",
  sun: "rgba(255,255,255,0.5)",
};

function TiltCard({
  tone,
  tilt,
  className,
  children,
}: {
  tone: Tone;
  tilt: boolean;
  className?: string;
  children: ReactNode;
}) {
  const px = useMotionValue(0);
  const py = useMotionValue(0);
  const sx = useSpring(px, { stiffness: 170, damping: 20, mass: 0.6 });
  const sy = useSpring(py, { stiffness: 170, damping: 20, mass: 0.6 });
  const rotateY = useTransform(sx, [-0.5, 0.5], [-MAX_TILT, MAX_TILT]);
  const rotateX = useTransform(sy, [-0.5, 0.5], [MAX_TILT, -MAX_TILT]);
  const gx = useTransform(sx, [-0.5, 0.5], ["0%", "100%"]);
  const gy = useTransform(sy, [-0.5, 0.5], ["0%", "100%"]);
  const sheenX = useTransform(sx, [-0.5, 0.5], ["85%", "15%"]);
  const glare = useMotionTemplate`radial-gradient(380px circle at ${gx} ${gy}, ${GLARE[tone]}, transparent 65%)`;
  const glareOpacity = useSpring(0, { stiffness: 180, damping: 26 });

  const onMove = (e: ReactPointerEvent<HTMLDivElement>) => {
    if (e.pointerType !== "mouse") return;
    const r = e.currentTarget.getBoundingClientRect();
    px.set((e.clientX - r.left) / r.width - 0.5);
    py.set((e.clientY - r.top) / r.height - 0.5);
  };

  return (
    <motion.div
      onPointerMove={tilt ? onMove : undefined}
      onPointerEnter={
        tilt
          ? (e) => {
              if (e.pointerType === "mouse") glareOpacity.set(1);
            }
          : undefined
      }
      onPointerLeave={
        tilt
          ? () => {
              px.set(0);
              py.set(0);
              glareOpacity.set(0);
            }
          : undefined
      }
      whileHover={tilt ? { y: -6 } : undefined}
      transition={{ type: "spring", stiffness: 260, damping: 24 }}
      style={
        tilt
          ? {
              rotateX,
              rotateY,
              transformPerspective: 1100,
              transformStyle: "preserve-3d",
            }
          : undefined
      }
      className={cn(
        "group relative rounded-[1.5rem] transition-shadow duration-500 sm:rounded-[1.75rem]",
        SHELL[tone],
        className,
      )}
    >
      <div
        aria-hidden
        className={cn(
          "pointer-events-none absolute inset-0 overflow-hidden rounded-[inherit] border backdrop-blur-xl",
          EDGE[tone],
        )}
        style={{ backgroundImage: BG[tone] }}
      >
        <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-white/70 to-transparent" />
        {tilt && (
          <>
            <motion.div
              className="absolute inset-0"
              style={{
                opacity: glareOpacity,
                backgroundImage:
                  "linear-gradient(115deg, transparent 38%, rgba(255,255,255,0.22) 48%, transparent 58%)",
                backgroundSize: "300% 100%",
                backgroundPositionX: sheenX,
              }}
            />
            <motion.div
              className="absolute inset-0"
              style={{ opacity: glareOpacity, backgroundImage: glare }}
            />
          </>
        )}
      </div>
      <div
        className="relative flex h-full min-h-0 flex-col overflow-hidden rounded-[inherit] p-3.5 sm:p-5"
        style={tilt ? { transform: "translateZ(24px)" } : undefined}
      >
        {children}
      </div>
    </motion.div>
  );
}

function FlawBody({ flaw }: { flaw: Flaw }) {
  const Icon = flaw.icon;
  const dark = flaw.tone === "dark";
  return (
    <>
      <div className="order-1 flex items-center gap-3">
        <div
          className={cn(
            "flex h-9 w-9 shrink-0 items-center justify-center rounded-xl shadow-sm ring-1 sm:h-10 sm:w-10",
            dark ? "bg-white/10 ring-white/15" : "bg-white ring-black/5",
          )}
        >
          <Icon
            className={cn(
              "h-[18px] w-[18px] sm:h-5 sm:w-5",
              dark ? "text-orange-300" : "text-[#f97316]",
            )}
          />
        </div>
        <h3
          className={cn(
            DISPLAY,
            "text-base font-bold leading-tight tracking-tight sm:text-lg xl:text-[1.25rem]",
          )}
        >
          {flaw.title}
        </h3>
      </div>
      <p
        className={cn(
          BODY,
          "order-2 mt-2 text-[12px] font-medium leading-snug sm:text-[12.5px] sm:leading-relaxed",
          dark ? "text-slate-300" : "text-slate-700",
        )}
      >
        {flaw.desc}
      </p>

      <div className="order-3 pt-2.5 sm:pt-3">
        <span
          className={cn(
            "inline-flex w-fit shrink-0 items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-bold ring-1",
            dark
              ? "bg-emerald-400/15 text-emerald-300 ring-emerald-300/25"
              : "bg-emerald-500/15 text-emerald-700 ring-emerald-600/20",
          )}
        >
          <Check className="h-3.5 w-3.5" strokeWidth={3} /> {flaw.fix}
        </span>
      </div>

      {/* Image takes all the remaining space; reserved up front so nothing shifts */}
      <div className="relative order-4 mt-2.5 min-h-[110px] flex-1 overflow-hidden rounded-2xl ring-1 ring-black/10 sm:mt-3">
        <div className="h-parallax absolute inset-y-0 inset-x-[-12%]">
          <Image
            src={flaw.img}
            alt=""
            fill
            sizes="(max-width: 640px) 80vw, 420px"
            loading="eager"
            className="object-cover transition-transform duration-700 group-hover:scale-[1.06]"
          />
        </div>
        <div
          aria-hidden
          className="absolute inset-0 bg-gradient-to-t from-black/45 via-transparent to-transparent"
        />
      </div>
    </>
  );
}

function CtaBody() {
  return (
    <div className="flex h-full min-h-0 flex-col justify-between gap-3">
      <div>
        <h3
          className={cn(
            DISPLAY,
            "text-2xl font-extrabold leading-[1.05] tracking-tighter sm:text-3xl lg:text-4xl",
          )}
        >
          There is a better way.
        </h3>
        <p
          className={cn(
            BODY,
            "mt-2 max-w-md text-[13px] font-medium leading-relaxed text-white/90 sm:text-[15px]",
          )}
        >
          Six flaws, six fixes. Riwainvite replaces the broken system with
          something your guests will actually enjoy.
        </p>
      </div>
      <ul className="grid grid-cols-1 gap-x-4 gap-y-1.5 text-[12px] font-semibold sm:grid-cols-2 sm:text-[12.5px]">
        {FLAWS.map((f) => (
          <li key={f.title} className="flex items-center gap-2">
            <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-white text-orange-600">
              <Check className="h-3 w-3" strokeWidth={3.5} />
            </span>
            {f.fix}
          </li>
        ))}
      </ul>
      <a
        href="#why-riwainvite"
        className="group/btn inline-flex w-fit items-center gap-2 rounded-full bg-white px-5 py-2.5 text-sm font-bold text-orange-700 shadow-xl shadow-orange-900/30 transition-transform hover:scale-[1.03] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white focus-visible:ring-offset-2 focus-visible:ring-offset-orange-500"
      >
        See how Riwainvite fixes it{" "}
        <ArrowRight className="h-4 w-4 transition-transform group-hover/btn:translate-x-1" />
      </a>
    </div>
  );
}

function VisualPair({ reduce }: { reduce: boolean }) {
  const videoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    const v = videoRef.current;
    if (!v) return;
    v.muted = true;
    if (reduce) v.pause();
    else v.play().catch(() => {});
  }, [reduce]);

  return (
    <div className="relative isolate flex h-full w-full items-center justify-center">
      <div
        aria-hidden
        className="absolute -inset-3 -z-10 rounded-[2.5rem] bg-gradient-to-br from-orange-400/30 to-red-400/20 blur-2xl lg:-inset-5 lg:rounded-[3rem]"
      />
      <div className="relative h-full w-full overflow-hidden rounded-[1.25rem] border border-white/60 bg-white/40 p-1 shadow-[0_30px_70px_-30px_rgba(154,52,18,0.55)] backdrop-blur-xl sm:rounded-[2.25rem] sm:p-2 lg:p-2.5">
        <div className="h-vid relative h-full w-full overflow-hidden rounded-[1rem] border-2 border-white/70 bg-black shadow-xl sm:rounded-[1.8rem]">
          <video
            ref={videoRef}
            src="/the-paper-problem.mp4"
            poster="/ethos-paper-stack.png"
            autoPlay={!reduce}
            muted
            loop
            playsInline
            preload="metadata"
            className="absolute inset-0 h-full w-full object-cover"
          />
        </div>
      </div>
    </div>
  );
}

function HeaderBlock({ className }: { className?: string }) {
  const badgeClass =
    "mb-2 inline-flex items-center gap-1.5 rounded-full border border-orange-300/60 bg-white/70 px-3 py-1 text-[11px] font-bold tracking-wide text-orange-700 shadow-sm backdrop-blur-md sm:gap-2 sm:px-4 sm:py-1.5 sm:text-xs";
  const h2Class = cn(
    DISPLAY,
    "font-extrabold leading-[1.08] tracking-tight text-gray-900 text-[length:clamp(1.25rem,5.4vw,2.6rem)] lg:text-[length:clamp(1.5rem,min(5vh,6vw),3.4rem)]",
  );
  const accent =
    "inline-block bg-gradient-to-r from-[#f97316] to-red-500 bg-clip-text pb-[0.12em] text-transparent";

  return (
    <header className={className}>
      <motion.span
        initial={{ opacity: 0, y: -14 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true }}
        transition={{ duration: 0.7, ease: EASE }}
        className={badgeClass}
      >
        <XCircle className="h-4 w-4" /> The Old Way is Broken
      </motion.span>
      <motion.h2
        id="paper-problem-heading"
        variants={lineParent}
        initial="hidden"
        whileInView="show"
        viewport={{ once: true, amount: 0.4 }}
        className={h2Class}
      >
        <span className="block overflow-hidden">
          <motion.span
            variants={lineChild}
            className="inline-block origin-bottom-left"
          >
            Why is the industry
          </motion.span>
        </span>
        <span className="block overflow-hidden">
          <motion.span
            variants={lineChild}
            className={cn(accent, "origin-bottom-left")}
          >
            stuck in the past?
          </motion.span>
        </span>
      </motion.h2>
    </header>
  );
}

export function ThePaperProblem() {
  const prefersReduced = useReducedMotion();
  const [reduce, setReduce] = useState(false);
  useEffect(() => {
    setReduce(!!prefersReduced);
  }, [prefersReduced]);

  // Layout only: desktop = video left / cards right. Pinning is on everywhere.
  const [desktop, setDesktop] = useState(false);
  useLayoutEffect(() => {
    const mq = window.matchMedia(DESKTOP_QUERY);
    const set = () => setDesktop(mq.matches);
    set();
    mq.addEventListener("change", set);
    return () => mq.removeEventListener("change", set);
  }, []);

  const sectionRef = useRef<HTMLElement>(null);
  const trackRef = useRef<HTMLDivElement>(null);
  const rightPanelRef = useRef<HTMLDivElement>(null);
  const barRef = useRef<HTMLDivElement>(null);
  const counterRef = useRef<HTMLSpanElement>(null);
  const chapterRef = useRef<HTMLParagraphElement>(null);
  const raf = useRef(0);

  const onMove = useCallback((e: ReactPointerEvent<HTMLElement>) => {
    if (e.pointerType !== "mouse") return;
    const { clientX, clientY } = e;
    cancelAnimationFrame(raf.current);
    raf.current = requestAnimationFrame(() => {
      const el = sectionRef.current;
      if (!el) return;
      const r = el.getBoundingClientRect();
      el.style.setProperty("--mx", `${clientX - r.left}px`);
      el.style.setProperty("--my", `${clientY - r.top}px`);
    });
  }, []);

  useEffect(() => () => cancelAnimationFrame(raf.current), []);

  // ---------- Pinned horizontal scroll (GSAP), desktop AND mobile ----------
  useLayoutEffect(() => {
    const section = sectionRef.current;
    const track = trackRef.current;
    const rightPanel = rightPanelRef.current;
    if (!section || !track || !rightPanel) return;

    const ctx = gsap.context(() => {
      const panels = gsap.utils.toArray<HTMLElement>(".h-panel", track);
      const distance = () =>
        Math.max(0, track.scrollWidth - rightPanel.offsetWidth);

      // Intro reveal (created first so it never affects pin offsets)
      gsap
        .timeline({
          defaults: { ease: "power3.out", duration: 1.1 },
          scrollTrigger: { trigger: section, start: "top 80%", once: true },
        })
        .from(".h-vid", { y: 40, opacity: 0, scale: 0.96 })
        .from(
          ".h-intro > *",
          { y: 36, opacity: 0, stagger: 0.12, duration: 0.9 },
          "-=0.7",
        );

      let lastIdx = -1;
      const hud = () => {
        const x = Number(gsap.getProperty(track, "x")) || 0;
        const d = distance();
        const p = d > 0 ? Math.min(1, Math.max(0, -x / d)) : 0;
        if (barRef.current) barRef.current.style.transform = `scaleX(${p})`;

        const rect = rightPanel.getBoundingClientRect();
        const mid = rect.left + rect.width / 2;
        let best = 0;
        let bestDist = Infinity;
        panels.forEach((el, i) => {
          const center = rect.left + el.offsetLeft + el.offsetWidth / 2 + x;
          const dist = Math.abs(center - mid);
          if (dist < bestDist) {
            bestDist = dist;
            best = i;
          }
        });
        if (d > 0 && p >= 0.985) best = panels.length - 1;
        if (best !== lastIdx) {
          lastIdx = best;
          if (counterRef.current)
            counterRef.current.textContent = pad(best + 1);
          if (chapterRef.current) {
            chapterRef.current.textContent =
              CHAPTERS[best + 1] ?? CHAPTERS[CHAPTERS.length - 1];
            gsap.fromTo(
              chapterRef.current,
              { opacity: 0, y: 6 },
              {
                opacity: 1,
                y: 0,
                duration: 0.45,
                ease: "power2.out",
                overwrite: true,
              },
            );
          }
        }
      };

      // Scroll length: a little longer on phones so swipes feel controlled.
      const lengthFactor = desktop ? 1.2 : 1.35;

      const scrollTween = gsap.to(track, {
        x: () => -distance(),
        ease: "none",
        onUpdate: hud,
        scrollTrigger: {
          trigger: section,
          start: "top top",
          end: () => `+=${distance() * lengthFactor}`,
          pin: true,
          pinSpacing: true,
          scrub: reduce ? true : 0.6,
          invalidateOnRefresh: true,
          // no anticipatePin: it is a known cause of the "jump up then down"
        },
      });

      panels.forEach((panel) => {
        const reveal = panel.querySelector<HTMLElement>(".h-reveal");
        if (reveal) {
          gsap.fromTo(
            reveal,
            { opacity: 0, y: 60, scale: 0.95 },
            {
              opacity: 1,
              y: 0,
              scale: 1,
              ease: "power2.out",
              scrollTrigger: {
                trigger: panel,
                containerAnimation: scrollTween,
                start: "left 98%",
                end: "left 62%",
                scrub: true,
              },
            },
          );
        }
        const parallax = panel.querySelector<HTMLElement>(".h-parallax");
        if (parallax && !reduce) {
          gsap.fromTo(
            parallax,
            { xPercent: -8 },
            {
              xPercent: 8,
              ease: "none",
              scrollTrigger: {
                trigger: panel,
                containerAnimation: scrollTween,
                start: "left right",
                end: "right left",
                scrub: true,
              },
            },
          );
        }
      });

      hud();
    }, section);

    // ScrollTrigger already refreshes itself on resize; no manual refresh
    // (manual refreshes on mobile address-bar resize caused scroll jumps).
    return () => {
      ctx.revert();
      gsap.set(track, { clearProps: "transform" });
    };
  }, [desktop, reduce]);

  const tilt = desktop && !reduce;

  return (
    <section
      ref={sectionRef}
      onPointerMove={onMove}
      aria-labelledby="paper-problem-heading"
      className="relative isolate z-20 flex h-[100svh] max-h-[100svh] w-full flex-col overflow-hidden bg-[#fdeadb]"
    >
      <Backdrop spotlight />
      <DustField paused={reduce} />

      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 z-[5] opacity-[0.12]"
        style={{ backgroundImage: GRAIN }}
      />
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 z-[6]"
        style={{
          background:
            "radial-gradient(120% 90% at 50% 45%, transparent 55%, rgba(124,45,18,0.16) 100%)",
        }}
      />

      {/* Header + video */}
      <div
        className={cn(
          "relative z-20",
          desktop
            ? "contents"
            : "flex shrink-0 items-center justify-between gap-3 px-4 pb-2 pt-[4.5rem] sm:gap-6 sm:px-8 sm:pt-24",
        )}
      >
        <div
          className={cn(
            "h-intro",
            desktop
              ? "pointer-events-none absolute inset-x-0 top-14 z-20"
              : "min-w-0 flex-1",
          )}
        >
          <HeaderBlock className={desktop ? "text-center" : "text-left"} />
        </div>

        {/* Video: on the left on desktop, small beside the title on mobile */}
        <div
          className={cn(
            desktop
              ? "absolute bottom-14 left-0 top-[7.5rem] z-20 flex w-[40%] items-center justify-center px-10"
              : "relative aspect-[4/5] w-[24%] max-w-[96px] shrink-0 sm:w-[26%] sm:max-w-[150px]",
          )}
        >
          <div
            className={cn(
              desktop ? "relative h-full w-full max-w-md" : "absolute inset-0",
            )}
          >
            <VisualPair reduce={reduce} />
          </div>
        </div>
      </div>

      {/* Cards */}
      <div
        className={cn(
          "relative z-10 flex w-full min-h-0 flex-1 flex-col",
          desktop ? "pb-14 pt-[7.5rem]" : "pb-14 pt-1",
        )}
      >
        <div
          ref={rightPanelRef}
          className={cn(
            "relative min-h-0 flex-1 overflow-hidden [mask-image:linear-gradient(to_right,transparent,black_3%,black_96%,transparent)]",
            desktop ? "ml-[40%] w-[60%]" : "w-full",
          )}
        >
          <div className="absolute inset-0">
            <div
              ref={trackRef}
              className={cn(
                "relative flex h-full w-max will-change-transform",
                desktop
                  ? "items-center gap-6 pl-0 pr-10"
                  : "items-stretch gap-3 py-1 pl-4 pr-6 sm:gap-4 sm:pl-8",
              )}
            >
              {FLAWS.map((f, i) => (
                <div
                  key={f.title}
                  className={cn(
                    "h-panel flex shrink-0",
                    desktop
                      ? cn(
                          "items-center",
                          i % 2 === 0 ? "translate-y-3" : "-translate-y-3",
                        )
                      : "h-full",
                  )}
                >
                  <div className={cn("h-reveal", !desktop && "h-full")}>
                    <TiltCard
                      tone={f.tone}
                      tilt={tilt}
                      className={
                        desktop
                          ? "h-[clamp(370px,58vh,500px)] w-[400px]"
                          : "h-full w-[80vw] max-w-[340px] sm:w-[400px] sm:max-w-none"
                      }
                    >
                      <FlawBody flaw={f} />
                    </TiltCard>
                  </div>
                </div>
              ))}

              <div
                className={cn(
                  "h-panel flex shrink-0",
                  desktop ? "items-center" : "h-full",
                )}
              >
                <div className={cn("h-reveal", !desktop && "h-full")}>
                  <TiltCard
                    tone="sun"
                    tilt={tilt}
                    className={
                      desktop
                        ? "h-[clamp(390px,60vh,520px)] w-[520px]"
                        : "h-full w-[80vw] max-w-[340px] sm:w-[480px] sm:max-w-none"
                    }
                  >
                    <CtaBody />
                  </TiltCard>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Progress HUD */}
      <div
        aria-hidden
        className={cn(
          "pointer-events-none absolute inset-x-0 z-20",
          desktop ? "bottom-4 px-10 pl-[44%]" : "bottom-3 px-6 sm:bottom-4",
        )}
      >
        <div className="mx-auto flex w-full max-w-lg items-center gap-4">
          <span
            ref={counterRef}
            className="w-5 text-xs font-bold tabular-nums text-orange-700"
          >
            01
          </span>
          <div className="relative h-[3px] flex-1 overflow-hidden rounded-full bg-orange-900/10">
            <div
              ref={barRef}
              className="absolute inset-0 origin-left bg-gradient-to-r from-orange-500 to-red-500"
              style={{ transform: "scaleX(0)" }}
            />
          </div>
          <span className="w-5 text-right text-xs font-bold tabular-nums text-orange-900/40">
            {pad(FLAWS.length + 1)}
          </span>
        </div>
        <p
          ref={chapterRef}
          className={cn(
            "mt-1.5 text-xs font-semibold tracking-wide text-orange-900/60",
            desktop ? "pl-[2.5rem] text-left" : "text-center",
          )}
        >
          {CHAPTERS[1]}
        </p>
      </div>
    </section>
  );
}

export default ThePaperProblem;