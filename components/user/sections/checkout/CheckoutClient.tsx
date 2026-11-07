"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import { createPortal } from "react-dom";
import {
  motion,
  AnimatePresence,
  animate,
  useReducedMotion,
  type Variants,
} from "framer-motion";
import {
  ArrowLeft,
  AlertTriangle,
  Check,
  Loader2,
  Lock,
  ShieldCheck,
  Sparkles,
  Wallet,
  X,
  Zap,
  Globe,
} from "lucide-react";
import { apiClient } from "@/lib/api/api_base";

/* ------------------------------------------------------------------ */
/* Types & constants                                                   */
/* ------------------------------------------------------------------ */

type ItemData = {
  name: string;
  price: number;
  image: string | null;
  category: string;
  customSlugPrice: number;
  allowsCustomSlug: boolean;
};

const STAGES = [
  { title: "Verifying connection", hint: "Checking your session" },
  { title: "Encrypting your order", hint: "Sealing payment details" },
  { title: "Opening payment handler", hint: "Redirecting to the secure gateway" },
];

const EASE = [0.16, 1, 0.3, 1] as const;
const HOST = "riwainvite.com/invite/";
const cn = (...c: (string | false | undefined)[]) => c.filter(Boolean).join(" ");

const stagger: Variants = {
  hidden: {},
  show: { transition: { staggerChildren: 0.08, delayChildren: 0.05 } },
};
const rise: Variants = {
  hidden: { opacity: 0, y: 18 },
  show: { opacity: 1, y: 0, transition: { duration: 0.7, ease: EASE } },
};

const rs = (n: number) => `Rs ${n.toLocaleString()}`;

/* Card surfaces shared with WhyRiwainvite */
const DARK_BG =
  "radial-gradient(90% 70% at 100% 0%, rgba(249,115,22,0.28), transparent 60%), radial-gradient(70% 60% at 0% 100%, rgba(99,102,241,0.25), transparent 60%), linear-gradient(160deg, #1b2249 0%, #0a0e1f 100%)";
const PAPER_BG =
  "radial-gradient(80% 60% at 0% 0%, rgba(255,255,255,0.65), transparent 60%), radial-gradient(70% 60% at 100% 100%, rgba(249,115,22,0.22), transparent 60%), linear-gradient(160deg, #fff1e2 0%, #ffd9b3 100%)";
const SUN_BG =
  "radial-gradient(70% 60% at 100% 0%, rgba(255,255,255,0.38), transparent 60%), radial-gradient(60% 60% at 0% 100%, rgba(190,60,0,0.38), transparent 60%), linear-gradient(135deg, #f97316 0%, #fb923c 60%, #fbbf24 100%)";

/* ------------------------------------------------------------------ */
/* Dotted orange background (cursor reactive)                          */
/* ------------------------------------------------------------------ */

