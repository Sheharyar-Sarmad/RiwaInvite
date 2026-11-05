"use client";

import { useEffect, useId, useState } from "react";
import type { ReactNode } from "react";
import { createPortal } from "react-dom";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  AnimatePresence,
  motion,
  useAnimationControls,
  useMotionValue,
  useReducedMotion,
  type Variants,
} from "framer-motion";
import {
  User,
  Mail,
  Phone,
  Lock,
  Eye,
  EyeOff,
  ArrowRight,
  CheckCircle2,
  Circle,
  Check,
  Copy,
  ShieldAlert,
  AlertTriangle,
  Loader2,
  Sparkles,
  X,
  type LucideIcon,
} from "lucide-react";
import { apiClient } from "@/lib/api/api_base";
import { CardBackdrop } from "@/components/public/sections/auth/CardBackdrop";

/* ------------------------------------------------------------------ */
/* styles + motion presets                                             */
/* ------------------------------------------------------------------ */
const focusRing =
  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-500 focus-visible:ring-offset-2 focus-visible:ring-offset-[#fdeadb]";
const primaryBtn =
  "bg-gradient-to-b from-[#fb8a3c] to-[#f97316] shadow-[0_10px_30px_-10px_rgba(249,115,22,0.8),inset_0_1px_0_rgba(255,255,255,0.3)]";
const inputBase =
  "w-full rounded-xl border border-orange-200/70 bg-white/60 py-2.5 pl-11 text-sm text-gray-900 placeholder:text-gray-400 outline-none backdrop-blur-sm transition-all hover:border-orange-300 hover:bg-white/80 focus:border-orange-400 focus:bg-white focus:shadow-[0_0_0_4px_rgba(249,115,22,0.15)]";

const EASE_OUT: [number, number, number, number] = [0.16, 1, 0.3, 1];

const cardV: Variants = {
  hidden: { opacity: 0, y: 80, rotateX: 16, scale: 0.94 },
  show: {
    opacity: 1,
    y: 0,
    rotateX: 0,
    scale: 1,
    transition: { duration: 1.4, ease: EASE_OUT, staggerChildren: 0.12, delayChildren: 0.3 },
  },
};
const itemV: Variants = {
  hidden: { opacity: 0, y: 22 },
  show: { opacity: 1, y: 0, transition: { duration: 0.9, ease: EASE_OUT } },
};
const staggerV: Variants = {
  hidden: {},
  show: { transition: { staggerChildren: 0.08 } },
};
const titleV: Variants = {
  hidden: {},
  show: { transition: { staggerChildren: 0.12 } },
};
const wordV: Variants = {
  hidden: { y: "115%" },
  show: { y: "0%", transition: { duration: 1.1, ease: EASE_OUT } },
};

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

/* ------------------------------------------------------------------ */
/* helpers                                                             */
/* ------------------------------------------------------------------ */
function generatePassword(len = 14) {
  const U = "ABCDEFGHJKLMNPQRSTUVWXYZ";
  const L = "abcdefghijkmnopqrstuvwxyz";
  const N = "23456789";
  const all = U + L + N;
  const rnd = (n: number) => {
    const a = new Uint32Array(1);
    crypto.getRandomValues(a);
    return a[0] % n;
  };
  const pick = (s: string) => s[rnd(s.length)];
  const chars = [pick(U), pick(L), pick(N)];
  while (chars.length < len) chars.push(pick(all));
  for (let i = chars.length - 1; i > 0; i--) {
    const j = rnd(i + 1);
    [chars[i], chars[j]] = [chars[j], chars[i]];
  }
  return chars.join("");
}

async function copyText(text: string) {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    return false;
  }
}

/** "0300 1234567" -> "+923001234567", "+92 300 1234567" -> "+923001234567" */
function normalizePhone(raw: string): string {
  const c = raw.replace(/[\s\-().]/g, "");
  if (!c) return "";
  if (c.startsWith("+")) return c;
  if (c.startsWith("00")) return `+${c.slice(2)}`;
  if (c.startsWith("0")) return `+92${c.slice(1)}`; // Pakistan local format
  if (c.startsWith("92")) return `+${c}`;
  return `+${c}`;
}

const FIELD_LABELS: Record<string, string> = {
  first_name: "First name",
  last_name: "Last name",
  email: "Email",
  password: "Password",
  phone_number: "Phone",
};

