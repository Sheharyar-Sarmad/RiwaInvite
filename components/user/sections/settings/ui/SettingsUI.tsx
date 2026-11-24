"use client";

import * as React from "react";
import { ComponentProps, ReactNode, useEffect, useRef } from "react";
import {
  AnimatePresence,
  animate,
  motion,
  useInView,
  useMotionValue,
  useReducedMotion,
  useSpring,
  useTransform,
} from "framer-motion";
import { EASE, HEADING, cn } from "@/components/user/sections/dashboard/ui/DashboardUI";

export { EASE };

/* ========================================================================== */
/*  Design tokens: same language as the billing page                          */
/* ========================================================================== */

export const PAPER = "bg-gradient-to-br from-[#fffdfa] via-[#fff8f1] to-[#ffeddc]";
export const SURFACE =
  "ring-1 ring-black/[0.06] shadow-[0_1px_2px_rgba(28,20,16,0.04),0_12px_28px_-18px_rgba(28,20,16,0.22)]";
export const TICKET_LIFT =
  "transition-transform duration-300 [filter:drop-shadow(0_1px_1px_rgba(28,20,16,0.08))_drop-shadow(0_14px_20px_rgba(28,20,16,0.10))] hover:-translate-y-1 hover:[filter:drop-shadow(0_1px_1px_rgba(28,20,16,0.10))_drop-shadow(0_22px_26px_rgba(28,20,16,0.16))]";

/** Soft light sweep on hover. Parent needs `group/card` and `relative overflow-hidden`. */
export function Sheen() {
  return (
    <span
      aria-hidden
      className="pointer-events-none absolute inset-y-0 -left-1/2 z-10 w-1/2 -skew-x-12 bg-gradient-to-r from-transparent via-white/60 to-transparent opacity-0 transition-all duration-700 group-hover/card:left-full group-hover/card:opacity-100"
    />
  );
}

/* ========================================================================== */
/*  Icons: outline + soft 14% tint on a 24px grid (same as billing)           */
/* ========================================================================== */

export type IconProps = React.SVGProps<SVGSVGElement>;
export type IconType = (p: IconProps) => React.ReactElement;
const TINT = { fill: "currentColor", fillOpacity: 0.14, stroke: "none" } as const;

function Svg({ children, ...props }: IconProps) {
  return (
    <svg
      viewBox="0 0 24 24"
      width="1em"
      height="1em"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.75}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      focusable="false"
      {...props}
    >
      {children}
    </svg>
  );
}

