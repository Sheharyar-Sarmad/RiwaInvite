"use client";

import * as React from "react";
import Link from "next/link";
import { createPortal } from "react-dom";
import { AnimatePresence, motion } from "framer-motion";
import {
  ArrowUpRight,
  CalendarDays,
  Check,
  Copy,
  ExternalLink,
  ImagePlus,
  ImageOff,
  Link2,
  Loader2,
  Lock,
  PenTool,
  Pencil,
  X,
  Radio,
  ImageIcon,
  Music,
  Video,
} from "lucide-react";
import {
  BTN,
  HEADING,
  Shimmer,
  StatusChip,
  cn,
  fmtDate,
} from "@/components/user/sections/dashboard/ui/DashboardUI";
import { FOCUS } from "@/components/user/navigation/UserSidebar";
import { DatePickerField } from "@/components/user/sections/rehearsal/ui/DateTimePicker";

/* ========================================================================== */
/*  Types & routes                                                            */
/* ========================================================================== */

export type Invitation = {
  id: string;
  title: string;
  status: string;
  slug: string | null;
  is_custom_slug: boolean;
  created_at: string;
  event_date?: string | null;
  expires_at?: string | null;
  template_id?: string | null;
  template_name?: string | null;
  cover_url?: string | null;
  rsvp_count: number;
  has_gallery?: boolean;
  has_video?: boolean;
  has_audio?: boolean;
};

export type PurchasedTemplate = {
  id: string;
  name: string;
  thumbnail_url: string;
  has_custom_slug: boolean;
  allows_custom_slug: boolean;
  status?: string;
};

export type QuickEditValues = {
  title: string;
  event_date: string;
  status: string;
};

export const INVITATION_ROUTES = {
  rehearse: (templateId: string) =>
    `/dashboard/rehearsal?template=${encodeURIComponent(templateId)}`,
  // CHANGED: Now uses ?invitation= instead of ?template=
  mainEdit: (invitationId: string) =>
    `/dashboard/rehearsal?invitation=${encodeURIComponent(invitationId)}`,
  unlock: (templateId: string) =>
    `/checkout/template/${encodeURIComponent(templateId)}`,
  browse: "/templates",
} as const;

const DAY = 86_400_000;
const GRACE_DAYS = 5;

function expiryOf(inv: Invitation): { end: Date; days: number } | null {
  let end: Date | null = null;
  if (inv.expires_at) end = new Date(inv.expires_at);
  else if (inv.event_date)
    end = new Date(new Date(inv.event_date).getTime() + GRACE_DAYS * DAY);
  if (!end || Number.isNaN(end.getTime())) return null;
  return { end, days: Math.ceil((end.getTime() - Date.now()) / DAY) };
}

/* ========================================================================== */
/*  Thumbnail & Prompts                                                       */
/* ========================================================================== */

function Thumb({
  src,
  className,
}: {
  src?: string | null;
  className?: string;
}) {
  const [failed, setFailed] = React.useState(false);
  React.useEffect(() => setFailed(false), [src]);

  if (!src || failed) {
    return (
      <div className="absolute inset-0 flex items-center justify-center bg-gradient-to-br from-stone-100 to-stone-200 text-stone-400">
        <ImageOff className="size-7" />
      </div>
    );
  }
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={src}
      alt=""
      loading="lazy"
      decoding="async"
      referrerPolicy="no-referrer"
      onError={() => setFailed(true)}
      className={cn("absolute inset-0 size-full object-cover", className)}
    />
  );
}

function AddPhotoPrompt({ href }: { href: string }) {
  return (
    <Link
      href={href}
      className={cn(
        "absolute inset-0 flex flex-col items-center justify-center gap-2 bg-gradient-to-br from-orange-50 via-stone-50 to-amber-50 px-4 text-center transition hover:from-orange-100/70",
        FOCUS,
      )}
    >
      <span className="flex size-11 items-center justify-center rounded-full bg-white text-orange-600 shadow-sm ring-1 ring-black/[0.06]">
        <ImagePlus className="size-5" />
      </span>
      <span className="text-sm font-semibold text-[#1c1410]">
        Add your own photo
      </span>
      <span className="text-[11px] leading-snug text-stone-500">
        Open the editor to put your photos on this invitation.
      </span>
    </Link>
  );
}

