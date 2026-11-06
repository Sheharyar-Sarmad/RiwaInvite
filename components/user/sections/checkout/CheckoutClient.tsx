"use client";

import { useState, useRef, useCallback, useEffect, useMemo } from "react";
import { useParams, useRouter } from "next/navigation";
import { createPortal } from "react-dom";
import {
  motion,
  AnimatePresence,
  animate,
  useReducedMotion,
  useMotionValue,
  useSpring,
  useTransform,
  useMotionTemplate,
  type Variants,
} from "framer-motion";
import {
  ShieldCheck,
  ArrowRight,
  Sparkles,
  CreditCard,
  Lock,
  AlertTriangle,
  X,
  CheckCircle2,
  Zap,
} from "lucide-react";
import { apiClient } from "@/lib/api/api_base";

const primaryBtn =
  "bg-gradient-to-b from-[#fb8a3c] to-[#f97316] shadow-[0_18px_40px_-12px_rgba(249,115,22,0.9),inset_0_1px_0_rgba(255,255,255,0.4)]";

type ItemData = {
  name: string;
  price: number;
  image: string | null;
  category: string;
};

const STAGES = [
  "Verifying connection",
  "Encrypting your order",
  "Opening JazzCash",
];

/* ---------- small helpers ---------- */

function AnimatedPrice({ value }: { value: number }) {
  const [display, setDisplay] = useState(0);
  useEffect(() => {
    const controls = animate(0, value, {
      duration: 1.4,
      ease: [0.16, 1, 0.3, 1],
      onUpdate: (v) => setDisplay(Math.round(v)),
    });
    return () => controls.stop();
  }, [value]);
  return <>Rs {display.toLocaleString()}</>;
}

const cardVariants: Variants = {
  hidden: {},
  show: { transition: { staggerChildren: 0.09, delayChildren: 0.25 } },
};
const rise: Variants = {
  hidden: { opacity: 0, y: 24, filter: "blur(6px)" },
  show: {
    opacity: 1,
    y: 0,
    filter: "blur(0px)",
    transition: { duration: 0.7, ease: [0.16, 1, 0.3, 1] },
  },
};

/* ---------- component ---------- */

