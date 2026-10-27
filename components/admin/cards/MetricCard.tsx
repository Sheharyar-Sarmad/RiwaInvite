"use client";

import { animate, motion, useInView, useMotionValue, useReducedMotion, useTransform } from "framer-motion";
import { ArrowDownRight, ArrowUpRight, LucideIcon } from "lucide-react";
import { useEffect, useRef } from "react";
import { Accent, ACCENTS, CardFrame } from "./CardFrame";

interface MetricCardProps {
  title: string;
  /** "1,240", "₦48,500" and plain numbers all count up. Anything else renders as-is. */
  value: string | number;
  icon: LucideIcon;
  delay?: number;
  accent?: Accent;
  /** Percent change. Positive is green, negative is red. */
  trend?: number;
  /** Small line under the value, e.g. "vs previous 7 days". */
  hint?: string;
  className?: string;
}

export function MetricCard({
  title,
  value,
  icon: Icon,
  delay = 0,
  accent = "orange",
  trend,
  hint,
  className,
}: MetricCardProps) {
  const rgb = ACCENTS[accent];
  const up = (trend ?? 0) >= 0;

  return (
    <CardFrame accent={accent} delay={delay} tilt={7} className={className} contentClassName="p-5">
      {/* Ghost icon for depth */}
      <Icon
        aria-hidden
        className="pointer-events-none absolute -bottom-3 -right-2 size-24 -rotate-12 stroke-[1.2]"
        style={{ color: `rgb(${rgb} / 0.07)`, transform: "translateZ(-8px) rotate(-12deg)" }}
      />

      <div className="relative flex items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div
            className="grid size-9 place-items-center rounded-xl text-white"
            style={{
              background: `linear-gradient(135deg, rgb(${rgb}), rgb(${rgb} / 0.72))`,
              boxShadow: `0 8px 18px -6px rgb(${rgb} / 0.65), inset 0 1px 0 rgba(255,255,255,0.35)`,
            }}
          >
            <Icon className="size-[18px]" />
          </div>
          <p className="text-sm font-medium text-neutral-500">{title}</p>
        </div>

        {trend !== undefined && (
          <span
            className={`inline-flex items-center gap-0.5 rounded-full px-2 py-0.5 text-xs font-medium ${
              up ? "bg-emerald-500/10 text-emerald-700" : "bg-rose-500/10 text-rose-700"
            }`}
          >
            {up ? <ArrowUpRight className="size-3" /> : <ArrowDownRight className="size-3" />}
            {Math.abs(trend).toFixed(1)}%
          </span>
        )}
      </div>

      <div className="relative mt-5">
        <div className="font-[family-name:var(--font-display)] text-3xl font-semibold tracking-tight text-neutral-900 tabular-nums">
          <AnimatedValue value={value} />
        </div>
        {hint && <p className="mt-1 text-xs text-neutral-400">{hint}</p>}
      </div>
    </CardFrame>
  );
}

export function AnimatedValue({ value }: { value: string | number }) {
  const str = String(value);
  const m = str.match(/^([^\d-]*)(-?[\d,]*\.?\d+)(.*)$/);
  const prefix = m?.[1] ?? "";
  const suffix = m?.[3] ?? "";
  const target = m ? parseFloat(m[2].replace(/,/g, "")) : null;
  const decimals = m && m[2].includes(".") ? m[2].split(".")[1].length : 0;

  const ref = useRef<HTMLSpanElement>(null);
  const inView = useInView(ref, { once: true });
  const reduce = useReducedMotion();
  const mv = useMotionValue(0);
  const text = useTransform(
    mv,
    (v) =>
      `${prefix}${v.toLocaleString("en-US", {
        minimumFractionDigits: decimals,
        maximumFractionDigits: decimals,
      })}${suffix}`
  );

  useEffect(() => {
    if (target === null) return;
    if (reduce) {
      mv.set(target);
      return;
    }
    if (!inView) return;
    // Re-runs when data arrives or the range changes, so numbers roll to the new value.
    const controls = animate(mv, target, { duration: 1.2, ease: [0.16, 1, 0.3, 1] });
    return () => controls.stop();
  }, [target, inView, reduce, mv]);

  if (target === null) return <span>{str}</span>;
  return <motion.span ref={ref}>{text}</motion.span>;
}