import { NextRequest, NextResponse } from "next/server";
import { sql } from "@/db/connections/postgres_connection";
import { getRedisClient } from "@/db/connections/redis_connection"; // Adjust import path to your redis file
import { errorResponse, pgErrorToResponse } from "@/lib/api/errors";
import { STATUS_CODE } from "@/lib/status_codes";
import { createPlanSchema, listPlansQuerySchema } from "@/lib/validations/plan";

function serializePlan(row: any) {
  return {
    ...row,
    price: Number(row.price),
    created_at: row.created_at?.toISOString?.() ?? row.created_at,
    updated_at: row.updated_at?.toISOString?.() ?? row.updated_at,
  };
}

export async function GET(req: NextRequest) {
  const parsed = listPlansQuerySchema.safeParse(
    Object.fromEntries(req.nextUrl.searchParams),
  );
  if (!parsed.success)
    return errorResponse(
      STATUS_CODE.BAD_REQUEST,
      "VALIDATION_ERROR",
      "Invalid query.",
      parsed.error.issues,
    );

  const { page, limit, search, is_active } = parsed.data;
  const redis = await getRedisClient();

  // Create a unique cache key based on the query
  const cacheKey = `plans:admin:${page}:${limit}:${search || "none"}:${is_active ?? "all"}`;

  // 1. Check Redis
  const cachedData = await redis.get(cacheKey);
  if (cachedData) {
    return NextResponse.json(JSON.parse(cachedData), {
      status: STATUS_CODE.OK,
    });
  }

  // 2. Query Postgres
  const offset = (page - 1) * limit;
  const conditions = [sql`TRUE`];
  if (is_active !== undefined) conditions.push(sql`is_active = ${is_active}`);
  if (search) conditions.push(sql`name ILIKE ${"%" + search + "%"}`);
  const where = conditions.reduce((a, b) => sql`${a} AND ${b}`);

  try {
    const [rows, countRows] = await Promise.all([
      sql`SELECT * FROM plans WHERE ${where} ORDER BY created_at DESC LIMIT ${limit} OFFSET ${offset}`,
      sql`SELECT COUNT(*)::int AS total FROM plans WHERE ${where}`,
    ]);

    const total = countRows[0].total;
    const responseData = {
      data: rows.map(serializePlan),
      meta: { page, limit, total, total_pages: Math.ceil(total / limit) },
    };

    // 3. Save to Redis (Expire in 5 minutes = 300s)
    await redis.setEx(cacheKey, 300, JSON.stringify(responseData));

    return NextResponse.json(responseData, { status: STATUS_CODE.OK });
  } catch (err) {
    return pgErrorToResponse(err);
  }
}

export async function POST(req: NextRequest) {
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return errorResponse(
      STATUS_CODE.BAD_REQUEST,
      "INVALID_JSON",
      "Invalid JSON.",
    );
  }

  const parsed = createPlanSchema.safeParse(body);
  if (!parsed.success)
    return errorResponse(
      STATUS_CODE.BAD_REQUEST,
      "VALIDATION_ERROR",
      "Invalid payload.",
      parsed.error.issues,
    );

  const p = parsed.data;

  try {
    const [row] = await sql`
      INSERT INTO plans (name, description, price, duration_days, max_simple_templates, max_premium_templates, allows_custom_slug, is_active)
      VALUES (${p.name}, ${p.description ?? null}, ${p.price}, ${p.duration_days}, ${p.max_simple_templates}, ${p.max_premium_templates}, ${p.allows_custom_slug}, ${p.is_active})
      RETURNING *
    `;

    // INVALIDATE CACHE: Delete all admin plans keys so the next GET pulls fresh data
    const redis = await getRedisClient();
    const keys = await redis.keys("plans:admin:*");
    if (keys.length > 0) await redis.del(keys);

    return NextResponse.json(
      { data: serializePlan(row) },
      { status: STATUS_CODE.CREATED },
    );
  } catch (err) {
    return pgErrorToResponse(err);
  }
}
