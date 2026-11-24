// app/api/v1/user/dashboard/rsvps/[id]/route.ts
import { NextRequest, NextResponse } from "next/server";
import { sql } from "@/db/connections/postgres_connection";
import { getRedisClient } from "@/db/connections/redis_connection";
import { errorResponse, pgErrorToResponse } from "@/lib/api/errors";
import { STATUS_CODE } from "@/lib/status_codes";
import { safeInvalidateCache } from "@/lib/api/helpers";

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const CACHE_TTL_SECONDS = 300;

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

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const userId = req.headers.get("x-user-id");
  if (!userId) return errorResponse(STATUS_CODE.UNAUTHORIZED, "UNAUTHORIZED", "Authentication required");

  const { id: invitationId } = await params;
  if (!UUID_RE.test(invitationId)) return errorResponse(STATUS_CODE.BAD_REQUEST, "INVALID_ID", "Invalid ID");

  const cacheKey = `rsvp_detail:v1:${invitationId}`;
  let redis: Awaited<ReturnType<typeof getRedisClient>> | null = null;

  // 1. Try Redis
  try {
    redis = await getRedisClient();
    const cached = await redis.get(cacheKey);
    if (cached) {
      return NextResponse.json(
        { data: JSON.parse(cached) },
        { status: STATUS_CODE.OK, headers: { "X-Cache": "HIT" } }
      );
    }
  } catch (e) {
    console.warn("[RSVP_DETAIL_CACHE] Read failed:", e);
  }

  // 2. Fallback to Postgres
  try {
    // Verify ownership
    const [inv] = await sql`SELECT id, title, event_date FROM invitations WHERE id = ${invitationId} AND user_id = ${userId} LIMIT 1`;
    if (!inv) return errorResponse(STATUS_CODE.NOT_FOUND, "NOT_FOUND", "Invitation not found");

    const guests = await sql`
      SELECT id, guest_name, attendance_status, number_of_guests, comment, created_at
      FROM guests
      WHERE invitation_id = ${invitationId}
      ORDER BY created_at DESC
    `;

    const payload = { invitation: inv, guests };

    // 3. Write to Redis safely
    if (redis) {
      try {
        await redis.setEx(cacheKey, CACHE_TTL_SECONDS, JSON.stringify(payload));
      } catch (e) {
        console.warn("[RSVP_DETAIL_CACHE] Write failed:", e);
      }
    }

    return NextResponse.json(
      { data: payload },
      { status: STATUS_CODE.OK, headers: { "X-Cache": "MISS" } }
    );
  } catch (err) {
    return pgErrorToResponse(err);
  }
}

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const userId = req.headers.get("x-user-id");
  if (!userId) return errorResponse(STATUS_CODE.UNAUTHORIZED, "UNAUTHORIZED", "Authentication required");

  const { id: invitationId } = await params;
  if (!UUID_RE.test(invitationId)) return errorResponse(STATUS_CODE.BAD_REQUEST, "INVALID_ID", "Invalid ID");

  try {
    const body = await req.json().catch(() => null);
    const guestName = typeof body?.guest_name === "string" ? body.guest_name.trim() : "";
    const status = ["pending", "accepted", "declined"].includes(body?.attendance_status) ? body.attendance_status : "pending";
    const plusOnes = Math.max(1, parseInt(body?.number_of_guests) || 1);
    const comment = typeof body?.comment === "string" ? body.comment.trim() : "";

    if (!guestName) return errorResponse(STATUS_CODE.BAD_REQUEST, "INVALID_NAME", "Guest name is required");

    // Verify ownership before inserting (also fetch title for the notification)
    const [inv] = await sql`SELECT id, title FROM invitations WHERE id = ${invitationId} AND user_id = ${userId} LIMIT 1`;
    if (!inv) return errorResponse(STATUS_CODE.NOT_FOUND, "NOT_FOUND", "Invitation not found");

    const [guest] = await sql`
      INSERT INTO guests (invitation_id, guest_name, attendance_status, number_of_guests, comment)
      VALUES (${invitationId}, ${guestName}, ${status}, ${plusOnes}, ${comment})
      RETURNING id, guest_name, attendance_status, number_of_guests, comment, created_at
    `;

    // CREATE NOTIFICATION
    await createNotification(
      userId,
      "New Guest Added",
      `${guestName} was added to "${inv.title}" with status "${status}" (${plusOnes} guest${plusOnes > 1 ? "s" : ""}).`
    );

    // INVALIDATE BOTH CACHES
    // 1. Clear the master dashboard cache (updates the totals)
    await safeInvalidateCache(`rsvp_master:v1:${userId}`);
    // 2. Clear the specific guest list cache (shows the new guest immediately)
    await safeInvalidateCache(`rsvp_detail:v1:${invitationId}`);

    return NextResponse.json({ data: guest }, { status: STATUS_CODE.CREATED });
  } catch (err) {
    return pgErrorToResponse(err);
  }
}