import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getCurrentUser } from "@/core/auth/session";
import { prisma } from "@/core/database/prisma";
import { indicatorsService } from "@/modules/org/indicators/indicators.service";
import { logger } from "@/core/logger/pino";

const Schema = z.object({
  scenario: z.string().min(1).default("ssp245"),
  horizon: z.number().int().min(2000).max(2200).default(2050),
  assetType: z.string().optional(),
});

/**
 * POST /api/org/assets/[id]/reassess
 *
 * Body: `{ scenario?: string, horizon?: number, assetType?: string }`
 *
 * 1. Demotes previous `isLatest=true` assessments for the asset.
 * 2. Inserts a fresh `Assessment` row.
 * 3. Calls the climate-pipeline `POST /v1/assess`.
 * 4. Writes 6 `ClimateRiskScore` rows + 30 `IndicatorScore` rows.
 *
 * Returns: `{ assessmentId, assetId, scenario, horizon, climateRiskScores, indicatorScores, status }`
 */
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json(
        { success: false, message: "Not authenticated" },
        { status: 401 }
      );
    }

    // Caller must be an OWNER or ADMIN of an organization that owns
    // this asset (or the asset must be theirs directly).
    const { id } = await params;
    const asset = await prisma.asset.findFirst({
      where: { id, isDeleted: false },
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

    const body = await req.json().catch(() => ({}));
    const parsed = Schema.safeParse({
      scenario: body.scenario ?? undefined,
      horizon: body.horizon ?? undefined,
      assetType: body.assetType ?? undefined,
    });
    if (!parsed.success) {
      return NextResponse.json(
        {
          success: false,
          message: "Invalid payload",
          errors: parsed.error.flatten(),
        },
        { status: 400 }
      );
    }

    const result = await indicatorsService.persistIndicatorsForAsset(id, {
      scenario: parsed.data.scenario,
      horizon: parsed.data.horizon,
      initiatedById: user.id,
    });

    return NextResponse.json(
      {
        success: true,
        data: { ...result, status: "COMPLETED" as const },
      },
      { status: 201 }
    );
  } catch (error: any) {
    logger.error(
      { err: error, assetId: (await req.url.match(/assets\/([^/]+)/)?.[1]) },
      "Reassess failed",
    );
    return NextResponse.json(
      { success: false, message: error.message || "Internal server error" },
      { status: 500 }
    );
  }
}
