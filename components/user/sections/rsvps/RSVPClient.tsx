"use client";

import { useCallback, useMemo, useState, useRef, useEffect } from "react";
import useSWR, { useSWRConfig } from "swr";
import { AnimatePresence, MotionConfig, motion } from "framer-motion";
import {
  AlertCircle,
  ArrowLeft,
  CalendarDays,
  Download,
  FileSpreadsheet,
  FileText,
  FileDown,
  ChevronDown,
  Pencil,
  RefreshCw,
  Trash2,
  UserPlus,
  Users,
} from "lucide-react";

import {
  BTN,
  HEADING,
  Shimmer,
  cn,
  fetcher,
  fmtDate,
} from "@/components/user/sections/dashboard/ui/DashboardUI";
import { FOCUS } from "@/components/user/navigation/UserSidebar";
import { apiClient } from "@/lib/api/api_base";

import {
  GuestModal,
  GuestStatusPill,
  InvitationRSVPCard,
  exportToCSV,
  exportToExcel,
  exportToPDF,
  type Guest,
  type GuestPayload,
  type InvitationSummary,
} from "./ui/RSVPSUI";

/* -------------------------------------------------------------------------- */
/*                                   Config                                   */
/* -------------------------------------------------------------------------- */

const LIST_KEY = "/user/dashboard/rsvps";
const detailKey = (id: string) => `${LIST_KEY}/${id}`;
const guestKey = (id: string, guestId: string) => `${LIST_KEY}/${id}/guest/${guestId}`;

const SWR_OPTIONS = { revalidateOnFocus: false, dedupingInterval: 30000 } as const;

type InvitationDetail = {
  invitation: { id: string; title: string; event_date: string };
  guests: Guest[];
};

function errorMessage(err: unknown, fallback: string): string {
  const e = err as { response?: { data?: { message?: string; detail?: string } }; message?: string };
  return e?.response?.data?.message || e?.response?.data?.detail || e?.message || fallback;
}

/* -------------------------------------------------------------------------- */
/*                              Export Dropdown                               */
/* -------------------------------------------------------------------------- */

function ExportMenu({ title, date, guests }: { title: string, date: string, guests: Guest[] }) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        disabled={guests.length === 0}
        className={cn(
          "inline-flex h-10 items-center justify-center rounded-xl border border-black/[0.08] bg-white px-4 text-sm font-semibold text-stone-700 shadow-sm transition hover:bg-stone-50 disabled:cursor-not-allowed disabled:opacity-50",
          FOCUS
        )}
      >
        <Download className="mr-2 h-4 w-4" aria-hidden />
        Export
        <ChevronDown className={cn("ml-1.5 h-4 w-4 transition-transform", open && "rotate-180")} />
      </button>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: 5, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 5, scale: 0.98 }}
            transition={{ duration: 0.15 }}
            className="absolute right-0 top-full z-50 mt-1.5 w-48 overflow-hidden rounded-xl border border-black/[0.06] bg-white py-1 shadow-xl ring-1 ring-black/[0.04]"
          >
            <button
              onClick={() => { exportToCSV(title, guests); setOpen(false); }}
              className="flex w-full items-center gap-2.5 px-3 py-2 text-sm font-medium text-stone-700 transition-colors hover:bg-orange-50 hover:text-orange-700"
            >
              <FileText className="h-4 w-4 text-stone-400" /> Export as CSV
            </button>
            <button
              onClick={() => { exportToExcel(title, guests); setOpen(false); }}
              className="flex w-full items-center gap-2.5 px-3 py-2 text-sm font-medium text-stone-700 transition-colors hover:bg-orange-50 hover:text-orange-700"
            >
              <FileSpreadsheet className="h-4 w-4 text-stone-400" /> Export as Excel
            </button>
            <button
              onClick={() => { exportToPDF(title, date, guests); setOpen(false); }}
              className="flex w-full items-center gap-2.5 px-3 py-2 text-sm font-medium text-stone-700 transition-colors hover:bg-orange-50 hover:text-orange-700"
            >
              <FileDown className="h-4 w-4 text-stone-400" /> Export as PDF
            </button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}


/* -------------------------------------------------------------------------- */
/*                                Small pieces                                */
/* -------------------------------------------------------------------------- */

function ErrorBanner({
  message,
  onRetry,
  onDismiss,
}: {
  message: string;
  onRetry?: () => void;
  onDismiss?: () => void;
}) {
  return (
    <div
      role="alert"
      className="flex flex-wrap items-center gap-3 rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700 animate-in fade-in slide-in-from-top-2"
    >
      <AlertCircle className="h-4 w-4 shrink-0" aria-hidden />
      <span className="flex-1 font-medium">{message}</span>
      {onRetry && (
        <button type="button" onClick={onRetry} className={cn("inline-flex items-center gap-1.5 rounded-lg font-semibold underline-offset-2 hover:underline", FOCUS)}>
          <RefreshCw className="h-3.5 w-3.5" aria-hidden /> Try again
        </button>
      )}
      {onDismiss && (
        <button type="button" onClick={onDismiss} className={cn("rounded-lg font-semibold underline-offset-2 hover:underline", FOCUS)}>
          Dismiss
        </button>
      )}
    </div>
  );
}

