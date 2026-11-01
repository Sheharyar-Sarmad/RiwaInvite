"use client";

import { useRef } from "react";
import Image from "next/image";
import Link from "next/link";
import {
  motion,
  useReducedMotion,
  useScroll,
  useTransform,
  useMotionValue,
  useMotionTemplate,
  useSpring,
} from "framer-motion";
import { ArrowRight, Leaf, X } from "lucide-react";

const EASE = [0.22, 1, 0.36, 1] as const;

/* -------------------------------------------------------------------------- */
/*  Helpers                                                                   */
/* -------------------------------------------------------------------------- */
function lerpColor(a: string, b: string, t: number) {
  const pa = [1, 3, 5].map((i) => parseInt(a.slice(i, i + 2), 16));
  const pb = [1, 3, 5].map((i) => parseInt(b.slice(i, i + 2), 16));
  const c = pa.map((v, i) => Math.round(v + (pb[i] - v) * t));
  return `rgb(${c[0]},${c[1]},${c[2]})`;
}

/* Letter-by-letter 3D spring reveal */
function Chars({
  text,
  delay,
  reduce,
  from,
  to,
}: {
  text: string;
  delay: number;
  reduce: boolean;
  from?: string;
  to?: string;
}) {
  const words = text.split(" ");
  const total = Math.max(text.replace(/ /g, "").length - 1, 1);
  let k = 0;
  return (
    <>
      {words.map((w, wi) => (
        <span key={wi}>
          <span className="inline-block whitespace-nowrap">
            {Array.from(w).map((c, ci) => {
              const idx = k++;
              return (
                <motion.span
                  key={ci}
                  className="inline-block origin-[50%_100%] will-change-transform"
                  style={
                    from && to
                      ? { color: lerpColor(from, to, idx / total) }
                      : undefined
                  }
                  initial={
                    reduce
                      ? false
                      : {
                          y: "70%",
                          opacity: 0,
                          rotateX: -85,
                          filter: "blur(10px)",
                        }
                  }
                  animate={{
                    y: "0%",
                    opacity: 1,
                    rotateX: 0,
                    filter: "blur(0px)",
                  }}
                  transition={{
                    type: "spring",
                    stiffness: 130,
                    damping: 15,
                    mass: 0.9,
                    delay: delay + idx * 0.04,
                  }}
                >
                  {c}
                </motion.span>
              );
            })}
          </span>
          {wi < words.length - 1 && " "}
        </span>
      ))}
    </>
  );
}

/* Word-by-word blur-in for paragraphs */
function Words({
  text,
  delay,
  reduce,
  className,
}: {
  text: string;
  delay: number;
  reduce: boolean;
  className?: string;
}) {
  return (
    <>
      {text.split(" ").map((w, i) => (
        <span key={i}>
          <motion.span
            className={`inline-block ${className ?? ""}`}
            initial={
              reduce ? false : { opacity: 0, y: 14, filter: "blur(6px)" }
            }
            animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
            transition={{ duration: 0.6, ease: EASE, delay: delay + i * 0.022 }}
          >
            {w}
          </motion.span>{" "}
        </span>
      ))}
    </>
  );
}

/* -------------------------------------------------------------------------- */
/*  Falling petals (echo the artwork)                                         */
/* -------------------------------------------------------------------------- */
const PETALS = Array.from({ length: 8 }, (_, i) => ({
  left: `${(i * 13 + 6) % 96}%`,
  size: 12 + ((i * 5) % 12),
  dur: 16 + ((i * 3) % 8),
  delay: (i * 1.9) % 9,
  sway: 20 + ((i * 9) % 30),
}));

