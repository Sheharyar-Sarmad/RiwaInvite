"use client";

import { useEffect, useId, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import {
  AlertCircle,
  CalendarDays,
  ChevronRight,
  Loader2,
  X,
} from "lucide-react";
import * as XLSX from "xlsx";
import { jsPDF } from "jspdf";
import autoTable from "jspdf-autotable";

import {
  BTN,
  HEADING,
  StatusChip,
  cn,
  fmtDate,
} from "@/components/user/sections/dashboard/ui/DashboardUI";
import { FOCUS } from "@/components/user/navigation/UserSidebar";
import { AceternitySelect } from "@/components/ui/aceternity-select";

/* -------------------------------------------------------------------------- */
/*                                    Types                                   */
/* -------------------------------------------------------------------------- */

export type AttendanceStatus = "pending" | "accepted" | "declined";

export type InvitationSummary = {
  invitation_id: string;
  title: string;
  event_date: string;
  invitation_status: string;
  total_guests: number;
  accepted: number;
  declined: number;
  pending: number;
  total_seats: number;
};

export type Guest = {
  id: string;
  guest_name: string;
  attendance_status: AttendanceStatus;
  number_of_guests: number;
  comment: string;
  created_at: string;
};

export type GuestPayload = {
  guest_name: string;
  attendance_status: AttendanceStatus;
  number_of_guests: number;
  comment?: string;
};

export const STATUS_LABEL: Record<AttendanceStatus, string> = {
  pending: "Pending",
  accepted: "Accepted",
  declined: "Declined",
};

const STATUS_OPTIONS = [
  { label: "Pending", value: "pending" },
  { label: "Accepted", value: "accepted" },
  { label: "Declined", value: "declined" },
];

const STATUS_PILL: Record<AttendanceStatus, string> = {
  accepted: "bg-emerald-50 text-emerald-700 ring-emerald-600/20",
  declined: "bg-rose-50 text-rose-700 ring-rose-600/20",
  pending: "bg-amber-50 text-amber-700 ring-amber-600/20",
};

const STATUS_DOT: Record<AttendanceStatus, string> = {
  accepted: "bg-emerald-500",
  declined: "bg-rose-500",
  pending: "bg-amber-500",
};

/* -------------------------------------------------------------------------- */
/*                               Guest status pill                            */
/* -------------------------------------------------------------------------- */

export function GuestStatusPill({ status }: { status: AttendanceStatus }) {
  const key: AttendanceStatus = status in STATUS_LABEL ? status : "pending";
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-bold uppercase tracking-wider ring-1 ring-inset",
        STATUS_PILL[key]
      )}
    >
      <span className={cn("h-1.5 w-1.5 rounded-full", STATUS_DOT[key])} />
      {STATUS_LABEL[key]}
    </span>
  );
}

/* -------------------------------------------------------------------------- */
/*                             Invitation RSVP card                           */
/* -------------------------------------------------------------------------- */

const STATS = [
  { key: "total_guests", label: "Total", tone: "text-[#1c1410]" },
  { key: "accepted", label: "Accepted", tone: "text-emerald-600" },
  { key: "declined", label: "Declined", tone: "text-rose-600" },
  { key: "pending", label: "Pending", tone: "text-amber-600" },
] as const;

