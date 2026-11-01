"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import {
  AnimatePresence,
  animate,
  motion,
  useInView,
  useMotionTemplate,
  useMotionValue,
  useReducedMotion,
  useSpring,
  useTransform,
  Variants,
} from "framer-motion";
import {
  ArrowLeft,
  ArrowRight,
  Check,
  ChevronLeft,
  ChevronRight,
  Copy,
  Crown,
  Eye,
  Image as ImageIcon,
  LayoutTemplate,
  Music,
  ShieldCheck,
  ShoppingBag,
  Smartphone,
  Sparkles,
  Zap,
} from "lucide-react";
import { apiClient } from "@/lib/api/api_base";
import {
  TemplatePreviewModal,
  TemplateData,
} from "@/components/public/models/TemplatePreviewModel";

/* -------------------------------------------------------------------------- */
/*  Constants & variants                                                      */
/* -------------------------------------------------------------------------- */

const EASE = [0.16, 1, 0.3, 1] as const;

const focusRing =
  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-500 focus-visible:ring-offset-2 focus-visible:ring-offset-[#fdeadb]";

const primaryBtn =
  "bg-gradient-to-b from-[#fb8a3c] to-[#f97316] shadow-[0_10px_30px_-10px_rgba(249,115,22,0.8),inset_0_1px_0_rgba(255,255,255,0.3)]";

const glassCard =
  "border border-orange-200/60 bg-white/70 shadow-[0_20px_50px_-30px_rgba(249,115,22,0.5)] backdrop-blur-xl";

const FALLBACK_DESC =
  "A beautiful, fully customizable digital invitation template designed to leave a lasting impression on your guests.";

/** Orchestrates the whole page: children inherit this stagger. */
const pageVariants: Variants = {
  hidden: {},
  show: { transition: { staggerChildren: 0.09, delayChildren: 0.05 } },
};

const riseVariants: Variants = {
  hidden: { opacity: 0, y: 28, filter: "blur(8px)" },
  show: {
    opacity: 1,
    y: 0,
    filter: "blur(0px)",
    transition: { duration: 0.8, ease: EASE },
  },
};

const wordsParent: Variants = {
  hidden: {},
  show: { transition: { staggerChildren: 0.07, delayChildren: 0.15 } },
};
const wordChild: Variants = {
  hidden: { y: "115%", rotate: 5 },
  show: { y: 0, rotate: 0, transition: { duration: 0.9, ease: EASE } },
};

const listParent: Variants = {
  hidden: {},
  show: { transition: { staggerChildren: 0.08, delayChildren: 0.1 } },
};
const listChild: Variants = {
  hidden: { opacity: 0, x: -18, scale: 0.96 },
  show: {
    opacity: 1,
    x: 0,
    scale: 1,
    transition: { type: "spring", stiffness: 160, damping: 18 },
  },
};

const thumbParent: Variants = {
  hidden: {},
  show: { transition: { staggerChildren: 0.07, delayChildren: 0.9 } },
};
const thumbChild: Variants = {
  hidden: { opacity: 0, y: 24, scale: 0.8, rotateX: -40 },
  show: {
    opacity: 1,
    y: 0,
    scale: 1,
    rotateX: 0,
    transition: { type: "spring", stiffness: 180, damping: 16 },
  },
};

/* -------------------------------------------------------------------------- */
/*  Small hooks & components                                                  */
/* -------------------------------------------------------------------------- */

/** Pointer-driven 3D tilt with a cursor-following orange glow. */
function useTilt(max: number, reduce: boolean) {
  const px = useMotionValue(0);
  const py = useMotionValue(0);
  const sx = useSpring(px, { stiffness: 150, damping: 20 });
  const sy = useSpring(py, { stiffness: 150, damping: 20 });
  const rotateY = useTransform(sx, [-0.5, 0.5], [-max, max]);
  const rotateX = useTransform(sy, [-0.5, 0.5], [max, -max]);
  const gx = useMotionValue(-400);
  const gy = useMotionValue(-400);
  const glow = useMotionTemplate`radial-gradient(340px circle at ${gx}px ${gy}px, rgba(249,115,22,0.3), transparent 70%)`;
  const sheen = useMotionTemplate`radial-gradient(180px circle at ${gx}px ${gy}px, rgba(255,255,255,0.35), transparent 70%)`;

  const onPointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (e.pointerType === "touch") return;
    const r = e.currentTarget.getBoundingClientRect();
    const nx = (e.clientX - r.left) / r.width;
    const ny = (e.clientY - r.top) / r.height;
    px.set(nx - 0.5);
    py.set(ny - 0.5);
    gx.set(nx * r.width);
    gy.set(ny * r.height);
  };
  const onPointerLeave = () => {
    px.set(0);
    py.set(0);
    gx.set(-400);
    gy.set(-400);
  };

  return {
    glow,
    sheen,
    handlers: reduce ? {} : { onPointerMove, onPointerLeave },
    style: reduce
      ? {}
      : {
          rotateX,
          rotateY,
          transformPerspective: 1300,
          transformStyle: "preserve-3d" as const,
        },
  };
}

