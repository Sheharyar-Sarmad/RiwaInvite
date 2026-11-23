// app/api/v1/user/dashboard/ai-credentials/route.ts
//
// GET    -> { data: { has_key, provider, model, is_valid, masked_key, last_validated_at, available_models } }
// PUT    { api_key, model? }  validates against Groq, encrypts, upserts      -> notifies "added" or "updated"
// PATCH  { model }            changes the model only                          -> notifies "model changed"
// DELETE                      removes the saved key                           -> notifies "deleted"
//
// The full key is never returned and never written to a notification.

import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { sql } from "@/db/connections/postgres_connection";
import { errorResponse, pgErrorToResponse } from "@/lib/api/errors";
import { STATUS_CODE } from "@/lib/status_codes";
import {
  ALLOWED_MODELS,
  DEFAULT_MODEL,
  PROVIDER,
  decryptKey,
  encryptKey,
  isAllowedModel,
  maskKey,
  validateGroqKey,
} from "@/lib/ai/credentials";

const ModelSchema = z.string().refine(isAllowedModel, "Unsupported model");
const PutSchema = z.object({
  api_key: z.string().trim().min(20).max(200).regex(/^gsk_[A-Za-z0-9]+$/, "That doesn't look like a Groq API key (it starts with gsk_)"),
  model: ModelSchema.optional(),
});
const PatchSchema = z.object({ model: ModelSchema });

const unauthorized = () => errorResponse(STATUS_CODE.UNAUTHORIZED, "UNAUTHORIZED", "Authentication required");

async function readJson(req: NextRequest): Promise<unknown | undefined> {
  try {
    return await req.json();
  } catch {
    return undefined;
  }
}

/**
 * Adds a row to the user's notifications.
 * Best effort: a failed notification must never fail or undo the change the user just made.
 * Never put the API key (or anything secret) in title or message.
 */
async function notify(userId: string, title: string, message: string): Promise<void> {
  try {
    await sql`
      INSERT INTO notifications (user_id, title, message)
      VALUES (${userId}, ${title.slice(0, 100)}, ${message})
    `;
  } catch {
    console.warn("[AI_CREDENTIALS_NOTIFY] could not create notification");
  }
}

type Row = { model: string; is_valid: boolean; last_validated_at: Date | null };

const view = (row: Row, maskedKey: string | null) => ({
  has_key: true,
  provider: PROVIDER,
  model: row.model,
  is_valid: row.is_valid,
  masked_key: maskedKey,
  last_validated_at: row.last_validated_at,
  available_models: ALLOWED_MODELS,
});

export async function GET(req: NextRequest) {
  const userId = req.headers.get("x-user-id");
  if (!userId) return unauthorized();

  try {
    const [row] = await sql`
      SELECT encrypted_key, key_iv, key_tag, model, is_valid, last_validated_at
      FROM user_ai_credentials
      WHERE user_id = ${userId} AND provider = ${PROVIDER}
      LIMIT 1
    `;
    if (!row) {
      return NextResponse.json({
        data: { has_key: false, provider: PROVIDER, model: DEFAULT_MODEL, is_valid: false, masked_key: null, last_validated_at: null, available_models: ALLOWED_MODELS },
      });
    }

    let masked: string | null = null;
    let isValid = row.is_valid as boolean;
    try {
      masked = maskKey(decryptKey(row.encrypted_key, row.key_iv, row.key_tag));
    } catch {
      isValid = false; // cannot decrypt: the user must re-enter the key
    }
    return NextResponse.json({ data: view({ model: row.model, is_valid: isValid, last_validated_at: row.last_validated_at }, masked) });
  } catch (err) {
    return pgErrorToResponse(err);
  }
}

