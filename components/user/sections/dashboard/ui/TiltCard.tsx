"use client";

import * as React from "react";
import { motion, useMotionValue, useSpring, useTransform, useMotionTemplate, useReducedMotion } from "framer-motion";
import { cn, MAX_TILT, EASE, VIEW, TONE_TEXT, TONE, Tone } from "../constants";

function useFinePointer() {
  const [fine, setFine] = React.useState(false);
  React.useEffect(() => {
    const mq = window.matchMedia("(hover: hover) and (pointer: fine)");
    const sync = () => setFine(mq.matches);
    sync();
    mq.addEventListener("change", sync);
    return () => mq.removeEventListener("change", sync);
  }, []);
  return fine;
}

export function TiltCard({
  tone, className, pad = "p-4 sm:p-5 lg:p-6", delay = 0, children,
}: {
  tone: Tone; className?: string; pad?: string; delay?: number; children: React.ReactNode;
}) {
  const reduce = useReducedMotion() ?? false;
  const fine = useFinePointer();
  const tilt = fine && !reduce;
  const t = TONE[tone];

  const px = useMotionValue(0);
  const py = useMotionValue(0);
  const sx = useSpring(px, { stiffness: 150, damping: 20 });
  const sy = useSpring(py, { stiffness: 150, damping: 20 });
  const rotateY = useTransform(sx, [-0.5, 0.5], [-MAX_TILT, MAX_TILT]);
  const rotateX = useTransform(sy, [-0.5, 0.5], [MAX_TILT, -MAX_TILT]);

  const gx = useMotionValue(-400);
  const gy = useMotionValue(-400);
  const light = useMotionTemplate`radial-gradient(420px circle at ${gx}px ${gy}px, ${t.light}, transparent 65%)`;
  const edge = useMotionTemplate`radial-gradient(240px circle at ${gx}px ${gy}px, rgba(251,146,60,0.95), transparent 70%)`;

  const onMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (e.pointerType !== "mouse") return;
    const r = e.currentTarget.getBoundingClientRect();
    const nx = (e.clientX - r.left) / r.width;
    const ny = (e.clientY - r.top) / r.height;
    px.set(nx - 0.5); py.set(ny - 0.5); gx.set(nx * r.width); gy.set(ny * r.height);
  };
  const onLeave = () => { px.set(0); py.set(0); gx.set(-400); gy.set(-400); };

  return (
    <motion.div
      initial={reduce ? false : { opacity: 0, y: 28, scale: 0.97 }}
      whileInView={{ opacity: 1, y: 0, scale: 1 }}
      viewport={VIEW}
      whileHover={tilt ? { y: -4, transition: { duration: 0.35, ease: EASE } } : undefined}
      transition={{ duration: 0.7, delay, ease: EASE }}
      onPointerMove={tilt ? onMove : undefined}
      onPointerLeave={tilt ? onLeave : undefined}
      style={tilt ? { rotateX, rotateY, transformPerspective: 1200, transformStyle: "preserve-3d" } : undefined}
      className={cn("group relative min-w-0", className)}
    >
      <div
        aria-hidden
        className={cn("pointer-events-none absolute inset-0 overflow-hidden rounded-[inherit] border transition-shadow duration-500", t.shell)}
        style={{ backgroundImage: t.bg }}
      >
        <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-white/60 to-transparent" />
        {tilt && <motion.div style={{ background: light }} className="absolute inset-0 opacity-0 transition-opacity duration-300 group-hover:opacity-100" />}
        {tilt && <motion.div aria-hidden style={{ background: edge, padding: 1.5, WebkitMask: "linear-gradient(#000 0 0) content-box exclude, linear-gradient(#000 0 0)", mask: "linear-gradient(#000 0 0) content-box exclude, linear-gradient(#000 0 0)", maskComposite: "exclude" }} className="absolute inset-0 rounded-[inherit] opacity-0 transition-opacity duration-300 group-hover:opacity-100" />}
      </div>
      <div className={cn("relative flex h-full min-w-0 flex-col", pad, TONE_TEXT[tone])} style={tilt ? { transformStyle: "preserve-3d" } : undefined}>
        {children}
      </div>
    </motion.div>
  );
}