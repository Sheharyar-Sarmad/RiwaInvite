"use client";

import * as React from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { MotionConfig } from "framer-motion";
import { Check, Eye, Minus, Pencil, Plus, Sparkles, X } from "lucide-react";
import { toast } from "@/components/ui/toast";
import { apiClient } from "@/lib/api/api_base";
import {
  ErrorCard,
  HEADING,
  Shimmer,
  cn,
} from "@/components/user/sections/dashboard/ui/DashboardUI";
import {
  SURFACE,
  SearchField,
  useDebouncedValue,
} from "@/components/user/sections/library/ui/LibraryUI";
import {
  RehearsalEditor,
  EMPTY_DESIGN,
  normalizeDesign,
  type AiActions,
  type AiDetails,
  type AiSuggestion,
  type EditorController,
  type RehearsalDesign,
} from "./ui/RehearsalEditor";
import {
  AiChatPanel,
  AssetTracker,
  CategoryChips,
  DiscardConfirmModal,
  DraftsStrip,
  GuideBanner,
  OwnershipTabs,
  RehearsalErrorBoundary,
  StatsRow,
  TemplatePicker,
  useAssetTracker,
  type AiMode,
  type BuilderValues,
  type ChatMessage,
  type DraftSummary,
  type OwnershipTab,
  type PublicTemplate,
  type SaveState,
} from "./ui/RehearsalStudioUI";
import { RehearsalTopBar } from "./ui/RehearsalTopBar";
import { GuideModal } from "./ui/GuideModel";

/* ========================================================================== */
/*  Types & constants                                                         */
/* ========================================================================== */

export type RehearsalUser = {
  id: string;
  email: string;
  first_name: string;
  last_name: string;
  phone_number: string;
  created_at?: string;
};

type Props = { user: RehearsalUser };
type Rec = Record<string, any>;

const API = {
  list: "/public/templates/all",
  library: "/user/dashboard/library",
  one: (id: string) => `/public/template/${encodeURIComponent(id)}`,
  draft: "/user/dashboard/rehearsal/draft",
  draftById: (id: string) => `/user/dashboard/rehearsal/draft/${encodeURIComponent(id)}`,
  invitation: (id: string) => `/user/dashboard/invitations/${encodeURIComponent(id)}`,
  ai: "/user/dashboard/rehearsal/ai-suggest",
  signature: "/user/dashboard/rehearsal/cloudinary-signature",
} as const;

const ROUTES = {
  studio: "/dashboard/rehearsal",
  unlock: (templateId: string) => `/checkout/template/${encodeURIComponent(templateId)}`,
  newInvitation: (templateId: string) =>
    `/dashboard/invitations?template=${encodeURIComponent(templateId)}`,
} as const;

const BANNER = "/home_hero_bg.png";
const TEMPLATE_ID_RE = /^[\w-]{1,64}$/;
const PAGE_SIZE = 12;
const LIBRARY_PAGE = 12;
const LIBRARY_MAX_PAGES = 20;

const MIN_IDLE_MS = 3_000;
const AUTOSAVE_EVERY_MS = 30_000;
const MAX_SCHEMA_CHARS = 4_500_000;
const MAX_CHAT_MESSAGES = 50;

const LS_PREFIX = "riwa:rehearsal:v1:";
const GUIDE_KEY = "riwa:rehearsal:guide:v1";

/* ========================================================================== */
/*  Helpers                                                                   */
/* ========================================================================== */

const uid = () => `m_${Math.random().toString(36).slice(2, 10)}`;

function statusOf(err: unknown): number | null {
  const s = (err as { response?: { status?: unknown } } | null)?.response?.status;
  return typeof s === "number" ? s : null;
}

function str(v: unknown, fallback = ""): string {
  return typeof v === "string" ? v : fallback;
}

function strArr(v: unknown): string[] {
  return Array.isArray(v) ? v.filter((x): x is string => typeof x === "string") : [];
}

function pick(o: Rec | null | undefined, ...keys: string[]): unknown {
  if (!o) return undefined;
  for (const k of keys) if (o[k] !== undefined && o[k] !== null) return o[k];
  return undefined;
}

function saveErrorMessage(err: unknown): string {
  switch (statusOf(err)) {
    case 401:
      return "Your session expired. Please sign in again. Your work is kept on this device.";
    case 413:
      return "This design is too large to save. Try removing some large media.";
    case 429:
      return "Saving too quickly. We’ll retry in a moment.";
    default:
      return "We couldn’t reach the server. Your work is safe on this device and we’ll retry.";
  }
}

function aiErrorMessage(err: unknown): string {
  switch (statusOf(err)) {
    case 429:
      return "You’re sending requests quickly. Wait a moment and try again.";
    case 403:
      return "I couldn’t access this draft. Save it again, then retry.";
    case 502:
    case 503:
      return "The assistant is busy right now. Please try again shortly.";
    default:
      return "Something went wrong reaching the assistant. Please try again.";
  }
}

function normalizeTemplates(payload: unknown): PublicTemplate[] {
  const root = payload as Rec | unknown[] | null;
  const raw: unknown[] = Array.isArray(root)
    ? root
    : Array.isArray((root as Rec | null)?.templates)
      ? ((root as Rec).templates as unknown[])
      : Array.isArray((root as Rec | null)?.items)
        ? ((root as Rec).items as unknown[])
        : [];

  const out: PublicTemplate[] = [];
  for (const item of raw) {
    const t = item as Rec | null;
    if (!t || typeof t.id !== "string") continue;
    out.push({
      id: t.id,
      name: str(t.name, "Untitled"),
      description: str(t.description),
      category_name: str(pick(t, "categoryName", "category_name")),
      thumbnail_url: str(pick(t, "thumbnailUrl", "thumbnail_url")),
      is_premium: Boolean(pick(t, "isPremium", "is_premium")),
      price: Number(t.price) || 0,
    });
  }
  return out;
}

function readTemplate(raw: unknown): {
  name: string;
  category: string;
  thumb: string;
  price: number;
  design: RehearsalDesign;
} {
  const t = (raw ?? {}) as Rec;
  const schema = (pick(t, "design_schema", "designSchema") ?? {}) as Rec;
  const core = (pick(t, "core_names_config", "coreNamesConfig") ?? {}) as Rec;
  const thumb = str(pick(t, "thumbnail_url", "thumbnailUrl"));

  const design =
    normalizeDesign({
      elements: Array.isArray(schema.elements) ? schema.elements : [],
      pageSettings: schema.pageSettings,
      coreNames: { bride: str(core.bride?.label), groom: str(core.groom?.label) },
      galleryUrls: pick(t, "gallery_urls", "galleryUrls"),
      videoUrls: pick(t, "video_urls", "videoUrls"),
      musicUrls: pick(t, "music_urls", "musicUrls"),
      thumbnailUrl: thumb,
    }) ?? EMPTY_DESIGN;

  return {
    name: str(t.name, "Rehearsal") || "Rehearsal",
    category: str(pick(t, "category_name", "categoryName")),
    thumb,
    price: Number(t.price) || 0,
    design,
  };
}

