"use client";

import { useEffect, useRef, useState } from "react";
import type { ComponentType, ReactNode } from "react";
import Image from "next/image";
import Link from "next/link";
import {
  AnimatePresence,
  animate,
  motion,
  useMotionValue,
  useReducedMotion,
  useSpring,
  useTransform,
  type MotionValue,
} from "framer-motion";

/* ------------------------------------------------------------------ */
/* Config                                                              */
/* ------------------------------------------------------------------ */
const DUR = 6200; // ms per chapter
const BAR = 76; // letterbox bar height (fixed -> no layout shift)
const TITLE_H = 232; // fixed title-card box
const TITLE_BOTTOM = BAR + 16;
const ZONE_BOTTOM = TITLE_BOTTOM + TITLE_H + 10;

export type Mode = "warp" | "net" | "rise";
export type Scene = {
  tag: string;
  title: string;
  body: string;
  mode: Mode;
  hue: number; // hue-rotate degrees (cumulative, monotone so colour never snaps back)
  floor: number;
  dolly: [number, number];
};

// Export the default scenes so they can be used as a fallback
export const DEFAULT_SCENES: Scene[] = [
  {
    tag: "Design",
    title: "Invitations that feel alive.",
    body: "Shape the mood of your event with invites built to be experienced, not just opened.",
    mode: "warp",
    hue: 0,
    floor: 1,
    dolly: [0.94, 1.06],
  },
  {
    tag: "Share",
    title: "A link your guests remember.",
    body: "Pick a custom slug so your invitation carries your name.",
    mode: "warp",
    hue: -40,
    floor: 0,
    dolly: [1, 1.12],
  },
  {
    tag: "Create",
    title: "Ideas, right where you work.",
    body: "Get fresh suggestions for colours and wording as you build. Keep the ones you love, skip the rest.",
    mode: "net",
    hue: -100,
    floor: 0,
    dolly: [1.08, 0.96],
  },
  {
    tag: "Plans",
    title: "Pay for the size of your event.",
    body: "Flexible plans, with no paying for extras you never use.",
    mode: "rise",
    hue: -225,
    floor: 1,
    dolly: [0.94, 1.04],
  },
  {
    tag: "Begin",
    title: "Your event deserves a digital masterpiece.",
    body: "Create your account and start designing.",
    mode: "warp",
    hue: -360,
    floor: 0.9,
    dolly: [1.1, 0.98],
  },
];

const GRAIN =
  "url(\"data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='200' height='200'><filter id='n'><feTurbulence type='fractalNoise' baseFrequency='.85' numOctaves='2' stitchTiles='stitch'/></filter><rect width='100%' height='100%' filter='url(%23n)' opacity='.55'/></svg>\")";

/* All looping motion is CSS (GPU, no JS per frame). Disabled for reduced motion. */
const CSS = `
@keyframes ri-spin-y{to{transform:rotateY(360deg)}}
@keyframes ri-spin-x{to{transform:rotateX(360deg)}}
@keyframes ri-spin-z{to{transform:rotateZ(360deg)}}
@keyframes ri-cube{from{transform:rotateX(-22deg) rotateY(0)}to{transform:rotateX(-22deg) rotateY(360deg)}}
@keyframes ri-float{0%,100%{transform:translateY(0)}50%{transform:translateY(-16px)}}
@keyframes ri-tunnel{0%{transform:translateZ(-1600px);opacity:0}14%{opacity:1}82%{opacity:1}100%{transform:translateZ(340px);opacity:0}}
@keyframes ri-gridmove{from{transform:translateY(0)}to{transform:translateY(72px)}}
@keyframes ri-grow{from{transform:scaleY(0)}to{transform:scaleY(1)}}
@keyframes ri-pulse{0%,100%{opacity:.55;transform:scale(.92)}50%{opacity:1;transform:scale(1.12)}}
@keyframes ri-glow{0%,100%{opacity:.4}50%{opacity:1}}
@keyframes ri-grain{0%{transform:translate(0,0)}20%{transform:translate(-3%,2%)}40%{transform:translate(2%,-3%)}60%{transform:translate(-2%,-1%)}80%{transform:translate(3%,3%)}100%{transform:translate(0,0)}}
@keyframes ri-streak{from{transform:translateX(-70%)}to{transform:translateX(260%)}}
@keyframes ri-bokeh{0%,100%{transform:translate3d(0,0,0) scale(1);opacity:.22}50%{transform:translate3d(26px,-38px,0) scale(1.18);opacity:.5}}
@keyframes ri-twinkle{0%,100%{opacity:.15;transform:scale(.5) rotate(0)}50%{opacity:1;transform:scale(1.1) rotate(45deg)}}
.ri-a-spin-y{animation:ri-spin-y 18s linear infinite}
.ri-a-spin-x{animation:ri-spin-x 18s linear infinite}
.ri-a-spin-z{animation:ri-spin-z 24s linear infinite}
.ri-a-cube{animation:ri-cube 16s linear infinite}
.ri-a-float{animation:ri-float 6s ease-in-out infinite}
.ri-a-tunnel{animation:ri-tunnel 9.9s linear infinite}
.ri-a-gridmove{animation:ri-gridmove 2.4s linear infinite}
.ri-a-grow{animation:ri-grow 1.5s cubic-bezier(.16,1,.3,1) both}
.ri-a-pulse{animation:ri-pulse 4.5s ease-in-out infinite}
.ri-a-glow{animation:ri-glow 3.2s ease-in-out infinite}
.ri-a-grain{animation:ri-grain .8s steps(6) infinite}
.ri-a-streak{animation:ri-streak 9s ease-in-out 2s infinite}
.ri-a-bokeh{animation:ri-bokeh 12s ease-in-out infinite}
.ri-a-twinkle{animation:ri-twinkle 3.4s ease-in-out infinite}
@media (prefers-reduced-motion:reduce){[class*="ri-a-"]{animation:none!important}}
`;