function extractError(err: unknown): string {
  const data = (err as { response?: { data?: any } })?.response?.data;
  if (!data) return "Network error. Please check your connection and try again.";

  if (data.error && typeof data.error === "object" && !Array.isArray(data.error)) {
    const parts = Object.entries(data.error as Record<string, string[]>)
      .filter(([, v]) => Array.isArray(v) && v.length)
      .map(([k, v]) => `${FIELD_LABELS[k] ?? k}: ${v[0]}`);
    if (parts.length) return parts.join(" · ");
  }

  if (typeof data.message === "string") return data.message;
  return "Something went wrong. Please try again.";
}

/* ------------------------------------------------------------------ */
/* field                                                               */
/* ------------------------------------------------------------------ */
type FieldProps = React.InputHTMLAttributes<HTMLInputElement> & {
  label: string;
  icon: LucideIcon;
  optional?: boolean;
  valid?: boolean;
  trailing?: ReactNode;
  labelAction?: ReactNode;
};

function Field({
  label,
  icon: Icon,
  optional,
  valid,
  trailing,
  labelAction,
  className = "",
  ...props
}: FieldProps) {
  const id = useId();
  return (
    <div>
      <div className="mb-1.5 flex h-5 items-center justify-between">
        <label htmlFor={id} className="text-sm font-bold text-gray-700">
          {label}
          {optional && <span className="ml-1 font-medium text-gray-500">(Optional)</span>}
        </label>
        {labelAction}
      </div>
      <div className="relative">
        <Icon className="pointer-events-none absolute left-4 top-1/2 z-10 h-4 w-4 -translate-y-1/2 text-orange-500" />
        <input id={id} {...props} className={`${inputBase} ${trailing ? "pr-12" : "pr-10"} ${className}`} />
        {trailing ?? (
          <Check
            aria-hidden
            className={`pointer-events-none absolute right-4 top-1/2 h-4 w-4 -translate-y-1/2 text-emerald-500 transition-opacity duration-300 ${
              valid ? "opacity-100" : "opacity-0"
            }`}
          />
        )}
      </div>
    </div>
  );
}

function Rule({ ok, children }: { ok: boolean; children: ReactNode }) {
  const Icon = ok ? CheckCircle2 : Circle;
  return (
    <div
      className={`flex items-center gap-1.5 transition-colors duration-300 ${
        ok ? "text-emerald-600" : "text-gray-500"
      }`}
    >
      <Icon className="h-3.5 w-3.5" /> {children}
    </div>
  );
}

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

const strengthMeta = [
  { label: "Too weak", bar: "bg-red-400", text: "text-red-500" },
  { label: "Weak", bar: "bg-red-400", text: "text-red-500" },
  { label: "Fair", bar: "bg-amber-400", text: "text-amber-600" },
  { label: "Good", bar: "bg-lime-500", text: "text-lime-600" },
  { label: "Strong", bar: "bg-emerald-500", text: "text-emerald-600" },
];

type RegisterData = {
  first_name: string;
  last_name: string;
  email: string;
  phone_number: string;
  password: string;
};

const BURST = Array.from({ length: 16 }, (_, i) => {
  const a = (i / 16) * Math.PI * 2;
  const d = 62 + (i % 3) * 16;
  return {
    x: Math.cos(a) * d,
    y: Math.sin(a) * d,
    c: ["bg-orange-400", "bg-amber-300", "bg-emerald-400"][i % 3],
    s: 5 + (i % 3) * 2,
  };
});

