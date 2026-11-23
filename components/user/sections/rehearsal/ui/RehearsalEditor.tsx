"use client";

/**
 * components/user/sections/rehearsal/ui/RehearsalEditor.tsx
 *
 * Beginner-friendly invitation editor for the Rehearsal Studio.
 *
 *  - Tap anything on the page to edit it in plain words.
 *  - Add / Details / Look tabs. Desktop: side panel. Phone & tablet: bottom sheet.
 *  - Scroll animations per item (play once when the item scrolls into view).
 *  - An imperative `controllerRef` so the AI assistant can apply ideas and
 *    build the invitation directly (ONE Undo step per applied AI batch).
 *    The AI can edit, add (headings / text cards) and remove items, and the
 *    controller can scroll to and flash any item (`focus`) so the user can
 *    see exactly what a proposed change refers to.
 *  - Event date and time use the custom pickers from ./DateTimePicker
 *    (values stay "YYYY-MM-DD" and "HH:mm", so saving and the AI route are unchanged).
 *
 * SCROLLING: every scroll area carries `data-lenis-prevent`, so Lenis smooth
 * scroll no longer swallows the wheel / touch events of the editor.
 *
 * ⚠ Verify these import paths against your repo:
 *   "@/components/admin/sections/templates/WidgetRenderer"
 *   "@/components/admin/sections/templates/CodeEditor"   (CodePreview only)
 *   "@/lib/elementor/widgets", "@/lib/elementor/invitation-data"
 */

import * as React from "react";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import {
  AlignCenter,
  AlignLeft,
  AlignRight,
  ArrowDown,
  ArrowUp,
  Bold,
  Bot,
  CalendarDays,
  ChevronDown,
  Copy,
  Eye,
  EyeOff,
  Image as ImageIcon,
  ImagePlus,
  Italic,
  Layers,
  Loader2,
  MapPin,
  Music,
  Palette,
  Pencil,
  Play,
  Plus,
  Redo2,
  Search,
  Trash2,
  Type,
  Undo2,
  Users,
  Video,
  X,
} from "lucide-react";

import { WIDGET_REGISTRY, type WidgetDefinition } from "@/lib/elementor/widgets";
import {
  normalizeData,
  resolveElement,
  type InvitationData,
} from "@/lib/elementor/invitation-data";
import {
  WidgetRenderer,
  type BuilderElement,
} from "@/components/admin/sections/templates/WidgetRenderer";
import { CodePreview } from "@/components/admin/sections/templates/CodeEditor";
import { toast } from "@/components/ui/toast";
import { apiClient } from "@/lib/api/api_base";
import { cn } from "@/components/user/sections/dashboard/ui/DashboardUI";
import { FOCUS } from "@/components/user/navigation/UserSidebar";
import { EventDateTimeFields } from "./DateTimePicker";

/* ========================================================================== */
/*  Types                                                                     */
/* ========================================================================== */

type Rec = Record<string, any>;

export type DeviceKey = "desktop" | "tablet" | "mobile";

export type PageSettings = {
  backgroundColor: string;
  entranceAnimation: string;
  customCss: string;
  customCode: string;
  customCodeLang: string;
};

export type EventDetails = {
  date: string;
  time: string;
  venue: string;
  address: string;
};

/** Everything the user's rehearsal consists of. This is what gets saved as the draft. */
export type RehearsalDesign = {
  elements: BuilderElement[];
  pageSettings: PageSettings;
  coreNames: { bride: string; groom: string };
  galleryUrls: string[];
  videoUrls: string[];
  musicUrls: string[];
  thumbnailUrl: string;
  details: EventDetails;
};

/** What the top bar (rendered by the parent) can control. */
export type EditorBarApi = {
  undo: () => void;
  redo: () => void;
  canUndo: boolean;
  canRedo: boolean;
  device: DeviceKey;
  setDevice: (d: DeviceKey) => void;
  startPreview: () => void;
};

/* ---- AI ---- */

export type AiSuggestion = {
  target: string;
  styles: Record<string, string>;
  reason?: string;
};

export type AiDetails = Partial<{
  bride: string;
  groom: string;
  date: string;
  time: string;
  venue: string;
  address: string;
}>;

export type AiActions = {
  details?: AiDetails;
  page?: { backgroundColor?: string };
  edits?: { id: string; text?: string; styles?: Record<string, string> }[];
  /** New headings / text items. `after` is an element id or "end". Same anchor keeps order. */
  adds?: { type: "heading" | "text"; text: string; after?: string; styles?: Record<string, string> }[];
  /** Ids of items to delete. html blocks are never deleted by the AI. */
  removes?: string[];
};

/** Lets the AI panel read and change the design without owning its state. */
export type EditorController = {
  getDesign: () => RehearsalDesign;
  /** Returns how many things changed. */
  applySuggestion: (s: AiSuggestion) => number;
  /** Returns how many things changed. The whole batch is ONE undo step. */
  applyActions: (a: AiActions) => number;
  /** Ids of items that the last applyActions edited or added (in page order of work). */
  lastTouched: () => string[];
  /** Scrolls the item into view and flashes it, so the user can see what a change refers to. */
  focus: (id: string) => void;
  undo: () => void;
};

type Props = {
  initial: RehearsalDesign;
  signaturePath: string;
  onChange: (design: RehearsalDesign) => void;
  onAssetUploaded?: (url: string) => void;
  onOpenGuide?: () => void;
  onOpenAi?: (mode: "ideas" | "builder") => void;
  controllerRef?: React.MutableRefObject<EditorController | null>;
  topBar: (api: EditorBarApi) => React.ReactNode;
};

/* ========================================================================== */
/*  Constants & helpers                                                       */
/* ========================================================================== */

const DEVICES: Record<DeviceKey, number> = { desktop: 1200, tablet: 768, mobile: 375 };
const PLACEHOLDER_IMG = "https://placehold.co/600x400/png?text=Photo";
const genId = () => `el_${Math.random().toString(36).slice(2, 10)}`;
const SHEET_H = "50dvh";
const SHEET_HEAD = "2.75rem";
const FLASH_MS = 2200;

const REGISTRY: Record<string, WidgetDefinition> = Object.fromEntries(
  WIDGET_REGISTRY.map((w) => [w.type, w]),
);

export const DEFAULT_PAGE: PageSettings = {
  backgroundColor: "#ffffff",
  entranceAnimation: "none",
  customCss: "",
  customCode: "",
  customCodeLang: "html",
};

export const EMPTY_DESIGN: RehearsalDesign = {
  elements: [],
  pageSettings: DEFAULT_PAGE,
  coreNames: { bride: "", groom: "" },
  galleryUrls: [],
  videoUrls: [],
  musicUrls: [],
  thumbnailUrl: "",
  details: { date: "", time: "", venue: "", address: "" },
};

/** Tolerant parser for anything coming from the server or local storage. */
export function normalizeDesign(raw: unknown): RehearsalDesign | null {
  const r = raw as Rec | null;
  if (!r || typeof r !== "object" || !Array.isArray(r.elements)) return null;
  const s = (v: unknown, f = "") => (typeof v === "string" ? v : f);
  const arr = (v: unknown) =>
    Array.isArray(v) ? v.filter((x): x is string => typeof x === "string") : [];
  const ps = (r.pageSettings && typeof r.pageSettings === "object" ? r.pageSettings : {}) as Rec;
  const names = (r.coreNames ?? {}) as Rec;
  const dt = (r.details ?? {}) as Rec;

  const elements = (r.elements as Rec[])
    .filter((e) => e && typeof e.id === "string" && typeof e.type === "string")
    .map((e) => ({
      ...e,
      content: e.content && typeof e.content === "object" ? e.content : {},
      styles: e.styles && typeof e.styles === "object" ? e.styles : {},
      customCode: e.customCode ?? null,
    })) as BuilderElement[];

  return {
    elements,
    pageSettings: {
      backgroundColor: s(ps.backgroundColor, "#ffffff"),
      entranceAnimation: s(ps.entranceAnimation, "none"),
      customCss: s(ps.customCss),
      customCode: s(ps.customCode),
      customCodeLang: s(ps.customCodeLang, "html"),
    },
    coreNames: { bride: s(names.bride), groom: s(names.groom) },
    galleryUrls: arr(r.galleryUrls),
    videoUrls: arr(r.videoUrls),
    musicUrls: arr(r.musicUrls),
    thumbnailUrl: s(r.thumbnailUrl),
    details: { date: s(dt.date), time: s(dt.time), venue: s(dt.venue), address: s(dt.address) },
  };
}

const isTextEl = (e: BuilderElement) =>
  e.type === "heading" || e.type === "text" || typeof e.content?.text === "string";

const isBodyText = (e: BuilderElement) => isTextEl(e) && e.type !== "heading" && e.type !== "button";

const labelOf = (k: string) =>
  k
    .replace(/([A-Z])/g, " $1")
    .replace(/[_-]/g, " ")
    .replace(/^\w/, (c) => c.toUpperCase());

const nameOf = (e: BuilderElement) => {
  const raw = e.content?.text ?? e.content?.title ?? e.content?.name ?? "";
  const t = String(raw).replace(/\{\{[^}]*\}\}/g, "…").trim().slice(0, 28);
  return t || REGISTRY[e.type]?.name || e.type;
};

const SWATCHES = [
  "#000000", "#ffffff", "#2a1002", "#7c2d12", "#c2410c", "#f97316", "#fbbf24", "#16a34a",
  "#0f766e", "#1d4ed8", "#7e22ce", "#e11d48", "#fde68a", "#ffe4e6", "#f5f5f4",
];

const FONT_CHOICES = [
  { label: "Elegant", value: "Georgia, serif" },
  { label: "Modern", value: "ui-sans-serif, system-ui, sans-serif" },
  { label: "Classic", value: "'Times New Roman', serif" },
  { label: "Script", value: "'Brush Script MT', cursive" },
  { label: "Friendly", value: "'Trebuchet MS', sans-serif" },
];

const PALETTES = [
  { name: "Blush", bg: "#fff1f2", text: "#4c0519", accent: "#be123c" },
  { name: "Sage", bg: "#f4f7f2", text: "#1f2d1f", accent: "#3f6b3f" },
  { name: "Royal", bg: "#fdf8ee", text: "#2b1b05", accent: "#b7791f" },
  { name: "Midnight", bg: "#0f172a", text: "#e2e8f0", accent: "#fbbf24" },
  { name: "Ocean", bg: "#f0f9ff", text: "#0c2a43", accent: "#0369a1" },
  { name: "Classic", bg: "#ffffff", text: "#1c1917", accent: "#c2410c" },
];

const PADDINGS = [
  { v: "4px", label: "Tight" },
  { v: "10px", label: "Normal" },
  { v: "24px", label: "Roomy" },
  { v: "48px", label: "Extra" },
] as const;

/* ---- scroll animations ---- */

type AnimId = "none" | "fade" | "fade-up" | "fade-down" | "slide-left" | "slide-right" | "zoom" | "blur";
type AnimCfg = { type: AnimId; duration: number; delay: number };

const ANIMS: { id: AnimId; label: string; from: Rec }[] = [
  { id: "none", label: "None", from: {} },
  { id: "fade", label: "Fade in", from: { opacity: 0 } },
  { id: "fade-up", label: "Fade up", from: { opacity: 0, y: 36 } },
  { id: "fade-down", label: "Fade down", from: { opacity: 0, y: -36 } },
  { id: "slide-left", label: "Slide from left", from: { opacity: 0, x: -64 } },
  { id: "slide-right", label: "Slide from right", from: { opacity: 0, x: 64 } },
  { id: "zoom", label: "Zoom in", from: { opacity: 0, scale: 0.85 } },
  { id: "blur", label: "Blur in", from: { opacity: 0, filter: "blur(12px)" } },
];
const ANIM_MAP = Object.fromEntries(ANIMS.map((a) => [a.id, a])) as Record<AnimId, (typeof ANIMS)[number]>;

