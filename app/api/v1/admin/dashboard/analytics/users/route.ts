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

    // 2. Parse & Validate Query Params
    const searchParams = req.nextUrl.searchParams;
    const range = searchParams.get("range") || "7d"; // default to 7d

    // Calculate the Postgres Interval based on the range
    let interval = "7 days";
    if (range === "30d") interval = "30 days";
    if (range === "90d") interval = "90 days";
    if (range === "all") interval = "100 years"; // effectively all time

    // 3. Redis Cache Check
    const CACHE_KEY = `admin:analytics:users:${range}`;
    const CACHE_TTL_SECONDS = 300; // 5 minutes

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
      console.warn("[Redis Error] Users Route:", redisError);
    }

    // 4. Parallel DB Queries
    const [totalUsersResult, newUsersResult, activeUsersResult, growthChartResult] = await Promise.all([
      // Total Users (All Time)
      sql`SELECT COUNT(id)::int AS count FROM users`,

      // New Users within the selected range
      sql`
        SELECT COUNT(id)::int AS count 
        FROM users 
        WHERE created_at >= NOW() - ${interval}::interval
      `,

      // Active Users (Users with a valid, non-revoked session right now)
      sql`
        SELECT COUNT(DISTINCT user_id)::int AS count 
        FROM user_sessions 
        WHERE expires_at > NOW() AND revoked_at IS NULL
      `,

      // User Growth Chart (Grouped by Date)
      sql`
        SELECT 
          TO_CHAR(created_at, 'YYYY-MM-DD') AS date, 
          COUNT(id)::int AS count 
        FROM users 
        WHERE created_at >= NOW() - ${interval}::interval
        GROUP BY TO_CHAR(created_at, 'YYYY-MM-DD')
        ORDER BY date ASC
      `
    ]);

    // 5. Format Payload
    const userData = {
      totalUsers: totalUsersResult[0]?.count || 0,
      newUsers: newUsersResult[0]?.count || 0,
      activeUsers: activeUsersResult[0]?.count || 0,
      growthChart: growthChartResult, // Array of { date, count }
      range: range,
      lastUpdated: new Date().toISOString(),
    };

    // 6. Save to Cache
    if (redis) {
      redis.setEx(CACHE_KEY, CACHE_TTL_SECONDS, JSON.stringify(userData))
        .catch((err) => console.error("[Redis Cache Set Error]:", err));
    }

    return NextResponse.json(
      { success: true, data: userData, source: "database" },
      { status: STATUS_CODE.OK }
    );

  } catch (error) {
    console.error("[Users API Error]:", error);
    return pgErrorToResponse(error);
  }
}