"use client";

import { useRef } from "react";
import { motion } from "framer-motion";
import {
  X,
  ShieldAlert,
  CheckCircle2,
  SlidersHorizontal,
  Layers,
  TrendingUp,
  Zap,
  Crown,
  Target,
  Lightbulb,
  ChevronDown,
  Clock,
  GraduationCap,
  Plus,
  ArrowRight,
} from "lucide-react";

const card =
  "bg-white/80 backdrop-blur-sm p-6 rounded-3xl border border-orange-100/60 shadow-sm hover:shadow-md transition-shadow";
const display = "font-[family-name:var(--font-display)]";
const body = "font-[family-name:var(--font-body)]";

export function PlanGuideModal({
  onClose,
  onCreatePlan,
}: {
  onClose: () => void;
  onCreatePlan: () => void;
}) {
  const scrollRef = useRef<HTMLDivElement>(null);

  const handleScrollDown = () => {
    if (scrollRef.current) {
      scrollRef.current.scrollBy({ top: 400, behavior: "smooth" });
    }
  };

  const steps = [
    { n: 1, t: "User Buys Plan", d: "User pays via Stripe. The system logs an Order and activates their Subscription.", c: "bg-orange-100 text-orange-600" },
    { n: 2, t: "Plan Locks", d: 'Because a user is now active, the plan becomes "Locked" to protect their pricing tier.', c: "bg-orange-200 text-orange-700" },
    { n: 3, t: "Plan Expires", d: "After 30 days, the subscription expires. The user drops to the free tier unless they renew.", c: "bg-gray-200 text-gray-600" },
  ];

  return (
    // 🟢 FIX 1: Add data-lenis-prevent to the outer wrapper
    <div data-lenis-prevent className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6">
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={onClose}
        className="absolute inset-0 bg-gray-900/60 backdrop-blur-md cursor-pointer"
      />

      <motion.div
        ref={scrollRef}
        initial={{ opacity: 0, scale: 0.95, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 20 }}
        // 🟢 FIX 2: Add data-lenis-prevent to the scrollable modal container
        data-lenis-prevent
        className="relative w-[95vw] md:w-full max-w-4xl bg-[#fffafb] rounded-[2rem] shadow-2xl shadow-orange-900/20 z-10 border border-white max-h-[90vh] overflow-y-auto no-scrollbar flex flex-col"
      >
        <div
          className="absolute inset-0 z-0 opacity-[0.03] pointer-events-none rounded-[2rem]"
          style={{
            backgroundImage: "radial-gradient(#f97316 1px, transparent 1px)",
            backgroundSize: "24px 24px",
          }}
        />

        <div className="relative z-10 p-6 md:p-10 pb-12">
          {/* Hero */}
          <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-orange-500 via-orange-500 to-amber-500 p-6 md:p-8 mb-10 text-white shadow-xl shadow-orange-500/20">
            <div className="absolute -right-10 -top-10 w-56 h-56 rounded-full bg-white/10 blur-2xl" />
            <div className="absolute right-20 -bottom-16 w-40 h-40 rounded-full bg-amber-300/30 blur-2xl" />
            <div className="relative flex justify-between items-start gap-4">
              <div className="flex items-center gap-4">
                <div className="p-3 bg-white/20 backdrop-blur rounded-2xl ring-1 ring-white/30">
                  <GraduationCap className="w-8 h-8" strokeWidth={2.5} />
                </div>
                <div>
                  <p className="text-[11px] font-bold uppercase tracking-widest text-orange-100">
                    5 min read
                  </p>
                  <h2 className={`text-3xl font-bold ${display}`}>Plan Masterclass</h2>
                  <p className={`text-orange-50 mt-1 text-sm font-medium ${body}`}>
                    The complete guide to monetizing Riwainvite.
                  </p>
                </div>
              </div>
              <button
                onClick={onClose}
                className="p-2 bg-white/20 hover:bg-white/30 rounded-full text-white transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 md:gap-8">
            {/* Left */}
            <div className="space-y-6">
              <div className={card}>
                <div className="flex items-center gap-3 mb-3">
                  <div className="p-2 bg-orange-100 rounded-xl">
                    <Layers className="w-5 h-5 text-orange-500" />
                  </div>
                  <h3 className={`text-lg font-bold text-gray-900 ${display}`}>What are Plans?</h3>
                </div>
                <p className={`text-sm text-gray-600 leading-relaxed ${body}`}>
                  Plans are the pricing tiers for your users. Instead of letting everyone build unlimited invitations, you create plans (e.g., Free, Pro, Premium) with specific limits. A user must subscribe to a plan to unlock its features.
                </p>
              </div>

              <div className={card}>
                <div className="flex items-center gap-3 mb-4">
                  <div className="p-2 bg-orange-100 rounded-xl">
                    <SlidersHorizontal className="w-5 h-5 text-orange-500" />
                  </div>
                  <h3 className={`text-lg font-bold text-gray-900 ${display}`}>The 4 Pillars</h3>
                </div>
                <ul className="space-y-4">
                  {[
                    ["Price & Duration", "How much they pay and for how many days."],
                    ["Template Limits", "How many simple and premium templates they can publish."],
                  ].map(([t, d]) => (
                    <li key={t} className="flex items-start gap-3">
                      <CheckCircle2 className="w-5 h-5 text-emerald-500 shrink-0" />
                      <div>
                        <strong className={`text-sm text-gray-900 block ${display}`}>{t}</strong>
                        <span className={`text-xs text-gray-600 ${body}`}>{d}</span>
                      </div>
                    </li>
                  ))}
                  <li className="flex items-start gap-3">
                    <CheckCircle2 className="w-5 h-5 text-emerald-500 shrink-0" />
                    <div>
                      <strong className={`text-sm text-gray-900 block ${display}`}>Custom Slugs</strong>
                      <span className={`text-xs text-gray-600 ${body}`}>
                        Toggle ON if they can have a custom URL like{" "}
                        <code className="bg-orange-50 px-1 py-0.5 rounded text-orange-600">/invite/sara-and-ahmed</code>.
                      </span>
                    </div>
                  </li>
                </ul>
              </div>
            </div>

            {/* Right */}
            <div className="space-y-6">
              <div className="bg-orange-50/80 backdrop-blur-sm p-6 rounded-3xl border border-orange-200 shadow-sm relative overflow-hidden">
                <div className="absolute top-0 right-0 p-4 opacity-10 pointer-events-none">
                  <ShieldAlert className="w-24 h-24 text-orange-600" />
                </div>
                <div className="relative z-10">
                  <div className="flex items-center gap-3 mb-3">
                    <ShieldAlert className="w-5 h-5 text-orange-600" />
                    <h3 className={`text-lg font-bold text-orange-900 ${display}`}>Why is a Plan "Locked"?</h3>
                  </div>
                  <p className={`text-sm text-orange-800 leading-relaxed ${body}`}>
                    If even <strong>one user</strong> is actively subscribed, Riwainvite locks the plan. You <strong>cannot change the price or limits</strong> because it breaks the agreement with the paying user.
                    <br /><br />
                    Need to change a price? Create a new plan and deactivate the old one!
                  </p>
                </div>
              </div>

              <div className={card}>
                <div className="flex items-center gap-3 mb-4">
                  <div className="p-2 bg-orange-100 rounded-xl">
                    <TrendingUp className="w-5 h-5 text-orange-500" />
                  </div>
                  <h3 className={`text-lg font-bold text-gray-900 ${display}`}>Pricing Strategy</h3>
                </div>
                <p className={`text-xs text-gray-600 mb-4 ${body}`}>A proven 3-tier structure to maximize revenue:</p>
                <div className="space-y-2">
                  <div className="flex items-center justify-between p-3 bg-gray-50 rounded-xl border border-gray-100">
                    <div className="flex items-center gap-2">
                      <Target className="w-4 h-4 text-gray-400" />
                      <span className={`text-sm font-bold text-gray-700 ${display}`}>Free Tier</span>
                    </div>
                    <span className="text-xs text-gray-500 font-medium">1 Template</span>
                  </div>
                  <div className="flex items-center justify-between p-3 bg-orange-50 rounded-xl border border-orange-200 ring-1 ring-orange-500/20 scale-[1.02] shadow-sm">
                    <div className="flex items-center gap-2">
                      <Zap className="w-4 h-4 text-orange-500" />
                      <span className={`text-sm font-bold text-orange-900 ${display}`}>Pro Tier (Best Seller)</span>
                    </div>
                    <span className="text-xs text-orange-700 font-medium">5 Templates</span>
                  </div>
                  <div className="flex items-center justify-between p-3 bg-purple-50 rounded-xl border border-purple-100">
                    <div className="flex items-center gap-2">
                      <Crown className="w-4 h-4 text-purple-500" />
                      <span className={`text-sm font-bold text-purple-900 ${display}`}>Premium Tier</span>
                    </div>
                    <span className="text-xs text-purple-700 font-medium">Unlimited</span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Lifecycle */}
          <div className={`mt-8 ${card}`}>
            <div className="flex items-center gap-3 mb-7">
              <div className="p-2 bg-orange-100 rounded-xl">
                <Clock className="w-5 h-5 text-orange-500" />
              </div>
              <h3 className={`text-lg font-bold text-gray-900 ${display}`}>The Subscription Lifecycle</h3>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
              {steps.map((s, i) => (
                <div key={s.n} className="p-4 bg-gray-50/80 rounded-2xl border border-gray-100 relative">
                  <div className={`absolute -top-3 -left-3 w-8 h-8 rounded-full flex items-center justify-center font-bold shadow-sm ${s.c} ${display}`}>
                    {s.n}
                  </div>
                  {i < 2 && (
                    <ArrowRight className="hidden md:block absolute -right-4 top-1/2 -translate-y-1/2 w-4 h-4 text-orange-300 z-10" />
                  )}
                  <h4 className={`font-bold text-sm text-gray-900 mb-1 mt-2 ${display}`}>{s.t}</h4>
                  <p className={`text-xs text-gray-600 ${body}`}>{s.d}</p>
                </div>
              ))}
            </div>
          </div>

          {/* Pro tip */}
          <div className="mt-6 p-5 bg-blue-50 border border-blue-100 rounded-3xl flex items-start gap-4">
            <div className="p-2 bg-blue-100 text-blue-600 rounded-xl shrink-0">
              <Lightbulb className="w-5 h-5" />
            </div>
            <div>
              <h4 className={`text-sm font-bold text-blue-900 ${display}`}>Pro Tip: Drive Upgrades with Limits</h4>
              <p className={`text-xs text-blue-800 mt-1 leading-relaxed ${body}`}>
                Don't give everything away for free. If a free user hits their template limit, Riwainvite will automatically prompt them to upgrade to a Pro plan to continue building.
              </p>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="relative z-10 p-6 md:p-10 pt-0 flex flex-col sm:flex-row items-center justify-center gap-4 mt-auto">
          <button
            onClick={onClose}
            className={`w-full sm:w-auto px-8 py-3 bg-white border-2 border-gray-200 hover:border-gray-300 hover:bg-gray-50 text-gray-700 font-bold rounded-xl transition-all cursor-pointer ${display}`}
          >
            I get it, thanks
          </button>
          <button
            onClick={onCreatePlan}
            className={`w-full sm:w-auto flex items-center justify-center gap-2 px-8 py-3 bg-gradient-to-b from-orange-500 to-orange-600 text-white font-bold rounded-xl transition-all shadow-lg shadow-orange-500/30 hover:-translate-y-0.5 cursor-pointer ${display}`}
          >
            <Plus className="w-4 h-4" /> Create New Plan
          </button>
        </div>

        {/* Scroll indicator */}
        <div
          onClick={handleScrollDown}
          className="sticky bottom-4 left-1/2 -translate-x-1/2 w-fit flex items-center justify-center cursor-pointer group z-20"
        >
          <div className="flex flex-col items-center gap-1 opacity-50 group-hover:opacity-100 transition-opacity animate-bounce bg-white/90 backdrop-blur-md px-4 py-2 rounded-full shadow-md border border-orange-100">
            <ChevronDown className="w-5 h-5 text-orange-600" />
          </div>
        </div>
      </motion.div>
    </div>
  );
}