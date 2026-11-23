"use client";

/**
 * components/user/sections/ai-studio/ui/AiStudioUI.tsx
 *
 * Presentational pieces + helpers for AI Studio.
 *  - useVoiceInput        : Web Speech API (Chrome, Edge, Safari)
 *  - RichText             : safe mini-markdown renderer for assistant answers
 *  - exportChat           : download the conversation as PDF / TXT / MD
 *  - downloadInvoice      : print-ready invoice (Save as PDF)
 *  - ChatToolbar, ChatThread, Composer, TemplateStrip, InvoiceList, KeySettingsModal
 * No data fetching here: AiStudioClient owns all API calls.
 */

import * as React from "react";
import { AnimatePresence, motion } from "framer-motion";
import {
  AlertTriangle,
  ArrowDown,
  Bot,
  CalendarClock,
  Check,
  CheckCircle2,
  Clock,
  Copy,
  Crown,
  Download,
  Eye,
  EyeOff,
  ExternalLink,
  FileText,
  ImageOff,
  KeyRound,
  Languages,
  LayoutTemplate,
  Lightbulb,
  Loader2,
  Lock,
  Mail,
  Maximize2,
  Mic,
  Printer,
  Receipt,
  RotateCcw,
  Send,
  Settings2,
  ShieldCheck,
  Sparkles,
  Square,
  Trash2,
  Users,
  X,
  type LucideIcon,
} from "lucide-react";
import { cn } from "@/components/user/sections/dashboard/ui/DashboardUI";

/* ========================================================================== */
/*  Types & constants                                                         */
/* ========================================================================== */

export type KeyInfo = {
  has_key: boolean;
  provider: string;
  model: string;
  is_valid: boolean;
  masked_key: string | null;
  last_validated_at: string | null;
  available_models: string[];
};

export type TemplateCard = {
  key: string;
  name: string;
  image: string | null;
  tier: "premium" | "simple" | null;
  note: string | null;
};

export type InvoiceCard = {
  number: string;
  issued_at: string | null;
  status: string;
  amount: number;
  order_type: string | null;
  items: { type: string; price: number }[];
  custom_link: string | null;
};

export type MessageCards = { templates?: TemplateCard[]; invoices?: InvoiceCard[] };

export type ChatMessage = {
  id: string;
  role: "user" | "assistant";
  text: string;
  /** Epoch ms when the message was created. */
  at: number;
  /** Round-trip time of the answer, in ms. */
  tookMs?: number;
  error?: boolean;
  /** Shows an "Open key settings" button under the message. */
  needsKey?: boolean;
  cards?: MessageCards;
};

export type Customer = { name: string; email: string; phone: string };
export type KeyBusy = "save" | "model" | "delete" | null;
export type ExportFormat = "pdf" | "txt" | "md";

export const MAX_MESSAGE = 1000;
export const BRAND = "Riwainvite";
/** Change this if your orders are not in Pakistani rupees. */
export const INVOICE_CURRENCY = "PKR";

export const STARTERS: { label: string; hint: string; Icon: LucideIcon }[] = [
  { label: "How many guests have confirmed?", hint: "RSVPs across your invitations", Icon: Users },
  { label: "When does my plan expire?", hint: "Plan status and limits", Icon: CalendarClock },
  { label: "Show my latest orders", hint: "With downloadable invoices", Icon: Receipt },
  { label: "Show me premium templates", hint: "Preview designs right here", Icon: LayoutTemplate },
  { label: "Which invitations are still drafts?", hint: "Pick up where you left off", Icon: Mail },
  { label: "How do I publish my invitation?", hint: "Step-by-step help", Icon: Lightbulb },
];

const MODEL_NOTES: Record<string, string> = {
  "openai/gpt-oss-120b": "Most accurate (recommended)",
  "openai/gpt-oss-20b": "Faster, lighter",
  "llama-3.3-70b-versatile": "Balanced",
  "llama-3.1-8b-instant": "Fastest, simple questions",
};

/* ========================================================================== */
/*  Small helpers (time, money, download, print)                              */
/* ========================================================================== */

export const fmtTime = (t: number) => new Date(t).toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });

export const fmtDuration = (ms: number) => (ms < 1000 ? `${ms} ms` : `${(ms / 1000).toFixed(1)}s`);

function sameDay(a: Date, b: Date) {
  return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();
}

function dayLabel(t: number): string {
  const d = new Date(t);
  const now = new Date();
  const y = new Date();
  y.setDate(now.getDate() - 1);
  if (sameDay(d, now)) return "Today";
  if (sameDay(d, y)) return "Yesterday";
  return d.toLocaleDateString([], { month: "short", day: "numeric", year: "numeric" });
}

export function money(n: number): string {
  try {
    return new Intl.NumberFormat("en-PK", {
      style: "currency",
      currency: INVOICE_CURRENCY,
      minimumFractionDigits: 0,
      maximumFractionDigits: 2,
    }).format(n);
  } catch {
    return `${INVOICE_CURRENCY} ${n}`;
  }
}

const esc = (s: string) =>
  s.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c] as string);

const pretty = (s: string) => s.replace(/[_-]+/g, " ").replace(/^\w/, (c) => c.toUpperCase());

const stamp = () => new Date().toISOString().slice(0, 16).replace(/[:T]/g, "-");

function saveFile(filename: string, mime: string, content: string) {
  const blob = new Blob([content], { type: `${mime};charset=utf-8` });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1500);
}

/** Prints an HTML string through a hidden iframe (no popup, so it is never blocked). */
function printHtml(html: string) {
  const iframe = document.createElement("iframe");
  iframe.setAttribute("aria-hidden", "true");
  Object.assign(iframe.style, { position: "fixed", right: "0", bottom: "0", width: "0", height: "0", border: "0" });
  document.body.appendChild(iframe);
  const doc = iframe.contentDocument;
  const win = iframe.contentWindow;
  if (!doc || !win) {
    iframe.remove();
    return;
  }
  doc.open();
  doc.write(html);
  doc.close();
  const cleanup = () => setTimeout(() => iframe.remove(), 500);
  win.onafterprint = cleanup;
  setTimeout(() => {
    win.focus();
    win.print();
    setTimeout(cleanup, 60_000);
  }, 300);
}

/* ========================================================================== */
/*  Rich text (safe mini-markdown: bold, italic, code, links, lists)          */
/*  Builds React elements only, never raw HTML, so model output cannot        */
/*  inject markup.                                                            */
/* ========================================================================== */

const INLINE_RE = /(\*\*[^*\n]+\*\*|__[^_\n]+__|`[^`\n]+`|\[[^\]\n]+\]\(https?:\/\/[^\s)]+\)|\*[^*\s][^*\n]*?\*)/g;

function renderInline(text: string, prefix: string): React.ReactNode[] {
  const out: React.ReactNode[] = [];
  let last = 0;
  let i = 0;
  for (const m of text.matchAll(INLINE_RE)) {
    const tok = m[0];
    const at = m.index ?? 0;
    if (at > last) out.push(text.slice(last, at));
    const key = `${prefix}-${i++}`;
    if (tok.startsWith("**") || tok.startsWith("__")) {
      out.push(
        <strong key={key} className="font-semibold text-[#2a1002]">
          {renderInline(tok.slice(2, -2), key)}
        </strong>,
      );
    } else if (tok.startsWith("`")) {
      out.push(
        <code key={key} className="rounded-md bg-stone-100 px-1.5 py-0.5 font-mono text-[12.5px] text-stone-800">
          {tok.slice(1, -1)}
        </code>,
      );
    } else if (tok.startsWith("[")) {
      const mm = /^\[([^\]]+)\]\((.+)\)$/.exec(tok);
      out.push(
        mm ? (
          <a
            key={key}
            href={mm[2]}
            target="_blank"
            rel="noopener noreferrer"
            className="font-medium text-orange-700 underline decoration-orange-300 underline-offset-2 hover:text-orange-800"
          >
            {mm[1]}
          </a>
        ) : (
          tok
        ),
      );
    } else {
      out.push(<em key={key}>{tok.slice(1, -1)}</em>);
    }
    last = at + tok.length;
  }
  if (last < text.length) out.push(text.slice(last));
  return out;
}

