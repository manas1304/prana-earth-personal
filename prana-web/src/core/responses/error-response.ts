import { ApiResponse } from "./api-response";

export function errorResponse(message: string): ApiResponse {
  return {
    success: false,
    message,
  };
}
