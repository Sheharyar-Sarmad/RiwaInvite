"use client";

import {
  motion,
  useMotionTemplate,
  useMotionValue,
  useReducedMotion,
  useSpring,
  useTransform,
} from "framer-motion";
import { cn } from "@/lib/utils";
import { ReactNode, PointerEvent } from "react";

/** RGB triplets, so any layer can compose rgb(<triplet> / alpha). */
export const ACCENTS = {
  orange: "249 115 22",
  sky: "14 165 233",
  emerald: "16 185 129",
  violet: "139 92 246",
  rose: "244 63 94",
  amber: "245 158 11",
  indigo: "99 102 241",
  teal: "20 184 166",
} as const;

export type Accent = keyof typeof ACCENTS;

const SPRING = { stiffness: 200, damping: 24, mass: 0.6 };

interface CardFrameProps {
  accent?: Accent;
  /** Max tilt in degrees. Scaled down automatically on wide cards. */
  tilt?: number;
  delay?: number;
  className?: string;
  contentClassName?: string;
  children: ReactNode;
}

/**
 * The visual shell for every admin card.
 * No fill and no backdrop-blur: the dotted AppShell background stays visible
 * behind the content. Depth comes from a hairline border, a top accent line,
 * a cursor-following spotlight + rim light, and a 3D tilt.
 */
export function CardFrame({
  accent = "orange",
  tilt = 4,
  delay = 0,
  className,
  contentClassName,
  children,
}: CardFrameProps) {
  const reduce = useReducedMotion();
  const rgb = ACCENTS[accent];
  const enabled = !reduce && tilt > 0;

  const nx = useMotionValue(0);
  const ny = useMotionValue(0);
  const px = useMotionValue(-400);
  const py = useMotionValue(-400);
  const hover = useMotionValue(0);
  const sizeK = useMotionValue(1);

  const sx = useSpring(nx, SPRING);
  const sy = useSpring(ny, SPRING);
  const sHover = useSpring(hover, { stiffness: 160, damping: 20 });

  // Wide cards tilt less so they never look skewed.
  const rotateX = useTransform([sy, sizeK], ([y, k]: number[]) => -y * 2 * tilt * k);
  const rotateY = useTransform([sx, sizeK], ([x, k]: number[]) => x * 2 * tilt * k);
  const scale = useTransform(sHover, [0, 1], [1, 1.008]);
  const shiftX = useTransform(sx, [-0.5, 0.5], [3, -3]);
  const shiftY = useTransform(sy, [-0.5, 0.5], [3, -3]);

  const spotlight = useMotionTemplate`radial-gradient(440px circle at ${px}px ${py}px, rgb(${rgb} / 0.13), transparent 65%)`;
  const rim = useMotionTemplate`radial-gradient(280px circle at ${px}px ${py}px, rgb(${rgb} / 0.7), transparent 70%)`;

  const onMove = (e: PointerEvent<HTMLDivElement>) => {
    if (e.pointerType === "touch") return;
    const r = e.currentTarget.getBoundingClientRect();
    const x = e.clientX - r.left;
    const y = e.clientY - r.top;
    px.set(x);
    py.set(y);
    if (enabled) {
      nx.set(x / r.width - 0.5);
      ny.set(y / r.height - 0.5);
      sizeK.set(Math.min(1, 460 / r.width));
    }
  };
  const onEnter = () => hover.set(1);
  const onLeave = () => {
    hover.set(0);
    nx.set(0);
    ny.set(0);
    px.set(-400);
    py.set(-400);
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 24, filter: "blur(6px)" }}
      whileInView={{ opacity: 1, y: 0, filter: "blur(0px)" }}
      viewport={{ once: true, margin: "-60px" }}
      transition={{ type: "spring", stiffness: 110, damping: 20, delay }}
      style={{ perspective: 1400 }}
      className={cn("group/card relative", className)}
    >
      <motion.div
        onPointerMove={onMove}
        onPointerEnter={onEnter}
        onPointerLeave={onLeave}
        style={{
          rotateX: enabled ? rotateX : 0,
          rotateY: enabled ? rotateY : 0,
          scale: enabled ? scale : 1,
          transformStyle: "preserve-3d",
          ["--accent" as string]: rgb,
        }}
        className="relative h-full rounded-2xl will-change-transform"
      >
        {/* Outer glow: box-shadow only, so it never washes the dots inside */}
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 rounded-2xl opacity-0 transition-opacity duration-500 group-hover/card:opacity-100"
          style={{ boxShadow: `0 28px 60px -24px rgb(${rgb} / 0.45)` }}
        />

        {/* Hairline frame with a faint accent tint fading from the top */}
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 rounded-2xl border border-neutral-900/[0.10] transition-colors duration-300 group-hover/card:border-transparent"
          style={{
            // Soft white body (no blur, so the dots stay crisp but quiet) + accent wash from the top
            background: `linear-gradient(180deg, rgb(${rgb} / 0.10), rgb(${rgb} / 0.025) 45%, transparent 100%), rgba(255,255,255,0.82)`,
            boxShadow:
              "inset 0 1px 0 rgba(255,255,255,0.95), 0 1px 2px rgba(0,0,0,0.04), 0 14px 34px -16px rgba(0,0,0,0.14)",
          }}
        />

        {/* Accent line on the top edge */}
        <div
          aria-hidden
          className="pointer-events-none absolute inset-x-8 top-0 h-px"
          style={{
            background: `linear-gradient(90deg, transparent, rgb(${rgb} / 0.8), transparent)`,
          }}
        />

        {/* Rim light that follows the cursor */}
        <motion.div
          aria-hidden
          className="pointer-events-none absolute inset-0 rounded-2xl opacity-0 transition-opacity duration-300 group-hover/card:opacity-100"
          style={{
            background: rim,
            padding: 1,
            WebkitMask:
              "linear-gradient(#000 0 0) content-box, linear-gradient(#000 0 0)",
            WebkitMaskComposite: "xor",
            maskComposite: "exclude",
          }}
        />

        {/* Spotlight */}
        <motion.div
          aria-hidden
          className="pointer-events-none absolute inset-0 rounded-2xl opacity-0 transition-opacity duration-300 group-hover/card:opacity-100"
          style={{ background: spotlight }}
        />

        {/* Content floats above the frame */}
        <motion.div
          style={{
            transform: "translateZ(24px)",
            x: enabled ? shiftX : 0,
            y: enabled ? shiftY : 0,
          }}
          className={cn("relative z-10 h-full", contentClassName)}
        >
          {children}
        </motion.div>
      </motion.div>
    </motion.div>
  );
}