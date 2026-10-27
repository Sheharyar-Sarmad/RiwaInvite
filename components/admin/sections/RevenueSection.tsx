"use client";

import { useId, useMemo, useState } from "react";
import { motion } from "framer-motion";
import { ArrowDownRight, ArrowUpRight } from "lucide-react";
import { ACCENTS, CardFrame } from "@/components/admin/cards/CardFrame";
import { AnimatedValue } from "@/components/admin/cards/MetricCard";
import type { RevenueFocusedData } from "@/hooks/useAdminAnalytics";

/** Shapes assumed from your API: adjust the two keys below if yours differ. */
type TimelinePoint = { date: string; revenue: number };
type SourcePoint = { name: string; value: number };

const RANGE_LABEL = { "7d": "last 7 days", "30d": "last 30 days", "90d": "last 90 days", all: "all time" } as const;
const PALETTE = ["16 185 129", "20 184 166", "14 165 233", "99 102 241", "245 158 11", "244 63 94"];
const W = 1000;
const H = 300;

const naira = (n: number) => `₦${Math.round(n).toLocaleString("en-US")}`;
const compact = (n: number) =>
  n >= 1e9 ? `${+(n / 1e9).toFixed(1)}B` : n >= 1e6 ? `${+(n / 1e6).toFixed(1)}M` : n >= 1e3 ? `${+(n / 1e3).toFixed(1)}k` : `${Math.round(n)}`;
const fmtDate = (d: string) => {
  const t = new Date(d);
  return isNaN(+t) ? d : t.toLocaleDateString("en-US", { month: "short", day: "numeric" });
};

/** Catmull-Rom to cubic Bezier, clamped so the curve never dips under the baseline. */
function curve(pts: [number, number][]) {
  if (pts.length < 2) return "";
  const cl = (y: number) => Math.min(H, Math.max(0, y));
  let d = `M${pts[0][0]},${pts[0][1]}`;
  for (let i = 0; i < pts.length - 1; i++) {
    const p0 = pts[i - 1] ?? pts[i], p1 = pts[i], p2 = pts[i + 1], p3 = pts[i + 2] ?? p2;
    d += ` C${p1[0] + (p2[0] - p0[0]) / 6},${cl(p1[1] + (p2[1] - p0[1]) / 6)} ${p2[0] - (p3[0] - p1[0]) / 6},${cl(p2[1] - (p3[1] - p1[1]) / 6)} ${p2[0]},${p2[1]}`;
  }
  return d;
}

export function RevenueSection({
  revenue,
  range,
}: {
  revenue: RevenueFocusedData | null | undefined;
  range: keyof typeof RANGE_LABEL;
}) {
  const timeline = useMemo(() => (revenue?.timelineChart ?? []) as unknown as TimelinePoint[], [revenue]);
  const sources = useMemo(() => {
    const sorted = [...((revenue?.breakdownChart ?? []) as unknown as SourcePoint[])].sort((a, b) => b.value - a.value);
    if (sorted.length <= 6) return sorted;
    const rest = sorted.slice(5).reduce((s, x) => s + x.value, 0);
    return [...sorted.slice(0, 5), { name: "Other", value: rest }];
  }, [revenue]);

  const loading = !revenue;
  const total = revenue?.totalRevenue ?? 0;

  // Derived numbers, all computed from the data you already fetch
  const stats = useMemo(() => {
    const n = timeline.length;
    const sum = timeline.reduce((s, p) => s + p.revenue, 0);
    const best = timeline.reduce<TimelinePoint | null>((b, p) => (!b || p.revenue > b.revenue ? p : b), null);
    const half = Math.floor(n / 2);
    const a = timeline.slice(0, half).reduce((s, p) => s + p.revenue, 0);
    const b = timeline.slice(half).reduce((s, p) => s + p.revenue, 0);
    const delta = n >= 4 && a > 0 ? ((b - a) / a) * 100 : null;
    return { avg: n ? sum / n : 0, best, delta };
  }, [timeline]);

  const sourceTotal = sources.reduce((s, x) => s + x.value, 0);
  const top = sources[0];

  return (
    <div className="grid gap-4 lg:grid-cols-5">
      <CardFrame accent="emerald" tilt={1.5} className="lg:col-span-3" contentClassName="flex flex-col p-6 sm:p-7">
        <HeroHeader
          loading={loading}
          total={total}
          range={RANGE_LABEL[range]}
          delta={stats.delta}
        />

        <div className="mt-6 grid grid-cols-3 divide-x divide-neutral-900/10 border-y border-neutral-900/10 py-4">
          <Stat label="Daily average" value={loading ? "-" : naira(stats.avg)} />
          <Stat
            label="Best day"
            value={stats.best ? naira(stats.best.revenue) : "-"}
            sub={stats.best ? fmtDate(stats.best.date) : undefined}
          />
          <Stat
            label="Top source"
            value={top ? top.name : "-"}
            sub={top && sourceTotal ? `${Math.round((top.value / sourceTotal) * 100)}% of revenue` : undefined}
          />
        </div>

        <RevenueChart data={timeline} loading={loading} />
      </CardFrame>

      <CardFrame accent="emerald" tilt={3} className="lg:col-span-2" contentClassName="flex flex-col p-6 sm:p-7">
        <h3 className="font-[family-name:var(--font-display)] text-lg font-semibold tracking-tight text-neutral-900">
          Revenue by source
        </h3>
        <p className="mt-1 text-sm text-neutral-500">Hover a row or a slice to compare</p>
        <Breakdown sources={sources} total={sourceTotal} loading={loading} />
      </CardFrame>
    </div>
  );
}

