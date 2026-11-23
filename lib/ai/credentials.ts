// lib/ai/credentials.ts
//
// Everything about a user's own Groq key:
//  - encrypt / decrypt / mask
//  - validate a key against Groq
//  - load the saved key for a user
//  - groqChat(): one chat call with smart model fallback
//  - AiError + response helpers used by the API routes
//
// The full key is never logged and never returned to the browser.

import crypto from "node:crypto";
import { NextResponse } from "next/server";
import { sql } from "@/db/connections/postgres_connection";
import { errorResponse } from "@/lib/api/errors";
import { STATUS_CODE } from "@/lib/status_codes";

/* ========================================================================== */
/*  Constants                                                                 */
/* ========================================================================== */

export const PROVIDER = "groq";
export const DEFAULT_MODEL = "openai/gpt-oss-120b";

/** Models a user may choose in Settings. */
export const ALLOWED_MODELS: string[] = [
  "openai/gpt-oss-120b",
  "openai/gpt-oss-20b",
  "llama-3.3-70b-versatile",
  "llama-3.1-8b-instant",
];

/** Order tried when the chosen model fails. The user's own model always goes first. */
const FALLBACK_CHAIN: string[] = [
  "openai/gpt-oss-120b",
  "openai/gpt-oss-20b",
  "llama-3.3-70b-versatile",
  "llama-3.1-8b-instant",
];

const GROQ_BASE = "https://api.groq.com/openai/v1";
const REQUEST_TIMEOUT_MS = 25_000;
const VALIDATE_TIMEOUT_MS = 10_000;
/** A model that answered 404 is skipped for this long (per server process). */
const DEAD_MODEL_MS = 10 * 60_000;
const MAX_RETRY_TOKENS = 4_000;

export const isAllowedModel = (m: unknown): m is string => typeof m === "string" && ALLOWED_MODELS.includes(m);

/* ========================================================================== */
/*  Types & errors                                                            */
/* ========================================================================== */

export type ChatMessage = { role: "system" | "user" | "assistant"; content: string };

export type Credential = { apiKey: string; model: string };

export type AiErrorKind = "invalid_key" | "key_limit" | "upstream" | "unreachable" | "unreadable";

export class AiError extends Error {
  kind: AiErrorKind;
  constructor(kind: AiErrorKind, message?: string) {
    super(message ?? kind);
    this.name = "AiError";
    this.kind = kind;
  }
}

/* ========================================================================== */
/*  Encryption (AES-256-GCM)                                                  */
/* ========================================================================== */
// NOTE: if you already have working encryptKey/decryptKey/maskKey and saved keys in the
// database, KEEP YOUR EXISTING VERSIONS of these three functions. Changing the secret or
// the storage format would make every saved key undecryptable (users would re-enter them).

function secret(): Buffer {
  const raw = process.env.AI_KEY_ENCRYPTION_SECRET ?? process.env.AI_ENCRYPTION_KEY ?? "";
  if (!raw) throw new Error("AI_KEY_ENCRYPTION_SECRET is not set");
  if (/^[0-9a-f]{64}$/i.test(raw)) return Buffer.from(raw, "hex");
  return crypto.createHash("sha256").update(raw).digest();
}

const toBuf = (v: unknown): Buffer => {
  if (Buffer.isBuffer(v)) return v;
  if (typeof v === "string") return Buffer.from(v, "base64");
  return Buffer.from(v as Uint8Array);
};

export function encryptKey(plain: string): { encrypted: string; iv: string; tag: string } {
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv("aes-256-gcm", secret(), iv);
  const encrypted = Buffer.concat([cipher.update(plain, "utf8"), cipher.final()]);
  return { encrypted: encrypted.toString("base64"), iv: iv.toString("base64"), tag: cipher.getAuthTag().toString("base64") };
}

export function decryptKey(encrypted: unknown, iv: unknown, tag: unknown): string {
  const decipher = crypto.createDecipheriv("aes-256-gcm", secret(), toBuf(iv));
  decipher.setAuthTag(toBuf(tag));
  return Buffer.concat([decipher.update(toBuf(encrypted)), decipher.final()]).toString("utf8");
}

/** Shows only the first and last characters, e.g. gsk_••••a1b2. */
export function maskKey(key: string): string {
  if (key.length <= 10) return "••••••••";
  return `${key.slice(0, 4)}••••••••${key.slice(-4)}`;
}

/* ========================================================================== */
/*  Key validation                                                            */
/* ========================================================================== */

export async function validateGroqKey(apiKey: string): Promise<"valid" | "invalid" | "unreachable"> {
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), VALIDATE_TIMEOUT_MS);
  try {
    const res = await fetch(`${GROQ_BASE}/models`, {
      headers: { Authorization: `Bearer ${apiKey}` },
      signal: ctrl.signal,
      cache: "no-store",
    });
    if (res.ok) return "valid";
    if (res.status === 401 || res.status === 403) return "invalid";
    return "unreachable";
  } catch {
    return "unreachable";
  } finally {
    clearTimeout(timer);
  }
}

/* ========================================================================== */
/*  Load / invalidate the saved key                                           */
/* ========================================================================== */

/**
 * Returns the user's decrypted key and model.
 *  - no saved key            -> null (caller sends keyMissingResponse)
 *  - saved but rejected or unreadable -> throws AiError("invalid_key")
 */
export async function loadUsableCredential(userId: string): Promise<Credential | null> {
  const [row] = await sql`
    SELECT encrypted_key, key_iv, key_tag, model, is_valid
    FROM user_ai_credentials
    WHERE user_id = ${userId} AND provider = ${PROVIDER}
    LIMIT 1
  `;
  if (!row) return null;
  if (!row.is_valid) throw new AiError("invalid_key", "Saved key was marked invalid");

  let apiKey: string;
  try {
    apiKey = decryptKey(row.encrypted_key, row.key_iv, row.key_tag);
  } catch {
    throw new AiError("invalid_key", "Saved key could not be decrypted");
  }
  return { apiKey, model: isAllowedModel(row.model) ? row.model : DEFAULT_MODEL };
}

