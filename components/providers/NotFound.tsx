"use client";

import { useCallback, useRef } from "react";
import { usePathname, useRouter } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import { motion, useReducedMotion } from "framer-motion";
import { Home, LayoutDashboard, LogIn, ArrowLeft } from "lucide-react";

const FOCUS =
  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-400 focus-visible:ring-offset-2 focus-visible:ring-offset-white";

const PRIMARY_BTN =
  "group relative flex w-full items-center justify-center gap-2 rounded-xl border border-orange-600/30 bg-gradient-to-b from-orange-400 to-orange-600 px-6 py-3 text-sm font-semibold text-white shadow-[inset_0_1px_0_rgba(255,255,255,0.35),0_10px_20px_-8px_rgba(249,115,22,0.7)] transition-all hover:-translate-y-0.5 hover:shadow-[inset_0_1px_0_rgba(255,255,255,0.35),0_14px_26px_-8px_rgba(249,115,22,0.85)] active:translate-y-0 sm:w-auto font-[family-name:var(--font-display)]";

const SECONDARY_BTN =
  "flex w-full items-center justify-center gap-2 rounded-xl border border-orange-200/80 bg-gradient-to-b from-white to-orange-50 px-6 py-3 text-sm font-semibold text-neutral-700 shadow-[inset_0_1px_0_#fff,0_8px_16px_-10px_rgba(249,115,22,0.5)] transition-all hover:-translate-y-0.5 hover:text-orange-700 active:translate-y-0 sm:w-auto font-[family-name:var(--font-display)]";

