import { NextRequest, NextResponse } from "next/server";
import { sql } from "@/db/connections/postgres_connection";
import { getRedisClient } from "@/db/connections/redis_connection";
import { STATUS_CODE } from "@/lib/status_codes";

// Next.js 16 Guardrail
export const instant = false;

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const limit = Math.min(50, Math.max(1, Number(searchParams.get("limit")) || 15));

    const redis = await getRedisClient();

    // 1. VERSION-KEY CACHING STRATEGY
    const versionKey = "public:templates:marque:version";
    let version = await redis.get(versionKey);

    if (!version) {
      version = "1";
      await redis.set(versionKey, version, { NX: true });
    }

    const cacheKey = `public:templates:marque:v${version}:limit=${limit}`;
    const cachedData = await redis.get(cacheKey);

    if (cachedData) {
      return NextResponse.json(JSON.parse(cachedData), { status: STATUS_CODE.OK });
    }

    // 2. FAST DB QUERY (Using the Materialized View)
    // No more expensive LEFT JOIN LATERAL. Just a straight read.
    const templates = await sql`
      SELECT
        id,
        name,
        description,
        "thumbnailUrl",
        "galleryUrls",
        "videoUrls",
        "musicUrls",
        "isPremium",
        price,
        "categoryName",
        design_schema
      FROM public_marquee_templates_view
      ORDER BY "isPremium" DESC, created_at DESC
      LIMIT ${limit}
    `;

    const payload = {
      status: "success",
      message: "Marquee templates fetched successfully",
      data: { templates },
      error: null,
    };

    // 3. SAVE TO CACHE
    // Cache for 1 hour. (Because the MV handles data freshness, 
    // you can cache this aggressively).
    await redis.setEx(cacheKey, 3600, JSON.stringify(payload));

    return NextResponse.json(payload, { status: STATUS_CODE.OK });

  } catch (error: any) {
    console.error("[PUBLIC_TEMPLATES_MARQUE_GET]", error);
    return NextResponse.json(
      {
        status: "error",
        message: "Internal server error",
        error: process.env.NODE_ENV === "development" ? error.message : null,
      },
      { status: STATUS_CODE.INTERNAL_SERVER_ERROR },
    );
  }
}