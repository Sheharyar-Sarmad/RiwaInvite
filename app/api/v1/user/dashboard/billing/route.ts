// app/api/v1/user/dashboard/billing/route.ts
import { NextRequest, NextResponse } from "next/server";
import { sql } from "@/db/connections/postgres_connection";
import { getRedisClient } from "@/db/connections/redis_connection";
import { billingCacheKey } from "@/lib/api/billing_cache";
import { STATUS_CODE } from "@/lib/status_codes";
import type {
  ActiveSubscription,
  BillingOrder,
  BillingPayload,
  LastSubscription,
  SinglePurchaseItem,
} from "@/lib/types/billing";

const TTL = 60;
const ORDER_LIMIT = 10;
const SINGLE_PREVIEW_LIMIT = 6;

/** Works whether the driver returns a Date or a string. Never throws. */
const iso = (v: Date | string | null | undefined): string => {
  if (!v) return "";
  const d = v instanceof Date ? v : new Date(v);
  return Number.isNaN(d.getTime()) ? "" : d.toISOString();
};

type LiveSubRow = {
  id: string;
  plan_id: string;
  plan_name: string;
  price: number;
  status: ActiveSubscription["status"];
  starts_at: Date | string;
  expires_at: Date | string;
  days_remaining: number;
  max_simple_templates: number;
  max_premium_templates: number;
  allows_custom_slug: boolean;
  simple_used: number;
  premium_used: number;
};

type LastSubRow = {
  id: string;
  plan_name: string;
  status: ActiveSubscription["status"];
  expires_at: Date | string;
};

type OrderRow = Omit<BillingOrder, "amount" | "created_at"> & {
  amount: number;
  created_at: Date | string;
};

type SingleSummaryRow = { total: number; premium: number; free: number; customSlugs: number };
type SpendRow = { receipts_total: number; subscription: number; single: number };

