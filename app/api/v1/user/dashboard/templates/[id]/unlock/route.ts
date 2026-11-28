// app/api/v1/user/dashboard/templates/[id]/unlock/route.ts
import { NextRequest, NextResponse } from "next/server";
import { sql } from "@/db/connections/postgres_connection";
import { getRedisClient } from "@/db/connections/redis_connection";
import { billingCacheKey } from "@/lib/api/billing_cache";
import { errorResponse, pgErrorToResponse } from "@/lib/api/errors";
import { loadAllowance, type PlanAllowance, type Q } from "@/lib/api/plan_allowance";
import { safeInvalidateCache } from "@/lib/api/helpers";
import { STATUS_CODE } from "@/lib/status_codes";

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

type HttpStatus = (typeof STATUS_CODE)[keyof typeof STATUS_CODE];

/** Thrown inside the transaction so it rolls back, then mapped to an HTTP error. */
class Fail extends Error {
  constructor(
    public status: HttpStatus,
    public code: string,
    message: string,
  ) {
    super(message);
  }
}

type LockedSub = { id: string; plan_name: string; max_simple: number; max_premium: number; expires_at: Date | string };
type TemplateRow = { id: string; name: string; is_premium: boolean };

const fmtDate = (v: Date | string) =>
  new Date(v).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" });

const cap = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);

/** Builds the in-app notification the user sees after an unlock. */
function notificationFor(tpl: TemplateRow, a: PlanAllowance) {
  const kind = tpl.is_premium ? "premium" : "simple";
  const otherKind = tpl.is_premium ? "simple" : "premium";
  const bucket = a[kind];
  const other = a[otherKind];
  const exhausted = bucket.left === 0;

  const title = exhausted ? `That was your last ${kind} unlock` : `“${tpl.name}” unlocked with your plan`;

  const message =
    `${exhausted ? `“${tpl.name}” is unlocked. ` : ""}` +
    `${cap(kind)}: ${bucket.used} of ${bucket.max} used, ${bucket.left} left. ` +
    `${cap(otherKind)}: ${other.used} of ${other.max} used, ${other.left} left. ` +
    `Your plan ends ${fmtDate(a.subscription!.expiresAt)}.`;

  return { title: title.slice(0, 100), message };
}

export async function POST(
  req: NextRequest,
  ctx: { params: Promise<{ id: string }> | { id: string } },
) {
  const userId = req.headers.get("x-user-id");
  if (!userId) return errorResponse(401, "UNAUTHORIZED", "You must be signed in.");

  const { id: templateId } = await ctx.params;
  if (!UUID_RE.test(templateId)) return errorResponse(400, "INVALID_TEMPLATE", "That template id isn’t valid.");

  try {
    const result = await sql.begin(async (tx) => {
      const q = tx as unknown as Q;

      // 1. Lock the live subscription row so two taps can't both spend the last slot.
      const [sub] = await q<LockedSub[]>`
        SELECT us.id, p.name AS plan_name, us.expires_at,
               COALESCE(p.max_simple_templates, 0)  AS max_simple,
               COALESCE(p.max_premium_templates, 0) AS max_premium
        FROM user_subscriptions us
        JOIN plans p ON p.id = us.plan_id
        WHERE us.user_id = ${userId} AND us.status = 'active' AND us.expires_at > NOW()
        ORDER BY us.expires_at DESC
        LIMIT 1
        FOR UPDATE OF us
      `;
      if (!sub) throw new Fail(403, "NO_ACTIVE_PLAN", "You need an active plan to unlock templates this way.");

      // 2. The template must exist and be published.
      const [tpl] = await q<TemplateRow[]>`
        SELECT id, name, is_premium FROM templates WHERE id = ${templateId} AND status = 'published'
      `;
      if (!tpl) throw new Fail(404, "TEMPLATE_NOT_FOUND", "That template isn’t available.");

      // 3. Already bought? Then nothing to spend.
      const [bought] = await q<{ one: number }[]>`
        SELECT 1 AS one FROM template_purchases WHERE user_id = ${userId} AND template_id = ${templateId}
      `;
      if (bought) throw new Fail(409, "ALREADY_OWNED", "You already own this template.");

      // 4. Already unlocked in this plan period? Succeed without spending again (safe to retry).
      const [dupe] = await q<{ one: number }[]>`
        SELECT 1 AS one FROM subscription_template_unlocks
        WHERE subscription_id = ${sub.id} AND template_id = ${templateId}
      `;
      if (dupe) {
        return { tpl, allowance: await loadAllowance(q, userId), alreadyUnlocked: true };
      }

      // 5. Enough allowance left for this kind of template?
      const [used] = await q<{ simple_used: number; premium_used: number }[]>`
        SELECT COUNT(*) FILTER (WHERE NOT is_premium)::int AS simple_used,
               COUNT(*) FILTER (WHERE is_premium)::int     AS premium_used
        FROM subscription_template_unlocks WHERE subscription_id = ${sub.id}
      `;
      const max = tpl.is_premium ? sub.max_premium : sub.max_simple;
      const spent = tpl.is_premium ? used?.premium_used ?? 0 : used?.simple_used ?? 0;
      if (spent >= max) {
        const kind = tpl.is_premium ? "premium" : "simple";
        throw new Fail(
          403,
          "QUOTA_EXHAUSTED",
          max === 0
            ? `Your plan doesn’t include ${kind} templates.`
            : `You’ve used all ${max} ${kind} unlocks in your plan.`,
        );
      }

      // 6. Spend one slot.
      await q`
        INSERT INTO subscription_template_unlocks (user_id, subscription_id, template_id, is_premium)
        VALUES (${userId}, ${sub.id}, ${templateId}, ${tpl.is_premium})
      `;

      // 7. Fresh numbers + the notification, in the same transaction.
      const allowance = await loadAllowance(q, userId);
      const n = notificationFor(tpl, allowance);
      await q`INSERT INTO notifications (user_id, title, message) VALUES (${userId}, ${n.title}, ${n.message})`;

      return { tpl, allowance, alreadyUnlocked: false };
    });

    // Billing (60s) and library (5 min) are cached: drop both so the UI updates right away.
    try {
      const redis = await getRedisClient();
      await redis.del(billingCacheKey(userId));
    } catch (e) {
      console.warn("[UNLOCK_CACHE] invalidate failed (response unaffected):", e);
    }
    await safeInvalidateCache(`library:v3:${userId}:*`, `library_summary:v3:${userId}`);

    return NextResponse.json(
      {
        data: {
          template: { id: result.tpl.id, name: result.tpl.name, isPremium: result.tpl.is_premium },
          alreadyUnlocked: result.alreadyUnlocked,
          allowance: result.allowance,
        },
      },
      { status: result.alreadyUnlocked ? 200 : 201 },
    );
  } catch (err) {
    if (err instanceof Fail) return errorResponse(err.status, err.code, err.message);
    return pgErrorToResponse(err);
  }
}