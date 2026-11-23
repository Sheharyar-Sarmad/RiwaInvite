"use client";

/**
 * components/user/sections/ai-studio/AiStudioClient.tsx
 *
 *  - Loads the user's AI key status (GET /user/dashboard/ai-credentials).
 *  - Key management: add / update (PUT), change model (PATCH), delete (DELETE).
 *  - Chat with the account assistant (POST /user/dashboard/ai-studio).
 *    The chat is ephemeral: the last 6 messages go with each request, nothing is stored.
 *  - Answers can carry rich cards (template previews, invoices) and timing.
 *  - Voice prompts: dictation fills the text box; the user always presses Send.
 *
 * Scrolling: the chat grows with the page (no inner scroller) and the composer is sticky,
 * so the mouse wheel always scrolls the page, even when the cursor is over the chat.
 *
 * Auth: no user id is ever sent. Every call relies on the headers the proxy injects.
 */

import * as React from "react";
import { MotionConfig } from "framer-motion";
import { Eraser } from "lucide-react";
import { toast } from "@/components/ui/toast";
import { apiClient } from "@/lib/api/api_base";
import { ErrorCard, HEADING, Shimmer, cn } from "@/components/user/sections/dashboard/ui/DashboardUI";
import { SURFACE } from "@/components/user/sections/library/ui/LibraryUI";
import {
  ChatThread,
  ChatToolbar,
  Composer,
  KeySettingsModal,
  KeyStatusChip,
  MAX_MESSAGE,
  SetupCard,
  exportChat,
  useVoiceInput,
  type ChatMessage,
  type Customer,
  type ExportFormat,
  type InvoiceCard,
  type KeyBusy,
  type KeyInfo,
  type MessageCards,
  type TemplateCard,
  type VoiceLang,
} from "./ui/AiStudioUI";

/* ========================================================================== */
/*  Types & constants                                                         */
/* ========================================================================== */

export type AiStudioUser = {
  id: string;
  email: string;
  first_name: string;
  last_name: string;
  phone_number: string;
  created_at?: string;
};

type Props = { user: AiStudioUser };
type Rec = Record<string, any>;

const API = {
  studio: "/user/dashboard/ai-studio",
  credentials: "/user/dashboard/ai-credentials",
} as const;

const BANNER = "/home_hero_bg.png";
const MAX_CHAT_MESSAGES = 50;
const HISTORY_SENT = 6;

const uid = () => `m_${Math.random().toString(36).slice(2, 10)}`;

/** Reads the API error code from either `{ error: { code } }` or `{ code }`. */
function errorCode(err: unknown): string {
  const d = (err as { response?: { data?: Rec } } | null)?.response?.data;
  const c = d?.error?.code ?? d?.code;
  return typeof c === "string" ? c : "";
}

function errorStatus(err: unknown): number | null {
  const s = (err as { response?: { status?: unknown } } | null)?.response?.status;
  return typeof s === "number" ? s : null;
}

/** Friendly text for the chat. Never shows raw server errors. */
function chatError(err: unknown): { text: string; needsKey?: boolean; keyState?: "missing" | "invalid" } {
  const code = errorCode(err);
  switch (code) {
    case "AI_KEY_MISSING":
      return { text: "You haven’t added an AI key yet. Add your Groq key to start chatting.", needsKey: true, keyState: "missing" };
    case "AI_KEY_INVALID":
      return { text: "Groq rejected your saved key. Update it and try again.", needsKey: true, keyState: "invalid" };
    case "AI_KEY_LIMIT":
      return { text: "Your Groq key hit its own rate limit or quota. Wait a bit, or check your Groq account." };
    case "AI_DAILY_LIMIT":
      return { text: "You’ve used all of today’s AI Studio questions. Come back tomorrow." };
    case "RATE_LIMITED":
      return { text: "You’re asking too quickly. Wait a moment and try again." };
  }
  switch (errorStatus(err)) {
    case 401:
      return { text: "Your session expired. Please sign in again." };
    case 429:
      return { text: "Too many requests right now. Wait a moment and try again." };
    case 502:
    case 503:
      return { text: "The assistant is busy right now. Please try again shortly." };
    default:
      return { text: "Something went wrong reaching the assistant. Please try again." };
  }
}

