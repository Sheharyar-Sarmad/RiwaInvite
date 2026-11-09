"use client";

import * as React from "react";
import useSWR from "swr";
import { motion, AnimatePresence } from "framer-motion";
import { Sunrise, Sun, Sunset, Moon } from "lucide-react";
import { Analytics } from "../types";
import { fetcher, TONE, EASE, VIEW, cn } from "../constants";
import { Reveal, Float, Pic, CountUp, ErrorCard, Skeleton } from "../ui/SharedUI";
import { TiltCard } from "../ui/TiltCard";

const DAY_PARTS = [{ key: "Morning", icon: Sunrise }, { key: "Afternoon", icon: Sun }, { key: "Evening", icon: Sunset }, { key: "Night", icon: Moon }] as const;

function GlowDonut({ arcs }: { arcs: any[] }) {
  return (
    <svg viewBox="0 0 100 100" className="size-full -rotate-90 overflow-visible" role="img" aria-label="Guest response breakdown">
      <circle cx="50" cy="50" r="40" fill="none" stroke="rgba(255,255,255,0.1)" strokeWidth="11" />
      {arcs.map((a, i) => a.pct > 0 && (
        <motion.circle key={a.key} cx="50" cy="50" r="40" fill="none" stroke={a.color} strokeWidth="11" strokeLinecap="round" pathLength={100} strokeDashoffset={-a.offset} style={{ filter: `drop-shadow(0 0 7px ${a.color})` }} initial={{ strokeDasharray: "0 100" }} whileInView={{ strokeDasharray: `${Math.max(a.pct - 2, 0.1)} ${100 - Math.max(a.pct - 2, 0.1)}` }} viewport={VIEW} transition={{ duration: 1.3, delay: i * 0.15, ease: EASE }} />
      ))}
    </svg>
  );
}

function TrendBars({ trend, maxV }: any) {
  const [hover, setHover] = React.useState<number | null>(null);
  return (
    <div className="relative flex h-44 items-end gap-[3px] sm:gap-1.5" onPointerLeave={() => setHover(null)}>
      {trend.map((d: any, i: number) => {
        const sum = d.accepted + d.declined;
        return (
          <div key={`${d.date}-${i}`} onPointerEnter={() => setHover(i)} onFocus={() => setHover(i)} tabIndex={0} className="relative flex h-full min-w-0 flex-1 flex-col justify-end outline-none">
            <AnimatePresence>{hover === i && <motion.div initial={{ opacity: 0, y: 6, scale: 0.95 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0 }} className="pointer-events-none absolute bottom-full left-1/2 z-20 mb-2 -translate-x-1/2 whitespace-nowrap rounded-xl bg-[#0f172a] px-3 py-2 text-xs text-white shadow-xl ring-1 ring-white/10"><p className="font-bold">{d.date}</p><p className="text-emerald-300">{d.accepted} accepted</p><p className="text-rose-300">{d.declined} declined</p></motion.div>}</AnimatePresence>
            <motion.div className={cn("flex w-full flex-col overflow-hidden rounded-t-xl transition-[filter,box-shadow] duration-200", hover === i && "brightness-110 shadow-[0_0_18px_rgba(249,115,22,0.55)]", hover !== null && hover !== i && "opacity-50")} initial={{ height: 0 }} whileInView={{ height: `${Math.max((sum / maxV) * 100, 6)}%` }} viewport={VIEW} transition={{ duration: 0.8, delay: Math.min(i, 30) * 0.015, ease: EASE }}><div className="bg-gradient-to-b from-rose-300 to-rose-400" style={{ flex: d.declined }} /><div className="bg-gradient-to-b from-emerald-400 to-emerald-600" style={{ flex: d.accepted }} /></motion.div>
          </div>
        );
      })}
    </div>
  );
}

function GlowBar({ pct, delay = 0 }: { pct: number; delay?: number }) {
  return (
    <div className={cn("h-2.5 overflow-hidden rounded-full", TONE.sun.track)}>
      <motion.div className="relative h-full rounded-full bg-gradient-to-r from-white via-amber-100 to-white shadow-[0_0_16px_rgba(255,255,255,0.95)]" initial={{ width: 0 }} whileInView={{ width: `${pct}%` }} viewport={VIEW} transition={{ duration: 1.1, delay, ease: EASE }}><motion.span aria-hidden className="absolute inset-y-0 w-10 bg-gradient-to-r from-transparent via-orange-300/70 to-transparent" animate={{ x: ["-100%", "400%"] }} transition={{ duration: 2.2, repeat: Infinity, ease: "easeInOut", delay: delay + 1 }} /></motion.div>
    </div>
  );
}

