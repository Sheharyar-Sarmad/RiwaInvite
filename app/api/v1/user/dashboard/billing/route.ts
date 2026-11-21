import { NextRequest, NextResponse } from "next/server";
import { sql } from "@/db/connections/postgres_connection";
import { getRedisClient } from "@/db/connections/redis_connection";
import { STATUS_CODE } from "@/lib/status_codes";

export async function GET(req: NextRequest) {
  try {
    const userId = req.headers.get("x-user-id");
    if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: STATUS_CODE.UNAUTHORIZED });

    const redis = await getRedisClient();
    const cacheKey = `user_dashboard_billing:${userId}`;

    const cached = await redis.get(cacheKey);
    if (cached) return NextResponse.json({ data: JSON.parse(cached) }, { status: STATUS_CODE.OK });

    const [activeSub, recentOrders, lifetimeSpend] = await Promise.all([
      // 1. Active Subscription
      sql`
        SELECT us.id, p.name as plan_name, p.price, us.status, us.expires_at
        FROM user_subscriptions us
        JOIN plans p ON us.plan_id = p.id
        WHERE us.user_id = ${userId} AND us.status = 'active' AND us.expires_at > NOW()
        LIMIT 1
      `,
      // 2. Recent Orders
      sql`
        SELECT id, provider_order_id, amount, order_type, status, created_at
        FROM orders
        WHERE user_id = ${userId}
        ORDER BY created_at DESC LIMIT 10
      `,
      // 3. Lifetime Spend
      sql`
        SELECT COALESCE(SUM(amount), 0)::int as total
        FROM orders
        WHERE user_id = ${userId} AND status = 'completed'
      `
    ]);

    const responseData = {
      activeSubscription: activeSub[0] || null,
      recentOrders,
      lifetimeSpend: lifetimeSpend[0]?.total || 0
    };

    await redis.setEx(cacheKey, 300, JSON.stringify(responseData)); // 5 min cache (billing changes less often)
    return NextResponse.json({ data: responseData }, { status: STATUS_CODE.OK });
  } catch (error: any) {
    console.error("[USER_BILLING_API]", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: STATUS_CODE.INTERNAL_SERVER_ERROR });
  }
}