export const IcUser = (p: IconProps) => (
  <Svg {...p}>
    <circle cx="12" cy="8.5" r="3.8" {...TINT} />
    <circle cx="12" cy="8.5" r="3.8" />
    <path d="M4.5 20c.6-3.6 3.5-5.6 7.5-5.6s6.9 2 7.5 5.6" />
  </Svg>
);
export const IcMail = (p: IconProps) => (
  <Svg {...p}>
    <rect x="3" y="5.5" width="18" height="13" rx="3.2" {...TINT} />
    <rect x="3" y="5.5" width="18" height="13" rx="3.2" />
    <path d="M3.8 8l8.2 6 8.2-6" />
  </Svg>
);
export const IcPhone = (p: IconProps) => (
  <Svg {...p}>
    <rect x="6.5" y="3" width="11" height="18" rx="3" {...TINT} />
    <rect x="6.5" y="3" width="11" height="18" rx="3" />
    <path d="M10.5 17.8h3" />
  </Svg>
);
export const IcLock = (p: IconProps) => (
  <Svg {...p}>
    <rect x="4.5" y="10.5" width="15" height="10" rx="2.8" {...TINT} />
    <rect x="4.5" y="10.5" width="15" height="10" rx="2.8" />
    <path d="M8 10.5V8a4 4 0 0 1 8 0v2.5" />
  </Svg>
);
export const IcKey = (p: IconProps) => (
  <Svg {...p}>
    <circle cx="8.5" cy="15.5" r="4.2" {...TINT} />
    <circle cx="8.5" cy="15.5" r="4.2" />
    <path d="M11.6 12.4L20 4M16.5 7.5l2.5 2.5M14 10l2 2" />
  </Svg>
);
export const IcEye = (p: IconProps) => (
  <Svg {...p}>
    <path d="M2.8 12S6 5.8 12 5.8 21.2 12 21.2 12 18 18.2 12 18.2 2.8 12 2.8 12z" {...TINT} />
    <path d="M2.8 12S6 5.8 12 5.8 21.2 12 21.2 12 18 18.2 12 18.2 2.8 12 2.8 12z" />
    <circle cx="12" cy="12" r="2.8" />
  </Svg>
);
export const IcEyeOff = (p: IconProps) => (
  <Svg {...p}>
    <path d="M2.8 12S6 5.8 12 5.8c1.6 0 3 .4 4.2 1.1M21.2 12S18 18.2 12 18.2c-1.6 0-3-.4-4.2-1.1" />
    <path d="M9.9 9.9a2.8 2.8 0 0 0 4.2 4.2" />
    <path d="M4 4l16 16" />
  </Svg>
);
export const IcCalendar = (p: IconProps) => (
  <Svg {...p}>
    <rect x="3.5" y="5" width="17" height="15.5" rx="3.2" {...TINT} />
    <rect x="3.5" y="5" width="17" height="15.5" rx="3.2" />
    <path d="M3.5 10h17M8 3.2v3.6M16 3.2v3.6" />
  </Svg>
);
export const IcFingerprint = (p: IconProps) => (
  <Svg {...p}>
    <rect x="3.5" y="5" width="17" height="14" rx="3.2" {...TINT} />
    <rect x="3.5" y="5" width="17" height="14" rx="3.2" />
    <circle cx="9" cy="11" r="1.8" />
    <path d="M6.2 16c.5-1.6 1.5-2.4 2.8-2.4s2.3.8 2.8 2.4M14 10.5h3.5M14 13.5h3.5" />
  </Svg>
);
export const IcShield = (p: IconProps) => (
  <Svg {...p}>
    <path d="M12 3.5l7 2.7v5.4c0 4.4-2.9 7.7-7 9-4.1-1.3-7-4.6-7-9V6.2l7-2.7z" {...TINT} />
    <path d="M12 3.5l7 2.7v5.4c0 4.4-2.9 7.7-7 9-4.1-1.3-7-4.6-7-9V6.2l7-2.7z" />
    <path d="M8.9 12.2l2.2 2.2 4-4.2" />
  </Svg>
);
export const IcCheck = (p: IconProps) => (
  <Svg strokeWidth={2.4} {...p}>
    <path d="M5 12.5l4.5 4.5L19 7.5" />
  </Svg>
);
export const IcCopy = (p: IconProps) => (
  <Svg {...p}>
    <rect x="8.5" y="8.5" width="11" height="11" rx="2.6" {...TINT} />
    <rect x="8.5" y="8.5" width="11" height="11" rx="2.6" />
    <path d="M15.5 8.5V6.6a2.1 2.1 0 0 0-2.1-2.1H6.6a2.1 2.1 0 0 0-2.1 2.1v6.8a2.1 2.1 0 0 0 2.1 2.1h1.9" />
  </Svg>
);
export const IcUndo = (p: IconProps) => (
  <Svg {...p}>
    <path d="M4.5 4.5V9H9" />
    <path d="M5.2 9A8 8 0 1 1 4.5 12" />
  </Svg>
);
export const IcAlert = (p: IconProps) => (
  <Svg {...p}>
    <circle cx="12" cy="12" r="8.5" {...TINT} />
    <circle cx="12" cy="12" r="8.5" />
    <path d="M12 7.8v5" />
    <circle cx="12" cy="16.2" r=".9" fill="currentColor" stroke="none" />
  </Svg>
);
export const IcClock = (p: IconProps) => (
  <Svg {...p}>
    <circle cx="12" cy="12" r="8.5" {...TINT} />
    <circle cx="12" cy="12" r="8.5" />
    <path d="M12 7.6V12l3 1.9" />
  </Svg>
);
export const IcHand = (p: IconProps) => (
  <Svg {...p}>
    <path d="M8 11V5.8a1.4 1.4 0 0 1 2.8 0V10m0-.6V4.6a1.4 1.4 0 0 1 2.8 0V10m0-4.2a1.4 1.4 0 0 1 2.8 0V11m0-3.2a1.4 1.4 0 0 1 2.8 0v6.2c0 3.9-2.7 6.5-6.2 6.5-2.4 0-3.9-1-5.3-3L4.3 13.6a1.5 1.5 0 0 1 2.3-1.9L8 13" {...TINT} />
    <path d="M8 11V5.8a1.4 1.4 0 0 1 2.8 0V10m0-.6V4.6a1.4 1.4 0 0 1 2.8 0V10m0-4.2a1.4 1.4 0 0 1 2.8 0V11m0-3.2a1.4 1.4 0 0 1 2.8 0v6.2c0 3.9-2.7 6.5-6.2 6.5-2.4 0-3.9-1-5.3-3L4.3 13.6a1.5 1.5 0 0 1 2.3-1.9L8 13" />
  </Svg>
);

