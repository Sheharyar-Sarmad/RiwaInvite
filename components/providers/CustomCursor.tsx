"use client";

import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { usePathname } from "next/navigation";
import {
  motion,
  useMotionValue,
  useMotionTemplate,
  useReducedMotion,
  useSpring,
  useTransform,
  useVelocity,
} from "framer-motion";

/* -------------------------------------------------------------------------- */
/*  Config                                                                    */
/* -------------------------------------------------------------------------- */

const HIDDEN_ROUTES: string[] = ["/preview"];

const CLICKABLE =
  "a, button, [role='button'], [role='tab'], input, select, textarea, label, summary, [data-cursor='pointer']";

const LABELLED = "[data-cursor-label]";

const DOT_SPRING = { damping: 28, stiffness: 700, mass: 0.3 };
const RING_SPRING = { damping: 22, stiffness: 180, mass: 0.8 };
// 🪄 Torch spring: Slower and heavier so the light feels like it's illuminating the room
const TORCH_SPRING = { damping: 30, stiffness: 60, mass: 1.2 }; 

const RING_SIZE = 36;
const DOT_SIZE = 8;
const MAX_PARTICLES = 80;

const ORANGE = "249,115,22";

type Ripple = { id: number; x: number; y: number };

type Particle = {
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  max: number;
  size: number;
  hue: number;
  star: boolean;
  rot: number;
  vr: number;
  tw: number;
  grav: number;
};

function useFinePointer(): boolean {
  const [fine, setFine] = useState(false);
  useEffect(() => {
    const mq = window.matchMedia("(hover: hover) and (pointer: fine)");
    const update = () => setFine(mq.matches);
    update();
    mq.addEventListener("change", update);
    return () => mq.removeEventListener("change", update);
  }, []);
  return fine;
}

/* -------------------------------------------------------------------------- */
/*  Component                                                                 */
/* -------------------------------------------------------------------------- */

