"use client";

import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type PointerEvent as ReactPointerEvent,
  type TouchEvent as ReactTouchEvent,
} from "react";
import { createPortal } from "react-dom";
import {
  AnimatePresence,
  motion,
  useMotionValue,
  useReducedMotion,
  useTransform,
  useSpring,
} from "framer-motion";
import { Canvas, useFrame } from "@react-three/fiber";
import { Vector2, type ShaderMaterial } from "three";
import {
  Maximize,
  Minimize,
  Pause,
  Play,
  RotateCcw,
  ShieldCheck,
  SkipBack,
  SkipForward,
  MonitorPlay,
  Volume2,
  VolumeX,
  X,
  Zap,
  MousePointerClick,
  type LucideIcon,
} from "lucide-react";

/* -------------------------------------------------------------------------- */
/*                                    Data                                    */
/* -------------------------------------------------------------------------- */
interface VideoItem {
  src: string;
  title: string;
  desc: string;
  icon: LucideIcon;
  poster?: string;
  theme: {
    iconBg: string;
    iconColor: string;
  };
}

const VIDEOS: readonly VideoItem[] = [
  {
    src: "/the-digital-canvas.mp4",
    title: "The Living Invitation",
    desc: "Add videos, music, and interactive elements.",
    icon: MonitorPlay,
    theme: {
      iconBg: "bg-orange-100",
      iconColor: "text-orange-600",
    },
  },
  {
    src: "/the-environmental-impact.mp4",
    title: "Zero Carbon Footprint",
    desc: "Save the trees without sacrificing luxury.",
    icon: ShieldCheck,
    theme: {
      iconBg: "bg-blue-100",
      iconColor: "text-blue-600",
    },
  },
  {
    src: "/the-paper-problem.mp4",
    title: "The Death of Paper",
    desc: "Why the old way is finally over.",
    icon: Zap,
    theme: {
      iconBg: "bg-purple-100",
      iconColor: "text-purple-600",
    },
  },
] as const;

const CONTROLS_HIDE_MS = 3000;
const SWIPE_X = 60;
const SWIPE_Y = 110;

/* -------------------------------------------------------------------------- */
/*                         Three.js: flowing pastel silk                      */
/* -------------------------------------------------------------------------- */
const SILK_VERT = /* glsl */ `
  varying vec2 vUv;
  void main() {
    vUv = uv;
    gl_Position = vec4(position.xy, 0.0, 1.0);
  }
`;