export function NotFound() {
  const pathname = usePathname();
  const router = useRouter();
  const reduce = useReducedMotion();

  const rootRef = useRef<HTMLDivElement>(null);
  const raf = useRef(0);

  // Check if the user is stuck in the admin section
  const isAdminRoute = pathname?.startsWith("/admin");

  // Same pointer-tracking spotlight as AdminShell
  const onMove = useCallback((e: React.PointerEvent) => {
    if (e.pointerType === "touch") return;
    const { clientX: x, clientY: y } = e;
    cancelAnimationFrame(raf.current);
    raf.current = requestAnimationFrame(() => {
      rootRef.current?.style.setProperty("--mx", `${x}px`);
      rootRef.current?.style.setProperty("--my", `${y}px`);
    });
  }, []);

  const mask =
    "radial-gradient(230px circle at var(--mx,-999px) var(--my,-999px), #000 0%, transparent 100%)";

  return (
    <div
      ref={rootRef}
      onPointerMove={onMove}
      className="relative isolate flex min-h-[100dvh] w-full items-center justify-center overflow-hidden bg-white p-4 font-[family-name:var(--font-body)] text-neutral-900"
    >
      {/* ===== Exact AdminShell background ===== */}
      <div aria-hidden className="pointer-events-none fixed inset-0 -z-10 overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-orange-50 via-white to-orange-50/70" />
        <div
          className="absolute inset-0"
          style={{
            backgroundImage: "radial-gradient(circle, rgba(249,115,22,0.28) 1.5px, transparent 1.5px)",
            backgroundSize: "24px 24px",
          }}
        />
        <div
          className="absolute inset-0"
          style={{
            backgroundImage: "radial-gradient(circle, rgba(234,88,12,0.95) 2px, transparent 2px)",
            backgroundSize: "24px 24px",
            maskImage: mask,
            WebkitMaskImage: mask,
          }}
        />
        <div
          className="absolute inset-0"
          style={{
            background:
              "radial-gradient(420px circle at var(--mx,-999px) var(--my,-999px), rgba(249,115,22,0.10), transparent 70%)",
          }}
        />
        <div
          className="absolute -right-32 -top-48 h-[620px] w-[620px] rounded-full blur-3xl"
          style={{ background: "radial-gradient(circle, rgba(249,115,22,0.22), transparent 65%)" }}
        />
        <div
          className="absolute -bottom-48 -left-32 h-[560px] w-[560px] rounded-full blur-3xl"
          style={{ background: "radial-gradient(circle, rgba(255,138,76,0.20), transparent 70%)" }}
        />
      </div>

      {/* ===== Card ===== */}
      <motion.main
        initial={reduce ? false : { opacity: 0, y: 16, scale: 0.98 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ duration: 0.45, ease: "easeOut" }}
        className="relative w-full max-w-xl overflow-hidden rounded-[2rem] border border-white bg-white/80 px-6 py-10 text-center backdrop-blur-xl shadow-[inset_0_1px_0_#fff,0_1px_2px_rgba(15,23,42,0.05),0_40px_80px_-30px_rgba(249,115,22,0.45)] sm:px-12 sm:py-14"
      >
        {/* Brand */}
        <div className="mb-10 flex items-center justify-center gap-3">
          <div className="relative shrink-0">
            <div aria-hidden className="absolute inset-0 rounded-xl bg-orange-400/25 blur-md" />
            <div className="relative flex h-10 w-10 items-center justify-center overflow-hidden rounded-xl border border-orange-100 bg-gradient-to-b from-white to-orange-50 shadow-[inset_0_1px_0_#fff,0_8px_16px_-6px_rgba(249,115,22,0.6)]">
              <Image src="/logo.png" alt="" width={24} height={24} className="object-contain" />
            </div>
          </div>
          <span className="text-lg font-bold tracking-tight text-neutral-900 font-[family-name:var(--font-display)]">
            Riwainvite
          </span>
        </div>

        {/* 404 — the logo tile sits where the zero would be */}
        <div className="mb-8 flex items-center justify-center gap-2 sm:gap-4" role="img" aria-label="Error 404">
          <span
            aria-hidden
            className="bg-gradient-to-b from-orange-400 to-orange-600 bg-clip-text text-[6.5rem] font-black leading-none tracking-tighter text-transparent drop-shadow-[0_10px_18px_rgba(249,115,22,0.25)] sm:text-[9rem] font-[family-name:var(--font-display)]"
          >
            4
          </span>

          <motion.div
            aria-hidden
            animate={reduce ? undefined : { y: [0, -10, 0], rotate: [-4, 4, -4] }}
            transition={{ duration: 5, repeat: Infinity, ease: "easeInOut" }}
            className="relative shrink-0"
          >
            <div className="absolute inset-0 rounded-[2rem] bg-orange-400/30 blur-xl" />
            <div className="relative flex h-24 w-24 items-center justify-center rounded-[2rem] border border-orange-200/80 bg-gradient-to-b from-white to-orange-100/70 shadow-[inset_0_1px_0_#fff,0_18px_30px_-10px_rgba(249,115,22,0.6)] sm:h-32 sm:w-32">
              <Image
                src="/logo.png"
                alt=""
                width={64}
                height={64}
                className="h-12 w-12 object-contain opacity-90 sm:h-16 sm:w-16"
              />
            </div>
          </motion.div>

          <span
            aria-hidden
            className="bg-gradient-to-b from-orange-400 to-orange-600 bg-clip-text text-[6.5rem] font-black leading-none tracking-tighter text-transparent drop-shadow-[0_10px_18px_rgba(249,115,22,0.25)] sm:text-[9rem] font-[family-name:var(--font-display)]"
          >
            4
          </span>
        </div>

        <h1 className="mb-3 text-3xl font-bold tracking-tight text-neutral-900 font-[family-name:var(--font-display)]">
          Page not found
        </h1>

        <p className="mx-auto mb-6 max-w-sm leading-relaxed text-neutral-500">
          {isAdminRoute
            ? "This admin page doesn't exist, or your account doesn't have access to it."
            : "This page doesn't exist, has moved, or isn't available to you."}
        </p>

        {/* The address that failed */}
        {pathname && (
          <div className="mx-auto mb-8 flex max-w-full items-center justify-center">
            <code className="max-w-full truncate rounded-lg border border-orange-100 bg-white/90 px-3 py-1.5 text-xs text-neutral-500 shadow-[inset_0_1px_0_#fff]">
              {pathname}
            </code>
          </div>
        )}

        {/* Actions */}
        <div className="flex flex-col items-center justify-center gap-3 sm:flex-row">
          {isAdminRoute ? (
            <>
              <Link href="/admin/dashboard" className={`${PRIMARY_BTN} ${FOCUS}`}>
                <LayoutDashboard className="h-4 w-4" strokeWidth={1.75} aria-hidden />
                Open dashboard
              </Link>
              <Link href="/admin/login" className={`${SECONDARY_BTN} ${FOCUS}`}>
                <LogIn className="h-4 w-4 text-orange-500" strokeWidth={1.75} aria-hidden />
                Sign in
              </Link>
            </>
          ) : (
            <Link href="/" className={`${PRIMARY_BTN} sm:px-8 ${FOCUS}`}>
              <Home className="h-4 w-4" strokeWidth={1.75} aria-hidden />
              Go to home
            </Link>
          )}
        </div>

        <button
          type="button"
          onClick={() => router.back()}
          className={`group mx-auto mt-8 flex items-center justify-center gap-2 rounded-lg px-2 py-1 text-sm font-medium text-neutral-400 transition-colors hover:text-orange-600 ${FOCUS}`}
        >
          <ArrowLeft
            className="h-4 w-4 transition-transform group-hover:-translate-x-1"
            strokeWidth={1.75}
            aria-hidden
          />
          Go back
        </button>
      </motion.main>
    </div>
  );
}