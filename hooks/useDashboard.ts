"use client";
import useSWR from "swr";
import { CalendarDays, Crown, LayoutTemplate, Phone, ShieldCheck } from "lucide-react";
import { fetcher, type Billing, type DashboardUser, type Overview } from "@/lib/validations/user";

export type ProfileRow = { icon: React.ElementType; label: string; value: string; chip?: boolean };

export function useProfile(user: DashboardUser) {
  const { data: billing } = useSWR<Billing>("/user/dashboard/billing", fetcher);
  const { data: overview } = useSWR<Overview>("/user/dashboard/overview", fetcher);
  const sub = billing?.activeSubscription;
  const planName = sub?.plan_name || "Free Tier";
  const isFree = !!billing && !sub;
  const fullName = `${user.first_name} ${user.last_name || ""}`.trim();
  const memberSince = user.created_at
    ? new Date(user.created_at).toLocaleDateString("en-US", { month: "short", year: "numeric", timeZone: "UTC" })
    : null;
  const rows = [
    { icon: ShieldCheck, label: "Plan", value: planName, chip: true },
    memberSince && { icon: CalendarDays, label: "Member since", value: memberSince },
    overview?.planUsage && { icon: LayoutTemplate, label: "Simple templates", value: String(overview.planUsage.max_simple_templates) },
    overview?.planUsage && { icon: Crown, label: "Premium templates", value: String(overview.planUsage.max_premium_templates) },
    user.phone_number && { icon: Phone, label: "Phone", value: user.phone_number },
  ].filter(Boolean) as ProfileRow[];
  return { planName, isFree, fullName, rows };
}