import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/core/auth/session";
import { prisma } from "@/core/database/prisma";
import { ReportStatus } from "@/generated/prisma/enums";
import { logger } from "@/core/logger/pino";

/**
 * GET /api/org/reports/[id]/download
 *
 * Streams a downloadable version of the report. If the report has an
 * `fileUrl` (S3), the API returns a JSON envelope with the URL — swap
 * with a server-side redirect to a pre-signed S3 URL when needed.
 * If no `fileUrl` is set, the report's `executiveSummary` + `aiSummary`
 * are returned as a JSON document.
 */
export async function GET(
  _req: NextRequest,
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
    const membership = await prisma.organizationMember.findFirst({
      where: { userId: user.id, organization: { deletedAt: null } },
    });
    if (!membership) {
      return NextResponse.json(
        { success: false, message: "No organization for user" },
        { status: 404 }
      );
    }
    const { id } = await params;
    const report = await prisma.report.findFirst({
      where: {
        id,
        assessment: {
          asset: { organizationId: membership.organizationId, isDeleted: false },
        },
      },
      include: {
        assessment: {
          include: { asset: { select: { name: true } } },
        },
      },
    });
    if (!report) {
      return NextResponse.json(
        { success: false, message: "Report not found" },
        { status: 404 }
      );
    }
    if (report.reportStatus !== ReportStatus.READY) {
      return NextResponse.json(
        { success: false, message: "Report is not ready for download" },
        { status: 409 }
      );
    }
    if (report.fileUrl) {
      return NextResponse.json(
        {
          success: true,
          data: {
            fileUrl: report.fileUrl,
            filename: `${report.assessment.asset?.name ?? "report"}-v${report.reportVersion}.pdf`,
          },
        },
        { status: 200 }
      );
    }
    // Fallback: return the textual content as JSON so the client can
    // render or save it without a separate document store.
    return NextResponse.json(
      {
        success: true,
        data: {
          reportId: report.id,
          title: report.assessment.asset?.name ?? "Report",
          version: report.reportVersion,
          executiveSummary: report.executiveSummary,
          aiSummary: report.aiSummary,
          generatedAt: report.generatedAt ?? report.createdAt,
        },
      },
      { status: 200 }
    );
  } catch (error: any) {
    logger.error({ err: error }, "Failed to download report");
    return NextResponse.json(
      { success: false, message: error.message || "Internal server error" },
      { status: 500 }
    );
  }
}
