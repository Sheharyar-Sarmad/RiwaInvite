import { NextRequest, NextResponse } from "next/server";
import { sql } from "@/db/connections/postgres_connection";
import { STATUS_CODE } from "@/lib/status_codes";

export async function GET(req: NextRequest) {
  try {
    const userId = req.headers.get("x-user-id");
    if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: STATUS_CODE.UNAUTHORIZED });

    // A unified feed combining Notifications, RSVPs, and Orders
    const activities = await sql`
      SELECT * FROM (
        -- Notifications
        SELECT id, title, message, 'notification' as type, created_at
        FROM notifications WHERE user_id = ${userId}
        
        UNION ALL
        
        -- New RSVPs
        SELECT g.id, 
               'New RSVP from ' || g.guest_name as title, 
               'Status: ' || g.attendance_status || ' (' || g.number_of_guests || ' guests)' as message,
               'rsvp' as type, 
               g.created_at
        FROM guests g JOIN invitations i ON g.invitation_id = i.id 
        WHERE i.user_id = ${userId} AND g.attendance_status != 'pending'
        
        UNION ALL
        
        -- Completed Orders
        SELECT o.id, 
               'Payment Successful' as title, 
               'Amount: Rs ' || o.amount || ' via ' || o.provider as message,
               'order' as type, 
               o.created_at
        FROM orders o 
        WHERE o.user_id = ${userId} AND o.status = 'completed'
      ) AS combined_activity
      ORDER BY created_at DESC
      LIMIT 15
    `;

    return NextResponse.json(
      { data: activities }, 
      { 
        status: STATUS_CODE.OK,
        headers: {
          "Cache-Control": "no-store, no-cache, must-revalidate, proxy-revalidate",
        }
      }
    );
  } catch (error: any) {
    console.error("[USER_ACTIVITY_API]", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: STATUS_CODE.INTERNAL_SERVER_ERROR });
  }
}