"use client";

/**
 * components/user/sections/rehearsal/ui/PlanAllowanceStrip.tsx
 * "Your plan: x used, y left" strip shown above the template grid.
 * One pip per unlock, same language as the billing page.
 */

import * as React from "react";
import Link from "next/link";
import { Crown, Mail } from "lucide-react";
import { HEADING, cn } from "@/components/user/sections/dashboard/ui/DashboardUI";
import { FOCUS } from "@/components/user/navigation/UserSidebar";
import { SURFACE } from "@/components/user/sections/library/ui/LibraryUI";
import type { Bucket, PlanAllowance } from "../usePlanAllowance";

function Row({
  label,
  icon: Icon,
  b,
  on,
  off,
}: {
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  b: Bucket;
  on: string;
  off: string;
}) {
  const pips = b.max > 0 && b.max <= 12;
  return (
    <div className="min-w-0 flex-1">
      <div className="flex items-baseline justify-between gap-2 text-[13px]">
        <span className="inline-flex items-center gap-1.5 font-semibold text-[#2a1002]">
          <Icon className="size-4 text-stone-400" /> {label}
        </span>
        <span className="tabular-nums text-stone-500">
          <span className={cn(HEADING, "text-base text-[#2a1002]")}>{b.used}</span> / {b.max} used
        </span>
      </div>
      <div
        role="progressbar"
        aria-label={`${label} unlocks used`}
        aria-valuemin={0}
        aria-valuemax={b.max}
        aria-valuenow={Math.min(b.used, b.max)}
        className={cn("mt-2 flex gap-1", !pips && "h-2.5 overflow-hidden rounded-full", !pips && off)}
      >
        {pips ? (
          Array.from({ length: b.max }).map((_, i) => (
            <span key={i} className={cn("h-2.5 flex-1 rounded-full", i < b.used ? on : off)} />
          ))
        ) : (
          <span
            className={cn("block h-full rounded-full", on)}
            style={{ width: `${b.max ? Math.min(100, (b.used / b.max) * 100) : 0}%` }}
          />
        )}
      </div>
      <p className={cn("mt-1 text-xs tabular-nums", b.max > 0 && b.left === 0 ? "font-semibold text-rose-600" : "text-stone-500")}>
        {b.max === 0 ? "Not part of your plan" : b.left === 0 ? "None left" : `${b.left} left`}
      </p>
    </div>
  );
}

export function PlanAllowanceStrip({ allowance }: { allowance: PlanAllowance | null }) {
  const sub = allowance?.subscription;
  if (!allowance || !sub) return null;
  return (
    <section aria-label="Your plan allowance" className={cn("rounded-2xl p-3.5 sm:p-4", SURFACE)}>
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-sm font-bold text-[#2a1002]">
          {sub.planName}
          <span className="ml-2 text-xs font-medium text-stone-500">
            {sub.daysRemaining} {sub.daysRemaining === 1 ? "day" : "days"} left
          </span>
        </p>
        <Link href="/dashboard/billing" className={cn("text-xs font-semibold text-orange-700 hover:underline", FOCUS)}>
          View billing
        </Link>
      </div>
      <div className="mt-3 flex flex-col gap-4 sm:flex-row sm:gap-6">
        <Row label="Simple" icon={Mail} b={allowance.simple} on="bg-orange-500" off="bg-orange-100" />
        <Row label="Premium" icon={Crown} b={allowance.premium} on="bg-amber-500" off="bg-amber-100" />
      </div>
    </section>
  );
}