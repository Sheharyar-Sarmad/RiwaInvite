"use client";

import { useState, useRef, useEffect, useMemo, useCallback } from "react";
import Image from "next/image";
import { motion, AnimatePresence, useReducedMotion } from "framer-motion";
import {
  Play,
  X,
  Pause,
  Volume2,
  VolumeX,
  RotateCcw,
  SkipForward,
  SkipBack,
  Sparkles,
  Maximize2,
  Minimize2,
  Expand,
} from "lucide-react";
import { Canvas, useFrame } from "@react-three/fiber";
import * as THREE from "three";

/* -------------------------------------------------------------------------- */
/*  Data                                                                      */
/* -------------------------------------------------------------------------- */
const VIDEOS = [
  {
    src: "/riwainvite-promo-01-builder.mp4",
    label: "The Builder",
    caption: "Design your invite in minutes",
  },
  {
    src: "/riwainvite-promo-02-rsvp.mp4",
    label: "Live RSVPs",
    caption: "Watch guest replies roll in",
  },
  {
    src: "/riwainvite-promo-03-finale.mp4",
    label: "Share & Publish",
    caption: "One link, every guest",
  },
];
const POSTER = "/video-poster.png";

/* -------------------------------------------------------------------------- */
/*  Responsive hooks                                                          */
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

/** Viewport tiers used for JS-driven decisions (CSS handles the rest). */
function useViewport() {
  const isPhone = useMediaQuery("(max-width: 639px)");
  const isShort = useMediaQuery("(max-height: 520px)"); // landscape phones
  const isCoarse = useMediaQuery("(hover: none), (pointer: coarse)");
  const isNarrow = useMediaQuery("(max-width: 479px)");
  const isMid = useMediaQuery("(max-width: 1279px)");
  return {
    isPhone,
    isShort,
    isCoarse,
    isNarrow,
    isMid,
    fullBleed: isPhone || isShort,
  };
}

function useInView<T extends Element>(rootMargin = "100px") {
  const ref = useRef<T>(null);
  const [inView, setInView] = useState(false);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const io = new IntersectionObserver(([e]) => setInView(e.isIntersecting), {
      rootMargin,
    });
    io.observe(el);
    return () => io.disconnect();
  }, [rootMargin]);
  return [ref, inView] as const;
}

/* -------------------------------------------------------------------------- */
/*  Three.js — instanced petals                                               */
/* -------------------------------------------------------------------------- */
const PETAL_COLORS = ["#ffffff", "#fbcfe8", "#fef08a", "#fed7aa", "#fecdd3"];

function Petals({ count }: { count: number }) {
  const mesh = useRef<THREE.InstancedMesh>(null);
  const dummy = useMemo(() => new THREE.Object3D(), []);

  const data = useMemo(
    () =>
      Array.from({ length: count }).map(() => ({
        x: (Math.random() - 0.5) * 10,
        y: Math.random() * 11 - 5,
        z: (Math.random() - 0.5) * 4,
        rx: Math.random() * Math.PI,
        ry: Math.random() * Math.PI,
        rz: Math.random() * Math.PI,
        speed: Math.random() * 0.01 + 0.005,
        phase: Math.random() * 10,
        scale: Math.random() * 1.2 + 0.4,
        color: new THREE.Color(
          PETAL_COLORS[Math.floor(Math.random() * PETAL_COLORS.length)],
        ),
      })),
    [count],
  );

  useEffect(() => {
    const m = mesh.current;
    if (!m) return;
    data.forEach((p, i) => m.setColorAt(i, p.color));
    if (m.instanceColor) m.instanceColor.needsUpdate = true;
  }, [data]);

  useFrame((state) => {
    const m = mesh.current;
    if (!m) return;
    const t = state.clock.elapsedTime;
    data.forEach((p, i) => {
      p.y -= p.speed;
      p.x += Math.sin(t * 1.5 + p.phase) * 0.003;
      p.rx += p.speed * 0.4;
      p.ry += p.speed * 0.2;
      p.rz += p.speed * 0.3;
      if (p.y < -5) {
        p.y = 6;
        p.x = (Math.random() - 0.5) * 14;
      }
      dummy.position.set(p.x, p.y, p.z);
      dummy.rotation.set(p.rx, p.ry, p.rz);
      dummy.scale.setScalar(p.scale);
      dummy.updateMatrix();
      m.setMatrixAt(i, dummy.matrix);
    });
    m.instanceMatrix.needsUpdate = true;
  });

  return (
    <instancedMesh ref={mesh} args={[undefined, undefined, count]}>
      <planeGeometry args={[0.15, 0.25]} />
      <meshStandardMaterial
        side={THREE.DoubleSide}
        transparent
        opacity={0.9}
        roughness={0.2}
        metalness={0.1}
      />
    </instancedMesh>
  );
}