/* ========================================================================== */
/*  Invitation Card & Skeleton                                                */
/* ========================================================================== */

function ExpiryChip({ days }: { days: number }) {
  const tone =
    days < 0
      ? "bg-stone-100 text-stone-500"
      : days <= 3
        ? "bg-amber-100 text-amber-800"
        : "bg-emerald-50 text-emerald-700";
  const label =
    days < 0 ? "Expired" : days === 0 ? "Expires today" : `Expires in ${days}d`;
  return (
    <span
      className={cn(
        "shrink-0 whitespace-nowrap rounded-full px-2 py-0.5 text-[10px] font-bold",
        tone,
      )}
    >
      {label}
    </span>
  );
}

/* ========================================================================== */
/*  Ticket tokens (same as the Rehearsal + Billing cards)                     */
/* ========================================================================== */

const PAPER = "bg-gradient-to-br from-[#fffdfa] via-[#fff8f1] to-[#ffeddc]";

const TICKET_LIFT =
  "transition-transform duration-300 motion-reduce:transition-none [filter:drop-shadow(0_1px_1px_rgba(28,20,16,0.08))_drop-shadow(0_14px_20px_rgba(28,20,16,0.10))] hover:-translate-y-1 hover:[filter:drop-shadow(0_1px_1px_rgba(28,20,16,0.10))_drop-shadow(0_22px_26px_rgba(28,20,16,0.16))]";

const STUB_H = "4.5rem";
const TICKET_MASK = `radial-gradient(circle 9px at 0 calc(100% - ${STUB_H}), #0000 97%, #000) left / 51% 100% no-repeat, radial-gradient(circle 9px at 100% calc(100% - ${STUB_H}), #0000 97%, #000) right / 51% 100% no-repeat`;

function Sheen() {
  return (
    <span
      aria-hidden
      className="pointer-events-none absolute inset-y-0 -left-1/2 z-10 w-1/2 -skew-x-12 bg-gradient-to-r from-transparent via-white/60 to-transparent opacity-0 transition-all duration-700 group-hover/card:left-full group-hover/card:opacity-100 motion-reduce:hidden"
    />
  );
}