export async function PUT(req: NextRequest) {
  const userId = req.headers.get("x-user-id");
  if (!userId) return unauthorized();

  const parsed = PutSchema.safeParse(await readJson(req));
  if (!parsed.success) {
    return errorResponse(STATUS_CODE.BAD_REQUEST, "INVALID_REQUEST", parsed.error.issues[0]?.message ?? "Invalid request");
  }
  const { api_key } = parsed.data;

  const check = await validateGroqKey(api_key);
  if (check === "invalid") {
    return errorResponse(STATUS_CODE.BAD_REQUEST, "AI_KEY_INVALID", "Groq rejected this API key. Check it and try again.");
  }
  if (check === "unreachable") {
    return errorResponse(STATUS_CODE.BAD_GATEWAY, "AI_VALIDATION_UNAVAILABLE", "Could not reach Groq to verify the key. Please try again.");
  }

  try {
    // Keep the user's current model unless they chose a new one.
    let model = parsed.data.model;
    if (!model) {
      const [existing] = await sql`
        SELECT model FROM user_ai_credentials WHERE user_id = ${userId} AND provider = ${PROVIDER} LIMIT 1
      `;
      model = isAllowedModel(existing?.model) ? existing.model : DEFAULT_MODEL;
    }

    const { encrypted, iv, tag } = encryptKey(api_key);
    // (xmax = 0) is true only for a freshly inserted row, so we can tell "added" from "updated".
    const [row] = await sql`
      INSERT INTO user_ai_credentials (user_id, provider, encrypted_key, key_iv, key_tag, model, is_valid, last_validated_at)
      VALUES (${userId}, ${PROVIDER}, ${encrypted}, ${iv}, ${tag}, ${model}, TRUE, CURRENT_TIMESTAMP)
      ON CONFLICT (user_id, provider) DO UPDATE SET
        encrypted_key = EXCLUDED.encrypted_key,
        key_iv = EXCLUDED.key_iv,
        key_tag = EXCLUDED.key_tag,
        model = EXCLUDED.model,
        is_valid = TRUE,
        last_validated_at = CURRENT_TIMESTAMP
      RETURNING model, is_valid, last_validated_at, (xmax = 0) AS inserted
    `;

    const masked = maskKey(api_key);
    if (row.inserted) {
      await notify(
        userId,
        "AI key added",
        `Your Groq API key (${masked}) was verified and saved. AI Studio is ready to use with the ${row.model} model.`,
      );
    } else {
      await notify(
        userId,
        "AI key updated",
        `Your Groq API key was replaced with ${masked} and verified. AI Studio is using the ${row.model} model.`,
      );
    }

    return NextResponse.json({ data: view(row as Row, masked) });
  } catch (err) {
    console.error("[AI_CREDENTIALS_PUT]", err instanceof Error ? err.name : "unknown"); // never log the key
    return pgErrorToResponse(err);
  }
}

export async function PATCH(req: NextRequest) {
  const userId = req.headers.get("x-user-id");
  if (!userId) return unauthorized();

  const parsed = PatchSchema.safeParse(await readJson(req));
  if (!parsed.success) {
    return errorResponse(STATUS_CODE.BAD_REQUEST, "INVALID_MODEL", `Model must be one of: ${ALLOWED_MODELS.join(", ")}`);
  }

  try {
    // Read the old model in the same statement so the notification can say what changed.
    const [row] = await sql`
      WITH old AS (
        SELECT model FROM user_ai_credentials WHERE user_id = ${userId} AND provider = ${PROVIDER}
      )
      UPDATE user_ai_credentials SET model = ${parsed.data.model}
      WHERE user_id = ${userId} AND provider = ${PROVIDER}
      RETURNING encrypted_key, key_iv, key_tag, model, is_valid, last_validated_at,
                (SELECT model FROM old) AS old_model
    `;
    if (!row) {
      return errorResponse(STATUS_CODE.NOT_FOUND, "AI_KEY_MISSING", "Add your Groq API key first, then choose a model.");
    }

    if (row.old_model !== row.model) {
      await notify(userId, "AI model changed", `Your AI model was changed from ${row.old_model} to ${row.model}.`);
    }

    let masked: string | null = null;
    try {
      masked = maskKey(decryptKey(row.encrypted_key, row.key_iv, row.key_tag));
    } catch {
      /* leave null */
    }
    return NextResponse.json({ data: view(row as Row, masked) });
  } catch (err) {
    return pgErrorToResponse(err);
  }
}

export async function DELETE(req: NextRequest) {
  const userId = req.headers.get("x-user-id");
  if (!userId) return unauthorized();

  try {
    const deleted = await sql`
      DELETE FROM user_ai_credentials
      WHERE user_id = ${userId} AND provider = ${PROVIDER}
      RETURNING id
    `;

    // Only notify when a key was actually removed.
    if (deleted.length > 0) {
      await notify(
        userId,
        "AI key deleted",
        "Your saved Groq API key was removed. AI Studio and design suggestions will stop working until you add a new key.",
      );
    }
    return NextResponse.json({ data: { has_key: false } });
  } catch (err) {
    return pgErrorToResponse(err);
  }
}