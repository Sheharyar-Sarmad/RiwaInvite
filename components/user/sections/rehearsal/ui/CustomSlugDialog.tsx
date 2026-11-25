"use client";

import * as React from "react";
import { Check, Link2, Loader2, X } from "lucide-react";
import { apiClient } from "@/lib/api/api_base";
import { cn } from "@/components/user/sections/dashboard/ui/DashboardUI";

// ⚠ Point this at your real check-slug route (the GET that returns { available }).
const SLUG_CHECK = "/user/dashboard/invitations/check-slug";
const SLUG_RE = /^[a-z0-9](?:[a-z0-9-]{1,58}[a-z0-9])$/;

export const normalizeSlug = (s: string) =>
  s
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9-]/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");

export type SlugState =
  | "empty"
  | "invalid"
  | "checking"
  | "available"
  | "taken"
  | "error";

export function useSlugAvailability(raw: string) {
  const slug = normalizeSlug(raw);
  const [state, setState] = React.useState<SlugState>("empty");

  React.useEffect(() => {
    if (!raw.trim()) return setState("empty");
    if (!SLUG_RE.test(slug)) return setState("invalid");
    setState("checking");
    let cancelled = false;
    const t = window.setTimeout(async () => {
      try {
        const res = await apiClient.get(SLUG_CHECK, { params: { slug } });
        if (!cancelled) setState(res.data?.available ? "available" : "taken");
      } catch {
        if (!cancelled) setState("error");
      }
    }, 400);
    return () => {
      cancelled = true;
      window.clearTimeout(t);
    };
  }, [raw, slug]);

  return { slug, state };
}

const MSG: Record<SlugState, string> = {
  empty: "Letters, numbers and dashes. At least 3 characters.",
  invalid: "Use at least 3 letters, numbers or dashes.",
  checking: "Checking…",
  available: "This link is free.",
  taken: "That link is taken. Try another.",
  error: "Couldn’t check right now. Try again.",
};

export function CustomSlugField({
  value,
  onChange,
  state,
  slug,
  disabled,
}: {
  value: string;
  onChange: (v: string) => void;
  state: SlugState;
  slug: string;
  disabled?: boolean;
}) {
  const origin = typeof window !== "undefined" ? window.location.origin : "";
  const bad = state === "taken" || state === "invalid" || state === "error";
  return (
    <div className="space-y-1.5">
      <div className="relative">
        <Link2 className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-stone-400" />
        <input
          value={value}
          disabled={disabled}
          maxLength={60}
          onChange={(e) => onChange(e.target.value)}
          placeholder="sara-and-ali"
          aria-label="Custom link"
          aria-invalid={bad}
          className="h-11 w-full rounded-xl border border-black/[0.1] bg-white pl-9 pr-9 text-sm font-medium text-[#2a1002] outline-none hover:border-orange-300 focus:border-orange-500 focus-visible:ring-2 focus-visible:ring-orange-500/30"
        />
        <span className="absolute right-3 top-1/2 -translate-y-1/2">
          {state === "checking" && (
            <Loader2 className="size-4 animate-spin text-stone-400" />
          )}
          {state === "available" && (
            <Check className="size-4 text-emerald-600" />
          )}
          {bad && <X className="size-4 text-rose-600" />}
        </span>
      </div>
      {slug && (
        <p className="truncate text-xs text-stone-500">
          {origin}/invite/<b className="text-[#2a1002]">{slug}</b>
        </p>
      )}
      <p
        className={cn(
          "text-xs",
          bad
            ? "text-rose-600"
            : state === "available"
              ? "text-emerald-700"
              : "text-stone-500",
        )}
      >
        {MSG[state]}
      </p>
    </div>
  );
}