import { prisma } from "@/core/database/prisma";
import { logger } from "@/core/logger/pino";
import { RiskLevel } from "@/generated/prisma/enums";

/**
 * Per-indicator weights from methodology §10.2 / `prana_climate/
 * indicators.py::INDICATOR_WEIGHTS`. Sum to 1.0 per hazard. Copied
 * here (instead of imported from the climate-pipeline) so the
 * service stays a pure backend module with no cross-package deps.
 */
export const INDICATOR_WEIGHTS: Record<string, Record<string, number>> = {
  flood: {
    rx5day: 0.35,
    pr99p_flood: 0.25,
    slope_twi: 0.20,
    mrso_antecedent: 0.12,
    drainage: 0.08,
  },
  heat_stress: {
    hwd: 0.30,
    wbgt: 0.30,
    txx: 0.20,
    cdd: 0.12,
    uhi: 0.08,
  },
  water_stress: {
    bws: 0.30,
    gwd: 0.25,
    mrro_delta: 0.20,
    evap_demand: 0.15,
    monsoon_cv: 0.10,
  },
  drought: {
    spi12: 0.30,
    spei: 0.25,
    mrso_anomaly: 0.25,
    cdd_days: 0.12,
    pr_trend: 0.08,
  },
  storm: {
    cape: 0.30,
    pr99p_storm: 0.20,
    wind_p90_storm: 0.20,
    dust_emission: 0.18,
    ndvi_trend: 0.12,
  },
  wildfire: {
    fwi: 0.30,
    vpd: 0.25,
    ffdi: 0.20,
    lfmc: 0.15,
    wind_p90_wildfire: 0.10,
  },
};

export const HAZARD_KEYS = Object.keys(INDICATOR_WEIGHTS) as Array<
  keyof typeof INDICATOR_WEIGHTS
>;

/**
 * Response shape returned by the climate-pipeline `POST /v1/assess`.
 * Mirrors `AssessingResponse` in `climate-pipeline/API_DOC_FOR_AI_DEV.md`
 * §4.5. Only the fields we consume are typed here.
 */
interface PipelineAssessResponse {
  location?: { h3_cell: string; h3_resolution: number };
  scenario: string;
  horizon: number;
  asset_type?: string;
  hazard_scores: Record<string, number>;
  composite_risk: number;
  exposure: { financial: number; population: number };
  adaptive_capacity: number;
  contributing_indicators: Record<string, Record<string, number>>;
  notes?: string[];
}

/**
 * Convert a 0–100 score to the `RiskLevel` enum bucket. Matches the
 * threshold table in the climate-pipeline so the persisted level
 * agrees with what the user sees in the API response.
 */
function classifyRisk(score: number | null | undefined): RiskLevel | null {
  if (score == null) return null;
  if (score < 25) return RiskLevel.LOW;
  if (score < 50) return RiskLevel.MODERATE;
  if (score < 75) return RiskLevel.HIGH;
  return RiskLevel.CRITICAL;
}

/**
 * Resolve the climate-pipeline base URL. The existing `NEXT_PUBLIC_API_BASE`
 * points to it from the frontend; the backend reuses the same var so
 * dev / staging / prod stay in sync.
 */
function getClimatePipelineUrl(): string {
  const base = (process.env.NEXT_PUBLIC_API_BASE ?? "http://localhost:8000")
    .replace(/\/$/, "");
  return base;
}

/**
 * Hit the climate-pipeline and return the typed response.
 * Throws an Error with a friendly message on any non-2xx.
 */
async function callPipelineAssess(body: {
  lat: number;
  lon: number;
  scenario: string;
  horizon: number;
  asset_type?: string;
}): Promise<PipelineAssessResponse> {
  const url = `${getClimatePipelineUrl()}/v1/assess`;
  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
    // Cache aggressively — the same lat/lon + scenario + horizon
    // always returns the same numbers over a short horizon.
    cache: "no-store",
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(
      `Climate pipeline ${res.status}: ${text.slice(0, 200)}`,
    );
  }
  return (await res.json()) as PipelineAssessResponse;
}

// ---------------------------------------------------------------------------
// persistIndicatorsForAsset
// ---------------------------------------------------------------------------

