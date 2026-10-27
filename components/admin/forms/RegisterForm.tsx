"use client";

import { useState, useEffect } from "react";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useForm, type Path } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { motion, AnimatePresence } from "framer-motion";
import { ReactLenis } from "lenis/react";

import {
  Loader2,
  User,
  Mail,
  Phone,
  AtSign,
  ShieldAlert,
  ArrowRight,
  ShoppingBag,
  LayoutTemplate,
  Users,
  Lock,
  CheckCircle2,
} from "lucide-react";

import { apiClient } from "@/lib/api/api_base";
import { toast } from "@/components/ui/toast";
import { PasswordStrengthInput } from "@/components/spectrumui/password-strength";

import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
  FormDescription,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

const formSchema = z.object({
  account_name: z
    .string()
    .min(3, "At least 3 characters")
    .max(30)
    .regex(/^[a-zA-Z0-9_]+$/, "Letters, numbers and underscores only"),
  first_name: z.string().min(2, "At least 2 characters").max(50),
  last_name: z.string().min(2, "At least 2 characters").max(50),
  email: z.string().email("Enter a valid email address"),
  phone_number: z
    .string()
    .regex(
      /^\+?[1-9]\d{1,14}$/,
      "Use international format, e.g. +923001234567",
    ),
  password: z
    .string()
    .min(8, "At least 8 characters")
    .regex(/[A-Z]/, "Add an uppercase letter")
    .regex(/[a-z]/, "Add a lowercase letter")
    .regex(/[0-9]/, "Add a number"),
});
type Values = z.infer<typeof formSchema>;

const display = "font-[family-name:var(--font-display)]";

const inputCls =
  "h-11 rounded-lg border-stone-200 bg-white text-[15px] text-stone-900 placeholder:text-stone-400 shadow-sm transition-colors hover:border-stone-300 focus-visible:border-orange-500 focus-visible:ring-4 focus-visible:ring-orange-500/15";
const labelCls = "text-[13px] font-medium text-stone-800";
const msgCls = "text-xs font-medium text-red-600";

const container = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { staggerChildren: 0.04, delayChildren: 0.05 },
  },
};
const item = {
  hidden: { y: 8, opacity: 0 },
  visible: {
    y: 0,
    opacity: 1,
    transition: { type: "spring" as const, stiffness: 320, damping: 26 },
  },
};

function TextField({
  form,
  name,
  label,
  placeholder,
  icon: Icon,
  type = "text",
  autoComplete,
  hint,
  span,
}: {
  form: ReturnType<typeof useForm<Values>>;
  name: Path<Values>;
  label: string;
  placeholder: string;
  icon?: React.ComponentType<{ className?: string }>;
  type?: string;
  autoComplete?: string;
  hint?: string;
  span?: boolean;
}) {
  return (
    <FormField
      control={form.control}
      name={name}
      render={({ field }) => (
        <motion.div variants={item} className={span ? "sm:col-span-2" : ""}>
          <FormItem className="space-y-1.5">
            <FormLabel className={labelCls}>{label}</FormLabel>
            <FormControl>
              <div className="group relative">
                {Icon && (
                  <Icon className="pointer-events-none absolute left-3.5 top-3.5 h-4 w-4 text-stone-400 transition-colors group-focus-within:text-orange-500" />
                )}
                <Input
                  type={type}
                  placeholder={placeholder}
                  autoComplete={autoComplete}
                  className={`${inputCls} ${Icon ? "pl-10" : ""}`}
                  {...field}
                />
              </div>
            </FormControl>
            {hint && !form.formState.errors[name] && (
              <FormDescription className="text-xs text-stone-500">
                {hint}
              </FormDescription>
            )}
            <FormMessage className={msgCls} />
          </FormItem>
        </motion.div>
      )}
    />
  );
}

const benefits = [
  {
    icon: ShoppingBag,
    title: "Manage orders",
    text: "Track every order from request to delivery.",
  },
  {
    icon: LayoutTemplate,
    title: "Create templates",
    text: "Build and publish invitation designs for customers.",
  },
  {
    icon: Users,
    title: "Manage users",
    text: "Control accounts, roles and permissions.",
  },
];

const areas = ["Orders", "Templates", "Users", "Analytics", "Settings"];

