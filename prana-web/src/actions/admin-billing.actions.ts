"use server";

import { getCurrentUser } from "@/core/auth/session";
import { UnauthorizedError } from "@/core/errors/api-error";
import { logger } from "@/core/logger/pino";
import { successResponse } from "@/core/responses/success-response";
import { adminBillingService, GetTransactionsFilters } from "@/modules/admin/billing/billing.service";

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
  logger.error({ error, actionName }, `Admin billing action ${actionName} failed`);
  return {
    success: false,
    message:
      error instanceof Error ? error.message : "An internal error occurred",
  };
}

/**
 * Fetches transaction history for the admin panel.
 *
 * @param filters.search    - Search by transaction ID, customer name, email, or plan name
 * @param filters.category  - "MARKETPLACE" | "PREDICT" | "BUNDLE" | "FREE" | null
 * @param filters.status    - e.g. "SUCCESS", "FAILED", "PENDING"
 * @param filters.dateRange - "7days" | "30days" | "3months" | "12months" | "all"
 * @param filters.page      - Page number (default: 1)
 * @param filters.limit     - Items per page (default: 10, max: 100)
 */
export async function getAdminTransactions(filters: GetTransactionsFilters = {}) {
  try {
    await checkAdminAccess();

    // Clamp limit to prevent abuse
    const safeLimit = Math.min(filters.limit ?? 10, 100);

    const result = await adminBillingService.getTransactions({
      ...filters,
      limit: safeLimit,
    });

    return successResponse("Transactions fetched successfully.", result);
  } catch (error) {
    return handleError(error, "getAdminTransactions");
  }
}

/**
 * Exports matched transaction records as a CSV string.
 *
 * @param filters.search    - Search query
 * @param filters.category  - Plan category
 * @param filters.status    - Payment status
 * @param filters.dateRange - Date range filter
 */
export async function exportAdminTransactionsCSV(filters: Omit<GetTransactionsFilters, "page" | "limit"> = {}) {
  try {
    await checkAdminAccess();

    const csvContent = await adminBillingService.exportTransactionsCSV(filters);

    return successResponse("CSV transaction report generated successfully.", {
      csv: csvContent,
    });
  } catch (error) {
    return handleError(error, "exportAdminTransactionsCSV");
  }
}
