import { z } from "zod";

export const updateUserSettingsSchema = z.object({
  currentPassword: z.string().min(1, "Current password is required to make changes"),
  firstName: z.string().min(2, "First name must be at least 2 characters").optional(),
  lastName: z.string().min(2, "Last name must be at least 2 characters").optional(),
  email: z.string().email("Invalid email format").optional(),
  phoneNumber: z.string().regex(/^\+?[1-9]\d{1,14}$/, "Invalid phone number format").optional(),
  newPassword: z.string().min(8, "New password must be at least 8 characters").optional(),
});

import { apiClient } from "@/lib/api/api_base";

export type DashboardUser = {
  id: string; email: string; first_name: string; last_name?: string; phone_number?: string; created_at?: string;
};
export type Overview = {
  stats: { totalInvitations: number; activeInvitations: number; totalRSVPs: number; totalGuests: number; rsvpsThisWeek: number; guestsThisWeek: number };
  actionItems: { unclaimedCustomSlugs: number };
  recentInvitations: { id: string; title: string; status: string; slug: string | null; created_at: string; rsvp_count: number }[];
  mostActiveInvitation: { id: string; title: string; rsvp_count: number } | null;
  recentRSVPs: { guest_name: string; attendance_status: string; number_of_guests: number; created_at: string; invitation_title: string }[];
  planUsage: { max_simple_templates: number; max_premium_templates: number };
};
export type Analytics = {
  rsvpTrend: { date: string; accepted: number; declined: number }[];
  guestBreakdown: { accepted: number; declined: number; pending: number };
  topInvitations: { title: string; total_rsvps: number }[];
  hourlyRSVPs: { time_of_day: string; count: number }[];
  totalPlusOnes: number;
};
export type ActivityItem = { id: string; title: string; message: string; type: "notification" | "rsvp" | "order"; created_at: string };
export type Billing = {
  activeSubscription: { id: string; plan_name: string; price: number | string; status: string; expires_at: string } | null;
  recentOrders: { id: string; provider_order_id: string; amount: number | string; order_type: string; status: string; created_at: string }[];
  lifetimeSpend: number;
};

export const fetcher = (url: string) => apiClient.get(url).then((r) => r.data.data);

export const EASE = [0.16, 1, 0.3, 1] as const;
export const VIEW = { once: true, amount: 0.15 } as const;
export const STICKY_TOP = "top-2 sm:top-3";

export const cn = (...c: (string | false | null | undefined)[]) => c.filter(Boolean).join(" ");
export const fmtDate = (d: string) =>
  new Date(d).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
export const money = (n: number | string) => `Rs ${Number(n || 0).toLocaleString()}`;
export const titleCase = (s: string) => s.replace(/[-_]/g, " ").replace(/^\w/, (c) => c.toUpperCase());
export function timeAgo(d: string) {
  const s = Math.max(1, Math.floor((Date.now() - new Date(d).getTime()) / 1000));
  if (s < 60) return "just now";
  const m = Math.floor(s / 60); if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60); if (h < 24) return `${h}h ago`;
  const days = Math.floor(h / 24);
  return days < 7 ? `${days}d ago` : fmtDate(d);
}

/** Design tokens: warm only. No raw white, no blue/pink. */
export const TOKENS = {
  cream: "#fffbf7", peach: "#fff7ed", obsidian: "#120a05",
  orange: "#ea580c", amber: "#f59e0b", ember: "#b91c1c",
  emerald: "#10b981", rose: "#e11d48", sand: "#fed7aa",
} as const;