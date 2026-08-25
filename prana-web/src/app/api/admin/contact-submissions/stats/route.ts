import { NextResponse } from "next/server";
import { getCurrentUser } from "@/core/auth/session";
import { getContactSubmissionStats } from "@/actions/contact.actions";
import { logger } from "@/core/logger/pino";

/**
 * GET /api/admin/contact-submissions/stats
 *
 * Aggregate counts for the admin leads page tiles:
 *   - total, unread, read, replied, archived, failed
 *
 * Auth: admin only.
 */
export async function GET() {
  try {
    const user = await getCurrentUser();
    if (!user || user.role !== "ADMIN") {
      return NextResponse.json(
        { success: false, message: "Unauthorized" },
        { status: 401 }
      );
    }
    const response = await getContactSubmissionStats();
    return NextResponse.json(response, {
      status: response.success ? 200 : 400,
    });
  } catch (error: any) {
    logger.error({ err: error }, "Failed to fetch contact submission stats");
    return NextResponse.json(
      { success: false, message: error.message || "Internal server error" },
      { status: 500 }
    );
  }
}
