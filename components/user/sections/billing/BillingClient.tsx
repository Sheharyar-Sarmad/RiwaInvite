"use client";

import * as React from "react";
import useSWR from "swr";
import { MotionConfig, motion } from "framer-motion";

import {
  EASE,
  EmptyState,
  ErrorCard,
  Surface,
  cn,
  fetcher,
} from "@/components/user/sections/dashboard/ui/DashboardUI";
import type { BillingPayload, PlansPayload } from "@/lib/types/billing";

import {
  ART,
  BILLING_ROUTES,
  BillingHeader,
  BrowseLink,
  CurrentPlanCard,
  CurrentPlanSkeleton,
  ExpiryNotice,
  FilteredEmpty,
  GRID_CLASS,
  IcCrown,
  IcWallet,
  IcTrend,
  NoPlanCard,
  OrdersSkeleton,
  OrdersTable,
  PlanCard,
  PlansGridSkeleton,
  PlansNotice,
  ReceiptsToolbar,
  RefreshButton,
  SectionHeading,
  SinglePurchasesGrid,
  SinglePurchasesSkeleton,
  SinglySummary,
  SpendSplit,
  SpendStrip,
  SpendStripSkeleton,
  StaleNotice,
  pctOf,
  plural,
  type ReceiptFilter,
  type SpendStat,
} from "./ui/BillingUI";

/* ========================================================================== */
/*  Config                                                                    */
/* ========================================================================== */

export type BillingUser = {
  id: string;
  email: string;
  first_name: string;
  last_name: string;
  phone_number: string;
  created_at?: string;
};

const BILLING_KEY = "/user/dashboard/billing";
const PLANS_KEY = "/user/dashboard/plans";

/**
 * Revalidate on focus so a purchase made in another tab (or a checkout that
 * just finished) shows up when the user comes back. Short dedupe keeps it cheap.
 */
const SWR_OPTIONS = { revalidateOnFocus: true, dedupingInterval: 5000 } as const;

/** Staggered section entrance. Honors reduced motion via MotionConfig. */
function Reveal({
  index,
  className,
  labelledBy,
  children,
}: {
  index: number;
  className?: string;
  labelledBy?: string;
  children: React.ReactNode;
}) {
  return (
    <motion.section
      aria-labelledby={labelledBy}
      initial={{ opacity: 0, y: 14 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.45, delay: index * 0.07, ease: EASE }}
      className={className}
    >
      {children}
    </motion.section>
  );
}

