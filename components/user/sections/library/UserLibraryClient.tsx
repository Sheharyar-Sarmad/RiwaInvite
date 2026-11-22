"use client";

import * as React from "react";
import Link from "next/link";
import useSWR from "swr";
import { MotionConfig } from "framer-motion";
import { FOCUS } from "@/components/user/navigation/UserSidebar";
import {
  BTN,
  EmptyState,
  ErrorCard,
  HEADING,
  Skeleton,
  Surface,
  Tip,
  cn,
  fetcher,
} from "@/components/user/sections/dashboard/ui/DashboardUI";

import {
  ActiveFilters,
  GridSkeleton,
  IcArrowUpRight,
  IcCrown,
  IcEnvelope,
  IcLibrary,
  IcLink,
  IcPlus,
  LIBRARY_ROUTES,
  Pagination,
  SURFACE,
  SearchField,
  SegmentOption,
  Segmented,
  SelectField,
  TemplateGrid,
  TemplateSheet,
  useDebouncedValue,
} from "./ui/LibraryUI";
import {
  LIBRARY_PAGE_SIZES,
  type LibraryItem,
  type LibraryPageSize,
  type LibraryPayload,
  type LibrarySort,
  type LibrarySummary,
  type LibraryUsageFilter,
} from "@/lib/types/library";

/** Files in /public */
const ART = {
  builder: "/why-builder.png",
  slugs: "/why-slugs.png",
  banner: "/home_hero_bg.png",
} as const;

export type LibraryUser = {
  id: string;
  email: string;
  first_name: string;
  last_name: string;
  phone_number: string;
  created_at?: string;
};

type UserLibraryClientProps = {
  user: LibraryUser;
};

type Filters = {
  usage: LibraryUsageFilter;
  sort: LibrarySort;
  limit: LibraryPageSize;
  page: number;
};

const DEFAULTS: Filters = {
  usage: "all",
  sort: "recent",
  limit: 12,
  page: 1,
};

const SORT_OPTIONS: { value: LibrarySort; label: string }[] = [
  { value: "recent", label: "Newest first" },
  { value: "name", label: "Name, A to Z" },
];

