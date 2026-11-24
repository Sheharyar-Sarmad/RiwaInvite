import { NextRequest, NextResponse } from "next/server";
import { sql } from "@/db/connections/postgres_connection";
import { STATUS_CODE } from "@/lib/status_codes";
import { headers } from "next/headers";
import { safeInvalidateCache } from "@/lib/api/helpers";

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


export async function DELETE() {
  const h = await headers();

  // Session is verified in proxy.ts, which injects x-user-id into API routes.
  const userId = h.get("x-user-id");
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const rows = await sql`
    DELETE FROM notifications
    WHERE user_id = ${userId}
    RETURNING id
  `; // 3: confirm your actual table name (notifications? user_notifications?)

  // Invalidate the cached list so the next GET doesn't return stale rows (300s TTL).
  await safeInvalidateCache(`notifications:${userId}`); // match the exact key your GET caches under

  return NextResponse.json({ ok: true, deleted: rows.length });
}