"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import {
  Bell,
  BrainCircuit,
  ChevronLeft,
  CreditCard,
  FlaskConical,
  LayoutDashboard,
  LayoutTemplate,
  Loader2,
  LogOut,
  Mail,
  Menu,
  MonitorSmartphone,
  Settings,
  ShieldOff,
  Users,
  X,
  type LucideIcon,
} from "lucide-react";
import Image from "next/image";
import { createPortal } from "react-dom";
import { apiClient } from "@/lib/api/api_base";

export type UserSession = {
  id: string;
  email: string;
  first_name: string;
};

type NavItem = { label: string; href: string; icon: LucideIcon; tip: string };
type NavGroup = { label: string; items: NavItem[] };

export const NAV: NavGroup[] = [
  {
    label: "Workspace",
    items: [
      {
        label: "Overview",
        href: "/dashboard",
        icon: LayoutDashboard,
        tip: "Stats and recent activity",
      },
      {
        label: "AI Studio",
        href: "/dashboard/ai-studio",
        icon: BrainCircuit,
        tip: "Create invites using AI",
      },
      {
        label: "Rehearsal Sandbox",
        href: "/dashboard/rehearsal",
        icon: FlaskConical,
        tip: "Practice before going live",
      },
      {
        label: "My Library",
        href: "/dashboard/library",
        icon: LayoutTemplate,
        tip: "Saved designs and templates",
      },
    ],
  },
  {
    label: "My Events",
    items: [
      {
        label: "My Invitations",
        href: "/dashboard/invitations",
        icon: Mail,
        tip: "Manage your invitations",
      },
      {
        label: "RSVPs",
        href: "/dashboard/rsvps",
        icon: Users,
        tip: "See guest responses",
      },
    ],
  },
  {
    label: "Account",
    items: [
      {
        label: "Billing & Plan",
        href: "/dashboard/billing",
        icon: CreditCard,
        tip: "Plan, invoices, payments",
      },
      {
        label: "Notifications",
        href: "/dashboard/notifications",
        icon: Bell,
        tip: "Alerts and updates",
      },
      {
        label: "Settings",
        href: "/dashboard/settings",
        icon: Settings,
        tip: "Profile and security",
      },
    ],
  },
];

export const FOCUS =
  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-400 focus-visible:ring-offset-2";

export const RAISED =
  "bg-gradient-to-b from-white via-white to-orange-50/60 border border-orange-100/70 " +
  "shadow-[inset_0_1px_0_rgba(255,255,255,1),0_1px_2px_rgba(15,23,42,0.05),0_8px_20px_-8px_rgba(249,115,22,0.28)]";

export const RAISED_BTN =
  "bg-gradient-to-b from-white to-orange-50 border border-orange-100 " +
  "shadow-[inset_0_1px_0_#fff,0_1px_2px_rgba(15,23,42,0.06),0_4px_10px_-4px_rgba(249,115,22,0.3)] " +
  "transition-all duration-200 hover:-translate-y-px active:translate-y-0";

const ORB_ON =
  "bg-gradient-to-b from-orange-400 to-orange-600 text-white " +
  "shadow-[inset_0_1px_0_rgba(255,255,255,0.5),0_6px_12px_-4px_rgba(249,115,22,0.75)]";

function isActive(pathname: string | null, href: string) {
  if (!pathname) return false;
  if (href === "/dashboard") return pathname === href;
  return pathname === href || pathname.startsWith(`${href}/`);
}

function trackPointer(e: React.PointerEvent<HTMLElement>) {
  const r = e.currentTarget.getBoundingClientRect();
  e.currentTarget.style.setProperty("--x", `${e.clientX - r.left}px`);
  e.currentTarget.style.setProperty("--y", `${e.clientY - r.top}px`);
}

/* ========================================================================== */
/*  Tip: hover / focus label for any button or link                           */
/*  Lives here so both the sidebar and the dashboard can import it without    */
/*  a circular dependency.                                                    */
/* ========================================================================== */

