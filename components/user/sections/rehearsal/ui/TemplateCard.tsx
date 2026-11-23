"use client";

/**
 * components/user/sections/rehearsal/ui/TemplateCard.tsx
 *
 * Template card for the Rehearsal picker.
 *
 *  - Images: the URL is normalised (protocol-relative, bare paths), the <img> is
 *    checked for the "already loaded before hydration" case, and any failure
 *    falls back to a neutral placeholder tile instead of a broken icon.
 *  - Ownership:
 *      purchased     -> green badge, full-colour preview, "Create invitation" + "Rehearse"
 *      not purchased -> lock chip, softly blurred preview (clears on hover/focus),
 *                       price tag, "Unlock" + "Try free"
 *  - Scroll reveal: IntersectionObserver, plays once, skipped for reduced motion.
 *
 * Replaces `RehearsalTemplateCard` and `PickerThumb` in RehearsalStudioUI.tsx.
 */

import * as React from "react";
import Link from "next/link";
import { ArrowUpRight, BadgeCheck, Lock, PenTool } from "lucide-react";
import { BTN, HEADING, cn, money } from "@/components/user/sections/dashboard/ui/DashboardUI";
import { FOCUS } from "@/components/user/navigation/UserSidebar";
import { IcCrown, IcImageOff, LIBRARY_ROUTES, SURFACE } from "@/components/user/sections/library/ui/LibraryUI";
import type { PublicTemplate } from "./RehearsalStudioUI";

/* ========================================================================== */
/*  Image helpers                                                             */
/* ========================================================================== */

/**
 * Turns whatever the API returned into something an <img> can load.
 * Handles "//cdn..." (protocol-relative) and "uploads/x.png" (missing leading slash).
 * Returns "" for empty input so the caller can show the placeholder.
 */
export function resolveThumb(src: string): string {
  const s = src.trim();
  if (!s) return "";
  if (/^(https?:|data:|blob:)/i.test(s)) return s;
  if (s.startsWith("//")) return `https:${s}`;
  return s.startsWith("/") ? s : `/${s}`;
}

/** Image with a skeleton behind it and a placeholder when it cannot load. */
function Thumb({ src, soft }: { src: string; soft: boolean }) {
  const url = resolveThumb(src);
  const ref = React.useRef<HTMLImageElement>(null);
  const [state, setState] = React.useState<"loading" | "ok" | "failed">(url ? "loading" : "failed");

  /* A cached image can finish loading before React attaches onLoad, so check once on mount. */
  React.useEffect(() => {
    if (!url) {
      setState("failed");
      return;
    }
    const img = ref.current;
    setState(img?.complete && img.naturalWidth > 0 ? "ok" : "loading");
  }, [url]);

  if (!url || state === "failed") {
    return (
      <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 bg-gradient-to-br from-stone-100 to-stone-200 text-stone-400">
        <IcImageOff className="size-7 sm:size-8" />
        <span className="text-[11px] font-semibold">No preview yet</span>
      </div>
    );
  }

  return (
    <>
      {state === "loading" && <div aria-hidden className="absolute inset-0 animate-pulse bg-stone-200/70 motion-reduce:animate-none" />}
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        key={url}
        ref={ref}
        src={url}
        alt=""
        loading="lazy"
        decoding="async"
        referrerPolicy="no-referrer"
        onLoad={() => setState("ok")}
        onError={() => setState("failed")}
        className={cn(
          "absolute inset-0 size-full object-cover transition duration-700 ease-out motion-reduce:transition-none",
          soft
            ? "scale-105 blur-[3px] saturate-[0.8] group-hover/card:scale-100 group-hover/card:blur-0 group-hover/card:saturate-100 group-focus-within/card:scale-100 group-focus-within/card:blur-0 group-focus-within/card:saturate-100"
            : "group-hover/card:scale-[1.03]",
        )}
      />
    </>
  );
}

/* ========================================================================== */
/*  Scroll reveal                                                             */
/* ========================================================================== */