function readAnim(el: BuilderElement): AnimCfg {
  const a = (el.content?._anim ?? {}) as Rec;
  const type = (typeof a.type === "string" && a.type in ANIM_MAP ? a.type : "none") as AnimId;
  const num = (v: unknown, f: number, lo: number, hi: number) =>
    typeof v === "number" && Number.isFinite(v) ? Math.min(hi, Math.max(lo, v)) : f;
  return { type, duration: num(a.duration, 0.7, 0.2, 2), delay: num(a.delay, 0, 0, 2) };
}

function animTarget(from: Rec): Rec {
  const to: Rec = {};
  for (const k of Object.keys(from)) {
    to[k] = k === "opacity" || k === "scale" ? 1 : k === "filter" ? "blur(0px)" : 0;
  }
  return to;
}

/** Plays once, only when the item scrolls into view inside the canvas. */
function Reveal({
  anim,
  rootRef,
  replayKey,
  reduce,
  children,
}: {
  anim: AnimCfg;
  rootRef: React.RefObject<HTMLElement | null>;
  replayKey: number;
  reduce: boolean;
  children: React.ReactNode;
}) {
  if (anim.type === "none" || reduce) return <>{children}</>;
  const from = ANIM_MAP[anim.type].from;
  return (
    <motion.div
      key={`${anim.type}-${anim.duration}-${anim.delay}-${replayKey}`}
      initial={from}
      whileInView={animTarget(from)}
      viewport={{ once: true, amount: 0.15, root: rootRef as React.RefObject<Element> }}
      transition={{ duration: anim.duration, delay: anim.delay, ease: [0.22, 1, 0.36, 1] }}
    >
      {children}
    </motion.div>
  );
}

/* ---- AI style application ---- */