export function InvitationRSVPCard({
  invitation,
  onClick,
}: {
  invitation: InvitationSummary;
  onClick: () => void;
}) {
  const { total_guests, accepted, declined, pending } = invitation;
  const pct = (n: number) => (total_guests > 0 ? (n / total_guests) * 100 : 0);

  return (
    <motion.button
      type="button"
      onClick={onClick}
      whileHover={{ y: -4 }}
      whileTap={{ scale: 0.98 }}
      transition={{ type: "spring", stiffness: 400, damping: 28 }}
      className={cn(
        "group flex w-full flex-col overflow-hidden rounded-2xl bg-white p-5 text-left ring-1 ring-black/[0.06] shadow-[0_1px_2px_rgba(28,20,16,0.04),0_12px_28px_-18px_rgba(28,20,16,0.22)]",
        "transition-shadow hover:shadow-[0_1px_2px_rgba(28,20,16,0.05),0_22px_40px_-20px_rgba(28,20,16,0.32)]",
        FOCUS
      )}
    >
      <div className="flex items-start justify-between gap-3 w-full">
        <div className="min-w-0">
          <h3 className={cn(HEADING, "truncate text-lg text-[#1c1410]")}>
            {invitation.title}
          </h3>
          <p className="mt-1 flex items-center gap-1.5 text-xs font-medium text-stone-500">
            <CalendarDays className="h-3.5 w-3.5 shrink-0" aria-hidden />
            {fmtDate(invitation.event_date)}
          </p>
        </div>
        <StatusChip status={invitation.invitation_status} />
      </div>

      <div className="mt-5 grid grid-cols-4 gap-2 w-full">
        {STATS.map((s) => (
          <div
            key={s.key}
            className="flex flex-col items-center rounded-xl bg-stone-50/80 px-2 py-2.5 ring-1 ring-black/[0.02]"
          >
            <p className={cn("text-xl font-bold tabular-nums tracking-tight", s.tone)}>
              {invitation[s.key]}
            </p>
            <p className="mt-0.5 text-[10px] font-bold uppercase tracking-wider text-stone-400">{s.label}</p>
          </div>
        ))}
      </div>

      <div
        className="mt-4 flex h-1.5 w-full overflow-hidden rounded-full bg-stone-100"
        role="img"
        aria-label={`${accepted} accepted, ${declined} declined, ${pending} pending`}
      >
        <div className="bg-emerald-500 transition-all duration-500" style={{ width: `${pct(accepted)}%` }} />
        <div className="bg-rose-500 transition-all duration-500" style={{ width: `${pct(declined)}%` }} />
        <div className="bg-amber-400 transition-all duration-500" style={{ width: `${pct(pending)}%` }} />
      </div>

      <div className="mt-4 flex items-center justify-between text-xs font-medium w-full">
        <span className="text-stone-500">
          {invitation.total_seats} {invitation.total_seats === 1 ? "seat" : "seats"} confirmed
        </span>
        <span className="inline-flex items-center gap-0.5 text-orange-600 transition-transform group-hover:translate-x-1">
          View guests
          <ChevronRight className="h-4 w-4" aria-hidden />
        </span>
      </div>
    </motion.button>
  );
}

/* -------------------------------------------------------------------------- */
/*                                 Guest modal                                */
/* -------------------------------------------------------------------------- */

const COMMENT_MAX = 500;

const fieldClass = cn(
  "w-full rounded-xl border border-black/[0.1] bg-white px-3.5 py-2.5 text-sm text-[#1c1410]",
  "placeholder:text-stone-400 disabled:cursor-not-allowed disabled:bg-stone-50 disabled:text-stone-500",
  FOCUS
);

