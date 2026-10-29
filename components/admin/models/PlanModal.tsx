"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import {
  X,
  ShieldAlert,
  Loader2,
  AlertTriangle,
  Copy,
  Check,
  BookOpen,
  ChevronRight,
  Sparkles,
  LayoutTemplate,
  Calendar,
  Users,
  CheckCircle2,
  XCircle,
  Crown,
  Link2,
} from "lucide-react";
import { toast } from "@/components/ui/toast";
import { apiClient } from "@/lib/api/api_base";
import { Plan } from "@/components/admin/sections/plans/PlansClient";

type PlanModalProps = {
  mode: "create" | "edit" | "delete" | "view";
  plan: Plan | null;
  onClose: () => void;
  onSuccess: () => void;
  onOpenGuide?: () => void;
};

const inputCls =
  "w-full p-3 bg-white border border-gray-200 rounded-xl text-sm font-[family-name:var(--font-body)] focus:outline-none focus:ring-4 focus:ring-orange-500/10 focus:border-orange-400 disabled:opacity-60 disabled:bg-gray-50 disabled:cursor-not-allowed transition-all";
const labelCls =
  "text-xs font-bold text-gray-700 mb-1.5 block font-[family-name:var(--font-display)]";

const TONES = {
  free: {
    bar: "bg-gradient-to-r from-emerald-400 via-emerald-500 to-teal-400",
    tint: "from-emerald-100/70",
    chip: "bg-emerald-100 text-emerald-600 ring-emerald-200",
    rs: "text-emerald-500",
  },
  standard: {
    bar: "bg-gradient-to-r from-orange-400 via-orange-500 to-amber-400",
    tint: "from-orange-100/70",
    chip: "bg-orange-100 text-orange-600 ring-orange-200",
    rs: "text-orange-500",
  },
  premium: {
    bar: "bg-gradient-to-r from-violet-500 via-purple-500 to-fuchsia-400",
    tint: "from-violet-100/80",
    chip: "bg-violet-100 text-violet-600 ring-violet-200",
    rs: "text-violet-500",
  },
} as const;

function Toggle({
  name,
  checked,
  onChange,
  disabled,
  title,
  hint,
  tone = "orange",
}: {
  name: string;
  checked: boolean;
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  disabled?: boolean;
  title: string;
  hint: string;
  tone?: "orange" | "emerald";
}) {
  return (
    <label
      className={`flex items-center justify-between gap-4 p-3.5 bg-white border border-gray-200 rounded-xl group transition-colors ${disabled ? "opacity-60 cursor-not-allowed" : "cursor-pointer hover:border-gray-300"}`}
    >
      <div>
        <p className="text-sm font-bold text-gray-800 font-[family-name:var(--font-display)]">
          {title}
        </p>
        <p className="text-xs text-gray-500 font-[family-name:var(--font-body)]">
          {hint}
        </p>
      </div>
      <div className="relative shrink-0">
        <input
          type="checkbox"
          name={name}
          checked={checked}
          onChange={onChange}
          disabled={disabled}
          className="peer sr-only"
        />
        <div
          className={`w-11 h-6 rounded-full bg-gray-200 transition-colors ${tone === "emerald" ? "peer-checked:bg-emerald-500" : "peer-checked:bg-orange-500"} peer-focus-visible:ring-4 peer-focus-visible:ring-orange-500/20`}
        />
        <div className="absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform peer-checked:translate-x-5" />
      </div>
    </label>
  );
}