// `user` stays in the props so page.tsx works unchanged.
export function BillingClient(_props: { user: BillingUser }) {
  const {
    data: b,
    error: billingError,
    isValidating: billingBusy,
    mutate: mutateBilling,
  } = useSWR<BillingPayload>(BILLING_KEY, fetcher, SWR_OPTIONS);
  const {
    data: p,
    error: plansError,
    isValidating: plansBusy,
    mutate: mutatePlans,
  } = useSWR<PlansPayload>(PLANS_KEY, fetcher, SWR_OPTIONS);

  const plansRef = React.useRef<HTMLDivElement>(null);
  const [filter, setFilter] = React.useState<ReceiptFilter>("all");

  const scrollToPlans = React.useCallback(() => {
    plansRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  }, []);

  const refresh = React.useCallback(() => {
    void mutateBilling();
    void mutatePlans();
  }, [mutateBilling, mutatePlans]);

  const retryBilling = React.useCallback(() => void mutateBilling(), [mutateBilling]);
  const retryPlans = React.useCallback(() => void mutatePlans(), [mutatePlans]);

  /* ------------------------------ derived data ------------------------------ */

  const spendStats: SpendStat[] = React.useMemo(() => {
    if (!b) return [];
    const total = b.lifetimeSpend;
    const subShare = pctOf(b.subscriptionSpend, total);
    const singleShare = pctOf(b.singleSpend, total);
    return [
      {
        label: "Lifetime spend",
        icon: IcWallet,
        iconClass: "text-orange-500",
        amount: b.lifetimeSpend,
        hint: total > 0 ? "Plans and templates you paid for" : "No payments yet",
      },
      {
        label: "Subscriptions",
        icon: IcTrend,
        iconClass: "text-emerald-500",
        amount: b.subscriptionSpend,
        hint: b.subscriptionSpend > 0 ? `${subShare}% of lifetime spend` : "No plan payments yet",
        share: subShare,
      },
      {
        label: "Purchased singly",
        icon: IcCrown,
        iconClass: "text-amber-500",
        amount: b.singleSpend,
        hint: b.singleSpend > 0 ? `${singleShare}% of lifetime spend` : "No template purchases yet",
        share: singleShare,
      },
    ];
  }, [b]);

  const sp = b?.singlePurchases;
  const customSlugs = sp?.customSlugs ?? 0;

  const receiptCounts = React.useMemo<Record<ReceiptFilter, number>>(() => {
    const orders = b?.recentOrders ?? [];
    return {
      all: orders.length,
      plan: orders.filter((o) => String(o.order_type) === "plan").length,
      template: orders.filter((o) => String(o.order_type) === "template").length,
    };
  }, [b]);

  const visibleOrders = React.useMemo(() => {
    const orders = b?.recentOrders ?? [];
    return filter === "all" ? orders : orders.filter((o) => String(o.order_type) === filter);
  }, [b, filter]);

  const subtitle = b?.activeSubscription
    ? `${b.activeSubscription.plan_name} is active. Track usage, plans and payments.`
    : "Your plan, purchases and payment history in one place.";

  const active = b?.activeSubscription ?? null;
  const refreshing = billingBusy || plansBusy;
  const showStale = Boolean((billingError && b) || (plansError && p));

  /* --------------------------------- render --------------------------------- */

  return (
    <MotionConfig reducedMotion="user">
      <div className="w-full space-y-6 sm:space-y-10">
        <BillingHeader
          title={
            <>
              Billing <span className="text-orange-600">&amp; Plan</span>
            </>
          }
          subtitle={subtitle}
          actions={
            <>
              <RefreshButton onClick={refresh} busy={refreshing} />
              <BrowseLink href={BILLING_ROUTES.browse}>Browse templates</BrowseLink>
            </>
          }
        />

        {showStale && <StaleNotice onRetry={refresh} />}

        {/* ------------------------------ current plan ----------------------------- */}
        <Reveal index={1} labelledBy="sec-current">
          <SectionHeading id="sec-current" title="Your plan" hint="What you can create right now." />
          <div className="space-y-3">
            {billingError && !b ? (
              <ErrorCard onRetry={retryBilling} />
            ) : !b ? (
              <CurrentPlanSkeleton />
            ) : active ? (
              <>
                <CurrentPlanCard sub={active} />
                {active.daysRemaining <= 7 && (
                  <ExpiryNotice days={active.daysRemaining} expiresAt={active.expires_at} />
                )}
              </>
            ) : (
              <NoPlanCard
                lastPlanName={b.lastSubscription?.plan_name}
                lastExpiresAt={b.lastSubscription?.expires_at}
                onViewPlans={scrollToPlans}
              />
            )}
          </div>
        </Reveal>

        {/* ------------------------------ popular plans ---------------------------- */}
        <Reveal index={2} labelledBy="sec-plans">
          {/* div, not section: Reveal is already the labelled section landmark */}
          <div ref={plansRef} className="scroll-mt-20">
            <SectionHeading
              id="sec-plans"
              title="Popular plans"
              hint="The 3 plans members buy most. One subscription at a time, and every plan renews by purchase."
            />
            <div className="space-y-3">
              {plansError && !p ? (
                <ErrorCard onRetry={retryPlans} />
              ) : !p ? (
                <PlansGridSkeleton />
              ) : p.plans.length === 0 ? (
                <Surface pad="p-0">
                  <EmptyState
                    art={ART.empty}
                    title="No plans available yet"
                    hint="Plans will show up here as soon as they are published."
                  />
                </Surface>
              ) : (
                <>
                  <PlansNotice context={p.context} />
                  <ul className={GRID_CLASS}>
                    {p.plans.map((plan, i) => (
                      <PlanCard key={plan.id} plan={plan} index={i} context={p.context} />
                    ))}
                  </ul>
                </>
              )}
            </div>
          </div>
        </Reveal>

        {/* ------------------------------- purchased singly ------------------------ */}
        <Reveal index={3} labelledBy="sec-single" className="space-y-3 sm:space-y-4">
          <SectionHeading
            id="sec-single"
            title="Purchased singly"
            hint="Templates you bought one at a time. They never expire and don’t use plan allowance."
            aside={
              b && sp && sp.total > 0 ? (
                <BrowseLink href={BILLING_ROUTES.library}>View full library</BrowseLink>
              ) : undefined
            }
          />
          {billingError && !b ? (
            <ErrorCard onRetry={retryBilling} />
          ) : !b || !sp ? (
            <>
              <div className="flex flex-wrap gap-2" aria-hidden>
                {[0, 1, 2, 3].map((i) => (
                  <div key={i} className="h-10 w-28 animate-pulse rounded-xl bg-black/[0.06]" />
                ))}
              </div>
              <SinglePurchasesSkeleton />
            </>
          ) : sp.total === 0 ? (
            <Surface pad="p-0">
              <EmptyState
                art={ART.noOrders}
                title="No single purchases yet"
                hint="Buy a template on its own and it will appear here, ready for every invitation."
                actionLabel="Browse templates"
                href={BILLING_ROUTES.browse}
              />
            </Surface>
          ) : (
            <>
              <SinglySummary total={sp.total} premium={sp.premium} free={sp.free} customSlugs={customSlugs} />
              <SinglePurchasesGrid items={sp.items} />
              {sp.total > sp.items.length && (
                <p className="text-xs font-medium text-stone-500">
                  Showing your latest {sp.items.length} of {sp.total}. The rest are in your library.
                </p>
              )}
            </>
          )}
        </Reveal>

        {/* ---------------------------------- spend -------------------------------- */}
        <Reveal index={4} labelledBy="sec-spend">
          <SectionHeading id="sec-spend" title="Spend" hint="Subscriptions and single purchases are tracked separately." />
          {billingError && !b ? (
            <ErrorCard onRetry={retryBilling} />
          ) : !b ? (
            <SpendStripSkeleton />
          ) : (
            <>
              <SpendStrip stats={spendStats} />
              <SpendSplit subscription={b.subscriptionSpend} single={b.singleSpend} />
            </>
          )}
        </Reveal>

        {/* --------------------------------- receipts ------------------------------ */}
        <Reveal index={5} labelledBy="sec-receipts" className="space-y-3 sm:space-y-4">
          <SectionHeading
            id="sec-receipts"
            title="Receipts"
            hint={
              b
                ? `${plural(b.receiptsTotal, "receipt")}${
                    b.receiptsTotal > b.recentOrders.length ? ` · latest ${b.recentOrders.length} shown` : ""
                  }`
                : undefined
            }
            aside={
              b && b.recentOrders.length > 0 ? (
                <div className="hidden sm:block">
                  <ReceiptsToolbar value={filter} onChange={setFilter} counts={receiptCounts} />
                </div>
              ) : undefined
            }
          />
          {b && b.recentOrders.length > 0 && (
            <div className="sm:hidden">
              <ReceiptsToolbar value={filter} onChange={setFilter} counts={receiptCounts} />
            </div>
          )}
          {billingError && !b ? (
            <ErrorCard onRetry={retryBilling} />
          ) : !b ? (
            <OrdersSkeleton />
          ) : b.recentOrders.length === 0 ? (
            <Surface pad="p-0">
              <EmptyState
                art={ART.noOrders}
                title="No receipts yet"
                hint="Payments for plans and templates will be listed here."
              />
            </Surface>
          ) : visibleOrders.length === 0 ? (
            <FilteredEmpty filter={filter} onReset={() => setFilter("all")} />
          ) : (
            <OrdersTable orders={visibleOrders} />
          )}
          <p className={cn("sr-only")} aria-live="polite">
            {b ? `${plural(visibleOrders.length, "receipt")} shown` : ""}
          </p>
        </Reveal>
      </div>
    </MotionConfig>
  );
}