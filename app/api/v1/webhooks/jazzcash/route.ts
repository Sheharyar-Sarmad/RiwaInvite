import { NextRequest, NextResponse } from "next/server";
import { sql } from "@/db/connections/postgres_connection";
import { STATUS_CODE } from "@/lib/status_codes";
import settings from "@/config/settings_config";
import crypto from "crypto";
import { safeInvalidateCache } from "@/lib/api/helpers";

const config = settings();

function verifyJazzCashHash(payload: Record<string, string>, salt: string): string {
  const sortedKeys = Object.keys(payload)
    .filter((key) => key.startsWith("pp_") && key !== "pp_SecureHash" && payload[key] !== "")
    .sort();
  const stringToHash = sortedKeys.map((key) => payload[key]).join("&");
  return crypto.createHmac("sha256", salt).update(stringToHash).digest("hex").toUpperCase();
}

export async function POST(req: NextRequest) {
  try {
    const contentType = req.headers.get("content-type") || "";
    let payload: Record<string, string> = {};

    if (contentType.includes("application/json")) {
      payload = await req.json();
    } else {
      const formData = await req.formData();
      formData.forEach((value, key) => { payload[key] = value.toString(); });
    }

    const txnRefNo = payload.pp_TxnRefNo;
    const responseCode = payload.pp_ResponseCode;

    if (!txnRefNo) {
      console.error("[WEBHOOK] Missing pp_TxnRefNo in payload:", payload);
      return NextResponse.json({ error: "Missing Transaction Reference" }, { status: STATUS_CODE.BAD_REQUEST });
    }

    if (!config.mockPaymentEnabled) {
      const expectedHash = verifyJazzCashHash(payload, config.jazzcashIntegritySalt);
      if (expectedHash !== payload.pp_SecureHash) {
        console.error("[WEBHOOK] Invalid Signature Detected!");
        return NextResponse.json({ error: "Invalid Signature" }, { status: STATUS_CODE.UNAUTHORIZED });
      }
    }

    // 1. IDEMPOTENCY: Save to payment_logs first to prevent double-processing
    // CHANGED: no-op DO UPDATE so a conflict RETURNS the existing row (id + status).
    const [log] = await sql`
      INSERT INTO payment_logs (provider, event_id, payload, status)
      VALUES ('jazzcash', ${txnRefNo}, ${JSON.stringify(payload)}::jsonb, 'received')
      ON CONFLICT (event_id) DO UPDATE SET event_id = EXCLUDED.event_id
      RETURNING id, status
    `;

    // CHANGED: only a PROCESSED log is a true duplicate. A 'received'/'failed' row from a
    // crashed attempt retries safely — the tx's completed-order guard keeps it idempotent.
    if (log.status === "processed") {
      return NextResponse.json({ status: "success", message: "Already processed" }, { status: STATUS_CODE.OK });
    }

    // 2. CHECK PAYMENT STATUS
    if (responseCode !== "000") {
      await sql`UPDATE orders SET status = 'failed' WHERE provider_order_id = ${txnRefNo}`;
      await sql`UPDATE payment_logs SET status = 'failed', error_message = ${payload.pp_ResponseMessage || 'Unknown Error'} WHERE id = ${log.id}`;
      return NextResponse.json({ status: "success", message: "Payment marked as failed" }, { status: STATUS_CODE.OK });
    }

    // 3. ACID TRANSACTION: Unlock the item
    const completedOrder = await sql.begin(async (tx) => {
      const [order] = await tx`SELECT * FROM orders WHERE provider_order_id = ${txnRefNo} FOR UPDATE`;

      if (!order) throw new Error("Order not found");

      if (order.status === "completed") return null;

      await tx`UPDATE orders SET status = 'completed', updated_at = NOW() WHERE id = ${order.id}`;

      if (order.order_type === "plan") {
        // ADDED: one live subscription at a time — re-check inside the tx (DB trigger also enforces).
        // Without this, the trigger would abort the tx and JazzCash would retry forever.
        const [live] = await tx`
          SELECT id FROM user_subscriptions
          WHERE user_id = ${order.user_id} AND status = 'active' AND expires_at > NOW()
          LIMIT 1 FOR UPDATE
        `;
        if (live) {
          await tx`UPDATE orders SET status = 'failed', updated_at = NOW() WHERE id = ${order.id}`;
          await tx`
            INSERT INTO notifications (user_id, title, message)
            VALUES (${order.user_id}, 'Subscription not applied',
                    'You already had an active plan when this payment completed, so it was not applied. Contact support for a refund.')
          `;
          await tx`
            INSERT INTO admin_notifications (type, title, message)
            VALUES ('alert', 'Duplicate plan payment',
                    ${`Order ${txnRefNo} paid while user ${order.user_id} already had a live plan. Refund required.`})
          `;
          return { userId: String(order.user_id) };
        }

        const [plan] = await tx`SELECT duration_days FROM plans WHERE id = ${order.reference_id}`;
        const duration = plan?.duration_days || 30;
        const expiresAt = new Date(Date.now() + duration * 24 * 60 * 60 * 1000).toISOString();

        await tx`
          INSERT INTO user_subscriptions (user_id, plan_id, starts_at, expires_at, status)
          VALUES (${order.user_id}, ${order.reference_id}, NOW(), ${expiresAt}, 'active')
        `;
      } else if (order.order_type === "template") {
        const hasCustomSlug = Boolean(order.has_custom_slug);

        await tx`
          INSERT INTO template_purchases (user_id, template_id, price_paid, has_custom_slug)
          VALUES (${order.user_id}, ${order.reference_id}, ${order.amount}, ${hasCustomSlug})
          ON CONFLICT (user_id, template_id) DO UPDATE
          SET has_custom_slug = template_purchases.has_custom_slug OR EXCLUDED.has_custom_slug,
              price_paid = template_purchases.price_paid + EXCLUDED.price_paid
        `;
      }

      await tx`
        INSERT INTO notifications (user_id, title, message)
        VALUES (${order.user_id}, 'Payment Successful', 'Your payment was verified and your access is ready.')
      `;
      await tx`
        INSERT INTO admin_notifications (type, title, message)
        VALUES ('order', 'Payment Received', ${`Order ${txnRefNo} paid successfully. Amount: Rs ${order.amount}`})
      `;

      return { userId: String(order.user_id) };
    });

    // 5. Mark log as processed
    await sql`UPDATE payment_logs SET status = 'processed' WHERE id = ${log.id}`;

    // 6. INVALIDATE CACHES
    if (completedOrder?.userId) {
      // CHANGED/ADDED: match the keys the routes actually write.
      await safeInvalidateCache(`billing:${completedOrder.userId}:*`);
      await safeInvalidateCache(`library:${completedOrder.userId}:*`);
      // Kept: overview/activity keys (their routes own these prefixes).
      await safeInvalidateCache(`user_dashboard_overview:${completedOrder.userId}`);
      await safeInvalidateCache(`user_dashboard_activity:${completedOrder.userId}`);
    }

    return NextResponse.json({ status: "success" }, { status: STATUS_CODE.OK });

  } catch (error: any) {
    console.error("[WEBHOOK_ERROR]", error);
    return NextResponse.json({ error: "Processing failed" }, { status: STATUS_CODE.INTERNAL_SERVER_ERROR });
  }
}