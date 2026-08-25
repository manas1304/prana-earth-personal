"use server";

import { revalidatePath } from "next/cache";
import { getCurrentUser } from "@/core/auth/session";
import { s3Service } from "@/modules/marketplace/project/s3.service";
import { bulkProjectService } from "@/modules/marketplace/project/bulk-project.service";
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
      "Validation failed in bulk project server action",
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
      "API Error in bulk project server action",
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
    "Unhandled error in bulk project server action",
  );
  return {
    success: false,
    message:
      error instanceof Error
        ? error.message
        : "An internal server error occurred",
  };
}

export async function getS3UploadUrlAction(fileName: string, contentType: string) {
  try {
    await checkAdminAccess();
    const result = await s3Service.getPresignedUploadUrl(fileName, contentType);
    return successResponse("Presigned upload URL generated successfully.", result);
  } catch (error) {
    return handleError(error, "getS3UploadUrlAction");
  }
}

export async function bulkUploadProjectsAction(projects: unknown, publish = false) {
  try {
    await checkAdminAccess();
    const result = await bulkProjectService.bulkUpload({ projects }, publish);
    revalidatePath("/projects");
    revalidatePath("/sites/marketplace/projects");
    return successResponse(
      `Successfully uploaded ${result.length} projects.`,
      JSON.parse(JSON.stringify(result)),
    );
  } catch (error) {
    return handleError(error, "bulkUploadProjectsAction");
  }
}

export async function deleteProjectWithMediaAction(projectId: string) {
  try {
    await checkAdminAccess();
    const result = await bulkProjectService.deleteProject(projectId);
    revalidatePath("/projects");
    revalidatePath("/sites/marketplace/projects");
    return successResponse("Project and its media deleted successfully.", result);
  } catch (error) {
    return handleError(error, "deleteProjectWithMediaAction");
  }
}

export async function getProjectAiContextAction(projectId: string) {
  try {
    const result = await bulkProjectService.getAiContext(projectId);
    return successResponse("Project context retrieved successfully.", result);
  } catch (error) {
    return handleError(error, "getProjectAiContextAction");
  }
}