type Pointer = { x: number; y: number; on: boolean };
type Cam = { rx: MotionValue<number>; ry: MotionValue<number> };

/* ------------------------------------------------------------------ */
/* Canvas particles                                                    */
/* ------------------------------------------------------------------ */
function Particles({
  mode,
  boost,
  pointer,
  reduce,
}: {
  mode: Mode;
  boost: React.MutableRefObject<number>;
  pointer: React.MutableRefObject<Pointer>;
  reduce: boolean;
}) {
  const ref = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = ref.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const DEPTH = 1600;
    const FOCAL = 520;
    let w = 0;
    let h = 0;
    let raf = 0;
    let last = performance.now();
    const cam = { x: 0, y: 0 };

    const spawnWarp = (far: boolean) => ({
      x: (Math.random() - 0.5) * 2400,
      y: (Math.random() - 0.5) * 1600,
      z: far ? DEPTH : Math.random() * DEPTH,
      hue: 20 + Math.random() * 28,
      s: 0.5 + Math.random() * 1.3,
    });
    const warp = mode === "warp" ? Array.from({ length: 340 }, () => spawnWarp(false)) : [];
    const rise =
      mode === "rise"
        ? Array.from({ length: 130 }, () => ({
            x: Math.random(),
            y: Math.random(),
            v: 0.25 + Math.random() * 0.9,
            r: 0.8 + Math.random() * 2.6,
            ph: Math.random() * 6.28,
            hue: 18 + Math.random() * 30,
          }))
        : [];
    const net =
      mode === "net"
        ? Array.from({ length: 62 }, () => ({
            x: Math.random(),
            y: Math.random(),
            vx: (Math.random() - 0.5) * 0.0009,
            vy: (Math.random() - 0.5) * 0.0009,
            r: 1 + Math.random() * 1.8,
          }))
        : [];

    const frame = (now: number) => {
      const dt = Math.min((now - last) / 16.67, 3);
      last = now;
      boost.current += (1 - boost.current) * 0.035 * dt;
      const { x: px, y: py, on } = pointer.current;

      ctx.clearRect(0, 0, w, h);
      ctx.globalCompositeOperation = "lighter";
      ctx.lineCap = "round";

      if (mode === "warp") {
        cam.x += (px * 220 - cam.x) * 0.04 * dt;
        cam.y += (py * 140 - cam.y) * 0.04 * dt;
        const speed = reduce ? 0 : 2.4 * boost.current * dt;
        for (const p of warp) {
          p.z -= speed;
          if (p.z < 30) Object.assign(p, spawnWarp(true));
          const k = FOCAL / p.z;
          const x = w / 2 + (p.x - cam.x) * k;
          const y = h / 2 + (p.y - cam.y) * k;
          const tail = Math.max(speed * 5, 2);
          const k2 = FOCAL / (p.z + tail);
          const x2 = w / 2 + (p.x - cam.x) * k2;
          const y2 = h / 2 + (p.y - cam.y) * k2;
          if (x < -60 || x > w + 60 || y < -60 || y > h + 60) continue;
          const depth = 1 - p.z / DEPTH;
          ctx.strokeStyle = `hsla(${p.hue},100%,${55 + depth * 25}%,${Math.min(1, depth * 1.25)})`;
          ctx.lineWidth = Math.min(3, Math.max(0.4, p.s * k * 1.6));
          ctx.beginPath();
          ctx.moveTo(x2, y2);
          ctx.lineTo(x, y);
          ctx.stroke();
        }
      } else if (mode === "rise") {
        for (const p of rise) {
          if (!reduce) {
            p.y -= p.v * 0.004 * dt;
            p.ph += 0.02 * dt;
            if (p.y < -0.05) {
              p.y = 1.05;
              p.x = Math.random();
            }
          }
          const x = (p.x + Math.sin(p.ph) * 0.015 + px * 0.01) * w;
          const y = p.y * h;
          const a = (0.35 + 0.65 * Math.abs(Math.sin(p.ph * 1.7))) * Math.min(1, Math.max(0, p.y * 3));
          ctx.fillStyle = `hsla(${p.hue},100%,60%,${a * 0.18})`;
          ctx.beginPath();
          ctx.arc(x, y, p.r * 4, 0, 6.283);
          ctx.fill();
          ctx.fillStyle = `hsla(${p.hue},100%,75%,${a})`;
          ctx.beginPath();
          ctx.arc(x, y, p.r, 0, 6.283);
          ctx.fill();
        }
      } else {
        const R = 150;
        for (const a of net) {
          if (!reduce) {
            a.x += a.vx * dt;
            a.y += a.vy * dt;
            if (a.x < 0 || a.x > 1) a.vx *= -1;
            if (a.y < 0 || a.y > 1) a.vy *= -1;
            if (on) {
              a.x += ((px + 1) / 2 - a.x) * 0.0008 * dt;
              a.y += ((py + 1) / 2 - a.y) * 0.0008 * dt;
            }
          }
        }
        ctx.lineWidth = 1;
        for (let i = 0; i < net.length; i++) {
          for (let j = i + 1; j < net.length; j++) {
            const dx = (net[i].x - net[j].x) * w;
            const dy = (net[i].y - net[j].y) * h;
            const d = Math.hypot(dx, dy);
            if (d < R) {
              ctx.strokeStyle = `hsla(32,100%,68%,${(1 - d / R) * 0.55})`;
              ctx.beginPath();
              ctx.moveTo(net[i].x * w, net[i].y * h);
              ctx.lineTo(net[j].x * w, net[j].y * h);
              ctx.stroke();
            }
          }
        }
        for (const a of net) {
          ctx.fillStyle = "hsla(36,100%,76%,0.95)";
          ctx.beginPath();
          ctx.arc(a.x * w, a.y * h, a.r, 0, 6.283);
          ctx.fill();
        }
      }

      if (!reduce) raf = requestAnimationFrame(frame);
    };

    const resize = () => {
      const r = canvas.getBoundingClientRect();
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      w = r.width;
      h = r.height;
      canvas.width = w * dpr;
      canvas.height = h * dpr;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      if (reduce) frame(performance.now());
    };

    const ro = new ResizeObserver(resize);
    ro.observe(canvas);
    resize();
    if (!reduce) raf = requestAnimationFrame(frame);

    return () => {
      cancelAnimationFrame(raf);
      ro.disconnect();
    };
  }, [mode, boost, pointer, reduce]);

  return <canvas ref={ref} aria-hidden className="absolute inset-0 h-full w-full" />;
}