function PetalSystem({
  active,
  count,
  coarse,
}: {
  active: boolean;
  count: number;
  coarse: boolean;
}) {
  return (
    <div className="pointer-events-none absolute inset-0 z-10">
      <Canvas
        dpr={coarse ? [1, 1.25] : [1, 1.5]}
        frameloop={active ? "always" : "never"}
        camera={{ position: [0, 0, 8], fov: 45 }}
        gl={{ antialias: false, powerPreference: "low-power", alpha: true }}
      >
        <ambientLight intensity={1.5} />
        <directionalLight
          position={[10, 10, 10]}
          intensity={2}
          color="#ffffff"
        />
        <directionalLight
          position={[-10, -10, -10]}
          intensity={1}
          color="#f97316"
        />
        <Petals count={count} />
      </Canvas>
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/*  Preview video — plays only while on screen                                */
/* -------------------------------------------------------------------------- */
function PreviewVideo({ src }: { src: string }) {
  const [wrap, inView] = useInView<HTMLDivElement>("150px");
  const vid = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    const v = vid.current;
    if (!v) return;
    if (inView) v.play().catch(() => {});
    else v.pause();
  }, [inView]);

  return (
    <div ref={wrap} className="absolute inset-0">
      <video
        ref={vid}
        src={src}
        muted
        loop
        playsInline
        preload="metadata"
        className="h-full w-full object-cover transition-transform duration-700 group-hover/card:scale-105"
      />
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/*  Main Component                                                            */
/* -------------------------------------------------------------------------- */
export function CinematicShowcase() {
  const [isOpen, setIsOpen] = useState(false);
  const [currentVideo, setCurrentVideo] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [progress, setProgress] = useState(0);
  const [ended, setEnded] = useState(false);
  const [showControls, setShowControls] = useState(true);
  const [autoFit, setAutoFit] = useState<"contain" | "cover">("contain");
  const [fitOverride, setFitOverride] = useState<"contain" | "cover" | null>(
    null,
  );
  const [isFullscreen, setIsFullscreen] = useState(false);

  const videoRef = useRef<HTMLVideoElement>(null);
  const playerRef = useRef<HTMLDivElement>(null);
  const hideTimer = useRef<ReturnType<typeof setTimeout> | undefined>(
    undefined,
  );
  const touchStart = useRef<{ x: number; y: number } | null>(null);

  const reduced = useReducedMotion();
  const { isShort, isCoarse, isNarrow, isMid, fullBleed } = useViewport();
  const [heroRef, heroInView] = useInView<HTMLDivElement>("0px");
  const fit = fitOverride ?? autoFit;

  /* ---------- Cursor-reactive dot grid (pointer devices only) --------------- */
  const sectionRef = useRef<HTMLElement>(null);
  const raf = useRef(0);

  const onMove = useCallback((e: React.PointerEvent) => {
    if (e.pointerType === "touch") return;
    const { clientX, clientY } = e;
    cancelAnimationFrame(raf.current);
    raf.current = requestAnimationFrame(() => {
      const el = sectionRef.current;
      if (!el) return;
      const r = el.getBoundingClientRect();
      el.style.setProperty("--mx", `${clientX - r.left}px`);
      el.style.setProperty("--my", `${clientY - r.top}px`);
    });
  }, []);

  const mask =
    "radial-gradient(230px circle at var(--mx,-999px) var(--my,-999px), #000 0%, transparent 100%)";

  /* ---------- Controls auto-hide -------------------------------------------- */
  const pingControls = useCallback(() => {
    setShowControls(true);
    clearTimeout(hideTimer.current);
    hideTimer.current = setTimeout(() => setShowControls(false), 3200);
  }, []);

  /* ---------- Open / close --------------------------------------------------- */
  const handleOpen = (index: number) => {
    setCurrentVideo(index);
    setProgress(0);
    setEnded(false);
    setFitOverride(null);
    setIsOpen(true);
    pingControls();
  };

  const handleClose = useCallback(() => {
    if (document.fullscreenElement) document.exitFullscreen?.().catch(() => {});
    setIsOpen(false);
    setIsPlaying(false);
    clearTimeout(hideTimer.current);
  }, []);

  /* ---------- Playback -------------------------------------------------------- */
  const togglePlay = useCallback(() => {
    const v = videoRef.current;
    if (!v) return;
    if (ended) {
      setEnded(false);
      setCurrentVideo(0);
      v.currentTime = 0;
    }
    if (v.paused) v.play().catch(() => {});
    else v.pause();
    pingControls();
  }, [ended, pingControls]);

  const goTo = useCallback(
    (i: number) => {
      setEnded(false);
      setProgress(0);
      setCurrentVideo(Math.max(0, Math.min(i, VIDEOS.length - 1)));
      pingControls();
    },
    [pingControls],
  );

  const restart = useCallback(() => {
    setEnded(false);
    setProgress(0);
    if (currentVideo === 0 && videoRef.current) {
      videoRef.current.currentTime = 0;
      videoRef.current.play().catch(() => {});
    } else {
      setCurrentVideo(0);
    }
    pingControls();
  }, [currentVideo, pingControls]);

  const handleVideoEnd = () => {
    if (currentVideo < VIDEOS.length - 1) {
      setCurrentVideo((p) => p + 1);
      setProgress(0);
    } else {
      setEnded(true);
      setShowControls(true);
    }
  };

  const handleTimeUpdate = () => {
    const v = videoRef.current;
    if (!v || !v.duration) return;
    setProgress((v.currentTime / v.duration) * 100);
  };

  /** Pick cover vs contain from the real video / screen aspect ratios. */
  const pickFit = useCallback(() => {
    const v = videoRef.current;
    if (!v || !v.videoWidth) return;
    const vr = v.videoWidth / v.videoHeight;
    const sr = window.innerWidth / window.innerHeight;
    setAutoFit(Math.abs(Math.log(vr / sr)) < 0.3 ? "cover" : "contain");
  }, []);

  useEffect(() => {
    if (!isOpen) return;
    window.addEventListener("resize", pickFit);
    window.addEventListener("orientationchange", pickFit);
    return () => {
      window.removeEventListener("resize", pickFit);
      window.removeEventListener("orientationchange", pickFit);
    };
  }, [isOpen, pickFit]);

  const seek = (e: React.MouseEvent<HTMLDivElement>) => {
    e.stopPropagation();
    const v = videoRef.current;
    if (!v || !v.duration) return;
    const r = e.currentTarget.getBoundingClientRect();
    v.currentTime = ((e.clientX - r.left) / r.width) * v.duration;
    pingControls();
  };

  const toggleFullscreen = useCallback(async () => {
    const el = playerRef.current;
    const v = videoRef.current as any;
    try {
      if (document.fullscreenElement) await document.exitFullscreen();
      else if (el?.requestFullscreen) await el.requestFullscreen();
      else if (v?.webkitEnterFullscreen) v.webkitEnterFullscreen(); // iOS Safari
    } catch {}
  }, []);

  useEffect(() => {
    if (videoRef.current) videoRef.current.muted = isMuted;
  }, [isMuted, currentVideo, isOpen]);

  useEffect(() => {
    const onFs = () => setIsFullscreen(!!document.fullscreenElement);
    document.addEventListener("fullscreenchange", onFs);
    return () => document.removeEventListener("fullscreenchange", onFs);
  }, []);

  useEffect(() => {
    if (!isOpen) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") handleClose();
      else if (e.key === " " || e.key === "k") {
        e.preventDefault();
        togglePlay();
      } else if (e.key === "ArrowRight") goTo(currentVideo + 1);
      else if (e.key === "ArrowLeft") goTo(currentVideo - 1);
      else if (e.key === "m") setIsMuted((m) => !m);
      else if (e.key === "f") toggleFullscreen();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [isOpen, currentVideo, handleClose, togglePlay, goTo, toggleFullscreen]);

  const onTouchStart = (e: React.TouchEvent) => {
    touchStart.current = { x: e.touches[0].clientX, y: e.touches[0].clientY };
  };
  const onTouchEnd = (e: React.TouchEvent) => {
    const s = touchStart.current;
    if (!s) return;
    const dx = e.changedTouches[0].clientX - s.x;
    const dy = e.changedTouches[0].clientY - s.y;
    touchStart.current = null;
    if (Math.abs(dx) > 60 && Math.abs(dx) > Math.abs(dy))
      goTo(currentVideo + (dx < 0 ? 1 : -1));
    else if (dy > 110 && Math.abs(dy) > Math.abs(dx)) handleClose();
  };

  /* Petal density scales with screen size */
  const petalCount = isNarrow ? 24 : isMid ? 48 : 90;
  const petalsActive = heroInView && !isOpen && !reduced;

  /* Safe-area aware horizontal padding for every overlay row */
  const sidePad = {
    paddingLeft: "max(1rem, env(safe-area-inset-left, 0px))",
    paddingRight: "max(1rem, env(safe-area-inset-right, 0px))",
  } as const;
  const topOffset = `calc(env(safe-area-inset-top, 0px) + ${isShort ? "1.75rem" : "2.75rem"})`;
  const controlsVisible = showControls || !isPlaying;

  return (
    <>
      {/* ============================ SECTION ============================ */}
      <section
        ref={sectionRef}
        onPointerMove={onMove}
        className="relative isolate w-full overflow-hidden bg-[#fdeadb] pt-24 pb-12 sm:pt-32 sm:pb-16"
      >
        {/* Background */}
        <div aria-hidden className="pointer-events-none absolute inset-0 -z-10">
          <div className="absolute inset-0 bg-gradient-to-b from-[#fff4ea] via-[#fbdcc0] to-[#fff4ea]" />
          <div
            className="absolute inset-0"
            style={{
              backgroundImage:
                "radial-gradient(circle, rgba(194,65,12,0.2) 1.5px, transparent 1.5px)",
              backgroundSize: "24px 24px",
            }}
          />
          {!isCoarse && (
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
          )}
        </div>

        <div className="relative z-10 mx-auto w-full max-w-7xl px-4 min-[480px]:px-5 sm:px-8 lg:px-12 2xl:max-w-[1600px] 2xl:px-16">
          {/* Header */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
            className="mx-auto mb-[clamp(1.5rem,4vw,3.5rem)] max-w-3xl text-center"
          >
            <span className="mb-4 inline-flex items-center gap-2 rounded-full border border-orange-200/60 bg-white/70 px-3.5 py-1.5 text-[11px] font-bold uppercase tracking-widest text-orange-600 shadow-sm backdrop-blur-md sm:text-xs">
              <Sparkles className="h-3.5 w-3.5" /> See it in action
            </span>
            <h2 className="text-balance font-[family-name:var(--font-display)] text-[clamp(2rem,1.1rem+4.2vw,4.5rem)] font-bold leading-[1.08] tracking-tight text-gray-900">
              Watch the{" "}
              <span className="bg-gradient-to-r from-[#f97316] to-amber-500 bg-clip-text text-transparent">
                magic happen.
              </span>
            </h2>
          </motion.div>

          {/* Bento: stacked < lg, side-by-side ≥ lg */}
          <motion.div
            initial={{ opacity: 0, y: 40 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
            className="grid grid-cols-1 gap-[clamp(0.75rem,2vw,2rem)] lg:grid-cols-12"
          >
            {/* HERO POSTER — fluid height, landscape-phone safe */}
            <div
              ref={heroRef}
              role="button"
              tabIndex={0}
              aria-label="Play the full experience"
              onClick={() => handleOpen(0)}
              onKeyDown={(e) =>
                (e.key === "Enter" || e.key === " ") && handleOpen(0)
              }
              className="group relative col-span-1 flex h-[clamp(26rem,72svh,46rem)] cursor-pointer flex-col items-center justify-center overflow-hidden rounded-[clamp(1.5rem,3vw,2.5rem)] border border-orange-900/10 shadow-2xl outline-none focus-visible:ring-4 focus-visible:ring-orange-500/60 [@media(max-height:520px)]:h-[max(18rem,calc(100svh-2rem))] sm:h-[clamp(24rem,52vw,34rem)] lg:col-span-8 lg:h-[clamp(32rem,42vw,42rem)]"
            >
              <Image
                src={POSTER}
                alt="Riwainvite cinematic preview"
                fill
                priority
                sizes="(min-width:1024px) 66vw, 100vw"
                className="object-cover transition-transform duration-1000 group-hover:scale-105"
              />
              <div className="pointer-events-none absolute inset-x-0 bottom-0 z-[5] h-1/2 bg-gradient-to-t from-orange-950/35 to-transparent" />

              <PetalSystem
                active={petalsActive}
                count={petalCount}
                coarse={isCoarse}
              />

              <div className="relative z-20 flex w-full max-w-full flex-col items-center justify-center px-4 text-center">
                <motion.div
                  whileHover={{ scale: 1.08 }}
                  whileTap={{ scale: 0.94 }}
                  className="relative flex h-[clamp(4.5rem,11vw,7rem)] w-[clamp(4.5rem,11vw,7rem)] items-center justify-center rounded-full bg-white/70 shadow-[0_0_60px_-8px_rgba(249,115,22,0.9)] ring-1 ring-white/90 backdrop-blur-xl"
                >
                  {!reduced && (
                    <div className="absolute inset-0 animate-ping rounded-full bg-orange-500/25" />
                  )}
                  <Play className="ml-[6%] h-[42%] w-[42%] fill-[#f97316] text-[#f97316] drop-shadow-md" />
                </motion.div>

                <div className="mt-[clamp(1rem,2.5vw,1.75rem)] max-w-[min(100%,28rem)] rounded-3xl bg-white/55 px-[clamp(1.1rem,3vw,2rem)] py-[clamp(0.9rem,2vw,1.25rem)] shadow-2xl ring-1 ring-white/70 backdrop-blur-md">
                  <h3 className="text-balance font-[family-name:var(--font-display)] text-[clamp(1.25rem,0.9rem+1.6vw,2rem)] font-bold leading-tight text-gray-900">
                    Watch the Full Experience
                  </h3>
                  <p className="mt-1 text-[clamp(0.75rem,0.7rem+0.25vw,0.9rem)] font-medium text-gray-800">
                    All {VIDEOS.length} clips, one flow
                  </p>
                </div>
              </div>

              <div className="pointer-events-none absolute inset-0 z-30 rounded-[inherit] ring-1 ring-inset ring-white/30 transition-colors duration-500 group-hover:ring-orange-500/60" />
            </div>

            {/* CLIPS: swipe strip (phones) → 3-col grid (tablets) → stacked column (desktop) */}
            <div className="grid grid-cols-3 gap-2 min-[480px]:gap-3 md:gap-4 lg:col-span-4 lg:flex lg:flex-col lg:gap-[clamp(1rem,1.6vw,1.5rem)]">
              {VIDEOS.map((video, idx) => (
                <div
                  key={video.src}
                  role="button"
                  tabIndex={0}
                  aria-label={`Play ${video.label}`}
                  onClick={() => handleOpen(idx)}
                  onKeyDown={(e) =>
                    (e.key === "Enter" || e.key === " ") && handleOpen(idx)
                  }
                  className="group/card relative aspect-[3/4] min-w-0 cursor-pointer overflow-hidden rounded-2xl sm:aspect-video sm:rounded-3xl border border-orange-900/10 bg-orange-100 shadow-lg outline-none transition-all duration-500 hover:-translate-y-1 hover:shadow-[0_15px_40px_-10px_rgba(249,115,22,0.45)] focus-visible:ring-4 focus-visible:ring-orange-500/60 lg:aspect-auto lg:flex-1"
                >
                  <PreviewVideo src={video.src} />
                  <div className="absolute inset-x-0 bottom-0 h-2/5 bg-gradient-to-t from-black/45 to-transparent" />

                  <div className="absolute right-1.5 top-1.5 flex h-7 w-7 items-center justify-center rounded-full bg-white/80 text-orange-600 shadow-md backdrop-blur-md transition-transform duration-300 group-hover/card:scale-110 sm:right-2.5 sm:top-2.5 sm:h-10 sm:w-10">
                    <Play className="ml-0.5 h-3 w-3 fill-current sm:h-4 sm:w-4" />
                  </div>

                  <div className="absolute inset-x-0 bottom-0 p-2 min-[480px]:p-3 sm:p-4">
                    <p className="line-clamp-2 text-[clamp(0.65rem,0.5rem+0.6vw,0.95rem)] font-bold leading-tight text-white sm:truncate [text-shadow:0_1px_6px_rgba(0,0,0,0.5)]">
                      {idx + 1}. {video.label}
                    </p>
                    <p className="hidden text-[clamp(0.68rem,0.62rem+0.2vw,0.8rem)] text-white/90 sm:line-clamp-1 [text-shadow:0_1px_6px_rgba(0,0,0,0.5)]">
                      {video.caption}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </motion.div>
        </div>
      </section>

      {/* ============================== MODAL ============================== */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            role="dialog"
            aria-modal="true"
            aria-label="Riwainvite video player"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className={`fixed inset-0 z-[999999] flex h-[100dvh] w-screen items-center justify-center bg-gradient-to-br from-[#2a1608] via-[#3b1d09] to-[#1d0f05] ${
              fullBleed ? "" : "p-4 md:p-6 xl:p-10"
            }`}
            onClick={handleClose}
          >
            <div
              aria-hidden
              className="pointer-events-none absolute inset-0 overflow-hidden"
            >
              <Image
                src={POSTER}
                alt=""
                fill
                sizes="100vw"
                className="scale-125 object-cover opacity-40 blur-3xl"
              />
            </div>

            <motion.div
              ref={playerRef}
              initial={{ scale: 0.97, opacity: 0, y: 16 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.97, opacity: 0, y: 16 }}
              transition={{ type: "spring", damping: 26, stiffness: 300 }}
              onClick={(e) => {
                e.stopPropagation();
                pingControls();
              }}
              onMouseMove={pingControls}
              onTouchStart={onTouchStart}
              onTouchEnd={onTouchEnd}
              className={`relative overflow-hidden bg-[#1d0f05] ${
                fullBleed
                  ? "h-full w-full"
                  : "aspect-video h-auto w-[min(100%,calc((100dvh_-_5rem)*1.7778))] max-w-[1600px] rounded-3xl border border-white/15 shadow-[0_0_120px_-20px_rgba(249,115,22,0.55)]"
              }`}
            >
              <video
                key={currentVideo}
                ref={videoRef}
                src={VIDEOS[currentVideo].src}
                autoPlay
                playsInline
                onLoadedMetadata={pickFit}
                onPlay={() => setIsPlaying(true)}
                onPause={() => setIsPlaying(false)}
                onEnded={handleVideoEnd}
                onTimeUpdate={handleTimeUpdate}
                onClick={togglePlay}
                className={`h-full w-full ${fullBleed && fit === "contain" ? "object-contain" : "object-cover"}`}
              />

              {/* Segmented progress */}
              <div
                className={`absolute inset-x-0 top-0 z-40 flex gap-1.5 ${isShort ? "pb-3" : "pb-6"}`}
                style={{
                  ...sidePad,
                  paddingTop: `max(${isShort ? "0.5rem" : "1rem"}, env(safe-area-inset-top, 0px))`,
                  opacity: showControls ? 1 : 0,
                  transition: "opacity 300ms",
                  background:
                    "linear-gradient(to bottom, rgba(0,0,0,0.35), transparent)",
                }}
              >
                {VIDEOS.map((v, idx) => (
                  <button
                    key={v.src}
                    aria-label={`Go to ${v.label}`}
                    onClick={(e) => {
                      e.stopPropagation();
                      if (idx !== currentVideo) goTo(idx);
                    }}
                    className="group/seg h-5 flex-1 py-2"
                  >
                    <div className="h-1 w-full overflow-hidden rounded-full bg-white/30 transition-all group-hover/seg:h-1.5">
                      <div
                        className="h-full rounded-full bg-gradient-to-r from-orange-400 to-amber-300"
                        style={{
                          width:
                            idx < currentVideo
                              ? "100%"
                              : idx === currentVideo
                                ? `${progress}%`
                                : "0%",
                        }}
                      />
                    </div>
                  </button>
                ))}
              </div>

              {/* Title */}
              <div
                className="pointer-events-none absolute left-0 z-40 max-w-[68%]"
                style={{
                  ...sidePad,
                  top: topOffset,
                  opacity: showControls ? 1 : 0,
                  transition: "opacity 300ms",
                }}
              >
                <p className="truncate text-[clamp(0.9rem,0.8rem+0.5vw,1.15rem)] font-bold text-white [text-shadow:0_1px_8px_rgba(0,0,0,0.6)]">
                  {VIDEOS[currentVideo].label}
                </p>
                {!isShort && (
                  <p className="truncate text-xs text-white/85 [text-shadow:0_1px_8px_rgba(0,0,0,0.6)] sm:text-sm">
                    {VIDEOS[currentVideo].caption}
                  </p>
                )}
              </div>

              {/* Close */}
              <div
                className="absolute right-0 z-50"
                style={{
                  ...sidePad,
                  paddingLeft: 0,
                  top: topOffset,
                  opacity: showControls ? 1 : 0,
                  transition: "opacity 300ms",
                }}
              >
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    handleClose();
                  }}
                  aria-label="Close video"
                  className="flex h-11 w-11 items-center justify-center rounded-full bg-black/40 text-white ring-1 ring-white/25 backdrop-blur-md transition-colors hover:bg-black/60"
                >
                  <X className="h-6 w-6" />
                </button>
              </div>

              {/* Replay */}
              <AnimatePresence>
                {ended && (
                  <motion.button
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0 }}
                    onClick={(e) => {
                      e.stopPropagation();
                      restart();
                    }}
                    className="absolute left-1/2 top-1/2 z-40 flex -translate-x-1/2 -translate-y-1/2 items-center gap-3 whitespace-nowrap rounded-full bg-white px-6 py-3.5 text-base font-bold text-orange-600 shadow-[0_0_60px_rgba(249,115,22,0.6)] transition-transform hover:scale-105"
                  >
                    <RotateCcw className="h-5 w-5" /> Watch again
                  </motion.button>
                )}
              </AnimatePresence>

              {/* Center play when paused */}
              <AnimatePresence>
                {!isPlaying && !ended && (
                  <motion.button
                    initial={{ opacity: 0, scale: 0.8 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.8 }}
                    onClick={(e) => {
                      e.stopPropagation();
                      togglePlay();
                    }}
                    aria-label="Play"
                    className={`absolute left-1/2 top-1/2 z-40 flex -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full bg-white/85 text-orange-600 shadow-[0_0_50px_rgba(249,115,22,0.6)] backdrop-blur-md ${
                      isShort
                        ? "h-14 w-14"
                        : "h-[clamp(4rem,9vw,5.5rem)] w-[clamp(4rem,9vw,5.5rem)]"
                    }`}
                  >
                    <Play className="ml-1 h-[42%] w-[42%] fill-current" />
                  </motion.button>
                )}
              </AnimatePresence>

              {/* Bottom controls */}
              <div
                className={`absolute inset-x-0 bottom-0 z-40 ${isShort ? "pt-8" : "pt-14 sm:pt-20"}`}
                style={{
                  ...sidePad,
                  paddingBottom: `max(${isShort ? "0.5rem" : "1rem"}, env(safe-area-inset-bottom, 0px))`,
                  opacity: controlsVisible ? 1 : 0,
                  transition: "opacity 300ms",
                  pointerEvents: controlsVisible ? "auto" : "none",
                  background:
                    "linear-gradient(to top, rgba(20,8,2,0.6), transparent)",
                }}
              >
                <div
                  onClick={seek}
                  className={`group/bar flex w-full cursor-pointer items-center ${isShort ? "mb-1 h-5" : "mb-3 h-6"}`}
                  role="slider"
                  aria-label="Seek"
                  aria-valuenow={Math.round(progress)}
                  aria-valuemin={0}
                  aria-valuemax={100}
                >
                  <div className="h-1.5 w-full overflow-hidden rounded-full bg-white/25 transition-all group-hover/bar:h-2.5">
                    <div
                      className="h-full rounded-full bg-gradient-to-r from-orange-500 to-amber-400"
                      style={{ width: `${progress}%` }}
                    />
                  </div>
                </div>

                <div className="flex items-center justify-between gap-1">
                  <div className="flex items-center gap-1 min-[400px]:gap-2 sm:gap-3">
                    <button
                      onClick={togglePlay}
                      aria-label={isPlaying ? "Pause" : "Play"}
                      className="flex h-12 w-12 items-center justify-center rounded-full bg-white text-black shadow-[0_0_30px_rgba(255,255,255,0.35)] transition-transform hover:scale-105 active:scale-95 lg:h-14 lg:w-14"
                    >
                      {isPlaying ? (
                        <Pause className="h-5 w-5 fill-black" />
                      ) : (
                        <Play className="ml-0.5 h-5 w-5 fill-black" />
                      )}
                    </button>
                    <button
                      onClick={() => goTo(currentVideo - 1)}
                      disabled={currentVideo === 0}
                      aria-label="Previous clip"
                      className="flex h-11 w-11 items-center justify-center rounded-full text-white/85 transition-colors hover:bg-white/10 hover:text-white disabled:opacity-30"
                    >
                      <SkipBack className="h-5 w-5" />
                    </button>
                    <button
                      onClick={() => goTo(currentVideo + 1)}
                      disabled={currentVideo === VIDEOS.length - 1}
                      aria-label="Next clip"
                      className="flex h-11 w-11 items-center justify-center rounded-full text-white/85 transition-colors hover:bg-white/10 hover:text-white disabled:opacity-30"
                    >
                      <SkipForward className="h-5 w-5" />
                    </button>
                    <button
                      onClick={restart}
                      aria-label="Restart sequence"
                      title="Restart sequence"
                      className="hidden h-11 w-11 items-center justify-center rounded-full text-white/85 transition-colors hover:bg-white/10 hover:text-white min-[480px]:flex"
                    >
                      <RotateCcw className="h-5 w-5" />
                    </button>
                  </div>

                  <div className="flex items-center gap-0.5 sm:gap-2">
                    {fullBleed && (
                      <button
                        onClick={() =>
                          setFitOverride(
                            fit === "contain" ? "cover" : "contain",
                          )
                        }
                        aria-label={
                          fit === "contain" ? "Fill screen" : "Fit to screen"
                        }
                        className="flex h-11 w-11 items-center justify-center rounded-full text-white/85 transition-colors hover:bg-white/10 hover:text-white"
                      >
                        <Expand className="h-5 w-5" />
                      </button>
                    )}
                    <button
                      onClick={() => setIsMuted((m) => !m)}
                      aria-label={isMuted ? "Unmute" : "Mute"}
                      className="flex h-11 w-11 items-center justify-center rounded-full text-white/85 transition-colors hover:bg-white/10 hover:text-white"
                    >
                      {isMuted ? (
                        <VolumeX className="h-5 w-5" />
                      ) : (
                        <Volume2 className="h-5 w-5" />
                      )}
                    </button>
                    <button
                      onClick={toggleFullscreen}
                      aria-label="Toggle fullscreen"
                      className="flex h-11 w-11 items-center justify-center rounded-full text-white/85 transition-colors hover:bg-white/10 hover:text-white"
                    >
                      {isFullscreen ? (
                        <Minimize2 className="h-5 w-5" />
                      ) : (
                        <Maximize2 className="h-5 w-5" />
                      )}
                    </button>
                  </div>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
