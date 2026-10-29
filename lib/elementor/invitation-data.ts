/**
 * Place at: src/lib/elementor/invitation-data.ts
 *
 * Single source of truth for "dynamic fields".
 * Used by: ElementorBuilder (preview), CodeEditor (autocomplete + preview),
 * and your PUBLIC invitation page / buyer editor (same resolver => same output).
 */

/* -------------------------------------------------------------------------- */
/* Data shape (what a buyer fills in)                                         */
/* -------------------------------------------------------------------------- */

export type InvitationData = {
  names: { bride: string; groom: string };
  title: string;
  event: { date: string; time: string };
  venue: { name: string; address: string; mapUrl: string };
  thumbnail: string;
  gallery: string[];
  videos: string[];
  music: string[];
  /** Buyer-editable custom slots created in the builder ("slot.<key>"). */
  slots: Record<string, string>;
};

export const EMPTY_DATA: InvitationData = {
  names: { bride: "", groom: "" },
  title: "",
  event: { date: "", time: "" },
  venue: { name: "", address: "", mapUrl: "" },
  thumbnail: "",
  gallery: [],
  videos: [],
  music: [],
  slots: {},
};

const rec = (v: unknown): Record<string, unknown> =>
  v && typeof v === "object" && !Array.isArray(v)
    ? (v as Record<string, unknown>)
    : {};
const str = (v: unknown, d = ""): string =>
  typeof v === "string" ? v : typeof v === "number" ? String(v) : d;
const strs = (v: unknown): string[] =>
  Array.isArray(v)
    ? v.filter((x): x is string => typeof x === "string" && x.length > 0)
    : [];

/** Defensive parse of anything stored in invitations.data (JSONB). */
export function normalizeData(raw: unknown): InvitationData {
  const r = rec(raw);
  const names = rec(r.names);
  const event = rec(r.event);
  const venue = rec(r.venue);
  const slots: Record<string, string> = {};
  for (const [k, v] of Object.entries(rec(r.slots))) {
    if (typeof v === "string") slots[k] = v;
  }
  return {
    names: { bride: str(names.bride), groom: str(names.groom) },
    title: str(r.title),
    event: { date: str(event.date), time: str(event.time) },
    venue: {
      name: str(venue.name),
      address: str(venue.address),
      mapUrl: str(venue.mapUrl),
    },
    thumbnail: str(r.thumbnail),
    gallery: strs(r.gallery),
    videos: strs(r.videos),
    music: strs(r.music),
    slots,
  };
}

/**
 * Build the final data for a PUBLIC page from DB rows.
 * `defaults` = template-level media (templates.gallery_urls etc.) used as fallback.
 */
export function buildInvitationData(
  src: {
    data?: unknown;
    title?: string | null;
    event_date?: string | null;
    event_time?: string | null;
    venue_details?: unknown;
    selected_music_url?: string | null;
  },
  defaults?: Partial<
    Pick<InvitationData, "thumbnail" | "gallery" | "videos" | "music">
  >,
): InvitationData {
  const base = normalizeData(src.data);
  const venue = rec(src.venue_details);
  const music = base.music.length
    ? base.music
    : src.selected_music_url
      ? [src.selected_music_url]
      : (defaults?.music ?? []);
  return {
    ...base,
    title: src.title || base.title,
    event: {
      date: src.event_date ? String(src.event_date).slice(0, 10) : base.event.date,
      time: src.event_time ? String(src.event_time).slice(0, 5) : base.event.time,
    },
    venue: {
      name: str(venue.name, base.venue.name),
      address: str(venue.address, base.venue.address),
      mapUrl: str(venue.mapUrl, base.venue.mapUrl),
    },
    thumbnail: base.thumbnail || defaults?.thumbnail || "",
    gallery: base.gallery.length ? base.gallery : (defaults?.gallery ?? []),
    videos: base.videos.length ? base.videos : (defaults?.videos ?? []),
    music,
  };
}

/* -------------------------------------------------------------------------- */
/* Paths & tokens                                                             */
/* -------------------------------------------------------------------------- */

const normPath = (p: string) =>
  p.startsWith("slot.") ? `slots.${p.slice(5)}` : p;

export function getPath(src: unknown, path: string): unknown {
  let cur: unknown = src;
  for (const part of normPath(path).split(".")) {
    if (cur === null || typeof cur !== "object") return undefined;
    cur = (cur as Record<string, unknown>)[part];
  }
  return cur;
}

const escapeHtml = (s: string) =>
  s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");