const HEX = /^#[0-9a-f]{3,8}$/i;

function buildAiContext(design: RehearsalDesign, draftId: string, category: string, mode: AiMode) {
  const palette = new Set<string>();
  const fonts = new Set<string>();
  const widgets = new Set<string>();

  const addColor = (v: unknown) => {
    if (typeof v === "string" && HEX.test(v.trim())) palette.add(v.trim().slice(0, 32));
  };

  addColor(design.pageSettings?.backgroundColor);
  for (const el of design.elements ?? []) {
    if (typeof el.type === "string") widgets.add(el.type.slice(0, 40));
    const s = (el.styles ?? {}) as Record<string, string>;
    addColor(s.color);
    addColor(s.backgroundColor);
    if (typeof s.fontFamily === "string" && s.fontFamily.trim()) fonts.add(s.fontFamily.trim().slice(0, 60));
  }

  const base = {
    draft_id: draftId,
    ...(category ? { event_type: category.slice(0, 40) } : {}),
    palette: [...palette].slice(0, 8),
    fonts: [...fonts].slice(0, 4),
    widgets: [...widgets].slice(0, 20),
  };
  if (mode !== "builder") return base;

  const elements = (design.elements ?? [])
    .filter((e) => /^[\w-]{1,40}$/.test(e.id))
    .slice(0, 40)
    .map((e) => {
      const text = typeof e.content?.text === "string" ? e.content.text.slice(0, 80) : undefined;
      const bound = typeof e.content?._bind === "string" ? e.content._bind.slice(0, 40) : undefined;
      return { id: e.id, type: String(e.type).slice(0, 40), ...(text ? { text } : {}), ...(bound ? { bound } : {}) };
    });

  return {
    ...base,
    page_background: String(design.pageSettings?.backgroundColor ?? "").slice(0, 40),
    elements,
    details: {
      bride: design.coreNames.bride.slice(0, 60),
      groom: design.coreNames.groom.slice(0, 60),
      date: design.details.date.slice(0, 12),
      time: design.details.time.slice(0, 8),
      venue: design.details.venue.slice(0, 120),
      address: design.details.address.slice(0, 160),
    },
  };
}

function normalizeSuggestions(raw: unknown): AiSuggestion[] {
  if (!Array.isArray(raw)) return [];
  const out: AiSuggestion[] = [];
  for (const item of raw) {
    const s = item as Rec | null;
    if (!s || typeof s.target !== "string" || !s.styles || typeof s.styles !== "object") continue;
    const styles: Record<string, string> = {};
    for (const [k, v] of Object.entries(s.styles as Rec)) if (typeof v === "string") styles[k] = v;
    if (Object.keys(styles).length === 0) continue;
    out.push({ target: s.target, styles, reason: typeof s.reason === "string" ? s.reason : undefined });
  }
  return out;
}

function normalizeActions(raw: unknown): AiActions {
  const r = (raw ?? {}) as Rec;
  const out: AiActions = {};
  if (r.details && typeof r.details === "object") {
    const d: AiDetails = {};
    for (const k of ["bride", "groom", "date", "time", "venue", "address"] as const) {
      if (typeof r.details[k] === "string" && r.details[k].trim()) d[k] = r.details[k];
    }
    if (Object.keys(d).length) out.details = d;
  }
  if (r.page && typeof r.page.backgroundColor === "string") out.page = { backgroundColor: r.page.backgroundColor };
  if (Array.isArray(r.edits)) {
    const edits = r.edits
      .filter((e: Rec) => e && typeof e.id === "string")
      .map((e: Rec) => {
        const styles: Record<string, string> = {};
        if (e.styles && typeof e.styles === "object") {
          for (const [k, v] of Object.entries(e.styles as Rec)) if (typeof v === "string") styles[k] = v;
        }
        return { id: e.id as string, text: typeof e.text === "string" ? e.text : undefined, styles };
      });
    if (edits.length) out.edits = edits;
  }
  if (Array.isArray(r.adds)) {
    const adds = r.adds
      .filter((e: Rec) => e && (e.type === "heading" || e.type === "text") && typeof e.text === "string")
      .slice(0, 8)
      .map((e: Rec) => {
        const styles: Record<string, string> = {};
        if (e.styles && typeof e.styles === "object") {
          for (const [k, v] of Object.entries(e.styles as Rec)) if (typeof v === "string") styles[k] = v;
        }
        return {
          type: e.type as "heading" | "text",
          text: e.text as string,
          after: typeof e.after === "string" ? e.after : "end",
          styles,
        };
      });
    if (adds.length) out.adds = adds;
  }
  if (Array.isArray(r.removes)) {
    const removes = r.removes.filter((x: unknown): x is string => typeof x === "string").slice(0, 10);
    if (removes.length) out.removes = removes;
  }
  return out;
}

const valuesToDetails = (v: BuilderValues): AiDetails => {
  const d: AiDetails = {};
  (Object.keys(v) as (keyof BuilderValues)[]).forEach((k) => {
    if (v[k].trim()) d[k] = v[k].trim();
  });
  return d;
};

/* ========================================================================== */
/*  Human-in-the-loop: describe what the AI wants to change                   */
/* ========================================================================== */

type ProposalRow = {
  kind: "add" | "edit" | "remove" | "details" | "page";
  text: string;
  targetId?: string;
};

type Proposal = { summary: string; actions: AiActions; rows: ProposalRow[] };

const DETAIL_LABELS: Record<string, string> = {
  bride: "bride name",
  groom: "groom name",
  date: "date",
  time: "time",
  venue: "venue",
  address: "address",
};

function elLabel(e: { type: string; content?: Rec }): string {
  const raw = e.content?.text ?? e.content?.title ?? e.content?.name ?? "";
  const t = String(raw).replace(/\{\{[^}]*\}\}/g, "…").trim().slice(0, 28);
  return t ? `“${t}”` : `the ${e.type} block`;
}

