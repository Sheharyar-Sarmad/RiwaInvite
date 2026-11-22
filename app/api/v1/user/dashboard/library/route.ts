// app/api/v1/user/dashboard/library/route.ts
import { NextRequest, NextResponse } from "next/server";
import { sql } from "@/db/connections/postgres_connection";
import { getRedisClient } from "@/db/connections/redis_connection";
import { errorResponse, pgErrorToResponse } from "@/lib/api/errors";
import { STATUS_CODE } from "@/lib/status_codes";
import {
  LIBRARY_PAGE_SIZES,
  type LibraryItem,
  type LibraryPayload,
  type LibrarySummary,
} from "@/lib/types/library";

const CACHE_TTL_SECONDS = 300;
const MAX_PAGE = 500;
const MAX_SEARCH_LENGTH = 100;

const USAGE_FILTERS = ["all", "used", "unused"] as const;
const SORTS = ["recent", "name"] as const;

type Redis = Awaited<ReturnType<typeof getRedisClient>>;
type CountRow = { total: number };
type ItemRow = LibraryItem & { total_count: number };

const EMPTY_SUMMARY: LibrarySummary = { total: 0, premium: 0, used: 0, custom_slugs: 0 };

// Summary ignores filters, so it is cached per user and shared by every request
// (including search requests, which skip the payload cache).
// "v2" in the key retires the old shape that had a `free` field.
async function getSummary(userId: string, redis: Redis | null): Promise<LibrarySummary> {
  const key = `library_summary:v2:${userId}`;

  if (redis) {
    try {
      const cached = await redis.get(key);
      if (cached) return JSON.parse(cached) as LibrarySummary;
    } catch (e) {
      console.warn("[LIBRARY_CACHE] Summary read failed:", e);
    }
  }

  const rows = await sql<LibrarySummary[]>`
    SELECT
      COUNT(*)::int AS total,
      COUNT(*) FILTER (WHERE t.is_premium)::int AS premium,
      COUNT(*) FILTER (WHERE inv.template_id IS NOT NULL)::int AS used,
      COUNT(*) FILTER (WHERE tp.has_custom_slug)::int AS custom_slugs
    FROM template_purchases tp
    JOIN templates t ON t.id = tp.template_id
    LEFT JOIN (
      SELECT DISTINCT template_id
      FROM invitations
      WHERE user_id = ${userId} AND template_id IS NOT NULL
    ) inv ON inv.template_id = t.id
    WHERE tp.user_id = ${userId}
  `;
  const summary = rows[0] ?? EMPTY_SUMMARY;

  if (redis) {
    try {
      await redis.setEx(key, CACHE_TTL_SECONDS, JSON.stringify(summary));
    } catch (e) {
      console.warn("[LIBRARY_CACHE] Summary write failed:", e);
    }
  }
  return summary;
}

