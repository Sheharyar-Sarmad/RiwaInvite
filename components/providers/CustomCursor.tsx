"use client";

import { useEffect, useRef, useState } from "react";
import { usePathname } from "next/navigation";

/* Lite cursor: dot + ring + soft glow + I-beam + click ripple + tiny on-demand sparkles.
   No blend modes, no backdrop blur, no always-on animation loop.

   Perf notes:
   - Gating component is tiny and renders nothing on touch / coarse pointers / hidden routes.
   - No Framer Motion, no React state during pointer activity: transforms are written
     straight to the DOM from ONE rAF loop that only runs while something is moving.
   - State changes (hover, press, text, label) are data-attributes styled with CSS transitions.
   - Canvas is created/sized lazily on first sparkle and resized at most once per frame. */

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

#fc-root #fc-glow { opacity: 0; }
#fc-root[data-visible] #fc-glow { opacity: 1; }

#fc-root #fc-ring {
  opacity: 0; transform: scale(1);
  background-color: rgba(${ORANGE},0); border-color: rgba(${ORANGE},0.55);
  transition: transform .45s cubic-bezier(.34,1.56,.64,1), background-color .25s, border-color .25s, opacity .2s;
}
#fc-root[data-visible]:not([data-text]) #fc-ring { opacity: 1; }
#fc-root[data-hover] #fc-ring { transform: scale(1.6); background-color: rgba(${ORANGE},0.14); border-color: rgba(${ORANGE},0.85); }
#fc-root[data-label] #fc-ring { transform: scale(1.3); background-color: rgba(${ORANGE},0.14); border-color: rgba(${ORANGE},0.85); }
#fc-root[data-pressed] #fc-ring { transform: scale(.78); background-color: rgba(${ORANGE},0.22); border-color: rgba(${ORANGE},0.95); }

#fc-root #fc-label {
  opacity: 0; transform: translateX(-6px) scale(.85);
  transition: opacity .2s, transform .45s cubic-bezier(.34,1.56,.64,1);
}
#fc-root[data-visible][data-label] #fc-label { opacity: 1; transform: translateX(0) scale(1); }

#fc-root #fc-ibeam { opacity: 0; transition: opacity .2s; }
#fc-root[data-visible][data-text] #fc-ibeam { opacity: 1; }

#fc-root #fc-dot { opacity: 0; transform: scale(1); transition: opacity .2s, transform .35s cubic-bezier(.34,1.56,.64,1); }
#fc-root[data-visible]:not([data-text]) #fc-dot { opacity: 1; }
#fc-root[data-hover] #fc-dot, #fc-root[data-label] #fc-dot { transform: scale(.65); }
#fc-root[data-pressed] #fc-dot { transform: scale(.5); }

