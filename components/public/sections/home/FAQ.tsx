"use client";

import { useEffect, useId, useRef, useState, type ReactNode, type RefObject } from "react";
import Image from "next/image";
import Link from "next/link";
import { motion, useReducedMotion, useScroll, useTransform, type Variants } from "framer-motion";
import { ArrowRight, HelpCircle, MessageCircle, Minus, Plus } from "lucide-react";

/* -------------------------------------------------------------------------- */
/*  Content and config                                                        */
/* -------------------------------------------------------------------------- */

/**
 * Section background. Swap to "/faq.webp" to serve the pre-compressed copy as the source
 * (~61 KB vs ~1.9 MB). Either way next/image resizes it and serves AVIF/WebP to the browser.
 */
const FAQ_IMAGE = "/faq.png";

// 24px JPEG, inlined: the image fades in from this instead of popping in.
const FAQ_BLUR =
  "data:image/jpeg;base64,/9j/4AAQSkZJRgABAQAAAQABAAD/2wBDABIMDRANCxIQDhAUExIVGywdGxgYGzYnKSAsQDlEQz85Pj1HUGZXR0thTT0+WXlaYWltcnNyRVV9hnxvhWZwcm7/2wBDARMUFBsXGzQdHTRuST5Jbm5ubm5ubm5ubm5ubm5ubm5ubm5ubm5ubm5ubm5ubm5ubm5ubm5ubm5ubm5ubm5ubm7/wAARCAASABgDASIAAhEBAxEB/8QAHwAAAQUBAQEBAQEAAAAAAAAAAAECAwQFBgcICQoL/8QAtRAAAgEDAwIEAwUFBAQAAAF9AQIDAAQRBRIhMUEGE1FhByJxFDKBkaEII0KxwRVS0fAkM2JyggkKFhcYGRolJicoKSo0NTY3ODk6Q0RFRkdISUpTVFVWV1hZWmNkZWZnaGlqc3R1dnd4eXqDhIWGh4iJipKTlJWWl5iZmqKjpKWmp6ipqrKztLW2t7i5usLDxMXGx8jJytLT1NXW19jZ2uHi4+Tl5ufo6erx8vP09fb3+Pn6/8QAHwEAAwEBAQEBAQEBAQAAAAAAAAECAwQFBgcICQoL/8QAtREAAgECBAQDBAcFBAQAAQJ3AAECAxEEBSExBhJBUQdhcRMiMoEIFEKRobHBCSMzUvAVYnLRChYkNOEl8RcYGRomJygpKjU2Nzg5OkNERUZHSElKU1RVVldYWVpjZGVmZ2hpanN0dXZ3eHl6goOEhYaHiImKkpOUlZaXmJmaoqOkpaanqKmqsrO0tba3uLm6wsPExcbHyMnK0tPU1dbX2Nna4uPk5ebn6Onq8vP09fb3+Pn6/9oADAMBAAIRAxEAPwDoFnCEKdxJ9BUxeQckgf7P/wBeo1jbABDLz1FPwwbcMAdMk1z6nW7MPtCcxK+XXqD1opVOFwyhm7sABmiq3FFWWpL2P0qNun/AqKKJCiR96KKKaKP/2Q==";

/** Set NEXT_PUBLIC_WHATSAPP_NUMBER to digits only, with country code (e.g. 923001234567). */
const WHATSAPP_NUMBER = process.env.NEXT_PUBLIC_WHATSAPP_NUMBER ?? "";
const WHATSAPP_HREF = WHATSAPP_NUMBER
  ? `https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent("Hi Riwainvite, I have a question.")}`
  : "https://wa.me/";

const EASE = [0.16, 1, 0.3, 1] as const;

interface Faq {
  question: string;
  answer: string;
}

