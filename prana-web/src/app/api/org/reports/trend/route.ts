import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/core/auth/session";
import { prisma } from "@/core/database/prisma";
import { orgReportsService } from "@/modules/org/reports/reports.service";
import { logger } from "@/core/logger/pino";

/**
 * GET /api/org/reports/trend?months=6
 *
 * Monthly report-generation buckets for the trend chart.
 */
export async function GET(req: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json(
        { success: false, message: "Not authenticated" },
        { status: 401 }
      );
    }
    const membership = await prisma.organizationMember.findFirst({
      where: { userId: user.id, organization: { deletedAt: null } },
    });
    if (!membership) {
      return NextResponse.json(
        { success: false, message: "No organization for user" },
        { status: 404 }
      );
    }
    const { searchParams } = new URL(req.url);
    const months = Math.min(parseInt(searchParams.get("months") ?? "6", 10) || 6, 24);
    const trend = await orgReportsService.getTrend(membership.organizationId, months);
    return NextResponse.json(
      { success: true, data: { trend } },
      { status: 200 }
    );
  } catch (error: any) {
    logger.error({ err: error }, "Failed to fetch org reports trend");
    return NextResponse.json(
      { success: false, message: error.message || "Internal server error" },
      { status: 500 }
    );
  }
}