function BrandPanel() {
  return (
    <aside className="relative hidden overflow-hidden border-r border-orange-100 bg-gradient-to-br from-orange-50 via-[#fff8f1] to-white lg:flex lg:h-full lg:w-[46%] lg:shrink-0 lg:flex-col lg:justify-between lg:p-12 xl:p-16">
      {/* subtle, visible dot grid */}
      <div
        aria-hidden
        className="absolute inset-0"
        style={{
          backgroundImage:
            "radial-gradient(rgba(234,88,12,0.38) 1.4px, transparent 1.7px)",
          backgroundSize: "26px 26px",
          maskImage:
            "linear-gradient(135deg, #000 0%, rgba(0,0,0,0.15) 70%, transparent 100%)",
          WebkitMaskImage:
            "linear-gradient(135deg, #000 0%, rgba(0,0,0,0.15) 70%, transparent 100%)",
        }}
      />
      <div
        aria-hidden
        className="absolute -bottom-32 -right-24 h-96 w-96 rounded-full bg-orange-300/30 blur-[100px]"
      />

      <div className="relative flex items-center gap-2.5">
        <span className="relative h-9 w-9 overflow-hidden rounded-lg bg-orange-500 shadow-sm ring-1 ring-orange-600/20">
          <Image
            src="/logo.png"
            alt=""
            fill
            sizes="36px"
            className="object-cover"
            priority
          />
        </span>
        <span
          className={`${display} text-lg font-semibold tracking-tight text-stone-900`}
        >
          Riwainvite
        </span>
      </div>

      <div className="relative max-w-md">
        <h2
          className={`${display} text-4xl font-semibold leading-[1.1] tracking-tight text-stone-900 xl:text-[44px]`}
        >
          Run your invitation business from one place.
        </h2>
        <p className="mt-4 text-base leading-relaxed text-stone-600">
          Create the root account to start managing your platform, your team and
          your customers.
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

      {/* admin areas */}
      <div className="relative max-w-md rounded-2xl border border-orange-100 bg-white/80 p-5 shadow-[0_20px_50px_-20px_rgba(234,88,12,0.3)] backdrop-blur">
        <p className="text-sm font-semibold text-stone-900">
          Everything in one admin panel
        </p>
        <div className="mt-3 flex flex-wrap gap-2">
          {areas.map((a) => (
            <span
              key={a}
              className="rounded-full bg-orange-50 px-3 py-1 text-xs font-medium text-orange-700 ring-1 ring-orange-100"
            >
              {a}
            </span>
          ))}
        </div>
      </div>
    </aside>
  );
}

