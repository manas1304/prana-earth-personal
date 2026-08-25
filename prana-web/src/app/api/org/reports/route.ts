import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getCurrentUser } from "@/core/auth/session";
import { prisma } from "@/core/database/prisma";
import { orgReportsService } from "@/modules/org/reports/reports.service";
import { ReportStatus } from "@/generated/prisma/enums";
import { logger } from "@/core/logger/pino";

const QuerySchema = z.object({
  q: z.string().optional(),
  status: z
    .enum([
      "QUEUED",
      "GENERATING",
      "READY",
      "FAILED",
      "ARCHIVED",
    ] as const)
    .optional(),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(10),
  assetId: z.string().uuid().optional(),
});

/**
 * GET /api/org/reports
 *
 * Paginated, filtered list of the org's reports.
 * Query: `?q=&status=&page=&limit=&assetId=`
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
    const parsed = QuerySchema.safeParse({
      q: searchParams.get("q") ?? undefined,
      status: searchParams.get("status") ?? undefined,
      page: searchParams.get("page") ?? undefined,
      limit: searchParams.get("limit") ?? undefined,
      assetId: searchParams.get("assetId") ?? undefined,
    });
    if (!parsed.success) {
      return NextResponse.json(
        {
          success: false,
          message: "Invalid query",
          errors: parsed.error.flatten(),
        },
        { status: 400 }
      );
    }
    const result = await orgReportsService.getReports(
      membership.organizationId,
      {
        q: parsed.data.q,
        status: parsed.data.status as keyof typeof ReportStatus | undefined,
        page: parsed.data.page,
        limit: parsed.data.limit,
        assetId: parsed.data.assetId,
      }
    );
    return NextResponse.json(
      { success: true, data: result },
      { status: 200 }
    );
  } catch (error: any) {
    logger.error({ err: error }, "Failed to fetch org reports");
    return NextResponse.json(
      { success: false, message: error.message || "Internal server error" },
      { status: 500 }
    );
  }
}
