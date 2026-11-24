"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { AnimatePresence, LayoutGroup, motion } from "framer-motion";
import { formatDistanceToNow, isThisWeek, isToday, isYesterday } from "date-fns";
import { apiClient } from "@/lib/api/api_base";
import { toast } from "@/components/ui/toast";
import { FOCUS } from "@/components/user/navigation/UserSidebar";
import { HEADING, cn } from "@/components/user/sections/dashboard/ui/DashboardUI";
import {
  Chip,
  DANGER_GHOST_BTN,
  DeleteNotificationModal,
  EmptyState,
  Highlight,
  INK_BTN,
  IcCheck,
  IcCheckAll,
  IcChevronRight,
  IcSearch,
  IcTrash,
  IcX,
  KIND_TONES,
  KindPill,
  LiveBadge,
  NotificationModal,
  NotificationRowSkeleton,
  NotificationsHeader,
  ReadProgress,
  SURFACE,
  resolveKind,
  type LiveState,
  type NotificationKind,
  type UserNotification,
} from "./ui/UserNotificationsUI";

export type NotificationsUser = {
  id: string;
  email: string;
  first_name: string;
  last_name: string;
  phone_number: string;
  created_at?: string | Date;
};

// Adjust these to wherever your user notification routes are mounted.
const LIST_ENDPOINT = "/user/dashboard/notifications"; // GET (list), DELETE (all)
const READ_ENDPOINT = "/user/dashboard/notifications/read"; // PATCH { id } | { all: true }
const itemEndpoint = (id: string) => `/user/dashboard/notifications/${id}`; // DELETE
const STREAM_URL = "/api/v1/user/dashboard/notifications/stream"; // SSE

/** The shell's bell listens for this so its badge updates the instant the page changes. */
export const UNREAD_EVENT = "user-notifications:unread";

type Filter = "all" | "unread";
type KindFilter = "all" | NotificationKind;

const KIND_FILTERS: { id: KindFilter; label: string }[] = [
  { id: "all", label: "Everything" },
  { id: "billing", label: "Billing" },
  { id: "invitation", label: "Invitations" },
  { id: "account", label: "Account" },
  { id: "system", label: "System" },
];

const GROUP_ORDER = ["Today", "Yesterday", "This week", "Earlier"] as const;

function groupOf(iso: string): (typeof GROUP_ORDER)[number] {
  const d = new Date(iso);
  if (isToday(d)) return "Today";
  if (isYesterday(d)) return "Yesterday";
  if (isThisWeek(d)) return "This week";
  return "Earlier";
}

/** Accepts whatever the stream pushes and returns a safe notification, or null. */
function normalize(raw: any): UserNotification | null {
  if (!raw || typeof raw !== "object" || !raw.id) return null;
  return {
    id: String(raw.id),
    title: String(raw.title ?? "Notification"),
    message: String(raw.message ?? ""),
    is_read: Boolean(raw.is_read ?? (raw.read_at ? true : false)),
    created_at: raw.created_at ? String(raw.created_at) : new Date().toISOString(),
  };
}

