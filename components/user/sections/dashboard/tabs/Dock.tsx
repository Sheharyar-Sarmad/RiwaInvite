"use client";

import * as React from "react";
import Link from "next/link";
import useSWR from "swr";
import { motion, AnimatePresence, useMotionValue, useTransform, useMotionTemplate } from "framer-motion";
import { ChevronDown, ShieldCheck, CalendarDays, LayoutTemplate, Crown, Phone, ArrowUpRight } from "lucide-react";
import { DashboardUser, Billing, Overview } from "../types";
import { TABS, TabId, fetcher, EASE, STICKY_TOP, cn, FOCUS } from "../constants";

type ProfileRow = { icon: React.ElementType; label: string; value: string; chip?: boolean };

export function useProfile(user: DashboardUser) {
  const { data: billing } = useSWR<Billing>("/user/dashboard/billing", fetcher);
  const { data: overview } = useSWR<Overview>("/user/dashboard/overview", fetcher);

  const sub = billing?.activeSubscription;
  const planName = sub?.plan_name || "Free Tier";
  const isFree = !!billing && !sub;
  const fullName = `${user.first_name} ${user.last_name || ""}`.trim();
  const memberSince = user.created_at ? new Date(user.created_at).toLocaleDateString("en-US", { month: "short", year: "numeric", timeZone: "UTC" }) : null;

  const rows = [
    { icon: ShieldCheck, label: "Plan", value: planName, chip: true },
    memberSince && { icon: CalendarDays, label: "Member since", value: memberSince },
    overview?.planUsage && { icon: LayoutTemplate, label: "Simple templates", value: String(overview.planUsage.max_simple_templates) },
    overview?.planUsage && { icon: Crown, label: "Premium templates", value: String(overview.planUsage.max_premium_templates) },
    user.phone_number && { icon: Phone, label: "Phone", value: user.phone_number },
  ].filter(Boolean) as ProfileRow[];

  return { planName, isFree, fullName, rows };
}

export function DockShell({ children }: { children: React.ReactNode }) {
  const y = useMotionValue(0);
  React.useEffect(() => {
    const on = () => y.set(window.scrollY);
    on();
    window.addEventListener("scroll", on, { passive: true });
    return () => window.removeEventListener("scroll", on);
  }, [y]);
  const blur = useTransform(y, [0, 180], [8, 30]);
  const alpha = useTransform(y, [0, 180], [0.7, 0.92]);
  const filter = useMotionTemplate`blur(${blur}px) saturate(1.6)`;
  const bg = useMotionTemplate`rgba(255,255,255,${alpha})`;
  return (
    <div className={cn("sticky z-30", STICKY_TOP)}>
      <motion.div style={{ backdropFilter: filter, WebkitBackdropFilter: filter, backgroundColor: bg }} className="overflow-hidden rounded-2xl border border-white/70 shadow-[inset_0_1px_0_#fff,0_18px_40px_-18px_rgba(154,52,18,0.6)] ring-1 ring-orange-200/70">
        {children}
      </motion.div>
    </div>
  );
}

export function Dock({ user, tab, onTab }: { user: DashboardUser; tab: TabId; onTab: (t: TabId) => void }) {
  const [open, setOpen] = React.useState(false);
  const { planName, isFree, fullName, rows } = useProfile(user);

  return (
    <DockShell>
      <div className="border-b border-orange-100 xl:hidden">
        <button onClick={() => setOpen((v) => !v)} aria-expanded={open} className={cn("flex w-full items-center gap-3 px-3 py-2 text-left", FOCUS)}>
          <span className="relative flex size-9 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-orange-400 to-orange-600 text-sm font-bold text-white shadow-md shadow-orange-500/30">
            {user.first_name.charAt(0).toUpperCase()}
            <span className="absolute -bottom-0.5 -right-0.5 size-3 rounded-full border-2 border-white bg-emerald-400" />
          </span>
          <span className="min-w-0 flex-1">
            <span className="block truncate text-sm font-bold text-slate-900">{fullName}</span>
            <span className="block truncate text-[11px] text-slate-600">{user.email}</span>
          </span>
          <span className="shrink-0 rounded-full bg-orange-500 px-2 py-0.5 text-[11px] font-bold text-white">{planName}</span>
          <ChevronDown className={cn("size-4 shrink-0 text-slate-500 transition-transform duration-300", open && "rotate-180")} />
        </button>
        <AnimatePresence initial={false}>
          {open && (
            <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} exit={{ height: 0, opacity: 0 }} transition={{ duration: 0.3, ease: EASE }} className="overflow-hidden">
              <dl className="grid grid-cols-2 gap-2 px-3 pb-3">
                {rows.filter((r) => !r.chip).map((r) => (
                  <div key={r.label} className="min-w-0 rounded-xl bg-orange-50 px-3 py-2 ring-1 ring-orange-200/60">
                    <dt className="flex items-center gap-1.5 text-[11px] text-slate-600"><r.icon className="size-3.5 text-orange-600" strokeWidth={1.75} /> {r.label}</dt>
                    <dd className="mt-0.5 truncate text-sm font-bold text-slate-900">{r.value}</dd>
                  </div>
                ))}
                {isFree && <Link href="/plans" className={cn("col-span-2 flex items-center justify-between rounded-xl bg-gradient-to-r from-orange-500 to-amber-400 px-3.5 py-2.5 text-sm font-bold text-white shadow-md shadow-orange-500/30 active:scale-[0.98]", FOCUS)}><span className="flex items-center gap-2"><Crown className="size-4" /> Upgrade to Pro</span><ArrowUpRight className="size-4" /></Link>}
              </dl>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      <div role="tablist" aria-label="Dashboard sections" className="grid grid-cols-4 gap-1 p-1.5">
        {TABS.map((t) => {
          const Icon = t.icon;
          const active = tab === t.id;
          return (
            <button key={t.id} role="tab" aria-selected={active} onClick={() => onTab(t.id)} className={cn("relative flex flex-col items-center justify-center gap-0.5 rounded-full px-1 py-2 text-[11px] font-semibold transition-colors sm:flex-row sm:gap-2 sm:px-3 sm:py-2.5 sm:text-sm", FOCUS, active ? "text-white" : "text-slate-600 hover:text-slate-900")}>
              {active && <motion.span layoutId="dash-tab" className="absolute inset-0 rounded-full bg-gradient-to-br from-orange-500 via-orange-500 to-amber-400 shadow-[0_0_24px_rgba(249,115,22,0.7),inset_0_1px_0_rgba(255,255,255,0.5)]" transition={{ type: "spring", stiffness: 520, damping: 30, mass: 0.7 }} />}
              <motion.span whileTap={{ scale: 0.85 }} className="relative flex items-center gap-2"><Icon className="size-4" strokeWidth={active ? 2.25 : 1.75} /><span>{t.label}</span></motion.span>
            </button>
          );
        })}
      </div>
    </DockShell>
  );
}