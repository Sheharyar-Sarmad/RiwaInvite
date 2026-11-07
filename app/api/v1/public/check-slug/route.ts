import { NextRequest, NextResponse } from "next/server";
import { sql } from "@/db/connections/postgres_connection";
import { STATUS_CODE } from "@/lib/status_codes";
import { getRedisClient } from "@/db/connections/redis_connection";

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const rawSlug = searchParams.get("slug");

    if (!rawSlug || rawSlug.length < 3) {
      return NextResponse.json({ available: false }, { status: STATUS_CODE.OK });
    }

    // Normalize the slug (lowercase, remove spaces)
    const slug = rawSlug.toLowerCase().replace(/[^a-z0-9-]/g, "-");
    
    // 1. Check Redis Cache First (prevents DB spam on every keystroke)
    const redis = await getRedisClient();
    const cacheKey = `slug_check:${slug}`;
    const cachedResult = await redis.get(cacheKey);

    if (cachedResult !== null) {
      return NextResponse.json(
        { available: cachedResult === "true" }, 
        { status: STATUS_CODE.OK }
      );
    }

    // 2. Check Database if not in cache
    // Check if ANY invitation already uses this slug
    const [existingInvitation] = await sql`
      SELECT id FROM invitations 
      WHERE LOWER(slug) = ${slug} 
      LIMIT 1
    `;

    // Check if ANY user currently has a pending, unexpired order for this slug
    const [reservedOrder] = await sql`
      SELECT id FROM orders 
      WHERE LOWER(preferred_slug) = ${slug} 
        AND status = 'pending' 
        AND expires_at > NOW() 
      LIMIT 1
    `;

    const isAvailable = !existingInvitation && !reservedOrder;

    // 3. Save to Cache
    // If available, cache for 5 minutes. 
    // If NOT available, cache for 30 seconds (in case a pending order expires, it frees up fast).
    const ttl = isAvailable ? 300 : 30;
    await redis.setEx(cacheKey, ttl, isAvailable ? "true" : "false");

    return NextResponse.json({ available: isAvailable }, { status: STATUS_CODE.OK });
    
  } catch (error: any) {
    console.error("[CHECK_SLUG_API_ERROR]", error);
    return NextResponse.json(
      { status: "error", message: "Internal server error" },
      { status: STATUS_CODE.INTERNAL_SERVER_ERROR }
    );
  }
}