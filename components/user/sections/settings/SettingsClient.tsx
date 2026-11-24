"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import {
  AnimatePresence,
  MotionConfig,
  motion,
  useReducedMotion,
} from "framer-motion";
import { Loader2 } from "lucide-react";
import { AxiosError } from "axios";
import { apiClient } from "@/lib/api/api_base";
import { toast } from "@/components/ui/toast";
import { FOCUS } from "@/components/user/navigation/UserSidebar";
import {
  EASE,
  HEADING,
  cn,
} from "@/components/user/sections/dashboard/ui/DashboardUI";
import {
  AvatarRing,
  Chip,
  CompletenessRing,
  CountUp,
  Field,
  IcCalendar,
  IcCheck,
  IcClock,
  IcCopy,
  IcFingerprint,
  IcKey,
  IcLock,
  IcMail,
  IcPhone,
  IcShield,
  IcUndo,
  IcUser,
  Magnetic,
  Panel,
  Reveal,
  Section,
  StatCard,
  StrengthMeter,
  SuccessBurst,
  ValueSkeleton,
  WavingHand,
} from "./ui/SettingsUI";

const formSchema = z
  .object({
    firstName: z.string().min(2, "First name must be at least 2 characters."),
    lastName: z.string().min(2, "Last name must be at least 2 characters."),
    email: z.string().email("Please enter a valid email address."),
    phoneNumber: z
      .string()
      .transform((v) => v.replace(/[\s\-().]/g, ""))
      .pipe(
        z
          .string()
          .regex(
            /^\+?[1-9]\d{1,14}$/,
            "Please enter a valid phone number (e.g., +923001234567).",
          )
          .or(z.literal("")),
      ),
    currentPassword: z
      .string()
      .min(1, "You must enter your current password to save changes."),
    newPassword: z
      .string()
      .optional()
      .refine((val) => !val || val.length >= 8, {
        message: "New password must be at least 8 characters.",
      }),
    confirmPassword: z.string().optional(),
  })
  .refine(
    (data) => !data.newPassword || data.newPassword === data.confirmPassword,
    {
      message: "Passwords do not match.",
      path: ["confirmPassword"],
    },
  );

type FormValues = z.infer<typeof formSchema>;

interface Props {
  user: {
    id: string;
    email: string;
    first_name: string;
    last_name: string;
    phone_number: string;
    created_at?: string | Date;
  };
}

// Adjust to wherever your user GET/PATCH route is mounted.
const SETTINGS_ENDPOINT = "/user/dashboard/account_settings";

// Same banner the billing header uses.
const BANNER = "/home_hero_bg.png";

function toDate(value?: string | Date | null) {
  if (!value) return null;
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? null : d;
}

