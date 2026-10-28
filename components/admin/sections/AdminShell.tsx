"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { AnimatePresence, motion } from "framer-motion";
import { Bell, CornerDownLeft, Search } from "lucide-react";
import {
  AdminSidebar,
  AdminMobileNav,
  NAV,
  FOCUS,
  RAISED,
  RAISED_BTN,
  type AdminSession,
} from "../navigation/AdminSidebar";
import { useAdminNotifications } from "@/hooks/useAdminNotifications";

export function AdminShell({ admin, children }: { admin: AdminSession; children: React.ReactNode }) {
  const [collapsed, setCollapsed] = useState(false);
  const [hydrated, setHydrated] = useState(false);
  const [paletteOpen, setPaletteOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const raf = useRef(0);

  useEffect(() => {
    try {
      if (localStorage.getItem("admin:sidebar-collapsed") === "true") setCollapsed(true);
    } catch {}
    setHydrated(true);
  }, []);

  useEffect(() => {
    if (!hydrated) return;
    try {
      localStorage.setItem("admin:sidebar-collapsed", String(collapsed));
    } catch {}
  }, [collapsed, hydrated]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setPaletteOpen((v) => !v);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  const onMove = useCallback((e: React.PointerEvent) => {
    if (e.pointerType === "touch") return;
    const { clientX: x, clientY: y } = e;
    cancelAnimationFrame(raf.current);
    raf.current = requestAnimationFrame(() => {
      rootRef.current?.style.setProperty("--mx", `${x}px`);
      rootRef.current?.style.setProperty("--my", `${y}px`);
    });
  }, []);

  const mask = "radial-gradient(230px circle at var(--mx,-999px) var(--my,-999px), #000 0%, transparent 100%)";

  return (
    <div
      ref={rootRef}
      onPointerMove={onMove}
      className="relative isolate h-[100dvh] w-full overflow-hidden bg-white font-[family-name:var(--font-body)] text-neutral-900"
    >
      <div aria-hidden className="pointer-events-none fixed inset-0 -z-10 overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-orange-50 via-white to-orange-50/70" />
        <div className="absolute inset-0" style={{ backgroundImage: "radial-gradient(circle, rgba(249,115,22,0.28) 1.5px, transparent 1.5px)", backgroundSize: "24px 24px" }} />
        <div className="absolute inset-0" style={{ backgroundImage: "radial-gradient(circle, rgba(234,88,12,0.95) 2px, transparent 2px)", backgroundSize: "24px 24px", maskImage: mask, WebkitMaskImage: mask }} />
        <div className="absolute inset-0" style={{ background: "radial-gradient(420px circle at var(--mx,-999px) var(--my,-999px), rgba(249,115,22,0.10), transparent 70%)" }} />
        <div className="absolute -right-32 -top-48 h-[620px] w-[620px] rounded-full blur-3xl" style={{ background: "radial-gradient(circle, rgba(249,115,22,0.22), transparent 65%)" }} />
        <div className="absolute -bottom-48 -left-32 h-[560px] w-[560px] rounded-full blur-3xl" style={{ background: "radial-gradient(circle, rgba(255,138,76,0.20), transparent 70%)" }} />
      </div>

      <AdminSidebar 
        admin={admin} 
        collapsed={collapsed} 
        onToggleCollapsed={() => setCollapsed((v) => !v)} 
      />

      <div className={`flex h-full min-w-0 flex-col overflow-hidden transition-[padding] duration-300 ease-out ${collapsed ? "lg:pl-[96px]" : "lg:pl-[284px]"}`}>
        <header className="shrink-0 px-2 pt-2 sm:px-5 sm:pt-3 lg:px-6">
          <div className="flex h-14 items-center gap-2 rounded-2xl border border-white bg-white/80 px-2 backdrop-blur-xl sm:gap-3 sm:px-3 shadow-[inset_0_1px_0_#fff,0_1px_2px_rgba(15,23,42,0.05),0_14px_30px_-14px_rgba(249,115,22,0.35)]">
            <AdminMobileNav admin={admin} />
            <Crumbs />
            <div className="flex-1" />
            <button
              type="button"
              onClick={() => setPaletteOpen(true)}
              aria-label="Search or jump to"
              className={`flex items-center gap-2 rounded-xl p-2 text-sm text-neutral-500 sm:w-60 sm:px-3 sm:py-1.5 ${RAISED_BTN} ${FOCUS}`}
            >
              <Search className="h-4 w-4 shrink-0 text-orange-500" strokeWidth={1.75} aria-hidden />
              <span className="hidden flex-1 text-left sm:inline">Search or jump to…</span>
              <kbd className="hidden rounded-md border border-orange-100 bg-white px-1.5 py-0.5 text-[10px] font-medium text-neutral-400 sm:inline">Ctrl K</kbd>
            </button>
            <NotificationBell />
          </div>
        </header>

        <main className="relative flex-1 overflow-y-auto px-3 py-5 sm:px-6 sm:py-6 lg:px-8">
          <motion.div
            key="content"
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.25, ease: "easeOut" }}
            className="mx-auto max-w-7xl"
          >
            {children}
          </motion.div>
        </main>
      </div>

      <CommandPalette open={paletteOpen} onClose={() => setPaletteOpen(false)} />
    </div>
  );
}