/* ========================================================================== */
/*  Panel: paper card with scroll reveal (no tilt)                            */
/* ========================================================================== */

export function Panel({
  children,
  delay = 0,
  className = "",
}: {
  children: ReactNode;
  delay?: number;
  className?: string;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 24, scale: 0.985 }}
      whileInView={{ opacity: 1, y: 0, scale: 1 }}
      viewport={{ once: true, amount: 0.1 }}
      transition={{ duration: 0.65, delay, ease: EASE }}
      className={cn(
        "group/card relative overflow-hidden rounded-2xl border border-black/[0.07]",
        PAPER,
        SURFACE,
        className,
      )}
    >
      <Sheen />
      {children}
    </motion.div>
  );
}

/* ========================================================================== */
/*  Icon badge (tinted square, black glyph)                                   */
/* ========================================================================== */

export function IconBadge({ icon: Icon, className }: { icon: IconType; className?: string }) {
  return (
    <span
      aria-hidden
      className={cn("flex size-7 shrink-0 items-center justify-center rounded-lg bg-stone-100 text-[#1c1410]", className)}
    >
      <Icon className="size-4" />
    </span>
  );
}

/* ========================================================================== */
/*  Section                                                                   */
/* ========================================================================== */

export function Section({
  title,
  description,
  icon: Icon,
  children,
  delay = 0,
}: {
  title: string;
  description: string;
  icon?: IconType;
  children: ReactNode;
  delay?: number;
}) {
  return (
    <div className="grid gap-5 lg:grid-cols-[230px_1fr] lg:gap-10">
      <motion.div
        initial={{ opacity: 0, x: -24 }}
        whileInView={{ opacity: 1, x: 0 }}
        viewport={{ once: true, amount: 0.3 }}
        transition={{ duration: 0.65, delay, ease: EASE }}
        className="lg:pt-1"
      >
        {Icon && (
          <motion.span
            whileHover={{ rotate: -8, scale: 1.08 }}
            transition={{ type: "spring", stiffness: 300, damping: 14 }}
            className="mb-3 flex size-10 items-center justify-center rounded-xl bg-white text-[#1c1410] ring-1 ring-black/[0.08] shadow-sm"
          >
            <motion.span
              animate={{ y: [0, -2.5, 0] }}
              transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
              className="flex"
            >
              <Icon className="size-5" />
            </motion.span>
          </motion.span>
        )}
        <h3 className={cn(HEADING, "text-lg tracking-[-0.015em] text-[#1c1410] sm:text-xl")}>{title}</h3>
        <motion.span
          aria-hidden
          initial={{ width: 0 }}
          whileInView={{ width: 48 }}
          viewport={{ once: true }}
          transition={{ duration: 0.8, delay: delay + 0.2, ease: EASE }}
          className="mt-2 block h-0.5 rounded-full bg-gradient-to-r from-[#1c1410] to-transparent"
        />
        <p className="mt-3 max-w-xs text-[13px] leading-relaxed text-stone-500">{description}</p>
      </motion.div>
      <Panel delay={delay}>
        <div className="p-5 sm:p-8">{children}</div>
      </Panel>
    </div>
  );
}

