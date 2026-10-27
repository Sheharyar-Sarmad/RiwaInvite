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
    const CACHE_KEY = `admin:analytics:invitations:${range}`;
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
      console.warn("[Redis Error] Invitations Route:", redisError);
    }

    // 4. Parallel DB Queries
    const [totalResult, statusBreakdownResult, timelineResult] = await Promise.all([
      // A. Total Invitations created within the range
      sql`
        SELECT COUNT(id)::int AS count 
        FROM invitations 
        WHERE created_at >= NOW() - ${interval}::interval
      `,
      
      // B. Status Breakdown (Draft, Published, Expired, Archived)
      sql`
        SELECT 
          status AS name, 
          COUNT(id)::int AS value 
        FROM invitations 
        WHERE created_at >= NOW() - ${interval}::interval
        GROUP BY status
        ORDER BY value DESC
      `,
      
      // C. Creation Timeline (For Area/Line Chart)
      sql`
        SELECT 
          TO_CHAR(created_at, 'YYYY-MM-DD') AS date, 
          COUNT(id)::int AS count 
        FROM invitations 
        WHERE created_at >= NOW() - ${interval}::interval
        GROUP BY TO_CHAR(created_at, 'YYYY-MM-DD')
        ORDER BY date ASC
      `
    ]);

    // 5. Format Payload
    const invitationData = {
      totalInvitations: totalResult[0]?.count || 0,
      statusBreakdown: statusBreakdownResult, // e.g., [{ name: 'published', value: 150 }, { name: 'draft', value: 40 }]
      timeline: timelineResult,               // e.g., [{ date: '2023-10-01', count: 25 }]
      range: range,
      lastUpdated: new Date().toISOString(),
    };

    // 6. Save to Cache
    if (redis) {
      redis.setEx(CACHE_KEY, CACHE_TTL_SECONDS, JSON.stringify(invitationData))
        .catch((err) => console.error("[Redis Cache Set Error]:", err));
    }

    return NextResponse.json(
      { success: true, data: invitationData, source: "database" },
      { status: STATUS_CODE.OK }
    );

  } catch (error) {
    console.error("[Invitations API Error]:", error);
    return pgErrorToResponse(error);
  }
}