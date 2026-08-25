import { prisma } from "@/core/database/prisma";
import { RiskLevel, AssessmentStatus } from "@/generated/prisma/enums";

/**
 * Helpers
 */
function riskFromScore(score: number | null | undefined): RiskLevel | null {
  if (score == null) return null;
  if (score < 25) return RiskLevel.LOW;
  if (score < 50) return RiskLevel.MODERATE;
  if (score < 75) return RiskLevel.HIGH;
  return RiskLevel.CRITICAL;
}

function topHazard(scores: { riskType: string; score: any }[]): {
  hazard: string;
  score: number;
} {
  let best: { hazard: string; score: number } = { hazard: "flood", score: 0 };
  for (const s of scores) {
    const v = Number(s.score ?? 0);
    if (v > best.score) best = { hazard: s.riskType ?? best.hazard, score: v };
  }
  return best;
}

/**
 * Organization Dashboard service.
 *
 * Aggregates an org's assets, assessments, climate risk scores and reports
 * to feed the predict organization-profile dashboard. The asset point
 * list is designed for the dashboard map (lat/lon + risk).
 */
export const orgDashboardService = {
  /**
   * High-level KPIs shown at the top of the dashboard.
   */
  async getStats(organizationId: string) {
    const [
      totalAssets,
      totalAssessments,
      assetsWithScores,
      allScores,
    ] = await Promise.all([
      prisma.asset.count({
        where: { organizationId, isDeleted: false },
      }),
      prisma.assessment.count({
        where: { asset: { organizationId, isDeleted: false } },
      }),
      prisma.asset.findMany({
        where: { organizationId, isDeleted: false },
        include: {
          assessments: {
            where: { isLatest: true, status: AssessmentStatus.COMPLETED },
            take: 1,
            orderBy: { createdAt: "desc" },
            include: {
              climateRiskScores: true,
            },
          },
        },
        take: 200,
      }),
      prisma.climateRiskScore.findMany({
        where: {
          assessment: {
            asset: { organizationId, isDeleted: false },
            isLatest: true,
            status: AssessmentStatus.COMPLETED,
          },
        },
        select: { score: true },
      }),
    ]);

    const totalAssessmentsCompleted = assetsWithScores.filter(
      (a) => a.assessments.length > 0
    ).length;

    // For each asset, compute the composite risk from its 6-axis scores
    const assetRisks = assetsWithScores.map((a) => {
      const scores = a.assessments[0]?.climateRiskScores ?? [];
      // average of the 6 hazard scores (methodology §10.2)
      const avg =
        scores.length > 0
          ? scores.reduce((s, x) => s + Number(x.score ?? 0), 0) / scores.length
          : 0;
      return { asset: a, avg };
    });
    const overallRiskScore =
      assetRisks.length > 0
        ? Math.round(
            (assetRisks.reduce((s, a) => s + a.avg, 0) / assetRisks.length) * 10
          ) / 10
        : 0;
    const highRiskCount = assetRisks.filter((a) => a.avg >= 50).length;
    const uniqueLocations = new Set(
      assetsWithScores.map((a) => a.city).filter(Boolean)
    ).size;

    return {
      overallRiskScore,
      overallRiskClass: riskFromScore(overallRiskScore),
      totalAssets,
      totalAssessments,
      totalAssessmentsCompleted,
      assetsUnderHighRisk: highRiskCount,
      recentAssessmentCount: 5,
      uniqueLocations,
      lastUpdated: new Date().toISOString(),
    };
  },

  /**
   * Top-N assets by composite risk (default 3).
   */
  async getTopRiskAssets(
    organizationId: string,
    limit = 3
  ) {
    const assets = await prisma.asset.findMany({
      where: {
        organizationId,
        isDeleted: false,
        assessments: { some: { isLatest: true, status: AssessmentStatus.COMPLETED } },
      },
      include: {
        assessments: {
          where: { isLatest: true, status: AssessmentStatus.COMPLETED },
          take: 1,
          orderBy: { createdAt: "desc" },
          include: { climateRiskScores: true },
        },
      },
      take: 200,
    });
    const ranked = assets
      .map((a) => {
        const scores = a.assessments[0]?.climateRiskScores ?? [];
        const avg =
          scores.length > 0
            ? scores.reduce((s, x) => s + Number(x.score ?? 0), 0) /
              scores.length
            : 0;
        const top = topHazard(
          scores.map((s) => ({ riskType: s.riskType ?? "flood", score: s.score }))
        );
        return {
          assetId: a.id,
          assetName: a.name,
          assetType: a.type,
          location: {
            city: a.city,
            state: a.state,
            country: a.country,
            lat: a.latitude ? Number(a.latitude) : null,
            lon: a.longitude ? Number(a.longitude) : null,
          },
          overallRisk: Math.round(avg * 10) / 10,
          riskClass: riskFromScore(avg),
          mainHazard: top.hazard,
          mainHazardScore: Math.round(top.score * 10) / 10,
        };
      })
      .sort((a, b) => b.overallRisk - a.overallRisk)
      .slice(0, limit);
    return ranked;
  },

  /**
   * Most recent N assessments (default 5) — drives the "Last 5 Asset
   * Assessments" table.
   */
  async getRecentAssessments(organizationId: string, limit = 5) {
    const assessments = await prisma.assessment.findMany({
      where: {
        asset: { organizationId, isDeleted: false },
      },
      orderBy: { createdAt: "desc" },
      take: limit,
      include: {
        asset: true,
        climateRiskScores: true,
      },
    });
    return assessments.map((a) => {
      const scores = a.climateRiskScores ?? [];
      const avg =
        scores.length > 0
          ? scores.reduce((s, x) => s + Number(x.score ?? 0), 0) / scores.length
          : 0;
      const top = topHazard(
        scores.map((s) => ({ riskType: s.riskType ?? "flood", score: s.score }))
      );
      return {
        id: a.id,
        assetId: a.assetId,
        assetName: a.asset?.name,
        assetType: a.asset?.type,
        location: { city: a.asset?.city },
        startedAt: a.startedAt ?? a.createdAt,
        scenario: null, // not stored in Assessment model — see scenario analysis
        horizon: null,
        compositeRisk: Math.round(avg * 10) / 10,
        riskClass: riskFromScore(avg),
        mainHazard: top.hazard,
        mainHazardScore: Math.round(top.score * 10) / 10,
        status: a.status,
        assessmentId: `PE-ORG-${(a.startedAt ?? a.createdAt)
          .toISOString()
          .slice(0, 10)}-${a.id.slice(0, 8)}`,
      };
    });
  },

  /**
   * Asset point list (lat/lon + risk) for the dashboard map.
   * Returns GeoJSON FeatureCollection.
   */
  async getAssetPoints(organizationId: string) {
    const assets = await prisma.asset.findMany({
      where: {
        organizationId,
        isDeleted: false,
        latitude: { not: null },
        longitude: { not: null },
      },
      include: {
        assessments: {
          where: { isLatest: true, status: AssessmentStatus.COMPLETED },
          take: 1,
          orderBy: { createdAt: "desc" },
          include: { climateRiskScores: true },
        },
      },
      take: 500,
    });
    return {
      type: "FeatureCollection",
      features: assets.map((a) => {
        const scores = a.assessments[0]?.climateRiskScores ?? [];
        const avg =
          scores.length > 0
            ? scores.reduce((s, x) => s + Number(x.score ?? 0), 0) /
              scores.length
            : 0;
        const top = topHazard(
          scores.map((s) => ({ riskType: s.riskType ?? "flood", score: s.score }))
        );
        return {
          type: "Feature",
          geometry: {
            type: "Point",
            coordinates: [
              Number(a.longitude),
              Number(a.latitude),
            ],
          },
          properties: {
            assetId: a.id,
            assetName: a.name,
            assetType: a.type,
            city: a.city,
            country: a.country,
            riskScore: Math.round(avg * 10) / 10,
            mainHazard: top.hazard,
          },
        };
      }),
    };
  },
};