function Petals() {
  return (
    <div
      className="pointer-events-none absolute inset-0 z-[5] overflow-hidden"
      aria-hidden
    >
      {PETALS.map((p, i) => (
        <motion.span
          key={i}
          className="absolute -top-8 block"
          style={{
            left: p.left,
            width: p.size,
            height: p.size * 1.3,
            borderRadius: "80% 0 80% 0",
            background: "linear-gradient(135deg,#fdba74 0%,#f97316 100%)",
            boxShadow: "0 4px 14px rgba(249,115,22,0.35)",
          }}
          animate={{
            y: ["0vh", "95vh"],
            x: [0, p.sway, -p.sway, 0],
            rotate: [0, 200, 420],
            opacity: [0, 0.8, 0.8, 0],
          }}
          transition={{
            duration: p.dur,
            delay: p.delay,
            repeat: Infinity,
            ease: "linear",
          }}
        />
      ))}
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/*  Photo card with 3D mouse tilt + glare                                     */
/* -------------------------------------------------------------------------- */
function PhotoCard({
  src,
  alt,
  label,
  future = false,
}: {
  src: string;
  alt: string;
  label: string;
  future?: boolean;
}) {
  return (
    <div
      className={`w-full rounded-2xl bg-white p-1.5 ${
        future
          ? "border border-orange-200 shadow-[0_30px_60px_-16px_rgba(249,115,22,0.6)]"
          : "border border-black/10 shadow-[0_30px_60px_-16px_rgba(120,53,15,0.5)]"
      }`}
    >
      <div className="relative aspect-[3/4] w-full overflow-hidden rounded-xl">
        <Image
          src={src}
          alt={alt}
          fill
          priority
          quality={100}
          sizes="(min-width: 1024px) 420px, (min-width: 640px) 260px, 50vw"
          className={`object-cover ${future ? "" : "grayscale"}`}
        />
      </div>
      <div className="flex items-center justify-between px-2 pb-1 pt-2">
        <span
          className={`text-[10px] font-bold uppercase tracking-widest ${
            future ? "text-orange-600" : "text-gray-500"
          }`}
        >
          {label}
        </span>
        {future ? (
          <Leaf className="h-3.5 w-3.5 text-emerald-500" aria-hidden />
        ) : (
          <X className="h-3.5 w-3.5 text-red-500" aria-hidden />
        )}
      </div>
    </div>
  );
}

function TiltCard({
  children,
  reduce,
}: {
  children: React.ReactNode;
  reduce: boolean;
}) {
  const rx = useMotionValue(0);
  const ry = useMotionValue(0);
  const srx = useSpring(rx, { stiffness: 160, damping: 16 });
  const sry = useSpring(ry, { stiffness: 160, damping: 16 });
  const gx = useMotionValue(50);
  const gy = useMotionValue(50);
  const glare = useMotionTemplate`radial-gradient(280px circle at ${gx}% ${gy}%, rgba(255,255,255,0.45), transparent 60%)`;

  const onMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (reduce || e.pointerType !== "mouse") return;
    const r = e.currentTarget.getBoundingClientRect();
    const px = (e.clientX - r.left) / r.width;
    const py = (e.clientY - r.top) / r.height;
    ry.set((px - 0.5) * 18);
    rx.set(-(py - 0.5) * 18);
    gx.set(px * 100);
    gy.set(py * 100);
  };
  const onLeave = () => {
    rx.set(0);
    ry.set(0);
    gx.set(50);
    gy.set(50);
  };

  return (
    <motion.div
      onPointerMove={onMove}
      onPointerLeave={onLeave}
      style={{ rotateX: srx, rotateY: sry, transformPerspective: 900 }}
      className="group relative"
    >
      {children}
      <motion.div
        aria-hidden
        style={{ background: glare }}
        className="pointer-events-none absolute inset-0 rounded-2xl opacity-0 transition-opacity duration-300 group-hover:opacity-100"
      />
    </motion.div>
  );
}

/* -------------------------------------------------------------------------- */
/*  Main component                                                            */
/* -------------------------------------------------------------------------- */
export function EthosHero() {
  const reduce = useReducedMotion() ?? false;
  const sectionRef = useRef<HTMLElement>(null);

  const { scrollYProgress } = useScroll({
    target: sectionRef,
    offset: ["start start", "end start"],
  });
  const leftY = useTransform(scrollYProgress, [0, 1], [0, 70]);
  const rightY = useTransform(scrollYProgress, [0, 1], [0, -70]);

  /* magnetic CTA */
  const mx = useMotionValue(0);
  const my = useMotionValue(0);
  const smx = useSpring(mx, { stiffness: 220, damping: 14 });
  const smy = useSpring(my, { stiffness: 220, damping: 14 });
  const onCtaMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (reduce || e.pointerType !== "mouse") return;
    const r = e.currentTarget.getBoundingClientRect();
    mx.set((e.clientX - (r.left + r.width / 2)) * 0.25);
    my.set((e.clientY - (r.top + r.height / 2)) * 0.35);
  };
  const onCtaLeave = () => {
    mx.set(0);
    my.set(0);
  };

  return (
    // 1. CHANGED: Added lg:h-[85dvh] to reduce the overall height on desktop
    <section
      ref={sectionRef}
      className="relative w-full overflow-hidden bg-[#fdebe1] lg:h-[90dvh]"
    >
      <div className="relative w-full h-full [container-type:inline-size]">
        {/* 2. CHANGED: Removed the fixed 16/9 aspect ratio and made it fill the 85vh container */}
        <motion.div
          initial={
            reduce
              ? { opacity: 0 }
              : { opacity: 0, scale: 1.06, filter: "blur(12px)" }
          }
          animate={{ opacity: 1, scale: 1, filter: "blur(0px)" }}
          transition={{ duration: 1.8, ease: EASE }}
          className="absolute inset-0 w-full h-full"
        >
          <Image
            src="/ethos-hero-bg.png"
            alt=""
            fill
            priority
            quality={100}
            sizes="100vw"
            className="object-cover object-[30%_center] lg:object-center"
          />
        </motion.div>

        {/* Mobile/tablet readability wash — vertical only, uniform left to right */}
        <div
          aria-hidden
          className="absolute inset-0 bg-gradient-to-b from-[rgba(255,248,242,0.78)] via-[rgba(255,248,242,0.5)] to-transparent to-[62%] lg:hidden"
        />

        {!reduce && <Petals />}

        {/* DESKTOP CARDS */}
        <div className="absolute inset-y-0 left-[3%] z-10 hidden w-[min(19cqw,340px)] items-center lg:flex">
          <motion.div
            style={reduce ? undefined : { y: leftY }}
            className="w-full"
          >
            <motion.div
              initial={
                reduce ? false : { opacity: 0, y: 90, rotateZ: -12, scale: 0.9 }
              }
              animate={{ opacity: 1, y: 0, rotateZ: -3, scale: 1 }}
              transition={{
                type: "spring",
                stiffness: 70,
                damping: 14,
                delay: 0.9,
              }}
            >
              <motion.div
                animate={reduce ? undefined : { y: [0, -10, 0] }}
                transition={{
                  duration: 6,
                  repeat: Infinity,
                  ease: "easeInOut",
                  delay: 2,
                }}
              >
                <TiltCard reduce={reduce}>
                  <PhotoCard
                    src="/ethos-paper-stack.png"
                    alt="Wasted paper"
                    label="The Past"
                  />
                </TiltCard>
              </motion.div>
            </motion.div>
          </motion.div>
        </div>
        <div className="absolute inset-y-0 right-[3%] z-10 hidden w-[min(19cqw,340px)] items-center lg:flex">
          <motion.div
            style={reduce ? undefined : { y: rightY }}
            className="w-full"
          >
            <motion.div
              initial={
                reduce ? false : { opacity: 0, y: 90, rotateZ: 12, scale: 0.9 }
              }
              animate={{ opacity: 1, y: 0, rotateZ: 3, scale: 1 }}
              transition={{
                type: "spring",
                stiffness: 70,
                damping: 14,
                delay: 1.05,
              }}
            >
              <motion.div
                animate={reduce ? undefined : { y: [0, 10, 0] }}
                transition={{
                  duration: 7,
                  repeat: Infinity,
                  ease: "easeInOut",
                  delay: 2,
                }}
              >
                <TiltCard reduce={reduce}>
                  <PhotoCard
                    src="/ethos-green-tree.png"
                    alt="Digital future"
                    label="The Future"
                    future
                  />
                </TiltCard>
              </motion.div>
            </motion.div>
          </motion.div>
        </div>

        {/* CONTENT */}
        <div className="relative z-10 flex flex-col items-center px-5 pb-12 pt-24 text-center sm:px-8 sm:pt-28 lg:absolute lg:inset-0 lg:justify-center lg:px-[23cqw] lg:pb-0 lg:pt-0">
          {/* Badge */}
          <motion.div
            initial={reduce ? false : { opacity: 0, y: 14, scale: 0.85 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            transition={{
              type: "spring",
              stiffness: 160,
              damping: 14,
              delay: 0.1,
            }}
            className="mb-3 inline-flex items-center gap-2 rounded-full border border-orange-300/70 bg-white/85 px-3 py-1 text-[10px] font-bold uppercase tracking-[0.18em] text-orange-600 backdrop-blur sm:text-[11px] lg:mb-[1.2cqw]"
          >
            <Leaf className="h-3 w-3" aria-hidden />
            The Riwainvite Ethos
          </motion.div>

          {/* Headline */}
          <h1
            aria-label="The era of paper is over."
            className="font-[family-name:var(--font-display)] text-[clamp(2.25rem,10.5cqw,3.6rem)] font-extrabold leading-[1.06] tracking-[-0.035em] text-[#1c0f08] [perspective:700px] md:text-[clamp(2.5rem,8cqw,4.5rem)] lg:text-[clamp(2.25rem,5cqw,4.8rem)]"
          >
            <span aria-hidden className="block">
              <Chars text="The era of" delay={0.35} reduce={reduce} />{" "}
              <span className="relative inline-block">
                <motion.span
                  className="inline-block"
                  initial={reduce ? false : { opacity: 1 }}
                  animate={{ opacity: 0.4 }}
                  transition={{ duration: 0.5, delay: reduce ? 0 : 2.0 }}
                >
                  <Chars text="paper" delay={0.75} reduce={reduce} />
                </motion.span>

                {/* strike-through */}
                <motion.span
                  className="absolute -left-[3%] -right-[3%] top-[56%] h-[0.085em] origin-left rounded-full bg-orange-500"
                  initial={reduce ? false : { scaleX: 0 }}
                  animate={{ scaleX: 1 }}
                  transition={{ duration: 0.6, ease: EASE, delay: 1.9 }}
                />
                {/* spark burst at the end of the strike */}
                {!reduce && (
                  <span className="pointer-events-none absolute -right-[3%] top-[56%]">
                    {Array.from({ length: 9 }).map((_, i) => {
                      const a = (i / 9) * Math.PI * 2;
                      return (
                        <motion.span
                          key={i}
                          className="absolute h-[0.12em] w-[0.12em] rounded-full bg-orange-400"
                          initial={{ x: 0, y: 0, opacity: 0, scale: 0 }}
                          animate={{
                            x: Math.cos(a) * 34,
                            y: Math.sin(a) * 34,
                            opacity: [0, 1, 0],
                            scale: [0, 1.2, 0],
                          }}
                          transition={{
                            duration: 0.75,
                            ease: "easeOut",
                            delay: 2.45,
                          }}
                        />
                      );
                    })}
                  </span>
                )}
              </span>
            </span>
            <span aria-hidden className="block">
              <Chars
                text="is over."
                delay={1.05}
                reduce={reduce}
                from="#ea580c"
                to="#f59e0b"
              />
            </span>
          </h1>

          {/* Subheadline */}
          <p className="mt-3 max-w-[34rem] font-[family-name:var(--font-body)] text-[0.95rem] font-semibold leading-relaxed text-[#3a2416] sm:text-base lg:mt-[1.1cqw] lg:max-w-none lg:text-[clamp(0.8rem,1.3cqw,1.2rem)]">
            <Words
              text="Stop spending a fortune on static paper that destroys our forests and gets thrown away. Step into the future with a living, breathing digital invitation that leaves"
              delay={1.35}
              reduce={reduce}
            />
            <Words
              text="zero carbon footprint."
              delay={1.35 + 28 * 0.022}
              reduce={reduce}
              className="font-extrabold text-orange-600"
            />
          </p>

          {/* CTA */}
          <motion.div
            initial={reduce ? false : { opacity: 0, y: 24, scale: 0.9 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            transition={{
              type: "spring",
              stiffness: 120,
              damping: 14,
              delay: 1.9,
            }}
            className="mt-5 lg:mt-[1.6cqw]"
          >
            <motion.div
              style={{ x: smx, y: smy }}
              onPointerMove={onCtaMove}
              onPointerLeave={onCtaLeave}
              className="p-3"
            >
              <Link
                href="/register"
                className="group relative inline-flex h-12 items-center gap-3 overflow-hidden rounded-full bg-[#1f1611] pl-6 pr-1.5 font-[family-name:var(--font-display)] text-sm font-bold text-white shadow-[0_12px_32px_-10px_rgba(31,22,17,0.75)] transition-shadow duration-500 hover:shadow-[0_16px_44px_-8px_rgba(249,115,22,0.8)] focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-orange-400/70 active:scale-[0.97] sm:h-[52px] sm:text-[15px]"
              >
                {/* orange fill that expands from the arrow */}
                <span
                  aria-hidden
                  className="absolute right-1.5 top-1/2 h-9 w-9 -translate-y-1/2 rounded-full bg-orange-600 transition-transform duration-700 [transition-timing-function:cubic-bezier(0.22,1,0.36,1)] group-hover:scale-[16] sm:h-10 sm:w-10"
                />
                <span className="relative z-10">
                  Join the paperless movement
                </span>
                <span className="relative z-10 flex h-9 w-9 items-center justify-center rounded-full bg-orange-600 sm:h-10 sm:w-10">
                  <ArrowRight
                    className="h-4 w-4 transition-transform duration-500 group-hover:-rotate-45"
                    aria-hidden
                  />
                </span>
              </Link>
            </motion.div>
          </motion.div>

          {/* MOBILE / TABLET CARDS */}
          <div className="mt-6 grid w-full max-w-[300px] grid-cols-2 gap-3 min-[420px]:max-w-[360px] sm:max-w-[460px] sm:gap-4 lg:hidden">
            <motion.div
              initial={reduce ? false : { opacity: 0, y: 70, rotateZ: -10 }}
              animate={{ opacity: 1, y: 0, rotateZ: -2 }}
              transition={{
                type: "spring",
                stiffness: 70,
                damping: 14,
                delay: 2.1,
              }}
            >
              <TiltCard reduce={reduce}>
                <PhotoCard
                  src="/ethos-paper-stack.png"
                  alt="Wasted paper"
                  label="The Past"
                />
              </TiltCard>
            </motion.div>
            <motion.div
              className="mt-4 sm:mt-6"
              initial={reduce ? false : { opacity: 0, y: 70, rotateZ: 10 }}
              animate={{ opacity: 1, y: 0, rotateZ: 2 }}
              transition={{
                type: "spring",
                stiffness: 70,
                damping: 14,
                delay: 2.25,
              }}
            >
              <TiltCard reduce={reduce}>
                <PhotoCard
                  src="/ethos-green-tree.png"
                  alt="Digital future"
                  label="The Future"
                  future
                />
              </TiltCard>
            </motion.div>
          </div>
        </div>
      </div>
    </section>
  );
}
