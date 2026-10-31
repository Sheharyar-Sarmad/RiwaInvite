"use client";

import { useCallback, useEffect, useRef, useState, type ReactNode, type RefObject, type SVGProps } from "react";
import Link from "next/link";
import Image from "next/image";
import {
  AnimatePresence,
  motion,
  useAnimationFrame,
  useInView,
  useMotionValue,
  useReducedMotion,
  useScroll,
  useSpring,
  useTransform,
  type MotionValue,
  type TargetAndTransition,
  type Transition,
  type Variants,
} from "framer-motion";
import gsap from "gsap";
import { useLenis } from "lenis/react";
import {
  ArrowRight,
  ArrowUp,
  ArrowUpRight,
  Baby,
  Briefcase,
  Cake,
  Check,
  Copy,
  Gem,
  Globe,
  Heart,
  Lock,
  Mail,
  Moon,
  PartyPopper,
  Scale,
  ShieldCheck,
  type LucideIcon,
} from "lucide-react";

/* -------------------------------------------------------------------------- */
/*  Config                                                                    */
/* -------------------------------------------------------------------------- */

const SUPPORT_EMAIL = process.env.NEXT_PUBLIC_SUPPORT_EMAIL || "info.riwainvite@gmail.com";

/** Digits only, with country code (e.g. 923001234567). */
const WHATSAPP_NUMBER = process.env.NEXT_PUBLIC_WHATSAPP_NUMBER ?? "";

const display = "font-[family-name:var(--font-display)]";
const body = "font-[family-name:var(--font-body)]";
const ease: [number, number, number, number] = [0.22, 1, 0.36, 1];

const focusRing =
  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-400 focus-visible:ring-offset-2";

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
    { label: "Our ethos", href: "/ethos" },
    { label: "The concierge", href: "/concierge" },
    { label: "Designers", href: "/ethos#designers" },
  ],
  legal: [
    { label: "Trust center", href: "/legal#trust", icon: Globe },
    { label: "Privacy promise", href: "/legal#privacy", icon: ShieldCheck },
    { label: "Terms of engagement", href: "/legal#terms", icon: Scale },
    { label: "No-refund policy", href: "/legal#refunds", icon: Lock },
  ],
};

/** Replace the Facebook, Instagram and YouTube fallbacks with your real profile URLs (or set the env vars). */
const SOCIALS = [
  { label: "Facebook", href: process.env.NEXT_PUBLIC_FACEBOOK_URL || "https://facebook.com", icon: FacebookIcon },
  { label: "Instagram", href: process.env.NEXT_PUBLIC_INSTAGRAM_URL || "https://instagram.com", icon: InstagramIcon },
  {
    label: "WhatsApp",
    href: WHATSAPP_NUMBER ? `https://wa.me/${WHATSAPP_NUMBER}` : "https://wa.me/",
    icon: WhatsAppIcon,
  },
  { label: "YouTube", href: process.env.NEXT_PUBLIC_YOUTUBE_URL || "https://youtube.com", icon: YoutubeIcon },
];

const MARQUEE_ITEMS: { label: string; icon: LucideIcon }[] = [
  { label: "Weddings", icon: Heart },
  { label: "Mehndi nights", icon: Moon },
  { label: "Birthdays", icon: Cake },
  { label: "Engagements", icon: Gem },
  { label: "Baby showers", icon: Baby },
  { label: "Corporate events", icon: Briefcase },
  { label: "Festive greetings", icon: PartyPopper },
];

/** All taken from what the product already promises elsewhere on the site. */
const CTA_PERKS = ["Free account", "No-code builder", "Live RSVP tracking", "24/7 WhatsApp support"];

/* -------------------------------------------------------------------------- */
/*  Shared motion                                                             */
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
const VIEWPORT = { once: true, margin: "-60px" } as const;

