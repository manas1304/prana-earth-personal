"use server";

import { safeAction } from "@/core/actions/safe-action";
import { authService } from "@/modules/shared/auth/auth.service";

export async function signInAction(email: string, password: string) {
  return safeAction(async () => {
    const user = await authService.signIn(email, password);

    return {
      success: true,
      data: user,
    };
  });
}