export function InvitationCard({
  invitation,
  appUrl,
  onQuickEdit,
}: {
  invitation: Invitation;
  appUrl: string;
  onQuickEdit?: () => void;
}) {
  const [copied, setCopied] = React.useState(false);

  const shareLink =
    invitation.is_custom_slug && invitation.slug
      ? `${appUrl}/invite/${invitation.slug}`
      : `${appUrl}/invite/${invitation.id}`;

  const mainEditHref = INVITATION_ROUTES.mainEdit(invitation.id);
  const live = invitation.status === "published";

  React.useEffect(() => {
    if (!copied) return;
    const id = window.setTimeout(() => setCopied(false), 1800);
    return () => window.clearTimeout(id);
  }, [copied]);

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(shareLink);
      setCopied(true);
    } catch {}
  };

  const expiry = expiryOf(invitation);
  const iconBtn =
    "flex size-9 items-center justify-center rounded-lg border border-black/[0.08] bg-white text-stone-600 transition hover:border-orange-300 hover:text-orange-600 active:scale-95";

  return (
    <li className="min-w-0">
      <div className={cn("group/card h-full", TICKET_LIFT)}>
        <article
          style={{ WebkitMask: TICKET_MASK, mask: TICKET_MASK }}
          className={cn(
            "relative flex h-full flex-col overflow-hidden rounded-2xl border",
            PAPER,
            live ? "border-emerald-400/60" : "border-black/[0.07]",
          )}
        >
          <Sheen />

          {/* top accent: green when live, orange while draft */}
          <span
            aria-hidden
            className={cn(
              "absolute inset-x-0 top-0 z-20 h-1",
              live
                ? "bg-gradient-to-r from-emerald-500 to-emerald-400"
                : "bg-gradient-to-r from-orange-400 to-amber-300",
            )}
          />

          <div className="relative aspect-[16/10] w-full overflow-hidden bg-stone-100 sm:aspect-[5/4]">
            {invitation.cover_url ? (
              <Thumb
                src={invitation.cover_url}
                className="transition-transform duration-700 group-hover/card:scale-[1.03]"
              />
            ) : (
              <AddPhotoPrompt href={mainEditHref} />
            )}
            <div
              aria-hidden
              className="pointer-events-none absolute inset-0 ring-1 ring-inset ring-black/[0.05]"
            />
            <div className="absolute right-2 top-3 sm:right-3">
              <StatusChip status={invitation.status} />
            </div>
          </div>

          <div className="flex flex-1 flex-col gap-2.5 p-3 sm:p-4">
            <div className="min-w-0">
              <p className="truncate text-[11px] font-semibold uppercase leading-4 tracking-[0.12em] text-stone-500">
                {invitation.template_name || "Template"}
              </p>
              <h3
                className={cn(
                  HEADING,
                  "h-6 truncate text-[15px] leading-6 tracking-[-0.01em] text-[#1c1410] sm:text-base",
                )}
                title={invitation.title}
              >
                {invitation.title}
              </h3>
              <p className="truncate text-xs text-stone-500">
                Created {fmtDate(invitation.created_at)}
              </p>
            </div>

            {/* date strip: always rendered so every card has the same height */}
            <div className="flex h-9 items-center justify-between gap-2 rounded-xl bg-white/70 px-2.5 ring-1 ring-black/[0.05]">
              <span className="inline-flex min-w-0 items-center gap-1.5 text-xs font-medium text-stone-600">
                <CalendarDays className="size-3.5 shrink-0 text-stone-400" />
                <span className="truncate">
                  {invitation.event_date
                    ? fmtDate(invitation.event_date)
                    : "No event date"}
                </span>
              </span>
              {expiry && <ExpiryChip days={expiry.days} />}
            </div>

            {/* RSVPs, media badges, share */}
            <div className="mt-auto flex items-center justify-between gap-2 pt-0.5">
              <div className="flex items-center gap-3">
                <div className="leading-tight">
                  <p className="text-[10px] font-bold uppercase tracking-wider text-stone-400">
                    RSVPs
                  </p>
                  <p className="text-sm font-semibold tabular-nums text-[#1c1410]">
                    {invitation.rsvp_count}
                  </p>
                </div>
                <div className="flex items-center gap-1.5 pt-2">
                  {invitation.has_gallery && (
                    <span
                      title="Gallery images included"
                      className="flex size-6 items-center justify-center rounded bg-stone-100 text-stone-500"
                    >
                      <ImageIcon className="size-3.5" />
                    </span>
                  )}
                  {invitation.has_video && (
                    <span
                      title="Video included"
                      className="flex size-6 items-center justify-center rounded bg-stone-100 text-stone-500"
                    >
                      <Video className="size-3.5" />
                    </span>
                  )}
                  {invitation.has_audio && (
                    <span
                      title="Background music included"
                      className="flex size-6 items-center justify-center rounded bg-stone-100 text-stone-500"
                    >
                      <Music className="size-3.5" />
                    </span>
                  )}
                </div>
              </div>

              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  onClick={copy}
                  className={cn(iconBtn, FOCUS)}
                  aria-label="Copy share link"
                  title="Copy share link"
                >
                  {copied ? (
                    <Check className="size-4 text-emerald-600" />
                  ) : (
                    <Copy className="size-4" />
                  )}
                </button>
                <a
                  href={shareLink}
                  target="_blank"
                  rel="noreferrer"
                  className={cn(iconBtn, FOCUS)}
                  aria-label="Open live invitation"
                  title="Open live invitation"
                >
                  <ExternalLink className="size-4" />
                </a>
              </div>
            </div>
          </div>

          {/* perforated stub */}
          <div
            className="flex shrink-0 items-center gap-2 border-t border-dashed border-[#1c1410]/25 px-3 sm:px-4"
            style={{ height: STUB_H }}
          >
            <Link
              href={mainEditHref}
              className={cn(
                BTN,
                "inline-flex h-11 min-w-0 flex-1 items-center justify-center gap-1.5 whitespace-nowrap rounded-xl px-3 text-[13px] font-semibold",
                FOCUS,
              )}
            >
              <PenTool className="size-4 shrink-0" /> Edit invitation
            </Link>
            <button
              type="button"
              onClick={onQuickEdit}
              disabled={!onQuickEdit}
              title="Quick edit"
              aria-label={`Quick edit ${invitation.title}`}
              className={cn(
                "inline-flex size-11 shrink-0 items-center justify-center rounded-xl border border-black/[0.08] bg-white text-stone-600 transition hover:border-orange-300 hover:text-orange-600 active:scale-95 disabled:opacity-50",
                FOCUS,
              )}
            >
              <Pencil className="size-4" />
            </button>
          </div>
        </article>
      </div>
    </li>
  );
}
export function InvitationGridSkeleton({ count = 6 }: { count?: number }) {
  return (
    <ul
      className="grid gap-3 sm:grid-cols-2 sm:gap-4 lg:grid-cols-3 xl:grid-cols-4"
      aria-hidden
    >
      {Array.from({ length: count }).map((_, i) => (
        <li key={i} className="min-w-0">
          <div
            className={cn(
              "flex h-full flex-col overflow-hidden rounded-2xl border border-black/[0.07]",
              PAPER,
            )}
          >
            <Shimmer className="aspect-[16/10] w-full rounded-none sm:aspect-[5/4]" />
            <div className="flex flex-1 flex-col gap-2.5 p-3 sm:p-4">
              <Shimmer className="h-4 w-1/3 rounded-md" />
              <Shimmer className="h-6 w-3/4 rounded-md" />
              <Shimmer className="h-9 w-full rounded-xl" />
              <Shimmer className="mt-auto h-9 w-full rounded-md" />
            </div>
            <div
              className="flex items-center gap-2 border-t border-dashed border-black/15 px-3 sm:px-4"
              style={{ height: STUB_H }}
            >
              <Shimmer className="h-11 flex-1 rounded-xl" />
              <Shimmer className="size-11 rounded-xl" />
            </div>
          </div>
        </li>
      ))}
    </ul>
  );
}

