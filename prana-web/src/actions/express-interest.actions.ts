"use server";

import { revalidatePath } from "next/cache";
import { getCurrentUser } from "@/core/auth/session";
import { expressInterestService } from "@/modules/marketplace/express-interest/express-interest.service";
import { successResponse } from "@/core/responses/success-response";
import { UnauthorizedError } from "@/core/errors/api-error";
import { logger } from "@/core/logger/pino";

// Helper to ensure authenticated user is an Admin
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

export async function submitExpressInterest(input: unknown) {
  try {
    const currentUser = await getCurrentUser();
    if (!currentUser) {
      throw new UnauthorizedError("Not authenticated");
    }

    const interest = await expressInterestService.createInterest(
      input,
      currentUser.id,
    );
    revalidatePath("/sites/admin/leads");
    return successResponse("Express Interest submitted successfully.", {
      interest,
    });
  } catch (error) {
    logger.error({ error }, "Failed to submit express interest");
    return {
      success: false,
      message:
        error instanceof Error
          ? error.message
          : "Unable to submit express interest request.",
    };
  }
}

export async function getExpressInterests(page = 1, pageSize = 20) {
  try {
    await checkAdminAccess();
    const result = await expressInterestService.listInterests(page, pageSize);

    // Safely serialize Decimal objects to plain objects
    const serializedResult = JSON.parse(JSON.stringify(result));

    return successResponse(
      "Express Interest requests fetched successfully.",
      serializedResult,
    );
  } catch (error) {
    logger.error({ error }, "Failed to fetch express interest requests");
    return {
      success: false,
      message:
        error instanceof Error
          ? error.message
          : "Unable to fetch express interest requests.",
    };
  }
}

export async function resolveExpressInterest(interestId: string) {
  try {
    await checkAdminAccess();
    const interest = await expressInterestService.updateStatus(
      interestId,
      "RESOLVED",
    );
    revalidatePath("/sites/admin/leads");
    return successResponse("Lead marked as Resolved.", { interest });
  } catch (error) {
    logger.error({ error }, "Failed to resolve express interest lead");
    return {
      success: false,
      message:
        error instanceof Error
          ? error.message
          : "Unable to resolve express interest lead.",
    };
  }
}

export async function rejectExpressInterest(interestId: string) {
  try {
    await checkAdminAccess();
    const interest = await expressInterestService.updateStatus(
      interestId,
      "REJECTED",
    );
    revalidatePath("/sites/admin/leads");
    return successResponse("Lead marked as Rejected.", { interest });
  } catch (error) {
    logger.error({ error }, "Failed to reject express interest lead");
    return {
      success: false,
      message:
        error instanceof Error
          ? error.message
          : "Unable to reject express interest lead.",
    };
  }
}

export async function replyToExpressInterest(input: unknown) {
  try {
    await checkAdminAccess();
    const interest = await expressInterestService.replyToInterest(input);
    revalidatePath("/sites/admin/leads");
    return successResponse("Reply sent and lead status updated.", { interest });
  } catch (error) {
    logger.error({ error }, "Failed to reply to express interest lead");
    return {
      success: false,
      message: error instanceof Error ? error.message : "Unable to send reply.",
    };
  }
}

export async function exportExpressInterests() {
  try {
    await checkAdminAccess();
    const rows = await expressInterestService.exportInterests();

    const csv = [
      [
        "id",
        "fullName",
        "email",
        "phone",
        "company",
        "projectName",
        "message",
        "status",
        "createdAt",
        "resolvedAt",
      ].join(","),
      ...rows.map((row) => {
        const company =
          row.user.organizationMemberships?.[0]?.organization?.name ?? "";
        return [
          row.id,
          `"${String(row.user.fullName ?? "").replace(/"/g, '""')}"`,
          `"${String(row.user.email ?? "").replace(/"/g, '""')}"`,
          `"${String(row.user.phone ?? "").replace(/"/g, '""')}"`,
          `"${String(company).replace(/"/g, '""')}"`,
          `"${String(row.project.title ?? "").replace(/"/g, '""')}"`,
          `"${String(row.message ?? "").replace(/"/g, '""')}"`,
          `"${String(row.status ?? "").replace(/"/g, '""')}"`,
          `"${String(row.createdAt?.toISOString?.() ?? "").replace(/"/g, '""')}"`,
          `"${String(row.resolvedAt?.toISOString?.() ?? "").replace(/"/g, '""')}"`,
        ].join(",");
      }),
    ].join("\n");

    // Safely serialize rows to remove Decimal objects, or just return the CSV
    return successResponse("Export ready.", {
      rows: JSON.parse(JSON.stringify(rows)),
      csv,
    });
  } catch (error) {
    logger.error({ error }, "Failed to export express interest leads");
    return {
      success: false,
      message:
        error instanceof Error ? error.message : "Unable to export leads.",
    };
  }
}
