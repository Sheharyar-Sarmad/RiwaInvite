"use client";

import { useState, useEffect, useMemo, useRef } from "react";
import { motion, AnimatePresence, MotionConfig } from "framer-motion";
import {
  X, ArrowRight, ArrowLeft, MessageCircle, Globe, LayoutTemplate, Clock, Check, Wand2,
  User, Phone, CalendarDays, ChevronLeft, ChevronRight, Heart, Gem, Flower2, Cake,
  PartyPopper, Baby, Building2, Pencil, Sparkles, Flame, Coffee, Zap, Rocket, Link2,
  Crown, Feather, Landmark, MailCheck, Timer, CalendarClock, MapPin, Images, Music,
  MessageSquare, Layers, Lock, Star, Moon, type LucideIcon,
} from "lucide-react";

type Service = "website" | "template";

/* ---------------- tokens ---------------- */
const focusRing =
  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-500 focus-visible:ring-offset-2 focus-visible:ring-offset-[#ffe9d3]";
const primaryBtn = "bg-gradient-to-b from-[#fb8a3c] to-[#f97316] shadow-[0_10px_30px_-10px_rgba(249,115,22,0.8)]";
const inputCls = `w-full rounded-2xl border border-orange-900/15 bg-white/80 py-3.5 pl-12 pr-10 text-[15px] font-semibold text-slate-900 shadow-[inset_0_1px_2px_rgba(154,52,18,0.06)] outline-none backdrop-blur transition-all duration-300 placeholder:font-normal placeholder:text-slate-500 hover:border-orange-400/60 focus:-translate-y-0.5 focus:border-orange-500 focus:bg-white focus:shadow-[0_0_0_4px_rgba(249,115,22,0.16),0_14px_30px_-14px_rgba(249,115,22,0.55)] ${focusRing}`;
const labelCls = "mb-1.5 block text-[13px] font-extrabold text-slate-800";
const selectedTile = "border-orange-700 bg-gradient-to-b from-[#f97316] to-[#c2410c] text-white shadow-[0_14px_28px_-12px_rgba(249,115,22,0.9)]";
const idleTile = "border-orange-900/15 bg-white/70 text-slate-800 hover:border-orange-400 hover:bg-white";

const PAPER =
  "radial-gradient(80% 60% at 0% 0%, rgba(255,255,255,0.55), transparent 60%), radial-gradient(70% 60% at 100% 100%, rgba(249,115,22,0.28), transparent 60%), linear-gradient(160deg, #ffe9d3 0%, #ffcfa4 100%)";
const DARK =
  "radial-gradient(90% 70% at 100% 0%, rgba(249,115,22,0.28), transparent 60%), radial-gradient(70% 60% at 0% 100%, rgba(99,102,241,0.25), transparent 60%), linear-gradient(160deg, #1b2249 0%, #0a0e1f 100%)";
const SUN =
  "radial-gradient(70% 60% at 100% 0%, rgba(255,255,255,0.38), transparent 60%), radial-gradient(60% 60% at 0% 100%, rgba(190,60,0,0.38), transparent 60%), linear-gradient(135deg, #f97316 0%, #fb923c 60%, #fbbf24 100%)";

const SERVICE_INFO: Record<Service, { name: string; timeline: string; icon: LucideIcon; blurb: string; bg: string; tag: string }> = {
  website: { name: "Crafted Website", timeline: "7–14 days", icon: Globe, blurb: "Fully coded from scratch around your story.", bg: DARK, tag: "100% custom" },
  template: { name: "Crafted Template", timeline: "3–5 days", icon: LayoutTemplate, blurb: "Customize an existing premium design.", bg: SUN, tag: "Fastest" },
};

const EVENTS: { label: string; icon: LucideIcon }[] = [
  { label: "Wedding", icon: Heart }, { label: "Nikkah & Walima", icon: Moon }, { label: "Engagement", icon: Gem },
  { label: "Mehndi", icon: Flower2 }, { label: "Birthday", icon: Cake }, { label: "Anniversary", icon: Sparkles },
  { label: "Baby Shower", icon: Baby }, { label: "Corporate Gala", icon: Building2 },
];

const PALETTES = [
  { name: "Emerald & Gold", c: ["#065f46", "#10b981", "#fbbf24"] },
  { name: "Blush & Champagne", c: ["#fbcfe8", "#fde7d3", "#f5d78e"] },
  { name: "Midnight & Rose Gold", c: ["#0f172a", "#4338ca", "#f0a58f"] },
  { name: "Marigold Sunset", c: ["#f59e0b", "#f97316", "#e11d48"] },
  { name: "Ivory & Sage", c: ["#fef9ef", "#cbd5b8", "#7c9a7e"] },
  { name: "Ruby & Gold", c: ["#7f1d1d", "#dc2626", "#fcd34d"] },
  { name: "Ocean & Pearl", c: ["#0e7490", "#67e8f9", "#f1f5f9"] },
  { name: "Lavender Dream", c: ["#6d28d9", "#c4b5fd", "#fbcfe8"] },
];

const STYLES: { label: string; icon: LucideIcon }[] = [
  { label: "Classic", icon: Crown }, { label: "Modern", icon: Feather },
  { label: "Playful", icon: PartyPopper }, { label: "Traditional", icon: Landmark },
];

const FEATURES: { label: string; icon: LucideIcon }[] = [
  { label: "RSVP form", icon: MailCheck }, { label: "Countdown timer", icon: Timer },
  { label: "Event schedule", icon: CalendarClock }, { label: "Venue map", icon: MapPin },
  { label: "Photo gallery", icon: Images }, { label: "Background music", icon: Music },
  { label: "Guest wishes", icon: MessageSquare }, { label: "Multiple events", icon: Layers },
];
const POPULAR: Record<string, string[]> = {
  Wedding: ["RSVP form", "Countdown timer", "Event schedule", "Venue map", "Photo gallery"],
  "Nikkah & Walima": ["RSVP form", "Event schedule", "Venue map", "Multiple events"],
  Engagement: ["RSVP form", "Countdown timer", "Photo gallery", "Venue map"],
  Mehndi: ["RSVP form", "Event schedule", "Background music", "Venue map"],
  Birthday: ["RSVP form", "Countdown timer", "Photo gallery", "Guest wishes"],
  "Baby Shower": ["RSVP form", "Guest wishes", "Photo gallery"],
};
const popularFor = (e: string) => POPULAR[e] ?? ["RSVP form", "Event schedule", "Venue map"];

const TIMELINES: { value: string; label: string; sub: string; icon: LucideIcon }[] = [
  { value: "Standard timeline", label: "No rush", sub: "Standard timeline", icon: Coffee },
  { value: "Within 2 weeks", label: "Within 2 weeks", sub: "Comfortable pace", icon: Clock },
  { value: "Within 1 week", label: "Within 1 week", sub: "Priority lane", icon: Zap },
  { value: "ASAP", label: "ASAP", sub: "We confirm feasibility", icon: Rocket },
];

const BUDGETS: { label: string; icon: LucideIcon }[] = [
  { label: "Let's discuss", icon: MessageSquare }, { label: "Keep it lean", icon: Feather },
  { label: "Balanced", icon: Star }, { label: "Go all out", icon: Crown },
];

const STARTERS = ["We first met at…", "Our families love…", "Guests should feel…", "Must-have moment:"];
const TLDS = [".com", ".pk", ".love", ".wedding"];
const TITLES = ["Choose your craft", "What are we celebrating?", "Set the date", "Pick the feel", "Make it yours"];
const COLORS = ["#f97316", "#fbbf24", "#fb7185", "#6366f1"];

const EMPTY = {
  name: "", phone: "", eventType: "", eventDate: "", timeline: "Standard timeline", budget: "",
  palette: "", style: "", features: [] as string[], domain: "", references: "", requirements: "",
};

/* ---------------- date helpers ---------------- */
const pad = (n: number) => String(n).padStart(2, "0");
const toISO = (d: Date) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
const fromISO = (s: string) => { const [y, m, d] = s.split("-").map(Number); return new Date(y, m - 1, d); };
const startOfToday = () => { const n = new Date(); return new Date(n.getFullYear(), n.getMonth(), n.getDate()); };
const daysUntil = (s: string) => Math.round((fromISO(s).getTime() - startOfToday().getTime()) / 86400000);
const prettyDate = (s: string) => fromISO(s).toLocaleDateString("en-GB", { weekday: "long", day: "numeric", month: "long", year: "numeric" });
const daysLabel = (n: number) => (n === 0 ? "That's today!" : n === 1 ? "That's tomorrow!" : n <= 60 ? `${n} days to go` : `About ${Math.round(n / 30)} months to go`);

const slide = {
  enter: (d: number) => ({ opacity: 0, x: d * 28 }),
  center: { opacity: 1, x: 0 },
  exit: (d: number) => ({ opacity: 0, x: d * -28 }),
};

/* ---------------- main ---------------- */
export function CraftModal({
  isOpen, onClose, initialService,
}: { isOpen: boolean; onClose: () => void; initialService: Service | null }) {
  const [step, setStep] = useState(1);
  const [dir, setDir] = useState(1);
  const [service, setService] = useState<Service>(initialService ?? "website");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [data, setData] = useState(EMPTY);
  const [otherOpen, setOtherOpen] = useState(false);
  const [domainHelp, setDomainHelp] = useState(false);
  const bodyRef = useRef<HTMLDivElement>(null);
  const taRef = useRef<HTMLTextAreaElement>(null);

  const set = <K extends keyof typeof EMPTY>(k: K, v: (typeof EMPTY)[K]) => setData((d) => ({ ...d, [k]: v }));
  const go = (n: number) => { setDir(n > step ? 1 : -1); setStep(n); };

  useEffect(() => {
    if (isOpen) {
      setStep(initialService ? 2 : 1);
      setDir(1);
      setService(initialService ?? "website");
      setData(EMPTY);
      setOtherOpen(false);
      setDomainHelp(false);
      setIsSubmitting(false);
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => { document.body.style.overflow = ""; };
  }, [isOpen, initialService]);

  useEffect(() => {
    if (!isOpen) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [isOpen, onClose]);

  useEffect(() => { bodyRef.current?.scrollTo({ top: 0, behavior: "smooth" }); }, [step]);

  const info = SERVICE_INFO[service];
  const totalSteps = 5;
  const days = data.eventDate ? daysUntil(data.eventDate) : null;
  const toggleFeature = (f: string) =>
    set("features", data.features.includes(f) ? data.features.filter((x) => x !== f) : [...data.features, f]);

  const canContinue = step !== 2 || (data.name.trim().length > 1 && data.phone.replace(/\D/g, "").length >= 10 && data.eventType.trim().length > 0);

  const power = Math.round(
    ([data.name, data.phone, data.eventType, data.eventDate, data.palette, data.style,
      data.features.length ? "x" : "", data.domain || (domainHelp ? "x" : ""), data.requirements, data.budget]
      .filter(Boolean).length / 10) * 100,
  );

  const palette = PALETTES.find((p) => p.name === data.palette);
  const first = data.name.trim().split(/\s+/)[0] ?? "";

  const coach = (() => {
    switch (step) {
      case 1: return "Pick your path. Both end in something your guests will screenshot and share.";
      case 2: return data.eventType ? `${data.eventType}! Great choice. Now tell us who's hosting.` : "First up: what are we celebrating? Tap one.";
      case 3: return data.eventDate && days !== null && days >= 0 ? `Locked in. ${daysLabel(days)}.` : "Tap a date on the calendar, or skip it for now.";
      case 4: return palette ? `${palette.name}. Gorgeous. Now load up the power-ups.` : "The fun part: how should it feel? Pick a palette.";
      default: return "Last lap. Claim a domain, then tap a prompt to start your story.";
    }
  })();

  const suggestions = useMemo(() => {
    const parts = data.name.trim().toLowerCase().split(/\s+/).map((p) => p.replace(/[^a-z0-9]/g, "")).filter(Boolean);
    if (!parts.length) return [];
    const f = parts[0], l = parts.length > 1 ? parts[parts.length - 1] : "";
    const ev = data.eventType.toLowerCase().split(/[\s&]+/)[0].replace(/[^a-z0-9]/g, "");
    return Array.from(new Set([`${f}${l}.com`, `${f}s${ev || "day"}.com`, `celebrate${f}.com`]));
  }, [data.name, data.eventType]);

  const setTld = (tld: string) => {
    const base = data.domain.split(".")[0] || suggestions[0]?.split(".")[0] || "yourname";
    setDomainHelp(false);
    set("domain", base + tld);
  };

  const submit = () => {
    setIsSubmitting(true);
    setTimeout(() => {
      const whatsappNumber = "923001234567";
      const line = (k: string, v?: string) => `*${k}:* ${v && v.trim() ? v.trim() : "Not specified"}\n`;
      const message =
        `*🌟 NEW CRAFT REQUEST*\n\n` +
        line("Service", `${info.name} (typical delivery ${info.timeline})`) +
        `\n*— About the event —*\n` +
        line("Name", data.name) +
        line("Contact number", data.phone) +
        line("Event", data.eventType) +
        line("Event date", data.eventDate ? `${prettyDate(data.eventDate)} (${daysLabel(daysUntil(data.eventDate))})` : "") +
        `\n*— Project —*\n` +
        line("Preferred domain", data.domain || (domainHelp ? "Please suggest one for me" : "")) +
        line("Delivery needed", data.timeline) +
        line("Budget", data.budget) +
        line("Colour palette", data.palette) +
        line("Style", data.style) +
        line("Features wanted", data.features.join(", ")) +
        line("Reference links", data.references) +
        `\n*Vision & Requirements:*\n${data.requirements.trim() || "Not specified"}`;
      window.open(`https://wa.me/${whatsappNumber}?text=${encodeURIComponent(message)}`, "_blank");
      setIsSubmitting(false);
      onClose();
    }, 800);
  };

  const onFormSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (step === 5) submit();
    else if (canContinue) go(step + 1);
  };

  const addStarter = (s: string) => {
    set("requirements", (data.requirements ? data.requirements.trimEnd() + "\n" : "") + s + " ");
    setTimeout(() => taRef.current?.focus(), 0);
  };

  return (
    <MotionConfig reducedMotion="user">
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-[9999] flex items-end justify-center bg-black/60 px-0 pb-[max(0.75rem,env(safe-area-inset-bottom))] backdrop-blur-sm sm:items-center sm:p-6"
            onClick={onClose}
            role="dialog" aria-modal="true" aria-label="Start your project"
            /* Lenis ignores wheel and touch events inside anything with this attribute */
            data-lenis-prevent
          >
            <motion.div
              initial={{ opacity: 0, y: 60, scale: 0.97 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, y: 30, scale: 0.97 }}
              transition={{ type: "spring", damping: 26, stiffness: 220 }}
              onClick={(e) => e.stopPropagation()}
              style={{ backgroundImage: PAPER }}
              className="relative flex max-h-[calc(100dvh-1.5rem)] w-full max-w-2xl flex-col overflow-hidden rounded-[1.75rem] border border-orange-900/10 shadow-2xl sm:max-h-[92dvh] sm:rounded-[2rem]"
            >
              {/* Header */}
              <div className="shrink-0 border-b border-orange-900/10 p-4 pb-3 sm:p-6 sm:pb-4">
                <div className="flex items-center justify-between gap-4">
                  <div className="min-w-0">
                    <p className="text-xs font-bold text-orange-800">Step {step} of {totalSteps}</p>
                    <AnimatePresence mode="wait" initial={false}>
                      <motion.h2
                        key={step} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }} transition={{ duration: 0.18 }}
                        className="font-[family-name:var(--font-display)] text-lg font-extrabold text-slate-900 sm:text-2xl"
                      >
                        {TITLES[step - 1]}
                      </motion.h2>
                    </AnimatePresence>
                  </div>
                  <button onClick={onClose} aria-label="Close" className={`rounded-full bg-orange-500 p-2 text-white shadow-lg transition-transform hover:scale-105 hover:rotate-90 sm:p-2.5 ${focusRing}`}>
                    <X className="h-4 w-4 sm:h-5 sm:w-5" />
                  </button>
                </div>
                <div className="mt-3 flex gap-1.5 sm:mt-4">
                  {Array.from({ length: totalSteps }).map((_, i) => (
                    <div key={i} className="h-1.5 flex-1 overflow-hidden rounded-full bg-[#ffbd85]">
                      <motion.div className="h-full rounded-full bg-orange-700" initial={false} animate={{ width: i < step ? "100%" : "0%" }} transition={{ type: "spring", damping: 24, stiffness: 180 }} />
                    </div>
                  ))}
                </div>
                <div className="mt-2.5 flex items-center gap-2 text-xs font-bold text-slate-800">
                  <motion.span animate={power > 0 ? { scale: [1, 1.25, 1] } : {}} key={power} transition={{ duration: 0.35 }} className="text-orange-700"><Flame className="h-4 w-4" /></motion.span>
                  Vision clarity
                  <div className="h-2 flex-1 overflow-hidden rounded-full bg-white/60">
                    <motion.div className="h-full rounded-full bg-gradient-to-r from-[#fbbf24] via-[#f97316] to-[#c2410c]" initial={false} animate={{ width: `${Math.max(power, 4)}%` }} transition={{ type: "spring", damping: 20, stiffness: 120 }} />
                  </div>
                  <span className="w-9 text-right tabular-nums">{power}%</span>
                </div>
              </div>

              {/* Scrollable body */}
              <div
                ref={bodyRef} data-lenis-prevent
                onWheel={(e) => e.stopPropagation()} onTouchMove={(e) => e.stopPropagation()}
                className="min-h-0 flex-1 touch-pan-y overflow-y-auto overscroll-contain p-4 pb-6 sm:p-8"
              >
                <form
                  onSubmit={onFormSubmit}
                  onKeyDown={(e) => { if (e.key === "Enter" && step === 5 && (e.target as HTMLElement).tagName === "INPUT") e.preventDefault(); }}
                  className="space-y-4"
                >
                  <Coach text={coach} />

                  <AnimatePresence mode="wait" custom={dir} initial={false}>
                    {/* STEP 1 */}
                    {step === 1 && (
                      <motion.div key="s1" custom={dir} variants={slide} initial="enter" animate="center" exit="exit" className="space-y-3 sm:space-y-4">
                        {(Object.keys(SERVICE_INFO) as Service[]).map((k, idx) => {
                          const s = SERVICE_INFO[k];
                          const Icon = s.icon;
                          return (
                            <motion.button
                              key={k} type="button"
                              onClick={() => { setService(k); go(2); }}
                              whileHover={{ y: -4, scale: 1.01 }} whileTap={{ scale: 0.98 }}
                              style={{ backgroundImage: s.bg }}
                              className={`group relative w-full overflow-hidden rounded-2xl border border-white/20 p-4 text-left text-white shadow-xl sm:p-6 ${focusRing}`}
                            >
                              <span className="pointer-events-none absolute inset-y-0 -left-1/2 w-1/3 -skew-x-12 bg-white/25 opacity-0 blur-md transition-all duration-700 group-hover:left-[130%] group-hover:opacity-100" />
                              <span className="absolute right-4 top-4 rounded-full bg-white/20 px-2.5 py-1 text-[11px] font-bold backdrop-blur">{s.tag}</span>
                              <motion.div
                                animate={{ y: [0, -4, 0] }} transition={{ repeat: Infinity, duration: 3, delay: idx * 0.6, ease: "easeInOut" }}
                                className="mb-2.5 flex h-11 w-11 items-center justify-center rounded-xl bg-white text-orange-600 shadow-lg sm:mb-3 sm:h-12 sm:w-12"
                              >
                                <Icon className="h-5 w-5 sm:h-6 sm:w-6" />
                              </motion.div>
                              <h3 className="text-base font-extrabold sm:text-lg">{s.name}</h3>
                              <p className="mt-1 text-xs font-medium text-white sm:text-sm">{s.blurb}</p>
                              <div className="mt-3 flex flex-wrap items-center gap-2 text-[11px] font-bold sm:mt-4 sm:text-xs">
                                <span className="inline-flex items-center gap-1.5 rounded-full bg-[#c2410c] px-3 py-1.5 text-white"><Wand2 className="h-3.5 w-3.5" /> Priced to your needs</span>
                                <span className="inline-flex items-center gap-1.5 rounded-full bg-[#232b57] px-3 py-1.5 text-orange-200"><Clock className="h-3.5 w-3.5" /> {s.timeline}</span>
                                <ArrowRight className="ml-auto h-5 w-5 transition-transform group-hover:translate-x-1.5" />
                              </div>
                            </motion.button>
                          );
                        })}
                      </motion.div>
                    )}

                    {/* STEP 2 */}
                    {step === 2 && (
                      <motion.div key="s2" custom={dir} variants={slide} initial="enter" animate="center" exit="exit" className="space-y-4">
                        <SelectedBar info={info} canChange={!initialService} onChange={() => go(1)} />

                        <div className="grid grid-cols-3 gap-2 sm:grid-cols-4 sm:gap-2.5">
                          {EVENTS.map((ev, i) => (
                            <Tile key={ev.label} i={i} icon={ev.icon} label={ev.label} on={data.eventType === ev.label && !otherOpen}
                              onClick={() => { setOtherOpen(false); set("eventType", ev.label); }} />
                          ))}
                          <Tile i={EVENTS.length} icon={Pencil} label="Something else" on={otherOpen}
                            onClick={() => { setOtherOpen(true); if (EVENTS.some((e) => e.label === data.eventType)) set("eventType", ""); }} />
                        </div>

                        <AnimatePresence initial={false}>
                          {otherOpen && (
                            <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="overflow-hidden px-1 pb-2 pt-1">
                              <Field icon={Pencil} label="Tell us what it is" valid={data.eventType.trim().length > 1}>
                                <input autoFocus type="text" value={data.eventType} onChange={(e) => set("eventType", e.target.value)} placeholder="e.g. Graduation party, Eid dinner…" className={inputCls} />
                              </Field>
                            </motion.div>
                          )}
                        </AnimatePresence>

                        <div className="grid grid-cols-1 gap-3.5 sm:grid-cols-2 sm:gap-4">
                          <Field icon={User} label="Your name" valid={data.name.trim().length > 1}>
                            <input type="text" autoComplete="name" value={data.name} onChange={(e) => set("name", e.target.value)} placeholder="e.g. Sarah Ahmed" className={inputCls} />
                          </Field>
                          <Field icon={Phone} label="WhatsApp number" valid={data.phone.replace(/\D/g, "").length >= 10}>
                            <input type="tel" inputMode="tel" autoComplete="tel" value={data.phone} onChange={(e) => set("phone", e.target.value)} placeholder="e.g. 0300 1234567" className={inputCls} />
                          </Field>
                        </div>

                        <NavRow onBack={initialService ? undefined : () => go(1)} nextLabel="Continue" disabled={!canContinue} />
                        {!canContinue && <p className="-mt-2 text-center text-xs font-semibold text-slate-700">Pick an event and add your name and number to continue.</p>}
                      </motion.div>
                    )}

                    {/* STEP 3 */}
                    {step === 3 && (
                      <motion.div key="s3" custom={dir} variants={slide} initial="enter" animate="center" exit="exit" className="space-y-5">
                        <Calendar value={data.eventDate} onChange={(v) => set("eventDate", v)} />

                        <div>
                          <span className={labelCls}>How fast do you need it?</span>
                          <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                            {TIMELINES.map((t, i) => (
                              <Tile key={t.value} row i={i} icon={t.icon} label={t.label} sub={t.sub} on={data.timeline === t.value} onClick={() => set("timeline", t.value)} />
                            ))}
                          </div>
                          <p className="mt-2 text-xs font-semibold text-slate-800">
                            {days !== null && days >= 0 && days <= 21
                              ? `Your date is only ${days} days away, so a faster lane will keep you safe.`
                              : `Typical for ${info.name}: ${info.timeline}.`}
                          </p>
                        </div>

                        <NavRow onBack={() => go(2)} nextLabel={data.eventDate ? "Lock it in" : "Skip for now"} />
                      </motion.div>
                    )}

                    {/* STEP 4 */}
                    {step === 4 && (
                      <motion.div key="s4" custom={dir} variants={slide} initial="enter" animate="center" exit="exit" className="space-y-5">
                        <div>
                          <span className={labelCls}>Pick a palette</span>
                          <div className="grid grid-cols-2 gap-2 sm:grid-cols-4 sm:gap-2.5">
                            {PALETTES.map((p, i) => {
                              const on = data.palette === p.name;
                              return (
                                <motion.button
                                  key={p.name} type="button" aria-pressed={on} onClick={() => set("palette", on ? "" : p.name)}
                                  initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.04, type: "spring", damping: 20, stiffness: 260 }}
                                  whileHover={{ y: -3 }} whileTap={{ scale: 0.95 }}
                                  className={`relative rounded-2xl border p-2 text-left transition-all ${focusRing} ${on ? "border-orange-700 bg-white shadow-[0_14px_28px_-12px_rgba(249,115,22,0.9)] ring-2 ring-orange-500" : idleTile}`}
                                >
                                  <span className="block h-12 rounded-xl" style={{ backgroundImage: `linear-gradient(120deg, ${p.c[0]} 0%, ${p.c[1]} 55%, ${p.c[2]} 100%)` }} />
                                  <span className="mt-1.5 block text-xs font-bold leading-tight text-slate-900">{p.name}</span>
                                  {on && <><CheckBadge /><Pop /></>}
                                </motion.button>
                              );
                            })}
                          </div>
                        </div>

                        <div>
                          <span className={labelCls}>Pick a style</span>
                          <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
                            {STYLES.map((s, i) => (
                              <Tile key={s.label} row i={i} icon={s.icon} label={s.label} on={data.style === s.label} onClick={() => set("style", data.style === s.label ? "" : s.label)} />
                            ))}
                          </div>
                        </div>

                        <div>
                          <div className="mb-1.5 flex items-center justify-between gap-2">
                            <span className="text-[13px] font-extrabold text-slate-800">Power-ups <span className="ml-1 rounded-full bg-[#232b57] px-2 py-0.5 text-[11px] text-orange-200">{data.features.length} on</span></span>
                            <Pill on={false} onClick={() => set("features", Array.from(new Set([...data.features, ...popularFor(data.eventType)])))}>
                              <Star className="h-3.5 w-3.5" /> Add the popular ones
                            </Pill>
                          </div>
                          <div className="grid grid-cols-2 gap-2 sm:grid-cols-4 sm:gap-2.5">
                            {FEATURES.map((f, i) => (
                              <Tile key={f.label} i={i} icon={f.icon} label={f.label} on={data.features.includes(f.label)}
                                badge={popularFor(data.eventType).includes(f.label) ? "Popular" : undefined} onClick={() => toggleFeature(f.label)} />
                            ))}
                          </div>
                        </div>

                        <NavRow onBack={() => go(3)} nextLabel="Almost there" />
                      </motion.div>
                    )}

                    {/* STEP 5 */}
                    {step === 5 && (
                      <motion.div key="s5" custom={dir} variants={slide} initial="enter" animate="center" exit="exit" className="space-y-5">
                        {/* live site preview */}
                        <div className="overflow-hidden rounded-2xl border border-orange-900/15 bg-white/70 shadow-sm">
                          <div className="flex items-center gap-2 bg-[#232b57] px-3 py-2">
                            <span className="flex gap-1">{["#fb7185", "#fbbf24", "#34d399"].map((c) => <i key={c} className="h-2 w-2 rounded-full" style={{ background: c }} />)}</span>
                            <div className="flex min-w-0 flex-1 items-center gap-1.5 rounded-full bg-white/10 px-3 py-1 text-[11px] font-semibold text-white">
                              <Lock className="h-3 w-3 shrink-0 text-emerald-300" />
                              <span className="truncate">{data.domain || "yourname.com"}</span>
                              <motion.i animate={{ opacity: [1, 0, 1] }} transition={{ repeat: Infinity, duration: 1 }} className="h-3 w-px shrink-0 bg-orange-300" />
                            </div>
                          </div>
                          <div
                            className="relative grid h-24 place-items-center text-center text-white"
                            style={{ backgroundImage: palette ? `linear-gradient(120deg, ${palette.c[0]}, ${palette.c[1]}, ${palette.c[2]})` : SUN }}
                          >
                            <span className="absolute inset-0 bg-black/30" />
                            <div className="relative px-4">
                              <p className="font-[family-name:var(--font-display)] text-lg font-extrabold sm:text-xl">{first ? `${first}'s ${data.eventType || "celebration"}` : "Your celebration"}</p>
                              <p className="text-xs font-semibold">{data.eventDate ? prettyDate(data.eventDate) : "Date to be announced"}</p>
                            </div>
                          </div>
                        </div>

                        <div>
                          <Field icon={Globe} label="Pick your web address" valid={data.domain.includes(".")}>
                            <input type="text" value={data.domain} onChange={(e) => { setDomainHelp(false); set("domain", e.target.value.toLowerCase().replace(/[^a-z0-9.-]/g, "")); }} placeholder="e.g. sarahandali.com" className={inputCls} />
                          </Field>
                          <div className="mt-2 flex flex-wrap gap-1.5">
                            {TLDS.map((t) => <Pill key={t} on={data.domain.endsWith(t)} onClick={() => setTld(t)}>{t}</Pill>)}
                            {suggestions.map((s) => <Pill key={s} on={data.domain === s} onClick={() => { setDomainHelp(false); set("domain", s); }}><Sparkles className="h-3.5 w-3.5" /> {s}</Pill>)}
                            <Pill on={domainHelp} onClick={() => { setDomainHelp(!domainHelp); set("domain", ""); }}><Wand2 className="h-3.5 w-3.5" /> Suggest one for me</Pill>
                          </div>
                          <p className="mt-1.5 text-xs font-medium text-slate-800">We handle the purchase and DNS setup, and confirm the name is available.</p>
                        </div>

                        <div>
                          <span className={labelCls}>Budget (optional)</span>
                          <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
                            {BUDGETS.map((b, i) => (
                              <Tile key={b.label} row i={i} icon={b.icon} label={b.label} on={data.budget === b.label} onClick={() => set("budget", data.budget === b.label ? "" : b.label)} />
                            ))}
                          </div>
                        </div>

                        <div>
                          <Field tall icon={Sparkles} label="Your story (optional)" valid={data.requirements.trim().length > 10}>
                            <textarea ref={taRef} rows={3} value={data.requirements} onChange={(e) => set("requirements", e.target.value)} placeholder="Tap a prompt below to get started…" className={`${inputCls} resize-none pt-3.5`} />
                          </Field>
                          <div className="mt-2 flex flex-wrap gap-1.5">
                            {STARTERS.map((s) => <Pill key={s} on={false} onClick={() => addStarter(s)}>{s}</Pill>)}
                          </div>
                        </div>

                        <Field icon={Link2} label="Inspiration link (optional)" valid={data.references.trim().length > 6}>
                          <input type="text" value={data.references} onChange={(e) => set("references", e.target.value)} placeholder="A Pinterest board or site you love" className={inputCls} />
                        </Field>

                        <NavRow onBack={() => go(4)} nextLabel="Send Request" final loading={isSubmitting} />
                      </motion.div>
                    )}
                  </AnimatePresence>
                </form>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </MotionConfig>
  );
}

