"use client";

import { useEffect, useId, useState } from "react";
import Link from "next/link";
import { motion, useReducedMotion, type Variants } from "framer-motion";

/*
 * Design notes
 *  - Same language as CraftTeaser: one clean cream-to-orange gradient (no photo, no
 *    wash, no glow), large editorial headline (ink, then ink at half strength),
 *    pill buttons, no icons.
 *  - The accordion is a hairline list, not a stack of boxes. One orange rule slides
 *    between rows to mark the open question.
 */

/* -------------------------------------------------------------------------- */
/*  Content and config                                                        */
/* -------------------------------------------------------------------------- */

/** Set NEXT_PUBLIC_WHATSAPP_NUMBER to digits only, with country code (e.g. 923001234567). */
const WHATSAPP_NUMBER = process.env.NEXT_PUBLIC_WHATSAPP_NUMBER ?? "";
const WHATSAPP_HREF = WHATSAPP_NUMBER
  ? `https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent("Hi Riwainvite, I have a question.")}`
  : "https://wa.me/";

const EASE = [0.16, 1, 0.3, 1] as const;

const GRADIENT =
  "linear-gradient(180deg, #fffaf6 0%, #fff6ee 42%, #ffe2c6 70%, #ffb06d 90%, #f97316 100%)";

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
  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-600 focus-visible:ring-offset-2 focus-visible:ring-offset-[#fff6ee]";

const headlineLines = [
  { words: ["Questions,"], muted: false },
  { words: ["answered."], muted: true },
];

/* -------------------------------------------------------------------------- */
/*  Helpers and variants                                                      */
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

const headlineParent: Variants = {
  hidden: {},
  show: { transition: { staggerChildren: 0.09, delayChildren: 0.05 } },
};

const wordUp: Variants = {
  hidden: { y: "112%", rotate: 3 },
  show: { y: 0, rotate: 0, transition: { duration: 1, ease: EASE } },
};

const fadeUp: Variants = {
  hidden: { opacity: 0, y: 22 },
  show: { opacity: 1, y: 0, transition: { duration: 0.8, ease: EASE } },
};

const introParent: Variants = {
  hidden: {},
  show: { transition: { staggerChildren: 0.12, delayChildren: 0.35 } },
};

const listVariants: Variants = {
  hidden: {},
  show: { transition: { staggerChildren: 0.09, delayChildren: 0.15 } },
};

const rowVariants: Variants = {
  hidden: { opacity: 0, y: 26 },
  show: { opacity: 1, y: 0, transition: { duration: 0.8, ease: EASE } },
};

/* -------------------------------------------------------------------------- */
/*  Accordion row                                                             */
/* -------------------------------------------------------------------------- */

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
  const t = reduce ? { duration: 0 } : { duration: 0.4, ease: EASE };

  return (
    <motion.li variants={rowVariants} className="group relative">
      {/* resting hairline */}
      <span aria-hidden className="absolute inset-x-0 top-0 h-px bg-[#17100c]/15" />

      {/* the orange rule: one element that slides to whichever row is open */}
      {open && (
        <motion.span
          aria-hidden
          layoutId="faq-open-rule"
          transition={reduce ? { duration: 0 } : { type: "spring", stiffness: 420, damping: 38 }}
          className="absolute inset-x-0 top-0 z-10 h-[2px] bg-[#f97316]"
        />
      )}

      <h3>
        <button
          id={buttonId}
          type="button"
          aria-expanded={open}
          aria-controls={panelId}
          onClick={onToggle}
          className={`flex w-full cursor-pointer items-center justify-between gap-6 py-6 text-left sm:py-7 ${focusRing}`}
        >
          <span
            className={`font-[family-name:var(--font-display)] text-lg font-semibold tracking-[-0.01em] transition-[color,transform] duration-300 sm:text-2xl ${
              open
                ? "text-[#17100c]"
                : "text-[#17100c]/70 group-hover:translate-x-1 group-hover:text-[#17100c]"
            }`}
          >
            {item.question}
          </span>

          {/* Open/close marker drawn from two bars: the vertical one collapses */}
          <span
            aria-hidden
            className={`relative flex h-9 w-9 shrink-0 items-center justify-center rounded-full border transition-colors duration-300 ${
              open
                ? "border-[#f97316] bg-[#f97316]"
                : "border-[#17100c]/25 group-hover:border-[#17100c]/60"
            }`}
          >
            <span
              className={`absolute h-[2px] w-3.5 rounded-full transition-colors duration-300 ${
                open ? "bg-white" : "bg-[#17100c]"
              }`}
            />
            <motion.span
              initial={false}
              animate={{ scaleY: open ? 0 : 1, rotate: open ? 90 : 0 }}
              transition={t}
              className={`absolute h-3.5 w-[2px] rounded-full transition-colors duration-300 ${
                open ? "bg-white" : "bg-[#17100c]"
              }`}
            />
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
        <motion.p
          initial={false}
          animate={{ y: open ? 0 : 10, filter: open ? "blur(0px)" : "blur(4px)" }}
          transition={reduce ? { duration: 0 } : { duration: 0.5, ease: EASE, delay: open ? 0.08 : 0 }}
          className="max-w-xl pb-7 pr-14 font-[family-name:var(--font-body)] text-base leading-relaxed text-[#17100c]/70 sm:pb-8 sm:text-[1.05rem]"
        >
          {item.answer}
        </motion.p>
      </motion.div>
    </motion.li>
  );
}

