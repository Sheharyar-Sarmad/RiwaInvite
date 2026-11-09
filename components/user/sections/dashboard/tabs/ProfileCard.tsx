"use client";

import * as React from "react";
import Link from "next/link";
import { Crown, ArrowUpRight } from "lucide-react";
import { DashboardUser } from "../types";
import { TONE, Z, Z_SM, cn, FOCUS } from "../constants";
import { TiltCard } from "../ui/TiltCard";
import { useProfile } from "./Dock";

export function ProfileCard({ user }: { user: DashboardUser }) {
  const { isFree, fullName, rows } = useProfile(user);

  return (
    <div className={cn("hidden w-full xl:sticky xl:block", "xl:top-3")}>
      <TiltCard tone="ember" className="rounded-[1.75rem]" delay={0.1} pad="p-5 sm:p-6">
        <div className={cn("flex items-center gap-4", Z)}>
          <div className="relative flex size-14 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-orange-400 to-amber-500 text-xl font-bold text-white shadow-lg shadow-orange-500/40">
            {user.first_name.charAt(0).toUpperCase()}
            <span className="absolute bottom-0 right-0 size-3.5 rounded-full border-2 border-[#1e293b] bg-emerald-400" />
          </div>
          <div className="min-w-0">
            <h2 className="truncate text-lg font-bold font-[family-name:var(--font-display)] text-white">{fullName}</h2>
            <p className={cn("truncate text-sm", TONE.ember.muted)} title={user.email}>{user.email}</p>
          </div>
        </div>

        <div className="my-5 h-px bg-gradient-to-r from-transparent via-white/20 to-transparent" />

        <dl className={cn("space-y-3.5", Z_SM)}>
          {rows.map((r) => (
            <div key={r.label} className="flex items-center justify-between gap-3 text-sm">
              <dt className={cn("flex items-center gap-2", TONE.ember.muted)}><r.icon className="size-4 text-orange-400" strokeWidth={1.75} /> {r.label}</dt>
              <dd className="min-w-0 truncate text-white">{r.chip ? <span className="rounded-full bg-orange-500 px-2.5 py-1 text-xs font-bold text-white shadow-md shadow-orange-500/30">{r.value}</span> : <span className="font-semibold">{r.value}</span>}</dd>
            </div>
          ))}
        </dl>

        {isFree && (
          <Link href="/plans" className={cn("group/up mt-6 flex items-center justify-between rounded-xl bg-gradient-to-r from-orange-500 to-amber-400 px-4 py-3 text-sm font-bold text-white shadow-lg shadow-orange-500/30 transition hover:brightness-110", Z, FOCUS)}>
            <span className="flex items-center gap-2"><Crown className="size-4" /> Upgrade to Pro</span>
            <ArrowUpRight className="size-4 transition-transform group-hover/up:-translate-y-0.5 group-hover/up:translate-x-0.5" />
          </Link>
        )}
      </TiltCard>
    </div>
  );
}