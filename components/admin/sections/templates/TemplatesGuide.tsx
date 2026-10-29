"use client";

import * as React from "react";
import Link from "next/link";
import {
  AnimatePresence,
  motion,
  useMotionTemplate,
  useMotionValue,
} from "framer-motion";
import {
  ArrowRight,
  Check,
  ChevronDown,
  Code2,
  Copy,
  FolderPlus,
  Keyboard,
  Layers,
  LayoutTemplate,
  Lightbulb,
  Link2,
  Monitor,
  MousePointerClick,
  Palette,
  Rocket,
  Smartphone,
  Sparkles,
  Tablet,
  Undo2,
  Users,
  Wand2,
  Image as ImageIcon,
  Type,
  Music,
  CheckCircle2,
  Lock,
  MousePointer2,
  BookOpen,
  Zap,
  ShieldCheck,
  Box,
  Component,
} from "lucide-react";

/* ========================================================================== */
/* Primitives                                                                 */
/* ========================================================================== */

const glass =
  "rounded-3xl border border-orange-100/60 bg-white/70 backdrop-blur-xl shadow-[inset_0_1px_0_#fff,0_14px_30px_-14px_rgba(249,115,22,0.15)]";

function SpotlightCard({
  children,
  className = "",
}: {
  children: React.ReactNode;
  className?: string;
}) {
  const x = useMotionValue(-200);
  const y = useMotionValue(-200);
  const bg = useMotionTemplate`radial-gradient(400px circle at ${x}px ${y}px, rgba(249,115,22,0.1), transparent 70%)`;
  return (
    <div
      onMouseMove={(e) => {
        const r = e.currentTarget.getBoundingClientRect();
        x.set(e.clientX - r.left);
        y.set(e.clientY - r.top);
      }}
      className={`group relative overflow-hidden ${glass} ${className}`}
    >
      <motion.div
        aria-hidden
        className="pointer-events-none absolute -inset-px opacity-0 transition-opacity duration-300 group-hover:opacity-100"
        style={{ background: bg }}
      />
      <div className="relative h-full">{children}</div>
    </div>
  );
}

function FlipWords({ words }: { words: string[] }) {
  const [i, setI] = React.useState(0);
  React.useEffect(() => {
    const t = window.setInterval(
      () => setI((n) => (n + 1) % words.length),
      2200,
    );
    return () => window.clearInterval(t);
  }, [words.length]);
  return (
    <span className="relative inline-block min-w-[3ch] text-left">
      <AnimatePresence mode="wait">
        <motion.span
          key={words[i]}
          initial={{ opacity: 0, y: 14, filter: "blur(6px)" }}
          animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
          exit={{ opacity: 0, y: -14, filter: "blur(6px)" }}
          transition={{ duration: 0.35 }}
          className="inline-block bg-gradient-to-r from-orange-400 to-orange-600 bg-clip-text text-transparent"
        >
          {words[i]}
        </motion.span>
      </AnimatePresence>
    </span>
  );
}

/* ========================================================================== */
/* Mockups & Visuals                                                          */
/* ========================================================================== */

function CategoryVisual() {
  return (
    <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm transition-all group-hover:shadow-md">
      <div className="flex items-center gap-1.5 border-b border-slate-100 bg-slate-50 px-3 py-2">
        <span className="size-2 rounded-full bg-red-300" />
        <span className="size-2 rounded-full bg-amber-300" />
        <span className="size-2 rounded-full bg-emerald-300" />
        <span className="ml-2 text-[10px] font-medium text-slate-400">
          New Category
        </span>
      </div>
      <div className="space-y-3 p-4">
        <div>
          <label className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider mb-1 block">
            Name
          </label>
          <div className="rounded-lg border border-slate-200 px-3 py-2 text-xs text-slate-700 flex justify-between items-center bg-white">
            Nikah
            <CheckCircle2 className="w-4 h-4 text-emerald-500" />
          </div>
        </div>
        <div>
          <label className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider mb-1 block">
            Link Preview
          </label>
          <div className="rounded-lg bg-slate-50 px-3 py-2 font-mono text-[11px] text-slate-500 border border-slate-100">
            /templates/
            <span className="text-orange-600 font-semibold">nikah</span>
          </div>
        </div>
        <div className="flex gap-2">
          {["Elegant", "Mehndi", "Walima"].map((tag) => (
            <span
              key={tag}
              className="text-[10px] bg-orange-50 text-orange-600 border border-orange-100 rounded-full px-2 py-0.5"
            >
              {tag}
            </span>
          ))}
        </div>
      </div>
    </div>
  );
}