// `user` is kept in the props so page.tsx stays unchanged; the hero greeting that used it is gone.
export function UserLibraryClient(_props: UserLibraryClientProps) {
  const [filters, setFilters] = React.useState<Filters>(DEFAULTS);
  const [searchInput, setSearchInput] = React.useState("");
  const [selected, setSelected] = React.useState<LibraryItem | null>(null);
  const gridRef = React.useRef<HTMLDivElement>(null);

  const search = useDebouncedValue(searchInput.trim(), 350);
  const closeSheet = React.useCallback(() => setSelected(null), []);

  const key = React.useMemo(() => {
    const p = new URLSearchParams({
      page: String(filters.page),
      limit: String(filters.limit),
      usage: filters.usage,
      sort: filters.sort,
    });
    if (search) p.set("search", search);
    return `/user/dashboard/library?${p.toString()}`;
  }, [filters, search]);

  const { data, error, mutate, isValidating } = useSWR<LibraryPayload>(
    key,
    fetcher,
    { keepPreviousData: true, revalidateOnFocus: false },
  );

  // A filter change can leave the current page past the end (e.g. after a cache refresh).
  React.useEffect(() => {
    if (!data) return;
    const last = Math.max(1, data.meta.total_pages);
    if (filters.page > last) setFilters((f) => ({ ...f, page: last }));
  }, [data, filters.page]);

  const patch = React.useCallback(
    (next: Partial<Omit<Filters, "page">>) =>
      setFilters((f) => ({ ...f, ...next, page: 1 })),
    [],
  );

  const goToPage = (page: number) => {
    setFilters((f) => ({ ...f, page }));
    requestAnimationFrame(() => {
      const el = gridRef.current;
      if (el && el.getBoundingClientRect().top < 0)
        el.scrollIntoView({ block: "start", behavior: "smooth" });
    });
  };

  const onSearch = (v: string) => {
    setSearchInput(v);
    setFilters((f) => (f.page === 1 ? f : { ...f, page: 1 }));
  };

  const clearAll = () => {
    setSearchInput("");
    setFilters((f) => ({ ...DEFAULTS, sort: f.sort, limit: f.limit }));
  };

  const summary = data?.summary;
  const hasFilters = filters.usage !== "all" || searchInput.trim() !== "";

  const usageOptions: SegmentOption<LibraryUsageFilter>[] = [
    { value: "all", label: "All", count: summary?.total },
    { value: "used", label: "Used", count: summary?.used },
    {
      value: "unused",
      label: "Not used yet",
      count: summary ? summary.total - summary.used : undefined,
    },
  ];

  const chips = [
    filters.usage !== "all" && {
      key: "usage",
      label:
        filters.usage === "used" ? "Used in an invitation" : "Not used yet",
      onRemove: () => patch({ usage: "all" }),
    },
    searchInput.trim() && {
      key: "search",
      label: `“${searchInput.trim()}”`,
      onRemove: () => setSearchInput(""),
    },
  ].filter(Boolean) as { key: string; label: string; onRemove: () => void }[];

  const libraryIsEmpty = !!summary && summary.total === 0;
  const dimmed = isValidating && !!data;

  return (
    <MotionConfig reducedMotion="user">
      <div className="w-full space-y-3 sm:space-y-5">
        <LibraryHeader total={summary?.total} />

        {/* ------------------------------ stats ------------------------------ */}
        {summary ? (
          <StatStrip summary={summary} />
        ) : !error ? (
          <StatStripSkeleton />
        ) : null}

        {/* ----------------------------- toolbar ----------------------------- */}
        {/* No box around it: one calm row on desktop, stacked on mobile.       */}
        {/* z-20 keeps the select dropdowns above the cards below.             */}
        {!libraryIsEmpty && !(error && !data) && (
          <div className="relative z-20 space-y-2.5">
            <div className="flex flex-col gap-2.5 lg:flex-row lg:items-center">
              <SearchField
                value={searchInput}
                onChange={onSearch}
                className="order-1 lg:order-2"
              />
              <Segmented
                label="Filter by usage"
                value={filters.usage}
                options={usageOptions}
                onChange={(v) => patch({ usage: v })}
                className="order-2 lg:order-1 lg:shrink-0"
              />
              <div className="order-3 grid grid-cols-2 gap-2.5 lg:flex">
                <SelectField
                  label="Sort templates"
                  value={filters.sort}
                  options={SORT_OPTIONS}
                  onChange={(v) => patch({ sort: v })}
                  className="lg:w-40"
                />
                <SelectField
                  label="Templates per page"
                  value={filters.limit}
                  options={LIBRARY_PAGE_SIZES.map((n) => ({
                    value: n,
                    label: `${n} per page`,
                  }))}
                  onChange={(v) => patch({ limit: v as LibraryPageSize })}
                  className="lg:w-36"
                />
              </div>
            </div>

            <ActiveFilters chips={chips} onClearAll={clearAll} />
          </div>
        )}

        {/* ------------------------------ results ----------------------------- */}
        <div ref={gridRef} className="scroll-mt-20 space-y-3 sm:space-y-6">
          {error && !data ? (
            <ErrorCard onRetry={() => mutate()} />
          ) : !data ? (
            <GridSkeleton count={filters.limit} />
          ) : libraryIsEmpty ? (
            <Surface pad="p-0">
              <EmptyState
                art={ART.builder}
                title="Your library is empty"
                hint="Templates you buy or get with a plan are saved here, ready for every invitation."
                actionLabel="Browse templates"
                href={LIBRARY_ROUTES.browse}
              />
            </Surface>
          ) : data.items.length === 0 ? (
            <Surface pad="p-0">
              <EmptyState
                art={ART.slugs}
                title="No templates match"
                hint={
                  search
                    ? `Nothing in your library matches “${search}”. Try a shorter word or another category.`
                    : "Nothing fits these filters. Loosen one to see more."
                }
                actionLabel={hasFilters ? "Clear filters" : undefined}
                onAction={clearAll}
              />
            </Surface>
          ) : (
            <>
              <div
                className={cn(
                  "transition-opacity duration-200",
                  dimmed && "pointer-events-none opacity-60",
                )}
                aria-busy={dimmed}
              >
                <TemplateGrid
                  key={`${data.meta.page}-${filters.usage}-${filters.sort}-${search}`}
                  items={data.items}
                  onOpen={setSelected}
                  showBrowseTile={
                    !hasFilters && data.meta.page >= data.meta.total_pages
                  }
                />
              </div>
              <Pagination
                meta={data.meta}
                shown={data.items.length}
                onPage={goToPage}
                busy={dimmed}
              />
            </>
          )}
        </div>
      </div>

      <TemplateSheet item={selected} onClose={closeSheet} />
    </MotionConfig>
  );
}

