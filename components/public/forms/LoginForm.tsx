"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { createPortal } from "react-dom";
import {
  motion,
  AnimatePresence,
  useAnimationControls,
  useMotionValue,
  useTransform,
  useSpring,
  useReducedMotion,
  type Variants,
} from "framer-motion";
import { Mail, Lock, Eye, EyeOff, ArrowRight, Loader2, AlertTriangle, MessageCircle, X } from "lucide-react";
import { apiClient } from "@/lib/api/api_base";
import { CardBackdrop } from "@/components/public/sections/auth/CardBackdrop";

const focusRing = "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-500 focus-visible:ring-offset-2 focus-visible:ring-offset-[#fdeadb]";
const primaryBtn = "bg-gradient-to-b from-[#fb8a3c] to-[#f97316] shadow-[0_10px_30px_-10px_rgba(249,115,22,0.8),inset_0_1px_0_rgba(255,255,255,0.3)]";
const inputBase = "w-full rounded-xl border border-orange-200/70 bg-white/60 py-2.5 pl-11 text-sm text-gray-900 placeholder:text-gray-400 outline-none backdrop-blur-sm transition-all hover:border-orange-300 hover:bg-white/80 focus:border-orange-400 focus:bg-white focus:shadow-[0_0_0_4px_rgba(249,115,22,0.15)]";

const EASE_OUT: [number, number, number, number] = [0.16, 1, 0.3, 1];

const cardV: Variants = {
  hidden: { opacity: 0, y: 80, rotateX: 16, scale: 0.94 },
  show: {
    opacity: 1,
    y: 0,
    rotateX: 0,
    scale: 1,
    transition: { duration: 1.2, ease: EASE_OUT, staggerChildren: 0.1, delayChildren: 0.3 },
  },
};
const itemV: Variants = {
  hidden: { opacity: 0, y: 22 },
  show: { opacity: 1, y: 0, transition: { duration: 0.8, ease: EASE_OUT } },
};
const staggerV: Variants = {
  hidden: {},
  show: { transition: { staggerChildren: 0.08 } },
};
const titleV: Variants = {
  hidden: {},
  show: { transition: { staggerChildren: 0.1 } },
};
const wordV: Variants = {
  hidden: { y: "115%" },
  show: { y: "0%", transition: { duration: 1, ease: EASE_OUT } },
};

// Orbiting light along the card border
function GlowRing({ reduce }: { reduce: boolean }) {
  return (
    <div
      aria-hidden
      className="pointer-events-none absolute inset-0 z-10 overflow-hidden rounded-[2rem] bg-white/10 p-[1.5px]"
      style={{
        WebkitMask: "linear-gradient(#000 0 0) content-box, linear-gradient(#000 0 0)",
        WebkitMaskComposite: "xor",
        mask: "linear-gradient(#000 0 0) content-box exclude, linear-gradient(#000 0 0)",
      }}
    >
      <div className="absolute inset-0 grid place-items-center">
        <motion.div
          className="h-[240%] w-[240%] shrink-0"
          style={{
            background:
              "conic-gradient(from 0deg, transparent 0deg, transparent 220deg, rgba(251,146,60,0.0) 230deg, #fb923c 290deg, #fde68a 330deg, transparent 360deg)",
          }}
          animate={reduce ? undefined : { rotate: 360 }}
          transition={{ duration: 8, repeat: Infinity, ease: "linear" }}
        />
      </div>
    </div>
  );
}

