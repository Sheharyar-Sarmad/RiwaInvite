"use client";

import { useRef, useEffect, useMemo } from "react";
import Image from "next/image";
import Link from "next/link";
import { motion, useReducedMotion, useInView } from "framer-motion";
import gsap from "gsap";
import { ArrowRight, TreePine, Droplets, Trash2, Leaf } from "lucide-react";
import { Canvas, useFrame } from "@react-three/fiber";
import * as THREE from "three";

const EASE = [0.16, 1, 0.3, 1] as const;

const STATS = [
  {
    icon: TreePine,
    title: "10,000 Trees",
    desc: "Cut down every single day just for paper invitations.",
    video: "/tree-cutting.mp4",
    tone: "dark",
  },
  {
    icon: Droplets,
    title: "Millions of Litres",
    desc: "Of water wasted during the printing and manufacturing process.",
    video: "/water-waste.mp4",
    tone: "paper",
  },
  {
    icon: Trash2,
    title: "80% in the Trash",
    desc: "Most paper invitations end up in the bin within 48 hours.",
    video: "/trash-can.mp4",
    tone: "sun",
  },
] as const;

type Tone = (typeof STATS)[number]["tone"];

/* -------------------------------------------------------------------------- */
/*  Three.js ambient embers                                                   */
/* -------------------------------------------------------------------------- */
function Embers() {
  const geo = useRef<THREE.BufferGeometry>(null);
  const group = useRef<THREE.Group>(null);
  const count = 70;

  const positions = useMemo(() => {
    const arr = new Float32Array(count * 3);
    for (let i = 0; i < arr.length; i++) arr[i] = (Math.random() - 0.5) * 15;
    return arr;
  }, []);

  useFrame((state, delta) => {
    if (group.current)
      group.current.rotation.y = state.clock.elapsedTime * 0.05;
    const attr = geo.current?.attributes.position as
      | THREE.BufferAttribute
      | undefined;
    if (!attr) return;
    const arr = attr.array as Float32Array;
    const rise = delta * 0.6;
    for (let i = 0; i < count; i++) {
      const y = i * 3 + 1;
      arr[y] += rise;
      if (arr[y] > 5) arr[y] = -5;
    }
    attr.needsUpdate = true;
  });

  return (
    <group ref={group}>
      <points>
        <bufferGeometry ref={geo}>
          <bufferAttribute attach="attributes-position" args={[positions, 3]} />
        </bufferGeometry>
        <pointsMaterial
          size={0.1}
          color="#10b981"
          transparent
          opacity={0.45}
          sizeAttenuation
          depthWrite={false}
        />
      </points>
    </group>
  );
}

