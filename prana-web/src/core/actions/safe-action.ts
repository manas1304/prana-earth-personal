"use server";

import { ApiError } from "@/core/errors/api-error";
import { errorResponse } from "@/core/responses/error-response";
import { ActionResponse } from "./action-response";
export async function safeAction<T>(action: () => Promise<ActionResponse<T>>) {
  try {
    const data = await action();

    return {
      success: true,
      data,
    };
  } catch (error) {
    if (error instanceof ApiError) {
      return errorResponse(error.message);
    }

    console.error(error);

    return errorResponse("Something went wrong. Please try again.");
  }
}