// Plain strings on purpose: the same text feeds the visible answer and the FAQPage JSON-LD.
const FAQS: Faq[] = [
  {
    question: "Can I design for free?",
    answer:
      "Yes. Create a free account, choose a template and personalize it with your names, photos, venue and event time. You only pay when you're ready to unlock your design and publish it with your own link.",
  },
  {
    question: "Do guests need an account?",
    answer:
      "No. Guests open your invitation link on any device and reply from there. They never need to sign up or download anything.",
  },
  {
    question: "What happens after the event?",
    answer:
      "Your invitation stays live for the length of your plan. You can keep reviewing RSVPs and messages in your dashboard and export your guest list whenever you need it.",
  },
  {
    question: "Can I use my own photos?",
    answer:
      "Yes. Upload your own photos, and add your favorite music track too. The no-code builder lets you change fonts, colors and layout without writing any code.",
  },
  {
    question: "What is your refund policy?",
    answer:
      "All purchases are final, so we don't offer refunds. You can design for free first, so you know exactly what you're getting before you pay.",
  },
  {
    question: "How do I get help?",
    answer:
      "Message us on WhatsApp. 24/7 WhatsApp support is included with every plan, and we'll help you with anything from choosing a template to publishing your link.",
  },
];

// Structured data for search engines. "<" is escaped so the JSON can never close the script tag.
const FAQ_JSON_LD = JSON.stringify({
  "@context": "https://schema.org",
  "@type": "FAQPage",
  mainEntity: FAQS.map((f) => ({
    "@type": "Question",
    name: f.question,
    acceptedAnswer: { "@type": "Answer", text: f.answer },
  })),
}).replace(/</g, "\\u003c");

