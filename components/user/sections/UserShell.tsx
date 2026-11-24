"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { AnimatePresence, motion } from "framer-motion";
import { Bell, CornerDownLeft, Search } from "lucide-react";
import Lenis from "lenis";
import {
  UserSidebar,
  UserMobileNav,
  NAV,
  FOCUS,
  RAISED,
  RAISED_BTN,
  type UserSession,
} from "../navigation/UserSidebar";
import { useUserNotifications } from "@/hooks/useUserNotifications";
import { toast } from "@/components/ui/toast";
import { UserFooter } from "../navigation/UserFooter"; 

function DotField() {
  const ref = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = ref.current;
    const host = canvas?.parentElement;
    if (!canvas || !host) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    const GAP = 24;
    const RADIUS = 130; // reach of the effect
    const PUSH = 5; // how far dots move (use -5 to pull them toward the cursor instead)

    let w = 0, h = 0, cols = 0, rows = 0;
    let xs = new Float32Array(0);
    let ys = new Float32Array(0);
    let fs = new Float32Array(0);
    let tx = -9999, ty = -9999, mx = -9999, my = -9999;
    let hover = 0, target = 0;
    let raf = 0, running = false;

    const draw = () => {
      mx += (tx - mx) * 0.2;
      my += (ty - my) * 0.2;
      hover += (target - hover) * 0.1;
      ctx.clearRect(0, 0, w, h);

      for (let j = 0; j < rows; j++) {
        for (let i = 0; i < cols; i++) {
          const idx = j * cols + i;
          const bx = i * GAP + GAP / 2;
          const by = j * GAP + GAP / 2;
          let x = bx, y = by, f = 0;
          if (hover > 0.01) {
            const dx = bx - mx;
            const dy = by - my;
            const d = Math.hypot(dx, dy);
            if (d < RADIUS) {
              const k = 1 - d / RADIUS;
              f = k * k * (3 - 2 * k) * hover;
              if (d > 0.01) {
                x += (dx / d) * f * PUSH;
                y += (dy / d) * f * PUSH;
              }
            }
          }
          xs[idx] = x;
          ys[idx] = y;
          fs[idx] = f;
        }
      }

      // fine lattice between lit neighbours
      if (hover > 0.05) {
        ctx.lineWidth = 1;
        for (let j = 0; j < rows; j++) {
          for (let i = 0; i < cols; i++) {
            const idx = j * cols + i;
            const f = fs[idx];
            if (f < 0.1) continue;
            if (i < cols - 1) {
              const m = Math.min(f, fs[idx + 1]);
              if (m > 0.08) {
                ctx.strokeStyle = `rgba(249,115,22,${(m * 0.3).toFixed(3)})`;
                ctx.beginPath();
                ctx.moveTo(xs[idx], ys[idx]);
                ctx.lineTo(xs[idx + 1], ys[idx + 1]);
                ctx.stroke();
              }
            }
            if (j < rows - 1) {
              const m = Math.min(f, fs[idx + cols]);
              if (m > 0.08) {
                ctx.strokeStyle = `rgba(249,115,22,${(m * 0.3).toFixed(3)})`;
                ctx.beginPath();
                ctx.moveTo(xs[idx], ys[idx]);
                ctx.lineTo(xs[idx + cols], ys[idx + cols]);
                ctx.stroke();
              }
            }
          }
        }
      }

      // dots
      for (let idx = 0; idx < xs.length; idx++) {
        const f = fs[idx];
        const r = 253 + (234 - 249) * f + (249 - 253) * 0; // base 249 -> 234
        const g = 115 + (88 - 115) * f;
        const b = 22 + (12 - 22) * f;
        const alpha = 0.28 + f * 0.6;
        ctx.fillStyle = `rgba(${(249 + (234 - 249) * f) | 0},${g | 0},${b | 0},${alpha.toFixed(3)})`;
        ctx.beginPath();
        ctx.arc(xs[idx], ys[idx], 1.5 + f * 2, 0, Math.PI * 2);
        ctx.fill();
      }
    };

    const loop = () => {
      draw();
      if (target === 0 && hover < 0.01) {
        running = false;
        return;
      }
      raf = requestAnimationFrame(loop);
    };
    const start = () => {
      if (running) return;
      running = true;
      raf = requestAnimationFrame(loop);
    };

    const resize = () => {
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      w = host.clientWidth;
      h = host.clientHeight;
      canvas.width = Math.round(w * dpr);
      canvas.height = Math.round(h * dpr);
      canvas.style.width = `${w}px`;
      canvas.style.height = `${h}px`;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      cols = Math.ceil(w / GAP) + 1;
      rows = Math.ceil(h / GAP) + 1;
      xs = new Float32Array(cols * rows);
      ys = new Float32Array(cols * rows);
      fs = new Float32Array(cols * rows);
      draw();
    };

    resize();
    const ro = new ResizeObserver(resize);
    ro.observe(host);

    if (reduce) return () => ro.disconnect();

    const onMove = (e: PointerEvent) => {
      if (e.pointerType !== "mouse") return;
      tx = e.clientX;
      ty = e.clientY;
      if (target === 0) {
        mx = tx;
        my = ty;
      }
      target = 1;
      start();
    };
    const onLeave = () => {
      target = 0;
      start();
    };
    window.addEventListener("pointermove", onMove);
    document.documentElement.addEventListener("pointerleave", onLeave);

    return () => {
      cancelAnimationFrame(raf);
      ro.disconnect();
      window.removeEventListener("pointermove", onMove);
      document.documentElement.removeEventListener("pointerleave", onLeave);
    };
  }, []);

  return <canvas ref={ref} className="absolute inset-0" />;
}

