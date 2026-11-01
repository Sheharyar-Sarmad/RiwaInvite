"use client";

import { useRef, useCallback } from "react";
import Image from "next/image";
import Link from "next/link";
import { motion, useReducedMotion } from "framer-motion";
import {
  ArrowRight,
  MessageSquareHeart,
  Users,
  Download,
  Smartphone,
  CheckCircle2,
} from "lucide-react";

const EASE = [0.16, 1, 0.3, 1] as const;

const BENTO_CARDS = [
  {
    icon: MessageSquareHeart,
    title: "Centralized Wishes",
    desc: "Read every heartfelt message from your guests in one place.",
    image: "/ethos-wishes-ui.png",
  },
  {
    icon: Download,
    title: "Export & Manage",
    desc: "Export your guest list and dietary requirements to a CSV.",
    image: "/how-step-4.png",
  },
  {
    icon: Users,
    title: "Real-Time Headcount",
    desc: "Watch RSVPs roll in live. Know exactly how many seats to prepare.",
    image: "/why-rsvp.png",
  },
];

export function TheGuestConnection() {
  const reduce = useReducedMotion() ?? false;

  // --- Interactive Background Logic ---
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

  return (
    <section
      ref={sectionRef}
      onPointerMove={onMove}
      // Grows with content on mobile; locked to one screen on lg+
      className="relative z-10 flex min-h-[100dvh] w-full flex-col justify-center overflow-hidden bg-[#fdeadb] py-10 lg:h-[100dvh] lg:min-h-[800px] lg:py-16"
    >
      {/* 1. INTERACTIVE BACKGROUND */}
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

      {/* Wider container, less side padding */}
      <div className="relative z-10 mx-auto flex w-full max-w-[1600px] flex-col px-3 sm:px-6 lg:h-full lg:px-10">
        {/* Header */}
        <motion.div
          initial={reduce ? false : { opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-100px" }}
          transition={{ duration: 0.8, ease: EASE }}
          className="mb-6 shrink-0 text-center lg:mb-10"
        >
          <span className="mb-3 inline-flex items-center gap-2 rounded-full border border-orange-300/60 bg-white/70 px-4 py-1.5 text-xs font-bold uppercase tracking-widest text-orange-700 shadow-sm backdrop-blur-md">
            <Smartphone className="h-3.5 w-3.5" /> The Data Advantage
          </span>
          <h2 className="font-[family-name:var(--font-display)] text-3xl font-bold leading-[1.1] tracking-tight text-gray-900 sm:text-4xl lg:text-5xl">
            Paper leaves you{" "}
            <span className="bg-gradient-to-r from-[#f97316] to-amber-600 bg-clip-text text-transparent">
              in the dark.
            </span>
          </h2>
        </motion.div>

        {/* Main Grid - height-locked only on lg+ */}
        <div className="mb-6 grid grid-cols-1 gap-5 md:grid-cols-12 md:gap-8 lg:mb-8 lg:min-h-0 lg:flex-1">
          {/* LEFT SIDE: Landscape Dashboard Video */}
          <motion.div
            initial={reduce ? false : { opacity: 0, x: -40 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true, margin: "-100px" }}
            transition={{ duration: 0.8, ease: EASE }}
            className="relative flex w-full min-w-0 max-w-full flex-col overflow-hidden rounded-[2rem] border border-white/60 bg-white/40 p-2 shadow-xl backdrop-blur-xl h-[clamp(240px,56vw,420px)] sm:p-4 md:col-span-7 md:h-full lg:col-span-8"
          >
            {/* Browser Window Frame */}
            <div className="relative flex h-full flex-col overflow-hidden rounded-xl border border-neutral-800 bg-[#1a1a1a] shadow-inner">
              {/* Browser Header */}
              <div className="flex h-8 shrink-0 items-center gap-2 border-b border-neutral-800 bg-[#222] px-4">
                <span className="h-2.5 w-2.5 rounded-full bg-red-500/80" />
                <span className="h-2.5 w-2.5 rounded-full bg-amber-500/80" />
                <span className="h-2.5 w-2.5 rounded-full bg-emerald-500/80" />
                <div className="mx-auto flex w-1/2 items-center justify-center rounded-md bg-neutral-800 py-0.5 text-[10px] text-neutral-400">
                  riwainvite.com/dashboard
                </div>
              </div>

              {/* Widescreen Video */}
              <div className="relative min-h-0 flex-1 bg-black">
                <video
                  src="/riwainvite-promo-02-rsvp.mp4"
                  autoPlay
                  muted
                  loop
                  playsInline
                  className="absolute inset-0 h-full w-full object-cover"
                />

                {/* Floating UI overlay */}
                <div className="absolute bottom-4 right-4 flex items-center gap-3 rounded-xl border border-white/20 bg-black/60 px-4 py-3 shadow-2xl backdrop-blur-md">
                  <div className="flex h-8 w-8 items-center justify-center rounded-full bg-emerald-500/20 text-emerald-400">
                    <CheckCircle2 className="h-5 w-5" />
                  </div>
                  <div>
                    <p className="font-[family-name:var(--font-display)] text-xs font-bold text-white">
                      Ayesha accepted
                    </p>
                    <p className="text-[10px] text-neutral-300">Just now</p>
                  </div>
                </div>
              </div>
            </div>
          </motion.div>

          {/* RIGHT SIDE: Text on Left, Image on Right */}
          <div className="flex min-w-0 flex-col gap-4 md:col-span-5 md:h-full md:gap-5 lg:col-span-4">
            {BENTO_CARDS.map((card, idx) => {
              const Icon = card.icon;
              return (
                <motion.div
                  key={card.title}
                  initial={reduce ? false : { opacity: 0, x: 40 }}
                  whileInView={{ opacity: 1, x: 0 }}
                  viewport={{ once: true, margin: "-100px" }}
                  transition={{ duration: 0.8, delay: idx * 0.1, ease: EASE }}
                  className="group flex min-h-[120px] flex-1 items-stretch overflow-hidden rounded-[1.5rem] border border-white/60 bg-white/70 shadow-xl backdrop-blur-xl transition-all duration-300 hover:-translate-y-1 hover:border-orange-300 hover:bg-white hover:shadow-[0_20px_50px_-15px_rgba(249,115,22,0.2)]"
                >
                  {/* Left: Text Content */}
                  <div className="flex flex-1 flex-col justify-center p-4 sm:p-5">
                    <div className="mb-1.5 flex items-center gap-3">
                      <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-orange-100 text-[#f97316] shadow-sm ring-1 ring-orange-200/50">
                        <Icon className="h-4 w-4 sm:h-5 sm:w-5" />
                      </div>
                      <h3 className="font-[family-name:var(--font-display)] text-base font-bold text-gray-900 sm:text-lg">
                        {card.title}
                      </h3>
                    </div>
                    <p className="line-clamp-2 font-[family-name:var(--font-body)] text-xs leading-relaxed text-gray-600 sm:text-sm">
                      {card.desc}
                    </p>
                  </div>

                  {/* Right: Image */}
                  <div className="relative w-28 shrink-0 p-2 sm:w-36">
                    <div className="relative h-full w-full overflow-hidden rounded-xl bg-neutral-100 shadow-sm ring-1 ring-black/5">
                      <Image
                        src={card.image}
                        alt={card.title}
                        fill
                        className="object-cover transition-transform duration-700 group-hover:scale-110"
                      />
                    </div>
                  </div>
                </motion.div>
              );
            })}
          </div>
        </div>

        {/* Bottom CTA */}
        <motion.div
          initial={reduce ? false : { opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-100px" }}
          transition={{ duration: 0.8, delay: 0.3, ease: EASE }}
          className="flex shrink-0 justify-center"
        >
          <Link
            href="/register"
            className="group inline-flex items-center justify-center gap-2 rounded-xl bg-[#2a2a2a] px-6 py-3.5 font-[family-name:var(--font-display)] text-sm font-bold text-white shadow-xl transition-all hover:scale-[1.02] hover:bg-[#3a3a3a] sm:px-8 sm:py-4 sm:text-base"
          >
            Start tracking your guests
            <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1 sm:h-5 sm:w-5" />
          </Link>
        </motion.div>
      </div>
    </section>
  );
}