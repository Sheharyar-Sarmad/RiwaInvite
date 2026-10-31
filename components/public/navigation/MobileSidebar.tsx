"use client";

import { useEffect } from "react";
import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import { AnimatePresence, motion, type PanInfo, type Variants } from "framer-motion";
import { X } from "lucide-react";
import { useLenis } from "lenis/react";

import { cn } from "@/lib/utils";
import { NAV_LINKS, PRIVACY_LINKS, type NavCategory, type NavUser } from "./NavData";

interface MobileSidebarProps {
  isOpen: boolean;
  onClose: () => void;
  categories: NavCategory[];
  user: NavUser | null;
  isLoadingCategories: boolean;
  isLoadingAuth: boolean;
}

const display = "font-[family-name:var(--font-display)]";
const body = "font-[family-name:var(--font-body)]";

const listVariants: Variants = {
  hidden: {},
  show: { transition: { staggerChildren: 0.06, delayChildren: 0.18 } },
};
const itemVariants: Variants = {
  hidden: { opacity: 0, x: 18 },
  show: { opacity: 1, x: 0, transition: { duration: 0.35, ease: [0.16, 1, 0.3, 1] } },
};

export function MobileSidebar({
  isOpen,
  onClose,
  categories,
  user,
  isLoadingCategories,
  isLoadingAuth,
}: MobileSidebarProps) {
  const pathname = usePathname();
  const lenis = useLenis();

  // Freeze the page behind the drawer. Lenis is stopped so it stops hijacking
  // wheel and touch, and the drawer's own list scrolls natively.
  useEffect(() => {
    if (!isOpen) return;
    lenis?.stop();
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = previous;
      lenis?.start();
    };
  }, [isOpen, lenis]);

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

  const onDragEnd = (_: unknown, info: PanInfo) => {
    if (info.offset.x > 90 || info.velocity.x > 500) onClose();
  };

  const isActive = (href: string) =>
    href === "/" ? pathname === "/" : pathname?.startsWith(href);

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
            data-lenis-prevent
            className="fixed inset-0 z-[110] bg-stone-900/40 backdrop-blur-sm md:hidden"
          />

          {/* Drawer */}
          <motion.aside
            key="drawer"
            role="dialog"
            aria-modal="true"
            aria-label="Main menu"
            data-lenis-prevent
            initial={{ x: "100%" }}
            animate={{ x: 0 }}
            exit={{ x: "100%" }}
            transition={{ duration: 0.45, ease: [0.32, 0.72, 0, 1] }}
            drag="x"
            dragDirectionLock
            dragConstraints={{ left: 0, right: 0 }}
            dragElastic={{ left: 0, right: 0.5 }}
            onDragEnd={onDragEnd}
            className="fixed right-0 top-0 z-[120] flex h-[100dvh] w-[88vw] max-w-sm flex-col border-l border-orange-100 bg-[#fffafb] shadow-[-20px_0_60px_-20px_rgba(154,52,18,0.35)] md:hidden"
          >
            {/* Header */}
            <div className="flex h-16 shrink-0 items-center justify-between border-b border-orange-100 px-5">
              <Link href="/" className="flex items-center gap-2.5" onClick={onClose}>
                <Image src="/logo.png" alt="" width={32} height={32} className="h-8 w-8 object-contain" />
                <span className={cn("text-xl font-bold tracking-tight text-stone-900", display)}>
                  Riwainvite
                </span>
              </Link>
              <button
                type="button"
                onClick={onClose}
                aria-label="Close menu"
                className="rounded-xl border border-orange-100 bg-white p-2 text-stone-700 transition-colors hover:bg-orange-50 hover:text-orange-600"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Scrollable content: data-lenis-prevent lets it scroll under Lenis */}
            <motion.div
              data-lenis-prevent
              variants={listVariants}
              initial="hidden"
              animate="show"
              className="min-h-0 flex-1 space-y-8 overflow-y-auto overscroll-contain px-5 py-6 [-webkit-overflow-scrolling:touch]"
            >
              {/* Primary links, big and tappable */}
              <motion.nav variants={itemVariants} aria-label="Primary" className="flex flex-col">
                {NAV_LINKS.map((link) => (
                  <Link
                    key={link.href}
                    href={link.href}
                    onClick={onClose}
                    className={cn(
                      "flex items-center justify-between border-b border-orange-100/80 py-3.5 text-2xl font-bold tracking-tight transition-colors",
                      isActive(link.href) ? "text-orange-600" : "text-stone-900 hover:text-orange-600",
                      display,
                    )}
                  >
                    {link.label}
                    {isActive(link.href) && <span className="h-2 w-2 rounded-full bg-orange-500" />}
                  </Link>
                ))}
              </motion.nav>

              {/* Templates as a two-column grid */}
              <motion.section variants={itemVariants} aria-labelledby="m-templates">
                <div className="mb-3 flex items-baseline justify-between">
                  <h2 id="m-templates" className={cn("text-sm font-semibold text-stone-500", body)}>
                    Templates
                  </h2>
                  <Link
                    href="/templates"
                    onClick={onClose}
                    className={cn("text-xs font-semibold text-orange-600", display)}
                  >
                    View all
                  </Link>
                </div>

                {isLoadingCategories ? (
                  <div className="grid grid-cols-2 gap-2.5">
                    {Array.from({ length: 4 }).map((_, i) => (
                      <div key={i} className="aspect-[4/3] animate-pulse rounded-2xl bg-orange-100/70" />
                    ))}
                  </div>
                ) : categories.length === 0 ? (
                  <p className="text-sm text-stone-500">Templates couldn’t be loaded right now.</p>
                ) : (
                  <ul className="grid grid-cols-2 gap-2.5">
                    {categories.map((cat) => (
                      <li key={cat.id}>
                        <Link
                          href={`/templates?category=${cat.slug}`}
                          onClick={onClose}
                          className="group relative block aspect-[4/3] overflow-hidden rounded-2xl bg-gradient-to-br from-orange-200 to-amber-100 ring-1 ring-orange-100"
                        >
                          {cat.thumbnail_url && (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img
                              src={cat.thumbnail_url}
                              alt=""
                              loading="lazy"
                              className="absolute inset-0 h-full w-full object-cover transition-transform duration-500 group-active:scale-105"
                            />
                          )}
                          <span className="absolute inset-0 bg-gradient-to-t from-stone-900/75 via-stone-900/10 to-transparent" />
                          <span className="absolute inset-x-2.5 bottom-2 flex items-end justify-between gap-2">
                            <span className={cn("truncate text-sm font-semibold text-white", display)}>
                              {cat.name}
                            </span>
                            {typeof cat.template_count === "number" && (
                              <span className="rounded-full bg-white/90 px-2 py-0.5 text-[10px] font-bold leading-none text-orange-600">
                                {cat.template_count}
                              </span>
                            )}
                          </span>
                        </Link>
                      </li>
                    ))}
                  </ul>
                )}
              </motion.section>

              {/* Privacy */}
              <motion.section variants={itemVariants} aria-labelledby="m-privacy">
                <h2 id="m-privacy" className={cn("mb-2 text-sm font-semibold text-stone-500", body)}>
                  Privacy
                </h2>
                <ul className="flex flex-col">
                  {PRIVACY_LINKS.map(({ href, label, description }) => (
                    <li key={href}>
                      <Link
                        href={href}
                        onClick={onClose}
                        className="flex flex-col gap-0.5 border-b border-orange-100/80 py-3 last:border-b-0"
                      >
                        <span className={cn("text-base font-semibold text-stone-900", display)}>{label}</span>
                        {description && (
                          <span className={cn("text-xs text-stone-500", body)}>{description}</span>
                        )}
                      </Link>
                    </li>
                  ))}
                </ul>
              </motion.section>
            </motion.div>

            {/* Auth pinned to the bottom */}
            <div className="shrink-0 border-t border-orange-100 bg-white/70 px-5 pb-[max(1.25rem,env(safe-area-inset-bottom))] pt-4">
              {isLoadingAuth ? (
                <div className="h-12 animate-pulse rounded-xl bg-orange-100/60" />
              ) : user ? (
                <Link
                  href="/dashboard"
                  onClick={onClose}
                  className={cn(
                    "block rounded-xl bg-gradient-to-b from-orange-500 to-orange-600 px-5 py-3 text-center text-sm font-semibold text-white shadow-[0_10px_25px_-8px_rgba(249,115,22,0.6)]",
                    display,
                  )}
                >
                  Go to dashboard
                </Link>
              ) : (
                <div className="grid grid-cols-2 gap-2.5">
                  <Link
                    href="/login"
                    onClick={onClose}
                    className={cn(
                      "rounded-xl border border-orange-200 bg-white px-4 py-3 text-center text-sm font-semibold text-stone-800 transition-colors hover:bg-orange-50",
                      display,
                    )}
                  >
                    Log in
                  </Link>
                  <Link
                    href="/register"
                    onClick={onClose}
                    className={cn(
                      "rounded-xl bg-gradient-to-b from-orange-500 to-orange-600 px-4 py-3 text-center text-sm font-semibold text-white shadow-[0_10px_25px_-8px_rgba(249,115,22,0.6)]",
                      display,
                    )}
                  >
                    Get Started
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