function MaskedWords({
  text,
  reduce,
}: {
  text: string;
  reduce: boolean;
}) {
  const words = text.split(" ");
  return (
    <motion.h1
      aria-label={text}
      variants={wordsParent}
      initial={reduce ? "show" : "hidden"}
      animate="show"
      className="font-[family-name:var(--font-display)] text-4xl font-bold leading-[1.08] tracking-tight text-gray-900 sm:text-5xl lg:text-6xl"
    >
      {words.map((w, i) => (
        <span
          key={i}
          className="mr-[0.25em] inline-block overflow-hidden pb-[0.12em] align-bottom"
        >
          <motion.span
            aria-hidden
            variants={wordChild}
            className="inline-block origin-bottom-left"
          >
            {w}
          </motion.span>
        </span>
      ))}
    </motion.h1>
  );
}

function CountUp({
  value,
  reduce,
  prefix = "",
}: {
  value: number;
  reduce: boolean;
  prefix?: string;
}) {
  const ref = useRef<HTMLSpanElement>(null);
  const inView = useInView(ref, { once: true });
  const mv = useMotionValue(reduce ? value : 0);
  const text = useTransform(mv, (v) => `${prefix}${Math.round(v).toLocaleString()}`);
  useEffect(() => {
    if (reduce) {
      mv.set(value);
      return;
    }
    if (!inView) return;
    const c = animate(mv, value, { duration: 1.6, delay: 0.5, ease: EASE });
    return () => c.stop();
  }, [inView, value, reduce, mv]);
  return (
    <motion.span ref={ref} className="tabular-nums">
      {text}
    </motion.span>
  );
}

/** Floating glass chip that springs in around the hero image. */
function FloatChip({
  children,
  className,
  delay,
  reduce,
  drift = 6,
}: {
  children: React.ReactNode;
  className: string;
  delay: number;
  reduce: boolean;
  drift?: number;
}) {
  return (
    <motion.div
      initial={reduce ? false : { opacity: 0, scale: 0.4, y: 20 }}
      animate={{ opacity: 1, scale: 1, y: 0 }}
      transition={{ type: "spring", stiffness: 200, damping: 14, delay }}
      className={`absolute z-20 ${className}`}
    >
      <motion.div
        animate={reduce ? undefined : { y: [0, -drift, 0] }}
        transition={{
          duration: 4 + drift / 3,
          repeat: Infinity,
          ease: "easeInOut",
        }}
        className="flex items-center gap-2 rounded-2xl border border-white/70 bg-white/85 px-3.5 py-2 text-xs font-bold text-gray-900 shadow-[0_16px_36px_-16px_rgba(249,115,22,0.7)] backdrop-blur-xl"
      >
        {children}
      </motion.div>
    </motion.div>
  );
}

/* -------------------------------------------------------------------------- */
/*  Main                                                                      */
/* -------------------------------------------------------------------------- */

