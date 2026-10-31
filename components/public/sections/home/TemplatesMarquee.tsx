"use client";

import { useEffect, useRef, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import {
  motion,
  useMotionTemplate,
  useMotionValue,
  useReducedMotion,
  useScroll,
  useSpring,
  useTransform,
  Variants,
} from "framer-motion";
import { ArrowUpRight, Sparkles, Eye, ShoppingBag } from "lucide-react";
import { apiClient } from "@/lib/api/api_base";
import {
  TemplatePreviewModal,
  TemplateData,
} from "@/components/public/models/TemplatePreviewModel";

const EASE = [0.16, 1, 0.3, 1] as const;
const focusRing =
  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-400/80 focus-visible:ring-offset-2 focus-visible:ring-offset-[#0a0a0a]";

/*
 * Card sizing, in one place so the card and the skeleton always match.
 *  - phones (<640px): exactly two cards across, compact portrait ratio
 *  - tablets (640–1023px): two across, capped at 26rem, and capped by screen
 *    height so a card never grows taller than a landscape phone/tablet
 *  - desktop (>=1024px): fixed 360 x 500
 */
const CARD_SIZE =
  "mr-3 w-[calc((100vw-2.5rem)/2)] aspect-[3/4.7] " +
  "sm:mr-4 sm:w-[min(calc((100vw-3.5rem)/2),26rem,calc((100svh_-_6rem)*0.68))] sm:aspect-[3/4.4] " +
  "lg:mr-6 lg:aspect-auto lg:h-[500px] lg:w-[360px]";

/* -------------------------------------------------------------------------- */
/*  Hooks                                                                     */
/* -------------------------------------------------------------------------- */

function useMediaQuery(query: string) {
  const [match, setMatch] = useState(false);
  useEffect(() => {
    const mq = window.matchMedia(query);
    const update = () => setMatch(mq.matches);
    update();
    mq.addEventListener("change", update);
    return () => mq.removeEventListener("change", update);
  }, [query]);
  return match;
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
      className="text-balance font-[family-name:var(--font-display)] text-[clamp(1.75rem,1rem+3.6vw,3.75rem)] font-bold leading-[1.1] tracking-tight text-white"
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
/*  Card                                                                      */
/*                                                                            */
/*  Two actions per card:                                                     */
/*   1. Preview  -> opens the preview modal (quick look, stays on the page)   */
/*   2. Buy / Use -> goes to /template/[id], the template's own detail and    */
/*                   purchase page                                            */
/* -------------------------------------------------------------------------- */

function TemplateCard({
  template,
  priority,
  duplicate,
  reduce,
  onOpen,
}: {
  template: TemplateData;
  priority: boolean;
  duplicate: boolean;
  reduce: boolean;
  onOpen: () => void;
}) {
  const px = useMotionValue(0);
  const py = useMotionValue(0);
  const sx = useSpring(px, { stiffness: 140, damping: 22 });
  const sy = useSpring(py, { stiffness: 140, damping: 22 });
  const rotateY = useTransform(sx, [-0.5, 0.5], [3, -3]);
  const rotateX = useTransform(sy, [-0.5, 0.5], [-3, 3]);
  const imgX = useTransform(sx, [-0.5, 0.5], [6, -6]);
  const imgY = useTransform(sy, [-0.5, 0.5], [6, -6]);

  const gx = useMotionValue(-400);
  const gy = useMotionValue(-400);
  const glow = useMotionTemplate`radial-gradient(240px circle at ${gx}px ${gy}px, rgba(249,115,22,0.28), transparent 70%)`;

  const isPaid = template.price > 0;
  const priceLabel = isPaid ? `Rs ${template.price.toLocaleString()}` : "Free";

  return (
    <motion.div
      aria-hidden={duplicate || undefined}
      onClick={onOpen}
      onMouseMove={
        reduce
          ? undefined
          : (e) => {
              const r = e.currentTarget.getBoundingClientRect();
              const nx = (e.clientX - r.left) / r.width;
              const ny = (e.clientY - r.top) / r.height;
              px.set(nx - 0.5);
              py.set(ny - 0.5);
              gx.set(nx * r.width);
              gy.set(ny * r.height);
            }
      }
      onMouseLeave={() => {
        px.set(0);
        py.set(0);
        gx.set(-400);
        gy.set(-400);
      }}
      initial={reduce ? false : { opacity: 0, y: 40, scale: 0.94 }}
      whileInView={{ opacity: 1, y: 0, scale: 1 }}
      viewport={{ once: true, margin: "-40px" }}
      whileHover={reduce ? undefined : { y: -4 }}
      whileTap={{ scale: 0.98 }}
      transition={{ duration: 0.7, ease: EASE }}
      style={reduce ? undefined : { rotateX, rotateY, transformPerspective: 1400 }}
      className={`group relative flex shrink-0 cursor-pointer snap-start flex-col overflow-hidden rounded-[1.25rem] border border-white/10 bg-white/5 shadow-2xl backdrop-blur-xl transition-[border-color,box-shadow,background-color] duration-500 hover:border-orange-500/50 hover:bg-white/10 hover:shadow-[0_30px_60px_-20px_rgba(249,115,22,0.45)] sm:rounded-[2rem] ${CARD_SIZE}`}
    >
      <div className="relative h-full w-full overflow-hidden">
        <motion.div
          style={reduce ? undefined : { x: imgX, y: imgY, scale: 1.06 }}
          className="absolute inset-0"
        >
          <Image
            src={template.thumbnailUrl}
            alt={template.name}
            fill
            quality={90}
            sizes="(max-width: 640px) 50vw, (max-width: 1024px) 416px, 360px"
            priority={priority}
            className="object-cover transition-transform duration-[900ms] ease-out group-hover:scale-105"
          />
        </motion.div>
        <div className="absolute inset-0 bg-gradient-to-t from-[#0a0a0a] via-[#0a0a0a]/30 to-transparent opacity-95" />
        <motion.div
          aria-hidden
          style={{ background: glow }}
          className="pointer-events-none absolute inset-0 opacity-0 mix-blend-screen transition-opacity duration-300 group-hover:opacity-100"
        />

        {template.isPremium && (
          <span className="absolute left-2 top-2 flex items-center gap-1 overflow-hidden rounded-full bg-gradient-to-r from-orange-500 to-amber-500 px-2 py-0.5 text-[10px] font-bold text-white shadow-[0_0_15px_-3px_rgba(249,115,22,0.8)] sm:left-4 sm:top-4 sm:gap-1.5 sm:px-3 sm:py-1 sm:text-xs">
            <Sparkles className="h-2.5 w-2.5 sm:h-3 sm:w-3" />
            Premium
            {!reduce && (
              <motion.span
                aria-hidden
                className="absolute inset-y-0 w-8 -skew-x-12 bg-white/40 blur-sm"
                initial={{ x: "-250%" }}
                animate={{ x: "700%" }}
                transition={{ duration: 1.3, ease: "easeInOut", repeat: Infinity, repeatDelay: 3.2 }}
              />
            )}
          </span>
        )}

        {/* Price chip */}
        <span className="absolute right-2 top-2 rounded-full bg-black/50 px-2 py-0.5 text-[10px] font-semibold tabular-nums text-white ring-1 ring-white/15 backdrop-blur-md sm:right-4 sm:top-4 sm:px-3 sm:py-1 sm:text-xs">
          {priceLabel}
        </span>
      </div>

      <div className="absolute bottom-0 left-0 w-full p-2.5 min-[400px]:p-3 sm:p-5 lg:p-6">
        <p className="mb-0.5 truncate text-[10px] font-semibold text-orange-400 sm:mb-1.5 sm:text-xs">
          {template.categoryName}
        </p>
        <h3 className="mb-2 line-clamp-1 font-[family-name:var(--font-display)] text-sm font-bold leading-tight text-white sm:mb-3 sm:text-lg lg:text-xl">
          {template.name}
        </h3>

        <div className="flex items-center gap-1.5 sm:gap-2">
          {/* 1. Preview: opens the modal */}
          <button
            type="button"
            tabIndex={duplicate ? -1 : 0}
            aria-label={`Preview ${template.name}`}
            onClick={(e) => {
              e.stopPropagation();
              onOpen();
            }}
            className={`flex h-9 min-w-0 flex-1 items-center justify-center gap-1.5 whitespace-nowrap rounded-full bg-white/15 px-1 text-[11px] font-bold text-white ring-1 ring-white/25 backdrop-blur-md transition-colors hover:bg-white/25 sm:h-10 sm:px-2 sm:text-sm ${focusRing}`}
          >
            <Eye className="hidden h-4 w-4 sm:block" />
            Preview
          </button>

          {/* 2. Buy / Use: this template's detail + purchase page */}
          <Link
            href={`/template/${template.id}`}
            prefetch={false}
            tabIndex={duplicate ? -1 : 0}
            aria-label={`${isPaid ? "Buy" : "Use"} ${template.name}`}
            onClick={(e) => e.stopPropagation()}
            className={`flex h-9 min-w-0 flex-1 items-center justify-center gap-1 whitespace-nowrap rounded-full bg-[#f97316] px-1 text-[11px] font-bold text-white shadow-[0_0_20px_-6px_rgba(249,115,22,0.9)] transition-colors hover:bg-orange-400 sm:h-10 sm:gap-1.5 sm:px-2 sm:text-sm ${focusRing}`}
          >
            {isPaid && <ShoppingBag className="hidden h-4 w-4 sm:block" />}
            <span className="sm:hidden">{isPaid ? "Buy" : "Use"}</span>
            <span className="hidden sm:inline">{isPaid ? "Buy Template" : "Use Template"}</span>
            <ArrowUpRight className="h-3 w-3 sm:h-4 sm:w-4" />
          </Link>
        </div>
      </div>
    </motion.div>
  );
}

/* -------------------------------------------------------------------------- */
/*  Loading skeleton                                                          */
/* -------------------------------------------------------------------------- */

function MarqueeSkeleton() {
  return (
    <section
      className="relative w-full overflow-hidden bg-[#0a0a0a] py-14 sm:py-20 lg:py-32"
      aria-busy="true"
    >
      <div className="mx-auto mb-8 flex max-w-2xl flex-col items-center gap-4 px-4 sm:mb-12 lg:mb-16">
        <div className="h-7 w-36 animate-pulse rounded-full bg-white/5" />
        <div className="h-12 w-full animate-pulse rounded-xl bg-white/5" />
        <div className="h-4 w-2/3 animate-pulse rounded bg-white/5" />
      </div>
      <div className="flex overflow-hidden pl-4 sm:pl-6 lg:justify-center lg:pl-0">
        {[0, 1, 2, 3].map((i) => (
          <div
            key={i}
            className={`relative shrink-0 overflow-hidden rounded-[1.25rem] border border-white/10 bg-white/[0.03] sm:rounded-[2rem] ${CARD_SIZE}`}
          >
            <motion.div
              aria-hidden
              className="absolute inset-y-0 w-1/2 bg-gradient-to-r from-transparent via-white/[0.06] to-transparent"
              initial={{ x: "-100%" }}
              animate={{ x: "300%" }}
              transition={{ duration: 1.6, ease: "easeInOut", repeat: Infinity, delay: i * 0.15 }}
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
  const reduce = useReducedMotion() ?? false;
  // Touch devices can't hover-to-pause, so they get a real swipeable row instead.
  const isTouch = useMediaQuery("(hover: none), (pointer: coarse)");

  const sectionRef = useRef<HTMLElement>(null);
  const { scrollYProgress } = useScroll({
    target: sectionRef,
    offset: ["start end", "end start"],
  });
  const orbY = useTransform(scrollYProgress, [0, 1], [-80, 120]);
  const orbY2 = useTransform(scrollYProgress, [0, 1], [80, -100]);

  useEffect(() => {
    const fetchTemplates = async () => {
      try {
        const res = await apiClient.get("/public/templates/marque?limit=9");
        if (res.data?.status === "success") {
          setTemplates(res.data.data.templates.slice(0, 9));
        }
      } catch (error) {
        console.error("Failed to load templates", error);
      } finally {
        setLoading(false);
      }
    };
    fetchTemplates();
  }, []);

  if (loading) return <MarqueeSkeleton />;
  if (templates.length === 0) return null;

  const paused = selectedTemplate !== null;
  const swipe = isTouch && !reduce;
  const marquee = !isTouch && !reduce;
  const items = marquee ? [...templates, ...templates] : templates;

  const rowClass = reduce
    ? "flex-wrap justify-center gap-y-4 pr-4 sm:gap-y-6 sm:pr-6 lg:pr-12"
    : swipe
    ? "snap-x snap-mandatory overflow-x-auto overscroll-x-contain scroll-pl-4 pr-4 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden sm:scroll-pl-6 sm:pr-6"
    : `w-max animate-[marquee-x_40s_linear_infinite] group-hover/marquee:[animation-play-state:paused] ${
        paused ? "[animation-play-state:paused]" : ""
      }`;

  return (
    <>
      <section
        ref={sectionRef}
        id="templates"
        className="relative w-full overflow-hidden bg-[#0a0a0a] py-14 sm:py-20 lg:py-32"
      >
        <motion.div
          aria-hidden
          style={reduce ? undefined : { y: orbY }}
          className="pointer-events-none absolute left-1/2 top-0 h-[300px] w-[500px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-orange-500/10 blur-[100px] sm:h-[500px] sm:w-[800px] sm:blur-[120px]"
        />
        <motion.div
          aria-hidden
          style={reduce ? undefined : { y: orbY2 }}
          className="pointer-events-none absolute bottom-0 left-0 h-[300px] w-[500px] rounded-full bg-indigo-500/10 blur-[100px]"
        />
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 opacity-50 [mask-image:radial-gradient(ellipse_at_center,black_20%,transparent_70%)]"
          style={{
            backgroundImage: "radial-gradient(rgba(255,255,255,0.06) 1px, transparent 1px)",
            backgroundSize: "28px 28px",
          }}
        />

        <div className="relative z-10 mx-auto mb-8 w-full max-w-7xl px-4 text-center sm:mb-12 sm:px-6 lg:mb-16 lg:px-12">
          <Reveal reduce={reduce}>
            <span className="relative mb-4 inline-flex items-center gap-2 overflow-hidden rounded-full border border-orange-500/30 bg-orange-500/10 px-3.5 py-1.5 text-xs font-semibold text-orange-400 backdrop-blur-md sm:mb-5 sm:px-4 sm:text-sm">
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
            <p className="mx-auto mt-4 max-w-2xl font-[family-name:var(--font-body)] text-sm leading-relaxed text-neutral-400 sm:mt-5 sm:text-lg">
              Hand-crafted designs across weddings, birthdays, and corporate galas. Pick one, make it
              yours, and publish in minutes.
            </p>
          </Reveal>
        </div>

        <div className="group/marquee relative w-full">
          <div className="pointer-events-none absolute inset-y-0 left-0 z-10 w-3 bg-gradient-to-r from-[#0a0a0a] to-transparent sm:w-16 lg:w-40" />
          <div className="pointer-events-none absolute inset-y-0 right-0 z-10 w-3 bg-gradient-to-l from-[#0a0a0a] to-transparent sm:w-16 lg:w-40" />

          <div className="py-4 sm:py-6">
            <div className={`flex pl-4 sm:pl-6 ${swipe ? "" : "lg:pl-12"} ${rowClass}`}>
              {items.map((template, idx) => (
                <TemplateCard
                  key={`${template.id}-${idx}`}
                  template={template}
                  priority={idx < 3}
                  duplicate={marquee && idx >= templates.length}
                  reduce={reduce}
                  onOpen={() => setSelectedTemplate(template)}
                />
              ))}
            </div>
          </div>

          <Reveal reduce={reduce} delay={0.2} className="mt-4 flex justify-center px-4 sm:mt-6">
            <p className="flex items-center gap-2 rounded-full bg-white/[0.04] px-3.5 py-1.5 text-center text-xs text-neutral-500 ring-1 ring-white/10 sm:px-4 sm:py-2 sm:text-sm">
              <span className="relative flex h-2 w-2 shrink-0">
                {!reduce && (
                  <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-orange-400 opacity-60" />
                )}
                <span className="relative inline-flex h-2 w-2 rounded-full bg-orange-500" />
              </span>
              {isTouch
                ? "Swipe to explore. Preview here or open a template to buy."
                : "Hover to pause. Preview here or open a template to buy."}
            </p>
          </Reveal>
        </div>
      </section>

      <TemplatePreviewModal
        template={selectedTemplate}
        onClose={() => setSelectedTemplate(null)}
      />
    </>
  );
}