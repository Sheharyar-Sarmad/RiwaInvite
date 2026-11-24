"use client";

import Link from "next/link";
import Image from "next/image";
import { useRef } from "react";
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

/*
 * Design notes
 *  - Surface: one clean vertical gradient, cream at the top into full orange at the
 *    bottom. No blurred blobs, no glare, no icons.
 *  - Type: large editorial headline. The first sentence is ink, the second is the
 *    same ink at half strength.
 *  - Product: the two cards rise from the orange floor and are cropped by the
 *    section edge, so the page feels like it continues below.
 *  - The two paths (template or bespoke) are labelled on the cards themselves.
 */

const EASE = [0.16, 1, 0.3, 1] as const;

const focusRing =
  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-600 focus-visible:ring-offset-2 focus-visible:ring-offset-[#fff6ee]";

const GRADIENT =
  "linear-gradient(180deg, #fffaf6 0%, #fff3e8 30%, #ffd5ae 56%, #ff9f55 80%, #f97316 100%)";

const points = [
  "Bespoke branding & custom domains",
  "Seamless RSVPs & guest tracking built-in",
  "Launch in days, or 100% bespoke",
];

const headlineLines = [
  { words: ["Your", "event", "deserves"], muted: false },
  { words: ["a", "digital", "masterpiece."], muted: true },
];

/* ------------------------------------------------------------------ */
/* Variants                                                            */
/* ------------------------------------------------------------------ */

const headlineParent: Variants = {
  hidden: {},
  show: { transition: { staggerChildren: 0.07, delayChildren: 0.05 } },
};

const wordUp: Variants = {
  hidden: { y: "112%", rotate: 3 },
  show: { y: 0, rotate: 0, transition: { duration: 1, ease: EASE } },
};

const fadeUp: Variants = {
  hidden: { opacity: 0, y: 22 },
  show: { opacity: 1, y: 0, transition: { duration: 0.8, ease: EASE } },
};

const rightParent: Variants = {
  hidden: {},
  show: { transition: { staggerChildren: 0.12, delayChildren: 0.45 } },
};

/* ------------------------------------------------------------------ */
/* Magnetic wrapper (buttons lean toward the cursor)                   */
/* ------------------------------------------------------------------ */

function Magnetic({ children, reduce }: { children: React.ReactNode; reduce: boolean }) {
  const x = useMotionValue(0);
  const y = useMotionValue(0);
  const sx = useSpring(x, { stiffness: 200, damping: 15, mass: 0.2 });
  const sy = useSpring(y, { stiffness: 200, damping: 15, mass: 0.2 });

  const onMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (reduce) return;
    const rect = e.currentTarget.getBoundingClientRect();
    x.set((e.clientX - rect.left - rect.width / 2) * 0.18);
    y.set((e.clientY - rect.top - rect.height / 2) * 0.18);
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
/* Product card                                                        */
/*                                                                     */
/*  entrance   rises from below the section edge (once, on scroll in)  */
/*  tilt       follows the pointer, plus scroll parallax               */
/*  float      slow idle drift                                         */
/* ------------------------------------------------------------------ */

function ProductCard({
  src,
  alt,
  tag,
  tagSide,
  rx,
  ry,
  mx,
  my,
  depth,
  baseRotate,
  float,
  priority,
  scrollY,
  scrollSpeed,
  delay,
  className,
}: {
  src: string;
  alt: string;
  tag: string;
  tagSide: "left" | "right";
  rx: MotionValue<number>;
  ry: MotionValue<number>;
  mx: MotionValue<number>;
  my: MotionValue<number>;
  depth: number;
  baseRotate: number;
  float: number;
  priority?: boolean;
  scrollY: MotionValue<number>;
  scrollSpeed: number;
  delay: number;
  className: string;
}) {
  const reduce = useReducedMotion();

  const rotateX = useTransform(rx, (v) => v * depth);
  const rotateY = useTransform(ry, (v) => v * depth);
  const xMouse = useTransform(mx, (v) => v * depth * 18);
  const yMouse = useTransform(my, (v) => v * depth * 18);
  const yScroll = useTransform(scrollY, [0.15, 0.85], [scrollSpeed, -scrollSpeed]);
  const y = useTransform([yMouse, yScroll], ([m, s]: number[]) => m + s);

  return (
    <motion.div
      initial={reduce ? false : { opacity: 0, y: 150 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, amount: 0.15 }}
      transition={{ duration: 1.2, delay, ease: EASE }}
      className={`absolute ${className}`}
    >
      <motion.div
        style={{
          rotateX,
          rotateY,
          x: xMouse,
          y,
          rotateZ: baseRotate,
          transformPerspective: 1400,
        }}
      >
        <motion.div
          animate={reduce ? undefined : { y: [0, -float, 0] }}
          transition={{ duration: 7 + depth * 2, repeat: Infinity, ease: "easeInOut" }}
          whileHover={reduce ? undefined : { scale: 1.015, transition: { duration: 0.4, ease: EASE } }}
          className="relative"
        >
          <div className="relative aspect-[4/3] w-full overflow-hidden rounded-[1.25rem] border border-white/70 bg-white shadow-[0_50px_100px_-30px_rgba(150,45,0,0.6),0_12px_30px_-12px_rgba(0,0,0,0.25)] sm:rounded-3xl">
            <Image
              src={src}
              alt={alt}
              fill
              sizes="(min-width: 1024px) 45vw, 80vw"
              className="object-cover"
              priority={priority}
            />
            <div className="pointer-events-none absolute inset-0 rounded-[inherit] ring-1 ring-inset ring-black/5" />
          </div>

          <span
            className={`absolute -top-3.5 z-10 rounded-full bg-white px-3.5 py-1.5 text-xs font-semibold text-[#17100c] shadow-[0_8px_20px_-8px_rgba(0,0,0,0.35)] sm:text-[13px] ${
              tagSide === "left" ? "left-4 sm:left-6" : "right-4 sm:right-6"
            }`}
          >
            {tag}
          </span>
        </motion.div>
      </motion.div>
    </motion.div>
  );
}

/* ------------------------------------------------------------------ */
/* Section                                                             */
/* ------------------------------------------------------------------ */

export function CraftTeaser() {
  const stageRef = useRef<HTMLDivElement>(null);
  const sectionRef = useRef<HTMLElement>(null);
  const reduce = useReducedMotion() ?? false;

  // Pointer tilt (-1 .. 1)
  const px = useMotionValue(0);
  const py = useMotionValue(0);
  const mx = useSpring(px, { stiffness: 110, damping: 18, mass: 0.6 });
  const my = useSpring(py, { stiffness: 110, damping: 18, mass: 0.6 });
  const rx = useTransform(my, [-1, 1], [8, -8]);
  const ry = useTransform(mx, [-1, 1], [-10, 10]);

  const { scrollYProgress } = useScroll({
    target: sectionRef,
    offset: ["start end", "end start"],
  });

  function onMove(e: React.PointerEvent<HTMLDivElement>) {
    if (reduce || e.pointerType !== "mouse") return;
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
    <section
      ref={sectionRef}
      style={{ background: GRADIENT }}
      className="relative isolate w-full overflow-hidden pt-20 sm:pt-28"
    >
      <div className="relative mx-auto w-full max-w-7xl px-4 sm:px-6 lg:px-12">
        {/* ---------------- Headline + intro ---------------- */}
        <div className="grid grid-cols-1 gap-8 lg:grid-cols-12 lg:items-end lg:gap-10">
          <motion.h2
            aria-label="Your event deserves a digital masterpiece."
            variants={headlineParent}
            initial={reduce ? "show" : "hidden"}
            whileInView="show"
            viewport={{ once: true, margin: "-80px" }}
            className="font-[family-name:var(--font-display)] text-[clamp(2.5rem,1rem+5.6vw,5.5rem)] font-semibold leading-[0.98] tracking-[-0.035em] lg:col-span-7"
          >
            {headlineLines.map((line, li) => (
              <span key={li} className="block">
                {line.words.map((w, wi) => (
                  <span
                    key={wi}
                    className="mr-[0.22em] inline-block overflow-hidden pb-[0.1em] align-bottom"
                  >
                    <motion.span
                      aria-hidden
                      variants={wordUp}
                      className={`inline-block origin-bottom-left ${
                        line.muted ? "text-[#17100c]/45" : "text-[#17100c]"
                      }`}
                    >
                      {w}
                    </motion.span>
                  </span>
                ))}
              </span>
            ))}
          </motion.h2>

          <motion.div
            variants={rightParent}
            initial={reduce ? "show" : "hidden"}
            whileInView="show"
            viewport={{ once: true, margin: "-80px" }}
            className="lg:col-span-5 lg:pb-3"
          >
            <motion.p
              variants={fadeUp}
              className="max-w-md font-[family-name:var(--font-body)] text-base font-medium leading-relaxed text-[#17100c]/75 sm:text-lg"
            >
              Start from a premium template, or have our design team build something entirely your own.
              Every layout and animation is engineered to load fast and win your guests over before the
              day.
            </motion.p>

            <motion.div variants={fadeUp} className="mt-7 flex flex-wrap items-center gap-3">
              <Magnetic reduce={reduce}>
                <Link
                  href="/craft"
                  className={`group relative inline-flex items-center justify-center overflow-hidden rounded-full bg-[#17100c] px-7 py-3.5 text-[15px] font-semibold text-white transition-transform active:scale-[0.98] ${focusRing}`}
                >
                  <span
                    aria-hidden
                    className="absolute inset-0 translate-y-[102%] rounded-t-[50%] bg-[#f97316] transition-all duration-500 ease-out group-hover:translate-y-0 group-hover:rounded-t-none"
                  />
                  <span className="relative">Get my event website</span>
                </Link>
              </Magnetic>
              <Magnetic reduce={reduce}>
                <Link
                  href="/templates"
                  className={`inline-flex items-center justify-center rounded-full border border-[#17100c]/25 bg-white/40 px-6 py-3.5 text-[15px] font-semibold text-[#17100c] backdrop-blur-sm transition-colors hover:bg-white ${focusRing}`}
                >
                  Browse templates
                </Link>
              </Magnetic>
            </motion.div>
          </motion.div>
        </div>

        {/* ---------------- What you get ---------------- */}
        <motion.ul
          initial="hidden"
          whileInView="show"
          viewport={{ once: true, margin: "-60px" }}
          variants={{ hidden: {}, show: { transition: { staggerChildren: 0.12, delayChildren: 0.2 } } }}
          className="mt-12 grid grid-cols-1 gap-5 sm:mt-16 sm:grid-cols-3 sm:gap-8"
        >
          {points.map((p) => (
            <motion.li key={p} variants={fadeUp} className="relative pt-4">
              <motion.span
                aria-hidden
                variants={{
                  hidden: { scaleX: 0 },
                  show: { scaleX: 1, transition: { duration: 1, ease: EASE } },
                }}
                className="absolute inset-x-0 top-0 h-px origin-left bg-[#17100c]/25"
              />
              <p className="text-[15px] font-semibold leading-snug text-[#17100c] sm:text-base">{p}</p>
            </motion.li>
          ))}
        </motion.ul>

        {/* ---------------- Product stage: cards rise from the orange floor ---------------- */}
        <div
          ref={stageRef}
          onPointerMove={onMove}
          onPointerLeave={onLeave}
          className="relative mx-auto mt-14 h-[340px] w-full max-w-6xl touch-pan-y sm:mt-16 sm:h-[420px] lg:h-[500px]"
        >
          <ProductCard
            src="/craft-template-card.png"
            alt="Premium event website template"
            tag="Template, live in days"
            tagSide="left"
            rx={rx}
            ry={ry}
            mx={mx}
            my={my}
            depth={0.7}
            baseRotate={-4}
            float={8}
            delay={0}
            scrollY={scrollYProgress}
            scrollSpeed={34}
            className="left-0 top-[4%] w-[70%] sm:w-[60%] lg:w-[58%]"
          />
          <ProductCard
            src="/craft-website-card.png"
            alt="Custom crafted event website"
            tag="Bespoke, built for you"
            tagSide="right"
            rx={rx}
            ry={ry}
            mx={mx}
            my={my}
            depth={1.1}
            baseRotate={3}
            float={12}
            priority
            delay={0.15}
            scrollY={scrollYProgress}
            scrollSpeed={-34}
            className="-bottom-[16%] right-0 w-[74%] sm:-bottom-[20%] sm:w-[64%]"
          />
        </div>
      </div>
    </section>
  );
}