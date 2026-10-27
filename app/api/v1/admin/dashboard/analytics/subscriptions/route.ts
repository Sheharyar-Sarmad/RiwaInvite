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
    const range = searchParams.get("range") || "7d";

    let interval = "7 days";
    if (range === "30d") interval = "30 days";
    if (range === "90d") interval = "90 days";
    if (range === "all") interval = "100 years";

    // 3. Redis Cache Check
    const CACHE_KEY = `admin:analytics:subscriptions:${range}`;
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
      console.warn("[Redis Error] Subscriptions Route:", redisError);
    }

    // 4. Parallel DB Queries
    const [
      activeCountResult, 
      planBreakdownResult, 
      timelineResult, 
      churnResult
    ] = await Promise.all([
      // A. Total Active Subscriptions (Current)
      sql`
        SELECT COUNT(id)::int AS count 
        FROM user_subscriptions 
        WHERE status = 'active' AND expires_at > NOW()
      `,
      
      // B. Plan Breakdown (Which plans are popular?)
      // Joins user_subscriptions with plans to get the actual plan name (e.g., "Gold", "Silver")
      sql`
        SELECT 
          p.name AS name, 
          COUNT(us.id)::int AS value 
        FROM user_subscriptions us
        JOIN plans p ON us.plan_id = p.id
        WHERE us.status = 'active' AND us.expires_at > NOW()
        GROUP BY p.name
        ORDER BY value DESC
      `,
      
      // C. New Subscriptions Timeline
      sql`
        SELECT 
          TO_CHAR(starts_at, 'YYYY-MM-DD') AS date, 
          COUNT(id)::int AS count 
        FROM user_subscriptions 
        WHERE starts_at >= NOW() - ${interval}::interval
        GROUP BY TO_CHAR(starts_at, 'YYYY-MM-DD')
        ORDER BY date ASC
      `,
      
      // D. Churned Subscriptions (Canceled or Expired within the date range)
      sql`
        SELECT COUNT(id)::int AS count 
        FROM user_subscriptions 
        WHERE status IN ('canceled', 'expired')
          AND updated_at >= NOW() - ${interval}::interval
      `
    ]);

    // 5. Format Payload
    const subscriptionData = {
      activeSubscriptions: activeCountResult[0]?.count || 0,
      churnedSubscriptions: churnResult[0]?.count || 0,
      planBreakdown: planBreakdownResult, // e.g., [{ name: "Premium", value: 45 }, { name: "Basic", value: 12 }]
      timeline: timelineResult,           // e.g., [{ date: "2023-10-01", count: 5 }]
      range: range,
      lastUpdated: new Date().toISOString(),
    };

    // 6. Save to Cache
    if (redis) {
      redis.setEx(CACHE_KEY, CACHE_TTL_SECONDS, JSON.stringify(subscriptionData))
        .catch((err) => console.error("[Redis Cache Set Error]:", err));
    }

    return NextResponse.json(
      { success: true, data: subscriptionData, source: "database" },
      { status: STATUS_CODE.OK }
    );

  } catch (error) {
    console.error("[Subscriptions API Error]:", error);
    return pgErrorToResponse(error);
  }
}