import { NextRequest, NextResponse } from "next/server";
import { sql } from "@/db/connections/postgres_connection";
import { errorResponse, pgErrorToResponse } from "@/lib/api/errors";
import { STATUS_CODE } from "@/lib/status_codes";

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
type Params = { params: Promise<{ id: string }> };

export async function GET(_req: NextRequest, { params }: Params) {
  const { id } = await params;
  if (!UUID_RE.test(id)) {
    return errorResponse(STATUS_CODE.BAD_REQUEST, "INVALID_ID", "Invalid subscription id.");
  }

  try {
    const [subscription] = await sql`
      SELECT 
        us.*,
        u.first_name, u.last_name, u.email,
        p.name as plan_name, p.price as plan_price, p.duration_days, p.max_simple_templates, p.max_premium_templates
      FROM user_subscriptions us
      JOIN users u ON us.user_id = u.id
      JOIN plans p ON us.plan_id = p.id
      WHERE us.id = ${id}
    `;

    if (!subscription) {
      return errorResponse(STATUS_CODE.NOT_FOUND, "NOT_FOUND", "Subscription not found.");
    }

    return NextResponse.json({ data: subscription }, { status: STATUS_CODE.OK });
  } catch (err) {
    return pgErrorToResponse(err);
  }
}