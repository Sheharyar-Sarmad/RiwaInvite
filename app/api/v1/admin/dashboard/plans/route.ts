import { NextRequest, NextResponse } from "next/server";
import { sql } from "@/db/connections/postgres_connection";
import { getRedisClient } from "@/db/connections/redis_connection";
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
    return errorResponse(STATUS_CODE.BAD_REQUEST, "VALIDATION_ERROR", "Invalid query.", parsed.error.issues);

  const { page, limit, search, is_active } = parsed.data;
  const cacheKey = `plans:admin:${page}:${limit}:${search || "none"}:${is_active ?? "all"}`;

  let redis;
  let cachedData = null;
  
  try {
    redis = await getRedisClient();
    cachedData = await redis.get(cacheKey);
  } catch (e) {
    console.warn("[Redis] Failed to fetch cache, falling back to Postgres:", e);
  }

  if (cachedData) {
    return NextResponse.json(JSON.parse(cachedData), { status: STATUS_CODE.OK });
  }

  const offset = (page - 1) * limit;
  const conditions = [sql`TRUE`];
  if (is_active !== undefined) conditions.push(sql`is_active = ${is_active}`);
  if (search) conditions.push(sql`name ILIKE ${"%" + search + "%"}`);
  const where = conditions.reduce((a, b) => sql`${a} AND ${b}`);

  try {
    const [rows, countRows] = await Promise.all([
      sql`
        SELECT 
          p.*, 
          (SELECT COUNT(*)::int FROM user_subscriptions us WHERE us.plan_id = p.id) as active_subscribers
        FROM plans p
        WHERE ${where} 
        ORDER BY p.created_at DESC LIMIT ${limit} OFFSET ${offset}
      `,
      sql`SELECT COUNT(*)::int AS total FROM plans WHERE ${where}`,
    ]);

    const total = countRows[0].total;
    const responseData = {
      data: rows.map(serializePlan),
      meta: { page, limit, total, total_pages: Math.ceil(total / limit) },
    };

    if (redis) {
      try {
        await redis.setEx(cacheKey, 300, JSON.stringify(responseData));
      } catch (e) {
        console.warn("[Redis] Failed to save cache:", e);
      }
    }

    return NextResponse.json(responseData, { status: STATUS_CODE.OK });
  } catch (err) {
    return pgErrorToResponse(err);
  }
}

export async function POST(req: NextRequest) {
  // Added adminId extraction for the notification
  const adminId = req.headers.get("x-admin-id");

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return errorResponse(STATUS_CODE.BAD_REQUEST, "INVALID_JSON", "Invalid JSON.");
  }

  const parsed = createPlanSchema.safeParse(body);
  if (!parsed.success)
    return errorResponse(STATUS_CODE.BAD_REQUEST, "VALIDATION_ERROR", "Invalid payload.", parsed.error.issues);

  const p = parsed.data;

  try {
    const [row] = await sql`
      INSERT INTO plans (name, description, price, duration_days, max_simple_templates, max_premium_templates, allows_custom_slug, is_active)
      VALUES (${p.name}, ${p.description ?? null}, ${p.price}, ${p.duration_days}, ${p.max_simple_templates}, ${p.max_premium_templates}, ${p.allows_custom_slug}, ${p.is_active})
      RETURNING *
    `;

    // NEW: Insert Admin Notification ONLY when created
    if (adminId) {
      await sql`
        INSERT INTO admin_notifications (admin_id, type, title, message)
        VALUES (
          ${adminId}, 
          'system', 
          'Plan Created', 
          ${`New subscription plan "${row.name}" was successfully created.`}
        )
      `;
    }

    try {
      const redis = await getRedisClient();
      const keys = await redis.keys("plans:*");
      if (keys.length > 0) await redis.del(keys);
    } catch (e) {
      console.warn("[Redis] Failed to invalidate cache:", e);
    }

    return NextResponse.json({ data: serializePlan(row) }, { status: STATUS_CODE.CREATED });
  } catch (err) {
    return pgErrorToResponse(err);
  }
}