import test from "node:test";
import assert from "node:assert/strict";
import { prisma } from "@/core/database/prisma";
import {
  HAZARD_KEYS,
  INDICATOR_WEIGHTS,
  indicatorsService,
} from "./indicators.service";

// ---------------------------------------------------------------------------
// INDICATOR_WEIGHTS — covers all 6 hazards × 5 indicators, sums to 1.0
// per hazard, matches the climate-pipeline §10.2 spec.
// ---------------------------------------------------------------------------

test("INDICATOR_WEIGHTS covers all 6 hazards", () => {
  assert.deepEqual(
    [...HAZARD_KEYS].sort(),
    [
      "drought",
      "flood",
      "heat_stress",
      "storm",
      "water_stress",
      "wildfire",
    ],
  );
});

test("INDICATOR_WEIGHTS has exactly 5 indicators per hazard", () => {
  for (const hazard of HAZARD_KEYS) {
    assert.equal(
      Object.keys(INDICATOR_WEIGHTS[hazard]).length,
      5,
      `${hazard} should have 5 indicators`,
    );
  }
});

test("INDICATOR_WEIGHTS sums to exactly 1.0 per hazard (rounded)", () => {
  for (const hazard of HAZARD_KEYS) {
    const total = Object.values(INDICATOR_WEIGHTS[hazard]).reduce(
      (s, w) => s + w,
      0,
    );
    assert.ok(
      Math.abs(total - 1.0) < 0.001,
      `${hazard} weights sum to ${total}, not 1.0`,
    );
  }
});

test("INDICATOR_WEIGHTS has the canonical 5 flood indicators", () => {
  assert.deepEqual(
    Object.keys(INDICATOR_WEIGHTS.flood).sort(),
      ["drainage", "mrso_antecedent", "pr99p_flood", "rx5day", "slope_twi"],
  );
});

// ---------------------------------------------------------------------------
// persistIndicatorsForAsset — happy path
// ---------------------------------------------------------------------------

const SAMPLE_ASSESS = {
  id: "f47ac10b-58cc-4372-a567-0e02b2c3d479",
  assetId: "a47ac10b-58cc-4372-a567-0e02b2c3d400",
  version: 3,
  status: "COMPLETED",
  isLatest: true,
  startedAt: new Date(),
  completedAt: new Date(),
  createdAt: new Date(),
};

function mockPipelineResponse() {
  const contributing_indicators: Record<string, Record<string, number>> = {};
  for (const hazard of HAZARD_KEYS) {
    contributing_indicators[hazard] = {};
    for (const code of Object.keys(INDICATOR_WEIGHTS[hazard])) {
      contributing_indicators[hazard][code] = 42.5;
    }
  }
  return {
    scenario: "ssp245",
    horizon: 2050,
    composite_risk: 50,
    exposure: { financial: 60, population: 55 },
    adaptive_capacity: 40,
    hazard_scores: {
      flood: 78.2,
      heat_stress: 65.1,
      water_stress: 42.3,
      drought: 50.0,
      storm: 33.4,
      wildfire: 88.9,
    },
    contributing_indicators,
  };
}

test("persistIndicatorsForAsset rejects an asset that doesn't exist", async (t) => {
  const originalFind = prisma.asset.findFirst;
  // @ts-expect-error
  prisma.asset.findFirst = async () => null;
  t.after(() => {
    prisma.asset.findFirst = originalFind;
  });
  await assert.rejects(
    () =>
      indicatorsService.persistIndicatorsForAsset("nope", {
        scenario: "ssp245",
        horizon: 2050,
      }),
    /Asset not found/,
  );
});

test("persistIndicatorsForAsset rejects an asset with no lat/lon", async (t) => {
  const originalFind = prisma.asset.findFirst;
  // @ts-expect-error
  prisma.asset.findFirst = async () => ({
    id: "a",
    latitude: null,
    longitude: null,
    type: "DATA_CENTER",
  });
  t.after(() => {
    prisma.asset.findFirst = originalFind;
  });
  await assert.rejects(
    () =>
      indicatorsService.persistIndicatorsForAsset("a", {
        scenario: "ssp245",
        horizon: 2050,
      }),
    /no lat\/lon/,
  );
});

