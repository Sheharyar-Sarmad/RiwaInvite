import { NextRequest, NextResponse } from "next/server";
import { sql } from "@/db/connections/postgres_connection";
import { getRedisClient } from "@/db/connections/redis_connection";
import { STATUS_CODE } from "@/lib/status_codes";

export async function GET(req: NextRequest) {
  try {
    const userId = req.headers.get("x-user-id");
    if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: STATUS_CODE.UNAUTHORIZED });

    const redis = await getRedisClient();
    const cacheKey = `user_dashboard_overview:${userId}`;

    const cached = await redis.get(cacheKey);
    if (cached) return NextResponse.json({ data: JSON.parse(cached) }, { status: STATUS_CODE.OK });

    const [
      invitationStats, 
      guestStats, 
      recentInvitations, 
      mostActiveInvitation,
      unclaimedSlugs,
      recentRSVPs,
      planUsage
    ] = await Promise.all([
      // 1. Basic Stats
      sql`
        SELECT COUNT(*)::int as total_invitations, 
               COUNT(CASE WHEN status = 'published' THEN 1 END)::int as active_invitations
        FROM invitations WHERE user_id = ${userId}
      `,
      // 2. Guest Stats & Growth
      sql`
        SELECT 
          COUNT(CASE WHEN g.attendance_status = 'accepted' THEN 1 END)::int as total_rsvps,
          COALESCE(SUM(CASE WHEN g.attendance_status = 'accepted' THEN g.number_of_guests ELSE 0 END), 0)::int as total_guests,
          COUNT(CASE WHEN g.created_at >= NOW() - INTERVAL '7 days' THEN 1 END)::int as rsvps_this_week,
          COALESCE(SUM(CASE WHEN g.attendance_status = 'accepted' AND g.created_at >= NOW() - INTERVAL '7 days' THEN g.number_of_guests ELSE 0 END), 0)::int as guests_this_week
        FROM guests g JOIN invitations i ON g.invitation_id = i.id WHERE i.user_id = ${userId}
      `,
      // 3. Recent 3 Invitations
      sql`
        SELECT i.id, i.title, i.status, i.slug, i.created_at, 
               (SELECT COUNT(*)::int FROM guests WHERE invitation_id = i.id) as rsvp_count
        FROM invitations i WHERE i.user_id = ${userId} ORDER BY i.created_at DESC LIMIT 3
      `,
      // 4. Most Active Invitation (Leaderboard)
      sql`
        SELECT i.id, i.title, COUNT(g.id)::int as rsvp_count
        FROM invitations i
        JOIN guests g ON i.id = g.invitation_id
        WHERE i.user_id = ${userId}
        GROUP BY i.id, i.title
        ORDER BY rsvp_count DESC
        LIMIT 1
      `,
      // 5. Unclaimed Custom Slugs (Action Items)
      sql`
        SELECT COUNT(*)::int as unclaimed
        FROM orders
        WHERE user_id = ${userId} AND has_custom_slug = TRUE AND status = 'completed'
      `,
      // 6. Recent RSVPs Widget
      sql`
        SELECT g.guest_name, g.attendance_status, g.number_of_guests, g.created_at, i.title as invitation_title
        FROM guests g
        JOIN invitations i ON g.invitation_id = i.id
        WHERE i.user_id = ${userId}
        ORDER BY g.created_at DESC
        LIMIT 5
      `,
      // 7. Plan Limits (Mocked if no plan)
      sql`
        SELECT p.max_simple_templates, p.max_premium_templates
        FROM user_subscriptions us JOIN plans p ON us.plan_id = p.id
        WHERE us.user_id = ${userId} AND us.status = 'active' AND us.expires_at > NOW()
        LIMIT 1
      `
    ]);

    const responseData = {
      stats: {
        totalInvitations: invitationStats[0].total_invitations,
        activeInvitations: invitationStats[0].active_invitations,
        totalRSVPs: guestStats[0].total_rsvps,
        totalGuests: guestStats[0].total_guests,
        rsvpsThisWeek: guestStats[0].rsvps_this_week,
        guestsThisWeek: guestStats[0].guests_this_week,
      },
      actionItems: {
        unclaimedCustomSlugs: unclaimedSlugs[0].unclaimed,
      },
      recentInvitations,
      mostActiveInvitation: mostActiveInvitation[0] || null,
      recentRSVPs,
      planUsage: planUsage[0] || { max_simple_templates: 3, max_premium_templates: 0 }, // Fallback to free tier
    };

    await redis.set(cacheKey, JSON.stringify(responseData));
    return NextResponse.json({ data: responseData }, { status: STATUS_CODE.OK });
  } catch (error: any) {
    console.error("[USER_OVERVIEW_API]", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: STATUS_CODE.INTERNAL_SERVER_ERROR });
  }
}