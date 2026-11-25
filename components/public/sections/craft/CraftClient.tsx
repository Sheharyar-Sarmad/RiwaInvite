"use client";

import { useState } from "react";
import Image from "next/image";
import { AnimatePresence, motion, useMotionValueEvent, useReducedMotion, useScroll } from "framer-motion";
import { useLenis } from "lenis/react";
import {
  ArrowRight, ArrowUpRight, CalendarHeart, ChevronDown, Clock, Eye, Globe, Link2,
  MessageSquare, Minus, Monitor, PenTool, RefreshCcw, Rocket, Check,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { CraftModal } from "@/components/public/models/CraftModal";
import { ShellBackground } from "@/components/ui/ShellBackground";
import {
  CARD_BG,
  CARD_SHADOW,
  EASE,
  FeatureList,
  TICKET_MASK,
  focusRing,
  itemVariants,
  listVariants,
} from "@/components/public/sections/plans/PlanUI";

type Service = "website" | "template";

const darkBtn = "bg-[#1c1410] text-white transition-colors hover:bg-[#2c211a]";
const ghostBtn = "border border-[#1c1410]/25 bg-white/60 text-[#1c1410] transition-colors hover:bg-white";

const SERVICES: {
  key: Service; title: string; tag: string; timeline: string; image: string; blurb: string;
  features: string[]; cta: string; popular: boolean;
}[] = [
  {
    key: "website",
    title: "Crafted Website",
    tag: "Fully bespoke",
    timeline: "7–14 days",
    image: "/craft-website-card.png",
    blurb: "A one-of-a-kind website coded from scratch around your story, with custom animations, unique layouts and your own domain.",
    features: [
      "100% bespoke design & code",
      "Your own domain: purchase & DNS setup handled",
      "Advanced animations",
      "Built-in RSVP",
      "2 rounds of revisions",
    ],
    cta: "Start my Crafted Website",
    popular: true,
  },
  {
    key: "template",
    title: "Crafted Template",
    tag: "Fastest route",
    timeline: "3–5 days",
    image: "/craft-template-card.png",
    blurb: "Pick a premium template and our designers reshape the colours, fonts, sections and imagery until it feels made for you.",
    features: [
      "Premium design of your choice",
      "Complete colour & font overhaul",
      "Your photos and details integrated",
      "Live preview link before launch",
      "2 rounds of revisions",
    ],
    cta: "Customize a Template",
    popular: false,
  },
];

const PROCESS = [
  { icon: MessageSquare, title: "The Brief", desc: "We hop on a call to understand your event, your vibe and your exact requirements." },
  { icon: PenTool, title: "The Craft", desc: "Our design team customizes a premium template or builds your bespoke site from scratch." },
  { icon: Monitor, title: "The Review", desc: "You get a live link to preview every animation, font and RSVP feature before we launch." },
  { icon: Rocket, title: "The Launch", desc: "We connect your custom domain, optimize the speed and hand over the keys." },
];

const COMPARE: { label: string; template: string | boolean; website: string | boolean }[] = [
  { label: "Pricing", template: "Quoted to your needs", website: "Quoted to your needs" },
  { label: "Typical delivery", template: "3–5 days", website: "7–14 days" },
  { label: "Design", template: "Premium template, heavily customized", website: "100% bespoke" },
  { label: "Custom domain", template: true, website: true },
  { label: "RSVP", template: "Discussed in your brief", website: true },
  { label: "Advanced animations", template: "Depends on the template", website: true },
  { label: "Revision rounds", template: "2", website: "2" },
];

const FAQS = [
  { q: "How much does it cost?", a: "It depends on what you need. Tell us about your event and your ideas, and we will quote you after the brief. There is no one-size-fits-all number." },
  { q: "How long does a Crafted Website take?", a: "Depending on the complexity, a fully bespoke website usually takes 7–14 days from start to finish. Crafted templates are usually delivered in 3–5 days." },
  { q: "Do I need to buy my own domain?", a: "No, our team will handle the entire domain purchasing and DNS setup process for you. We will just ask for your preferred name." },
  { q: "Can I request changes after it's built?", a: "Absolutely. We include 2 rounds of revisions before launch. If you need ongoing changes after the event, we can arrange that too." },
  { q: "What if I already have a template?", a: "If you bought a template from our store, we can use that as the base and heavily customize it for you at a discounted rate." },
  { q: "Is my event type supported?", a: "Yes. You describe your event in your own words, whether it's a wedding, a mehndi night, a graduation or something unusual, and we design around it." },
  { q: "What do you need from me to start?", a: "Just your event details, a rough idea of the vibe, and your preferred domain name. Photos and reference links help, but they aren't required to begin." },
];

/* ------------------------------------------------------------------ */

function SectionHead({ eyebrow, title, sub }: { eyebrow: string; title: string; sub?: string }) {
  const reduce = useReducedMotion() ?? false;
  return (
    <motion.div
      initial={reduce ? false : { opacity: 0, y: 20 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-80px" }}
      transition={{ duration: 0.7, ease: EASE }}
      className="mx-auto mb-12 max-w-3xl text-center sm:mb-16"
    >
      <p className="mb-4 text-xs font-semibold uppercase tracking-[0.3em] text-stone-600">{eyebrow}</p>
      <h2 className="font-[family-name:var(--font-display)] text-4xl font-bold leading-[1.1] tracking-tight text-[#1c1410] sm:text-5xl">
        {title}
      </h2>
      {sub && <p className="mx-auto mt-5 max-w-2xl text-base leading-relaxed text-stone-600 sm:text-lg">{sub}</p>}
    </motion.div>
  );
}

function Meta({ value, label }: { value: string; label: string }) {
  return (
    <div className="rounded-xl border border-[#1c1410]/10 bg-white/55 px-3.5 py-2.5">
      <p className="font-[family-name:var(--font-display)] text-lg font-bold leading-6 text-[#1c1410]">{value}</p>
      <p className="mt-0.5 text-xs text-stone-500">{label}</p>
    </div>
  );
}

function ServiceTicket({ s, onOpen }: { s: (typeof SERVICES)[number]; onOpen: (k: Service) => void }) {
  return (
    <li className={cn("min-w-0 transition-transform duration-300 hover:-translate-y-1", CARD_SHADOW)}>
      <motion.div variants={itemVariants} className="h-full">
        <article
          aria-label={s.title}
          style={{ WebkitMask: TICKET_MASK, mask: TICKET_MASK }}
          className={cn(
            "group/card relative flex h-full flex-col overflow-hidden rounded-2xl border",
            CARD_BG,
            s.popular ? "border-[#1c1410]/40" : "border-black/[0.07]",
          )}
        >
          {s.popular && <span aria-hidden className="absolute inset-x-0 top-0 z-10 h-1 bg-[#1c1410]" />}

          <div className="flex flex-1 flex-col p-6 sm:p-7">
            <div className="relative aspect-[16/10] w-full overflow-hidden rounded-xl ring-1 ring-black/10">
              <Image
                src={s.image} alt="" aria-hidden fill quality={90}
                sizes="(min-width:1024px) 560px, 100vw" className="object-cover object-center"
              />
            </div>

            <div className="mt-6 flex items-start justify-between gap-3">
              <h3 className="font-[family-name:var(--font-display)] text-2xl font-bold leading-7 tracking-[-0.01em] text-[#1c1410]">
                {s.title}
              </h3>
              <span className="shrink-0 rounded border border-[#1c1410]/20 px-1.5 text-[10px] font-semibold uppercase leading-4 tracking-[0.1em] text-[#1c1410]/80">
                {s.popular ? "Most popular" : s.tag}
              </span>
            </div>
            <p className="mt-2 text-sm leading-relaxed text-stone-600">{s.blurb}</p>

            <div className="mt-6 grid grid-cols-2 gap-2.5 border-t border-dashed border-[#1c1410]/25 pt-6">
              <Meta value="Quoted" label="Priced to your needs" />
              <Meta value={s.timeline} label="Typical delivery" />
            </div>

            <FeatureList
              features={s.features.map((label) => ({ label, active: true }))}
              className="mt-6 flex-1"
            />
          </div>

          <button
            type="button"
            onClick={() => onOpen(s.key)}
            className={cn(
              "flex h-14 w-full shrink-0 cursor-pointer items-center justify-between gap-3 border-t border-dashed px-6 text-left text-sm font-semibold transition-colors sm:px-7",
              focusRing,
              s.popular
                ? "border-white/25 bg-[#1c1410] text-white hover:bg-[#2c211a]"
                : "border-[#1c1410]/25 text-[#1c1410] hover:bg-[#1c1410]/[0.04]",
            )}
          >
            {s.cta}
            <span
              className={cn(
                "flex size-8 items-center justify-center rounded-full ring-1 transition-all duration-300",
                s.popular
                  ? "bg-white/10 ring-white/20 group-hover/card:bg-white group-hover/card:text-[#1c1410]"
                  : "bg-[#1c1410]/[0.06] ring-black/[0.06] group-hover/card:bg-[#1c1410] group-hover/card:text-white",
              )}
            >
              <ArrowUpRight className="size-3.5 transition-transform duration-300 group-hover/card:rotate-45" />
            </span>
          </button>
        </article>
      </motion.div>
    </li>
  );
}

function FaqItem({ q, a, defaultOpen }: { q: string; a: string; defaultOpen: boolean }) {
  const reduce = useReducedMotion() ?? false;
  const [open, setOpen] = useState(defaultOpen);
  return (
    <li className={cn("rounded-2xl border bg-white/60 transition-colors", open ? "border-[#1c1410]/30" : "border-black/[0.07]")}>
      <button
        type="button" aria-expanded={open} onClick={() => setOpen((o) => !o)}
        className={cn("flex w-full items-center justify-between gap-4 rounded-2xl px-5 py-4 text-left font-[family-name:var(--font-display)] text-base font-semibold text-[#1c1410]", focusRing)}
      >
        {q}
        <ChevronDown className={cn("size-5 shrink-0 text-stone-500 transition-transform duration-300", open && "rotate-180")} />
      </button>
      <AnimatePresence initial={false}>
        {open && (
          <motion.div
            initial={reduce ? false : { height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={reduce ? undefined : { height: 0, opacity: 0 }}
            transition={{ duration: 0.3, ease: EASE }}
            className="overflow-hidden"
          >
            <p className="px-5 pb-5 text-sm leading-relaxed text-stone-600">{a}</p>
          </motion.div>
        )}
      </AnimatePresence>
    </li>
  );
}

function Mark({ on }: { on: boolean }) {
  return on ? (
    <span className="inline-flex size-6 items-center justify-center rounded-full bg-[#1c1410] text-white">
      <Check className="size-3.5" strokeWidth={3} />
      <span className="sr-only">Included</span>
    </span>
  ) : (
    <span className="inline-flex size-6 items-center justify-center rounded-full border-[1.5px] border-dashed border-stone-300 text-stone-300">
      <Minus className="size-3" strokeWidth={3} />
      <span className="sr-only">Not included</span>
    </span>
  );
}

/* ------------------------------------------------------------------ */

export function CraftClient() {
  const reduce = useReducedMotion() ?? false;
  const lenis = useLenis();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [initialService, setInitialService] = useState<Service | null>(null);
  const [showBar, setShowBar] = useState(false);

  const { scrollY } = useScroll();
  useMotionValueEvent(scrollY, "change", (v) => setShowBar(v > 480));

  const openModal = (service: Service | null = null) => {
    setInitialService(service);
    setIsModalOpen(true);
  };

  const jump = (id: string) => {
    if (lenis) lenis.scrollTo(`#${id}`, { offset: -80 });
    else document.getElementById(id)?.scrollIntoView({ behavior: "smooth" });
  };

  return (
    <div className="relative isolate min-h-screen w-full overflow-x-clip pb-24 font-[family-name:var(--font-body)] text-[#1c1410] md:pb-0">
      <ShellBackground />

      {/* HERO */}
      <section className="mx-auto grid w-full max-w-7xl items-center gap-10 px-4 pb-16 pt-28 sm:px-6 sm:pb-24 sm:pt-32 lg:grid-cols-12 lg:gap-12 lg:px-12">
        <motion.div
          initial={reduce ? false : { opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, ease: EASE }}
          className="text-center lg:col-span-7 lg:text-left"
        >
          <p className="mb-4 text-xs font-semibold uppercase tracking-[0.3em] text-stone-600">The Crafted Collection</p>
          <h1 className="font-[family-name:var(--font-display)] text-4xl font-bold leading-[1.1] tracking-tight sm:text-5xl lg:text-6xl">
            Crafted. Just for you.
          </h1>
          <p className="mx-auto mt-5 max-w-xl text-base leading-relaxed text-stone-600 sm:text-lg lg:mx-0">
            Work directly with our design team. A fully bespoke website or a heavily customized template, built exactly how you envision it, on your own domain.
          </p>

          <div className="mt-8 flex flex-col items-stretch justify-center gap-3 sm:flex-row sm:items-center lg:justify-start">
            <button
              type="button" onClick={() => openModal(null)}
              className={cn("group inline-flex items-center justify-center gap-2 rounded-xl px-7 py-3.5 text-sm font-bold", darkBtn, focusRing)}
            >
              Start your project
              <ArrowRight className="size-4 transition-transform group-hover:translate-x-1" />
            </button>
            <button
              type="button" onClick={() => jump("crafts")}
              className={cn("inline-flex items-center justify-center rounded-xl px-7 py-3.5 text-sm font-bold", ghostBtn, focusRing)}
            >
              Explore the two crafts
            </button>
          </div>

          <ul className="mt-8 flex flex-wrap items-center justify-center gap-x-6 gap-y-2 text-sm font-medium text-stone-700 lg:justify-start">
            <li className="flex items-center gap-2"><Clock className="size-4 text-[#1c1410]" /> Delivered in 3–14 days</li>
            <li className="flex items-center gap-2"><Globe className="size-4 text-[#1c1410]" /> Domain setup handled</li>
            <li className="flex items-center gap-2"><RefreshCcw className="size-4 text-[#1c1410]" /> 2 rounds of revisions</li>
          </ul>
        </motion.div>

        <motion.div
          initial={reduce ? false : { opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, ease: EASE, delay: 0.15 }}
          className={cn("mx-auto w-full max-w-xl lg:col-span-5 lg:max-w-none", CARD_SHADOW)}
        >
          <div className={cn("overflow-hidden rounded-2xl border border-black/[0.07] p-3", CARD_BG)}>
            <div className="relative aspect-[4/3] w-full overflow-hidden rounded-xl">
              <Image
                src="/craft-hero-scene.png" alt="" aria-hidden fill priority quality={90}
                sizes="(min-width:1024px) 600px, 100vw" className="object-cover object-center"
              />
            </div>
            <div className="mt-3 flex flex-wrap gap-2">
              {[
                { icon: Link2, text: "Your own domain" },
                { icon: CalendarHeart, text: "RSVP built in" },
                { icon: Eye, text: "Live preview link" },
              ].map((c) => (
                <span key={c.text} className="inline-flex items-center gap-1.5 rounded-lg border border-[#1c1410]/10 bg-white/60 px-2.5 py-1.5 text-xs font-medium text-[#1c1410]">
                  <c.icon className="size-3.5" /> {c.text}
                </span>
              ))}
            </div>
          </div>
        </motion.div>
      </section>

      {/* THE TWO CRAFTS */}
      <section id="crafts" className="scroll-mt-20 px-4 pb-20 sm:px-6 sm:pb-28 lg:px-12">
        <div className="mx-auto max-w-7xl">
          <SectionHead
            eyebrow="Choose your craft"
            title="Two ways to stand out"
            sub="Every project is priced according to what you need. Pick the one that fits and tell us about your event."
          />
          <motion.ul
            variants={listVariants}
            initial={reduce ? "show" : "hidden"}
            whileInView="show"
            viewport={{ once: true, margin: "-50px" }}
            className="mx-auto grid max-w-5xl grid-cols-1 items-stretch gap-6 md:grid-cols-2 lg:gap-8"
          >
            {SERVICES.map((s) => <ServiceTicket key={s.key} s={s} onOpen={openModal} />)}
          </motion.ul>
        </div>
      </section>

      {/* COMPARE */}
      <section className="px-4 pb-20 sm:px-6 sm:pb-28 lg:px-12">
        <div className="mx-auto max-w-4xl">
          <SectionHead eyebrow="Compare" title="Side by side" />
          <div className={cn("overflow-x-auto rounded-2xl border border-black/[0.07]", CARD_BG)} data-lenis-prevent>
            <table className="w-full min-w-[560px] border-collapse text-left text-sm">
              <caption className="sr-only">Crafted Template and Crafted Website comparison</caption>
              <thead>
                <tr className="border-b border-dashed border-[#1c1410]/25">
                  <th scope="col" className="sticky left-0 z-10 bg-[#fff8f1] p-4 text-xs font-semibold uppercase tracking-[0.12em] text-stone-500">Compare</th>
                  <th scope="col" className="p-4 text-center font-[family-name:var(--font-display)] text-base font-bold">Crafted Template</th>
                  <th scope="col" className="p-4 text-center font-[family-name:var(--font-display)] text-base font-bold">Crafted Website</th>
                </tr>
              </thead>
              <tbody>
                {COMPARE.map((r) => (
                  <tr key={r.label} className="border-b border-black/[0.06] last:border-0 hover:bg-[#1c1410]/[0.025]">
                    <th scope="row" className="sticky left-0 z-10 bg-[#fff8f1] p-4 font-medium text-stone-600">{r.label}</th>
                    {[r.template, r.website].map((v, i) => (
                      <td key={i} className="p-4 text-center text-stone-700">
                        {typeof v === "boolean" ? <Mark on={v} /> : v}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </section>

      {/* PROCESS */}
      <section id="process" className="scroll-mt-20 px-4 pb-20 sm:px-6 sm:pb-28 lg:px-12">
        <div className="mx-auto max-w-7xl">
          <SectionHead eyebrow="The process" title="How we craft it" sub="A clear path from your idea to the final launch." />
          <motion.ol
            variants={listVariants}
            initial={reduce ? "show" : "hidden"}
            whileInView="show"
            viewport={{ once: true, margin: "-50px" }}
            className="mx-auto grid max-w-5xl grid-cols-1 gap-5 sm:grid-cols-2"
          >
            {PROCESS.map((p, i) => (
              <motion.li
                key={p.title}
                variants={itemVariants}
                className={cn("flex items-start gap-4 rounded-2xl border border-black/[0.07] p-6", CARD_BG)}
              >
                <span className="flex size-12 shrink-0 items-center justify-center rounded-xl bg-[#1c1410] text-white shadow-[inset_0_1px_0_rgba(255,255,255,0.14)]">
                  <p.icon className="size-5" />
                </span>
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.12em] text-stone-500">Step {i + 1}</p>
                  <h3 className="mt-0.5 font-[family-name:var(--font-display)] text-xl font-bold">{p.title}</h3>
                  <p className="mt-1.5 text-sm leading-relaxed text-stone-600">{p.desc}</p>
                </div>
              </motion.li>
            ))}
          </motion.ol>
        </div>
      </section>

      {/* FAQ */}
      <section aria-labelledby="craft-faq" className="mx-auto max-w-3xl px-4 pb-20 sm:px-6 sm:pb-28">
        <h2 id="craft-faq" className="mb-6 text-center font-[family-name:var(--font-display)] text-2xl font-bold sm:text-3xl">
          Questions?
        </h2>
        <ul className="space-y-3">
          {FAQS.map((f, i) => <FaqItem key={f.q} q={f.q} a={f.a} defaultOpen={i === 0} />)}
        </ul>
      </section>

      {/* FINAL CTA */}
      <section className="px-4 pb-20 sm:px-6 sm:pb-32 lg:px-12">
        <div className={cn("mx-auto max-w-4xl rounded-2xl border border-black/[0.07] p-8 text-center sm:p-12", CARD_BG, CARD_SHADOW)}>
          <h2 className="font-[family-name:var(--font-display)] text-3xl font-bold leading-[1.1] tracking-tight sm:text-4xl">
            Ready to stand out?
          </h2>
          <p className="mx-auto mt-4 max-w-md text-base text-stone-600">
            Let&apos;s build something your guests will remember.
          </p>
          <button
            type="button" onClick={() => openModal(null)}
            className={cn("group mt-8 inline-flex items-center justify-center gap-2 rounded-xl px-8 py-3.5 text-sm font-bold", darkBtn, focusRing)}
          >
            Start your project
            <ArrowRight className="size-4 transition-transform group-hover:translate-x-1" />
          </button>
          <p className="mt-4 text-sm text-stone-600">Share your idea and it goes straight to our team on WhatsApp.</p>
        </div>
      </section>

      {/* Mobile CTA bar */}
      <AnimatePresence>
        {showBar && !isModalOpen && (
          <motion.div
            initial={{ y: 90, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: 90, opacity: 0 }}
            transition={{ duration: 0.4, ease: EASE }}
            className="fixed inset-x-4 bottom-4 z-40 md:hidden"
          >
            <button
              type="button" onClick={() => openModal(null)}
              className={cn("flex w-full items-center justify-center gap-2 rounded-xl py-4 text-sm font-bold shadow-xl", darkBtn, focusRing)}
            >
              Start your project <ArrowRight className="size-4" />
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      <CraftModal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} initialService={initialService} />
    </div>
  );
}

export default CraftClient;