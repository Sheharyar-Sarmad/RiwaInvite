"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { motion, useScroll, useMotionValueEvent } from "framer-motion";
import { Image as ImageIcon, LayoutDashboard, LayoutTemplate, Menu, ShieldCheck } from "lucide-react";
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
import { NavbarScene } from "./NavbarScene"; // 🟢 Import the 3D Background
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
  "bg-white/95 backdrop-blur-2xl border-orange-100/60 rounded-2xl p-6 shadow-[0_20px_50px_-15px_rgba(249,115,22,0.3)]";

export function Navbar() {
  const [isHidden, setIsHidden] = useState(false);
  const [isMobileOpen, setIsMobileOpen] = useState(false);
  const [categories, setCategories] = useState<NavCategory[]>([]);
  const [user, setUser] = useState<NavUser | null>(null);
  const [isLoadingCategories, setIsLoadingCategories] = useState(true);
  const [isLoadingAuth, setIsLoadingAuth] = useState(true); // 🟢 Add Auth Loading state

  const { scrollY } = useScroll();

  useMotionValueEvent(scrollY, "change", (latest) => {
    const previous = scrollY.getPrevious() ?? 0;
    setIsHidden(latest > previous && latest > 100);
  });

  useEffect(() => {
    const controller = new AbortController();
    const { signal } = controller;

    const loadUser = async () => {
      try {
        const { data } = await apiClient.get<{ user?: NavUser | null }>(USER_ENDPOINT, { signal });
        setUser(data?.user ?? null);
      } catch {
      } finally {
        if (!signal.aborted) setIsLoadingAuth(false); // 🟢 Stop Auth Loading
      }
    };

    const loadCategories = async () => {
      try {
        const { data } = await apiClient.get<{ data?: NavCategory[] }>(CATEGORIES_ENDPOINT, { signal });
        if (Array.isArray(data?.data)) {
          setCategories(data.data);
        }
      } catch (err) {
        if (signal.aborted) return;
        if (axios.isAxiosError(err)) {
          console.warn("[Navbar] categories request failed:", err.response?.status, err.response?.data ?? err.message);
        }
      } finally {
        if (!signal.aborted) setIsLoadingCategories(false);
      }
    };

    loadUser();
    loadCategories();

    return () => controller.abort();
  }, []);

  // GSAP: Magnetic CTA
  const ctaRef = useRef<HTMLAnchorElement>(null);
  useEffect(() => {
    const btn = ctaRef.current;
    if (!btn || isLoadingAuth || user) return;

    const onMove = (e: MouseEvent) => {
      const { left, top, width, height } = btn.getBoundingClientRect();
      const mouseX = e.clientX - (left + width / 2);
      const mouseY = e.clientY - (top + height / 2);
      gsap.to(btn, { x: mouseX * 0.3, y: mouseY * 0.3, duration: 0.4, ease: "power2.out" });
    };
    const onLeave = () => {
      gsap.to(btn, { x: 0, y: 0, duration: 0.9, ease: "elastic.out(1, 0.3)" });
    };

    btn.addEventListener("mousemove", onMove);
    btn.addEventListener("mouseleave", onLeave);
    return () => {
      btn.removeEventListener("mousemove", onMove);
      btn.removeEventListener("mouseleave", onLeave);
      gsap.killTweensOf(btn);
    };
  }, [isLoadingAuth, user]);

  return (
    <>
      <motion.header
        variants={{ visible: { y: 0 }, hidden: { y: "-100%" } }}
        animate={isHidden && !isMobileOpen ? "hidden" : "visible"}
        transition={{ duration: 0.35, ease: "easeInOut" }}
        className="fixed inset-x-0 top-0 z-50 border-b border-orange-100 bg-[#fffafb]/80 backdrop-blur-xl"
      >
        {/* 🟢 Render the 3D Scene inside the header */}
        <NavbarScene paused={isMobileOpen} />

        <div className="relative z-10 mx-auto flex h-20 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
          
          {/* Logo */}
          <Link
            href="/"
            aria-label="Riwainvite home"
            className="group flex items-center gap-3 rounded-xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-400/60"
          >
            <Image
              src="/logo.png"
              alt="Riwainvite Logo"
              width={44}
              height={44}
              priority
              className="h-11 w-11 object-contain"
            />
            <span className={cn("inline-block text-3xl font-bold tracking-tight text-stone-900", display)}>
              Riwainvite
            </span>
          </Link>

          {/* Desktop Navigation */}
          <NavigationMenu viewport={false} className="hidden md:flex">
            <NavigationMenuList>
              {/* Templates Mega Menu */}
              <NavigationMenuItem>
                <NavigationMenuTrigger className={body}>
                  <LayoutTemplate className="mr-2 h-4 w-4 text-orange-500" />
                  Templates
                </NavigationMenuTrigger>
                <NavigationMenuContent className={panelClass}>
                  <div className="w-[560px]">
                    {isLoadingCategories ? (
                      <div className="flex h-32 items-center justify-center text-sm text-stone-400">
                        Loading categories...
                      </div>
                    ) : categories.length === 0 ? (
                      <p className={cn("w-[260px] p-2 text-sm text-stone-500", body)}>
                        Templates couldn’t be loaded.
                      </p>
                    ) : (
                      <ul className="grid grid-cols-2 gap-1">
                        {categories.map((cat) => (
                          <li key={cat.id}>
                            <NavigationMenuLink asChild>
                              <Link href={`/templates?category=${cat.slug}`} className="group flex items-center gap-3 rounded-xl p-2 transition-all hover:bg-orange-50">
                                <span className="h-14 w-14 shrink-0 overflow-hidden rounded-lg bg-orange-50 ring-1 ring-orange-100">
                                  {cat.thumbnail_url ? (
                                    <img src={cat.thumbnail_url} alt="" loading="lazy" className="h-full w-full rounded-lg object-cover transition-transform duration-500 group-hover:scale-105" />
                                  ) : (
                                    <span className="flex h-full w-full items-center justify-center text-orange-300">
                                      <ImageIcon className="h-5 w-5" />
                                    </span>
                                  )}
                                </span>
                                <span className="flex min-w-0 flex-col gap-0.5">
                                  <span className="flex items-center gap-2">
                                    <span className={cn("truncate text-sm font-semibold text-stone-900 transition-colors group-hover:text-orange-600", display)}>
                                      {cat.name}
                                    </span>
                                    {typeof cat.template_count === "number" && (
                                      <span className="rounded-full bg-orange-100 px-2 py-0.5 text-[11px] font-semibold leading-none text-orange-600">
                                        {cat.template_count}
                                      </span>
                                    )}
                                  </span>
                                  <span className={cn("text-xs text-stone-500", body)}>Explore designs</span>
                                </span>
                              </Link>
                            </NavigationMenuLink>
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>
                </NavigationMenuContent>
              </NavigationMenuItem>

              {NAV_LINKS.map((link) => (
                <NavigationMenuItem key={link.href}>
                  <NavigationMenuLink asChild>
                    <Link href={link.href} className={cn(navigationMenuTriggerStyle(), body)}>
                      <link.icon className="mr-2 h-4 w-4 text-orange-500" />
                      {link.label}
                    </Link>
                  </NavigationMenuLink>
                </NavigationMenuItem>
              ))}

              {/* Privacy Dropdown */}
              <NavigationMenuItem>
                <NavigationMenuTrigger className={body}>
                  <ShieldCheck className="mr-2 h-4 w-4 text-orange-500" />
                  Privacy
                </NavigationMenuTrigger>
                <NavigationMenuContent className={panelClass}>
                  <ul className="flex w-[280px] flex-col gap-1">
                    {PRIVACY_LINKS.map(({ href, label, description, icon: Icon }) => (
                      <li key={href}>
                        <NavigationMenuLink asChild>
                          <Link href={href} className="group flex items-center gap-3 rounded-xl p-2 transition-all hover:bg-orange-50">
                            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-orange-100">
                              <Icon className="h-5 w-5 text-orange-500 transition-transform group-hover:scale-110" />
                            </span>
                            <span className="flex flex-col">
                              <span className={cn("text-sm font-semibold text-stone-900 transition-colors group-hover:text-orange-600", display)}>
                                {label}
                              </span>
                              <span className={cn("text-xs text-stone-500", body)}>{description}</span>
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

          {/* Auth Section - Fixed Width Wrapper to Prevent CLS */}
          <div className="hidden items-center gap-3 md:flex">
            <WhatsAppNavButton />
            
            {/* 🟢 The wrapper below guarantees that the width never shifts, preventing CLS */}
            <div className="flex min-w-[220px] items-center justify-end">
              {isLoadingAuth ? (
                // 🟢 Skeleton Loader (matches the width of the buttons)
                <div className="flex items-center gap-3 animate-pulse">
                   <div className="h-[38px] w-[70px] rounded-xl bg-orange-100/60" />
                   <div className="h-[42px] w-[125px] rounded-xl bg-orange-200/60" />
                </div>
              ) : user ? (
                <Link
                  href="/dashboard"
                  className={cn(
                    "group flex shrink-0 whitespace-nowrap items-center gap-2 rounded-xl border border-orange-100 bg-white px-5 py-2.5 text-sm font-semibold text-stone-800 shadow-sm transition-all hover:border-orange-200 hover:bg-orange-50",
                    display
                  )}
                >
                  <LayoutDashboard className="h-4 w-4 text-orange-500 transition-transform group-hover:rotate-12" />
                  Dashboard
                </Link>
              ) : (
                <>
                  <Link
                    href="/login"
                    className={cn(
                      "shrink-0 whitespace-nowrap rounded-xl px-4 py-2 text-sm font-semibold text-stone-700 transition-colors hover:bg-orange-50 hover:text-orange-600",
                      display
                    )}
                  >
                    Log in
                  </Link>
                  <Link
                    ref={ctaRef}
                    href="/register"
                    className={cn(
                      "shrink-0 whitespace-nowrap rounded-xl bg-gradient-to-b from-orange-500 to-orange-600 px-6 py-2.5 text-sm font-semibold text-white shadow-[0_10px_25px_-8px_rgba(249,115,22,0.6)] transition-shadow hover:shadow-[0_14px_30px_-8px_rgba(249,115,22,0.8)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-400 focus-visible:ring-offset-2",
                      display
                    )}
                  >
                    Get Started
                  </Link>
                </>
              )}
            </div>
          </div>

          {/* Mobile Actions */}
          <div className="flex items-center gap-2 md:hidden">
            <WhatsAppNavButton />
            <button
              type="button"
              onClick={() => setIsMobileOpen(true)}
              aria-label="Open menu"
              className="rounded-xl p-2 text-stone-600 transition-colors hover:bg-orange-50 hover:text-orange-600"
            >
              <Menu className="h-6 w-6" />
            </button>
          </div>
        </div>
      </motion.header>

      <MobileSidebar
        isOpen={isMobileOpen}
        onClose={() => setIsMobileOpen(false)}
        categories={categories}
        user={user}
        isLoading={isLoadingCategories}
      />
    </>
  );
}