#fc-root[data-reduce] #fc-ring, #fc-root[data-reduce] #fc-label,
#fc-root[data-reduce] #fc-ibeam, #fc-root[data-reduce] #fc-dot { transition-duration: 0s; }
`;

type P = { x: number; y: number; vx: number; vy: number; life: number; max: number; r: number };
type SpringCfg = { damping: number; stiffness: number; mass: number };
type Follower = {
  x: number; y: number; vx: number; vy: number;
  tx: number; ty: number;
  cfg: SpringCfg;
  snap: boolean; // follow the target exactly (reduced motion)
  els: (HTMLElement | null)[];
};
type Flag = "visible" | "hover" | "pressed" | "text" | "label";

/** Media-query hook that updates state only when the query result changes. */
function useMedia(query: string): boolean {
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

/** Gate: does nothing (no listeners, no DOM) unless a fine pointer is present on an allowed route. */
export function CustomCursor() {
  const pathname = usePathname();
  const fine = useMedia("(hover: hover) and (pointer: fine)");
  const reduce = useMedia("(prefers-reduced-motion: reduce)");
  const enabled = fine && !HIDDEN_ROUTES.some((r) => pathname?.startsWith(r));
  if (!enabled) return null;
  return <CursorImpl reduce={reduce} />;
}

function CursorImpl({ reduce }: { reduce: boolean }) {
  const rootRef = useRef<HTMLDivElement>(null);
  const glowRef = useRef<HTMLDivElement>(null);
  const ringRef = useRef<HTMLDivElement>(null);
  const labelRef = useRef<HTMLSpanElement>(null);
  const ibeamRef = useRef<HTMLDivElement>(null);
  const dotRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const root = rootRef.current;
    if (!root) return;
    const html = document.documentElement;

    html.classList.add("has-fairy-cursor");
    const styleEl = document.createElement("style");
    styleEl.textContent = CSS;
    document.head.appendChild(styleEl);

    /* ---- state flags (data-attributes; no React re-renders) ---- */
    const flags: Record<Flag, boolean> = {
      visible: false, hover: false, pressed: false, text: false, label: false,
    };
    const setFlag = (k: Flag, v: boolean) => {
      if (flags[k] === v) return;
      flags[k] = v;
      root.toggleAttribute(`data-${k}`, v);
    };
    let shown = false;
    let lastLabelText = "";

    /* ---- springs (same stiffness/damping/mass as before) ---- */
    const mk = (cfg: SpringCfg, snap: boolean, els: (HTMLElement | null)[]): Follower => ({
      x: -1000, y: -1000, vx: 0, vy: 0, tx: -1000, ty: -1000, cfg, snap, els,
    });
    const dot = mk(DOT_SPRING, reduce, [dotRef.current, ibeamRef.current]);
    const ring = mk(RING_SPRING, reduce, [ringRef.current]);
    const glow = mk(GLOW_SPRING, false, [glowRef.current]);
    const followers = [dot, ring, glow];

    const settled = (f: Follower) =>
      f.snap
        ? f.x === f.tx && f.y === f.ty
        : Math.abs(f.x - f.tx) < 0.05 && Math.abs(f.y - f.ty) < 0.05 &&
          Math.abs(f.vx) < 0.05 && Math.abs(f.vy) < 0.05;

    const write = (f: Follower) => {
      const t = `translate3d(${f.x}px,${f.y}px,0)`;
      for (const el of f.els) if (el) el.style.transform = t;
    };

    const integrate = (f: Follower, dt: number) => {
      if (f.snap) {
        f.x = f.tx;
        f.y = f.ty;
        return;
      }
      const { stiffness: k, damping: c, mass: m } = f.cfg;
      const n = Math.max(1, Math.ceil(dt / (1 / 120)));
      const s = dt / n;
      for (let i = 0; i < n; i++) {
        f.vx += ((-k * (f.x - f.tx) - c * f.vx) / m) * s;
        f.vy += ((-k * (f.y - f.ty) - c * f.vy) / m) * s;
        f.x += f.vx * s;
        f.y += f.vy * s;
      }
      if (settled(f)) {
        f.x = f.tx; f.y = f.ty; f.vx = 0; f.vy = 0;
      }
    };

    /* ---- sparkles: canvas is created lazily; loop only runs while something moves ---- */
    const canvas = canvasRef.current;
    let ctx: CanvasRenderingContext2D | null = null;
    let sizeDirty = true;
    let drawn = false;
    const particles: P[] = [];
    const ripples: HTMLSpanElement[] = [];
    let raf = 0;
    let lastT = 0;
    const last = { x: -1000, y: -1000 };

    const ensureCtx = () => {
      if (reduce || !canvas) return null;
      if (!ctx) ctx = canvas.getContext("2d");
      if (ctx && sizeDirty) {
        canvas.width = window.innerWidth;
        canvas.height = window.innerHeight;
        sizeDirty = false;
      }
      return ctx;
    };
    const onResize = () => {
      sizeDirty = true; // applied lazily, at most once per frame / spawn
    };
    window.addEventListener("resize", onResize);

    const loop = (now: number) => {
      raf = 0;
      const ms = Math.max(0, now - lastT);
      lastT = now;

      // springs
      const sdt = Math.min(0.05, ms / 1000);
      let moving = false;
      for (const f of followers) {
        if (settled(f)) continue;
        integrate(f, sdt);
        write(f);
        if (!settled(f)) moving = true;
      }

      // particles
      const c = ensureCtx();
      if (c && (particles.length || drawn)) {
        const dt = Math.min(40, ms) / 16.67;
        c.clearRect(0, 0, canvas!.width, canvas!.height);
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
          c.globalAlpha = k;
          c.fillStyle = `rgb(${ORANGE})`;
          c.beginPath();
          c.arc(p.x, p.y, p.r * (0.5 + k), 0, Math.PI * 2);
          c.fill();
          c.fillStyle = "#fff7ed";
          c.beginPath();
          c.arc(p.x, p.y, p.r * 0.4, 0, Math.PI * 2);
          c.fill();
        }
        c.globalAlpha = 1;
        drawn = particles.length > 0;
      }

      if (moving || particles.length) raf = requestAnimationFrame(loop);
    };

    const ensureLoop = () => {
      if (raf) return;
      lastT = performance.now();
      raf = requestAnimationFrame(loop);
    };

    const spawn = (x: number, y: number, vx: number, vy: number) => {
      if (!ensureCtx()) return;
      if (particles.length >= MAX_PARTICLES) particles.shift();
      particles.push({ x, y, vx, vy, life: 0, max: 28 + Math.random() * 20, r: 1.4 + Math.random() * 1.6 });
      ensureLoop();
    };

    const addRipple = (x: number, y: number) => {
      const span = document.createElement("span");
      span.className = "absolute left-0 top-0 rounded-full border-2 border-orange-500/70";
      span.style.cssText = "width:40px;height:40px;margin:-20px 0 0 -20px;";
      root.appendChild(span);
      ripples.push(span);
      if (ripples.length > 3) ripples.shift()?.remove();
      const anim = span.animate(
        [
          { transform: `translate(${x}px,${y}px) scale(0.3)`, opacity: 0.8 },
          { transform: `translate(${x}px,${y}px) scale(2.6)`, opacity: 0 },
        ],
        { duration: 600, easing: "cubic-bezier(0.16,1,0.3,1)", fill: "forwards" },
      );
      anim.onfinish = () => {
        span.remove();
        const i = ripples.indexOf(span);
        if (i >= 0) ripples.splice(i, 1);
      };
    };

    /* ---- listeners ---- */
    const hide = () => {
      shown = false;
      setFlag("visible", false);
    };

    const onMove = (e: PointerEvent) => {
      if (e.pointerType !== "mouse") {
        hide();
        return;
      }
      const { clientX: x, clientY: y } = e;
      for (const f of followers) {
        f.tx = x;
        f.ty = y;
      }

      if (!shown) {
        shown = true;
        last.x = x;
        last.y = y;
        for (const f of followers) {
          f.x = x; f.y = y; f.vx = 0; f.vy = 0;
          write(f);
        }
        setFlag("visible", true);
        return;
      }

      ensureLoop();
      if (Math.hypot(x - last.x, y - last.y) >= 22) {
        spawn(x, y, (Math.random() - 0.5) * 0.8, (Math.random() - 0.5) * 0.8);
        last.x = x;
        last.y = y;
      }
    };

    const onOver = (e: MouseEvent) => {
      const t = e.target;
      if (!(t instanceof Element)) return;
      setFlag("text", !!t.closest(TEXTY));
      setFlag("hover", !!t.closest(CLICKABLE));
      const text = t.closest<HTMLElement>(LABELLED)?.dataset.cursorLabel ?? "";
      if (text && text !== lastLabelText) {
        lastLabelText = text;
        if (labelRef.current) labelRef.current.textContent = text;
      }
      setFlag("label", text !== "");
    };

    const onDown = (e: PointerEvent) => {
      if (e.pointerType !== "mouse") return;
      setFlag("pressed", true);
      if (reduce) return;
      for (let i = 0; i < 8; i++) {
        const a = (i / 8) * Math.PI * 2;
        spawn(e.clientX, e.clientY, Math.cos(a) * 2.6, Math.sin(a) * 2.6 - 0.5);
      }
      addRipple(e.clientX, e.clientY);
    };

    const onUp = () => setFlag("pressed", false);

    const onLeave = () => {
      hide();
      setFlag("pressed", false);
    };

    const passive = { passive: true, capture: true } as const;
    window.addEventListener("pointermove", onMove, passive);
    window.addEventListener("pointerdown", onDown, passive);
    window.addEventListener("pointerup", onUp, passive);
    window.addEventListener("pointercancel", onUp, passive);
    window.addEventListener("blur", onUp);
    document.addEventListener("mouseover", onOver, { capture: true });
    html.addEventListener("mouseleave", onLeave);

    return () => {
      if (raf) cancelAnimationFrame(raf);
      ripples.forEach((r) => r.remove());
      html.classList.remove("has-fairy-cursor");
      styleEl.remove();
      window.removeEventListener("resize", onResize);
      window.removeEventListener("pointermove", onMove, passive);
      window.removeEventListener("pointerdown", onDown, passive);
      window.removeEventListener("pointerup", onUp, passive);
      window.removeEventListener("pointercancel", onUp, passive);
      window.removeEventListener("blur", onUp);
      document.removeEventListener("mouseover", onOver, { capture: true });
      html.removeEventListener("mouseleave", onLeave);
    };
  }, [reduce]);

  return (
    <div
      id="fc-root"
      ref={rootRef}
      aria-hidden
      data-reduce={reduce ? "" : undefined}
      className="pointer-events-none fixed inset-0 z-[2147483647]"
    >
      {/* Soft glow: moved by transform only, so it never repaints */}
      <div
        id="fc-glow"
        ref={glowRef}
        className="absolute left-0 top-0 rounded-full will-change-transform"
        style={{
          width: GLOW,
          height: GLOW,
          marginLeft: -GLOW / 2,
          marginTop: -GLOW / 2,
          background: `radial-gradient(circle, rgba(${ORANGE},0.16), transparent 65%)`,
        }}
      />

      {!reduce && <canvas ref={canvasRef} className="absolute inset-0 h-full w-full" />}

      {/* Ring + label */}
      <div
        ref={ringRef}
        className="absolute left-0 top-0 will-change-transform"
        style={{ width: RING, height: RING, marginLeft: -RING / 2, marginTop: -RING / 2 }}
      >
        <div
          id="fc-ring"
          className="h-full w-full rounded-full border-[1.5px] shadow-[0_0_16px_rgba(249,115,22,0.35)]"
        />
        <span
          id="fc-label"
          ref={labelRef}
          className="absolute left-[34px] top-[22px] whitespace-nowrap rounded-full bg-gradient-to-b from-orange-400 to-orange-600 px-3 py-1 font-[family-name:var(--font-body)] text-xs font-semibold text-white shadow-[0_6px_16px_rgba(249,115,22,0.35)]"
        />
      </div>

      {/* I-beam over text fields */}
      <div
        ref={ibeamRef}
        className="absolute left-0 top-0 will-change-transform"
        style={{ width: 2, height: 24, marginLeft: -1, marginTop: -12 }}
      >
        <div
          id="fc-ibeam"
          className="h-full w-full rounded-full bg-orange-500 shadow-[0_0_10px_2px_rgba(249,115,22,0.6)]"
        />
      </div>

      {/* Dot */}
      <div
        ref={dotRef}
        className="absolute left-0 top-0 will-change-transform"
        style={{ width: DOT, height: DOT, marginLeft: -DOT / 2, marginTop: -DOT / 2 }}
      >
        <div
          id="fc-dot"
          className="h-full w-full rounded-full bg-orange-500 shadow-[0_0_12px_2px_rgba(249,115,22,0.7)] ring-1 ring-white/90"
        />
      </div>
    </div>
  );
}