"use client";

import { useState, useEffect } from "react";
import { Search, ChevronLeft, ChevronRight, Eye, BookOpen, Monitor, X, Inbox } from "lucide-react";
import { toast } from "@/components/ui/toast";
import { apiClient } from "@/lib/api/api_base";
import { motion, AnimatePresence } from "framer-motion";
import { AceternitySelect } from "@/components/ui/aceternity-select";
import { InvitationModal } from "@/components/admin/models/InvitationModal";
import { InvitationGuideModal } from "@/components/admin/models/InvitationGuideModal";
import { InvitationPreviewModal } from "@/components/admin/models/InvitationPreviewModal";

export type Invitation = {
  id: string;
  title: string;
  slug: string;
  event_date: string;
  status: string;
  created_at: string;
  is_custom_slug: boolean;
  user_id: string;
  first_name: string;
  last_name: string;
  email: string;
  template_name: string | null;
};

const STATUS_OPTIONS = [
  { label: "All status", value: "all" },
  { label: "Draft", value: "draft" },
  { label: "Published", value: "published" },
  { label: "Expired", value: "expired" },
  { label: "Archived", value: "archived" },
];

const LIMIT = 10;

export const getInvitationStatusColor = (status: string) => {
  switch (status) {
    case "published": return "bg-emerald-100 text-emerald-700 border-emerald-200";
    case "draft": return "bg-gray-100 text-gray-600 border-gray-200";
    case "expired": return "bg-amber-100 text-amber-700 border-amber-200";
    case "archived": return "bg-red-100 text-red-700 border-red-200";
    default: return "bg-gray-100 text-gray-600 border-gray-200";
  }
};

const formatDate = (value: string) => {
  const d = new Date(value);
  return Number.isNaN(d.getTime())
    ? "—"
    : d.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
};

function SkeletonRows() {
  return (
    <>
      {Array.from({ length: 6 }).map((_, i) => (
        <tr key={i} className="animate-pulse">
          <td className="px-6 py-4"><div className="h-3.5 w-40 rounded bg-gray-200/70" /><div className="mt-2 h-2.5 w-24 rounded bg-gray-100" /></td>
          <td className="px-6 py-4"><div className="flex items-center gap-2"><div className="h-6 w-6 rounded-full bg-gray-200/70" /><div className="h-3 w-36 rounded bg-gray-200/70" /></div></td>
          <td className="px-6 py-4"><div className="h-3 w-28 rounded bg-gray-200/70" /></td>
          <td className="px-6 py-4"><div className="h-3 w-24 rounded bg-gray-200/70" /></td>
          <td className="px-6 py-4"><div className="h-6 w-20 rounded-md bg-gray-200/70" /></td>
          <td className="px-6 py-4"><div className="ml-auto h-8 w-28 rounded-lg bg-gray-200/70" /></td>
        </tr>
      ))}
    </>
  );
}

function RowActionChooser({
  invitation,
  onPreview,
  onDetails,
  onClose,
}: {
  invitation: Invitation;
  onPreview: () => void;
  onDetails: () => void;
  onClose: () => void;
}) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  const options = [
    { label: "Live preview", hint: "See it exactly as guests do", Icon: Monitor, onClick: onPreview },
    { label: "View details", hint: "Owner, slug, status and link", Icon: Eye, onClick: onDetails },
  ];

  return (
    <div data-lenis-prevent className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={onClose}
        className="absolute inset-0 cursor-pointer bg-gray-900/50 backdrop-blur-sm"
      />
      <motion.div
        role="dialog"
        aria-modal="true"
        aria-label="Choose an action"
        initial={{ opacity: 0, scale: 0.95, y: 12 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 12 }}
        transition={{ type: "spring", damping: 28, stiffness: 340 }}
        className="relative z-10 w-full max-w-sm rounded-[1.75rem] border border-white bg-[#fffafb] p-5 shadow-2xl"
      >
        <div className="mb-4 flex items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="text-xs font-semibold text-gray-400 font-[family-name:var(--font-body)]">What would you like to open?</p>
            <h3 className="truncate text-base font-bold text-gray-900 font-[family-name:var(--font-display)]">{invitation.title}</h3>
          </div>
          <button
            onClick={onClose}
            aria-label="Close"
            className="rounded-full border border-gray-100 bg-white p-1.5 text-gray-500 shadow-sm transition-all hover:-translate-y-0.5 hover:text-gray-800 cursor-pointer"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="space-y-2.5">
          {options.map(({ label, hint, Icon, onClick }) => (
            <button
              key={label}
              onClick={onClick}
              className="group flex w-full items-center gap-3 rounded-2xl border border-orange-100/50 bg-white/70 p-3.5 text-left shadow-sm backdrop-blur-xl transition-all hover:-translate-y-0.5 hover:border-orange-200 hover:bg-orange-50/60 cursor-pointer"
            >
              <div className="rounded-xl bg-orange-100 p-2.5 text-orange-600 shadow-inner transition-colors group-hover:bg-orange-500 group-hover:text-white">
                <Icon className="h-5 w-5" />
              </div>
              <div>
                <p className="text-sm font-bold text-gray-900 font-[family-name:var(--font-display)]">{label}</p>
                <p className="text-xs text-gray-500 font-[family-name:var(--font-body)]">{hint}</p>
              </div>
            </button>
          ))}
        </div>
      </motion.div>
    </div>
  );
}

