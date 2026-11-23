// app/api/v1/user/dashboard/rsvps/route.ts
import { NextRequest, NextResponse } from "next/server";
import { sql } from "@/db/connections/postgres_connection";
import { getRedisClient } from "@/db/connections/redis_connection";
import { errorResponse, pgErrorToResponse } from "@/lib/api/errors";
import { STATUS_CODE } from "@/lib/status_codes";

const CACHE_TTL_SECONDS = 300;

export async function GET(req: NextRequest) {
  const userId = req.headers.get("x-user-id");
  if (!userId) return errorResponse(STATUS_CODE.UNAUTHORIZED, "UNAUTHORIZED", "Authentication required");

  const cacheKey = `rsvp_master:v1:${userId}`;
  let redis: Awaited<ReturnType<typeof getRedisClient>> | null = null;

  // 1. Try to read from Redis first (Extremely Fast: ~2ms)
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
    console.warn("[RSVP_CACHE] Read failed, falling back to Postgres:", e);
  }

  // 2. Cache Miss: Hit the database
  try {
    const rows = await sql`
      SELECT 
        i.id AS invitation_id,
        i.title,
        i.event_date,
        i.status AS invitation_status,
        COALESCE(COUNT(g.id), 0)::int AS total_guests,
        COALESCE(COUNT(g.id) FILTER (WHERE g.attendance_status = 'accepted'), 0)::int AS accepted,
        COALESCE(COUNT(g.id) FILTER (WHERE g.attendance_status = 'declined'), 0)::int AS declined,
        COALESCE(COUNT(g.id) FILTER (WHERE g.attendance_status = 'pending'), 0)::int AS pending,
        COALESCE(SUM(g.number_of_guests), 0)::int AS total_seats
      FROM invitations i
      LEFT JOIN guests g ON g.invitation_id = i.id
      WHERE i.user_id = ${userId}
      GROUP BY i.id
      ORDER BY i.created_at DESC
    `;

    // 3. Write to Redis (Fire-safe: never fail the request if Redis is down)
    if (redis && rows.length > 0) {
      try {
        await redis.setEx(cacheKey, CACHE_TTL_SECONDS, JSON.stringify(rows));
      } catch (e) {
        console.warn("[RSVP_CACHE] Write failed:", e);
      }
    }

    return NextResponse.json(
      { data: rows },
      { status: STATUS_CODE.OK, headers: { "X-Cache": "MISS" } }
    );
  } catch (err) {
    return pgErrorToResponse(err);
  }
}