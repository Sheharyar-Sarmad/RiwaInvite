"use client";

import { useEffect, useRef } from "react";

function DotField() {
  const ref = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = ref.current;
    const host = canvas?.parentElement;
    if (!canvas || !host) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    const GAP = 24;
    const RADIUS = 130;
    const PUSH = 5;

    let w = 0, h = 0, cols = 0, rows = 0;
    let xs = new Float32Array(0);
    let ys = new Float32Array(0);
    let fs = new Float32Array(0);
    let tx = -9999, ty = -9999, mx = -9999, my = -9999;
    let hover = 0, target = 0;
    let raf = 0, running = false;

    const draw = () => {
      mx += (tx - mx) * 0.2;
      my += (ty - my) * 0.2;
      hover += (target - hover) * 0.1;
      ctx.clearRect(0, 0, w, h);

      for (let j = 0; j < rows; j++) {
        for (let i = 0; i < cols; i++) {
          const idx = j * cols + i;
          const bx = i * GAP + GAP / 2;
          const by = j * GAP + GAP / 2;
          let x = bx, y = by, f = 0;
          if (hover > 0.01) {
            const dx = bx - mx;
            const dy = by - my;
            const d = Math.hypot(dx, dy);
            if (d < RADIUS) {
              const k = 1 - d / RADIUS;
              f = k * k * (3 - 2 * k) * hover;
              if (d > 0.01) {
                x += (dx / d) * f * PUSH;
                y += (dy / d) * f * PUSH;
              }
            }
          }
          xs[idx] = x;
          ys[idx] = y;
          fs[idx] = f;
        }
      }

      if (hover > 0.05) {
        ctx.lineWidth = 1;
        for (let j = 0; j < rows; j++) {
          for (let i = 0; i < cols; i++) {
            const idx = j * cols + i;
            const f = fs[idx];
            if (f < 0.1) continue;
            if (i < cols - 1) {
              const m = Math.min(f, fs[idx + 1]);
              if (m > 0.08) {
                ctx.strokeStyle = `rgba(249,115,22,${(m * 0.3).toFixed(3)})`;
                ctx.beginPath();
                ctx.moveTo(xs[idx], ys[idx]);
                ctx.lineTo(xs[idx + 1], ys[idx + 1]);
                ctx.stroke();
              }
            }
            if (j < rows - 1) {
              const m = Math.min(f, fs[idx + cols]);
              if (m > 0.08) {
                ctx.strokeStyle = `rgba(249,115,22,${(m * 0.3).toFixed(3)})`;
                ctx.beginPath();
                ctx.moveTo(xs[idx], ys[idx]);
                ctx.lineTo(xs[idx + cols], ys[idx + cols]);
                ctx.stroke();
              }
            }
          }
        }
      }

      for (let idx = 0; idx < xs.length; idx++) {
        const f = fs[idx];
        const g = 115 + (88 - 115) * f;
        const b = 22 + (12 - 22) * f;
        const alpha = 0.28 + f * 0.6;
        ctx.fillStyle = `rgba(${(249 + (234 - 249) * f) | 0},${g | 0},${b | 0},${alpha.toFixed(3)})`;
        ctx.beginPath();
        ctx.arc(xs[idx], ys[idx], 1.5 + f * 2, 0, Math.PI * 2);
        ctx.fill();
      }
    };

    const loop = () => {
      draw();
      if (target === 0 && hover < 0.01) {
        running = false;
        return;
      }
      raf = requestAnimationFrame(loop);
    };
    const start = () => {
      if (running) return;
      running = true;
      raf = requestAnimationFrame(loop);
    };

    const resize = () => {
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      w = host.clientWidth;
      h = host.clientHeight;
      canvas.width = Math.round(w * dpr);
      canvas.height = Math.round(h * dpr);
      canvas.style.width = `${w}px`;
      canvas.style.height = `${h}px`;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      cols = Math.ceil(w / GAP) + 1;
      rows = Math.ceil(h / GAP) + 1;
      xs = new Float32Array(cols * rows);
      ys = new Float32Array(cols * rows);
      fs = new Float32Array(cols * rows);
      draw();
    };

    resize();
    const ro = new ResizeObserver(resize);
    ro.observe(host);

    if (reduce) return () => ro.disconnect();

    const onMove = (e: PointerEvent) => {
      if (e.pointerType !== "mouse") return;
      tx = e.clientX;
      ty = e.clientY;
      if (target === 0) {
        mx = tx;
        my = ty;
      }
      target = 1;
      start();
    };
    const onLeave = () => {
      target = 0;
      start();
    };
    window.addEventListener("pointermove", onMove);
    document.documentElement.addEventListener("pointerleave", onLeave);

    return () => {
      cancelAnimationFrame(raf);
      ro.disconnect();
      window.removeEventListener("pointermove", onMove);
      document.documentElement.removeEventListener("pointerleave", onLeave);
    };
  }, []);

  return <canvas ref={ref} className="absolute inset-0" />;
}

export function ShellBackground() {
  const glowRef = useRef<HTMLDivElement>(null);

  // cursor glow: moves a CSS variable pair on the glow layer only
  useEffect(() => {
    let raf = 0;
    const onMove = (e: PointerEvent) => {
      if (e.pointerType === "touch") return;
      const { clientX: x, clientY: y } = e;
      cancelAnimationFrame(raf);
      raf = requestAnimationFrame(() => {
        glowRef.current?.style.setProperty("--mx", `${x}px`);
        glowRef.current?.style.setProperty("--my", `${y}px`);
      });
    };
    window.addEventListener("pointermove", onMove);
    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("pointermove", onMove);
    };
  }, []);

  return (
    <div aria-hidden className="pointer-events-none fixed inset-0 -z-10 overflow-hidden">
      <div className="absolute inset-0 bg-gradient-to-br from-orange-50 via-white to-orange-50/70" />
      <DotField />
      <div
        ref={glowRef}
        className="absolute inset-0"
        style={{
          background:
            "radial-gradient(420px circle at var(--mx,-999px) var(--my,-999px), rgba(249,115,22,0.10), transparent 70%)",
        }}
      />
      <div
        className="absolute -right-32 -top-48 h-[620px] w-[620px] rounded-full blur-3xl"
        style={{ background: "radial-gradient(circle, rgba(249,115,22,0.22), transparent 65%)" }}
      />
      <div
        className="absolute -bottom-48 -left-32 h-[560px] w-[560px] rounded-full blur-3xl"
        style={{ background: "radial-gradient(circle, rgba(255,138,76,0.20), transparent 70%)" }}
      />
    </div>
  );
}