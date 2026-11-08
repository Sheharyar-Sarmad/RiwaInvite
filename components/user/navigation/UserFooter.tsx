"use client";

import * as React from "react";
import Link from "next/link";
import Image from "next/image";
import {
  AnimatePresence,
  motion,
  useMotionTemplate,
  useMotionValue,
  useReducedMotion,
  useSpring,
} from "framer-motion";
import { ArrowUp, ArrowUpRight, Check, Copy, Mail, Sparkles } from "lucide-react";

// Custom Brand SVGs (Lucide removed brand icons)
const FacebookIcon = (props: React.SVGProps<SVGSVGElement>) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}>
    <path d="M18 2h-3a5 5 0 0 0-5 5v3H7v4h3v8h4v-8h3l1-4h-4V7a1 1 0 0 1 1-1h3z" />
  </svg>
);
const InstagramIcon = (props: React.SVGProps<SVGSVGElement>) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}>
    <rect width="20" height="20" x="2" y="2" rx="5" ry="5" />
    <path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z" />
    <line x1="17.5" x2="17.51" y1="6.5" y2="6.5" />
  </svg>
);
const WhatsAppIcon = (props: React.SVGProps<SVGSVGElement>) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}>
    <path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z" />
  </svg>
);
const YoutubeIcon = (props: React.SVGProps<SVGSVGElement>) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}>
    <path d="M2.5 7.1C2.5 5.5 3.8 4.2 5.4 4.2h13.2c1.6 0 2.9 1.3 2.9 2.9v9.8c0 1.6-1.3 2.9-2.9 2.9H5.4c-1.6 0-2.9-1.3-2.9-2.9V7.1z" />
    <path d="m10 15 5-3-5-3z" />
  </svg>
);

const EASE = [0.16, 1, 0.3, 1] as const;
const VIEW = { once: true, amount: 0.2 } as const;

const colV = { hidden: {}, show: { transition: { staggerChildren: 0.06 } } };
const itemV = {
  hidden: { opacity: 0, y: 14 },
  show: { opacity: 1, y: 0, transition: { duration: 0.55, ease: EASE } },
};

/* Icon that leans toward the cursor */
function MagneticSocial({ href, label, children }: { href: string; label: string; children: React.ReactNode }) {
  const reduce = useReducedMotion() ?? false;
  const mx = useSpring(useMotionValue(0), { stiffness: 260, damping: 16 });
  const my = useSpring(useMotionValue(0), { stiffness: 260, damping: 16 });
  return (
    <motion.a
      href={href}
      target="_blank"
      rel="noreferrer"
      aria-label={label}
      style={{ x: mx, y: my }}
      whileHover={{ scale: 1.12 }}
      whileTap={{ scale: 0.92 }}
      onPointerMove={(e) => {
        if (reduce || e.pointerType !== "mouse") return;
        const r = e.currentTarget.getBoundingClientRect();
        mx.set((e.clientX - (r.left + r.width / 2)) * 0.35);
        my.set((e.clientY - (r.top + r.height / 2)) * 0.35);
      }}
      onPointerLeave={() => {
        mx.set(0);
        my.set(0);
      }}
      className="group/s relative flex size-10 items-center justify-center overflow-hidden rounded-full border border-orange-200 bg-white text-slate-500 shadow-sm transition-[color,border-color,box-shadow] hover:border-orange-400 hover:text-white hover:shadow-[0_8px_22px_-6px_rgba(249,115,22,0.7)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-500"
    >
      <span className="absolute inset-0 translate-y-full bg-gradient-to-br from-orange-500 to-amber-400 transition-transform duration-300 group-hover/s:translate-y-0" />
      <span className="relative">{children}</span>
    </motion.a>
  );
}

/* Link with a sliding underline and a nudge arrow */
function FootLink({ href, children }: { href: string; children: React.ReactNode }) {
  return (
    <Link
      href={href}
      className="group/l relative inline-flex items-center gap-1 rounded text-sm font-medium text-slate-600 transition-colors hover:text-orange-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-500"
    >
      <span className="relative">
        {children}
        <span className="absolute -bottom-0.5 left-0 h-px w-full origin-left scale-x-0 bg-gradient-to-r from-orange-500 to-amber-400 transition-transform duration-300 group-hover/l:scale-x-100" />
      </span>
      <ArrowUpRight className="size-3 -translate-x-1 opacity-0 transition-all duration-300 group-hover/l:translate-x-0 group-hover/l:opacity-100" />
    </Link>
  );
}