export async function markKeyInvalid(userId: string): Promise<void> {
  try {
    await sql`
      UPDATE user_ai_credentials SET is_valid = FALSE
      WHERE user_id = ${userId} AND provider = ${PROVIDER}
    `;
  } catch {
    console.warn("[AI_CREDENTIALS] could not mark key invalid");
  }
}

/* ========================================================================== */
/*  Groq chat with fallback                                                   */
/* ========================================================================== */

const deadModels = new Map<string, number>();
const isDead = (m: string) => (deadModels.get(m) ?? 0) > Date.now();
const markDead = (m: string) => deadModels.set(m, Date.now() + DEAD_MODEL_MS);

/** gpt-oss models "think" before answering. Keep that short so the answer is never starved. */
const isReasoningModel = (m: string) => m.startsWith("openai/gpt-oss");

type Attempt =
  | { kind: "ok"; text: string }
  | { kind: "empty"; truncated: boolean }
  | { kind: "skip"; reason: string; rateLimited?: boolean }
  | { kind: "fatal"; error: AiError };

function stripThinking(text: string): string {
  return text.replace(/<think>[\s\S]*?<\/think>/gi, "").trim();
}

async function attempt(
  apiKey: string,
  model: string,
  messages: ChatMessage[],
  maxTokens: number,
  temperature: number,
): Promise<Attempt> {
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), REQUEST_TIMEOUT_MS);
  try {
    const res = await fetch(`${GROQ_BASE}/chat/completions`, {
      method: "POST",
      headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        model,
        messages,
        temperature,
        max_completion_tokens: maxTokens,
        stream: false,
        ...(isReasoningModel(model) ? { reasoning_effort: "low", include_reasoning: false } : {}),
      }),
      signal: ctrl.signal,
      cache: "no-store",
    });

    if (res.status === 401 || res.status === 403) {
      return { kind: "fatal", error: new AiError("invalid_key", "Groq rejected the key") };
    }
    if (res.status === 404 || res.status === 410) {
      markDead(model); // model does not exist for this key: stop trying it for a while
      return { kind: "skip", reason: `Groq responded with ${res.status}` };
    }
    if (res.status === 429) return { kind: "skip", reason: "rate limited (429)", rateLimited: true };
    if (!res.ok) return { kind: "skip", reason: `Groq responded with ${res.status}` };

    const json = (await res.json()) as {
      choices?: { message?: { content?: unknown }; finish_reason?: string }[];
    };
    const choice = json.choices?.[0];
    const content = typeof choice?.message?.content === "string" ? stripThinking(choice.message.content) : "";
    if (content) return { kind: "ok", text: content };
    return { kind: "empty", truncated: choice?.finish_reason === "length" };
  } catch (err) {
    const aborted = err instanceof Error && err.name === "AbortError";
    return { kind: "skip", reason: aborted ? "timeout" : "network error" };
  } finally {
    clearTimeout(timer);
  }
}

export async function groqChat(
  cred: Credential,
  messages: ChatMessage[],
  opts: { maxTokens?: number; temperature?: number } = {},
): Promise<string> {
  const maxTokens = opts.maxTokens ?? 600;
  const temperature = opts.temperature ?? 0.3;

  const chain = [cred.model, ...FALLBACK_CHAIN.filter((m) => m !== cred.model)];
  const live = chain.filter((m) => !isDead(m));
  const candidates = live.length ? live : chain; // never end up with nothing to try

  let sawRateLimit = false;

  for (const model of candidates) {
    let result = await attempt(cred.apiKey, model, messages, maxTokens, temperature);

    // Empty because the token budget ran out (hidden reasoning): retry once, bigger budget.
    if (result.kind === "empty" && result.truncated) {
      result = await attempt(cred.apiKey, model, messages, Math.min(maxTokens * 3, MAX_RETRY_TOKENS), temperature);
    }

    switch (result.kind) {
      case "ok":
        return result.text;
      case "fatal":
        throw result.error;
      case "empty":
        console.warn("[AI_FALLBACK]", model, "Empty model response");
        break;
      case "skip":
        if (result.rateLimited) sawRateLimit = true;
        console.warn("[AI_FALLBACK]", model, result.reason);
        break;
    }
  }

  if (sawRateLimit) throw new AiError("key_limit", "Every model was rate limited");
  throw new AiError("upstream", "No model returned an answer");
}

/* ========================================================================== */
/*  Response helpers                                                          */
/* ========================================================================== */

export function keyMissingResponse(): NextResponse {
  return errorResponse(STATUS_CODE.NOT_FOUND, "AI_KEY_MISSING", "Add your Groq API key in AI Studio to start chatting.");
}

export function aiErrorResponse(err: AiError): NextResponse {
  switch (err.kind) {
    case "invalid_key":
      return errorResponse(STATUS_CODE.BAD_REQUEST, "AI_KEY_INVALID", "Groq rejected your saved key. Please update it.");
    case "key_limit":
      return errorResponse(STATUS_CODE.TOO_MANY_REQUESTS, "AI_KEY_LIMIT", "Your Groq key hit its rate limit or quota. Try again shortly.");
    case "unreachable":
    case "unreadable":
    case "upstream":
    default:
      return errorResponse(STATUS_CODE.BAD_GATEWAY, "AI_UPSTREAM", "The assistant is busy right now. Please try again shortly.");
  }
}