function DottedBackground({ reduce }: { reduce: boolean }) {
  const mask =
    "radial-gradient(230px circle at var(--mx,-999px) var(--my,-999px), #000 0%, transparent 100%)";
  return (
    <div aria-hidden className="pointer-events-none absolute inset-0 -z-10">
      <div className="absolute inset-0 bg-gradient-to-b from-[#fff4ea] to-[#fbdcc0]" />
      <motion.div
        animate={reduce ? undefined : { x: [0, 60, 0], y: [0, 30, 0] }}
        transition={{ duration: 18, repeat: Infinity, ease: "easeInOut" }}
        className="absolute -left-32 top-10 h-[420px] w-[420px] rounded-full bg-orange-300/30 blur-[120px]"
      />
      <motion.div
        animate={reduce ? undefined : { x: [0, -50, 0], y: [0, -40, 0] }}
        transition={{ duration: 22, repeat: Infinity, ease: "easeInOut" }}
        className="absolute -right-32 bottom-0 h-[420px] w-[420px] rounded-full bg-amber-300/30 blur-[120px]"
      />
      <div
        className="absolute inset-0"
        style={{
          backgroundImage: "radial-gradient(circle, rgba(194,65,12,0.2) 1.5px, transparent 1.5px)",
          backgroundSize: "24px 24px",
        }}
      />
      <div
        className="absolute inset-0"
        style={{
          backgroundImage: "radial-gradient(circle, rgba(234,88,12,0.95) 2px, transparent 2px)",
          backgroundSize: "24px 24px",
          maskImage: mask,
          WebkitMaskImage: mask,
        }}
      />
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Small pieces                                                        */
/* ------------------------------------------------------------------ */

function AnimatedPrice({ value, prefix = "Rs " }: { value: number; prefix?: string }) {
  const [display, setDisplay] = useState(value);
  const from = useRef(value);

  useEffect(() => {
    const controls = animate(from.current, value, {
      duration: 0.7,
      ease: EASE,
      onUpdate: (v) => {
        from.current = v;
        setDisplay(Math.round(v));
      },
    });
    return () => controls.stop();
  }, [value]);

  return (
    <span className="tabular-nums">
      {prefix}
      {display.toLocaleString()}
    </span>
  );
}

function Skeleton() {
  return (
    <div className="mx-auto grid min-h-dvh w-full max-w-6xl gap-6 p-4 sm:p-8 lg:grid-cols-[1fr_1.05fr]">
      <div className="h-[520px] animate-pulse rounded-[28px] bg-[#141a3a]/90" />
      <div className="space-y-4 py-6">
        <div className="h-4 w-24 animate-pulse rounded bg-orange-200/70" />
        <div className="h-10 w-3/4 animate-pulse rounded bg-orange-200/70" />
        <div className="mt-8 h-40 animate-pulse rounded-3xl bg-orange-200/50" />
        <div className="h-20 animate-pulse rounded-3xl bg-orange-200/50" />
        <div className="h-14 animate-pulse rounded-2xl bg-orange-300/70" />
      </div>
    </div>
  );
}

function Switch({
  checked,
  onChange,
  label,
}: {
  checked: boolean;
  onChange: (v: boolean) => void;
  label: string;
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label}
      onClick={() => onChange(!checked)}
      className={cn(
        "relative inline-flex h-7 w-12 shrink-0 cursor-pointer items-center rounded-full transition-colors duration-300 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-orange-300/60",
        checked ? "bg-gradient-to-r from-orange-500 to-amber-400" : "bg-orange-900/20"
      )}
    >
      <motion.span
        layout
        transition={{ type: "spring", stiffness: 500, damping: 32 }}
        className={cn(
          "inline-block h-5 w-5 rounded-full bg-white shadow",
          checked ? "ml-[26px]" : "ml-[4px]"
        )}
      />
    </button>
  );
}

function AccentBar({ tone = "orange" }: { tone?: "orange" | "white" }) {
  return (
    <span
      className={cn("mb-3 block h-1 w-8 rounded-full", tone === "white" ? "bg-white" : "bg-orange-500")}
    />
  );
}

/* ------------------------------------------------------------------ */
/* Main                                                                */
/* ------------------------------------------------------------------ */

export function CheckoutClient() {
  const params = useParams();
  const router = useRouter();
  const isTemplate = params.type === "template";
  const reduce = useReducedMotion() ?? false;

  const rootRef = useRef<HTMLDivElement>(null);
  const raf = useRef(0);

  const [isLoading, setIsLoading] = useState(true);
  const [isProcessing, setIsProcessing] = useState(false);
  const [stage, setStage] = useState(0);
  const [error, setError] = useState("");
  const [mounted, setMounted] = useState(false);
  const [item, setItem] = useState<ItemData | null>(null);

  // Custom slug
  const [wantsSlug, setWantsSlug] = useState(false);
  const [slug, setSlug] = useState("");
  const [isCheckingSlug, setIsCheckingSlug] = useState(false);
  const [slugError, setSlugError] = useState("");
  const [slugAvailable, setSlugAvailable] = useState(false);

  useEffect(() => setMounted(true), []);

  // Cursor-reactive dot grid, one update per frame
  const onMove = useCallback((e: React.PointerEvent) => {
    if (e.pointerType === "touch") return;
    const { clientX: x, clientY: y } = e;
    cancelAnimationFrame(raf.current);
    raf.current = requestAnimationFrame(() => {
      rootRef.current?.style.setProperty("--mx", `${x}px`);
      rootRef.current?.style.setProperty("--my", `${y}px`);
    });
  }, []);
  useEffect(() => () => cancelAnimationFrame(raf.current), []);

  useEffect(() => {
    document.body.style.overflow = isProcessing ? "hidden" : "";
    return () => {
      document.body.style.overflow = "";
    };
  }, [isProcessing]);

  useEffect(() => {
    if (!isProcessing) return;
    setStage(0);
    const id = setInterval(
      () => setStage((s) => Math.min(s + 1, STAGES.length - 1)),
      1000
    );
    return () => clearInterval(id);
  }, [isProcessing]);

  // Auto-dismiss errors
  useEffect(() => {
    if (!error) return;
    const id = setTimeout(() => setError(""), 6000);
    return () => clearTimeout(id);
  }, [error]);

  /* ---------------------------- data ---------------------------- */

  useEffect(() => {
    const fetchItem = async () => {
      try {
        if (isTemplate) {
          const res = await apiClient.get(`/public/template/${params.id}`);
          if (res.data.status === "success") {
            const data = res.data.data;
            setItem({
              name: data.name,
              price: data.price,
              image: data.thumbnailUrl,
              category: data.categoryName || "Template",
              customSlugPrice: data.customSlugPrice || 1000,
              allowsCustomSlug: data.allowsCustomSlug !== false,
            });
          } else {
            setError("Failed to load template details.");
          }
        } else {
          const res = await apiClient.get(`/public/plans/all`);
          if (res.data.status === "success") {
            const plan = res.data.data.plans.find((p: any) => p.id === params.id);
            if (plan) {
              setItem({
                name: plan.name,
                price: plan.price,
                image: null,
                category: "Subscription plan",
                customSlugPrice: 0,
                allowsCustomSlug: false,
              });
            } else {
              setError("Plan not found.");
            }
          } else {
            setError("Failed to load plan details.");
          }
        }
      } catch (err) {
        console.error(err);
        setError("Failed to load order details.");
      } finally {
        setIsLoading(false);
      }
    };
    fetchItem();
  }, [params.id, isTemplate]);

  /* ---------------------- slug availability --------------------- */

  const handleSlugChange = (raw: string) => {
    setSlug(raw.toLowerCase().replace(/[^a-z0-9-]/g, "-"));
  };

  useEffect(() => {
    if (!wantsSlug || !slug) {
      setSlugAvailable(false);
      setSlugError("");
      setIsCheckingSlug(false);
      return;
    }
    if (slug.length < 3) {
      setSlugError("Use at least 3 characters.");
      setSlugAvailable(false);
      setIsCheckingSlug(false);
      return;
    }

    let cancelled = false;
    setIsCheckingSlug(true);
    setSlugAvailable(false);
    setSlugError("");

    const t = setTimeout(async () => {
      try {
        const res = await apiClient.get(
          `/public/check-slug?slug=${encodeURIComponent(slug)}`
        );
        if (cancelled) return;
        if (res.data.available) {
          setSlugError("");
          setSlugAvailable(true);
        } else {
          setSlugError("This link is taken. Try another.");
          setSlugAvailable(false);
        }
      } catch {
        if (cancelled) return;
        setSlugError("Couldn't check availability. Try again.");
        setSlugAvailable(false);
      } finally {
        if (!cancelled) setIsCheckingSlug(false);
      }
    }, 500);

    return () => {
      cancelled = true;
      clearTimeout(t);
    };
  }, [slug, wantsSlug]);

  /* --------------------------- checkout -------------------------- */

  const handleCheckout = async () => {
    if (wantsSlug && (!slugAvailable || slugError || isCheckingSlug)) {
      setError("Choose an available custom link, or turn the option off.");
      return;
    }

    setIsProcessing(true);
    setError("");
    const sceneTimer = new Promise((resolve) => setTimeout(resolve, 3000));

    try {
      const [res] = await Promise.all([
        apiClient.post("/user/dashboard/checkout", {
          itemType: params.type,
          itemId: params.id,
          wantsCustomSlug: isTemplate ? wantsSlug : false,
          preferredSlug: wantsSlug ? slug : undefined,
        }),
        sceneTimer,
      ]);

      if (res.data.status === "success") {
        const data = res.data.data;
        if (data.isMock) {
          await apiClient.post("/webhooks/jazzcash", {
            pp_TxnRefNo: data.providerOrderId,
            pp_ResponseCode: "000",
            pp_ResponseMessage: "Success",
          });
          router.push(`/checkout/success?orderId=${data.orderId}`);
        } else {
          const form = document.createElement("form");
          form.method = "POST";
          form.action = data.gatewayUrl;
          Object.keys(data.payload).forEach((key) => {
            const input = document.createElement("input");
            input.type = "hidden";
            input.name = key;
            input.value = data.payload[key];
            form.appendChild(input);
          });
          document.body.appendChild(form);
          form.submit();
        }
      } else {
        setError("Couldn't start checkout. Please try again.");
        setIsProcessing(false);
      }
    } catch (err: any) {
      setError(err.response?.data?.message || "Couldn't start checkout. Please try again.");
      setIsProcessing(false);
    }
  };

  /* ---------------------------- render --------------------------- */

  if (isLoading) {
    return (
      <div className="relative isolate min-h-dvh overflow-hidden bg-[#fdeadb]">
        <DottedBackground reduce={reduce} />
        <Skeleton />
      </div>
    );
  }

  const slugActive = wantsSlug && !!item?.allowsCustomSlug;
  const finalPrice = item ? item.price + (slugActive ? item.customSlugPrice : 0) : 0;
  const slugBlocked = wantsSlug && (!slugAvailable || !!slugError || isCheckingSlug);

  return (
    <div
      ref={rootRef}
      onPointerMove={onMove}
      className="relative isolate min-h-dvh w-full overflow-hidden bg-[#fdeadb] font-[family-name:var(--font-body)] text-slate-900 antialiased"
    >
      <DottedBackground reduce={reduce} />

      {!item ? (
        <div className="relative mx-auto flex min-h-dvh max-w-md items-center justify-center p-6">
          <div
            className="w-full rounded-3xl border border-orange-900/10 p-8 text-center shadow-[0_18px_40px_-26px_rgba(154,52,18,0.5)]"
            style={{ backgroundImage: PAPER_BG }}
          >
            <span className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-red-50 text-red-600">
              <AlertTriangle className="h-5 w-5" />
            </span>
            <p className="font-[family-name:var(--font-display)] text-lg font-bold">
              We couldn&apos;t load this order
            </p>
            <p className="mt-1 text-sm font-medium text-slate-600">
              The item may have been removed, or your connection dropped.
            </p>
            <button
              onClick={() => router.back()}
              className="mt-6 inline-flex cursor-pointer items-center gap-2 rounded-2xl bg-gradient-to-br from-orange-500 to-amber-400 px-5 py-3 text-sm font-bold text-white shadow-lg shadow-orange-500/30 transition hover:brightness-105 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-orange-300/60"
            >
              <ArrowLeft className="h-4 w-4" /> Go back
            </button>
          </div>
        </div>
      ) : (
        <motion.main
          variants={stagger}
          initial={reduce ? "show" : "hidden"}
          animate="show"
          className="relative mx-auto grid w-full max-w-6xl gap-6 p-4 sm:p-8 lg:min-h-dvh lg:grid-cols-[1fr_1.05fr] lg:items-center lg:gap-10"
        >
          {/* ======================= LEFT: ORDER ======================= */}
          <motion.aside
            variants={rise}
            className="relative overflow-hidden rounded-[1.75rem] border border-white/10 p-6 text-slate-50 shadow-[0_24px_50px_-26px_rgba(10,14,31,0.9)] sm:p-8 lg:sticky lg:top-8 lg:self-start"
            style={{ backgroundImage: DARK_BG }}
          >
            <div
              aria-hidden
              className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-white/60 to-transparent"
            />

            <button
              onClick={() => router.back()}
              className="group relative inline-flex cursor-pointer items-center gap-2 rounded-lg text-sm font-semibold text-white/60 transition hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-400"
            >
              <ArrowLeft className="h-4 w-4 transition-transform group-hover:-translate-x-0.5" />
              Back
            </button>

            <div className="relative mt-6 flex items-center gap-4">
              {isTemplate && item.image ? (
                <div className="h-24 w-[72px] shrink-0 overflow-hidden rounded-xl bg-white/10 shadow-[0_12px_30px_-8px_rgba(0,0,0,0.6)] ring-1 ring-white/15 sm:h-28 sm:w-[84px]">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={item.image} alt={item.name} className="h-full w-full object-cover" />
                </div>
              ) : (
                <div className="flex h-24 w-[72px] shrink-0 items-center justify-center rounded-xl bg-gradient-to-b from-[#fb8a3c] to-[#f97316] shadow-[0_12px_30px_-8px_rgba(249,115,22,0.6)] sm:h-28 sm:w-[84px]">
                  <Sparkles className="h-7 w-7 text-white" />
                </div>
              )}
              <div className="min-w-0">
                <p className="text-sm font-semibold text-orange-300">{item.category}</p>
                <h2 className="mt-1 line-clamp-2 font-[family-name:var(--font-display)] text-2xl font-bold leading-tight tracking-tight sm:text-[28px]">
                  {item.name}
                </h2>
              </div>
            </div>

            <div className="relative mt-8 space-y-3 border-t border-dashed border-white/15 pt-6 text-sm">
              <div className="flex items-center justify-between">
                <span className="font-medium text-slate-300">{isTemplate ? "Template" : "Plan"}</span>
                <span className="font-bold tabular-nums">{rs(item.price)}</span>
              </div>

              <AnimatePresence initial={false}>
                {slugActive && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: "auto" }}
                    exit={{ opacity: 0, height: 0 }}
                    transition={{ duration: 0.35, ease: EASE }}
                    className="overflow-hidden"
                  >
                    <div className="flex items-center justify-between">
                      <span className="flex items-center gap-1.5 font-medium text-slate-300">
                        <Globe className="h-3.5 w-3.5 text-orange-300" /> Custom link
                      </span>
                      <span className="font-bold tabular-nums">{rs(item.customSlugPrice)}</span>
                    </div>
                    {slug && slugAvailable && (
                      <p className="mt-2 break-all rounded-lg bg-white/5 px-3 py-2 font-mono text-[11px] text-orange-200 ring-1 ring-white/10">
                        {HOST}
                        <span className="font-bold text-white">{slug}</span>
                      </p>
                    )}
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            {/* ticket notches */}
            <div aria-hidden className="relative -mx-6 my-6 sm:-mx-8">
              <span className="absolute -left-3 top-1/2 h-6 w-6 -translate-y-1/2 rounded-full bg-[#fdeadb]" />
              <span className="absolute -right-3 top-1/2 h-6 w-6 -translate-y-1/2 rounded-full bg-[#fdeadb]" />
              <div className="mx-6 border-t border-dashed border-white/20 sm:mx-8" />
            </div>

            <div className="relative flex items-end justify-between">
              <span className="text-sm font-medium text-slate-300">Total due today</span>
              <span className="bg-gradient-to-r from-orange-300 to-amber-200 bg-clip-text font-[family-name:var(--font-display)] text-4xl font-extrabold tracking-tight text-transparent sm:text-5xl">
                <AnimatedPrice value={finalPrice} />
              </span>
            </div>
          </motion.aside>

          {/* ======================= RIGHT: PAY ======================= */}
          <div className="relative flex flex-col gap-5 lg:py-8">
            <motion.div variants={rise}>
              <p className="inline-flex items-center gap-1.5 rounded-full border border-orange-900/10 bg-white/60 px-3 py-1 text-xs font-bold text-orange-700 backdrop-blur">
                <Lock className="h-3.5 w-3.5" /> Secure checkout
              </p>
              <h1 className="mt-3 font-[family-name:var(--font-display)] text-[2rem] font-extrabold leading-[1.05] tracking-tighter sm:text-5xl">
                Review and{" "}
                <span className="bg-gradient-to-r from-[#f97316] to-amber-500 bg-clip-text text-transparent">
                  pay.
                </span>
              </h1>
            </motion.div>

            {/* ---------------- Custom link builder ---------------- */}
            {isTemplate && item.allowsCustomSlug && (
              <motion.section
                variants={rise}
                className="overflow-hidden rounded-3xl border border-orange-900/10 shadow-[0_18px_40px_-26px_rgba(154,52,18,0.5)]"
                style={{ backgroundImage: PAPER_BG }}
              >
                <div className="flex items-start justify-between gap-4 p-5 sm:p-6">
                  <div>
                    <AccentBar />
                    <h3 className="font-[family-name:var(--font-display)] text-lg font-bold tracking-tight sm:text-xl">
                      Give your invitation a link people remember
                    </h3>
                    <p className="mt-1 max-w-sm text-sm font-medium leading-relaxed text-slate-700">
                      Replace the random code with your own name. Guests see it in every message you send.
                    </p>
                  </div>
                  <Switch
                    checked={wantsSlug}
                    onChange={setWantsSlug}
                    label="Add a custom invitation link"
                  />
                </div>

                <AnimatePresence initial={false}>
                  {wantsSlug && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: "auto", opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      transition={{ duration: 0.4, ease: EASE }}
                      className="overflow-hidden"
                    >
                      <div className="space-y-3 border-t border-orange-900/10 bg-white/30 p-5 sm:p-6">
                        {/* Browser window mock with full URL */}
                        <div className="overflow-hidden rounded-2xl bg-[#11162a] shadow-xl ring-1 ring-white/10">
                          <div className="flex items-center gap-1.5 px-3.5 pt-3">
                            <span className="h-2.5 w-2.5 rounded-full bg-rose-400/80" />
                            <span className="h-2.5 w-2.5 rounded-full bg-amber-300/80" />
                            <span className="h-2.5 w-2.5 rounded-full bg-emerald-400/80" />
                          </div>
                          <label
                            htmlFor="slug"
                            className={cn(
                              "m-3 flex flex-wrap items-center gap-x-1 gap-y-1 rounded-xl border bg-white/[0.06] px-3.5 py-3 font-mono text-[13px] transition-all duration-300 focus-within:ring-4 sm:text-sm",
                              slugError
                                ? "border-red-400/70 focus-within:ring-red-400/20"
                                : slugAvailable
                                ? "border-emerald-400/70 focus-within:ring-emerald-400/20"
                                : "border-white/10 focus-within:border-orange-400 focus-within:ring-orange-400/20"
                            )}
                          >
                            <Lock
                              className={cn(
                                "mr-1 h-4 w-4 shrink-0 transition-colors",
                                slugAvailable ? "text-emerald-400" : "text-slate-400"
                              )}
                            />
                            <span className="shrink-0 select-none text-slate-400">{HOST}</span>
                            <input
                              id="slug"
                              type="text"
                              inputMode="url"
                              autoComplete="off"
                              autoCapitalize="none"
                              spellCheck={false}
                              value={slug}
                              onChange={(e) => handleSlugChange(e.target.value)}
                              placeholder="ayesha-and-ali"
                              maxLength={40}
                              aria-invalid={!!slugError}
                              aria-describedby="slug-status"
                              className="min-w-[9ch] flex-1 bg-transparent font-bold text-white outline-none placeholder:font-normal placeholder:text-slate-500"
                            />
                            <span className="flex h-5 w-5 shrink-0 items-center justify-center">
                              <AnimatePresence mode="wait" initial={false}>
                                {isCheckingSlug ? (
                                  <motion.span key="l" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                                    <Loader2 className="h-4 w-4 animate-spin text-orange-400" />
                                  </motion.span>
                                ) : slugAvailable ? (
                                  <motion.span
                                    key="ok"
                                    initial={{ scale: 0.4, opacity: 0 }}
                                    animate={{ scale: 1, opacity: 1 }}
                                    transition={{ type: "spring", stiffness: 500, damping: 20 }}
                                    className="flex h-5 w-5 items-center justify-center rounded-full bg-emerald-500 text-white"
                                  >
                                    <Check className="h-3 w-3" strokeWidth={3} />
                                  </motion.span>
                                ) : slugError ? (
                                  <motion.span key="err" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                                    <AlertTriangle className="h-4 w-4 text-red-400" />
                                  </motion.span>
                                ) : null}
                              </AnimatePresence>
                            </span>
                          </label>
                        </div>

                        <div className="flex items-center justify-between gap-3 text-xs">
                          <p
                            id="slug-status"
                            aria-live="polite"
                            className={cn(
                              "font-semibold",
                              slugError
                                ? "text-red-600"
                                : slugAvailable
                                ? "text-emerald-700"
                                : "text-slate-600"
                            )}
                          >
                            {slugError
                              ? slugError
                              : slugAvailable
                              ? "Available. It's yours once you pay."
                              : isCheckingSlug
                              ? "Checking availability…"
                              : "Letters, numbers and hyphens only."}
                          </p>
                          <span className="shrink-0 rounded-full bg-slate-900 px-2.5 py-1 font-bold tabular-nums text-orange-300">
                            +{rs(item.customSlugPrice)}
                          </span>
                        </div>

                        <p className="break-all text-xs font-medium text-slate-600">
                          Instead of{" "}
                          <span className="font-mono line-through decoration-orange-700/40">
                            {HOST}8f4a2c-9b12…
                          </span>
                        </p>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </motion.section>
            )}

            {/* ---------------- Payment method ---------------- */}
            <motion.section
              variants={rise}
              className="rounded-3xl border border-white/10 p-5 text-slate-50 shadow-[0_24px_50px_-26px_rgba(10,14,31,0.9)] sm:p-6"
              style={{ backgroundImage: DARK_BG }}
            >
              <h3 className="text-sm font-semibold text-slate-300">Payment method</h3>
              <div className="mt-3 flex items-center gap-3 rounded-2xl border border-orange-400/50 bg-white/[0.06] p-3.5">
                <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-b from-[#fb8a3c] to-[#f97316] text-white shadow-lg shadow-orange-500/30">
                  <Wallet className="h-5 w-5" />
                </span>
                <div className="min-w-0 flex-1">
                  <p className="font-bold leading-tight">Pay using suitable handler</p>
                  <p className="text-xs text-slate-300">Mobile wallet or card, routed securely for you</p>
                </div>
                <span className="flex h-5 w-5 items-center justify-center rounded-full bg-orange-500 text-white">
                  <Check className="h-3 w-3" strokeWidth={3} />
                </span>
              </div>
            </motion.section>

            {/* ---------------- CTA ---------------- */}
            <motion.div variants={rise} className="space-y-4">
              <motion.button
                type="button"
                onClick={handleCheckout}
                disabled={isProcessing || slugBlocked}
                whileTap={{ scale: 0.985 }}
                className="group relative flex w-full cursor-pointer items-center justify-center gap-2 overflow-hidden rounded-2xl border border-white/30 px-6 py-4 text-base font-bold text-white shadow-[0_24px_50px_-26px_rgba(234,88,12,0.95)] transition-[filter,opacity,box-shadow] hover:shadow-[0_30px_60px_-24px_rgba(234,88,12,1)] hover:brightness-105 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-orange-300/70 disabled:cursor-not-allowed disabled:opacity-50 disabled:shadow-none"
                style={{ backgroundImage: SUN_BG }}
              >
                {!reduce && !slugBlocked && (
                  <span
                    aria-hidden
                    className="pointer-events-none absolute inset-y-0 -left-1/3 w-1/3 -skew-x-12 bg-white/30 blur-md transition-transform duration-700 ease-out group-hover:translate-x-[420%]"
                  />
                )}
                <Lock className="relative h-4 w-4" />
                <span className="relative">
                  Pay <AnimatedPrice value={finalPrice} />
                </span>
              </motion.button>

              {slugBlocked && (
                <p className="text-center text-xs font-medium text-slate-600">
                  Pick an available link to continue, or switch the custom link off.
                </p>
              )}

              <ul className="flex flex-wrap items-center justify-center gap-x-5 gap-y-2 text-xs font-semibold text-slate-700">
                <li className="flex items-center gap-1.5">
                  <Lock className="h-3.5 w-3.5 text-orange-600" /> 256-bit SSL
                </li>
                <li className="flex items-center gap-1.5">
                  <ShieldCheck className="h-3.5 w-3.5 text-orange-600" /> Secure gateway
                </li>
                <li className="flex items-center gap-1.5">
                  <Zap className="h-3.5 w-3.5 text-orange-600" /> Instant access
                </li>
              </ul>
            </motion.div>
          </div>
        </motion.main>
      )}

      {/* ========================= ERROR TOAST ========================= */}
      {mounted &&
        createPortal(
          <div className="pointer-events-none fixed inset-x-4 top-6 z-[99999] flex justify-center">
            <AnimatePresence>
              {error && (
                <motion.div
                  role="alert"
                  initial={{ opacity: 0, y: -16, scale: 0.97 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: -8, scale: 0.98 }}
                  transition={{ duration: 0.3, ease: EASE }}
                  className="pointer-events-auto flex max-w-md items-start gap-3 rounded-2xl border border-red-200 bg-white p-4 shadow-[0_20px_40px_-16px_rgba(0,0,0,0.25)]"
                >
                  <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-red-50 text-red-600">
                    <AlertTriangle className="h-4 w-4" />
                  </span>
                  <p className="flex-1 pt-1 text-sm font-medium text-slate-800">{error}</p>
                  <button
                    onClick={() => setError("")}
                    aria-label="Dismiss"
                    className="cursor-pointer rounded-lg p-1 text-slate-400 transition hover:bg-slate-100 hover:text-slate-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-300"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </motion.div>
              )}
            </AnimatePresence>
          </div>,
          document.body
        )}

      {/* ======================= PROCESSING SCENE ======================= */}
      {mounted &&
        createPortal(
          <AnimatePresence>
            {isProcessing && (
              <motion.div
                role="status"
                aria-live="polite"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.35 }}
                className="fixed inset-0 z-[999999] flex items-center justify-center bg-[#0a0e1f]/90 p-6 backdrop-blur-md"
              >
                <motion.div
                  initial={{ opacity: 0, y: 16, scale: 0.98 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  transition={{ duration: 0.5, ease: EASE }}
                  className="w-full max-w-sm rounded-3xl border border-white/10 p-7 text-white shadow-2xl"
                  style={{ backgroundImage: DARK_BG }}
                >
                  <div className="flex items-center gap-3">
                    <span className="relative flex h-11 w-11 items-center justify-center rounded-xl bg-gradient-to-b from-[#fb8a3c] to-[#f97316]">
                      <Lock className="h-5 w-5" />
                      {!reduce && (
                        <motion.span
                          className="absolute inset-0 rounded-xl border border-orange-300"
                          animate={{ scale: [1, 1.5], opacity: [0.6, 0] }}
                          transition={{ duration: 1.4, repeat: Infinity, ease: "easeOut" }}
                        />
                      )}
                    </span>
                    <div>
                      <p className="font-bold leading-tight">Preparing secure payment</p>
                      <p className="text-xs text-white/50">Please keep this page open</p>
                    </div>
                  </div>

                  <div className="mt-6 h-1 w-full overflow-hidden rounded-full bg-white/10">
                    <motion.div
                      className="h-full rounded-full bg-gradient-to-r from-[#fb8a3c] to-[#fbbf24]"
                      animate={{ width: `${((stage + 1) / STAGES.length) * 100}%` }}
                      transition={{ duration: 0.8, ease: EASE }}
                    />
                  </div>

                  <ul className="mt-6 space-y-4">
                    {STAGES.map((s, i) => {
                      const done = i < stage;
                      const active = i === stage;
                      return (
                        <li
                          key={s.title}
                          className={cn(
                            "flex items-center gap-3 transition-opacity duration-500",
                            i > stage ? "opacity-35" : "opacity-100"
                          )}
                        >
                          <span
                            className={cn(
                              "flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-[11px]",
                              done
                                ? "bg-emerald-500 text-white"
                                : active
                                ? "bg-white/10 text-orange-400 ring-1 ring-orange-400/60"
                                : "bg-white/5 text-white/30"
                            )}
                          >
                            {done ? (
                              <Check className="h-3.5 w-3.5" strokeWidth={3} />
                            ) : active ? (
                              <Loader2 className="h-3.5 w-3.5 animate-spin" />
                            ) : null}
                          </span>
                          <div>
                            <p className="text-sm font-semibold leading-tight">{s.title}</p>
                            {active && <p className="mt-0.5 text-xs text-white/50">{s.hint}</p>}
                          </div>
                        </li>
                      );
                    })}
                  </ul>
                </motion.div>
              </motion.div>
            )}
          </AnimatePresence>,
          document.body
        )}
    </div>
  );
}

export default CheckoutClient;