export type TipSide = "top" | "bottom" | "left" | "right";

const TIP_ORIGIN: Record<TipSide, string> = {
  top: "translate(-50%, -100%)",
  bottom: "translate(-50%, 0)",
  left: "translate(-100%, -50%)",
  right: "translate(0, -50%)",
};
const TIP_NUDGE = {
  top: { y: 4 },
  bottom: { y: -4 },
  left: { x: 4 },
  right: { x: -4 },
} as const;

/** Wraps a single button/link. Shows a label on hover (mouse only) and on keyboard focus. */
export function Tip({
  label,
  hint,
  side = "top",
  disabled = false,
  children,
}: {
  label: string;
  hint?: string;
  side?: TipSide;
  /** When true the tip never shows. */
  disabled?: boolean;
  children: React.ReactNode;
}) {
  const wrap = useRef<HTMLSpanElement>(null);
  const timer = useRef<number | undefined>(undefined);
  const [pos, setPos] = useState<{ x: number; y: number } | null>(null);
  const [mounted, setMounted] = useState(false);

  useEffect(() => setMounted(true), []);
  useEffect(() => () => window.clearTimeout(timer.current), []);

  // close immediately if the tip gets disabled while open
  useEffect(() => {
    if (disabled) {
      window.clearTimeout(timer.current);
      setPos(null);
    }
  }, [disabled]);

  // hide on scroll so it never floats away from its button
  useEffect(() => {
    if (!pos) return;
    const off = () => setPos(null);
    window.addEventListener("scroll", off, true);
    return () => window.removeEventListener("scroll", off, true);
  }, [pos]);

  const show = (delay: number) => {
    if (disabled) return;
    window.clearTimeout(timer.current);
    timer.current = window.setTimeout(() => {
      const el = wrap.current?.firstElementChild as HTMLElement | null;
      if (!el) return;
      const r = el.getBoundingClientRect();
      const g = 10;
      setPos(
        side === "top"
          ? { x: r.left + r.width / 2, y: r.top - g }
          : side === "bottom"
            ? { x: r.left + r.width / 2, y: r.bottom + g }
            : side === "left"
              ? { x: r.left - g, y: r.top + r.height / 2 }
              : { x: r.right + g, y: r.top + r.height / 2 },
      );
    }, delay);
  };
  const hide = () => {
    window.clearTimeout(timer.current);
    setPos(null);
  };

  return (
    <>
      {/* display:contents keeps the child's layout untouched */}
      <span
        ref={wrap}
        className="contents"
        onPointerEnter={(e) => e.pointerType === "mouse" && show(350)}
        onPointerLeave={hide}
        onPointerDown={hide}
        onFocus={(e) =>
          (e.target as HTMLElement).matches(":focus-visible") && show(0)
        }
        onBlur={hide}
      >
        {children}
      </span>
      {mounted &&
        createPortal(
          <AnimatePresence>
            {pos && !disabled && (
              <div
                role="tooltip"
                className="pointer-events-none fixed z-[300]"
                style={{ left: pos.x, top: pos.y, transform: TIP_ORIGIN[side] }}
              >
                <motion.div
                  initial={{ opacity: 0, ...TIP_NUDGE[side] }}
                  animate={{ opacity: 1, x: 0, y: 0 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.12, ease: "easeOut" }}
                  className="flex items-center gap-2 whitespace-nowrap rounded-md bg-[#1c1410] px-2.5 py-1.5 text-xs font-medium text-orange-50 shadow-[0_4px_14px_rgba(28,20,16,0.25)] ring-1 ring-white/10"
                >
                  {label}
                  {hint && (
                    <kbd className="rounded border border-white/20 px-1 font-mono text-[10px] text-stone-300">
                      {hint}
                    </kbd>
                  )}
                </motion.div>
              </div>
            )}
          </AnimatePresence>,
          document.body,
        )}
    </>
  );
}

