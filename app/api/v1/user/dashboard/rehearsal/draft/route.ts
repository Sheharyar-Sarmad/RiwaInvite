// app/api/v1/user/dashboard/rehearsal/draft/route.ts
import { NextRequest, NextResponse } from "next/server";
import { sql } from "@/db/connections/postgres_connection";
import { errorResponse, pgErrorToResponse } from "@/lib/api/errors";
import { STATUS_CODE } from "@/lib/status_codes";
import settings from "@/config/settings_config";

const config = settings();
const MAX_SCHEMA_SIZE = 5 * 1024 * 1024; // 5MB limit
const MAX_ASSETS = 100;

/**
 * CRITICAL SECURITY: Validates that an asset URL belongs to the current user's rehearsal folder.
 * Prevents malicious users from injecting admin/other-user URLs to delete them on discard.
 */
function isUserOwnedAsset(url: unknown, userId: string): url is string {
  if (typeof url !== "string") return false;
  const expectedPrefix = `https://res.cloudinary.com/${config.cloudinaryCloudName}/rehearsal/${userId}/`;
  return url.startsWith(expectedPrefix);
}

/* ------------------------------------------------------------------ */
/* GET: Fetch existing draft by template_id                           */
/* ------------------------------------------------------------------ */
export async function GET(req: NextRequest) {
  const userId = req.headers.get("x-user-id");
  if (!userId) {
    return errorResponse(STATUS_CODE.UNAUTHORIZED, "UNAUTHORIZED", "Authentication required");
  }

  const templateId = req.nextUrl.searchParams.get("template_id");
  if (!templateId || !/^[\w-]{1,64}$/.test(templateId)) {
    return errorResponse(STATUS_CODE.BAD_REQUEST, "INVALID_TEMPLATE", "Valid template_id is required");
  }

  try {
    const [draft] = await sql`
      SELECT id, design_schema, cloudinary_assets, updated_at
      FROM user_drafts
      WHERE user_id = ${userId} AND template_id = ${templateId}
      LIMIT 1
    `;

    // 200 + null means "no draft yet" — client should create one
    return NextResponse.json(
      { data: draft ?? null },
      { status: STATUS_CODE.OK, headers: { "Cache-Control": "no-store" } }
    );
  } catch (err) {
    return pgErrorToResponse(err);
  }
}

/* ------------------------------------------------------------------ */
/* POST: Upsert draft with asset ownership validation                 */
/* ------------------------------------------------------------------ */
export async function POST(req: NextRequest) {
  const userId = req.headers.get("x-user-id");
  if (!userId) {
    return errorResponse(STATUS_CODE.UNAUTHORIZED, "UNAUTHORIZED", "Authentication required");
  }

  try {
    const body = await req.json();
    const { template_id, design_schema, cloudinary_assets } = body;

    // Strict input validation
    if (!template_id || typeof template_id !== "string") {
      return errorResponse(STATUS_CODE.BAD_REQUEST, "INVALID_TEMPLATE", "Valid template_id is required");
    }
    if (!design_schema || typeof design_schema !== "object") {
      return errorResponse(STATUS_CODE.BAD_REQUEST, "INVALID_SCHEMA", "Valid design_schema is required");
    }
    if (JSON.stringify(design_schema).length > MAX_SCHEMA_SIZE) {
      return errorResponse(STATUS_CODE.PAYLOAD_TOO_LARGE, "SCHEMA_TOO_LARGE", "Design exceeds 5MB limit");
    }
    if (cloudinary_assets && (!Array.isArray(cloudinary_assets) || cloudinary_assets.length > MAX_ASSETS)) {
      return errorResponse(STATUS_CODE.BAD_REQUEST, "INVALID_ASSETS", `Max ${MAX_ASSETS} assets allowed`);
    }

    // FILTER ASSETS: Only keep URLs owned by this user's rehearsal folder
    const safeAssets = Array.isArray(cloudinary_assets)
      ? cloudinary_assets.filter((url) => isUserOwnedAsset(url, userId))
      : [];

    // Atomic UPSERT with sanitized assets
    const [draft] = await sql`
      INSERT INTO user_drafts (user_id, template_id, design_schema, cloudinary_assets)
      VALUES (${userId}, ${template_id}, ${JSON.stringify(design_schema)}::jsonb, ${safeAssets}::text[])
      ON CONFLICT (user_id, template_id) DO UPDATE SET
        design_schema = EXCLUDED.design_schema,
        cloudinary_assets = EXCLUDED.cloudinary_assets,
        updated_at = NOW()
      RETURNING id, updated_at
    `;

    return NextResponse.json({ data: draft }, { status: STATUS_CODE.OK });
  } catch (err) {
    return pgErrorToResponse(err);
  }
}