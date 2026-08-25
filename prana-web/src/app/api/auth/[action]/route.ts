import { NextRequest, NextResponse } from "next/server";
import {
  register,
  login,
  loginWithGoogle,
  refreshSession,
  logout,
  forgotPassword,
  resetPassword,
  verifyEmail,
  resendVerification,
} from "@/actions/auth.actions";
import crypto from "crypto";
import { prisma } from "@/core/database/prisma";

/**
 * GET /api/auth/[action]
 *
 * Existing: set-tokens, clear-tokens (cookie syncing across origins).
 *
 * New: verify-email and resend-verification can be invoked from
 * email links (`GET` clicks) by reading the token from the query
 * string. After verification, the user is redirected to a friendly
 * confirmation page.
 */
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<any> }
) {
  const { action } = await params;
  const url = new URL(req.url);

  if (action === "set-tokens") {
    const accessToken = url.searchParams.get("accessToken");
    const refreshToken = url.searchParams.get("refreshToken");
    const redirectTo = url.searchParams.get("redirectTo") || "/";

    if (accessToken && refreshToken) {
      const { setAuthCookies } = await import("@/core/security/cookies");
      await setAuthCookies(accessToken, refreshToken);
    }

    return NextResponse.redirect(new URL(redirectTo, req.url));
  }

  if (action === "clear-tokens") {
    const redirectTo = url.searchParams.get("redirectTo") || "/";
    const { clearAuthCookies } = await import("@/core/security/cookies");
    await clearAuthCookies();
    return NextResponse.redirect(new URL(redirectTo, req.url));
  }

  if (action === "verify-email") {
    const token = url.searchParams.get("token");
    const newEmail = url.searchParams.get("newEmail");
    if (!token) {
      return NextResponse.json(
        { success: false, message: "Missing token" },
        { status: 400 }
      );
    }
    const tokenHash = crypto.createHash("sha256").update(token).digest("hex");
    const record = await prisma.emailVerificationToken.findFirst({
      where: { tokenHash, expiresAt: { gt: new Date() } },
    });
    if (!record) {
      return NextResponse.json(
        { success: false, message: "Invalid or expired token" },
        { status: 400 }
      );
    }
    // If newEmail is set, this is an email-change flow: find the
    // most recent user with the old email. For now, verify by
    // marking the token used and let the next login handle the swap.
    await prisma.emailVerificationToken.delete({ where: { id: record.id } });
    if (newEmail) {
      // Find the user with the matching (old) email and update.
      const oldUser = await prisma.user.findFirst({
        where: { email: record.email },
      });
      if (oldUser) {
        await prisma.user.update({
          where: { id: oldUser.id },
          data: { email: newEmail, isEmailVerified: true },
        });
      }
    } else {
      // First-time email verification
      const user = await prisma.user.findFirst({
        where: { email: record.email },
      });
      if (user) {
        await prisma.user.update({
          where: { id: user.id },
          data: { isEmailVerified: true },
        });
      }
    }
    const confirmUrl = url.searchParams.get("redirectTo") || "/verified";
    return NextResponse.redirect(new URL(confirmUrl, req.url));
  }

  if (action === "resend-verification") {
    const email = url.searchParams.get("email");
    if (!email) {
      return NextResponse.json(
        { success: false, message: "email query parameter is required" },
        { status: 400 }
      );
    }
    const response = await resendVerification({ email });
    return NextResponse.json(response, {
      status: response.success ? 200 : 400,
    });
  }

  return NextResponse.json(
    { success: false, message: `Route GET /api/auth/${action} not found` },
    { status: 404 }
  );
}


export async function POST(
  req: NextRequest,
  { params }: { params: Promise<any> }
) {
  const { action } = await params;

  try {
    let body = {};

    // Check if the request has content-type json
    const contentType = req.headers.get("content-type");
    if (contentType && contentType.includes("application/json")) {
      try {
        body = await req.json();
      } catch (e) {
        // Handle json parse error or empty body
      }
    }

    let response: any;

    switch (action) {
      case "register":
        response = await register(body);
        break;
      case "login":
        response = await login(body);
        break;
      case "google":
        response = await loginWithGoogle(body);
        break;
      case "refresh":
        response = await refreshSession();
        break;
      case "logout":
        response = await logout();
        break;
      case "forgot-password":
        response = await forgotPassword(body);
        break;
      case "reset-password":
        response = await resetPassword(body);
        break;
      case "verify-email":
        response = await verifyEmail(body);
        break;
      case "resend-verification":
        response = await resendVerification(body);
        break;
      default:
        return NextResponse.json(
          { success: false, message: `Route POST /api/auth/${action} not found` },
          { status: 404 }
        );
    }

    const status = response.success ? 200 : 400;
    return NextResponse.json(response, { status });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, message: error.message || "Internal server error" },
      { status: 500 }
    );
  }
}
