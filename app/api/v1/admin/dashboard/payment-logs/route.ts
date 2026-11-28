import { NextRequest, NextResponse } from "next/server";
import { sql } from "@/db/connections/postgres_connection";
import { getRedisClient } from "@/db/connections/redis_connection";
import { errorResponse, pgErrorToResponse } from "@/lib/api/errors";
import { STATUS_CODE } from "@/lib/status_codes";
import { z } from "zod";

const ListPaymentLogsQuerySchema = z.object({
  page: z.coerce.number().min(1).default(1),
  limit: z.coerce.number().min(1).max(100).default(20),
  search: z.string().trim().max(100).optional(),
  status: z.enum(["all", "received", "processed", "failed"]).default("all"),
  provider: z.string().max(20).default("all"),
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

  // 3. Redis cache (search requests are never cached: unbounded keys)
  const useCache = !search;
  let redis: Awaited<ReturnType<typeof getRedisClient>> | null = null;
  let cacheKey: string | null = null;

  if (useCache) {
    try {
      redis = await getRedisClient();
      const version = (await redis.get("payment_logs:version")) || "1";
      cacheKey = `admin:payment_logs:v${version}:p${page}:l${limit}:st${status}:pr${provider}`;
      const cachedData = await redis.get(cacheKey);
      if (cachedData) {
        return NextResponse.json(JSON.parse(cachedData), { status: STATUS_CODE.OK });
      }
    } catch (e) {
      console.warn("[Redis] Failed to fetch cache, falling back to Postgres:", e);
      redis = null;
      cacheKey = null;
    }
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
    const searchPattern = `%${search.replace(/[\\%_]/g, "\\$&")}%`;
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
        ORDER BY created_at DESC, id DESC
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
    if (redis && cacheKey) {
      try {
        await redis.setEx(cacheKey, 30, JSON.stringify(responseData));
      } catch (e) {
        console.warn("[Redis] Failed to save cache:", e);
      }
    }

    return NextResponse.json(responseData, { 
      status: STATUS_CODE.OK,
      headers: {
        "Cache-Control": "no-store, no-cache, must-revalidate, proxy-revalidate",
      }
    });

  } catch (err) {
    return pgErrorToResponse(err);
  }
}