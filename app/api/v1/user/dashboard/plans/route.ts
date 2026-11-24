// app/api/v1/user/dashboard/plans/route.ts
import { NextRequest, NextResponse } from "next/server";
import { sql } from "@/db/connections/postgres_connection";
import { getRedisClient } from "@/db/connections/redis_connection";
import { errorResponse, pgErrorToResponse } from "@/lib/api/errors";
import { STATUS_CODE } from "@/lib/status_codes";
import type { CatalogPlan, PlansContext } from "@/lib/types/billing";

const CATALOG_KEY = "plans:top3:v1"; // still matched by admin `plans:*` invalidation
const TTL = 300;
const TOP_LIMIT = 3;

/** Works whether the driver returns a Date or a string. Never throws. */
const iso = (v: Date | string | null | undefined): string => {
  if (!v) return "";
  const d = v instanceof Date ? v : new Date(v);
  return Number.isNaN(d.getTime()) ? "" : d.toISOString();
};

type CatalogRow = Omit<CatalogPlan, "created_at"> & { created_at: Date | string };

export async function GET(req: NextRequest) {
  const userId = req.headers.get("x-user-id");
  if (!userId) {
    return errorResponse(STATUS_CODE.UNAUTHORIZED, "UNAUTHORIZED", "You must be signed in.");
  }

  try {
    // 1. Shared catalog: the 3 most-bought plans (matview + purchase counts), cached.
    let plans: CatalogPlan[] | null = null;
    let redis: Awaited<ReturnType<typeof getRedisClient>> | null = null;
    try {
      redis = await getRedisClient();
      const cached = await redis.get(CATALOG_KEY);
      if (cached) plans = JSON.parse(cached) as CatalogPlan[];
    } catch (e) {
      console.warn("[PLANS_CACHE] read failed, falling back to Postgres:", e);
    }

    if (!plans) {
      const rows = await sql<CatalogRow[]>`
        SELECT v.id, v.name, v.description, v.price::float AS price, v.duration_days,
               v.max_simple_templates, v.max_premium_templates, v.allows_custom_slug,
               v.created_at, COALESCE(s.purchases, 0)::int AS purchases
        FROM public_active_plans_view v
        LEFT JOIN (
          SELECT plan_id, COUNT(*) AS purchases
          FROM user_subscriptions
          GROUP BY plan_id
        ) s ON s.plan_id = v.id
        ORDER BY COALESCE(s.purchases, 0) DESC, v.price ASC, v.created_at ASC
        LIMIT ${TOP_LIMIT}
      `;
      plans = rows.map((r) => ({ ...r, created_at: iso(r.created_at) }));

      if (redis) {
        try {
          await redis.setEx(CATALOG_KEY, TTL, JSON.stringify(plans));
        } catch (e) {
          console.warn("[PLANS_CACHE] write failed (response unaffected):", e);
        }
      }
    }

    // 2. Tenant context: live, indexed, never shared-cached.
    const [live] = await sql<
      { plan_id: string; plan_name: string; expires_at: Date | string; days_remaining: number }[]
    >`
      SELECT us.plan_id, p.name AS plan_name, us.expires_at,
             GREATEST(0, CEIL(EXTRACT(EPOCH FROM (us.expires_at - NOW())) / 86400))::int AS days_remaining
      FROM user_subscriptions us
      JOIN plans p ON p.id = us.plan_id
      WHERE us.user_id = ${userId} AND us.status = 'active' AND us.expires_at > NOW()
      LIMIT 1
    `;

    const [pending] = await sql<{ reference_id: string }[]>`
      SELECT reference_id FROM orders
      WHERE user_id = ${userId} AND order_type = 'plan'
        AND status = 'pending' AND expires_at > NOW()
      LIMIT 1
    `;

    const context: PlansContext = {
      can_purchase: !live && !pending,
      block_reason: live ? "SUBSCRIPTION_ACTIVE" : pending ? "PLAN_ORDER_PENDING" : null,
      active: live
        ? {
            plan_id: live.plan_id,
            plan_name: live.plan_name,
            expires_at: iso(live.expires_at),
            days_remaining: live.days_remaining,
          }
        : null,
    };

    return NextResponse.json({ data: { plans, context } }, { status: STATUS_CODE.OK });
  } catch (err) {
    return pgErrorToResponse(err);
  }
}