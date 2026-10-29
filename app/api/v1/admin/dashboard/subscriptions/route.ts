import { NextRequest, NextResponse } from "next/server";
import { sql } from "@/db/connections/postgres_connection";
import { getRedisClient } from "@/db/connections/redis_connection";
import { errorResponse, pgErrorToResponse } from "@/lib/api/errors";
import { STATUS_CODE } from "@/lib/status_codes";

export async function GET(req: NextRequest) {
  const searchParams = req.nextUrl.searchParams;
  const page = Number(searchParams.get("page")) || 1;
  const limit = Number(searchParams.get("limit")) || 10;
  const search = searchParams.get("search") || "";
  const status = searchParams.get("status") || "all";

  const offset = (page - 1) * limit;
  const cacheKey = `subs:admin:${page}:${limit}:${search}:${status}`;

  let redis;
  let cachedData = null;
  try {
    redis = await getRedisClient();
    cachedData = await redis.get(cacheKey);
  } catch (e) {
    console.warn("[Redis] Failed to fetch cache, falling back to Postgres:", e);
  }

  if (cachedData) {
    return NextResponse.json(JSON.parse(cachedData), { status: STATUS_CODE.OK });
  }

  try {
    // Build dynamic WHERE clause safely
    let whereClause = sql`1=1`;
    if (status !== "all") {
      whereClause = sql`${whereClause} AND us.status = ${status}`;
    }
    if (search) {
      const searchPattern = `%${search}%`;
      whereClause = sql`${whereClause} AND (
        u.email ILIKE ${searchPattern} OR 
        u.first_name ILIKE ${searchPattern} OR 
        u.last_name ILIKE ${searchPattern} OR
        p.name ILIKE ${searchPattern}
      )`;
    }

    const [rows, countRows] = await Promise.all([
      sql`
        SELECT 
          us.id, us.status, us.starts_at, us.expires_at, us.provider, us.provider_sub_id,
          u.id as user_id, u.first_name, u.last_name, u.email,
          p.id as plan_id, p.name as plan_name, p.price as plan_price
        FROM user_subscriptions us
        JOIN users u ON us.user_id = u.id
        JOIN plans p ON us.plan_id = p.id
        WHERE ${whereClause}
        ORDER BY us.created_at DESC
        LIMIT ${limit} OFFSET ${offset}
      `,
      sql`
        SELECT COUNT(*)::int AS total 
        FROM user_subscriptions us
        JOIN users u ON us.user_id = u.id
        JOIN plans p ON us.plan_id = p.id
        WHERE ${whereClause}
      `
    ]);

    const total = countRows[0].total;
    const responseData = {
      data: rows,
      meta: { page, limit, total, total_pages: Math.ceil(total / limit) },
    };

    if (redis) {
      await redis.setEx(cacheKey, 300, JSON.stringify(responseData));
    }

    return NextResponse.json(responseData, { status: STATUS_CODE.OK });
  } catch (err) {
    return pgErrorToResponse(err);
  }
}