export function UserShell({
  user,
  children,
}: {
  user: UserSession;
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const isBuilder = pathname?.includes("/builder");

  const [collapsed, setCollapsed] = useState(false);
  const [hydrated, setHydrated] = useState(false);
  const [paletteOpen, setPaletteOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const raf = useRef(0);

  // LENIS REFS
  const mainRef = useRef<HTMLElement>(null);
  const contentRef = useRef<HTMLDivElement>(null);

  // INITIALIZE LENIS
  useEffect(() => {
    if (isBuilder || !mainRef.current || !contentRef.current) return;

    const lenis = new Lenis({
      wrapper: mainRef.current,
      content: contentRef.current,
      lerp: 0.09,
      smoothWheel: true,
    });

    let animationFrameId: number;
    function tick(time: number) {
      lenis.raf(time);
      animationFrameId = requestAnimationFrame(tick);
    }
    animationFrameId = requestAnimationFrame(tick);

    return () => {
      cancelAnimationFrame(animationFrameId);
      lenis.destroy();
    };
  }, [isBuilder]);

  useEffect(() => {
    try {
      if (localStorage.getItem("user:sidebar-collapsed") === "true")
        setCollapsed(true);
    } catch {}
    setHydrated(true);
  }, []);

  useEffect(() => {
    if (!hydrated) return;
    try {
      localStorage.setItem("user:sidebar-collapsed", String(collapsed));
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

  if (isBuilder) {
    return (
      <div className="h-[100dvh] w-full overflow-hidden bg-[#f3f4f6]">
        {children}
      </div>
    );
  }

  return (
    <div
      ref={rootRef}
      onPointerMove={onMove}
      className="relative isolate h-[100dvh] w-full overflow-hidden bg-white font-[family-name:var(--font-body)] text-neutral-900"
    >
      <div
        aria-hidden
        className="pointer-events-none fixed inset-0 -z-10 overflow-hidden"
      >
        <div className="absolute inset-0 bg-gradient-to-br from-orange-50 via-white to-orange-50/70" />
        <DotField />
        <div
          className="absolute inset-0"
          style={{
            background:
              "radial-gradient(420px circle at var(--mx,-999px) var(--my,-999px), rgba(249,115,22,0.10), transparent 70%)",
          }}
        />
        <div
          className="absolute -right-32 -top-48 h-[620px] w-[620px] rounded-full blur-3xl"
          style={{
            background:
              "radial-gradient(circle, rgba(249,115,22,0.22), transparent 65%)",
          }}
        />
        <div
          className="absolute -bottom-48 -left-32 h-[560px] w-[560px] rounded-full blur-3xl"
          style={{
            background:
              "radial-gradient(circle, rgba(255,138,76,0.20), transparent 70%)",
          }}
        />
      </div>

      {/* PREVENT LENIS FROM HIJACKING THE SIDEBAR */}
      <div data-lenis-prevent>
        <UserSidebar
          user={user}
          collapsed={collapsed}
          onToggleCollapsed={() => setCollapsed((v) => !v)}
        />
      </div>

      <div
        className={`flex h-full min-w-0 flex-col overflow-hidden transition-[padding] duration-300 ease-out ${collapsed ? "lg:pl-[96px]" : "lg:pl-[284px]"}`}
      >
        <header className="shrink-0 px-2 pt-[max(0.5rem,env(safe-area-inset-top))] sm:px-5 sm:pt-3 lg:px-6">
          <div className="flex h-12 items-center gap-2 rounded-2xl border border-white bg-white/80 px-1.5 backdrop-blur-xl sm:h-14 sm:gap-3 sm:px-3 shadow-[inset_0_1px_0_#fff,0_1px_2px_rgba(15,23,42,0.05),0_14px_30px_-14px_rgba(249,115,22,0.35)]">
            <UserMobileNav user={user} />
            <Crumbs />
            <div className="flex-1" />
            <button
              type="button"
              onClick={() => setPaletteOpen(true)}
              aria-label="Search or jump to"
              className={`flex h-10 w-10 items-center justify-center gap-2 rounded-xl text-sm text-neutral-500 active:scale-95 sm:h-auto sm:w-60 sm:justify-start sm:px-3 sm:py-1.5 ${RAISED_BTN} ${FOCUS}`}
            >
              <Search
                className="h-4 w-4 shrink-0 text-orange-500"
                strokeWidth={1.75}
                aria-hidden
              />
              <span className="hidden flex-1 text-left sm:inline">
                Search or jump to…
              </span>
              <kbd className="hidden rounded-md border border-orange-100 bg-white px-1.5 py-0.5 text-[10px] font-medium text-neutral-400 sm:inline">
                Ctrl K
              </kbd>
            </button>
            <NotificationBell />
          </div>
        </header>

        {/* ATTACH THE REFS HERE & ADD FOOTER */}
        <main
          ref={mainRef}
          className="relative flex-1 overflow-y-auto px-2.5 pt-3 pb-[max(1rem,env(safe-area-inset-bottom))] sm:px-6 sm:py-6 lg:px-8"
        >
          <div ref={contentRef} className="flex min-h-full flex-col">
            {/* flex-1 pushes the footer to the bottom if content is short */}
            <motion.div
              key="content"
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.25, ease: "easeOut" }}
              className="mx-auto w-full max-w-7xl flex-1"
            >
              {children}
            </motion.div>

            <div className="mx-auto w-full max-w-7xl">
              <UserFooter />
            </div>
          </div>
        </main>
      </div>

      <CommandPalette
        open={paletteOpen}
        onClose={() => setPaletteOpen(false)}
      />
    </div>
  );
}

function Crumbs() {
  const pathname = usePathname() ?? "/dashboard";
  const segments = pathname.split("/").filter(Boolean);

  const parts =
    segments[0] === "dashboard" && segments.length > 1
      ? segments.slice(1)
      : segments;

  const cap = (s: string) =>
    s.replace(/[-_]/g, " ").replace(/^\w/, (c) => c.toUpperCase());

  const last =
    parts.length === 0 || (parts.length === 1 && parts[0] === "dashboard")
      ? "Overview"
      : cap(parts[parts.length - 1]);
  const before = parts.slice(0, -1);

  return (
    <div className="flex min-w-0 items-center gap-1.5 pl-1 text-sm">
      {before.map((p, i) => (
        <span
          key={`${p}-${i}`}
          className="hidden items-center gap-1.5 text-neutral-400 sm:flex"
        >
          {cap(p)}
          <span aria-hidden className="text-orange-300">
            /
          </span>
        </span>
      ))}
      <span className="truncate font-semibold text-neutral-900 font-[family-name:var(--font-display)]">
        {last}
      </span>
    </div>
  );
}

function CommandPalette({
  open,
  onClose,
}: {
  open: boolean;
  onClose: () => void;
}) {
  const router = useRouter();
  const [q, setQ] = useState("");
  const [idx, setIdx] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);

  const items = NAV.flatMap((g) =>
    g.items.map((i) => ({ ...i, group: g.label })),
  );
  const results = items.filter((i) =>
    `${i.label} ${i.group}`.toLowerCase().includes(q.trim().toLowerCase()),
  );

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
                className="h-14 flex-1 bg-transparent text-base text-neutral-900 outline-none placeholder:text-neutral-400 sm:text-sm"
              />
              <kbd className="rounded-md border border-orange-100 bg-white px-1.5 py-0.5 text-[10px] text-neutral-400">
                Esc
              </kbd>
            </div>
            {/* PREVENT LENIS FROM HIJACKING THE PALETTE SCROLL */}
            <ul
              data-lenis-prevent
              className="scroll-ember max-h-[50vh] overflow-y-auto p-2"
            >
              {results.length === 0 && (
                <li className="px-3 py-8 text-center text-sm text-neutral-500">
                  No pages match “{q}”.
                </li>
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
                      className={`flex min-h-[44px] w-full items-center gap-3 rounded-xl px-2 py-2 text-left text-sm transition-colors ${
                        on
                          ? "border border-orange-200/80 bg-gradient-to-b from-white to-orange-100/70 text-orange-700 shadow-[inset_0_1px_0_#fff,0_8px_16px_-8px_rgba(249,115,22,0.5)]"
                          : "border border-transparent text-neutral-700"
                      }`}
                    >
                      <span
                        className={`flex h-7 w-7 items-center justify-center rounded-lg ${on ? "bg-gradient-to-b from-orange-400 to-orange-600 text-white" : "border border-orange-100/70 bg-white text-neutral-400"}`}
                      >
                        <Icon
                          className="h-4 w-4"
                          strokeWidth={1.75}
                          aria-hidden
                        />
                      </span>
                      <span className="flex-1 font-medium">{r.label}</span>
                      <span className="text-xs text-neutral-400">
                        {r.group}
                      </span>
                      {on && (
                        <CornerDownLeft
                          className="h-3.5 w-3.5 text-orange-500"
                          aria-hidden
                        />
                      )}
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
  const { unreadCount, latestNotification } = useUserNotifications();

  useEffect(() => {
    if (latestNotification) {
      toast.add({
        title: latestNotification.title,
        description: latestNotification.message,
        type: "info",
      });
    }
  }, [latestNotification]);

  return (
    <Link
      href="/dashboard/notifications"
      aria-label="Notifications"
      className={`relative flex h-10 w-10 items-center justify-center rounded-xl text-neutral-600 hover:text-orange-600 active:scale-95 sm:h-auto sm:w-auto sm:p-2 ${RAISED_BTN} ${FOCUS}`}
    >
      <Bell className="h-5 w-5" strokeWidth={1.75} aria-hidden />
      {unreadCount > 0 && (
        <span className="absolute -right-1.5 -top-1.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-orange-500 px-1 text-[10px] font-bold text-white ring-2 ring-white animate-in zoom-in">
          {unreadCount > 99 ? "99+" : unreadCount}
        </span>
      )}
    </Link>
  );
}