const toCamel = (k: string) => k.replace(/-([a-z])/g, (_, c: string) => c.toUpperCase());
const SAFE_VAL = /^[a-zA-Z0-9\s#%.,()'"+\-/]{1,80}$/;
const BAD_VAL = /url\s*\(|expression|@import|javascript|var\s*\(|\\|\/\*/i;

function toStyleMap(raw?: Record<string, string>): Record<string, string> {
  const out: Record<string, string> = {};
  for (const [k, v] of Object.entries(raw ?? {})) {
    if (typeof v !== "string") continue;
    const val = v.trim();
    if (SAFE_VAL.test(val) && !BAD_VAL.test(val)) out[toCamel(k.trim())] = val;
  }
  return out;
}

/** Merge styles and drop tablet/mobile overrides for those keys so what you see is what you get. */
function mergeStyles(e: BuilderElement, styles: Record<string, string>): BuilderElement {
  const keys = Object.keys(styles);
  if (keys.length === 0) return e;
  const s = { ...(e.styles as Record<string, string>), ...styles };
  let content = e.content;
  const r = e.content?._r as Rec | undefined;
  if (r) {
    const nr: Rec = {};
    for (const dev of Object.keys(r)) {
      const b = { ...(r[dev] ?? {}) };
      for (const k of keys) delete b[k];
      nr[dev] = b;
    }
    content = { ...e.content, _r: nr };
  }
  return { ...e, styles: s, content };
}

function matchTarget(target: string, e: BuilderElement, firstBodyId?: string): boolean {
  switch (target) {
    case "title":
      return e.type === "heading";
    case "subtitle":
      return e.id === firstBodyId;
    case "body":
      return isBodyText(e);
    case "button":
      return e.type === "button";
    case "widget":
      return !isTextEl(e) && e.type !== "button";
    case "border":
      return true;
    default:
      return false;
  }
}

/* ---- quick blocks ---- */

type QuickBlock = {
  id: string;
  type: string;
  name: string;
  hint: string;
  icon: React.ComponentType<{ className?: string }>;
  make: () => Rec;
};

const QUICK_BLOCKS: QuickBlock[] = (
  [
    { id: "heading", type: "heading", name: "Heading", hint: "A big title", icon: Type, make: () => ({}) },
    { id: "text", type: "text", name: "Paragraph", hint: "A few lines of text", icon: Pencil, make: () => ({}) },
    { id: "image", type: "image", name: "Photo", hint: "Upload your own", icon: ImageIcon, make: () => ({ src: PLACEHOLDER_IMG }) },
    { id: "couple", type: "heading", name: "Couple names", hint: "From your Details", icon: Users, make: () => ({ text: "{{names.bride}} & {{names.groom}}", _bind: "names" }) },
    { id: "date", type: "text", name: "Event date", hint: "From your Details", icon: CalendarDays, make: () => ({ text: "{{event.date}}", _bind: "event.date" }) },
    { id: "venue", type: "text", name: "Venue", hint: "From your Details", icon: MapPin, make: () => ({ text: "{{venue.name}}", _bind: "venue.name" }) },
    { id: "music", type: "audio", name: "Music", hint: "Background song", icon: Music, make: () => ({}) },
    { id: "video", type: "video", name: "Video", hint: "A short clip", icon: Video, make: () => ({}) },
  ] as QuickBlock[]
).filter((q) => !!REGISTRY[q.type]);

/* ---- inside html blocks (hero etc.): edit / replace / delete text, icons, images ---- */

type InnerKind = "text" | "image" | "bgimage" | "icon";
type InnerItem = { kind: InnerKind; node: Element; label: string };
type InnerOp =
  | { type: "text"; value: string }
  | { type: "src"; value: string }
  | { type: "remove" }
  | { type: "addText" }
  | { type: "addImage"; value: string };

const CODE_KEYS = ["code", "html", "htmlCode", "markup", "source", "content", "body"];
const HAS_TAGS = /<[a-z][\s\S]*>/i;

/** Finds which field of a block holds its html (the field name differs between templates). */
function htmlKeyOf(content: Rec | undefined): string | null {
  if (!content) return null;
  for (const k of CODE_KEYS) {
    const v = content[k];
    if (typeof v === "string" && HAS_TAGS.test(v)) return k;
  }
  for (const [k, v] of Object.entries(content)) {
    if (!k.startsWith("_") && typeof v === "string" && v.length > 20 && HAS_TAGS.test(v)) return k;
  }
  return null;
}

const ICON_CLASS = /(^|\s)(fa|fas|far|fab|fal|bi|material-icons|material-symbols-outlined|icon|lucide|ri|ti)([-\s]|$)/i;
const BG_URL = /background(?:-image)?\s*:[^;]*url\(\s*['"]?([^'")]+)['"]?\s*\)/i;
const BG_DECL = /background(?:-image)?\s*:[^;]*url\([^)]*\)[^;]*;?/i;
const SAFE_URL = /^https:\/\/[\w\-./%?=&+~:@,#]+$/i;
const ZWSP = "\u200b"; // keeps an emptied text item alive so it can still be typed into
const SKIP_TAGS = new Set(["script", "style", "noscript", "template", "head", "title", "meta", "link"]);

type Root = ParentNode & Node;
type Parsed = { root: Root; out: () => string };

/** Full documents keep their <head>, doctype and <body>; fragments keep their exact order (scripts included). */
function parseCode(code: string): Parsed {
  if (/<html[\s>]|<!doctype/i.test(code)) {
    const doc = new DOMParser().parseFromString(code, "text/html");
    return { root: doc.body, out: () => `<!DOCTYPE html>${doc.documentElement.outerHTML}` };
  }
  const t = document.createElement("template");
  t.innerHTML = code;
  const frag = t.content;
  return {
    root: frag,
    out: () => {
      const d = document.createElement("div");
      d.appendChild(frag.cloneNode(true));
      return d.innerHTML;
    },
  };
}

/**
 * Only plain html blocks can be taken apart. Blocks written as code (jsx, scripts…) depend on their exact
 * markup, so they are left alone: rewriting them would break the block.
 */
function isPlainHtml(content: Rec | undefined, _code?: string): boolean {
  const lang = String(content?.lang ?? "html").toLowerCase();
  return lang === "html" || lang === "";
}

/** Scripted blocks may count or look up their own markup, so tap-to-select markers are never injected into them. */
const hasScript = (code: string) => /<script[\s>]/i.test(code);

const textNodesOf = (n: Element) =>
  Array.from(n.childNodes).filter((c) => c.nodeType === 3 && (c.textContent ?? "").replace(/\s/g, "") !== "");

const rawText = (n: Element) =>
  textNodesOf(n)
    .map((c) => c.textContent ?? "")
    .join(" ")
    .replace(/\u200b/g, "")
    .replace(/\s*\n\s*/g, " ");

function enumerateInner(frag: Root): InnerItem[] {
  const out: InnerItem[] = [];
  for (const node of Array.from(frag.querySelectorAll("*"))) {
    const tag = node.localName;
    if (SKIP_TAGS.has(tag) || node.closest("script,style,noscript,template")) continue;
    if (tag === "svg") {
      out.push({ kind: "icon", node, label: "Icon" });
      continue;
    }
    if (node.closest("svg")) continue;
    if (tag === "img") {
      out.push({ kind: "image", node, label: node.getAttribute("alt") || "Image" });
      continue;
    }
    if (BG_URL.test(node.getAttribute("style") ?? "")) {
      out.push({ kind: "bgimage", node, label: "Background image" });
    }
    if (textNodesOf(node).length > 0) {
      out.push({ kind: "text", node, label: rawText(node).trim().slice(0, 40) || "Text" });
    } else if (
      (tag === "i" || tag === "span") &&
      ICON_CLASS.test(node.getAttribute("class") ?? "") &&
      !(node.textContent ?? "").trim()
    ) {
      out.push({ kind: "icon", node, label: "Icon" });
    }
  }
  return out;
}

function innerValue(it: InnerItem): string {
  if (it.kind === "text") return rawText(it.node);
  if (it.kind === "image") return it.node.getAttribute("src") ?? "";
  if (it.kind === "bgimage") return BG_URL.exec(it.node.getAttribute("style") ?? "")?.[1] ?? "";
  return "";
}

/** Applies one change and returns the new html, or null if nothing valid could be done. */
function editInnerHtml(code: string, idx: number, op: InnerOp): string | null {
  const parsed = parseCode(code);
  const frag = parsed.root;
  const item = enumerateInner(frag)[idx];

  if (op.type === "addText" || op.type === "addImage") {
    let created: Element;
    if (op.type === "addText") {
      created = document.createElement("p");
      created.textContent = "New text";
      created.setAttribute("style", "margin:12px 0;text-align:center;");
    } else {
      if (!SAFE_URL.test(op.value)) return null;
      created = document.createElement("img");
      created.setAttribute("src", op.value);
      created.setAttribute("alt", "");
      created.setAttribute("style", "display:block;max-width:100%;margin:12px auto;");
    }
    if (item) item.node.insertAdjacentElement("afterend", created);
    else {
      const roots = Array.from(frag.children).filter((c) => !SKIP_TAGS.has(c.localName));
      const host = roots[roots.length - 1];
      if (host) host.appendChild(created);
      else frag.appendChild(created);
    }
    return parsed.out();
  }

  if (!item) return null;
  const n = item.node;

  if (op.type === "remove") {
    if (item.kind === "text" && n.children.length > 0) textNodesOf(n).forEach((c) => c.remove());
    else if (item.kind === "bgimage") n.setAttribute("style", (n.getAttribute("style") ?? "").replace(BG_DECL, ""));
    else n.remove();
  } else if (op.type === "text") {
    if (item.kind !== "text") return null;
    const nodes = textNodesOf(n);
    const first = nodes[0];
    if (!first) return null;
    first.textContent = op.value.trim() === "" ? ZWSP : op.value;
    nodes.slice(1).forEach((c) => c.remove());
  } else {
    if (!SAFE_URL.test(op.value)) return null;
    if (item.kind === "image") {
      n.setAttribute("src", op.value);
      n.removeAttribute("srcset");
    } else if (item.kind === "bgimage") {
      n.setAttribute(
        "style",
        (n.getAttribute("style") ?? "").replace(/url\(\s*['"]?[^'")]+['"]?\s*\)/i, `url("${op.value}")`),
      );
    } else return null;
  }
  return parsed.out();
}

/** Editing-only copy of the html: tags every editable bit so a tap on the page can find it. */
function annotateInner(code: string, sel: number | null): string {
  const parsed = parseCode(code);
  const frag = parsed.root;
  enumerateInner(frag).forEach((it, i) => {
    it.node.setAttribute("data-riwa-i", String(i));
    if (i === sel) it.node.setAttribute("data-riwa-sel", "1");
  });
  const st = document.createElement("style");
  st.textContent =
    "[data-riwa-i]{cursor:pointer}[data-riwa-i]:hover{outline:2px dashed rgba(249,115,22,.7);outline-offset:2px}[data-riwa-sel]{outline:2px solid #f97316!important;outline-offset:2px}";
  frag.appendChild(st); // at the end, so nothing that counts children from the start is thrown off
  return parsed.out();
}

const INNER_META: Record<InnerKind, { name: string; icon: React.ComponentType<{ className?: string }> }> = {
  text: { name: "Text", icon: Type },
  image: { name: "Image", icon: ImageIcon },
  bgimage: { name: "Background image", icon: ImageIcon },
  icon: { name: "Icon", icon: Layers },
};

const INPUT =
  "h-11 w-full rounded-xl border border-black/[0.1] bg-white px-3 text-sm text-[#2a1002] shadow-sm outline-none transition placeholder:text-stone-400 hover:border-orange-300 focus:border-orange-500 focus-visible:ring-2 focus-visible:ring-orange-500/30";
const AREA = cn(INPUT, "h-auto py-2.5 leading-relaxed");

/* ========================================================================== */
/*  Hooks                                                                     */
/* ========================================================================== */

/** Undo / redo over the whole design (typing is coalesced into one step). */
function useHistory(initial: RehearsalDesign) {
  const [design, setDesign] = React.useState(initial);
  const cur = React.useRef(initial);
  const past = React.useRef<RehearsalDesign[]>([]);
  const future = React.useRef<RehearsalDesign[]>([]);
  const last = React.useRef<{ k: string; t: number } | null>(null);
  const [flags, setFlags] = React.useState({ undo: false, redo: false });
  const sync = React.useCallback(
    () => setFlags({ undo: past.current.length > 0, redo: future.current.length > 0 }),
    [],
  );

  const commit = React.useCallback(
    (fn: (d: RehearsalDesign) => RehearsalDesign, key?: string) => {
      const prev = cur.current;
      const next = fn(prev);
      if (next === prev) return;
      const now = Date.now();
      const l = last.current;
      const coalesce = !!key && l !== null && l.k === key && now - l.t < 700;
      last.current = key ? { k: key, t: now } : null;
      if (!coalesce) {
        past.current.push(prev);
        if (past.current.length > 100) past.current.shift();
      }
      future.current = [];
      cur.current = next;
      setDesign(next);
      sync();
    },
    [sync],
  );

  const undo = React.useCallback(() => {
    const p = past.current.pop();
    if (!p) return;
    future.current.push(cur.current);
    cur.current = p;
    last.current = null;
    setDesign(p);
    sync();
  }, [sync]);

  const redo = React.useCallback(() => {
    const f = future.current.pop();
    if (!f) return;
    past.current.push(cur.current);
    cur.current = f;
    last.current = null;
    setDesign(f);
    sync();
  }, [sync]);

  const getDesign = React.useCallback(() => cur.current, []);

  return { design, commit, undo, redo, getDesign, canUndo: flags.undo, canRedo: flags.redo };
}

function useMedia(query: string) {
  const [match, setMatch] = React.useState(false);
  React.useEffect(() => {
    const m = window.matchMedia(query);
    const on = () => setMatch(m.matches);
    on();
    m.addEventListener("change", on);
    return () => m.removeEventListener("change", on);
  }, [query]);
  return match;
}

type Uploader = ReturnType<typeof useUploader>;

function useUploader(signaturePath: string, onUploaded?: (url: string) => void) {
  const [busy, setBusy] = React.useState(0);
  const cb = React.useRef(onUploaded);
  cb.current = onUploaded;

  const upload = React.useCallback(
    async (file: File, kind: "image" | "audio" | "video"): Promise<string | null> => {
      const maxMb = { image: 10, audio: 20, video: 60 }[kind];
      if (!file.type.startsWith(`${kind}/`)) {
        toast.add({ title: "Wrong file type", description: `Please choose a ${kind} file.`, type: "error" });
        return null;
      }
      if (file.size > maxMb * 1024 * 1024) {
        toast.add({ title: "File too large", description: `Please choose a ${kind} under ${maxMb} MB.`, type: "error" });
        return null;
      }
      setBusy((n) => n + 1);
      try {
        const sigRes = await apiClient.get(signaturePath);
        const sig = sigRes.data.data;
        const fd = new FormData();
        fd.append("file", file);
        fd.append("api_key", sig.apiKey);
        fd.append("timestamp", sig.timestamp.toString());
        fd.append("signature", sig.signature);
        fd.append("folder", sig.folder);
        const res = await fetch(`https://api.cloudinary.com/v1_1/${sig.cloudName}/auto/upload`, {
          method: "POST",
          body: fd,
        });
        const json = await res.json();
        if (!res.ok || !json.secure_url) throw new Error(json?.error?.message || "Upload failed");
        try {
          cb.current?.(json.secure_url as string);
        } catch {
          /* a tracker error must never break the upload */
        }
        toast.add({ title: "Uploaded", description: `${file.name} is ready.`, type: "success" });
        return json.secure_url as string;
      } catch (e: any) {
        toast.add({ title: "Upload failed", description: e?.message ?? "Please try again.", type: "error" });
        return null;
      } finally {
        setBusy((n) => n - 1);
      }
    },
    [signaturePath],
  );

  return { upload, uploading: busy > 0 };
}

/* ========================================================================== */
/*  Small controls                                                            */
/* ========================================================================== */

function Block({ title, hint, children }: { title: string; hint?: string; children: React.ReactNode }) {
  return (
    <section className="space-y-2.5">
      <div>
        <h3 className="text-xs font-bold uppercase tracking-[0.06em] text-stone-500">{title}</h3>
        {hint && <p className="mt-0.5 text-xs leading-snug text-stone-400">{hint}</p>}
      </div>
      {children}
    </section>
  );
}

function Seg({
  value,
  options,
  onChange,
}: {
  value: string;
  options: { v: string; label: React.ReactNode; title?: string }[];
  onChange: (v: string) => void;
}) {
  return (
    <div
      className="grid gap-1 rounded-xl bg-stone-100 p-1"
      style={{ gridTemplateColumns: `repeat(${options.length}, minmax(0, 1fr))` }}
    >
      {options.map((o) => (
        <button
          key={o.v}
          type="button"
          title={o.title}
          aria-pressed={value === o.v}
          onClick={() => onChange(o.v)}
          className={cn(
            "flex h-9 items-center justify-center rounded-lg text-xs font-semibold transition",
            value === o.v ? "bg-white text-orange-600 shadow-sm" : "text-stone-500 hover:text-stone-800",
            FOCUS,
          )}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}

function ColorField({
  value,
  onChange,
  clearable,
}: {
  value: string;
  onChange: (v: string) => void;
  clearable?: boolean;
}) {
  const hex = /^#[0-9a-f]{6}$/i.test(value) ? value : "#000000";
  return (
    <div className="space-y-2">
      <div className="flex flex-wrap gap-1.5">
        {SWATCHES.map((c) => (
          <button
            key={c}
            type="button"
            aria-label={`Colour ${c}`}
            onClick={() => onChange(c)}
            style={{ backgroundColor: c }}
            className={cn(
              "size-8 rounded-full ring-1 ring-black/15 transition hover:scale-110 sm:size-7",
              value.toLowerCase() === c && "ring-2 ring-orange-500 ring-offset-2",
              FOCUS,
            )}
          />
        ))}
      </div>
      <div className="flex items-center gap-2">
        <input
          type="color"
          value={hex}
          onChange={(e) => onChange(e.target.value)}
          aria-label="Pick any colour"
          className="size-11 shrink-0 cursor-pointer rounded-xl border border-black/10 bg-white p-1"
        />
        <input className={INPUT} value={value} placeholder="#000000" onChange={(e) => onChange(e.target.value)} />
        {clearable && value && (
          <button
            type="button"
            onClick={() => onChange("")}
            className={cn("h-11 shrink-0 rounded-xl px-3 text-xs font-semibold text-stone-500 hover:bg-stone-100", FOCUS)}
          >
            Clear
          </button>
        )}
      </div>
    </div>
  );
}

function MediaPicker({
  label,
  kind,
  value,
  onChange,
  up,
}: {
  label: string;
  kind: "image" | "audio" | "video";
  value: string;
  onChange: (v: string) => void;
  up: Uploader;
}) {
  const ref = React.useRef<HTMLInputElement>(null);
  const pick = async (f?: File | null) => {
    if (!f) return;
    const u = await up.upload(f, kind);
    if (u) onChange(u);
  };
  return (
    <div className="space-y-2">
      <span className="text-xs font-semibold text-stone-600">{label}</span>
      {value && (
        <div className="relative overflow-hidden rounded-xl border border-black/10 bg-stone-50">
          {kind === "image" ? (
            <img src={value} alt="" className="h-32 w-full object-cover" />
          ) : kind === "video" ? (
            <video src={value} className="h-32 w-full object-cover" controls />
          ) : (
            <audio src={value} controls className="w-full" />
          )}
          <button
            type="button"
            onClick={() => onChange("")}
            aria-label="Remove"
            className="absolute right-1.5 top-1.5 rounded-full bg-white/95 p-1.5 shadow hover:text-red-600"
          >
            <X className="size-4" />
          </button>
        </div>
      )}
      <input
        ref={ref}
        type="file"
        hidden
        accept={`${kind}/*`}
        onChange={(e) => {
          void pick(e.target.files?.[0]);
          e.target.value = "";
        }}
      />
      <button
        type="button"
        disabled={up.uploading}
        onClick={() => ref.current?.click()}
        className={cn(
          "flex h-11 w-full items-center justify-center gap-2 rounded-xl border border-dashed border-stone-300 bg-stone-50 text-sm font-semibold text-stone-600 transition hover:border-orange-400 hover:bg-orange-50 hover:text-orange-700 disabled:opacity-60",
          FOCUS,
        )}
      >
        {up.uploading ? <Loader2 className="size-4 animate-spin" /> : <ImagePlus className="size-4" />}
        {up.uploading ? "Uploading…" : value ? `Replace ${kind}` : `Upload ${kind}`}
      </button>
    </div>
  );
}

function GalleryPicker({
  urls,
  onChange,
  up,
}: {
  urls: string[];
  onChange: (v: string[]) => void;
  up: Uploader;
}) {
  const ref = React.useRef<HTMLInputElement>(null);
  const add = async (files: FileList | null) => {
    if (!files) return;
    const added: string[] = [];
    for (const f of Array.from(files).slice(0, 12)) {
      const u = await up.upload(f, "image");
      if (u) added.push(u);
    }
    if (added.length) onChange([...urls, ...added]);
  };
  return (
    <div className="space-y-2">
      <span className="text-xs font-semibold text-stone-600">Gallery photos</span>
      <input
        ref={ref}
        type="file"
        hidden
        multiple
        accept="image/*"
        onChange={(e) => {
          void add(e.target.files);
          e.target.value = "";
        }}
      />
      <div className="grid grid-cols-4 gap-1.5">
        {urls.map((u) => (
          <div key={u} className="group relative aspect-square overflow-hidden rounded-lg border border-black/10">
            <img src={u} alt="" className="size-full object-cover" />
            <button
              type="button"
              aria-label="Remove photo"
              onClick={() => onChange(urls.filter((x) => x !== u))}
              className="absolute inset-0 grid place-items-center bg-black/45 text-white opacity-0 transition focus-visible:opacity-100 group-hover:opacity-100 max-lg:items-start max-lg:justify-items-end max-lg:bg-black/0 max-lg:p-0.5 max-lg:opacity-100"
            >
              <span className="rounded-full bg-black/60 p-1 max-lg:block lg:contents">
                <X className="size-3.5" />
              </span>
            </button>
          </div>
        ))}
        <button
          type="button"
          onClick={() => ref.current?.click()}
          disabled={up.uploading}
          aria-label="Add photos"
          className={cn(
            "grid aspect-square place-items-center rounded-lg border border-dashed border-stone-300 text-stone-400 hover:border-orange-400 hover:text-orange-500",
            FOCUS,
          )}
        >
          {up.uploading ? <Loader2 className="size-4 animate-spin" /> : <Plus className="size-5" />}
        </button>
      </div>
    </div>
  );
}

/** Rich call-to-action that hands the work to the AI builder. */
function AiCard({ title, text, onClick }: { title: string; text: string; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "flex w-full items-center gap-3 rounded-2xl border border-orange-200 bg-gradient-to-br from-orange-50 via-white to-amber-50 p-3.5 text-left shadow-sm transition hover:-translate-y-0.5 hover:border-orange-300 hover:shadow-md active:scale-[0.99]",
        FOCUS,
      )}
    >
      <span className="flex size-11 shrink-0 items-center justify-center rounded-xl bg-orange-500 text-white shadow-sm">
        <Bot className="size-5" />
      </span>
      <span className="min-w-0">
        <span className="block text-sm font-bold text-[#2a1002]">{title}</span>
        <span className="mt-0.5 block text-xs leading-snug text-stone-600">{text}</span>
      </span>
    </button>
  );
}

/* ========================================================================== */
/*  Editor                                                                    */
/* ========================================================================== */

/** Lists everything inside a template-designer html block so the user can edit, swap or delete it. */
function HtmlInnerEditor({
  code,
  canReset,
  sel,
  onSelect,
  onEdit,
  onReset,
  onOpenDetails,
  up,
}: {
  code: string;
  canReset: boolean;
  sel: number | null;
  onSelect: (i: number | null) => void;
  onEdit: (idx: number, op: InnerOp) => void;
  onReset: () => void;
  onOpenDetails: () => void;
  up: Uploader;
}) {
  const items = React.useMemo(
    () => enumerateInner(parseCode(code).root).map((it) => ({ kind: it.kind, label: it.label, value: innerValue(it) })),
    [code],
  );

  return (
    <div className="space-y-3">
      <p className="rounded-xl bg-orange-50 p-3 text-[13px] leading-snug text-orange-800">
        <b>This block is made of parts.</b> Tap any text, icon or image on the page, or pick one below, to change or delete it.
      </p>

      <div className="space-y-2 rounded-xl border border-black/[0.08] bg-stone-50/60 p-3">
        <p className="text-xs font-semibold text-stone-600">
          {sel !== null && items[sel] ? "Add something right after the open part" : "Add something at the end of this block"}
        </p>
        <button
          type="button"
          onClick={() => onEdit(sel ?? -1, { type: "addText" })}
          className={cn("flex h-11 w-full items-center justify-center gap-2 rounded-xl border border-black/10 bg-white text-sm font-semibold text-stone-700 hover:border-orange-300", FOCUS)}
        >
          <Plus className="size-4" /> Add text
        </button>
        <MediaPicker
          label="Add an image"
          kind="image"
          value=""
          onChange={(u) => u && onEdit(sel ?? -1, { type: "addImage", value: u })}
          up={up}
        />
      </div>

      {items.length === 0 && <p className="py-3 text-center text-xs text-stone-400">Nothing editable was found in this block.</p>}

      <ul className="space-y-1.5">
        {items.map((it, i) => {
          const M = INNER_META[it.kind];
          const open = sel === i;
          const bound = it.kind === "text" && it.value.includes("{{");
          return (
            <li
              key={i}
              className={cn(
                "rounded-xl border bg-white transition",
                open ? "border-orange-400 ring-1 ring-orange-300" : "border-black/[0.08] hover:border-orange-300",
              )}
            >
              <div className="flex items-center gap-1">
                <button
                  type="button"
                  onClick={() => onSelect(open ? null : i)}
                  aria-expanded={open}
                  className={cn("flex min-h-11 min-w-0 flex-1 items-center gap-2.5 rounded-xl px-3 text-left text-sm font-medium text-stone-700", FOCUS)}
                >
                  <M.icon className="size-4 shrink-0 text-stone-400" />
                  <span className="min-w-0 flex-1 truncate">
                    {it.kind === "text" ? it.label : M.name}
                  </span>
                  <ChevronDown className={cn("size-4 shrink-0 text-stone-400 transition-transform", open && "rotate-180")} />
                </button>
                <button
                  type="button"
                  aria-label={`Delete this ${M.name.toLowerCase()}`}
                  title="Delete"
                  onClick={() => onEdit(i, { type: "remove" })}
                  className={cn("mr-1 flex size-10 shrink-0 items-center justify-center rounded-lg text-stone-400 hover:bg-red-50 hover:text-red-600", FOCUS)}
                >
                  <Trash2 className="size-4" />
                </button>
              </div>

              {open && (
                <div className="space-y-2 border-t border-black/[0.06] p-3">
                  {it.kind === "text" &&
                    (bound ? (
                      <div className="space-y-2">
                        <p className="text-[13px] leading-snug text-stone-600">
                          This text comes from your <b>Details</b> (names, date, venue). Change it there and it updates here.
                        </p>
                        <button
                          type="button"
                          onClick={onOpenDetails}
                          className={cn("h-10 w-full rounded-lg bg-orange-500 text-sm font-semibold text-white hover:bg-orange-600", FOCUS)}
                        >
                          Open Details
                        </button>
                      </div>
                    ) : (
                      <textarea
                        rows={2}
                        aria-label="Text"
                        className={AREA}
                        value={it.value}
                        onChange={(e) => onEdit(i, { type: "text", value: e.target.value })}
                      />
                    ))}

                  {(it.kind === "image" || it.kind === "bgimage") && (
                    <MediaPicker
                      label={it.kind === "bgimage" ? "Background image" : "Image"}
                      kind="image"
                      value={it.value}
                      onChange={(u) => onEdit(i, u ? { type: "src", value: u } : { type: "remove" })}
                      up={up}
                    />
                  )}

                  {it.kind === "icon" && (
                    <p className="text-[13px] leading-snug text-stone-500">
                      Icons can’t be redrawn here, but you can delete this one with the bin button.
                    </p>
                  )}
                </div>
              )}
            </li>
          );
        })}
      </ul>

      {canReset && (
        <button
          type="button"
          onClick={onReset}
          className={cn("flex h-11 w-full items-center justify-center gap-2 rounded-xl border border-black/10 bg-white text-sm font-semibold text-stone-700 hover:border-orange-300", FOCUS)}
        >
          <Undo2 className="size-4" /> Put this block back to the original
        </button>
      )}
    </div>
  );
}

type Tab = "edit" | "add" | "details" | "look";

const TABS: { id: Tab; label: string; icon: React.ComponentType<{ className?: string }> }[] = [
  { id: "edit", label: "Edit", icon: Pencil },
  { id: "add", label: "Add", icon: Plus },
  { id: "details", label: "Details", icon: Users },
  { id: "look", label: "Look", icon: Palette },
];

export function RehearsalEditor({
  initial,
  signaturePath,
  onChange,
  onAssetUploaded,
  onOpenGuide,
  onOpenAi,
  controllerRef,
  topBar,
}: Props) {
  const { design, commit, undo, redo, getDesign, canUndo, canRedo } = useHistory(initial);
  const up = useUploader(signaturePath, onAssetUploaded);
  const isDesktop = useMedia("(min-width: 1024px)");
  const reduce = !!useReducedMotion();

  const [device, setDevice] = React.useState<DeviceKey>("desktop");
  const [preview, setPreview] = React.useState(false);
  const [tab, setTab] = React.useState<Tab>("edit");
  const [sheet, setSheet] = React.useState(false);
  const [selectedId, setSelectedId] = React.useState<string | null>(null);
  const [moreOpen, setMoreOpen] = React.useState(false);
  const [moreQuery, setMoreQuery] = React.useState("");
  const [replay, setReplay] = React.useState(0);
  const [flashId, setFlashId] = React.useState<string | null>(null);
  /** Which part inside an html block is open (tied to the block's id so it resets on its own). */
  const [innerSel, setInnerSel] = React.useState<{ id: string; idx: number } | null>(null);
  const annCache = React.useRef(new Map<string, string>());

  const canvasRef = React.useRef<HTMLElement | null>(null);
  const panelRef = React.useRef<HTMLDivElement | null>(null);
  const flashTimer = React.useRef<number | null>(null);
  const touchedRef = React.useRef<string[]>([]);

  /* ---- tell the parent about every change (not the initial render) ---- */
  const onChangeRef = React.useRef(onChange);
  onChangeRef.current = onChange;
  const first = React.useRef(true);
  React.useEffect(() => {
    if (first.current) {
      first.current = false;
      return;
    }
    onChangeRef.current(design);
  }, [design]);

  /* ---- pick a sensible device for this screen ---- */
  React.useEffect(() => {
    const w = window.innerWidth;
    setDevice(w < 768 ? "mobile" : w < 1100 ? "tablet" : "desktop");
    const onResize = () => {
      if (window.innerWidth < 768) setDevice("mobile");
    };
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, []);

  React.useEffect(
    () => () => {
      if (flashTimer.current) window.clearTimeout(flashTimer.current);
    },
    [],
  );

  const els = design.elements;
  const selected = els.find((e) => e.id === selectedId) ?? null;

  /* ---- panel always starts at the top when you switch item or tab ---- */
  React.useEffect(() => {
    panelRef.current?.scrollTo({ top: 0 });
  }, [tab, selectedId]);

  /* ---- data used to fill dynamic (bound) widgets ---- */
  const data = React.useMemo<InvitationData>(
    () =>
      normalizeData({
        names: { bride: design.coreNames.bride || "Bride", groom: design.coreNames.groom || "Groom" },
        title: "Invitation",
        event: { date: design.details.date || "2026-12-12", time: design.details.time || "18:00" },
        venue: {
          name: design.details.venue || "Grand Ballroom",
          address: design.details.address || "Main Boulevard, Lahore",
          mapUrl: "",
        },
        thumbnail: design.thumbnailUrl || PLACEHOLDER_IMG,
        gallery: design.galleryUrls.length ? design.galleryUrls : [PLACEHOLDER_IMG, PLACEHOLDER_IMG, PLACEHOLDER_IMG],
        videos: design.videoUrls,
        music: design.musicUrls,
        slots: {},
      }),
    [design],
  );

  /* ---- mutations ---- */
  const patchEl = (id: string, fn: (e: BuilderElement) => BuilderElement, key?: string) =>
    commit((d) => ({ ...d, elements: d.elements.map((e) => (e.id === id ? fn(e) : e)) }), key);

  const setContent = (id: string, k: string, v: unknown) =>
    patchEl(id, (e) => ({ ...e, content: { ...e.content, [k]: v } }), `c:${id}:${k}`);

  /** Edits the base style and clears tablet/mobile overrides so what you see is what you get. */
  const setStyle = (id: string, k: string, v: string) =>
    patchEl(
      id,
      (e) => {
        const s = { ...e.styles } as Record<string, string>;
        if (!v) delete s[k];
        else s[k] = v;
        let content = e.content;
        const r = e.content?._r as Rec | undefined;
        if (r) {
          const nr: Rec = {};
          for (const dev of Object.keys(r)) {
            const b = { ...(r[dev] ?? {}) };
            delete b[k];
            nr[dev] = b;
          }
          content = { ...e.content, _r: nr };
        }
        return { ...e, styles: s, content };
      },
      `s:${id}:${k}`,
    );

  const setAnim = (el: BuilderElement, patch: Partial<AnimCfg>) => {
    const next = { ...readAnim(el), ...patch };
    setContent(el.id, "_anim", next.type === "none" ? undefined : next);
  };

  const animateAll = (type: AnimId) => {
    commit((d) => ({
      ...d,
      elements: d.elements.map((e, i) => ({
        ...e,
        content: {
          ...e.content,
          _anim: type === "none" ? undefined : { type, duration: 0.7, delay: Math.min(i * 0.08, 0.6) },
        },
      })),
    }));
    setReplay((n) => n + 1);
    canvasRef.current?.scrollTo({ top: 0, behavior: "smooth" });
  };

  const replayAnimations = () => {
    setReplay((n) => n + 1);
    canvasRef.current?.scrollTo({ top: 0, behavior: "smooth" });
  };

  const setPage = (p: Partial<PageSettings>) =>
    commit((d) => ({ ...d, pageSettings: { ...d.pageSettings, ...p } }), `p:${Object.keys(p).join()}`);
  const setNames = (p: Partial<RehearsalDesign["coreNames"]>) =>
    commit((d) => ({ ...d, coreNames: { ...d.coreNames, ...p } }), `n:${Object.keys(p).join()}`);
  const setDetails = (p: Partial<EventDetails>) =>
    commit((d) => ({ ...d, details: { ...d.details, ...p } }), `d:${Object.keys(p).join()}`);
  const setMedia = (p: Partial<Pick<RehearsalDesign, "galleryUrls" | "videoUrls" | "musicUrls" | "thumbnailUrl">>) =>
    commit((d) => ({ ...d, ...p }));

  const select = (id: string | null) => {
    setSelectedId(id);
    if (id) {
      setTab("edit");
      if (!isDesktop) setSheet(true);
    }
  };

  const makeEl = (type: string, content: Rec): BuilderElement => {
    const w = REGISTRY[type];
    return {
      id: genId(),
      type,
      content: { ...structuredClone(w?.defaultContent ?? {}), ...content },
      styles: { margin: "0px", padding: "10px", ...(w?.defaultStyles ?? {}) } as Record<string, string>,
      customCode: null,
    } as BuilderElement;
  };

  const addBlock = (type: string, content: Rec = {}) => {
    if (type === "html") return; // never offered to rehearsal users
    const el = makeEl(type, content);
    const at = selectedId ? els.findIndex((e) => e.id === selectedId) + 1 : els.length;
    commit((d) => {
      const n = [...d.elements];
      n.splice(at, 0, el);
      return { ...d, elements: n };
    });
    select(el.id);
    requestAnimationFrame(() =>
      document.getElementById(`el-${el.id}`)?.scrollIntoView({ block: "center", behavior: "smooth" }),
    );
  };

  const removeEl = (id: string) => {
    commit((d) => ({ ...d, elements: d.elements.filter((e) => e.id !== id) }));
    setSelectedId(null);
  };

  const duplicateEl = (id: string) => {
    const i = els.findIndex((e) => e.id === id);
    const src = els[i];
    if (i < 0 || !src || src.type === "html") return;
    const copy = { ...structuredClone(src), id: genId() } as BuilderElement;
    commit((d) => {
      const n = [...d.elements];
      n.splice(i + 1, 0, copy);
      return { ...d, elements: n };
    });
    setSelectedId(copy.id);
  };

  const moveEl = (id: string, dir: -1 | 1) =>
    commit((d) => {
      const i = d.elements.findIndex((e) => e.id === id);
      const j = i + dir;
      if (i < 0 || j < 0 || j >= d.elements.length) return d;
      const n = [...d.elements];
      const a = n[i];
      const b = n[j];
      if (!a || !b) return d;
      n[i] = b;
      n[j] = a;
      return { ...d, elements: n };
    });

  /** Change, swap or delete one part inside an html block. The original is kept so it can be restored. */
  const editInner = (id: string, idx: number, op: InnerOp) => {
    const cur = getDesign().elements.find((e) => e.id === id);
    const key = htmlKeyOf(cur?.content);
    if (!cur || !key) return;
    const code = cur.content[key] as string;
    if (!isPlainHtml(cur.content, code)) return;
    const next = editInnerHtml(code, idx, op);
    if (next === null) {
      if (op.type === "src" || op.type === "addImage")
        toast.add({ title: "Can’t use that image", description: "Please upload a different one.", type: "error" });
      return;
    }
    patchEl(
      id,
      (e) => ({
        ...e,
        content: {
          ...e.content,
          [key]: next,
          _origCode: e.content?._origCode ?? e.content?.[key],
          _origKey: e.content?._origKey ?? key,
        },
      }),
      op.type === "text" ? `h:${id}:${idx}` : undefined,
    );
    if (op.type === "remove") setInnerSel(null);
  };

  const resetInner = (id: string) => {
    patchEl(id, (e) => {
      const { _origCode, _origKey, ...rest } = (e.content ?? {}) as Rec;
      return typeof _origCode === "string" && typeof _origKey === "string"
        ? { ...e, content: { ...rest, [_origKey]: _origCode } }
        : e;
    });
    setInnerSel(null);
  };

  /** Editing-only html with every editable part tagged, cached so typing stays fast. */
  const annotated = (code: string, sel: number | null) => {
    const key = `${sel ?? "-"}|${code}`;
    const hit = annCache.current.get(key);
    if (hit !== undefined) return hit;
    let out = code;
    try {
      out = annotateInner(code, sel);
    } catch {
      /* fall back to the plain html */
    }
    if (annCache.current.size > 30) annCache.current.clear();
    annCache.current.set(key, out);
    return out;
  };

  const toggleHidden = (id: string) =>
    patchEl(id, (e) => ({ ...e, content: { ...e.content, _hidden: !e.content?._hidden } }));

  const applyPalette = (p: (typeof PALETTES)[number]) =>
    commit((d) => ({
      ...d,
      pageSettings: { ...d.pageSettings, backgroundColor: p.bg },
      elements: d.elements.map((e) => {
        if (e.type === "button") return { ...e, styles: { ...e.styles, backgroundColor: p.accent, color: "#ffffff" } };
        if (!isTextEl(e)) return e;
        return { ...e, styles: { ...e.styles, color: e.type === "heading" ? p.accent : p.text } };
      }),
    }));

  const applyToAllText = (k: "color" | "fontFamily", v: string) =>
    commit((d) => ({
      ...d,
      elements: d.elements.map((e) => (isTextEl(e) ? { ...e, styles: { ...e.styles, [k]: v } } : e)),
    }));

  /* ---- focus: scroll to an item and flash it (used by the AI review card) ---- */
  const focusEl = (id: string) => {
    if (!getDesign().elements.some((e) => e.id === id)) return;
    setFlashId(id);
    if (flashTimer.current) window.clearTimeout(flashTimer.current);
    flashTimer.current = window.setTimeout(() => setFlashId(null), FLASH_MS);
    // Wait a beat so a freshly added item has rendered.
    window.setTimeout(() => {
      document
        .getElementById(`el-${id}`)
        ?.scrollIntoView({ block: "center", behavior: reduce ? "auto" : "smooth" });
    }, 60);
  };

  /* ---- AI controller (one undo step per call) ---- */
  const applySuggestion = (s: AiSuggestion): number => {
    const styles = toStyleMap(s.styles);
    if (Object.keys(styles).length === 0) return 0;

    if (s.target === "background") {
      const v = styles.backgroundColor ?? styles.background;
      if (!v) return 0;
      commit((d) => ({ ...d, pageSettings: { ...d.pageSettings, backgroundColor: v } }));
      return 1;
    }

    let n = 0;
    commit((d) => {
      const firstBodyId = d.elements.find(isBodyText)?.id;
      const elements = d.elements.map((e) => {
        if (e.type === "html" || !matchTarget(s.target, e, firstBodyId)) return e;
        n++;
        return mergeStyles(e, styles);
      });
      return n > 0 ? { ...d, elements } : d;
    });
    return n;
  };

  const applyActions = (a: AiActions): number => {
    let n = 0;
    const touched: string[] = [];

    commit((d) => {
      let next = d;

      /* details */
      if (a.details) {
        const names = { ...next.coreNames };
        const details = { ...next.details };
        const put = (v: unknown) => (typeof v === "string" && v.trim() ? v.trim() : null);
        const b = put(a.details.bride);
        const g = put(a.details.groom);
        if (b) { names.bride = b; n++; }
        if (g) { names.groom = g; n++; }
        for (const k of ["date", "time", "venue", "address"] as const) {
          const v = put(a.details[k]);
          if (v) { details[k] = v; n++; }
        }
        next = { ...next, coreNames: names, details };
      }

      /* page background */
      const bg = a.page?.backgroundColor;
      if (typeof bg === "string" && SAFE_VAL.test(bg) && !BAD_VAL.test(bg)) {
        next = { ...next, pageSettings: { ...next.pageSettings, backgroundColor: bg } };
        n++;
      }

      /* edits to existing items */
      if (a.edits?.length) {
        const map = new Map(a.edits.map((e) => [e.id, e]));
        next = {
          ...next,
          elements: next.elements.map((el) => {
            const ed = map.get(el.id);
            if (!ed || el.type === "html") return el;
            let out = el;
            const st = toStyleMap(ed.styles);
            if (Object.keys(st).length) out = mergeStyles(out, st);
            if (
              typeof ed.text === "string" &&
              ed.text.trim() &&
              typeof el.content?.text === "string" &&
              !el.content?._bind
            ) {
              out = { ...out, content: { ...out.content, text: ed.text } };
            }
            if (out !== el) {
              n++;
              touched.push(el.id);
            }
            return out;
          }),
        };
      }

      /* new items (done before removes, so an anchor that is also removed still works) */
      if (a.adds?.length) {
        const list = [...next.elements];
        const lastByAnchor = new Map<string, string>();
        for (const add of a.adds) {
          if ((add.type !== "heading" && add.type !== "text") || !add.text?.trim()) continue;
          const key = add.after && add.after !== "end" ? add.after : "end";
          const el = makeEl(add.type, { text: add.text.trim() });
          el.styles = { ...(el.styles as Record<string, string>), ...toStyleMap(add.styles) } as typeof el.styles;
          const anchorId = lastByAnchor.get(key) ?? (key === "end" ? null : key);
          let at = anchorId ? list.findIndex((e) => e.id === anchorId) + 1 : list.length;
          if (at === 0) at = list.length; // unknown anchor: put it at the end
          list.splice(at, 0, el);
          lastByAnchor.set(key, el.id);
          touched.push(el.id);
          n++;
        }
        next = { ...next, elements: list };
      }

      /* removals (the AI never deletes html blocks) */
      if (a.removes?.length) {
        const ids = new Set(a.removes);
        const kept = next.elements.filter((e) => !(ids.has(e.id) && e.type !== "html"));
        const removed = next.elements.length - kept.length;
        if (removed > 0) {
          n += removed;
          next = { ...next, elements: kept };
        }
      }

      return n > 0 ? next : d;
    });

    touchedRef.current = touched;
    if (selectedId && a.removes?.includes(selectedId)) setSelectedId(null);
    return n;
  };

  React.useEffect(() => {
    if (!controllerRef) return;
    controllerRef.current = {
      getDesign,
      applySuggestion,
      applyActions,
      lastTouched: () => touchedRef.current,
      focus: focusEl,
      undo,
    };
  });
  React.useEffect(
    () => () => {
      if (controllerRef) controllerRef.current = null;
    },
    [controllerRef],
  );

  /* ---- keyboard ---- */
  React.useEffect(() => {
    const h = (e: KeyboardEvent) => {
      const t = e.target as HTMLElement;
      const typing = /input|textarea|select/i.test(t.tagName) || t.isContentEditable;
      const mod = e.ctrlKey || e.metaKey;
      if (e.key === "Escape") {
        setPreview(false);
        setSelectedId(null);
        return;
      }
      if (typing) return;
      if (mod && e.key.toLowerCase() === "z") {
        e.preventDefault();
        if (e.shiftKey) redo();
        else undo();
      } else if (mod && e.key.toLowerCase() === "y") {
        e.preventDefault();
        redo();
      } else if (mod && e.key.toLowerCase() === "d" && selectedId) {
        e.preventDefault();
        duplicateEl(selectedId);
      } else if ((e.key === "Delete" || e.key === "Backspace") && selectedId) {
        e.preventDefault();
        removeEl(selectedId);
      }
    };
    window.addEventListener("keydown", h);
    return () => window.removeEventListener("keydown", h);
  }); // re-bound each render on purpose: handlers read fresh state

  /* ====================================================================== */
  /*  Panels                                                                */
  /* ====================================================================== */

  const renderOutline = () => (
    <div className="space-y-4 p-4">
      <div className="rounded-xl bg-orange-50 p-3 text-[13px] leading-snug text-orange-800">
        <b>Tap anything on the page</b> to change it. Or pick a section below.
      </div>
      {onOpenAi && (
        <AiCard
          title="Let the AI builder do it"
          text="Ask it to add, change or delete things. You approve every change before it happens."
          onClick={() => onOpenAi("builder")}
        />
      )}
      {els.length === 0 && (
        <p className="py-6 text-center text-sm text-stone-400">
          Your page is empty. Open the <b>Add</b> tab to put something on it.
        </p>
      )}
      <ul className="space-y-1.5">
        {els.map((e, i) => {
          const Icon = REGISTRY[e.type]?.icon ?? Layers;
          const anim = readAnim(e).type !== "none";
          return (
            <li key={e.id} className="flex items-center gap-1.5">
              <button
                type="button"
                onClick={() => select(e.id)}
                className={cn(
                  "flex h-11 min-w-0 flex-1 items-center gap-2.5 rounded-xl border border-black/[0.08] bg-white px-3 text-left text-sm font-medium text-stone-700 transition hover:border-orange-300",
                  e.content?._hidden && "opacity-50",
                  FOCUS,
                )}
              >
                <Icon className="size-4 shrink-0 text-stone-400" />
                <span className="truncate">{nameOf(e)}</span>
                {anim && <Play className="ml-auto size-3.5 shrink-0 text-orange-500" aria-label="Has animation" />}
              </button>
              <button
                type="button"
                aria-label="Move up"
                disabled={i === 0}
                onClick={() => moveEl(e.id, -1)}
                className={cn("flex size-11 items-center justify-center rounded-xl text-stone-500 hover:bg-stone-100 disabled:opacity-30", FOCUS)}
              >
                <ArrowUp className="size-4" />
              </button>
              <button
                type="button"
                aria-label="Move down"
                disabled={i === els.length - 1}
                onClick={() => moveEl(e.id, 1)}
                className={cn("flex size-11 items-center justify-center rounded-xl text-stone-500 hover:bg-stone-100 disabled:opacity-30", FOCUS)}
              >
                <ArrowDown className="size-4" />
              </button>
            </li>
          );
        })}
      </ul>
    </div>
  );

  const renderEdit = () => {
    if (!selected) return renderOutline();
    const el = selected;
    const id = el.id;
    const st = (k: string) => String((el.styles as Rec)[k] ?? "");
    const bind = typeof el.content?._bind === "string" ? (el.content._bind as string) : "";
    const fromDetails =
      bind === "names" || bind.startsWith("names.") || bind.startsWith("event.") || bind.startsWith("venue.");
    const textLike = isTextEl(el);
    const isImage = el.type === "image";
    const isHtml = el.type === "html";
    const Icon = REGISTRY[el.type]?.icon ?? Layers;
    const anim = readAnim(el);

    const size = parseInt(st("fontSize"), 10) || (el.type === "heading" ? 36 : 16);
    const bold = (parseInt(st("fontWeight"), 10) || 400) >= 600;
    const italic = st("fontStyle") === "italic";

    const mediaKeys = Object.keys(el.content ?? {}).filter((k) => /^src\d*$/.test(k) || k === "poster" || k === "image");
    if ((el.type === "image" || el.type === "audio" || el.type === "video") && !mediaKeys.includes("src"))
      mediaKeys.unshift("src");
    const skip = new Set(["text", "code", "lang", "tag", "icon", ...mediaKeys]);
    const extraKeys = Object.keys(el.content ?? {}).filter(
      (k) => !k.startsWith("_") && !skip.has(k) && typeof el.content[k] === "string",
    );

    return (
      <div className="space-y-6 p-4">
        <div className="flex items-center justify-between gap-2">
          <div className="flex min-w-0 items-center gap-2 text-sm font-bold text-[#2a1002]">
            <span className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-orange-100 text-orange-600">
              <Icon className="size-4" />
            </span>
            <span className="truncate">{REGISTRY[el.type]?.name ?? el.type}</span>
          </div>
          <button
            type="button"
            onClick={() => setSelectedId(null)}
            className={cn("rounded-lg px-2.5 py-1.5 text-xs font-semibold text-stone-500 hover:bg-stone-100", FOCUS)}
          >
            Done
          </button>
        </div>

        {isHtml &&
          htmlKeyOf(el.content) !== null &&
          !isPlainHtml(el.content, String(el.content[htmlKeyOf(el.content) as string])) && (
            <p className="rounded-xl bg-stone-100 p-3 text-[13px] leading-snug text-stone-600">
              This block is written in a code language other than html, so taking it apart here could break it. You can
              move, hide, animate or delete the whole block.
            </p>
          )}
        {isHtml &&
          htmlKeyOf(el.content) !== null &&
          isPlainHtml(el.content, String(el.content[htmlKeyOf(el.content) as string])) && (
          <HtmlInnerEditor
            code={String(el.content[htmlKeyOf(el.content) as string])}
            canReset={typeof el.content?._origCode === "string"}
            sel={innerSel?.id === id ? innerSel.idx : null}
            onSelect={(i) => setInnerSel(i === null ? null : { id, idx: i })}
            onEdit={(i, op) => editInner(id, i, op)}
            onReset={() => resetInner(id)}
            onOpenDetails={() => setTab("details")}
            up={up}
          />
        )}
        {isHtml && htmlKeyOf(el.content) === null && (
          <p className="rounded-xl bg-stone-100 p-3 text-[13px] leading-snug text-stone-600">
            I couldn’t find the html inside this block, so its parts can’t be edited. Fields on this block:{" "}
            <b>{Object.keys(el.content ?? {}).join(", ") || "none"}</b>
            {el.customCode ? <> (it also has custom code attached)</> : null}.
          </p>
        )}

        {/* ---- content ---- */}
        {fromDetails && (
          <div className="space-y-2 rounded-xl border border-orange-100 bg-orange-50/60 p-3">
            <p className="text-[13px] leading-snug text-orange-900">
              This text comes from your <b>Details</b> (names, date, venue). Change it there and it updates everywhere.
            </p>
            <button
              type="button"
              onClick={() => setTab("details")}
              className={cn("h-10 w-full rounded-lg bg-orange-500 text-sm font-semibold text-white hover:bg-orange-600", FOCUS)}
            >
              Open Details
            </button>
          </div>
        )}

        {!fromDetails && typeof el.content?.text === "string" && (
          <Block title="Your text">
            <textarea
              rows={3}
              className={AREA}
              value={String(el.content.text)}
              onChange={(e) => setContent(id, "text", e.target.value)}
            />
          </Block>
        )}

        {bind === "thumbnail" && (
          <MediaPicker label="Cover photo" kind="image" value={design.thumbnailUrl} onChange={(u) => setMedia({ thumbnailUrl: u })} up={up} />
        )}
        {(bind === "gallery" || /^gallery\.\d+$/.test(bind)) && (
          <GalleryPicker urls={design.galleryUrls} onChange={(u) => setMedia({ galleryUrls: u })} up={up} />
        )}
        {bind === "music.0" && (
          <MediaPicker label="Music" kind="audio" value={design.musicUrls[0] ?? ""} onChange={(u) => setMedia({ musicUrls: u ? [u] : [] })} up={up} />
        )}
        {bind === "videos.0" && (
          <MediaPicker label="Video" kind="video" value={design.videoUrls[0] ?? ""} onChange={(u) => setMedia({ videoUrls: u ? [u] : [] })} up={up} />
        )}

        {!isHtml &&
          bind !== "thumbnail" &&
          bind !== "music.0" &&
          bind !== "videos.0" &&
          bind !== "gallery" &&
          mediaKeys.map((k) => (
            <MediaPicker
              key={k}
              label={k === "src" ? (el.type === "audio" ? "Music" : el.type === "video" ? "Video" : "Photo") : labelOf(k)}
              kind={el.type === "audio" && k === "src" ? "audio" : el.type === "video" && k === "src" ? "video" : "image"}
              value={String(el.content?.[k] ?? "")}
              onChange={(u) => setContent(id, k, u)}
              up={up}
            />
          ))}

        {!isHtml &&
          extraKeys.slice(0, 6).map((k) => (
            <Block key={k} title={labelOf(k)}>
              <input className={INPUT} value={String(el.content[k] ?? "")} onChange={(e) => setContent(id, k, e.target.value)} />
            </Block>
          ))}

        {/* ---- text look ---- */}
        {textLike && (
          <>
            <Block title="Text size">
              <div className="flex items-center gap-3">
                <input
                  type="range"
                  min={10}
                  max={120}
                  value={size}
                  onChange={(e) => setStyle(id, "fontSize", `${e.target.value}px`)}
                  className="h-11 w-full accent-orange-500"
                  aria-label="Text size"
                />
                <span className="w-12 shrink-0 text-right text-xs font-semibold tabular-nums text-stone-500">{size}px</span>
              </div>
            </Block>
            <Block title="Style">
              <div className="grid grid-cols-[1fr_auto_auto] gap-2">
                <Seg
                  value={st("textAlign") || "left"}
                  onChange={(v) => setStyle(id, "textAlign", v)}
                  options={[
                    { v: "left", label: <AlignLeft className="size-4" />, title: "Left" },
                    { v: "center", label: <AlignCenter className="size-4" />, title: "Centre" },
                    { v: "right", label: <AlignRight className="size-4" />, title: "Right" },
                  ]}
                />
                <button
                  type="button"
                  aria-pressed={bold}
                  aria-label="Bold"
                  onClick={() => setStyle(id, "fontWeight", bold ? "400" : "700")}
                  className={cn("size-11 rounded-xl border text-stone-600", bold ? "border-orange-400 bg-orange-50 text-orange-600" : "border-black/10 bg-white", FOCUS)}
                >
                  <Bold className="mx-auto size-4" />
                </button>
                <button
                  type="button"
                  aria-pressed={italic}
                  aria-label="Italic"
                  onClick={() => setStyle(id, "fontStyle", italic ? "normal" : "italic")}
                  className={cn("size-11 rounded-xl border text-stone-600", italic ? "border-orange-400 bg-orange-50 text-orange-600" : "border-black/10 bg-white", FOCUS)}
                >
                  <Italic className="mx-auto size-4" />
                </button>
              </div>
            </Block>
            <Block title="Font">
              <div className="grid grid-cols-2 gap-1.5">
                {FONT_CHOICES.map((f) => (
                  <button
                    key={f.value}
                    type="button"
                    aria-pressed={st("fontFamily") === f.value}
                    onClick={() => setStyle(id, "fontFamily", f.value)}
                    style={{ fontFamily: f.value }}
                    className={cn(
                      "h-11 rounded-xl border text-sm transition",
                      st("fontFamily") === f.value ? "border-orange-400 bg-orange-50 text-orange-700" : "border-black/10 bg-white text-stone-700 hover:border-orange-300",
                      FOCUS,
                    )}
                  >
                    {f.label}
                  </button>
                ))}
              </div>
            </Block>
            <Block title="Text colour">
              <ColorField value={st("color")} onChange={(v) => setStyle(id, "color", v)} clearable />
            </Block>
          </>
        )}

        {isImage && (
          <>
            <Block title="Photo size">
              <Seg
                value={st("width") || "100%"}
                onChange={(v) => setStyle(id, "width", v)}
                options={[
                  { v: "40%", label: "Small" },
                  { v: "70%", label: "Medium" },
                  { v: "100%", label: "Full" },
                ]}
              />
            </Block>
            <Block title="Corners">
              <Seg
                value={st("borderRadius") || "0px"}
                onChange={(v) => setStyle(id, "borderRadius", v)}
                options={[
                  { v: "0px", label: "Square" },
                  { v: "16px", label: "Soft" },
                  { v: "999px", label: "Round" },
                ]}
              />
            </Block>
          </>
        )}

        {/* ---- box ---- */}
        <Block title="Space around">
          <Seg
            value={st("padding") || "10px"}
            onChange={(v) => setStyle(id, "padding", v)}
            options={PADDINGS.map((p) => ({ v: p.v, label: p.label }))}
          />
        </Block>
        <Block title="Background colour" hint="Optional. Fills the area behind this item.">
          <ColorField value={st("backgroundColor")} onChange={(v) => setStyle(id, "backgroundColor", v)} clearable />
        </Block>

        {/* ---- scroll animation ---- */}
        <Block title="Scroll animation" hint="Plays once, when this item scrolls into view for your guests.">
          <div className="grid grid-cols-2 gap-1.5">
            {ANIMS.map((a) => (
              <button
                key={a.id}
                type="button"
                aria-pressed={anim.type === a.id}
                onClick={() => setAnim(el, { type: a.id })}
                className={cn(
                  "h-11 rounded-xl border px-2 text-xs font-semibold transition",
                  anim.type === a.id
                    ? "border-orange-400 bg-orange-50 text-orange-700"
                    : "border-black/10 bg-white text-stone-700 hover:border-orange-300",
                  FOCUS,
                )}
              >
                {a.label}
              </button>
            ))}
          </div>
          {anim.type !== "none" && (
            <div className="space-y-2 rounded-xl bg-stone-50 p-3">
              <label className="flex items-center gap-3 text-xs font-semibold text-stone-600">
                <span className="w-14 shrink-0">Speed</span>
                <input
                  type="range"
                  min={0.2}
                  max={2}
                  step={0.1}
                  value={anim.duration}
                  onChange={(e) => setAnim(el, { duration: Number(e.target.value) })}
                  className="h-9 w-full accent-orange-500"
                />
                <span className="w-9 shrink-0 text-right tabular-nums text-stone-500">{anim.duration.toFixed(1)}s</span>
              </label>
              <label className="flex items-center gap-3 text-xs font-semibold text-stone-600">
                <span className="w-14 shrink-0">Wait</span>
                <input
                  type="range"
                  min={0}
                  max={2}
                  step={0.1}
                  value={anim.delay}
                  onChange={(e) => setAnim(el, { delay: Number(e.target.value) })}
                  className="h-9 w-full accent-orange-500"
                />
                <span className="w-9 shrink-0 text-right tabular-nums text-stone-500">{anim.delay.toFixed(1)}s</span>
              </label>
              <button
                type="button"
                onClick={() => {
                  document.getElementById(`el-${id}`)?.scrollIntoView({ block: "center", behavior: "smooth" });
                  setReplay((n) => n + 1);
                }}
                className={cn("flex h-10 w-full items-center justify-center gap-2 rounded-lg bg-white text-xs font-semibold text-stone-700 ring-1 ring-black/10 hover:text-orange-600", FOCUS)}
              >
                <Play className="size-3.5" /> Play it again
              </button>
            </div>
          )}
        </Block>

        {/* ---- arrange ---- */}
        <Block title="Arrange">
          <div className="grid grid-cols-2 gap-2">
            {(
              [
                ["Move up", ArrowUp, () => moveEl(id, -1)],
                ["Move down", ArrowDown, () => moveEl(id, 1)],
                ["Duplicate", Copy, () => duplicateEl(id)],
                [el.content?._hidden ? "Show" : "Hide", el.content?._hidden ? Eye : EyeOff, () => toggleHidden(id)],
              ] as const
            ).map(([l, Ic, fn]) => (
              <button
                key={l}
                type="button"
                onClick={fn}
                className={cn("flex h-11 items-center justify-center gap-2 rounded-xl border border-black/10 bg-white text-sm font-semibold text-stone-700 hover:border-orange-300", FOCUS)}
              >
                <Ic className="size-4" /> {l}
              </button>
            ))}
            <button
              type="button"
              onClick={() => removeEl(id)}
              className={cn("col-span-2 flex h-11 items-center justify-center gap-2 rounded-xl border border-red-200 bg-white text-sm font-semibold text-red-600 hover:bg-red-50", FOCUS)}
            >
              <Trash2 className="size-4" /> Delete this
            </button>
          </div>
        </Block>
      </div>
    );
  };

  const moreList = React.useMemo(() => {
    const q = moreQuery.trim().toLowerCase();
    return WIDGET_REGISTRY.filter(
      (w) => w.type !== "html" && (!q || w.name.toLowerCase().includes(q) || w.category.toLowerCase().includes(q)),
    );
  }, [moreQuery]);

  const renderAdd = () => (
    <div className="space-y-5 p-4">
      <p className="text-[13px] leading-snug text-stone-500">
        {selected ? "New items are added right below the one you selected." : "New items are added at the bottom of the page."}
      </p>
      <div className="grid grid-cols-2 gap-2">
        {QUICK_BLOCKS.map((q) => (
          <button
            key={q.id}
            type="button"
            onClick={() => addBlock(q.type, q.make())}
            className={cn(
              "flex min-h-[84px] flex-col items-start justify-between rounded-xl border border-black/[0.08] bg-white p-3 text-left shadow-sm transition hover:-translate-y-0.5 hover:border-orange-300 hover:shadow-md active:scale-[0.98]",
              FOCUS,
            )}
          >
            <q.icon className="size-5 text-orange-500" />
            <span>
              <span className="block text-[13px] font-bold text-[#2a1002]">{q.name}</span>
              <span className="block text-[11px] text-stone-400">{q.hint}</span>
            </span>
          </button>
        ))}
      </div>

      <div>
        <button
          type="button"
          onClick={() => setMoreOpen((o) => !o)}
          aria-expanded={moreOpen}
          className={cn("flex h-11 w-full items-center justify-between rounded-xl bg-stone-100 px-3 text-sm font-semibold text-stone-700", FOCUS)}
        >
          More blocks
          <ChevronDown className={cn("size-4 transition-transform", moreOpen && "rotate-180")} />
        </button>
        {moreOpen && (
          <div className="mt-2 space-y-2">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-stone-400" />
              <input className={cn(INPUT, "pl-9")} placeholder="Search blocks" value={moreQuery} onChange={(e) => setMoreQuery(e.target.value)} />
            </div>
            <div className="grid grid-cols-2 gap-2">
              {moreList.map((w) => (
                <button
                  key={w.type}
                  type="button"
                  onClick={() => addBlock(w.type)}
                  className={cn("flex h-12 items-center gap-2 rounded-xl border border-black/[0.08] bg-white px-3 text-left text-xs font-semibold text-stone-700 hover:border-orange-300", FOCUS)}
                >
                  <w.icon className="size-4 shrink-0 text-stone-400" />
                  <span className="truncate">{w.name}</span>
                </button>
              ))}
              {moreList.length === 0 && <p className="col-span-2 py-4 text-center text-xs text-stone-400">Nothing found.</p>}
            </div>
          </div>
        )}
      </div>
    </div>
  );

  const renderDetails = () => (
    <div className="space-y-6 p-4">
      <p className="rounded-xl bg-orange-50 p-3 text-[13px] leading-snug text-orange-800">
        Fill these in once. Every place on the page that shows your names, date, venue or photos updates automatically.
      </p>
      {onOpenAi && (
        <AiCard
          title="Fill it by chat"
          text="Tell the AI builder your names and venue, and say how you want them arranged."
          onClick={() => onOpenAi("builder")}
        />
      )}
      <Block title="Names">
        <div className="grid grid-cols-2 gap-2">
          <input aria-label="Bride name" className={INPUT} placeholder="Bride" value={design.coreNames.bride} onChange={(e) => setNames({ bride: e.target.value })} />
          <input aria-label="Groom name" className={INPUT} placeholder="Groom" value={design.coreNames.groom} onChange={(e) => setNames({ groom: e.target.value })} />
        </div>
      </Block>
      <Block title="When & where">
        <EventDateTimeFields
          date={design.details.date}
          time={design.details.time}
          onDate={(v) => setDetails({ date: v })}
          onTime={(v) => setDetails({ time: v })}
        />
        <input aria-label="Venue name" className={INPUT} placeholder="Venue name" value={design.details.venue} onChange={(e) => setDetails({ venue: e.target.value })} />
        <input aria-label="Venue address" className={INPUT} placeholder="Venue address" value={design.details.address} onChange={(e) => setDetails({ address: e.target.value })} />
      </Block>
      <Block title="Photos & media">
        <MediaPicker label="Cover photo" kind="image" value={design.thumbnailUrl} onChange={(u) => setMedia({ thumbnailUrl: u })} up={up} />
        <GalleryPicker urls={design.galleryUrls} onChange={(u) => setMedia({ galleryUrls: u })} up={up} />
        <MediaPicker label="Music" kind="audio" value={design.musicUrls[0] ?? ""} onChange={(u) => setMedia({ musicUrls: u ? [u] : [] })} up={up} />
        <MediaPicker label="Background video" kind="video" value={design.videoUrls[0] ?? ""} onChange={(u) => setMedia({ videoUrls: u ? [u] : [] })} up={up} />
      </Block>
    </div>
  );

  const renderLook = () => (
    <div className="space-y-6 p-4">
      {onOpenAi && (
        <AiCard
          title="Get design ideas"
          text="Ask for colours, fonts and wording. Apply the ones you like with one tap."
          onClick={() => onOpenAi("ideas")}
        />
      )}
      <Block title="Colour themes" hint="One tap changes the background, headings and text.">
        <div className="grid grid-cols-2 gap-2">
          {PALETTES.map((p) => (
            <button
              key={p.name}
              type="button"
              onClick={() => applyPalette(p)}
              className={cn("overflow-hidden rounded-xl border border-black/10 text-left transition hover:border-orange-400 hover:shadow-md active:scale-[0.98]", FOCUS)}
            >
              <div className="flex h-12 items-center gap-1.5 px-3" style={{ backgroundColor: p.bg }}>
                <span className="size-4 rounded-full ring-1 ring-black/10" style={{ backgroundColor: p.accent }} />
                <span className="size-4 rounded-full ring-1 ring-black/10" style={{ backgroundColor: p.text }} />
              </div>
              <div className="bg-white px-3 py-2 text-xs font-bold text-stone-700">{p.name}</div>
            </button>
          ))}
        </div>
      </Block>
      <Block title="Animate everything" hint="Each item plays its animation once, as your guest scrolls down. Fine-tune any item in Edit.">
        <div className="grid grid-cols-2 gap-1.5">
          {(
            [
              ["fade-up", "Fade up"],
              ["zoom", "Zoom in"],
              ["slide-left", "Slide in"],
              ["blur", "Blur in"],
            ] as const
          ).map(([id, label]) => (
            <button
              key={id}
              type="button"
              onClick={() => animateAll(id)}
              className={cn("h-11 rounded-xl border border-black/10 bg-white text-xs font-semibold text-stone-700 hover:border-orange-300", FOCUS)}
            >
              {label}
            </button>
          ))}
          <button
            type="button"
            onClick={replayAnimations}
            className={cn("flex h-11 items-center justify-center gap-1.5 rounded-xl bg-orange-500 text-xs font-semibold text-white hover:bg-orange-600", FOCUS)}
          >
            <Play className="size-3.5" /> Replay
          </button>
          <button
            type="button"
            onClick={() => animateAll("none")}
            className={cn("h-11 rounded-xl border border-black/10 bg-stone-50 text-xs font-semibold text-stone-600 hover:bg-stone-100", FOCUS)}
          >
            Turn all off
          </button>
        </div>
      </Block>
      <Block title="Page background">
        <ColorField value={design.pageSettings.backgroundColor} onChange={(v) => setPage({ backgroundColor: v || "#ffffff" })} />
      </Block>
      <Block title="All text colour" hint="Changes every heading and paragraph at once.">
        <ColorField value="" onChange={(v) => v && applyToAllText("color", v)} />
      </Block>
      <Block title="All text font" hint="Pick a look for the whole invitation.">
        <div className="grid grid-cols-2 gap-1.5">
          {FONT_CHOICES.map((f) => (
            <button
              key={f.value}
              type="button"
              onClick={() => applyToAllText("fontFamily", f.value)}
              style={{ fontFamily: f.value }}
              className={cn("h-11 rounded-xl border border-black/10 bg-white text-sm text-stone-700 hover:border-orange-300", FOCUS)}
            >
              {f.label}
            </button>
          ))}
        </div>
      </Block>
      {onOpenGuide && (
        <button
          type="button"
          onClick={onOpenGuide}
          className={cn("h-11 w-full rounded-xl bg-stone-100 text-sm font-semibold text-stone-700 hover:bg-stone-200", FOCUS)}
        >
          Need help? Open the guide
        </button>
      )}
    </div>
  );

  const panelBody = (
    <motion.div
      key={`${tab}-${selectedId ?? "none"}`}
      initial={reduce ? false : { opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.22, ease: "easeOut" }}
    >
      {tab === "edit" ? renderEdit() : tab === "add" ? renderAdd() : tab === "details" ? renderDetails() : renderLook()}
    </motion.div>
  );

  /* ---- page-level css from the template (read-only) ---- */
  const pageCss = [
    design.pageSettings.customCss,
    design.pageSettings.customCodeLang === "css" ? design.pageSettings.customCode : "",
  ]
    .filter(Boolean)
    .join("\n")
    .replace(/<\/style/gi, "");

  const api: EditorBarApi = {
    undo,
    redo,
    canUndo,
    canRedo,
    device,
    setDevice,
    startPreview: () => {
      setSelectedId(null);
      setSheet(false);
      setPreview(true);
      setReplay((n) => n + 1);
      canvasRef.current?.scrollTo({ top: 0 });
    },
  };

  /* ====================================================================== */
  return (
    <div className="fixed inset-0 z-[60] flex h-dvh w-full flex-col overflow-hidden bg-[#fffafb] text-[#2a1002]">
      {topBar(api)}

      <div className="relative flex min-h-0 flex-1">
        {/* CANVAS: data-lenis-prevent keeps Lenis from swallowing wheel/touch here */}
        <main
          ref={canvasRef}
          data-lenis-prevent
          className="relative min-w-0 flex-1 overflow-y-auto overflow-x-hidden overscroll-contain bg-stone-200/60 [scrollbar-width:thin]"
          style={{ backgroundImage: "radial-gradient(#d6c7bb 1px, transparent 1px)", backgroundSize: "18px 18px" }}
          onClick={() => setSelectedId(null)}
        >
          <div
            className="flex min-h-full justify-center p-2 sm:p-6"
            style={
              !preview && !isDesktop
                ? { paddingBottom: sheet ? `calc(${SHEET_H} + ${SHEET_HEAD} + 4.5rem)` : "5rem" }
                : undefined
            }
          >
            <div
              className="riwa-canvas relative min-h-[60dvh] self-start rounded-xl shadow-2xl ring-1 ring-black/10 transition-[width] duration-300"
              style={{
                width: DEVICES[device],
                maxWidth: "100%",
                background: design.pageSettings.backgroundColor,
              }}
            >
              {pageCss && <style>{`@scope (.riwa-canvas) { ${pageCss} }`}</style>}
              <div className="p-2 sm:p-4">
                {els.length === 0 && (
                  <div className="grid min-h-[44dvh] place-items-center rounded-xl border-2 border-dashed border-stone-200 text-center">
                    <div className="space-y-3 px-4 text-stone-400">
                      <Layers className="mx-auto size-8" />
                      <p className="text-sm">This page is empty.</p>
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          setTab("add");
                          setSheet(true);
                        }}
                        className={cn("rounded-xl bg-orange-500 px-4 py-2.5 text-sm font-semibold text-white hover:bg-orange-600", FOCUS)}
                      >
                        Add your first item
                      </button>
                    </div>
                  </div>
                )}

                {els.map((el, i) => {
                  const active = selectedId === el.id && !preview;
                  const flash = flashId === el.id && !preview;
                  return (
                    <div
                      key={el.id}
                      id={`el-${el.id}`}
                      onClick={(e) => {
                        e.stopPropagation();
                        if (preview) return;
                        if (el.type === "html") {
                          // A tap on a tagged part inside the block opens exactly that part.
                          const hit = (e.target as HTMLElement).closest?.("[data-riwa-i]");
                          const idx = hit ? Number(hit.getAttribute("data-riwa-i")) : NaN;
                          if (Number.isFinite(idx)) setInnerSel({ id: el.id, idx });
                        }
                        select(el.id);
                      }}
                      className={cn(
                        "group relative scroll-mt-24 rounded-sm outline outline-2 outline-offset-0 transition-[outline-color,box-shadow]",
                        preview
                          ? "outline-transparent"
                          : flash
                            ? "cursor-pointer outline-emerald-500 shadow-[0_0_0_6px_rgba(16,185,129,0.22)]"
                            : active
                              ? "cursor-pointer outline-orange-500"
                              : "cursor-pointer outline-transparent hover:outline-orange-300",
                      )}
                    >
                      <Reveal anim={readAnim(el)} rootRef={canvasRef} replayKey={replay} reduce={reduce}>
                        {(() => {
                          const resolved = resolveElement(el, data);
                          const key = el.type === "html" && !preview ? htmlKeyOf(resolved.content) : null;
                          const safe =
                            key !== null &&
                            isPlainHtml(resolved.content) &&
                            !hasScript(String(resolved.content[key]));
                          const shown =
                            key !== null && safe
                              ? {
                                  ...resolved,
                                  content: {
                                    ...resolved.content,
                                    [key]: annotated(
                                      String(resolved.content[key]),
                                      innerSel?.id === el.id ? innerSel.idx : null,
                                    ),
                                  },
                                }
                              : resolved;
                          return <WidgetRenderer element={shown} editing={!preview} device={device} />;
                        })()}
                      </Reveal>
                      {flash && (
                        <span className="pointer-events-none absolute left-1 top-1 z-10 rounded-md bg-emerald-600 px-2 py-0.5 text-[10px] font-semibold text-white shadow">
                          AI is pointing here
                        </span>
                      )}
                      {active && (
                        <>
                          <span className="pointer-events-none absolute left-1 top-1 z-10 rounded-md bg-orange-500 px-2 py-0.5 text-[10px] font-semibold text-white shadow">
                            {REGISTRY[el.type]?.name ?? el.type}
                          </span>
                          <div className="absolute right-1 top-1 z-10 flex overflow-hidden rounded-lg bg-neutral-900/90 text-white shadow-lg">
                            {(
                              [
                                ["Move up", ArrowUp, () => moveEl(el.id, -1), i === 0],
                                ["Move down", ArrowDown, () => moveEl(el.id, 1), i === els.length - 1],
                                ["Duplicate", Copy, () => duplicateEl(el.id), false],
                                ["Delete", Trash2, () => removeEl(el.id), false],
                              ] as const
                            ).map(([l, Ic, fn, dis]) => (
                              <button
                                key={l}
                                type="button"
                                aria-label={l}
                                title={l}
                                disabled={dis}
                                onClick={(e) => {
                                  e.stopPropagation();
                                  fn();
                                }}
                                className={cn("flex size-9 items-center justify-center hover:bg-white/15 disabled:opacity-30", l === "Delete" && "hover:bg-red-600")}
                              >
                                <Ic className="size-4" />
                              </button>
                            ))}
                          </div>
                        </>
                      )}
                    </div>
                  );
                })}

                {design.pageSettings.customCode.trim() && design.pageSettings.customCodeLang !== "css" && (
                  <div className="pointer-events-none mt-2">
                    <CodePreview
                      lang={design.pageSettings.customCodeLang as any}
                      code={design.pageSettings.customCode}
                      data={data}
                    />
                  </div>
                )}
              </div>
            </div>
          </div>
        </main>

        {/* DESKTOP SIDE PANEL */}
        {!preview && isDesktop && (
          <aside className="z-20 flex w-[360px] shrink-0 flex-col border-l border-black/[0.08] bg-white xl:w-[400px]">
            <div className="grid grid-cols-4 border-b border-black/[0.08] bg-stone-50/60">
              {TABS.map((t) => (
                <button
                  key={t.id}
                  type="button"
                  onClick={() => setTab(t.id)}
                  className={cn(
                    "flex h-12 items-center justify-center gap-1.5 border-b-2 text-xs font-semibold transition",
                    tab === t.id ? "border-orange-500 bg-white text-orange-600" : "border-transparent text-stone-500 hover:text-stone-800",
                    FOCUS,
                  )}
                >
                  <t.icon className="size-4" />
                  {t.label}
                </button>
              ))}
            </div>
            <div
              ref={panelRef}
              data-lenis-prevent
              className="min-h-0 flex-1 overflow-y-auto overscroll-contain [&::-webkit-scrollbar-thumb]:rounded-full [&::-webkit-scrollbar-thumb]:bg-orange-300 [&::-webkit-scrollbar]:w-1.5"
            >
              {panelBody}
            </div>
          </aside>
        )}
      </div>

      {/* MOBILE / TABLET BOTTOM SHEET + TAB BAR */}
      {!preview && !isDesktop && (
        <div className="fixed inset-x-0 bottom-0 z-[65]">
          <AnimatePresence initial={false}>
            {sheet && (
              <motion.div
                key="sheet"
                initial={{ height: 0 }}
                animate={{ height: `calc(${SHEET_H} + ${SHEET_HEAD})` }}
                exit={{ height: 0 }}
                transition={{ duration: reduce ? 0 : 0.24, ease: "easeOut" }}
                className="overflow-hidden rounded-t-2xl border-t border-orange-100 bg-white shadow-[0_-14px_30px_-14px_rgba(28,20,16,0.3)]"
              >
                <div className="flex shrink-0 items-center justify-between px-3" style={{ height: SHEET_HEAD }}>
                  <span aria-hidden className="mx-auto h-1 w-10 rounded-full bg-stone-300" />
                  <button
                    type="button"
                    onClick={() => setSheet(false)}
                    aria-label="Close panel"
                    className={cn("absolute right-2 top-1 flex size-9 items-center justify-center rounded-lg text-stone-500 hover:bg-stone-100", FOCUS)}
                  >
                    <ChevronDown className="size-5" />
                  </button>
                </div>
                <div
                  ref={panelRef}
                  data-lenis-prevent
                  className="overflow-y-auto overscroll-contain"
                  style={{ height: SHEET_H }}
                >
                  {panelBody}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
          <nav
            aria-label="Editor tools"
            className="flex min-h-14 items-stretch gap-0.5 border-t border-black/[0.08] bg-white px-1 pb-[env(safe-area-inset-bottom)]"
          >
            <button
              type="button"
              onClick={undo}
              disabled={!canUndo}
              aria-label="Undo"
              className={cn("flex w-11 shrink-0 items-center justify-center text-stone-500 disabled:opacity-30", FOCUS)}
            >
              <Undo2 className="size-4" />
            </button>
            <button
              type="button"
              onClick={redo}
              disabled={!canRedo}
              aria-label="Redo"
              className={cn("flex w-11 shrink-0 items-center justify-center text-stone-500 disabled:opacity-30", FOCUS)}
            >
              <Redo2 className="size-4" />
            </button>
            {TABS.map((t) => {
              const on = sheet && tab === t.id;
              return (
                <button
                  key={t.id}
                  type="button"
                  aria-pressed={on}
                  onClick={() => {
                    if (on) setSheet(false);
                    else {
                      setTab(t.id);
                      setSheet(true);
                    }
                  }}
                  className={cn(
                    "flex min-w-0 flex-1 flex-col items-center justify-center gap-0.5 rounded-lg text-[10px] font-semibold transition",
                    on ? "text-orange-600" : "text-stone-500",
                    FOCUS,
                  )}
                >
                  <t.icon className="size-5" />
                  {t.label}
                </button>
              );
            })}
          </nav>
        </div>
      )}

      {preview && (
        <button
          type="button"
          onClick={() => setPreview(false)}
          className="fixed bottom-6 left-1/2 z-[70] flex -translate-x-1/2 items-center gap-2 rounded-full bg-neutral-900 px-5 py-3 text-sm font-semibold text-white shadow-2xl hover:bg-neutral-800"
        >
          <EyeOff className="size-4" /> Exit preview
        </button>
      )}
    </div>
  );
}

export default RehearsalEditor;