export function AnalyticsTab() {
  const { data, error, mutate } = useSWR<Analytics>("/user/dashboard/analytics", fetcher);

  if (error) return <ErrorCard onRetry={() => mutate()} />;
  if (!data) return <div className="space-y-3.5 sm:space-y-5"><Skeleton className="h-80" /><Skeleton className="h-64" /><Skeleton className="h-64" /></div>;

  const b = data.guestBreakdown ?? { accepted: 0, declined: 0, pending: 0 };
  const total = b.accepted + b.declined + b.pending;
  const rate = total ? Math.round(((b.accepted + b.declined) / total) * 100) : 0;
  const segments = [{ key: "accepted", label: "Accepted", value: b.accepted, color: "#34d399" }, { key: "declined", label: "Declined", value: b.declined, color: "#fb7185" }, { key: "pending", label: "Pending", value: b.pending, color: "#fed7aa" }];
  let offset = 0;
  const arcs = segments.map((s) => { const pct = total ? (s.value / total) * 100 : 0; const arc = { ...s, pct, offset }; offset += pct; return arc; });
  const trend = data.rsvpTrend ?? [];
  const maxV = Math.max(1, ...trend.map((d) => d.accepted + d.declined));
  const top = data.topInvitations ?? [];
  const topMax = Math.max(1, ...top.map((t) => t.total_rsvps));
  const hours = DAY_PARTS.map((p) => ({ ...p, count: data.hourlyRSVPs?.find((h) => h.time_of_day === p.key)?.count ?? 0 }));
  const hoursMax = Math.max(1, ...hours.map((h) => h.count));

  return (
    <div className="space-y-3.5 sm:space-y-5">
      <TiltCard tone="ember" className="rounded-[1.75rem]">
        <div className="flex flex-col items-center gap-6 sm:flex-row sm:gap-10">
          <div className="relative size-44 shrink-0 sm:size-52 [transform:translateZ(26px)]"><GlowDonut arcs={arcs} /><div className="absolute inset-0 flex flex-col items-center justify-center"><span className="text-3xl font-extrabold font-[family-name:var(--font-display)] text-white tracking-tighter"><CountUp value={total} /></span><span className="text-xs font-medium text-slate-300">guests invited</span></div></div>
          <Reveal from="right" className="w-full min-w-0 flex-1">
            <div className="space-y-4">
              {segments.map((s, i) => { const pct = total ? Math.round((s.value / total) * 100) : 0; return (<Reveal key={s.key} delay={i * 0.1}><div><div className="mb-1.5 flex items-center justify-between text-sm"><span className="flex items-center gap-2 font-semibold text-white"><span className="size-2.5 rounded-full" style={{ backgroundColor: s.color }} />{s.label}</span><span className="text-slate-300"><span className="font-bold text-white">{s.value}</span> · {pct}%</span></div><div className="h-2 overflow-hidden rounded-full bg-white/10"><motion.div className="h-full rounded-full" style={{ backgroundColor: s.color }} initial={{ width: 0 }} whileInView={{ width: `${pct}%` }} viewport={VIEW} transition={{ duration: 1, ease: EASE }} /></div></div></Reveal>); })}
              <Reveal from="scale" delay={0.3}><div className="grid grid-cols-2 gap-2.5 pt-1"><div className="rounded-xl bg-white/5 ring-1 ring-white/10 px-3.5 py-3"><p className="text-xs text-slate-300">Response rate</p><p className="text-xl font-extrabold text-orange-400">{rate}%</p></div><div className="rounded-xl bg-white/5 ring-1 ring-white/10 px-3.5 py-3"><p className="text-xs text-slate-300">Plus-ones</p><p className="text-xl font-extrabold text-orange-400">{data.totalPlusOnes ?? 0}</p></div></div></Reveal>
            </div>
          </Reveal>
        </div>
      </TiltCard>

      <TiltCard tone="paper" delay={0.04} className="rounded-3xl">
        {trend.length === 0 ? <div className="flex flex-col items-center gap-3 text-center"><Float><Pic src="/why-builder.png" sizes="(max-width: 640px) 90vw, 640px" className="aspect-[16/7] rounded-2xl ring-1 ring-orange-900/10" /></Float><p className="text-sm text-slate-700">Daily replies will chart here once guests respond.</p></div> : <><TrendBars trend={trend} maxV={maxV} /><Reveal delay={0.3}><div className="mt-2 flex justify-between gap-2 text-[11px] font-medium text-slate-700 sm:text-xs"><span>{trend[0].date}</span><span className="flex items-center gap-3"><span className="flex items-center gap-1.5"><span className="size-2 rounded-full bg-emerald-500" /> Accepted</span><span className="flex items-center gap-1.5"><span className="size-2 rounded-full bg-rose-400" /> Declined</span></span><span>{trend[trend.length - 1].date}</span></div></Reveal></>}
      </TiltCard>

      <div className="grid gap-3.5 sm:gap-5 md:grid-cols-2">
        <TiltCard tone="sun" delay={0.04} className="rounded-3xl">
          {top.length === 0 ? <p className="py-6 text-center text-sm text-white/90">Your most-answered invitations will rank here.</p> : <ol className="space-y-4">{top.map((t, i) => (<li key={`${t.title}-${i}`}><div className="mb-1.5 flex items-center justify-between gap-3 text-sm"><span className="flex min-w-0 items-center gap-2 font-bold text-white"><span className="flex size-6 shrink-0 items-center justify-center rounded-full bg-white/25 text-xs">{i + 1}</span><span className="truncate">{t.title}</span></span><span className="shrink-0 font-bold text-white">{t.total_rsvps}</span></div><GlowBar pct={(t.total_rsvps / topMax) * 100} delay={i * 0.06} /></li>))}</ol>}
        </TiltCard>
        <TiltCard tone="ember" delay={0.08} className="rounded-3xl">
          <div className="grid h-40 grid-cols-4 items-end gap-2.5">{hours.map((h, i) => (<div key={h.key} className="flex h-full flex-col items-center justify-end gap-2"><Reveal from="scale" delay={i * 0.08}><span className="text-xs font-bold text-orange-400">{h.count}</span></Reveal><motion.div className="w-full rounded-t-lg bg-gradient-to-t from-orange-500 to-amber-300" initial={{ height: 0 }} whileInView={{ height: `${Math.max((h.count / hoursMax) * 62, 6)}%` }} viewport={VIEW} transition={{ duration: 0.9, delay: i * 0.08, ease: EASE }} /><span className="flex flex-col items-center gap-0.5 text-[11px] text-slate-300"><h.icon className="size-3.5" />{h.key}</span></div>))}</div>
        </TiltCard>
      </div>
    </div>
  );
}