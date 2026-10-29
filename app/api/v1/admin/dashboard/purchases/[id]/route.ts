import { NextRequest, NextResponse } from "next/server";
import { sql } from "@/db/connections/postgres_connection";
import { errorResponse, pgErrorToResponse } from "@/lib/api/errors";
import { STATUS_CODE } from "@/lib/status_codes";

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
type Params = { params: Promise<{ id: string }> };

export async function GET(_req: NextRequest, { params }: Params) {
  const { id } = await params;
  
  if (!UUID_RE.test(id)) {
    return errorResponse(STATUS_CODE.BAD_REQUEST, "INVALID_ID", "Invalid purchase id.");
  }

  try {
    const [purchase] = await sql`
      SELECT 
        tp.id, tp.price_paid, tp.purchased_at,
        u.id as user_id, u.first_name, u.last_name, u.email, u.phone_number,
        t.id as template_id, t.name as template_name, t.thumbnail_url, t.price as template_original_price
      FROM template_purchases tp
      JOIN users u ON tp.user_id = u.id
      JOIN templates t ON tp.template_id = t.id
      WHERE tp.id = ${id}
    `;

    if (!purchase) {
      return errorResponse(STATUS_CODE.NOT_FOUND, "NOT_FOUND", "Purchase not found.");
    }

    return NextResponse.json({
      data: {
        ...purchase,
        price_paid: Number(purchase.price_paid),
        template_original_price: Number(purchase.template_original_price),
      }
    }, { status: STATUS_CODE.OK });

  } catch (err) {
    return pgErrorToResponse(err);
  }
}