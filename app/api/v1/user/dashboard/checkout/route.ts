import { NextRequest, NextResponse } from "next/server";
import { sql } from "@/db/connections/postgres_connection";
import { STATUS_CODE } from "@/lib/status_codes";
import { z } from "zod";
import settings from "@/config/settings_config";
import crypto from "crypto";

const config = settings();

const CheckoutSchema = z.object({
  itemType: z.enum(["plan", "template"]),
  itemId: z.string().uuid(),
  wantsCustomSlug: z.boolean().optional().default(false),
  preferredSlug: z
    .string()
    .regex(/^[a-z0-9-]+$/, "Slug can only contain lowercase letters, numbers, and hyphens")
    .min(3, "Slug must be at least 3 characters")
    .max(50, "Slug is too long")
    .optional(),
});

function formatJazzCashDate(date: Date): string {
  const formatter = new Intl.DateTimeFormat("en-GB", {
    timeZone: "Asia/Karachi",
    year: "numeric", month: "2-digit", day: "2-digit",
    hour: "2-digit", minute: "2-digit", second: "2-digit", hour12: false,
  });
  const parts = formatter.formatToParts(date);
  const get = (type: string) => parts.find((p) => p.type === type)?.value || "";
  return `${get("year")}${get("month")}${get("day")}${get("hour")}${get("minute")}${get("second")}`;
}

function generateJazzCashHash(data: Record<string, string>, salt: string): string {
  const sortedKeys = Object.keys(data)
    .filter((key) => key.startsWith("pp_") && key !== "pp_SecureHash" && data[key] !== "")
    .sort();
  const stringToHash = sortedKeys.map((key) => data[key]).join("&");
  return crypto.createHmac("sha256", salt).update(stringToHash).digest("hex").toUpperCase();
}

