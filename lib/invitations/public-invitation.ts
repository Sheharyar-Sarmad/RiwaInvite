// lib/invitations/public-invitation.ts
import { sql } from "@/db/connections/postgres_connection";

export const SLUG_RE = /^[\w-]{1,100}$/;

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

export async function getPublicInvitation(slug: string): Promise<PublicLookup> {
  if (!SLUG_RE.test(slug)) return { state: "missing" };

  const [row] = await sql`
    SELECT id, slug, title, status,
           event_date::text AS event_date,
           event_time::text AS event_time,
           expires_at, design_schema, selected_music_url, venue_details
    FROM invitations
    WHERE LOWER(slug) = LOWER(${slug}) OR id::text = ${slug}
    ORDER BY (LOWER(slug) = LOWER(${slug})) DESC
    LIMIT 1
  `;

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