"use client";

import * as React from "react";
import Link from "next/link";
import { AnimatePresence, motion } from "framer-motion";
import { icons } from "lucide-react";
import {
  AlignCenter,
  AlignLeft,
  AlignRight,
  ArrowLeft,
  CalendarDays,
  ChevronDown,
  Code,
  Copy,
  Crown,
  Eye,
  EyeOff,
  GripVertical,
  ImagePlus,
  Image as ImageIcon,
  Images,
  LayoutTemplate,
  Link2,
  Loader2,
  MapPin,
  Maximize2,
  Minimize2,
  Monitor,
  Music,
  Plus,
  Redo2,
  Save,
  Search,
  Smartphone,
  Tablet,
  Trash2,
  Type,
  Undo2,
  Users,
  Video,
  X,
  Layers,
  FilePlus2,
} from "lucide-react";

import {
  WIDGET_REGISTRY,
  type WidgetDefinition,
} from "@/lib/elementor/widgets";
import {
  BINDING_OPTIONS,
  collectSlots,
  defaultBindProp,
  normalizeData,
  resolveElement,
  type InvitationData,
} from "@/lib/elementor/invitation-data";
import { toast } from "@/components/ui/toast";
import { useCategories } from "@/hooks/useCategories";
import { CategoryModal } from "@/components/admin/models/CategoryModal";
import { AceternitySelect } from "@/components/ui/aceternity-select";
import { apiClient } from "@/lib/api/api_base";
import {
  WidgetRenderer,
  type BuilderElement,
  type CustomCode,
} from "./WidgetRenderer";
import { CodeEditor, CodePreview, type CodeLang } from "./CodeEditor";

/* ========================================================================== */
/* Constants & helpers                                                        */
/* ========================================================================== */

const genId = () => `el_${Math.random().toString(36).slice(2, 10)}`;
const genSlotKey = (prefix: string) =>
  `${prefix}_${Math.random().toString(36).slice(2, 6)}`;
const DEVICES = { desktop: 1200, tablet: 768, mobile: 375 } as const;
type Device = keyof typeof DEVICES;

const REGISTRY: Record<string, WidgetDefinition> = Object.fromEntries(
  WIDGET_REGISTRY.map((w) => [w.type, w]),
);
const CATEGORIES = Array.from(new Set(WIDGET_REGISTRY.map((w) => w.category)));
const ICON_NAMES: string[] = Object.keys(icons);

type Asset = {
  url: string;
  kind: "image" | "video" | "audio" | "other";
  name: string;
  at: number;
};
const ASSET_KEY = "riwainvite:recent-assets";
const PLACEHOLDER_IMG = "https://placehold.co/600x400/png?text=Photo";

const ANIMATIONS: Record<string, { initial: any; animate: any }> = {
  none: { initial: {}, animate: {} },
  fadeIn: { initial: { opacity: 0 }, animate: { opacity: 1 } },
  slideUp: { initial: { opacity: 0, y: 50 }, animate: { opacity: 1, y: 0 } },
  slideDown: { initial: { opacity: 0, y: -50 }, animate: { opacity: 1, y: 0 } },
  slideLeft: { initial: { opacity: 0, x: 60 }, animate: { opacity: 1, x: 0 } },
  zoomIn: {
    initial: { opacity: 0, scale: 0.92 },
    animate: { opacity: 1, scale: 1 },
  },
};

function parseCss(raw: string): Record<string, string> {
  const out: Record<string, string> = {};
  raw.split(";").forEach((d) => {
    const i = d.indexOf(":");
    if (i < 1) return;
    const k = d.slice(0, i).trim();
    const v = d.slice(i + 1).trim();
    if (!k || !v) return;
    out[
      k.startsWith("--")
        ? k
        : k.replace(/-([a-z])/g, (_m: string, c: string) => c.toUpperCase())
    ] = v;
  });
  return out;
}
const toCss = (s: Record<string, string>) =>
  Object.entries(s)
    .map(
      ([k, v]) =>
        `${k.startsWith("--") ? k : k.replace(/[A-Z]/g, (m) => "-" + m.toLowerCase())}: ${v};`,
    )
    .join("\n");

const pkr = new Intl.NumberFormat("en-PK", {
  style: "currency",
  currency: "PKR",
  maximumFractionDigits: 0,
});

const layerName = (el: BuilderElement) => {
  const raw = el.content.text ?? el.content.title ?? el.content.name ?? "";
  const t = String(raw).trim().slice(0, 30);
  return t || REGISTRY[el.type]?.name || el.type;
};

const labelOf = (k: string) =>
  k
    .replace(/([A-Z])/g, " $1")
    .replace(/[_-]/g, " ")
    .replace(/^\w/, (c) => c.toUpperCase());

/* ---- Dynamic (data-bound) widgets --------------------------------------- */
type IconCmp = React.ComponentType<{ className?: string }>;
type DynItem = {
  id: string;
  name: string;
  icon: IconCmp;
  /** Base widget type from WIDGET_REGISTRY this is built on. */
  type: string;
  make: () => Record<string, unknown>;
};

const GALLERY_HTML = `<div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(140px,1fr));gap:8px">
{{#each gallery}}
  <img src="{{this}}" alt="" style="width:100%;aspect-ratio:1;object-fit:cover;border-radius:12px" />
{{/each}}
</div>`;

const DYNAMIC: DynItem[] = [
  {
    id: "couple",
    name: "Couple names",
    icon: Users,
    type: "heading",
    make: () => ({ text: "{{names.bride}} & {{names.groom}}", _bind: "names" }),
  },
  {
    id: "bride",
    name: "Bride name",
    icon: Type,
    type: "heading",
    make: () => ({ text: "{{names.bride}}", _bind: "names.bride" }),
  },
  {
    id: "groom",
    name: "Groom name",
    icon: Type,
    type: "heading",
    make: () => ({ text: "{{names.groom}}", _bind: "names.groom" }),
  },
  {
    id: "date",
    name: "Event date",
    icon: CalendarDays,
    type: "text",
    make: () => ({ text: "{{event.date}}", _bind: "event.date" }),
  },
  {
    id: "venue",
    name: "Venue",
    icon: MapPin,
    type: "text",
    make: () => ({ text: "{{venue.name}}", _bind: "venue.name" }),
  },
  {
    id: "cover",
    name: "Thumbnail image",
    icon: ImageIcon,
    type: "image",
    make: () => ({ _bind: "thumbnail" }),
  },
  {
    id: "gallery",
    name: "Gallery images",
    icon: Images,
    type: "html",
    make: () => ({ code: GALLERY_HTML, lang: "html", _bind: "gallery" }),
  },
  {
    id: "music",
    name: "Main music",
    icon: Music,
    type: "audio",
    make: () => ({ _bind: "music.0" }),
  },
  {
    id: "video",
    name: "Background video",
    icon: Video,
    type: "video",
    make: () => ({ _bind: "videos.0" }),
  },
  {
    id: "slotImage",
    name: "Image slot",
    icon: ImagePlus,
    type: "image",
    make: () => ({
      src: PLACEHOLDER_IMG,
      _bind: `slot.${genSlotKey("image")}`,
      _label: "Photo",
    }),
  },
  {
    id: "slotText",
    name: "Text slot",
    icon: Type,
    type: "text",
    make: () => ({
      text: "Your text here",
      _bind: `slot.${genSlotKey("text")}`,
      _label: "Custom text",
    }),
  },
];
const DYNAMIC_AVAILABLE = DYNAMIC.filter((d) => !!REGISTRY[d.type]);

/** Dropdown choices for the "Bind to" inspector field. */
const BIND_CHOICES = [
  { label: "None (static)", value: "" },
  ...BINDING_OPTIONS,
  { label: "Couple names (both)", value: "names" },
  { label: "Gallery (all images)", value: "gallery" },
  { label: "Custom slot (buyer can edit)", value: "slot" },
];

/* ---- Cloudinary --------------------------------------------------------- */
function useCloudinary() {
  const [busy, setBusy] = React.useState(0);
  const [assets, setAssets] = React.useState<Asset[]>([]);

  React.useEffect(() => {
    try {
      setAssets(JSON.parse(localStorage.getItem(ASSET_KEY) || "[]") as Asset[]);
    } catch {
      /* ignore */
    }
  }, []);

  const remember = (a: Asset) =>
    setAssets((prev) => {
      const next = [a, ...prev.filter((p) => p.url !== a.url)].slice(0, 60);
      try {
        localStorage.setItem(ASSET_KEY, JSON.stringify(next));
      } catch {
        /* ignore */
      }
      return next;
    });

  const upload = React.useCallback(
    async (file: File): Promise<string | null> => {
      setBusy((n) => n + 1);
      try {
        const sigRes = await apiClient.get(
          "/admin/dashboard/cloudinary-signature",
        );
        const sig = sigRes.data.data;
        const fd = new FormData();
        fd.append("file", file);
        fd.append("api_key", sig.apiKey);
        fd.append("timestamp", sig.timestamp.toString());
        fd.append("signature", sig.signature);
        fd.append("folder", sig.folder);
        const res = await fetch(
          `https://api.cloudinary.com/v1_1/${sig.cloudName}/auto/upload`,
          { method: "POST", body: fd },
        );
        const json = await res.json();
        if (!res.ok || !json.secure_url)
          throw new Error(json?.error?.message || "Upload failed");
        const kind: Asset["kind"] =
          json.resource_type === "image"
            ? "image"
            : file.type.startsWith("audio")
              ? "audio"
              : json.resource_type === "video"
                ? "video"
                : "other";
        remember({
          url: json.secure_url,
          kind,
          name: file.name,
          at: Date.now(),
        });
        toast.add({
          title: "Uploaded",
          description: `${file.name} is ready.`,
          type: "success",
        });
        return json.secure_url as string;
      } catch (e: any) {
        toast.add({
          title: "Upload failed",
          description: e?.message ?? "Please try again.",
          type: "error",
        });
        return null;
      } finally {
        setBusy((n) => n - 1);
      }
    },
    [],
  );

  return { upload, uploading: busy > 0, assets };
}
type Cloud = ReturnType<typeof useCloudinary>;

/* ========================================================================== */
/* Inspector controls                                                         */
/* ========================================================================== */

const inputCls =
  "h-9 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm text-slate-800 shadow-sm outline-none transition placeholder:text-slate-400 hover:border-orange-300 focus:border-orange-500 focus-visible:ring-2 focus-visible:ring-orange-500/30";
const areaCls = `${inputCls} h-auto py-2`;

function Field({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <label className="block space-y-1.5">
      <span className="text-xs font-medium text-slate-600">{label}</span>
      {children}
    </label>
  );
}

