import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { z } from "zod";
import { getCurrentUser } from "@/core/auth/session";
import { prisma } from "@/core/database/prisma";
import { logger } from "@/core/logger/pino";
import { passwordSchema } from "@/core/validation/auth.schemas";

const ChangePasswordSchema = z
  .object({
    currentPassword: z.string().min(1, "Current password is required"),
    newPassword: passwordSchema,
    confirmPassword: z.string().min(1, "Please confirm your new password"),
  })
  .refine((d) => d.newPassword === d.confirmPassword, {
    message: "Passwords do not match",
    path: ["confirmPassword"],
  });

/**
 * POST /api/users/me/password
 *
 * Body: `{ currentPassword, newPassword, confirmPassword }`
 *
 * Changes the current user's password. Invalidates all other
 * `Session` rows for the user (forces re-login elsewhere).
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
    const parsed = ChangePasswordSchema.safeParse(body);
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

    const full = await prisma.user.findUnique({ where: { id: user.id } });
    if (!full || !full.passwordHash) {
      return NextResponse.json(
        {
          success: false,
          message:
            "Password cannot be changed for accounts that signed up with Google.",
        },
        { status: 400 }
      );
    }
    const ok = await bcrypt.compare(
      parsed.data.currentPassword,
      full.passwordHash
    );
    if (!ok) {
      return NextResponse.json(
        { success: false, message: "Current password is incorrect" },
        { status: 400 }
      );
    }

    const newHash = await bcrypt.hash(parsed.data.newPassword, 12);

    // Note on session invalidation: the access_token cookie is a
    // stateless JWT — it does NOT need a Session row to keep the
    // user logged in. The Session table is keyed to the refresh
    // token (see auth.service.ts login flow). Deleting all sessions
    // here is therefore safe and will NOT immediately log the user
    // out. We additionally revoke every refresh token so that any
    // other device holding an old refresh cookie must re-auth.
    await prisma.$transaction([
      prisma.user.update({
        where: { id: user.id },
        data: { passwordHash: newHash },
      }),
      prisma.session.deleteMany({
        where: { userId: user.id },
      }),
      prisma.refreshToken.deleteMany({
        where: { userId: user.id, revokedAt: null },
      }),
    ]);

    return NextResponse.json(
      { success: true, message: "Password updated" },
      { status: 200 }
    );
  } catch (error: any) {
    logger.error({ err: error }, "Password change failed");
    return NextResponse.json(
      { success: false, message: error.message || "Internal server error" },
      { status: 500 }
    );
  }
}
