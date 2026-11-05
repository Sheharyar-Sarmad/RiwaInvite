"use client";

import { motion, useMotionTemplate, useTransform, type MotionValue } from "framer-motion";

/**
 * Drop this as the FIRST child of the card. The card needs `isolate`
 * so the -z-10 layers stay inside it and sit behind your content.
 *
 * mx / my: optional pointer position in the range -0.5..0.5 (same values
 * your tilt logic already uses). Without them the spotlight rests at the top.
 */
export function CardBackdrop({
  reduce,
  mx,
  my,
}: {
  reduce: boolean;
  mx?: MotionValue<number>;
  my?: MotionValue<number>;
}) {
  const fallback = { get: () => 0 } as unknown as MotionValue<number>;
  const left = useTransform(mx ?? fallback, [-0.5, 0.5], [0, 100]);
  const top = useTransform(my ?? fallback, [-0.5, 0.5], [0, 100]);
  const spot = useMotionTemplate`radial-gradient(380px circle at ${left}% ${top}%, rgba(255,255,255,0.85), rgba(255,255,255,0) 60%)`;

  return (
    <div
      aria-hidden
      className="pointer-events-none absolute inset-0 -z-10 overflow-hidden rounded-[2rem]"
    >
      {/* base: warm cream to peach to soft apricot */}
      <div className="absolute inset-0 bg-[linear-gradient(160deg,#fffdfa_0%,#fff1e2_45%,#ffd9b8_100%)]" />

      {/* drifting aurora blobs */}
      <motion.div
        className="absolute -left-24 -top-24 h-72 w-72 rounded-full bg-orange-400/45 blur-3xl"
        animate={reduce ? undefined : { x: [0, 60, 10, 0], y: [0, 30, 70, 0] }}
        transition={{ duration: 16, repeat: Infinity, ease: "easeInOut" }}
      />
      <motion.div
        className="absolute -bottom-28 -right-20 h-80 w-80 rounded-full bg-amber-300/60 blur-3xl"
        animate={reduce ? undefined : { x: [0, -50, -10, 0], y: [0, -40, -10, 0] }}
        transition={{ duration: 19, repeat: Infinity, ease: "easeInOut" }}
      />
      <motion.div
        className="absolute right-[-3rem] top-1/3 h-56 w-56 rounded-full bg-rose-300/40 blur-3xl"
        animate={reduce ? undefined : { x: [0, -30, 0], y: [0, 40, 0] }}
        transition={{ duration: 14, repeat: Infinity, ease: "easeInOut" }}
      />

      {/* fine dot texture, echoes the page background */}
      <div
        className="absolute inset-0 opacity-[0.35]"
        style={{
          backgroundImage: "radial-gradient(rgba(234,88,12,0.35) 1px, transparent 1px)",
          backgroundSize: "18px 18px",
          maskImage: "linear-gradient(180deg, transparent 0%, #000 55%, transparent 100%)",
          WebkitMaskImage: "linear-gradient(180deg, transparent 0%, #000 55%, transparent 100%)",
        }}
      />

      {/* cursor spotlight */}
      <motion.div className="absolute inset-0 mix-blend-soft-light" style={{ background: spot }} />

      {/* glass sheen along the top edge + inner rim */}
      <div className="absolute inset-x-0 top-0 h-24 bg-gradient-to-b from-white/80 to-transparent" />
      <div className="absolute inset-0 rounded-[2rem] shadow-[inset_0_0_0_1px_rgba(255,255,255,0.7),inset_0_-30px_60px_-30px_rgba(249,115,22,0.35)]" />
    </div>
  );
}