/* ---------------------------------- hero ---------------------------------- */

function HeroHeader({ loading, total, range, delta }: { loading: boolean; total: number; range: string; delta: number | null }) {
  const up = (delta ?? 0) >= 0;
  const rgb = ACCENTS.emerald;
  return (
    <div>
      <div className="flex items-center gap-2">
        <h3 className="font-[family-name:var(--font-display)] text-lg font-semibold tracking-tight text-neutral-900">Revenue</h3>
        <span className="relative flex size-2" role="status" aria-label="Live data">
          <span className="absolute inline-flex size-full animate-ping rounded-full opacity-60 motion-reduce:animate-none" style={{ background: `rgb(${rgb})` }} />
          <span className="relative inline-flex size-2 rounded-full" style={{ background: `rgb(${rgb})` }} />
        </span>
        <span className="text-sm text-neutral-500">{range}</span>
      </div>

      <div className="mt-4 flex flex-wrap items-end gap-x-4 gap-y-2">
        <div className="font-[family-name:var(--font-display)] text-5xl font-semibold tracking-tight text-neutral-900 tabular-nums sm:text-6xl">
          {loading ? <span className="inline-block h-12 w-56 animate-pulse rounded-lg bg-neutral-900/[0.06]" /> : <AnimatedValue value={`₦${total.toLocaleString("en-US")}`} />}
        </div>
        {delta !== null && (
          <div className="mb-1.5 flex items-center gap-2">
            <span
              className={`inline-flex items-center gap-0.5 rounded-full px-2.5 py-1 text-sm font-medium ${
                up ? "bg-emerald-500/10 text-emerald-700" : "bg-rose-500/10 text-rose-700"
              }`}
            >
              {up ? <ArrowUpRight className="size-4" /> : <ArrowDownRight className="size-4" />}
              {Math.abs(delta).toFixed(1)}%
            </span>
            <span className="text-xs text-neutral-400">second half vs first half</span>
          </div>
        )}
      </div>
    </div>
  );
}

function Stat({ label, value, sub }: { label: string; value: string; sub?: string }) {
  return (
    <div className="min-w-0 px-4 first:pl-0 last:pr-0">
      <p className="text-xs text-neutral-500">{label}</p>
      <p className="mt-1 truncate text-base font-semibold text-neutral-900 tabular-nums sm:text-lg">{value}</p>
      {sub && <p className="truncate text-xs text-neutral-400">{sub}</p>}
    </div>
  );
}

/* --------------------------------- chart ---------------------------------- */