/* ------------------------------------------------------------------ */
/* form                                                                */
/* ------------------------------------------------------------------ */
export function RegisterForm({ enterDelay = 0.9 }: { enterDelay?: number }) {
  const router = useRouter();
  const reduce = useReducedMotion() ?? false;
  const shake = useAnimationControls();

  // pointer position (-0.5..0.5) for the card spotlight
  const mx = useMotionValue(0);
  const my = useMotionValue(0);
  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (reduce) return;
    const r = e.currentTarget.getBoundingClientRect();
    mx.set((e.clientX - r.left) / r.width - 0.5);
    my.set((e.clientY - r.top) / r.height - 0.5);
  };

  const [formData, setFormData] = useState<RegisterData>({
    first_name: "",
    last_name: "",
    email: "",
    phone_number: "",
    password: "",
  });
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");
  const [isUnderstood, setIsUnderstood] = useState(false);
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [generated, setGenerated] = useState(false);
  const [copiedCreds, setCopiedCreds] = useState(false);

  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  const [go, setGo] = useState(reduce);
  useEffect(() => {
    if (reduce) {
      setGo(true);
      return;
    }
    const id = setTimeout(() => setGo(true), enterDelay * 1000);
    return () => clearTimeout(id);
  }, [enterDelay, reduce]);

  const set = (key: keyof RegisterData) => (e: React.ChangeEvent<HTMLInputElement>) =>
    setFormData((p) => ({ ...p, [key]: e.target.value }));

  const pw = formData.password;
  const hasLength = pw.length >= 8;
  const hasUpper = /[A-Z]/.test(pw);
  const hasLower = /[a-z]/.test(pw);
  const hasNumber = /[0-9]/.test(pw);
  const score = [hasLength, hasUpper, hasLower, hasNumber].filter(Boolean).length;
  const isStrong = score === 4;
  const meta = strengthMeta[pw ? score : 0];

  const firstOk = formData.first_name.trim().length >= 2;
  const lastOk = formData.last_name.trim().length >= 2;
  const emailOk = EMAIL_RE.test(formData.email.trim());
  const done = [firstOk, lastOk, emailOk, isStrong].filter(Boolean).length;
  const canSubmit = !isLoading && isUnderstood && isStrong;

  useEffect(() => {
    if (!error) return;
    shake.start({ x: [0, -10, 10, -7, 7, -3, 0], transition: { duration: 0.5 } });
    const id = setTimeout(() => setError(""), 7000);
    return () => clearTimeout(id);
  }, [error, shake]);

  const handleGenerate = async () => {
    const next = generatePassword();
    setFormData((p) => ({ ...p, password: next }));
    setShowPassword(true);
    await copyText(next);
    setGenerated(true);
    setTimeout(() => setGenerated(false), 2200);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isLoading) return;

    if (!isStrong) {
      setError("Please ensure your password meets all requirements.");
      return;
    }

    const phone = normalizePhone(formData.phone_number);
    if (phone && !/^\+[1-9]\d{1,14}$/.test(phone)) {
      setError("Phone: enter a valid number, e.g. +923001234567 or 0300 1234567");
      return;
    }

    setIsLoading(true);
    setError("");

    try {
      const payload: Record<string, string> = {
        first_name: formData.first_name.trim(),
        last_name: formData.last_name.trim(),
        email: formData.email.trim().toLowerCase(),
        password: formData.password,
      };
      if (phone) payload.phone_number = phone;

      const res = await apiClient.post("/user/auth/register", payload);
      if (res.data.status === "success") setShowSuccessModal(true);
    } catch (err) {
      console.error("Register failed:", (err as any)?.response?.data ?? err);
      setError(extractError(err));
    } finally {
      setIsLoading(false);
    }
  };

  const handleCopyCreds = async () => {
    const ok = await copyText(`Email: ${formData.email.trim()}\nPassword: ${formData.password}`);
    if (ok) {
      setCopiedCreds(true);
      setTimeout(() => setCopiedCreds(false), 2200);
    }
  };

  return (
    <>
      <div className="[perspective:1400px]">
        <motion.div animate={shake}>
          <motion.div
            variants={cardV}
            initial={reduce ? false : "hidden"}
            animate={go ? "show" : "hidden"}
            onMouseMove={handleMouseMove}
            style={{ transformOrigin: "50% 100%" }}
            whileHover={reduce ? undefined : { y: -4, scale: 1.005 }}
            className="relative isolate w-full rounded-[2rem] border border-orange-200/70 p-6 shadow-[0_30px_80px_-30px_rgba(249,115,22,0.65)] backdrop-blur-xl sm:p-8"
          >
            <CardBackdrop reduce={reduce} mx={mx} my={my} />
            <GlowRing reduce={reduce} />

            <div className="absolute inset-x-0 top-0 h-1 overflow-hidden rounded-t-[2rem]">
              <motion.div
                initial={false}
                animate={{ scaleX: done / 4 }}
                transition={{ type: "spring", stiffness: 140, damping: 22 }}
                className="h-full origin-left bg-gradient-to-r from-orange-400 via-orange-500 to-amber-400"
              />
            </div>

            <motion.div variants={titleV} className="mb-6 text-center">
              <h1 className="font-[family-name:var(--font-display)] text-3xl font-extrabold tracking-tight text-gray-900">
                {["Create", "Account"].map((w) => (
                  <span key={w} className="mr-[0.25em] inline-block overflow-hidden pb-[0.12em] align-bottom last:mr-0">
                    <motion.span variants={wordV} className="inline-block">
                      {w}
                    </motion.span>
                  </span>
                ))}
              </h1>
              <motion.p variants={itemV} className="mt-1 text-sm font-medium text-gray-700">
                Start designing your unforgettable event.
              </motion.p>
              <motion.p
                variants={itemV}
                className="mt-2 text-[11px] font-bold uppercase tabular-nums tracking-widest text-orange-700/80"
              >
                {done} / 4 required steps
              </motion.p>
            </motion.div>

            <motion.form variants={staggerV} onSubmit={handleSubmit} className="space-y-4">
              <motion.div variants={itemV} className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <Field
                  label="First Name"
                  icon={User}
                  required
                  minLength={2}
                  maxLength={50}
                  type="text"
                  autoComplete="given-name"
                  value={formData.first_name}
                  onChange={set("first_name")}
                  valid={firstOk}
                  placeholder="Sarah"
                  className={focusRing}
                />
                <Field
                  label="Last Name"
                  icon={User}
                  required
                  minLength={2}
                  maxLength={50}
                  type="text"
                  autoComplete="family-name"
                  value={formData.last_name}
                  onChange={set("last_name")}
                  valid={lastOk}
                  placeholder="Ahmed"
                  className={focusRing}
                />
              </motion.div>

              <motion.div variants={itemV}>
                <Field
                  label="Email Address"
                  icon={Mail}
                  required
                  type="email"
                  autoComplete="email"
                  value={formData.email}
                  onChange={set("email")}
                  valid={emailOk}
                  placeholder="you@example.com"
                  className={focusRing}
                />
              </motion.div>

              <motion.div variants={itemV}>
                <Field
                  label="Phone Number"
                  optional
                  icon={Phone}
                  type="tel"
                  autoComplete="tel"
                  value={formData.phone_number}
                  onChange={set("phone_number")}
                  placeholder="0300 1234567"
                  className={focusRing}
                />
              </motion.div>

              <motion.div variants={itemV}>
                <Field
                  label="Master Password"
                  icon={Lock}
                  required
                  type={showPassword ? "text" : "password"}
                  autoComplete="new-password"
                  value={formData.password}
                  onChange={set("password")}
                  placeholder="Create a strong password"
                  className={focusRing}
                  labelAction={
                    <button
                      type="button"
                      onClick={handleGenerate}
                      className="flex min-w-[96px] items-center justify-end gap-1 rounded-md px-1 text-[11px] font-extrabold text-orange-600 transition-colors hover:text-orange-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-500"
                    >
                      {generated ? (
                        <>
                          <Check className="h-3 w-3" /> Copied
                        </>
                      ) : (
                        <>
                          <Sparkles className="h-3 w-3" /> Generate
                        </>
                      )}
                    </button>
                  }
                  trailing={
                    <button
                      type="button"
                      onClick={() => setShowPassword((s) => !s)}
                      aria-label={showPassword ? "Hide password" : "Show password"}
                      className="absolute right-3 top-1/2 -translate-y-1/2 rounded-md p-1 text-gray-400 transition-colors hover:text-gray-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-500"
                    >
                      {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  }
                />

                <div className="mt-3" aria-live="polite">
                  <div className="flex gap-1.5">
                    {[1, 2, 3, 4].map((i) => (
                      <div key={i} className="h-1.5 flex-1 overflow-hidden rounded-full bg-orange-200/60">
                        <motion.div
                          initial={false}
                          animate={{ scaleX: pw && score >= i ? 1 : 0 }}
                          transition={{ duration: 0.3 }}
                          className={`h-full origin-left rounded-full ${meta.bar}`}
                        />
                      </div>
                    ))}
                  </div>
                  <p className={`mt-1.5 h-4 text-right text-[11px] font-bold ${pw ? meta.text : "text-gray-500"}`}>
                    {pw ? meta.label : "Enter a password"}
                  </p>
                </div>

                <div className="mt-1 grid grid-cols-2 gap-1.5 text-[11px] font-bold">
                  <Rule ok={hasLength}>8+ Characters</Rule>
                  <Rule ok={hasUpper}>Uppercase</Rule>
                  <Rule ok={hasLower}>Lowercase</Rule>
                  <Rule ok={hasNumber}>Number</Rule>
                </div>
              </motion.div>

              <motion.div variants={itemV} className="rounded-xl border border-red-200 bg-red-50/80 p-3 shadow-sm backdrop-blur-sm">
                <div className="flex items-start gap-3">
                  <ShieldAlert className="mt-0.5 h-5 w-5 shrink-0 text-red-600" />
                  <div>
                    <p className="text-xs font-extrabold uppercase tracking-wider text-red-800">
                      Zero Recovery Policy
                    </p>
                    <p className="mt-1 text-[12px] font-medium leading-relaxed text-red-700">
                      We do not store plain-text passwords.{" "}
                      <strong>
                        If you lose this password, your templates, invitations, and RSVPs are permanently lost.
                      </strong>
                    </p>
                  </div>
                </div>
              </motion.div>

              <motion.label
                variants={itemV}
                className="flex cursor-pointer items-start gap-3 rounded-xl border border-orange-200 bg-white/60 p-3 backdrop-blur-sm transition-colors hover:bg-white/90"
              >
                <input
                  type="checkbox"
                  required
                  checked={isUnderstood}
                  onChange={(e) => setIsUnderstood(e.target.checked)}
                  className="mt-0.5 h-4 w-4 rounded border-gray-300 accent-orange-600"
                />
                <span className="text-[12px] font-semibold leading-snug text-gray-700">
                  I understand that I must save this password safely, and RiwaInvite cannot recover my account
                  data if I forget it.
                </span>
              </motion.label>

              <motion.div variants={itemV} className="pt-1">
                <button
                  type="submit"
                  disabled={!canSubmit}
                  className={`relative flex w-full items-center justify-center gap-2 overflow-hidden rounded-xl py-3.5 font-bold text-white transition-transform hover:scale-[1.02] active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:scale-100 ${primaryBtn} ${focusRing}`}
                >
                  {canSubmit && !reduce && (
                    <motion.span
                      aria-hidden
                      className="pointer-events-none absolute inset-y-0 left-0 w-1/3 -skew-x-12 bg-gradient-to-r from-transparent via-white/50 to-transparent"
                      initial={{ x: "-150%" }}
                      animate={{ x: "450%" }}
                      transition={{ duration: 1.4, repeat: Infinity, repeatDelay: 2.2, ease: "easeInOut" }}
                    />
                  )}
                  <span className="relative flex items-center gap-2">
                    {isLoading ? (
                      <>
                        <Loader2 className="h-4 w-4 animate-spin" /> Creating Account...
                      </>
                    ) : (
                      <>
                        Create Account <ArrowRight className="h-4 w-4" />
                      </>
                    )}
                  </span>
                </button>
              </motion.div>
            </motion.form>

            <motion.p variants={itemV} className="mt-6 text-center text-sm font-medium text-gray-700">
              Already have an account?{" "}
              <Link href="/login" className="font-bold text-orange-600 hover:underline">
                Sign in
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
                    key="toast"
                    role="alert"
                    initial={{ opacity: 0, y: -16, scale: 0.96 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: -10, scale: 0.97 }}
                    transition={{ type: "spring", damping: 24, stiffness: 320 }}
                    className="pointer-events-auto flex max-w-md items-start gap-3 rounded-2xl border border-red-200 bg-white/95 p-3.5 pr-3 shadow-[0_20px_50px_-20px_rgba(220,38,38,0.5)] backdrop-blur-xl"
                  >
                    <span className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-red-100 text-red-600">
                      <AlertTriangle className="h-3.5 w-3.5" />
                    </span>
                    <p className="text-sm font-bold leading-snug text-red-700">{error}</p>
                    <button
                      type="button"
                      onClick={() => setError("")}
                      aria-label="Dismiss"
                      className="rounded-md p-1 text-red-400 transition-colors hover:text-red-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-400"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            <AnimatePresence>
              {showSuccessModal && (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  role="dialog"
                  aria-modal="true"
                  aria-labelledby="success-title"
                  data-scroll-lock
                  className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/60 p-4 backdrop-blur-md"
                >
                  <motion.div
                    initial={{ scale: 0.88, y: 30, rotateX: 12 }}
                    animate={{ scale: 1, y: 0, rotateX: 0 }}
                    transition={{ type: "spring", damping: 22, stiffness: 240 }}
                    className="w-full max-w-md rounded-3xl border border-orange-200 bg-[#fdeadb] p-8 text-center shadow-2xl"
                  >
                    <div className="relative mx-auto mb-4 flex h-16 w-16 items-center justify-center">
                      <motion.div
                        initial={{ scale: 0 }}
                        animate={{ scale: 1 }}
                        transition={{ type: "spring", stiffness: 260, damping: 16, delay: 0.1 }}
                        className="flex h-16 w-16 items-center justify-center rounded-full bg-emerald-100 text-emerald-600 shadow-inner"
                      >
                        <svg viewBox="0 0 52 52" className="h-9 w-9" fill="none" stroke="currentColor" strokeWidth={3.5}>
                          <motion.circle
                            cx="26"
                            cy="26"
                            r="22"
                            strokeLinecap="round"
                            initial={{ pathLength: 0 }}
                            animate={{ pathLength: 1 }}
                            transition={{ duration: 0.7, delay: 0.25, ease: "easeOut" }}
                          />
                          <motion.path
                            d="M15 27l8 8 14-16"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            initial={{ pathLength: 0 }}
                            animate={{ pathLength: 1 }}
                            transition={{ duration: 0.45, delay: 0.75, ease: "easeOut" }}
                          />
                        </svg>
                      </motion.div>

                      {!reduce &&
                        BURST.map((p, i) => (
                          <motion.span
                            key={i}
                            aria-hidden
                            className={`absolute left-1/2 top-1/2 rounded-full ${p.c}`}
                            style={{ width: p.s, height: p.s, marginLeft: -p.s / 2, marginTop: -p.s / 2 }}
                            initial={{ x: 0, y: 0, scale: 0, opacity: 1 }}
                            animate={{ x: p.x, y: p.y, scale: [0, 1.2, 0.5], opacity: [1, 1, 0] }}
                            transition={{ duration: 1.1, delay: 0.7, ease: "easeOut" }}
                          />
                        ))}
                    </div>

                    <motion.h3
                      id="success-title"
                      initial={{ opacity: 0, y: 12 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: 0.5, duration: 0.6, ease: EASE_OUT }}
                      className="mb-2 font-[family-name:var(--font-display)] text-2xl font-extrabold text-gray-900"
                    >
                      Account Created.
                    </motion.h3>
                    <motion.p
                      initial={{ opacity: 0, y: 12 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: 0.62, duration: 0.6, ease: EASE_OUT }}
                      className="mb-5 text-sm font-medium leading-relaxed text-gray-700"
                    >
                      Before you enter your dashboard,{" "}
                      <strong>save your email and password somewhere safe.</strong> We cannot retrieve them for you.
                    </motion.p>

                    <motion.div
                      initial={{ opacity: 0, y: 14 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: 0.78, duration: 0.6, ease: EASE_OUT }}
                    >
                      <button
                        type="button"
                        onClick={handleCopyCreds}
                        className={`mb-3 flex w-full cursor-pointer items-center justify-center gap-2 rounded-xl border border-orange-300 bg-white/70 py-2.5 text-sm font-bold text-orange-700 transition-colors hover:bg-white ${focusRing}`}
                      >
                        {copiedCreds ? (
                          <>
                            <Check className="h-4 w-4" /> Copied to clipboard
                          </>
                        ) : (
                          <>
                            <Copy className="h-4 w-4" /> Copy email &amp; password
                          </>
                        )}
                      </button>

                      <button
                        autoFocus
                        onClick={() => router.push("/dashboard")}
                        className={`w-full cursor-pointer rounded-xl bg-gray-900 py-3 font-bold text-white transition-transform hover:scale-[1.02] ${focusRing}`}
                      >
                        I Have Saved It. Enter Dashboard
                      </button>
                    </motion.div>
                  </motion.div>
                </motion.div>
              )}
            </AnimatePresence>
          </>,
          document.body,
        )}
    </>
  );
}