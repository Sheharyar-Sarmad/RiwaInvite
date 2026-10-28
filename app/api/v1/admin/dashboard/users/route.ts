import { NextRequest, NextResponse } from "next/server";
import crypto from "crypto";
import { sql } from "@/lib/db";
import { STATUS_CODE } from "@/lib/status_codes";
import settings from "@/config/settings_config";
import { getRedisClient } from "@/db/connections/redis_connection";

export const instant = false;

// ─── Cache helpers (local to this file) ──────────────────────
const USERS_LIST_VERSION_KEY = "users:list:version";
const USERS_LIST_TTL_SECONDS = 60;
const DELETED_SUFFIX = "@deleted.riwainvite.local";

function hashQuery(sp: URLSearchParams): string {
  const entries = [...sp.entries()].sort(([a], [b]) => a.localeCompare(b));
  return crypto.createHash("sha1").update(JSON.stringify(entries)).digest("hex");
}

async function getUserListVersion(): Promise<number> {
  try {
    const client = await getRedisClient();
    const v = await client.get(USERS_LIST_VERSION_KEY);
    if (v === null) {
      await client.set(USERS_LIST_VERSION_KEY, "1", { NX: true });
      return 1;
    }
    const parsed = Number(v);
    return Number.isFinite(parsed) && parsed > 0 ? parsed : 1;
  } catch (err) {
    return 1;
  }
}

async function getCachedJson<T>(key: string): Promise<T | null> {
  try {
    const client = await getRedisClient();
    const raw = await client.get(key);
    return raw ? (JSON.parse(raw) as T) : null;
  } catch (err) {
    return null;
  }
}

async function setCachedJson(key: string, value: unknown, ttlSeconds = USERS_LIST_TTL_SECONDS): Promise<void> {
  try {
    const client = await getRedisClient();
    await client.set(key, JSON.stringify(value), { EX: ttlSeconds });
  } catch (err) {}
}
// ─────────────────────────────────────────────────────────────

type UserListRow = {
  id: string;
  first_name: string;
  last_name: string;
  email: string;
  phone_number: string | null;
  created_at: string;
  is_deleted: boolean;
  plan_id: string | null;
  plan_name: string | null;
  subscription_status: string | null;
  subscription_expires_at: string | null;
  purchase_count: number;
  invitation_count: number;
  live_invitation_count: number;
  order_count: number;
  last_order_at: string | null;
  _total_count?: number; // <── Added for the window function
};

type UsersListPayload = {
  status: "success";
  data: {
    users: UserListRow[];
    pagination: {
      page: number;
      limit: number;
      total: number;
      total_pages: number;
      has_more: boolean;
    };
  };
};

