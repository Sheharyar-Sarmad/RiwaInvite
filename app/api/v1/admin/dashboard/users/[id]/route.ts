import { NextRequest, NextResponse } from "next/server";
import { sql } from "@/lib/db";
import { STATUS_CODE } from "@/lib/status_codes";
import settings from "@/config/settings_config";
import { getRedisClient } from "@/db/connections/redis_connection";

export const instant = false;

// ─── Cache helpers (local to this file) ──────────────────────
const USERS_LIST_VERSION_KEY = "users:list:version";
const DELETED_SUFFIX = "@deleted.riwainvite.local";

async function bumpUserListVersion(): Promise<void> {
  try {
    const client = await getRedisClient();
    await client.incr(USERS_LIST_VERSION_KEY);
  } catch (err) {
    console.error("bumpUserListVersion failed:", (err as Error).message);
  }
}

async function delCacheKey(key: string): Promise<void> {
  try {
    const client = await getRedisClient();
    await client.del(key);
  } catch (err) {
    console.error("delCacheKey failed:", (err as Error).message);
  }
}
// ─────────────────────────────────────────────────────────────

type DeleteMode = "soft_delete" | "deactivate";

type DeleteBody = {
  mode?: DeleteMode;
  reason?: string;
};

type BlockerReport = {
  active_subscriptions: number;
  past_due_subscriptions: number;
  pending_orders: number;
  live_invitations_will_be_archived: number;
};

