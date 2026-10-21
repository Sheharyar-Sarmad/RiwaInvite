import { NextRequest, NextResponse } from "next/server";
import {sql} from "@/db/connections/postgres_connection";
import { updateUserSettingsSchema } from "@/lib/validations/user"; 
import { verifyPassword, hashPassword } from "@/lib/auth";
import { pgErrorToResponse } from "@/lib/api/errors";
import { getRedisClient } from "@/db/connections/redis_connection";
import { STATUS_CODE } from "@/lib/status_codes";

/**
 * GET: Fetch User Details (Excludes Password)
 */
export async function GET(req: NextRequest) {
  try {
    // 1. Middleware injects x-user-id for authenticated users
    const userId = req.headers.get("x-user-id"); 
    if (!userId) {
      return NextResponse.json(
        { error: "Unauthorized" }, 
        { status: STATUS_CODE.UNAUTHORIZED }
      );
    }

    const redis = await getRedisClient();
    const cacheKey = `user_details:${userId}`; // <-- Distinct cache key for users

    // 2. Check Redis Cache
    const cachedUser = await redis.get(cacheKey);
    if (cachedUser) {
      return NextResponse.json(
        { user: JSON.parse(cachedUser) }, 
        { status: STATUS_CODE.OK }
      );
    }

    // 3. Query Postgres
    const [user] = await sql`
      SELECT 
        id, 
        first_name, 
        last_name, 
        email, 
        phone_number, 
        created_at
      FROM users 
      WHERE id = ${userId} 
      LIMIT 1
    `;

    if (!user) {
      return NextResponse.json(
        { error: "User not found" }, 
        { status: STATUS_CODE.NOT_FOUND }
      );
    }

    // 4. Save to Redis (15 mins)
    await redis.setEx(cacheKey, 900, JSON.stringify(user));

    return NextResponse.json(
      { user }, 
      { status: STATUS_CODE.OK }
    );

  } catch (error: any) {
    return pgErrorToResponse(error);
  }
}

/**
 * PATCH: Update User Settings
 */
export async function PATCH(req: NextRequest) {
  try {
    const userId = req.headers.get("x-user-id");
    if (!userId) {
      return NextResponse.json(
        { error: "Unauthorized" }, 
        { status: STATUS_CODE.UNAUTHORIZED }
      );
    }

    // 1. Zod Validation
    const body = await req.json();
    const validation = updateUserSettingsSchema.safeParse(body);

    if (!validation.success) {
      return NextResponse.json(
        { error: "Validation failed", details: validation.error.format() },
        { status: STATUS_CODE.BAD_REQUEST }
      );
    }

    const { currentPassword, firstName, lastName, email, phoneNumber, newPassword } = validation.data;

    // 2. Fetch Password from DB to verify
    const [user] = await sql`
      SELECT password FROM users WHERE id = ${userId} LIMIT 1
    `;

    if (!user) {
      return NextResponse.json(
        { error: "User not found" }, 
        { status: STATUS_CODE.NOT_FOUND }
      );
    }

    // 3. Verify Current Password
    const isPasswordValid = await verifyPassword(currentPassword, user.password);
    if (!isPasswordValid) {
      return NextResponse.json(
        { error: "Incorrect current password" }, 
        { status: STATUS_CODE.FORBIDDEN }
      );
    }

    // 4. Build Dynamic Update Object
    const updateData: Record<string, any> = {};
    if (firstName) updateData.first_name = firstName;
    if (lastName) updateData.last_name = lastName;
    if (email) updateData.email = email;
    if (phoneNumber) updateData.phone_number = phoneNumber;
    
    if (newPassword) {
      updateData.password = await hashPassword(newPassword);
    }

    if (Object.keys(updateData).length === 0) {
      return NextResponse.json(
        { message: "No changes provided" }, 
        { status: STATUS_CODE.OK }
      );
    }

    // 5. Execute Update
    const updatedUser = await sql`
      UPDATE users
      SET ${sql(updateData)}
      WHERE id = ${userId}
      RETURNING id, first_name, last_name, email, phone_number, created_at
    `;

    // 6. Cache Invalidation
    const redis = await getRedisClient();
    await redis.del(`user_details:${userId}`);

    // 7. Return Updated Details
    return NextResponse.json({
      message: "Account settings updated successfully",
      user: updatedUser[0]
    }, { status: STATUS_CODE.OK });

  } catch (error: any) {
    // Catches Unique Violations (23505) if email is already taken by another user
    return pgErrorToResponse(error);
  }
}