export async function POST(req: NextRequest) {
  try {
    const userId = req.headers.get("x-user-id");
    if (!userId)
      return NextResponse.json({ status: "error", message: "Unauthorized" }, { status: STATUS_CODE.UNAUTHORIZED });

    const body = await req.json();
    const parsed = CheckoutSchema.safeParse(body);
    if (!parsed.success)
      return NextResponse.json({ status: "error", message: "Invalid payload", errors: parsed.error.issues }, { status: STATUS_CODE.BAD_REQUEST });

    const { itemType, itemId, wantsCustomSlug, preferredSlug } = parsed.data;

    let itemName = "";
    let amount = 0;
    let hasCustomSlug = false;

    if (itemType === "plan") {
      const [plan] = await sql`SELECT name, price FROM plans WHERE id = ${itemId} AND is_active = true`;
      if (!plan) return NextResponse.json({ status: "error", message: "Plan not found" }, { status: STATUS_CODE.NOT_FOUND });
      itemName = plan.name;
      amount = Number(plan.price);
    } else {
      const [template] = await sql`SELECT name, price, custom_slug_price, allows_custom_slug FROM templates WHERE id = ${itemId} AND status = 'published'`;
      if (!template) return NextResponse.json({ status: "error", message: "Template not found" }, { status: STATUS_CODE.NOT_FOUND });

      itemName = template.name;
      hasCustomSlug = wantsCustomSlug && template.allows_custom_slug;
      amount = Number(template.price) + (hasCustomSlug ? Number(template.custom_slug_price) : 0);
    }

    // Ensure if they are buying a slug, they actually provided one
    if (hasCustomSlug && !preferredSlug) {
        return NextResponse.json({ status: "error", message: "A custom URL is required to buy the slug add-on." }, { status: STATUS_CODE.BAD_REQUEST });
    }

    // TypeScript Fix: Ensure the slug is strictly string | null
    const safeSlug = preferredSlug || null;

    let checkoutResult;

    try {
      checkoutResult = await sql.begin(async (tx) => {
        // Check for existing pending order
        const [existingOrder] = await tx`
          SELECT id, provider_order_id, amount, has_custom_slug, preferred_slug FROM orders 
          WHERE user_id = ${userId} AND reference_id = ${itemId} 
            AND status = 'pending' AND expires_at > NOW()
          LIMIT 1 FOR UPDATE
        `;

        if (existingOrder) {
          // If user updated their mind about the custom slug or the slug itself
          if (hasCustomSlug !== existingOrder.has_custom_slug || (hasCustomSlug && safeSlug !== existingOrder.preferred_slug)) {
            await tx`
              UPDATE orders 
              SET amount = ${amount}, has_custom_slug = ${hasCustomSlug}, preferred_slug = ${safeSlug}
              WHERE id = ${existingOrder.id}
            `;
            await tx`
              UPDATE order_items 
              SET price = ${amount} 
              WHERE order_id = ${existingOrder.id}
            `;
          }
          return {
            orderId: existingOrder.id,
            providerOrderId: existingOrder.provider_order_id,
            isNew: false,
          };
        }

        // RACE CONDITION CHECK: Is someone else buying this slug right now?
        if (hasCustomSlug && safeSlug) {
            const [slugConflict] = await tx`
                SELECT id FROM orders 
                WHERE LOWER(preferred_slug) = LOWER(${safeSlug}) 
                  AND status = 'pending' AND expires_at > NOW()
                LIMIT 1 FOR UPDATE
            `;
            if (slugConflict) {
                throw new Error("SLUG_TAKEN");
            }
        }

        const providerOrderId = `ORD-${crypto.randomUUID().slice(0, 8).toUpperCase()}`;
        const expiresAt = new Date(Date.now() + 15 * 60 * 1000).toISOString();

        const [newOrder] = await tx`
          INSERT INTO orders (
            user_id, provider, provider_order_id, amount, order_type, 
            reference_id, status, expires_at, has_custom_slug, preferred_slug
          )
          VALUES (
            ${userId}, 'jazzcash', ${providerOrderId}, ${amount}, ${itemType}, 
            ${itemId}, 'pending', ${expiresAt}, ${hasCustomSlug}, ${safeSlug}
          )
          RETURNING id
        `;

        await tx`
          INSERT INTO order_items (order_id, item_type, item_id, price)
          VALUES (${newOrder.id}, ${itemType}, ${itemId}, ${amount})
        `;

        await tx`
          INSERT INTO notifications (user_id, title, message)
          VALUES (${userId}, 'Order Initiated', ${`Your order for ${itemName} (Rs ${amount}) has been created.`})
        `;
        await tx`
          INSERT INTO admin_notifications (type, title, message)
          VALUES ('order', 'New Checkout Initiated', ${`User started checkout for ${itemName} (Rs ${amount}). Order: ${providerOrderId}`})
        `;

        return { orderId: newOrder.id, providerOrderId, isNew: true };
      });
    } catch (err: any) {
      // Handle the slug race condition gracefully
      if (err.message === "SLUG_TAKEN") {
          return NextResponse.json({ status: "error", message: "This custom URL was just taken by someone else. Please go back and pick another one." }, { status: STATUS_CODE.BAD_REQUEST });
      }
      
      if (err.code === "23505") {
        const [existing] = await sql`
          SELECT id, provider_order_id FROM orders 
          WHERE user_id = ${userId} AND reference_id = ${itemId} AND status = 'pending'
          LIMIT 1
        `;
        checkoutResult = {
          orderId: existing.id,
          providerOrderId: existing.provider_order_id,
          isNew: false,
        };
      } else {
        throw err;
      }
    }

    if (config.mockPaymentEnabled) {
      return NextResponse.json({
        status: "success",
        data: {
          isMock: true,
          orderId: checkoutResult.orderId,
          providerOrderId: checkoutResult.providerOrderId,
          checkoutUrl: `/checkout/success?orderId=${checkoutResult.orderId}`,
        },
      });
    } else {
      const jazzcashUrl = config.jazzcashEnv === "sandbox"
          ? "https://sandbox.jazzcash.com.pk/ApplicationAPI/API/Payment/DoTransaction"
          : "https://payments.jazzcash.com.pk/ApplicationAPI/API/Payment/DoTransaction";

      const date = new Date();
      const billRef = `REF-${checkoutResult.providerOrderId}`.slice(0, 20);

      const payload: Record<string, string> = {
        pp_Version: "1.1",
        pp_TxnType: "MWALLET",
        pp_Language: "EN",
        pp_MerchantID: config.jazzcashMerchantId,
        pp_Password: config.jazzcashPassword,
        pp_BankID: "TBANK",
        pp_ProductID: "RETL",
        pp_TxnRefNo: checkoutResult.providerOrderId,
        pp_Amount: Math.round(amount * 100).toString(),
        pp_TxnCurrency: "PKR",
        pp_TxnDateTime: formatJazzCashDate(date),
        pp_BillReference: billRef,
        pp_Description: `RiwaInvite - ${itemName}`.slice(0, 100),
        pp_TxnExpiryDateTime: formatJazzCashDate(new Date(date.getTime() + 60 * 60 * 1000)),
        pp_ReturnURL: config.jazzcashReturnUrl,
        pp_SecureHash: "",
      };

      payload.pp_SecureHash = generateJazzCashHash(payload, config.jazzcashIntegritySalt);

      return NextResponse.json({
        status: "success",
        data: {
          isMock: false,
          orderId: checkoutResult.orderId,
          providerOrderId: checkoutResult.providerOrderId,
          gatewayUrl: jazzcashUrl,
          payload,
        },
      });
    }
  } catch (error: any) {
    console.error("[CHECKOUT_ERROR]", error);
    return NextResponse.json({ status: "error", message: "Internal Server Error" }, { status: STATUS_CODE.INTERNAL_SERVER_ERROR });
  }
}