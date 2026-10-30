"use client";

import { useRef, useCallback } from "react";
import Image from "next/image";
import {
  motion,
  useMotionValue,
  useSpring,
  useTransform,
  useReducedMotion,
} from "framer-motion";
import {
  Users,
  Link as LinkIcon,
  LayoutTemplate,
  CreditCard,
  Zap,
  MessageCircle,
  CheckCheck,
  ArrowRight,
} from "lucide-react";

const EASE = [0.16, 1, 0.3, 1] as const;

/* ------------------------------------------------------------------ */
/* 3D Tilt Card                                                        */
/* ------------------------------------------------------------------ */
function TiltCard({
  children,
  className,
  featured = false,
}: {
  children: React.ReactNode;
  className?: string;
  featured?: boolean;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const prefersReducedMotion = useReducedMotion() ?? false;

  const x = useMotionValue(0);
  const y = useMotionValue(0);
  const xSpring = useSpring(x, { stiffness: 220, damping: 26, mass: 0.6 });
  const ySpring = useSpring(y, { stiffness: 220, damping: 26, mass: 0.6 });
  const rotateX = useTransform(ySpring, [-0.5, 0.5], ["6deg", "-6deg"]);
  const rotateY = useTransform(xSpring, [-0.5, 0.5], ["-6deg", "6deg"]);

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!ref.current || prefersReducedMotion) return;
    const rect = ref.current.getBoundingClientRect();
    x.set((e.clientX - rect.left) / rect.width - 0.5);
    y.set((e.clientY - rect.top) / rect.height - 0.5);
  };

  return (
    <motion.div
      ref={ref}
      onMouseMove={handleMouseMove}
      onMouseLeave={() => {
        x.set(0);
        y.set(0);
      }}
      style={
        prefersReducedMotion
          ? undefined
          : { rotateX, rotateY, transformStyle: "preserve-3d" }
      }
      className={[
        "group relative h-full overflow-hidden rounded-[1.75rem] border p-6 md:p-7",
        "transition-[background-color,box-shadow,border-color] duration-300",
        featured
          ? "bg-gradient-to-br from-white/90 via-white/75 to-orange-50/70 border-orange-200/70 shadow-[0_20px_60px_-20px_rgba(249,115,22,0.28)] hover:shadow-[0_30px_80px_-25px_rgba(249,115,22,0.42)]"
          : "bg-white/55 border-white/70 shadow-[0_8px_30px_-12px_rgba(15,23,42,0.08)] hover:border-orange-200/60 hover:bg-white/80 hover:shadow-[0_20px_50px_-15px_rgba(249,115,22,0.15)]",
        "backdrop-blur-md",
        className ?? "",
      ].join(" ")}
    >
      {!prefersReducedMotion && (
        <span
          aria-hidden
          className="pointer-events-none absolute inset-0 -translate-x-full bg-gradient-to-r from-transparent via-white/25 to-transparent transition-transform duration-700 ease-out group-hover:translate-x-full"
        />
      )}
      <div
        style={{ transform: "translateZ(40px)" }}
        className="relative flex h-full w-full flex-col"
      >
        {children}
      </div>
    </motion.div>
  );
}