function Crumbs() {
  const pathname = usePathname();
  const parts = pathname
    .replace(/^\/admin\/?/, "")
    .split("/")
    .filter(Boolean)
    .filter((p, i) => !(i === 0 && p === "dashboard" && pathname.split("/").length > 3));
  const cap = (s: string) => s.replace(/[-_]/g, " ").replace(/^\w/, (c) => c.toUpperCase());
  const last = parts[parts.length - 1] ?? "dashboard";
  const before = parts.slice(0, -1);

  return (
    <div className="flex min-w-0 items-center gap-1.5 pl-1 text-sm">
      {before.map((p) => (
        <span key={p} className="hidden items-center gap-1.5 text-neutral-400 sm:flex">
          {cap(p)}
          <span aria-hidden className="text-orange-300">/</span>
        </span>
      ))}
      <span className="truncate font-semibold text-neutral-900 font-[family-name:var(--font-display)]">
        {cap(last)}
      </span>
    </div>
  );
}

function CommandPalette({ open, onClose }: { open: boolean; onClose: () => void }) {
  const router = useRouter();
  const [q, setQ] = useState("");
  const [idx, setIdx] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);

  const items = NAV.flatMap((g) => g.items.map((i) => ({ ...i, group: g.label })));
  const results = items.filter((i) => `${i.label} ${i.group}`.toLowerCase().includes(q.trim().toLowerCase()));

  useEffect(() => {
    if (!open) return;
    setQ("");
    setIdx(0);
    const t = setTimeout(() => inputRef.current?.focus(), 40);
    return () => clearTimeout(t);
  }, [open]);

  useEffect(() => setIdx(0), [q]);

  function go(href: string) {
    onClose();
    router.push(href);
  }

  function onKeyDown(e: React.KeyboardEvent) {
    if (e.key === "Escape") onClose();
    else if (e.key === "ArrowDown") {
      e.preventDefault();
      setIdx((i) => Math.min(i + 1, Math.max(results.length - 1, 0)));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setIdx((i) => Math.max(i - 1, 0));
    } else if (e.key === "Enter" && results[idx]) go(results[idx].href);
  }

  return (
    <AnimatePresence>
      {open && (
        <div className="fixed inset-0 z-[60] flex items-start justify-center px-3 pt-[12vh]">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="absolute inset-0 bg-orange-950/25 backdrop-blur-sm"
          />
          <motion.div
            role="dialog"
            aria-modal="true"
            aria-label="Search or jump to"
            initial={{ opacity: 0, y: -12, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -8, scale: 0.98 }}
            transition={{ type: "spring", damping: 28, stiffness: 380 }}
            className={`relative w-full max-w-lg overflow-hidden rounded-3xl ${RAISED} shadow-[0_40px_80px_-30px_rgba(249,115,22,0.55)]`}
          >
            <div className="flex items-center gap-3 border-b border-orange-100 px-4">
              <Search className="h-4 w-4 text-orange-500" aria-hidden />
              <input
                ref={inputRef}
                value={q}
                onChange={(e) => setQ(e.target.value)}
                onKeyDown={onKeyDown}
                placeholder="Jump to a page…"
                className="h-14 flex-1 bg-transparent text-sm text-neutral-900 outline-none placeholder:text-neutral-400"
              />
              <kbd className="rounded-md border border-orange-100 bg-white px-1.5 py-0.5 text-[10px] text-neutral-400">Esc</kbd>
            </div>
            <ul className="scroll-ember max-h-[50vh] overflow-y-auto p-2">
              {results.length === 0 && (
                <li className="px-3 py-8 text-center text-sm text-neutral-500">No pages match “{q}”.</li>
              )}
              {results.map((r, i) => {
                const Icon = r.icon;
                const on = i === idx;
                return (
                  <li key={r.href}>
                    <button
                      type="button"
                      onMouseEnter={() => setIdx(i)}
                      onClick={() => go(r.href)}
                      className={`flex w-full items-center gap-3 rounded-xl px-2 py-2 text-left text-sm transition-colors ${
                        on
                          ? "border border-orange-200/80 bg-gradient-to-b from-white to-orange-100/70 text-orange-700 shadow-[inset_0_1px_0_#fff,0_8px_16px_-8px_rgba(249,115,22,0.5)]"
                          : "border border-transparent text-neutral-700"
                      }`}
                    >
                      <span className={`flex h-7 w-7 items-center justify-center rounded-lg ${on ? "bg-gradient-to-b from-orange-400 to-orange-600 text-white" : "border border-orange-100/70 bg-white text-neutral-400"}`}>
                        <Icon className="h-4 w-4" strokeWidth={1.75} aria-hidden />
                      </span>
                      <span className="flex-1 font-medium">{r.label}</span>
                      <span className="text-xs text-neutral-400">{r.group}</span>
                      {on && <CornerDownLeft className="h-3.5 w-3.5 text-orange-500" aria-hidden />}
                    </button>
                  </li>
                );
              })}
            </ul>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}

function NotificationBell() {
  const { unreadCount } = useAdminNotifications();

  return (
    <Link
      href="/admin/dashboard/notifications"
      aria-label="Notifications"
      className={`relative rounded-xl p-2 text-neutral-600 hover:text-orange-600 ${RAISED_BTN} ${FOCUS}`}
    >
      <Bell className="h-5 w-5" strokeWidth={1.75} aria-hidden />
      {unreadCount > 0 && (
        <span className="absolute -right-1.5 -top-1.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-orange-500 px-1 text-[10px] font-bold text-white ring-2 ring-white">
          {unreadCount > 99 ? "99+" : unreadCount}
        </span>
      )}
    </Link>
  );
}