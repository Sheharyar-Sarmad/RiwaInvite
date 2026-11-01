"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { useSearchParams, useRouter, usePathname } from "next/navigation";
import {
  AnimatePresence,
  animate,
  motion,
  useInView,
  useMotionTemplate,
  useMotionValue,
  useReducedMotion,
  useSpring,
  useTransform,
  Variants,
} from "framer-motion";
import {
  Search,
  ArrowUpRight,
  ArrowRight,
  Eye,
  X,
  ChevronLeft,
  ChevronRight,
  LayoutGrid,
  Crown,
  RefreshCw,
} from "lucide-react";
import { apiClient } from "@/lib/api/api_base";
import {
  TemplatePreviewModal,
  TemplateData,
} from "@/components/public/models/TemplatePreviewModel";
import { AceternitySelect } from "@/components/ui/aceternity-select";

/* -------------------------------------------------------------------------- */
/*  Constants & helpers                                                       */
/* -------------------------------------------------------------------------- */

const EASE = [0.16, 1, 0.3, 1] as const;

const focusRing =
  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-500 focus-visible:ring-offset-2 focus-visible:ring-offset-[#fdeadb]";

const primaryBtn =
  "bg-gradient-to-b from-[#fb8a3c] to-[#f97316] shadow-[0_10px_30px_-10px_rgba(249,115,22,0.8),inset_0_1px_0_rgba(255,255,255,0.3)]";

const SORT_OPTIONS = [
  { label: "Newest Arrivals", value: "newest" },
  { label: "Price: Low to High", value: "price_asc" },
  { label: "Price: High to Low", value: "price_desc" },
  { label: "Name: A to Z", value: "name_asc" },
];

const QUICK_SEARCHES = [
  "Wedding",
  "Birthday",
  "Minimalist",
  "Floral",
  "Corporate",
];

type CategoryData = {
  id: string;
  name: string;
  slug: string;
  template_count: number;
};

const z = (n: number): React.CSSProperties => ({
  transform: `translateZ(${n}px)`,
});
const preserve3d = { transformStyle: "preserve-3d" as const };

const wordsParent: Variants = {
  hidden: {},
  show: { transition: { staggerChildren: 0.07, delayChildren: 0.1 } },
};
const wordChild: Variants = {
  hidden: { y: "115%", rotate: 4 },
  show: { y: 0, rotate: 0, transition: { duration: 0.9, ease: EASE } },
};
const gridVariants: Variants = {
  hidden: {},
  show: { transition: { staggerChildren: 0.05 } },
};
const cardVariants: Variants = {
  hidden: { opacity: 0, y: 40, rotateX: -20, scale: 0.94 },
  show: {
    opacity: 1,
    y: 0,
    rotateX: 0,
    scale: 1,
    transition: { type: "spring", stiffness: 120, damping: 17 },
  },
};

/** 1 … 4 5 6 … 12 */
function pageList(page: number, total: number): (number | "gap-l" | "gap-r")[] {
  if (total <= 7) return Array.from({ length: total }, (_, i) => i + 1);
  const keep = new Set(
    [1, total, page - 1, page, page + 1].filter((n) => n >= 1 && n <= total),
  );
  const sorted = [...keep].sort((a, b) => a - b);
  const out: (number | "gap-l" | "gap-r")[] = [];
  sorted.forEach((n, i) => {
    if (i > 0 && n - sorted[i - 1] > 1) out.push(i === 1 ? "gap-l" : "gap-r");
    out.push(n);
  });
  return out;
}

/* -------------------------------------------------------------------------- */
/*  Hooks & small components                                                  */
/* -------------------------------------------------------------------------- */

/** Pointer-driven 3D tilt with a cursor-following orange glow. */
function useTilt(max: number, reduce: boolean) {
  const px = useMotionValue(0);
  const py = useMotionValue(0);
  const sx = useSpring(px, { stiffness: 150, damping: 20 });
  const sy = useSpring(py, { stiffness: 150, damping: 20 });
  const rotateY = useTransform(sx, [-0.5, 0.5], [-max, max]);
  const rotateX = useTransform(sy, [-0.5, 0.5], [max, -max]);
  const gx = useMotionValue(-400);
  const gy = useMotionValue(-400);
  const glow = useMotionTemplate`radial-gradient(300px circle at ${gx}px ${gy}px, rgba(249,115,22,0.28), transparent 70%)`;
  const sheen = useMotionTemplate`radial-gradient(160px circle at ${gx}px ${gy}px, rgba(255,255,255,0.35), transparent 70%)`;

  const onPointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (e.pointerType === "touch") return;
    const r = e.currentTarget.getBoundingClientRect();
    const nx = (e.clientX - r.left) / r.width;
    const ny = (e.clientY - r.top) / r.height;
    px.set(nx - 0.5);
    py.set(ny - 0.5);
    gx.set(nx * r.width);
    gy.set(ny * r.height);
  };
  const onPointerLeave = () => {
    px.set(0);
    py.set(0);
    gx.set(-400);
    gy.set(-400);
  };

  return {
    glow,
    sheen,
    handlers: reduce ? {} : { onPointerMove, onPointerLeave },
    style: reduce
      ? {}
      : {
          rotateX,
          rotateY,
          transformPerspective: 1300,
          transformStyle: "preserve-3d" as const,
        },
  };
}