export function UserNotificationsClient({ user }: { user: NotificationsUser }) {
  const [notifications, setNotifications] = useState<UserNotification[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [filter, setFilter] = useState<Filter>("all");
  const [kindFilter, setKindFilter] = useState<KindFilter>("all");
  const [query, setQuery] = useState("");
  const [live, setLive] = useState<LiveState>("connecting");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [navIds, setNavIds] = useState<string[]>([]);
  const [activeIndex, setActiveIndex] = useState(-1);

  const [deleteTarget, setDeleteTarget] = useState<"all" | string | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const searchRef = useRef<HTMLInputElement>(null);
  const seenIds = useRef<Set<string>>(new Set());
  const listRef = useRef<UserNotification[]>([]);

  const unreadCount = useMemo(() => notifications.filter((n) => !n.is_read).length, [notifications]);
  const readCount = notifications.length - unreadCount;

  useEffect(() => {
    listRef.current = notifications;
  }, [notifications]);

  /* ------------------------------ bell sync ------------------------------ */
  // Reacts to unreadCount, so it covers mark one, mark all, open, delete,
  // delete all, incoming SSE and every rollback.
  useEffect(() => {
    if (isLoading) return;
    window.dispatchEvent(new CustomEvent(UNREAD_EVENT, { detail: { unreadCount } }));
  }, [unreadCount, isLoading]);

  /* ------------------------------ load ------------------------------ */

  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const res = await apiClient.get(LIST_ENDPOINT);
        if (!alive) return;
        const server: UserNotification[] = (res.data?.notifications ?? [])
          .map(normalize)
          .filter(Boolean) as UserNotification[];
        server.forEach((n) => seenIds.current.add(n.id));
        setNotifications((prev) => {
          const ids = new Set(server.map((n) => n.id));
          return [...prev.filter((n) => !ids.has(n.id)), ...server].sort(
            (a, b) => +new Date(b.created_at) - +new Date(a.created_at),
          );
        });
      } catch {
        toast.add({
          title: "Couldn't load notifications",
          description: "Check your connection and refresh the page.",
          type: "error",
        });
      } finally {
        if (alive) setIsLoading(false);
      }
    })();
    return () => {
      alive = false;
    };
  }, []);

  /* ------------------------------ live stream ------------------------------ */
  // No toast here: the shell's bell already toasts every incoming notification.

  useEffect(() => {
    const es = new EventSource(STREAM_URL);
    es.onopen = () => setLive("live");
    es.onerror = () => setLive(es.readyState === EventSource.CLOSED ? "offline" : "connecting");
    es.addEventListener("notification", (event) => {
      try {
        const incoming = normalize(JSON.parse((event as MessageEvent).data));
        if (!incoming || seenIds.current.has(incoming.id)) return;
        seenIds.current.add(incoming.id);
        setNotifications((prev) => [incoming, ...prev]);
      } catch (err) {
        console.error("Failed to parse SSE notification", err);
      }
    });
    return () => es.close();
  }, []);

  /* ------------------------------ actions ------------------------------ */

  const markRead = useCallback(async (id: string) => {
    const target = listRef.current.find((n) => n.id === id);
    if (!target || target.is_read) return;

    const apply = (list: UserNotification[]) => list.map((n) => (n.id === id ? { ...n, is_read: true } : n));
    listRef.current = apply(listRef.current);
    setNotifications(apply);

    try {
      await apiClient.patch(READ_ENDPOINT, { id });
    } catch {
      const revert = (list: UserNotification[]) => list.map((n) => (n.id === id ? { ...n, is_read: false } : n));
      listRef.current = revert(listRef.current);
      setNotifications(revert);
      toast.add({ title: "Couldn't mark as read", description: "Try again in a moment.", type: "error" });
    }
  }, []);

  const handleMarkAllRead = async () => {
    const flipped = new Set(listRef.current.filter((n) => !n.is_read).map((n) => n.id));
    if (flipped.size === 0) return;

    const apply = (list: UserNotification[]) =>
      list.map((n) => (flipped.has(n.id) ? { ...n, is_read: true } : n));
    listRef.current = apply(listRef.current);
    setNotifications(apply);

    try {
      await apiClient.patch(READ_ENDPOINT, { all: true });
      toast.add({ title: "All caught up", description: "Every notification is marked as read.", type: "success" });
    } catch {
      const revert = (list: UserNotification[]) =>
        list.map((n) => (flipped.has(n.id) ? { ...n, is_read: false } : n));
      listRef.current = revert(listRef.current);
      setNotifications(revert);
      toast.add({ title: "Couldn't mark all as read", description: "Nothing was changed. Try again.", type: "error" });
    }
  };

  const executeDelete = async () => {
    if (!deleteTarget) return;
    setIsDeleting(true);
    const backup = [...listRef.current];
    const target = deleteTarget;

    // optimistic
    if (target === "all") {
      setNotifications([]);
      listRef.current = [];
      setSelectedId(null);
    } else {
      setNotifications((prev) => prev.filter((n) => n.id !== target));
      listRef.current = listRef.current.filter((n) => n.id !== target);
    }

    try {
      if (target === "all") {
        await apiClient.delete(LIST_ENDPOINT);
        toast.add({ title: "Cleared", description: "All notifications deleted.", type: "success" });
      } else {
        await apiClient.delete(itemEndpoint(target));
        toast.add({ title: "Deleted", description: "Notification removed.", type: "success" });
      }
      setDeleteTarget(null);
    } catch {
      setNotifications(backup);
      listRef.current = backup;
      toast.add({ title: "Couldn't delete", description: "Nothing was removed. Try again.", type: "error" });
      setDeleteTarget(null);
    } finally {
      setIsDeleting(false);
    }
  };

  /* ------------------------------ derived ------------------------------ */

  const kindCounts = useMemo(() => {
    const base: Record<KindFilter, number> = { all: 0, billing: 0, invitation: 0, account: 0, system: 0 };
    for (const n of notifications) {
      if (filter === "unread" && n.is_read) continue;
      base.all++;
      base[resolveKind(n.title, n.message)]++;
    }
    return base;
  }, [notifications, filter]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return notifications.filter((n) => {
      if (filter === "unread" && n.is_read) return false;
      if (kindFilter !== "all" && resolveKind(n.title, n.message) !== kindFilter) return false;
      if (q && !`${n.title} ${n.message}`.toLowerCase().includes(q)) return false;
      return true;
    });
  }, [notifications, filter, kindFilter, query]);

  const groups = useMemo(() => {
    const map = new Map<string, UserNotification[]>();
    for (const n of filtered) {
      const g = groupOf(n.created_at);
      map.set(g, [...(map.get(g) ?? []), n]);
    }
    return GROUP_ORDER.filter((g) => map.has(g)).map((g) => ({ label: g, items: map.get(g)! }));
  }, [filtered]);

  const selected = selectedId ? notifications.find((n) => n.id === selectedId) ?? null : null;
  const selectedIndex = selectedId ? navIds.indexOf(selectedId) : -1;
  const hasActiveFilters = kindFilter !== "all" || query.trim() !== "";

  const open = useCallback(
    (n: UserNotification) => {
      setNavIds(filtered.map((x) => x.id));
      setSelectedId(n.id);
      markRead(n.id);
    },
    [filtered, markRead],
  );

  const step = useCallback(
    (dir: 1 | -1) => {
      const nextId = navIds[selectedIndex + dir];
      if (!nextId) return;
      setSelectedId(nextId);
      markRead(nextId);
    },
    [navIds, selectedIndex, markRead],
  );

  /* ------------------------------ keyboard ------------------------------ */

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (selectedId || deleteTarget) return;
      if (e.metaKey || e.ctrlKey || e.altKey) return;
      const tag = (e.target as HTMLElement)?.tagName;
      const typing = tag === "INPUT" || tag === "TEXTAREA";
      if (e.key === "/" && !typing) {
        e.preventDefault();
        searchRef.current?.focus();
        return;
      }
      if (typing) {
        if (e.key === "Escape") (e.target as HTMLElement).blur();
        return;
      }
      const current = filtered[activeIndex];
      if (e.key === "j") setActiveIndex((i) => Math.min(filtered.length - 1, i + 1));
      else if (e.key === "k") setActiveIndex((i) => Math.max(0, i - 1));
      else if (e.key === "Enter" && current) open(current);
      else if (e.key === "m" && current) markRead(current.id);
      else if (e.key === "d" && current) setDeleteTarget(current.id);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [selectedId, deleteTarget, filtered, activeIndex, open, markRead]);

  useEffect(() => {
    setActiveIndex(-1);
  }, [filter, kindFilter, query]);

  // keep the keyboard-active row on screen
  useEffect(() => {
    if (activeIndex < 0) return;
    document
      .querySelector<HTMLElement>(`[data-row-index="${activeIndex}"]`)
      ?.scrollIntoView({ block: "nearest", behavior: "smooth" });
  }, [activeIndex]);

  /* ------------------------------ render ------------------------------ */

  let rowCounter = -1;

  return (
    <div className="mx-auto w-full max-w-5xl space-y-4 pb-4 sm:space-y-5">
      <NotificationsHeader
        title="Notifications"
        subtitle={
          unreadCount > 0
            ? `${unreadCount} unread. Payments, plan updates and guest activity, as they happen.`
            : `You’re all caught up, ${user.first_name}.`
        }
        actions={
          <>
            <AnimatePresence initial={false}>
              {unreadCount > 0 && (
                <motion.button
                  key="mark-all"
                  type="button"
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.9 }}
                  onClick={handleMarkAllRead}
                  className={cn(INK_BTN, FOCUS)}
                >
                  <IcCheckAll className="size-4" />
                  <span className="hidden sm:inline">Mark all read</span>
                  <span className="sm:hidden">Read all</span>
                </motion.button>
              )}
            </AnimatePresence>
            {notifications.length > 0 && (
              <button
                type="button"
                onClick={() => setDeleteTarget("all")}
                aria-label="Delete all notifications"
                title="Delete all notifications"
                className={cn(DANGER_GHOST_BTN, FOCUS)}
              >
                <IcTrash className="size-4" />
                <span className="hidden sm:inline">Clear all</span>
              </button>
            )}
          </>
        }
      >
        <LiveBadge state={live} />
        <Chip>{notifications.length} total</Chip>
        {notifications.length > 0 && <ReadProgress read={readCount} total={notifications.length} />}
      </NotificationsHeader>

      {/* ------------------------------ toolbar ------------------------------ */}
      <div className={cn("rounded-2xl p-3", SURFACE)}>
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <LayoutGroup id="user-notif-filter">
            <div className="relative flex w-fit rounded-xl bg-stone-100 p-1 ring-1 ring-black/[0.04]" role="tablist">
              {(["all", "unread"] as const).map((f) => (
                <button
                  key={f}
                  type="button"
                  role="tab"
                  aria-selected={filter === f}
                  onClick={() => setFilter(f)}
                  className={cn(
                    "relative z-10 flex items-center gap-2 rounded-lg px-4 py-1.5 text-[13px] font-semibold transition-colors",
                    filter === f ? "text-[#1c1410]" : "text-stone-500 hover:text-[#1c1410]",
                    FOCUS,
                  )}
                >
                  {filter === f && (
                    <motion.span
                      layoutId="user-notif-pill"
                      transition={{ type: "spring", stiffness: 500, damping: 36 }}
                      className="absolute inset-0 -z-10 rounded-lg bg-white shadow-sm ring-1 ring-black/[0.06]"
                    />
                  )}
                  {f === "all" ? "All" : "Unread"}
                  {f === "unread" && unreadCount > 0 && (
                    <motion.span
                      key={unreadCount}
                      initial={{ scale: 1.4 }}
                      animate={{ scale: 1 }}
                      className="rounded-full bg-[#1c1410] px-1.5 py-0.5 text-[10px] font-bold tabular-nums leading-none text-white"
                    >
                      {unreadCount > 99 ? "99+" : unreadCount}
                    </motion.span>
                  )}
                </button>
              ))}
            </div>
          </LayoutGroup>

          <div className="group relative w-full lg:max-w-sm">
            <IcSearch className="pointer-events-none absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-stone-400 transition-colors group-focus-within:text-[#1c1410]" />
            <input
              ref={searchRef}
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search notifications"
              aria-label="Search notifications"
              className="w-full rounded-xl border border-black/10 bg-white py-2.5 pl-10 pr-14 text-sm text-[#1c1410] outline-none transition-all placeholder:text-stone-400 hover:border-black/20 focus:border-[#1c1410]/60 focus:ring-4 focus:ring-black/[0.06]"
            />
            {query ? (
              <button
                type="button"
                onClick={() => setQuery("")}
                aria-label="Clear search"
                className="absolute right-2.5 top-1/2 -translate-y-1/2 rounded-full p-1 text-stone-400 hover:bg-black/5 hover:text-[#1c1410]"
              >
                <IcX className="size-3.5" />
              </button>
            ) : (
              <kbd className="pointer-events-none absolute right-3 top-1/2 hidden -translate-y-1/2 rounded bg-stone-50 px-1.5 font-mono text-[10px] text-stone-400 ring-1 ring-black/10 sm:block">
                /
              </kbd>
            )}
          </div>
        </div>

        {/* px/py padding + negative x margin keep the pill rings from being clipped by overflow-x-auto */}
        <div className="-mx-1 mt-4 flex gap-2 overflow-x-auto px-1 py-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          {KIND_FILTERS.map(({ id, label }) => {
            const on = kindFilter === id;
            const tone = id === "all" ? null : KIND_TONES[id];
            return (
              <button
                key={id}
                type="button"
                onClick={() => setKindFilter(id)}
                aria-pressed={on}
                className={cn(
                  "flex shrink-0 items-center gap-2 rounded-full px-3.5 py-1.5 text-[13px] font-semibold ring-1 transition-all",
                  on
                    ? "bg-[#1c1410] text-white shadow-sm ring-[#1c1410]"
                    : "bg-white text-stone-600 ring-black/[0.08] hover:-translate-y-px hover:bg-stone-50 hover:shadow-sm",
                  FOCUS,
                )}
              >
                {tone && <span className={cn("size-1.5 rounded-full", tone.dot)} />}
                {label}
                <span className={cn("text-xs tabular-nums", on ? "text-white/60" : "text-stone-400")}>
                  {kindCounts[id]}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* ------------------------------ list ------------------------------ */}
      <div className={cn("overflow-clip rounded-2xl", SURFACE)}>
        {isLoading ? (
          <div aria-busy="true">
            {[0, 1, 2, 3, 4].map((i) => (
              <NotificationRowSkeleton key={i} i={i} />
            ))}
          </div>
        ) : groups.length === 0 ? (
          <EmptyState
            filtered={hasActiveFilters}
            unreadOnly={filter === "unread"}
            onClear={() => {
              setQuery("");
              setKindFilter("all");
            }}
          />
        ) : (
          groups.map((group) => (
            <section key={group.label} aria-label={group.label} className="relative">
              <div className="sticky top-0 z-10 flex items-center gap-3 border-b border-dashed border-[#1c1410]/15 bg-gradient-to-r from-[#fffdfa] to-[#fff3e8] px-4 py-2 sm:px-5">
                <h2 className="text-xs font-semibold text-stone-600">{group.label}</h2>
                <span className="rounded-full bg-white px-1.5 text-[11px] font-semibold tabular-nums text-stone-400 ring-1 ring-black/[0.06]">
                  {group.items.length}
                </span>
              </div>

              <AnimatePresence initial={false} mode="popLayout">
                {group.items.map((notif) => {
                  rowCounter++;
                  const idx = rowCounter;
                  const kind = resolveKind(notif.title, notif.message);
                  const tone = KIND_TONES[kind];
                  const { Icon } = tone;
                  const unread = !notif.is_read;
                  const active = idx === activeIndex;

                  return (
                    <motion.div
                      key={notif.id}
                      layout
                      data-row-index={idx}
                      initial={{ opacity: 0, y: -12, scale: 0.98 }}
                      animate={{ opacity: 1, y: 0, scale: 1 }}
                      exit={{ opacity: 0, x: 24, scale: 0.97 }}
                      transition={{ type: "spring", stiffness: 420, damping: 34, opacity: { duration: 0.18 } }}
                      role="button"
                      tabIndex={0}
                      onClick={() => open(notif)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter" || e.key === " ") {
                          e.preventDefault();
                          open(notif);
                        }
                      }}
                      className={cn(
                        "group relative flex scroll-mt-12 cursor-pointer gap-3 border-b border-black/[0.06] px-4 py-4 outline-none transition-colors last:border-0 sm:gap-4 sm:px-5",
                        "focus-visible:bg-[#fff8f1]",
                        active
                          ? "bg-[#fff3e8] ring-1 ring-inset ring-[#1c1410]/15"
                          : unread
                            ? "bg-[#fff8f1]/70 hover:bg-[#fff3e8]"
                            : "hover:bg-stone-50",
                      )}
                    >
                      <span
                        aria-hidden
                        className={cn(
                          "absolute inset-y-3 left-0 w-[3px] rounded-r-full transition-opacity",
                          tone.bar,
                          unread ? "opacity-100" : "opacity-0",
                        )}
                      />

                      <div
                        className={cn(
                          "grid size-11 shrink-0 place-items-center rounded-xl bg-white text-[#1c1410] ring-1 ring-black/[0.08] transition-transform group-hover:scale-105",
                          !unread && "opacity-60",
                        )}
                      >
                        <Icon className="size-5" />
                      </div>

                      <div className="min-w-0 flex-1">
                        <div className="mb-0.5 flex items-center justify-between gap-3">
                          <div className="flex min-w-0 items-center gap-2">
                            <h3
                              className={cn(
                                HEADING,
                                "truncate text-[15px] tracking-[-0.01em]",
                                unread ? "text-[#1c1410]" : "text-stone-500",
                              )}
                            >
                              <Highlight text={notif.title} query={query} />
                            </h3>
                            <KindPill kind={kind} />
                          </div>
                          <time
                            dateTime={notif.created_at}
                            className="shrink-0 text-xs font-medium tabular-nums text-stone-400"
                          >
                            {formatDistanceToNow(new Date(notif.created_at), { addSuffix: true })}
                          </time>
                        </div>
                        <p
                          className={cn(
                            "line-clamp-2 text-sm leading-relaxed",
                            unread ? "text-stone-700" : "text-stone-500",
                          )}
                        >
                          <Highlight text={notif.message} query={query} />
                        </p>
                      </div>

                      <div className="flex w-[4.5rem] shrink-0 items-center justify-end gap-1.5">
                        {unread && (
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              markRead(notif.id);
                            }}
                            aria-label="Mark as read"
                            title="Mark as read"
                            className="rounded-full bg-white p-1.5 text-stone-400 opacity-0 shadow-sm ring-1 ring-black/[0.08] transition-all hover:scale-110 hover:text-emerald-600 focus-visible:opacity-100 group-hover:opacity-100"
                          >
                            <IcCheck className="size-3.5" />
                          </button>
                        )}
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            setDeleteTarget(notif.id);
                          }}
                          aria-label="Delete notification"
                          title="Delete notification"
                          className="rounded-full bg-white p-1.5 opacity-0 shadow-sm ring-1 ring-black/[0.08] transition-all hover:scale-110 hover:bg-rose-50 hover:ring-rose-200 focus-visible:opacity-100 group-hover:opacity-100"
                        >
                          <IcTrash className="size-3.5" />
                        </button>

                        {unread ? (
                          <span
                            aria-label="Unread"
                            className="size-2.5 rounded-full bg-[#1c1410] shadow-[0_0_0_4px_rgba(28,20,16,0.08)] group-hover:hidden"
                          />
                        ) : (
                          <IcChevronRight className="size-4 text-stone-300 group-hover:hidden" />
                        )}
                      </div>
                    </motion.div>
                  );
                })}
              </AnimatePresence>
            </section>
          ))
        )}
      </div>

      {!isLoading && filtered.length > 0 && (
        <p className="hidden flex-wrap items-center justify-center gap-x-4 gap-y-1 pt-1 text-xs text-stone-500 sm:flex">
          <span>
            <kbd className="rounded bg-white px-1.5 font-mono ring-1 ring-black/10">j</kbd>{" "}
            <kbd className="rounded bg-white px-1.5 font-mono ring-1 ring-black/10">k</kbd> navigate
          </span>
          <span>
            <kbd className="rounded bg-white px-1.5 font-mono ring-1 ring-black/10">Enter</kbd> open
          </span>
          <span>
            <kbd className="rounded bg-white px-1.5 font-mono ring-1 ring-black/10">m</kbd> mark read
          </span>
          <span>
            <kbd className="rounded bg-white px-1.5 font-mono ring-1 ring-black/10">d</kbd> delete
          </span>
          <span>
            <kbd className="rounded bg-white px-1.5 font-mono ring-1 ring-black/10">/</kbd> search
          </span>
        </p>
      )}

      {/* ------------------------------ modals ------------------------------ */}
      <AnimatePresence>
        {selected && (
          <NotificationModal
            key="notification-modal"
            notification={selected}
            onClose={() => setSelectedId(null)}
            onPrev={selectedIndex > 0 ? () => step(-1) : undefined}
            onNext={selectedIndex < navIds.length - 1 ? () => step(1) : undefined}
            position={{ index: selectedIndex, total: navIds.length }}
            onDelete={(id) => {
              setSelectedId(null);
              setDeleteTarget(id);
            }}
          />
        )}
      </AnimatePresence>

      <AnimatePresence>
        {deleteTarget && (
          <DeleteNotificationModal
            key="delete-modal"
            targetType={deleteTarget === "all" ? "all" : "single"}
            onClose={() => {
              if (!isDeleting) setDeleteTarget(null);
            }}
            onConfirm={executeDelete}
            isDeleting={isDeleting}
          />
        )}
      </AnimatePresence>
    </div>
  );
}