"use client";

import { ComponentProps, ReactNode, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { AnimatePresence, MotionConfig, motion } from "framer-motion";
import {
  AlertCircle, Check, Eye, EyeOff, KeyRound, Loader2, Lock, LucideIcon, Mail, Phone, RotateCcw, User,
} from "lucide-react";
import { apiClient } from "@/lib/api/api_base";
import { AxiosError } from "axios";
import { toast } from "@/components/ui/toast";

const formSchema = z
  .object({
    firstName: z.string().min(2, "First name must be at least 2 characters."),
    lastName: z.string().min(2, "Last name must be at least 2 characters."),
    email: z.string().email("Please enter a valid email address."),
    phoneNumber: z.string().regex(/^\+?[1-9]\d{1,14}$/, "Please enter a valid phone number (e.g., +1234567890)."),
    currentPassword: z.string().min(1, "You must enter your current password to save changes."),
    newPassword: z
      .string()
      .optional()
      .refine((val) => !val || val.length >= 8, { message: "New password must be at least 8 characters." }),
    confirmPassword: z.string().optional(),
  })
  .refine((data) => !data.newPassword || data.newPassword === data.confirmPassword, {
    message: "Passwords do not match.",
    path: ["confirmPassword"],
  });

type FormValues = z.infer<typeof formSchema>;

interface AccountSettingsFormProps {
  initialData: {
    id: string;
    first_name: string;
    last_name: string;
    email: string;
    phone_number: string;
    account_name: string;
  };
}

const EASE = [0.16, 1, 0.3, 1] as const;

export function AccountSettingsForm({ initialData }: AccountSettingsFormProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showCurrent, setShowCurrent] = useState(false);
  const [showNew, setShowNew] = useState(false);

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      firstName: initialData.first_name,
      lastName: initialData.last_name,
      email: initialData.email,
      phoneNumber: initialData.phone_number,
      currentPassword: "",
      newPassword: "",
      confirmPassword: "",
    },
  });

  const { errors, isDirty } = form.formState;
  const [first, last, newPw, confirmPw] = form.watch(["firstName", "lastName", "newPassword", "confirmPassword"]);
  const initials = `${first?.[0] ?? ""}${last?.[0] ?? ""}`.toUpperCase() || "A";
  const strength = scorePassword(newPw ?? "");

  async function onSubmit(values: FormValues) {
    setIsSubmitting(true);
    try {
      await apiClient.patch("/admin/dashboard/account_settings", {
        currentPassword: values.currentPassword,
        firstName: values.firstName,
        lastName: values.lastName,
        email: values.email,
        phoneNumber: values.phoneNumber,
        ...(values.newPassword ? { newPassword: values.newPassword } : {}),
      });

      toast.add({ title: "Saved", description: "Your account settings have been updated.", type: "success" });
      form.reset({ ...values, currentPassword: "", newPassword: "", confirmPassword: "" });
    } catch (error) {
      const err = error as AxiosError<{ error: string }>;
      toast.add({
        title: "Couldn't save changes",
        description: err.response?.data?.error || "Failed to update settings. Please try again.",
        type: "error",
      });
    } finally {
      setIsSubmitting(false);
    }
  }

  // Jump to the first field that needs attention
  const onInvalid = (errs: typeof errors) => {
    const key = Object.keys(errs)[0] as keyof FormValues | undefined;
    if (key) form.setFocus(key);
  };

  return (
    <MotionConfig reducedMotion="user">
      <form onSubmit={form.handleSubmit(onSubmit, onInvalid)} className="mx-auto max-w-4xl space-y-10 pb-28" noValidate>
        {/* Identity header */}
        <Panel delay={0}>
          <div className="flex flex-col gap-5 p-6 sm:flex-row sm:items-center sm:p-8">
            <div
              className="grid size-16 shrink-0 place-items-center rounded-2xl text-xl font-semibold text-white"
              style={{
                background: "linear-gradient(135deg, rgb(249 115 22), rgb(251 146 60 / 0.8))",
                boxShadow: "0 14px 28px -10px rgb(249 115 22 / 0.7), inset 0 1px 0 rgba(255,255,255,0.4)",
              }}
            >
              {initials}
            </div>
            <div className="min-w-0 flex-1">
              <h2 className="truncate font-[family-name:var(--font-display)] text-2xl font-semibold tracking-tight text-neutral-900">
                {first || last ? `${first} ${last}` : "Your account"}
              </h2>
              <p className="mt-0.5 truncate text-sm text-neutral-500">{form.watch("email")}</p>
            </div>
            <span className="inline-flex w-fit items-center gap-1.5 rounded-full border border-orange-500/20 bg-orange-500/10 px-3 py-1 text-xs font-medium text-orange-700">
              <span className="size-1.5 rounded-full bg-orange-500" />
              {initialData.account_name}
            </span>
          </div>
        </Panel>

        {/* Profile */}
        <Section
          title="Profile"
          description="How you appear across the admin workspace and in messages we send on your behalf."
          delay={0.06}
        >
          <div className="grid gap-5 sm:grid-cols-2">
            <Field label="First name" icon={User} autoComplete="given-name" error={errors.firstName?.message} {...form.register("firstName")} />
            <Field label="Last name" icon={User} autoComplete="family-name" error={errors.lastName?.message} {...form.register("lastName")} />
            <Field label="Email address" icon={Mail} type="email" autoComplete="email" error={errors.email?.message} {...form.register("email")} />
            <Field label="Phone number" icon={Phone} type="tel" autoComplete="tel" placeholder="+2348012345678" error={errors.phoneNumber?.message} {...form.register("phoneNumber")} />
          </div>
        </Section>

        {/* Security */}
        <Section
          title="Security"
          description="Confirm it's you to save any change. Add a new password only if you want to replace the current one."
          delay={0.12}
        >
          <div className="space-y-5">
            <Field
              label="Current password"
              required
              icon={Lock}
              type={showCurrent ? "text" : "password"}
              autoComplete="current-password"
              placeholder="Required to save changes"
              error={errors.currentPassword?.message}
              trailing={<Reveal shown={showCurrent} onToggle={() => setShowCurrent((s) => !s)} />}
              {...form.register("currentPassword")}
            />

            <div className="h-px bg-neutral-900/[0.07]" />

            <div className="grid gap-5 sm:grid-cols-2">
              <div>
                <Field
                  label="New password"
                  icon={KeyRound}
                  type={showNew ? "text" : "password"}
                  autoComplete="new-password"
                  placeholder="Leave blank to keep current"
                  error={errors.newPassword?.message}
                  trailing={<Reveal shown={showNew} onToggle={() => setShowNew((s) => !s)} />}
                  {...form.register("newPassword")}
                />
                <AnimatePresence initial={false}>
                  {newPw ? (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: "auto", opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      transition={{ duration: 0.25, ease: EASE }}
                      className="overflow-hidden"
                    >
                      <div className="pt-2.5">
                        <div className="flex gap-1.5" aria-hidden>
                          {[1, 2, 3, 4].map((n) => (
                            <span
                              key={n}
                              className={`h-1 flex-1 rounded-full transition-colors duration-300 ${
                                strength.score >= n ? strength.bar : "bg-neutral-900/10"
                              }`}
                            />
                          ))}
                        </div>
                        <p className={`mt-1.5 text-xs font-medium ${strength.text}`}>{strength.label}</p>
                      </div>
                    </motion.div>
                  ) : null}
                </AnimatePresence>
              </div>

              <div>
                <Field
                  label="Confirm new password"
                  icon={KeyRound}
                  type="password"
                  autoComplete="new-password"
                  placeholder="Repeat the new password"
                  error={errors.confirmPassword?.message}
                  {...form.register("confirmPassword")}
                />
                {newPw && confirmPw && newPw === confirmPw && !errors.confirmPassword && (
                  <p className="mt-2 flex items-center gap-1 text-xs font-medium text-emerald-600">
                    <Check className="size-3.5" /> Passwords match
                  </p>
                )}
              </div>
            </div>
          </div>
        </Section>

        {/* Floating save bar: only appears when something changed */}
        <div className="pointer-events-none fixed inset-x-0 bottom-6 z-40 flex justify-center px-4">
          <AnimatePresence>
            {isDirty && (
              <motion.div
                initial={{ y: 40, opacity: 0, scale: 0.96 }}
                animate={{ y: 0, opacity: 1, scale: 1 }}
                exit={{ y: 40, opacity: 0, scale: 0.96 }}
                transition={{ type: "spring", stiffness: 380, damping: 30 }}
                className="pointer-events-auto flex items-center gap-4 rounded-2xl bg-neutral-900 py-2.5 pl-5 pr-2.5 text-white shadow-[0_24px_60px_-12px_rgba(0,0,0,0.45)] ring-1 ring-white/10"
                role="region"
                aria-label="Unsaved changes"
              >
                <p className="flex items-center gap-2 text-sm">
                  <span className="relative flex size-2">
                    <span className="absolute inline-flex size-full animate-ping rounded-full bg-orange-400 opacity-60 motion-reduce:animate-none" />
                    <span className="relative inline-flex size-2 rounded-full bg-orange-400" />
                  </span>
                  Unsaved changes
                </p>
                <div className="flex items-center gap-1.5">
                  <button
                    type="button"
                    onClick={() => form.reset()}
                    disabled={isSubmitting}
                    className="flex items-center gap-1.5 rounded-xl px-3 py-2 text-sm font-medium text-neutral-300 transition-colors hover:bg-white/10 hover:text-white disabled:opacity-50"
                  >
                    <RotateCcw className="size-3.5" /> Discard
                  </button>
                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className="flex items-center gap-2 rounded-xl bg-orange-500 px-4 py-2 text-sm font-semibold text-white shadow-lg shadow-orange-500/30 transition-all hover:bg-orange-400 active:scale-[0.97] disabled:opacity-60"
                  >
                    {isSubmitting ? <Loader2 className="size-4 animate-spin" /> : <Check className="size-4" />}
                    {isSubmitting ? "Saving" : "Save changes"}
                  </button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </form>
    </MotionConfig>
  );
}

/* ------------------------------ building blocks ------------------------------ */

/** Same frame language as the dashboard cards: soft white body so the dotted background stays faintly visible. */
export function Panel({ children, delay = 0 }: { children: ReactNode; delay?: number }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 18 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.6, delay, ease: EASE }}
      className="relative overflow-hidden rounded-2xl border border-neutral-900/10"
      style={{
        background:
          "linear-gradient(180deg, rgb(249 115 22 / 0.08), rgb(249 115 22 / 0.02) 45%, transparent), rgba(255,255,255,0.85)",
        boxShadow: "inset 0 1px 0 rgba(255,255,255,0.95), 0 1px 2px rgba(0,0,0,0.04), 0 14px 34px -16px rgba(0,0,0,0.14)",
      }}
    >
      <div
        aria-hidden
        className="pointer-events-none absolute inset-x-8 top-0 h-px"
        style={{ background: "linear-gradient(90deg, transparent, rgb(249 115 22 / 0.8), transparent)" }}
      />
      {children}
    </motion.div>
  );
}

