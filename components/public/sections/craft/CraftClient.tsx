"use client";

import { useState } from "react";
import Image from "next/image";
import { motion, useReducedMotion } from "framer-motion";
import { ArrowRight, Sparkles, CheckCircle2, MessageSquare, PenTool, Monitor, Rocket, ChevronDown, Globe, LayoutTemplate } from "lucide-react";
import { CraftModal } from "@/components/public/models/CraftModal";

/* ------------------------------------------------------------------ */
/* Constants & Helpers                                                 */
/* ------------------------------------------------------------------ */
const EASE = [0.16, 1, 0.3, 1] as const;
const focusRing = "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-500 focus-visible:ring-offset-2 focus-visible:ring-offset-transparent";
const primaryBtn = "bg-gradient-to-b from-[#fb8a3c] to-[#f97316] shadow-[0_10px_30px_-10px_rgba(249,115,22,0.8),inset_0_1px_0_rgba(255,255,255,0.3)]";

const PROCESS_STEPS = [
  { icon: MessageSquare, title: "The Brief", desc: "We hop on a call to understand your event, your vibe, and your exact requirements." },
  { icon: PenTool, title: "The Craft", desc: "Our design team customizes a premium template or builds your bespoke site from scratch." },
  { icon: Monitor, title: "The Review", desc: "You get a live link to preview every animation, font, and RSVP feature before we launch." },
  { icon: Rocket, title: "The Launch", desc: "We connect your custom domain, optimize the speed, and hand over the keys." }
];

const FAQS = [
  { q: "How long does a Crafted Website take?", a: "Depending on the complexity, a fully bespoke website usually takes 7–14 days from start to finish. Crafted templates are usually delivered in 3–5 days." },
  { q: "Do I need to buy my own domain?", a: "No, our team will handle the entire domain purchasing and DNS setup process for you. We will just ask for your preferred name." },
  { q: "Can I request changes after it's built?", a: "Absolutely. We include 2 rounds of revisions before launch. If you need ongoing changes after the event, we can arrange that too." },
  { q: "What if I already have a template?", a: "If you bought a template from our store, we can use that as the base and heavily customize it for you at a discounted rate." }
];