/* -------------------------------------------------------------------------- */
/*  Section                                                                   */
/* -------------------------------------------------------------------------- */

export function FAQ() {
  const reduce = !!useReducedMotion();
  const [openIndex, setOpenIndex] = useState<number | null>(0);

  // Sticky only where it fits: wide AND tall enough to hold the left column.
  const stickyOn = useMediaQuery("(min-width: 1024px) and (min-height: 640px)");

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: FAQ_JSON_LD }} />

      {/* overflow-clip (not hidden) so position: sticky inside still works */}
      <section
        id="faq"
        aria-labelledby="faq-heading"
        style={{ background: GRADIENT }}
        className="relative isolate overflow-clip pb-32 pt-24 sm:pb-44 sm:pt-32"
      >
        <div className="relative z-10 mx-auto grid max-w-7xl gap-14 px-4 sm:px-6 lg:grid-cols-[5fr_7fr] lg:gap-20 lg:px-12">
          {/* Left: sticky intro */}
          <div className="self-start" style={stickyOn ? { position: "sticky", top: 96 } : undefined}>
            <motion.h2
              id="faq-heading"
              variants={headlineParent}
              initial={reduce ? "show" : "hidden"}
              whileInView="show"
              viewport={{ once: true, margin: "-80px" }}
              className="font-[family-name:var(--font-display)] text-[clamp(2.75rem,1rem+5.4vw,5.25rem)] font-semibold leading-[0.98] tracking-[-0.035em]"
            >
              {headlineLines.map((line, li) => (
                <span key={li} className="block">
                  {line.words.map((w, wi) => (
                    <span key={wi} className="inline-block overflow-hidden pb-[0.1em] align-bottom">
                      <motion.span
                        variants={wordUp}
                        className={`inline-block origin-bottom-left ${
                          line.muted ? "text-[#17100c]/45" : "text-[#17100c]"
                        }`}
                      >
                        {w}
                      </motion.span>
                    </span>
                  ))}
                </span>
              ))}
            </motion.h2>

            <motion.div
              variants={introParent}
              initial={reduce ? "show" : "hidden"}
              whileInView="show"
              viewport={{ once: true, margin: "-60px" }}
            >
              <motion.p
                variants={fadeUp}
                className="mt-6 max-w-md font-[family-name:var(--font-body)] text-base font-medium leading-relaxed text-[#17100c]/75 sm:text-lg"
              >
                Everything you need to know about designing, sharing and tracking your invitation. Can&apos;t
                find your answer? We&apos;re one message away.
              </motion.p>

              <motion.div variants={fadeUp} className="mt-8 flex flex-wrap items-center gap-3">
                <Link
                  href="/register"
                  className={`group relative inline-flex items-center justify-center overflow-hidden rounded-full bg-[#17100c] px-7 py-3.5 text-[15px] font-semibold text-white transition-transform hover:scale-[1.02] active:scale-[0.98] ${focusRing}`}
                >
                  <span
                    aria-hidden
                    className="absolute inset-0 translate-y-[102%] rounded-t-[50%] bg-[#f97316] transition-all duration-500 ease-out group-hover:translate-y-0 group-hover:rounded-t-none"
                  />
                  <span className="relative">Create free account</span>
                </Link>

                <a
                  href={WHATSAPP_HREF}
                  target="_blank"
                  rel="noopener noreferrer"
                  className={`inline-flex items-center justify-center rounded-full border border-[#17100c]/25 bg-white/40 px-6 py-3.5 text-[15px] font-semibold text-[#17100c] backdrop-blur-sm transition-colors hover:bg-white ${focusRing}`}
                >
                  Chat on WhatsApp
                  <span className="sr-only"> (opens in a new tab)</span>
                </a>
              </motion.div>

              <motion.p variants={fadeUp} className="mt-5 text-sm font-medium text-[#17100c]/60">
                24/7 WhatsApp support is included with every plan.
              </motion.p>
            </motion.div>
          </div>

          {/* Right: accordion */}
          <motion.ul
            variants={listVariants}
            initial={reduce ? "show" : "hidden"}
            whileInView="show"
            viewport={{ once: true, margin: "-60px" }}
            className="border-b border-[#17100c]/15"
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