/* ------------------------------------------------------------------ */
/* 3D building blocks                                                  */
/* ------------------------------------------------------------------ */
const STAR =
  "[clip-path:polygon(50%_0,62%_38%,100%_50%,62%_62%,50%_100%,38%_62%,0_50%,38%_38%)]";

const faceTransforms = (h: number) => [
  `rotateY(0deg) translateZ(${h}px)`,
  `rotateY(90deg) translateZ(${h}px)`,
  `rotateY(180deg) translateZ(${h}px)`,
  `rotateY(-90deg) translateZ(${h}px)`,
  `rotateX(90deg) translateZ(${h}px)`,
  `rotateX(-90deg) translateZ(${h}px)`,
];

function Cube({
  size,
  faceClass,
  className = "",
  style,
  children,
}: {
  size: number;
  faceClass: string;
  className?: string;
  style?: React.CSSProperties;
  children?: ReactNode;
}) {
  const h = size / 2;
  return (
    <div
      className={`absolute left-1/2 top-1/2 [transform-style:preserve-3d] ${className}`}
      style={{ width: size, height: size, marginLeft: -h, marginTop: -h, ...style }}
    >
      {faceTransforms(h).map((t, i) => (
        <div key={i} className={`absolute inset-0 ${faceClass}`} style={{ transform: t }} />
      ))}
      {children}
    </div>
  );
}

function Dot() {
  return (
    <span className="absolute -top-[5px] left-1/2 -ml-[5px] h-2.5 w-2.5 rounded-full bg-orange-200 shadow-[0_0_14px_5px_rgba(253,186,116,0.9)]" />
  );
}

function Ring({
  size,
  tilt,
  dur,
  dashed,
  rev,
  alpha = 0.7,
}: {
  size: number;
  tilt: string;
  dur: number;
  dashed?: boolean;
  rev?: boolean;
  alpha?: number;
}) {
  return (
    <div
      className="absolute left-1/2 top-1/2 [transform-style:preserve-3d]"
      style={{ width: size, height: size, marginLeft: -size / 2, marginTop: -size / 2, transform: tilt }}
    >
      <div
        className={`ri-a-spin-z relative h-full w-full rounded-full border-2 ${dashed ? "border-dashed" : ""}`}
        style={{
          animationDuration: `${dur}s`,
          animationDirection: rev ? "reverse" : "normal",
          borderColor: `rgba(253,186,116,${alpha})`,
          boxShadow: "0 0 26px rgba(249,115,22,.35), inset 0 0 26px rgba(249,115,22,.25)",
        }}
      >
        <Dot />
      </div>
    </div>
  );
}

function Shot({ rx, ry, children }: Cam & { children: ReactNode }) {
  return (
    <motion.div
      className="absolute inset-0 [perspective:1100px]"
      initial={{ opacity: 0, scale: 0.88 }}
      animate={{ opacity: 1, scale: 1, transition: { duration: 1.1, ease: [0.16, 1, 0.3, 1] } }}
      exit={{ opacity: 0, scale: 1.16, transition: { duration: 0.7 } }}
    >
      <motion.div className="absolute inset-0 [transform-style:preserve-3d]" style={{ rotateX: rx, rotateY: ry }}>
        {children}
      </motion.div>
    </motion.div>
  );
}