export async function GET(req: NextRequest) {
  const adminId = req.headers.get("x-admin-id");
  if (!adminId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const sp = req.nextUrl.searchParams;
  const version = await getUserListVersion();
  const cacheKey = `users:list:v${version}:${hashQuery(sp)}`;

  const cached = await getCachedJson<UsersListPayload>(cacheKey);
  if (cached) {
    return NextResponse.json(cached, {
      headers: { "X-Cache": "HIT", "Cache-Control": "private, no-store" },
    });
  }

  // ── 2. Parse filters ───────────────────────────────────────
  const q = (sp.get("q") ?? "").trim();
  const status = sp.get("status") ?? "all";
  const planId = sp.get("plan_id");
  const hasSubscription = sp.get("has_subscription");
  const hasPurchases = sp.get("has_purchases");
  const createdFrom = sp.get("created_from");
  const createdTo = sp.get("created_to");

  const page = Math.max(1, Number.parseInt(sp.get("page") ?? "1", 10) || 1);
  const limit = Math.min(100, Math.max(1, Number.parseInt(sp.get("limit") ?? "20", 10) || 20));
  const offset = (page - 1) * limit;

  const sortFields: Record<string, string> = {
    created_at: "u.created_at",
    first_name: "u.first_name",
    last_name: "u.last_name",
    email: "u.email",
    subscription_expires_at: "sub.expires_at",
  };
  const orderBy = sortFields[sp.get("sort") ?? "created_at"] ?? "u.created_at";
  const orderDir = sp.get("order")?.toLowerCase() === "asc" ? "ASC" : "DESC";

  const where: string[] = [];
  const params: any[] = [];
  let i = 1;

  if (q) {
    where.push(`(u.first_name ILIKE $${i} OR u.last_name ILIKE $${i} OR u.email ILIKE $${i} OR COALESCE(u.phone_number,'') ILIKE $${i})`);
    params.push(`%${q}%`);
    i++;
  }
  if (status === "deleted") where.push(`u.email LIKE '%${DELETED_SUFFIX}'`);
  else if (status === "active") where.push(`u.email NOT LIKE '%${DELETED_SUFFIX}'`);
  else if (status === "subscribed") where.push(`EXISTS (SELECT 1 FROM user_subscriptions us WHERE us.user_id = u.id AND us.status = 'active' AND us.expires_at > now())`);
  else if (status === "unsubscribed") where.push(`NOT EXISTS (SELECT 1 FROM user_subscriptions us WHERE us.user_id = u.id AND us.status = 'active' AND us.expires_at > now())`);

  if (planId) {
    where.push(`EXISTS (SELECT 1 FROM user_subscriptions us2 WHERE us2.user_id = u.id AND us2.plan_id = $${i}::uuid AND us2.status = 'active' AND us2.expires_at > now())`);
    params.push(planId);
    i++;
  }
  if (hasSubscription === "true") where.push(`EXISTS (SELECT 1 FROM user_subscriptions us3 WHERE us3.user_id = u.id AND us3.status = 'active' AND us3.expires_at > now())`);
  else if (hasSubscription === "false") where.push(`NOT EXISTS (SELECT 1 FROM user_subscriptions us3 WHERE us3.user_id = u.id AND us3.status = 'active' AND us3.expires_at > now())`);
  if (hasPurchases === "true") where.push(`EXISTS (SELECT 1 FROM template_purchases tp WHERE tp.user_id = u.id)`);
  else if (hasPurchases === "false") where.push(`NOT EXISTS (SELECT 1 FROM template_purchases tp WHERE tp.user_id = u.id)`);

  if (createdFrom) { where.push(`u.created_at >= $${i}::timestamptz`); params.push(createdFrom); i++; }
  if (createdTo) { where.push(`u.created_at <= $${i}::timestamptz`); params.push(createdTo); i++; }

  const whereSql = where.length ? `WHERE ${where.join(" AND ")}` : "";

  // ── 3. Query Postgres (Single Query!) ──────────────────────
  try {
    console.time("[TIMER] DB Single Query");
    const rows = await sql.unsafe<UserListRow[]>(
      `SELECT
         u.id,
         u.first_name,
         u.last_name,
         u.email,
         u.phone_number,
         u.created_at,
         (u.email LIKE '%${DELETED_SUFFIX}') AS is_deleted,
         
         (SELECT p.id FROM user_subscriptions us JOIN plans p ON p.id = us.plan_id 
          WHERE us.user_id = u.id ORDER BY (us.status IN ('active','past_due') AND us.expires_at > now()) DESC, us.expires_at DESC NULLS LAST LIMIT 1) AS plan_id,
         
         (SELECT p.name FROM user_subscriptions us JOIN plans p ON p.id = us.plan_id 
          WHERE us.user_id = u.id ORDER BY (us.status IN ('active','past_due') AND us.expires_at > now()) DESC, us.expires_at DESC NULLS LAST LIMIT 1) AS plan_name,
         
         (SELECT us.status FROM user_subscriptions us 
          WHERE us.user_id = u.id ORDER BY (us.status IN ('active','past_due') AND us.expires_at > now()) DESC, us.expires_at DESC NULLS LAST LIMIT 1) AS subscription_status,
         
         (SELECT us.expires_at FROM user_subscriptions us 
          WHERE us.user_id = u.id ORDER BY (us.status IN ('active','past_due') AND us.expires_at > now()) DESC, us.expires_at DESC NULLS LAST LIMIT 1) AS subscription_expires_at,

         (SELECT COUNT(*)::int FROM template_purchases tp WHERE tp.user_id = u.id) AS purchase_count,
         (SELECT COUNT(*)::int FROM invitations i WHERE i.user_id = u.id) AS invitation_count,
         (SELECT COUNT(*)::int FROM invitations i WHERE i.user_id = u.id AND i.status = 'published' AND (i.expires_at IS NULL OR i.expires_at > now())) AS live_invitation_count,
         (SELECT COUNT(*)::int FROM orders o WHERE o.user_id = u.id) AS order_count,
         (SELECT MAX(created_at) FROM orders o WHERE o.user_id = u.id) AS last_order_at,

         COUNT(*) OVER()::int AS _total_count -- <── Window Function for Total Count
       FROM users u
       ${whereSql}
       ORDER BY ${orderBy} ${orderDir}
       LIMIT $${i} OFFSET $${i + 1}`,
      [...params, limit, offset],
    );
    console.timeEnd("[TIMER] DB Single Query");

    // Extract total count and strip it from the user objects
    const total = rows.length > 0 ? rows[0]._total_count || 0 : 0;
    
    const cleanRows = rows.map((row) => {
      const { _total_count, ...user } = row;
      return user;
    });

    const payload: UsersListPayload = {
      status: "success",
      data: {
        users: cleanRows,
        pagination: {
          page,
          limit,
          total,
          total_pages: Math.ceil(total / limit),
          has_more: offset + rows.length < total,
        },
      },
    };

    // Non-blocking cache write
    setCachedJson(cacheKey, payload).catch(console.error);

    return NextResponse.json(payload, {
      headers: { "X-Cache": "MISS", "Cache-Control": "private, no-store" },
    });
  } catch (err: any) {
    console.error("GET /api/v1/admin/dashboard/users error:", err);
    return NextResponse.json(
      { error: settings().isProduction ? "Internal server error" : err.message, status: "error" },
      { status: 500 }
    );
  }
}