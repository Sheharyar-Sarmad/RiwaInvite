// app/api/v1/user/dashboard/invitations/route.ts
import { NextRequest, NextResponse } from "next/server";
import { sql } from "@/db/connections/postgres_connection";
import { errorResponse, pgErrorToResponse } from "@/lib/api/errors";
import { STATUS_CODE } from "@/lib/status_codes";

export async function POST(req: NextRequest) {
  const userId = req.headers.get("x-user-id");
  if (!userId) {
    return errorResponse(
      STATUS_CODE.UNAUTHORIZED,
      "UNAUTHORIZED",
      "Authentication required",
    );
  }

  try {
    // 1. Parse and validate request body
    const body = await req.json();
    const { template_id, draft_id, custom_slug } = body;

    if (!template_id || typeof template_id !== "string") {
      return errorResponse(
        STATUS_CODE.BAD_REQUEST,
        "INVALID_TEMPLATE",
        "Valid template_id is required",
      );
    }

    // 2. CRITICAL: Verify ownership BEFORE creating invitation
    const [purchase] = await sql`
      SELECT id, has_custom_slug FROM template_purchases 
      WHERE user_id = ${userId} AND template_id = ${template_id}
      LIMIT 1
    `;

    if (!purchase) {
      return errorResponse(
        STATUS_CODE.FORBIDDEN,
        "TEMPLATE_NOT_OWNED",
        "You must purchase this template before creating an invitation.",
      );
    }

    // Validate custom slug entitlement
    if (custom_slug && !purchase.has_custom_slug) {
      return errorResponse(
        STATUS_CODE.FORBIDDEN,
        "SLUG_NOT_ENTITLED",
        "Custom slugs require a premium purchase or add-on.",
      );
    }

    // 3. Fetch design schema from draft (if provided) or use null
    let designSchema: unknown = null;
    if (draft_id && typeof draft_id === "string") {
      const [draft] = await sql`
        SELECT design_schema FROM user_drafts 
        WHERE id = ${draft_id} AND user_id = ${userId}
        LIMIT 1
      `;
      designSchema = draft?.design_schema ?? null;
    }

    // 4. Create the invitation record
    // Note: We use COALESCE or explicit null handling for optional fields
    // Replace lines 59-79 with this:
    const [invitation] = await sql`
  INSERT INTO invitations (
    user_id,
    template_id,
    design_schema,
    slug,
    is_custom_slug,
    status,
    title,
    event_date
  ) VALUES (
    ${userId},
    ${template_id},
    COALESCE(
      ${designSchema ? JSON.stringify(designSchema) : null}::jsonb,
      '{}'::jsonb
    ),
    ${custom_slug || sql`gen_random_uuid()::text`},
    ${!!custom_slug},
    'draft',
    'Untitled Invitation',
    CURRENT_DATE + INTERVAL '7 days'
  ) RETURNING id, created_at, slug
`;

    // 5. Optional: Delete the draft after successful conversion
    if (draft_id && typeof draft_id === "string") {
      await sql`
        DELETE FROM user_drafts 
        WHERE id = ${draft_id} AND user_id = ${userId}
      `;
    }

    return NextResponse.json(
      { data: invitation },
      { status: STATUS_CODE.CREATED },
    );
  } catch (err) {
    console.error("[INVITATION_CREATE_ERROR]", err);
    return pgErrorToResponse(err);
  }
}