function keyErrorMessage(err: unknown, fallback: string): string {
  const d = (err as { response?: { data?: Rec } } | null)?.response?.data;
  const msg = d?.error?.message ?? d?.message;
  const code = errorCode(err);
  // These messages come from our own API and are written for users.
  if (["AI_KEY_INVALID", "INVALID_REQUEST", "INVALID_MODEL", "AI_VALIDATION_UNAVAILABLE", "AI_KEY_MISSING"].includes(code) && typeof msg === "string") {
    return msg;
  }
  return fallback;
}

/** Accepts only the card shapes we know how to render. */
function readCards(v: unknown): MessageCards | undefined {
  if (!v || typeof v !== "object") return undefined;
  const r = v as Rec;
  const templates = (Array.isArray(r.templates) ? r.templates : []).filter(
    (t: TemplateCard) => t && typeof t.key === "string" && typeof t.name === "string",
  ) as TemplateCard[];
  const invoices = (Array.isArray(r.invoices) ? r.invoices : []).filter(
    (i: InvoiceCard) => i && typeof i.number === "string" && Array.isArray(i.items) && typeof i.amount === "number",
  ) as InvoiceCard[];
  return templates.length || invoices.length ? { templates, invoices } : undefined;
}

/* ========================================================================== */
/*  Entry                                                                     */
/* ========================================================================== */

export function AiStudioClient({ user }: Props) {
  return (
    <MotionConfig reducedMotion="user">
      <Studio user={user} />
    </MotionConfig>
  );
}

