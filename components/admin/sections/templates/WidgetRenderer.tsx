"use client";

import * as React from "react";
import { motion } from "framer-motion";
import { icons } from "lucide-react";
import { CodePreview, type CodeLang } from "./CodeEditor";

/* ========================================================================== */
/* Types                                                                      */
/* ========================================================================== */

export type Device = "desktop" | "tablet" | "mobile";
export type CustomCode = { language: CodeLang; code: string } | null;

export type BuilderElement = {
  id: string;
  type: string;
  /**
   * Widget content. Reserved keys (never shown as fields):
   *  _className, _htmlId   advanced attributes
   *  _hidden               hide on the published page
   *  _anim, _animDuration, _animDelay   entrance animation
   *  _r                    responsive overrides: { tablet: {...css}, mobile: {...css} }
   */
  content: Record<string, any>;
  /** CSS in camelCase. `_align` ("left" | "center" | "right") positions the widget inside its row. */
  styles: Record<string, string>;
  customCode?: CustomCode;
};

type Props = {
  element: BuilderElement;
  /** true inside the builder canvas: links, iframes and maps are inert so clicks select the element */
  editing?: boolean;
  /**
   * Builder preview device. When set, responsive overrides are merged in JS.
   * When omitted (published page), overrides are emitted as @media rules instead.
   */
  device?: Device;
};

/* ========================================================================== */
/* Style helpers                                                              */
/* ========================================================================== */

/** Keys in `styles` that are NOT real CSS properties (never spread into the DOM). */
const NON_CSS = new Set(["btnColor"]);

const kebab = (k: string) => (k.startsWith("--") ? k : k.replace(/[A-Z]/g, (m) => "-" + m.toLowerCase()));

function cssOf(styles: Record<string, string> = {}): React.CSSProperties {
  const out: Record<string, string> = {};
  for (const [k, v] of Object.entries(styles)) {
    if (k.startsWith("_") || NON_CSS.has(k) || v === "" || v == null) continue;
    out[k] = v;
  }
  if (out.borderWidth && !out.borderStyle) out.borderStyle = "solid";
  return out as React.CSSProperties;
}

type Responsive = Partial<Record<"tablet" | "mobile", Record<string, string>>>;

/** Desktop = base. Tablet = base + tablet. Mobile = base + tablet + mobile (desktop-first cascade). */
function mergeStyles(el: BuilderElement, device?: Device): Record<string, string> {
  const base = el.styles ?? {};
  const r: Responsive = el.content?._r ?? {};
  if (device === "tablet") return { ...base, ...r.tablet };
  if (device === "mobile") return { ...base, ...r.tablet, ...r.mobile };
  return base;
}

/** Published-page responsive rules. !important is required because base styles are inline. */
function mediaCss(id: string, r?: Responsive): string {
  if (!r) return "";
  const rule = (o?: Record<string, string>) =>
    Object.entries(o ?? {})
      .filter(([k, v]) => !k.startsWith("_") && !NON_CSS.has(k) && v)
      .map(([k, v]) => `${kebab(k)}:${String(v).replace(/[<>{}]/g, "")} !important`)
      .join(";");
  const t = rule(r.tablet);
  const m = rule(r.mobile);
  return [t && `@media (max-width:1024px){[data-el="${id}"]{${t}}}`, m && `@media (max-width:767px){[data-el="${id}"]{${m}}}`].filter(Boolean).join("");
}

const pick = (css: React.CSSProperties, keys: (keyof React.CSSProperties)[]) => {
  const a: Record<string, any> = {};
  const b: Record<string, any> = { ...css };
  keys.forEach((k) => {
    if (k in css) { a[k as string] = (css as any)[k]; delete b[k as string]; }
  });
  return [a as React.CSSProperties, b as React.CSSProperties] as const;
};

const JUSTIFY: Record<string, string> = { left: "flex-start", center: "center", right: "flex-end" };