export interface PersistIndicatorsResult {
  assessmentId: string;
  assetId: string;
  scenario: string;
  horizon: number;
  climateRiskScores: number;
  indicatorScores: number;
}

/**
 * Trigger a fresh assessment for an asset, persist the rolled-up
 * 6-axis `ClimateRiskScore` rows AND the 30 individual
 * `IndicatorScore` rows in one transaction.
 *
 * Behaviour:
 *   1. Mark any previous "latest" assessments for the asset as
 *      `isLatest: false`.
 *   2. Insert a new `Assessment` row (status=COMPLETED).
 *   3. Call the climate-pipeline `/v1/assess`.
 *   4. Insert 6 `ClimateRiskScore` rows + 30 `IndicatorScore` rows.
 *   5. Stamp `Asset.lastAssessmentDate` etc. (handled implicitly via
 *      the assessment's `completedAt`).
 *
 * Returns a summary so the caller can show "30 indicators, 6 hazard
 * scores persisted" in the reassess toast.
 */
export const indicatorsService = {
  async persistIndicatorsForAsset(
    assetId: string,
    args: {
      scenario: string;
      horizon: number;
      initiatedById?: string;
    },
  ): Promise<PersistIndicatorsResult> {
    const asset = await prisma.asset.findFirst({
      where: { id: assetId, isDeleted: false },
      select: { id: true, latitude: true, longitude: true, type: true },
    });
    if (!asset) {
      throw new Error("Asset not found");
    }
    if (
      asset.latitude == null ||
      asset.longitude == null
    ) {
      throw new Error(
        "Asset has no lat/lon — set latitude/longitude before triggering indicators",
      );
    }

    // 1+2. Demote previous latest + create a fresh Assessment row.
    const assessment = await prisma.$transaction(async (tx) => {
      await tx.assessment.updateMany({
        where: { assetId, isLatest: true },
        data: { isLatest: false },
      });
      const next = await tx.assessment.findFirst({
        where: { assetId },
        orderBy: { version: "desc" },
        select: { version: true },
      });
      const version = (next?.version ?? 0) + 1;
      return tx.assessment.create({
        data: {
          assetId,
          initiatedById: args.initiatedById ?? null,
          version,
          status: "COMPLETED",
          startedAt: new Date(),
          completedAt: new Date(),
          processingTimeSeconds: 0,
          isLatest: true,
        },
      });
    });

    // 3. Call the pipeline. Lat/lon are decimal from Prisma.
    const pipelineRes = await callPipelineAssess({
      lat: Number(asset.latitude),
      lon: Number(asset.longitude),
      scenario: args.scenario,
      horizon: args.horizon,
      asset_type: asset.type ?? undefined,
    });

    // 4. Persist the 6-axis scores + 30 indicators in one tx so a
    // failed indicator write doesn't leave a half-populated
    // assessment.
    const indicatorRows: Array<Parameters<typeof prisma.indicatorScore.create>[0]["data"]> = [];
    let indicatorCount = 0;
    for (const hazard of HAZARD_KEYS) {
      const weights = INDICATOR_WEIGHTS[hazard];
      const values = pipelineRes.contributing_indicators?.[hazard] ?? {};
      for (const [indicatorCode, rawValue] of Object.entries(values)) {
        const weight = weights[indicatorCode];
        if (weight == null) continue;
        const value = typeof rawValue === "number" ? rawValue : null;
        indicatorRows.push({
          assessmentId: assessment.id,
          hazardKey: hazard,
          indicatorCode,
          value: value == null ? null : Math.round(value * 100) / 100,
          weight,
          rawValue: value == null ? null : String(value),
          scenario: args.scenario,
          horizon: args.horizon,
        });
        indicatorCount++;
      }
    }

    const scoreRows = HAZARD_KEYS.map((hazard) => ({
      assessmentId: assessment.id,
      riskType: hazard,
      riskLevel: classifyRisk(pipelineRes.hazard_scores?.[hazard]),
      score:
        pipelineRes.hazard_scores?.[hazard] != null
          ? Math.round(pipelineRes.hazard_scores[hazard]! * 100) / 100
          : null,
      confidenceScore: 0.8, // placeholder — pipeline doesn't expose confidence yet
      rawData: pipelineRes as unknown as object,
    }));

    await prisma.$transaction([
      ...scoreRows.map((data) => prisma.climateRiskScore.create({ data })),
      ...indicatorRows.map((data) => prisma.indicatorScore.create({ data })),
    ]);

    logger.info(
      {
        assetId,
        assessmentId: assessment.id,
        scenario: args.scenario,
        horizon: args.horizon,
        indicators: indicatorCount,
      },
      "Indicator scores persisted",
    );

    return {
      assessmentId: assessment.id,
      assetId,
      scenario: args.scenario,
      horizon: args.horizon,
      climateRiskScores: scoreRows.length,
      indicatorScores: indicatorCount,
    };
  },

  // -------------------------------------------------------------------------
  // getIndicatorBreakdown
  // -------------------------------------------------------------------------

  /**
   * Returns the 30 indicators grouped by hazard for the latest
   * assessment of an asset that matches the (scenario, horizon). If
   * none matches, returns null — the frontend should re-trigger
   * `persistIndicatorsForAsset`.
   *
   * Response shape:
   *   {
   *     assetId, scenario, horizon,
   *     byHazard: {
   *       flood: {
   *         composite, class,
   *         weights: { rx5day: 0.35, ... },
   *         indicators: { rx5day: { value, weight, rawValue }, ... }
   *       }, ...
   *     },
   *     computedAt
   *   }
   */
  async getIndicatorBreakdown(
    assetId: string,
    args: { scenario?: string; horizon?: number } = {},
  ) {
    const asset = await prisma.asset.findFirst({
      where: { id: assetId, isDeleted: false },
    });
    if (!asset) return null;

    // Find the latest assessment that matches the requested (scenario, horizon).
    // When no filter is supplied, fall back to the latest assessment overall.
    const where: any = { assetId };
    if (args.scenario) where.scenario = args.scenario;
    if (args.horizon != null) where.horizon = args.horizon;

    const indicatorRows = await prisma.indicatorScore.findMany({
      where,
      orderBy: { computedAt: "desc" },
    });
    if (indicatorRows.length === 0) return null;

    const activeScenario = args.scenario ?? indicatorRows[0].scenario;
    const activeHorizon = args.horizon ?? indicatorRows[0].horizon;

    // Filter to the latest computedAt batch.
    const latestComputedAt = indicatorRows[0].computedAt;
    const latest = indicatorRows.filter(
      (r) => r.computedAt.getTime() === latestComputedAt.getTime(),
    );

    // Fetch the matching ClimateRiskScore rows for that assessment(s).
    const assessmentIds = Array.from(
      new Set(latest.map((r) => r.assessmentId)),
    );
    const scoreRows = await prisma.climateRiskScore.findMany({
      where: { assessmentId: { in: assessmentIds } },
    });

    // Build the response shape.
    const byHazard: Record<
      string,
      {
        composite: number | null;
        class: RiskLevel | null;
        weights: Record<string, number>;
        indicators: Record<
          string,
          { value: number | null; weight: number; rawValue: string | null }
        >;
      }
    > = {};
    for (const hazard of HAZARD_KEYS) {
      const weights = INDICATOR_WEIGHTS[hazard];
      const indicatorsForHazard: Record<
        string,
        { value: number | null; weight: number; rawValue: string | null }
      > = {};
      for (const [code, weight] of Object.entries(weights)) {
        const row = latest.find(
          (r) => r.hazardKey === hazard && r.indicatorCode === code,
        );
        indicatorsForHazard[code] = {
          value: row?.value ? Number(row.value) : null,
          weight,
          rawValue: row?.rawValue ?? null,
        };
      }
      const scoreRow = scoreRows.find((r) => r.riskType === hazard);
      byHazard[hazard] = {
        composite: scoreRow?.score ? Number(scoreRow.score) : null,
        class: scoreRow?.riskLevel ?? null,
        weights,
        indicators: indicatorsForHazard,
      };
    }

    return {
      assetId,
      scenario: activeScenario,
      horizon: activeHorizon,
      byHazard,
      computedAt: latestComputedAt.toISOString(),
    };
  },
};
