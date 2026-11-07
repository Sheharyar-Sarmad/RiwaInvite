import { NextRequest, NextResponse } from "next/server";
import { sql } from "@/db/connections/postgres_connection";
import { getRedisClient } from "@/db/connections/redis_connection";
import { errorResponse, pgErrorToResponse } from "@/lib/api/errors";
import { STATUS_CODE } from "@/lib/status_codes";
import { z } from "zod";

const ListPaymentLogsQuerySchema = z.object({
  page: z.coerce.number().min(1).default(1),
  limit: z.coerce.number().min(1).max(100).default(20),
  search: z.string().optional(),
  status: z.enum(["all", "received", "processed", "failed"]).default("all"),
  provider: z.string().default("all"),
});

export async function GET(req: NextRequest) {
  // 1. Admin Authentication Check (Injected by proxy.ts)
  const adminId = req.headers.get("x-admin-id");
  if (!adminId) {
    return errorResponse(STATUS_CODE.UNAUTHORIZED, "UNAUTHORIZED", "Missing Admin ID");
  }

  // 2. Validate Query Params
  const parsed = ListPaymentLogsQuerySchema.safeParse(
    Object.fromEntries(req.nextUrl.searchParams)
  );
  
  if (!parsed.success) {
    return errorResponse(STATUS_CODE.BAD_REQUEST, "VALIDATION_ERROR", "Invalid query.", parsed.error.issues);
  }

  const { page, limit, search, status, provider } = parsed.data;
  const offset = (page - 1) * limit;

  // 3. Setup Redis Cache
  let redis;
  let cachedData = null;
  let version = "1";

  // Unique cache key for this specific query
  const cacheKey = `admin:payment_logs:v${version}:p${page}:l${limit}:s${search || "none"}:st${status}:pr${provider}`;

  try {
    redis = await getRedisClient();
    // Bumping the version key here is optional, but good practice if you need to invalidate all logs at once.
    version = (await redis.get("payment_logs:version")) || "1";
    
    cachedData = await redis.get(cacheKey);
    if (cachedData) {
      return NextResponse.json(JSON.parse(cachedData), { status: STATUS_CODE.OK });
    }
  } catch (e) {
    console.warn("[Redis] Failed to fetch cache, falling back to Postgres:", e);
  }

  // 4. Build Dynamic SQL Query
  let whereClause = sql`1=1`;
  
  if (status !== "all") {
    whereClause = sql`${whereClause} AND status = ${status}`;
  }
  if (provider !== "all") {
    whereClause = sql`${whereClause} AND provider = ${provider}`;
  }
  if (search) {
    const searchPattern = `%${search}%`;
    whereClause = sql`${whereClause} AND (
      event_id ILIKE ${searchPattern} OR 
      error_message ILIKE ${searchPattern}
    )`;
  }

  try {
    // 5. Execute Queries on PostgreSQL
    const [rows, countRows] = await Promise.all([
      sql`
        SELECT 
          id, 
          provider, 
          event_id, 
          payload, 
          status, 
          error_message, 
          created_at
        FROM payment_logs
        WHERE ${whereClause}
        ORDER BY created_at DESC
        LIMIT ${limit} OFFSET ${offset}
      `,
      sql`
        SELECT COUNT(*)::int AS total 
        FROM payment_logs
        WHERE ${whereClause}
      `
    ]);

    const total = countRows[0].total;
    
    const responseData = {
      data: rows.map(row => ({
        ...row,
        created_at: row.created_at?.toISOString?.() ?? row.created_at,
      })),
      meta: { 
        page, 
        limit, 
        total, 
        total_pages: Math.ceil(total / limit) 
      },
    };

    // 6. Save to Redis Cache (30 seconds)
    // 30s is the perfect sweet spot for an admin panel: 
    // - Data stays fresh enough to feel real-time.
    // - If an admin refreshes the page 20 times in a minute, only 2 queries hit the DB.
    if (redis) {
      try {
        await redis.setEx(cacheKey, 30, JSON.stringify(responseData));
      } catch (e) {
        console.warn("[Redis] Failed to save cache:", e);
      }
    }

    return NextResponse.json(responseData, { 
      status: STATUS_CODE.OK,
      headers: {
        // Ensures the browser doesn't cache it, so it always hits the Next.js SSR route
        "Cache-Control": "no-store, no-cache, must-revalidate, proxy-revalidate",
      }
    });

  } catch (err) {
    return pgErrorToResponse(err);
  }
}