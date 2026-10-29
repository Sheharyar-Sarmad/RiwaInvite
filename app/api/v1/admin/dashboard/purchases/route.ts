import { NextRequest, NextResponse } from "next/server";
import { sql } from "@/db/connections/postgres_connection";
import { getRedisClient } from "@/db/connections/redis_connection";
import { errorResponse, pgErrorToResponse } from "@/lib/api/errors";
import { STATUS_CODE } from "@/lib/status_codes";
import { z } from "zod";

const ListPurchasesQuerySchema = z.object({
  page: z.coerce.number().min(1).default(1),
  limit: z.coerce.number().min(1).max(100).default(10),
  search: z.string().optional(),
});

export async function GET(req: NextRequest) {
  const parsed = ListPurchasesQuerySchema.safeParse(
    Object.fromEntries(req.nextUrl.searchParams)
  );
  
  if (!parsed.success) {
    return errorResponse(STATUS_CODE.BAD_REQUEST, "VALIDATION_ERROR", "Invalid query.", parsed.error.issues);
  }

  const { page, limit, search } = parsed.data;

  let redis;
  let version = "1";
  let cachedData = null;

  try {
    redis = await getRedisClient();
    // 1. Fetch the current global version for purchases
    version = (await redis.get("purchases:version")) || "1";
    
    // 2. Build the cache key using the version
    const cacheKey = `purchases:v${version}:${page}:${limit}:${search || "none"}`;
    cachedData = await redis.get(cacheKey);
    
    if (cachedData) {
      return NextResponse.json(JSON.parse(cachedData), { status: STATUS_CODE.OK });
    }
  } catch (e) {
    console.warn("[Redis] Failed to fetch cache, falling back to Postgres:", e);
  }

  const offset = (page - 1) * limit;
  
  let whereClause = sql`1=1`;
  if (search) {
    const searchPattern = `%${search}%`;
    whereClause = sql`${whereClause} AND (
      u.email ILIKE ${searchPattern} OR 
      u.first_name ILIKE ${searchPattern} OR 
      u.last_name ILIKE ${searchPattern} OR
      t.name ILIKE ${searchPattern}
    )`;
  }

  try {
    const [rows, countRows] = await Promise.all([
      sql`
        SELECT 
          tp.id, tp.price_paid, tp.purchased_at,
          u.id as user_id, u.first_name, u.last_name, u.email,
          t.id as template_id, t.name as template_name, t.thumbnail_url
        FROM template_purchases tp
        JOIN users u ON tp.user_id = u.id
        JOIN templates t ON tp.template_id = t.id
        WHERE ${whereClause}
        ORDER BY tp.purchased_at DESC
        LIMIT ${limit} OFFSET ${offset}
      `,
      sql`
        SELECT COUNT(*)::int AS total 
        FROM template_purchases tp
        JOIN users u ON tp.user_id = u.id
        JOIN templates t ON tp.template_id = t.id
        WHERE ${whereClause}
      `
    ]);

    const total = countRows[0].total;
    
    const responseData = {
      data: rows.map(row => ({
        ...row,
        price_paid: Number(row.price_paid),
        purchased_at: row.purchased_at?.toISOString?.() ?? row.purchased_at,
      })),
      meta: { page, limit, total, total_pages: Math.ceil(total / limit) },
    };

    if (redis) {
      try {
        // 3. Save with the versioned key
        const cacheKey = `purchases:v${version}:${page}:${limit}:${search || "none"}`;
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