export const ENTRANCES: Record<string, { initial: any; animate: any }> = {
  fadeIn: { initial: { opacity: 0 }, animate: { opacity: 1 } },
  slideUp: { initial: { opacity: 0, y: 40 }, animate: { opacity: 1, y: 0 } },
  slideDown: { initial: { opacity: 0, y: -40 }, animate: { opacity: 1, y: 0 } },
  slideLeft: { initial: { opacity: 0, x: 48 }, animate: { opacity: 1, x: 0 } },
  slideRight: { initial: { opacity: 0, x: -48 }, animate: { opacity: 1, x: 0 } },
  zoomIn: { initial: { opacity: 0, scale: 0.85 }, animate: { opacity: 1, scale: 1 } },
  rotateIn: { initial: { opacity: 0, rotate: -8, scale: 0.95 }, animate: { opacity: 1, rotate: 0, scale: 1 } },
};

/* ========================================================================== */
/* Small pieces                                                               */
/* ========================================================================== */

export function LucideByName({ name, size }: { name: string; size?: number | string }) {
  const Icon = (icons as Record<string, React.ComponentType<any>>)[name] ?? icons.Box;
  return <Icon size={size ?? "1em"} />;
}

function Countdown({ date }: { date: string }) {
  const [now, setNow] = React.useState<number | null>(null);
  React.useEffect(() => {
    setNow(Date.now());
    const t = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(t);
  }, []);
  const diff = Math.max(0, (new Date(date).getTime() || 0) - (now ?? 0));
  const parts: [number, string][] = [
    [Math.floor(diff / 864e5), "Days"], [Math.floor(diff / 36e5) % 24, "Hours"],
    [Math.floor(diff / 6e4) % 60, "Minutes"], [Math.floor(diff / 1e3) % 60, "Seconds"],
  ];
  return (
    <>
      {parts.map(([n, l]) => (
        <div key={l} style={{ textAlign: "center", minWidth: 64 }}>
          <div style={{ fontVariantNumeric: "tabular-nums" }}>{String(n).padStart(2, "0")}</div>
          <div style={{ fontSize: 11, fontWeight: 500, opacity: 0.6, letterSpacing: 0.5 }}>{l}</div>
        </div>
      ))}
    </>
  );
}

const Placeholder = ({ css, label, dark, icon = "ImagePlus" }: { css: React.CSSProperties; label: string; dark?: boolean; icon?: string }) => (
  <div
    style={{
      minHeight: 120, width: "100%", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 8,
      borderRadius: 12, fontSize: 13, textAlign: "center", padding: 16,
      ...(dark ? { background: "#1e293b", color: "#e2e8f0" } : { background: "#fff7ed", color: "#c2410c", border: "2px dashed #fdba74" }),
      ...css,
    }}
  >
    <LucideByName name={icon} size={22} />
    {label}
  </div>
);

/* ========================================================================== */
/* Widget body (the actual markup for each widget type)                       */
/* ========================================================================== */