function EmptyState({
  icon: Icon,
  title,
  body,
  action,
}: {
  icon: typeof Users;
  title: string;
  body: string;
  action?: React.ReactNode;
}) {
  return (
    <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-stone-300 bg-stone-50/50 px-6 py-16 text-center">
      <div className="flex h-14 w-14 items-center justify-center rounded-full bg-white text-stone-400 shadow-sm ring-1 ring-black/[0.04]">
        <Icon className="h-6 w-6" aria-hidden />
      </div>
      <h3 className={cn(HEADING, "mt-4 text-lg text-[#1c1410]")}>{title}</h3>
      <p className="mt-1 max-w-sm text-sm text-stone-500">{body}</p>
      {action && <div className="mt-6">{action}</div>}
    </div>
  );
}

function IconButton({
  label,
  onClick,
  disabled,
  danger,
  children,
}: {
  label: string;
  onClick: () => void;
  disabled?: boolean;
  danger?: boolean;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      aria-label={label}
      title={label}
      className={cn(
        "flex size-8 items-center justify-center rounded-lg text-stone-400 transition-colors disabled:cursor-not-allowed disabled:opacity-50",
        danger ? "hover:bg-rose-50 hover:text-rose-600" : "hover:bg-stone-100 hover:text-[#1c1410]",
        FOCUS
      )}
    >
      {children}
    </button>
  );
}

/* -------------------------------------------------------------------------- */
/*                                 Master view                                */
/* -------------------------------------------------------------------------- */

function MasterView({ onSelect }: { onSelect: (id: string) => void }) {
  const { data, error, isLoading, mutate } = useSWR<InvitationSummary[]>(
    LIST_KEY,
    fetcher,
    SWR_OPTIONS
  );

  return (
    <div className="space-y-6">
      <div>
        <h1 className={cn(HEADING, "text-2xl text-[#1c1410] sm:text-3xl")}>Guest RSVPs</h1>
        <p className="mt-1 text-sm text-stone-500">
          Pick an invitation to see who has replied and manage its guest list.
        </p>
      </div>

      {error && !data ? (
        <ErrorBanner message="We couldn't load your invitations." onRetry={() => mutate()} />
      ) : isLoading || !data ? (
        <div className="grid grid-cols-1 gap-5 md:grid-cols-2 xl:grid-cols-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="rounded-2xl bg-white p-5 ring-1 ring-black/[0.06]">
              <div className="flex justify-between">
                <div className="space-y-2">
                  <Shimmer className="h-6 w-40 rounded-md" />
                  <Shimmer className="h-4 w-28 rounded-md" />
                </div>
                <Shimmer className="h-6 w-20 rounded-full" />
              </div>
              <div className="mt-6 grid grid-cols-4 gap-2">
                {Array.from({ length: 4 }).map((_, j) => (
                  <Shimmer key={j} className="h-16 rounded-xl" />
                ))}
              </div>
              <div className="mt-5 flex justify-between items-center">
                <Shimmer className="h-4 w-24 rounded-md" />
                <Shimmer className="h-4 w-20 rounded-md" />
              </div>
            </div>
          ))}
        </div>
      ) : data.length === 0 ? (
        <EmptyState
          icon={CalendarDays}
          title="No invitations yet"
          body="Create an invitation and share it. Guest replies will show up here."
        />
      ) : (
        <div className="grid grid-cols-1 gap-5 md:grid-cols-2 xl:grid-cols-3">
          {data.map((inv, i) => (
            <motion.div
              key={inv.invitation_id}
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.05, duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
            >
              <InvitationRSVPCard
                invitation={inv}
                onClick={() => onSelect(inv.invitation_id)}
              />
            </motion.div>
          ))}
        </div>
      )}
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/*                                 Detail view                                */
/* -------------------------------------------------------------------------- */

