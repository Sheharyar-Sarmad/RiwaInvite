"use client";

import { useState, useEffect } from "react";
import {
  Plus,
  Pencil,
  Trash2,
  Check,
  Minus,
  Search,
  ChevronLeft,
  ChevronRight,
  BookOpen,
  Lock,
  Users,
  Layers,
  X,
  Crown,
  Sparkles,
  LayoutTemplate,
  Link2,
} from "lucide-react";
import { toast } from "@/components/ui/toast";
import { apiClient } from "@/lib/api/api_base";
import { motion, AnimatePresence } from "framer-motion";
import { PlanModal } from "@/components/admin/models/PlanModal";
import { PlanGuideModal } from "@/components/admin/models/PlanGuideModal";
import { AceternitySelect } from "@/components/ui/aceternity-select";

export type Plan = {
  id: string;
  name: string;
  description: string | null;
  price: number;
  duration_days: number;
  max_simple_templates: number;
  max_premium_templates: number;
  allows_custom_slug: boolean;
  is_active: boolean;
  active_subscribers: number;
};

type Meta = { page: number; limit: number; total: number; total_pages: number };

const STATUS_OPTIONS = [
  { label: "All Status", value: "all" },
  { label: "Active Only", value: "true" },
  { label: "Inactive Only", value: "false" },
];

const display = "font-[family-name:var(--font-display)]";
const body = "font-[family-name:var(--font-body)]";

const TONES = {
  free: {
    label: "Free",
    icon: Sparkles,
    head: "from-emerald-50 via-emerald-50/40 to-white",
    bar: "bg-emerald-500",
    chip: "bg-emerald-100 text-emerald-600 ring-emerald-200",
    rs: "text-emerald-600",
    pill: "bg-emerald-50 text-emerald-700 ring-emerald-200",
    meter: "bg-emerald-500",
    hover: "hover:border-emerald-300 hover:shadow-emerald-500/10",
  },
  standard: {
    label: "Standard",
    icon: Layers,
    head: "from-orange-50 via-orange-50/40 to-white",
    bar: "bg-orange-500",
    chip: "bg-orange-100 text-orange-600 ring-orange-200",
    rs: "text-orange-500",
    pill: "bg-orange-50 text-orange-700 ring-orange-200",
    meter: "bg-orange-500",
    hover: "hover:border-orange-300 hover:shadow-orange-500/10",
  },
  premium: {
    label: "Premium",
    icon: Crown,
    head: "from-violet-50 via-violet-50/40 to-white",
    bar: "bg-violet-500",
    chip: "bg-violet-100 text-violet-600 ring-violet-200",
    rs: "text-violet-500",
    pill: "bg-violet-50 text-violet-700 ring-violet-200",
    meter: "bg-violet-500",
    hover: "hover:border-violet-300 hover:shadow-violet-500/10",
  },
} as const;

function SpecRow({
  icon: Icon,
  label,
  children,
  on = true,
}: {
  icon: any;
  label: string;
  children: React.ReactNode;
  on?: boolean;
}) {
  return (
    <div className="flex items-center justify-between py-2">
      <div className="flex items-center gap-3">
        <span
          className={`w-8 h-8 rounded-lg flex items-center justify-center ${on ? "bg-gray-100 text-gray-600" : "bg-gray-50 text-gray-300"}`}
        >
          <Icon className="w-4 h-4" />
        </span>
        <span
          className={`text-[13px] font-medium ${on ? "text-gray-700" : "text-gray-400"} ${body}`}
        >
          {label}
        </span>
      </div>
      {children}
    </div>
  );
}

function CardSkeleton() {
  return (
    <div className="h-full bg-white border border-gray-200 rounded-2xl p-5 animate-pulse">
      <div className="flex justify-between">
        <div className="h-4 w-32 bg-gray-100 rounded" />
        <div className="h-5 w-14 bg-gray-100 rounded-full" />
      </div>
      <div className="h-3 w-44 bg-gray-100 rounded mt-3" />
      <div className="h-9 w-40 bg-gray-100 rounded mt-6" />
      <div className="space-y-3 mt-6 pt-4 border-t border-gray-100">
        <div className="h-3 bg-gray-100 rounded" />
        <div className="h-3 bg-gray-100 rounded" />
        <div className="h-3 bg-gray-100 rounded" />
      </div>
      <div className="h-8 bg-gray-50 rounded-lg mt-6" />
    </div>
  );
}

