import { NextResponse, type NextRequest } from "next/server";

// Lightweight proxy:
//  - On default hostname (localhost / 127.0.0.1 / 192.168.x / vercel preview):
//      rewrite top-level paths to /sites/predict/... (the only mounted section
//      in this single-port dev/prod server).
//  - On marketplace.* / admin.* hostnames:
//      rewrite to /sites/marketplace or /sites/admin respectively, with auth
//      gating for /admin.
//  - If the path already starts with /sites/, do nothing (avoids re-rewriting
//    on each request → infinite 431 loop bug).
export default function middleware(req: NextRequest) {
  const url = req.nextUrl.clone();
  const hostname = req.headers.get("host") || "";
  const pathname = url.pathname;

  // Guard: never touch API routes, static files, or Next internals
  if (
    pathname.startsWith("/api/") ||
    pathname.startsWith("/_next/") ||
    pathname.startsWith("/favicon") ||
    /\.[a-z0-9]{2,5}$/i.test(pathname)
  ) {
    return NextResponse.next();
  }

  // Already rewritten (e.g. second hit after first rewrite)
  if (pathname.startsWith("/sites/")) {
    return NextResponse.next();
  }

  const isLocalhost =
    hostname.includes("localhost") ||
    hostname.includes("127.0.0.1") ||
    hostname.startsWith("192.168.");
  const isVercelPreview = hostname.includes(".vercel.app");
  const isMarketplaceHost =
    hostname === "https://prana-earth-personal-gamma.vercel.app/" ||
    hostname === "https://prana-earth-personal-gamma.vercel.app/" ||
    hostname.startsWith("marketplace.");
  const isAdminHost =
    hostname === "admin.localhost:3000" || hostname.startsWith("admin.");

  if (isMarketplaceHost) {
    url.pathname = `/sites/marketplace${pathname === "/" ? "" : pathname}`;
    return NextResponse.rewrite(url);
  }

  if (isAdminHost) {
    const adminToken = req.cookies.get("access_token")?.value;
    if (pathname === "/login" && adminToken) {
      return NextResponse.redirect(new URL("/dashboard", req.url));
    }
    if (pathname !== "/login" && !adminToken) {
      return NextResponse.redirect(new URL("/login", req.url));
    }
    url.pathname = `/sites/admin${pathname === "/" ? "" : pathname}`;
    return NextResponse.rewrite(url);
  }

  if (isVercelPreview || isLocalhost) {

    if (pathname === "/marketplace" || pathname.startsWith("/marketplace/")) {
  const subPath = pathname.replace(/^\/marketplace/, "");
  url.pathname = `/sites/marketplace${subPath}`;
  return NextResponse.rewrite(url);
}

if (pathname === "/admin" || pathname.startsWith("/admin/")) {
  const subPath = pathname.replace(/^\/admin/, "") || "/";
  const adminToken = req.cookies.get("access_token")?.value;
  if (subPath === "/login" && adminToken) {
    return NextResponse.redirect(new URL("/admin/dashboard", req.url));
  }
  if (subPath !== "/login" && !adminToken) {
    return NextResponse.redirect(new URL("/admin/login", req.url));
  }
  url.pathname = `/sites/admin${subPath === "/" ? "" : subPath}`;
  return NextResponse.rewrite(url);
}

    
    // Default: serve the predict app at the root
    if (pathname === "/") {
      url.pathname = "/sites/predict";
      return NextResponse.rewrite(url);
    }
    // Some top-level paths need to map to deeper subroutes
    // (auth) is a Next.js route group - invisible in URLs
    const aliasMap: Record<string, string> = {
      "/get-started": "",
      "/reports": "/organization-profile/reports",
      "/settings": "/settings",
      "/profile": "/profile",
      "/pricing": "/pricing",
      "/contact": "/contact",
      "/dashboard": "/organization-profile/dashboard",
      "/help-support": "/organization-profile/help-support",
      "/reassessment": "/organization-profile/reassessment",
      "/risk-assessment": "/organization-profile/risk-assessment",
      "/login": "/login",
      "/forgot-password": "/forgot-password",
      "/reset-password": "/reset-password",
    };
    if (pathname in aliasMap) {
      url.pathname = `/sites/predict${aliasMap[pathname]}`;
      return NextResponse.rewrite(url);
    }
    url.pathname = `/sites/predict${pathname}`;
    return NextResponse.rewrite(url);
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    "/((?!api|_next|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