/** Left: what the section is for. Right: the fields. */
function Section({ title, description, children, delay }: { title: string; description: string; children: ReactNode; delay: number }) {
  return (
    <div className="grid gap-5 lg:grid-cols-[230px_1fr] lg:gap-10">
      <div className="lg:pt-1">
        <h3 className="font-[family-name:var(--font-display)] text-lg font-semibold tracking-tight text-neutral-900">{title}</h3>
        <p className="mt-1.5 max-w-xs text-sm leading-relaxed text-neutral-500">{description}</p>
      </div>
      <Panel delay={delay}>
        <div className="p-6 sm:p-8">{children}</div>
      </Panel>
    </div>
  );
}

type FieldProps = ComponentProps<"input"> & {
  label: string;
  icon: LucideIcon;
  error?: string;
  trailing?: ReactNode;
  required?: boolean;
};

function Field({ label, icon: Icon, error, trailing, required, className, id, name, ...rest }: FieldProps) {
  const inputId = id ?? `field-${name}`;
  return (
    <div>
      <label htmlFor={inputId} className="mb-1.5 block text-sm font-medium text-neutral-800">
        {label}
        {required && <span className="ml-0.5 text-orange-600">*</span>}
      </label>
      <div className="group relative">
        <Icon
          aria-hidden
          className={`pointer-events-none absolute left-3.5 top-1/2 size-4 -translate-y-1/2 transition-colors ${
            error ? "text-rose-400" : "text-neutral-400 group-focus-within:text-orange-500"
          }`}
        />
        <input
          id={inputId}
          name={name}
          aria-invalid={!!error}
          aria-describedby={error ? `${inputId}-error` : undefined}
          className={`w-full rounded-xl border bg-white py-2.5 pl-10 text-sm text-neutral-900 shadow-[0_1px_2px_rgba(0,0,0,0.04)] outline-none transition-all placeholder:text-neutral-400 ${
            trailing ? "pr-11" : "pr-3"
          } ${
            error
              ? "border-rose-300 focus:border-rose-400 focus:ring-4 focus:ring-rose-500/10"
              : "border-neutral-900/10 hover:border-neutral-900/20 focus:border-orange-400 focus:ring-4 focus:ring-orange-500/10"
          } ${className ?? ""}`}
          {...rest}
        />
        {trailing && <div className="absolute right-2 top-1/2 -translate-y-1/2">{trailing}</div>}
      </div>
      <AnimatePresence initial={false}>
        {error && (
          <motion.p
            id={`${inputId}-error`}
            role="alert"
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="overflow-hidden"
          >
            <span className="flex items-center gap-1 pt-1.5 text-xs text-rose-600">
              <AlertCircle className="size-3.5 shrink-0" /> {error}
            </span>
          </motion.p>
        )}
      </AnimatePresence>
    </div>
  );
}

function Reveal({ shown, onToggle }: { shown: boolean; onToggle: () => void }) {
  return (
    <button
      type="button"
      onClick={onToggle}
      aria-label={shown ? "Hide password" : "Show password"}
      className="grid size-8 place-items-center rounded-lg text-neutral-400 transition-colors hover:bg-neutral-900/5 hover:text-neutral-700"
    >
      {shown ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
    </button>
  );
}

function scorePassword(p: string) {
  let score = 0;
  if (p.length >= 8) score++;
  if (p.length >= 12) score++;
  if (/[a-z]/.test(p) && /[A-Z]/.test(p)) score++;
  if (/\d/.test(p) && /[^A-Za-z0-9]/.test(p)) score++;
  const map = [
    { label: "Too short", bar: "bg-rose-500", text: "text-rose-600" },
    { label: "Weak", bar: "bg-rose-500", text: "text-rose-600" },
    { label: "Fair", bar: "bg-amber-500", text: "text-amber-600" },
    { label: "Good", bar: "bg-emerald-400", text: "text-emerald-600" },
    { label: "Strong", bar: "bg-emerald-500", text: "text-emerald-600" },
  ];
  return { score, ...map[p.length < 8 ? 0 : score] };
}