function BuilderVisual() {
  return (
    <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
      <div className="flex items-center gap-1.5 border-b border-slate-100 bg-slate-50 px-3 py-2">
        <span className="ml-2 text-[10px] font-medium text-slate-400">
          Elementor Builder
        </span>
      </div>
      <div className="relative grid h-48 grid-cols-[60px_1fr_70px] gap-2 p-3 bg-slate-50/50">
        <div className="space-y-1.5 rounded-lg bg-white border border-slate-100 p-1.5">
          <div className="h-6 rounded bg-slate-100 flex items-center justify-center text-[8px] text-slate-400">
            <Type className="w-3 h-3" />
          </div>
          <div className="h-6 rounded bg-slate-100 flex items-center justify-center text-[8px] text-slate-400">
            <ImageIcon className="w-3 h-3" />
          </div>
          <div className="h-6 rounded bg-slate-100 flex items-center justify-center text-[8px] text-slate-400">
            <Music className="w-3 h-3" />
          </div>
        </div>
        <div className="space-y-2 rounded-lg bg-white border border-orange-200/60 p-2 shadow-sm">
          <div className="h-6 w-3/4 rounded bg-orange-200/80 mx-auto" />
          <div className="h-16 rounded bg-orange-100/80 border-2 border-dashed border-orange-300 flex items-center justify-center">
            <span className="text-[9px] font-medium text-orange-500">
              Drop Image Here
            </span>
          </div>
          <div className="h-3 w-1/2 rounded bg-slate-100 mx-auto" />
        </div>
        <div className="space-y-1.5 rounded-lg bg-white border border-slate-100 p-1.5">
          <div className="h-3 rounded bg-slate-100" />
          <div className="h-3 rounded bg-slate-100" />
          <div className="h-6 rounded border border-slate-200 mt-2 bg-orange-50" />
        </div>
        <motion.div
          className="absolute left-16 top-8 flex items-center gap-1 rounded-md bg-slate-800 px-2 py-1 text-[9px] font-medium text-white shadow-xl z-10"
          animate={{ x: [0, 80, 40, 0], y: [0, 50, 90, 0] }}
          transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
        >
          <MousePointer2 className="size-2.5 fill-orange-400 text-orange-400" />{" "}
          Admin
        </motion.div>
      </div>
    </div>
  );
}

