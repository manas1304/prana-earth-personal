import crypto from "crypto";
import { prisma } from "@/core/database/prisma";
import { authRepository } from "./auth.repository";
import { emailService } from "./email.service";
import { oauthService } from "./oauth.service";
import { hashPassword, verifyPassword } from "@/core/security/password";
import {
  signAccessToken,
  signRefreshToken,
  verifyAccessToken,
  verifyRefreshToken,
} from "@/core/security/jwt";
import {
  setAuthCookies,
  clearAuthCookies,
  getRefreshToken,
} from "@/core/security/cookies";
import {
  RegisterSchema,
  LoginSchema,
  ForgotPasswordSchema,
  ResetPasswordSchema,
  UpdateProfileSchema,
  ChangePasswordSchema,
  GoogleLoginSchema,
} from "@/core/validation/auth.schemas";
import {
  BadRequestError,
  UnauthorizedError,
  ConflictError,
  NotFoundError,
} from "@/core/errors/api-error";
import { logger } from "@/core/logger/pino";
import { sanitizeUser } from "@/core/utils/user";

// Helper to hash token for database storage
function hashToken(token: string): string {
  return crypto.createHash("sha256").update(token).digest("hex");
}

export const authService = {
  async register(input: unknown) {
    const validated = RegisterSchema.parse(input);

    const existingUser = await authRepository.findUserByEmail(validated.email);
    if (existingUser) {
      logger.warn(
        { email: validated.email },
        "Registration failed: Email already exists",
      );
      throw new ConflictError("Email already registered");
    }

    const passwordHash = await hashPassword(validated.password);

    // Use Prisma transaction
    const result = await prisma.$transaction(async (tx: any) => {
      // 1. Create User — persist every optional column the
      //    RegisterSchema now accepts:
      //    - `phone`, `jobTitle`, `countryRegion` (DB columns)
      //    - `company`, `agreed` → `User.metadata` JSON (no dedicated
      //      columns). Move them to dedicated columns when the
      //      product surfaces them more broadly.
      const user = await tx.user.create({
        data: {
          email: validated.email,
          fullName: validated.fullName,
          passwordHash,
          phone: validated.phone ?? null,
          jobTitle: validated.jobTitle ?? null,
          countryRegion: validated.country ?? null,
          isEmailVerified: false,
          metadata: {
            company: validated.company ?? null,
            agreed: validated.agreed ?? false,
            agreedAt: validated.agreed ? new Date().toISOString() : null,
          },
        },
      });

      // 2. Create Verification Token
      const token = crypto.randomBytes(32).toString("hex");
      const tokenHashStr = hashToken(token);
      const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours

      await tx.emailVerificationToken.create({
        data: {
          email: validated.email,
          tokenHash: tokenHashStr,
          expiresAt,
        },
      });

      return { user, token };
    });

    // 3. Send Email
    try {
      await emailService.sendVerificationEmail(validated.email, result.token);
    } catch (err) {
      logger.error(
        { err, email: validated.email },
        "Verification email sending failed during registration",
      );
    }

    logger.info({ userId: result.user.id }, "User registered successfully");
    return sanitizeUser(result.user);
  },

  async login(
    input: unknown,
    clientInfo?: { ipAddress?: string; userAgent?: string },
  ) {
    const validated = LoginSchema.parse(input);

    const user = await authRepository.findUserByEmail(validated.email);

    if (!user || user.deletedAt) {
      logger.warn(
        { email: validated.email },
        "Login failed: Account not found",
      );
      throw new NotFoundError("Account not found");
    }

    if (!user.passwordHash) {
      logger.warn(
        { email: validated.email },
        "Login failed: Invalid credentials",
      );
      throw new UnauthorizedError("Invalid email or password");
    }

    if (!user.isActive) {
      logger.warn(
        { email: validated.email },
        "Login failed: Account deactivated",
      );
      throw new UnauthorizedError("Account is deactivated");
    }

    const isMatch = await verifyPassword(validated.password, user.passwordHash);
    if (!isMatch) {
      logger.warn({ email: validated.email }, "Login failed: Invalid password");
      throw new UnauthorizedError("Invalid email or password");
    }

    // Generate tokens
    const payload = { userId: user.id, email: user.email, role: user.role };
    const accessToken = signAccessToken(payload);
    const refreshToken = signRefreshToken(payload);
    const refreshTokenHash = hashToken(refreshToken);

    // Save Refresh Token & Create Session
    const expiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000); // 30 days
    await prisma.$transaction(async (tx: any) => {
      await tx.refreshToken.create({
        data: {
          userId: user.id,
          tokenHash: refreshTokenHash,
          expiresAt,
          ipAddress: clientInfo?.ipAddress,
          userAgent: clientInfo?.userAgent,
        },
      });

      // Update last login
      await tx.user.update({
        where: { id: user.id },
        data: { lastLoginAt: new Date() },
      });
    });

    // Set Cookies
    await setAuthCookies(accessToken, refreshToken);

    logger.info({ userId: user.id }, "User logged in successfully");
    return {
      user: sanitizeUser(user),
      accessToken,
      refreshToken,
    };
  },

  async loginWithGoogle(
    input: unknown,
    clientInfo?: { ipAddress?: string; userAgent?: string },
  ) {
    const validated = GoogleLoginSchema.parse(input);
    const googleUser = await oauthService.verifyGoogleToken(validated.idToken);

    // Use transaction for Google Account linking / User Creation
    const user = await prisma.$transaction(async (tx: any) => {
      // 1. Find user by email
      let userRecord = await tx.user.findUnique({
        where: { email: googleUser.email },
      });

      if (userRecord) {
        if (userRecord.deletedAt) {
          logger.warn(
            { email: googleUser.email },
            "Google login failed: Account not found",
          );
          throw new NotFoundError("Account not found");
        }

        // Link Google provider if not linked yet
        const existingOauth = await tx.oAuthAccount.findFirst({
          where: {
            userId: userRecord.id,
            provider: "google",
          },
        });

        if (!existingOauth) {
          await tx.oAuthAccount.create({
            data: {
              userId: userRecord.id,
              provider: "google",
              providerUserId: googleUser.providerUserId,
            },
          });
          logger.info(
            { userId: userRecord.id },
            "Linked existing email to Google account",
          );
        }
      } else {
        // Create user & Link Google
        userRecord = await tx.user.create({
          data: {
            email: googleUser.email,
            fullName: googleUser.name,
            isEmailVerified: true, // Google verifies emails
            avatarUrl: googleUser.avatarUrl,
            oauthAccounts: {
              create: {
                provider: "google",
                providerUserId: googleUser.providerUserId,
              },
            },
          },
        });
        logger.info(
          { userId: userRecord.id },
          "Created new user via Google signup",
        );
      }

      return userRecord;
    });

    if (!user.isActive) {
      throw new UnauthorizedError("Account is deactivated");
    }

    // Generate tokens
    const payload = { userId: user.id, email: user.email, role: user.role };
    const accessToken = signAccessToken(payload);
    const refreshToken = signRefreshToken(payload);
    const refreshTokenHash = hashToken(refreshToken);

    const expiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000); // 30 days
    await prisma.$transaction(async (tx: any) => {
      await tx.refreshToken.create({
        data: {
          userId: user.id,
          tokenHash: refreshTokenHash,
          expiresAt,
          ipAddress: clientInfo?.ipAddress,
          userAgent: clientInfo?.userAgent,
        },
      });

      await tx.user.update({
        where: { id: user.id },
        data: { lastLoginAt: new Date() },
      });
    });

    await setAuthCookies(accessToken, refreshToken);
    return {
      user: sanitizeUser(user),
      accessToken,
      refreshToken,
    };
  },

  async refreshSession(clientInfo?: {
    ipAddress?: string;
    userAgent?: string;
  }) {
    const rawRefreshToken = await getRefreshToken();
    if (!rawRefreshToken) {
      throw new UnauthorizedError("Refresh token missing");
    }

    const payload = verifyRefreshToken(rawRefreshToken);
    const oldTokenHash = hashToken(rawRefreshToken);

    const dbToken = await authRepository.findRefreshToken(oldTokenHash);
    if (!dbToken || dbToken.revokedAt || dbToken.expiresAt < new Date()) {
      logger.warn(
        { oldTokenHash },
        "Revoking credentials due to invalid or reused refresh token",
      );
      // Security measure: Revoke all tokens for this user if we detect token reuse
      if (dbToken) {
        await authRepository.revokeAllRefreshTokensForUser(dbToken.userId);
      }
      await clearAuthCookies();
      throw new UnauthorizedError("Invalid or expired session");
    }

    // Rotation transaction
    const tokens = await prisma.$transaction(async (tx: any) => {
      // 1. Revoke old token
      await tx.refreshToken.update({
        where: { id: dbToken.id },
        data: { revokedAt: new Date() },
      });

      // 2. Generate new tokens
      const newPayload = {
        userId: payload.userId,
        email: payload.email,
        role: payload.role,
      };
      const newAccessToken = signAccessToken(newPayload);
      const newRefreshToken = signRefreshToken(newPayload);
      const newRefreshTokenHash = hashToken(newRefreshToken);

      // 3. Save new refresh token
      await tx.refreshToken.create({
        data: {
          userId: payload.userId,
          tokenHash: newRefreshTokenHash,
          expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
          ipAddress: clientInfo?.ipAddress,
          userAgent: clientInfo?.userAgent,
        },
      });

      return { newAccessToken, newRefreshToken };
    });

    await setAuthCookies(tokens.newAccessToken, tokens.newRefreshToken);
    logger.info(
      { userId: payload.userId },
      "Session refreshed and tokens rotated",
    );
    return { success: true };
  },

  async logout() {
    const rawRefreshToken = await getRefreshToken();
    if (rawRefreshToken) {
      const tokenHashVal = hashToken(rawRefreshToken);
      const dbToken = await authRepository.findRefreshToken(tokenHashVal);
      if (dbToken) {
        await authRepository.revokeRefreshToken(dbToken.id);
      }
    }

    await clearAuthCookies();
    logger.info("User logged out successfully");
    return { success: true };
  },

  async forgotPassword(input: unknown) {
    const validated = ForgotPasswordSchema.parse(input);
    const user = await authRepository.findUserByEmail(validated.email);

    // Prevent user enumeration by always returning success
    if (!user || !user.passwordHash) {
      logger.info(
        { email: validated.email },
        "Forgot password: user not found or OAuth only user",
      );
      return { success: true };
    }

    const resetToken = crypto.randomBytes(32).toString("hex");
    const resetTokenHash = hashToken(resetToken);
    const expiresAt = new Date(Date.now() + 15 * 60 * 1000); // 15 minutes

    await prisma.$transaction(async (tx: any) => {
      // Invalidate any older pending password reset tokens
      await tx.passwordResetToken.updateMany({
        where: { userId: user.id, usedAt: null },
        data: { expiresAt: new Date() }, // Expire them now
      });

      await tx.passwordResetToken.create({
        data: {
          userId: user.id,
          tokenHash: resetTokenHash,
          expiresAt,
        },
      });
    });

    try {
      await emailService.sendPasswordResetEmail(user.email, resetToken);
    } catch (err) {
      logger.error(
        { err, email: user.email },
        "Failed to send password reset email",
      );
    }

    return { success: true };
  },

  async resetPassword(input: unknown) {
    const validated = ResetPasswordSchema.parse(input);
    const hashedResetToken = hashToken(validated.token);

    const dbToken =
      await authRepository.findPasswordResetToken(hashedResetToken);
    if (
      !dbToken ||
      dbToken.usedAt ||
      (dbToken.expiresAt && dbToken.expiresAt < new Date())
    ) {
      throw new BadRequestError("Invalid or expired reset token");
    }

    const newPasswordHash = await hashPassword(validated.password);

    await prisma.$transaction(async (tx: any) => {
      // 1. Mark token as used
      await tx.passwordResetToken.update({
        where: { id: dbToken.id },
        data: { usedAt: new Date() },
      });

      // 2. Update user password
      await tx.user.update({
        where: { id: dbToken.userId },
        data: { passwordHash: newPasswordHash },
      });

      // 3. Revoke all active sessions/refresh tokens to force re-login on all devices
      await tx.refreshToken.updateMany({
        where: { userId: dbToken.userId, revokedAt: null },
        data: { revokedAt: new Date() },
      });
    });

    logger.info({ userId: dbToken.userId }, "Password reset successful");
    return { success: true };
  },

  async verifyEmail(token: string) {
    if (!token) {
      throw new BadRequestError("Verification token is required");
    }

    const hashedVerifyToken = hashToken(token);
    const dbToken =
      await authRepository.findEmailVerificationToken(hashedVerifyToken);

    if (!dbToken || dbToken.expiresAt < new Date()) {
      throw new BadRequestError("Invalid or expired verification token");
    }

    await prisma.$transaction(async (tx: any) => {
      // 1. Mark email as verified
      await tx.user.update({
        where: { email: dbToken.email },
        data: { isEmailVerified: true },
      });

      // 2. Delete verification token
      await tx.emailVerificationToken.delete({
        where: { id: dbToken.id },
      });
    });

    logger.info({ email: dbToken.email }, "Email verified successfully");
    return { success: true };
  },

  async resendVerificationEmail(email: string) {
    if (!email) {
      throw new BadRequestError("Email is required");
    }

    const user = await authRepository.findUserByEmail(email);
    if (!user) {
      // Prevent user enumeration
      return { success: true };
    }

    if (user.isEmailVerified) {
      throw new BadRequestError("Email is already verified");
    }

    const token = crypto.randomBytes(32).toString("hex");
    const tokenHashStr = hashToken(token);
    const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours

    await prisma.$transaction(async (tx: any) => {
      // Invalidate old verification tokens
      await tx.emailVerificationToken.deleteMany({
        where: { email },
      });

      await tx.emailVerificationToken.create({
        data: {
          email,
          tokenHash: tokenHashStr,
          expiresAt,
        },
      });
    });

    try {
      await emailService.sendVerificationEmail(email, token);
    } catch (err) {
      logger.error({ err, email }, "Failed to resend verification email");
    }

    return { success: true };
  },

  async getCurrentUser(accessTokenStr?: string) {
    if (!accessTokenStr) {
      throw new UnauthorizedError("Not authenticated");
    }

    const payload = verifyAccessToken(accessTokenStr);
    const user = await authRepository.findUserById(payload.userId);

    if (!user || !user.isActive) {
      throw new UnauthorizedError("User session is inactive or invalid");
    }

    return sanitizeUser(user);
  },

  async updateProfile(userId: string, input: unknown) {
    const validated = UpdateProfileSchema.parse(input);

    const user = await authRepository.findUserById(userId);
    if (!user) {
      throw new NotFoundError("User not found");
    }

    const updated = await authRepository.updateUser(userId, validated);
    logger.info({ userId }, "User profile updated");
    return sanitizeUser(updated);
  },

  async changePassword(userId: string, input: unknown) {
    const validated = ChangePasswordSchema.parse(input);

    const user = await authRepository.findUserById(userId);
    if (!user || !user.passwordHash) {
      throw new BadRequestError(
        "Password login is not set up for this account",
      );
    }

    const isMatch = await verifyPassword(
      validated.currentPassword,
      user.passwordHash,
    );
    if (!isMatch) {
      throw new UnauthorizedError("Incorrect current password");
    }

    const newPasswordHash = await hashPassword(validated.newPassword);
    await authRepository.updateUser(userId, { passwordHash: newPasswordHash });

    logger.info({ userId }, "User password changed successfully");
    return { success: true };
  },

  async deleteSession(tokenHashVal: string) {
    await authRepository.deleteSession(tokenHashVal);
    logger.info({ tokenHashVal }, "Session deleted");
    return { success: true };
  },

  async deleteAllSessions(userId: string) {
    await authRepository.deleteAllSessionsForUser(userId);
    await authRepository.revokeAllRefreshTokensForUser(userId);
    logger.info({ userId }, "All sessions and refresh tokens deleted for user");
    return { success: true };
  },

  async signIn(email: string, password: string) {
    return this.login({ email, password });
  },
};
