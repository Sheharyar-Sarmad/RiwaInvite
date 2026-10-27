"use client";

import { useRef } from "react";
import { RAISED } from "../admin/navigation/AdminSidebar"

/**
 * Porcelain card that tilts toward the cursor and catches a moving
 * highlight. Use it for any dashboard card / panel.
 * Location suggestion: components/admin/ui/Surface3D.tsx
 */
export function Surface3D({
  children,
  className = "",
  intensity = 7,
}: {
  children: React.ReactNode;
  className?: string;
  intensity?: number;
}) {
  const ref = useRef<HTMLDivElement>(null);

  function onMove(e: React.PointerEvent<HTMLDivElement>) {
    const el = ref.current;
    if (!el || e.pointerType === "touch") return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const r = el.getBoundingClientRect();
    const px = (e.clientX - r.left) / r.width;
    const py = (e.clientY - r.top) / r.height;
    el.style.transform = `perspective(900px) rotateX(${(0.5 - py) * intensity}deg) rotateY(${(px - 0.5) * intensity}deg) translateY(-2px)`;
    el.style.setProperty("--sx", `${px * 100}%`);
    el.style.setProperty("--sy", `${py * 100}%`);
  }

  function reset() {
    if (ref.current) ref.current.style.transform = "";
  }

  return (
    <div
      ref={ref}
      onPointerMove={onMove}
      onPointerLeave={reset}
      className={`group relative rounded-3xl transition-[transform,box-shadow] duration-200 ease-out will-change-transform hover:shadow-[0_30px_50px_-24px_rgba(249,115,22,0.55)] ${RAISED} ${className}`}
    >
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 rounded-3xl opacity-0 transition-opacity duration-200 group-hover:opacity-100"
        style={{
          background:
            "radial-gradient(260px circle at var(--sx,50%) var(--sy,0%), rgba(255,255,255,0.95), rgba(255,255,255,0) 60%)",
        }}
      />
      <div className="relative">{children}</div>
    </div>
  );
}