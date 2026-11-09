import { LayoutDashboard, BarChart3, Activity, CreditCard } from "lucide-react";
import { apiClient } from "@/lib/api/api_base";
import { FOCUS } from "@/components/user/navigation/UserSidebar"; // Re-exporting for tabs to use

export { FOCUS };
export const fetcher = (url: string) => apiClient.get(url).then((res) => res.data.data);

export const TABS = [
  { id: "overview", label: "Overview", icon: LayoutDashboard },
  { id: "analytics", label: "Analytics", icon: BarChart3 },
  { id: "activity", label: "Activity", icon: Activity },
  { id: "billing", label: "Billing", icon: CreditCard },
] as const;
export type TabId = (typeof TABS)[number]["id"];

export const EASE = [0.16, 1, 0.3, 1] as const;
export const MAX_TILT = 5;
export const VIEW = { once: true, amount: 0.15 } as const;
export const STICKY_TOP = "top-2 sm:top-3";

export const cn = (...c: (string | false | null | undefined)[]) => c.filter(Boolean).join(" ");

export const fmtDate = (d: string) =>
  new Date(d).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });

export const money = (n: number | string) => `Rs ${Number(n || 0).toLocaleString()}`;

export function timeAgo(d: string) {
  const s = Math.max(1, Math.floor((Date.now() - new Date(d).getTime()) / 1000));
  if (s < 60) return "just now";
  const m = Math.floor(s / 60);
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  const days = Math.floor(h / 24);
  return days < 7 ? `${days}d ago` : fmtDate(d);
}

export const titleCase = (s: string) =>
  s.replace(/[-_]/g, " ").replace(/^\w/, (c) => c.toUpperCase());

export type Tone = "ember" | "paper" | "sun";

export const TONE: Record<Tone, any> = {
  ember: {
    bg: "radial-gradient(90% 70% at 100% 0%, rgba(249,115,22,0.18), transparent 60%), linear-gradient(160deg, #2d2a6e 0%, #1e293b 100%)",
    shell: "border-white/10 shadow-[0_24px_50px_-26px_rgba(15,23,42,0.85)] group-hover:shadow-[0_34px_60px_-26px_rgba(249,115,22,0.4)]",
    light: "rgba(255,255,255,0.08)",
    muted: "text-slate-300",
    soft: "text-slate-400",
    row: "bg-white/5 ring-1 ring-white/10 hover:bg-white/10",
    icon: "bg-white/10 text-orange-400 ring-1 ring-white/20",
    link: "text-orange-400 hover:text-orange-300",
    track: "bg-white/10",
  },
  paper: {
    bg: "radial-gradient(80% 60% at 0% 0%, rgba(255,255,255,0.95), transparent 60%), radial-gradient(70% 60% at 100% 100%, rgba(249,115,22,0.12), transparent 60%), linear-gradient(160deg, #fffaf4 0%, #fff3e6 100%)",
    shell: "border-orange-100 shadow-[0_18px_40px_-26px_rgba(154,52,18,0.2)] group-hover:shadow-[0_30px_55px_-26px_rgba(154,52,18,0.3)]",
    light: "rgba(255,255,255,0.8)",
    muted: "text-slate-600",
    soft: "text-slate-500",
    row: "bg-white/80 ring-1 ring-orange-50 hover:bg-white",
    icon: "bg-gradient-to-br from-orange-500 to-amber-400 text-white shadow-lg shadow-orange-500/30",
    link: "text-orange-600 hover:text-orange-700",
    track: "bg-orange-100",
  },
  sun: {
    bg: "radial-gradient(70% 60% at 100% 0%, rgba(255,255,255,0.35), transparent 60%), radial-gradient(60% 60% at 0% 100%, rgba(190,60,0,0.14), transparent 60%), linear-gradient(135deg, #fb8a3c 0%, #fdac66 60%, #fcd34d 100%)",
    shell: "border-orange-400/30 shadow-[0_24px_50px_-26px_rgba(234,88,12,0.6)] group-hover:shadow-[0_34px_60px_-26px_rgba(234,88,12,0.8)]",
    light: "rgba(255,255,255,0.25)",
    muted: "text-white/90",
    soft: "text-white/80",
    row: "bg-white/20 ring-1 ring-white/30 hover:bg-white/30",
    icon: "bg-white/20 text-white ring-1 ring-white/40",
    link: "text-white underline-offset-4 hover:underline",
    track: "bg-white/20",
  },
};

export const TONE_TEXT: Record<Tone, string> = {
  ember: "text-white",
  paper: "text-slate-900",
  sun: "text-white",
};

export const Z = "[transform:translateZ(26px)]";
export const Z_SM = "[transform:translateZ(14px)]";