function LivePlayground() {
  const [bride, setBride] = React.useState("Ayesha");
  const [groom, setGroom] = React.useState("Ahmed");
  const [date, setDate] = React.useState("2026-12-12");

  const niceDate = React.useMemo(() => {
    const d = new Date(`${date}T00:00:00`);
    return isNaN(d.getTime())
      ? "Your date"
      : d.toLocaleDateString("en-GB", {
          day: "numeric",
          month: "long",
          year: "numeric",
        });
  }, [date]);

  return (
    <SpotlightCard className="p-0 overflow-hidden">
      <div className="border-b border-orange-100/60 px-6 py-4">
        <h3 className="flex items-center gap-2 text-lg font-semibold text-slate-800">
          <Wand2 className="size-5 text-orange-500" /> Live Playground
        </h3>
        <p className="text-sm text-slate-500">
          Type below to see how dynamic fields replace data in real-time.
        </p>
      </div>
      <div className="grid md:grid-cols-2 divide-y md:divide-y-0 md:divide-x divide-orange-100/60">
        <div className="p-6 space-y-4 bg-slate-50/50">
          {[
            { label: "Bride Name", val: bride, set: setBride, type: "text" },
            { label: "Groom Name", val: groom, set: setGroom, type: "text" },
            { label: "Event Date", val: date, set: setDate, type: "date" },
          ].map((f) => (
            <label key={f.label} className="block space-y-1">
              <span className="text-xs font-semibold text-slate-600 uppercase tracking-wider">
                {f.label}
              </span>
              <input
                type={f.type}
                value={f.val}
                onChange={(e) => f.set(e.target.value)}
                className="h-10 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm outline-none focus:border-orange-500 focus:ring-2 focus:ring-orange-500/30 transition-all"
              />
            </label>
          ))}
        </div>
        <div className="p-8 grid place-items-center bg-gradient-to-br from-orange-50 to-amber-50 relative overflow-hidden">
          <div className="absolute inset-4 border border-orange-200/50 rounded-2xl pointer-events-none" />
          <div className="text-center space-y-3 relative z-10">
            <p className="text-[10px] font-bold uppercase tracking-[0.3em] text-orange-500">
              Together with families
            </p>
            <AnimatePresence mode="wait">
              <motion.h4
                key={bride + groom}
                initial={{ opacity: 0, y: 5 }}
                animate={{ opacity: 1, y: 0 }}
                className="text-3xl font-bold text-slate-800 font-[family-name:var(--font-display)]"
              >
                {bride || "Bride"} <span className="text-orange-500">&</span>{" "}
                {groom || "Groom"}
              </motion.h4>
            </AnimatePresence>
            <p className="text-sm text-slate-600 font-medium">{niceDate}</p>
          </div>
        </div>
      </div>
    </SpotlightCard>
  );
}

/* ========================================================================== */
/* Content & Data                                                             */
/* ========================================================================== */

const STEPS = [
  {
    title: "1. The Category Masterclass",
    icon: FolderPlus,
    summary:
      "Before building a template, you need a category. Think of it as a folder. Categories keep your template marketplace organized and searchable.",
    points: [
      "Click 'Create Category' and give it a clear name (e.g., Nikah, Mehndi, Birthday).",
      "The slug (URL link) is generated automatically for SEO.",
      "Upload a bright, landscape thumbnail (1200x800px) to attract buyers.",
    ],
    tip: "Use the quick-chips (Elegant, Modern, Floral) to brainstorm names quickly.",
    Visual: CategoryVisual,
  },
  {
    title: "2. The 3-Panel Builder",
    icon: LayoutTemplate,
    summary:
      "When you click 'Create Template', you enter the Elementor-style canvas. The architecture is split into three distinct zones.",
    points: [
      "Left Panel: Drag & drop 200+ widgets (Text, Image, Video, Countdown).",
      "Center Canvas: Click and edit exactly what the guest sees.",
      "Right Panel (Inspector): Style fonts, colors, padding, and margins.",
    ],
    tip: "Start with a Heading, a Cover Image, and a Gallery before styling.",
    Visual: BuilderVisual,
  },
  {
    title: "3. Make it Dynamic (Crucial)",
    icon: Link2,
    summary:
      "This is the secret sauce. Templates aren't static; buyers must be able to swap in their own details (names, dates, photos).",
    points: [
      "Drag from 'Dynamic Fields' in the left panel.",
      "Bind text blocks to {{names.bride}} or {{event.date}}.",
      "Never type a real couple's name—always use a dynamic field.",
    ],
    tip: "If you use plain text, the buyer cannot change it, and the template won't sell.",
    Visual: LivePlayground,
  },
  {
    title: "4. Custom Code & Logic",
    icon: Code2,
    summary:
      "For advanced designs, we provide a fully sandboxed Monaco Editor with Babel compilation for HTML, CSS, JSX, and TSX.",
    points: [
      "Click the 'Code' widget to open the isolated iframe sandbox.",
      "Use tokens like data.names.bride inside your React components.",
      "Press 'Insert as block' to drop your custom logic directly onto the canvas.",
    ],
    tip: "The iframe sandbox prevents XSS and bad code from crashing the main app.",
    Visual: () => (
      <div className="rounded-2xl border border-slate-700 bg-[#0f172a] p-4 text-xs font-mono shadow-lg">
        <div className="flex gap-1.5 mb-3">
          <span className="size-2.5 rounded-full bg-red-500/80" />
          <span className="size-2.5 rounded-full bg-amber-500/80" />
          <span className="size-2.5 rounded-full bg-emerald-500/80" />
        </div>
        <p className="text-sky-300">{"<div className='invite-card'>"}</p>
        <p className="text-slate-300 pl-4">
          {"<h1>"}
          <span className="text-orange-400">{"{{names.bride}}"}</span>
          {" & "}
          <span className="text-orange-400">{"{{names.groom}}"}</span>
          {"</h1>"}
        </p>
        <p className="text-slate-300 pl-4">
          {"<img src="}
          <span className="text-orange-400">{"{{thumbnail}}"}</span>
          {" />"}
        </p>
        <p className="text-sky-300">{"</div>"}</p>
      </div>
    ),
  },
  {
    title: "5. Save, Preview & Publish",
    icon: Rocket,
    summary:
      "Once your design is polished and dynamic, it's time to put it on the market.",
    points: [
      "Fill in the required metadata: Name, Category, and Thumbnail.",
      "Set a price, or mark it as a Premium template.",
      "Keep it as a Draft while testing. Toggle to Publish when ready.",
    ],
    tip: "Always check the Mobile view (Tablet/Mobile icons at the top) before publishing.",
    Visual: () => (
      <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-semibold text-slate-800">
              Premium Nikah
            </p>
            <p className="text-xs text-slate-500">Ready to sell</p>
          </div>
          <div className="h-8 w-14 bg-orange-500 rounded-full relative flex items-center px-1">
            <div className="size-6 bg-white rounded-full absolute right-1 shadow-sm" />
          </div>
        </div>
      </div>
    ),
  },
];

