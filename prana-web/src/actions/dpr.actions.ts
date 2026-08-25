"use server";

import { revalidatePath } from "next/cache";
import { getCurrentUser } from "@/core/auth/session";
import { dprService } from "@/modules/marketplace/dpr/dpr.service";
import { successResponse } from "@/core/responses/success-response";
import { ApiError, UnauthorizedError } from "@/core/errors/api-error";
import { logger } from "@/core/logger/pino";
import { z } from "zod";

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

function handleError(error: unknown, actionName: string) {
  if (error instanceof z.ZodError) {
    const formattedErrors = error.issues.map((e) => ({
      field: e.path.join("."),
      message: e.message,
    }));
    logger.warn(
      { actionName, errors: formattedErrors },
      "Validation failed in DPR server action",
    );
    return {
      success: false,
      message: "Validation failed.",
      errors: formattedErrors,
    };
  }

  if (error instanceof ApiError) {
    logger.warn(
      { actionName, message: error.message, statusCode: error.statusCode },
      "API Error in DPR server action",
    );
    return {
      success: false,
      message: error.message,
    };
  }

  logger.error(
    {
      error:
        error instanceof Error
          ? { message: error.message, stack: error.stack }
          : error,
      actionName,
    },
    "Unhandled error in DPR server action",
  );
  return {
    success: false,
    message:
      error instanceof Error
        ? error.message
        : "An internal server error occurred",
  };
}

export async function checkDprEligibility() {
  try {
    const currentUser = await getCurrentUser();
    if (!currentUser) {
      return successResponse("Checked eligibility", { isEligible: false, planType: "FREE" });
    }
    const eligibility = await dprService.checkEligibility(currentUser.id);
    return successResponse("Checked eligibility", eligibility);
  } catch (error) {
    return handleError(error, "checkDprEligibility");
  }
}

export async function submitDprInquiry(input: unknown) {
  try {
    const currentUser = await getCurrentUser();
    if (!currentUser) {
      throw new UnauthorizedError("Not authenticated");
    }

    const request = await dprService.createDprRequest(input, currentUser.id);
    revalidatePath("/sites/admin/dpr");
    return successResponse("DPR Request submitted successfully.", {
      request,
    });
  } catch (error) {
    return handleError(error, "submitDprInquiry");
  }
}

export async function getDprRequests(page = 1, pageSize = 20) {
  try {
    await checkAdminAccess();
    const result = await dprService.listDprRequests(page, pageSize);
    
    // Sanitize Decimal objects from the nested project relation to prevent Client Component crashes
    const sanitizedItems = (result?.items || []).map((item: any) => ({
      ...item,
      project: item.project ? {
        ...item.project,
        fundingTarget: item.project.fundingTarget ? Number(item.project.fundingTarget) : 0,
        returnRate: item.project.returnRate ? Number(item.project.returnRate) : 0,
      } : null
    }));

    return successResponse("DPR requests fetched successfully.", {
      ...result,
      items: sanitizedItems
    });
  } catch (error) {
    return handleError(error, "getDprRequests");
  }
}

export async function getDprRequestDetails(requestId: string) {
  try {
    await checkAdminAccess();
    const request = await dprService.getDprRequest(requestId);
    return successResponse("DPR request details fetched successfully.", {
      request: JSON.parse(JSON.stringify(request)),
    });
  } catch (error) {
    return handleError(error, "getDprRequestDetails");
  }
}

export async function updateDprRequestStatus(requestId: string, status: string) {
  try {
    await checkAdminAccess();
    const request = await dprService.updateStatus(requestId, status);
    revalidatePath("/sites/admin/dpr");
    return successResponse("DPR request status updated successfully.", {
      request,
    });
  } catch (error) {
    return handleError(error, "updateDprRequestStatus");
  }
}

export async function replyToDprRequest(input: unknown) {
  try {
    await checkAdminAccess();
    const request = await dprService.replyToDprRequest(input);
    revalidatePath("/sites/admin/dpr");
    return successResponse("Reply sent and DPR request status updated.", {
      request,
    });
  } catch (error) {
    return handleError(error, "replyToDprRequest");
  }
}

export async function getDprCount() {
  try {
    await checkAdminAccess();
    const count = await dprService.getCount();
    return successResponse("DPR request count fetched successfully.", {
      count,
    });
  } catch (error) {
    return handleError(error, "getDprCount");
  }
}

export async function exportDprRequests() {
  try {
    await checkAdminAccess();
    const rows = await dprService.exportDprRequests();

    const csv = [
      [
        "inqueryId",
        "Organization",
        "Complexity",
        "Status",
        "Date",
      ].join(","),
      ...rows.map((row) => {
        const metadata = (row.metadata as any) || {};
        const organizationName =
          metadata.companyName ||
          row.user.organizationMemberships?.[0]?.organization?.name ||
          "";
        const complexity = metadata.complexity || "Low";
        const status = row.status || "PENDING";
        const date = row.createdAt?.toISOString() || "";

        return [
          row.id,
          `"${String(organizationName).replace(/"/g, '""')}"`,
          `"${String(complexity).replace(/"/g, '""')}"`,
          `"${String(status).replace(/"/g, '""')}"`,
          `"${String(date).replace(/"/g, '""')}"`,
        ].join(",");
      }),
    ].join("\n");

    return successResponse("Export ready.", { rows: JSON.parse(JSON.stringify(rows)), csv });
  } catch (error) {
    return handleError(error, "exportDprRequests");
  }
}
