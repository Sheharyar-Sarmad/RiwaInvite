"use client";

import { motion } from "framer-motion";
import { AlertTriangle, Trash2, Loader2 } from "lucide-react";

type Props = {
  targetType: "single" | "all";
  onClose: () => void;
  onConfirm: () => Promise<void>;
  isDeleting: boolean;
};

export function DeleteNotificationModal({ targetType, onClose, onConfirm, isDeleting }: Props) {
  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 sm:p-6">
      <motion.div 
        initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
        onClick={!isDeleting ? onClose : undefined}
        className={`absolute inset-0 bg-gray-900/60 backdrop-blur-md ${!isDeleting ? "cursor-pointer" : ""}`} 
      />
      
      <motion.div 
        initial={{ opacity: 0, scale: 0.95, y: 20 }} 
        animate={{ opacity: 1, scale: 1, y: 0 }} 
        exit={{ opacity: 0, scale: 0.95, y: 20 }}
        className="relative bg-[#fffafb] rounded-[2rem] p-6 md:p-8 w-full max-w-sm shadow-2xl z-10 border border-white overflow-hidden text-center"
      >
        <div className="absolute inset-0 z-0 opacity-[0.03] pointer-events-none rounded-[2rem]" 
             style={{ backgroundImage: 'radial-gradient(#ef4444 1px, transparent 1px)', backgroundSize: '24px 24px' }} 
        />

        <div className="relative z-10 flex flex-col items-center">
          <div className="w-16 h-16 bg-red-100 text-red-600 rounded-full flex items-center justify-center mb-5 shadow-inner">
            <AlertTriangle className="w-8 h-8" />
          </div>
          
          <h2 className="text-xl font-bold text-gray-900 mb-2 font-[family-name:var(--font-display)]">
            {targetType === "all" ? "Delete all notifications?" : "Delete notification?"}
          </h2>
          
          <p className="text-sm text-gray-500 mb-6 font-[family-name:var(--font-body)]">
            {targetType === "all" 
              ? "This will permanently remove all your notification history. This action cannot be undone." 
              : "This notification will be permanently removed. This action cannot be undone."}
          </p>

          <div className="flex gap-3 w-full">
            <button 
              onClick={onClose}
              disabled={isDeleting}
              className="flex-1 py-3 bg-white border border-gray-200 hover:bg-gray-50 text-gray-700 font-bold rounded-xl transition-all cursor-pointer font-[family-name:var(--font-display)] disabled:opacity-50"
            >
              Cancel
            </button>
            <button 
              onClick={onConfirm}
              disabled={isDeleting}
              className="flex-1 py-3 bg-red-500 hover:bg-red-600 text-white font-bold rounded-xl transition-all shadow-lg shadow-red-500/25 cursor-pointer font-[family-name:var(--font-display)] flex items-center justify-center gap-2 disabled:opacity-70 disabled:cursor-not-allowed"
            >
              {isDeleting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />}
              Delete
            </button>
          </div>
        </div>
      </motion.div>
    </div>
  );
}