export function CustomCursor() {
  const pathname = usePathname();
  const reduce = !!useReducedMotion();
  const finePointer = useFinePointer();
  const hiddenRoute = HIDDEN_ROUTES.some((r) => pathname?.startsWith(r));
  const enabled = finePointer && !hiddenRoute;

  const mouseX = useMotionValue(-1000);
  const mouseY = useMotionValue(-1000);
  
  const ringTX = useMotionValue(-1000);
  const ringTY = useMotionValue(-1000);

  const dotX = useSpring(mouseX, DOT_SPRING);
  const dotY = useSpring(mouseY, DOT_SPRING);
  const ringX = useSpring(ringTX, RING_SPRING);
  const ringY = useSpring(ringTY, RING_SPRING);

  // 🪄 Torch Position (lags slightly behind the mouse for a "heavy" light feel)
  const torchX = useSpring(mouseX, TORCH_SPRING);
  const torchY = useSpring(mouseY, TORCH_SPRING);

  // 🪄 Torch Gradients
  // The outer glow is huge (600px) and very faint
  const outerTorch = useMotionTemplate`radial-gradient(600px circle at ${torchX}px ${torchY}px, rgba(${ORANGE},0.08), transparent 60%)`;
  // The inner core is smaller (200px) and brighter
  const innerTorch = useMotionTemplate`radial-gradient(200px circle at ${torchX}px ${torchY}px, rgba(255,255,255,0.08), transparent 70%)`;

  // Squash & stretch
  const rvx = useVelocity(ringX);
  const rvy = useVelocity(ringY);
  const lastAngle = useRef(0);
  const stretch = useTransform([rvx, rvy], (v: number[]) =>
    1 + Math.min(Math.hypot(v[0], v[1]) / 5200, 0.35),
  );
  const squash = useTransform(stretch, (s) => 1 - (s - 1) * 0.55);
  const angle = useTransform([rvx, rvy], (v: number[]) => {
    if (Math.hypot(v[0], v[1]) > 80) lastAngle.current = (Math.atan2(v[1], v[0]) * 180) / Math.PI;
    return lastAngle.current;
  });

  const [visible, setVisible] = useState(false);
  const [hovering, setHovering] = useState(false);
  const [pressed, setPressed] = useState(false);
  const [label, setLabel] = useState("");
  const [ripples, setRipples] = useState<Ripple[]>([]);

  const canvasRef = useRef<HTMLCanvasElement>(null);
  const shown = useRef(false);
  const rippleId = useRef(0);
  const lastLabel = useRef("");
  if (label) lastLabel.current = label;

  useEffect(() => {
    const root = document.documentElement;

    if (!enabled) {
      root.classList.remove("has-fairy-cursor");
      shown.current = false;
      setVisible(false);
      setHovering(false);
      setPressed(false);
      setLabel("");
      setRipples([]);
      return;
    }

    root.classList.add("has-fairy-cursor");

    /* ---------------- sparkle trail ---------------- */
    const particles: Particle[] = [];
    const canvas = canvasRef.current;
    const ctx = !reduce && canvas ? canvas.getContext("2d") : null;
    let raf = 0;
    let lastT = performance.now();
    const last = { x: -1000, y: -1000 };
    let magnet: HTMLElement | null = null;

    const resize = () => {
      if (!canvas || !ctx) return;
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      canvas.width = window.innerWidth * dpr;
      canvas.height = window.innerHeight * dpr;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    };
    resize();
    window.addEventListener("resize", resize);

    const spawn = (x: number, y: number, o: Partial<Particle> = {}) => {
      if (!ctx) return;
      if (particles.length >= MAX_PARTICLES) particles.shift();
      const a = Math.random() * Math.PI * 2;
      const s = Math.random() * 0.5;
      particles.push({
        x, y,
        vx: Math.cos(a) * s,
        vy: Math.sin(a) * s - 0.1,
        life: 0,
        max: 32 + Math.random() * 28,
        size: 1.2 + Math.random() * 1.8,
        hue: 18 + Math.random() * 26,
        star: Math.random() < 0.6,
        rot: Math.random() * Math.PI,
        vr: (Math.random() - 0.5) * 0.1,
        tw: Math.random() * 6,
        grav: 0.02,
        ...o,
      });
    };

    const burst = (x: number, y: number) => {
      const n = 16;
      for (let i = 0; i < n; i++) {
        const a = (i / n) * Math.PI * 2 + Math.random() * 0.3;
        const s = 1.5 + Math.random() * 3.5;
        spawn(x, y, {
          vx: Math.cos(a) * s,
          vy: Math.sin(a) * s - 0.6,
          size: 1.6 + Math.random() * 2,
          max: 38 + Math.random() * 22,
          grav: 0.05,
        });
      }
    };

    const drawStar = (r: number) => {
      if (!ctx) return;
      ctx.beginPath();
      ctx.moveTo(0, -r);
      ctx.quadraticCurveTo(0, 0, r, 0);
      ctx.quadraticCurveTo(0, 0, 0, r);
      ctx.quadraticCurveTo(0, 0, -r, 0);
      ctx.quadraticCurveTo(0, 0, 0, -r);
      ctx.fill();
    };

    const tick = (now: number) => {
      raf = requestAnimationFrame(tick);
      if (!ctx) return;
      const dt = Math.min(40, now - lastT) / 16.67;
      lastT = now;

      ctx.clearRect(0, 0, window.innerWidth, window.innerHeight);

      for (let i = particles.length - 1; i >= 0; i--) {
        const p = particles[i];
        p.life += dt;
        if (p.life >= p.max) {
          particles.splice(i, 1);
          continue;
        }
        p.vx *= 0.98;
        p.vy = p.vy * 0.98 + p.grav * dt;
        p.x += p.vx * dt;
        p.y += p.vy * dt;
        p.rot += p.vr * dt;

        const k = 1 - p.life / p.max;
        const twinkle = 0.7 + 0.3 * Math.sin(p.life * 0.3 + p.tw);
        ctx.save();
        ctx.translate(p.x, p.y);
        ctx.globalAlpha = Math.min(1, k * 1.5) * twinkle;
        ctx.fillStyle = `hsl(${p.hue} 95% 60%)`;
        ctx.shadowColor = `hsl(${p.hue} 95% 60% / 0.8)`;
        ctx.shadowBlur = 8;
        if (p.star) {
          ctx.rotate(p.rot);
          drawStar(p.size * (1 + k) * 1.8);
          ctx.shadowBlur = 0;
          ctx.fillStyle = "#fff7ed";
          drawStar(p.size * 0.7);
        } else {
          ctx.beginPath();
          ctx.arc(0, 0, p.size * (0.5 + k * 0.5), 0, Math.PI * 2);
          ctx.fill();
        }
        ctx.restore();
      }
    };
    raf = requestAnimationFrame(tick);

    /* ---------------- ring magnetism ---------------- */
    const aimRing = (x: number, y: number) => {
      if (magnet && magnet.isConnected) {
        const r = magnet.getBoundingClientRect();
        ringTX.set(x + (r.left + r.width / 2 - x) * 0.35);
        ringTY.set(y + (r.top + r.height / 2 - y) * 0.35);
      } else {
        ringTX.set(x);
        ringTY.set(y);
      }
    };

    /* ---------------- listeners ---------------- */
    const onMove = (e: PointerEvent) => {
      if (e.pointerType !== "mouse") {
        shown.current = false;
        setVisible(false);
        return;
      }
      const { clientX: x, clientY: y } = e;
      mouseX.set(x);
      mouseY.set(y);
      aimRing(x, y);

      if (!shown.current) {
        shown.current = true;
        last.x = x;
        last.y = y;
        dotX.jump(x);
        dotY.jump(y);
        ringX.jump(ringTX.get());
        ringY.jump(ringTY.get());
        // 🪄 Jump the torch to the mouse so it doesn't fly across the screen on first load
        torchX.jump(x);
        torchY.jump(y);
        setVisible(true);
        return;
      }

      const dx = x - last.x;
      const dy = y - last.y;
      const dist = Math.hypot(dx, dy);
      if (dist >= 14) {
        spawn(x - dx * 0.2, y - dy * 0.2, {
          vx: -dx * 0.015 + (Math.random() - 0.5) * 0.6,
          vy: -dy * 0.015 + (Math.random() - 0.5) * 0.6,
        });
        last.x = x;
        last.y = y;
      }
    };

    const onOver = (e: MouseEvent) => {
      const t = e.target;
      if (!(t instanceof Element)) return;
      const clickable = t.closest<HTMLElement>(CLICKABLE);
      setHovering(!!clickable);
      setLabel(t.closest<HTMLElement>(LABELLED)?.dataset.cursorLabel ?? "");

      magnet = null;
      if (clickable) {
        const r = clickable.getBoundingClientRect();
        if (r.width < 360 && r.height < 120) magnet = clickable;
      }
      aimRing(mouseX.get(), mouseY.get());
    };

    const onDown = (e: PointerEvent) => {
      if (e.pointerType !== "mouse") return;
      setPressed(true);
      if (reduce) return;
      burst(e.clientX, e.clientY);
      const id = ++rippleId.current;
      setRipples((r) => [...r.slice(-3), { id, x: e.clientX, y: e.clientY }]);
    };

    const onUp = () => setPressed(false);

    const onLeaveWindow = () => {
      shown.current = false;
      setVisible(false);
      setPressed(false);
    };

    const capture = { capture: true } as const;
    const passiveCapture = { passive: true, capture: true } as const;

    window.addEventListener("pointermove", onMove, passiveCapture);
    window.addEventListener("pointerdown", onDown, passiveCapture);
    window.addEventListener("pointerup", onUp, passiveCapture);
    window.addEventListener("pointercancel", onUp, passiveCapture);
    window.addEventListener("blur", onUp);
    document.addEventListener("mouseover", onOver, capture);
    document.documentElement.addEventListener("mouseleave", onLeaveWindow);

    return () => {
      cancelAnimationFrame(raf);
      root.classList.remove("has-fairy-cursor");
      window.removeEventListener("resize", resize);
      window.removeEventListener("pointermove", onMove, passiveCapture);
      window.removeEventListener("pointerdown", onDown, passiveCapture);
      window.removeEventListener("pointerup", onUp, passiveCapture);
      window.removeEventListener("pointercancel", onUp, passiveCapture);
      window.removeEventListener("blur", onUp);
      document.removeEventListener("mouseover", onOver, capture);
      document.documentElement.removeEventListener("mouseleave", onLeaveWindow);
    };
  }, [enabled, reduce, mouseX, mouseY, ringTX, ringTY, dotX, dotY, ringX, ringY, torchX, torchY]);

  if (!enabled) return null;

  const dx = reduce ? mouseX : dotX;
  const dy = reduce ? mouseY : dotY;
  const rx = reduce ? ringTX : ringX;
  const ry = reduce ? ringTY : ringY;

  const hasLabel = label !== "";
  const springy = reduce ? { duration: 0 } : { type: "spring" as const, stiffness: 280, damping: 22 };

  const ringAnimate = pressed
    ? { scale: 0.78, backgroundColor: `rgba(${ORANGE},0.22)`, borderColor: `rgba(${ORANGE},0.95)` }
    : hasLabel
    ? { scale: 1.3, backgroundColor: `rgba(${ORANGE},0.1)`, borderColor: `rgba(${ORANGE},0.55)` }
    : hovering
    ? { scale: 1.6, backgroundColor: `rgba(${ORANGE},0.14)`, borderColor: `rgba(${ORANGE},0.85)` }
    : { scale: 1, backgroundColor: `rgba(${ORANGE},0)`, borderColor: `rgba(${ORANGE},0.55)` };

  return createPortal(
    <div aria-hidden className="pointer-events-none fixed inset-0 z-[2147483647]">
      
      {/* 🪄 TORCH / SPOTLIGHT EFFECT */}
      {/* We use mix-blend-soft-light so it feels like actual light hitting the page, not just a colored circle */}
      <motion.div
        className="absolute inset-0 z-0 mix-blend-soft-light"
        style={{ background: outerTorch }}
      />
      <motion.div
        className="absolute inset-0 z-0 mix-blend-overlay"
        style={{ background: innerTorch }}
      />

      {/* Sparkle trail */}
      {!reduce && <canvas ref={canvasRef} className="absolute inset-0 z-10 h-full w-full" />}

      {/* Click ripples: one soft orange ring */}
      {ripples.map((r) => (
        <motion.span
          key={r.id}
          className="absolute left-0 top-0 z-20 rounded-full border-2 border-orange-500/70"
          style={{ x: r.x, y: r.y, width: 40, height: 40, marginLeft: -20, marginTop: -20 }}
          initial={{ scale: 0.3, opacity: 0.8 }}
          animate={{ scale: 2.8, opacity: 0 }}
          transition={{ duration: 0.7, ease: [0.16, 1, 0.3, 1] }}
          onAnimationComplete={() => setRipples((list) => list.filter((x) => x.id !== r.id))}
        />
      ))}

      {/* Ring (and label) */}
      <motion.div
        className="absolute left-0 top-0 z-20"
        style={{ x: rx, y: ry, width: RING_SIZE, height: RING_SIZE, marginLeft: -RING_SIZE / 2, marginTop: -RING_SIZE / 2 }}
      >
        <motion.div
          className="h-full w-full"
          style={reduce ? undefined : { rotate: angle, scaleX: stretch, scaleY: squash }}
        >
          <motion.div
            initial={false}
            animate={{ ...ringAnimate, opacity: visible ? 1 : 0 }}
            transition={springy}
            className="h-full w-full rounded-full border-[1.5px] shadow-[0_0_24px_rgba(249,115,22,0.4),inset_0_0_0_1px_rgba(255,255,255,0.6)] backdrop-blur-[2px]"
          />
        </motion.div>

        <motion.span
          initial={false}
          animate={{ opacity: visible && hasLabel ? 1 : 0, scale: hasLabel ? 1 : 0.85, x: hasLabel ? 0 : -6 }}
          transition={springy}
          className="absolute left-[34px] top-[22px] whitespace-nowrap rounded-full bg-gradient-to-b from-orange-400 to-orange-600 px-3 py-1 font-[family-name:var(--font-body)] text-xs font-semibold text-white shadow-[0_6px_16px_rgba(249,115,22,0.35)]"
        >
          {label || lastLabel.current}
        </motion.span>
      </motion.div>

      {/* Dot: sits on the pointer */}
      <motion.div
        className="absolute left-0 top-0 z-20"
        style={{ x: dx, y: dy, width: DOT_SIZE, height: DOT_SIZE, marginLeft: -DOT_SIZE / 2, marginTop: -DOT_SIZE / 2 }}
      >
        <motion.div
          initial={false}
          animate={{
            opacity: visible && !hovering && !hasLabel ? 1 : 0,
            scale: pressed ? 0.5 : 1,
          }}
          transition={springy}
          className="h-full w-full rounded-full bg-orange-500 shadow-[0_0_14px_3px_rgba(249,115,22,0.7)] ring-1 ring-white/90"
        />
      </motion.div>
    </div>,
    document.body,
  );
}