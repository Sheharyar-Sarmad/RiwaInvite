"use client";

import { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, Monitor, Smartphone, Loader2, ExternalLink, RotateCw, AlertTriangle, LayoutTemplate } from "lucide-react";
import { apiClient } from "@/lib/api/api_base";
import { Invitation } from "@/components/admin/sections/invitations/InvitationsClient";
import { InvitationRenderer } from "@/components/admin/sections/invitations/InvitationRenderer";

type Device = "desktop" | "mobile";

const PHONE_W = 375;
const PHONE_H = 812;

const DEVICES: { id: Device; label: string; Icon: typeof Monitor }[] = [
  { id: "desktop", label: "Desktop", Icon: Monitor },
  { id: "mobile", label: "Mobile", Icon: Smartphone },
];

export function InvitationPreviewModal({ invitation, onClose }: { invitation: Invitation; onClose: () => void }) {
  const [data, setData] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [hasError, setHasError] = useState(false);
  const [retryKey, setRetryKey] = useState(0);
  const [device, setDevice] = useState<Device>("desktop");
  const [scale, setScale] = useState(1);

  const stageRef = useRef<HTMLDivElement>(null);
  const publicUrl = `/invite/${invitation.slug}`;

  /* ----------------------------- Data fetching ----------------------------- */
  useEffect(() => {
    let cancelled = false;
    setIsLoading(true);
    setHasError(false);

    (async () => {
      try {
        // Full record, including design_schema
        const res = await apiClient.get(`/admin/dashboard/invitations/${invitation.id}`);
        if (!cancelled) setData(res.data.data);
      } catch (e) {
        console.error(e);
        if (!cancelled) setHasError(true);
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [invitation.id, retryKey]);

  /* ------------------- Escape to close + body scroll lock ------------------ */
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = prev;
    };
  }, [onClose]);

  /* ---------- Shrink the phone on short screens so it never clips ---------- */
  useEffect(() => {
    const el = stageRef.current;
    if (!el) return;
    const ro = new ResizeObserver(([entry]) => {
      setScale(Math.min(1, entry.contentRect.height / PHONE_H));
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  /* ------------------------------- Content --------------------------------- */
  const renderContent = () => {
    if (isLoading) {
      return (
        <div className="flex flex-col items-center justify-center gap-3 text-orange-500">
          <div className="rounded-2xl border border-orange-100 bg-white/80 p-4 shadow-sm backdrop-blur-xl">
            <Loader2 className="h-7 w-7 animate-spin" />
          </div>
          <p className="text-sm font-medium text-gray-600 font-[family-name:var(--font-body)]">Rendering template…</p>
        </div>
      );
    }

    if (hasError) {
      return (
        <div className="flex max-w-xs flex-col items-center gap-3 text-center">
          <div className="rounded-2xl border border-red-100 bg-red-50 p-3 text-red-500">
            <AlertTriangle className="h-6 w-6" />
          </div>
          <p className="text-sm font-bold text-gray-800 font-[family-name:var(--font-display)]">Couldn't load this invitation</p>
          <p className="text-xs text-gray-500 font-[family-name:var(--font-body)]">Check your connection and try again.</p>
          <button
            onClick={() => setRetryKey((k) => k + 1)}
            className="flex items-center gap-1.5 rounded-lg border border-gray-200 bg-white px-3 py-1.5 text-xs font-bold text-gray-700 shadow-sm transition-all hover:-translate-y-0.5 hover:text-orange-600 cursor-pointer"
          >
            <RotateCw className="h-3.5 w-3.5" /> Try again
          </button>
        </div>
      );
    }

    if (!data?.design_schema) {
      return (
        <div className="flex max-w-xs flex-col items-center gap-3 text-center">
          <div className="rounded-2xl border border-orange-100 bg-orange-50 p-3 text-orange-500">
            <LayoutTemplate className="h-6 w-6" />
          </div>
          <p className="text-sm font-bold text-gray-800 font-[family-name:var(--font-display)]">Nothing to preview yet</p>
          <p className="text-xs text-gray-500 font-[family-name:var(--font-body)]">
            This invitation has no design schema. The user hasn't picked or saved a design.
          </p>
        </div>
      );
    }

    const renderer = <InvitationRenderer schema={data.design_schema} invitationData={data} />;

    return (
      <AnimatePresence mode="wait" initial={false}>
        {device === "desktop" ? (
          <motion.div
            key="desktop"
            initial={{ opacity: 0, scale: 0.97 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.97 }}
            transition={{ duration: 0.22, ease: "easeOut" }}
            className="flex h-full w-full max-w-5xl flex-col overflow-hidden rounded-xl border border-gray-300 bg-white shadow-2xl"
          >
            {/* Browser chrome */}
            <div className="flex shrink-0 items-center gap-3 border-b border-gray-200 bg-gray-50 px-4 py-2.5">
              <div className="flex gap-1.5">
                <span className="h-2.5 w-2.5 rounded-full bg-red-400/80" />
                <span className="h-2.5 w-2.5 rounded-full bg-amber-400/80" />
                <span className="h-2.5 w-2.5 rounded-full bg-emerald-400/80" />
              </div>
              <div className="mx-auto w-full max-w-sm truncate rounded-md border border-gray-200 bg-white px-3 py-1 text-center font-mono text-[11px] text-gray-500">
                riwainvite.com{publicUrl}
              </div>
              <div className="w-[42px]" />
            </div>

            {/* Scroll container — data-lenis-prevent stops Lenis from hijacking wheel/touch */}
            <div data-lenis-prevent className="no-scrollbar min-h-0 flex-1 overflow-y-auto overscroll-contain">
              {renderer}
            </div>
          </motion.div>
        ) : (
          <motion.div
            key="mobile"
            initial={{ opacity: 0, scale: 0.96 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.96 }}
            transition={{ duration: 0.22, ease: "easeOut" }}
            style={{ width: PHONE_W * scale, height: PHONE_H * scale }}
            className="shrink-0"
          >
            <div
              style={{ transform: `scale(${scale})`, transformOrigin: "top left" }}
              className="relative flex h-[812px] w-[375px] flex-col overflow-hidden rounded-[2.5rem] border-[8px] border-gray-800 bg-white shadow-2xl ring-1 ring-black/10"
            >
              {/* Dynamic island */}
              <div className="pointer-events-none absolute left-1/2 top-2 z-20 h-6 w-24 -translate-x-1/2 rounded-full bg-gray-800" />

              {/* Scroll container — data-lenis-prevent fixes the mobile scroll bug */}
              <div data-lenis-prevent className="no-scrollbar min-h-0 flex-1 overflow-y-auto overscroll-contain">
                {renderer}
              </div>

              {/* Home indicator */}
              <div className="pointer-events-none absolute bottom-1.5 left-1/2 z-20 h-1 w-28 -translate-x-1/2 rounded-full bg-gray-800/70" />
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    );
  };

  return (
    <div data-lenis-prevent className="fixed inset-0 z-[60] flex items-center justify-center p-4 sm:p-6">
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={onClose}
        className="absolute inset-0 cursor-pointer bg-gray-900/80 backdrop-blur-sm"
      />

      <motion.div
        role="dialog"
        aria-modal="true"
        aria-label={`Live preview of ${invitation.title}`}
        initial={{ opacity: 0, scale: 0.95, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 20 }}
        transition={{ type: "spring", damping: 28, stiffness: 320 }}
        className="relative z-10 flex h-[90vh] w-full max-w-6xl flex-col overflow-hidden rounded-2xl border border-white/10 bg-gray-100 shadow-2xl"
      >
        {/* Header */}
        <div className="flex shrink-0 flex-wrap items-center justify-between gap-3 border-b border-orange-100/50 bg-[#fffafb]/90 px-4 py-3 backdrop-blur-xl">
          <div className="flex min-w-0 items-center gap-3">
            <div className="rounded-xl bg-orange-100 p-2 text-orange-600 shadow-inner">
              <Monitor className="h-5 w-5" />
            </div>
            <div className="min-w-0">
              <h2 className="truncate text-sm font-bold text-gray-900 font-[family-name:var(--font-display)]">
                Live preview: {invitation.title}
              </h2>
              <p className="truncate font-mono text-xs text-gray-500">{publicUrl}</p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            {/* Segmented device toggle */}
            <div role="tablist" className="relative flex items-center rounded-xl border border-gray-200 bg-gray-100 p-1">
              {DEVICES.map(({ id, label, Icon }) => {
                const active = device === id;
                return (
                  <button
                    key={id}
                    role="tab"
                    aria-selected={active}
                    aria-label={`${label} preview`}
                    onClick={() => setDevice(id)}
                    className={`relative z-10 flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-xs font-bold transition-colors cursor-pointer font-[family-name:var(--font-display)] ${
                      active ? "text-orange-600" : "text-gray-500 hover:text-gray-700"
                    }`}
                  >
                    {active && (
                      <motion.span
                        layoutId="device-pill"
                        transition={{ type: "spring", damping: 30, stiffness: 400 }}
                        className="absolute inset-0 -z-10 rounded-lg bg-white shadow-sm"
                      />
                    )}
                    <Icon className="h-4 w-4" />
                    <span className="hidden sm:inline">{label}</span>
                  </button>
                );
              })}
            </div>

            <a
              href={publicUrl}
              target="_blank"
              rel="noreferrer"
              className="flex items-center gap-1.5 rounded-lg border border-gray-200 bg-white px-3 py-2 text-xs font-bold text-gray-600 shadow-sm transition-all hover:-translate-y-0.5 hover:bg-gray-50 hover:text-orange-600 cursor-pointer"
            >
              <ExternalLink className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">Open public URL</span>
            </a>

            <button
              onClick={onClose}
              aria-label="Close preview"
              className="rounded-lg border border-gray-200 bg-white p-2 text-gray-500 shadow-sm transition-all hover:-translate-y-0.5 hover:bg-gray-50 hover:text-gray-800 cursor-pointer"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>

        {/* Stage */}
        <div
          ref={stageRef}
          className="relative flex min-h-0 flex-1 items-center justify-center overflow-hidden bg-gray-200/50 p-6"
          style={{
            backgroundImage: "radial-gradient(rgba(249,115,22,0.12) 1px, transparent 1px)",
            backgroundSize: "22px 22px",
          }}
        >
          {renderContent()}
        </div>
      </motion.div>
    </div>
  );
}