import { NextRequest, NextResponse } from "next/server";
import { sql } from "@/db/connections/postgres_connection";
import { STATUS_CODE } from "@/lib/status_codes";

export async function GET(req: NextRequest) {
  try {
    const userId = req.headers.get("x-user-id");
    if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: STATUS_CODE.UNAUTHORIZED });

    const [activeSub, recentOrders, lifetimeSpend] = await Promise.all([
      sql`
        SELECT us.id, p.name as plan_name, p.price, us.status, us.expires_at
        FROM user_subscriptions us
        JOIN plans p ON us.plan_id = p.id
        WHERE us.user_id = ${userId} AND us.status = 'active' AND us.expires_at > NOW()
        ORDER BY us.expires_at DESC
        LIMIT 1
      `,
      sql`
        SELECT id, provider_order_id, amount, order_type, status, created_at
        FROM orders
        WHERE user_id = ${userId}
        ORDER BY created_at DESC LIMIT 10
      `,
      sql`
        SELECT COALESCE(SUM(amount), 0)::int as total
        FROM orders
        WHERE user_id = ${userId} AND status = 'completed'
      `,
    ]);

    const responseData = {
      activeSubscription: activeSub[0] || null,
      recentOrders,
      lifetimeSpend: lifetimeSpend[0]?.total || 0,
    };

    return NextResponse.json({ data: responseData }, { status: STATUS_CODE.OK });
  } catch (error: any) {
    console.error("[USER_BILLING_API]", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: STATUS_CODE.INTERNAL_SERVER_ERROR });
  }
}