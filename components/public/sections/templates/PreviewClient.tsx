"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import {
  motion,
  AnimatePresence,
  useMotionValue,
  useReducedMotion,
  useSpring,
  useTransform,
} from "framer-motion";
import {
  ArrowLeft,
  ArrowRight,
  ShieldCheck,
  Monitor,
  Smartphone,
  Music,
  Image as ImageIcon,
  X,
  ChevronLeft,
  ChevronRight,
  Signal,
  Wifi,
  BatteryFull,
} from "lucide-react";
import { apiClient } from "@/lib/api/api_base";
import { TemplateData } from "@/components/public/models/TemplatePreviewModel";
import { WidgetRenderer } from "@/components/admin/sections/templates/WidgetRenderer";
import { resolveElement, normalizeData } from "@/lib/elementor/invitation-data";

const primaryBtn =
  "bg-gradient-to-b from-[#fb8a3c] to-[#f97316] shadow-[0_10px_30px_-10px_rgba(249,115,22,0.8),inset_0_1px_0_rgba(255,255,255,0.3)]";

const MOBILE_W = 390;
const MOBILE_H = 844;
const DOCK_RESERVE = 104; // space kept free under the phone for the dock
const TOP_RESERVE = 24;
const RING_C = 2 * Math.PI * 24;