const SILK_FRAG = /* glsl */ `
  varying vec2 vUv;
  uniform float uTime;
  uniform vec2 uRes;

  float hash(vec2 p) {
    p = fract(p * vec2(123.34, 456.21));
    p += dot(p, p + 45.32);
    return fract(p.x * p.y);
  }

  float noise(vec2 p) {
    vec2 i = floor(p);
    vec2 f = fract(p);
    vec2 u = f * f * (3.0 - 2.0 * f);
    return mix(
      mix(hash(i), hash(i + vec2(1.0, 0.0)), u.x),
      mix(hash(i + vec2(0.0, 1.0)), hash(i + vec2(1.0, 1.0)), u.x),
      u.y
    );
  }

  float fbm(vec2 p) {
    float v = 0.0;
    float a = 0.5;
    mat2 m = mat2(1.6, 1.2, -1.2, 1.6);
    for (int i = 0; i < 5; i++) {
      v += a * noise(p);
      p = m * p;
      a *= 0.5;
    }
    return v;
  }

  void main() {
    float aspect = uRes.x / uRes.y;
    vec2 p = (vUv - 0.5) * vec2(aspect, 1.0) * 1.6;
    float t = uTime * 0.04;

    vec2 q = vec2(fbm(p + vec2(0.0, t)), fbm(p + vec2(5.2, 1.3) - t));
    vec2 r = vec2(
      fbm(p + 2.0 * q + vec2(1.7, 9.2) + 0.6 * t),
      fbm(p + 2.0 * q + vec2(8.3, 2.8) - 0.5 * t)
    );
    vec2 w = p + 2.0 * r;
    float f = fbm(w);

    vec3 base    = vec3(1.000, 0.980, 0.984);
    vec3 blush   = vec3(1.000, 0.894, 0.918);
    vec3 peach   = vec3(1.000, 0.851, 0.761);
    vec3 apricot = vec3(1.000, 0.769, 0.639);
    vec3 rose    = vec3(1.000, 0.788, 0.839);
    vec3 lilac   = vec3(0.918, 0.863, 1.000);

    vec3 col = mix(base, blush, smoothstep(0.25, 0.75, f));
    col = mix(col, peach,   smoothstep(0.30, 0.85, length(q)) * 0.85);
    col = mix(col, rose,    smoothstep(0.45, 0.95, r.x) * 0.65);
    col = mix(col, apricot, smoothstep(0.55, 1.00, r.y * f * 2.0) * 0.5);
    col = mix(col, lilac,   smoothstep(0.60, 1.00, r.y) * 0.22);

    float e = 0.012;
    float fx = fbm(w + vec2(e, 0.0));
    float fy = fbm(w + vec2(0.0, e));
    vec3 n = normalize(vec3(-(fx - f) / e * 0.35, -(fy - f) / e * 0.35, 1.0));
    vec3 L = normalize(vec3(-0.45, 0.55, 0.75));
    col *= 0.965 + 0.055 * dot(n, L);
    float spec = pow(max(dot(n, normalize(L + vec3(0.0, 0.0, 1.0))), 0.0), 40.0);
    col += spec * 0.22 * vec3(1.0, 0.96, 0.94);

    float edge = smoothstep(0.0, 0.14, vUv.y) * smoothstep(1.0, 0.86, vUv.y);
    col = mix(base, col, edge);

    col += (hash(gl_FragCoord.xy + fract(uTime)) - 0.5) * (2.0 / 255.0);

    gl_FragColor = vec4(clamp(col, 0.0, 1.0), 1.0);
  }
`;

function SilkPlane({ reduced }: { reduced: boolean }) {
  const matRef = useRef<ShaderMaterial>(null);
  const uniforms = useMemo(
    () => ({
      uTime: { value: 18 },
      uRes: { value: new Vector2(1, 1) },
    }),
    [],
  );

  useFrame(({ clock, size, viewport }) => {
    const m = matRef.current;
    if (!m) return;
    m.uniforms.uTime!.value = reduced ? 18 : clock.getElapsedTime() + 18;
    (m.uniforms.uRes!.value as Vector2).set(
      size.width * viewport.dpr,
      size.height * viewport.dpr,
    );
  });

  return (
    <mesh frustumCulled={false}>
      <planeGeometry args={[2, 2]} />
      <shaderMaterial
        ref={matRef}
        uniforms={uniforms}
        vertexShader={SILK_VERT}
        fragmentShader={SILK_FRAG}
        depthTest={false}
        depthWrite={false}
      />
    </mesh>
  );
}

function SilkField({ active, reduced }: { active: boolean; reduced: boolean }) {
  return (
    <Canvas
      aria-hidden
      dpr={[1, 1.75]}
      gl={{ alpha: false, antialias: false, powerPreference: "low-power" }}
      frameloop={reduced ? "demand" : active ? "always" : "never"}
      className="!absolute inset-0"
    >
      <SilkPlane reduced={reduced} />
    </Canvas>
  );
}

/* -------------------------------------------------------------------------- */
/*                               Gallery card                                 */
/* -------------------------------------------------------------------------- */

interface VideoCardProps {
  item: VideoItem;
  index: number;
  autoPlay: boolean;
  onOpen: (index: number) => void;
}

