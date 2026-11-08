import { NextRequest, NextResponse } from "next/server";
import { sql } from "@/db/connections/postgres_connection";
import { STATUS_CODE } from "@/lib/status_codes";

export async function GET(req: NextRequest) {
  try {
    const userId = req.headers.get("x-user-id");
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: STATUS_CODE.UNAUTHORIZED });
    }

    const notifications = await sql`
      SELECT 
        id, 
        title, 
        message, 
        is_read, 
        created_at
      FROM notifications
      WHERE user_id = ${userId}
      ORDER BY created_at DESC
      LIMIT 50
    `;

    const [countResult] = await sql`
      SELECT COUNT(*)::int as unread_count 
      FROM notifications 
      WHERE user_id = ${userId} AND is_read = FALSE
    `;

    return NextResponse.json({
      notifications,
      unreadCount: countResult.unread_count,
    });
  } catch (error: any) {
    console.error("[USER_NOTIFICATIONS_GET]", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: STATUS_CODE.INTERNAL_SERVER_ERROR });
  }
}