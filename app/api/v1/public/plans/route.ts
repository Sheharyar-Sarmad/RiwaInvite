import { NextRequest, NextResponse } from "next/server";
import { sql } from "@/db/connections/postgres_connection";
import { getRedisClient } from "@/db/connections/redis_connection";
import { STATUS_CODE } from "@/lib/status_codes";

export const instant = false;

export async function GET(req: NextRequest) {
  try {
    const redis = await getRedisClient();

    // 1. Version-Key Caching
    const versionKey = "public:plans:version";
    let version = await redis.get(versionKey);

    if (!version) {
      version = "1";
      await redis.set(versionKey, version, { NX: true });
    }

    const cacheKey = `public:plans:v${version}`;
    const cachedData = await redis.get(cacheKey);

    if (cachedData) {
      return NextResponse.json(JSON.parse(cachedData), { status: STATUS_CODE.OK });
    }

    // 2. Fetch from Materialized View
    const plans = await sql`
      SELECT
        id,
        name,
        description,
        (price)::float AS "price",
        duration_days AS "durationDays",
        max_simple_templates AS "maxSimpleTemplates",
        max_premium_templates AS "maxPremiumTemplates",
        allows_custom_slug AS "allowsCustomSlug"
      FROM public_active_plans_view
      ORDER BY price ASC
      LIMIT 6
    `;

    const payload = {
      status: "success",
      message: "Plans fetched successfully",
      data: { plans },
      error: null,
    };

    // 3. Cache for 1 hour
    await redis.setEx(cacheKey, 3600, JSON.stringify(payload));

    return NextResponse.json(payload, { status: STATUS_CODE.OK });
  } catch (error: any) {
    console.error("[PUBLIC_PLANS_GET]", error);
    return NextResponse.json(
      { status: "error", message: "Internal server error" },
      { status: STATUS_CODE.INTERNAL_SERVER_ERROR },
    );
  }
}