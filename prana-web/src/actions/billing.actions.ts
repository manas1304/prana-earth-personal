"use server";

import { billingService } from "@/modules/shared/billing/billing.service";
import { successResponse } from "@/core/responses/success-response";
import {
  ApiError,
  UnauthorizedError,
  ForbiddenError,
} from "@/core/errors/api-error";
import { logger } from "@/core/logger/pino";
import { z } from "zod";
import { getAccessToken } from "@/core/security/cookies";
import { authService } from "@/modules/shared/auth/auth.service";
import {
  InitiatePaymentSchema,
  VerifyPaymentSchema,
} from "@/core/validation/billing.schemas";

async function getCurrentUser() {
  const accessToken = await getAccessToken();
  if (!accessToken) return null;
  try {
    return await authService.getCurrentUser(accessToken);
  } catch (error) {
    return null;
  }
}

async function assertAuthenticated() {
  const user = await getCurrentUser();
  if (!user) {
    throw new UnauthorizedError("Not authenticated");
  }
  return user;
}

async function assertAdmin() {
  const user = await assertAuthenticated();
  if (user.role !== "ADMIN") {
    throw new ForbiddenError("Only administrators can perform this action");
  }
  return user;
}

function handleError(error: unknown, actionName: string) {
  if (error instanceof z.ZodError) {
    const formattedErrors = error.issues.map((e) => ({
      field: e.path.join("."),
      message: e.message,
    }));
    logger.warn(
      { actionName, errors: formattedErrors },
      "Validation failed in billing server action",
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
      "API Error in billing server action",
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
    "Unhandled error in billing server action",
  );
  return {
    success: false,
    message:
      error instanceof Error
        ? error.message
        : "An internal server error occurred",
  };
}

export async function getSubscriptionPlans(adminOnly: boolean = false) {
  try {
    if (adminOnly) await assertAdmin();
    const plans = await billingService.getSubscriptionPlans(adminOnly);
    return successResponse("Subscription plans retrieved successfully.", {
      plans: JSON.parse(JSON.stringify(plans)),
    });
  } catch (error) {
    return handleError(error, "getSubscriptionPlans");
  }
}

export async function createSubscriptionPlan(input: unknown) {
  try {
    await assertAdmin();
    const plan = await billingService.createSubscriptionPlan(input);
    return successResponse("Subscription plan created successfully.", { 
      plan: JSON.parse(JSON.stringify(plan)) 
    });
  } catch (error) {
    return handleError(error, "createSubscriptionPlan");
  }
}

export async function updateSubscriptionPlan(id: string, input: unknown) {
  try {
    await assertAdmin();
    const plan = await billingService.updateSubscriptionPlan(id, input);
    return successResponse("Subscription plan updated successfully.", { 
      plan: JSON.parse(JSON.stringify(plan)) 
    });
  } catch (error) {
    return handleError(error, "updateSubscriptionPlan");
  }
}

export async function initiatePayment(input: unknown) {
  try {
    const user = await assertAuthenticated();
    const payload = Array.isArray(input) ? input[0] : input;
    const validated = InitiatePaymentSchema.parse(payload);
    const result = await billingService.initiatePayment(
      user.id,
      validated.planId,
      validated.billingCycle,
    );
    return successResponse("Payment order initiated successfully.", result);
  } catch (error) {
    return handleError(error, "initiatePayment");
  }
}

export async function verifyPayment(input: unknown) {
  try {
    const user = await assertAuthenticated();
    const payload = Array.isArray(input) ? input[0] : input;
    const validated = VerifyPaymentSchema.parse(payload);
    const result = await billingService.verifyPayment(
      user.id,
      validated.orderId,
      validated.paymentId,
      validated.signature,
    );
    return successResponse("Payment verified and subscription activated.", {
      subscription: result.subscription,
      payment: {
        ...result.payment,
        amount: Number(result.payment.amount), // Converted to plain JS number
      },
    });
  } catch (error) {
    return handleError(error, "verifyPayment");
  }
}

export async function getUserSubscription() {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return successResponse(
        "User not authenticated, returning free tier access.",
        {
          hasSubscription: false,
          planType: "FREE",
          billingCycle: null,
          expiresAt: null,
          isMarketplaceAccess: false,
          isPredictAccess: false,
        },
      );
    }

    const subscriptionInfo = await billingService.getUserSubscription(user.id);
    return successResponse(
      "User subscription retrieved successfully.",
      subscriptionInfo,
    );
  } catch (error) {
    return handleError(error, "getUserSubscription");
  }
}

export async function checkAssessmentLimits() {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return successResponse("Checked limits (guest)", {
        used: 0,
        limit: 0,
        isAuthenticated: false,
        isEligible: false,
        remaining: 0,
      });
    }

    const usage = await billingService.getMonthlyAssessmentUsage(user.id);
    const limit = usage.limit;
    const used = usage.used;
    const isEligible = limit === 0 ? true : used < limit;
    const remaining = limit === 0 ? Infinity : Math.max(0, limit - used);

    return successResponse("Assessment limits fetched", {
      used,
      limit,
      remaining,
      isEligible,
      isAuthenticated: true,
    });
  } catch (error) {
    return handleError(error, "checkAssessmentLimits");
  }
}
