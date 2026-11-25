"use client";

import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import Link from "next/link";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import {
  Check,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Minus,
  Search,
  ShieldCheck,
  X,
} from "lucide-react";
import { apiClient } from "@/lib/api/api_base";
import { cn } from "@/lib/utils";
import {
  CARD_BG,
  EASE,
  PlanModal,
  PlanTicket,
  PlansError,
  TEMPLATES_HREF,
  TemplatesStrip,
  TicketSkeletonGrid,
  durationLabel,
  focusRing,
  listVariants,
  money,
  normalizePlans,
  perTemplate,
  type PlanBadge,
  type PlanData,
} from "./PlanUI";
import { ShellBackground } from "@/components/ui/ShellBackground";

const PAGE_SIZE = 6;

const SORTS = [
  { value: "price_asc", label: "Lowest price" },
  { value: "price_desc", label: "Highest price" },
  { value: "newest", label: "Newest" },
] as const;
type Sort = (typeof SORTS)[number]["value"];

/* ========================================================================== */
/*  Compare table                                                             */
/* ========================================================================== */

function Mark({ on }: { on: boolean }) {
  return on ? (
    <span className="inline-flex size-6 items-center justify-center rounded-full bg-[#1c1410] text-white">
      <Check className="size-3.5" strokeWidth={3} />
      <span className="sr-only">Included</span>
    </span>
  ) : (
    <span className="inline-flex size-6 items-center justify-center rounded-full border-[1.5px] border-dashed border-stone-300 text-stone-300">
      <Minus className="size-3" strokeWidth={3} />
      <span className="sr-only">Not included</span>
    </span>
  );
}