/* ========================================================================== */
/*  Stat card (like the billing spend strip)                                  */
/* ========================================================================== */

export function StatCard({
  label,
  icon,
  value,
  delay = 0,
  children,
}: {
  label: string;
  icon: IconType;
  value?: string;
  delay?: number;
  children?: ReactNode;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      transition={{ duration: 0.45, delay, ease: EASE }}
      className={cn("group/card min-w-0", TICKET_LIFT)}
    >
      <div
        className={cn(
          "relative flex h-[6.5rem] flex-col justify-between overflow-hidden rounded-2xl border border-black/[0.07] p-3.5 sm:h-[7.25rem] sm:p-4",
          PAPER,
        )}
      >
        <Sheen />
        <dt className="flex items-center gap-2">
          <IconBadge icon={icon} />
          <span className="truncate text-[11px] font-semibold uppercase tracking-[0.12em] text-stone-500">
            {label}
          </span>
        </dt>
        <dd className={cn(HEADING, "min-w-0 truncate text-[22px] leading-7 tracking-[-0.03em] text-[#1c1410] sm:text-[26px] sm:leading-8")}>
          {children ?? value}
        </dd>
      </div>
    </motion.div>
  );
}

/** Shimmering placeholder while a value loads. */
export function ValueSkeleton({ className = "w-24" }: { className?: string }) {
  return (
    <span className={cn("relative inline-block h-6 overflow-hidden rounded-md bg-black/[0.07] align-middle", className)}>
      <motion.span
        aria-hidden
        className="absolute inset-y-0 w-1/2 bg-gradient-to-r from-transparent via-white/70 to-transparent"
        initial={{ x: "-100%" }}
        animate={{ x: "300%" }}
        transition={{ duration: 1.2, repeat: Infinity, ease: "easeInOut" }}
      />
    </span>
  );
}

/* ========================================================================== */
/*  Chip (same as billing)                                                    */
/* ========================================================================== */

export function Chip({
  icon: Icon,
  children,
  tone = "neutral",
}: {
  icon?: IconType;
  children: ReactNode;
  tone?: "neutral" | "ink" | "emerald";
}) {
  const tones = {
    neutral: "bg-white/80 text-stone-700 ring-black/[0.08]",
    emerald: "bg-emerald-50 text-emerald-700 ring-emerald-600/20",
    ink: "bg-[#1c1410] text-white ring-white/10",
  } as const;
  return (
    <span className={cn("inline-flex h-6 shrink-0 items-center gap-1.5 rounded-full px-2.5 text-[11px] font-semibold ring-1 ring-inset backdrop-blur", tones[tone])}>
      {Icon && <Icon className="size-3.5" />}
      {children}
    </span>
  );
}

/* ========================================================================== */
/*  Count-up number                                                           */
/* ========================================================================== */

export function CountUp({ value, suffix = "", className }: { value: number; suffix?: string; className?: string }) {
  const ref = useRef<HTMLSpanElement>(null);
  const inView = useInView(ref, { once: true });
  const mv = useMotionValue(0);
  const text = useTransform(mv, (v) => `${Math.round(v).toLocaleString()}${suffix}`);

  useEffect(() => {
    if (!inView) return;
    const controls = animate(mv, value, { duration: 1.2, ease: EASE });
    return () => controls.stop();
  }, [inView, value, mv]);

  return (
    <motion.span ref={ref} className={className}>
      {text}
    </motion.span>
  );
}

/* ========================================================================== */
/*  Profile completeness ring (ink on frosted pill)                           */
/* ========================================================================== */

