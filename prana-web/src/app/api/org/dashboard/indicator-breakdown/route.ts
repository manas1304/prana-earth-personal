import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/core/auth/session";
import { prisma } from "@/core/database/prisma";
import { indicatorsService } from "@/modules/org/indicators/indicators.service";
import { logger } from "@/core/logger/pino";

/**
 * GET /api/org/dashboard/indicator-breakdown?assetId={id}&scenario=&horizon=
 *
 * Returns the 30 contributing indicators for an asset's latest
 * assessment, grouped by hazard, with weights + values + risk class.
 *
 * Auth: caller must be a member of the asset's organisation.
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

    const { searchParams } = new URL(req.url);
    const assetId = searchParams.get("assetId");
    if (!assetId) {
      return NextResponse.json(
        { success: false, message: "assetId is required" },
        { status: 400 }
      );
    }
    const scenario = searchParams.get("scenario") ?? undefined;
    const horizonStr = searchParams.get("horizon");
    const horizon =
      horizonStr && !Number.isNaN(parseInt(horizonStr, 10))
        ? parseInt(horizonStr, 10)
        : undefined;

    // Confirm the caller is a member of the asset's org.
    const asset = await prisma.asset.findFirst({
      where: { id: assetId, isDeleted: false },
      select: { organizationId: true },
    });
    if (!asset) {
      return NextResponse.json(
        { success: false, message: "Asset not found" },
        { status: 404 }
      );
    }
    const membership = await prisma.organizationMember.findFirst({
      where: {
        userId: user.id,
        organizationId: asset.organizationId,
        organization: { deletedAt: null },
      },
    });
    if (!membership) {
      return NextResponse.json(
        { success: false, message: "Forbidden" },
        { status: 403 }
      );
    }

    const breakdown = await indicatorsService.getIndicatorBreakdown(
      assetId,
      { scenario, horizon },
    );
    if (!breakdown) {
      return NextResponse.json(
        {
          success: true,
          data: null,
          message:
            "No assessment with indicators found for this asset. Trigger a reassessment.",
        },
        { status: 200 }
      );
    }

    return NextResponse.json(
      { success: true, data: breakdown },
      { status: 200 }
    );
  } catch (error: any) {
    logger.error({ err: error }, "Failed to fetch indicator breakdown");
    return NextResponse.json(
      { success: false, message: error.message || "Internal server error" },
      { status: 500 }
    );
  }
}
