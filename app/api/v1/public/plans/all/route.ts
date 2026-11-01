import { NextRequest, NextResponse } from "next/server";
import { sql } from "@/db/connections/postgres_connection";
import { getRedisClient } from "@/db/connections/redis_connection";
import { STATUS_CODE } from "@/lib/status_codes";

export async function GET(req: NextRequest) {
  try {
    const redis = await getRedisClient();
    const { searchParams } = new URL(req.url);

    // 1. Parse Query Params
    const page = parseInt(searchParams.get("page") || "1", 10);
    const limit = parseInt(searchParams.get("limit") || "10", 10);
    const search = searchParams.get("search") || "";
    // Sort options: price_asc, price_desc, newest
    const sort = searchParams.get("sort") || "price_asc"; 
    
    // Ensure valid pagination
    const validPage = Math.max(1, page);
    const validLimit = Math.max(1, limit);
    const offset = (validPage - 1) * validLimit;

    // 2. Redis Version-Key Caching
    const versionKey = "public:plans:version";
    let version = await redis.get(versionKey);
    if (!version) {
      version = "1";
      await redis.set(versionKey, version, { NX: true });
    }

    // Unique cache key for this specific query
    const cacheKey = `public:plans:all:v${version}:p${validPage}:l${validLimit}:s${search}:st${sort}`;
    
    // Check cache first
    const cachedData = await redis.get(cacheKey);
    if (cachedData) {
      return NextResponse.json(JSON.parse(cachedData), { status: STATUS_CODE.OK });
    }

    // 3. Build Dynamic SQL for Sorting
    let orderBySQL = sql`price ASC`;
    if (sort === "price_desc") orderBySQL = sql`price DESC`;
    if (sort === "newest") orderBySQL = sql`created_at DESC`;

    const searchPattern = `%${search}%`;

    // 4. Fetch Data from Materialized View
    const plans = await sql`
      SELECT
        id,
        name,
        description,
        (price)::float AS "price",
        duration_days AS "durationDays",
        max_simple_templates AS "maxSimpleTemplates",
        max_premium_templates AS "maxPremiumTemplates",
        allows_custom_slug AS "allowsCustomSlug",
        created_at AS "createdAt"
      FROM public_active_plans_view
      WHERE 
        (${search} = '' OR name ILIKE ${searchPattern} OR description ILIKE ${searchPattern})
      ORDER BY ${orderBySQL}
      LIMIT ${validLimit} OFFSET ${offset}
    `;

    // 5. Fetch Total Count for Pagination
    const [countResult] = await sql`
      SELECT COUNT(*)::int AS total
      FROM public_active_plans_view
      WHERE 
        (${search} = '' OR name ILIKE ${searchPattern} OR description ILIKE ${searchPattern})
    `;

    const total = countResult?.total || 0;

    // 6. Construct Response Payload
    const payload = {
      status: "success",
      message: "Plans fetched successfully",
      data: { 
        plans,
        pagination: {
          total,
          page: validPage,
          limit: validLimit,
          totalPages: Math.ceil(total / validLimit)
        }
      },
      error: null,
    };

    // 7. Cache the response for 1 hour (3600 seconds)
    await redis.setEx(cacheKey, 3600, JSON.stringify(payload));

    return NextResponse.json(payload, { status: STATUS_CODE.OK });
    
  } catch (error: any) {
    console.error("[PUBLIC_PLANS_ALL_GET]", error);
    return NextResponse.json(
      { status: "error", message: "Internal server error", error: error.message },
      { status: STATUS_CODE.INTERNAL_SERVER_ERROR },
    );
  }
}