type Block =
  | { t: "p"; lines: string[] }
  | { t: "h"; text: string }
  | { t: "ul"; items: string[] }
  | { t: "ol"; items: string[] };

function parseBlocks(src: string): Block[] {
  const blocks: Block[] = [];
  const lines = src.replace(/\r\n?/g, "\n").split("\n");
  // `open` is true while the last block can still take the next line (same list or paragraph).
  let open = false;

  for (const line of lines) {
    if (!line.trim()) {
      open = false;
      continue;
    }

    const head = /^\s*#{1,4}\s+(.*)$/.exec(line);
    if (head) {
      blocks.push({ t: "h", text: head[1] });
      open = false;
      continue;
    }

    const bullet = /^\s*[-*•]\s+(.*)$/.exec(line);
    if (bullet) {
      const prev = blocks[blocks.length - 1];
      if (open && prev?.t === "ul") prev.items.push(bullet[1]);
      else blocks.push({ t: "ul", items: [bullet[1]] });
      open = true;
      continue;
    }

    const num = /^\s*\d+[.)]\s+(.*)$/.exec(line);
    if (num) {
      const prev = blocks[blocks.length - 1];
      if (open && prev?.t === "ol") prev.items.push(num[1]);
      else blocks.push({ t: "ol", items: [num[1]] });
      open = true;
      continue;
    }

    const prev = blocks[blocks.length - 1];
    if (open && prev?.t === "p") prev.lines.push(line.trim());
    else blocks.push({ t: "p", lines: [line.trim()] });
    open = true;
  }
  return blocks;
}

/** Plain-text version (for copy, TXT and PDF export): removes the markdown markers. */
export function stripMarkdown(s: string): string {
  return s
    .replace(/\*\*([^*\n]+)\*\*/g, "$1")
    .replace(/__([^_\n]+)__/g, "$1")
    .replace(/`([^`\n]+)`/g, "$1")
    .replace(/\[([^\]\n]+)\]\((https?:\/\/[^\s)]+)\)/g, "$1 ($2)")
    .replace(/^\s*#{1,4}\s+/gm, "")
    .replace(/^\s*[-*•]\s+/gm, "• ");
}

export function RichText({ text }: { text: string }) {
  const blocks = React.useMemo(() => parseBlocks(text), [text]);
  return (
    <div className="space-y-2.5 break-words" dir="auto">
      {blocks.map((b, bi) => {
        const k = `b${bi}`;
        if (b.t === "h") {
          return (
            <p key={k} className="text-[13px] font-bold uppercase tracking-wide text-orange-700">
              {renderInline(b.text, k)}
            </p>
          );
        }
        if (b.t === "ul") {
          return (
            <ul key={k} className="space-y-1.5">
              {b.items.map((it, i) => (
                <li key={i} className="flex gap-2.5">
                  <span className="mt-[9px] size-1.5 shrink-0 rounded-full bg-orange-400" aria-hidden />
                  <span className="min-w-0 flex-1">{renderInline(it, `${k}-${i}`)}</span>
                </li>
              ))}
            </ul>
          );
        }
        if (b.t === "ol") {
          return (
            <ol key={k} className="space-y-1.5">
              {b.items.map((it, i) => (
                <li key={i} className="flex gap-2.5">
                  <span className="mt-0.5 flex size-5 shrink-0 items-center justify-center rounded-full bg-orange-100 text-[11px] font-bold text-orange-700">
                    {i + 1}
                  </span>
                  <span className="min-w-0 flex-1">{renderInline(it, `${k}-${i}`)}</span>
                </li>
              ))}
            </ol>
          );
        }
        return (
          <p key={k}>
            {b.lines.map((l, i) => (
              <React.Fragment key={i}>
                {i > 0 && <br />}
                {renderInline(l, `${k}-${i}`)}
              </React.Fragment>
            ))}
          </p>
        );
      })}
    </div>
  );
}

/* ========================================================================== */
/*  Invoice + chat export                                                     */
/* ========================================================================== */

function invoiceHtml(inv: InvoiceCard, c: Customer): string {
  const issued = inv.issued_at
    ? new Date(inv.issued_at).toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" })
    : "N/A";
  const paid = inv.status === "completed";
  const lines = inv.items.length ? inv.items : [{ type: inv.order_type ?? "order", price: inv.amount }];
  const rows = lines
    .map((it) => `<tr><td>${esc(pretty(it.type))}</td><td class="r">${esc(money(it.price))}</td></tr>`)
    .join("");

  return `<!doctype html><html><head><meta charset="utf-8"><title>${esc(inv.number)}</title>