export function PlanModal({
  mode,
  plan,
  onClose,
  onSuccess,
  onOpenGuide,
}: PlanModalProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [copied, setCopied] = useState(false);
  const isLocked = plan ? plan.active_subscribers > 0 : false;
  const tier = !plan
    ? "standard"
    : plan.price === 0
      ? "free"
      : plan.max_premium_templates > 0
        ? "premium"
        : "standard";
  const t = TONES[tier];

  const [formData, setFormData] = useState({
    name: plan?.name || "",
    description: plan?.description || "",
    price: plan?.price || 0,
    duration_days: plan?.duration_days || 30,
    max_simple_templates: plan?.max_simple_templates || 3,
    max_premium_templates: plan?.max_premium_templates || 0,
    allows_custom_slug: plan?.allows_custom_slug || false,
    is_active: plan?.is_active ?? true,
  });

  const handleChange = (
    e: React.ChangeEvent<
      HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement
    >,
  ) => {
    const { name, value, type } = e.target;
    const checked = (e.target as HTMLInputElement).checked;
    setFormData((prev) => ({
      ...prev,
      [name]:
        type === "checkbox"
          ? checked
          : type === "number"
            ? Number(value)
            : value,
    }));
  };

  const handleCopyId = () => {
    if (plan?.id) {
      navigator.clipboard.writeText(plan.id);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (mode === "view") return;

    setIsSubmitting(true);
    try {
      if (mode === "create") {
        await apiClient.post("/admin/dashboard/plans", formData);
        toast.add({
          title: "Created",
          description: "Plan created successfully.",
          type: "success",
        });
      } else if (mode === "edit") {
        if (isLocked) {
          await apiClient.patch(`/admin/dashboard/plans/${plan?.id}`, {
            is_active: formData.is_active,
          });
          toast.add({
            title: "Updated",
            description: "Plan status updated (Locked to only toggle active).",
            type: "success",
          });
        } else {
          await apiClient.patch(`/admin/dashboard/plans/${plan?.id}`, formData);
          toast.add({
            title: "Updated",
            description: "Plan updated successfully.",
            type: "success",
          });
        }
      } else if (mode === "delete") {
        await apiClient.delete(`/admin/dashboard/plans/${plan?.id}`);
        toast.add({
          title: "Deleted",
          description: "Plan permanently deleted.",
          type: "success",
        });
      }
      onSuccess();
    } catch (error: any) {
      toast.add({
        title: "Error",
        description: error.response?.data?.error || "Something went wrong.",
        type: "error",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const isView = mode === "view";
  const isDelete = mode === "delete";
  const lockedEdit = isLocked && mode === "edit";
  const perDay =
    formData.duration_days > 0 ? formData.price / formData.duration_days : 0;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6">
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={onClose}
        className="absolute inset-0 bg-gray-900/60 backdrop-blur-md cursor-pointer"
      />

      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 20 }}
        className="relative bg-[#fffafb] rounded-[2rem] w-full max-w-lg shadow-2xl shadow-orange-900/20 z-10 border border-white max-h-[90vh] overflow-y-auto no-scrollbar flex flex-col"
      >
        <div
          className="absolute inset-0 z-0 opacity-[0.03] pointer-events-none rounded-[2rem]"
          style={{
            backgroundImage: "radial-gradient(#f97316 1px, transparent 1px)",
            backgroundSize: "24px 24px",
          }}
        />
        <div
          className={`absolute top-0 inset-x-0 h-28 rounded-t-[2rem] pointer-events-none ${isDelete ? "bg-gradient-to-b from-red-100/70" : isView ? `bg-gradient-to-b ${t.tint}` : "bg-gradient-to-b from-orange-100/70"} to-transparent`}
        />

        <div className="relative z-10 p-6 md:p-8">
          {/* Header */}
          <div className="flex justify-between items-start mb-6">
            <div className="flex items-center gap-3">
              <div
                className={`p-3 rounded-2xl shadow-inner ring-1 ${
                  isDelete
                    ? "bg-red-100 text-red-600 ring-red-200"
                    : isView
                      ? t.chip
                      : "bg-orange-100 text-orange-600 ring-orange-200"
                }`}
              >
                {isDelete ? (
                  <AlertTriangle className="w-5 h-5" />
                ) : isView ? (
                  <Sparkles className="w-5 h-5" />
                ) : (
                  <LayoutTemplate className="w-5 h-5" />
                )}
              </div>
              <div>
                <h2 className="text-xl font-bold text-gray-900 font-[family-name:var(--font-display)]">
                  {mode === "create"
                    ? "Create New Plan"
                    : mode === "edit"
                      ? "Edit Plan"
                      : mode === "delete"
                        ? "Delete Plan"
                        : "Plan Details"}
                </h2>
                <p className="text-xs text-gray-500 font-[family-name:var(--font-body)] mt-0.5">
                  {mode === "create"
                    ? "Setup a new pricing tier for your users."
                    : mode === "edit"
                      ? "Update plan settings and limits."
                      : isDelete
                        ? "This action cannot be undone."
                        : "View complete plan overview."}
                </p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="p-2 bg-white/80 hover:bg-gray-100 rounded-full text-gray-500 transition-colors cursor-pointer border border-gray-100 shadow-sm"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {isView ? (
            <div className="space-y-5">
              <div className="bg-white/80 backdrop-blur-sm p-6 rounded-3xl border border-gray-100 shadow-sm text-center relative overflow-hidden">
                <div className={`absolute top-0 left-0 w-full h-2 ${t.bar}`} />
                <span
                  className={`inline-flex items-center gap-1.5 mt-2 text-[11px] font-bold px-2.5 py-1 rounded-full ${plan?.is_active ? "bg-emerald-50 text-emerald-700" : "bg-gray-100 text-gray-600"}`}
                >
                  <span
                    className={`w-1.5 h-1.5 rounded-full ${plan?.is_active ? "bg-emerald-500" : "bg-gray-400"}`}
                  />
                  {plan?.is_active ? "Active" : "Inactive"}
                </span>
                <h3 className="text-2xl font-bold text-gray-900 mt-3 font-[family-name:var(--font-display)]">
                  {plan?.name}
                </h3>
                <p className="text-5xl font-black text-gray-900 mt-2 mb-1 tracking-tight">
                  <span className={`text-xl mr-1 ${t.rs}`}>Rs</span>
                  {plan?.price.toLocaleString()}
                </p>
                <p className="text-sm font-medium text-gray-500 font-[family-name:var(--font-body)]">
                  Billed every {plan?.duration_days} days
                </p>
                {plan?.description && (
                  <p className="text-xs text-gray-500 mt-3 max-w-xs mx-auto leading-relaxed font-[family-name:var(--font-body)]">
                    {plan.description}
                  </p>
                )}
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="bg-white/80 p-4 rounded-2xl border border-gray-100 flex flex-col items-center text-center shadow-sm">
                  <div className="p-2 bg-orange-50 rounded-lg mb-2">
                    <LayoutTemplate className="w-5 h-5 text-orange-500" />
                  </div>
                  <span className="text-2xl font-bold text-gray-900">
                    {plan?.max_simple_templates}
                  </span>
                  <span className="text-xs text-gray-500 font-medium mt-1 font-[family-name:var(--font-body)]">
                    Simple Templates
                  </span>
                </div>
                <div className="bg-white/80 p-4 rounded-2xl border border-gray-100 flex flex-col items-center text-center shadow-sm">
                  <div className="p-2 bg-purple-50 rounded-lg mb-2">
                    <Crown className="w-5 h-5 text-purple-500" />
                  </div>
                  <span className="text-2xl font-bold text-gray-900">
                    {plan?.max_premium_templates}
                  </span>
                  <span className="text-xs text-gray-500 font-medium mt-1 font-[family-name:var(--font-body)]">
                    Premium Templates
                  </span>
                </div>
              </div>

              <div className="bg-white/80 p-4 rounded-2xl border border-gray-100 shadow-sm space-y-3">
                <div className="flex items-center justify-between">
                  <span className="flex items-center gap-2 text-sm font-medium text-gray-700 font-[family-name:var(--font-body)]">
                    <Link2 className="w-4 h-4 text-gray-400" /> Allows Custom Slug
                  </span>
                  {plan?.allows_custom_slug ? (
                    <span className="flex items-center gap-1.5 text-xs font-bold text-emerald-600 bg-emerald-50 px-2 py-1 rounded-md">
                      <CheckCircle2 className="w-3.5 h-3.5" /> Yes
                    </span>
                  ) : (
                    <span className="flex items-center gap-1.5 text-xs font-bold text-gray-500 bg-gray-100 px-2 py-1 rounded-md">
                      <XCircle className="w-3.5 h-3.5" /> No
                    </span>
                  )}
                </div>
                <div className="flex items-center justify-between">
                  <span className="flex items-center gap-2 text-sm font-medium text-gray-700 font-[family-name:var(--font-body)]">
                    <Calendar className="w-4 h-4 text-gray-400" /> Active Subscribers
                  </span>
                  <span
                    className={`flex items-center gap-1.5 text-xs font-bold px-2 py-1 rounded-md ${isLocked ? "text-orange-600 bg-orange-50" : "text-gray-500 bg-gray-100"}`}
                  >
                    <Users className="w-3.5 h-3.5" /> {plan?.active_subscribers}{" "}
                    Users
                  </span>
                </div>
                {isLocked && (
                  <div className="flex items-start gap-2 pt-3 border-t border-gray-100 text-xs text-orange-700 font-[family-name:var(--font-body)]">
                    <ShieldAlert className="w-4 h-4 shrink-0" />
                    Locked: price and limits can't change while users are subscribed.
                  </div>
                )}
              </div>

              <div className="bg-gray-50/80 p-3 rounded-xl border border-gray-200 flex items-center justify-between">
                <div className="min-w-0">
                  <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-0.5 font-[family-name:var(--font-display)]">
                    Plan ID
                  </p>
                  <p className="text-xs font-mono text-gray-700 truncate">
                    {plan?.id}
                  </p>
                </div>
                <button
                  onClick={handleCopyId}
                  className="p-2 text-gray-400 hover:text-orange-500 hover:bg-orange-50 rounded-lg transition-colors cursor-pointer"
                >
                  {copied ? (
                    <Check className="w-4 h-4 text-emerald-500" />
                  ) : (
                    <Copy className="w-4 h-4" />
                  )}
                </button>
              </div>

              <button
                onClick={onClose}
                className="w-full py-3 bg-white border border-gray-200 hover:bg-gray-50 text-gray-700 font-bold rounded-xl transition-all cursor-pointer font-[family-name:var(--font-display)] shadow-sm"
              >
                Close Details
              </button>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-5">
              {mode === "create" && onOpenGuide && (
                <div className="flex items-center justify-between p-3.5 bg-orange-50/80 border border-orange-100 rounded-xl">
                  <div className="flex items-center gap-2.5">
                    <div className="p-1.5 bg-orange-100 text-orange-600 rounded-md">
                      <BookOpen className="w-4 h-4" />
                    </div>
                    <span className="text-sm font-medium text-gray-700 font-[family-name:var(--font-body)]">
                      Not sure how plans work?
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={onOpenGuide}
                    className="text-sm font-bold text-orange-600 hover:text-orange-700 flex items-center gap-1 cursor-pointer transition-colors font-[family-name:var(--font-display)]"
                  >
                    Read Guide <ChevronRight className="w-4 h-4" />
                  </button>
                </div>
              )}

              {lockedEdit && (
                <div className="p-4 bg-orange-50/80 backdrop-blur-sm border border-orange-200 rounded-xl flex items-start gap-3 shadow-sm">
                  <ShieldAlert className="w-5 h-5 text-orange-600 shrink-0 mt-0.5" />
                  <div>
                    <p className="text-sm font-bold text-orange-900 font-[family-name:var(--font-display)]">
                      Plan is Active!
                    </p>
                    <p className="text-xs text-orange-800 mt-1 font-[family-name:var(--font-body)] leading-relaxed">
                      You cannot change the price or limits while users are
                      subscribed. You can only toggle 'is_active'.
                    </p>
                  </div>
                </div>
              )}

              {isDelete ? (
                <div className="flex flex-col items-center justify-center py-6 text-center space-y-3">
                  <div className="w-20 h-20 bg-red-50 text-red-500 rounded-full flex items-center justify-center mb-2 border-4 border-white shadow-lg">
                    <AlertTriangle className="w-10 h-10" />
                  </div>
                  <h3 className="text-lg font-bold text-gray-900 font-[family-name:var(--font-display)]">
                    Are you absolutely sure?
                  </h3>
                  <p className="text-sm text-gray-600 font-[family-name:var(--font-body)] max-w-xs">
                    You are about to permanently delete the{" "}
                    <strong className="text-gray-900">{plan?.name}</strong>{" "}
                    plan. This action cannot be reversed.
                  </p>
                  {isLocked && (
                    <p className="text-xs font-semibold text-red-600 bg-red-50 border border-red-100 rounded-lg px-3 py-2">
                      {plan?.active_subscribers} active subscriber(s) — deletion is disabled.
                    </p>
                  )}
                </div>
              ) : (
                <>
                  {/* Live preview */}
                  <div className="flex items-center justify-between p-4 rounded-2xl bg-gradient-to-br from-gray-900 to-gray-800 text-white shadow-lg">
                    <div className="min-w-0">
                      <p className="text-[10px] uppercase tracking-widest text-orange-300 font-bold">
                        Live preview
                      </p>
                      <p className="text-sm font-bold truncate font-[family-name:var(--font-display)]">
                        {formData.name || "Untitled plan"}
                      </p>
                    </div>
                    <div className="text-right shrink-0">
                      <p className="text-xl font-black">
                        Rs {Number(formData.price || 0).toLocaleString()}
                      </p>
                      <p className="text-[11px] text-gray-400">
                        {formData.duration_days} days · ≈ Rs {Math.round(perDay).toLocaleString()}/day
                      </p>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="col-span-2">
                      <label className={labelCls}>Plan Name</label>
                      <input
                        type="text"
                        name="name"
                        value={formData.name}
                        onChange={handleChange}
                        required
                        disabled={lockedEdit}
                        className={inputCls}
                        placeholder="e.g. Premium Plan"
                      />
                    </div>
                    <div>
                      <label className={labelCls}>Price (PKR)</label>
                      <div className="relative">
                        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs font-bold text-gray-400">
                          Rs
                        </span>
                        <input
                          type="number"
                          name="price"
                          value={formData.price}
                          onChange={handleChange}
                          required
                          min="0"
                          disabled={lockedEdit}
                          className={`${inputCls} pl-9`}
                        />
                      </div>
                    </div>
                    <div>
                      <label className={labelCls}>Duration (Days)</label>
                      <input
                        type="number"
                        name="duration_days"
                        value={formData.duration_days}
                        onChange={handleChange}
                        required
                        min="1"
                        disabled={lockedEdit}
                        className={inputCls}
                      />
                    </div>
                    <div>
                      <label className={labelCls}>Simple Templates</label>
                      <input
                        type="number"
                        name="max_simple_templates"
                        value={formData.max_simple_templates}
                        onChange={handleChange}
                        required
                        min="0"
                        disabled={lockedEdit}
                        className={inputCls}
                      />
                    </div>
                    <div>
                      <label className={labelCls}>Premium Templates</label>
                      <input
                        type="number"
                        name="max_premium_templates"
                        value={formData.max_premium_templates}
                        onChange={handleChange}
                        required
                        min="0"
                        disabled={lockedEdit}
                        className={inputCls}
                      />
                    </div>
                  </div>

                  <div className="space-y-3 pt-1">
                    <Toggle
                      name="allows_custom_slug"
                      checked={formData.allows_custom_slug}
                      onChange={handleChange}
                      disabled={lockedEdit}
                      title="Allows Custom Slug"
                      hint="Let users pick a URL like /invite/sara-and-ahmed"
                    />
                    <Toggle
                      name="is_active"
                      checked={formData.is_active}
                      onChange={handleChange}
                      tone="emerald"
                      title="Plan is Active"
                      hint="Inactive plans are hidden from new buyers"
                    />
                  </div>
                </>
              )}

              <div className="flex gap-3 pt-5 mt-2 border-t border-gray-200/60">
                <button
                  type="button"
                  onClick={onClose}
                  className="flex-1 py-3 bg-white border border-gray-200 hover:bg-gray-50 text-gray-700 font-bold rounded-xl transition-all cursor-pointer font-[family-name:var(--font-display)] shadow-sm"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting || (isLocked && isDelete)}
                  className={`flex-1 py-3 font-bold text-white rounded-xl transition-all shadow-lg flex items-center justify-center gap-2 cursor-pointer font-[family-name:var(--font-display)] ${isDelete ? "bg-gradient-to-b from-red-500 to-red-600 shadow-red-500/25 hover:-translate-y-0.5" : "bg-gradient-to-b from-orange-500 to-orange-600 shadow-orange-500/30 hover:-translate-y-0.5"} disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:translate-y-0`}
                >
                  {isSubmitting && <Loader2 className="w-4 h-4 animate-spin" />}
                  {mode === "create"
                    ? "Create Plan"
                    : mode === "edit"
                      ? "Save Changes"
                      : "Delete Plan"}
                </button>
              </div>
            </form>
          )}
        </div>
      </motion.div>
    </div>
  );
}