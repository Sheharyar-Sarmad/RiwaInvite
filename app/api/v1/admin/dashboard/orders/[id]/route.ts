import { NextRequest, NextResponse } from "next/server";
import { sql } from "@/db/connections/postgres_connection";
import { errorResponse, pgErrorToResponse } from "@/lib/api/errors";
import { safeInvalidateCache } from "@/lib/api/helpers";
import { STATUS_CODE } from "@/lib/status_codes";
import { z } from "zod";

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
type Params = { params: Promise<{ id: string }> };

const UpdateOrderStatusSchema = z.object({
  status: z.enum(["pending", "completed", "failed"]),
});

export async function GET(req: NextRequest, { params }: Params) {
  const adminId = req.headers.get("x-admin-id");
  if (!adminId) return errorResponse(STATUS_CODE.UNAUTHORIZED, "UNAUTHORIZED", "Missing Admin ID");

  const { id } = await params;
  if (!UUID_RE.test(id)) {
    return errorResponse(STATUS_CODE.BAD_REQUEST, "INVALID_ID", "Invalid order id.");
  }

  try {
    const [orderRows, items] = await Promise.all([
      sql`
        SELECT 
          o.*,
          u.first_name, u.last_name, u.email
        FROM orders o
        JOIN users u ON o.user_id = u.id
        WHERE o.id = ${id}
      `,
      sql`
        SELECT id, item_type, item_id, price, created_at
        FROM order_items
        WHERE order_id = ${id}
      `,
    ]);

    const order = orderRows[0];
    if (!order) {
      return errorResponse(STATUS_CODE.NOT_FOUND, "NOT_FOUND", "Order not found.");
    }

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

    // Non-blocking SCAN-based invalidation (replaces redis.keys)
    await safeInvalidateCache("orders:admin:*");

    return NextResponse.json({ data: updatedOrder }, { status: STATUS_CODE.OK });
  } catch (err) {
    return pgErrorToResponse(err);
  }
}