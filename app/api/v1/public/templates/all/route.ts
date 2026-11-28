// app/api/v1/public/templates/all/route.ts
import { NextRequest, NextResponse } from "next/server";
import { sql } from "@/db/connections/postgres_connection";
import { getRedisClient } from "@/db/connections/redis_connection";
import { STATUS_CODE } from "@/lib/status_codes";
import { UUID_RE } from "@/lib/api/helpers";

const SORTS = ["newest", "price_asc", "price_desc", "name_asc"] as const;
const CDN = { "Cache-Control": "public, s-maxage=60, stale-while-revalidate=300" };

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);

    const page = Math.min(1000, Math.max(1, Math.floor(Number(searchParams.get("page"))) || 1));
    const limit = Math.max(1, Math.min(50, Math.floor(Number(searchParams.get("limit"))) || 20));
    const search = (searchParams.get("search")?.trim() || "").slice(0, 60);
    const categoryId = searchParams.get("category_id");
    const sortParam = searchParams.get("sort") || "newest";
    const sort = (SORTS as readonly string[]).includes(sortParam) ? sortParam : "newest";

    if (categoryId && !UUID_RE.test(categoryId)) {
      return NextResponse.json(
        { status: "error", message: "Invalid category_id" },
        { status: STATUS_CODE.BAD_REQUEST },
      );
    }

    const offset = (page - 1) * limit;

    // Only un-searched pages are cached (search text would allow unlimited keys).
    const useCache = search === "";
    let redis: Awaited<ReturnType<typeof getRedisClient>> | null = null;
    let cacheKey: string | null = null;

    if (useCache) {
      try {
        redis = await getRedisClient();
        const version = (await redis.get("public:templates:version")) || "1";
        cacheKey = `public:templates:v${version}:page=${page}:limit=${limit}:cat=${categoryId ?? "all"}:sort=${sort}`;
        const cachedData = await redis.get(cacheKey);
        if (cachedData) {
          return NextResponse.json(
            {
              status: "success",
              message: "Templates fetched successfully (Cached)",
              data: JSON.parse(cachedData),
              error: null,
            },
            { status: STATUS_CODE.OK, headers: CDN },
          );
        }
      } catch (e) {
        console.warn("[PUBLIC_TEMPLATES] cache read failed, using Postgres:", e);
        redis = null;
        cacheKey = null;
      }
    }

    const searchPattern = `%${search.replace(/[\\%_]/g, "\\$&")}%`;

    const conditions = [sql`t.status = 'published'`];
    if (search) {
      conditions.push(sql`(t.name ILIKE ${searchPattern} OR t.description ILIKE ${searchPattern})`);
    }
    if (categoryId) {
      conditions.push(sql`t.category_id = ${categoryId}`);
    }
    const whereClause = conditions.reduce((acc, curr) => sql`${acc} AND ${curr}`);

    let orderByClause = sql`ORDER BY t.created_at DESC, t.id DESC`;
    if (sort === "price_asc") orderByClause = sql`ORDER BY t.price ASC, t.id`;
    if (sort === "price_desc") orderByClause = sql`ORDER BY t.price DESC, t.id`;
    if (sort === "name_asc") orderByClause = sql`ORDER BY t.name ASC, t.id`;

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

    if (redis && cacheKey) {
      try {
        await redis.setEx(cacheKey, 3600, JSON.stringify(responsePayload));
      } catch (e) {
        console.warn("[PUBLIC_TEMPLATES] cache write failed (response unaffected):", e);
      }
    }

    return NextResponse.json(
      {
        status: "success",
        message: "Templates fetched successfully",
        data: responsePayload,
        error: null,
      },
      { status: STATUS_CODE.OK, headers: useCache ? CDN : undefined },
    );
  } catch (error: any) {
    console.error("[GET_PUBLIC_TEMPLATES_ERROR]", error);
    return NextResponse.json(
      { status: "error", message: "Internal server error" },
      { status: STATUS_CODE.INTERNAL_SERVER_ERROR },
    );
  }
}