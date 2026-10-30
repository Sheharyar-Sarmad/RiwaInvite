"use client";

import { useCallback, useEffect, useRef, useState, type SVGProps } from "react";
import Link from "next/link";
import Image from "next/image";
import {
  AnimatePresence,
  motion,
  useMotionValue,
  useReducedMotion,
  useScroll,
  useSpring,
  useTransform,
  type MotionValue,
  type Variants,
} from "framer-motion";
import gsap from "gsap";
import {
  ArrowRight,
  ArrowUp,
  ArrowUpRight,
  Award,
  Check,
  Copy,
  Globe,
  Lock,
  Mail,
  Scale,
  ShieldCheck,
  Sparkles,
  type LucideIcon,
} from "lucide-react";

const SUPPORT_EMAIL = process.env.NEXT_PUBLIC_SUPPORT_EMAIL || "info.riwainvite@gmail.com";

const display = "font-[family-name:var(--font-display)]";
const body = "font-[family-name:var(--font-body)]";
const ease: [number, number, number, number] = [0.22, 1, 0.36, 1];

/* -------------------------------------------------------------------------- */
/*  Icons                                                                     */
/* -------------------------------------------------------------------------- */

type IconProps = SVGProps<SVGSVGElement>;

const FacebookIcon = (props: IconProps) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}>
    <path d="M18 2h-3a5 5 0 0 0-5 5v3H7v4h3v8h4v-8h3l1-4h-4V7a1 1 0 0 1 1-1h3z" />
  </svg>
);
const InstagramIcon = (props: IconProps) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}>
    <rect width="20" height="20" x="2" y="2" rx="5" ry="5" />
    <path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z" />
    <line x1="17.5" x2="17.51" y1="6.5" y2="6.5" />
  </svg>
);
const WhatsAppIcon = (props: IconProps) => (
  <svg viewBox="0 0 24 24" fill="currentColor" {...props}>
    <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413Z" />
  </svg>
);
const YoutubeIcon = (props: IconProps) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}>
    <path d="M22.54 6.42a2.78 2.78 0 0 0-1.94-2C18.88 4 12 4 12 4s-6.88 0-8.6.46a2.78 2.78 0 0 0-1.94 2A29 29 0 0 0 1 11.75a29 29 0 0 0 .46 5.33A2.78 2.78 0 0 0 3.4 19c1.72.46 8.6.46 8.6.46s6.88 0 8.6-.46a2.78 2.78 0 0 0 1.94-2 29 29 0 0 0 .46-5.33 29 29 0 0 0-.46-5.33z" />
    <polygon points="9.75 15.02 15.5 11.75 9.75 8.48 9.75 15.02" />
  </svg>
);

/* -------------------------------------------------------------------------- */
/*  Data                                                                      */
/* -------------------------------------------------------------------------- */

interface FooterLinkItem {
  label: string;
  href: string;
  icon?: LucideIcon;
}

const FOOTER_LINKS: Record<"product" | "company" | "legal", FooterLinkItem[]> = {
  product: [
    { label: "Templates", href: "/templates" },
    { label: "Plans", href: "/plans" },
    { label: "AI Studio", href: "/login" },
  ],
  company: [
    { label: "Our Ethos", href: "/ethos" },
    { label: "The Concierge", href: "/concierge" },
    { label: "Designers", href: "/ethos#designers" },
  ],
  legal: [
    { label: "Trust Center", href: "/legal#trust", icon: Globe },
    { label: "Privacy Promise", href: "/legal#privacy", icon: ShieldCheck },
    { label: "Terms of Engagement", href: "/legal#terms", icon: Scale },
    { label: "No-Refund Policy", href: "/legal#refunds", icon: Lock },
  ],
};