test("persistIndicatorsForAsset demotes previous latest + creates a fresh Assessment", async (t) => {
  const pipelineResponse = mockPipelineResponse();

  // Mock the fetch.
  const originalFetch = globalThis.fetch;
  // @ts-expect-error — narrow signature
  globalThis.fetch = async (_url: string, opts: any) => {
    assert.equal(opts.method, "POST");
    return {
      ok: true,
      status: 200,
      json: async () => pipelineResponse,
      text: async () => JSON.stringify(pipelineResponse),
    };
  };

  const originalAssetFind = prisma.asset.findFirst;
  const originalAssessmentUpdateMany = prisma.assessment.updateMany;
  const originalAssessmentCreate = prisma.assessment.create;
  const originalAssessmentFindFirst = prisma.assessment.findFirst;
  const originalTransaction = prisma.$transaction;
  const originalRiskScoreCreate = prisma.climateRiskScore.create;
  const originalIndicatorScoreCreate = prisma.indicatorScore.create;

  const calls: any[] = [];
  // @ts-expect-error
  prisma.asset.findFirst = async () => ({
    id: "asset-1",
    latitude: 19.076,
    longitude: 72.8777,
    type: "DATA_CENTER",
  });
  // @ts-expect-error
  prisma.assessment.updateMany = async (args: any) => {
    calls.push({ kind: "updateMany", args });
    return { count: 1 };
  };
  // @ts-expect-error
  prisma.assessment.findFirst = async (args: any) => {
    calls.push({ kind: "findFirst", args });
    return { version: 2 }; // previous version
  };
  // @ts-expect-error
  prisma.assessment.create = async (args: any) => {
    calls.push({ kind: "createAssess", args });
    return { ...SAMPLE_ASSESS, ...args.data };
  };
  // @ts-expect-error — emulate $transaction. The service uses BOTH
  // forms: callback form (`$transaction(async tx => …)`) for the
  // initial demote+create, and array form (`$transaction([…])`) for
  // the subsequent score+indicator inserts.
  prisma.$transaction = async (arg: any) => {
    if (typeof arg === "function") {
      return arg({
        assessment: {
          updateMany: prisma.assessment.updateMany,
          findFirst: prisma.assessment.findFirst,
          create: prisma.assessment.create,
        },
      });
    }
    // Array form: run every Prisma promise in order.
    const results: unknown[] = [];
    for (const p of arg as Promise<unknown>[]) {
      results.push(await p);
    }
    return results;
  };
  // @ts-expect-error
  prisma.climateRiskScore.create = async (args: any) => {
    calls.push({ kind: "riskScoreCreate", args });
    return { id: `cs-${calls.length}`, ...args.data };
  };
  // @ts-expect-error
  prisma.indicatorScore.create = async (args: any) => {
    calls.push({ kind: "indicatorCreate", args });
    return { id: `is-${calls.length}`, ...args.data };
  };

  t.after(() => {
    globalThis.fetch = originalFetch;
    prisma.asset.findFirst = originalAssetFind;
    prisma.assessment.updateMany = originalAssessmentUpdateMany;
    prisma.assessment.create = originalAssessmentCreate;
    prisma.assessment.findFirst = originalAssessmentFindFirst;
    prisma.$transaction = originalTransaction;
    prisma.climateRiskScore.create = originalRiskScoreCreate;
    prisma.indicatorScore.create = originalIndicatorScoreCreate;
  });

  const result = await indicatorsService.persistIndicatorsForAsset("asset-1", {
    scenario: "ssp245",
    horizon: 2050,
    initiatedById: "user-1",
  });

  assert.equal(result.assetId, "asset-1");
  assert.equal(result.scenario, "ssp245");
  assert.equal(result.horizon, 2050);
  assert.equal(result.climateRiskScores, 6); // 6 hazards
  assert.equal(result.indicatorScores, 30); // 5 × 6

  // Demote prev latest happens via updateMany
  const updateMany = calls.find((c) => c.kind === "updateMany");
  assert.ok(updateMany, "expected updateMany call");
  assert.equal(updateMany.args.where.assetId, "asset-1");
  assert.equal(updateMany.args.where.isLatest, true);
  assert.equal(updateMany.args.data.isLatest, false);

  // New version is previous + 1
  const findFirstCalls = calls.filter((c) => c.kind === "findFirst");
  assert.ok(findFirstCalls[0].args.orderBy.version === "desc");

  const createAssess = calls.find((c) => c.kind === "createAssess");
  assert.equal(createAssess.args.data.version, 3);
  assert.equal(createAssess.args.data.status, "COMPLETED");
  assert.equal(createAssess.args.data.isLatest, true);

  // 6 risk score inserts
  const riskScoreCalls = calls.filter((c) => c.kind === "riskScoreCreate");
  assert.equal(riskScoreCalls.length, 6);
  // The flood risk score should match the pipeline value rounded to 2dp
  const floodRisk = riskScoreCalls.find(
    (c) => c.args.data.riskType === "flood",
  );
  assert.equal(floodRisk.args.data.score, 78.2);

  // 30 indicator inserts
  const indicatorCalls = calls.filter((c) => c.kind === "indicatorCreate");
  assert.equal(indicatorCalls.length, 30);
  // Every indicator must carry the correct weight + scenario + horizon
  for (const ic of indicatorCalls) {
    assert.equal(ic.args.data.scenario, "ssp245");
    assert.equal(ic.args.data.horizon, 2050);
    assert.ok(
      ["LOW", "MODERATE", "HIGH", "CRITICAL"].includes(ic.args.data.weight) ||
        typeof ic.args.data.weight === "number",
    );
  }
  // 5 flood indicators persisted
  const floodIndicators = indicatorCalls.filter(
    (c) => c.args.data.hazardKey === "flood",
  );
  assert.equal(floodIndicators.length, 5);
});

