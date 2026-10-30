"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import { ArrowRight, Sparkles, Play } from "lucide-react";

const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { 
      staggerChildren: 0.25,
      delayChildren: 0.8, 
    },
  },
};

const itemVariants = {
  hidden: { opacity: 0, y: 40, filter: "blur(12px)" },
  visible: {
    opacity: 1,
    y: 0,
    filter: "blur(0px)",
    transition: { duration: 1.4, ease: [0.16, 1, 0.3, 1] as const },
  },
};

export function HomeHero() {
  return (
    <section className="relative min-h-[100dvh] w-full flex items-center justify-center overflow-hidden bg-[#fffafb]">
      
      {/* 
        🟢 STANDALONE CSS BACKGROUND 
        We use a pure CSS background here instead of <Image> for absolute control over the scale and edges.
      */}
      <motion.div
        initial={{ scale: 1.3, filter: "blur(10px)", opacity: 0 }}
        animate={{ 
          // Base scale is 1.15. It only grows to 1.25, never shrinking below 1.15. 
          // This guarantees the edges are always off-screen.
          scale: [1.15, 1.25, 1.15], 
          rotate: [0, 1, 0, -1, 0],
          x: [0, 20, 0, -20, 0],           
          filter: "blur(0px)", 
          opacity: 1 
        }}
        transition={{
          scale: { duration: 30, repeat: Infinity, ease: "easeInOut" },
          rotate: { duration: 35, repeat: Infinity, ease: "easeInOut" },
          x: { duration: 40, repeat: Infinity, ease: "easeInOut" },
          filter: { duration: 1.5, delay: 0.2 }, 
          opacity: { duration: 1.5, delay: 0.2 }
        }}
        className="absolute inset-0 z-0 bg-[url('/home_hero_bg.png')] bg-cover bg-center bg-no-repeat"
      />

      {/* Overlay Gradient to make sure text is always perfectly readable */}
      <div className="absolute inset-0 z-0 bg-gradient-to-b from-white/30 via-transparent to-[#fffafb] pointer-events-none" />

      {/* Main Content */}
      <div className="relative z-10 flex flex-col items-center justify-center text-center px-4 sm:px-6 lg:px-8 max-w-5xl mx-auto pt-24 pb-20">
        <motion.div
          variants={containerVariants}
          initial="hidden"
          animate="visible"
          className="flex flex-col items-center w-full"
        >
          {/* Badge */}
          <motion.div variants={itemVariants}>
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white/50 backdrop-blur-md border border-orange-200/60 shadow-sm mb-8 transition-colors hover:bg-white/70">
              <Sparkles className="w-4 h-4 text-orange-500" />
              <span className="text-xs font-bold text-gray-800 font-[family-name:var(--font-display)] uppercase tracking-widest">
                The New Standard in Digital Invitations
              </span>
            </div>
          </motion.div>

          {/* Headline */}
          <motion.h1
            variants={itemVariants}
            className="text-5xl sm:text-6xl md:text-7xl lg:text-[5.5rem] font-bold text-gray-900 tracking-tight font-[family-name:var(--font-display)] leading-[1.05] mb-6 max-w-4xl drop-shadow-sm"
          >
            Create Invitations that <br className="hidden sm:block" />
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-orange-500 to-amber-500">
              Leave a Mark.
            </span>
          </motion.h1>

          {/* Subheadline */}
          <motion.p
            variants={itemVariants}
            className="text-lg md:text-xl text-gray-700 font-[family-name:var(--font-body)] max-w-2xl mb-10 leading-relaxed font-medium"
          >
            Design, customize, and track beautiful digital event invitations.
            Whether it's a wedding or a corporate gala, try our builder for free.
          </motion.p>

          {/* CTA Buttons */}
          <motion.div
            variants={itemVariants}
            className="flex flex-col sm:flex-row items-center gap-4 w-full sm:w-auto"
          >
            <Link
              href="/register"
              className="group relative flex items-center justify-center gap-2 w-full sm:w-auto px-8 py-4 bg-gradient-to-b from-orange-500 to-orange-600 text-white font-bold rounded-2xl shadow-[0_10px_30px_-10px_rgba(249,115,22,0.8)] hover:shadow-[0_15px_40px_-10px_rgba(249,115,22,0.9)] hover:-translate-y-1 transition-all duration-300 font-[family-name:var(--font-display)] text-lg overflow-hidden"
            >
              <div className="absolute inset-0 bg-white/20 translate-y-full group-hover:translate-y-0 transition-transform duration-300 ease-out" />
              <span className="relative z-10">Start Designing</span>
              <ArrowRight className="w-5 h-5 relative z-10 group-hover:translate-x-1 transition-transform" />
            </Link>

            <Link
              href="/templates"
              className="group flex items-center justify-center gap-2 w-full sm:w-auto px-8 py-4 bg-white/70 backdrop-blur-xl border border-gray-200/80 text-gray-800 font-bold rounded-2xl hover:bg-white hover:border-orange-200 hover:-translate-y-1 transition-all duration-300 font-[family-name:var(--font-display)] text-lg shadow-sm hover:shadow-md"
            >
              <Play className="w-4 h-4 text-orange-500 group-hover:scale-110 transition-transform" />
              Explore Templates
            </Link>
          </motion.div>

        </motion.div>
      </div>
    </section>
  );
}