export function PlansClient() {
  const [plans, setPlans] = useState<Plan[]>([]);
  const [meta, setMeta] = useState<Meta>({
    page: 1,
    limit: 9,
    total: 0,
    total_pages: 1,
  });
  const [isLoading, setIsLoading] = useState(true);

  const [searchInput, setSearchInput] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [page, setPage] = useState(1);
  const [isActiveFilter, setIsActiveFilter] = useState<string>("all");

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isGuideOpen, setIsGuideOpen] = useState(false);
  const [modalMode, setModalMode] = useState<
    "create" | "edit" | "delete" | "view"
  >("create");
  const [selectedPlan, setSelectedPlan] = useState<Plan | null>(null);

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(searchInput);
      setPage(1);
    }, 500);
    return () => clearTimeout(timer);
  }, [searchInput]);

  const fetchPlans = async () => {
    setIsLoading(true);
    try {
      const params = new URLSearchParams({
        page: page.toString(),
        limit: meta.limit.toString(),
        ...(debouncedSearch && { search: debouncedSearch }),
        ...(isActiveFilter !== "all" && { is_active: isActiveFilter }),
      });

      const res = await apiClient.get(
        `/admin/dashboard/plans?${params.toString()}`,
      );
      setPlans(res.data.data);
      setMeta(res.data.meta);
    } catch (e) {
      toast.add({
        title: "Error",
        description: "Failed to load plans.",
        type: "error",
      });
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchPlans();
  }, [page, debouncedSearch, isActiveFilter, meta.limit]);

  const handleOpenModal = (
    mode: "create" | "edit" | "delete" | "view",
    plan?: Plan,
  ) => {
    setModalMode(mode);
    setSelectedPlan(plan || null);
    setIsModalOpen(true);
  };

  const activeCount = plans.filter((p) => p.is_active).length;
  const subscriberCount = plans.reduce((s, p) => s + p.active_subscribers, 0);
  const topPlanId = plans.reduce<Plan | null>(
    (best, p) =>
      p.active_subscribers > (best?.active_subscribers ?? 0) ? p : best,
    null,
  )?.id;

  const maxSubs = Math.max(0, ...plans.map((p) => p.active_subscribers));

  const stats = [
    { label: "Total plans", value: meta.total },
    { label: "Active on page", value: activeCount },
    { label: "Subscribers on page", value: subscriberCount.toLocaleString() },
  ];

  return (
    <div className="space-y-8 pb-16">
      {/* Metrics */}
      <div className="grid grid-cols-1 sm:grid-cols-3 bg-white border border-gray-200 rounded-2xl divide-y sm:divide-y-0 sm:divide-x divide-gray-100">
        {stats.map((s) => (
          <div key={s.label} className="px-5 py-4">
            <p className={`text-xs font-medium text-gray-500 ${body}`}>
              {s.label}
            </p>
            <p
              className={`text-2xl font-semibold text-gray-900 tabular-nums tracking-tight mt-1 ${display}`}
            >
              {s.value}
            </p>
          </div>
        ))}
      </div>

      {/* Toolbar */}
      <div className="flex flex-col lg:flex-row justify-between items-stretch lg:items-center gap-3">
        <div className="flex flex-col sm:flex-row items-center gap-3 w-full lg:max-w-2xl">
          <div className="relative flex-1 w-full group">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 z-10 pointer-events-none group-focus-within:text-orange-500 transition-colors" />
            <input
              type="text"
              placeholder="Search plans..."
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              className={`w-full h-[42px] pl-10 pr-9 bg-white border border-gray-200 rounded-xl text-sm text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-4 focus:ring-orange-500/10 focus:border-orange-400 transition-all ${body}`}
            />
            {searchInput && (
              <button
                onClick={() => setSearchInput("")}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 p-1 rounded-md text-gray-400 hover:text-gray-700 hover:bg-gray-100 cursor-pointer"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          <div className="w-full sm:w-[170px] shrink-0">
            <AceternitySelect
              value={isActiveFilter}
              onChange={(val) => {
                setIsActiveFilter(val);
                setPage(1);
              }}
              options={STATUS_OPTIONS}
              className="h-[42px]"
            />
          </div>
        </div>

        <div className="flex gap-2 w-full lg:w-auto">
          <button
            onClick={() => setIsGuideOpen(true)}
            className={`flex items-center justify-center gap-2 h-[42px] px-4 bg-white border border-gray-200 hover:bg-gray-50 text-gray-700 rounded-xl text-sm font-semibold transition-colors cursor-pointer shrink-0 ${display}`}
          >
            <BookOpen className="w-4 h-4 text-gray-400" /> Guide
          </button>
          <button
            onClick={() => handleOpenModal("create")}
            className={`flex flex-1 lg:flex-none items-center justify-center gap-2 h-[42px] px-4 bg-orange-600 hover:bg-orange-700 text-white rounded-xl text-sm font-semibold shadow-sm transition-colors cursor-pointer shrink-0 ${display}`}
          >
            <Plus className="w-4 h-4" /> New plan
          </button>
        </div>
      </div>

      {/* Content */}
      <div className="pt-2">
        {isLoading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 lg:gap-8 items-stretch">
            {Array.from({ length: 6 }).map((_, i) => (
              <CardSkeleton key={i} />
            ))}
          </div>
        ) : plans.length === 0 ? (
          <div className="text-center py-20 bg-white rounded-2xl border border-gray-200">
            <div className="mx-auto w-11 h-11 rounded-xl border border-gray-200 text-gray-400 flex items-center justify-center mb-4">
              <Layers className="w-5 h-5" />
            </div>
            <p className={`text-gray-900 font-semibold ${display}`}>
              No plans found
            </p>
            <p className={`text-gray-500 text-sm mt-1 ${body}`}>
              Adjust your search or filters, or create a new plan.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 lg:gap-8 items-stretch">
            {plans.map((plan, index) => {
              const isLocked = plan.active_subscribers > 0;
              const isTop = plan.id === topPlanId;
              const perDay =
                plan.duration_days > 0 ? plan.price / plan.duration_days : 0;
              const tier =
                plan.price === 0
                  ? "free"
                  : plan.max_premium_templates > 0
                    ? "premium"
                    : "standard";
              const t = TONES[tier];
              const TierIcon = t.icon;
              const share =
                maxSubs > 0 ? (plan.active_subscribers / maxSubs) * 100 : 0;

              return (
                <motion.div
                  key={plan.id}
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  whileHover={{ y: -2 }}
                  transition={{ delay: index * 0.04, duration: 0.25 }}
                  onClick={() => handleOpenModal("view", plan)}
                  className={`group relative flex flex-col h-full bg-white border border-gray-200 ${t.hover} rounded-2xl overflow-hidden shadow-sm hover:shadow-xl transition-shadow duration-300 cursor-pointer ${plan.is_active ? "" : "opacity-80"}`}
                >
                  <div
                    className={`h-1 w-full ${plan.is_active ? t.bar : "bg-gray-200"}`}
                  />

                  {/* Header */}
                  <div className={`px-5 pt-5 pb-5 bg-gradient-to-b ${t.head}`}>
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex items-center gap-3 min-w-0">
                        <span
                          className={`w-10 h-10 shrink-0 rounded-xl ring-1 ring-inset flex items-center justify-center shadow-sm ${t.chip}`}
                        >
                          <TierIcon className="w-5 h-5" />
                        </span>
                        <div className="min-w-0">
                          <div className="flex items-center gap-2">
                            <h3
                              className={`text-[15px] font-semibold text-gray-900 truncate ${display}`}
                            >
                              {plan.name}
                            </h3>
                            {isTop && (
                              <span className="text-[10px] font-bold uppercase tracking-wide text-amber-700 bg-amber-100 px-1.5 py-0.5 rounded">
                                Popular
                              </span>
                            )}
                          </div>
                          <p
                            className={`text-xs text-gray-500 mt-0.5 truncate ${body}`}
                          >
                            {plan.description || `${t.label} tier`}
                          </p>
                        </div>
                      </div>
                      <span
                        className={`shrink-0 inline-flex items-center gap-1.5 text-[11px] font-semibold px-2 py-0.5 rounded-full ring-1 ring-inset bg-white ${
                          plan.is_active
                            ? "text-emerald-700 ring-emerald-200"
                            : "text-gray-500 ring-gray-200"
                        }`}
                      >
                        <span
                          className={`w-1.5 h-1.5 rounded-full ${plan.is_active ? "bg-emerald-500" : "bg-gray-400"}`}
                        />
                        {plan.is_active ? "Active" : "Inactive"}
                      </span>
                    </div>

                    <div className="mt-6 flex items-end justify-between gap-3">
                      <div className="flex items-baseline gap-1.5">
                        <span className={`text-sm font-bold ${t.rs}`}>Rs</span>
                        <span
                          className={`text-[36px] leading-none font-bold text-gray-900 tabular-nums tracking-tight ${display}`}
                        >
                          {plan.price.toLocaleString()}
                        </span>
                        <span className={`text-sm text-gray-400 ${body}`}>
                          / {plan.duration_days}d
                        </span>
                      </div>
                      <span
                        className={`text-[11px] font-semibold px-2 py-1 rounded-md ring-1 ring-inset tabular-nums ${t.pill}`}
                      >
                        Rs {Math.round(perDay).toLocaleString()}/day
                      </span>
                    </div>
                  </div>

                  {/* Specs */}
                  <div className="px-5 py-3 divide-y divide-gray-100 border-t border-gray-100">
                    <SpecRow icon={LayoutTemplate} label="Simple templates">
                      <span className="text-sm font-bold text-gray-900 tabular-nums bg-gray-100 min-w-8 text-center px-2 py-0.5 rounded-md">
                        {plan.max_simple_templates}
                      </span>
                    </SpecRow>
                    <SpecRow icon={Crown} label="Premium templates">
                      <span className="text-sm font-bold text-gray-900 tabular-nums bg-gray-100 min-w-8 text-center px-2 py-0.5 rounded-md">
                        {plan.max_premium_templates}
                      </span>
                    </SpecRow>
                    <SpecRow
                      icon={Link2}
                      label="Custom slugs"
                      on={plan.allows_custom_slug}
                    >
                      {plan.allows_custom_slug ? (
                        <span className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-md">
                          <Check className="w-3 h-3" /> Included
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-gray-400 bg-gray-50 px-2 py-0.5 rounded-md">
                          <Minus className="w-3 h-3" /> No
                        </span>
                      )}
                    </SpecRow>
                  </div>

                  {/* Footer */}
                  <div className="mt-auto flex items-center justify-between gap-3 px-5 py-3.5 bg-gray-50/80 border-t border-gray-100">
                    <div className="min-w-0">
                      <div
                        className={`flex items-center gap-1.5 text-xs font-medium text-gray-600 ${body}`}
                      >
                        {isLocked ? (
                          <Lock className="w-3.5 h-3.5 text-orange-500" />
                        ) : (
                          <Users className="w-3.5 h-3.5 text-gray-400" />
                        )}
                        <span className="tabular-nums">
                          {plan.active_subscribers} subscriber
                          {plan.active_subscribers === 1 ? "" : "s"}
                        </span>
                      </div>
                      <div className="mt-1.5 h-1 w-24 rounded-full bg-gray-200 overflow-hidden">
                        <div
                          className={`h-full rounded-full ${t.meter}`}
                          style={{ width: `${share}%` }}
                        />
                      </div>
                    </div>

                    <div className="flex items-center gap-1.5">
                      <button
                        title="Edit plan"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleOpenModal("edit", plan);
                        }}
                        className="p-2 rounded-lg bg-white border border-gray-200 text-gray-500 hover:text-gray-900 hover:border-gray-300 shadow-sm transition-colors cursor-pointer"
                      >
                        <Pencil className="w-3.5 h-3.5" />
                      </button>
                      <button
                        title="Delete plan"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleOpenModal("delete", plan);
                        }}
                        className={`p-2 rounded-lg bg-white border border-gray-200 shadow-sm transition-colors cursor-pointer ${
                          isLocked
                            ? "text-gray-300 hover:border-gray-300"
                            : "text-gray-500 hover:text-red-600 hover:border-red-200 hover:bg-red-50"
                        }`}
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                </motion.div>
              );
            })}
          </div>
        )}
      </div>

      {/* Pagination */}
      {!isLoading && meta.total_pages > 1 && (
        <div className="flex flex-col sm:flex-row gap-3 items-center justify-between pt-6">
          <p className={`text-sm text-gray-500 tabular-nums ${body}`}>
            Showing{" "}
            <span className="font-semibold text-gray-900">
              {(meta.page - 1) * meta.limit + 1}
            </span>
            –
            <span className="font-semibold text-gray-900">
              {Math.min(meta.page * meta.limit, meta.total)}
            </span>{" "}
            of <span className="font-semibold text-gray-900">{meta.total}</span>{" "}
            plans
          </p>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={meta.page === 1}
              className="p-2 rounded-lg border border-gray-200 bg-white text-gray-600 hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors cursor-pointer"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <span
              className={`text-sm text-gray-600 px-2 tabular-nums ${body}`}
            >
              Page {meta.page} of {meta.total_pages}
            </span>
            <button
              onClick={() => setPage((p) => Math.min(meta.total_pages, p + 1))}
              disabled={meta.page === meta.total_pages}
              className="p-2 rounded-lg border border-gray-200 bg-white text-gray-600 hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors cursor-pointer"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      <AnimatePresence mode="wait">
        {isGuideOpen ? (
          <PlanGuideModal
            key="guide-modal"
            onClose={() => setIsGuideOpen(false)}
            onCreatePlan={() => {
              setIsGuideOpen(false);
              setModalMode("create");
              setSelectedPlan(null);
              setIsModalOpen(true);
            }}
          />
        ) : isModalOpen ? (
          <PlanModal
            key="plan-modal"
            mode={modalMode}
            plan={selectedPlan}
            onClose={() => setIsModalOpen(false)}
            onSuccess={() => {
              setIsModalOpen(false);
              fetchPlans();
            }}
            onOpenGuide={() => {
              setIsModalOpen(false);
              setIsGuideOpen(true);
            }}
          />
        ) : null}
      </AnimatePresence>
    </div>
  );
}