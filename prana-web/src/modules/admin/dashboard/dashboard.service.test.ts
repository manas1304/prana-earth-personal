import test from "node:test";
import assert from "node:assert/strict";
import { prisma } from "@/core/database/prisma";
import {
  adminDashboardService,
  type DashboardRange,
} from "./dashboard.service";

/**
 * Tests for the 30/60/90/1Y range filter on `getDashboardMetrics`.
 *
 * We mock `prisma.user.count`, `prisma.project.count`, etc. to
 * capture the `where.createdAt.gte` argument and assert that the
 * service applies the right lower bound for each range.
 *
 * The mock returns 7 for the 7d call (the service is hard-coded
 * to call the count 10 times in parallel), so we just compare the
 * captured `where` clauses.
 */

interface CapturedCount {
  model: string;
  where: any;
}

const captured: CapturedCount[] = [];

function installCountMocks(t: any) {
  const models = [
    "user",
    "project",
    "dPRRequest",
    "expressInterest",
    "systemEvent",
    "contactSubmission",
    "subscription",
    "subscription",
    "subscription",
    "subscription",
  ] as const;
  for (const model of models) {
    const key = model as keyof typeof prisma;
    // @ts-expect-error
    prisma[key].count = async (args: any) => {
      captured.push({ model: String(model), where: args?.where ?? {} });
      return 7; // arbitrary non-zero
    };
  }
  t.after(() => {
    // Reset by reassigning to the original method (no-op for the test
    // process since each test installs fresh mocks in `t.after`).
  });
}

function resetCaptured() {
  captured.length = 0;
}

function countsByModel(model: string): CapturedCount[] {
  return captured.filter((c) => c.model === model);
}

test("30d range → createdAt gte ≈ 30 days ago", async (t) => {
  resetCaptured();
  installCountMocks(t);
  const before = Date.now();
  await adminDashboardService.getDashboardMetrics("30d");
  const after = Date.now();

  const userCount = countsByModel("user")[0];
  assert.ok(userCount, "user.count should have been called");
  const gte = userCount.where.createdAt?.gte;
  assert.ok(gte instanceof Date, "gte must be a Date");

  // 30 days = 30 * 24 * 60 * 60 * 1000 ms
  const expectedMs = 30 * 24 * 60 * 60 * 1000;
  const lower = before - expectedMs;
  const upper = after - expectedMs;
  assert.ok(
    gte.getTime() >= lower && gte.getTime() <= upper,
    `30d lower bound should be ~30d ago (got ${gte.toISOString()})`,
  );
});

test("7d range → createdAt gte ≈ 7 days ago", async (t) => {
  resetCaptured();
  installCountMocks(t);
  const before = Date.now();
  await adminDashboardService.getDashboardMetrics("7d");
  const userCount = countsByModel("user")[0];
  const gte: Date = userCount.where.createdAt?.gte;
  const sevenDaysAgo = before - 7 * 24 * 60 * 60 * 1000;
  assert.ok(
    gte.getTime() >= sevenDaysAgo - 50 && gte.getTime() <= sevenDaysAgo + 50,
    `7d lower bound should be exactly 7 days ago (got ${gte.toISOString()})`,
  );
});

test("1y range → createdAt gte ≈ 1 year ago", async (t) => {
  resetCaptured();
  installCountMocks(t);
  const before = Date.now();
  await adminDashboardService.getDashboardMetrics("1y");
  const userCount = countsByModel("user")[0];
  const gte: Date = userCount.where.createdAt?.gte;
  // 1 year in ms = 365 * 24 * 60 * 60 * 1000 (approx; ignores leap)
  const oneYearMs = 365 * 24 * 60 * 60 * 1000;
  const expected = before - oneYearMs;
  assert.ok(
    Math.abs(gte.getTime() - expected) < 1000,
    `1y lower bound should be ~365d ago`,
  );
});

test("every range applies the same gte to every filtered count call", async (t) => {
  for (const range of [
    "7d",
    "30d",
    "60d",
    "90d",
    "1y",
  ] as DashboardRange[]) {
    resetCaptured();
    installCountMocks(t);
    await adminDashboardService.getDashboardMetrics(range);

    // The 6 date-windowed counts (user, project, dPRRequest,
    // expressInterest, systemEvent, contactSubmission) all share the
    // same `createdAt.gte`. The 4 subscription counts are not
    // date-filtered — they show the *current* active plan mix.
    const gteValues = captured
      .map((c) => c.where.createdAt?.gte)
      .filter((d): d is Date => d instanceof Date);
    assert.equal(
      gteValues.length,
      6,
      `${range} should apply gte to the 6 date-windowed counts (got ${gteValues.length})`,
    );
    for (let i = 1; i < gteValues.length; i++) {
      assert.equal(
        gteValues[i].getTime(),
        gteValues[0].getTime(),
        `${range} count[${i}] gte should match count[0]`,
      );
    }
  }
});

test("the service response carries the range + rangeStart back to the caller", async (t) => {
  resetCaptured();
  installCountMocks(t);
  const out = await adminDashboardService.getDashboardMetrics("60d");
  assert.equal(out.range, "60d");
  assert.ok(typeof out.rangeStart === "string");
  // The lower bound should be ~60 days ago.
  const lower = new Date(out.rangeStart!).getTime();
  const now = Date.now();
  const sixtyDaysAgo = now - 60 * 24 * 60 * 60 * 1000;
  assert.ok(
    Math.abs(lower - sixtyDaysAgo) < 1000,
    `rangeStart should be 60d ago`,
  );
});

test("default range when none is provided is 30d", async (t) => {
  resetCaptured();
  installCountMocks(t);
  const out = await adminDashboardService.getDashboardMetrics();
  assert.equal(out.range, "30d");
});