export function CompletenessRing({ percent }: { percent: number }) {
  const mv = useMotionValue(0);
  const label = useTransform(mv, (v) => `${Math.round(v)}%`);

  useEffect(() => {
    const controls = animate(mv, percent, { duration: 1, ease: EASE });
    return () => controls.stop();
  }, [percent, mv]);

  const done = percent >= 100;

  return (
    <div className="flex items-center gap-3 rounded-2xl bg-white/75 py-2 pl-2 pr-4 shadow-sm ring-1 ring-white/80 backdrop-blur-md">
      <div className="relative size-14">
        <svg viewBox="0 0 64 64" className="relative size-full -rotate-90">
          <circle cx="32" cy="32" r="26" fill="none" strokeWidth="6" className="stroke-black/10" />
          <motion.circle
            cx="32"
            cy="32"
            r="26"
            fill="none"
            strokeWidth="6"
            strokeLinecap="round"
            className="stroke-[#1c1410]"
            initial={{ pathLength: 0 }}
            animate={{ pathLength: percent / 100 }}
            transition={{ duration: 1, ease: EASE }}
          />
        </svg>
        <motion.span
          className={cn(HEADING, "absolute inset-0 grid place-items-center text-[13px] tabular-nums text-[#1c1410]")}
        >
          {label}
        </motion.span>
      </div>
      <div className="text-left">
        <p className="text-xs font-semibold text-[#1c1410]">Profile</p>
        <p className="text-xs text-stone-500">{done ? "All set" : "Almost there"}</p>
      </div>
    </div>
  );
}

/* ========================================================================== */
/*  Avatar: ink stub with a sweeping ring clipped to its rounded shape        */
/* ========================================================================== */

export function AvatarRing({ children }: { children: ReactNode }) {
  const reduce = useReducedMotion();
  return (
    <div className="relative size-[72px] shrink-0">
      <span aria-hidden className="absolute inset-2 rounded-2xl bg-[#1c1410]/30 blur-xl" />
      <div className="relative size-full overflow-hidden rounded-[1.2rem] p-[3px]">
        <motion.span
          aria-hidden
          className="absolute -inset-1/2"
          style={{ background: "conic-gradient(from 0deg, #1c1410, #a8a29e, rgba(28,20,16,0.12) 55%, #1c1410)" }}
          animate={reduce ? undefined : { rotate: 360 }}
          transition={{ duration: 8, repeat: Infinity, ease: "linear" }}
        />
        <div
          className={cn(
            HEADING,
            "relative grid size-full place-items-center rounded-[1rem] bg-[#1c1410] text-2xl text-white shadow-[inset_0_1px_0_rgba(255,255,255,0.14)]",
          )}
        >
          {children}
        </div>
      </div>
    </div>
  );
}

/* ========================================================================== */
/*  Waving hand: black icon                                                   */
/* ========================================================================== */

export function WavingHand() {
  const reduce = useReducedMotion();
  return (
    <motion.span
      aria-hidden
      className="inline-flex text-[#1c1410]"
      style={{ transformOrigin: "70% 85%" }}
      animate={reduce ? undefined : { rotate: [0, 18, -8, 18, -4, 12, 0] }}
      transition={{ duration: 1.8, repeat: Infinity, repeatDelay: 2.5 }}
    >
      <IcHand className="size-[18px]" />
    </motion.span>
  );
}

/* ========================================================================== */
/*  Magnetic wrapper                                                          */
/* ========================================================================== */

export function Magnetic({ children }: { children: ReactNode }) {
  const ref = useRef<HTMLDivElement>(null);
  const x = useSpring(0, { stiffness: 220, damping: 16 });
  const y = useSpring(0, { stiffness: 220, damping: 16 });

  const onMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (e.pointerType !== "mouse") return;
    const r = ref.current?.getBoundingClientRect();
    if (!r) return;
    x.set((e.clientX - (r.left + r.width / 2)) * 0.25);
    y.set((e.clientY - (r.top + r.height / 2)) * 0.25);
  };
  const reset = () => {
    x.set(0);
    y.set(0);
  };

  return (
    <motion.div ref={ref} onPointerMove={onMove} onPointerLeave={reset} style={{ x, y }} className="inline-flex">
      {children}
    </motion.div>
  );
}

/* ========================================================================== */
/*  Success burst                                                             */
/* ========================================================================== */

const PARTICLES = Array.from({ length: 24 }, (_, i) => ({
  angle: (i / 24) * Math.PI * 2,
  dist: 120 + (i % 5) * 32,
  size: 6 + (i % 3) * 3,
  color: ["bg-[#1c1410]", "bg-amber-400", "bg-stone-400", "bg-emerald-400"][i % 4],
  delay: (i % 6) * 0.02,
}));

