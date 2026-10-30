"use client";

import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { 
  X, Loader2, CreditCard, ShoppingBag, Save, AlertCircle
} from "lucide-react";
import { toast } from "@/components/ui/toast";
import { apiClient } from "@/lib/api/api_base";
import { getOrderStatusColor, Order } from "@/components/admin/sections/orders/OrdersClient";
import { AceternitySelect } from "@/components/ui/aceternity-select";

type OrderItem = {
  id: string;
  item_type: string;
  item_id: string;
  price: number;
};

const UPDATE_STATUS_OPTIONS = [
  { label: "Pending", value: "pending" },
  { label: "Completed", value: "completed" },
  { label: "Failed", value: "failed" },
];

export function OrderModal({ order, onClose, onUpdate }: { order: Order; onClose: () => void; onUpdate: () => void }) {
  const [items, setItems] = useState<OrderItem[] | null>(null);
  const [isUpdating, setIsUpdating] = useState(false);
  const [newStatus, setNewStatus] = useState<string>(order.status);

  useEffect(() => {
    const fetchItems = async () => {
      try {
        const res = await apiClient.get(`/admin/dashboard/orders/${order.id}`);
        setItems(res.data.data.items);
      } catch (e) {
        toast.add({ title: "Error", description: "Failed to load order items.", type: "error" });
      }
    };
    fetchItems();
  }, [order.id]);

  const handleUpdateStatus = async () => {
    if (newStatus === order.status) return;
    setIsUpdating(true);
    try {
      await apiClient.patch(`/admin/dashboard/orders/${order.id}`, { status: newStatus });
      toast.add({ title: "Success", description: "Order status updated.", type: "success" });
      onUpdate();
    } catch (e: any) {
      toast.add({ title: "Error", description: e.response?.data?.error || "Failed to update status.", type: "error" });
    } finally {
      setIsUpdating(false);
    }
  };

  return (
    // 🟢 FIX 1: Add data-lenis-prevent to the outer wrapper
    <div data-lenis-prevent className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6">
      <motion.div 
        initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
        onClick={onClose}
        className="absolute inset-0 bg-gray-900/60 backdrop-blur-md cursor-pointer" 
      />
      
      <motion.div 
        initial={{ opacity: 0, scale: 0.95, y: 20 }} 
        animate={{ opacity: 1, scale: 1, y: 0 }} 
        exit={{ opacity: 0, scale: 0.95, y: 20 }}
        // 🟢 FIX 2: Add data-lenis-prevent to the scrollable modal body
        data-lenis-prevent
        className="relative bg-[#fffafb] rounded-[2rem] p-6 md:p-8 w-full max-w-xl shadow-2xl z-10 border border-white max-h-[90vh] overflow-y-auto no-scrollbar flex flex-col"
      >
        <div className="absolute inset-0 z-0 opacity-[0.03] pointer-events-none rounded-[2rem]" 
             style={{ backgroundImage: 'radial-gradient(#f97316 1px, transparent 1px)', backgroundSize: '24px 24px' }} 
        />

        <div className="relative z-10">
          <div className="flex justify-between items-start mb-6">
            <div className="flex items-center gap-3">
              <div className="p-2.5 bg-orange-100 text-orange-600 rounded-xl shadow-inner">
                <ShoppingBag className="w-5 h-5" />
              </div>
              <div>
                <h2 className="text-xl font-bold text-gray-900 font-[family-name:var(--font-display)]">Order Details</h2>
                <p className="text-xs text-gray-500 font-[family-name:var(--font-body)] mt-0.5">View receipt and manage status.</p>
              </div>
            </div>
            <button onClick={onClose} className="p-2 bg-white/80 hover:bg-gray-100 rounded-full text-gray-500 transition-colors cursor-pointer border border-gray-100 shadow-sm">
              <X className="w-4 h-4" />
            </button>
          </div>

          <div className="space-y-6">
            {/* User & Amount (Instantly Rendered) */}
            <div className="flex items-center justify-between bg-white/60 p-5 rounded-2xl border border-gray-100 shadow-sm">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-orange-100 text-orange-600 flex items-center justify-center font-bold">
                  {order.first_name[0]}{order.last_name[0]}
                </div>
                <div>
                  <h3 className="font-bold text-gray-900 font-[family-name:var(--font-display)]">{order.first_name} {order.last_name}</h3>
                  <p className="text-xs text-gray-500 font-[family-name:var(--font-body)]">{order.email}</p>
                </div>
              </div>
              <div className="text-right">
                <p className="text-xs font-bold text-gray-400 uppercase font-[family-name:var(--font-display)]">Total Amount</p>
                <p className="text-xl font-black text-orange-500">Rs {order.amount.toLocaleString()}</p>
              </div>
            </div>

            {/* Order Meta */}
            <div className="grid grid-cols-2 gap-4">
              <div className="bg-white/60 p-4 rounded-xl border border-gray-100 shadow-sm flex flex-col items-start justify-center gap-1">
                 <span className="text-xs font-bold text-gray-400 uppercase font-[family-name:var(--font-display)]">Order Type</span>
                 <span className="font-bold text-gray-900 capitalize">{order.order_type.replace("_", " ")}</span>
              </div>
              <div className="bg-white/60 p-4 rounded-xl border border-gray-100 shadow-sm flex flex-col items-start justify-center gap-1">
                 <span className="text-xs font-bold text-gray-400 uppercase font-[family-name:var(--font-display)]">Date</span>
                 <span className="font-bold text-gray-900">{new Date(order.created_at).toLocaleDateString()}</span>
              </div>
            </div>

            {/* Items List (Fetched in background) */}
            <div className="bg-white/60 p-5 rounded-2xl border border-gray-100 shadow-sm min-h-[100px]">
              <h4 className="text-sm font-bold text-gray-900 mb-3 font-[family-name:var(--font-display)]">Items Purchased</h4>
              {!items ? (
                <div className="flex items-center justify-center py-4 text-orange-500">
                  <Loader2 className="w-5 h-5 animate-spin" />
                </div>
              ) : (
                <div className="space-y-3">
                  {items.map((item) => (
                    <div key={item.id} className="flex justify-between items-center py-2 border-b border-gray-100 last:border-0">
                      <div className="flex items-center gap-2">
                        <div className="p-1.5 bg-gray-100 rounded text-gray-500"><CreditCard className="w-3.5 h-3.5" /></div>
                        <span className="text-sm font-medium text-gray-700 capitalize">{item.item_type.replace("_", " ")}</span>
                      </div>
                      <span className="text-sm font-bold text-gray-900">Rs {item.price.toLocaleString()}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Provider Info */}
            <div className="bg-gray-50/80 p-4 rounded-xl border border-gray-200 text-xs font-[family-name:var(--font-body)] space-y-2">
              <p className="flex justify-between"><span className="text-gray-500">Payment Provider:</span> <span className="font-bold text-gray-900 capitalize">{order.provider}</span></p>
              <p className="flex justify-between items-center">
                <span className="text-gray-500">Provider Order ID:</span> 
                <span className="font-mono text-gray-900 bg-white px-2 py-1 rounded border border-gray-200">{order.provider_order_id}</span>
              </p>
            </div>

            {/* Status Update Section using AceternitySelect */}
            <div className="bg-orange-50/50 p-5 rounded-2xl border border-orange-100 shadow-sm">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 text-orange-600" />
                  <h4 className="text-sm font-bold text-orange-900 font-[family-name:var(--font-display)]">Update Order Status</h4>
                </div>
                <span className={`px-2 py-1 rounded text-[10px] font-bold uppercase border ${getOrderStatusColor(order.status)}`}>
                  Current: {order.status}
                </span>
              </div>
              
              <div className="flex gap-3">
                <div className="flex-1">
                  <AceternitySelect
                    value={newStatus}
                    onChange={(val) => setNewStatus(val)}
                    options={UPDATE_STATUS_OPTIONS}
                    className="h-[42px]"
                  />
                </div>
                
                <button
                  onClick={handleUpdateStatus}
                  disabled={isUpdating || newStatus === order.status}
                  className="flex items-center gap-2 px-4 py-2.5 bg-orange-500 hover:bg-orange-600 text-white text-sm font-bold rounded-xl transition-all shadow-md disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
                >
                  {isUpdating ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                  Save
                </button>
              </div>
            </div>

            <button onClick={onClose} className="w-full py-3 bg-white border border-gray-200 hover:bg-gray-50 text-gray-700 font-bold rounded-xl transition-all cursor-pointer font-[family-name:var(--font-display)] shadow-sm">
              Close
            </button>
          </div>
        </div>
      </motion.div>
    </div>
  );
}