function CompareTable({
  plans,
  bestId,
}: {
  plans: PlanData[];
  bestId: string | undefined;
}) {
  const rows: { label: string; cell: (p: PlanData) => ReactNode }[] = [
    {
      label: "Price",
      cell: (p) => (
        <b className="text-[#1c1410]">
          {p.price > 0 ? money(p.price) : "Free"}
        </b>
      ),
    },
    { label: "Valid for", cell: (p) => durationLabel(p.durationDays) },
    { label: "Standard templates", cell: (p) => p.maxSimpleTemplates },
    { label: "Premium templates", cell: (p) => p.maxPremiumTemplates },
    {
      label: "Cost per template",
      cell: (p) => (perTemplate(p) ? money(perTemplate(p)) : "n/a"),
    },
    { label: "Real-time RSVP tracking", cell: () => <Mark on /> },
    { label: "Custom URL slug", cell: (p) => <Mark on={p.allowsCustomSlug} /> },
    { label: "24/7 WhatsApp support", cell: () => <Mark on /> },
    { label: "AI Design Studio", cell: () => <Mark on /> },
  ];

  return (
    <div
      className={cn(
        "overflow-x-auto rounded-2xl border border-black/[0.07]",
        CARD_BG,
      )}
      data-lenis-prevent
    >
      <table className="w-full min-w-[560px] border-collapse text-left text-sm">
        <caption className="sr-only">Plan comparison</caption>
        <thead>
          <tr className="border-b border-dashed border-[#1c1410]/25">
            <th
              scope="col"
              className="sticky left-0 z-10 bg-[#fff8f1] p-4 text-xs font-semibold uppercase tracking-[0.12em] text-stone-500"
            >
              Compare
            </th>
            {plans.map((p) => (
              <th
                key={p.id}
                scope="col"
                className="p-4 text-center font-[family-name:var(--font-display)] text-base font-bold text-[#1c1410]"
              >
                {p.name}
                {p.id === bestId && (
                  <span className="ml-2 rounded border border-[#1c1410]/20 px-1.5 align-middle text-[10px] font-semibold uppercase leading-4 tracking-[0.1em] text-[#1c1410]/80">
                    Best value
                  </span>
                )}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr
              key={row.label}
              className="border-b border-black/[0.06] last:border-0 hover:bg-[#1c1410]/[0.025]"
            >
              <th
                scope="row"
                className="sticky left-0 z-10 bg-[#fff8f1] p-4 font-medium text-stone-600"
              >
                {row.label}
              </th>
              {plans.map((p) => (
                <td
                  key={p.id}
                  className="p-4 text-center tabular-nums text-stone-700"
                >
                  {row.cell(p)}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

/* ========================================================================== */
/*  FAQ                                                                       */
/* ========================================================================== */

const FAQ: { q: string; a: ReactNode }[] = [
  {
    q: "Can I buy just one template?",
    a: (
      <>
        Yes. If you only need a single design, go to{" "}
        <Link
          href={TEMPLATES_HREF}
          className="font-semibold text-[#1c1410] underline underline-offset-4"
        >
          Templates
        </Link>{" "}
        and buy it on its own. Plans are best when you want several templates,
        RSVP tracking and support.
      </>
    ),
  },
  {
    q: "What do I get with a plan?",
    a: "A set number of standard and premium templates, real-time RSVP tracking, 24/7 WhatsApp support and, on some plans, a custom URL slug. Use the comparison above to see every plan side by side.",
  },
  {
    q: "How long does my plan last?",
    a: "Each plan shows its length next to the price, for example “per month” or “per year”. Pick the one that matches your event schedule.",
  },
  {
    q: "Can I get a refund?",
    a: "No. All purchases are final, so check the plan details on the checkout screen before you pay.",
  },
];

function FaqItem({
  q,
  a,
  defaultOpen,
  reduce,
}: {
  q: string;
  a: ReactNode;
  defaultOpen: boolean;
  reduce: boolean;
}) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <li
      className={cn(
        "rounded-2xl border bg-white/60 transition-colors",
        open ? "border-[#1c1410]/30" : "border-black/[0.07]",
      )}
    >
      <button
        type="button"
        aria-expanded={open}
        onClick={() => setOpen((o) => !o)}
        className={cn(
          "flex w-full items-center justify-between gap-4 rounded-2xl px-5 py-4 text-left font-[family-name:var(--font-display)] text-base font-semibold text-[#1c1410]",
          focusRing,
        )}
      >
        {q}
        <ChevronDown
          className={cn(
            "size-5 shrink-0 text-stone-500 transition-transform duration-300",
            open && "rotate-180",
          )}
        />
      </button>
      <AnimatePresence initial={false}>
        {open && (
          <motion.div
            initial={reduce ? false : { height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={reduce ? undefined : { height: 0, opacity: 0 }}
            transition={{ duration: 0.3, ease: EASE }}
            className="overflow-hidden"
          >
            <div className="px-5 pb-5 text-sm leading-relaxed text-stone-600">
              {a}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </li>
  );
}

/* ========================================================================== */
/*  Page                                                                      */
/* ========================================================================== */

export function PlansClient() {
  const reduce = useReducedMotion() ?? false;

  const [plans, setPlans] = useState<PlanData[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [attempt, setAttempt] = useState(0);

  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState<number | null>(null);
  const [searchInput, setSearchInput] = useState("");
  const [search, setSearch] = useState("");
  const [sort, setSort] = useState<Sort>("price_asc");

  const [selected, setSelected] = useState<PlanData | null>(null);
  const [showCompare, setShowCompare] = useState(false);

  const listTop = useRef<HTMLDivElement>(null);
  const searchRef = useRef<HTMLInputElement>(null);

  const closeModal = useCallback(() => setSelected(null), []);

  // wait for the person to stop typing before asking the server
  useEffect(() => {
    const t = window.setTimeout(() => {
      setSearch(searchInput.trim());
      setPage(1);
    }, 350);
    return () => window.clearTimeout(t);
  }, [searchInput]);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(false);
    (async () => {
      try {
        const qs = new URLSearchParams({
          page: String(page),
          limit: String(PAGE_SIZE),
          sort,
        });
        if (search) qs.set("search", search);
        const res = await apiClient.get(`/public/plans/all?${qs.toString()}`);
        if (cancelled) return;
        if (res.data?.status === "success") {
          const d = res.data.data ?? {};
          setPlans(normalizePlans(d.plans));
          setTotalPages(Math.max(1, Number(d.pagination?.totalPages) || 1));
          setTotal(
            typeof d.pagination?.total === "number" ? d.pagination.total : null,
          );
        } else setError(true);
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
  }, [page, search, sort, attempt]);

  const goToPage = (n: number) => {
    setPage(n);
    listTop.current?.scrollIntoView({
      behavior: reduce ? "auto" : "smooth",
      block: "start",
    });
  };

  const clearSearch = () => {
    setSearchInput("");
    setSearch("");
    setPage(1);
    searchRef.current?.focus();
  };

  // lowest cost per template, only meaningful when there is something to compare against
  const bestId = useMemo(() => {
    const priced = plans.filter((p) => perTemplate(p) > 0);
    if (priced.length < 2) return undefined;
    return priced.reduce((a, b) => (perTemplate(b) < perTemplate(a) ? b : a))
      .id;
  }, [plans]);

  const firstLoad = loading && plans.length === 0 && !error;
  const refreshing = loading && plans.length > 0;

  return (
    <>
      <div className="relative isolate w-full pb-24 pt-28 sm:pb-32 sm:pt-32">
        <ShellBackground />
        <div className="mx-auto w-full max-w-7xl px-4 sm:px-6 lg:px-12">
          {/* Header */}
          <motion.header
            initial={reduce ? false : { opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, ease: EASE }}
            className="mx-auto max-w-3xl text-center"
          >
            <p className="mb-4 text-xs font-semibold uppercase tracking-[0.3em] text-stone-600">
              Pricing
            </p>
            <h1 className="font-[family-name:var(--font-display)] text-4xl font-bold leading-[1.1] tracking-tight text-[#1c1410] sm:text-5xl lg:text-6xl">
              Choose the plan that fits your celebration
            </h1>
            <p className="mx-auto mt-5 max-w-2xl font-[family-name:var(--font-body)] text-base leading-relaxed text-stone-600 sm:text-lg">
              Transparent pricing with no hidden fees. Compare plans, then pick
              the one that matches your event size.
            </p>
            <ul className="mt-7 flex flex-wrap items-center justify-center gap-x-6 gap-y-2 text-sm font-medium text-stone-700">
              {[
                "Secure checkout",
                "Real-time RSVP tracking",
                "24/7 WhatsApp support",
              ].map((t) => (
                <li key={t} className="flex items-center gap-2">
                  <Check className="size-4 text-[#1c1410]" strokeWidth={3} />
                  {t}
                </li>
              ))}
            </ul>
          </motion.header>

          {/* Toolbar */}
          <div
            ref={listTop}
            className="mt-14 flex scroll-mt-24 flex-col gap-3 lg:flex-row lg:items-center lg:justify-between"
          >
            <div className="relative lg:w-[26rem]">
              <Search
                aria-hidden
                className="pointer-events-none absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-stone-400"
              />
              {/* type="text" so the browser doesn't add a second clear button */}
              <input
                ref={searchRef}
                type="text"
                inputMode="search"
                autoComplete="off"
                aria-label="Search plans"
                placeholder="Search plans by name"
                value={searchInput}
                onChange={(e) => setSearchInput(e.target.value)}
                className="h-11 w-full rounded-xl border border-black/[0.1] bg-white/80 pl-10 pr-10 text-sm text-[#1c1410] outline-none transition placeholder:text-stone-400 hover:border-[#1c1410]/30 focus:border-[#1c1410] focus-visible:ring-2 focus-visible:ring-[#1c1410]/20"
              />
              {searchInput && (
                <button
                  type="button"
                  onClick={clearSearch}
                  aria-label="Clear search"
                  className={cn(
                    "absolute right-2 top-1/2 flex size-7 -translate-y-1/2 items-center justify-center rounded-full text-stone-500 hover:bg-[#1c1410]/[0.07]",
                    focusRing,
                  )}
                >
                  <X className="size-4" />
                </button>
              )}
            </div>

            <div className="flex flex-wrap items-center gap-3">
              <p className="text-sm text-stone-600" aria-live="polite">
                {!loading && total !== null
                  ? `${total} ${total === 1 ? "plan" : "plans"}`
                  : ""}
              </p>
              <div
                role="radiogroup"
                aria-label="Sort plans"
                className="inline-flex rounded-xl border border-black/[0.08] bg-white/70 p-1"
              >
                {SORTS.map((s) => (
                  <button
                    key={s.value}
                    type="button"
                    role="radio"
                    aria-checked={sort === s.value}
                    onClick={() => {
                      setSort(s.value);
                      setPage(1);
                    }}
                    className={cn(
                      "h-9 rounded-lg px-3.5 text-sm font-semibold transition-colors",
                      focusRing,
                      sort === s.value
                        ? "bg-[#1c1410] text-white"
                        : "text-stone-600 hover:text-[#1c1410]",
                    )}
                  >
                    {s.label}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Plans */}
          <div className="mt-8" aria-busy={loading}>
            {firstLoad ? (
              <TicketSkeletonGrid count={3} />
            ) : error ? (
              <PlansError onRetry={() => setAttempt((n) => n + 1)} />
            ) : plans.length === 0 ? (
              <div
                className={cn(
                  "mx-auto flex max-w-md flex-col items-center gap-3 rounded-2xl border border-black/[0.07] p-10 text-center",
                  CARD_BG,
                )}
              >
                <Search className="size-8 text-stone-400" />
                <p className="text-sm text-stone-600">
                  {search ? (
                    <>No plans match &ldquo;{search}&rdquo;.</>
                  ) : (
                    "No plans are available right now."
                  )}
                </p>
                {search && (
                  <button
                    type="button"
                    onClick={clearSearch}
                    className={cn(
                      "rounded text-sm font-semibold text-[#1c1410] underline underline-offset-4",
                      focusRing,
                    )}
                  >
                    Clear search
                  </button>
                )}
              </div>
            ) : (
              <motion.ul
                key={`${page}|${search}|${sort}`}
                variants={listVariants}
                initial={reduce ? "show" : "hidden"}
                animate="show"
                className={cn(
                  "grid grid-cols-1 items-stretch gap-6 transition-opacity duration-200 md:grid-cols-2 lg:grid-cols-3 lg:gap-8",
                  refreshing && "opacity-60",
                )}
              >
                {plans.map((plan) => (
                  <PlanTicket
                    key={plan.id}
                    plan={plan}
                    badge={(plan.id === bestId ? "best" : null) as PlanBadge}
                    onSelect={() => setSelected(plan)}
                  />
                ))}
              </motion.ul>
            )}
          </div>

          {/* Pager */}
          {!error && totalPages > 1 && (
            <nav
              aria-label="Plans pages"
              className="mt-10 flex items-center justify-center gap-4"
            >
              <button
                type="button"
                onClick={() => goToPage(Math.max(1, page - 1))}
                disabled={page === 1}
                aria-label="Previous page"
                className={cn(
                  "flex size-10 items-center justify-center rounded-xl border border-black/[0.1] bg-white/70 text-[#1c1410] transition-colors hover:bg-white disabled:cursor-not-allowed disabled:opacity-40",
                  focusRing,
                )}
              >
                <ChevronLeft className="size-4" />
              </button>
              <p className="text-sm font-medium text-stone-600">
                Page {page} of {totalPages}
              </p>
              <button
                type="button"
                onClick={() => goToPage(Math.min(totalPages, page + 1))}
                disabled={page === totalPages}
                aria-label="Next page"
                className={cn(
                  "flex size-10 items-center justify-center rounded-xl border border-black/[0.1] bg-white/70 text-[#1c1410] transition-colors hover:bg-white disabled:cursor-not-allowed disabled:opacity-40",
                  focusRing,
                )}
              >
                <ChevronRight className="size-4" />
              </button>
            </nav>
          )}

          {/* Compare */}
          {!error && plans.length > 1 && (
            <div className="mt-12">
              <div className="flex justify-center">
                <button
                  type="button"
                  onClick={() => setShowCompare((v) => !v)}
                  aria-expanded={showCompare}
                  aria-controls="plan-compare"
                  className={cn(
                    "inline-flex items-center gap-2 rounded-xl border border-[#1c1410]/25 bg-white/60 px-6 py-3 text-sm font-bold text-[#1c1410] transition-colors hover:bg-white",
                    focusRing,
                  )}
                >
                  {showCompare
                    ? "Hide comparison"
                    : "Compare these plans side by side"}
                  <ChevronDown
                    className={cn(
                      "size-4 transition-transform duration-300",
                      showCompare && "rotate-180",
                    )}
                  />
                </button>
              </div>
              <AnimatePresence initial={false}>
                {showCompare && (
                  <motion.div
                    id="plan-compare"
                    initial={reduce ? false : { height: 0, opacity: 0 }}
                    animate={{ height: "auto", opacity: 1 }}
                    exit={reduce ? undefined : { height: 0, opacity: 0 }}
                    transition={{ duration: 0.4, ease: EASE }}
                    className="overflow-hidden"
                  >
                    <div className="pt-8">
                      <CompareTable plans={plans} bestId={bestId} />
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          )}

          {/* Single template */}
          <div className="mx-auto mt-16 max-w-4xl">
            <TemplatesStrip />
          </div>

          {/* FAQ */}
          <section
            aria-labelledby="faq-heading"
            className="mx-auto mt-20 max-w-3xl"
          >
            <h2
              id="faq-heading"
              className="mb-6 text-center font-[family-name:var(--font-display)] text-2xl font-bold text-[#1c1410] sm:text-3xl"
            >
              Questions before you buy?
            </h2>
            <ul className="space-y-3">
              {FAQ.map((item, i) => (
                <FaqItem
                  key={item.q}
                  q={item.q}
                  a={item.a}
                  defaultOpen={i === 0}
                  reduce={reduce}
                />
              ))}
            </ul>
            <p className="mt-6 text-center text-sm text-stone-600">
              Still unsure? Message us on WhatsApp any time. We&apos;re here
              24/7.
            </p>
          </section>

          <p className="mt-12 flex items-center justify-center gap-2 text-sm font-medium text-stone-600">
            <ShieldCheck className="size-4 text-emerald-600" />
            Secure checkout. All purchases are final. No refunds.
          </p>
        </div>
      </div>

      <PlanModal plan={selected} onClose={closeModal} />
    </>
  );
}

export default PlansClient;
