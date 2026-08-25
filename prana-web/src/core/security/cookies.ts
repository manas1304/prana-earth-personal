import { cookies, headers } from "next/headers";

const ACCESS_TOKEN_NAME = "access_token";
const REFRESH_TOKEN_NAME = "refresh_token";

const isProd = process.env.NODE_ENV === "production";

async function getCookieDomain(): Promise<string | undefined> {
  try {
    const headersList = await headers();
    const host = headersList.get("host");
    if (!host) return undefined;

    const hostname = host.split(":")[0];
    
    // Chromium/Chrome rejects cookies if the Domain attribute is explicitly set to 'localhost' or '.localhost'.
    // For raw localhost/127.0.0.1, we must return undefined to let it default to a host-only cookie.
    if (hostname === "localhost" || hostname === "127.0.0.1") {
      return undefined;
    }

    const parts = hostname.split(".");
    if (parts.length >= 2) {
      if (hostname.endsWith(".vercel.app") && parts.length > 2) {
        return `.${parts.slice(-3).join(".")}`;
      }
      return `.${parts.slice(-2).join(".")}`;
    }
    return `.${hostname}`;
  } catch (error) {
    return undefined;
  }
}

export async function setAuthCookies(
  accessToken: string,
  refreshToken: string,
) {
  const cookieStore = await cookies();
  const domain = await getCookieDomain();
  console.log(`[setAuthCookies] Setting cookies with domain: ${domain}`);

  // Set access token (expires in 15 minutes)
  cookieStore.set(ACCESS_TOKEN_NAME, accessToken, {
    httpOnly: true,
    secure: isProd,
    sameSite: "lax",
    path: "/",
    domain,
    maxAge: 24 * 60 * 60, // 1 day in seconds
  });

  // Set refresh token (expires in 30 days)
  cookieStore.set(REFRESH_TOKEN_NAME, refreshToken, {
    httpOnly: true,
    secure: isProd,
    sameSite: "lax",
    path: "/",
    domain,
    maxAge: 30 * 24 * 60 * 60, // 30 days in seconds
  });
}

export async function clearAuthCookies() {
  const cookieStore = await cookies();
  const domain = await getCookieDomain();
  console.log(`[clearAuthCookies] Clearing cookies with domain: ${domain}`);

  cookieStore.delete({
    name: ACCESS_TOKEN_NAME,
    path: "/",
    domain,
  });
  cookieStore.delete({
    name: REFRESH_TOKEN_NAME,
    path: "/",
    domain,
  });
}


export async function getAccessToken(): Promise<string | undefined> {
  const cookieStore = await cookies();
  return cookieStore.get(ACCESS_TOKEN_NAME)?.value;
}

export async function getRefreshToken(): Promise<string | undefined> {
  const cookieStore = await cookies();
  return cookieStore.get(REFRESH_TOKEN_NAME)?.value;
}

