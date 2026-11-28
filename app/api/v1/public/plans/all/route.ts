import { NextRequest, NextResponse } from "next/server";
import { sql } from "@/db/connections/postgres_connection";
import { getRedisClient } from "@/db/connections/redis_connection";
import { STATUS_CODE } from "@/lib/status_codes";

const SORTS = ["price_asc", "price_desc", "newest"] as const;
const CDN = { "Cache-Control": "public, s-maxage=60, stale-while-revalidate=300" };

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);

    // 1. Parse + clamp query params
    const validPage = Math.min(1000, Math.max(1, parseInt(searchParams.get("page") || "1", 10) || 1));
    const validLimit = Math.min(100, Math.max(1, parseInt(searchParams.get("limit") || "10", 10) || 10));
    const search = (searchParams.get("search") || "").trim().slice(0, 50);
    const sortParam = searchParams.get("sort") || "price_asc";
    const sort = (SORTS as readonly string[]).includes(sortParam) ? sortParam : "price_asc";
    const offset = (validPage - 1) * validLimit;

    // Only un-searched pages are cached (search text would let anyone create unlimited keys).
    const useCache = search === "";

    // 2. Redis is an optimisation: if it is down, fall through to Postgres.
    let redis: Awaited<ReturnType<typeof getRedisClient>> | null = null;
    let cacheKey: string | null = null;
    if (useCache) {
      try {
        redis = await getRedisClient();
        const versionKey = "public:plans:version";
        let version = await redis.get(versionKey);
        if (!version) {
          version = "1";
          await redis.set(versionKey, version, { NX: true });
        }
        cacheKey = `public:plans:all:v${version}:p${validPage}:l${validLimit}:st${sort}`;
        const cachedData = await redis.get(cacheKey);
        if (cachedData) {
          return NextResponse.json(JSON.parse(cachedData), { status: STATUS_CODE.OK, headers: CDN });
        }
      } catch (e) {
        console.warn("[PUBLIC_PLANS_ALL] cache read failed, using Postgres:", e);
        redis = null;
        cacheKey = null;
      }
    }

    // 3. Build Dynamic SQL for Sorting (whitelisted above)
    let orderBySQL = sql`price ASC`;
    if (sort === "price_desc") orderBySQL = sql`price DESC`;
    if (sort === "newest") orderBySQL = sql`created_at DESC`;

    const searchPattern = `%${search.replace(/[\\%_]/g, "\\$&")}%`;

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

    // 6. Construct Response Payload (unchanged shape)
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

    // 7. Cache the response for 1 hour (never fails the request)
    if (redis && cacheKey) {
      try {
        await redis.setEx(cacheKey, 3600, JSON.stringify(payload));
      } catch (e) {
        console.warn("[PUBLIC_PLANS_ALL] cache write failed (response unaffected):", e);
      }
    }

    return NextResponse.json(payload, { status: STATUS_CODE.OK, headers: useCache ? CDN : undefined });
    
  } catch (error: any) {
    console.error("[PUBLIC_PLANS_ALL_GET]", error);
    return NextResponse.json(
      { status: "error", message: "Internal server error" },
      { status: STATUS_CODE.INTERNAL_SERVER_ERROR },
    );
  }
}