function describeActions(a: AiActions, design: RehearsalDesign): ProposalRow[] {
  const byId = new Map(design.elements.map((e) => [e.id, e]));
  const rows: ProposalRow[] = [];

  if (a.details) {
    const keys = Object.keys(a.details).map((k) => DETAIL_LABELS[k] ?? k);
    rows.push({ kind: "details", text: `Fill in ${keys.join(", ")}` });
  }
  if (a.page?.backgroundColor) {
    rows.push({ kind: "page", text: `Change the page background to ${a.page.backgroundColor}` });
  }
  for (const ed of a.edits ?? []) {
    const el = byId.get(ed.id);
    if (!el) continue;
    const parts: string[] = [];
    if (ed.text) parts.push("reword");
    if (Object.keys(ed.styles ?? {}).length) parts.push("restyle");
    rows.push({
      kind: "edit",
      text: `${parts.length ? parts.join(" and ") : "change"} ${elLabel(el)}`.replace(/^./, (c) => c.toUpperCase()),
      targetId: el.id,
    });
  }
  for (const add of a.adds ?? []) {
    const anchor = add.after && add.after !== "end" ? byId.get(add.after) : undefined;
    const noun = add.type === "heading" ? "heading" : Object.keys(add.styles ?? {}).includes("background-color") ? "card" : "text";
    const snippet = add.text.length > 34 ? `${add.text.slice(0, 34)}…` : add.text;
    rows.push({
      kind: "add",
      text: `Add ${noun} “${snippet}”${anchor ? ` after ${elLabel(anchor)}` : " at the end"}`,
      targetId: anchor?.id ?? design.elements[design.elements.length - 1]?.id,
    });
  }
  for (const id of a.removes ?? []) {
    const el = byId.get(id);
    if (!el) continue;
    rows.push({ kind: "remove", text: `Remove ${elLabel(el)}`, targetId: el.id });
  }
  return rows;
}

const ROW_STYLE: Record<ProposalRow["kind"], { icon: React.ComponentType<{ className?: string }>; tone: string }> = {
  add: { icon: Plus, tone: "bg-emerald-100 text-emerald-700" },
  edit: { icon: Pencil, tone: "bg-orange-100 text-orange-700" },
  remove: { icon: Minus, tone: "bg-red-100 text-red-700" },
  details: { icon: Pencil, tone: "bg-sky-100 text-sky-700" },
  page: { icon: Pencil, tone: "bg-violet-100 text-violet-700" },
};

function ProposalCard({ proposal, onShow, onApprove, onReject }: { proposal: Proposal; onShow: (id: string) => void; onApprove: () => void; onReject: () => void; }) {
  const count = proposal.rows.length;
  const removing = proposal.rows.filter((r) => r.kind === "remove").length;
  return (
    <div role="dialog" aria-label="Review the assistant’s changes" className={cn("fixed inset-x-3 bottom-[4.75rem] z-[80] mx-auto flex max-h-[46dvh] max-w-md flex-col overflow-hidden rounded-2xl bg-white shadow-2xl ring-1 ring-black/10", "lg:inset-x-auto lg:bottom-6 lg:left-6 lg:mx-0 lg:max-h-[60dvh] lg:w-[24rem]")}>
      <div className="flex items-start gap-2.5 border-b border-black/[0.06] bg-orange-50/70 px-3.5 py-3">
        <span className="mt-0.5 flex size-7 shrink-0 items-center justify-center rounded-lg bg-orange-500 text-white"><Sparkles className="size-4" /></span>
        <div className="min-w-0">
          <p className="text-sm font-bold text-[#2a1002]">Review {count} change{count === 1 ? "" : "s"}</p>
          <p className="mt-0.5 text-xs leading-snug text-stone-600">Nothing is changed until you approve. Tap a row to see where it goes.</p>
        </div>
      </div>
      <ul data-lenis-prevent className="min-h-0 flex-1 space-y-1 overflow-y-auto overscroll-contain p-2.5">
        {proposal.rows.map((r, i) => {
          const S = ROW_STYLE[r.kind];
          const canShow = !!r.targetId;
          return (
            <li key={`${r.kind}-${i}`}>
              <button type="button" disabled={!canShow} onClick={() => r.targetId && onShow(r.targetId)} className={cn("flex min-h-11 w-full items-center gap-2.5 rounded-xl border border-black/[0.07] bg-white px-2.5 py-2 text-left text-[13px] leading-snug text-stone-700 transition", canShow && "hover:border-orange-300 active:scale-[0.99]", "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-500/40")}>
                <span className={cn("flex size-6 shrink-0 items-center justify-center rounded-md", S.tone)}><S.icon className="size-3.5" /></span>
                <span className="min-w-0 flex-1 break-words">{r.text}</span>
                {canShow && <Eye className="size-3.5 shrink-0 text-stone-400" aria-hidden />}
              </button>
            </li>
          );
        })}
      </ul>
      <div className="grid grid-cols-2 gap-2 border-t border-black/[0.06] bg-stone-50/70 p-2.5">
        <button type="button" onClick={onReject} className="flex h-11 items-center justify-center gap-1.5 rounded-xl border border-black/10 bg-white text-sm font-semibold text-stone-700 hover:bg-stone-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-500/40"><X className="size-4" /> Discard</button>
        <button type="button" onClick={onApprove} className={cn("flex h-11 items-center justify-center gap-1.5 rounded-xl text-sm font-semibold text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-500/40", removing > 0 ? "bg-red-600 hover:bg-red-700" : "bg-orange-500 hover:bg-orange-600")}><Check className="size-4" /> {removing > 0 ? "Approve & delete" : "Approve"}</button>
      </div>
    </div>
  );
}

/* ========================================================================== */
/*  On-device backup (survives reload, tab close and browser crashes)         */
/* ========================================================================== */

type Backup = { v: 1; templateId: string; name: string; thumb: string; design: RehearsalDesign; assets: string[]; draftId: string | null; dirty: boolean; at: number; };
const bkKey = (userId: string, templateId: string) => `${LS_PREFIX}${userId}:${templateId}`;

function parseBackup(raw: string | null): Backup | null {
  if (!raw) return null;
  try {
    const b = JSON.parse(raw) as Rec;
    const design = normalizeDesign(b?.design);
    if (!b || b.v !== 1 || typeof b.templateId !== "string" || !design) return null;
    return { v: 1, templateId: b.templateId, name: str(b.name, "Rehearsal"), thumb: str(b.thumb), design, assets: strArr(b.assets), draftId: typeof b.draftId === "string" ? b.draftId : null, dirty: Boolean(b.dirty), at: Number(b.at) || Date.now() };
  } catch { return null; }
}
function readBackup(userId: string, templateId: string): Backup | null { try { return parseBackup(localStorage.getItem(bkKey(userId, templateId))); } catch { return null; } }
function writeBackup(userId: string, b: Backup) { try { localStorage.setItem(bkKey(userId, b.templateId), JSON.stringify(b)); } catch {} }
function clearBackup(userId: string, templateId: string) { try { localStorage.removeItem(bkKey(userId, templateId)); } catch {} }
function listBackups(userId: string): Backup[] {
  const out: Backup[] = [];
  try {
    const prefix = `${LS_PREFIX}${userId}:`;
    for (let i = 0; i < localStorage.length; i++) {
      const k = localStorage.key(i);
      if (!k || !k.startsWith(prefix)) continue;
      const b = parseBackup(localStorage.getItem(k));
      if (b) out.push(b);
    }
  } catch {}
  return out;
}