/* ========================================================================== */
/*  Modals                                                                    */
/* ========================================================================== */

const pad = (n: number) => String(n).padStart(2, "0");
const toInputDate = (d: Date) =>
  `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;

function toDateInputValue(v?: string | null): string {
  if (!v) return "";
  const m = /^(\d{4}-\d{2}-\d{2})/.exec(v);
  if (m) return m[1];
  const d = new Date(v);
  return Number.isNaN(d.getTime()) ? "" : toInputDate(d);
}

function quickEditError(err: unknown): string {
  const e = err as {
    response?: {
      status?: number;
      data?: { error?: { message?: unknown }; message?: unknown };
    };
  } | null;
  const status = e?.response?.status;
  const serverMsg =
    e?.response?.data?.error?.message ?? e?.response?.data?.message;
  if (status === 401) return "Your session expired. Please sign in again.";
  if (status === 404) return "This invitation no longer exists.";
  if (status === 429)
    return "You’re going too fast. Wait a moment and try again.";
  if (
    (status === 400 || status === 422) &&
    typeof serverMsg === "string" &&
    serverMsg.length < 160
  )
    return serverMsg;
  return "We couldn’t save your changes. Please try again.";
}

export function QuickEditModal({
  invitation,
  onClose,
  onSave,
}: {
  invitation: Invitation | null;
  onClose: () => void;
  onSave: (id: string, values: QuickEditValues) => Promise<void>;
}) {
  const [mounted, setMounted] = React.useState(false);
  const [title, setTitle] = React.useState("");
  const [date, setDate] = React.useState("");
  const [status, setStatus] = React.useState("draft");
  const [busy, setBusy] = React.useState(false);
  const [error, setError] = React.useState("");

  React.useEffect(() => setMounted(true), []);

  React.useEffect(() => {
    if (!invitation) return;
    setTitle(invitation.title ?? "");
    setDate(toDateInputValue(invitation.event_date));
    setStatus(invitation.status ?? "draft");
    setError("");
    setBusy(false);
  }, [invitation?.id]);

  React.useEffect(() => {
    if (!invitation) return;
    const onKey = (e: KeyboardEvent) =>
      e.key === "Escape" && !busy && onClose();
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    window.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = prev;
      window.removeEventListener("keydown", onKey);
    };
  }, [invitation, busy, onClose]);

  if (!mounted) return null;

  const trimmed = title.trim();
  const unchanged =
    !!invitation &&
    trimmed === (invitation.title ?? "").trim() &&
    date === toDateInputValue(invitation.event_date) &&
    status === (invitation.status ?? "draft");

  const canSave =
    !!invitation &&
    trimmed.length > 0 &&
    trimmed.length <= 100 &&
    date !== "" &&
    !unchanged &&
    !busy;

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!invitation || !canSave) return;
    setError("");
    setBusy(true);
    try {
      await onSave(invitation.id, { title: trimmed, event_date: date, status });
    } catch (err) {
      setError(quickEditError(err));
      setBusy(false);
    }
  };

  const field =
    "h-11 w-full rounded-xl border border-black/[0.1] bg-white px-3 text-sm font-medium text-[#1c1410] placeholder:text-stone-400 transition-colors hover:border-black/20";

  return createPortal(
    <AnimatePresence>
      {invitation && (
        <div className="fixed inset-0 z-[100] flex items-end justify-center sm:items-center sm:p-6">
          <motion.div
            key="backdrop"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => !busy && onClose()}
            className="absolute inset-0 bg-stone-950/40 backdrop-blur-sm"
          />
          <motion.form
            key="panel"
            onSubmit={submit}
            initial={{ opacity: 0, y: 40, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 40, scale: 0.98 }}
            className="relative w-full max-w-md rounded-t-3xl bg-white p-5 pb-[max(1.25rem,env(safe-area-inset-bottom))] shadow-2xl ring-1 ring-black/[0.06] sm:rounded-3xl sm:p-6"
          >
            <div className="flex items-start justify-between gap-3">
              <div>
                <h2 className={cn(HEADING, "text-xl text-[#1c1410]")}>
                  Quick edit
                </h2>
                <p className="mt-0.5 text-xs text-stone-500">
                  Update the name, date, and visibility.
                </p>
              </div>
              <button
                type="button"
                onClick={onClose}
                disabled={busy}
                className={cn(
                  "flex size-9 items-center justify-center rounded-full bg-stone-100 text-stone-600 hover:bg-stone-200",
                  FOCUS,
                )}
              >
                <X className="size-4" />
              </button>
            </div>

            <div className="mt-5 space-y-4">
              <label className="block">
                <span className="mb-1.5 block text-xs font-bold uppercase tracking-wide text-stone-500">
                  Invitation name
                </span>
                <input
                  type="text"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  maxLength={100}
                  required
                  className={field}
                />
              </label>

              <div>
                <span className="mb-1.5 block text-xs font-bold uppercase tracking-wide text-stone-500">
                  Event date
                </span>
                <DatePickerField
                  value={date}
                  onChange={setDate}
                  ariaLabel="Event date"
                />
              </div>

              <div>
                <span className="mb-1.5 block text-xs font-bold uppercase tracking-wide text-stone-500">
                  Visibility
                </span>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setStatus("draft")}
                    className={cn(
                      "flex h-11 items-center justify-center gap-2 rounded-xl border text-sm font-semibold transition",
                      status === "draft"
                        ? "border-orange-500 bg-orange-50 text-orange-700"
                        : "border-black/[0.08] bg-white text-stone-600 hover:bg-stone-50",
                      FOCUS,
                    )}
                  >
                    <Pencil className="size-4" /> Draft
                  </button>
                  <button
                    type="button"
                    onClick={() => setStatus("published")}
                    className={cn(
                      "flex h-11 items-center justify-center gap-2 rounded-xl border text-sm font-semibold transition",
                      status === "published"
                        ? "border-emerald-500 bg-emerald-50 text-emerald-700"
                        : "border-black/[0.08] bg-white text-stone-600 hover:bg-stone-50",
                      FOCUS,
                    )}
                  >
                    <Radio className="size-4" /> Live
                  </button>
                </div>
              </div>

              {error && (
                <p className="rounded-xl bg-rose-50 px-3 py-2 text-sm font-medium text-rose-700">
                  {error}
                </p>
              )}

              <div className="flex flex-col-reverse gap-2 pt-2 sm:flex-row">
                <button
                  type="button"
                  onClick={onClose}
                  disabled={busy}
                  className={cn(
                    "h-11 flex-1 rounded-xl border border-black/[0.08] bg-white text-sm font-semibold text-stone-700 hover:bg-stone-50",
                    FOCUS,
                  )}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={!canSave}
                  className={cn(
                    BTN,
                    "h-11 flex-1 rounded-xl text-sm disabled:opacity-60",
                    FOCUS,
                  )}
                >
                  {busy ? (
                    <>
                      <Loader2 className="size-4 animate-spin" /> Saving…
                    </>
                  ) : (
                    "Save changes"
                  )}
                </button>
              </div>
            </div>
          </motion.form>
        </div>
      )}
    </AnimatePresence>,
    document.body,
  );
}

function errorText(err: unknown): string {
  const e = err as {
    response?: {
      status?: number;
      data?: { error?: { message?: unknown }; message?: unknown };
    };
  } | null;
  const status = e?.response?.status;
  const serverMsg =
    e?.response?.data?.error?.message ?? e?.response?.data?.message;
  if (status === 401) return "Your session expired. Please sign in again.";
  if (status === 403) return "This template isn’t available on your account.";
  if (status === 429)
    return "You’re going too fast. Wait a moment and try again.";
  if (
    (status === 400 || status === 422) &&
    typeof serverMsg === "string" &&
    serverMsg.length < 160
  )
    return serverMsg;
  return "We couldn’t create your invitation. Please try again.";
}

export function CreateInvitationModal({
  open,
  onClose,
  templates,
  usedTemplateIds,
  loading,
  failed,
  onRetry,
  initialTemplateId,
  onCreate,
}: {
  open: boolean;
  onClose: () => void;
  templates: PurchasedTemplate[];
  usedTemplateIds: Set<string>;
  loading: boolean;
  failed: boolean;
  onRetry: () => void;
  initialTemplateId?: string | null;
  onCreate: (templateId: string) => Promise<void>;
}) {
  const [mounted, setMounted] = React.useState(false);
  const [selectedId, setSelectedId] = React.useState<string | null>(null);
  const [busy, setBusy] = React.useState(false);
  const [error, setError] = React.useState("");

  React.useEffect(() => setMounted(true), []);

  React.useEffect(() => {
    if (!open) return;
    setSelectedId(initialTemplateId ?? null);
    setError("");
    setBusy(false);
  }, [open, initialTemplateId]);

  React.useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) =>
      e.key === "Escape" && !busy && onClose();
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    window.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = prev;
      window.removeEventListener("keydown", onKey);
    };
  }, [open, busy, onClose]);

  const selected = selectedId
    ? (templates.find((t) => t.id === selectedId) ?? null)
    : null;
  const archived = selected?.status === "archived";
  const alreadyCreated = selected ? usedTemplateIds.has(selected.id) : false;

  const sortedTemplates = React.useMemo(
    () =>
      [...templates].sort(
        (a, b) =>
          Number(usedTemplateIds.has(a.id)) - Number(usedTemplateIds.has(b.id)),
      ),
    [templates, usedTemplateIds],
  );
  const availableCount = templates.filter(
    (t) => !usedTemplateIds.has(t.id),
  ).length;

  const submit = async () => {
    if (!selected || archived || alreadyCreated || busy) return;
    setError("");
    setBusy(true);
    try {
      await onCreate(selected.id);
    } catch (err) {
      setError(errorText(err));
      setBusy(false);
    }
  };

  if (!mounted) return null;

  let body: React.ReactNode;

  // Shows skeleton if loading, regardless of templates length
  if (loading) {
    body = (
      <div className="mt-5 space-y-3" aria-busy="true">
        <Shimmer className="h-16 w-full rounded-xl" />
        <Shimmer className="h-11 w-full rounded-xl" />
      </div>
    );
  } else if (failed && templates.length === 0) {
    body = (
      <div className="mt-5 rounded-xl bg-rose-50 p-4 text-sm text-rose-700">
        We couldn’t load your library.{" "}
        <button
          type="button"
          onClick={onRetry}
          className="font-bold underline underline-offset-2"
        >
          Try again
        </button>
      </div>
    );
  } else if (selectedId && !selected) {
    body = (
      <div className="mt-5 space-y-3">
        <div className="rounded-xl bg-amber-50 p-4 text-sm text-amber-900 ring-1 ring-amber-200">
          <p className="flex items-center gap-2 font-semibold">
            <Lock className="size-4" /> This template isn’t in your library yet
          </p>
          <p className="mt-1 text-xs leading-relaxed">
            Unlock it to create an invitation, or pick one you already own.
          </p>
        </div>
        <div className="flex flex-col gap-2 sm:flex-row">
          <Link
            href={INVITATION_ROUTES.unlock(selectedId)}
            className={cn(BTN, "h-11 flex-1 rounded-xl text-sm", FOCUS)}
          >
            Unlock template <ArrowUpRight className="size-4" />
          </Link>
          <button
            type="button"
            onClick={() => setSelectedId(null)}
            className={cn(
              "h-11 flex-1 rounded-xl border border-black/[0.08] bg-white text-sm font-semibold text-stone-700 hover:bg-stone-50",
              FOCUS,
            )}
          >
            Choose another
          </button>
        </div>
      </div>
    );
  } else if (!selected) {
    body =
      templates.length === 0 ? (
        <div className="mt-5 rounded-xl border border-dashed border-stone-300 bg-stone-50/60 p-6 text-center">
          <p className="text-sm font-semibold text-[#1c1410]">
            Your library is empty
          </p>
          <p className="mt-1 text-xs text-stone-500">
            Get a template first, then come back to create your invitation.
          </p>
          <Link
            href={INVITATION_ROUTES.browse}
            className={cn(BTN, "mt-4 h-10 px-5 text-sm", FOCUS)}
          >
            Browse templates
          </Link>
        </div>
      ) : (
        <div
          data-lenis-prevent
          className="mt-5 max-h-[52dvh] space-y-2 overflow-y-auto overscroll-contain pr-1"
        >
          <p className="text-sm text-stone-500">
            {availableCount > 0
              ? "Choose a template from your library. Each template makes one invitation."
              : "You’ve already created an invitation for every template you own."}
          </p>

          {sortedTemplates.map((t) => {
            const used = usedTemplateIds.has(t.id);
            return (
              <button
                key={t.id}
                type="button"
                disabled={used}
                onClick={() => setSelectedId(t.id)}
                className={cn(
                  "flex w-full items-center gap-3 rounded-xl border border-black/[0.08] bg-white p-2.5 text-left transition",
                  used
                    ? "cursor-not-allowed bg-stone-50/70"
                    : "hover:border-orange-300 hover:bg-orange-50/50 active:scale-[0.99]",
                  FOCUS,
                )}
              >
                <span className="relative size-12 shrink-0 overflow-hidden rounded-lg bg-stone-100">
                  <Thumb
                    src={t.thumbnail_url}
                    className={used ? "opacity-50 grayscale" : undefined}
                  />
                </span>
                <span className="min-w-0 flex-1">
                  <span
                    className={cn(
                      "block truncate text-sm font-semibold",
                      used ? "text-stone-500" : "text-[#1c1410]",
                    )}
                  >
                    {t.name}
                  </span>
                  {used ? (
                    <span className="mt-0.5 inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-emerald-700 ring-1 ring-emerald-100">
                      <Check className="size-3" /> Already created
                    </span>
                  ) : (
                    t.has_custom_slug && (
                      <span className="text-[10px] font-bold uppercase tracking-wide text-orange-600">
                        Custom link included
                      </span>
                    )
                  )}
                </span>
                {!used && (
                  <ArrowUpRight className="size-4 shrink-0 text-stone-400" />
                )}
              </button>
            );
          })}
        </div>
      );
  } else {
    body = (
      <div className="mt-5 space-y-4">
        <div className="flex items-center gap-3 rounded-xl bg-stone-50 p-3 ring-1 ring-black/[0.05]">
          <span className="relative size-14 shrink-0 overflow-hidden rounded-lg bg-stone-200">
            <Thumb src={selected.thumbnail_url} />
          </span>
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-semibold text-[#1c1410]">
              {selected.name}
            </p>
            {!alreadyCreated && (
              <Link
                href={INVITATION_ROUTES.rehearse(selected.id)}
                className="mt-0.5 inline-flex items-center gap-1 text-xs font-semibold text-orange-600 hover:underline"
              >
                <PenTool className="size-3" /> Edit in Rehearsal Studio first
              </Link>
            )}
          </div>
          <button
            type="button"
            onClick={() => setSelectedId(null)}
            disabled={busy}
            className="shrink-0 text-xs font-medium text-stone-500 underline underline-offset-2 hover:text-stone-800 disabled:opacity-50"
          >
            Change
          </button>
        </div>

        {alreadyCreated ? (
          <div className="space-y-3">
            <div className="rounded-xl bg-emerald-50 p-4 text-sm text-emerald-900 ring-1 ring-emerald-200">
              <p className="flex items-center gap-2 font-semibold">
                <Check className="size-4" /> Invitation already created
              </p>
              <p className="mt-1 text-xs leading-relaxed">
                Each template makes one invitation. You can keep editing the one
                you have.
              </p>
            </div>
            <div className="flex flex-col gap-2 sm:flex-row">
              <button
                type="button"
                onClick={onClose}
                className={cn(BTN, "h-11 flex-1 rounded-xl text-sm", FOCUS)}
              >
                <Check className="size-4" /> Back to my invitations
              </button>
              <button
                type="button"
                onClick={() => setSelectedId(null)}
                className={cn(
                  "h-11 flex-1 rounded-xl border border-black/[0.08] bg-white text-sm font-semibold text-stone-700 hover:bg-stone-50",
                  FOCUS,
                )}
              >
                Choose another
              </button>
            </div>
          </div>
        ) : archived ? (
          <p className="rounded-xl bg-stone-100 px-4 py-3 text-center text-sm font-medium text-stone-600">
            This template was retired and can’t start new invitations.
          </p>
        ) : (
          <>
            <ul className="space-y-1.5 rounded-xl bg-stone-50 px-3 py-2.5 text-xs text-stone-600 ring-1 ring-black/[0.05]">
              <li className="flex items-center gap-2">
                <Link2 className="size-3.5 shrink-0 text-stone-400" />
                {selected.has_custom_slug ? (
                  <span>
                    <span className="font-semibold text-emerald-700">
                      Your custom link
                    </span>{" "}
                    will be used.
                  </span>
                ) : (
                  <span>A unique link will be generated.</span>
                )}
              </li>
              <li className="flex items-center gap-2">
                <PenTool className="size-3.5 shrink-0 text-stone-400" />
                <span>
                  If you rehearsed this template, your saved design is used
                  automatically.
                </span>
              </li>
            </ul>

            {error && (
              <p
                role="alert"
                className="rounded-xl bg-rose-50 px-3 py-2 text-sm font-medium text-rose-700"
              >
                {error}
              </p>
            )}

            <button
              type="button"
              onClick={() => void submit()}
              disabled={busy}
              className={cn(
                BTN,
                "h-11 w-full rounded-xl text-sm disabled:cursor-not-allowed disabled:opacity-60",
                FOCUS,
              )}
            >
              {busy ? (
                <>
                  <Loader2 className="size-4 animate-spin" /> Creating…
                </>
              ) : (
                "Create invitation"
              )}
            </button>
          </>
        )}
      </div>
    );
  }

  return createPortal(
    <AnimatePresence>
      {open && (
        <div className="fixed inset-0 z-[100] flex items-end justify-center sm:items-center sm:p-6">
          <motion.div
            key="backdrop"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => !busy && onClose()}
            className="absolute inset-0 bg-stone-950/40 backdrop-blur-sm"
          />
          <motion.div
            key="panel"
            role="dialog"
            aria-modal="true"
            aria-labelledby="create-inv-title"
            initial={{ opacity: 0, y: 40, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 40, scale: 0.98 }}
            transition={{ type: "spring", damping: 34, stiffness: 380 }}
            className="relative w-full max-w-lg rounded-t-3xl bg-white p-5 pb-[max(1.25rem,env(safe-area-inset-bottom))] shadow-2xl ring-1 ring-black/[0.06] sm:rounded-3xl sm:p-6"
          >
            <div className="flex items-center justify-between gap-3">
              <h2
                id="create-inv-title"
                className={cn(HEADING, "text-xl text-[#1c1410]")}
              >
                Create invitation
              </h2>
              <button
                type="button"
                onClick={onClose}
                disabled={busy}
                aria-label="Close"
                className={cn(
                  "flex size-9 items-center justify-center rounded-full bg-stone-100 text-stone-600 transition hover:bg-stone-200 disabled:opacity-50",
                  FOCUS,
                )}
              >
                <X className="size-4" />
              </button>
            </div>
            {body}
          </motion.div>
        </div>
      )}
    </AnimatePresence>,
    document.body,
  );
}
