import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/core/auth/session";
import { getAdminDashboardMetrics } from "@/actions/admin-dashboard.actions";
import { logger } from "@/core/logger/pino";

/**
 * GET /api/admin/dashboard/metrics?range=7d|30d|60d|90d|1y
 *
 * Aggregated KPIs for the admin dashboard, filtered to a date
 * window. Default range is `30d` (matches the original
 * behaviour).
 *
 * Auth: admin only.
 *
 * The response shape is identical to the underlying service
 * (`adminDashboardService.getDashboardMetrics`) with two extra
 * fields the frontend uses to show what range is active:
 *   - `range`:     the same key the caller sent back, normalised
 *   - `rangeStart`: ISO timestamp for the lower bound of the window
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

    const range = req.nextUrl.searchParams.get("range") ?? undefined;
    const response = await getAdminDashboardMetrics(
      range as
        | "7d"
        | "30d"
        | "60d"
        | "90d"
        | "1y"
        | undefined,
    );
    return NextResponse.json(response, {
      status: response.success ? 200 : 400,
    });
  } catch (error: any) {
    logger.error({ err: error }, "Failed to fetch admin metrics");
    return NextResponse.json(
      { success: false, message: error.message || "Internal server error" },
      { status: 500 }
    );
  }
}
