import { NextRequest, NextResponse } from "next/server";
import { sql } from "@/db/connections/postgres_connection";
import { getRedisClient } from "@/db/connections/redis_connection";
import { STATUS_CODE } from "@/lib/status_codes";

export async function GET(req: NextRequest) {
  try {
    const userId = req.headers.get("x-user-id");
    if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: STATUS_CODE.UNAUTHORIZED });

    const redis = await getRedisClient();
    const cacheKey = `user_dashboard_analytics:${userId}`;

    const cached = await redis.get(cacheKey);
    if (cached) return NextResponse.json({ data: JSON.parse(cached) }, { status: STATUS_CODE.OK });

    const [rsvpTrend, guestBreakdown, topInvitations, hourlyRSVPs, plusOnes] = await Promise.all([
      // 1. 30-Day Trend
      sql`
        SELECT TO_CHAR(DATE_TRUNC('day', g.created_at), 'Mon DD') as date,
               COUNT(CASE WHEN g.attendance_status = 'accepted' THEN 1 END)::int as accepted,
               COUNT(CASE WHEN g.attendance_status = 'declined' THEN 1 END)::int as declined
        FROM guests g JOIN invitations i ON g.invitation_id = i.id
        WHERE i.user_id = ${userId} AND g.created_at >= NOW() - INTERVAL '30 days'
        GROUP BY DATE_TRUNC('day', g.created_at) ORDER BY DATE_TRUNC('day', g.created_at) ASC
      `,
      // 2. Overall Breakdown
      sql`
        SELECT COUNT(CASE WHEN g.attendance_status = 'accepted' THEN 1 END)::int as accepted,
               COUNT(CASE WHEN g.attendance_status = 'declined' THEN 1 END)::int as declined,
               COUNT(CASE WHEN g.attendance_status = 'pending' THEN 1 END)::int as pending
        FROM guests g JOIN invitations i ON g.invitation_id = i.id WHERE i.user_id = ${userId}
      `,
      // 3. Top Performing Invitations (Leaderboard)
      sql`
        SELECT i.title, COUNT(g.id)::int as total_rsvps
        FROM invitations i JOIN guests g ON i.id = g.invitation_id
        WHERE i.user_id = ${userId}
        GROUP BY i.id, i.title ORDER BY total_rsvps DESC LIMIT 3
      `,
      // 4. Time of Day RSVPs (When are people responding?)
      sql`
        SELECT 
          CASE 
            WHEN EXTRACT(HOUR FROM g.created_at) < 12 THEN 'Morning'
            WHEN EXTRACT(HOUR FROM g.created_at) < 17 THEN 'Afternoon'
            WHEN EXTRACT(HOUR FROM g.created_at) < 21 THEN 'Evening'
            ELSE 'Night'
          END as time_of_day,
          COUNT(*)::int as count
        FROM guests g JOIN invitations i ON g.invitation_id = i.id
        WHERE i.user_id = ${userId}
        GROUP BY time_of_day
      `,
      // 5. Total Plus Ones (Extra Guests)
      sql`
        SELECT COALESCE(SUM(CASE WHEN g.number_of_guests > 1 THEN g.number_of_guests - 1 ELSE 0 END), 0)::int as total_plus_ones
        FROM guests g JOIN invitations i ON g.invitation_id = i.id
        WHERE i.user_id = ${userId} AND g.attendance_status = 'accepted'
      `
    ]);

    const responseData = { 
      rsvpTrend, 
      guestBreakdown: guestBreakdown[0],
      topInvitations,
      hourlyRSVPs,
      totalPlusOnes: plusOnes[0].total_plus_ones
    };

    await redis.set(cacheKey, JSON.stringify(responseData));
    return NextResponse.json({ data: responseData }, { status: STATUS_CODE.OK });
  } catch (error: any) {
    console.error("[USER_ANALYTICS_API]", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: STATUS_CODE.INTERNAL_SERVER_ERROR });
  }
}