const TOKENS = [
  { label: "Bride Name", html: "{{names.bride}}", react: "data.names.bride" },
  { label: "Groom Name", html: "{{names.groom}}", react: "data.names.groom" },
  { label: "Event Date", html: "{{event.date}}", react: "data.event.date" },
  { label: "Venue", html: "{{venue.name}}", react: "data.venue.name" },
  { label: "Cover Image", html: "{{thumbnail}}", react: "data.thumbnail" },
  { label: "Music URL", html: "{{music.0}}", react: "data.music[0]" },
];

const FEATURES = [
  {
    title: "200+ Widgets",
    icon: Component,
    desc: "Text, images, countdowns, maps, RSVP forms.",
  },
  {
    title: "Fully Responsive",
    icon: Smartphone,
    desc: "Tweak desktop, tablet, and mobile independently.",
  },
  {
    title: "Undo/Redo",
    icon: Undo2,
    desc: "A custom 700ms coalesce timer for seamless editing.",
  },
  {
    title: "Cloudinary CDN",
    icon: ImageIcon,
    desc: "Direct-to-cloud uploads for lightning-fast images.",
  },
];

const CHECKLIST = [
  "Category created and thumbnail uploaded",
  "Cover image & Gallery added",
  "Names, date, and venue use dynamic fields",
  "Tested on mobile and tablet views",
  "Background music attached (optional)",
  "Price and premium flag set correctly",
];

const FAQ = [
  {
    q: "What happens when a buyer purchases my template?",
    a: "They get their own fully editable copy of the template. They can change names, dates, upload their own photos, and customize the music. Your original template is never altered.",
  },
  {
    q: "Why isn't my text changing when I preview?",
    a: "You likely typed plain text. To make text editable by the buyer, you must bind it to a dynamic field (like {{names.bride}}) using the right-hand styling panel.",
  },
  {
    q: "Can I add custom code?",
    a: "Yes! We support an isolated HTML, CSS, JSX, and TSX sandbox. Click the 'Code' widget, write your custom logic, and click 'Insert as Block'.",
  },
  {
    q: "How does the pricing work?",
    a: "You can set a one-time purchase price for a template, or mark it as Premium. Premium templates require the buyer to have an active Pro/Premium subscription.",
  },
];

const SHORTCUTS = [
  ["Ctrl + Z", "Undo"],
  ["Ctrl + Shift + Z", "Redo"],
  ["Ctrl + D", "Duplicate block"],
  ["Delete", "Remove block"],
  ["Esc", "Deselect / exit preview"],
];

