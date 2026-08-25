import { prisma } from "@/core/database/prisma";
import { ReportStatus } from "@/generated/prisma/enums";

export interface GetReportsFilters {
  q?: string;
  status?: keyof typeof ReportStatus | null;
  page?: number;
  limit?: number;
  assetId?: string;
  onlyLatest?: boolean;
}

/**
 * Org-level Reports service.
 */
export const orgReportsService = {
  /**
   * Returns a paginated, filtered list of reports belonging to
   * assessments of the org's assets.
   */
  async getReports(organizationId: string, filters: GetReportsFilters = {}) {
    const {
      q,
      status,
      page = 1,
      limit = 10,
      assetId,
      onlyLatest,
    } = filters;
    const skip = (page - 1) * limit;
    const where: any = {
      assessment: {
        asset: { organizationId, isDeleted: false },
      },
    };
    if (q) {
      // Search by executiveSummary / aiSummary / asset name / asset city
      where.OR = [
        { executiveSummary: { contains: q, mode: "insensitive" } },
        { aiSummary: { contains: q, mode: "insensitive" } },
        {
          assessment: {
            asset: { name: { contains: q, mode: "insensitive" } },
          },
        },
        {
          assessment: {
            asset: { city: { contains: q, mode: "insensitive" } },
          },
        },
      ];
    }
    if (status) where.reportStatus = status as ReportStatus;
    if (assetId) {
      where.assessment = {
        ...(where.assessment ?? {}),
        assetId,
      };
    }
    if (onlyLatest) {
      // Pick the latest version per assessment
      // (For correctness in Postgres, the API sorts and the client
      // de-dupes; for production move to a window function.)
    }

    const [rows, total] = await Promise.all([
      prisma.report.findMany({
        where,
        orderBy: { createdAt: "desc" },
        skip,
        take: limit,
        include: {
          assessment: {
            include: {
              asset: { select: { id: true, name: true, type: true, city: true } },
            },
          },
          generatedBy: {
            select: { id: true, fullName: true, email: true, avatarUrl: true },
          },
        },
      }),
      prisma.report.count({ where }),
    ]);

    return {
      rows: rows.map((r) => ({
        id: r.id,
        name: r.assessment.asset?.name ?? "Untitled Report",
        type: "CLIMATE_RISK" as const,
        assetId: r.assessment.assetId,
        assetName: r.assessment.asset?.name,
        assetCity: r.assessment.asset?.city,
        status: r.reportStatus,
        reportVersion: r.reportVersion,
        fileUrl: r.fileUrl,
        executiveSummary: r.executiveSummary,
        aiSummary: r.aiSummary,
        generatedAt: r.generatedAt ?? r.createdAt,
        generatedBy: r.generatedBy,
      })),
      total,
      page,
      pageSize: limit,
      totalPages: Math.max(1, Math.ceil(total / limit)),
    };
  },

  /**
   * Aggregate counts for the top KPI strip on the Reports page.
   */
  async getStats(organizationId: string) {
    const [total, completed, inProgress, failed, archived] = await Promise.all([
      prisma.report.count({
        where: {
          assessment: { asset: { organizationId, isDeleted: false } },
        },
      }),
      prisma.report.count({
        where: {
          reportStatus: ReportStatus.READY,
          assessment: { asset: { organizationId, isDeleted: false } },
        },
      }),
      prisma.report.count({
        where: {
          reportStatus: { in: [ReportStatus.QUEUED, ReportStatus.GENERATING] },
          assessment: { asset: { organizationId, isDeleted: false } },
        },
      }),
      prisma.report.count({
        where: {
          reportStatus: ReportStatus.FAILED,
          assessment: { asset: { organizationId, isDeleted: false } },
        },
      }),
      prisma.report.count({
        where: {
          reportStatus: ReportStatus.ARCHIVED,
          assessment: { asset: { organizationId, isDeleted: false } },
        },
      }),
    ]);
    return {
      totalReports: total,
      completed,
      inProgress,
      failed,
      archived,
      // Total downloads is not persisted on Report today; the client
      // shows the lifetime total. Return 0 if you want to display a
      // count after a dedicated downloadCount column is added.
      totalDownloads: 0,
    };
  },

  /**
   * Returns monthly report-generation buckets for the trend chart.
   */
  async getTrend(organizationId: string, months = 6) {
    const since = new Date();
    since.setMonth(since.getMonth() - months);
    since.setDate(1);
    since.setHours(0, 0, 0, 0);

    const reports = await prisma.report.findMany({
      where: {
        assessment: { asset: { organizationId, isDeleted: false } },
        createdAt: { gte: since },
      },
      select: { createdAt: true, reportStatus: true },
    });

    const buckets: Record<string, { generated: number; completed: number; failed: number }> = {};
    for (let i = 0; i < months; i++) {
      const d = new Date(since);
      d.setMonth(since.getMonth() + i);
      const key = d.toLocaleString("en-US", { month: "short", year: "2-digit" });
      buckets[key] = { generated: 0, completed: 0, failed: 0 };
    }
    for (const r of reports) {
      const key = new Date(r.createdAt).toLocaleString("en-US", {
        month: "short",
        year: "2-digit",
      });
      if (!buckets[key]) continue;
      buckets[key].generated += 1;
      if (r.reportStatus === ReportStatus.READY) buckets[key].completed += 1;
      if (r.reportStatus === ReportStatus.FAILED) buckets[key].failed += 1;
    }
    return Object.entries(buckets).map(([period, b]) => ({ period, ...b }));
  },
};