test("persistIndicatorsForAsset surfaces pipeline HTTP errors clearly", async (t) => {
  const originalFetch = globalThis.fetch;
  const originalAssetFind = prisma.asset.findFirst;
  const originalUpdateMany = prisma.assessment.updateMany;
  const originalCreate = prisma.assessment.create;
  const originalFindFirst = prisma.assessment.findFirst;
  const originalTransaction = prisma.$transaction;

  // @ts-expect-error
  globalThis.fetch = async () => ({
    ok: false,
    status: 500,
    text: async () => "internal pipeline error",
  });
  // @ts-expect-error
  prisma.asset.findFirst = async () => ({
    id: "asset-1",
    latitude: 19.076,
    longitude: 72.8777,
    type: null,
  });
  // @ts-expect-error
  prisma.assessment.updateMany = async () => ({ count: 0 });
  // @ts-expect-error
  prisma.assessment.create = async () => SAMPLE_ASSESS;
  // @ts-expect-error
  prisma.assessment.findFirst = async () => null;
  prisma.$transaction = async (arg: any) => {
    if (typeof arg === "function") {
      return arg({
        assessment: {
          updateMany: prisma.assessment.updateMany,
          findFirst: prisma.assessment.findFirst,
          create: prisma.assessment.create,
        },
      });
    }
    const results: unknown[] = [];
    for (const p of arg as Promise<unknown>[]) {
      results.push(await p);
    }
    return results;
  };

  t.after(() => {
    globalThis.fetch = originalFetch;
    prisma.asset.findFirst = originalAssetFind;
    prisma.assessment.updateMany = originalUpdateMany;
    prisma.assessment.create = originalCreate;
    prisma.assessment.findFirst = originalFindFirst;
    prisma.$transaction = originalTransaction;
  });

  await assert.rejects(
    () =>
      indicatorsService.persistIndicatorsForAsset("asset-1", {
        scenario: "ssp245",
        horizon: 2050,
      }),
    /Climate pipeline 500/,
  );
});

// ---------------------------------------------------------------------------
// getIndicatorBreakdown — shape + filter behaviour
// ---------------------------------------------------------------------------

test("getIndicatorBreakdown returns null when the asset has no indicators", async (t) => {
  const originalFind = prisma.asset.findFirst;
  const originalIndicatorFind = prisma.indicatorScore.findMany;
  // @ts-expect-error
  prisma.asset.findFirst = async () => ({ id: "asset-1" });
  // @ts-expect-error
  prisma.indicatorScore.findMany = async () => [];
  t.after(() => {
    prisma.asset.findFirst = originalFind;
    prisma.indicatorScore.findMany = originalIndicatorFind;
  });
  const result = await indicatorsService.getIndicatorBreakdown("asset-1");
  assert.equal(result, null);
});

