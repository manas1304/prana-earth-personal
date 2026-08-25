import { ApiResponse } from "./api-response";

export function successResponse<T>(
  message: string,
  data?: T,
  meta?: Record<string, unknown>,
): ApiResponse<T> {
  return {
    success: true,
    message,
    data,
    meta,
  };
}