export function SuccessBurst({ show }: { show: boolean }) {
  return (
    <AnimatePresence>
      {show && (
        <motion.div
          key="burst"
          className="pointer-events-none fixed inset-0 z-[70] flex items-center justify-center"
          initial={{ opacity: 1 }}
          exit={{ opacity: 0, transition: { duration: 0.4 } }}
        >
          <motion.div
            initial={{ scale: 0, rotate: -40 }}
            animate={{ scale: [0, 1.25, 1], rotate: 0 }}
            transition={{ duration: 0.6, ease: EASE }}
            className="relative grid size-20 place-items-center rounded-full bg-[#1c1410] text-white shadow-[0_20px_60px_-10px_rgba(28,20,16,0.6)]"
          >
            <motion.span
              aria-hidden
              className="absolute inset-0 rounded-full border-2 border-[#1c1410]"
              initial={{ scale: 1, opacity: 0.7 }}
              animate={{ scale: 2.2, opacity: 0 }}
              transition={{ duration: 1, ease: "easeOut" }}
            />
            <IcCheck className="size-9" />
          </motion.div>

          {PARTICLES.map((p, i) => (
            <motion.span
              key={i}
              className={`absolute rounded-full ${p.color}`}
              style={{ width: p.size, height: p.size }}
              initial={{ x: 0, y: 0, opacity: 1, scale: 1 }}
              animate={{ x: Math.cos(p.angle) * p.dist, y: Math.sin(p.angle) * p.dist, opacity: 0, scale: 0.3 }}
              transition={{ duration: 1.1, delay: 0.15 + p.delay, ease: [0.2, 0.8, 0.3, 1] }}
            />
          ))}
        </motion.div>
      )}
    </AnimatePresence>
  );
}

/* ========================================================================== */
/*  Field                                                                     */
/* ========================================================================== */

type FieldProps = ComponentProps<"input"> & {
  label: string;
  icon: IconType;
  error?: string;
  trailing?: ReactNode;
  required?: boolean;
  delay?: number;
};

export function Field({
  label,
  icon: Icon,
  error,
  trailing,
  required,
  className,
  id,
  name,
  delay = 0,
  ...rest
}: FieldProps) {
  const inputId = id ?? `field-${name}`;
  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, amount: 0.2 }}
      transition={{ duration: 0.5, delay, ease: EASE }}
    >
      <motion.div animate={error ? { x: [0, -7, 7, -4, 4, 0] } : { x: 0 }} transition={{ duration: 0.4 }}>
        <label htmlFor={inputId} className="mb-1.5 block text-[13px] font-semibold text-[#1c1410]">
          {label}
          {required && <span className="ml-0.5 text-rose-600">*</span>}
        </label>
        <div className="group relative">
          <Icon
            aria-hidden
            className={cn(
              "pointer-events-none absolute left-3.5 top-1/2 z-10 size-4 -translate-y-1/2 transition-all duration-300",
              error ? "text-rose-500" : "text-stone-400 group-focus-within:scale-125 group-focus-within:text-[#1c1410]",
            )}
          />
          <input
            id={inputId}
            name={name}
            aria-invalid={!!error}
            aria-describedby={error ? `${inputId}-error` : undefined}
            className={cn(
              "w-full rounded-xl border bg-white py-2.5 pl-10 text-sm text-[#1c1410] shadow-[0_1px_2px_rgba(28,20,16,0.04)] outline-none transition-all placeholder:text-stone-400",
              trailing ? "pr-11" : "pr-3",
              error
                ? "border-rose-300 focus:border-rose-400 focus:ring-4 focus:ring-rose-500/10"
                : "border-black/10 hover:border-black/20 focus:border-[#1c1410]/60 focus:ring-4 focus:ring-black/[0.06]",
              className,
            )}
            {...rest}
          />
          <span
            aria-hidden
            className={cn(
              "pointer-events-none absolute inset-x-3 -bottom-px h-0.5 origin-left scale-x-0 rounded-full transition-transform duration-500 group-focus-within:scale-x-100",
              error ? "bg-rose-400" : "bg-gradient-to-r from-[#1c1410] via-stone-500 to-[#1c1410]",
            )}
          />
          {trailing && <div className="absolute right-2 top-1/2 z-10 -translate-y-1/2">{trailing}</div>}
        </div>
        <AnimatePresence initial={false}>
          {error && (
            <motion.p
              id={`${inputId}-error`}
              role="alert"
              initial={{ height: 0, opacity: 0, y: -4 }}
              animate={{ height: "auto", opacity: 1, y: 0 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="overflow-hidden"
            >
              <span className="flex items-center gap-1 pt-1.5 text-xs text-rose-600">
                <IcAlert className="size-3.5 shrink-0" /> {error}
              </span>
            </motion.p>
          )}
        </AnimatePresence>
      </motion.div>
    </motion.div>
  );
}