/* Back-to-top with a ring that fills as the page scrolls */
function TopButton({ onClick }: { onClick: () => void }) {
  const [p, setP] = React.useState(0);
  React.useEffect(() => {
    const el = (document.querySelector("main") as HTMLElement | null) ?? null;
    const read = () => {
      const top = el && el.scrollHeight > el.clientHeight ? el.scrollTop : window.scrollY;
      const max = el && el.scrollHeight > el.clientHeight ? el.scrollHeight - el.clientHeight : document.documentElement.scrollHeight - window.innerHeight;
      setP(max > 0 ? Math.min(1, top / max) : 0);
    };
    read();
    (el ?? window).addEventListener("scroll", read, { passive: true });
    window.addEventListener("scroll", read, { passive: true });
    return () => {
      (el ?? window).removeEventListener("scroll", read);
      window.removeEventListener("scroll", read);
    };
  }, []);
  return (
    <motion.button
      onClick={onClick}
      whileHover={{ y: -3 }}
      whileTap={{ scale: 0.94 }}
      className="group flex items-center gap-3 rounded-full bg-slate-900 py-1.5 pl-5 pr-1.5 text-xs font-semibold text-white shadow-[0_10px_26px_-10px_rgba(15,23,42,0.9)] transition-colors hover:bg-slate-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-500"
    >
      Back to top
      <span className="relative flex size-8 items-center justify-center">
        <svg viewBox="0 0 36 36" className="absolute inset-0 -rotate-90" aria-hidden>
          <circle cx="18" cy="18" r="16" fill="none" stroke="rgba(255,255,255,0.15)" strokeWidth="2.5" />
          <circle
            cx="18" cy="18" r="16" fill="none" stroke="#fb923c" strokeWidth="2.5" strokeLinecap="round"
            pathLength={100} strokeDasharray={`${p * 100} 100`}
            style={{ filter: "drop-shadow(0 0 4px rgba(251,146,60,0.9))" }}
          />
        </svg>
        <ArrowUp className="size-3.5 transition-transform group-hover:-translate-y-0.5" />
      </span>
    </motion.button>
  );
}