async function purgeRehearsal(opts: { userId: string; templateId: string; design: RehearsalDesign | null; assets: string[]; knownDraftId?: string | null; knownServerAssets?: string[]; }): Promise<void> {
  const { userId, templateId, design, assets } = opts;
  let id: string | null | undefined = opts.knownDraftId;
  let serverAssets = opts.knownServerAssets ?? [];
  if (id === undefined) {
    try {
      const res = await apiClient.get(`${API.draft}?template_id=${encodeURIComponent(templateId)}`);
      const d = (res.data?.data ?? null) as Rec | null;
      id = typeof d?.id === "string" ? d.id : null;
      serverAssets = strArr(d?.cloudinary_assets);
    } catch (err) { if (statusOf(err) !== 404) throw err; id = null; }
  }
  const unknownToServer = assets.filter((u) => !serverAssets.includes(u));
  if (unknownToServer.length > 0 && design) {
    const res = await apiClient.post(API.draft, { template_id: templateId, design_schema: design, cloudinary_assets: Array.from(new Set([...serverAssets, ...assets])) });
    const newId = res.data?.data?.id;
    if (typeof newId === "string") id = newId;
  }
  if (id) await apiClient.delete(API.draftById(id));
  clearBackup(userId, templateId);
}

function useGuide() {
  const [open, setOpen] = React.useState(false);
  const [seen, setSeen] = React.useState(true);
  React.useEffect(() => { try { setSeen(localStorage.getItem(GUIDE_KEY) === "1"); } catch {} }, []);
  const close = React.useCallback(() => { setOpen(false); setSeen(true); try { localStorage.setItem(GUIDE_KEY, "1"); } catch {} }, []);
  const show = React.useCallback(() => setOpen(true), []);
  return { open, seen, show, close };
}

function usePurchased() {
  const [items, setItems] = React.useState<PublicTemplate[]>([]);
  const [status, setStatus] = React.useState<"loading" | "ready" | "error">("loading");
  const [attempt, setAttempt] = React.useState(0);

  React.useEffect(() => {
    let cancelled = false;
    setStatus("loading");
    (async () => {
      try {
        const all: PublicTemplate[] = [];
        let page = 1;
        let totalPages = 1;
        do {
          const res = await apiClient.get(API.library, { params: { page, limit: LIBRARY_PAGE } });
          const payload = (res.data?.data ?? res.data) as Rec | null;
          const rows = Array.isArray(payload?.items) ? (payload!.items as Rec[]) : [];
          for (const t of rows) {
            if (!t || typeof t.id !== "string") continue;
            all.push({ id: t.id, name: str(t.name, "Untitled"), description: str(t.description), category_name: str(pick(t, "category_name", "categoryName")), thumbnail_url: str(pick(t, "thumbnail_url", "thumbnailUrl")), is_premium: Boolean(pick(t, "is_premium", "isPremium")), price: Number(t.price_paid) || 0, owned: true, has_custom_slug: Boolean(pick(t, "has_custom_slug", "hasCustomSlug")) });
          }
          totalPages = Number(payload?.meta?.total_pages) || 1;
          page += 1;
        } while (page <= totalPages && page <= LIBRARY_MAX_PAGES && !cancelled);
        if (cancelled) return;
        setItems(all);
        setStatus("ready");
      } catch { if (!cancelled) setStatus("error"); }
    })();
    return () => { cancelled = true; };
  }, [attempt]);

  const ids = React.useMemo(() => new Set(items.map((t) => t.id)), [items]);
  return { items, ids, status, retry: () => setAttempt((n) => n + 1) };
}

/* ========================================================================== */
/*  Entry                                                                     */
/* ========================================================================== */

export function RehearsalStudioClient({ user }: Props) {
  return (
    <RehearsalErrorBoundary>
      <MotionConfig reducedMotion="user">
        <React.Suspense fallback={<StudioLoading />}>
          <Router user={user} />
        </React.Suspense>
      </MotionConfig>
    </RehearsalErrorBoundary>
  );
}

function Router({ user }: Props) {
  const params = useSearchParams();
  const rawTemplate = params.get("template");
  const rawInvitation = params.get("invitation");

  const templateId = rawTemplate && TEMPLATE_ID_RE.test(rawTemplate) ? rawTemplate : null;
  const invitationId = rawInvitation && TEMPLATE_ID_RE.test(rawInvitation) ? rawInvitation : null;

  return templateId || invitationId ? (
    <Studio key={templateId || invitationId} templateId={templateId || ""} invitationId={invitationId || ""} user={user} />
  ) : (
    <PickerView user={user} />
  );
}

function StudioLoading() {
  return (
    <div className="w-full space-y-3 sm:space-y-5" aria-busy="true">
      <Shimmer className="h-24 w-full rounded-2xl sm:h-32 sm:rounded-3xl" />
      <Shimmer className="h-64 w-full rounded-2xl" />
    </div>
  );
}

/* ========================================================================== */
/*  Template picker                                                           */
/* ========================================================================== */

