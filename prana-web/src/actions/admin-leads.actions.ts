"use server";

import { getCurrentUser } from "@/core/auth/session";
import { UnauthorizedError } from "@/core/errors/api-error";
import { logger } from "@/core/logger/pino";
import { successResponse } from "@/core/responses/success-response";
import { adminLeadsService, GetLeadsFilters } from "@/modules/admin/leads/leads.service";

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

function handleError(error: unknown, actionName: string) {
  logger.error({ error, actionName }, `Admin leads action ${actionName} failed`);
  return {
    success: false,
    message:
      error instanceof Error ? error.message : "An internal error occurred",
  };
}

/**
 * Fetches recent leads (Express Interests and DPR Requests) for the admin dashboard.
 *
 * @param filters.page      - Page number (default: 1)
 * @param filters.limit     - Items per page (default: 10, max: 100)
 */
export async function getAdminLeads(filters: GetLeadsFilters = {}) {
  try {
    await checkAdminAccess();

    // Clamp limit to prevent abuse
    const safeLimit = Math.min(filters.limit ?? 10, 100);

    const result = await adminLeadsService.getLeads({
      ...filters,
      limit: safeLimit,
    });

    return successResponse("Leads fetched successfully.", result);
  } catch (error) {
    return handleError(error, "getAdminLeads");
  }
}