function MaskedWords({
  words,
  gradientFrom,
  reduce,
}: {
  words: string[];
  gradientFrom: number;
  reduce: boolean;
}) {
  return (
    <motion.h1
      aria-label={words.join(" ")}
      variants={wordsParent}
      initial={reduce ? "show" : "hidden"}
      animate="show"
      className="font-[family-name:var(--font-display)] text-4xl font-bold leading-[1.1] tracking-tight text-gray-900 sm:text-5xl lg:text-6xl"
    >
      {words.map((w, i) => (
        <span
          key={i}
          className="mr-[0.25em] inline-block overflow-hidden pb-[0.12em] align-bottom"
        >
          <motion.span
            aria-hidden
            variants={wordChild}
            className={`inline-block origin-bottom-left ${
              i >= gradientFrom
                ? "bg-gradient-to-r from-[#f97316] via-amber-500 to-[#f97316] bg-clip-text text-transparent"
                : ""
            }`}
          >
            {w}
          </motion.span>
        </span>
      ))}
    </motion.h1>
  );
}

function CountUp({ value, reduce }: { value: number; reduce: boolean }) {
  const ref = useRef<HTMLSpanElement>(null);
  const inView = useInView(ref, { once: true });
  const mv = useMotionValue(reduce ? value : 0);
  const text = useTransform(mv, (v) => Math.round(v).toLocaleString());
  useEffect(() => {
    if (reduce) {
      mv.set(value);
      return;
    }
    if (!inView) return;
    const c = animate(mv, value, { duration: 1.4, ease: EASE });
    return () => c.stop();
  }, [inView, value, reduce, mv]);
  return (
    <motion.span ref={ref} className="tabular-nums">
      {text}
    </motion.span>
  );
}

/* -------------------------------------------------------------------------- */
/*  Search modal                                                              */
/* -------------------------------------------------------------------------- */