function WidgetBody({ element, styles, editing }: { element: BuilderElement; styles: Record<string, string>; editing: boolean }) {
  const { id, type, content: c = {}, customCode } = element;
  const css = cssOf(styles);
  const attrs = { id: c._htmlId || undefined, className: c._className || undefined, "data-el": id } as const;
  const noClick = editing ? { onClick: (e: React.MouseEvent) => e.preventDefault() } : {};
  const lock: React.CSSProperties = editing ? { pointerEvents: "none" } : {};

  // Per-element CSS, scoped with @scope so it cannot leak to siblings
  const scoped =
    customCode?.language === "css" && customCode.code.trim() ? (
      <style>{`@scope ([data-el="${id}"]) { ${customCode.code.replace(/<\/style/gi, "")} }`}</style>
    ) : null;

  const wrap = (node: React.ReactNode, style: React.CSSProperties = css) => (
    <div {...attrs} style={style}>
      {scoped}
      {node}
    </div>
  );

  const Star = icons.Star;

  switch (type) {
    case "heading": {
      const Tag = (["h1", "h2", "h3", "h4", "h5", "h6"].includes(c.tag) ? c.tag : "h2") as "h2";
      return <Tag {...attrs} style={{ width: "100%", margin: 0, textAlign: "center", ...css }}>{scoped}{c.text}</Tag>;
    }
    case "paragraph":
    case "text":
      return <p {...attrs} style={{ width: "100%", whiteSpace: "pre-wrap", textAlign: "center", ...css }}>{scoped}{c.text}</p>;

    case "quote":
      return (
        <blockquote {...attrs} style={{ width: "100%", margin: 0, borderLeft: "4px solid #f97316", paddingLeft: 16, fontStyle: "italic", ...css }}>
          {scoped}
          <p style={{ margin: 0 }}>{c.text}</p>
          {c.cite && <footer style={{ fontSize: "0.7em", opacity: 0.6, marginTop: 6, fontStyle: "normal" }}>— {c.cite}</footer>}
        </blockquote>
      );

    case "list":
      return wrap(
        <ul style={{ margin: 0, paddingLeft: 20 }}>
          {String(c.text ?? "").split("\n").filter(Boolean).map((l, i) => <li key={i}>{l}</li>)}
        </ul>,
        { width: "100%", ...css },
      );

    case "timeline": {
      const rows = String(c.text ?? "").split("\n").filter(Boolean).map((l) => {
        const [when, ...rest] = l.split(/\s+[—|-]\s+/);
        return { when: rest.length ? when : "", what: rest.length ? rest.join(" — ") : when };
      });
      return wrap(
        <div style={{ position: "relative", paddingLeft: 28, textAlign: "left", display: "inline-block", maxWidth: "100%" }}>
          <div style={{ position: "absolute", left: 7, top: 8, bottom: 8, width: 2, background: "#fed7aa" }} />
          {rows.map((r, i) => (
            <div key={i} style={{ position: "relative", padding: "8px 0" }}>
              <span style={{ position: "absolute", left: -28, top: 14, width: 16, height: 16, borderRadius: 999, background: "#f97316", border: "3px solid #fff", boxShadow: "0 0 0 1px #fdba74" }} />
              {r.when && <div style={{ fontSize: "0.8em", fontWeight: 700, color: "#f97316" }}>{r.when}</div>}
              <div>{r.what}</div>
            </div>
          ))}
        </div>,
        { width: "100%", textAlign: "center", ...css },
      );
    }

    case "button": {
      const [box, visual] = pick(css, ["margin", "padding", "textAlign", "width"]);
      return (
        <div {...attrs} style={{ textAlign: "center", ...box }}>
          {scoped}
          <a
            href={c.href || "#"}
            {...noClick}
            style={{
              display: "inline-block", textDecoration: "none", cursor: "pointer", transition: "transform .15s ease, box-shadow .15s ease",
              backgroundColor: styles.backgroundColor || "#f97316", color: styles.color || "#fff",
              padding: "12px 28px", borderRadius: 10, fontWeight: 700, ...visual, margin: 0,
            }}
          >
            {c.text}
          </a>
        </div>
      );
    }

    case "badge":
      return wrap(c.text, { display: "inline-block", ...css });

    case "alert":
      return wrap(
        <>
          {c.title && <div style={{ fontWeight: 700, marginBottom: 2 }}>{c.title}</div>}
          <div>{c.text}</div>
        </>,
        { width: "100%", padding: "14px 16px", borderRadius: 10, background: "#fff7ed", borderLeft: "4px solid #f97316", color: "#7c2d12", textAlign: "left", ...css },
      );

    case "image":
      return c.src ? (
        <img {...attrs} src={c.src} alt={c.alt || ""} style={{ width: "100%", maxWidth: "100%", display: "block", objectFit: "cover", ...css }} />
      ) : (
        <Placeholder css={css} label="Upload an image in the Content tab" />
      );

    case "video":
      return c.src ? (
        <video {...attrs} src={c.src} controls style={{ width: "100%", maxWidth: "100%", display: "block", borderRadius: 10, ...css, ...lock }} />
      ) : (
        <Placeholder css={css} label="Upload a video in the Content tab" dark icon="Video" />
      );

    case "audio":
      return c.src ? (
        <audio {...attrs} src={c.src} controls style={{ width: "100%", ...css, ...lock }} />
      ) : (
        <div style={{ height: 48, width: "100%", borderRadius: 999, background: "#ffedd5", color: "#c2410c", display: "flex", alignItems: "center", justifyContent: "center", gap: 8, padding: "0 16px", fontSize: 12, ...css }}>
          <LucideByName name="Music" size={16} /> Upload audio in the Content tab
        </div>
      );

    case "gallery":
      return wrap(
        <div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: styles.gap || 8 }}>
          {[c.src, c.src2, c.src3].map((s, i) =>
            s ? <img key={i} src={s} alt="" style={{ width: "100%", aspectRatio: "1", objectFit: "cover", borderRadius: 10 }} /> : <Placeholder key={i} css={{ aspectRatio: "1", minHeight: 0 }} label={`Image ${i + 1}`} />,
          )}
        </div>,
        { width: "100%", ...css, display: "block" },
      );

    case "divider": {
      const { borderTop, ...rest } = css as any;
      return (
        <hr
          {...attrs}
          style={{
            width: "100%", border: 0,
            borderTop: borderTop ?? `${styles.borderWidth || "1px"} ${styles.borderStyle || "solid"} ${styles.borderColor || "#e7e5e4"}`,
            ...rest, borderWidth: undefined, borderStyle: undefined, borderColor: undefined,
          }}
        />
      );
    }

    case "spacer":
      return <div {...attrs} style={{ height: styles.height || "50px", width: "100%", ...css }} />;

    case "icon":
      return wrap(
        <a href={c.href || undefined} {...noClick} style={{ color: "inherit", display: "inline-flex" }}><LucideByName name={c.icon || "Star"} /></a>,
        { display: "inline-flex", ...css },
      );

    case "icon_box":
      return wrap(
        <>
          <div style={{ width: 56, height: 56, borderRadius: 16, background: "#ffedd5", color: "#f97316", display: "grid", placeItems: "center", margin: "0 auto 12px" }}>
            <LucideByName name={c.icon || "Sparkles"} size={26} />
          </div>
          <div style={{ fontWeight: 700, fontSize: "1.1em", marginBottom: 4 }}>{c.title}</div>
          <div style={{ opacity: 0.75, fontSize: "0.92em", lineHeight: 1.6 }}>{c.text}</div>
        </>,
        { width: "100%", textAlign: "center", ...css },
      );

    case "testimonial":
      return wrap(
        <>
          <p style={{ margin: "0 0 14px", fontStyle: "italic", lineHeight: 1.7 }}>“{c.text}”</p>
          <div style={{ display: "inline-flex", alignItems: "center", gap: 10 }}>
            {c.src && <img src={c.src} alt="" style={{ width: 40, height: 40, borderRadius: 999, objectFit: "cover" }} />}
            <div style={{ textAlign: "left" }}>
              <div style={{ fontWeight: 700, fontSize: "0.9em" }}>{c.name}</div>
              {c.role && <div style={{ fontSize: "0.8em", opacity: 0.6 }}>{c.role}</div>}
            </div>
          </div>
        </>,
        { width: "100%", textAlign: "center", ...css },
      );

    case "star_rating": {
      const max = 5;
      const v = Math.min(max, Math.max(0, Number(c.value) || 0));
      return wrap(
        <div style={{ display: "inline-flex", gap: 4, color: styles.color || "#f59e0b" }} aria-label={`${v} out of ${max} stars`}>
          {Array.from({ length: max }, (_, i) => <Star key={i} size={22} fill={i < v ? "currentColor" : "none"} />)}
        </div>,
        { width: "100%", textAlign: "center", ...css },
      );
    }

    case "countdown":
      return wrap(<Countdown date={c.date} />, { display: "flex", justifyContent: "center", gap: 16, fontSize: 36, fontWeight: 700, width: "100%", ...css });

    case "progress":
      return wrap(
        <>
          <div style={{ display: "flex", justifyContent: "space-between", fontSize: 14, marginBottom: 6 }}><span>{c.text}</span><span>{c.value}%</span></div>
          <div style={{ height: 8, borderRadius: 999, background: "#e7e5e4", overflow: "hidden" }}>
            <div style={{ width: `${Math.min(100, Math.max(0, Number(c.value) || 0))}%`, height: "100%", background: "#f97316", borderRadius: 999 }} />
          </div>
        </>,
        { width: "100%", ...css },
      );

    case "map":
      return wrap(
        <iframe
          title="Venue map"
          loading="lazy"
          src={`https://maps.google.com/maps?q=${encodeURIComponent(c.address || "")}&output=embed`}
          style={{ width: "100%", height: "100%", minHeight: 220, border: 0, borderRadius: "inherit", ...lock }}
        />,
        { width: "100%", height: 260, borderRadius: 12, overflow: "hidden", ...css },
      );

    case "rsvp_form":
    case "rsvp": {
      const field = (t: string) => <div style={{ padding: 10, borderRadius: 8, background: "#fff", border: "1px solid #e7e5e4", textAlign: "left", fontSize: 14, color: "#a8a29e" }}>{t}</div>;
      return wrap(
        <>
          <h3 style={{ margin: "0 0 12px", fontSize: 20, fontWeight: 700 }}>{c.text || "Will you attend?"}</h3>
          <div style={{ display: "grid", gap: 8 }}>
            {field("Your name")}
            {field("Number of guests")}
            <div style={{ padding: 12, borderRadius: 8, background: styles.btnColor || "#f97316", color: "#fff", fontWeight: 600 }}>{c.btnText || c.button || "Confirm RSVP"}</div>
          </div>
        </>,
        { width: "100%", padding: 24, borderRadius: 16, background: "#fff", border: "1px solid #f1f5f9", textAlign: "center", ...css },
      );
    }

    /* Raw HTML / JSX / TSX / CSS: never injected into the app DOM. */
    case "html": {
      const lang: CodeLang = (c.lang as CodeLang) || "html";
      const code: string = c.code || "";
      if (!code.trim()) return <Placeholder css={css} label="Empty code block — add code in the Content tab or the Code editor" icon="Code2" />;
      
      // A CSS block styles the whole invitation canvas (scoped so it can't leak into the builder UI)
      if (lang === "css") return <style>{`@scope (.riwa-canvas) { ${code.replace(/<\/style/gi, "")} }`}</style>;
      
      // HTML/JSX/TSX runs in the CodePreview sandbox
      return wrap(<div style={{ width: "100%", ...lock }}><CodePreview lang={lang} code={code} /></div>, { width: "100%", ...css });
    }

    default:
      return wrap(
        <div style={{ padding: 32, border: "2px dashed #fed7aa", background: "#fff7ed80", borderRadius: 12, textAlign: "center", fontSize: 13, fontWeight: 600, color: "#57534e" }}>
          {type.replace(/_/g, " ").toUpperCase()}
        </div>,
        { width: "100%", ...css },
      );
  }
}

