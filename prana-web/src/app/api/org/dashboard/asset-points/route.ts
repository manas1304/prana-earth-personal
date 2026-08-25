import { NextResponse } from "next/server";
import { getCurrentUser } from "@/core/auth/session";
import { prisma } from "@/core/database/prisma";
import { orgDashboardService } from "@/modules/org/dashboard/dashboard.service";
import { logger } from "@/core/logger/pino";

/**
 * GET /api/org/dashboard/asset-points
 *
 * Returns a GeoJSON FeatureCollection of the org's assets (lat/lon + risk)
 * for the dashboard map. Only assets with non-null coordinates are
 * included.
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
    const points = await orgDashboardService.getAssetPoints(
      membership.organizationId
    );
    return NextResponse.json(
      { success: true, data: points },
      { status: 200 }
    );
  } catch (error: any) {
    logger.error({ err: error }, "Failed to fetch asset points");
    return NextResponse.json(
      { success: false, message: error.message || "Internal server error" },
      { status: 500 }
    );
  }
}