const SOCIALS = [
  { label: "Facebook", href: "https://facebook.com", icon: FacebookIcon },
  { label: "Instagram", href: "https://instagram.com", icon: InstagramIcon },
  { label: "WhatsApp", href: "https://wa.me/1234567890", icon: WhatsAppIcon },
  { label: "YouTube", href: "https://youtube.com", icon: YoutubeIcon },
];

const MARQUEE_ITEMS = [
  "Weddings",
  "Mehndi nights",
  "Birthdays",
  "Engagements",
  "Baby showers",
  "Corporate events",
  "Festive greetings",
];

/* -------------------------------------------------------------------------- */
/*  Shared motion variants                                                    */
/* -------------------------------------------------------------------------- */

const stagger: Variants = {
  hidden: {},
  show: { transition: { staggerChildren: 0.07, delayChildren: 0.05 } },
};
const rise: Variants = {
  hidden: { opacity: 0, y: 24 },
  show: { opacity: 1, y: 0, transition: { duration: 0.6, ease } },
};
const popIn: Variants = {
  hidden: { opacity: 0, scale: 0.4, y: 12 },
  show: { opacity: 1, scale: 1, y: 0, transition: { type: "spring", stiffness: 380, damping: 18 } },
};
const inView = { once: true, margin: "-60px" } as const;

/* -------------------------------------------------------------------------- */
/*  GSAP magnetic hook                                                        */
/* -------------------------------------------------------------------------- */

function useMagnetic<T extends HTMLElement>(strength = 0.3) {
  const ref = useRef<T>(null);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

    const onMove = (e: MouseEvent) => {
      const r = el.getBoundingClientRect();
      gsap.to(el, {
        x: (e.clientX - (r.left + r.width / 2)) * strength,
        y: (e.clientY - (r.top + r.height / 2)) * strength,
        duration: 0.4,
        ease: "power2.out",
      });
    };
    const onLeave = () => gsap.to(el, { x: 0, y: 0, duration: 0.9, ease: "elastic.out(1, 0.3)" });

    el.addEventListener("mousemove", onMove);
    el.addEventListener("mouseleave", onLeave);
    return () => {
      el.removeEventListener("mousemove", onMove);
      el.removeEventListener("mouseleave", onLeave);
      gsap.killTweensOf(el);
    };
  }, [strength]);
  return ref;
}

/* -------------------------------------------------------------------------- */
/*  Mega CTA banner                                                           */
/* -------------------------------------------------------------------------- */

function SplitWords({ text }: { text: string }) {
  return (
    <>
      {text.split(" ").map((word, i) => (
        <span key={i} className="inline-block overflow-hidden pb-1 align-bottom">
          <motion.span
            className="inline-block"
            variants={{
              hidden: { y: "110%" },
              show: { y: 0, transition: { duration: 0.7, ease, delay: i * 0.07 } },
            }}
          >
            {word}&nbsp;
          </motion.span>
        </span>
      ))}
    </>
  );
}

