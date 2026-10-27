"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import {
  ChevronLeft,
  FolderTree,
  LayoutDashboard,
  LayoutTemplate,
  Mail,
  Menu,
  PlusSquare,
  Settings,
  ShoppingBag,
  Users,
  X,
  type LucideIcon,
} from "lucide-react";
import Image from "next/image";
import { createPortal } from "react-dom";

export type AdminSession = {
  id: string;
  email: string;
  account_name: string;
};

type NavItem = { label: string; href: string; icon: LucideIcon };
type NavGroup = { label: string; items: NavItem[] };

export const NAV: NavGroup[] = [
  {
    label: "Overview",
    items: [{ label: "Dashboard", href: "/admin/dashboard", icon: LayoutDashboard }],
  },
  {
    label: "Catalog",
    items: [
      { label: "Templates", href: "/admin/dashboard/templates", icon: LayoutTemplate },
      { label: "New Template", href: "/admin/dashboard/templates/new", icon: PlusSquare },
      { label: "Categories", href: "/admin/dashboard/categories", icon: FolderTree },
    ],
  },
  {
    label: "Business",
    items: [
      { label: "Orders", href: "/admin/dashboard/orders", icon: ShoppingBag },
      { label: "Users", href: "/admin/dashboard/users", icon: Users },
    ],
  },
  {
    label: "Management",
    items: [
      { label: "Invitations", href: "/admin/dashboard/invitations", icon: Mail },
      { label: "Account Settings", href: "/admin/dashboard/settings", icon: Settings },
    ],
  },
];

/* ---------- Shared "porcelain + ember" tokens ---------- */
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

/** cursor-following light inside an element (writes CSS vars, no re-render) */
function trackPointer(e: React.PointerEvent<HTMLElement>) {
  const r = e.currentTarget.getBoundingClientRect();
  e.currentTarget.style.setProperty("--x", `${e.clientX - r.left}px`);
  e.currentTarget.style.setProperty("--y", `${e.clientY - r.top}px`);
}

type Tip = { text: string; top: number; left: number } | null;

/* Fixed-position tooltip: the nav scrolls, so an absolute one would be clipped */
function Tooltip({ tip }: { tip: NonNullable<Tip> }) {
  return (
    <div className="pointer-events-none fixed z-[70] -translate-y-1/2" style={{ top: tip.top, left: tip.left }}>
      <motion.span
        initial={{ opacity: 0, x: -6, scale: 0.96 }}
        animate={{ opacity: 1, x: 0, scale: 1 }}
        exit={{ opacity: 0, x: -6 }}
        transition={{ duration: 0.15 }}
        role="tooltip"
        className={`block whitespace-nowrap rounded-full px-3 py-1 text-xs font-medium text-neutral-700 ${RAISED}`}
      >
        {tip.text}
      </motion.span>
    </div>
  );
}

