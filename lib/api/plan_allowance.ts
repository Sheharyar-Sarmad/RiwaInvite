// lib/api/plan_allowance.ts
import { sql } from "@/db/connections/postgres_connection";

/** Works for both `sql` and a `sql.begin` transaction handle. */
export type Q = typeof sql;

export type Bucket = { max: number; used: number; left: number };

export type UnlockedTemplate = {
  id: string;
  name: string;
  description: string;
  category_name: string;
  thumbnail_url: string;
  is_premium: boolean;
  price: number;
};

export type PlanAllowance = {
  subscription: {
    id: string;
    planName: string;
    expiresAt: string;
    daysRemaining: number;
    allowsCustomSlug: boolean; // ADD (1/3)
  } | null;
  simple: Bucket;
  premium: Bucket;
  unlocked: UnlockedTemplate[];
};

const iso = (v: Date | string | null | undefined): string => {
  if (!v) return "";
  const d = v instanceof Date ? v : new Date(v);
  return Number.isNaN(d.getTime()) ? "" : d.toISOString();
};

const bucket = (max: number, used: number): Bucket => ({ max, used, left: Math.max(0, max - used) });
const EMPTY: Bucket = { max: 0, used: 0, left: 0 };

type SubRow = {
  id: string;
  plan_name: string;
  expires_at: Date | string;
  days_remaining: number;
  max_simple: number;
  max_premium: number;
  simple_used: number;
  premium_used: number;
  allows_custom_slug: boolean | null; // ADD (2/3)
};

/** Live subscription + how many unlocks of each kind are used. Always fresh, never cached. */
export async function loadAllowance(q: Q, userId: string): Promise<PlanAllowance> {
  const [s] = await q<SubRow[]>`
    SELECT us.id, p.name AS plan_name, us.expires_at,
           p.allows_custom_slug,
           GREATEST(0, CEIL(EXTRACT(EPOCH FROM (us.expires_at - NOW())) / 86400))::int AS days_remaining,
           COALESCE(p.max_simple_templates, 0)  AS max_simple,
           COALESCE(p.max_premium_templates, 0) AS max_premium,
           (SELECT COUNT(*) FILTER (WHERE NOT ut.is_premium)::int
              FROM subscription_template_unlocks ut WHERE ut.subscription_id = us.id) AS simple_used,
           (SELECT COUNT(*) FILTER (WHERE ut.is_premium)::int
              FROM subscription_template_unlocks ut WHERE ut.subscription_id = us.id) AS premium_used
    FROM user_subscriptions us
    JOIN plans p ON p.id = us.plan_id
    WHERE us.user_id = ${userId} AND us.status = 'active' AND us.expires_at > NOW()
    ORDER BY us.expires_at DESC
    LIMIT 1
  `;
  if (!s) return { subscription: null, simple: EMPTY, premium: EMPTY, unlocked: [] };

  const unlocked = await q<UnlockedTemplate[]>`
    SELECT t.id, t.name, COALESCE(t.description, '') AS description,
           c.name AS category_name, t.thumbnail_url, t.is_premium, t.price::float AS price
    FROM subscription_template_unlocks ut
    JOIN templates t ON t.id = ut.template_id
    JOIN template_categories c ON c.id = t.category_id
    WHERE ut.subscription_id = ${s.id}
    ORDER BY ut.created_at DESC
  `;

  return {
    subscription: {
      id: s.id,
      planName: s.plan_name,
      expiresAt: iso(s.expires_at),
      daysRemaining: s.days_remaining,
      allowsCustomSlug: Boolean(s.allows_custom_slug), // ADD (3/3)
    },
    simple: bucket(s.max_simple, s.simple_used),
    premium: bucket(s.max_premium, s.premium_used),
    unlocked,
  };
}