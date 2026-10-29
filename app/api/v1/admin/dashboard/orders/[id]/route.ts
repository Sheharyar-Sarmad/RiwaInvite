import { NextRequest, NextResponse } from "next/server";
import { sql } from "@/db/connections/postgres_connection";
import { getRedisClient } from "@/db/connections/redis_connection";
import { errorResponse, pgErrorToResponse } from "@/lib/api/errors";
import { STATUS_CODE } from "@/lib/status_codes";
import { z } from "zod";

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
type Params = { params: Promise<{ id: string }> };

const UpdateOrderStatusSchema = z.object({
  status: z.enum(["pending", "completed", "failed"]),
});

export async function GET(_req: NextRequest, { params }: Params) {
  const { id } = await params;
  if (!UUID_RE.test(id)) {
    return errorResponse(STATUS_CODE.BAD_REQUEST, "INVALID_ID", "Invalid order id.");
  }

  try {
    // 1. Fetch Order & User
    const [order] = await sql`
      SELECT 
        o.*,
        u.first_name, u.last_name, u.email
      FROM orders o
      JOIN users u ON o.user_id = u.id
      WHERE o.id = ${id}
    `;

    if (!order) {
      return errorResponse(STATUS_CODE.NOT_FOUND, "NOT_FOUND", "Order not found.");
    }

    // 2. Fetch Order Items
    const items = await sql`
      SELECT id, item_type, item_id, price, created_at
      FROM order_items
      WHERE order_id = ${id}
    `;

    return NextResponse.json({
      data: {
        ...order,
        amount: Number(order.amount),
        items: items.map(item => ({ ...item, price: Number(item.price) }))
      }
    }, { status: STATUS_CODE.OK });

  } catch (err) {
    return pgErrorToResponse(err);
  }
}

export async function PATCH(req: NextRequest, { params }: Params) {
  const adminId = req.headers.get("x-admin-id");
  const { id } = await params;

  if (!adminId) return errorResponse(STATUS_CODE.UNAUTHORIZED, "UNAUTHORIZED", "Missing Admin ID");
  if (!UUID_RE.test(id)) return errorResponse(STATUS_CODE.BAD_REQUEST, "INVALID_ID", "Invalid order id.");

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return errorResponse(STATUS_CODE.BAD_REQUEST, "INVALID_JSON", "Invalid JSON.");
  }

  const parsed = UpdateOrderStatusSchema.safeParse(body);
  if (!parsed.success) {
    return errorResponse(STATUS_CODE.BAD_REQUEST, "VALIDATION_ERROR", "Invalid status payload.", parsed.error.issues);
  }

  try {
    const [updatedOrder] = await sql`
      UPDATE orders
      SET status = ${parsed.data.status}
      WHERE id = ${id}
      RETURNING id, status, provider_order_id
    `;

    if (!updatedOrder) {
      return errorResponse(STATUS_CODE.NOT_FOUND, "NOT_FOUND", "Order not found.");
    }

    // Insert Admin Notification
    try {
      await sql`
        INSERT INTO admin_notifications (admin_id, type, title, message)
        VALUES (
          ${adminId}, 
          'system', 
          'Order Status Updated', 
          ${`Order ${updatedOrder.provider_order_id} status changed to ${updatedOrder.status}.`}
        )
      `;
    } catch (notifError) {
      console.warn("[NOTIFICATION_ERROR]", notifError);
    }

    // Invalidate Cache (List API)
    try {
      const redis = await getRedisClient();
      const keys = await redis.keys("orders:admin:*");
      if (keys.length > 0) await redis.del(keys);
    } catch (e) {
      console.warn("[Redis] Failed to invalidate cache:", e);
    }

    return NextResponse.json({ data: updatedOrder }, { status: STATUS_CODE.OK });
  } catch (err) {
    return pgErrorToResponse(err);
  }
}