// app/api/v1/user/auth/login/route.ts
import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { z } from "zod";
import { sql } from "@/db/connections/postgres_connection";
import { getRedisClient } from "@/db/connections/redis_connection";
import { verifyPassword, generateSessionToken, hashSessionToken } from "@/lib/auth";
import settings from "@/config/settings_config";
import { STATUS_CODE } from "@/lib/status_codes";

const config = settings();

const loginSchema = z.object({
  email: z.string().email("Invalid email format").toLowerCase(),
  password: z.string().min(1, "Password is required"),
});

export async function POST(request: Request) {
  try {
    const body = await request.json().catch(() => null);

    if (!body) {
      return NextResponse.json(
        { status: "error", message: "Invalid or missing JSON body", data: null, error: "Bad Request" },
        { status: STATUS_CODE.BAD_REQUEST }
      );
    }

    const validation = loginSchema.safeParse(body);
    if (!validation.success) {
      return NextResponse.json(
        { status: "error", message: "Validation failed", data: null, error: validation.error.flatten().fieldErrors },
        { status: STATUS_CODE.BAD_REQUEST }
      );
    }

    const { email, password } = validation.data;
    const ip = request.headers.get("x-forwarded-for") || "unknown";

    // Rate Limiting
    const redis = await getRedisClient();
    const rateLimitKey = `user_login_attempts:${ip}`;
    const attempts = await redis.incr(rateLimitKey);
    
    if (attempts === 1) await redis.expire(rateLimitKey, 900);
    if (attempts > 5) {
      return NextResponse.json(
        { status: "error", message: "Too many login attempts. Try again in 15 minutes.", data: null, error: "Too Many Requests" },
        { status: STATUS_CODE.TOO_MANY_REQUESTS }
      );
    }

    // Find User
    const users = await sql`
      SELECT id, password FROM users WHERE LOWER(email) = LOWER(${email}) LIMIT 1
    `;
    const user = users[0];

    // Verify Password (Timing attack prevention)
    const dummyHash = "$2b$12$dummyhashdummyhashdummyhashdummyhashdummy";
    const isValid = await verifyPassword(password, user ? user.password : dummyHash);

    if (!user || !isValid) {
      return NextResponse.json(
        { status: "error", message: "Invalid email or password", data: null, error: "Unauthorized" },
        { status: STATUS_CODE.UNAUTHORIZED }
      );
    }

    // Generate Session
    const rawToken = generateSessionToken();
    const hashedToken = hashSessionToken(rawToken);
    const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000); 
    const expiresAtIso = expiresAt.toISOString();

    // Save Session to DB
    await sql`
      INSERT INTO user_sessions (user_id, token_hash, expires_at)
      VALUES (${user.id}, ${hashedToken}, ${expiresAtIso})
    `;

    // Set Shared Cookie
    (await cookies()).set(config.sessionCookieName, rawToken, {
      httpOnly: true,
      secure: config.isProduction,
      sameSite: "strict",
      expires: expiresAt,
      path: "/",
    });

    await redis.del(rateLimitKey);

    return NextResponse.json(
      { status: "success", message: "Logged in successfully", data: null, error: null },
      { status: STATUS_CODE.OK }
    );

  } catch (error: any) {
    console.error("User Login Error:", error);
    return NextResponse.json(
      { status: "error", message: "Internal Server Error", data: null, error: error.message },
      { status: STATUS_CODE.INTERNAL_SERVER_ERROR }
    );
  }
}