function Panel({ children }: { children: React.ReactNode }) {
  return (
    <div className="relative flex h-full flex-col rounded-3xl border border-white bg-gradient-to-b from-white via-white to-orange-50/70 shadow-[inset_0_1px_0_#fff,0_1px_2px_rgba(15,23,42,0.05),0_28px_56px_-24px_rgba(249,115,22,0.45)]">
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 overflow-hidden rounded-3xl"
      >
        <div className="absolute inset-0 bg-[linear-gradient(160deg,rgba(255,255,255,0.95)_0%,rgba(255,255,255,0)_38%)]" />
        <div className="absolute -bottom-24 -left-12 h-60 w-60 rounded-full bg-orange-300/30 blur-3xl" />
        <div
          className="absolute inset-0 opacity-60"
          style={{
            backgroundImage:
              "radial-gradient(circle, rgba(249,115,22,0.18) 1px, transparent 1px)",
            backgroundSize: "18px 18px",
            maskImage: "linear-gradient(to top, black, transparent 45%)",
            WebkitMaskImage: "linear-gradient(to top, black, transparent 45%)",
          }}
        />
      </div>
      <div className="relative z-10 flex h-full min-h-0 flex-col">
        {children}
      </div>
    </div>
  );
}

type LogoutState = { open: boolean; allDevices: boolean };

function useLogout() {
  const router = useRouter();
  const [state, setState] = useState<LogoutState>({
    open: false,
    allDevices: false,
  });
  const [isLoggingOut, setIsLoggingOut] = useState(false);

  const request = (allDevices: boolean) => setState({ open: true, allDevices });
  const close = () => setState({ open: false, allDevices: false });

  const confirm = async () => {
    setIsLoggingOut(true);
    try {
      await apiClient.post(
        `/user/auth/logout${state.allDevices ? "?all=true" : ""}`,
      );
    } catch {
      /* ignore */
    } finally {
      router.replace("/login");
      router.refresh();
    }
  };

  return { state, isLoggingOut, request, close, confirm };
}

