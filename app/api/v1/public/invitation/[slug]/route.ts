// app/api/v1/public/invitation/[slug]/route.ts
import { NextRequest, NextResponse } from "next/server";
import { sql } from "@/db/connections/postgres_connection";
import { errorResponse, pgErrorToResponse } from "@/lib/api/errors";
import { STATUS_CODE } from "@/lib/status_codes";
import { SLUG_RE, getPublicInvitation } from "@/lib/invitations/public-invitation";

/* -------------------------------------------------------------------------- */
/*  GET: public invitation data (no auth)                                      */
/* -------------------------------------------------------------------------- */
export async function GET(_req: NextRequest, { params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  if (!SLUG_RE.test(slug)) {
    return errorResponse(STATUS_CODE.BAD_REQUEST, "INVALID_SLUG", "Invalid invitation link");
  }
  try {
    const r = await getPublicInvitation(slug);
    if (r.state === "missing") {
      return errorResponse(STATUS_CODE.NOT_FOUND, "NOT_FOUND", "Invitation not found");
    }
    if (r.state === "expired") {
      return NextResponse.json({ error: { code: "EXPIRED", message: "This invitation has ended." } }, { status: 410 });
    }
    return NextResponse.json(
      { data: r.invitation },
      { status: STATUS_CODE.OK, headers: { "Cache-Control": "public, s-maxage=30, stale-while-revalidate=60" } },
    );
  } catch (err) {
    console.error("[PUBLIC_INVITATION_GET_ERROR]", err);
    return pgErrorToResponse(err);
  }
}

/* -------------------------------------------------------------------------- */
/*  POST: guest RSVP                                                           */
/* -------------------------------------------------------------------------- */
// "pending" = a wish / comment without an RSVP
const STATUSES = new Set(["attending", "declined", "maybe", "pending"]);
const WINDOW_MS = 10 * 60_000;
const MAX_PER_WINDOW = 5;
const hits = new Map<string, number[]>();

/** Small in-memory limiter. Use Redis/Upstash if you run several instances. */
function limited(key: string): boolean {
  const now = Date.now();
  const list = (hits.get(key) ?? []).filter((t) => now - t < WINDOW_MS);
  if (list.length >= MAX_PER_WINDOW) {
    hits.set(key, list);
    return true;
  }
  list.push(now);
  hits.set(key, list);
  if (hits.size > 5000) for (const [k, v] of hits) if (!v.some((t) => now - t < WINDOW_MS)) hits.delete(k);
  return false;
}

export async function POST(req: NextRequest, { params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  if (!SLUG_RE.test(slug)) {
    return errorResponse(STATUS_CODE.BAD_REQUEST, "INVALID_SLUG", "Invalid invitation link");
  }

  const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "unknown";
  if (limited(`${slug.toLowerCase()}:${ip}`)) {
    return NextResponse.json(
      { error: { code: "RATE_LIMITED", message: "Too many replies. Please try again in a few minutes." } },
      { status: 429 },
    );
  }

  const body = await req.json().catch(() => null);
  const name = typeof body?.guest_name === "string" ? body.guest_name.trim().replace(/\s+/g, " ") : "";
  const status = body?.attendance_status;
  const comment = typeof body?.comment === "string" ? body.comment.trim().slice(0, 500) : "";
  const count = Math.min(10, Math.max(1, Math.trunc(Number(body?.number_of_guests) || 1)));

  if (name.length < 2 || name.length > 100) {
    return errorResponse(STATUS_CODE.BAD_REQUEST, "INVALID_NAME", "Please enter your name (2 to 100 characters).");
  }
  if (status === "pending" && comment.length < 2) {
    return errorResponse(STATUS_CODE.BAD_REQUEST, "INVALID_COMMENT", "Please write a short message.");
  }
  if (typeof status !== "string" || !STATUSES.has(status)) {
    return errorResponse(STATUS_CODE.BAD_REQUEST, "INVALID_STATUS", "Please choose how you'll respond.");
  }

  try {
    const [inv] = await sql`
      SELECT id, user_id, title, status, expires_at
      FROM invitations
      WHERE LOWER(slug) = LOWER(${slug}) OR id::text = ${slug}
      ORDER BY (LOWER(slug) = LOWER(${slug})) DESC
      LIMIT 1
    `;
    const live =
      inv &&
      inv.status === "published" &&
      (!inv.expires_at || new Date(inv.expires_at).getTime() > Date.now());
    if (!live) return errorResponse(STATUS_CODE.NOT_FOUND, "NOT_FOUND", "Invitation not found");

    const guests = status === "declined" ? 1 : count;
    const [row] = await sql`
      INSERT INTO guests (invitation_id, guest_name, attendance_status, number_of_guests, comment)
      VALUES (${inv.id}, ${name}, ${status}, ${guests}, ${comment || null})
      RETURNING id
    `;

    // Tell the host. A failure here must never fail the RSVP.
    try {
      const verb =
        status === "attending" ? "is coming" : status === "declined" ? "can't make it" : status === "maybe" ? "might come" : "left a message";
      await sql`
        INSERT INTO notifications (user_id, title, message)
        VALUES (${inv.user_id}, ${"New RSVP"}, ${`${name} ${verb} to “${String(inv.title).slice(0, 60)}”.`})
      `;
    } catch (e) {
      console.warn("[RSVP_NOTIFY_FAILED]", e);
    }

    return NextResponse.json({ data: { id: row.id } }, { status: STATUS_CODE.CREATED ?? 201 });
  } catch (err) {
    console.error("[PUBLIC_RSVP_ERROR]", err);
    return pgErrorToResponse(err);
  }
}