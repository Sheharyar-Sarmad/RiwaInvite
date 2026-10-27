export const instant = false;

import { NextResponse } from "next/server";
import { headers } from "next/headers";
import { sql } from "@/db/connections/postgres_connection";
import { getRedisClient } from "@/db/connections/redis_connection";
import { STATUS_CODE } from "@/lib/status_codes";
import { pgErrorToResponse } from "@/lib/api/errors";

export async function PATCH(request: Request) {
  try {
    const h = await headers();
    const adminId = h.get("x-admin-id");
    
    // The proxy already verified the session, this is just a fail-safe
    if (!adminId) {
      return NextResponse.json(
        { error: "Unauthorized" }, 
        { status: STATUS_CODE.UNAUTHORIZED }
      );
    }

    const body = await request.json();
    const { id, all } = body;

    if (all) {
      // Mark ALL as read for this admin (and broadcasts)
      await sql`
        UPDATE admin_notifications
        SET read_at = CURRENT_TIMESTAMP
        WHERE (admin_id = ${adminId} OR admin_id IS NULL) 
          AND read_at IS NULL
      `;
    } else if (id) {
      // Mark ONE as read
      await sql`
        UPDATE admin_notifications
        SET read_at = CURRENT_TIMESTAMP
        WHERE id = ${id} 
          AND (admin_id = ${adminId} OR admin_id IS NULL)
      `;
    } else {
      return NextResponse.json(
        { error: "Missing id or 'all' parameter" }, 
        { status: STATUS_CODE.BAD_REQUEST }
      );
    }

    // CRITICAL: Invalidate the Redis cache so the next GET request fetches fresh data
    try {
      const redis = await getRedisClient();
      await redis.del(`admin_notifications:${adminId}`);
    } catch (redisErr) {
      // Redis down? It's non-fatal. The DB is already updated. Cache will expire naturally in 60s.
      console.warn("[notifications] Failed to clear cache:", redisErr);
    }

    return NextResponse.json({ status: "success" }, { status: STATUS_CODE.OK });
    
  } catch (error) {
    return pgErrorToResponse(error);
  }
}