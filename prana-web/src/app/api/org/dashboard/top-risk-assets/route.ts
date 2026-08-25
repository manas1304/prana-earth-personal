import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/core/auth/session";
import { prisma } from "@/core/database/prisma";
import { orgDashboardService } from "@/modules/org/dashboard/dashboard.service";
import { logger } from "@/core/logger/pino";

/**
 * GET /api/org/dashboard/top-risk-assets?limit=3
 *
 * Returns the org's top-N assets by composite risk score.
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
    const limit = Math.min(parseInt(searchParams.get("limit") ?? "3", 10) || 3, 50);
    const assets = await orgDashboardService.getTopRiskAssets(
      membership.organizationId,
      limit
    );
    return NextResponse.json(
      { success: true, data: { assets } },
      { status: 200 }
    );
  } catch (error: any) {
    logger.error({ err: error }, "Failed to fetch top risk assets");
    return NextResponse.json(
      { success: false, message: error.message || "Internal server error" },
      { status: 500 }
    );
  }
}
