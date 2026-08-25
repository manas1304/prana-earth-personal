import { NextResponse } from "next/server";
import { getCurrentUser } from "@/core/auth/session";

/**
 * GET /api/auth/me
 *
 * Returns the currently authenticated user (read from the access_token
 * cookie) or `{ user: null }` when no token is present. Intended to be
 * called from Client Components that need user data without triggering
 * the "Server Functions cannot be called during initial render" error.
 */
export async function GET() {
  try {
    const user = await getCurrentUser();
    return NextResponse.json({
      success: true,
      data: { user: user ?? null },
    });
  } catch (error) {
    return NextResponse.json(
      { success: false, message: "Failed to fetch current user" },
      { status: 500 },
    );
  }
}