/* ---------- 1. Prism ---------- */
function Prism(cam: Cam) {
  const GLASS =
    "border border-orange-200/60 bg-gradient-to-br from-orange-300/30 via-orange-500/15 to-orange-700/25 shadow-[inset_0_0_36px_rgba(251,146,60,0.55)]";
  const CORE =
    "border border-white/60 bg-gradient-to-br from-white/90 via-orange-200/80 to-orange-400/70 shadow-[0_0_30px_rgba(255,200,140,0.9)]";
  return (
    <Shot {...cam}>
      <div className="absolute left-1/2 top-1/2 -ml-[170px] -mt-[170px] h-[340px] w-[340px] rounded-full bg-orange-500/30 blur-3xl ri-a-pulse" />
      <Ring size={340} tilt="rotateX(72deg)" dur={22} />
      <Ring size={290} tilt="rotateY(68deg)" dur={30} dashed rev alpha={0.5} />
      <Ring size={410} tilt="rotateX(72deg) rotateY(22deg)" dur={40} alpha={0.35} />

      <div className="ri-a-float absolute inset-0 [transform-style:preserve-3d]" style={{ animationDuration: "7s" }}>
        <Cube size={170} className="ri-a-cube" faceClass={GLASS}>
          <Cube
            size={64}
            faceClass={CORE}
            className="ri-a-spin-y"
            style={{ animationDuration: "8s", animationDirection: "reverse" }}
          />
        </Cube>

        {[0, 1, 2, 3, 4, 5].map((i) => (
          <div
            key={i}
            className="absolute left-1/2 top-1/2 [transform-style:preserve-3d]"
            style={{ transform: `translateY(${(i - 2.5) * 36}px)` }}
          >
            <div
              className="ri-a-spin-y [transform-style:preserve-3d]"
              style={{
                animationDuration: `${12 + i * 3}s`,
                animationDirection: i % 2 ? "reverse" : "normal",
              }}
            >
              <div
                className="absolute h-5 w-5 border border-orange-100/70 bg-gradient-to-br from-orange-200/80 to-orange-500/60 shadow-[0_0_16px_rgba(251,146,60,0.9)]"
                style={{ transform: `translateX(${190 + (i % 3) * 28}px) rotate(45deg)` }}
              />
            </div>
          </div>
        ))}
      </div>

      <div className="absolute bottom-[8%] left-1/2 -ml-[130px] h-10 w-[260px] rounded-full bg-orange-500/50 blur-2xl ri-a-pulse" />
    </Shot>
  );
}

/* ---------- 2. Tunnel ---------- */
function Tunnel(cam: Cam) {
  const FR = 11;
  return (
    <Shot {...cam}>
      <div className="ri-a-spin-z absolute inset-0 [transform-style:preserve-3d]" style={{ animationDuration: "46s" }}>
        {Array.from({ length: FR }).map((_, i) => (
          <div
            key={i}
            className="ri-a-tunnel absolute left-1/2 top-1/2"
            style={{
              width: 440,
              height: 440,
              marginLeft: -220,
              marginTop: -220,
              transform: `translateZ(${-i * 150}px)`,
              animationDuration: `${FR * 0.9}s`,
              animationDelay: `-${i * 0.9}s`,
            }}
          >
            <div
              className="h-full w-full rounded-[22%] border-2"
              style={{
                transform: `rotate(${i * 8}deg)`,
                borderColor: "rgba(253,186,116,0.9)",
                boxShadow: "0 0 30px rgba(249,115,22,.55), inset 0 0 30px rgba(249,115,22,.35)",
              }}
            />
          </div>
        ))}
      </div>
      <div className="absolute left-1/2 top-1/2 [transform-style:preserve-3d]" style={{ transform: "translateZ(-80px)" }}>
        <div className="ri-a-pulse absolute -left-[60px] -top-[60px] h-[120px] w-[120px] rounded-full bg-[radial-gradient(circle,#fff7ed_0%,#fb923c_40%,transparent_70%)] shadow-[0_0_80px_20px_rgba(249,115,22,0.6)]" />
      </div>
    </Shot>
  );
}

/* ---------- 3. Gyroscope ---------- */
const SPARKS = [
  { l: 8, t: 14, z: 120, s: 22, d: 0 },
  { l: 88, t: 20, z: -60, s: 16, d: 0.8 },
  { l: 18, t: 78, z: 90, s: 14, d: 1.4 },
  { l: 82, t: 74, z: 140, s: 24, d: 0.3 },
  { l: 50, t: 4, z: -120, s: 12, d: 2 },
  { l: 4, t: 48, z: -40, s: 12, d: 1.1 },
  { l: 94, t: 50, z: 60, s: 14, d: 1.8 },
  { l: 36, t: 92, z: -80, s: 12, d: 0.5 },
];

function Gyro(cam: Cam) {
  const ring = "absolute inset-0 rounded-full border-2";
  const glow = "0 0 26px rgba(249,115,22,.4), inset 0 0 26px rgba(249,115,22,.25)";
  return (
    <Shot {...cam}>
      <div className="absolute left-1/2 top-1/2 -ml-[180px] -mt-[180px] h-[360px] w-[360px] rounded-full bg-orange-500/25 blur-3xl ri-a-pulse" />

      <div
        className="ri-a-spin-x absolute left-1/2 top-1/2 -ml-[200px] -mt-[200px] h-[400px] w-[400px] [transform-style:preserve-3d]"
        style={{ animationDuration: "15s" }}
      >
        <div className={ring} style={{ borderColor: "rgba(253,186,116,.85)", boxShadow: glow }}>
          <Dot />
        </div>
        <div
          className="ri-a-spin-y absolute left-1/2 top-1/2 -ml-[155px] -mt-[155px] h-[310px] w-[310px] [transform-style:preserve-3d]"
          style={{ animationDuration: "11s" }}
        >
          <div className={`${ring} border-dashed`} style={{ borderColor: "rgba(253,186,116,.7)", boxShadow: glow }}>
            <Dot />
          </div>
          <div
            className="ri-a-spin-x absolute left-1/2 top-1/2 -ml-[110px] -mt-[110px] h-[220px] w-[220px] [transform-style:preserve-3d]"
            style={{ animationDuration: "7s", animationDirection: "reverse" }}
          >
            <div className={ring} style={{ borderColor: "rgba(255,237,213,.9)", boxShadow: glow }}>
              <Dot />
            </div>
          </div>
        </div>
      </div>

      <div className="ri-a-pulse absolute left-1/2 top-1/2 -ml-[34px] -mt-[34px] h-[68px] w-[68px] rounded-full bg-[radial-gradient(circle_at_35%_30%,#fff7ed,#fb923c_42%,#9a3412_100%)] shadow-[0_0_60px_14px_rgba(249,115,22,0.7)]" />

      {SPARKS.map((s, i) => (
        <div
          key={i}
          className="absolute"
          style={{ left: `${s.l}%`, top: `${s.t}%`, transform: `translateZ(${s.z}px)` }}
        >
          <div
            className={`ri-a-twinkle bg-orange-100 ${STAR}`}
            style={{ width: s.s, height: s.s, animationDelay: `${s.d}s` }}
          />
        </div>
      ))}
    </Shot>
  );
}

