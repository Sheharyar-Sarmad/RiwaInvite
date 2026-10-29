"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { X, Calendar, Clock, Copy, Check } from "lucide-react";
import {
  StatusBadge,
  avatarStyle,
  initials,
  type Subscription,
} from "@/components/admin/sections/subscriptions/SubscriptionsClient";

const fmt = (d: string) =>
  new Date(d).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });

export function SubscriptionModal({
  subscription,
  onClose,
}: {
  subscription: Subscription;
  onClose: () => void;
}) {
  const [copied, setCopied] = useState(false);

  const copyId = async () => {
    try {
      await navigator.clipboard.writeText(subscription.id);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {}
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 outline-none"
      role="dialog"
      aria-modal="true"
      aria-label="Subscription details"
      tabIndex={-1}
      autoFocus
      onKeyDown={(e) => e.key === "Escape" && onClose()}
    >
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.12 }}
        onClick={onClose}
        className="absolute inset-0 bg-gray-900/60 backdrop-blur-md cursor-pointer"
      />

      <motion.div
        initial={{ opacity: 0, scale: 0.96, y: 12 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.96, y: 12 }}
        transition={{ duration: 0.15, ease: "easeOut" }}
        className="relative bg-[#fffafb] backdrop-blur-md rounded-[2rem] p-6 md:p-8 w-full max-w-lg shadow-2xl z-10 border border-white max-h-[90vh] overflow-y-auto no-scrollbar"
      >
        {/* Dot grid overlay */}
        <div
          className="absolute inset-0 z-0 opacity-[0.03] pointer-events-none rounded-[2rem]"
          style={{ backgroundImage: "radial-gradient(#f97316 1px, transparent 1px)", backgroundSize: "24px 24px" }}
        />

        <div className="relative z-10">
          <div className="flex justify-between items-start mb-6">
            <h2 className="text-xl font-bold text-gray-900 font-[family-name:var(--font-display)]">
              Subscription Details
            </h2>
            <button
              onClick={onClose}
              aria-label="Close"
              className="p-2 bg-white/80 hover:bg-gray-100 rounded-full text-gray-500 transition-colors cursor-pointer border border-gray-100 shadow-sm"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          <div className="space-y-6">
            {/* User profile */}
            <div className="bg-white/60 backdrop-blur-sm p-5 rounded-2xl border border-gray-100 shadow-sm flex items-center gap-4">
              <div
                className={`w-12 h-12 shrink-0 rounded-full flex items-center justify-center font-bold text-lg ring-4 ring-white shadow-md ${avatarStyle(subscription.user_id || subscription.email)}`}
              >
                {initials(subscription.first_name, subscription.last_name)}
              </div>
              <div className="min-w-0">
                <h3 className="font-bold text-gray-900 truncate font-[family-name:var(--font-display)]">
                  {subscription.first_name} {subscription.last_name}
                </h3>
                <p className="text-sm text-gray-500 truncate font-[family-name:var(--font-body)]">
                  {subscription.email}
                </p>
              </div>
            </div>

            {/* Status & plan */}
            <div className="grid grid-cols-2 gap-4">
              <div className="bg-white/60 p-4 rounded-xl border border-gray-100 shadow-sm flex flex-col items-start justify-center gap-2">
                <span className="text-xs font-bold text-gray-400 uppercase font-[family-name:var(--font-display)]">
                  Status
                </span>
                <StatusBadge status={subscription.status} />
              </div>
              <div className="bg-white/60 p-4 rounded-xl border border-gray-100 shadow-sm flex flex-col items-start justify-center gap-1">
                <span className="text-xs font-bold text-gray-400 uppercase font-[family-name:var(--font-display)]">
                  Plan
                </span>
                <span className="font-bold text-gray-900 font-[family-name:var(--font-body)]">
                  {subscription.plan_name}
                </span>
                <span className="text-xs text-gray-500 font-[family-name:var(--font-body)]">
                  Rs {Number(subscription.plan_price).toLocaleString()}
                </span>
              </div>
            </div>

            {/* Dates */}
            <div className="bg-white/60 p-5 rounded-2xl border border-gray-100 shadow-sm space-y-3 font-[family-name:var(--font-body)]">
              <div className="flex justify-between items-center">
                <div className="flex items-center gap-2 text-sm font-medium text-gray-600">
                  <Calendar className="w-4 h-4 text-emerald-500" /> Start Date
                </div>
                <span className="text-sm font-bold text-gray-900">{fmt(subscription.starts_at)}</span>
              </div>
              <div className="flex justify-between items-center pt-3 border-t border-gray-100">
                <div className="flex items-center gap-2 text-sm font-medium text-gray-600">
                  <Clock className="w-4 h-4 text-red-500" /> Expiry Date
                </div>
                <span className="text-sm font-bold text-gray-900">{fmt(subscription.expires_at)}</span>
              </div>
            </div>

            {/* Provider info */}
            <div className="bg-gray-50/80 p-4 rounded-xl border border-gray-200 text-xs font-[family-name:var(--font-body)] space-y-3">
              <p className="flex justify-between">
                <span className="text-gray-500">Provider:</span>
                <span className="font-medium text-gray-900 capitalize">{subscription.provider}</span>
              </p>
              <div className="flex items-center justify-between gap-3">
                <span className="text-gray-500 shrink-0">Sub ID:</span>
                <span className="font-mono text-gray-900 truncate" title={subscription.id}>
                  {subscription.id}
                </span>
                <button
                  onClick={copyId}
                  className="shrink-0 inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-white border border-gray-200 text-gray-600 hover:text-orange-600 hover:border-orange-200 hover:bg-orange-50 font-semibold transition-colors cursor-pointer"
                >
                  {copied ? (
                    <>
                      <Check className="w-3.5 h-3.5 text-emerald-500" /> Copied
                    </>
                  ) : (
                    <>
                      <Copy className="w-3.5 h-3.5" /> Copy ID
                    </>
                  )}
                </button>
              </div>
            </div>

            <button
              onClick={onClose}
              className="w-full py-3 bg-white border border-gray-200 hover:bg-gray-50 text-gray-700 font-bold rounded-xl transition-all cursor-pointer font-[family-name:var(--font-display)] shadow-sm"
            >
              Close Details
            </button>
          </div>
        </div>
      </motion.div>
    </div>
  );
}