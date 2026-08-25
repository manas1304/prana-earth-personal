"use server";

import { getCurrentUser } from "@/core/auth/session";
import { UnauthorizedError } from "@/core/errors/api-error";
import { logger } from "@/core/logger/pino";
import { successResponse } from "@/core/responses/success-response";
import {
  adminDashboardService,
  DashboardRange,
} from "@/modules/admin/dashboard/dashboard.service";

const VALID_RANGES: DashboardRange[] = ["7d", "30d", "60d", "90d", "1y"];

function parseRange(input: unknown): DashboardRange {
  if (typeof input === "string" && (VALID_RANGES as string[]).includes(input)) {
    return input as DashboardRange;
  }
  return "30d";
}

async function checkAdminAccess() {
  const currentUser = await getCurrentUser();
  if (!currentUser) {
    throw new UnauthorizedError("Not authenticated");
  }
  if (currentUser.role !== "ADMIN") {
    throw new UnauthorizedError("Unauthorized: Admin access required");
  }
  return currentUser;
}

export async function getAdminDashboardMetrics(range?: DashboardRange) {
  try {
    await checkAdminAccess();
    const r = parseRange(range);
    const metrics = await adminDashboardService.getDashboardMetrics(r);

    return successResponse("Admin dashboard metrics fetched successfully.", {
      metrics,
    });
  } catch (error) {
    logger.error({ error, range }, "Failed to fetch admin dashboard metrics");
    return {
      success: false,
      message:
        error instanceof Error
          ? error.message
          : "Unable to fetch admin dashboard metrics.",
    };
  }
}

export async function getTopSavedMarketplaceProjects() {
  try {
    await checkAdminAccess();
    const projects =
      await adminDashboardService.getTopSavedMarketplaceProjects();

    return successResponse(
      "Top saved marketplace projects fetched successfully.",
      {
        projects,
      },
    );
  } catch (error) {
    logger.error({ error }, "Failed to fetch top saved marketplace projects");
    return {
      success: false,
      message:
        error instanceof Error
          ? error.message
          : "Unable to fetch top saved marketplace projects.",
    };
  }
}

export async function getRevenueTrends(interval: "monthly" | "quarterly" | "yearly") {
  try {
    await checkAdminAccess();
    const trends = await adminDashboardService.getRevenueTrends(interval);
    return successResponse("Revenue trends fetched successfully.", { trends });
  } catch (error) {
    logger.error({ error, interval }, "Failed to fetch revenue trends");
    return {
      success: false,
      message: error instanceof Error ? error.message : "Unable to fetch revenue trends.",
    };
  }
}

export async function exportRevenueCsv(interval: "monthly" | "quarterly" | "yearly") {
  try {
    await checkAdminAccess();
    const csv = await adminDashboardService.exportRevenueCsv(interval);
    return successResponse("Revenue CSV exported successfully.", { csv });
  } catch (error) {
    logger.error({ error, interval }, "Failed to export revenue CSV");
    return {
      success: false,
      message: error instanceof Error ? error.message : "Unable to export revenue CSV.",
    };
  }
}

export async function getUserGrowthAndAssessments() {
  try {
    await checkAdminAccess();
    const data = await adminDashboardService.getUserGrowthAndAssessments();
    return successResponse("User growth and assessments fetched successfully.", { data });
  } catch (error) {
    logger.error({ error }, "Failed to fetch user growth and assessments");
    return {
      success: false,
      message: error instanceof Error ? error.message : "Unable to fetch user growth and assessments.",
    };
  }
}

export async function getMarketplaceEngagement() {
  try {
    await checkAdminAccess();
    const data = await adminDashboardService.getMarketplaceEngagement();
    return successResponse("Marketplace engagement fetched successfully.", { data });
  } catch (error) {
    logger.error({ error }, "Failed to fetch marketplace engagement");
    return {
      success: false,
      message: error instanceof Error ? error.message : "Unable to fetch marketplace engagement.",
    };
  }
}

export async function getSubscriptionTiers() {
  try {
    await checkAdminAccess();
    const data = await adminDashboardService.getSubscriptionTiers();
    return successResponse("Subscription tiers fetched successfully.", { data });
  } catch (error) {
    logger.error({ error }, "Failed to fetch subscription tiers");
    return {
      success: false,
      message: error instanceof Error ? error.message : "Unable to fetch subscription tiers.",
    };
  }
}