/* ---------- 4. Pillars ---------- */
function Pillar({ x, h, i }: { x: number; h: number; i: number }) {
  const W = 88;
  const hw = W / 2;
  const lit = 0.5 + i * 0.16;
  const base = "absolute inset-0 border border-orange-200/40";
  return (
    <div
      className="ri-a-grow absolute bottom-0 [transform-style:preserve-3d]"
      style={{ left: x - hw, width: W, height: h, transformOrigin: "50% 100%", animationDelay: `${0.25 + i * 0.3}s` }}
    >
      <div
        className={`${base} flex items-start justify-center pt-3 font-[family-name:var(--font-display)] text-lg font-extrabold text-white/90`}
        style={{
          transform: `translateZ(${hw}px)`,
          background: `linear-gradient(to top, rgba(154,52,18,.92), rgba(251,146,60,${lit}))`,
          boxShadow: "inset 0 0 30px rgba(255,200,140,.25)",
        }}
      >
        {["I", "II", "III"][i]}
      </div>
      <div
        className={base}
        style={{ transform: `rotateY(180deg) translateZ(${hw}px)`, background: "linear-gradient(to top,#4a1d08,#9a3412)" }}
      />
      <div
        className={base}
        style={{ transform: `rotateY(-90deg) translateZ(${hw}px)`, background: "linear-gradient(to top,#5a220a,#c2410c)" }}
      />
      <div
        className={base}
        style={{ transform: `rotateY(90deg) translateZ(${hw}px)`, background: "linear-gradient(to top,#7c2d12,#ea580c)" }}
      />
      <div
        className="absolute left-0 border border-orange-100/60"
        style={{
          top: -hw,
          width: W,
          height: W,
          transform: "rotateX(90deg)",
          background: "radial-gradient(circle,#fff7ed,#fdba74 60%,#fb923c)",
          boxShadow: "0 0 40px rgba(253,186,116,.8)",
        }}
      />
    </div>
  );
}

function Pillars(cam: Cam) {
  const items = [
    { x: -135, h: 110 },
    { x: 0, h: 190 },
    { x: 135, h: 280 },
  ];
  return (
    <Shot {...cam}>
      <div className="absolute left-1/2 top-[86%] h-0 w-0 [transform-style:preserve-3d]">
        <div className="absolute left-0 top-0 h-0 w-0 [transform-style:preserve-3d]" style={{ transform: "rotateY(-32deg)" }}>
          <div
            className="absolute left-0 top-0 h-[560px] w-[560px] rounded-full border border-orange-300/50 bg-[radial-gradient(circle,rgba(251,146,60,0.4),transparent_66%)]"
            style={{ marginLeft: -280, marginTop: -280, transform: "rotateX(90deg)" }}
          />
          <div
            className="absolute left-0 top-0 h-[360px] w-[360px] rounded-full border border-dashed border-orange-200/40"
            style={{ marginLeft: -180, marginTop: -180, transform: "rotateX(90deg)" }}
          />
          {items.map((p, i) => (
            <Pillar key={i} x={p.x} h={p.h} i={i} />
          ))}
          {[0, 1, 2].map((i) => (
            <div
              key={i}
              className="absolute"
              style={{ left: 135 - 40 + i * 30 - 20, bottom: 330 + i * 24, transform: `translateZ(${i * 20}px)` }}
            >
              <div
                className={`ri-a-twinkle bg-orange-100 ${STAR}`}
                style={{ width: 16 - i * 3, height: 16 - i * 3, animationDelay: `${1.8 + i * 0.5}s`, animationFillMode: "backwards" }}
              />
            </div>
          ))}
        </div>
      </div>
    </Shot>
  );
}

