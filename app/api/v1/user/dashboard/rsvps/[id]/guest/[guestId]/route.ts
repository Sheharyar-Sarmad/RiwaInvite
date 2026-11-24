// app/api/v1/user/dashboard/rsvps/[id]/guest/[guestId]/route.ts
import { NextRequest, NextResponse } from "next/server";
import { sql } from "@/db/connections/postgres_connection";
import { errorResponse, pgErrorToResponse } from "@/lib/api/errors";
import { STATUS_CODE } from "@/lib/status_codes";
import { safeInvalidateCache } from "@/lib/api/helpers";

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

// Notification failures must never break the main request
async function createNotification(userId: string, title: string, message: string) {
  try {
    await sql`
      INSERT INTO notifications (user_id, title, message)
      VALUES (${userId}, ${title}, ${message})
    `;
  } catch (e) {
    console.warn("[RSVP_NOTIFICATION] Create failed:", e);
  }
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string; guestId: string }> }) {
  const userId = req.headers.get("x-user-id");
  if (!userId) return errorResponse(STATUS_CODE.UNAUTHORIZED, "UNAUTHORIZED", "Authentication required");

  const { id: invitationId, guestId } = await params;
  if (!UUID_RE.test(invitationId) || !UUID_RE.test(guestId)) return errorResponse(STATUS_CODE.BAD_REQUEST, "INVALID_ID", "Invalid ID");

  try {
    const body = await req.json().catch(() => null);
    const guestName = typeof body?.guest_name === "string" ? body.guest_name.trim() : "";
    const status = ["pending", "accepted", "declined"].includes(body?.attendance_status) ? body.attendance_status : "pending";
    const plusOnes = Math.max(1, parseInt(body?.number_of_guests) || 1);
    const comment = typeof body?.comment === "string" ? body.comment.trim() : "";

    if (!guestName) return errorResponse(STATUS_CODE.BAD_REQUEST, "INVALID_NAME", "Guest name is required");

    const [row] = await sql`
      UPDATE guests g
      SET guest_name = ${guestName}, attendance_status = ${status}, number_of_guests = ${plusOnes}, comment = ${comment}
      FROM invitations i
      WHERE g.id = ${guestId} AND g.invitation_id = i.id AND i.user_id = ${userId} AND i.id = ${invitationId}
      RETURNING g.id, g.guest_name, g.attendance_status, g.number_of_guests, g.comment, g.created_at, i.title AS invitation_title
    `;

    if (!row) return errorResponse(STATUS_CODE.NOT_FOUND, "NOT_FOUND", "Guest not found or access denied");

    // Keep the API response shape unchanged (strip the title)
    const { invitation_title, ...guest } = row;

    // CREATE NOTIFICATION
    await createNotification(
      userId,
      "Guest Updated",
      `${guest.guest_name}'s RSVP for "${invitation_title}" was updated (status: ${guest.attendance_status}, ${guest.number_of_guests} guest${guest.number_of_guests > 1 ? "s" : ""}).`
    );

    // INVALIDATE CACHES: Clear master stats and specific guest list
    await safeInvalidateCache(`rsvp_master:v1:${userId}`);
    await safeInvalidateCache(`rsvp_detail:v1:${invitationId}`);

    return NextResponse.json({ data: guest }, { status: STATUS_CODE.OK });
  } catch (err) {
    return pgErrorToResponse(err);
  }
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string; guestId: string }> }) {
  const userId = req.headers.get("x-user-id");
  if (!userId) return errorResponse(STATUS_CODE.UNAUTHORIZED, "UNAUTHORIZED", "Authentication required");

  const { id: invitationId, guestId } = await params;
  if (!UUID_RE.test(invitationId) || !UUID_RE.test(guestId)) return errorResponse(STATUS_CODE.BAD_REQUEST, "INVALID_ID", "Invalid ID");

  try {
    const [deleted] = await sql`
      DELETE FROM guests g
      USING invitations i
      WHERE g.id = ${guestId} AND g.invitation_id = i.id AND i.user_id = ${userId} AND i.id = ${invitationId}
      RETURNING g.id, g.guest_name, i.title AS invitation_title
    `;

    if (!deleted) return errorResponse(STATUS_CODE.NOT_FOUND, "NOT_FOUND", "Guest not found or access denied");

    // CREATE NOTIFICATION
    await createNotification(
      userId,
      "Guest Removed",
      `${deleted.guest_name} was removed from "${deleted.invitation_title}".`
    );

    // INVALIDATE CACHES: Clear master stats and specific guest list
    await safeInvalidateCache(`rsvp_master:v1:${userId}`);
    await safeInvalidateCache(`rsvp_detail:v1:${invitationId}`);

    return NextResponse.json({ data: { success: true } }, { status: STATUS_CODE.OK });
  } catch (err) {
    return pgErrorToResponse(err);
  }
}