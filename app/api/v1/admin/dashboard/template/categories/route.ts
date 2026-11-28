// app/api/v1/admin/dashboard/template/categories/route.ts
import { NextRequest, NextResponse } from "next/server";
import { sql } from "@/db/connections/postgres_connection";
import { CreateCategorySchema } from "@/lib/validations/admin";
import { ZodError } from "zod";
import { getRedisClient } from "@/db/connections/redis_connection";
import { STATUS_CODE } from "@/lib/status_codes";
import { getPagination, safeInvalidateCache } from "@/lib/api/helpers";

export async function GET(req: NextRequest) {
  try {
    const adminId = req.headers.get("x-admin-id");
    if (!adminId)
      return NextResponse.json(
        { status: "error", message: "Unauthorized" },
        { status: STATUS_CODE.UNAUTHORIZED },
      );

    const { searchParams } = new URL(req.url);
    const { page, limit, offset } = getPagination(searchParams);
    const search = (searchParams.get("search")?.trim() || "").slice(0, 60);

    const useCache = search === "";
    const cacheKey = `admin:categories:page=${page}:limit=${limit}`;
    let redis: Awaited<ReturnType<typeof getRedisClient>> | null = null;

    if (useCache) {
      try {
        redis = await getRedisClient();
        const cachedData = await redis.get(cacheKey);
        if (cachedData) {
          return NextResponse.json(
            { status: "success", data: JSON.parse(cachedData) },
            { status: STATUS_CODE.OK },
          );
        }
      } catch (e) {
        console.warn("[Redis] categories cache read failed, using Postgres:", e);
        redis = null;
      }
    }

    const searchPattern = `%${search.replace(/[\\%_]/g, "\\$&")}%`;
    const [dataResult, countResult] = await Promise.all([
      sql`SELECT id, name, slug, description, thumbnail_url, created_at FROM template_categories WHERE (name ILIKE ${searchPattern} OR slug ILIKE ${searchPattern}) ORDER BY name ASC LIMIT ${limit} OFFSET ${offset}`,
      sql`SELECT COUNT(*)::int as total FROM template_categories WHERE (name ILIKE ${searchPattern} OR slug ILIKE ${searchPattern})`,
    ]);

    const total = countResult[0]?.total || 0;
    const totalPages = Math.ceil(total / limit);

    const responsePayload = {
      categories: dataResult,
      meta: {
        total,
        page,
        limit,
        totalPages,
        hasNextPage: page < totalPages,
        hasPrevPage: page > 1,
      },
    };

    if (useCache && redis) {
      try {
        await redis.setEx(cacheKey, 300, JSON.stringify(responsePayload));
      } catch (e) {
        console.warn("[Redis] categories cache write failed:", e);
      }
    }

    return NextResponse.json(
      { status: "success", data: responsePayload },
      { status: STATUS_CODE.OK },
    );
  } catch (error: unknown) {
    console.error("[GET_CATEGORIES_ERROR]", error);
    return NextResponse.json(
      { status: "error", message: "Internal server error" },
      { status: STATUS_CODE.INTERNAL_SERVER_ERROR },
    );
  }
}

export async function POST(req: NextRequest) {
  let adminId: string | null = null;
  try {
    adminId = req.headers.get("x-admin-id");
    if (!adminId)
      return NextResponse.json(
        { status: "error", message: "Unauthorized" },
        { status: STATUS_CODE.UNAUTHORIZED },
      );

    const json = await req.json();
    const body = CreateCategorySchema.parse(json);

    const [category] = await sql`
      INSERT INTO template_categories (name, slug, description, thumbnail_url)
      VALUES (${body.name}, ${body.slug}, ${body.description ?? null}, ${body.thumbnail_url ?? null})
      RETURNING *
    `;

    // Insert Admin Notification (Safe: won't break the API if it fails)
    try {
      await sql`
        INSERT INTO admin_notifications (admin_id, type, title, message)
        VALUES (
          ${adminId},
          'system',
          'Category Created',
          ${`New category "${category.name}" was successfully created.`}
        )
      `;
    } catch (notifError) {
      console.warn("[NOTIFICATION_ERROR]", notifError);
    }

    // Admin lists + the public template/category caches the site reads.
    await safeInvalidateCache(
      "admin:categories:*",
      "admin:templates:*",
      "public:templates:*",
      "public:template_categories:*",
    );

    return NextResponse.json(
      { status: "success", data: category },
      { status: STATUS_CODE.CREATED },
    );
  } catch (error: unknown) {
    if (error instanceof ZodError)
      return NextResponse.json(
        { status: "error", error: error.issues },
        { status: STATUS_CODE.BAD_REQUEST },
      );
    if ((error as { code?: string }).code === "23505")
      return NextResponse.json(
        { status: "error", message: "Duplicate category" },
        { status: STATUS_CODE.CONFLICT },
      );
    console.error("[CREATE_CATEGORY_ERROR]", error);
    return NextResponse.json(
      { status: "error", message: "Internal server error" },
      { status: STATUS_CODE.INTERNAL_SERVER_ERROR },
    );
  }
}