/* ---------------- building blocks ---------------- */
function Pop() {
  return (
    <span className="pointer-events-none absolute inset-0" aria-hidden>
      {Array.from({ length: 10 }).map((_, i) => {
        const a = (i / 10) * Math.PI * 2;
        return (
          <motion.span
            key={i} className="absolute left-1/2 top-1/2 h-1.5 w-1.5 rounded-full" style={{ background: COLORS[i % COLORS.length] }}
            initial={{ x: 0, y: 0, opacity: 1, scale: 1 }} animate={{ x: Math.cos(a) * 42, y: Math.sin(a) * 34, opacity: 0, scale: 0.3 }}
            transition={{ duration: 0.65, ease: "easeOut" }}
          />
        );
      })}
    </span>
  );
}

function CheckBadge() {
  return (
    <motion.span initial={{ scale: 0, rotate: -90 }} animate={{ scale: 1, rotate: 0 }} transition={{ type: "spring", stiffness: 400, damping: 15 }}
      className="absolute right-1.5 top-1.5 grid h-5 w-5 place-items-center rounded-full bg-orange-700 text-white shadow">
      <Check className="h-3 w-3" />
    </motion.span>
  );
}

function Tile({ on, onClick, icon: Ic, label, sub, badge, row, i = 0 }: {
  on: boolean; onClick: () => void; icon: LucideIcon; label: string; sub?: string; badge?: string; row?: boolean; i?: number;
}) {
  return (
    <motion.button
      type="button" onClick={onClick} aria-pressed={on}
      initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.035, type: "spring", damping: 20, stiffness: 260 }}
      whileHover={{ y: -3 }} whileTap={{ scale: 0.95 }}
      className={`relative flex rounded-2xl border p-2.5 transition-colors sm:p-3 ${row ? "items-center gap-2.5 text-left" : "flex-col items-center gap-2 text-center"} ${on ? selectedTile : idleTile} ${focusRing}`}
    >
      <span className={`grid h-9 w-9 shrink-0 place-items-center rounded-xl transition-colors ${on ? "bg-white/25 text-white" : "bg-orange-500/10 text-orange-700"}`}>
        <Ic className="h-[18px] w-[18px]" />
      </span>
      <span className="min-w-0">
        <span className="block text-xs font-bold leading-tight sm:text-[13px]">{label}</span>
        {sub && <span className={`mt-0.5 block text-[11px] font-medium ${on ? "text-white" : "text-slate-700"}`}>{sub}</span>}
      </span>
      {badge && !on && (
        <span className="absolute -top-2 right-2 inline-flex items-center gap-1 rounded-full bg-[#232b57] px-2 py-0.5 text-[10px] font-bold text-orange-200">
          <Star className="h-2.5 w-2.5" /> {badge}
        </span>
      )}
      {on && <><CheckBadge /><Pop /></>}
    </motion.button>
  );
}

