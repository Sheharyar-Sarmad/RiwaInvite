// app/api/v1/public/templates/all/route.ts
import { NextRequest, NextResponse } from "next/server";
import { sql } from "@/db/connections/postgres_connection";
import { getRedisClient } from "@/db/connections/redis_connection";
import { STATUS_CODE } from "@/lib/status_codes";

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    
    const page = Math.max(1, Number(searchParams.get("page")) || 1);
    const limit = Math.max(1, Math.min(50, Number(searchParams.get("limit")) || 20));
    const search = searchParams.get("search")?.trim() || "";
    const categoryId = searchParams.get("category_id");
    const sort = searchParams.get("sort") || "newest";
    
    const offset = (page - 1) * limit;
    const redis = await getRedisClient();

    const versionKey = "public:templates:version";
    const version = (await redis.get(versionKey)) || "1";
    
    const cacheKey = `public:templates:v${version}:page=${page}:limit=${limit}:search=${search}:cat=${categoryId}:sort=${sort}`;

    const cachedData = await redis.get(cacheKey);
    if (cachedData) {
      return NextResponse.json({
        status: "success",
        message: "Templates fetched successfully (Cached)",
        data: JSON.parse(cachedData),
        error: null,
      }, { status: STATUS_CODE.OK });
    }

    const searchPattern = `%${search}%`;
    
    // We prefix with `t.` because we query base tables
    const conditions = [sql`t.status = 'published'`];

    if (search) {
      conditions.push(sql`(t.name ILIKE ${searchPattern} OR t.description ILIKE ${searchPattern})`);
    }
    if (categoryId) {
      conditions.push(sql`t.category_id = ${categoryId}`);
    }

    const whereClause = conditions.reduce((acc, curr) => sql`${acc} AND ${curr}`);

    let orderByClause = sql`ORDER BY t.created_at DESC`;
    if (sort === "price_asc") orderByClause = sql`ORDER BY t.price ASC`;
    if (sort === "price_desc") orderByClause = sql`ORDER BY t.price DESC`;
    if (sort === "name_asc") orderByClause = sql`ORDER BY t.name ASC`;

    // Querying base tables directly to avoid the missing category_id view issue
    const [dataResult, countResult] = await Promise.all([
      sql`
        SELECT 
          t.id, 
          t.name, 
          t.description, 
          t.thumbnail_url AS "thumbnailUrl", 
          t.gallery_urls AS "galleryUrls", 
          t.video_urls AS "videoUrls", 
          t.music_urls AS "musicUrls", 
          t.is_premium AS "isPremium", 
          t.price::float AS "price", 
          c.name AS "categoryName", 
          tb.design_schema,
          t.created_at
        FROM templates t
        JOIN template_categories c ON t.category_id = c.id
        LEFT JOIN LATERAL (
          SELECT design_schema 
          FROM template_bodies 
          WHERE template_id = t.id 
          ORDER BY version DESC 
          LIMIT 1
        ) tb ON true
        WHERE ${whereClause}
        ${orderByClause}
        LIMIT ${limit} OFFSET ${offset}
      `,
      sql`
        SELECT COUNT(*)::int as total 
        FROM templates t
        WHERE ${whereClause}
      `,
    ]);

    const total = countResult[0]?.total || 0;
    const totalPages = Math.ceil(total / limit);

    const responsePayload = {
      templates: dataResult,
      meta: {
        total,
        page,
        limit,
        totalPages,
        hasNextPage: page < totalPages,
        hasPrevPage: page > 1,
      },
    };

    await redis.setEx(cacheKey, 3600, JSON.stringify(responsePayload));

    return NextResponse.json({
      status: "success",
      message: "Templates fetched successfully",
      data: responsePayload,
      error: null,
    }, { status: STATUS_CODE.OK });

  } catch (error: any) {
    console.error("[GET_PUBLIC_TEMPLATES_ERROR]", error);
    return NextResponse.json(
      { status: "error", message: "Internal server error", error: error.message },
      { status: STATUS_CODE.INTERNAL_SERVER_ERROR },
    );
  }
}