/* ========================================================================== */
/* Public Component                                                           */
/* ========================================================================== */

export function TemplatesGuide() {
  const [openFaq, setOpenFaq] = React.useState<number | null>(0);
  const [checklist, setChecklist] = React.useState<Record<string, boolean>>({});
  const [tokenMode, setTokenMode] = React.useState<"html" | "react">("html");
  const checkedCount = CHECKLIST.filter((c) => checklist[c]).length;

  return (
    <section
      className="w-full max-w-5xl mx-auto space-y-16 py-10"
      aria-label="Template creation guide"
    >
      {/* Hero */}
      <div className="relative overflow-hidden rounded-[2.5rem] border border-orange-100/70 bg-gradient-to-br from-white via-orange-50/60 to-amber-50/40 px-6 py-16 text-center shadow-[inset_0_1px_0_#fff,0_24px_50px_-24px_rgba(249,115,22,0.3)]">
        <div
          className="absolute inset-0 opacity-40"
          style={{
            backgroundImage:
              "radial-gradient(rgba(249,115,22,0.15) 1px, transparent 1px)",
            backgroundSize: "24px 24px",
            maskImage:
              "radial-gradient(ellipse at center, black 20%, transparent 70%)",
          }}
        />
        <motion.div
          className="absolute -left-20 -top-20 size-72 rounded-full bg-orange-300/30 blur-3xl"
          animate={{ x: [0, 40, 0], y: [0, 30, 0] }}
          transition={{ duration: 10, repeat: Infinity, ease: "easeInOut" }}
        />
        <div className="relative">
          <span className="mb-5 inline-flex items-center gap-2 rounded-full border border-orange-200 bg-white/80 px-3 py-1 text-xs font-semibold text-orange-600 shadow-sm">
            <Sparkles className="size-3.5" /> Template Masterclass
          </span>
          <h2 className="mx-auto max-w-2xl font-[family-name:var(--font-display)] text-3xl font-bold leading-tight tracking-tight text-slate-800 md:text-5xl">
            Design beautiful{" "}
            <FlipWords
              words={["Nikah", "Mehndi", "Baraat", "Walima", "Birthday"]}
            />{" "}
            invitations
          </h2>
          <p className="mx-auto mt-4 max-w-xl text-slate-500">
            Follow this comprehensive guide to master the builder, use dynamic
            fields, and create highly profitable templates.
          </p>
          <div className="mt-8 flex justify-center gap-4 text-xs font-medium text-slate-500">
            <span className="flex items-center gap-1">
              <ShieldCheck className="w-4 h-4 text-emerald-500" /> Secure
              Sandbox
            </span>
            <span className="flex items-center gap-1">
              <Zap className="w-4 h-4 text-orange-500" /> 200+ Widgets
            </span>
            <span className="flex items-center gap-1">
              <Box className="w-4 h-4 text-blue-500" /> Cloudinary CDN
            </span>
          </div>
        </div>
      </div>

      {/* Steps */}
      <div className="relative mx-auto max-w-4xl space-y-8">
        <div className="absolute bottom-0 left-6 top-2 w-0.5 bg-gradient-to-b from-orange-400 via-orange-200 to-transparent hidden md:block" />

        {STEPS.map((step, i) => (
          <motion.div
            key={step.title}
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "-100px" }}
            className="relative md:pl-20"
          >
            <span className="hidden md:grid absolute left-0 top-6 size-12 place-items-center rounded-full bg-gradient-to-b from-orange-400 to-orange-600 text-sm font-bold text-white shadow-lg ring-4 ring-[#fffafb] z-10">
              {i + 1}
            </span>
            <SpotlightCard className="p-6 md:p-8">
              <div className="grid gap-8 md:grid-cols-2 md:items-center">
                <div>
                  <div className="mb-3 flex items-center gap-2 text-orange-600">
                    <step.icon className="size-5" />
                    <span className="text-xs font-bold uppercase tracking-wider">
                      {step.title}
                    </span>
                  </div>
                  <p className="text-sm leading-relaxed text-slate-600 mb-4">
                    {step.summary}
                  </p>
                  <ul className="space-y-2.5">
                    {step.points.map((p, idx) => (
                      <li
                        key={idx}
                        className="flex gap-2 text-sm text-slate-700"
                      >
                        <Check className="mt-0.5 size-4 shrink-0 text-orange-500" />
                        {p}
                      </li>
                    ))}
                  </ul>
                  <div className="mt-5 flex gap-2 rounded-xl bg-amber-50 border border-amber-100 p-3 text-xs text-amber-800">
                    <Lightbulb className="size-4 shrink-0" />
                    {step.tip}
                  </div>
                </div>
                <step.Visual />
              </div>
            </SpotlightCard>
          </motion.div>
        ))}
      </div>

      {/* Token Cheat Sheet */}
      <SpotlightCard className="p-6 md:p-8 max-w-4xl mx-auto w-full">
        <div className="flex flex-col md:flex-row justify-between md:items-center gap-4 mb-6">
          <div>
            <h3 className="text-lg font-semibold text-slate-800 flex items-center gap-2">
              <Layers className="size-5 text-orange-500" /> Dynamic Token Cheat
              Sheet
            </h3>
            <p className="text-sm text-slate-500">
              Click any token to copy it. Use these in text blocks or custom
              code.
            </p>
          </div>
          <div className="flex bg-slate-100 p-1 rounded-xl w-fit">
            {(["html", "react"] as const).map((m) => (
              <button
                key={m}
                onClick={() => setTokenMode(m)}
                className={`px-4 py-1.5 text-xs font-semibold rounded-lg transition-all ${tokenMode === m ? "bg-white text-orange-600 shadow-sm" : "text-slate-500 hover:text-slate-700"}`}
              >
                {m === "html" ? "HTML / CSS" : "JSX / TSX"}
              </button>
            ))}
          </div>
        </div>
        <div className="grid sm:grid-cols-2 gap-3">
          {TOKENS.map((t) => (
            <div
              key={t.label}
              className="flex items-center justify-between p-3 rounded-xl border border-slate-200 bg-white/50 hover:bg-white transition-colors group cursor-pointer"
              onClick={() =>
                navigator.clipboard.writeText(
                  tokenMode === "html" ? t.html : t.react,
                )
              }
            >
              <span className="text-xs font-medium text-slate-600">
                {t.label}
              </span>
              <div className="flex items-center gap-2 bg-orange-50 text-orange-600 px-2 py-1 rounded-md font-mono text-[11px] border border-orange-100 group-hover:border-orange-300">
                {tokenMode === "html" ? t.html : t.react}
                <Copy className="size-3 opacity-50 group-hover:opacity-100" />
              </div>
            </div>
          ))}
        </div>
      </SpotlightCard>

      {/* Feature Bento */}
      <div className="max-w-4xl mx-auto w-full">
        <h3 className="text-xl font-semibold text-slate-800 mb-6 px-1">
          Everything the builder gives you
        </h3>
        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {FEATURES.map((f) => (
            <SpotlightCard key={f.title} className="p-5">
              <f.icon className="size-6 text-orange-500 mb-3" />
              <h4 className="text-sm font-semibold text-slate-800 mb-1">
                {f.title}
              </h4>
              <p className="text-xs text-slate-500 leading-relaxed">{f.desc}</p>
            </SpotlightCard>
          ))}
        </div>
      </div>

      {/* Two Column Layout: Checklist, Shortcuts, FAQ */}
      <div className="grid gap-6 md:grid-cols-2 max-w-4xl mx-auto w-full">
        <div className="space-y-6">
          <SpotlightCard className="p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="flex items-center gap-2 text-lg font-semibold text-slate-800">
                <CheckCircle2 className="size-5 text-orange-500" /> Pre-Publish
                Checklist
              </h3>
              <span className="text-xs font-bold text-orange-600 bg-orange-50 px-2.5 py-1 rounded-full">
                {checkedCount}/{CHECKLIST.length}
              </span>
            </div>
            <ul className="space-y-1">
              {CHECKLIST.map((item) => (
                <li key={item}>
                  <label className="flex cursor-pointer items-center gap-3 rounded-lg px-3 py-2 text-sm text-slate-700 hover:bg-orange-50 transition-colors">
                    <input
                      type="checkbox"
                      checked={!!checklist[item]}
                      onChange={(e) =>
                        setChecklist((prev) => ({
                          ...prev,
                          [item]: e.target.checked,
                        }))
                      }
                      className="size-4 accent-orange-500 rounded"
                    />
                    <span
                      className={
                        checklist[item] ? "text-slate-400 line-through" : ""
                      }
                    >
                      {item}
                    </span>
                  </label>
                </li>
              ))}
            </ul>
            {checkedCount === CHECKLIST.length && (
              <motion.p
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="mt-4 rounded-lg bg-emerald-50 px-3 py-2 text-center text-sm font-medium text-emerald-700 border border-emerald-100"
              >
                Ready to launch! 🚀
              </motion.p>
            )}
          </SpotlightCard>

          <SpotlightCard className="p-6">
            <h3 className="flex items-center gap-2 text-lg font-semibold text-slate-800 mb-4">
              <Keyboard className="size-5 text-orange-500" /> Shortcuts
            </h3>
            <div className="space-y-2">
              {SHORTCUTS.map(([key, label]) => (
                <div
                  key={key}
                  className="flex items-center justify-between text-sm"
                >
                  <span className="text-slate-600">{label}</span>
                  <kbd className="px-2 py-1 bg-slate-100 border border-slate-200 rounded text-[11px] font-mono text-slate-600 shadow-sm">
                    {key}
                  </kbd>
                </div>
              ))}
            </div>
          </SpotlightCard>
        </div>

        <SpotlightCard className="p-2 h-fit">
          <div className="px-4 py-3 border-b border-orange-100/50">
            <h3 className="flex items-center gap-2 text-lg font-semibold text-slate-800">
              <BookOpen className="size-5 text-orange-500" /> FAQ
            </h3>
          </div>
          {FAQ.map((faq, idx) => {
            const isOpen = openFaq === idx;
            return (
              <div
                key={faq.q}
                className="border-b border-orange-100/50 last:border-0"
              >
                <button
                  onClick={() => setOpenFaq(isOpen ? null : idx)}
                  className="flex w-full items-center justify-between gap-4 px-4 py-4 text-left text-sm font-semibold text-slate-800 hover:text-orange-600 transition-colors"
                >
                  {faq.q}
                  <ChevronDown
                    className={`size-4 shrink-0 text-slate-400 transition-transform ${isOpen ? "rotate-180" : ""}`}
                  />
                </button>
                <AnimatePresence initial={false}>
                  {isOpen && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: "auto", opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      className="overflow-hidden"
                    >
                      <p className="px-4 pb-4 text-sm leading-relaxed text-slate-600">
                        {faq.a}
                      </p>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            );
          })}
        </SpotlightCard>
      </div>

      {/* CTA */}
      <div className="relative overflow-hidden rounded-[2rem] bg-gradient-to-br from-orange-500 to-orange-600 px-6 py-12 text-center text-white shadow-[0_24px_50px_-20px_rgba(249,115,22,0.6)] max-w-4xl mx-auto w-full">
        <div
          className="absolute inset-0 opacity-10"
          style={{
            backgroundImage: "radial-gradient(#fff 1px, transparent 1px)",
            backgroundSize: "18px 18px",
          }}
        />
        <div className="relative">
          <h3 className="font-[family-name:var(--font-display)] text-2xl font-bold md:text-3xl">
            Ready to build your first template?
          </h3>
          <p className="mx-auto mt-2 max-w-md text-sm text-orange-50">
            Put your knowledge to the test and launch the builder.
          </p>
          <Link
            href="/admin/dashboard/templates/new/builder"
            className="mt-6 inline-flex items-center gap-2 rounded-xl bg-white px-6 py-3 text-sm font-semibold text-orange-600 shadow-lg transition hover:scale-[1.03]"
          >
            Launch Builder <ArrowRight className="size-4" />
          </Link>
        </div>
      </div>
    </section>
  );
}

export default TemplatesGuide;
