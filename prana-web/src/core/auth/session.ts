import { cookies } from "next/headers";
import { authService } from "@/modules/shared/auth/auth.service";

export async function getCurrentUser() {
  try {
    const cookieStore = await cookies();
    const accessToken = cookieStore.get("access_token")?.value;
    if (!accessToken) return null;
    return await authService.getCurrentUser(accessToken);
  } catch (error) {
    return null;
  }
}
