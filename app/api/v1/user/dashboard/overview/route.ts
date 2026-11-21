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

    const [stats, recentInvites, mostActive, recentRSVPs, planUsage, unclaimedSlugs] = await Promise.all([
      // 1. Aggregate Stats
      sql`
        SELECT 
          COUNT(DISTINCT i.id)::int as total_invitations,
          COUNT(DISTINCT CASE WHEN i.status = 'published' AND i.expires_at > NOW() THEN i.id END)::int as active_invitations,
          COUNT(DISTINCT CASE WHEN g.attendance_status = 'accepted' THEN g.id END)::int as total_rsvps,
          COALESCE(SUM(CASE WHEN g.attendance_status = 'accepted' THEN g.number_of_guests ELSE 0 END), 0)::int as total_guests,
          COUNT(DISTINCT CASE WHEN g.created_at >= NOW() - INTERVAL '7 days' AND g.attendance_status = 'accepted' THEN g.id END)::int as rsvps_this_week,
          COALESCE(SUM(CASE WHEN g.created_at >= NOW() - INTERVAL '7 days' AND g.attendance_status = 'accepted' THEN g.number_of_guests ELSE 0 END), 0)::int as guests_this_week
        FROM invitations i
        LEFT JOIN guests g ON i.id = g.invitation_id
        WHERE i.user_id = ${userId}
      `,
      // 2. Recent Invitations
      sql`
        SELECT i.id, i.title, i.status, i.slug, i.created_at, COUNT(g.id)::int as rsvp_count
        FROM invitations i
        LEFT JOIN guests g ON i.id = g.invitation_id
        WHERE i.user_id = ${userId}
        GROUP BY i.id
        ORDER BY i.created_at DESC LIMIT 5
      `,
      // 3. Most Active Invitation
      sql`
        SELECT i.id, i.title, COUNT(g.id)::int as rsvp_count
        FROM invitations i
        JOIN guests g ON i.id = g.invitation_id
        WHERE i.user_id = ${userId} AND g.attendance_status = 'accepted'
        GROUP BY i.id
        ORDER BY rsvp_count DESC LIMIT 1
      `,
      // 4. Recent RSVPs
      sql`
        SELECT g.guest_name, g.attendance_status, g.number_of_guests, g.created_at, i.title as invitation_title
        FROM guests g
        JOIN invitations i ON g.invitation_id = i.id
        WHERE i.user_id = ${userId}
        ORDER BY g.created_at DESC LIMIT 5
      `,
      // 5. Plan Usage (Assuming Free tier fallback if no active sub)
      sql`
        SELECT p.max_simple_templates, p.max_premium_templates
        FROM user_subscriptions us
        JOIN plans p ON us.plan_id = p.id
        WHERE us.user_id = ${userId} AND us.status = 'active' AND us.expires_at > NOW()
        LIMIT 1
      `,
      // 6. Unclaimed Custom Slugs
      sql`
        SELECT COUNT(*)::int as count
        FROM template_purchases tp
        WHERE tp.user_id = ${userId} AND tp.has_custom_slug = TRUE
        AND NOT EXISTS (
          SELECT 1 FROM invitations i WHERE i.user_id = ${userId} AND i.is_custom_slug = TRUE
        )
      `
    ]);

    const responseData = {
      stats: stats[0] || { total_invitations: 0, active_invitations: 0, total_rsvps: 0, total_guests: 0, rsvps_this_week: 0, guests_this_week: 0 },
      recentInvitations: recentInvites,
      mostActiveInvitation: mostActive[0] || null,
      recentRSVPs: recentRSVPs,
      planUsage: planUsage[0] || { max_simple_templates: 3, max_premium_templates: 0 }, // Default free tier
      actionItems: { unclaimedCustomSlugs: unclaimedSlugs[0]?.count || 0 }
    };

    await redis.setEx(cacheKey, 60, JSON.stringify(responseData)); // 1 min cache
    return NextResponse.json({ data: responseData }, { status: STATUS_CODE.OK });
  } catch (error: any) {
    console.error("[USER_OVERVIEW_API]", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: STATUS_CODE.INTERNAL_SERVER_ERROR });
  }
}