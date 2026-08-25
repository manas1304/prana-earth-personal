"use server";

import { getCurrentUser } from "@/core/auth/session";
import { NotFoundError, UnauthorizedError } from "@/core/errors/api-error";
import { logger } from "@/core/logger/pino";
import { successResponse } from "@/core/responses/success-response";
import {
  implementationPartnersService,
  GetPartnersFilters,
  CreatePartnerData,
  UpdatePartnerData,
} from "@/modules/admin/implementation-partners/implementation-partners.service";

// ─── Auth Guard ───────────────────────────────────────────────────────────────

async function checkAdminAccess() {
  const currentUser = await getCurrentUser();
  if (!currentUser) throw new UnauthorizedError("Not authenticated");
  if (currentUser.role !== "ADMIN")
    throw new UnauthorizedError("Unauthorized: Admin access required");
  return currentUser;
}

function handleError(error: unknown, actionName: string) {
  logger.error({ error, actionName }, "Implementation partners action failed");
  return {
    success: false,
    message: error instanceof Error ? error.message : "An internal error occurred",
  };
}

// ─── Actions ──────────────────────────────────────────────────────────────────

/**
 * 1. getImplementationPartners()
 *
 * Returns a paginated, filtered list of implementation partners.
 *
 * @param filters.search   - Search by name, partner ID, or region
 * @param filters.status   - "ACTIVE" | "UNDER_REVIEW" | "INACTIVE" | null
 * @param filters.type     - "NGO" | "ENGINEERING_AGENCY" | "ENVIRONMENTAL_FIRM" | "CONSULTING_FIRM" | "GOVERNMENT_BODY" | "OTHER" | null
 * @param filters.region   - Filter by region string (partial match)
 * @param filters.page     - Page number (default: 1)
 * @param filters.limit    - Items per page (default: 10, max: 100)
 *
 * @example
 * import { getImplementationPartners } from "@/actions/implementation-partners.actions";
 *
 * const result = await getImplementationPartners({ status: "ACTIVE", page: 1, limit: 10 });
 * // result.data.partners    → PartnerListItem[]
 * // result.data.pagination  → { total, page, limit, totalPages }
 *
 * // Each partner item has:
 * // { id, partnerId, name, type, region, country, activeProjects, totalImpact, status, logoUrl, createdAt, createdBy }
 */
export async function getImplementationPartners(filters: GetPartnersFilters = {}) {
  try {
    await checkAdminAccess();
    const safeLimit = Math.min(filters.limit ?? 10, 100);
    const result = await implementationPartnersService.getPartners({ ...filters, limit: safeLimit });
    return successResponse("Implementation partners fetched successfully.", result);
  } catch (error) {
    return handleError(error, "getImplementationPartners");
  }
}

/**
 * 2. getImplementationPartner()
 *
 * Returns full details for a single partner.
 * Accepts either the UUID (`id`) or the readable partner ID (`PRT-YYYY-NNX`).
 *
 * @param id - UUID or readable partner ID (e.g. "PRT-2024-01A")
 *
 * @example
 * import { getImplementationPartner } from "@/actions/implementation-partners.actions";
 *
 * const result = await getImplementationPartner("PRT-2024-01A");
 * // result.data includes: capabilities[], websiteUrl, logoUrl, createdBy, etc.
 */
export async function getImplementationPartner(id: string) {
  try {
    await checkAdminAccess();
    const partner = await implementationPartnersService.getPartnerById(id);
    if (!partner) throw new NotFoundError("Implementation partner not found.");
    return successResponse("Implementation partner fetched successfully.", { partner });
  } catch (error) {
    return handleError(error, "getImplementationPartner");
  }
}