const focusRing =
  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-500 focus-visible:ring-offset-2 focus-visible:ring-offset-[#fffafb]";

/* -------------------------------------------------------------------------- */
/*  Helpers                                                                   */
/* -------------------------------------------------------------------------- */

/** JS-side media query so size-dependent behavior isn't left to CSS alone. */
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

const wordsParent: Variants = {
  hidden: {},
  show: { transition: { staggerChildren: 0.08, delayChildren: 0.05 } },
};

const wordChild: Variants = {
  hidden: { y: "115%" },
  show: { y: "0%", transition: { duration: 0.8, ease: EASE } },
};

/** Masked headline. The in-view trigger is on the heading, never on the clipped words. */
function RevealHeading({
  id,
  words,
  gradientFrom,
  reduce,
}: {
  id: string;
  words: string[];
  gradientFrom: number;
  reduce: boolean;
}) {
  return (
    <motion.h2
      id={id}
      variants={wordsParent}
      initial={reduce ? "show" : "hidden"}
      whileInView="show"
      viewport={{ once: true, margin: "-80px" }}
      className="mt-6 font-[family-name:var(--font-display)] text-4xl font-bold leading-[1.1] tracking-tight text-gray-900 sm:text-5xl lg:text-6xl"
    >
      {words.map((w, i) => (
        <span key={`${w}-${i}`} className="mr-[0.25em] inline-block overflow-hidden pb-[0.14em] align-bottom">
          <motion.span
            variants={wordChild}
            className={`inline-block ${
              i >= gradientFrom
                ? "bg-gradient-to-r from-[#f97316] via-amber-500 to-[#f97316] bg-clip-text text-transparent"
                : ""
            }`}
          >
            {w}
          </motion.span>
        </span>
      ))}
    </motion.h2>
  );
}

function FadeUp({
  children,
  delay = 0,
  reduce,
  className,
}: {
  children: ReactNode;
  delay?: number;
  reduce: boolean;
  className?: string;
}) {
  return (
    <motion.div
      className={className}
      initial={reduce ? false : { opacity: 0, y: 20 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-60px" }}
      transition={{ duration: 0.7, delay, ease: EASE }}
    >
      {children}
    </motion.div>
  );
}

/* -------------------------------------------------------------------------- */
/*  Accordion                                                                 */
/* -------------------------------------------------------------------------- */

const listVariants: Variants = {
  hidden: {},
  show: { transition: { staggerChildren: 0.09 } },
};

const rowVariants: Variants = {
  hidden: { opacity: 0, y: 24 },
  show: { opacity: 1, y: 0, transition: { duration: 0.7, ease: EASE } },
};

function FaqItem({
  item,
  open,
  onToggle,
  reduce,
}: {
  item: Faq;
  open: boolean;
  onToggle: () => void;
  reduce: boolean;
}) {
  const uid = useId();
  const buttonId = `${uid}-button`;
  const panelId = `${uid}-panel`;
  const t = reduce ? { duration: 0 } : { duration: 0.35, ease: EASE };

  return (
    <motion.li
      variants={rowVariants}
      className={`rounded-2xl border transition-[background-color,border-color,box-shadow] duration-300 ${
        open
          ? "border-orange-400 bg-white shadow-[0_20px_50px_-20px_rgba(249,115,22,0.5)]"
          : "border-orange-100/80 bg-white/60 hover:border-orange-200 hover:bg-white/80"
      }`}
    >
      <h3>
        <button
          id={buttonId}
          type="button"
          aria-expanded={open}
          aria-controls={panelId}
          onClick={onToggle}
          className={`flex w-full cursor-pointer items-center justify-between gap-6 rounded-2xl px-5 py-5 text-left sm:px-6 ${focusRing}`}
        >
          <span className="font-[family-name:var(--font-display)] text-base font-semibold text-gray-900 sm:text-lg">
            {item.question}
          </span>

          {/* Plus and minus cross-fade, so there's no mount/unmount to hang */}
          <span
            aria-hidden
            className={`relative flex h-9 w-9 shrink-0 items-center justify-center rounded-full transition-colors duration-300 ${
              open ? "bg-orange-500 text-white" : "bg-orange-50 text-orange-600"
            }`}
          >
            <motion.span
              className="absolute"
              initial={false}
              animate={{ opacity: open ? 0 : 1, rotate: open ? 90 : 0, scale: open ? 0.5 : 1 }}
              transition={t}
            >
              <Plus className="h-4 w-4" strokeWidth={2.5} />
            </motion.span>
            <motion.span
              className="absolute"
              initial={false}
              animate={{ opacity: open ? 1 : 0, rotate: open ? 0 : -90, scale: open ? 1 : 0.5 }}
              transition={t}
            >
              <Minus className="h-4 w-4" strokeWidth={2.5} />
            </motion.span>
          </span>
        </button>
      </h3>

      {/* Always in the DOM (good for crawlers); inert while closed so it can't be tabbed into. */}
      <motion.div
        id={panelId}
        role="region"
        aria-labelledby={buttonId}
        inert={!open}
        initial={false}
        animate={{ height: open ? "auto" : 0, opacity: open ? 1 : 0 }}
        transition={t}
        className="overflow-hidden"
      >
        <p className="px-5 pb-6 pr-16 font-[family-name:var(--font-body)] text-[0.95rem] leading-relaxed text-gray-600 sm:px-6 sm:pr-20">
          {item.answer}
        </p>
      </motion.div>
    </motion.li>
  );
}

/* -------------------------------------------------------------------------- */
/*  Background                                                                */
/* -------------------------------------------------------------------------- */

// Fades the image into the page canvas at the top and bottom, so neighbouring sections meet cleanly.
const EDGE_FADE = "linear-gradient(to bottom, transparent 0%, #000 14%, #000 86%, transparent 100%)";

function FaqBackground({ target, reduce }: { target: RefObject<HTMLElement | null>; reduce: boolean }) {
  // Slow parallax drift tied to scroll position (no loop, nothing to unmount).
  const { scrollYProgress } = useScroll({ target, offset: ["start end", "end start"] });
  const y = useTransform(scrollYProgress, [0, 1], ["-4%", "4%"]);

  return (
    <div
      aria-hidden
      className="pointer-events-none absolute inset-0 -z-10"
      style={{ maskImage: EDGE_FADE, WebkitMaskImage: EDGE_FADE }}
    >
      {/* Oversized vertically so the parallax never reveals an edge */}
      <motion.div className="absolute inset-x-0 -bottom-[8%] -top-[8%]" style={reduce ? undefined : { y }}>
        {/* Decorative, so empty alt */}
        <Image
          src={FAQ_IMAGE}
          alt=""
          fill
          sizes="100vw"
          quality={90}
          placeholder="blur"
          blurDataURL={FAQ_BLUR}
          className="object-cover"
        />
      </motion.div>
      {/* Wash keeps the text readable on the left, but lets the image pop on the right */}
      <div className="absolute inset-0 bg-gradient-to-r from-[#fffafb] via-[#fffafb]/80 to-transparent" />
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/*  Section                                                                   */
/* -------------------------------------------------------------------------- */

export function FAQ() {
  const reduce = !!useReducedMotion();
  const [openIndex, setOpenIndex] = useState<number | null>(0);

  const sectionRef = useRef<HTMLElement>(null);

  // Sticky only where it fits: wide AND tall enough to hold the left column.
  const stickyOn = useMediaQuery("(min-width: 1024px) and (min-height: 640px)");

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: FAQ_JSON_LD }} />

      {/* overflow-clip (not hidden) so position: sticky inside still works */}
      <section
        id="faq"
        ref={sectionRef}
        aria-labelledby="faq-heading"
        className="relative isolate overflow-clip bg-[#fffafb] py-24 sm:py-32"
      >
        <FaqBackground target={sectionRef} reduce={reduce} />

        <div className="relative z-10 mx-auto grid max-w-7xl gap-14 px-4 sm:px-6 lg:grid-cols-[5fr_7fr] lg:gap-20 lg:px-12">
          {/* Left: sticky intro */}
          <div className="self-start" style={stickyOn ? { position: "sticky", top: 96 } : undefined}>
            <FadeUp reduce={reduce}>
              <span className="inline-flex items-center gap-2 rounded-full border border-orange-200/70 bg-white/70 px-4 py-1.5 text-sm font-semibold text-orange-600 shadow-sm backdrop-blur-md">
                <HelpCircle className="h-3.5 w-3.5" aria-hidden /> FAQ
              </span>
            </FadeUp>

            <RevealHeading id="faq-heading" words={["Questions,", "answered."]} gradientFrom={1} reduce={reduce} />

            <FadeUp reduce={reduce} delay={0.25}>
              <p className="mt-5 max-w-md font-[family-name:var(--font-body)] text-base leading-relaxed text-gray-600 sm:text-lg">
                Everything you need to know about designing, sharing and tracking your invitation. Can&apos;t find
                your answer? We&apos;re one message away.
              </p>
            </FadeUp>

            <FadeUp reduce={reduce} delay={0.35} className="mt-8 flex flex-wrap items-center gap-3">
              <motion.div whileHover={reduce ? undefined : { scale: 1.03 }} whileTap={{ scale: 0.97 }}>
                <Link
                  href="/register"
                  className={`group inline-flex cursor-pointer items-center gap-2 rounded-xl bg-[#2a2a2a] px-6 py-3.5 font-[family-name:var(--font-display)] text-sm font-bold text-white shadow-lg transition-colors duration-300 hover:bg-[#3a3a3a] ${focusRing}`}
                >
                  Create free account
                  <ArrowRight
                    className="h-4 w-4 transition-transform duration-300 group-hover:translate-x-1"
                    aria-hidden
                  />
                </Link>
              </motion.div>

              <motion.div whileHover={reduce ? undefined : { scale: 1.03 }} whileTap={{ scale: 0.97 }}>
                <a
                  href={WHATSAPP_HREF}
                  target="_blank"
                  rel="noopener noreferrer"
                  className={`inline-flex cursor-pointer items-center gap-2 rounded-xl border border-gray-200 bg-white px-6 py-3.5 font-[family-name:var(--font-display)] text-sm font-bold text-gray-900 shadow-sm transition-colors duration-300 hover:border-emerald-300 hover:bg-emerald-50/50 ${focusRing}`}
                >
                  <MessageCircle className="h-4 w-4 text-emerald-600" aria-hidden />
                  Chat on WhatsApp
                  <span className="sr-only"> (opens in a new tab)</span>
                </a>
              </motion.div>
            </FadeUp>
          </div>

          {/* Right: accordion */}
          <motion.ul
            variants={listVariants}
            initial={reduce ? "show" : "hidden"}
            whileInView="show"
            viewport={{ once: true, margin: "-60px" }}
            className="space-y-4"
          >
            {FAQS.map((item, i) => (
              <FaqItem
                key={item.question}
                item={item}
                open={openIndex === i}
                onToggle={() => setOpenIndex(openIndex === i ? null : i)}
                reduce={reduce}
              />
            ))}
          </motion.ul>
        </div>
      </section>
    </>
  );
}

export default FAQ;