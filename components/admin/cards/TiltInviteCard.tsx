"use client";

import Image from "next/image";
import { useRef } from "react";
import { motion, useMotionValue, useSpring, useTransform, useMotionTemplate } from "framer-motion";
import { CalendarDays, MapPin } from "lucide-react";

/** Pointer-driven 3D card; inner layers sit at different depths. */
export function TiltInviteCard() {
  const ref = useRef<HTMLDivElement>(null);
  const px = useMotionValue(0.5);
  const py = useMotionValue(0.5);

  const spring = { stiffness: 150, damping: 18, mass: 0.6 };
  const rotateY = useSpring(useTransform(px, [0, 1], [-14, 14]), spring);
  const rotateX = useSpring(useTransform(py, [0, 1], [12, -12]), spring);
  const gx = useTransform(px, [0, 1], [0, 100]);
  const gy = useTransform(py, [0, 1], [0, 100]);
  const glare = useMotionTemplate`radial-gradient(420px circle at ${gx}% ${gy}%, rgba(255,255,255,0.75), transparent 55%)`;

  const onMove = (e: React.PointerEvent) => {
    const r = ref.current?.getBoundingClientRect();
    if (!r) return;
    px.set((e.clientX - r.left) / r.width);
    py.set((e.clientY - r.top) / r.height);
  };
  const reset = () => {
    px.set(0.5);
    py.set(0.5);
  };

  return (
    <div className="[perspective:1200px]" onPointerMove={onMove} onPointerLeave={reset}>
      <motion.div
        ref={ref}
        style={{ rotateX, rotateY, transformStyle: "preserve-3d" }}
        className="relative w-[320px] rounded-[28px] border border-white/70 bg-white/45 p-5 shadow-[0_30px_80px_-20px_rgba(229,86,11,0.35)] backdrop-blur-2xl sm:w-[360px]"
      >
        <motion.div style={{ background: glare }} className="pointer-events-none absolute inset-0 rounded-[28px] mix-blend-soft-light" />

        <div style={{ transform: "translateZ(50px)" }} className="flex items-center justify-between">
          <div className="relative h-11 w-11 overflow-hidden rounded-xl bg-black ring-1 ring-orange-300/60">
            <Image src="/logo.png" alt="Riwa Invite" fill sizes="44px" className="object-cover" />
          </div>
          <span className="rounded-full bg-orange-500/10 px-3 py-1 text-xs font-medium text-orange-700">12 of 40 replied</span>
        </div>

        <div style={{ transform: "translateZ(80px)" }} className="mt-7">
          <p className="text-sm text-stone-500">You&apos;re invited to</p>
          <h3 className="mt-1 text-[28px] font-semibold leading-8 tracking-tight text-stone-900">
            Sara &amp; Hamza&apos;s Mehndi Night
          </h3>
        </div>

        <div style={{ transform: "translateZ(40px)" }} className="mt-6 space-y-2.5 text-sm text-stone-700">
          <div className="flex items-center gap-2.5">
            <CalendarDays className="h-4 w-4 text-orange-600" /> Saturday, 14 Nov · 7:30 PM
          </div>
          <div className="flex items-center gap-2.5">
            <MapPin className="h-4 w-4 text-orange-600" /> Lahore Gymkhana, Main Lawn
          </div>
        </div>

        <div style={{ transform: "translateZ(60px)" }} className="mt-7 flex gap-2">
          <button className="h-11 flex-1 rounded-xl bg-gradient-to-b from-orange-400 to-orange-600 text-sm font-semibold text-white shadow-[0_8px_20px_-6px_rgba(234,88,12,0.7)] transition active:scale-[0.98]">
            Accept
          </button>
          <button className="h-11 flex-1 rounded-xl border border-orange-200 bg-white/70 text-sm font-medium text-stone-800 transition hover:bg-white">
            Can&apos;t make it
          </button>
        </div>
      </motion.div>
    </div>
  );
}