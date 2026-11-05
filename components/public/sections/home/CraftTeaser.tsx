"use client";

import Link from "next/link";
import Image from "next/image";
import { useRef, useMemo } from "react";
import {
  motion,
  useMotionValue,
  useSpring,
  useTransform,
  useReducedMotion,
  useScroll,
  type MotionValue,
  Variants,
} from "framer-motion";
import { ArrowRight, Sparkles, Check, Wand2, LayoutTemplate } from "lucide-react";

const EASE = [0.16, 1, 0.3, 1] as const;
const focusRing =
  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-500 focus-visible:ring-offset-2 focus-visible:ring-offset-[#fff4ea]";
const primaryBtn =
  "bg-gradient-to-b from-[#fb8a3c] to-[#f97316] shadow-[0_10px_30px_-10px_rgba(249,115,22,0.8),inset_0_1px_0_rgba(255,255,255,0.3)]";

const points = [
  "Bespoke branding & custom domains",
  "Seamless RSVPs & guest tracking built-in",
  "Launch in days, or 100% bespoke",
];

/* ------------------------------------------------------------------ */
/* 1. ANIMATION VARIANTS                                              */
/* ------------------------------------------------------------------ */
const textContainer: Variants = {
  hidden: { opacity: 0 },
  show: { opacity: 1, transition: { staggerChildren: 0.08, delayChildren: 0.1 } },
};

const textWord: Variants = {
  hidden: { opacity: 0, y: 20, filter: "blur(4px)" },
  show: { opacity: 1, y: 0, filter: "blur(0px)", transition: { duration: 0.8, ease: EASE } },
};

const listContainer: Variants = {
  hidden: { opacity: 0 },
  show: { opacity: 1, transition: { staggerChildren: 0.1, delayChildren: 0.4 } },
};

const listItem: Variants = {
  hidden: { opacity: 0, x: -10 },
  show: { opacity: 1, x: 0, transition: { type: "spring", stiffness: 300, damping: 24 } },
};

/* ------------------------------------------------------------------ */
/* 2. SILKY BACKGROUND                                                */
/* ------------------------------------------------------------------ */
function SilkBackground() {
  const reduce = useReducedMotion();
  const drift = (x: number[], y: number[], scale: number[], d: number) =>
    reduce
      ? undefined
      : { 
          x, 
          y, 
          scale,
          transition: { duration: d, repeat: Infinity, repeatType: "mirror" as const, ease: "easeInOut" as const } 
        };

  return (
    <div aria-hidden className="absolute inset-0 -z-10 overflow-hidden bg-gradient-to-br from-[#fff6f0] via-[#ffe9dc] to-[#ffd9c2]">
      <motion.div
        animate={drift([0, -40, 0], [0, 30, 0], [1, 1.1, 1], 16)}
        className="absolute -right-24 -top-24 h-[28rem] w-[28rem] rounded-full bg-[#ff4d6d]/35 blur-3xl"
      />
      <motion.div
        animate={drift([0, 50, 0], [0, -40, 0], [1, 0.9, 1], 18)}
        className="absolute -bottom-32 -left-24 h-[26rem] w-[26rem] rounded-full bg-[#e11d48]/25 blur-3xl"
      />
      <motion.div
        animate={drift([0, 30, 0], [0, 15, 0], [1, 1.05, 1], 14)}
        className="absolute left-1/3 top-[10%] h-64 w-[40rem] -rotate-[10deg] rounded-[100%] bg-gradient-to-r from-transparent via-[#fb7185]/30 to-transparent blur-3xl"
      />
      <motion.div
        animate={drift([0, -50, 0], [0, -20, 0], [1, 1.05, 1], 15)}
        className="absolute -left-1/4 top-[72%] h-[30%] w-[150%] -rotate-[8deg] rounded-[100%] bg-gradient-to-r from-[#f97316]/10 via-[#f59e0b]/70 to-[#ea580c]/80 blur-2xl"
      />
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* 3. MAGNETIC BUTTON WRAPPER                                         */
/* ------------------------------------------------------------------ */
function Magnetic({ children, reduce }: { children: React.ReactNode; reduce: boolean }) {
  const x = useMotionValue(0);
  const y = useMotionValue(0);
  const sx = useSpring(x, { stiffness: 200, damping: 15, mass: 0.2 });
  const sy = useSpring(y, { stiffness: 200, damping: 15, mass: 0.2 });

  const onMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (reduce) return;
    const rect = e.currentTarget.getBoundingClientRect();
    x.set((e.clientX - rect.left - rect.width / 2) * 0.15);
    y.set((e.clientY - rect.top - rect.height / 2) * 0.15);
  };
  const onMouseLeave = () => {
    x.set(0);
    y.set(0);
  };

  return (
    <motion.div style={{ x: sx, y: sy }} onMouseMove={onMouseMove} onMouseLeave={onMouseLeave}>
      {children}
    </motion.div>
  );
}

/* ------------------------------------------------------------------ */
/* 4. TILTING CARD                                                    */
/* ------------------------------------------------------------------ */
function TiltCard({
  src,
  alt,
  rx,
  ry,
  mx,
  my,
  depth,
  className,
  baseRotate,
  float,
  priority,
  scrollY,
  scrollSpeed,
}: {
  src: string;
  alt: string;
  rx: MotionValue<number>;
  ry: MotionValue<number>;
  mx: MotionValue<number>;
  my: MotionValue<number>;
  depth: number;
  className: string;
  baseRotate: number;
  float: number;
  priority?: boolean;
  scrollY: MotionValue<number>;
  scrollSpeed: number;
}) {
  const reduce = useReducedMotion();

  const rotateX = useTransform(rx, (v) => v * depth);
  const rotateY = useTransform(ry, (v) => v * depth);
  const x = useTransform(mx, (v) => v * depth * 22);
  const yMouse = useTransform(my, (v) => v * depth * 22);
  
  // Scroll Parallax
  const yScroll = useTransform(scrollY, [0, 1], [0, scrollSpeed]);
  const y = useTransform([yMouse, yScroll], ([m, s]: number[]) => m + s);

  const glareX = useTransform(mx, [-1, 1], ["0%", "100%"]);
  const glareY = useTransform(my, [-1, 1], ["0%", "100%"]);
  const glare = useTransform(
    [glareX, glareY],
    ([gx, gy]) => `radial-gradient(circle at ${gx} ${gy}, rgba(255,255,255,0.7), transparent 60%)`
  );

  return (
    <motion.div
      style={{ rotateX, rotateY, x, y, rotateZ: baseRotate, transformStyle: "preserve-3d" }}
      className={`absolute ${className}`}
    >
      <motion.div
        animate={reduce ? undefined : { y: [0, -float, 0] }}
        transition={{ duration: 6 + depth * 2, repeat: Infinity, ease: "easeInOut" }}
        whileHover={{ scale: 1.02, transition: { duration: 0.3 } }}
        className="relative aspect-[4/3] w-full overflow-hidden rounded-3xl border border-white/60 bg-white shadow-[0_40px_80px_-20px_rgba(190,60,20,0.55),0_10px_30px_-10px_rgba(0,0,0,0.25)]"
      >
        <Image
          src={src}
          alt={alt}
          fill
          sizes="(min-width: 1024px) 40vw, 90vw"
          className="object-cover"
          priority={priority}
        />
        <motion.div
          aria-hidden
          style={{ background: glare }}
          className="pointer-events-none absolute inset-0 mix-blend-soft-light"
        />
        <div className="pointer-events-none absolute inset-0 rounded-3xl ring-1 ring-inset ring-black/5" />
      </motion.div>
    </motion.div>
  );
}

/* ------------------------------------------------------------------ */
/* 5. MAIN COMPONENT                                                  */
/* ------------------------------------------------------------------ */
export function CraftTeaser() {
  const stageRef = useRef<HTMLDivElement>(null);
  const sectionRef = useRef<HTMLElement>(null);
  const reduce = useReducedMotion() ?? false;

  // Mouse tilt
  const px = useMotionValue(0);
  const py = useMotionValue(0);
  const mx = useSpring(px, { stiffness: 120, damping: 18, mass: 0.6 });
  const my = useSpring(py, { stiffness: 120, damping: 18, mass: 0.6 });

  const rx = useTransform(my, [-1, 1], [14, -14]);
  const ry = useTransform(mx, [-1, 1], [-18, 18]);

  // Scroll parallax
  const { scrollYProgress } = useScroll({
    target: sectionRef,
    offset: ["start end", "end start"],
  });

  // Floating chips parallax
  const chipAx = useTransform(mx, (v) => v * 34);
  const chipAy = useTransform(my, (v) => v * 34);
  const chipBx = useTransform(mx, (v) => v * -34);
  const chipBy = useTransform(my, (v) => v * -34);

  function onMove(e: React.PointerEvent<HTMLDivElement>) {
    if (reduce) return;
    const r = stageRef.current?.getBoundingClientRect();
    if (!r) return;
    px.set(((e.clientX - r.left) / r.width) * 2 - 1);
    py.set(((e.clientY - r.top) / r.height) * 2 - 1);
  }
  function onLeave() {
    px.set(0);
    py.set(0);
  }

  return (
    <section ref={sectionRef} className="relative isolate w-full overflow-hidden py-24 sm:py-32">
      <SilkBackground />

      <div className="relative mx-auto w-full max-w-7xl px-4 sm:px-6 lg:px-12">
        <div className="grid grid-cols-1 items-center gap-16 lg:grid-cols-[1fr_1.15fr]">
          
          {/* ---------------- Left: Copy ---------------- */}
          <motion.div
            initial="hidden"
            whileInView="show"
            viewport={{ once: true, margin: "-100px" }}
            variants={textContainer}
            className="max-w-xl"
          >
            <motion.div variants={textWord}>
              <span className="mb-6 inline-flex items-center gap-2 rounded-full border border-orange-200 bg-white/80 px-4 py-1.5 text-sm font-semibold text-orange-600 shadow-sm backdrop-blur-md">
                <Sparkles className="h-4 w-4" /> The Crafted Collection
              </span>
            </motion.div>

            {/* Exceptional Headline Reveal */}
            <h2 className="font-[family-name:var(--font-display)] text-4xl font-bold tracking-tight sm:text-5xl lg:text-6xl">
              <motion.span variants={textWord} className="inline-block bg-gradient-to-r from-[#0f1220] via-[#2a2a33] to-[#4a4550] bg-clip-text text-transparent">
                Your event deserves
              </motion.span>
              <br />
              <motion.span 
                variants={textWord} 
                className="inline-block bg-[length:200%_auto] bg-gradient-to-r from-[#f97316] via-[#fbbf24] to-[#f97316] bg-clip-text text-transparent"
                animate={reduce ? undefined : { backgroundPosition: ["0% 50%", "200% 50%"] }}
                transition={{ duration: 6, repeat: Infinity, ease: "linear" }}
              >
                a digital masterpiece.
              </motion.span>
            </h2>

            <motion.p variants={textWord} className="mt-6 text-lg font-medium leading-relaxed text-gray-800">
              Start with a premium template or have our design team craft something entirely bespoke. We meticulously engineer every <strong className="font-semibold text-gray-900">component</strong>—from the layout to the animations—to deliver a breathtaking, lightning-fast experience that captivates your guests long before the doors open.
            </motion.p>

            {/* Staggered Checklist */}
            <motion.ul variants={listContainer} className="mt-8 space-y-3">
              {points.map((p) => (
                <motion.li key={p} variants={listItem} className="flex items-start gap-3 text-base font-semibold text-gray-900">
                  <motion.span 
                    whileHover={{ scale: 1.1, rotate: 10 }}
                    className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-orange-500 to-rose-500 text-white shadow-[0_4px_12px_-2px_rgba(225,29,72,0.6)]"
                  >
                    <Check className="h-3.5 w-3.5" strokeWidth={3} />
                  </motion.span>
                  {p}
                </motion.li>
              ))}
            </motion.ul>

            {/* Magnetic Buttons */}
            <motion.div variants={textWord} className="mt-10 flex flex-wrap items-center gap-4">
              <Magnetic reduce={reduce}>
                <Link
                  href="/craft"
                  className={`group inline-flex items-center justify-center gap-3 rounded-xl px-8 py-4 text-base font-bold text-white transition-transform hover:scale-[1.02] active:scale-[0.98] ${primaryBtn} ${focusRing}`}
                >
                  Get my event website
                  <ArrowRight className="h-5 w-5 transition-transform group-hover:translate-x-1" />
                </Link>
              </Magnetic>
              <Magnetic reduce={reduce}>
                <Link
                  href="/templates"
                  className={`inline-flex items-center justify-center rounded-xl border border-white/80 bg-white/70 px-6 py-4 text-base font-semibold text-gray-900 backdrop-blur-md transition-colors hover:bg-white ${focusRing}`}
                >
                  Browse templates
                </Link>
              </Magnetic>
            </motion.div>
          </motion.div>

          {/* ---------------- Right: 3D Stage ---------------- */}
          <motion.div
            initial={{ opacity: 0, scale: 0.94, y: 40 }}
            whileInView={{ opacity: 1, scale: 1, y: 0 }}
            viewport={{ once: true, margin: "-100px" }}
            transition={{ duration: 0.9, delay: 0.2, ease: EASE }}
            className="relative mx-auto w-full max-w-2xl lg:max-w-none"
          >
            <div
              ref={stageRef}
              onPointerMove={onMove}
              onPointerLeave={onLeave}
              style={{ perspective: 1400 }}
              className="relative h-[340px] w-full touch-pan-y sm:h-[440px] lg:h-[520px]"
            >
              <TiltCard
                src="/craft-template-card.png"
                alt="Premium event website template"
                rx={rx}
                ry={ry}
                mx={mx}
                my={my}
                depth={0.6}
                baseRotate={-6}
                float={8}
                className="left-0 top-0 w-[68%]"
                scrollY={scrollYProgress}
                scrollSpeed={-60}
              />

              <TiltCard
                src="/craft-website-card.png"
                alt="Custom crafted event website"
                rx={rx}
                ry={ry}
                mx={mx}
                my={my}
                depth={1.1}
                baseRotate={4}
                float={12}
                priority
                className="bottom-0 right-0 w-[72%]"
                scrollY={scrollYProgress}
                scrollSpeed={60}
              />

              {/* Floating Chips */}
              <motion.div
                style={{ x: chipAx, y: chipAy }}
                className="pointer-events-none absolute bottom-6 left-2 hidden items-center gap-2 rounded-2xl border border-white/70 bg-white/90 px-4 py-2.5 text-sm font-bold text-gray-900 shadow-xl backdrop-blur-md sm:flex"
              >
                <LayoutTemplate className="h-4 w-4 text-orange-500" />
                Template, live in days
              </motion.div>
              
              <motion.div
                style={{ x: chipBx, y: chipBy }}
                className="pointer-events-none absolute right-2 top-4 hidden items-center gap-2 rounded-2xl border border-white/70 bg-white/90 px-4 py-2.5 text-sm font-bold text-gray-900 shadow-xl backdrop-blur-md sm:flex"
              >
                <Wand2 className="h-4 w-4 text-orange-500" />
                Bespoke, built for you
              </motion.div>
            </div>
          </motion.div>

        </div>
      </div>
    </section>
  );
}