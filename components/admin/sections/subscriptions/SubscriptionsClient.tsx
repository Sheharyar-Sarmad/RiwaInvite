"use client";

import { useState, useEffect, useRef } from "react";
import { Search, Loader2, ChevronLeft, ChevronRight, Eye, ShieldCheck, Inbox } from "lucide-react";
import { toast } from "@/components/ui/toast";
import { apiClient } from "@/lib/api/api_base";
import { motion, AnimatePresence } from "framer-motion";
import { AceternitySelect } from "@/components/ui/aceternity-select";
import { SubscriptionModal } from "@/components/admin/models/SubscriptionModal";

export type Subscription = {
  id: string;
  status: string;
  starts_at: string;
  expires_at: string;
  provider: string;
  user_id: string;
  first_name: string;
  last_name: string;
  email: string;
  plan_name: string;
  plan_price: number;
};

const STATUS_OPTIONS = [
  { label: "All Status", value: "all" },
  { label: "Active", value: "active" },
  { label: "Past Due", value: "past_due" },
  { label: "Canceled", value: "canceled" },
  { label: "Expired", value: "expired" },
];

const STATUS_STYLES: Record<string, { chip: string; dot: string }> = {
  active: { chip: "bg-emerald-50 text-emerald-700 border-emerald-200", dot: "bg-emerald-500" },
  past_due: { chip: "bg-amber-50 text-amber-700 border-amber-200", dot: "bg-amber-500" },
  canceled: { chip: "bg-red-50 text-red-700 border-red-200", dot: "bg-red-500" },
  expired: { chip: "bg-gray-100 text-gray-600 border-gray-200", dot: "bg-gray-400" },
};

// Kept for backwards compatibility
export const getStatusColor = (status: string) =>
  (STATUS_STYLES[status] ?? STATUS_STYLES.expired).chip;

