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
    const CACHE_KEY = `admin:analytics:templates:${range}`;
    const CACHE_TTL_SECONDS = 600; // 10 minutes (templates don't change as rapidly as orders)

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
      console.warn("[Redis Error] Templates Route:", redisError);
    }

    // 4. Parallel DB Queries
    const [
      overviewResult, 
      statusBreakdownResult, 
      topTemplatesResult, 
      timelineResult
    ] = await Promise.all([
      // A. Total, Premium, and Simple counts (All time)
      sql`
        SELECT 
          COUNT(id)::int AS total,
          COUNT(id) FILTER (WHERE is_premium = TRUE)::int AS premium_count,
          COUNT(id) FILTER (WHERE is_premium = FALSE)::int AS simple_count
        FROM templates
      `,
      
      // B. Status Breakdown (draft, published, archived)
      sql`
        SELECT 
          status AS name, 
          COUNT(id)::int AS value 
        FROM templates 
        GROUP BY status
        ORDER BY value DESC
      `,
      
      // C. Top 5 Most Popular Templates (By Invitation Usage)
      // Joins templates with invitations to see which template users actually pick
      sql`
        SELECT 
          t.name AS name, 
          COUNT(i.id)::int AS value 
        FROM templates t
        JOIN invitations i ON i.template_id = t.id
        GROUP BY t.id, t.name
        ORDER BY value DESC
        LIMIT 5
      `,
      
      // D. Template Creation Timeline (For Area Chart)
      sql`
        SELECT 
          TO_CHAR(created_at, 'YYYY-MM-DD') AS date, 
          COUNT(id)::int AS count 
        FROM templates 
        WHERE created_at >= NOW() - ${interval}::interval
        GROUP BY TO_CHAR(created_at, 'YYYY-MM-DD')
        ORDER BY date ASC
      `
    ]);

    // 5. Format Payload
    const templateData = {
      totalTemplates: overviewResult[0]?.total || 0,
      premiumTemplates: overviewResult[0]?.premium_count || 0,
      simpleTemplates: overviewResult[0]?.simple_count || 0,
      statusBreakdown: statusBreakdownResult, // e.g., [{ name: 'published', value: 15 }, { name: 'draft', value: 3 }]
      topTemplates: topTemplatesResult,       // e.g., [{ name: 'Royal Wedding', value: 250 }, ...]
      timeline: timelineResult,               // e.g., [{ date: '2023-10-01', count: 2 }]
      range: range,
      lastUpdated: new Date().toISOString(),
    };

    // 6. Save to Cache
    if (redis) {
      redis.setEx(CACHE_KEY, CACHE_TTL_SECONDS, JSON.stringify(templateData))
        .catch((err) => console.error("[Redis Cache Set Error]:", err));
    }

    return NextResponse.json(
      { success: true, data: templateData, source: "database" },
      { status: STATUS_CODE.OK }
    );

  } catch (error) {
    console.error("[Templates API Error]:", error);
    return pgErrorToResponse(error);
  }
}