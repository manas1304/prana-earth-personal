"use server";

import { getCurrentUser } from "@/core/auth/session";
import { NotFoundError, UnauthorizedError } from "@/core/errors/api-error";
import { logger } from "@/core/logger/pino";
import { successResponse } from "@/core/responses/success-response";
import {
  userManagementService,
  GetUsersFilters,
  PlanFilter,
  StatusFilter,
  UserTab,
} from "@/modules/admin/user-management/user-management.service";

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

// ─── Error handler ────────────────────────────────────────────────────────────

function handleError(error: unknown, actionName: string) {
  logger.error({ error, actionName }, "Admin user management action failed");
  return {
    success: false,
    message:
      error instanceof Error ? error.message : "An internal error occurred",
  };
}

// ─── Actions ──────────────────────────────────────────────────────────────────

/**
 * 1. getAdminUsers()
 *
 * Returns paginated list of users with their organization and active plan.
 *
 * @param filters.tab       - "all" | "predict" | "marketplace" | "paid"
 * @param filters.search    - Search by name, email, or organization name
 * @param filters.plan      - "FREE" | "PREDICT" | "MARKETPLACE" | "BUNDLE" | null
 * @param filters.status    - "active" | "deactivated" | null
 * @param filters.page      - Page number (default: 1)
 * @param filters.limit     - Items per page (default: 10, max: 100)
 *
 * @example
 * import { getAdminUsers } from "@/actions/admin-user-management.actions";
 *
 * const result = await getAdminUsers({
 *   tab: "marketplace",
 *   search: "john",
 *   plan: "MARKETPLACE",
 *   status: "active",
 *   page: 1,
 *   limit: 10,
 * });
 *
 * // result.data.users        → User[]
 * // result.data.pagination   → { total, page, limit, totalPages }
 */
export async function getAdminUsers(filters: GetUsersFilters = {}) {
  try {
    await checkAdminAccess();

    // Clamp limit to prevent abuse
    const safeLimit = Math.min(filters.limit ?? 10, 100);

    const result = await userManagementService.getUsers({
      ...filters,
      limit: safeLimit,
    });

    return successResponse("Users fetched successfully.", result);
  } catch (error) {
    return handleError(error, "getAdminUsers");
  }
}

/**
 * 2. getAdminUserDetails()
 *
 * Returns the full profile for a single user:
 * - Basic info (name, email, phone, avatar, job title, country)
 * - Organization membership
 * - Active subscription (plan name, type, billing cycle, expiry)
 * - Full payment / transaction history (up to 50 most recent)
 *
 * @param userId - UUID of the user
 *
 * @example
 * import { getAdminUserDetails } from "@/actions/admin-user-management.actions";
 *
 * const result = await getAdminUserDetails("user-uuid-here");
 * // result.data.user.subscription  → active plan or null (free tier)
 * // result.data.user.payments      → transaction history array
 */
export async function getAdminUserDetails(userId: string) {
  try {
    await checkAdminAccess();

    const user = await userManagementService.getUserDetails(userId);
    if (!user) {
      throw new NotFoundError("User not found");
    }

    return successResponse("User details fetched successfully.", { user });
  } catch (error) {
    return handleError(error, "getAdminUserDetails");
  }
}

/**
 * 3. deactivateAdminUser()
 *
 * Sets isActive = false. User can no longer log in but data is preserved.
 * Can be re-activated with activateAdminUser().
 *
 * @param userId - UUID of the user to deactivate
 *
 * @example
 * import { deactivateAdminUser } from "@/actions/admin-user-management.actions";
 *
 * const result = await deactivateAdminUser("user-uuid-here");
 * // result.data.user.isActive → false
 */
export async function deactivateAdminUser(userId: string) {
  try {
    await checkAdminAccess();

    const user = await userManagementService.deactivateUser(userId);

    logger.info({ userId }, "Admin deactivated user account");
    return successResponse("User account deactivated successfully.", { user });
  } catch (error) {
    return handleError(error, "deactivateAdminUser");
  }
}

/**
 * 4. activateAdminUser()
 *
 * Sets isActive = true. Restores access for a previously deactivated user.
 *
 * @param userId - UUID of the user to activate
 *
 * @example
 * import { activateAdminUser } from "@/actions/admin-user-management.actions";
 *
 * const result = await activateAdminUser("user-uuid-here");
 * // result.data.user.isActive → true
 */
export async function activateAdminUser(userId: string) {
  try {
    await checkAdminAccess();

    const user = await userManagementService.activateUser(userId);

    logger.info({ userId }, "Admin activated user account");
    return successResponse("User account activated successfully.", { user });
  } catch (error) {
    return handleError(error, "activateAdminUser");
  }
}

/**
 * 5. deleteAdminUser()
 *
 * Soft-deletes a user (sets deletedAt timestamp, isActive = false).
 * The user will no longer appear in any list queries.
 * All historical data (subscriptions, payments, assessments) is preserved.
 *
 * ⚠️ This action is irreversible from the UI — only a DB admin can restore.
 *
 * @param userId - UUID of the user to delete
 *
 * @example
 * import { deleteAdminUser } from "@/actions/admin-user-management.actions";
 *
 * const result = await deleteAdminUser("user-uuid-here");
 * // result.data.user.deletedAt → ISO timestamp
 */
export async function deleteAdminUser(userId: string) {
  try {
    await checkAdminAccess();

    const user = await userManagementService.deleteUser(userId);

    logger.info({ userId }, "Admin soft-deleted user account");
    return successResponse("User account deleted successfully.", { user });
  } catch (error) {
    return handleError(error, "deleteAdminUser");
  }
}