/* ------------------------------------------------------------------ */
/* WhatsApp Chat Preview                                               */
/* ------------------------------------------------------------------ */
function WhatsAppPreview() {
  return (
    <div className="relative w-full max-w-[300px] overflow-hidden rounded-2xl border border-emerald-100/80 bg-white shadow-[0_10px_30px_-10px_rgba(16,185,129,0.3)]">
      {/* Header */}
      <div className="flex items-center gap-2.5 border-b border-emerald-100/70 bg-emerald-50/70 px-3.5 py-2.5">
        <div className="relative">
          <div className="flex h-8 w-8 items-center justify-center rounded-full bg-gradient-to-br from-orange-400 to-orange-600 text-[10px] font-bold text-white shadow-inner">
            R
          </div>
          <span className="absolute -bottom-0.5 -right-0.5 h-2.5 w-2.5 rounded-full bg-emerald-500 ring-2 ring-white" />
        </div>
        <div className="min-w-0 flex-1">
          <p className="truncate text-[11px] font-bold text-gray-900">
            Riwainvite Team
          </p>
          <p className="text-[9px] font-medium text-emerald-600">● Online</p>
        </div>
        <MessageCircle className="h-3.5 w-3.5 text-emerald-600" />
      </div>

      {/* Messages */}
      <div className="space-y-1.5 bg-[#eef4ef] p-3">
        <div className="flex justify-start">
          <div className="max-w-[85%] rounded-2xl rounded-tl-sm bg-white px-3 py-1.5 text-[10.5px] leading-snug text-gray-700 shadow-sm">
            Welcome! 👋 Need help picking a template?
          </div>
        </div>
        <div className="flex justify-end">
          <div className="flex max-w-[85%] items-center gap-1 rounded-2xl rounded-tr-sm bg-emerald-500 px-3 py-1.5 text-[10.5px] leading-snug text-white shadow-sm">
            <span>Yes please, a wedding one!</span>
            <CheckCheck className="h-2.5 w-2.5 shrink-0" />
          </div>
        </div>
        <div className="flex justify-start">
          <div className="rounded-2xl rounded-tl-sm bg-white px-3 py-2 shadow-sm">
            <span className="flex items-center gap-1">
              <span className="h-1 w-1 animate-bounce rounded-full bg-gray-400 [animation-delay:-0.3s]" />
              <span className="h-1 w-1 animate-bounce rounded-full bg-gray-400 [animation-delay:-0.15s]" />
              <span className="h-1 w-1 animate-bounce rounded-full bg-gray-400" />
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Motion variants                                                     */
/* ------------------------------------------------------------------ */
const containerVariants = {
  hidden: { opacity: 0 },
  visible: { opacity: 1, transition: { staggerChildren: 0.12 } },
};

const itemVariants = {
  hidden: { opacity: 0, y: 30 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.8, ease: EASE } },
};

/* ------------------------------------------------------------------ */
/* Section                                                             */
/* ------------------------------------------------------------------ */
export function WhyRiwainvite() {
  const sectionRef = useRef<HTMLElement>(null);
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

  const mask =
    "radial-gradient(230px circle at var(--mx,-999px) var(--my,-999px), #000 0%, transparent 100%)";

  const imageMaskStyle = {
    maskImage: "radial-gradient(ellipse at center, black 55%, transparent 85%)",
    WebkitMaskImage:
      "radial-gradient(ellipse at center, black 55%, transparent 85%)",
  };

  return (
    <section
      ref={sectionRef}
      onPointerMove={onMove}
      className="relative isolate flex min-h-[100dvh] w-full flex-col justify-center overflow-hidden bg-[#fffafb] py-20 font-[family-name:var(--font-body)] md:py-24"
    >
      {/* ---------------- Background ---------------- */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 -z-10 overflow-hidden"
      >
        <div className="absolute inset-0 bg-gradient-to-br from-orange-50/60 via-white to-orange-50/40" />
        <div
          className="absolute inset-0"
          style={{
            backgroundImage:
              "radial-gradient(circle, rgba(249,115,22,0.2) 1.5px, transparent 1.5px)",
            backgroundSize: "24px 24px",
          }}
        />
        <div
          className="absolute inset-0"
          style={{
            backgroundImage:
              "radial-gradient(circle, rgba(234,88,12,0.9) 2px, transparent 2px)",
            backgroundSize: "24px 24px",
            maskImage: mask,
            WebkitMaskImage: mask,
          }}
        />
        {/* Soft grain */}
        <div
          className="absolute inset-0 opacity-[0.08] mix-blend-overlay"
          style={{
            backgroundImage:
              "url(\"data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='3' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E\")",
          }}
        />
      </div>

      <div className="relative z-10 mx-auto w-full max-w-7xl px-4 sm:px-6 lg:px-8">
        {/* ---------------- Header ---------------- */}
        <motion.div
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: "-100px" }}
          variants={containerVariants}
          className="mx-auto mb-12 max-w-3xl text-center md:mb-16"
        >
          <motion.div
            variants={itemVariants}
            className="mb-6 inline-flex items-center gap-2 rounded-full border border-orange-200/60 bg-white/80 px-4 py-2 text-xs font-bold uppercase tracking-wider text-orange-600 shadow-sm backdrop-blur-md"
          >
            <Zap className="h-4 w-4 fill-orange-500" />
            Why Choose Us
          </motion.div>

          <motion.h2
            variants={itemVariants}
            className="mb-6 font-[family-name:var(--font-display)] text-4xl font-bold tracking-tight text-gray-900 md:text-5xl lg:text-6xl"
          >
            Everything you need to{" "}
            <br className="hidden md:block" />
            <span className="bg-gradient-to-r from-orange-500 to-amber-500 bg-clip-text text-transparent">
              create magic.
            </span>
          </motion.h2>

          <motion.p
            variants={itemVariants}
            className="font-[family-name:var(--font-body)] text-lg font-medium text-gray-600"
          >
            From stunning templates to real-time RSVPs — with a team that has
            your back at every step.
          </motion.p>
        </motion.div>

        {/* ---------------- Bento Grid ---------------- */}
        <motion.div
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: "-50px" }}
          variants={containerVariants}
          className="grid grid-cols-1 gap-5 md:grid-cols-3 md:auto-rows-[320px] md:gap-6"
          style={{ perspective: 1200 }}
        >
          {/* 1. WhatsApp Concierge — FEATURED */}
          <motion.div
            variants={itemVariants}
            className="h-full md:col-span-2"
          >
            <TiltCard featured className="h-full">
              <div className="flex flex-col gap-5 md:flex-row md:items-center md:gap-8">
                {/* Copy */}
                <div className="flex-1">
                  <div className="mb-4 flex h-11 w-11 items-center justify-center rounded-xl bg-emerald-100 text-emerald-600 shadow-inner ring-1 ring-emerald-200/60">
                    <MessageCircle className="h-5 w-5" />
                  </div>
                  <h3 className="mb-2 font-[family-name:var(--font-display)] text-2xl font-bold text-gray-900">
                    WhatsApp Concierge
                  </h3>
                  <p className="mb-5 max-w-sm font-[family-name:var(--font-body)] text-sm font-medium leading-relaxed text-gray-600">
                    Questions? Ideas? Just message our team on WhatsApp — real
                    humans, ready to guide you through every step.
                  </p>
                  <a
                    href="https://wa.me/"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="group/cta inline-flex items-center gap-2 rounded-xl bg-emerald-500 px-4 py-2.5 text-sm font-bold text-white shadow-[0_8px_20px_-8px_rgba(16,185,129,0.7)] transition-all duration-300 hover:-translate-y-0.5 hover:bg-emerald-600 hover:shadow-[0_12px_28px_-8px_rgba(16,185,129,0.85)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-400 focus-visible:ring-offset-2"
                  >
                    Chat with our team
                    <ArrowRight className="h-4 w-4 transition-transform group-hover/cta:translate-x-0.5" />
                  </a>
                </div>

                {/* Preview */}
                <div className="flex flex-1 items-center justify-center md:justify-end">
                  <WhatsAppPreview />
                </div>
              </div>
            </TiltCard>
          </motion.div>

          {/* 2. Real-Time RSVPs */}
          <motion.div variants={itemVariants} className="h-full">
            <TiltCard className="h-full">
              <div>
                <div className="mb-4 flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-50 text-emerald-500 shadow-inner ring-1 ring-emerald-100/70">
                  <Users className="h-5 w-5" />
                </div>
                <h3 className="mb-2 font-[family-name:var(--font-display)] text-xl font-bold text-gray-900">
                  Real-Time RSVPs
                </h3>
                <p className="font-[family-name:var(--font-body)] text-sm font-medium text-gray-600">
                  Track attendance the moment guests respond.
                </p>
              </div>
              <div className="relative mt-4 flex flex-1 items-end justify-center">
                <Image
                  src="/why-rsvp.png"
                  alt=""
                  aria-hidden
                  width={300}
                  height={300}
                  style={imageMaskStyle}
                  className="origin-bottom object-contain transition-transform duration-700 ease-out group-hover:scale-110"
                />
              </div>
            </TiltCard>
          </motion.div>

          {/* 3. Custom Slugs */}
          <motion.div variants={itemVariants} className="h-full">
            <TiltCard className="h-full">
              <div>
                <div className="mb-4 flex h-10 w-10 items-center justify-center rounded-xl bg-blue-50 text-blue-500 shadow-inner ring-1 ring-blue-100/70">
                  <LinkIcon className="h-5 w-5" />
                </div>
                <h3 className="mb-2 font-[family-name:var(--font-display)] text-xl font-bold text-gray-900">
                  Custom Slugs
                </h3>
                <p className="font-[family-name:var(--font-body)] text-sm font-medium text-gray-600">
                  Branded URLs your guests will remember.
                </p>
              </div>
              <div className="mt-auto mb-1 w-full space-y-1.5">
                <div className="flex items-center gap-1.5 rounded-xl border border-orange-100 bg-white/80 px-3 py-2 text-[11px] shadow-sm backdrop-blur-md">
                  <span className="font-mono text-gray-400">riwainvite.com/</span>
                  <span className="truncate font-mono font-bold text-gray-900">
                    sara-and-ahmed
                  </span>
                </div>
                <div className="flex items-center gap-1.5 rounded-xl border border-gray-100 bg-white/60 px-3 py-2 text-[11px] opacity-70 shadow-sm backdrop-blur-md">
                  <span className="font-mono text-gray-400">riwainvite.com/</span>
                  <span className="truncate font-mono font-bold text-gray-700">
                    tech-summit-26
                  </span>
                </div>
              </div>
            </TiltCard>
          </motion.div>

          {/* 4. Flexible Plans */}
          <motion.div variants={itemVariants} className="h-full">
            <TiltCard className="h-full">
              <div>
                <div className="mb-4 flex h-10 w-10 items-center justify-center rounded-xl bg-indigo-50 text-indigo-500 shadow-inner ring-1 ring-indigo-100/70">
                  <CreditCard className="h-5 w-5" />
                </div>
                <h3 className="mb-2 font-[family-name:var(--font-display)] text-xl font-bold text-gray-900">
                  Flexible Plans
                </h3>
                <p className="font-[family-name:var(--font-body)] text-sm font-medium text-gray-600">
                  Pay for the size of your event, not extras.
                </p>
              </div>
              <div className="mt-auto mb-1 space-y-1.5">
                <div className="flex w-full items-center justify-between rounded-lg border border-gray-100 bg-white/80 p-2.5 shadow-sm">
                  <span className="text-[11px] font-bold text-gray-600">Basic</span>
                  <span className="text-[11px] font-bold text-gray-400">Rs 1,500</span>
                </div>
                <div className="relative flex w-full items-center justify-between overflow-hidden rounded-lg border border-orange-200 bg-orange-50 p-2.5 shadow-sm">
                  <div className="absolute inset-0 bg-gradient-to-r from-orange-400/10 to-transparent" />
                  <span className="relative z-10 text-[11px] font-bold text-orange-600">
                    Pro
                  </span>
                  <span className="relative z-10 text-[11px] font-bold text-orange-600">
                    Rs 3,000
                  </span>
                </div>
              </div>
            </TiltCard>
          </motion.div>

          {/* 5. No-Code Builder */}
          <motion.div variants={itemVariants} className="h-full">
            <TiltCard className="h-full">
              <div>
                <div className="mb-4 flex h-10 w-10 items-center justify-center rounded-xl bg-purple-50 text-purple-500 shadow-inner ring-1 ring-purple-100/70">
                  <LayoutTemplate className="h-5 w-5" />
                </div>
                <h3 className="mb-2 font-[family-name:var(--font-display)] text-xl font-bold text-gray-900">
                  No-Code Builder
                </h3>
                <p className="font-[family-name:var(--font-body)] text-sm font-medium text-gray-600">
                  Drag, drop, done — every pixel yours.
                </p>
              </div>
              <div className="relative mt-4 flex flex-1 items-end justify-center">
                <Image
                  src="/why-builder.png"
                  alt=""
                  aria-hidden
                  width={260}
                  height={260}
                  style={imageMaskStyle}
                  className="origin-bottom object-contain transition-transform duration-700 ease-out group-hover:scale-110"
                />
              </div>
            </TiltCard>
          </motion.div>
        </motion.div>
      </div>
    </section>
  );
}