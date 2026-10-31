"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import {
  AnimatePresence,
  animate,
  motion,
  useMotionTemplate,
  useMotionValue,
  usePresence,
  useReducedMotion,
  useSpring,
  useTransform,
  Variants,
} from "framer-motion";
import {
  X, Sparkles, Check, ArrowRight, Eye, FileText, Smartphone, Monitor,
  LayoutTemplate, Zap, Play, Music, Image as ImageIcon, Mic2,
  Maximize2, Minimize2, ChevronLeft, ChevronRight, ShieldCheck,
} from "lucide-react";

import { WidgetRenderer } from "@/components/admin/sections/templates/WidgetRenderer";
import { resolveElement, normalizeData } from "@/lib/elementor/invitation-data";

/* -------------------------------------------------------------------------- */
/*  Constants                                                                 */
/* -------------------------------------------------------------------------- */

const EASE = [0.16, 1, 0.3, 1] as const;
const DESKTOP_W = 1440;
const DESKTOP_H = 900;
const MOBILE_W = 390;
const MOBILE_H = 844;
const RING_C = 2 * Math.PI * 29;

const formatter = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "PKR",
  maximumFractionDigits: 0,
});

const hideScrollbar =
  "[&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]";
const focusRing =
  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-400/80 focus-visible:ring-offset-2 focus-visible:ring-offset-[#0a0a0a]";

const containerVariants: Variants = {
  hidden: { opacity: 0 },
  show: { opacity: 1, transition: { staggerChildren: 0.08, delayChildren: 0.15 } },
  exit: { opacity: 0, transition: { duration: 0.2 } },
};

const itemVariants: Variants = {
  hidden: { opacity: 0, y: 28, filter: "blur(6px)" },
  show: {
    opacity: 1,
    y: 0,
    filter: "blur(0px)",
    transition: { type: "spring", stiffness: 260, damping: 24 },
  },
};

const lightboxSlide = {
  enter: (d: number) => ({ opacity: 0, x: d * 80, scale: 0.96 }),
  center: { opacity: 1, x: 0, scale: 1 },
  exit: (d: number) => ({ opacity: 0, x: d * -80, scale: 0.96 }),
};

export type TemplateData = {
  id: string;
  name: string;
  description: string | null;
  thumbnailUrl: string;
  galleryUrls: string[];
  videoUrls: string[];
  musicUrls: string[];
  isPremium: boolean;
  price: number;
  categoryName: string;
  design_schema: any;
  lyrics?: string | null;
};

type Lightbox =
  | { type: "image"; index: number }
  | { type: "video"; url: string }
  | null;

/* -------------------------------------------------------------------------- */
/*  Small motion primitives                                                   */
/* -------------------------------------------------------------------------- */

/** Headline that rises word by word out of a mask. */
function SplitTitle({ text, reduce }: { text: string; reduce: boolean }) {
  return (
    <h2
      aria-label={text}
      className="font-[family-name:var(--font-display)] text-3xl font-bold leading-[1.08] tracking-tight text-white sm:text-4xl lg:text-6xl"
    >
      {text.split(" ").map((word, i) => (
        <span key={i} className="mr-[0.25em] inline-block overflow-hidden pb-[0.12em] align-bottom">
          <motion.span
            aria-hidden
            className="inline-block origin-bottom-left"
            initial={reduce ? false : { y: "115%", rotate: 5 }}
            animate={{ y: 0, rotate: 0 }}
            transition={{ delay: 0.3 + i * 0.07, duration: 0.85, ease: EASE }}
          >
            {word}
          </motion.span>
        </span>
      ))}
    </h2>
  );
}

/** Price that counts up from zero. */
function Price({ value, reduce }: { value: number; reduce: boolean }) {
  const mv = useMotionValue(reduce ? value : 0);
  const text = useTransform(mv, (v) => (value > 0 ? formatter.format(Math.round(v)) : "Free"));

  useEffect(() => {
    if (reduce) {
      mv.set(value);
      return;
    }
    const controls = animate(mv, value, { duration: 1.6, delay: 0.6, ease: EASE });
    return () => controls.stop();
  }, [value, reduce, mv]);

  return <motion.span>{text}</motion.span>;
}

/** Surface with a soft glow that follows the cursor. */
function Spotlight({
  className = "",
  children,
}: {
  className?: string;
  children: React.ReactNode;
}) {
  const x = useMotionValue(-300);
  const y = useMotionValue(-300);
  const background = useMotionTemplate`radial-gradient(280px circle at ${x}px ${y}px, rgba(249,115,22,0.16), transparent 70%)`;

  return (
    <div
      onMouseMove={(e) => {
        const r = e.currentTarget.getBoundingClientRect();
        x.set(e.clientX - r.left);
        y.set(e.clientY - r.top);
      }}
      className={`group/spot relative ${className}`}
    >
      <motion.div
        aria-hidden
        style={{ background }}
        className="pointer-events-none absolute inset-0 rounded-[inherit] opacity-0 transition-opacity duration-300 group-hover/spot:opacity-100"
      />
      {children}
    </div>
  );
}

/** Pulls its child slightly toward the cursor. */
function Magnetic({ children, reduce }: { children: React.ReactNode; reduce: boolean }) {
  const mx = useMotionValue(0);
  const my = useMotionValue(0);
  const x = useSpring(mx, { stiffness: 220, damping: 16 });
  const y = useSpring(my, { stiffness: 220, damping: 16 });

  return (
    <motion.div
      style={{ x, y }}
      onMouseMove={
        reduce
          ? undefined
          : (e) => {
              const r = e.currentTarget.getBoundingClientRect();
              mx.set((e.clientX - (r.left + r.width / 2)) * 0.12);
              my.set((e.clientY - (r.top + r.height / 2)) * 0.25);
            }
      }
      onMouseLeave={() => {
        mx.set(0);
        my.set(0);
      }}
    >
      {children}
    </motion.div>
  );
}

/** Sliding segmented control for Desktop / Mobile. */
function DeviceSwitch({
  device,
  setDevice,
  layoutId,
  compact,
}: {
  device: "desktop" | "mobile";
  setDevice: (d: "desktop" | "mobile") => void;
  layoutId: string;
  compact?: boolean;
}) {
  const options = [
    { id: "desktop" as const, label: "Desktop", Icon: Monitor },
    { id: "mobile" as const, label: "Mobile", Icon: Smartphone },
  ];
  return (
    <div
      role="tablist"
      aria-label="Preview device"
      className="flex items-center gap-1 rounded-2xl bg-black/50 p-1.5 ring-1 ring-white/10 backdrop-blur-xl"
    >
      {options.map(({ id, label, Icon }) => {
        const active = device === id;
        return (
          <button
            key={id}
            role="tab"
            aria-selected={active}
            onClick={() => setDevice(id)}
            className={`relative flex items-center gap-2 rounded-xl text-sm font-semibold transition-colors ${focusRing} ${
              compact ? "px-4 py-2" : "px-6 py-2.5"
            } ${active ? "text-white" : "text-neutral-500 hover:text-neutral-200"}`}
          >
            {active && (
              <motion.span
                layoutId={layoutId}
                className="absolute inset-0 rounded-xl bg-gradient-to-b from-white/15 to-white/5 shadow-[inset_0_1px_0_rgba(255,255,255,0.15)]"
                transition={{ type: "spring", bounce: 0.2, duration: 0.6 }}
              />
            )}
            <Icon className="relative z-10 h-4 w-4" />
            <span className="relative z-10">{label}</span>
          </button>
        );
      })}
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/*  Hero panel: tilt image, audio orb with progress ring, lyrics              */
/* -------------------------------------------------------------------------- */

function HeroPanel({
  template,
  image,
  reduce,
}: {
  template: TemplateData;
  image: string;
  reduce: boolean;
}) {
  const audioRef = useRef<HTMLAudioElement>(null);
  const fadeRef = useRef<number | undefined>(undefined);
  const [isPlaying, setIsPlaying] = useState(false);
  const [showLyrics, setShowLyrics] = useState(false);
  const [progress, setProgress] = useState(0);

  const hasAudio = template.musicUrls?.length > 0;
  const hasRealLyrics = !!template.lyrics && template.lyrics.trim().length > 0;

  const px = useMotionValue(0);
  const py = useMotionValue(0);
  const sx = useSpring(px, { stiffness: 110, damping: 20 });
  const sy = useSpring(py, { stiffness: 110, damping: 20 });
  const rotateY = useTransform(sx, [-0.5, 0.5], [-1.2, 1.2]);
  const rotateX = useTransform(sy, [-0.5, 0.5], [1.2, -1.2]);
  const shiftX = useTransform(sx, [-0.5, 0.5], [8, -8]);
  const shiftY = useTransform(sy, [-0.5, 0.5], [8, -8]);

  useEffect(
    () => () => {
      window.clearInterval(fadeRef.current);
      audioRef.current?.pause();
    },
    []
  );

  const fadeTo = (target: number, done?: () => void) => {
    const a = audioRef.current;
    if (!a) return;
    window.clearInterval(fadeRef.current);
    fadeRef.current = window.setInterval(() => {
      const diff = target - a.volume;
      if (Math.abs(diff) <= 0.06) {
        a.volume = target;
        window.clearInterval(fadeRef.current);
        done?.();
      } else {
        a.volume = Math.min(1, Math.max(0, a.volume + Math.sign(diff) * 0.05));
      }
    }, 50);
  };

  const toggleAudio = async (e: React.MouseEvent) => {
    e.stopPropagation();
    const a = audioRef.current;
    if (!a) return;
    if (isPlaying) {
      setIsPlaying(false);
      fadeTo(0, () => {
        a.pause();
        a.volume = 1;
      });
    } else {
      a.volume = 0;
      try {
        await a.play();
        setIsPlaying(true);
        fadeTo(1);
      } catch {
        setIsPlaying(false);
      }
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, x: -50 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -50 }}
      transition={{ duration: 0.6, ease: EASE }}
      onMouseMove={
        reduce
          ? undefined
          : (e) => {
              const r = e.currentTarget.getBoundingClientRect();
              px.set((e.clientX - r.left) / r.width - 0.5);
              py.set((e.clientY - r.top) / r.height - 0.5);
            }
      }
      onMouseLeave={() => {
        px.set(0);
        py.set(0);
      }}
      className="relative h-[35dvh] w-full shrink-0 overflow-hidden bg-neutral-900 [perspective:1200px] md:h-auto md:w-[45%] lg:w-[50%]"
    >
      <motion.div
        style={reduce ? undefined : { rotateX, rotateY, x: shiftX, y: shiftY, scale: 1.08 }}
        className="absolute inset-0"
      >
        <motion.div
          initial={reduce ? false : { scale: 1.25, opacity: 0, filter: "blur(16px)" }}
          animate={
            reduce
              ? { scale: 1, opacity: 1 }
              : { scale: [1.0, 1.04], opacity: 1, filter: "blur(0px)" }
          }
          transition={{
            opacity: { duration: 1.2, ease: EASE },
            filter: { duration: 1.2, ease: EASE },
            scale: reduce
              ? { duration: 0 }
              : { duration: 14, ease: "easeInOut", repeat: Infinity, repeatType: "reverse" },
          }}
          className="absolute inset-0"
        >
          <Image
            src={image}
            alt={template.name}
            fill
            priority
            quality={90}
            sizes="(max-width: 768px) 100vw, 50vw"
            className="object-cover"
          />
        </motion.div>
      </motion.div>

      <div className="pointer-events-none absolute inset-0 bg-gradient-to-tr from-orange-500/10 via-transparent to-indigo-500/10 mix-blend-overlay" />
      <div className="pointer-events-none absolute inset-x-0 bottom-0 h-40 bg-gradient-to-t from-black/85 to-transparent" />
      <div className="pointer-events-none absolute inset-y-0 right-0 hidden w-24 bg-gradient-to-l from-[#0a0a0a]/70 to-transparent md:block" />

      {template.isPremium && (
        <motion.div
          initial={{ opacity: 0, x: -24, scale: 0.9 }}
          animate={{ opacity: 1, x: 0, scale: 1 }}
          transition={{ delay: 0.5, type: "spring", stiffness: 260, damping: 20 }}
          className="absolute left-6 top-6 flex items-center gap-2 overflow-hidden rounded-full bg-gradient-to-r from-orange-500 to-amber-500 px-4 py-2 text-sm font-bold text-white shadow-[0_0_30px_-5px_rgba(249,115,22,0.8)] sm:left-8 sm:top-8"
        >
          <Sparkles className="h-4 w-4" />
          Premium design
          {!reduce && (
            <motion.span
              aria-hidden
              className="absolute inset-y-0 w-10 -skew-x-12 bg-white/40 blur-sm"
              initial={{ x: "-200%" }}
              animate={{ x: "700%" }}
              transition={{ duration: 1.4, ease: "easeInOut", repeat: Infinity, repeatDelay: 3.5 }}
            />
          )}
        </motion.div>
      )}

      {hasAudio && (
        <div className="absolute bottom-6 right-6 z-20 flex items-center gap-3 sm:bottom-8 sm:right-8">
          <audio
            ref={audioRef}
            src={template.musicUrls[0]}
            loop
            onTimeUpdate={(e) => {
              const a = e.currentTarget;
              if (a.duration) setProgress(a.currentTime / a.duration);
            }}
          />

          <AnimatePresence>
            {isPlaying && hasRealLyrics && (
              <motion.button
                initial={{ opacity: 0, x: 20, scale: 0.9 }}
                animate={{ opacity: 1, x: 0, scale: 1 }}
                exit={{ opacity: 0, x: 20, scale: 0.9 }}
                onClick={() => setShowLyrics((s) => !s)}
                aria-pressed={showLyrics}
                className={`flex h-12 items-center gap-2 rounded-full border border-white/20 px-5 text-sm font-semibold shadow-2xl backdrop-blur-xl transition-colors ${focusRing} ${
                  showLyrics ? "bg-white text-black" : "bg-black/40 text-white hover:bg-black/60"
                }`}
              >
                <Mic2 className="h-4 w-4" /> Lyrics
              </motion.button>
            )}
          </AnimatePresence>

          <motion.button
            onClick={toggleAudio}
            whileHover={{ scale: 1.06 }}
            whileTap={{ scale: 0.92 }}
            aria-label={isPlaying ? "Pause music" : "Play music"}
            className={`group relative flex h-16 w-16 items-center justify-center rounded-full border border-white/20 shadow-2xl backdrop-blur-xl transition-colors ${focusRing} ${
              isPlaying ? "bg-orange-500/90 text-white" : "bg-black/40 text-white hover:bg-black/60"
            }`}
          >
            {isPlaying && !reduce && (
              <motion.span
                aria-hidden
                className="absolute inset-0 rounded-full border border-orange-300"
                initial={{ scale: 1, opacity: 0.7 }}
                animate={{ scale: 1.7, opacity: 0 }}
                transition={{ duration: 1.6, ease: "easeOut", repeat: Infinity }}
              />
            )}
            <svg className="absolute inset-0 -rotate-90" viewBox="0 0 64 64" aria-hidden>
              <circle
                cx="32" cy="32" r="29" fill="none" strokeWidth="2.5"
                strokeLinecap="round" stroke="white"
                strokeDasharray={RING_C}
                strokeDashoffset={RING_C * (1 - (isPlaying ? progress : 0))}
                className="transition-[stroke-dashoffset] duration-300 ease-linear"
              />
            </svg>
            {isPlaying ? (
              <div className="flex h-5 items-end gap-1">
                {[0.8, 0.6, 0.9, 0.7].map((d, i) => (
                  <motion.span
                    key={i}
                    animate={reduce ? { height: "70%" } : { height: ["30%", "100%", "30%"] }}
                    transition={{ repeat: Infinity, duration: d, ease: "easeInOut", delay: i * 0.1 }}
                    className="w-1 rounded-full bg-white"
                  />
                ))}
              </div>
            ) : (
              <Music className="h-6 w-6 transition-transform group-hover:scale-110" />
            )}
          </motion.button>
        </div>
      )}

      <AnimatePresence>
        {showLyrics && hasRealLyrics && (
          <motion.div
            initial={{ opacity: 0, y: 24, scale: 0.95, filter: "blur(8px)" }}
            animate={{ opacity: 1, y: 0, scale: 1, filter: "blur(0px)" }}
            exit={{ opacity: 0, y: 24, scale: 0.95, filter: "blur(8px)" }}
            transition={{ type: "spring", stiffness: 260, damping: 24 }}
            className="absolute bottom-6 left-6 z-10 max-h-[50%] w-72 overflow-y-auto rounded-2xl border border-white/20 bg-black/60 p-6 shadow-2xl backdrop-blur-2xl sm:bottom-8 sm:left-8 sm:w-80"
          >
            <h4 className="mb-3 flex items-center gap-2 text-xs font-semibold text-orange-400">
              <span className="relative flex h-2 w-2">
                {!reduce && (
                  <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-orange-400 opacity-75" />
                )}
                <span className="relative inline-flex h-2 w-2 rounded-full bg-orange-500" />
              </span>
              Now playing
            </h4>
            <p className="whitespace-pre-line font-[family-name:var(--font-display)] text-sm leading-relaxed text-white">
              {template.lyrics}
            </p>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}

/* -------------------------------------------------------------------------- */
/*  Modal content                                                             */
/* -------------------------------------------------------------------------- */

function ModalContent({
  template,
  onClose,
}: {
  template: TemplateData;
  onClose: () => void;
}) {
  const reduce = useReducedMotion() ?? false;
  const [activeTab, setActiveTab] = useState<"details" | "live">("details");
  const [device, setDevice] = useState<"desktop" | "mobile">("desktop");
  const [scale, setScale] = useState(1);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [canvasReady, setCanvasReady] = useState(false);
  const [lightbox, setLightbox] = useState<Lightbox>(null);
  const [dir, setDir] = useState(1);
  const [stageEl, setStageEl] = useState<HTMLDivElement | null>(null);
  const closeRef = useRef<HTMLButtonElement>(null);

  const gallery = template.galleryUrls ?? [];
  const displayImage = gallery[0] || template.thumbnailUrl;

  /* Lock page scroll while open, focus the close button. */
  useEffect(() => {
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    closeRef.current?.focus();
    return () => {
      document.body.style.overflow = prev;
    };
  }, []);

  /* Safety net: if any exit animation hangs, force removal and release the page. */
  const [isPresent, safeToRemove] = usePresence();
  useEffect(() => {
    if (isPresent) return;
    document.body.style.overflow = "";
    setLightbox(null);
    const t = window.setTimeout(() => safeToRemove?.(), 450);
    return () => window.clearTimeout(t);
  }, [isPresent, safeToRemove]);

  const stepLightbox = useCallback(
    (delta: number) => {
      setLightbox((lb) => {
        if (!lb || lb.type !== "image" || gallery.length < 2) return lb;
        setDir(delta);
        return { type: "image", index: (lb.index + delta + gallery.length) % gallery.length };
      });
    },
    [gallery.length]
  );

  /* Keyboard: Esc unwinds one layer at a time, arrows browse the lightbox. */
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        if (lightbox) setLightbox(null);
        else if (isFullscreen) setIsFullscreen(false);
        else onClose();
      } else if (lightbox?.type === "image") {
        if (e.key === "ArrowRight") stepLightbox(1);
        if (e.key === "ArrowLeft") stepLightbox(-1);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [lightbox, isFullscreen, onClose, stepLightbox]);

  /* Fit the device frame to the stage. */
  useEffect(() => {
    if (activeTab !== "live" || !stageEl) return;
    const calc = () => {
      const rect = stageEl.getBoundingClientRect();
      const tw = device === "mobile" ? MOBILE_W : DESKTOP_W;
      const th = device === "mobile" ? MOBILE_H : DESKTOP_H;
      const padX = isFullscreen ? 60 : device === "mobile" ? 40 : 60;
      const padY = isFullscreen ? 60 : 40;
      setScale(
        Math.max(0.1, Math.min((rect.width - padX) / tw, (rect.height - padY) / th, isFullscreen ? 2 : 1.2))
      );
    };
    calc();
    const ro = new ResizeObserver(calc);
    ro.observe(stageEl);
    return () => ro.disconnect();
  }, [activeTab, device, isFullscreen, stageEl]);

  /* Short skeleton while the frame swaps device. */
  useEffect(() => {
    if (activeTab !== "live") return;
    setCanvasReady(false);
    const t = setTimeout(() => setCanvasReady(true), reduce ? 0 : 550);
    return () => clearTimeout(t);
  }, [activeTab, device, reduce]);

  const schema = useMemo(() => {
    try {
      return typeof template.design_schema === "string"
        ? JSON.parse(template.design_schema)
        : template.design_schema;
    } catch (e) {
      console.error("Failed to parse design schema", e);
      return null;
    }
  }, [template.design_schema]);

  const previewData = useMemo(
    () =>
      normalizeData({
        names: {
          bride: schema?.core_names_config?.bride?.label || "Sarah",
          groom: schema?.core_names_config?.groom?.label || "Ahmed",
        },
        title: template.name,
        event: { date: "2026-12-12", time: "18:00" },
        venue: { name: "The Grand Ballroom", address: "Lahore", mapUrl: "" },
        thumbnail: displayImage,
        gallery: gallery.length ? gallery : [displayImage],
        videos: template.videoUrls,
        music: template.musicUrls,
        slots: {},
      }),
    [schema, template, displayImage, gallery]
  );

  const chips = [
    { Icon: ImageIcon, label: `${gallery.length || 1} ${gallery.length === 1 || !gallery.length ? "photo" : "photos"}` },
    ...(template.videoUrls?.length ? [{ Icon: Play, label: "Background video" }] : []),
    ...(template.musicUrls?.length ? [{ Icon: Music, label: "Music" }] : []),
  ];

  const features = [
    { label: "Fully responsive", Icon: Zap },
    { label: "Real-time RSVPs", Icon: Check },
    { label: "Customizable elements", Icon: LayoutTemplate },
    { label: "Music and video", Icon: Music },
  ];

  const renderLiveCanvas = () => {
    if (!schema?.elements || !Array.isArray(schema.elements) || schema.elements.length === 0) {
      return (
        <motion.div
          key="empty"
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0 }}
          className="flex h-full w-full flex-col items-center justify-center gap-4 p-6 text-center"
        >
          <div className="rounded-2xl bg-white/5 p-4 ring-1 ring-white/10 backdrop-blur-md">
            <LayoutTemplate className="h-10 w-10 text-neutral-400" />
          </div>
          <div>
            <h3 className="text-lg font-bold text-neutral-200">No design saved yet</h3>
            <p className="mt-1 text-sm text-neutral-500">Open this template in the editor and save a design to preview it here.</p>
          </div>
        </motion.div>
      );
    }

    const pageCss = [
      schema.pageSettings?.customCss,
      schema.pageSettings?.customCodeLang === "css" ? schema.pageSettings.customCode : "",
    ]
      .filter(Boolean)
      .join("\n")
      .replace(/<\/style/gi, "");

    const isMobile = device === "mobile";
    const W = isMobile ? MOBILE_W : DESKTOP_W;
    const H = isMobile ? MOBILE_H : DESKTOP_H;

    return (
      <motion.div
        key={device}
        initial={reduce ? false : { opacity: 0, scale: 0.96, y: 16, filter: "blur(6px)" }}
        animate={{ opacity: 1, scale: 1, y: 0, filter: "blur(0px)" }}
        exit={reduce ? undefined : { opacity: 0, scale: 0.96, y: -16, filter: "blur(6px)" }}
        transition={{ type: "spring", stiffness: 240, damping: 28 }}
        style={{ width: W * scale, height: H * scale }}
        className="relative flex items-center justify-center [perspective:1200px]"
      >
        {/* Floor glow under the device */}
        {!isFullscreen && (
          <div
            aria-hidden
            className="pointer-events-none absolute -bottom-6 left-1/2 h-16 w-[70%] -translate-x-1/2 rounded-full bg-orange-500/25 blur-3xl"
          />
        )}

        <div
          className={`absolute left-1/2 top-0 overflow-y-auto bg-white ${hideScrollbar} ${
            isFullscreen
              ? "rounded-none border-none shadow-none"
              : isMobile
              ? "rounded-[2.5rem] border-[10px] border-neutral-800 shadow-[0_0_80px_-20px_rgba(0,0,0,0.8)] ring-1 ring-white/10"
              : "rounded-xl border border-neutral-800 shadow-[0_20px_80px_-20px_rgba(0,0,0,0.9)]"
          }`}
          style={{
            width: W,
            height: H,
            transform: `translateX(-50%) scale(${scale})`,
            transformOrigin: "top center",
          }}
          onDoubleClick={() => setIsFullscreen((f) => !f)}
        >
          {!isMobile && !isFullscreen && (
            <div className="sticky top-0 z-50 flex h-11 items-center gap-3 border-b border-neutral-200 bg-[#f5f5f5] px-4">
              <div className="flex gap-2">
                <span className="h-3 w-3 rounded-full bg-[#ff5f56]" />
                <span className="h-3 w-3 rounded-full bg-[#ffbd2e]" />
                <span className="h-3 w-3 rounded-full bg-[#27c93f]" />
              </div>
              <div className="mx-auto flex w-full max-w-md items-center justify-center gap-2 rounded-md border border-neutral-300 bg-white px-3 py-1.5">
                <ShieldCheck className="h-3.5 w-3.5 text-emerald-500" />
                <span className="font-mono text-[11px] text-neutral-500">
                  riwainvite.com/invite/{template.id.substring(0, 8)}
                </span>
              </div>
              <div className="w-12" />
            </div>
          )}

          {isMobile && !isFullscreen && (
            <div className="pointer-events-none absolute left-1/2 top-2 z-50 h-6 w-24 -translate-x-1/2 rounded-full bg-black" />
          )}

          {pageCss && <style>{`@scope (.riwa-canvas) { ${pageCss} }`}</style>}

          <div className={`riwa-canvas min-h-full ${isMobile ? "pb-4 pt-8" : "p-6"} ${isFullscreen ? "pt-6" : ""}`}>
            {schema.elements.map((el: any) => (
              <div key={el.id} className="relative">
                <WidgetRenderer
                  element={resolveElement(el, previewData)}
                  editing={false}
                  device={isMobile ? "mobile" : "desktop"}
                />
              </div>
            ))}
          </div>

          {/* Loading skeleton */}
          <AnimatePresence>
            {!canvasReady && (
              <motion.div
                key="skeleton"
                exit={{ opacity: 0 }}
                transition={{ duration: 0.35 }}
                className="absolute inset-0 z-[60] overflow-hidden bg-white"
              >
                <div className="space-y-5 p-10 pt-20">
                  <div className="h-10 w-2/3 rounded-lg bg-neutral-100" />
                  <div className="h-4 w-1/2 rounded bg-neutral-100" />
                  <div className="h-64 w-full rounded-2xl bg-neutral-100" />
                  <div className="h-4 w-3/4 rounded bg-neutral-100" />
                  <div className="h-4 w-2/3 rounded bg-neutral-100" />
                </div>
                <motion.div
                  className="absolute inset-y-0 w-1/2 bg-gradient-to-r from-transparent via-orange-100/70 to-transparent"
                  initial={{ x: "-100%" }}
                  animate={{ x: "300%" }}
                  transition={{ duration: 1.1, ease: "easeInOut", repeat: Infinity }}
                />
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </motion.div>
    );
  };

  return (
    <>
      <motion.div
        role="dialog"
        aria-modal="true"
        aria-label={`${template.name} preview`}
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0, transition: { duration: 0.3 } }}
        transition={{ duration: 0.3 }}
        onClick={onClose}
        className={`fixed inset-0 z-[99999] flex items-center justify-center bg-[#0a0a0a] p-2 sm:p-4 ${
          isPresent ? "" : "pointer-events-none"
        }`}
      >
        {/* Ambient aurora */}
        <motion.div
          aria-hidden
          animate={reduce ? undefined : { scale: [1, 1.2, 1], opacity: [0.15, 0.28, 0.15], x: [0, 40, 0] }}
          transition={{ duration: 10, repeat: Infinity, ease: "easeInOut" }}
          className="pointer-events-none absolute -left-40 -top-40 h-[600px] w-[600px] rounded-full bg-orange-500 opacity-20 blur-[180px]"
        />
        <motion.div
          aria-hidden
          animate={reduce ? undefined : { scale: [1, 1.3, 1], opacity: [0.1, 0.22, 0.1], y: [0, -40, 0] }}
          transition={{ duration: 12, repeat: Infinity, ease: "easeInOut", delay: 1 }}
          className="pointer-events-none absolute -bottom-40 -right-40 h-[600px] w-[600px] rounded-full bg-indigo-500 opacity-15 blur-[180px]"
        />
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 opacity-[0.4] [mask-image:radial-gradient(ellipse_at_center,black_30%,transparent_75%)]"
          style={{
            backgroundImage: "radial-gradient(rgba(255,255,255,0.07) 1px, transparent 1px)",
            backgroundSize: "28px 28px",
          }}
        />

        <motion.div
          initial={reduce ? false : { opacity: 0, scale: 0.94, y: 40, filter: "blur(10px)" }}
          animate={{
            opacity: 1,
            scale: 1,
            y: 0,
            filter: "blur(0px)",
            width: isFullscreen ? "100vw" : "100%",
            height: isFullscreen ? "100dvh" : "96dvh",
            borderRadius: isFullscreen ? 0 : 32,
          }}
          exit={reduce ? undefined : { opacity: 0, scale: 0.97, y: 16, filter: "blur(6px)", transition: { duration: 0.3, ease: EASE } }}
          transition={{ type: "spring", damping: 26, stiffness: 190 }}
          onClick={(e) => e.stopPropagation()}
          data-lenis-prevent
          className={`relative flex overflow-hidden ${
            isFullscreen
              ? "max-w-none flex-col border-none bg-transparent"
              : "w-full max-w-[98vw] flex-col border border-white/10 bg-[#0a0a0a]/60 shadow-[0_0_150px_-20px_rgba(249,115,22,0.25)] backdrop-blur-3xl md:flex-row"
          }`}
        >
          {/* Top hairline highlight */}
          <div className="pointer-events-none absolute inset-x-12 top-0 z-[90] h-px bg-gradient-to-r from-transparent via-white/30 to-transparent" />

          {/* Close controls */}
          <div
            className={`absolute right-5 top-5 z-[100] flex items-center gap-3 sm:right-6 sm:top-6 ${
              isFullscreen ? "opacity-0 transition-opacity focus-within:opacity-100 hover:opacity-100" : ""
            }`}
          >
            <button
              onClick={onClose}
              className={`group hidden items-center gap-2 rounded-full bg-black/40 px-4 py-2 text-sm font-semibold text-white backdrop-blur-md transition-colors hover:bg-white/10 sm:flex ${focusRing}`}
            >
              Close
              <kbd className="rounded bg-white/10 px-1.5 py-0.5 font-mono text-[10px]">Esc</kbd>
            </button>
            <motion.button
              ref={closeRef}
              onClick={onClose}
              aria-label="Close preview"
              whileHover={{ scale: 1.1, rotate: 90 }}
              whileTap={{ scale: 0.9 }}
              transition={{ type: "spring", stiffness: 400, damping: 18 }}
              className={`flex h-12 w-12 items-center justify-center rounded-full bg-black/40 text-white backdrop-blur-md transition-colors hover:bg-red-500/80 ${focusRing}`}
            >
              <X className="h-6 w-6" />
            </motion.button>
          </div>

          {/* Left hero (details only) */}
          {!isFullscreen && (
            <AnimatePresence>
              {activeTab === "details" && (
                <HeroPanel key="hero" template={template} image={displayImage} reduce={reduce} />
              )}
            </AnimatePresence>
          )}

          {/* Right column */}
          <div
            className={`relative z-10 flex flex-1 flex-col overflow-hidden ${
              activeTab === "live" || isFullscreen ? "w-full" : ""
            }`}
          >
            {!isFullscreen && (
              <div
                role="tablist"
                aria-label="Preview sections"
                className="flex items-center gap-2 border-b border-white/5 px-6 pb-3 pt-8 sm:px-10"
              >
                {(
                  [
                    { id: "details", label: "Details", Icon: FileText },
                    { id: "live", label: "Live preview", Icon: Eye },
                  ] as const
                ).map(({ id, label, Icon }) => {
                  const active = activeTab === id;
                  return (
                    <button
                      key={id}
                      role="tab"
                      aria-selected={active}
                      onClick={() => setActiveTab(id)}
                      className={`relative flex items-center gap-2 rounded-xl px-5 py-3 text-sm font-semibold transition-colors ${focusRing} ${
                        active ? "text-white" : "text-neutral-500 hover:text-neutral-300"
                      }`}
                    >
                      {active && (
                        <motion.span
                          layoutId="tab-pill"
                          className="absolute inset-0 rounded-xl bg-gradient-to-b from-white/15 to-white/5 shadow-[inset_0_1px_0_rgba(255,255,255,0.15)]"
                          transition={{ type: "spring", bounce: 0.2, duration: 0.6 }}
                        />
                      )}
                      {active && (
                        <motion.span
                          layoutId="tab-underline"
                          className="absolute -bottom-3 left-4 right-4 h-px bg-gradient-to-r from-transparent via-orange-500 to-transparent"
                          transition={{ type: "spring", bounce: 0.2, duration: 0.6 }}
                        />
                      )}
                      <Icon className="relative z-10 h-5 w-5" />
                      <span className="relative z-10">{label}</span>
                    </button>
                  );
                })}
              </div>
            )}

            <AnimatePresence mode="wait">
              {activeTab === "details" && !isFullscreen ? (
                <motion.div
                  key="details-tab"
                  variants={containerVariants}
                  initial="hidden"
                  animate="show"
                  exit="exit"
                  className={`flex flex-1 flex-col overflow-y-auto px-6 py-6 sm:px-10 sm:py-8 ${hideScrollbar}`}
                >
                  <motion.div variants={itemVariants} className="mb-8">
                    <span className="mb-5 inline-flex items-center gap-2 rounded-full bg-orange-500/10 px-4 py-1.5 text-sm font-semibold text-[#f97316] ring-1 ring-orange-500/20">
                      <span className="h-1.5 w-1.5 rounded-full bg-orange-500" />
                      {template.categoryName}
                    </span>
                    <SplitTitle text={template.name} reduce={reduce} />
                  </motion.div>

                  <motion.div variants={itemVariants} className="mb-10 flex-1 space-y-8">
                    <p className="max-w-2xl font-[family-name:var(--font-body)] text-base leading-relaxed text-neutral-400 sm:text-lg">
                      {template.description ||
                        "A beautiful, fully customizable digital invitation template designed to leave a lasting impression on your guests."}
                    </p>

                    <div className="flex flex-wrap gap-2">
                      {chips.map(({ Icon, label }, i) => (
                        <motion.span
                          key={label}
                          initial={reduce ? false : { opacity: 0, scale: 0.8 }}
                          animate={{ opacity: 1, scale: 1 }}
                          transition={{ delay: 0.7 + i * 0.08, type: "spring", stiffness: 300, damping: 20 }}
                          className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.04] px-3.5 py-1.5 text-sm font-medium text-neutral-300"
                        >
                          <Icon className="h-3.5 w-3.5 text-orange-500" />
                          {label}
                        </motion.span>
                      ))}
                    </div>

                    <div className="space-y-8">
                      {gallery.length > 0 && (
                        <motion.div variants={itemVariants}>
                          <h3 className="mb-3 flex items-center gap-2 text-base font-semibold text-white">
                            <ImageIcon className="h-4 w-4 text-orange-500" /> Included gallery
                          </h3>
                          <div className="grid grid-cols-3 gap-2 sm:grid-cols-4 md:grid-cols-5">
                            {gallery.map((url, i) => (
                              <motion.button
                                key={i}
                                initial={reduce ? false : { opacity: 0, y: 16, scale: 0.9 }}
                                animate={{ opacity: 1, y: 0, scale: 1 }}
                                transition={{ delay: 0.5 + i * 0.05, type: "spring", stiffness: 260, damping: 22 }}
                                whileHover={{ y: -4, scale: 1.04 }}
                                whileTap={{ scale: 0.97 }}
                                onClick={() => {
                                  setDir(1);
                                  setLightbox({ type: "image", index: i });
                                }}
                                aria-label={`Open gallery image ${i + 1}`}
                                className={`group relative aspect-square cursor-zoom-in overflow-hidden rounded-xl border border-white/10 transition-colors hover:border-orange-500/60 ${focusRing}`}
                              >
                                <Image
                                  src={url}
                                  alt={`Gallery ${i + 1}`}
                                  fill
                                  sizes="(max-width: 768px) 33vw, 15vw"
                                  className="object-cover transition-transform duration-700 group-hover:scale-110"
                                />
                                <div className="absolute inset-0 flex items-center justify-center bg-gradient-to-t from-black/60 to-transparent opacity-0 transition-opacity group-hover:opacity-100">
                                  <Maximize2 className="h-5 w-5 text-white" />
                                </div>
                              </motion.button>
                            ))}
                          </div>
                        </motion.div>
                      )}

                      {template.videoUrls?.[0] && (
                        <motion.div variants={itemVariants}>
                          <h3 className="mb-3 flex items-center gap-2 text-base font-semibold text-white">
                            <Play className="h-4 w-4 text-orange-500" /> Background video
                          </h3>
                          <motion.button
                            whileHover={{ scale: 1.02 }}
                            whileTap={{ scale: 0.98 }}
                            onClick={() => setLightbox({ type: "video", url: template.videoUrls[0] })}
                            aria-label="Play background video"
                            className={`group relative block aspect-video w-full overflow-hidden rounded-xl border border-white/10 bg-black sm:max-w-md ${focusRing}`}
                          >
                            <video
                              src={template.videoUrls[0]}
                              className="h-full w-full object-cover opacity-70 transition-opacity group-hover:opacity-50"
                              playsInline
                              muted
                              preload="metadata"
                            />
                            <div className="absolute inset-0 flex items-center justify-center">
                              <span className="relative flex h-14 w-14 items-center justify-center rounded-full bg-white/20 backdrop-blur-md transition-transform group-hover:scale-110">
                                {!reduce && (
                                  <motion.span
                                    aria-hidden
                                    className="absolute inset-0 rounded-full border border-white/50"
                                    animate={{ scale: [1, 1.6], opacity: [0.6, 0] }}
                                    transition={{ duration: 1.8, repeat: Infinity, ease: "easeOut" }}
                                  />
                                )}
                                <Play className="ml-1 h-6 w-6 text-white" />
                              </span>
                            </div>
                          </motion.button>
                        </motion.div>
                      )}
                    </div>

                    <motion.div variants={itemVariants} className="grid max-w-2xl grid-cols-1 gap-3 pt-2 sm:grid-cols-2">
                      {features.map(({ label, Icon }, i) => (
                        <motion.div
                          key={label}
                          initial={reduce ? false : { opacity: 0, x: -16 }}
                          animate={{ opacity: 1, x: 0 }}
                          transition={{ delay: 0.6 + i * 0.07, type: "spring", stiffness: 260, damping: 24 }}
                        >
                          <Spotlight className="rounded-2xl border border-white/5 bg-white/[0.02] p-4 transition-colors hover:border-orange-500/30">
                            <div className="relative flex items-center gap-4">
                              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-orange-500/10 text-[#f97316] transition-transform duration-300 group-hover/spot:-rotate-6 group-hover/spot:scale-110">
                                <Icon className="h-5 w-5" />
                              </span>
                              <span className="text-sm font-semibold text-neutral-300">{label}</span>
                            </div>
                          </Spotlight>
                        </motion.div>
                      ))}
                    </motion.div>
                  </motion.div>

                  {/* Price + CTA with a travelling gradient border */}
                  <motion.div variants={itemVariants} className="relative mt-auto max-w-2xl overflow-hidden rounded-3xl p-px">
                    <motion.div
                      aria-hidden
                      className="absolute left-1/2 top-1/2 h-[240%] w-[240%]"
                      style={{
                        x: "-50%",
                        y: "-50%",
                        background:
                          "conic-gradient(from 0deg, transparent 0deg, transparent 200deg, #f97316 280deg, #fbbf24 330deg, transparent 360deg)",
                      }}
                      animate={reduce ? undefined : { rotate: 360 }}
                      transition={{ duration: 6, ease: "linear", repeat: Infinity }}
                    />
                    <Spotlight className="relative rounded-[calc(1.5rem-1px)] bg-[#0e0e10] p-6 sm:p-8">
                      <div className="relative">
                        <p className="mb-2 text-sm font-medium text-neutral-500">One-time purchase</p>
                        <div className="mb-6 flex items-baseline gap-2">
                          <span className="font-[family-name:var(--font-display)] text-4xl font-bold tabular-nums text-white sm:text-5xl lg:text-6xl">
                            <Price value={template.price} reduce={reduce} />
                          </span>
                        </div>

                        <Magnetic reduce={reduce}>
                          <Link
                            href={`/template/${template.id}`}
                            className={`group relative flex w-full items-center justify-center gap-3 overflow-hidden rounded-2xl bg-gradient-to-b from-[#fb8a3c] to-[#f97316] px-8 py-5 font-[family-name:var(--font-display)] text-lg font-bold text-white shadow-[0_10px_40px_-10px_rgba(249,115,22,0.8),inset_0_1px_0_rgba(255,255,255,0.3)] transition-shadow duration-300 hover:shadow-[0_14px_50px_-8px_rgba(249,115,22,0.95),inset_0_1px_0_rgba(255,255,255,0.3)] active:scale-[0.99] ${focusRing}`}
                          >
                            {!reduce && (
                              <motion.span
                                aria-hidden
                                className="absolute inset-y-0 w-16 -skew-x-12 bg-white/30 blur-md"
                                initial={{ x: "-300%" }}
                                animate={{ x: "900%" }}
                                transition={{ duration: 1.6, ease: "easeInOut", repeat: Infinity, repeatDelay: 2.8 }}
                              />
                            )}
                            <span className="relative z-10">Use this template</span>
                            <ArrowRight className="relative z-10 h-6 w-6 transition-transform duration-300 group-hover:translate-x-1.5" />
                          </Link>
                        </Magnetic>
                      </div>
                    </Spotlight>
                  </motion.div>
                </motion.div>
              ) : (
                <motion.div
                  key="live-tab"
                  initial={{ opacity: 0, scale: 0.98 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.98 }}
                  transition={{ duration: 0.4, ease: EASE }}
                  className="relative flex flex-1 flex-col overflow-hidden bg-transparent"
                >
                  {isFullscreen ? (
                    <motion.div
                      initial={{ opacity: 0, y: -20 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="absolute left-6 top-6 z-[100] flex items-center gap-3"
                    >
                      <DeviceSwitch device={device} setDevice={setDevice} layoutId="device-pill-fs" compact />
                      <button
                        onClick={() => setIsFullscreen(false)}
                        title="Exit fullscreen"
                        aria-label="Exit fullscreen"
                        className={`flex h-11 w-11 items-center justify-center rounded-2xl bg-black/60 text-white shadow-2xl ring-1 ring-white/10 backdrop-blur-xl transition-colors hover:bg-white/10 ${focusRing}`}
                      >
                        <Minimize2 className="h-5 w-5" />
                      </button>
                    </motion.div>
                  ) : (
                    <motion.div
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="flex items-center justify-center gap-3 border-b border-white/5 bg-white/[0.01] p-5"
                    >
                      <DeviceSwitch device={device} setDevice={setDevice} layoutId="device-pill" />
                      <motion.button
                        whileHover={{ scale: 1.06 }}
                        whileTap={{ scale: 0.92 }}
                        onClick={() => setIsFullscreen(true)}
                        title="Fullscreen preview"
                        aria-label="Fullscreen preview"
                        className={`flex h-11 w-11 items-center justify-center rounded-2xl bg-white/5 text-white ring-1 ring-white/10 transition-colors hover:bg-white/10 ${focusRing}`}
                      >
                        <Maximize2 className="h-5 w-5" />
                      </motion.button>
                    </motion.div>
                  )}

                  <div
                    ref={setStageEl}
                    data-lenis-prevent
                    className={`relative flex flex-1 items-center justify-center overflow-y-auto overscroll-contain ${hideScrollbar} ${
                      isFullscreen ? "p-0" : "p-2"
                    }`}
                    style={{
                      backgroundImage: "radial-gradient(rgba(255,255,255,0.06) 1px, transparent 1px)",
                      backgroundSize: "32px 32px",
                    }}
                  >
                    <div className="relative z-10 flex h-full w-full items-center justify-center">
                      <AnimatePresence mode="wait">{renderLiveCanvas()}</AnimatePresence>
                    </div>

                    {!isFullscreen && (
                      <motion.div
                        initial={{ opacity: 0, y: 8 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.5 }}
                        className="pointer-events-none absolute bottom-4 left-4 z-20 flex items-center gap-3 rounded-full bg-black/50 px-3.5 py-1.5 text-xs text-neutral-400 ring-1 ring-white/10 backdrop-blur-md"
                      >
                        <span className="font-mono tabular-nums">
                          {device === "mobile" ? `${MOBILE_W} × ${MOBILE_H}` : `${DESKTOP_W} × ${DESKTOP_H}`}
                        </span>
                        <span className="font-mono tabular-nums text-orange-400">{Math.round(scale * 100)}%</span>
                        <span className="hidden sm:inline">Double-click for fullscreen</span>
                      </motion.div>
                    )}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </motion.div>
      </motion.div>

      {/* Lightbox */}
      <AnimatePresence>
        {lightbox && (
          <motion.div
            key="lightbox"
            role="dialog"
            aria-modal="true"
            aria-label="Media viewer"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[999999] flex items-center justify-center bg-black/90 p-4 backdrop-blur-xl sm:p-12"
            onClick={() => setLightbox(null)}
            data-lenis-prevent
          >
            <motion.button
              onClick={() => setLightbox(null)}
              aria-label="Close viewer"
              whileHover={{ scale: 1.1, rotate: 90 }}
              whileTap={{ scale: 0.9 }}
              className={`absolute right-6 top-6 z-50 flex h-12 w-12 items-center justify-center rounded-full bg-white/10 text-white backdrop-blur-md transition-colors hover:bg-white/20 ${focusRing}`}
            >
              <X className="h-6 w-6" />
            </motion.button>

            {lightbox.type === "image" && gallery.length > 1 && (
              <>
                {([-1, 1] as const).map((d) => (
                  <motion.button
                    key={d}
                    onClick={(e) => {
                      e.stopPropagation();
                      stepLightbox(d);
                    }}
                    aria-label={d === 1 ? "Next image" : "Previous image"}
                    whileHover={{ scale: 1.1 }}
                    whileTap={{ scale: 0.9 }}
                    className={`absolute top-1/2 z-50 flex h-12 w-12 -translate-y-1/2 items-center justify-center rounded-full bg-white/10 text-white backdrop-blur-md transition-colors hover:bg-white/20 ${focusRing} ${
                      d === 1 ? "right-4 sm:right-8" : "left-4 sm:left-8"
                    }`}
                  >
                    {d === 1 ? <ChevronRight className="h-6 w-6" /> : <ChevronLeft className="h-6 w-6" />}
                  </motion.button>
                ))}
                <div className="absolute bottom-6 left-1/2 z-50 flex -translate-x-1/2 items-center gap-1.5 rounded-full bg-black/50 px-3 py-2 ring-1 ring-white/10 backdrop-blur-md">
                  {gallery.map((_, i) => (
                    <motion.span
                      key={i}
                      animate={{
                        width: lightbox.index === i ? 20 : 6,
                        backgroundColor: lightbox.index === i ? "#f97316" : "rgba(255,255,255,0.35)",
                      }}
                      transition={{ type: "spring", stiffness: 300, damping: 24 }}
                      className="h-1.5 rounded-full"
                    />
                  ))}
                </div>
              </>
            )}

            <div
              className="relative max-h-[90vh] w-full max-w-7xl"
              onClick={(e) => e.stopPropagation()}
            >
              <AnimatePresence mode="popLayout" custom={dir} initial={false}>
                {lightbox.type === "image" ? (
                  <motion.div
                    key={`img-${lightbox.index}`}
                    custom={dir}
                    variants={lightboxSlide}
                    initial="enter"
                    animate="center"
                    exit="exit"
                    transition={{ type: "spring", damping: 28, stiffness: 260 }}
                    className="relative aspect-video w-full overflow-hidden rounded-2xl"
                  >
                    <Image
                      src={gallery[lightbox.index]}
                      alt={`Gallery image ${lightbox.index + 1}`}
                      fill
                      className="object-contain"
                      sizes="100vw"
                      priority
                    />
                  </motion.div>
                ) : (
                  <motion.video
                    key="video"
                    initial={{ scale: 0.9, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    exit={{ scale: 0.9, opacity: 0 }}
                    transition={{ type: "spring", damping: 25, stiffness: 300 }}
                    src={lightbox.url}
                    controls
                    autoPlay
                    className="max-h-[85vh] w-full rounded-2xl object-contain shadow-2xl"
                  />
                )}
              </AnimatePresence>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}

/* -------------------------------------------------------------------------- */
/*  Public component                                                          */
/* -------------------------------------------------------------------------- */

export function TemplatePreviewModal({
  template,
  onClose,
}: {
  template: TemplateData | null;
  onClose: () => void;
}) {
  // Mounting ModalContent per template (keyed by id) resets all state and
  // lets the exit animations run, which `if (!template) return null` blocked.
  return (
    <AnimatePresence>
      {template && <ModalContent key={template.id} template={template} onClose={onClose} />}
    </AnimatePresence>
  );
}