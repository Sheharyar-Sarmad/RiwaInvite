import { NextResponse } from "next/server";
import { STATUS_CODE } from "../status_codes"; // adjust path

type PgError = { code?: string; constraint?: string; detail?: string };

export function errorResponse(
  status: (typeof STATUS_CODE)[keyof typeof STATUS_CODE],
  code: string,
  message: string,
  details?: unknown
) {
  return NextResponse.json({ error: { code, message, details } }, { status });
}

/** Maps Postgres errors to friendly HTTP responses. */
export function pgErrorToResponse(err: unknown) {
  const e = err as PgError;

  if (e?.code === "23503" || e?.code === "23001") {
    return errorResponse(
      STATUS_CODE.CONFLICT,
      "CONFLICT",
      "This plan is referenced by existing subscriptions and cannot be removed. Deactivate it instead.",
      { constraint: e.constraint }
    );
  }

  if (e?.code === "23505") {
    return errorResponse(
      STATUS_CODE.CONFLICT,
      "DUPLICATE",
      "A record with these values already exists.",
      { constraint: e.constraint }
    );
  }

  console.error("[pg-error]", err);
  return errorResponse(
    STATUS_CODE.INTERNAL_SERVER_ERROR,
    "INTERNAL",
    "Something went wrong."
  );
}