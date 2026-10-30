export const instant = false;

import { NextResponse, NextRequest } from "next/server";
import { headers } from "next/headers";
import { sql } from "@/db/connections/postgres_connection";
import { getRedisClient } from "@/db/connections/redis_connection";
import { STATUS_CODE } from "@/lib/status_codes";
import { errorResponse, pgErrorToResponse } from "@/lib/api/errors";

export async function GET() {
  try {
    const h = await headers();
    const adminId = h.get("x-admin-id");
    if (!adminId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: STATUS_CODE.UNAUTHORIZED });
    }

    const cacheKey = `admin_notifications:${adminId}`;

    // 1. Try Redis Cache First (Fast Path)
    try {
      const redis = await getRedisClient();
      const cachedData = await redis.get(cacheKey);
      if (cachedData) {
        return NextResponse.json(JSON.parse(cachedData), { status: STATUS_CODE.OK });
      }
    } catch (redisErr) {
      // Redis is down? Don't crash. Just fall through to Postgres.
      console.warn("[notifications] Redis cache miss/fail:", redisErr);
    }

    // 2. Postgres (Cache Miss) - Parallel Queries for Speed
    const [notifications, countResult] = await Promise.all([
      sql`
        SELECT id, type, title, message, read_at, created_at
        FROM admin_notifications
        WHERE admin_id = ${adminId} OR admin_id IS NULL
        ORDER BY created_at DESC
        LIMIT 20
      `,
      sql`
        SELECT COUNT(*)::int AS unread_count
        FROM admin_notifications
        WHERE (admin_id = ${adminId} OR admin_id IS NULL) AND read_at IS NULL
      `
    ]);

    const payload = {
      notifications,
      unreadCount: countResult[0]?.unread_count || 0,
    };

    // 3. Save to Redis Cache (Expire in 60 seconds)
    try {
      const redis = await getRedisClient();
      await redis.setEx(cacheKey, 60, JSON.stringify(payload));
    } catch (redisErr) {
      // Non-fatal if caching fails
    }

    return NextResponse.json(payload, { status: STATUS_CODE.OK });

  } catch (error) {
    return pgErrorToResponse(error);
  }
}

export async function DELETE(req: NextRequest) {
  const adminId = req.headers.get("x-admin-id");
  if (!adminId) return errorResponse(STATUS_CODE.UNAUTHORIZED, "UNAUTHORIZED", "Missing Admin ID.");

  try {
    await sql`
      DELETE FROM admin_notifications
      WHERE admin_id = ${adminId} OR admin_id IS NULL
    `;
    return NextResponse.json({ status: "success" }, { status: STATUS_CODE.OK });
  } catch (err) {
    return pgErrorToResponse(err);
  }
}