/* The floating porcelain slab used by both desktop sidebar and mobile drawer */
function Panel({ children }: { children: React.ReactNode }) {
  return (
    <div
      className="relative flex h-full flex-col rounded-3xl border border-white bg-gradient-to-b from-white via-white to-orange-50/70
        shadow-[inset_0_1px_0_#fff,0_1px_2px_rgba(15,23,42,0.05),0_28px_56px_-24px_rgba(249,115,22,0.45)]"
    >
      <div aria-hidden className="pointer-events-none absolute inset-0 overflow-hidden rounded-3xl">
        <div className="absolute inset-0 bg-[linear-gradient(160deg,rgba(255,255,255,0.95)_0%,rgba(255,255,255,0)_38%)]" />
        <div className="absolute -bottom-24 -left-12 h-60 w-60 rounded-full bg-orange-300/30 blur-3xl" />
        <div
          className="absolute inset-0 opacity-60"
          style={{
            backgroundImage: "radial-gradient(circle, rgba(249,115,22,0.18) 1px, transparent 1px)",
            backgroundSize: "18px 18px",
            maskImage: "linear-gradient(to top, black, transparent 45%)",
            WebkitMaskImage: "linear-gradient(to top, black, transparent 45%)",
          }}
        />
      </div>
      <div className="relative z-10 flex min-h-0 flex-1 flex-col">{children}</div>
    </div>
  );
}

function SidebarBody({
  admin,
  collapsed,
  layoutId,
  onToggleCollapsed,
}: {
  admin: AdminSession;
  collapsed: boolean;
  layoutId: string;
  onToggleCollapsed?: () => void;
}) {
  const pathname = usePathname();
  const [tip, setTip] = useState<Tip>(null);

  const displayName = admin.account_name || admin.email.split("@")[0] || "Admin";
  const initial = displayName.charAt(0).toUpperCase();

  const showTip = (text: string) => (e: React.SyntheticEvent<HTMLElement>) => {
    if (!collapsed) return;
    const r = e.currentTarget.getBoundingClientRect();
    setTip({ text, top: r.top + r.height / 2, left: r.right + 12 });
  };
  const hideTip = () => setTip(null);

  return (
    <>
      {/* Brand */}
      <div
        className={`relative flex h-[68px] shrink-0 items-center ${
          collapsed ? "justify-center px-3" : "gap-3 px-5"
        }`}
      >
        <div className="relative shrink-0">
          <div aria-hidden className="absolute inset-0 rounded-xl bg-orange-400/50 blur-md" />
          <div className="relative flex h-10 w-10 items-center justify-center overflow-hidden rounded-xl border border-orange-100 bg-gradient-to-b from-white to-orange-50 shadow-[inset_0_1px_0_#fff,0_8px_16px_-6px_rgba(249,115,22,0.6)]">
            <Image src="/logo.png" alt="Riwainvite" width={32} height={32} className="object-contain" />
          </div>
        </div>
        {!collapsed && (
          <div className="flex min-w-0 flex-col leading-tight">
            <span className="truncate text-[15px] font-semibold tracking-tight text-neutral-900 font-[family-name:var(--font-display)]">
              Riwainvite
            </span>
            <span className="text-[10px] font-semibold uppercase tracking-[0.18em] text-orange-500">Admin</span>
          </div>
        )}
        {onToggleCollapsed && (
          <button
            type="button"
            onClick={onToggleCollapsed}
            aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
            className={`absolute right-0 top-1/2 flex h-7 w-7 -translate-y-1/2 translate-x-1/2 items-center justify-center rounded-full text-neutral-500 hover:text-orange-600 ${RAISED_BTN} ${FOCUS}`}
          >
            <ChevronLeft
              aria-hidden="true"
              className={`h-4 w-4 transition-transform duration-300 ${collapsed ? "rotate-180" : ""}`}
            />
          </button>
        )}
      </div>
      <div aria-hidden className="mx-4 h-px bg-gradient-to-r from-transparent via-orange-200 to-transparent" />

      {/* Nav */}
      <nav
        role="navigation"
        aria-label="Admin"
        onScroll={hideTip}
        style={{ scrollbarWidth: "thin", scrollbarColor: "#fdba74 transparent" }}
        className="scroll-ember flex-1 overflow-y-auto overflow-x-hidden px-3 py-4"
      >
        {NAV.map((group, i) => (
          <motion.div
            key={group.label}
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.05 * i, duration: 0.25 }}
            className="relative mb-4"
          >
            {collapsed ? (
              i > 0 && <div aria-hidden="true" className="mx-3 mb-3 h-px bg-orange-100" />
            ) : (
              <p className="mb-1.5 flex items-center gap-2 px-2.5 text-[10px] font-semibold uppercase tracking-[0.14em] text-neutral-400">
                {group.label}
                <span aria-hidden className="h-px flex-1 bg-gradient-to-r from-orange-100 to-transparent" />
              </p>
            )}
            <ul className="flex flex-col gap-1">
              {group.items.map((item) => {
                const active = pathname === item.href;
                const Icon = item.icon;
                return (
                  <li key={item.href} className="relative">
                    <Link
                      href={item.href}
                      aria-current={active ? "page" : undefined}
                      aria-label={collapsed ? item.label : undefined}
                      onPointerMove={trackPointer}
                      onMouseEnter={showTip(item.label)}
                      onMouseLeave={hideTip}
                      onFocus={showTip(item.label)}
                      onBlur={hideTip}
                      className={`group relative flex items-center gap-2.5 rounded-xl p-1.5 pr-2.5 text-sm font-medium transition-colors ${FOCUS} ${
                        collapsed ? "justify-center" : ""
                      } ${active ? "text-orange-700" : "text-neutral-600 hover:text-neutral-900"}`}
                    >
                      {/* cursor light */}
                      <span
                        aria-hidden
                        className="pointer-events-none absolute inset-0 rounded-xl opacity-0 transition-opacity duration-200 group-hover:opacity-100"
                        style={{
                          background:
                            "radial-gradient(110px circle at var(--x,50%) var(--y,50%), rgba(249,115,22,0.20), transparent 70%)",
                        }}
                      />
                      <AnimatePresence>
                        {active && (
                          <motion.div
                            layoutId={layoutId}
                            className="absolute inset-0 rounded-xl border border-orange-200/80 bg-gradient-to-b from-white to-orange-100/70
                              shadow-[inset_0_1px_0_#fff,0_1px_2px_rgba(15,23,42,0.05),0_10px_20px_-8px_rgba(249,115,22,0.5)]"
                            transition={{ type: "spring", damping: 30, stiffness: 400 }}
                          >
                            <span
                              aria-hidden
                              className="absolute -left-[3px] top-1/2 h-5 w-[3px] -translate-y-1/2 rounded-full bg-orange-500 shadow-[0_0_10px_rgba(249,115,22,0.9)]"
                            />
                          </motion.div>
                        )}
                      </AnimatePresence>
                      {/* icon orb */}
                      <span
                        className={`relative flex h-7 w-7 shrink-0 items-center justify-center rounded-lg transition-all duration-200 ${
                          active
                            ? ORB_ON
                            : "border border-orange-100/70 bg-white/70 text-neutral-400 group-hover:-translate-y-px group-hover:text-orange-500 group-hover:shadow-[0_6px_10px_-4px_rgba(249,115,22,0.4)]"
                        }`}
                      >
                        <Icon aria-hidden="true" strokeWidth={1.75} className="h-4 w-4" />
                      </span>
                      {!collapsed && <span className="relative truncate">{item.label}</span>}
                    </Link>
                  </li>
                );
              })}
            </ul>
          </motion.div>
        ))}
      </nav>

      {/* Profile */}
      <div className="shrink-0 p-3">
        <div
          className={`flex items-center gap-2.5 rounded-2xl p-2 ${RAISED} ${collapsed ? "justify-center" : ""}`}
          onMouseEnter={showTip(`${displayName} · ${admin.email}`)}
          onMouseLeave={hideTip}
        >
          <div className="relative shrink-0">
            <div
              aria-hidden={!collapsed}
              aria-label={collapsed ? `${displayName} · ${admin.email}` : undefined}
              className={`flex h-9 w-9 items-center justify-center rounded-full text-xs font-semibold ${ORB_ON}`}
            >
              {initial}
            </div>
            <span aria-hidden className="absolute -bottom-0.5 -right-0.5 flex h-3 w-3">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400/70 motion-reduce:animate-none" />
              <span className="relative inline-flex h-3 w-3 rounded-full border-2 border-white bg-emerald-500" />
            </span>
          </div>
          {!collapsed && (
            <div className="flex min-w-0 flex-col leading-tight">
              <span className="truncate text-sm font-semibold text-neutral-900">{displayName}</span>
              <span className="truncate text-[11px] text-neutral-500">{admin.email}</span>
            </div>
          )}
        </div>
      </div>

      <AnimatePresence>{tip && <Tooltip tip={tip} />}</AnimatePresence>
    </>
  );
}

