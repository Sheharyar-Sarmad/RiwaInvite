"use client";

import { useState, useEffect, useMemo, useCallback, useRef } from "react";
import { motion, AnimatePresence, LayoutGroup } from "framer-motion";
import { CheckCheck, BellOff, Search, X, Check, ChevronRight, Trash2 } from "lucide-react";
import { apiClient } from "@/lib/api/api_base";
import { formatDistanceToNow, isToday, isYesterday, isThisWeek } from "date-fns";
import { toast } from "@/components/ui/toast";
import {
  NotificationModal,
  NOTIFICATION_TONES,
  resolveKind,
  type NotificationItem,
  type NotificationKind,
} from "@/components/admin/models/NotificationModal";
import { DeleteNotificationModal } from "@/components/admin/models/DeleteNotificationModal"; // 🟢 Import new modal

type Filter = "all" | "unread";
type KindFilter = "all" | NotificationKind;
type Live = "connecting" | "live" | "offline";

const KIND_FILTERS: { id: KindFilter; label: string }[] = [
  { id: "all", label: "Everything" },
  { id: "order", label: "Orders" },
  { id: "user", label: "Users" },
  { id: "alert", label: "Alerts" },
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

function Highlight({ text, query }: { text: string; query: string }) {
  if (!query.trim()) return <>{text}</>;
  const safe = query.trim().replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const parts = text.split(new RegExp(`(${safe})`, "ig"));
  return (
    <>
      {parts.map((p, i) =>
        p.toLowerCase() === query.trim().toLowerCase() ? (
          <mark key={i} className="rounded bg-orange-200/70 px-0.5 text-inherit">{p}</mark>
        ) : (
          <span key={i}>{p}</span>
        )
      )}
    </>
  );
}

function SkeletonRow({ i }: { i: number }) {
  return (
    <div className="flex gap-4 border-b border-gray-100 p-5 last:border-0" style={{ opacity: 1 - i * 0.14 }}>
      <div className="h-11 w-11 shrink-0 animate-pulse rounded-xl bg-gray-100" />
      <div className="flex-1 space-y-2.5 pt-1">
        <div className="h-3.5 w-1/3 animate-pulse rounded bg-gray-100" />
        <div className="h-3 w-3/4 animate-pulse rounded bg-gray-100" />
      </div>
    </div>
  );
}

export function NotificationsClient() {
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [filter, setFilter] = useState<Filter>("all");
  const [kindFilter, setKindFilter] = useState<KindFilter>("all");
  const [query, setQuery] = useState("");
  const [live, setLive] = useState<Live>("connecting");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [navIds, setNavIds] = useState<string[]>([]);
  const [activeIndex, setActiveIndex] = useState(-1);
  const searchRef = useRef<HTMLInputElement>(null);
  const seenIds = useRef<Set<string>>(new Set());
  const notificationsRef = useRef<NotificationItem[]>([]);

  // 🟢 NEW: Delete Modal State
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<"all" | string | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const unreadCount = useMemo(() => notifications.filter((n) => !n.read_at).length, [notifications]);

  useEffect(() => { notificationsRef.current = notifications; }, [notifications]);

  useEffect(() => {
    (async () => {
      try {
        const res = await apiClient.get("/admin/dashboard/notifications");
        const server: NotificationItem[] = res.data.notifications;
        server.forEach((n) => seenIds.current.add(n.id));
        setNotifications((prev) => {
          const serverIds = new Set(server.map((n) => n.id));
          return [...prev.filter((n) => !serverIds.has(n.id)), ...server];
        });
      } catch {
        toast.add({ title: "Couldn't load notifications", description: "Check your connection and refresh the page.", type: "error" });
      } finally {
        setIsLoading(false);
      }
    })();
  }, []);

  useEffect(() => {
    const es = new EventSource("/api/v1/admin/dashboard/notifications/stream");
    es.onopen = () => setLive("live");
    es.onerror = () => setLive(es.readyState === EventSource.CLOSED ? "offline" : "connecting");
    es.addEventListener("notification", (event) => {
      try {
        const incoming: NotificationItem = JSON.parse((event as MessageEvent).data);
        if (seenIds.current.has(incoming.id)) return;
        seenIds.current.add(incoming.id);
        setNotifications((prev) => [incoming, ...prev]);
        toast.add({ title: incoming.title, description: incoming.message, type: "info" });
      } catch (err) {
        console.error("Failed to parse SSE notification", err);
      }
    });
    return () => es.close();
  }, []);

  /* ───────── actions ───────── */
  const markRead = useCallback(async (id: string) => {
    const target = notificationsRef.current.find((n) => n.id === id);
    if (!target || target.read_at) return;

    const stamp = new Date().toISOString();
    const apply = (list: NotificationItem[]) => list.map((n) => (n.id === id ? { ...n, read_at: stamp } : n));
    notificationsRef.current = apply(notificationsRef.current); 
    setNotifications(apply);                                    

    try {
      await apiClient.patch("/admin/dashboard/notifications/read", { id });
    } catch {
      setNotifications((prev) => prev.map((n) => (n.id === id && n.read_at === stamp ? { ...n, read_at: null } : n)));
      toast.add({ title: "Couldn't mark as read", description: "Try again in a moment.", type: "error" });
    }
  }, []);

  const handleMarkAllRead = async () => {
    const stamp = new Date().toISOString();
    const flipped = new Set(notificationsRef.current.filter((n) => !n.read_at).map((n) => n.id));
    if (flipped.size === 0) return;

    setNotifications((prev) => prev.map((n) => (flipped.has(n.id) ? { ...n, read_at: stamp } : n)));
    try {
      await apiClient.patch("/admin/dashboard/notifications/read", { all: true });
      toast.add({ title: "All caught up", description: "Every notification is marked as read.", type: "success" });
    } catch {
      setNotifications((prev) => prev.map((n) => (flipped.has(n.id) && n.read_at === stamp ? { ...n, read_at: null } : n)));
      toast.add({ title: "Couldn't mark all as read", description: "Nothing was changed. Try again.", type: "error" });
    }
  };

  // 🟢 UPDATED: Open Modal for Single Delete
  const handleDeleteOne = (e: React.MouseEvent, id: string) => {
    e.stopPropagation(); // Prevent opening the detail modal
    setDeleteTarget(id);
    setIsDeleteModalOpen(true);
  };

  // 🟢 UPDATED: Open Modal for Delete All
  const handleDeleteAll = () => {
    setDeleteTarget("all");
    setIsDeleteModalOpen(true);
  };

  // 🟢 NEW: The actual deletion logic (called by the Modal)
  const executeDelete = async () => {
    if (!deleteTarget) return;
    setIsDeleting(true);
    const backup = [...notificationsRef.current];
    
    // Optimistic update
    if (deleteTarget === "all") {
      setNotifications([]);
      notificationsRef.current = [];
      setSelectedId(null); // Close detail modal if open
    } else {
      setNotifications((prev) => prev.filter((n) => n.id !== deleteTarget));
      notificationsRef.current = notificationsRef.current.filter((n) => n.id !== deleteTarget);
    }

    try {
      if (deleteTarget === "all") {
        await apiClient.delete("/admin/dashboard/notifications");
        toast.add({ title: "Cleared", description: "All notifications deleted.", type: "success" });
      } else {
        await apiClient.delete(`/admin/dashboard/notifications/${deleteTarget}`);
        toast.add({ title: "Deleted", description: "Notification removed.", type: "success" });
      }
      setIsDeleteModalOpen(false);
    } catch {
      // Rollback on failure
      setNotifications(backup);
      notificationsRef.current = backup;
      toast.add({ title: "Error", description: "Failed to delete.", type: "error" });
    } finally {
      setIsDeleting(false);
      setDeleteTarget(null);
    }
  };

  /* ───────── derived ───────── */
  const kindCounts = useMemo(() => {
    const base: Record<KindFilter, number> = { all: 0, order: 0, user: 0, alert: 0, system: 0 };
    for (const n of notifications) {
      if (filter === "unread" && n.read_at) continue;
      base.all++;
      base[resolveKind(n.title, n.message)]++;
    }
    return base;
  }, [notifications, filter]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return notifications.filter((n) => {
      if (filter === "unread" && n.read_at) return false;
      if (kindFilter !== "all" && resolveKind(n.title, n.message) !== kindFilter) return false;
      if (q && !`${n.title} ${n.message}`.toLowerCase().includes(q)) return false;
      return true;
    });
  }, [notifications, filter, kindFilter, query]);

  const groups = useMemo(() => {
    const map = new Map<string, NotificationItem[]>();
    for (const n of filtered) {
      const g = groupOf(n.created_at);
      map.set(g, [...(map.get(g) ?? []), n]);
    }
    return GROUP_ORDER.filter((g) => map.has(g)).map((g) => ({ label: g, items: map.get(g)! }));
  }, [filtered]);

  const selected = selectedId ? notifications.find((n) => n.id === selectedId) ?? null : null;
  const selectedIndex = selectedId ? navIds.indexOf(selectedId) : -1;

  const open = useCallback((n: NotificationItem) => {
    setNavIds(filtered.map((x) => x.id));
    setSelectedId(n.id);
    markRead(n.id);
  }, [filtered, markRead]);

  const step = useCallback((dir: 1 | -1) => {
    const nextId = navIds[selectedIndex + dir];
    if (!nextId) return;
    setSelectedId(nextId);
    markRead(nextId);
  }, [navIds, selectedIndex, markRead]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (selectedId || isDeleteModalOpen) return; // Disable shortcuts when modals are open
      const tag = (e.target as HTMLElement)?.tagName;
      const typing = tag === "INPUT" || tag === "TEXTAREA";
      if (e.key === "/" && !typing) { e.preventDefault(); searchRef.current?.focus(); return; }
      if (typing) { if (e.key === "Escape") (e.target as HTMLElement).blur(); return; }
      if (e.key === "j") setActiveIndex((i) => Math.min(filtered.length - 1, i + 1));
      else if (e.key === "k") setActiveIndex((i) => Math.max(0, i - 1));
      else if (e.key === "Enter" && filtered[activeIndex]) open(filtered[activeIndex]);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [selectedId, isDeleteModalOpen, filtered, activeIndex, open]);

  useEffect(() => { setActiveIndex(-1); }, [filter, kindFilter, query]);

  /* ───────── render ───────── */
  const liveMeta = {
    live: { dot: "bg-emerald-500", ping: true, label: "Live" },
    connecting: { dot: "bg-amber-400", ping: false, label: "Connecting" },
    offline: { dot: "bg-gray-300", ping: false, label: "Offline" },
  }[live];

  const hasActiveFilters = kindFilter !== "all" || query.trim() !== "";
  let rowCounter = -1;

  return (
    <div className="space-y-4">
      {/* ── Toolbar ── */}
      <div className="rounded-2xl border border-gray-200/80 bg-white/70 p-3 shadow-[0_1px_2px_rgba(16,24,40,0.04),0_8px_24px_-12px_rgba(16,24,40,0.08)] backdrop-blur-xl">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex flex-wrap items-center gap-3">
            <LayoutGroup id="notif-filter">
              <div className="relative flex rounded-xl bg-gray-100/90 p-1" role="tablist">
                {(["all", "unread"] as const).map((f) => (
                  <button
                    key={f}
                    role="tab"
                    aria-selected={filter === f}
                    onClick={() => setFilter(f)}
                    className="relative z-10 flex cursor-pointer items-center gap-2 rounded-lg px-4 py-2 text-sm font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-400"
                  >
                    {filter === f && (
                      <motion.span
                        layoutId="pill"
                        transition={{ type: "spring", stiffness: 500, damping: 36 }}
                        className="absolute inset-0 -z-10 rounded-lg bg-white shadow-sm ring-1 ring-black/5"
                      />
                    )}
                    <span className={filter === f ? "text-gray-900" : "text-gray-500 hover:text-gray-700"}>
                      {f === "all" ? "All" : "Unread"}
                    </span>
                    {f === "unread" && unreadCount > 0 && (
                      <motion.span
                        key={unreadCount}
                        initial={{ scale: 1.4 }} animate={{ scale: 1 }}
                        className="rounded-full bg-orange-500 px-1.5 py-0.5 text-[10px] font-bold tabular-nums leading-none text-white"
                      >
                        {unreadCount > 99 ? "99+" : unreadCount}
                      </motion.span>
                    )}
                  </button>
                ))}
              </div>
            </LayoutGroup>

            <div className="flex items-center gap-2 rounded-full border border-gray-200 bg-white px-3 py-1.5 text-xs font-semibold text-gray-600" title="Real-time updates">
              <span className="relative flex h-2 w-2">
                {liveMeta.ping && <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-60" />}
                <span className={`relative inline-flex h-2 w-2 rounded-full ${liveMeta.dot}`} />
              </span>
              {liveMeta.label}
            </div>
          </div>

          <div className="flex flex-1 items-center gap-2 lg:max-w-md lg:justify-end">
            <div className="group relative flex-1">
              <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400 transition-colors group-focus-within:text-orange-500" />
              <input
                ref={searchRef}
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search notifications"
                aria-label="Search notifications"
                className="w-full rounded-xl border border-gray-200 bg-white py-2.5 pl-10 pr-16 text-sm text-gray-800 outline-none transition-all placeholder:text-gray-400 focus:border-orange-300 focus:ring-4 focus:ring-orange-100"
              />
              {query ? (
                <button onClick={() => setQuery("")} aria-label="Clear search" className="absolute right-2.5 top-1/2 -translate-y-1/2 rounded-full p-1 text-gray-400 hover:bg-gray-100 hover:text-gray-700">
                  <X className="h-3.5 w-3.5" />
                </button>
              ) : (
                <kbd className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 rounded border border-gray-200 bg-gray-50 px-1.5 font-mono text-[10px] text-gray-400">/</kbd>
              )}
            </div>

            <AnimatePresence initial={false}>
              {unreadCount > 0 && (
                <motion.button
                  initial={{ opacity: 0, scale: 0.9, width: 0 }}
                  animate={{ opacity: 1, scale: 1, width: "auto" }}
                  exit={{ opacity: 0, scale: 0.9, width: 0 }}
                  onClick={handleMarkAllRead}
                  className="flex shrink-0 cursor-pointer items-center gap-2 overflow-hidden whitespace-nowrap rounded-xl bg-gray-900 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-gray-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-400 focus-visible:ring-offset-2"
                >
                  <CheckCheck className="h-4 w-4" /> Mark all read
                </motion.button>
              )}
            </AnimatePresence>

            {notifications.length > 0 && (
              <button
                onClick={handleDeleteAll}
                title="Delete all notifications"
                className="flex shrink-0 cursor-pointer items-center justify-center rounded-xl border border-red-100 bg-red-50 px-3 py-2.5 text-red-600 transition-colors hover:bg-red-100 hover:text-red-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-400"
              >
                <Trash2 className="h-4 w-4" />
              </button>
            )}
          </div>
        </div>

        {/* Type chips */}
        <div className="mt-3 flex gap-2 overflow-x-auto pb-0.5 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          {KIND_FILTERS.map(({ id, label }) => {
            const active = kindFilter === id;
            const tone = id === "all" ? null : NOTIFICATION_TONES[id];
            return (
              <button
                key={id}
                onClick={() => setKindFilter(id)}
                aria-pressed={active}
                className={`flex shrink-0 cursor-pointer items-center gap-2 rounded-full border px-3.5 py-1.5 text-[13px] font-semibold transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-400 ${
                  active
                    ? "border-gray-900 bg-gray-900 text-white shadow-sm"
                    : "border-gray-200 bg-white text-gray-600 hover:border-gray-300 hover:bg-gray-50"
                }`}
              >
                {tone && <span className={`h-1.5 w-1.5 rounded-full ${tone.bar}`} />}
                {label}
                <span className={`tabular-nums text-xs ${active ? "text-white/60" : "text-gray-400"}`}>{kindCounts[id]}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* ── List ── */}
      <div className="overflow-hidden rounded-2xl border border-gray-200/80 bg-white/70 shadow-[0_1px_2px_rgba(16,24,40,0.04),0_8px_24px_-12px_rgba(16,24,40,0.08)] backdrop-blur-xl">
        {isLoading ? (
          <div aria-busy="true">{[0, 1, 2, 3, 4].map((i) => <SkeletonRow key={i} i={i} />)}</div>
        ) : groups.length === 0 ? (
          <motion.div initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} className="flex flex-col items-center px-6 py-24 text-center">
            <div className="relative mb-5">
              <div className="absolute inset-0 -m-3 rounded-full bg-orange-100/60 blur-xl" />
              <div className="relative grid h-16 w-16 place-items-center rounded-2xl border border-gray-100 bg-white shadow-sm">
                {hasActiveFilters ? <Search className="h-7 w-7 text-gray-300" /> : <BellOff className="h-7 w-7 text-gray-300" />}
              </div>
            </div>
            <p className="text-lg font-bold text-gray-800 font-[family-name:var(--font-display)]">
              {hasActiveFilters ? "No matches" : filter === "unread" ? "No unread notifications" : "You're all caught up"}
            </p>
            <p className="mt-1 max-w-xs text-sm text-gray-500">
              {hasActiveFilters ? "Try a different search or clear the filters." : "New orders, users and alerts will appear here as they happen."}
            </p>
            {hasActiveFilters && (
              <button
                onClick={() => { setQuery(""); setKindFilter("all"); }}
                className="mt-5 cursor-pointer rounded-xl border border-gray-200 bg-white px-4 py-2 text-sm font-semibold text-gray-700 shadow-sm transition-colors hover:bg-gray-50"
              >
                Clear filters
              </button>
            )}
          </motion.div>
        ) : (
          groups.map((group) => (
            <section key={group.label} aria-label={group.label} className="relative">
              <div className="sticky top-0 z-10 flex items-center gap-3 border-b border-gray-100 bg-gray-50/90 px-5 py-2 backdrop-blur-md">
                <h2 className="text-xs font-semibold text-gray-500">{group.label}</h2>
                <span className="text-xs tabular-nums text-gray-400">{group.items.length}</span>
              </div>

              <AnimatePresence initial={false} mode="popLayout">
                {group.items.map((notif) => {
                  rowCounter++;
                  const idx = rowCounter;
                  const kind = resolveKind(notif.title, notif.message);
                  const tone = NOTIFICATION_TONES[kind];
                  const { Icon } = tone;
                  const unread = !notif.read_at;
                  const active = idx === activeIndex;

                  return (
                    <motion.div
                      key={notif.id}
                      layout
                      initial={{ opacity: 0, y: -12, scale: 0.98 }}
                      animate={{ opacity: 1, y: 0, scale: 1 }}
                      exit={{ opacity: 0, x: 24, scale: 0.97 }}
                      transition={{ type: "spring", stiffness: 420, damping: 34, opacity: { duration: 0.18 } }}
                      role="button"
                      tabIndex={0}
                      onClick={() => open(notif)}
                      onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); open(notif); } }}
                      className={`group relative flex cursor-pointer gap-4 border-b border-gray-100 px-5 py-4 outline-none transition-colors last:border-0 focus-visible:bg-orange-50/60 ${
                        active ? "bg-orange-50/70" : unread ? "bg-orange-50/25 hover:bg-orange-50/60" : "hover:bg-gray-50/80"
                      }`}
                    >
                      <span className={`absolute inset-y-3 left-0 w-[3px] rounded-r-full transition-opacity ${tone.bar} ${unread ? "opacity-100" : "opacity-0"}`} />

                      <div className={`relative grid h-11 w-11 shrink-0 place-items-center rounded-xl ring-1 transition-transform group-hover:scale-105 ${tone.tile} ${tone.ring} ${unread ? "" : "opacity-70"}`}>
                        <Icon className={`h-5 w-5 ${tone.text}`} />
                      </div>

                      <div className="min-w-0 flex-1">
                        <div className="mb-0.5 flex items-baseline justify-between gap-4">
                          <h3 className={`truncate text-[15px] font-[family-name:var(--font-display)] ${unread ? "font-bold text-gray-900" : "font-semibold text-gray-600"}`}>
                            <Highlight text={notif.title} query={query} />
                          </h3>
                          <time dateTime={notif.created_at} className="shrink-0 text-xs font-medium tabular-nums text-gray-400">
                            {formatDistanceToNow(new Date(notif.created_at), { addSuffix: true })}
                          </time>
                        </div>
                        <p className={`line-clamp-2 text-sm leading-relaxed font-[family-name:var(--font-body)] ${unread ? "text-gray-700" : "text-gray-500"}`}>
                          <Highlight text={notif.message} query={query} />
                        </p>
                      </div>

                      <div className="flex w-16 shrink-0 items-center justify-end gap-1.5">
                        {unread && (
                          <button
                            onClick={(e) => { e.stopPropagation(); markRead(notif.id); }}
                            aria-label="Mark as read"
                            title="Mark as read"
                            className="rounded-full border border-gray-200 bg-white p-1.5 text-gray-400 opacity-0 shadow-sm transition-all hover:border-emerald-200 hover:text-emerald-600 focus-visible:opacity-100 group-hover:opacity-100"
                          >
                            <Check className="h-3.5 w-3.5" />
                          </button>
                        )}

                        <button
                          onClick={(e) => handleDeleteOne(e, notif.id)}
                          aria-label="Delete notification"
                          title="Delete notification"
                          className="rounded-full border border-gray-200 bg-white p-1.5 text-gray-400 opacity-0 shadow-sm transition-all hover:border-red-200 hover:text-red-600 focus-visible:opacity-100 group-hover:opacity-100"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>

                        {unread ? (
                          <span className="h-2.5 w-2.5 rounded-full bg-orange-500 shadow-[0_0_0_4px_rgba(249,115,22,0.15)] group-hover:hidden" />
                        ) : (
                          <ChevronRight className="h-4 w-4 text-gray-300 transition-transform group-hover:translate-x-0.5 group-hover:text-gray-500 group-hover:hidden" />
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
        <p className="flex items-center justify-center gap-3 pt-1 text-xs text-gray-400">
          <span><kbd className="rounded border border-gray-200 bg-white px-1.5 font-mono">j</kbd> <kbd className="rounded border border-gray-200 bg-white px-1.5 font-mono">k</kbd> navigate</span>
          <span><kbd className="rounded border border-gray-200 bg-white px-1.5 font-mono">Enter</kbd> open</span>
          <span><kbd className="rounded border border-gray-200 bg-white px-1.5 font-mono">/</kbd> search</span>
        </p>
      )}

      {/* ── Detail modal ── */}
      <AnimatePresence>
        {selected && (
          <NotificationModal
            key="notification-modal"
            notification={selected}
            onClose={() => setSelectedId(null)}
            onPrev={selectedIndex > 0 ? () => step(-1) : undefined}
            onNext={selectedIndex < navIds.length - 1 ? () => step(1) : undefined}
            position={{ index: selectedIndex, total: navIds.length }}
            // 🟢 Wire up the delete button inside the detail modal
            onDelete={(id) => {
              setSelectedId(null); // Close details first
              setDeleteTarget(id);
              setIsDeleteModalOpen(true);
            }}
          />
        )}
      </AnimatePresence>

      {/* 🟢 Delete Confirmation Modal */}
      <AnimatePresence>
        {isDeleteModalOpen && deleteTarget && (
          <DeleteNotificationModal
            targetType={deleteTarget === "all" ? "all" : "single"}
            onClose={() => {
              if (!isDeleting) setIsDeleteModalOpen(false);
            }}
            onConfirm={executeDelete}
            isDeleting={isDeleting}
          />
        )}
      </AnimatePresence>
    </div>
  );
}