function Accordion({
  title,
  defaultOpen,
  children,
}: {
  title: string;
  defaultOpen?: boolean;
  children: React.ReactNode;
}) {
  const [open, setOpen] = React.useState(!!defaultOpen);
  return (
    <div className="border-b border-slate-100">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="flex w-full items-center justify-between px-4 py-3 text-sm font-semibold text-slate-800 hover:bg-orange-50/60"
      >
        {title}
        <ChevronDown
          className={`size-4 text-slate-400 transition-transform ${open ? "rotate-180" : ""}`}
        />
      </button>
      <AnimatePresence initial={false}>
        {open && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.18 }}
            className="overflow-hidden"
          >
            <div className="space-y-3 px-4 pb-4">{children}</div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function ColorField({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
}) {
  const hex = /^#[0-9a-f]{6}$/i.test(value) ? value : "#000000";
  return (
    <Field label={label}>
      <div className="flex items-center gap-2">
        <input
          type="color"
          value={hex}
          onChange={(e) => onChange(e.target.value)}
          className="size-9 shrink-0 cursor-pointer rounded-lg border border-slate-200 bg-white p-1"
        />
        <input
          className={inputCls}
          value={value}
          placeholder="#000000 or rgba()"
          onChange={(e) => onChange(e.target.value)}
        />
      </div>
    </Field>
  );
}

function SpacingBox({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
}) {
  const p = (value || "").trim().split(/\s+/).filter(Boolean);
  const t = p[0] ?? "";
  const r = p[1] ?? (p.length ? t : "");
  const b = p[2] ?? (p.length ? t : "");
  const l = p[3] ?? (p.length ? r : "");
  const vals = [t, r, b, l];
  const set = (i: number, v: string) => {
    const a = [...vals];
    a[i] = v;
    onChange(a.every((x) => !x) ? "" : a.map((x) => x || "0").join(" "));
  };
  return (
    <div>
      <span className="text-xs font-medium text-slate-600">{label}</span>
      <div className="mt-1.5 grid grid-cols-4 gap-1.5">
        {["Top", "Right", "Bottom", "Left"].map((s, i) => (
          <div key={s}>
            <input
              className={`${inputCls} px-1.5 text-center`}
              value={vals[i] ?? ""}
              onChange={(e) => set(i, e.target.value)}
              placeholder="0"
              aria-label={`${label} ${s}`}
            />
            <div className="mt-1 text-center text-[10px] text-slate-400">
              {s}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function MediaField({
  label,
  kind,
  value,
  onChange,
  cloud,
}: {
  label: string;
  kind: "image" | "video" | "audio";
  value: string;
  onChange: (v: string) => void;
  cloud: Cloud;
}) {
  const input = React.useRef<HTMLInputElement>(null);
  const [lib, setLib] = React.useState(false);
  const pool = cloud.assets.filter((a) => a.kind === kind);
  const pick = async (f?: File | null) => {
    if (!f) return;
    const u = await cloud.upload(f);
    if (u) onChange(u);
  };
  return (
    <Field label={label}>
      <div className="space-y-2">
        {value && (
          <div className="relative overflow-hidden rounded-xl border border-slate-200 bg-slate-50">
            {kind === "image" ? (
              <img src={value} alt="" className="h-28 w-full object-cover" />
            ) : kind === "video" ? (
              <video src={value} className="h-28 w-full object-cover" />
            ) : (
              <audio src={value} controls className="w-full" />
            )}
            <button
              type="button"
              onClick={() => onChange("")}
              aria-label="Remove"
              className="absolute right-1.5 top-1.5 rounded-full bg-white/90 p-1 shadow hover:text-red-600"
            >
              <X className="size-3.5" />
            </button>
          </div>
        )}
        <input
          ref={input}
          type="file"
          hidden
          accept={`${kind}/*`}
          onChange={(e) => {
            void pick(e.target.files?.[0]);
            e.target.value = "";
          }}
        />
        <div className="flex gap-2">
          <button
            type="button"
            disabled={cloud.uploading}
            onClick={() => input.current?.click()}
            className="flex h-9 flex-1 items-center justify-center gap-2 rounded-lg border border-dashed border-slate-300 bg-slate-50 text-xs font-medium text-slate-600 transition hover:border-orange-400 hover:bg-orange-50 disabled:opacity-60"
          >
            {cloud.uploading ? (
              <Loader2 className="size-4 animate-spin" />
            ) : kind === "image" ? (
              <ImagePlus className="size-4" />
            ) : kind === "video" ? (
              <Video className="size-4" />
            ) : (
              <Music className="size-4" />
            )}
            {cloud.uploading
              ? "Uploading…"
              : value
                ? "Replace"
                : `Upload ${kind}`}
          </button>
          <button
            type="button"
            onClick={() => setLib((o) => !o)}
            className="h-9 rounded-lg border border-slate-200 bg-white px-3 text-xs text-slate-600 hover:border-orange-300"
          >
            Library
          </button>
        </div>
        {lib && (
          <div className="grid max-h-40 grid-cols-4 gap-1.5 overflow-y-auto rounded-lg border border-slate-200 bg-white p-1.5">
            {pool.length === 0 && (
              <p className="col-span-4 p-2 text-xs text-slate-400">
                No recent {kind} uploads yet.
              </p>
            )}
            {pool.map((a) => (
              <button
                key={a.url}
                type="button"
                onClick={() => {
                  onChange(a.url);
                  setLib(false);
                }}
                className="aspect-square overflow-hidden rounded-md border border-transparent bg-slate-100 hover:border-orange-400"
              >
                {kind === "image" ? (
                  <img
                    src={a.url}
                    alt={a.name}
                    className="size-full object-cover"
                  />
                ) : (
                  <span className="grid size-full place-items-center p-1 text-[10px] text-slate-500">
                    {a.name}
                  </span>
                )}
              </button>
            ))}
          </div>
        )}
      </div>
    </Field>
  );
}

function GalleryField({
  urls,
  onChange,
  cloud,
}: {
  urls: string[];
  onChange: (v: string[]) => void;
  cloud: Cloud;
}) {
  const input = React.useRef<HTMLInputElement>(null);
  const add = async (files: FileList | null) => {
    if (!files) return;
    const added: string[] = [];
    for (const f of Array.from(files)) {
      const u = await cloud.upload(f);
      if (u) added.push(u);
    }
    if (added.length) onChange([...urls, ...added]);
  };
  return (
    <Field label="Gallery images">
      <div>
        <input
          ref={input}
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
            <div
              key={u}
              className="group relative aspect-square overflow-hidden rounded-lg border border-slate-200"
            >
              <img src={u} alt="" className="size-full object-cover" />
              <button
                type="button"
                aria-label="Remove image"
                onClick={() => onChange(urls.filter((x) => x !== u))}
                className="absolute inset-0 grid place-items-center bg-black/40 text-white opacity-0 transition group-hover:opacity-100"
              >
                <X className="size-4" />
              </button>
            </div>
          ))}
          <button
            type="button"
            onClick={() => input.current?.click()}
            disabled={cloud.uploading}
            className="grid aspect-square place-items-center rounded-lg border border-dashed border-slate-300 text-slate-400 hover:border-orange-400 hover:text-orange-500"
          >
            {cloud.uploading ? (
              <Loader2 className="size-4 animate-spin" />
            ) : (
              <Plus className="size-4" />
            )}
          </button>
        </div>
      </div>
    </Field>
  );
}

function PaletteButton({
  dragId,
  icon: Icon,
  name,
  accent,
  onAdd,
  onDragEnd,
}: {
  dragId: string;
  icon: IconCmp;
  name: string;
  accent?: boolean;
  onAdd: () => void;
  onDragEnd: () => void;
}) {
  return (
    <button
      type="button"
      draggable
      onDragStart={(e) => {
        e.dataTransfer.setData("application/x-widget", dragId);
        e.dataTransfer.effectAllowed = "copy";
      }}
      onDragEnd={onDragEnd}
      onClick={onAdd}
      className={`flex cursor-grab flex-col items-center justify-center rounded-xl border p-3 shadow-sm transition hover:-translate-y-0.5 hover:border-orange-300 hover:bg-white hover:shadow-md active:cursor-grabbing ${accent ? "border-orange-100 bg-orange-50/60" : "border-slate-100 bg-slate-50/60"}`}
    >
      <Icon
        className={`mb-1.5 size-5 ${accent ? "text-orange-500" : "text-slate-600"}`}
      />
      <span className="text-center text-[10px] leading-tight text-slate-500">
        {name}
      </span>
    </button>
  );
}

/* ---- Style controls ----------------------------------------------------- */
type StyleApi = {
  get: (k: string) => string;
  set: (k: string, v: string) => void;
};

const Row = ({ children }: { children: React.ReactNode }) => (
  <div className="grid grid-cols-2 gap-2">{children}</div>
);
const Txt = ({
  api,
  k,
  label,
  placeholder,
}: {
  api: StyleApi;
  k: string;
  label: string;
  placeholder?: string;
}) => (
  <Field label={label}>
    <input
      className={inputCls}
      value={api.get(k)}
      placeholder={placeholder}
      onChange={(e) => api.set(k, e.target.value)}
    />
  </Field>
);
const Sel = ({
  api,
  k,
  label,
  options,
}: {
  api: StyleApi;
  k: string;
  label: string;
  options: string[];
}) => (
  <Field label={label}>
    <AceternitySelect
      value={api.get(k)}
      onChange={(v) => api.set(k, v)}
      options={["", ...options].map((o) => ({
        value: o,
        label: o || "Default",
      }))}
    />
  </Field>
);

const FONTS = [
  "ui-sans-serif, system-ui, sans-serif",
  "Georgia, serif",
  "'Times New Roman', serif",
  "ui-monospace, monospace",
  "'Brush Script MT', cursive",
  "'Trebuchet MS', sans-serif",
  "Verdana, sans-serif",
  "'Courier New', monospace",
  "fantasy",
].map((f) => ({
  value: f,
  label: (f.split(",")[0] ?? f).replace(/['"]/g, ""),
}));

function BackgroundSection({ api, cloud }: { api: StyleApi; cloud: Cloud }) {
  const bi = api.get("backgroundImage");
  const [tab, setTab] = React.useState<"color" | "gradient" | "image">(
    bi.startsWith("url(")
      ? "image"
      : bi.includes("gradient")
        ? "gradient"
        : "color",
  );
  const g = /linear-gradient\((\d+)deg,\s*([^,]+),\s*([^)]+)\)/.exec(bi);
  const angle = g?.[1] ?? "135";
  const c1 = g?.[2] ?? "#f97316";
  const c2 = g?.[3] ?? "#fde68a";
  const setG = (a: string, x: string, y: string) =>
    api.set("backgroundImage", `linear-gradient(${a}deg, ${x}, ${y})`);
  const img = /url\("?([^")]+)"?\)/.exec(bi)?.[1] ?? "";
  return (
    <>
      <div className="grid grid-cols-3 gap-1 rounded-lg bg-slate-100 p-1">
        {(["color", "gradient", "image"] as const).map((t) => (
          <button
            key={t}
            type="button"
            onClick={() => setTab(t)}
            className={`rounded-md py-1 text-xs font-medium capitalize ${tab === t ? "bg-white text-orange-600 shadow-sm" : "text-slate-500"}`}
          >
            {t}
          </button>
        ))}
      </div>
      {tab === "color" && (
        <ColorField
          label="Background color"
          value={api.get("backgroundColor")}
          onChange={(v) => api.set("backgroundColor", v)}
        />
      )}
      {tab === "gradient" && (
        <>
          <ColorField
            label="From"
            value={c1}
            onChange={(v) => setG(angle, v, c2)}
          />
          <ColorField
            label="To"
            value={c2}
            onChange={(v) => setG(angle, c1, v)}
          />
          <Field label={`Angle · ${angle}°`}>
            <input
              type="range"
              min={0}
              max={360}
              value={angle}
              onChange={(e) => setG(e.target.value, c1, c2)}
              className="w-full accent-orange-500"
            />
          </Field>
          <button
            type="button"
            className="text-xs text-slate-500 underline"
            onClick={() => api.set("backgroundImage", "")}
          >
            Clear gradient
          </button>
        </>
      )}
      {tab === "image" && (
        <>
          <MediaField
            label="Background image"
            kind="image"
            value={img}
            onChange={(v) => api.set("backgroundImage", v ? `url("${v}")` : "")}
            cloud={cloud}
          />
          <Row>
            <Sel
              api={api}
              k="backgroundSize"
              label="Size"
              options={["cover", "contain", "auto", "100% 100%"]}
            />
            <Sel
              api={api}
              k="backgroundPosition"
              label="Position"
              options={["center", "top", "bottom", "left", "right"]}
            />
          </Row>
          <Sel
            api={api}
            k="backgroundRepeat"
            label="Repeat"
            options={["no-repeat", "repeat", "repeat-x", "repeat-y"]}
          />
        </>
      )}
    </>
  );
}

function ShadowSection({ api }: { api: StyleApi }) {
  const m = /(-?\d+)px\s+(-?\d+)px\s+(\d+)px\s+(-?\d+)px\s+(.+)/.exec(
    api.get("boxShadow"),
  );
  const x = m?.[1] ?? "0";
  const y = m?.[2] ?? "8";
  const b = m?.[3] ?? "24";
  const s = m?.[4] ?? "0";
  const c = m?.[5] ?? "rgba(0,0,0,0.12)";
  const set = (nx = x, ny = y, nb = b, ns = s, nc = c) =>
    api.set("boxShadow", `${nx}px ${ny}px ${nb}px ${ns}px ${nc}`);
  const items: [string, string, (v: string) => void][] = [
    ["X", x, (v) => set(v)],
    ["Y", y, (v) => set(x, v)],
    ["Blur", b, (v) => set(x, y, v)],
    ["Spread", s, (v) => set(x, y, b, v)],
  ];
  return (
    <>
      <div className="grid grid-cols-4 gap-1.5">
        {items.map(([l, v, fn]) => (
          <div key={l}>
            <input
              className={`${inputCls} px-1.5 text-center`}
              value={v}
              onChange={(e) => fn(e.target.value)}
            />
            <div className="mt-1 text-center text-[10px] text-slate-400">
              {l}
            </div>
          </div>
        ))}
      </div>
      <ColorField
        label="Shadow color"
        value={c}
        onChange={(v) => set(x, y, b, s, v)}
      />
      <button
        type="button"
        className="text-xs text-slate-500 underline"
        onClick={() => api.set("boxShadow", "")}
      >
        Remove shadow
      </button>
    </>
  );
}

/* ========================================================================== */
/* Builder                                                                    */
/* ========================================================================== */

export function ElementorBuilder({
  initialTemplateId,
}: {
  initialTemplateId?: string;
}) {
  const cloud = useCloudinary();
  const { categories, refetch: refetchCats } = useCategories();

  const [device, setDevice] = React.useState<Device>("desktop");
  const [search, setSearch] = React.useState("");
  const [leftTab, setLeftTab] = React.useState<"widgets" | "layers" | "code">(
    "widgets",
  );
  const [preview, setPreview] = React.useState(false);
  const [layerDrop, setLayerDrop] = React.useState<number | null>(null);
  const [codeWide, setCodeWide] = React.useState(false);
  const [inspectorTab, setInspectorTab] = React.useState<
    "content" | "style" | "advanced"
  >("content");

  // ---- elements with undo/redo ----
  const [elements, setElementsState] = React.useState<BuilderElement[]>([]);
  const elRef = React.useRef<BuilderElement[]>([]);
  const past = React.useRef<BuilderElement[][]>([]);
  const future = React.useRef<BuilderElement[][]>([]);
  const last = React.useRef<{ k: string; t: number } | null>(null);
  const [hist, setHist] = React.useState({ undo: false, redo: false });
  const syncHist = () =>
    setHist({ undo: past.current.length > 0, redo: future.current.length > 0 });

  const commit = (
    fn: (els: BuilderElement[]) => BuilderElement[],
    key?: string,
  ) => {
    const cur = elRef.current;
    const next = fn(cur);
    if (next === cur) return;
    const now = Date.now();
    const prev = last.current;
    const coalesce = !!key && prev !== null && prev.k === key && now - prev.t < 700; // typing = one undo step
    last.current = key ? { k: key, t: now } : null;
    if (!coalesce) {
      past.current.push(cur);
      if (past.current.length > 100) past.current.shift();
    }
    future.current = [];
    elRef.current = next;
    setElementsState(next);
    syncHist();
  };
  const undo = () => {
    const p = past.current.pop();
    if (!p) return;
    future.current.push(elRef.current);
    elRef.current = p;
    setElementsState(p);
    syncHist();
  };
  const redo = () => {
    const f = future.current.pop();
    if (!f) return;
    past.current.push(elRef.current);
    elRef.current = f;
    setElementsState(f);
    syncHist();
  };

  const [selectedId, setSelectedId] = React.useState<string | null>(null);
  const selected = elements.find((e) => e.id === selectedId) ?? null;
  const def = selected ? REGISTRY[selected.type] : undefined;

  // ---- template meta (database fields) ----
  const [templateId, setTemplateId] = React.useState<string | null>(
    initialTemplateId || null,
  );

  const [name, setName] = React.useState("Untitled Template");
  const [description, setDescription] = React.useState("");
  const [categoryId, setCategoryId] = React.useState("");
  const [thumbnailUrl, setThumbnailUrl] = React.useState("");
  const [isPremium, setIsPremium] = React.useState(false);
  const [price, setPrice] = React.useState("0");
  const [status, setStatus] = React.useState<"draft" | "published">("draft");
  const [coreNames, setCoreNames] = React.useState({ bride: "", groom: "" });
  const [galleryUrls, setGalleryUrls] = React.useState<string[]>([]);
  const [videoUrls, setVideoUrls] = React.useState<string[]>([]);
  const [musicUrls, setMusicUrls] = React.useState<string[]>([]);
  const [pageSettings, setPageSettings] = React.useState({
    backgroundColor: "#ffffff",
    entranceAnimation: "none",
    customCss: "",
    customCode: "",
    customCodeLang: "html" as CodeLang,
  });
  const patchPage = (p: Partial<typeof pageSettings>) =>
    setPageSettings((s) => ({ ...s, ...p }));

  const [isSaving, setIsSaving] = React.useState(false);
  const [catModal, setCatModal] = React.useState(false);
  const [dropIndex, setDropIndex] = React.useState<number | null>(null);
  const canvasRef = React.useRef<HTMLDivElement>(null);

  // ---- live sample data used to resolve dynamic widgets in the canvas ----
  const previewData = React.useMemo<InvitationData>(
    () =>
      normalizeData({
        names: {
          bride: coreNames.bride || "Bride",
          groom: coreNames.groom || "Groom",
        },
        title: name,
        event: { date: "2026-12-12", time: "18:00" },
        venue: {
          name: "Grand Ballroom",
          address: "Main Boulevard, Lahore",
          mapUrl: "",
        },
        thumbnail: thumbnailUrl || PLACEHOLDER_IMG,
        gallery: galleryUrls.length
          ? galleryUrls
          : [PLACEHOLDER_IMG, PLACEHOLDER_IMG, PLACEHOLDER_IMG],
        videos: videoUrls,
        music: musicUrls,
        slots: {},
      }),
    [coreNames, name, thumbnailUrl, galleryUrls, videoUrls, musicUrls],
  );

  // ---- load existing template ----
  React.useEffect(() => {
    if (!initialTemplateId) return;

    const fetchTemplate = async () => {
      try {
        const res = await apiClient.get(
          `/admin/dashboard/templates/${initialTemplateId}`,
        );
        const data = res.data.data;

        setName(data.name || "Untitled Template");
        setDescription(data.description || "");
        setCategoryId(data.category_id || "");
        setThumbnailUrl(data.thumbnail_url || "");
        setStatus(data.status === "published" ? "published" : "draft");
        setIsPremium(Boolean(data.is_premium));
        setPrice(String(data.price || 0));
        setGalleryUrls(data.gallery_urls || []);
        setVideoUrls(data.video_urls || []);
        setMusicUrls(data.music_urls || []);

        if (data.core_names_config) {
          setCoreNames({
            bride: data.core_names_config.bride?.label || "",
            groom: data.core_names_config.groom?.label || "",
          });
        }

        if (data.design_schema) {
          if (data.design_schema.pageSettings) {
            setPageSettings(data.design_schema.pageSettings);
          }
          if (data.design_schema.elements) {
            setElementsState(data.design_schema.elements);
            elRef.current = data.design_schema.elements;
          }
        }

        toast.add({
          title: "Success",
          description: "Template data loaded successfully.",
          type: "success",
        });
      } catch (error: any) {
        console.error(
          "LOAD ERROR DETAILS:",
          error.response?.data || error.message,
        );
        toast.add({
          title: "Error",
          description: "Failed to load template data.",
          type: "error",
        });
      }
    };

    void fetchTemplate();
  }, [initialTemplateId]);

  /* ---- element mutations ---- */
  const makeEl = (
    type: string,
    content: Record<string, unknown>,
  ): BuilderElement => {
    const w = REGISTRY[type];
    return {
      id: genId(),
      type,
      content: { ...structuredClone(w?.defaultContent ?? {}), ...content },
      styles: {
        margin: "0px",
        padding: "10px",
        ...(w?.defaultStyles ?? {}),
      } as Record<string, string>,
      customCode: null,
    };
  };
  const insertEl = (el: BuilderElement, index: number) => {
    commit((els) => {
      const n = [...els];
      n.splice(index, 0, el);
      return n;
    });
    setSelectedId(el.id);
    setInspectorTab("content");
  };
  const insertAt = (w: WidgetDefinition, index: number) =>
    insertEl(makeEl(w.type, {}), index);
  const insertDynamic = (d: DynItem, index: number) =>
    insertEl(makeEl(d.type, d.make()), index);

  const moveTo = (id: string, index: number) =>
    commit((els) => {
      const from = els.findIndex((e) => e.id === id);
      if (from < 0) return els;
      const n = [...els];
      const [it] = n.splice(from, 1);
      if (!it) return els;
      n.splice(index > from ? index - 1 : index, 0, it);
      return n;
    });
  const remove = (id: string) => {
    commit((els) => els.filter((e) => e.id !== id));
    setSelectedId(null);
  };
  const duplicate = (id: string) => {
    const i = elRef.current.findIndex((e) => e.id === id);
    const src = elRef.current[i];
    if (i < 0 || !src) return;
    const copy: BuilderElement = { ...structuredClone(src), id: genId() };
    commit((els) => {
      const n = [...els];
      n.splice(i + 1, 0, copy);
      return n;
    });
    setSelectedId(copy.id);
  };
  const patchEl = (
    id: string,
    fn: (e: BuilderElement) => BuilderElement,
    key?: string,
  ) => commit((els) => els.map((e) => (e.id === id ? fn(e) : e)), key);
  const setContent = (k: string, v: any) => {
    if (!selected) return;
    patchEl(
      selected.id,
      (e) => ({ ...e, content: { ...e.content, [k]: v } }),
      `c:${selected.id}:${k}`,
    );
  };
  const setContents = (patch: Record<string, any>) => {
    if (!selected) return;
    patchEl(selected.id, (e) => ({
      ...e,
      content: { ...e.content, ...patch },
    }));
  };

  const toggleHidden = (id: string) =>
    patchEl(id, (e) => ({
      ...e,
      content: { ...e.content, _hidden: !e.content._hidden },
    }));

  // Style edits go to the base (desktop) styles, or to the tablet/mobile override bucket for the active device.
  const bucketOf = (e: BuilderElement) =>
    (e.content._r?.[device] ?? {}) as Record<string, string>;
  const styleApi: StyleApi | null = selected
    ? {
        get: (k) =>
          device === "desktop"
            ? (selected.styles[k] ?? "")
            : (bucketOf(selected)[k] ?? ""),
        set: (k, v) =>
          patchEl(
            selected.id,
            (e) => {
              if (device === "desktop") {
                const s = { ...e.styles };
                if (!v) delete s[k];
                else s[k] = v;
                return { ...e, styles: s };
              }
              const b = { ...bucketOf(e) };
              if (!v) delete b[k];
              else b[k] = v;
              return {
                ...e,
                content: {
                  ...e.content,
                  _r: { ...(e.content._r ?? {}), [device]: b },
                },
              };
            },
            `s:${device}:${selected.id}:${k}`,
          ),
      }
    : null;

  /* ---- keyboard ---- */
  React.useEffect(() => {
    const h = (e: KeyboardEvent) => {
      const t = e.target as HTMLElement;
      const typing =
        /input|textarea|select/i.test(t.tagName) ||
        t.isContentEditable ||
        !!t.closest(".monaco-editor");
      const mod = e.ctrlKey || e.metaKey;
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
        duplicate(selectedId);
      } else if ((e.key === "Delete" || e.key === "Backspace") && selectedId) {
        e.preventDefault();
        remove(selectedId);
      } else if (e.key === "Escape") {
        setSelectedId(null);
        setPreview(false);
      }
    };
    window.addEventListener("keydown", h);
    return () => window.removeEventListener("keydown", h);
  }, [selectedId]); // eslint-disable-line react-hooks/exhaustive-deps

  React.useEffect(() => {
    if (elements.length === 0) return;
    const h = (e: BeforeUnloadEvent) => {
      e.preventDefault();
      e.returnValue = "";
    };
    window.addEventListener("beforeunload", h);
    return () => window.removeEventListener("beforeunload", h);
  }, [elements.length]);

  /* ---- drag & drop ---- */
  const hasDnD = (e: React.DragEvent) =>
    e.dataTransfer.types.includes("application/x-widget") ||
    e.dataTransfer.types.includes("application/x-element");
  const computeIndex = (y: number) => {
    const wraps = Array.from(
      canvasRef.current?.querySelectorAll<HTMLElement>("[data-wrap]") ?? [],
    );
    for (let i = 0; i < wraps.length; i++) {
      const wrap = wraps[i];
      if (!wrap) continue;
      const r = wrap.getBoundingClientRect();
      if (y < r.top + r.height / 2) return i;
    }
    return wraps.length;
  };
  const onDragOver = (e: React.DragEvent) => {
    if (!hasDnD(e)) return;
    e.preventDefault();
    e.dataTransfer.dropEffect = e.dataTransfer.types.includes(
      "application/x-element",
    )
      ? "move"
      : "copy";
    setDropIndex(computeIndex(e.clientY));
  };
  const onDrop = (e: React.DragEvent) => {
    if (!hasDnD(e)) return;
    e.preventDefault();
    const idx = computeIndex(e.clientY);
    const w = e.dataTransfer.getData("application/x-widget");
    const el = e.dataTransfer.getData("application/x-element");
    if (w.startsWith("dyn:")) {
      const d = DYNAMIC_AVAILABLE.find((x) => `dyn:${x.id}` === w);
      if (d) insertDynamic(d, idx);
    } else {
      const def2 = w ? REGISTRY[w] : undefined;
      if (def2) insertAt(def2, idx);
      else if (el) moveTo(el, idx);
    }
    setDropIndex(null);
  };

  /* ---- widgets search ---- */
  const filtered = React.useMemo(() => {
    const q = search.trim().toLowerCase();
    return WIDGET_REGISTRY.filter(
      (w) =>
        !q ||
        w.name.toLowerCase().includes(q) ||
        w.category.toLowerCase().includes(q) ||
        w.type.includes(q),
    );
  }, [search]);
  const dynFiltered = React.useMemo(() => {
    const q = search.trim().toLowerCase();
    return DYNAMIC_AVAILABLE.filter(
      (d) => !q || d.name.toLowerCase().includes(q) || "dynamic".includes(q),
    );
  }, [search]);

  /* ---- code tab ---- */
  const selectedIsCode = selected?.type === "html";
  const codeValue: string = selected && selectedIsCode
    ? String(selected.content.code ?? "")
    : pageSettings.customCode;
  const codeLang: CodeLang =
    selected && selectedIsCode
      ? ((selected.content.lang as CodeLang | undefined) ?? "html")
      : pageSettings.customCodeLang;
  const onCodeChange = (v: string) => {
    if (selectedIsCode) setContent("code", v);
    else patchPage({ customCode: v });
  };
  const onLangChange = (l: CodeLang) => {
    if (selectedIsCode) setContent("lang", l);
    else patchPage({ customCodeLang: l });
  };
  const insertCodeBlock = () => {
    const w = REGISTRY["html"];
    const el: BuilderElement = {
      id: genId(),
      type: "html",
      content: {
        code: pageSettings.customCode,
        lang: pageSettings.customCodeLang,
      },
      styles: {
        margin: "0px",
        padding: "0px",
        ...(w?.defaultStyles ?? {}),
      } as Record<string, string>,
      customCode: null,
    };
    commit((els) => [...els, el]);
    setSelectedId(el.id);
    patchPage({ customCode: "" });
    toast.add({
      title: "Block added",
      description: "Your code is now a block on the canvas.",
      type: "success",
    });
  };

  /* ---- save ---- */
  const handleSave = async () => {
    // List every required field that is still empty so the user knows exactly what to fix.
    const missing: string[] = [];
    if (!name.trim()) missing.push("Template name");
    if (!categoryId) missing.push("Template category");
    if (!thumbnailUrl) missing.push("Thumbnail");
    if (missing.length > 0) {
      setSelectedId(null);
      setInspectorTab("content");
      toast.add({
        title: "Missing required fields",
        description: `Please fill in: ${missing.join(", ")}.`,
        type: "error",
      });
      return;
    }
    if (cloud.uploading) {
      toast.add({
        title: "Uploads in progress",
        description: "Wait for uploads to finish.",
        type: "error",
      });
      return;
    }

    setIsSaving(true);

    const payload = {
      name: name.trim(),
      description: description || null,
      category_id: categoryId,
      thumbnail_url: thumbnailUrl || PLACEHOLDER_IMG,
      is_premium: isPremium,
      price: parseFloat(price) || 0,
      custom_slug_price: 1000.0,
      gallery_urls: galleryUrls,
      video_urls: videoUrls,
      music_urls: musicUrls,

      core_names_config: {
        bride: {
          label: coreNames.bride || "Bride",
          type: "text",
          required: true,
        },
        groom: {
          label: coreNames.groom || "Groom",
          type: "text",
          required: true,
        },
      },

      status,
      design_schema: {
        version: 2,
        pageSettings,
        // Buyer-editable custom slots -> auto-generates the buyer's edit form
        slots: collectSlots(elements),
        elements: elements.map((e) => ({
          id: e.id,
          type: e.type,
          content: e.content,
          styles: e.styles,
          customCode:
            e.type === "html"
              ? ({
                  language: (e.content.lang as CodeLang | undefined) ?? "html",
                  code: String(e.content.code ?? ""),
                } as unknown as CustomCode)
              : (e.customCode ?? null),
        })),
      },
    };

    try {
      if (templateId) {
        await apiClient.patch(
          `/admin/dashboard/templates/${templateId}`,
          payload,
        );
        toast.add({
          title: "Updated",
          description: "Template updated successfully.",
          type: "success",
        });
      } else {
        const res = await apiClient.post("/admin/dashboard/templates", payload);
        const newId: string | undefined = res.data?.data?.template?.id;
        if (newId) setTemplateId(newId);

        toast.add({
          title: "Created",
          description: "Template saved. You are now in edit mode.",
          type: "success",
        });
      }
    } catch (error: any) {
      console.error(
        "SAVE ERROR DETAILS:",
        error.response?.data || error.message,
      );
      const errorMsg: string =
        error.response?.data?.error?.[0]?.message ||
        error.response?.data?.message ||
        "Failed to save template.";

      toast.add({
        title: "Save Failed",
        description: errorMsg,
        type: "error",
      });
    } finally {
      setIsSaving(false);
    }
  };

  /* ---- data binding (inspector) ---- */
  const bind: string =
    selected && typeof selected.content._bind === "string"
      ? selected.content._bind
      : "";
  const bindSel = bind.startsWith("slot.") ? "slot" : bind;
  const boundProp: string | null =
    selected &&
    bind &&
    !bind.startsWith("slot.") &&
    bind !== "gallery" &&
    bind !== "names"
      ? String(selected.content._bindProp ?? defaultBindProp(selected.type))
      : null;

  const onBindChange = (v: string) => {
    if (!selected) return;
    if (v === "slot") {
      const kind =
        selected.type === "image" ||
        selected.type === "video" ||
        selected.type === "audio"
          ? selected.type
          : "text";
      setContents({
        _bind: `slot.${genSlotKey(kind)}`,
        _bindProp: defaultBindProp(selected.type),
      });
    } else {
      setContents({
        _bind: v,
        _bindProp: v ? defaultBindProp(selected.type) : "",
      });
    }
  };

  const renderBoundEditor = () => {
    if (bind === "thumbnail")
      return (
        <MediaField
          label="Template thumbnail"
          kind="image"
          value={thumbnailUrl}
          onChange={setThumbnailUrl}
          cloud={cloud}
        />
      );
    if (bind === "gallery" || /^gallery\.\d+$/.test(bind))
      return (
        <GalleryField
          urls={galleryUrls}
          onChange={setGalleryUrls}
          cloud={cloud}
        />
      );
    if (bind === "videos.0")
      return (
        <MediaField
          label="Background video"
          kind="video"
          value={videoUrls[0] ?? ""}
          onChange={(u) => setVideoUrls(u ? [u] : [])}
          cloud={cloud}
        />
      );
    if (bind === "music.0")
      return (
        <MediaField
          label="Main music"
          kind="audio"
          value={musicUrls[0] ?? ""}
          onChange={(u) => setMusicUrls(u ? [u] : [])}
          cloud={cloud}
        />
      );
    if (bind === "names" || bind === "names.bride" || bind === "names.groom")
      return (
        <div className="grid grid-cols-2 gap-2">
          <input
            value={coreNames.bride}
            onChange={(e) =>
              setCoreNames({ ...coreNames, bride: e.target.value })
            }
            placeholder="Bride name"
            className={inputCls}
          />
          <input
            value={coreNames.groom}
            onChange={(e) =>
              setCoreNames({ ...coreNames, groom: e.target.value })
            }
            placeholder="Groom name"
            className={inputCls}
          />
        </div>
      );
    return null;
  };

  /* ---- content-tab fields inferred from the element's content ---- */
  const renderContentField = (k: string) => {
    if (!selected) return null;
    const v: string = selected.content[k] ?? "";
    const t = selected.type;
    if (/^src\d*$/.test(k) || k === "poster" || k === "image")
      return (
        <MediaField
          key={k}
          label={
            k === "src"
              ? labelOf(
                  t === "video" ? "video" : t === "audio" ? "audio" : "image",
                )
              : labelOf(k)
          }
          kind={
            t === "video" && k === "src"
              ? "video"
              : t === "audio" && k === "src"
                ? "audio"
                : "image"
          }
          value={v}
          onChange={(u) => setContent(k, u)}
          cloud={cloud}
        />
      );
    if (k === "tag")
      return (
        <Field key={k} label="HTML tag">
          <AceternitySelect
            value={v}
            onChange={(x) => setContent(k, x)}
            options={["h1", "h2", "h3", "h4", "h5", "h6"]}
          />
        </Field>
      );
    if (k === "icon")
      return (
        <Field key={k} label="Icon">
          <AceternitySelect
            searchable
            value={v}
            onChange={(x) => setContent(k, x)}
            options={ICON_NAMES}
          />
        </Field>
      );
    if (k === "code")
      return (
        <Field key={k} label="Code">
          <textarea
            rows={10}
            spellCheck={false}
            className={`${areaCls} font-mono text-xs`}
            value={v}
            onChange={(e) => setContent(k, e.target.value)}
          />
        </Field>
      );
    if (k === "text")
      return (
        <Field key={k} label="Text">
          <textarea
            rows={3}
            className={areaCls}
            value={v}
            onChange={(e) => setContent(k, e.target.value)}
          />
        </Field>
      );
    return (
      <Field key={k} label={labelOf(k)}>
        <input
          type={k === "value" ? "number" : "text"}
          className={inputCls}
          value={v}
          onChange={(e) => setContent(k, e.target.value)}
        />
      </Field>
    );
  };
  const contentKeys = selected
    ? Array.from(
        new Set([
          ...Object.keys(def?.defaultContent ?? {}),
          ...Object.keys(selected.content),
        ]),
      ).filter((k) => !k.startsWith("_"))
    : [];
  const visibleKeys = contentKeys.filter(
    (k) =>
      !(k === "lang" && selected?.type === "html") &&
      !(boundProp !== null && k === boundProp),
  );

  const anim = ANIMATIONS[pageSettings.entranceAnimation] ?? ANIMATIONS.none;
  const pageCss = [
    pageSettings.customCss,
    pageSettings.customCodeLang === "css" ? pageSettings.customCode : "",
  ]
    .filter(Boolean)
    .join("\n")
    .replace(/<\/style/gi, "");

  /* ====================================================================== */
  return (
    <div className="fixed inset-0 z-[60] flex h-dvh w-full flex-col overflow-hidden bg-[#fffafb] font-[family-name:var(--font-body)] text-slate-800">
      {/* TOP BAR */}
      <header className="z-30 flex h-14 shrink-0 items-center justify-between border-b border-slate-200 bg-white/80 px-4 shadow-sm backdrop-blur-xl">
        <div className="flex items-center gap-3">
          <Link
            href="/admin/dashboard/templates/new"
            aria-label="Back"
            className="rounded-lg p-2 text-slate-500 hover:bg-orange-50 hover:text-orange-600"
          >
            <ArrowLeft className="size-5" />
          </Link>
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            aria-label="Template name"
            className="w-64 border-b border-transparent bg-transparent text-sm font-semibold text-slate-800 outline-none focus:border-orange-500"
          />
          <div className="ml-2 flex items-center gap-0.5">
            <button
              type="button"
              onClick={undo}
              disabled={!hist.undo}
              title="Undo (Ctrl+Z)"
              className="rounded-lg p-2 text-slate-500 hover:bg-slate-100 disabled:opacity-30"
            >
              <Undo2 className="size-4" />
            </button>
            <button
              type="button"
              onClick={redo}
              disabled={!hist.redo}
              title="Redo (Ctrl+Shift+Z)"
              className="rounded-lg p-2 text-slate-500 hover:bg-slate-100 disabled:opacity-30"
            >
              <Redo2 className="size-4" />
            </button>
          </div>
        </div>

        <div className="flex items-center gap-1 rounded-xl border border-slate-200 bg-slate-100/80 p-1">
          {(
            [
              ["desktop", Monitor],
              ["tablet", Tablet],
              ["mobile", Smartphone],
            ] as const
          ).map(([d, Ic]) => (
            <button
              key={d}
              type="button"
              onClick={() => setDevice(d)}
              aria-label={d}
              aria-pressed={device === d}
              className={`relative rounded-lg p-1.5 ${device === d ? "text-orange-500" : "text-slate-500 hover:text-slate-800"}`}
            >
              {device === d && (
                <motion.span
                  layoutId="device-pill"
                  className="absolute inset-0 rounded-lg bg-white shadow-sm"
                />
              )}
              <Ic className="relative size-4" />
            </button>
          ))}
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => {
              setSelectedId(null);
              setPreview(true);
            }}
            title="Preview (Esc to exit)"
            className="flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-700 transition hover:border-orange-300 hover:text-orange-600"
          >
            <Eye className="size-4" />
            Preview
          </button>
          <div className="w-36">
            <AceternitySelect
              value={status}
              onChange={(v) => setStatus(v === "published" ? "published" : "draft")}
              options={[
                { label: "Draft", value: "draft" },
                { label: "Published", value: "published" },
              ]}
            />
          </div>
          <button
            type="button"
            onClick={() => void handleSave()}
            disabled={isSaving || cloud.uploading}
            className="flex cursor-pointer items-center gap-2 rounded-xl bg-gradient-to-b from-orange-400 to-orange-600 px-5 py-2 text-sm font-medium text-white shadow-lg shadow-orange-500/30 transition hover:opacity-90 disabled:opacity-60"
          >
            {isSaving ? (
              <Loader2 className="size-4 animate-spin" />
            ) : (
              <Save className="size-4" />
            )}{" "}
            {templateId ? "Update Template" : "Save Template"}
          </button>
        </div>
      </header>

      <div className="flex min-h-0 flex-1">
        {/* LEFT PANEL */}
        <aside
          className={`z-20 flex shrink-0 flex-col border-r border-slate-200 bg-white transition-[width] duration-200 ${preview ? "hidden" : ""} ${leftTab === "code" && codeWide ? "w-[560px]" : "w-72"}`}
        >
          <div className="flex border-b border-slate-200 bg-slate-50/50">
            {(
              [
                ["widgets", "Widgets", LayoutTemplate],
                ["layers", "Layers", Layers],
                ["code", "Code", Code],
              ] as const
            ).map(([k, l, Ic]) => (
              <button
                key={k}
                type="button"
                onClick={() => setLeftTab(k)}
                className={`flex flex-1 items-center justify-center gap-2 border-b-2 py-3 text-xs font-semibold ${leftTab === k ? "border-orange-500 bg-white text-orange-600" : "border-transparent text-slate-500"}`}
              >
                <Ic className="size-4" />
                {l}
              </button>
            ))}
          </div>

          {leftTab === "widgets" ? (
            <>
              <div className="p-3 pb-0">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-slate-400" />
                  <input
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    placeholder={`Search ${WIDGET_REGISTRY.length + DYNAMIC_AVAILABLE.length} widgets…`}
                    className={`${inputCls} pl-9`}
                  />
                </div>
              </div>
              <div className="min-h-0 flex-1 space-y-5 overflow-y-auto p-4">
                {dynFiltered.length > 0 && (
                  <section>
                    <h3 className="mb-1 flex items-center gap-1.5 text-xs font-semibold text-orange-600">
                      <Link2 className="size-3.5" />
                      Dynamic fields{" "}
                      <span className="font-normal text-slate-400">
                        ({dynFiltered.length})
                      </span>
                    </h3>
                    <p className="mb-2.5 text-[10px] leading-snug text-slate-400">
                      Linked to template data. Buyers replace these with their
                      own names, photos, video and music.
                    </p>
                    <div className="grid grid-cols-2 gap-2">
                      {dynFiltered.map((d) => (
                        <PaletteButton
                          key={d.id}
                          dragId={`dyn:${d.id}`}
                          icon={d.icon}
                          name={d.name}
                          accent
                          onAdd={() => insertDynamic(d, elRef.current.length)}
                          onDragEnd={() => setDropIndex(null)}
                        />
                      ))}
                    </div>
                  </section>
                )}
                {CATEGORIES.map((cat) => {
                  const list = filtered.filter((w) => w.category === cat);
                  if (!list.length) return null;
                  return (
                    <section key={cat}>
                      <h3 className="mb-2.5 text-xs font-semibold text-slate-500">
                        {cat}{" "}
                        <span className="font-normal text-slate-400">
                          ({list.length})
                        </span>
                      </h3>
                      <div className="grid grid-cols-2 gap-2">
                        {list.map((w) => (
                          <PaletteButton
                            key={w.type}
                            dragId={w.type}
                            icon={w.icon}
                            name={w.name}
                            onAdd={() => insertAt(w, elRef.current.length)}
                            onDragEnd={() => setDropIndex(null)}
                          />
                        ))}
                      </div>
                    </section>
                  );
                })}
                {filtered.length === 0 && dynFiltered.length === 0 && (
                  <p className="py-10 text-center text-sm text-slate-400">
                    No widgets match “{search}”.
                  </p>
                )}
              </div>
            </>
          ) : leftTab === "layers" ? (
            <div
              className="min-h-0 flex-1 overflow-y-auto p-3"
              onDragLeave={(e) => {
                if (!e.currentTarget.contains(e.relatedTarget as Node))
                  setLayerDrop(null);
              }}
            >
              <p className="mb-2 text-[11px] text-slate-400">
                Drag to reorder. Click to select. The eye hides a widget on the
                published page.
              </p>
              {elements.length === 0 && (
                <p className="py-10 text-center text-sm text-slate-400">
                  No elements yet. Add a widget to get started.
                </p>
              )}
              <ul>
                {elements.map((el, i) => {
                  const d = REGISTRY[el.type];
                  const hidden = !!el.content._hidden;
                  const isBound =
                    typeof el.content._bind === "string" && !!el.content._bind;
                  return (
                    <li key={el.id}>
                      {layerDrop === i && (
                        <div className="my-0.5 h-0.5 rounded bg-orange-500" />
                      )}
                      <div
                        draggable
                        onDragStart={(e) => {
                          e.dataTransfer.setData(
                            "application/x-element",
                            el.id,
                          );
                          e.dataTransfer.effectAllowed = "move";
                        }}
                        onDragOver={(e) => {
                          if (
                            !e.dataTransfer.types.includes(
                              "application/x-element",
                            )
                          )
                            return;
                          e.preventDefault();
                          e.dataTransfer.dropEffect = "move";
                          setLayerDrop(i);
                        }}
                        onDrop={(e) => {
                          e.preventDefault();
                          const id = e.dataTransfer.getData(
                            "application/x-element",
                          );
                          if (id) moveTo(id, i);
                          setLayerDrop(null);
                        }}
                        onDragEnd={() => setLayerDrop(null)}
                        onClick={() => {
                          setSelectedId(el.id);
                          setInspectorTab("content");
                        }}
                        className={`group my-0.5 flex cursor-pointer items-center gap-2 rounded-lg border px-2 py-1.5 text-xs transition ${selectedId === el.id ? "border-orange-400 bg-orange-50 text-orange-700" : "border-transparent text-slate-600 hover:bg-slate-50"} ${hidden ? "opacity-50" : ""}`}
                      >
                        <GripVertical className="size-3.5 shrink-0 cursor-grab text-slate-300" />
                        {d ? (
                          <d.icon className="size-4 shrink-0" />
                        ) : (
                          <Layers className="size-4 shrink-0" />
                        )}
                        <span className="min-w-0 flex-1 truncate">
                          {layerName(el)}
                        </span>
                        {isBound && (
                          <Link2
                            className="size-3 shrink-0 text-orange-400"
                            aria-label="Dynamic"
                          />
                        )}
                        <button
                          type="button"
                          title={hidden ? "Show" : "Hide"}
                          onClick={(e) => {
                            e.stopPropagation();
                            toggleHidden(el.id);
                          }}
                          className="rounded p-1 text-slate-400 hover:bg-white hover:text-orange-600"
                        >
                          {hidden ? (
                            <EyeOff className="size-3.5" />
                          ) : (
                            <Eye className="size-3.5" />
                          )}
                        </button>
                        <button
                          type="button"
                          title="Duplicate"
                          onClick={(e) => {
                            e.stopPropagation();
                            duplicate(el.id);
                          }}
                          className="rounded p-1 text-slate-400 opacity-0 hover:bg-white hover:text-orange-600 group-hover:opacity-100"
                        >
                          <Copy className="size-3.5" />
                        </button>
                        <button
                          type="button"
                          title="Delete"
                          onClick={(e) => {
                            e.stopPropagation();
                            remove(el.id);
                          }}
                          className="rounded p-1 text-slate-400 opacity-0 hover:bg-white hover:text-red-600 group-hover:opacity-100"
                        >
                          <Trash2 className="size-3.5" />
                        </button>
                      </div>
                    </li>
                  );
                })}
                {elements.length > 0 && (
                  <li
                    className="h-8"
                    onDragOver={(e) => {
                      if (
                        !e.dataTransfer.types.includes("application/x-element")
                      )
                        return;
                      e.preventDefault();
                      setLayerDrop(elements.length);
                    }}
                    onDrop={(e) => {
                      e.preventDefault();
                      const id = e.dataTransfer.getData(
                        "application/x-element",
                      );
                      if (id) moveTo(id, elements.length);
                      setLayerDrop(null);
                    }}
                  >
                    {layerDrop === elements.length && (
                      <div className="h-0.5 rounded bg-orange-500" />
                    )}
                  </li>
                )}
              </ul>
            </div>
          ) : (
            <div className="flex min-h-0 flex-1 flex-col">
              <div className="flex items-center justify-between gap-2 border-b border-slate-100 px-3 py-2">
                <p className="truncate text-[11px] text-slate-500">
                  {selectedIsCode
                    ? "Editing the selected code block"
                    : "Page-level code (shown below your blocks)"}
                </p>
                <div className="flex shrink-0 gap-1">
                  {!selectedIsCode && (
                    <button
                      type="button"
                      onClick={insertCodeBlock}
                      disabled={!pageSettings.customCode.trim()}
                      className="flex items-center gap-1 rounded-md bg-orange-500 px-2 py-1 text-[11px] font-medium text-white hover:bg-orange-600 disabled:opacity-40"
                    >
                      <FilePlus2 className="size-3.5" />
                      Insert as block
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={() => setCodeWide((w) => !w)}
                    aria-label="Toggle editor width"
                    className="rounded-md p-1 text-slate-500 hover:bg-slate-100"
                  >
                    {codeWide ? (
                      <Minimize2 className="size-4" />
                    ) : (
                      <Maximize2 className="size-4" />
                    )}
                  </button>
                </div>
              </div>
              <div className="min-h-0 flex-1">
                <CodeEditor
                  value={codeValue}
                  language={codeLang}
                  onChange={onCodeChange}
                  onLanguageChange={onLangChange}
                />
              </div>
              <div className="border-t border-slate-100 p-3">
                <h3 className="mb-2 flex items-center justify-between text-xs font-semibold text-slate-500">
                  Recent uploads{" "}
                  {cloud.uploading && (
                    <Loader2 className="size-3.5 animate-spin text-orange-500" />
                  )}
                </h3>
                <div className="grid max-h-28 grid-cols-6 gap-1.5 overflow-y-auto">
                  {cloud.assets.length === 0 && (
                    <p className="col-span-6 text-xs text-slate-400">
                      Uploads appear here. Click one to copy its URL.
                    </p>
                  )}
                  {cloud.assets.map((a) => (
                    <button
                      key={a.url}
                      type="button"
                      title={`${a.name} — copy URL`}
                      onClick={() => {
                        void navigator.clipboard?.writeText(a.url);
                        toast.add({
                          title: "Copied",
                          description: "Asset URL copied.",
                          type: "success",
                        });
                      }}
                      className="aspect-square overflow-hidden rounded-md border border-slate-200 bg-slate-100 hover:border-orange-400"
                    >
                      {a.kind === "image" ? (
                        <img
                          src={a.url}
                          alt={a.name}
                          className="size-full object-cover"
                        />
                      ) : (
                        <span className="grid size-full place-items-center text-[9px] text-slate-500">
                          {a.kind}
                        </span>
                      )}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}
        </aside>

        {/* CANVAS */}
        <main
          className="relative min-w-0 flex-1 overflow-y-auto overflow-x-hidden bg-slate-200/50"
          style={{
            backgroundImage: "radial-gradient(#d6c7bb 1px, transparent 1px)",
            backgroundSize: "18px 18px",
          }}
          onDragOver={onDragOver}
          onDrop={onDrop}
          onDragLeave={(e) => {
            if (!e.currentTarget.contains(e.relatedTarget as Node))
              setDropIndex(null);
          }}
          onClick={() => setSelectedId(null)}
        >
          <div className="flex min-h-full justify-center p-8">
            <motion.div
              ref={canvasRef}
              animate={{ width: DEVICES[device] }}
              transition={{ type: "spring", stiffness: 260, damping: 30 }}
              style={{
                maxWidth: "100%",
                backgroundColor: pageSettings.backgroundColor,
              }}
              className="riwa-canvas relative min-h-[70dvh] self-start rounded-xl shadow-2xl ring-1 ring-slate-200"
            >
              {pageCss && (
                <style>{`@scope (.riwa-canvas) { ${pageCss} }`}</style>
              )}
              <motion.div
                key={pageSettings.entranceAnimation}
                initial={anim.initial}
                animate={anim.animate}
                transition={{ duration: 0.6, ease: "easeOut" }}
                className="p-4"
              >
                {elements.length === 0 && (
                  <div
                    className={`grid min-h-[50dvh] place-items-center rounded-xl border-2 border-dashed text-center transition ${dropIndex !== null ? "border-orange-400 bg-orange-50/60" : "border-slate-200"}`}
                  >
                    <div className="space-y-2 text-slate-400">
                      <Layers className="mx-auto size-8" />
                      <p className="text-sm">
                        Drag a widget here, or click one on the left.
                      </p>
                    </div>
                  </div>
                )}

                {elements.map((el, i) => (
                  <React.Fragment key={el.id}>
                    {dropIndex === i && (
                      <div className="my-1 h-1 rounded-full bg-orange-500" />
                    )}
                    <div
                      data-wrap
                      onClick={(e) => {
                        e.stopPropagation();
                        if (!preview) setSelectedId(el.id);
                      }}
                      className={`group relative rounded-sm outline outline-2 outline-offset-0 transition-[outline-color] ${preview ? "outline-transparent" : selectedId === el.id ? "cursor-pointer outline-orange-500" : "cursor-pointer outline-transparent hover:outline-orange-300"}`}
                    >
                      <WidgetRenderer
                        element={resolveElement(el, previewData)}
                        editing={!preview}
                        device={device}
                      />
                      {selectedId === el.id && !preview && (
                        <>
                          <span className="absolute -top-5 left-0 z-10 rounded-t-md bg-orange-500 px-2 py-0.5 text-[10px] font-medium text-white">
                            {el.type === "html"
                              ? String(el.content.lang || "html").toUpperCase()
                              : (REGISTRY[el.type]?.name ?? el.type)}
                          </span>
                          <div className="absolute -top-5 right-0 z-10 flex items-center rounded-t-md bg-orange-500 text-white">
                            <span
                              draggable
                              onDragStart={(e) => {
                                e.stopPropagation();
                                e.dataTransfer.setData(
                                  "application/x-element",
                                  el.id,
                                );
                                e.dataTransfer.effectAllowed = "move";
                              }}
                              onDragEnd={() => setDropIndex(null)}
                              title="Drag to reorder"
                              className="cursor-grab p-1 hover:bg-orange-600 active:cursor-grabbing"
                            >
                              <GripVertical className="size-3.5" />
                            </span>
                            <button
                              type="button"
                              title="Duplicate (Ctrl+D)"
                              onClick={(e) => {
                                e.stopPropagation();
                                duplicate(el.id);
                              }}
                              className="p-1 hover:bg-orange-600"
                            >
                              <Copy className="size-3.5" />
                            </button>
                            <button
                              type="button"
                              title="Delete"
                              onClick={(e) => {
                                e.stopPropagation();
                                remove(el.id);
                              }}
                              className="p-1 hover:bg-red-600"
                            >
                              <Trash2 className="size-3.5" />
                            </button>
                          </div>
                        </>
                      )}
                    </div>
                  </React.Fragment>
                ))}
                {dropIndex === elements.length && elements.length > 0 && (
                  <div className="my-1 h-1 rounded-full bg-orange-500" />
                )}

                {pageSettings.customCode.trim() &&
                  pageSettings.customCodeLang !== "css" && (
                    <div className="pointer-events-none mt-2 border-t border-dashed border-orange-200 pt-2">
                      <CodePreview
                        lang={pageSettings.customCodeLang}
                        code={pageSettings.customCode}
                        data={previewData}
                      />
                    </div>
                  )}
              </motion.div>
            </motion.div>
          </div>
        </main>

        {/* INSPECTOR */}
        <aside
          className={`z-20 flex w-[340px] shrink-0 flex-col border-l border-slate-200 bg-white ${preview ? "hidden" : ""}`}
        >
          <div className="flex border-b border-slate-200 bg-slate-50/50">
            {(["content", "style", "advanced"] as const).map((t) => (
              <button
                key={t}
                type="button"
                onClick={() => setInspectorTab(t)}
                className={`flex flex-1 items-center justify-center border-b-2 py-3 text-xs font-semibold capitalize ${inspectorTab === t ? "border-orange-500 bg-white text-orange-600" : "border-transparent text-slate-500"}`}
              >
                {t}
              </button>
            ))}
          </div>

          <div className="min-h-0 flex-1 overflow-y-auto [&::-webkit-scrollbar-thumb]:rounded-full [&::-webkit-scrollbar-thumb]:bg-orange-400 [&::-webkit-scrollbar]:w-1.5">
            {selected && styleApi ? (
              <>
                <div className="flex items-center justify-between border-b border-slate-100 px-4 py-2.5">
                  <div className="flex items-center gap-2 text-sm font-semibold">
                    {def?.icon && (
                      <def.icon className="size-4 text-orange-500" />
                    )}
                    {def?.name ?? selected.type}
                  </div>
                  <button
                    type="button"
                    aria-label="Deselect"
                    onClick={() => setSelectedId(null)}
                    className="text-slate-400 hover:text-slate-700"
                  >
                    <X className="size-4" />
                  </button>
                </div>

                {inspectorTab === "content" && (
                  <div className="space-y-4 p-4">
                    {/* ---- Dynamic data binding ---- */}
                    <div className="space-y-3 rounded-xl border border-orange-100 bg-orange-50/50 p-3">
                      <span className="flex items-center gap-1.5 text-xs font-bold text-orange-700">
                        <Link2 className="size-3.5" />
                        Dynamic data
                      </span>
                      <Field label="Bind to">
                        <AceternitySelect
                          value={bindSel}
                          onChange={onBindChange}
                          options={BIND_CHOICES}
                          placeholder="None (static)"
                        />
                      </Field>
                      {bind.startsWith("slot.") && (
                        <>
                          <Field label="Slot key (unique)">
                            <input
                              className={inputCls}
                              value={bind.slice(5)}
                              onChange={(e) => {
                                const key = e.target.value.replace(/[^\w]/g, "_");
                                setContent("_bind", key ? `slot.${key}` : "slot.");
                              }}
                            />
                          </Field>
                          <Field label="Label shown to the buyer">
                            <input
                              className={inputCls}
                              value={String(selected.content._label ?? "")}
                              placeholder="e.g. Hero photo"
                              onChange={(e) =>
                                setContent("_label", e.target.value)
                              }
                            />
                          </Field>
                          <p className="text-[11px] leading-snug text-slate-500">
                            The value below is the default. Buyers can replace
                            it from their editor.
                          </p>
                        </>
                      )}
                      {bind && !bind.startsWith("slot.") && (
                        <div className="space-y-2 border-t border-orange-100 pt-3">
                          <span className="block text-[11px] font-medium text-slate-500">
                            Template default (shared)
                          </span>
                          {renderBoundEditor()}
                        </div>
                      )}
                    </div>

                    {visibleKeys.length === 0 && (
                      <p className="text-sm text-slate-400">
                        This widget has no content fields. Use the Style tab.
                      </p>
                    )}
                    {selected.type === "html" && (
                      <Field label="Language">
                        <AceternitySelect
                          value={String(selected.content.lang || "html")}
                          onChange={(v) => setContent("lang", v)}
                          options={["html", "css", "jsx", "tsx"]}
                        />
                      </Field>
                    )}
                    {visibleKeys.map(renderContentField)}
                  </div>
                )}

                {inspectorTab === "style" && (
                  <>
                    {device !== "desktop" && (
                      <div className="flex items-start gap-2 border-b border-orange-100 bg-orange-50 px-4 py-2.5 text-[11px] leading-snug text-orange-700">
                        {device === "tablet" ? (
                          <Tablet className="mt-0.5 size-3.5 shrink-0" />
                        ) : (
                          <Smartphone className="mt-0.5 size-3.5 shrink-0" />
                        )}
                        <span>
                          Editing <b>{device}</b> overrides. Empty fields
                          inherit from larger screens.
                        </span>
                      </div>
                    )}
                    <Accordion title="Alignment" defaultOpen>
                      <Field label="Position in row">
                        <div className="grid grid-cols-3 gap-1 rounded-lg bg-slate-100 p-1">
                          {(
                            [
                              ["left", AlignLeft],
                              ["center", AlignCenter],
                              ["right", AlignRight],
                            ] as const
                          ).map(([a, Ic]) => {
                            const active =
                              (styleApi.get("_align") ||
                                (device === "desktop" ? "center" : "")) === a;
                            return (
                              <button
                                key={a}
                                type="button"
                                aria-label={`Align ${a}`}
                                aria-pressed={active}
                                onClick={() => styleApi.set("_align", a)}
                                className={`flex justify-center rounded-md py-1.5 ${active ? "bg-white text-orange-600 shadow-sm" : "text-slate-500 hover:text-slate-800"}`}
                              >
                                <Ic className="size-4" />
                              </button>
                            );
                          })}
                        </div>
                      </Field>
                    </Accordion>
                    <Accordion title="Typography" defaultOpen>
                      <Field label="Font">
                        <AceternitySelect
                          value={styleApi.get("fontFamily")}
                          onChange={(v) => styleApi.set("fontFamily", v)}
                          options={[{ value: "", label: "Default" }, ...FONTS]}
                        />
                      </Field>
                      <Row>
                        <Txt
                          api={styleApi}
                          k="fontSize"
                          label="Size"
                          placeholder="16px"
                        />
                        <Sel
                          api={styleApi}
                          k="fontWeight"
                          label="Weight"
                          options={[
                            "300",
                            "400",
                            "500",
                            "600",
                            "700",
                            "800",
                            "900",
                          ]}
                        />
                      </Row>
                      <Row>
                        <Txt
                          api={styleApi}
                          k="lineHeight"
                          label="Line height"
                          placeholder="1.5"
                        />
                        <Txt
                          api={styleApi}
                          k="letterSpacing"
                          label="Letter spacing"
                          placeholder="0px"
                        />
                      </Row>
                      <Row>
                        <Sel
                          api={styleApi}
                          k="textAlign"
                          label="Align"
                          options={["left", "center", "right", "justify"]}
                        />
                        <Sel
                          api={styleApi}
                          k="textTransform"
                          label="Transform"
                          options={[
                            "none",
                            "uppercase",
                            "lowercase",
                            "capitalize",
                          ]}
                        />
                      </Row>
                      <Row>
                        <Sel
                          api={styleApi}
                          k="fontStyle"
                          label="Style"
                          options={["normal", "italic"]}
                        />
                        <Sel
                          api={styleApi}
                          k="textDecoration"
                          label="Decoration"
                          options={["none", "underline", "line-through"]}
                        />
                      </Row>
                      <ColorField
                        label="Color"
                        value={styleApi.get("color")}
                        onChange={(v) => styleApi.set("color", v)}
                      />
                    </Accordion>
                    <Accordion title="Size & layout">
                      <Row>
                        <Txt
                          api={styleApi}
                          k="width"
                          label="Width"
                          placeholder="100%"
                        />
                        <Txt
                          api={styleApi}
                          k="height"
                          label="Height"
                          placeholder="auto"
                        />
                      </Row>
                      <Row>
                        <Txt api={styleApi} k="maxWidth" label="Max width" />
                        <Txt api={styleApi} k="minHeight" label="Min height" />
                      </Row>
                      <Row>
                        <Sel
                          api={styleApi}
                          k="display"
                          label="Display"
                          options={[
                            "block",
                            "inline-block",
                            "inline-flex",
                            "flex",
                            "grid",
                            "none",
                          ]}
                        />
                        <Sel
                          api={styleApi}
                          k="overflow"
                          label="Overflow"
                          options={["visible", "hidden", "auto"]}
                        />
                      </Row>
                      <Row>
                        <Sel
                          api={styleApi}
                          k="justifyContent"
                          label="Justify"
                          options={[
                            "flex-start",
                            "center",
                            "flex-end",
                            "space-between",
                            "space-around",
                          ]}
                        />
                        <Sel
                          api={styleApi}
                          k="alignItems"
                          label="Align items"
                          options={[
                            "stretch",
                            "flex-start",
                            "center",
                            "flex-end",
                          ]}
                        />
                      </Row>
                      <Row>
                        <Txt api={styleApi} k="gap" label="Gap" />
                        <Sel
                          api={styleApi}
                          k="objectFit"
                          label="Object fit"
                          options={["cover", "contain", "fill"]}
                        />
                      </Row>
                    </Accordion>
                    <Accordion title="Spacing">
                      <SpacingBox
                        label="Margin"
                        value={styleApi.get("margin")}
                        onChange={(v) => styleApi.set("margin", v)}
                      />
                      <SpacingBox
                        label="Padding"
                        value={styleApi.get("padding")}
                        onChange={(v) => styleApi.set("padding", v)}
                      />
                    </Accordion>
                    <Accordion title="Background">
                      <BackgroundSection api={styleApi} cloud={cloud} />
                    </Accordion>
                    <Accordion title="Border">
                      <Row>
                        <Txt
                          api={styleApi}
                          k="borderRadius"
                          label="Radius"
                          placeholder="12px"
                        />
                        <Txt
                          api={styleApi}
                          k="borderWidth"
                          label="Width"
                          placeholder="1px"
                        />
                      </Row>
                      <Sel
                        api={styleApi}
                        k="borderStyle"
                        label="Style"
                        options={["solid", "dashed", "dotted", "double"]}
                      />
                      <ColorField
                        label="Border color"
                        value={styleApi.get("borderColor")}
                        onChange={(v) => styleApi.set("borderColor", v)}
                      />
                    </Accordion>
                    <Accordion title="Effects">
                      <Field
                        label={`Opacity · ${styleApi.get("opacity") || "1"}`}
                      >
                        <input
                          type="range"
                          min={0}
                          max={1}
                          step={0.05}
                          value={styleApi.get("opacity") || "1"}
                          onChange={(e) =>
                            styleApi.set(
                              "opacity",
                              e.target.value === "1" ? "" : e.target.value,
                            )
                          }
                          className="w-full accent-orange-500"
                        />
                      </Field>
                      <ShadowSection api={styleApi} />
                      <Txt
                        api={styleApi}
                        k="transform"
                        label="Transform"
                        placeholder="rotate(3deg) scale(1.05)"
                      />
                      <Txt
                        api={styleApi}
                        k="filter"
                        label="Filter"
                        placeholder="blur(2px) saturate(1.2)"
                      />
                      <Txt
                        api={styleApi}
                        k="transition"
                        label="Transition"
                        placeholder="all .2s ease"
                      />
                    </Accordion>
                  </>
                )}

                {inspectorTab === "advanced" && (
                  <div className="space-y-4 p-4">
                    <div className="space-y-3 rounded-xl border border-slate-200 bg-slate-50/60 p-3">
                      <span className="block text-xs font-bold text-slate-700">
                        Motion effects
                      </span>
                      <Field label="Entrance animation">
                        <AceternitySelect
                          value={String(selected.content._anim ?? "")}
                          onChange={(v) => setContent("_anim", v)}
                          options={[
                            { label: "None", value: "" },
                            { label: "Fade in", value: "fadeIn" },
                            { label: "Slide up", value: "slideUp" },
                            { label: "Slide down", value: "slideDown" },
                            { label: "Slide from right", value: "slideLeft" },
                            { label: "Slide from left", value: "slideRight" },
                            { label: "Zoom in", value: "zoomIn" },
                            { label: "Rotate in", value: "rotateIn" },
                          ]}
                        />
                      </Field>
                      <Row>
                        <Field label="Duration (s)">
                          <input
                            type="number"
                            min="0.1"
                            step="0.1"
                            className={inputCls}
                            value={String(selected.content._animDuration ?? "")}
                            placeholder="0.6"
                            onChange={(e) =>
                              setContent("_animDuration", e.target.value)
                            }
                          />
                        </Field>
                        <Field label="Delay (s)">
                          <input
                            type="number"
                            min="0"
                            step="0.1"
                            className={inputCls}
                            value={String(selected.content._animDelay ?? "")}
                            placeholder="0"
                            onChange={(e) =>
                              setContent("_animDelay", e.target.value)
                            }
                          />
                        </Field>
                      </Row>
                      <label className="flex cursor-pointer items-center justify-between text-xs font-medium text-slate-600">
                        Hide on published page
                        <input
                          type="checkbox"
                          checked={!!selected.content._hidden}
                          onChange={() => toggleHidden(selected.id)}
                          className="size-4 accent-orange-500"
                        />
                      </label>
                    </div>
                    <Row>
                      <Field label="CSS classes">
                        <input
                          className={inputCls}
                          value={String(selected.content._className ?? "")}
                          onChange={(e) =>
                            setContent("_className", e.target.value)
                          }
                          placeholder="my-class"
                        />
                      </Field>
                      <Field label="Element ID">
                        <input
                          className={inputCls}
                          value={String(selected.content._htmlId ?? "")}
                          onChange={(e) =>
                            setContent(
                              "_htmlId",
                              e.target.value.replace(/\s/g, "-"),
                            )
                          }
                          placeholder="hero-title"
                        />
                      </Field>
                    </Row>
                    <Field label="Inline CSS (any property)">
                      <textarea
                        key={selected.id + toCss(selected.styles).length}
                        rows={8}
                        spellCheck={false}
                        defaultValue={toCss(selected.styles)}
                        onBlur={(e) =>
                          patchEl(selected.id, (el) => ({
                            ...el,
                            styles: parseCss(e.target.value),
                          }))
                        }
                        className={`${areaCls} font-mono text-xs leading-5`}
                      />
                    </Field>
                    <Field label="Scoped custom CSS (selectors allowed)">
                      <textarea
                        rows={6}
                        spellCheck={false}
                        placeholder={
                          "&:hover { transform: scale(1.02); }\n.child { color: red; }"
                        }
                        value={
                          selected.customCode?.language === "css"
                            ? selected.customCode.code
                            : ""
                        }
                        onChange={(e) =>
                          patchEl(
                            selected.id,
                            (el) => ({
                              ...el,
                              customCode: e.target.value
                                ? ({
                                    language: "css",
                                    code: e.target.value,
                                  } as CustomCode)
                                : null,
                            }),
                            `cc:${selected.id}`,
                          )
                        }
                        className={`${areaCls} font-mono text-xs leading-5`}
                      />
                    </Field>
                    <p className="text-xs text-slate-400">
                      Inline CSS applies when you click away. Scoped CSS only
                      affects this element.
                    </p>
                    <div className="flex gap-2">
                      <button
                        type="button"
                        onClick={() => duplicate(selected.id)}
                        className="flex h-9 flex-1 items-center justify-center gap-2 rounded-lg border border-slate-200 text-sm hover:border-orange-300"
                      >
                        <Copy className="size-4" />
                        Duplicate
                      </button>
                      <button
                        type="button"
                        onClick={() => remove(selected.id)}
                        className="flex h-9 flex-1 items-center justify-center gap-2 rounded-lg border border-red-200 text-sm text-red-600 hover:bg-red-50"
                      >
                        <Trash2 className="size-4" />
                        Delete
                      </button>
                    </div>
                  </div>
                )}
              </>
            ) : (
              /* PAGE SETTINGS */
              <div className="space-y-5 p-4">
                {inspectorTab === "content" && (
                  <>
                    <div>
                      <label className="mb-1.5 block text-xs font-medium text-slate-600">
                        Template Category *
                      </label>
                      <div className="flex gap-2">
                        <AceternitySelect
                          className="flex-1"
                          value={categoryId}
                          onChange={setCategoryId}
                          options={categories.map((c: any) => ({
                            label: String(c.name),
                            value: String(c.id),
                          }))}
                          placeholder="Select category"
                        />
                        <button
                          type="button"
                          onClick={() => setCatModal(true)}
                          aria-label="New category"
                          className="rounded-xl bg-orange-100 p-2.5 text-orange-600 hover:bg-orange-200"
                        >
                          <Plus className="size-4" />
                        </button>
                      </div>
                    </div>
                    <Field label="Description">
                      <textarea
                        value={description}
                        onChange={(e) => setDescription(e.target.value)}
                        placeholder="A beautiful wedding invitation…"
                        className={`${areaCls} h-20 resize-none`}
                      />
                    </Field>

                    <div className="grid grid-cols-2 gap-2">
                      <Field label="Price (PKR)">
                        <div>
                          <div className="relative">
                            <span className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 text-xs font-semibold text-slate-400">
                              Rs
                            </span>
                            <input
                              type="number"
                              min="0"
                              step="1"
                              value={price}
                              onChange={(e) => setPrice(e.target.value)}
                              className={`${inputCls} pl-8`}
                            />
                          </div>
                          {Number(price) > 0 && (
                            <span className="mt-1 block text-[11px] text-slate-400">
                              {pkr.format(Number(price))}
                            </span>
                          )}
                        </div>
                      </Field>
                      <Field label="Premium">
                        <span className="flex h-9 items-center gap-2 rounded-lg border border-slate-200 bg-slate-50 px-3 text-xs text-slate-600">
                          <Crown className="size-3.5 text-orange-500" />
                          <input
                            type="checkbox"
                            checked={isPremium}
                            onChange={(e) => setIsPremium(e.target.checked)}
                            className="size-4 accent-orange-500"
                          />
                          {isPremium ? "Yes" : "No"}
                        </span>
                      </Field>
                    </div>

                    <div className="space-y-2 rounded-xl border border-slate-200 bg-slate-50 p-3">
                      <span className="block text-xs font-bold text-slate-700">
                        Default core names
                      </span>
                      <div className="grid grid-cols-2 gap-2">
                        <input
                          value={coreNames.bride}
                          onChange={(e) =>
                            setCoreNames({
                              ...coreNames,
                              bride: e.target.value,
                            })
                          }
                          placeholder="Bride name"
                          className={inputCls}
                        />
                        <input
                          value={coreNames.groom}
                          onChange={(e) =>
                            setCoreNames({
                              ...coreNames,
                              groom: e.target.value,
                            })
                          }
                          placeholder="Groom name"
                          className={inputCls}
                        />
                      </div>
                    </div>

                    <div className="space-y-4 border-t border-slate-100 pt-4">
                      <MediaField
                        label="Thumbnail *"
                        kind="image"
                        value={thumbnailUrl}
                        onChange={setThumbnailUrl}
                        cloud={cloud}
                      />
                      <GalleryField
                        urls={galleryUrls}
                        onChange={setGalleryUrls}
                        cloud={cloud}
                      />
                      <MediaField
                        label="Main music"
                        kind="audio"
                        value={musicUrls[0] ?? ""}
                        onChange={(u) => setMusicUrls(u ? [u] : [])}
                        cloud={cloud}
                      />
                      <MediaField
                        label="Background video"
                        kind="video"
                        value={videoUrls[0] ?? ""}
                        onChange={(u) => setVideoUrls(u ? [u] : [])}
                        cloud={cloud}
                      />
                    </div>
                  </>
                )}

                {inspectorTab === "style" && (
                  <>
                    <ColorField
                      label="Canvas background"
                      value={pageSettings.backgroundColor}
                      onChange={(v) => patchPage({ backgroundColor: v })}
                    />
                    <Field label="Global custom CSS (applies to the whole invitation)">
                      <textarea
                        value={pageSettings.customCss}
                        onChange={(e) =>
                          patchPage({ customCss: e.target.value })
                        }
                        spellCheck={false}
                        placeholder={".my-class { color: red; }"}
                        className={`${areaCls} h-40 resize-none font-mono text-xs leading-5`}
                      />
                    </Field>
                  </>
                )}

                {inspectorTab === "advanced" && (
                  <Field label="Page entrance animation">
                    <AceternitySelect
                      value={pageSettings.entranceAnimation}
                      onChange={(v) => patchPage({ entranceAnimation: v })}
                      options={[
                        { label: "None", value: "none" },
                        { label: "Fade in", value: "fadeIn" },
                        { label: "Slide up", value: "slideUp" },
                        { label: "Slide down", value: "slideDown" },
                        { label: "Slide from right", value: "slideLeft" },
                        { label: "Zoom in", value: "zoomIn" },
                      ]}
                    />
                  </Field>
                )}
              </div>
            )}
          </div>
        </aside>
      </div>

      {preview && (
        <button
          type="button"
          onClick={() => setPreview(false)}
          className="fixed bottom-6 left-1/2 z-[70] flex -translate-x-1/2 items-center gap-2 rounded-full bg-slate-900 px-5 py-2.5 text-sm font-medium text-white shadow-2xl transition hover:bg-slate-800"
        >
          <EyeOff className="size-4" /> Exit preview{" "}
          <kbd className="rounded bg-white/15 px-1.5 text-[10px]">Esc</kbd>
        </button>
      )}
      <CategoryModal
        isOpen={catModal}
        onClose={() => setCatModal(false)}
        onSuccess={() => refetchCats()}
      />
    </div>
  );
}

export default ElementorBuilder;