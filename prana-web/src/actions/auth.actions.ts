"use server";

import { headers } from "next/headers";
import { authService } from "@/modules/shared/auth/auth.service";
import { successResponse } from "@/core/responses/success-response";
import { ApiError, UnauthorizedError } from "@/core/errors/api-error";
import { logger } from "@/core/logger/pino";
import { z } from "zod";
import { getAccessToken } from "@/core/security/cookies";
import {
  VerifyEmailSchema,
  ResendVerificationSchema,
  UpdateProfileSchema,
} from "@/core/validation/auth.schemas";

import { cookies } from "next/headers";

export async function logoutAction() {
  try {
    // authService.logout() revokes the refresh token in DB
    // and clears BOTH cookies with the correct domain/path
    // (the previous version only deleted `access_token` without
    // domain/path, so the httpOnly cookie was never actually cleared).
    await authService.logout();
    return { success: true };
  } catch (error) {
    logger.error(
      {
        error:
          error instanceof Error
            ? { message: error.message, stack: error.stack }
            : error,
      },
      "Logout action failed",
    );
    // Even if backend revoke fails, still clear local cookies
    // so the user is not stuck logged-in on this device.
    try {
      const { clearAuthCookies } = await import("@/core/security/cookies");
      await clearAuthCookies();
    } catch {
      /* noop */
    }
    return { success: false, message: "Logout encountered an error." };
  }
}

// Standard error formatting helper for actions matching specification
function handleError(error: unknown, actionName: string) {
  if (error instanceof z.ZodError) {
    const formattedErrors = error.issues.map((e) => ({
      field: e.path.join("."),
      message: e.message,
    }));
    logger.warn(
      { actionName, errors: formattedErrors },
      "Validation failed in server action",
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
      "API Error in server action",
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
    "Unhandled error in server action",
  );
  return {
    success: false,
    message:
      error instanceof Error
        ? error.message
        : "An internal server error occurred",
  };
}

async function getClientInfo() {
  const headerList = await headers();
  const userAgent = headerList.get("user-agent") || undefined;
  const ipAddress =
    headerList.get("x-forwarded-for")?.split(",")[0].trim() ||
    headerList.get("x-real-ip") ||
    undefined;
  return { ipAddress, userAgent };
}

export async function register(input: unknown) {
  try {
    const user = await authService.register(input);
    return successResponse(
      "Registration successful. Please verify your email.",
      { user },
    );
  } catch (error) {
    return handleError(error, "register");
  }
}

export async function login(input: unknown) {
  try {
    const clientInfo = await getClientInfo();
    const result = await authService.login(input, clientInfo);
    return successResponse("Login successful.", result);
  } catch (error) {
    return handleError(error, "login");
  }
}

export async function loginWithGoogle(input: unknown) {
  try {
    const clientInfo = await getClientInfo();
    const result = await authService.loginWithGoogle(input, clientInfo);
    return successResponse("Google login successful.", result);
  } catch (error) {
    return handleError(error, "loginWithGoogle");
  }
}

export async function refreshSession() {
  try {
    const clientInfo = await getClientInfo();
    await authService.refreshSession(clientInfo);
    return successResponse("Session refreshed successfully.");
  } catch (error) {
    return handleError(error, "refreshSession");
  }
}

export async function logout() {
  try {
    await authService.logout();
    return successResponse("Logged out successfully.");
  } catch (error) {
    return handleError(error, "logout");
  }
}

export async function forgotPassword(input: unknown) {
  try {
    await authService.forgotPassword(input);
    return successResponse(
      "If the email exists, a password reset link has been sent.",
    );
  } catch (error) {
    return handleError(error, "forgotPassword");
  }
}

export async function resetPassword(input: unknown) {
  try {
    await authService.resetPassword(input);
    return successResponse("Password has been reset successfully.");
  } catch (error) {
    return handleError(error, "resetPassword");
  }
}

export async function verifyEmail(input: unknown) {
  try {
    const validated = VerifyEmailSchema.parse(input);
    await authService.verifyEmail(validated.token);
    return successResponse("Email verified successfully.");
  } catch (error) {
    return handleError(error, "verifyEmail");
  }
}

export async function resendVerification(input: unknown) {
  try {
    const validated = ResendVerificationSchema.parse(input);
    await authService.resendVerificationEmail(validated.email);
    return successResponse(
      "If the email exists and is unverified, a verification link has been sent.",
    );
  } catch (error) {
    return handleError(error, "resendVerification");
  }
}

export async function getCurrentUser() {
  try {
    const accessToken = await getAccessToken();
    const user = await authService.getCurrentUser(accessToken);
    return successResponse("Current user retrieved successfully.", { user });
  } catch (error) {
    return handleError(error, "getCurrentUser");
  }
}

export async function updateProfile(
  userIdOrInput: string | unknown,
  input?: unknown,
) {
  try {
    let targetUserId: string;
    let payload: unknown;

    if (typeof userIdOrInput === "string" && input !== undefined) {
      targetUserId = userIdOrInput;
      payload = input;
    } else {
      const accessToken = await getAccessToken();
      if (!accessToken) {
        throw new UnauthorizedError("Not authenticated");
      }

      const currentUser = await authService.getCurrentUser(accessToken);
      targetUserId = currentUser.id;
      payload = userIdOrInput;
    }

    const validatedPayload = UpdateProfileSchema.parse(payload);
    const user = await authService.updateProfile(
      targetUserId,
      validatedPayload,
    );
    return successResponse("Profile updated successfully.", { user });
  } catch (error) {
    return handleError(error, "updateProfile");
  }
}

export async function changePassword(userId: string, input: unknown) {
  try {
    await authService.changePassword(userId, input);
    return successResponse("Password changed successfully.");
  } catch (error) {
    return handleError(error, "changePassword");
  }
}

export async function deleteSession() {
  try {
    // Delete current session logs out the active session device
    await authService.logout();
    return successResponse("Current session deleted successfully.");
  } catch (error) {
    return handleError(error, "deleteSession");
  }
}

export async function deleteAllSessions(userId: string) {
  try {
    await authService.deleteAllSessions(userId);
    return successResponse("All active sessions revoked successfully.");
  } catch (error) {
    return handleError(error, "deleteAllSessions");
  }
}
