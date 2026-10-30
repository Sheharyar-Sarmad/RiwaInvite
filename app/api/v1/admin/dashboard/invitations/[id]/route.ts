import { NextRequest, NextResponse } from "next/server";
import { sql } from "@/db/connections/postgres_connection";
import { errorResponse, pgErrorToResponse } from "@/lib/api/errors";
import { STATUS_CODE } from "@/lib/status_codes";

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
type Params = { params: Promise<{ id: string }> };

export async function GET(req: NextRequest, { params }: Params) {
  const adminId = req.headers.get("x-admin-id");
  if (!adminId) return errorResponse(STATUS_CODE.UNAUTHORIZED, "UNAUTHORIZED", "Missing Admin ID.");

  const { id } = await params;
  if (!UUID_RE.test(id)) return errorResponse(STATUS_CODE.BAD_REQUEST, "INVALID_ID", "Invalid invitation id.");

  try {
    const [invitation] = await sql`
      SELECT 
        i.*,
        u.first_name as user_first_name, u.last_name as user_last_name, u.email as user_email,
        t.name as template_name, t.thumbnail_url as template_thumbnail
      FROM invitations i
      JOIN users u ON i.user_id = u.id
      LEFT JOIN templates t ON i.template_id = t.id
      WHERE i.id = ${id}
      LIMIT 1
    `;

    if (!invitation) {
      return errorResponse(STATUS_CODE.NOT_FOUND, "NOT_FOUND", "Invitation not found.");
    }

    // Fetch all guests for this invitation
    const guests = await sql`
      SELECT id, guest_name, attendance_status, number_of_guests, comment, created_at
      FROM guests
      WHERE invitation_id = ${id}
      ORDER BY created_at DESC
    `;

    return NextResponse.json({ 
      data: { 
        ...invitation, 
        guests 
      } 
    }, { status: STATUS_CODE.OK });

  } catch (err) {
    return pgErrorToResponse(err);
  }
}