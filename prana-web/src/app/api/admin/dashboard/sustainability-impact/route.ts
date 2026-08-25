import { NextResponse } from "next/server";
import { getCurrentUser } from "@/core/auth/session";
import { prisma } from "@/core/database/prisma";
import { logger } from "@/core/logger/pino";

/**
 * GET /api/admin/dashboard/sustainability-impact
 *
 * Returns the "Sustainability Impact" KPIs for the admin dashboard.
 * Pulls from the `SustainabilityImpact` table (scope = "global"); if
 * no row exists, returns sensible defaults so the UI never renders
 * blanks.
 */
export async function GET() {
  try {
    const user = await getCurrentUser();
    if (!user || user.role !== "ADMIN") {
      return NextResponse.json(
        { success: false, message: "Unauthorized" },
        { status: 401 }
      );
    }
    let impact = await prisma.sustainabilityImpact.findUnique({
      where: { scope: "global" },
    });
    if (!impact) {
      impact = await prisma.sustainabilityImpact.create({
        data: {
          scope: "global",
          carbonSavedTons: 0,
          waterConservedTons: 0,
          hectaresRestored: 0,
          beneficiaries: 0,
        },
      });
    }
    return NextResponse.json(
      {
        success: true,
        data: {
          carbonSavedTons: impact.carbonSavedTons
            ? Number(impact.carbonSavedTons)
            : 0,
          waterConservedTons: impact.waterConservedTons
            ? Number(impact.waterConservedTons)
            : 0,
          hectaresRestored: impact.hectaresRestored
            ? Number(impact.hectaresRestored)
            : 0,
          beneficiaries: impact.beneficiaries ?? 0,
          asOf: impact.asOf,
        },
      },
      { status: 200 }
    );
  } catch (error: any) {
    logger.error({ err: error }, "Failed to fetch sustainability impact");
    return NextResponse.json(
      { success: false, message: error.message || "Internal server error" },
      { status: 500 }
    );
  }
}