export function InvitationsClient() {
  const [invitations, setInvitations] = useState<Invitation[]>([]);
  const [meta, setMeta] = useState({ page: 1, limit: LIMIT, total: 0, total_pages: 1 });
  const [isLoading, setIsLoading] = useState(true);

  const [searchInput, setSearchInput] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [page, setPage] = useState(1);
  const [statusFilter, setStatusFilter] = useState("all");

  // Modal state
  const [selectedInvitation, setSelectedInvitation] = useState<Invitation | null>(null);
  const [isDetailsOpen, setIsDetailsOpen] = useState(false);
  const [isPreviewOpen, setIsPreviewOpen] = useState(false);
  const [isGuideOpen, setIsGuideOpen] = useState(false);
  const [isChooserOpen, setIsChooserOpen] = useState(false);

  // Debounce search
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(searchInput.trim());
      setPage(1);
    }, 500);
    return () => clearTimeout(timer);
  }, [searchInput]);

  // Fetch (cancel stale responses so fast typing can't show old results)
  useEffect(() => {
    let cancelled = false;

    (async () => {
      setIsLoading(true);
      try {
        const params = new URLSearchParams({
          page: page.toString(),
          limit: LIMIT.toString(),
          ...(debouncedSearch && { search: debouncedSearch }),
          ...(statusFilter !== "all" && { status: statusFilter }),
        });
        const res = await apiClient.get(`/admin/dashboard/invitations?${params.toString()}`);
        if (cancelled) return;
        setInvitations(res.data.data);
        setMeta(res.data.meta);
      } catch {
        if (!cancelled) toast.add({ title: "Error", description: "Failed to load invitations.", type: "error" });
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [page, debouncedSearch, statusFilter]);

  const openDetails = (e: React.MouseEvent, invitation: Invitation) => {
    e.stopPropagation();
    setSelectedInvitation(invitation);
    setIsDetailsOpen(true);
  };

  const openPreview = (e: React.MouseEvent, invitation: Invitation) => {
    e.stopPropagation();
    setSelectedInvitation(invitation);
    setIsPreviewOpen(true);
  };

  const openChooser = (invitation: Invitation) => {
    setSelectedInvitation(invitation);
    setIsChooserOpen(true);
  };

  const hasFilters = !!searchInput || statusFilter !== "all";
  const clearFilters = () => {
    setSearchInput("");
    setDebouncedSearch("");
    setStatusFilter("all");
    setPage(1);
  };

  return (
    <div className="space-y-6">
      {/* Toolbar */}
      <div className="flex flex-col items-start justify-between gap-4 sm:flex-row sm:items-center">
        <div className="flex w-full flex-col items-center gap-3 sm:flex-row lg:max-w-2xl">
          <div className="group relative w-full flex-1">
            <Search className="pointer-events-none absolute left-4 top-1/2 z-10 h-5 w-5 -translate-y-1/2 text-orange-400 transition-colors duration-300 group-focus-within:text-orange-600" />
            <input
              type="text"
              placeholder="Search by title, slug, or user email…"
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              aria-label="Search invitations"
              className="w-full rounded-full border border-orange-100/60 bg-white/80 py-3 pl-11 pr-10 text-sm font-medium text-gray-800 shadow-[0_2px_15px_-5px_rgba(249,115,22,0.15)] backdrop-blur-xl transition-all placeholder:text-gray-400 focus:border-orange-300 focus:outline-none focus:ring-4 focus:ring-orange-500/10 font-[family-name:var(--font-body)]"
            />
            <AnimatePresence>
              {searchInput && (
                <motion.button
                  initial={{ opacity: 0, scale: 0.7 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.7 }}
                  onClick={() => setSearchInput("")}
                  aria-label="Clear search"
                  className="absolute right-3 top-1/2 z-10 -translate-y-1/2 rounded-full p-1 text-gray-400 transition-colors hover:bg-gray-100 hover:text-gray-700 cursor-pointer"
                >
                  <X className="h-4 w-4" />
                </motion.button>
              )}
            </AnimatePresence>
          </div>
          <div className="w-full shrink-0 sm:w-[180px]">
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
        </div>

        <button
          onClick={() => setIsGuideOpen(true)}
          className="flex shrink-0 items-center justify-center gap-2 rounded-xl border border-gray-200 bg-white px-4 py-2.5 text-sm font-bold text-gray-700 shadow-sm transition-all hover:-translate-y-0.5 hover:bg-gray-50 cursor-pointer font-[family-name:var(--font-display)]"
        >
          <BookOpen className="h-4 w-4 text-gray-500" /> Guide
        </button>
      </div>

      {/* Table */}
      {!isLoading && invitations.length === 0 ? (
        <div className="flex flex-col items-center rounded-2xl border border-dashed border-orange-200/70 bg-white/50 py-20 text-center backdrop-blur-md">
          <div className="mb-3 rounded-2xl border border-orange-100 bg-orange-50 p-3 text-orange-500">
            <Inbox className="h-6 w-6" />
          </div>
          <p className="text-base font-bold text-gray-800 font-[family-name:var(--font-display)]">No invitations found</p>
          <p className="mt-1 text-sm text-gray-500 font-[family-name:var(--font-body)]">
            {hasFilters ? "Nothing matches your search or filter." : "Invitations created by users will show up here."}
          </p>
          {hasFilters && (
            <button
              onClick={clearFilters}
              className="mt-4 rounded-lg border border-gray-200 bg-white px-3 py-1.5 text-xs font-bold text-gray-700 shadow-sm transition-all hover:-translate-y-0.5 hover:text-orange-600 cursor-pointer"
            >
              Clear filters
            </button>
          )}
        </div>
      ) : (
        <div className="overflow-hidden rounded-2xl border border-orange-100/50 bg-white/70 shadow-sm backdrop-blur-xl">
          <div data-lenis-prevent className="no-scrollbar overflow-x-auto">
            <table className="w-full min-w-[860px] text-left text-sm">
              <thead className="border-b border-gray-200 bg-gray-50/80 text-xs text-gray-500 font-[family-name:var(--font-display)]">
                <tr>
                  <th className="px-6 py-4 font-bold">Event title</th>
                  <th className="px-6 py-4 font-bold">User</th>
                  <th className="px-6 py-4 font-bold">Slug</th>
                  <th className="px-6 py-4 font-bold">Event date</th>
                  <th className="px-6 py-4 font-bold">Status</th>
                  <th className="px-6 py-4 text-right font-bold">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 font-[family-name:var(--font-body)]">
                {isLoading ? (
                  <SkeletonRows />
                ) : (
                  invitations.map((inv, index) => {
                    const initials = `${inv.first_name?.[0] ?? ""}${inv.last_name?.[0] ?? ""}`.toUpperCase() || "?";
                    return (
                      <motion.tr
                        key={inv.id}
                        initial={{ opacity: 0, y: 8 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: index * 0.03 }}
                        onClick={() => openChooser(inv)}
                        onKeyDown={(e) => {
                          if (e.target === e.currentTarget && (e.key === "Enter" || e.key === " ")) {
                            e.preventDefault();
                            openChooser(inv);
                          }
                        }}
                        tabIndex={0}
                        aria-label={`Open options for ${inv.title}`}
                        className="group cursor-pointer transition-colors hover:bg-orange-50/50 focus-visible:bg-orange-50/60 focus-visible:outline-none"
                      >
                        <td className="px-6 py-4">
                          <p className="font-bold text-gray-900">{inv.title}</p>
                          <p className="text-xs text-gray-500">{inv.template_name || "Custom design"}</p>
                        </td>
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-2">
                            <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-orange-100 text-xs font-bold text-orange-600">
                              {initials}
                            </div>
                            <span className="text-gray-700">{inv.email}</span>
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <span className="flex items-center gap-1.5 font-mono text-xs text-gray-600">
                            /{inv.slug}
                            {inv.is_custom_slug && (
                              <span className="rounded bg-orange-100 px-1 text-[9px] font-bold text-orange-600">PRO</span>
                            )}
                          </span>
                        </td>
                        <td className="px-6 py-4 text-gray-600">{formatDate(inv.event_date)}</td>
                        <td className="px-6 py-4">
                          <span className={`rounded-md border px-2.5 py-1 text-[11px] font-bold uppercase tracking-wider ${getInvitationStatusColor(inv.status)}`}>
                            {inv.status}
                          </span>
                        </td>
                        <td className="px-6 py-4 text-right">
                          <div className="flex items-center justify-end gap-2">
                            <button
                              onClick={(e) => openPreview(e, inv)}
                              title="Live preview"
                              className="flex items-center gap-1.5 rounded-lg border border-gray-200 bg-white px-3 py-1.5 text-xs font-bold text-gray-600 shadow-sm transition-all hover:-translate-y-0.5 hover:bg-gray-50 hover:text-orange-600 cursor-pointer"
                            >
                              <Monitor className="h-3.5 w-3.5" /> Preview
                            </button>
                            <button
                              onClick={(e) => openDetails(e, inv)}
                              title="View details"
                              aria-label={`View details for ${inv.title}`}
                              className="rounded-lg border border-gray-200 bg-white p-2 text-gray-500 shadow-sm transition-all hover:-translate-y-0.5 hover:border-orange-200 hover:bg-orange-50 hover:text-orange-600 cursor-pointer"
                            >
                              <Eye className="h-4 w-4" />
                            </button>
                          </div>
                        </td>
                      </motion.tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Pagination */}
      {!isLoading && meta.total > 0 && meta.total_pages > 1 && (
        <div className="flex items-center justify-between border-t border-gray-200/60 pt-4">
          <p className="text-sm text-gray-500 font-[family-name:var(--font-body)]">
            Showing <span className="font-bold text-gray-900">{(meta.page - 1) * meta.limit + 1}</span> to{" "}
            <span className="font-bold text-gray-900">{Math.min(meta.page * meta.limit, meta.total)}</span> of{" "}
            <span className="font-bold text-gray-900">{meta.total}</span> invitations
          </p>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page === 1}
              aria-label="Previous page"
              className="rounded-lg border border-gray-200 bg-white p-2 text-gray-600 transition-colors hover:bg-gray-50 hover:text-orange-500 disabled:cursor-not-allowed disabled:opacity-50 cursor-pointer"
            >
              <ChevronLeft className="h-4 w-4" />
            </button>
            <span className="px-2 text-sm font-medium text-gray-700 font-[family-name:var(--font-body)]">
              Page {meta.page} of {meta.total_pages}
            </span>
            <button
              onClick={() => setPage((p) => Math.min(meta.total_pages, p + 1))}
              disabled={page >= meta.total_pages}
              aria-label="Next page"
              className="rounded-lg border border-gray-200 bg-white p-2 text-gray-600 transition-colors hover:bg-gray-50 hover:text-orange-500 disabled:cursor-not-allowed disabled:opacity-50 cursor-pointer"
            >
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>
        </div>
      )}

      {/* Modals — each is a direct child of AnimatePresence so exit animations run */}
      <AnimatePresence>
        {isGuideOpen && <InvitationGuideModal key="guide" onClose={() => setIsGuideOpen(false)} />}

        {isChooserOpen && selectedInvitation && (
          <RowActionChooser
            key="chooser"
            invitation={selectedInvitation}
            onClose={() => setIsChooserOpen(false)}
            onPreview={() => {
              setIsChooserOpen(false);
              setIsPreviewOpen(true);
            }}
            onDetails={() => {
              setIsChooserOpen(false);
              setIsDetailsOpen(true);
            }}
          />
        )}

        {isPreviewOpen && selectedInvitation && (
          <InvitationPreviewModal
            key="preview"
            invitation={selectedInvitation}
            onClose={() => setIsPreviewOpen(false)}
          />
        )}

        {isDetailsOpen && selectedInvitation && (
          <InvitationModal
            key="details"
            invitation={selectedInvitation}
            onClose={() => setIsDetailsOpen(false)}
            onPreview={() => {
              setIsDetailsOpen(false);
              setIsPreviewOpen(true);
            }}
          />
        )}
      </AnimatePresence>
    </div>
  );
}