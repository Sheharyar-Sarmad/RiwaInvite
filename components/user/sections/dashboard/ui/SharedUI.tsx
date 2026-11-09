"use client";

import * as React from "react";
import Image from "next/image";
import { motion, useInView, animate, useMotionValue, useTransform, useReducedMotion } from "framer-motion";
import { RefreshCw, TrendingUp } from "lucide-react";
import { cn, VIEW, EASE, titleCase, TONE, Z, Z_SM, TONE_TEXT, Tone } from "../constants";
import { TiltCard } from "./TiltCard";

export function Float({ children, amp = 8 }: { children: React.ReactNode; amp?: number }) {
  const reduce = useReducedMotion() ?? false;
  return (
    <motion.div animate={reduce ? undefined : { y: [0, -amp, 0], rotate: [0, 0.6, 0] }} transition={{ duration: 5.5, repeat: Infinity, ease: "easeInOut" }}>
      {children}
    </motion.div>
  );
}

export function Shimmer({ className = "" }: { className?: string }) {
  return (
    <div className={cn("relative overflow-hidden rounded-3xl bg-orange-100/70 ring-1 ring-orange-200/50", className)}>
      <motion.div aria-hidden className="absolute inset-0 bg-gradient-to-r from-transparent via-white/80 to-transparent" initial={{ x: "-100%" }} animate={{ x: "100%" }} transition={{ duration: 1.4, repeat: Infinity, ease: "linear" }} />
    </div>
  );
}

export function Reveal({ children, className, delay = 0, from = "up" }: { children: React.ReactNode; className?: string; delay?: number; from?: "up" | "left" | "right" | "scale" }) {
  const reduce = useReducedMotion() ?? false;
  const offset = { up: { y: 26 }, left: { x: -26 }, right: { x: 26 }, scale: { scale: 0.93 } }[from];
  return (
    <motion.div initial={reduce ? false : { opacity: 0, ...offset }} whileInView={{ opacity: 1, x: 0, y: 0, scale: 1 }} viewport={{ once: true, amount: 0.2, margin: "0px 0px -8% 0px" }} transition={{ duration: 0.7, delay, ease: EASE }} className={className}>
      {children}
    </motion.div>
  );
}

export function Skeleton({ className = "" }: { className?: string }) {
  return <Shimmer className={className} />;
}

export function Pic({ src, sizes, className, children }: { src: string; sizes: string; className?: string; children?: React.ReactNode }) {
  return (
    <div className={cn("relative w-full shrink-0 overflow-hidden", className)}>
      <Image src={src} alt="" aria-hidden fill sizes={sizes} className="object-cover transition-transform duration-700 group-hover:scale-[1.04]" />
      {children}
    </div>
  );
}

export function CountUp({ value }: { value: number }) {
  const ref = React.useRef<HTMLSpanElement>(null);
  const inView = useInView(ref, { once: true, amount: 0.4 });
  const mv = useMotionValue(0);
  const rounded = useTransform(mv, (v) => Math.round(v).toLocaleString());
  React.useEffect(() => {
    if (!inView) return;
    const controls = animate(mv, value, { duration: 1.1, ease: "easeOut" });
    return () => controls.stop();
  }, [value, mv, inView]);
  return <motion.span ref={ref}>{rounded}</motion.span>;
}

export function ErrorCard({ onRetry }: { onRetry: () => void }) {
  return (
    <TiltCard tone="paper" className="rounded-3xl">
      <div className="flex flex-col items-center gap-3 py-8 text-center">
        <div className="flex size-11 items-center justify-center rounded-2xl bg-rose-500 text-white shadow-lg shadow-rose-500/30"><RefreshCw className="size-5" /></div>
        <div><p className="font-bold">This section didn’t load</p><p className="mt-0.5 text-sm text-slate-700">Check your connection, then try again.</p></div>
        <button onClick={onRetry} className={cn("rounded-xl bg-orange-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-orange-700 active:scale-[0.98]")}>Try again</button>
      </div>
    </TiltCard>
  );
}

export function StatusChip({ status, dark }: { status: string; dark?: boolean }) {
  const map: Record<string, string> = {
    accepted: dark ? "bg-emerald-400/20 text-emerald-200" : "bg-emerald-500/15 text-emerald-700",
    declined: dark ? "bg-rose-400/20 text-rose-200" : "bg-rose-500/15 text-rose-700",
    pending: dark ? "bg-amber-300/20 text-amber-200" : "bg-amber-500/20 text-amber-800",
    published: dark ? "bg-emerald-400/20 text-emerald-200" : "bg-emerald-500/15 text-emerald-700",
    draft: dark ? "bg-white/15 text-orange-100" : "bg-slate-900/10 text-slate-700",
    completed: dark ? "bg-emerald-400/20 text-emerald-200" : "bg-emerald-500/15 text-emerald-700",
  };
  return <span className={cn("shrink-0 rounded-full px-2.5 py-1 text-[11px] font-bold", map[status] ?? map.draft)}>{titleCase(status)}</span>;
}

export function StatCard({ tone, label, icon: Icon, delay, chip, children }: { tone: Tone; label: string; icon: React.ElementType; delay: number; chip?: string; children: React.ReactNode }) {
  return (
    <TiltCard tone={tone} delay={delay} className="h-full rounded-3xl" pad="p-3.5 sm:p-5">
      <div className={cn("mb-3 flex items-start justify-between gap-2 sm:mb-4", Z)}>
        <span className={cn("flex size-9 items-center justify-center rounded-xl sm:size-10", TONE[tone].icon)}><Icon className="size-[18px] sm:size-5" strokeWidth={1.75} /></span>
        {chip && <span className={cn("flex items-center gap-1 rounded-full px-2 py-1 text-[10px] font-bold sm:text-[11px]", tone === "sun" ? "bg-white/25 text-white" : "bg-white/10 text-orange-400")}><TrendingUp className="size-3" />{chip}</span>}
      </div>
      <div className={Z_SM}>
        <p className={cn("text-3xl font-extrabold tracking-tighter font-[family-name:var(--font-display)] sm:text-4xl", TONE_TEXT[tone])}>{children}</p>
        <p className={cn("mt-0.5 text-[13px] font-medium sm:text-sm", TONE[tone].muted)}>{label}</p>
      </div>
    </TiltCard>
  );
}