// GET: My Library — owned templates, paginated, searchable, cached.
export async function GET(req: NextRequest) {
  // Identity is injected by proxy.ts after session verification — never from the client.
  const userId = req.headers.get("x-user-id");
  if (!userId) {
    return errorResponse(
      STATUS_CODE.UNAUTHORIZED,
      "UNAUTHORIZED",
      "You must be signed in to view your library.",
    );
  }

  const sp = req.nextUrl.searchParams;

  // Every cache-key component is allowlist-clamped → bounded keyspace, no flooding.
  const rawLimit = Number(sp.get("limit"));
  const limit: number = (LIBRARY_PAGE_SIZES as readonly number[]).includes(rawLimit)
    ? rawLimit
    : 12;
  const page = Math.min(MAX_PAGE, Math.max(1, Math.floor(Number(sp.get("page")) || 1)));
  const offset = (page - 1) * limit;

  const usage = sp.get("usage") ?? "all";
  const sort = sp.get("sort") ?? "recent";
  const search = (sp.get("search") ?? "").trim().slice(0, MAX_SEARCH_LENGTH);

  if (!(USAGE_FILTERS as readonly string[]).includes(usage)) {
    return errorResponse(STATUS_CODE.BAD_REQUEST, "INVALID_USAGE", "Invalid usage filter. Use all, used or unused.");
  }
  if (!(SORTS as readonly string[]).includes(sort)) {
    return errorResponse(STATUS_CODE.BAD_REQUEST, "INVALID_SORT", "Invalid sort. Use recent or name.");
  }

  // Search-keyed requests never read or write the payload cache.
  const useCache = search === "";
  const cacheKey = `library:v2:${userId}:p=${page}:l=${limit}:usage=${usage}:sort=${sort}`;

  // One Redis connection per request, shared by the payload and summary caches.
  let redis: Redis | null = null;
  try {
    redis = await getRedisClient();
  } catch (e) {
    console.warn("[LIBRARY_CACHE] Redis unavailable, using Postgres only:", e);
  }

  if (useCache && redis) {
    try {
      const cached = await redis.get(cacheKey);
      if (cached) {
        return NextResponse.json(
          { data: JSON.parse(cached) as LibraryPayload },
          { status: STATUS_CODE.OK },
        );
      }
    } catch (e) {
      console.warn("[LIBRARY_CACHE] Read failed, falling back to Postgres:", e);
    }
  }

  try {
    const conditions = [sql`tp.user_id = ${userId}`];
    // `inv` is a single pre-aggregated join, so usage filters don't re-scan invitations per row.
    if (usage === "used") conditions.push(sql`inv.cnt IS NOT NULL`);
    if (usage === "unused") conditions.push(sql`inv.cnt IS NULL`);
    if (search) {
      const pattern = `%${search}%`;
      conditions.push(sql`(t.name ILIKE ${pattern} OR c.name ILIKE ${pattern})`);
    }
    const whereClause = conditions.reduce((acc, curr) => sql`${acc} AND ${curr}`);

    // Tie-breaker keeps pagination deterministic across pages.
    const orderBy =
      sort === "name" ? sql`t.name ASC, t.id ASC` : sql`tp.purchased_at DESC, t.id DESC`;

    const fromClause = sql`
      FROM template_purchases tp
      JOIN templates t ON t.id = tp.template_id
      JOIN template_categories c ON c.id = t.category_id
      LEFT JOIN (
        SELECT template_id, COUNT(*)::int AS cnt
        FROM invitations
        WHERE user_id = ${userId}
        GROUP BY template_id
      ) inv ON inv.template_id = t.id
      WHERE ${whereClause}
    `;

    const [rows, summary] = await Promise.all([
      sql<ItemRow[]>`
        SELECT
          t.id,
          t.name,
          t.description,
          t.thumbnail_url,
          t.is_premium,
          t.status,
          t.allows_custom_slug,
          t.custom_slug_price::float AS custom_slug_price,
          c.name AS category_name,
          tp.price_paid::float AS price_paid,
          tp.has_custom_slug,
          'purchase' AS acquisition, -- becomes tp.acquisition when subscription claims ship
          tp.purchased_at,
          COALESCE(inv.cnt, 0) AS invitation_count,
          COUNT(*) OVER()::int AS total_count
        ${fromClause}
        ORDER BY ${orderBy}
        LIMIT ${limit} OFFSET ${offset}
      `,
      getSummary(userId, redis),
    ]);

    // Total comes from the window count. If the page is past the end there are no
    // rows to read it from, so fall back to a single count query in that rare case.
    let total = rows[0]?.total_count ?? 0;
    if (rows.length === 0 && offset > 0) {
      const countRows = await sql<CountRow[]>`SELECT COUNT(*)::int AS total ${fromClause}`;
      total = countRows[0]?.total ?? 0;
    }

    const items: LibraryItem[] = rows.map(({ total_count: _omit, ...item }) => item);

    const payload: LibraryPayload = {
      items,
      meta: { page, limit, total, total_pages: Math.ceil(total / limit) },
      summary,
    };

    // Fire-safe: a cache write failure never turns a good DB read into a 500.
    if (useCache && redis) {
      try {
        await redis.setEx(cacheKey, CACHE_TTL_SECONDS, JSON.stringify(payload));
      } catch (e) {
        console.warn("[LIBRARY_CACHE] Write failed (response unaffected):", e);
      }
    }

    // Nested under `data` so DashboardUI's fetcher (r.data.data) unwraps it.
    return NextResponse.json({ data: payload }, { status: STATUS_CODE.OK });
  } catch (err) {
    return pgErrorToResponse(err);
  }
}