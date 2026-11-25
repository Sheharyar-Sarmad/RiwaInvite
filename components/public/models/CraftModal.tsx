"use client";

import { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence, MotionConfig } from "framer-motion";
import {
  X, ArrowRight, ArrowLeft, MessageCircle, Globe, LayoutTemplate, Clock, Check,
  User, Phone, CalendarDays, ChevronLeft, ChevronRight, Heart, Gem, Flower2, Cake,
  PartyPopper, Baby, Building2, Pencil, Coffee, Zap, Rocket, Link2, Crown, Feather,
  Landmark, MailCheck, Timer, CalendarClock, MapPin, Images, Music, MessageSquare,
  Layers, Lock, Star, Moon, type LucideIcon,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { CARD_BG, EASE, focusRing } from "@/components/public/sections/plans/PlanUI";

type Service = "website" | "template";

/* ---------------- tokens ---------------- */
const inputCls =
  "h-11 w-full rounded-xl border border-black/[0.1] bg-white/80 pl-11 pr-10 text-sm text-[#1c1410] outline-none transition placeholder:text-stone-400 hover:border-[#1c1410]/30 focus:border-[#1c1410] focus-visible:ring-2 focus-visible:ring-[#1c1410]/20";
const labelCls = "mb-1.5 block text-xs font-semibold uppercase tracking-[0.12em] text-stone-500";
const selectedTile = "border-[#1c1410] bg-[#1c1410] text-white";
const idleTile = "border-black/[0.08] bg-white/70 text-[#1c1410] hover:border-[#1c1410]/30 hover:bg-white";
const darkBtn = "bg-[#1c1410] text-white transition-colors hover:bg-[#2c211a]";

const SERVICE_INFO: Record<Service, { name: string; timeline: string; icon: LucideIcon; blurb: string; tag: string }> = {
  website: { name: "Crafted Website", timeline: "7–14 days", icon: Globe, blurb: "Fully coded from scratch around your story.", tag: "100% custom" },
  template: { name: "Crafted Template", timeline: "3–5 days", icon: LayoutTemplate, blurb: "Customize an existing premium design.", tag: "Fastest" },
};

const EVENTS: { label: string; icon: LucideIcon }[] = [
  { label: "Wedding", icon: Heart }, { label: "Nikkah & Walima", icon: Moon }, { label: "Engagement", icon: Gem },
  { label: "Mehndi", icon: Flower2 }, { label: "Birthday", icon: Cake }, { label: "Anniversary", icon: Star },
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

const TLDS = [".com", ".pk", ".love", ".wedding"];
const TITLES = ["Choose your craft", "Your event", "Set the date", "Pick the feel", "Final details"];

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
const daysLabel = (n: number) => (n === 0 ? "That's today" : n === 1 ? "That's tomorrow" : n <= 60 ? `${n} days to go` : `About ${Math.round(n / 30)} months to go`);

const slide = {
  enter: (d: number) => ({ opacity: 0, x: d * 24 }),
  center: { opacity: 1, x: 0 },
  exit: (d: number) => ({ opacity: 0, x: d * -24 }),
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

  const canContinue =
    step !== 2 || (data.name.trim().length > 1 && data.phone.replace(/\D/g, "").length >= 10 && data.eventType.trim().length > 0);

  const palette = PALETTES.find((p) => p.name === data.palette);
  const first = data.name.trim().split(/\s+/)[0] ?? "";

  const setTld = (tld: string) => {
    const base = data.domain.split(".")[0] || "yourname";
    setDomainHelp(false);
    set("domain", base + tld);
  };

  const submit = () => {
    setIsSubmitting(true);
    setTimeout(() => {
      const whatsappNumber = "923001234567";
      const line = (k: string, v?: string) => `*${k}:* ${v && v.trim() ? v.trim() : "Not specified"}\n`;
      const message =
        `*NEW CRAFT REQUEST*\n\n` +
        line("Service", `${info.name} (typical delivery ${info.timeline})`) +
        `\n*About the event*\n` +
        line("Name", data.name) +
        line("Contact number", data.phone) +
        line("Event", data.eventType) +
        line("Event date", data.eventDate ? `${prettyDate(data.eventDate)} (${daysLabel(daysUntil(data.eventDate))})` : "") +
        `\n*Project*\n` +
        line("Preferred domain", data.domain || (domainHelp ? "Team to choose" : "")) +
        line("Delivery needed", data.timeline) +
        line("Budget", data.budget) +
        line("Colour palette", data.palette) +
        line("Style", data.style) +
        line("Features wanted", data.features.join(", ")) +
        line("Reference links", data.references) +
        `\n*Requirements:*\n${data.requirements.trim() || "Not specified"}`;
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

  return (
    <MotionConfig reducedMotion="user">
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-[9999] flex items-end justify-center bg-black/55 px-0 pb-[max(0.75rem,env(safe-area-inset-bottom))] sm:items-center sm:p-6"
            onClick={onClose}
            role="dialog" aria-modal="true" aria-label="Start your project"
            data-lenis-prevent
          >
            <motion.div
              initial={{ opacity: 0, y: 40 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 20 }}
              transition={{ type: "spring", damping: 30, stiffness: 260 }}
              onClick={(e) => e.stopPropagation()}
              className={cn(
                "relative flex max-h-[calc(100dvh-1.5rem)] w-full max-w-2xl flex-col overflow-hidden rounded-2xl border border-black/[0.07] text-[#1c1410] shadow-xl sm:max-h-[92dvh]",
                CARD_BG,
              )}
            >
              {/* Header */}
              <div className="shrink-0 border-b border-dashed border-[#1c1410]/25 p-4 pb-4 sm:p-6">
                <div className="flex items-center justify-between gap-4">
                  <div className="min-w-0">
                    <p className="text-xs font-semibold uppercase tracking-[0.12em] text-stone-500">Step {step} of {totalSteps}</p>
                    <AnimatePresence mode="wait" initial={false}>
                      <motion.h2
                        key={step} initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -6 }} transition={{ duration: 0.18 }}
                        className="mt-1 font-[family-name:var(--font-display)] text-xl font-bold sm:text-2xl"
                      >
                        {TITLES[step - 1]}
                      </motion.h2>
                    </AnimatePresence>
                  </div>
                  <button
                    onClick={onClose} aria-label="Close"
                    className={cn("flex size-9 shrink-0 items-center justify-center rounded-full bg-[#1c1410]/[0.06] ring-1 ring-black/[0.06] transition-colors hover:bg-[#1c1410] hover:text-white", focusRing)}
                  >
                    <X className="size-4" />
                  </button>
                </div>
                <div className="mt-4 flex gap-1.5" aria-hidden>
                  {Array.from({ length: totalSteps }).map((_, i) => (
                    <div key={i} className="h-1 flex-1 overflow-hidden rounded-full bg-[#1c1410]/10">
                      <motion.div className="h-full rounded-full bg-[#1c1410]" initial={false} animate={{ width: i < step ? "100%" : "0%" }} transition={{ duration: 0.4, ease: EASE }} />
                    </div>
                  ))}
                </div>
              </div>

              {/* Body */}
              <div
                ref={bodyRef} data-lenis-prevent
                onWheel={(e) => e.stopPropagation()} onTouchMove={(e) => e.stopPropagation()}
                className="min-h-0 flex-1 touch-pan-y overflow-y-auto overscroll-contain p-4 pb-6 sm:p-8"
              >
                <form
                  onSubmit={onFormSubmit}
                  onKeyDown={(e) => { if (e.key === "Enter" && step === 5 && (e.target as HTMLElement).tagName === "INPUT") e.preventDefault(); }}
                >
                  <AnimatePresence mode="wait" custom={dir} initial={false}>
                    {/* STEP 1 */}
                    {step === 1 && (
                      <motion.div key="s1" custom={dir} variants={slide} initial="enter" animate="center" exit="exit" className="space-y-3">
                        {(Object.keys(SERVICE_INFO) as Service[]).map((k) => {
                          const s = SERVICE_INFO[k];
                          const Icon = s.icon;
                          return (
                            <button
                              key={k} type="button"
                              onClick={() => { setService(k); go(2); }}
                              className={cn("group flex w-full items-center gap-4 rounded-2xl border border-black/[0.08] bg-white/70 p-4 text-left transition-colors hover:border-[#1c1410]/40 hover:bg-white sm:p-5", focusRing)}
                            >
                              <span className="flex size-12 shrink-0 items-center justify-center rounded-xl bg-[#1c1410] text-white shadow-[inset_0_1px_0_rgba(255,255,255,0.14)]">
                                <Icon className="size-5" />
                              </span>
                              <span className="min-w-0 flex-1">
                                <span className="flex flex-wrap items-center gap-2">
                                  <span className="font-[family-name:var(--font-display)] text-lg font-bold">{s.name}</span>
                                  <span className="rounded border border-[#1c1410]/20 px-1.5 text-[10px] font-semibold uppercase leading-4 tracking-[0.1em] text-[#1c1410]/80">{s.tag}</span>
                                </span>
                                <span className="mt-1 block text-sm text-stone-600">{s.blurb}</span>
                                <span className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs font-medium text-stone-600">
                                  <span>Priced to your needs</span>
                                  <span className="inline-flex items-center gap-1"><Clock className="size-3.5" /> {s.timeline}</span>
                                </span>
                              </span>
                              <ArrowRight className="size-5 shrink-0 transition-transform group-hover:translate-x-1" />
                            </button>
                          );
                        })}
                      </motion.div>
                    )}

                    {/* STEP 2 */}
                    {step === 2 && (
                      <motion.div key="s2" custom={dir} variants={slide} initial="enter" animate="center" exit="exit" className="space-y-5">
                        <SelectedBar info={info} canChange={!initialService} onChange={() => go(1)} />

                        <div>
                          <span className={labelCls}>What are we celebrating?</span>
                          <div className="grid grid-cols-3 gap-2 sm:grid-cols-4 sm:gap-2.5">
                            {EVENTS.map((ev) => (
                              <Tile key={ev.label} icon={ev.icon} label={ev.label} on={data.eventType === ev.label && !otherOpen}
                                onClick={() => { setOtherOpen(false); set("eventType", ev.label); }} />
                            ))}
                            <Tile icon={Pencil} label="Something else" on={otherOpen}
                              onClick={() => { setOtherOpen(true); if (EVENTS.some((e) => e.label === data.eventType)) set("eventType", ""); }} />
                          </div>
                        </div>

                        <AnimatePresence initial={false}>
                          {otherOpen && (
                            <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="overflow-hidden px-1 pb-1 pt-1">
                              <Field icon={Pencil} label="Tell us what it is" valid={data.eventType.trim().length > 1}>
                                <input autoFocus type="text" value={data.eventType} onChange={(e) => set("eventType", e.target.value)} placeholder="e.g. Graduation party, Eid dinner" className={inputCls} />
                              </Field>
                            </motion.div>
                          )}
                        </AnimatePresence>

                        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                          <Field icon={User} label="Your name" valid={data.name.trim().length > 1}>
                            <input type="text" autoComplete="name" value={data.name} onChange={(e) => set("name", e.target.value)} placeholder="e.g. Sarah Ahmed" className={inputCls} />
                          </Field>
                          <Field icon={Phone} label="WhatsApp number" valid={data.phone.replace(/\D/g, "").length >= 10}>
                            <input type="tel" inputMode="tel" autoComplete="tel" value={data.phone} onChange={(e) => set("phone", e.target.value)} placeholder="e.g. 0300 1234567" className={inputCls} />
                          </Field>
                        </div>

                        <NavRow onBack={initialService ? undefined : () => go(1)} nextLabel="Continue" disabled={!canContinue} />
                        {!canContinue && <p className="-mt-2 text-center text-xs text-stone-600">Pick an event and add your name and number to continue.</p>}
                      </motion.div>
                    )}

                    {/* STEP 3 */}
                    {step === 3 && (
                      <motion.div key="s3" custom={dir} variants={slide} initial="enter" animate="center" exit="exit" className="space-y-5">
                        <Calendar value={data.eventDate} onChange={(v) => set("eventDate", v)} />

                        <div>
                          <span className={labelCls}>How fast do you need it?</span>
                          <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                            {TIMELINES.map((t) => (
                              <Tile key={t.value} row icon={t.icon} label={t.label} sub={t.sub} on={data.timeline === t.value} onClick={() => set("timeline", t.value)} />
                            ))}
                          </div>
                          <p className="mt-2 text-xs text-stone-600">
                            {days !== null && days >= 0 && days <= 21
                              ? `Your date is only ${days} days away, so a faster option is safer.`
                              : `Typical for ${info.name}: ${info.timeline}.`}
                          </p>
                        </div>

                        <NavRow onBack={() => go(2)} nextLabel={data.eventDate ? "Continue" : "Skip for now"} />
                      </motion.div>
                    )}

                    {/* STEP 4 */}
                    {step === 4 && (
                      <motion.div key="s4" custom={dir} variants={slide} initial="enter" animate="center" exit="exit" className="space-y-6">
                        <div>
                          <span className={labelCls}>Colour palette</span>
                          <div className="grid grid-cols-2 gap-2 sm:grid-cols-4 sm:gap-2.5">
                            {PALETTES.map((p) => {
                              const on = data.palette === p.name;
                              return (
                                <button
                                  key={p.name} type="button" aria-pressed={on} onClick={() => set("palette", on ? "" : p.name)}
                                  className={cn("relative rounded-xl border p-2 text-left transition-colors", focusRing, on ? "border-[#1c1410] bg-white ring-1 ring-[#1c1410]" : idleTile)}
                                >
                                  <span className="block h-12 rounded-lg" style={{ backgroundImage: `linear-gradient(120deg, ${p.c[0]} 0%, ${p.c[1]} 55%, ${p.c[2]} 100%)` }} />
                                  <span className="mt-1.5 block text-xs font-semibold leading-tight">{p.name}</span>
                                  {on && <CheckBadge />}
                                </button>
                              );
                            })}
                          </div>
                        </div>

                        <div>
                          <span className={labelCls}>Style</span>
                          <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
                            {STYLES.map((s) => (
                              <Tile key={s.label} row icon={s.icon} label={s.label} on={data.style === s.label} onClick={() => set("style", data.style === s.label ? "" : s.label)} />
                            ))}
                          </div>
                        </div>

                        <div>
                          <span className={labelCls}>Features ({data.features.length} selected)</span>
                          <div className="grid grid-cols-2 gap-2 sm:grid-cols-4 sm:gap-2.5">
                            {FEATURES.map((f) => (
                              <Tile key={f.label} icon={f.icon} label={f.label} on={data.features.includes(f.label)} onClick={() => toggleFeature(f.label)} />
                            ))}
                          </div>
                        </div>

                        <NavRow onBack={() => go(3)} nextLabel="Continue" />
                      </motion.div>
                    )}

                    {/* STEP 5 */}
                    {step === 5 && (
                      <motion.div key="s5" custom={dir} variants={slide} initial="enter" animate="center" exit="exit" className="space-y-5">
                        <div className="overflow-hidden rounded-xl border border-black/[0.08] bg-white/70">
                          <div className="flex items-center gap-2 bg-[#1c1410] px-3 py-2">
                            <span className="flex gap-1">{["#fb7185", "#fbbf24", "#34d399"].map((c) => <i key={c} className="size-2 rounded-full" style={{ background: c }} />)}</span>
                            <div className="flex min-w-0 flex-1 items-center gap-1.5 rounded-full bg-white/10 px-3 py-1 text-[11px] font-semibold text-white">
                              <Lock className="size-3 shrink-0 text-emerald-300" />
                              <span className="truncate">{data.domain || "yourname.com"}</span>
                            </div>
                          </div>
                          <div
                            className="relative grid h-24 place-items-center text-center text-white"
                            style={{ backgroundImage: palette ? `linear-gradient(120deg, ${palette.c[0]}, ${palette.c[1]}, ${palette.c[2]})` : "linear-gradient(120deg,#44403c,#1c1410)" }}
                          >
                            <span className="absolute inset-0 bg-black/30" />
                            <div className="relative px-4">
                              <p className="font-[family-name:var(--font-display)] text-lg font-bold sm:text-xl">{first ? `${first}'s ${data.eventType || "celebration"}` : "Your celebration"}</p>
                              <p className="text-xs font-medium">{data.eventDate ? prettyDate(data.eventDate) : "Date to be announced"}</p>
                            </div>
                          </div>
                        </div>

                        <div>
                          <Field icon={Globe} label="Preferred web address" valid={data.domain.includes(".")}>
                            <input type="text" value={data.domain} onChange={(e) => { setDomainHelp(false); set("domain", e.target.value.toLowerCase().replace(/[^a-z0-9.-]/g, "")); }} placeholder="e.g. sarahandali.com" className={inputCls} />
                          </Field>
                          <div className="mt-2 flex flex-wrap gap-1.5">
                            {TLDS.map((t) => <Pill key={t} on={data.domain.endsWith(t)} onClick={() => setTld(t)}>{t}</Pill>)}
                            <Pill on={domainHelp} onClick={() => { setDomainHelp(!domainHelp); set("domain", ""); }}>Let the team choose</Pill>
                          </div>
                          <p className="mt-1.5 text-xs text-stone-600">We handle the purchase and DNS setup, and confirm the name is available.</p>
                        </div>

                        <div>
                          <span className={labelCls}>Budget (optional)</span>
                          <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
                            {BUDGETS.map((b) => (
                              <Tile key={b.label} row icon={b.icon} label={b.label} on={data.budget === b.label} onClick={() => set("budget", data.budget === b.label ? "" : b.label)} />
                            ))}
                          </div>
                        </div>

                        <label className="block">
                          <span className={labelCls}>Requirements (optional)</span>
                          <textarea
                            rows={3} value={data.requirements} onChange={(e) => set("requirements", e.target.value)}
                            placeholder="Tell us about your event, your guests and anything you want included"
                            className="w-full resize-none rounded-xl border border-black/[0.1] bg-white/80 px-4 py-3 text-sm text-[#1c1410] outline-none transition placeholder:text-stone-400 hover:border-[#1c1410]/30 focus:border-[#1c1410] focus-visible:ring-2 focus-visible:ring-[#1c1410]/20"
                          />
                        </label>

                        <Field icon={Link2} label="Inspiration link (optional)" valid={data.references.trim().length > 6}>
                          <input type="text" value={data.references} onChange={(e) => set("references", e.target.value)} placeholder="A Pinterest board or site you love" className={inputCls} />
                        </Field>

                        <NavRow onBack={() => go(4)} nextLabel="Send request" final loading={isSubmitting} />
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
function CheckBadge() {
  return (
    <span className="absolute right-1.5 top-1.5 grid size-5 place-items-center rounded-full bg-[#1c1410] text-white ring-2 ring-white">
      <Check className="size-3" strokeWidth={3} />
    </span>
  );
}

function Tile({ on, onClick, icon: Ic, label, sub, row }: {
  on: boolean; onClick: () => void; icon: LucideIcon; label: string; sub?: string; row?: boolean;
}) {
  return (
    <button
      type="button" onClick={onClick} aria-pressed={on}
      className={cn(
        "relative flex rounded-xl border p-2.5 transition-colors sm:p-3",
        row ? "items-center gap-2.5 text-left" : "flex-col items-center gap-2 text-center",
        on ? selectedTile : idleTile,
        focusRing,
      )}
    >
      <span className={cn("grid size-9 shrink-0 place-items-center rounded-lg transition-colors", on ? "bg-white/15 text-white" : "bg-[#1c1410]/[0.06] text-[#1c1410]")}>
        <Ic className="size-[18px]" />
      </span>
      <span className="min-w-0">
        <span className="block text-xs font-semibold leading-tight sm:text-[13px]">{label}</span>
        {sub && <span className={cn("mt-0.5 block text-[11px]", on ? "text-white/80" : "text-stone-500")}>{sub}</span>}
      </span>
      {on && !row && <CheckBadge />}
    </button>
  );
}

function Pill({ on, onClick, children }: { on: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      type="button" onClick={onClick} aria-pressed={on}
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-[11px] font-semibold transition-colors sm:text-xs",
        focusRing,
        on ? "border-[#1c1410] bg-[#1c1410] text-white" : "border-black/[0.1] bg-white/70 text-[#1c1410] hover:border-[#1c1410]/30 hover:bg-white",
      )}
    >
      {children}
    </button>
  );
}

function Field({ icon: Ic, label, valid, children }: { icon: LucideIcon; label: string; valid?: boolean; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className={labelCls}>{label}</span>
      <span className="relative block">
        <Ic aria-hidden className="pointer-events-none absolute left-4 top-1/2 size-4 -translate-y-1/2 text-stone-400" />
        {children}
        {valid && (
          <span className="pointer-events-none absolute right-3 top-1/2 grid size-5 -translate-y-1/2 place-items-center rounded-full bg-[#1c1410] text-white">
            <Check className="size-3" strokeWidth={3} />
          </span>
        )}
      </span>
    </label>
  );
}

function SelectedBar({ info, canChange, onChange }: { info: (typeof SERVICE_INFO)[Service]; canChange: boolean; onChange: () => void }) {
  const Ic = info.icon;
  return (
    <div className="flex items-center justify-between gap-3 rounded-xl border border-black/[0.08] bg-white/70 p-2.5 text-sm">
      <span className="flex flex-wrap items-center gap-x-3 gap-y-1">
        <span className="grid size-7 place-items-center rounded-lg bg-[#1c1410] text-white"><Ic className="size-4" /></span>
        <b className="font-semibold">{info.name}</b>
        <span className="flex items-center gap-1 text-xs text-stone-600"><Clock className="size-3.5" /> {info.timeline}</span>
      </span>
      {canChange && (
        <button type="button" onClick={onChange} className={cn("shrink-0 rounded text-xs font-semibold underline underline-offset-4", focusRing)}>
          Change
        </button>
      )}
    </div>
  );
}

function NavRow({ onBack, nextLabel, disabled, final, loading }: { onBack?: () => void; nextLabel: string; disabled?: boolean; final?: boolean; loading?: boolean }) {
  return (
    <div className="flex gap-2.5 pt-1 sm:gap-3">
      {onBack && (
        <button
          type="button" onClick={onBack}
          className={cn("inline-flex items-center justify-center gap-2 rounded-xl border border-[#1c1410]/20 bg-white/70 px-5 py-3 text-sm font-bold text-[#1c1410] transition-colors hover:bg-white", focusRing)}
        >
          <ArrowLeft className="size-4" /> Back
        </button>
      )}
      <button
        type="submit" disabled={disabled || loading}
        className={cn("flex flex-1 items-center justify-center gap-2 rounded-xl px-5 py-3 text-sm font-bold disabled:cursor-not-allowed disabled:opacity-50", darkBtn, focusRing)}
      >
        {loading ? (
          <span className="flex items-center gap-2"><span className="size-4 animate-spin rounded-full border-2 border-white border-t-transparent" /> Opening WhatsApp</span>
        ) : (
          <>{final && <MessageCircle className="size-4" />} {nextLabel} <ArrowRight className="size-4" /></>
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
  const navBtn = cn("grid size-9 place-items-center rounded-full border border-black/[0.08] bg-white transition-colors hover:bg-[#1c1410] hover:text-white disabled:opacity-30 disabled:hover:bg-white disabled:hover:text-inherit", focusRing);

  return (
    <div className="rounded-2xl border border-black/[0.08] bg-white/60 p-3 sm:p-4">
      <div className="mb-2 flex items-center justify-between gap-2">
        <span className="flex items-center gap-2 text-[15px] font-bold">
          <span className="grid size-8 place-items-center rounded-lg bg-[#1c1410] text-white"><CalendarDays className="size-4" /></span>
          {view.toLocaleDateString("en-GB", { month: "long", year: "numeric" })}
        </span>
        <span className="flex gap-2">
          <button type="button" aria-label="Previous month" disabled={!canPrev} onClick={() => go(-1)} className={navBtn}><ChevronLeft className="size-4" /></button>
          <button type="button" aria-label="Next month" onClick={() => go(1)} className={navBtn}><ChevronRight className="size-4" /></button>
        </span>
      </div>

      <div className="grid grid-cols-7 text-center text-xs font-semibold text-stone-500">
        {["S", "M", "T", "W", "T", "F", "S"].map((d, i) => <span key={i} className="py-1">{d}</span>)}
      </div>

      <AnimatePresence mode="wait" initial={false}>
        <motion.div
          key={toISO(view)} initial={{ opacity: 0, x: dir * 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: dir * -20 }} transition={{ duration: 0.16 }}
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
                className={cn(
                  "relative aspect-square rounded-lg text-sm font-semibold transition-colors",
                  focusRing,
                  sel ? "bg-[#1c1410] text-white" : past ? "cursor-not-allowed text-stone-300" : "hover:bg-[#1c1410]/[0.07]",
                  isToday && !sel && "ring-1 ring-[#1c1410]/50",
                )}
              >
                {day}
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

      <p className="mt-2.5 text-[13px] font-medium">
        {value && days !== null ? `${prettyDate(value)}. ${daysLabel(days)}.` : "No date yet. That's fine, we can plan around it."}
      </p>
    </div>
  );
}