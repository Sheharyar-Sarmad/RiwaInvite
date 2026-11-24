"use client";

/**
 * components/user/sections/rehearsal/usePlanAllowance.ts
 * Reads the user's plan allowance and unlocks templates with it.
 */

import * as React from "react";
import { apiClient } from "@/lib/api/api_base";

export type Bucket = { max: number; used: number; left: number };

export type UnlockedTemplate = {
  id: string;
  name: string;
  description: string;
  category_name: string;
  thumbnail_url: string;
  is_premium: boolean;
  price: number;
};

export type PlanAllowance = {
  subscription: { id: string; planName: string; expiresAt: string; daysRemaining: number } | null;
  simple: Bucket;
  premium: Bucket;
  unlocked: UnlockedTemplate[];
};

export type UnlockResult = {
  template: { id: string; name: string; isPremium: boolean };
  alreadyUnlocked: boolean;
  allowance: PlanAllowance;
};

const KEY = "/user/dashboard/plan-allowance";
const unlockPath = (id: string) => `/user/dashboard/templates/${encodeURIComponent(id)}/unlock`;

/** Slots left for a template of this kind, or null when there is no live plan. */
export function slotsLeft(a: PlanAllowance | null, isPremium: boolean): number | null {
  if (!a?.subscription) return null;
  return (isPremium ? a.premium : a.simple).left;
}

function messageOf(err: unknown): string {
  const r = (err as { response?: { status?: number; data?: any } } | null)?.response;
  const fromApi = r?.data?.error?.message ?? r?.data?.message ?? (typeof r?.data?.error === "string" ? r.data.error : "");
  if (typeof fromApi === "string" && fromApi.trim()) return fromApi;
  switch (r?.status) {
    case 401:
      return "Your session expired. Please sign in again.";
    case 403:
      return "Your plan has no unlocks left for this kind of template.";
    case 409:
      return "You already own this template.";
    default:
      return "We couldn’t unlock it. Nothing was used. Please try again.";
  }
}

export function usePlanAllowance() {
  const [data, setData] = React.useState<PlanAllowance | null>(null);
  const [status, setStatus] = React.useState<"loading" | "ready" | "error">("loading");
  const [attempt, setAttempt] = React.useState(0);

  React.useEffect(() => {
    let cancelled = false;
    setStatus("loading");
    (async () => {
      try {
        const res = await apiClient.get(KEY);
        if (cancelled) return;
        setData((res.data?.data ?? null) as PlanAllowance | null);
        setStatus("ready");
      } catch {
        if (!cancelled) setStatus("error");
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [attempt]);

  /** Spends one slot. Throws an Error with a user-ready message on failure. */
  const unlock = React.useCallback(async (templateId: string): Promise<UnlockResult> => {
    try {
      const res = await apiClient.post(unlockPath(templateId));
      const d = res.data?.data as UnlockResult;
      if (d?.allowance) setData(d.allowance);
      return d;
    } catch (err) {
      throw new Error(messageOf(err));
    }
  }, []);

  const retry = React.useCallback(() => setAttempt((n) => n + 1), []);
  return { data, status, unlock, retry };
}