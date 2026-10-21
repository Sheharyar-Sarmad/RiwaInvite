import { NextRequest, NextResponse } from "next/server";
import { sql } from "@/db/connections/postgres_connection";
import { CreateCategorySchema } from "@/lib/validations/admin";
import { ZodError } from "zod";
import { getRedisClient } from "@/db/connections/redis_connection";
import { STATUS_CODE } from "@/lib/status_codes";

export async function GET(req: NextRequest) {
  try {
    const adminId = req.headers.get("x-admin-id");
    if (!adminId)
      return NextResponse.json(
        { status: "error", message: "Unauthorized" },
        { status: STATUS_CODE.UNAUTHORIZED },
      );

    const { searchParams } = new URL(req.url);
    const page = Math.max(1, Number(searchParams.get("page")) || 1);
    const limit = Math.max(
      1,
      Math.min(100, Number(searchParams.get("limit")) || 20),
    );
    const search = searchParams.get("search")?.trim() || "";
    const offset = (page - 1) * limit;

    const redis = await getRedisClient();
    const cacheKey = `admin:categories:page=${page}:limit=${limit}:search=${search}`;

    const cachedData = await redis.get(cacheKey);
    if (cachedData) {
      return NextResponse.json(
        { status: "success", data: JSON.parse(cachedData) },
        { status: STATUS_CODE.OK },
      );
    }

    const searchPattern = `%${search}%`;
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

    await redis.setEx(cacheKey, 300, JSON.stringify(responsePayload));
    return NextResponse.json(
      { status: "success", data: responsePayload },
      { status: STATUS_CODE.OK },
    );
  } catch (error: any) {
    console.error("[GET_CATEGORIES_ERROR]", error);
    return NextResponse.json(
      { status: "error", message: "Internal server error" },
      { status: STATUS_CODE.INTERNAL_SERVER_ERROR },
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    const adminId = req.headers.get("x-admin-id");
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

    const redis = await getRedisClient();
    const keys = await redis.keys("admin:categories:*");
    if (keys.length > 0) await redis.del(keys);

    return NextResponse.json(
      { status: "success", data: category },
      { status: STATUS_CODE.CREATED },
    );
  } catch (error: any) {
    if (error instanceof ZodError)
      return NextResponse.json(
        { status: "error", error: error.issues },
        { status: STATUS_CODE.BAD_REQUEST },
      );
    if (error.code === "23505")
      return NextResponse.json(
        { status: "error", message: "Duplicate category" },
        { status: STATUS_CODE.CONFLICT },
      );
    return NextResponse.json(
      { status: "error", message: "Internal server error" },
      { status: STATUS_CODE.INTERNAL_SERVER_ERROR },
    );
  }
}