export async function GET(req: NextRequest) {
  try {
    const userId = req.headers.get("x-user-id");
    if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: STATUS_CODE.UNAUTHORIZED });

    const cacheKey = billingCacheKey(userId);
    let redis: Awaited<ReturnType<typeof getRedisClient>> | null = null;
    try {
      redis = await getRedisClient();
      const cached = await redis.get(cacheKey);
      if (cached) {
        return NextResponse.json({ data: JSON.parse(cached) as BillingPayload }, { status: STATUS_CODE.OK });
      }
    } catch (e) {
      console.warn("[BILLING_CACHE] read failed, falling back to Postgres:", e);
    }

    const [liveRows, lastRows, singleSummary, singleItems, orderRows, spendRows] = await Promise.all([
      // 1. LIVE subscription + usage in its window.
      sql<LiveSubRow[]>`
        SELECT us.id, us.plan_id, p.name AS plan_name, p.price::float AS price, us.status,
               us.starts_at, us.expires_at,
               GREATEST(0, CEIL(EXTRACT(EPOCH FROM (us.expires_at - NOW())) / 86400))::int AS days_remaining,
               p.max_simple_templates, p.max_premium_templates, p.allows_custom_slug,
               u.simple_used, u.premium_used
        FROM user_subscriptions us
        JOIN plans p ON p.id = us.plan_id
        LEFT JOIN LATERAL (
          SELECT COUNT(*) FILTER (WHERE NOT t.is_premium)::int AS simple_used,
                 COUNT(*) FILTER (WHERE t.is_premium)::int AS premium_used
          FROM invitations i
          JOIN templates t ON t.id = i.template_id
          WHERE i.user_id = us.user_id
            AND i.created_at >= us.starts_at AND i.created_at < us.expires_at
        ) u ON true
        WHERE us.user_id = ${userId} AND us.status = 'active' AND us.expires_at > NOW()
        ORDER BY us.expires_at DESC
        LIMIT 1
      `,
      // 2. Most recent non-live subscription (expiry / buy-again messaging).
      sql<LastSubRow[]>`
        SELECT us.id, p.name AS plan_name, us.status, us.expires_at
        FROM user_subscriptions us
        JOIN plans p ON p.id = us.plan_id
        WHERE us.user_id = ${userId}
          AND NOT (us.status = 'active' AND us.expires_at > NOW())
        ORDER BY us.expires_at DESC
        LIMIT 1
      `,
      // 3. Purchased-singly summary (template_purchases is the source of truth).
      sql<SingleSummaryRow[]>`
        SELECT COUNT(*)::int AS total,
               COUNT(*) FILTER (WHERE t.is_premium)::int AS premium,
               COUNT(*) FILTER (WHERE NOT t.is_premium)::int AS free,
               COUNT(*) FILTER (WHERE tp.has_custom_slug)::int AS "customSlugs"
        FROM template_purchases tp
        JOIN templates t ON t.id = tp.template_id
        WHERE tp.user_id = ${userId}
      `,
      sql<SinglePurchaseItem[]>`
        SELECT t.id, t.name, t.thumbnail_url AS "thumbnailUrl", t.is_premium AS "isPremium",
               GREATEST(tp.price_paid, COALESCE(po.amount, 0))::float AS "pricePaid",
               tp.has_custom_slug AS "hasCustomSlug",
               tp.purchased_at AS "purchasedAt", 'single' AS acquisition
        FROM template_purchases tp
        JOIN templates t ON t.id = tp.template_id
        LEFT JOIN LATERAL (
          SELECT o.amount FROM orders o
          WHERE o.user_id = tp.user_id AND o.order_type = 'template'
            AND o.reference_id = tp.template_id AND o.status = 'completed'
          ORDER BY o.created_at DESC LIMIT 1
        ) po ON true
        WHERE tp.user_id = ${userId}
        ORDER BY tp.purchased_at DESC, t.id DESC
        LIMIT ${SINGLE_PREVIEW_LIMIT}
      `,
      // 4. Receipts = real orders + template purchases that never got a completed order.
      sql<OrderRow[]>`
        SELECT * FROM (
          SELECT o.id, o.provider_order_id, o.amount::float AS amount, o.order_type, o.status,
                 o.created_at, COALESCE(p.name, t.name, 'Removed item') AS item_name
          FROM orders o
          LEFT JOIN plans p ON o.order_type = 'plan' AND p.id = o.reference_id
          LEFT JOIN templates t ON o.order_type = 'template' AND t.id = o.reference_id
          WHERE o.user_id = ${userId}

          UNION ALL

          SELECT tp.id, 'direct-' || UPPER(LEFT(tp.id::text, 8)), tp.price_paid::float,
                 'template', 'completed'::order_status, tp.purchased_at, t.name
          FROM template_purchases tp
          JOIN templates t ON t.id = tp.template_id
          WHERE tp.user_id = ${userId}
            AND NOT EXISTS (
              SELECT 1 FROM orders o2
              WHERE o2.user_id = tp.user_id AND o2.order_type = 'template'
                AND o2.reference_id = tp.template_id AND o2.status = 'completed'
            )
        ) r
        ORDER BY r.created_at DESC, r.id DESC
        LIMIT ${ORDER_LIMIT}
      `,
      // 5. Spend: plans from completed orders, singles from what was actually acquired.
      sql<SpendRow[]>`
        SELECT
          (SELECT COALESCE(SUM(amount), 0)::float FROM orders
            WHERE user_id = ${userId} AND status = 'completed' AND order_type = 'plan') AS subscription,
          (SELECT COALESCE(SUM(GREATEST(tp.price_paid, COALESCE(po.amount, 0))), 0)::float
            FROM template_purchases tp
            LEFT JOIN LATERAL (
              SELECT o.amount FROM orders o
              WHERE o.user_id = tp.user_id AND o.order_type = 'template'
                AND o.reference_id = tp.template_id AND o.status = 'completed'
              ORDER BY o.created_at DESC LIMIT 1
            ) po ON true
            WHERE tp.user_id = ${userId}) AS single,
          (
            (SELECT COUNT(*) FROM orders WHERE user_id = ${userId})
            + (SELECT COUNT(*) FROM template_purchases tp
                WHERE tp.user_id = ${userId}
                  AND NOT EXISTS (
                    SELECT 1 FROM orders o2
                    WHERE o2.user_id = tp.user_id AND o2.order_type = 'template'
                      AND o2.reference_id = tp.template_id AND o2.status = 'completed'
                  ))
          )::int AS receipts_total
      `,
    ]);

    const s = liveRows[0];
    const activeSubscription: ActiveSubscription | null = s
      ? {
          id: s.id,
          plan_id: s.plan_id,
          plan_name: s.plan_name,
          price: s.price,
          status: s.status,
          starts_at: iso(s.starts_at),
          expires_at: iso(s.expires_at),
          daysRemaining: s.days_remaining,
          isLive: true,
          allowances: {
            simple: s.max_simple_templates,
            premium: s.max_premium_templates,
            allowsCustomSlug: s.allows_custom_slug,
          },
          usage: {
            simpleUsed: s.simple_used,
            premiumUsed: s.premium_used,
            simpleRemaining: Math.max(0, s.max_simple_templates - s.simple_used),
            premiumRemaining: Math.max(0, s.max_premium_templates - s.premium_used),
          },
          usageBasis: "invitations_this_period",
        }
      : null;

    const last = lastRows[0];
    const lastSubscription: LastSubscription = last
      ? { id: last.id, plan_name: last.plan_name, status: last.status, expires_at: iso(last.expires_at) }
      : null;

    const spend = spendRows[0];
    const subscriptionSpend = spend?.subscription ?? 0;
    const singleSpend = spend?.single ?? 0;
    const ss = singleSummary[0];

    const responseData: BillingPayload = {
      activeSubscription,
      recentOrders: orderRows.map((r) => ({ ...r, created_at: iso(r.created_at) })),
      lifetimeSpend: subscriptionSpend + singleSpend, // no double count
      lastSubscription,
      singlePurchases: {
        total: ss?.total ?? 0,
        premium: ss?.premium ?? 0,
        free: ss?.free ?? 0,
        customSlugs: ss?.customSlugs ?? 0,
        items: singleItems.map((it) => ({ ...it, purchasedAt: iso(it.purchasedAt) })),
      },
      subscriptionSpend,
      singleSpend,
      receiptsTotal: spend?.receipts_total ?? 0,
    };

    // Fire-safe: cache write failure never turns a good DB read into a 500.
    if (redis) {
      try {
        await redis.setEx(cacheKey, TTL, JSON.stringify(responseData));
      } catch (e) {
        console.warn("[BILLING_CACHE] write failed (response unaffected):", e);
      }
    }

    return NextResponse.json({ data: responseData }, { status: STATUS_CODE.OK });
  } catch (error: any) {
    console.error("[USER_BILLING_API]", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: STATUS_CODE.INTERNAL_SERVER_ERROR });
  }
}