function VideoCard({ item, index, autoPlay, onOpen }: VideoCardProps) {
  const Icon = item.icon;
  const x = useMotionValue(0);
  const y = useMotionValue(0);
  const rotateX = useSpring(useTransform(y, [-0.5, 0.5], ["10deg", "-10deg"]), {
    stiffness: 150,
    damping: 20,
  });
  const rotateY = useSpring(useTransform(x, [-0.5, 0.5], ["-10deg", "10deg"]), {
    stiffness: 150,
    damping: 20,
  });

  const handleMouseMove = (e: ReactPointerEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const nx = (e.clientX - rect.left) / rect.width;
    const ny = (e.clientY - rect.top) / rect.height;
    x.set(nx - 0.5);
    y.set(ny - 0.5);
  };

  const handleMouseLeave = () => {
    x.set(0);
    y.set(0);
  };

  return (
    <motion.div
      onPointerMove={handleMouseMove}
      onPointerLeave={handleMouseLeave}
      style={{ rotateX, rotateY, transformStyle: "preserve-3d" }}
      className="w-full h-full perspective-1000"
    >
      <button
        type="button"
        onClick={() => onOpen(index)}
        aria-label={`Play ${item.title}`}
        className="group relative flex h-full w-full flex-col overflow-hidden rounded-[2rem] border border-black/5 bg-white/80 p-3 shadow-xl backdrop-blur-sm outline-none ring-offset-2 ring-offset-[#fffafb] focus-visible:ring-2 focus-visible:ring-orange-500 transition-shadow duration-500 hover:shadow-[0_20px_60px_-15px_rgba(0,0,0,0.2)]"
      >
        {/* Video Box with GAP around it */}
        <div className="relative aspect-[4/5] w-full shrink-0 overflow-hidden rounded-[1.5rem] bg-[#1d0f05] md:aspect-[16/10]">
          <video
            src={item.src}
            className="absolute inset-0 h-full w-full object-cover transition-transform duration-700 group-hover:scale-105"
            muted
            loop
            playsInline
            autoPlay={autoPlay}
            preload="metadata"
            draggable={false}
            aria-hidden
          />

          {/* Dark gradient on hover for play button visibility */}
          <div className="absolute inset-0 bg-black/20 opacity-0 transition-opacity duration-300 group-hover:opacity-100" />

          {/* Big Center Play Button */}
          <div className="absolute inset-0 flex items-center justify-center opacity-0 transition-all duration-300 group-hover:scale-105 group-hover:opacity-100">
            <span className="flex h-16 w-16 items-center justify-center rounded-full bg-white/30 text-white shadow-[0_0_30px_rgba(0,0,0,0.3)] backdrop-blur-md ring-1 ring-white/50">
              <Play className="ml-1 h-6 w-6 fill-white" />
            </span>
          </div>

          {/* Small top-right play icon */}
          <span className="absolute right-4 top-4 flex h-9 w-9 items-center justify-center rounded-full border border-white/30 bg-black/20 text-white backdrop-blur-md">
            <Play className="ml-0.5 h-3.5 w-3.5" fill="currentColor" />
          </span>
        </div>

        {/* Text Content below video */}
        <div className="flex flex-1 flex-col gap-3 px-3 pb-3 pt-5 text-left">
          <span
            className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-xl ${item.theme.iconBg} ${item.theme.iconColor} shadow-sm ring-1 ring-black/5`}
          >
            <Icon className="h-6 w-6" />
          </span>
          <div className="flex-1">
            <h3 className="font-[family-name:var(--font-display)] text-xl font-bold leading-tight text-gray-900">
              {item.title}
            </h3>
            {/* Added min-h to force equal heights for descriptions */}
            <p className="mt-2 min-h-[2.5rem] text-sm leading-snug text-gray-600 line-clamp-2">
              {item.desc}
            </p>
          </div>

          {/* Call to Action Hint */}
          <div className="mt-2 flex items-center gap-1.5 text-xs font-semibold text-orange-600 transition-colors group-hover:text-orange-700">
            <MousePointerClick className="h-4 w-4" />
            Click to watch
          </div>
        </div>
      </button>
    </motion.div>
  );
}

/* -------------------------------------------------------------------------- */
/*                             Cinematic player                               */
/* -------------------------------------------------------------------------- */

interface IconButtonProps {
  label: string;
  onClick: () => void;
  disabled?: boolean;
  children: React.ReactNode;
}

function IconButton({ label, onClick, disabled, children }: IconButtonProps) {
  return (
    <button
      type="button"
      aria-label={label}
      title={label}
      disabled={disabled}
      onClick={(e) => {
        e.stopPropagation();
        onClick();
      }}
      className="flex h-11 w-11 items-center justify-center rounded-full text-white/90 outline-none transition-colors hover:bg-white/15 hover:text-white focus-visible:ring-2 focus-visible:ring-orange-400 disabled:pointer-events-none disabled:opacity-35"
    >
      {children}
    </button>
  );
}

interface CinematicPlayerProps {
  videos: readonly VideoItem[];
  startIndex: number;
  reduced: boolean;
  onClose: () => void;
}

function CinematicPlayer({
  videos,
  startIndex,
  reduced,
  onClose,
}: CinematicPlayerProps) {
  const last = videos.length - 1;
  const [index, setIndex] = useState(startIndex);
  const [playing, setPlaying] = useState(true);
  const [muted, setMuted] = useState(false);
  const [ended, setEnded] = useState(false);
  const [visible, setVisible] = useState(true);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [canFullscreen, setCanFullscreen] = useState(false);

  const rootRef = useRef<HTMLDivElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const barRefs = useRef<(HTMLSpanElement | null)[]>([]);
  const hideTimer = useRef<number | undefined>(undefined);
  const playingRef = useRef(true);
  const touchStart = useRef<{ x: number; y: number } | null>(null);

  const item = videos[index] as VideoItem;

  const poke = useCallback(() => {
    setVisible(true);
    window.clearTimeout(hideTimer.current);
    hideTimer.current = window.setTimeout(() => {
      if (playingRef.current) setVisible(false);
    }, CONTROLS_HIDE_MS);
  }, []);

  useEffect(() => {
    playingRef.current = playing;
    if (playing) poke();
    else {
      window.clearTimeout(hideTimer.current);
      setVisible(true);
    }
  }, [playing, poke]);

  useEffect(() => () => window.clearTimeout(hideTimer.current), []);

  const tryPlay = useCallback(() => {
    const v = videoRef.current;
    if (!v) return;
    v.play().catch(() => {
      v.muted = true;
      setMuted(true);
      v.play().catch(() => setPlaying(false));
    });
  }, []);

  useEffect(() => {
    setEnded(false);
    const v = videoRef.current;
    if (v) v.muted = muted;
    tryPlay();
  }, [index, tryPlay]);

  useEffect(() => {
    if (videoRef.current) videoRef.current.muted = muted;
  }, [muted]);

  const togglePlay = useCallback(() => {
    const v = videoRef.current;
    if (!v) return;
    if (ended) {
      setIndex(0);
      setEnded(false);
      return;
    }
    if (v.paused) tryPlay();
    else v.pause();
    poke();
  }, [ended, poke, tryPlay]);

  const goTo = useCallback(
    (i: number) => {
      const next = Math.max(0, Math.min(last, i));
      setEnded(false);
      if (next === index) {
        const v = videoRef.current;
        if (v) {
          v.currentTime = 0;
          tryPlay();
        }
      } else {
        setIndex(next);
      }
      poke();
    },
    [index, last, poke, tryPlay],
  );

  const next = useCallback(() => goTo(index + 1), [goTo, index]);
  const prev = useCallback(() => goTo(index - 1), [goTo, index]);
  const restart = useCallback(() => goTo(index), [goTo, index]);
  const watchAgain = useCallback(() => {
    setEnded(false);
    if (index === 0) goTo(0);
    else setIndex(0);
  }, [goTo, index]);

  const handleEnded = useCallback(() => {
    if (index < last) setIndex(index + 1);
    else {
      setEnded(true);
      setPlaying(false);
    }
  }, [index, last]);

  const toggleMute = useCallback(() => {
    setMuted((m) => !m);
    poke();
  }, [poke]);

  useEffect(() => {
    setCanFullscreen(Boolean(document.fullscreenEnabled));
    const onChange = () => setIsFullscreen(Boolean(document.fullscreenElement));
    document.addEventListener("fullscreenchange", onChange);
    return () => document.removeEventListener("fullscreenchange", onChange);
  }, []);

  const toggleFullscreen = useCallback(() => {
    if (document.fullscreenElement) void document.exitFullscreen();
    else void rootRef.current?.requestFullscreen?.().catch(() => undefined);
    poke();
  }, [poke]);

  const close = useCallback(() => {
    if (document.fullscreenElement) void document.exitFullscreen();
    onClose();
  }, [onClose]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.metaKey || e.ctrlKey || e.altKey) return;
      switch (e.key) {
        case " ":
        case "Spacebar":
          e.preventDefault();
          togglePlay();
          break;
        case "Escape":
          e.preventDefault();
          close();
          break;
        case "ArrowRight":
          e.preventDefault();
          next();
          break;
        case "ArrowLeft":
          e.preventDefault();
          prev();
          break;
        case "m":
        case "M":
          toggleMute();
          break;
        case "f":
        case "F":
          if (canFullscreen) toggleFullscreen();
          break;
        default:
          return;
      }
      poke();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [
    canFullscreen,
    close,
    next,
    poke,
    prev,
    toggleFullscreen,
    toggleMute,
    togglePlay,
  ]);

  useEffect(() => {
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    rootRef.current?.focus();
    return () => {
      document.body.style.overflow = prevOverflow;
    };
  }, []);

  useEffect(() => {
    let raf = 0;
    const bar = barRefs.current[index];
    if (bar) bar.style.transform = "scaleX(0)";
    const tick = () => {
      const v = videoRef.current;
      const b = barRefs.current[index];
      if (v && b && v.duration > 0 && Number.isFinite(v.duration)) {
        b.style.transform = `scaleX(${Math.min(1, v.currentTime / v.duration)})`;
      }
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [index]);

  const onTouchStart = (e: ReactTouchEvent) => {
    const t = e.touches[0];
    if (t) touchStart.current = { x: t.clientX, y: t.clientY };
  };
  const onTouchEnd = (e: ReactTouchEvent) => {
    const start = touchStart.current;
    const t = e.changedTouches[0];
    touchStart.current = null;
    if (!start || !t) return;
    const dx = t.clientX - start.x;
    const dy = t.clientY - start.y;
    if (Math.abs(dx) > SWIPE_X && Math.abs(dx) > Math.abs(dy)) {
      if (dx < 0) next();
      else prev();
    } else if (dy > SWIPE_Y && Math.abs(dy) > Math.abs(dx)) {
      close();
    }
  };

  const onPointerMove = (e: ReactPointerEvent) => {
    if (e.pointerType === "mouse") poke();
  };

  const showCenterPlay = !playing && !ended;
  const fade = reduced ? 0 : 0.25;

  return (
    <motion.div
      ref={rootRef}
      role="dialog"
      aria-modal="true"
      aria-label={`${item.title} – video player`}
      tabIndex={-1}
      data-lenis-prevent=""
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: fade }}
      onPointerMove={onPointerMove}
      onTouchStart={onTouchStart}
      onTouchEnd={onTouchEnd}
      onClick={() => togglePlay()}
      className={`fixed inset-0 z-[100] flex h-[100dvh] w-full items-center justify-center overflow-hidden bg-[#1d0f05] text-white outline-none ${
        visible ? "" : "cursor-none"
      }`}
    >
      <video
        key={`bg-${item.src}`}
        src={`${item.src}#t=0.1`}
        poster={item.poster}
        muted
        playsInline
        preload="metadata"
        aria-hidden
        className="pointer-events-none absolute inset-0 h-full w-full scale-125 object-cover opacity-50 blur-3xl"
      />
      <div className="pointer-events-none absolute inset-0 bg-[#1d0f05]/60" />

      <video
        key={item.src}
        ref={videoRef}
        src={item.src}
        poster={item.poster}
        playsInline
        preload="auto"
        onPlay={() => setPlaying(true)}
        onPause={() => {
          const v = videoRef.current;
          if (v && !v.ended) setPlaying(false);
        }}
        onEnded={handleEnded}
        className="relative h-full w-full object-contain"
      />

      <div
        className={`absolute inset-x-0 top-0 bg-gradient-to-b from-black/60 to-transparent px-4 pb-10 pt-[max(1rem,env(safe-area-inset-top))] transition-opacity duration-300 sm:px-6 ${
          visible ? "opacity-100" : "pointer-events-none opacity-0"
        }`}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex gap-1.5" role="group" aria-label="Clips">
          {videos.map((v, i) => (
            <button
              key={v.src}
              type="button"
              aria-label={`Go to ${v.title}`}
              aria-current={i === index}
              onClick={() => goTo(i)}
              className="group/seg flex h-5 flex-1 items-center outline-none"
            >
              <span className="relative block h-1 w-full overflow-hidden rounded-full bg-white/25 transition-[height] group-hover/seg:h-1.5 group-focus-visible/seg:h-1.5">
                <span
                  ref={(el) => {
                    barRefs.current[i] = el;
                  }}
                  className="absolute inset-0 origin-left rounded-full bg-gradient-to-r from-orange-400 to-rose-400"
                  style={
                    i < index
                      ? { transform: "scaleX(1)" }
                      : i > index
                        ? { transform: "scaleX(0)" }
                        : undefined
                  }
                />
              </span>
            </button>
          ))}
        </div>

        <div className="mt-3 flex items-start justify-between gap-4">
          <div className="min-w-0">
            <h3 className="truncate font-[family-name:var(--font-display)] text-lg font-semibold sm:text-2xl">
              {item.title}
            </h3>
            <p className="mt-0.5 text-sm text-white/75 sm:text-base">
              {item.desc}
            </p>
          </div>
          <IconButton label="Close" onClick={close}>
            <X className="h-5 w-5" />
          </IconButton>
        </div>
      </div>

      <AnimatePresence>
        {(showCenterPlay || ended) && (
          <motion.div
            initial={{ opacity: 0, scale: reduced ? 1 : 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: reduced ? 1 : 0.9 }}
            transition={{ duration: fade }}
            className="pointer-events-none absolute inset-0 flex items-center justify-center"
          >
            {ended ? (
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  watchAgain();
                }}
                className="pointer-events-auto flex items-center gap-2 font-[family-name:var(--font-display)] rounded-full border border-white/30 bg-white/15 px-6 py-3.5 text-base font-semibold backdrop-blur-xl outline-none transition-colors hover:bg-white/25 focus-visible:ring-2 focus-visible:ring-orange-400"
              >
                <RotateCcw className="h-5 w-5" />
                Watch again
              </button>
            ) : (
              <span className="flex h-20 w-20 items-center justify-center rounded-full border border-white/30 bg-white/15 backdrop-blur-xl">
                <Play className="ml-1 h-8 w-8" fill="currentColor" />
              </span>
            )}
          </motion.div>
        )}
      </AnimatePresence>

      <div
        className={`absolute inset-x-0 bottom-0 flex items-center justify-between bg-gradient-to-t from-black/65 to-transparent px-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] pt-12 transition-opacity duration-300 sm:px-6 ${
          visible ? "opacity-100" : "pointer-events-none opacity-0"
        }`}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center gap-1">
          <IconButton label={playing ? "Pause" : "Play"} onClick={togglePlay}>
            {playing ? (
              <Pause className="h-5 w-5" fill="currentColor" />
            ) : (
              <Play className="h-5 w-5" fill="currentColor" />
            )}
          </IconButton>
          <IconButton
            label="Previous clip"
            onClick={prev}
            disabled={index === 0}
          >
            <SkipBack className="h-5 w-5" />
          </IconButton>
          <IconButton
            label="Next clip"
            onClick={next}
            disabled={index === last}
          >
            <SkipForward className="h-5 w-5" />
          </IconButton>
          <IconButton label="Restart clip" onClick={restart}>
            <RotateCcw className="h-5 w-5" />
          </IconButton>
        </div>
        <div className="flex items-center gap-1">
          <IconButton label={muted ? "Unmute" : "Mute"} onClick={toggleMute}>
            {muted ? (
              <VolumeX className="h-5 w-5" />
            ) : (
              <Volume2 className="h-5 w-5" />
            )}
          </IconButton>
          {canFullscreen && (
            <IconButton
              label={isFullscreen ? "Exit fullscreen" : "Fullscreen"}
              onClick={toggleFullscreen}
            >
              {isFullscreen ? (
                <Minimize className="h-5 w-5" />
              ) : (
                <Maximize className="h-5 w-5" />
              )}
            </IconButton>
          )}
        </div>
      </div>
    </motion.div>
  );
}

