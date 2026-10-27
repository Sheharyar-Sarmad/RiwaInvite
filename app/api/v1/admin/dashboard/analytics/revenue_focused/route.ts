import { NextRequest, NextResponse } from "next/server";
import { sql } from "@/db/connections/postgres_connection";
import { getRedisClient } from "@/db/connections/redis_connection";
import { STATUS_CODE } from "@/lib/status_codes";
import { pgErrorToResponse } from "@/lib/api/errors";

// Next.js 16: Blocking route
export const instant = false;

export async function GET(req: NextRequest) {
  try {
    // 1. Auth via Proxy Headers
    const adminId = req.headers.get("x-admin-id");
    if (!adminId) {
      return NextResponse.json(
        { error: "Unauthorized access" },
        { status: STATUS_CODE.UNAUTHORIZED }
      );
    }

    // 2. Parse Query Params
    const searchParams = req.nextUrl.searchParams;
    const range = searchParams.get("range") || "7d"; // default to 7d

    let interval = "7 days";
    if (range === "30d") interval = "30 days";
    if (range === "90d") interval = "90 days";
    if (range === "all") interval = "100 years";

    // 3. Redis Cache
    const CACHE_KEY = `admin:analytics:revenue:${range}`;
    const CACHE_TTL_SECONDS = 600; // Cache for 10 mins (financial data doesn't change by the second)

    let redis;
    try {
      redis = await getRedisClient();
      const cachedData = await redis.get(CACHE_KEY);
      if (cachedData) {
        return NextResponse.json(
          { success: true, data: JSON.parse(cachedData), source: "cache" },
          { status: STATUS_CODE.OK }
        );
      }
    } catch (redisError) {
      console.warn("[Redis Error] Revenue Route:", redisError);
    }

    // 4. Parallel DB Queries
    const [totalRevenueResult, breakdownResult, timelineResult] = await Promise.all([
      // A. Total Revenue within range
      sql`
        SELECT COALESCE(SUM(amount), 0)::float AS total 
        FROM orders 
        WHERE status = 'completed' 
          AND created_at >= NOW() - ${interval}::interval
      `,
      
      // B. Revenue Breakdown by Order Type (for Pie/Bar Chart)
      sql`
        SELECT 
          order_type AS name, 
          COALESCE(SUM(amount), 0)::float AS value 
        FROM orders 
        WHERE status = 'completed' 
          AND created_at >= NOW() - ${interval}::interval
        GROUP BY order_type
        ORDER BY value DESC
      `,
      
      // C. Revenue Over Time (for Line/Area Chart)
      sql`
        SELECT 
          TO_CHAR(created_at, 'YYYY-MM-DD') AS date, 
          COALESCE(SUM(amount), 0)::float AS revenue 
        FROM orders 
        WHERE status = 'completed' 
          AND created_at >= NOW() - ${interval}::interval
        GROUP BY TO_CHAR(created_at, 'YYYY-MM-DD')
        ORDER BY date ASC
      `
    ]);

    // 5. Format Payload for Recharts
    const revenueData = {
      totalRevenue: totalRevenueResult[0]?.total || 0,
      breakdownChart: breakdownResult, // e.g., [{ name: "subscription", value: 15000 }, ...]
      timelineChart: timelineResult,   // e.g., [{ date: "2023-10-01", revenue: 2500 }, ...]
      range: range,
      lastUpdated: new Date().toISOString(),
    };

    // 6. Save to Cache
    if (redis) {
      redis.setEx(CACHE_KEY, CACHE_TTL_SECONDS, JSON.stringify(revenueData))
        .catch((err) => console.error("[Redis Cache Set Error]:", err));
    }

    return NextResponse.json(
      { success: true, data: revenueData, source: "database" },
      { status: STATUS_CODE.OK }
    );

  } catch (error) {
    console.error("[Revenue API Error]:", error);
    return pgErrorToResponse(error);
  }
}