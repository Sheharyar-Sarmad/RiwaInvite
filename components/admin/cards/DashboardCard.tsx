"use client";

import { cn } from "@/lib/utils";
import { ReactNode } from "react";
import { Accent, ACCENTS, CardFrame } from "./CardFrame";

interface DashboardCardProps {
  title: string;
  description?: string;
  children: ReactNode;
  className?: string;
  delay?: number;
  /** Color identity of the card. Also exposed to children as the CSS variable --accent. */
  accent?: Accent;
  /** Pulsing dot beside the title for live data. */
  live?: boolean;
  /** Shows a skeleton instead of children. */
  loading?: boolean;
  /** Right side of the header: badge, menu, picker. */
  action?: ReactNode;
  tilt?: number;
}

export function DashboardCard({
  title,
  description,
  children,
  className,
  delay = 0,
  accent = "orange",
  live = false,
  loading = false,
  action,
  tilt = 4,
}: DashboardCardProps) {
  const rgb = ACCENTS[accent];

  return (
    <CardFrame
      accent={accent}
      tilt={tilt}
      delay={delay}
      className={className}
      contentClassName="flex flex-col p-6"
    >
      <div className="mb-6 flex items-start justify-between gap-4">
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <h3 className="truncate font-[family-name:var(--font-display)] text-lg font-semibold tracking-tight text-neutral-900">
              {title}
            </h3>
            {live && (
              <span className="relative flex size-2" role="status" aria-label="Live data">
                <span
                  className="absolute inline-flex size-full animate-ping rounded-full opacity-60 motion-reduce:animate-none"
                  style={{ background: `rgb(${rgb})` }}
                />
                <span
                  className="relative inline-flex size-2 rounded-full"
                  style={{ background: `rgb(${rgb})` }}
                />
              </span>
            )}
          </div>
          {description && <p className="mt-1 text-sm text-neutral-500">{description}</p>}
        </div>
        {action && <div className="shrink-0">{action}</div>}
      </div>

      <div className="relative h-full">
        {loading ? <Skeleton rgb={rgb} /> : children}
      </div>
    </CardFrame>
  );
}

function Skeleton({ rgb }: { rgb: string }) {
  return (
    <div className="flex h-full min-h-[160px] flex-col justify-end gap-3" aria-busy="true">
      {[38, 72, 54, 90, 46, 64].map((h, i) => (
        <div
          key={i}
          className={cn("relative h-3 overflow-hidden rounded-md bg-neutral-900/[0.05]")}
          style={{ width: `${h}%` }}
        >
          <div
            className="absolute inset-0 -translate-x-full animate-[cardShimmer_1.6s_infinite] motion-reduce:animate-none"
            style={{
              background: `linear-gradient(90deg, transparent, rgb(${rgb} / 0.28), transparent)`,
              animationDelay: `${i * 90}ms`,
            }}
          />
        </div>
      ))}
      <style>{`@keyframes cardShimmer { to { transform: translateX(100%); } }`}</style>
    </div>
  );
}