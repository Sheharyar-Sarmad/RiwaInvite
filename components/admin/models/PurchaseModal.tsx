"use client";

import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { X, Loader2, Image as ImageIcon, User, Calendar, CreditCard } from "lucide-react";
import { apiClient } from "@/lib/api/api_base";

type PurchaseDetails = {
  id: string;
  price_paid: number;
  purchased_at: string;
  first_name: string;
  last_name: string;
  email: string;
  phone_number: string | null;
  template_name: string;
  thumbnail_url: string;
  template_original_price: number;
};

export function PurchaseModal({ id, onClose }: { id: string; onClose: () => void }) {
  const [data, setData] = useState<PurchaseDetails | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchDetails = async () => {
      try {
        const res = await apiClient.get(`/admin/dashboard/purchases/${id}`);
        setData(res.data.data);
      } catch (e) {
        console.error(e);
      } finally {
        setIsLoading(false);
      }
    };
    fetchDetails();
  }, [id]);

  return (
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
        data-lenis-prevent
        className="relative bg-[#fffafb] rounded-[2rem] p-6 md:p-8 w-full max-w-lg shadow-2xl z-10 border border-white max-h-[90vh] overflow-y-auto no-scrollbar"
      >
        <div className="absolute inset-0 z-0 opacity-[0.03] pointer-events-none rounded-[2rem]" 
             style={{ backgroundImage: 'radial-gradient(#f97316 1px, transparent 1px)', backgroundSize: '24px 24px' }} 
        />

        <div className="relative z-10">
          <div className="flex justify-between items-start mb-6">
            <h2 className="text-xl font-bold text-gray-900 font-[family-name:var(--font-display)]">Purchase Receipt</h2>
            <button onClick={onClose} className="p-2 bg-white/80 hover:bg-gray-100 rounded-full text-gray-500 transition-colors cursor-pointer border border-gray-100 shadow-sm">
              <X className="w-4 h-4" />
            </button>
          </div>

          {isLoading ? (
            <div className="flex justify-center py-20"><Loader2 className="w-8 h-8 animate-spin text-orange-500" /></div>
          ) : !data ? (
            <p className="text-center text-gray-500 py-10">Failed to load purchase data.</p>
          ) : (
            <div className="space-y-6">
              {/* Template Card */}
              <div className="bg-white/60 backdrop-blur-sm p-4 rounded-2xl border border-gray-100 shadow-sm flex items-center gap-4">
                {data.thumbnail_url ? (
                  <img src={data.thumbnail_url} alt={data.template_name} className="w-16 h-16 rounded-xl object-cover border border-gray-200" />
                ) : (
                  <div className="w-16 h-16 rounded-xl bg-orange-100 text-orange-500 flex items-center justify-center">
                    <ImageIcon className="w-8 h-8" />
                  </div>
                )}
                <div>
                  <p className="text-xs font-bold text-gray-400 uppercase font-[family-name:var(--font-display)] mb-1">Template Owned</p>
                  <h3 className="font-bold text-gray-900 text-lg font-[family-name:var(--font-display)]">{data.template_name}</h3>
                  <p className="text-sm font-bold text-orange-500">Rs {data.price_paid.toLocaleString()}</p>
                </div>
              </div>

              {/* User Details */}
              <div className="bg-white/60 p-5 rounded-2xl border border-gray-100 shadow-sm space-y-3">
                <h4 className="text-sm font-bold text-gray-900 mb-3 font-[family-name:var(--font-display)]">Buyer Details</h4>
                <div className="flex justify-between items-center pb-2 border-b border-gray-100">
                  <div className="flex items-center gap-2 text-sm font-medium text-gray-600">
                    <User className="w-4 h-4 text-gray-400" /> Name
                  </div>
                  <span className="text-sm font-bold text-gray-900">{data.first_name} {data.last_name}</span>
                </div>
                <div className="flex justify-between items-center pb-2 border-b border-gray-100">
                  <div className="flex items-center gap-2 text-sm font-medium text-gray-600">
                    <CreditCard className="w-4 h-4 text-gray-400" /> Email
                  </div>
                  <span className="text-sm font-bold text-gray-900">{data.email}</span>
                </div>
                <div className="flex justify-between items-center">
                  <div className="flex items-center gap-2 text-sm font-medium text-gray-600">
                    <Calendar className="w-4 h-4 text-gray-400" /> Purchase Date
                  </div>
                  <span className="text-sm font-bold text-gray-900">{new Date(data.purchased_at).toLocaleDateString()}</span>
                </div>
              </div>

              <button onClick={onClose} className="w-full py-3 bg-white border border-gray-200 hover:bg-gray-50 text-gray-700 font-bold rounded-xl transition-all cursor-pointer font-[family-name:var(--font-display)] shadow-sm">
                Close Receipt
              </button>
            </div>
          )}
        </div>
      </motion.div>
    </div>
  );
}