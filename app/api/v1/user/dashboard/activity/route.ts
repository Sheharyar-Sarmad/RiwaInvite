import { NextRequest, NextResponse } from "next/server";
import { sql } from "@/db/connections/postgres_connection";
import { STATUS_CODE } from "@/lib/status_codes";


export async function GET(req: NextRequest) {
  try {
    const userId = req.headers.get("x-user-id");
    if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: STATUS_CODE.UNAUTHORIZED });

    const activity = await sql`
      SELECT id, title, message, type, created_at FROM (
        SELECT id::text, title, message, 'notification' as type, created_at
        FROM notifications WHERE user_id = ${userId}

        UNION ALL

        SELECT
          g.id::text,
          'New RSVP from ' || g.guest_name as title,
          g.guest_name || ' replied ' || g.attendance_status || ' for ' || i.title as message,
          'rsvp' as type,
          g.created_at
        FROM guests g
        JOIN invitations i ON g.invitation_id = i.id
        WHERE i.user_id = ${userId} AND g.attendance_status != 'pending'

        UNION ALL

        SELECT
          o.id::text,
          'Payment ' || o.status as title,
          'Order of Rs ' || o.amount || ' for ' || o.order_type as message,
          'order' as type,
          o.created_at
        FROM orders o
        WHERE o.user_id = ${userId}
      ) AS combined_activity
      ORDER BY created_at DESC
      LIMIT 20
    `;

    return NextResponse.json({ data: activity }, { status: STATUS_CODE.OK });
  } catch (error: any) {
    console.error("[USER_ACTIVITY_API]", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: STATUS_CODE.INTERNAL_SERVER_ERROR });
  }
}