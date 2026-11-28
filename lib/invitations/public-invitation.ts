// lib/invitations/public-invitation.ts
import { sql } from "@/db/connections/postgres_connection";

export const SLUG_RE = /^[\w-]{1,100}$/;
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export type PublicInvitation = {
  id: string;
  slug: string;
  title: string;
  /** YYYY-MM-DD */
  eventDate: string | null;
  /** HH:mm */
  eventTime: string | null;
  expiresAt: string | null;
  designSchema: Record<string, any>;
  musicUrl: string | null;
  venue: Record<string, any>;
};

export type PublicLookup =
  | { state: "ok"; invitation: PublicInvitation }
  | { state: "expired" }
  | { state: "missing" };

const asObj = (v: unknown): Record<string, any> => {
  let x = v;
  if (typeof x === "string") {
    try {
      x = JSON.parse(x);
    } catch {
      return {};
    }
  }
  return x && typeof x === "object" && !Array.isArray(x) ? (x as Record<string, any>) : {};
};

const httpsOnly = (v: unknown): string | null =>
  typeof v === "string" && /^https:\/\//i.test(v.trim()) ? v.trim() : null;

/* -------------------------------------------------------------------------- */
/*  Short-lived in-memory cache + request coalescing                           */
/* -------------------------------------------------------------------------- */
// Caches the raw DB row (not the final state), so expiry is still checked on every call.
// Missing invitations are never cached. TTL matches the route's 30s CDN window.
type Row = Record<string, any>;
const TTL_MS = 15_000;
const MAX_ENTRIES = 500;
const cache = new Map<string, { at: number; row: Row }>();
const inflight = new Map<string, Promise<Row | null>>();

async function fetchRow(slug: string, lower: string): Promise<Row | null> {
  // Slug match first (idx_invitations_slug_lower), then primary key only if it is a UUID.
  // A slug match always wins over an id match, same as the old ORDER BY.
  const rows = UUID_RE.test(slug)
    ? await sql`
        SELECT id, slug, title, status, event_date, event_time, expires_at,
               design_schema, selected_music_url, venue_details
        FROM (
          SELECT 0 AS ord, id, slug, title, status,
                 event_date::text AS event_date, event_time::text AS event_time,
                 expires_at, design_schema, selected_music_url, venue_details
          FROM invitations WHERE LOWER(slug) = ${lower}
          UNION ALL
          SELECT 1 AS ord, id, slug, title, status,
                 event_date::text AS event_date, event_time::text AS event_time,
                 expires_at, design_schema, selected_music_url, venue_details
          FROM invitations WHERE id = ${slug}::uuid
        ) m
        ORDER BY ord
        LIMIT 1
      `
    : await sql`
        SELECT id, slug, title, status,
               event_date::text AS event_date, event_time::text AS event_time,
               expires_at, design_schema, selected_music_url, venue_details
        FROM invitations
        WHERE LOWER(slug) = ${lower}
        LIMIT 1
      `;
  return (rows[0] as Row | undefined) ?? null;
}

async function loadRow(slug: string): Promise<Row | null> {
  const lower = slug.toLowerCase();
  const now = Date.now();

  const hit = cache.get(lower);
  if (hit && now - hit.at < TTL_MS) return hit.row;

  // Many guests opening the same link at once share ONE database query.
  const pending = inflight.get(lower);
  if (pending) return pending;

  const p = fetchRow(slug, lower)
    .then((row) => {
      if (row) {
        if (cache.size >= MAX_ENTRIES) cache.delete(cache.keys().next().value as string);
        cache.set(lower, { at: Date.now(), row });
      }
      return row;
    })
    .finally(() => inflight.delete(lower));

  inflight.set(lower, p);
  return p;
}

export async function getPublicInvitation(slug: string): Promise<PublicLookup> {
  if (!SLUG_RE.test(slug)) return { state: "missing" };

  const row = await loadRow(slug);

  if (!row || row.status === "draft" || row.status === "archived") return { state: "missing" };

  const expired =
    row.status === "expired" ||
    (row.expires_at && new Date(row.expires_at).getTime() <= Date.now());
  if (expired) return { state: "expired" };

  const schema = asObj(row.design_schema);
  const fromSchema = Array.isArray(schema.musicUrls) ? httpsOnly(schema.musicUrls[0]) : null;

  return {
    state: "ok",
    invitation: {
      id: row.id,
      slug: row.slug,
      title: String(row.title ?? ""),
      eventDate: row.event_date ?? null,
      eventTime: row.event_time ? String(row.event_time).slice(0, 5) : null,
      expiresAt: row.expires_at ? new Date(row.expires_at).toISOString() : null,
      designSchema: schema,
      musicUrl: httpsOnly(row.selected_music_url) ?? fromSchema,
      venue: asObj(row.venue_details),
    },
  };
}