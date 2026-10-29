"use client";

import { useState, useEffect } from "react";
import { Search, Loader2, ChevronLeft, ChevronRight, Eye, BookOpen } from "lucide-react";
import { toast } from "@/components/ui/toast";
import { apiClient } from "@/lib/api/api_base";
import { motion, AnimatePresence } from "framer-motion";
import { AceternitySelect } from "@/components/ui/aceternity-select";
import { OrderModal } from "@/components/admin/models/OrderModal";
import { OrderGuideModal } from "@/components/admin/models/OrderGuideModal";

export type Order = {
  id: string;
  provider: string;
  provider_order_id: string;
  amount: number;
  order_type: string;
  status: string;
  created_at: string;
  user_id: string;
  first_name: string;
  last_name: string;
  email: string;
};

const STATUS_OPTIONS = [
  { label: "All Status", value: "all" },
  { label: "Pending", value: "pending" },
  { label: "Completed", value: "completed" },
  { label: "Failed", value: "failed" },
];

export const getOrderStatusColor = (status: string) => {
  switch (status) {
    case "completed": return "bg-emerald-100 text-emerald-700 border-emerald-200";
    case "pending": return "bg-amber-100 text-amber-700 border-amber-200";
    case "failed": return "bg-red-100 text-red-700 border-red-200";
    default: return "bg-gray-100 text-gray-600 border-gray-200";
  }
};

export function OrdersClient() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [meta, setMeta] = useState({ page: 1, limit: 10, total: 0, total_pages: 1 });
  const [isLoading, setIsLoading] = useState(true);
  
  const [searchInput, setSearchInput] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [page, setPage] = useState(1);
  const [statusFilter, setStatusFilter] = useState("all");

  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isGuideOpen, setIsGuideOpen] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(searchInput);
      setPage(1);
    }, 500);
    return () => clearTimeout(timer);
  }, [searchInput]);

  const fetchOrders = async () => {
    setIsLoading(true);
    try {
      const params = new URLSearchParams({
        page: page.toString(),
        limit: meta.limit.toString(),
        ...(debouncedSearch && { search: debouncedSearch }),
        ...(statusFilter !== "all" && { status: statusFilter }),
      });

      const res = await apiClient.get(`/admin/dashboard/orders?${params.toString()}`);
      setOrders(res.data.data);
      setMeta(res.data.meta);
    } catch (e) {
      toast.add({ title: "Error", description: "Failed to load orders.", type: "error" });
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchOrders();
  }, [page, debouncedSearch, statusFilter, meta.limit]);

  const handleView = (order: Order) => {
    setSelectedOrder(order);
    setIsModalOpen(true);
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div className="flex flex-col sm:flex-row items-center gap-3 w-full lg:max-w-2xl">
          <div className="relative flex-1 w-full group">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-orange-400 z-10 pointer-events-none group-focus-within:text-orange-600 transition-colors duration-300" />
            <input
              type="text"
              placeholder="Search by email, name, or Order ID..."
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              className="w-full pl-11 pr-4 py-3 bg-white/80 backdrop-blur-xl border border-orange-100/60 rounded-full text-sm font-medium text-gray-800 placeholder:text-gray-400 focus:outline-none focus:ring-4 focus:ring-orange-500/10 focus:border-orange-300 shadow-[0_2px_15px_-5px_rgba(249,115,22,0.15)] transition-all font-[family-name:var(--font-body)]"
            />
          </div>
          <div className="w-full sm:w-[180px] shrink-0">
            <AceternitySelect
              value={statusFilter}
              onChange={(val) => { setStatusFilter(val); setPage(1); }}
              options={STATUS_OPTIONS}
              className="h-[46px]"
            />
          </div>
        </div>

        <button 
          onClick={() => setIsGuideOpen(true)} 
          className="flex items-center justify-center gap-2 bg-white border border-gray-200 hover:bg-gray-50 text-gray-700 px-4 py-2.5 rounded-xl text-sm font-bold shadow-sm transition-all hover:-translate-y-0.5 cursor-pointer shrink-0 font-[family-name:var(--font-display)]"
        >
          <BookOpen className="w-4 h-4 text-gray-500" /> Guide
        </button>
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center h-64 text-orange-500">
          <Loader2 className="w-8 h-8 animate-spin" />
        </div>
      ) : orders.length === 0 ? (
        <div className="text-center py-20 bg-white/50 backdrop-blur-md rounded-2xl border border-gray-200 border-dashed">
          <p className="text-gray-500 text-lg font-[family-name:var(--font-body)]">No orders found.</p>
        </div>
      ) : (
        <div className="bg-white/70 backdrop-blur-xl border border-gray-200 rounded-2xl shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-gray-50/80 text-gray-600 border-b border-gray-200 font-[family-name:var(--font-display)]">
                <tr>
                  <th className="px-6 py-4 font-bold">User</th>
                  <th className="px-6 py-4 font-bold">Order ID / Type</th>
                  <th className="px-6 py-4 font-bold">Amount</th>
                  <th className="px-6 py-4 font-bold">Status</th>
                  <th className="px-6 py-4 font-bold">Date</th>
                  <th className="px-6 py-4 font-bold text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 font-[family-name:var(--font-body)]">
                {orders.map((order, index) => (
                  <motion.tr 
                    key={order.id}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: index * 0.03 }}
                    // 🟢 Added onClick and cursor-pointer to make the whole row clickable
                    onClick={() => handleView(order)}
                    className="hover:bg-orange-50/50 transition-colors group cursor-pointer"
                  >
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-orange-100 text-orange-600 flex items-center justify-center font-bold">
                          {order.first_name[0]}{order.last_name[0]}
                        </div>
                        <div>
                          <p className="font-bold text-gray-900 group-hover:text-orange-600 transition-colors">{order.first_name} {order.last_name}</p>
                          <p className="text-xs text-gray-500">{order.email}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <p className="font-bold text-gray-900 capitalize">{order.order_type.replace("_", " ")}</p>
                      <p className="text-xs text-gray-500 font-mono">
                        {order.provider_order_id.slice(0, 15)}...
                      </p>
                    </td>
                    <td className="px-6 py-4">
                      <p className="font-bold text-gray-900">Rs {order.amount.toLocaleString()}</p>
                    </td>
                    <td className="px-6 py-4">
                      <span className={`px-2.5 py-1 rounded-md text-[11px] font-bold uppercase tracking-wider border ${getOrderStatusColor(order.status)}`}>
                        {order.status}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-gray-600">
                      {new Date(order.created_at).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
                    </td>
                    <td className="px-6 py-4 text-right">
                      <button
                        // Kept the eye button as a visual indicator, but it now just triggers the same row click
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
            Showing <span className="font-bold text-gray-900">{(meta.page - 1) * meta.limit + 1}</span> to <span className="font-bold text-gray-900">{Math.min(meta.page * meta.limit, meta.total)}</span> of <span className="font-bold text-gray-900">{meta.total}</span> orders
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

      <AnimatePresence mode="wait">
        {isGuideOpen ? (
          <OrderGuideModal key="guide" onClose={() => setIsGuideOpen(false)} />
        ) : isModalOpen && selectedOrder ? (
          <OrderModal 
            key="order-modal"
            order={selectedOrder} 
            onClose={() => setIsModalOpen(false)} 
            onUpdate={() => {
              setIsModalOpen(false);
              fetchOrders();
            }}
          />
        ) : null}
      </AnimatePresence>
    </div>
  );
}