function DetailView({ id, onBack }: { id: string; onBack: () => void }) {
  const { mutate: globalMutate } = useSWRConfig();
  const {
    data,
    error,
    isLoading,
    mutate: mutateDetail,
  } = useSWR<InvitationDetail>(detailKey(id), fetcher, SWR_OPTIONS);

  const [modal, setModal] = useState<{ open: boolean; guest: Guest | null }>({
    open: false,
    guest: null,
  });
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);

  const guests = data?.guests ?? [];

  const summary = useMemo(() => {
    const confirmedSeats = guests
      .filter((g) => g.attendance_status === "accepted")
      .reduce((sum, g) => sum + g.number_of_guests, 0);
    return `${guests.length} ${guests.length === 1 ? "guest" : "guests"}, ${confirmedSeats} ${
      confirmedSeats === 1 ? "seat" : "seats"
    } confirmed`;
  }, [guests]);

  const openAdd = () => setModal({ open: true, guest: null });
  const openEdit = (guest: Guest) => setModal({ open: true, guest });
  const closeModal = useCallback(() => setModal((m) => ({ ...m, open: false })), []);

  const refreshAll = useCallback(async () => {
    await Promise.all([mutateDetail(), globalMutate(LIST_KEY)]);
  }, [mutateDetail, globalMutate]);

  async function handleSave(payload: GuestPayload) {
    try {
      if (modal.guest) {
        await apiClient.patch(guestKey(id, modal.guest.id), payload);
      } else {
        await apiClient.post(detailKey(id), payload);
      }
    } catch (err) {
      throw new Error(errorMessage(err, "Could not save this guest. Please try again."));
    }
    await refreshAll();
    closeModal();
  }

  async function handleDelete(guest: Guest) {
    if (!window.confirm(`Delete ${guest.guest_name}? This can't be undone.`)) return;
    setActionError(null);
    setDeletingId(guest.id);
    try {
      await apiClient.delete(guestKey(id, guest.id));
      await refreshAll();
    } catch (err) {
      setActionError(errorMessage(err, `Could not delete ${guest.guest_name}. Please try again.`));
    } finally {
      setDeletingId(null);
    }
  }

  const title = data?.invitation.title ?? "Guest list";

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="space-y-4">
        <button
          type="button"
          onClick={onBack}
          className={cn(
            "inline-flex items-center gap-1.5 rounded-lg text-xs font-bold uppercase tracking-wider text-stone-500 transition-colors hover:text-[#1c1410]",
            FOCUS
          )}
        >
          <ArrowLeft className="h-4 w-4" aria-hidden />
          Back to all events
        </button>

        <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div className="min-w-0">
            {data ? (
              <>
                <h1 className={cn(HEADING, "truncate text-2xl text-[#1c1410] sm:text-3xl")}>{title}</h1>
                <p className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-sm font-medium text-stone-500">
                  <span className="inline-flex items-center gap-1.5">
                    <CalendarDays className="h-4 w-4" aria-hidden />
                    {fmtDate(data.invitation.event_date)}
                  </span>
                  <span className="h-1 w-1 rounded-full bg-stone-300" />
                  <span>{summary}</span>
                </p>
              </>
            ) : (
              <div className="space-y-3">
                <Shimmer className="h-8 w-64 rounded-lg" />
                <Shimmer className="h-5 w-48 rounded-md" />
              </div>
            )}
          </div>

          <div className="flex shrink-0 gap-2">
            {/* NEW EXPORT DROPDOWN REPLACES THE SINGLE CSV BUTTON */}
            <ExportMenu 
              title={title} 
              date={data?.invitation.event_date || ""} 
              guests={guests} 
            />
            <button
              type="button"
              onClick={openAdd}
              disabled={!data}
              className={cn(BTN, "h-10 rounded-xl px-4 text-sm disabled:cursor-not-allowed disabled:opacity-50", FOCUS)}
            >
              <UserPlus className="mr-2 h-4 w-4" aria-hidden />
              Add guest
            </button>
          </div>
        </div>
      </div>

      {actionError && <ErrorBanner message={actionError} onDismiss={() => setActionError(null)} />}

      {/* Body */}
      {error && !data ? (
        <ErrorBanner message="We couldn't load this guest list." onRetry={() => mutateDetail()} />
      ) : isLoading || !data ? (
        <div className="space-y-2">
          {Array.from({ length: 5 }).map((_, i) => (
            <Shimmer key={i} className="h-14 rounded-xl" />
          ))}
        </div>
      ) : guests.length === 0 ? (
        <EmptyState
          icon={Users}
          title="No guests yet"
          body="Replies from your invitation link will appear here. You can also add guests yourself."
          action={
            <button type="button" onClick={openAdd} className={cn(BTN, "h-10 rounded-xl px-5 text-sm", FOCUS)}>
              <UserPlus className="mr-2 h-4 w-4" aria-hidden />
              Add guest
            </button>
          }
        />
      ) : (
        <>
          {/* Desktop table */}
          <div className="hidden overflow-hidden rounded-2xl border border-black/[0.06] bg-white shadow-sm md:block">
            <table className="w-full text-left text-sm">
              <thead className="border-b border-black/[0.06] bg-stone-50/80 text-stone-500">
                <tr>
                  <th scope="col" className="px-5 py-3.5 text-[11px] font-bold uppercase tracking-wider">Guest name</th>
                  <th scope="col" className="px-5 py-3.5 text-[11px] font-bold uppercase tracking-wider">Status</th>
                  <th scope="col" className="px-5 py-3.5 text-right text-[11px] font-bold uppercase tracking-wider">Seats</th>
                  <th scope="col" className="px-5 py-3.5 text-[11px] font-bold uppercase tracking-wider">Comment</th>
                  <th scope="col" className="px-5 py-3.5 text-right text-[11px] font-bold uppercase tracking-wider">
                    <span className="sr-only">Actions</span>
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-black/[0.04]">
                {guests.map((g, i) => (
                  <motion.tr 
                    key={g.id} 
                    initial={{ opacity: 0, y: 5 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: i * 0.03 }}
                    className="group transition-colors hover:bg-stone-50/50"
                  >
                    <td className="px-5 py-3.5 font-semibold text-[#1c1410]">{g.guest_name}</td>
                    <td className="px-5 py-3.5">
                      <GuestStatusPill status={g.attendance_status} />
                    </td>
                    <td className="px-5 py-3.5 text-right tabular-nums text-stone-600 font-medium">
                      {g.number_of_guests}
                    </td>
                    <td className="max-w-xs px-5 py-3.5 text-stone-500">
                      {g.comment ? (
                        <span className="block truncate" title={g.comment}>{g.comment}</span>
                      ) : (
                        <span className="text-stone-300">—</span>
                      )}
                    </td>
                    <td className="px-5 py-2.5">
                      <div className="flex justify-end gap-1 opacity-0 transition-opacity group-hover:opacity-100 focus-within:opacity-100">
                        <IconButton label={`Edit ${g.guest_name}`} onClick={() => openEdit(g)} disabled={deletingId === g.id}>
                          <Pencil className="h-4 w-4" />
                        </IconButton>
                        <IconButton label={`Delete ${g.guest_name}`} onClick={() => handleDelete(g)} disabled={deletingId === g.id} danger>
                          <Trash2 className={cn("h-4 w-4", deletingId === g.id && "animate-pulse")} />
                        </IconButton>
                      </div>
                    </td>
                  </motion.tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Mobile cards */}
          <ul className="space-y-3 md:hidden">
            {guests.map((g, i) => (
              <motion.li 
                key={g.id} 
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.05 }}
                className="rounded-2xl border border-black/[0.06] bg-white p-4 shadow-sm"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="truncate text-base font-semibold text-[#1c1410]">{g.guest_name}</p>
                    <p className="mt-0.5 text-xs font-medium text-stone-500">
                      {g.number_of_guests} {g.number_of_guests === 1 ? "seat" : "seats"}
                    </p>
                  </div>
                  <GuestStatusPill status={g.attendance_status} />
                </div>

                {g.comment && (
                  <p className="mt-3 rounded-xl bg-stone-50 px-3 py-2 text-sm text-stone-600 ring-1 ring-black/[0.02]">{g.comment}</p>
                )}

                <div className="mt-4 flex justify-end gap-2 border-t border-black/[0.04] pt-3">
                  <button onClick={() => openEdit(g)} disabled={deletingId === g.id} className="flex-1 rounded-lg border border-black/[0.08] py-2 text-xs font-semibold text-stone-700 active:bg-stone-50">Edit</button>
                  <button onClick={() => handleDelete(g)} disabled={deletingId === g.id} className="flex-1 rounded-lg border border-rose-200 bg-rose-50 py-2 text-xs font-semibold text-rose-600 active:bg-rose-100">Delete</button>
                </div>
              </motion.li>
            ))}
          </ul>
        </>
      )}

      <GuestModal
        open={modal.open}
        guest={modal.guest}
        onClose={closeModal}
        onSubmit={handleSave}
      />
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/*                                  Root client                               */
/* -------------------------------------------------------------------------- */

export default function RSVPClient({ user }: { user?: any }) {
  const [selectedId, setSelectedId] = useState<string | null>(null);

  return (
    <MotionConfig reducedMotion="user" transition={{ duration: 0.2, ease: "easeOut" }}>
      <AnimatePresence mode="wait" initial={false}>
        <motion.div
          key={selectedId ?? "master"}
          initial={{ opacity: 0, x: selectedId ? 20 : -20 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: selectedId ? -20 : 20 }}
          transition={{ duration: 0.25, ease: "easeInOut" }}
        >
          {selectedId ? (
            <DetailView id={selectedId} onBack={() => setSelectedId(null)} />
          ) : (
            <MasterView onSelect={setSelectedId} />
          )}
        </motion.div>
      </AnimatePresence>
    </MotionConfig>
  );
}