export function GuestModal({
  open,
  guest,
  onClose,
  onSubmit,
}: {
  open: boolean;
  guest?: Guest | null;
  onClose: () => void;
  onSubmit: (payload: GuestPayload) => Promise<void>;
}) {
  const isEdit = Boolean(guest);
  const uid = useId();
  const nameRef = useRef<HTMLInputElement>(null);

  const [name, setName] = useState("");
  const [status, setStatus] = useState<AttendanceStatus>("pending");
  const [seats, setSeats] = useState("1");
  const [comment, setComment] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [touched, setTouched] = useState(false);

  useEffect(() => {
    if (!open) return;
    setName(guest?.guest_name ?? "");
    setStatus(guest?.attendance_status ?? "pending");
    setSeats(String(guest?.number_of_guests ?? 1));
    setComment(guest?.comment ?? "");
    setError(null);
    setTouched(false);
    setSubmitting(false);
    const t = window.setTimeout(() => nameRef.current?.focus(), 100);
    return () => window.clearTimeout(t);
  }, [open, guest]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape" && !submitting) onClose();
    };
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    window.addEventListener("keydown", onKey);
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = prevOverflow;
    };
  }, [open, submitting, onClose]);

  const seatsNum = Number(seats);
  const nameInvalid = name.trim().length === 0;
  const seatsInvalid = !Number.isInteger(seatsNum) || seatsNum < 1;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setTouched(true);
    setError(null);
    if (nameInvalid || seatsInvalid) return;

    setSubmitting(true);
    try {
      const trimmed = comment.trim();
      await onSubmit({
        guest_name: name.trim(),
        attendance_status: status,
        number_of_guests: seatsNum,
        ...(trimmed ? { comment: trimmed } : {}),
      });
    } catch (err) {
      setError(
        err instanceof Error && err.message
          ? err.message
          : "Could not save this guest. Please try again."
      );
      setSubmitting(false);
    }
  }

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          className="fixed inset-0 z-[100] flex items-end justify-center sm:items-center sm:p-4"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.15 }}
        >
          <div
            className="absolute inset-0 bg-stone-950/40 backdrop-blur-sm"
            onClick={() => !submitting && onClose()}
            aria-hidden
          />

          <motion.div
            role="dialog"
            aria-modal="true"
            aria-labelledby={`${uid}-title`}
            className="relative w-full max-w-lg rounded-t-3xl bg-white shadow-2xl ring-1 ring-black/[0.06] sm:rounded-3xl"
            initial={{ opacity: 0, y: 40, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 40, scale: 0.98 }}
            transition={{ type: "spring", stiffness: 380, damping: 32 }}
          >
            <div className="flex items-center justify-between border-b border-black/[0.06] px-6 py-4">
              <h2 id={`${uid}-title`} className={cn(HEADING, "text-xl text-[#1c1410]")}>
                {isEdit ? "Edit guest" : "Add guest manually"}
              </h2>
              <button
                type="button"
                onClick={onClose}
                disabled={submitting}
                className={cn(
                  "rounded-full p-2 text-stone-400 transition-colors hover:bg-stone-100 hover:text-stone-600 disabled:opacity-50",
                  FOCUS
                )}
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleSubmit} noValidate className="space-y-5 px-6 py-5">
              <AnimatePresence initial={false}>
                {error && (
                  <motion.div
                    role="alert"
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: "auto" }}
                    exit={{ opacity: 0, height: 0 }}
                    className="overflow-hidden"
                  >
                    <div className="flex items-start gap-2.5 rounded-xl border border-rose-200 bg-rose-50 px-3.5 py-3 text-sm text-rose-700">
                      <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden />
                      <span>{error}</span>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>

              <div>
                <label htmlFor={`${uid}-name`} className="mb-1.5 block text-xs font-bold uppercase tracking-wide text-stone-500">
                  Guest name <span className="text-rose-500">*</span>
                </label>
                <input
                  id={`${uid}-name`}
                  ref={nameRef}
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  disabled={submitting}
                  placeholder="e.g. Ayesha Khan"
                  maxLength={120}
                  aria-invalid={touched && nameInvalid}
                  className={cn(fieldClass, touched && nameInvalid && "border-rose-400")}
                />
                {touched && nameInvalid && (
                  <p className="mt-1.5 text-xs text-rose-600">Enter the guest&apos;s name.</p>
                )}
              </div>

              <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
                <div>
                  <label className="mb-1.5 block text-xs font-bold uppercase tracking-wide text-stone-500">
                    Status
                  </label>
                  <AceternitySelect
                    value={status}
                    onChange={(val) => setStatus(val as AttendanceStatus)}
                    options={STATUS_OPTIONS}
                    disabled={submitting}
                    className="[&>button]:h-[42px] [&>button]:rounded-xl [&>button]:border-black/[0.1] [&>button]:text-sm [&>button]:text-[#1c1410]"
                  />
                </div>

                <div>
                  <label htmlFor={`${uid}-seats`} className="mb-1.5 block text-xs font-bold uppercase tracking-wide text-stone-500">
                    Total seats
                  </label>
                  <input
                    id={`${uid}-seats`}
                    type="number"
                    inputMode="numeric"
                    min={1}
                    step={1}
                    value={seats}
                    onChange={(e) => setSeats(e.target.value)}
                    disabled={submitting}
                    aria-invalid={touched && seatsInvalid}
                    className={cn(fieldClass, touched && seatsInvalid && "border-rose-400")}
                  />
                  {touched && seatsInvalid && (
                    <p className="mt-1.5 text-xs text-rose-600">Seats must be 1 or more.</p>
                  )}
                </div>
              </div>

              <div>
                <div className="mb-1.5 flex items-baseline justify-between">
                  <label htmlFor={`${uid}-comment`} className="text-xs font-bold uppercase tracking-wide text-stone-500">
                    Comment
                  </label>
                  <span className="text-[10px] text-stone-400 tabular-nums">
                    {comment.length}/{COMMENT_MAX}
                  </span>
                </div>
                <textarea
                  id={`${uid}-comment`}
                  rows={3}
                  value={comment}
                  onChange={(e) => setComment(e.target.value.slice(0, COMMENT_MAX))}
                  disabled={submitting}
                  placeholder="Dietary needs, a note for the host, anything else"
                  className={cn(fieldClass, "resize-none")}
                />
              </div>

              <div className="flex flex-col-reverse gap-2 pt-2 sm:flex-row sm:justify-end">
                <button type="button" onClick={onClose} disabled={submitting} className={cn("inline-flex h-11 items-center justify-center rounded-xl border border-black/[0.08] bg-white px-4 text-sm font-semibold text-stone-700 transition hover:bg-stone-50 disabled:opacity-50", FOCUS)}>
                  Cancel
                </button>
                <button type="submit" disabled={submitting} className={cn(BTN, "h-11 rounded-xl px-5 text-sm disabled:opacity-50", FOCUS)}>
                  {submitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" aria-hidden />}
                  {submitting ? "Saving..." : isEdit ? "Save changes" : "Add guest"}
                </button>
              </div>
            </form>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

/* -------------------------------------------------------------------------- */
/*                              Export Utilities                              */
/* -------------------------------------------------------------------------- */

const getSlug = (title: string) =>
  title.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "") || "invitation";