function PickerView({ user }: Props) {
  const router = useRouter();
  const guide = useGuide();
  const purchased = usePurchased();

  const [status, setStatus] = React.useState<"loading" | "ready" | "error">("loading");
  const [items, setItems] = React.useState<PublicTemplate[]>([]);
  const [total, setTotal] = React.useState<number | null>(null);
  const [hasMore, setHasMore] = React.useState(false);
  const [loadingMore, setLoadingMore] = React.useState(false);
  const [query, setQuery] = React.useState("");
  const [attempt, setAttempt] = React.useState(0);
  const [tab, setTab] = React.useState<OwnershipTab>("all");
  const [category, setCategory] = React.useState("");
  const q = useDebouncedValue(query.trim(), 300);

  const page = React.useRef(1);
  const reqId = React.useRef(0);

  const [drafts, setDrafts] = React.useState<DraftSummary[]>([]);
  const [target, setTarget] = React.useState<DraftSummary | null>(null);
  const [deleting, setDeleting] = React.useState(false);

  const refreshDrafts = React.useCallback(() => {
    setDrafts(listBackups(user.id).filter((b) => b.dirty || b.draftId).sort((a, b) => b.at - a.at).map((b) => ({ templateId: b.templateId, name: b.name, thumb: b.design.thumbnailUrl || b.thumb, updatedAt: b.at, unsynced: b.dirty })));
  }, [user.id]);

  React.useEffect(() => { refreshDrafts(); }, [refreshDrafts]);

  const fetchPage = React.useCallback(async (p: number, search: string) => {
    const res = await apiClient.get(API.list, { params: { page: p, limit: PAGE_SIZE, ...(search ? { search } : {}) } });
    const payload = (res.data?.data ?? res.data) as Rec | null;
    const metaTotal = Number(payload?.meta?.total);
    return { items: normalizeTemplates(payload), hasNext: Boolean(payload?.meta?.hasNextPage), total: Number.isFinite(metaTotal) && metaTotal > 0 ? metaTotal : null };
  }, []);

  React.useEffect(() => {
    const id = ++reqId.current;
    setStatus("loading");
    (async () => {
      try {
        const r = await fetchPage(1, q);
        if (id !== reqId.current) return;
        page.current = 1;
        setItems(r.items);
        setHasMore(r.hasNext);
        if (!q) setTotal(r.total ?? (r.hasNext ? null : r.items.length));
        setStatus("ready");
      } catch { if (id === reqId.current) setStatus("error"); }
    })();
  }, [q, attempt, fetchPage]);

  const loadMore = React.useCallback(async () => {
    if (loadingMore) return;
    const id = reqId.current;
    setLoadingMore(true);
    try {
      const r = await fetchPage(page.current + 1, q);
      if (id !== reqId.current) return;
      page.current += 1;
      setItems((prev) => { const seen = new Set(prev.map((t) => t.id)); return [...prev, ...r.items.filter((t) => !seen.has(t.id))]; });
      setHasMore(r.hasNext);
    } catch { toast.add({ title: "Couldn’t load more", description: "Please try again.", type: "error" }); } finally { setLoadingMore(false); }
  }, [fetchPage, loadingMore, q]);

  const ownedIds = purchased.ids;
  const qLower = q.toLowerCase();

  const shown = React.useMemo(() => {
    let list: PublicTemplate[];
    if (tab === "owned") {
      list = purchased.items.filter((t) => !qLower || t.name.toLowerCase().includes(qLower) || t.category_name.toLowerCase().includes(qLower) || t.description.toLowerCase().includes(qLower));
    } else {
      list = items.map((t) => ({ ...t, owned: ownedIds.has(t.id) }));
      if (tab === "unowned") list = list.filter((t) => !t.owned);
    }
    if (category) list = list.filter((t) => t.category_name === category);
    return list;
  }, [tab, purchased.items, items, ownedIds, qLower, category]);

  const categories = React.useMemo(() => {
    const base = tab === "owned" ? purchased.items : items;
    return Array.from(new Set(base.map((t) => t.category_name).filter(Boolean))).sort();
  }, [tab, purchased.items, items]);

  const guidePreviews = React.useMemo(() => Array.from(new Set([...purchased.items, ...items].map((t) => t.thumbnail_url).filter((u) => u.trim() !== ""))).slice(0, 6), [purchased.items, items]);

  React.useEffect(() => {
    if (tab !== "unowned" || status !== "ready" || purchased.status === "loading") return;
    if (hasMore && !loadingMore && shown.length < 8) void loadMore();
  }, [tab, status, purchased.status, hasMore, loadingMore, shown.length, loadMore]);

  const pickerStatus: "loading" | "ready" | "error" = tab === "owned" ? (purchased.status === "loading" ? "loading" : purchased.status === "error" ? "error" : "ready") : status;
  const open = (templateId: string) => router.push(`${ROUTES.studio}?template=${encodeURIComponent(templateId)}`);

  const confirmDelete = async () => {
    if (!target) return;
    setDeleting(true);
    try {
      const b = readBackup(user.id, target.templateId);
      await purgeRehearsal({ userId: user.id, templateId: target.templateId, design: b?.design ?? null, assets: b?.assets ?? [] });
      toast.add({ title: "Draft deleted", description: "Your rehearsal and its uploads were removed.", type: "success" });
      setTarget(null);
      refreshDrafts();
    } catch { toast.add({ title: "Couldn’t delete the draft", description: "Nothing was changed. Please try again.", type: "error" }); } finally { setDeleting(false); }
  };

  const draftIds = React.useMemo(() => new Set(drafts.map((d) => d.templateId)), [drafts]);
  const draftsWithOwnership = React.useMemo(() => drafts.map((d) => ({ ...d, owned: ownedIds.has(d.templateId) })), [drafts, ownedIds]);

  return (
    <div className="w-full space-y-3 sm:space-y-6">
      <header className={cn("relative overflow-hidden rounded-2xl p-4 sm:rounded-3xl sm:p-7", "ring-1 ring-black/[0.06] shadow-[0_1px_2px_rgba(28,20,16,0.04),0_12px_28px_-18px_rgba(28,20,16,0.22)]")} style={{ backgroundImage: `url(${BANNER})`, backgroundSize: "cover", backgroundPosition: "70% center" }}>
        <div aria-hidden className="pointer-events-none absolute inset-0 bg-gradient-to-b from-[#fff8f2]/95 via-[#fff8f2]/70 to-[#fff8f2]/30 sm:bg-gradient-to-r sm:from-[#fff8f2]/95 sm:via-[#fff8f2]/65 sm:to-[#fff8f2]/10" />
        <div className="relative z-10">
          <h1 className={cn(HEADING, "text-[26px] leading-8 tracking-[-0.025em] text-[#2a1002] sm:text-4xl sm:leading-10")}>Rehearsal <span className="text-orange-600">Studio</span></h1>
          <p className="mt-1 max-w-xl text-[13px] font-medium leading-5 text-stone-600 sm:text-sm">Pick any template, make it yours and see it live, before you buy. Your work saves automatically.</p>
          {guide.seen && (<div className="mt-2 -ml-2"><GuideBanner seen onOpen={guide.show} /></div>)}
        </div>
      </header>
      {!guide.seen && <GuideBanner seen={false} onOpen={guide.show} />}
      <StatsRow total={total} owned={purchased.items.length} drafts={drafts.length} loadingOwned={purchased.status === "loading"} />
      <DraftsStrip drafts={draftsWithOwnership} onOpen={open} onDelete={setTarget} />
      <div className="space-y-3">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <OwnershipTabs value={tab} ownedCount={purchased.status === "ready" ? purchased.items.length : null} onChange={(v) => { setTab(v); setCategory(""); }} />
          <div className="min-w-0 lg:w-[26rem]"><SearchField value={query} onChange={setQuery} placeholder="Search templates by name or description" /></div>
        </div>
        <CategoryChips categories={categories} value={category} onChange={setCategory} />
        {purchased.status === "error" && tab !== "owned" && (
          <p className="flex flex-wrap items-center gap-2 rounded-xl bg-amber-50 px-3 py-2 text-xs text-amber-800 ring-1 ring-amber-200">We couldn’t check which templates you own, so the Purchased badges may be missing.<button type="button" onClick={purchased.retry} className="font-bold underline underline-offset-2">Try again</button></p>
        )}
      </div>
      <TemplatePicker items={shown} status={pickerStatus} query={q} tab={tab} draftIds={draftIds} hasMore={tab !== "owned" && hasMore} loadingMore={loadingMore} onLoadMore={() => void loadMore()} onRetry={() => (tab === "owned" ? purchased.retry() : setAttempt((n) => n + 1))} onPick={open} onCreate={(id) => router.push(ROUTES.newInvitation(id))} unlockHref={ROUTES.unlock} />
      <DiscardConfirmModal open={target !== null} busy={deleting} name={target?.name} onCancel={() => setTarget(null)} onConfirm={() => void confirmDelete()} />
      <GuideModal open={guide.open} onClose={guide.close} previews={guidePreviews} />
    </div>
  );
}

