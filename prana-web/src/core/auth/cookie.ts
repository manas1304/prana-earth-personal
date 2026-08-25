import { cookies } from "next/headers";
export async function setAuthCookie(name: string, value: string) {
  const cookieStore = await cookies();

  cookieStore.set(name, value);
}