function LogoutModal({
  state,
  isLoggingOut,
  onClose,
  onConfirm,
}: {
  state: LogoutState;
  isLoggingOut: boolean;
  onClose: () => void;
  onConfirm: () => void;
}) {
  return (
    <AnimatePresence>
      {state.open && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center px-4 pb-[env(safe-area-inset-bottom)]">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => !isLoggingOut && onClose()}
            className="absolute inset-0 bg-orange-950/25 backdrop-blur-sm"
          />
          <motion.div
            role="alertdialog"
            aria-modal="true"
            initial={{ opacity: 0, scale: 0.95, y: 10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 10 }}
            transition={{ type: "spring", damping: 28, stiffness: 380 }}
            className="relative w-full max-w-sm rounded-3xl border border-white bg-white/90 p-6 shadow-[0_28px_56px_-24px_rgba(249,115,22,0.45)] backdrop-blur-xl"
          >
            <div className="mb-4 flex size-12 items-center justify-center rounded-2xl bg-rose-100 text-rose-600">
              <ShieldOff className="size-6" />
            </div>
            <h2 className="font-[family-name:var(--font-display)] text-lg font-semibold text-neutral-900">
              {state.allDevices ? "Sign out from all devices?" : "Sign out?"}
            </h2>
            <p className="mt-1 text-sm text-neutral-500">
              {state.allDevices
                ? "This will end all active sessions across all your devices. You will need to log in again."
                : "Are you sure you want to sign out of your account?"}
            </p>
            <div className="mt-6 flex gap-3">
              <button
                onClick={onClose}
                disabled={isLoggingOut}
                className="flex-1 cursor-pointer rounded-xl border border-neutral-200 bg-white px-4 py-3 text-sm font-medium text-neutral-700 transition-all hover:bg-neutral-50 active:scale-[0.98] disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                onClick={onConfirm}
                disabled={isLoggingOut}
                className="flex cursor-pointer flex-1 items-center justify-center gap-2 rounded-xl bg-rose-600 px-4 py-3 text-sm font-semibold text-white shadow-lg shadow-rose-500/30 transition-all hover:bg-rose-500 active:scale-[0.98] disabled:opacity-70"
              >
                {isLoggingOut ? (
                  <Loader2 className="size-4 animate-spin" />
                ) : (
                  "Sign out"
                )}
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}

function SidebarBody({
  user,
  collapsed,
  layoutId,
  touch = false,
  onToggleCollapsed,
  onLogoutRequest,
}: {
  user: UserSession;
  collapsed: boolean;
  layoutId: string;
  touch?: boolean;
  onToggleCollapsed?: () => void;
  onLogoutRequest: (allDevices: boolean) => void;
}) {
  const pathname = usePathname();

  const displayName = user.first_name || user.email.split("@")[0] || "Member";
  const initial = displayName.charAt(0).toUpperCase();

  return (
    <>
      <div
        className={`relative flex h-[60px] shrink-0 items-center ${
          collapsed ? "justify-center px-3" : "gap-3 px-5"
        }`}
      >
        <div className="relative shrink-0">
          <div
            aria-hidden
            className="absolute inset-0 rounded-xl bg-orange-400/50 blur-md"
          />
          <div className="relative flex h-9 w-9 items-center justify-center overflow-hidden rounded-xl border border-orange-100 bg-gradient-to-b from-white to-orange-50 shadow-[inset_0_1px_0_#fff,0_8px_16px_-6px_rgba(249,115,22,0.6)]">
            <Image
              src="/logo.png"
              alt="Riwainvite"
              width={28}
              height={28}
              loading="eager"
              className="object-contain"
            />
          </div>
        </div>
        {!collapsed && (
          <div className="flex min-w-0 flex-col leading-tight">
            <span className="truncate text-[15px] font-semibold tracking-tight text-neutral-900 font-[family-name:var(--font-display)]">
              Riwainvite
            </span>
            <span className="text-[10px] font-semibold uppercase tracking-[0.18em] text-orange-500">
              Member
            </span>
          </div>
        )}

        {onToggleCollapsed && (
          <Tip
            label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
            side="right"
          >
            <button
              type="button"
              onClick={onToggleCollapsed}
              aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
              className={`absolute right-0 top-1/2 flex h-6 w-6 -translate-y-1/2 translate-x-1/2 items-center justify-center rounded-full text-neutral-500 hover:text-orange-600 ${RAISED_BTN} ${FOCUS} z-50`}
            >
              <ChevronLeft
                aria-hidden="true"
                className={`h-3.5 w-3.5 transition-transform duration-300 ${collapsed ? "rotate-180" : ""}`}
              />
            </button>
          </Tip>
        )}
      </div>

      <div
        aria-hidden
        className="mx-4 h-px shrink-0 bg-gradient-to-r from-transparent via-orange-200 to-transparent"
      />

      <div className="relative flex-1 min-h-0 flex flex-col">
        <nav
          role="navigation"
          aria-label="Dashboard"
          style={{
            scrollbarWidth: "thin",
            scrollbarColor: "#fb923c transparent",
          }}
          className={`flex-1 min-h-0 overflow-y-auto overflow-x-hidden overscroll-contain px-2 ${touch ? "py-3" : "py-2"}
            [&::-webkit-scrollbar]:w-1.5 
            [&::-webkit-scrollbar-track]:bg-transparent 
            [&::-webkit-scrollbar-thumb]:bg-orange-400/50 hover:[&::-webkit-scrollbar-thumb]:bg-orange-400
            [&::-webkit-scrollbar-thumb]:rounded-full 
            [&::-webkit-scrollbar-button]:hidden`}
        >
          {NAV.map((group, i) => (
            <motion.div
              key={group.label}
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.05 * i, duration: 0.25 }}
              className={`relative ${touch ? "mb-3" : "mb-2"}`}
            >
              {collapsed ? (
                i > 0 && (
                  <div
                    aria-hidden="true"
                    className="mx-2 mb-2 h-px bg-orange-100"
                  />
                )
              ) : (
                <p className="mb-1 flex items-center gap-2 px-2.5 text-[10px] font-semibold uppercase tracking-[0.14em] text-neutral-400">
                  {group.label}
                  <span
                    aria-hidden
                    className="h-px flex-1 bg-gradient-to-r from-orange-100 to-transparent"
                  />
                </p>
              )}
              <ul className={`flex flex-col ${touch ? "gap-1" : "gap-0.5"}`}>
                {group.items.map((item) => {
                  const active = isActive(pathname, item.href);
                  const Icon = item.icon;
                  return (
                    <li key={item.href} className="relative">
                      <Tip
                        label={
                          collapsed ? `${item.label} · ${item.tip}` : item.tip
                        }
                        side="right"
                      >
                        <Link
                          href={item.href}
                          aria-current={active ? "page" : undefined}
                          aria-label={collapsed ? item.label : undefined}
                          onPointerMove={trackPointer}
                          className={`group relative flex items-center rounded-lg font-medium transition-colors ${FOCUS} ${
                            touch
                              ? "min-h-[48px] gap-3 py-2 pl-2 pr-3 text-[15px] active:scale-[0.98]"
                              : "gap-2.5 py-1.5 pl-1.5 pr-2.5 text-[13px]"
                          } ${collapsed ? "justify-center" : ""} ${
                            active
                              ? "text-orange-700"
                              : "text-neutral-600 hover:text-neutral-900"
                          }`}
                        >
                          <span
                            aria-hidden
                            className="pointer-events-none absolute inset-0 rounded-lg opacity-0 transition-opacity duration-200 group-hover:opacity-100"
                            style={{
                              background:
                                "radial-gradient(110px circle at var(--x,50%) var(--y,50%), rgba(249,115,22,0.20), transparent 70%)",
                            }}
                          />
                          <AnimatePresence>
                            {active && (
                              <motion.div
                                layoutId={layoutId}
                                className="absolute inset-0 rounded-lg border border-orange-200/80 bg-gradient-to-b from-white to-orange-100/70 shadow-[inset_0_1px_0_#fff,0_1px_2px_rgba(15,23,42,0.05),0_10px_20px_-8px_rgba(249,115,22,0.5)]"
                                transition={{
                                  type: "spring",
                                  damping: 30,
                                  stiffness: 400,
                                }}
                              >
                                <span
                                  aria-hidden
                                  className="absolute -left-[3px] top-1/2 h-4 w-[3px] -translate-y-1/2 rounded-full bg-orange-500 shadow-[0_0_10px_rgba(249,115,22,0.9)]"
                                />
                              </motion.div>
                            )}
                          </AnimatePresence>
                          <span
                            className={`relative flex shrink-0 items-center justify-center rounded-md transition-all duration-200 ${
                              touch ? "h-8 w-8" : "h-6 w-6"
                            } ${
                              active
                                ? ORB_ON
                                : "border border-orange-100/70 bg-white/70 text-neutral-400 group-hover:-translate-y-px group-hover:text-orange-500 group-hover:shadow-[0_6px_10px_-4px_rgba(249,115,22,0.4)]"
                            }`}
                          >
                            <Icon
                              aria-hidden="true"
                              strokeWidth={1.75}
                              className={touch ? "h-4 w-4" : "h-3.5 w-3.5"}
                            />
                          </span>
                          {!collapsed && (
                            <span className="relative truncate">
                              {item.label}
                            </span>
                          )}
                        </Link>
                      </Tip>
                    </li>
                  );
                })}
              </ul>
            </motion.div>
          ))}
        </nav>
      </div>

      <div
        className={`shrink-0 p-2 relative z-20 ${touch ? "pb-[max(0.5rem,env(safe-area-inset-bottom))]" : ""}`}
      >
        <div className="flex flex-col gap-1 rounded-xl border border-orange-100/70 bg-white/60 p-2 shadow-sm backdrop-blur-sm">
          <div className="flex items-center gap-2.5">
            <div className="relative shrink-0">
              <Tip
                label={`${displayName} · ${user.email}`}
                side="right"
                disabled={!collapsed}
              >
                <div
                  aria-hidden={!collapsed}
                  aria-label={
                    collapsed ? `${displayName} · ${user.email}` : undefined
                  }
                  className={`flex h-8 w-8 items-center justify-center rounded-full text-xs font-semibold ${ORB_ON}`}
                >
                  {initial}
                </div>
              </Tip>
              <span
                aria-hidden
                className="absolute -bottom-0.5 -right-0.5 flex h-2.5 w-2.5"
              >
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400/70 motion-reduce:animate-none" />
                <span className="relative inline-flex h-2.5 w-2.5 rounded-full border-[1.5px] border-white bg-emerald-500" />
              </span>
            </div>
            {!collapsed && (
              <div className="flex min-w-0 flex-col leading-tight">
                <span className="truncate text-[13px] font-semibold text-neutral-900">
                  Welcome, {displayName}
                </span>
                <span className="truncate text-[10px] text-neutral-500">
                  {user.email}
                </span>
              </div>
            )}
          </div>

          {!collapsed && (
            <div className="mt-1 flex flex-col gap-0.5 border-t border-orange-100/50 pt-1">
              <Tip label="End this session" side="right">
                <button
                  onClick={() => onLogoutRequest(false)}
                  className={`flex w-full items-center gap-2 rounded-md px-2 font-semibold text-rose-600 transition-colors hover:bg-rose-50 active:bg-rose-50 ${
                    touch ? "min-h-[44px] text-[13px]" : "py-1.5 text-[11px]"
                  }`}
                >
                  <LogOut className="size-3.5" />
                  Sign out
                </button>
              </Tip>
              <Tip label="Log out every device" side="right">
                <button
                  onClick={() => onLogoutRequest(true)}
                  className={`flex w-full items-center gap-2 rounded-md px-2 text-neutral-500 transition-colors hover:bg-neutral-100 hover:text-neutral-800 active:bg-neutral-100 ${
                    touch ? "min-h-[44px] text-xs" : "py-1.5 text-[10px]"
                  }`}
                >
                  <MonitorSmartphone className="size-3.5" />
                  Sign out from all devices
                </button>
              </Tip>
            </div>
          )}
        </div>
      </div>
    </>
  );
}

