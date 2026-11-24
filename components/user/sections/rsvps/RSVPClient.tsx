"use client";

import * as React from "react";
import useSWR, { useSWRConfig } from "swr";
import { AnimatePresence, MotionConfig, motion } from "framer-motion";

import { FOCUS } from "@/components/user/navigation/UserSidebar";
import {
  BTN,
  EmptyState,
  ErrorCard,
  Surface,
  cn,
  fetcher,
  fmtDate,
} from "@/components/user/sections/dashboard/ui/DashboardUI";
import { apiClient } from "@/lib/api/api_base";

import {
  ART,
  ActiveFilters,
  Avatar,
  ConfirmDialog,
  GHOST_BTN,
  GRID_CLASS,
  GuestListSkeleton,
  GuestModal,
  GuestStatusPill,
  GuideModal,
  IcCalendar,
  IcChevronDown,
  IcCheckCircle,
  IcDownload,
  IcFile,
  IcHelp,
  IcHourglass,
  IcPencil,
  IcPlus,
  IcSpinner,
  IcTable,
  IcTrash,
  IcTrend,
  IcUsers,
  IconButton,
  InlineError,
  InvitationGridSkeleton,
  InvitationRSVPCard,
  LIST_SURFACE,
  PRIMARY_BTN,
  PageHeader,
  Pagination,
  ROW_H,
  SECONDARY_BTN,
  SavingBadge,
  SearchField,
  type SegmentOption,
  Segmented,
  SelectField,
  type Stat,
  StatStrip,
  StatStripSkeleton,
  Toast,
  exportToCSV,
  exportToExcel,
  exportToPDF,
  type Guest,
  type GuestPayload,
  type GuestSort,
  type InvitationDetail,
  type InvitationSummary,
  type StatusFilterValue,
  type ToastState,
} from "./ui/RSVPSUI";

/* ========================================================================== */
/*  Config                                                                    */
/* ========================================================================== */

const LIST_KEY = "/user/dashboard/rsvps";
const detailKey = (id: string) => `${LIST_KEY}/${id}`;
const guestKey = (id: string, guestId: string) => `${LIST_KEY}/${id}/guest/${guestId}`;

const SWR_OPTIONS = { revalidateOnFocus: false, dedupingInterval: 30000 } as const;

const TEMP_PREFIX = "temp-";
const isTemp = (id: string) => id.startsWith(TEMP_PREFIX);

const plural = (n: number, one: string, many = `${one}s`) => `${n} ${n === 1 ? one : many}`;

function errorMessage(err: unknown, fallback: string): string {
  const e = err as { response?: { data?: { message?: string; detail?: string } }; message?: string };
  return e?.response?.data?.message || e?.response?.data?.detail || e?.message || fallback;
}

const PAGE_SIZES = [10, 25, 50] as const;

const GUEST_SORTS: { value: GuestSort; label: string }[] = [
  { value: "recent", label: "Newest replies" },
  { value: "name", label: "Name, A to Z" },
  { value: "seats", label: "Most seats" },
];

type InviteSort = "date_desc" | "date_asc" | "name";
const INVITE_SORTS: { value: InviteSort; label: string }[] = [
  { value: "date_desc", label: "Latest event first" },
  { value: "date_asc", label: "Soonest event first" },
  { value: "name", label: "Name, A to Z" },
];

/* ========================================================================== */
/*  Export menu                                                               */
/*  aria-haspopup / aria-expanded on the trigger, role=menu with arrow keys,  */
/*  Escape returns focus to the trigger.                                      */
/* ========================================================================== */

type ExportFormat = "csv" | "xlsx" | "pdf";

const EXPORT_ITEMS: {
  id: ExportFormat;
  label: string;
  hint: string;
  icon: (p: React.SVGProps<SVGSVGElement>) => React.ReactElement;
}[] = [
  { id: "csv", label: "CSV file", hint: "Plain, opens anywhere", icon: IcFile },
  { id: "xlsx", label: "Excel workbook", hint: "Formatted columns", icon: IcTable },
  { id: "pdf", label: "PDF report", hint: "Print or share", icon: IcFile },
];