/* ---------- 5. Gateway ---------- */
function Gate(cam: Cam) {
  const ARCH = 6;
  return (
    <Shot {...cam}>
      <div className="absolute left-1/2 top-[46%] h-0 w-0 [transform-style:preserve-3d]" style={{ transform: "translateZ(-320px)" }}>
        <div
          className="ri-a-spin-z absolute -left-[400px] -top-[400px] h-[800px] w-[800px] rounded-full"
          style={{
            animationDuration: "70s",
            background:
              "repeating-conic-gradient(from 0deg, rgba(251,146,60,.38) 0deg 5deg, transparent 5deg 18deg)",
            maskImage: "radial-gradient(circle, #000 0%, transparent 66%)",
            WebkitMaskImage: "radial-gradient(circle, #000 0%, transparent 66%)",
          }}
        />
      </div>

      {Array.from({ length: ARCH }).map((_, i) => {
        const w = 330 - i * 36;
        const hh = 390 - i * 32;
        const last = i === ARCH - 1;
        return (
          <div
            key={i}
            className="absolute bottom-[14%] left-1/2"
            style={{ width: w, height: hh, marginLeft: -w / 2, transform: `translateZ(${-i * 58}px)` }}
          >
            <div
              className="ri-a-glow h-full w-full rounded-t-full border-2 border-b-0"
              style={{
                animationDelay: `${i * 0.25}s`,
                borderColor: `rgba(253,186,116,${0.95 - i * 0.1})`,
                background: last
                  ? "linear-gradient(to top, rgba(255,237,213,.95), rgba(251,146,60,.55) 60%, transparent)"
                  : "transparent",
                boxShadow: "0 0 40px rgba(249,115,22,.5), inset 0 0 40px rgba(249,115,22,.3)",
              }}
            />
          </div>
        );
      })}

      <div
        className="absolute left-1/2 top-[44%] -ml-[44px] -mt-[44px] [transform-style:preserve-3d]"
        style={{ transform: "translateZ(40px)" }}
      >
        <div className="ri-a-float" style={{ animationDuration: "5s" }}>
          <Image
            src="/logo.png"
            alt=""
            width={88}
            height={88}
            priority
            className="drop-shadow-[0_0_34px_rgba(255,200,140,0.95)]"
          />
        </div>
      </div>

      <div className="absolute bottom-[10%] left-1/2 -ml-[170px] h-10 w-[340px] rounded-full bg-orange-400/50 blur-2xl ri-a-pulse" />
    </Shot>
  );
}

const VISUALS: ComponentType<Cam>[] = [Prism, Tunnel, Gyro, Pillars, Gate];

/* ------------------------------------------------------------------ */
/* Headline                                                            */
/* ------------------------------------------------------------------ */
function Headline({ text, last }: { text: string; last: boolean }) {
  return (
    <h2
      className="font-[family-name:var(--font-display)] text-4xl font-extrabold leading-[1.05] tracking-tight text-white xl:text-5xl [perspective:800px]"
      aria-label={text}
    >
      {text.split(" ").map((word, i) => (
        <span key={i} className="mr-[0.26em] inline-block">
          <motion.span
            aria-hidden
            className={`inline-block ${
              last && i >= 3
                ? "bg-gradient-to-r from-orange-300 to-amber-300 bg-clip-text text-transparent"
                : ""
            }`}
            style={{ transformOrigin: "50% 100%" }}
            initial={{ opacity: 0, y: 36, rotateX: -80, filter: "blur(14px)" }}
            animate={{ opacity: 1, y: 0, rotateX: 0, filter: "blur(0px)" }}
            exit={{ opacity: 0, y: -18, filter: "blur(10px)", transition: { duration: 0.3, delay: 0 } }}
            transition={{ duration: 0.9, delay: 0.08 * i, ease: [0.16, 1, 0.3, 1] }}
          >
            {word}
          </motion.span>
        </span>
      ))}
    </h2>
  );
}

const BOKEH = [
  { l: 8, t: 20, s: 120, d: 0 },
  { l: 78, t: 12, s: 90, d: 2 },
  { l: 62, t: 58, s: 160, d: 4 },
  { l: 22, t: 64, s: 80, d: 1 },
  { l: 90, t: 70, s: 110, d: 3 },
  { l: 44, t: 8, s: 70, d: 5 },
  { l: 4, t: 88, s: 100, d: 2.5 },
];

/* ------------------------------------------------------------------ */
/* Stage (Reusable)                                                    */
/* ------------------------------------------------------------------ */
interface CinematicStageProps {
  scenes?: Scene[];
}