function isDarkColor(c?: string) {
  if (!c) return false;
  const m = c.trim().match(/^#([0-9a-f]{3}|[0-9a-f]{6})$/i);
  if (!m) return false;
  let h = m[1];
  if (h.length === 3) h = h.split("").map((x) => x + x).join("");
  const r = parseInt(h.slice(0, 2), 16);
  const g = parseInt(h.slice(2, 4), 16);
  const b = parseInt(h.slice(4, 6), 16);
  return 0.299 * r + 0.587 * g + 0.114 * b < 140;
}

export function PreviewClient({ id }: { id: string }) {
  const reduce = useReducedMotion() ?? false;

  const [template, setTemplate] = useState<TemplateData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [device, setDevice] = useState<"desktop" | "mobile">("desktop");
  const [vp, setVp] = useState<{ w: number; h: number } | null>(null);
  const [dockVisible, setDockVisible] = useState(true);

  // media
  const audioRef = useRef<HTMLAudioElement>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [progress, setProgress] = useState(0);
  const [lightboxIdx, setLightboxIdx] = useState<number | null>(null);
  const [lightboxDir, setLightboxDir] = useState(1);

  // scroll progress + dock auto-hide
  const scrollProgress = useMotionValue(0);
  const progressX = useSpring(scrollProgress, { stiffness: 220, damping: 30 });
  const lastY = useRef(0);

  // phone tilt
  const tiltX = useMotionValue(0);
  const tiltY = useMotionValue(0);
  const sx = useSpring(tiltX, { stiffness: 90, damping: 16, mass: 0.7 });
  const sy = useSpring(tiltY, { stiffness: 90, damping: 16, mass: 0.7 });
  const rotateY = useTransform(sx, [-0.5, 0.5], [-5, 5]);
  const rotateX = useTransform(sy, [-0.5, 0.5], [4, -4]);
  const glowX = useTransform(sx, [-0.5, 0.5], [40, -40]);
  const glowY = useTransform(sy, [-0.5, 0.5], [30, -30]);

  /* ---------- data ---------- */
  useEffect(() => {
    const fetchTemplate = async () => {
      try {
        const res = await apiClient.get(`/public/template/${id}`);
        if (res.data?.status === "success") setTemplate(res.data.data);
        else setError(true);
      } catch {
        setError(true);
      } finally {
        setLoading(false);
      }
    };
    fetchTemplate();
  }, [id]);

  const schema = useMemo(() => {
    if (!template) return null;
    try {
      return typeof template.design_schema === "string"
        ? JSON.parse(template.design_schema)
        : template.design_schema;
    } catch {
      return null;
    }
  }, [template]);

  const previewData = useMemo(() => {
    if (!template) return null;
    const gallery = template.galleryUrls ?? [];
    const displayImage = gallery[0] || template.thumbnailUrl;
    return normalizeData({
      names: {
        bride: schema?.core_names_config?.bride?.label || "Sarah",
        groom: schema?.core_names_config?.groom?.label || "Ahmed",
      },
      title: template.name,
      event: { date: "2026-12-12", time: "18:00" },
      venue: { name: "The Grand Ballroom", address: "Lahore", mapUrl: "" },
      thumbnail: displayImage,
      gallery: gallery.length ? gallery : [displayImage],
      videos: template.videoUrls || [],
      music: template.musicUrls || [],
      slots: {},
    });
  }, [template, schema]);

  /* ---------- viewport: real phones get the native view, no desktop option ---------- */
  useEffect(() => {
    const update = () => setVp({ w: window.innerWidth, h: window.innerHeight });
    update();
    window.addEventListener("resize", update);
    return () => window.removeEventListener("resize", update);
  }, []);

  const isSmall = vp ? vp.w < 768 : false;
  const mode: "full" | "frame" = isSmall || device === "desktop" ? "full" : "frame";
  const fullDevice: "desktop" | "mobile" = isSmall ? "mobile" : "desktop";
  // the phone is scaled so the whole device always fits inside 100vh
  const scale = vp
    ? Math.min(1, Math.max(0.4, (vp.h - TOP_RESERVE - DOCK_RESERVE) / MOBILE_H))
    : 1;

  // reset scroll state whenever the view changes
  useEffect(() => {
    scrollProgress.set(0);
    lastY.current = 0;
    setDockVisible(true);
  }, [mode, fullDevice, scrollProgress]);

  const handleScroll = useCallback(
    (e: React.UIEvent<HTMLDivElement>, canHideDock: boolean) => {
      const el = e.currentTarget;
      const y = el.scrollTop;
      const max = el.scrollHeight - el.clientHeight;
      scrollProgress.set(max > 0 ? y / max : 0);
      if (!canHideDock) return;
      if (y > lastY.current + 6 && y > 120 && y < max - 8) setDockVisible(false);
      else if (y < lastY.current - 6 || y <= 120 || y >= max - 8) setDockVisible(true);
      lastY.current = y;
    },
    [scrollProgress]
  );

  const onRootMove = (e: React.PointerEvent) => {
    if (e.pointerType === "touch") return;
    if (e.clientY > window.innerHeight - 120) setDockVisible(true);
    if (mode === "frame" && !reduce) {
      tiltX.set(e.clientX / window.innerWidth - 0.5);
      tiltY.set(e.clientY / window.innerHeight - 0.5);
    }
  };

  /* ---------- audio ---------- */
  const toggleAudio = () => {
    const a = audioRef.current;
    if (!a) return;
    if (a.paused) a.play().catch(() => setIsPlaying(false));
    else a.pause();
  };

  /* ---------- lightbox ---------- */
  const gallery = template?.galleryUrls ?? [];
  const stepGallery = useCallback(
    (dir: number) => {
      setLightboxIdx((prev) => {
        if (prev === null || !gallery.length) return prev;
        setLightboxDir(dir);
        return (prev + dir + gallery.length) % gallery.length;
      });
    },
    [gallery.length]
  );

  useEffect(() => {
    if (lightboxIdx === null) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setLightboxIdx(null);
      if (e.key === "ArrowRight") stepGallery(1);
      if (e.key === "ArrowLeft") stepGallery(-1);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [lightboxIdx, stepGallery]);

  /* ---------- states ---------- */
  if (loading || !vp) {
    return (
      <div className="fixed inset-0 z-[99999] flex flex-col items-center justify-center gap-5 bg-[#0a0a0a]">
        <div className="relative flex h-20 w-20 items-center justify-center">
          <motion.span
            className="absolute inset-0 rounded-full border-2 border-orange-500/50"
            animate={{ scale: [1, 1.6], opacity: [0.7, 0] }}
            transition={{ duration: 1.4, repeat: Infinity, ease: "easeOut" }}
          />
          <div className="h-12 w-12 animate-spin rounded-full border-4 border-orange-500 border-t-transparent" />
        </div>
        <p className="text-sm font-medium text-neutral-500">Loading preview</p>
      </div>
    );
  }

  if (error || !template || !schema?.elements || !previewData) {
    return (
      <div className="fixed inset-0 z-[99999] flex flex-col items-center justify-center bg-[#0a0a0a] px-4 text-center">
        <h1 className="mb-2 text-2xl font-bold text-white">Preview unavailable</h1>
        <p className="mb-6 text-neutral-400">This template could not be rendered right now.</p>
        <Link
          href={`/template/${id}`}
          className="rounded-full bg-white/10 px-6 py-2 text-white transition-colors hover:bg-white/20"
        >
          Back to details
        </Link>
      </div>
    );
  }

  const pageBg = schema.pageSettings?.backgroundColor || "#ffffff";
  const darkScreen = isDarkColor(pageBg);
  const hasGallery = gallery.length > 0;
  const musicSrc = template.musicUrls?.[0];
  const hasMusic = !!musicSrc;
  const dockShown = mode === "frame" ? true : dockVisible;

  const renderElements = (d: "desktop" | "mobile") =>
    schema.elements.map((el: any) => (
      <div key={el.id} className="relative w-full">
        <WidgetRenderer element={resolveElement(el, previewData)} editing={false} device={d} />
      </div>
    ));

  return (
    <div
      className="fixed inset-0 z-[99999] flex flex-col overflow-hidden bg-[#0a0a0a]"
      onPointerMove={onRootMove}
    >
      {/* ================= FULL (desktop, or native on real phones) ================= */}
      <AnimatePresence mode="wait">
        {mode === "full" ? (
          <motion.div
            key={`full-${fullDevice}`}
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -16 }}
            transition={{ duration: 0.35, ease: [0.16, 1, 0.3, 1] }}
            onScroll={(e) => handleScroll(e, true)}
            className="absolute inset-0 overflow-y-auto overscroll-contain [&::-webkit-scrollbar]:hidden"
            style={{ background: pageBg }}
          >
            {schema.pageSettings?.customCss && (
              <style>{`@scope (.preview-canvas) { ${schema.pageSettings.customCss} }`}</style>
            )}
            <div
              className={`preview-canvas mx-auto w-full ${
                fullDevice === "desktop" ? "max-w-[1440px] shadow-2xl" : ""
              }`}
              style={{ background: pageBg }}
            >
              {/* no spacer: the template ends exactly where it ends */}
              {renderElements(fullDevice)}
            </div>
          </motion.div>
        ) : (
          /* ================= PHONE STAGE (fits 100vh) ================= */
          <motion.div
            key="frame"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.3 }}
            className="absolute inset-0 flex items-center justify-center"
            style={{ paddingTop: TOP_RESERVE, paddingBottom: DOCK_RESERVE }}
          >
            {/* stage ambience */}
            <div aria-hidden className="pointer-events-none absolute inset-0 overflow-hidden">
              <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_50%_40%,#2a1608_0%,#0a0a0a_70%)]" />
              <motion.div
                style={{ x: glowX, y: glowY }}
                className="absolute left-1/2 top-1/2 h-[520px] w-[520px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-orange-500/20 blur-[130px]"
              />
              <div
                className="absolute inset-0 opacity-30 [mask-image:radial-gradient(ellipse_at_center,black_20%,transparent_75%)]"
                style={{
                  backgroundImage: "radial-gradient(rgba(255,255,255,0.1) 1px, transparent 1px)",
                  backgroundSize: "32px 32px",
                }}
              />
            </div>

            {/* caption */}
            <div className="pointer-events-none absolute left-8 top-8 hidden max-w-[260px] lg:block">
              <p className="line-clamp-2 text-lg font-bold text-white">{template.name}</p>
              <p className="mt-1 text-xs font-medium text-neutral-500">
                Mobile preview · scroll inside the phone
              </p>
            </div>

            {/* phone */}
            <motion.div
              initial={{ opacity: 0, y: 40, scale: 0.94 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
              style={{ perspective: 1400 }}
            >
              <motion.div
                style={{
                  rotateX,
                  rotateY,
                  width: MOBILE_W * scale,
                  height: MOBILE_H * scale,
                }}
                className="relative"
              >
                {/* ground glow */}
                <div
                  aria-hidden
                  className="pointer-events-none absolute -bottom-6 left-1/2 h-10 w-[70%] -translate-x-1/2 rounded-[50%] bg-orange-500/40 blur-2xl"
                />
                <div
                  style={{
                    width: MOBILE_W,
                    height: MOBILE_H,
                    transform: `scale(${scale})`,
                    transformOrigin: "top left",
                  }}
                  className="relative"
                >
                  {/* side buttons */}
                  <span className="absolute -left-[3px] top-28 h-8 w-[3px] rounded-l bg-[#2a2a2a]" />
                  <span className="absolute -left-[3px] top-44 h-14 w-[3px] rounded-l bg-[#2a2a2a]" />
                  <span className="absolute -left-[3px] top-60 h-14 w-[3px] rounded-l bg-[#2a2a2a]" />
                  <span className="absolute -right-[3px] top-48 h-20 w-[3px] rounded-r bg-[#2a2a2a]" />

                  {/* bezel */}
                  <div className="relative h-full w-full rounded-[3.2rem] bg-gradient-to-b from-[#4a4a4a] via-[#1a1a1a] to-[#333] p-[10px] shadow-[0_40px_90px_-20px_rgba(249,115,22,0.45),0_0_0_1px_rgba(255,255,255,0.08)]">
                    {/* screen */}
                    <div
                      className="relative flex h-full w-full transform-gpu flex-col overflow-hidden rounded-[2.55rem]"
                      style={{ background: pageBg }}
                    >
                      {/* dynamic island */}
                      <div className="absolute left-1/2 top-2 z-50 flex h-7 w-24 -translate-x-1/2 items-center justify-end rounded-full bg-black pr-3">
                        <span className="h-2 w-2 rounded-full bg-[#1b2433] ring-1 ring-[#0f1620]" />
                      </div>

                      {/* status bar */}
                      <div
                        className={`relative z-40 flex h-11 shrink-0 items-center justify-between px-7 text-[12px] font-semibold ${
                          darkScreen ? "text-white" : "text-black"
                        }`}
                        style={{ background: pageBg }}
                      >
                        <span>9:41</span>
                        <span className="flex items-center gap-1">
                          <Signal className="h-3.5 w-3.5" />
                          <Wifi className="h-3.5 w-3.5" />
                          <BatteryFull className="h-4 w-4" />
                        </span>
                        {/* scroll progress */}
                        <motion.span
                          style={{ scaleX: progressX }}
                          className="absolute bottom-0 left-0 h-[2px] w-full origin-left bg-orange-500"
                        />
                      </div>

                      {/* scroller */}
                      <div
                        onScroll={(e) => handleScroll(e, false)}
                        className="min-h-0 flex-1 overflow-y-auto overscroll-contain [&::-webkit-scrollbar]:hidden"
                        style={{ background: pageBg }}
                      >
                        {schema.pageSettings?.customCss && (
                          <style>{`@scope (.preview-canvas-mobile) { ${schema.pageSettings.customCss} }`}</style>
                        )}
                        <div className="preview-canvas-mobile w-full">{renderElements("mobile")}</div>
                      </div>

                      {/* home indicator */}
                      <span
                        className={`pointer-events-none absolute bottom-1.5 left-1/2 z-40 h-1 w-28 -translate-x-1/2 rounded-full opacity-60 ${
                          darkScreen ? "bg-white" : "bg-black"
                        }`}
                      />
                    </div>
                  </div>
                </div>
              </motion.div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* page scroll progress (full view) */}
      {mode === "full" && (
        <motion.div
          aria-hidden
          style={{ scaleX: progressX }}
          className="pointer-events-none fixed inset-x-0 top-0 z-[100001] h-[3px] origin-left bg-gradient-to-r from-orange-500 to-amber-300"
        />
      )}

      {/* ================= MEDIA DOCK ================= */}
      {(hasMusic || hasGallery) && (
        <div
          className="fixed left-4 z-[100000] flex flex-col gap-3 sm:left-6"
          style={{ bottom: "calc(6rem + env(safe-area-inset-bottom, 0px))" }}
        >
          {hasMusic && (
            <>
              <audio
                ref={audioRef}
                src={musicSrc}
                loop
                onPlay={() => setIsPlaying(true)}
                onPause={() => setIsPlaying(false)}
                onTimeUpdate={(e) => {
                  const a = e.currentTarget;
                  if (a.duration) setProgress(a.currentTime / a.duration);
                }}
              />
              <motion.button
                type="button"
                onClick={toggleAudio}
                aria-label={isPlaying ? "Pause music" : "Play music"}
                whileHover={{ scale: 1.08 }}
                whileTap={{ scale: 0.93 }}
                className={`relative flex h-14 w-14 items-center justify-center rounded-full border border-white/20 text-white shadow-2xl backdrop-blur-xl transition-colors ${
                  isPlaying ? "bg-orange-500" : "bg-black/60 hover:bg-black/80"
                }`}
              >
                {isPlaying && !reduce && (
                  <motion.span
                    aria-hidden
                    className="pointer-events-none absolute inset-0 rounded-full border border-orange-400/60"
                    animate={{ scale: [1, 1.5], opacity: [0.7, 0] }}
                    transition={{ duration: 1.6, repeat: Infinity, ease: "easeOut" }}
                  />
                )}
                <svg className="pointer-events-none absolute inset-0 -rotate-90" viewBox="0 0 56 56">
                  <circle
                    cx="28"
                    cy="28"
                    r="24"
                    fill="none"
                    strokeWidth="3"
                    strokeLinecap="round"
                    stroke="white"
                    strokeDasharray={RING_C}
                    strokeDashoffset={RING_C * (1 - (isPlaying ? progress : 0))}
                    className="transition-[stroke-dashoffset] duration-300"
                  />
                </svg>
                {isPlaying ? (
                  <div className="flex h-4 items-end gap-1">
                    {[0.8, 0.6, 0.9, 0.7].map((d, i) => (
                      <motion.span
                        key={i}
                        animate={{ height: ["30%", "100%", "30%"] }}
                        transition={{ repeat: Infinity, duration: d, ease: "easeInOut", delay: i * 0.1 }}
                        className="w-1 rounded-full bg-white"
                      />
                    ))}
                  </div>
                ) : (
                  <Music className="h-6 w-6" />
                )}
              </motion.button>
            </>
          )}

          {hasGallery && (
            <motion.button
              type="button"
              onClick={() => {
                setLightboxDir(1);
                setLightboxIdx(0);
              }}
              aria-label="Open gallery"
              whileHover={{ scale: 1.08 }}
              whileTap={{ scale: 0.93 }}
              className="flex h-14 w-14 items-center justify-center rounded-full border border-white/20 bg-black/60 text-white shadow-2xl backdrop-blur-xl transition-colors hover:bg-black/80"
            >
              <ImageIcon className="h-6 w-6" />
            </motion.button>
          )}
        </div>
      )}

      {/* ================= CONTROL DOCK ================= */}
      <div
        className="pointer-events-none fixed inset-x-0 bottom-0 z-[100000] flex justify-center px-4"
        style={{ paddingBottom: "calc(1.5rem + env(safe-area-inset-bottom, 0px))" }}
      >
        <motion.div
          initial={{ y: 60, opacity: 0 }}
          animate={{ y: dockShown ? 0 : 140, opacity: dockShown ? 1 : 0 }}
          transition={{ type: "spring", damping: 26, stiffness: 220 }}
          className={`w-full max-w-2xl ${dockShown ? "pointer-events-auto" : "pointer-events-none"}`}
        >
          <div className="flex items-center justify-between gap-3 rounded-full border border-white/10 bg-[#141414]/90 p-2 shadow-[0_20px_60px_-15px_rgba(0,0,0,0.8)] backdrop-blur-xl">
            <Link
              href={`/template/${id}`}
              aria-label="Back to details"
              className="group flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-white/10 text-white transition-colors hover:bg-white/20"
            >
              <ArrowLeft className="h-5 w-5 transition-transform group-hover:-translate-x-1" />
            </Link>

            {isSmall ? (
              <p className="min-w-0 flex-1 truncate px-1 text-sm font-semibold text-white">{template.name}</p>
            ) : (
              <div className="relative flex items-center rounded-full bg-black/40 p-1 ring-1 ring-white/5">
                {(
                  [
                    { key: "desktop", label: "Desktop", Icon: Monitor },
                    { key: "mobile", label: "Mobile", Icon: Smartphone },
                  ] as const
                ).map(({ key, label, Icon }) => (
                  <button
                    key={key}
                    type="button"
                    onClick={() => setDevice(key)}
                    className={`relative flex items-center gap-2 rounded-full px-4 py-1.5 text-xs font-bold transition-colors ${
                      device === key ? "text-white" : "text-neutral-400 hover:text-white"
                    }`}
                  >
                    {device === key && (
                      <motion.span
                        layoutId="device-pill"
                        className="absolute inset-0 rounded-full bg-[#2f2f2f] shadow-sm ring-1 ring-white/10"
                        transition={{ type: "spring", stiffness: 400, damping: 32 }}
                      />
                    )}
                    <span className="relative flex items-center gap-2">
                      <Icon className="h-3.5 w-3.5" /> {label}
                    </span>
                  </button>
                ))}
              </div>
            )}

            <div className="flex shrink-0 items-center gap-3">
              <span className="hidden items-center gap-1 text-xs font-semibold text-emerald-400 sm:flex">
                <ShieldCheck className="h-3.5 w-3.5" /> Secure
              </span>
              <Link
                href={`/checkout/template/${template.id}`}
                className={`group relative flex items-center gap-2 overflow-hidden rounded-full px-5 py-2.5 text-sm font-bold text-white transition-transform hover:scale-105 active:scale-95 ${primaryBtn}`}
              >
                {!reduce && (
                  <motion.span
                    aria-hidden
                    className="pointer-events-none absolute inset-y-0 -left-1/3 w-1/3 -skew-x-12 bg-gradient-to-r from-transparent via-white/40 to-transparent"
                    animate={{ x: ["0%", "450%"] }}
                    transition={{ duration: 2, repeat: Infinity, repeatDelay: 2.2, ease: "easeInOut" }}
                  />
                )}
                <span className="relative">Buy Rs {template.price.toLocaleString()}</span>
                <ArrowRight className="relative h-4 w-4 transition-transform group-hover:translate-x-1" />
              </Link>
            </div>
          </div>
        </motion.div>
      </div>

      {/* ================= LIGHTBOX ================= */}
      <AnimatePresence>
        {lightboxIdx !== null && hasGallery && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[1000000] flex flex-col items-center justify-center bg-black/95 backdrop-blur-xl"
            onClick={() => setLightboxIdx(null)}
          >
            <div className="absolute left-0 right-0 top-0 z-50 flex items-center justify-between p-4 sm:p-6">
              <span className="rounded-full bg-white/10 px-4 py-1.5 text-sm font-semibold tabular-nums text-white backdrop-blur-md">
                {lightboxIdx + 1} / {gallery.length}
              </span>
              <button
                type="button"
                aria-label="Close gallery"
                onClick={(e) => {
                  e.stopPropagation();
                  setLightboxIdx(null);
                }}
                className="flex h-12 w-12 items-center justify-center rounded-full bg-white/10 text-white backdrop-blur-md transition-colors hover:bg-white/20"
              >
                <X className="h-6 w-6" />
              </button>
            </div>

            {gallery.length > 1 && (
              <>
                <button
                  type="button"
                  aria-label="Previous image"
                  onClick={(e) => {
                    e.stopPropagation();
                    stepGallery(-1);
                  }}
                  className="absolute left-4 top-1/2 z-50 flex h-12 w-12 -translate-y-1/2 items-center justify-center rounded-full bg-white/10 text-white backdrop-blur-md transition-colors hover:bg-white/20 sm:left-8"
                >
                  <ChevronLeft className="h-6 w-6" />
                </button>
                <button
                  type="button"
                  aria-label="Next image"
                  onClick={(e) => {
                    e.stopPropagation();
                    stepGallery(1);
                  }}
                  className="absolute right-4 top-1/2 z-50 flex h-12 w-12 -translate-y-1/2 items-center justify-center rounded-full bg-white/10 text-white backdrop-blur-md transition-colors hover:bg-white/20 sm:right-8"
                >
                  <ChevronRight className="h-6 w-6" />
                </button>
              </>
            )}

            <div
              className="relative mt-14 h-[70vh] w-full max-w-6xl px-4 sm:px-16"
              onClick={(e) => e.stopPropagation()}
            >
              <AnimatePresence mode="wait" custom={lightboxDir}>
                <motion.div
                  key={lightboxIdx}
                  custom={lightboxDir}
                  variants={{
                    enter: (d: number) => ({ opacity: 0, x: d * 60, scale: 0.97 }),
                    center: { opacity: 1, x: 0, scale: 1 },
                    exit: (d: number) => ({ opacity: 0, x: d * -60, scale: 0.97 }),
                  }}
                  initial="enter"
                  animate="center"
                  exit="exit"
                  transition={{ duration: 0.28, ease: "easeOut" }}
                  drag={gallery.length > 1 ? "x" : false}
                  dragConstraints={{ left: 0, right: 0 }}
                  dragElastic={0.25}
                  onDragEnd={(_, info) => {
                    if (info.offset.x < -80) stepGallery(1);
                    else if (info.offset.x > 80) stepGallery(-1);
                  }}
                  className="relative h-full w-full cursor-grab active:cursor-grabbing"
                >
                  <Image
                    src={gallery[lightboxIdx]}
                    alt={`Gallery ${lightboxIdx + 1}`}
                    fill
                    sizes="100vw"
                    priority
                    draggable={false}
                    className="select-none rounded-2xl object-contain"
                  />
                </motion.div>
              </AnimatePresence>
            </div>

            {gallery.length > 1 && (
              <div
                className="mt-5 flex max-w-full gap-2 overflow-x-auto px-4 pb-2 [&::-webkit-scrollbar]:hidden"
                onClick={(e) => e.stopPropagation()}
              >
                {gallery.map((src, i) => (
                  <button
                    key={src + i}
                    type="button"
                    aria-label={`Go to image ${i + 1}`}
                    onClick={() => {
                      setLightboxDir(i > lightboxIdx ? 1 : -1);
                      setLightboxIdx(i);
                    }}
                    className={`relative h-14 w-14 shrink-0 overflow-hidden rounded-xl transition-all ${
                      i === lightboxIdx
                        ? "opacity-100 ring-2 ring-orange-500"
                        : "opacity-50 hover:opacity-90"
                    }`}
                  >
                    <Image src={src} alt="" fill sizes="56px" className="object-cover" />
                  </button>
                ))}
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}