<style>
@page{size:A4;margin:16mm}
*{box-sizing:border-box}
body{margin:0;font:14px/1.55 -apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,Helvetica,Arial,sans-serif;color:#2a1002;-webkit-print-color-adjust:exact;print-color-adjust:exact}
.top{display:flex;justify-content:space-between;align-items:flex-start;padding-bottom:22px;border-bottom:3px solid #f97316}
.brand{font-size:24px;font-weight:800;letter-spacing:-.02em}.brand b{color:#ea580c}
.muted{color:#78716c;font-size:12px}
h1{margin:0;font-size:30px;letter-spacing:.08em;text-align:right}
.meta{display:grid;grid-template-columns:1fr 1fr;gap:24px;margin:28px 0}
.label{font-size:11px;text-transform:uppercase;letter-spacing:.08em;color:#a8a29e;margin-bottom:4px}
.pill{display:inline-block;padding:3px 12px;border-radius:999px;font-size:12px;font-weight:700;background:${paid ? "#d1fae5" : "#fef3c7"};color:${paid ? "#047857" : "#b45309"}}
table{width:100%;border-collapse:collapse;margin-top:8px}
th{text-align:left;font-size:11px;text-transform:uppercase;letter-spacing:.08em;color:#78716c;padding:10px 12px;background:#fff7ed}
td{padding:12px;border-bottom:1px solid #f5f5f4}
.r{text-align:right}
.total{margin-top:18px;margin-left:auto;width:260px;padding:14px 16px;border-radius:12px;background:#2a1002;color:#fff;display:flex;justify-content:space-between;font-size:16px;font-weight:700}
.foot{margin-top:48px;padding-top:16px;border-top:1px solid #e7e5e4;text-align:center}
</style></head><body>
<div class="top">
  <div><div class="brand">${esc(BRAND.slice(0, 4))}<b>${esc(BRAND.slice(4))}</b></div><div class="muted">Digital invitations</div></div>
  <div><h1>INVOICE</h1><div class="muted" style="text-align:right">${esc(inv.number)}</div></div>
</div>
<div class="meta">
  <div><div class="label">Billed to</div><strong>${esc(c.name)}</strong><br><span class="muted">${esc(c.email)}${c.phone ? `<br>${esc(c.phone)}` : ""}</span></div>
  <div style="text-align:right"><div class="label">Issued</div>${esc(issued)}<div style="margin-top:10px"><span class="pill">${paid ? "Paid" : esc(pretty(inv.status))}</span></div></div>
</div>
<table><thead><tr><th>Description</th><th class="r">Amount</th></tr></thead><tbody>${rows}</tbody></table>
${inv.custom_link ? `<p class="muted" style="margin-top:14px">Custom link: ${esc(inv.custom_link)}</p>` : ""}
<div class="total"><span>Total</span><span>${esc(money(inv.amount))}</span></div>
<div class="foot muted">Thank you for choosing ${esc(BRAND)}. This invoice was generated automatically.</div>
</body></html>`;
}

export function downloadInvoice(inv: InvoiceCard, customer: Customer) {
  printHtml(invoiceHtml(inv, customer));
}

export function exportChat(messages: ChatMessage[], customer: Customer, format: ExportFormat) {
  const who = (m: ChatMessage) => (m.role === "user" ? "You" : "Assistant");
  const when = (m: ChatMessage) => `${new Date(m.at).toLocaleDateString()} ${fmtTime(m.at)}`;
  const took = (m: ChatMessage) => (m.tookMs ? ` · answered in ${fmtDuration(m.tookMs)}` : "");
  // Assistant answers contain markdown markers; TXT and PDF should show clean text.
  const plain = (m: ChatMessage) => (m.role === "assistant" && !m.error ? stripMarkdown(m.text) : m.text);
  const title = `${BRAND} AI Studio chat`;
  const header = `Exported for ${customer.name} on ${new Date().toLocaleString()}`;

  if (format === "txt") {
    const body = messages.map((m) => `[${when(m)}] ${who(m)}${took(m)}\n${plain(m)}`).join("\n\n");
    saveFile(`ai-studio-chat-${stamp()}.txt`, "text/plain", `${title}\n${header}\n${"-".repeat(48)}\n\n${body}\n`);
    return;
  }

  if (format === "md") {
    // The assistant already writes markdown, so it is kept as is.
    const body = messages.map((m) => `**${who(m)}** · ${when(m)}${took(m)}\n\n${m.text}`).join("\n\n---\n\n");
    saveFile(`ai-studio-chat-${stamp()}.md`, "text/markdown", `# ${title}\n\n_${header}_\n\n${body}\n`);
    return;
  }

  const bubbles = messages
    .map(
      (m) => `<div class="m ${m.role}"><div class="who">${who(m)} · ${esc(when(m))}${esc(took(m))}</div><div class="b">${esc(plain(m)).replace(/\n/g, "<br>")}</div></div>`,
    )
    .join("");
  printHtml(`<!doctype html><html><head><meta charset="utf-8"><title>${esc(title)}</title><style>
@page{size:A4;margin:16mm}
body{margin:0;font:13px/1.6 -apple-system,"Segoe UI",Roboto,Arial,sans-serif;color:#2a1002;-webkit-print-color-adjust:exact;print-color-adjust:exact}
h1{margin:0;font-size:22px}.sub{color:#78716c;font-size:12px;margin:4px 0 20px;padding-bottom:14px;border-bottom:3px solid #f97316}
.m{margin:0 0 14px;break-inside:avoid}.who{font-size:11px;color:#78716c;margin-bottom:3px}
.b{display:inline-block;max-width:85%;padding:9px 13px;border-radius:14px;background:#f5f5f4}
.user{text-align:right}.user .b{background:#292524;color:#fff;text-align:left}
</style></head><body><h1>${esc(title)}</h1><div class="sub">${esc(header)}</div>${bubbles}</body></html>`);
}

/* ========================================================================== */
/*  Voice input (Web Speech API)                                              */
/* ========================================================================== */

export type VoiceLang = "en-US" | "ur-PK";

export const VOICE_LANGS: { id: VoiceLang; label: string }[] = [
  { id: "en-US", label: "English" },
  { id: "ur-PK", label: "اردو" },
];

function voiceErrorText(code: string): string {
  switch (code) {
    case "not-allowed":
    case "service-not-allowed":
      return "Microphone access is blocked. Allow it in your browser settings and try again.";
    case "no-speech":
      return "I didn’t hear anything. Tap the mic and try again.";
    case "audio-capture":
      return "No microphone was found on this device.";
    case "network":
      return "Voice input needs an internet connection.";
    case "language-not-supported":
      return "This browser doesn’t support that language for voice input.";
    default:
      return "Voice input stopped. Please try again.";
  }
}

/**
 * start(base, onText): dictates into `onText`, keeping whatever was already typed (`base`).
 * Results are only ever passed to the text box. Nothing is sent until the user presses Send.
 */
export function useVoiceInput(lang: VoiceLang) {
  const recRef = React.useRef<any>(null);
  const [supported, setSupported] = React.useState(false);
  const [listening, setListening] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  React.useEffect(() => {
    const w = window as any;
    setSupported(Boolean(w.SpeechRecognition || w.webkitSpeechRecognition));
    return () => recRef.current?.abort?.();
  }, []);

  const stop = React.useCallback(() => recRef.current?.stop?.(), []);

  const start = React.useCallback(
    (base: string, onText: (text: string) => void) => {
      const w = window as any;
      const Ctor = w.SpeechRecognition || w.webkitSpeechRecognition;
      if (!Ctor) return;
      recRef.current?.abort?.();

      const rec = new Ctor();
      rec.lang = lang;
      rec.interimResults = true;
      rec.continuous = true;
      rec.maxAlternatives = 1;

      const prefix = base && !/\s$/.test(base) ? `${base} ` : base;
      rec.onstart = () => {
        setError(null);
        setListening(true);
      };
      rec.onresult = (e: any) => {
        let said = "";
        for (let i = 0; i < e.results.length; i++) said += e.results[i][0].transcript;
        onText((prefix + said.trim()).slice(0, MAX_MESSAGE));
      };
      rec.onerror = (e: any) => {
        if (e?.error !== "aborted") setError(voiceErrorText(String(e?.error ?? "")));
      };
      rec.onend = () => {
        setListening(false);
        if (recRef.current === rec) recRef.current = null;
      };

      recRef.current = rec;
      try {
        rec.start();
      } catch {
        setError(voiceErrorText("other"));
      }
    },
    [lang],
  );

  return { supported, listening, error, start, stop, clearError: () => setError(null) };
}

function useElapsed(active: boolean): number {
  const [s, setS] = React.useState(0);
  React.useEffect(() => {
    if (!active) {
      setS(0);
      return;
    }
    const t0 = Date.now();
    const id = setInterval(() => setS(Math.floor((Date.now() - t0) / 1000)), 500);
    return () => clearInterval(id);
  }, [active]);
  return s;
}

/* ========================================================================== */
/*  Key status chip (header)                                                  */
/* ========================================================================== */

export function KeyStatusChip({
  info,
  loading,
  onClick,
}: {
  info: KeyInfo | null;
  loading: boolean;
  onClick: () => void;
}) {
  const state = loading ? "loading" : !info?.has_key ? "missing" : info.is_valid ? "ready" : "invalid";
  const copy = {
    loading: { text: "Checking key…", tone: "bg-stone-100 text-stone-600 ring-stone-200", Icon: Loader2 },
    missing: { text: "Add your AI key", tone: "bg-amber-50 text-amber-800 ring-amber-200", Icon: KeyRound },
    invalid: { text: "Key needs attention", tone: "bg-red-50 text-red-700 ring-red-200", Icon: AlertTriangle },
    ready: { text: "AI key active", tone: "bg-emerald-50 text-emerald-700 ring-emerald-200", Icon: ShieldCheck },
  }[state];

  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "inline-flex min-h-9 items-center gap-1.5 rounded-full px-3 text-xs font-semibold ring-1 transition active:scale-[0.98]",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-500/50",
        copy.tone,
      )}
    >
      <copy.Icon className={cn("size-3.5", state === "loading" && "animate-spin")} />
      {copy.text}
      <Settings2 className="size-3.5 opacity-60" aria-hidden />
    </button>
  );
}

/* ========================================================================== */
/*  Setup card (no key / invalid key)                                         */
/* ========================================================================== */

export function SetupCard({ invalid, onOpen }: { invalid: boolean; onOpen: () => void }) {
  return (
    <div className="mx-auto flex max-w-xl flex-col items-center gap-3 rounded-2xl bg-white p-6 text-center shadow-sm ring-1 ring-black/[0.06] sm:p-8">
      <span
        className={cn(
          "flex size-12 items-center justify-center rounded-2xl text-white shadow-lg",
          invalid ? "bg-red-500 shadow-red-500/30" : "bg-orange-500 shadow-orange-500/30",
        )}
      >
        {invalid ? <AlertTriangle className="size-6" /> : <KeyRound className="size-6" />}
      </span>
      <h2 className="text-lg font-bold text-[#2a1002]">
        {invalid ? "Your AI key isn’t working" : "Add your AI key to start"}
      </h2>
      <p className="max-w-md text-sm leading-6 text-stone-600">
        {invalid
          ? "Groq rejected the saved key. Paste a new one and you can keep chatting right away."
          : "AI Studio uses your own free Groq key, so you stay in control of usage. It takes about a minute to set up."}
      </p>
      <div className="flex flex-wrap items-center justify-center gap-2">
        <button
          type="button"
          onClick={onOpen}
          className="inline-flex h-11 items-center gap-2 rounded-xl bg-orange-500 px-5 text-sm font-semibold text-white hover:bg-orange-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-500/50"
        >
          <KeyRound className="size-4" /> {invalid ? "Update key" : "Add key"}
        </button>
        <a
          href="https://console.groq.com/keys"
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex h-11 items-center gap-2 rounded-xl border border-black/10 bg-white px-4 text-sm font-semibold text-stone-700 hover:bg-stone-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-500/50"
        >
          Get a Groq key <ExternalLink className="size-3.5" />
        </a>
      </div>
    </div>
  );
}

/* ========================================================================== */
/*  Toolbar (identity, usage meter, export, clear)                            */
/* ========================================================================== */

function UsageMeter({ remaining, limit }: { remaining: number; limit: number }) {
  const pct = Math.max(0, Math.min(100, Math.round((remaining / limit) * 100)));
  const low = pct <= 20;
  return (
    <div className="hidden min-w-[7.5rem] sm:block" title="Questions left today">
      <div className="flex items-center justify-between text-[11px] font-semibold text-stone-500">
        <span>Today</span>
        <span className={cn(low && "text-red-600")}>
          {remaining}/{limit} left
        </span>
      </div>
      <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-stone-200">
        <div
          className={cn("h-full rounded-full transition-all duration-500", low ? "bg-red-500" : "bg-orange-500")}
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  );
}

function ExportMenu({ disabled, onExport }: { disabled: boolean; onExport: (f: ExportFormat) => void }) {
  const [open, setOpen] = React.useState(false);
  const ref = React.useRef<HTMLDivElement>(null);

  React.useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => {
      if (!ref.current?.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    document.addEventListener("mousedown", onDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  const items: { id: ExportFormat; label: string; hint: string; Icon: LucideIcon }[] = [
    { id: "pdf", label: "PDF document", hint: "Choose “Save as PDF” when printing", Icon: Printer },
    { id: "txt", label: "Plain text (.txt)", hint: "Opens anywhere", Icon: FileText },
    { id: "md", label: "Markdown (.md)", hint: "For notes and docs", Icon: FileText },
  ];

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        disabled={disabled}
        onClick={() => setOpen((o) => !o)}
        aria-haspopup="menu"
        aria-expanded={open}
        className="inline-flex h-9 items-center gap-1.5 rounded-lg bg-white px-3 text-xs font-semibold text-stone-700 ring-1 ring-black/10 transition hover:bg-stone-50 disabled:cursor-not-allowed disabled:opacity-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-500/50"
      >
        <Download className="size-3.5" /> <span className="hidden sm:inline">Download chat</span>
        <span className="sm:hidden">Export</span>
      </button>
      <AnimatePresence>
        {open && (
          <motion.div
            role="menu"
            initial={{ opacity: 0, y: -4, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -4, scale: 0.98 }}
            transition={{ duration: 0.12 }}
            className="absolute right-0 z-30 mt-2 w-64 rounded-xl bg-white p-1.5 shadow-xl ring-1 ring-black/10"
          >
            {items.map(({ id, label, hint, Icon }) => (
              <button
                key={id}
                type="button"
                role="menuitem"
                onClick={() => {
                  setOpen(false);
                  onExport(id);
                }}
                className="flex w-full items-start gap-2.5 rounded-lg px-2.5 py-2 text-left hover:bg-orange-50 focus-visible:bg-orange-50 focus-visible:outline-none"
              >
                <span className="mt-0.5 flex size-7 shrink-0 items-center justify-center rounded-md bg-orange-100 text-orange-700">
                  <Icon className="size-4" />
                </span>
                <span className="min-w-0">
                  <span className="block text-[13px] font-semibold text-stone-800">{label}</span>
                  <span className="block text-[11px] text-stone-500">{hint}</span>
                </span>
              </button>
            ))}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

export function ChatToolbar({
  model,
  hasMessages,
  remaining,
  limit,
  onExport,
  onClear,
  clearIcon,
}: {
  model: string | null;
  hasMessages: boolean;
  remaining: number | null;
  limit: number | null;
  onExport: (f: ExportFormat) => void;
  onClear: () => void;
  clearIcon: React.ReactNode;
}) {
  return (
    <div className="flex flex-wrap items-center gap-3 rounded-t-2xl border-b border-black/[0.06] bg-white/70 px-3 py-3 sm:rounded-t-3xl sm:px-5">
      <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-orange-400 to-orange-600 text-white shadow-md shadow-orange-500/30">
        <Sparkles className="size-5" />
      </span>
      <div className="min-w-0 flex-1">
        <p className="flex items-center gap-2 text-sm font-bold text-[#2a1002]">
          Account assistant
          <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2 py-0.5 text-[10px] font-semibold text-emerald-700 ring-1 ring-emerald-200">
            <span className="size-1.5 animate-pulse rounded-full bg-emerald-500" /> Online
          </span>
        </p>
        <p className="flex items-center gap-1 truncate text-xs text-stone-500">
          <Lock className="size-3 shrink-0" /> Read-only{model ? ` · ${model}` : ""}
        </p>
      </div>

      {remaining !== null && limit ? <UsageMeter remaining={remaining} limit={limit} /> : null}

      <div className="flex items-center gap-1.5">
        <ExportMenu disabled={!hasMessages} onExport={onExport} />
        {hasMessages && (
          <button
            type="button"
            onClick={onClear}
            className="inline-flex h-9 items-center gap-1.5 rounded-lg px-2.5 text-xs font-semibold text-stone-500 transition hover:bg-stone-100 hover:text-stone-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-500/50"
          >
            {clearIcon} <span className="hidden sm:inline">Clear</span>
          </button>
        )}
      </div>
    </div>
  );
}

/* ========================================================================== */
/*  Rich cards: template previews + invoices                                  */
/* ========================================================================== */

function TemplateTile({ t, onOpen }: { t: TemplateCard; onOpen: (t: TemplateCard) => void }) {
  const [loaded, setLoaded] = React.useState(false);
  const [failed, setFailed] = React.useState(false);
  const hasImage = Boolean(t.image) && !failed;

  return (
    <div className="group overflow-hidden rounded-2xl bg-white shadow-sm ring-1 ring-black/[0.06] transition hover:-translate-y-0.5 hover:shadow-md">
      <button
        type="button"
        disabled={!hasImage}
        onClick={() => onOpen(t)}
        aria-label={`Preview ${t.name}`}
        className="relative block aspect-[4/5] w-full overflow-hidden bg-gradient-to-br from-orange-50 to-stone-100 disabled:cursor-default focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-orange-500/50"
      >
        {hasImage ? (
          <>
            {!loaded && <span className="absolute inset-0 animate-pulse bg-stone-200/70" aria-hidden />}
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={t.image as string}
              alt={t.name}
              loading="lazy"
              decoding="async"
              onLoad={() => setLoaded(true)}
              onError={() => setFailed(true)}
              className={cn(
                "size-full object-cover transition duration-300 group-hover:scale-[1.03]",
                loaded ? "opacity-100" : "opacity-0",
              )}
            />
            <span className="absolute bottom-2 right-2 flex size-7 items-center justify-center rounded-full bg-black/55 text-white opacity-0 backdrop-blur transition group-hover:opacity-100">
              <Maximize2 className="size-3.5" />
            </span>
          </>
        ) : (
          <span className="flex size-full flex-col items-center justify-center gap-1.5 text-stone-400">
            {failed ? <ImageOff className="size-6" /> : <LayoutTemplate className="size-6" />}
            <span className="text-[11px] font-medium">No preview</span>
          </span>
        )}
        {t.tier && (
          <span
            className={cn(
              "absolute left-2 top-2 inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-bold shadow-sm",
              t.tier === "premium" ? "bg-amber-400 text-amber-950" : "bg-white/90 text-stone-700",
            )}
          >
            {t.tier === "premium" && <Crown className="size-3" />}
            {t.tier === "premium" ? "Premium" : "Simple"}
          </span>
        )}
      </button>
      <div className="px-3 py-2.5">
        <p className="truncate text-[13px] font-semibold text-stone-800">{t.name}</p>
        {t.note && <p className="truncate text-[11px] text-stone-500">{t.note}</p>}
      </div>
    </div>
  );
}

function Lightbox({ item, onClose }: { item: TemplateCard | null; onClose: () => void }) {
  React.useEffect(() => {
    if (!item) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [item, onClose]);

  return (
    <AnimatePresence>
      {item?.image && (
        <motion.div
          className="fixed inset-0 z-[95] flex items-center justify-center bg-black/75 p-4 backdrop-blur-sm"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onMouseDown={(e) => e.target === e.currentTarget && onClose()}
          role="dialog"
          aria-modal="true"
          aria-label={`${item.name} preview`}
        >
          <motion.figure
            initial={{ scale: 0.96, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.96, opacity: 0 }}
            transition={{ type: "spring", damping: 26, stiffness: 320 }}
            className="relative max-h-full max-w-md"
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={item.image} alt={item.name} className="max-h-[80dvh] w-auto max-w-full rounded-2xl bg-white object-contain shadow-2xl" />
            <figcaption className="mt-3 text-center text-sm font-semibold text-white">{item.name}</figcaption>
            <button
              type="button"
              onClick={onClose}
              aria-label="Close preview"
              className="absolute -right-2 -top-2 flex size-9 items-center justify-center rounded-full bg-white text-stone-700 shadow-lg hover:bg-stone-100"
            >
              <X className="size-5" />
            </button>
          </motion.figure>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

function TemplateStrip({ items }: { items: TemplateCard[] }) {
  const [open, setOpen] = React.useState<TemplateCard | null>(null);
  return (
    <div className="space-y-2">
      <p className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wide text-stone-500">
        <LayoutTemplate className="size-3.5" /> Template previews
      </p>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
        {items.map((t) => (
          <TemplateTile key={t.key} t={t} onOpen={setOpen} />
        ))}
      </div>
      <Lightbox item={open} onClose={() => setOpen(null)} />
    </div>
  );
}

const STATUS_STYLE: Record<string, { label: string; tone: string }> = {
  completed: { label: "Paid", tone: "bg-emerald-50 text-emerald-700 ring-emerald-200" },
  pending: { label: "Pending", tone: "bg-amber-50 text-amber-800 ring-amber-200" },
  failed: { label: "Failed", tone: "bg-red-50 text-red-700 ring-red-200" },
};

function InvoiceList({ items, customer }: { items: InvoiceCard[]; customer: Customer }) {
  return (
    <div className="space-y-2">
      <p className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wide text-stone-500">
        <Receipt className="size-3.5" /> Invoices
      </p>
      <div className="space-y-2.5">
        {items.map((inv) => {
          const st = STATUS_STYLE[inv.status] ?? { label: pretty(inv.status), tone: "bg-stone-100 text-stone-600 ring-stone-200" };
          const canDownload = inv.status === "completed";
          return (
            <div key={inv.number} className="overflow-hidden rounded-2xl bg-white shadow-sm ring-1 ring-black/[0.06]">
              <div className="flex items-start gap-3 p-3.5">
                <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-orange-100 text-orange-700">
                  <Receipt className="size-5" />
                </span>
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="font-mono text-[13px] font-bold text-stone-800">{inv.number}</p>
                    <span className={cn("rounded-full px-2 py-0.5 text-[10px] font-bold ring-1", st.tone)}>{st.label}</span>
                  </div>
                  <p className="mt-0.5 text-xs text-stone-500">
                    {inv.issued_at ? new Date(inv.issued_at).toLocaleDateString([], { day: "numeric", month: "short", year: "numeric" }) : "No date"}
                    {inv.items.length > 0 && ` · ${inv.items.map((i) => pretty(i.type)).join(", ")}`}
                  </p>
                </div>
                <p className="shrink-0 text-right text-base font-extrabold text-[#2a1002]">{money(inv.amount)}</p>
              </div>
              <div className="flex items-center justify-between gap-2 border-t border-black/[0.05] bg-stone-50/70 px-3.5 py-2">
                <p className="text-[11px] text-stone-500">
                  {canDownload ? "Choose “Save as PDF” in the print window." : "Invoices are available once an order is paid."}
                </p>
                <button
                  type="button"
                  disabled={!canDownload}
                  onClick={() => downloadInvoice(inv, customer)}
                  className="inline-flex h-8 shrink-0 items-center gap-1.5 rounded-lg bg-orange-500 px-3 text-xs font-semibold text-white transition hover:bg-orange-600 active:scale-95 disabled:cursor-not-allowed disabled:bg-stone-200 disabled:text-stone-400 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-500/50"
                >
                  <Download className="size-3.5" /> Download PDF
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

/* ========================================================================== */
/*  Chat thread                                                               */
/* ========================================================================== */

function CopyButton({ text }: { text: string }) {
  const [done, setDone] = React.useState(false);
  return (
    <button
      type="button"
      aria-label="Copy answer"
      onClick={async () => {
        try {
          await navigator.clipboard.writeText(stripMarkdown(text));
          setDone(true);
          setTimeout(() => setDone(false), 1500);
        } catch {
          /* clipboard blocked */
        }
      }}
      className="inline-flex size-6 items-center justify-center rounded-md text-stone-400 transition hover:bg-stone-100 hover:text-stone-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-500/50 sm:opacity-0 sm:group-hover:opacity-100 sm:focus-visible:opacity-100"
    >
      {done ? <Check className="size-3.5 text-emerald-600" /> : <Copy className="size-3.5" />}
    </button>
  );
}

function Bubble({ m, customer, onOpenKey }: { m: ChatMessage; customer: Customer; onOpenKey: () => void }) {
  const mine = m.role === "user";
  const hasCards = Boolean(m.cards?.templates?.length || m.cards?.invoices?.length);
  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.2 }}
      className={cn("group flex gap-2.5", mine && "flex-row-reverse")}
    >
      <span
        className={cn(
          "mt-0.5 flex size-8 shrink-0 items-center justify-center rounded-xl",
          mine ? "bg-stone-800 text-white" : m.error ? "bg-red-100 text-red-600" : "bg-gradient-to-br from-orange-400 to-orange-600 text-white shadow-sm shadow-orange-500/30",
        )}
        aria-hidden
      >
        {mine ? <span className="text-[10px] font-bold">You</span> : m.error ? <AlertTriangle className="size-4" /> : <Bot className="size-4" />}
      </span>

      <div
        className={cn(
          "flex min-w-0 flex-col gap-2",
          mine ? "max-w-[85%] items-end" : hasCards ? "w-full max-w-[min(100%,34rem)] items-start" : "max-w-[88%] items-start sm:max-w-[80%]",
        )}
      >
        <div
          className={cn(
            "w-fit max-w-full break-words rounded-2xl px-4 py-3 text-sm leading-6",
            mine
              ? "whitespace-pre-wrap rounded-tr-md bg-stone-800 text-white"
              : m.error
                ? "whitespace-pre-wrap rounded-tl-md bg-red-50 text-red-800 ring-1 ring-red-200"
                : "rounded-tl-md bg-white text-stone-800 shadow-sm ring-1 ring-black/[0.06]",
          )}
          dir="auto"
        >
          {mine || m.error ? m.text : <RichText text={m.text} />}
        </div>

        {m.cards?.invoices?.length ? (
          <div className="w-full">
            <InvoiceList items={m.cards.invoices} customer={customer} />
          </div>
        ) : null}
        {m.cards?.templates?.length ? (
          <div className="w-full">
            <TemplateStrip items={m.cards.templates} />
          </div>
        ) : null}

        {m.needsKey && (
          <button
            type="button"
            onClick={onOpenKey}
            className="inline-flex h-9 items-center gap-1.5 rounded-lg bg-orange-500 px-3 text-xs font-semibold text-white hover:bg-orange-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-500/50"
          >
            <KeyRound className="size-3.5" /> Open key settings
          </button>
        )}

        <div className={cn("flex items-center gap-2 px-1 text-[11px] text-stone-400", mine && "flex-row-reverse")}>
          <time dateTime={new Date(m.at).toISOString()}>{fmtTime(m.at)}</time>
          {!mine && m.tookMs ? (
            <span className="inline-flex items-center gap-1 rounded-full bg-stone-100 px-1.5 py-0.5 font-medium text-stone-500">
              <Clock className="size-3" /> {fmtDuration(m.tookMs)}
            </span>
          ) : null}
          {!mine && !m.error && <CopyButton text={m.text} />}
        </div>
      </div>
    </motion.div>
  );
}

function DaySeparator({ label }: { label: string }) {
  return (
    <div className="flex items-center gap-3 py-1" role="separator">
      <span className="h-px flex-1 bg-black/[0.07]" />
      <span className="rounded-full bg-white px-2.5 py-0.5 text-[11px] font-semibold text-stone-500 ring-1 ring-black/[0.06]">{label}</span>
      <span className="h-px flex-1 bg-black/[0.07]" />
    </div>
  );
}

export function ChatThread({
  messages,
  busy,
  disabled,
  firstName,
  customer,
  onPick,
  onOpenKey,
}: {
  messages: ChatMessage[];
  busy: boolean;
  disabled: boolean;
  firstName: string;
  customer: Customer;
  onPick: (text: string) => void;
  onOpenKey: () => void;
}) {
  const endRef = React.useRef<HTMLDivElement>(null);
  const [atBottom, setAtBottom] = React.useState(true);
  const elapsed = useElapsed(busy);
  const hasMessages = messages.length > 0;

  // Page-level scrolling: the thread grows with the page, nothing is trapped in an inner scroller.
  React.useEffect(() => {
    if (!hasMessages) return;
    endRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [messages.length, busy, hasMessages]);

  React.useEffect(() => {
    const el = endRef.current;
    if (!el || !hasMessages) return;
    const io = new IntersectionObserver(([entry]) => setAtBottom(entry.isIntersecting), { rootMargin: "0px 0px 160px 0px" });
    io.observe(el);
    return () => io.disconnect();
  }, [hasMessages]);

  if (!hasMessages) {
    return (
      <div className="flex flex-col items-center gap-6 px-1 py-6 text-center sm:py-10">
        <span className="relative flex size-14 items-center justify-center rounded-2xl bg-orange-100 text-orange-600">
          <span className="absolute inset-0 -z-10 rounded-2xl bg-orange-300/40 blur-xl" aria-hidden />
          <Sparkles className="size-7" />
        </span>
        <div>
          <h2 className="text-xl font-bold tracking-tight text-[#2a1002]">Hi {firstName}, what do you need?</h2>
          <p className="mx-auto mt-1.5 max-w-md text-sm leading-6 text-stone-600">
            Ask about your invitations, guest replies, orders or plan, or how to do something in {BRAND}. Type it, or tap the mic and say it.
          </p>
        </div>

        <div className="grid w-full max-w-2xl gap-2.5 text-left sm:grid-cols-2">
          {STARTERS.map(({ label, hint, Icon }) => (
            <button
              key={label}
              type="button"
              disabled={disabled}
              onClick={() => onPick(label)}
              className="group flex min-h-16 items-center gap-3 rounded-2xl bg-white p-3 shadow-sm ring-1 ring-black/[0.06] transition hover:-translate-y-0.5 hover:shadow-md hover:ring-orange-300 active:scale-[0.99] disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:translate-y-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-500/50"
            >
              <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-orange-50 text-orange-600 transition group-hover:bg-orange-500 group-hover:text-white">
                <Icon className="size-5" />
              </span>
              <span className="min-w-0">
                <span className="block text-[13px] font-semibold leading-5 text-stone-800">{label}</span>
                <span className="block text-[11px] text-stone-500">{hint}</span>
              </span>
            </button>
          ))}
        </div>

        <p className="flex items-center gap-1.5 text-[11px] text-stone-500">
          <ShieldCheck className="size-3.5 text-emerald-600" /> Answers come only from your own account. The assistant can’t change anything.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4" role="log" aria-live="polite" aria-label="Conversation">
      {messages.map((m, i) => {
        const label = dayLabel(m.at);
        const showDay = i === 0 || dayLabel(messages[i - 1].at) !== label;
        return (
          <React.Fragment key={m.id}>
            {showDay && <DaySeparator label={label} />}
            <Bubble m={m} customer={customer} onOpenKey={onOpenKey} />
          </React.Fragment>
        );
      })}

      {busy && (
        <div className="flex items-center gap-2.5" aria-label="Assistant is typing">
          <span className="flex size-8 items-center justify-center rounded-xl bg-gradient-to-br from-orange-400 to-orange-600 text-white">
            <Bot className="size-4" />
          </span>
          <span className="flex items-center gap-2 rounded-2xl rounded-tl-md bg-white px-3.5 py-2.5 shadow-sm ring-1 ring-black/[0.06]">
            <span className="flex gap-1">
              {[0, 1, 2].map((i) => (
                <span key={i} className="size-1.5 animate-bounce rounded-full bg-orange-400" style={{ animationDelay: `${i * 120}ms` }} />
              ))}
            </span>
            <span className="text-xs font-medium text-stone-500">Looking at your account{elapsed >= 1 ? ` · ${elapsed}s` : ""}</span>
          </span>
        </div>
      )}

      {/* Jump to latest: sticks above the composer while the end of the chat is off-screen. */}
      <div className="sticky bottom-36 z-10 h-0">
        <AnimatePresence>
          {!atBottom && (
            <motion.button
              type="button"
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 6 }}
              onClick={() => endRef.current?.scrollIntoView({ behavior: "smooth", block: "end" })}
              className="absolute bottom-0 right-0 inline-flex h-9 items-center gap-1.5 rounded-full bg-stone-900 px-3.5 text-xs font-semibold text-white shadow-lg hover:bg-stone-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-500/60"
            >
              <ArrowDown className="size-3.5" /> Jump to latest
            </motion.button>
          )}
        </AnimatePresence>
      </div>

      <div ref={endRef} className="h-px scroll-mb-40" aria-hidden />
    </div>
  );
}

/* ========================================================================== */
/*  Composer (text + voice)                                                   */
/* ========================================================================== */

export function Composer({
  value,
  onChange,
  onSend,
  busy,
  disabled,
  disabledReason,
  voice,
  voiceLang,
  onVoiceLang,
}: {
  value: string;
  onChange: (v: string) => void;
  onSend: () => void;
  busy: boolean;
  disabled: boolean;
  disabledReason?: string;
  voice: ReturnType<typeof useVoiceInput>;
  voiceLang: VoiceLang;
  onVoiceLang: (l: VoiceLang) => void;
}) {
  const ref = React.useRef<HTMLTextAreaElement>(null);
  React.useEffect(() => {
    const el = ref.current;
    if (!el) return;
    el.style.height = "auto";
    el.style.height = `${Math.min(el.scrollHeight, 160)}px`;
  }, [value]);

  const canSend = !disabled && !busy && value.trim().length > 0;
  const toggleMic = () => {
    if (voice.listening) voice.stop();
    else voice.start(value, onChange);
  };

  return (
    <div className="space-y-2">
      {voice.error && (
        <p className="flex items-start gap-2 rounded-xl bg-amber-50 px-3 py-2 text-xs text-amber-800 ring-1 ring-amber-200" role="alert">
          <AlertTriangle className="mt-0.5 size-3.5 shrink-0" />
          <span className="flex-1">{voice.error}</span>
          <button type="button" onClick={voice.clearError} aria-label="Dismiss" className="shrink-0">
            <X className="size-3.5" />
          </button>
        </p>
      )}

      <div
        className={cn(
          "flex items-end gap-2 rounded-2xl bg-white p-2 shadow-sm ring-1 transition",
          voice.listening ? "ring-2 ring-red-400" : "ring-black/10 focus-within:ring-2 focus-within:ring-orange-500/50",
          disabled && "opacity-70",
        )}
      >
        {voice.supported && (
          <button
            type="button"
            onClick={toggleMic}
            disabled={disabled || busy}
            aria-pressed={voice.listening}
            aria-label={voice.listening ? "Stop listening" : "Speak your question"}
            className={cn(
              "relative flex size-11 shrink-0 items-center justify-center rounded-xl transition active:scale-95 disabled:cursor-not-allowed disabled:opacity-50",
              "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-500/50",
              voice.listening ? "bg-red-500 text-white" : "bg-orange-100 text-orange-700 hover:bg-orange-200",
            )}
          >
            {voice.listening && <span className="absolute inset-0 animate-ping rounded-xl bg-red-400/40" aria-hidden />}
            {voice.listening ? <Square className="relative size-4 fill-current" /> : <Mic className="relative size-5" />}
          </button>
        )}

        <textarea
          ref={ref}
          rows={1}
          value={value}
          maxLength={MAX_MESSAGE}
          disabled={disabled}
          dir="auto"
          onChange={(e) => onChange(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey && !e.nativeEvent.isComposing) {
              e.preventDefault();
              if (canSend) onSend();
            }
          }}
          placeholder={
            disabled
              ? (disabledReason ?? "Add your AI key to start chatting")
              : voice.listening
                ? "Listening… speak now"
                : "Ask about your account…"
          }
          aria-label="Your question"
          className="max-h-40 min-h-11 flex-1 resize-none bg-transparent px-2 py-2.5 text-sm leading-6 text-stone-800 placeholder:text-stone-400 focus:outline-none disabled:cursor-not-allowed"
        />

        <button
          type="button"
          onClick={onSend}
          disabled={!canSend}
          aria-label="Send"
          className="flex size-11 shrink-0 items-center justify-center rounded-xl bg-orange-500 text-white transition hover:bg-orange-600 active:scale-95 disabled:cursor-not-allowed disabled:bg-stone-200 disabled:text-stone-400 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-500/50"
        >
          {busy ? <Loader2 className="size-5 animate-spin" /> : <Send className="size-5" />}
        </button>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-2 px-1 text-[11px] text-stone-500">
        <div className="flex items-center gap-2">
          {voice.supported ? (
            <div className="flex items-center gap-1">
              <Languages className="size-3.5" aria-hidden />
              {VOICE_LANGS.map((l) => (
                <button
                  key={l.id}
                  type="button"
                  disabled={voice.listening}
                  onClick={() => onVoiceLang(l.id)}
                  aria-pressed={voiceLang === l.id}
                  className={cn(
                    "rounded-md px-2 py-1 font-semibold transition disabled:opacity-50",
                    voiceLang === l.id ? "bg-stone-800 text-white" : "hover:bg-stone-100",
                  )}
                >
                  {l.label}
                </button>
              ))}
            </div>
          ) : (
            <span>Voice input isn’t supported in this browser.</span>
          )}
        </div>
        <div className="flex items-center gap-3">
          <span className="hidden sm:inline">Enter to send · Shift+Enter for a new line</span>
          <span aria-live="off">
            {value.length}/{MAX_MESSAGE}
          </span>
        </div>
      </div>
    </div>
  );
}

/* ========================================================================== */
/*  Key settings modal (add / update / change model / delete)                 */
/* ========================================================================== */

export function KeySettingsModal({
  open,
  info,
  busy,
  onClose,
  onSave,
  onModel,
  onDelete,
}: {
  open: boolean;
  info: KeyInfo | null;
  busy: KeyBusy;
  onClose: () => void;
  onSave: (apiKey: string, model: string) => Promise<boolean>;
  onModel: (model: string) => Promise<boolean>;
  onDelete: () => Promise<boolean>;
}) {
  const [apiKey, setApiKey] = React.useState("");
  const [reveal, setReveal] = React.useState(false);
  const [confirmDelete, setConfirmDelete] = React.useState(false);
  const [model, setModel] = React.useState(info?.model ?? "openai/gpt-oss-120b");

  React.useEffect(() => {
    if (open) {
      setApiKey("");
      setReveal(false);
      setConfirmDelete(false);
      setModel(info?.model ?? "openai/gpt-oss-120b");
    }
  }, [open, info?.model]);

  React.useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && busy === null && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, busy, onClose]);

  const hasKey = Boolean(info?.has_key);
  const models = info?.available_models?.length ? info.available_models : Object.keys(MODEL_NOTES);
  const keyLooksRight = /^gsk_[A-Za-z0-9]{16,}$/.test(apiKey.trim());
  const modelChanged = hasKey && model !== info?.model;

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          className="fixed inset-0 z-[90] flex items-end justify-center bg-black/40 p-0 sm:items-center sm:p-4"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onMouseDown={(e) => e.target === e.currentTarget && busy === null && onClose()}
        >
          <motion.div
            role="dialog"
            aria-modal="true"
            aria-label="AI key settings"
            initial={{ y: 40, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 40, opacity: 0 }}
            transition={{ type: "spring", damping: 26, stiffness: 320 }}
            className="flex max-h-[92dvh] w-full max-w-lg flex-col overflow-hidden rounded-t-3xl bg-white shadow-2xl sm:rounded-3xl"
          >
            <div className="flex items-start gap-3 border-b border-black/[0.06] px-5 py-4">
              <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-orange-500 text-white">
                <KeyRound className="size-5" />
              </span>
              <div className="min-w-0 flex-1">
                <h2 className="text-base font-bold text-[#2a1002]">{hasKey ? "Your AI key" : "Add your AI key"}</h2>
                <p className="text-xs leading-5 text-stone-600">Saved encrypted. We only show the first and last characters.</p>
              </div>
              <button
                type="button"
                onClick={onClose}
                disabled={busy !== null}
                aria-label="Close"
                className="flex size-9 items-center justify-center rounded-lg text-stone-500 hover:bg-stone-100 disabled:opacity-50"
              >
                <X className="size-5" />
              </button>
            </div>

            <div data-lenis-prevent className="min-h-0 flex-1 space-y-5 overflow-y-auto overscroll-contain px-5 py-4">
              {hasKey && info && (
                <div
                  className={cn(
                    "flex items-center gap-3 rounded-xl px-3.5 py-3 ring-1",
                    info.is_valid ? "bg-emerald-50 ring-emerald-200" : "bg-red-50 ring-red-200",
                  )}
                >
                  {info.is_valid ? (
                    <CheckCircle2 className="size-5 shrink-0 text-emerald-600" />
                  ) : (
                    <AlertTriangle className="size-5 shrink-0 text-red-600" />
                  )}
                  <div className="min-w-0 text-sm">
                    <p className="font-semibold text-stone-800">{info.is_valid ? "Key is working" : "Key was rejected. Paste a new one below."}</p>
                    <p className="truncate font-mono text-xs text-stone-600">{info.masked_key ?? "••••••••"}</p>
                  </div>
                </div>
              )}

              <div className="space-y-1.5">
                <label htmlFor="ai-key" className="text-sm font-semibold text-stone-800">
                  {hasKey ? "Replace key" : "Groq API key"}
                </label>
                <div className="flex items-center gap-1 rounded-xl bg-white ring-1 ring-black/10 focus-within:ring-2 focus-within:ring-orange-500/50">
                  <input
                    id="ai-key"
                    type={reveal ? "text" : "password"}
                    value={apiKey}
                    onChange={(e) => setApiKey(e.target.value)}
                    autoComplete="off"
                    spellCheck={false}
                    placeholder="gsk_…"
                    className="h-11 min-w-0 flex-1 bg-transparent px-3 font-mono text-sm text-stone-800 placeholder:text-stone-400 focus:outline-none"
                  />
                  <button
                    type="button"
                    onClick={() => setReveal((r) => !r)}
                    aria-label={reveal ? "Hide key" : "Show key"}
                    className="flex size-10 items-center justify-center rounded-lg text-stone-500 hover:bg-stone-100"
                  >
                    {reveal ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
                  </button>
                </div>
                {apiKey.trim() && !keyLooksRight && <p className="text-xs text-amber-700">Groq keys start with “gsk_” and have no spaces.</p>}
                <a
                  href="https://console.groq.com/keys"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 text-xs font-semibold text-orange-700 underline-offset-2 hover:underline"
                >
                  Get a free key from Groq <ExternalLink className="size-3" />
                </a>
              </div>

              <fieldset className="space-y-2">
                <legend className="text-sm font-semibold text-stone-800">Model</legend>
                <div className="grid gap-2">
                  {models.map((m) => (
                    <label
                      key={m}
                      className={cn(
                        "flex min-h-12 cursor-pointer items-center gap-3 rounded-xl px-3 py-2 ring-1 transition",
                        model === m ? "bg-orange-50 ring-2 ring-orange-400" : "bg-white ring-black/10 hover:bg-stone-50",
                      )}
                    >
                      <input
                        type="radio"
                        name="ai-model"
                        value={m}
                        checked={model === m}
                        onChange={() => setModel(m)}
                        className="size-4 accent-orange-500"
                      />
                      <span className="min-w-0">
                        <span className="block truncate text-sm font-semibold text-stone-800">{m}</span>
                        {MODEL_NOTES[m] && <span className="block text-xs text-stone-500">{MODEL_NOTES[m]}</span>}
                      </span>
                    </label>
                  ))}
                </div>
              </fieldset>
            </div>

            <div className="space-y-2 border-t border-black/[0.06] bg-stone-50/70 px-5 py-3">
              {confirmDelete ? (
                <div className="space-y-2 rounded-xl bg-red-50 p-3 ring-1 ring-red-200">
                  <p className="text-sm font-semibold text-red-800">Delete your saved key?</p>
                  <p className="text-xs leading-5 text-red-700">AI Studio and design suggestions stop working until you add a key again.</p>
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      onClick={() => setConfirmDelete(false)}
                      disabled={busy !== null}
                      className="h-10 rounded-lg border border-black/10 bg-white text-sm font-semibold text-stone-700 hover:bg-stone-100"
                    >
                      Keep key
                    </button>
                    <button
                      type="button"
                      onClick={async () => (await onDelete()) && setConfirmDelete(false)}
                      disabled={busy !== null}
                      className="flex h-10 items-center justify-center gap-1.5 rounded-lg bg-red-600 text-sm font-semibold text-white hover:bg-red-700 disabled:opacity-60"
                    >
                      {busy === "delete" ? <Loader2 className="size-4 animate-spin" /> : <Trash2 className="size-4" />}
                      Delete key
                    </button>
                  </div>
                </div>
              ) : (
                <div className="flex flex-wrap items-center gap-2">
                  {hasKey && (
                    <button
                      type="button"
                      onClick={() => setConfirmDelete(true)}
                      disabled={busy !== null}
                      className="inline-flex h-11 items-center gap-1.5 rounded-xl px-3 text-sm font-semibold text-red-600 hover:bg-red-50 disabled:opacity-50"
                    >
                      <Trash2 className="size-4" /> Delete
                    </button>
                  )}
                  <div className="ml-auto flex flex-wrap gap-2">
                    {modelChanged && !apiKey.trim() && (
                      <button
                        type="button"
                        onClick={() => void onModel(model)}
                        disabled={busy !== null}
                        className="inline-flex h-11 items-center gap-1.5 rounded-xl border border-black/10 bg-white px-4 text-sm font-semibold text-stone-700 hover:bg-stone-100 disabled:opacity-60"
                      >
                        {busy === "model" ? <Loader2 className="size-4 animate-spin" /> : <RotateCcw className="size-4" />}
                        Change model
                      </button>
                    )}
                    <button
                      type="button"
                      onClick={() => void onSave(apiKey.trim(), model)}
                      disabled={busy !== null || !keyLooksRight}
                      className="inline-flex h-11 items-center gap-1.5 rounded-xl bg-orange-500 px-5 text-sm font-semibold text-white hover:bg-orange-600 disabled:cursor-not-allowed disabled:bg-stone-200 disabled:text-stone-400"
                    >
                      {busy === "save" ? <Loader2 className="size-4 animate-spin" /> : <ShieldCheck className="size-4" />}
                      {hasKey ? "Update key" : "Save key"}
                    </button>
                  </div>
                </div>
              )}
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}