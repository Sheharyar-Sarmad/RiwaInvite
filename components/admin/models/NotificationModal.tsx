"use client";

import { useEffect, useRef, useState } from "react";
import { motion } from "framer-motion";
import {
  X, Bell, ShoppingBag, User, ShieldAlert, Clock, CheckCircle2,
  ChevronUp, ChevronDown, Copy, Check, Trash2, type LucideIcon,
} from "lucide-react"; // 🟢 Imported Trash2
import { format, formatDistanceToNow } from "date-fns";

export type NotificationItem = {
  id: string;
  type: string;
  title: string;
  message: string;
  read_at: string | null;
  created_at: string;
};

export type NotificationKind = "order" | "user" | "alert" | "system";

type Tone = {
  label: string;
  Icon: LucideIcon;
  text: string;
  tile: string;
  ring: string;
  glow: string;
  bar: string;
};

export const NOTIFICATION_TONES: Record<NotificationKind, Tone> = {
  order:  { label: "Order",  Icon: ShoppingBag, text: "text-emerald-600", tile: "bg-emerald-50",  ring: "ring-emerald-200/70", glow: "from-emerald-400/25", bar: "bg-emerald-500" },
  user:   { label: "User",   Icon: User,        text: "text-sky-600",     tile: "bg-sky-50",      ring: "ring-sky-200/70",     glow: "from-sky-400/25",     bar: "bg-sky-500" },
  alert:  { label: "Alert",  Icon: ShieldAlert, text: "text-rose-600",    tile: "bg-rose-50",     ring: "ring-rose-200/70",    glow: "from-rose-400/25",    bar: "bg-rose-500" },
  system: { label: "System", Icon: Bell,        text: "text-orange-600",  tile: "bg-orange-50",   ring: "ring-orange-200/70",  glow: "from-orange-400/25",  bar: "bg-orange-500" },
};

export function resolveKind(title: string, message: string): NotificationKind {
  const text = `${title} ${message}`.toLowerCase();
  if (text.includes("order")) return "order";
  if (text.includes("user") || text.includes("account")) return "user";
  if (text.includes("alert") || text.includes("guest")) return "alert";
  return "system";
}

type Props = {
  notification: NotificationItem;
  onClose: () => void;
  onPrev?: () => void;
  onNext?: () => void;
  position?: { index: number; total: number };
  onDelete?: (id: string) => void; // 🟢 Added onDelete
};

