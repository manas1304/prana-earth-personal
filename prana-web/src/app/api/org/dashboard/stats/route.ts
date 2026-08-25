import { NextResponse } from "next/server";
import { getCurrentUser } from "@/core/auth/session";
import { prisma } from "@/core/database/prisma";
import { orgDashboardService } from "@/modules/org/dashboard/dashboard.service";
import { logger } from "@/core/logger/pino";

/**
 * GET /api/org/dashboard/stats
 *
 * Returns the top KPI strip for the organization dashboard.
 *
 * Auth: caller must be a member of an organization.
 */
export async function GET() {
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
    const stats = await orgDashboardService.getStats(membership.organizationId);
    return NextResponse.json(
      { success: true, data: stats },
      { status: 200 }
    );
  } catch (error: any) {
    logger.error({ err: error }, "Failed to fetch org dashboard stats");
    return NextResponse.json(
      { success: false, message: error.message || "Internal server error" },
      { status: 500 }
    );
  }
}
