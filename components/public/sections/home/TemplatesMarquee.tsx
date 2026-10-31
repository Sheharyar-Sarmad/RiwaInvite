"use client";

import { useEffect, useRef, useState } from "react";
import Image from "next/image";
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
import { ArrowUpRight, Sparkles, Eye } from "lucide-react";
import { apiClient } from "@/lib/api/api_base";
import {
  TemplatePreviewModal,
  TemplateData,
} from "@/components/public/models/TemplatePreviewModel";

const EASE = [0.16, 1, 0.3, 1] as const;
const focusRing =
  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-400/80 focus-visible:ring-offset-2 focus-visible:ring-offset-[#0a0a0a]";

/* -------------------------------------------------------------------------- */
/*  Header pieces                                                             */
/* -------------------------------------------------------------------------- */

/** Fades and lifts its child into view once. */
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

/*
 * The heading itself is observed (it is never clipped). Observing the words
 * would fail: they start below an overflow-hidden mask, so the browser reports
 * them as never visible and the animation would never start.
 */
const wordsParent: Variants = {
  hidden: {},
  show: { transition: { staggerChildren: 0.07, delayChildren: 0.1 } },
};

const wordChild: Variants = {
  hidden: { y: "115%", rotate: 4 },
  show: { y: 0, rotate: 0, transition: { duration: 0.9, ease: EASE } },
};

/** Headline whose words rise out of a mask. */
function MaskedWords({
  words,
  reduce,
  gradientFrom,
}: {
  words: string[];
  reduce: boolean;
  /** Words from this index onward get the brand gradient. */
  gradientFrom: number;
}) {
  return (
    <motion.h2
      aria-label={words.join(" ")}
      variants={wordsParent}
      initial={reduce ? "show" : "hidden"}
      whileInView="show"
      viewport={{ once: true, margin: "-80px" }}
      className="font-[family-name:var(--font-display)] text-4xl font-bold leading-[1.1] tracking-tight text-white sm:text-5xl lg:text-6xl"
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

  return (
    <motion.div
      role="button"
      tabIndex={duplicate ? -1 : 0}
      aria-hidden={duplicate || undefined}
      aria-label={`Preview ${template.name}`}
      onClick={onOpen}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          onOpen();
        }
      }}
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
      className={`group relative mr-6 flex h-[400px] w-[280px] shrink-0 cursor-pointer flex-col overflow-hidden rounded-[2rem] border border-white/10 bg-white/5 shadow-2xl backdrop-blur-xl transition-[border-color,box-shadow,background-color] duration-500 hover:border-orange-500/50 hover:bg-white/10 hover:shadow-[0_30px_60px_-20px_rgba(249,115,22,0.45)] sm:h-[460px] sm:w-[320px] lg:h-[500px] lg:w-[360px] ${focusRing}`}
    >
      {/* Image with parallax and slow zoom on hover */}
      <div className="relative aspect-[4/5] w-full overflow-hidden">
        <motion.div
          style={reduce ? undefined : { x: imgX, y: imgY, scale: 1.06 }}
          className="absolute inset-0"
        >
          <Image
            src={template.thumbnailUrl}
            alt={template.name}
            fill
            quality={90}
            sizes="(max-width: 640px) 280px, (max-width: 1024px) 320px, 360px"
            priority={priority}
            className="object-cover transition-transform duration-[900ms] ease-out group-hover:scale-105"
          />
        </motion.div>
        <div className="absolute inset-0 bg-gradient-to-t from-[#0a0a0a] via-[#0a0a0a]/20 to-transparent opacity-90" />
        <motion.div
          aria-hidden
          style={{ background: glow }}
          className="pointer-events-none absolute inset-0 opacity-0 mix-blend-screen transition-opacity duration-300 group-hover:opacity-100"
        />

        {template.isPremium && (
          <span className="absolute left-4 top-4 flex items-center gap-1.5 overflow-hidden rounded-full bg-gradient-to-r from-orange-500 to-amber-500 px-3 py-1 text-xs font-bold text-white shadow-[0_0_15px_-3px_rgba(249,115,22,0.8)]">
            <Sparkles className="h-3 w-3" />
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

        {/* Preview pill: decorative, the whole card is the button */}
        <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
          <span className="flex translate-y-3 scale-90 items-center gap-2 rounded-full bg-white/20 px-6 py-3 font-[family-name:var(--font-body)] text-sm font-bold text-white opacity-0 shadow-xl backdrop-blur-md transition-all duration-300 ease-out group-hover:translate-y-0 group-hover:scale-100 group-hover:bg-[#f97316] group-hover:opacity-100 group-hover:shadow-[0_0_30px_-5px_rgba(249,115,22,0.9)] group-focus-visible:translate-y-0 group-focus-visible:scale-100 group-focus-visible:opacity-100">
            <Eye className="h-4 w-4" /> Preview
          </span>
        </div>
      </div>

      {/* Info */}
      <div className="absolute bottom-0 left-0 w-full p-6">
        <p className="mb-1.5 text-xs font-semibold text-orange-400 transition-transform duration-500 group-hover:-translate-y-0.5">
          {template.categoryName}
        </p>
        <h3 className="mb-3 line-clamp-1 font-[family-name:var(--font-display)] text-xl font-bold leading-tight text-white">
          {template.name}
        </h3>
        <div className="flex items-center justify-between">
          <span className="font-[family-name:var(--font-body)] text-sm font-semibold tabular-nums text-neutral-300">
            {template.price > 0 ? `Rs ${template.price.toLocaleString()}` : "Free"}
          </span>
          <span className="relative flex h-9 w-9 items-center justify-center overflow-hidden rounded-full bg-white/10 text-white transition-all duration-300 group-hover:scale-110 group-hover:bg-[#f97316]">
            <ArrowUpRight className="h-4 w-4 transition-transform duration-300 group-hover:rotate-12" />
          </span>
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
    <section className="relative w-full overflow-hidden bg-[#0a0a0a] py-24 sm:py-32" aria-busy="true">
      <div className="mx-auto mb-16 flex max-w-2xl flex-col items-center gap-4 px-4">
        <div className="h-7 w-36 animate-pulse rounded-full bg-white/5" />
        <div className="h-12 w-full animate-pulse rounded-xl bg-white/5" />
        <div className="h-4 w-2/3 animate-pulse rounded bg-white/5" />
      </div>
      <div className="flex justify-center gap-6 overflow-hidden px-6">
        {[0, 1, 2, 3].map((i) => (
          <div
            key={i}
            className="relative h-[400px] w-[280px] shrink-0 overflow-hidden rounded-[2rem] border border-white/10 bg-white/[0.03] sm:h-[460px] sm:w-[320px] lg:h-[500px] lg:w-[360px]"
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

  const track = [...templates, ...templates];
  // Pause the scroll while the modal is open so it isn't animating behind it.
  const paused = selectedTemplate !== null;

  return (
    <>
      <section
        ref={sectionRef}
        id="templates"
        className="relative w-full overflow-hidden bg-[#0a0a0a] py-24 sm:py-32"
      >
        {/* Scroll-linked ambient glows */}
        <motion.div
          aria-hidden
          style={reduce ? undefined : { y: orbY }}
          className="pointer-events-none absolute left-1/2 top-0 h-[500px] w-[800px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-orange-500/10 blur-[120px]"
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

        <div className="relative z-10 mx-auto mb-16 w-full max-w-7xl px-4 text-center sm:px-6 lg:px-12">
          <Reveal reduce={reduce}>
            <span className="relative mb-5 inline-flex items-center gap-2 overflow-hidden rounded-full border border-orange-500/30 bg-orange-500/10 px-4 py-1.5 text-sm font-semibold text-orange-400 backdrop-blur-md">
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
            <p className="mx-auto mt-5 max-w-2xl font-[family-name:var(--font-body)] text-base leading-relaxed text-neutral-400 sm:text-lg">
              Hand-crafted designs across weddings, birthdays, and corporate galas. Pick one, make it
              yours, and publish in minutes.
            </p>
          </Reveal>
        </div>

        <div className="group/marquee relative w-full">
          <div className="pointer-events-none absolute inset-y-0 left-0 z-10 w-16 bg-gradient-to-r from-[#0a0a0a] to-transparent sm:w-40" />
          <div className="pointer-events-none absolute inset-y-0 right-0 z-10 w-16 bg-gradient-to-l from-[#0a0a0a] to-transparent sm:w-40" />

          {/* Extra vertical padding so hover lift and shadows are not clipped */}
          <div className="py-6">
            <div
              className={`flex pl-6 sm:pl-12 ${
                reduce
                  ? "w-full flex-wrap justify-center gap-y-6 pr-6 sm:pr-12"
                  : `w-max animate-[marquee-x_40s_linear_infinite] group-hover/marquee:[animation-play-state:paused] ${
                      paused ? "[animation-play-state:paused]" : ""
                    }`
              }`}
            >
              {(reduce ? templates : track).map((template, idx) => (
                <TemplateCard
                  key={`${template.id}-${idx}`}
                  template={template}
                  priority={idx < 3}
                  duplicate={idx >= templates.length}
                  reduce={reduce}
                  onOpen={() => setSelectedTemplate(template)}
                />
              ))}
            </div>
          </div>

          <Reveal reduce={reduce} delay={0.2} className="mt-6 flex justify-center">
            <p className="flex items-center gap-2 rounded-full bg-white/[0.04] px-4 py-2 text-sm text-neutral-500 ring-1 ring-white/10">
              <span className="relative flex h-2 w-2">
                {!reduce && (
                  <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-orange-400 opacity-60" />
                )}
                <span className="relative inline-flex h-2 w-2 rounded-full bg-orange-500" />
              </span>
              Hover to pause, click any card to preview
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