export function NotificationModal({ notification, onClose, onPrev, onNext, position, onDelete }: Props) {
  const kind = resolveKind(notification.title, notification.message);
  const tone = NOTIFICATION_TONES[kind];
  const { Icon } = tone;
  const [copied, setCopied] = useState(false);
  const closeRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
      else if ((e.key === "ArrowDown" || e.key === "j") && onNext) { e.preventDefault(); onNext(); }
      else if ((e.key === "ArrowUp" || e.key === "k") && onPrev) { e.preventDefault(); onPrev(); }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose, onNext, onPrev]);

  useEffect(() => {
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    closeRef.current?.focus();
    return () => { document.body.style.overflow = prev; };
  }, []);

  const copyId = async () => {
    try {
      await navigator.clipboard.writeText(notification.id);
      setCopied(true);
      setTimeout(() => setCopied(false), 1600);
    } catch {}
  };

  const created = new Date(notification.created_at);
  const isRead = Boolean(notification.read_at);

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center p-0 sm:items-center sm:p-6">
      <motion.div
        initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
        transition={{ duration: 0.2 }}
        onClick={onClose}
        className="absolute inset-0 cursor-pointer bg-gray-950/50 backdrop-blur-md"
        aria-hidden
      />

      <motion.div
        role="dialog"
        aria-modal="true"
        aria-labelledby="notification-title"
        initial={{ opacity: 0, y: 40, scale: 0.97 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: 24, scale: 0.97 }}
        transition={{ type: "spring", stiffness: 380, damping: 32 }}
        className="relative z-10 w-full max-w-lg overflow-hidden rounded-t-[2rem] border border-white/80 bg-[#fffdfb] shadow-[0_40px_120px_-20px_rgba(17,24,39,0.45)] sm:rounded-[2rem]"
      >
        <div className={`pointer-events-none absolute -top-32 left-1/2 h-64 w-[130%] -translate-x-1/2 rounded-full bg-gradient-to-b ${tone.glow} to-transparent blur-3xl`} />
        <div
          className="pointer-events-none absolute inset-0 opacity-[0.035]"
          style={{ backgroundImage: "radial-gradient(#f97316 1px, transparent 1px)", backgroundSize: "22px 22px" }}
        />

        <div className="relative p-6 sm:p-8">
          <div className="mb-7 flex items-start justify-between">
            <div className="flex items-center gap-3.5">
              <motion.div
                initial={{ scale: 0.6, rotate: -12, opacity: 0 }}
                animate={{ scale: 1, rotate: 0, opacity: 1 }}
                transition={{ type: "spring", stiffness: 420, damping: 18, delay: 0.08 }}
                className={`grid h-14 w-14 place-items-center rounded-2xl ring-1 shadow-sm ${tone.tile} ${tone.ring}`}
              >
                <Icon className={`h-7 w-7 ${tone.text}`} strokeWidth={2} />
              </motion.div>
              <div className="flex flex-col gap-1.5">
                <span className={`inline-flex w-fit items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold ring-1 ${tone.tile} ${tone.text} ${tone.ring}`}>
                  <span className={`h-1.5 w-1.5 rounded-full ${tone.bar}`} />
                  {tone.label}
                </span>
                {position && (
                  <span className="text-xs font-medium tabular-nums text-gray-400">
                    {position.index + 1} of {position.total}
                  </span>
                )}
              </div>
            </div>

            <div className="flex items-center gap-1.5">
              {(onPrev || onNext) && (
                <div className="mr-1 flex overflow-hidden rounded-full border border-gray-200 bg-white shadow-sm">
                  <button
                    onClick={onPrev} disabled={!onPrev} aria-label="Previous notification"
                    className="p-2 text-gray-500 transition-colors hover:bg-gray-50 hover:text-gray-900 disabled:cursor-not-allowed disabled:opacity-30 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-400"
                  >
                    <ChevronUp className="h-4 w-4" />
                  </button>
                  <div className="my-1.5 w-px bg-gray-200" />
                  <button
                    onClick={onNext} disabled={!onNext} aria-label="Next notification"
                    className="p-2 text-gray-500 transition-colors hover:bg-gray-50 hover:text-gray-900 disabled:cursor-not-allowed disabled:opacity-30 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-400"
                  >
                    <ChevronDown className="h-4 w-4" />
                  </button>
                </div>
              )}
              <button
                ref={closeRef}
                onClick={onClose}
                aria-label="Close"
                className="rounded-full border border-gray-200 bg-white p-2 text-gray-500 shadow-sm transition-all hover:rotate-90 hover:bg-gray-50 hover:text-gray-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-400"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          </div>

          <motion.div
            key={notification.id}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.22, delay: 0.05 }}
          >
            <h2
              id="notification-title"
              className="mb-2 text-2xl font-bold leading-tight tracking-tight text-gray-900 font-[family-name:var(--font-display)]"
            >
              {notification.title}
            </h2>

            <div className="mb-5 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs font-medium text-gray-500">
              <span className="inline-flex items-center gap-1.5">
                <Clock className="h-3.5 w-3.5" />
                {format(created, "MMM d, yyyy 'at' h:mm a")}
              </span>
              <span className="text-gray-300" aria-hidden>•</span>
              <span>{formatDistanceToNow(created, { addSuffix: true })}</span>
            </div>

            <div className="relative overflow-hidden rounded-2xl border border-gray-200/80 bg-white p-5 shadow-sm">
              <div className={`absolute inset-y-0 left-0 w-1 ${tone.bar}`} />
              <p className="max-h-64 overflow-y-auto pl-2 text-[15px] leading-relaxed text-gray-700 whitespace-pre-wrap font-[family-name:var(--font-body)]">
                {notification.message}
              </p>
            </div>
          </motion.div>

          <div className="mt-5 flex items-center justify-between rounded-xl border border-gray-200/80 bg-gray-50/70 px-4 py-3">
            <div className="flex items-center gap-2">
              <CheckCircle2 className={`h-4 w-4 ${isRead ? "text-emerald-500" : "text-gray-300"}`} />
              <span className="text-sm font-semibold text-gray-700">
                {isRead
                  ? `Read ${formatDistanceToNow(new Date(notification.read_at!), { addSuffix: true })}`
                  : "Unread"}
              </span>
            </div>
            <button
              onClick={copyId}
              aria-label="Copy notification ID"
              className="group inline-flex items-center gap-1.5 rounded-md border border-gray-200 bg-white px-2 py-1 font-mono text-[11px] text-gray-500 transition-colors hover:border-orange-200 hover:text-orange-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-400"
            >
              {notification.id.split("-")[0]}
              {copied ? <Check className="h-3 w-3 text-emerald-500" /> : <Copy className="h-3 w-3 opacity-60 group-hover:opacity-100" />}
            </button>
          </div>

          {/* 🟢 NEW: Delete & Done Buttons */}
          <div className="mt-5 flex gap-3">
            {onDelete && (
              <button
                onClick={() => onDelete(notification.id)}
                className="flex items-center justify-center rounded-xl border border-red-200 bg-red-50 px-4 py-3.5 text-red-600 transition-colors hover:bg-red-100 hover:text-red-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-400"
                title="Delete notification"
              >
                <Trash2 className="h-5 w-5" />
              </button>
            )}
            <button
              onClick={onClose}
              className="flex-1 rounded-xl bg-gray-900 py-3.5 text-sm font-bold text-white shadow-lg shadow-gray-900/20 transition-all hover:-translate-y-0.5 hover:bg-gray-800 active:translate-y-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-400 focus-visible:ring-offset-2 font-[family-name:var(--font-display)]"
            >
              Done
            </button>
          </div>

          {(onPrev || onNext) && (
            <p className="mt-3 text-center text-[11px] text-gray-400">
              Use <kbd className="rounded border border-gray-200 bg-white px-1 font-mono">↑</kbd>{" "}
              <kbd className="rounded border border-gray-200 bg-white px-1 font-mono">↓</kbd> to browse,{" "}
              <kbd className="rounded border border-gray-200 bg-white px-1 font-mono">Esc</kbd> to close
            </p>
          )}
        </div>
      </motion.div>
    </div>
  );
}