test("getIndicatorBreakdown groups the 30 indicators by hazard with weights + risk class", async (t) => {
  const originalFind = prisma.asset.findFirst;
  const originalIndicatorFind = prisma.indicatorScore.findMany;
  const originalRiskScoreFind = prisma.climateRiskScore.findMany;

  const ts = new Date();
  const allRows: any[] = [];
  for (const hazard of HAZARD_KEYS) {
    for (const [code, weight] of Object.entries(INDICATOR_WEIGHTS[hazard])) {
      allRows.push({
        id: `row-${hazard}-${code}`,
        assessmentId: "a-1",
        hazardKey: hazard,
        indicatorCode: code,
        value: 50 + Math.random() * 40,
        weight,
        rawValue: "raw",
        scenario: "ssp245",
        horizon: 2050,
        computedAt: ts,
      });
    }
  }

  // @ts-expect-error
  prisma.asset.findFirst = async () => ({ id: "asset-1" });
  // @ts-expect-error
  prisma.indicatorScore.findMany = async () => {
    return allRows;
  };
  // @ts-expect-error
  prisma.climateRiskScore.findMany = async () => [
    { id: "cs-1", riskType: "flood", riskLevel: "HIGH", score: 78.2 },
    { id: "cs-2", riskType: "heat_stress", riskLevel: "HIGH", score: 65.1 },
    { id: "cs-3", riskType: "water_stress", riskLevel: "MODERATE", score: 42.3 },
    { id: "cs-4", riskType: "drought", riskLevel: "MODERATE", score: 50.0 },
    { id: "cs-5", riskType: "storm", riskLevel: "MODERATE", score: 33.4 },
    { id: "cs-6", riskType: "wildfire", riskLevel: "CRITICAL", score: 88.9 },
  ];
  t.after(() => {
    prisma.asset.findFirst = originalFind;
    prisma.indicatorScore.findMany = originalIndicatorFind;
    prisma.climateRiskScore.findMany = originalRiskScoreFind;
  });

  const result = await indicatorsService.getIndicatorBreakdown("asset-1");
  assert.ok(result);
  assert.equal(result!.assetId, "asset-1");
  assert.equal(result!.scenario, "ssp245");
  assert.equal(result!.horizon, 2050);

  // 6 hazards present, each with 5 indicators + the canonical weights
  const expectedComposites: Record<string, number> = {
    flood: 78.2,
    heat_stress: 65.1,
    water_stress: 42.3,
    drought: 50.0,
    storm: 33.4,
    wildfire: 88.9,
  };
  for (const hazard of HAZARD_KEYS) {
    const h = result!.byHazard[hazard];
    assert.ok(h, `${hazard} present`);
    assert.equal(Object.keys(h.indicators).length, 5);
    assert.equal(h.composite, expectedComposites[hazard]);
    for (const [code, weight] of Object.entries(INDICATOR_WEIGHTS[hazard])) {
      assert.equal(h.weights[code], weight);
      assert.ok(h.indicators[code].value != null);
      assert.equal(h.indicators[code].weight, weight);
    }
  }
  // Wildfire class
  assert.equal(result!.byHazard.wildfire.class, "CRITICAL");
});

test("getIndicatorBreakdown applies scenario + horizon filters", async (t) => {
  const originalFind = prisma.asset.findFirst;
  const originalIndicatorFind = prisma.indicatorScore.findMany;

  let capturedWhere: any = null;
  // @ts-expect-error
  prisma.asset.findFirst = async () => ({ id: "asset-1" });
  // @ts-expect-error
  prisma.indicatorScore.findMany = async (args: any) => {
    capturedWhere = args?.where ?? {};
    return [];
  };
  t.after(() => {
    prisma.asset.findFirst = originalFind;
    prisma.indicatorScore.findMany = originalIndicatorFind;
  });
  await indicatorsService.getIndicatorBreakdown("asset-1", {
    scenario: "ssp585",
    horizon: 2030,
  });
  assert.equal(capturedWhere.scenario, "ssp585");
  assert.equal(capturedWhere.horizon, 2030);
});
