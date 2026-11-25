"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { motion, useReducedMotion } from "framer-motion";
import { ArrowUpRight, ShieldCheck } from "lucide-react";
import { apiClient } from "@/lib/api/api_base";
import { cn } from "@/lib/utils";
import {
  EASE,
  PLANS_HREF,
  PlanModal,
  PlanTicket,
  PlansError,
  TicketSkeletonGrid,
  focusRing,
  listVariants,
  normalizePlans,
  type PlanData,
} from "./PlanUI";

const POPULAR_INDEX = 1;

export type { PlanData };

export function PricingPreview() {
  const reduce = useReducedMotion() ?? false;
  const [plans, setPlans] = useState<PlanData[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [attempt, setAttempt] = useState(0);
  const [selected, setSelected] = useState<PlanData | null>(null);

  const closeModal = useCallback(() => setSelected(null), []);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(false);
    (async () => {
      try {
        const res = await apiClient.get("/public/plans");
        if (cancelled) return;
        if (res.data?.status === "success") setPlans(normalizePlans(res.data.data?.plans));
        else setError(true);
      } catch (e) {
        console.error("Failed to load plans", e);
        if (!cancelled) setError(true);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [attempt]);

  // nothing to sell yet: hide the whole section rather than show an empty one
  if (!loading && !error && plans.length === 0) return null;

  return (
    <>
      <section id="pricing" aria-labelledby="pricing-heading" className="w-full bg-[#fdeadb] py-24 sm:py-32">
        <div className="mx-auto w-full max-w-7xl px-4 sm:px-6 lg:px-12">
          {/* Header */}
          <motion.div
            initial={reduce ? false : { opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "-80px" }}
            transition={{ duration: 0.7, ease: EASE }}
            className="mx-auto mb-16 max-w-3xl text-center"
          >
            <p className="mb-4 text-xs font-semibold uppercase tracking-[0.3em] text-stone-600">Pricing</p>
            <h2
              id="pricing-heading"
              className="font-[family-name:var(--font-display)] text-4xl font-bold leading-[1.1] tracking-tight text-[#1c1410] sm:text-5xl lg:text-6xl"
            >
              Invest in the perfect impression
            </h2>
            <p className="mx-auto mt-5 max-w-2xl font-[family-name:var(--font-body)] text-base leading-relaxed text-stone-600 sm:text-lg">
              Transparent pricing with no hidden fees. Choose the plan that fits your event size.
            </p>
          </motion.div>

          {/* Cards */}
          {loading ? (
            <TicketSkeletonGrid />
          ) : error ? (
            <PlansError onRetry={() => setAttempt((n) => n + 1)} />
          ) : (
            <>
              <motion.ul
                variants={listVariants}
                initial={reduce ? "show" : "hidden"}
                whileInView="show"
                viewport={{ once: true, margin: "-50px" }}
                className="grid grid-cols-1 items-stretch gap-6 md:grid-cols-3 lg:gap-8"
              >
                {plans.map((plan, i) => (
                  <PlanTicket
                    key={plan.id}
                    plan={plan}
                    badge={i === POPULAR_INDEX ? "popular" : null}
                    onSelect={() => setSelected(plan)}
                  />
                ))}
              </motion.ul>

              <div className="mt-14 flex flex-col items-center gap-5">
                <Link
                  href={PLANS_HREF}
                  className={cn(
                    "group inline-flex items-center gap-2 rounded-xl border border-[#1c1410]/25 bg-white/60 px-6 py-3 text-sm font-bold text-[#1c1410] transition-colors hover:bg-white",
                    focusRing,
                  )}
                >
                  Compare every plan
                  <ArrowUpRight className="size-4 transition-transform duration-300 group-hover:rotate-45" />
                </Link>
                <p className="flex items-center justify-center gap-2 text-sm font-medium text-stone-600">
                  <ShieldCheck className="size-4 text-emerald-600" />
                  Secure checkout. All purchases are final. No refunds.
                </p>
              </div>
            </>
          )}
        </div>
      </section>

      <PlanModal plan={selected} onClose={closeModal} />
    </>
  );
}