const EACH = /\{\{#each\s+([\w.]+)\s*\}\}([\s\S]*?)\{\{\/each\}\}/g;
const TOKEN = /\{\{\s*([\w.]+)\s*\}\}/g;

/**
 * Replaces {{path}} and {{#each list}}…{{this}}…{{@index}}…{{/each}}.
 * Unknown tokens are left untouched so mistakes are visible.
 */
export function resolveText(
  text: string,
  data: InvitationData,
  escape = false,
): string {
  const esc = (s: string) => (escape ? escapeHtml(s) : s);
  const looped = text.replace(EACH, (_m: string, path: string, body: string) => {
    const list = getPath(data, path);
    if (!Array.isArray(list)) return "";
    return list
      .map((item: unknown, i: number) =>
        body
          .replace(/\{\{\s*this\s*\}\}/g, esc(String(item)))
          .replace(/\{\{\s*@index\s*\}\}/g, String(i)),
      )
      .join("");
  });
  return looped.replace(TOKEN, (m: string, path: string) => {
    const v = getPath(data, path);
    return typeof v === "string" || typeof v === "number" ? esc(String(v)) : m;
  });
}

/* -------------------------------------------------------------------------- */
/* Element resolution                                                         */
/* -------------------------------------------------------------------------- */

type ElLike = { type: string; content: Record<string, any> };

export const DATA_MARK = "/*__riwa_data__*/";

/** Makes `data`, `INVITATION` and `useInvitation()` available inside JSX/TSX code. */
export function injectReactData(code: string, data: InvitationData): string {
  if (code.includes(DATA_MARK)) return code;
  const json = JSON.stringify(data).replace(/</g, "\\u003c");
  return `${DATA_MARK}const data = ${json};\nconst INVITATION = data;\nfunction useInvitation() { return data; }\n${code}`;
}

export const defaultBindProp = (type: string): "src" | "text" =>
  type === "image" || type === "video" || type === "audio" ? "src" : "text";

/**
 * Returns a COPY of the element with every {{token}} replaced and `_bind`
 * applied. Run this on every element before handing it to WidgetRenderer
 * (in the builder AND on the public page).
 */
export function resolveElement<T extends ElLike>(
  el: T,
  data: InvitationData,
): T {
  const content: Record<string, any> = { ...el.content };
  const lang = typeof content.lang === "string" ? content.lang : "html";
  const isReact = lang === "jsx" || lang === "tsx";

  for (const [k, v] of Object.entries(content)) {
    if (k.startsWith("_") || typeof v !== "string") continue;
    if (k === "code" && isReact) continue;
    content[k] = resolveText(v, data, k === "code" && lang === "html");
  }

  const bind = content._bind;
  if (typeof bind === "string" && bind) {
    const v = getPath(data, bind);
    if (typeof v === "string" && v) {
      const prop =
        typeof content._bindProp === "string" && content._bindProp
          ? content._bindProp
          : defaultBindProp(el.type);
      content[prop] = v;
    }
  }

  if (isReact && typeof content.code === "string") {
    content.code = injectReactData(content.code, data);
  }
  return { ...el, content };
}

/* -------------------------------------------------------------------------- */
/* Buyer-editable slots (saved into design_schema.slots)                       */
/* -------------------------------------------------------------------------- */

export type SlotDef = {
  key: string;
  label: string;
  kind: "image" | "video" | "audio" | "text";
  default: string;
};

export function collectSlots<T extends ElLike>(els: T[]): SlotDef[] {
  const out: SlotDef[] = [];
  const seen = new Set<string>();
  for (const el of els) {
    const bind = el.content._bind;
    if (typeof bind !== "string" || !bind.startsWith("slot.")) continue;
    const key = bind.slice(5);
    if (!key || seen.has(key)) continue;
    seen.add(key);
    const prop =
      typeof el.content._bindProp === "string" && el.content._bindProp
        ? el.content._bindProp
        : defaultBindProp(el.type);
    const kind: SlotDef["kind"] =
      el.type === "image" || el.type === "video" || el.type === "audio"
        ? el.type
        : "text";
    out.push({
      key,
      label:
        typeof el.content._label === "string" && el.content._label
          ? el.content._label
          : key,
      kind,
      default: typeof el.content[prop] === "string" ? el.content[prop] : "",
    });
  }
  return out;
}

/* -------------------------------------------------------------------------- */
/* Field catalogue (builder inspector + code editor autocomplete)              */
/* -------------------------------------------------------------------------- */

export type FieldOption = { label: string; value: string };

export const BINDING_OPTIONS: FieldOption[] = [
  { label: "Bride name", value: "names.bride" },
  { label: "Groom name", value: "names.groom" },
  { label: "Event title", value: "title" },
  { label: "Event date", value: "event.date" },
  { label: "Event time", value: "event.time" },
  { label: "Venue name", value: "venue.name" },
  { label: "Venue address", value: "venue.address" },
  { label: "Venue map URL", value: "venue.mapUrl" },
  { label: "Thumbnail / cover", value: "thumbnail" },
  { label: "Gallery image 1", value: "gallery.0" },
  { label: "Gallery image 2", value: "gallery.1" },
  { label: "Gallery image 3", value: "gallery.2" },
  { label: "Gallery image 4", value: "gallery.3" },
  { label: "Gallery image 5", value: "gallery.4" },
  { label: "Gallery image 6", value: "gallery.5" },
  { label: "Background video", value: "videos.0" },
  { label: "Main music", value: "music.0" },
];

/** "gallery.0" -> "gallery[0]" for JS/TSX code. */
export const toJsPath = (p: string) => p.replace(/\.(\d+)/g, "[$1]");

/** What gets inserted into the code editor for each language. */
export function tokenFor(path: string, lang: "html" | "css" | "jsx" | "tsx") {
  return lang === "jsx" || lang === "tsx"
    ? `data.${toJsPath(path)}`
    : `{{${path}}}`;
}

export const LOOP_SNIPPET = {
  html: `{{#each gallery}}\n  <img src="{{this}}" alt="" style="width:100%;border-radius:12px" />\n{{/each}}`,
  react: `{data.gallery.map((url) => (\n  <img key={url} src={url} alt="" style={{ width: "100%", borderRadius: 12 }} />\n))}`,
};

/** Type declarations so Monaco gives IntelliSense for `data.` in JSX/TSX. */
export const DATA_DTS = `
interface InvitationData {
  names: { bride: string; groom: string };
  title: string;
  event: { date: string; time: string };
  venue: { name: string; address: string; mapUrl: string };
  thumbnail: string;
  gallery: string[];
  videos: string[];
  music: string[];
  slots: Record<string, string>;
}
declare const data: InvitationData;
declare const INVITATION: InvitationData;
declare function useInvitation(): InvitationData;
`;