export function StatusBadge({ status }: { status: string }) {
  const s = STATUS_STYLES[status] ?? STATUS_STYLES.expired;
  return (
    <span
      className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-bold uppercase tracking-wider border ${s.chip}`}
    >
      <span className={`h-1.5 w-1.5 rounded-full ${s.dot}`} />
      {status.replace("_", " ")}
    </span>
  );
}

// Soft pastel avatars (bg + colored initials), stable per user
const AVATAR_STYLES = [
  "bg-red-100 text-red-600",
  "bg-orange-100 text-orange-600",
  "bg-amber-100 text-amber-700",
  "bg-pink-100 text-pink-600",
  "bg-purple-100 text-purple-600",
  "bg-indigo-100 text-indigo-600",
  "bg-sky-100 text-sky-600",
  "bg-teal-100 text-teal-600",
  "bg-emerald-100 text-emerald-600",
  "bg-fuchsia-100 text-fuchsia-600",
];

export const avatarStyle = (seed: string) => {
  let h = 0;
  for (let i = 0; i < seed.length; i++) h = (h * 31 + seed.charCodeAt(i)) >>> 0;
  return AVATAR_STYLES[h % AVATAR_STYLES.length];
};

export const initials = (f?: string, l?: string) =>
  `${f?.[0] ?? ""}${l?.[0] ?? ""}`.toUpperCase() || "?";

const daysLeftLabel = (expires: string) => {
  const d = Math.ceil((new Date(expires).getTime() - Date.now()) / 86400000);
  return d < 0 ? `Ended ${Math.abs(d)}d ago` : d === 0 ? "Ends today" : `${d}d left`;
};

export function SubscriptionsClient() {
  const [subscriptions, setSubscriptions] = useState<Subscription[]>([]);
  const [meta, setMeta] = useState({ page: 1, limit: 10, total: 0, total_pages: 1 });
  const [isLoading, setIsLoading] = useState(true);

  const [searchInput, setSearchInput] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [page, setPage] = useState(1);
  const [statusFilter, setStatusFilter] = useState("all");

  const [selectedSub, setSelectedSub] = useState<Subscription | null>(null);
  const searchRef = useRef<HTMLInputElement>(null);

  // Press "/" to jump to search
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const tag = (e.target as HTMLElement)?.tagName;
      if (e.key === "/" && tag !== "INPUT" && tag !== "TEXTAREA") {
        e.preventDefault();
        searchRef.current?.focus();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(searchInput);
      setPage(1);
    }, 500);
    return () => clearTimeout(timer);
  }, [searchInput]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setIsLoading(true);
      try {
        const params = new URLSearchParams({
          page: page.toString(),
          limit: meta.limit.toString(),
          ...(debouncedSearch && { search: debouncedSearch }),
          ...(statusFilter !== "all" && { status: statusFilter }),
        });
        const res = await apiClient.get(`/admin/dashboard/subscriptions?${params.toString()}`);
        if (cancelled) return;
        setSubscriptions(res.data.data);
        setMeta(res.data.meta);
      } catch {
        if (!cancelled)
          toast.add({ title: "Error", description: "Failed to load subscriptions.", type: "error" });
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [page, debouncedSearch, statusFilter, meta.limit]);

  // Instant: hands the full row to the modal, no network call
  const handleView = (sub: Subscription) => setSelectedSub(sub);

  return (
    <div className="space-y-6">
      {/* Search, filter, total */}
      <div className="flex flex-col md:flex-row md:items-center gap-3">
        <div className="relative w-full md:w-[22rem] group">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-orange-400 z-10 pointer-events-none group-focus-within:text-orange-600 transition-colors" />
          <input
            ref={searchRef}
            type="text"
            placeholder="Search by user email or plan…"
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            className="w-full pl-11 pr-12 py-3 bg-white/80 backdrop-blur-xl border border-orange-100/60 rounded-full text-sm font-medium text-gray-800 placeholder:text-gray-400 focus:outline-none focus:ring-4 focus:ring-orange-500/10 focus:border-orange-300 shadow-[0_2px_15px_-5px_rgba(249,115,22,0.15)] transition-all font-[family-name:var(--font-body)]"
          />
          <kbd className="absolute right-3 top-1/2 -translate-y-1/2 hidden sm:flex h-6 w-6 items-center justify-center rounded-md border border-gray-200 bg-white text-[11px] text-gray-400 group-focus-within:hidden">
            /
          </kbd>
        </div>

        <div className="w-full md:w-[220px] shrink-0">
          <AceternitySelect
            value={statusFilter}
            onChange={(val) => {
              setStatusFilter(val);
              setPage(1);
            }}
            options={STATUS_OPTIONS}
            className="h-[46px]"
          />
        </div>

        <div className="md:ml-auto inline-flex items-center gap-2 self-start md:self-auto px-4 py-2.5 rounded-full bg-white/80 border border-orange-100/60 text-sm font-semibold text-orange-600 shadow-sm font-[family-name:var(--font-body)]">
          <ShieldCheck className="w-4 h-4" />
          {meta.total.toLocaleString()} Total Subscriptions
        </div>
      </div>

      {/* Table */}
      {isLoading ? (
        <div className="flex items-center justify-center h-64 text-orange-500">
          <Loader2 className="w-8 h-8 animate-spin" />
        </div>
      ) : subscriptions.length === 0 ? (
        <div className="flex flex-col items-center text-center py-20 bg-white/50 backdrop-blur-md rounded-2xl border border-gray-200 border-dashed">
          <Inbox className="w-8 h-8 text-orange-400 mb-3" />
          <p className="text-gray-700 font-semibold font-[family-name:var(--font-display)]">No subscriptions found</p>
          <p className="text-sm text-gray-500 mt-1 font-[family-name:var(--font-body)]">
            Try a different search or status filter.
          </p>
        </div>
      ) : (
        <div className="bg-white/70 backdrop-blur-xl border border-white rounded-3xl shadow-[0_10px_40px_-20px_rgba(249,115,22,0.3)] overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="text-gray-700 font-[family-name:var(--font-display)]">
                <tr>
                  <th className="px-6 py-5 font-bold">User</th>
                  <th className="px-6 py-5 font-bold">Plan</th>
                  <th className="px-6 py-5 font-bold">Status</th>
                  <th className="px-6 py-5 font-bold">Expires</th>
                  <th className="px-6 py-5 font-bold text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="font-[family-name:var(--font-body)]">
                {subscriptions.map((sub, index) => (
                  <motion.tr
                    key={sub.id}
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: index * 0.03 }}
                    whileTap={{ scale: 0.995 }}
                    onClick={() => handleView(sub)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" || e.key === " ") {
                        e.preventDefault();
                        handleView(sub);
                      }
                    }}
                    tabIndex={0}
                    role="button"
                    aria-label={`Open ${sub.first_name} ${sub.last_name}'s subscription`}
                    className="group cursor-pointer outline-none transition-colors hover:bg-gradient-to-r hover:from-orange-50 hover:to-transparent focus-visible:bg-orange-50"
                  >
                    <td className="relative px-6 py-4">
                      <span className="absolute left-0 inset-y-3 w-1 rounded-r-full bg-gradient-to-b from-orange-400 to-amber-500 scale-y-0 group-hover:scale-y-100 group-focus-visible:scale-y-100 origin-center transition-transform duration-200" />
                      <div className="flex items-center gap-3">
                        <div
                          className={`w-11 h-11 shrink-0 rounded-full flex items-center justify-center font-bold text-sm ring-4 ring-white shadow-[0_4px_14px_-4px_rgba(0,0,0,0.15)] transition-transform duration-200 group-hover:scale-110 group-hover:-rotate-6 ${avatarStyle(sub.user_id || sub.email)}`}
                        >
                          {initials(sub.first_name, sub.last_name)}
                        </div>
                        <div className="min-w-0">
                          <p className="font-bold text-gray-900 truncate">
                            {sub.first_name} {sub.last_name}
                          </p>
                          <p className="text-xs text-gray-500 truncate">{sub.email}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <p className="font-bold text-gray-900">{sub.plan_name}</p>
                      <p className="text-xs text-gray-500 tabular-nums">
                        Rs {Number(sub.plan_price).toLocaleString()}
                      </p>
                    </td>
                    <td className="px-6 py-4">
                      <StatusBadge status={sub.status} />
                    </td>
                    <td className="px-6 py-4">
                      <p className="text-gray-700">
                        {new Date(sub.expires_at).toLocaleDateString("en-US", {
                          month: "short",
                          day: "numeric",
                          year: "numeric",
                        })}
                      </p>
                      <p className="text-xs text-gray-400">{daysLeftLabel(sub.expires_at)}</p>
                    </td>
                    <td className="px-6 py-4 text-right">
                      {/* Fixed-width slot: the pill grows inside it, so nothing else shifts */}
                      <div className="ml-auto flex w-[92px] justify-end">
                      <span
                        aria-hidden
                        className="inline-flex items-center gap-0 group-hover:gap-1.5 px-2.5 py-2 rounded-xl bg-orange-50 border border-orange-100 text-orange-500 shadow-sm transition-all duration-200 group-hover:bg-gradient-to-r group-hover:from-orange-500 group-hover:to-amber-500 group-hover:border-transparent group-hover:text-white group-hover:shadow-lg group-hover:shadow-orange-500/30 group-hover:-translate-y-0.5 group-hover:scale-105"
                      >
                        <Eye className="w-4 h-4" />
                        <span className="max-w-0 overflow-hidden whitespace-nowrap text-xs font-bold opacity-0 transition-all duration-200 group-hover:max-w-[3rem] group-hover:opacity-100">
                          View
                        </span>
                      </span>
                      </div>
                    </td>
                  </motion.tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Pagination */}
      {!isLoading && meta.total_pages > 1 && (
        <div className="flex items-center justify-center gap-4 pt-2">
          <button
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            disabled={meta.page === 1}
            aria-label="Previous page"
            className="p-2.5 rounded-xl border border-gray-200 bg-white text-gray-600 hover:bg-orange-50 hover:text-orange-600 hover:border-orange-200 disabled:opacity-40 disabled:cursor-not-allowed transition-colors cursor-pointer shadow-sm"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>
          <span className="text-sm font-medium text-gray-600 font-[family-name:var(--font-body)]">
            Page {meta.page} of {meta.total_pages}
          </span>
          <button
            onClick={() => setPage((p) => Math.min(meta.total_pages, p + 1))}
            disabled={meta.page === meta.total_pages}
            aria-label="Next page"
            className="p-2.5 rounded-xl border border-gray-200 bg-white text-gray-600 hover:bg-orange-50 hover:text-orange-600 hover:border-orange-200 disabled:opacity-40 disabled:cursor-not-allowed transition-colors cursor-pointer shadow-sm"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      )}

      <AnimatePresence>
        {selectedSub && (
          <SubscriptionModal subscription={selectedSub} onClose={() => setSelectedSub(null)} />
        )}
      </AnimatePresence>
    </div>
  );
}