export function RegisterForm({
  isRegistrationOpen,
}: {
  isRegistrationOpen: boolean;
}) {
  const router = useRouter();
  useEffect(() => {
    if (isRegistrationOpen) return;

    const timeout = setTimeout(() => {
      router.replace("/admin/login");
    }, 5000);

    return () => clearTimeout(timeout);
  }, [isRegistrationOpen, router]);
  const [isLoading, setIsLoading] = useState(false);
  const [shake, setShake] = useState(false);

  const form = useForm<Values>({
    resolver: zodResolver(formSchema),
    mode: "onTouched",
    defaultValues: {
      account_name: "",
      first_name: "",
      last_name: "",
      email: "",
      phone_number: "",
      password: "",
    },
  });

  async function onSubmit(values: Values) {
    setIsLoading(true);
    try {
      await apiClient.post("/admin/auth/register", values);
      toast.add({
        title: "Account created",
        description: "Redirecting you to sign in…",
        type: "success",
      });
      router.push("/admin/login");
    } catch (error: any) {
      setShake(true);
      setTimeout(() => setShake(false), 500);
      toast.add({
        title: "Couldn’t create account",
        description:
          error.response?.data?.message ||
          "Something went wrong. Check your details and try again.",
        type: "error",
      });
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <div className="fixed inset-0 z-10 flex overflow-hidden bg-white">
      <BrandPanel />

      <ReactLenis
        className="relative h-full min-w-0 flex-1 overflow-y-auto"
        options={{ lerp: 0.09, smoothWheel: true }}
      >
        <div className="relative flex min-h-dvh items-center justify-center px-6 py-12 sm:px-12 lg:px-16 lg:py-16">
          {/* soft glow for small screens where the brand panel is hidden */}
          <div
            aria-hidden
            className="absolute inset-x-0 top-0 h-56 bg-gradient-to-b from-orange-50 to-transparent lg:hidden"
          />

          <div className="relative w-full max-w-[460px]">
            <AnimatePresence mode="wait">
              {!isRegistrationOpen ? (
                <motion.div
                  key="closed"
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0 }}
                  className="flex flex-col items-center rounded-2xl border border-orange-100 bg-orange-50/50 p-10 text-center"
                >
                  <span className="mb-4 flex h-14 w-14 items-center justify-center rounded-xl bg-white ring-1 ring-orange-100">
                    <ShieldAlert className="h-7 w-7 text-orange-500" />
                  </span>
                  <h2
                    className={`${display} text-2xl font-semibold tracking-tight text-stone-900`}
                  >
                    Registration is closed
                  </h2>
                  <p className="mt-2 text-sm text-stone-600">
                    This workspace already has the maximum number of
                    administrators. Ask an existing admin to invite you.
                  </p>
                  <Link
                    href="/admin/login"
                    className="mt-6 text-sm font-semibold text-orange-600 hover:text-orange-700"
                  >
                    Go to sign in
                  </Link>
                </motion.div>
              ) : (
                <motion.div
                  key="form"
                  animate={shake ? { x: [-8, 8, -8, 8, 0] } : {}}
                  transition={{ duration: 0.4 }}
                >
                  {/* mobile logo */}
                  <div className="mb-8 flex items-center gap-2.5 lg:hidden">
                    <span className="relative h-9 w-9 overflow-hidden rounded-lg bg-orange-500 ring-1 ring-orange-600/20">
                      <Image
                        src="/logo.png"
                        alt=""
                        fill
                        sizes="36px"
                        className="object-cover"
                        priority
                      />
                    </span>
                    <span
                      className={`${display} text-lg font-semibold tracking-tight text-stone-900`}
                    >
                      Riwainvite
                    </span>
                  </div>

                  <h1
                    className={`${display} text-[30px] font-semibold leading-tight tracking-tight text-stone-900`}
                  >
                    Create your admin account
                  </h1>
                  <p className="mt-2 text-sm text-stone-600">
                    This becomes the root account for your workspace. It takes
                    about a minute.
                  </p>

                  <Form {...form}>
                    <form
                      onSubmit={form.handleSubmit(onSubmit)}
                      noValidate
                      className="mt-8"
                    >
                      <motion.div
                        variants={container}
                        initial="hidden"
                        animate="visible"
                        className="grid grid-cols-1 gap-x-4 gap-y-5 sm:grid-cols-2"
                      >
                        <TextField
                          form={form}
                          name="first_name"
                          label="First name"
                          placeholder="John"
                          icon={User}
                          autoComplete="given-name"
                        />
                        <TextField
                          form={form}
                          name="last_name"
                          label="Last name"
                          placeholder="Doe"
                          autoComplete="family-name"
                        />
                        <TextField
                          form={form}
                          name="email"
                          label="Work email"
                          placeholder="you@company.com"
                          icon={Mail}
                          type="email"
                          autoComplete="email"
                          span
                        />
                        <TextField
                          form={form}
                          name="phone_number"
                          label="Phone number"
                          placeholder="+923001234567"
                          icon={Phone}
                          type="tel"
                          autoComplete="tel"
                          hint="Include your country code."
                          span
                        />
                        <TextField
                          form={form}
                          name="account_name"
                          label="Account name"
                          placeholder="your_workspace"
                          icon={AtSign}
                          autoComplete="username"
                          hint="Letters, numbers and underscores. You can’t change this later."
                          span
                        />

                        <FormField
                          control={form.control}
                          name="password"
                          render={({ field }) => (
                            <motion.div
                              variants={item}
                              className="sm:col-span-2"
                            >
                              <FormItem className="space-y-1.5">
                                <FormLabel className={labelCls}>
                                  Password
                                </FormLabel>
                                <FormControl>
                                  <PasswordStrengthInput
                                    value={field.value}
                                    onValueChange={field.onChange}
                                    onBlur={field.onBlur}
                                    name={field.name}
                                    placeholder="At least 8 characters"
                                    className="[&_input]:h-11 [&_input]:rounded-lg [&_input]:border-stone-200 [&_input]:bg-white [&_input]:text-[15px] [&_input]:shadow-sm [&_input]:placeholder:text-stone-400 [&_input]:focus-visible:border-orange-500 [&_input]:focus-visible:ring-4 [&_input]:focus-visible:ring-orange-500/15 [&_button]:text-stone-400 [&_button]:hover:bg-orange-50 [&_button]:hover:text-orange-600"
                                  />
                                </FormControl>
                                <FormMessage className={msgCls} />
                              </FormItem>
                            </motion.div>
                          )}
                        />
                      </motion.div>

                      <Button
                        type="submit"
                        disabled={isLoading}
                        className="group mt-7 flex h-12 w-full items-center justify-center gap-2 rounded-lg border-0 bg-orange-500 text-[15px] font-semibold text-white shadow-[0_1px_0_rgba(255,255,255,0.25)_inset,0_8px_20px_-6px_rgba(234,88,12,0.5)] transition-all hover:bg-orange-600 active:scale-[0.99] disabled:opacity-70"
                      >
                        {isLoading ? (
                          <>
                            <Loader2 className="h-5 w-5 animate-spin" />{" "}
                            Creating account…
                          </>
                        ) : (
                          <>
                            Create account
                            <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
                          </>
                        )}
                      </Button>

                      <p className="mt-5 text-center text-sm text-stone-600">
                        Already have an account?{" "}
                        <Link
                          href="/login"
                          className="font-semibold text-orange-600 hover:text-orange-700 hover:underline"
                        >
                          Sign in
                        </Link>
                      </p>
                    </form>
                  </Form>

                  <div className="mt-8 flex items-center justify-center gap-4 border-t border-stone-100 pt-5 text-xs text-stone-500">
                    <span className="flex items-center gap-1.5">
                      <Lock className="h-3.5 w-3.5 text-stone-400" /> Encrypted
                      in transit
                    </span>
                    <span className="flex items-center gap-1.5">
                      <CheckCircle2 className="h-3.5 w-3.5 text-stone-400" /> No
                      credit card needed
                    </span>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>
      </ReactLenis>
    </div>
  );
}
