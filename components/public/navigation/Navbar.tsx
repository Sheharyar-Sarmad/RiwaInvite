"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import {
  motion,
  useScroll,
  useSpring,
  useMotionValueEvent,
} from "framer-motion";
import { Menu } from "lucide-react";
import axios from "axios";
import gsap from "gsap";

import {
  NavigationMenu,
  NavigationMenuContent,
  NavigationMenuItem,
  NavigationMenuLink,
  NavigationMenuList,
  NavigationMenuTrigger,
  navigationMenuTriggerStyle,
} from "@/components/ui/navigation-menu";
import { cn } from "@/lib/utils";
import { apiClient } from "@/lib/api/api_base";
import { MobileSidebar } from "./MobileSidebar";
import { WhatsAppNavButton } from "./WhatsappButton";
import { NavbarScene } from "./NavbarScene";
import {
  NAV_LINKS,
  PRIVACY_LINKS,
  type NavCategory,
  type NavUser,
} from "./NavData";

const USER_ENDPOINT = "/user/dashboard/account_settings";
const CATEGORIES_ENDPOINT = "/public/templates/categories";

const display = "font-[family-name:var(--font-display)]";
const body = "font-[family-name:var(--font-body)]";

const panelClass =
  "rounded-2xl border-orange-100/70 bg-white/95 p-4 shadow-[0_24px_60px_-20px_rgba(154,52,18,0.35)] backdrop-blur-2xl";

// Neutralise the default shadcn trigger backgrounds so our sliding pill shows.
const triggerReset =
  "relative z-10 rounded-full bg-transparent px-4 text-sm font-semibold text-stone-700 hover:bg-transparent hover:text-orange-600 focus:bg-transparent focus:text-orange-600 data-[state=open]:bg-transparent data-[state=open]:text-orange-600 data-[state=open]:hover:bg-transparent data-[active=true]:bg-transparent";

function HoverPill({ show }: { show: boolean }) {
  if (!show) return null;
  return (
    <motion.span
      layoutId="nav-hover-pill"
      aria-hidden
      transition={{ type: "spring", stiffness: 420, damping: 34 }}
      className="absolute inset-0 rounded-full bg-orange-100/80"
    />
  );
}

function CategoryThumb({ cat, size }: { cat: NavCategory; size: string }) {
  return (
    <span
      className={cn(
        "shrink-0 overflow-hidden rounded-xl bg-gradient-to-br from-orange-100 to-amber-100 ring-1 ring-orange-100",
        size,
      )}
    >
      {cat.thumbnail_url ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={cat.thumbnail_url}
          alt=""
          loading="lazy"
          className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-110"
        />
      ) : (
        <span
          className={cn(
            "flex h-full w-full items-center justify-center text-lg font-bold text-orange-500",
            display,
          )}
        >
          {cat.name.charAt(0)}
        </span>
      )}
    </span>
  );
}

