import { NextRequest, NextResponse } from "next/server";
import { sql } from "@/db/connections/postgres_connection";
import { getRedisClient } from "@/db/connections/redis_connection";
import { errorResponse, pgErrorToResponse } from "@/lib/api/errors";
import { STATUS_CODE } from "@/lib/status_codes";
import { z } from "zod";

const ListOrdersQuerySchema = z.object({
  page: z.coerce.number().min(1).default(1),
  limit: z.coerce.number().min(1).max(100).default(10),
  search: z.string().optional(),
  status: z.enum(["all", "pending", "completed", "failed"]).default("all"),
});

export async function GET(req: NextRequest) {
  const parsed = ListOrdersQuerySchema.safeParse(
    Object.fromEntries(req.nextUrl.searchParams)
  );
  
  if (!parsed.success) {
    return errorResponse(STATUS_CODE.BAD_REQUEST, "VALIDATION_ERROR", "Invalid query.", parsed.error.issues);
  }

  const { page, limit, search, status } = parsed.data;
  const cacheKey = `orders:admin:${page}:${limit}:${search || "none"}:${status}`;

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

  const offset = (page - 1) * limit;
  
  // Build dynamic WHERE clause safely
  let whereClause = sql`1=1`;
  if (status !== "all") {
    whereClause = sql`${whereClause} AND o.status = ${status}`;
  }
  if (search) {
    const searchPattern = `%${search}%`;
    whereClause = sql`${whereClause} AND (
      u.email ILIKE ${searchPattern} OR 
      u.first_name ILIKE ${searchPattern} OR 
      u.last_name ILIKE ${searchPattern} OR
      o.provider_order_id ILIKE ${searchPattern}
    )`;
  }

  try {
    const [rows, countRows] = await Promise.all([
      sql`
        SELECT 
          o.id, o.provider, o.provider_order_id, o.amount, o.order_type, o.status, o.created_at,
          u.id as user_id, u.first_name, u.last_name, u.email
        FROM orders o
        JOIN users u ON o.user_id = u.id
        WHERE ${whereClause}
        ORDER BY o.created_at DESC
        LIMIT ${limit} OFFSET ${offset}
      `,
      sql`
        SELECT COUNT(*)::int AS total 
        FROM orders o
        JOIN users u ON o.user_id = u.id
        WHERE ${whereClause}
      `
    ]);

    const total = countRows[0].total;
    
    const responseData = {
      data: rows.map(row => ({
        ...row,
        amount: Number(row.amount),
        created_at: row.created_at?.toISOString?.() ?? row.created_at,
      })),
      meta: { page, limit, total, total_pages: Math.ceil(total / limit) },
    };

    if (redis) {
      try {
        await redis.setEx(cacheKey, 300, JSON.stringify(responseData));
      } catch (e) {
        console.warn("[Redis] Failed to save cache:", e);
      }
    }

    return NextResponse.json(responseData, { status: STATUS_CODE.OK });
  } catch (err) {
    return pgErrorToResponse(err);
  }
}