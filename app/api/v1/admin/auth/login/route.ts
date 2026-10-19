import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { z } from "zod";
import { sql } from "@/db/connections/postgres_connection";
import { getRedisClient } from "@/db/connections/redis_connection";
import { verifyPassword, generateSessionToken, hashSessionToken } from "@/lib/auth";
import settings from "@/config/settings_config";
import { STATUS_CODE } from "@/lib/status_codes";

const config = settings();

// 1. Zod Validation Schema for Login
const loginSchema = z.object({
  email: z.string().email("Invalid email format").toLowerCase(),
  password: z.string().min(1, "Password is required"),
});

export async function POST(request: Request) {
  try {
    const body = await request.json().catch(() => null);

    if (!body) {
      return NextResponse.json(
        {
          status: "error",
          message: "Invalid or missing JSON body",
          data: null,
          error: "Bad Request",
        },
        { status: STATUS_CODE.BAD_REQUEST }
      );
    }

    // 2. Validate Input
    const validation = loginSchema.safeParse(body);

    if (!validation.success) {
      return NextResponse.json(
        {
          status: "error",
          message: "Validation failed",
          data: null,
          error: validation.error.flatten().fieldErrors,
        },
        { status: STATUS_CODE.BAD_REQUEST }
      );
    }

    const { email, password } = validation.data;
    const ip = request.headers.get("x-forwarded-for") || "unknown";

    // 3. Rate Limiting (Redis)
    const redis = await getRedisClient();
    const rateLimitKey = `admin_login_attempts:${ip}`;
    const attempts = await redis.incr(rateLimitKey);
    
    if (attempts === 1) {
      await redis.expire(rateLimitKey, 900); // 15 minutes
    }
    if (attempts > 5) {
      return NextResponse.json(
        {
          status: "error",
          message: "Too many login attempts. Try again in 15 minutes.",
          data: null,
          error: "Too Many Requests",
        },
        { status: STATUS_CODE.TOO_MANY_REQUESTS } // 429
      );
    }

    // 4. Find Admin
    const admins = await sql`
      SELECT id, password FROM admins WHERE LOWER(email) = LOWER(${email}) LIMIT 1
    `;
    const admin = admins[0];

    // 5. Verify Password (Timing attack prevention)
    const dummyHash = "$2b$12$dummyhashdummyhashdummyhashdummyhashdummy";
    const isValid = await verifyPassword(password, admin ? admin.password : dummyHash);

    if (!admin || !isValid) {
      return NextResponse.json(
        {
          status: "error",
          message: "Invalid email or password",
          data: null,
          error: "Unauthorized",
        },
        { status: STATUS_CODE.UNAUTHORIZED } // 401
      );
    }

    // 6. Generate Session
    const rawToken = generateSessionToken();
    const hashedToken = hashSessionToken(rawToken);
    const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours

    const expiresAtIso = expiresAt.toISOString();

    // 7. Save Session to DB
    await sql`
      INSERT INTO admin_sessions (admin_id, token_hash, expires_at)
      VALUES (${admin.id}, ${hashedToken}, ${expiresAtIso})
    `;

    // 8. Set Cookie
    (await cookies()).set(config.sessionCookieName, rawToken, {
      httpOnly: true,
      secure: config.isProduction,
      sameSite: "strict",
      expires: expiresAt,
      path: "/",
    });

    // Clear rate limit on successful login
    await redis.del(rateLimitKey);

    return NextResponse.json(
      {
        status: "success",
        message: "Logged in successfully",
        data: null,
        error: null,
      },
      { status: STATUS_CODE.OK }
    );

  } catch (error: any) {
    console.error("Login Error:", error);
    return NextResponse.json(
      {
        status: "error",
        message: "Internal Server Error",
        data: null,
        error: error.message,
      },
      { status: STATUS_CODE.INTERNAL_SERVER_ERROR }
    );
  }
}