function Pill({ on, onClick, children }: { on: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <motion.button
      type="button" onClick={onClick} aria-pressed={on} whileTap={{ scale: 0.93 }} whileHover={{ y: -2 }}
      className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-[11px] font-bold transition-colors sm:text-xs ${focusRing} ${
        on ? "border-orange-800 bg-[#c2410c] text-white" : "border-orange-900/15 bg-white/70 text-orange-900 hover:border-orange-400 hover:bg-white"
      }`}
    >
      {children}
    </motion.button>
  );
}

function Field({ icon: Ic, label, valid, tall, children }: {
  icon: LucideIcon; label: string; valid?: boolean; tall?: boolean; children: React.ReactNode;
}) {
  return (
    <label className="block">
      <span className={labelCls}>{label}</span>
      <span className="group relative block">
        <span className={`pointer-events-none absolute left-2 z-10 grid h-8 w-8 place-items-center rounded-xl bg-orange-500/10 text-orange-700 transition-all duration-300 group-focus-within:scale-110 group-focus-within:bg-orange-600 group-focus-within:text-white ${tall ? "top-2.5" : "top-1/2 -translate-y-1/2"}`}>
          <Ic className="h-4 w-4" />
        </span>
        {children}
        <AnimatePresence>
          {valid && (
            <motion.span
              initial={{ scale: 0, rotate: -90 }} animate={{ scale: 1, rotate: 0 }} exit={{ scale: 0 }}
              className={`pointer-events-none absolute right-3 grid h-5 w-5 place-items-center rounded-full bg-emerald-700 text-white ${tall ? "top-3.5" : "top-1/2 -translate-y-1/2"}`}
            >
              <Check className="h-3 w-3" />
            </motion.span>
          )}
        </AnimatePresence>
      </span>
    </label>
  );
}

function Coach({ text }: { text: string }) {
  return (
    <div className="flex items-center gap-2.5 rounded-2xl bg-[#232b57] px-3.5 py-3 text-white shadow-lg">
      <motion.span
        animate={{ rotate: [0, 14, -8, 0] }} transition={{ duration: 1.4, repeat: Infinity, repeatDelay: 2.5 }}
        className="grid h-8 w-8 shrink-0 place-items-center rounded-xl bg-orange-500"
      >
        <Wand2 className="h-4 w-4" />
      </motion.span>
      <AnimatePresence mode="wait" initial={false}>
        <motion.p key={text} initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -6 }} transition={{ duration: 0.18 }} className="text-[13px] font-semibold leading-snug">
          {text}
        </motion.p>
      </AnimatePresence>
    </div>
  );
}

function SelectedBar({ info, canChange, onChange }: { info: (typeof SERVICE_INFO)[Service]; canChange: boolean; onChange: () => void }) {
  const Ic = info.icon;
  return (
    <div className="flex items-center justify-between gap-3 rounded-xl border border-orange-900/15 bg-white/70 p-2.5 text-sm text-slate-900">
      <span className="flex flex-wrap items-center gap-x-3 gap-y-1">
        <span className="grid h-7 w-7 place-items-center rounded-lg bg-orange-600 text-white"><Ic className="h-4 w-4" /></span>
        <b>{info.name}</b>
        <span className="flex items-center gap-1 text-xs font-semibold text-slate-700"><Clock className="h-3.5 w-3.5" /> {info.timeline}</span>
      </span>
      {canChange && <button type="button" onClick={onChange} className={`shrink-0 rounded text-xs font-bold text-orange-800 underline hover:text-orange-950 ${focusRing}`}>Change</button>}
    </div>
  );
}

function NavRow({ onBack, nextLabel, disabled, final, loading }: { onBack?: () => void; nextLabel: string; disabled?: boolean; final?: boolean; loading?: boolean }) {
  return (
    <div className="flex gap-2.5 pt-1 sm:gap-3 sm:pt-2">
      {onBack && (
        <button type="button" onClick={onBack} className={`inline-flex items-center justify-center gap-2 rounded-xl border border-orange-900/15 bg-white/70 px-4 py-3.5 text-sm font-bold text-slate-800 hover:bg-white sm:px-5 sm:py-4 ${focusRing}`}>
          <ArrowLeft className="h-4 w-4" /> Back
        </button>
      )}
      <button
        type="submit" disabled={disabled || loading}
        className={`flex flex-1 items-center justify-center gap-2 rounded-xl py-3.5 font-bold text-white transition-all hover:scale-[1.01] active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-60 disabled:hover:scale-100 sm:py-4 ${primaryBtn} ${focusRing}`}
      >
        {loading ? (
          <span className="flex items-center gap-2"><span className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" /> Connecting to WhatsApp...</span>
        ) : (
          <>{final && <MessageCircle className="h-5 w-5" />} {nextLabel} <ArrowRight className="h-5 w-5" /></>
        )}
      </button>
    </div>
  );
}

/* ---------------- calendar ---------------- */
function Calendar({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  const today = startOfToday();
  const seed = value ? fromISO(value) : today;
  const [view, setView] = useState(new Date(seed.getFullYear(), seed.getMonth(), 1));
  const [dir, setDir] = useState(1);

  const go = (n: number) => { setDir(n); setView((v) => new Date(v.getFullYear(), v.getMonth() + n, 1)); };
  const canPrev = view > new Date(today.getFullYear(), today.getMonth(), 1);
  const lead = view.getDay();
  const count = new Date(view.getFullYear(), view.getMonth() + 1, 0).getDate();
  const cells: (number | null)[] = [...Array(lead).fill(null), ...Array.from({ length: count }, (_, i) => i + 1)];

  const jump = (m: number) => {
    const d = new Date(today.getFullYear(), today.getMonth() + m, today.getDate());
    setDir(d > view ? 1 : -1);
    setView(new Date(d.getFullYear(), d.getMonth(), 1));
    onChange(toISO(d));
  };

  const days = value ? daysUntil(value) : null;
  const navBtn = `grid h-9 w-9 place-items-center rounded-full bg-white text-orange-800 shadow transition-all hover:scale-110 disabled:opacity-30 disabled:hover:scale-100 ${focusRing}`;

  return (
    <div className="rounded-3xl border border-orange-900/15 bg-white/60 p-3 shadow-[0_18px_40px_-24px_rgba(154,52,18,0.5)] backdrop-blur sm:p-4">
      <div className="mb-2 flex items-center justify-between gap-2">
        <span className="flex items-center gap-2 text-[15px] font-extrabold text-slate-900">
          <span className="grid h-8 w-8 place-items-center rounded-xl bg-orange-600 text-white"><CalendarDays className="h-4 w-4" /></span>
          {view.toLocaleDateString("en-GB", { month: "long", year: "numeric" })}
        </span>
        <span className="flex gap-2">
          <button type="button" aria-label="Previous month" disabled={!canPrev} onClick={() => go(-1)} className={navBtn}><ChevronLeft className="h-4 w-4" /></button>
          <button type="button" aria-label="Next month" onClick={() => go(1)} className={navBtn}><ChevronRight className="h-4 w-4" /></button>
        </span>
      </div>

      <div className="grid grid-cols-7 text-center text-xs font-bold text-orange-800">
        {["S", "M", "T", "W", "T", "F", "S"].map((d, i) => <span key={i} className="py-1">{d}</span>)}
      </div>

      <AnimatePresence mode="wait" initial={false}>
        <motion.div
          key={toISO(view)} initial={{ opacity: 0, x: dir * 24 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: dir * -24 }} transition={{ duration: 0.16 }}
          className="grid grid-cols-7 gap-1"
        >
          {cells.map((day, i) => {
            if (!day) return <span key={i} />;
            const date = new Date(view.getFullYear(), view.getMonth(), day);
            const iso = toISO(date);
            const past = date < today;
            const sel = iso === value;
            const isToday = iso === toISO(today);
            return (
              <button
                key={i} type="button" disabled={past} aria-pressed={sel} aria-label={prettyDate(iso)} onClick={() => onChange(iso)}
                className={`relative aspect-square rounded-xl text-sm font-bold transition-colors ${focusRing} ${
                  sel ? "text-white" : past ? "cursor-not-allowed text-slate-400" : "text-slate-900 hover:bg-orange-500/15"
                } ${isToday && !sel ? "ring-2 ring-orange-500/70" : ""}`}
              >
                {sel && (
                  <motion.span layoutId="day-pill" transition={{ type: "spring", damping: 22, stiffness: 320 }}
                    className="absolute inset-0 rounded-xl bg-gradient-to-b from-[#f97316] to-[#c2410c] shadow-[0_8px_18px_-8px_rgba(194,65,12,0.9)]" />
                )}
                <span className="relative">{day}</span>
                {sel && <Pop />}
              </button>
            );
          })}
        </motion.div>
      </AnimatePresence>

      <div className="mt-3 flex flex-wrap items-center gap-1.5">
        <Pill on={false} onClick={() => jump(1)}>In 1 month</Pill>
        <Pill on={false} onClick={() => jump(3)}>In 3 months</Pill>
        <Pill on={false} onClick={() => jump(6)}>In 6 months</Pill>
        <Pill on={!value} onClick={() => onChange("")}>Not decided yet</Pill>
      </div>

      <AnimatePresence mode="wait" initial={false}>
        <motion.p key={value || "none"} initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="mt-2.5 text-[13px] font-bold text-slate-900">
          {value && days !== null ? `${prettyDate(value)}. ${daysLabel(days)}.` : "No date yet. That's fine, we can plan around it."}
        </motion.p>
      </AnimatePresence>
    </div>
  );
}