/* ========================================================================== */
/*  Password helpers                                                          */
/* ========================================================================== */

export function Reveal({ shown, onToggle }: { shown: boolean; onToggle: () => void }) {
  return (
    <motion.button
      type="button"
      onClick={onToggle}
      whileTap={{ scale: 0.85 }}
      aria-label={shown ? "Hide password" : "Show password"}
      className="grid size-8 place-items-center overflow-hidden rounded-lg text-stone-500 transition-colors hover:bg-black/5 hover:text-[#1c1410]"
    >
      <AnimatePresence mode="wait" initial={false}>
        <motion.span
          key={shown ? "off" : "on"}
          initial={{ rotateX: 90, opacity: 0 }}
          animate={{ rotateX: 0, opacity: 1 }}
          exit={{ rotateX: -90, opacity: 0 }}
          transition={{ duration: 0.16 }}
          className="grid place-items-center"
        >
          {shown ? <IcEyeOff className="size-4" /> : <IcEye className="size-4" />}
        </motion.span>
      </AnimatePresence>
    </motion.button>
  );
}

export function scorePassword(p: string) {
  let score = 0;
  if (p.length >= 8) score++;
  if (p.length >= 12) score++;
  if (/[a-z]/.test(p) && /[A-Z]/.test(p)) score++;
  if (/\d/.test(p) && /[^A-Za-z0-9]/.test(p)) score++;
  const map = [
    { label: "Too short", bar: "bg-rose-500", text: "text-rose-600" },
    { label: "Weak", bar: "bg-rose-500", text: "text-rose-600" },
    { label: "Fair", bar: "bg-amber-500", text: "text-amber-700" },
    { label: "Good", bar: "bg-emerald-400", text: "text-emerald-600" },
    { label: "Strong", bar: "bg-emerald-500", text: "text-emerald-600" },
  ];
  return { score, ...map[p.length < 8 ? 0 : score] };
}

export function StrengthMeter({ value }: { value: string }) {
  const strength = scorePassword(value);
  return (
    <AnimatePresence initial={false}>
      {value ? (
        <motion.div
          initial={{ height: 0, opacity: 0 }}
          animate={{ height: "auto", opacity: 1 }}
          exit={{ height: 0, opacity: 0 }}
          transition={{ duration: 0.25, ease: EASE }}
          className="overflow-hidden"
        >
          <div className="pt-2.5">
            <div className="flex gap-1.5" aria-hidden>
              {[1, 2, 3, 4].map((n) => (
                <span key={n} className="relative h-1.5 flex-1 overflow-hidden rounded-full bg-black/[0.07]">
                  <motion.span
                    className={`absolute inset-0 origin-left rounded-full ${strength.bar}`}
                    initial={false}
                    animate={{ scaleX: strength.score >= n ? 1 : 0 }}
                    transition={{ type: "spring", stiffness: 260, damping: 22, delay: n * 0.05 }}
                  />
                </span>
              ))}
            </div>
            <AnimatePresence mode="wait" initial={false}>
              <motion.p
                key={strength.label}
                initial={{ opacity: 0, y: 4 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -4 }}
                transition={{ duration: 0.15 }}
                className={`mt-1.5 text-xs font-semibold ${strength.text}`}
              >
                {strength.label}
              </motion.p>
            </AnimatePresence>
          </div>
        </motion.div>
      ) : null}
    </AnimatePresence>
  );
}