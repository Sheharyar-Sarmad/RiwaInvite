import { NextRequest, NextResponse } from "next/server";
import { sql } from "@/db/connections/postgres_connection";
import { STATUS_CODE } from "@/lib/status_codes";
import settings from "@/config/settings_config";
import crypto from "crypto";

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

    // IDEMPOTENCY: Save to payment_logs first
    const [log] = await sql`
      INSERT INTO payment_logs (provider, event_id, payload, status)
      VALUES ('jazzcash', ${txnRefNo}, ${JSON.stringify(payload)}::jsonb, 'received')
      ON CONFLICT (event_id) DO NOTHING
      RETURNING id
    `;

    if (!log) {
      return NextResponse.json({ status: "success", message: "Already processed" }, { status: STATUS_CODE.OK });
    }

    // CHECK PAYMENT STATUS
    if (responseCode !== "000") {
      await sql`UPDATE orders SET status = 'failed' WHERE provider_order_id = ${txnRefNo}`;
      await sql`UPDATE payment_logs SET status = 'failed', error_message = ${payload.pp_ResponseMessage || 'Unknown Error'} WHERE id = ${log.id}`;
      return NextResponse.json({ status: "success", message: "Payment marked as failed" }, { status: STATUS_CODE.OK });
    }

    // ACID TRANSACTION: Unlock the item
    await sql.begin(async (tx) => {
      const [order] = await tx`SELECT * FROM orders WHERE provider_order_id = ${txnRefNo} FOR UPDATE`;

      if (!order) throw new Error("Order not found");
      if (order.status === "completed") return;

      await tx`UPDATE orders SET status = 'completed', updated_at = NOW() WHERE id = ${order.id}`;

      if (order.order_type === "plan") {
        const [plan] = await tx`SELECT duration_days FROM plans WHERE id = ${order.reference_id}`;
        const duration = plan?.duration_days || 30;
        const expiresAt = new Date(Date.now() + duration * 24 * 60 * 60 * 1000).toISOString();

        await tx`
          INSERT INTO user_subscriptions (user_id, plan_id, starts_at, expires_at, status)
          VALUES (${order.user_id}, ${order.reference_id}, NOW(), ${expiresAt}, 'active')
        `;
      } else if (order.order_type === "template") {
        await tx`
          INSERT INTO template_purchases (user_id, template_id, price_paid)
          VALUES (${order.user_id}, ${order.reference_id}, ${order.amount})
          ON CONFLICT (user_id, template_id) DO NOTHING
        `;
      }

      await tx`
        INSERT INTO notifications (user_id, title, message)
        VALUES (${order.user_id}, 'Payment Successful 🎉', 'Your payment was verified and your access is ready.')
      `;
      await tx`
        INSERT INTO admin_notifications (type, title, message)
        VALUES ('order', 'Payment Received', ${`Order ${txnRefNo} paid successfully. Amount: Rs ${order.amount}`})
      `;
    });

    await sql`UPDATE payment_logs SET status = 'processed' WHERE id = ${log.id}`;

    return NextResponse.json({ status: "success" }, { status: STATUS_CODE.OK });

  } catch (error: any) {
    console.error("[WEBHOOK_ERROR]", error);
    return NextResponse.json({ error: "Processing failed" }, { status: STATUS_CODE.INTERNAL_SERVER_ERROR });
  }
}