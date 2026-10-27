"use client";

import { useState } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { motion } from "framer-motion";
import { ReactLenis } from "lenis/react";

import {
  Loader2, Mail, Lock, Eye, EyeOff, ArrowRight, AlertCircle,
  ShoppingBag, LayoutTemplate, Users, ShieldCheck,
} from "lucide-react";

import { apiClient } from "@/lib/api/api_base";
import { toast } from "@/components/ui/toast";

import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

// Where to send the admin after a successful sign-in. Change to match your route.
const REDIRECT_TO = "/admin/dashboard";

const formSchema = z.object({
  email: z.string().min(1, "Enter your email").email("Enter a valid email address"),
  password: z.string().min(1, "Enter your password"),
});
type Values = z.infer<typeof formSchema>;

const display = "font-[family-name:var(--font-display)]";

const inputCls =
  "h-11 rounded-lg border-stone-200 bg-white text-[15px] text-stone-900 placeholder:text-stone-400 shadow-sm transition-colors hover:border-stone-300 focus-visible:border-orange-500 focus-visible:ring-4 focus-visible:ring-orange-500/15";
const labelCls = "text-[13px] font-medium text-stone-800";
const msgCls = "text-xs font-medium text-red-600";

const container = {
  hidden: { opacity: 0 },
  visible: { opacity: 1, transition: { staggerChildren: 0.05, delayChildren: 0.05 } },
};
const item = {
  hidden: { y: 8, opacity: 0 },
  visible: { y: 0, opacity: 1, transition: { type: "spring" as const, stiffness: 320, damping: 26 } },
};

const benefits = [
  { icon: ShoppingBag, title: "Manage orders", text: "Track every order from request to delivery." },
  { icon: LayoutTemplate, title: "Create templates", text: "Build and publish invitation designs for customers." },
  { icon: Users, title: "Manage users", text: "Control accounts, roles and permissions." },
];

function BrandPanel() {
  return (
    <aside className="relative hidden overflow-hidden border-r border-orange-100 bg-gradient-to-br from-orange-50 via-[#fff8f1] to-white lg:flex lg:h-full lg:w-[46%] lg:shrink-0 lg:flex-col lg:justify-between lg:p-12 xl:p-16">
      <div
        aria-hidden
        className="absolute inset-0"
        style={{
          backgroundImage: "radial-gradient(rgba(234,88,12,0.38) 1.4px, transparent 1.7px)",
          backgroundSize: "26px 26px",
          maskImage: "linear-gradient(135deg, #000 0%, rgba(0,0,0,0.15) 70%, transparent 100%)",
          WebkitMaskImage: "linear-gradient(135deg, #000 0%, rgba(0,0,0,0.15) 70%, transparent 100%)",
        }}
      />
      <div aria-hidden className="absolute -bottom-32 -right-24 h-96 w-96 rounded-full bg-orange-300/30 blur-[100px]" />

      <div className="relative flex items-center gap-2.5">
        <span className="relative h-9 w-9 overflow-hidden rounded-lg bg-orange-500 shadow-sm ring-1 ring-orange-600/20">
          <Image src="/logo.png" alt="" fill sizes="36px" className="object-cover" priority />
        </span>
        <span className={`${display} text-lg font-semibold tracking-tight text-stone-900`}>Riwainvite</span>
      </div>

      <div className="relative max-w-md">
        <h2 className={`${display} text-4xl font-semibold leading-[1.1] tracking-tight text-stone-900 xl:text-[44px]`}>
          Pick up right where you left off.
        </h2>
        <p className="mt-4 text-base leading-relaxed text-stone-600">
          Sign in to manage your orders, templates and team from one admin panel.
        </p>

        <ul className="mt-9 space-y-5">
          {benefits.map(({ icon: Icon, title, text }) => (
            <li key={title} className="flex gap-3.5">
              <span className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-white text-orange-600 shadow-sm ring-1 ring-orange-100">
                <Icon className="h-[18px] w-[18px]" />
              </span>
              <div>
                <p className="text-sm font-semibold text-stone-900">{title}</p>
                <p className="text-sm text-stone-600">{text}</p>
              </div>
            </li>
          ))}
        </ul>
      </div>

      <div className="relative flex max-w-md items-center gap-3 rounded-2xl border border-orange-100 bg-white/80 p-4 shadow-[0_20px_50px_-20px_rgba(234,88,12,0.3)] backdrop-blur">
        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-orange-50 text-orange-600 ring-1 ring-orange-100">
          <ShieldCheck className="h-[18px] w-[18px]" />
        </span>
        <p className="text-sm text-stone-600">
          Admin access is protected. Sessions expire after 24 hours and repeated failed attempts are temporarily blocked.
        </p>
      </div>
    </aside>
  );
}

