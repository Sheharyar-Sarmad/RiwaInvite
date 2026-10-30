"use client";

import { useEffect } from "react";
import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import { AnimatePresence, motion, type Variants } from "framer-motion";
import { Image as ImageIcon, LayoutDashboard, LayoutTemplate, ShieldCheck, X } from "lucide-react";

import { cn } from "@/lib/utils";
import { NAV_LINKS, PRIVACY_LINKS, type NavCategory, type NavUser } from "./NavData";

interface MobileSidebarProps {
  isOpen: boolean;
  onClose: () => void;
  categories: NavCategory[];
  user: NavUser | null;
  isLoading: boolean;
}

const display = "font-[family-name:var(--font-display)]";
const body = "font-[family-name:var(--font-body)]";

const listVariants: Variants = {
  hidden: {},
  show: { transition: { staggerChildren: 0.05, delayChildren: 0.15 } },
};
const itemVariants: Variants = {
  hidden: { opacity: 0, x: 16 },
  show: { opacity: 1, x: 0, transition: { duration: 0.3, ease: "easeOut" } },
};

export function MobileSidebar({ isOpen, onClose, categories, user, isLoading }: MobileSidebarProps) {
  const pathname = usePathname();

  // Lock body scroll while open
  useEffect(() => {
    if (!isOpen) return;
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = previous;
    };
  }, [isOpen]);

  // Close on Escape
  useEffect(() => {
    if (!isOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [isOpen, onClose]);

  // Close after navigating
  useEffect(() => {
    onClose();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pathname]);

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            key="backdrop"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.25 }}
            onClick={onClose}
            aria-hidden
            className="fixed inset-0 z-[110] bg-stone-900/30 backdrop-blur-sm md:hidden"
          />

          {/* Drawer */}
          <motion.aside
            key="drawer"
            role="dialog"
            aria-modal="true"
            aria-label="Main menu"
            initial={{ x: "100%" }}
            animate={{ x: 0 }}
            exit={{ x: "100%" }}
            transition={{ duration: 0.45, ease: [0.32, 0.72, 0, 1] }}
            className="fixed right-0 top-0 z-[120] flex h-[100dvh] w-[85vw] max-w-sm flex-col border-l border-orange-100 bg-[#fffafb]/90 shadow-[0_20px_50px_-15px_rgba(249,115,22,0.3)] backdrop-blur-2xl md:hidden"
          >
            {/* Header */}
            <div className="flex h-20 shrink-0 items-center justify-between border-b border-orange-100 px-5">
              <Link href="/" className="flex items-center gap-2.5" onClick={onClose}>
                <Image src="/logo.png" alt="" width={28} height={28} className="h-7 w-7 object-contain" />
                <span className={cn("text-xl font-bold tracking-tight text-stone-900", display)}>Riwainvite</span>
              </Link>
              <button
                type="button"
                onClick={onClose}
                aria-label="Close menu"
                className="rounded-xl p-2 text-stone-600 transition-colors hover:bg-orange-50 hover:text-orange-600"
              >
                <X className="h-6 w-6" />
              </button>
            </div>

            {/* Scrollable content */}
            <motion.div
              variants={listVariants}
              initial="hidden"
              animate="show"
              className="flex-1 space-y-7 overflow-y-auto overscroll-contain px-5 py-6"
            >
              {/* Templates */}
              <motion.section variants={itemVariants}>
                <h2 className={cn("mb-3 flex items-center gap-2 text-sm font-semibold text-stone-400", body)}>
                  <LayoutTemplate className="h-4 w-4 text-orange-500" />
                  Templates
                </h2>
                <ul className="flex flex-col gap-1">
                  {isLoading
                    ? Array.from({ length: 4 }).map((_, i) => (
                        <li key={i} className="flex items-center gap-3 p-2">
                          <div className="h-12 w-12 animate-pulse rounded-lg bg-orange-100/70" />
                          <div className="h-3 w-28 animate-pulse rounded bg-orange-100/70" />
                        </li>
                      ))
                    : categories.length === 0
                    ? (
                        <li className="p-2 text-sm text-stone-500">Templates couldn’t be loaded right now.</li>
                      )
                    : categories.map((cat) => (
                        <li key={cat.id}>
                          <Link
                            href={`/templates?category=${cat.slug}`}
                            onClick={onClose}
                            className="group flex items-center gap-3 rounded-xl p-2 transition-colors hover:bg-orange-50"
                          >
                            <span className="h-12 w-12 shrink-0 overflow-hidden rounded-lg bg-orange-50 ring-1 ring-orange-100">
                              {cat.thumbnail_url ? (
                                // eslint-disable-next-line @next/next/no-img-element
                                <img
                                  src={cat.thumbnail_url}
                                  alt=""
                                  loading="lazy"
                                  className="h-full w-full object-cover"
                                />
                              ) : (
                                <span className="flex h-full w-full items-center justify-center text-orange-300">
                                  <ImageIcon className="h-5 w-5" />
                                </span>
                              )}
                            </span>
                            <span
                              className={cn(
                                "flex-1 truncate text-sm font-semibold text-stone-900 transition-colors group-hover:text-orange-600",
                                display
                              )}
                            >
                              {cat.name}
                            </span>
                            {typeof cat.template_count === "number" && (
                              <span className="rounded-full bg-orange-100 px-2 py-0.5 text-[11px] font-semibold leading-none text-orange-600">
                                {cat.template_count}
                              </span>
                            )}
                          </Link>
                        </li>
                      ))}
                </ul>
              </motion.section>

              {/* Primary links */}
              <motion.nav variants={itemVariants} aria-label="Primary" className="flex flex-col gap-1">
                {NAV_LINKS.map((link) => (
                  <Link
                    key={link.href}
                    href={link.href}
                    onClick={onClose}
                    className={cn(
                      "flex items-center gap-3 rounded-xl px-3 py-3 text-base font-semibold text-stone-800 transition-colors hover:bg-orange-50 hover:text-orange-600",
                      display
                    )}
                  >
                    <link.icon className="h-5 w-5 text-orange-500" />
                    {link.label}
                  </Link>
                ))}
              </motion.nav>

              {/* Privacy */}
              <motion.section variants={itemVariants}>
                <h2 className={cn("mb-3 flex items-center gap-2 text-sm font-semibold text-stone-400", body)}>
                  <ShieldCheck className="h-4 w-4 text-orange-500" />
                  Privacy
                </h2>
                <ul className="flex flex-col gap-1">
                  {PRIVACY_LINKS.map(({ href, label, icon: Icon }) => (
                    <li key={href}>
                      <Link
                        href={href}
                        onClick={onClose}
                        className="group flex items-center gap-3 rounded-xl p-2 transition-colors hover:bg-orange-50"
                      >
                        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-orange-100">
                          <Icon className="h-5 w-5 text-orange-500" />
                        </span>
                        <span
                          className={cn(
                            "text-sm font-semibold text-stone-900 transition-colors group-hover:text-orange-600",
                            display
                          )}
                        >
                          {label}
                        </span>
                      </Link>
                    </li>
                  ))}
                </ul>
              </motion.section>
            </motion.div>

            {/* Auth — pinned to bottom */}
            <div className="shrink-0 border-t border-orange-100 bg-white/60 px-5 pb-[max(1.25rem,env(safe-area-inset-bottom))] pt-4">
              {isLoading ? (
                <div className="h-12 animate-pulse rounded-xl bg-orange-100/60" />
              ) : user ? (
                <Link
                  href="/dashboard"
                  onClick={onClose}
                  className={cn(
                    "flex items-center justify-center gap-2 rounded-xl bg-gradient-to-b from-orange-500 to-orange-600 px-5 py-3 text-sm font-semibold text-white shadow-[0_10px_25px_-8px_rgba(249,115,22,0.6)]",
                    display
                  )}
                >
                  <LayoutDashboard className="h-4 w-4" />
                  Dashboard
                </Link>
              ) : (
                <div className="flex flex-col gap-2">
                  <Link
                    href="/register"
                    onClick={onClose}
                    className={cn(
                      "rounded-xl bg-gradient-to-b from-orange-500 to-orange-600 px-5 py-3 text-center text-sm font-semibold text-white shadow-[0_10px_25px_-8px_rgba(249,115,22,0.6)]",
                      display
                    )}
                  >
                    Get Started
                  </Link>
                  <Link
                    href="/login"
                    onClick={onClose}
                    className={cn(
                      "rounded-xl border border-orange-100 bg-white px-5 py-3 text-center text-sm font-semibold text-stone-700 transition-colors hover:bg-orange-50",
                      display
                    )}
                  >
                    Log in
                  </Link>
                </div>
              )}
            </div>
          </motion.aside>
        </>
      )}
    </AnimatePresence>
  );
}