function Studio({ user }: Props) {
  /* ---- key state ---- */
  const [keyStatus, setKeyStatus] = React.useState<"loading" | "ready" | "error">("loading");
  const [info, setInfo] = React.useState<KeyInfo | null>(null);
  const [attempt, setAttempt] = React.useState(0);
  const [settingsOpen, setSettingsOpen] = React.useState(false);
  const [keyBusy, setKeyBusy] = React.useState<KeyBusy>(null);

  /* ---- chat state ---- */
  const [messages, setMessages] = React.useState<ChatMessage[]>([]);
  const [draft, setDraft] = React.useState("");
  const [busy, setBusy] = React.useState(false);
  const [remaining, setRemaining] = React.useState<number | null>(null);
  const [limit, setLimit] = React.useState<number | null>(null);
  const [voiceLang, setVoiceLang] = React.useState<VoiceLang>("en-US");
  const voice = useVoiceInput(voiceLang);
  const messagesRef = React.useRef<ChatMessage[]>([]);
  messagesRef.current = messages;

  const customer = React.useMemo<Customer>(
    () => ({
      name: `${user.first_name} ${user.last_name}`.trim() || "Customer",
      email: user.email,
      phone: user.phone_number,
    }),
    [user.first_name, user.last_name, user.email, user.phone_number],
  );

  /* ---- load key info ---- */
  React.useEffect(() => {
    let cancelled = false;
    setKeyStatus("loading");
    (async () => {
      try {
        const res = await apiClient.get(API.credentials);
        if (cancelled) return;
        setInfo(res.data?.data as KeyInfo);
        setKeyStatus("ready");
      } catch {
        if (!cancelled) setKeyStatus("error");
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [attempt]);

  const usable = keyStatus === "ready" && !!info?.has_key && info.is_valid;
  const invalid = keyStatus === "ready" && !!info?.has_key && !info.is_valid;

  /* ---- key actions (each returns true on success so the modal can react) ---- */
  const saveKey = React.useCallback(async (apiKey: string, model: string): Promise<boolean> => {
    setKeyBusy("save");
    try {
      const res = await apiClient.put(API.credentials, { api_key: apiKey, model });
      setInfo(res.data?.data as KeyInfo);
      toast.add({ title: "Key saved", description: "AI Studio is ready to use.", type: "success" });
      setSettingsOpen(false);
      return true;
    } catch (err) {
      toast.add({
        title: "Couldn’t save the key",
        description: keyErrorMessage(err, "Please check the key and try again."),
        type: "error",
      });
      return false;
    } finally {
      setKeyBusy(null);
    }
  }, []);

  const changeModel = React.useCallback(async (model: string): Promise<boolean> => {
    setKeyBusy("model");
    try {
      const res = await apiClient.patch(API.credentials, { model });
      setInfo(res.data?.data as KeyInfo);
      toast.add({ title: "Model changed", description: model, type: "success" });
      return true;
    } catch (err) {
      toast.add({
        title: "Couldn’t change the model",
        description: keyErrorMessage(err, "Please try again."),
        type: "error",
      });
      return false;
    } finally {
      setKeyBusy(null);
    }
  }, []);

  const deleteKey = React.useCallback(async (): Promise<boolean> => {
    setKeyBusy("delete");
    try {
      await apiClient.delete(API.credentials);
      setInfo((prev) => ({
        has_key: false,
        provider: prev?.provider ?? "groq",
        model: prev?.model ?? "openai/gpt-oss-120b",
        is_valid: false,
        masked_key: null,
        last_validated_at: null,
        available_models: prev?.available_models ?? [],
      }));
      toast.add({ title: "Key deleted", description: "Your saved key was removed.", type: "success" });
      setSettingsOpen(false);
      return true;
    } catch {
      toast.add({ title: "Couldn’t delete the key", description: "Nothing was changed. Please try again.", type: "error" });
      return false;
    } finally {
      setKeyBusy(null);
    }
  }, []);

  /* ---- chat ---- */
  const push = React.useCallback((m: ChatMessage) => {
    setMessages((prev) => [...prev, m].slice(-MAX_CHAT_MESSAGES));
  }, []);

  const send = React.useCallback(
    async (raw?: string) => {
      const text = (raw ?? draft).trim().slice(0, MAX_MESSAGE);
      if (!text || busy || !usable) return;
      if (voice.listening) voice.stop();

      const history = messagesRef.current
        .filter((m) => !m.error)
        .slice(-HISTORY_SENT)
        .map((m) => ({ role: m.role, content: m.text.slice(0, 1500) }));

      push({ id: uid(), role: "user", text, at: Date.now() });
      setDraft("");
      setBusy(true);
      const t0 = performance.now();
      try {
        const res = await apiClient.post(API.studio, { message: text, history });
        const d = res.data?.data as Rec | undefined;
        const answer = typeof d?.answer === "string" && d.answer.trim() ? d.answer.trim() : "I couldn’t find an answer to that.";
        if (typeof d?.remaining_today === "number") setRemaining(d.remaining_today);
        if (typeof d?.daily_limit === "number") setLimit(d.daily_limit);
        push({
          id: uid(),
          role: "assistant",
          text: answer,
          at: Date.now(),
          tookMs: Math.round(performance.now() - t0),
          cards: readCards(d?.cards),
        });
      } catch (err) {
        const e = chatError(err);
        if (e.keyState) {
          // Keep the setup banner in sync with what the server just told us.
          setInfo((prev) => (prev ? { ...prev, has_key: e.keyState === "invalid" ? true : false, is_valid: false } : prev));
        }
        push({ id: uid(), role: "assistant", text: e.text, at: Date.now(), error: true, needsKey: e.needsKey });
      } finally {
        setBusy(false);
      }
    },
    [busy, draft, push, usable, voice],
  );

  const clearChat = () => {
    setMessages([]);
    setDraft("");
  };

  const handleExport = (format: ExportFormat) => {
    if (!messagesRef.current.length) return;
    try {
      exportChat(messagesRef.current, customer, format);
      toast.add({
        title: format === "pdf" ? "Print window opened" : "Chat downloaded",
        description: format === "pdf" ? "Choose “Save as PDF” as the destination." : "Check your downloads folder.",
        type: "success",
      });
    } catch {
      toast.add({ title: "Couldn’t export the chat", description: "Please try again.", type: "error" });
    }
  };

  /* ---- render ---- */
  return (
    <div className="w-full space-y-3 sm:space-y-6">
      <header
        className={cn(
          "relative overflow-hidden rounded-2xl p-4 sm:rounded-3xl sm:p-7",
          "ring-1 ring-black/[0.06] shadow-[0_1px_2px_rgba(28,20,16,0.04),0_12px_28px_-18px_rgba(28,20,16,0.22)]",
        )}
        style={{ backgroundImage: `url(${BANNER})`, backgroundSize: "cover", backgroundPosition: "70% center" }}
      >
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 bg-gradient-to-b from-[#fff8f2]/95 via-[#fff8f2]/70 to-[#fff8f2]/30 sm:bg-gradient-to-r sm:from-[#fff8f2]/95 sm:via-[#fff8f2]/65 sm:to-[#fff8f2]/10"
        />
        <div className="relative z-10 flex flex-wrap items-end justify-between gap-3">
          <div className="min-w-0">
            <h1 className={cn(HEADING, "text-[26px] leading-8 tracking-[-0.025em] text-[#2a1002] sm:text-4xl sm:leading-10")}>
              AI <span className="text-orange-600">Studio</span>
            </h1>
            <p className="mt-1 max-w-xl text-[13px] font-medium leading-5 text-stone-600 sm:text-sm">
              Ask about your invitations, guests, orders and plan. Type it or say it.
            </p>
          </div>
          <KeyStatusChip info={info} loading={keyStatus === "loading"} onClick={() => setSettingsOpen(true)} />
        </div>
      </header>

      {keyStatus === "loading" && (
        <div className="space-y-3" aria-busy="true">
          <Shimmer className="h-40 w-full rounded-2xl" />
          <Shimmer className="h-16 w-full rounded-2xl" />
        </div>
      )}

      {keyStatus === "error" && (
        <div className={cn("rounded-2xl", SURFACE)}>
          <ErrorCard onRetry={() => setAttempt((n) => n + 1)} />
        </div>
      )}

      {keyStatus === "ready" && (
        // NOTE: no overflow-hidden / overflow-auto here, it would break the sticky composer.
        <section
          className="flex min-h-[32rem] flex-col rounded-2xl bg-stone-50/60 ring-1 ring-black/[0.06] sm:rounded-3xl"
          aria-label="AI Studio chat"
        >
          <ChatToolbar
            model={info?.has_key ? info.model : null}
            hasMessages={messages.length > 0}
            remaining={remaining}
            limit={limit}
            onExport={handleExport}
            onClear={clearChat}
            clearIcon={<Eraser className="size-3.5" />}
          />

          <div className="flex-1 px-3 py-5 sm:px-6">
            {!usable && messages.length === 0 ? (
              <SetupCard invalid={invalid} onOpen={() => setSettingsOpen(true)} />
            ) : (
              <ChatThread
                messages={messages}
                busy={busy}
                disabled={!usable}
                firstName={user.first_name || "there"}
                customer={customer}
                onPick={(t) => void send(t)}
                onOpenKey={() => setSettingsOpen(true)}
              />
            )}
          </div>

          <div className="sticky bottom-0 z-20 rounded-b-2xl border-t border-black/[0.06] bg-white/85 p-3 pb-[calc(0.75rem+env(safe-area-inset-bottom))] backdrop-blur-md sm:rounded-b-3xl sm:p-4">
            <Composer
              value={draft}
              onChange={setDraft}
              onSend={() => void send()}
              busy={busy}
              disabled={!usable}
              disabledReason={invalid ? "Update your AI key to keep chatting" : "Add your AI key to start chatting"}
              voice={voice}
              voiceLang={voiceLang}
              onVoiceLang={setVoiceLang}
            />
          </div>
        </section>
      )}

      <KeySettingsModal
        open={settingsOpen}
        info={info}
        busy={keyBusy}
        onClose={() => setSettingsOpen(false)}
        onSave={saveKey}
        onModel={changeModel}
        onDelete={deleteKey}
      />
    </div>
  );
}

export default AiStudioClient;