function SearchModal({
  open,
  value,
  onChange,
  onClose,
}: {
  open: boolean;
  value: string;
  onChange: (v: string) => void;
  onClose: () => void;
}) {
  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = prev;
      window.removeEventListener("keydown", onKey);
    };
  }, [open, onClose]);

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          role="dialog"
          aria-modal="true"
          aria-label="Search templates"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[100] flex items-start justify-center bg-black/55 px-4 pt-24 backdrop-blur-md sm:pt-32"
          onClick={onClose}
        >
          <motion.div
            initial={{ opacity: 0, y: -24, scale: 0.95, rotateX: 8 }}
            animate={{ opacity: 1, y: 0, scale: 1, rotateX: 0 }}
            exit={{ opacity: 0, y: -16, scale: 0.97 }}
            transition={{ type: "spring", damping: 25, stiffness: 280 }}
            style={{ transformPerspective: 1400 }}
            onClick={(e) => e.stopPropagation()}
            className="w-full max-w-2xl overflow-hidden rounded-3xl border border-white/40 bg-[#fdeadb] shadow-[0_40px_120px_-20px_rgba(249,115,22,0.45)]"
          >
            <form
              onSubmit={(e) => {
                e.preventDefault();
                onClose();
              }}
              className="relative flex items-center border-b border-black/5 bg-white/60 p-2 backdrop-blur-xl"
            >
              <Search className="pointer-events-none absolute left-6 h-5 w-5 text-orange-500" />
              <input
                autoFocus
                type="text"
                autoComplete="off"
                aria-label="Search templates"
                placeholder="Search by name, category or style…"
                value={value}
                onChange={(e) => onChange(e.target.value)}
                className="w-full bg-transparent py-4 pl-14 pr-24 text-lg text-gray-900 outline-none placeholder:text-gray-400"
              />
              <div className="absolute right-3 flex items-center gap-1">
                {value && (
                  <button
                    type="button"
                    onClick={() => onChange("")}
                    aria-label="Clear search"
                    className="flex h-8 w-8 items-center justify-center rounded-full bg-black/5 text-gray-500 hover:bg-orange-100 hover:text-orange-600"
                  >
                    <X className="h-4 w-4" />
                  </button>
                )}
                <button
                  type="button"
                  onClick={onClose}
                  aria-label="Close search"
                  className="flex h-8 w-8 items-center justify-center rounded-full text-gray-500 hover:bg-black/5 hover:text-gray-900"
                >
                  <kbd className="text-[10px] font-semibold">Esc</kbd>
                </button>
              </div>
            </form>

            <div className="p-5">
              <p className="mb-3 text-xs font-semibold text-gray-500">
                Popular searches
              </p>
              <div className="flex flex-wrap gap-2">
                {QUICK_SEARCHES.map((term, i) => (
                  <motion.button
                    key={term}
                    type="button"
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.1 + i * 0.05 }}
                    whileHover={{ y: -2 }}
                    whileTap={{ scale: 0.95 }}
                    onClick={() => {
                      onChange(term);
                      onClose();
                    }}
                    className="rounded-full border border-orange-200 bg-white/80 px-4 py-1.5 text-sm font-medium text-gray-700 transition-colors hover:border-orange-400 hover:bg-orange-50 hover:text-orange-600"
                  >
                    {term}
                  </motion.button>
                ))}
              </div>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

/* -------------------------------------------------------------------------- */
/*  Main client                                                               */
/* -------------------------------------------------------------------------- */