export function SingleTemplateClient({ id }: { id: string }) {
  const [template, setTemplate] = useState<TemplateData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [isPreviewOpen, setIsPreviewOpen] = useState(false);
  const [activeIdx, setActiveIdx] = useState(0);
  const [direction, setDirection] = useState(1);
  const [copied, setCopied] = useState(false);

  const reduce = useReducedMotion() ?? false;

  // Cursor-reveal dotted background (identical to the templates page)
  const sectionRef = useRef<HTMLDivElement>(null);
  const raf = useRef(0);
  const onMove = useCallback((e: React.PointerEvent) => {
    if (e.pointerType === "touch") return;
    const { clientX: x, clientY: y } = e;
    cancelAnimationFrame(raf.current);
    raf.current = requestAnimationFrame(() => {
      sectionRef.current?.style.setProperty("--mx", `${x}px`);
      sectionRef.current?.style.setProperty("--my", `${y}px`);
    });
  }, []);
  useEffect(() => () => cancelAnimationFrame(raf.current), []);
  const mask =
    "radial-gradient(230px circle at var(--mx,-999px) var(--my,-999px), #000 0%, transparent 100%)";

  useEffect(() => {
    let cancelled = false;
    const fetchTemplate = async () => {
      try {
        const res = await apiClient.get(`/public/template/${id}`);
        if (cancelled) return;
        if (res.data?.status === "success") {
          setTemplate(res.data.data);
        } else {
          setError(true);
        }
      } catch (err) {
        console.error(err);
        if (!cancelled) setError(true);
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    fetchTemplate();
    return () => {
      cancelled = true;
    };
  }, [id]);

  const tilt = useTilt(6, reduce);

  const gallery = template?.galleryUrls ?? [];
  // Hero shows the thumbnail first, then the gallery
  const images = template
    ? Array.from(
        new Set([template.thumbnailUrl, ...gallery].filter(Boolean)),
      )
    : [];

  const go = useCallback(
    (next: number) => {
      if (images.length < 2) return;
      const n = (next + images.length) % images.length;
      setDirection(next > activeIdx ? 1 : -1);
      setActiveIdx(n);
    },
    [images.length, activeIdx],
  );

  // Arrow keys switch images
  useEffect(() => {
    if (isPreviewOpen || images.length < 2) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "ArrowRight") go(activeIdx + 1);
      if (e.key === "ArrowLeft") go(activeIdx - 1);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [go, activeIdx, isPreviewOpen, images.length]);

  const copyLink = async () => {
    try {
      await navigator.clipboard.writeText(window.location.href);
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    } catch {
      /* clipboard unavailable */
    }
  };

  /* ------------------------------ Loading ------------------------------- */
  if (loading) {
    return (
      <div className="relative isolate min-h-screen w-full overflow-hidden bg-[#fdeadb] py-16 sm:py-24">
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 -z-10 bg-gradient-to-b from-[#fff4ea] to-[#fbdcc0]"
        />
        <div
          className="mx-auto w-full max-w-7xl px-4 sm:px-6 lg:px-8"
          aria-busy="true"
        >
          <div className="mb-8 h-5 w-40 rounded-full bg-white/60" />
          <div className="grid grid-cols-1 gap-12 lg:grid-cols-2 lg:gap-16">
            <div className="relative aspect-[4/5] overflow-hidden rounded-3xl border border-white/70 bg-white/60">
              <motion.div
                aria-hidden
                className="absolute inset-y-0 w-1/2 bg-gradient-to-r from-transparent via-white/90 to-transparent"
                initial={{ x: "-100%" }}
                animate={{ x: "300%" }}
                transition={{ duration: 1.5, ease: "easeInOut", repeat: Infinity }}
              />
            </div>
            <div className="space-y-5">
              <div className="h-7 w-32 rounded-full bg-white/60" />
              <div className="h-14 w-4/5 rounded-2xl bg-white/60" />
              <div className="h-20 w-full rounded-2xl bg-white/60" />
              <div className="h-64 w-full rounded-3xl bg-white/60" />
            </div>
          </div>
        </div>
      </div>
    );
  }

  /* ------------------------------- Error -------------------------------- */
  if (error || !template) {
    return (
      <div className="relative isolate flex min-h-screen flex-col items-center justify-center overflow-hidden bg-[#fdeadb] px-4 text-center">
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 -z-10 bg-gradient-to-b from-[#fff4ea] to-[#fbdcc0]"
        />
        <motion.div
          initial={{ opacity: 0, y: 24, scale: 0.96 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          transition={{ duration: 0.7, ease: EASE }}
          className={`max-w-md rounded-3xl p-8 ${glassCard}`}
        >
          <span className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-orange-50 to-orange-100 text-[#f97316] ring-1 ring-orange-200/60">
            <LayoutTemplate className="h-6 w-6" />
          </span>
          <h1 className="mb-2 font-[family-name:var(--font-display)] text-2xl font-bold text-gray-900">
            Template not found
          </h1>
          <p className="mb-6 text-gray-600">
            This template may have been removed or is no longer available.
          </p>
          <Link
            href="/templates"
            className={`inline-flex items-center gap-2 rounded-xl px-6 py-3 text-sm font-bold text-white ${primaryBtn} ${focusRing}`}
          >
            <ArrowLeft className="h-4 w-4" /> Back to templates
          </Link>
        </motion.div>
      </div>
    );
  }

  const isPaid = template.price > 0;
  const hasMusic = !!template.musicUrls?.length;
  const photoCount = images.length || 1;
  const currentImage = images[activeIdx] || template.thumbnailUrl;

  const features = [
    { icon: Smartphone, title: "Fully responsive", text: "Looks perfect on every screen" },
    { icon: Zap, title: "Real-time RSVP", text: "Track replies as they arrive" },
    { icon: ImageIcon, title: `${photoCount} photo${photoCount > 1 ? "s" : ""}`, text: "Gallery included" },
    {
      icon: Music,
      title: hasMusic ? "Background music" : "No music",
      text: hasMusic ? "Sets the mood instantly" : "Silent, distraction-free",
    },
  ];

  const slide = {
    enter: (d: number) => ({ opacity: 0, x: d > 0 ? 60 : -60, scale: 1.08 }),
    center: { opacity: 1, x: 0, scale: 1 },
    exit: (d: number) => ({ opacity: 0, x: d > 0 ? -60 : 60, scale: 0.98 }),
  };

  return (
    <div
      ref={sectionRef}
      onPointerMove={onMove}
      className="relative isolate min-h-screen w-full overflow-hidden bg-[#fdeadb] py-16 pb-32 sm:py-24 lg:pb-24"
    >
      {/* Background: peach gradient, drifting glows, dots that light up under the cursor */}
      <div aria-hidden className="pointer-events-none absolute inset-0 -z-10">
        <div className="absolute inset-0 bg-gradient-to-b from-[#fff4ea] to-[#fbdcc0]" />
        <motion.div
          animate={reduce ? undefined : { x: [0, 60, 0], y: [0, 30, 0] }}
          transition={{ duration: 18, repeat: Infinity, ease: "easeInOut" }}
          className="absolute -left-32 top-10 h-[420px] w-[420px] rounded-full bg-orange-300/30 blur-[120px]"
        />
        <motion.div
          animate={reduce ? undefined : { x: [0, -50, 0], y: [0, -40, 0] }}
          transition={{ duration: 22, repeat: Infinity, ease: "easeInOut" }}
          className="absolute -right-32 bottom-0 h-[420px] w-[420px] rounded-full bg-amber-300/30 blur-[120px]"
        />
        <div
          className="absolute inset-0"
          style={{
            backgroundImage:
              "radial-gradient(circle, rgba(194,65,12,0.2) 1.5px, transparent 1.5px)",
            backgroundSize: "24px 24px",
          }}
        />
        <div
          className="absolute inset-0"
          style={{
            backgroundImage:
              "radial-gradient(circle, rgba(234,88,12,0.95) 2px, transparent 2px)",
            backgroundSize: "24px 24px",
            maskImage: mask,
            WebkitMaskImage: mask,
          }}
        />
      </div>

      <motion.div
        variants={pageVariants}
        initial={reduce ? "show" : "hidden"}
        animate="show"
        className="relative z-10 mx-auto w-full max-w-7xl px-4 sm:px-6 lg:px-8"
      >
        {/* Breadcrumb / back */}
        <motion.div
          variants={riseVariants}
          className="mb-8 flex flex-wrap items-center justify-between gap-3"
        >
          <Link
            href="/templates"
            className={`group inline-flex items-center gap-2 rounded-full border border-orange-200/60 bg-white/70 px-4 py-2 text-sm font-semibold text-gray-700 shadow-sm backdrop-blur-md transition-colors hover:border-orange-300 hover:bg-white hover:text-orange-600 ${focusRing}`}
          >
            <ArrowLeft className="h-4 w-4 transition-transform group-hover:-translate-x-1" />
            Back to collection
          </Link>

          <button
            type="button"
            onClick={copyLink}
            className={`inline-flex items-center gap-2 rounded-full border border-orange-200/60 bg-white/70 px-4 py-2 text-sm font-semibold text-gray-700 shadow-sm backdrop-blur-md transition-colors hover:border-orange-300 hover:bg-white hover:text-orange-600 ${focusRing}`}
          >
            <AnimatePresence mode="wait" initial={false}>
              {copied ? (
                <motion.span
                  key="ok"
                  initial={{ opacity: 0, scale: 0.6, rotate: -20 }}
                  animate={{ opacity: 1, scale: 1, rotate: 0 }}
                  exit={{ opacity: 0, scale: 0.6 }}
                  className="flex items-center gap-2 text-emerald-600"
                >
                  <Check className="h-4 w-4" /> Link copied
                </motion.span>
              ) : (
                <motion.span
                  key="copy"
                  initial={{ opacity: 0, scale: 0.6 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.6 }}
                  className="flex items-center gap-2"
                >
                  <Copy className="h-4 w-4" /> Copy link
                </motion.span>
              )}
            </AnimatePresence>
          </button>
        </motion.div>

        <div className="grid grid-cols-1 gap-12 lg:grid-cols-2 lg:gap-16">
          {/* ------------------------- Left: visuals ------------------------- */}
          <div className="relative flex flex-col gap-5 lg:sticky lg:top-24 lg:self-start">
            <motion.div
              variants={{
                hidden: { opacity: 0, y: 40, rotateX: -14, scale: 0.94 },
                show: {
                  opacity: 1,
                  y: 0,
                  rotateX: 0,
                  scale: 1,
                  transition: { duration: 1, ease: EASE },
                },
              }}
              style={{ transformPerspective: 1400 }}
              className="relative"
            >
              {/* Floating chips */}
              <FloatChip
                className="-left-3 top-10 sm:-left-6"
                delay={1.1}
                reduce={reduce}
                drift={7}
              >
                <Sparkles className="h-4 w-4 text-orange-500" />
                Fully customizable
              </FloatChip>
              <FloatChip
                className="-right-3 bottom-28 sm:-right-6"
                delay={1.3}
                reduce={reduce}
                drift={9}
              >
                <Zap className="h-4 w-4 text-amber-500" />
                Instant access
              </FloatChip>

              <motion.div
                {...tilt.handlers}
                style={tilt.style}
                className="group relative aspect-[4/5] w-full rounded-3xl"
              >
                {/* Depth shadow */}
                <div
                  aria-hidden
                  className="absolute inset-0 rounded-3xl shadow-[0_30px_70px_-30px_rgba(249,115,22,0.65)]"
                />

                {/* Shining border + clipped surface */}
                <motion.div
                  initial={
                    reduce
                      ? false
                      : { clipPath: "inset(14% 14% 14% 14% round 48px)" }
                  }
                  animate={{ clipPath: "inset(0% 0% 0% 0% round 24px)" }}
                  transition={{ duration: 1.2, delay: 0.25, ease: EASE }}
                  className="absolute inset-0 overflow-hidden rounded-3xl bg-[#f97316] p-1.5 ring-1 ring-orange-300/50"
                >
                  <motion.div
                    aria-hidden
                    animate={reduce ? undefined : { rotate: 360 }}
                    transition={{ duration: 5, ease: "linear", repeat: Infinity }}
                    className="absolute left-1/2 top-1/2 h-[300%] w-[300%] -translate-x-1/2 -translate-y-1/2 bg-[conic-gradient(from_0deg,transparent_0deg,transparent_300deg,rgba(255,255,255,0.8)_330deg,transparent_360deg)]"
                  />

                  <div className="relative z-10 h-full w-full overflow-hidden rounded-[1.25rem] bg-orange-100">
                    <AnimatePresence initial={false} custom={direction} mode="popLayout">
                      <motion.div
                        key={currentImage}
                        custom={direction}
                        variants={slide}
                        initial="enter"
                        animate="center"
                        exit="exit"
                        transition={{ duration: 0.6, ease: EASE }}
                        className="absolute inset-0"
                      >
                        <Image
                          src={currentImage}
                          alt={`${template.name} preview ${activeIdx + 1}`}
                          fill
                          priority
                          quality={90}
                          sizes="(max-width: 1024px) 100vw, 50vw"
                          className="object-cover transition-transform duration-700 ease-out group-hover:scale-[1.05]"
                        />
                      </motion.div>
                    </AnimatePresence>

                    <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/70 via-transparent to-transparent" />
                    <motion.div
                      aria-hidden
                      style={{ background: tilt.glow }}
                      className="pointer-events-none absolute inset-0 opacity-0 mix-blend-screen transition-opacity duration-300 group-hover:opacity-100"
                    />
                    <motion.div
                      aria-hidden
                      style={{ background: tilt.sheen }}
                      className="pointer-events-none absolute inset-0 opacity-0 mix-blend-soft-light transition-opacity duration-300 group-hover:opacity-100"
                    />

                    {/* Premium tag on image */}
                    {template.isPremium && (
                      <span className="absolute left-4 top-4 z-10 flex items-center gap-1.5 rounded-full bg-gradient-to-r from-orange-500 to-amber-500 px-3 py-1 text-[11px] font-bold text-white shadow-lg">
                        <Crown className="h-3 w-3" /> Premium
                      </span>
                    )}

                    {/* Counter */}
                    {images.length > 1 && (
                      <span className="absolute right-4 top-4 z-10 rounded-full bg-black/40 px-3 py-1 text-[11px] font-bold tabular-nums text-white backdrop-blur-md">
                        {activeIdx + 1} / {images.length}
                      </span>
                    )}

                    {/* Whole-image preview target */}
                    <button
                      type="button"
                      onClick={() => setIsPreviewOpen(true)}
                      aria-label={`Open live preview of ${template.name}`}
                      className={`absolute inset-0 z-[5] cursor-pointer ${focusRing}`}
                    />

                    {/* Center preview hint */}
                    <div className="pointer-events-none absolute inset-0 z-[6] flex items-center justify-center">
                      <motion.span
                        initial={reduce ? false : { scale: 0, opacity: 0 }}
                        animate={{ scale: 1, opacity: 1 }}
                        transition={{
                          type: "spring",
                          stiffness: 220,
                          damping: 14,
                          delay: 1.2,
                        }}
                        className="relative flex h-20 w-20 items-center justify-center rounded-full bg-white/20 ring-1 ring-white/50 backdrop-blur-md transition-transform duration-300 group-hover:scale-110"
                      >
                        {!reduce && (
                          <motion.span
                            aria-hidden
                            className="absolute inset-0 rounded-full ring-2 ring-white/60"
                            animate={{ scale: [1, 1.5], opacity: [0.7, 0] }}
                            transition={{
                              duration: 2,
                              repeat: Infinity,
                              ease: "easeOut",
                            }}
                          />
                        )}
                        <Eye className="h-7 w-7 text-white" />
                      </motion.span>
                    </div>

                    {/* Prev / Next */}
                    {images.length > 1 && (
                      <>
                        <button
                          type="button"
                          onClick={() => go(activeIdx - 1)}
                          aria-label="Previous image"
                          className={`absolute left-3 top-1/2 z-10 flex h-10 w-10 -translate-y-1/2 items-center justify-center rounded-full bg-white/80 text-gray-900 opacity-0 shadow-lg backdrop-blur-md transition-all hover:scale-110 hover:bg-white group-hover:opacity-100 max-lg:opacity-100 ${focusRing}`}
                        >
                          <ChevronLeft className="h-5 w-5" />
                        </button>
                        <button
                          type="button"
                          onClick={() => go(activeIdx + 1)}
                          aria-label="Next image"
                          className={`absolute right-3 top-1/2 z-10 flex h-10 w-10 -translate-y-1/2 items-center justify-center rounded-full bg-white/80 text-gray-900 opacity-0 shadow-lg backdrop-blur-md transition-all hover:scale-110 hover:bg-white group-hover:opacity-100 max-lg:opacity-100 ${focusRing}`}
                        >
                          <ChevronRight className="h-5 w-5" />
                        </button>
                      </>
                    )}

                    {/* Bottom caption */}
                    <div className="pointer-events-none absolute bottom-0 left-0 z-10 w-full p-5">
                      <p className="text-xs font-semibold text-orange-300">
                        {template.categoryName}
                      </p>
                      <p className="mt-0.5 line-clamp-1 font-[family-name:var(--font-display)] text-lg font-bold text-white">
                        {template.name}
                      </p>
                    </div>
                  </div>
                </motion.div>
              </motion.div>
            </motion.div>

            {/* Thumbnails */}
            {images.length > 1 && (
              <motion.div
                variants={thumbParent}
                initial={reduce ? "show" : "hidden"}
                animate="show"
                style={{ perspective: 800 }}
                className="grid grid-cols-4 gap-3 sm:gap-4"
              >
                {images.slice(0, 4).map((img, i) => {
                  const active = i === activeIdx;
                  return (
                    <motion.button
                      key={img}
                      type="button"
                      variants={thumbChild}
                      whileHover={reduce ? undefined : { y: -4 }}
                      whileTap={{ scale: 0.95 }}
                      onClick={() => go(i)}
                      aria-label={`Show image ${i + 1}`}
                      aria-pressed={active}
                      className={`relative aspect-square overflow-hidden rounded-2xl border bg-white/50 transition-all ${focusRing} ${
                        active
                          ? "border-transparent opacity-100 ring-2 ring-orange-500 ring-offset-2 ring-offset-[#fdeadb]"
                          : "border-orange-200/60 opacity-70 hover:opacity-100"
                      }`}
                    >
                      <Image
                        src={img}
                        alt={`Gallery ${i + 1}`}
                        fill
                        sizes="120px"
                        className="object-cover"
                      />
                    </motion.button>
                  );
                })}
              </motion.div>
            )}
          </div>

          {/* ------------------------ Right: details ------------------------- */}
          <div className="flex flex-col">
            <div className="mb-8">
              <motion.span
                variants={riseVariants}
                className="inline-flex items-center gap-2 rounded-full border border-orange-200/60 bg-white/70 px-4 py-1.5 text-xs font-semibold text-orange-600 shadow-sm backdrop-blur-md"
              >
                <LayoutTemplate className="h-3.5 w-3.5" />
                {template.categoryName}
              </motion.span>

              <div className="mt-5">
                <MaskedWords text={template.name} reduce={reduce} />
              </div>

              <motion.p
                variants={riseVariants}
                className="mt-5 max-w-xl text-base leading-relaxed text-gray-600 sm:text-lg"
              >
                {template.description || FALLBACK_DESC}
              </motion.p>

              {/* Quick facts */}
              <motion.div
                variants={riseVariants}
                className="mt-6 flex flex-wrap gap-2"
              >
                {[
                  { icon: ShieldCheck, label: "Secure checkout" },
                  { icon: Zap, label: "Instant access" },
                  { icon: ImageIcon, label: `${photoCount} photo${photoCount > 1 ? "s" : ""}` },
                ].map((c) => (
                  <span
                    key={c.label}
                    className="inline-flex items-center gap-1.5 rounded-full border border-orange-200/60 bg-white/60 px-3 py-1.5 text-xs font-semibold text-gray-700 backdrop-blur-md"
                  >
                    <c.icon className="h-3.5 w-3.5 text-orange-500" />
                    {c.label}
                  </span>
                ))}
              </motion.div>
            </div>

            {/* Price box */}
            <motion.div
              variants={{
                hidden: { opacity: 0, y: 40, rotateX: -12, scale: 0.96 },
                show: {
                  opacity: 1,
                  y: 0,
                  rotateX: 0,
                  scale: 1,
                  transition: { duration: 0.9, ease: EASE },
                },
              }}
              style={{ transformPerspective: 1200 }}
              className={`relative mb-10 overflow-hidden rounded-3xl p-6 sm:p-8 ${glassCard}`}
            >
              {/* Top accent line that draws in */}
              <motion.span
                aria-hidden
                initial={reduce ? false : { scaleX: 0 }}
                animate={{ scaleX: 1 }}
                transition={{ duration: 1.1, delay: 0.8, ease: EASE }}
                className="absolute inset-x-0 top-0 h-1 origin-left bg-gradient-to-r from-orange-500 via-amber-400 to-orange-500"
              />

              <div className="flex items-end justify-between gap-4">
                <div>
                  <p className="text-sm font-medium text-gray-500">
                    One-time purchase
                  </p>
                  <div className="mt-1 flex items-baseline gap-2">
                    <span className="font-[family-name:var(--font-display)] text-5xl font-bold text-gray-900 sm:text-6xl">
                      {isPaid ? (
                        <CountUp value={template.price} reduce={reduce} prefix="Rs " />
                      ) : (
                        "Free"
                      )}
                    </span>
                  </div>
                </div>
                {template.isPremium && (
                  <motion.div
                    initial={reduce ? false : { scale: 0, rotate: -25 }}
                    animate={{ scale: 1, rotate: 0 }}
                    transition={{ type: "spring", stiffness: 220, damping: 12, delay: 1 }}
                    className="flex items-center gap-1.5 rounded-full bg-gradient-to-r from-orange-500 to-amber-500 px-4 py-2 text-xs font-bold text-white shadow-lg"
                  >
                    <Crown className="h-4 w-4" /> Premium
                  </motion.div>
                )}
              </div>

              <div className="mt-8 flex flex-col gap-3">
                <motion.button
                  type="button"
                  whileHover={reduce ? undefined : { y: -2 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={() => setIsPreviewOpen(true)}
                  className={`flex w-full items-center justify-center gap-2 rounded-xl bg-white/60 py-4 text-sm font-bold text-gray-900 ring-1 ring-orange-200 transition-colors hover:bg-white hover:ring-orange-300 ${focusRing}`}
                >
                  <Eye className="h-5 w-5" /> Live preview
                </motion.button>

                <motion.div
                  whileHover={reduce ? undefined : { y: -2, scale: 1.015 }}
                  whileTap={{ scale: 0.98 }}
                >
                  <Link
                    href={`/checkout/template/${template.id}`}
                    className={`group/buy relative flex w-full items-center justify-center gap-2 overflow-hidden rounded-xl py-4 text-base font-bold text-white ${primaryBtn} ${focusRing}`}
                  >
                    {/* Looping shimmer */}
                    {!reduce && (
                      <motion.span
                        aria-hidden
                        className="absolute inset-y-0 w-1/3 -skew-x-12 bg-gradient-to-r from-transparent via-white/40 to-transparent"
                        initial={{ x: "-150%" }}
                        animate={{ x: "450%" }}
                        transition={{
                          duration: 1.8,
                          ease: "easeInOut",
                          repeat: Infinity,
                          repeatDelay: 2.2,
                          delay: 1.4,
                        }}
                      />
                    )}
                    <ShoppingBag className="relative h-5 w-5" />
                    <span className="relative">
                      {isPaid ? "Buy template" : "Use template"}
                    </span>
                    <ArrowRight className="relative h-5 w-5 transition-transform group-hover/buy:translate-x-1" />
                  </Link>
                </motion.div>
              </div>

              <p className="mt-5 flex items-center justify-center gap-2 text-xs font-medium text-gray-500">
                <ShieldCheck className="h-4 w-4 text-[#f97316]" />
                Secure checkout. Instant access.
              </p>
            </motion.div>

            {/* Features */}
            <div>
              <motion.h3
                variants={riseVariants}
                className="mb-4 font-[family-name:var(--font-display)] text-lg font-bold text-gray-900"
              >
                What&apos;s included
              </motion.h3>
              <motion.ul
                variants={listParent}
                className="grid grid-cols-1 gap-3 sm:grid-cols-2"
              >
                {features.map((f) => (
                  <motion.li
                    key={f.title}
                    variants={listChild}
                    whileHover={reduce ? undefined : { y: -4 }}
                    className={`group/feat flex items-center gap-4 rounded-2xl p-4 transition-colors hover:border-orange-300 hover:bg-white ${glassCard}`}
                  >
                    <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-orange-50 to-orange-100 text-[#f97316] ring-1 ring-orange-200/60 transition-transform duration-500 group-hover/feat:-rotate-6 group-hover/feat:scale-110">
                      <f.icon className="h-5 w-5" />
                    </span>
                    <span className="min-w-0">
                      <span className="block text-sm font-bold text-gray-900">
                        {f.title}
                      </span>
                      <span className="block text-xs text-gray-500">
                        {f.text}
                      </span>
                    </span>
                  </motion.li>
                ))}
              </motion.ul>
            </div>
          </div>
        </div>
      </motion.div>

      {/* Mobile sticky buy bar */}
      <motion.div
        initial={reduce ? false : { y: 120, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ type: "spring", stiffness: 140, damping: 18, delay: 1.6 }}
        className="fixed inset-x-0 bottom-0 z-40 p-3 lg:hidden"
      >
        <div className="mx-auto flex max-w-md items-center gap-3 rounded-2xl border border-white/70 bg-white/85 p-3 shadow-[0_20px_50px_-20px_rgba(249,115,22,0.6)] backdrop-blur-xl">
          <div className="min-w-0 flex-1 pl-1">
            <p className="truncate text-xs font-semibold text-gray-500">
              {template.name}
            </p>
            <p className="font-[family-name:var(--font-display)] text-xl font-bold text-gray-900">
              {isPaid ? `Rs ${template.price.toLocaleString()}` : "Free"}
            </p>
          </div>
          <Link
            href={`/checkout/template/${template.id}`}
            className={`inline-flex items-center gap-2 rounded-xl px-5 py-3 text-sm font-bold text-white ${primaryBtn} ${focusRing}`}
          >
            {isPaid ? "Buy" : "Use"} <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
      </motion.div>

      <TemplatePreviewModal
        template={isPreviewOpen ? template : null}
        onClose={() => setIsPreviewOpen(false)}
      />
    </div>
  );
}