/** JS-side media query so size and input dependent effects aren't left to CSS alone. */
function useMediaQuery(query: string): boolean {
  const [matches, setMatches] = useState(false);
  useEffect(() => {
    const mq = window.matchMedia(query);
    const update = () => setMatches(mq.matches);
    update();
    mq.addEventListener("change", update);
    return () => mq.removeEventListener("change", update);
  }, [query]);
  return matches;
}

/** GSAP magnetic pull. Fine pointers only, and never with reduced motion. */
function useMagnetic<T extends HTMLElement>(strength = 0.3) {
  const ref = useRef<T>(null);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (
      window.matchMedia("(prefers-reduced-motion: reduce)").matches ||
      !window.matchMedia("(hover: hover) and (pointer: fine)").matches
    ) {
      return;
    }

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

/**
 * Looping decoration. The animated version is mounted only while `live`
 * (footer on screen and motion allowed); otherwise a plain static element is rendered.
 */
function Loop({
  live,
  className,
  animate,
  transition,
}: {
  live: boolean;
  className: string;
  animate: TargetAndTransition;
  transition: Transition;
}) {
  if (!live) return <span aria-hidden className={className} />;
  return <motion.span aria-hidden className={className} animate={animate} transition={transition} />;
}

/* -------------------------------------------------------------------------- */
/*  Call to action banner                                                     */
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

function CtaBanner({ live, reduce }: { live: boolean; reduce: boolean }) {
  const ref = useRef<HTMLDivElement>(null);
  const ctaRef = useMagnetic<HTMLAnchorElement>(0.25);

  // Subtle 3D tilt, capped at 3 degrees
  const mx = useMotionValue(0);
  const my = useMotionValue(0);
  const rotateX = useSpring(useTransform(my, [-0.5, 0.5], [3, -3]), { stiffness: 150, damping: 20 });
  const rotateY = useSpring(useTransform(mx, [-0.5, 0.5], [-3, 3]), { stiffness: 150, damping: 20 });

  // The banner settles into place as it scrolls into view
  const { scrollYProgress } = useScroll({ target: ref, offset: ["start end", "start 0.55"] });
  const settle = useTransform(scrollYProgress, [0, 1], [0.94, 1]);

  const onMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (e.pointerType !== "mouse") return;
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

  const orbMotion = (
    x: number[],
    y: number[],
    duration: number,
  ): { animate: TargetAndTransition; transition: Transition } => ({
    animate: { x, y },
    transition: { duration, repeat: Infinity, ease: "easeInOut" },
  });

  return (
    <motion.div
      ref={ref}
      variants={stagger}
      initial="hidden"
      whileInView="show"
      viewport={VIEWPORT}
      onPointerMove={onMove}
      onPointerLeave={onLeave}
      style={{ rotateX, rotateY, scale: reduce ? 1 : settle, transformPerspective: 1200 }}
      className="group relative mb-16 overflow-hidden rounded-[2.5rem] shadow-[0_20px_60px_-15px_rgba(249,115,22,0.45)]"
    >
      {/* Gradient base: it flows only while the footer is on screen */}
      {live ? (
        <motion.div
          aria-hidden
          animate={{ backgroundPosition: ["0% 50%", "100% 50%", "0% 50%"] }}
          transition={{ duration: 14, repeat: Infinity, ease: "linear" }}
          className="absolute inset-0 bg-gradient-to-br from-orange-500 via-orange-400 to-amber-500 bg-[length:220%_220%]"
        />
      ) : (
        <div
          aria-hidden
          className="absolute inset-0 bg-gradient-to-br from-orange-500 via-orange-400 to-amber-500 bg-[length:220%_220%]"
        />
      )}

      {/* Grid texture */}
      <div
        aria-hidden
        className="absolute inset-0 opacity-60 [background-image:linear-gradient(rgba(255,255,255,.09)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,.09)_1px,transparent_1px)] [background-size:36px_36px] [mask-image:radial-gradient(ellipse_at_center,black,transparent_75%)]"
      />

      {/* Drifting light */}
      <Loop
        live={live}
        {...orbMotion([0, 40, -20, 0], [0, 30, -10, 0], 14)}
        className="absolute -right-24 -top-32 h-[28rem] w-[28rem] rounded-full bg-white/15 blur-[90px]"
      />
      <Loop
        live={live}
        {...orbMotion([0, -30, 20, 0], [0, -20, 30, 0], 18)}
        className="absolute -bottom-40 -left-24 h-[24rem] w-[24rem] rounded-full bg-amber-200/25 blur-[90px]"
      />

      {/* Cursor glare */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 opacity-0 transition-opacity duration-500 group-hover:opacity-100"
        style={{
          background:
            "radial-gradient(420px circle at var(--bx, 50%) var(--by, 0%), rgba(255,255,255,0.22), transparent 60%)",
        }}
      />

      {/* Floating rings and dots */}
      <Loop
        live={live}
        animate={{ y: [0, -14, 0], scale: [1, 1.08, 1] }}
        transition={{ duration: 6, repeat: Infinity, ease: "easeInOut" }}
        className="pointer-events-none absolute right-[9%] top-[12%] h-16 w-16 rounded-full border-2 border-white/30"
      />
      <Loop
        live={live}
        animate={{ y: [0, 12, 0] }}
        transition={{ duration: 7, repeat: Infinity, ease: "easeInOut", delay: 1 }}
        className="pointer-events-none absolute bottom-[12%] right-[36%] h-9 w-9 rounded-full border-2 border-white/25"
      />
      <Loop
        live={live}
        animate={{ y: [0, -10, 0], opacity: [0.4, 0.9, 0.4] }}
        transition={{ duration: 4.5, repeat: Infinity, ease: "easeInOut", delay: 0.5 }}
        className="pointer-events-none absolute right-[28%] top-[16%] h-2.5 w-2.5 rounded-full bg-white/70"
      />
      <Loop
        live={live}
        animate={{ y: [0, 10, 0], opacity: [0.3, 0.8, 0.3] }}
        transition={{ duration: 5.5, repeat: Infinity, ease: "easeInOut", delay: 1.5 }}
        className="pointer-events-none absolute left-[46%] top-[10%] h-2 w-2 rounded-full bg-white/60"
      />

      <div className="relative z-10 flex flex-col items-center justify-between gap-10 p-8 md:flex-row md:p-14">
        <div className="max-w-2xl text-center md:text-left">
          <motion.div
            variants={rise}
            className="mb-6 inline-flex items-center gap-2 rounded-full border border-white/25 bg-white/20 px-3 py-1 text-xs font-bold text-white backdrop-blur-sm"
          >
            <span className="relative flex h-2 w-2" aria-hidden>
              {live && <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-white/80" />}
              <span className="relative inline-flex h-2 w-2 rounded-full bg-white" />
            </span>
            Free to start
          </motion.div>

          <h2 className={`mb-4 text-4xl font-bold leading-[1.1] text-white md:text-5xl lg:text-6xl ${display}`}>
            <SplitWords text="Ready to create something beautiful?" />
          </h2>

          <motion.p variants={rise} className={`mx-auto max-w-lg text-lg text-orange-50 md:mx-0 ${body}`}>
            Pick a template, make it yours, and share it in minutes. Then watch the RSVPs arrive live.
          </motion.p>

          <motion.ul
            variants={stagger}
            className="mt-7 flex flex-wrap items-center justify-center gap-2 md:justify-start"
          >
            {CTA_PERKS.map((perk) => (
              <motion.li
                key={perk}
                variants={rise}
                className="inline-flex items-center gap-1.5 rounded-full border border-white/20 bg-white/15 px-3 py-1 text-xs font-semibold text-white backdrop-blur-sm"
              >
                <Check className="h-3.5 w-3.5" strokeWidth={3} aria-hidden />
                {perk}
              </motion.li>
            ))}
          </motion.ul>
        </div>

        <motion.div variants={popIn} className="shrink-0">
          <Link
            ref={ctaRef}
            href="/register"
            className={`group/btn relative flex cursor-pointer items-center gap-3 overflow-hidden rounded-2xl bg-white px-8 py-5 font-bold text-orange-600 shadow-xl transition-shadow duration-300 hover:shadow-2xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white focus-visible:ring-offset-2 focus-visible:ring-offset-orange-500 ${display}`}
          >
            {live && (
              <motion.span
                aria-hidden
                animate={{ x: ["-120%", "320%"] }}
                transition={{ duration: 2.4, repeat: Infinity, repeatDelay: 1.6, ease: "easeInOut" }}
                className="pointer-events-none absolute inset-y-0 left-0 w-1/3 -skew-x-12 bg-gradient-to-r from-transparent via-orange-200/70 to-transparent"
              />
            )}
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
/*  Marquee: drives itself, and eases down when you hover it                  */
/* -------------------------------------------------------------------------- */

const MARQUEE_SPEED = 0.045; // px per ms

function MarqueeDriver({
  x,
  slow,
  rowRef,
}: {
  x: MotionValue<number>;
  slow: MotionValue<number>;
  rowRef: RefObject<HTMLDivElement | null>;
}) {
  const width = useRef(0);

  useEffect(() => {
    const el = rowRef.current;
    if (!el) return;
    const measure = () => {
      width.current = el.offsetWidth;
    };
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    return () => ro.disconnect();
  }, [rowRef]);

  useAnimationFrame((_, delta) => {
    const w = width.current;
    if (!w) return;
    let next = x.get() - Math.min(delta, 64) * MARQUEE_SPEED * slow.get();
    if (next <= -w) next += w;
    x.set(next);
  });

  return null;
}

function Marquee({ live }: { live: boolean }) {
  const x = useMotionValue(0);
  const slow = useSpring(1, { stiffness: 80, damping: 20 });
  const rowRef = useRef<HTMLDivElement>(null);

  const row = (ref?: RefObject<HTMLDivElement | null>) => (
    <div ref={ref} className="flex shrink-0 items-center gap-10 pr-10">
      {MARQUEE_ITEMS.map(({ label, icon: Icon }) => (
        <span key={label} className="group/item flex items-center gap-10">
          <span className="flex items-center gap-4">
            <span className="flex h-10 w-10 items-center justify-center rounded-xl border border-orange-100 bg-white text-orange-400 shadow-sm transition-colors duration-300 group-hover/item:border-orange-300 group-hover/item:text-orange-500 md:h-12 md:w-12">
              <Icon className="h-5 w-5 md:h-6 md:w-6" />
            </span>
            <span
              className={`cursor-default whitespace-nowrap text-3xl font-semibold text-stone-300 transition-colors duration-300 group-hover/item:text-orange-500 md:text-5xl ${display}`}
            >
              {label}
            </span>
          </span>
          <span className="h-2 w-2 shrink-0 rotate-45 rounded-[2px] bg-orange-300/70" />
        </span>
      ))}
    </div>
  );

  return (
    <div
      aria-hidden
      onPointerEnter={() => slow.set(0.15)}
      onPointerLeave={() => slow.set(1)}
      className="relative mb-20 overflow-hidden py-4 [mask-image:linear-gradient(to_right,transparent,black_12%,black_88%,transparent)]"
    >
      {live && <MarqueeDriver x={x} slow={slow} rowRef={rowRef} />}
      <motion.div className="flex w-max" style={{ x }}>
        {row(rowRef)}
        {row()}
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
        className={`group relative inline-flex w-fit items-center gap-2 rounded py-0.5 text-sm font-medium text-stone-500 transition-all duration-300 hover:translate-x-1 hover:text-orange-600 ${focusRing}`}
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

function FooterColumn({ title, children }: { title: string; children: ReactNode }) {
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
/*  Brand column                                                              */
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
        className={`relative flex h-11 w-11 cursor-pointer items-center justify-center overflow-hidden rounded-full border border-orange-100 bg-white text-stone-500 shadow-sm transition-colors duration-300 hover:border-orange-500 hover:text-white ${focusRing}`}
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

      {/* A plain wrapper owns the centering, so it can't clash with the motion transform inside */}
      <div className="pointer-events-none absolute bottom-full left-1/2 z-50 mb-3 -translate-x-1/2">
        <AnimatePresence>
          {hovered && (
            <motion.div
              initial={{ opacity: 0, y: 6, scale: 0.9 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 6, scale: 0.9 }}
              transition={{ duration: 0.18 }}
              className="relative whitespace-nowrap rounded-lg bg-stone-900 px-3 py-1.5 text-[11px] font-bold text-white shadow-xl"
            >
              {label}
              <span className="absolute -bottom-1 left-1/2 -ml-1 h-2 w-2 rotate-45 bg-stone-900" />
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </motion.div>
  );
}

function CopyEmail() {
  const [copied, setCopied] = useState(false);
  const timer = useRef<number | undefined>(undefined);

  useEffect(() => () => window.clearTimeout(timer.current), []);

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(SUPPORT_EMAIL);
      setCopied(true);
      window.clearTimeout(timer.current);
      timer.current = window.setTimeout(() => setCopied(false), 1800);
    } catch {
      window.location.href = `mailto:${SUPPORT_EMAIL}`;
    }
  };

  return (
    <motion.div
      variants={rise}
      className="mt-8 flex w-full max-w-sm items-center gap-3 rounded-2xl border border-orange-100 bg-white/80 p-1.5 pl-4 shadow-sm backdrop-blur"
    >
      <Mail className="h-4 w-4 shrink-0 text-orange-500" aria-hidden />
      <a
        href={`mailto:${SUPPORT_EMAIL}`}
        className={`min-w-0 flex-1 truncate rounded text-left text-sm font-medium text-stone-700 transition-colors hover:text-orange-600 ${body} ${focusRing}`}
      >
        {SUPPORT_EMAIL}
      </a>
      <motion.button
        type="button"
        onClick={copy}
        whileTap={{ scale: 0.94 }}
        aria-label={copied ? "Email copied" : "Copy support email"}
        className={`relative flex h-9 min-w-[5.5rem] cursor-pointer items-center justify-center overflow-hidden rounded-xl bg-orange-50 px-3 text-xs font-bold text-orange-600 transition-colors hover:bg-orange-100 ${display} ${focusRing}`}
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
/*  Watermark: scroll parallax, per-letter reveal, cursor flashlight          */
/* -------------------------------------------------------------------------- */

function WatermarkLayer({
  x,
  className,
  style,
}: {
  x: MotionValue<number>;
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
        className={`flex select-none whitespace-nowrap text-[20vw] font-black leading-[0.8] tracking-tighter ${display} ${className}`}
      >
        {"Riwainvite".split("").map((letter, i) => (
          <motion.span
            key={i}
            className="inline-block"
            variants={{
              hidden: { y: "70%", opacity: 0 },
              show: { y: 0, opacity: 1, transition: { delay: i * 0.05, duration: 0.9, ease } },
            }}
          >
            {letter}
          </motion.span>
        ))}
      </motion.div>
    </motion.div>
  );
}

/* -------------------------------------------------------------------------- */
/*  Back to top, with scroll progress ring                                    */
/* -------------------------------------------------------------------------- */

function BackToTop({ reduce }: { reduce: boolean }) {
  const lenis = useLenis();
  const { scrollYProgress } = useScroll();
  const progress = useSpring(scrollYProgress, { stiffness: 120, damping: 25 });
  const magnet = useMagnetic<HTMLButtonElement>(0.25);

  // Go through Lenis when it's active: a native smooth scroll would fight it.
  const toTop = () => {
    if (lenis) lenis.scrollTo(0, { duration: 1.4, immediate: reduce });
    else window.scrollTo({ top: 0, behavior: reduce ? "auto" : "smooth" });
  };

  return (
    <button
      ref={magnet}
      type="button"
      onClick={toTop}
      aria-label="Back to top"
      className={`group flex cursor-pointer items-center gap-3 rounded-full border border-orange-100 bg-white py-1.5 pl-4 pr-1.5 text-stone-500 shadow-sm transition-all duration-300 hover:border-orange-200 hover:text-orange-600 hover:shadow-[0_10px_25px_-10px_rgba(249,115,22,0.5)] ${focusRing}`}
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
  const finePointer = useMediaQuery("(hover: hover) and (pointer: fine)");
  const footerRef = useRef<HTMLElement>(null);
  const raf = useRef(0);

  // Every looping effect below runs only while the footer is on screen
  const footerInView = useInView(footerRef, { amount: 0.05 });
  const live = footerInView && !reduce;
  const lit = finePointer && !reduce;

  const { scrollYProgress } = useScroll({ target: footerRef, offset: ["start end", "end end"] });
  const watermarkX = useTransform(scrollYProgress, [0, 1], [60, -60]);

  const onPointerMove = useCallback((e: React.PointerEvent<HTMLElement>) => {
    if (e.pointerType !== "mouse") return;
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
    cancelAnimationFrame(raf.current);
    footerRef.current?.style.setProperty("--mx", "-999px");
    footerRef.current?.style.setProperty("--my", "-999px");
  }, []);

  useEffect(() => () => cancelAnimationFrame(raf.current), []);

  const flashlight = "radial-gradient(280px circle at var(--mx, -999px) var(--my, -999px), black, transparent 70%)";

  return (
    <footer
      ref={footerRef}
      onPointerMove={lit ? onPointerMove : undefined}
      onPointerLeave={onPointerLeave}
      className="relative overflow-hidden border-t border-orange-100/50 bg-[#fffafb] pb-10 pt-24"
    >
      {/* Travelling light on the top border */}
      {live && (
        <motion.div
          aria-hidden
          animate={{ x: ["-100%", "400%"] }}
          transition={{ duration: 6, repeat: Infinity, ease: "linear" }}
          className="absolute left-0 top-0 z-10 h-px w-1/4 bg-gradient-to-r from-transparent via-orange-400 to-transparent"
        />
      )}

      {/* Aurora and orb (margins centre the aurora, so no Tailwind translate clashes with the motion x) */}
      <Loop
        live={live}
        animate={{ x: [0, 80, -60, 0], opacity: [0.5, 0.9, 0.5] }}
        transition={{ duration: 20, repeat: Infinity, ease: "easeInOut" }}
        className="pointer-events-none absolute -top-40 left-1/2 -ml-[28rem] h-72 w-[56rem] rounded-full bg-orange-300/20 blur-3xl"
      />
      <Loop
        live={live}
        animate={{ y: [0, -40, 20, 0], x: [0, 30, -20, 0] }}
        transition={{ duration: 24, repeat: Infinity, ease: "easeInOut" }}
        className="pointer-events-none absolute -right-24 top-1/3 h-80 w-80 rounded-full bg-amber-200/20 blur-3xl"
      />

      {/* Dot pattern */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 z-0 opacity-[0.035]"
        style={{ backgroundImage: "radial-gradient(#f97316 1px, transparent 1px)", backgroundSize: "24px 24px" }}
      />

      {/* Watermark: faint base, plus a layer the cursor reveals */}
      <WatermarkLayer
        x={watermarkX}
        className="text-orange-200/45 [mask-image:linear-gradient(to_bottom,black_30%,transparent_100%)]"
      />
      {lit && (
        <WatermarkLayer
          x={watermarkX}
          className="text-orange-400/60"
          style={{ maskImage: flashlight, WebkitMaskImage: flashlight }}
        />
      )}

      <div className="relative z-10 mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <CtaBanner live={live} reduce={reduce} />
        <Marquee live={live} />

        <div className="mb-20 grid grid-cols-1 gap-12 lg:grid-cols-12 lg:gap-8">
          {/* Brand */}
          <motion.div
            variants={stagger}
            initial="hidden"
            whileInView="show"
            viewport={VIEWPORT}
            className="flex flex-col items-center text-center lg:col-span-4 lg:items-start lg:text-left"
          >
            <motion.div variants={rise}>
              <Link href="/" className="group mb-6 flex w-fit items-center gap-4" aria-label="Riwainvite home">
                <span className="flex h-12 w-12 items-center justify-center rounded-2xl border border-orange-100 bg-white shadow-[0_8px_20px_-8px_rgba(249,115,22,0.3)] transition-transform duration-300 group-hover:rotate-6 group-hover:scale-110">
                  <Image src="/logo.png" alt="" width={28} height={28} className="object-contain" />
                </span>
                <span className={`text-3xl font-bold tracking-tight text-stone-900 ${display}`}>Riwainvite</span>
              </Link>
            </motion.div>

            <motion.p variants={rise} className={`mb-10 max-w-sm text-sm leading-relaxed text-stone-500 ${body}`}>
              Create, share and track beautiful digital invitations for weddings, birthdays and corporate events.
            </motion.p>

            <motion.div variants={stagger} className="flex items-center gap-4">
              {SOCIALS.map((social) => (
                <SocialLink key={social.label} {...social} />
              ))}
            </motion.div>

            <CopyEmail />
          </motion.div>

          {/* Columns */}
          <motion.nav
            aria-label="Footer"
            variants={stagger}
            initial="hidden"
            whileInView="show"
            viewport={VIEWPORT}
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
                  className={`group inline-flex w-fit cursor-pointer items-center gap-2 rounded text-sm font-bold text-orange-500 transition-colors hover:text-orange-600 ${focusRing}`}
                >
                  <Mail className="h-4 w-4 transition-transform duration-300 group-hover:-rotate-12 group-hover:scale-125" />
                  Contact concierge
                </a>
              </motion.li>
            </FooterColumn>

            <FooterColumn title="Legal and trust">
              {FOOTER_LINKS.legal.map((l) => (
                <FooterLink key={l.label} {...l} />
              ))}
            </FooterColumn>
          </motion.nav>
        </div>

        {/* Bottom bar */}
        <motion.div
          variants={stagger}
          initial="hidden"
          whileInView="show"
          viewport={{ once: true }}
          className="flex flex-col items-center justify-between gap-6 border-t border-orange-100/70 pt-8 md:flex-row"
        >
          <div className="flex flex-col items-center gap-3 md:flex-row md:gap-8">
            <motion.p variants={rise} className={`text-xs font-medium text-stone-400 ${body}`}>
              © <span suppressHydrationWarning>{new Date().getFullYear()}</span> Riwainvite. All rights reserved.
            </motion.p>
            <motion.span variants={rise} className="flex items-center gap-1.5 text-xs font-medium text-stone-400">
              Made in Pakistan with love
              {live ? (
                <motion.span
                  aria-hidden
                  animate={{ scale: [1, 1.3, 1, 1.22, 1] }}
                  transition={{ duration: 1.4, repeat: Infinity, ease: "easeInOut" }}
                  className="inline-flex text-orange-500"
                >
                  <Heart className="h-3.5 w-3.5 fill-current" />
                </motion.span>
              ) : (
                <span aria-hidden className="inline-flex text-orange-500">
                  <Heart className="h-3.5 w-3.5 fill-current" />
                </span>
              )}
            </motion.span>
          </div>

          <motion.div variants={rise}>
            <BackToTop reduce={reduce} />
          </motion.div>
        </motion.div>
      </div>
    </footer>
  );
}