function formatDate(d: Date | null) {
  if (!d) return "—";
  return d.toLocaleDateString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

export function SettingsClient({ user }: Props) {
  const router = useRouter();
  const reduce = useReducedMotion();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showCurrent, setShowCurrent] = useState(false);
  const [showNew, setShowNew] = useState(false);
  const [copied, setCopied] = useState(false);
  const [burst, setBurst] = useState(false);

  const [createdAt, setCreatedAt] = useState<string | Date | null>(
    user.created_at ?? null,
  );
  const [metaLoading, setMetaLoading] = useState(!user.created_at);

  const memberSince = toDate(createdAt);
  const daysWithUs = memberSince
    ? Math.max(0, Math.floor((Date.now() - memberSince.getTime()) / 86_400_000))
    : null;

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      firstName: user.first_name,
      lastName: user.last_name,
      email: user.email,
      phoneNumber: user.phone_number,
      currentPassword: "",
      newPassword: "",
      confirmPassword: "",
    },
  });

  // Pull the full record from the API on mount
  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const res = await apiClient.get(SETTINGS_ENDPOINT);
        const u = res.data?.user;
        if (!alive || !u) return;

        setCreatedAt(u.created_at ?? u.createdAt ?? null);

        if (!form.formState.isDirty) {
          form.reset({
            firstName: u.first_name ?? u.firstName ?? user.first_name,
            lastName: u.last_name ?? u.lastName ?? user.last_name,
            email: u.email ?? user.email,
            phoneNumber: u.phone_number ?? u.phoneNumber ?? user.phone_number,
            currentPassword: "",
            newPassword: "",
            confirmPassword: "",
          });
        }
      } catch {
        /* keep the props we already have */
      } finally {
        if (alive) setMetaLoading(false);
      }
    })();
    return () => {
      alive = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const { errors, isDirty, dirtyFields } = form.formState;
  const [first, last, newPw, confirmPw, emailVal, phoneVal] = form.watch([
    "firstName",
    "lastName",
    "newPassword",
    "confirmPassword",
    "email",
    "phoneNumber",
  ]);

  const initials = `${first?.[0] ?? ""}${last?.[0] ?? ""}`.toUpperCase() || "U";
  const completeness = Math.round(
    ([first, last, emailVal, phoneVal].filter((v) => v && v.trim()).length /
      4) *
      100,
  );
  const changedCount = Object.keys(dirtyFields).filter(
    (k) => !["currentPassword", "confirmPassword"].includes(k),
  ).length;

  useEffect(() => {
    if (!burst) return;
    const t = setTimeout(() => setBurst(false), 1800);
    return () => clearTimeout(t);
  }, [burst]);

  const copyId = async () => {
    try {
      await navigator.clipboard.writeText(user.id);
      setCopied(true);
      setTimeout(() => setCopied(false), 1600);
    } catch {
      /* clipboard blocked: ignore */
    }
  };

  async function onSubmit(values: FormValues) {
    setIsSubmitting(true);
    try {
      await apiClient.patch(SETTINGS_ENDPOINT, {
        currentPassword: values.currentPassword,
        firstName: values.firstName,
        lastName: values.lastName,
        email: values.email,
        phoneNumber: values.phoneNumber,
        ...(values.newPassword ? { newPassword: values.newPassword } : {}),
      });

      toast.add({
        title: "Saved",
        description: "Your settings have been updated.",
        type: "success",
      });
      form.reset({
        ...values,
        currentPassword: "",
        newPassword: "",
        confirmPassword: "",
      });
      setBurst(true);
      router.refresh();
    } catch (error) {
      const err = error as AxiosError<{ error: string }>;
      toast.add({
        title: "Couldn't save changes",
        description:
          err.response?.data?.error ||
          "Failed to update settings. Please try again.",
        type: "error",
      });
    } finally {
      setIsSubmitting(false);
    }
  }

  const onInvalid = (errs: typeof errors) => {
    const key = Object.keys(errs)[0] as keyof FormValues | undefined;
    if (key) form.setFocus(key);
  };

  return (
    <MotionConfig reducedMotion="user">
      <SuccessBurst show={burst} />

      <form
        onSubmit={form.handleSubmit(onSubmit, onInvalid)}
        className={cn(
          "mx-auto w-full max-w-5xl space-y-8 transition-[padding] duration-300 sm:space-y-10",
          isDirty ? "pb-28" : "pb-4",
        )}
        noValidate
      >
        {/* ------------------------------ Hero (billing header style) ------------------------------ */}
        <motion.header
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, ease: EASE }}
          className="relative rounded-2xl ring-1 ring-black/[0.06] shadow-[0_1px_2px_rgba(28,20,16,0.04),0_12px_28px_-18px_rgba(28,20,16,0.22)] sm:rounded-3xl"
        >
          <div
            aria-hidden
            className="absolute inset-0 overflow-hidden rounded-[inherit]"
          >
            <motion.div
              className="absolute inset-0"
              style={{
                backgroundImage: `url(${BANNER})`,
                backgroundSize: "cover",
                backgroundPosition: "70% center",
              }}
              animate={reduce ? undefined : { scale: [1, 1.05, 1] }}
              transition={{ duration: 22, repeat: Infinity, ease: "easeInOut" }}
            />
            <div className="absolute inset-0 bg-gradient-to-b from-[#fff8f2]/95 via-[#fff8f2]/70 to-[#fff8f2]/30 sm:bg-gradient-to-r sm:from-[#fff8f2]/95 sm:via-[#fff8f2]/65 sm:to-[#fff8f2]/10" />
          </div>

          <div className="relative z-10 flex flex-col gap-5 p-4 sm:flex-row sm:items-center sm:justify-between sm:gap-6 sm:p-7">
            <div className="flex min-w-0 items-center gap-4 sm:gap-5">
              <AvatarRing>
                <AnimatePresence mode="popLayout" initial={false}>
                  <motion.span
                    key={initials}
                    initial={{ scale: 0.4, opacity: 0, rotate: -25 }}
                    animate={{ scale: 1, opacity: 1, rotate: 0 }}
                    exit={{ scale: 0.4, opacity: 0, rotate: 25 }}
                    transition={{ type: "spring", stiffness: 420, damping: 22 }}
                  >
                    {initials}
                  </motion.span>
                </AnimatePresence>
              </AvatarRing>

              <div className="min-w-0">
                <motion.p
                  initial={{ opacity: 0, x: -12 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ duration: 0.6, delay: 0.2, ease: EASE }}
                  className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.12em] text-stone-600"
                >
                  Welcome back
                  <WavingHand />
                </motion.p>

                <motion.h1
                  initial={{ opacity: 0, y: 12 }}
                  animate={{
                    opacity: 1,
                    y: 0,
                    backgroundPositionX: reduce ? "0%" : ["0%", "200%"],
                  }}
                  transition={{
                    opacity: { duration: 0.6, delay: 0.3 },
                    y: { duration: 0.6, delay: 0.3, ease: EASE },
                    backgroundPositionX: {
                      duration: 8,
                      repeat: Infinity,
                      ease: "linear",
                    },
                  }}
                  style={{
                    backgroundImage:
                      "linear-gradient(90deg, #1c1410 0%, #78716c 50%, #1c1410 100%)",
                    backgroundSize: "200% 100%",
                  }}
                  className={cn(
                    HEADING,
                    "mt-0.5 truncate bg-clip-text text-[26px] leading-8 tracking-[-0.025em] text-transparent sm:text-4xl sm:leading-10",
                  )}
                >
                  {first || last ? `${first} ${last}` : "Your account"}
                </motion.h1>

                <motion.p
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 0.45 }}
                  className="mt-0.5 truncate text-[13px] font-medium text-stone-600 sm:text-sm"
                >
                  {emailVal}
                </motion.p>

                {daysWithUs !== null && (
                  <motion.span
                    initial={{ opacity: 0, scale: 0.85 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{
                      delay: 0.6,
                      type: "spring",
                      stiffness: 300,
                      damping: 18,
                    }}
                    className="mt-2 inline-flex"
                  >
                    <Chip icon={IcClock}>
                      <CountUp value={daysWithUs} /> days with us
                    </Chip>
                  </motion.span>
                )}
              </div>
            </div>

            <CompletenessRing percent={completeness} />
          </div>
        </motion.header>

        {/* ------------------------------ Stat cards ------------------------------ */}
        <dl className="grid grid-cols-1 gap-3 sm:grid-cols-3 sm:gap-4">
          <StatCard label="Member since" icon={IcCalendar} delay={0.05}>
            {metaLoading && !memberSince ? (
              <ValueSkeleton className="w-28" />
            ) : (
              formatDate(memberSince)
            )}
          </StatCard>
          <StatCard
            label="Phone"
            icon={IcPhone}
            value={phoneVal?.trim() ? phoneVal : "Not set"}
            delay={0.12}
          />
          <StatCard label="User ID" icon={IcFingerprint} delay={0.19}>
            <span className="flex items-center gap-2">
              <span className="truncate font-mono text-sm font-medium tracking-normal text-[#1c1410]">
                {user.id}
              </span>
              <motion.button
                type="button"
                onClick={copyId}
                whileTap={{ scale: 0.8 }}
                whileHover={{ scale: 1.1 }}
                aria-label={copied ? "User ID copied" : "Copy user ID"}
                className={cn(
                  "relative z-20 inline-flex size-7 shrink-0 items-center justify-center rounded-md text-stone-500 transition-colors hover:bg-black/5 hover:text-[#1c1410]",
                  FOCUS,
                )}
              >
                <AnimatePresence mode="wait" initial={false}>
                  <motion.span
                    key={copied ? "ok" : "copy"}
                    initial={{ scale: 0, rotate: -90 }}
                    animate={{ scale: 1, rotate: 0 }}
                    exit={{ scale: 0, rotate: 90 }}
                    transition={{ duration: 0.15 }}
                    className="grid place-items-center"
                  >
                    {copied ? (
                      <IcCheck className="size-3.5 text-emerald-600" />
                    ) : (
                      <IcCopy className="size-3.5" />
                    )}
                  </motion.span>
                </AnimatePresence>
              </motion.button>
            </span>
          </StatCard>
        </dl>

        {/* ------------------------------ Profile ------------------------------ */}
        <Section
          title="Profile"
          icon={IcUser}
          description="Your name and contact details, used on invitations, receipts and messages we send you."
          delay={0.05}
        >
          <div className="grid gap-5 sm:grid-cols-2">
            <Field
              label="First name"
              icon={IcUser}
              autoComplete="given-name"
              delay={0}
              error={errors.firstName?.message}
              {...form.register("firstName")}
            />
            <Field
              label="Last name"
              icon={IcUser}
              autoComplete="family-name"
              delay={0.07}
              error={errors.lastName?.message}
              {...form.register("lastName")}
            />
            <Field
              label="Email address"
              icon={IcMail}
              type="email"
              autoComplete="email"
              delay={0.14}
              error={errors.email?.message}
              {...form.register("email")}
            />
            <Field
              label="Phone number"
              icon={IcPhone}
              type="tel"
              autoComplete="tel"
              placeholder="+923001234567"
              delay={0.21}
              error={errors.phoneNumber?.message}
              {...form.register("phoneNumber")}
            />
          </div>
        </Section>

        {/* ------------------------------ Security ------------------------------ */}
        <Section
          title="Security"
          icon={IcShield}
          description="Confirm it's you to save any change. Add a new password only if you want to replace the current one."
          delay={0.05}
        >
          <div className="space-y-5">
            <Field
              label="Current password"
              required
              icon={IcLock}
              type={showCurrent ? "text" : "password"}
              autoComplete="current-password"
              placeholder="Required to save changes"
              error={errors.currentPassword?.message}
              trailing={
                <Reveal
                  shown={showCurrent}
                  onToggle={() => setShowCurrent((s) => !s)}
                />
              }
              {...form.register("currentPassword")}
            />

            <motion.div
              aria-hidden
              initial={{ scaleX: 0 }}
              whileInView={{ scaleX: 1 }}
              viewport={{ once: true }}
              transition={{ duration: 0.8, ease: EASE }}
              className="h-px origin-left border-t border-dashed border-[#1c1410]/20"
            />

            <div className="grid gap-5 sm:grid-cols-2">
              <div>
                <Field
                  label="New password"
                  icon={IcKey}
                  type={showNew ? "text" : "password"}
                  autoComplete="new-password"
                  placeholder="Leave blank to keep current"
                  delay={0.08}
                  error={errors.newPassword?.message}
                  trailing={
                    <Reveal
                      shown={showNew}
                      onToggle={() => setShowNew((s) => !s)}
                    />
                  }
                  {...form.register("newPassword")}
                />
                <StrengthMeter value={newPw ?? ""} />
              </div>

              <div>
                <Field
                  label="Confirm new password"
                  icon={IcKey}
                  type="password"
                  autoComplete="new-password"
                  placeholder="Repeat the new password"
                  delay={0.16}
                  error={errors.confirmPassword?.message}
                  {...form.register("confirmPassword")}
                />
                <AnimatePresence initial={false}>
                  {newPw &&
                    confirmPw &&
                    newPw === confirmPw &&
                    !errors.confirmPassword && (
                      <motion.p
                        initial={{ opacity: 0, y: -6, scale: 0.9 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, y: -6 }}
                        transition={{
                          type: "spring",
                          stiffness: 380,
                          damping: 22,
                        }}
                        className="mt-2 flex items-center gap-1 text-xs font-semibold text-emerald-600"
                      >
                        <motion.span
                          initial={{ scale: 0, rotate: -90 }}
                          animate={{ scale: 1, rotate: 0 }}
                          transition={{
                            type: "spring",
                            stiffness: 500,
                            damping: 18,
                            delay: 0.05,
                          }}
                        >
                          <IcCheck className="size-3.5" />
                        </motion.span>
                        Passwords match
                      </motion.p>
                    )}
                </AnimatePresence>
              </div>
            </div>
          </div>
        </Section>

        {/* ------------------------------ Floating save bar ------------------------------ */}
        <div className="pointer-events-none fixed inset-x-0 bottom-6 z-40 flex justify-center px-4">
          <AnimatePresence>
            {isDirty && (
              <motion.div
                initial={{ y: 60, opacity: 0, scale: 0.9 }}
                animate={{ y: 0, opacity: 1, scale: 1 }}
                exit={{ y: 60, opacity: 0, scale: 0.9 }}
                transition={{ type: "spring", stiffness: 380, damping: 26 }}
                className="pointer-events-auto relative flex items-center gap-4 overflow-hidden rounded-2xl bg-[#1c1410] py-2.5 pl-5 pr-2.5 text-white shadow-[0_24px_60px_-12px_rgba(28,20,16,0.55)] ring-1 ring-white/10"
                role="region"
                aria-label="Unsaved changes"
              >
                {!reduce && (
                  <motion.span
                    aria-hidden
                    className="pointer-events-none absolute inset-y-0 left-0 w-1/3 -skew-x-12 bg-gradient-to-r from-transparent via-white/10 to-transparent"
                    initial={{ x: "-150%" }}
                    animate={{ x: "450%" }}
                    transition={{
                      duration: 2.4,
                      repeat: Infinity,
                      repeatDelay: 1.8,
                      ease: "easeInOut",
                    }}
                  />
                )}

                <p className="relative flex items-center gap-2 text-sm">
                  <span className="relative flex size-2">
                    <span className="absolute inline-flex size-full animate-ping rounded-full bg-orange-400 opacity-60 motion-reduce:animate-none" />
                    <span className="relative inline-flex size-2 rounded-full bg-orange-400" />
                  </span>
                  <span className="flex items-center gap-1">
                    <AnimatePresence mode="popLayout" initial={false}>
                      <motion.span
                        key={changedCount}
                        initial={{ y: 10, opacity: 0 }}
                        animate={{ y: 0, opacity: 1 }}
                        exit={{ y: -10, opacity: 0 }}
                        transition={{ duration: 0.18 }}
                        className={cn(
                          HEADING,
                          "inline-block min-w-[1ch] tabular-nums text-white",
                        )}
                      >
                        {changedCount || 1}
                      </motion.span>
                    </AnimatePresence>
                    unsaved {changedCount > 1 ? "changes" : "change"}
                  </span>
                </p>

                <div className="relative flex items-center gap-1.5">
                  <motion.button
                    type="button"
                    onClick={() => form.reset()}
                    disabled={isSubmitting}
                    whileHover={{ x: -1 }}
                    whileTap={{ scale: 0.94 }}
                    className="group flex items-center gap-1.5 rounded-xl px-3 py-2 text-sm font-medium text-white/70 transition-colors hover:bg-white/10 hover:text-white disabled:opacity-50"
                  >
                    <IcUndo className="size-4 transition-transform duration-500 group-hover:-rotate-[360deg]" />
                    Discard
                  </motion.button>

                  <Magnetic>
                    <motion.button
                      type="submit"
                      disabled={isSubmitting}
                      whileHover={{ scale: 1.04 }}
                      whileTap={{ scale: 0.95 }}
                      className="flex items-center gap-2 rounded-xl bg-orange-500 px-4 py-2 text-sm font-semibold text-white shadow-lg shadow-orange-500/30 transition-colors hover:bg-orange-400 disabled:opacity-60"
                    >
                      <AnimatePresence mode="wait" initial={false}>
                        <motion.span
                          key={isSubmitting ? "load" : "check"}
                          initial={{ scale: 0, rotate: -90 }}
                          animate={{ scale: 1, rotate: 0 }}
                          exit={{ scale: 0, rotate: 90 }}
                          transition={{ duration: 0.15 }}
                          className="grid place-items-center"
                        >
                          {isSubmitting ? (
                            <Loader2 className="size-4 animate-spin" />
                          ) : (
                            <IcCheck className="size-4" />
                          )}
                        </motion.span>
                      </AnimatePresence>
                      {isSubmitting ? "Saving" : "Save changes"}
                    </motion.button>
                  </Magnetic>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </form>
    </MotionConfig>
  );
}