export function CheckoutClient() {
  const params = useParams();
  const router = useRouter();
  const isTemplate = params.type === "template";

  const [isLoading, setIsLoading] = useState(true);
  const [isProcessing, setIsProcessing] = useState(false);
  const [stage, setStage] = useState(0);
  const [error, setError] = useState("");
  const [mounted, setMounted] = useState(false);
  const [item, setItem] = useState<ItemData | null>(null);

  const reduce = useReducedMotion() ?? false;
  const sectionRef = useRef<HTMLDivElement>(null);
  const raf = useRef(0);

  // 3D tilt: -0.5 .. 0.5 relative to the viewport centre
  const tiltX = useMotionValue(0);
  const tiltY = useMotionValue(0);
  const sx = useSpring(tiltX, { stiffness: 110, damping: 16, mass: 0.6 });
  const sy = useSpring(tiltY, { stiffness: 110, damping: 16, mass: 0.6 });
  const rotateY = useTransform(sx, [-0.5, 0.5], [-4, 4]);
  const rotateX = useTransform(sy, [-0.5, 0.5], [3, -3]);
  const glareX = useTransform(sx, [-0.5, 0.5], [0, 100]);
  const glareY = useTransform(sy, [-0.5, 0.5], [0, 100]);
  const glare = useMotionTemplate`radial-gradient(380px circle at ${glareX}% ${glareY}%, rgba(255,255,255,0.7), transparent 65%)`;
  // background parallax (moves opposite to the card)
  const bgX = useTransform(sx, [-0.5, 0.5], [30, -30]);
  const bgY = useTransform(sy, [-0.5, 0.5], [20, -20]);
  const shadowX = useTransform(sx, [-0.5, 0.5], [18, -18]);

  useEffect(() => setMounted(true), []);

  // Scroll lock while processing
  useEffect(() => {
    document.body.style.overflow = isProcessing ? "hidden" : "";
    return () => {
      document.body.style.overflow = "";
    };
  }, [isProcessing]);

  // Cycle the stage text while processing
  useEffect(() => {
    if (!isProcessing) return;
    setStage(0);
    const id = setInterval(() => setStage((s) => Math.min(s + 1, STAGES.length - 1)), 1000);
    return () => clearInterval(id);
  }, [isProcessing]);

  // Cursor reveal + tilt
  const onMove = useCallback(
    (e: React.PointerEvent) => {
      if (e.pointerType === "touch") return;
      const { clientX, clientY } = e;
      cancelAnimationFrame(raf.current);
      raf.current = requestAnimationFrame(() => {
        sectionRef.current?.style.setProperty("--mx", `${clientX}px`);
        sectionRef.current?.style.setProperty("--my", `${clientY}px`);
        if (!reduce) {
          tiltX.set(clientX / window.innerWidth - 0.5);
          tiltY.set(clientY / window.innerHeight - 0.5);
        }
      });
    },
    [reduce, tiltX, tiltY]
  );
  const onLeave = useCallback(() => {
    tiltX.set(0);
    tiltY.set(0);
  }, [tiltX, tiltY]);

  useEffect(() => () => cancelAnimationFrame(raf.current), []);

  const mask =
    "radial-gradient(260px circle at var(--mx,-999px) var(--my,-999px), #000 0%, transparent 100%)";

  // Stable ember positions (no Math.random in render)
  const embers = useMemo(
    () =>
      Array.from({ length: 22 }, (_, i) => ({
        left: (i * 47) % 100,
        size: 2 + (i % 4),
        dur: 5 + (i % 6),
        delay: (i % 7) * 0.5,
        drift: ((i % 5) - 2) * 30,
      })),
    []
  );

  // Fetch item details
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
                category: "Subscription Plan",
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

  const handleCheckout = async () => {
    setIsProcessing(true);
    setError("");

    const sceneTimer = new Promise((resolve) => setTimeout(resolve, 3000));

    try {
      const [res] = await Promise.all([
        apiClient.post("/user/dashboard/checkout", {
          itemType: params.type,
          itemId: params.id,
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
            const hiddenField = document.createElement("input");
            hiddenField.type = "hidden";
            hiddenField.name = key;
            hiddenField.value = data.payload[key];
            form.appendChild(hiddenField);
          });

          document.body.appendChild(form);
          form.submit();
        }
      } else {
        setError("Could not start checkout. Please try again.");
        setIsProcessing(false);
      }
    } catch (err: any) {
      setError(err.response?.data?.message || "Failed to initiate checkout.");
      setIsProcessing(false);
    }
  };

  /* ---------- loading ---------- */
  if (isLoading) {
    return (
      <div className="flex h-screen w-full items-center justify-center bg-[#fdeadb]">
        <div className="relative flex h-24 w-24 items-center justify-center">
          <motion.span
            className="absolute inset-0 rounded-full border-2 border-orange-400/50"
            animate={{ scale: [1, 1.5], opacity: [0.7, 0] }}
            transition={{ duration: 1.4, repeat: Infinity, ease: "easeOut" }}
          />
          <div className="h-14 w-14 animate-spin rounded-full border-4 border-orange-500 border-t-transparent" />
          <Lock className="absolute h-5 w-5 text-orange-600" />
        </div>
      </div>
    );
  }

  return (
    <div
      ref={sectionRef}
      onPointerMove={onMove}
      onPointerLeave={onLeave}
      className="relative isolate flex min-h-[calc(100dvh-80px)] w-full items-center justify-center overflow-hidden bg-[#fdeadb] px-4 py-12 font-[family-name:var(--font-body)]"
    >
      {/* ================= BACKGROUND ================= */}
      <div aria-hidden className="pointer-events-none absolute inset-0 -z-10">
        <div className="absolute inset-0 bg-gradient-to-b from-[#fff4ea] via-[#fde3cc] to-[#fbc9a0]" />

        {/* aurora blobs with parallax */}
        <motion.div style={{ x: bgX, y: bgY }} className="absolute inset-0">
          <motion.div
            animate={reduce ? undefined : { x: [0, 80, 0], y: [0, 40, 0], scale: [1, 1.15, 1] }}
            transition={{ duration: 18, repeat: Infinity, ease: "easeInOut" }}
            className="absolute -left-32 top-0 h-[460px] w-[460px] rounded-full bg-orange-400/35 blur-[120px]"
          />
          <motion.div
            animate={reduce ? undefined : { x: [0, -70, 0], y: [0, -50, 0], scale: [1, 1.2, 1] }}
            transition={{ duration: 22, repeat: Infinity, ease: "easeInOut" }}
            className="absolute -right-32 bottom-0 h-[480px] w-[480px] rounded-full bg-amber-400/35 blur-[120px]"
          />
          <motion.div
            animate={reduce ? undefined : { x: [0, 40, -40, 0], y: [0, -30, 30, 0] }}
            transition={{ duration: 26, repeat: Infinity, ease: "easeInOut" }}
            className="absolute left-1/2 top-1/3 h-[340px] w-[340px] -translate-x-1/2 rounded-full bg-rose-300/25 blur-[110px]"
          />
        </motion.div>

        {/* 3D perspective grid floor */}
        <div
          className="absolute inset-x-0 bottom-0 h-[55%] overflow-hidden"
          style={{
            perspective: "500px",
            maskImage: "linear-gradient(to top, #000 10%, transparent 95%)",
            WebkitMaskImage: "linear-gradient(to top, #000 10%, transparent 95%)",
          }}
        >
          <motion.div
            className="absolute -inset-x-[50%] bottom-0 h-[200%] origin-bottom"
            style={{
              transform: "rotateX(68deg)",
              backgroundImage:
                "linear-gradient(rgba(234,88,12,0.35) 1.5px, transparent 1.5px), linear-gradient(90deg, rgba(234,88,12,0.35) 1.5px, transparent 1.5px)",
              backgroundSize: "64px 64px",
            }}
            animate={reduce ? undefined : { backgroundPositionY: ["0px", "64px"] }}
            transition={{ duration: 2.4, repeat: Infinity, ease: "linear" }}
          />
        </div>

        {/* dot grid + cursor reveal */}
        <div
          className="absolute inset-0"
          style={{
            backgroundImage: "radial-gradient(circle, rgba(194,65,12,0.18) 1.5px, transparent 1.5px)",
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

        {/* floating 3D glass cubes */}
        {!reduce &&
          [
            { l: "7%", t: "18%", s: 56, d: 16, r: 0 },
            { l: "87%", t: "24%", s: 76, d: 20, r: 1.2 },
            { l: "13%", t: "68%", s: 44, d: 14, r: 2.4 },
            { l: "81%", t: "72%", s: 52, d: 18, r: 0.6 },
          ].map((c, i) => (
            <motion.div
              key={i}
              className="absolute hidden md:block"
              style={{ left: c.l, top: c.t, width: c.s, height: c.s, perspective: 700 }}
              animate={{ y: [0, -24, 0] }}
              transition={{ duration: c.d * 0.45, repeat: Infinity, ease: "easeInOut", delay: c.r }}
            >
              <motion.div
                className="relative h-full w-full"
                style={{ transformStyle: "preserve-3d" }}
                animate={{ rotateX: [0, 360], rotateY: [0, 360] }}
                transition={{ duration: c.d, repeat: Infinity, ease: "linear" }}
              >
                {[
                  "rotateY(0deg)",
                  "rotateY(90deg)",
                  "rotateY(180deg)",
                  "rotateY(270deg)",
                  "rotateX(90deg)",
                  "rotateX(-90deg)",
                ].map((t, f) => (
                  <span
                    key={f}
                    className="absolute inset-0 rounded-md border border-white/70 bg-gradient-to-br from-orange-200/70 via-orange-400/40 to-amber-300/60 shadow-[inset_0_0_18px_rgba(255,255,255,0.5)]"
                    style={{ transform: `${t} translateZ(${c.s / 2}px)` }}
                  />
                ))}
              </motion.div>
            </motion.div>
          ))}

        {/* rising embers */}
        {!reduce &&
          embers.map((e, i) => (
            <motion.span
              key={i}
              className="absolute bottom-0 rounded-full bg-orange-500/60 blur-[1px]"
              style={{ left: `${e.left}%`, width: e.size, height: e.size }}
              animate={{ y: [0, -700], x: [0, e.drift], opacity: [0, 0.9, 0] }}
              transition={{ duration: e.dur, repeat: Infinity, delay: e.delay, ease: "easeOut" }}
            />
          ))}

        {/* film grain + vignette */}
        <div
          className="absolute inset-0 opacity-[0.06] mix-blend-multiply"
          style={{
            backgroundImage:
              "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='160' height='160'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='.9' numOctaves='2'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E\")",
          }}
        />
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,transparent_55%,rgba(154,52,18,0.18)_100%)]" />
      </div>

      {/* ================= EMPTY / ERROR STATE ================= */}
      {!item && (
        <div className="relative z-10 w-full max-w-md rounded-3xl border border-orange-200/60 bg-white/80 p-8 text-center shadow-xl backdrop-blur-xl">
          <p className="text-lg font-bold text-gray-900">We couldn&apos;t load this order</p>
          <p className="mt-2 text-sm text-gray-600">Go back and try again.</p>
          <button
            onClick={() => router.back()}
            className={`mt-6 rounded-xl px-6 py-3 font-bold text-white ${primaryBtn}`}
          >
            Go back
          </button>
        </div>
      )}

      {/* ================= 3D CHECKOUT CARD ================= */}
      {item && (
        <div className="relative z-10 w-full max-w-lg" style={{ perspective: 1400 }}>
          {/* soft ground shadow */}
          <motion.div
            aria-hidden
            style={{ x: shadowX }}
            className="pointer-events-none absolute inset-x-8 -bottom-10 h-14 rounded-[50%] bg-orange-900/25 blur-2xl"
          />

          <motion.div
            initial={{ opacity: 0, y: 60, rotateX: 18, scale: 0.94 }}
            animate={{ opacity: 1, y: 0, rotateX: 0, scale: 1 }}
            transition={{ duration: 1, ease: [0.16, 1, 0.3, 1] }}
          >
            <motion.div
              variants={cardVariants}
              initial="hidden"
              animate="show"
              style={{ rotateX, rotateY, transformStyle: "preserve-3d" }}
              className="relative rounded-[2rem] p-8 sm:p-10"
            >
              {/* glass + animated border (flat layer, so blur doesn't kill 3D) */}
              <div aria-hidden className="pointer-events-none absolute inset-0 overflow-hidden rounded-[2rem] shadow-[0_40px_80px_-30px_rgba(249,115,22,0.7)]">
                <motion.div
                  className="absolute -inset-[60%]"
                  style={{
                    background:
                      "conic-gradient(from 0deg, transparent 0 55%, rgba(251,146,60,0.9) 70%, rgba(253,224,71,0.95) 78%, transparent 90%)",
                  }}
                  animate={reduce ? undefined : { rotate: 360 }}
                  transition={{ duration: 6, repeat: Infinity, ease: "linear" }}
                />
                <div className="absolute inset-[1.5px] rounded-[calc(2rem-1.5px)] border border-white/60 bg-white/80 backdrop-blur-2xl" />
                <motion.div className="absolute inset-[1.5px] rounded-[calc(2rem-1.5px)] mix-blend-soft-light" style={{ background: glare }} />
              </div>

              {/* header */}
              <motion.div
                variants={rise}
                className="relative mb-8 text-center"
                style={{ transform: "translateZ(60px)" }}
              >
                <span className="mb-3 inline-flex items-center gap-2 rounded-full border border-orange-200 bg-white/90 px-4 py-1.5 text-xs font-semibold text-orange-600 shadow-sm">
                  <Sparkles className="h-3.5 w-3.5" /> Secure checkout
                </span>
                <h1 className="font-[family-name:var(--font-display)] text-3xl font-extrabold text-gray-900 sm:text-4xl">
                  Complete your order
                </h1>
              </motion.div>

              {/* template preview */}
              {isTemplate && item.image && (
                <motion.div
                  variants={rise}
                  className="relative mb-6 flex items-center gap-4 rounded-2xl border border-orange-100 bg-white/70 p-3 shadow-[0_12px_30px_-18px_rgba(249,115,22,0.6)]"
                  style={{ transform: "translateZ(40px)" }}
                >
                  <motion.div
                    whileHover={{ scale: 1.08, rotate: -3 }}
                    className="relative h-16 w-16 shrink-0 overflow-hidden rounded-xl bg-gray-100 shadow-md"
                  >
                    <img src={item.image} alt={item.name} className="h-full w-full object-cover" />
                  </motion.div>
                  <div className="min-w-0">
                    <p className="text-xs font-bold text-orange-500">{item.category}</p>
                    <p className="line-clamp-1 font-bold text-gray-900">{item.name}</p>
                  </div>
                </motion.div>
              )}

              {/* summary */}
              <motion.div
                variants={rise}
                className="relative mb-8 rounded-2xl border border-orange-100 bg-white/70 p-6 shadow-[0_16px_40px_-22px_rgba(249,115,22,0.6)]"
                style={{ transform: "translateZ(30px)" }}
              >
                {!isTemplate && (
                  <div className="mb-4 flex items-center justify-between">
                    <span className="font-medium text-gray-600">Plan</span>
                    <span className="font-bold text-gray-900">{item.name}</span>
                  </div>
                )}
                <div className="mb-4 flex items-center justify-between">
                  <span className="font-medium text-gray-600">Type</span>
                  <span className="font-bold text-gray-900">
                    {isTemplate ? "Template purchase" : "Subscription plan"}
                  </span>
                </div>
                <div className="flex items-center justify-between border-t border-dashed border-orange-200 pt-4">
                  <span className="font-medium text-gray-600">Total</span>
                  <span className="bg-gradient-to-r from-orange-600 to-amber-500 bg-clip-text text-3xl font-extrabold tabular-nums text-transparent">
                    <AnimatedPrice value={item.price} />
                  </span>
                </div>
              </motion.div>

              {/* CTA */}
              <motion.div variants={rise} className="relative z-20">
                <motion.button
                  type="button"
                  onClick={handleCheckout}
                  disabled={isProcessing}
                  whileHover={reduce ? undefined : { y: -3, scale: 1.02 }}
                  whileTap={{ scale: 0.97 }}
                  className={`group relative flex w-full items-center justify-center gap-3 overflow-hidden rounded-xl py-4 text-lg font-bold text-white focus:outline-none focus-visible:ring-4 focus-visible:ring-orange-300 disabled:opacity-70 ${primaryBtn}`}
                >
                  {/* shimmer sweep */}
                  {!reduce && (
                    <motion.span
                      aria-hidden
                      className="pointer-events-none absolute inset-y-0 -left-1/3 w-1/3 -skew-x-12 bg-gradient-to-r from-transparent via-white/50 to-transparent"
                      animate={{ x: ["0%", "450%"] }}
                      transition={{ duration: 2.2, repeat: Infinity, repeatDelay: 1.6, ease: "easeInOut" }}
                    />
                  )}
                  <CreditCard className="relative h-5 w-5" />
                  <span className="relative">Proceed to payment</span>
                  <ArrowRight className="relative h-5 w-5 transition-transform group-hover:translate-x-1.5" />
                </motion.button>
              </motion.div>

              {/* trust row */}
              <motion.div
                variants={rise}
                className="relative mt-6 flex flex-wrap items-center justify-center gap-x-6 gap-y-2"
                style={{ transform: "translateZ(20px)" }}
              >
                <p className="flex items-center gap-1.5 text-xs font-medium text-gray-500">
                  <Lock className="h-3.5 w-3.5 text-emerald-500" /> 256-bit SSL
                </p>
                <p className="flex items-center gap-1.5 text-xs font-medium text-gray-500">
                  <ShieldCheck className="h-3.5 w-3.5 text-emerald-500" /> Secure gateway
                </p>
                <p className="flex items-center gap-1.5 text-xs font-medium text-gray-500">
                  <Zap className="h-3.5 w-3.5 text-emerald-500" /> Instant access
                </p>
              </motion.div>
            </motion.div>
          </motion.div>
        </div>
      )}

      {/* ================= ERROR TOAST ================= */}
      {mounted &&
        createPortal(
          <div className="pointer-events-none fixed inset-x-4 top-24 z-[99999] flex justify-center">
            <AnimatePresence>
              {error && (
                <motion.div
                  role="alert"
                  initial={{ opacity: 0, y: -24, scale: 0.94 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: -10, scale: 0.97 }}
                  transition={{ type: "spring", damping: 22, stiffness: 300 }}
                  className="pointer-events-auto relative flex max-w-md items-start gap-3 overflow-hidden rounded-2xl border border-red-200 bg-white/95 p-4 shadow-xl backdrop-blur-xl"
                >
                  <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-red-100 text-red-600">
                    <AlertTriangle className="h-4 w-4" />
                  </span>
                  <div className="flex-1 pt-0.5">
                    <p className="text-sm font-bold text-red-700">{error}</p>
                  </div>
                  <button
                    onClick={() => setError("")}
                    aria-label="Dismiss"
                    className="rounded-lg p-1 text-red-400 hover:bg-red-50 hover:text-red-700"
                  >
                    <X className="h-4 w-4" />
                  </button>
                  {/* auto-dismiss countdown */}
                  <motion.span
                    className="absolute bottom-0 left-0 h-0.5 bg-red-400"
                    initial={{ width: "100%" }}
                    animate={{ width: "0%" }}
                    transition={{ duration: 6, ease: "linear" }}
                    onAnimationComplete={() => setError("")}
                  />
                </motion.div>
              )}
            </AnimatePresence>
          </div>,
          document.body
        )}

      {/* ================= CINEMATIC PROCESSING SCENE ================= */}
      {mounted &&
        createPortal(
          <AnimatePresence>
            {isProcessing && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0, transition: { duration: 0.8, ease: "easeInOut" } }}
                className="fixed inset-0 z-[999999] flex flex-col items-center justify-center overflow-hidden bg-gradient-to-br from-[#1f1209] via-[#0a0a0a] to-[#140c07]"
              >
                {/* iris-open flash */}
                <motion.div
                  className="absolute inset-0 bg-orange-500/20"
                  initial={{ clipPath: "circle(0% at 50% 50%)" }}
                  animate={{ clipPath: "circle(150% at 50% 50%)", opacity: [1, 0] }}
                  transition={{ duration: 1.2, ease: "easeOut" }}
                />

                {/* receding perspective floor */}
                <div
                  className="absolute inset-x-0 bottom-0 h-1/2 overflow-hidden"
                  style={{
                    perspective: "420px",
                    maskImage: "linear-gradient(to top, #000 0%, transparent 90%)",
                    WebkitMaskImage: "linear-gradient(to top, #000 0%, transparent 90%)",
                  }}
                >
                  <motion.div
                    className="absolute -inset-x-[60%] bottom-0 h-[220%] origin-bottom"
                    style={{
                      transform: "rotateX(70deg)",
                      backgroundImage:
                        "linear-gradient(rgba(249,115,22,0.5) 1.5px, transparent 1.5px), linear-gradient(90deg, rgba(249,115,22,0.5) 1.5px, transparent 1.5px)",
                      backgroundSize: "56px 56px",
                    }}
                    animate={{ backgroundPositionY: ["0px", "56px"] }}
                    transition={{ duration: 0.9, repeat: Infinity, ease: "linear" }}
                  />
                </div>

                {/* star dust grid */}
                <div
                  className="absolute inset-0 opacity-20 [mask-image:radial-gradient(ellipse_at_center,black_20%,transparent_80%)]"
                  style={{
                    backgroundImage: "radial-gradient(rgba(255,255,255,0.12) 1px, transparent 1px)",
                    backgroundSize: "40px 40px",
                  }}
                />

                {/* embers */}
                {embers.map((e, i) => (
                  <motion.span
                    key={i}
                    className="absolute bottom-0 rounded-full bg-orange-400/70 blur-[1.5px]"
                    style={{ left: `${e.left}%`, width: e.size, height: e.size }}
                    animate={{ y: [0, -900], x: [0, e.drift], opacity: [0, 1, 0] }}
                    transition={{ duration: e.dur * 0.7, repeat: Infinity, delay: e.delay * 0.4, ease: "easeOut" }}
                  />
                ))}

                {/* 3D gyroscope */}
                <div className="relative h-80 w-80" style={{ perspective: 900 }}>
                  <motion.div
                    className="absolute inset-0 rounded-full bg-[radial-gradient(circle,rgba(249,115,22,0.28)_0%,transparent_68%)]"
                    animate={{ scale: [1, 1.12, 1], opacity: [0.5, 1, 0.5] }}
                    transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
                  />
                  <motion.div
                    className="absolute inset-0"
                    style={{ transformStyle: "preserve-3d" }}
                    animate={{ rotateY: 360 }}
                    transition={{ duration: 14, repeat: Infinity, ease: "linear" }}
                  >
                    {[
                      { inset: 0, rx: 0, color: "border-orange-500/70", dur: 6 },
                      { inset: 24, rx: 60, color: "border-amber-400/60", dur: 8 },
                      { inset: 48, rx: -60, color: "border-orange-300/50", dur: 10 },
                    ].map((r, i) => (
                      <motion.div
                        key={i}
                        className={`absolute rounded-full border-2 ${r.color} shadow-[0_0_24px_rgba(249,115,22,0.35)]`}
                        style={{ inset: r.inset, transformStyle: "preserve-3d" }}
                        initial={{ rotateX: r.rx }}
                        animate={{ rotateX: [r.rx, r.rx + 360], rotateZ: i % 2 ? [0, -360] : [0, 360] }}
                        transition={{ duration: r.dur, repeat: Infinity, ease: "linear" }}
                      >
                        <span className="absolute left-1/2 top-0 h-3 w-3 -translate-x-1/2 -translate-y-1/2 rounded-full bg-orange-300 shadow-[0_0_20px_5px_rgba(249,115,22,0.9)]" />
                      </motion.div>
                    ))}
                  </motion.div>

                  {/* vault core */}
                  <div className="absolute left-1/2 top-1/2 flex h-28 w-28 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-[2rem] border border-white/10 bg-[#141414] shadow-[0_0_70px_-8px_rgba(249,115,22,1)]">
                    <motion.div
                      animate={{ scale: [1, 1.12, 1] }}
                      transition={{ duration: 1.6, repeat: Infinity, ease: "easeInOut" }}
                    >
                      <Lock className="h-12 w-12 text-orange-500" />
                    </motion.div>
                    <span className="absolute inset-0 rounded-[2rem] bg-gradient-to-br from-white/10 to-transparent" />
                  </div>
                </div>

                {/* text + stages */}
                <div className="relative z-10 mt-12 text-center">
                  <AnimatePresence mode="wait">
                    <motion.h2
                      key={stage}
                      initial={{ opacity: 0, y: 14, filter: "blur(6px)" }}
                      animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
                      exit={{ opacity: 0, y: -14, filter: "blur(6px)" }}
                      transition={{ duration: 0.4 }}
                      className="font-[family-name:var(--font-display)] text-2xl font-bold uppercase tracking-[0.18em] text-white drop-shadow-[0_0_15px_rgba(255,255,255,0.3)] sm:text-3xl"
                    >
                      {STAGES[stage]}
                    </motion.h2>
                  </AnimatePresence>

                  <div className="mx-auto mt-6 flex max-w-xs flex-col gap-2 text-left">
                    {STAGES.map((s, i) => (
                      <div
                        key={s}
                        className={`flex items-center gap-2 text-sm font-medium transition-colors duration-500 ${
                          i < stage ? "text-emerald-400" : i === stage ? "text-orange-300" : "text-neutral-600"
                        }`}
                      >
                        {i < stage ? (
                          <CheckCircle2 className="h-4 w-4" />
                        ) : (
                          <span
                            className={`h-2 w-2 rounded-full ${i === stage ? "animate-pulse bg-orange-400" : "bg-neutral-700"}`}
                          />
                        )}
                        {s}
                      </div>
                    ))}
                  </div>

                  <div className="mx-auto mt-8 h-1 w-64 overflow-hidden rounded-full bg-white/10">
                    <motion.div
                      className="h-full rounded-full bg-gradient-to-r from-orange-600 via-orange-400 to-amber-300 shadow-[0_0_12px_rgba(249,115,22,0.9)]"
                      initial={{ width: "0%" }}
                      animate={{ width: "100%" }}
                      transition={{ duration: 3, ease: "easeInOut" }}
                    />
                  </div>
                </div>

                {/* scanning laser */}
                <motion.div
                  initial={{ top: "-20%" }}
                  animate={{ top: "120%" }}
                  transition={{ duration: 2.5, repeat: Infinity, ease: "linear" }}
                  className="absolute left-0 right-0 h-[2px] bg-gradient-to-r from-transparent via-orange-500 to-transparent opacity-60 shadow-[0_0_30px_5px_rgba(249,115,22,0.6)]"
                />

                {/* vignette */}
                <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_center,transparent_50%,rgba(0,0,0,0.6)_100%)]" />
              </motion.div>
            )}
          </AnimatePresence>,
          document.body
        )}
    </div>
  );
}