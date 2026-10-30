"use client";

import { useEffect, useMemo, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, ExternalLink, User, LayoutTemplate, Link as LinkIcon, Lock, Copy, Check, CalendarDays, Mail, Monitor } from "lucide-react";
import { toast } from "@/components/ui/toast";
import { getInvitationStatusColor, Invitation } from "@/components/admin/sections/invitations/InvitationsClient";

const fmt = (value: string, opts: Intl.DateTimeFormatOptions) => {
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? "—" : d.toLocaleDateString("en-US", opts);
};

export function InvitationModal({
  invitation,
  onClose,
  onPreview,
}: {
  invitation: Invitation;
  onClose: () => void;
  onPreview?: () => void;
}) {
  const [copied, setCopied] = useState(false);

  const publicUrl = useMemo(
    () => `${typeof window !== "undefined" ? window.location.origin : ""}/invite/${invitation.slug}`,
    [invitation.slug]
  );

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  useEffect(() => {
    if (!copied) return;
    const t = setTimeout(() => setCopied(false), 2000);
    return () => clearTimeout(t);
  }, [copied]);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(publicUrl);
      setCopied(true);
      toast.add({ title: "Link copied", description: "The public link is on your clipboard.", type: "success" });
    } catch {
      toast.add({ title: "Couldn't copy", description: "Select the link and copy it manually.", type: "error" });
    }
  };

  const initials = `${invitation.first_name?.[0] ?? ""}${invitation.last_name?.[0] ?? ""}`.toUpperCase() || "?";

  return (
    <div data-lenis-prevent className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6">
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={onClose}
        className="absolute inset-0 cursor-pointer bg-gray-900/60 backdrop-blur-md"
      />

      <motion.div
        role="dialog"
        aria-modal="true"
        aria-label="Invitation details"
        initial={{ opacity: 0, scale: 0.95, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 20 }}
        transition={{ type: "spring", damping: 28, stiffness: 320 }}
        className="no-scrollbar relative z-10 flex max-h-[90vh] w-full max-w-lg flex-col overflow-y-auto overscroll-contain rounded-[2rem] border border-white bg-[#fffafb] p-6 shadow-2xl md:p-8"
      >
        <div
          className="pointer-events-none absolute inset-0 z-0 rounded-[2rem] opacity-[0.04]"
          style={{ backgroundImage: "radial-gradient(#f97316 1px, transparent 1px)", backgroundSize: "24px 24px" }}
        />

        <div className="relative z-10">
          {/* Header */}
          <div className="mb-6 flex items-start justify-between">
            <div className="flex items-center gap-3">
              <div className="rounded-xl bg-orange-100 p-2.5 text-orange-600 shadow-inner">
                <LayoutTemplate className="h-5 w-5" />
              </div>
              <div>
                <h2 className="text-xl font-bold text-gray-900 font-[family-name:var(--font-display)]">Invitation details</h2>
                <p className="mt-0.5 text-xs text-gray-500 font-[family-name:var(--font-body)]">Read-only admin overview</p>
              </div>
            </div>
            <button
              onClick={onClose}
              aria-label="Close"
              className="rounded-full border border-orange-100/50 bg-white/70 p-2 text-gray-500 shadow-sm backdrop-blur-xl transition-all hover:-translate-y-0.5 hover:bg-white hover:text-gray-800 cursor-pointer"
            >
              <X className="h-4 w-4" />
            </button>
          </div>

          <div className="space-y-5">
            {/* Hero card */}
            <div className="relative overflow-hidden rounded-2xl border border-orange-100/50 bg-white/70 p-6 text-center shadow-sm backdrop-blur-xl">
              <div className="absolute left-0 top-0 h-1 w-full bg-gradient-to-r from-orange-400 to-orange-600" />
              <span
                className={`mb-3 inline-block rounded-md border px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider ${getInvitationStatusColor(
                  invitation.status
                )}`}
              >
                {invitation.status}
              </span>
              <h3 className="text-xl font-bold text-gray-900 font-[family-name:var(--font-display)]">{invitation.title}</h3>
              <p className="mt-1 flex items-center justify-center gap-1.5 text-sm font-medium text-gray-500 font-[family-name:var(--font-body)]">
                <CalendarDays className="h-4 w-4 text-orange-500" />
                {fmt(invitation.event_date, { dateStyle: "long" })}
              </p>
            </div>

            {/* Owner */}
            <div className="rounded-2xl border border-orange-100/50 bg-white/70 p-4 shadow-sm backdrop-blur-xl font-[family-name:var(--font-body)]">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-orange-100 text-sm font-bold text-orange-600">
                  {initials}
                </div>
                <div className="min-w-0">
                  <p className="flex items-center gap-1.5 text-[11px] font-semibold text-gray-400">
                    <User className="h-3 w-3" /> Created by
                  </p>
                  <p className="truncate text-sm font-bold text-gray-900">
                    {invitation.first_name} {invitation.last_name}
                  </p>
                </div>
              </div>
              <dl className="mt-4 space-y-3 border-t border-gray-100 pt-3 text-sm">
                <div className="flex items-center justify-between gap-4">
                  <dt className="flex items-center gap-1.5 text-gray-500"><Mail className="h-3.5 w-3.5" /> Email</dt>
                  <dd className="truncate font-semibold text-gray-900">{invitation.email}</dd>
                </div>
                <div className="flex items-center justify-between gap-4">
                  <dt className="text-gray-500">Template</dt>
                  <dd className="font-semibold text-gray-900">{invitation.template_name || "Custom design"}</dd>
                </div>
                <div className="flex items-center justify-between gap-4">
                  <dt className="text-gray-500">Created</dt>
                  <dd className="font-semibold text-gray-900">
                    {fmt(invitation.created_at, { month: "short", day: "numeric", year: "numeric" })}
                  </dd>
                </div>
              </dl>
            </div>

            {/* Public link */}
            <div className="rounded-2xl border border-orange-100/50 bg-white/70 p-4 shadow-sm backdrop-blur-xl">
              <div className="mb-2 flex items-center justify-between">
                <p className="flex items-center gap-1.5 text-xs font-bold text-gray-500 font-[family-name:var(--font-display)]">
                  <LinkIcon className="h-3.5 w-3.5" /> Public link
                </p>
                {invitation.is_custom_slug && (
                  <span className="rounded bg-orange-100 px-1.5 py-0.5 text-[10px] font-bold text-orange-600">Custom slug</span>
                )}
              </div>
              <div className="flex items-center gap-2">
                <input
                  type="text"
                  readOnly
                  value={publicUrl}
                  onFocus={(e) => e.currentTarget.select()}
                  aria-label="Public link"
                  className="min-w-0 flex-1 rounded-lg border border-gray-200 bg-white p-2.5 font-mono text-xs text-gray-700 transition-all focus:border-orange-300 focus:outline-none focus:ring-4 focus:ring-orange-500/10"
                />
                <button
                  onClick={handleCopy}
                  title="Copy link"
                  aria-label="Copy link"
                  className="relative flex h-[38px] w-[38px] items-center justify-center rounded-lg border border-gray-200 bg-white text-gray-600 shadow-sm transition-all hover:-translate-y-0.5 hover:text-orange-600 cursor-pointer"
                >
                  <AnimatePresence mode="wait" initial={false}>
                    <motion.span
                      key={copied ? "check" : "copy"}
                      initial={{ opacity: 0, scale: 0.5 }}
                      animate={{ opacity: 1, scale: 1 }}
                      exit={{ opacity: 0, scale: 0.5 }}
                      transition={{ duration: 0.15 }}
                    >
                      {copied ? <Check className="h-4 w-4 text-emerald-500" /> : <Copy className="h-4 w-4" />}
                    </motion.span>
                  </AnimatePresence>
                </button>
                <a
                  href={publicUrl}
                  target="_blank"
                  rel="noreferrer"
                  title="Open live link"
                  aria-label="Open live link"
                  className="flex h-[38px] w-[38px] items-center justify-center rounded-lg bg-orange-500 text-white shadow-sm shadow-orange-500/30 transition-all hover:-translate-y-0.5 hover:bg-orange-600 cursor-pointer"
                >
                  <ExternalLink className="h-4 w-4" />
                </a>
              </div>
            </div>

            {/* Admin lock */}
            <div className="flex items-start gap-3 rounded-2xl border border-red-100 bg-red-50/80 p-3.5">
              <Lock className="mt-0.5 h-4 w-4 shrink-0 text-red-500" />
              <p className="text-xs leading-relaxed text-red-800 font-[family-name:var(--font-body)]">
                <strong>Admin lock:</strong> You can't edit or delete this invitation because it belongs to the user. To revoke access, soft-delete the user instead.
              </p>
            </div>

            {/* Actions */}
            <div className="flex gap-3">
              {onPreview && (
                <button
                  onClick={onPreview}
                  className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-gray-900 py-3 font-bold text-white shadow-lg transition-all hover:-translate-y-0.5 hover:bg-gray-800 cursor-pointer font-[family-name:var(--font-display)]"
                >
                  <Monitor className="h-4 w-4" /> Preview
                </button>
              )}
              <button
                onClick={onClose}
                className="flex-1 rounded-xl border border-gray-200 bg-white py-3 font-bold text-gray-700 shadow-sm transition-all hover:-translate-y-0.5 hover:bg-gray-50 cursor-pointer font-[family-name:var(--font-display)]"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      </motion.div>
    </div>
  );
}