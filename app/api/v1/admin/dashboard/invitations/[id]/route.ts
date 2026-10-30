import { NextRequest, NextResponse } from "next/server";
import { sql } from "@/db/connections/postgres_connection";
import { getRedisClient } from "@/db/connections/redis_connection";
import { errorResponse, pgErrorToResponse } from "@/lib/api/errors";
import { STATUS_CODE } from "@/lib/status_codes";

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
type Params = { params: Promise<{ id: string }> };

export async function GET(req: NextRequest, { params }: Params) {
  const adminId = req.headers.get("x-admin-id");
  if (!adminId) {
    return errorResponse(
      STATUS_CODE.UNAUTHORIZED,
      "UNAUTHORIZED",
      "Missing Admin ID.",
    );
  }

  const { id } = await params;

  if (!UUID_RE.test(id)) {
    return errorResponse(
      STATUS_CODE.BAD_REQUEST,
      "INVALID_ID",
      "Invalid invitation id.",
    );
  }

  const cacheKey = `admin:invitation:${id}`;

  let redis;
  let cachedData = null;

  try {
    redis = await getRedisClient();

    const redisPromise = redis.get(cacheKey);
    const timeoutPromise = new Promise((_, reject) =>
      setTimeout(() => reject(new Error("Redis timeout")), 500),
    );

    cachedData = (await Promise.race([redisPromise, timeoutPromise])) as
      | string
      | null;
  } catch (e) {
    console.warn("[Redis] Cache miss or timeout, falling back to Postgres");
  }

  if (cachedData) {
    return NextResponse.json(JSON.parse(cachedData), {
      status: STATUS_CODE.OK,
    });
  }

  try {
    const [invitation] = await sql`
      SELECT 
        i.id, i.title, i.event_date, i.event_time, i.venue_details, 
        i.design_schema, i.selected_music_url, i.status, i.expires_at, 
        i.is_custom_slug, i.slug, i.created_at,
        u.first_name as user_first_name, u.last_name as user_last_name, u.email as user_email,
        t.name as template_name, t.thumbnail_url as template_thumbnail
      FROM invitations i
      JOIN users u ON i.user_id = u.id
      LEFT JOIN templates t ON i.template_id = t.id
      WHERE i.id = ${id}
      LIMIT 1
    `;

    if (!invitation) {
      return errorResponse(
        STATUS_CODE.NOT_FOUND,
        "NOT_FOUND",
        "Invitation not found.",
      );
    }

    const responseData = { data: invitation };

    if (redis) {
      try {
        // Don't await the cache save. Fire and forget so it doesn't block the response.
        redis
          .setEx(cacheKey, 60, JSON.stringify(responseData))
          .catch((e) => console.warn("[Redis] Failed to save cache:", e));
      } catch (e) {}
    }

    return NextResponse.json(responseData, { status: STATUS_CODE.OK });
  } catch (err) {
    return pgErrorToResponse(err);
  }
}
