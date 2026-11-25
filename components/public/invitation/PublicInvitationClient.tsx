"use client";

/**
 * components/public/invitation/PublicInvitationClient.tsx
 *
 * Guest-facing invitation:
 *  1. Intro gate preloads every image of the invitation (cover, gallery, images inside blocks)
 *     and shows them filling in with a progress bar.
 *  2. "Open invitation" is a real tap, so the browser allows audio: the music starts
 *     (fade-in) right there.
 *  3. The design is rendered with the same WidgetRenderer as the editor (editing = false),
 *     with per-item scroll animations that start once the intro closes.
 *  4. A floating ActionBar (Details · Memories · Wishes · RSVP · Music) opens each panel as a
 *     sheet on top of the page. Memories open the lightbox, RSVP leads into Wishes.
 *  5. The page never falls back to plain white: if the design has no usable background colour,
 *     the first coloured block's background is used, then a warm cream.
 */

import * as React from "react";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";

import {
  WidgetRenderer,
  type BuilderElement,
} from "@/components/admin/sections/templates/WidgetRenderer";
import { CodePreview } from "@/components/admin/sections/templates/CodeEditor";
import { normalizeData, resolveElement, type InvitationData } from "@/lib/elementor/invitation-data";
import type { PublicInvitation } from "@/lib/invitations/public-invitation";
import {
  ActionBar,
  ActionDock,
  Countdown,
  DetailsSheet,
  Gallery,
  Guestbook,
  IntroGate,
  Lightbox,
  MemoriesSheet,
  Reveal,
  RsvpModal,
  ScrollProgress,
  WishesSheet,
  readAnim,
  type MediaItem,
  type PanelId,
} from "./PublicInvitationUI";

type Rec = Record<string, any>;
type Device = "desktop" | "tablet" | "mobile";

// Full-width bands whose text stays centred without side gutters on small screens
const BAND = "w-full px-[max(1rem,calc((100%-44rem)/2))]";

const PRELOAD_TIMEOUT_MS = 10_000;
const MAX_PRELOAD = 40;
const MUSIC_VOLUME = 0.85;
const FALLBACK_BG = "#fff4e8";

/* ========================================================================== */
/*  Design helpers                                                            */
/* ========================================================================== */

type PublicDesign = {
  elements: BuilderElement[];
  backgroundColor: string;
  customCss: string;
  customCode: string;
  customCodeLang: string;
  coreNames: { bride: string; groom: string };
  galleryUrls: string[];
  videoUrls: string[];
  musicUrls: string[];
  thumbnailUrl: string;
  details: { date: string; time: string; venue: string; address: string };
};