function EmberField() {
  const ref = useRef<HTMLDivElement>(null);
  const inView = useInView(ref);
  return (
    <div
      ref={ref}
      aria-hidden
      className="pointer-events-none absolute inset-0 z-0 opacity-40"
    >
      <Canvas
        camera={{ position: [0, 0, 6], fov: 50 }}
        dpr={[1, 1.5]}
        gl={{ antialias: false, powerPreference: "low-power" }}
        frameloop={inView ? "always" : "never"}
      >
        <Embers />
      </Canvas>
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/*  Video that never stops looping                                            */
/* -------------------------------------------------------------------------- */
function InfiniteVideo({
  src,
  className,
}: {
  src: string;
  className?: string;
}) {
  return (
    <video
      src={src}
      muted
      loop
      autoPlay
      playsInline
      preload="auto"
      aria-hidden
      className={className}
    />
  );
}

/* -------------------------------------------------------------------------- */
/*  Glass card styling                                                        */
/* -------------------------------------------------------------------------- */
const BG: Record<Tone, string> = {
  dark: "radial-gradient(90% 70% at 100% 0%, rgba(16,185,129,0.25), transparent 60%), radial-gradient(70% 60% at 0% 100%, rgba(99,102,241,0.2), transparent 60%), linear-gradient(160deg, rgba(10,31,20,0.85) 0%, rgba(5,13,9,0.95) 100%)",
  paper:
    "radial-gradient(80% 60% at 0% 0%, rgba(255,255,255,0.9), transparent 60%), radial-gradient(70% 60% at 100% 100%, rgba(249,115,22,0.15), transparent 60%), linear-gradient(160deg, rgba(255,255,255,0.85) 0%, rgba(255,250,251,0.85) 100%)",
  sun: "radial-gradient(70% 60% at 100% 0%, rgba(255,255,255,0.4), transparent 60%), radial-gradient(60% 60% at 0% 100%, rgba(190,60,0,0.4), transparent 60%), linear-gradient(135deg, rgba(249,115,22,0.9) 0%, rgba(251,146,60,0.9) 60%, rgba(251,191,36,0.9) 100%)",
};

const SHELL: Record<Tone, string> = {
  dark: "text-slate-50 border-white/10 shadow-[0_24px_50px_-26px_rgba(10,14,31,0.9)]",
  paper:
    "text-slate-900 border-black/5 shadow-[0_18px_40px_-26px_rgba(0,0,0,0.5)]",
  sun: "text-white border-white/30 shadow-[0_24px_50px_-26px_rgba(234,88,12,0.85)]",
};

const ICON: Record<Tone, string> = {
  dark: "bg-white/10 ring-white/20 text-emerald-400",
  paper: "bg-white ring-black/5 text-emerald-600",
  sun: "bg-white/20 ring-white/30 text-white",
};

const TITLE: Record<Tone, string> = {
  dark: "text-white",
  paper: "text-gray-900",
  sun: "text-white",
};

const DESC: Record<Tone, string> = {
  dark: "text-slate-300",
  paper: "text-gray-600",
  sun: "text-white/90",
};

/* -------------------------------------------------------------------------- */
/*  Section                                                                   */
/* -------------------------------------------------------------------------- */
export function TheEnvironmentalImpact() {
  const reduce = useReducedMotion() ?? false;
  const containerRef = useRef<HTMLElement>(null);
  const treeRef = useRef<HTMLDivElement>(null);

  const isInView = useInView(containerRef, { amount: 0.1 });

  useEffect(() => {
    if (!treeRef.current || reduce || !isInView) return;
    const ctx = gsap.context(() => {
      gsap.to(treeRef.current, {
        y: -10,
        duration: 4,
        repeat: -1,
        yoyo: true,
        ease: "sine.inOut",
      });
    }, treeRef);
    return () => ctx.revert();
  }, [reduce, isInView]);

  return (
    <section
      ref={containerRef}
      aria-labelledby="env-impact-heading"
      // FIXED: Added relative z-10 so it stays below the pinned section
      className="relative z-10 flex min-h-[100svh] w-full flex-col justify-center overflow-hidden bg-[#08120a] py-24 text-white sm:py-32"
    >
      {/* Video background */}
      <div className="absolute inset-0 z-0" aria-hidden>
        <InfiniteVideo
          src="/the-environmental-impact.mp4"
          className="h-full w-full object-cover opacity-60"
        />
        <div className="absolute inset-0 bg-gradient-to-b from-[#08120a]/90 via-black/40 to-[#08120a]" />
      </div>

      {/* Glows */}
      <div className="pointer-events-none absolute inset-0 z-0" aria-hidden>
        <div className="absolute left-0 top-1/4 h-[480px] w-[480px] -translate-x-1/2 rounded-full bg-emerald-500/10 blur-[110px]" />
        <div className="absolute bottom-1/4 right-0 h-[360px] w-[360px] translate-x-1/2 rounded-full bg-teal-500/10 blur-[90px]" />
      </div>

      {!reduce && <EmberField />}

      {/* Content */}
      <div className="relative z-10 mx-auto flex w-full max-w-7xl flex-col gap-12 px-4 sm:px-6 lg:px-12">
        {/* Header */}
        <motion.div
          initial={reduce ? false : { opacity: 0, y: 24 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-60px" }}
          transition={{ duration: 0.8, ease: EASE }}
          className="mx-auto max-w-3xl text-center"
        >
          <span className="mb-5 inline-flex items-center gap-2 rounded-full border border-emerald-500/30 bg-emerald-500/10 px-4 py-1.5 text-xs font-bold uppercase tracking-widest text-emerald-400 backdrop-blur-md">
            <span className="relative flex h-2 w-2" aria-hidden>
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400/70" />
              <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-400" />
            </span>
            <Leaf className="h-4 w-4" aria-hidden /> The Environmental Impact
          </span>
          <h2
            id="env-impact-heading"
            className="font-[family-name:var(--font-display)] text-4xl font-bold leading-[1.1] tracking-tight sm:text-5xl lg:text-6xl"
          >
            {"One event shouldn't "}
            <span className="bg-gradient-to-r from-emerald-400 to-teal-300 bg-clip-text text-transparent">
              cost the earth.
            </span>
          </h2>
        </motion.div>

        {/* Bento Grid */}
        <div className="grid grid-cols-1 gap-6 md:grid-cols-3 lg:gap-8">
          {/* Tree Container */}
          <div className="relative hidden items-center justify-center md:col-span-1 md:flex">
            <div
              ref={treeRef}
              className="relative flex h-full w-full items-center justify-center"
            >
              <div
                aria-hidden
                className="absolute left-1/2 top-1/2 h-[75%] w-[75%] -translate-x-1/2 -translate-y-1/2 rounded-full bg-emerald-500/30 blur-[70px]"
              />
              <div className="relative z-10 flex h-full w-full items-center justify-center overflow-hidden rounded-[2rem] border border-emerald-400/25 bg-gradient-to-b from-emerald-400/10 via-emerald-500/5 to-transparent p-6 opacity-90 shadow-[0_0_60px_-15px_rgba(16,185,129,0.6)] ring-1 ring-inset ring-white/10 backdrop-blur-md">
                <Image
                  src="/ethos-green-tree-transparent.png"
                  alt="Illustration of a glowing digital tree"
                  width={500}
                  height={500}
                  quality={100}
                  priority
                  className="h-full max-h-[80%] w-auto max-w-full rounded-[2rem] object-contain opacity-100 drop-shadow-[0_0_30px_rgba(16,185,129,0.6)] mix-blend-screen"
                />
              </div>
            </div>
          </div>

          {/* Stat Cards */}
          <ul className="m-0 flex list-none flex-col gap-6 p-0 md:col-span-2">
            {STATS.map((stat, idx) => {
              const Icon = stat.icon;
              const tone = stat.tone;
              return (
                <motion.li
                  key={stat.title}
                  initial={reduce ? false : { opacity: 0, x: 40 }}
                  whileInView={{ opacity: 1, x: 0 }}
                  viewport={{ once: true, margin: "-60px" }}
                  transition={{ duration: 0.8, delay: idx * 0.12, ease: EASE }}
                  style={{ backgroundImage: BG[tone] }}
                  className={`group relative flex min-h-[180px] sm:min-h-[220px] items-stretch gap-4 overflow-hidden rounded-[2rem] border p-3 backdrop-blur-xl transition-transform duration-500 hover:-translate-y-1 sm:gap-6 sm:p-4 ${SHELL[tone]}`}
                >
                  <span
                    aria-hidden
                    className="pointer-events-none absolute inset-y-0 -left-1/3 w-1/3 -skew-x-12 bg-white/10 opacity-0 blur-md transition-all duration-700 group-hover:left-full group-hover:opacity-100"
                  />

                  {/* Text Section */}
                  <div className="flex flex-1 items-center gap-5 px-2 sm:px-4">
                    <div
                      className={`flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl shadow-sm ring-1 transition-transform group-hover:scale-110 sm:h-16 sm:w-16 ${ICON[tone]}`}
                    >
                      <Icon className="h-7 w-7 sm:h-8 sm:w-8" aria-hidden />
                    </div>
                    <div className="min-w-0 flex-1 py-2">
                      <h3
                        className={`font-[family-name:var(--font-display)] text-2xl font-bold leading-tight sm:text-3xl lg:text-4xl ${TITLE[tone]}`}
                      >
                        {stat.title}
                      </h3>
                      <p
                        className={`mt-2 font-[family-name:var(--font-body)] text-sm leading-relaxed sm:text-base lg:text-lg ${DESC[tone]}`}
                      >
                        {stat.desc}
                      </p>
                    </div>
                  </div>

                  {/* Video Section */}
                  <div className="relative w-32 shrink-0 self-stretch overflow-hidden rounded-[1.5rem] bg-black/20 shadow-inner ring-1 ring-white/10 sm:w-48 md:w-56 lg:w-64">
                    <InfiniteVideo
                      src={stat.video}
                      className="absolute inset-0 h-full w-full object-cover opacity-90 transition-transform duration-700 group-hover:scale-110"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/50 to-transparent opacity-60" />
                  </div>
                </motion.li>
              );
            })}
          </ul>
        </div>

        {/* CTA */}
        <motion.div
          initial={reduce ? false : { opacity: 0, y: 24 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-60px" }}
          transition={{ duration: 0.8, delay: 0.4, ease: EASE }}
          className="relative mt-8 overflow-hidden rounded-[2rem] border border-emerald-500/30 bg-emerald-500/10 px-6 py-6 backdrop-blur-2xl sm:px-10 sm:py-8"
        >
          <div
            aria-hidden
            className="absolute -right-10 -top-10 h-64 w-64 rounded-full bg-emerald-500/20 blur-3xl"
          />

          <div className="relative z-10 flex flex-col items-center gap-6 md:flex-row md:justify-between md:gap-8">
            <div className="text-center md:text-left">
              <h3 className="font-[family-name:var(--font-display)] text-2xl font-bold leading-tight text-white sm:text-3xl lg:text-4xl">
                Riwainvite leaves zero carbon footprint.
              </h3>
              <p className="mt-2 max-w-lg text-sm text-emerald-100/70 sm:text-base lg:text-lg">
                Join the movement. Create beautiful, interactive digital
                invitations that don&apos;t cost the earth.
              </p>
            </div>

            <Link
              href="/register"
              className="group inline-flex shrink-0 items-center justify-center gap-2 rounded-xl bg-emerald-500 px-8 py-4 font-[family-name:var(--font-display)] text-base font-bold text-[#08120a] shadow-[0_0_40px_-10px_rgba(16,185,129,0.8)] transition-all hover:scale-[1.02] hover:bg-emerald-400 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-300 sm:px-10 sm:py-5 sm:text-lg"
            >
              Join the movement
              <ArrowRight
                className="h-5 w-5 transition-transform group-hover:translate-x-1 sm:h-6 sm:w-6"
                aria-hidden
              />
            </Link>
          </div>
        </motion.div>
      </div>
    </section>
  );
}