const isoDate = (value: string) => {
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? "" : d.toISOString().slice(0, 10);
};

// 1. CSV Export
function csvCell(value: string | number, guardFormulas = true): string {
  let s = String(value ?? "");
  if (guardFormulas && /^[=+\-@\t\r]/.test(s)) s = `'${s}`;
  return `"${s.replace(/"/g, '""')}"`;
}

export function exportToCSV(invitationTitle: string, guests: Guest[]): void {
  const headers = ["Guest Name", "Status", "Seats", "Comment", "RSVP Date"];
  const rows = guests.map((g) =>
    [
      csvCell(g.guest_name),
      csvCell(STATUS_LABEL[g.attendance_status] ?? g.attendance_status, false),
      csvCell(g.number_of_guests, false),
      csvCell(g.comment ?? ""),
      csvCell(isoDate(g.created_at), false),
    ].join(",")
  );

  const csv = "\uFEFF" + [headers.map((h) => csvCell(h, false)).join(","), ...rows].join("\r\n");
  const url = URL.createObjectURL(new Blob([csv], { type: "text/csv;charset=utf-8;" }));
  const a = document.createElement("a");
  a.href = url;
  a.download = `${getSlug(invitationTitle)}-guests.csv`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

// 2. Excel Export
export function exportToExcel(invitationTitle: string, guests: Guest[]): void {
  const data = guests.map((g) => ({
    "Guest Name": g.guest_name,
    "Status": STATUS_LABEL[g.attendance_status] ?? g.attendance_status,
    "Seats": g.number_of_guests,
    "Comment": g.comment ?? "",
    "RSVP Date": isoDate(g.created_at),
  }));

  const worksheet = XLSX.utils.json_to_sheet(data);
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, "Guest List");
  
  // Auto-adjust column widths
  const wscols = [
    { wch: 25 }, // Guest Name
    { wch: 15 }, // Status
    { wch: 10 }, // Seats
    { wch: 40 }, // Comment
    { wch: 15 }, // RSVP Date
  ];
  worksheet['!cols'] = wscols;

  XLSX.writeFile(workbook, `${getSlug(invitationTitle)}-guests.xlsx`);
}

// 3. PDF Export
export function exportToPDF(invitationTitle: string, eventDate: string, guests: Guest[]): void {
  const doc = new jsPDF();
  
  // Header
  doc.setFontSize(20);
  doc.setTextColor(28, 20, 16); // Match your brand ink color
  doc.text(invitationTitle, 14, 22);
  
  doc.setFontSize(10);
  doc.setTextColor(120, 113, 108); // Stone-500
  doc.text(`Event Date: ${fmtDate(eventDate)}`, 14, 30);
  doc.text(`Total Guests: ${guests.length}`, 14, 36);
  doc.text(`Generated: ${new Date().toLocaleDateString()}`, 14, 42);

  // Table
  const tableData = guests.map((g) => [
    g.guest_name,
    STATUS_LABEL[g.attendance_status] ?? g.attendance_status,
    g.number_of_guests.toString(),
    g.comment ?? "-",
    isoDate(g.created_at),
  ]);

  autoTable(doc, {
    startY: 48,
    head: [["Guest Name", "Status", "Seats", "Comment", "RSVP Date"]],
    body: tableData,
    theme: "grid",
    headStyles: {
      fillColor: [249, 115, 22], // Orange-500
      textColor: [255, 255, 255],
      fontStyle: "bold",
    },
    alternateRowStyles: {
      fillColor: [250, 250, 249], // Stone-50
    },
    styles: {
      fontSize: 9,
      cellPadding: 4,
    },
    columnStyles: {
      0: { cellWidth: 45 },
      1: { cellWidth: 25 },
      2: { cellWidth: 15 },
      3: { cellWidth: 'auto' },
      4: { cellWidth: 25 },
    },
  });

  doc.save(`${getSlug(invitationTitle)}-guests.pdf`);
}