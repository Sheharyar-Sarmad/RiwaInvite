"use client";

import * as React from "react";
import Link from "next/link";
import useSWR from "swr";
import { motion } from "framer-motion";
import { ShieldCheck, Wallet, Crown, CreditCard, Receipt, ArrowUpRight } from "lucide-react";
import { Billing } from "../types";
import { fetcher, TONE, EASE, VIEW, cn, money, fmtDate, titleCase, FOCUS, Z, Z_SM } from "../constants";
import { Reveal, Float, Pic, ErrorCard, StatusChip, Skeleton } from "../ui/SharedUI";
import { TiltCard } from "../ui/TiltCard";
import { Scene3D } from "../ui/Scene3D";

const listV = { hidden: {}, show: { transition: { staggerChildren: 0.07, delayChildren: 0.1 } } };
const itemV = { hidden: { opacity: 0, y: 16, scale: 0.98 }, show: { opacity: 1, y: 0, scale: 1, transition: { duration: 0.55, ease: EASE } } };

export function BillingTab() {
  const { data, error, mutate } = useSWR<Billing>("/user/dashboard/billing", fetcher);

  if (error) return <ErrorCard onRetry={() => mutate()} />;
  if (!data) return <div className="space-y-3.5 sm:space-y-5"><div className="grid gap-3.5 sm:grid-cols-2"><Skeleton className="h-44" /><Skeleton className="h-44" /></div><Skeleton className="h-64" /></div>;

  const sub = data.activeSubscription;
  const orders = data.recentOrders ?? [];

  return (
    <div className="space-y-3.5 sm:space-y-5">
      <div className="grid gap-3.5 sm:grid-cols-2 sm:gap-5">
        <TiltCard tone="sun" className="rounded-3xl">
          <Scene3D className="pointer-events-none absolute -right-1 -top-1 size-24 sm:size-28" />
          <div className={cn("flex items-center gap-2 text-sm font-semibold", TONE.sun.muted)}><ShieldCheck className="size-4" /> Current plan</div>
          <Reveal delay={0.1}><p className={cn("mt-2 text-3xl font-extrabold font-[family-name:var(--font-display)] text-white tracking-tighter", Z)}>{sub?.plan_name || "Free Tier"}</p></Reveal>
          <Reveal delay={0.2}><div className={cn("mt-1 text-sm", TONE.sun.muted)}>{sub ? <>{money(sub.price)} · renews {fmtDate(sub.expires_at)}</> : "Upgrade whenever your event grows."}</div></Reveal>
          {!sub && <Reveal from="up" delay={0.25}><Link href="/plans" className={cn("mt-5 inline-flex w-fit items-center gap-2 rounded-xl bg-white px-4 py-2.5 text-sm font-bold text-orange-600 shadow-lg shadow-orange-900/20 transition hover:bg-orange-50 active:scale-[0.98]", Z_SM, FOCUS)}><Crown className="size-4" /> Upgrade to Pro</Link></Reveal>}
        </TiltCard>

        <TiltCard tone="ember" delay={0.08} className="rounded-3xl">
          <div className={cn("flex items-center gap-2 text-sm font-semibold", TONE.ember.muted)}><Wallet className="size-4 text-orange-400" /> Lifetime spend</div>
          <Reveal from="scale"><p className={cn("mt-2 text-3xl font-extrabold font-[family-name:var(--font-display)] text-white tracking-tighter", Z)}>{money(data.lifetimeSpend ?? 0)}</p></Reveal>
          <p className={cn("mt-1 text-sm", TONE.ember.muted)}>Across {orders.length} completed order{orders.length === 1 ? "" : "s"}</p>
        </TiltCard>
      </div>

      {!sub && (
        <TiltCard tone="ember" delay={0.04} className="rounded-3xl" pad="p-3 sm:p-4">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:gap-5">
            <Float amp={5}><Pic src="/why-plans.png" sizes="(max-width: 640px) 90vw, 220px" className="aspect-[16/8] rounded-2xl ring-1 ring-white/15 sm:aspect-[16/10] sm:w-48" /></Float>
            <div className={cn("min-w-0 flex-1", Z_SM)}><p className="font-bold text-white">Pay for the size of your event</p><p className={cn("mt-0.5 text-sm", TONE.ember.muted)}>Pro unlocks premium templates and room for bigger guest lists.</p></div>
            <Reveal from="up" delay={0.25}><Link href="/plans" className={cn("inline-flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-orange-500 to-amber-400 px-4 py-3 text-sm font-bold text-white shadow-lg shadow-orange-500/30 transition hover:brightness-110 active:scale-[0.98] sm:py-2.5", FOCUS)}>See plans <ArrowUpRight className="size-4" /></Link></Reveal>
          </div>
        </TiltCard>
      )}

      <TiltCard tone="paper" className="rounded-3xl">
        <div className="mb-4 flex items-center justify-between gap-3"><h3 className="truncate text-base font-bold tracking-tight font-[family-name:var(--font-display)] sm:text-lg">Payment history</h3><Link href="/dashboard/billing" className="rounded-md text-sm font-semibold text-orange-600 hover:text-orange-700">Full billing</Link></div>
        {orders.length === 0 ? (
          <div className="flex flex-col items-center gap-2 py-6 text-center"><span className={cn("flex size-11 items-center justify-center rounded-2xl", TONE.paper.icon)}><CreditCard className="size-5" /></span><p className="text-sm text-slate-700">No payments yet. Completed orders will be listed here.</p></div>
        ) : (
          <motion.ul variants={listV} initial="hidden" whileInView="show" viewport={VIEW} className="space-y-2">
            {orders.map((o) => (<motion.li key={o.id} variants={itemV} className="flex items-center justify-between gap-3 rounded-2xl bg-white/80 ring-1 ring-orange-50 p-3 transition hover:bg-white sm:p-3.5"><div className="flex min-w-0 items-center gap-3"><span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-rose-500 to-orange-500 text-white shadow-lg shadow-rose-500/25"><Receipt className="size-4" strokeWidth={1.75} /></span><div className="min-w-0"><p className="truncate font-bold">{titleCase(o.order_type || "Order")}</p><p className="truncate text-xs text-slate-600">{fmtDate(o.created_at)}{o.provider_order_id ? ` · ${o.provider_order_id}` : ""}</p></div></div><div className="flex shrink-0 flex-col items-end gap-1"><span className="font-extrabold tracking-tighter">{money(o.amount)}</span><StatusChip status={o.status} /></div></motion.li>))}
          </motion.ul>
        )}
      </TiltCard>
    </div>
  );
}