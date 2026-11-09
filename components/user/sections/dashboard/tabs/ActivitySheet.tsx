"use client";

import * as React from "react";
import Link from "next/link";
import { createPortal } from "react-dom";
import { motion, AnimatePresence, useDragControls } from "framer-motion";
import { Bell, UserCheck, Receipt, Clock, X, ArrowUpRight } from "lucide-react";
import { ActivityItem } from "../types";
import { TONE, cn, timeAgo, FOCUS } from "../constants";

const ACTIVITY_STYLE: Record<ActivityItem["type"], { icon: React.ElementType; cls: string }> = {
  notification: { icon: Bell, cls: "bg-gradient-to-br from-orange-500 to-amber-400" },
  rsvp: { icon: UserCheck, cls: "bg-gradient-to-br from-emerald-500 to-emerald-600" },
  order: { icon: Receipt, cls: "bg-gradient-to-br from-rose-500 to-orange-500" },
};

const ACTIVITY_META: Record<ActivityItem["type"], { label: string; href: string; cta: string }> = {
  notification: { label: "Notification", href: "/dashboard/notifications", cta: "Open notifications" },
  rsvp: { label: "Guest reply", href: "/dashboard/rsvps", cta: "View RSVPs" },
  order: { label: "Payment", href: "/dashboard/billing", cta: "View billing" },
};

export function ActivitySheet({ item, onClose }: { item: ActivityItem | null; onClose: () => void }) {
  const [mounted, setMounted] = React.useState(false);
  const controls = useDragControls();

  React.useEffect(() => setMounted(true), []);
  React.useEffect(() => {
    if (!item) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    window.addEventListener("keydown", onKey);
    return () => { document.body.style.overflow = prev; window.removeEventListener("keydown", onKey); };
  }, [item, onClose]);

  if (!mounted) return null;

  return createPortal(
    <AnimatePresence>
      {item && (
        <div className="fixed inset-0 z-[100] flex items-end justify-center sm:items-center sm:p-6">
          <motion.div key="backdrop" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.25 }} onClick={onClose} className="absolute inset-0 bg-[#2a0e04]/55 backdrop-blur-sm" />
          <motion.div key="panel" role="dialog" aria-modal="true" initial={{ opacity: 0, y: 70 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 70 }} transition={{ type: "spring", damping: 34, stiffness: 380 }} drag="y" dragControls={controls} dragListener={false} dragConstraints={{ top: 0, bottom: 0 }} dragElastic={{ top: 0, bottom: 0.6 }} onDragEnd={(_, info) => { if (info.offset.y > 110 || info.velocity.y > 600) onClose(); }} style={{ backgroundImage: TONE.paper.bg }} className="relative max-h-[88dvh] w-full overflow-y-auto overscroll-contain rounded-t-[1.75rem] border border-orange-900/10 p-5 pb-[calc(1.25rem+env(safe-area-inset-bottom))] text-slate-900 shadow-[0_-20px_60px_-20px_rgba(154,52,18,0.6)] sm:max-w-md sm:rounded-[1.75rem] sm:pb-6">
            <div onPointerDown={(e) => controls.start(e)} className="-mt-2 mb-2 flex h-6 cursor-grab touch-none items-center justify-center sm:hidden" aria-hidden><span className="h-1.5 w-10 rounded-full bg-orange-900/20" /></div>
            <ActivitySheetBody item={item} onClose={onClose} />
          </motion.div>
        </div>
      )}
    </AnimatePresence>,
    document.body
  );
}

function ActivitySheetBody({ item, onClose }: { item: ActivityItem; onClose: () => void }) {
  const s = ACTIVITY_STYLE[item.type] ?? ACTIVITY_STYLE.notification;
  const meta = ACTIVITY_META[item.type] ?? ACTIVITY_META.notification;
  const closeRef = React.useRef<HTMLButtonElement>(null);
  React.useEffect(() => closeRef.current?.focus(), []);

  return (
    <>
      <div className="flex items-start justify-between gap-3">
        <div className="flex min-w-0 items-center gap-3"><span className={cn("flex size-11 shrink-0 items-center justify-center rounded-full text-white shadow-lg", s.cls)}><s.icon className="size-5" strokeWidth={1.75} /></span><div className="min-w-0"><p className="text-xs font-semibold text-orange-700">{meta.label}</p><p className="flex items-center gap-1 text-xs text-slate-600"><Clock className="size-3" /> {timeAgo(item.created_at)}</p></div></div>
        <button ref={closeRef} onClick={onClose} aria-label="Close" className={cn("flex size-10 shrink-0 items-center justify-center rounded-full bg-white/70 text-slate-700 ring-1 ring-orange-900/10 transition hover:bg-white active:scale-95", FOCUS)}><X className="size-4" /></button>
      </div>
      <h4 className="mt-4 text-xl font-extrabold tracking-tight font-[family-name:var(--font-display)]">{item.title}</h4>
      <p className="mt-2 whitespace-pre-line text-[15px] leading-relaxed text-slate-800">{item.message}</p>
      <div className="mt-4 rounded-2xl bg-white/70 px-3.5 py-3 text-xs text-slate-700 ring-1 ring-orange-900/10">{new Date(item.created_at).toLocaleString("en-US", { dateStyle: "full", timeStyle: "short" })}</div>
      <Link href={meta.href} onClick={onClose} className={cn("mt-5 flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-b from-orange-500 to-orange-600 px-4 py-3 text-sm font-bold text-white shadow-lg shadow-orange-500/30 transition active:scale-[0.98]", FOCUS)}>{meta.cta} <ArrowUpRight className="size-4" /></Link>
    </>
  );
}