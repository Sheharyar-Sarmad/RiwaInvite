import { NextRequest, NextResponse } from "next/server";
import { sql } from "@/db/connections/postgres_connection";
import { errorResponse, pgErrorToResponse } from "@/lib/api/errors";
import { STATUS_CODE } from "@/lib/status_codes";

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const userId = req.headers.get("x-user-id");
  if (!userId) return errorResponse(STATUS_CODE.UNAUTHORIZED, "UNAUTHORIZED", "Authentication required");

  const { id } = await params;
  if (!UUID_RE.test(id)) return errorResponse(STATUS_CODE.BAD_REQUEST, "INVALID_ID", "Invalid invitation id");

  const body = await req.json().catch(() => null);
  const title = typeof body?.title === "string" ? body.title.trim() : "";
  const eventDate = body?.event_date;
  const status = body?.status;

  if (title.length < 1 || title.length > 100) {
    return errorResponse(STATUS_CODE.BAD_REQUEST, "INVALID_TITLE", "Name must be 1 to 100 characters.");
  }
  if (typeof eventDate !== "string" || !DATE_RE.test(eventDate) || Number.isNaN(new Date(eventDate).getTime())) {
    return errorResponse(STATUS_CODE.BAD_REQUEST, "INVALID_DATE", "Enter a valid event date.");
  }
  if (status && !["draft", "published"].includes(status)) {
    return errorResponse(STATUS_CODE.BAD_REQUEST, "INVALID_STATUS", "Status must be draft or published.");
  }

  // Never pass `undefined` into a postgres.js template (it throws).
  const nextStatus: string | null = status ? String(status) : null;

  try {
    const [inv] = await sql`
      UPDATE invitations
      SET
        title = ${title},
        event_date = ${eventDate}::date,
        status = COALESCE(${nextStatus}::invitation_status, status),
        published_at = CASE WHEN ${nextStatus}::text = 'published' THEN NOW() ELSE published_at END
      WHERE id = ${id} AND user_id = ${userId}
      RETURNING id, title, event_date, expires_at, status
    `;
    if (!inv) return errorResponse(STATUS_CODE.NOT_FOUND, "NOT_FOUND", "Invitation not found");
    return NextResponse.json({ data: inv }, { status: STATUS_CODE.OK });
  } catch (err) {
    console.error("[INVITATION_PATCH_ERROR]", err);
    return pgErrorToResponse(err);
  }
}

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const userId = req.headers.get("x-user-id");
  if (!userId) return errorResponse(STATUS_CODE.UNAUTHORIZED, "UNAUTHORIZED", "Authentication required");

  const { id } = await params;
  if (!UUID_RE.test(id)) return errorResponse(STATUS_CODE.BAD_REQUEST, "INVALID_ID", "Invalid invitation id");

  try {
    const [inv] = await sql`
      SELECT id, title, status, slug, is_custom_slug, design_schema, template_id, event_date
      FROM invitations
      WHERE id = ${id} AND user_id = ${userId}
      LIMIT 1
    `;
    if (!inv) return errorResponse(STATUS_CODE.NOT_FOUND, "NOT_FOUND", "Invitation not found");
    return NextResponse.json({ data: inv }, { status: STATUS_CODE.OK });
  } catch (err) {
    return pgErrorToResponse(err);
  }
}