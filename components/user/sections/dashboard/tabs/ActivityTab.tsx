"use client";

import * as React from "react";
import useSWR from "swr";
import { motion } from "framer-motion";
import { Bell, UserCheck, Receipt, Clock, ChevronRight } from "lucide-react";
import { ActivityItem } from "../types";
import { fetcher, EASE, VIEW, cn, timeAgo, FOCUS } from "../constants";
import { Float, Pic, ErrorCard, Skeleton } from "../ui/SharedUI";
import { TiltCard } from "../ui/TiltCard";
import { ActivitySheet } from "./ActivitySheet";

const listV = { hidden: {}, show: { transition: { staggerChildren: 0.07, delayChildren: 0.1 } } };
const itemV = { hidden: { opacity: 0, y: 16, scale: 0.98 }, show: { opacity: 1, y: 0, scale: 1, transition: { duration: 0.55, ease: EASE } } };

const ACTIVITY_STYLE: Record<ActivityItem["type"], { icon: React.ElementType; cls: string }> = {
  notification: { icon: Bell, cls: "bg-gradient-to-br from-orange-500 to-amber-400" },
  rsvp: { icon: UserCheck, cls: "bg-gradient-to-br from-emerald-500 to-emerald-600" },
  order: { icon: Receipt, cls: "bg-gradient-to-br from-rose-500 to-orange-500" },
};

export function ActivityTab() {
  const { data, error, mutate } = useSWR<ActivityItem[]>("/user/dashboard/activity", fetcher);
  const [selected, setSelected] = React.useState<ActivityItem | null>(null);
  const close = React.useCallback(() => setSelected(null), []);

  if (error) return <ErrorCard onRetry={() => mutate()} />;
  if (!data) return <Skeleton className="h-96 w-full" />;

  return (
    <>
      <TiltCard tone="paper" className="rounded-[1.75rem]" pad="p-3.5 sm:p-5 lg:p-6">
        <div className="mb-4 flex items-center justify-between gap-3"><h3 className="truncate text-base font-bold tracking-tight font-[family-name:var(--font-display)] sm:text-lg">Activity timeline</h3></div>
        {data.length === 0 ? (
          <div className="flex flex-col items-center gap-3 text-center"><Float><Pic src="/why-rsvp.png" sizes="(max-width: 640px) 90vw, 640px" className="aspect-[16/7] rounded-2xl ring-1 ring-orange-900/10" /></Float><p className="text-sm text-slate-700">Nothing yet. Replies, payments and updates will show up here.</p></div>
        ) : (
          <motion.ol variants={listV} initial="hidden" whileInView="show" viewport={VIEW} className="relative space-y-3 before:absolute before:inset-y-2 before:left-[18px] before:w-px before:-translate-x-1/2 before:bg-gradient-to-b before:from-orange-400/60 before:via-orange-300/40 before:to-transparent sm:space-y-4 sm:before:left-5">
            {data.map((item) => { const s = ACTIVITY_STYLE[item.type] ?? ACTIVITY_STYLE.notification; return (<motion.li key={`${item.type}-${item.id}`} variants={itemV} className="relative flex items-start gap-3 sm:gap-3.5"><span className={cn("z-10 flex size-9 shrink-0 items-center justify-center rounded-full text-white shadow-lg ring-4 ring-[#ffd9b8] sm:size-10", s.cls)}><s.icon className="size-4" strokeWidth={1.75} /></span><button onClick={() => setSelected(item)} className={cn("group/item min-w-0 flex-1 rounded-2xl bg-white/80 ring-1 ring-orange-50 p-3 text-left transition active:scale-[0.99] hover:bg-white", FOCUS)}><div className="flex items-start justify-between gap-3"><h4 className="text-sm font-bold">{item.title}</h4><span className="flex shrink-0 items-center gap-1 text-xs text-slate-600"><Clock className="size-3" /> {timeAgo(item.created_at)}</span></div><p className="mt-0.5 line-clamp-2 text-sm text-slate-700">{item.message}</p><span className="mt-1.5 inline-flex items-center gap-0.5 text-xs font-semibold text-orange-700">Details<ChevronRight className="size-3.5 transition-transform group-hover/item:translate-x-0.5" /></span></button></motion.li>); })}
          </motion.ol>
        )}
      </TiltCard>
      <ActivitySheet item={selected} onClose={close} />
    </>
  );
}