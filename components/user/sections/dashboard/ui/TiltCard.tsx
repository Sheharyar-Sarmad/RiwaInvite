"use client";

import * as React from "react";
import { motion, useReducedMotion } from "framer-motion";
import { cn, EASE, VIEW, TONE_TEXT, TONE, Tone } from "../constants";

export function TiltCard({
  tone,
  className,
  pad = "p-5",
  delay = 0,
  children,
}: {
  tone: Tone;
  className?: string;
  pad?: string;
  delay?: number;
  children: React.ReactNode;
}) {
  const reduce = useReducedMotion() ?? false;
  const t = TONE[tone];

  return (
    <motion.div
      initial={reduce ? false : { opacity: 0, y: 15, scale: 0.98 }}
      whileInView={{ opacity: 1, y: 0, scale: 1 }}
      viewport={VIEW}
      transition={{ duration: 0.5, delay, ease: EASE }}
      className={cn(
        "group relative overflow-hidden rounded-2xl p-[1.5px] transition-shadow duration-300 hover:shadow-xl", 
        className
      )}
    >
      {/* 
        1. The Animated Infinite Border.
        It spins forever. Uses only warm colors.
      */}
      <motion.div
        aria-hidden
        className="absolute inset-[-100%] z-0 opacity-50 transition-opacity duration-500 group-hover:opacity-100"
        style={{ background: t.borderGradient }}
        animate={reduce ? undefined : { rotate: 360 }}
        transition={{ duration: 5, repeat: Infinity, ease: "linear" }}
      />

      {/* 2. The Inner Card */}
      <div
        className={cn(
          "relative z-10 flex h-full min-w-0 flex-col overflow-hidden rounded-[14px]",
          pad,
          t.bg,
          TONE_TEXT[tone]
        )}
      >
        {/* 
          3. The Multi-Color Background Mesh.
          Adds subtle orange, amber, and red glowing orbs inside the card.
        */}
        {tone === "paper" && (
          <div aria-hidden className="absolute inset-0 pointer-events-none opacity-40 mix-blend-multiply">
            <div className="absolute -top-10 -left-10 w-32 h-32 bg-orange-400 rounded-full blur-3xl" />
            <div className="absolute -bottom-10 -right-10 w-32 h-32 bg-amber-400 rounded-full blur-3xl" />
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-40 h-40 bg-red-400 rounded-full blur-3xl opacity-50" />
          </div>
        )}

        {tone === "ember" && (
          <div aria-hidden className="absolute inset-0 pointer-events-none opacity-20">
            <div className="absolute -top-10 -left-10 w-32 h-32 bg-orange-500 rounded-full blur-3xl" />
            <div className="absolute -bottom-10 -right-10 w-32 h-32 bg-red-500 rounded-full blur-3xl" />
          </div>
        )}

        {/* Inner highlight ring */}
        <div aria-hidden className="absolute inset-0 rounded-[14px] ring-1 ring-inset ring-white/40 pointer-events-none" />
        
        {/* Content */}
        <div className="relative z-10 h-full flex flex-col">
          {children}
        </div>
      </div>
    </motion.div>
  );
}