export function Navbar() {
  const pathname = usePathname();
  const [isHidden, setIsHidden] = useState(false);
  const [isScrolled, setIsScrolled] = useState(false);
  const [isMobileOpen, setIsMobileOpen] = useState(false);
  const [hovered, setHovered] = useState<string | null>(null);
  const [categories, setCategories] = useState<NavCategory[]>([]);
  const [user, setUser] = useState<NavUser | null>(null);
  const [isLoadingCategories, setIsLoadingCategories] = useState(true);
  const [isLoadingAuth, setIsLoadingAuth] = useState(true);

  const { scrollY, scrollYProgress } = useScroll();
  const progress = useSpring(scrollYProgress, {
    stiffness: 120,
    damping: 28,
    mass: 0.4,
  });

  useMotionValueEvent(scrollY, "change", (latest) => {
    const previous = scrollY.getPrevious() ?? 0;
    setIsScrolled(latest > 24);
    // hide on a clear downward scroll, show again on any upward scroll
    if (latest > previous && latest > 120) setIsHidden(true);
    else if (latest < previous) setIsHidden(false);
  });

  useEffect(() => {
    const controller = new AbortController();
    const { signal } = controller;

    const loadUser = async () => {
      try {
        const { data } = await apiClient.get<{ user?: NavUser | null }>(
          USER_ENDPOINT,
          { signal },
        );
        setUser(data?.user ?? null);
      } catch {
        // signed-out visitors land here, nothing to do
      } finally {
        if (!signal.aborted) setIsLoadingAuth(false);
      }
    };

    const loadCategories = async () => {
      try {
        const { data } = await apiClient.get<{ data?: NavCategory[] }>(
          CATEGORIES_ENDPOINT,
          { signal },
        );
        if (Array.isArray(data?.data)) setCategories(data.data);
      } catch (err) {
        if (signal.aborted) return;
        if (axios.isAxiosError(err)) {
          console.warn(
            "[Navbar] categories request failed:",
            err.response?.status,
            err.response?.data ?? err.message,
          );
        }
      } finally {
        if (!signal.aborted) setIsLoadingCategories(false);
      }
    };

    loadUser();
    loadCategories();
    return () => controller.abort();
  }, []);

  // Magnetic CTA
  const ctaRef = useRef<HTMLAnchorElement>(null);
  useEffect(() => {
    const btn = ctaRef.current;
    if (!btn || isLoadingAuth || user) return;

    const onMove = (e: MouseEvent) => {
      const { left, top, width, height } = btn.getBoundingClientRect();
      gsap.to(btn, {
        x: (e.clientX - (left + width / 2)) * 0.25,
        y: (e.clientY - (top + height / 2)) * 0.25,
        duration: 0.4,
        ease: "power2.out",
      });
    };
    const onLeave = () =>
      gsap.to(btn, { x: 0, y: 0, duration: 0.9, ease: "elastic.out(1, 0.3)" });

    btn.addEventListener("mousemove", onMove);
    btn.addEventListener("mouseleave", onLeave);
    return () => {
      btn.removeEventListener("mousemove", onMove);
      btn.removeEventListener("mouseleave", onLeave);
      gsap.killTweensOf(btn);
    };
  }, [isLoadingAuth, user]);

  const isActive = (href: string) =>
    href === "/" ? pathname === "/" : pathname?.startsWith(href);

  return (
    <>
      <motion.header
        variants={{ visible: { y: 0 }, hidden: { y: "-100%" } }}
        animate={isHidden && !isMobileOpen ? "hidden" : "visible"}
        transition={{ duration: 0.35, ease: "easeInOut" }}
        className={cn(
          "fixed inset-x-0 top-0 z-50 border-b backdrop-blur-xl transition-[background-color,box-shadow,border-color] duration-300",
          isScrolled
            ? "border-orange-100 bg-[#fffafb]/90 shadow-[0_10px_30px_-20px_rgba(154,52,18,0.4)]"
            : "border-transparent bg-[#fffafb]/60",
        )}
      >
        <NavbarScene paused={isMobileOpen} />

        <div
          className={cn(
            "relative z-10 mx-auto flex max-w-7xl items-center justify-between px-4 transition-[height] duration-300 sm:px-6 lg:px-8",
            isScrolled ? "h-16" : "h-20",
          )}
        >
          {/* Logo */}
          <Link
            href="/"
            aria-label="Riwainvite home"
            className="group flex items-center gap-2.5 rounded-xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-400/60"
          >
            <Image
              src="/logo.png"
              alt="Riwainvite Logo"
              width={44}
              height={44}
              priority
              className={cn(
                "object-contain transition-all duration-300 group-hover:rotate-[-6deg]",
                isScrolled ? "h-9 w-9" : "h-11 w-11",
              )}
            />
            <span
              className={cn(
                "inline-block font-bold tracking-tight text-stone-900 transition-all duration-300",
                isScrolled ? "text-2xl" : "text-[1.7rem]",
                display,
              )}
            >
              Riwainvite
            </span>
          </Link>

          {/* Desktop navigation */}
          <NavigationMenu viewport={false} className="hidden md:flex">
            <NavigationMenuList
              onMouseLeave={() => setHovered(null)}
              className="gap-0.5 rounded-full border border-orange-100/80 bg-white/70 p-1 shadow-[0_6px_20px_-14px_rgba(154,52,18,0.5)] backdrop-blur-md"
            >
              {/* Templates */}
              <NavigationMenuItem
                className="relative"
                onMouseEnter={() => setHovered("templates")}
              >
                <HoverPill show={hovered === "templates"} />
                <NavigationMenuTrigger
                  className={cn(
                    triggerReset,
                    body,
                    isActive("/templates") && "text-orange-600",
                  )}
                >
                  Templates
                </NavigationMenuTrigger>
                <NavigationMenuContent className={panelClass}>
                  <div className="w-[560px]">
                    <p className={cn("px-2 pb-3 text-xs font-medium text-stone-500", body)}>
                      Browse templates by occasion
                    </p>
                    {isLoadingCategories ? (
                      <ul className="grid grid-cols-2 gap-1">
                        {Array.from({ length: 6 }).map((_, i) => (
                          <li key={i} className="flex items-center gap-3 p-2">
                            <div className="h-14 w-14 animate-pulse rounded-xl bg-orange-100/70" />
                            <div className="h-3 w-24 animate-pulse rounded bg-orange-100/70" />
                          </li>
                        ))}
                      </ul>
                    ) : categories.length === 0 ? (
                      <p className={cn("w-[260px] p-2 text-sm text-stone-500", body)}>
                        Templates couldn’t be loaded.
                      </p>
                    ) : (
                      <ul className="grid grid-cols-2 gap-1">
                        {categories.map((cat) => (
                          <li key={cat.id}>
                            <NavigationMenuLink asChild>
                              <Link
                                href={`/templates?category=${cat.slug}`}
                                className="group flex items-center gap-3 rounded-xl p-2 transition-colors hover:bg-orange-50"
                              >
                                <CategoryThumb cat={cat} size="h-14 w-14" />
                                <span className="flex min-w-0 flex-col gap-0.5">
                                  <span className="flex items-center gap-2">
                                    <span
                                      className={cn(
                                        "truncate text-sm font-semibold text-stone-900 transition-colors group-hover:text-orange-600",
                                        display,
                                      )}
                                    >
                                      {cat.name}
                                    </span>
                                    {typeof cat.template_count === "number" && (
                                      <span className="rounded-full bg-orange-100 px-2 py-0.5 text-[11px] font-semibold leading-none text-orange-600">
                                        {cat.template_count}
                                      </span>
                                    )}
                                  </span>
                                  <span className={cn("text-xs text-stone-500", body)}>
                                    Explore designs
                                  </span>
                                </span>
                              </Link>
                            </NavigationMenuLink>
                          </li>
                        ))}
                      </ul>
                    )}
                    <div className="mt-3 flex items-center justify-between rounded-xl bg-orange-50 px-4 py-3">
                      <span className={cn("text-sm font-medium text-stone-700", body)}>
                        Can’t decide? See everything in one place.
                      </span>
                      <NavigationMenuLink asChild>
                        <Link
                          href="/templates"
                          className={cn(
                            "rounded-lg bg-orange-500 px-3 py-1.5 text-xs font-semibold text-white transition-colors hover:bg-orange-600",
                            display,
                          )}
                        >
                          All templates
                        </Link>
                      </NavigationMenuLink>
                    </div>
                  </div>
                </NavigationMenuContent>
              </NavigationMenuItem>

              {/* Primary links */}
              {NAV_LINKS.map((link) => (
                <NavigationMenuItem
                  key={link.href}
                  className="relative"
                  onMouseEnter={() => setHovered(link.href)}
                >
                  <HoverPill show={hovered === link.href} />
                  <NavigationMenuLink asChild>
                    <Link
                      href={link.href}
                      className={cn(
                        navigationMenuTriggerStyle(),
                        triggerReset,
                        body,
                        isActive(link.href) && "text-orange-600",
                      )}
                    >
                      {link.label}
                    </Link>
                  </NavigationMenuLink>
                  {isActive(link.href) && (
                    <motion.span
                      layoutId="nav-active-dot"
                      aria-hidden
                      className="absolute -bottom-0.5 left-1/2 h-1 w-1 -translate-x-1/2 rounded-full bg-orange-500"
                    />
                  )}
                </NavigationMenuItem>
              ))}

              {/* Privacy */}
              <NavigationMenuItem
                className="relative"
                onMouseEnter={() => setHovered("privacy")}
              >
                <HoverPill show={hovered === "privacy"} />
                <NavigationMenuTrigger className={cn(triggerReset, body)}>
                  Privacy
                </NavigationMenuTrigger>
                <NavigationMenuContent className={panelClass}>
                  <ul className="flex w-[300px] flex-col gap-1">
                    {PRIVACY_LINKS.map(({ href, label, description }) => (
                      <li key={href}>
                        <NavigationMenuLink asChild>
                          <Link
                            href={href}
                            className="group flex flex-col gap-0.5 rounded-xl px-3 py-2.5 transition-colors hover:bg-orange-50"
                          >
                            <span
                              className={cn(
                                "text-sm font-semibold text-stone-900 transition-colors group-hover:text-orange-600",
                                display,
                              )}
                            >
                              {label}
                            </span>
                            <span className={cn("text-xs text-stone-500", body)}>
                              {description}
                            </span>
                          </Link>
                        </NavigationMenuLink>
                      </li>
                    ))}
                  </ul>
                </NavigationMenuContent>
              </NavigationMenuItem>
            </NavigationMenuList>
          </NavigationMenu>

          {/* Auth + WhatsApp */}
          <div className="hidden items-center gap-3 md:flex">
            {isLoadingAuth ? (
              <div className="flex animate-pulse items-center gap-1.5">
                <div className="h-10 w-16 rounded-xl bg-orange-100/60" />
                <div className="h-10 w-28 rounded-xl bg-orange-200/60" />
              </div>
            ) : user ? (
              <Link
                href="/dashboard"
                className={cn(
                  "rounded-xl bg-gradient-to-b from-orange-500 to-orange-600 px-5 py-2.5 text-sm font-semibold text-white shadow-[0_6px_18px_-6px_rgba(249,115,22,0.6)] transition-all hover:-translate-y-0.5 hover:shadow-[0_10px_24px_-6px_rgba(249,115,22,0.7)]",
                  display,
                )}
              >
                Dashboard
              </Link>
            ) : (
              <div className="flex items-center gap-1">
                <Link
                  href="/login"
                  className={cn(
                    "rounded-xl px-3 py-2.5 text-sm font-semibold text-stone-600 transition-colors hover:text-orange-600",
                    display,
                  )}
                >
                  Log in
                </Link>
                <Link
                  ref={ctaRef}
                  href="/register"
                  className={cn(
                    "rounded-xl bg-gradient-to-b from-orange-500 to-orange-600 px-5 py-2.5 text-sm font-semibold text-white shadow-[0_6px_18px_-6px_rgba(249,115,22,0.6)] transition-shadow hover:shadow-[0_10px_24px_-6px_rgba(249,115,22,0.75)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-400",
                    display,
                  )}
                >
                  Get Started
                </Link>
              </div>
            )}

            <div className="ml-1 flex items-center justify-center border-l border-orange-100/70 pl-3">
              <WhatsAppNavButton />
            </div>
          </div>

          {/* Mobile actions */}
          <div className="flex items-center gap-2 md:hidden">
            <WhatsAppNavButton />
            <button
              type="button"
              onClick={() => setIsMobileOpen(true)}
              aria-label="Open menu"
              aria-expanded={isMobileOpen}
              className="rounded-xl border border-orange-100 bg-white/70 p-2 text-stone-700 transition-colors hover:bg-orange-50 hover:text-orange-600"
            >
              <Menu className="h-5 w-5" />
            </button>
          </div>
        </div>

        {/* Reading progress */}
        <motion.div
          aria-hidden
          style={{ scaleX: progress }}
          className="absolute inset-x-0 -bottom-px h-[2px] origin-left bg-gradient-to-r from-orange-500 via-amber-400 to-orange-500"
        />
      </motion.header>

      <MobileSidebar
        isOpen={isMobileOpen}
        onClose={() => setIsMobileOpen(false)}
        categories={categories}
        user={user}
        isLoadingCategories={isLoadingCategories}
        isLoadingAuth={isLoadingAuth}
      />
    </>
  );
}