export function UserSidebar({
  user,
  collapsed,
  onToggleCollapsed,
}: {
  user: UserSession;
  collapsed: boolean;
  onToggleCollapsed: () => void;
}) {
  const logout = useLogout();

  return (
    <>
      <aside
        className={`fixed top-3 bottom-3 left-3 z-40 hidden transition-[width] duration-300 ease-out lg:block ${
          collapsed ? "w-[72px]" : "w-[260px]"
        }`}
      >
        <Panel>
          <SidebarBody
            user={user}
            collapsed={collapsed}
            layoutId="active-nav"
            onToggleCollapsed={onToggleCollapsed}
            onLogoutRequest={logout.request}
          />
        </Panel>
      </aside>

      <LogoutModal
        state={logout.state}
        isLoggingOut={logout.isLoggingOut}
        onClose={logout.close}
        onConfirm={logout.confirm}
      />
    </>
  );
}

export function UserMobileNav({ user }: { user: UserSession }) {
  const [open, setOpen] = useState(false);
  const [mounted, setMounted] = useState(false);
  const pathname = usePathname();
  const logout = useLogout();

  useEffect(() => setMounted(true), []);

  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, [open]);

  useEffect(() => {
    setOpen(false);
  }, [pathname]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open]);

  return (
    <div className="flex items-center gap-3 lg:hidden">
      <button
        type="button"
        onClick={() => setOpen(true)}
        aria-label="Open menu"
        aria-expanded={open}
        aria-controls="mobile-nav-drawer"
        className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl text-neutral-600 active:scale-95 ${RAISED_BTN} ${FOCUS}`}
      >
        <Menu aria-hidden="true" className="h-5 w-5" />
      </button>

      <Link
        href="/dashboard"
        aria-label="Riwainvite, go to overview"
        className={`group flex min-w-0 items-center gap-2.5 rounded-xl py-1 pr-2 ${FOCUS}`}
      >
        <span className="relative shrink-0">
          <span
            aria-hidden
            className="absolute inset-0 rounded-xl bg-orange-400/40 blur-md"
          />
          <span className="relative flex h-9 w-9 items-center justify-center overflow-hidden rounded-xl border border-orange-100 bg-gradient-to-b from-white to-orange-50 shadow-[inset_0_1px_0_#fff,0_8px_16px_-6px_rgba(249,115,22,0.6)] transition-transform duration-200 group-active:scale-95">
            <Image
              src="/logo.png"
              alt=""
              width={28}
              height={28}
              priority
              className="object-contain"
            />
          </span>
        </span>
        <span className="truncate font-[family-name:var(--font-display)] text-[15px] font-semibold leading-none tracking-tight text-neutral-900">
          Riwainvite
        </span>
      </Link>

      {mounted &&
        createPortal(
          <AnimatePresence>
            {open && (
              <>
                <motion.div
                  key="backdrop"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.2 }}
                  onClick={() => setOpen(false)}
                  aria-hidden="true"
                  className="fixed inset-0 z-40 bg-orange-950/25 backdrop-blur-sm lg:hidden"
                />
                <motion.aside
                  key="panel"
                  id="mobile-nav-drawer"
                  role="dialog"
                  aria-modal="true"
                  aria-label="Navigation menu"
                  data-lenis-prevent
                  initial={{ x: "-110%" }}
                  animate={{ x: 0 }}
                  exit={{ x: "-110%" }}
                  transition={{ type: "spring", damping: 30, stiffness: 300 }}
                  drag="x"
                  dragDirectionLock
                  dragConstraints={{ left: 0, right: 0 }}
                  dragElastic={{ left: 0.5, right: 0 }}
                  onDragEnd={(_, info) => {
                    if (info.offset.x < -80 || info.velocity.x < -500)
                      setOpen(false);
                  }}
                  className="fixed bottom-3 left-3 top-3 z-50 w-[88vw] max-w-[320px] pb-[env(safe-area-inset-bottom)] pt-[env(safe-area-inset-top)] lg:hidden"
                >
                  <Panel>
                    <button
                      type="button"
                      onClick={() => setOpen(false)}
                      aria-label="Close menu"
                      className={`absolute right-2.5 top-2.5 z-30 flex h-10 w-10 items-center justify-center rounded-xl text-neutral-500 active:scale-95 ${RAISED_BTN} ${FOCUS}`}
                    >
                      <X aria-hidden="true" className="h-4 w-4" />
                    </button>
                    <SidebarBody
                      user={user}
                      collapsed={false}
                      layoutId="active-nav-mobile"
                      touch
                      onLogoutRequest={logout.request}
                    />
                  </Panel>
                </motion.aside>
              </>
            )}
          </AnimatePresence>,
          document.body,
        )}

      <LogoutModal
        state={logout.state}
        isLoggingOut={logout.isLoggingOut}
        onClose={logout.close}
        onConfirm={logout.confirm}
      />
    </div>
  );
}