function RevenueChart({ data, loading }: { data: TimelinePoint[]; loading: boolean }) {
  const uid = useId().replace(/:/g, "");
  const [idx, setIdx] = useState<number | null>(null);
  const rgb = ACCENTS.emerald;

  const vals = data.length === 1 ? [data[0].revenue, data[0].revenue] : data.map((d) => d.revenue);
  const n = vals.length;
  const max = Math.max(...vals, 1);
  const y = (v: number) => H - 8 - (v / max) * (H - 40);
  const pts: [number, number][] = vals.map((v, i) => [(i / Math.max(n - 1, 1)) * W, y(v)]);
  const line = curve(pts);
  const area = line ? `${line} L${W},${H} L0,${H} Z` : "";
  const ticks = [1, 0.75, 0.5, 0.25].map((k) => ({ v: max * k, top: (y(max * k) / H) * 100 }));

  const onMove = (e: React.PointerEvent<HTMLDivElement>) => {
    const r = e.currentTarget.getBoundingClientRect();
    const f = Math.min(1, Math.max(0, (e.clientX - r.left) / r.width));
    setIdx(Math.round(f * (n - 1)));
  };

  if (loading) {
    return <div className="mt-6 h-[260px] animate-pulse rounded-xl bg-neutral-900/[0.05]" aria-busy="true" />;
  }
  if (!data.length) {
    return (
      <div className="mt-6 grid h-[260px] place-items-center rounded-xl border border-dashed border-neutral-900/15 text-sm text-neutral-500">
        No revenue recorded in this range
      </div>
    );
  }

  const active = idx !== null ? data[Math.min(idx, data.length - 1)] : null;
  const ax = idx !== null ? (idx / Math.max(n - 1, 1)) * 100 : 0;
  const ay = idx !== null ? (pts[idx][1] / H) * 100 : 0;

  return (
    <div className="mt-6">
      <div
        role="img"
        aria-label={`Revenue over time, peaking at ${naira(Math.max(...data.map((d) => d.revenue)))}`}
        className="relative h-[260px] cursor-crosshair touch-pan-y select-none"
        onPointerMove={onMove}
        onPointerDown={onMove}
        onPointerLeave={() => setIdx(null)}
      >
        <svg viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="none" className="absolute inset-0 size-full overflow-visible">
          <defs>
            <linearGradient id={`${uid}-fill`} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={`rgb(${rgb})`} stopOpacity="0.35" />
              <stop offset="100%" stopColor={`rgb(${rgb})`} stopOpacity="0" />
            </linearGradient>
          </defs>
          {ticks.map((t, i) => (
            <line key={i} x1="0" x2={W} y1={(t.top / 100) * H} y2={(t.top / 100) * H} stroke="rgba(23,23,23,0.08)" strokeDasharray="4 6" vectorEffect="non-scaling-stroke" />
          ))}
          <motion.path d={area} fill={`url(#${uid}-fill)`} initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.9, delay: 0.3 }} />
          <motion.path
            d={line}
            fill="none"
            stroke={`rgb(${rgb})`}
            strokeWidth="2.5"
            strokeLinecap="round"
            vectorEffect="non-scaling-stroke"
            initial={{ pathLength: 0 }}
            animate={{ pathLength: 1 }}
            transition={{ duration: 1.3, ease: [0.16, 1, 0.3, 1] }}
          />
        </svg>

        {ticks.map((t, i) => (
          <span key={i} className="pointer-events-none absolute left-0 -translate-y-full pb-0.5 text-[10px] text-neutral-400 tabular-nums" style={{ top: `${t.top}%` }}>
            ₦{compact(t.v)}
          </span>
        ))}

        {active && (
          <>
            <div className="pointer-events-none absolute inset-y-0 w-px bg-neutral-900/20" style={{ left: `${ax}%` }} />
            <div
              className="pointer-events-none absolute size-3 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-white"
              style={{ left: `${ax}%`, top: `${ay}%`, background: `rgb(${rgb})`, boxShadow: `0 0 0 4px rgb(${rgb} / 0.25)` }}
            />
            <div
              className="pointer-events-none absolute top-0 z-10 -translate-x-1/2 rounded-lg bg-neutral-900 px-3 py-2 text-white shadow-xl"
              style={{ left: `clamp(64px, ${ax}%, calc(100% - 64px))` }}
            >
              <p className="text-[11px] text-neutral-400">{fmtDate(active.date)}</p>
              <p className="text-sm font-semibold tabular-nums">{naira(active.revenue)}</p>
            </div>
          </>
        )}
      </div>

      <div className="mt-2 flex justify-between text-[11px] text-neutral-400">
        <span>{fmtDate(data[0].date)}</span>
        {data.length > 2 && <span>{fmtDate(data[Math.floor(data.length / 2)].date)}</span>}
        <span>{fmtDate(data[data.length - 1].date)}</span>
      </div>
    </div>
  );
}

