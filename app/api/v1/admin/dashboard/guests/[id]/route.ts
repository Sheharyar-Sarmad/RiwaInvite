import { NextRequest, NextResponse } from "next/server";
import { sql } from "@/db/connections/postgres_connection";
import { errorResponse, pgErrorToResponse } from "@/lib/api/errors";
import { STATUS_CODE } from "@/lib/status_codes";

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
type Params = { params: Promise<{ id: string }> };

export async function DELETE(req: NextRequest, { params }: Params) {
  const adminId = req.headers.get("x-admin-id");
  if (!adminId) return errorResponse(STATUS_CODE.UNAUTHORIZED, "UNAUTHORIZED", "Missing Admin ID.");

  const { id } = await params;
  if (!UUID_RE.test(id)) return errorResponse(STATUS_CODE.BAD_REQUEST, "INVALID_ID", "Invalid guest id.");

  try {
    const [deleted] = await sql`
      DELETE FROM guests WHERE id = ${id} RETURNING id, guest_name, invitation_id
    `;

    if (!deleted) {
      return errorResponse(STATUS_CODE.NOT_FOUND, "NOT_FOUND", "Guest not found.");
    }

    // Log the moderation action
    await sql`
      INSERT INTO admin_notifications (admin_id, type, title, message)
      VALUES (
        ${adminId}, 
        'alert', 
        'Guest Removed', 
        ${`Admin removed guest "${deleted.guest_name}" from invitation.`}
      )
    `;

    return NextResponse.json({ status: "success", message: "Guest removed." }, { status: STATUS_CODE.OK });
  } catch (err) {
    return pgErrorToResponse(err);
  }
}