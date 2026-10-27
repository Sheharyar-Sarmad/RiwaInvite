import { NextRequest, NextResponse } from "next/server";
import { sql } from "@/db/connections/postgres_connection";
import { getRedisClient } from "@/db/connections/redis_connection";
import { STATUS_CODE } from "@/lib/status_codes";
import { pgErrorToResponse } from "@/lib/api/errors";

// Next.js 16: Blocking route
export const instant = false;

const CACHE_KEY = "admin:analytics:overall_business";
const CACHE_TTL_SECONDS = 300; // 5 minutes

export async function GET(req: NextRequest) {
  try {
    // 1. Authentication via Proxy Headers
    const adminId = req.headers.get("x-admin-id");
    if (!adminId) {
      return NextResponse.json(
        { error: "Unauthorized access" },
        { status: STATUS_CODE.UNAUTHORIZED }
      );
    }

    // 2. Try fetching from Redis Cache
    let redis;
    try {
      redis = await getRedisClient();
      const cachedData = await redis.get(CACHE_KEY);
      
      if (cachedData) {
        // Cache Hit! Returns in ~10-20ms
        return NextResponse.json(
          { success: true, data: JSON.parse(cachedData), source: "cache" },
          { status: STATUS_CODE.OK }
        );
      }
    } catch (redisError) {
      // We log the error but do NOT fail the request if Redis goes down.
      console.warn("[Redis Error] Overall Business Route:", redisError);
    }

    // 3. Cache Miss: Run optimized parallel SQL queries
    // We use Promise.all to drastically reduce response time.
    const [usersResult, subsResult, revenueResult, invitesResult] = await Promise.all([
      // Total Standard Users
      sql`SELECT COUNT(id)::int AS count FROM users`,
      
      // Active Subscriptions
      sql`
        SELECT COUNT(id)::int AS count 
        FROM user_subscriptions 
        WHERE status = 'active' AND expires_at > NOW()
      `,
      
      // Top-Level Revenue (Completed Orders)
      sql`
        SELECT COALESCE(SUM(amount), 0)::float AS total 
        FROM orders 
        WHERE status = 'completed'
      `,
      
      // Total Invitations
      sql`SELECT COUNT(id)::int AS count FROM invitations`
    ]);

    // 4. Format Payload
    const overallData = {
      totalUsers: usersResult[0]?.count || 0,
      activeSubscriptions: subsResult[0]?.count || 0,
      totalRevenue: revenueResult[0]?.total || 0,
      totalInvitations: invitesResult[0]?.count || 0,
      lastUpdated: new Date().toISOString(),
    };

    // 5. Save to Redis Cache (Fire and forget, don't block response)
    if (redis) {
      redis.setEx(CACHE_KEY, CACHE_TTL_SECONDS, JSON.stringify(overallData))
        .catch((err) => console.error("[Redis Cache Set Error]:", err));
    }

    // 6. Return fresh data
    return NextResponse.json(
      { success: true, data: overallData, source: "database" },
      { status: STATUS_CODE.OK }
    );

  } catch (error) {
    console.error("[Overall Business API Error]:", error);
    return pgErrorToResponse(error);
  }
}