"use client";

import { useState, useEffect } from "react";
import { Search, Loader2, ChevronLeft, ChevronRight, Image as ImageIcon, Eye } from "lucide-react";
import { toast } from "@/components/ui/toast";
import { apiClient } from "@/lib/api/api_base";
import { motion, AnimatePresence } from "framer-motion";
import { PurchaseModal } from "@/components/admin/models/PurchaseModal";

export type Purchase = {
  id: string;
  price_paid: number;
  purchased_at: string;
  user_id: string;
  first_name: string;
  last_name: string;
  email: string;
  template_id: string;
  template_name: string;
  thumbnail_url: string;
};

export function PurchasesClient() {
  const [purchases, setPurchases] = useState<Purchase[]>([]);
  const [meta, setMeta] = useState({ page: 1, limit: 10, total: 0, total_pages: 1 });
  const [isLoading, setIsLoading] = useState(true);
  
  const [searchInput, setSearchInput] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [page, setPage] = useState(1);

  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(searchInput);
      setPage(1);
    }, 500);
    return () => clearTimeout(timer);
  }, [searchInput]);

  const fetchPurchases = async () => {
    setIsLoading(true);
    try {
      const params = new URLSearchParams({
        page: page.toString(),
        limit: meta.limit.toString(),
        ...(debouncedSearch && { search: debouncedSearch }),
      });

      const res = await apiClient.get(`/admin/dashboard/purchases?${params.toString()}`);
      setPurchases(res.data.data);
      setMeta(res.data.meta);
    } catch (e) {
      toast.add({ title: "Error", description: "Failed to load purchases.", type: "error" });
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchPurchases();
  }, [page, debouncedSearch, meta.limit]);

  const handleView = (id: string) => {
    setSelectedId(id);
    setIsModalOpen(true);
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row items-center gap-3 w-full lg:max-w-2xl">
        <div className="relative flex-1 w-full group">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-orange-400 z-10 pointer-events-none group-focus-within:text-orange-600 transition-colors duration-300" />
          <input
            type="text"
            placeholder="Search by user email or template name..."
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            className="w-full pl-11 pr-4 py-3 bg-white/80 backdrop-blur-xl border border-orange-100/60 rounded-full text-sm font-medium text-gray-800 placeholder:text-gray-400 focus:outline-none focus:ring-4 focus:ring-orange-500/10 focus:border-orange-300 shadow-[0_2px_15px_-5px_rgba(249,115,22,0.15)] transition-all font-[family-name:var(--font-body)]"
          />
        </div>
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center h-64 text-orange-500">
          <Loader2 className="w-8 h-8 animate-spin" />
        </div>
      ) : purchases.length === 0 ? (
        <div className="text-center py-20 bg-white/50 backdrop-blur-md rounded-2xl border border-gray-200 border-dashed">
          <p className="text-gray-500 text-lg font-[family-name:var(--font-body)]">No template purchases found.</p>
        </div>
      ) : (
        <div className="bg-white/70 backdrop-blur-xl border border-gray-200 rounded-2xl shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-gray-50/80 text-gray-600 border-b border-gray-200 font-[family-name:var(--font-display)]">
                <tr>
                  <th className="px-6 py-4 font-bold">User</th>
                  <th className="px-6 py-4 font-bold">Template Purchased</th>
                  <th className="px-6 py-4 font-bold">Price Paid</th>
                  <th className="px-6 py-4 font-bold">Purchase Date</th>
                  <th className="px-6 py-4 font-bold text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 font-[family-name:var(--font-body)]">
                {purchases.map((purchase, index) => (
                  <motion.tr 
                    key={purchase.id}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: index * 0.03 }}
                    onClick={() => handleView(purchase.id)}
                    className="hover:bg-orange-50/50 transition-colors group cursor-pointer"
                  >
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-orange-100 text-orange-600 flex items-center justify-center font-bold">
                          {purchase.first_name[0]}{purchase.last_name[0]}
                        </div>
                        <div>
                          <p className="font-bold text-gray-900 group-hover:text-orange-600 transition-colors">{purchase.first_name} {purchase.last_name}</p>
                          <p className="text-xs text-gray-500">{purchase.email}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        {purchase.thumbnail_url ? (
                          <img src={purchase.thumbnail_url} alt={purchase.template_name} className="w-10 h-10 rounded-lg object-cover border border-gray-200" />
                        ) : (
                          <div className="w-10 h-10 rounded-lg bg-gray-100 flex items-center justify-center text-gray-400">
                            <ImageIcon className="w-5 h-5" />
                          </div>
                        )}
                        <p className="font-bold text-gray-900">{purchase.template_name}</p>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <p className="font-bold text-gray-900">Rs {purchase.price_paid.toLocaleString()}</p>
                    </td>
                    <td className="px-6 py-4 text-gray-600">
                      {new Date(purchase.purchased_at).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
                    </td>
                    <td className="px-6 py-4 text-right">
                      <button
                        className="p-2 bg-white border border-gray-200 text-gray-500 group-hover:text-orange-600 group-hover:border-orange-200 group-hover:bg-orange-50 rounded-lg transition-all shadow-sm"
                        title="View Details"
                      >
                        <Eye className="w-4 h-4" />
                      </button>
                    </td>
                  </motion.tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {!isLoading && meta.total_pages > 1 && (
        <div className="flex items-center justify-between pt-4 border-t border-gray-200/60">
          <p className="text-sm text-gray-500 font-[family-name:var(--font-body)]">
            Showing <span className="font-bold text-gray-900">{(meta.page - 1) * meta.limit + 1}</span> to <span className="font-bold text-gray-900">{Math.min(meta.page * meta.limit, meta.total)}</span> of <span className="font-bold text-gray-900">{meta.total}</span> purchases
          </p>
          <div className="flex items-center gap-2">
            <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={meta.page === 1} className="p-2 rounded-lg border border-gray-200 bg-white text-gray-600 hover:bg-gray-50 hover:text-orange-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors cursor-pointer">
              <ChevronLeft className="w-4 h-4" />
            </button>
            <span className="text-sm font-medium text-gray-700 px-2 font-[family-name:var(--font-body)]">Page {meta.page} of {meta.total_pages}</span>
            <button onClick={() => setPage(p => Math.min(meta.total_pages, p + 1))} disabled={meta.page === meta.total_pages} className="p-2 rounded-lg border border-gray-200 bg-white text-gray-600 hover:bg-gray-50 hover:text-orange-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors cursor-pointer">
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      <AnimatePresence>
        {isModalOpen && selectedId && (
          <PurchaseModal 
            id={selectedId} 
            onClose={() => setIsModalOpen(false)} 
          />
        )}
      </AnimatePresence>
    </div>
  );
}