/**
 * Flips `shown` to true the first time the element enters the viewport, then stops observing.
 * With reduced motion (or no IntersectionObserver) it is shown immediately.
 */
function useReveal<T extends HTMLElement>() {
  const ref = React.useRef<T>(null);
  const [shown, setShown] = React.useState(false);

  React.useEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (typeof IntersectionObserver === "undefined" || window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      setShown(true);
      return;
    }
    const io = new IntersectionObserver(
      (entries) => {
        if (entries.some((e) => e.isIntersecting)) {
          setShown(true);
          io.disconnect();
        }
      },
      { threshold: 0.12, rootMargin: "0px 0px -32px 0px" },
    );
    io.observe(el);
    return () => io.disconnect();
  }, []);

  return { ref, shown };
}

/* ========================================================================== */
/*  Card                                                                      */
/* ========================================================================== */

const THUMB_RATIO = "aspect-[16/10] sm:aspect-[5/4]";
const CTA = "inline-flex h-11 min-w-0 flex-1 items-center justify-center gap-1.5 rounded-xl px-3 text-xs font-semibold transition active:scale-[0.98]";

export function RehearsalTemplateCard({
  t,
  index,
  hasDraft,
  onPick,
  onCreate,
  unlockHref = () => LIBRARY_ROUTES.browse,
}: {
  t: PublicTemplate;
  index: number;
  hasDraft: boolean;
  /** Opens the template in the editor. */
  onPick: (id: string) => void;
  /** Optional. Without it, "Create invitation" links to the standard create page. */
  onCreate?: (id: string) => void;
  /** Where "Unlock" goes. */
  unlockHref?: (id: string) => string;
}) {
  const owned = !!t.owned;
  const { ref, shown } = useReveal<HTMLLIElement>();
  const free = t.price <= 0;

  return (
    <li
      ref={ref}
      style={{ transitionDelay: shown ? `${Math.min(index % 6, 5) * 45}ms` : "0ms" }}
      className={cn(
        "group/card min-w-0 transition duration-500 ease-out motion-reduce:translate-y-0 motion-reduce:opacity-100 motion-reduce:transition-none",
        shown ? "translate-y-0 opacity-100" : "translate-y-4 opacity-0",
      )}
    >
      <article
        className={cn(
          "relative flex h-full flex-col overflow-hidden rounded-2xl",
          SURFACE,
          owned && "ring-1 ring-emerald-300/70",
          "transition-[transform,box-shadow] duration-300 motion-reduce:transition-none hover:-translate-y-0.5 hover:shadow-[0_1px_2px_rgba(28,20,16,0.05),0_22px_40px_-20px_rgba(28,20,16,0.32)]",
        )}
      >
        <button
          type="button"
          onClick={() => onPick(t.id)}
          aria-label={`${owned ? "Open" : "Try"} ${t.name} in Rehearsal Studio`}
          className={cn("relative block w-full overflow-hidden bg-stone-100 text-left", THUMB_RATIO, FOCUS)}
        >
          <Thumb src={t.thumbnail_url} soft={!owned} />
          <div aria-hidden className="pointer-events-none absolute inset-0 ring-1 ring-inset ring-black/[0.05]" />

          {!owned && (
            <div
              aria-hidden
              className="pointer-events-none absolute inset-0 bg-gradient-to-t from-stone-950/55 via-stone-950/10 to-transparent transition-opacity duration-300 group-hover/card:opacity-30"
            />
          )}

          <div className="absolute left-2 top-2 flex flex-col items-start gap-1 sm:left-3 sm:top-3">
            {owned ? (
              <span className="inline-flex items-center gap-1 rounded-full bg-emerald-600 px-2 py-0.5 text-[10px] font-bold text-white shadow-sm sm:px-2.5 sm:py-1 sm:text-[11px]">
                <BadgeCheck className="size-3 sm:size-3.5" /> Purchased
              </span>
            ) : (
              <span className="inline-flex items-center gap-1 rounded-full bg-white/90 px-2 py-0.5 text-[10px] font-semibold text-stone-700 shadow-sm ring-1 ring-black/10 backdrop-blur-md sm:px-2.5 sm:py-1 sm:text-[11px]">
                <Lock className="size-3 sm:size-3.5" /> Locked
              </span>
            )}
            {t.is_premium && (
              <span className="inline-flex items-center gap-1.5 rounded-full bg-neutral-900/90 px-2 py-0.5 text-[10px] font-semibold text-amber-200 shadow-sm ring-1 ring-white/10 backdrop-blur-md sm:px-2.5 sm:py-1 sm:text-[11px]">
                <IcCrown className="size-3 sm:size-3.5" /> Premium
              </span>
            )}
          </div>

          {hasDraft && (
            <span className="absolute right-2 top-2 rounded-full bg-orange-500 px-2 py-0.5 text-[10px] font-bold text-white shadow-sm sm:right-3 sm:top-3">
              In progress
            </span>
          )}

          {!owned && (
            <span className="absolute bottom-2 left-2 rounded-lg bg-neutral-900/85 px-2.5 py-1 text-xs font-bold tabular-nums text-white shadow-md ring-1 ring-white/10 backdrop-blur-md sm:bottom-3 sm:left-3">
              {free ? "Free" : money(t.price)}
            </span>
          )}
        </button>

        <div className="flex flex-1 flex-col gap-2.5 p-2.5 sm:gap-3 sm:p-4">
          <div className="flex flex-col gap-1">
            <p className="truncate text-[11px] font-semibold uppercase leading-4 tracking-[0.06em] text-stone-500">{t.category_name || "Template"}</p>
            <h3 className={cn(HEADING, "h-6 truncate text-[15px] leading-6 tracking-[-0.01em] text-[#2a1002] sm:text-base")} title={t.name}>
              {t.name}
            </h3>
            <p className="line-clamp-2 h-8 text-xs leading-4 text-stone-500 sm:h-10 sm:leading-5">
              {t.description || "No description added for this template."}
            </p>
          </div>

          <div className="mt-auto flex gap-2">
            {owned ? (
              <>
                {onCreate ? (
                  <button type="button" onClick={() => onCreate(t.id)} className={cn(BTN, CTA)}>
                    Create invitation <ArrowUpRight className="size-3.5" />
                  </button>
                ) : (
                  <Link href={LIBRARY_ROUTES.create(t.id)} className={cn(BTN, CTA, FOCUS)}>
                    Create invitation <ArrowUpRight className="size-3.5" />
                  </Link>
                )}
                <button
                  type="button"
                  onClick={() => onPick(t.id)}
                  className={cn(CTA, "flex-none border border-black/[0.08] bg-white text-stone-700 hover:border-orange-300 hover:text-orange-600", FOCUS)}
                  aria-label={hasDraft ? `Continue rehearsing ${t.name}` : `Rehearse ${t.name}`}
                >
                  <PenTool className="size-3.5" />
                  <span className="max-[400px]:hidden">{hasDraft ? "Continue" : "Rehearse"}</span>
                </button>
              </>
            ) : (
              <>
                <button
                  type="button"
                  onClick={() => onPick(t.id)}
                  className={cn(CTA, "border border-black/[0.08] bg-white text-stone-700 hover:border-orange-300 hover:text-orange-600", FOCUS)}
                >
                  <PenTool className="size-3.5" /> {hasDraft ? "Continue" : "Try free"}
                </button>
                <Link
                  href={unlockHref(t.id)}
                  aria-label={`Unlock ${t.name}`}
                  className={cn(CTA, "bg-neutral-900 text-white shadow-sm ring-1 ring-black/10 hover:bg-neutral-800", FOCUS)}
                >
                  <Lock className="size-3.5 text-amber-300" /> Unlock
                </Link>
              </>
            )}
          </div>
        </div>
      </article>
    </li>
  );
}