/* -------------------------------------------------------------------------- */
/*                              Main section                                  */
/* -------------------------------------------------------------------------- */
export default function TheDigitalCanvas() {
  const prefersReduced = useReducedMotion() ?? false;
  const sectionRef = useRef<HTMLElement>(null);

  const [mounted, setMounted] = useState(false);
  const [inView, setInView] = useState(false);
  const [openIndex, setOpenIndex] = useState<number | null>(null);
  const triggerRef = useRef<HTMLElement | null>(null);

  useEffect(() => setMounted(true), []);

  useEffect(() => {
    const el = sectionRef.current;
    if (!el || typeof IntersectionObserver === "undefined") return;
    const io = new IntersectionObserver(
      ([entry]) => setInView(Boolean(entry?.isIntersecting)),
      { rootMargin: "100px" },
    );
    io.observe(el);
    return () => io.disconnect();
  }, []);

  const handleOpen = useCallback((i: number) => {
    triggerRef.current = document.activeElement as HTMLElement | null;
    setOpenIndex(i);
  }, []);

  const handleClose = useCallback(() => {
    setOpenIndex(null);
    requestAnimationFrame(() => triggerRef.current?.focus?.());
  }, []);

  return (
    <section
      ref={sectionRef}
      id="the-digital-canvas"
      aria-labelledby="digital-canvas-heading"
      // FIXED: Added relative z-10
      className="relative z-10 overflow-hidden bg-[#fffafb] py-24 sm:py-32"
    >
      {/* Three.js pastel silk background */}
      {mounted && (
        <div aria-hidden className="pointer-events-none absolute inset-0 z-0">
          <SilkField
            active={inView && openIndex === null}
            reduced={prefersReduced}
          />
        </div>
      )}

      <div className="relative z-10 mx-auto max-w-6xl px-5 text-center sm:px-8">
        <span className="inline-flex items-center gap-2 rounded-full border border-orange-200 font-[family-name:var(--font-display)] bg-white/70 px-4 py-1.5 text-sm font-medium text-orange-600 shadow-sm backdrop-blur">
          <MonitorPlay className="h-4 w-4" />
          The Digital Canvas
        </span>
        <h2
          id="digital-canvas-heading"
          className="mt-6 font-[family-name:var(--font-display)] text-5xl font-semibold leading-[1.05] tracking-tight text-[#1d0f05] sm:text-7xl lg:text-8xl"
        >
          A medium without{" "}
          <span className="bg-gradient-to-r from-orange-500 via-orange-500 to-rose-500 bg-clip-text pb-2 text-transparent">
            limits.
          </span>
        </h2>
      </div>

      {/* 3D Centered Grid Layout (2x1 mobile, 3x1 desktop) */}
      <div className="relative z-10 mx-auto mt-14 flex max-w-6xl flex-wrap justify-center gap-5 px-5 sm:mt-20 sm:gap-8 sm:px-8">
        {VIDEOS.map((item, i) => (
          <div
            key={item.src}
            className="w-[calc(50%-0.625rem)] min-w-[280px] shrink-0 sm:w-[calc(33.333%-1.333rem)]"
          >
            <VideoCard
              item={item}
              index={i}
              autoPlay={!prefersReduced}
              onOpen={handleOpen}
            />
          </div>
        ))}
      </div>

      {/* Cinematic modal */}
      {mounted &&
        createPortal(
          <AnimatePresence>
            {openIndex !== null && (
              <CinematicPlayer
                key="cinematic-player"
                videos={VIDEOS}
                startIndex={openIndex}
                reduced={prefersReduced}
                onClose={handleClose}
              />
            )}
          </AnimatePresence>,
          document.body,
        )}
    </section>
  );
}
