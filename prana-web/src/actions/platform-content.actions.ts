"use server";

import { getCurrentUser } from "@/core/auth/session";
import { UnauthorizedError } from "@/core/errors/api-error";
import { logger } from "@/core/logger/pino";
import { successResponse } from "@/core/responses/success-response";
import { platformContentService } from "@/modules/admin/platform-content/platform-content.service";
import { PlatformSettings } from "@/core/database/settings-store";

// ─── Auth Guard ───────────────────────────────────────────────────────────────

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

// ─── Actions ──────────────────────────────────────────────────────────────────

/**
 * Fetches the current Platform Content Management settings for BOTH
 * Marketplace and Predict platforms.
 *
 * Sections returned:
 *  - Global Impact Totals  (totalCarbonSaved, ethicalProductsVerified, totalVerifiedProjects)
 *  - Regional Coverage     (statesMonitored, utsCovered, activeMonitoringNodes)
 *  - Ecosystem Data        (rainforests, wetlands, islands, biodiversityIndex)
 *  - Marketplace Stats     (totalActiveListings, totalSavesGlobal, dprInquiriesMonth)
 *
 * Import path:
 *   import { getPlatformContent } from "@/actions/platform-content.actions";
 *
 * @example
 *   const result = await getPlatformContent();
 *   // result.data.totalCarbonSaved   => "124580"
 *   // result.data.biodiversityIndex  => 8.4
 */
export async function getPlatformContent() {
  try {
    const metrics = await platformContentService.getMetrics();
    return successResponse("Platform content metrics fetched successfully.", metrics);
  } catch (error) {
    logger.error({ error }, "Failed to fetch platform content metrics");
    return {
      success: false,
      message: error instanceof Error ? error.message : "Unable to fetch platform metrics.",
    };
  }
}

/**
 * Saves Platform Content Management settings. Admin access required.
 * Accepts a partial payload — only the provided fields will be updated.
 *
 * Import path:
 *   import { updatePlatformContent } from "@/actions/platform-content.actions";
 *
 * Accepted fields:
 *  ┌──────────────────────────────┬──────────┬────────────────────────────────────────┐
 *  │ Field                        │ Type     │ Description                            │
 *  ├──────────────────────────────┼──────────┼────────────────────────────────────────┤
 *  │ totalCarbonSaved             │ string   │ MT CO2e value shown on platform        │
 *  │ ethicalProductsVerified      │ string   │ % value (e.g. "88.4")                  │
 *  │ totalVerifiedProjects        │ string   │ Number of verified projects             │
 *  │ statesMonitored              │ string   │ Pan-India regional coverage — states   │
 *  │ utsCovered                   │ string   │ Pan-India regional coverage — UTs      │
 *  │ activeMonitoringNodes        │ string   │ Active remote monitoring stations      │
 *  │ rainforests                  │ string   │ Ecosystem count (rainforests)          │
 *  │ wetlands                     │ string   │ Ecosystem count (wetlands)             │
 *  │ islands                      │ string   │ Ecosystem count (islands)              │
 *  │ biodiversityIndex            │ number   │ 0–10 decimal slider value              │
 *  │ totalActiveListings          │ string   │ Marketplace active project listings    │
 *  │ totalSavesGlobal             │ string   │ Marketplace total saves (global)       │
 *  │ dprInquiriesMonth            │ string   │ Marketplace DPR inquiries this month   │
 *  └──────────────────────────────┴──────────┴────────────────────────────────────────┘
 *
 * @example
 *   const result = await updatePlatformContent({
 *     totalCarbonSaved: "135000",
 *     biodiversityIndex: 8.9,
 *     totalActiveListings: "2000",
 *   });
 */
export async function updatePlatformContent(data: Partial<PlatformSettings>) {
  try {
    await checkAdminAccess();
    const updated = await platformContentService.updateMetrics(data);
    logger.info({ data }, "Platform content metrics updated by admin");
    return successResponse("Platform content metrics updated successfully.", updated);
  } catch (error) {
    logger.error({ error }, "Failed to update platform content metrics");
    return {
      success: false,
      message: error instanceof Error ? error.message : "Unable to update platform metrics.",
    };
  }
}
