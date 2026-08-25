import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/core/auth/session";
import { prisma } from "@/core/database/prisma";
import { orgDashboardService } from "@/modules/org/dashboard/dashboard.service";
import { logger } from "@/core/logger/pino";

/**
 * GET /api/org/dashboard/export?format=csv
 *
 * Streams a CSV of the org's dashboard summary.
 *
 * `format=csv` (default) — CSV of all assets + their risk score.
 * `format=pdf` — returns a JSON envelope with a `downloadUrl` (placeholder
 *   pointing to the CSV; swap with a real PDF generator when wired).
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
    const format = (searchParams.get("format") ?? "csv").toLowerCase();

    const [stats, top, recent] = await Promise.all([
      orgDashboardService.getStats(membership.organizationId),
      orgDashboardService.getTopRiskAssets(membership.organizationId, 100),
      orgDashboardService.getRecentAssessments(membership.organizationId, 100),
    ]);

    if (format === "pdf") {
      // Placeholder — wire to a real PDF generator (e.g. pdfkit) when ready.
      return NextResponse.json(
        {
          success: true,
          data: {
            format: "pdf",
            downloadUrl: `/api/org/dashboard/export?format=csv`,
            stats,
            top,
            recent,
          },
        },
        { status: 200 }
      );
    }

    // CSV
    const escape = (v: unknown) => {
      if (v == null) return "";
      const s = String(v).replace(/"/g, '""');
      return /[",\n]/.test(s) ? `"${s}"` : s;
    };
    const header = [
      "Asset ID",
      "Asset Name",
      "Type",
      "City",
      "Overall Risk",
      "Risk Class",
      "Main Hazard",
      "Main Hazard Score",
    ].join(",");
    const rows = top.map((r) =>
      [
        r.assetId,
        r.assetName,
        r.assetType,
        r.location.city,
        r.overallRisk,
        r.riskClass,
        r.mainHazard,
        r.mainHazardScore,
      ]
        .map(escape)
        .join(",")
    );
    const csv = [
      `# Prana Earth — Org Risk Export (${new Date().toISOString()})`,
      `# Overall Risk Score: ${stats.overallRiskScore} (${stats.overallRiskClass})`,
      `# Total Assets: ${stats.totalAssets}, High-Risk: ${stats.assetsUnderHighRisk}`,
      header,
      ...rows,
    ].join("\n");

    return new NextResponse(csv, {
      status: 200,
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": `attachment; filename="org-dashboard-${new Date()
          .toISOString()
          .slice(0, 10)}.csv"`,
      },
    });
  } catch (error: any) {
    logger.error({ err: error }, "Failed to export org dashboard");
    return NextResponse.json(
      { success: false, message: error.message || "Internal server error" },
      { status: 500 }
    );
  }
}
