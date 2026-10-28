// app/api/v1/admin/dashboard/templates/route.ts
import { NextRequest, NextResponse } from "next/server";
import { sql } from "@/db/connections/postgres_connection";
import { getRedisClient } from "@/db/connections/redis_connection";
import { CreateTemplateSchema } from "@/lib/validations/admin";
import { ZodError } from "zod";
import { STATUS_CODE } from "@/lib/status_codes";

// GET: List Templates (Paginated + Search + Filters)
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
    const categoryId = searchParams.get("category_id");
    const status = searchParams.get("status");
    const isPremium = searchParams.get("is_premium");

    const offset = (page - 1) * limit;
    const redis = await getRedisClient();

    // Construct Cache Key based on all filters
    const cacheKey = `admin:templates:page=${page}:limit=${limit}:search=${search}:cat=${categoryId}:status=${status}:prem=${isPremium}`;

    const cachedData = await redis.get(cacheKey);
    if (cachedData) {
      return NextResponse.json({
        status: "success",
        message: "Templates fetched successfully (Cached)",
        data: JSON.parse(cachedData),
        error: null,
      }, { status: STATUS_CODE.OK });
    }

    // Dynamic SQL Conditions
    const searchPattern = `%${search}%`;

    // We use postgres.js query fragments to build the WHERE clause
    const conditions = [sql`1=1`];
    if (search)
      conditions.push(
        sql`(t.name ILIKE ${searchPattern} OR t.description ILIKE ${searchPattern})`,
      );
    if (categoryId) conditions.push(sql`t.category_id = ${categoryId}`);
    if (status) conditions.push(sql`t.status = ${status}`);
    if (isPremium === "true" || isPremium === "false")
      conditions.push(sql`t.is_premium = ${isPremium === "true"}`);

    const whereClause = conditions.reduce(
      (acc, curr) => sql`${acc} AND ${curr}`,
    );

    // Execute Queries
    const [dataResult, countResult] = await Promise.all([
      sql`
        SELECT t.*, c.name as category_name 
        FROM templates t
        JOIN template_categories c ON t.category_id = c.id
        WHERE ${whereClause}
        ORDER BY t.created_at DESC
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

    // Save to Cache (5 mins)
    await redis.setEx(cacheKey, 300, JSON.stringify(responsePayload));

    return NextResponse.json({
      status: "success",
      message: "Templates fetched successfully",
      data: responsePayload,
      error: null,
    }, { status: STATUS_CODE.OK });
  } catch (error: any) {
    console.error("[GET_TEMPLATES_ERROR]", error);
    return NextResponse.json(
      {
        status: "error",
        message: "Internal server error",
        error: error.message,
      },
      { status: STATUS_CODE.INTERNAL_SERVER_ERROR },
    );
  }
}

// POST: Create Template
export async function POST(req: NextRequest) {
  try {
    const adminId = req.headers.get("x-admin-id");
    if (!adminId)
      return NextResponse.json(
        { status: "error", message: "Unauthorized" },
        { status: STATUS_CODE.UNAUTHORIZED },
      );

    const json = await req.json();
    const body = CreateTemplateSchema.parse(json);

    const result = await sql.begin(async (tx) => {
      const [category] =
        await tx`SELECT id FROM template_categories WHERE id = ${body.category_id}`;
      if (!category) throw new Error("CATEGORY_NOT_FOUND");

      const [template] = await tx`
        INSERT INTO templates (
          category_id, name, description, thumbnail_url,
          gallery_urls, video_urls, music_urls,
          core_names_config, is_premium, price, custom_slug_price, status
        ) VALUES (
          ${body.category_id}, ${body.name}, ${body.description ?? null}, ${body.thumbnail_url},
          ${JSON.stringify(body.gallery_urls)}::jsonb, ${JSON.stringify(body.video_urls)}::jsonb, ${JSON.stringify(body.music_urls)}::jsonb,
          ${JSON.stringify(body.core_names_config)}::jsonb, 
          ${body.is_premium}, ${body.price}, ${body.custom_slug_price}, ${body.status}
        ) RETURNING *
      `;

      const [templateBody] = await tx`
        INSERT INTO template_bodies (template_id, version, design_schema)
        VALUES (${template.id}, 1, ${JSON.stringify(body.design_schema)}::jsonb)
        RETURNING id, version
      `;

      return { template, body: templateBody };
    });

    const redis = await getRedisClient();
    const keys = await redis.keys("admin:templates:*");
    if (keys.length > 0) await redis.del(keys);

    return NextResponse.json(
      { status: "success", message: "Template created successfully", data: result },
      { status: STATUS_CODE.CREATED },
    );
  } catch (error: any) {
    if (error instanceof ZodError)
      return NextResponse.json({ status: "error", error: error.issues }, { status: STATUS_CODE.BAD_REQUEST });
    if (error.message === "CATEGORY_NOT_FOUND")
      return NextResponse.json({ status: "error", message: "Category not found" }, { status: STATUS_CODE.NOT_FOUND });
    
    console.error("[CREATE_TEMPLATE_ERROR]", error);
    return NextResponse.json(
      { status: "error", message: "Internal server error", error: error.message },
      { status: STATUS_CODE.INTERNAL_SERVER_ERROR },
    );
  }
}