function ExportMenu({
  title,
  date,
  guests,
  totalCount,
  onDone,
  onError,
}: {
  title: string;
  date: string;
  guests: Guest[];
  totalCount: number;
  onDone: (message: string) => void;
  onError: (message: string) => void;
}) {
  const menuId = React.useId();
  const [open, setOpen] = React.useState(false);
  const [busy, setBusy] = React.useState<ExportFormat | null>(null);
  const rootRef = React.useRef<HTMLDivElement>(null);
  const triggerRef = React.useRef<HTMLButtonElement>(null);
  const itemRefs = React.useRef<(HTMLButtonElement | null)[]>([]);

  const exportable = React.useMemo(() => guests.filter((g) => !isTemp(g.id)), [guests]);

  const close = React.useCallback((returnFocus = false) => {
    setOpen(false);
    if (returnFocus) triggerRef.current?.focus();
  }, []);

  React.useEffect(() => {
    if (!open) return;
    const onPointerDown = (e: MouseEvent) => {
      if (rootRef.current && !rootRef.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", onPointerDown);
    const raf = requestAnimationFrame(() => itemRefs.current[0]?.focus());
    return () => {
      document.removeEventListener("mousedown", onPointerDown);
      cancelAnimationFrame(raf);
    };
  }, [open]);

  function onMenuKeyDown(e: React.KeyboardEvent) {
    const items = itemRefs.current.filter(Boolean) as HTMLButtonElement[];
    const idx = items.indexOf(document.activeElement as HTMLButtonElement);
    const go = (n: number) => {
      e.preventDefault();
      items[(n + items.length) % items.length]?.focus();
    };
    if (e.key === "ArrowDown") go(idx + 1);
    else if (e.key === "ArrowUp") go(idx - 1);
    else if (e.key === "Home") go(0);
    else if (e.key === "End") go(items.length - 1);
    else if (e.key === "Escape") {
      e.preventDefault();
      close(true);
    } else if (e.key === "Tab") setOpen(false);
  }

  async function run(format: ExportFormat) {
    if (busy) return;
    setBusy(format);
    try {
      if (format === "csv") await exportToCSV(title, exportable);
      else if (format === "xlsx") await exportToExcel(title, exportable);
      else await exportToPDF(title, date, exportable);
      onDone(`Exported ${plural(exportable.length, "guest")}`);
      close(true);
    } catch {
      onError("Export failed. Please try again.");
    } finally {
      setBusy(null);
    }
  }

  const filtered = exportable.length !== totalCount;

  return (
    <div ref={rootRef} className="relative">
      <button
        ref={triggerRef}
        type="button"
        onClick={() => setOpen((o) => !o)}
        onKeyDown={(e) => {
          if (e.key === "ArrowDown" && !open) {
            e.preventDefault();
            setOpen(true);
          }
        }}
        disabled={exportable.length === 0}
        aria-haspopup="menu"
        aria-expanded={open}
        aria-controls={open ? menuId : undefined}
        className={cn(SECONDARY_BTN, FOCUS)}
      >
        <IcDownload className="size-4 text-amber-300" />
        Export
        <IcChevronDown className={cn("size-3.5 transition-transform", open && "rotate-180")} />
      </button>

      <AnimatePresence>
        {open && (
          <motion.div
            id={menuId}
            role="menu"
            aria-label="Export guest list"
            onKeyDown={onMenuKeyDown}
            initial={{ opacity: 0, y: 5, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 5, scale: 0.98 }}
            transition={{ duration: 0.15 }}
            className="absolute right-0 top-full z-50 mt-2 w-64 overflow-hidden rounded-xl bg-white py-1 shadow-xl ring-1 ring-black/[0.08]"
          >
            <p className="px-3 pb-1.5 pt-2 text-[11px] font-medium text-stone-500">
              {filtered
                ? `${exportable.length} of ${totalCount} guests (current filter)`
                : `All ${plural(exportable.length, "guest")}`}
            </p>
            {EXPORT_ITEMS.map((item, i) => {
              const Icon = item.icon;
              return (
                <button
                  key={item.id}
                  ref={(el) => {
                    itemRefs.current[i] = el;
                  }}
                  type="button"
                  role="menuitem"
                  onClick={() => run(item.id)}
                  disabled={busy !== null}
                  className="flex w-full items-center gap-3 px-3 py-2 text-left transition-colors hover:bg-stone-50 focus-visible:bg-stone-50 focus-visible:outline-none disabled:opacity-60"
                >
                  {busy === item.id ? (
                    <IcSpinner className="size-[18px] animate-spin text-orange-600" />
                  ) : (
                    <Icon className="size-[18px] text-stone-500" />
                  )}
                  <span className="min-w-0">
                    <span className="block text-sm font-semibold text-[#1c1410]">{item.label}</span>
                    <span className="block text-xs text-stone-500">{item.hint}</span>
                  </span>
                </button>
              );
            })}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

const GuideTrigger = ({ onClick }: { onClick: () => void }) => (
  <button type="button" onClick={onClick} className={cn(GHOST_BTN, FOCUS)}>
    <IcHelp className="size-4 text-orange-600" /> How it works
  </button>
);

/* ========================================================================== */
/*  Master view                                                               */
/* ========================================================================== */

function MasterView({ onSelect, onGuide }: { onSelect: (id: string) => void; onGuide: () => void }) {
  const { data, error, mutate } = useSWR<InvitationSummary[]>(LIST_KEY, fetcher, SWR_OPTIONS);

  const [query, setQuery] = React.useState("");
  const [filter, setFilter] = React.useState<"all" | "open">("all");
  const [sort, setSort] = React.useState<InviteSort>("date_desc");

  const openCount = React.useMemo(() => (data ?? []).filter((i) => i.pending > 0).length, [data]);

  const visible = React.useMemo(() => {
    const q = query.trim().toLowerCase();
    const list = (data ?? []).filter(
      (i) => (filter === "all" || i.pending > 0) && (!q || i.title.toLowerCase().includes(q)),
    );
    const time = (s: string) => new Date(s).getTime() || 0;
    return [...list].sort((a, b) =>
      sort === "name"
        ? a.title.localeCompare(b.title)
        : sort === "date_asc"
          ? time(a.event_date) - time(b.event_date)
          : time(b.event_date) - time(a.event_date),
    );
  }, [data, query, filter, sort]);

  const stats: Stat[] = React.useMemo(() => {
    const list = data ?? [];
    const t = list.reduce(
      (a, i) => ({
        guests: a.guests + i.total_guests,
        seats: a.seats + i.total_seats,
        pending: a.pending + i.pending,
        replied: a.replied + i.accepted + i.declined,
      }),
      { guests: 0, seats: 0, pending: 0, replied: 0 },
    );
    const rate = t.guests > 0 ? Math.round((t.replied / t.guests) * 100) : 0;
    return [
      { label: "Invitations", icon: IcCalendar, iconClass: "text-orange-500", value: list.length, hint: `${plural(t.guests, "guest")} in total` },
      { label: "Confirmed seats", icon: IcCheckCircle, iconClass: "text-emerald-500", value: t.seats, hint: "Accepted guests only" },
      { label: "Awaiting reply", icon: IcHourglass, iconClass: "text-amber-500", value: t.pending, hint: t.pending === 0 ? "Everyone has replied" : `Across ${plural(openCount, "invitation")}` },
      { label: "Response rate", icon: IcTrend, iconClass: "text-sky-500", value: rate, suffix: "%", hint: `${t.replied} of ${t.guests} replied`, progress: rate, progressLabel: "Share of guests who have replied" },
    ];
  }, [data, openCount]);

  const isEmpty = !!data && data.length === 0;
  const hasFilters = filter !== "all" || query.trim() !== "";
  const clearAll = () => {
    setQuery("");
    setFilter("all");
  };

  const options: SegmentOption<"all" | "open">[] = [
    { value: "all", label: "All", count: data?.length },
    { value: "open", label: "Awaiting replies", count: data ? openCount : undefined },
  ];

  const chips = [
    filter !== "all" && { key: "open", label: "Awaiting replies", onRemove: () => setFilter("all") },
    query.trim() && { key: "q", label: `“${query.trim()}”`, onRemove: () => setQuery("") },
  ].filter(Boolean) as { key: string; label: string; onRemove: () => void }[];

  return (
    <div className="w-full space-y-3 sm:space-y-5">
      <PageHeader
        title={
          <>
            Guest <span className="text-orange-600">RSVPs</span>
          </>
        }
        subtitle={
          data
            ? isEmpty
              ? "Replies to your invitations will appear here."
              : `${plural(data.length, "invitation")}. Pick one to manage its guest list.`
            : "Pick an invitation to manage its guest list."
        }
        actions={<GuideTrigger onClick={onGuide} />}
      />

      {data ? <StatStrip stats={stats} /> : !error ? <StatStripSkeleton /> : null}

      {data && !isEmpty && (
        <div className="relative z-20 space-y-2.5">
          <div className="flex flex-col gap-2.5 lg:flex-row lg:items-center">
            <SearchField
              value={query}
              onChange={setQuery}
              placeholder="Search invitations"
              label="Search invitations"
              className="order-1 lg:order-2"
            />
            <Segmented label="Filter invitations" value={filter} options={options} onChange={setFilter} className="order-2 lg:order-1 lg:shrink-0" />
            <SelectField label="Sort invitations" value={sort} options={INVITE_SORTS} onChange={setSort} className="order-3 lg:w-48" />
          </div>
          <ActiveFilters chips={chips} onClearAll={clearAll} />
        </div>
      )}

      <div className="space-y-3 sm:space-y-6">
        {error && !data ? (
          <ErrorCard onRetry={() => mutate()} />
        ) : !data ? (
          <InvitationGridSkeleton count={3} />
        ) : isEmpty ? (
          <Surface pad="p-0">
            <EmptyState
              art={ART.empty}
              title="No invitations yet"
              hint="Create an invitation and share its link. Guest replies will show up here."
            />
          </Surface>
        ) : visible.length === 0 ? (
          <Surface pad="p-0">
            <EmptyState
              art={ART.noMatch}
              title="No invitations match"
              hint={query.trim() ? `Nothing matches “${query.trim()}”. Try a shorter word.` : "Every invitation has replies. Nothing is waiting."}
              actionLabel={hasFilters ? "Clear filters" : undefined}
              onAction={clearAll}
            />
          </Surface>
        ) : (
          <ul className={GRID_CLASS}>
            {visible.map((inv, i) => (
              <InvitationRSVPCard key={inv.invitation_id} invitation={inv} index={i} onClick={() => onSelect(inv.invitation_id)} />
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}

/* ========================================================================== */
/*  Detail view                                                               */
/* ========================================================================== */

function DetailView({ id, onBack, onGuide }: { id: string; onBack: () => void; onGuide: () => void }) {
  const { mutate: globalMutate } = useSWRConfig();
  const { data, error, mutate: mutateDetail } = useSWR<InvitationDetail>(detailKey(id), fetcher, SWR_OPTIONS);

  const [modal, setModal] = React.useState<{ open: boolean; guest: Guest | null }>({ open: false, guest: null });
  const [pendingDelete, setPendingDelete] = React.useState<Guest | null>(null);
  const [actionError, setActionError] = React.useState<string | null>(null);
  const [toast, setToast] = React.useState<ToastState>(null);

  const [query, setQuery] = React.useState("");
  const [filter, setFilter] = React.useState<StatusFilterValue>("all");
  const [sort, setSort] = React.useState<GuestSort>("recent");
  const [pageSize, setPageSize] = React.useState<number>(10);
  const [page, setPage] = React.useState(1);

  const guests = React.useMemo(() => data?.guests ?? [], [data]);

  const showToast = React.useCallback(
    (message: string, tone: "success" | "error" = "success") => setToast({ id: Date.now(), message, tone }),
    [],
  );
  const dismissToast = React.useCallback(() => setToast(null), []);

  /* ------------------------------ derived data ------------------------------ */

  const counts = React.useMemo(() => {
    const c: Record<StatusFilterValue, number> = { all: guests.length, accepted: 0, declined: 0, pending: 0 };
    let confirmedSeats = 0;
    for (const g of guests) {
      c[g.attendance_status] += 1;
      if (g.attendance_status === "accepted") confirmedSeats += g.number_of_guests;
    }
    const replied = c.accepted + c.declined;
    return { c, confirmedSeats, replied, rate: guests.length ? Math.round((replied / guests.length) * 100) : 0 };
  }, [guests]);

  const filtered = React.useMemo(() => {
    const q = query.trim().toLowerCase();
    const list = guests.filter(
      (g) =>
        (filter === "all" || g.attendance_status === filter) &&
        (!q || g.guest_name.toLowerCase().includes(q) || (g.comment ?? "").toLowerCase().includes(q)),
    );
    return [...list].sort((a, b) =>
      sort === "name"
        ? a.guest_name.localeCompare(b.guest_name)
        : sort === "seats"
          ? b.number_of_guests - a.number_of_guests
          : new Date(b.created_at).getTime() - new Date(a.created_at).getTime(),
    );
  }, [guests, query, filter, sort]);

  React.useEffect(() => setPage(1), [query, filter, sort, pageSize]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize));
  const safePage = Math.min(page, totalPages);
  const pageItems = React.useMemo(
    () => filtered.slice((safePage - 1) * pageSize, safePage * pageSize),
    [filtered, safePage, pageSize],
  );

  const hasFilters = filter !== "all" || query.trim() !== "";
  const clearAll = () => {
    setQuery("");
    setFilter("all");
  };

  const stats: Stat[] = [
    { label: "Guests", icon: IcUsers, iconClass: "text-orange-500", value: counts.c.all, hint: `${counts.c.accepted} accepted · ${counts.c.declined} declined` },
    { label: "Confirmed seats", icon: IcCheckCircle, iconClass: "text-emerald-500", value: counts.confirmedSeats, hint: "Accepted guests only" },
    { label: "Awaiting reply", icon: IcHourglass, iconClass: "text-amber-500", value: counts.c.pending, hint: counts.c.pending === 0 ? "Everyone has replied" : counts.c.pending === 1 ? "1 guest hasn’t replied" : `${counts.c.pending} guests haven’t replied` },
    { label: "Response rate", icon: IcTrend, iconClass: "text-sky-500", value: counts.rate, suffix: "%", hint: `${counts.replied} of ${counts.c.all} replied`, progress: counts.rate, progressLabel: "Share of guests who have replied" },
  ];

  const segmentOptions: SegmentOption<StatusFilterValue>[] = [
    { value: "all", label: "All", count: counts.c.all },
    { value: "accepted", label: "Accepted", count: counts.c.accepted },
    { value: "pending", label: "Pending", count: counts.c.pending },
    { value: "declined", label: "Declined", count: counts.c.declined },
  ];

  const chips = [
    filter !== "all" && { key: "status", label: filter[0].toUpperCase() + filter.slice(1), onRemove: () => setFilter("all") },
    query.trim() && { key: "q", label: `“${query.trim()}”`, onRemove: () => setQuery("") },
  ].filter(Boolean) as { key: string; label: string; onRemove: () => void }[];

  /* -------------------------------- mutations ------------------------------- */

  const openAdd = () => setModal({ open: true, guest: null });
  const openEdit = (guest: Guest) => setModal({ open: true, guest });
  const closeModal = React.useCallback(() => setModal((m) => ({ ...m, open: false })), []);

  /**
   * Optimistic: the list changes instantly, the request runs in the background,
   * SWR rolls back if it fails, and a revalidation syncs with the database.
   */
  const mutateGuests = React.useCallback(
    async (
      optimistic: (current: InvitationDetail) => InvitationDetail,
      request: () => Promise<unknown>,
      successMessage: string,
      failureMessage: string,
    ) => {
      setActionError(null);
      try {
        await mutateDetail(
          async (current) => {
            await request();
            return current;
          },
          {
            optimisticData: (current) => (current ? optimistic(current) : (current as unknown as InvitationDetail)),
            rollbackOnError: true,
            populateCache: false,
            revalidate: true,
          },
        );
        void globalMutate(LIST_KEY);
        showToast(successMessage);
      } catch (err) {
        setActionError(errorMessage(err, failureMessage));
      }
    },
    [mutateDetail, globalMutate, showToast],
  );

  async function handleSave(payload: GuestPayload) {
    const editing = modal.guest;
    closeModal();

    if (editing) {
      await mutateGuests(
        (cur) => ({
          ...cur,
          guests: cur.guests.map((g) => (g.id === editing.id ? { ...g, ...payload, comment: payload.comment ?? g.comment } : g)),
        }),
        () => apiClient.patch(guestKey(id, editing.id), payload),
        `${payload.guest_name} updated`,
        `Could not update ${editing.guest_name}. Your changes were reverted.`,
      );
      return;
    }

    const placeholder: Guest = {
      id: `${TEMP_PREFIX}${Date.now()}`,
      guest_name: payload.guest_name,
      attendance_status: payload.attendance_status,
      number_of_guests: payload.number_of_guests,
      comment: payload.comment ?? "",
      created_at: new Date().toISOString(),
    };
    await mutateGuests(
      (cur) => ({ ...cur, guests: [placeholder, ...cur.guests] }),
      () => apiClient.post(detailKey(id), payload),
      `${payload.guest_name} added`,
      `Could not add ${payload.guest_name}. Please try again.`,
    );
  }

  async function confirmDelete() {
    const target = pendingDelete;
    if (!target) return;
    setPendingDelete(null);
    await mutateGuests(
      (cur) => ({ ...cur, guests: cur.guests.filter((g) => g.id !== target.id) }),
      () => apiClient.delete(guestKey(id, target.id)),
      `${target.guest_name} removed`,
      `Could not delete ${target.guest_name}. The guest was restored.`,
    );
  }

  /* --------------------------------- render --------------------------------- */

  const title = data?.invitation.title ?? "Guest list";
  const pageSeats = pageItems.reduce((s, g) => s + g.number_of_guests, 0);

  return (
    <div className="w-full space-y-3 sm:space-y-5">
      <PageHeader
        back={{ label: "All invitations", onClick: onBack }}
        title={data ? title : <span className="inline-block h-8 w-56 animate-pulse rounded-lg bg-black/[0.06] align-middle sm:h-10" />}
        subtitle={data ? `${fmtDate(data.invitation.event_date)} · ${plural(guests.length, "guest")}` : ""}
        actions={
          <>
            <GuideTrigger onClick={onGuide} />
            <ExportMenu
              title={title}
              date={data?.invitation.event_date || ""}
              guests={filtered}
              totalCount={guests.length}
              onDone={(m) => showToast(m)}
              onError={(m) => showToast(m, "error")}
            />
            <button type="button" onClick={openAdd} disabled={!data} className={cn(BTN, PRIMARY_BTN, "disabled:opacity-50", FOCUS)}>
              <IcPlus className="size-4" /> Add guest
            </button>
          </>
        }
      />

      {data ? <StatStrip stats={stats} /> : !error ? <StatStripSkeleton /> : null}

      {actionError && <InlineError message={actionError} onDismiss={() => setActionError(null)} />}

      {data && guests.length > 0 && (
        <div className="relative z-20 space-y-2.5">
          <div className="flex flex-col gap-2.5 lg:flex-row lg:items-center">
            <SearchField value={query} onChange={setQuery} placeholder="Search by name or note" label="Search guests" className="order-1 lg:order-2" />
            <Segmented label="Filter by status" value={filter} options={segmentOptions} onChange={setFilter} className="order-2 lg:order-1 lg:shrink-0" />
            <div className="order-3 grid grid-cols-2 gap-2.5 lg:flex">
              <SelectField label="Sort guests" value={sort} options={GUEST_SORTS} onChange={setSort} className="lg:w-44" />
              <SelectField
                label="Guests per page"
                value={pageSize}
                options={PAGE_SIZES.map((n) => ({ value: n, label: `${n} per page` }))}
                onChange={setPageSize}
                className="lg:w-36"
              />
            </div>
          </div>
          <ActiveFilters chips={chips} onClearAll={clearAll} />
        </div>
      )}

      <div className="space-y-3 sm:space-y-6">
        {error && !data ? (
          <ErrorCard onRetry={() => mutateDetail()} />
        ) : !data ? (
          <GuestListSkeleton />
        ) : guests.length === 0 ? (
          <Surface pad="p-0">
            <EmptyState
              art={ART.empty}
              title="No guests yet"
              hint="Replies from your invitation link will appear here. You can also add guests yourself."
              actionLabel="Add guest"
              onAction={openAdd}
            />
          </Surface>
        ) : filtered.length === 0 ? (
          <Surface pad="p-0">
            <EmptyState
              art={ART.noMatch}
              title="No guests match"
              hint="Try a different search or status."
              actionLabel={hasFilters ? "Clear filters" : undefined}
              onAction={clearAll}
            />
          </Surface>
        ) : (
          <>
            {/* Desktop table */}
            <div className={cn(LIST_SURFACE, "hidden md:block")}>
              <table className="w-full table-fixed text-left text-sm">
                <caption className="sr-only">Guest list for {title}</caption>
                <colgroup>
                  <col className="w-[34%]" />
                  <col className="w-[16%]" />
                  <col className="w-[9%]" />
                  <col />
                  <col className="w-[108px]" />
                </colgroup>
                <thead className="border-b border-black/[0.06] bg-stone-50/70 text-xs font-semibold text-stone-500">
                  <tr className="h-11">
                    <th scope="col" className="px-5 font-semibold">Guest</th>
                    <th scope="col" className="px-3 font-semibold">Status</th>
                    <th scope="col" className="px-3 text-right font-semibold">Seats</th>
                    <th scope="col" className="px-5 font-semibold">Note</th>
                    <th scope="col" className="px-3"><span className="sr-only">Actions</span></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-black/[0.06]">
                  {pageItems.map((g) => {
                    const saving = isTemp(g.id);
                    return (
                      <tr key={g.id} aria-busy={saving} className={cn("group transition-colors hover:bg-stone-50/60", ROW_H, saving && "opacity-60")}>
                        <td className="px-5">
                          <div className="flex min-w-0 items-center gap-3">
                            <Avatar name={g.guest_name} />
                            <div className="min-w-0">
                              <p className="truncate font-semibold text-[#1c1410]" title={g.guest_name}>
                                {g.guest_name}
                                {saving && <SavingBadge />}
                              </p>
                              <p className="truncate text-xs text-stone-500">Replied {fmtDate(g.created_at)}</p>
                            </div>
                          </div>
                        </td>
                        <td className="px-3"><GuestStatusPill status={g.attendance_status} /></td>
                        <td className="px-3 text-right font-semibold tabular-nums text-[#1c1410]">{g.number_of_guests}</td>
                        <td className="px-5 text-stone-600">
                          {g.comment ? (
                            <span className="block truncate" title={g.comment}>{g.comment}</span>
                          ) : (
                            <span className="text-stone-300" aria-label="No note">—</span>
                          )}
                        </td>
                        <td className="px-3">
                          <div className="flex justify-end gap-0.5 opacity-0 transition-opacity focus-within:opacity-100 group-hover:opacity-100">
                            <IconButton label={`Edit ${g.guest_name}`} onClick={() => openEdit(g)} disabled={saving}>
                              <IcPencil className="size-[18px]" />
                            </IconButton>
                            <IconButton label={`Delete ${g.guest_name}`} onClick={() => setPendingDelete(g)} disabled={saving} danger>
                              <IcTrash className="size-[18px]" />
                            </IconButton>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* Mobile list: one surface, hairline dividers, no per-row boxes */}
            <ul className={cn(LIST_SURFACE, "divide-y divide-black/[0.06] md:hidden")}>
              {pageItems.map((g) => {
                const saving = isTemp(g.id);
                return (
                  <li key={g.id} aria-busy={saving} className={cn("px-4 py-3", saving && "opacity-60")}>
                    <div className="flex items-center gap-3">
                      <Avatar name={g.guest_name} />
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-[15px] font-semibold text-[#1c1410]">
                          {g.guest_name}
                          {saving && <SavingBadge />}
                        </p>
                        <p className="text-xs text-stone-500">{plural(g.number_of_guests, "seat")}</p>
                      </div>
                      <GuestStatusPill status={g.attendance_status} />
                    </div>
                    {g.comment && <p className="mt-2 pl-12 text-sm text-stone-600">{g.comment}</p>}
                    <div className="mt-1 flex justify-end gap-0.5">
                      <IconButton label={`Edit ${g.guest_name}`} onClick={() => openEdit(g)} disabled={saving}>
                        <IcPencil className="size-[18px]" />
                      </IconButton>
                      <IconButton label={`Delete ${g.guest_name}`} onClick={() => setPendingDelete(g)} disabled={saving} danger>
                        <IcTrash className="size-[18px]" />
                      </IconButton>
                    </div>
                  </li>
                );
              })}
            </ul>

            <Pagination
              page={safePage}
              pageSize={pageSize}
              total={filtered.length}
              shown={pageItems.length}
              noun="guest"
              onPage={setPage}
            />
            <p className="sr-only" aria-live="polite">{plural(pageSeats, "seat")} on this page</p>
          </>
        )}
      </div>

      <GuestModal open={modal.open} guest={modal.guest} onClose={closeModal} onSubmit={handleSave} />

      <ConfirmDialog
        open={pendingDelete !== null}
        title={pendingDelete ? `Delete ${pendingDelete.guest_name}?` : "Delete guest?"}
        body="This removes the guest and their reply from the list. It can’t be undone."
        confirmLabel="Delete guest"
        onConfirm={confirmDelete}
        onCancel={() => setPendingDelete(null)}
      />

      <Toast toast={toast} onDismiss={dismissToast} />
    </div>
  );
}

/* ========================================================================== */
/*  Root                                                                      */
/* ========================================================================== */

export default function RSVPClient(_props: { user?: unknown }) {
  const [selectedId, setSelectedId] = React.useState<string | null>(null);
  const [guideOpen, setGuideOpen] = React.useState(false);
  const openGuide = React.useCallback(() => setGuideOpen(true), []);
  const closeGuide = React.useCallback(() => setGuideOpen(false), []);

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
            <DetailView id={selectedId} onBack={() => setSelectedId(null)} onGuide={openGuide} />
          ) : (
            <MasterView onSelect={setSelectedId} onGuide={openGuide} />
          )}
        </motion.div>
      </AnimatePresence>
      <GuideModal open={guideOpen} onClose={closeGuide} />
    </MotionConfig>
  );
}