// app/api/v1/user/auth/register/route.ts
import { NextResponse } from "next/server";
import { z } from "zod";
import { sql } from "@/db/connections/postgres_connection";
import { hashPassword } from "@/lib/auth";
import { STATUS_CODE } from "@/lib/status_codes";

// 1. Zod Validation Schema
const registerSchema = z.object({
  first_name: z.string().min(2, "First name is too short").max(50).trim(),
  last_name: z.string().min(2, "Last name is too short").max(50).trim(),
  email: z.string().email("Invalid email format").toLowerCase(),
  password: z
    .string()
    .min(8, "Password must be at least 8 characters")
    .regex(/[A-Z]/, "Must contain an uppercase letter")
    .regex(/[a-z]/, "Must contain a lowercase letter")
    .regex(/[0-9]/, "Must contain a number"),
  // User phone number is optional. Handles undefined or empty strings.
  phone_number: z
    .string()
    .regex(/^\+?[1-9]\d{1,14}$/, "Invalid phone format (e.g., +923001234567)")
    .optional()
    .or(z.literal("")),
});

export async function POST(request: Request) {
  try {
    // Safely parse JSON
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
    const validation = registerSchema.safeParse(body);

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

    const data = validation.data;

    // 3. Hash Password
    const passwordHash = await hashPassword(data.password);

    // 4. Insert into DB
    // Note: We pass NULL to the DB if phone_number is empty or undefined
    const result = await sql`
      INSERT INTO users (first_name, last_name, email, password, phone_number)
      VALUES (
        ${data.first_name}, 
        ${data.last_name}, 
        ${data.email}, 
        ${passwordHash}, 
        ${data.phone_number || null}
      )
      RETURNING id, first_name, last_name, email, phone_number, created_at
    `;

    return NextResponse.json(
      {
        status: "success",
        message: "User registered successfully",
        data: result[0],
        error: null,
      },
      { status: STATUS_CODE.CREATED } // 201
    );

  } catch (error: any) {
    // Handle Unique Constraint Violation (Duplicate Email or Phone)
    // Postgres Error Code 23505 = unique_violation
    if (error.code === "23505") {
      return NextResponse.json(
        {
          status: "error",
          message: "An account with this email or phone number already exists.",
          data: null,
          error: "Conflict",
        },
        { status: STATUS_CODE.CONFLICT } // 409
      );
    }

    console.error("User Registration Error:", error);
    return NextResponse.json(
      {
        status: "error",
        message: "Internal Server Error",
        data: null,
        error: error.message,
      },
      { status: STATUS_CODE.INTERNAL_SERVER_ERROR } // 500
    );
  }
}