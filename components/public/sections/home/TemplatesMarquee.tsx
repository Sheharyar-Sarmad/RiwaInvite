"use client";

import { useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import {
  AnimatePresence,
  animate,
  motion,
  useMotionValue,
  useReducedMotion,
  useScroll,
  useTransform,
  Variants,
} from "framer-motion";
import { ArrowUpRight, ChevronLeft, ChevronRight, Eye, ShoppingBag, Sparkles } from "lucide-react";
import { apiClient } from "@/lib/api/api_base";
import {
  TemplatePreviewModal,
  TemplateData,
} from "@/components/public/models/TemplatePreviewModel";

const EASE = [0.16, 1, 0.3, 1] as const;
const focusRing =
  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-400/80 focus-visible:ring-offset-2 focus-visible:ring-offset-[#0a0a0a]";

/*
 * One width drives the card, the snap padding and the skeleton.
 * It is capped by the screen HEIGHT as well (17rem = header + padding + dots),
 * so the whole card, with its Preview and Buy buttons, fits on screen.
 */
const CW = "[--cw:clamp(180px,min(58vw,340px,calc((100svh_-_17rem)*0.68)),340px)]";
const CARD_W = "w-[var(--cw)]";

const clamp = (n: number, a: number, b: number) => Math.min(b, Math.max(a, n));

/* -------------------------------------------------------------------------- */
/*  Dot field                                                                 */
/*                                                                            */
/*  Light-orange dots on black, always. They twinkle slowly. Near the cursor  */
/*  they swell, turn full orange, get pushed outward and join up in a fine    */
/*  lattice. Click anywhere and a ripple runs through the grid. Touch         */
/*  devices and reduced-motion users get the static dots only.                */
/* -------------------------------------------------------------------------- */

function DotField({
  hostRef,
  reduce,
}: {
  hostRef: React.RefObject<HTMLElement | null>;
  reduce: boolean;
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    const host = hostRef.current;
    if (!canvas || !host) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const GAP = 28;
    const RADIUS = 175;
    let w = 0;
    let h = 0;
    let cols = 0;
    let rows = 0;
    let ox = 0;
    let oy = 0;
    let xs = new Float32Array(0);
    let ys = new Float32Array(0);
    let fs = new Float32Array(0);

    let tx = -9999;
    let ty = -9999;
    let mx = -9999;
    let my = -9999;
    let hover = 0;
    let hoverTarget = 0;
    const ripples: { x: number; y: number; t: number }[] = [];

    const resize = () => {
      const r = host.getBoundingClientRect();
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      w = r.width;
      h = r.height;
      canvas.width = Math.round(w * dpr);
      canvas.height = Math.round(h * dpr);
      canvas.style.width = `${w}px`;
      canvas.style.height = `${h}px`;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      cols = Math.ceil(w / GAP) + 1;
      rows = Math.ceil(h / GAP) + 1;
      ox = (w - (cols - 1) * GAP) / 2;
      oy = (h - (rows - 1) * GAP) / 2;
      xs = new Float32Array(cols * rows);
      ys = new Float32Array(cols * rows);
      fs = new Float32Array(cols * rows);
      if (reduce) draw(0);
    };

    const draw = (now: number) => {
      const time = now / 1000;
      mx += (tx - mx) * 0.2;
      my += (ty - my) * 0.2;
      hover += (hoverTarget - hover) * 0.1;
      ctx.clearRect(0, 0, w, h);

      for (let i = ripples.length - 1; i >= 0; i--) {
        if (now - ripples[i].t > 1500) ripples.splice(i, 1);
      }

      // 1) positions + how "lit" each dot is
      for (let j = 0; j < rows; j++) {
        for (let i = 0; i < cols; i++) {
          const idx = j * cols + i;
          const bx = ox + i * GAP;
          const by = oy + j * GAP;
          let x = bx;
          let y = by;
          let f = 0;

          if (hover > 0.01) {
            const dx = bx - mx;
            const dy = by - my;
            const d = Math.hypot(dx, dy);
            if (d < RADIUS) {
              const k = 1 - d / RADIUS;
              f = k * k * (3 - 2 * k) * hover;
              if (d > 0.01) {
                const push = f * 9;
                x += (dx / d) * push;
                y += (dy / d) * push;
              }
            }
          }

          for (let r = 0; r < ripples.length; r++) {
            const age = (now - ripples[r].t) / 1000;
            const ringR = age * 540;
            const d = Math.hypot(bx - ripples[r].x, by - ripples[r].y);
            const diff = Math.abs(d - ringR);
            if (diff < 48) {
              f = Math.max(f, (1 - diff / 48) * (1 - age / 1.5));
            }
          }

          xs[idx] = x;
          ys[idx] = y;
          fs[idx] = f;
        }
      }

      // 2) fine lattice between lit neighbours
      if (hover > 0.05 || ripples.length) {
        ctx.lineWidth = 1;
        for (let j = 0; j < rows; j++) {
          for (let i = 0; i < cols; i++) {
            const idx = j * cols + i;
            const f = fs[idx];
            if (f < 0.1) continue;
            if (i < cols - 1) {
              const m = Math.min(f, fs[idx + 1]);
              if (m > 0.08) {
                ctx.strokeStyle = `rgba(249,115,22,${(m * 0.5).toFixed(3)})`;
                ctx.beginPath();
                ctx.moveTo(xs[idx], ys[idx]);
                ctx.lineTo(xs[idx + 1], ys[idx + 1]);
                ctx.stroke();
              }
            }
            if (j < rows - 1) {
              const m = Math.min(f, fs[idx + cols]);
              if (m > 0.08) {
                ctx.strokeStyle = `rgba(249,115,22,${(m * 0.5).toFixed(3)})`;
                ctx.beginPath();
                ctx.moveTo(xs[idx], ys[idx]);
                ctx.lineTo(xs[idx + cols], ys[idx + cols]);
                ctx.stroke();
              }
            }
          }
        }
      }

      // 3) dots
      ctx.fillStyle = "rgb(253,186,116)";
      for (let j = 0; j < rows; j++) {
        for (let i = 0; i < cols; i++) {
          const idx = j * cols + i;
          const bx = ox + i * GAP;
          const by = oy + j * GAP;
          const dxc = (bx - w / 2) / (w / 2);
          const dyc = (by - h / 2) / (h / 2);
          const vignette = 1 - 0.4 * Math.min(1, (dxc * dxc + dyc * dyc) / 2);
          const tw = 0.5 + 0.5 * Math.sin(time * 0.9 + i * 0.45 + j * 0.7);
          const base = (0.26 + 0.16 * tw) * vignette;
          const f = fs[idx];
          const radius = 1.3 + f * 3.1;

          if (f < 0.02) {
            ctx.globalAlpha = base;
            ctx.beginPath();
            ctx.arc(xs[idx], ys[idx], radius, 0, Math.PI * 2);
            ctx.fill();
          } else {
            const r = 253 + (249 - 253) * f;
            const g = 186 + (115 - 186) * f;
            const b = 116 + (22 - 116) * f;
            ctx.globalAlpha = 1;
            if (f > 0.45) {
              ctx.fillStyle = `rgba(249,115,22,${(0.16 * f).toFixed(3)})`;
              ctx.beginPath();
              ctx.arc(xs[idx], ys[idx], radius * 3, 0, Math.PI * 2);
              ctx.fill();
            }
            ctx.fillStyle = `rgba(${r | 0},${g | 0},${b | 0},${Math.min(1, base + f * 0.9).toFixed(3)})`;
            ctx.beginPath();
            ctx.arc(xs[idx], ys[idx], radius, 0, Math.PI * 2);
            ctx.fill();
            ctx.fillStyle = "rgb(253,186,116)";
          }
        }
      }
      ctx.globalAlpha = 1;

      // 4) cursor ring
      if (hover > 0.05) {
        ctx.save();
        ctx.shadowColor = "rgba(249,115,22,0.9)";
        ctx.shadowBlur = 18;
        ctx.strokeStyle = `rgba(251,146,60,${(0.7 * hover).toFixed(3)})`;
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.arc(mx, my, 18 + 3 * Math.sin(time * 3), 0, Math.PI * 2);
        ctx.stroke();
        ctx.fillStyle = `rgba(249,115,22,${hover.toFixed(3)})`;
        ctx.beginPath();
        ctx.arc(mx, my, 3, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
      }
    };

    resize();

    const ro = new ResizeObserver(resize);
    ro.observe(host);

    if (reduce) {
      return () => ro.disconnect();
    }

    const toLocal = (e: PointerEvent) => {
      const r = host.getBoundingClientRect();
      return { x: e.clientX - r.left, y: e.clientY - r.top };
    };
    const onMove = (e: PointerEvent) => {
      if (e.pointerType !== "mouse") return;
      const p = toLocal(e);
      tx = p.x;
      ty = p.y;
      if (hoverTarget === 0) {
        mx = p.x;
        my = p.y;
      }
      hoverTarget = 1;
    };
    const onLeave = () => {
      hoverTarget = 0;
    };
    const onDown = (e: PointerEvent) => {
      if (e.pointerType !== "mouse") return;
      const p = toLocal(e);
      ripples.push({ x: p.x, y: p.y, t: performance.now() });
    };
    host.addEventListener("pointermove", onMove);
    host.addEventListener("pointerleave", onLeave);
    host.addEventListener("pointerdown", onDown);

    // Only animate while the section is on screen.
    let raf = 0;
    const loop = (now: number) => {
      draw(now);
      raf = requestAnimationFrame(loop);
    };
    const io = new IntersectionObserver(([entry]) => {
      cancelAnimationFrame(raf);
      if (entry.isIntersecting) raf = requestAnimationFrame(loop);
    });
    io.observe(host);

    return () => {
      cancelAnimationFrame(raf);
      io.disconnect();
      ro.disconnect();
      host.removeEventListener("pointermove", onMove);
      host.removeEventListener("pointerleave", onLeave);
      host.removeEventListener("pointerdown", onDown);
    };
  }, [hostRef, reduce]);

  return <canvas ref={canvasRef} aria-hidden className="pointer-events-none absolute inset-0 z-0" />;
}

/* -------------------------------------------------------------------------- */
/*  Header pieces                                                             */
/* -------------------------------------------------------------------------- */

function Reveal({
  children,
  delay = 0,
  reduce,
  className,
}: {
  children: React.ReactNode;
  delay?: number;
  reduce: boolean;
  className?: string;
}) {
  return (
    <motion.div
      initial={reduce ? false : { opacity: 0, y: 24, filter: "blur(8px)" }}
      whileInView={{ opacity: 1, y: 0, filter: "blur(0px)" }}
      viewport={{ once: true, margin: "-80px" }}
      transition={{ duration: 0.8, delay, ease: EASE }}
      className={className}
    >
      {children}
    </motion.div>
  );
}

const wordsParent: Variants = {
  hidden: {},
  show: { transition: { staggerChildren: 0.07, delayChildren: 0.1 } },
};

const wordChild: Variants = {
  hidden: { y: "115%", rotate: 4 },
  show: { y: 0, rotate: 0, transition: { duration: 0.9, ease: EASE } },
};

function MaskedWords({
  words,
  reduce,
  gradientFrom,
}: {
  words: string[];
  reduce: boolean;
  gradientFrom: number;
}) {
  return (
    <motion.h2
      aria-label={words.join(" ")}
      variants={wordsParent}
      initial={reduce ? "show" : "hidden"}
      whileInView="show"
      viewport={{ once: true, margin: "-80px" }}
      className="text-balance font-[family-name:var(--font-display)] text-[clamp(1.6rem,0.9rem+3.2vw,3.25rem)] font-bold leading-[1.1] tracking-tight text-white"
    >
      {words.map((w, i) => (
        <span key={i} className="mr-[0.25em] inline-block overflow-hidden pb-[0.12em] align-bottom">
          <motion.span
            aria-hidden
            variants={wordChild}
            className={`inline-block origin-bottom-left ${
              i >= gradientFrom
                ? "bg-gradient-to-r from-orange-400 via-amber-300 to-orange-400 bg-clip-text text-transparent"
                : ""
            }`}
          >
            {w}
          </motion.span>
        </span>
      ))}
    </motion.h2>
  );
}

/* -------------------------------------------------------------------------- */
/*  Price: counts up each time its card lands in the centre                   */
/* -------------------------------------------------------------------------- */

function CountPrice({ value, play, reduce }: { value: number; play: boolean; reduce: boolean }) {
  const mv = useMotionValue(value);
  const text = useTransform(mv, (v) => (v < 0.5 ? "Free" : `Rs ${Math.round(v).toLocaleString()}`));

  useEffect(() => {
    if (reduce || !play) {
      mv.set(value);
      return;
    }
    mv.set(0);
    const controls = animate(mv, value, { duration: 1, delay: 0.15, ease: EASE });
    return () => controls.stop();
  }, [play, value, reduce, mv]);

  return <motion.span>{text}</motion.span>;
}

/* -------------------------------------------------------------------------- */
/*  Card                                                                      */
/*                                                                            */
/*  <li>       scroll-snap item, owns the width                               */
/*   enter     one-time entrance (rises in, staggered from the centre out)    */
/*    pose     transform written by the scroll loop (coverflow rotation)       */
/*     lift    springs up with a small overshoot when the card becomes active  */
/*                                                                            */
/*  Preview and Buy live ON the centred card, so they are always visible      */
/*  together with the card. No scrolling to reach them.                       */
/* -------------------------------------------------------------------------- */

function TemplateCard({
  template,
  active,
  priority,
  reduce,
  enterDelay,
  liRef,
  onActivate,
  onPreview,
}: {
  template: TemplateData;
  active: boolean;
  priority: boolean;
  reduce: boolean;
  enterDelay: number;
  liRef: (el: HTMLLIElement | null) => void;
  onActivate: () => void;
  onPreview: () => void;
}) {
  const isPaid = template.price > 0;

  return (
    <li
      ref={liRef}
      className={`relative shrink-0 snap-center list-none ${CARD_W} mx-[calc(var(--cw)*-0.1)]`}
    >
      <motion.div
        initial={reduce ? false : { opacity: 0, y: 90, scale: 0.86 }}
        whileInView={{ opacity: 1, y: 0, scale: 1 }}
        viewport={{ once: true, amount: 0.15 }}
        transition={{ duration: 0.9, delay: enterDelay, ease: EASE }}
      >
        <div data-pose className="will-change-transform">
          <motion.div
            animate={reduce ? undefined : { y: active ? -10 : 0, scale: active ? 1 : 0.985 }}
            transition={{ type: "spring", stiffness: 260, damping: 15, mass: 0.8 }}
            className="relative"
          >
            {/* one-shot ring that pops out when this card lands in the centre */}
            <AnimatePresence>
              {active && !reduce && (
                <motion.span
                  key="pulse"
                  aria-hidden
                  initial={{ opacity: 0.8, scale: 1 }}
                  animate={{ opacity: 0, scale: 1.1 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.9, ease: EASE }}
                  className="pointer-events-none absolute inset-0 rounded-[1.25rem] border-2 border-orange-400 sm:rounded-[1.5rem]"
                />
              )}
            </AnimatePresence>

            <motion.div
              animate={{
                borderColor: active ? "rgba(251,146,60,0.65)" : "rgba(255,255,255,0.10)",
                boxShadow: active
                  ? "0 40px 80px -28px rgba(249,115,22,0.55), 0 0 0 1px rgba(251,146,60,0.12)"
                  : "0 20px 40px -24px rgba(0,0,0,0.8), 0 0 0 0px rgba(251,146,60,0)",
              }}
              transition={{ duration: 0.5, ease: EASE }}
              className="group/card relative aspect-[3/4.4] w-full overflow-hidden rounded-[1.25rem] border bg-[#14110f] sm:rounded-[1.5rem]"
            >
              {/* whole-card target: centre card opens preview, side cards slide to centre */}
              <button
                type="button"
                onClick={onActivate}
                aria-label={active ? `Preview ${template.name}` : `Show ${template.name}`}
                tabIndex={active ? 0 : -1}
                className={`absolute inset-0 z-30 rounded-[inherit] ${focusRing}`}
              />

              <Image
                src={template.thumbnailUrl}
                alt={template.name}
                fill
                quality={90}
                sizes="(max-width: 640px) 58vw, 340px"
                priority={priority}
                draggable={false}
                className="select-none object-cover transition-transform duration-[1200ms] ease-out group-hover/card:scale-[1.04]"
              />

              <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-[#0a0a0a] via-[#0a0a0a]/35 to-transparent" />
              <div className="pointer-events-none absolute inset-0 rounded-[inherit] ring-1 ring-inset ring-white/10" />

              {/* light sweep every time the card becomes the active one */}
              <AnimatePresence>
                {active && !reduce && (
                  <motion.span
                    key="sweep"
                    aria-hidden
                    initial={{ x: "-130%" }}
                    animate={{ x: "260%" }}
                    exit={{ opacity: 0 }}
                    transition={{ duration: 1.1, ease: "easeInOut", delay: 0.12 }}
                    className="pointer-events-none absolute inset-y-0 left-0 z-20 w-1/2 -skew-x-12 bg-gradient-to-r from-transparent via-white/25 to-transparent"
                  />
                )}
              </AnimatePresence>

              {template.isPremium && (
                <span className="absolute left-2.5 top-2.5 z-20 flex items-center gap-1 rounded-full bg-gradient-to-r from-orange-500 to-amber-500 px-2 py-0.5 text-[10px] font-bold text-white shadow-[0_0_15px_-3px_rgba(249,115,22,0.8)] sm:left-4 sm:top-4 sm:px-2.5 sm:py-1 sm:text-xs">
                  <Sparkles className="h-3 w-3" />
                  Premium
                </span>
              )}

              <span className="absolute right-2.5 top-2.5 z-20 rounded-full bg-black/55 px-2 py-0.5 text-[10px] font-semibold tabular-nums text-white ring-1 ring-white/15 backdrop-blur-md sm:right-4 sm:top-4 sm:px-2.5 sm:py-1 sm:text-xs">
                <CountPrice value={template.price} play={active} reduce={reduce} />
              </span>

              {/* text + actions */}
              <div className="pointer-events-none absolute inset-x-0 bottom-0 z-40 flex flex-col gap-2 p-3 sm:gap-3 sm:p-4">
                <div className="min-w-0">
                  <p className="mb-0.5 truncate text-[10px] font-semibold text-orange-400 sm:text-xs">
                    {template.categoryName}
                  </p>
                  <h3 className="line-clamp-2 font-[family-name:var(--font-display)] text-sm font-bold leading-tight text-white sm:text-lg">
                    {template.name}
                  </h3>
                </div>

                {/* space is always reserved so the text never jumps */}
                <motion.div
                  aria-hidden={!active}
                  initial={false}
                  animate={{ opacity: active ? 1 : 0, y: active ? 0 : 16 }}
                  transition={{ duration: 0.45, ease: EASE, delay: active ? 0.18 : 0 }}
                  className={`flex h-9 items-center gap-1.5 sm:h-10 sm:gap-2 ${
                    active ? "pointer-events-auto" : "pointer-events-none"
                  }`}
                >
                  <button
                    type="button"
                    tabIndex={active ? 0 : -1}
                    aria-label={`Preview ${template.name}`}
                    onClick={onPreview}
                    className={`flex h-full min-w-0 flex-1 items-center justify-center gap-1.5 whitespace-nowrap rounded-full bg-white/15 px-1 text-[11px] font-bold text-white ring-1 ring-white/25 backdrop-blur-md transition-colors hover:bg-white/25 sm:text-sm ${focusRing}`}
                  >
                    <Eye className="hidden h-4 w-4 sm:block" />
                    Preview
                  </button>
                  <Link
                    href={`/template/${template.id}`}
                    prefetch={false}
                    tabIndex={active ? 0 : -1}
                    aria-label={`${isPaid ? "Buy" : "Use"} ${template.name}`}
                    className={`group/buy flex h-full min-w-0 flex-1 items-center justify-center gap-1 whitespace-nowrap rounded-full bg-[#f97316] px-1 text-[11px] font-bold text-white shadow-[0_0_20px_-6px_rgba(249,115,22,0.9)] transition-colors hover:bg-orange-400 sm:gap-1.5 sm:text-sm ${focusRing}`}
                  >
                    {isPaid && <ShoppingBag className="hidden h-4 w-4 sm:block" />}
                    <span className="sm:hidden">{isPaid ? "Buy" : "Use"}</span>
                    <span className="hidden sm:inline">{isPaid ? "Buy Template" : "Use Template"}</span>
                    <ArrowUpRight className="h-3 w-3 transition-transform duration-300 group-hover/buy:-translate-y-0.5 group-hover/buy:translate-x-0.5 sm:h-4 sm:w-4" />
                  </Link>
                </motion.div>
              </div>
            </motion.div>
          </motion.div>
        </div>
      </motion.div>
    </li>
  );
}

/* -------------------------------------------------------------------------- */
/*  Loading skeleton                                                          */
/* -------------------------------------------------------------------------- */

function MarqueeSkeleton() {
  return (
    <section
      className="relative w-full overflow-hidden bg-[#0a0a0a] py-10 sm:py-14 lg:py-16"
      aria-busy="true"
    >
      <div className="mx-auto mb-6 flex max-w-2xl flex-col items-center gap-4 px-4 sm:mb-8">
        <div className="h-7 w-36 animate-pulse rounded-full bg-white/5" />
        <div className="h-10 w-full animate-pulse rounded-xl bg-white/5" />
        <div className="h-4 w-2/3 animate-pulse rounded bg-white/5" />
      </div>
      <div className={`flex items-center justify-center py-10 ${CW}`}>
        {[-1, 0, 1].map((i) => (
          <div
            key={i}
            style={{
              transform: `perspective(1400px) translateZ(${i === 0 ? 0 : -150}px) rotateY(${-i * 42}deg) scale(${i === 0 ? 1 : 0.94})`,
              opacity: i === 0 ? 1 : 0.5,
            }}
            className={`relative mx-[calc(var(--cw)*-0.1)] aspect-[3/4.4] shrink-0 overflow-hidden rounded-[1.25rem] border border-white/10 bg-white/[0.03] sm:rounded-[1.5rem] ${CARD_W} ${
              i === 0 ? "z-10" : "max-sm:hidden"
            }`}
          >
            <motion.div
              aria-hidden
              className="absolute inset-y-0 w-1/2 bg-gradient-to-r from-transparent via-white/[0.06] to-transparent"
              initial={{ x: "-100%" }}
              animate={{ x: "300%" }}
              transition={{ duration: 1.6, ease: "easeInOut", repeat: Infinity, delay: (i + 1) * 0.15 }}
            />
          </div>
        ))}
      </div>
    </section>
  );
}

/* -------------------------------------------------------------------------- */
/*  Section                                                                   */
/* -------------------------------------------------------------------------- */

export function TemplatesMarquee() {
  const [templates, setTemplates] = useState<TemplateData[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedTemplate, setSelectedTemplate] = useState<TemplateData | null>(null);
  const [active, setActive] = useState(0);
  const reduce = useReducedMotion() ?? false;

  const sectionRef = useRef<HTMLElement>(null);
  const scrollerRef = useRef<HTMLUListElement>(null);
  const itemRefs = useRef<(HTMLLIElement | null)[]>([]);
  const activeRef = useRef(0);
  const drag = useRef<{ x: number; left: number; moved: boolean } | null>(null);
  const justDragged = useRef(false);

  const { scrollYProgress } = useScroll({
    target: sectionRef,
    offset: ["start end", "end start"],
  });
  const orbY = useTransform(scrollYProgress, [0, 1], [-60, 100]);

  /* ------------------------------ data ------------------------------ */

  useEffect(() => {
    const fetchTemplates = async () => {
      try {
        const res = await apiClient.get("/public/templates/marque?limit=9");
        if (res.data?.status === "success") {
          const list: TemplateData[] = res.data.data.templates ?? [];
          // One card per template id, never a repeat.
          const unique = Array.from(new Map(list.map((t) => [t.id, t])).values());
          setTemplates(unique.slice(0, 9));
        }
      } catch (error) {
        console.error("Failed to load templates", error);
      } finally {
        setLoading(false);
      }
    };
    fetchTemplates();
  }, []);

  /* ------------------------- coverflow engine ------------------------ */
  // Writes each card's pose straight to the DOM on scroll (no React render).
  // State only changes when the centred card changes.

  const applyPoses = useCallback(() => {
    const scroller = scrollerRef.current;
    if (!scroller) return;
    const mid = scroller.scrollLeft + scroller.clientWidth / 2;
    let best = 0;
    let bestDist = Infinity;

    itemRefs.current.forEach((li, i) => {
      if (!li) return;
      const pose = li.querySelector<HTMLElement>("[data-pose]");
      if (!pose) return;
      const center = li.offsetLeft + li.offsetWidth / 2;
      const dx = center - mid;
      const d = dx / (li.offsetWidth * 0.78); // 0 = centred, +-1 = one slot away
      const ad = Math.min(Math.abs(d), 3.5);

      if (Math.abs(dx) < bestDist) {
        bestDist = Math.abs(dx);
        best = i;
      }

      li.style.zIndex = String(Math.round(100 - ad * 10));
      if (reduce) {
        pose.style.opacity = String(Math.max(0.35, 1 - ad * 0.3));
        return;
      }

      const rot = clamp(-d * 42, -62, 62);
      const z = -ad * 150;
      const s = 1 - Math.min(ad, 3) * 0.06;
      pose.style.transform = `perspective(1400px) translateZ(${z.toFixed(1)}px) rotateY(${rot.toFixed(2)}deg) scale(${s.toFixed(3)})`;
      pose.style.opacity = Math.max(0.25, 1 - ad * 0.24).toFixed(3);
    });

    if (best !== activeRef.current) {
      activeRef.current = best;
      setActive(best);
    }
  }, [reduce]);

  const scrollToIndex = useCallback(
    (i: number, smooth = true) => {
      const scroller = scrollerRef.current;
      const li = itemRefs.current[i];
      if (!scroller || !li) return;
      const left = li.offsetLeft + li.offsetWidth / 2 - scroller.clientWidth / 2;
      scroller.scrollTo({ left, behavior: smooth && !reduce ? "smooth" : "auto" });
    },
    [reduce],
  );

  // Start near the middle so cards show on both sides, then pose everything.
  useLayoutEffect(() => {
    if (loading || templates.length === 0) return;
    const start = Math.min(Math.floor((templates.length - 1) / 2), 3);
    activeRef.current = start;
    setActive(start);
    scrollToIndex(start, false);
    applyPoses();
  }, [loading, templates.length, applyPoses, scrollToIndex]);

  useEffect(() => {
    const scroller = scrollerRef.current;
    if (!scroller) return;
    let raf = 0;
    const onScroll = () => {
      cancelAnimationFrame(raf);
      raf = requestAnimationFrame(applyPoses);
    };
    const onResize = () => {
      scrollToIndex(activeRef.current, false);
      applyPoses();
    };
    scroller.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onResize);
    return () => {
      cancelAnimationFrame(raf);
      scroller.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onResize);
    };
  }, [loading, templates.length, applyPoses, scrollToIndex]);

  /* --------------------------- mouse drag --------------------------- */

  const onPointerDown = (e: React.PointerEvent<HTMLUListElement>) => {
    if (e.pointerType !== "mouse" || e.button !== 0) return;
    const el = scrollerRef.current;
    if (!el) return;
    drag.current = { x: e.clientX, left: el.scrollLeft, moved: false };
  };

  const onPointerMove = (e: React.PointerEvent<HTMLUListElement>) => {
    const d = drag.current;
    const el = scrollerRef.current;
    if (!d || !el) return;
    const dx = e.clientX - d.x;
    if (!d.moved && Math.abs(dx) > 6) {
      d.moved = true;
      el.style.scrollSnapType = "none";
      el.style.scrollBehavior = "auto";
      el.style.cursor = "grabbing";
      try {
        el.setPointerCapture(e.pointerId);
      } catch {}
    }
    if (d.moved) el.scrollLeft = d.left - dx;
  };

  const endDrag = () => {
    const d = drag.current;
    const el = scrollerRef.current;
    drag.current = null;
    if (!d || !el) return;
    if (d.moved) {
      justDragged.current = true;
      el.style.scrollSnapType = "";
      el.style.scrollBehavior = "";
      el.style.cursor = "";
      scrollToIndex(activeRef.current);
      window.setTimeout(() => (justDragged.current = false), 60);
    }
  };

  const onKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "ArrowRight") {
      e.preventDefault();
      scrollToIndex(Math.min(templates.length - 1, activeRef.current + 1));
    } else if (e.key === "ArrowLeft") {
      e.preventDefault();
      scrollToIndex(Math.max(0, activeRef.current - 1));
    } else if (e.key === "Home") {
      e.preventDefault();
      scrollToIndex(0);
    } else if (e.key === "End") {
      e.preventDefault();
      scrollToIndex(templates.length - 1);
    }
  };

  /* ------------------------------ render ----------------------------- */

  if (loading) return <MarqueeSkeleton />;
  if (templates.length === 0) return null;

  const many = templates.length > 1;
  const startIndex = Math.min(Math.floor((templates.length - 1) / 2), 3);

  return (
    <>
      <section
        ref={sectionRef}
        id="templates"
        className="relative w-full overflow-hidden bg-[#0a0a0a] py-10 sm:py-14 lg:py-16"
      >
        {/* ---------------- background: always black + light-orange dots ---------------- */}
        <DotField hostRef={sectionRef} reduce={reduce} />

        <motion.div
          aria-hidden
          style={reduce ? undefined : { y: orbY }}
          className="pointer-events-none absolute left-1/2 top-0 z-0 h-[300px] w-[500px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-orange-500/10 blur-[100px] sm:h-[500px] sm:w-[800px] sm:blur-[120px]"
        />
        {/* fixed orange spotlight behind the carousel, the same for every template */}
        <div
          aria-hidden
          className="pointer-events-none absolute left-1/2 top-[58%] z-0 h-[460px] w-[460px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-orange-500/[0.13] blur-[120px]"
        />

        {/* ---------------- header ---------------- */}
        <div className="relative z-10 mx-auto mb-3 w-full max-w-7xl px-4 text-center sm:mb-5 sm:px-6 lg:px-12">
          <Reveal reduce={reduce}>
            <span className="relative mb-3 inline-flex items-center gap-2 overflow-hidden rounded-full border border-orange-500/30 bg-orange-500/10 px-3.5 py-1.5 text-xs font-semibold text-orange-400 backdrop-blur-md sm:mb-4 sm:px-4 sm:text-sm">
              <Sparkles className="h-3.5 w-3.5" />
              The collection
              {!reduce && (
                <motion.span
                  aria-hidden
                  className="absolute inset-y-0 w-10 -skew-x-12 bg-white/20 blur-sm"
                  initial={{ x: "-300%" }}
                  animate={{ x: "800%" }}
                  transition={{ duration: 1.6, ease: "easeInOut", repeat: Infinity, repeatDelay: 3 }}
                />
              )}
            </span>
          </Reveal>

          <MaskedWords
            reduce={reduce}
            words={["Invitations", "that", "look", "impossibly", "expensive"]}
            gradientFrom={3}
          />

          <Reveal reduce={reduce} delay={0.5}>
            <p className="mx-auto mt-3 max-w-2xl font-[family-name:var(--font-body)] text-sm leading-relaxed text-neutral-400 sm:mt-4 sm:text-base">
              Hand-crafted designs across weddings, birthdays, and corporate galas. Pick one, make it
              yours, and publish in minutes.
            </p>
          </Reveal>
        </div>

        {/* ---------------- coverflow ---------------- */}
        <div className={`relative z-10 w-full ${CW}`}>
          {many && (
            <>
              <button
                type="button"
                aria-label="Previous template"
                onClick={() => scrollToIndex(Math.max(0, active - 1))}
                disabled={active === 0}
                className={`absolute left-2 top-1/2 z-40 hidden h-11 w-11 -translate-y-1/2 items-center justify-center rounded-full bg-white/10 text-white ring-1 ring-white/20 backdrop-blur-md transition hover:scale-110 hover:bg-orange-500 active:scale-95 disabled:pointer-events-none disabled:opacity-30 md:flex lg:left-8 ${focusRing}`}
              >
                <ChevronLeft className="h-5 w-5" />
              </button>
              <button
                type="button"
                aria-label="Next template"
                onClick={() => scrollToIndex(Math.min(templates.length - 1, active + 1))}
                disabled={active === templates.length - 1}
                className={`absolute right-2 top-1/2 z-40 hidden h-11 w-11 -translate-y-1/2 items-center justify-center rounded-full bg-white/10 text-white ring-1 ring-white/20 backdrop-blur-md transition hover:scale-110 hover:bg-orange-500 active:scale-95 disabled:pointer-events-none disabled:opacity-30 md:flex lg:right-8 ${focusRing}`}
              >
                <ChevronRight className="h-5 w-5" />
              </button>
            </>
          )}

          <ul
            ref={scrollerRef}
            role="listbox"
            aria-label="Invitation templates"
            tabIndex={0}
            onKeyDown={onKeyDown}
            onPointerDown={onPointerDown}
            onPointerMove={onPointerMove}
            onPointerUp={endDrag}
            onPointerCancel={endDrag}
            onClickCapture={(e) => {
              if (justDragged.current) e.stopPropagation();
            }}
            className="flex cursor-grab snap-x snap-mandatory items-center overflow-x-auto overscroll-x-contain scroll-smooth px-[calc(50%-var(--cw)/2)] py-10 [scrollbar-width:none] focus-visible:outline-none sm:py-12 [&::-webkit-scrollbar]:hidden"
          >
            {templates.map((t, i) => (
              <TemplateCard
                key={t.id}
                template={t}
                active={i === active}
                priority={i < 4}
                reduce={reduce}
                enterDelay={Math.abs(i - startIndex) * 0.1}
                liRef={(el) => {
                  itemRefs.current[i] = el;
                }}
                onActivate={() => {
                  if (i === activeRef.current) setSelectedTemplate(t);
                  else scrollToIndex(i);
                }}
                onPreview={() => setSelectedTemplate(t)}
              />
            ))}
          </ul>
        </div>

        {/* ---------------- progress ---------------- */}
        {many && (
          <div className="relative z-10 mx-auto flex flex-col items-center gap-2 px-4">
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-1.5" role="tablist" aria-label="Choose template">
                {templates.map((t, i) => (
                  <button
                    key={t.id}
                    type="button"
                    role="tab"
                    aria-selected={i === active}
                    aria-label={`Go to ${t.name}`}
                    onClick={() => scrollToIndex(i)}
                    className={`relative h-1.5 w-5 rounded-full bg-white/15 transition-colors hover:bg-white/30 sm:w-6 ${focusRing}`}
                  >
                    {i === active && (
                      <motion.span
                        layoutId="marquee-active-seg"
                        className="absolute inset-0 rounded-full bg-orange-500 shadow-[0_0_12px_rgba(249,115,22,0.8)]"
                        transition={{ type: "spring", stiffness: 420, damping: 32 }}
                      />
                    )}
                  </button>
                ))}
              </div>
              <span className="text-xs tabular-nums text-neutral-500">
                {active + 1} / {templates.length}
              </span>
            </div>
            <p className="text-center text-xs text-neutral-500">
              Drag, swipe or use the arrow keys to browse.
            </p>
          </div>
        )}
      </section>

      <TemplatePreviewModal
        template={selectedTemplate}
        onClose={() => setSelectedTemplate(null)}
      />
    </>
  );
}