/* ========================================================================== */
/*  Header                                                                    */
/*  The hero image, softened from the left so the title is always readable,   */
/*  with the two actions grouped on a frosted tray (fixes the orange button   */
/*  disappearing into the orange flowers). Solid ink title, one orange word.  */
/*  Fixed line heights, so the count arriving moves nothing.                  */
/* ========================================================================== */

const SECONDARY_BTN =
  "inline-flex items-center justify-center gap-1.5 rounded-lg bg-neutral-900 px-3 py-1.5 text-[13px] font-semibold text-white shadow-sm ring-1 ring-black/10 transition-colors hover:bg-neutral-800 active:scale-[0.98] sm:px-4 sm:py-2 sm:text-sm";

function LibraryHeader({ total }: { total?: number }) {
  const subtitle =
    total === undefined
      ? "Every template you own, ready to turn into an invitation."
      : total === 0
        ? "Templates you own will appear here."
        : `${total} template${total === 1 ? "" : "s"} you own, ready to turn into an invitation.`;

  return (
    <header
      className={cn(
        "relative overflow-hidden rounded-2xl p-4 sm:rounded-3xl sm:p-7",
        "ring-1 ring-black/[0.06] shadow-[0_1px_2px_rgba(28,20,16,0.04),0_12px_28px_-18px_rgba(28,20,16,0.22)]",
      )}
      style={{
        backgroundImage: `url(${ART.banner})`,
        backgroundSize: "cover",
        backgroundPosition: "70% center",
      }}
    >
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 bg-gradient-to-b from-[#fff8f2]/95 via-[#fff8f2]/70 to-[#fff8f2]/30 sm:bg-gradient-to-r sm:from-[#fff8f2]/95 sm:via-[#fff8f2]/65 sm:to-[#fff8f2]/10"
      />

      <div className="relative z-10 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between sm:gap-6">
        <div className="min-w-0">
          <h1
            className={cn(
              HEADING,
              "break-words text-[26px] leading-8 tracking-[-0.025em] text-[#1c1410] sm:text-4xl sm:leading-10",
            )}
          >
            My <span className="text-orange-600">library</span>
          </h1>
          <p className="mt-1 h-5 max-w-xl truncate text-[13px] font-medium leading-5 text-stone-600 sm:text-sm">
            {subtitle}
          </p>
        </div>

        <div className="flex flex-wrap gap-1.5 rounded-xl bg-white/70 p-1.5 shadow-sm ring-1 ring-white/80 backdrop-blur-md sm:shrink-0">
          <Tip label="See what you've already built" side="bottom">
            <Link
              href={LIBRARY_ROUTES.invitations}
              className={cn(SECONDARY_BTN, FOCUS)}
            >
              My invitations{" "}
              <IcArrowUpRight className="size-3.5 text-amber-300 sm:size-4" />
            </Link>
          </Tip>
          <Tip label="Find more designs" side="bottom">
            <Link
              href={LIBRARY_ROUTES.browse}
              className={cn(
                BTN,
                "rounded-lg px-3 py-1.5 text-[13px] shadow-sm sm:px-4 sm:py-2 sm:text-sm",
                FOCUS,
              )}
            >
              <IcPlus className="size-3.5 sm:size-4" /> Browse templates
            </Link>
          </Tip>
        </div>
      </div>
    </header>
  );
}

/* ========================================================================== */
/*  Stat strip                                                                */
/*  One solid panel split by hairlines (not four separate coloured cards).    */
/*  Small uppercase labels, big tabular numbers, a tiny coloured glyph, and   */
/*  the progress line pinned to the cell's bottom edge, so all four numbers   */
/*  sit on exactly the same baseline. Skeleton uses the same box.             */
/* ========================================================================== */

const STRIP = cn(
  "grid grid-cols-2 gap-px overflow-hidden rounded-2xl bg-black/[0.07] lg:grid-cols-4",
  "ring-1 ring-black/[0.06] shadow-[0_1px_2px_rgba(28,20,16,0.04),0_12px_28px_-18px_rgba(28,20,16,0.22)]",
);
const CELL =
  "relative flex h-[5.75rem] flex-col justify-between bg-white p-3 sm:h-[6.75rem] sm:p-4";

type Stat = {
  label: string;
  icon: (p: React.SVGProps<SVGSVGElement>) => React.ReactElement;
  /** Tailwind text colour for the glyph only. */
  iconClass: string;
  value: number;
  hint: string;
  /** 0–100. When set, a thin progress line sits on the cell's bottom edge. */
  progress?: number;
};

/** Counts up from 0 on first paint (and between values). Skipped for reduced motion. */
function CountUp({ value }: { value: number }) {
  const [n, setN] = React.useState(0);
  const from = React.useRef(0);

  React.useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      setN(value);
      from.current = value;
      return;
    }
    const start = performance.now();
    const base = from.current;
    const duration = 700;
    let raf = 0;
    const tick = (t: number) => {
      const p = Math.min(1, (t - start) / duration);
      const eased = 1 - Math.pow(1 - p, 3);
      setN(Math.round(base + (value - base) * eased));
      if (p < 1) raf = requestAnimationFrame(tick);
      else from.current = value;
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [value]);

  return <>{n}</>;
}

