"use client";

import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { usePathname } from "next/navigation";
import { motion, useMotionValue, useReducedMotion, useSpring } from "framer-motion";

/* Lite cursor: dot + ring + soft glow + I-beam + click ripple + tiny on-demand sparkles.
   No blend modes, no backdrop blur, no always-on animation loop. */

const HIDDEN_ROUTES: string[] = ["/preview"];

const CLICKABLE =
  "a, button, [role='button'], [role='tab'], input, select, textarea, label, summary, [data-cursor='pointer']";
const TEXTY =
  "input:not([type='checkbox']):not([type='radio']):not([type='range']):not([type='button']):not([type='submit']):not([type='color']):not([type='file']), textarea, [contenteditable=''], [contenteditable='true']";
const LABELLED = "[data-cursor-label]";

const DOT_SPRING = { damping: 28, stiffness: 700, mass: 0.3 };
const RING_SPRING = { damping: 22, stiffness: 180, mass: 0.8 };
const GLOW_SPRING = { damping: 30, stiffness: 60, mass: 1.2 };

const RING = 36;
const DOT = 8;
const GLOW = 320;
const MAX_PARTICLES = 40;
const ORANGE = "249,115,22";

const CSS = `
html.has-fairy-cursor:root,
html.has-fairy-cursor:root *:not(#fc-x),
html.has-fairy-cursor:root *:not(#fc-x)::before,
html.has-fairy-cursor:root *:not(#fc-x)::after { cursor: none !important; }
`;

type P = { x: number; y: number; vx: number; vy: number; life: number; max: number; r: number };
type Ripple = { id: number; x: number; y: number };

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