/* ========================================================================== */
/* Public component: shell = alignment + visibility + animation + responsive  */
/* ========================================================================== */

export function WidgetRenderer({ element, editing = false, device }: Props) {
  const c = element.content ?? {};
  if (c._hidden && !editing) return null;

  const styles = mergeStyles(element, device);
  const responsive = device ? "" : mediaCss(element.id, c._r);
  const entrance = ENTRANCES[c._anim as string];

  const shell: React.CSSProperties = {
    display: "flex",
    justifyContent: JUSTIFY[styles._align as string] ?? "center",
    alignItems: "flex-start",
    width: "100%",
    maxWidth: "100%",
    opacity: c._hidden ? 0.35 : undefined,
  };

  const body = (
    <>
      {responsive && <style>{responsive}</style>}
      <WidgetBody element={element} styles={styles} editing={editing} />
    </>
  );

  if (entrance) {
    return (
      <motion.div
        key={`${c._anim}-${c._animDuration}-${c._animDelay}`}
        style={shell}
        initial={entrance.initial}
        animate={editing ? entrance.animate : undefined}
        whileInView={editing ? undefined : entrance.animate}
        viewport={{ once: true, amount: 0.2 }}
        transition={{ duration: Number(c._animDuration) || 0.6, delay: Number(c._animDelay) || 0, ease: "easeOut" }}
      >
        {body}
      </motion.div>
    );
  }
  return <div style={shell}>{body}</div>;
}

export default WidgetRenderer;