export function CinematicStage({ scenes = DEFAULT_SCENES }: CinematicStageProps) {
  const reduce = useReducedMotion() ?? false;

  // n = total chapters elapsed (monotone, so hue-grade never snaps back)
  const [n, setN] = useState(0);
  const scene = n % scenes.length;
  const loops = Math.floor(n / scenes.length);
  const current = scenes[scene];
  const grade = current.hue - 360 * loops;
  const accentHue = (((24 + current.hue) % 360) + 360) % 360;
  const accent = `hsl(${accentHue} 95% 68%)`;

  const rootRef = useRef<HTMLDivElement>(null);
  const boost = useRef(1);
  const pointer = useRef<Pointer>({ x: 0, y: 0, on: false });

  // camera
  const mx = useMotionValue(0);
  const my = useMotionValue(0);
  const sx = useSpring(mx, { stiffness: 45, damping: 20, mass: 0.8 });
  const sy = useSpring(my, { stiffness: 45, damping: 20, mass: 0.8 });
  const yaw = useMotionValue(0);
  const dolly = useMotionValue(1);
  const ry = useTransform([sx, yaw], ([a, b]: number[]) => a * 12 + b);
  const rx = useTransform(sy, (v) => 10 - v * 8);

  // fit the 3D zone to the available height (transform only -> no layout shift)
  useEffect(() => {
    const el = rootRef.current;
    if (!el) return;
    const ro = new ResizeObserver(() => {
      const k = Math.min(1.1, Math.max(0.45, (el.clientHeight - BAR - ZONE_BOTTOM) / 470));
      el.style.setProperty("--k", String(k));
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  // chapter timer
  useEffect(() => {
    const id = setTimeout(() => setN((v) => v + 1), DUR);
    return () => clearTimeout(id);
  }, [n]);

  // per-chapter camera move + warp burst
  useEffect(() => {
    boost.current = reduce ? 1 : 7;
    if (reduce) {
      yaw.set(0);
      dolly.set(1);
      return;
    }
    const [d0, d1] = scenes[scene].dolly;
    yaw.set(scene % 2 ? 24 : -24);
    dolly.set(d0);
    const a = animate(yaw, scene % 2 ? -8 : 8, { duration: DUR / 1000, ease: [0.22, 1, 0.36, 1] });
    const b = animate(dolly, d1, { duration: DUR / 1000, ease: [0.25, 0.1, 0.25, 1] });
    return () => {
      a.stop();
      b.stop();
    };
  }, [n, scene, reduce, yaw, dolly, scenes]);

  const onMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (e.pointerType === "touch") return;
    const r = rootRef.current?.getBoundingClientRect();
    if (!r) return;
    const x = ((e.clientX - r.left) / r.width - 0.5) * 2;
    const y = ((e.clientY - r.top) / r.height - 0.5) * 2;
    pointer.current = { x, y, on: true };
    mx.set(x);
    my.set(y);
  };
  const onLeave = () => {
    pointer.current = { x: 0, y: 0, on: false };
    mx.set(0);
    my.set(0);
  };

  // Map scene to visual safely, even if scenes array is smaller or larger than VISUALS
  const Visual = VISUALS[scene % VISUALS.length];

  return (
    <div
      ref={rootRef}
      onPointerMove={onMove}
      onPointerLeave={onLeave}
      className="relative hidden h-full w-1/2 overflow-hidden bg-[#0d0603] lg:block"
    >
      <style>{CSS}</style>

      {/* ============ WORLD (colour-graded per chapter) ============ */}
      <div
        className="absolute inset-0"
        style={{
          filter: `hue-rotate(${grade}deg)`,
          transition: reduce ? undefined : "filter 1.8s cubic-bezier(.4,0,.2,1)",
        }}
      >
        <div
          aria-hidden
          className="absolute inset-0 bg-[radial-gradient(70%_55%_at_50%_38%,#5a220a_0%,#1a0b05_55%,#0d0603_100%)]"
        />

        <div className="pointer-events-none absolute inset-0">
          <Particles mode={current.mode} boost={boost} pointer={pointer} reduce={reduce} />
        </div>

        {/* perspective floor */}
        <div
          aria-hidden
          className="pointer-events-none absolute inset-x-0 bottom-0 h-[46%] overflow-hidden transition-opacity duration-1000 [perspective:420px]"
          style={{
            opacity: current.floor,
            maskImage: "linear-gradient(to top, #000 8%, transparent 95%)",
            WebkitMaskImage: "linear-gradient(to top, #000 8%, transparent 95%)",
          }}
        >
          <div className="absolute -inset-x-[70%] bottom-0 h-[220%] origin-bottom [transform:rotateX(72deg)]">
            <div
              className="ri-a-gridmove absolute inset-x-0 -top-[72px] bottom-0"
              style={{
                backgroundImage:
                  "linear-gradient(rgba(251,146,60,0.55) 1.5px, transparent 1.5px), linear-gradient(90deg, rgba(251,146,60,0.55) 1.5px, transparent 1.5px)",
                backgroundSize: "72px 72px",
              }}
            />
          </div>
        </div>
        <div
          aria-hidden
          className="pointer-events-none absolute inset-x-0 top-[54%] h-px bg-gradient-to-r from-transparent via-orange-300/80 to-transparent shadow-[0_0_40px_8px_rgba(251,146,60,0.45)] transition-opacity duration-1000"
          style={{ opacity: current.floor }}
        />

        {/* 3D shot */}
        <div
          className="pointer-events-none absolute inset-x-0 z-10 flex items-center justify-center"
          style={{ top: BAR, bottom: ZONE_BOTTOM }}
        >
          <div className="relative h-[460px] w-[460px]" style={{ transform: "scale(var(--k,1))" }}>
            <motion.div className="absolute inset-0" style={{ scale: dolly }}>
              <AnimatePresence>
                <Visual key={scene} rx={rx} ry={ry} />
              </AnimatePresence>
            </motion.div>
          </div>
        </div>

        {/* bokeh */}
        <div aria-hidden className="pointer-events-none absolute inset-0 z-20">
          {BOKEH.map((b, i) => (
            <span
              key={i}
              className="ri-a-bokeh absolute rounded-full bg-orange-300/40 blur-2xl"
              style={{ left: `${b.l}%`, top: `${b.t}%`, width: b.s, height: b.s, animationDelay: `-${b.d * 2}s` }}
            />
          ))}
        </div>

        {/* anamorphic streak */}
        <div
          aria-hidden
          className="ri-a-streak pointer-events-none absolute left-0 top-[44%] z-20 h-[2px] w-[45%] bg-gradient-to-r from-transparent via-orange-200 to-transparent opacity-70 blur-[1px]"
        />

        {/* chapter flash */}
        <motion.div
          key={`flash-${n}`}
          aria-hidden
          initial={{ opacity: reduce ? 0 : 0.4 }}
          animate={{ opacity: 0 }}
          transition={{ duration: 1.3 }}
          className="pointer-events-none absolute inset-0 z-20 bg-[radial-gradient(circle_at_50%_45%,rgba(255,170,90,0.9),transparent_60%)] mix-blend-screen"
        />
      </div>

      {/* text scrim */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-x-0 bottom-0 z-[15] h-[58%] bg-gradient-to-t from-black/90 via-black/55 to-transparent"
      />

      {/* ============ TITLE CARD (fixed box: zero layout shift) ============ */}
      <div
        className="pointer-events-none absolute inset-x-8 z-20 xl:inset-x-12"
        style={{ bottom: TITLE_BOTTOM, height: TITLE_H }}
      >
        <AnimatePresence mode="wait">
          <motion.span
            key={`num-${scene}`}
            aria-hidden
            initial={{ opacity: 0, x: 24 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, transition: { duration: 0.25 } }}
            transition={{ duration: 0.9, delay: 0.2 }}
            className="absolute right-0 top-0 select-none font-[family-name:var(--font-display)] text-[120px] font-extrabold leading-none text-transparent [-webkit-text-stroke:1px_rgba(255,255,255,0.13)]"
          >
            0{scene + 1}
          </motion.span>
        </AnimatePresence>

        <AnimatePresence mode="wait">
          <motion.div
            key={scene}
            exit={{ opacity: 0, transition: { duration: 0.35 } }}
            className="absolute inset-x-0 bottom-0 max-w-xl"
          >
            <motion.div
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, transition: { duration: 0.2 } }}
              transition={{ duration: 0.6 }}
              className="mb-4 flex items-center gap-3"
            >
              <span className="h-px w-10" style={{ background: `linear-gradient(to right, ${accent}, transparent)` }} />
              <span className="text-[11px] font-extrabold uppercase tracking-[0.35em]" style={{ color: accent }}>
                {current.tag}
              </span>
            </motion.div>

            <Headline text={current.title} last={scene === scenes.length - 1} />

            <motion.p
              initial={{ opacity: 0, y: 14 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, transition: { duration: 0.2 } }}
              transition={{ duration: 0.8, delay: 0.55 }}
              className="mt-4 max-w-md text-sm font-medium leading-relaxed text-white/70"
            >
              {current.body}
            </motion.p>
          </motion.div>
        </AnimatePresence>
      </div>

      {/* ============ FILM LAYER ============ */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 z-30 bg-[radial-gradient(120%_90%_at_50%_45%,transparent_45%,rgba(0,0,0,0.78)_100%)]"
      />
      <div
        aria-hidden
        className="ri-a-grain pointer-events-none absolute -inset-[10%] z-30 opacity-[0.09] mix-blend-overlay"
        style={{ backgroundImage: GRAIN }}
      />

      {/* intro curtains (transform only) */}
      <motion.div
        aria-hidden
        initial={{ y: 0 }}
        animate={{ y: "-100%" }}
        transition={{ duration: 1.5, delay: 0.35, ease: [0.76, 0, 0.24, 1] }}
        className="pointer-events-none absolute inset-x-0 top-0 z-[39] h-1/2 bg-black"
      />
      <motion.div
        aria-hidden
        initial={{ y: 0 }}
        animate={{ y: "100%" }}
        transition={{ duration: 1.5, delay: 0.35, ease: [0.76, 0, 0.24, 1] }}
        className="pointer-events-none absolute inset-x-0 bottom-0 z-[39] h-1/2 bg-black"
      />
      <motion.div
        aria-hidden
        initial={{ opacity: 1, letterSpacing: "0.6em" }}
        animate={{ opacity: 0, letterSpacing: "0.9em" }}
        transition={{ duration: 1.1, delay: 0.5 }}
        className="pointer-events-none absolute inset-0 z-[45] flex items-center justify-center font-[family-name:var(--font-display)] text-sm font-bold uppercase text-white/80"
      >
        Riwainvite
      </motion.div>

      {/* top bar */}
      <div
        className="absolute inset-x-0 top-0 z-40 flex items-center justify-between bg-black px-8 xl:px-12"
        style={{ height: BAR }}
      >
        <Link href="/" className="flex items-center gap-3">
          <Image src="/logo.png" alt="" width={34} height={34} />
          <span className="font-[family-name:var(--font-display)] text-xl font-bold text-white">Riwainvite</span>
        </Link>
        <span className="font-mono text-[11px] font-semibold tabular-nums tracking-[0.25em] text-white/50">
          {String(scene + 1).padStart(2, "0")} / {String(scenes.length).padStart(2, "0")}
        </span>
      </div>

      {/* bottom bar: chapter progress */}
      <div
        className="absolute inset-x-0 bottom-0 z-40 flex items-center gap-2 bg-black px-8 xl:px-12"
        style={{ height: BAR }}
      >
        {scenes.map((s, i) => (
          <button
            key={s.tag}
            type="button"
            aria-label={`Go to ${s.tag}`}
            onClick={() => setN((v) => v - (v % scenes.length) + i)}
            className="group flex h-6 flex-1 items-center"
          >
            <span className="relative block h-[3px] w-full overflow-hidden rounded-full bg-white/15 transition-transform group-hover:scale-y-[1.8]">
              {i < scene && <span className="absolute inset-0" style={{ background: accent }} />}
              {i === scene && (
                <motion.span
                  key={`p-${n}`}
                  className="absolute inset-0 origin-left"
                  style={{ background: accent }}
                  initial={{ scaleX: 0 }}
                  animate={{ scaleX: 1 }}
                  transition={{ duration: DUR / 1000, ease: "linear" }}
                />
              )}
            </span>
          </button>
        ))}
      </div>
    </div>
  );
}