function StatStrip({ summary }: { summary: LibrarySummary }) {
  const usedPct = summary.total
    ? Math.round((summary.used / summary.total) * 100)
    : 0;

  const stats: Stat[] = [
    {
      label: "Templates owned",
      icon: IcLibrary,
      iconClass: "text-orange-500",
      value: summary.total,
      hint: summary.total ? "In your library" : "Nothing here yet",
    },
    {
      label: "Premium",
      icon: IcCrown,
      iconClass: "text-amber-500",
      value: summary.premium,
      hint: "Unlocked designs",
    },
    {
      label: "In use",
      icon: IcEnvelope,
      iconClass: "text-emerald-500",
      value: summary.used,
      hint: summary.total
        ? `${summary.used} of ${summary.total} in an invitation`
        : "Nothing here yet",
      progress: usedPct,
    },
    {
      label: "Custom links",
      icon: IcLink,
      iconClass: "text-sky-500",
      value: summary.custom_slugs,
      hint: "Memorable invite URLs",
    },
  ];

  return (
    <dl className={STRIP}>
      {stats.map((s) => (
        <div key={s.label} className={CELL}>
          <dt className="flex items-center gap-1.5">
            <s.icon className={cn("size-4 shrink-0", s.iconClass)} />
            <span className="truncate text-[11px] font-semibold uppercase tracking-[0.06em] text-stone-500">
              {s.label}
            </span>
          </dt>
          <dd>
            <p
              className={cn(
                HEADING,
                "text-2xl leading-7 tracking-[-0.02em] tabular-nums text-[#1c1410] sm:text-3xl sm:leading-8",
              )}
            >
              <CountUp value={s.value} />
            </p>
            <p className="mt-0.5 h-4 truncate text-[11px] leading-4 text-stone-500 sm:text-xs">
              {s.hint}
            </p>
          </dd>

          {s.progress !== undefined && (
            <div
              className="absolute inset-x-0 bottom-0 h-[3px] bg-emerald-100"
              role="progressbar"
              aria-label="Share of templates used in an invitation"
              aria-valuemin={0}
              aria-valuemax={100}
              aria-valuenow={s.progress}
            >
              <div
                className="h-full bg-emerald-500 transition-[width] duration-700 ease-out"
                style={{ width: `${s.progress}%` }}
              />
            </div>
          )}
        </div>
      ))}
    </dl>
  );
}

function StatStripSkeleton() {
  return (
    <div className={STRIP} aria-hidden>
      {[0, 1, 2, 3].map((i) => (
        <div key={i} className={CELL}>
          <Skeleton className="h-4 w-28 rounded-md" />
          <div>
            <Skeleton className="h-7 w-12 rounded-md sm:h-8" />
            <Skeleton className="mt-1 h-4 w-24 rounded-md" />
          </div>
        </div>
      ))}
    </div>
  );
}