"use client";

import { motion } from "framer-motion";
import { X, ShieldAlert, CheckCircle2, Clock, XCircle, FileText, Lock } from "lucide-react";

export function OrderGuideModal({ onClose }: { onClose: () => void }) {
  return (
    <div  data-lenis-prevent className="fixed inset-0 z-[60] flex items-center justify-center p-4 sm:p-6">
      <motion.div 
        initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
        onClick={onClose}
        data-lenis-prevent
        className="absolute inset-0 bg-gray-900/60 backdrop-blur-md cursor-pointer" 
      />
      
      <motion.div 
        initial={{ opacity: 0, scale: 0.95, y: 20 }} 
        animate={{ opacity: 1, scale: 1, y: 0 }} 
        exit={{ opacity: 0, scale: 0.95, y: 20 }}
        className="relative bg-[#fffafb] rounded-[2rem] p-6 md:p-10 w-full max-w-2xl shadow-2xl z-10 border border-white max-h-[90vh] overflow-y-auto no-scrollbar"
      >
        <div className="absolute inset-0 z-0 opacity-[0.03] pointer-events-none rounded-[2rem]" 
             style={{ backgroundImage: 'radial-gradient(#f97316 1px, transparent 1px)', backgroundSize: '24px 24px' }} 
        />

        <div className="relative z-10">
          <div className="flex justify-between items-start mb-8">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-orange-100 text-orange-600 rounded-2xl shadow-inner">
                <FileText className="w-8 h-8" />
              </div>
              <div>
                <h2 className="text-2xl font-bold text-gray-900 font-[family-name:var(--font-display)]">
                  Orders Masterclass
                </h2>
                <p className="text-gray-500 mt-1 text-sm font-medium font-[family-name:var(--font-body)]">
                  How to manage transactions safely.
                </p>
              </div>
            </div>
            <button onClick={onClose} className="p-2 bg-gray-100/80 hover:bg-gray-200 rounded-full text-gray-600 transition-colors cursor-pointer">
              <X className="w-5 h-5" />
            </button>
          </div>

          <div className="space-y-6">
            {/* Status Meanings */}
            <div className="bg-white/60 p-6 rounded-2xl border border-orange-100/50 shadow-sm">
              <h3 className="text-lg font-bold text-gray-900 mb-4 font-[family-name:var(--font-display)]">Order Statuses</h3>
              <div className="space-y-4">
                <div className="flex items-start gap-3">
                  <Clock className="w-5 h-5 text-amber-500 shrink-0 mt-0.5" />
                  <div>
                    <strong className="text-sm text-gray-900 block font-[family-name:var(--font-display)]">Pending</strong>
                    <span className="text-xs text-gray-600 font-[family-name:var(--font-body)]">The user initiated checkout, but the payment provider hasn't confirmed the money yet. (Usually resolves automatically via webhook).</span>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <CheckCircle2 className="w-5 h-5 text-emerald-500 shrink-0 mt-0.5" />
                  <div>
                    <strong className="text-sm text-gray-900 block font-[family-name:var(--font-display)]">Completed</strong>
                    <span className="text-xs text-gray-600 font-[family-name:var(--font-body)]">Payment successful. The user has been granted access to the templates or subscription.</span>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <XCircle className="w-5 h-5 text-red-500 shrink-0 mt-0.5" />
                  <div>
                    <strong className="text-sm text-gray-900 block font-[family-name:var(--font-display)]">Failed</strong>
                    <span className="text-xs text-gray-600 font-[family-name:var(--font-body)]">The payment was declined, or the user abandoned the checkout. No access is granted.</span>
                  </div>
                </div>
              </div>
            </div>

            {/* No Delete Rule */}
            <div className="bg-red-50 p-6 rounded-2xl border border-red-100 shadow-sm relative overflow-hidden">
              <div className="absolute top-0 right-0 p-4 opacity-5 pointer-events-none">
                <Lock className="w-24 h-24 text-red-900" />
              </div>
              <div className="relative z-10 flex items-start gap-4">
                <ShieldAlert className="w-6 h-6 text-red-600 shrink-0" />
                <div>
                  <h3 className="text-md font-bold text-red-900 font-[family-name:var(--font-display)]">Why can't I delete an order?</h3>
                  <p className="text-sm text-red-800 mt-1 leading-relaxed font-[family-name:var(--font-body)]">
                    Orders are legal financial records. Deleting them destroys your audit trail and breaks the connection between a user's payment and their access. 
                    <br/><br/>
                    Instead of deleting, simply update the status to <strong>Failed</strong> if the transaction didn't go through.
                  </p>
                </div>
              </div>
            </div>
          </div>

          <div className="mt-8 flex justify-end">
            <button onClick={onClose} className="px-8 py-3 bg-gray-900 hover:bg-gray-800 text-white font-bold rounded-xl transition-all shadow-lg hover:-translate-y-0.5 cursor-pointer font-[family-name:var(--font-display)]">
              Understood
            </button>
          </div>
        </div>
      </motion.div>
    </div>
  );
}