export function CustomCursor() {
  const pathname = usePathname();
  const reduce = !!useReducedMotion();
  const finePointer = useFinePointer();
  const enabled = finePointer && !HIDDEN_ROUTES.some((r) => pathname?.startsWith(r));

  const mx = useMotionValue(-1000);
  const my = useMotionValue(-1000);
  const dotX = useSpring(mx, DOT_SPRING);
  const dotY = useSpring(my, DOT_SPRING);
  const ringX = useSpring(mx, RING_SPRING);
  const ringY = useSpring(my, RING_SPRING);
  const glowX = useSpring(mx, GLOW_SPRING);
  const glowY = useSpring(my, GLOW_SPRING);

  const [visible, setVisible] = useState(false);
  const [hovering, setHovering] = useState(false);
  const [pressed, setPressed] = useState(false);
  const [textMode, setTextMode] = useState(false);
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
      setTextMode(false);
      setLabel("");
      setRipples([]);
      return;
    }

    root.classList.add("has-fairy-cursor");
    const styleEl = document.createElement("style");
    styleEl.textContent = CSS;
    document.head.appendChild(styleEl);

    /* ---- sparkles: the loop only runs while particles exist ---- */
    const canvas = canvasRef.current;
    const ctx = !reduce && canvas ? canvas.getContext("2d") : null;
    const particles: P[] = [];
    const timers: number[] = [];
    let raf = 0;
    let lastT = 0;
    const last = { x: -1000, y: -1000 };

    const resize = () => {
      if (!canvas) return;
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
    };
    resize();
    window.addEventListener("resize", resize);

    const loop = (now: number) => {
      raf = 0;
      if (!ctx) return;
      const dt = Math.min(40, now - lastT) / 16.67;
      lastT = now;
      ctx.clearRect(0, 0, canvas!.width, canvas!.height);

      for (let i = particles.length - 1; i >= 0; i--) {
        const p = particles[i];
        p.life += dt;
        if (p.life >= p.max) {
          particles.splice(i, 1);
          continue;
        }
        p.vx *= 0.97;
        p.vy = p.vy * 0.97 + 0.04 * dt;
        p.x += p.vx * dt;
        p.y += p.vy * dt;
        const k = 1 - p.life / p.max;
        ctx.globalAlpha = k;
        ctx.fillStyle = `rgb(${ORANGE})`;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.r * (0.5 + k), 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = "#fff7ed";
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.r * 0.4, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.globalAlpha = 1;
      if (particles.length) raf = requestAnimationFrame(loop);
    };

    const spawn = (x: number, y: number, vx: number, vy: number) => {
      if (!ctx) return;
      if (particles.length >= MAX_PARTICLES) particles.shift();
      particles.push({ x, y, vx, vy, life: 0, max: 28 + Math.random() * 20, r: 1.4 + Math.random() * 1.6 });
      if (!raf) {
        lastT = performance.now();
        raf = requestAnimationFrame(loop);
      }
    };

    /* ---- listeners ---- */
    const onMove = (e: PointerEvent) => {
      if (e.pointerType !== "mouse") {
        shown.current = false;
        setVisible(false);
        return;
      }
      const { clientX: x, clientY: y } = e;
      mx.set(x);
      my.set(y);

      if (!shown.current) {
        shown.current = true;
        last.x = x;
        last.y = y;
        dotX.jump(x);
        dotY.jump(y);
        ringX.jump(x);
        ringY.jump(y);
        glowX.jump(x);
        glowY.jump(y);
        setVisible(true);
        return;
      }

      if (Math.hypot(x - last.x, y - last.y) >= 22) {
        spawn(x, y, (Math.random() - 0.5) * 0.8, (Math.random() - 0.5) * 0.8);
        last.x = x;
        last.y = y;
      }
    };

    const onOver = (e: MouseEvent) => {
      const t = e.target;
      if (!(t instanceof Element)) return;
      setTextMode(!!t.closest(TEXTY));
      setHovering(!!t.closest(CLICKABLE));
      setLabel(t.closest<HTMLElement>(LABELLED)?.dataset.cursorLabel ?? "");
    };

    const onDown = (e: PointerEvent) => {
      if (e.pointerType !== "mouse") return;
      setPressed(true);
      if (reduce) return;
      for (let i = 0; i < 8; i++) {
        const a = (i / 8) * Math.PI * 2;
        spawn(e.clientX, e.clientY, Math.cos(a) * 2.6, Math.sin(a) * 2.6 - 0.5);
      }
      const id = ++rippleId.current;
      setRipples((r) => [...r.slice(-2), { id, x: e.clientX, y: e.clientY }]);
      timers.push(window.setTimeout(() => setRipples((l) => l.filter((x) => x.id !== id)), 700));
    };

    const onUp = () => setPressed(false);

    const onLeave = () => {
      shown.current = false;
      setVisible(false);
      setPressed(false);
    };

    const passive = { passive: true, capture: true } as const;
    window.addEventListener("pointermove", onMove, passive);
    window.addEventListener("pointerdown", onDown, passive);
    window.addEventListener("pointerup", onUp, passive);
    window.addEventListener("pointercancel", onUp, passive);
    window.addEventListener("blur", onUp);
    document.addEventListener("mouseover", onOver, { capture: true });
    document.documentElement.addEventListener("mouseleave", onLeave);

    return () => {
      if (raf) cancelAnimationFrame(raf);
      timers.forEach((t) => window.clearTimeout(t));
      root.classList.remove("has-fairy-cursor");
      styleEl.remove();
      window.removeEventListener("resize", resize);
      window.removeEventListener("pointermove", onMove, passive);
      window.removeEventListener("pointerdown", onDown, passive);
      window.removeEventListener("pointerup", onUp, passive);
      window.removeEventListener("pointercancel", onUp, passive);
      window.removeEventListener("blur", onUp);
      document.removeEventListener("mouseover", onOver, { capture: true });
      document.documentElement.removeEventListener("mouseleave", onLeave);
    };
  }, [enabled, reduce, mx, my, dotX, dotY, ringX, ringY, glowX, glowY]);

  if (!enabled) return null;

  const dx = reduce ? mx : dotX;
  const dy = reduce ? my : dotY;
  const rx = reduce ? mx : ringX;
  const ry = reduce ? my : ringY;

  const hasLabel = label !== "";
  const spring = reduce ? { duration: 0 } : { type: "spring" as const, stiffness: 280, damping: 22 };

  const ringAnim = pressed
    ? { scale: 0.78, backgroundColor: `rgba(${ORANGE},0.22)`, borderColor: `rgba(${ORANGE},0.95)` }
    : hovering || hasLabel
    ? { scale: hasLabel ? 1.3 : 1.6, backgroundColor: `rgba(${ORANGE},0.14)`, borderColor: `rgba(${ORANGE},0.85)` }
    : { scale: 1, backgroundColor: `rgba(${ORANGE},0)`, borderColor: `rgba(${ORANGE},0.55)` };

  return createPortal(
    <div aria-hidden className="pointer-events-none fixed inset-0 z-[2147483647]">
      {/* Soft glow: a small element moved by transform only, so it never repaints */}
      <motion.div
        className="absolute left-0 top-0 rounded-full will-change-transform"
        style={{
          x: glowX,
          y: glowY,
          width: GLOW,
          height: GLOW,
          marginLeft: -GLOW / 2,
          marginTop: -GLOW / 2,
          opacity: visible ? 1 : 0,
          background: `radial-gradient(circle, rgba(${ORANGE},0.16), transparent 65%)`,
        }}
      />

      {!reduce && <canvas ref={canvasRef} className="absolute inset-0 h-full w-full" />}

      {ripples.map((r) => (
        <motion.span
          key={r.id}
          className="absolute left-0 top-0 rounded-full border-2 border-orange-500/70"
          style={{ x: r.x, y: r.y, width: 40, height: 40, marginLeft: -20, marginTop: -20 }}
          initial={{ scale: 0.3, opacity: 0.8 }}
          animate={{ scale: 2.6, opacity: 0 }}
          transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
        />
      ))}

      {/* Ring + label */}
      <motion.div
        className="absolute left-0 top-0"
        style={{ x: rx, y: ry, width: RING, height: RING, marginLeft: -RING / 2, marginTop: -RING / 2 }}
      >
        <motion.div
          initial={false}
          animate={{ ...ringAnim, opacity: visible && !textMode ? 1 : 0 }}
          transition={spring}
          className="h-full w-full rounded-full border-[1.5px] shadow-[0_0_16px_rgba(249,115,22,0.35)]"
        />
        <motion.span
          initial={false}
          animate={{ opacity: visible && hasLabel ? 1 : 0, scale: hasLabel ? 1 : 0.85, x: hasLabel ? 0 : -6 }}
          transition={spring}
          className="absolute left-[34px] top-[22px] whitespace-nowrap rounded-full bg-gradient-to-b from-orange-400 to-orange-600 px-3 py-1 font-[family-name:var(--font-body)] text-xs font-semibold text-white shadow-[0_6px_16px_rgba(249,115,22,0.35)]"
        >
          {label || lastLabel.current}
        </motion.span>
      </motion.div>

      {/* I-beam over text fields */}
      <motion.div
        className="absolute left-0 top-0"
        style={{ x: dx, y: dy, width: 2, height: 24, marginLeft: -1, marginTop: -12 }}
      >
        <motion.div
          initial={false}
          animate={{ opacity: visible && textMode ? 1 : 0 }}
          transition={spring}
          className="h-full w-full rounded-full bg-orange-500 shadow-[0_0_10px_2px_rgba(249,115,22,0.6)]"
        />
      </motion.div>

      {/* Dot */}
      <motion.div
        className="absolute left-0 top-0"
        style={{ x: dx, y: dy, width: DOT, height: DOT, marginLeft: -DOT / 2, marginTop: -DOT / 2 }}
      >
        <motion.div
          initial={false}
          animate={{
            opacity: visible && !textMode ? 1 : 0,
            scale: pressed ? 0.5 : hovering || hasLabel ? 0.65 : 1,
          }}
          transition={spring}
          className="h-full w-full rounded-full bg-orange-500 shadow-[0_0_12px_2px_rgba(249,115,22,0.7)] ring-1 ring-white/90"
        />
      </motion.div>
    </div>,
    document.body,
  );
}