export function TemplateClient() {
  const reduce = useReducedMotion() ?? false;
  const searchParams = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();

  const activeCategorySlug = searchParams.get("category") || "all";

  const [templates, setTemplates] = useState<TemplateData[]>([]);
  const [categories, setCategories] = useState<CategoryData[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [retry, setRetry] = useState(0);

  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [search, setSearch] = useState("");
  const [searchInput, setSearchInput] = useState("");
  const [sort, setSort] = useState("newest");

  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [selectedTemplate, setSelectedTemplate] = useState<TemplateData | null>(
    null,
  );

  // Cursor-reveal dotted background (same as the pricing section)
  const sectionRef = useRef<HTMLDivElement>(null);
  const raf = useRef(0);
  const onMove = useCallback((e: React.PointerEvent) => {
    if (e.pointerType === "touch") return;
    const { clientX: x, clientY: y } = e;
    cancelAnimationFrame(raf.current);
    raf.current = requestAnimationFrame(() => {
      sectionRef.current?.style.setProperty("--mx", `${x}px`);
      sectionRef.current?.style.setProperty("--my", `${y}px`);
    });
  }, []);
  useEffect(() => () => cancelAnimationFrame(raf.current), []);
  const mask =
    "radial-gradient(230px circle at var(--mx,-999px) var(--my,-999px), #000 0%, transparent 100%)";

  // Press "/" to open search
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const t = e.target as HTMLElement | null;
      const typing =
        t &&
        (t.tagName === "INPUT" ||
          t.tagName === "TEXTAREA" ||
          t.isContentEditable);
      if (e.key === "/" && !typing) {
        e.preventDefault();
        setIsSearchOpen(true);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  // Categories
  useEffect(() => {
    const fetchCategories = async () => {
      try {
        const res = await apiClient.get("/public/templates/categories");
        if (res.data?.data) setCategories(res.data.data);
      } catch (err) {
        console.error("Failed to load categories", err);
      }
    };
    fetchCategories();
  }, []);

  const handleCategoryChange = (slug: string) => {
    const params = new URLSearchParams(searchParams.toString());
    if (slug === "all") params.delete("category");
    else params.set("category", slug);
    router.push(`${pathname}?${params.toString()}`, { scroll: false });
    setPage(1);
  };

  const activeCategoryId = useMemo(() => {
    if (activeCategorySlug === "all") return "";
    return categories.find((c) => c.slug === activeCategorySlug)?.id || "";
  }, [activeCategorySlug, categories]);

  const totalDesigns = useMemo(
    () => categories.reduce((n, c) => n + (c.template_count || 0), 0),
    [categories],
  );

  useEffect(() => {
    const t = setTimeout(() => {
      setSearch(searchInput.trim());
      setPage(1);
    }, 400);
    return () => clearTimeout(t);
  }, [searchInput]);

  // Templates
  useEffect(() => {
    let cancelled = false;
    const fetchTemplates = async () => {
      setLoading(true);
      setError(false);
      try {
        const qs = new URLSearchParams({
          page: String(page),
          limit: "12",
          search,
          sort,
          ...(activeCategoryId && { category_id: activeCategoryId }),
        });
        const res = await apiClient.get(
          `/public/templates/all?${qs.toString()}`,
        );
        if (cancelled) return;
        if (res.data?.status === "success") {
          setTemplates(res.data.data.templates);
          setTotalPages(res.data.data.meta.totalPages || 1);
        } else {
          setError(true);
        }
      } catch (err) {
        console.error(err);
        if (!cancelled) setError(true);
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    if (categories.length > 0 || activeCategorySlug === "all") fetchTemplates();
    return () => {
      cancelled = true;
    };
  }, [
    page,
    search,
    sort,
    activeCategoryId,
    activeCategorySlug,
    categories.length,
    retry,
  ]);

  const clearSearch = () => {
    setSearchInput("");
    setSearch("");
    setPage(1);
  };

  const goToPage = (n: number) => {
    setPage(n);
    window.scrollTo({ top: 0, behavior: reduce ? "auto" : "smooth" });
  };

  const closeSearch = useCallback(() => setIsSearchOpen(false), []);
  const hasFilters = !!search || activeCategorySlug !== "all";

  return (
    <div
      ref={sectionRef}
      onPointerMove={onMove}
      className="relative isolate min-h-screen w-full overflow-hidden bg-[#fdeadb] py-16 sm:py-24"
    >
      {/* Background: peach gradient, drifting glows, dots that light up under the cursor */}
      <div aria-hidden className="pointer-events-none absolute inset-0 -z-10">
        <div className="absolute inset-0 bg-gradient-to-b from-[#fff4ea] to-[#fbdcc0]" />
        <motion.div
          animate={reduce ? undefined : { x: [0, 60, 0], y: [0, 30, 0] }}
          transition={{ duration: 18, repeat: Infinity, ease: "easeInOut" }}
          className="absolute -left-32 top-10 h-[420px] w-[420px] rounded-full bg-orange-300/30 blur-[120px]"
        />
        <motion.div
          animate={reduce ? undefined : { x: [0, -50, 0], y: [0, -40, 0] }}
          transition={{ duration: 22, repeat: Infinity, ease: "easeInOut" }}
          className="absolute -right-32 bottom-0 h-[420px] w-[420px] rounded-full bg-amber-300/30 blur-[120px]"
        />
        <div
          className="absolute inset-0"
          style={{
            backgroundImage:
              "radial-gradient(circle, rgba(194,65,12,0.2) 1.5px, transparent 1.5px)",
            backgroundSize: "24px 24px",
          }}
        />
        <div
          className="absolute inset-0"
          style={{
            backgroundImage:
              "radial-gradient(circle, rgba(234,88,12,0.95) 2px, transparent 2px)",
            backgroundSize: "24px 24px",
            maskImage: mask,
            WebkitMaskImage: mask,
          }}
        />
      </div>

      <div className="relative z-10 mx-auto w-full max-w-[90rem] px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="mx-auto mb-10 max-w-3xl text-center sm:mb-14">
          <motion.span
            initial={
              reduce ? false : { opacity: 0, y: 16, filter: "blur(6px)" }
            }
            animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
            transition={{ duration: 0.7, ease: EASE }}
            className="mb-5 inline-flex items-center gap-2 rounded-full border border-orange-200/60 bg-white/70 px-4 py-1.5 text-sm font-semibold text-orange-600 shadow-sm backdrop-blur-md"
          >
            <LayoutGrid className="h-3.5 w-3.5" />
            The complete collection
          </motion.span>

          <MaskedWords
            words={["Find", "your", "perfect", "design"]}
            gradientFrom={2}
            reduce={reduce}
          />

          <motion.p
            initial={
              reduce ? false : { opacity: 0, y: 16, filter: "blur(6px)" }
            }
            animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
            transition={{ duration: 0.8, delay: 0.45, ease: EASE }}
            className="mx-auto mt-5 max-w-2xl font-[family-name:var(--font-body)] text-base leading-relaxed text-gray-600 sm:text-lg"
          >
            {totalDesigns > 0 ? (
              <>
                Browse{" "}
                <b className="text-gray-900">
                  <CountUp value={totalDesigns} reduce={reduce} />
                </b>{" "}
                designs across{" "}
                <b className="text-gray-900">{categories.length}</b> categories.
                Preview any of them, then buy a single template or pick a plan.
              </>
            ) : (
              "Preview any design, then buy a single template or pick a plan."
            )}
          </motion.p>
        </div>

        {/* Category pills */}
        <div className="mb-6 w-full overflow-x-auto pb-3 pt-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          <div className="flex w-max min-w-full items-center justify-start gap-2 px-2 sm:justify-center">
            {[
              {
                id: "all",
                name: "All designs",
                slug: "all",
                template_count: -1,
              } as CategoryData,
              ...categories,
            ].map((cat) => {
              const isActive = activeCategorySlug === cat.slug;
              return (
                <motion.button
                  key={cat.id}
                  type="button"
                  onClick={() => handleCategoryChange(cat.slug)}
                  aria-pressed={isActive}
                  whileHover={reduce ? undefined : { y: -2 }}
                  whileTap={{ scale: 0.96 }}
                  className={`relative flex items-center rounded-full border px-5 py-2.5 text-sm font-semibold transition-colors ${focusRing} ${
                    isActive
                      ? "border-transparent text-white"
                      : "border-orange-200/70 bg-white/70 text-gray-700 backdrop-blur-md hover:border-orange-300 hover:bg-white"
                  }`}
                >
                  {isActive && (
                    <motion.span
                      layoutId="active-category-pill"
                      className="absolute inset-0 rounded-full bg-gradient-to-r from-orange-500 to-amber-500 shadow-[0_10px_25px_-8px_rgba(249,115,22,0.8)]"
                      transition={{
                        type: "spring",
                        bounce: 0.2,
                        duration: 0.6,
                      }}
                    />
                  )}
                  <span className="relative z-10">
                    {cat.name}
                    {cat.template_count >= 0 && (
                      <span
                        className={`ml-2 text-[11px] font-medium ${isActive ? "text-white/80" : "text-gray-400"}`}
                      >
                        {cat.template_count}
                      </span>
                    )}
                  </span>
                </motion.button>
              );
            })}
          </div>
        </div>

        {/* Controls. z-20 so the select's dropdown overlays the grid. */}
        <div className="relative z-20 mb-10 flex flex-col gap-3 rounded-3xl border border-white/70 bg-white/60 p-3 shadow-[0_20px_50px_-30px_rgba(249,115,22,0.5)] backdrop-blur-xl sm:flex-row sm:items-center">
          <div className="relative flex-1">
            <button
              type="button"
              onClick={() => setIsSearchOpen(true)}
              className={`flex w-full items-center gap-3 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-left text-sm text-gray-500 transition-all hover:border-orange-300 ${focusRing}`}
            >
              <Search className="h-4 w-4 shrink-0 text-orange-500" />
              <span
                className={`flex-1 truncate ${search ? "font-medium text-gray-900" : ""}`}
              >
                {search ? search : "Search templates…"}
              </span>
              {!search && (
                <kbd className="hidden rounded-md border border-gray-200 bg-gray-50 px-1.5 py-0.5 text-[10px] font-semibold text-gray-400 sm:block">
                  /
                </kbd>
              )}
            </button>
            {search && (
              <button
                type="button"
                onClick={clearSearch}
                aria-label="Clear search"
                className="absolute right-2.5 top-1/2 flex h-6 w-6 -translate-y-1/2 items-center justify-center rounded-full bg-gray-100 text-gray-500 hover:bg-orange-100 hover:text-orange-600"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            )}
          </div>

          <div className="w-full sm:w-[220px]">
            <AceternitySelect
              value={sort}
              options={SORT_OPTIONS}
              onChange={(val) => {
                setSort(val);
                setPage(1);
              }}
              className="w-full"
            />
          </div>
        </div>

        {/* Grid */}
        {error ? (
          <div className="flex h-64 flex-col items-center justify-center text-center">
            <p className="text-gray-600">
              We couldn&apos;t load the templates. Check your connection and try
              again.
            </p>
            <button
              type="button"
              onClick={() => setRetry((n) => n + 1)}
              className={`mt-4 inline-flex items-center gap-2 rounded-full bg-[#2a2a2a] px-6 py-2.5 text-sm font-bold text-white hover:bg-[#f97316] ${focusRing}`}
            >
              <RefreshCw className="h-4 w-4" /> Try again
            </button>
          </div>
        ) : loading ? (
          <div
            className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4"
            aria-busy="true"
          >
            {[...Array(8)].map((_, i) => (
              <div
                key={i}
                className="relative aspect-[3/4] overflow-hidden rounded-3xl border border-white/70 bg-white/60"
              >
                <motion.div
                  aria-hidden
                  className="absolute inset-y-0 w-1/2 bg-gradient-to-r from-transparent via-white/90 to-transparent"
                  initial={{ x: "-100%" }}
                  animate={{ x: "300%" }}
                  transition={{
                    duration: 1.5,
                    ease: "easeInOut",
                    repeat: Infinity,
                    delay: (i % 4) * 0.15,
                  }}
                />
              </div>
            ))}
          </div>
        ) : templates.length === 0 ? (
          <div className="mx-auto flex h-64 max-w-md flex-col items-center justify-center text-center">
            <span className="mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-orange-50 to-orange-100 text-[#f97316] ring-1 ring-orange-200/60">
              <Search className="h-6 w-6" />
            </span>
            <h3 className="font-[family-name:var(--font-display)] text-lg font-bold text-gray-900">
              No templates found
            </h3>
            <p className="mt-1 text-sm text-gray-600">
              Try a different search or category.
            </p>
            {hasFilters && (
              <button
                type="button"
                onClick={() => {
                  clearSearch();
                  handleCategoryChange("all");
                }}
                className="mt-4 text-sm font-semibold text-orange-600 underline underline-offset-4"
              >
                Clear all filters
              </button>
            )}
          </div>
        ) : (
          <>
            <motion.div
              key={`${activeCategorySlug}-${search}-${sort}-${page}`}
              variants={gridVariants}
              initial={reduce ? "show" : "hidden"}
              animate="show"
              className="grid grid-cols-1 gap-6 sm:grid-cols-2 md:gap-7 lg:grid-cols-3 xl:grid-cols-4"
            >
              {templates.map((template, idx) => (
                <TemplateGridCard
                  key={template.id}
                  template={template}
                  priority={idx < 4}
                  onOpen={() => setSelectedTemplate(template)}
                  reduce={reduce}
                />
              ))}
            </motion.div>

            {/* Pagination */}
            {totalPages > 1 && (
              <nav
                aria-label="Pagination"
                className="mt-16 flex items-center justify-center"
              >
                <div className="flex items-center gap-1.5 rounded-2xl border border-white/70 bg-white/70 p-2 shadow-[0_20px_50px_-30px_rgba(249,115,22,0.5)] backdrop-blur-xl">
                  <button
                    type="button"
                    aria-label="Previous page"
                    onClick={() => goToPage(Math.max(1, page - 1))}
                    disabled={page === 1}
                    className={`flex h-10 w-10 items-center justify-center rounded-xl text-gray-700 transition-colors hover:bg-orange-50 hover:text-orange-600 disabled:cursor-not-allowed disabled:opacity-30 disabled:hover:bg-transparent ${focusRing}`}
                  >
                    <ChevronLeft className="h-5 w-5" />
                  </button>

                  {pageList(page, totalPages).map((p) =>
                    typeof p === "number" ? (
                      <button
                        key={p}
                        type="button"
                        onClick={() => goToPage(p)}
                        aria-current={p === page ? "page" : undefined}
                        className={`relative flex h-10 min-w-10 items-center justify-center rounded-xl px-2 text-sm font-semibold tabular-nums transition-colors ${focusRing} ${
                          p === page
                            ? "text-white"
                            : "text-gray-700 hover:bg-orange-50 hover:text-orange-600"
                        }`}
                      >
                        {p === page && (
                          <motion.span
                            layoutId="active-page"
                            className="absolute inset-0 rounded-xl bg-gradient-to-b from-[#fb8a3c] to-[#f97316] shadow-[0_8px_20px_-8px_rgba(249,115,22,0.8)]"
                            transition={{
                              type: "spring",
                              bounce: 0.2,
                              duration: 0.5,
                            }}
                          />
                        )}
                        <span className="relative">{p}</span>
                      </button>
                    ) : (
                      <span key={p} className="px-1 text-gray-400">
                        …
                      </span>
                    ),
                  )}

                  <button
                    type="button"
                    aria-label="Next page"
                    onClick={() => goToPage(Math.min(totalPages, page + 1))}
                    disabled={page === totalPages}
                    className={`flex h-10 w-10 items-center justify-center rounded-xl text-gray-700 transition-colors hover:bg-orange-50 hover:text-orange-600 disabled:cursor-not-allowed disabled:opacity-30 disabled:hover:bg-transparent ${focusRing}`}
                  >
                    <ChevronRight className="h-5 w-5" />
                  </button>
                </div>
              </nav>
            )}
          </>
        )}

        {/* Plans nudge */}
        {!error && !loading && templates.length > 0 && (
          <motion.div
            initial={reduce ? false : { opacity: 0, y: 24 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "-60px" }}
            transition={{ duration: 0.7, ease: EASE }}
            className="mx-auto mt-20 max-w-4xl"
          >
            <Link
              href="/#pricing"
              className={`group relative flex flex-col items-start gap-4 overflow-hidden rounded-3xl border border-orange-200/70 bg-white/70 p-6 shadow-[0_20px_50px_-30px_rgba(249,115,22,0.5)] backdrop-blur-xl transition-colors hover:border-orange-300 hover:bg-white sm:flex-row sm:items-center sm:gap-6 sm:p-7 ${focusRing}`}
            >
              <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-orange-50 to-orange-100 text-[#f97316] ring-1 ring-orange-200/60 transition-transform duration-500 group-hover:-rotate-6 group-hover:scale-110">
                <Crown className="h-6 w-6" />
              </span>
              <span className="flex-1">
                <span className="block font-[family-name:var(--font-display)] text-lg font-bold text-gray-900">
                  Need more than one design?
                </span>
                <span className="mt-1 block text-sm text-gray-600">
                  A plan includes standard and premium templates, real-time RSVP
                  tracking and 24/7 WhatsApp support.
                </span>
              </span>
              <span
                className={`inline-flex items-center gap-2 rounded-xl px-5 py-3 text-sm font-bold text-white ${primaryBtn}`}
              >
                See plans
                <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
              </span>
            </Link>
          </motion.div>
        )}
      </div>

      <SearchModal
        open={isSearchOpen}
        value={searchInput}
        onChange={setSearchInput}
        onClose={closeSearch}
      />

      <TemplatePreviewModal
        template={selectedTemplate}
        onClose={() => setSelectedTemplate(null)}
      />
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/*  Card (layered 3D)                                                         */
/* -------------------------------------------------------------------------- */

function TemplateGridCard({
  template,
  priority,
  onOpen,
  reduce,
}: {
  template: TemplateData;
  priority: boolean;
  onOpen: () => void;
  reduce: boolean;
}) {
  const isPaid = template.price > 0;
  const priceLabel = isPaid ? `Rs ${template.price.toLocaleString()}` : "Free";
  const tilt = useTilt(7, reduce);

  return (
    <motion.div
      variants={cardVariants}
      style={{ transformPerspective: 1200 }}
      className="aspect-[3/4]"
    >
      <motion.div
        {...tilt.handlers}
        style={tilt.style}
        whileHover={reduce ? undefined : { y: -8, scale: 1.015 }}
        transition={{ type: "spring", stiffness: 260, damping: 22 }}
        className="group relative h-full rounded-3xl"
      >
        {/* Depth shadow */}
        <div
          aria-hidden
          className="absolute inset-0 rounded-3xl shadow-[0_14px_40px_-22px_rgba(0,0,0,0.35)]"
        />
        <div
          aria-hidden
          className="absolute inset-0 rounded-3xl opacity-0 shadow-[0_40px_70px_-28px_rgba(249,115,22,0.65)] transition-opacity duration-500 group-hover:opacity-100"
        />

        {/* Layer A: flat clipped surface (image, shading, glow) */}
        <div className="pointer-events-none absolute inset-0 overflow-hidden rounded-3xl bg-[#f97316] p-1.5 ring-1 ring-orange-300/50">
          {/* Shining Border Animation */}
          <motion.div
            animate={{ rotate: 360 }}
            transition={{ duration: 5, ease: "linear", repeat: Infinity }}
            className="absolute left-1/2 top-1/2 h-[300%] w-[300%] -translate-x-1/2 -translate-y-1/2 bg-[conic-gradient(from_0deg,transparent_0deg,transparent_300deg,rgba(255,255,255,0.8)_330deg,transparent_360deg)]"
          />

          {/* Inner image wrapper (z-10 so it covers the center of the shine) */}
          <div className="relative z-10 h-full w-full overflow-hidden rounded-[1.25rem] bg-orange-100">
            <Image
              src={template.thumbnailUrl || "/video-poster.png"}
              alt={template.name}
              fill
              quality={90}
              sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
              priority={priority}
              className="object-cover transition-transform duration-700 ease-out group-hover:scale-[1.07]"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/25 to-transparent" />
            <motion.div
              aria-hidden
              style={{ background: tilt.glow }}
              className="absolute inset-0 opacity-0 mix-blend-screen transition-opacity duration-300 group-hover:opacity-100"
            />
            <motion.div
              aria-hidden
              style={{ background: tilt.sheen }}
              className="absolute inset-0 opacity-0 mix-blend-soft-light transition-opacity duration-300 group-hover:opacity-100"
            />
            <div className="absolute inset-0 bg-black/25 opacity-0 backdrop-blur-[2px] transition-opacity duration-300 group-hover:opacity-100" />
          </div>
        </div>

        {/* Layer B: content floating at different depths */}
        <div className="relative h-full" style={preserve3d}>
          {/* Whole-card click target (sits behind the action buttons) */}
          <button
            type="button"
            onClick={onOpen}
            aria-label={`Preview ${template.name}`}
            className={`absolute inset-0 rounded-3xl ${focusRing}`}
          />

          {template.isPremium && (
            <span
              className="pointer-events-none absolute left-4 top-4 flex items-center gap-1.5 rounded-full bg-gradient-to-r from-orange-500 to-amber-500 px-3 py-1 text-[11px] font-bold text-white shadow-lg"
              style={z(46)}
            >
              <Crown className="h-3 w-3" /> Premium
            </span>
          )}

          <span
            className="pointer-events-none absolute right-4 top-4 rounded-full bg-white/90 px-3 py-1 text-[11px] font-bold text-gray-900 shadow-lg"
            style={z(46)}
          >
            {priceLabel}
          </span>

          {/* Hover hint */}
          <div
            className="pointer-events-none absolute inset-0 flex items-center justify-center opacity-0 transition-opacity duration-300 group-hover:opacity-100"
            style={z(64)}
          >
            <span className="flex flex-col items-center gap-2 rounded-full bg-white/15 p-4 ring-1 ring-white/40 backdrop-blur-md">
              <Eye className="h-6 w-6 text-white" />
              <span className="text-xs font-bold text-white">
                Quick preview
              </span>
            </span>
          </div>

          <div
            className="pointer-events-none absolute bottom-0 left-0 w-full p-5 sm:p-6"
            style={z(40)}
          >
            <p className="mb-1 text-xs font-semibold text-orange-300">
              {template.categoryName}
            </p>
            <h3 className="mb-4 line-clamp-1 font-[family-name:var(--font-display)] text-lg font-bold text-white sm:text-xl">
              {template.name}
            </h3>

            <div
              className="pointer-events-auto flex items-center gap-2"
              style={z(14)}
            >
              <button
                type="button"
                onClick={onOpen}
                className={`flex h-10 flex-1 items-center justify-center gap-2 rounded-xl bg-white/15 text-xs font-bold text-white ring-1 ring-white/30 backdrop-blur-md transition-colors hover:bg-white/25 sm:text-sm ${focusRing}`}
              >
                <Eye className="h-4 w-4" /> Preview
              </button>
              <Link
                href={`/template/${template.id}`}
                className={`flex h-10 flex-1 items-center justify-center gap-1.5 rounded-xl text-xs font-bold text-white transition-transform hover:scale-[1.04] active:scale-95 sm:text-sm ${primaryBtn} ${focusRing}`}
              >
                {isPaid ? "Buy" : "Use"} <ArrowUpRight className="h-4 w-4" />
              </Link>
            </div>
          </div>
        </div>
      </motion.div>
    </motion.div>
  );
}
