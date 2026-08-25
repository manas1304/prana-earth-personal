import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/core/auth/session";
import { exportContactSubmissions } from "@/actions/contact.actions";
import { logger } from "@/core/logger/pino";

/**
 * GET /api/admin/contact-submissions/export
 *
 * Streams a CSV of all contact submissions matching the same
 * filters as the list endpoint, including the new `company` and
 * `role` columns.
 *
 * Query: `?q=&status=&source=&from=&to=`
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
    const filters = {
      q: searchParams.get("q") ?? undefined,
      status: searchParams.get("status") ?? undefined,
      source: searchParams.get("source") ?? undefined,
      from: searchParams.get("from") ?? undefined,
      to: searchParams.get("to") ?? undefined,
    };

    const response = await exportContactSubmissions(filters);
    if (!response.success) {
      return NextResponse.json(response, { status: 400 });
    }
    const csv = (response as any).data.csv as string;
    return new NextResponse(csv, {
      status: 200,
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": `attachment; filename="contact-submissions-${new Date()
          .toISOString()
          .slice(0, 10)}.csv"`,
      },
    });
  } catch (error: any) {
    logger.error({ err: error }, "Failed to export contact submissions");
    return NextResponse.json(
      { success: false, message: error.message || "Internal server error" },
      { status: 500 }
    );
  }
}
