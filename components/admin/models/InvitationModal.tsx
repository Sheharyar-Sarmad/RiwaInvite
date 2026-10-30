"use client";

/**
 * InvitationModal
 * -----------------------------------------------------------------------------
 * Admin-facing, READ-ONLY overview of a single invitation, plus guest moderation.
 *
 * What an admin can do here:
 *   - See who owns the invitation, its status, slug and public link
 *   - Copy / open the public link, or jump to the live preview
 *   - Review RSVPs and remove an individual guest (moderation only)
 *
 * What an admin can NOT do:
 *   - Edit or delete the invitation itself (it is the user's private property;
 *     to revoke access the admin soft-deletes the user instead)
 *
 * Data strategy:
 *   The table row already gives us everything for the header (title, owner,
 *   status, slug), so those render INSTANTLY from the `invitation` prop.
 *   Only the guest list needs a network call, so only that section shows a
 *   skeleton. The modal never blocks on a full-screen spinner.
 */

import { useEffect, useMemo, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  X, ExternalLink, User, LayoutTemplate, Link as LinkIcon, Lock, Loader2, Users,
  MessageSquare, Trash2, CheckCircle2, XCircle, Clock, Copy, Check, CalendarDays,
  Mail, Monitor, RotateCw, AlertTriangle, UserX,
} from "lucide-react";
import { getInvitationStatusColor, Invitation } from "@/components/admin/sections/invitations/InvitationsClient";
import { apiClient } from "@/lib/api/api_base";
import { toast } from "@/components/ui/toast";

/* -------------------------------------------------------------------------- */
/*  Types & constants                                                         */
/* -------------------------------------------------------------------------- */

type Guest = {
  id: string;
  guest_name: string;
  attendance_status: string;
  number_of_guests: number;
  comment: string | null;
  created_at: string;
};

/** Normalised RSVP buckets. Anything the API sends that we don't know is "pending". */
type RsvpStatus = "attending" | "declined" | "pending";
type GuestFilter = "all" | RsvpStatus;

/** Single source of truth for how each RSVP status looks. */
const RSVP_META: Record<RsvpStatus, { label: string; Icon: typeof Clock; icon: string; chip: string }> = {
  attending: { label: "Attending", Icon: CheckCircle2, icon: "text-emerald-500", chip: "bg-emerald-50 text-emerald-700 border-emerald-200" },
  declined: { label: "Declined", Icon: XCircle, icon: "text-red-500", chip: "bg-red-50 text-red-700 border-red-200" },
  pending: { label: "Pending", Icon: Clock, icon: "text-amber-500", chip: "bg-amber-50 text-amber-700 border-amber-200" },
};

const FILTERS: { id: GuestFilter; label: string }[] = [
  { id: "all", label: "All" },
  { id: "attending", label: "Attending" },
  { id: "declined", label: "Declined" },
  { id: "pending", label: "Pending" },
];

/* -------------------------------------------------------------------------- */
/*  Helpers                                                                   */
/* -------------------------------------------------------------------------- */

/** Maps free-form API values ("Attending", "ATTENDING ", "maybe") onto a known bucket. */
const normalizeStatus = (raw: string | undefined): RsvpStatus => {
  const value = (raw ?? "").trim().toLowerCase();
  return value === "attending" || value === "declined" ? value : "pending";
};

/** Date formatter that never renders "Invalid Date". */
const fmtDate = (value: string, opts: Intl.DateTimeFormatOptions) => {
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? "—" : d.toLocaleDateString("en-US", opts);
};

/* -------------------------------------------------------------------------- */
/*  Confirm-delete dialog                                                     */
/* -------------------------------------------------------------------------- */

/**
 * Stacked on top of the details modal (z-[70] > z-50).
 * It owns its own Escape handling, and the parent ignores Escape while it is
 * open, so one key press only ever closes ONE layer.
 */