/* ========================================================================== */
/*  Studio                                                                    */
/* ========================================================================== */

function Studio({ templateId: initialTemplateId, invitationId, user }: { templateId: string; invitationId: string; user: RehearsalUser }) {
  const router = useRouter();
  const guide = useGuide();
  const purchased = usePurchased();

  const [templateId, setTemplateId] = React.useState(initialTemplateId);

  const mine = purchased.items.find((t) => t.id === templateId);
  const owned: boolean | null = purchased.status === "ready" ? !!mine : purchased.status === "loading" ? null : null;

  const [phase, setPhase] = React.useState<"loading" | "ready" | "error">("loading");
  const [boot, setBoot] = React.useState<RehearsalDesign | null>(null);
  const [attempt, setAttempt] = React.useState(0);
  const [meta, setMeta] = React.useState({ name: "Rehearsal", category: "", thumb: "", price: 0 });
  const metaRef = React.useRef(meta);

  const draftId = React.useRef<string | null>(null);
  const serverAssets = React.useRef<string[]>([]);
  const latest = React.useRef<RehearsalDesign | null>(null);
  const savedRef = React.useRef<RehearsalDesign | null>(null);
  const dirtyRef = React.useRef(false);
  const assets = useAssetTracker();
  const controller = React.useRef<EditorController | null>(null);

  const [saveState, setSaveStateRaw] = React.useState<SaveState>("idle");
  const [savedAt, setSavedAt] = React.useState<number | null>(null);
  const stateRef = React.useRef<SaveState>("idle");
  const setSave = React.useCallback((s: SaveState) => { stateRef.current = s; setSaveStateRaw(s); }, []);
  const timer = React.useRef<number | null>(null);
  const localTimer = React.useRef<number | null>(null);
  const lastSaveAt = React.useRef(0);
  const inflight = React.useRef<Promise<boolean> | null>(null);
  const discarded = React.useRef(false);
  const failureToastShown = React.useRef(false);
  const saveRef = React.useRef<(manual: boolean) => Promise<boolean>>(async () => false);

  const [aiOpen, setAiOpen] = React.useState(false);
  const [aiMode, setAiMode] = React.useState<AiMode>("ideas");
  const [messages, setMessages] = React.useState<ChatMessage[]>([]);
  const [aiBusy, setAiBusy] = React.useState(false);
  const [pending, setPending] = React.useState<Proposal | null>(null);
  const [discardOpen, setDiscardOpen] = React.useState(false);
  const [discarding, setDiscarding] = React.useState(false);

  const flushLocal = React.useCallback(() => {
    const design = latest.current;
    if (!design || discarded.current) return;
    if (!dirtyRef.current && !draftId.current && assets.urlsRef.current.length === 0) return;
    if (localTimer.current) { window.clearTimeout(localTimer.current); localTimer.current = null; }
    writeBackup(user.id, { v: 1, templateId, name: metaRef.current.name, thumb: metaRef.current.thumb, design, assets: assets.urlsRef.current, draftId: draftId.current, dirty: dirtyRef.current, at: Date.now() });
  }, [assets.urlsRef, templateId, user.id]);

  const scheduleAutosave = React.useCallback(() => {
    if (discarded.current) return;
    if (timer.current) window.clearTimeout(timer.current);
    const wait = Math.max(MIN_IDLE_MS, AUTOSAVE_EVERY_MS - (Date.now() - lastSaveAt.current));
    timer.current = window.setTimeout(() => { void saveRef.current(false); }, wait);
  }, []);

  React.useEffect(() => {
    let cancelled = false;
    discarded.current = false;
    setPhase("loading");
    setBoot(null);

    (async () => {
      let tId = initialTemplateId;
      let invDesignSchema: Rec | null = null;

      // 1. If we are editing an invitation, fetch it first to get the template_id and design_schema
      if (invitationId) {
        try {
          const invR = await apiClient.get(API.invitation(invitationId));
          const invData = invR.data?.data;
          if (invData) {
            tId = invData.template_id;
            invDesignSchema = invData.design_schema;
          }
        } catch (err) {
          if (!cancelled) setPhase("error");
          return;
        }
      }

      if (!tId) {
        if (!cancelled) setPhase("error");
        return;
      }
      setTemplateId(tId);

      // 2. Fetch the template and draft
      const [tplR, draftR] = await Promise.allSettled([
        apiClient.get(API.one(tId)),
        apiClient.get(`${API.draft}?template_id=${encodeURIComponent(tId)}`),
      ]);
      if (cancelled) return;

      if (tplR.status === "rejected") { setPhase("error"); return; }
      
      let draftData: Rec | null = null;
      if (draftR.status === "rejected") {
        if (statusOf(draftR.reason) !== 404) { setPhase("error"); return; }
      } else { draftData = (draftR.value.data?.data ?? null) as Rec | null; }

      const tpl = readTemplate(tplR.value.data?.data ?? tplR.value.data);
      const serverId = typeof draftData?.id === "string" ? (draftData.id as string) : null;
      const serverDesign = normalizeDesign(draftData?.design_schema);
      const local = readBackup(user.id, tId);

      // 3. Determine which design to load (Invitation > Local Draft > Server Draft > Base Template)
      let design: RehearsalDesign;
      let recovered = false;
      
      if (invDesignSchema) {
        design = normalizeDesign(invDesignSchema) || tpl.design;
      } else if (local?.dirty) {
        design = local.design;
        recovered = true;
      } else if (serverDesign && serverId) {
        design = serverDesign;
      } else {
        design = tpl.design;
        if (local) clearBackup(user.id, tId);
      }

      draftId.current = serverId;
      serverAssets.current = strArr(draftData?.cloudinary_assets);
      assets.reset([...serverAssets.current, ...(local?.assets ?? [])]);
      latest.current = design;
      savedRef.current = !recovered && serverDesign && serverId ? design : null;
      dirtyRef.current = recovered;

      const m = { name: tpl.name, category: tpl.category, thumb: tpl.thumb, price: tpl.price };
      metaRef.current = m;
      setMeta(m);
      setSave(recovered ? "dirty" : serverId ? "saved" : "idle");
      setBoot(design);
      setPhase("ready");

      if (recovered) { toast.add({ title: "Welcome back", description: "We restored the changes you hadn’t saved yet.", type: "success" }); scheduleAutosave(); }
    })();

    return () => { cancelled = true; };
  }, [initialTemplateId, invitationId, attempt]);

  const handleChange = React.useCallback((d: RehearsalDesign) => {
    latest.current = d;
    if (discarded.current) return;
    dirtyRef.current = true;
    if (localTimer.current) window.clearTimeout(localTimer.current);
    localTimer.current = window.setTimeout(flushLocal, 250);
    if (stateRef.current !== "saving") setSave("dirty");
    scheduleAutosave();
  }, [flushLocal, scheduleAutosave, setSave]);

  const trackAsset = assets.track;
  const handleAsset = React.useCallback((url: string) => { trackAsset(url); flushLocal(); }, [trackAsset, flushLocal]);

  const saveNow = React.useCallback(async (manual: boolean): Promise<boolean> => {
    if (discarded.current) return false;
    if (inflight.current) return inflight.current;

    const run = (async (): Promise<boolean> => {
      const snap = latest.current;
      if (!snap) return false;
      if (draftId.current && savedRef.current === snap) { dirtyRef.current = false; flushLocal(); setSave("saved"); return true; }
      if (JSON.stringify(snap).length > MAX_SCHEMA_CHARS) { setSave("error"); toast.add({ title: "Design too large", description: "Try removing some large media, then save again.", type: "error" }); return false; }

      lastSaveAt.current = Date.now();
      setSave("saving");
      try {
        const res = await apiClient.post(API.draft, { template_id: templateId, design_schema: snap, cloudinary_assets: assets.urlsRef.current });
        const id = res.data?.data?.id;
        if (typeof id === "string") draftId.current = id;
        savedRef.current = snap;
        serverAssets.current = [...assets.urlsRef.current];
        failureToastShown.current = false;
        setSavedAt(Date.now());
        if (manual) toast.add({ title: "Draft saved", description: "Your changes are safe.", type: "success" });
        if (latest.current === snap) { dirtyRef.current = false; setSave("saved"); } else { setSave("dirty"); scheduleAutosave(); }
        flushLocal();
        return true;
      } catch (err) {
        setSave("error");
        if (manual || !failureToastShown.current) { failureToastShown.current = true; toast.add({ title: "Couldn’t save to your account", description: saveErrorMessage(err), type: "error" }); }
        if (!manual) scheduleAutosave();
        return false;
      }
    })();

    inflight.current = run;
    try { return await run; } finally { inflight.current = null; }
  }, [assets.urlsRef, flushLocal, scheduleAutosave, setSave, templateId]);

  React.useEffect(() => { saveRef.current = saveNow; }, [saveNow]);

  React.useEffect(() => {
    const onHide = () => { flushLocal(); if (document.visibilityState === "hidden" && dirtyRef.current) void saveRef.current(false); };
    window.addEventListener("pagehide", flushLocal);
    window.addEventListener("beforeunload", flushLocal);
    document.addEventListener("visibilitychange", onHide);
    return () => {
      window.removeEventListener("pagehide", flushLocal);
      window.removeEventListener("beforeunload", flushLocal);
      document.removeEventListener("visibilitychange", onHide);
      flushLocal();
      if (timer.current) window.clearTimeout(timer.current);
      if (localTimer.current) window.clearTimeout(localTimer.current);
    };
  }, [flushLocal]);

  React.useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "s") { e.preventDefault(); void saveNow(true); }
      else if (e.key === "Escape" && !discardOpen && !guide.open) { if (pending) setPending(null); else if (aiOpen) setAiOpen(false); }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [saveNow, aiOpen, pending, discardOpen, guide.open]);

  const goBack = React.useCallback(async () => { flushLocal(); if (dirtyRef.current) await saveNow(false); router.push(ROUTES.studio); }, [flushLocal, router, saveNow]);

  const confirmDiscard = async () => {
    setDiscarding(true);
    discarded.current = true;
    if (timer.current) window.clearTimeout(timer.current);
    if (localTimer.current) window.clearTimeout(localTimer.current);
    try {
      if (inflight.current) await inflight.current;
      await purgeRehearsal({ userId: user.id, templateId, design: latest.current, assets: assets.urlsRef.current, knownDraftId: draftId.current, knownServerAssets: serverAssets.current });
      toast.add({ title: "Draft deleted", description: "Your rehearsal and its uploads were removed.", type: "success" });
      router.push(ROUTES.studio);
    } catch {
      discarded.current = false;
      setDiscarding(false);
      toast.add({ title: "Couldn’t delete the draft", description: "Nothing was changed. Please try again.", type: "error" });
    }
  };

  const ensureDraft = React.useCallback(async (): Promise<string | null> => {
    if (discarded.current) return null;
    if (inflight.current) await inflight.current;
    if (dirtyRef.current || !draftId.current) { const ok = await saveNow(false); if (!ok) return null; }
    if (dirtyRef.current) { const ok = await saveNow(false); if (!ok) return null; }
    return draftId.current;
  }, [saveNow]);

  const handleCreate = React.useCallback(async () => {
    const id = await ensureDraft();
    if (!id) { toast.add({ title: "Couldn’t save your draft", description: "Check your connection and try again.", type: "error" }); return; }
    router.push(ROUTES.newInvitation(templateId));
  }, [ensureDraft, router, templateId]);

  const pushMessage = React.useCallback((m: ChatMessage) => { setMessages((prev) => [...prev, m].slice(-MAX_CHAT_MESSAGES)); }, []);
  const openAi = React.useCallback((mode: AiMode) => { setAiMode(mode); setAiOpen(true); }, []);
  const setBuilderMode = React.useCallback((on: boolean) => { setAiMode(on ? "builder" : "ideas"); if (on) setAiOpen(true); }, []);

  const getValues = React.useCallback((): BuilderValues => {
    const d = controller.current?.getDesign() ?? latest.current;
    return { bride: d?.coreNames.bride ?? "", groom: d?.coreNames.groom ?? "", date: d?.details.date ?? "", time: d?.details.time ?? "", venue: d?.details.venue ?? "", address: d?.details.address ?? "" };
  }, []);

  const applyValues = React.useCallback((v: BuilderValues): number => {
    const d = valuesToDetails(v);
    if (Object.keys(d).length === 0) return 0;
    const n = controller.current?.applyActions({ details: d }) ?? 0;
    if (n > 0) toast.add({ title: "Details added", description: "Your page now shows your values.", type: "success" });
    return n;
  }, []);

  const applySuggestion = React.useCallback((s: AiSuggestion): number => {
    const n = controller.current?.applySuggestion(s) ?? 0;
    if (n === 0) toast.add({ title: "Nothing to change", description: "No matching item on your page.", type: "error" });
    return n;
  }, []);

  const showTarget = React.useCallback((id: string) => { controller.current?.focus(id); }, []);
  const rejectProposal = React.useCallback(() => { setPending(null); pushMessage({ id: uid(), role: "assistant", text: "No problem, I left your page as it was." }); }, [pushMessage]);

  const approveProposal = React.useCallback(() => {
    const p = pending;
    if (!p) return;
    setPending(null);
    const ctl = controller.current;
    const n = ctl?.applyActions(p.actions) ?? 0;
    if (n === 0) { pushMessage({ id: uid(), role: "assistant", error: true, text: "I couldn’t apply those changes. The items may have been moved or deleted since I looked." }); return; }
    pushMessage({ id: uid(), role: "assistant", text: `Done. I made ${n} change${n === 1 ? "" : "s"}. You can undo them all in one tap.`, applied: n });
    toast.add({ title: "Applied changes", description: "Tap Undo in the chat to take them back.", type: "success" });
    const first = ctl?.lastTouched()[0];
    if (first) ctl?.focus(first);
  }, [pending, pushMessage]);

  const sendAi = async (text: string, opts: { mode: AiMode; values?: BuilderValues }) => {
    const mode = opts.mode;
    pushMessage({ id: uid(), role: "user", text });
    setPending(null);
    setAiBusy(true);
    try {
      const ctl = controller.current;
      if (!ctl) { pushMessage({ id: uid(), role: "assistant", error: true, text: "The editor isn’t ready yet. Please try again." }); return; }
      if (mode === "builder" && opts.values) { const d = valuesToDetails(opts.values); if (Object.keys(d).length) ctl.applyActions({ details: d }); }
      if (!draftId.current) {
        const ok = await saveNow(false);
        if (!ok || !draftId.current) { pushMessage({ id: uid(), role: "assistant", error: true, text: "I need your draft saved first, and saving didn’t work. Please try again in a moment." }); return; }
      }
      const snap = ctl.getDesign();
      const res = await apiClient.post(API.ai, { message: text, mode, context: buildAiContext(snap, draftId.current, metaRef.current.category, mode) });
      const d = res.data?.data as { suggestion?: unknown; suggestions?: unknown; actions?: unknown } | undefined;
      const summary = str(d?.suggestion).trim() || "Here’s what I’d try.";
      if (mode === "builder") {
        const actions = normalizeActions(d?.actions);
        const rows = describeActions(actions, ctl.getDesign());
        if (rows.length === 0) { pushMessage({ id: uid(), role: "assistant", error: true, text: "I couldn’t change that. I can edit, add or delete text and headings, and change colours and the page background. Photos have to be added by hand from the Add tab." }); return; }
        setPending({ summary, actions, rows });
        pushMessage({ id: uid(), role: "assistant", text: `${summary} Check the ${rows.length} change${rows.length === 1 ? "" : "s"} below and approve when you’re happy.` });
        const firstTarget = rows.find((r) => r.targetId)?.targetId;
        if (firstTarget) ctl.focus(firstTarget);
      } else {
        pushMessage({ id: uid(), role: "assistant", text: summary, suggestions: normalizeSuggestions(d?.suggestions) });
      }
    } catch (err) {
      pushMessage({ id: uid(), role: "assistant", error: true, text: aiErrorMessage(err) });
    } finally { setAiBusy(false); }
  };

  const copyCss = (css: string) => { void navigator.clipboard?.writeText(css); toast.add({ title: "Copied", description: "Copied to your clipboard.", type: "success" }); };
  const guidePreviews = React.useMemo(() => Array.from(new Set([meta.thumb, ...purchased.items.map((t) => t.thumbnail_url)].filter((u) => u.trim() !== ""))).slice(0, 6), [meta.thumb, purchased.items]);

  if (phase === "loading") return <StudioLoading />;
  if (phase === "error" || !boot) return (<div className={cn("rounded-2xl", SURFACE)}><ErrorCard onRetry={() => setAttempt((n) => n + 1)} /></div>);

  return (
    <>
      <RehearsalEditor
        key={attempt}
        initial={boot}
        signaturePath={API.signature}
        onChange={handleChange}
        onAssetUploaded={handleAsset}
        onOpenGuide={guide.show}
        onOpenAi={openAi}
        controllerRef={controller}
        topBar={(builder) => (
          <RehearsalTopBar
            title={meta.name}
            saveState={saveState}
            savedAt={savedAt}
            aiOpen={aiOpen}
            builderMode={aiOpen && aiMode === "builder"}
            guideUnread={!guide.seen}
            builder={builder}
            create={{ templateId, owned, price: meta.price, unlockHref: ROUTES.unlock(templateId), onCreate: handleCreate }}
            onBack={() => void goBack()}
            onSave={() => void saveNow(true)}
            onDiscard={() => setDiscardOpen(true)}
            onToggleAi={() => setAiOpen((o) => !o)}
            onBuilderModeChange={setBuilderMode}
            onGuide={guide.show}
          />
        )}
      />
      <AssetTracker count={assets.count} />
      <AiChatPanel
        open={aiOpen}
        mode={aiMode}
        onModeChange={setAiMode}
        messages={messages}
        busy={aiBusy}
        firstName={user.first_name || "there"}
        getValues={getValues}
        onSend={(t, o) => void sendAi(t, o)}
        onApplyValues={applyValues}
        onApplySuggestion={applySuggestion}
        onUndo={() => controller.current?.undo()}
        onClose={() => setAiOpen(false)}
        onCopyCss={copyCss}
      />
      {pending && (<ProposalCard proposal={pending} onShow={showTarget} onApprove={approveProposal} onReject={rejectProposal} />)}
      <DiscardConfirmModal open={discardOpen} busy={discarding} name={meta.name} onCancel={() => setDiscardOpen(false)} onConfirm={() => void confirmDiscard()} />
      <GuideModal open={guide.open} onClose={guide.close} previews={guidePreviews} />
    </>
  );
}

export default RehearsalStudioClient;