export function UserFooter() {
  const reduce = useReducedMotion() ?? false;
  const [copied, setCopied] = React.useState(false);
  const email = "info.riwainvite@gmail.com";

  const copyEmail = () => {
    navigator.clipboard.writeText(email);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const scrollToTop = () => {
    const main = document.querySelector("main");
    if (main) main.scrollTo({ top: 0, behavior: "smooth" });
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  // Cursor-following spotlight across the whole footer
  const gx = useMotionValue(-500);
  const gy = useMotionValue(-500);
  const spot = useMotionTemplate`radial-gradient(420px circle at ${gx}px ${gy}px, rgba(249,115,22,0.16), transparent 70%)`;

  const links = {
    Product: [
      { label: "Templates", href: "/templates" },
      { label: "Plans", href: "/plans" },
      { label: "AI Studio", href: "/dashboard/ai-studio" },
    ],
    Company: [
      { label: "Our Ethos", href: "/ethos" },
      { label: "The Concierge", href: "/concierge" },
      { label: "Designers", href: "/ethos#designers" },
    ],
    "Legal & Trust": [
      { label: "Privacy Promise", href: "/privacy" },
      { label: "Terms of Service", href: "/terms" },
      { label: "Cookie Policy", href: "/cookies" },
      { label: "Trust Center", href: "/trust" },
    ],
  };

  const socials = [
    { icon: FacebookIcon, href: "https://facebook.com", label: "Facebook" },
    { icon: InstagramIcon, href: "https://instagram.com", label: "Instagram" },
    { icon: WhatsAppIcon, href: "https://wa.me/923000000000", label: "WhatsApp" },
    { icon: YoutubeIcon, href: "https://youtube.com", label: "YouTube" },
  ];

  return (
    <footer
      onPointerMove={(e) => {
        if (e.pointerType !== "mouse") return;
        const r = e.currentTarget.getBoundingClientRect();
        gx.set(e.clientX - r.left);
        gy.set(e.clientY - r.top);
      }}
      onPointerLeave={() => {
        gx.set(-500);
        gy.set(-500);
      }}
      className="relative mt-12 overflow-hidden rounded-[2rem] border border-orange-200/80 bg-gradient-to-br from-orange-50/90 via-white to-orange-50/50 pb-6 shadow-[inset_0_1px_0_#fff,0_30px_60px_-30px_rgba(154,52,18,0.25)] backdrop-blur-xl"
    >
      {/* Ambient layers */}
      <div aria-hidden className="pointer-events-none absolute inset-0 select-none overflow-hidden">
        <motion.div
          className="absolute -right-24 -top-24 size-[460px] rounded-full bg-orange-300/30 blur-[100px]"
          animate={reduce ? undefined : { x: [0, -50, 0], y: [0, 40, 0], scale: [1, 1.12, 1] }}
          transition={{ duration: 16, repeat: Infinity, ease: "easeInOut" }}
        />
        <motion.div
          className="absolute -bottom-24 -left-16 size-[400px] rounded-full bg-amber-300/30 blur-[100px]"
          animate={reduce ? undefined : { x: [0, 60, 0], y: [0, -30, 0], scale: [1, 1.1, 1] }}
          transition={{ duration: 20, repeat: Infinity, ease: "easeInOut" }}
        />
        <motion.div style={{ background: spot }} className="absolute inset-0" />
        <motion.span
          initial={{ opacity: 0, y: 60 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={VIEW}
          transition={{ duration: 1.2, ease: EASE }}
          className="absolute -bottom-16 left-1/2 -translate-x-1/2 whitespace-nowrap bg-gradient-to-b from-orange-500/[0.12] to-transparent bg-clip-text text-[clamp(6rem,19vw,16rem)] font-black leading-none tracking-tighter text-transparent font-[family-name:var(--font-display)]"
        >
          Riwainvite
        </motion.span>
        <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-orange-400/70 to-transparent" />
      </div>

      <div className="relative z-10 mx-auto max-w-7xl px-5 py-10 sm:px-8 lg:py-14">
        {/* CTA band */}
        <motion.div
          initial={{ opacity: 0, y: 24, scale: 0.98 }}
          whileInView={{ opacity: 1, y: 0, scale: 1 }}
          viewport={VIEW}
          transition={{ duration: 0.8, ease: EASE }}
          className="relative mb-12 overflow-hidden rounded-3xl bg-gradient-to-br from-[#1e1b4b] to-[#0f172a] p-6 text-white shadow-[0_30px_60px_-30px_rgba(15,23,42,0.9)] sm:p-8 lg:mb-16"
        >
          <motion.div
            aria-hidden
            className="absolute -inset-x-1/3 inset-y-0 opacity-70"
            style={{ background: "linear-gradient(100deg, transparent 25%, rgba(249,115,22,0.35) 48%, rgba(251,191,36,0.25) 56%, transparent 78%)" }}
            animate={reduce ? undefined : { x: ["-25%", "35%", "-25%"] }}
            transition={{ duration: 11, repeat: Infinity, ease: "easeInOut" }}
          />
          <div className="relative flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">
            <div className="min-w-0">
              <p className="flex items-center gap-2 text-sm font-semibold text-orange-300">
                <Sparkles className="size-4" /> Your next event
              </p>
              <h2 className="mt-1 text-2xl font-extrabold leading-tight tracking-tighter sm:text-4xl font-[family-name:var(--font-display)]">
                Send an invitation people remember.
              </h2>
            </div>
            <motion.div whileHover={{ y: -3 }} whileTap={{ scale: 0.96 }} className="shrink-0">
              <Link
                href="/dashboard/library"
                className="inline-flex items-center gap-2 rounded-full bg-gradient-to-b from-orange-400 to-orange-600 px-6 py-3.5 text-sm font-bold text-white shadow-[inset_0_1px_0_rgba(255,255,255,0.5),0_14px_30px_-8px_rgba(249,115,22,0.9)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white"
              >
                Browse templates <ArrowUpRight className="size-4" />
              </Link>
            </motion.div>
          </div>
        </motion.div>

        {/* Columns */}
        <div className="grid grid-cols-2 gap-x-6 gap-y-10 md:grid-cols-3 lg:grid-cols-5">
          <motion.div
            variants={colV}
            initial="hidden"
            whileInView="show"
            viewport={VIEW}
            className="col-span-2 md:col-span-3 lg:col-span-2"
          >
            <motion.div variants={itemV}>
              <Link href="/dashboard" className="group flex w-fit items-center gap-3">
                <motion.div
                  whileHover={{ rotate: -8, scale: 1.08 }}
                  transition={{ type: "spring", stiffness: 400, damping: 14 }}
                  className="flex size-11 items-center justify-center rounded-2xl border border-orange-100 bg-white shadow-[0_8px_20px_-8px_rgba(249,115,22,0.5)]"
                >
                  <Image src="/logo.png" alt="Riwainvite" width={26} height={26} className="object-contain" />
                </motion.div>
                <span className="text-2xl font-extrabold tracking-tighter text-slate-900 font-[family-name:var(--font-display)]">
                  Riwainvite
                </span>
              </Link>
            </motion.div>
            <motion.p variants={itemV} className="mt-4 max-w-xs text-sm leading-relaxed text-slate-600">
              Create, share and track beautiful digital invitations for weddings, birthdays and corporate events.
            </motion.p>
            <motion.div variants={itemV} className="mt-6 flex gap-3">
              {socials.map((s) => (
                <MagneticSocial key={s.label} href={s.href} label={s.label}>
                  <s.icon className="size-[18px]" />
                </MagneticSocial>
              ))}
            </motion.div>
          </motion.div>

          {Object.entries(links).map(([title, items]) => (
            <motion.div key={title} variants={colV} initial="hidden" whileInView="show" viewport={VIEW}>
              <motion.h3 variants={itemV} className="mb-4 text-sm font-bold text-slate-900">
                {title}
              </motion.h3>
              <ul className="space-y-3">
                {items.map((l) => (
                  <motion.li key={l.label} variants={itemV}>
                    <FootLink href={l.href}>{l.label}</FootLink>
                  </motion.li>
                ))}
              </ul>
            </motion.div>
          ))}
        </div>

        {/* Bottom bar */}
        <motion.div
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={VIEW}
          transition={{ duration: 0.8, delay: 0.2 }}
          className="mt-12 flex flex-col items-center justify-between gap-5 border-t border-orange-200/60 pt-7 sm:flex-row lg:mt-14"
        >
          <p className="text-xs font-medium text-slate-500">© {new Date().getFullYear()} Riwainvite. All rights reserved.</p>

          <div className="flex flex-wrap items-center justify-center gap-3 sm:justify-end">
            <motion.button
              onClick={copyEmail}
              whileTap={{ scale: 0.96 }}
              aria-live="polite"
              className="group flex items-center gap-2 rounded-full border border-orange-200 bg-white/90 px-4 py-2.5 text-xs font-semibold text-slate-700 shadow-sm transition-colors hover:border-orange-300 hover:bg-orange-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-500"
            >
              <Mail className="size-4 text-orange-500" />
              {email}
              <span className="relative flex size-4 items-center justify-center">
                <AnimatePresence mode="wait" initial={false}>
                  {copied ? (
                    <motion.span key="ok" initial={{ scale: 0, rotate: -90 }} animate={{ scale: 1, rotate: 0 }} exit={{ scale: 0 }} transition={{ type: "spring", stiffness: 500, damping: 18 }}>
                      <Check className="size-3.5 text-emerald-500" strokeWidth={3} />
                    </motion.span>
                  ) : (
                    <motion.span key="cp" initial={{ scale: 0 }} animate={{ scale: 1 }} exit={{ scale: 0 }}>
                      <Copy className="size-3.5 text-slate-400 group-hover:text-orange-500" />
                    </motion.span>
                  )}
                </AnimatePresence>
              </span>
            </motion.button>

            <TopButton onClick={scrollToTop} />
          </div>
        </motion.div>
      </div>
    </footer>
  );
}