function ConfirmRemoveGuestDialog({
  guest,
  isDeleting,
  onCancel,
  onConfirm,
}: {
  guest: Guest;
  isDeleting: boolean;
  onCancel: () => void;
  onConfirm: () => void;
}) {
  // Escape cancels, but not mid-request, so the user can't orphan an in-flight delete.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && !isDeleting && onCancel();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [isDeleting, onCancel]);

  const seats = guest.number_of_guests;

  return (
    <div data-lenis-prevent className="fixed inset-0 z-[70] flex items-center justify-center p-4">
      {/* Backdrop: clicking it cancels (unless a delete is running) */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={() => !isDeleting && onCancel()}
        className="absolute inset-0 cursor-pointer bg-gray-900/60 backdrop-blur-sm"
      />

      <motion.div
        role="alertdialog"
        aria-modal="true"
        aria-labelledby="remove-guest-title"
        aria-describedby="remove-guest-desc"
        initial={{ opacity: 0, scale: 0.94, y: 16 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.94, y: 16 }}
        transition={{ type: "spring", damping: 26, stiffness: 340 }}
        className="relative z-10 w-full max-w-sm rounded-[1.75rem] border border-white bg-[#fffafb] p-6 shadow-2xl"
      >
        <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-2xl border border-red-100 bg-red-50 text-red-500 shadow-inner">
          <UserX className="h-6 w-6" />
        </div>

        <h3 id="remove-guest-title" className="text-center text-lg font-bold text-gray-900 font-[family-name:var(--font-display)]">
          Remove this guest?
        </h3>
        <p id="remove-guest-desc" className="mt-1.5 text-center text-sm leading-relaxed text-gray-500 font-[family-name:var(--font-body)]">
          This permanently deletes the RSVP. The invitation owner will no longer see it, and it can't be undone.
        </p>

        {/* Summary of exactly what is about to be removed */}
        <div className="mt-4 rounded-2xl border border-gray-100 bg-white/70 p-3.5 backdrop-blur-xl">
          <div className="flex items-center justify-between gap-3">
            <p className="truncate text-sm font-bold text-gray-900 font-[family-name:var(--font-display)]">{guest.guest_name}</p>
            <span className="shrink-0 rounded bg-gray-100 px-1.5 py-0.5 text-[10px] font-bold text-gray-500">
              {seats} {seats === 1 ? "seat" : "seats"}
            </span>
          </div>
          {guest.comment && (
            <p className="mt-2 line-clamp-2 text-xs italic text-gray-500 font-[family-name:var(--font-body)]">“{guest.comment}”</p>
          )}
        </div>

        <p className="mt-3 text-center text-[11px] text-gray-400 font-[family-name:var(--font-body)]">Use this for moderation only.</p>

        <div className="mt-5 flex gap-3">
          {/* Cancel is the default focus: destructive actions should never be the one Enter triggers */}
          <button
            autoFocus
            onClick={onCancel}
            disabled={isDeleting}
            className="flex-1 rounded-xl border border-gray-200 bg-white py-2.5 text-sm font-bold text-gray-700 shadow-sm transition-all hover:-translate-y-0.5 hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-50 cursor-pointer font-[family-name:var(--font-display)]"
          >
            Cancel
          </button>
          <button
            onClick={onConfirm}
            disabled={isDeleting}
            className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-red-500 py-2.5 text-sm font-bold text-white shadow-lg shadow-red-500/25 transition-all hover:-translate-y-0.5 hover:bg-red-600 disabled:cursor-not-allowed disabled:opacity-70 cursor-pointer font-[family-name:var(--font-display)]"
          >
            {isDeleting ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" /> Removing…
              </>
            ) : (
              <>
                <Trash2 className="h-4 w-4" /> Remove guest
              </>
            )}
          </button>
        </div>
      </motion.div>
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/*  Guest list skeleton                                                       */
/* -------------------------------------------------------------------------- */

function GuestSkeleton() {
  return (
    <div className="space-y-3" aria-hidden>
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="h-14 animate-pulse rounded-xl bg-gray-100" />
        ))}
      </div>
      {Array.from({ length: 3 }).map((_, i) => (
        <div key={i} className="h-16 animate-pulse rounded-xl bg-gray-100/80" />
      ))}
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/*  Main component                                                            */
/* -------------------------------------------------------------------------- */

export function InvitationModal({
  invitation,
  onClose,
  onPreview,
}: {
  invitation: Invitation;
  onClose: () => void;
  /** Optional: lets the parent offer a "Preview" shortcut right from the details view. */
  onPreview?: () => void;
}) {
  const [guests, setGuests] = useState<Guest[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [hasError, setHasError] = useState(false);
  const [retryKey, setRetryKey] = useState(0);

  const [filter, setFilter] = useState<GuestFilter>("all");
  const [copied, setCopied] = useState(false);

  // Delete flow: `pendingDelete` drives the confirm dialog, `isDeleting` its spinner.
  const [pendingDelete, setPendingDelete] = useState<Guest | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  // SSR-safe: this component only mounts client-side, but the guard keeps it future-proof.
  const publicUrl = useMemo(
    () => `${typeof window !== "undefined" ? window.location.origin : ""}/invite/${invitation.slug}`,
    [invitation.slug]
  );

  /* ------------------------------ Data loading ----------------------------- */
  useEffect(() => {
    // `cancelled` stops a slow response from updating state after unmount / re-fetch.
    let cancelled = false;
    setIsLoading(true);
    setHasError(false);

    (async () => {
      try {
        const res = await apiClient.get(`/admin/dashboard/invitations/${invitation.id}`);
        if (!cancelled) setGuests(res.data.data?.guests ?? []);
      } catch {
        if (!cancelled) {
          setHasError(true);
          toast.add({ title: "Error", description: "Failed to load guest list.", type: "error" });
        }
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [invitation.id, retryKey]);

  /* --------------------------------- Escape -------------------------------- */
  // While the confirm dialog is open it handles Escape itself, so we stand down.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && !pendingDelete && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose, pendingDelete]);

  /* ------------------------------ Copy feedback ---------------------------- */
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

  /* ------------------------------ Guest removal ---------------------------- */
  const handleConfirmDelete = async () => {
    if (!pendingDelete) return;
    const target = pendingDelete;

    setIsDeleting(true);
    try {
      await apiClient.delete(`/admin/dashboard/guests/${target.id}`);
      // Functional update: safe even if other state changed while the request ran.
      setGuests((prev) => prev.filter((g) => g.id !== target.id));
      setPendingDelete(null);
      toast.add({ title: "Guest removed", description: `${target.guest_name} was removed from the list.`, type: "success" });
    } catch {
      // Keep the dialog open so the admin can retry or cancel.
      toast.add({ title: "Error", description: "Failed to remove guest. Please try again.", type: "error" });
    } finally {
      setIsDeleting(false);
    }
  };

  /* ------------------------------ Derived data ----------------------------- */
  const stats = useMemo(() => {
    const counts: Record<RsvpStatus, number> = { attending: 0, declined: 0, pending: 0 };
    let confirmedSeats = 0;
    for (const g of guests) {
      const s = normalizeStatus(g.attendance_status);
      counts[s] += 1;
      if (s === "attending") confirmedSeats += g.number_of_guests || 0;
    }
    return { counts, confirmedSeats };
  }, [guests]);

  const visibleGuests = useMemo(
    () => (filter === "all" ? guests : guests.filter((g) => normalizeStatus(g.attendance_status) === filter)),
    [guests, filter]
  );

  const initials = `${invitation.first_name?.[0] ?? ""}${invitation.last_name?.[0] ?? ""}`.toUpperCase() || "?";

  const statTiles = [
    { label: "Attending", value: stats.counts.attending, tone: "text-emerald-600" },
    { label: "Declined", value: stats.counts.declined, tone: "text-red-500" },
    { label: "Pending", value: stats.counts.pending, tone: "text-amber-600" },
    { label: "Confirmed seats", value: stats.confirmedSeats, tone: "text-orange-600" },
  ];

  /* --------------------------------- Render -------------------------------- */
  return (
    // data-lenis-prevent: stops the global Lenis smooth-scroll from hijacking wheel events in here.
    <div data-lenis-prevent className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6">
      {/* Backdrop */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={onClose}
        className="absolute inset-0 cursor-pointer bg-gray-900/60 backdrop-blur-md"
      />

      {/* Panel */}
      <motion.div
        role="dialog"
        aria-modal="true"
        aria-label="Invitation details"
        initial={{ opacity: 0, scale: 0.95, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 20 }}
        transition={{ type: "spring", damping: 28, stiffness: 320 }}
        className="no-scrollbar relative z-10 flex max-h-[90vh] w-full max-w-2xl flex-col overflow-y-auto overscroll-contain rounded-[2rem] border border-white bg-[#fffafb] p-6 shadow-2xl md:p-8"
      >
        {/* Dot-grid texture (decorative) */}
        <div
          className="pointer-events-none absolute inset-0 z-0 rounded-[2rem] opacity-[0.04]"
          style={{ backgroundImage: "radial-gradient(#f97316 1px, transparent 1px)", backgroundSize: "24px 24px" }}
        />

        <div className="relative z-10">
          {/* ───────────── Header ───────────── */}
          <div className="mb-6 flex items-start justify-between">
            <div className="flex items-center gap-3">
              <div className="rounded-xl bg-orange-100 p-2.5 text-orange-600 shadow-inner">
                <LayoutTemplate className="h-5 w-5" />
              </div>
              <div>
                <h2 className="text-xl font-bold text-gray-900 font-[family-name:var(--font-display)]">Invitation details</h2>
                <p className="mt-0.5 text-xs text-gray-500 font-[family-name:var(--font-body)]">Read-only overview and guest moderation</p>
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
            {/* ───────────── Event hero ───────────── */}
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
                {fmtDate(invitation.event_date, { dateStyle: "long" })}
              </p>
            </div>

            {/* ───────────── Owner ───────────── */}
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
                    {fmtDate(invitation.created_at, { month: "short", day: "numeric", year: "numeric" })}
                  </dd>
                </div>
              </dl>
            </div>

            {/* ───────────── Guest moderation ───────────── */}
            <div className="rounded-2xl border border-orange-100/50 bg-white/70 p-4 shadow-sm backdrop-blur-xl">
              <div className="mb-4 flex items-center justify-between">
                <h4 className="flex items-center gap-2 text-sm font-bold text-gray-900 font-[family-name:var(--font-display)]">
                  <Users className="h-4 w-4 text-orange-500" /> Guest list (RSVPs)
                </h4>
                {!isLoading && !hasError && (
                  <span className="rounded-md bg-orange-100 px-2 py-1 text-xs font-bold text-orange-600">
                    {guests.length} {guests.length === 1 ? "response" : "responses"}
                  </span>
                )}
              </div>

              {isLoading ? (
                <GuestSkeleton />
              ) : hasError ? (
                <div className="flex flex-col items-center gap-2 py-6 text-center">
                  <div className="rounded-xl border border-red-100 bg-red-50 p-2.5 text-red-500">
                    <AlertTriangle className="h-5 w-5" />
                  </div>
                  <p className="text-sm font-bold text-gray-800 font-[family-name:var(--font-display)]">Couldn't load the guest list</p>
                  <button
                    onClick={() => setRetryKey((k) => k + 1)}
                    className="mt-1 flex items-center gap-1.5 rounded-lg border border-gray-200 bg-white px-3 py-1.5 text-xs font-bold text-gray-700 shadow-sm transition-all hover:-translate-y-0.5 hover:text-orange-600 cursor-pointer"
                  >
                    <RotateCw className="h-3.5 w-3.5" /> Try again
                  </button>
                </div>
              ) : guests.length === 0 ? (
                <p className="py-6 text-center text-xs text-gray-500 font-[family-name:var(--font-body)]">No guests have RSVP'd yet.</p>
              ) : (
                <>
                  {/* At-a-glance numbers */}
                  <div className="mb-4 grid grid-cols-2 gap-2 sm:grid-cols-4">
                    {statTiles.map((t) => (
                      <div key={t.label} className="rounded-xl border border-gray-100 bg-gray-50/80 px-3 py-2.5">
                        <p className={`text-lg font-bold leading-none font-[family-name:var(--font-display)] ${t.tone}`}>{t.value}</p>
                        <p className="mt-1 text-[11px] font-medium text-gray-500 font-[family-name:var(--font-body)]">{t.label}</p>
                      </div>
                    ))}
                  </div>

                  {/* Filter pills (the sliding highlight is a shared-layout animation) */}
                  <div role="tablist" aria-label="Filter guests" className="mb-3 flex flex-wrap gap-1.5">
                    {FILTERS.map(({ id, label }) => {
                      const active = filter === id;
                      const count = id === "all" ? guests.length : stats.counts[id];
                      return (
                        <button
                          key={id}
                          role="tab"
                          aria-selected={active}
                          onClick={() => setFilter(id)}
                          className={`relative rounded-lg px-3 py-1.5 text-xs font-bold transition-colors cursor-pointer font-[family-name:var(--font-display)] ${
                            active ? "text-orange-600" : "text-gray-500 hover:text-gray-800"
                          }`}
                        >
                          {active && (
                            <motion.span
                              layoutId="guest-filter-pill"
                              transition={{ type: "spring", damping: 30, stiffness: 400 }}
                              className="absolute inset-0 -z-0 rounded-lg border border-orange-100 bg-orange-50"
                            />
                          )}
                          <span className="relative z-10">
                            {label} <span className="opacity-60">{count}</span>
                          </span>
                        </button>
                      );
                    })}
                  </div>

                  {/* Scrollable list: data-lenis-prevent because it nests inside another scroller */}
                  <div data-lenis-prevent className="no-scrollbar max-h-72 space-y-2.5 overflow-y-auto overscroll-contain pr-1">
                    {visibleGuests.length === 0 && (
                      <p className="py-6 text-center text-xs text-gray-500 font-[family-name:var(--font-body)]">No guests in this group.</p>
                    )}

                    <AnimatePresence initial={false} mode="popLayout">
                      {visibleGuests.map((guest) => {
                        const status = normalizeStatus(guest.attendance_status);
                        const meta = RSVP_META[status];
                        return (
                          <motion.div
                            key={guest.id}
                            layout
                            initial={{ opacity: 0, y: 6 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, scale: 0.96 }}
                            transition={{ duration: 0.18 }}
                            className="group flex items-start justify-between gap-3 rounded-xl border border-gray-100 bg-gray-50/80 p-3 transition-colors hover:border-orange-100 hover:bg-white"
                          >
                            <div className="min-w-0 flex-1">
                              <div className="flex flex-wrap items-center gap-2">
                                <meta.Icon className={`h-4 w-4 shrink-0 ${meta.icon}`} />
                                <p className="truncate text-sm font-bold text-gray-900 font-[family-name:var(--font-display)]">{guest.guest_name}</p>
                                <span className={`rounded border px-1.5 py-0.5 text-[10px] font-bold ${meta.chip}`}>{meta.label}</span>
                                <span className="rounded bg-gray-200 px-1.5 py-0.5 text-[10px] font-bold text-gray-500">
                                  {guest.number_of_guests} {guest.number_of_guests === 1 ? "seat" : "seats"}
                                </span>
                              </div>
                              <p className="mt-1 pl-6 text-[11px] text-gray-400 font-[family-name:var(--font-body)]">
                                Responded {fmtDate(guest.created_at, { month: "short", day: "numeric" })}
                              </p>

                              {guest.comment && (
                                <div className="mt-2 flex items-start gap-1.5 rounded-lg border border-gray-100 bg-white p-2">
                                  <MessageSquare className="mt-0.5 h-3.5 w-3.5 shrink-0 text-gray-400" />
                                  <p className="text-xs italic text-gray-600 font-[family-name:var(--font-body)]">“{guest.comment}”</p>
                                </div>
                              )}
                            </div>

                            {/* Opens the confirm dialog. Always visible on touch screens,
                                revealed on hover/focus on desktop so the list stays calm. */}
                            <button
                              onClick={() => setPendingDelete(guest)}
                              title="Remove guest (moderation)"
                              aria-label={`Remove ${guest.guest_name}`}
                              className="rounded-lg p-2 text-gray-400 transition-all hover:bg-red-50 hover:text-red-500 focus-visible:opacity-100 sm:opacity-0 sm:group-hover:opacity-100 cursor-pointer"
                            >
                              <Trash2 className="h-4 w-4" />
                            </button>
                          </motion.div>
                        );
                      })}
                    </AnimatePresence>
                  </div>
                </>
              )}
            </div>

            {/* ───────────── Public link ───────────── */}
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
                  className="flex h-[38px] w-[38px] items-center justify-center rounded-lg border border-gray-200 bg-white text-gray-600 shadow-sm transition-all hover:-translate-y-0.5 hover:text-orange-600 cursor-pointer"
                >
                  {/* Icon cross-fades between Copy and Check */}
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

            {/* ───────────── Admin lock notice ───────────── */}
            <div className="flex items-start gap-3 rounded-2xl border border-red-100 bg-red-50/80 p-3.5">
              <Lock className="mt-0.5 h-4 w-4 shrink-0 text-red-500" />
              <p className="text-xs leading-relaxed text-red-800 font-[family-name:var(--font-body)]">
                <strong>Admin lock:</strong> You can't edit or delete this invitation. You can only remove guests for moderation. To revoke access, soft-delete the user instead.
              </p>
            </div>

            {/* ───────────── Footer actions ───────────── */}
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

      {/* Confirm dialog lives in its own AnimatePresence so it can animate out independently */}
      <AnimatePresence>
        {pendingDelete && (
          <ConfirmRemoveGuestDialog
            key="confirm-remove-guest"
            guest={pendingDelete}
            isDeleting={isDeleting}
            onCancel={() => setPendingDelete(null)}
            onConfirm={handleConfirmDelete}
          />
        )}
      </AnimatePresence>
    </div>
  );
}