/* -------------------------------- breakdown -------------------------------- */

function Breakdown({ sources, total, loading }: { sources: SourcePoint[]; total: number; loading: boolean }) {
  const [hover, setHover] = useState<number | null>(null);
  const R = 62;
  const C = 2 * Math.PI * R;

  if (loading) return <div className="mt-6 h-[300px] animate-pulse rounded-xl bg-neutral-900/[0.05]" aria-busy="true" />;
  if (!sources.length || !total) {
    return (
      <div className="mt-6 grid min-h-[260px] flex-1 place-items-center rounded-xl border border-dashed border-neutral-900/15 text-sm text-neutral-500">
        No sources to show yet
      </div>
    );
  }

  let offset = 0;
  const arcs = sources.map((s, i) => {
    const len = (s.value / total) * C;
    const arc = { len: Math.max(len - 3, 0.5), offset, rgb: PALETTE[i % PALETTE.length] };
    offset += len;
    return arc;
  });
  const focus = hover !== null ? sources[hover] : null;

  return (
    <div className="mt-6 flex flex-1 flex-col gap-6">
      <div className="relative mx-auto size-44 shrink-0">
        <svg viewBox="0 0 160 160" className="size-full -rotate-90">
          <circle cx="80" cy="80" r={R} fill="none" stroke="rgba(23,23,23,0.06)" strokeWidth="16" />
          {arcs.map((a, i) => (
            <motion.circle
              key={i}
              cx="80"
              cy="80"
              r={R}
              fill="none"
              stroke={`rgb(${a.rgb})`}
              strokeLinecap="round"
              strokeDashoffset={-a.offset}
              initial={{ strokeDasharray: `0 ${C}` }}
              animate={{
                strokeDasharray: `${a.len} ${C - a.len}`,
                strokeWidth: hover === i ? 21 : 16,
                opacity: hover === null || hover === i ? 1 : 0.3,
              }}
              transition={{ duration: 0.9, delay: 0.1 + i * 0.08, ease: [0.16, 1, 0.3, 1] }}
              onPointerEnter={() => setHover(i)}
              onPointerLeave={() => setHover(null)}
              style={{ cursor: "pointer" }}
            />
          ))}
        </svg>
        <div className="pointer-events-none absolute inset-0 grid place-items-center text-center">
          <div>
            <p className="max-w-[90px] truncate text-xs text-neutral-500">{focus ? focus.name : "Total"}</p>
            <p className="text-lg font-semibold tabular-nums text-neutral-900">
              {focus ? `${Math.round((focus.value / total) * 100)}%` : `₦${compact(total)}`}
            </p>
          </div>
        </div>
      </div>

      <ul className="space-y-1">
        {sources.map((s, i) => {
          const pct = (s.value / total) * 100;
          const rgb = PALETTE[i % PALETTE.length];
          return (
            <li
              key={s.name + i}
              onPointerEnter={() => setHover(i)}
              onPointerLeave={() => setHover(null)}
              className={`rounded-lg px-2.5 py-2 transition-colors ${hover === i ? "bg-neutral-900/[0.04]" : ""}`}
              style={{ opacity: hover === null || hover === i ? 1 : 0.5 }}
            >
              <div className="flex items-center justify-between gap-3 text-sm">
                <span className="flex min-w-0 items-center gap-2">
                  <span className="size-2.5 shrink-0 rounded-full" style={{ background: `rgb(${rgb})` }} />
                  <span className="truncate font-medium text-neutral-800">{s.name}</span>
                </span>
                <span className="shrink-0 tabular-nums text-neutral-500">
                  <span className="font-medium text-neutral-900">{naira(s.value)}</span>
                  <span className="ml-2 inline-block w-10 text-right">{pct.toFixed(0)}%</span>
                </span>
              </div>
              <div className="mt-1.5 h-1 overflow-hidden rounded-full bg-neutral-900/[0.06]">
                <motion.div
                  className="h-full rounded-full"
                  style={{ background: `rgb(${rgb})` }}
                  initial={{ width: 0 }}
                  whileInView={{ width: `${pct}%` }}
                  viewport={{ once: true }}
                  transition={{ duration: 0.9, delay: 0.15 + i * 0.07, ease: [0.16, 1, 0.3, 1] }}
                />
              </div>
            </li>
          );
        })}
      </ul>
    </div>
  );
}