/**
 * 3. createImplementationPartner()
 *
 * Registers a new implementation partner. A unique readable partner ID
 * (e.g. PRT-2024-01A) is auto-generated.
 *
 * @param data.name           - Organization name (required)
 * @param data.type           - PartnerType enum (NGO | ENGINEERING_AGENCY | ENVIRONMENTAL_FIRM | CONSULTING_FIRM | GOVERNMENT_BODY | OTHER)
 * @param data.websiteUrl     - Website URL (optional)
 * @param data.logoUrl        - Logo image URL (optional)
 * @param data.region         - Region string e.g. "India - Maharashtra" (optional)
 * @param data.country        - Country (optional)
 * @param data.capabilities   - Array of tags, preset + custom (optional)
 * @param data.activeProjects - Number of active projects (default: 0)
 * @param data.totalImpact    - Display string e.g. "45,200 tCO2e" (optional)
 * @param data.status         - Initial status (default: UNDER_REVIEW)
 *
 * @example
 * import { createImplementationPartner } from "@/actions/implementation-partners.actions";
 *
 * const result = await createImplementationPartner({
 *   name: "Green Earth Initiative",
 *   type: "NGO",
 *   websiteUrl: "https://www.greenearth.org",
 *   region: "India - Maharashtra",
 *   capabilities: ["Reforestation", "Carbon Auditing", "My Custom Tag"],
 *   activeProjects: 5,
 * });
 * // result.data.partner.partnerId → "PRT-2024-01A"
 */
export async function createImplementationPartner(data: CreatePartnerData) {
  try {
    const admin = await checkAdminAccess();
    const partner = await implementationPartnersService.createPartner(data, admin.id);
    logger.info({ partnerId: partner.partnerId, createdBy: admin.id }, "New implementation partner registered");
    return successResponse("Implementation partner registered successfully.", { partner });
  } catch (error) {
    return handleError(error, "createImplementationPartner");
  }
}

/**
 * 4. updateImplementationPartner()
 *
 * Partially updates an implementation partner. Only provided fields are changed.
 * Pass the UUID of the partner.
 *
 * @param id   - UUID of the partner to update
 * @param data - Partial update payload (any fields from CreatePartnerData)
 *
 * @example
 * import { updateImplementationPartner } from "@/actions/implementation-partners.actions";
 *
 * const result = await updateImplementationPartner("partner-uuid", {
 *   activeProjects: 14,
 *   status: "ACTIVE",
 *   capabilities: ["Reforestation", "Water Conservation", "Solar Infrastructure"],
 * });
 */
export async function updateImplementationPartner(id: string, data: UpdatePartnerData) {
  try {
    await checkAdminAccess();
    const partner = await implementationPartnersService.updatePartner(id, data);
    logger.info({ id }, "Implementation partner updated");
    return successResponse("Implementation partner updated successfully.", { partner });
  } catch (error) {
    return handleError(error, "updateImplementationPartner");
  }
}

/**
 * 5. deleteImplementationPartner()
 *
 * Soft-deletes an implementation partner (sets deletedAt; data is preserved).
 * The partner will no longer appear in any list queries.
 *
 * ⚠️ This action is irreversible from the UI.
 *
 * @param id - UUID of the partner to delete
 *
 * @example
 * import { deleteImplementationPartner } from "@/actions/implementation-partners.actions";
 *
 * const result = await deleteImplementationPartner("partner-uuid");
 * // result.data.partner.deletedAt → ISO timestamp
 */
export async function deleteImplementationPartner(id: string) {
  try {
    await checkAdminAccess();
    const partner = await implementationPartnersService.deletePartner(id);
    logger.info({ id }, "Implementation partner soft-deleted");
    return successResponse("Implementation partner deleted successfully.", { partner });
  } catch (error) {
    return handleError(error, "deleteImplementationPartner");
  }
}

/**
 * 6. getPublicImplementationPartners()
 *
 * Public listing for the marketplace `ImplementationPartners` carousel.
 * No auth required. Only `ACTIVE` partners are returned.
 */
export async function getPublicImplementationPartners() {
  try {
    const partners = await implementationPartnersService.getPublicPartners();
    return successResponse("Active implementation partners fetched successfully.", {
      partners,
    });
  } catch (error) {
    return handleError(error, "getPublicImplementationPartners");
  }
}

/**
 * 7. exportImplementationPartnersCsv()
 *
 * Streams all partners matching the same filters as `getImplementationPartners`
 * as a CSV blob. Admin-only.
 */
export async function exportImplementationPartnersCsv(
  filters: GetPartnersFilters = {}
) {
  try {
    await checkAdminAccess();
    const csv = await implementationPartnersService.exportPartnersCsv(filters);
    return successResponse("Partners exported successfully.", { csv });
  } catch (error) {
    return handleError(error, "exportImplementationPartnersCsv");
  }
}
