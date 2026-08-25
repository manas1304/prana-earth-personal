"use server";

import { projectService } from "@/modules/marketplace/project/project.service";
import { successResponse } from "@/core/responses/success-response";
import { ApiError, UnauthorizedError } from "@/core/errors/api-error";
import { logger } from "@/core/logger/pino";
import { z } from "zod";
import { getAccessToken } from "@/core/security/cookies";
import { authService } from "@/modules/shared/auth/auth.service";

async function getCurrentUserId() {
  const accessToken = await getAccessToken();
  if (!accessToken) {
    throw new UnauthorizedError("Not authenticated");
  }

  const currentUser = await authService.getCurrentUser(accessToken);
  return currentUser.id;
}

function handleError(error: unknown, actionName: string) {
  if (error instanceof z.ZodError) {
    const formattedErrors = error.issues.map((e) => ({
      field: e.path.join("."),
      message: e.message,
    }));
    logger.warn(
      { actionName, errors: formattedErrors },
      "Validation failed in project server action",
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
      "API Error in project server action",
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
    "Unhandled error in project server action",
  );
  return {
    success: false,
    message:
      error instanceof Error
        ? error.message
        : "An internal server error occurred",
  };
}

export async function getProjects(filters: any = {}) {
  try {
    const result = await projectService.getProjects(filters);
    return successResponse(
      "Projects retrieved successfully.",
      JSON.parse(JSON.stringify(result)),
    );
  } catch (error) {
    return handleError(error, "getProjects");
  }
}

export async function getProject(idOrSlug: string) {
  try {
    const project = await projectService.getProjectByIdOrSlug(idOrSlug);
    return successResponse(
      "Project retrieved successfully.",
      JSON.parse(JSON.stringify({ project })),
    );
  } catch (error) {
    return handleError(error, "getProject");
  }
}

export async function createProject(input: unknown) {
  try {
    const project = await projectService.createProject(input);
    return successResponse(
      "Project created successfully.",
      JSON.parse(JSON.stringify({ project })),
    );
  } catch (error) {
    return handleError(error, "createProject");
  }
}

export async function updateProject(id: string, input: unknown) {
  try {
    const project = await projectService.updateProject(id, input);
    return successResponse(
      "Project updated successfully.",
      JSON.parse(JSON.stringify({ project })),
    );
  } catch (error) {
    return handleError(error, "updateProject");
  }
}

export async function deleteProject(id: string) {
  try {
    await projectService.deleteProject(id);
    return successResponse("Project deleted successfully.");
  } catch (error) {
    return handleError(error, "deleteProject");
  }
}

export async function saveProject(projectId: string) {
  try {
    const userId = await getCurrentUserId();
    await projectService.saveProject(projectId, userId); 
    return successResponse("Project saved successfully."); 
  } catch (error) {
    return handleError(error, "saveProject");
  }
}

export async function unsaveProject(projectId: string) {
  try {
    const userId = await getCurrentUserId();
    await projectService.unsaveProject(projectId, userId);
    return successResponse("Project removed from saved list."); 
  } catch (error) {
    return handleError(error, "unsaveProject");
  }
}

export async function getSavedProjects() {
  try {
    const userId = await getCurrentUserId();
    const savedProjects = await projectService.getSavedProjects(userId);

    const formattedProjects = savedProjects.map((item: any) => {
      const p = item.project ? item.project : item;
      
      const formattedP = {
        ...p,
        fundingTarget: p.fundingTarget ? Number(p.fundingTarget) : null,
        returnRate: p.returnRate ? Number(p.returnRate) : null,
      };

      return item.project ? { ...item, project: formattedP } : formattedP;
    });

    return successResponse("Saved projects retrieved successfully.", {
      formattedProjects,
    });
  } catch (error) {
    return handleError(error, "getSavedProjects");
  }
}

export async function isProjectSaved(projectId: string) {
  try {
    const userId = await getCurrentUserId();
    const saved = await projectService.isProjectSaved(projectId, userId);
    return successResponse("Saved status retrieved successfully.", { saved });
  } catch (error) {
    return handleError(error, "isProjectSaved");
  }
}
