import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/core/auth/session";
import { prisma } from "@/core/database/prisma";
import { orgDashboardService } from "@/modules/org/dashboard/dashboard.service";
import { logger } from "@/core/logger/pino";

/**
 * GET /api/org/dashboard/recent-assessments?limit=5
 *
 * Returns the most recent N assessments across the org's portfolio.
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
    const limit = Math.min(parseInt(searchParams.get("limit") ?? "5", 10) || 5, 50);
    const rows = await orgDashboardService.getRecentAssessments(
      membership.organizationId,
      limit
    );
    return NextResponse.json(
      { success: true, data: { rows } },
      { status: 200 }
    );
  } catch (error: any) {
    logger.error({ err: error }, "Failed to fetch recent assessments");
    return NextResponse.json(
      { success: false, message: error.message || "Internal server error" },
      { status: 500 }
    );
  }
}
