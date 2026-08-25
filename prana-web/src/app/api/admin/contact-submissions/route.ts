import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/core/auth/session";
import { getContactSubmissions } from "@/actions/contact.actions";
import { logger } from "@/core/logger/pino";

/**
 * GET /api/admin/contact-submissions
 *
 * Paginated, filtered list of all contact submissions (marketplace
 * contact-us + predict contact + any other source).
 *
 * Query:
 *   - q         (string)  free-text search across name/email/company/subject/message
 *   - status    (string)  filter by status (UNREAD, READ, REPLIED, ARCHIVED, FAILED)
 *   - source    (string)  filter by source (marketplace-contact, predict-contact, etc.)
 *   - from      (ISO)     createdAt >= from
 *   - to        (ISO)     createdAt <= to
 *   - page      (int)     page number, default 1
 *   - pageSize  (int)     default 20, max 100
 *
 * Auth: admin only.
 */
export async function GET(req: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user || user.role !== "ADMIN") {
      return NextResponse.json(
        { success: false, message: "Unauthorized" },
        { status: 401 }
      );
    }

    const { searchParams } = new URL(req.url);
    const q = searchParams.get("q") ?? undefined;
    const status = searchParams.get("status") ?? undefined;
    const source = searchParams.get("source") ?? undefined;
    const from = searchParams.get("from") ?? undefined;
    const to = searchParams.get("to") ?? undefined;
    const page = Math.max(1, parseInt(searchParams.get("page") ?? "1", 10) || 1);
    const pageSize = Math.min(
      100,
      parseInt(searchParams.get("pageSize") ?? "20", 10) || 20,
    );

    const response = await getContactSubmissions({
      page,
      pageSize,
      q,
      status,
      source,
      from,
      to,
    });
    return NextResponse.json(response, {
      status: response.success ? 200 : 400,
    });
  } catch (error: any) {
    logger.error({ err: error }, "Failed to fetch contact submissions");
    return NextResponse.json(
      { success: false, message: error.message || "Internal server error" },
      { status: 500 }
    );
  }
}
