// app/api/v1/user/dashboard/invitations/route.ts
import { NextRequest, NextResponse } from "next/server";
import crypto from "crypto";
import { sql } from "@/db/connections/postgres_connection";
import { errorResponse, pgErrorToResponse } from "@/lib/api/errors";
import { STATUS_CODE } from "@/lib/status_codes";
import settings from "@/config/settings_config";

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const config = settings();

/* -------------------------------------------------------------------------- */
/*  Cover image: the USER's image, never the template's                       */
/* -------------------------------------------------------------------------- */
const IMG_EXT = /\.(png|jpe?g|webp|gif|avif|svg)(\?|#|$)/i;
const IMG_KEY = /(image|photo|img|cover|picture|src)/i;

const IGNORED_KEYS = new Set([
  "thumbnailurl", "thumbnail_url", "thumbnail",
  "galleryurls", "gallery_urls",
  "videourls", "video_urls",
  "musicurls", "music_urls"
]);

function asObject(v: unknown): unknown {
  if (typeof v === "string") {
    try { return JSON.parse(v); } catch { return null; }
  }
  return v;
}

function collectImages(node: unknown, key = "", out: string[] = [], depth = 0): string[] {
  if (out.length >= 200 || depth > 14 || node == null) return out;
  
  if (IGNORED_KEYS.has(key.toLowerCase())) return out;

  if (typeof node === "string") {
    const isUrl = /^(https?:)?\/\//.test(node) || node.startsWith("/");
    if (isUrl && node.length < 2048 && (IMG_EXT.test(node) || IMG_KEY.test(key))) out.push(node);
    return out;
  }
  if (Array.isArray(node)) {
    for (const item of node) collectImages(item, key, out, depth + 1);
    return out;
  }
  if (typeof node === "object") {
    for (const [k, v] of Object.entries(node as Record<string, unknown>)) collectImages(v, k, out, depth + 1);
  }
  return out;
}

function userCover(
  schema: Record<string, any> | null, 
  templateSchema: Record<string, any> | null, 
  templateThumb: string | null,
  userId: string
): string | null {
  const jsonString = JSON.stringify(schema);
  const prefix = `https://res.cloudinary.com/${config.cloudinaryCloudName}/rehearsal/${userId}/`;

  // 1. Try to find an image the user actually uploaded in their draft
  const regex = new RegExp(`"(${prefix}[^"]+\\.(?:png|jpe?g|webp|gif|avif)(?:\\?[^"]*)?)"`, "i");
  const match = jsonString.match(regex);
  if (match) return match[1];

  // 2. Fallback to the thumbnailUrl saved inside the design_schema
  if (schema?.thumbnailUrl) return schema.thumbnailUrl;
  if (schema?.thumbnail_url) return schema.thumbnail_url;

  // 3. Fallback to the original template schema
  if (templateSchema?.thumbnailUrl) return templateSchema.thumbnailUrl;
  if (templateSchema?.thumbnail_url) return templateSchema.thumbnail_url;

  // 4. Fallback to the raw template thumbnail column
  if (templateThumb) return templateThumb;

  return null;
}

/* -------------------------------------------------------------------------- */

export async function POST(req: NextRequest) {
  const userId = req.headers.get("x-user-id");
  if (!userId) return errorResponse(STATUS_CODE.UNAUTHORIZED, "UNAUTHORIZED", "Authentication required");

  try {
    const body = await req.json().catch(() => null);
    const templateId = body?.template_id;
    if (typeof templateId !== "string" || !UUID_RE.test(templateId)) {
      return errorResponse(STATUS_CODE.BAD_REQUEST, "INVALID_TEMPLATE", "Valid template_id is required");
    }

    const [owned] = await sql`
      SELECT t.name, t.status, tp.has_custom_slug
      FROM template_purchases tp
      JOIN templates t ON t.id = tp.template_id
      WHERE tp.user_id = ${userId} AND tp.template_id = ${templateId}
      LIMIT 1
    `;
    if (!owned) {
      return errorResponse(STATUS_CODE.FORBIDDEN, "TEMPLATE_NOT_OWNED", "You must purchase this template before creating an invitation.");
    }

    const result = await sql.begin(async (tx) => {
      // Serialize every request for this user + template so only one can insert
      await tx`SELECT pg_advisory_xact_lock(hashtextextended(${`inv:${userId}:${templateId}`}, 0))`;

      // 1. Fetch the draft FIRST (in case we need to update the existing invitation)
      const [draft] = await tx`
        SELECT id, design_schema FROM user_drafts
        WHERE user_id = ${userId} AND template_id = ${templateId}
        LIMIT 1 FOR UPDATE
      `;

      // 2. Check if an invitation already exists
      const [existing] = await tx`
        SELECT id, slug, is_custom_slug, status, created_at, event_date
        FROM invitations
        WHERE user_id = ${userId} AND template_id = ${templateId}
        ORDER BY (status = 'published') DESC, created_at ASC
        LIMIT 1
      `;

      // 3. If it exists and there's a new draft, UPDATE the invitation!
      if (existing) {
        if (draft) {
          await tx`
            UPDATE invitations
            SET design_schema = ${JSON.stringify(draft.design_schema)}::jsonb,
                updated_at = NOW()
            WHERE id = ${existing.id}
          `;
          await tx`DELETE FROM user_drafts WHERE id = ${draft.id} AND user_id = ${userId}`;
        }
        return { inv: existing, existed: true };
      }

      // 4. Create a NEW invitation if one doesn't exist
      if (owned.status === "archived") return { retired: true as const };

      const [tplBody] = await tx`
        SELECT id, design_schema FROM template_bodies
        WHERE template_id = ${templateId}
        ORDER BY version DESC LIMIT 1
      `;

      const draftSchema = draft?.design_schema;
      const hasDraft = draftSchema && Object.keys(draftSchema).length > 0;
      const designSchema = hasDraft ? draftSchema : (tplBody?.design_schema ?? {});

      let slug: string = crypto.randomUUID();
      let isCustom = false;
      if (owned.has_custom_slug) {
        const [order] = await tx`
          SELECT preferred_slug FROM orders
          WHERE user_id = ${userId} AND reference_id = ${templateId}
            AND order_type = 'template' AND status = 'completed'
            AND has_custom_slug = TRUE AND preferred_slug IS NOT NULL
          ORDER BY created_at DESC LIMIT 1
        `;
        const wanted: string | undefined = order?.preferred_slug;
        if (wanted) {
          const [taken] = await tx`SELECT 1 FROM invitations WHERE LOWER(slug) = LOWER(${wanted}) LIMIT 1`;
          if (!taken) {
            slug = wanted;
            isCustom = true;
          }
        }
      }

      const [inv] = await tx`
        INSERT INTO invitations (
          user_id, template_id, template_body_id, design_schema,
          slug, is_custom_slug, status, published_at, title, event_date
        ) VALUES (
          ${userId}, ${templateId}, ${tplBody?.id ?? null}, ${JSON.stringify(designSchema)}::jsonb,
          ${slug}, ${isCustom}, 'published', NOW(), ${String(owned.name).slice(0, 100)},
          CURRENT_DATE + INTERVAL '7 days'
        )
        RETURNING id, slug, is_custom_slug, status, created_at, event_date
      `;

      if (draft) await tx`DELETE FROM user_drafts WHERE id = ${draft.id} AND user_id = ${userId}`;
      return { inv, existed: false };
    });

    if ("retired" in result) {
      return errorResponse(STATUS_CODE.BAD_REQUEST, "TEMPLATE_RETIRED", "This template was retired and can't start new invitations.");
    }

    return NextResponse.json(
      { data: result.inv, existed: result.existed },
      { status: result.existed ? STATUS_CODE.OK : STATUS_CODE.CREATED },
    );
  } catch (err) {
    console.error("[INVITATION_CREATE_ERROR]", err);
    return pgErrorToResponse(err);
  }
}

export async function GET(req: NextRequest) {
  const userId = req.headers.get("x-user-id");
  if (!userId) return errorResponse(STATUS_CODE.UNAUTHORIZED, "UNAUTHORIZED", "Authentication required");

  try {
    const rows = await sql`
      SELECT * FROM (
        SELECT DISTINCT ON (COALESCE(i.template_id::text, i.id::text))
          i.id, i.title, i.status, i.slug, i.is_custom_slug,
          i.created_at, i.event_date, i.expires_at, i.published_at,
          i.template_id,
          i.design_schema,
          tb.design_schema AS template_schema,
          t.name AS template_name,
          t.thumbnail_url AS template_thumb,
          (SELECT COUNT(*)::int FROM guests g WHERE g.invitation_id = i.id) AS rsvp_count
        FROM invitations i
        LEFT JOIN templates t ON t.id = i.template_id
        LEFT JOIN template_bodies tb ON tb.id = i.template_body_id
        WHERE i.user_id = ${userId}
        ORDER BY COALESCE(i.template_id::text, i.id::text),
                 (i.status = 'published') DESC,
                 i.created_at ASC
      ) one_per_template
      ORDER BY created_at DESC
    `;

    const invitations = rows.map(({ design_schema, template_schema, template_thumb, ...rest }) => {
      const schemaStr = JSON.stringify(design_schema);
      const prefix = `https://res.cloudinary.com/${config.cloudinaryCloudName}/rehearsal/${userId}/`;

      // Detect if the user has uploaded specific media types
      const has_gallery = new RegExp(`"(${prefix}[^"]+\\.(?:png|jpe?g|webp|gif|avif)(?:\\?[^"]*)?)"`, "i").test(schemaStr);
      const has_video = new RegExp(`"(${prefix}[^"]+\\.(?:mp4|webm|mov)(?:\\?[^"]*)?)"`, "i").test(schemaStr);
      const has_audio = new RegExp(`"(${prefix}[^"]+\\.(?:mp3|wav|ogg|m4a)(?:\\?[^"]*)?)"`, "i").test(schemaStr);

      return {
        ...rest,
        cover_url: userCover(design_schema, template_schema, template_thumb, userId),
        has_gallery,
        has_video,
        has_audio,
      };
    });

    return NextResponse.json({ data: invitations }, { status: STATUS_CODE.OK });
  } catch (err) {
    console.error("[INVITATIONS_GET_ERROR]", err);
    return pgErrorToResponse(err);
  }
}