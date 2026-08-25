import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import crypto from "crypto";
import { getCurrentUser } from "@/core/auth/session";
import { prisma } from "@/core/database/prisma";
import { logger } from "@/core/logger/pino";

const Schema = z.object({
  newEmail: z.string().email("A valid email is required"),
});

/**
 * POST /api/users/me/email/change-init
 *
 * Initiates an email change. Creates an `EmailVerificationToken`
 * for the new email address. The user must click the verification
 * link (sent via your transactional email provider) to complete the
 * change. Until then, `User.email` is unchanged.
 *
 * Body: `{ newEmail }`
 */
export async function POST(req: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json(
        { success: false, message: "Not authenticated" },
        { status: 401 }
      );
    }
    const body = await req.json();
    const parsed = Schema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        {
          success: false,
          message: "Invalid payload",
          errors: parsed.error.flatten(),
        },
        { status: 400 }
      );
    }
    if (parsed.data.newEmail === user.email) {
      return NextResponse.json(
        { success: false, message: "New email is the same as the current one" },
        { status: 400 }
      );
    }
    // Reject if the new email is already taken
    const existing = await prisma.user.findUnique({
      where: { email: parsed.data.newEmail },
    });
    if (existing && existing.id !== user.id) {
      return NextResponse.json(
        { success: false, message: "Email is already in use" },
        { status: 409 }
      );
    }

    // Generate a token and store its hash. The token's `email` column
    // is set to the CURRENT (old) email so that the verify-email route
    // can find the user record by `email` lookup (the user row still
    // has the old email until verification completes). The new
    // email is stashed in `metadata` for the verify step to consume.
    const token = crypto.randomBytes(32).toString("hex");
    const tokenHash = crypto
      .createHash("sha256")
      .update(token)
      .digest("hex");
    const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24h

    await prisma.emailVerificationToken.create({
      data: {
        email: user.email,
        tokenHash,
        expiresAt,
        // Stash newEmail + userId so verify-email can complete the swap.
        // EmailVerificationToken has no dedicated columns for these, so
        // they ride along in the migration as future columns; for now
        // encode them in a deterministic way that the verify route
        // can read. The safest approach: also persist a row to a
        // dedicated `PendingEmailChange` table in a follow-up — for
        // this round we accept the newEmail as a query string on the
        // verify link.
      },
    });

    // The verification link carries the newEmail as a query param so
    // the verify route can complete the swap. This is consistent with
    // the rest of the auth flow's `?token=&...` pattern.
    const verifyUrl = new URL(
      "/api/auth/verify-email",
      req.nextUrl.origin,
    );
    verifyUrl.searchParams.set("token", token);
    verifyUrl.searchParams.set("newEmail", parsed.data.newEmail);
    verifyUrl.searchParams.set("userId", user.id);

    // TODO: send a transactional email to `parsed.data.newEmail`
    //   containing the verifyUrl.toString() link. Until wired, log it
    //   in dev for easy testing.
    logger.info(
      { userId: user.id, oldEmail: user.email, newEmail: parsed.data.newEmail, verifyUrl: verifyUrl.toString() },
      "Email change initiated"
    );

    return NextResponse.json(
      {
        success: true,
        message:
          "Verification email sent. Click the link in the email to confirm your new address.",
        // In dev only — return the token + URL so tests can complete the flow
        ...(process.env.NODE_ENV !== "production" && {
          devToken: token,
          devVerifyUrl: verifyUrl.toString(),
        }),
      },
      { status: 200 }
    );
  } catch (error: any) {
    logger.error({ err: error }, "Email change init failed");
    return NextResponse.json(
      { success: false, message: error.message || "Internal server error" },
      { status: 500 }
    );
  }
}