const s = (v: unknown, f = "") => (typeof v === "string" ? v : f);
const httpsList = (v: unknown) =>
  Array.isArray(v) ? v.filter((x): x is string => typeof x === "string" && /^https:\/\//i.test(x)) : [];

function normalizePublicDesign(raw: Rec): PublicDesign {
  const ps = (raw.pageSettings && typeof raw.pageSettings === "object" ? raw.pageSettings : {}) as Rec;
  const names = (raw.coreNames ?? {}) as Rec;
  const dt = (raw.details ?? {}) as Rec;
  const elements = (Array.isArray(raw.elements) ? raw.elements : [])
    .filter((e: Rec) => e && typeof e.id === "string" && typeof e.type === "string")
    .map((e: Rec) => ({
      ...e,
      content: e.content && typeof e.content === "object" ? e.content : {},
      styles: e.styles && typeof e.styles === "object" ? e.styles : {},
      customCode: e.customCode ?? null,
    })) as BuilderElement[];

  return {
    elements,
    backgroundColor: s(ps.backgroundColor, "#ffffff") || "#ffffff",
    customCss: s(ps.customCss),
    customCode: s(ps.customCode),
    customCodeLang: s(ps.customCodeLang, "html"),
    coreNames: { bride: s(names.bride), groom: s(names.groom) },
    galleryUrls: httpsList(raw.galleryUrls),
    videoUrls: httpsList(raw.videoUrls),
    musicUrls: httpsList(raw.musicUrls),
    thumbnailUrl: /^https:\/\//i.test(s(raw.thumbnailUrl)) ? s(raw.thumbnailUrl) : "",
    details: { date: s(dt.date), time: s(dt.time), venue: s(dt.venue), address: s(dt.address) },
  };
}

const IMG_EXT = /\.(png|jpe?g|webp|gif|avif|svg)(\?|#|$)/i;
const HTTPS = /^https:\/\//i;
const IMG_KEY = /^(src\d*|image|poster|background|backgroundImage)$/i;
const HTML_IMG = /<img[^>]+src=["'](https:[^"']+)["']/gi;
const HTML_BG = /url\(\s*["']?(https:[^"')]+)["']?\s*\)/gi;

/** Every image the guest will see, in the order they matter (cover first). */
function collectAssetUrls(d: PublicDesign): string[] {
  const out = new Set<string>();
  const add = (u: string) => out.size < MAX_PRELOAD && out.add(u);
  if (d.thumbnailUrl) add(d.thumbnailUrl);
  d.galleryUrls.forEach(add);

  for (const el of d.elements) {
    if (el.type === "audio" || el.type === "video") continue;
    for (const [k, v] of Object.entries(el.content ?? {})) {
      if (typeof v !== "string") continue;
      if (HTTPS.test(v) && (IMG_EXT.test(v) || IMG_KEY.test(k))) add(v);
      else if (v.includes("<") || v.includes("url(")) {
        for (const m of v.matchAll(HTML_IMG)) add(m[1]);
        for (const m of v.matchAll(HTML_BG)) add(m[1]);
      }
    }
    const bg = (el.styles as Rec)?.backgroundImage;
    if (typeof bg === "string") for (const m of bg.matchAll(HTML_BG)) add(m[1]);
  }
  return Array.from(out);
}

/** Photos and videos the guest can open in the viewer. */
function collectMedia(d: PublicDesign, assets: string[]): MediaItem[] {
  const seen = new Set<string>();
  const out: MediaItem[] = [];
  const add = (type: MediaItem["type"], url: unknown) => {
    if (typeof url !== "string" || !HTTPS.test(url) || seen.has(url) || out.length >= 60) return;
    seen.add(url);
    out.push({ type, url });
  };
  if (d.thumbnailUrl) add("image", d.thumbnailUrl);
  d.galleryUrls.forEach((u) => add("image", u));
  for (const el of d.elements) {
    if (el.content?._hidden) continue;
    if (el.type === "image") add("image", el.content?.src);
  }
  // photos the host uploaded themselves, wherever they sit in the design
  assets.forEach((u) => u.includes("/rehearsal/") && add("image", u));
  d.videoUrls.forEach((u) => add("video", u));
  for (const el of d.elements) {
    if (el.type === "video" && !el.content?._hidden) add("video", el.content?.src);
  }
  return out;
}

/* ---- colour helpers ------------------------------------------------------ */

function toRgb(color: string): [number, number, number] | null {
  let h = color.trim();
  const short = /^#([0-9a-f])([0-9a-f])([0-9a-f])$/i.exec(h);
  if (short) h = `#${short[1]}${short[1]}${short[2]}${short[2]}${short[3]}${short[3]}`;
  const m = /^#([0-9a-f]{6})$/i.exec(h);
  if (!m) return null;
  const n = parseInt(m[1], 16);
  return [n >> 16, (n >> 8) & 255, n & 255];
}

function isDark(color: string): boolean {
  const c = toRgb(color);
  if (!c) return false;
  return 0.299 * c[0] + 0.587 * c[1] + 0.114 * c[2] < 140;
}

const isNearWhite = (color: string) => {
  const c = toRgb(color);
  return !!c && c.every((x) => x >= 240);
};

/**
 * The page background. Uses the design's own colour unless it is (near) white / empty, then the
 * first block that paints a real colour, then a warm cream, so the page is never a flat white.
 */
function pickBackground(d: PublicDesign): string {
  const own = d.backgroundColor.trim();
  if (own && own.toLowerCase() !== "transparent" && !isNearWhite(own)) return own;

  for (const el of d.elements) {
    if (el.content?._hidden) continue;
    const st = (el.styles ?? {}) as Rec;
    for (const k of ["backgroundColor", "background"]) {
      const v = st[k];
      if (typeof v === "string" && toRgb(v) && !isNearWhite(v)) return v.trim();
    }
  }
  return FALLBACK_BG;
}

/* ========================================================================== */
/*  Hooks                                                                     */
/* ========================================================================== */

function usePreload(urls: string[]) {
  const key = urls.join("|");
  const [done, setDone] = React.useState(0);
  const [loaded, setLoaded] = React.useState<string[]>([]);
  const [forced, setForced] = React.useState(false);

  React.useEffect(() => {
    let cancelled = false;
    setDone(0);
    setLoaded([]);
    setForced(false);
    if (urls.length === 0) return;

    const imgs: HTMLImageElement[] = [];
    const finish = (u: string, ok: boolean) => {
      if (cancelled) return;
      setDone((n) => n + 1);
      if (ok) setLoaded((l) => (l.includes(u) ? l : [...l, u]));
    };
    for (const u of urls) {
      const img = new Image();
      img.decoding = "async";
      img.onload = () => finish(u, true);
      img.onerror = () => finish(u, false);
      img.src = u;
      imgs.push(img);
    }
    const t = window.setTimeout(() => !cancelled && setForced(true), PRELOAD_TIMEOUT_MS);
    return () => {
      cancelled = true;
      window.clearTimeout(t);
      imgs.forEach((i) => {
        i.onload = null;
        i.onerror = null;
      });
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key]);

  const total = urls.length;
  return {
    loaded,
    progress: total ? Math.min(1, done / total) : 1,
    ready: total === 0 || done >= total || forced,
  };
}

function useDevice(): Device {
  const [d, setD] = React.useState<Device>("desktop");
  React.useEffect(() => {
    const calc = () => {
      const w = window.innerWidth;
      setD(w < 768 ? "mobile" : w < 1100 ? "tablet" : "desktop");
    };
    calc();
    window.addEventListener("resize", calc);
    return () => window.removeEventListener("resize", calc);
  }, []);
  return d;
}

/** Background music: starts from a user tap, fades in, pauses when the tab is hidden. */
function useMusic(src: string | null) {
  const ref = React.useRef<HTMLAudioElement | null>(null);
  const raf = React.useRef<number | null>(null);
  const resume = React.useRef(false);
  const [on, setOn] = React.useState(false);

  const fadeTo = React.useCallback((target: number, ms: number, then?: () => void) => {
    const a = ref.current;
    if (!a) return;
    if (raf.current) cancelAnimationFrame(raf.current);
    const from = a.volume;
    const t0 = performance.now();
    const step = () => {
      const p = Math.min(1, (performance.now() - t0) / ms);
      a.volume = Math.min(1, Math.max(0, from + (target - from) * p));
      if (p < 1) raf.current = requestAnimationFrame(step);
      else {
        raf.current = null;
        then?.();
      }
    };
    raf.current = requestAnimationFrame(step);
  }, []);

  const play = React.useCallback(() => {
    const a = ref.current;
    if (!a) return;
    a.volume = 0;
    // play() is called synchronously inside the tap handler, which is what browsers require.
    a.play().then(
      () => {
        setOn(true);
        fadeTo(MUSIC_VOLUME, 1500);
      },
      () => setOn(false),
    );
  }, [fadeTo]);

  const pause = React.useCallback(() => {
    setOn(false);
    fadeTo(0, 350, () => ref.current?.pause());
  }, [fadeTo]);

  React.useEffect(() => {
    const onVis = () => {
      const a = ref.current;
      if (!a) return;
      if (document.visibilityState === "hidden") {
        resume.current = !a.paused;
        if (!a.paused) a.pause();
      } else if (resume.current) {
        resume.current = false;
        a.play().catch(() => setOn(false));
      }
    };
    document.addEventListener("visibilitychange", onVis);
    return () => {
      document.removeEventListener("visibilitychange", onVis);
      if (raf.current) cancelAnimationFrame(raf.current);
      ref.current?.pause();
    };
  }, []);

  const element = src ? <audio ref={ref} src={src} preload="auto" loop playsInline className="hidden" /> : null;
  return { element, on, play, pause, has: !!src };
}

/* ========================================================================== */
/*  Component                                                                 */
/* ========================================================================== */

export function PublicInvitationClient({ invitation }: { invitation: PublicInvitation }) {
  const reduce = !!useReducedMotion();
  const device = useDevice();
  const [opened, setOpened] = React.useState(false);
  const [wishKey, setWishKey] = React.useState(0);
  const [lb, setLb] = React.useState<number | null>(null);
  /** Which sheet is open. Only one at a time; the lightbox sits on top of any of them. */
  const [panel, setPanel] = React.useState<PanelId | null>(null);
  const ducked = React.useRef(false);

  const design = React.useMemo(() => normalizePublicDesign(invitation.designSchema), [invitation.designSchema]);
  const music = useMusic(invitation.musicUrl ?? design.musicUrls[0] ?? null);

  const assets = React.useMemo(() => collectAssetUrls(design), [design]);
  const pre = usePreload(assets);
  const media = React.useMemo(() => collectMedia(design, assets), [design, assets]);

  const pageBg = React.useMemo(() => pickBackground(design), [design]);

  const date = design.details.date || invitation.eventDate || "";
  const time = design.details.time || invitation.eventTime || "";
  const venue = design.details.venue || s(invitation.venue?.name);
  const address = design.details.address || s(invitation.venue?.address);
  const { bride, groom } = design.coreNames;
  const names = bride && groom ? `${bride} & ${groom}` : bride || groom || invitation.title;
  const coverUrl = design.thumbnailUrl || design.galleryUrls[0] || assets[0] || "";

  const data = React.useMemo<InvitationData>(
    () =>
      normalizeData({
        names: { bride, groom },
        title: invitation.title,
        event: { date, time },
        venue: { name: venue, address, mapUrl: s(invitation.venue?.mapUrl) },
        thumbnail: design.thumbnailUrl,
        gallery: design.galleryUrls,
        videos: design.videoUrls,
        music: music.has ? [invitation.musicUrl ?? design.musicUrls[0]] : design.musicUrls,
        slots: {},
      }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [design, invitation, date, time, venue, address],
  );

  /* keep the page still while the intro is up */
  React.useEffect(() => {
    if (opened) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, [opened]);

  const open = () => {
    if (!pre.ready) return;
    music.play(); // must run inside the tap
    setOpened(true);
    window.scrollTo({ top: 0 });
  };

  /** Pause the song while a video plays, bring it back afterwards. */
  const onVideo = (playing: boolean) => {
    if (playing && music.on) {
      ducked.current = true;
      music.pause();
    } else if (!playing && ducked.current) {
      ducked.current = false;
      music.play();
    }
  };
  const closeViewer = () => {
    setLb(null);
    onVideo(false);
  };

  const closePanel = React.useCallback(() => setPanel(null), []);
  const bumpWishes = React.useCallback(() => setWishKey((n) => n + 1), []);

  const dark = isDark(pageBg);
  const visible = design.elements.filter((e) => !e.content?._hidden);
  const hasDetails = !!(date || venue || address);
  const viewerOpen = lb !== null;

  const pageCss = [design.customCss, design.customCodeLang === "css" ? design.customCode : ""]
    .filter(Boolean)
    .join("\n")
    .replace(/<\/style/gi, "")
    .replace(/@import[^;]*;?/gi, "");

  const showCode = design.customCode.trim() !== "" && design.customCodeLang !== "css";

  return (
    <div className="min-h-dvh" style={{ background: pageBg }}>
      {music.element}

      <AnimatePresence>
        {!opened && (
          <IntroGate
            key="intro"
            names={names}
            coverUrl={coverUrl}
            previews={assets}
            loaded={pre.loaded}
            progress={pre.progress}
            ready={pre.ready}
            hasMusic={music.has}
            dark={dark}
            bg={pageBg}
            onOpen={open}
          />
        )}
      </AnimatePresence>

      <main className="riwa-public w-full overflow-x-clip">
        {pageCss && <style>{`@scope (.riwa-public) { ${pageCss} }`}</style>}

        {visible.map((el) => (
          <div key={el.id} id={`el-${el.id}`}>
            <Reveal anim={el.content?._anim === undefined ? { type: "fade-up", duration: 0.9, delay: 0 } : readAnim(el.content)} replayKey={opened ? 1 : 0} reduce={reduce}>
              <WidgetRenderer element={resolveElement(el, data)} editing={false} device={device} />
            </Reveal>
          </div>
        ))}

        {showCode && (
          <div className="mt-2">
            <CodePreview lang={design.customCodeLang as any} code={design.customCode} data={data} />
          </div>
        )}

        <Gallery items={media} dark={dark} onOpen={setLb} />

        <section className={`${BAND} space-y-6 py-16 text-center`}>
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, amount: 0.3 }}
            transition={{ duration: 0.8, ease: [0.22, 1, 0.36, 1] }}
            className="space-y-6"
          >
            <p className={dark ? "text-[11px] font-semibold uppercase tracking-[0.3em] text-white/60" : "text-[11px] font-semibold uppercase tracking-[0.3em] text-stone-600"}>
              Save the date
            </p>
            <Countdown date={date} time={time} dark={dark} />
            <ActionDock title={names} date={date} time={time} venue={venue} address={address} dark={dark} />
            <button
              type="button"
              onClick={() => setPanel("rsvp")}
              className="mx-auto flex h-14 w-full items-center justify-center gap-2 rounded-full bg-orange-500 text-base font-semibold text-white shadow-md transition hover:bg-orange-600 active:scale-[0.98]"
            >
              Will you join us? RSVP now
            </button>
          </motion.div>
        </section>

        <Guestbook slug={invitation.slug} dark={dark} refreshKey={wishKey} onPosted={bumpWishes} />

        {/* extra bottom room so the floating bar never covers the footer */}
        <p className={`${BAND} pb-32 pt-8 text-center text-xs ${dark ? "text-white/50" : "text-stone-600"}`}>
          Made with{" "}
          <a href="/" className="font-semibold underline underline-offset-2">
            RiwaInvite
          </a>
        </p>
      </main>

      {opened && (
        <>
          <ScrollProgress />
          <ActionBar
            visible={panel === null && !viewerOpen}
            active={panel}
            dark={dark}
            hasDetails={hasDetails}
            hasMemories={media.length > 0}
            music={music.has ? { on: music.on, toggle: () => (music.on ? music.pause() : music.play()) } : null}
            onOpen={setPanel}
          />
        </>
      )}

      <DetailsSheet
        open={panel === "details"}
        onClose={closePanel}
        title={names}
        date={date}
        time={time}
        venue={venue}
        address={address}
        dark={dark}
        inert={viewerOpen}
      />

      <MemoriesSheet
        open={panel === "memories"}
        onClose={closePanel}
        items={media}
        dark={dark}
        onPick={setLb}
        inert={viewerOpen}
      />

      <WishesSheet
        open={panel === "wishes"}
        onClose={closePanel}
        slug={invitation.slug}
        dark={dark}
        refreshKey={wishKey}
        onPosted={bumpWishes}
        inert={viewerOpen}
      />

      <RsvpModal
        open={panel === "rsvp"}
        onClose={closePanel}
        slug={invitation.slug}
        names={names}
        dark={dark}
        onSent={bumpWishes}
        onWish={() => setPanel("wishes")}
        inert={viewerOpen}
      />

      <Lightbox items={media} index={lb} onIndex={setLb} onClose={closeViewer} onVideo={onVideo} />
    </div>
  );
}

export default PublicInvitationClient;