export function LoginForm({ enterDelay = 0.9 }: { enterDelay?: number }) {
  const router = useRouter();
  const reduce = useReducedMotion() ?? false;
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");
  const [showLostPass, setShowLostPass] = useState(false);
  const [mounted, setMounted] = useState(false);
  const shake = useAnimationControls();

  // 3D Tilt Logic
  const x = useMotionValue(0);
  const y = useMotionValue(0);
  const mouseXSpring = useSpring(x, { stiffness: 300, damping: 30 });
  const mouseYSpring = useSpring(y, { stiffness: 300, damping: 30 });
  const rotateX = useTransform(mouseYSpring, [-0.5, 0.5], [7, -7]);
  const rotateY = useTransform(mouseXSpring, [-0.5, 0.5], [-7, 7]);

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (reduce) return;
    const rect = e.currentTarget.getBoundingClientRect();
    x.set((e.clientX - rect.left) / rect.width - 0.5);
    y.set((e.clientY - rect.top) / rect.height - 0.5);
  };

  const handleMouseLeave = () => {
    x.set(0);
    y.set(0);
  };

  useEffect(() => setMounted(true), []);

  const [go, setGo] = useState(false);
  useEffect(() => {
    const id = setTimeout(() => setGo(true), enterDelay * 1000);
    return () => clearTimeout(id);
  }, [enterDelay]);

  useEffect(() => {
    if (!error) return;
    shake.start({ x: [0, -10, 10, -7, 7, -3, 0], transition: { duration: 0.5 } });
    const id = setTimeout(() => setError(""), 7000);
    return () => clearTimeout(id);
  }, [error, shake]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isLoading) return;

    setIsLoading(true);
    setError("");

    try {
      const res = await apiClient.post("/user/auth/login", { email, password });
      if (res.data.status === "success") {
        router.push("/dashboard");
        router.refresh();
      }
    } catch (err: any) {
      setError(err.response?.data?.message || "Invalid email or password.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <>
      {/* Wrapper for 3D perspective */}
      <div className="[perspective:1200px]">
        <motion.div animate={shake}>
          <motion.div
            variants={cardV}
            initial="hidden"
            animate={go ? "show" : "hidden"}
            onMouseMove={handleMouseMove}
            onMouseLeave={handleMouseLeave}
            style={{
              transformOrigin: "50% 50%",
              rotateX: reduce ? 0 : rotateX,
              rotateY: reduce ? 0 : rotateY,
            }}
            className="relative isolate w-full rounded-[2rem] border border-orange-200/70 p-6 shadow-[0_30px_80px_-30px_rgba(249,115,22,0.65)] backdrop-blur-xl sm:p-8"
          >
            <CardBackdrop reduce={reduce} mx={x} my={y} />
            <GlowRing reduce={reduce} />

            <motion.div variants={titleV} className="mb-6 text-center">
              <h1 className="font-[family-name:var(--font-display)] text-3xl font-extrabold tracking-tight text-gray-900">
                {["Welcome", "Back"].map((w) => (
                  <span key={w} className="mr-[0.25em] inline-block overflow-hidden pb-[0.12em] align-bottom last:mr-0">
                    <motion.span variants={wordV} className="inline-block">{w}</motion.span>
                  </span>
                ))}
              </h1>
              <motion.p variants={itemV} className="mt-1 text-sm font-medium text-gray-700">
                Enter your credentials to access your dashboard.
              </motion.p>
            </motion.div>

            <motion.form variants={staggerV} onSubmit={handleSubmit} className="space-y-4">
              <motion.div variants={itemV}>
                <label className="mb-1.5 block text-sm font-bold text-gray-700">Email Address</label>
                <div className="relative">
                  <Mail className="pointer-events-none absolute left-4 top-1/2 z-10 h-4 w-4 -translate-y-1/2 text-orange-500" />
                  <input
                    required
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="you@example.com"
                    className={`${inputBase} pr-10 ${focusRing}`}
                  />
                </div>
              </motion.div>

              <motion.div variants={itemV}>
                <div className="mb-1.5 flex items-center justify-between">
                  <label className="text-sm font-bold text-gray-700">Password</label>
                  <button
                    type="button"
                    onClick={() => setShowLostPass(true)}
                    className="text-[11px] font-extrabold text-orange-600 hover:underline focus-visible:outline-none"
                  >
                    Lost your password?
                  </button>
                </div>
                <div className="relative">
                  <Lock className="pointer-events-none absolute left-4 top-1/2 z-10 h-4 w-4 -translate-y-1/2 text-orange-500" />
                  <input
                    required
                    type={showPassword ? "text" : "password"}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Enter your password"
                    className={`${inputBase} pr-12 ${focusRing}`}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    aria-label={showPassword ? "Hide password" : "Show password"}
                    className="absolute right-3 top-1/2 -translate-y-1/2 rounded-md p-1 text-gray-400 hover:text-gray-700 focus-visible:outline-none"
                  >
                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </motion.div>

              <motion.div variants={itemV} className="pt-2">
                <button
                  type="submit"
                  disabled={isLoading}
                  className={`flex w-full items-center justify-center gap-2 rounded-xl py-3.5 font-bold text-white transition-transform hover:scale-[1.02] active:scale-[0.98] disabled:opacity-50 disabled:hover:scale-100 ${primaryBtn} ${focusRing}`}
                >
                  {isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : "Sign In"}
                  {!isLoading && <ArrowRight className="h-4 w-4" />}
                </button>
              </motion.div>
            </motion.form>

            <motion.p variants={itemV} className="mt-6 text-center text-sm font-medium text-gray-700">
              Don't have an account?{" "}
              <Link href="/register" className="font-bold text-orange-600 hover:underline">
                Create one
              </Link>
            </motion.p>
          </motion.div>
        </motion.div>
      </div>

      {mounted &&
        createPortal(
          <>
            <div className="pointer-events-none fixed inset-x-4 top-4 z-[10000] flex justify-center">
              <AnimatePresence>
                {error && (
                  <motion.div
                    initial={{ opacity: 0, y: -16, scale: 0.96 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: -10, scale: 0.97 }}
                    className="pointer-events-auto flex max-w-md items-start gap-3 rounded-2xl border border-red-200 bg-white/95 p-3.5 pr-3 shadow-lg backdrop-blur-xl"
                  >
                    <span className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-red-100 text-red-600">
                      <AlertTriangle className="h-3.5 w-3.5" />
                    </span>
                    <p className="text-sm font-bold leading-snug text-red-700">{error}</p>
                    <button onClick={() => setError("")} className="rounded-md p-1 text-red-400 hover:text-red-700">
                      <X className="h-4 w-4" />
                    </button>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            <AnimatePresence>
              {showLostPass && (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/60 p-4 backdrop-blur-md"
                >
                  <motion.div
                    initial={{ scale: 0.88, y: 30, rotateX: 12 }}
                    animate={{ scale: 1, y: 0, rotateX: 0 }}
                    className="w-full max-w-md rounded-3xl border border-orange-200 bg-[#fdeadb] p-8 shadow-2xl"
                  >
                    <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-red-100 text-red-600">
                      <AlertTriangle className="h-6 w-6" />
                    </div>
                    <h3 className="mb-2 font-[family-name:var(--font-display)] text-2xl font-bold text-gray-900">Zero Recovery Policy</h3>
                    <p className="mb-6 text-sm leading-relaxed text-gray-700 font-medium">
                      For your security, we do not store plain-text passwords. There is no automated email reset. If you have lost your password, you must contact our support team to manually verify your identity.
                    </p>
                    <div className="flex flex-col gap-3">
                      <a href="https://wa.me/YOUR_WHATSAPP_NUMBER" target="_blank" rel="noreferrer" className="flex w-full items-center justify-center gap-2 rounded-xl bg-[#25D366] py-3 font-bold text-white hover:bg-[#20ba5a]">
                        <MessageCircle className="h-5 w-5" /> Contact Support on WhatsApp
                      </a>
                      <button onClick={() => setShowLostPass(false)} className="flex w-full items-center justify-center gap-2 rounded-xl bg-white/60 py-3 font-bold text-gray-700 hover:bg-white">
                        Close
                      </button>
                    </div>
                  </motion.div>
                </motion.div>
              )}
            </AnimatePresence>
          </>,
          document.body
        )}
    </>
  );
}