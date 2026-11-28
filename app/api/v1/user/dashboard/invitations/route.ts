// app/api/v1/user/dashboard/invitations/route.ts
import { NextRequest, NextResponse } from "next/server";
import crypto from "crypto";
import { sql } from "@/db/connections/postgres_connection";
import { errorResponse, pgErrorToResponse } from "@/lib/api/errors";
import { STATUS_CODE } from "@/lib/status_codes";
import settings from "@/config/settings_config";

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const config = settings();

const escapeRe = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

/* -------------------------------------------------------------------------- */

export async function POST(req: NextRequest) {
  const userId = req.headers.get("x-user-id");
  if (!userId)
    return errorResponse(
      STATUS_CODE.UNAUTHORIZED,
      "UNAUTHORIZED",
      "Authentication required",
    );

  try {
    const body = await req.json().catch(() => null);
    const templateId = body?.template_id;
    if (typeof templateId !== "string" || !UUID_RE.test(templateId)) {
      return errorResponse(
        STATUS_CODE.BAD_REQUEST,
        "INVALID_TEMPLATE",
        "Valid template_id is required",
      );
    }

    const [owned] = await sql`
  SELECT t.name, t.status, COALESCE(tp.has_custom_slug, FALSE) AS has_custom_slug
  FROM templates t
  LEFT JOIN template_purchases tp ON tp.template_id = t.id AND tp.user_id = ${userId}
  WHERE t.id = ${templateId}
    AND (
      tp.id IS NOT NULL
      OR EXISTS (
        SELECT 1
        FROM subscription_template_unlocks u
        JOIN user_subscriptions us ON us.id = u.subscription_id
        WHERE u.user_id = ${userId}
          AND u.template_id = t.id
          AND us.status = 'active'
          AND us.expires_at > NOW()
      )
    )
  LIMIT 1
`;
    if (!owned) {
      return errorResponse(
        STATUS_CODE.FORBIDDEN,
        "TEMPLATE_NOT_OWNED",
        "You must purchase this template before creating an invitation.",
      );
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
      const designSchema = hasDraft
        ? draftSchema
        : (tplBody?.design_schema ?? {});

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
          const [taken] =
            await tx`SELECT 1 FROM invitations WHERE LOWER(slug) = LOWER(${wanted}) LIMIT 1`;
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

      if (draft)
        await tx`DELETE FROM user_drafts WHERE id = ${draft.id} AND user_id = ${userId}`;
      return { inv, existed: false };
    });

    if ("retired" in result) {
      return errorResponse(
        STATUS_CODE.BAD_REQUEST,
        "TEMPLATE_RETIRED",
        "This template was retired and can't start new invitations.",
      );
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
  if (!userId)
    return errorResponse(
      STATUS_CODE.UNAUTHORIZED,
      "UNAUTHORIZED",
      "Authentication required",
    );

  try {
    // Same patterns the JS code used, now evaluated inside Postgres.
    const prefix = escapeRe(
      `https://res.cloudinary.com/${config.cloudinaryCloudName}/rehearsal/${userId}/`,
    );
    const q = `[^"]+\\.(?:`;
    const tail = `)(?:\\?[^"]*)?)"`;
    const imageRe = `"(${prefix}${q}png|jpe?g|webp|gif|avif${tail}`;
    const videoRe = `"(${prefix}${q}mp4|webm|mov${tail}`;
    const audioRe = `"(${prefix}${q}mp3|wav|ogg|m4a${tail}`;

    // Step 1 picks one invitation id per template (cheap, no JSON).
    // Step 2 reads the JSON once, inside Postgres, and returns only small values.
    const rows = await sql`
      WITH picked AS (
        SELECT DISTINCT ON (COALESCE(i.template_id::text, i.id::text)) i.id
        FROM invitations i
        WHERE i.user_id = ${userId}
        ORDER BY COALESCE(i.template_id::text, i.id::text),
                 (i.status = 'published') DESC,
                 i.created_at ASC
      )
      SELECT
        i.id, i.title, i.status, i.slug, i.is_custom_slug,
        i.created_at, i.event_date, i.expires_at, i.published_at,
        i.template_id,
        t.name AS template_name,
        (SELECT COUNT(*)::int FROM guests g WHERE g.invitation_id = i.id) AS rsvp_count,
        COALESCE(
          (regexp_match(i.design_schema::text, ${imageRe}::text, 'i'))[1],
          NULLIF(i.design_schema->>'thumbnailUrl', ''),
          NULLIF(i.design_schema->>'thumbnail_url', ''),
          NULLIF(tb.design_schema->>'thumbnailUrl', ''),
          NULLIF(tb.design_schema->>'thumbnail_url', ''),
          NULLIF(t.thumbnail_url, '')
        ) AS cover_url,
        (i.design_schema::text ~* ${imageRe}::text) AS has_gallery,
        (i.design_schema::text ~* ${videoRe}::text) AS has_video,
        (i.design_schema::text ~* ${audioRe}::text) AS has_audio
      FROM picked p
      JOIN invitations i ON i.id = p.id
      LEFT JOIN templates t ON t.id = i.template_id
      LEFT JOIN template_bodies tb ON tb.id = i.template_body_id
      ORDER BY i.created_at DESC
    `;

    return NextResponse.json({ data: rows }, { status: STATUS_CODE.OK });
  } catch (err) {
    console.error("[INVITATIONS_GET_ERROR]", err);
    return pgErrorToResponse(err);
  }
}