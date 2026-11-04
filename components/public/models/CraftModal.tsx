"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, ArrowRight, MessageCircle, Globe, LayoutTemplate } from "lucide-react";
import { AceternitySelect } from "@/components/ui/aceternity-select";

const focusRing = "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-500 focus-visible:ring-offset-2 focus-visible:ring-offset-white";
const primaryBtn = "bg-gradient-to-b from-[#fb8a3c] to-[#f97316] shadow-[0_10px_30px_-10px_rgba(249,115,22,0.8)]";

const EVENT_TYPES = [
  { label: "Wedding", value: "Wedding" },
  { label: "Birthday", value: "Birthday" },
  { label: "Corporate Gala", value: "Corporate Gala" },
  { label: "Engagement", value: "Engagement" },
  { label: "Other", value: "Other" },
];

export function CraftModal({ 
  isOpen, 
  onClose, 
  initialService 
}: { 
  isOpen: boolean; 
  onClose: () => void; 
  initialService: "website" | "template" | null 
}) {
  const [step, setStep] = useState(1);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formData, setFormData] = useState({
    service: initialService || "website",
    name: "",
    eventType: "Wedding",
    budget: "",
    requirements: "",
  });

  useEffect(() => {
    if (isOpen) {
      setStep(initialService ? 2 : 1);
      setFormData(prev => ({ ...prev, service: initialService || "website" }));
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "unset";
    }
  }, [isOpen, initialService]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    setTimeout(() => {
      const whatsappNumber = process.env.NEXT_PUBLIC_WHATSAPP_NUMBER || "923001234567";
      const serviceName = formData.service === "website" ? "Crafted Website" : "Crafted Template";
      
      const message = `*🌟 NEW CRAFT REQUEST*\n\n` +
        `*Service:* ${serviceName}\n` +
        `*Name:* ${formData.name}\n` +
        `*Event:* ${formData.eventType}\n` +
        `*Budget:* ${formData.budget || "Not specified"}\n\n` +
        `*Vision & Requirements:*\n${formData.requirements}`;

      window.open(`https://wa.me/${whatsappNumber}?text=${encodeURIComponent(message)}`, "_blank");
      
      setIsSubmitting(false);
      onClose();
    }, 800);
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
          className="fixed inset-0 z-[9999] flex items-center justify-center bg-orange-950/40 p-4 backdrop-blur-sm sm:p-6"
          onClick={onClose}
        >
          <motion.div
            initial={{ opacity: 0, y: 40, scale: 0.95 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, y: 20, scale: 0.95 }}
            transition={{ type: "spring", damping: 25, stiffness: 220 }}
            onClick={(e) => e.stopPropagation()}
            className="relative flex max-h-[90dvh] w-full max-w-xl flex-col overflow-hidden rounded-[2rem] border border-white/60 bg-[#fffafb] shadow-2xl"
          >
            <div className="flex items-center justify-between border-b border-orange-100 p-6 bg-white/50">
              <h2 className="font-[family-name:var(--font-display)] text-xl font-bold text-gray-900">
                {step === 1 ? "Choose your craft" : "Tell us your vision"}
              </h2>
              <button onClick={onClose} className="rounded-full bg-orange-100/50 p-2 text-orange-600 hover:bg-orange-100 hover:text-orange-700 transition-colors">
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="overflow-y-auto p-6 sm:p-8">
              <AnimatePresence mode="wait">
                
                {step === 1 && (
                  <motion.div key="step1" initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 20 }} className="space-y-4">
                    <button onClick={() => { setFormData({ ...formData, service: "website" }); setStep(2); }} className="group w-full rounded-2xl border border-orange-200 bg-white p-6 text-left transition-all hover:border-orange-400 hover:shadow-md">
                      <div className="mb-2 flex h-10 w-10 items-center justify-center rounded-xl bg-orange-100 text-orange-500 group-hover:scale-110 transition-transform">
                        <Globe className="h-5 w-5" />
                      </div>
                      <h3 className="text-lg font-bold text-gray-900 mb-1">Crafted Website</h3>
                      <p className="text-sm text-gray-600">Fully coded from scratch. Highest tier.</p>
                    </button>
                    <button onClick={() => { setFormData({ ...formData, service: "template" }); setStep(2); }} className="group w-full rounded-2xl border border-amber-200 bg-white p-6 text-left transition-all hover:border-amber-400 hover:shadow-md">
                      <div className="mb-2 flex h-10 w-10 items-center justify-center rounded-xl bg-amber-100 text-amber-500 group-hover:scale-110 transition-transform">
                        <LayoutTemplate className="h-5 w-5" />
                      </div>
                      <h3 className="text-lg font-bold text-gray-900 mb-1">Crafted Template</h3>
                      <p className="text-sm text-gray-600">Customize an existing premium design.</p>
                    </button>
                  </motion.div>
                )}

                {step === 2 && (
                  <motion.form key="step2" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} onSubmit={handleSubmit} className="space-y-5">
                    <div className="flex items-center justify-between rounded-xl bg-orange-50 p-3 text-sm text-orange-600 border border-orange-200 mb-4">
                      <span>Selected: <b>{formData.service === "website" ? "Crafted Website" : "Crafted Template"}</b></span>
                      {!initialService && (
                        <button type="button" onClick={() => setStep(1)} className="text-xs font-bold underline hover:text-orange-700">Change</button>
                      )}
                    </div>

                    <div>
                      <label className="mb-1.5 block text-sm font-semibold text-gray-700">Your Name</label>
                      <input required type="text" value={formData.name} onChange={(e) => setFormData({...formData, name: e.target.value})} placeholder="e.g. Sarah Ahmed" className={`w-full rounded-xl border border-orange-200 bg-white px-4 py-3 text-gray-900 outline-none transition-all focus:border-orange-400 focus:ring-2 focus:ring-orange-500/20 ${focusRing}`} />
                    </div>

                    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                      <div>
                        <label className="mb-1.5 block text-sm font-semibold text-gray-700">Event Type</label>
                        <AceternitySelect value={formData.eventType} options={EVENT_TYPES} onChange={(val) => setFormData({...formData, eventType: val})} className="w-full" />
                      </div>
                      <div>
                        <label className="mb-1.5 block text-sm font-semibold text-gray-700">Budget Range</label>
                        <input type="text" value={formData.budget} onChange={(e) => setFormData({...formData, budget: e.target.value})} placeholder="e.g. Rs 50,000+" className={`w-full rounded-xl border border-orange-200 bg-white px-4 py-3 text-gray-900 outline-none transition-all focus:border-orange-400 focus:ring-2 focus:ring-orange-500/20 ${focusRing}`} />
                      </div>
                    </div>

                    <div>
                      <label className="mb-1.5 block text-sm font-semibold text-gray-700">Describe your vision</label>
                      <textarea required rows={4} value={formData.requirements} onChange={(e) => setFormData({...formData, requirements: e.target.value})} placeholder="Tell us about the vibe, colors, specific features you need..." className={`w-full rounded-xl border border-orange-200 bg-white px-4 py-3 text-gray-900 outline-none transition-all focus:border-orange-400 focus:ring-2 focus:ring-orange-500/20 resize-none ${focusRing}`} />
                    </div>

                    <button type="submit" disabled={isSubmitting} className={`mt-4 flex w-full items-center justify-center gap-2 rounded-xl py-4 font-bold text-white transition-transform hover:scale-[1.02] active:scale-[0.98] disabled:opacity-70 ${primaryBtn} ${focusRing}`}>
                      {isSubmitting ? (
                        <span className="flex items-center gap-2"><div className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent"/> Connecting to WhatsApp...</span>
                      ) : (
                        <><MessageCircle className="h-5 w-5" /> Send Request <ArrowRight className="h-5 w-5" /></>
                      )}
                    </button>
                  </motion.form>
                )}
              </AnimatePresence>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}