type TxResult =
  | { kind: "not_found" }
  | { kind: "already_deleted"; original_email: string }
  | { kind: "blocked"; blockers: BlockerReport }
  | {
      kind: "deactivated";
      original_email: string;
      cancelled_subscriptions: number;
      revoked_sessions: number;
    }
  | {
      kind: "deleted";
      original_email: string;
      archived_invitations: number;
      cancelled_subscriptions: number;
      revoked_sessions: number;
    };

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const adminId = req.headers.get("x-admin-id");
  if (!adminId) {
    return NextResponse.json(
      { error: "Unauthorized", message: "Unauthorized", status: "error" },
      { status: STATUS_CODE.UNAUTHORIZED },
    );
  }

  const { id } = await params;

  // Body is optional — default mode is soft_delete
  let body: DeleteBody = {};
  try {
    body = (await req.json()) as DeleteBody;
  } catch {
    /* empty body → defaults */
  }

  const mode: DeleteMode =
    body.mode === "deactivate" ? "deactivate" : "soft_delete";
  const reason = body.reason?.trim() || null;

  try {
    // FIXED: Added `tx: any` to resolve the implicit 'any' TypeScript error
    const result = await sql.begin<TxResult>(async (tx: any) => {
      // 1. Lock the user row so concurrent requests can't race
      const [user] = await tx<
        { id: string; email: string; first_name: string; last_name: string }[]
      >`
        SELECT id, email, first_name, last_name
        FROM users
        WHERE id = ${id}
        FOR UPDATE
      `;

      if (!user) return { kind: "not_found" };

      if (user.email.endsWith(DELETED_SUFFIX)) {
        return { kind: "already_deleted", original_email: user.email };
      }

      // 2. Snapshot blockers
      const [blockers] = await tx<
        {
          active_subs: number;
          past_due_subs: number;
          pending_orders: number;
          live_invites: number;
        }[]
      >`
        SELECT
          (SELECT COUNT(*)::int FROM user_subscriptions
             WHERE user_id = ${id} AND status = 'active'   AND expires_at > now())  AS active_subs,
          (SELECT COUNT(*)::int FROM user_subscriptions
             WHERE user_id = ${id} AND status = 'past_due' AND expires_at > now())  AS past_due_subs,
          (SELECT COUNT(*)::int FROM orders
             WHERE user_id = ${id} AND status = 'pending')                          AS pending_orders,
          (SELECT COUNT(*)::int FROM invitations
             WHERE user_id = ${id} AND status = 'published'
               AND (expires_at IS NULL OR expires_at > now()))                      AS live_invites
      `;

      // ── DEACTIVATE ────────────────────────────────────────
      if (mode === "deactivate") {
        const cancelled = await tx`
          UPDATE user_subscriptions
          SET status = 'canceled', updated_at = now()
          WHERE user_id = ${id} AND status IN ('active','past_due')
          RETURNING id
        `;

        const revoked = await tx`
          DELETE FROM user_sessions
          WHERE user_id = ${id}
          RETURNING id
        `;

        await tx`
          INSERT INTO admin_notifications (admin_id, type, title, message)
          VALUES (
            ${adminId},
            'user',
            'User deactivated',
            ${`Deactivated ${user.email}` + (reason ? ` — reason: ${reason}` : "")}
          )
        `;

        return {
          kind: "deactivated",
          original_email: user.email,
          cancelled_subscriptions: cancelled.length,
          revoked_sessions: revoked.length,
        };
      }

      // ── SOFT DELETE ───────────────────────────────────────
      const blocked =
        blockers.active_subs > 0 ||
        blockers.past_due_subs > 0 ||
        blockers.pending_orders > 0;

      if (blocked) {
        return {
          kind: "blocked",
          blockers: {
            active_subscriptions: blockers.active_subs,
            past_due_subscriptions: blockers.past_due_subs,
            pending_orders: blockers.pending_orders,
            live_invitations_will_be_archived: blockers.live_invites,
          },
        };
      }

      const deletedEmail = `deleted-${id}${DELETED_SUFFIX}`;

      // 2a. Anonymize PII
      await tx`
        UPDATE users
        SET email        = ${deletedEmail},
            first_name   = 'Deleted',
            last_name    = 'User',
            phone_number = NULL,
            password     = '!'
        WHERE id = ${id}
      `;

      // 2b. Revoke sessions
      const revoked = await tx`
        DELETE FROM user_sessions
        WHERE user_id = ${id}
        RETURNING id
      `;

      // 2c. Archive invitations so guests don't hit stale pages
      const archived = await tx`
        UPDATE invitations
        SET status = 'archived', updated_at = now()
        WHERE user_id = ${id} AND status <> 'archived'
        RETURNING id
      `;

      // 2d. Clean up any leftover active/past_due subs
      const cancelled = await tx`
        UPDATE user_subscriptions
        SET status = 'canceled', updated_at = now()
        WHERE user_id = ${id} AND status IN ('active','past_due')
        RETURNING id
      `;

      // 2e. Audit
      await tx`
        INSERT INTO admin_notifications (admin_id, type, title, message)
        VALUES (
          ${adminId},
          'user',
          'User deleted',
          ${`Soft-deleted ${user.email}` + (reason ? ` — reason: ${reason}` : "")}
        )
      `;

      return {
        kind: "deleted",
        original_email: user.email,
        archived_invitations: archived.length,
        cancelled_subscriptions: cancelled.length,
        revoked_sessions: revoked.length,
      };
    });

    // ── Post-transaction responses ────────────────────────
    if (result.kind === "not_found") {
      return NextResponse.json(
        { error: "User not found", message: "User not found", status: "error" },
        { status: STATUS_CODE.NOT_FOUND },
      );
    }

    if (result.kind === "already_deleted") {
      return NextResponse.json(
        {
          error: "ALREADY_DELETED",
          message: "This account has already been anonymized.",
          status: "error",
        },
        { status: STATUS_CODE.CONFLICT },
      );
    }

    if (result.kind === "blocked") {
      return NextResponse.json(
        {
          error: "DELETION_BLOCKED",
          message:
            "This user still has active services. Deactivate the account, or resolve the blockers first.",
          status: "error",
          blockers: result.blockers,
        },
        { status: STATUS_CODE.CONFLICT },
      );
    }

    // Invalidate caches on a real mutation
    await Promise.all([
      bumpUserListVersion(),
      delCacheKey(`users:detail:${id}`),
    ]);

    if (result.kind === "deactivated") {
      return NextResponse.json({
        status: "success",
        message: "User deactivated.",
        data: {
          id,
          mode,
          original_email: result.original_email,
          cancelled_subscriptions: result.cancelled_subscriptions,
          revoked_sessions: result.revoked_sessions,
        },
      });
    }

    return NextResponse.json({
      status: "success",
      message: "User deleted and anonymized.",
      data: {
        id,
        mode,
        original_email: result.original_email,
        archived_invitations: result.archived_invitations,
        cancelled_subscriptions: result.cancelled_subscriptions,
        revoked_sessions: result.revoked_sessions,
      },
    });
  } catch (err: any) {
    console.error("DELETE /admin/dashboard/users/[id] error:", err);
    return NextResponse.json(
      {
        error: settings().isProduction ? "Internal server error" : err.message,
        message: "Internal server error",
        status: "error",
      },
      { status: STATUS_CODE.INTERNAL_SERVER_ERROR },
    );
  }
}