function CtaBanner({ reduce }: { reduce: boolean }) {
  const ref = useRef<HTMLDivElement>(null);
  const ctaRef = useMagnetic<HTMLAnchorElement>(0.25);

  // 3D tilt
  const mx = useMotionValue(0);
  const my = useMotionValue(0);
  const rotateX = useSpring(useTransform(my, [-0.5, 0.5], [3, -3]), { stiffness: 150, damping: 20 });
  const rotateY = useSpring(useTransform(mx, [-0.5, 0.5], [-3, 3]), { stiffness: 150, damping: 20 });

  const onMove = (e: React.PointerEvent<HTMLDivElement>) => {
    const el = ref.current;
    if (!el) return;
    const r = el.getBoundingClientRect();
    const px = (e.clientX - r.left) / r.width;
    const py = (e.clientY - r.top) / r.height;
    el.style.setProperty("--bx", `${px * 100}%`);
    el.style.setProperty("--by", `${py * 100}%`);
    if (!reduce) {
      mx.set(px - 0.5);
      my.set(py - 0.5);
    }
  };
  const onLeave = () => {
    mx.set(0);
    my.set(0);
  };

  const float = (x: number[], y: number[], duration: number) =>
    reduce ? {} : { animate: { x, y }, transition: { duration, repeat: Infinity, ease: "easeInOut" as const } };

  return (
    <motion.div
      ref={ref}
      variants={stagger}
      initial="hidden"
      whileInView="show"
      viewport={inView}
      onPointerMove={onMove}
      onPointerLeave={onLeave}
      style={{ rotateX, rotateY, transformPerspective: 1200 }}
      className="group relative mb-16 overflow-hidden rounded-[2.5rem] shadow-[0_20px_60px_-15px_rgba(249,115,22,0.45)]"
    >
      {/* animated gradient base */}
      <motion.div
        aria-hidden
        animate={reduce ? undefined : { backgroundPosition: ["0% 50%", "100% 50%", "0% 50%"] }}
        transition={{ duration: 14, repeat: Infinity, ease: "linear" }}
        className="absolute inset-0 bg-gradient-to-br from-orange-500 via-orange-400 to-amber-500 bg-[length:220%_220%]"
      />

      {/* grid texture */}
      <div
        aria-hidden
        className="absolute inset-0 opacity-60 [background-image:linear-gradient(rgba(255,255,255,.09)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,.09)_1px,transparent_1px)] [background-size:36px_36px] [mask-image:radial-gradient(ellipse_at_center,black,transparent_75%)]"
      />

      {/* drifting orbs */}
      <motion.div
        aria-hidden
        {...float([0, 40, -20, 0], [0, 30, -10, 0], 14)}
        className="absolute -right-24 -top-32 h-[28rem] w-[28rem] rounded-full bg-white/15 blur-[90px]"
      />
      <motion.div
        aria-hidden
        {...float([0, -30, 20, 0], [0, -20, 30, 0], 18)}
        className="absolute -bottom-40 -left-24 h-[24rem] w-[24rem] rounded-full bg-amber-200/25 blur-[90px]"
      />

      {/* cursor glare */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 opacity-0 transition-opacity duration-500 group-hover:opacity-100"
        style={{
          background:
            "radial-gradient(420px circle at var(--bx, 50%) var(--by, 0%), rgba(255,255,255,0.22), transparent 60%)",
        }}
      />

      {/* floating sparkles */}
      {[
        { c: "left-[8%] top-[18%] h-5 w-5", d: 0 },
        { c: "right-[14%] top-[14%] h-7 w-7", d: 0.8 },
        { c: "right-[30%] bottom-[16%] h-4 w-4", d: 1.6 },
        { c: "left-[42%] top-[10%] h-3.5 w-3.5", d: 2.2 },
      ].map((s, i) => (
        <motion.span
          key={i}
          aria-hidden
          animate={reduce ? undefined : { rotate: [0, 90, 180], scale: [1, 1.35, 1], opacity: [0.35, 0.9, 0.35] }}
          transition={{ duration: 4, repeat: Infinity, delay: s.d, ease: "easeInOut" }}
          className={`pointer-events-none absolute text-white ${s.c}`}
        >
          <Sparkles className="h-full w-full" />
        </motion.span>
      ))}

      <div className="relative z-10 flex flex-col items-center justify-between gap-10 p-8 md:flex-row md:p-14">
        <div className="max-w-2xl text-center md:text-left">
          <motion.div
            variants={rise}
            className="mb-6 inline-flex items-center gap-2 rounded-full border border-white/25 bg-white/20 px-3 py-1 text-xs font-bold text-white backdrop-blur-sm"
          >
            <span className="relative flex h-2 w-2">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-white/80 motion-reduce:animate-none" />
              <span className="relative inline-flex h-2 w-2 rounded-full bg-white" />
            </span>
            <Award className="h-4 w-4" /> Premium quality
          </motion.div>

          <h2 className={`mb-4 text-4xl font-bold leading-[1.1] text-white md:text-5xl lg:text-6xl ${display}`}>
            <SplitWords text="Ready to create something beautiful?" />
          </h2>

          <motion.p variants={rise} className={`mx-auto max-w-lg text-lg text-orange-50 md:mx-0 ${body}`}>
            Join thousands of event planners and couples designing unforgettable digital invitations.
          </motion.p>
        </div>

        <motion.div variants={popIn} className="shrink-0">
          <Link
            ref={ctaRef}
            href="/register"
            className={`group/btn relative flex items-center gap-3 overflow-hidden rounded-2xl bg-white px-8 py-5 font-bold text-orange-600 shadow-xl transition-shadow duration-300 hover:shadow-2xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white focus-visible:ring-offset-2 focus-visible:ring-offset-orange-500 ${display}`}
          >
            {/* shimmer sweep */}
            <motion.span
              aria-hidden
              animate={reduce ? undefined : { x: ["-120%", "320%"] }}
              transition={{ duration: 2.4, repeat: Infinity, repeatDelay: 1.6, ease: "easeInOut" }}
              className="pointer-events-none absolute inset-y-0 left-0 w-1/3 -skew-x-12 bg-gradient-to-r from-transparent via-orange-200/70 to-transparent"
            />
            <span className="relative">Start designing</span>
            <span className="relative flex h-8 w-8 items-center justify-center rounded-full bg-orange-100 transition-colors group-hover/btn:bg-orange-500 group-hover/btn:text-white">
              <ArrowRight className="h-4 w-4 transition-transform duration-300 group-hover/btn:translate-x-0.5" />
            </span>
          </Link>
        </motion.div>
      </div>
    </motion.div>
  );
}

/* -------------------------------------------------------------------------- */
/*  Marquee                                                                   */
/* -------------------------------------------------------------------------- */

function Marquee({ reduce }: { reduce: boolean }) {
  const row = (
    <div className="flex shrink-0 items-center gap-10 pr-10">
      {MARQUEE_ITEMS.map((label) => (
        <span key={label} className="flex items-center gap-10">
          <span
            className={`cursor-default whitespace-nowrap text-3xl font-semibold text-stone-300 transition-colors duration-300 hover:text-orange-500 md:text-5xl ${display}`}
          >
            {label}
          </span>
          <Sparkles className="h-5 w-5 shrink-0 text-orange-300" />
        </span>
      ))}
    </div>
  );

  return (
    <div
      aria-hidden
      className="relative mb-20 overflow-hidden py-4 [mask-image:linear-gradient(to_right,transparent,black_12%,black_88%,transparent)]"
    >
      <motion.div
        className="flex w-max"
        animate={reduce ? undefined : { x: ["0%", "-50%"] }}
        transition={{ duration: 40, ease: "linear", repeat: Infinity }}
      >
        {row}
        {row}
      </motion.div>
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/*  Link columns                                                              */
/* -------------------------------------------------------------------------- */

function FooterLink({ href, label, icon: Icon }: FooterLinkItem) {
  return (
    <motion.li variants={rise}>
      <Link
        href={href}
        className="group relative inline-flex w-fit items-center gap-2 py-0.5 text-sm font-medium text-stone-500 transition-all duration-300 hover:translate-x-1 hover:text-orange-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-400/60"
      >
        {Icon && (
          <Icon className="h-4 w-4 text-stone-400 transition-all duration-300 group-hover:-rotate-12 group-hover:scale-125 group-hover:text-orange-500" />
        )}
        <span className="relative">
          {label}
          <span className="absolute -bottom-0.5 left-0 h-px w-full origin-left scale-x-0 bg-orange-400 transition-transform duration-300 group-hover:scale-x-100" />
        </span>
        <ArrowUpRight className="h-3 w-3 -translate-x-1 translate-y-1 opacity-0 transition-all duration-300 group-hover:translate-x-0 group-hover:translate-y-0 group-hover:opacity-100" />
      </Link>
    </motion.li>
  );
}

function FooterColumn({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <motion.div variants={rise}>
      <h3 className={`relative mb-7 inline-block text-sm font-bold text-stone-900 ${display}`}>
        {title}
        <motion.span
          aria-hidden
          variants={{ hidden: { scaleX: 0 }, show: { scaleX: 1, transition: { duration: 0.8, ease, delay: 0.35 } } }}
          className="absolute -bottom-2 left-0 h-[2px] w-full origin-left rounded-full bg-gradient-to-r from-orange-500 to-orange-200"
        />
      </h3>
      <motion.ul variants={stagger} className="space-y-3.5">
        {children}
      </motion.ul>
    </motion.div>
  );
}

/* -------------------------------------------------------------------------- */
/*  Brand column pieces                                                       */
/* -------------------------------------------------------------------------- */

function SocialLink({ label, href, icon: Icon }: (typeof SOCIALS)[number]) {
  const [hovered, setHovered] = useState(false);
  return (
    <motion.div
      variants={popIn}
      className="relative"
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      onFocus={() => setHovered(true)}
      onBlur={() => setHovered(false)}
    >
      <motion.a
        href={href}
        target="_blank"
        rel="noopener noreferrer"
        aria-label={label}
        whileHover={{ y: -6, scale: 1.1 }}
        whileTap={{ scale: 0.92 }}
        className="relative flex h-11 w-11 items-center justify-center overflow-hidden rounded-full border border-orange-100 bg-white text-stone-500 shadow-sm transition-colors duration-300 hover:border-orange-500 hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-400"
      >
        <motion.span
          aria-hidden
          initial={false}
          animate={{ scaleY: hovered ? 1 : 0 }}
          transition={{ duration: 0.3, ease }}
          className="absolute inset-0 origin-bottom bg-gradient-to-t from-orange-600 to-orange-400"
        />
        <Icon className="relative h-5 w-5" />
      </motion.a>

      <AnimatePresence>
        {hovered && (
          <motion.div
            initial={{ opacity: 0, y: 6, scale: 0.9 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 6, scale: 0.9 }}
            transition={{ duration: 0.18 }}
            className="pointer-events-none absolute bottom-full left-1/2 z-50 mb-3 -translate-x-1/2 whitespace-nowrap rounded-lg bg-stone-900 px-3 py-1.5 text-[11px] font-bold text-white shadow-xl"
          >
            {label}
            <span className="absolute -bottom-1 left-1/2 h-2 w-2 -translate-x-1/2 rotate-45 bg-stone-900" />
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}

function CopyEmail() {
  const [copied, setCopied] = useState(false);

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(SUPPORT_EMAIL);
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    } catch {
      window.location.href = `mailto:${SUPPORT_EMAIL}`;
    }
  };

  return (
    <motion.div
      variants={rise}
      className="mt-8 flex w-full max-w-sm items-center gap-3 rounded-2xl border border-orange-100 bg-white/80 p-1.5 pl-4 shadow-sm backdrop-blur"
    >
      <Mail className="h-4 w-4 shrink-0 text-orange-500" />
      <a
        href={`mailto:${SUPPORT_EMAIL}`}
        className={`min-w-0 flex-1 truncate text-left text-sm font-medium text-stone-700 transition-colors hover:text-orange-600 ${body}`}
      >
        {SUPPORT_EMAIL}
      </a>
      <motion.button
        type="button"
        onClick={copy}
        whileTap={{ scale: 0.94 }}
        aria-label="Copy support email"
        className={`relative flex h-9 min-w-[5.5rem] items-center justify-center overflow-hidden rounded-xl bg-orange-50 px-3 text-xs font-bold text-orange-600 transition-colors hover:bg-orange-100 ${display}`}
      >
        <AnimatePresence mode="wait" initial={false}>
          {copied ? (
            <motion.span
              key="done"
              initial={{ y: 14, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: -14, opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="flex items-center gap-1.5"
            >
              <Check className="h-3.5 w-3.5" /> Copied
            </motion.span>
          ) : (
            <motion.span
              key="copy"
              initial={{ y: 14, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: -14, opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="flex items-center gap-1.5"
            >
              <Copy className="h-3.5 w-3.5" /> Copy
            </motion.span>
          )}
        </AnimatePresence>
      </motion.button>
    </motion.div>
  );
}

/* -------------------------------------------------------------------------- */
/*  Watermark: parallax + per-letter reveal + cursor "flashlight"              */
/* -------------------------------------------------------------------------- */

function WatermarkLayer({
  x,
  reduce,
  className,
  style,
}: {
  x: MotionValue<number>;
  reduce: boolean;
  className: string;
  style?: React.CSSProperties;
}) {
  return (
    <motion.div
      aria-hidden
      initial="hidden"
      whileInView="show"
      viewport={{ once: true }}
      className="pointer-events-none absolute inset-0 z-0 flex items-end justify-center overflow-hidden"
      style={style}
    >
      <motion.div
        style={{ x }}
        className={`flex select-none whitespace-nowrap text-[22vw] font-black leading-[0.8] tracking-tighter ${display} ${className}`}
      >
        {"RIWAINVITE".split("").map((letter, i) => (
          <motion.span
            key={i}
            className="inline-block"
            variants={{
              hidden: { y: "70%", opacity: 0 },
              show: { y: 0, opacity: 1, transition: { delay: i * 0.05, duration: 0.9, ease } },
            }}
          >
            <motion.span
              className="inline-block"
              animate={reduce ? undefined : { y: [0, -10, 0] }}
              transition={{ duration: 4 + (i % 4) * 0.4, repeat: Infinity, ease: "easeInOut", delay: i * 0.18 }}
            >
              {letter}
            </motion.span>
          </motion.span>
        ))}
      </motion.div>
    </motion.div>
  );
}

/* -------------------------------------------------------------------------- */
/*  Back to top with scroll-progress ring                                     */
/* -------------------------------------------------------------------------- */

function BackToTop() {
  const { scrollYProgress } = useScroll();
  const progress = useSpring(scrollYProgress, { stiffness: 120, damping: 25 });
  const magnet = useMagnetic<HTMLButtonElement>(0.25);

  return (
    <button
      ref={magnet}
      type="button"
      onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}
      aria-label="Back to top"
      className="group flex cursor-pointer items-center gap-3 rounded-full border border-orange-100 bg-white py-1.5 pl-4 pr-1.5 text-stone-500 shadow-sm transition-all duration-300 hover:border-orange-200 hover:text-orange-600 hover:shadow-[0_10px_25px_-10px_rgba(249,115,22,0.5)]"
    >
      <span className={`text-xs font-bold ${display}`}>Back to top</span>
      <span className="relative flex h-9 w-9 items-center justify-center rounded-full bg-orange-50 transition-colors group-hover:bg-orange-500 group-hover:text-white">
        <svg className="absolute inset-0 -rotate-90" viewBox="0 0 36 36" aria-hidden>
          <circle cx="18" cy="18" r="16" fill="none" stroke="rgba(249,115,22,0.15)" strokeWidth="2" />
          <motion.circle
            cx="18"
            cy="18"
            r="16"
            fill="none"
            stroke="#f97316"
            strokeWidth="2"
            strokeLinecap="round"
            style={{ pathLength: progress }}
          />
        </svg>
        <ArrowUp className="relative h-4 w-4 transition-transform duration-300 group-hover:-translate-y-0.5" />
      </span>
    </button>
  );
}

/* -------------------------------------------------------------------------- */
/*  Footer                                                                    */
/* -------------------------------------------------------------------------- */

export function Footer() {
  const reduce = !!useReducedMotion();
  const footerRef = useRef<HTMLElement>(null);
  const raf = useRef(0);

  const { scrollYProgress } = useScroll({ target: footerRef, offset: ["start end", "end end"] });
  const watermarkX = useTransform(scrollYProgress, [0, 1], [60, -60]);

  const onPointerMove = useCallback((e: React.PointerEvent<HTMLElement>) => {
    const el = footerRef.current;
    if (!el) return;
    const { clientX, clientY } = e;
    cancelAnimationFrame(raf.current);
    raf.current = requestAnimationFrame(() => {
      const { left, top } = el.getBoundingClientRect();
      el.style.setProperty("--mx", `${clientX - left}px`);
      el.style.setProperty("--my", `${clientY - top}px`);
    });
  }, []);

  const onPointerLeave = useCallback(() => {
    const el = footerRef.current;
    if (!el) return;
    el.style.setProperty("--mx", "-999px");
    el.style.setProperty("--my", "-999px");
  }, []);

  useEffect(() => () => cancelAnimationFrame(raf.current), []);

  const flashlight = "radial-gradient(280px circle at var(--mx, -999px) var(--my, -999px), black, transparent 70%)";

  return (
    <footer
      ref={footerRef}
      onPointerMove={onPointerMove}
      onPointerLeave={onPointerLeave}
      className="group/footer relative overflow-hidden border-t border-orange-100/50 bg-[#fffafb] pb-10 pt-24"
    >
      {/* travelling light on the top border */}
      <motion.div
        aria-hidden
        animate={reduce ? undefined : { x: ["-100%", "400%"] }}
        transition={{ duration: 6, repeat: Infinity, ease: "linear" }}
        className="absolute left-0 top-0 z-10 h-px w-1/4 bg-gradient-to-r from-transparent via-orange-400 to-transparent"
      />

      {/* aurora + orbs */}
      <motion.div
        aria-hidden
        animate={reduce ? undefined : { x: [0, 80, -60, 0], opacity: [0.5, 0.9, 0.5] }}
        transition={{ duration: 20, repeat: Infinity, ease: "easeInOut" }}
        className="pointer-events-none absolute -top-40 left-1/2 h-72 w-[56rem] -translate-x-1/2 rounded-full bg-orange-300/20 blur-3xl"
      />
      <motion.div
        aria-hidden
        animate={reduce ? undefined : { y: [0, -40, 20, 0], x: [0, 30, -20, 0] }}
        transition={{ duration: 24, repeat: Infinity, ease: "easeInOut" }}
        className="pointer-events-none absolute -right-24 top-1/3 h-80 w-80 rounded-full bg-amber-200/20 blur-3xl"
      />

      {/* dot pattern */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 z-0 opacity-[0.035]"
        style={{ backgroundImage: "radial-gradient(#f97316 1px, transparent 1px)", backgroundSize: "24px 24px" }}
      />

      {/* cursor spotlight */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 z-0 opacity-0 transition-opacity duration-500 group-hover/footer:opacity-100"
        style={{
          background:
            "radial-gradient(800px circle at var(--mx, -999px) var(--my, -999px), rgba(249,115,22,0.07), transparent 50%)",
        }}
      />

      {/* watermark: faint base + cursor-revealed layer */}
      <WatermarkLayer
        x={watermarkX}
        reduce={reduce}
        className="text-orange-200/45 [mask-image:linear-gradient(to_bottom,black_30%,transparent_100%)]"
      />
      <WatermarkLayer
        x={watermarkX}
        reduce={reduce}
        className="text-orange-400/60"
        style={{ maskImage: flashlight, WebkitMaskImage: flashlight }}
      />

      <div className="relative z-10 mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        {/* 1. CTA */}
        <CtaBanner reduce={reduce} />

        {/* 2. Marquee */}
        <Marquee reduce={reduce} />

        {/* 3. Links */}
        <div className="mb-20 grid grid-cols-1 gap-12 lg:grid-cols-12 lg:gap-8">
          {/* Brand */}
          <motion.div
            variants={stagger}
            initial="hidden"
            whileInView="show"
            viewport={inView}
            className="flex flex-col items-center text-center lg:col-span-4 lg:items-start lg:text-left"
          >
            <motion.div variants={rise}>
              <Link href="/" className="group mb-6 flex w-fit items-center gap-4">
                <span className="flex h-12 w-12 items-center justify-center rounded-2xl border border-orange-100 bg-white shadow-[0_8px_20px_-8px_rgba(249,115,22,0.3)] transition-transform duration-300 group-hover:rotate-6 group-hover:scale-110">
                  <Image src="/logo.png" alt="Riwainvite" width={28} height={28} className="object-contain" />
                </span>
                <span className={`text-3xl font-bold tracking-tight text-stone-900 ${display}`}>Riwainvite</span>
              </Link>
            </motion.div>

            <motion.p variants={rise} className={`mb-10 max-w-sm text-sm leading-relaxed text-stone-500 ${body}`}>
              The premium platform for creating, managing, and selling unforgettable digital event invitations.
              Designed for those who demand perfection.
            </motion.p>

            <motion.div variants={stagger} className="flex items-center gap-4">
              {SOCIALS.map((social) => (
                <SocialLink key={social.label} {...social} />
              ))}
            </motion.div>

            <CopyEmail />
          </motion.div>

          {/* Columns */}
          <motion.div
            variants={stagger}
            initial="hidden"
            whileInView="show"
            viewport={inView}
            className="grid grid-cols-1 gap-10 sm:grid-cols-3 lg:col-span-8 lg:gap-12"
          >
            <FooterColumn title="Product">
              {FOOTER_LINKS.product.map((l) => (
                <FooterLink key={l.label} {...l} />
              ))}
            </FooterColumn>

            <FooterColumn title="Company">
              {FOOTER_LINKS.company.map((l) => (
                <FooterLink key={l.label} {...l} />
              ))}
              <motion.li variants={rise}>
                <a
                  href={`mailto:${SUPPORT_EMAIL}`}
                  className="group inline-flex w-fit items-center gap-2 text-sm font-bold text-orange-500 transition-colors hover:text-orange-600"
                >
                  <Mail className="h-4 w-4 transition-transform duration-300 group-hover:-rotate-12 group-hover:scale-125" />
                  Contact Concierge
                </a>
              </motion.li>
            </FooterColumn>

            <FooterColumn title="Legal & Trust">
              {FOOTER_LINKS.legal.map((l) => (
                <FooterLink key={l.label} {...l} />
              ))}
            </FooterColumn>
          </motion.div>
        </div>

        {/* 4. Bottom bar */}
        <motion.div
          variants={stagger}
          initial="hidden"
          whileInView="show"
          viewport={{ once: true }}
          className="flex flex-col items-center justify-between gap-6 border-t border-orange-100/70 pt-8 md:flex-row"
        >
          <div className="flex flex-col items-center gap-3 md:flex-row md:gap-8">
            <motion.p variants={rise} className={`text-xs font-medium text-stone-400 ${body}`}>
              © {new Date().getFullYear()} Riwainvite. All rights reserved.
            </motion.p>
            <motion.span variants={rise} className="flex items-center gap-1.5 text-xs font-medium text-stone-400">
              Made in Pakistan
              <motion.span
                aria-label="love"
                animate={reduce ? undefined : { scale: [1, 1.3, 1, 1.22, 1] }}
                transition={{ duration: 1.4, repeat: Infinity, ease: "easeInOut" }}
                className="inline-block text-sm text-orange-500"
              >
                ♥
              </motion.span>
            </motion.span>
          </div>

          <motion.div variants={rise}>
            <BackToTop />
          </motion.div>
        </motion.div>
      </div>
    </footer>
  );
}