export function LoginForm() {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [shake, setShake] = useState(false);

  const form = useForm<Values>({
    resolver: zodResolver(formSchema),
    mode: "onTouched",
    defaultValues: { email: "", password: "" },
  });

  async function onSubmit(values: Values) {
    setIsLoading(true);
    setFormError(null);
    try {
      await apiClient.post("/admin/auth/login", values);
      toast.add({ title: "Signed in", description: "Taking you to your dashboard…", type: "success" });
      router.push(REDIRECT_TO);
      router.refresh();
    } catch (error: any) {
      const message =
        error.response?.data?.message || "We couldn’t sign you in. Check your connection and try again.";
      setFormError(message);
      setShake(true);
      setTimeout(() => setShake(false), 500);
      toast.add({ title: "Couldn’t sign in", description: message, type: "error" });
      form.resetField("password");
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <div className="fixed inset-0 z-10 flex overflow-hidden bg-white">
      <BrandPanel />

      <ReactLenis className="relative h-full min-w-0 flex-1 overflow-y-auto" options={{ lerp: 0.09, smoothWheel: true }}>
        <div className="relative flex min-h-dvh items-center justify-center px-6 py-12 sm:px-12 lg:px-16 lg:py-16">
          <div aria-hidden className="absolute inset-x-0 top-0 h-56 bg-gradient-to-b from-orange-50 to-transparent lg:hidden" />

          <motion.div
            className="relative w-full max-w-[420px]"
            animate={shake ? { x: [-8, 8, -8, 8, 0] } : {}}
            transition={{ duration: 0.4 }}
          >
            {/* mobile logo */}
            <div className="mb-8 flex items-center gap-2.5 lg:hidden">
              <span className="relative h-9 w-9 overflow-hidden rounded-lg bg-orange-500 ring-1 ring-orange-600/20">
                <Image src="/logo.png" alt="" fill sizes="36px" className="object-cover" priority />
              </span>
              <span className={`${display} text-lg font-semibold tracking-tight text-stone-900`}>Riwainvite</span>
            </div>

            <h1 className={`${display} text-[30px] font-semibold leading-tight tracking-tight text-stone-900`}>
              Welcome back
            </h1>
            <p className="mt-2 text-sm text-stone-600">Sign in to your admin account to continue.</p>

            {formError && (
              <motion.div
                role="alert"
                initial={{ opacity: 0, y: -6 }}
                animate={{ opacity: 1, y: 0 }}
                className="mt-6 flex items-start gap-2.5 rounded-lg border border-red-200 bg-red-50 px-3.5 py-3 text-sm text-red-700"
              >
                <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
                <span>{formError}</span>
              </motion.div>
            )}

            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} noValidate className="mt-8">
                <motion.div variants={container} initial="hidden" animate="visible" className="space-y-5">
                  <FormField
                    control={form.control}
                    name="email"
                    render={({ field }) => (
                      <motion.div variants={item}>
                        <FormItem className="space-y-1.5">
                          <FormLabel className={labelCls}>Email</FormLabel>
                          <FormControl>
                            <div className="group relative">
                              <Mail className="pointer-events-none absolute left-3.5 top-3.5 h-4 w-4 text-stone-400 transition-colors group-focus-within:text-orange-500" />
                              <Input
                                type="email"
                                placeholder="you@company.com"
                                autoComplete="username"
                                autoFocus
                                className={`${inputCls} pl-10`}
                                {...field}
                              />
                            </div>
                          </FormControl>
                          <FormMessage className={msgCls} />
                        </FormItem>
                      </motion.div>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="password"
                    render={({ field }) => (
                      <motion.div variants={item}>
                        <FormItem className="space-y-1.5">
                          <FormLabel className={labelCls}>Password</FormLabel>
                          <FormControl>
                            <div className="group relative">
                              <Lock className="pointer-events-none absolute left-3.5 top-3.5 h-4 w-4 text-stone-400 transition-colors group-focus-within:text-orange-500" />
                              <Input
                                type={showPassword ? "text" : "password"}
                                placeholder="Enter your password"
                                autoComplete="current-password"
                                className={`${inputCls} px-10`}
                                {...field}
                              />
                              <button
                                type="button"
                                onClick={() => setShowPassword((v) => !v)}
                                aria-label={showPassword ? "Hide password" : "Show password"}
                                className="absolute right-2 top-2 flex h-7 w-7 items-center justify-center rounded-md text-stone-400 transition-colors hover:bg-orange-50 hover:text-orange-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-500/40"
                              >
                                {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                              </button>
                            </div>
                          </FormControl>
                          <FormMessage className={msgCls} />
                        </FormItem>
                      </motion.div>
                    )}
                  />

                  <motion.div variants={item} className="pt-2">
                    <Button
                      type="submit"
                      disabled={isLoading}
                      className="group flex h-12 w-full items-center justify-center gap-2 rounded-lg border-0 bg-orange-500 text-[15px] font-semibold text-white shadow-[0_1px_0_rgba(255,255,255,0.25)_inset,0_8px_20px_-6px_rgba(234,88,12,0.5)] transition-all hover:bg-orange-600 active:scale-[0.99] disabled:opacity-70"
                    >
                      {isLoading ? (
                        <>
                          <Loader2 className="h-5 w-5 animate-spin" /> Signing in…
                        </>
                      ) : (
                        <>
                          Sign in
                          <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
                        </>
                      )}
                    </Button>
                  </motion.div>
                </motion.div>
              </form>
            </Form>

            <div className="mt-8 flex items-center justify-center gap-1.5 border-t border-stone-100 pt-5 text-xs text-stone-500">
              <Lock className="h-3.5 w-3.5 text-stone-400" />
              Secure admin area. Authorized users only.
            </div>
          </motion.div>
        </div>
      </ReactLenis>
    </div>
  );
}