export function AdminSidebar({
  admin,
  collapsed,
  onToggleCollapsed,
}: {
  admin: AdminSession;
  collapsed: boolean;
  onToggleCollapsed: () => void;
}) {
  return (
    <aside
      className={`fixed inset-y-3 left-3 z-30 hidden transition-[width] duration-300 ease-out lg:block ${
        collapsed ? "w-[72px]" : "w-[260px]"
      }`}
    >
      <Panel>
        <SidebarBody
          admin={admin}
          collapsed={collapsed}
          layoutId="active-nav"
          onToggleCollapsed={onToggleCollapsed}
        />
      </Panel>
    </aside>
  );
}

export function AdminMobileNav({ admin }: { admin: AdminSession }) {
  const [open, setOpen] = useState(false);
  const [mounted, setMounted] = useState(false);
  const pathname = usePathname();

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
    <div className="lg:hidden">
      <button
        type="button"
        onClick={() => setOpen(true)}
        aria-label="Open menu"
        aria-expanded={open}
        className={`rounded-xl p-2 text-neutral-600 ${RAISED_BTN} ${FOCUS}`}
      >
        <Menu aria-hidden="true" className="h-5 w-5" />
      </button>

      {/* Portal: the header is blurred, which would trap a fixed drawer inside it */}
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
                  onClick={() => setOpen(false)}
                  aria-hidden="true"
                  className="fixed inset-0 z-40 bg-orange-950/25 backdrop-blur-sm lg:hidden"
                />
                <motion.aside
                  key="panel"
                  role="dialog"
                  aria-modal="true"
                  aria-label="Navigation menu"
                  initial={{ x: "-110%" }}
                  animate={{ x: 0 }}
                  exit={{ x: "-110%" }}
                  transition={{ type: "spring", damping: 30, stiffness: 300 }}
                  className="fixed inset-y-3 left-3 z-50 w-[85vw] max-w-[300px] lg:hidden"
                >
                  <Panel>
                    <button
                      type="button"
                      onClick={() => setOpen(false)}
                      aria-label="Close menu"
                      className={`absolute right-3 top-4 z-10 rounded-lg p-1.5 text-neutral-500 ${RAISED_BTN} ${FOCUS}`}
                    >
                      <X aria-hidden="true" className="h-4 w-4" />
                    </button>
                    <SidebarBody admin={admin} collapsed={false} layoutId="active-nav-mobile" />
                  </Panel>
                </motion.aside>
              </>
            )}
          </AnimatePresence>,
          document.body
        )}
    </div>
  );
}