/* ------------------------------------------------------------------ */
/* FAQ Component                                                      */
/* ------------------------------------------------------------------ */
function FaqItem({ q, a }: { q: string, a: string }) {
  const [isOpen, setIsOpen] = useState(false);
  return (
    <div className="border-b border-orange-900/10 last:border-0">
      <button onClick={() => setIsOpen(!isOpen)} className={`flex w-full items-center justify-between py-6 text-left ${focusRing}`}>
        <span className="font-[family-name:var(--font-display)] text-lg font-bold text-gray-900">{q}</span>
        <ChevronDown className={`h-5 w-5 text-orange-500 transition-transform duration-300 ${isOpen ? "rotate-180" : ""}`} />
      </button>
      <motion.div initial={false} animate={{ height: isOpen ? "auto" : 0, opacity: isOpen ? 1 : 0 }} className="overflow-hidden">
        <p className="pb-6 text-gray-700 leading-relaxed font-medium">{a}</p>
      </motion.div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Main Component                                                     */
/* ------------------------------------------------------------------ */
export function CraftClient() {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [initialService, setInitialService] = useState<"website" | "template" | null>(null);
  const reduce = useReducedMotion() ?? false;

  const openModal = (service: "website" | "template" | null = null) => {
    setInitialService(service);
    setIsModalOpen(true);
  };

  return (
    <div className="relative isolate min-h-screen w-full font-[family-name:var(--font-body)]">
      
      {/* ========================================================= */}
      {/* 1. GLOBAL FIXED BACKGROUND                                */}
      {/* ========================================================= */}
      <div className="fixed inset-0 -z-20">
        <Image
          src="/craft-hero-bg.png"
          alt="Luxury floral background"
          fill
          priority
          className="object-cover object-center"
        />
        {/* 
          A very light gradient overlay. 
          It's almost transparent at the top (Hero) and only slightly peach at the bottom,
          ensuring the floral details remain visible everywhere without washing out the text.
        */}
        <div className="absolute inset-0 bg-gradient-to-b from-transparent via-[#fdeadb]/40 to-[#fdeadb]/70 backdrop-blur-[1px]" />
      </div>

      {/* ========================================================= */}
      {/* 2. FULL SCREEN HERO                                       */}
      {/* ========================================================= */}
      <section className="relative flex min-h-screen w-full flex-col items-center justify-center px-4 pt-20 text-center">
        <motion.span 
          initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} 
          className="mb-6 inline-flex items-center gap-2 rounded-full border border-orange-200/50 bg-white/70 px-4 py-1.5 text-sm font-bold text-orange-600 shadow-sm backdrop-blur-md"
        >
          <Sparkles className="h-4 w-4" /> The Crafted Collection
        </motion.span>
        
        <motion.h1 
          initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.8, ease: EASE }} 
          className="font-[family-name:var(--font-display)] text-5xl font-extrabold tracking-tighter text-gray-900 sm:text-6xl md:text-7xl lg:text-8xl drop-shadow-[0_2px_10px_rgba(255,255,255,0.8)]"
        >
          Don't just send an invite.<br/>
          <span className="bg-gradient-to-r from-orange-500 to-amber-500 bg-clip-text text-transparent drop-shadow-sm">Make a statement.</span>
        </motion.h1>
        
        <motion.p 
          initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2, duration: 0.8 }} 
          className="mx-auto mt-6 max-w-2xl text-lg font-medium text-gray-800 sm:text-xl drop-shadow-[0_1px_5px_rgba(255,255,255,0.9)]"
        >
          Work directly with our design team. Whether you want a completely bespoke website or a heavily customized template, we build it exactly how you envision it.
        </motion.p>

        <motion.div 
          initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.4, duration: 0.8 }}
          className="mt-10 flex flex-col sm:flex-row items-center gap-4"
        >
          <button onClick={() => openModal(null)} className={`inline-flex items-center gap-2 rounded-xl px-8 py-4 text-base font-bold text-white transition-transform hover:scale-[1.02] ${primaryBtn} ${focusRing}`}>
            Start Your Project <ArrowRight className="h-5 w-5" />
          </button>
        </motion.div>

        {/* Scroll Indicator */}
        <motion.div 
          animate={{ y: [0, 10, 0] }} transition={{ duration: 2, repeat: Infinity }}
          className="absolute bottom-10 left-1/2 -translate-x-1/2 text-orange-500/80 drop-shadow-md"
        >
          <ChevronDown className="h-8 w-8" />
        </motion.div>
      </section>

      {/* ========================================================= */}
      {/* 3. REST OF THE PAGE (Floating over background)            */}
      {/* ========================================================= */}
      <div className="relative z-10 w-full pb-24">
        <div className="mx-auto w-full max-w-7xl px-4 sm:px-6 lg:px-8">
          
          {/* Services Section */}
          <div className="grid grid-cols-1 gap-8 md:grid-cols-2 max-w-5xl mx-auto mb-32 mt-12">
            <motion.div 
              initial={{ opacity: 0, y: 40 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} 
              onClick={() => openModal("website")} 
              className="group relative cursor-pointer overflow-hidden rounded-[2rem] border border-white/60 bg-white/80 p-8 shadow-[0_20px_50px_-30px_rgba(249,115,22,0.5)] backdrop-blur-xl transition-all hover:bg-white hover:shadow-[0_20px_50px_-20px_rgba(249,115,22,0.6)]"
            >
              <div className="mb-6 flex h-16 w-16 items-center justify-center rounded-2xl bg-orange-100 text-orange-500 group-hover:scale-110 transition-transform duration-500 shadow-inner">
                <Globe className="h-8 w-8" />
              </div>
              <h3 className="font-[family-name:var(--font-display)] text-2xl font-bold mb-3 text-gray-900">Crafted Website</h3>
              <p className="text-gray-700 mb-8 leading-relaxed font-medium">A fully coded, bespoke web experience with custom animations, unique layouts, and a dedicated domain built just for you.</p>
              <span className="flex items-center gap-2 text-sm font-bold text-orange-600">Start Project <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" /></span>
            </motion.div>

            <motion.div 
              initial={{ opacity: 0, y: 40 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ delay: 0.1 }} 
              onClick={() => openModal("template")} 
              className="group relative cursor-pointer overflow-hidden rounded-[2rem] border border-white/60 bg-white/80 p-8 shadow-[0_20px_50px_-30px_rgba(249,115,22,0.5)] backdrop-blur-xl transition-all hover:bg-white hover:shadow-[0_20px_50px_-20px_rgba(249,115,22,0.6)]"
            >
              <div className="mb-6 flex h-16 w-16 items-center justify-center rounded-2xl bg-amber-100 text-amber-500 group-hover:scale-110 transition-transform duration-500 shadow-inner">
                <LayoutTemplate className="h-8 w-8" />
              </div>
              <h3 className="font-[family-name:var(--font-display)] text-2xl font-bold mb-3 text-gray-900">Bespoke Template</h3>
              <p className="text-gray-700 mb-8 leading-relaxed font-medium">Take one of our premium templates and we will heavily customize the colors, fonts, and sections to perfectly match your vibe.</p>
              <span className="flex items-center gap-2 text-sm font-bold text-amber-600">Customize Template <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" /></span>
            </motion.div>
          </div>

          {/* Process Section */}
          <div className="mb-32">
            <div className="text-center mb-16">
              <h2 className="font-[family-name:var(--font-display)] text-3xl font-bold text-gray-900 sm:text-5xl drop-shadow-sm">How we craft it.</h2>
              <p className="mt-4 text-gray-800 font-medium drop-shadow-sm">A seamless journey from your vision to the final launch.</p>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8 max-w-6xl mx-auto">
              {PROCESS_STEPS.map((step, i) => (
                <motion.div key={i} initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ delay: i * 0.1 }} className="relative flex flex-col items-center text-center bg-white/60 backdrop-blur-md p-6 rounded-3xl border border-white/60 shadow-lg">
                  <div className="mb-6 flex h-16 w-16 items-center justify-center rounded-full bg-white border border-orange-100 shadow-[0_10px_30px_-10px_rgba(249,115,22,0.3)]">
                    <step.icon className="h-7 w-7 text-orange-500" />
                  </div>
                  <h4 className="text-lg font-bold text-gray-900 mb-2">{step.title}</h4>
                  <p className="text-sm text-gray-700 leading-relaxed font-medium">{step.desc}</p>
                </motion.div>
              ))}
            </div>
          </div>

          {/* Pricing Section */}
          <div className="mb-32">
            <div className="text-center mb-16">
              <h2 className="font-[family-name:var(--font-display)] text-3xl font-bold text-gray-900 sm:text-5xl drop-shadow-sm">The Investment</h2>
              <p className="mt-4 text-gray-800 font-medium drop-shadow-sm">Premium quality requires a dedicated budget. Here is where we start.</p>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8 max-w-4xl mx-auto">
              <motion.div initial={{ opacity: 0, x: -20 }} whileInView={{ opacity: 1, x: 0 }} viewport={{ once: true }} className="rounded-[2rem] border border-white/60 bg-white/80 backdrop-blur-xl p-8 sm:p-10 shadow-xl">
                <h3 className="text-xl font-bold text-gray-900 mb-2">Crafted Template</h3>
                <p className="text-4xl font-extrabold text-amber-500 mb-8">Rs 15,000<span className="text-lg text-gray-500 font-medium">+</span></p>
                <ul className="text-sm text-gray-800 space-y-4 mb-8 font-medium">
                  <li className="flex items-center gap-3"><CheckCircle2 className="w-5 h-5 text-amber-500 shrink-0"/> Premium design selection</li>
                  <li className="flex items-center gap-3"><CheckCircle2 className="w-5 h-5 text-amber-500 shrink-0"/> Complete color & font overhaul</li>
                  <li className="flex items-center gap-3"><CheckCircle2 className="w-5 h-5 text-amber-500 shrink-0"/> Custom image integration</li>
                </ul>
                <button onClick={() => openModal("template")} className={`w-full rounded-xl border border-orange-200 bg-white/80 py-3 text-sm font-bold text-gray-900 transition-colors hover:bg-white ${focusRing}`}>Select Template</button>
              </motion.div>
              
              <motion.div initial={{ opacity: 0, x: 20 }} whileInView={{ opacity: 1, x: 0 }} viewport={{ once: true }} className="relative rounded-[2rem] border border-orange-300/80 bg-gradient-to-b from-white/90 to-orange-50/90 backdrop-blur-xl p-8 sm:p-10 shadow-[0_20px_60px_-15px_rgba(249,115,22,0.3)]">
                <div className="absolute top-0 right-8 -translate-y-1/2 rounded-full bg-orange-500 px-4 py-1 text-xs font-bold text-white shadow-lg">Most Popular</div>
                <h3 className="text-xl font-bold text-gray-900 mb-2">Crafted Website</h3>
                <p className="text-4xl font-extrabold text-orange-500 mb-8">Rs 50,000<span className="text-lg text-gray-500 font-medium">+</span></p>
                <ul className="text-sm text-gray-800 space-y-4 mb-8 font-medium">
                  <li className="flex items-center gap-3"><CheckCircle2 className="w-5 h-5 text-orange-500 shrink-0"/> 100% Bespoke Code</li>
                  <li className="flex items-center gap-3"><CheckCircle2 className="w-5 h-5 text-orange-500 shrink-0"/> Custom domain & hosting setup</li>
                  <li className="flex items-center gap-3"><CheckCircle2 className="w-5 h-5 text-orange-500 shrink-0"/> Advanced animations & RSVP</li>
                </ul>
                <button onClick={() => openModal("website")} className={`w-full rounded-xl py-3 text-sm font-bold text-white transition-transform hover:scale-[1.02] ${primaryBtn} ${focusRing}`}>Start Project</button>
              </motion.div>
            </div>
          </div>

          {/* FAQ & Final CTA */}
          <div className="max-w-3xl mx-auto mb-24">
            <div className="text-center mb-12">
              <h2 className="font-[family-name:var(--font-display)] text-3xl font-bold text-gray-900 sm:text-4xl drop-shadow-sm">Questions?</h2>
            </div>
            <div className="mb-16 bg-white/60 backdrop-blur-md rounded-3xl p-6 border border-white/60 shadow-lg">
              {FAQS.map((faq, i) => <FaqItem key={i} q={faq.q} a={faq.a} />)}
            </div>

            <div className="text-center rounded-[2rem] border border-white/60 bg-white/80 p-12 backdrop-blur-xl shadow-xl">
              <h2 className="font-[family-name:var(--font-display)] text-4xl font-bold text-gray-900 mb-4">Ready to stand out?</h2>
              <p className="text-gray-700 mb-8 font-medium">Let's build something your guests will never forget.</p>
              <button onClick={() => openModal(null)} className={`inline-flex items-center gap-2 rounded-xl px-8 py-4 text-base font-bold text-white transition-transform hover:scale-[1.02] ${primaryBtn} ${focusRing}`}>
                Start Your Project <ArrowRight className="h-5 w-5" />
              </button>
            </div>
          </div>

        </div>
      </div>

      <CraftModal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} initialService={initialService} />
    </div>
  );
}