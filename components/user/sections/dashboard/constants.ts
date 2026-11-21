import { LayoutDashboard, BarChart3, Activity, CreditCard } from "lucide-react";
import type { Variants, Transition } from "framer-motion";
import { apiClient } from "@/lib/api/api_base";

export const FOCUS =
  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-500 focus-visible:ring-offset-2 focus-visible:ring-offset-white";

export const fetcher = (url: string) => apiClient.get(url).then((res) => res.data.data);

export const TABS = [
  { id: "overview", label: "Overview", icon: LayoutDashboard },
  { id: "analytics", label: "Analytics", icon: BarChart3 },
  { id: "activity", label: "Activity", icon: Activity },
  { id: "billing", label: "Billing", icon: CreditCard },
] as const;
export type TabId = (typeof TABS)[number]["id"];

/* --------------------------------- Motion -------------------------------- */
export const EASE = [0.16, 1, 0.3, 1] as const;
export const SPRING: Transition = { type: "spring", stiffness: 420, damping: 36 };
export const VIEW = { once: true, amount: 0.1 } as const;

export const listV: Variants = {
  hidden: {},
  show: { transition: { staggerChildren: 0.04, delayChildren: 0.05 } },
};
export const itemV: Variants = {
  hidden: { opacity: 0, y: 8 },
  show: { opacity: 1, y: 0, transition: { duration: 0.35, ease: EASE } },
};

export const STICKY_TOP = "top-2 sm:top-4";

/* -------------------------------- Utilities ------------------------------ */
export const cn = (...c: (string | false | null | undefined)[]) => c.filter(Boolean).join(" ");

export const fmtDate = (d: string): string =>
  new Date(d).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });

export const fmtShort = (d: string): string => {
  const t = new Date(d);
  return isNaN(+t) ? d : t.toLocaleDateString("en-US", { month: "short", day: "numeric" });
};

export const fmtDateTime = (d: string): string =>
  new Date(d).toLocaleString("en-US", { month: "short", day: "numeric", year: "numeric", hour: "numeric", minute: "2-digit" });

export const fmtNum = (n?: number | null): string => (n ?? 0).toLocaleString("en-US");

export const money = (n: number | string): string => `Rs ${Number(n || 0).toLocaleString()}`;

export function timeAgo(d: string): string {
  const s = Math.max(1, Math.floor((Date.now() - new Date(d).getTime()) / 1000));
  if (s < 60) return "just now";
  const m = Math.floor(s / 60);
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  const days = Math.floor(h / 24);
  return days < 7 ? `${days}d ago` : fmtDate(d);
}

export const titleCase = (s: string): string =>
  s.replace(/[-_]/g, " ").replace(/^\w/, (c) => c.toUpperCase());

/* ------------------------------ Chart tokens ----------------------------- */
export const CHART = {
  accepted: "#ff5a00",
  declined: "#d9c9bd",
  pending: "#ffb98a",
  grid: "#f6e7db",
  axis: "#9a7b68",
  bar: "#ff6a1a",
  cursor: "rgba(255,106,26,0.08)",
} as const;

/* ------------------------- Shared sidebar-style pieces ------------------- */
export const BTN =
  "bg-gradient-to-b from-[#ff6a1a] to-[#f04e00] text-white shadow-[inset_0_1px_0_rgba(255,255,255,0.28),0_6px_14px_-6px_rgba(255,90,0,0.8)] transition hover:brightness-105 active:brightness-95";

// Glow effect matching the "S" avatar
export const ICON_CHIP =
  "flex shrink-0 items-center justify-center rounded-xl border border-orange-200/70 bg-white text-orange-600 shadow-[0_0_12px_rgba(234,88,12,0.3)]";

export const AVATAR =
  "flex shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-[#ff8a3d] to-[#f04e00] font-bold text-white shadow-[0_0_16px_rgba(234,88,12,0.6)] border-2 border-white";

/* ------------------------------ Design tokens ---------------------------- */
export type Tone = "ember" | "paper" | "sun";

export interface ToneStyle {
  bg: string;
  borderGradient: string;
  muted: string;
  icon: string;
}

// Strictly warm colors: Orange, Amber, Red. No Pink.
const GRADIENT_LIGHT = "conic-gradient(from 0deg, #ea580c, #f59e0b, #dc2626, #ea580c)";
const GRADIENT_DARK = "conic-gradient(from 0deg, #ea580c, #f59e0b, #b91c1c, #ea580c)";
const GRADIENT_VIVID = "conic-gradient(from 0deg, #f59e0b, #ef4444, #ea580c, #f59e0b)";

export const TONE: Record<Tone, ToneStyle> = {
  ember: {
    bg: "bg-[#170b04]", // Base dark, mesh applied in component
    borderGradient: GRADIENT_DARK,
    muted: "text-orange-200/65",
    icon: "bg-orange-500/15 text-orange-300 border border-orange-500/25",
  },

  /** Multi-color warm background handled in TiltCard */
  paper: {
    bg: "bg-[#fffbf7]", 
    borderGradient: GRADIENT_LIGHT,
    muted: "text-stone-500",
    icon: "bg-white text-orange-600 border border-orange-200/70 shadow-[0_0_12px_rgba(234,88,12,0.3)]",
  },

  sun: {
    bg: "bg-gradient-to-br from-[#ff6a1a] to-[#f04800]",
    borderGradient: GRADIENT_VIVID,
    muted: "text-orange-50/85",
    icon: "bg-white/20 text-white border border-white/25",
  },
};

export const TONE_TEXT: Record<Tone, string> = {
  ember: "text-[#fff1e4]",
  paper: "text-[#2a1002]",
  sun: "text-white",
};