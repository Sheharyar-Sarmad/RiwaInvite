"use client";

import * as React from "react";
import Link from "next/link";
import useSWR from "swr";
import { motion, useReducedMotion } from "framer-motion";
import { Mail, UserCheck, Users, Link2, Trophy, ArrowUpRight } from "lucide-react";
import { Overview } from "../types";
import { fetcher, TONE, EASE, VIEW, cn, fmtDate, timeAgo, FOCUS } from "../constants";
import { Reveal, Float, Pic, CountUp, ErrorCard, StatusChip, StatCard, Skeleton, Shimmer } from "../ui/SharedUI";
import { TiltCard } from "../ui/TiltCard";

const listV = { hidden: {}, show: { transition: { staggerChildren: 0.07, delayChildren: 0.1 } } };
const itemV = { hidden: { opacity: 0, y: 16, scale: 0.98 }, show: { opacity: 1, y: 0, scale: 1, transition: { duration: 0.55, ease: EASE } } };

export function OverviewTab() {
  const { data, error, mutate } = useSWR<Overview>("/user/dashboard/overview", fetcher);
  const reduce = useReducedMotion() ?? false;

  if (error) return <ErrorCard onRetry={() => mutate()} />;
  if (!data) return <OverviewSkeleton />;

  const stats = {
    totalInvitations: data.stats?.totalInvitations ?? 0, activeInvitations: data.stats?.activeInvitations ?? 0,
    totalRSVPs: data.stats?.totalRSVPs ?? 0, totalGuests: data.stats?.totalGuests ?? 0,
    rsvpsThisWeek: data.stats?.rsvpsThisWeek ?? 0, guestsThisWeek: data.stats?.guestsThisWeek ?? 0,
  };
  const recentInvitations = data.recentInvitations ?? [];
  const recentRSVPs = data.recentRSVPs ?? [];
  const top = data.mostActiveInvitation ?? null;
  const slugs = data.actionItems?.unclaimedCustomSlugs ?? 0;
  const loop = recentRSVPs.length > 3 && !reduce;
  const feed = loop ? [...recentRSVPs, ...recentRSVPs] : recentRSVPs;

  return (
    <div className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-6 lg:auto-rows-[minmax(0,auto)]">
      <div className="col-span-1 lg:col-span-2"><Reveal delay={0} className="h-full"><StatCard tone="ember" label="Invitations" icon={Mail} delay={0} chip={stats.activeInvitations ? `${stats.activeInvitations} live` : undefined}><CountUp value={stats.totalInvitations} /></StatCard></Reveal></div>
      <div className="col-span-1 lg:col-span-2"><Reveal delay={0.08} className="h-full"><StatCard tone="paper" label="Accepted RSVPs" icon={UserCheck} delay={0.06} chip={stats.rsvpsThisWeek ? `+${stats.rsvpsThisWeek}` : undefined}><CountUp value={stats.totalRSVPs} /></StatCard></Reveal></div>
      <div className="col-span-2 lg:col-span-2"><Reveal delay={0.16} className="h-full"><StatCard tone="sun" label="Expected guests" icon={Users} delay={0.12} chip={stats.guestsThisWeek ? `+${stats.guestsThisWeek}` : undefined}><CountUp value={stats.totalGuests} /></StatCard></Reveal></div>

      <div className="col-span-2 lg:col-span-4">
        <TiltCard tone="ember" delay={0.18} className="h-full rounded-[1.75rem]" pad="p-5 sm:p-7">
          <motion.div aria-hidden className="pointer-events-none absolute -inset-x-1/3 inset-y-0 rounded-[inherit] opacity-70" style={{ background: "linear-gradient(100deg, transparent 20%, rgba(249,115,22,0.28) 45%, rgba(251,191,36,0.2) 55%, transparent 80%)" }} animate={reduce ? undefined : { x: ["-20%", "40%", "-20%"] }} transition={{ duration: 12, repeat: Infinity, ease: "easeInOut" }} />
          <Reveal from="left" delay={0.15}><div className={cn("relative flex items-center gap-5", "[transform:translateZ(26px)]")}>
            <span className="flex size-14 shrink-0 items-center justify-center rounded-2xl bg-white/10 text-orange-400 ring-1 ring-white/20 sm:size-16"><Trophy className="size-7" strokeWidth={1.75} /></span>
            <div className="min-w-0 flex-1"><p className="text-xs font-semibold text-slate-400">Most active invitation</p><p className="truncate text-2xl font-extrabold tracking-tighter text-white sm:text-4xl font-[family-name:var(--font-display)]" title={top?.title}>{top ? top.title : "No replies yet"}</p><p className="mt-1 text-sm font-medium text-slate-300">{top ? `${top.rsvp_count} guest replies and counting` : "Your top invitation shows here"}</p></div>
            {top && <span className="hidden text-5xl font-extrabold tracking-tighter text-orange-400 sm:block font-[family-name:var(--font-display)]"><CountUp value={top.rsvp_count} /></span>}
          </div></Reveal>
        </TiltCard>
      </div>

      <div className="col-span-2 lg:col-span-2 lg:row-span-2">
        <TiltCard tone="ember" delay={0.2} className="h-full rounded-[1.75rem]">
          <div className="mb-4 flex items-center justify-between gap-3"><h3 className="truncate text-base font-bold tracking-tight font-[family-name:var(--font-display)] sm:text-lg">Latest replies</h3><Link href="/dashboard/rsvps" className="rounded-md text-sm font-semibold text-orange-400 hover:text-orange-300">View all</Link></div>
          {recentRSVPs.length === 0 ? <Float><Pic src="/why-rsvp.png" sizes="(max-width: 640px) 90vw, 400px" className="aspect-[4/3] rounded-2xl ring-1 ring-white/15"><div className="absolute inset-x-2.5 bottom-2.5 rounded-xl bg-[#431407]/90 px-3.5 py-3 backdrop-blur"><p className="text-sm font-bold text-white">No replies yet</p><p className="text-xs text-orange-100/80">Share an invitation link and replies will appear here.</p></div></Pic></Float> : (
            <Reveal from="up" delay={0.2}><div className="relative h-[26rem] overflow-hidden lg:h-full lg:min-h-[26rem]" style={{ maskImage: "linear-gradient(to bottom, transparent, #000 10%, #000 90%, transparent)" }}><motion.ul className="space-y-2" animate={loop ? { y: ["0%", "-50%"] } : undefined} transition={loop ? { duration: recentRSVPs.length * 4, repeat: Infinity, ease: "linear" } : undefined}>{feed.map((r, i) => { const hue = r.attendance_status === "accepted" ? "from-emerald-400 to-emerald-600" : r.attendance_status === "declined" ? "from-rose-400 to-rose-600" : "from-amber-400 to-orange-500"; return (<li key={`${r.guest_name}-${i}`} aria-hidden={loop && i >= recentRSVPs.length} className="flex items-center gap-3 rounded-2xl bg-white/5 ring-1 ring-white/10 p-3 transition hover:bg-white/10"><span className={cn("flex size-10 shrink-0 items-center justify-center rounded-full bg-gradient-to-br text-sm font-bold text-white", hue)}>{r.guest_name.charAt(0).toUpperCase()}</span><div className="min-w-0 flex-1"><p className="truncate text-sm font-bold text-white">{r.guest_name}</p><p className="truncate text-xs text-slate-300">{r.invitation_title} · {r.number_of_guests} guest{r.number_of_guests === 1 ? "" : "s"}</p></div><div className="flex shrink-0 flex-col items-end gap-1"><StatusChip status={r.attendance_status} dark /><span className="text-[11px] text-slate-400">{timeAgo(r.created_at)}</span></div></li>); })}</motion.ul></div></Reveal>
          )}
        </TiltCard>
      </div>

      {slugs > 0 && (
        <div className="col-span-2 lg:col-span-4">
          <TiltCard tone="paper" delay={0.05} className="rounded-3xl" pad="p-3 sm:p-4">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:gap-5">
              <Float amp={5}><Pic src="/why-slugs.png" sizes="(max-width: 640px) 90vw, 200px" className="aspect-[16/8] rounded-2xl ring-1 ring-orange-900/10 sm:aspect-[16/10] sm:w-44" /></Float>
              <Reveal from="right" className="min-w-0 flex-1"><div><p className="flex items-center gap-2 font-bold"><Link2 className="size-4 text-orange-600" />{slugs} custom slug{slugs > 1 ? "s" : ""} ready to use</p><p className="mt-0.5 text-sm text-slate-700">Pick an invitation and give it a link your guests will remember.</p></div></Reveal>
              <Reveal from="right" delay={0.1}><Link href="/dashboard/invitations" className={cn("inline-flex items-center justify-center gap-2 rounded-full bg-orange-600 px-5 py-3 text-sm font-semibold text-white transition hover:bg-orange-700 active:scale-[0.97] sm:py-2.5", FOCUS)}>Choose invitation <ArrowUpRight className="size-4" /></Link></Reveal>
            </div>
          </TiltCard>
        </div>
      )}

      <div className="col-span-2 lg:col-span-4">
        <TiltCard tone="paper" className="h-full rounded-3xl">
          <div className="mb-4 flex items-center justify-between gap-3"><h3 className="truncate text-base font-bold tracking-tight font-[family-name:var(--font-display)] sm:text-lg">Recent invitations</h3><Link href="/dashboard/invitations" className="rounded-md text-sm font-semibold text-orange-600 hover:text-orange-700">View all</Link></div>
          {recentInvitations.length === 0 ? <Float><Pic src="/why-builder.png" sizes="(max-width: 640px) 90vw, 640px" className="aspect-[4/3] rounded-2xl shadow-[0_20px_50px_-20px_rgba(249,115,22,0.6)] ring-1 ring-orange-900/10 sm:aspect-[16/8]"><div className="absolute inset-x-2.5 bottom-2.5 flex flex-col gap-2.5 rounded-xl bg-[#431407]/90 px-3.5 py-3 backdrop-blur sm:flex-row sm:items-center sm:justify-between"><p className="text-sm font-bold text-white">Create your first invitation</p><Link href="/dashboard/library" className={cn("inline-flex items-center justify-center gap-1.5 rounded-full bg-orange-500 px-3.5 py-2 text-xs font-bold text-white transition hover:bg-orange-400", FOCUS)}>Browse templates <ArrowUpRight className="size-3.5" /></Link></div></Pic></Float> : (
            <motion.ul variants={listV} initial="hidden" whileInView="show" viewport={VIEW} className="space-y-2.5">
              {recentInvitations.map((item) => (
                <motion.li key={item.id} variants={itemV} className="flex items-center justify-between gap-3 rounded-2xl bg-white/80 ring-1 ring-orange-50 p-3 transition hover:bg-white sm:p-3.5">
                  <div className="flex min-w-0 items-center gap-3"><span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-orange-500 to-amber-400 text-white shadow-lg shadow-orange-500/30 sm:size-11"><Mail className="size-5" strokeWidth={1.75} /></span><div className="min-w-0"><h4 className="truncate font-bold">{item.title}</h4><p className="mt-0.5 truncate text-xs text-slate-600">{item.slug ? `/invite/${item.slug}` : "No custom link"} · {fmtDate(item.created_at)}</p></div></div>
                  <div className="flex shrink-0 items-center gap-3"><div className="hidden text-right min-[420px]:block"><p className="text-lg font-extrabold leading-none tracking-tighter">{item.rsvp_count}</p><p className="text-[11px] text-slate-600">guests</p></div><StatusChip status={item.status} /></div>
                </motion.li>
              ))}
            </motion.ul>
          )}
        </TiltCard>
      </div>
    </div>
  );
}

function OverviewSkeleton() {
  return (
    <div className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-6">
      <Shimmer className="h-32 lg:col-span-2 sm:h-40" />
      <Shimmer className="h-32 lg:col-span-2 sm:h-40" />
      <Shimmer className="col-span-2 h-32 sm:h-40 lg:col-span-2" />
      <Shimmer className="col-span-2 h-36 lg:col-span-4" />
      <Shimmer className="col-span-2 h-72 lg:col-span-2 lg:row-span-2 lg:h-auto" />
      <Shimmer className="col-span-2 h-64 lg:col-span-4" />
    </div>
  );
}